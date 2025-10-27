/**
 * Barcode Lookup API Integration
 * 
 * Provides product information retrieval via barcode scanning.
 * Used for quick food item entry - scan barcode to get product name, image, and details.
 * 
 * API Provider: barcodelookup.com
 * Rate Limiting: Monthly quota based on API plan
 * Error Handling: Comprehensive error mapping for all API failure scenarios
 * 
 * Features:
 * - Single Product Lookup: Get full product details by barcode
 * - Batch Lookup: Fetch up to 10 products at once
 * - Text Search: Find products by name/keyword
 * - Rate Limit Tracking: Monitor API quota usage
 * - Image Extraction: Helper to get product images
 * 
 * Common Use Cases:
 * - User scans grocery item barcode → auto-fills name and image
 * - Bulk import from shopping receipt barcodes
 * - Product search when barcode unavailable
 */
import axios from 'axios';
import { ApiError } from './apiError';

const BARCODE_LOOKUP_API_BASE = 'https://api.barcodelookup.com/v3';

interface BarcodeLookupProduct {
  barcode_number?: string;
  barcode_formats?: string;
  mpn?: string;
  model?: string;
  asin?: string;
  title?: string;
  category?: string;
  manufacturer?: string;
  brand?: string;
  age_group?: string;
  color?: string;
  size?: string;
  weight?: string;
  description?: string;
  features?: string[];
  images?: string[];
  stores?: Array<{
    name?: string;
    price?: string;
    link?: string;
  }>;
}

interface BarcodeLookupSearchResult {
  products: BarcodeLookupProduct[];
}

export async function searchBarcodeLookup(query: string): Promise<BarcodeLookupSearchResult> {
  const apiKey = process.env.BARCODE_LOOKUP_API_KEY;
  
  if (!apiKey) {
    throw new Error('BARCODE_LOOKUP_API_KEY is not configured');
  }

  try {
    const response = await axios.get(`${BARCODE_LOOKUP_API_BASE}/products`, {
      params: {
        search: query,
        key: apiKey,
      },
      headers: {
        'Accept': 'application/json'
      }
    });

    return response.data;
  } catch (error: any) {
    const status = error.response?.status;
    const statusText = error.response?.statusText;
    
    console.error('Barcode Lookup search error:', {
      message: error.message,
      status,
      statusText,
      code: error.code,
      query
    });
    
    if (status === 401 || status === 403) {
      throw new ApiError('Barcode Lookup API authentication failed. Please check your API key.', 401);
    } else if (status === 429) {
      throw new ApiError('Barcode Lookup API rate limit exceeded. Please try again later.', 429);
    } else if (status === 400) {
      throw new ApiError('Invalid search query for Barcode Lookup API.', 400);
    } else if (status >= 500) {
      throw new ApiError('Barcode Lookup API service is temporarily unavailable.', 503);
    } else if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      throw new ApiError('Barcode Lookup API request timed out.', 504);
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      throw new ApiError('Cannot connect to Barcode Lookup API.', 503);
    }
    
    // Log the full error for debugging unexpected cases
    console.error('Unexpected error in barcode search:', error);
    throw new ApiError(`Failed to search Barcode Lookup: ${error.message || 'Unknown error'}`, 500);
  }
}

/**
 * Lookup a single product by barcode
 * 
 * Primary method for barcode scanning feature.
 * Returns full product details including name, brand, images, and pricing.
 * 
 * @param barcode - Product barcode number (UPC, EAN, etc.)
 * @returns Product object if found, null if barcode not in database
 * @throws ApiError for authentication, rate limiting, or service failures
 * 
 * Error Behavior:
 * - 404 Not Found: Returns null (valid barcode, but not in their database)
 * - 401/403: Throws ApiError (invalid API key or subscription expired)
 * - 429: Throws ApiError (monthly quota exceeded)
 * - 5xx: Throws ApiError (API service issues)
 * - Network errors: Throws ApiError (connectivity problems)
 * 
 * Usage Example:
 * ```
 * const product = await getBarcodeLookupProduct("012345678905");
 * if (product) {
 *   // Use product.title, product.images[0], etc.
 * } else {
 *   // Barcode not found - fallback to manual entry
 * }
 * ```
 */
export async function getBarcodeLookupProduct(barcode: string): Promise<BarcodeLookupProduct | null> {
  const apiKey = process.env.BARCODE_LOOKUP_API_KEY;
  
  if (!apiKey) {
    throw new Error('BARCODE_LOOKUP_API_KEY is not configured');
  }

  try {
    const response = await axios.get(`${BARCODE_LOOKUP_API_BASE}/products`, {
      params: {
        barcode: barcode,
        key: apiKey,
      },
      headers: {
        'Accept': 'application/json'
      }
    });

    // API returns array of products; take first match
    if (response.data.products && response.data.products.length > 0) {
      return response.data.products[0];
    }
    return null;
  } catch (error: any) {
    const status = error.response?.status;
    const statusText = error.response?.statusText;
    
    console.error('Barcode Lookup product lookup error:', {
      message: error.message,
      status,
      statusText,
      code: error.code,
      barcode
    });
    
    // 404 indicates barcode not found in API database
    // Return null (not an error) so caller can handle gracefully (e.g., manual entry fallback)
    if (status === 404) {
      return null;
    }
    
    // All other errors are failures that should be reported to user
    // Use structured ApiError for consistent error handling in routes
    if (status === 401 || status === 403) {
      throw new ApiError('Barcode Lookup API authentication failed. Please check your API key.', 401);
    } else if (status === 429) {
      throw new ApiError('Barcode Lookup API rate limit exceeded. Please try again later.', 429);
    } else if (status >= 500) {
      throw new ApiError('Barcode Lookup API service is temporarily unavailable.', 503);
    } else if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      throw new ApiError('Barcode Lookup API request timed out.', 504);
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      throw new ApiError('Cannot connect to Barcode Lookup API.', 503);
    }
    
    // Unexpected errors: Log for debugging and throw generic error
    console.error('Unexpected error in barcode lookup:', error);
    throw new ApiError(`Failed to fetch barcode product: ${error.message || 'Unknown error'}`, 500);
  }
}

export async function getBarcodeLookupBatch(barcodes: string[]): Promise<BarcodeLookupProduct[]> {
  const apiKey = process.env.BARCODE_LOOKUP_API_KEY;
  
  if (!apiKey) {
    throw new Error('BARCODE_LOOKUP_API_KEY is not configured');
  }

  if (barcodes.length === 0) {
    return [];
  }

  if (barcodes.length > 10) {
    throw new ApiError('Maximum 10 barcodes allowed per batch request', 400);
  }

  try {
    // Join barcodes with comma for batch query
    const barcodeString = barcodes.join(',');
    
    const response = await axios.get(`${BARCODE_LOOKUP_API_BASE}/products`, {
      params: {
        barcode: barcodeString,
        key: apiKey,
      },
      headers: {
        'Accept': 'application/json'
      }
    });

    return response.data.products || [];
  } catch (error: any) {
    const status = error.response?.status;
    const statusText = error.response?.statusText;
    
    console.error('Barcode Lookup batch lookup error:', {
      message: error.message,
      status,
      statusText,
      code: error.code,
      barcodes
    });
    
    if (status === 401 || status === 403) {
      throw new ApiError('Barcode Lookup API authentication failed. Please check your API key.', 401);
    } else if (status === 429) {
      throw new ApiError('Barcode Lookup API rate limit exceeded. Please try again later.', 429);
    } else if (status === 400) {
      throw new ApiError('Invalid batch request for Barcode Lookup API.', 400);
    } else if (status >= 500) {
      throw new ApiError('Barcode Lookup API service is temporarily unavailable.', 503);
    } else if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      throw new ApiError('Barcode Lookup API request timed out.', 504);
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      throw new ApiError('Cannot connect to Barcode Lookup API.', 503);
    }
    
    console.error('Unexpected error in barcode batch lookup:', error);
    throw new ApiError(`Failed to fetch barcode batch: ${error.message || 'Unknown error'}`, 500);
  }
}

export function extractImageUrl(product: BarcodeLookupProduct): string | undefined {
  // Return the first available image
  if (product.images && product.images.length > 0) {
    return product.images[0];
  }
  return undefined;
}

interface RateLimitResponse {
  remaining_requests: number;
  allowed_requests: number;
  reset_time: string; // Unix timestamp or ISO date
}

// Simple in-memory cache for rate limits
let rateLimitCache: {
  data: RateLimitResponse | null;
  timestamp: number;
} = {
  data: null,
  timestamp: 0
};

const RATE_LIMIT_CACHE_TTL = 60000; // 1 minute cache

export async function checkRateLimitBeforeCall(): Promise<RateLimitResponse | null> {
  const now = Date.now();
  
  // If cache is stale or empty, fetch fresh rate limits
  if (!rateLimitCache.data || (now - rateLimitCache.timestamp) > RATE_LIMIT_CACHE_TTL) {
    try {
      const limits = await getBarcodeLookupRateLimits();
      rateLimitCache = {
        data: limits,
        timestamp: now
      };
    } catch (error) {
      // If we can't fetch rate limits, return null and allow the call to proceed
      // (The actual API call will handle rate limit errors if they occur)
      console.warn('Could not fetch rate limits, proceeding with API call:', error);
      return null;
    }
  }
  
  // Return the cached rate limit info for informational purposes
  // Let the actual API calls handle 429 errors authoritatively
  return rateLimitCache.data;
}

export async function getBarcodeLookupRateLimits(): Promise<RateLimitResponse> {
  const apiKey = process.env.BARCODE_LOOKUP_API_KEY;
  
  if (!apiKey) {
    throw new Error('BARCODE_LOOKUP_API_KEY is not configured');
  }

  try {
    const response = await axios.get(`${BARCODE_LOOKUP_API_BASE}/rate-limits`, {
      params: {
        key: apiKey,
      },
      headers: {
        'Accept': 'application/json'
      }
    });

    // Map the API response to our expected format
    const apiData = response.data;
    
    // Use the reset time from API if available, otherwise calculate end of month
    let resetTime: string;
    if (apiData.reset_time) {
      // Handle both ISO string and numeric timestamp formats
      if (typeof apiData.reset_time === 'number') {
        resetTime = new Date(apiData.reset_time * 1000).toISOString();
      } else {
        resetTime = apiData.reset_time;
      }
    } else {
      // Fallback: Calculate reset time (beginning of next month)
      const now = new Date();
      const resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      resetTime = resetDate.toISOString();
    }
    
    return {
      remaining_requests: apiData.remaining_calls_per_month || 0,
      allowed_requests: apiData.allowed_calls_per_month || 0,
      reset_time: resetTime
    };
  } catch (error: any) {
    const status = error.response?.status;
    const statusText = error.response?.statusText;
    
    console.error('Barcode Lookup rate limits error:', {
      message: error.message,
      status,
      statusText,
      code: error.code
    });
    
    if (status === 401 || status === 403) {
      throw new ApiError('Barcode Lookup API authentication failed. Please check your API key.', 401);
    } else if (status >= 500) {
      throw new ApiError('Barcode Lookup API service is temporarily unavailable.', 503);
    }
    
    throw new ApiError('Failed to fetch rate limits', 500);
  }
}
