import { Router, Request, Response } from "express";
import {
  searchUSDA,
  mapUSDAToFoodItem,
  lookupUSDABarcode,
} from "../../integrations/usda";
import {
  searchOpenFoodFacts,
  lookupBarcode,
  mapOFFToFoodItem,
  hasCompleteNutritionData,
} from "../../integrations/openFoodFacts";

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

type FoodSource = "usda" | "openfoodfacts" | "local";

interface SearchResult {
  id: string;
  name: string;
  normalizedName: string;
  category: string;
  usdaCategory?: string;
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
    local: 3,
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

router.get("/search", async (req: Request, res: Response) => {
  try {
    const query = req.query.query as string;
    const sourcesParam = req.query.sources as string | string[] | undefined;
    const limitParam = req.query.limit as string | undefined;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({ error: "Query parameter is required" });
    }

    const parsedQuery = parseAdvancedQuery(query);
    const searchTerm = parsedQuery.product;

    let sources: FoodSource[] = ["usda", "openfoodfacts", "local"];
    if (sourcesParam) {
      const parsed = Array.isArray(sourcesParam)
        ? sourcesParam
        : sourcesParam.split(",");
      sources = parsed.filter((s): s is FoodSource =>
        ["usda", "openfoodfacts", "local"].includes(s),
      );
    }

    const limit = Math.min(
      Math.max(parseInt(limitParam || "20", 10) || 20, 1),
      100,
    );

    const cacheKey = `${query.toLowerCase().trim()}:${sources.sort().join(",")}:${limit}`;
    const cached = getCachedSearch(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const fetchLimit = (parsedQuery.brand || parsedQuery.store) ? limit * 3 : Math.ceil(limit / 2);

    const searchPromises: Promise<SearchResult[]>[] = [];
    const usedSources: FoodSource[] = [];

    if (sources.includes("usda")) {
      usedSources.push("usda");
      searchPromises.push(
        searchUSDA(searchTerm, fetchLimit)
          .then((results) =>
            results.map((item) => {
              const mapped = mapUSDAToFoodItem(item);
              const result: SearchResult = {
                id: `usda-${item.fdcId}`,
                name: mapped.name,
                normalizedName: normalizeName(mapped.name),
                category: mapped.category,
                usdaCategory:
                  mapped.category !== "Other" ? mapped.category : undefined,
                brand: mapped.brandOwner,
                nutrition: mapped.nutrition,
                source: "usda",
                sourceId: String(item.fdcId),
                relevanceScore: calculateRelevanceScore(
                  mapped.name,
                  searchTerm,
                  "usda",
                ),
                dataCompleteness: calculateDataCompleteness(mapped.nutrition),
              };
              return result;
            }),
          )
          .catch((err) => {
            console.error("USDA search error:", err);
            return [];
          }),
      );
    }

    if (sources.includes("openfoodfacts")) {
      usedSources.push("openfoodfacts");
      searchPromises.push(
        searchOpenFoodFacts(searchTerm, fetchLimit)
          .then((results) =>
            results
              .filter((p) => p.product_name || p.product_name_en)
              .map((item) => {
                const mapped = mapOFFToFoodItem(item);
                const result: SearchResult = {
                  id: `off-${item.code}`,
                  name: mapped.name,
                  normalizedName: normalizeName(mapped.name),
                  category: mapped.category,
                  brand: mapped.brand,
                  imageUrl: mapped.imageUrl,
                  nutrition: mapped.nutrition,
                  source: "openfoodfacts",
                  sourceId: item.code,
                  relevanceScore: calculateRelevanceScore(
                    mapped.name,
                    searchTerm,
                    "openfoodfacts",
                  ),
                  dataCompleteness: calculateDataCompleteness(mapped.nutrition),
                };
                return result;
              }),
          )
          .catch((err) => {
            console.error("OpenFoodFacts search error:", err);
            return [];
          }),
      );
    }

    if (sources.includes("local")) {
      usedSources.push("local");
      searchPromises.push(Promise.resolve([]));
    }

    const allResults = await Promise.all(searchPromises);
    let flatResults = allResults.flat();

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
      sources: usedSources,
      totalCount: flatResults.length,
    };

    setCachedSearch(cacheKey, response);
    res.json(response);
  } catch (error) {
    console.error("Food search error:", error);
    res.status(500).json({ error: "Failed to search food database" });
  }
});

router.get("/barcode/:code", async (req: Request, res: Response) => {
  try {
    const { code } = req.params;

    if (!code || code.trim().length === 0) {
      return res.status(400).json({ error: "Barcode is required" });
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
        nutrition: mapped.nutrition,
        source: "usda",
        sourceId: String(usdaProduct.fdcId),
        relevanceScore: 100,
        dataCompleteness: calculateDataCompleteness(mapped.nutrition),
      };

      const response: BarcodeResponse = {
        found: true,
        source: "usda",
        item: result,
      };

      return res.json(response);
    }

    const offProduct = await lookupBarcode(cleanCode);

    if (offProduct) {
      const mapped = mapOFFToFoodItem(offProduct);
      const result: SearchResult = {
        id: `off-${offProduct.code}`,
        name: mapped.name,
        normalizedName: normalizeName(mapped.name),
        category: mapped.category,
        brand: mapped.brand,
        imageUrl: mapped.imageUrl,
        nutrition: mapped.nutrition,
        source: "openfoodfacts",
        sourceId: offProduct.code,
        relevanceScore: 100,
        dataCompleteness: calculateDataCompleteness(mapped.nutrition),
      };

      const response: BarcodeResponse = {
        found: true,
        source: "openfoodfacts",
        item: result,
      };

      return res.json(response);
    }

    const response: BarcodeResponse = {
      found: false,
    };

    res.json(response);
  } catch (error) {
    console.error("Barcode lookup error:", error);
    res.status(500).json({ error: "Failed to lookup barcode" });
  }
});

export default router;
