import { ApiCacheService, apiCache } from '../utils/ApiCacheService';

// Barcode product types (database tables removed, API-only service)
export interface BarcodeProduct {
  barcodeNumber: string;
  title: string;
  category?: string | null;
  brand?: string | null;
  productAttributes?: {
    barcodeFormats?: string;
    mpn?: string;
    model?: string;
    asin?: string;
    manufacturer?: string;
    color?: string;
    material?: string;
    size?: string;
    weight?: string;
    dimensions?: {
      length?: string;
      width?: string;
      height?: string;
    };
    description?: string;
    features?: string[];
    images?: string[];
    capabilities?: string[];
    capacity?: string;
    servingSize?: string;
  } | null;
  stores?: Array<{
    name: string;
    country: string;
    currency: string;
    price: string;
    salePrice?: string;
    link?: string;
    availability?: string;
    lastUpdate: string;
  }> | null;
  rawData?: any;
}

export interface BarcodeLookupResponse {
  products: Array<{
    barcode_number: string;
    barcode_formats?: string;
    mpn?: string;
    model?: string;
    asin?: string;
    title: string;
    category?: string;
    manufacturer?: string;
    brand?: string;
    
    // Physical attributes
    color?: string;
    material?: string;
    size?: string;
    weight?: string;
    length?: string;
    width?: string;
    height?: string;
    
    // Product details
    description?: string;
    features?: string[];
    images?: string[];
    
    // Store information
    stores?: Array<{
      name: string;
      country: string;
      currency: string;
      currency_symbol: string;
      price: string;
      sale_price?: string;
      link?: string;
      availability?: string;
      last_update: string;
    }>;
    
    last_update?: string;
    reviews?: any[];
  }>;
}

export class BarcodeLookupService {
  private readonly apiKey: string;
  private readonly baseUrl = "https://api.barcodelookup.com/v3";

  constructor() {
    this.apiKey = process.env.BARCODE_LOOKUP_API_KEY || '';
    
    if (!this.apiKey) {
      console.warn('Barcode Lookup API key not configured');
    }
  }

  /**
   * Parse capabilities from product description and title
   */
  private extractCapabilities(product: BarcodeLookupResponse['products'][0]): string[] {
    const capabilities: string[] = [];
    const text = `${product.title} ${product.description || ''}`.toLowerCase();
    
    // Define capability keywords to look for
    const capabilityKeywords = {
      grill: ['grill', 'grilling'],
      bake: ['bake', 'baking', 'oven'],
      air_fry: ['air fry', 'air fryer', 'air crisp', 'air-fry'],
      dehydrate: ['dehydrate', 'dehydrator'],
      broil: ['broil', 'broiling'],
      toast: ['toast', 'toaster'],
      roast: ['roast', 'roasting'],
      steam: ['steam', 'steamer'],
      pressure_cook: ['pressure cook', 'pressure cooker', 'instant pot'],
      slow_cook: ['slow cook', 'slow cooker', 'crock pot'],
      blend: ['blend', 'blender', 'mix'],
      food_process: ['food process', 'processor', 'chop', 'dice'],
      warm: ['warm', 'warmer', 'keep warm'],
      reheat: ['reheat', 'microwave'],
      sauté: ['sauté', 'saute', 'pan fry']
    };
    
    for (const [capability, keywords] of Object.entries(capabilityKeywords)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        capabilities.push(capability);
      }
    }
    
    return capabilities;
  }

  /**
   * Extract serving size/capacity from product description
   */
  private extractCapacity(product: BarcodeLookupResponse['products'][0]): {
    capacity?: string;
    servingSize?: string;
  } {
    const text = `${product.title} ${product.description || ''}`;
    
    // Look for capacity patterns (e.g., "4-qt", "6 quart", "5L")
    const capacityMatch = text.match(/(\d+(?:\.\d+)?)\s*[-\s]?(qt|quart|l|liter|litre|gal|gallon|oz|cup)/i);
    
    // Look for serving patterns (e.g., "serves 4", "4 servings", "up to 6 people")
    const servingMatch = text.match(/(?:serves?|serving[s]?|up to)\s+(\d+)\s*(?:people|person|servings?)?/i);
    
    return {
      capacity: capacityMatch ? capacityMatch[0] : undefined,
      servingSize: servingMatch ? `up to ${servingMatch[1]} servings` : undefined
    };
  }

  /**
   * Look up a product by barcode
   */
  async lookupByBarcode(barcode: string): Promise<BarcodeProduct | null> {
    try {
      // Check ApiCacheService cache
      const cacheKey = ApiCacheService.generateKey('barcode', barcode);
      const cached = apiCache.get<BarcodeProduct>(cacheKey);
      if (cached) {
        console.log(`Found cached barcode product: ${barcode}`);
        return cached;
      }

      // If not cached and we have an API key, fetch from API
      if (!this.apiKey) {
        console.warn('Cannot fetch barcode data: API key not configured');
        return null;
      }

      const url = `${this.baseUrl}/products?barcode=${barcode}&formatted=y&key=${this.apiKey}`;
      
      console.log(`Fetching barcode data for: ${barcode}`);
      const response = await fetch(url);
      
      if (!response.ok) {
        if (response.status === 404) {
          console.log(`No product found for barcode: ${barcode}`);
          return null;
        }
        throw new Error(`Barcode API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as BarcodeLookupResponse;
      
      if (!data.products || data.products.length === 0) {
        console.log(`No products returned for barcode: ${barcode}`);
        return null;
      }

      const product = data.products[0];
      
      // Extract capabilities and capacity for appliances
      const capabilities = this.extractCapabilities(product);
      const { capacity, servingSize } = this.extractCapacity(product);
      
      // Transform API response to our format
      const barcodeProduct: BarcodeProduct = {
        barcodeNumber: product.barcode_number,
        title: product.title,
        category: product.category,
        brand: product.brand,
        
        // All other properties go into productAttributes
        productAttributes: {
          barcodeFormats: product.barcode_formats,
          mpn: product.mpn,
          model: product.model,
          asin: product.asin,
          manufacturer: product.manufacturer,
          
          // Physical attributes
          color: product.color,
          material: product.material,
          size: product.size,
          weight: product.weight,
          dimensions: (product.length || product.width || product.height) ? {
            length: product.length,
            width: product.width,
            height: product.height
          } : undefined,
          
          // Product details
          description: product.description,
          features: product.features,
          images: product.images,
          
          // Appliance-specific fields
          capabilities: capabilities.length > 0 ? capabilities : undefined,
          capacity,
          servingSize,
        },
        
        // Store information
        stores: product.stores?.map(store => ({
          name: store.name,
          country: store.country,
          currency: store.currency,
          price: store.price,
          salePrice: store.sale_price,
          link: store.link,
          availability: store.availability,
          lastUpdate: store.last_update
        })),
        
        // Metadata
        rawData: data
      };

      // Cache the product using ApiCacheService
      apiCache.set(cacheKey, barcodeProduct);
      console.log(`Cached barcode product: ${barcode}`);
      
      return barcodeProduct;
    } catch (error) {
      console.error(`Error looking up barcode ${barcode}:`, error);
      throw error;
    }
  }

  /**
   * Look up multiple products by barcode in batch
   * Optimizes by checking cache first and fetching missing ones in parallel
   */
  async lookupBatch(barcodes: string[]): Promise<Map<string, BarcodeProduct | null>> {
    const results = new Map<string, BarcodeProduct | null>();
    const uncachedBarcodes: string[] = [];
    
    // First, check cache for all barcodes
    for (const barcode of barcodes) {
      const cacheKey = ApiCacheService.generateKey('barcode', barcode);
      const cached = apiCache.get<BarcodeProduct>(cacheKey);
      if (cached) {
        results.set(barcode, cached);
      } else {
        uncachedBarcodes.push(barcode);
      }
    }
    
    console.log(`Found ${results.size} cached barcodes, need to fetch ${uncachedBarcodes.length}`);
    
    // If we have uncached barcodes and an API key, fetch them
    if (uncachedBarcodes.length > 0 && this.apiKey) {
      // Process in parallel with controlled concurrency (max 5 at a time)
      const concurrencyLimit = 5;
      const chunks: string[][] = [];
      
      for (let i = 0; i < uncachedBarcodes.length; i += concurrencyLimit) {
        chunks.push(uncachedBarcodes.slice(i, i + concurrencyLimit));
      }
      
      for (const chunk of chunks) {
        const promises = chunk.map(async (barcode) => {
          try {
            const product = await this.lookupByBarcode(barcode);
            results.set(barcode, product);
          } catch (error) {
            console.error(`Failed to lookup barcode ${barcode}:`, error);
            results.set(barcode, null);
          }
        });
        
        await Promise.all(promises);
      }
    } else if (uncachedBarcodes.length > 0) {
      // No API key, set all uncached to null
      for (const barcode of uncachedBarcodes) {
        results.set(barcode, null);
      }
    }
    
    return results;
  }

  /**
   * Search for products by query (no caching for search results, just API calls)
   */
  async searchProducts(query: string): Promise<BarcodeProduct[]> {
    try {
      // No database search available, go directly to API
      if (!this.apiKey) {
        console.warn('Cannot search products: API key not configured');
        return [];
      }

      const url = `${this.baseUrl}/products?search=${encodeURIComponent(query)}&formatted=y&key=${this.apiKey}`;
      
      console.log(`Searching for products: ${query}`);
      const response = await fetch(url);
      
      if (!response.ok) {
        if (response.status === 404) {
          console.log(`No products found for query: ${query}`);
          return [];
        }
        throw new Error(`Barcode API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as BarcodeLookupResponse;
      
      if (!data.products || data.products.length === 0) {
        console.log(`No products returned for query: ${query}`);
        return [];
      }

      // Transform all results
      const products: BarcodeProduct[] = [];
      
      for (const product of data.products) {
        // Extract capabilities and capacity
        const capabilities = this.extractCapabilities(product);
        const { capacity, servingSize } = this.extractCapacity(product);
        
        // Transform to our format
        const barcodeProduct: BarcodeProduct = {
          barcodeNumber: product.barcode_number,
          title: product.title,
          category: product.category,
          brand: product.brand,
          
          // All other properties go into productAttributes
          productAttributes: {
            barcodeFormats: product.barcode_formats,
            mpn: product.mpn,
            model: product.model,
            asin: product.asin,
            manufacturer: product.manufacturer,
            color: product.color,
            material: product.material,
            size: product.size,
            weight: product.weight,
            dimensions: (product.length || product.width || product.height) ? {
              length: product.length,
              width: product.width,
              height: product.height
            } : undefined,
            description: product.description,
            features: product.features,
            images: product.images,
            capabilities: capabilities.length > 0 ? capabilities : undefined,
            capacity,
            servingSize,
          },
          stores: product.stores?.map(store => ({
            name: store.name,
            country: store.country,
            currency: store.currency,
            price: store.price,
            salePrice: store.sale_price,
            link: store.link,
            availability: store.availability,
            lastUpdate: store.last_update
          })),
          rawData: { products: [product] }
        };

        // Cache this product using ApiCacheService
        const productCacheKey = ApiCacheService.generateKey('barcode', product.barcode_number);
        apiCache.set(productCacheKey, barcodeProduct);
        
        products.push(barcodeProduct);
      }

      console.log(`Found ${products.length} products from search`);
      return products;
    } catch (error) {
      console.error(`Error searching products for query "${query}":`, error);
      throw error;
    }
  }
}
