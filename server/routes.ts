import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { openai } from "./openai";
import { searchUSDAFoods, getFoodByFdcId } from "./usda";
import { 
  insertFoodItemSchema, 
  insertChatMessageSchema,
  insertRecipeSchema,
  insertApplianceSchema,
  insertMealPlanSchema
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Storage Locations
  app.get("/api/storage-locations", async (_req, res) => {
    try {
      const locations = await storage.getStorageLocations();
      res.json(locations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch storage locations" });
    }
  });

  // Food Items
  app.get("/api/food-items", async (req, res) => {
    try {
      const { storageLocationId } = req.query;
      const items = await storage.getFoodItems(storageLocationId as string | undefined);
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch food items" });
    }
  });

  app.post("/api/food-items", async (req, res) => {
    try {
      const validated = insertFoodItemSchema.parse(req.body);
      const item = await storage.createFoodItem(validated);
      res.json(item);
    } catch (error) {
      res.status(400).json({ error: "Invalid food item data" });
    }
  });

  app.put("/api/food-items/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const item = await storage.updateFoodItem(id, req.body);
      res.json(item);
    } catch (error) {
      res.status(400).json({ error: "Failed to update food item" });
    }
  });

  app.delete("/api/food-items/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteFoodItem(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete food item" });
    }
  });

  // Appliances
  app.get("/api/appliances", async (_req, res) => {
    try {
      const appliances = await storage.getAppliances();
      res.json(appliances);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch appliances" });
    }
  });

  app.post("/api/appliances", async (req, res) => {
    try {
      const validated = insertApplianceSchema.parse(req.body);
      const appliance = await storage.createAppliance(validated);
      res.json(appliance);
    } catch (error) {
      res.status(400).json({ error: "Invalid appliance data" });
    }
  });

  app.delete("/api/appliances/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteAppliance(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete appliance" });
    }
  });

  // USDA Food Search
  app.get("/api/usda/search", async (req, res) => {
    try {
      const { query } = req.query;
      if (!query || typeof query !== "string") {
        return res.status(400).json({ error: "Query parameter is required" });
      }
      const results = await searchUSDAFoods(query);
      res.json(results);
    } catch (error) {
      res.status(500).json({ error: "Failed to search USDA database" });
    }
  });

  app.get("/api/usda/food/:fdcId", async (req, res) => {
    try {
      const { fdcId } = req.params;
      const food = await getFoodByFdcId(Number(fdcId));
      if (!food) {
        return res.status(404).json({ error: "Food not found" });
      }
      res.json(food);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch food details" });
    }
  });

  // Chat Messages
  app.get("/api/chat/messages", async (_req, res) => {
    try {
      const messages = await storage.getChatMessages();
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch chat messages" });
    }
  });

  app.post("/api/chat", async (req, res) => {
    try {
      const { message } = req.body;
      
      if (!message || typeof message !== "string") {
        return res.status(400).json({ error: "Message is required" });
      }

      // Save user message
      await storage.createChatMessage({
        role: "user",
        content: message,
        metadata: null,
      });

      // Get current inventory and appliances for context
      const foodItems = await storage.getFoodItems();
      const appliances = await storage.getAppliances();
      const storageLocations = await storage.getStorageLocations();

      const inventoryContext = foodItems.map(item => {
        const location = storageLocations.find(loc => loc.id === item.storageLocationId);
        return `${item.name} (${item.quantity} ${item.unit || ''}) in ${location?.name || 'unknown'}`;
      }).join(', ');

      const appliancesContext = appliances.map(a => a.name).join(', ');

      const systemPrompt = `You are an AI Chef assistant. You help users manage their food inventory and suggest recipes.

Current inventory: ${inventoryContext || 'No items in inventory'}
Available appliances: ${appliancesContext || 'No appliances registered'}

Your tasks:
1. Answer cooking and recipe questions
2. Help users add, update, or remove food items from their inventory
3. Suggest recipes based on available ingredients
4. Provide cooking tips and guidance

When the user asks to add items, respond with the details and suggest saving them to inventory.
When asked for recipes, consider the available inventory and appliances.`;

      // Stream response from OpenAI
      const stream = await openai.chat.completions.create({
        model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
        stream: true,
        max_completion_tokens: 8192,
      });

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      let fullResponse = '';

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullResponse += content;
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      // Save AI response
      await storage.createChatMessage({
        role: "assistant",
        content: fullResponse,
        metadata: null,
      });

      res.write('data: [DONE]\n\n');
      res.end();
    } catch (error) {
      console.error("Chat error:", error);
      res.status(500).json({ error: "Failed to process chat message" });
    }
  });

  // Recipe Generation
  app.post("/api/recipes/generate", async (req, res) => {
    try {
      const foodItems = await storage.getFoodItems();
      const appliances = await storage.getAppliances();

      if (foodItems.length === 0) {
        return res.status(400).json({ error: "No ingredients in inventory" });
      }

      const ingredientsList = foodItems.map(item => 
        `${item.name} (${item.quantity} ${item.unit || ''})`
      ).join(', ');

      const appliancesList = appliances.map(a => a.name).join(', ');

      const prompt = `Generate a detailed recipe using these available ingredients: ${ingredientsList}.
Available cooking appliances: ${appliancesList}.

Respond ONLY with a valid JSON object in this exact format:
{
  "title": "Recipe name",
  "prepTime": "X minutes",
  "cookTime": "X minutes", 
  "servings": number,
  "ingredients": ["ingredient 1 with quantity", "ingredient 2 with quantity"],
  "instructions": ["step 1", "step 2"],
  "usedIngredients": ["ingredient from inventory"],
  "missingIngredients": ["ingredient not in inventory"]
}`;

      const completion = await openai.chat.completions.create({
        model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_completion_tokens: 8192,
      });

      const recipeData = JSON.parse(completion.choices[0].message.content || "{}");
      
      const recipe = await storage.createRecipe({
        title: recipeData.title,
        prepTime: recipeData.prepTime,
        cookTime: recipeData.cookTime,
        servings: recipeData.servings,
        ingredients: recipeData.ingredients,
        instructions: recipeData.instructions,
        usedIngredients: recipeData.usedIngredients,
        missingIngredients: recipeData.missingIngredients || [],
      });

      res.json(recipe);
    } catch (error) {
      console.error("Recipe generation error:", error);
      res.status(500).json({ error: "Failed to generate recipe" });
    }
  });

  app.get("/api/recipes", async (_req, res) => {
    try {
      const recipes = await storage.getRecipes();
      res.json(recipes);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch recipes" });
    }
  });

  // Update recipe (favorite, rating)
  app.patch("/api/recipes/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const recipe = await storage.updateRecipe(id, req.body);
      res.json(recipe);
    } catch (error) {
      res.status(400).json({ error: "Failed to update recipe" });
    }
  });

  // Expiration Notifications
  app.get("/api/notifications/expiration", async (_req, res) => {
    try {
      const notifications = await storage.getExpirationNotifications();
      
      // Recalculate daysUntilExpiry dynamically and filter out expired/invalid items
      const now = new Date();
      const validNotifications = notifications
        .map(notification => {
          const expiry = new Date(notification.expirationDate);
          const daysUntil = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          return { ...notification, daysUntilExpiry: daysUntil };
        })
        .filter(notification => notification.daysUntilExpiry >= 0); // Remove expired items
      
      res.json(validNotifications);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  app.post("/api/notifications/expiration/check", async (_req, res) => {
    try {
      // Check for items expiring in the next 3 days
      const expiringItems = await storage.getExpiringItems(3);
      const now = new Date();
      
      // Get existing notifications
      const existingNotifications = await storage.getExpirationNotifications();
      
      // Clean up notifications for items that no longer exist or are expired
      const existingItemIds = new Set(expiringItems.map(item => item.id));
      for (const notification of existingNotifications) {
        const expiry = new Date(notification.expirationDate);
        const isExpired = expiry.getTime() < now.getTime();
        const itemNoLongerExists = !existingItemIds.has(notification.foodItemId);
        
        if (isExpired || itemNoLongerExists) {
          await storage.dismissNotification(notification.id);
        }
      }
      
      // Create notifications for new expiring items
      const existingNotificationItemIds = new Set(existingNotifications.map(n => n.foodItemId));
      
      for (const item of expiringItems) {
        if (!existingNotificationItemIds.has(item.id) && item.expirationDate) {
          const expiry = new Date(item.expirationDate);
          const daysUntil = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysUntil >= 0) { // Only create if not already expired
            await storage.createExpirationNotification({
              foodItemId: item.id,
              foodItemName: item.name,
              expirationDate: item.expirationDate,
              daysUntilExpiry: daysUntil,
              dismissed: false,
            });
          }
        }
      }
      
      // Get updated notifications with dynamic day calculation
      const notifications = await storage.getExpirationNotifications();
      const validNotifications = notifications
        .map(notification => {
          const expiry = new Date(notification.expirationDate);
          const daysUntil = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          return { ...notification, daysUntilExpiry: daysUntil };
        })
        .filter(notification => notification.daysUntilExpiry >= 0);
      
      res.json({ notifications: validNotifications, count: validNotifications.length });
    } catch (error) {
      console.error("Notification check error:", error);
      res.status(500).json({ error: "Failed to check for expiring items" });
    }
  });

  app.post("/api/notifications/:id/dismiss", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.dismissNotification(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to dismiss notification" });
    }
  });

  // Nutrition Statistics
  app.get("/api/nutrition/stats", async (_req, res) => {
    try {
      const foodItems = await storage.getFoodItems();
      
      let totalCalories = 0;
      let totalProtein = 0;
      let totalCarbs = 0;
      let totalFat = 0;
      let itemsWithNutrition = 0;
      
      const categoryBreakdown: Record<string, { calories: number; count: number }> = {};
      
      foodItems.forEach(item => {
        if (item.nutrition) {
          try {
            const nutrition = JSON.parse(item.nutrition);
            const qty = parseFloat(item.quantity) || 1;
            const multiplier = qty / 100; // Nutrition is per 100g/ml
            
            totalCalories += nutrition.calories * multiplier;
            totalProtein += nutrition.protein * multiplier;
            totalCarbs += nutrition.carbs * multiplier;
            totalFat += nutrition.fat * multiplier;
            itemsWithNutrition++;
            
            // Track by storage location for breakdown
            const locationId = item.storageLocationId;
            if (!categoryBreakdown[locationId]) {
              categoryBreakdown[locationId] = { calories: 0, count: 0 };
            }
            categoryBreakdown[locationId].calories += nutrition.calories * multiplier;
            categoryBreakdown[locationId].count++;
          } catch (e) {
            // Skip items with invalid nutrition data
          }
        }
      });
      
      res.json({
        totalCalories: Math.round(totalCalories),
        totalProtein: Math.round(totalProtein * 10) / 10,
        totalCarbs: Math.round(totalCarbs * 10) / 10,
        totalFat: Math.round(totalFat * 10) / 10,
        itemsWithNutrition,
        totalItems: foodItems.length,
        categoryBreakdown,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch nutrition stats" });
    }
  });

  app.get("/api/nutrition/items", async (_req, res) => {
    try {
      const foodItems = await storage.getFoodItems();
      const locations = await storage.getStorageLocations();
      
      const itemsWithNutrition = foodItems
        .filter(item => item.nutrition)
        .map(item => {
          const location = locations.find(loc => loc.id === item.storageLocationId);
          let nutrition = null;
          try {
            nutrition = JSON.parse(item.nutrition!);
          } catch (e) {
            // Skip invalid nutrition
          }
          return {
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            locationName: location?.name || "Unknown",
            nutrition,
          };
        })
        .filter(item => item.nutrition !== null);
      
      res.json(itemsWithNutrition);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch nutrition items" });
    }
  });

  // Waste reduction suggestions
  app.get("/api/suggestions/waste-reduction", async (_req, res) => {
    try {
      const expiringItems = await storage.getExpiringItems(5);
      
      if (expiringItems.length === 0) {
        return res.json({ suggestions: [] });
      }

      const ingredientsList = expiringItems.map(item => 
        `${item.name} (${item.quantity} ${item.unit || ''}, expires in ${
          Math.ceil((new Date(item.expirationDate!).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        } days)`
      ).join(', ');

      const appliances = await storage.getAppliances();
      const appliancesList = appliances.map(a => a.name).join(', ');

      const prompt = `Generate waste reduction suggestions for these food items that are expiring soon: ${ingredientsList}.
Available appliances: ${appliancesList}.

Provide 2-3 practical suggestions to use these ingredients before they expire. Be concise and actionable.

Respond ONLY with a valid JSON object:
{
  "suggestions": ["suggestion 1", "suggestion 2", "suggestion 3"]
}`;

      const completion = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_completion_tokens: 8192,
      });

      const data = JSON.parse(completion.choices[0].message.content || '{"suggestions":[]}');
      res.json(data);
    } catch (error) {
      console.error("Waste reduction error:", error);
      res.status(500).json({ error: "Failed to generate suggestions" });
    }
  });

  // Meal Plans
  app.get("/api/meal-plans", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const plans = await storage.getMealPlans(
        startDate as string | undefined,
        endDate as string | undefined
      );
      res.json(plans);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch meal plans" });
    }
  });

  app.post("/api/meal-plans", async (req, res) => {
    try {
      const validated = insertMealPlanSchema.parse(req.body);
      const plan = await storage.createMealPlan(validated);
      res.json(plan);
    } catch (error) {
      res.status(400).json({ error: "Invalid meal plan data" });
    }
  });

  app.put("/api/meal-plans/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const validated = insertMealPlanSchema.partial().parse(req.body);
      const plan = await storage.updateMealPlan(id, validated);
      res.json(plan);
    } catch (error) {
      if (error instanceof Error && error.message === "Meal plan not found") {
        return res.status(404).json({ error: "Meal plan not found" });
      }
      res.status(400).json({ error: "Failed to update meal plan" });
    }
  });

  app.delete("/api/meal-plans/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteMealPlan(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete meal plan" });
    }
  });

  // Shopping List Generator
  app.get("/api/meal-plans/shopping-list", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ error: "startDate and endDate are required" });
      }
      
      // Get meal plans for the date range
      const mealPlans = await storage.getMealPlans(startDate as string, endDate as string);
      
      if (mealPlans.length === 0) {
        return res.json({
          items: [],
          totalItems: 0,
          plannedMeals: 0,
          dateRange: { startDate, endDate },
          message: "No meals planned for this period"
        });
      }
      
      // Get all unique recipe IDs
      const recipeIds = Array.from(new Set(mealPlans.map(plan => plan.recipeId)));
      
      // Get all recipes
      const recipes = await Promise.all(
        recipeIds.map(id => storage.getRecipe(id))
      );
      
      // Calculate ingredient requirements with quantities
      const ingredientMap = new Map<string, { ingredient: string; count: number; recipes: string[] }>();
      
      mealPlans.forEach(plan => {
        const recipe = recipes.find(r => r?.id === plan.recipeId);
        if (!recipe) return;
        
        recipe.ingredients.forEach(ingredient => {
          const key = ingredient.toLowerCase().trim();
          const existing = ingredientMap.get(key);
          
          if (existing) {
            existing.count += plan.servings;
            if (!existing.recipes.includes(recipe.title)) {
              existing.recipes.push(recipe.title);
            }
          } else {
            ingredientMap.set(key, {
              ingredient,
              count: plan.servings,
              recipes: [recipe.title]
            });
          }
        });
      });
      
      // Get current inventory
      const inventory = await storage.getFoodItems();
      const inventoryNames = new Set(
        inventory.map(item => item.name.toLowerCase().trim())
      );
      
      // Filter items not in inventory
      const shoppingList = Array.from(ingredientMap.values())
        .filter(item => {
          // Check if any inventory item name contains the ingredient or vice versa
          const ingredientLower = item.ingredient.toLowerCase();
          return !Array.from(inventoryNames).some(invName => 
            invName.includes(ingredientLower) || ingredientLower.includes(invName)
          );
        })
        .map(item => ({
          ingredient: item.ingredient,
          neededFor: item.recipes.join(", "),
          servings: item.count
        }));
      
      res.json({
        items: shoppingList,
        totalItems: shoppingList.length,
        plannedMeals: mealPlans.length,
        dateRange: { startDate, endDate }
      });
    } catch (error) {
      console.error("Shopping list error:", error);
      res.status(500).json({ error: "Failed to generate shopping list" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
