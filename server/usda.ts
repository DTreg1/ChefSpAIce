import type { USDAFoodItem, USDASearchResponse, NutritionInfo } from "@shared/schema";
import { ApiError } from "./apiError";

const USDA_API_BASE = "https://api.nal.usda.gov/fdc/v1";
const API_KEY = process.env.USDA_FDC_API_KEY;

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
  ingredients?: string;
  foodCategory?: string;
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

function extractNutritionInfo(food: FDCFood): NutritionInfo | undefined {
  // First try labelNutrients (Branded Foods)
  if (food.labelNutrients) {
    const label = food.labelNutrients;
    return {
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

    return {
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
  }

  return undefined;
}

function mapFDCFoodToUSDAItem(food: FDCFood): USDAFoodItem {
  return {
    fdcId: food.fdcId,
    description: food.description,
    dataType: food.dataType,
    brandOwner: food.brandOwner,
    ingredients: food.ingredients,
    foodCategory: food.foodCategory || food.brandedFoodCategory,
    servingSize: food.servingSize,
    servingSizeUnit: food.servingSizeUnit,
    nutrition: extractNutritionInfo(food),
  };
}

export async function searchUSDAFoods(
  query: string, 
  pageSize: number = 20,
  pageNumber: number = 1,
  dataType?: string[]
): Promise<USDASearchResponse> {
  if (!API_KEY) {
    throw new Error("USDA_FDC_API_KEY is not configured");
  }

  try {
    const params = new URLSearchParams({
      api_key: API_KEY,
      query: query,
      pageSize: pageSize.toString(),
      pageNumber: pageNumber.toString(),
    });

    if (dataType && dataType.length > 0) {
      params.append("dataType", dataType.join(","));
    }

    const response = await fetch(
      `${USDA_API_BASE}/foods/search?${params.toString()}`
    );

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
