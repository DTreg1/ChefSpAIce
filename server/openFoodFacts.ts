/**
 * OpenFoodFacts API Integration
 * 
 * Provides fallback nutrition data lookup when USDA FoodData Central
 * returns incomplete or missing data. OpenFoodFacts is a free, open-source
 * food product database with crowdsourced nutrition information.
 * 
 * API Details:
 * - Base URL: https://world.openfoodfacts.org
 * - No authentication required (public API)
 * - Rate limiting: Be respectful, use User-Agent header
 * - Documentation: https://world.openfoodfacts.org/data
 */

import { ApiError } from "./apiError";
import type { NutritionInfo } from "@shared/schema";

/** OpenFoodFacts API base URL */
const OFF_API_BASE = "https://world.openfoodfacts.org";

/** User agent for API requests (required by OpenFoodFacts) */
const USER_AGENT = "PantryManager/1.0 (+https://pantrymanager.app)";

/**
 * OpenFoodFacts product structure (subset of fields we use)
 */
interface OFFProduct {
  code: string; // Barcode
  product_name?: string;
  generic_name?: string;
  brands?: string;
  categories?: string;
  quantity?: string;
  serving_size?: string;
  serving_quantity?: number;
  
  // Nutrition facts per 100g
  nutriments?: {
    energy_100g?: number;           // Energy in kJ
    "energy-kcal_100g"?: number;    // Energy in kcal
    proteins_100g?: number;          // Protein in g
    carbohydrates_100g?: number;    // Carbs in g
    sugars_100g?: number;            // Sugar in g
    fat_100g?: number;               // Fat in g
    "saturated-fat_100g"?: number;  // Saturated fat in g
    fiber_100g?: number;             // Fiber in g
    sodium_100g?: number;            // Sodium in mg (sometimes g)
    salt_100g?: number;              // Salt in g
  };
  
  // Nutrition facts per serving
  nutriments_per_serving?: {
    energy_serving?: number;
    "energy-kcal_serving"?: number;
    proteins_serving?: number;
    carbohydrates_serving?: number;
    sugars_serving?: number;
    fat_serving?: number;
    fiber_serving?: number;
    sodium_serving?: number;
  };
  
  // Additional metadata
  ingredients_text?: string;
  allergens?: string;
  traces?: string;
  stores?: string;
  countries?: string;
  image_url?: string;
  image_small_url?: string;
  image_front_url?: string;
  image_nutrition_url?: string;
}

/**
 * OpenFoodFacts API response structure
 */
interface OFFResponse {
  status: number; // 1 = found, 0 = not found
  status_verbose?: string;
  product?: OFFProduct;
  code?: string;
}

/**
 * Search response from OpenFoodFacts
 */
interface OFFSearchResponse {
  count: number;
  page: number;
  page_count: number;
  page_size: number;
  products: OFFProduct[];
}

/**
 * Convert OpenFoodFacts nutrition data to our NutritionInfo format
 */
function extractOFFNutrition(product: OFFProduct): NutritionInfo | undefined {
  if (!product.nutriments) {
    return undefined;
  }
  
  const nutrients = product.nutriments;
  
  // Try to get per-serving data first, fall back to per-100g
  let calories = 0;
  let protein = 0;
  let carbs = 0;
  let fat = 0;
  let fiber: number | undefined;
  let sugar: number | undefined;
  let sodium: number | undefined;
  let servingSize = "100";
  let servingUnit = "g";
  
  // Check if we have per-serving data
  if (product.nutriments_per_serving?.["energy-kcal_serving"]) {
    const perServing = product.nutriments_per_serving;
    calories = perServing["energy-kcal_serving"] || 0;
    protein = perServing.proteins_serving || 0;
    carbs = perServing.carbohydrates_serving || 0;
    fat = perServing.fat_serving || 0;
    fiber = perServing.fiber_serving;
    sugar = perServing.sugars_serving;
    sodium = perServing.sodium_serving;
    
    // Try to parse serving size
    if (product.serving_size) {
      const sizeMatch = product.serving_size.match(/(\d+(?:\.\d+)?)\s*(\w+)/);
      if (sizeMatch) {
        servingSize = sizeMatch[1];
        servingUnit = sizeMatch[2];
      }
    } else if (product.serving_quantity) {
      servingSize = product.serving_quantity.toString();
    }
  } else if (nutrients["energy-kcal_100g"] !== undefined) {
    // Use per-100g data
    calories = nutrients["energy-kcal_100g"] || 0;
    protein = nutrients.proteins_100g || 0;
    carbs = nutrients.carbohydrates_100g || 0;
    fat = nutrients.fat_100g || 0;
    fiber = nutrients.fiber_100g;
    sugar = nutrients.sugars_100g;
    
    // Convert sodium from g to mg if needed
    if (nutrients.sodium_100g !== undefined) {
      sodium = nutrients.sodium_100g;
      // If value is very small, it's likely in grams - convert to mg
      if (sodium < 10) {
        sodium = sodium * 1000;
      }
    }
  }
  
  // Validate that we have at least some nutrition data
  if (calories === 0 && protein === 0 && carbs === 0 && fat === 0) {
    return undefined;
  }
  
  return {
    calories,
    protein,
    carbs,
    fat,
    fiber,
    sugar,
    sodium,
    servingSize,
    servingUnit,
  };
}

/**
 * Search OpenFoodFacts by barcode
 * 
 * @param barcode - UPC/EAN barcode
 * @returns Product data or null if not found
 */
export async function searchOFFByBarcode(barcode: string): Promise<{
  name: string;
  brand?: string;
  category?: string;
  nutrition?: NutritionInfo;
  ingredients?: string;
  imageUrl?: string;
} | null> {
  try {
    const cleanBarcode = barcode.replace(/\D/g, '');
    if (!cleanBarcode) {
      return null;
    }
    
    const response = await fetch(`${OFF_API_BASE}/api/v2/product/${cleanBarcode}.json`, {
      headers: {
        'User-Agent': USER_AGENT,
      },
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        return null; // Product not found
      }
      throw new ApiError(
        `OpenFoodFacts API error: ${response.status} ${response.statusText}`,
        response.status
      );
    }
    
    const data: OFFResponse = await response.json();
    
    if (data.status === 0 || !data.product) {
      return null; // Product not found
    }
    
    const product = data.product;
    const nutrition = extractOFFNutrition(product);
    
    return {
      name: product.product_name || product.generic_name || 'Unknown Product',
      brand: product.brands,
      category: product.categories?.split(',')[0], // Take first category
      nutrition,
      ingredients: product.ingredients_text,
      imageUrl: product.image_front_url || product.image_url,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    console.error('OpenFoodFacts barcode search error:', error);
    return null;
  }
}

/**
 * Search OpenFoodFacts by product name
 * 
 * @param query - Product name/description to search
 * @param limit - Maximum results (default 10)
 * @returns Array of matching products
 */
export async function searchOFFByName(
  query: string,
  limit = 10
): Promise<Array<{
  barcode?: string;
  name: string;
  brand?: string;
  category?: string;
  nutrition?: NutritionInfo;
  ingredients?: string;
  imageUrl?: string;
}>> {
  try {
    const params = new URLSearchParams({
      search_terms: query,
      search_simple: '1',
      action: 'process',
      json: '1',
      page_size: limit.toString(),
      page: '1',
      fields: 'code,product_name,generic_name,brands,categories,nutriments,nutriments_per_serving,serving_size,serving_quantity,ingredients_text,image_front_url,image_url',
    });
    
    const response = await fetch(`${OFF_API_BASE}/cgi/search.pl?${params}`, {
      headers: {
        'User-Agent': USER_AGENT,
      },
    });
    
    if (!response.ok) {
      throw new ApiError(
        `OpenFoodFacts search error: ${response.status} ${response.statusText}`,
        response.status
      );
    }
    
    const data: OFFSearchResponse = await response.json();
    
    if (!data.products || data.products.length === 0) {
      return [];
    }
    
    return data.products
      .map(product => {
        const nutrition = extractOFFNutrition(product);
        return {
          barcode: product.code,
          name: product.product_name || product.generic_name || 'Unknown Product',
          brand: product.brands,
          category: product.categories?.split(',')[0],
          nutrition,
          ingredients: product.ingredients_text,
          imageUrl: product.image_front_url || product.image_url,
        };
      })
      .filter(p => p.name !== 'Unknown Product'); // Filter out products without names
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    console.error('OpenFoodFacts name search error:', error);
    return [];
  }
}

/**
 * Get combined nutrition data from USDA and OpenFoodFacts
 * Tries USDA first, falls back to OpenFoodFacts if USDA data is incomplete
 * 
 * @param usdaNutrition - Nutrition data from USDA (may be incomplete)
 * @param barcode - Product barcode for OpenFoodFacts lookup
 * @param productName - Product name for fallback search
 * @returns Combined nutrition data or undefined
 */
export async function getCombinedNutrition(
  usdaNutrition: NutritionInfo | undefined,
  barcode?: string,
  productName?: string
): Promise<NutritionInfo | undefined> {
  // If USDA data is complete, use it
  if (usdaNutrition && 
      usdaNutrition.calories !== undefined && usdaNutrition.calories > 0 && 
      ((usdaNutrition.protein !== undefined && usdaNutrition.protein > 0) || 
       (usdaNutrition.carbs !== undefined && usdaNutrition.carbs > 0) || 
       (usdaNutrition.fat !== undefined && usdaNutrition.fat > 0))) {
    return usdaNutrition;
  }
  
  // Try OpenFoodFacts by barcode first
  if (barcode) {
    const offData = await searchOFFByBarcode(barcode);
    if (offData?.nutrition) {
      console.log(`Using OpenFoodFacts nutrition for barcode ${barcode}`);
      return offData.nutrition;
    }
  }
  
  // Try OpenFoodFacts by name
  if (productName) {
    const offResults = await searchOFFByName(productName, 1);
    if (offResults.length > 0 && offResults[0].nutrition) {
      console.log(`Using OpenFoodFacts nutrition for "${productName}"`);
      return offResults[0].nutrition;
    }
  }
  
  // Return USDA data even if incomplete (better than nothing)
  return usdaNutrition;
}

/**
 * Enrich product data with OpenFoodFacts information
 * Used when USDA data is missing key fields
 * 
 * @param product - Partial product data
 * @returns Enriched product data
 */
export async function enrichWithOFF(product: {
  name?: string;
  barcode?: string;
  brand?: string;
  nutrition?: NutritionInfo;
  ingredients?: string;
  imageUrl?: string;
}): Promise<{
  name?: string;
  barcode?: string;
  brand?: string;
  nutrition?: NutritionInfo;
  ingredients?: string;
  imageUrl?: string;
}> {
  // Skip if we already have complete data
  if (product.nutrition && product.ingredients && product.imageUrl) {
    return product;
  }
  
  let offData = null;
  
  // Try barcode first
  if (product.barcode) {
    offData = await searchOFFByBarcode(product.barcode);
  }
  
  // Fallback to name search
  if (!offData && product.name) {
    const results = await searchOFFByName(product.name, 1);
    if (results.length > 0) {
      offData = results[0];
    }
  }
  
  if (!offData) {
    return product;
  }
  
  // Merge OpenFoodFacts data with existing product data
  return {
    name: product.name || offData.name,
    barcode: product.barcode || offData.barcode,
    brand: product.brand || offData.brand,
    nutrition: product.nutrition || offData.nutrition,
    ingredients: product.ingredients || offData.ingredients,
    imageUrl: product.imageUrl || offData.imageUrl,
  };
}