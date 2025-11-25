import { Router, Request, Response } from "express";
import { storage } from "../../storage/index";
import { 
  insertMealPlanSchema, 
  type MealPlan
} from "@shared/schema";
import { isAuthenticated } from "../../middleware/oauth.middleware";

const router = Router();

/**
 * Meal Planning Router
 * 
 * Handles meal plan CRUD operations for scheduling recipes to specific dates and meal types.
 * Shopping list functionality has been consolidated into the inventory router.
 */

// ==================== MEAL PLAN ENDPOINTS ====================

/**
 * GET /meal-plans
 * 
 * Retrieves meal plans for the authenticated user with optional filtering.
 * 
 * Query Parameters:
 * - date: String (optional) - Filter by specific date
 * - startDate: String (optional) - Filter by date range start
 * - endDate: String (optional) - Filter by date range end
 * - mealType: String (optional) - Filter by meal type (breakfast, lunch, dinner, snack)
 */
router.get("/meal-plans", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const { date, startDate, endDate, mealType } = req.query;

    // Get meal plans with date range filtering
    let plans = await storage.user.recipes.getMealPlans(
      userId, 
      startDate as string | undefined,
      endDate as string | undefined
    );
    
    // Apply additional filters in application layer
    if (date) {
      plans = plans.filter((p: MealPlan) => p.date === date);
    }
    if (mealType) {
      plans = plans.filter((p: MealPlan) => p.mealType === mealType);
    }
    
    res.json(plans);
  } catch (error) {
    console.error("Error fetching meal plans:", error);
    res.status(500).json({ error: "Failed to fetch meal plans" });
  }
});

/**
 * POST /meal-plans
 * 
 * Creates a new meal plan entry.
 * 
 * Request Body (validated against insertMealPlanSchema):
 * - recipeId: String (required) - ID of the recipe to schedule
 * - date: String (required) - Date for the meal plan
 * - mealType: String (required) - Type of meal (breakfast, lunch, dinner, snack)
 * - servings: Number (optional) - Number of servings
 * - notes: String (optional) - Additional notes
 */
router.post(
  "/meal-plans",
  isAuthenticated,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const validation = insertMealPlanSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({
          error: "Validation error",
          details: validation.error.errors
        });
      }

      const mealPlan = await storage.user.recipes.createMealPlan({
        ...validation.data,
        userId
      });
      
      res.json(mealPlan);
    } catch (error) {
      console.error("Error creating meal plan:", error);
      res.status(500).json({ error: "Failed to create meal plan" });
    }
  }
);

/**
 * PUT /meal-plans/:id
 * 
 * Updates an existing meal plan.
 * 
 * Path Parameters:
 * - id: String - Meal plan ID
 * 
 * Request Body: Partial meal plan fields to update
 */
router.put(
  "/meal-plans/:id",
  isAuthenticated,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const mealPlanId = req.params.id;
      
      // Verify meal plan belongs to user
      const plans = await storage.user.recipes.getMealPlans(userId);
      const existing = plans.find((p: MealPlan) => p.id === mealPlanId);
      
      if (!existing) {
        return res.status(404).json({ error: "Meal plan not found" });
      }
      
      const updated = await storage.user.recipes.updateMealPlan(mealPlanId, userId, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating meal plan:", error);
      res.status(500).json({ error: "Failed to update meal plan" });
    }
  }
);

/**
 * DELETE /meal-plans/:id
 * 
 * Deletes a meal plan.
 * 
 * Path Parameters:
 * - id: String - Meal plan ID to delete
 */
router.delete("/meal-plans/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const mealPlanId = req.params.id;
    
    // Verify meal plan belongs to user
    const plans = await storage.user.recipes.getMealPlans(userId);
    const existing = plans.find((p: MealPlan) => p.id === mealPlanId);
    
    if (!existing) {
      return res.status(404).json({ error: "Meal plan not found" });
    }
    
    await storage.user.recipes.deleteMealPlan(mealPlanId, userId);
    res.json({ message: "Meal plan deleted successfully" });
  } catch (error) {
    console.error("Error deleting meal plan:", error);
    res.status(500).json({ error: "Failed to delete meal plan" });
  }
});

export default router;
