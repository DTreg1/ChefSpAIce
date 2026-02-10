import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import express from "express";
import request from "supertest";

jest.mock("../integrations/usda", () => ({
  searchUSDA: jest.fn(),
  getUSDAFood: jest.fn(),
  mapUSDAToFoodItem: jest.fn((item: any) => ({
    name: item.description,
    category: item.foodCategory?.description || "Other",
    nutrition: {
      calories: 100,
      protein: 5,
      carbs: 20,
      fat: 3,
    },
    source: "usda" as const,
    sourceId: item.fdcId,
    brandOwner: item.brandOwner,
    brandName: item.brandName,
    gtinUpc: item.gtinUpc,
    householdServingFullText: item.householdServingFullText,
    dataType: item.dataType,
    ingredients: item.ingredients,
    packageWeight: item.packageWeight,
  })),
  lookupUSDABarcode: jest.fn(),
}));

jest.mock("../integrations/openFoodFacts", () => ({
  searchOpenFoodFacts: jest.fn(),
  lookupBarcode: jest.fn(),
  mapOFFToFoodItem: jest.fn((item: any) => ({
    name: item.product_name || "Unknown",
    category: "Other",
    brand: item.brands?.split(",")[0],
    imageUrl: item.image_url,
    nutrition: {
      calories: 150,
      protein: 6,
      carbs: 25,
      fat: 5,
    },
    source: "openfoodfacts" as const,
    sourceId: item.code,
    nutriscoreGrade: item.nutriscore_grade,
    novaGroup: item.nova_group,
  })),
  hasCompleteNutritionData: jest.fn(() => true),
}));

import foodSearchRouter from "../routers/platform/food-search.router";
import { searchUSDA, lookupUSDABarcode } from "../integrations/usda";
import { lookupBarcode } from "../integrations/openFoodFacts";
import { globalErrorHandler } from "../middleware/errorHandler";

const mockSearchUSDA = searchUSDA as jest.MockedFunction<typeof searchUSDA>;
const mockLookupUSDABarcode = lookupUSDABarcode as jest.MockedFunction<typeof lookupUSDABarcode>;
const mockLookupBarcode = lookupBarcode as jest.MockedFunction<typeof lookupBarcode>;

let queryId = 0;
function uniqueQuery(base: string): string {
  return `${base}_test_${++queryId}`;
}

describe("Food Search Router", () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use("/api/food", foodSearchRouter);
    app.use(globalErrorHandler);
    jest.clearAllMocks();
  });

  describe("GET /search", () => {
    it("should return 400 when query is missing", async () => {
      const response = await request(app).get("/api/food/search");

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Query parameter is required");
    });

    it("should return 400 when query is empty", async () => {
      const response = await request(app).get("/api/food/search?query=");

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Query parameter is required");
    });

    it("should search USDA only and return sources as usda", async () => {
      const q = uniqueQuery("apple");
      mockSearchUSDA.mockResolvedValueOnce([
        {
          fdcId: 123,
          description: "Apple",
          dataType: "Foundation",
          foodNutrients: [],
        },
      ]);

      const response = await request(app).get(`/api/food/search?query=${q}`);

      expect(response.status).toBe(200);
      expect(mockSearchUSDA).toHaveBeenCalled();
      expect(response.body.data.sources).toEqual(["usda"]);
    });

    it("should return empty results when USDA returns nothing", async () => {
      const q = uniqueQuery("empty");
      mockSearchUSDA.mockResolvedValueOnce([]);

      const response = await request(app).get(`/api/food/search?query=${q}`);

      expect(response.status).toBe(200);
      expect(response.body.data.results).toEqual([]);
      expect(response.body.data.sources).toEqual(["usda"]);
    });

    it("should deduplicate results with same normalized name", async () => {
      const q = uniqueQuery("dedup");
      mockSearchUSDA.mockResolvedValueOnce([
        {
          fdcId: 123,
          description: "Apple",
          dataType: "Foundation",
          foodNutrients: [],
        },
        {
          fdcId: 456,
          description: "Apple",
          dataType: "SR Legacy",
          foodNutrients: [],
        },
      ]);

      const response = await request(app).get(`/api/food/search?query=${q}`);

      expect(response.status).toBe(200);
      const names = response.body.data.results.map((r: any) => r.normalizedName);
      const uniqueNames = [...new Set(names)];
      expect(names.length).toBe(uniqueNames.length);
    });

    it("should sort results by relevance score", async () => {
      const q = uniqueQuery("sortapple");
      mockSearchUSDA.mockResolvedValueOnce([
        {
          fdcId: 1,
          description: `Green ${q}`,
          dataType: "Foundation",
          foodNutrients: [],
        },
        {
          fdcId: 2,
          description: q,
          dataType: "Foundation",
          foodNutrients: [],
        },
        {
          fdcId: 3,
          description: `${q} Juice`,
          dataType: "Foundation",
          foodNutrients: [],
        },
      ]);

      const response = await request(app).get(`/api/food/search?query=${q}`);

      expect(response.status).toBe(200);
      const results = response.body.data.results;
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].relevanceScore).toBeGreaterThanOrEqual(
          results[i].relevanceScore,
        );
      }
    });

    it("should respect limit parameter", async () => {
      const q = uniqueQuery("limit");
      const manyResults = Array.from({ length: 30 }, (_, i) => ({
        fdcId: i + 100,
        description: `${q} Variety ${i}`,
        dataType: "Foundation",
        foodNutrients: [],
      }));
      mockSearchUSDA.mockResolvedValueOnce(manyResults);

      const response = await request(app).get(
        `/api/food/search?query=${q}&limit=5`,
      );

      expect(response.status).toBe(200);
      expect(response.body.data.results.length).toBeLessThanOrEqual(5);
    });

    it("should handle USDA API errors gracefully", async () => {
      const q = uniqueQuery("error");
      mockSearchUSDA.mockRejectedValueOnce(new Error("USDA API Error"));

      const response = await request(app).get(`/api/food/search?query=${q}`);

      expect(response.status).toBe(200);
      expect(response.body.data.results.length).toBe(0);
    });

    it("should return totalCount of all results before limiting", async () => {
      const q = uniqueQuery("total");
      mockSearchUSDA.mockResolvedValueOnce([
        {
          fdcId: 1,
          description: `${q} 1`,
          dataType: "Foundation",
          foodNutrients: [],
        },
        {
          fdcId: 2,
          description: `${q} 2`,
          dataType: "Foundation",
          foodNutrients: [],
        },
      ]);

      const response = await request(app).get(
        `/api/food/search?query=${q}&limit=1`,
      );

      expect(response.status).toBe(200);
      expect(response.body.data.totalCount).toBe(2);
    });

    it("should include dataCompleteness score for each result", async () => {
      const q = uniqueQuery("completeness");
      mockSearchUSDA.mockResolvedValueOnce([
        {
          fdcId: 123,
          description: "Apple",
          dataType: "Foundation",
          foodNutrients: [],
        },
      ]);

      const response = await request(app).get(`/api/food/search?query=${q}`);

      expect(response.status).toBe(200);
      response.body.data.results.forEach((result: any) => {
        expect(typeof result.dataCompleteness).toBe("number");
        expect(result.dataCompleteness).toBeGreaterThanOrEqual(0);
        expect(result.dataCompleteness).toBeLessThanOrEqual(100);
      });
    });

    it("should include new fields from USDA mapping", async () => {
      const q = uniqueQuery("newfields");
      mockSearchUSDA.mockResolvedValueOnce([
        {
          fdcId: 123,
          description: "Cheerios",
          dataType: "Branded",
          brandOwner: "General Mills",
          brandName: "Cheerios",
          gtinUpc: "016000275287",
          householdServingFullText: "1 cup",
          ingredients: "Whole Grain Oats",
          packageWeight: "12 oz",
          foodNutrients: [],
        },
      ]);

      const response = await request(app).get(`/api/food/search?query=${q}`);

      expect(response.status).toBe(200);
      const item = response.body.data.results[0];
      expect(item.brandName).toBe("Cheerios");
      expect(item.gtinUpc).toBe("016000275287");
      expect(item.householdServingFullText).toBe("1 cup");
      expect(item.dataType).toBe("Branded");
      expect(item.ingredients).toBe("Whole Grain Oats");
      expect(item.packageWeight).toBe("12 oz");
    });

    it("should enrich USDA results with OFF data for items with barcodes", async () => {
      const q = uniqueQuery("enrich");
      mockSearchUSDA.mockResolvedValueOnce([
        {
          fdcId: 123,
          description: "Cheerios",
          dataType: "Branded",
          gtinUpc: "016000275287",
          foodNutrients: [],
        },
      ]);
      mockLookupBarcode.mockResolvedValueOnce({
        code: "016000275287",
        product_name: "Cheerios",
        image_url: "https://example.com/cheerios.jpg",
        nutriscore_grade: "b",
        nova_group: 4,
        nutriments: {},
      });

      const response = await request(app).get(`/api/food/search?query=${q}`);

      expect(response.status).toBe(200);
      expect(mockLookupBarcode).toHaveBeenCalledWith("016000275287");
      const item = response.body.data.results[0];
      expect(item.imageUrl).toBe("https://example.com/cheerios.jpg");
      expect(item.nutriscoreGrade).toBe("b");
      expect(item.novaGroup).toBe(4);
    });

    it("should not fail if OFF enrichment errors out", async () => {
      const q = uniqueQuery("enrichfail");
      mockSearchUSDA.mockResolvedValueOnce([
        {
          fdcId: 123,
          description: "Cheerios",
          dataType: "Branded",
          gtinUpc: "016000275287",
          foodNutrients: [],
        },
      ]);
      mockLookupBarcode.mockRejectedValueOnce(new Error("OFF unavailable"));

      const response = await request(app).get(`/api/food/search?query=${q}`);

      expect(response.status).toBe(200);
      expect(response.body.data.results.length).toBe(1);
      expect(response.body.data.results[0].imageUrl).toBeUndefined();
    });
  });

  describe("GET /barcode/:code", () => {
    it("should return 404 when barcode path is empty", async () => {
      const response = await request(app).get("/api/food/barcode/");

      expect(response.status).toBe(404);
    });

    it("should lookup barcode in OpenFoodFacts when USDA has no match", async () => {
      mockLookupUSDABarcode.mockResolvedValueOnce(null);
      mockLookupBarcode.mockResolvedValueOnce({
        code: "3017620422003",
        product_name: "Nutella",
        brands: "Ferrero",
        nutriments: { energy_kcal_100g: 539 },
      });

      const response = await request(app).get(
        "/api/food/barcode/3017620422003",
      );

      expect(response.status).toBe(200);
      expect(mockLookupBarcode).toHaveBeenCalledWith("3017620422003");
      expect(response.body.data.found).toBe(true);
      expect(response.body.data.source).toBe("openfoodfacts");
      expect(response.body.data.item.name).toBe("Nutella");
    });

    it("should return found: false when product not found", async () => {
      mockLookupUSDABarcode.mockResolvedValueOnce(null);
      mockLookupBarcode.mockResolvedValueOnce(null);

      const response = await request(app).get(
        "/api/food/barcode/0000000000000",
      );

      expect(response.status).toBe(200);
      expect(response.body.data.found).toBe(false);
      expect(response.body.data.item).toBeUndefined();
    });

    it("should clean non-numeric characters from barcode", async () => {
      mockLookupUSDABarcode.mockResolvedValueOnce(null);
      mockLookupBarcode.mockResolvedValueOnce(null);

      await request(app).get("/api/food/barcode/301-762-042-2003");

      expect(mockLookupBarcode).toHaveBeenCalledWith("3017620422003");
    });

    it("should set relevanceScore to 100 for barcode matches", async () => {
      mockLookupUSDABarcode.mockResolvedValueOnce(null);
      mockLookupBarcode.mockResolvedValueOnce({
        code: "3017620422003",
        product_name: "Nutella",
        nutriments: {},
      });

      const response = await request(app).get(
        "/api/food/barcode/3017620422003",
      );

      expect(response.status).toBe(200);
      expect(response.body.data.item.relevanceScore).toBe(100);
    });

    it("should handle lookup errors gracefully", async () => {
      mockLookupUSDABarcode.mockRejectedValueOnce(new Error("API Error"));

      const response = await request(app).get(
        "/api/food/barcode/3017620422003",
      );

      expect(response.status).toBe(500);
    });

    it("should include all mapped fields in barcode response", async () => {
      mockLookupUSDABarcode.mockResolvedValueOnce(null);
      mockLookupBarcode.mockResolvedValueOnce({
        code: "3017620422003",
        product_name: "Nutella",
        brands: "Ferrero",
        categories: "en:Spreads",
        image_url: "https://example.com/image.jpg",
        nutriments: { energy_kcal_100g: 539 },
      });

      const response = await request(app).get(
        "/api/food/barcode/3017620422003",
      );

      expect(response.status).toBe(200);
      const item = response.body.data.item;
      expect(item.id).toBe("off-3017620422003");
      expect(item.name).toBeDefined();
      expect(item.normalizedName).toBeDefined();
      expect(item.source).toBe("openfoodfacts");
      expect(item.sourceId).toBe("3017620422003");
      expect(item.dataCompleteness).toBeDefined();
    });
  });
});
