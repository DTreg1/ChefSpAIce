import { storage } from "../storage";
import { searchUSDAFoods as originalSearchUSDAFoods, USDASearchOptions, isNutritionDataValid } from "../usda";
import type { USDASearchResponse, USDAFoodItem } from "@shared/schema";
import { ApiCacheService, apiCache } from "./ApiCacheService";

// Interface for search cache entries
interface SearchCacheEntry {
  query: string;
  fdcIds: string[];
  totalHits: number;
  foods?: USDAFoodItem[]; // Cache the full food items
}

// Generate cache key from search options
function generateCacheKey(options: USDASearchOptions | string): string {
  const searchOptions = typeof options === 'string' ? { query: options } : options;
  const normalized = {
    query: searchOptions.query.toLowerCase().trim(),
    pageSize: searchOptions.pageSize || 20,
    pageNumber: searchOptions.pageNumber || 1,
    dataType: searchOptions.dataType?.sort() || [],
    sortBy: searchOptions.sortBy || '',
    sortOrder: searchOptions.sortOrder || '',
    brandOwner: searchOptions.brandOwner?.sort() || [],
  };
  
  return ApiCacheService.generateKey('usda.search', normalized);
}

// Cached version of searchUSDAFoods
export async function searchUSDAFoodsCached(
  options: USDASearchOptions | string
): Promise<USDASearchResponse> {
  const searchOptions = typeof options === 'string' 
    ? { query: options, pageSize: 20, pageNumber: 1 } 
    : options;
  
  const cacheKey = generateCacheKey(searchOptions);
  
  try {
    // Check in-memory search cache using new ApiCacheService
    const cachedSearch = apiCache.get<SearchCacheEntry>(cacheKey);
    
    if (cachedSearch && cachedSearch.foods) {
      // console.log(`[USDA Cache] Hit for query: "${searchOptions.query}"`);
      
      // Return cached response directly if we have the foods
      return {
        foods: cachedSearch.foods,
        totalHits: cachedSearch.totalHits,
        currentPage: searchOptions.pageNumber || 1,
        totalPages: Math.ceil(cachedSearch.totalHits / (searchOptions.pageSize || 20)),
        pageList: Array.from({ length: Math.min(10, Math.ceil(cachedSearch.totalHits / (searchOptions.pageSize || 20))) }, (_, i) => i + 1),
        foodSearchCriteria: {
          query: searchOptions.query,
          pageNumber: searchOptions.pageNumber || 1,
          pageSize: searchOptions.pageSize || 20,
        },
      };
    }
    
    // If we have cached fdcIds but not the full foods, try to get them from storage
    if (cachedSearch && cachedSearch.fdcIds) {
      // console.log(`[USDA Cache] Partial hit for query: "${searchOptions.query}" - fetching foods from storage`);
      
      // Get cached food items from fdcCache
      const foodPromises = cachedSearch.fdcIds.map(async (fdcId: string) => {
        // First check the ApiCache for individual foods
        const cachedFood = apiCache.get<USDAFoodItem>(`usda.food:${fdcId}`);
        if (cachedFood) return cachedFood;
        
        // Fall back to database cache
        const dbFood = await storage.getCachedFood(fdcId);
        if (dbFood && dbFood.fullData) {
          const foodData = dbFood.fullData as USDAFoodItem;
          // Cache in memory for faster access
          apiCache.set(`usda.food:${fdcId}`, foodData, undefined, 'usda.food');
          return foodData;
        }
        return null;
      });
      
      const cachedFoods = await Promise.all(foodPromises);
      const validFoods = cachedFoods.filter((food): food is USDAFoodItem => food !== null);
      
      if (validFoods.length > 0) {
        // Update cache with full foods for faster access next time
        const updatedEntry: SearchCacheEntry = {
          ...cachedSearch,
          foods: validFoods,
        };
        apiCache.set(cacheKey, updatedEntry, undefined, 'usda.search');
        
        return {
          foods: validFoods,
          totalHits: cachedSearch.totalHits,
          currentPage: searchOptions.pageNumber || 1,
          totalPages: Math.ceil(cachedSearch.totalHits / (searchOptions.pageSize || 20)),
          pageList: Array.from({ length: Math.min(10, Math.ceil(cachedSearch.totalHits / (searchOptions.pageSize || 20))) }, (_, i) => i + 1),
          foodSearchCriteria: {
            query: searchOptions.query,
            pageNumber: searchOptions.pageNumber || 1,
            pageSize: searchOptions.pageSize || 20,
          },
        };
      }
    }
    
    // Cache miss - fetch from USDA API
    // console.log(`[USDA Cache] Miss for query: "${searchOptions.query}" - fetching from API`);
    const response = await originalSearchUSDAFoods(searchOptions);
    
    // Cache the search results
    if (response && response.foods && response.foods.length > 0) {
      // Cache individual foods in both ApiCache and database
      const cachePromises = response.foods.map(async (food) => {
        // Check if food has nutrition data
        if (!food.nutrition) {
          console.warn(`[USDA Cache] Skipping cache for "${food.description}" - missing nutrition data`);
          return null;
        }
        
        // Validate nutrition data
        if (!isNutritionDataValid(food.nutrition, food.description)) {
          console.warn(`[USDA Cache] Skipping cache for "${food.description}" - invalid nutrition data`);
          return null;
        }
        
        // Cache in memory
        apiCache.set(`usda.food:${food.fdcId}`, food, undefined, food.brandOwner ? 'usda.branded' : 'usda.food');
        
        // Cache in database for persistence
        return storage.cacheFood({
          fdcId: String(food.fdcId),
          description: food.description,
          dataType: food.dataType,
          brandOwner: food.brandOwner,
          brandName: food.brandName,
          ingredients: food.ingredients,
          servingSize: food.servingSize,
          servingSizeUnit: food.servingSizeUnit,
          nutrients: food.foodNutrients as any,
          fullData: food as any,
        });
      });
      
      await Promise.all(cachePromises);
      
      // Cache the search query with full foods
      const cacheEntry: SearchCacheEntry = {
        query: searchOptions.query,
        fdcIds: response.foods.map(f => String(f.fdcId)),
        totalHits: response.totalHits,
        foods: response.foods,
      };
      
      apiCache.set(cacheKey, cacheEntry, undefined, 'usda.search');
      // console.log(`[USDA Cache] Cached ${response.foods.length} foods for query: "${searchOptions.query}"`);
    }
    
    return response;
  } catch (error) {
    console.error('[USDA Cache] Error in cached search:', error);
    // Fall back to direct API call on cache error
    return originalSearchUSDAFoods(searchOptions);
  }
}

// Get cached food by FDC ID
export async function getCachedFoodById(fdcId: number): Promise<any | null> {
  try {
    // First check ApiCache
    const cacheKey = `usda.food:${fdcId}`;
    const cachedFood = apiCache.get<USDAFoodItem>(cacheKey);
    
    if (cachedFood) {
      // console.log(`[USDA Cache] Memory hit for FDC ID: ${fdcId}`);
      return cachedFood;
    }
    
    // Fall back to database cache
    const dbCached = await storage.getCachedFood(String(fdcId));
    if (dbCached && dbCached.fullData) {
      // console.log(`[USDA Cache] Database hit for FDC ID: ${fdcId}`);
      const foodData = dbCached.fullData;
      // Cache in memory for faster access
      apiCache.set(cacheKey, foodData, undefined, dbCached.brandOwner ? 'usda.branded' : 'usda.food');
      return foodData;
    }
    
    // console.log(`[USDA Cache] Miss for FDC ID: ${fdcId}`);
    return null;
  } catch (error) {
    console.error(`[USDA Cache] Error getting cached food ${fdcId}:`, error);
    return null;
  }
}

// Preload common searches for better performance
export async function preloadCommonSearches(): Promise<void> {
  const commonSearches = [
    'apple', 'banana', 'chicken', 'rice', 'bread', 
    'milk', 'eggs', 'cheese', 'tomato', 'potato'
  ];
  
  // console.log('[USDA Cache] Preloading common searches...');
  
  for (const query of commonSearches) {
    try {
      const cacheKey = generateCacheKey(query);
      
      // Check if already cached
      if (!apiCache.has(cacheKey)) {
        // Preload with small page size
        await searchUSDAFoodsCached({ query, pageSize: 10, pageNumber: 1 });
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`[USDA Cache] Failed to preload "${query}":`, error);
    }
  }
  
  // console.log('[USDA Cache] Preloading complete');
}

// Clear old cache entries
export async function cleanupCache(): Promise<void> {
  try {
    // The ApiCacheService handles its own cleanup automatically
    // Just clear old database cache entries
    await storage.clearOldCache(30); // Clear database cache older than 30 days
    // console.log('[USDA Cache] Database cleanup completed');
  } catch (error) {
    console.error('[USDA Cache] Cleanup failed:', error);
  }
}

// Export cache statistics
export function getCacheStats() {
  return apiCache.getStats();
}

// Invalidate cache by pattern
export function invalidateCache(pattern: string): number {
  return apiCache.invalidate(pattern);
}

// Clear all cache
export function clearAllCache(): void {
  apiCache.clear();
}
