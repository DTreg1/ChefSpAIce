import { db } from "./db";
import { barcodeProducts } from "@shared/schema";
import { eq } from "drizzle-orm";
import type { BarcodeProduct, InsertBarcodeProduct } from "@shared/schema";

// Cache durations in milliseconds
const CACHE_SUCCESS_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days for successful lookups
const CACHE_FAILURE_DURATION = 7 * 24 * 60 * 60 * 1000;  // 7 days for failed lookups

interface CacheResult {
  found: boolean;
  expired: boolean;
  product?: BarcodeProduct;
}

interface ProductInfo {
  code: string;
  name: string;
  brand?: string;
  imageUrl?: string;
  description?: string;
  source?: 'barcode_lookup' | 'openfoodfacts';
}

export async function checkCache(barcode: string): Promise<CacheResult> {
  try {
    const cached = await db.select()
      .from(barcodeProducts)
      .where(eq(barcodeProducts.barcodeNumber, barcode))
      .limit(1);
    
    if (cached.length === 0) {
      return { found: false, expired: false };
    }
    
    const product = cached[0];
    
    // Check if cache is expired
    if (product.expiresAt && new Date() > product.expiresAt) {
      return { found: true, expired: true, product };
    }
    
    return { found: true, expired: false, product };
  } catch (error) {
    console.error('Cache check error:', error);
    return { found: false, expired: false };
  }
}

export async function checkMultipleCache(barcodes: string[]): Promise<Map<string, CacheResult>> {
  const results = new Map<string, CacheResult>();
  
  try {
    // Batch query all barcodes at once
    const cached = await db.select()
      .from(barcodeProducts)
      .where(eq(barcodeProducts.barcodeNumber, barcodes[0]))
      .execute();
    
    // For multiple barcodes, we need to use a different approach
    // Let's query each one (in a real production app, you'd use an IN query)
    for (const barcode of barcodes) {
      const result = await checkCache(barcode);
      results.set(barcode, result);
    }
    
    return results;
  } catch (error) {
    console.error('Multiple cache check error:', error);
    // Return empty results for all barcodes
    barcodes.forEach(barcode => {
      results.set(barcode, { found: false, expired: false });
    });
    return results;
  }
}

export async function saveToCache(productInfo: ProductInfo, lookupFailed: boolean = false): Promise<void> {
  try {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (lookupFailed ? CACHE_FAILURE_DURATION : CACHE_SUCCESS_DURATION));
    
    const cacheData = {
      barcodeNumber: productInfo.code,
      title: lookupFailed ? 'Product not found' : productInfo.name,
      brand: productInfo.brand || null,
      description: productInfo.description || null,
      images: productInfo.imageUrl ? [productInfo.imageUrl] : null,
      cachedAt: now,
      expiresAt: expiresAt,
      lookupFailed: lookupFailed,
      source: productInfo.source || null,
    };
    
    // Upsert the cache entry
    await db.insert(barcodeProducts)
      .values([cacheData])
      .onConflictDoUpdate({
        target: barcodeProducts.barcodeNumber,
        set: {
          title: cacheData.title,
          brand: cacheData.brand,
          description: cacheData.description,
          images: cacheData.images,
          cachedAt: now,
          expiresAt: expiresAt,
          lookupFailed: lookupFailed,
          source: productInfo.source,
          lastUpdate: now,
        }
      });
    
    console.log(`Cached ${lookupFailed ? 'failed lookup' : 'product'} for barcode ${productInfo.code}`);
  } catch (error) {
    console.error('Cache save error:', error);
  }
}

export async function getCacheStatistics(): Promise<{
  totalCached: number;
  validCache: number;
  expiredCache: number;
  failedLookups: number;
}> {
  try {
    const allCached = await db.select().from(barcodeProducts);
    const now = new Date();
    
    const validCache = allCached.filter(p => p.expiresAt && p.expiresAt > now && !p.lookupFailed).length;
    const expiredCache = allCached.filter(p => p.expiresAt && p.expiresAt <= now).length;
    const failedLookups = allCached.filter(p => p.lookupFailed).length;
    
    return {
      totalCached: allCached.length,
      validCache,
      expiredCache,
      failedLookups,
    };
  } catch (error) {
    console.error('Cache statistics error:', error);
    return {
      totalCached: 0,
      validCache: 0,
      expiredCache: 0,
      failedLookups: 0,
    };
  }
}

export function isExpired(product: BarcodeProduct): boolean {
  if (!product.expiresAt) return true;
  return new Date() > product.expiresAt;
}

// Convert cached product to API response format
export function formatCachedProduct(product: BarcodeProduct): ProductInfo {
  return {
    code: product.barcodeNumber,
    name: product.title,
    brand: product.brand || undefined,
    imageUrl: product.images?.[0] || undefined,
    description: product.description || undefined,
    source: (product.source as 'barcode_lookup' | 'openfoodfacts') || undefined,
  };
}