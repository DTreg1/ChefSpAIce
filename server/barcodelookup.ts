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
    
    throw new ApiError('Failed to search Barcode Lookup', 500);
  }
}

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
    
    // Return null only for 404 (not found), throw ApiError for other failures
    if (status === 404) {
      return null;
    }
    
    // Throw structured errors for non-404 failures so routes can return detailed messages
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
    
    throw new ApiError('Failed to fetch barcode product', 500);
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
