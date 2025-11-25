import { Router, Request, Response } from "express";
import { storage } from "../../storage/index";
import { type UserInventory as FoodItem } from "@shared/schema";
import { isAuthenticated } from "../../middleware/oauth.middleware";

/**
 * Shopping List Router
 * 
 * Handles all shopping list CRUD operations.
 * This router is mounted at both:
 * - /api/v1/inventory/shopping-list (primary path)
 * - /api/v1/shopping-list (legacy path for backward compatibility)
 */

const router = Router();

/**
 * GET /
 * GET /items
 * 
 * Retrieves all shopping list items for the user.
 * Returns: Shopping list items grouped by category
 */
const getShoppingListHandler = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const shoppingData = await storage.user.inventory.getGroupedShoppingItems(userId);
    const totalItems = shoppingData.items?.length || 0;
    const checkedItems = (shoppingData.items?.filter((i: any) => i.isPurchased) ?? []).length;
    
    res.json({
      ...shoppingData,
      totalItems,
      checkedItems,
    });
  } catch (error) {
    console.error("Error fetching shopping list:", error);
    res.status(500).json({ error: "Failed to fetch shopping list" });
  }
};

router.get("/", isAuthenticated, getShoppingListHandler);
router.get("/items", isAuthenticated, getShoppingListHandler);

/**
 * POST /
 * POST /items
 * 
 * Adds an item to the shopping list.
 */
const postShoppingListHandler = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const itemData = {
      ...req.body,
      name: req.body.name || req.body.ingredient,
      quantity: req.body.quantity || "1",
      isPurchased: false,
    };
    
    delete itemData.ingredient;
    delete itemData.isChecked;
    
    if (!itemData.name) {
      return res.status(400).json({ error: "Item name is required" });
    }
    
    const shoppingItem = {
      userId,
      name: itemData.name,
      quantity: String(itemData.quantity || "1"),
      unit: itemData.unit || undefined,
      category: itemData.category || undefined,
      isPurchased: false,
      recipeId: itemData.recipeId || undefined,
      recipeTitle: itemData.recipeTitle || undefined,
      notes: itemData.notes || undefined,
      addedFrom: itemData.addedFrom || undefined,
      price: itemData.price ? Number(itemData.price) : undefined,
    };
    
    const item = await storage.user.inventory.createShoppingItem(shoppingItem);
    res.json(item);
  } catch (error) {
    console.error("Error adding shopping list item:", error);
    res.status(500).json({ error: "Failed to add shopping list item" });
  }
};

router.post("/", isAuthenticated, postShoppingListHandler);
router.post("/items", isAuthenticated, postShoppingListHandler);

/**
 * PUT /items/:id
 * 
 * Updates a shopping list item.
 */
router.put("/items/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const itemId = req.params.id;
    const items = await storage.user.inventory.getShoppingItems(userId);
    const item = items.find((i: any) => i.id === itemId);
    
    if (!item) {
      return res.status(404).json({ error: "Shopping list item not found" });
    }
    
    const updates = Object.keys(req.body).length > 0 
      ? req.body 
      : { isPurchased: !item.isPurchased };
    
    const updated = await storage.user.inventory.updateShoppingItem(userId, itemId, updates);
    res.json(updated);
  } catch (error) {
    console.error("Error updating shopping list item:", error);
    res.status(500).json({ error: "Failed to update shopping list item" });
  }
});

/**
 * PATCH /:id/toggle
 * 
 * Toggles the checked status of a shopping list item.
 */
router.patch("/:id/toggle", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const itemId = req.params.id;
    const items = await storage.user.inventory.getShoppingItems(userId);
    const item = items.find((i: any) => i.id === itemId);
    
    if (!item) {
      return res.status(404).json({ error: "Shopping list item not found" });
    }
    
    const updated = await storage.user.inventory.updateShoppingItem(userId, itemId, {
      isPurchased: !item.isPurchased,
    });
    res.json(updated);
  } catch (error) {
    console.error("Error toggling shopping list item:", error);
    res.status(500).json({ error: "Failed to toggle shopping list item" });
  }
});

/**
 * DELETE /items/:id
 * DELETE /:id
 * 
 * Removes an item from the shopping list.
 */
const deleteItemHandler = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const itemId = req.params.id;
    const items = await storage.user.inventory.getShoppingItems(userId);
    const existing = items.find((item: any) => item.id === itemId);
    
    if (!existing) {
      return res.status(404).json({ error: "Shopping list item not found" });
    }
    
    await storage.user.inventory.deleteShoppingItem(userId, itemId);
    res.json({ message: "Item removed from shopping list" });
  } catch (error) {
    console.error("Error deleting shopping list item:", error);
    res.status(500).json({ error: "Failed to delete shopping list item" });
  }
};

router.delete("/items/:id", isAuthenticated, deleteItemHandler);
router.delete("/:id", isAuthenticated, deleteItemHandler);

/**
 * DELETE /clear-checked
 * 
 * Removes all checked items from the shopping list.
 */
router.delete("/clear-checked", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const items = await storage.user.inventory.getShoppingItems(userId);
    const checkedItems = items.filter((item: any) => item.isPurchased);
    
    for (const item of checkedItems) {
      await storage.user.inventory.deleteShoppingItem(userId, item.id);
    }
    
    res.json({ 
      message: `Cleared ${checkedItems.length} checked items from shopping list`,
      count: checkedItems.length
    });
  } catch (error) {
    console.error("Error clearing checked items:", error);
    res.status(500).json({ error: "Failed to clear checked items" });
  }
});

/**
 * POST /batch
 * 
 * Batch adds items to the shopping list.
 */
router.post("/batch", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const { recipeId, ingredients } = req.body || {};
    
    if (!ingredients || !Array.isArray(ingredients)) {
      return res.status(400).json({ error: "Ingredients array is required" });
    }
    
    const items = await Promise.all(
      ingredients.map((ingredient: string) =>
        storage.user.inventory.createShoppingItem({
          userId,
          name: ingredient,
          quantity: "1",
          recipeId,
          isPurchased: false,
        })
      )
    );
    
    res.json(items);
  } catch (error) {
    console.error("Error adding batch to shopping list:", error);
    res.status(500).json({ error: "Failed to add items to shopping list" });
  }
});

/**
 * POST /add-missing
 * 
 * Adds missing recipe ingredients to the shopping list.
 */
router.post("/add-missing", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const { recipeId, ingredients } = req.body;
    
    if (!ingredients || !Array.isArray(ingredients)) {
      return res.status(400).json({ error: "Ingredients array is required" });
    }
    
    const items = await Promise.all(
      ingredients.map((ingredient: string) =>
        storage.user.inventory.createShoppingItem({
          userId,
          name: ingredient,
          quantity: "1",
          recipeId,
          isPurchased: false,
        })
      )
    );
    
    res.json(items);
  } catch (error) {
    console.error("Error adding missing ingredients:", error);
    res.status(500).json({ error: "Failed to add missing ingredients" });
  }
});

/**
 * POST /generate-from-meal-plans
 * 
 * Intelligently generates a shopping list from planned meals for a date range.
 * Uses Server-Sent Events (SSE) to stream progress updates to the client.
 */
router.post("/generate-from-meal-plans", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const { startDate, endDate } = req.body || {};
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: "Start date and end date are required" });
    }
    
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
    
    sendProgress(10, "Fetching meal plans...");
    const mealPlans = await storage.user.recipes.getMealPlans(userId, startDate, endDate);
    
    if (mealPlans.length === 0) {
      sendProgress(100, "No meal plans found for the selected date range", { itemsAdded: 0 });
      res.end();
      return;
    }
    
    sendProgress(20, `Found ${mealPlans.length} meal plans`);
    
    const recipeIds = Array.from(new Set(mealPlans
      .filter(plan => plan.recipeId)
      .map(plan => plan.recipeId as string)));
    
    if (recipeIds.length === 0) {
      sendProgress(100, "No recipes found in meal plans", { itemsAdded: 0 });
      res.end();
      return;
    }
    
    sendProgress(30, `Processing ${recipeIds.length} unique recipes`);
    
    const recipes = await Promise.all(
      recipeIds.map(id => storage.user.recipes.getRecipe(userId, id))
    );
    
    const ingredientsByRecipe = new Map<string, string[]>();
    recipes.forEach(recipe => {
      if (recipe && recipe.ingredients) {
        ingredientsByRecipe.set(recipe.id, recipe.ingredients);
      }
    });
    
    sendProgress(40, "Analyzing ingredients...");
    
    const inventory = await storage.user.inventory.getFoodItems(userId);
    const inventoryNames = new Set(
      inventory.map((item: FoodItem) => item.name.toLowerCase())
    );
    
    sendProgress(50, "Comparing with inventory...");
    
    const existingShoppingItems = await storage.user.inventory.getShoppingItems(userId);
    const existingItemNames = new Set(
      existingShoppingItems.map((item: any) => (item.name || item.ingredient || '').toLowerCase())
    );
    
    sendProgress(60, "Identifying missing items...");
    
    const missingItems: { ingredient: string; recipeId: string }[] = [];
    
    ingredientsByRecipe.forEach((ingredients, recipeId) => {
      ingredients.forEach(ingredient => {
        const cleanIngredient = ingredient
          .replace(/^\d+[\s\d]*/, '')
          .replace(/^(cup|cups|tbsp|tablespoon|tsp|teaspoon|oz|ounce|lb|pound|g|gram|kg|ml|l|liter)s?\s+/i, '')
          .trim();
        
        const ingredientLower = cleanIngredient.toLowerCase();
        
        if (!inventoryNames.has(ingredientLower) && 
            !existingItemNames.has(ingredientLower)) {
          missingItems.push({ ingredient: cleanIngredient, recipeId });
          existingItemNames.add(ingredientLower);
        }
      });
    });
    
    sendProgress(70, `Found ${missingItems.length} missing items`);
    
    if (missingItems.length === 0) {
      sendProgress(100, "All ingredients are already in inventory or shopping list!", { itemsAdded: 0 });
      res.end();
      return;
    }
    
    sendProgress(80, "Adding items to shopping list...");
    
    const addedItems = [];
    const batchSize = 5;
    
    for (let i = 0; i < missingItems.length; i += batchSize) {
      const batch = missingItems.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(item =>
          storage.user.inventory.createShoppingItem({
            userId,
            name: item.ingredient,
            quantity: "1",
            recipeId: item.recipeId,
            isPurchased: false
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
