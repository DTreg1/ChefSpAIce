import { storage } from "../storage";
import { searchUSDAFoods as originalSearchUSDAFoods, USDASearchOptions } from "../usda";
import { getBarcodeLookupProduct as originalGetBarcodeLookupProduct } from "../barcodelookup";
import type { USDASearchResponse } from "@shared/schema";
import crypto from "crypto";

// Cache TTL settings (in milliseconds)
const CACHE_TTL = {
  USDA_SEARCH: 24 * 60 * 60 * 1000,  // 24 hours for USDA search results
  USDA_FOOD_ITEM: 7 * 24 * 60 * 60 * 1000, // 7 days for individual food items
  BARCODE_PRODUCT: 30 * 24 * 60 * 60 * 1000, // 30 days for barcode products (rarely change)
  COMMON_SEARCHES: 48 * 60 * 60 * 1000, // 48 hours for common searches
};

// Cached USDA function already exists in usdaCache.ts, import it
export { searchUSDAFoodsCached, getCachedFoodById, preloadCommonSearches } from "../utils/usdaCache";

// Cache for barcode products with database persistence
export async function getBarcodeLookupProductCached(barcode: string): Promise<any | null> {
  try {
    // Check if we have this barcode cached in the database
    const cached = await storage.getCachedBarcodeProduct(barcode);
    
    if (cached) {
      const age = Date.now() - new Date(cached.cachedAt).getTime();
      if (age < CACHE_TTL.BARCODE_PRODUCT) {
        console.log(`[Barcode Cache] Hit for barcode: ${barcode}`);
        return cached;
      }
    }
    
    // Cache miss - fetch from API
    console.log(`[Barcode Cache] Miss for barcode: ${barcode} - fetching from API`);
    const product = await originalGetBarcodeLookupProduct(barcode);
    
    if (product) {
      // Store in database cache
      await storage.cacheBarcodeProduct({
        barcodeNumber: barcode,
        productName: product.title || product.barcode_number || '',
        title: product.title,
        alias: product.title, // Using title as alias if not provided
        description: product.description,
        brand: product.brand,
        manufacturer: product.manufacturer,
        mpn: product.mpn,
        msrp: product.weight, // Assuming weight might contain price info
        asin: product.asin,
        category: product.category,
        imageUrl: product.images?.[0],
        reviews: [], // Barcode Lookup doesn't provide reviews in basic tier
        stores: product.stores?.map(store => ({
          store_name: store.name || '',
          store_price: store.price || '',
          product_url: store.link || '',
          currency_code: 'USD',
          currency_symbol: '$',
        })) || [],
        cachedAt: new Date(),
      });
      
      console.log(`[Barcode Cache] Cached product for barcode: ${barcode}`);
      return product;
    }
    
    return null;
  } catch (error) {
    console.error(`[Barcode Cache] Error for barcode ${barcode}:`, error);
    // If it's a 404, cache the null result to avoid repeated lookups
    if ((error as any)?.status === 404) {
      await storage.cacheBarcodeProduct({
        barcodeNumber: barcode,
        productName: 'NOT_FOUND',
        cachedAt: new Date(),
      });
    }
    throw error;
  }
}

// Clean up old cache entries for all APIs
export async function cleanupAllCaches(): Promise<void> {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Clean USDA cache
    await storage.clearOldCache(30);
    console.log('[Cache Cleanup] USDA cache cleaned');
    
    // Clean barcode cache
    await storage.clearOldBarcodeCache(thirtyDaysAgo);
    console.log('[Cache Cleanup] Barcode cache cleaned');
    
    console.log('[Cache Cleanup] All caches cleaned successfully');
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
    const barcodeStats = await storage.getBarcodeCacheStats();
    
    return {
      usda: usdaStats,
      barcode: barcodeStats,
    };
  } catch (error) {
    console.error('[Cache Stats] Error getting stats:', error);
    return {
      usda: { totalEntries: 0, oldestEntry: null },
      barcode: { totalEntries: 0, oldestEntry: null },
    };
  }
}