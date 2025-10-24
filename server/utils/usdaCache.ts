import { storage } from "../storage";
import { searchUSDAFoods as originalSearchUSDAFoods, USDASearchOptions } from "../usda";
import type { USDASearchResponse } from "@shared/schema";
import crypto from "crypto";

// Cache TTL settings (in milliseconds)
const CACHE_TTL = {
  SEARCH: 24 * 60 * 60 * 1000,  // 24 hours for search results
  FOOD_ITEM: 7 * 24 * 60 * 60 * 1000, // 7 days for individual food items
  COMMON_SEARCHES: 48 * 60 * 60 * 1000, // 48 hours for common searches
};

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
    // Check if we have a cached search result
    const cachedSearches = await storage.getCachedSearches(searchOptions.query);
    
    if (cachedSearches && cachedSearches.length > 0) {
      // Find exact match based on cache key
      const exactMatch = cachedSearches.find(cached => {
        const cachedKey = generateCacheKey({
          query: cached.query,
          pageSize: searchOptions.pageSize || 20,
          pageNumber: searchOptions.pageNumber || 1,
        });
        return cachedKey === cacheKey;
      });
      
      if (exactMatch && isCacheValid(exactMatch.cachedAt, CACHE_TTL.SEARCH)) {
        console.log(`[USDA Cache] Hit for query: "${searchOptions.query}" (key: ${cacheKey})`);
        
        // Get cached food items from fdcCache
        const foodPromises = exactMatch.fdcIds.map(fdcId => 
          storage.getCachedFood(fdcId)
        );
        const cachedFoods = await Promise.all(foodPromises);
        
        // Filter out any null results and reconstruct the response
        const validFoods = cachedFoods.filter(food => food !== null);
        
        if (validFoods.length > 0) {
          return {
            foods: validFoods as any, // Type assertion needed due to schema differences
            totalHits: exactMatch.totalHits || validFoods.length,
            currentPage: searchOptions.pageNumber || 1,
            totalPages: Math.ceil((exactMatch.totalHits || validFoods.length) / (searchOptions.pageSize || 20)),
          };
        }
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
          fdcId: food.fdcId,
          description: food.description,
          dataType: food.dataType,
          brandOwner: food.brandOwner,
          gtinUpc: food.gtinUpc,
          ingredients: food.ingredients,
          foodCategory: food.foodCategory,
          data: food as any, // Store full food data
        })
      );
      
      await Promise.all(cachePromises);
      
      // Cache the search query with FDC IDs
      await storage.cacheSearchResults({
        query: searchOptions.query,
        fdcIds: response.foods.map(f => f.fdcId),
        totalHits: response.totalHits,
        cachedAt: new Date().toISOString(),
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
    const cached = await storage.getCachedFood(fdcId);
    if (cached && isCacheValid(cached.cachedAt, CACHE_TTL.FOOD_ITEM)) {
      console.log(`[USDA Cache] Hit for FDC ID: ${fdcId}`);
      return cached.data;
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
      // Check if already cached
      const cached = await storage.getCachedSearches(query);
      if (!cached || cached.length === 0) {
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
    await storage.clearOldCache(30); // Clear cache older than 30 days
    console.log('[USDA Cache] Cleanup completed');
  } catch (error) {
    console.error('[USDA Cache] Cleanup failed:', error);
  }
}