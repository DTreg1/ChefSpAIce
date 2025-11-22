import { BarcodeLookupService } from "./barcodeLookup";

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
    // All caches now use ApiCacheService which handles its own cleanup automatically
    // via startPeriodicCleanup() method. USDA cache is in-memory only (no database table).
    // No manual cleanup needed.
    
    // console.log('[Cache Cleanup] All caches handle their own cleanup automatically');
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
    // Both USDA and barcode caches now use ApiCacheService (in-memory only)
    // The ApiCacheService has its own getStatistics() method if needed
    // Returning empty stats since we no longer track database cache
    
    return {
      usda: {
        totalEntries: 0, // USDA cache is now in-memory only (ApiCacheService)
        oldestEntry: null,
      },
      barcode: {
        totalEntries: 0, // Barcode cache uses ApiCacheService instance
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