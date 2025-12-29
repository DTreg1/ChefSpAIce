import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import OpenAI from "openai";
import { z } from "zod";
import { eq } from "drizzle-orm";
import {
  getShelfLife,
  getShelfLifeEntry,
  findPartialMatch,
  getShelfLifeForLocation,
} from "./lib/shelf-life-data";
import suggestionsRouter from "./routers/user/suggestions.router";
import recipesRouter from "./routers/user/recipes.router";
import nutritionRouter from "./routers/user/nutrition.router";
import cookingTermsRouter from "./routers/user/cooking-terms.router";
import {
  appliancesRouter,
  userAppliancesRouter,
} from "./routers/user/appliances.router";
import voiceRouter from "./routers/platform/voice.router";
import imageAnalysisRouter from "./routers/platform/ai/image-analysis.router";
import ingredientsRouter from "./routers/user/ingredients.router";
import instacartRouter from "./routers/platform/instacart.router";
import authRouter from "./routers/auth.router";
import socialAuthRouter from "./routers/social-auth.router";
import syncRouter from "./routers/sync.router";
import { lookupUSDABarcode, mapUSDAToFoodItem } from "./integrations/usda";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import { db } from "./db";
import { userSessions, appliances } from "../shared/schema";
import { inArray } from "drizzle-orm";

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

const shelfLifeRequestSchema = z.object({
  foodName: z.string().min(1, "Food name is required"),
  category: z.string().optional(),
  storageLocation: z.string().optional(),
});

type ConfidenceLevel = "high" | "medium" | "low";
type SourceType = "local" | "ai";

interface ShelfLifeResponse {
  suggestedDays: number;
  confidence: ConfidenceLevel;
  source: SourceType;
  notes?: string;
  signsOfSpoilage?: string;
}

interface CacheEntry {
  response: ShelfLifeResponse;
  timestamp: number;
}

const aiSuggestionCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function getCacheKey(foodName: string, storageLocation?: string): string {
  return `${foodName.toLowerCase().trim()}:${(storageLocation || "refrigerator").toLowerCase().trim()}`;
}

function getFromCache(key: string): ShelfLifeResponse | null {
  const entry = aiSuggestionCache.get(key);
  if (!entry) return null;

  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    aiSuggestionCache.delete(key);
    return null;
  }

  return entry.response;
}

function setInCache(key: string, response: ShelfLifeResponse): void {
  aiSuggestionCache.set(key, {
    response,
    timestamp: Date.now(),
  });
}

async function getAIShelfLifeSuggestion(
  foodName: string,
  category?: string,
  storageLocation?: string,
): Promise<ShelfLifeResponse> {
  const cacheKey = getCacheKey(foodName, storageLocation);
  const cached = getFromCache(cacheKey);
  if (cached) {
    console.log(`Shelf life cache hit for: ${foodName}`);
    return cached;
  }

  const prompt = `As a food safety expert, estimate how long this food item will stay fresh:

Food: ${foodName}
${category ? `Category: ${category}` : ""}
Storage: ${storageLocation || "refrigerator"}

Consider:
- USDA food safety guidelines
- Common storage practices
- Signs of spoilage for this food type

Return JSON: {
  "days": number,
  "notes": "brief storage tip",
  "signs_of_spoilage": "what to look for"
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a food safety expert. Provide accurate, conservative shelf life estimates based on USDA guidelines. Always respond with valid JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 256,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    const parsed = JSON.parse(content);
    const response: ShelfLifeResponse = {
      suggestedDays: Math.max(1, Math.min(365, parsed.days || 7)),
      confidence: "medium",
      source: "ai",
      notes: parsed.notes || undefined,
      signsOfSpoilage: parsed.signs_of_spoilage || undefined,
    };

    setInCache(cacheKey, response);
    console.log(`Shelf life AI response cached for: ${foodName}`);

    return response;
  } catch (error) {
    console.error("AI shelf life estimation error:", error);
    throw error;
  }
}

// Map USDA food categories to our app categories
function mapFoodCategory(usdaCategory: string): string {
  const categoryLower = usdaCategory.toLowerCase();

  if (
    categoryLower.includes("fruit") ||
    categoryLower.includes("vegetable") ||
    categoryLower.includes("produce") ||
    categoryLower.includes("salad")
  ) {
    return "Produce";
  }
  if (
    categoryLower.includes("dairy") ||
    categoryLower.includes("milk") ||
    categoryLower.includes("cheese") ||
    categoryLower.includes("yogurt") ||
    categoryLower.includes("cream") ||
    categoryLower.includes("butter")
  ) {
    return "Dairy";
  }
  if (
    categoryLower.includes("meat") ||
    categoryLower.includes("beef") ||
    categoryLower.includes("pork") ||
    categoryLower.includes("chicken") ||
    categoryLower.includes("turkey") ||
    categoryLower.includes("lamb") ||
    categoryLower.includes("poultry")
  ) {
    return "Meat";
  }
  if (
    categoryLower.includes("fish") ||
    categoryLower.includes("seafood") ||
    categoryLower.includes("shellfish") ||
    categoryLower.includes("shrimp") ||
    categoryLower.includes("salmon") ||
    categoryLower.includes("tuna")
  ) {
    return "Seafood";
  }
  if (
    categoryLower.includes("bread") ||
    categoryLower.includes("bakery") ||
    categoryLower.includes("baked") ||
    categoryLower.includes("pastry") ||
    categoryLower.includes("cake") ||
    categoryLower.includes("cookie")
  ) {
    return "Bakery";
  }
  if (categoryLower.includes("frozen")) {
    return "Frozen";
  }
  if (categoryLower.includes("canned") || categoryLower.includes("preserved")) {
    return "Canned";
  }
  if (
    categoryLower.includes("beverage") ||
    categoryLower.includes("drink") ||
    categoryLower.includes("juice") ||
    categoryLower.includes("soda") ||
    categoryLower.includes("water") ||
    categoryLower.includes("coffee") ||
    categoryLower.includes("tea")
  ) {
    return "Beverages";
  }
  if (
    categoryLower.includes("snack") ||
    categoryLower.includes("chip") ||
    categoryLower.includes("cracker") ||
    categoryLower.includes("nut") ||
    categoryLower.includes("candy") ||
    categoryLower.includes("chocolate")
  ) {
    return "Snacks";
  }
  if (
    categoryLower.includes("sauce") ||
    categoryLower.includes("condiment") ||
    categoryLower.includes("dressing") ||
    categoryLower.includes("spice") ||
    categoryLower.includes("seasoning") ||
    categoryLower.includes("oil") ||
    categoryLower.includes("vinegar")
  ) {
    return "Condiments";
  }
  if (
    categoryLower.includes("grain") ||
    categoryLower.includes("cereal") ||
    categoryLower.includes("pasta") ||
    categoryLower.includes("rice") ||
    categoryLower.includes("oat")
  ) {
    return "Grains";
  }
  if (
    categoryLower.includes("legume") ||
    categoryLower.includes("bean") ||
    categoryLower.includes("lentil") ||
    categoryLower.includes("pea")
  ) {
    return "Legumes";
  }
  if (categoryLower.includes("egg")) {
    return "Dairy";
  }

  // Default category based on common patterns
  return "Pantry Staples";
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Mount routers
  app.use("/api/auth", authRouter);
  app.use("/api/auth/social", socialAuthRouter);
  app.use("/api/suggestions", suggestionsRouter);
  app.use("/api/recipes", recipesRouter);
  app.use("/api/nutrition", nutritionRouter);
  app.use("/api/cooking-terms", cookingTermsRouter);
  app.use("/api/instacart", instacartRouter);
  app.use("/api/appliances", appliancesRouter);
  app.use("/api/user/appliances", userAppliancesRouter);
  app.use("/api/voice", voiceRouter);
  app.use("/api/ai", imageAnalysisRouter);
  app.use("/api/ingredients", ingredientsRouter);
  app.use("/api/sync", syncRouter);

  // Register object storage routes
  registerObjectStorageRoutes(app);

  // Chat endpoint with function calling for authenticated users
  app.post("/api/chat", async (req: Request, res: Response) => {
    try {
      const { message, context, history, inventory, preferences, equipment, userId } = req.body;

      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      // Import chat action handlers
      const { chatFunctionDefinitions, executeChatAction, getUserSyncData } = await import("./lib/chat-actions");

      // Check if user is authenticated
      const authHeader = req.headers.authorization;
      let authenticatedUserId: string | null = null;
      
      if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.slice(7);
        const sessions = await db
          .select()
          .from(userSessions)
          .where(eq(userSessions.token, token));
        
        if (sessions.length > 0 && new Date(sessions[0].expiresAt) > new Date()) {
          authenticatedUserId = sessions[0].userId;
        }
      }

      // Build inventory context from passed data or fetch from database
      let inventoryContext = context || "";
      let fullInventory: unknown[] = [];
      let userPreferences = preferences || null;
      let userEquipment = equipment || [];
      
      if (authenticatedUserId) {
        const userData = await getUserSyncData(authenticatedUserId);
        fullInventory = userData.inventory;
        if (fullInventory.length > 0) {
          inventoryContext = `Available ingredients: ${fullInventory.map((i: any) => `${i.quantity} ${i.unit} ${i.name}`).join(", ")}`;
        }
        // Use server-side preferences/equipment if available
        if (userData.preferences) {
          userPreferences = userData.preferences;
        }
        if (userData.cookware && userData.cookware.length > 0) {
          userEquipment = userData.cookware;
        }
      } else if (inventory && Array.isArray(inventory)) {
        fullInventory = inventory;
        inventoryContext = `Available ingredients: ${inventory.map((i: any) => `${i.quantity || 1} ${i.unit || 'item'} ${i.name}`).join(", ")}`;
      }

      // Build preferences context
      let preferencesContext = "";
      if (userPreferences) {
        const prefParts: string[] = [];
        if (userPreferences.dietaryRestrictions?.length > 0) {
          prefParts.push(`Dietary restrictions: ${userPreferences.dietaryRestrictions.join(", ")}`);
        }
        if (userPreferences.cuisinePreferences?.length > 0) {
          prefParts.push(`Favorite cuisines: ${userPreferences.cuisinePreferences.join(", ")}`);
        }
        if (userPreferences.macroTargets) {
          const mt = userPreferences.macroTargets;
          prefParts.push(`Daily macro targets: ${mt.calories || "N/A"} cal, ${mt.protein || "N/A"}g protein, ${mt.carbs || "N/A"}g carbs, ${mt.fat || "N/A"}g fat`);
        }
        if (prefParts.length > 0) {
          preferencesContext = `\nUSER'S PREFERENCES:\n${prefParts.join("\n")}`;
        }
      }

      // Build equipment context - fetch actual appliance names from database
      let equipmentContext = "";
      if (userEquipment && userEquipment.length > 0) {
        try {
          // Normalize equipment to array of numeric IDs (handles both raw IDs and objects with id property)
          const equipmentIds: number[] = userEquipment
            .map((item: unknown) => {
              if (typeof item === "number") return item;
              if (typeof item === "object" && item !== null && "id" in item) {
                return typeof (item as { id: unknown }).id === "number" 
                  ? (item as { id: number }).id 
                  : parseInt(String((item as { id: unknown }).id), 10);
              }
              if (typeof item === "string") return parseInt(item, 10);
              return NaN;
            })
            .filter((id: number) => !isNaN(id));

          if (equipmentIds.length > 0) {
            const applianceRecords = await db
              .select({ id: appliances.id, name: appliances.name })
              .from(appliances)
              .where(inArray(appliances.id, equipmentIds));
            
            if (applianceRecords.length > 0) {
              const applianceNames = applianceRecords.map(a => a.name);
              equipmentContext = `\nUSER'S KITCHEN EQUIPMENT: ${applianceNames.join(", ")}
Note: Only suggest recipes that can be made with the equipment the user has. If they don't have specialty appliances, suggest alternatives.`;
            }
          }
        } catch (error) {
          console.error("Failed to fetch appliance names:", error);
        }
      }

      const systemPrompt = `You are ChefSpAIce, an intelligent kitchen assistant with the ability to take actions on behalf of users.

CAPABILITIES:
- Add items to the user's pantry inventory
- Mark items as consumed when the user uses them
- Log wasted items when food goes bad
- Generate personalized recipes based on available ingredients and user preferences
- Create weekly meal plans respecting dietary restrictions
- Add items to shopping lists
- Provide cooking tips, nutrition info, and food storage advice

${
  inventoryContext
    ? `USER'S CURRENT INVENTORY:
${inventoryContext}

When suggesting recipes, prioritize ingredients the user actually has. If asked to add, consume, or waste items, use the appropriate function.`
    : "The user has not added any ingredients yet. Encourage them to add items to their pantry to get personalized suggestions."
}${preferencesContext}${equipmentContext}

${
  authenticatedUserId
    ? `IMPORTANT: This user is authenticated. You CAN perform actions on their behalf like adding items, generating recipes, creating meal plans, etc. When the user asks you to do something actionable, USE THE AVAILABLE FUNCTIONS to actually perform the action.`
    : `NOTE: This user is not logged in. You can provide advice and suggestions, but tell them to log in to enable features like saving recipes, meal planning, and shopping lists.`
}

BEHAVIOR GUIDELINES:
- Be proactive: If a user says "I just bought milk", add it to their inventory
- Be helpful: If a user says "I used all the eggs", mark them as consumed
- Be practical: Keep responses concise and actionable
- ALWAYS respect the user's dietary restrictions when suggesting or generating recipes
- Consider the user's cuisine preferences when making suggestions
- When asked to generate a recipe, always use the generate_recipe function
- When asked for a meal plan, use create_meal_plan function
- When asked to add to shopping list, use add_to_shopping_list function`;

      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: "system", content: systemPrompt },
      ];

      if (history && Array.isArray(history)) {
        history.forEach(
          (msg: { role: "user" | "assistant"; content: string }) => {
            messages.push({ role: msg.role, content: msg.content });
          },
        );
      }

      messages.push({ role: "user", content: message });

      // Use function calling if user is authenticated
      const completionOptions: OpenAI.Chat.ChatCompletionCreateParams = {
        model: "gpt-4o-mini",
        messages,
        max_completion_tokens: 1024,
      };

      if (authenticatedUserId) {
        completionOptions.tools = chatFunctionDefinitions;
        completionOptions.tool_choice = "auto";
      }

      const completion = await openai.chat.completions.create(completionOptions);
      const responseMessage = completion.choices[0]?.message;

      // Check if the AI wants to call a function
      if (responseMessage?.tool_calls && responseMessage.tool_calls.length > 0 && authenticatedUserId) {
        const toolCalls = responseMessage.tool_calls;
        const actionResults: Array<{ name: string; result: unknown }> = [];
        
        // Execute all function calls
        for (const toolCall of toolCalls) {
          // Handle both standard and custom tool calls
          const toolCallAny = toolCall as any;
          if (!toolCallAny.function) continue;
          const functionName = toolCallAny.function.name as string;
          const args = JSON.parse(toolCallAny.function.arguments as string);
          
          console.log(`[Chat] Executing function: ${functionName}`, args);
          const result = await executeChatAction(authenticatedUserId, functionName, args);
          actionResults.push({ name: functionName, result });
        }

        // Build follow-up messages with function results
        const followUpMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
          ...messages,
          responseMessage as OpenAI.Chat.ChatCompletionMessageParam,
          ...toolCalls.map((toolCall, index) => ({
            role: "tool" as const,
            tool_call_id: toolCall.id,
            content: JSON.stringify(actionResults[index]?.result || { success: false })
          }))
        ];

        // Get final response after function execution
        const finalCompletion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: followUpMessages,
          max_completion_tokens: 1024,
        });

        const finalReply = finalCompletion.choices[0]?.message?.content || 
          "I've completed the action for you.";

        return res.json({ 
          reply: finalReply,
          actions: actionResults.map(ar => ar.result),
          refreshData: true
        });
      }

      // Regular response without function calls
      const reply =
        responseMessage?.content ||
        "I'm sorry, I couldn't process that request.";
      res.json({ reply });
    } catch (error) {
      console.error("Chat error:", error);
      res.status(500).json({ error: "Failed to process chat message" });
    }
  });

  // USDA Food search endpoint
  app.get("/api/food/search", async (req: Request, res: Response) => {
    try {
      const { query } = req.query;

      if (!query || typeof query !== "string") {
        return res.status(400).json({ error: "Search query is required" });
      }

      const apiKey = process.env.USDA_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "USDA API key not configured" });
      }

      const response = await fetch(
        `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${apiKey}&query=${encodeURIComponent(query)}&pageSize=25`,
      );

      if (!response.ok) {
        throw new Error(`USDA API error: ${response.status}`);
      }

      const data = await response.json();

      // Map USDA response to our simplified format
      const foods = (data.foods || []).map((food: any) => {
        // Extract key nutrients
        const nutrients = food.foodNutrients || [];
        const getN = (id: number) =>
          nutrients.find((n: any) => n.nutrientId === id)?.value || 0;
        const usdaCategory =
          food.foodCategory || food.brandedFoodCategory || "";

        return {
          fdcId: food.fdcId,
          description: food.description,
          brandOwner: food.brandOwner || null,
          dataType: food.dataType,
          servingSize: food.servingSize || 100,
          servingSizeUnit: food.servingSizeUnit || "g",
          nutrition: {
            calories: Math.round(getN(1008)), // Energy (kcal)
            protein: Math.round(getN(1003) * 10) / 10, // Protein
            carbs: Math.round(getN(1005) * 10) / 10, // Carbohydrates
            fat: Math.round(getN(1004) * 10) / 10, // Total fat
            fiber: Math.round(getN(1079) * 10) / 10, // Fiber
            sugar: Math.round(getN(2000) * 10) / 10, // Sugars
          },
          category: mapFoodCategory(usdaCategory),
          usdaCategory: usdaCategory || null,
        };
      });

      res.json({ foods, totalHits: data.totalHits || 0 });
    } catch (error) {
      console.error("Food search error:", error);
      res.status(500).json({ error: "Failed to search food database" });
    }
  });

  // USDA Food details endpoint
  app.get("/api/food/:fdcId", async (req: Request, res: Response) => {
    try {
      const { fdcId } = req.params;

      if (!fdcId) {
        return res.status(400).json({ error: "Food ID is required" });
      }

      const apiKey = process.env.USDA_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "USDA API key not configured" });
      }

      const response = await fetch(
        `https://api.nal.usda.gov/fdc/v1/food/${fdcId}?api_key=${apiKey}`,
      );

      if (!response.ok) {
        throw new Error(`USDA API error: ${response.status}`);
      }

      const food = await response.json();

      // Extract nutrients
      const nutrients = food.foodNutrients || [];
      const getN = (id: number) => {
        const nutrient = nutrients.find(
          (n: any) => n.nutrient?.id === id || n.nutrientId === id,
        );
        return nutrient?.amount || nutrient?.value || 0;
      };

      const usdaCategory = food.foodCategory || food.brandedFoodCategory || "";
      const result = {
        fdcId: food.fdcId,
        description: food.description,
        brandOwner: food.brandOwner || null,
        ingredients: food.ingredients || null,
        servingSize: food.servingSize || food.householdServingFullText || 100,
        servingSizeUnit: food.servingSizeUnit || "g",
        nutrition: {
          calories: Math.round(getN(1008)),
          protein: Math.round(getN(1003) * 10) / 10,
          carbs: Math.round(getN(1005) * 10) / 10,
          fat: Math.round(getN(1004) * 10) / 10,
          fiber: Math.round(getN(1079) * 10) / 10,
          sugar: Math.round(getN(2000) * 10) / 10,
          sodium: Math.round(getN(1093)),
          cholesterol: Math.round(getN(1253)),
        },
        category: mapFoodCategory(usdaCategory),
        usdaCategory: usdaCategory || null,
      };

      res.json(result);
    } catch (error) {
      console.error("Food details error:", error);
      res.status(500).json({ error: "Failed to get food details" });
    }
  });

  // Barcode lookup endpoint - tries USDA first, then OpenFoodFacts as fallback
  app.get("/api/food/barcode/:code", async (req: Request, res: Response) => {
    try {
      const { code } = req.params;

      if (!code) {
        return res.status(400).json({ error: "Barcode is required" });
      }

      const cleanCode = code.replace(/\D/g, "");

      // Try USDA FoodData Central first (has better US product coverage)
      const usdaProduct = await lookupUSDABarcode(cleanCode);
      if (usdaProduct) {
        const mapped = mapUSDAToFoodItem(usdaProduct);

        // Parse serving size and unit from USDA data
        let servingSize = 100;
        let servingSizeUnit = "g";
        if (mapped.nutrition.servingSize) {
          const match = mapped.nutrition.servingSize.match(/^([\d.]+)\s*(.*)$/);
          if (match) {
            servingSize = parseFloat(match[1]) || 100;
            servingSizeUnit = match[2]?.trim() || "g";
          }
        } else if (usdaProduct.servingSize) {
          servingSize = usdaProduct.servingSize;
          servingSizeUnit = usdaProduct.servingSizeUnit || "g";
        }

        const product = {
          barcode: cleanCode,
          name: mapped.name,
          brand: mapped.brandOwner || null,
          category: mapFoodCategory(mapped.category),
          usdaCategory: mapped.category || null,
          imageUrl: null,
          servingSize,
          servingSizeUnit,
          nutrition: {
            calories: mapped.nutrition.calories,
            protein: mapped.nutrition.protein,
            carbs: mapped.nutrition.carbs,
            fat: mapped.nutrition.fat,
            fiber: mapped.nutrition.fiber || 0,
            sugar: mapped.nutrition.sugar || 0,
          },
          ingredients: mapped.ingredients || null,
          source: "usda" as const,
        };
        console.log(
          `Found USDA product for barcode ${cleanCode}: ${product.name}`,
        );
        return res.json({ product });
      }

      // Fallback to OpenFoodFacts API (free, no key required)
      const response = await fetch(
        `https://world.openfoodfacts.org/api/v2/product/${cleanCode}.json`,
        {
          headers: {
            "User-Agent": "FreshPantry/1.0 (Replit App)",
          },
        },
      );

      if (!response.ok) {
        console.log(
          `OpenFoodFacts API error for barcode ${cleanCode}: ${response.status}`,
        );
        return res.json({ product: null, message: "Product not found" });
      }

      const data = await response.json();

      if (data.status !== 1 || !data.product) {
        console.log(`Product not found for barcode ${cleanCode}`);
        return res.json({
          product: null,
          message: "Product not found in database",
        });
      }

      const p = data.product;

      // Extract nutrition per 100g
      const nutrients = p.nutriments || {};
      const openFoodFactsCategory =
        p.categories || p.categories_tags?.[0] || "";

      const product = {
        barcode: cleanCode,
        name: p.product_name || p.product_name_en || "Unknown Product",
        brand: p.brands || null,
        category: mapFoodCategory(openFoodFactsCategory),
        usdaCategory: openFoodFactsCategory || null,
        imageUrl: p.image_front_url || p.image_url || null,
        servingSize: p.serving_quantity || 100,
        servingSizeUnit: p.serving_quantity_unit || "g",
        nutrition: {
          calories: Math.round(
            nutrients["energy-kcal_100g"] || nutrients.energy_value || 0,
          ),
          protein: Math.round((nutrients.proteins_100g || 0) * 10) / 10,
          carbs: Math.round((nutrients.carbohydrates_100g || 0) * 10) / 10,
          fat: Math.round((nutrients.fat_100g || 0) * 10) / 10,
          fiber: Math.round((nutrients.fiber_100g || 0) * 10) / 10,
          sugar: Math.round((nutrients.sugars_100g || 0) * 10) / 10,
        },
        ingredients: p.ingredients_text || null,
        source: "openfoodfacts" as const,
      };

      console.log(
        `Found OpenFoodFacts product for barcode ${cleanCode}: ${product.name}`,
      );
      res.json({ product });
    } catch (error) {
      console.error("Barcode lookup error:", error);
      res.status(500).json({ error: "Failed to lookup barcode" });
    }
  });

  app.post(
    "/api/suggestions/shelf-life",
    async (req: Request, res: Response) => {
      try {
        const parseResult = shelfLifeRequestSchema.safeParse(req.body);

        if (!parseResult.success) {
          const errorMessages = parseResult.error.errors
            .map((e) => e.message)
            .join(", ");
          console.error("Shelf life validation error:", errorMessages);
          return res.status(400).json({
            error: "Invalid input",
            details: errorMessages,
          });
        }

        const { foodName, category, storageLocation } = parseResult.data;
        const normalizedFood = foodName.toLowerCase().trim();
        const normalizedLocation = (storageLocation || "refrigerator")
          .toLowerCase()
          .trim();

        const locationMap: Record<string, string> = {
          fridge: "refrigerator",
          freezer: "freezer",
          pantry: "pantry",
          counter: "counter",
          refrigerator: "refrigerator",
        };
        const mappedLocation =
          locationMap[normalizedLocation] || "refrigerator";

        const directMatch = getShelfLifeForLocation(
          normalizedFood,
          mappedLocation,
        );
        if (directMatch) {
          console.log(
            `Shelf life direct match for: ${foodName} in ${mappedLocation}`,
          );
          return res.json({
            suggestedDays: directMatch.days,
            confidence: "high" as ConfidenceLevel,
            source: "local" as SourceType,
            notes: directMatch.notes,
          });
        }

        if (category) {
          const categoryMatch = getShelfLifeForLocation(
            category.toLowerCase(),
            mappedLocation,
          );
          if (categoryMatch) {
            console.log(
              `Shelf life category match for: ${foodName} (${category}) in ${mappedLocation}`,
            );
            return res.json({
              suggestedDays: categoryMatch.days,
              confidence: "high" as ConfidenceLevel,
              source: "local" as SourceType,
              notes: categoryMatch.notes,
            });
          }
        }

        const partialMatch = findPartialMatch(normalizedFood);
        if (partialMatch) {
          const matchedEntry = getShelfLifeForLocation(
            partialMatch.matchedCategory,
            mappedLocation,
          );
          if (matchedEntry) {
            console.log(
              `Shelf life partial match for: ${foodName} -> ${partialMatch.matchedCategory} in ${mappedLocation}`,
            );
            return res.json({
              suggestedDays: matchedEntry.days,
              confidence: "medium" as ConfidenceLevel,
              source: "local" as SourceType,
              notes: matchedEntry.notes,
            });
          }

          console.log(
            `Shelf life partial match (default location) for: ${foodName} -> ${partialMatch.matchedCategory}`,
          );
          return res.json({
            suggestedDays: partialMatch.days,
            confidence: "medium" as ConfidenceLevel,
            source: "local" as SourceType,
            notes: partialMatch.notes,
          });
        }

        try {
          console.log(`Shelf life AI fallback for: ${foodName}`);
          const aiSuggestion = await getAIShelfLifeSuggestion(
            foodName,
            category,
            mappedLocation,
          );
          return res.json(aiSuggestion);
        } catch (aiError) {
          console.error("AI fallback failed, using default:", aiError);

          return res.json({
            suggestedDays: 7,
            confidence: "low" as ConfidenceLevel,
            source: "local" as SourceType,
            notes:
              "Default estimate. Please verify based on product packaging.",
          });
        }
      } catch (error) {
        console.error("Shelf life suggestion error:", error);

        return res.status(500).json({
          suggestedDays: 7,
          confidence: "low" as ConfidenceLevel,
          source: "local" as SourceType,
          notes: "Error occurred. Using default 7-day estimate.",
          error: "Failed to get shelf life suggestion",
        });
      }
    },
  );

  // Raw barcode lookup for testing - returns all metadata from both sources
  app.get("/api/barcode/raw", async (req: Request, res: Response) => {
    try {
      const { barcode } = req.query;

      if (!barcode || typeof barcode !== "string") {
        return res.status(400).json({ error: "Barcode is required" });
      }

      const cleanBarcode = barcode.replace(/\D/g, "");

      // Fetch from OpenFoodFacts
      let openFoodFactsResult: { found: boolean; raw: any } = {
        found: false,
        raw: null,
      };

      try {
        const offResponse = await fetch(
          `https://world.openfoodfacts.org/api/v0/product/${cleanBarcode}.json`,
          {
            headers: {
              "User-Agent": "ChefSpAIce/1.0 (barcode-test)",
              Accept: "application/json",
            },
          },
        );

        if (offResponse.ok) {
          const offData = await offResponse.json();
          openFoodFactsResult = {
            found: offData.status === 1 && !!offData.product,
            raw: offData,
          };
        }
      } catch (err) {
        console.error("OpenFoodFacts lookup error:", err);
      }

      // Fetch from USDA
      let usdaResult: { found: boolean; raw: any } = {
        found: false,
        raw: null,
      };

      const usdaApiKey = process.env.USDA_API_KEY;
      if (usdaApiKey) {
        try {
          const usdaResponse = await fetch(
            `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${usdaApiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                query: cleanBarcode,
                dataType: ["Branded"],
                pageSize: 10,
              }),
            },
          );

          if (usdaResponse.ok) {
            const usdaData = await usdaResponse.json();
            const foods = usdaData.foods || [];

            // Look for exact barcode match
            const exactMatch = foods.find((food: any) => {
              if (food.gtinUpc) {
                const foodUpc = food.gtinUpc.replace(/\D/g, "");
                return (
                  foodUpc === cleanBarcode ||
                  foodUpc.endsWith(cleanBarcode) ||
                  cleanBarcode.endsWith(foodUpc)
                );
              }
              return false;
            });

            usdaResult = {
              found: !!exactMatch || foods.length > 0,
              raw: {
                searchResults: usdaData,
                exactMatch: exactMatch || null,
                firstResult: foods[0] || null,
              },
            };
          }
        } catch (err) {
          console.error("USDA lookup error:", err);
        }
      } else {
        usdaResult.raw = { error: "USDA_API_KEY not configured" };
      }

      res.json({
        barcode: cleanBarcode,
        openFoodFacts: openFoodFactsResult,
        usda: usdaResult,
      });
    } catch (error) {
      console.error("Barcode raw lookup error:", error);
      res.status(500).json({ error: "Failed to lookup barcode" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
