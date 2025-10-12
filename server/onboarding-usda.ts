import { searchUSDAFoods, getFoodByFdcId } from "./usda";
import { onboardingUsdaMapping, getOnboardingItemByName } from "./onboarding-usda-mapping";
import type { USDAFoodItem } from "@shared/schema";

// Cache for USDA data to avoid repeated API calls
const usdaDataCache = new Map<string, USDAFoodItem>();

// Fetch USDA data for a single onboarding item
export async function fetchOnboardingItemUsdaData(itemName: string): Promise<USDAFoodItem | null> {
  const mapping = getOnboardingItemByName(itemName);
  if (!mapping) {
    console.error(`No mapping found for item: ${itemName}`);
    return null;
  }

  // Check cache first
  const cacheKey = mapping.fcdId;
  if (usdaDataCache.has(cacheKey)) {
    return usdaDataCache.get(cacheKey) || null;
  }

  try {
    // Fetch USDA data by FDC ID
    const usdaData = await getFoodByFdcId(parseInt(mapping.fcdId));
    if (usdaData) {
      // Cache the result
      usdaDataCache.set(cacheKey, usdaData);
      return usdaData;
    }

    // If direct FDC ID fetch fails, try searching by name as fallback
    console.log(`Direct FDC ID fetch failed for ${itemName}, trying search...`);
    const searchResults = await searchUSDAFoods(mapping.description || itemName);
    if (searchResults && searchResults.foods && searchResults.foods.length > 0) {
      const firstResult = searchResults.foods[0];
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
export async function fetchOnboardingItemsUsdaData(itemNames: string[]): Promise<Map<string, USDAFoodItem>> {
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
  fcdId?: string;
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
    fcdId: usdaData?.fdcId ? String(usdaData.fdcId) : mapping.fcdId,
    nutrition: usdaData?.nutrition ? JSON.stringify(usdaData.nutrition) : undefined,
    usdaData: usdaData ? {
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
    } : undefined,
  };
}