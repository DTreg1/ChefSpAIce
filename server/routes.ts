// Referenced from blueprint:javascript_log_in_with_replit - Added authentication and user-scoped routes
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { openai } from "./openai";
import { searchUSDAFoods, getFoodByFdcId } from "./usda";
import { searchOpenFoodFacts, getOpenFoodFactsProduct, extractImageUrl } from "./openfoodfacts";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { 
  insertFoodItemSchema, 
  insertChatMessageSchema,
  insertRecipeSchema,
  insertApplianceSchema,
  insertMealPlanSchema,
  insertUserPreferencesSchema
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware (from blueprint:javascript_log_in_with_replit)
  await setupAuth(app);

  // Auth routes (from blueprint:javascript_log_in_with_replit)
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // User Preferences
  app.get('/api/user/preferences', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const preferences = await storage.getUserPreferences(userId);
      res.json(preferences);
    } catch (error) {
      console.error("Error fetching preferences:", error);
      res.status(500).json({ message: "Failed to fetch preferences" });
    }
  });

  app.put('/api/user/preferences', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validated = insertUserPreferencesSchema.parse({ ...req.body, userId });
      const preferences = await storage.upsertUserPreferences(validated);
      res.json(preferences);
    } catch (error) {
      console.error("Error updating preferences:", error);
      res.status(500).json({ message: "Failed to update preferences" });
    }
  });

  // Storage Locations (user-scoped)
  app.get("/api/storage-locations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const locations = await storage.getStorageLocations(userId);
      res.json(locations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch storage locations" });
    }
  });

  // Food Items (user-scoped)
  app.get("/api/food-items", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { storageLocationId } = req.query;
      const items = await storage.getFoodItems(userId, storageLocationId as string | undefined);
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch food items" });
    }
  });

  app.post("/api/food-items", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validated = insertFoodItemSchema.parse(req.body);
      const item = await storage.createFoodItem(userId, validated);
      res.json(item);
    } catch (error) {
      res.status(400).json({ error: "Invalid food item data" });
    }
  });

  app.put("/api/food-items/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const updateSchema = insertFoodItemSchema.partial().required({
        quantity: true,
        unit: true,
        storageLocationId: true,
        expirationDate: true,
      });
      const validated = updateSchema.parse(req.body);
      const item = await storage.updateFoodItem(userId, id, validated);
      res.json(item);
    } catch (error) {
      res.status(400).json({ error: "Failed to update food item" });
    }
  });

  app.delete("/api/food-items/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      await storage.deleteFoodItem(userId, id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete food item" });
    }
  });

  // Appliances (user-scoped)
  app.get("/api/appliances", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const appliances = await storage.getAppliances(userId);
      res.json(appliances);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch appliances" });
    }
  });

  app.post("/api/appliances", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validated = insertApplianceSchema.parse(req.body);
      const appliance = await storage.createAppliance(userId, validated);
      res.json(appliance);
    } catch (error) {
      res.status(400).json({ error: "Invalid appliance data" });
    }
  });

  app.delete("/api/appliances/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      await storage.deleteAppliance(userId, id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete appliance" });
    }
  });

  // USDA Food Search (public)
  app.get("/api/usda/search", async (req, res) => {
    try {
      const { query, pageSize, pageNumber, dataType } = req.query;
      if (!query || typeof query !== "string") {
        return res.status(400).json({ error: "Query parameter is required" });
      }

      const size = pageSize ? parseInt(pageSize as string) : 20;
      const page = pageNumber ? parseInt(pageNumber as string) : 1;
      const types = dataType ? (Array.isArray(dataType) ? dataType : [dataType]) as string[] : undefined;

      const results = await searchUSDAFoods(query, size, page, types);
      res.json(results);
    } catch (error) {
      console.error("USDA search error:", error);
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

  // Open Food Facts - Product Images (public)
  app.get("/api/openfoodfacts/search", async (req, res) => {
    try {
      const { query, pageSize } = req.query;
      if (!query || typeof query !== "string") {
        return res.status(400).json({ error: "Query parameter is required" });
      }

      const size = pageSize ? parseInt(pageSize as string) : 10;
      const results = await searchOpenFoodFacts(query, size);
      
      const products = results.products.map(product => ({
        code: product.code,
        name: product.product_name || 'Unknown Product',
        brand: product.brands || '',
        imageUrl: extractImageUrl(product),
        nutriscoreGrade: product.nutriscore_grade
      }));

      res.json({ products, count: results.count });
    } catch (error) {
      console.error("Open Food Facts search error:", error);
      res.status(500).json({ error: "Failed to search Open Food Facts" });
    }
  });

  app.get("/api/openfoodfacts/product/:barcode", async (req, res) => {
    try {
      const { barcode } = req.params;
      const product = await getOpenFoodFactsProduct(barcode);
      
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }

      res.json({
        code: product.code,
        name: product.product_name || 'Unknown Product',
        brand: product.brands || '',
        imageUrl: extractImageUrl(product),
        nutriscoreGrade: product.nutriscore_grade
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch product details" });
    }
  });

  // Object Storage - Image Uploads (referenced from blueprint:javascript_object_storage)
  app.get("/objects/:objectPath(*)", async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error serving object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  app.post("/api/objects/upload", isAuthenticated, async (_req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });

  app.put("/api/food-images", isAuthenticated, async (req, res) => {
    if (!req.body.imageURL) {
      return res.status(400).json({ error: "imageURL is required" });
    }

    try {
      const objectStorageService = new ObjectStorageService();
      const objectPath = objectStorageService.normalizeObjectEntityPath(req.body.imageURL);
      res.status(200).json({ objectPath });
    } catch (error) {
      console.error("Error setting food image:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Chat Messages (user-scoped)
  app.get("/api/chat/messages", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const messages = await storage.getChatMessages(userId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch chat messages" });
    }
  });

  app.post("/api/chat", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { message } = req.body;
      
      if (!message || typeof message !== "string") {
        return res.status(400).json({ error: "Message is required" });
      }

      // Save user message
      await storage.createChatMessage(userId, {
        role: "user",
        content: message,
        metadata: null,
      });

      // Get current inventory and appliances for context
      const foodItems = await storage.getFoodItems(userId);
      const appliances = await storage.getAppliances(userId);
      const storageLocations = await storage.getStorageLocations(userId);

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
        model: "gpt-5",
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

      try {
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            fullResponse += content;
            res.write(`data: ${JSON.stringify({ content })}\n\n`);
          }
        }

        // Save AI response
        await storage.createChatMessage(userId, {
          role: "assistant",
          content: fullResponse,
          metadata: null,
        });

        res.write('data: [DONE]\n\n');
        res.end();
      } catch (streamError) {
        console.error("Streaming error:", streamError);
        res.write(`data: ${JSON.stringify({ error: "Stream interrupted" })}\n\n`);
        res.end();
      }
    } catch (error) {
      console.error("Chat error:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to process chat message" });
      } else {
        res.end();
      }
    }
  });

  // Recipe Generation (user-scoped)
  app.post("/api/recipes/generate", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const foodItems = await storage.getFoodItems(userId);
      const appliances = await storage.getAppliances(userId);

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
        model: "gpt-5",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_completion_tokens: 8192,
      });

      const recipeData = JSON.parse(completion.choices[0].message.content || "{}");
      
      const recipe = await storage.createRecipe(userId, {
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

  app.get("/api/recipes", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const recipes = await storage.getRecipes(userId);
      res.json(recipes);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch recipes" });
    }
  });

  app.patch("/api/recipes/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const recipe = await storage.updateRecipe(userId, id, req.body);
      res.json(recipe);
    } catch (error) {
      res.status(400).json({ error: "Failed to update recipe" });
    }
  });

  // Expiration Notifications (user-scoped)
  app.get("/api/notifications/expiration", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const notifications = await storage.getExpirationNotifications(userId);
      
      const now = new Date();
      const validNotifications = notifications
        .map(notification => {
          const expiry = new Date(notification.expirationDate);
          const daysUntil = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          return { ...notification, daysUntilExpiry: daysUntil };
        })
        .filter(notification => notification.daysUntilExpiry >= 0);
      
      res.json(validNotifications);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  app.post("/api/notifications/expiration/check", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const expiringItems = await storage.getExpiringItems(userId, 3);
      const now = new Date();
      
      const existingNotifications = await storage.getExpirationNotifications(userId);
      
      const existingItemIds = new Set(expiringItems.map(item => item.id));
      for (const notification of existingNotifications) {
        const expiry = new Date(notification.expirationDate);
        const isExpired = expiry.getTime() < now.getTime();
        const itemNoLongerExists = !existingItemIds.has(notification.foodItemId);
        
        if (isExpired || itemNoLongerExists) {
          await storage.dismissNotification(userId, notification.id);
        }
      }
      
      const existingNotificationItemIds = new Set(existingNotifications.map(n => n.foodItemId));
      
      for (const item of expiringItems) {
        if (!existingNotificationItemIds.has(item.id) && item.expirationDate) {
          const expiry = new Date(item.expirationDate);
          const daysUntil = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysUntil >= 0) {
            await storage.createExpirationNotification(userId, {
              foodItemId: item.id,
              foodItemName: item.name,
              expirationDate: item.expirationDate,
              daysUntilExpiry: daysUntil,
              dismissed: false,
            });
          }
        }
      }
      
      const notifications = await storage.getExpirationNotifications(userId);
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

  app.post("/api/notifications/:id/dismiss", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      await storage.dismissNotification(userId, id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to dismiss notification" });
    }
  });

  // Nutrition Statistics (user-scoped)
  app.get("/api/nutrition/stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const foodItems = await storage.getFoodItems(userId);
      
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
            const multiplier = qty / 100;
            
            totalCalories += nutrition.calories * multiplier;
            totalProtein += nutrition.protein * multiplier;
            totalCarbs += nutrition.carbs * multiplier;
            totalFat += nutrition.fat * multiplier;
            itemsWithNutrition++;
            
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

  app.get("/api/nutrition/items", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const foodItems = await storage.getFoodItems(userId);
      const locations = await storage.getStorageLocations(userId);
      
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

  // Waste reduction suggestions (user-scoped)
  app.get("/api/suggestions/waste-reduction", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const expiringItems = await storage.getExpiringItems(userId, 5);
      
      if (expiringItems.length === 0) {
        return res.json({ suggestions: [] });
      }

      const ingredientsList = expiringItems.map(item => 
        `${item.name} (${item.quantity} ${item.unit || ''}, expires in ${
          Math.ceil((new Date(item.expirationDate!).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        } days)`
      ).join(', ');

      const appliances = await storage.getAppliances(userId);
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

  // Meal Plans (user-scoped)
  app.get("/api/meal-plans", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { startDate, endDate } = req.query;
      const plans = await storage.getMealPlans(
        userId,
        startDate as string | undefined,
        endDate as string | undefined
      );
      res.json(plans);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch meal plans" });
    }
  });

  app.post("/api/meal-plans", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validated = insertMealPlanSchema.parse(req.body);
      const plan = await storage.createMealPlan(userId, validated);
      res.json(plan);
    } catch (error) {
      res.status(400).json({ error: "Invalid meal plan data" });
    }
  });

  app.put("/api/meal-plans/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const validated = insertMealPlanSchema.partial().parse(req.body);
      const plan = await storage.updateMealPlan(userId, id, validated);
      res.json(plan);
    } catch (error) {
      res.status(400).json({ error: "Failed to update meal plan" });
    }
  });

  app.delete("/api/meal-plans/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      await storage.deleteMealPlan(userId, id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete meal plan" });
    }
  });

  // Shopping list generation (user-scoped)
  app.post("/api/shopping-list/generate", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { recipeIds } = req.body;

      if (!recipeIds || !Array.isArray(recipeIds) || recipeIds.length === 0) {
        return res.status(400).json({ error: "Recipe IDs are required" });
      }

      const recipes = await Promise.all(
        recipeIds.map((id: string) => storage.getRecipe(userId, id))
      );

      const validRecipes = recipes.filter(r => r !== undefined);
      if (validRecipes.length === 0) {
        return res.status(404).json({ error: "No valid recipes found" });
      }

      const allMissingIngredients = validRecipes.flatMap(r => r!.missingIngredients || []);
      const uniqueIngredients = [...new Set(allMissingIngredients)];

      res.json({ items: uniqueIngredients });
    } catch (error) {
      console.error("Shopping list error:", error);
      res.status(500).json({ error: "Failed to generate shopping list" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
