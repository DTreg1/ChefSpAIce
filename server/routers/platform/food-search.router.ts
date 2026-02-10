import { Router, Request, Response, NextFunction } from "express";
import {
  searchUSDA,
  mapUSDAToFoodItem,
  lookupUSDABarcode,
} from "../../integrations/usda";
import {
  lookupBarcode,
  mapOFFToFoodItem,
} from "../../integrations/openFoodFacts";
import { logger } from "../../lib/logger";
import { AppError } from "../../middleware/errorHandler";
import { successResponse } from "../../lib/apiResponse";

const router = Router();

const SEARCH_CACHE_TTL = 5 * 60 * 1000;
const searchCache = new Map<string, { data: SearchResponse; timestamp: number }>();

function getCachedSearch(key: string): SearchResponse | null {
  const cached = searchCache.get(key);
  if (cached && Date.now() - cached.timestamp < SEARCH_CACHE_TTL) {
    return cached.data;
  }
  if (cached) {
    searchCache.delete(key);
  }
  return null;
}

function setCachedSearch(key: string, data: SearchResponse): void {
  if (searchCache.size > 100) {
    const oldestKey = searchCache.keys().next().value;
    if (oldestKey) searchCache.delete(oldestKey);
  }
  searchCache.set(key, { data, timestamp: Date.now() });
}

type FoodSource = "usda" | "openfoodfacts";

interface SearchResult {
  id: string;
  name: string;
  normalizedName: string;
  category: string;
  usdaCategory?: string;
  brand?: string;
  brandName?: string;
  gtinUpc?: string;
  householdServingFullText?: string;
  dataType?: string;
  ingredients?: string;
  packageWeight?: string;
  imageUrl?: string;
  nutriscoreGrade?: string;
  novaGroup?: number;
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number;
    sugar?: number;
    sodium?: number;
    saturatedFat?: number;
    transFat?: number;
    cholesterol?: number;
    calcium?: number;
    iron?: number;
    potassium?: number;
    vitaminA?: number;
    vitaminC?: number;
    vitaminD?: number;
    servingSize?: string;
  };
  source: FoodSource;
  sourceId: string;
  relevanceScore: number;
  dataCompleteness: number;
}

interface SearchResponse {
  results: SearchResult[];
  sources: FoodSource[];
  totalCount: number;
}

interface BarcodeResponse {
  found: boolean;
  source?: FoodSource;
  item?: SearchResult;
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function calculateRelevanceScore(
  name: string,
  query: string,
  source: FoodSource,
): number {
  const normalizedName = normalizeName(name);
  const normalizedQuery = normalizeName(query);

  let score = 0;

  if (normalizedName === normalizedQuery) {
    score = 100;
  } else if (normalizedName.startsWith(normalizedQuery)) {
    score = 80;
  } else if (normalizedName.includes(normalizedQuery)) {
    score = 60;
  } else {
    const queryWords = normalizedQuery.split(" ");
    const nameWords = normalizedName.split(" ");
    const matchingWords = queryWords.filter((qw) =>
      nameWords.some((nw) => nw.includes(qw) || qw.includes(nw)),
    );
    score = (matchingWords.length / queryWords.length) * 50;
  }

  const sourcePriority: Record<FoodSource, number> = {
    usda: 10,
    openfoodfacts: 5,
  };

  score += sourcePriority[source];

  return Math.round(score * 10) / 10;
}

function calculateDataCompleteness(
  nutrition: SearchResult["nutrition"],
): number {
  const fields = [
    nutrition.calories > 0,
    nutrition.protein > 0,
    nutrition.carbs > 0,
    nutrition.fat > 0,
    nutrition.fiber !== undefined && nutrition.fiber > 0,
    nutrition.sugar !== undefined && nutrition.sugar > 0,
    nutrition.sodium !== undefined && nutrition.sodium > 0,
    nutrition.saturatedFat !== undefined && nutrition.saturatedFat > 0,
    nutrition.cholesterol !== undefined && nutrition.cholesterol > 0,
    nutrition.calcium !== undefined && nutrition.calcium > 0,
    nutrition.iron !== undefined && nutrition.iron > 0,
    nutrition.potassium !== undefined && nutrition.potassium > 0,
    nutrition.vitaminA !== undefined && nutrition.vitaminA > 0,
    nutrition.vitaminC !== undefined && nutrition.vitaminC > 0,
  ];

  return Math.round((fields.filter(Boolean).length / fields.length) * 100);
}

function deduplicateResults(results: SearchResult[]): SearchResult[] {
  const seen = new Map<string, SearchResult>();

  for (const result of results) {
    const existing = seen.get(result.normalizedName);

    if (!existing) {
      seen.set(result.normalizedName, result);
    } else {
      if (result.dataCompleteness > existing.dataCompleteness) {
        seen.set(result.normalizedName, result);
      } else if (
        result.dataCompleteness === existing.dataCompleteness &&
        result.relevanceScore > existing.relevanceScore
      ) {
        seen.set(result.normalizedName, result);
      }
    }
  }

  return Array.from(seen.values());
}

interface ParsedSearchQuery {
  store?: string;
  brand?: string;
  product: string;
}

function parseAdvancedQuery(rawQuery: string): ParsedSearchQuery {
  const trimmed = rawQuery.trim();
  const parts = trimmed.split(":");
  
  if (parts.length === 3) {
    return {
      store: parts[0].trim().toLowerCase() || undefined,
      brand: parts[1].trim().toLowerCase() || undefined,
      product: parts[2].trim(),
    };
  } else if (parts.length === 2) {
    return {
      brand: parts[0].trim().toLowerCase() || undefined,
      product: parts[1].trim(),
    };
  }
  
  return { product: trimmed };
}

function matchesBrandFilter(itemBrand: string | undefined, filterBrand: string | undefined, filterStore: string | undefined): boolean {
  if (!filterBrand && !filterStore) return true;
  if (!itemBrand) return false;
  
  const normalizedItemBrand = itemBrand.toLowerCase();
  
  if (filterStore && !normalizedItemBrand.includes(filterStore)) {
    return false;
  }
  if (filterBrand && !normalizedItemBrand.includes(filterBrand)) {
    return false;
  }
  return true;
}

router.get("/search", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = req.query.query as string;
    const limitParam = req.query.limit as string | undefined;

    if (!query || query.trim().length === 0) {
      throw AppError.badRequest("Query parameter is required", "QUERY_REQUIRED");
    }

    const parsedQuery = parseAdvancedQuery(query);
    const searchTerm = parsedQuery.product;

    const limit = Math.min(
      Math.max(parseInt(limitParam || "20", 10) || 20, 1),
      100,
    );

    const cacheKey = `${query.toLowerCase().trim()}:usda:${limit}`;
    const cached = getCachedSearch(cacheKey);
    if (cached) {
      return res.json(successResponse(cached));
    }

    const fetchLimit = (parsedQuery.brand || parsedQuery.store) ? limit * 3 : Math.ceil(limit / 2);

    let usdaResults: SearchResult[] = [];
    try {
      const rawResults = await searchUSDA(searchTerm, fetchLimit);
      usdaResults = rawResults.map((item) => {
        const mapped = mapUSDAToFoodItem(item);
        const result: SearchResult = {
          id: `usda-${item.fdcId}`,
          name: mapped.name,
          normalizedName: normalizeName(mapped.name),
          category: mapped.category,
          usdaCategory:
            mapped.category !== "Other" ? mapped.category : undefined,
          brand: mapped.brandOwner,
          brandName: mapped.brandName,
          gtinUpc: mapped.gtinUpc,
          householdServingFullText: mapped.householdServingFullText,
          dataType: mapped.dataType,
          ingredients: mapped.ingredients,
          packageWeight: mapped.packageWeight,
          nutrition: {
            ...mapped.nutrition,
          },
          source: "usda",
          sourceId: String(item.fdcId),
          relevanceScore: calculateRelevanceScore(
            mapped.name,
            searchTerm,
            "usda",
          ),
          dataCompleteness: 0,
        };
        result.dataCompleteness = calculateDataCompleteness(result.nutrition);
        return result;
      });
    } catch (err) {
      logger.error("USDA search error", { error: err instanceof Error ? err.message : String(err) });
    }

    try {
      const barcodesToEnrich: { barcode: string; index: number }[] = [];
      const seenBarcodes = new Set<string>();
      for (let i = 0; i < usdaResults.length && barcodesToEnrich.length < 5; i++) {
        const upc = usdaResults[i].gtinUpc;
        if (upc && !seenBarcodes.has(upc)) {
          seenBarcodes.add(upc);
          barcodesToEnrich.push({ barcode: upc, index: i });
        }
      }

      if (barcodesToEnrich.length > 0) {
        const enrichmentResults = await Promise.all(
          barcodesToEnrich.map(async ({ barcode, index }) => {
            try {
              const offProduct = await lookupBarcode(barcode);
              return { index, offProduct };
            } catch {
              return { index, offProduct: null };
            }
          })
        );

        for (const { index, offProduct } of enrichmentResults) {
          if (offProduct) {
            const offMapped = mapOFFToFoodItem(offProduct);
            usdaResults[index].imageUrl = offMapped.imageUrl;
            usdaResults[index].nutriscoreGrade = offMapped.nutriscoreGrade;
            usdaResults[index].novaGroup = offMapped.novaGroup;
          }
        }
      }
    } catch (err) {
      logger.error("OFF enrichment error (non-blocking)", { error: err instanceof Error ? err.message : String(err) });
    }

    let flatResults = [...usdaResults];

    if (parsedQuery.brand || parsedQuery.store) {
      flatResults = flatResults.filter((item) =>
        matchesBrandFilter(item.brand, parsedQuery.brand, parsedQuery.store)
      );
    }

    const deduplicated = deduplicateResults(flatResults);

    deduplicated.sort((a, b) => {
      if (parsedQuery.brand || parsedQuery.store) {
        const aHasBrand = a.brand ? 1 : 0;
        const bHasBrand = b.brand ? 1 : 0;
        if (bHasBrand !== aHasBrand) {
          return bHasBrand - aHasBrand;
        }
      }
      if (b.relevanceScore !== a.relevanceScore) {
        return b.relevanceScore - a.relevanceScore;
      }
      return b.dataCompleteness - a.dataCompleteness;
    });

    const limited = deduplicated.slice(0, limit);

    const response: SearchResponse = {
      results: limited,
      sources: ["usda"],
      totalCount: flatResults.length,
    };

    setCachedSearch(cacheKey, response);
    res.json(successResponse(response));
  } catch (error) {
    next(error);
  }
});

router.get("/barcode/:code", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code } = req.params;

    if (!code || code.trim().length === 0) {
      throw AppError.badRequest("Barcode is required", "BARCODE_REQUIRED");
    }

    const cleanCode = code.replace(/\D/g, "");

    const usdaProduct = await lookupUSDABarcode(cleanCode);

    if (usdaProduct) {
      const mapped = mapUSDAToFoodItem(usdaProduct);
      const result: SearchResult = {
        id: `usda-${usdaProduct.fdcId}`,
        name: mapped.name,
        normalizedName: normalizeName(mapped.name),
        category: mapped.category,
        usdaCategory: mapped.category !== "Other" ? mapped.category : undefined,
        brand: mapped.brandOwner,
        brandName: mapped.brandName,
        gtinUpc: mapped.gtinUpc,
        householdServingFullText: mapped.householdServingFullText,
        dataType: mapped.dataType,
        ingredients: mapped.ingredients,
        packageWeight: mapped.packageWeight,
        nutrition: { ...mapped.nutrition },
        source: "usda",
        sourceId: String(usdaProduct.fdcId),
        relevanceScore: 100,
        dataCompleteness: calculateDataCompleteness(mapped.nutrition),
      };

      try {
        const offProduct = await lookupBarcode(cleanCode);
        if (offProduct) {
          const offMapped = mapOFFToFoodItem(offProduct);
          result.imageUrl = offMapped.imageUrl;
          result.nutriscoreGrade = offMapped.nutriscoreGrade;
          result.novaGroup = offMapped.novaGroup;
        }
      } catch (err) {
        logger.error("OFF barcode enrichment error (non-blocking)", { error: err instanceof Error ? err.message : String(err) });
      }

      const response: BarcodeResponse = {
        found: true,
        source: "usda",
        item: result,
      };

      return res.json(successResponse(response));
    }

    const response: BarcodeResponse = {
      found: false,
    };

    res.json(successResponse(response));
  } catch (error) {
    next(error);
  }
});

export default router;
