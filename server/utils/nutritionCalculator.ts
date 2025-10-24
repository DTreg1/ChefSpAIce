import type { FoodItem, NutritionInfo } from "@shared/schema";

// Extract nutrition information from USDA data
export function extractNutrition(usdaData: any): NutritionInfo | null {
  if (!usdaData || !usdaData.foodNutrients) {
    return null;
  }

  const nutrients: Partial<NutritionInfo> = {};
  const nutrientMap: Record<number, keyof NutritionInfo> = {
    1008: 'calories',    // Energy (kcal)
    1003: 'protein',     // Protein (g)
    1005: 'carbs',       // Carbohydrate (g)
    1004: 'fat',         // Total lipid (g)
    1079: 'fiber',       // Fiber, total dietary (g)
    2000: 'sugar',       // Sugars, total (g)
    1093: 'sodium',      // Sodium (mg)
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
    carbs: nutrients.carbs || 0,
    fat: nutrients.fat || 0,
    fiber: nutrients.fiber,
    sugar: nutrients.sugar,
    sodium: nutrients.sodium,
    servingSize: nutrients.servingSize,
    servingUnit: nutrients.servingUnit,
  };
}

// Calculate nutrition for a food item based on its weight/quantity
export function calculateNutrition(
  item: FoodItem, 
  baseNutrition: NutritionInfo | null
): NutritionInfo | null {
  if (!baseNutrition || !item.weightInGrams) {
    return baseNutrition;
  }

  // Calculate scale factor based on serving size
  const servingGrams = parseFloat(baseNutrition.servingSize || "100");
  const scaleFactor = item.weightInGrams / servingGrams;

  return {
    calories: Math.round(baseNutrition.calories * scaleFactor),
    protein: Math.round(baseNutrition.protein * scaleFactor * 10) / 10,
    carbs: Math.round(baseNutrition.carbs * scaleFactor * 10) / 10,
    fat: Math.round(baseNutrition.fat * scaleFactor * 10) / 10,
    fiber: baseNutrition.fiber ? Math.round(baseNutrition.fiber * scaleFactor * 10) / 10 : undefined,
    sugar: baseNutrition.sugar ? Math.round(baseNutrition.sugar * scaleFactor * 10) / 10 : undefined,
    sodium: baseNutrition.sodium ? Math.round(baseNutrition.sodium * scaleFactor) : undefined,
    servingSize: String(item.weightInGrams),
    servingUnit: "g",
  };
}

// Aggregate nutrition for multiple items
export function aggregateNutrition(items: FoodItem[]): NutritionInfo {
  const totals: NutritionInfo = {
    calories: 0,
    protein: 0,
    carbs: 0,
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
        totals.calories += nutrition.calories || 0;
        totals.protein += nutrition.protein || 0;
        totals.carbs += nutrition.carbs || 0;
        totals.fat += nutrition.fat || 0;
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
    calories: Math.round(totals.calories),
    protein: Math.round(totals.protein * 10) / 10,
    carbs: Math.round(totals.carbs * 10) / 10,
    fat: Math.round(totals.fat * 10) / 10,
    fiber: totals.fiber ? Math.round(totals.fiber * 10) / 10 : undefined,
    sugar: totals.sugar ? Math.round(totals.sugar * 10) / 10 : undefined,
    sodium: totals.sodium ? Math.round(totals.sodium) : undefined,
    servingSize: totals.servingSize,
    servingUnit: totals.servingUnit,
  };
}

// Calculate nutrition stats by category
export function calculateCategoryStats(items: FoodItem[]): Record<string, NutritionInfo> {
  const categoryMap: Record<string, FoodItem[]> = {};
  
  // Group items by category
  for (const item of items) {
    const category = item.foodCategory || 'Uncategorized';
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