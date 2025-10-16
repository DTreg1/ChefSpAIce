import type { BarcodeProduct, InsertBarcodeProduct } from "@shared/schema";
import type { IStorage } from "../storage";
import { ApiError } from "../apiError";

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
  private readonly storage: IStorage;

  constructor(storage: IStorage) {
    this.apiKey = process.env.BARCODE_LOOKUP_API_KEY || '';
    this.storage = storage;
    
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
      // First check if we have it cached in our database
      const cachedProduct = await this.storage.getBarcodeProduct(barcode);
      if (cachedProduct) {
        console.log(`Found cached barcode product: ${barcode}`);
        return cachedProduct;
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
        throw new ApiError(`Barcode API error: ${response.statusText}`, response.status);
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
      
      // Transform API response to our database format
      const barcodeProduct: InsertBarcodeProduct = {
        barcodeNumber: product.barcode_number,
        barcodeFormats: product.barcode_formats,
        mpn: product.mpn,
        model: product.model,
        asin: product.asin,
        title: product.title,
        category: product.category,
        manufacturer: product.manufacturer,
        brand: product.brand,
        
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

      // Save to database
      const savedProduct = await this.storage.createBarcodeProduct(barcodeProduct);
      console.log(`Cached barcode product: ${barcode}`);
      
      return savedProduct;
    } catch (error: any) {
      console.error(`Error looking up barcode ${barcode}:`, error);
      
      // If it's already an ApiError, re-throw it
      if (error instanceof ApiError) {
        throw error;
      }
      
      // Otherwise, wrap it in an ApiError
      throw new ApiError(
        `Failed to look up barcode: ${error.message || 'Unknown error'}`,
        500,
        { barcode }
      );
    }
  }

  /**
   * Search for products by query
   */
  async searchProducts(query: string): Promise<BarcodeProduct[]> {
    try {
      // First search in our cached products
      const cachedProducts = await this.storage.searchBarcodeProducts(query);
      
      if (cachedProducts.length > 0) {
        console.log(`Found ${cachedProducts.length} cached products for query: ${query}`);
        return cachedProducts;
      }

      // If no cached results and we have an API key, search via API
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
        throw new ApiError(`Barcode API error: ${response.statusText}`, response.status);
      }

      const data = await response.json() as BarcodeLookupResponse;
      
      if (!data.products || data.products.length === 0) {
        console.log(`No products returned for query: ${query}`);
        return [];
      }

      // Transform and cache all results
      const products: BarcodeProduct[] = [];
      
      for (const product of data.products) {
        // Check if already cached
        const existing = await this.storage.getBarcodeProduct(product.barcode_number);
        if (existing) {
          products.push(existing);
          continue;
        }

        // Extract capabilities and capacity
        const capabilities = this.extractCapabilities(product);
        const { capacity, servingSize } = this.extractCapacity(product);
        
        // Transform and save
        const barcodeProduct: InsertBarcodeProduct = {
          barcodeNumber: product.barcode_number,
          barcodeFormats: product.barcode_formats,
          mpn: product.mpn,
          model: product.model,
          asin: product.asin,
          title: product.title,
          category: product.category,
          manufacturer: product.manufacturer,
          brand: product.brand,
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

        const savedProduct = await this.storage.createBarcodeProduct(barcodeProduct);
        products.push(savedProduct);
      }

      console.log(`Cached ${products.length} products from search`);
      return products;
    } catch (error: any) {
      console.error(`Error searching products for query "${query}":`, error);
      
      // If it's already an ApiError, re-throw it
      if (error instanceof ApiError) {
        throw error;
      }
      
      // Otherwise, wrap it in an ApiError
      throw new ApiError(
        `Failed to search products: ${error.message || 'Unknown error'}`,
        500,
        { query }
      );
    }
  }
}