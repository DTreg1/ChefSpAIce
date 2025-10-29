import axios from 'axios';

const OPEN_FOOD_FACTS_API_BASE = 'https://world.openfoodfacts.org/api/v2';

export interface OpenFoodFactsProduct {
  code: string;
  product?: {
    product_name?: string;
    product_name_en?: string;
    generic_name?: string;
    brands?: string;
    brand_owner?: string;
    categories?: string;
    quantity?: string;
    serving_size?: string;
    ingredients_text?: string;
    ingredients_text_en?: string;
    image_url?: string;
    image_front_url?: string;
    image_front_small_url?: string;
    image_small_url?: string;
    nutriments?: {
      'energy-kj'?: number;
      'energy-kcal'?: number;
      'energy_100g'?: number;
      fat?: number;
      fat_100g?: number;
      'saturated-fat'?: number;
      'saturated-fat_100g'?: number;
      carbohydrates?: number;
      carbohydrates_100g?: number;
      sugars?: number;
      sugars_100g?: number;
      fiber?: number;
      fiber_100g?: number;
      proteins?: number;
      proteins_100g?: number;
      salt?: number;
      salt_100g?: number;
      sodium?: number;
      sodium_100g?: number;
    };
    nutrition_grades?: string;
    stores?: string;
    countries?: string;
    packaging?: string;
  };
  status: number;
  status_verbose: string;
}

export async function getOpenFoodFactsProduct(barcode: string): Promise<OpenFoodFactsProduct | null> {
  try {
    const response = await axios.get(`${OPEN_FOOD_FACTS_API_BASE}/product/${barcode}.json`, {
      headers: {
        'User-Agent': 'ChefSpAIce/1.0 (https://chefspice.app)',
        'Accept': 'application/json'
      },
      timeout: 5000
    });

    if (response.data.status === 1 && response.data.product) {
      return response.data;
    }
    
    return null;
  } catch (error: Error | unknown) {
    console.error('Open Food Facts API error:', error.message);
    return null;
  }
}

export async function getOpenFoodFactsBatch(barcodes: string[]): Promise<OpenFoodFactsProduct[]> {
  if (barcodes.length === 0) {
    return [];
  }

  // Open Food Facts doesn't support batch queries, so we need to make parallel requests
  // But we'll limit to 5 concurrent requests to be respectful
  const batchSize = 5;
  const results: OpenFoodFactsProduct[] = [];
  
  for (let i = 0; i < barcodes.length; i += batchSize) {
    const batch = barcodes.slice(i, i + batchSize);
    const promises = batch.map(barcode => getOpenFoodFactsProduct(barcode));
    const batchResults = await Promise.all(promises);
    
    // Filter out null results
    const validResults = batchResults.filter((result): result is OpenFoodFactsProduct => result !== null);
    results.push(...validResults);
  }
  
  return results;
}

export function extractProductInfo(offProduct: OpenFoodFactsProduct) {
  const product = offProduct.product;
  if (!product) return null;
  
  // Try to get the best available name
  const name = product.product_name_en || 
                product.product_name || 
                product.generic_name || 
                'Unknown Product';
  
  // Get the best available image
  const imageUrl = product.image_front_url || 
                   product.image_url || 
                   product.image_front_small_url || 
                   product.image_small_url;
  
  // Extract nutrition info if available
  let nutrition = null;
  if (product.nutriments) {
    const n = product.nutriments;
    nutrition = {
      calories: n['energy-kcal'] || n['energy_100g'] || 0,
      protein: n.proteins_100g || n.proteins || 0,
      carbs: n.carbohydrates_100g || n.carbohydrates || 0,
      fat: n.fat_100g || n.fat || 0,
      fiber: n.fiber_100g || n.fiber || undefined,
      sugar: n.sugars_100g || n.sugars || undefined,
      sodium: n.sodium_100g || n.sodium || undefined,
      servingSize: "100",
      servingUnit: "g"
    };
  }
  
  return {
    code: offProduct.code,
    name,
    brand: product.brands || product.brand_owner || '',
    imageUrl,
    description: product.ingredients_text_en || product.ingredients_text || '',
    categories: product.categories,
    quantity: product.quantity,
    nutrition,
    nutritionGrade: product.nutrition_grades,
    source: 'openfoodfacts' as const
  };
}