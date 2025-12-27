const USDA_API_KEY = process.env.USDA_API_KEY;
const USDA_BASE_URL = "https://api.nal.usda.gov/fdc/v1";

export interface USDASearchResult {
  fdcId: number;
  description: string;
  dataType: string;
  brandOwner?: string;
  brandName?: string;
  ingredients?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  foodNutrients: USDANutrient[];
}

export interface USDANutrient {
  nutrientId: number;
  nutrientName: string;
  nutrientNumber: string;
  unitName: string;
  value: number;
}

export interface USDAFoodPortion {
  id: number;
  amount: number;
  gramWeight: number;
  modifier?: string;
  portionDescription?: string;
  measureUnit?: {
    id: number;
    name: string;
    abbreviation?: string;
  };
}

export interface USDAFoodDetail {
  fdcId: number;
  description: string;
  dataType: string;
  publicationDate?: string;
  brandOwner?: string;
  brandName?: string;
  ingredients?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  foodNutrients: USDANutrient[];
  foodPortions?: USDAFoodPortion[];
  foodCategory?: {
    description: string;
  };
}

export interface MappedFoodItem {
  name: string;
  category: string;
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number;
    sugar?: number;
    sodium?: number;
    servingSize?: string;
  };
  source: "usda";
  sourceId: number;
  brandOwner?: string;
  ingredients?: string;
}

const searchCache = new Map<
  string,
  { data: USDASearchResult[]; timestamp: number }
>();
const foodCache = new Map<
  number,
  { data: USDAFoodDetail | null; timestamp: number }
>();

const SEARCH_CACHE_TTL = 60 * 60 * 1000;
const FOOD_CACHE_TTL = 24 * 60 * 60 * 1000;

function isSearchCacheValid(timestamp: number): boolean {
  return Date.now() - timestamp < SEARCH_CACHE_TTL;
}

function isFoodCacheValid(timestamp: number): boolean {
  return Date.now() - timestamp < FOOD_CACHE_TTL;
}

export async function searchUSDA(
  query: string,
  pageSize: number = 25,
): Promise<USDASearchResult[]> {
  if (!USDA_API_KEY) {
    console.error("USDA_API_KEY is not configured");
    return [];
  }

  const cacheKey = `${query}-${pageSize}`;
  const cached = searchCache.get(cacheKey);
  if (cached && isSearchCacheValid(cached.timestamp)) {
    return cached.data;
  }

  try {
    const params = new URLSearchParams({
      api_key: USDA_API_KEY,
      query,
      pageSize: pageSize.toString(),
    });

    const response = await fetch(`${USDA_BASE_URL}/foods/search?${params}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.status === 429) {
      console.error("USDA API rate limit exceeded (1000 requests/hour)");
      return [];
    }

    if (!response.ok) {
      console.error(
        `USDA API error: ${response.status} ${response.statusText}`,
      );
      return [];
    }

    const data = await response.json();
    const results: USDASearchResult[] = data.foods || [];

    searchCache.set(cacheKey, { data: results, timestamp: Date.now() });

    return results;
  } catch (error) {
    console.error("Error searching USDA API:", error);
    return [];
  }
}

export async function getUSDAFood(
  fdcId: number,
): Promise<USDAFoodDetail | null> {
  if (!USDA_API_KEY) {
    console.error("USDA_API_KEY is not configured");
    return null;
  }

  const cached = foodCache.get(fdcId);
  if (cached && isFoodCacheValid(cached.timestamp)) {
    return cached.data;
  }

  try {
    const params = new URLSearchParams({
      api_key: USDA_API_KEY,
    });

    const response = await fetch(`${USDA_BASE_URL}/food/${fdcId}?${params}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.status === 404) {
      foodCache.set(fdcId, { data: null, timestamp: Date.now() });
      return null;
    }

    if (response.status === 429) {
      console.error("USDA API rate limit exceeded (1000 requests/hour)");
      return null;
    }

    if (!response.ok) {
      console.error(
        `USDA API error: ${response.status} ${response.statusText}`,
      );
      return null;
    }

    const data: USDAFoodDetail = await response.json();

    foodCache.set(fdcId, { data, timestamp: Date.now() });

    return data;
  } catch (error) {
    console.error("Error fetching USDA food:", error);
    return null;
  }
}

const NUTRIENT_IDS = {
  ENERGY: 1008,
  PROTEIN: 1003,
  CARBOHYDRATES: 1005,
  FAT: 1004,
  FIBER: 1079,
  SUGARS: 2000,
  SODIUM: 1093,
};

function findNutrientValue(
  nutrients: USDANutrient[],
  nutrientId: number,
): number | undefined {
  const nutrient = nutrients.find((n) => n.nutrientId === nutrientId);
  return nutrient?.value;
}

export function mapUSDAToFoodItem(
  usdaFood: USDASearchResult | USDAFoodDetail,
): MappedFoodItem {
  const nutrients = usdaFood.foodNutrients || [];

  const calories = findNutrientValue(nutrients, NUTRIENT_IDS.ENERGY) ?? 0;
  const protein = findNutrientValue(nutrients, NUTRIENT_IDS.PROTEIN) ?? 0;
  const carbs = findNutrientValue(nutrients, NUTRIENT_IDS.CARBOHYDRATES) ?? 0;
  const fat = findNutrientValue(nutrients, NUTRIENT_IDS.FAT) ?? 0;
  const fiber = findNutrientValue(nutrients, NUTRIENT_IDS.FIBER);
  const sugar = findNutrientValue(nutrients, NUTRIENT_IDS.SUGARS);
  const sodium = findNutrientValue(nutrients, NUTRIENT_IDS.SODIUM);

  let category = "Other";
  if ("foodCategory" in usdaFood && usdaFood.foodCategory?.description) {
    category = usdaFood.foodCategory.description;
  }

  let servingSize: string | undefined;
  if (usdaFood.servingSize && usdaFood.servingSizeUnit) {
    servingSize = `${usdaFood.servingSize} ${usdaFood.servingSizeUnit}`;
  }

  return {
    name: usdaFood.description,
    category,
    nutrition: {
      calories: Math.round(calories),
      protein: Math.round(protein * 10) / 10,
      carbs: Math.round(carbs * 10) / 10,
      fat: Math.round(fat * 10) / 10,
      fiber: fiber !== undefined ? Math.round(fiber * 10) / 10 : undefined,
      sugar: sugar !== undefined ? Math.round(sugar * 10) / 10 : undefined,
      sodium: sodium !== undefined ? Math.round(sodium) : undefined,
      servingSize,
    },
    source: "usda",
    sourceId: usdaFood.fdcId,
    brandOwner: "brandOwner" in usdaFood ? usdaFood.brandOwner : undefined,
    ingredients: usdaFood.ingredients,
  };
}

export interface USDABrandedFood extends USDASearchResult {
  gtinUpc?: string;
}

const barcodeCache = new Map<
  string,
  { data: USDABrandedFood | null; timestamp: number }
>();

export async function lookupUSDABarcode(
  barcode: string,
): Promise<USDABrandedFood | null> {
  if (!USDA_API_KEY) {
    console.error("USDA_API_KEY is not configured");
    return null;
  }

  const cleanBarcode = barcode.replace(/\D/g, "");

  const cached = barcodeCache.get(cleanBarcode);
  if (cached && isSearchCacheValid(cached.timestamp)) {
    return cached.data;
  }

  try {
    const response = await fetch(
      `${USDA_BASE_URL}/foods/search?api_key=${USDA_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: cleanBarcode,
          dataType: ["Branded"],
          pageSize: 25,
        }),
      },
    );

    if (response.status === 429) {
      console.error("USDA API rate limit exceeded (1000 requests/hour)");
      return null;
    }

    if (!response.ok) {
      console.error(
        `USDA API error: ${response.status} ${response.statusText}`,
      );
      return null;
    }

    const data = await response.json();
    const foods: USDABrandedFood[] = data.foods || [];

    const exactMatch = foods.find((food) => {
      if (food.gtinUpc) {
        const foodUpc = food.gtinUpc.replace(/\D/g, "");
        return (
          foodUpc === cleanBarcode ||
          foodUpc.endsWith(cleanBarcode) ||
          cleanBarcode.endsWith(foodUpc)
        );
      }
      return false;
    });

    if (exactMatch) {
      barcodeCache.set(cleanBarcode, {
        data: exactMatch,
        timestamp: Date.now(),
      });
      return exactMatch;
    }

    if (foods.length > 0) {
      barcodeCache.set(cleanBarcode, { data: foods[0], timestamp: Date.now() });
      return foods[0];
    }

    barcodeCache.set(cleanBarcode, { data: null, timestamp: Date.now() });
    return null;
  } catch (error) {
    console.error("Error looking up USDA barcode:", error);
    return null;
  }
}

export function clearUSDACache(): void {
  searchCache.clear();
  foodCache.clear();
  barcodeCache.clear();
}

// ============================================================================
// FOOD PORTION CONVERSION SERVICE
// Converts food-specific units (slices, loaves, etc.) to grams using USDA data
// ============================================================================

export interface PortionConversion {
  unitName: string;
  unitAbbreviation?: string;
  gramWeight: number;
  amount: number;
  gramsPerUnit: number;
}

export interface FoodPortionData {
  fdcId: number;
  foodName: string;
  portions: PortionConversion[];
}

const portionCache = new Map<number, { data: FoodPortionData | null; timestamp: number }>();
const PORTION_CACHE_TTL = 24 * 60 * 60 * 1000;

function isPortionCacheValid(timestamp: number): boolean {
  return Date.now() - timestamp < PORTION_CACHE_TTL;
}

export async function getFoodPortions(fdcId: number): Promise<FoodPortionData | null> {
  const cached = portionCache.get(fdcId);
  if (cached && isPortionCacheValid(cached.timestamp)) {
    return cached.data;
  }

  const foodDetail = await getUSDAFood(fdcId);
  if (!foodDetail) {
    portionCache.set(fdcId, { data: null, timestamp: Date.now() });
    return null;
  }

  const portions: PortionConversion[] = [];

  if (foodDetail.foodPortions && foodDetail.foodPortions.length > 0) {
    for (const portion of foodDetail.foodPortions) {
      const unitName = portion.measureUnit?.name || portion.modifier || portion.portionDescription || "serving";
      const unitAbbr = portion.measureUnit?.abbreviation;
      const amount = portion.amount || 1;
      const gramWeight = portion.gramWeight;

      if (gramWeight > 0) {
        portions.push({
          unitName: unitName.toLowerCase(),
          unitAbbreviation: unitAbbr?.toLowerCase(),
          gramWeight,
          amount,
          gramsPerUnit: gramWeight / amount,
        });
      }
    }
  }

  const result: FoodPortionData = {
    fdcId,
    foodName: foodDetail.description,
    portions,
  };

  portionCache.set(fdcId, { data: result, timestamp: Date.now() });
  return result;
}

// Common unit aliases for matching
const UNIT_ALIASES: Record<string, string[]> = {
  slice: ["slice", "slices", "sl"],
  loaf: ["loaf", "loaves"],
  cup: ["cup", "cups", "c"],
  tablespoon: ["tablespoon", "tablespoons", "tbsp", "tbs", "tb"],
  teaspoon: ["teaspoon", "teaspoons", "tsp", "ts"],
  ounce: ["ounce", "ounces", "oz"],
  pound: ["pound", "pounds", "lb", "lbs"],
  gram: ["gram", "grams", "g"],
  kilogram: ["kilogram", "kilograms", "kg"],
  piece: ["piece", "pieces", "pc", "pcs", "each", "ea", "whole"],
  serving: ["serving", "servings", "srv"],
  can: ["can", "cans"],
  bottle: ["bottle", "bottles"],
  package: ["package", "packages", "pkg", "pkgs"],
  head: ["head", "heads"],
  clove: ["clove", "cloves"],
  bunch: ["bunch", "bunches"],
  stalk: ["stalk", "stalks"],
  sprig: ["sprig", "sprigs"],
  large: ["large", "lg"],
  medium: ["medium", "med", "md"],
  small: ["small", "sm"],
};

function normalizeUnitName(unit: string): string {
  const lower = unit.toLowerCase().trim();
  
  for (const [canonical, aliases] of Object.entries(UNIT_ALIASES)) {
    if (aliases.includes(lower)) {
      return canonical;
    }
  }
  
  return lower;
}

function unitMatches(portionUnit: string, searchUnit: string): boolean {
  const normPortion = normalizeUnitName(portionUnit);
  const normSearch = normalizeUnitName(searchUnit);
  
  if (normPortion === normSearch) return true;
  
  // Check if one contains the other (e.g., "large slice" contains "slice")
  if (normPortion.includes(normSearch) || normSearch.includes(normPortion)) {
    return true;
  }
  
  return false;
}

export function findPortionConversion(
  portions: PortionConversion[],
  unit: string
): PortionConversion | null {
  const searchUnit = normalizeUnitName(unit);
  
  // First try exact match
  for (const portion of portions) {
    if (normalizeUnitName(portion.unitName) === searchUnit) {
      return portion;
    }
    if (portion.unitAbbreviation && normalizeUnitName(portion.unitAbbreviation) === searchUnit) {
      return portion;
    }
  }
  
  // Then try partial match
  for (const portion of portions) {
    if (unitMatches(portion.unitName, unit)) {
      return portion;
    }
  }
  
  return null;
}

export interface QuantityInGrams {
  grams: number;
  conversionUsed: string;
  isApproximate: boolean;
}

// Standard weight conversions (when USDA portion data not available)
const STANDARD_WEIGHT_TO_GRAMS: Record<string, number> = {
  g: 1,
  gram: 1,
  grams: 1,
  kg: 1000,
  kilogram: 1000,
  kilograms: 1000,
  oz: 28.3495,
  ounce: 28.3495,
  ounces: 28.3495,
  lb: 453.592,
  lbs: 453.592,
  pound: 453.592,
  pounds: 453.592,
  mg: 0.001,
  milligram: 0.001,
  milligrams: 0.001,
};

// Standard volume to grams (approximate, for water-based liquids)
const STANDARD_VOLUME_TO_GRAMS: Record<string, number> = {
  ml: 1,
  milliliter: 1,
  milliliters: 1,
  l: 1000,
  liter: 1000,
  liters: 1000,
  litre: 1000,
  litres: 1000,
  cup: 240,
  cups: 240,
  tbsp: 15,
  tablespoon: 15,
  tablespoons: 15,
  tsp: 5,
  teaspoon: 5,
  teaspoons: 5,
  "fl oz": 30,
  "fluid ounce": 30,
  "fluid ounces": 30,
};

export function convertToGrams(
  quantity: number,
  unit: string,
  portions?: PortionConversion[]
): QuantityInGrams | null {
  const normalizedUnit = unit.toLowerCase().trim();
  
  // First check if we have USDA portion data for this unit
  if (portions && portions.length > 0) {
    const portionMatch = findPortionConversion(portions, unit);
    if (portionMatch) {
      return {
        grams: quantity * portionMatch.gramsPerUnit,
        conversionUsed: `${portionMatch.amount} ${portionMatch.unitName} = ${portionMatch.gramWeight}g (USDA)`,
        isApproximate: false,
      };
    }
  }
  
  // Fall back to standard weight conversions
  if (STANDARD_WEIGHT_TO_GRAMS[normalizedUnit]) {
    return {
      grams: quantity * STANDARD_WEIGHT_TO_GRAMS[normalizedUnit],
      conversionUsed: `standard weight conversion`,
      isApproximate: false,
    };
  }
  
  // Fall back to standard volume conversions (approximate)
  if (STANDARD_VOLUME_TO_GRAMS[normalizedUnit]) {
    return {
      grams: quantity * STANDARD_VOLUME_TO_GRAMS[normalizedUnit],
      conversionUsed: `volume approximation (density varies)`,
      isApproximate: true,
    };
  }
  
  // Cannot convert
  return null;
}

export type AvailabilityStatus = "available" | "partial" | "unavailable";

export interface QuantityComparisonResult {
  status: AvailabilityStatus;
  inventoryGrams: number | null;
  requiredGrams: number | null;
  percentAvailable: number | null;
  conversionNote?: string;
}

export function compareQuantities(
  inventoryQty: number,
  inventoryUnit: string | null | undefined,
  requiredQty: number,
  requiredUnit: string,
  portions?: PortionConversion[]
): QuantityComparisonResult {
  // If no inventory unit, assume it's a simple count and matches
  if (!inventoryUnit) {
    if (inventoryQty >= requiredQty) {
      return { status: "available", inventoryGrams: null, requiredGrams: null, percentAvailable: 100 };
    }
    const pct = Math.round((inventoryQty / requiredQty) * 100);
    return {
      status: pct >= 50 ? "partial" : "unavailable",
      inventoryGrams: null,
      requiredGrams: null,
      percentAvailable: pct,
    };
  }
  
  // Convert both to grams
  const inventoryInGrams = convertToGrams(inventoryQty, inventoryUnit, portions);
  const requiredInGrams = convertToGrams(requiredQty, requiredUnit, portions);
  
  // If we can't convert both, fall back to simple comparison if units match
  if (!inventoryInGrams || !requiredInGrams) {
    const normInv = normalizeUnitName(inventoryUnit);
    const normReq = normalizeUnitName(requiredUnit);
    
    if (normInv === normReq || unitMatches(inventoryUnit, requiredUnit)) {
      if (inventoryQty >= requiredQty) {
        return { status: "available", inventoryGrams: null, requiredGrams: null, percentAvailable: 100 };
      }
      const pct = Math.round((inventoryQty / requiredQty) * 100);
      return {
        status: pct >= 50 ? "partial" : "unavailable",
        inventoryGrams: null,
        requiredGrams: null,
        percentAvailable: pct,
        conversionNote: `Same unit comparison: ${inventoryQty}/${requiredQty} ${inventoryUnit}`,
      };
    }
    
    // Cannot compare different unit types
    return {
      status: "available", // Assume available if we can't verify
      inventoryGrams: null,
      requiredGrams: null,
      percentAvailable: null,
      conversionNote: `Cannot convert between ${inventoryUnit} and ${requiredUnit}`,
    };
  }
  
  const pct = Math.round((inventoryInGrams.grams / requiredInGrams.grams) * 100);
  
  let status: AvailabilityStatus;
  if (pct >= 100) {
    status = "available";
  } else if (pct >= 50) {
    status = "partial";
  } else {
    status = "unavailable";
  }
  
  return {
    status,
    inventoryGrams: inventoryInGrams.grams,
    requiredGrams: requiredInGrams.grams,
    percentAvailable: Math.min(pct, 100),
    conversionNote: `${inventoryQty} ${inventoryUnit} = ${Math.round(inventoryInGrams.grams)}g, need ${Math.round(requiredInGrams.grams)}g`,
  };
}
