import { searchUSDA, mapUSDAToFoodItem, getUSDAFood } from "../integrations/usda";
import { logger } from "../lib/logger";
import { CacheService, MemoryCacheStore } from "../lib/cache";

export interface NutritionLabelData {
  servingSize: string;
  servingsPerContainer?: string;
  calories: number;
  totalFat: number;
  saturatedFat?: number;
  transFat?: number;
  cholesterol?: number;
  sodium?: number;
  totalCarbohydrates: number;
  dietaryFiber?: number;
  totalSugars?: number;
  protein: number;
  vitaminD?: number;
  calcium?: number;
  iron?: number;
  potassium?: number;
  source: "usda";
  sourceId: string;
  foodName: string;
  brand?: string;
}

const nutritionCache = new CacheService<NutritionLabelData | null>({
  defaultTtlMs: 5 * 60 * 1000,
  store: new MemoryCacheStore<NutritionLabelData | null>({ maxSize: 500 }),
});

function mapToNutritionLabel(mapped: ReturnType<typeof mapUSDAToFoodItem>): NutritionLabelData {
  return {
    servingSize: mapped.nutrition.servingSize || "1 serving",
    calories: mapped.nutrition.calories,
    totalFat: mapped.nutrition.fat,
    saturatedFat: mapped.nutrition.saturatedFat,
    transFat: mapped.nutrition.transFat,
    cholesterol: mapped.nutrition.cholesterol,
    sodium: mapped.nutrition.sodium,
    totalCarbohydrates: mapped.nutrition.carbs,
    dietaryFiber: mapped.nutrition.fiber,
    totalSugars: mapped.nutrition.sugar,
    protein: mapped.nutrition.protein,
    vitaminD: mapped.nutrition.vitaminD,
    calcium: mapped.nutrition.calcium,
    iron: mapped.nutrition.iron,
    potassium: mapped.nutrition.potassium,
    source: "usda",
    sourceId: String(mapped.sourceId),
    foodName: mapped.name,
    brand: mapped.brandOwner || mapped.brandName,
  };
}

export async function lookupNutritionByName(
  foodName: string,
  brand?: string,
): Promise<NutritionLabelData | null> {
  const cacheKey = `nutrition:name:${foodName.toLowerCase()}|${(brand || "").toLowerCase()}`;
  const cached = await nutritionCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  try {
    const searchQuery = brand ? `${foodName} ${brand}` : foodName;
    const results = await searchUSDA(searchQuery, 5);

    if (results.length === 0) {
      await nutritionCache.set(cacheKey, null);
      return null;
    }

    let bestMatch = results[0];

    if (brand) {
      const brandLower = brand.toLowerCase();
      const brandMatch = results.find((r) => {
        const owner = (r.brandOwner || "").toLowerCase();
        const name = (r.brandName || "").toLowerCase();
        return owner.includes(brandLower) || name.includes(brandLower);
      });
      if (brandMatch) {
        bestMatch = brandMatch;
      }
    }

    const mapped = mapUSDAToFoodItem(bestMatch);
    const label = mapToNutritionLabel(mapped);

    await nutritionCache.set(cacheKey, label);
    return label;
  } catch (error) {
    logger.error("Error looking up nutrition by name", {
      foodName,
      brand,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function lookupNutritionByFdcId(
  fdcId: number,
): Promise<NutritionLabelData | null> {
  try {
    const foodDetail = await getUSDAFood(fdcId);
    if (!foodDetail) {
      return null;
    }

    const mapped = mapUSDAToFoodItem(foodDetail);
    return mapToNutritionLabel(mapped);
  } catch (error) {
    logger.error("Error looking up nutrition by fdcId", {
      fdcId,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
