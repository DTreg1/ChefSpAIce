// In-memory cache for barcode lookups (database table was removed)
// Barcode data is now stored directly in userInventory.barcodeData

// Cache durations in milliseconds
const CACHE_SUCCESS_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days for successful lookups
const CACHE_FAILURE_DURATION = 7 * 24 * 60 * 60 * 1000;  // 7 days for failed lookups

interface CachedProduct {
  code: string;
  name: string;
  brand?: string;
  imageUrl?: string;
  description?: string;
  source?: 'barcode_lookup' | 'openfoodfacts';
  cachedAt: Date;
  expiresAt: Date;
  lookupFailed: boolean;
}

interface CacheResult {
  found: boolean;
  expired: boolean;
  product?: CachedProduct;
}

interface ProductInfo {
  code: string;
  name: string;
  brand?: string;
  imageUrl?: string;
  description?: string;
  source?: 'barcode_lookup' | 'openfoodfacts';
}

// In-memory cache storage
const barcodeCache = new Map<string, CachedProduct>();

// Clean up expired entries periodically
setInterval(() => {
  const now = new Date();
  for (const [barcode, product] of Array.from(barcodeCache.entries())) {
    if (product.expiresAt < now) {
      barcodeCache.delete(barcode);
    }
  }
}, 60 * 60 * 1000); // Clean up every hour

export async function checkCache(barcode: string): Promise<CacheResult> {
  try {
    const product = barcodeCache.get(barcode);
    
    if (!product) {
      return { found: false, expired: false };
    }
    
    // Check if cache is expired
    if (new Date() > product.expiresAt) {
      barcodeCache.delete(barcode);
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
    
    const cachedProduct: CachedProduct = {
      code: productInfo.code,
      name: lookupFailed ? 'Product not found' : productInfo.name,
      brand: productInfo.brand,
      imageUrl: productInfo.imageUrl,
      description: productInfo.description,
      source: productInfo.source,
      cachedAt: now,
      expiresAt: expiresAt,
      lookupFailed: lookupFailed,
    };
    
    barcodeCache.set(productInfo.code, cachedProduct);
    
    // console.log(`Cached ${lookupFailed ? 'failed lookup' : 'product'} for barcode ${productInfo.code}`);
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
    const now = new Date();
    const allCached = Array.from(barcodeCache.values());
    
    const validCache = allCached.filter(p => p.expiresAt > now && !p.lookupFailed).length;
    const expiredCache = allCached.filter(p => p.expiresAt <= now).length;
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

export function isExpired(product: CachedProduct): boolean {
  return new Date() > product.expiresAt;
}

// Convert cached product to API response format
export function formatCachedProduct(product: CachedProduct): ProductInfo {
  return {
    code: product.code,
    name: product.name,
    brand: product.brand,
    imageUrl: product.imageUrl,
    description: product.description,
    source: product.source,
  };
}
