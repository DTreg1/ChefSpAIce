import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { 
  mealPlans, 
  shoppingListItems,
  insertMealPlanSchema, 
  insertShoppingListItemSchema,
  type MealPlan, 
  type ShoppingListItem 
} from "@shared/schema";
import { isAuthenticated } from "../replitAuth";
import { validateBody, validateQuery } from "../middleware";

const router = Router();

// Meal Plans endpoints
router.get("/meal-plans", isAuthenticated, async (req: any, res: Response) => {
  try {
    const userId = req.user.claims.sub;
    const { date, startDate, endDate, mealType } = req.query;

    // Get meal plans from storage with optional filters
    let plans = await storage.getMealPlans(userId);
    
    if (date) {
      plans = plans.filter((p: MealPlan) => p.date === date);
    }
    
    if (startDate && endDate) {
      plans = plans.filter((p: MealPlan) => 
        p.date >= startDate && p.date <= endDate
      );
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

router.post(
  "/meal-plans",
  isAuthenticated,
  async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const validation = insertMealPlanSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({
          error: "Validation error",
          details: validation.error.errors
        });
      }

      const mealPlan = await storage.createMealPlan({
        ...validation.data,
        userId,
      });
      
      res.json(mealPlan);
    } catch (error) {
      console.error("Error creating meal plan:", error);
      res.status(500).json({ error: "Failed to create meal plan" });
    }
  }
);

router.put(
  "/meal-plans/:id",
  isAuthenticated,
  async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const mealPlanId = req.params.id;
      
      // Verify meal plan belongs to user
      const plans = await storage.getMealPlans(userId);
      const existing = plans.find((p: MealPlan) => p.id === mealPlanId);
      
      if (!existing) {
        return res.status(404).json({ error: "Meal plan not found" });
      }
      
      const updated = await storage.updateMealPlan(mealPlanId, userId, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating meal plan:", error);
      res.status(500).json({ error: "Failed to update meal plan" });
    }
  }
);

router.delete("/meal-plans/:id", isAuthenticated, async (req: any, res: Response) => {
  try {
    const userId = req.user.claims.sub;
    const mealPlanId = req.params.id;
    
    // Verify meal plan belongs to user
    const plans = await storage.getMealPlans(userId);
    const existing = plans.find((p: MealPlan) => p.id === mealPlanId);
    
    if (!existing) {
      return res.status(404).json({ error: "Meal plan not found" });
    }
    
    await storage.deleteMealPlan(mealPlanId, userId);
    res.json({ message: "Meal plan deleted successfully" });
  } catch (error) {
    console.error("Error deleting meal plan:", error);
    res.status(500).json({ error: "Failed to delete meal plan" });
  }
});

// Shopping List endpoints
router.get("/shopping-list", isAuthenticated, async (req: any, res: Response) => {
  try {
    const userId = req.user.claims.sub;
    const items = await storage.getShoppingList(userId);
    
    // Group by category or recipe if needed
    const grouped = items.reduce((acc: any, item: ShoppingListItem) => {
      const key = item.recipeId || "manual";
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(item);
      return acc;
    }, {});
    
    res.json({
      items,
      grouped,
      totalItems: items.length,
      checkedItems: items.filter((i: ShoppingListItem) => i.isChecked).length,
    });
  } catch (error) {
    console.error("Error fetching shopping list:", error);
    res.status(500).json({ error: "Failed to fetch shopping list" });
  }
});

router.post(
  "/shopping-list",
  isAuthenticated,
  async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const validation = insertShoppingListItemSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({
          error: "Validation error",
          details: validation.error.errors
        });
      }

      const item = await storage.createShoppingListItem({
        ...validation.data,
        userId,
      });
      
      res.json(item);
    } catch (error) {
      console.error("Error adding to shopping list:", error);
      res.status(500).json({ error: "Failed to add to shopping list" });
    }
  }
);

// Batch add items from recipe
router.post(
  "/shopping-list/batch",
  isAuthenticated,
  async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { recipeId, ingredients } = req.body;
      
      if (!ingredients || !Array.isArray(ingredients)) {
        return res.status(400).json({ error: "Ingredients array is required" });
      }
      
      const items = await Promise.all(
        ingredients.map((ingredient: string) =>
          storage.createShoppingListItem({
            userId,
            ingredient,
            recipeId,
            isChecked: false,
          })
        )
      );
      
      res.json(items);
    } catch (error) {
      console.error("Error adding batch to shopping list:", error);
      res.status(500).json({ error: "Failed to add items to shopping list" });
    }
  }
);

// Toggle checked status
router.patch(
  "/shopping-list/:id/toggle",
  isAuthenticated,
  async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const itemId = req.params.id;
      
      // Get current item
      const items = await storage.getShoppingList(userId);
      const item = items.find((i: ShoppingListItem) => i.id === itemId);
      
      if (!item) {
        return res.status(404).json({ error: "Shopping list item not found" });
      }
      
      const updated = await storage.updateShoppingListItem(itemId, userId, {
        isChecked: !item.isChecked,
      });
      
      res.json(updated);
    } catch (error) {
      console.error("Error toggling shopping list item:", error);
      res.status(500).json({ error: "Failed to toggle shopping list item" });
    }
  }
);

router.delete("/shopping-list/:id", isAuthenticated, async (req: any, res: Response) => {
  try {
    const userId = req.user.claims.sub;
    const itemId = req.params.id;
    
    // Verify item belongs to user
    const items = await storage.getShoppingList(userId);
    const existing = items.find((i: ShoppingListItem) => i.id === itemId);
    
    if (!existing) {
      return res.status(404).json({ error: "Shopping list item not found" });
    }
    
    await storage.deleteShoppingListItem(itemId, userId);
    res.json({ message: "Item removed from shopping list" });
  } catch (error) {
    console.error("Error deleting shopping list item:", error);
    res.status(500).json({ error: "Failed to delete shopping list item" });
  }
});

// Clear completed items
router.delete("/shopping-list/clear-checked", isAuthenticated, async (req: any, res: Response) => {
  try {
    const userId = req.user.claims.sub;
    const items = await storage.getShoppingList(userId);
    
    const checkedItems = items.filter((i: ShoppingListItem) => i.isChecked);
    
    await Promise.all(
      checkedItems.map((item: ShoppingListItem) =>
        storage.deleteShoppingListItem(item.id, userId)
      )
    );
    
    res.json({ 
      message: `Cleared ${checkedItems.length} checked items from shopping list` 
    });
  } catch (error) {
    console.error("Error clearing checked items:", error);
    res.status(500).json({ error: "Failed to clear checked items" });
  }
});

export default router;