import { storage } from "../storage";
import { searchUSDAFoods as originalSearchUSDAFoods, USDASearchOptions } from "../usda";
import type { USDASearchResponse, USDAFoodItem } from "@shared/schema";
import crypto from "crypto";

// Cache TTL settings (in milliseconds)
const CACHE_TTL = {
  FOOD_ITEM: 7 * 24 * 60 * 60 * 1000, // 7 days for individual food items
};

// In-memory cache for search results (since database search cache was removed)
interface SearchCacheEntry {
  query: string;
  fdcIds: string[];
  totalHits: number;
  cachedAt: Date;
}

const searchCache = new Map<string, SearchCacheEntry>();
const SEARCH_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

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
  
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(normalized))
    .digest('hex')
    .substring(0, 16); // Use first 16 chars for shorter keys
}

// Check if cache is still valid
function isCacheValid(cachedAt: Date | string, ttlMs: number): boolean {
  const cachedDate = typeof cachedAt === 'string' ? new Date(cachedAt) : cachedAt;
  const now = new Date();
  const age = now.getTime() - cachedDate.getTime();
  return age < ttlMs;
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
    // Check in-memory search cache
    const cachedSearch = searchCache.get(cacheKey);
    
    if (cachedSearch && isCacheValid(cachedSearch.cachedAt, SEARCH_CACHE_TTL)) {
      console.log(`[USDA Cache] Hit for query: "${searchOptions.query}" (key: ${cacheKey})`);
      
      // Get cached food items from fdcCache
      const foodPromises = cachedSearch.fdcIds.map((fdcId: string) => 
        storage.getCachedFood(fdcId)
      );
      const cachedFoods = await Promise.all(foodPromises);
      
      // Filter out any null results and reconstruct the response
      const validFoods = cachedFoods.filter((food): food is NonNullable<typeof food> => food !== null);
      
      if (validFoods.length > 0) {
        // Map FdcCache to USDAFoodItem format
        const foods: USDAFoodItem[] = validFoods.map(food => {
          // Use fullData if available, otherwise construct from cached fields
          if (food.fullData) {
            return food.fullData as USDAFoodItem;
          }
          
          // Construct from available fields
          return {
            fdcId: parseInt(food.fdcId),
            description: food.description,
            dataType: food.dataType || undefined,
            brandOwner: food.brandOwner || undefined,
            brandName: food.brandName || undefined,
            ingredients: food.ingredients || undefined,
            servingSize: food.servingSize || undefined,
            servingSizeUnit: food.servingSizeUnit || undefined,
            foodNutrients: food.nutrients as any,
          };
        });
        
        return {
          foods,
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
    console.log(`[USDA Cache] Miss for query: "${searchOptions.query}" (key: ${cacheKey}) - fetching from API`);
    const response = await originalSearchUSDAFoods(searchOptions);
    
    // Cache the search results
    if (response && response.foods && response.foods.length > 0) {
      // Cache individual foods
      const cachePromises = response.foods.map(food => 
        storage.cacheFood({
          fdcId: String(food.fdcId),
          description: food.description,
          dataType: food.dataType,
          brandOwner: food.brandOwner,
          brandName: food.brandName,
          ingredients: food.ingredients,
          servingSize: food.servingSize,
          servingSizeUnit: food.servingSizeUnit,
          nutrients: food.foodNutrients as any, // JSONB type - cast to any
          fullData: food as any, // JSONB type - cast to any
        })
      );
      
      await Promise.all(cachePromises);
      
      // Cache the search query with FDC IDs in memory
      searchCache.set(cacheKey, {
        query: searchOptions.query,
        fdcIds: response.foods.map(f => String(f.fdcId)),
        totalHits: response.totalHits,
        cachedAt: new Date(),
      });
      
      console.log(`[USDA Cache] Cached ${response.foods.length} foods for query: "${searchOptions.query}"`);
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
    const cached = await storage.getCachedFood(String(fdcId));
    if (cached && isCacheValid(cached.cachedAt, CACHE_TTL.FOOD_ITEM)) {
      console.log(`[USDA Cache] Hit for FDC ID: ${fdcId}`);
      return cached.fullData || cached;
    }
    console.log(`[USDA Cache] Miss or expired for FDC ID: ${fdcId}`);
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
  
  console.log('[USDA Cache] Preloading common searches...');
  
  for (const query of commonSearches) {
    try {
      // Check if already cached in memory
      const cacheKey = generateCacheKey(query);
      const cached = searchCache.get(cacheKey);
      if (!cached || !isCacheValid(cached.cachedAt, SEARCH_CACHE_TTL)) {
        // Preload with small page size
        await searchUSDAFoodsCached({ query, pageSize: 10, pageNumber: 1 });
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`[USDA Cache] Failed to preload "${query}":`, error);
    }
  }
  
  console.log('[USDA Cache] Preloading complete');
}

// Clear old cache entries
export async function cleanupCache(): Promise<void> {
  try {
    // Clear old in-memory search cache
    const now = new Date();
    const entries = Array.from(searchCache.entries());
    for (const [key, entry] of entries) {
      if (!isCacheValid(entry.cachedAt, SEARCH_CACHE_TTL)) {
        searchCache.delete(key);
      }
    }
    
    // Clear old database cache
    await storage.clearOldCache(30); // Clear cache older than 30 days
    console.log('[USDA Cache] Cleanup completed');
  } catch (error) {
    console.error('[USDA Cache] Cleanup failed:', error);
  }
}
