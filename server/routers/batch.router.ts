import { Router, Request as ExpressRequest, Response as ExpressResponse } from "express";
import { asyncHandler } from "../middleware/error.middleware";
import { inventoryStorage, recipesStorage, userAuthStorage, chatStorage, analyticsStorage, foodStorage } from "../storage/index";
// Use OAuth authentication middleware
import { isAuthenticated } from "../middleware/auth.middleware";

const router = Router();

/**
 * Batch endpoint to handle multiple API requests in a single HTTP call
 * This reduces network overhead and improves performance with parallel processing
 */
router.post("/batch", isAuthenticated, asyncHandler(async (req: ExpressRequest<any, any, any, any>, res) => {
  const { requests  } = req.body || {};
  const userId = (req.user as any)?.id;
  
  if (!userId) {
    return res.status(401).json({ error: "Authentication required" });
  }
  
  if (!Array.isArray(requests)) {
    return res.status(400).json({ error: "Invalid batch request format" });
  }
  
  if (requests.length > 20) {
    return res.status(400).json({ error: "Batch size exceeds maximum limit of 20" });
  }
  
  // Process all requests in parallel for better performance
  const responsePromises = requests.map(async (request) => {
    try {
      const result = await processRequest(request, userId);
      return { data: result };
    } catch (error: Error | unknown) {
      return { error: error instanceof Error ? error.message : "Request failed" };
    }
  });
  
  // Wait for all requests to complete
  const responses = await Promise.all(responsePromises);
  
  res.json({ responses });
}));

/**
 * Process individual request within a batch
 * Optimized to use efficient queries and avoid loading unnecessary data
 */
async function processRequest(request: any, userId?: string): Promise<any> {
  const { endpoint, method = 'GET', params } = request;
  
  // Map endpoints to storage methods
  
  // Food items endpoints
  if (endpoint === '/api/food-items' && method === 'GET') {
    return inventoryStorage.getFoodItemsPaginated(
      userId!,
      params?.page || 1,
      params?.limit || 20,
      params?.storageLocationId,
      params?.sortBy
    );
  }
  
  if (endpoint === '/api/food-items/expiring' && method === 'GET') {
    return inventoryStorage.getExpiringItems(userId!, params?.days || 7);
  }
  
  // Recipes endpoints
  if (endpoint === '/api/recipes' && method === 'GET') {
    return recipesStorage.getRecipesPaginated(
      userId!,
      params?.page || 1,
      params?.limit || 20
    );
  }
  
  if (endpoint === '/api/recipes/suggested' && method === 'GET') {
    // Optimized version - get suggested recipes directly from the database
    // This avoids loading all recipes and food items into memory
    const limit = params?.limit || 10;
    
    // Get user's available ingredients with categories
    const foodItems = await inventoryStorage.getFoodItemsPaginated(
      userId!,
      1,
      100, // Get up to 100 items for matching
      undefined,
      'name'
    );
    
    if (!foodItems.data || foodItems.data.length === 0) {
      return []; // No ingredients, no recipes can be made
    }
    
    // Get recipes and check which can be made with available ingredients
    // Only fetch a reasonable number of recipes to check
    const recipesData = await recipesStorage.getRecipesPaginated(
      userId!,
      1,
      50 // Check up to 50 recipes
    );
    
    if (!recipesData.data || recipesData.data.length === 0) {
      return [];
    }
    
    // Create a set of available ingredient names for faster lookup
    const availableIngredients = new Set(
      foodItems.data.map((item: any) => item.name.toLowerCase())
    );
    
    // Filter recipes that can be made with available ingredients
    const suggestedRecipes = recipesData.data
      .filter(recipe => {
        // Check if we have all required ingredients
        if (!recipe.ingredients || !Array.isArray(recipe.ingredients)) {
          return false;
        }
        
        return recipe.ingredients.every((ingredient: any) => {
          const ingredientName = typeof ingredient === 'string' 
            ? ingredient.toLowerCase() 
            : ingredient.name?.toLowerCase();
          
          if (!ingredientName) return false;
          
          // Check if we have this ingredient (partial match)
          return Array.from(availableIngredients).some(available => 
            available.includes(ingredientName) || ingredientName.includes(available)
          );
        });
      })
      .slice(0, limit); // Limit results
    
    return suggestedRecipes;
  }
  
  // Meal planning endpoints
  if (endpoint === '/api/meal-plans' && method === 'GET') {
    return recipesStorage.getMealPlans(
      userId!,
      params?.startDate,
      params?.endDate,
      params?.mealType
    );
  }
  
  // Shopping list endpoints
  if (endpoint === '/api/shopping-list' && method === 'GET') {
    return inventoryStorage.getShoppingItems(userId!);
  }
  
  if (endpoint === '/api/shopping-list/grouped' && method === 'GET') {
    return inventoryStorage.getGroupedShoppingItems(userId!);
  }
  
  // User preferences
  if (endpoint === '/api/user/preferences' && method === 'GET') {
    return userAuthStorage.getUserPreferences(userId!);
  }
  
  // Analytics endpoints
  if (endpoint === '/api/analytics/stats' && method === 'GET') {
    return storage.getWebVitalsStats(params?.metric, params?.days || 7);
  }
  
  if (endpoint === '/api/analytics/api-health' && method === 'GET') {
    return storage.getApiUsageStats(userId!, '', params?.days || 7);
  }
  
  // Chat messages endpoint
  if (endpoint === '/api/chat/messages' && method === 'GET') {
    const messages = await storage.getChatMessages(userId!, params?.limit || 50);
    return messages;
  }
  
  // Storage locations endpoint  
  if (endpoint === '/api/storage-locations' && method === 'GET') {
    return foodStorage.getStorageLocations(userId!);
  }
  
  // Common food items endpoint
  if (endpoint === '/api/common-food-items' && method === 'GET') {
    return storage.getOnboardingInventory();
  }
  
  throw new Error(`Unsupported batch endpoint: ${method} ${endpoint}`);
}

export default router;