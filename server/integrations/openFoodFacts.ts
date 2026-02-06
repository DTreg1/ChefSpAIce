import { logger } from "../lib/logger";

const OFF_SEARCH_URL = "https://world.openfoodfacts.org/cgi/search.pl";
const OFF_PRODUCT_URL = "https://world.openfoodfacts.org/api/v0/product";
const USER_AGENT = "ChefSpAIce/1.0 (contact@chefspaice.app)";

export interface OFFProduct {
  code: string;
  product_name?: string;
  product_name_en?: string;
  generic_name?: string;
  brands?: string;
  categories?: string;
  image_url?: string;
  image_front_url?: string;
  image_small_url?: string;
  serving_size?: string;
  nutriments?: OFFNutriments;
  nutriscore_grade?: string;
  nova_group?: number;
}

export interface OFFNutriments {
  energy_kcal_100g?: number;
  "energy-kcal_100g"?: number;
  proteins_100g?: number;
  carbohydrates_100g?: number;
  fat_100g?: number;
  fiber_100g?: number;
  sugars_100g?: number;
  sodium_100g?: number;
  salt_100g?: number;
}

export interface OFFSearchResponse {
  count: number;
  page: number;
  page_count: number;
  page_size: number;
  products: OFFProduct[];
}

export interface OFFProductResponse {
  status: number;
  status_verbose: string;
  code: string;
  product?: OFFProduct;
}

export interface MappedFoodItem {
  name: string;
  category: string;
  brand?: string;
  imageUrl?: string;
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number;
    sugar?: number;
    sodium?: number;
    servingSize?: string;
  };
  source: "openfoodfacts";
  sourceId: string;
  nutriscoreGrade?: string;
  novaGroup?: number;
}

let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 100;

async function respectRateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise((resolve) =>
      setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest),
    );
  }
  lastRequestTime = Date.now();
}

export async function searchOpenFoodFacts(
  searchTerms: string,
  pageSize: number = 24,
): Promise<OFFProduct[]> {
  try {
    await respectRateLimit();

    const params = new URLSearchParams({
      search_terms: searchTerms,
      json: "true",
      page_size: pageSize.toString(),
      search_simple: "1",
      action: "process",
    });

    const response = await fetch(`${OFF_SEARCH_URL}?${params}`, {
      method: "GET",
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      logger.error("OpenFoodFacts search error", { status: response.status, statusText: response.statusText });
      return [];
    }

    const data: OFFSearchResponse = await response.json();
    return data.products || [];
  } catch (error) {
    logger.error("Error searching OpenFoodFacts", { error: error instanceof Error ? error.message : String(error) });
    return [];
  }
}

export async function lookupBarcode(
  barcode: string,
): Promise<OFFProduct | null> {
  try {
    await respectRateLimit();

    const cleanBarcode = barcode.replace(/\D/g, "");

    const response = await fetch(`${OFF_PRODUCT_URL}/${cleanBarcode}.json`, {
      method: "GET",
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      logger.error("OpenFoodFacts lookup error", { status: response.status, statusText: response.statusText });
      return null;
    }

    const data: OFFProductResponse = await response.json();

    if (data.status !== 1 || !data.product) {
      return null;
    }

    return data.product;
  } catch (error) {
    logger.error("Error looking up barcode", { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

function getProductName(product: OFFProduct): string {
  return (
    product.product_name ||
    product.product_name_en ||
    product.generic_name ||
    "Unknown Product"
  );
}

function parseCategories(categoriesString?: string): string {
  if (!categoriesString) return "Other";

  const categories = categoriesString.split(",").map((c) => c.trim());
  const firstCategory = categories[0] || "Other";

  const cleanCategory = firstCategory.replace(/^en:/, "").replace(/-/g, " ");
  return cleanCategory.charAt(0).toUpperCase() + cleanCategory.slice(1);
}

function getCalories(nutriments?: OFFNutriments): number {
  if (!nutriments) return 0;
  return Math.round(
    nutriments.energy_kcal_100g || nutriments["energy-kcal_100g"] || 0,
  );
}

function getSodiumMg(nutriments?: OFFNutriments): number | undefined {
  if (!nutriments) return undefined;

  if (nutriments.sodium_100g !== undefined) {
    return Math.round(nutriments.sodium_100g * 1000);
  }

  if (nutriments.salt_100g !== undefined) {
    return Math.round(nutriments.salt_100g * 400);
  }

  return undefined;
}

export function mapOFFToFoodItem(product: OFFProduct): MappedFoodItem {
  const nutriments = product.nutriments;

  return {
    name: getProductName(product),
    category: parseCategories(product.categories),
    brand: product.brands?.split(",")[0]?.trim(),
    imageUrl:
      product.image_url || product.image_front_url || product.image_small_url,
    nutrition: {
      calories: getCalories(nutriments),
      protein: Math.round((nutriments?.proteins_100g || 0) * 10) / 10,
      carbs: Math.round((nutriments?.carbohydrates_100g || 0) * 10) / 10,
      fat: Math.round((nutriments?.fat_100g || 0) * 10) / 10,
      fiber:
        nutriments?.fiber_100g !== undefined
          ? Math.round(nutriments.fiber_100g * 10) / 10
          : undefined,
      sugar:
        nutriments?.sugars_100g !== undefined
          ? Math.round(nutriments.sugars_100g * 10) / 10
          : undefined,
      sodium: getSodiumMg(nutriments),
      servingSize: product.serving_size,
    },
    source: "openfoodfacts",
    sourceId: product.code,
    nutriscoreGrade: product.nutriscore_grade,
    novaGroup: product.nova_group,
  };
}

export function hasCompleteNutritionData(product: OFFProduct): boolean {
  const n = product.nutriments;
  if (!n) return false;

  const hasCalories =
    n.energy_kcal_100g !== undefined || n["energy-kcal_100g"] !== undefined;
  const hasProtein = n.proteins_100g !== undefined;
  const hasCarbs = n.carbohydrates_100g !== undefined;
  const hasFat = n.fat_100g !== undefined;

  return hasCalories && hasProtein && hasCarbs && hasFat;
}
