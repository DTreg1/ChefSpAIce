import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { foodItems, insertFoodItemSchema, type FoodItem, type InsertFoodItem } from "@shared/schema";
import { isAuthenticated } from "../replitAuth";
import { ApiError } from "../apiError";
import { batchedApiLogger } from "../batchedApiLogger";
import { validateBody, validateQuery } from "../middleware";
import axios from "axios";
import { openai } from "../openai";
import rateLimiters from "../middleware/rateLimit";

const router = Router();

// Storage locations endpoints - now managed in users.storageLocations JSONB
router.get("/storage-locations", isAuthenticated, async (req: any, res: Response) => {
  try {
    const userId = req.user.claims.sub;
    const user = await storage.getUser(userId);
    res.json(user?.storageLocations || []);
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
  async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const newLocation = {
        id: crypto.randomUUID(),
        ...req.body,
      };
      
      const user = await storage.getUser(userId);
      const locations = user?.storageLocations || [];
      locations.push(newLocation);
      
      await storage.updateUser(userId, { storageLocations: locations });
      res.json(newLocation);
    } catch (error) {
      console.error("Error creating storage location:", error);
      res.status(500).json({ error: "Failed to create storage location" });
    }
  }
);

// Food items CRUD
router.get("/food-items", isAuthenticated, async (req: any, res: Response) => {
  try {
    const userId = req.user.claims.sub;
    const items = await storage.getFoodItems(userId);
    res.json(items);
  } catch (error) {
    console.error("Error fetching food items:", error);
    res.status(500).json({ error: "Failed to fetch food items" });
  }
});

router.post(
  "/food-items",
  isAuthenticated,
  async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const validation = insertFoodItemSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ 
          error: "Validation error", 
          details: validation.error.errors 
        });
      }

      // Verify storage location belongs to user
      const user = await storage.getUser(userId);
      const locations = user?.storageLocations || [];
      const locationExists = locations.some((loc: any) => loc.id === req.body.storageLocationId);
      
      if (!locationExists) {
        return res.status(403).json({ error: "Invalid storage location" });
      }

      // Process nutrition data if provided
      let nutritionData = req.body.nutritionData;
      if (nutritionData && typeof nutritionData === "string") {
        try {
          nutritionData = JSON.parse(nutritionData);
        } catch (e) {
          nutritionData = null;
        }
      }

      // Calculate expiration if not provided
      let expirationDate = req.body.expirationDate;
      if (!expirationDate && req.body.foodCategory) {
        const categoryDefaults: Record<string, number> = {
          dairy: 7,
          meat: 3,
          produce: 5,
          grains: 30,
          canned: 365,
          frozen: 90,
          condiments: 180,
          beverages: 30,
          snacks: 60,
          other: 30,
        };

        const daysToAdd = categoryDefaults[req.body.foodCategory?.toLowerCase()] || 30;
        const expDate = new Date();
        expDate.setDate(expDate.getDate() + daysToAdd);
        expirationDate = expDate.toISOString().split("T")[0];
      }

      const item = await storage.createFoodItem({
        ...validation.data,
        userId,
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

router.put(
  "/food-items/:id",
  isAuthenticated,
  async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const itemId = req.params.id;

      // Verify item belongs to user
      const items = await storage.getFoodItems(userId);
      const existing = items.find((item: FoodItem) => item.id === itemId);

      if (!existing) {
        return res.status(404).json({ error: "Food item not found" });
      }

      // If changing storage location, verify it belongs to user
      if (req.body.storageLocationId) {
        const user = await storage.getUser(userId);
        const locations = user?.storageLocations || [];
        const locationExists = locations.some((loc: any) => loc.id === req.body.storageLocationId);
        
        if (!locationExists) {
          return res.status(403).json({ error: "Invalid storage location" });
        }
      }

      const updated = await storage.updateFoodItem(itemId, userId, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating food item:", error);
      res.status(500).json({ error: "Failed to update food item" });
    }
  }
);

router.delete("/food-items/:id", isAuthenticated, async (req: any, res: Response) => {
  try {
    const userId = req.user.claims.sub;
    const itemId = req.params.id;

    // Verify item belongs to user before deleting
    const items = await storage.getFoodItems(userId);
    const existing = items.find((item: FoodItem) => item.id === itemId);

    if (!existing) {
      return res.status(404).json({ error: "Food item not found" });
    }

    await storage.deleteFoodItem(itemId, userId);
    res.json({ message: "Food item deleted successfully" });
  } catch (error) {
    console.error("Error deleting food item:", error);
    res.status(500).json({ error: "Failed to delete food item" });
  }
});

// Food categories
router.get("/food-categories", isAuthenticated, async (_req: any, res: Response) => {
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

router.get("/fdc/search", async (req: Request, res: Response) => {
  try {
    const query = req.query.query as string;
    if (!query) {
      return res.status(400).json({ error: "Query parameter is required" });
    }

    const cacheKey = `search:${query}`;
    const cached = fdcCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < FDC_CACHE_TTL) {
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

    res.json(result);
  } catch (error) {
    console.error("FDC search error:", error);
    res.status(500).json({ error: "Failed to search FDC" });
  }
});

router.get("/fdc/food/:fdcId", async (req: Request, res: Response) => {
  try {
    const fdcId = req.params.fdcId;
    
    const cacheKey = `food:${fdcId}`;
    const cached = fdcCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < FDC_CACHE_TTL) {
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
    fdcCache.set(cacheKey, { data: result, timestamp: Date.now() });

    res.json(result);
  } catch (error) {
    console.error("FDC food error:", error);
    res.status(500).json({ error: "Failed to fetch food data" });
  }
});

router.post("/fdc/cache/clear", async (_req: Request, res: Response) => {
  fdcCache.clear();
  res.json({ message: "FDC cache cleared successfully" });
});

// Barcode lookup endpoints
const barcodeCache = new Map<string, { data: any; timestamp: number }>();
const BARCODE_CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

router.get("/barcodelookup/search", isAuthenticated, rateLimiters.barcode.middleware(), async (req: any, res: Response) => {
  try {
    const userId = req.user.claims.sub;
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
  } catch (error: any) {
    if (error.response?.status === 404) {
      return res.status(404).json({ error: "Product not found" });
    }
    console.error("Barcode search error:", error);
    res.status(500).json({ error: "Failed to search barcode" });
  }
});

// Food enrichment with AI
router.post("/food/enrich", isAuthenticated, async (req: any, res: Response) => {
  try {
    const { name, barcode, fdcData } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: "Food name is required" });
    }

    if (!openai) {
      return res.status(500).json({ error: "OpenAI API not configured" });
    }

    // Build context from available data
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
      temperature: 0.3,
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
router.get("/onboarding/common-items", async (_req: Request, res: Response) => {
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
router.put("/food-images", isAuthenticated, async (req: any, res: Response) => {
  try {
    const userId = req.user.claims.sub;
    const { itemId, imageUrl } = req.body;
    
    if (!itemId || !imageUrl) {
      return res.status(400).json({ error: "Item ID and image URL required" });
    }

    // Verify item belongs to user
    const items = await storage.getFoodItems(userId);
    const item = items.find((i: FoodItem) => i.id === itemId);

    if (!item) {
      return res.status(404).json({ error: "Food item not found" });
    }

    await storage.updateFoodItem(itemId, userId, { imageUrl });
    res.json({ message: "Image updated successfully" });
  } catch (error) {
    console.error("Error updating food image:", error);
    res.status(500).json({ error: "Failed to update image" });
  }
});

export default router;