import {
  describe,
  it,
  expect,
  jest,
  beforeEach,
  afterEach,
} from "@jest/globals";

const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

const originalEnv = process.env;

describe("USDA Integration", () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv, USDA_API_KEY: "test-api-key" };
    mockFetch.mockReset();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("searchUSDA", () => {
    it("should construct correct URL with query parameters", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ foods: [] }),
      } as Response);

      const { searchUSDA, clearUSDACache } = await import(
        "../integrations/usda"
      );
      clearUSDACache();

      await searchUSDA("apple", 10);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain(
        "https://api.nal.usda.gov/fdc/v1/foods/search",
      );
      expect(calledUrl).toContain("api_key=test-api-key");
      expect(calledUrl).toContain("query=apple");
      expect(calledUrl).toContain("pageSize=10");
    });

    it("should return empty array when API key is not configured", async () => {
      process.env.USDA_API_KEY = "";
      jest.resetModules();

      const { searchUSDA } = await import("../integrations/usda");
      const results = await searchUSDA("apple");

      expect(results).toEqual([]);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should return search results on successful response", async () => {
      const mockFoods = [
        {
          fdcId: 123456,
          description: "Apple, raw",
          dataType: "Foundation",
          foodNutrients: [
            {
              nutrientId: 1008,
              nutrientName: "Energy",
              nutrientNumber: "208",
              unitName: "kcal",
              value: 52,
            },
            {
              nutrientId: 1003,
              nutrientName: "Protein",
              nutrientNumber: "203",
              unitName: "g",
              value: 0.26,
            },
          ],
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ foods: mockFoods }),
      } as Response);

      const { searchUSDA, clearUSDACache } = await import(
        "../integrations/usda"
      );
      clearUSDACache();

      const results = await searchUSDA("apple");

      expect(results).toHaveLength(1);
      expect(results[0].fdcId).toBe(123456);
      expect(results[0].description).toBe("Apple, raw");
    });

    it("should handle rate limit (429) gracefully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: "Too Many Requests",
      } as Response);

      const { searchUSDA, clearUSDACache } = await import(
        "../integrations/usda"
      );
      clearUSDACache();

      const results = await searchUSDA("apple");

      expect(results).toEqual([]);
    });

    it("should handle API errors gracefully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      } as Response);

      const { searchUSDA, clearUSDACache } = await import(
        "../integrations/usda"
      );
      clearUSDACache();

      const results = await searchUSDA("apple");

      expect(results).toEqual([]);
    });

    it("should handle network errors gracefully", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const { searchUSDA, clearUSDACache } = await import(
        "../integrations/usda"
      );
      clearUSDACache();

      const results = await searchUSDA("apple");

      expect(results).toEqual([]);
    });

    it("should use cached results for repeated queries", async () => {
      const mockFoods = [
        {
          fdcId: 123,
          description: "Apple",
          dataType: "Foundation",
          foodNutrients: [],
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ foods: mockFoods }),
      } as Response);

      const { searchUSDA, clearUSDACache } = await import(
        "../integrations/usda"
      );
      clearUSDACache();

      await searchUSDA("apple", 25);
      await searchUSDA("apple", 25);

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("getUSDAFood", () => {
    it("should construct correct URL for food detail", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          fdcId: 123456,
          description: "Apple",
          dataType: "Foundation",
          foodNutrients: [],
        }),
      } as Response);

      const { getUSDAFood, clearUSDACache } = await import(
        "../integrations/usda"
      );
      clearUSDACache();

      await getUSDAFood(123456);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain(
        "https://api.nal.usda.gov/fdc/v1/food/123456",
      );
      expect(calledUrl).toContain("api_key=test-api-key");
    });

    it("should return null when food not found (404)", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
      } as Response);

      const { getUSDAFood, clearUSDACache } = await import(
        "../integrations/usda"
      );
      clearUSDACache();

      const result = await getUSDAFood(999999);

      expect(result).toBeNull();
    });

    it("should cache null results for 404 responses", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
      } as Response);

      const { getUSDAFood, clearUSDACache } = await import(
        "../integrations/usda"
      );
      clearUSDACache();

      await getUSDAFood(999999);
      await getUSDAFood(999999);

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("mapUSDAToFoodItem", () => {
    it("should correctly map nutrient values", async () => {
      const { mapUSDAToFoodItem } = await import("../integrations/usda");

      const usdaFood = {
        fdcId: 123456,
        description: "Test Food",
        dataType: "Foundation",
        foodNutrients: [
          {
            nutrientId: 1008,
            nutrientName: "Energy",
            nutrientNumber: "208",
            unitName: "kcal",
            value: 150.5,
          },
          {
            nutrientId: 1003,
            nutrientName: "Protein",
            nutrientNumber: "203",
            unitName: "g",
            value: 5.67,
          },
          {
            nutrientId: 1005,
            nutrientName: "Carbohydrate",
            nutrientNumber: "205",
            unitName: "g",
            value: 20.123,
          },
          {
            nutrientId: 1004,
            nutrientName: "Fat",
            nutrientNumber: "204",
            unitName: "g",
            value: 8.45,
          },
          {
            nutrientId: 1079,
            nutrientName: "Fiber",
            nutrientNumber: "291",
            unitName: "g",
            value: 3.2,
          },
          {
            nutrientId: 2000,
            nutrientName: "Sugars",
            nutrientNumber: "269",
            unitName: "g",
            value: 10.5,
          },
          {
            nutrientId: 1093,
            nutrientName: "Sodium",
            nutrientNumber: "307",
            unitName: "mg",
            value: 250.7,
          },
        ],
        servingSize: 100,
        servingSizeUnit: "g",
      };

      const mapped = mapUSDAToFoodItem(usdaFood);

      expect(mapped.name).toBe("Test Food");
      expect(mapped.nutrition.calories).toBe(151);
      expect(mapped.nutrition.protein).toBe(5.7);
      expect(mapped.nutrition.carbs).toBe(20.1);
      expect(mapped.nutrition.fat).toBe(8.5);
      expect(mapped.nutrition.fiber).toBe(3.2);
      expect(mapped.nutrition.sugar).toBe(10.5);
      expect(mapped.nutrition.sodium).toBe(251);
      expect(mapped.nutrition.servingSize).toBe("100 g");
      expect(mapped.source).toBe("usda");
      expect(mapped.sourceId).toBe(123456);
    });

    it("should handle missing nutrients with defaults", async () => {
      const { mapUSDAToFoodItem } = await import("../integrations/usda");

      const usdaFood = {
        fdcId: 123456,
        description: "Minimal Food",
        dataType: "Foundation",
        foodNutrients: [],
      };

      const mapped = mapUSDAToFoodItem(usdaFood);

      expect(mapped.nutrition.calories).toBe(0);
      expect(mapped.nutrition.protein).toBe(0);
      expect(mapped.nutrition.carbs).toBe(0);
      expect(mapped.nutrition.fat).toBe(0);
      expect(mapped.nutrition.fiber).toBeUndefined();
      expect(mapped.nutrition.sugar).toBeUndefined();
      expect(mapped.nutrition.sodium).toBeUndefined();
    });

    it("should extract category from foodCategory", async () => {
      const { mapUSDAToFoodItem } = await import("../integrations/usda");

      const usdaFood = {
        fdcId: 123456,
        description: "Categorized Food",
        dataType: "Foundation",
        foodNutrients: [],
        foodCategory: {
          description: "Fruits and Fruit Juices",
        },
      };

      const mapped = mapUSDAToFoodItem(usdaFood);

      expect(mapped.category).toBe("Fruits and Fruit Juices");
    });

    it("should default category to Other when not provided", async () => {
      const { mapUSDAToFoodItem } = await import("../integrations/usda");

      const usdaFood = {
        fdcId: 123456,
        description: "No Category Food",
        dataType: "Foundation",
        foodNutrients: [],
      };

      const mapped = mapUSDAToFoodItem(usdaFood);

      expect(mapped.category).toBe("Other");
    });

    it("should include brand owner when available", async () => {
      const { mapUSDAToFoodItem } = await import("../integrations/usda");

      const usdaFood = {
        fdcId: 123456,
        description: "Branded Food",
        dataType: "Branded",
        brandOwner: "Test Brand Inc.",
        foodNutrients: [],
      };

      const mapped = mapUSDAToFoodItem(usdaFood);

      expect(mapped.brandOwner).toBe("Test Brand Inc.");
    });
  });
});
