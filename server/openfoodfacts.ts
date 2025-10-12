import axios from 'axios';

const OFF_API_BASE = 'https://world.openfoodfacts.org/api/v2';

interface OFFProduct {
  code: string;
  product_name?: string;
  brands?: string;
  image_url?: string;
  image_front_url?: string;
  image_front_small_url?: string;
  image_thumb_url?: string;
  nutriscore_grade?: string;
  nutriments?: Record<string, any>;
}

interface OFFSearchResult {
  products: OFFProduct[];
  count: number;
  page: number;
  page_size: number;
}

export async function searchOpenFoodFacts(query: string, pageSize: number = 10): Promise<OFFSearchResult> {
  try {
    const response = await axios.get(`${OFF_API_BASE}/search`, {
      params: {
        search_terms: query,
        page_size: pageSize,
        fields: 'code,product_name,brands,image_url,image_front_url,image_front_small_url,image_thumb_url,nutriscore_grade'
      },
      headers: {
        'User-Agent': 'AI-Chef-App/1.0 (https://replit.com)'
      }
    });

    return response.data;
  } catch (error) {
    console.error('Open Food Facts search error:', error);
    throw new Error('Failed to search Open Food Facts');
  }
}

export async function getOpenFoodFactsProduct(barcode: string): Promise<OFFProduct | null> {
  try {
    const response = await axios.get(`${OFF_API_BASE}/product/${barcode}`, {
      params: {
        fields: 'code,product_name,brands,image_url,image_front_url,image_front_small_url,image_thumb_url,nutriscore_grade,nutriments'
      },
      headers: {
        'User-Agent': 'AI-Chef-App/1.0 (https://replit.com)'
      }
    });

    if (response.data.status === 1 && response.data.product) {
      return response.data.product;
    }
    return null;
  } catch (error) {
    console.error('Open Food Facts product lookup error:', error);
    return null;
  }
}

export function extractImageUrl(product: OFFProduct): string | undefined {
  // Priority: front image (small) > front image > generic image > thumb
  return product.image_front_small_url || 
         product.image_front_url || 
         product.image_url || 
         product.image_thumb_url;
}
