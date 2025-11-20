import { BarcodeLookupService } from "./barcodeLookup";
import { foodStorage } from "../storage/index";

// Initialize barcode lookup service
const barcodeLookupService = new BarcodeLookupService();

// Cached USDA function already exists in usdaCache.ts, import it
export { searchUSDAFoodsCached, getCachedFoodById, preloadCommonSearches } from "../utils/usdaCache";

// Cache for barcode products - The BarcodeLookupService already handles caching internally
// This function is kept for backward compatibility but delegates to the service
export async function getBarcodeLookupProductCached(barcode: string): Promise<any | null> {
  try {
    // The BarcodeLookupService already implements caching with ApiCacheService
    const product = await barcodeLookupService.lookupByBarcode(barcode);
    return product;
  } catch (error) {
    console.error(`[Barcode Cache] Error for barcode ${barcode}:`, error);
    throw error;
  }
}

// Clean up old cache entries for all APIs
export async function cleanupAllCaches(): Promise<void> {
  try {
    // Clean USDA cache
    await foodStorage.clearOldCache(30);
    // console.log('[Cache Cleanup] USDA cache cleaned');
    
    // The ApiCacheService (used by BarcodeLookupService) handles its own cleanup automatically
    // via startPeriodicCleanup() method, so no manual cleanup needed here
    
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
    const usdaStats = await foodStorage.getUSDACacheStats();
    
    // The barcode cache stats are now managed by ApiCacheService
    // We can't easily access them from here, so returning empty stats for now
    // The ApiCacheService has its own getStatistics() method if needed
    
    return {
      usda: usdaStats,
      barcode: {
        totalEntries: 0, // Statistics not accessible from ApiCacheService instance in BarcodeLookupService
        oldestEntry: null,
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