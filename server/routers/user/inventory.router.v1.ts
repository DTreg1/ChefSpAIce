/**
 * RESTful Inventory Router v1
 * Implements standardized RESTful endpoints for inventory management
 */

import { Router, Request, Response } from "express";
import { z } from "zod";
import { storage } from "../../storage/index";
import { insertUserInventorySchema, insertShoppingListItemSchema, type UserInventory as FoodItem } from "@shared/schema";
import { isAuthenticated } from "../../middleware/oauth.middleware";
import { batchedApiLogger } from "../../utils/batchedApiLogger";
import { validateBody } from "../../middleware";
import axios from "axios";
import { openai } from "../../integrations/openai";
import rateLimiters from "../../middleware/rateLimit";
import { searchUSDAFoods, getFoodByFdcId } from "../../integrations/usda";
import { searchUSDAFoodsCached } from "../../utils/usdaCache";
import { createApiResponse, PaginatedResponse } from "../../config/api.config";

const router = Router();

// ============================================
// INVENTORIES RESOURCE
// ============================================

/**
 * GET /api/v1/inventories
 * List all inventory items with filtering and pagination
 */
router.get("/inventories", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json(createApiResponse.error("UNAUTHORIZED", "User not authenticated"));
    
    const { 
      location, 
      category, 
      view, 
      page = "1", 
      limit = "50",
      sort = "name",
      order = "asc"
    } = req.query;
    
    // Fetch items from storage
    const items = await storage.user.inventory.getFoodItems(
      userId, 
      view as "all" | "expiring" | "expired" | undefined
    );
    
    // Apply filters
    let filteredItems = items;
    
    // Location filter (using storageLocationId for now)
    // TODO: Map storageLocationId to location name
    if (location && location !== "all") {
      filteredItems = filteredItems.filter(item => item.storageLocationId === location);
    }
    
    // Category filter
    if (category) {
      filteredItems = filteredItems.filter((item: any) => item.category === category);
    }
    
    // View-based filtering
    if (view === "expiring") {
      const today = new Date();
      const sevenDaysFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      filteredItems = filteredItems.filter((item: FoodItem) => {
        if (!item.expirationDate) return false;
        const expDate = new Date(item.expirationDate);
        return expDate >= today && expDate <= sevenDaysFromNow;
      });
    }
    
    // Sorting
    filteredItems.sort((a: any, b: any) => {
      const modifier = order === "desc" ? -1 : 1;
      const sortField = String(sort);
      if (sortField === "expirationDate") {
        return ((a[sortField] || "") > (b[sortField] || "") ? 1 : -1) * modifier;
      }
      return (a[sortField] > b[sortField] ? 1 : -1) * modifier;
    });
    
    // Pagination
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedItems = filteredItems.slice(startIndex, endIndex);
    
    res.json(createApiResponse.paginated(
      paginatedItems,
      pageNum,
      limitNum,
      filteredItems.length
    ));
  } catch (error) {
    console.error("Error fetching inventory:", error);
    res.status(500).json(createApiResponse.error("INTERNAL_ERROR", "Failed to fetch inventory data"));
  }
});

/**
 * GET /api/v1/inventories/:id
 * Get a specific inventory item
 */
router.get("/inventories/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json(createApiResponse.error("UNAUTHORIZED", "User not authenticated"));
    
    const itemId = req.params.id;
    const item = await storage.user.inventory.getFoodItem(userId, itemId);
    
    if (!item) {
      return res.status(404).json(createApiResponse.error("NOT_FOUND", "Inventory item not found"));
    }
    
    res.json(createApiResponse.success(item));
  } catch (error) {
    console.error("Error fetching inventory item:", error);
    res.status(500).json(createApiResponse.error("INTERNAL_ERROR", "Failed to fetch inventory item"));
  }
});

/**
 * POST /api/v1/inventories
 * Create a new inventory item
 */
router.post("/inventories", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json(createApiResponse.error("UNAUTHORIZED", "User not authenticated"));
    
    const validation = insertUserInventorySchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json(createApiResponse.error(
        "VALIDATION_ERROR",
        "Invalid inventory item data",
        validation.error.errors
      ));
    }
    
    const newItem = await storage.user.inventory.createFoodItem(userId, validation.data);
    
    // Log creation
    await batchedApiLogger.log({
      type: "item_added",
      message: `Added ${validation.data.name} to inventory`,
      userId,
      data: newItem,
    });
    
    res.status(201).json(createApiResponse.success(newItem, "Inventory item created successfully"));
  } catch (error) {
    console.error("Error creating inventory item:", error);
    res.status(500).json(createApiResponse.error("INTERNAL_ERROR", "Failed to create inventory item"));
  }
});

/**
 * PUT /api/v1/inventories/:id
 * Update an inventory item
 */
router.put("/inventories/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json(createApiResponse.error("UNAUTHORIZED", "User not authenticated"));
    
    const itemId = req.params.id;
    const validation = insertUserInventorySchema.partial().safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json(createApiResponse.error(
        "VALIDATION_ERROR",
        "Invalid update data",
        validation.error.errors
      ));
    }
    
    const updatedItem = await storage.user.inventory.updateFoodItem(userId, itemId, validation.data);
    
    if (!updatedItem) {
      return res.status(404).json(createApiResponse.error("NOT_FOUND", "Inventory item not found"));
    }
    
    res.json(createApiResponse.success(updatedItem, "Inventory item updated successfully"));
  } catch (error) {
    console.error("Error updating inventory item:", error);
    res.status(500).json(createApiResponse.error("INTERNAL_ERROR", "Failed to update inventory item"));
  }
});

/**
 * DELETE /api/v1/inventories/:id
 * Delete an inventory item
 */
router.delete("/inventories/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json(createApiResponse.error("UNAUTHORIZED", "User not authenticated"));
    
    const itemId = req.params.id;
    await storage.user.inventory.deleteFoodItem(userId, itemId);
    
    res.json(createApiResponse.success({ id: itemId }, "Inventory item deleted successfully"));
  } catch (error) {
    console.error("Error deleting inventory item:", error);
    res.status(500).json(createApiResponse.error("INTERNAL_ERROR", "Failed to delete inventory item"));
  }
});

/**
 * POST /api/v1/inventories/batch
 * Batch operations for inventory items
 */
router.post("/inventories/batch", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json(createApiResponse.error("UNAUTHORIZED", "User not authenticated"));
    
    const { operations, items } = req.body;
    
    if (!operations || !Array.isArray(operations)) {
      return res.status(400).json(createApiResponse.error(
        "VALIDATION_ERROR",
        "Operations array is required"
      ));
    }
    
    const results = [];
    
    for (const op of operations) {
      try {
        switch (op.type) {
          case "create":
            const created = await storage.user.inventory.createFoodItem(userId, op.data);
            results.push({ operation: "create", status: "success", data: created });
            break;
          case "update":
            const updated = await storage.user.inventory.updateFoodItem(userId, op.id, op.data);
            results.push({ operation: "update", status: "success", data: updated });
            break;
          case "delete":
            await storage.user.inventory.deleteFoodItem(userId, op.id);
            results.push({ operation: "delete", status: "success", id: op.id });
            break;
          default:
            results.push({ operation: op.type, status: "error", message: "Unknown operation type" });
        }
      } catch (error: any) {
        results.push({ operation: op.type, status: "error", message: error?.message || String(error) });
      }
    }
    
    res.json(createApiResponse.success(results, "Batch operations completed"));
  } catch (error) {
    console.error("Error in batch operations:", error);
    res.status(500).json(createApiResponse.error("INTERNAL_ERROR", "Failed to process batch operations"));
  }
});

/**
 * POST /api/v1/inventories/enrichment
 * Enrich food items with nutritional data
 */
router.post("/inventories/enrichment", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json(createApiResponse.error("UNAUTHORIZED", "User not authenticated"));
    
    const { name, quantity, unit } = req.body;
    
    if (!name) {
      return res.status(400).json(createApiResponse.error("VALIDATION_ERROR", "Food name is required"));
    }
    
    // Search for nutritional data
    const searchResults = await searchUSDAFoodsCached(name);
    
    if (!searchResults || !searchResults.foods || searchResults.foods.length === 0) {
      return res.status(404).json(createApiResponse.error("NOT_FOUND", "No nutritional data found for this food"));
    }
    
    const foodData = searchResults.foods[0];
    const enrichedData = {
      name: foodData.description,
      fdcId: foodData.fdcId,
      nutrients: foodData.nutrition,
      category: foodData.foodCategory,
      quantity: quantity || 1,
      unit: unit || foodData.nutrition?.servingUnit || "piece"
    };
    
    res.json(createApiResponse.success(enrichedData, "Food item enriched with nutritional data"));
  } catch (error) {
    console.error("Error enriching food item:", error);
    res.status(500).json(createApiResponse.error("INTERNAL_ERROR", "Failed to enrich food item"));
  }
});

// ============================================
// STORAGE LOCATIONS RESOURCE
// ============================================

/**
 * GET /api/v1/storage-locations
 * List all storage locations
 */
router.get("/storage-locations", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json(createApiResponse.error("UNAUTHORIZED", "User not authenticated"));
    
    const locations = await storage.user.inventory.getStorageLocations(userId);
    res.json(createApiResponse.success(locations));
  } catch (error) {
    console.error("Error fetching storage locations:", error);
    res.status(500).json(createApiResponse.error("INTERNAL_ERROR", "Failed to fetch storage locations"));
  }
});

/**
 * POST /api/v1/storage-locations
 * Create a new storage location
 */
const storageLocationSchema = z.object({
  name: z.string().min(1),
  icon: z.string(),
});

router.post(
  "/storage-locations",
  isAuthenticated,
  validateBody(storageLocationSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json(createApiResponse.error("UNAUTHORIZED", "User not authenticated"));
      
      const newLocation = await storage.user.inventory.createStorageLocation(userId, req.body);
      res.status(201).json(createApiResponse.success(newLocation, "Storage location created successfully"));
    } catch (error) {
      console.error("Error creating storage location:", error);
      res.status(500).json(createApiResponse.error("INTERNAL_ERROR", "Failed to create storage location"));
    }
  }
);

/**
 * PUT /api/v1/storage-locations/:id
 * Update a storage location
 */
router.put("/storage-locations/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json(createApiResponse.error("UNAUTHORIZED", "User not authenticated"));
    
    const locationId = req.params.id;
    const updated = await storage.user.inventory.updateStorageLocation(userId, locationId, req.body);
    
    if (!updated) {
      return res.status(404).json(createApiResponse.error("NOT_FOUND", "Storage location not found"));
    }
    
    res.json(createApiResponse.success(updated, "Storage location updated successfully"));
  } catch (error) {
    console.error("Error updating storage location:", error);
    res.status(500).json(createApiResponse.error("INTERNAL_ERROR", "Failed to update storage location"));
  }
});

/**
 * DELETE /api/v1/storage-locations/:id
 * Delete a storage location
 */
router.delete("/storage-locations/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json(createApiResponse.error("UNAUTHORIZED", "User not authenticated"));
    
    const locationId = req.params.id;
    await storage.user.inventory.deleteStorageLocation(userId, locationId);
    
    res.json(createApiResponse.success({ id: locationId }, "Storage location deleted successfully"));
  } catch (error) {
    console.error("Error deleting storage location:", error);
    res.status(500).json(createApiResponse.error("INTERNAL_ERROR", "Failed to delete storage location"));
  }
});

// ============================================
// BARCODES RESOURCE
// ============================================

/**
 * GET /api/v1/barcodes/search
 * Search for products by barcode
 */
router.get("/barcodes/search", isAuthenticated, rateLimiters.barcode.middleware(), async (req: Request, res: Response) => {
  try {
    const { code } = req.query;
    
    if (!code) {
      return res.status(400).json(createApiResponse.error("VALIDATION_ERROR", "Barcode is required"));
    }
    
    // Call barcode lookup API
    const response = await axios.get(`https://api.barcodelookup.com/v3/products`, {
      params: {
        barcode: code,
        formatted: 'y',
        key: process.env.BARCODE_LOOKUP_API_KEY
      }
    });
    
    if (response.data && response.data.products && response.data.products.length > 0) {
      const product = response.data.products[0];
      const formattedProduct = {
        barcode: product.barcode_number,
        name: product.title,
        manufacturer: product.manufacturer,
        category: product.category,
        description: product.description,
        images: product.images
      };
      
      res.json(createApiResponse.success(formattedProduct));
    } else {
      res.status(404).json(createApiResponse.error("NOT_FOUND", "Product not found"));
    }
  } catch (error) {
    console.error("Error looking up barcode:", error);
    res.status(500).json(createApiResponse.error("INTERNAL_ERROR", "Failed to lookup barcode"));
  }
});

// ============================================
// FOOD DATA RESOURCE (USDA)
// ============================================

/**
 * GET /api/v1/food-data/search
 * Search USDA food database
 */
router.get("/food-data/search", async (req: Request, res: Response) => {
  try {
    const { q, limit = "25" } = req.query;
    
    if (!q) {
      return res.status(400).json(createApiResponse.error("VALIDATION_ERROR", "Search query is required"));
    }
    
    const results = await searchUSDAFoodsCached(q as string);
    res.json(createApiResponse.success(results));
  } catch (error) {
    console.error("USDA search error:", error);
    res.status(500).json(createApiResponse.error("INTERNAL_ERROR", "Failed to search food database"));
  }
});

/**
 * GET /api/v1/food-data/:fdcId
 * Get specific food data by FDC ID
 */
router.get("/food-data/:fdcId", async (req: Request, res: Response) => {
  try {
    const { fdcId } = req.params;
    const foodData = await getFoodByFdcId(fdcId);
    
    if (!foodData) {
      return res.status(404).json(createApiResponse.error("NOT_FOUND", "Food item not found"));
    }
    
    res.json(createApiResponse.success(foodData));
  } catch (error) {
    console.error("Error fetching food data:", error);
    res.status(500).json(createApiResponse.error("INTERNAL_ERROR", "Failed to fetch food data"));
  }
});

/**
 * POST /api/v1/food-data/cache/clear
 * Clear USDA cache (admin only)
 */
router.post("/food-data/cache/clear", async (_req: Request, res: Response) => {
  try {
    // TODO: Add admin authentication check
    const usdaCache = await import("../../utils/usdaCache");
    if (usdaCache.clearAllCache) {
      usdaCache.clearAllCache();
    }
    res.json(createApiResponse.success(null, "USDA cache cleared successfully"));
  } catch (error) {
    console.error("Error clearing cache:", error);
    res.status(500).json(createApiResponse.error("INTERNAL_ERROR", "Failed to clear cache"));
  }
});

export default router;