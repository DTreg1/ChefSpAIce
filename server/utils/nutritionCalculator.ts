/**
 * Nutrition Calculator Utilities
 *
 * Provides nutrition data extraction, scaling, and aggregation for food items.
 * Integrates with USDA FoodData Central API for standardized nutrition information.
 *
 * Key Features:
 * - USDA Data Extraction: Maps USDA nutrient IDs to application nutrition fields
 * - Quantity Scaling: Adjusts nutrition values based on actual food weight
 * - Aggregation: Sums nutrition across multiple items (meal plans, categories)
 * - Category Statistics: Groups nutrition by food category
 *
 * USDA Nutrient ID Mapping:
 * - 1008: Energy (kcal) → calories
 * - 1003: Protein (g) → protein
 * - 1005: Carbohydrate (g) → carbs
 * - 1004: Total lipid (g) → fat
 * - 1079: Fiber (g) → fiber
 * - 2000: Sugars (g) → sugar
 * - 1093: Sodium (mg) → sodium
 *
 * Precision:
 * - Calories: Rounded to whole numbers
 * - Macronutrients: Rounded to 1 decimal place (0.1g precision)
 * - Sodium: Rounded to whole milligrams
 */
import type { UserInventory, NutritionInfo } from "@shared/schema";

/**
 * Extract nutrition information from USDA FoodData Central API response
 *
 * Maps USDA's standardized nutrient IDs to application's nutrition schema.
 * Handles both Foundation Foods and Survey Foods API formats.
 *
 * @param usdaData - Raw USDA API response object with foodNutrients array
 * @returns Normalized NutritionInfo object or null if data invalid
 *
 * USDA API Quirks:
 * - Some foods have nutrientId directly, others nested in nutrient.id
 * - Amounts may be in 'amount' or 'value' field depending on food type
 * - Optional nutrients (fiber, sugar, sodium) may be missing
 */
export function extractNutrition(usdaData: any): NutritionInfo | null {
  if (!usdaData || !usdaData.foodNutrients) {
    return null;
  }

  const nutrients: Partial<NutritionInfo> = {};
  const nutrientMap: Record<number, keyof NutritionInfo> = {
    1008: "calories", // Energy (kcal)
    1003: "protein", // Protein (g)
    1005: "carbohydrates", // Carbohydrate (g)
    1004: "fat", // Total lipid (g)
    1079: "fiber", // Fiber, total dietary (g)
    2000: "sugar", // Sugars, total (g)
    1093: "sodium", // Sodium (mg)
  };

  for (const nutrient of usdaData.foodNutrients) {
    const nutrientId = nutrient.nutrientId || nutrient.nutrient?.id;
    const field = nutrientMap[nutrientId];

    if (field) {
      nutrients[field] = nutrient.amount || nutrient.value || 0;
    }
  }

  // Extract serving size
  if (usdaData.servingSize) {
    nutrients.servingSize = String(usdaData.servingSize);
  }

  if (usdaData.servingSizeUnit) {
    nutrients.servingUnit = usdaData.servingSizeUnit;
  }

  // Ensure required fields have values
  return {
    calories: nutrients.calories || 0,
    protein: nutrients.protein || 0,
    carbohydrates: nutrients.carbohydrates || 0,
    fat: nutrients.fat || 0,
    fiber: nutrients.fiber,
    sugar: nutrients.sugar,
    sodium: nutrients.sodium,
    servingSize: nutrients.servingSize || "100",
    servingUnit: nutrients.servingUnit || "g",
  };
}

/**
 * Scale nutrition values to match actual food quantity
 *
 * USDA nutrition is per 100g serving by default. This function scales the values
 * to match the user's actual inventory quantity.
 *
 * @param item - Food inventory item with weightInGrams property
 * @param baseNutrition - Base nutrition per serving (usually 100g from USDA)
 * @returns Scaled nutrition matching item's actual weight
 *
 * Algorithm:
 * 1. Parse serving size from baseNutrition (default: 100g)
 * 2. Calculate scaleFactor = actualWeight / servingWeight
 * 3. Multiply all nutrient values by scaleFactor
 * 4. Round to appropriate precision
 *
 * Example:
 * - Base: 200 calories per 100g
 * - Item: 250g
 * - Scale: 250 / 100 = 2.5
 * - Result: 200 * 2.5 = 500 calories
 */
export function calculateNutrition(
  item: UserInventory,
  baseNutrition: NutritionInfo | null,
): NutritionInfo | null {
  if (!baseNutrition || !item.weightInGrams) {
    return baseNutrition;
  }

  // Calculate scale factor based on serving size
  const servingGrams = parseFloat(baseNutrition.servingSize || "100");
  const scaleFactor = item.weightInGrams / servingGrams;

  return {
    calories: Math.round((baseNutrition.calories || 0) * scaleFactor),
    protein: Math.round((baseNutrition.protein || 0) * scaleFactor * 10) / 10,
    carbohydrates:
      Math.round((baseNutrition.carbohydrates || 0) * scaleFactor * 10) / 10,
    fat: Math.round((baseNutrition.fat || 0) * scaleFactor * 10) / 10,
    fiber:
      baseNutrition.fiber !== undefined
        ? Math.round(baseNutrition.fiber * scaleFactor * 10) / 10
        : undefined,
    sugar:
      baseNutrition.sugar !== undefined
        ? Math.round(baseNutrition.sugar * scaleFactor * 10) / 10
        : undefined,
    sodium:
      baseNutrition.sodium !== undefined
        ? Math.round(baseNutrition.sodium * scaleFactor)
        : undefined,
    servingSize: String(item.weightInGrams),
    servingUnit: "g",
  };
}

/**
 * Aggregate nutrition across multiple food items
 *
 * Sums nutrition values for meal planning, category totals, or full inventory analysis.
 * Handles JSON parsing errors gracefully to prevent single item failures from breaking aggregation.
 *
 * @param items - Array of inventory items to aggregate
 * @returns Total nutrition summed across all items
 *
 * Use Cases:
 * - Meal plan totals: Sum all ingredients in a recipe
 * - Daily nutrition: Sum all food consumed in a day
 * - Category analysis: Sum nutrition by food category (via calculateCategoryStats)
 * - Inventory value: Total nutrition available in pantry
 *
 * Error Handling:
 * - Skips items with malformed nutrition JSON
 * - Logs parsing errors for debugging
 * - Continues processing remaining items
 */
export function aggregateNutrition(items: UserInventory[]): NutritionInfo {
  const totals: NutritionInfo = {
    calories: 0,
    protein: 0,
    carbohydrates: 0,
    fat: 0,
    fiber: 0,
    sugar: 0,
    sodium: 0,
    servingSize: String(items.length),
    servingUnit: "items",
  };

  for (const item of items) {
    if (item.nutrition) {
      try {
        const nutrition = JSON.parse(item.nutrition) as NutritionInfo;
        totals.calories = (totals.calories || 0) + (nutrition.calories || 0);
        totals.protein = (totals.protein || 0) + (nutrition.protein || 0);
        totals.carbohydrates =
          (totals.carbohydrates || 0) + (nutrition.carbohydrates || 0);
        totals.fat = (totals.fat || 0) + (nutrition.fat || 0);
        totals.fiber = (totals.fiber || 0) + (nutrition.fiber || 0);
        totals.sugar = (totals.sugar || 0) + (nutrition.sugar || 0);
        totals.sodium = (totals.sodium || 0) + (nutrition.sodium || 0);
      } catch (error) {
        console.error("Failed to parse nutrition for item:", item.id, error);
      }
    }
  }

  // Round to reasonable precision
  return {
    calories: Math.round(totals.calories || 0),
    protein: Math.round((totals.protein || 0) * 10) / 10,
    carbohydrates: Math.round((totals.carbohydrates || 0) * 10) / 10,
    fat: Math.round((totals.fat || 0) * 10) / 10,
    fiber:
      totals.fiber !== undefined
        ? Math.round(totals.fiber * 10) / 10
        : undefined,
    sugar:
      totals.sugar !== undefined
        ? Math.round(totals.sugar * 10) / 10
        : undefined,
    sodium: totals.sodium !== undefined ? Math.round(totals.sodium) : undefined,
    servingSize: totals.servingSize,
    servingUnit: totals.servingUnit,
  };
}

// Calculate nutrition stats by category
export function calculateCategoryStats(
  items: UserInventory[],
): Record<string, NutritionInfo> {
  const categoryMap: Record<string, UserInventory[]> = {};

  // Group items by category
  for (const item of items) {
    const category = item.foodCategory || "Uncategorized";
    if (!categoryMap[category]) {
      categoryMap[category] = [];
    }
    categoryMap[category].push(item);
  }

  // Calculate nutrition for each category
  const stats: Record<string, NutritionInfo> = {};
  for (const [category, categoryItems] of Object.entries(categoryMap)) {
    stats[category] = aggregateNutrition(categoryItems);
  }

  return stats;
}
