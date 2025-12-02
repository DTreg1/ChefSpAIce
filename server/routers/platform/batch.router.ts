import { Router, Request, Response } from "express";
import { asyncHandler } from "../../middleware/error.middleware";
import { storage } from "../../storage/index";
// Use OAuth authentication middleware
import { isAuthenticated } from "../../middleware/oauth.middleware";

const router = Router();

/**
 * Batch endpoint to handle multiple API requests in a single HTTP call
 * This reduces network overhead and improves performance with parallel processing
 */
router.post(
  "/batch",
  isAuthenticated,
  asyncHandler(async (req: Request, res: Response) => {
    const { requests } = req.body || {};
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!Array.isArray(requests)) {
      return res.status(400).json({ error: "Invalid batch request format" });
    }

    if (requests.length > 20) {
      return res
        .status(400)
        .json({ error: "Batch size exceeds maximum limit of 20" });
    }

    // Process all requests in parallel for better performance
    const responsePromises = requests.map(async (request) => {
      try {
        const result = await processRequest(request, userId);
        return { data: result };
      } catch (error: Error | unknown) {
        return {
          error: error instanceof Error ? error.message : "Request failed",
        };
      }
    });

    // Wait for all requests to complete
    const responses = await Promise.all(responsePromises);

    res.json({ responses });
  }),
);

/**
 * Process individual request within a batch
 * Optimized to use efficient queries and avoid loading unnecessary data
 */
async function processRequest(request: any, userId?: string): Promise<any> {
  const { endpoint, method = "GET", params } = request;

  // Map endpoints to storage methods

  // Food items endpoints
  if (endpoint === "/api/food-items" && method === "GET") {
    const page = params?.page || 1;
    const limit = params?.limit || 20;
    return storage.user.food.getFoodItemsPaginated(
      userId!,
      page,
      limit,
      params?.storageLocationId,
      params?.foodCategory,
      params?.sortBy || "expirationDate",
    );
  }

  if (endpoint === "/api/food-items/expiring" && method === "GET") {
    return storage.user.inventory.getExpiringItems(userId!, params?.days || 7);
  }

  // Recipes endpoints
  if (endpoint === "/api/recipes" && method === "GET") {
    const page = params?.page || 1;
    const limit = params?.limit || 20;
    const offset = (page - 1) * limit;
    return storage.user.recipes.getRecipesPaginated(userId!, limit, offset);
  }

  if (endpoint === "/api/recipes/suggested" && method === "GET") {
    // Optimized version - get suggested recipes directly from the database
    // This avoids loading all recipes and food items into memory
    const limit = params?.limit || 10;

    // Get user's available ingredients with categories
    const foodItemsResult = await storage.user.food.getFoodItemsPaginated(
      userId!,
      1,
      100, // Get up to 100 items for matching
      undefined,
      undefined,
      "name",
    );

    // PaginatedResponse uses 'items' property
    const foodItems =
      "items" in foodItemsResult ? (foodItemsResult.items as any[]) : [];
    if (!foodItems || !Array.isArray(foodItems) || foodItems.length === 0) {
      return []; // No ingredients, no recipes can be made
    }

    // Get recipes and check which can be made with available ingredients
    // Only fetch a reasonable number of recipes to check
    const recipesData = await storage.user.recipes.getRecipesPaginated(
      userId!,
      50, // limit
      0, // offset
    );

    if (!recipesData.recipes || recipesData.recipes.length === 0) {
      return [];
    }

    // Create a set of available ingredient names for faster lookup
    const availableIngredients = new Set(
      (foodItems as any[]).map((item: any) => item.name.toLowerCase()),
    );

    // Filter recipes that can be made with available ingredients
    const suggestedRecipes = recipesData.recipes
      .filter((recipe: any) => {
        // Check if we have all required ingredients
        if (!recipe.ingredients || !Array.isArray(recipe.ingredients)) {
          return false;
        }

        return recipe.ingredients.every((ingredient: any) => {
          const ingredientName =
            typeof ingredient === "string"
              ? ingredient.toLowerCase()
              : ingredient.name?.toLowerCase();

          if (!ingredientName) return false;

          // Check if we have this ingredient (partial match)
          return Array.from(availableIngredients).some(
            (available: unknown) =>
              (available as string).includes(ingredientName) ||
              ingredientName.includes(available as string),
          );
        });
      })
      .slice(0, limit); // Limit results

    return suggestedRecipes;
  }

  // Meal planning endpoints
  if (endpoint === "/api/meal-plans" && method === "GET") {
    return storage.user.recipes.getMealPlans(
      userId!,
      params?.startDate,
      params?.endDate,
    );
  }

  // Shopping list endpoints
  if (endpoint === "/api/shopping-list" && method === "GET") {
    return storage.user.inventory.getShoppingItems(userId!);
  }

  if (endpoint === "/api/shopping-list/grouped" && method === "GET") {
    return storage.user.inventory.getGroupedShoppingItems(userId!);
  }

  // User preferences
  if (endpoint === "/api/user/preferences" && method === "GET") {
    return storage.user.user.getUserPreferences(userId!);
  }

  // Analytics endpoints
  if (endpoint === "/api/analytics/stats" && method === "GET") {
    const period =
      params?.days === 1 ? "day" : params?.days === 30 ? "month" : "week";
    return storage.platform.analytics.getWebVitalsStats(params?.metric, period);
  }

  if (endpoint === "/api/analytics/api-health" && method === "GET") {
    const period =
      params?.days === 1 ? "day" : params?.days === 30 ? "month" : "week";
    return storage.platform.analytics.getApiUsageStats(userId, period);
  }

  // Chat messages endpoint
  if (endpoint === "/api/chat/messages" && method === "GET") {
    const messages = await storage.getChatMessages(
      userId!,
      params?.limit || 50,
    );
    return messages;
  }

  // Storage locations endpoint
  if (endpoint === "/api/storage-locations" && method === "GET") {
    return storage.user.food.getStorageLocations(userId!);
  }

  // Common food items endpoint
  if (endpoint === "/api/common-food-items" && method === "GET") {
    // Use a storage method that exists - return empty for now
    return [];
  }

  throw new Error(`Unsupported batch endpoint: ${method} ${endpoint}`);
}

export default router;
