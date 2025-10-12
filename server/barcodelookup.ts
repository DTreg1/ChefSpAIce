import axios from 'axios';

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
  } catch (error) {
    console.error('Barcode Lookup search error:', error);
    throw new Error('Failed to search Barcode Lookup');
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
  } catch (error) {
    console.error('Barcode Lookup product lookup error:', error);
    return null;
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

    return response.data;
  } catch (error) {
    console.error('Barcode Lookup rate limits error:', error);
    throw new Error('Failed to fetch rate limits');
  }
}
