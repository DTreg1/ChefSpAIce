import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { insertRecipeSchema, insertChatMessageSchema, type Recipe, type ChatMessage } from "@shared/schema";
import { isAuthenticated } from "../replitAuth";
import { validateBody, validateQuery } from "../middleware";
import { openai } from "../openai";
import { batchedApiLogger } from "../batchedApiLogger";
import { cleanupOldMessagesForUser } from "../chatCleanup";
import rateLimiters from "../middleware/rateLimit";

const router = Router();

/**
 * GET /chat/messages
 * 
 * Retrieves chat message history for the authenticated user.
 * Messages are ordered chronologically for display in the chat UI.
 * 
 * Query Parameters:
 * - limit: Number (optional) - Maximum number of messages to retrieve (default: 50)
 * 
 * Returns: Array of chat messages (user and assistant) in chronological order
 */
router.get("/chat/messages", isAuthenticated, async (req: any, res: Response) => {
  try {
    const userId = req.user.claims.sub;
    const limit = parseInt(req.query.limit as string) || 50;

    const messages = await storage.getChatMessages(userId, limit);

    // Return in chronological order for display
    res.json(messages.reverse());
  } catch (error) {
    console.error("Error fetching chat messages:", error);
    res.status(500).json({ error: "Failed to fetch chat messages" });
  }
});

router.post(
  "/chat/messages",
  isAuthenticated,
  async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const validation = insertChatMessageSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({
          error: "Validation error",
          details: validation.error.errors
        });
      }

      const message = await storage.createChatMessage(userId, validation.data);
      
      res.json(message);
    } catch (error) {
      console.error("Error creating chat message:", error);
      res.status(500).json({ error: "Failed to create chat message" });
    }
  }
);

router.delete("/chat/messages", isAuthenticated, async (req: any, res: Response) => {
  try {
    const userId = req.user.claims.sub;
    await storage.clearChatMessages(userId);
    res.json({ message: "Chat history cleared" });
  } catch (error) {
    console.error("Error clearing chat messages:", error);
    res.status(500).json({ error: "Failed to clear chat messages" });
  }
});

/**
 * POST /chat
 * 
 * Main AI chat endpoint powered by OpenAI GPT-4.
 * Provides conversational cooking assistance with inventory awareness.
 * 
 * Request Body:
 * - message: String (required) - User's message to the assistant
 * - includeInventory: Boolean (optional) - Whether to include user's food inventory in context
 * 
 * AI Features:
 * - Maintains conversation context with 10-message history
 * - Can reference user's current food inventory for personalized suggestions
 * - Provides recipe suggestions, cooking tips, and meal planning advice
 * - Automatically cleans up old messages to manage database size
 * 
 * Rate Limiting: Protected by OpenAI rate limiter to prevent abuse
 * 
 * Returns:
 * - message: Assistant's response text
 * - saved: The saved assistant message object
 */
router.post(
  "/chat",
  isAuthenticated,
  rateLimiters.openai.middleware(),
  async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { message, includeInventory } = req.body;

      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      if (!openai) {
        return res.status(500).json({ error: "OpenAI API not configured" });
      }

      // Persist user message to database for conversation history
      await storage.createChatMessage(userId, {
        role: "user",
        content: message,
      });

      // Periodic cleanup to prevent unbounded growth of chat history
      // Keeps database size manageable and ensures relevant context
      await cleanupOldMessagesForUser(userId);

      // Build inventory context when requested
      // Enables AI to provide recommendations based on what user actually has
      let inventoryContext = "";
      if (includeInventory) {
        const items = await storage.getFoodItems(userId);
        
        if (items.length > 0) {
          inventoryContext = `\n\nUser's current food inventory:\n${items
            .map((item: any) => `- ${item.name}: ${item.quantity} ${item.unit || ""} (${item.foodCategory || "uncategorized"})`)
            .join("\n")}`;
        }
      }

      // Fetch recent conversation history to maintain context
      // Limited to 10 messages to balance context vs. token usage
      const history = await storage.getChatMessages(userId, 10);

      const messages: any[] = [
        {
          role: "system",
          content: `You are ChefSpAIce, a helpful cooking assistant. You provide recipe suggestions, cooking tips, and meal planning advice. Be concise but friendly.${inventoryContext}`,
        },
        ...history.reverse().map((msg: ChatMessage) => ({
          role: msg.role,
          content: msg.content,
        })),
      ];

      const completion = await openai.chat.completions.create({
        model: "gpt-4-turbo",
        messages,
        temperature: 0.7,
        max_tokens: 500,
      });

      const assistantMessage = completion.choices[0].message?.content || "";

      // Save assistant message
      const saved = await storage.createChatMessage(userId, {
        role: "assistant",
        content: assistantMessage,
      });

      // Log API usage
      await batchedApiLogger.logApiUsage(userId, {
        apiName: "openai",
        endpoint: "chat",
        queryParams: `model=gpt-4-turbo`,
        statusCode: 200,
        success: true,
      });

      res.json({
        message: assistantMessage,
        saved,
      });
    } catch (error) {
      console.error("Error in chat:", error);
      res.status(500).json({ error: "Failed to process chat" });
    }
  }
);

/**
 * POST /recipes/generate
 * 
 * AI-powered recipe generation endpoint using OpenAI GPT-4.
 * Creates personalized recipes based on user's inventory, dietary needs, and preferences.
 * 
 * Request Body:
 * - prompt: String (optional) - Free-form recipe request
 * - useInventory: Boolean (optional) - Generate recipe using available ingredients
 * - dietaryRestrictions: String[] (optional) - List of dietary restrictions (vegetarian, vegan, gluten-free, etc.)
 * - cuisine: String (optional) - Cuisine type (Italian, Mexican, Asian, etc.)
 * - mealType: String (optional) - Meal type (breakfast, lunch, dinner, snack)
 * - difficulty: String (optional) - Cooking difficulty (beginner, medium, advanced, default: "medium")
 * - maxCookTime: Number (optional) - Maximum cooking time in minutes
 * 
 * Smart Features:
 * - Equipment Awareness: Only suggests recipes that match user's available kitchen equipment
 * - Inventory Integration: Identifies which ingredients user has vs. needs to buy
 * - Cooking Term Detection: Automatically detects and links cooking terminology
 * - Personalization: Respects dietary restrictions and preferences
 * 
 * AI Model: GPT-4 Turbo with JSON response format for structured recipe data
 * Rate Limiting: Protected to prevent abuse and manage API costs
 * 
 * Returns: Complete recipe object with:
 * - title, description, ingredients, instructions
 * - prepTime, cookTime, servings
 * - usedIngredients (from user's inventory)
 * - missingIngredients (needs to purchase)
 * - neededEquipment (kitchen tools required)
 * - detectedCookingTerms (culinary terms with definitions)
 */
router.post(
  "/recipes/generate",
  isAuthenticated,
  rateLimiters.openai.middleware(),
  async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { 
        prompt, 
        useInventory, 
        dietaryRestrictions = [],
        cuisine,
        mealType,
        difficulty = "medium",
        maxCookTime
      } = req.body;

      if (!openai) {
        return res.status(500).json({ error: "OpenAI API not configured" });
      }

      // Build comprehensive context for AI recipe generation
      let context = "Generate a detailed recipe with the following requirements:\n";
      
      if (prompt) {
        context += `\nUser request: ${prompt}\n`;
      }

      // Include user's available ingredients for personalized recipes
      if (useInventory) {
        const items = await storage.getFoodItems(userId);
        
        if (items.length > 0) {
          context += `\nAvailable ingredients:\n${items
            .map((item: any) => `- ${item.name} (${item.quantity} available)`)
            .join("\n")}\n`;
        }
      }

      // Ensure recipe matches user's available kitchen equipment
      // Prevents suggesting recipes requiring tools the user doesn't own
      const userAppliances = await storage.getUserAppliances(userId);
      if (userAppliances && userAppliances.length > 0) {
        // Map user's appliance IDs to actual equipment names
        const applianceLibrary = await storage.getApplianceLibrary();
        const userEquipmentDetails = userAppliances.map(ua => {
          const libItem = applianceLibrary.find((al: any) => al.id === ua.applianceLibraryId);
          return libItem ? libItem.name : null;
        }).filter(Boolean);
        
        context += `\nAvailable kitchen equipment:\n${userEquipmentDetails
          .join(", ")}\n`;
        context += `\nPlease only suggest recipes that can be made with this equipment. If special equipment is needed, make sure it's from the available list.\n`;
      }

      // Apply user's dietary restrictions and preferences
      if (dietaryRestrictions.length > 0) {
        context += `\nDietary restrictions: ${dietaryRestrictions.join(", ")}\n`;
      }

      if (cuisine) context += `\nCuisine type: ${cuisine}\n`;
      if (mealType) context += `\nMeal type: ${mealType}\n`;
      if (difficulty) context += `\nDifficulty level: ${difficulty}\n`;
      if (maxCookTime) context += `\nMaximum cooking time: ${maxCookTime} minutes\n`;

      context += `
Return a JSON object with the following structure:
{
  "title": "Recipe name",
  "description": "Brief description",
  "ingredients": ["ingredient 1", "ingredient 2", ...],
  "instructions": ["step 1", "step 2", ...],
  "prepTime": "X minutes",
  "cookTime": "Y minutes",
  "servings": number,
  "usedIngredients": ["ingredients from user inventory"],
  "missingIngredients": ["ingredients user needs to buy"],
  "neededEquipment": ["equipment name 1", "equipment name 2", ...]
}`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4-turbo",
        messages: [{ role: "user", content: context }],
        temperature: 0.8,
        max_tokens: 1000,
        response_format: { type: "json_object" },
      });

      const recipeData = JSON.parse(completion.choices[0].message?.content || "{}");

      // Smart cooking term detection and enrichment
      // Scans recipe instructions for culinary terminology and provides definitions
      const { default: CookingTermsService } = await import("../services/cooking-terms.service");
      
      // Process each instruction step to find cooking terms
      const detectedTerms = [];
      if (recipeData.instructions && Array.isArray(recipeData.instructions)) {
        for (const instruction of recipeData.instructions) {
          const terms = await CookingTermsService.detectTermsInText(instruction);
          if (terms.length > 0) {
            detectedTerms.push(...terms);
          }
        }
      }
      
      // Deduplicate terms to avoid redundant definitions
      // Uses Map to ensure each term appears only once
      const uniqueTerms = Array.from(
        new Map(detectedTerms.map((term: any) => [term.term, term])).values()
      );
      
      // Enrich recipe with detected cooking terms for educational tooltips
      const enrichedRecipeData = {
        ...recipeData,
        detectedCookingTerms: uniqueTerms,
      };

      // Persist generated recipe to user's cookbook
      const saved = await storage.createRecipe(userId, enrichedRecipeData);

      // Log API usage
      await batchedApiLogger.logApiUsage(userId, {
        apiName: "openai",
        endpoint: "recipes/generate",
        queryParams: `model=gpt-4-turbo`,
        statusCode: 200,
        success: true,
      });

      res.json(saved);
    } catch (error) {
      console.error("Error generating recipe:", error);
      res.status(500).json({ error: "Failed to generate recipe" });
    }
  }
);

/**
 * POST /recipes
 * 
 * Creates a new recipe for the authenticated user.
 * 
 * Request Body:
 * - title: String (required) - Recipe name
 * - description: String (optional) - Brief description
 * - ingredients: Array (required) - List of ingredients
 * - instructions: Array (required) - Step-by-step instructions
 * - prepTime: String (optional) - Preparation time
 * - cookTime: String (optional) - Cooking time
 * - servings: Number (optional) - Number of servings
 * - cuisine: String (optional) - Cuisine type
 * - difficulty: String (optional) - Difficulty level
 * - source: String (optional) - Recipe source
 * 
 * Returns: Created recipe object with ID
 */
router.post("/recipes", isAuthenticated, async (req: any, res: Response) => {
  try {
    const userId = req.user.claims.sub;
    const recipeData = req.body;
    
    // Create the recipe
    const saved = await storage.createRecipe(userId, recipeData);
    
    res.json(saved);
  } catch (error) {
    console.error("Error creating recipe:", error);
    res.status(500).json({ error: "Failed to create recipe" });
  }
});

/**
 * GET /recipes
 * 
 * Retrieves user's recipe collection with optional filtering.
 * All filtering is performed at the database level for optimal performance.
 * 
 * Query Parameters:
 * - saved: Boolean ("true"/"false") - Filter for favorited recipes only
 * - cuisine: String - Filter by cuisine type
 * - difficulty: String - Filter by difficulty level (beginner, medium, advanced)
 * - maxCookTime: Number - Filter recipes with cook time <= this value (in minutes)
 * - search: String - Full-text search across recipe title and description
 * 
 * Performance Optimization:
 * - Uses database-level filtering to minimize data transfer
 * - Supports complex queries without loading all recipes into memory
 * 
 * Returns: Array of recipe objects matching the filters
 */
router.get("/recipes", isAuthenticated, async (req: any, res: Response) => {
  try {
    const userId = req.user.claims.sub;
    const { 
      saved, 
      cuisine, 
      difficulty,
      maxCookTime,
      search 
    } = req.query;

    // Build filters object for database-level filtering
    // This approach allows storage layer to optimize query execution
    const filters: any = {};
    
    if (saved === "true") {
      filters.isFavorite = true;
    }
    
    if (search) {
      filters.search = search.toString();
    }
    
    if (cuisine) {
      filters.cuisine = cuisine.toString();
    }
    
    if (difficulty) {
      filters.difficulty = difficulty.toString();
    }
    
    if (maxCookTime) {
      filters.maxCookTime = parseInt(maxCookTime.toString());
    }
    
    // Delegate to storage layer for optimized database query
    const userRecipes = await storage.getRecipes(userId, filters);

    res.json(userRecipes);
  } catch (error) {
    console.error("Error fetching recipes:", error);
    res.status(500).json({ error: "Failed to fetch recipes" });
  }
});

router.patch(
  "/recipes/:id",
  isAuthenticated,
  async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const recipeId = req.params.id;

      // Verify recipe belongs to user - optimized to fetch only the specific recipe
      const existing = await storage.getRecipe(userId, recipeId);

      if (!existing) {
        return res.status(404).json({ error: "Recipe not found" });
      }

      const updated = await storage.updateRecipe(recipeId, userId, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating recipe:", error);
      res.status(500).json({ error: "Failed to update recipe" });
    }
  }
);

router.delete("/recipes/:id", isAuthenticated, async (req: any, res: Response) => {
  try {
    const userId = req.user.claims.sub;
    const recipeId = req.params.id;

    // Verify recipe belongs to user - optimized to fetch only the specific recipe
    const existing = await storage.getRecipe(userId, recipeId);

    if (!existing) {
      return res.status(404).json({ error: "Recipe not found" });
    }

    // Delete the recipe (cascading deletes will handle related meal plans)
    await storage.deleteRecipe(userId, recipeId);
    
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting recipe:", error);
    res.status(500).json({ error: "Failed to delete recipe" });
  }
});

export default router;