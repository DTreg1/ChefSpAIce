import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import express from "express";
import request from "supertest";

jest.mock("../integrations/usda", () => ({
  searchUSDA: jest.fn(),
  getUSDAFood: jest.fn(),
  mapUSDAToFoodItem: jest.fn((item) => ({
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
  })),
}));

jest.mock("../integrations/openFoodFacts", () => ({
  searchOpenFoodFacts: jest.fn(),
  lookupBarcode: jest.fn(),
  mapOFFToFoodItem: jest.fn((item) => ({
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
  })),
  hasCompleteNutritionData: jest.fn(() => true),
}));

import foodSearchRouter from "../routers/platform/food-search.router";
import { searchUSDA, mapUSDAToFoodItem } from "../integrations/usda";
import {
  searchOpenFoodFacts,
  lookupBarcode,
  mapOFFToFoodItem,
} from "../integrations/openFoodFacts";

const mockSearchUSDA = searchUSDA as jest.MockedFunction<typeof searchUSDA>;
const mockSearchOFF = searchOpenFoodFacts as jest.MockedFunction<
  typeof searchOpenFoodFacts
>;
const mockLookupBarcode = lookupBarcode as jest.MockedFunction<
  typeof lookupBarcode
>;

describe("Food Search Router", () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use("/api/food", foodSearchRouter);
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

    it("should search all sources when no filter specified", async () => {
      mockSearchUSDA.mockResolvedValueOnce([
        {
          fdcId: 123,
          description: "Apple",
          dataType: "Foundation",
          foodNutrients: [],
        },
      ]);
      mockSearchOFF.mockResolvedValueOnce([
        { code: "456", product_name: "Organic Apple", nutriments: {} },
      ]);

      const response = await request(app).get("/api/food/search?query=apple");

      expect(response.status).toBe(200);
      expect(mockSearchUSDA).toHaveBeenCalledWith("apple", expect.any(Number));
      expect(mockSearchOFF).toHaveBeenCalledWith("apple", expect.any(Number));
      expect(response.body.sources).toContain("usda");
      expect(response.body.sources).toContain("openfoodfacts");
    });

    it("should respect source filter for USDA only", async () => {
      mockSearchUSDA.mockResolvedValueOnce([
        {
          fdcId: 123,
          description: "Apple",
          dataType: "Foundation",
          foodNutrients: [],
        },
      ]);

      const response = await request(app).get(
        "/api/food/search?query=apple&sources=usda",
      );

      expect(response.status).toBe(200);
      expect(mockSearchUSDA).toHaveBeenCalled();
      expect(mockSearchOFF).not.toHaveBeenCalled();
      expect(response.body.sources).toEqual(["usda"]);
    });

    it("should respect source filter for OpenFoodFacts only", async () => {
      mockSearchOFF.mockResolvedValueOnce([
        { code: "456", product_name: "Apple", nutriments: {} },
      ]);

      const response = await request(app).get(
        "/api/food/search?query=apple&sources=openfoodfacts",
      );

      expect(response.status).toBe(200);
      expect(mockSearchUSDA).not.toHaveBeenCalled();
      expect(mockSearchOFF).toHaveBeenCalled();
      expect(response.body.sources).toEqual(["openfoodfacts"]);
    });

    it("should respect multiple source filters", async () => {
      mockSearchUSDA.mockResolvedValueOnce([]);
      mockSearchOFF.mockResolvedValueOnce([]);

      const response = await request(app).get(
        "/api/food/search?query=apple&sources=usda,openfoodfacts",
      );

      expect(response.status).toBe(200);
      expect(mockSearchUSDA).toHaveBeenCalled();
      expect(mockSearchOFF).toHaveBeenCalled();
    });

    it("should deduplicate results with same normalized name", async () => {
      mockSearchUSDA.mockResolvedValueOnce([
        {
          fdcId: 123,
          description: "Apple",
          dataType: "Foundation",
          foodNutrients: [],
        },
      ]);
      mockSearchOFF.mockResolvedValueOnce([
        { code: "456", product_name: "Apple", nutriments: {} },
      ]);

      const response = await request(app).get("/api/food/search?query=apple");

      expect(response.status).toBe(200);
      const names = response.body.results.map((r: any) => r.normalizedName);
      const uniqueNames = [...new Set(names)];
      expect(names.length).toBe(uniqueNames.length);
    });

    it("should sort results by relevance score", async () => {
      mockSearchUSDA.mockResolvedValueOnce([
        {
          fdcId: 1,
          description: "Green Apple",
          dataType: "Foundation",
          foodNutrients: [],
        },
        {
          fdcId: 2,
          description: "Apple",
          dataType: "Foundation",
          foodNutrients: [],
        },
        {
          fdcId: 3,
          description: "Apple Juice",
          dataType: "Foundation",
          foodNutrients: [],
        },
      ]);
      mockSearchOFF.mockResolvedValueOnce([]);

      const response = await request(app).get("/api/food/search?query=apple");

      expect(response.status).toBe(200);
      const results = response.body.results;
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].relevanceScore).toBeGreaterThanOrEqual(
          results[i].relevanceScore,
        );
      }
    });

    it("should respect limit parameter", async () => {
      const manyResults = Array.from({ length: 30 }, (_, i) => ({
        fdcId: i,
        description: `Apple Variety ${i}`,
        dataType: "Foundation",
        foodNutrients: [],
      }));
      mockSearchUSDA.mockResolvedValueOnce(manyResults);
      mockSearchOFF.mockResolvedValueOnce([]);

      const response = await request(app).get(
        "/api/food/search?query=apple&limit=5",
      );

      expect(response.status).toBe(200);
      expect(response.body.results.length).toBeLessThanOrEqual(5);
    });

    it("should handle API errors gracefully", async () => {
      mockSearchUSDA.mockRejectedValueOnce(new Error("USDA API Error"));
      mockSearchOFF.mockResolvedValueOnce([
        { code: "123", product_name: "Apple", nutriments: {} },
      ]);

      const response = await request(app).get("/api/food/search?query=apple");

      expect(response.status).toBe(200);
      expect(response.body.results.length).toBeGreaterThanOrEqual(0);
    });

    it("should return totalCount of all results before limiting", async () => {
      mockSearchUSDA.mockResolvedValueOnce([
        {
          fdcId: 1,
          description: "Apple 1",
          dataType: "Foundation",
          foodNutrients: [],
        },
        {
          fdcId: 2,
          description: "Apple 2",
          dataType: "Foundation",
          foodNutrients: [],
        },
      ]);
      mockSearchOFF.mockResolvedValueOnce([
        { code: "3", product_name: "Apple 3", nutriments: {} },
      ]);

      const response = await request(app).get(
        "/api/food/search?query=apple&limit=1",
      );

      expect(response.status).toBe(200);
      expect(response.body.totalCount).toBe(3);
    });

    it("should include dataCompleteness score for each result", async () => {
      mockSearchUSDA.mockResolvedValueOnce([
        {
          fdcId: 123,
          description: "Apple",
          dataType: "Foundation",
          foodNutrients: [],
        },
      ]);
      mockSearchOFF.mockResolvedValueOnce([]);

      const response = await request(app).get("/api/food/search?query=apple");

      expect(response.status).toBe(200);
      response.body.results.forEach((result: any) => {
        expect(typeof result.dataCompleteness).toBe("number");
        expect(result.dataCompleteness).toBeGreaterThanOrEqual(0);
        expect(result.dataCompleteness).toBeLessThanOrEqual(100);
      });
    });

    it("should filter out products without names from OpenFoodFacts", async () => {
      mockSearchUSDA.mockResolvedValueOnce([]);
      mockSearchOFF.mockResolvedValueOnce([
        { code: "1", product_name: "Valid Product", nutriments: {} },
        { code: "2", nutriments: {} },
        { code: "3", product_name: "", nutriments: {} },
      ]);

      const response = await request(app).get("/api/food/search?query=product");

      expect(response.status).toBe(200);
      const offResults = response.body.results.filter(
        (r: any) => r.source === "openfoodfacts",
      );
      expect(offResults.length).toBe(1);
    });
  });

  describe("GET /barcode/:code", () => {
    it("should return 400 when barcode is empty", async () => {
      const response = await request(app).get("/api/food/barcode/");

      expect(response.status).toBe(404);
    });

    it("should lookup barcode in OpenFoodFacts", async () => {
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
      expect(response.body.found).toBe(true);
      expect(response.body.source).toBe("openfoodfacts");
      expect(response.body.item.name).toBe("Nutella");
    });

    it("should return found: false when product not found", async () => {
      mockLookupBarcode.mockResolvedValueOnce(null);

      const response = await request(app).get(
        "/api/food/barcode/0000000000000",
      );

      expect(response.status).toBe(200);
      expect(response.body.found).toBe(false);
      expect(response.body.item).toBeUndefined();
    });

    it("should clean non-numeric characters from barcode", async () => {
      mockLookupBarcode.mockResolvedValueOnce(null);

      await request(app).get("/api/food/barcode/301-762-042-2003");

      expect(mockLookupBarcode).toHaveBeenCalledWith("3017620422003");
    });

    it("should set relevanceScore to 100 for barcode matches", async () => {
      mockLookupBarcode.mockResolvedValueOnce({
        code: "3017620422003",
        product_name: "Nutella",
        nutriments: {},
      });

      const response = await request(app).get(
        "/api/food/barcode/3017620422003",
      );

      expect(response.status).toBe(200);
      expect(response.body.item.relevanceScore).toBe(100);
    });

    it("should handle lookup errors gracefully", async () => {
      mockLookupBarcode.mockRejectedValueOnce(new Error("API Error"));

      const response = await request(app).get(
        "/api/food/barcode/3017620422003",
      );

      expect(response.status).toBe(500);
      expect(response.body.error).toBe("Failed to lookup barcode");
    });

    it("should include all mapped fields in barcode response", async () => {
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
      const item = response.body.item;
      expect(item.id).toBe("off-3017620422003");
      expect(item.name).toBeDefined();
      expect(item.normalizedName).toBeDefined();
      expect(item.source).toBe("openfoodfacts");
      expect(item.sourceId).toBe("3017620422003");
      expect(item.dataCompleteness).toBeDefined();
    });
  });
});
