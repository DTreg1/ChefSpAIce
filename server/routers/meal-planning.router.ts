import { Router, Request, Response } from "express";
import { recipesStorage, inventoryStorage } from "../storage/index";
import { 
  insertMealPlanSchema, 
  insertShoppingItemSchema,
  type MealPlan, 
  type ShoppingItem 
} from "@shared/schema";
// Use OAuth authentication middleware
import { isAuthenticated } from "../middleware/oauth.middleware";

const router = Router();

// Meal Plans endpoints
router.get("/meal-plans", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const { date, startDate, endDate, mealType } = req.query;

    // Get meal plans from storage with filters applied at database level
    const plans = await recipesStorage.getMealPlans(
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

      const mealPlan = await recipesStorage.createMealPlan(
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
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const mealPlanId = req.params.id;
      
      // Verify meal plan belongs to user
      const plans = await recipesStorage.getMealPlans(userId);
      const existing = plans.find((p: MealPlan) => p.id === mealPlanId);
      
      if (!existing) {
        return res.status(404).json({ error: "Meal plan not found" });
      }
      
      const updated = await recipesStorage.updateMealPlan(mealPlanId, userId, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating meal plan:", error);
      res.status(500).json({ error: "Failed to update meal plan" });
    }
  }
);

router.delete("/meal-plans/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const mealPlanId = req.params.id;
    
    // Verify meal plan belongs to user
    const plans = await recipesStorage.getMealPlans(userId);
    const existing = plans.find((p: MealPlan) => p.id === mealPlanId);
    
    if (!existing) {
      return res.status(404).json({ error: "Meal plan not found" });
    }
    
    await recipesStorage.deleteMealPlan(mealPlanId, userId);
    res.json({ message: "Meal plan deleted successfully" });
  } catch (error) {
    console.error("Error deleting meal plan:", error);
    res.status(500).json({ error: "Failed to delete meal plan" });
  }
});

// Shopping List endpoints
router.get("/shopping-list", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    // Use the consolidated method that groups data at storage layer
    const shoppingData = await inventoryStorage.getGroupedShoppingItems(userId);
    res.json(shoppingData);
  } catch (error) {
    console.error("Error fetching shopping list:", error);
    res.status(500).json({ error: "Failed to fetch shopping list" });
  }
});

router.post(
  "/shopping-list",
  isAuthenticated,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const validation = insertShoppingItemSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({
          error: "Validation error",
          details: validation.error.errors
        });
      }

      const item = await inventoryStorage.createShoppingItem({
        ...validation.data,
        userId
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
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const { recipeId, ingredients  } = req.body || {};
      
      if (!ingredients || !Array.isArray(ingredients)) {
        return res.status(400).json({ error: "Ingredients array is required" });
      }
      
      const items = await Promise.all(
        ingredients.map((ingredient: string) =>
          inventoryStorage.createShoppingItem({
            userId,
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
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const itemId = req.params.id;
      
      // Get current item
      const items = await inventoryStorage.getShoppingItems(userId);
      const item = items.find((i: ShoppingItem) => i.id === itemId);
      
      if (!item) {
        return res.status(404).json({ error: "Shopping list item not found" });
      }
      
      const updated = await inventoryStorage.updateShoppingItem(userId, itemId, {
        isChecked: !item.isChecked,
      });
      
      res.json(updated);
    } catch (error) {
      console.error("Error toggling shopping list item:", error);
      res.status(500).json({ error: "Failed to toggle shopping list item" });
    }
  }
);

router.delete("/shopping-list/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const itemId = req.params.id;
    
    // Verify item belongs to user
    const items = await recipesStorage.getShoppingListItems(userId);
    const existing = items.find((i: ShoppingItem) => i.id === itemId);
    
    if (!existing) {
      return res.status(404).json({ error: "Shopping list item not found" });
    }
    
    await inventoryStorage.deleteShoppingItem(userId, itemId);
    res.json({ message: "Item removed from shopping list" });
  } catch (error) {
    console.error("Error deleting shopping list item:", error);
    res.status(500).json({ error: "Failed to delete shopping list item" });
  }
});

// Clear completed items
router.delete("/shopping-list/clear-checked", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const items = await recipesStorage.getShoppingListItems(userId);
    
    const checkedItems = items.filter((i: ShoppingItem) => i.isChecked);
    
    await Promise.all(
      checkedItems.map((item: ShoppingItem) =>
        inventoryStorage.deleteShoppingItem(userId, item.id)
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

/**
 * POST /shopping-list/generate-from-meal-plans
 * 
 * Intelligently generates a shopping list from planned meals for a date range.
 * Uses Server-Sent Events (SSE) to stream progress updates to the client.
 * 
 * Request Body:
 * - startDate: String (required) - ISO date string for start of date range
 * - endDate: String (required) - ISO date string for end of date range
 * 
 * Algorithm:
 * 1. Fetches all meal plans in the date range
 * 2. Extracts unique recipes from meal plans
 * 3. Collects all ingredients from these recipes
 * 4. Compares ingredients against current inventory
 * 5. Filters out items already in shopping list (deduplication)
 * 6. Adds only missing items to shopping list
 * 
 * Smart Features:
 * - Inventory Awareness: Doesn't add items already in user's inventory
 * - Deduplication: Prevents duplicate entries in shopping list
 * - Progress Streaming: Real-time progress updates via SSE
 * - Batch Database Writes: Processes 5 items at a time (lines 411-433)
 * - Simple Text Parsing: Strips leading numbers and common units via regex (lines 380-383)
 * 
 * Response Format: Server-Sent Events stream with progress updates
 * - Each event contains: { progress: 0-100, message: string, data?: object }
 * - Final event includes itemsAdded count and list of added items
 * 
 * Use Case: User plans week of meals, clicks "Generate Shopping List",
 *           and gets exactly what they need to buy (excluding pantry items)
 */
router.post("/shopping-list/generate-from-meal-plans", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const { startDate, endDate  } = req.body || {};
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: "Start date and end date are required" });
    }
    
    // Set up Server-Sent Events for real-time progress streaming
    // Allows frontend to display progress bar and status messages
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'  // Prevent nginx from buffering SSE
    });
    
    const sendProgress = (progress: number, message: string, data?: any) => {
      res.write(`data: ${JSON.stringify({ progress, message, data })}\n\n`);
    };
    
    sendProgress(0, "Starting shopping list generation...");
    
    // Step 1: Fetch meal plans for the specified date range
    sendProgress(10, "Fetching meal plans...");
    const mealPlans = await recipesStorage.getMealPlans(userId, startDate, endDate);
    
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
      recipeIds.map(id => recipesStorage.getRecipe(userId, id))
    );
    
    // Extract all ingredients from recipes
    const ingredientsByRecipe = new Map<string, string[]>();
    recipes.forEach(recipe => {
      if (recipe && recipe.ingredients) {
        ingredientsByRecipe.set(recipe.id, recipe.ingredients);
      }
    });
    
    sendProgress(40, "Analyzing ingredients...");
    
    // Step 4: Compare against current inventory
    // Items already in user's pantry don't need to be purchased
    const inventory = await recipesStorage.getFoodItems(userId);
    const inventoryNames = new Set(
      inventory.map(item => item.name.toLowerCase())
    );
    
    sendProgress(50, "Comparing with inventory...");
    
    // Step 5: Check existing shopping list to prevent duplicates
    // Don't add items user already plans to buy
    const existingShoppingItems = await recipesStorage.getShoppingListItems(userId);
    const existingItemNames = new Set(
      existingShoppingItems.map(item => item.ingredient.toLowerCase())
    );
    
    sendProgress(60, "Identifying missing items...");
    
    // Step 6: Identify missing ingredients needing purchase
    // Uses simple parsing to remove quantities/units for accurate matching
    const missingItems: { ingredient: string; recipeId: string }[] = [];
    
    ingredientsByRecipe.forEach((ingredients, recipeId) => {
      ingredients.forEach(ingredient => {
        // Basic ingredient normalization
        // Removes quantities (e.g., "2 cups") and units for better matching
        // Example: "2 cups flour" → "flour"
        const cleanIngredient = ingredient
          .replace(/^\d+[\s\d]*/, '') // Remove leading numbers and fractions
          .replace(/^(cup|cups|tbsp|tablespoon|tsp|teaspoon|oz|ounce|lb|pound|g|gram|kg|ml|l|liter)s?\s+/i, '') // Remove common units
          .trim();
        
        const ingredientLower = cleanIngredient.toLowerCase();
        
        // Add to missing items only if:
        // 1. Not already in user's inventory
        // 2. Not already in shopping list
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
    
    // Step 7: Persist missing items to shopping list
    // Uses batch processing for better performance with large lists
    sendProgress(80, "Adding items to shopping list...");
    
    const addedItems = [];
    const batchSize = 5;  // Process 5 items at a time to balance speed and database load
    
    // Process items in batches with progress updates
    for (let i = 0; i < missingItems.length; i += batchSize) {
      const batch = missingItems.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(item =>
          inventoryStorage.createShoppingItem({
            userId,
            ingredient: item.ingredient,
            recipeId: item.recipeId,
            isChecked: false  // Start unchecked for user to mark as purchased
          })
        )
      );
      addedItems.push(...batchResults);
      
      // Stream incremental progress to frontend
      const progressPercent = 80 + (20 * (i + batch.length) / missingItems.length);
      sendProgress(
        Math.min(progressPercent, 99),
        `Added ${Math.min(i + batch.length, missingItems.length)} of ${missingItems.length} items`
      );
    }
    
    // Final success message with summary
    sendProgress(100, "Shopping list generation complete!", {
      itemsAdded: addedItems.length,
      items: addedItems
    });
    
    res.end();  // Close SSE stream
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