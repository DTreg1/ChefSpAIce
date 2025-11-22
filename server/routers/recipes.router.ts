import { Router, Request, Response } from "express";
import { getAuthenticatedUserId, sendError, sendSuccess } from "../types/request-helpers";
import { recipesStorage } from "../storage/index";
import { insertChatMessageSchema, type ChatMessage } from "@shared/schema";
// Use OAuth authentication middleware
import { isAuthenticated } from "../middleware/auth.middleware";
import { openai } from "../integrations/openai";
import { batchedApiLogger } from "../utils/batchedApiLogger";
import { cleanupOldMessagesForUser } from "../utils/chatCleanup";
import rateLimiters from "../middleware/rateLimit";
import {
  AIError,
  handleOpenAIError,
  retryWithBackoff,
  createErrorResponse,
  formatErrorForLogging
} from "../utils/ai-error-handler";
import { getCircuitBreaker } from "../utils/circuit-breaker";

const router = Router();

// Circuit breakers for different OpenAI operations
const chatCircuitBreaker = getCircuitBreaker('openai-chat-standard', {
  failureThreshold: 5,
  recoveryTimeout: 60000,
  successThreshold: 2
});

const recipeCircuitBreaker = getCircuitBreaker('openai-recipe-generation', {
  failureThreshold: 3,
  recoveryTimeout: 90000, // Longer recovery time for recipe generation
  successThreshold: 1
});

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
router.get("/chat/messages", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const limit = parseInt(req.query.limit as string) || 50;

    const messages = await recipesStorage.getChatMessages(userId, limit);

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
  async (req: Request, res: Response) => {
    try {
      const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const validation = insertChatMessageSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({
          error: "Validation error",
          details: validation.error.errors
        });
      }

      const message = await recipesStorage.createChatMessage(userId, validation.data);
      
      res.json(message);
    } catch (error) {
      console.error("Error creating chat message:", error);
      res.status(500).json({ error: "Failed to create chat message" });
    }
  }
);

router.delete("/chat/messages", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    await recipesStorage.clearChatMessages(userId);
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
  async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    let assistantMessage = "";
    
    try {
      const { message, includeInventory  } = req.body || {};

      if (!message) {
        const error = new AIError(
          'Message is required',
          'VALIDATION_ERROR',
          400,
          false,
          'Please provide a message'
        );
        return res.status(400).json(createErrorResponse(error));
      }

      if (!openai) {
        const error = new AIError(
          'OpenAI API not configured',
          'CONFIG_ERROR',
          500,
          false,
          'AI service is not configured. Please contact support.'
        );
        return res.status(500).json(createErrorResponse(error));
      }

      // Persist user message to database for conversation history
      await recipesStorage.createChatMessage(userId, {
        role: "user",
        content: message,
      });

      // Periodic cleanup to prevent unbounded growth of chat history
      await cleanupOldMessagesForUser(userId);

      // Build inventory context when requested
      let inventoryContext = "";
      if (includeInventory) {
        const items = await recipesStorage.getFoodItems(userId);
        
        if (items.length > 0) {
          inventoryContext = `\n\nUser's current food inventory:\n${items
            .map((item: any) => `- ${item.name}: ${item.quantity} ${item.unit || ""} (${item.foodCategory || "uncategorized"})`)
            .join("\n")}`;
        }
      }

      // Fetch recent conversation history to maintain context
      const history = await recipesStorage.getChatMessages(userId, 10);

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

      // Execute through circuit breaker with retry logic
      const completion = await chatCircuitBreaker.execute(async () => {
        return await retryWithBackoff(async () => {
          return await openai.chat.completions.create({
            model: "gpt-4-turbo",
            messages,
            temperature: 0.7,
            max_tokens: 500,
          });
        }, {
          maxRetries: 3,
          initialDelay: 1000,
          maxDelay: 10000
        });
      });

      assistantMessage = completion.choices[0].message?.content || "";

      if (!assistantMessage) {
        throw new AIError(
          'Empty response from AI',
          'INVALID_RESPONSE',
          502,
          true,
          'AI returned an empty response. Please try again.'
        );
      }

      // Save assistant message
      const saved = await recipesStorage.createChatMessage(userId, {
        role: "assistant",
        content: assistantMessage,
      });

      // Log successful API usage
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
    } catch (error: Error | unknown) {
      // Log the error details
      console.error("Error in chat:", formatErrorForLogging(error));
      
      // Log failed API usage
      const aiError = error instanceof AIError ? error : handleOpenAIError(error);
      await batchedApiLogger.logApiUsage(userId, {
        apiName: "openai",
        endpoint: "chat",
        queryParams: `model=gpt-4-turbo,error=${aiError.code}`,
        statusCode: aiError.statusCode,
        success: false,
      }).catch(logError => {
        console.error('Failed to log API error:', logError);
      });
      
      // Send error response
      const errorResponse = createErrorResponse(error);
      res.status(aiError.statusCode).json(errorResponse);
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
  async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    try {
      const { prompt, 
        useInventory, 
        dietaryRestrictions = [],
        cuisine,
        mealType,
        difficulty = "medium",
        maxCookTime
       } = req.body || {};

      if (!openai) {
        const error = new AIError(
          'OpenAI API not configured',
          'CONFIG_ERROR',
          500,
          false,
          'AI service is not configured. Please contact support.'
        );
        return res.status(500).json(createErrorResponse(error));
      }

      // Build comprehensive context for AI recipe generation
      let context = "Generate a detailed recipe with the following requirements:\n";
      
      if (prompt) {
        context += `\nUser request: ${prompt}\n`;
      }

      // Include user's available ingredients for personalized recipes
      if (useInventory) {
        const items = await recipesStorage.getFoodItems(userId);
        
        if (items.length > 0) {
          context += `\nAvailable ingredients:\n${items
            .map((item: any) => `- ${item.name} (${item.quantity} available)`)
            .join("\n")}\n`;
        }
      }

      // Ensure recipe matches user's available kitchen equipment
      // Prevents suggesting recipes requiring tools the user doesn't own
      const userAppliances = await recipesStorage.getUserAppliances(userId);
      if (userAppliances && userAppliances.length > 0) {
        // Map user's appliance IDs to actual equipment names
        const applianceLibrary = await recipesStorage.getApplianceLibrary();
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

      // Execute through circuit breaker with retry logic
      const completion = await recipeCircuitBreaker.execute(async () => {
        return await retryWithBackoff(async () => {
          return await openai.chat.completions.create({
            model: "gpt-4-turbo",
            messages: [{ role: "user", content: context }],
            temperature: 0.8,
            max_tokens: 1000,
            response_format: { type: "json_object" },
          });
        }, {
          maxRetries: 2, // Fewer retries for expensive operations
          initialDelay: 2000,
          maxDelay: 15000
        });
      });

      const recipeContent = completion.choices[0].message?.content;
      if (!recipeContent) {
        throw new AIError(
          'Empty recipe response from AI',
          'INVALID_RESPONSE',
          502,
          true,
          'AI failed to generate a recipe. Please try again.'
        );
      }

      let recipeData;
      try {
        recipeData = JSON.parse(recipeContent);
      } catch {
        throw new AIError(
          'Invalid JSON in recipe response',
          'INVALID_RESPONSE',
          502,
          true,
          'AI returned invalid recipe format. Please try again.'
        );
      }

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
      const saved = await recipesStorage.createRecipe(userId, enrichedRecipeData);

      // Log API usage
      await batchedApiLogger.logApiUsage(userId, {
        apiName: "openai",
        endpoint: "recipes/generate",
        queryParams: `model=gpt-4-turbo`,
        statusCode: 200,
        success: true,
      });

      res.json(saved);
    } catch (error: Error | unknown) {
      // Log the error details
      console.error("Error generating recipe:", formatErrorForLogging(error));
      
      // Log failed API usage
      const aiError = error instanceof AIError ? error : handleOpenAIError(error);
      await batchedApiLogger.logApiUsage(userId, {
        apiName: "openai",
        endpoint: "recipes/generate",
        queryParams: `model=gpt-4-turbo,error=${aiError.code}`,
        statusCode: aiError.statusCode,
        success: false,
      }).catch(logError => {
        console.error('Failed to log API error:', logError);
      });
      
      // Send error response
      const errorResponse = createErrorResponse(error);
      res.status(aiError.statusCode).json(errorResponse);
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
router.post("/recipes", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const recipeData = req.body;
    
    // Convert query params to proper booleans
    const checkDuplicate = req.query.checkDuplicate !== 'false';
    const forceSave = req.query.forceSave === 'true';
    
    let similarityHash: string | undefined;
    let duplicateWarning: any = null;
    
    // Check for duplicates if requested (default: true)
    if (checkDuplicate && !forceSave) {
      try {
        const { DuplicateDetectionService } = await import("../services/duplicate-detection.service");
        const contentText = `${recipeData.title} ${recipeData.description || ''} ${recipeData.ingredients?.join(' ') || ''} ${recipeData.instructions?.join(' ') || ''}`;
        
        const duplicateCheck = await DuplicateDetectionService.checkForDuplicates(
          contentText,
          'recipe',
          userId
        );
        
        similarityHash = duplicateCheck.similarityHash;
        
        // If duplicates found with high similarity, return warning
        if (duplicateCheck.isDuplicate && !forceSave) {
          return res.status(409).json({
            isDuplicate: true,
            duplicates: duplicateCheck.duplicates,
            similarityHash: duplicateCheck.similarityHash,
            message: "Potential duplicate recipe detected. Review the similar recipes or force save with ?forceSave=true"
          });
        }
        
        // Store warning for response if duplicates found but under threshold
        if (duplicateCheck.duplicates.length > 0) {
          duplicateWarning = {
            count: duplicateCheck.duplicates.length,
            highestSimilarity: Math.max(...duplicateCheck.duplicates.map(d => d.similarity))
          };
        }
      } catch (error) {
        console.error("Failed to check for duplicates, continuing with save:", error);
        // Continue saving the recipe even if duplicate check fails
      }
    }
    
    // Add similarity hash to recipe data if generated
    if (similarityHash) {
      recipeData.similarityHash = similarityHash;
    }
    
    // Create the recipe
    const saved = await recipesStorage.createRecipe(userId, recipeData);
    
    // Store embedding for future duplicate detection (async, don't wait)
    if (saved.id) {
      const { DuplicateDetectionService } = await import("../services/duplicate-detection.service");
      DuplicateDetectionService.updateContentEmbedding(
        saved.id,
        'recipe',
        saved,
        userId
      ).catch(err => console.error("Failed to update recipe embedding:", err));
    }
    
    // Include duplicate warning in response if applicable
    const response: any = saved;
    if (duplicateWarning) {
      response.duplicateWarning = duplicateWarning;
    }
    
    res.json(response);
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
router.get("/recipes", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
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
    const userRecipes = await recipesStorage.getRecipes(userId, filters);

    res.json(userRecipes);
  } catch (error) {
    console.error("Error fetching recipes:", error);
    res.status(500).json({ error: "Failed to fetch recipes" });
  }
});

router.patch(
  "/recipes/:id",
  isAuthenticated,
  async (req: Request, res: Response) => {
    try {
      const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const recipeId = req.params.id;

      // Verify recipe belongs to user - optimized to fetch only the specific recipe
      const existing = await recipesStorage.getRecipe(userId, recipeId);

      if (!existing) {
        return res.status(404).json({ error: "Recipe not found" });
      }

      const updated = await recipesStorage.updateRecipe(recipeId, userId, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating recipe:", error);
      res.status(500).json({ error: "Failed to update recipe" });
    }
  }
);

router.delete("/recipes/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const recipeId = req.params.id;

    // Verify recipe belongs to user - optimized to fetch only the specific recipe
    const existing = await recipesStorage.getRecipe(userId, recipeId);

    if (!existing) {
      return res.status(404).json({ error: "Recipe not found" });
    }

    // Delete the recipe (cascading deletes will handle related meal plans)
    await recipesStorage.deleteRecipe(userId, recipeId);
    
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting recipe:", error);
    res.status(500).json({ error: "Failed to delete recipe" });
  }
});

export default router;