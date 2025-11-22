import { searchUSDAFoods, getFoodByFdcId } from "../integrations/usda";
import { getOnboardingItemByName } from "./onboarding-usda-mapping";
import type { USDAFoodItem } from "@shared/schema";

// Cache for USDA data to avoid repeated API calls
const usdaDataCache = new Map<string, USDAFoodItem>();

// Fetch USDA data for a single onboarding item
export async function fetchOnboardingItemUsdaData(
  itemName: string,
): Promise<USDAFoodItem | null> {
  const mapping = getOnboardingItemByName(itemName);
  if (!mapping) {
    console.error(`No mapping found for item: ${itemName}`);
    return null;
  }

  // Check cache first (use UPC as key if available, otherwise use displayName)
  const cacheKey = mapping.gtinUpc || mapping.displayName;
  if (usdaDataCache.has(cacheKey)) {
    return usdaDataCache.get(cacheKey) || null;
  }

  try {
    // Try UPC search if available
    if (mapping.gtinUpc) {
      // console.log(`Searching for ${itemName} by UPC: ${mapping.upc}`);
      const searchResults = await searchUSDAFoods(mapping.gtinUpc);
      if (
        searchResults &&
        searchResults.foods &&
        searchResults.foods.length > 0
      ) {
        const firstResult = searchResults.foods[0];
        usdaDataCache.set(cacheKey, firstResult);
        return firstResult;
      }
      // console.log(`UPC search failed for ${itemName}`);
    }

    // Try FDC ID if available (cast to any to access fdcId)
    const mappingWithFdc = mapping;
    if (mappingWithFdc.fdcId) {
      // console.log(`Searching for ${itemName} by FDC ID: ${mappingWithFdc.fdcId}`);
      const fdcData = await getFoodByFdcId(parseInt(mappingWithFdc.fdcId));
      if (fdcData) {
        usdaDataCache.set(cacheKey, fdcData);
        return fdcData;
      }
      // console.log(`FDC ID search failed for ${itemName}`);
    }

    // Final fallback: search by name
    // console.log(`Searching for ${itemName} by name...`);
    const nameSearchResults = await searchUSDAFoods(
      mapping.description || itemName,
    );
    if (
      nameSearchResults &&
      nameSearchResults.foods &&
      nameSearchResults.foods.length > 0
    ) {
      const firstResult = nameSearchResults.foods[0];
      usdaDataCache.set(cacheKey, firstResult);
      return firstResult;
    }

    return null;
  } catch (error) {
    console.error(`Error fetching USDA data for ${itemName}:`, error);
    return null;
  }
}

// Batch fetch USDA data for multiple onboarding items
export async function fetchOnboardingItemsUsdaData(
  itemNames: string[],
): Promise<Map<string, USDAFoodItem>> {
  const results = new Map<string, USDAFoodItem>();

  // Process items in parallel for efficiency
  const promises = itemNames.map(async (itemName) => {
    const usdaData = await fetchOnboardingItemUsdaData(itemName);
    if (usdaData) {
      results.set(itemName, usdaData);
    }
  });

  await Promise.all(promises);
  return results;
}

// Get pre-configured item data with USDA information
export async function getEnrichedOnboardingItem(itemName: string): Promise<{
  name: string;
  quantity: string;
  unit: string;
  storage: string;
  expirationDays: number;
  fdcId?: string;
  nutrition?: string;
  usdaData?: any;
} | null> {
  const mapping = getOnboardingItemByName(itemName);
  if (!mapping) {
    return null;
  }

  const usdaData = await fetchOnboardingItemUsdaData(itemName);

  return {
    name: usdaData?.description || mapping.displayName,
    quantity: mapping.quantity,
    unit: mapping.unit,
    storage: mapping.storage,
    expirationDays: mapping.expirationDays,
    fdcId: usdaData?.fdcId ? String(usdaData.fdcId) : undefined,
    nutrition: usdaData?.nutrition
      ? JSON.stringify(usdaData.nutrition)
      : undefined,
    usdaData: usdaData
      ? {
          fdcId: usdaData.fdcId,
          description: usdaData.description,
          dataType: usdaData.dataType,
          brandOwner: usdaData.brandOwner,
          gtinUpc: usdaData.gtinUpc,
          ingredients: usdaData.ingredients,
          foodCategory: usdaData.foodCategory,
          servingSize: usdaData.servingSize,
          servingSizeUnit: usdaData.servingSizeUnit,
          nutrition: usdaData.nutrition,
        }
      : undefined,
  };
}
