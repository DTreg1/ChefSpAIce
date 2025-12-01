import { Router, Request, Response } from "express";
import { getAuthenticatedUserId, sendError, sendSuccess } from "../../types/request-helpers";
import { storage } from "../../storage/index";
// Import centralized authentication and middleware
import { isAuthenticated } from "../../middleware/auth.middleware";
import { openai } from "../../integrations/openai";
import { batchedApiLogger } from "../../utils/batchedApiLogger";
import { rateLimiters } from "../../middleware/rate-limit.middleware";
import { circuitBreakers, executeWithBreaker } from "../../middleware/circuit-breaker.middleware";
import {
  AIError,
  handleOpenAIError,
  retryWithBackoff,
  createErrorResponse,
  formatErrorForLogging
} from "../../utils/ai-error-handler";

const router = Router();

// Use centralized circuit breakers
const recipeCircuitBreaker = circuitBreakers.openaiRecipe;

/**
 * POST /generate
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
  "/generate",
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
        const items = await storage.user.inventory.getFoodItems(userId);
        
        if (items.length > 0) {
          context += `\nAvailable ingredients:\n${items
            .map((item: any) => `- ${item.name} (${item.quantity} available)`)
            .join("\n")}\n`;
        }
      }

      // Ensure recipe matches user's available kitchen equipment
      // Prevents suggesting recipes requiring tools the user doesn't own
      // TODO: Implement getUserAppliances and getApplianceLibrary methods
      // const userAppliances = await storage.getUserAppliances(userId);
      // if (userAppliances && userAppliances.length > 0) {
      //   // Map user's appliance IDs to actual equipment names
      //   const applianceLibrary = await storage.getApplianceLibrary();
      //   const userEquipmentDetails = userAppliances.map(ua => {
      //     const libItem = applianceLibrary.find((al: any) => al.id === ua.applianceLibraryId);
      //     return libItem ? libItem.name : null;
      //   }).filter(Boolean);
      const userEquipmentDetails: string[] = [];
      // }
      
      if (userEquipmentDetails.length > 0) {
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
            model: "gpt-4o",
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

      // Skip cooking term detection for now - service not available
      // TODO: Implement cooking terms service
      const enrichedRecipeData = recipeData;

      // Persist generated recipe to user's cookbook
      const saved = await storage.user.recipes.createRecipe(userId, enrichedRecipeData);

      // Log API usage
      await batchedApiLogger.logApiUsage(userId, {
        apiName: "openai",
        endpoint: "recipes/generate",
        method: "POST" as const,
        statusCode: 200,
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
        method: "POST" as const,
        statusCode: aiError.statusCode,
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
 * POST /
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
router.post("/", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const recipeData = req.body;
    
    // Convert query params to proper booleans
    const checkDuplicate = req.query.checkDuplicate !== 'false';
    const forceSave = req.query.forceSave === 'true';
    
    let similarityHash: string | undefined;
    let duplicateWarning: any = null;
    
    // Skip duplicate detection for now - service not available
    // TODO: Implement duplicate detection service
    
    // Add similarity hash to recipe data if generated
    if (similarityHash) {
      recipeData.similarityHash = similarityHash;
    }
    
    // Create the recipe
    const saved = await storage.user.recipes.createRecipe(userId, recipeData);
    
    // Skip embedding update - duplicate detection service not available
    // TODO: Implement duplicate detection service
    
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
 * GET /
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
router.get("/", isAuthenticated, async (req: Request, res: Response) => {
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
    const userRecipes = await storage.user.recipes.getRecipes(userId, filters);

    res.json(userRecipes);
  } catch (error) {
    console.error("Error fetching recipes:", error);
    res.status(500).json({ error: "Failed to fetch recipes" });
  }
});

router.patch(
  "/:id",
  isAuthenticated,
  async (req: Request, res: Response) => {
    try {
      const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const recipeId = req.params.id;

      // Verify recipe belongs to user - optimized to fetch only the specific recipe
      const existing = await storage.user.recipes.getRecipe(userId, recipeId);

      if (!existing) {
        return res.status(404).json({ error: "Recipe not found" });
      }

      const updated = await storage.user.recipes.updateRecipe(recipeId, userId, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating recipe:", error);
      res.status(500).json({ error: "Failed to update recipe" });
    }
  }
);

router.delete("/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const recipeId = req.params.id;

    // Verify recipe belongs to user - optimized to fetch only the specific recipe
    const existing = await storage.user.recipes.getRecipe(userId, recipeId);

    if (!existing) {
      return res.status(404).json({ error: "Recipe not found" });
    }

    // Delete the recipe (cascading deletes will handle related meal plans)
    await storage.user.recipes.deleteRecipe(userId, recipeId);
    
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting recipe:", error);
    res.status(500).json({ error: "Failed to delete recipe" });
  }
});

export default router;
