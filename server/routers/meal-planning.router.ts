import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { 
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

    // Get meal plans from storage with filters applied at database level
    const plans = await storage.getMealPlans(
      userId, 
      startDate as string | undefined,
      endDate as string | undefined,
      mealType as string | undefined,
      date as string | undefined
    );
    
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

      const mealPlan = await storage.createMealPlan(
        userId,
        validation.data
      );
      
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
    // Use the consolidated method that groups data at storage layer
    const shoppingData = await storage.getGroupedShoppingListItems(userId);
    res.json(shoppingData);
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

      const item = await storage.createShoppingListItem(
        userId,
        validation.data
      );
      
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
          storage.createShoppingListItem(userId, {
            ingredient: ingredient,
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
      const items = await storage.getShoppingListItems(userId);
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
    const items = await storage.getShoppingListItems(userId);
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
    const items = await storage.getShoppingListItems(userId);
    
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

// Generate shopping list from meal plans
router.post("/shopping-list/generate-from-meal-plans", isAuthenticated, async (req: any, res: Response) => {
  try {
    const userId = req.user.claims.sub;
    const { startDate, endDate } = req.body;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: "Start date and end date are required" });
    }
    
    // Set up SSE for progress updates
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    });
    
    const sendProgress = (progress: number, message: string, data?: any) => {
      res.write(`data: ${JSON.stringify({ progress, message, data })}\n\n`);
    };
    
    sendProgress(0, "Starting shopping list generation...");
    
    // Step 1: Get meal plans for the date range
    sendProgress(10, "Fetching meal plans...");
    const mealPlans = await storage.getMealPlans(userId, startDate, endDate);
    
    if (mealPlans.length === 0) {
      sendProgress(100, "No meal plans found for the selected date range", { itemsAdded: 0 });
      res.end();
      return;
    }
    
    sendProgress(20, `Found ${mealPlans.length} meal plans`);
    
    // Step 2: Get unique recipe IDs from meal plans
    const recipeIds = Array.from(new Set(mealPlans
      .filter(plan => plan.recipeId)
      .map(plan => plan.recipeId)));
    
    if (recipeIds.length === 0) {
      sendProgress(100, "No recipes found in meal plans", { itemsAdded: 0 });
      res.end();
      return;
    }
    
    sendProgress(30, `Processing ${recipeIds.length} unique recipes`);
    
    // Step 3: Get recipe details and ingredients
    const recipes = await Promise.all(
      recipeIds.map(id => storage.getRecipe(userId, id))
    );
    
    // Extract all ingredients from recipes
    const ingredientsByRecipe = new Map<string, string[]>();
    recipes.forEach(recipe => {
      if (recipe && recipe.ingredients) {
        ingredientsByRecipe.set(recipe.id, recipe.ingredients);
      }
    });
    
    sendProgress(40, "Analyzing ingredients...");
    
    // Step 4: Get current inventory
    const inventory = await storage.getFoodItems(userId);
    const inventoryNames = new Set(
      inventory.map(item => item.name.toLowerCase())
    );
    
    sendProgress(50, "Comparing with inventory...");
    
    // Step 5: Get existing shopping list items to avoid duplicates
    const existingShoppingItems = await storage.getShoppingListItems(userId);
    const existingItemNames = new Set(
      existingShoppingItems.map(item => item.ingredient.toLowerCase())
    );
    
    sendProgress(60, "Identifying missing items...");
    
    // Step 6: Find missing ingredients
    const missingItems: { ingredient: string; recipeId: string }[] = [];
    
    ingredientsByRecipe.forEach((ingredients, recipeId) => {
      ingredients.forEach(ingredient => {
        // Simple ingredient parsing (remove quantities and units)
        const cleanIngredient = ingredient
          .replace(/^\d+[\s\/\d]*/, '') // Remove leading numbers
          .replace(/^(cup|cups|tbsp|tablespoon|tsp|teaspoon|oz|ounce|lb|pound|g|gram|kg|ml|l|liter)s?\s+/i, '') // Remove units
          .trim();
        
        const ingredientLower = cleanIngredient.toLowerCase();
        
        // Check if not in inventory and not already in shopping list
        if (!inventoryNames.has(ingredientLower) && 
            !existingItemNames.has(ingredientLower)) {
          missingItems.push({ ingredient: cleanIngredient, recipeId });
          existingItemNames.add(ingredientLower); // Prevent duplicates within this batch
        }
      });
    });
    
    sendProgress(70, `Found ${missingItems.length} missing items`);
    
    if (missingItems.length === 0) {
      sendProgress(100, "All ingredients are already in inventory or shopping list!", { itemsAdded: 0 });
      res.end();
      return;
    }
    
    // Step 7: Add missing items to shopping list
    sendProgress(80, "Adding items to shopping list...");
    
    const addedItems = [];
    const batchSize = 5;
    
    for (let i = 0; i < missingItems.length; i += batchSize) {
      const batch = missingItems.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(item =>
          storage.createShoppingListItem(userId, {
            ingredient: item.ingredient,
            recipeId: item.recipeId,
            isChecked: false
          })
        )
      );
      addedItems.push(...batchResults);
      
      const progressPercent = 80 + (20 * (i + batch.length) / missingItems.length);
      sendProgress(
        Math.min(progressPercent, 99),
        `Added ${Math.min(i + batch.length, missingItems.length)} of ${missingItems.length} items`
      );
    }
    
    sendProgress(100, "Shopping list generation complete!", {
      itemsAdded: addedItems.length,
      items: addedItems
    });
    
    res.end();
  } catch (error) {
    console.error("Error generating shopping list from meal plans:", error);
    res.write(`data: ${JSON.stringify({ 
      error: "Failed to generate shopping list",
      message: error instanceof Error ? error.message : "Unknown error"
    })}\n\n`);
    res.end();
  }
});

export default router;