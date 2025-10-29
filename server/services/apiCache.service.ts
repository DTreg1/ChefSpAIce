import { getBarcodeLookupProduct as originalGetBarcodeLookupProduct } from "../barcodelookup";
import { storage } from "../storage";

// Cache TTL settings (in milliseconds)
const CACHE_TTL = {
  USDA_SEARCH: 24 * 60 * 60 * 1000,  // 24 hours for USDA search results
  USDA_FOOD_ITEM: 7 * 24 * 60 * 60 * 1000, // 7 days for individual food items
  BARCODE_PRODUCT: 30 * 24 * 60 * 60 * 1000, // 30 days for barcode products (rarely change)
  COMMON_SEARCHES: 48 * 60 * 60 * 1000, // 48 hours for common searches
};

// Cached USDA function already exists in usdaCache.ts, import it
export { searchUSDAFoodsCached, getCachedFoodById, preloadCommonSearches } from "../utils/usdaCache";

// In-memory cache for barcode products (simple implementation)
const barcodeCache = new Map<string, { data: any; timestamp: number }>();

// Cache for barcode products with in-memory storage
export async function getBarcodeLookupProductCached(barcode: string): Promise<any | null> {
  try {
    // Check in-memory cache
    const cached = barcodeCache.get(barcode);
    if (cached) {
      const age = Date.now() - cached.timestamp;
      if (age < CACHE_TTL.BARCODE_PRODUCT) {
        // console.log(`[Barcode Cache] Hit for barcode: ${barcode}`);
        return cached.data;
      } else {
        // Cache expired, remove it
        barcodeCache.delete(barcode);
      }
    }
    
    // Cache miss - fetch from API
    // console.log(`[Barcode Cache] Miss for barcode: ${barcode} - fetching from API`);
    const product = await originalGetBarcodeLookupProduct(barcode);
    
    if (product) {
      // Store in memory cache
      barcodeCache.set(barcode, {
        data: product,
        timestamp: Date.now(),
      });
      // console.log(`[Barcode Cache] Cached product for barcode: ${barcode}`);
      return product;
    }
    
    return null;
  } catch (error) {
    console.error(`[Barcode Cache] Error for barcode ${barcode}:`, error);
    // If it's a 404, cache the null result to avoid repeated lookups
    if ((error as any)?.status === 404) {
      barcodeCache.set(barcode, {
        data: null,
        timestamp: Date.now(),
      });
    }
    throw error;
  }
}

// Clean up old cache entries for all APIs
export async function cleanupAllCaches(): Promise<void> {
  try {
    // Clean USDA cache
    await storage.clearOldCache(30);
    // console.log('[Cache Cleanup] USDA cache cleaned');
    
    // Clean in-memory barcode cache
    const now = Date.now();
    Array.from(barcodeCache.entries()).forEach(([key, value]) => {
      const age = now - value.timestamp;
      if (age > CACHE_TTL.BARCODE_PRODUCT) {
        barcodeCache.delete(key);
      }
    });
    // console.log('[Cache Cleanup] Barcode cache cleaned');
    
    // console.log('[Cache Cleanup] All caches cleaned successfully');
  } catch (error) {
    console.error('[Cache Cleanup] Failed:', error);
  }
}

// Get cache statistics for monitoring
export async function getCacheStats(): Promise<{
  usda: { totalEntries: number; oldestEntry: Date | null };
  barcode: { totalEntries: number; oldestEntry: Date | null };
}> {
  try {
    const usdaStats = await storage.getUSDACacheStats();
    
    // Get barcode cache stats from in-memory cache
    let oldestTimestamp: number | null = null;
    Array.from(barcodeCache.values()).forEach(value => {
      if (oldestTimestamp === null || value.timestamp < oldestTimestamp) {
        oldestTimestamp = value.timestamp;
      }
    });
    
    return {
      usda: usdaStats,
      barcode: {
        totalEntries: barcodeCache.size,
        oldestEntry: oldestTimestamp ? new Date(oldestTimestamp) : null,
      },
    };
  } catch (error) {
    console.error('[Cache Stats] Error getting stats:', error);
    return {
      usda: { totalEntries: 0, oldestEntry: null },
      barcode: { totalEntries: 0, oldestEntry: null },
    };
  }
}