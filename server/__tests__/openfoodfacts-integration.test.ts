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

describe("OpenFoodFacts Integration", () => {
  beforeEach(() => {
    jest.resetModules();
    mockFetch.mockReset();
  });

  describe("searchOpenFoodFacts", () => {
    it("should construct correct search URL with parameters", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ products: [], count: 0 }),
      } as Response);

      const { searchOpenFoodFacts } = await import(
        "../integrations/openFoodFacts"
      );

      await searchOpenFoodFacts("nutella", 10);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain(
        "https://world.openfoodfacts.org/cgi/search.pl",
      );
      expect(calledUrl).toContain("search_terms=nutella");
      expect(calledUrl).toContain("page_size=10");
      expect(calledUrl).toContain("json=true");
    });

    it("should include proper User-Agent header", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ products: [] }),
      } as Response);

      const { searchOpenFoodFacts } = await import(
        "../integrations/openFoodFacts"
      );

      await searchOpenFoodFacts("test");

      const calledOptions = mockFetch.mock.calls[0][1] as RequestInit;
      expect(calledOptions.headers).toHaveProperty("User-Agent");
      expect(
        (calledOptions.headers as Record<string, string>)["User-Agent"],
      ).toContain("FreshPantry");
    });

    it("should return products on successful response", async () => {
      const mockProducts = [
        {
          code: "3017620422003",
          product_name: "Nutella",
          brands: "Ferrero",
          nutriments: {
            energy_kcal_100g: 539,
            proteins_100g: 6.3,
            carbohydrates_100g: 57.5,
            fat_100g: 30.9,
          },
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ products: mockProducts, count: 1 }),
      } as Response);

      const { searchOpenFoodFacts } = await import(
        "../integrations/openFoodFacts"
      );

      const results = await searchOpenFoodFacts("nutella");

      expect(results).toHaveLength(1);
      expect(results[0].code).toBe("3017620422003");
      expect(results[0].product_name).toBe("Nutella");
    });

    it("should handle API errors gracefully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      } as Response);

      const { searchOpenFoodFacts } = await import(
        "../integrations/openFoodFacts"
      );

      const results = await searchOpenFoodFacts("test");

      expect(results).toEqual([]);
    });

    it("should handle network errors gracefully", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const { searchOpenFoodFacts } = await import(
        "../integrations/openFoodFacts"
      );

      const results = await searchOpenFoodFacts("test");

      expect(results).toEqual([]);
    });

    it("should handle empty product list", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ products: null, count: 0 }),
      } as Response);

      const { searchOpenFoodFacts } = await import(
        "../integrations/openFoodFacts"
      );

      const results = await searchOpenFoodFacts("xyznonexistent");

      expect(results).toEqual([]);
    });
  });

  describe("lookupBarcode", () => {
    it("should construct correct barcode URL", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 0, status_verbose: "product not found" }),
      } as Response);

      const { lookupBarcode } = await import("../integrations/openFoodFacts");

      await lookupBarcode("3017620422003");

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toBe(
        "https://world.openfoodfacts.org/api/v0/product/3017620422003.json",
      );
    });

    it("should clean barcode of non-numeric characters", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 0 }),
      } as Response);

      const { lookupBarcode } = await import("../integrations/openFoodFacts");

      await lookupBarcode("301-762-042-2003");

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain("3017620422003.json");
    });

    it("should return product when found (status: 1)", async () => {
      const mockProduct = {
        code: "3017620422003",
        product_name: "Nutella",
        brands: "Ferrero",
        nutriments: {
          energy_kcal_100g: 539,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 1,
          status_verbose: "product found",
          product: mockProduct,
        }),
      } as Response);

      const { lookupBarcode } = await import("../integrations/openFoodFacts");

      const result = await lookupBarcode("3017620422003");

      expect(result).not.toBeNull();
      expect(result?.product_name).toBe("Nutella");
    });

    it("should return null when product not found (status: 0)", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 0, status_verbose: "product not found" }),
      } as Response);

      const { lookupBarcode } = await import("../integrations/openFoodFacts");

      const result = await lookupBarcode("0000000000000");

      expect(result).toBeNull();
    });

    it("should handle API errors gracefully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Server Error",
      } as Response);

      const { lookupBarcode } = await import("../integrations/openFoodFacts");

      const result = await lookupBarcode("3017620422003");

      expect(result).toBeNull();
    });

    it("should handle network errors gracefully", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const { lookupBarcode } = await import("../integrations/openFoodFacts");

      const result = await lookupBarcode("3017620422003");

      expect(result).toBeNull();
    });
  });

  describe("mapOFFToFoodItem", () => {
    it("should correctly map product data to food item", async () => {
      const { mapOFFToFoodItem } = await import(
        "../integrations/openFoodFacts"
      );

      const product = {
        code: "3017620422003",
        product_name: "Nutella",
        brands: "Ferrero,Other Brand",
        categories: "en:Spreads,en:Sweet-spreads",
        image_url: "https://example.com/nutella.jpg",
        serving_size: "15g",
        nutriscore_grade: "e",
        nova_group: 4,
        nutriments: {
          energy_kcal_100g: 539,
          proteins_100g: 6.3,
          carbohydrates_100g: 57.5,
          fat_100g: 30.9,
          fiber_100g: 3.4,
          sugars_100g: 56.3,
          sodium_100g: 0.041,
        },
      };

      const mapped = mapOFFToFoodItem(product);

      expect(mapped.name).toBe("Nutella");
      expect(mapped.brand).toBe("Ferrero");
      expect(mapped.category).toBe("Spreads");
      expect(mapped.imageUrl).toBe("https://example.com/nutella.jpg");
      expect(mapped.nutrition.calories).toBe(539);
      expect(mapped.nutrition.protein).toBe(6.3);
      expect(mapped.nutrition.carbs).toBe(57.5);
      expect(mapped.nutrition.fat).toBe(30.9);
      expect(mapped.nutrition.fiber).toBe(3.4);
      expect(mapped.nutrition.sugar).toBe(56.3);
      expect(mapped.nutrition.sodium).toBe(41);
      expect(mapped.nutrition.servingSize).toBe("15g");
      expect(mapped.source).toBe("openfoodfacts");
      expect(mapped.sourceId).toBe("3017620422003");
      expect(mapped.nutriscoreGrade).toBe("e");
      expect(mapped.novaGroup).toBe(4);
    });

    it("should handle missing product name with fallbacks", async () => {
      const { mapOFFToFoodItem } = await import(
        "../integrations/openFoodFacts"
      );

      const productWithEn = {
        code: "123",
        product_name_en: "English Name",
        nutriments: {},
      };

      const productWithGeneric = {
        code: "123",
        generic_name: "Generic Name",
        nutriments: {},
      };

      const productWithNothing = {
        code: "123",
        nutriments: {},
      };

      expect(mapOFFToFoodItem(productWithEn).name).toBe("English Name");
      expect(mapOFFToFoodItem(productWithGeneric).name).toBe("Generic Name");
      expect(mapOFFToFoodItem(productWithNothing).name).toBe("Unknown Product");
    });

    it("should handle missing nutriments", async () => {
      const { mapOFFToFoodItem } = await import(
        "../integrations/openFoodFacts"
      );

      const product = {
        code: "123",
        product_name: "No Nutrition",
      };

      const mapped = mapOFFToFoodItem(product);

      expect(mapped.nutrition.calories).toBe(0);
      expect(mapped.nutrition.protein).toBe(0);
      expect(mapped.nutrition.carbs).toBe(0);
      expect(mapped.nutrition.fat).toBe(0);
      expect(mapped.nutrition.fiber).toBeUndefined();
      expect(mapped.nutrition.sugar).toBeUndefined();
      expect(mapped.nutrition.sodium).toBeUndefined();
    });

    it("should handle alternative calorie field format", async () => {
      const { mapOFFToFoodItem } = await import(
        "../integrations/openFoodFacts"
      );

      const product = {
        code: "123",
        product_name: "Alt Format",
        nutriments: {
          "energy-kcal_100g": 250,
        },
      };

      const mapped = mapOFFToFoodItem(product);

      expect(mapped.nutrition.calories).toBe(250);
    });

    it("should convert salt to sodium when sodium not provided", async () => {
      const { mapOFFToFoodItem } = await import(
        "../integrations/openFoodFacts"
      );

      const product = {
        code: "123",
        product_name: "Salt Product",
        nutriments: {
          salt_100g: 1.0,
        },
      };

      const mapped = mapOFFToFoodItem(product);

      expect(mapped.nutrition.sodium).toBe(400);
    });

    it("should prefer sodium over salt when both provided", async () => {
      const { mapOFFToFoodItem } = await import(
        "../integrations/openFoodFacts"
      );

      const product = {
        code: "123",
        product_name: "Both Fields",
        nutriments: {
          sodium_100g: 0.5,
          salt_100g: 2.0,
        },
      };

      const mapped = mapOFFToFoodItem(product);

      expect(mapped.nutrition.sodium).toBe(500);
    });

    it("should clean category string", async () => {
      const { mapOFFToFoodItem } = await import(
        "../integrations/openFoodFacts"
      );

      const product = {
        code: "123",
        product_name: "Test",
        categories: "en:plant-based-foods,en:beverages",
        nutriments: {},
      };

      const mapped = mapOFFToFoodItem(product);

      expect(mapped.category).toBe("Plant based foods");
    });

    it("should default category to Other when not provided", async () => {
      const { mapOFFToFoodItem } = await import(
        "../integrations/openFoodFacts"
      );

      const product = {
        code: "123",
        product_name: "No Category",
        nutriments: {},
      };

      const mapped = mapOFFToFoodItem(product);

      expect(mapped.category).toBe("Other");
    });
  });

  describe("hasCompleteNutritionData", () => {
    it("should return true when all required fields are present", async () => {
      const { hasCompleteNutritionData } = await import(
        "../integrations/openFoodFacts"
      );

      const product = {
        code: "123",
        nutriments: {
          energy_kcal_100g: 100,
          proteins_100g: 5,
          carbohydrates_100g: 20,
          fat_100g: 3,
        },
      };

      expect(hasCompleteNutritionData(product)).toBe(true);
    });

    it("should return true with alternative calorie format", async () => {
      const { hasCompleteNutritionData } = await import(
        "../integrations/openFoodFacts"
      );

      const product = {
        code: "123",
        nutriments: {
          "energy-kcal_100g": 100,
          proteins_100g: 5,
          carbohydrates_100g: 20,
          fat_100g: 3,
        },
      };

      expect(hasCompleteNutritionData(product)).toBe(true);
    });

    it("should return false when calories missing", async () => {
      const { hasCompleteNutritionData } = await import(
        "../integrations/openFoodFacts"
      );

      const product = {
        code: "123",
        nutriments: {
          proteins_100g: 5,
          carbohydrates_100g: 20,
          fat_100g: 3,
        },
      };

      expect(hasCompleteNutritionData(product)).toBe(false);
    });

    it("should return false when nutriments is missing", async () => {
      const { hasCompleteNutritionData } = await import(
        "../integrations/openFoodFacts"
      );

      const product = {
        code: "123",
      };

      expect(hasCompleteNutritionData(product)).toBe(false);
    });

    it("should return false when any required field is missing", async () => {
      const { hasCompleteNutritionData } = await import(
        "../integrations/openFoodFacts"
      );

      const noProtein = {
        code: "1",
        nutriments: {
          energy_kcal_100g: 100,
          carbohydrates_100g: 20,
          fat_100g: 3,
        },
      };
      const noCarbs = {
        code: "2",
        nutriments: { energy_kcal_100g: 100, proteins_100g: 5, fat_100g: 3 },
      };
      const noFat = {
        code: "3",
        nutriments: {
          energy_kcal_100g: 100,
          proteins_100g: 5,
          carbohydrates_100g: 20,
        },
      };

      expect(hasCompleteNutritionData(noProtein)).toBe(false);
      expect(hasCompleteNutritionData(noCarbs)).toBe(false);
      expect(hasCompleteNutritionData(noFat)).toBe(false);
    });
  });
});
