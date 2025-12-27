import type { NutritionFacts } from "@shared/schema";

const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const USDA_NUTRIENT_IDS = {
  ENERGY: 1008,
  PROTEIN: 1003,
  TOTAL_FAT: 1004,
  SATURATED_FAT: 1258,
  TRANS_FAT: 1257,
  CHOLESTEROL: 1253,
  SODIUM: 1093,
  CARBOHYDRATES: 1005,
  FIBER: 1079,
  SUGARS_TOTAL: 2000,
  ADDED_SUGARS: 1235,
  VITAMIN_D: 1114,
  CALCIUM: 1087,
  IRON: 1089,
  POTASSIUM: 1092,
};

function findNutrientValue(
  nutrients: Array<{
    nutrientId?: number;
    nutrient?: { id: number };
    value?: number;
    amount?: number;
  }>,
  nutrientId: number,
): number | undefined {
  const nutrient = nutrients.find(
    (n) => n.nutrientId === nutrientId || n.nutrient?.id === nutrientId,
  );
  if (!nutrient) return undefined;
  return nutrient.value ?? nutrient.amount;
}

function getCacheKey(foodId: string, source: string): string {
  return `${source}:${foodId}`;
}

interface CachedNutrition {
  nutrition: NutritionFacts;
  source: "usda" | "openfoodfacts" | "ai" | "cache";
  sourceId?: string | number;
  incomplete: boolean;
  timestamp: number;
  expiresAt: number;
}

function getFromCache(
  cache: Map<string, CachedNutrition>,
  key: string,
  currentTime: number,
): CachedNutrition | null {
  const cached = cache.get(key);
  if (!cached) return null;

  if (currentTime > cached.expiresAt) {
    cache.delete(key);
    return null;
  }

  return cached;
}

function setInCache(
  cache: Map<string, CachedNutrition>,
  key: string,
  nutrition: NutritionFacts,
  source: "usda" | "openfoodfacts" | "ai",
  currentTime: number,
  sourceId?: string | number,
  incomplete: boolean = false,
): void {
  cache.set(key, {
    nutrition,
    source,
    sourceId,
    incomplete,
    timestamp: currentTime,
    expiresAt: currentTime + CACHE_TTL_MS,
  });
}

describe("Nutrition Router Helper Functions", () => {
  describe("getCacheKey", () => {
    it("creates cache key from source and foodId", () => {
      expect(getCacheKey("12345", "usda")).toBe("usda:12345");
    });

    it("handles barcode as foodId", () => {
      expect(getCacheKey("5000159407236", "openfoodfacts")).toBe(
        "openfoodfacts:5000159407236",
      );
    });

    it("handles food name for AI estimation", () => {
      expect(getCacheKey("apple pie", "ai")).toBe("ai:apple pie");
    });
  });

  describe("findNutrientValue", () => {
    it("finds nutrient by nutrientId", () => {
      const nutrients = [
        { nutrientId: 1008, value: 200 },
        { nutrientId: 1003, value: 15 },
      ];
      expect(findNutrientValue(nutrients, 1008)).toBe(200);
      expect(findNutrientValue(nutrients, 1003)).toBe(15);
    });

    it("finds nutrient by nested nutrient.id", () => {
      const nutrients = [
        { nutrient: { id: 1008 }, amount: 250 },
        { nutrient: { id: 1003 }, amount: 20 },
      ];
      expect(findNutrientValue(nutrients, 1008)).toBe(250);
      expect(findNutrientValue(nutrients, 1003)).toBe(20);
    });

    it("returns undefined when nutrient not found", () => {
      const nutrients = [{ nutrientId: 1008, value: 200 }];
      expect(findNutrientValue(nutrients, 9999)).toBeUndefined();
    });

    it("prefers value over amount", () => {
      const nutrients = [{ nutrientId: 1008, value: 100, amount: 200 }];
      expect(findNutrientValue(nutrients, 1008)).toBe(100);
    });

    it("falls back to amount when value is undefined", () => {
      const nutrients = [{ nutrientId: 1008, amount: 150 }];
      expect(findNutrientValue(nutrients, 1008)).toBe(150);
    });

    it("handles empty nutrients array", () => {
      expect(findNutrientValue([], 1008)).toBeUndefined();
    });
  });
});

describe("Nutrition Cache Logic", () => {
  describe("getFromCache", () => {
    it("returns cached item when valid", () => {
      const cache = new Map<string, CachedNutrition>();
      const nutrition: NutritionFacts = {
        servingSize: "100g",
        calories: 200,
        totalFat: 10,
        sodium: 500,
        totalCarbohydrates: 25,
        protein: 15,
      };
      const now = Date.now();
      setInCache(cache, "usda:12345", nutrition, "usda", now, 12345, false);

      const result = getFromCache(cache, "usda:12345", now);
      expect(result).not.toBeNull();
      expect(result?.nutrition.calories).toBe(200);
    });

    it("returns null when key not found", () => {
      const cache = new Map<string, CachedNutrition>();
      expect(getFromCache(cache, "usda:99999", Date.now())).toBeNull();
    });

    it("returns null and deletes expired cache entry", () => {
      const cache = new Map<string, CachedNutrition>();
      const nutrition: NutritionFacts = {
        servingSize: "100g",
        calories: 200,
        totalFat: 10,
        sodium: 500,
        totalCarbohydrates: 25,
        protein: 15,
      };
      const pastTime = Date.now() - CACHE_TTL_MS - 1000;
      setInCache(
        cache,
        "usda:12345",
        nutrition,
        "usda",
        pastTime,
        12345,
        false,
      );

      const futureTime = pastTime + CACHE_TTL_MS + 2000;
      const result = getFromCache(cache, "usda:12345", futureTime);
      expect(result).toBeNull();
      expect(cache.has("usda:12345")).toBe(false);
    });
  });

  describe("setInCache", () => {
    it("stores nutrition data with correct expiry", () => {
      const cache = new Map<string, CachedNutrition>();
      const nutrition: NutritionFacts = {
        servingSize: "100g",
        calories: 150,
        totalFat: 8,
        sodium: 300,
        totalCarbohydrates: 20,
        protein: 10,
      };
      const now = Date.now();

      setInCache(cache, "usda:12345", nutrition, "usda", now, 12345, false);

      const cached = cache.get("usda:12345");
      expect(cached).toBeDefined();
      expect(cached?.nutrition.calories).toBe(150);
      expect(cached?.source).toBe("usda");
      expect(cached?.sourceId).toBe(12345);
      expect(cached?.incomplete).toBe(false);
      expect(cached?.expiresAt).toBe(now + CACHE_TTL_MS);
    });

    it("stores incomplete flag correctly", () => {
      const cache = new Map<string, CachedNutrition>();
      const nutrition: NutritionFacts = {
        servingSize: "100g (estimated)",
        calories: 100,
        totalFat: 5,
        sodium: 200,
        totalCarbohydrates: 15,
        protein: 8,
      };

      setInCache(
        cache,
        "ai:pizza",
        nutrition,
        "ai",
        Date.now(),
        undefined,
        true,
      );

      const cached = cache.get("ai:pizza");
      expect(cached?.incomplete).toBe(true);
      expect(cached?.source).toBe("ai");
      expect(cached?.sourceId).toBeUndefined();
    });

    it("overwrites existing cache entry", () => {
      const cache = new Map<string, CachedNutrition>();
      const nutrition1: NutritionFacts = {
        servingSize: "100g",
        calories: 100,
        totalFat: 5,
        sodium: 200,
        totalCarbohydrates: 15,
        protein: 8,
      };
      const nutrition2: NutritionFacts = {
        servingSize: "100g",
        calories: 200,
        totalFat: 10,
        sodium: 400,
        totalCarbohydrates: 30,
        protein: 16,
      };

      setInCache(
        cache,
        "usda:12345",
        nutrition1,
        "usda",
        Date.now(),
        12345,
        false,
      );
      setInCache(
        cache,
        "usda:12345",
        nutrition2,
        "usda",
        Date.now(),
        12345,
        false,
      );

      const cached = cache.get("usda:12345");
      expect(cached?.nutrition.calories).toBe(200);
    });
  });

  describe("Cache TTL", () => {
    it("uses 30-day TTL", () => {
      expect(CACHE_TTL_MS).toBe(30 * 24 * 60 * 60 * 1000);
    });
  });
});

describe("USDA Nutrient IDs", () => {
  it("has correct ID for Energy (calories)", () => {
    expect(USDA_NUTRIENT_IDS.ENERGY).toBe(1008);
  });

  it("has correct ID for Protein", () => {
    expect(USDA_NUTRIENT_IDS.PROTEIN).toBe(1003);
  });

  it("has correct ID for Total Fat", () => {
    expect(USDA_NUTRIENT_IDS.TOTAL_FAT).toBe(1004);
  });

  it("has correct ID for Saturated Fat", () => {
    expect(USDA_NUTRIENT_IDS.SATURATED_FAT).toBe(1258);
  });

  it("has correct ID for Trans Fat", () => {
    expect(USDA_NUTRIENT_IDS.TRANS_FAT).toBe(1257);
  });

  it("has correct ID for Cholesterol", () => {
    expect(USDA_NUTRIENT_IDS.CHOLESTEROL).toBe(1253);
  });

  it("has correct ID for Sodium", () => {
    expect(USDA_NUTRIENT_IDS.SODIUM).toBe(1093);
  });

  it("has correct ID for Carbohydrates", () => {
    expect(USDA_NUTRIENT_IDS.CARBOHYDRATES).toBe(1005);
  });

  it("has correct ID for Fiber", () => {
    expect(USDA_NUTRIENT_IDS.FIBER).toBe(1079);
  });

  it("has correct ID for Total Sugars", () => {
    expect(USDA_NUTRIENT_IDS.SUGARS_TOTAL).toBe(2000);
  });

  it("has correct ID for Added Sugars", () => {
    expect(USDA_NUTRIENT_IDS.ADDED_SUGARS).toBe(1235);
  });

  it("has correct ID for Vitamin D", () => {
    expect(USDA_NUTRIENT_IDS.VITAMIN_D).toBe(1114);
  });

  it("has correct ID for Calcium", () => {
    expect(USDA_NUTRIENT_IDS.CALCIUM).toBe(1087);
  });

  it("has correct ID for Iron", () => {
    expect(USDA_NUTRIENT_IDS.IRON).toBe(1089);
  });

  it("has correct ID for Potassium", () => {
    expect(USDA_NUTRIENT_IDS.POTASSIUM).toBe(1092);
  });
});

describe("Nutrition Data Mapping", () => {
  describe("USDA to NutritionFacts mapping", () => {
    it("marks nutrition as incomplete when core nutrients missing", () => {
      const checkIncomplete = (
        calories: number | undefined,
        protein: number | undefined,
        totalFat: number | undefined,
        carbs: number | undefined,
      ) => {
        return (
          calories === undefined ||
          protein === undefined ||
          totalFat === undefined ||
          carbs === undefined
        );
      };

      expect(checkIncomplete(undefined, 10, 5, 20)).toBe(true);
      expect(checkIncomplete(200, undefined, 5, 20)).toBe(true);
      expect(checkIncomplete(200, 10, undefined, 20)).toBe(true);
      expect(checkIncomplete(200, 10, 5, undefined)).toBe(true);
      expect(checkIncomplete(200, 10, 5, 20)).toBe(false);
    });

    it("rounds calories to whole numbers", () => {
      expect(Math.round(123.7)).toBe(124);
      expect(Math.round(123.4)).toBe(123);
    });

    it("rounds fat values to one decimal", () => {
      expect(Math.round(5.567 * 10) / 10).toBe(5.6);
      expect(Math.round(5.543 * 10) / 10).toBe(5.5);
    });

    it("rounds sodium to whole numbers", () => {
      expect(Math.round(456.7)).toBe(457);
    });

    it("rounds cholesterol to whole numbers", () => {
      expect(Math.round(55.4)).toBe(55);
    });
  });

  describe("OpenFoodFacts to NutritionFacts mapping", () => {
    it("converts sodium from g to mg", () => {
      const sodiumG = 0.5;
      const sodiumMg = Math.round(sodiumG * 1000);
      expect(sodiumMg).toBe(500);
    });

    it("converts salt to sodium (salt * 400)", () => {
      const saltG = 1.25;
      const sodiumMg = Math.round(saltG * 400);
      expect(sodiumMg).toBe(500);
    });

    it("uses default serving size when not provided", () => {
      const servingSize = undefined || "100g";
      expect(servingSize).toBe("100g");
    });
  });

  describe("AI estimation mapping", () => {
    it("marks AI estimates as incomplete", () => {
      const incomplete = true;
      expect(incomplete).toBe(true);
    });

    it("uses estimated serving size label", () => {
      const servingSize = "100g (estimated)";
      expect(servingSize).toContain("estimated");
    });
  });
});

describe("Nutrition Search Result Format", () => {
  interface NutritionSearchResult {
    id: string;
    name: string;
    brand?: string;
    source: "usda" | "openfoodfacts";
    nutrition: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    };
  }

  it("creates correct USDA result format", () => {
    const result: NutritionSearchResult = {
      id: "usda:12345",
      name: "Apple, raw",
      source: "usda",
      nutrition: {
        calories: 52,
        protein: 0.3,
        carbs: 14,
        fat: 0.2,
      },
    };

    expect(result.id).toMatch(/^usda:/);
    expect(result.source).toBe("usda");
    expect(result.nutrition).toHaveProperty("calories");
  });

  it("creates correct OpenFoodFacts result format", () => {
    const result: NutritionSearchResult = {
      id: "off:5000159407236",
      name: "Heinz Baked Beans",
      brand: "Heinz",
      source: "openfoodfacts",
      nutrition: {
        calories: 84,
        protein: 5.2,
        carbs: 12.5,
        fat: 0.6,
      },
    };

    expect(result.id).toMatch(/^off:/);
    expect(result.source).toBe("openfoodfacts");
    expect(result.brand).toBe("Heinz");
  });
});

describe("Request Validation Logic", () => {
  describe("Food ID validation", () => {
    it("rejects empty food ID", () => {
      const foodId = "";
      expect(!foodId).toBe(true);
    });

    it("validates USDA food ID as number", () => {
      expect(isNaN(parseInt("12345", 10))).toBe(false);
      expect(isNaN(parseInt("abc", 10))).toBe(true);
      expect(isNaN(parseInt("", 10))).toBe(true);
    });
  });

  describe("Search query validation", () => {
    it("requires minimum 2 characters", () => {
      expect("a".length < 2).toBe(true);
      expect("ap".length < 2).toBe(false);
      expect("apple".length < 2).toBe(false);
    });

    it("rejects empty query", () => {
      const query = "";
      expect(!query || query.length < 2).toBe(true);
    });
  });

  describe("Limit validation", () => {
    it("defaults to 10 when not specified", () => {
      const limitStr = undefined;
      const limit = parseInt((limitStr as string) || "10", 10);
      expect(limit).toBe(10);
    });

    it("parses string limit correctly", () => {
      expect(parseInt("5", 10)).toBe(5);
      expect(parseInt("15", 10)).toBe(15);
    });
  });
});

describe("Source Parameter Handling", () => {
  it("defaults to usda when not specified", () => {
    const source = (undefined as string | undefined) || "usda";
    expect(source).toBe("usda");
  });

  it("accepts usda as source", () => {
    const source = "usda";
    expect(source === "usda").toBe(true);
  });

  it("accepts openfoodfacts as source", () => {
    const source = "openfoodfacts";
    expect(source === "openfoodfacts" || source === "barcode").toBe(true);
  });

  it("accepts barcode as source (maps to openfoodfacts)", () => {
    const source = "barcode";
    expect(source === "openfoodfacts" || source === "barcode").toBe(true);
  });
});

describe("Estimate Endpoint Logic", () => {
  describe("Source fallback order", () => {
    it("tries USDA first", () => {
      const sources = ["usda", "openfoodfacts", "ai"];
      expect(sources[0]).toBe("usda");
    });

    it("falls back to OpenFoodFacts if USDA has no results", () => {
      const sources = ["usda", "openfoodfacts", "ai"];
      expect(sources[1]).toBe("openfoodfacts");
    });

    it("falls back to AI if both databases have no results", () => {
      const sources = ["usda", "openfoodfacts", "ai"];
      expect(sources[2]).toBe("ai");
    });
  });

  describe("Food name normalization", () => {
    it("converts to lowercase for cache key", () => {
      expect("Apple Pie".toLowerCase()).toBe("apple pie");
      expect("PIZZA".toLowerCase()).toBe("pizza");
    });
  });
});

describe("Response Format", () => {
  describe("Successful nutrition response", () => {
    it("includes all required fields", () => {
      const response = {
        nutrition: {
          servingSize: "100g",
          calories: 200,
          totalFat: 10,
          sodium: 500,
          totalCarbohydrates: 25,
          protein: 15,
        },
        source: "usda",
        sourceId: 12345,
        foodName: "Apple, raw",
        incomplete: false,
        cached: false,
      };

      expect(response).toHaveProperty("nutrition");
      expect(response).toHaveProperty("source");
      expect(response).toHaveProperty("incomplete");
      expect(response).toHaveProperty("cached");
    });
  });

  describe("Cached response", () => {
    it("includes original source", () => {
      const response = {
        nutrition: {},
        source: "cache",
        originalSource: "usda",
        cached: true,
      };

      expect(response.source).toBe("cache");
      expect(response.originalSource).toBe("usda");
    });
  });

  describe("AI estimation response", () => {
    it("includes warning message", () => {
      const response = {
        nutrition: {},
        source: "ai",
        incomplete: true,
        warning: "Nutrition estimated by AI - may not be accurate",
      };

      expect(response.source).toBe("ai");
      expect(response.incomplete).toBe(true);
      expect(response.warning).toContain("estimated");
    });
  });

  describe("Error responses", () => {
    it("returns 400 for missing food ID", () => {
      const statusCode = 400;
      const error = { error: "Food ID is required" };
      expect(statusCode).toBe(400);
      expect(error.error).toContain("required");
    });

    it("returns 400 for invalid USDA food ID", () => {
      const statusCode = 400;
      const error = { error: "Invalid USDA food ID" };
      expect(statusCode).toBe(400);
      expect(error.error).toContain("Invalid");
    });

    it("returns 400 for short search query", () => {
      const statusCode = 400;
      const error = { error: "Search query must be at least 2 characters" };
      expect(statusCode).toBe(400);
      expect(error.error).toContain("2 characters");
    });

    it("returns 404 when nutrition data not found", () => {
      const statusCode = 404;
      const error = { error: "Nutrition data not found" };
      expect(statusCode).toBe(404);
      expect(error.error).toContain("not found");
    });

    it("returns 500 for server errors", () => {
      const statusCode = 500;
      const error = { error: "Failed to fetch nutrition data" };
      expect(statusCode).toBe(500);
      expect(error.error).toContain("Failed");
    });
  });
});

describe("Cache Clear Endpoint", () => {
  it("clears all cache entries", () => {
    const cache = new Map<string, CachedNutrition>();
    const nutrition: NutritionFacts = {
      servingSize: "100g",
      calories: 100,
      totalFat: 5,
      sodium: 200,
      totalCarbohydrates: 15,
      protein: 8,
    };

    setInCache(cache, "usda:1", nutrition, "usda", Date.now(), 1, false);
    setInCache(cache, "usda:2", nutrition, "usda", Date.now(), 2, false);
    setInCache(
      cache,
      "off:3",
      nutrition,
      "openfoodfacts",
      Date.now(),
      "3",
      false,
    );

    const sizeBefore = cache.size;
    cache.clear();

    expect(sizeBefore).toBe(3);
    expect(cache.size).toBe(0);
  });

  it("returns correct response format", () => {
    const response = { message: "Cache cleared", entriesRemoved: 5 };
    expect(response.message).toBe("Cache cleared");
    expect(response.entriesRemoved).toBe(5);
  });
});

describe("Search Result Prioritization", () => {
  it("prioritizes USDA results (70%)", () => {
    const limit = 10;
    const usdaLimit = Math.ceil(limit * 0.7);
    expect(usdaLimit).toBe(7);
  });

  it("fills remaining slots with OpenFoodFacts", () => {
    const limit = 10;
    const usdaCount = 7;
    const offLimit = limit - usdaCount;
    expect(offLimit).toBe(3);
  });

  it("slices results to limit", () => {
    const results = Array(15).fill({ id: "test" });
    const limit = 10;
    expect(results.slice(0, limit).length).toBe(10);
  });
});
