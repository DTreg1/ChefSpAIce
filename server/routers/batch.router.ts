import { Router } from "express";
import { asyncHandler } from "../middleware/error.middleware";
import { storage } from "../storage";
import { isAuthenticated } from "../replitAuth";

const router = Router();

/**
 * Batch endpoint to handle multiple API requests in a single HTTP call
 * This reduces network overhead and improves performance
 */
router.post("/batch", isAuthenticated, asyncHandler(async (req: any, res) => {
  const { requests } = req.body;
  const userId = req.user?.claims?.sub;
  
  if (!userId) {
    return res.status(401).json({ error: "Authentication required" });
  }
  
  if (!Array.isArray(requests)) {
    return res.status(400).json({ error: "Invalid batch request format" });
  }
  
  if (requests.length > 20) {
    return res.status(400).json({ error: "Batch size exceeds maximum limit of 20" });
  }
  const responses: any[] = [];
  
  // Process each request in the batch
  for (const request of requests) {
    try {
      const result = await processRequest(request, userId);
      responses.push({ data: result });
    } catch (error: any) {
      responses.push({ error: error.message || "Request failed" });
    }
  }
  
  res.json({ responses });
}));

/**
 * Process individual request within a batch
 */
async function processRequest(request: any, userId?: string): Promise<any> {
  const { endpoint, method = 'GET', params, body } = request;
  
  // Map endpoints to storage methods
  // This is a simplified version - in production you'd have more comprehensive mapping
  
  // Food items endpoints
  if (endpoint === '/api/food-items' && method === 'GET') {
    return storage.getFoodItemsPaginated(
      userId!,
      params?.page || 1,
      params?.limit || 20,
      params?.search,
      params?.category
    );
  }
  
  if (endpoint === '/api/food-items/expiring' && method === 'GET') {
    return storage.getExpiringItems(userId!, params?.days || 7);
  }
  
  // Recipes endpoints
  if (endpoint === '/api/recipes' && method === 'GET') {
    return storage.getRecipesPaginated(
      userId!,
      params?.page || 1,
      params?.limit || 20
    );
  }
  
  if (endpoint === '/api/recipes/suggested' && method === 'GET') {
    const foodItems = await storage.getFoodItems(userId!);
    const recipes = await storage.getRecipes(userId!);
    // Return recipes that can be made with available ingredients
    return recipes.filter(recipe => 
      recipe.ingredients.every(ingredient => 
        foodItems.some(item => 
          item.name.toLowerCase().includes(ingredient.toLowerCase())
        )
      )
    );
  }
  
  // Meal planning endpoints
  if (endpoint === '/api/meal-plans' && method === 'GET') {
    return storage.getMealPlans(
      userId!,
      params?.startDate,
      params?.endDate,
      params?.mealType
    );
  }
  
  // Shopping list endpoints
  if (endpoint === '/api/shopping-list' && method === 'GET') {
    return storage.getShoppingListItems(userId!);
  }
  
  if (endpoint === '/api/shopping-list/grouped' && method === 'GET') {
    return storage.getGroupedShoppingListItems(userId!);
  }
  
  // User preferences
  if (endpoint === '/api/user/preferences' && method === 'GET') {
    return storage.getUserPreferences(userId!);
  }
  
  // Analytics endpoints
  if (endpoint === '/api/analytics/stats' && method === 'GET') {
    return storage.getWebVitalsStats(params?.metric, params?.days || 7);
  }
  
  if (endpoint === '/api/analytics/api-health' && method === 'GET') {
    return storage.getApiUsageStats(userId!, '', params?.days || 7);
  }
  
  throw new Error(`Unsupported batch endpoint: ${method} ${endpoint}`);
}

export default router;