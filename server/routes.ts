// Referenced from blueprint:javascript_log_in_with_replit - Added authentication and user-scoped routes
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { openai } from "./openai";
import { searchUSDAFoods, getFoodByFdcId } from "./usda";
import { searchBarcodeLookup, getBarcodeLookupProduct, extractImageUrl, getBarcodeLookupRateLimits, checkRateLimitBeforeCall } from "./barcodelookup";
import { getEnrichedOnboardingItem } from "./onboarding-usda";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { ApiError } from "./apiError";
import { z } from "zod";
import { 
  insertFoodItemSchema, 
  insertChatMessageSchema,
  insertRecipeSchema,
  insertApplianceSchema,
  insertMealPlanSchema,
  insertUserPreferencesSchema,
  insertStorageLocationSchema
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
      res.status(500).json({ error: "Failed to fetch user" });
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
      res.status(500).json({ error: "Failed to fetch preferences" });
    }
  });

  app.put('/api/user/preferences', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validated = insertUserPreferencesSchema.parse(req.body);
      const preferences = await storage.upsertUserPreferences({ ...validated, userId });
      res.json(preferences);
    } catch (error) {
      console.error("Error updating preferences:", error);
      res.status(500).json({ error: "Failed to update preferences" });
    }
  });

  app.post('/api/user/reset', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.resetUserData(userId);
      res.json({ success: true, message: "Account data reset successfully" });
    } catch (error) {
      console.error("Error resetting user data:", error);
      res.status(500).json({ error: "Failed to reset account data" });
    }
  });

  // Storage Locations (user-scoped)
  app.get("/api/storage-locations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const locations = await storage.getStorageLocations(userId);
      res.json(locations);
    } catch (error) {
      console.error("Error fetching storage locations:", error);
      res.status(500).json({ error: "Failed to fetch storage locations" });
    }
  });

  app.post("/api/storage-locations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validated = insertStorageLocationSchema.parse(req.body);
      const location = await storage.createStorageLocation(userId, validated);
      res.json(location);
    } catch (error) {
      console.error("Error creating storage location:", error);
      res.status(400).json({ error: "Invalid storage location data" });
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
      console.error("Error fetching food items:", error);
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
      console.error("Error creating food item:", error);
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
      console.error("Error updating food item:", error);
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
      console.error("Error deleting food item:", error);
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
      console.error("Error fetching appliances:", error);
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
      console.error("Error creating appliance:", error);
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
      console.error("Error deleting appliance:", error);
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
    } catch (error: any) {
      console.error("USDA search error:", error);
      if (error instanceof ApiError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
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
    } catch (error: any) {
      console.error("USDA food details error:", error);
      if (error instanceof ApiError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      res.status(500).json({ error: "Failed to fetch food details" });
    }
  });

  // Onboarding - Get enriched USDA data for common items (public - used during onboarding)
  app.get("/api/onboarding/enriched-item/:itemName", async (req: any, res) => {
    try {
      const { itemName } = req.params;
      const enrichedItem = await getEnrichedOnboardingItem(decodeURIComponent(itemName));
      
      if (!enrichedItem) {
        return res.status(404).json({ error: "Item not found in onboarding list" });
      }
      
      res.json(enrichedItem);
    } catch (error: any) {
      console.error("Error fetching enriched onboarding item:", error);
      res.status(500).json({ error: "Failed to fetch enriched item data" });
    }
  });

  // Barcode Lookup - Product Images (public)
  app.get("/api/barcodelookup/search", async (req: any, res) => {
    const userId = req.user?.claims?.sub;
    const { query } = req.query;
    let apiCallMade = false;
    let statusCode = 200;
    let success = true;
    
    try {
      if (!query || typeof query !== "string") {
        return res.status(400).json({ error: "Query parameter is required" });
      }

      // Check rate limits before making API call
      await checkRateLimitBeforeCall();

      apiCallMade = true;
      const results = await searchBarcodeLookup(query);
      
      const products = results.products.map(product => ({
        code: product.barcode_number || '',
        name: product.title || 'Unknown Product',
        brand: product.brand || '',
        imageUrl: extractImageUrl(product),
        description: product.description
      }));

      res.json({ products, count: products.length });
    } catch (error: any) {
      console.error("Barcode Lookup search error:", error);
      if (error instanceof ApiError) {
        statusCode = error.statusCode;
        success = false;
        return res.status(error.statusCode).json({ error: error.message });
      }
      statusCode = 500;
      success = false;
      res.status(500).json({ error: "Failed to search Barcode Lookup" });
    } finally {
      // Reliable logging: always executes regardless of success or failure
      if (userId && apiCallMade) {
        try {
          await storage.logApiUsage(userId, {
            apiName: 'barcode_lookup',
            endpoint: 'search',
            queryParams: `query=${query}`,
            statusCode,
            success
          });
        } catch (logError) {
          console.error("Failed to log API usage:", logError);
        }
      }
    }
  });

  app.get("/api/barcodelookup/product/:barcode", async (req: any, res) => {
    const userId = req.user?.claims?.sub;
    const { barcode } = req.params;
    let apiCallMade = false;
    let statusCode = 200;
    let success = true;
    
    try {
      // Check rate limits before making API call
      await checkRateLimitBeforeCall();
      
      apiCallMade = true;
      const product = await getBarcodeLookupProduct(barcode);
      
      if (!product) {
        statusCode = 404;
        success = false;
        return res.status(404).json({ error: "Product not found" });
      }

      res.json({
        code: product.barcode_number || '',
        name: product.title || 'Unknown Product',
        brand: product.brand || '',
        imageUrl: extractImageUrl(product),
        description: product.description
      });
    } catch (error: any) {
      console.error("Barcode Lookup product error:", error);
      if (error instanceof ApiError) {
        statusCode = error.statusCode;
        success = false;
        return res.status(error.statusCode).json({ error: error.message });
      }
      statusCode = 500;
      success = false;
      res.status(500).json({ error: "Failed to fetch product details" });
    } finally {
      // Reliable logging: always executes regardless of success or failure
      if (userId && apiCallMade) {
        try {
          await storage.logApiUsage(userId, {
            apiName: 'barcode_lookup',
            endpoint: 'product',
            queryParams: `barcode=${barcode}`,
            statusCode,
            success
          });
        } catch (logError) {
          console.error("Failed to log API usage:", logError);
        }
      }
    }
  });

  app.get("/api/barcodelookup/rate-limits", isAuthenticated, async (req, res) => {
    try {
      const limits = await getBarcodeLookupRateLimits();
      res.json(limits);
    } catch (error: any) {
      console.error("Barcode Lookup rate limits error:", error);
      if (error instanceof ApiError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      res.status(500).json({ error: "Failed to fetch rate limits" });
    }
  });

  app.get("/api/barcodelookup/usage/stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { days } = req.query;
      const daysParam = days ? parseInt(days as string) : 30;
      
      const stats = await storage.getApiUsageStats(userId, 'barcode_lookup', daysParam);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching API usage stats:", error);
      res.status(500).json({ error: "Failed to fetch usage stats" });
    }
  });

  app.get("/api/barcodelookup/usage/logs", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { limit } = req.query;
      const limitParam = limit ? parseInt(limit as string) : 50;
      
      const logs = await storage.getApiUsageLogs(userId, 'barcode_lookup', limitParam);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching API usage logs:", error);
      res.status(500).json({ error: "Failed to fetch usage logs" });
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
      console.error("Error fetching chat messages:", error);
      res.status(500).json({ error: "Failed to fetch chat messages" });
    }
  });

  // Define schema for chat message validation
  const chatMessageRequestSchema = z.object({
    message: z.string()
      .min(1, "Message cannot be empty")
      .max(10000, "Message is too long (max 10,000 characters)")
      .trim()
  });

  app.post("/api/chat", isAuthenticated, async (req: any, res) => {
    const abortController = new AbortController();
    
    req.on('close', () => {
      abortController.abort();
    });

    try {
      const userId = req.user.claims.sub;
      
      // Validate request body using Zod
      const validation = chatMessageRequestSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          error: "Invalid message format",
          details: validation.error.issues 
        });
      }
      
      const { message } = validation.data;

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

      // Optimize inventory context for large inventories
      // Prioritize: 1) expiring items, 2) recently added items
      const now = new Date();
      const prioritizedItems = foodItems
        .map(item => {
          const daysToExpiry = item.expirationDate 
            ? Math.ceil((new Date(item.expirationDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
            : Infinity;
          return { ...item, daysToExpiry };
        })
        .sort((a, b) => {
          // Sort by expiring soon first, then by most recently created
          if (a.daysToExpiry !== b.daysToExpiry) {
            return a.daysToExpiry - b.daysToExpiry;
          }
          return 0;
        })
        .slice(0, 100); // Limit to top 100 items to prevent excessive context size

      const inventoryContext = prioritizedItems.map(item => {
        const location = storageLocations.find(loc => loc.id === item.storageLocationId);
        const expiryNote = item.expirationDate && item.daysToExpiry < 7 
          ? ` (expires in ${item.daysToExpiry} days)` 
          : '';
        return `${item.name} (${item.quantity} ${item.unit || ''}) in ${location?.name || 'unknown'}${expiryNote}`;
      }).join(', ');

      const totalItemCount = foodItems.length;
      const contextNote = totalItemCount > 100 
        ? ` [Showing ${prioritizedItems.length} of ${totalItemCount} items - prioritizing expiring and recent items]` 
        : '';

      const appliancesContext = appliances.map(a => a.name).join(', ');

      const systemPrompt = `You are an AI Chef assistant. You help users manage their food inventory and suggest recipes.

Current inventory: ${inventoryContext || 'No items in inventory'}${contextNote}
Available appliances: ${appliancesContext || 'No appliances registered'}

Your tasks:
1. Answer cooking and recipe questions
2. Help users add, update, or remove food items from their inventory
3. Suggest recipes based on available ingredients
4. Provide cooking tips and guidance

When the user asks to add items, respond with the details and suggest saving them to inventory.
When asked for recipes, consider the available inventory and appliances.`;

      // Stream response from OpenAI
      let stream;
      try {
        stream = await openai.chat.completions.create({
          model: "gpt-5",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: message }
          ],
          stream: true,
          max_completion_tokens: 8192,
        });
      } catch (openaiError: any) {
        console.error("OpenAI API error:", {
          message: openaiError.message,
          status: openaiError.status,
          code: openaiError.code,
          type: openaiError.type,
          requestId: openaiError.headers?.['x-request-id'],
        });
        
        const errorMessage = openaiError.status === 429 
          ? "Rate limit exceeded. Please try again in a moment."
          : openaiError.status === 401 || openaiError.status === 403
          ? "Authentication failed with OpenAI API."
          : openaiError.message || "Failed to connect to AI service.";
        
        return res.status(openaiError.status || 500).json({ 
          error: errorMessage,
          details: openaiError.code,
        });
      }

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      let fullResponse = '';
      let streamCompleted = false;

      try {
        for await (const chunk of stream) {
          if (abortController.signal.aborted) {
            console.log("Stream aborted by client disconnect");
            break;
          }
          
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            fullResponse += content;
            try {
              res.write(`data: ${JSON.stringify({ content })}\n\n`);
            } catch (writeError) {
              console.error("Error writing to stream:", writeError);
              break;
            }
          }
        }

        streamCompleted = true;

        // Save AI response only if stream completed successfully and client is still connected
        if (fullResponse && !abortController.signal.aborted) {
          await storage.createChatMessage(userId, {
            role: "assistant",
            content: fullResponse,
            metadata: null,
          });
        }

        // Only write and end response if client is still connected and response is writable
        if (!abortController.signal.aborted && !res.writableEnded) {
          try {
            res.write('data: [DONE]\n\n');
            res.end();
          } catch (finalWriteError) {
            console.error("Error in final write to stream:", finalWriteError);
          }
        } else if (!res.writableEnded) {
          res.end();
        }
      } catch (streamError: any) {
        console.error("Streaming error:", {
          message: streamError.message,
          code: streamError.code,
          aborted: abortController.signal.aborted,
        });
        
        if (!res.writableEnded) {
          const errorData = {
            error: abortController.signal.aborted 
              ? "Stream cancelled" 
              : "Stream interrupted unexpectedly. Please try again.",
            type: streamError.code || 'stream_error',
          };
          res.write(`data: ${JSON.stringify(errorData)}\n\n`);
          res.end();
        }
      }
    } catch (error: any) {
      console.error("Chat error:", {
        message: error.message,
        stack: error.stack,
        userId: req.user?.claims?.sub,
      });
      
      if (!res.headersSent) {
        res.status(500).json({ 
          error: "Failed to process chat message",
          details: error.message,
        });
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
      console.error("Error fetching recipes:", error);
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
      console.error("Error updating recipe:", error);
      res.status(400).json({ error: "Failed to update recipe" });
    }
  });

  // Process recipe from image upload
  app.post("/api/recipes/from-image", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { image } = req.body; // Base64 encoded image or image URL
      
      if (!image) {
        return res.status(400).json({ error: "No image provided" });
      }

      // Create the prompt for recipe extraction
      const extractionPrompt = `You are a recipe extraction expert. Analyze this image of a recipe and extract all the information.
      
Return ONLY a valid JSON object with the following structure:
{
  "title": "Recipe name",
  "prepTime": "X minutes",
  "cookTime": "X minutes",
  "servings": number,
  "ingredients": ["ingredient 1 with quantity", "ingredient 2 with quantity"],
  "instructions": ["step 1", "step 2", "step 3"],
  "usedIngredients": [],
  "missingIngredients": []
}

Important:
- Extract ALL ingredients with their exact quantities
- Break down instructions into clear, numbered steps
- If prep time or cook time is not visible, estimate based on recipe complexity
- If servings is not specified, estimate based on ingredient quantities
- Leave usedIngredients and missingIngredients as empty arrays
- Ensure the JSON is properly formatted and parseable`;

      // Prepare the message with image
      const imageContent = image.startsWith('http') 
        ? { type: "image_url" as const, image_url: { url: image } }
        : { type: "image_url" as const, image_url: { url: `data:image/jpeg;base64,${image}` } };

      // Call OpenAI with vision capabilities
      const completion = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: extractionPrompt },
              imageContent
            ]
          }
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 8192,
      });

      const extractedData = JSON.parse(completion.choices[0].message.content || "{}");
      
      // Validate the extracted data
      if (!extractedData.title || !extractedData.ingredients || !extractedData.instructions) {
        throw new Error("Could not extract complete recipe information from the image");
      }

      // Create the recipe in the database
      const recipe = await storage.createRecipe(userId, {
        title: extractedData.title,
        prepTime: extractedData.prepTime || "Unknown",
        cookTime: extractedData.cookTime || "Unknown",
        servings: extractedData.servings || 4,
        ingredients: extractedData.ingredients || [],
        instructions: extractedData.instructions || [],
        usedIngredients: extractedData.usedIngredients || [],
        missingIngredients: extractedData.missingIngredients || [],
      });

      res.json(recipe);
    } catch (error: any) {
      console.error("Recipe image processing error:", error);
      res.status(500).json({ 
        error: "Failed to extract recipe from image",
        details: error.message || "Unknown error occurred"
      });
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
      console.error("Error fetching expiration notifications:", error);
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
      console.error("Error dismissing notification:", error);
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
      console.error("Error fetching nutrition stats:", error);
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
      console.error("Error fetching nutrition items:", error);
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
      console.error("Error fetching meal plans:", error);
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
      console.error("Error creating meal plan:", error);
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
      console.error("Error updating meal plan:", error);
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
      console.error("Error deleting meal plan:", error);
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
      const uniqueIngredients = Array.from(new Set(allMissingIngredients));

      res.json({ items: uniqueIngredients });
    } catch (error) {
      console.error("Shopping list error:", error);
      res.status(500).json({ error: "Failed to generate shopping list" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
