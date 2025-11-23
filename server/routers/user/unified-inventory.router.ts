import { Router, Request, Response } from "express";
// Use OAuth authentication middleware
import { isAuthenticated } from "../../middleware/oauth.middleware";
import { validateBody } from "../../middleware";
import { storage } from "../../storage/index";
import { insertUserInventorySchema, insertShoppingListItemSchema } from "@shared/schema";
import { z } from "zod";

const router = Router();

// Unified inventory endpoint with query params for different resources
// GET /api/inventory?type=items|shopping-list|locations&location=...&status=...

router.get("/inventory", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const { type = "items", location, category, status, page = 1, limit = 50 } = req.query;
    
    switch (type) {
      case "items": {
        // Get food items with optional filtering
        // Note: The new storage.user.inventory doesn't support location/category filtering yet
        // This will be implemented next
        const items = await storage.user.inventory.getFoodItems(userId);
        
        // Apply client-side filtering temporarily until domain storage supports it
        let filteredItems = items;
        if (location && location !== "all") {
          filteredItems = filteredItems.filter((item: any) => item.storageLocationId === location);
        }
        if (category) {
          filteredItems = filteredItems.filter((item: any) => item.foodCategory === category);
        }
        
        // Standardized pagination response
        const startIndex = (Number(page) - 1) * Number(limit);
        const endIndex = startIndex + Number(limit);
        const paginatedItems = filteredItems.slice(startIndex, endIndex);
        
        res.json({
          data: paginatedItems,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total: filteredItems.length,
            totalPages: Math.ceil(filteredItems.length / Number(limit))
          },
          type: "items"
        });
        break;
      }
      
      case "shopping-list": {
        // Get shopping list items with optional status filter
        const shoppingData = await storage.user.inventory.getGroupedShoppingItems(userId);
        let items = shoppingData.items || [];
        
        if (status === "checked") {
          items = items.filter((item: any) => item.isChecked);
        } else if (status === "unchecked") {
          items = items.filter((item: any) => !item.isChecked);
        }
        
        res.json({
          data: items,
          grouped: shoppingData.grouped || {},
          totalItems: shoppingData.totalItems || 0,
          checkedItems: shoppingData.checkedItems || 0,
          type: "shopping-list"
        });
        break;
      }
      
      case "locations": {
        // Get storage locations
        const locations = await storage.user.inventory.getStorageLocations(userId);
        res.json({
          data: locations,
          type: "locations"
        });
        break;
      }
      
      case "categories": {
        // Get food categories
        const categories = ["Dairy", "Meat", "Produce", "Grains", "Canned", 
                           "Frozen", "Condiments", "Beverages", "Snacks", "Other"];
        res.json({
          data: categories,
          type: "categories"
        });
        break;
      }
      
      default:
        res.status(400).json({ error: "Invalid inventory type" });
    }
  } catch (error) {
    console.error("Error fetching inventory:", error);
    res.status(500).json({ error: "Failed to fetch inventory data" });
  }
});

// Unified create endpoint with type in body
// POST /api/inventory
const inventoryItemSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("item"),
    data: insertUserInventorySchema
  }),
  z.object({
    type: z.literal("shopping-list"),
    data: insertShoppingListItemSchema
  }),
  z.object({
    type: z.literal("location"),
    data: z.object({
      name: z.string().min(1),
      icon: z.string()
    })
  })
]);

router.post("/inventory", isAuthenticated, validateBody(inventoryItemSchema), async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const { type, data  } = req.body || {};
    
    switch (type) {
      case "item": {
        // Verify storage location
        const locations = await storage.user.inventory.getStorageLocations(userId);
        const locationExists = locations.some((loc: any) => loc.id === data.storageLocationId);
        
        if (!locationExists) {
          return res.status(403).json({ error: "Invalid storage location" });
        }
        
        // Calculate expiration if needed
        let expirationDate = data.expirationDate;
        if (!expirationDate && data.category) {
          const categoryDefaults: Record<string, number> = {
            dairy: 7, meat: 3, produce: 5, grains: 30,
            canned: 365, frozen: 90, condiments: 180,
            beverages: 30, snacks: 60, other: 30
          };
          
          const daysToAdd = categoryDefaults[data.category?.toLowerCase()] || 30;
          const expDate = new Date();
          expDate.setDate(expDate.getDate() + daysToAdd);
          expirationDate = expDate.toISOString().split("T")[0];
        }
        
        const item = await storage.user.inventory.createFoodItem(userId, {
          ...data,
          expirationDate: expirationDate || new Date().toISOString().split("T")[0],
        });
        
        res.json({ data: item, type: "item" });
        break;
      }
      
      case "shopping-list": {
        const item = await storage.user.inventory.createShoppingItem({
          ...data,
          userId
        });
        res.json({ data: item, type: "shopping-list" });
        break;
      }
      
      case "location": {
        const newLocation = await storage.user.inventory.createStorageLocation(userId, data);
        res.json({ data: newLocation, type: "location" });
        break;
      }
      
      default:
        res.status(400).json({ error: "Invalid inventory type" });
    }
  } catch (error) {
    console.error("Error creating inventory item:", error);
    res.status(500).json({ error: "Failed to create inventory item" });
  }
});

// Batch operations endpoint
// POST /api/inventory/batch
router.post("/inventory/batch", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const { operation, type, items  } = req.body || {};
    
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: "Items must be an array" });
    }
    
    switch (operation) {
      case "create": {
        if (type === "shopping-list") {
          // Batch add to shopping list
          const { recipeId, ingredients  } = req.body || {};
          const createdItems = await Promise.all(
            ingredients.map((ingredient: string) =>
              storage.user.inventory.createShoppingItem({
                userId,
                ingredient: ingredient,
                recipeId,
                isChecked: false
              })
            )
          );
          res.json({ data: createdItems, type: "shopping-list" });
        } else {
          res.status(400).json({ error: "Batch create only supported for shopping-list" });
        }
        break;
      }
      
      case "delete": {
        if (type === "shopping-list" && req.body.filter === "checked") {
          // Clear checked items
          const items = await storage.user.inventory.getShoppingItems(userId);
          const checkedItems = items.filter((item: any) => item.isChecked);
          
          for (const item of checkedItems) {
            await storage.user.inventory.deleteShoppingItem(userId, item.id);
          }
          
          res.json({ 
            message: `Cleared ${checkedItems.length} checked items`,
            count: checkedItems.length 
          });
        } else {
          res.status(400).json({ error: "Batch delete only supported for checked shopping-list items" });
        }
        break;
      }
      
      default:
        res.status(400).json({ error: "Invalid batch operation" });
    }
  } catch (error) {
    console.error("Error in batch operation:", error);
    res.status(500).json({ error: "Failed to perform batch operation" });
  }
});

// Update operations
// PUT /api/inventory/:id
router.put("/inventory/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const itemId = req.params.id;
    const { type } = req.query;
    
    switch (type) {
      case "item": {
        // Verify item ownership
        const items = await storage.user.inventory.getFoodItems(userId);
        const existing = items.find((item: any) => item.id === itemId);
        
        if (!existing) {
          return res.status(404).json({ error: "Item not found" });
        }
        
        const updated = await storage.user.inventory.updateFoodItem(userId, itemId, req.body);
        res.json({ data: updated, type: "item" });
        break;
      }
      
      case "shopping-list": {
        // Toggle checked status
        const items = await storage.user.inventory.getShoppingListItems(userId);
        const item = items.find((i: any) => i.id === itemId);
        
        if (!item) {
          return res.status(404).json({ error: "Shopping list item not found" });
        }
        
        const updated = await storage.user.inventory.updateShoppingItem(
          userId,
          itemId,
          { isChecked: !item.isChecked }
        );
        res.json({ data: updated, type: "shopping-list" });
        break;
      }
      
      default:
        res.status(400).json({ error: "Invalid inventory type" });
    }
  } catch (error) {
    console.error("Error updating inventory item:", error);
    res.status(500).json({ error: "Failed to update item" });
  }
});

// Delete operations
// DELETE /api/inventory/:id
router.delete("/inventory/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const itemId = req.params.id;
    const { type } = req.query;
    
    switch (type) {
      case "item": {
        // Verify ownership
        const items = await storage.user.inventory.getFoodItems(userId);
        const existing = items.find((item: any) => item.id === itemId);
        
        if (!existing) {
          return res.status(404).json({ error: "Item not found" });
        }
        
        await storage.user.inventory.deleteFoodItem(userId, itemId);
        res.json({ message: "Item deleted successfully", type: "item" });
        break;
      }
      
      case "shopping-list": {
        // Verify ownership
        const items = await storage.user.inventory.getShoppingListItems(userId);
        const existing = items.find((item: any) => item.id === itemId);
        
        if (!existing) {
          return res.status(404).json({ error: "Shopping list item not found" });
        }
        
        await storage.user.inventory.deleteShoppingItem(userId, itemId);
        res.json({ message: "Shopping list item deleted", type: "shopping-list" });
        break;
      }
      
      default:
        res.status(400).json({ error: "Invalid inventory type" });
    }
  } catch (error) {
    console.error("Error deleting inventory item:", error);
    res.status(500).json({ error: "Failed to delete item" });
  }
});

// Special endpoint for adding missing recipe ingredients to shopping list
// POST /api/inventory/shopping-list/add-missing
router.post("/inventory/shopping-list/add-missing", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const { recipeId, ingredients  } = req.body || {};
    
    if (!ingredients || !Array.isArray(ingredients)) {
      return res.status(400).json({ error: "Ingredients array is required" });
    }
    
    const items = await Promise.all(
      ingredients.map((ingredient: string) =>
        storage.user.inventory.createShoppingItem({
          userId,
          ingredient: ingredient,
          recipeId,
          isChecked: false
        })
      )
    );
    
    res.json(items);
  } catch (error) {
    console.error("Error adding missing ingredients:", error);
    res.status(500).json({ error: "Failed to add missing ingredients" });
  }
});

export default router;