/**
 * Fallback Nutrition Data Provider
 *
 * Provides basic nutrition data when USDA API is unavailable.
 * This is a temporary solution to ensure app functionality during API outages.
 *
 * Data sources:
 * - Common food nutrition estimates based on typical values
 * - Basic food categories with average nutritional profiles
 * - Simple keyword matching for food identification
 */

import type {
  USDAFoodItem,
  USDASearchResponse,
  NutritionInfo,
} from "@shared/schema";

// Basic nutrition data for common food categories
const NUTRITION_PROFILES: Record<string, Partial<NutritionInfo>> = {
  // Fruits
  apple: {
    calories: 52,
    protein: 0.3,
    carbohydrates: 14,
    fat: 0.2,
    fiber: 2.4,
    sugar: 10.4,
    sodium: 1,
  },
  banana: {
    calories: 89,
    protein: 1.1,
    carbohydrates: 23,
    fat: 0.3,
    fiber: 2.6,
    sugar: 12.2,
    sodium: 1,
  },
  orange: {
    calories: 47,
    protein: 0.9,
    carbohydrates: 12,
    fat: 0.1,
    fiber: 2.4,
    sugar: 9.4,
    sodium: 0,
  },

  // Vegetables
  tomato: {
    calories: 18,
    protein: 0.9,
    carbohydrates: 3.9,
    fat: 0.2,
    fiber: 1.2,
    sugar: 2.6,
    sodium: 5,
  },
  potato: {
    calories: 77,
    protein: 2,
    carbohydrates: 17,
    fat: 0.1,
    fiber: 2.2,
    sugar: 0.8,
    sodium: 6,
  },
  carrot: {
    calories: 41,
    protein: 0.9,
    carbohydrates: 10,
    fat: 0.2,
    fiber: 2.8,
    sugar: 4.7,
    sodium: 69,
  },
  broccoli: {
    calories: 34,
    protein: 2.8,
    carbohydrates: 7,
    fat: 0.4,
    fiber: 2.6,
    sugar: 1.7,
    sodium: 33,
  },

  // Proteins
  chicken: {
    calories: 165,
    protein: 31,
    carbohydrates: 0,
    fat: 3.6,
    fiber: 0,
    sugar: 0,
    sodium: 74,
  },
  beef: {
    calories: 250,
    protein: 26,
    carbohydrates: 0,
    fat: 15,
    fiber: 0,
    sugar: 0,
    sodium: 72,
  },
  fish: {
    calories: 206,
    protein: 22,
    carbohydrates: 0,
    fat: 12,
    fiber: 0,
    sugar: 0,
    sodium: 61,
  },
  eggs: {
    calories: 155,
    protein: 13,
    carbohydrates: 1.1,
    fat: 11,
    fiber: 0,
    sugar: 1.1,
    sodium: 124,
  },

  // Grains
  bread: {
    calories: 265,
    protein: 9,
    carbohydrates: 49,
    fat: 3.2,
    fiber: 2.7,
    sugar: 5.4,
    sodium: 491,
  },
  rice: {
    calories: 130,
    protein: 2.7,
    carbohydrates: 28,
    fat: 0.3,
    fiber: 0.4,
    sugar: 0.1,
    sodium: 1,
  },
  pasta: {
    calories: 158,
    protein: 5.8,
    carbohydrates: 31,
    fat: 0.9,
    fiber: 1.8,
    sugar: 0.6,
    sodium: 1,
  },
  oatmeal: {
    calories: 68,
    protein: 2.4,
    carbohydrates: 12,
    fat: 1.4,
    fiber: 1.7,
    sugar: 0.5,
    sodium: 49,
  },

  // Dairy
  milk: {
    calories: 42,
    protein: 3.4,
    carbohydrates: 5,
    fat: 1,
    fiber: 0,
    sugar: 5,
    sodium: 44,
  },
  cheese: {
    calories: 402,
    protein: 25,
    carbohydrates: 1.3,
    fat: 33,
    fiber: 0,
    sugar: 0.5,
    sodium: 621,
  },
  yogurt: {
    calories: 59,
    protein: 10,
    carbohydrates: 3.6,
    fat: 0.4,
    fiber: 0,
    sugar: 3.2,
    sodium: 36,
  },
  butter: {
    calories: 717,
    protein: 0.9,
    carbohydrates: 0.1,
    fat: 81,
    fiber: 0,
    sugar: 0.1,
    sodium: 11,
  },

  // Default for unknown foods
  default: {
    calories: 100,
    protein: 3,
    carbohydrates: 15,
    fat: 3,
    fiber: 2,
    sugar: 5,
    sodium: 100,
  },
};

/**
 * Find the best matching nutrition profile for a food name
 */
function findBestMatch(foodName: string): Partial<NutritionInfo> {
  const normalized = foodName.toLowerCase();

  // Direct match
  for (const [key, nutrition] of Object.entries(NUTRITION_PROFILES)) {
    if (key !== "default" && normalized.includes(key)) {
      return nutrition;
    }
  }

  // Category matching
  const categories = {
    fruit: ["apple", "banana", "orange"],
    vegetable: ["tomato", "potato", "carrot", "broccoli"],
    meat: ["chicken", "beef", "fish"],
    dairy: ["milk", "cheese", "yogurt", "butter"],
    grain: ["bread", "rice", "pasta", "oatmeal"],
  };

  for (const [category, foods] of Object.entries(categories)) {
    if (normalized.includes(category)) {
      // Return average of category
      const categoryFoods = foods.map((f) => NUTRITION_PROFILES[f]);
      return averageNutrition(categoryFoods);
    }
  }

  return NUTRITION_PROFILES.default;
}

/**
 * Calculate average nutrition values from multiple profiles
 */
function averageNutrition(
  profiles: Partial<NutritionInfo>[],
): Partial<NutritionInfo> {
  const result: Partial<NutritionInfo> = {};
  const keys = Object.keys(profiles[0]) as (keyof NutritionInfo)[];

  for (const key of keys) {
    const values = profiles
      .map((p) => p[key])
      .filter((v) => v !== undefined) as number[];
    if (values.length > 0) {
      (result as any)[key] = Math.round(
        values.reduce((a, b) => a + b, 0) / values.length,
      );
    }
  }

  return result;
}

/**
 * Generate a mock FDC ID based on food name
 */
function generateFdcId(foodName: string): string {
  // Generate a consistent ID based on the food name
  let hash = 0;
  for (let i = 0; i < foodName.length; i++) {
    const char = foodName.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `MOCK-${Math.abs(hash)}`;
}

/**
 * Create a USDAFoodItem from fallback data
 */
function createFallbackFoodItem(
  foodName: string,
  nutrition: Partial<NutritionInfo>,
): USDAFoodItem {
  const fdcId = generateFdcId(foodName);

  return {
    fdcId,
    description: foodName,
    dataType: "Fallback",
    brandOwner: "",
    servingSize: 100,
    servingSizeUnit: "g",
    ingredients: "",
    foodCategory: "General",
    foodNutrients: [],
    nutrition: {
      servingSize: "100",
      servingUnit: "g",
      calories: nutrition.calories || 0,
      protein: nutrition.protein || 0,
      carbohydrates: nutrition.carbohydrates || 0,
      fat: nutrition.fat || 0,
      fiber: nutrition.fiber || 0,
      sugar: nutrition.sugar || 0,
      sodium: nutrition.sodium || 0,
      saturatedFat: nutrition.saturatedFat,
      transFat: nutrition.transFat,
      cholesterol: nutrition.cholesterol,
      calcium: nutrition.calcium,
      iron: nutrition.iron,
      vitaminA: nutrition.vitaminA,
      vitaminC: nutrition.vitaminC,
      vitaminD: nutrition.vitaminD,
    },
  };
}

/**
 * Fallback search function that returns estimated nutrition data
 */
export function fallbackSearch(
  query: string,
  pageSize: number = 20,
): USDASearchResponse {
  const nutrition = findBestMatch(query);

  // Generate multiple variations of the search term for variety
  const variations = [
    query,
    `Fresh ${query}`,
    `Organic ${query}`,
    `Raw ${query}`,
    `Cooked ${query}`,
  ].slice(0, Math.min(pageSize, 5));

  const foods = variations.map((name) =>
    createFallbackFoodItem(name, nutrition),
  );

  return {
    foods,
    totalHits: foods.length,
    currentPage: 1,
    totalPages: 1,
  };
}

/**
 * Get fallback nutrition data by FDC ID
 */
export function getFallbackFoodById(fdcId: string): USDAFoodItem | null {
  // For mock IDs, extract the food name from the ID if possible
  if (fdcId.startsWith("MOCK-")) {
    // Return a generic food item since we can't reverse the hash
    return createFallbackFoodItem("Food Item", NUTRITION_PROFILES.default);
  }

  return null;
}

/**
 * Check if we should use fallback data
 * Returns true if USDA API is known to be down or unavailable
 */
export function shouldUseFallback(): boolean {
  // You could implement more sophisticated logic here, such as:
  // - Checking a status endpoint
  // - Maintaining a circuit breaker pattern
  // - Time-based fallback (e.g., during known maintenance windows)

  // For now, we'll use an environment variable to control this
  return process.env.USE_NUTRITION_FALLBACK === "true";
}

// Export a flag indicating this is fallback data
export const IS_FALLBACK_DATA = true;
