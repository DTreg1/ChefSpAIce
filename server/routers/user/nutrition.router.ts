import { Router, type Request, type Response } from "express";
import OpenAI from "openai";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import {
  searchUSDA,
  getUSDAFood,
  mapUSDAToFoodItem,
  type USDASearchResult,
  type USDAFoodDetail,
} from "../../integrations/usda";
import {
  searchOpenFoodFacts,
  lookupBarcode,
  mapOFFToFoodItem,
  hasCompleteNutritionData,
  type OFFProduct,
} from "../../integrations/openFoodFacts";
import {
  type NutritionFacts,
  nutritionCorrections,
  insertNutritionCorrectionSchema,
} from "@shared/schema";
import { db } from "../../db";

const router = Router();

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

interface CachedNutrition {
  nutrition: NutritionFacts;
  source: "usda" | "openfoodfacts" | "ai" | "cache";
  sourceId?: string | number;
  incomplete: boolean;
  timestamp: number;
  expiresAt: number;
}

interface NutritionSearchResult {
  id: string;
  name: string;
  brand?: string;
  source: "usda" | "openfoodfacts";
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

const nutritionCache = new Map<string, CachedNutrition>();
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const USDA_NUTRIENT_IDS = {
  ENERGY: 1008,
  PROTEIN: 1003,
  TOTAL_FAT: 1004,
  SATURATED_FAT: 1258,
  TRANS_FAT: 1257,
  CHOLESTEROL: 1253,
  SODIUM: 1093,
  CARBOHYDRATES: 1005,
  FIBER: 1079,
  SUGARS_TOTAL: 2000,
  ADDED_SUGARS: 1235,
  VITAMIN_D: 1114,
  CALCIUM: 1087,
  IRON: 1089,
  POTASSIUM: 1092,
};

function getCacheKey(foodId: string, source: string): string {
  return `${source}:${foodId}`;
}

function getFromCache(key: string): CachedNutrition | null {
  const cached = nutritionCache.get(key);
  if (!cached) return null;

  if (Date.now() > cached.expiresAt) {
    nutritionCache.delete(key);
    return null;
  }

  return cached;
}

function setInCache(
  key: string,
  nutrition: NutritionFacts,
  source: "usda" | "openfoodfacts" | "ai",
  sourceId?: string | number,
  incomplete: boolean = false,
): void {
  const now = Date.now();
  nutritionCache.set(key, {
    nutrition,
    source,
    sourceId,
    incomplete,
    timestamp: now,
    expiresAt: now + CACHE_TTL_MS,
  });
}

function findNutrientValue(
  nutrients: Array<{
    nutrientId?: number;
    nutrient?: { id: number };
    value?: number;
    amount?: number;
  }>,
  nutrientId: number,
): number | undefined {
  const nutrient = nutrients.find(
    (n) => n.nutrientId === nutrientId || n.nutrient?.id === nutrientId,
  );
  if (!nutrient) return undefined;
  return nutrient.value ?? nutrient.amount;
}

function mapUSDAToNutritionFacts(usdaFood: USDASearchResult | USDAFoodDetail): {
  nutrition: NutritionFacts;
  incomplete: boolean;
} {
  const nutrients = usdaFood.foodNutrients || [];

  const calories = findNutrientValue(nutrients, USDA_NUTRIENT_IDS.ENERGY);
  const protein = findNutrientValue(nutrients, USDA_NUTRIENT_IDS.PROTEIN);
  const totalFat = findNutrientValue(nutrients, USDA_NUTRIENT_IDS.TOTAL_FAT);
  const saturatedFat = findNutrientValue(
    nutrients,
    USDA_NUTRIENT_IDS.SATURATED_FAT,
  );
  const transFat = findNutrientValue(nutrients, USDA_NUTRIENT_IDS.TRANS_FAT);
  const cholesterol = findNutrientValue(
    nutrients,
    USDA_NUTRIENT_IDS.CHOLESTEROL,
  );
  const sodium = findNutrientValue(nutrients, USDA_NUTRIENT_IDS.SODIUM);
  const carbs = findNutrientValue(nutrients, USDA_NUTRIENT_IDS.CARBOHYDRATES);
  const fiber = findNutrientValue(nutrients, USDA_NUTRIENT_IDS.FIBER);
  const sugars = findNutrientValue(nutrients, USDA_NUTRIENT_IDS.SUGARS_TOTAL);
  const addedSugars = findNutrientValue(
    nutrients,
    USDA_NUTRIENT_IDS.ADDED_SUGARS,
  );
  const vitaminD = findNutrientValue(nutrients, USDA_NUTRIENT_IDS.VITAMIN_D);
  const calcium = findNutrientValue(nutrients, USDA_NUTRIENT_IDS.CALCIUM);
  const iron = findNutrientValue(nutrients, USDA_NUTRIENT_IDS.IRON);
  const potassium = findNutrientValue(nutrients, USDA_NUTRIENT_IDS.POTASSIUM);

  let servingSize = "100g";
  if (usdaFood.servingSize && usdaFood.servingSizeUnit) {
    servingSize = `${usdaFood.servingSize}${usdaFood.servingSizeUnit}`;
  }

  const incomplete =
    calories === undefined ||
    protein === undefined ||
    totalFat === undefined ||
    carbs === undefined;

  return {
    nutrition: {
      servingSize,
      servingsPerContainer: undefined,
      calories: Math.round(calories ?? 0),
      totalFat: Math.round((totalFat ?? 0) * 10) / 10,
      saturatedFat:
        saturatedFat !== undefined
          ? Math.round(saturatedFat * 10) / 10
          : undefined,
      transFat:
        transFat !== undefined ? Math.round(transFat * 10) / 10 : undefined,
      cholesterol:
        cholesterol !== undefined ? Math.round(cholesterol) : undefined,
      sodium: Math.round(sodium ?? 0),
      totalCarbohydrates: Math.round((carbs ?? 0) * 10) / 10,
      dietaryFiber:
        fiber !== undefined ? Math.round(fiber * 10) / 10 : undefined,
      totalSugars:
        sugars !== undefined ? Math.round(sugars * 10) / 10 : undefined,
      addedSugars:
        addedSugars !== undefined
          ? Math.round(addedSugars * 10) / 10
          : undefined,
      protein: Math.round((protein ?? 0) * 10) / 10,
      vitaminD:
        vitaminD !== undefined ? Math.round(vitaminD * 10) / 10 : undefined,
      calcium: calcium !== undefined ? Math.round(calcium) : undefined,
      iron: iron !== undefined ? Math.round(iron * 10) / 10 : undefined,
      potassium: potassium !== undefined ? Math.round(potassium) : undefined,
    },
    incomplete,
  };
}

function mapOFFToNutritionFacts(product: OFFProduct): {
  nutrition: NutritionFacts;
  incomplete: boolean;
} {
  const n = product.nutriments;

  const calories = n?.energy_kcal_100g ?? n?.["energy-kcal_100g"] ?? 0;
  const protein = n?.proteins_100g ?? 0;
  const fat = n?.fat_100g ?? 0;
  const carbs = n?.carbohydrates_100g ?? 0;
  const fiber = n?.fiber_100g;
  const sugars = n?.sugars_100g;
  let sodium: number | undefined;

  if (n?.sodium_100g !== undefined) {
    sodium = Math.round(n.sodium_100g * 1000);
  } else if (n?.salt_100g !== undefined) {
    sodium = Math.round(n.salt_100g * 400);
  }

  const incomplete = !hasCompleteNutritionData(product);

  return {
    nutrition: {
      servingSize: product.serving_size || "100g",
      servingsPerContainer: undefined,
      calories: Math.round(calories),
      totalFat: Math.round(fat * 10) / 10,
      saturatedFat: undefined,
      transFat: undefined,
      cholesterol: undefined,
      sodium: sodium ?? 0,
      totalCarbohydrates: Math.round(carbs * 10) / 10,
      dietaryFiber:
        fiber !== undefined ? Math.round(fiber * 10) / 10 : undefined,
      totalSugars:
        sugars !== undefined ? Math.round(sugars * 10) / 10 : undefined,
      addedSugars: undefined,
      protein: Math.round(protein * 10) / 10,
      vitaminD: undefined,
      calcium: undefined,
      iron: undefined,
      potassium: undefined,
    },
    incomplete,
  };
}

async function estimateNutritionWithAI(
  foodName: string,
): Promise<{ nutrition: NutritionFacts; incomplete: boolean }> {
  const prompt = `Estimate the nutrition facts for: "${foodName}"

Return a JSON object with these fields (per 100g serving):
{
  "calories": number,
  "totalFat": number (grams),
  "saturatedFat": number (grams),
  "sodium": number (mg),
  "totalCarbohydrates": number (grams),
  "dietaryFiber": number (grams),
  "totalSugars": number (grams),
  "protein": number (grams)
}

Use typical nutritional values for this food. Be accurate but conservative.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a nutrition database. Provide accurate nutritional estimates based on USDA data. Always respond with valid JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 256,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    const parsed = JSON.parse(content);

    return {
      nutrition: {
        servingSize: "100g (estimated)",
        servingsPerContainer: undefined,
        calories: Math.round(parsed.calories || 0),
        totalFat: Math.round((parsed.totalFat || 0) * 10) / 10,
        saturatedFat:
          parsed.saturatedFat !== undefined
            ? Math.round(parsed.saturatedFat * 10) / 10
            : undefined,
        transFat: undefined,
        cholesterol: undefined,
        sodium: Math.round(parsed.sodium || 0),
        totalCarbohydrates:
          Math.round((parsed.totalCarbohydrates || 0) * 10) / 10,
        dietaryFiber:
          parsed.dietaryFiber !== undefined
            ? Math.round(parsed.dietaryFiber * 10) / 10
            : undefined,
        totalSugars:
          parsed.totalSugars !== undefined
            ? Math.round(parsed.totalSugars * 10) / 10
            : undefined,
        addedSugars: undefined,
        protein: Math.round((parsed.protein || 0) * 10) / 10,
        vitaminD: undefined,
        calcium: undefined,
        iron: undefined,
        potassium: undefined,
      },
      incomplete: true,
    };
  } catch (error) {
    console.error("AI nutrition estimation error:", error);
    throw error;
  }
}

router.get("/:foodId", async (req: Request, res: Response) => {
  try {
    const { foodId } = req.params;
    const source = (req.query.source as string) || "usda";

    if (!foodId) {
      return res.status(400).json({ error: "Food ID is required" });
    }

    const cacheKey = getCacheKey(foodId, source);
    const cached = getFromCache(cacheKey);
    if (cached) {
      console.log(`Nutrition cache hit for: ${foodId}`);
      return res.json({
        nutrition: cached.nutrition,
        source: "cache",
        originalSource: cached.source,
        sourceId: cached.sourceId,
        incomplete: cached.incomplete,
        cached: true,
      });
    }

    if (source === "usda") {
      const fdcId = parseInt(foodId, 10);
      if (isNaN(fdcId)) {
        return res.status(400).json({ error: "Invalid USDA food ID" });
      }

      const usdaFood = await getUSDAFood(fdcId);
      if (usdaFood) {
        const { nutrition, incomplete } = mapUSDAToNutritionFacts(usdaFood);
        setInCache(cacheKey, nutrition, "usda", fdcId, incomplete);

        return res.json({
          nutrition,
          source: "usda",
          sourceId: fdcId,
          foodName: usdaFood.description,
          incomplete,
          cached: false,
        });
      }
    } else if (source === "openfoodfacts" || source === "barcode") {
      const product = await lookupBarcode(foodId);
      if (product) {
        const { nutrition, incomplete } = mapOFFToNutritionFacts(product);
        setInCache(cacheKey, nutrition, "openfoodfacts", foodId, incomplete);

        return res.json({
          nutrition,
          source: "openfoodfacts",
          sourceId: foodId,
          foodName: product.product_name || product.product_name_en,
          incomplete,
          cached: false,
        });
      }
    }

    return res.status(404).json({
      error: "Nutrition data not found",
      foodId,
      source,
    });
  } catch (error) {
    console.error("Nutrition fetch error:", error);
    return res.status(500).json({ error: "Failed to fetch nutrition data" });
  }
});

router.get("/search", async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;
    const limit = parseInt((req.query.limit as string) || "10", 10);

    if (!query || query.length < 2) {
      return res
        .status(400)
        .json({ error: "Search query must be at least 2 characters" });
    }

    const results: NutritionSearchResult[] = [];

    const usdaResults = await searchUSDA(query, Math.min(limit, 15));
    for (const item of usdaResults.slice(0, Math.ceil(limit * 0.7))) {
      const mapped = mapUSDAToFoodItem(item);
      results.push({
        id: `usda:${item.fdcId}`,
        name: item.description,
        brand: item.brandOwner,
        source: "usda",
        nutrition: {
          calories: mapped.nutrition.calories,
          protein: mapped.nutrition.protein,
          carbs: mapped.nutrition.carbs,
          fat: mapped.nutrition.fat,
        },
      });
    }

    if (results.length < limit) {
      const offResults = await searchOpenFoodFacts(
        query,
        limit - results.length,
      );
      for (const product of offResults) {
        if (hasCompleteNutritionData(product)) {
          const mapped = mapOFFToFoodItem(product);
          results.push({
            id: `off:${product.code}`,
            name: mapped.name,
            brand: mapped.brand,
            source: "openfoodfacts",
            nutrition: {
              calories: mapped.nutrition.calories,
              protein: mapped.nutrition.protein,
              carbs: mapped.nutrition.carbs,
              fat: mapped.nutrition.fat,
            },
          });
        }
      }
    }

    return res.json({
      results: results.slice(0, limit),
      totalResults: results.length,
      query,
    });
  } catch (error) {
    console.error("Nutrition search error:", error);
    return res.status(500).json({ error: "Failed to search nutrition data" });
  }
});

router.post("/estimate", async (req: Request, res: Response) => {
  try {
    const { foodName } = req.body;

    if (!foodName || typeof foodName !== "string") {
      return res.status(400).json({ error: "Food name is required" });
    }

    const cacheKey = getCacheKey(foodName.toLowerCase(), "ai");
    const cached = getFromCache(cacheKey);
    if (cached) {
      return res.json({
        nutrition: cached.nutrition,
        source: "cache",
        originalSource: "ai",
        incomplete: true,
        cached: true,
      });
    }

    const usdaResults = await searchUSDA(foodName, 1);
    if (usdaResults.length > 0) {
      const { nutrition, incomplete } = mapUSDAToNutritionFacts(usdaResults[0]);
      setInCache(cacheKey, nutrition, "usda", usdaResults[0].fdcId, incomplete);

      return res.json({
        nutrition,
        source: "usda",
        sourceId: usdaResults[0].fdcId,
        foodName: usdaResults[0].description,
        incomplete,
        cached: false,
      });
    }

    const offResults = await searchOpenFoodFacts(foodName, 1);
    if (offResults.length > 0 && hasCompleteNutritionData(offResults[0])) {
      const { nutrition, incomplete } = mapOFFToNutritionFacts(offResults[0]);
      setInCache(
        cacheKey,
        nutrition,
        "openfoodfacts",
        offResults[0].code,
        incomplete,
      );

      return res.json({
        nutrition,
        source: "openfoodfacts",
        sourceId: offResults[0].code,
        foodName: offResults[0].product_name || offResults[0].product_name_en,
        incomplete,
        cached: false,
      });
    }

    const { nutrition, incomplete } = await estimateNutritionWithAI(foodName);
    setInCache(cacheKey, nutrition, "ai", undefined, incomplete);

    return res.json({
      nutrition,
      source: "ai",
      foodName,
      incomplete: true,
      cached: false,
      warning: "Nutrition estimated by AI - may not be accurate",
    });
  } catch (error) {
    console.error("Nutrition estimation error:", error);
    return res.status(500).json({ error: "Failed to estimate nutrition" });
  }
});

router.delete("/cache", async (req: Request, res: Response) => {
  const sizeBefore = nutritionCache.size;
  nutritionCache.clear();
  console.log(`Nutrition cache cleared: ${sizeBefore} entries removed`);
  return res.json({ message: "Cache cleared", entriesRemoved: sizeBefore });
});

const correctionSubmitSchema = z.object({
  productName: z.string().min(1, "Product name is required"),
  barcode: z.string().optional(),
  brand: z.string().optional(),
  originalSource: z.string().optional(),
  originalSourceId: z.string().optional(),
  originalNutrition: z.string().optional(),
  correctedNutrition: z.string().optional(),
  imageUrl: z.string().optional(),
  notes: z.string().optional(),
});

router.post("/corrections", async (req: Request, res: Response) => {
  try {
    const parseResult = correctionSubmitSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: "Invalid submission data",
        details: parseResult.error.errors.map((e) => e.message).join(", "),
      });
    }

    const data = parseResult.data;
    const userId = (req as any).userId || null;

    const [correction] = await db
      .insert(nutritionCorrections)
      .values({
        userId,
        productName: data.productName,
        barcode: data.barcode || null,
        brand: data.brand || null,
        originalSource: data.originalSource || null,
        originalSourceId: data.originalSourceId || null,
        originalNutrition: data.originalNutrition || null,
        correctedNutrition: data.correctedNutrition || null,
        imageUrl: data.imageUrl || null,
        notes: data.notes || null,
        status: "pending",
      })
      .returning();

    console.log(`Nutrition correction submitted for: ${data.productName}`);

    return res.status(201).json({
      message: "Correction submitted successfully",
      id: correction.id,
    });
  } catch (error) {
    console.error("Error submitting nutrition correction:", error);
    return res.status(500).json({ error: "Failed to submit correction" });
  }
});

router.get("/corrections", async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    const limit = Math.min(parseInt((req.query.limit as string) || "50", 10), 100);
    const offset = parseInt((req.query.offset as string) || "0", 10);

    const baseQuery = db.select().from(nutritionCorrections);
    
    const corrections = status
      ? await baseQuery
          .where(eq(nutritionCorrections.status, status))
          .orderBy(desc(nutritionCorrections.createdAt))
          .limit(limit)
          .offset(offset)
      : await baseQuery
          .orderBy(desc(nutritionCorrections.createdAt))
          .limit(limit)
          .offset(offset);

    return res.json({
      corrections,
      count: corrections.length,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Error fetching nutrition corrections:", error);
    return res.status(500).json({ error: "Failed to fetch corrections" });
  }
});

router.patch("/corrections/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid correction ID" });
    }

    const { status, reviewNotes } = req.body;

    if (!status || !["pending", "reviewed", "approved", "rejected"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const [updated] = await db
      .update(nutritionCorrections)
      .set({
        status,
        reviewNotes: reviewNotes || null,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(nutritionCorrections.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "Correction not found" });
    }

    return res.json({ message: "Correction updated", correction: updated });
  } catch (error) {
    console.error("Error updating nutrition correction:", error);
    return res.status(500).json({ error: "Failed to update correction" });
  }
});

export default router;
