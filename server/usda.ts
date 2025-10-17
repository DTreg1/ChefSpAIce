import type { USDAFoodItem, USDASearchResponse, NutritionInfo } from "@shared/schema";
import { ApiError } from "./apiError";
import { createApiClient, API_TIMEOUTS, CircuitBreaker, makeApiCallWithTimeout } from "./utils/apiTimeout";

const USDA_API_BASE = "https://api.nal.usda.gov/fdc/v1";
const API_KEY = process.env.USDA_FDC_API_KEY;

// Create axios client with timeout and retry logic
const usdaClient = createApiClient(USDA_API_BASE, API_TIMEOUTS.USDA.search, API_TIMEOUTS.USDA.retries);

// Circuit breaker for USDA API
const usdaCircuitBreaker = new CircuitBreaker(5, 60000, 'USDA API');

interface FDCNutrient {
  nutrientId?: number;
  nutrientNumber?: string;
  nutrientName?: string;
  number?: string;
  name?: string;
  amount?: number;
  unitName?: string;
  nutrient?: {
    number: string;
    name: string;
    unitName: string;
  };
}

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
      nutrition.protein === 0 && nutrition.calories > 0) {
    console.warn(`Invalid nutrition data for "${foodDescription}": protein food with zero protein`);
    return false;
  }

  return true;
}

function extractNutritionInfo(food: FDCFood): NutritionInfo | undefined {
  // Validate food object exists
  if (!food || typeof food !== 'object') {
    console.warn('Invalid food object provided to extractNutritionInfo');
    return undefined;
  }

  // First try labelNutrients (Branded Foods)
  if (food.labelNutrients && typeof food.labelNutrients === 'object') {
    const label = food.labelNutrients;
    const nutrition: NutritionInfo = {
      calories: (label?.calories && typeof label.calories.value === 'number') ? label.calories.value : 0,
      protein: (label?.protein && typeof label.protein.value === 'number') ? label.protein.value : 0,
      carbs: (label?.carbohydrates && typeof label.carbohydrates.value === 'number') ? label.carbohydrates.value : 0,
      fat: (label?.fat && typeof label.fat.value === 'number') ? label.fat.value : 0,
      fiber: (label?.fiber && typeof label.fiber.value === 'number') ? label.fiber.value : undefined,
      sugar: (label?.sugars && typeof label.sugars.value === 'number') ? label.sugars.value : undefined,
      sodium: (label?.sodium && typeof label.sodium.value === 'number') ? label.sodium.value : undefined,
      servingSize: food?.servingSize?.toString() || "100",
      servingUnit: food?.servingSizeUnit || "g",
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

function mapFDCFoodToUSDAItem(food: FDCFood): USDAFoodItem {
  // Validate food object
  if (!food || typeof food !== 'object') {
    throw new Error('Invalid food object provided to mapFDCFoodToUSDAItem');
  }

  // Extract foodCategory - handle both string and object formats safely
  let foodCategory: string | undefined;
  if (food.foodCategory) {
    if (typeof food.foodCategory === 'object' && 'description' in food.foodCategory) {
      foodCategory = food.foodCategory.description;
    } else if (typeof food.foodCategory === 'string') {
      foodCategory = food.foodCategory;
    }
  }
  // Fall back to brandedFoodCategory if foodCategory is not available
  if (!foodCategory && food.brandedFoodCategory) {
    foodCategory = food.brandedFoodCategory;
  }

  return {
    fdcId: food.fdcId || 0,
    description: food.description || 'Unknown Food',
    dataType: food.dataType || 'Unknown',
    brandOwner: food.brandOwner,
    gtinUpc: food.gtinUpc,
    ingredients: food.ingredients,
    foodCategory: foodCategory,
    servingSize: food.servingSize,
    servingSizeUnit: food.servingSizeUnit,
    nutrition: extractNutritionInfo(food),
  };
}

export interface USDASearchOptions {
  query: string;
  pageSize?: number;
  pageNumber?: number;
  dataType?: string[];
  sortBy?: 'dataType.keyword' | 'lowercaseDescription.keyword' | 'fdcId' | 'publishedDate';
  sortOrder?: 'asc' | 'desc';
  brandOwner?: string[];
}

export async function searchUSDAFoods(
  options: USDASearchOptions | string
): Promise<USDASearchResponse> {
  if (!API_KEY) {
    console.warn("USDA_FDC_API_KEY is not configured - returning empty results");
    return {
      foods: [],
      totalHits: 0,
      currentPage: 1,
      totalPages: 0
    };
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

    // Add timeout using AbortController (15 seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    const response = await fetch(url, {
      signal: controller.signal
    }).finally(() => clearTimeout(timeoutId));

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

    let data: FDCSearchResult;
    try {
      data = await response.json();
    } catch (jsonError) {
      console.error("Failed to parse USDA API response:", jsonError);
      throw new ApiError("Invalid response format from USDA API", 502);
    }

    // Validate response structure
    if (!data || !Array.isArray(data.foods)) {
      console.error("Invalid USDA API response structure:", data);
      return {
        foods: [],
        totalHits: 0,
        currentPage: 1,
        totalPages: 0
      };
    }

    return {
      foods: data.foods.map(mapFDCFoodToUSDAItem),
      totalHits: data.totalHits || 0,
      currentPage: data.currentPage || 1,
      totalPages: data.totalPages || 0,
    };
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }
    console.error("USDA API error:", error);
    throw new ApiError("Failed to search USDA database", 500);
  }
}

export async function getFoodByFdcId(fdcId: number): Promise<USDAFoodItem | null> {
  if (!API_KEY) {
    console.warn("USDA_FDC_API_KEY is not configured - returning null");
    return null;
  }

  try {
    // Add timeout using AbortController (15 seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    const response = await fetch(
      `${USDA_API_BASE}/food/${fdcId}?api_key=${API_KEY}`,
      { signal: controller.signal }
    ).finally(() => clearTimeout(timeoutId));

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

    let food: FDCFood;
    try {
      food = await response.json();
    } catch (jsonError) {
      console.error("Failed to parse USDA API response:", jsonError);
      return null;
    }
    
    // Validate response structure
    if (!food || typeof food !== 'object' || !food.fdcId) {
      console.error("Invalid USDA API response structure for FDC ID:", fdcId);
      return null;
    }
    
    return mapFDCFoodToUSDAItem(food);
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }
    console.error("USDA API error:", error);
    return null;
  }
}
