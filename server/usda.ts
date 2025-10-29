/**
 * USDA FoodData Central API Integration
 * 
 * Provides nutrition data lookup and food search functionality using USDA's FoodData Central API.
 * Integrates standardized nutrition information for food items in the pantry management system.
 * 
 * API Details:
 * - Base URL: https://api.nal.usda.gov/fdc/v1
 * - Authentication: API key required (USDA_FDC_API_KEY environment variable)
 * - Documentation: https://fdc.nal.usda.gov/api-guide.html
 * 
 * Endpoints Used:
 * - GET /foods/search - Search foods by name with filtering options
 * - GET /food/{fdcId} - Get detailed nutrition data for specific food
 * 
 * Data Types (dataType field):
 * - Foundation: Lab-analyzed reference foods (most accurate, scientifically validated)
 * - SR Legacy: USDA Standard Reference legacy data (comprehensive, reliable)
 * - Survey Foods: FNDDS survey foods (what Americans actually eat)
 * - Branded: Commercial products (variable quality, brand-specific)
 * 
 * Nutrition Data Sources:
 * - labelNutrients: Branded foods (from nutrition labels)
 * - foodNutrients: Foundation/SR Legacy foods (from lab analysis)
 * - Nutrient IDs: Standard USDA nutrient numbers (208=calories, 203=protein, etc.)
 * 
 * Rate Limits:
 * - No official limit documented, but best practice: cache responses
 * - Failed requests return appropriate HTTP status codes (401, 429, 500, etc.)
 * 
 * Caching Strategy:
 * - Responses should be cached in fdcCache table via storage layer
 * - Nutrition data rarely changes, safe to cache long-term
 * - Cache key: fdcId (unique food identifier)
 * 
 * Error Handling:
 * - All API errors wrapped in ApiError with descriptive messages
 * - Network failures logged and rethrown
 * - Invalid/missing nutrition data returns undefined or null
 * - Validation ensures data quality (rejects all-zero macros, suspicious values)
 * 
 * Data Validation:
 * - Rejects foods where all macronutrients are zero
 * - Validates food-specific expectations (oils should have fat, meat should have protein)
 * - Warns on suspicious data patterns via console.warn
 * 
 * @module server/usda
 */

import type { USDAFoodItem, USDASearchResponse, NutritionInfo } from "@shared/schema";
import { ApiError } from "./apiError";

/** USDA FoodData Central API base URL */
const USDA_API_BASE = "https://api.nal.usda.gov/fdc/v1";

/** API key from environment (required for all requests) */
const API_KEY = process.env.USDA_FDC_API_KEY;


interface FDCFoodNutrient {
  nutrientNumber?: string;
  nutrientName?: string;
  value?: number;
  amount?: number;
  unitName?: string;
  nutrient?: {
    number: string;
    name: string;
    unitName: string;
  };
}

interface FDCLabelNutrients {
  fat?: { value: number };
  saturatedFat?: { value: number };
  transFat?: { value: number };
  cholesterol?: { value: number };
  sodium?: { value: number };
  carbohydrates?: { value: number };
  fiber?: { value: number };
  sugars?: { value: number };
  protein?: { value: number };
  calcium?: { value: number };
  iron?: { value: number };
  calories?: { value: number };
}

interface FDCFood {
  fdcId: number;
  description: string;
  dataType: string;
  brandOwner?: string;
  gtinUpc?: string;
  ingredients?: string;
  foodCategory?: string | { id: number; code: string; description: string };
  brandedFoodCategory?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  householdServingFullText?: string;
  foodNutrients?: FDCFoodNutrient[];
  labelNutrients?: FDCLabelNutrients;
}

interface FDCSearchResult {
  totalHits: number;
  currentPage: number;
  totalPages: number;
  foods: FDCFood[];
}

/**
 * Validate nutrition data quality
 * 
 * Ensures nutrition data is valid and not suspiciously incomplete.
 * Catches common data quality issues from USDA API responses.
 * 
 * Validation Rules:
 * - Rejects if all major macronutrients are zero (likely incomplete data)
 * - Validates food-type specific expectations:
 *   - Oils/butter/fats must have fat content > 0
 *   - Meat/chicken/fish/eggs must have protein > 0 (if calories > 0)
 * 
 * @param nutrition - Extracted nutrition information to validate
 * @param foodDescription - Food name/description for context in warnings
 * @returns true if data appears valid, false if suspicious
 * 
 * Side Effects:
 * - Logs warnings to console when suspicious data detected
 * 
 * @example
 * const nutrition = { calories: 0, protein: 0, carbs: 0, fat: 0 };
 * isNutritionDataValid(nutrition, "apple"); // false - all zeros
 * 
 * @example
 * const nutrition = { calories: 120, protein: 0, carbs: 0, fat: 14 };
 * isNutritionDataValid(nutrition, "olive oil"); // true - fat content present
 */
export function isNutritionDataValid(nutrition: NutritionInfo, foodDescription: string): boolean {
  // Check if all major macronutrients are zero (suspicious)
  const allMacrosZero = nutrition.calories === 0 && 
                        nutrition.protein === 0 && 
                        nutrition.carbs === 0 && 
                        nutrition.fat === 0;
  
  if (allMacrosZero) {
    console.warn(`Suspicious nutrition data for "${foodDescription}": all macronutrients are zero`);
    return false;
  }

  // Check for specific food types that should have certain nutrients
  const descLower = foodDescription.toLowerCase();
  
  // Oils and fats should have significant fat content
  if ((descLower.includes('oil') || descLower.includes('butter') || descLower.includes('lard')) && 
      nutrition.fat === 0) {
    console.warn(`Invalid nutrition data for "${foodDescription}": oil/fat product with zero fat`);
    return false;
  }

  // Protein-rich foods should have protein
  if ((descLower.includes('meat') || descLower.includes('chicken') || 
       descLower.includes('beef') || descLower.includes('pork') || 
       descLower.includes('fish') || descLower.includes('egg')) && 
      nutrition.protein === 0 && nutrition.calories && nutrition.calories > 0) {
    console.warn(`Invalid nutrition data for "${foodDescription}": protein food with zero protein`);
    return false;
  }

  return true;
}

/**
 * Extract nutrition information from FDC food data
 * 
 * Handles multiple nutrition data formats from USDA API:
 * 1. labelNutrients (Branded Foods) - from nutrition labels
 * 2. foodNutrients (Foundation/SR Legacy) - from lab analysis
 * 
 * Nutrient Number Mapping (USDA Standard):
 * - 208: Energy (calories)
 * - 203: Protein (g)
 * - 205: Carbohydrates (g)
 * - 204: Total lipid/fat (g)
 * - 291: Fiber (g)
 * - 269: Sugars (g)
 * - 307: Sodium (mg)
 * 
 * @param food - FDC food object from API response
 * @returns Standardized nutrition info or undefined if invalid/missing
 * 
 * Data Quality:
 * - Validates extracted data using isNutritionDataValid()
 * - Returns undefined for invalid or incomplete data
 * - Handles both 'value' and 'amount' field names (API inconsistency)
 * 
 * @private
 */
function extractNutritionInfo(food: FDCFood): NutritionInfo | undefined {
  // First try labelNutrients (Branded Foods)
  if (food.labelNutrients) {
    const label = food.labelNutrients;
    const nutrition: NutritionInfo = {
      calories: label.calories?.value || 0,
      protein: label.protein?.value || 0,
      carbs: label.carbohydrates?.value || 0,
      fat: label.fat?.value || 0,
      fiber: label.fiber?.value,
      sugar: label.sugars?.value,
      sodium: label.sodium?.value,
      servingSize: food.servingSize?.toString() || "100",
      servingUnit: food.servingSizeUnit || "g",
    };

    // Validate the nutrition data
    if (!isNutritionDataValid(nutrition, food.description)) {
      return undefined;
    }

    return nutrition;
  }

  // Fall back to foodNutrients (Foundation/SR Legacy/Survey Foods and Branded Foods)
  if (food.foodNutrients && food.foodNutrients.length > 0) {
    const nutrients = food.foodNutrients;
    
    const getNutrientValue = (nutrientNumbers: string[]): number | undefined => {
      for (const num of nutrientNumbers) {
        const nutrient = nutrients.find(n => {
          const number = n.nutrientNumber || n.nutrient?.number;
          return number === num;
        });
        // Support both 'value' (search results) and 'amount' (detail fetches)
        const quantity = nutrient?.value ?? nutrient?.amount;
        if (quantity !== undefined) {
          return quantity;
        }
      }
      return undefined;
    };

    const calories = getNutrientValue(["208"]) || 0;
    const protein = getNutrientValue(["203"]) || 0;
    const carbs = getNutrientValue(["205"]) || 0;
    const fat = getNutrientValue(["204"]) || 0;
    const fiber = getNutrientValue(["291"]);
    const sugar = getNutrientValue(["269"]);
    const sodium = getNutrientValue(["307"]);

    const nutrition: NutritionInfo = {
      calories,
      protein,
      carbs,
      fat,
      fiber,
      sugar,
      sodium,
      servingSize: "100",
      servingUnit: "g",
    };

    // Validate the nutrition data
    if (!isNutritionDataValid(nutrition, food.description)) {
      return undefined;
    }

    return nutrition;
  }

  return undefined;
}

/**
 * Map FDC API response to application's USDAFoodItem format
 * 
 * Transforms USDA API response structure into consistent internal format.
 * Handles multiple foodCategory formats (string vs object).
 * 
 * @param food - Raw food data from USDA FDC API
 * @returns Standardized USDAFoodItem for storage/display
 * 
 * Field Mapping:
 * - fdcId: Unique USDA food identifier
 * - description: Food name/description
 * - dataType: Food data type (Foundation, SR Legacy, Branded, etc.)
 * - foodCategory: Extracted from object or string format
 * - foodNutrients: Mapped from extracted nutrition info (if valid)
 * 
 * Nutrition Data:
 * - Only included if extractNutritionInfo() returns valid data
 * - Formatted as array of nutrient objects with standard IDs
 * - Includes calories, protein, carbs, fat, and optional fiber/sugar/sodium
 * 
 * @private
 */
function mapFDCFoodToUSDAItem(food: FDCFood): USDAFoodItem {
  // Extract foodCategory - handle both string and object formats
  let foodCategory: string | undefined;
  if (typeof food.foodCategory === 'object' && food.foodCategory !== null) {
    foodCategory = food.foodCategory.description;
  } else if (typeof food.foodCategory === 'string') {
    foodCategory = food.foodCategory;
  } else {
    foodCategory = food.brandedFoodCategory;
  }

  // Extract nutrition info if available
  const nutritionInfo = extractNutritionInfo(food);

  return {
    fdcId: food.fdcId,
    description: food.description,
    dataType: food.dataType,
    brandOwner: food.brandOwner,
    gtinUpc: food.gtinUpc,
    ingredients: food.ingredients,
    foodCategory: foodCategory,
    servingSize: food.servingSize,
    servingSizeUnit: food.servingSizeUnit,
    // Add foodNutrients if we have nutrition data
    ...(nutritionInfo && {
      foodNutrients: [
        { nutrientId: 1008, nutrientName: 'Energy', unitName: 'kcal', value: nutritionInfo.calories || 0 },
        { nutrientId: 1003, nutrientName: 'Protein', unitName: 'g', value: nutritionInfo.protein || 0 },
        { nutrientId: 1005, nutrientName: 'Carbohydrates', unitName: 'g', value: nutritionInfo.carbs || 0 },
        { nutrientId: 1004, nutrientName: 'Total lipid (fat)', unitName: 'g', value: nutritionInfo.fat || 0 },
        ...(nutritionInfo.fiber !== undefined ? [{ nutrientId: 1079, nutrientName: 'Fiber', unitName: 'g', value: nutritionInfo.fiber }] : []),
        ...(nutritionInfo.sugar !== undefined ? [{ nutrientId: 2000, nutrientName: 'Sugars', unitName: 'g', value: nutritionInfo.sugar }] : []),
        ...(nutritionInfo.sodium !== undefined ? [{ nutrientId: 1093, nutrientName: 'Sodium', unitName: 'mg', value: nutritionInfo.sodium }] : []),
      ]
    }),
  };
}

/**
 * Search options for USDA FoodData Central API
 */
export interface USDASearchOptions {
  query: string;                    // Search query (food name/description)
  pageSize?: number;                 // Results per page (default: 20, max: 50)
  pageNumber?: number;               // Page number (1-indexed, default: 1)
  dataType?: string[];              // Filter by data types (Foundation, SR Legacy, etc.)
  sortBy?: 'dataType.keyword' | 'lowercaseDescription.keyword' | 'fdcId' | 'publishedDate';
  sortOrder?: 'asc' | 'desc';       // Sort direction
  brandOwner?: string[];            // Filter by brand (for Branded foods)
}

/**
 * Search USDA FoodData Central database
 * 
 * Queries USDA API for foods matching search criteria with flexible filtering options.
 * Results are ranked by USDA's relevance algorithm.
 * 
 * @param options - Search parameters (object or string for backward compatibility)
 * @returns Search results with pagination metadata
 * 
 * Search Behavior:
 * - Fuzzy matching: Partial word matches supported
 * - Ranking: USDA's relevance algorithm (not customizable)
 * - Pagination: Default 20 results per page, max 50
 * - Filtering: Can restrict by dataType, brandOwner
 * 
 * Data Type Recommendations:
 * - Generic items: ['Foundation', 'SR Legacy'] - most accurate
 * - Branded products: ['Branded'] - specific to brands
 * - All data: omit dataType filter
 * 
 * Error Handling:
 * - 401/403: API key invalid or missing
 * - 400: Invalid search parameters
 * - 429: Rate limit exceeded (retry after delay)
 * - 500+: USDA service unavailable
 * - Network errors: Logged and rethrown as ApiError
 * 
 * @throws {ApiError} On API authentication, validation, or network failures
 * 
 * @example
 * // Simple search (backward compatible)
 * const results = await searchUSDAFoods("apple");
 * 
 * @example
 * // Advanced search with filters
 * const results = await searchUSDAFoods({
 *   query: "chicken breast",
 *   dataType: ['Foundation', 'SR Legacy'],
 *   pageSize: 10,
 *   sortBy: 'lowercaseDescription.keyword'
 * });
 */
export async function searchUSDAFoods(
  options: USDASearchOptions | string
): Promise<USDASearchResponse> {
  if (!API_KEY) {
    throw new Error("USDA_FDC_API_KEY is not configured");
  }

  // Handle backward compatibility - if just a string is passed, treat it as query
  let searchOptions: USDASearchOptions;
  if (typeof options === 'string') {
    searchOptions = { query: options, pageSize: 20, pageNumber: 1 };
  } else {
    searchOptions = {
      pageSize: 20,
      pageNumber: 1,
      ...options
    };
  }

  const { query, pageSize, pageNumber, dataType, sortBy, sortOrder, brandOwner } = searchOptions;

  try {
    const url = new URL(`${USDA_API_BASE}/foods/search`);
    url.searchParams.append('api_key', API_KEY);
    url.searchParams.append('query', query);
    url.searchParams.append('pageSize', (pageSize || 20).toString());
    url.searchParams.append('pageNumber', (pageNumber || 1).toString());

    // Add each dataType as a separate parameter for FDC API array handling
    if (dataType && dataType.length > 0) {
      dataType.forEach(type => {
        url.searchParams.append('dataType', type);
      });
    }

    if (sortBy) {
      url.searchParams.append('sortBy', sortBy);
    }

    if (sortOrder) {
      url.searchParams.append('sortOrder', sortOrder);
    }

    // Add each brandOwner as a separate parameter for FDC API array handling
    if (brandOwner && brandOwner.length > 0) {
      brandOwner.forEach(brand => {
        url.searchParams.append('brandOwner', brand);
      });
    }

    const response = await fetch(url);

    if (!response.ok) {
      console.error("USDA API error:", {
        status: response.status,
        statusText: response.statusText,
        query,
        pageSize,
        pageNumber
      });
      
      if (response.status === 401 || response.status === 403) {
        throw new ApiError("USDA API authentication failed. Please check your API key.", 401);
      } else if (response.status === 400) {
        throw new ApiError("Invalid request to USDA API. Please check search parameters.", 400);
      } else if (response.status === 429) {
        throw new ApiError("USDA API rate limit exceeded. Please try again later.", 429);
      } else if (response.status >= 500) {
        throw new ApiError("USDA API service is temporarily unavailable.", 503);
      }
      
      throw new ApiError(`USDA API error: ${response.status} ${response.statusText}`, response.status);
    }

    const data: FDCSearchResult = await response.json();

    return {
      foods: data.foods.map(mapFDCFoodToUSDAItem),
      totalHits: data.totalHits,
      currentPage: data.currentPage,
      totalPages: data.totalPages,
      pageList: data.totalPages ? Array.from({ length: Math.min(10, data.totalPages) }, (_, i) => i + 1) : [1],
      foodSearchCriteria: {
        query: typeof options === 'string' ? options : options.query,
        pageNumber: data.currentPage || 1,
        pageSize: typeof options === 'string' ? 25 : (options.pageSize || 25),
      },
    };
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }
    console.error("USDA API error:", error);
    throw new ApiError("Failed to search USDA database", 500);
  }
}

/**
 * Get detailed food information by FDC ID
 * 
 * Fetches complete nutrition data for a specific food using its unique FDC identifier.
 * More detailed than search results, includes full nutrient breakdown.
 * 
 * @param fdcId - USDA FoodData Central ID (unique food identifier)
 * @returns Complete food data with nutrition info, or null if not found
 * 
 * Use Cases:
 * - Fetching details after search (user selected a result)
 * - Retrieving cached food data by fdcId
 * - Validating/updating existing food records
 * 
 * Response Data:
 * - More detailed than search results
 * - Includes full nutrient breakdown
 * - Contains serving size information
 * - May include brand owner, ingredients list
 * 
 * Error Handling:
 * - 404: Food not found (returns null, not error)
 * - 401/403: API key invalid
 * - 429: Rate limit exceeded
 * - 500+: Service unavailable
 * - Network errors logged, returns null
 * 
 * @throws {ApiError} On API authentication or rate limit failures
 * 
 * @example
 * const food = await getFoodByFdcId(123456);
 * if (food) {
 *   console.log(food.description, food.foodNutrients);
 * }
 */
export async function getFoodByFdcId(fdcId: number): Promise<USDAFoodItem | null> {
  if (!API_KEY) {
    throw new Error("USDA_FDC_API_KEY is not configured");
  }

  try {
    const response = await fetch(
      `${USDA_API_BASE}/food/${fdcId}?api_key=${API_KEY}`
    );

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      
      console.error("USDA API error:", {
        status: response.status,
        statusText: response.statusText,
        fdcId
      });
      
      if (response.status === 401 || response.status === 403) {
        throw new ApiError("USDA API authentication failed. Please check your API key.", 401);
      } else if (response.status === 429) {
        throw new ApiError("USDA API rate limit exceeded. Please try again later.", 429);
      } else if (response.status >= 500) {
        throw new ApiError("USDA API service is temporarily unavailable.", 503);
      }
      
      throw new ApiError(`USDA API error: ${response.status} ${response.statusText}`, response.status);
    }

    const food: FDCFood = await response.json();
    return mapFDCFoodToUSDAItem(food);
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }
    console.error("USDA API error:", error);
    return null;
  }
}

/**
 * Get enriched nutrition data for onboarding inventory items
 * 
 * Searches USDA database for a common food item and returns the best match.
 * Used during onboarding to populate default inventory with nutrition data.
 * 
 * @param itemName - Common food name (e.g., "milk", "eggs", "bread")
 * @returns First/best matching food item with nutrition data, or null if not found
 * 
 * Search Strategy:
 * - Queries top-quality data types only (Foundation, SR Legacy, Branded)
 * - Returns single best match (pageSize: 1)
 * - USDA's ranking determines "best" (typically most accurate/complete)
 * 
 * Use Case:
 * - Enriching onboardingInventory table with USDA nutrition data
 * - Pre-populating new user inventory with common items
 * - Quick lookup for standard/common foods
 * 
 * Error Handling:
 * - API failures logged, returns null (graceful degradation)
 * - Empty results return null
 * - Does not throw errors (onboarding should not fail on nutrition data)
 * 
 * @example
 * const milk = await getEnrichedOnboardingItem("whole milk");
 * if (milk) {
 *   // Use milk.foodNutrients for nutrition info
 * }
 */
export async function getEnrichedOnboardingItem(itemName: string): Promise<USDAFoodItem | null> {
  try {
    const searchResult = await searchUSDAFoods({
      query: itemName,
      pageSize: 1,
      dataType: ['Foundation', 'SR Legacy', 'Branded']
    });

    if (searchResult.foods && searchResult.foods.length > 0) {
      return searchResult.foods[0];
    }
    
    return null;
  } catch (error) {
    console.error(`Failed to get enriched data for "${itemName}":`, error);
    return null;
  }
}
