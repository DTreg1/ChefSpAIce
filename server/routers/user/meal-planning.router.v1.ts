/**
 * RESTful Meal Planning & Shopping List Router v1
 * Implements standardized RESTful endpoints for meal planning and shopping list management
 */

import { Router, Request, Response } from "express";
import { z } from "zod";
import { storage } from "../../storage/index";
import { 
  insertMealPlanSchema, 
  insertShoppingItemSchema,
  type MealPlan,
  type ShoppingItem
} from "@shared/schema";
import { isAuthenticated } from "../../middleware/oauth.middleware";
import { getAuthenticatedUserId } from "../../types/request-helpers";
import { batchedApiLogger } from "../../utils/batchedApiLogger";
import { createApiResponse } from "../../config/api.config";
import { openai } from "../../integrations/openai";
import rateLimiters from "../../middleware/rateLimit";

const router = Router();

// ============================================
// MEAL PLANS RESOURCE
// ============================================

/**
 * GET /api/v1/meal-plans
 * List all meal plans with filtering and pagination
 */
router.get("/meal-plans", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json(createApiResponse.error("UNAUTHORIZED", "User not authenticated"));
    
    const {
      date,
      startDate,
      endDate,
      mealType,
      page = "1",
      limit = "20",
      sort = "date",
      order = "asc"
    } = req.query;
    
    // Get meal plans from storage
    const plans = await storage.user.recipes.getMealPlans(
      userId,
      startDate as string | undefined,
      endDate as string | undefined,
      mealType as string | undefined,
      date as string | undefined
    );
    
    // Apply additional filters if needed
    let filteredPlans = plans;
    
    // Sorting
    filteredPlans.sort((a: any, b: any) => {
      const modifier = order === "desc" ? -1 : 1;
      const sortField = String(sort);
      if (sortField === "date") {
        return ((a.date || "") > (b.date || "") ? 1 : -1) * modifier;
      }
      return (a[sortField] > b[sortField] ? 1 : -1) * modifier;
    });
    
    // Pagination
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedPlans = filteredPlans.slice(startIndex, endIndex);
    
    res.json(createApiResponse.paginated(
      paginatedPlans,
      pageNum,
      limitNum,
      filteredPlans.length
    ));
  } catch (error) {
    console.error("Error fetching meal plans:", error);
    res.status(500).json(createApiResponse.error("INTERNAL_ERROR", "Failed to fetch meal plans"));
  }
});

/**
 * GET /api/v1/meal-plans/:id
 * Get a specific meal plan
 */
router.get("/meal-plans/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json(createApiResponse.error("UNAUTHORIZED", "User not authenticated"));
    
    const mealPlanId = req.params.id;
    
    // Get all meal plans and find the specific one
    const plans = await storage.user.recipes.getMealPlans(userId);
    const mealPlan = plans.find((p: MealPlan) => p.id === mealPlanId);
    
    if (!mealPlan) {
      return res.status(404).json(createApiResponse.error("NOT_FOUND", "Meal plan not found"));
    }
    
    res.json(createApiResponse.success(mealPlan));
  } catch (error) {
    console.error("Error fetching meal plan:", error);
    res.status(500).json(createApiResponse.error("INTERNAL_ERROR", "Failed to fetch meal plan"));
  }
});

/**
 * POST /api/v1/meal-plans
 * Create a new meal plan
 */
router.post("/meal-plans", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json(createApiResponse.error("UNAUTHORIZED", "User not authenticated"));
    
    const validation = insertMealPlanSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json(createApiResponse.error(
        "VALIDATION_ERROR",
        "Invalid meal plan data",
        validation.error.errors
      ));
    }
    
    const mealPlan = await storage.user.recipes.createMealPlan(userId, validation.data);
    
    // Log creation
    await batchedApiLogger.log({
      type: "meal_plan_created",
      message: `Created meal plan for ${validation.data.date}`,
      userId,
      data: mealPlan,
    });
    
    res.status(201).json(createApiResponse.success(mealPlan, "Meal plan created successfully"));
  } catch (error) {
    console.error("Error creating meal plan:", error);
    res.status(500).json(createApiResponse.error("INTERNAL_ERROR", "Failed to create meal plan"));
  }
});

/**
 * PUT /api/v1/meal-plans/:id
 * Update a meal plan
 */
router.put("/meal-plans/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json(createApiResponse.error("UNAUTHORIZED", "User not authenticated"));
    
    const mealPlanId = req.params.id;
    
    // Verify meal plan belongs to user
    const plans = await storage.user.recipes.getMealPlans(userId);
    const existing = plans.find((p: MealPlan) => p.id === mealPlanId);
    
    if (!existing) {
      return res.status(404).json(createApiResponse.error("NOT_FOUND", "Meal plan not found"));
    }
    
    const updated = await storage.user.recipes.updateMealPlan(mealPlanId, userId, req.body);
    
    res.json(createApiResponse.success(updated, "Meal plan updated successfully"));
  } catch (error) {
    console.error("Error updating meal plan:", error);
    res.status(500).json(createApiResponse.error("INTERNAL_ERROR", "Failed to update meal plan"));
  }
});

/**
 * DELETE /api/v1/meal-plans/:id
 * Delete a meal plan
 */
router.delete("/meal-plans/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json(createApiResponse.error("UNAUTHORIZED", "User not authenticated"));
    
    const mealPlanId = req.params.id;
    
    // Verify meal plan belongs to user
    const plans = await storage.user.recipes.getMealPlans(userId);
    const existing = plans.find((p: MealPlan) => p.id === mealPlanId);
    
    if (!existing) {
      return res.status(404).json(createApiResponse.error("NOT_FOUND", "Meal plan not found"));
    }
    
    await storage.user.recipes.deleteMealPlan(mealPlanId, userId);
    
    res.json(createApiResponse.success(null, "Meal plan deleted successfully"));
  } catch (error) {
    console.error("Error deleting meal plan:", error);
    res.status(500).json(createApiResponse.error("INTERNAL_ERROR", "Failed to delete meal plan"));
  }
});

// ============================================
// SHOPPING LISTS RESOURCE
// ============================================

/**
 * GET /api/v1/shopping-lists
 * Get all shopping lists for the user
 */
router.get("/shopping-lists", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json(createApiResponse.error("UNAUTHORIZED", "User not authenticated"));
    
    const {
      page = "1",
      limit = "20"
    } = req.query;
    
    // Get shopping data from storage
    const shoppingData = await storage.user.inventory.getGroupedShoppingItems(userId);
    
    // Convert grouped data to list format for pagination
    const allLists = [{
      id: "primary",
      name: "Shopping List",
      userId,
      itemCount: shoppingData.total || 0,
      checkedCount: shoppingData.checked || 0,
      items: shoppingData.items || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }];
    
    // Pagination
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedLists = allLists.slice(startIndex, endIndex);
    
    res.json(createApiResponse.paginated(
      paginatedLists,
      pageNum,
      limitNum,
      allLists.length
    ));
  } catch (error) {
    console.error("Error fetching shopping lists:", error);
    res.status(500).json(createApiResponse.error("INTERNAL_ERROR", "Failed to fetch shopping lists"));
  }
});

/**
 * GET /api/v1/shopping-lists/:listId
 * Get a specific shopping list
 */
router.get("/shopping-lists/:listId", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json(createApiResponse.error("UNAUTHORIZED", "User not authenticated"));
    
    const listId = req.params.listId;
    
    // For now, we only support the primary list
    if (listId !== "primary") {
      return res.status(404).json(createApiResponse.error("NOT_FOUND", "Shopping list not found"));
    }
    
    const shoppingData = await storage.user.inventory.getGroupedShoppingItems(userId);
    
    const list = {
      id: "primary",
      name: "Shopping List",
      userId,
      itemCount: shoppingData.total || 0,
      checkedCount: shoppingData.checked || 0,
      items: shoppingData.items || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    res.json(createApiResponse.success(list));
  } catch (error) {
    console.error("Error fetching shopping list:", error);
    res.status(500).json(createApiResponse.error("INTERNAL_ERROR", "Failed to fetch shopping list"));
  }
});

/**
 * GET /api/v1/shopping-lists/:listId/items
 * Get all items in a shopping list
 */
router.get("/shopping-lists/:listId/items", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json(createApiResponse.error("UNAUTHORIZED", "User not authenticated"));
    
    const listId = req.params.listId;
    const {
      page = "1",
      limit = "50",
      checked
    } = req.query;
    
    // For now, we only support the primary list
    if (listId !== "primary") {
      return res.status(404).json(createApiResponse.error("NOT_FOUND", "Shopping list not found"));
    }
    
    const shoppingData = await storage.user.inventory.getGroupedShoppingItems(userId);
    let items = shoppingData.items || [];
    
    // Filter by checked status if specified
    if (checked !== undefined) {
      const isChecked = checked === "true";
      items = items.filter((item: ShoppingItem) => item.isChecked === isChecked);
    }
    
    // Pagination
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedItems = items.slice(startIndex, endIndex);
    
    res.json(createApiResponse.paginated(
      paginatedItems,
      pageNum,
      limitNum,
      items.length
    ));
  } catch (error) {
    console.error("Error fetching shopping list items:", error);
    res.status(500).json(createApiResponse.error("INTERNAL_ERROR", "Failed to fetch shopping list items"));
  }
});

/**
 * POST /api/v1/shopping-lists/:listId/items
 * Add an item to a shopping list
 */
router.post("/shopping-lists/:listId/items", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json(createApiResponse.error("UNAUTHORIZED", "User not authenticated"));
    
    const listId = req.params.listId;
    
    // For now, we only support the primary list
    if (listId !== "primary") {
      return res.status(404).json(createApiResponse.error("NOT_FOUND", "Shopping list not found"));
    }
    
    const validation = insertShoppingItemSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json(createApiResponse.error(
        "VALIDATION_ERROR",
        "Invalid shopping item data",
        validation.error.errors
      ));
    }
    
    const item = await storage.user.inventory.createShoppingItem({
      ...validation.data,
      userId
    });
    
    res.status(201).json(createApiResponse.success(item, "Item added to shopping list"));
  } catch (error) {
    console.error("Error adding shopping list item:", error);
    res.status(500).json(createApiResponse.error("INTERNAL_ERROR", "Failed to add item to shopping list"));
  }
});

/**
 * PUT /api/v1/shopping-lists/:listId/items/:itemId
 * Update a shopping list item
 */
router.put("/shopping-lists/:listId/items/:itemId", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json(createApiResponse.error("UNAUTHORIZED", "User not authenticated"));
    
    const { listId, itemId } = req.params;
    
    // For now, we only support the primary list
    if (listId !== "primary") {
      return res.status(404).json(createApiResponse.error("NOT_FOUND", "Shopping list not found"));
    }
    
    const updated = await storage.user.inventory.updateShoppingItem(itemId, userId, req.body);
    
    if (!updated) {
      return res.status(404).json(createApiResponse.error("NOT_FOUND", "Shopping list item not found"));
    }
    
    res.json(createApiResponse.success(updated, "Shopping list item updated"));
  } catch (error) {
    console.error("Error updating shopping list item:", error);
    res.status(500).json(createApiResponse.error("INTERNAL_ERROR", "Failed to update shopping list item"));
  }
});

/**
 * DELETE /api/v1/shopping-lists/:listId/items/:itemId
 * Remove an item from a shopping list
 */
router.delete("/shopping-lists/:listId/items/:itemId", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json(createApiResponse.error("UNAUTHORIZED", "User not authenticated"));
    
    const { listId, itemId } = req.params;
    
    // For now, we only support the primary list
    if (listId !== "primary") {
      return res.status(404).json(createApiResponse.error("NOT_FOUND", "Shopping list not found"));
    }
    
    await storage.user.inventory.deleteShoppingItem(itemId, userId);
    
    res.json(createApiResponse.success(null, "Shopping list item removed"));
  } catch (error) {
    console.error("Error removing shopping list item:", error);
    res.status(500).json(createApiResponse.error("INTERNAL_ERROR", "Failed to remove shopping list item"));
  }
});

/**
 * POST /api/v1/shopping-lists/generate
 * Generate shopping list from meal plans
 */
router.post("/shopping-lists/generate", 
  isAuthenticated, 
  rateLimiters.aiRateLimit,
  async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json(createApiResponse.error("UNAUTHORIZED", "User not authenticated"));
    
    const { startDate, endDate } = req.body;
    
    if (!startDate || !endDate) {
      return res.status(400).json(createApiResponse.error(
        "VALIDATION_ERROR", 
        "Start date and end date are required"
      ));
    }
    
    // Get meal plans for the date range
    const mealPlans = await storage.user.recipes.getMealPlans(userId, startDate, endDate);
    
    if (!mealPlans || mealPlans.length === 0) {
      return res.status(404).json(createApiResponse.error(
        "NOT_FOUND",
        "No meal plans found for the specified date range"
      ));
    }
    
    // Get recipes for all meal plans
    const recipeIds = mealPlans.map((plan: MealPlan) => plan.recipeId).filter(Boolean);
    const recipes = await Promise.all(
      recipeIds.map(id => storage.user.recipes.getRecipeById(userId, id))
    );
    
    // Generate shopping list using AI
    const prompt = `Generate a consolidated shopping list from the following recipes. 
    Group similar items and combine quantities where appropriate.
    Return a JSON array of ingredients with quantities.
    
    Recipes:
    ${recipes.map(r => `${r?.title}: ${r?.ingredients?.join(', ')}`).join('\n')}`;
    
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that generates shopping lists from recipes. Always return valid JSON."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3
      });
      
      const generatedList = JSON.parse(completion.choices[0].message.content || "[]");
      
      // Add generated items to shopping list
      const items = await Promise.all(
        generatedList.map((ingredient: string) =>
          storage.user.inventory.createShoppingItem({
            userId,
            ingredient,
            isChecked: false,
            metadata: { generatedFrom: "meal_plans", dateRange: { startDate, endDate } }
          })
        )
      );
      
      res.json(createApiResponse.success({
        itemsAdded: items.length,
        items,
        mealPlansUsed: mealPlans.length
      }, "Shopping list generated successfully"));
      
    } catch (aiError) {
      console.error("AI generation error:", aiError);
      // Fallback to basic extraction
      const allIngredients = recipes
        .filter(r => r?.ingredients)
        .flatMap(r => r.ingredients || []);
      
      const items = await Promise.all(
        allIngredients.map((ingredient: string) =>
          storage.user.inventory.createShoppingItem({
            userId,
            ingredient,
            isChecked: false,
            metadata: { generatedFrom: "meal_plans", dateRange: { startDate, endDate } }
          })
        )
      );
      
      res.json(createApiResponse.success({
        itemsAdded: items.length,
        items,
        mealPlansUsed: mealPlans.length,
        note: "Generated using basic extraction"
      }, "Shopping list generated successfully"));
    }
  } catch (error) {
    console.error("Error generating shopping list:", error);
    res.status(500).json(createApiResponse.error("INTERNAL_ERROR", "Failed to generate shopping list"));
  }
});

/**
 * DELETE /api/v1/shopping-lists/:listId
 * Clear a shopping list
 */
router.delete("/shopping-lists/:listId", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json(createApiResponse.error("UNAUTHORIZED", "User not authenticated"));
    
    const listId = req.params.listId;
    const { checkedOnly = false } = req.query;
    
    // For now, we only support the primary list
    if (listId !== "primary") {
      return res.status(404).json(createApiResponse.error("NOT_FOUND", "Shopping list not found"));
    }
    
    if (checkedOnly === "true") {
      await storage.user.inventory.clearCheckedShoppingItems(userId);
      res.json(createApiResponse.success(null, "Checked items cleared from shopping list"));
    } else {
      // Clear all items
      const items = await storage.user.inventory.getShoppingItems(userId);
      await Promise.all(
        items.map((item: ShoppingItem) => 
          storage.user.inventory.deleteShoppingItem(item.id, userId)
        )
      );
      res.json(createApiResponse.success(null, "Shopping list cleared"));
    }
  } catch (error) {
    console.error("Error clearing shopping list:", error);
    res.status(500).json(createApiResponse.error("INTERNAL_ERROR", "Failed to clear shopping list"));
  }
});

export default router;