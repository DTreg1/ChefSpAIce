import { Router, Request as ExpressRequest, Response as ExpressResponse } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import { inventoryStorage } from "../storage/index";
import { insertUserInventorySchema, type UserInventory as FoodItem } from "@shared/schema";
// Use OAuth authentication middleware
import { isAuthenticated } from "../middleware/auth.middleware";
import { batchedApiLogger } from "../batchedApiLogger";
import { validateBody } from "../middleware";
import axios from "axios";
import { openai } from "../openai";
import rateLimiters from "../middleware/rateLimit";

const router = Router();

/**
 * GET /inventory
 * 
 * Retrieves user's food inventory with optional filtering and pagination.
 * 
 * Query Parameters:
 * - location: Filter by storage location (e.g., "Fridge", "Pantry"). Use "all" to skip filtering.
 * - category: Filter by food category (e.g., "Dairy", "Produce")
 * - view: Special view filters. "expiring" returns items expiring within 7 days
 * - page: Page number for pagination (default: 1)
 * - limit: Items per page (default: 50)
 * 
 * Returns: Paginated list of food items with metadata
 * - data: Array of food items
 * - pagination: { page, limit, total, totalPages }
 * - type: "items"
 */
router.get("/inventory", isAuthenticated, async (req: ExpressRequest<any, any, any, any>, res: ExpressResponse) => {
  try {
    const userId = (req.user as any)?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const { location, category, view, page = 1, limit = 50 } = req.query;
    
    // Fetch items from storage with database-level location and category filtering
    const items = await inventoryStorage.getFoodItems(
      userId, 
      location && location !== "all" ? location : undefined,
      category ? category : undefined
    );
    
    // Apply additional view-based filtering in application layer
    // "expiring" view: Items expiring within the next 7 days
    let filteredItems = items;
    if (view === "expiring") {
      const today = new Date();
      const sevenDaysFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      filteredItems = items.filter((item: FoodItem) => {
        if (!item.expirationDate) return false;
        const expDate = new Date(item.expirationDate);
        return expDate >= today && expDate <= sevenDaysFromNow;
      });
    }
    
    // Apply client-side pagination to filtered results
    // This allows for consistent pagination even when view filters are applied
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
  } catch (error) {
    console.error("Error fetching inventory:", error);
    res.status(500).json({ error: "Failed to fetch inventory data" });
  }
});

/**
 * GET /storage-locations
 * 
 * Retrieves all storage locations configured by the user.
 * Storage locations are managed in the users.storageLocations JSONB column.
 * Default locations include: Refrigerator, Freezer, Pantry, Counter
 * 
 * Returns: Array of storage locations with { id, name, icon }
 */
router.get("/storage-locations", isAuthenticated, async (req: ExpressRequest<any, any, any, any>, res: ExpressResponse) => {
  try {
    const userId = (req.user as any)?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const locations = await inventoryStorage.getStorageLocations(userId);
    res.json(locations);
  } catch (error) {
    console.error("Error fetching storage locations:", error);
    res.status(500).json({ error: "Failed to fetch storage locations" });
  }
});

const storageLocationSchema = z.object({
  name: z.string().min(1),
  icon: z.string(),
});

router.post(
  "/storage-locations",
  isAuthenticated,
  validateBody(storageLocationSchema),
  async (req: ExpressRequest<any, any, any, any>, res: ExpressResponse) => {
    try {
      const userId = (req.user as any)?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const newLocation = await inventoryStorage.createStorageLocation(userId, req.body);
      res.json(newLocation);
    } catch (error) {
      console.error("Error creating storage location:", error);
      res.status(500).json({ error: "Failed to create storage location" });
    }
  }
);

// Food items CRUD
router.get("/food-items", isAuthenticated, async (req: ExpressRequest<any, any, any, any>, res: ExpressResponse) => {
  try {
    const userId = (req.user as any)?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const items = await inventoryStorage.getFoodItems(userId);
    res.json(items);
  } catch (error) {
    console.error("Error fetching food items:", error);
    res.status(500).json({ error: "Failed to fetch food items" });
  }
});

/**
 * POST /food-items
 * 
 * Creates a new food item in the user's inventory.
 * 
 * Request Body (validated against insertUserInventorySchema):
 * - name: String (required) - Name of the food item
 * - quantity: String (required) - Amount/quantity
 * - unit: String (optional) - Unit of measurement
 * - storageLocationId: String (required) - ID of storage location
 * - expirationDate: String (optional) - ISO date string
 * - foodCategory: String (optional) - Food category
 * - nutrition: JSON/String (optional) - Nutrition data
 * - barcodeId: String (optional) - Barcode number if scanned
 * - weightInGrams: Number (optional) - Item weight for nutrition calculations
 * - imageUrl: String (optional) - Product image URL
 * 
 * Security: Verifies storage location belongs to authenticated user
 * 
 * Returns: Created food item with generated ID and all provided fields
 */
router.post(
  "/food-items",
  isAuthenticated,
  async (req: ExpressRequest<any, any, any, any>, res: ExpressResponse) => {
    try {
      const userId = (req.user as any)?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const validation = insertUserInventorySchema.safeParse(req.body as any);
      
      if (!validation.success) {
        return res.status(400).json({ 
          error: "Validation error", 
          details: validation.error.errors 
        });
      }

      // Security check: Ensure storage location belongs to this user
      // Prevents users from adding items to other users' locations
      const locations = await inventoryStorage.getStorageLocations(userId);
      const locationExists = locations.some((loc: any) => loc.id === req.body.storageLocationId);
      
      if (!locationExists) {
        return res.status(403).json({ error: "Invalid storage location" });
      }

      // Parse nutrition data if provided as JSON string
      // Handles both object and string formats for flexibility
      let nutritionData = req.body.nutritionData;
      if (nutritionData && typeof nutritionData === "string") {
        try {
          nutritionData = JSON.parse(nutritionData);
        } catch {
          nutritionData = null;
        }
      }

      // Smart expiration date calculation based on food category
      // Uses category-specific shelf life defaults when expiration not provided
      let expirationDate = req.body.expirationDate;
      if (!expirationDate && req.body.foodCategory) {
        const categoryDefaults: Record<string, number> = {
          dairy: 7,        // 1 week
          meat: 3,         // 3 days (refrigerated)
          produce: 5,      // 5 days
          grains: 30,      // 1 month
          canned: 365,     // 1 year
          frozen: 90,      // 3 months
          condiments: 180, // 6 months
          beverages: 30,   // 1 month
          snacks: 60,      // 2 months
          other: 30,       // Default 1 month
        };

        const daysToAdd = categoryDefaults[req.body.foodCategory?.toLowerCase()] || 30;
        const expDate = new Date();
        expDate.setDate(expDate.getDate() + daysToAdd);
        expirationDate = expDate.toISOString().split("T")[0];
      }

      const item = await inventoryStorage.createFoodItem(userId, {
        ...validation.data,
        expirationDate: expirationDate || new Date().toISOString().split("T")[0],
        usdaData: nutritionData,
      });

      res.json(item);
    } catch (error) {
      console.error("Error creating food item:", error);
      res.status(500).json({ error: "Failed to create food item" });
    }
  }
);

/**
 * PUT /food-items/:id
 * 
 * Updates an existing food item in the user's inventory.
 * Supports partial updates - only provided fields are modified.
 * 
 * Path Parameters:
 * - id: String - Food item ID
 * 
 * Request Body: Partial food item fields to update
 * - Any field from the food item schema can be updated
 * 
 * Security:
 * - Verifies item belongs to authenticated user
 * - If changing storage location, verifies new location belongs to user
 * 
 * Returns: Updated food item
 */
router.put(
  "/food-items/:id",
  isAuthenticated,
  async (req: ExpressRequest<any, any, any, any>, res: ExpressResponse) => {
    try {
      const userId = (req.user as any)?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const itemId = req.params.id;

      // Security check: Verify item belongs to authenticated user
      const items = await inventoryStorage.getFoodItems(userId);
      const existing = items.find((item: FoodItem) => item.id === itemId);

      if (!existing) {
        return res.status(404).json({ error: "Food item not found" });
      }

      // Additional security check when changing storage location
      // Prevents moving items to locations user doesn't own
      if (req.body.storageLocationId) {
        const locations = await inventoryStorage.getStorageLocations(userId);
        const locationExists = locations.some((loc: any) => loc.id === req.body.storageLocationId);
        
        if (!locationExists) {
          return res.status(403).json({ error: "Invalid storage location" });
        }
      }

      const updated = await inventoryStorage.updateFoodItem(userId, itemId, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating food item:", error);
      res.status(500).json({ error: "Failed to update food item" });
    }
  }
);

router.delete("/food-items/:id", isAuthenticated, async (req: ExpressRequest<any, any, any, any>, res: ExpressResponse) => {
  try {
    const userId = (req.user as any)?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const itemId = req.params.id;

    // Verify item belongs to user before deleting
    const items = await inventoryStorage.getFoodItems(userId);
    const existing = items.find((item: FoodItem) => item.id === itemId);

    if (!existing) {
      return res.status(404).json({ error: "Food item not found" });
    }

    await inventoryStorage.deleteFoodItem(userId, itemId);
    res.json({ message: "Food item deleted successfully" });
  } catch (error) {
    console.error("Error deleting food item:", error);
    res.status(500).json({ error: "Failed to delete food item" });
  }
});

// Food categories
router.get("/food-categories", isAuthenticated, async (_req: any, res: ExpressResponse) => {
  const categories = [
    "Dairy",
    "Meat",
    "Produce",
    "Grains",
    "Canned",
    "Frozen",
    "Condiments",
    "Beverages",
    "Snacks",
    "Other",
  ];
  res.json(categories);
});

// USDA FoodData Central endpoints
const fdcCache = new Map<string, { data: any; timestamp: number }>();
const FDC_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

router.get("/fdc/search", async (req: ExpressRequest<any, any, any, any>, res: ExpressResponse) => {
  try {
    const query = req.query.query as string;
    if (!query) {
      return res.status(400).json({ error: "Query parameter is required" });
    }

    const cacheKey = `search:${query}`;
    const cached = fdcCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < FDC_CACHE_TTL) {
      // Set cache headers for cached response
      res.set({
        'Cache-Control': 'public, max-age=86400', // 24 hours
        'X-Cache': 'HIT',
        'ETag': `W/"${Buffer.from(JSON.stringify(cached.data)).toString('base64').slice(0, 27)}"`,
      });
      return res.json(cached.data);
    }

    const apiKey = process.env.VITE_USDA_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "USDA API key not configured" });
    }

    const response = await axios.get(`https://api.nal.usda.gov/fdc/v1/foods/search`, {
      params: {
        query,
        api_key: apiKey,
        limit: 25,
        dataType: "Branded,Survey (FNDDS)",
      },
    });

    const result = response.data;
    fdcCache.set(cacheKey, { data: result, timestamp: Date.now() });

    // Set cache headers for fresh response
    res.set({
      'Cache-Control': 'public, max-age=86400', // 24 hours
      'X-Cache': 'MISS',
      'ETag': `W/"${Buffer.from(JSON.stringify(result)).toString('base64').slice(0, 27)}"`,
    });

    res.json(result);
  } catch (error) {
    console.error("FDC search error:", error);
    res.status(500).json({ error: "Failed to search FDC" });
  }
});

router.get("/fdc/food/:fdcId", async (req: ExpressRequest<any, any, any, any>, res: ExpressResponse) => {
  try {
    const fdcId = req.params.fdcId;
    
    const cacheKey = `food:${fdcId}`;
    const cached = fdcCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < FDC_CACHE_TTL) {
      // Set cache headers for cached response
      res.set({
        'Cache-Control': 'public, max-age=2592000', // 30 days for specific food items
        'X-Cache': 'HIT',
        'ETag': `W/"${fdcId}-${cached.timestamp}"`,
      });
      return res.json(cached.data);
    }

    const apiKey = process.env.VITE_USDA_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "USDA API key not configured" });
    }

    const response = await axios.get(`https://api.nal.usda.gov/fdc/v1/food/${fdcId}`, {
      params: { api_key: apiKey },
    });

    const result = response.data;
    const timestamp = Date.now();
    fdcCache.set(cacheKey, { data: result, timestamp });

    // Set cache headers for fresh response
    res.set({
      'Cache-Control': 'public, max-age=2592000', // 30 days for specific food items
      'X-Cache': 'MISS',
      'ETag': `W/"${fdcId}-${timestamp}"`,
    });

    res.json(result);
  } catch (error) {
    console.error("FDC food error:", error);
    res.status(500).json({ error: "Failed to fetch food data" });
  }
});

router.post("/fdc/cache/clear", async (_req: Request, res: ExpressResponse) => {
  fdcCache.clear();
  res.json({ message: "FDC cache cleared successfully" });
});

// Barcode lookup endpoints
const barcodeCache = new Map<string, { data: any; timestamp: number }>();
const BARCODE_CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

router.get("/barcodelookup/search", isAuthenticated, rateLimiters.barcode.middleware(), async (req: ExpressRequest<any, any, any, any>, res: ExpressResponse) => {
  try {
    const userId = (req.user as any)?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const barcode = req.query.barcode as string;
    
    if (!barcode) {
      return res.status(400).json({ error: "Barcode parameter is required" });
    }

    const cacheKey = `barcode:${barcode}`;
    const cached = barcodeCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < BARCODE_CACHE_TTL) {
      return res.json(cached.data);
    }

    const apiKey = process.env.BARCODABLE_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Barcode API key not configured" });
    }

    // Log API usage
    await batchedApiLogger.logApiUsage(userId, {
      apiName: "barcode_lookup",
      endpoint: "search",
      queryParams: `barcode=${barcode}`,
      statusCode: 200,
      success: true,
    });

    const response = await axios.get(
      `https://www.barcodable.com/api/v1/${apiKey}/${barcode}`
    );

    const result = response.data;
    barcodeCache.set(cacheKey, { data: result, timestamp: Date.now() });

    res.json(result);
  } catch (error: unknown) {
    if ((error as any).response?.status === 404) {
      return res.status(404).json({ error: "Product not found" });
    }
    console.error("Barcode search error:", error instanceof Error ? error.message : String(error));
    res.status(500).json({ error: "Failed to search barcode" });
  }
});

/**
 * POST /food/enrich
 * 
 * Uses AI to enrich food item data with smart categorization and recommendations.
 * Provides intelligent defaults when USDA or barcode data is incomplete.
 * 
 * Request Body:
 * - name: String (required) - Name of the food item
 * - barcode: String (optional) - Product barcode for context
 * - fdcData: Object (optional) - USDA FoodData Central nutrition data
 * 
 * AI Analysis Provides:
 * - foodCategory: Intelligent categorization (dairy, meat, produce, etc.)
 * - defaultShelfLife: Estimated shelf life in days based on food type
 * - storageRecommendation: Best storage location (fridge, freezer, pantry)
 * - nutritionSummary: Key nutritional highlights
 * - commonUses: Common culinary applications
 * 
 * Error Handling: Returns safe defaults if AI fails
 * Rate Limiting: Protected by OpenAI rate limiter
 * 
 * Returns: Enriched food data with AI-generated insights
 */
router.post("/food/enrich", isAuthenticated, async (req: ExpressRequest<any, any, any, any>, res: ExpressResponse) => {
  try {
    const { name, barcode, fdcData  } = req.body || {};
    
    if (!name) {
      return res.status(400).json({ error: "Food name is required" });
    }

    if (!openai) {
      return res.status(500).json({ error: "OpenAI API not configured" });
    }

    // Build context from available data sources
    // Combines barcode and USDA data to provide richer AI context
    let context = `Food item: ${name}`;
    if (barcode) context += `\nBarcode: ${barcode}`;
    if (fdcData) {
      const nutrients = fdcData.foodNutrients?.slice(0, 10)
        .map((n: any) => `${n.nutrientName}: ${n.value}${n.unitName}`)
        .join(", ");
      if (nutrients) context += `\nNutrients: ${nutrients}`;
    }

    const prompt = `Given this food item information:
${context}

Provide a JSON response with:
1. foodCategory: one of [dairy, meat, produce, grains, canned, frozen, condiments, beverages, snacks, other]
2. defaultShelfLife: estimated shelf life in days
3. storageRecommendation: best storage location [fridge, freezer, pantry]
4. nutritionSummary: brief nutrition highlights (2-3 key points)
5. commonUses: 2-3 common culinary uses

Response must be valid JSON only, no additional text.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,   // Low temperature for consistent categorization
      max_tokens: 300,
    });

    const enrichedData = JSON.parse(completion.choices[0].message?.content || "{}");
    
    res.json({
      ...enrichedData,
      name,
      barcode,
      fdcData,
    });
  } catch (error) {
    console.error("Food enrichment error:", error);
    // Graceful fallback with safe defaults
    // Ensures user experience isn't disrupted by AI failures
    res.json({
      foodCategory: "other",
      defaultShelfLife: 30,
      storageRecommendation: "pantry",
      nutritionSummary: "Nutritional information not available",
      commonUses: ["General cooking"],
    });
  }
});

// Onboarding common items
router.get("/onboarding/common-items", async (_req: Request, res: ExpressResponse) => {
  const commonItems = [
    { name: "Milk", foodCategory: "dairy", icon: "🥛" },
    { name: "Eggs", foodCategory: "dairy", icon: "🥚" },
    { name: "Bread", foodCategory: "grains", icon: "🍞" },
    { name: "Butter", foodCategory: "dairy", icon: "🧈" },
    { name: "Chicken Breast", foodCategory: "meat", icon: "🍗" },
    { name: "Ground Beef", foodCategory: "meat", icon: "🥩" },
    { name: "Rice", foodCategory: "grains", icon: "🍚" },
    { name: "Pasta", foodCategory: "grains", icon: "🍝" },
    { name: "Tomatoes", foodCategory: "produce", icon: "🍅" },
    { name: "Onions", foodCategory: "produce", icon: "🧅" },
    { name: "Potatoes", foodCategory: "produce", icon: "🥔" },
    { name: "Cheese", foodCategory: "dairy", icon: "🧀" },
  ];
  res.json(commonItems);
});

// Image upload endpoint
router.put("/food-images", isAuthenticated, async (req: ExpressRequest<any, any, any, any>, res: ExpressResponse) => {
  try {
    const userId = (req.user as any)?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const { itemId, imageUrl  } = req.body || {};
    
    if (!itemId || !imageUrl) {
      return res.status(400).json({ error: "Item ID and image URL required" });
    }

    // Verify item belongs to user
    const items = await inventoryStorage.getFoodItems(userId);
    const item = items.find((i: FoodItem) => i.id === itemId);

    if (!item) {
      return res.status(404).json({ error: "Food item not found" });
    }

    await inventoryStorage.updateFoodItem(userId, itemId, { imageUrl });
    res.json({ message: "Image updated successfully" });
  } catch (error) {
    console.error("Error updating food image:", error);
    res.status(500).json({ error: "Failed to update image" });
  }
});

export default router;