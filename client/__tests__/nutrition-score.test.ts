import { vi } from "vitest";
import { calculateNutritionScore, getScoreDescription } from "./nutrition-score";
import type { NutritionInfo } from "./storage";

vi.mock("@/constants/theme", () => ({
  AppColors: {
    success: "#2ECC71",
    warning: "#F39C12",
    secondary: "#E67E22",
    error: "#E74C3C",
    textSecondary: "#495057",
  },
}));

vi.mock("@/lib/storage", () => ({}));

describe("nutrition-score", () => {
  describe("calculateNutritionScore", () => {
    it("should return grade '?' for minimal data (no optional fields)", () => {
      const nutrition: NutritionInfo = {
        calories: 100,
        protein: 10,
        carbs: 15,
        fat: 5,
      };
      const result = calculateNutritionScore(nutrition);

      expect(result.grade).toBe("?");
      expect(result.score).toBe(0);
      expect(result.isIncomplete).toBe(true);
      expect(result.completenessLevel).toBe("minimal");
      expect(result.label).toBe("Incomplete");
      expect(result.color).toBe("#495057");
    });

    it("should return grade 'A' for high protein, low sugar, high fiber food", () => {
      const nutrition: NutritionInfo = {
        calories: 100,
        protein: 25,
        carbs: 10,
        fat: 5,
        fiber: 5,
        sugar: 1,
        sodium: 50,
      };
      const result = calculateNutritionScore(nutrition);

      expect(result.grade).toBe("A");
      expect(result.score).toBeGreaterThanOrEqual(80);
      expect(result.isIncomplete).toBe(false);
      expect(result.completenessLevel).toBe("full");
      expect(result.label).toBe("Excellent");
    });

    it("should return grade 'D' or 'E' for high sugar, high fat food", () => {
      const nutrition: NutritionInfo = {
        calories: 100,
        protein: 5,
        carbs: 15,
        fat: 60,
        fiber: 1,
        sugar: 25,
        sodium: 100,
      };
      const result = calculateNutritionScore(nutrition);

      expect(["D", "E"]).toContain(result.grade);
      expect(result.score).toBeLessThan(50);
    });

    it("should return grade 'B' or 'C' for balanced moderate food", () => {
      const nutrition: NutritionInfo = {
        calories: 100,
        protein: 12,
        carbs: 15,
        fat: 8,
        fiber: 2,
        sugar: 5,
        sodium: 100,
      };
      const result = calculateNutritionScore(nutrition);

      expect(["B", "C"]).toContain(result.grade);
      expect(result.score).toBeGreaterThanOrEqual(50);
      expect(result.score).toBeLessThan(80);
    });

    it("should have partial completeness with only fiber provided", () => {
      const nutrition: NutritionInfo = {
        calories: 100,
        protein: 10,
        carbs: 15,
        fat: 5,
        fiber: 3,
      };
      const result = calculateNutritionScore(nutrition);

      expect(result.completenessLevel).toBe("partial");
      expect(result.isIncomplete).toBe(true);
      expect(result.grade).not.toBe("?");
      expect(result.score).toBeGreaterThan(0);
    });

    it("should have partial completeness with fiber and sugar provided", () => {
      const nutrition: NutritionInfo = {
        calories: 100,
        protein: 10,
        carbs: 15,
        fat: 5,
        fiber: 2,
        sugar: 3,
      };
      const result = calculateNutritionScore(nutrition);

      expect(result.completenessLevel).toBe("partial");
      expect(result.isIncomplete).toBe(true);
      expect(result.grade).not.toBe("?");
    });

    it("should have full completeness with all optional fields", () => {
      const nutrition: NutritionInfo = {
        calories: 100,
        protein: 10,
        carbs: 15,
        fat: 5,
        fiber: 2,
        sugar: 3,
        sodium: 100,
      };
      const result = calculateNutritionScore(nutrition);

      expect(result.completenessLevel).toBe("full");
      expect(result.isIncomplete).toBe(false);
    });

    it("should handle zero calories edge case", () => {
      const nutrition: NutritionInfo = {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
      };
      const result = calculateNutritionScore(nutrition);

      expect(result.grade).toBe("?");
      expect(result.score).toBe(0);
      expect(result.isIncomplete).toBe(true);
    });

    it("should apply penalty for partial completeness", () => {
      const fullData: NutritionInfo = {
        calories: 100,
        protein: 10,
        carbs: 15,
        fat: 5,
        fiber: 2,
        sugar: 3,
        sodium: 100,
      };

      const partialData: NutritionInfo = {
        calories: 100,
        protein: 10,
        carbs: 15,
        fat: 5,
        fiber: 2,
      };

      const fullResult = calculateNutritionScore(fullData);
      const partialResult = calculateNutritionScore(partialData);

      expect(partialResult.score).toBeLessThan(fullResult.score);
    });

    it("should clamp score between 0 and 100", () => {
      const lowNutrition: NutritionInfo = {
        calories: 100,
        protein: 1,
        carbs: 1,
        fat: 80,
        fiber: 0.1,
        sugar: 50,
        sodium: 1000,
      };
      const lowResult = calculateNutritionScore(lowNutrition);

      expect(lowResult.score).toBeGreaterThanOrEqual(0);
      expect(lowResult.score).toBeLessThanOrEqual(100);

      const highNutrition: NutritionInfo = {
        calories: 100,
        protein: 30,
        carbs: 30,
        fat: 30,
        fiber: 5,
        sugar: 1,
        sodium: 20,
      };
      const highResult = calculateNutritionScore(highNutrition);

      expect(highResult.score).toBeGreaterThanOrEqual(0);
      expect(highResult.score).toBeLessThanOrEqual(100);
    });

    it("should correctly calculate score for high protein food", () => {
      const nutrition: NutritionInfo = {
        calories: 200,
        protein: 30,
        carbs: 10,
        fat: 5,
        fiber: 2,
        sugar: 2,
        sodium: 100,
      };
      const result = calculateNutritionScore(nutrition);

      expect(result.grade).toBe("B");
      expect(result.score).toBeGreaterThanOrEqual(65);
    });

    it("should penalize high sodium content", () => {
      const lowSodium: NutritionInfo = {
        calories: 100,
        protein: 10,
        carbs: 15,
        fat: 5,
        fiber: 2,
        sugar: 3,
        sodium: 30,
      };

      const highSodium: NutritionInfo = {
        calories: 100,
        protein: 10,
        carbs: 15,
        fat: 5,
        fiber: 2,
        sugar: 3,
        sodium: 400,
      };

      const lowResult = calculateNutritionScore(lowSodium);
      const highResult = calculateNutritionScore(highSodium);

      expect(lowResult.score).toBeGreaterThan(highResult.score);
    });

    it("should handle null and undefined optional fields correctly", () => {
      const nutrition: NutritionInfo = {
        calories: 100,
        protein: 10,
        carbs: 15,
        fat: 5,
        fiber: undefined,
        sugar: null as unknown as number,
        sodium: undefined,
      };
      const result = calculateNutritionScore(nutrition);

      expect(result.completenessLevel).toBe("minimal");
      expect(result.grade).toBe("?");
    });

    it("should assign correct colors to each grade", () => {
      const testCases = [
        { grade: "A" as const, color: "#2ECC71" },
        { grade: "B" as const, color: "#82C341" },
        { grade: "C" as const, color: "#F39C12" },
        { grade: "D" as const, color: "#E67E22" },
        { grade: "E" as const, color: "#E74C3C" },
      ];

      for (const testCase of testCases) {
        const nutrition: NutritionInfo = {
          calories: 100,
          protein: testCase.grade === "A" ? 30 : 5,
          carbs: 15,
          fat: 5,
          fiber: testCase.grade === "A" ? 5 : 1,
          sugar: testCase.grade === "A" ? 1 : 25,
          sodium: 100,
        };
        const result = calculateNutritionScore(nutrition);

        if (result.grade === testCase.grade) {
          expect(result.color).toBe(testCase.color);
        }
      }
    });

    it("should calculate fiber bonus correctly", () => {
      const lowFiber: NutritionInfo = {
        calories: 100,
        protein: 10,
        carbs: 15,
        fat: 5,
        fiber: 0.3,
        sugar: 3,
        sodium: 100,
      };

      const highFiber: NutritionInfo = {
        calories: 100,
        protein: 10,
        carbs: 15,
        fat: 5,
        fiber: 4,
        sugar: 3,
        sodium: 100,
      };

      const lowResult = calculateNutritionScore(lowFiber);
      const highResult = calculateNutritionScore(highFiber);

      expect(highResult.score).toBeGreaterThan(lowResult.score);
    });
  });

  describe("getScoreDescription", () => {
    it("should return correct description for grade A", () => {
      const result = {
        score: 85,
        grade: "A" as const,
        label: "Excellent",
        color: "#2ECC71",
        isIncomplete: false,
        completenessLevel: "full" as const,
      };
      const description = getScoreDescription(result);

      expect(description).toBe("High protein, low sugar, nutrient-dense");
    });

    it("should return correct description for grade B", () => {
      const result = {
        score: 70,
        grade: "B" as const,
        label: "Good",
        color: "#82C341",
        isIncomplete: false,
        completenessLevel: "full" as const,
      };
      const description = getScoreDescription(result);

      expect(description).toBe("Good nutritional balance");
    });

    it("should return correct description for grade C", () => {
      const result = {
        score: 55,
        grade: "C" as const,
        label: "Fair",
        color: "#F39C12",
        isIncomplete: false,
        completenessLevel: "full" as const,
      };
      const description = getScoreDescription(result);

      expect(description).toBe("Moderate nutritional value");
    });

    it("should return correct description for grade D", () => {
      const result = {
        score: 40,
        grade: "D" as const,
        label: "Poor",
        color: "#E67E22",
        isIncomplete: false,
        completenessLevel: "full" as const,
      };
      const description = getScoreDescription(result);

      expect(description).toBe("Consider healthier alternatives");
    });

    it("should return correct description for grade E", () => {
      const result = {
        score: 20,
        grade: "E" as const,
        label: "Low",
        color: "#E74C3C",
        isIncomplete: false,
        completenessLevel: "full" as const,
      };
      const description = getScoreDescription(result);

      expect(description).toBe("Limit consumption");
    });

    it("should return incomplete message for grade '?'", () => {
      const result = {
        score: 0,
        grade: "?" as const,
        label: "Incomplete",
        color: "#495057",
        isIncomplete: true,
        completenessLevel: "minimal" as const,
      };
      const description = getScoreDescription(result);

      expect(description).toBe("Not enough nutrition data to calculate score");
    });

    it("should return grade-specific message for incomplete data with non-question grade", () => {
      const result = {
        score: 45,
        grade: "C" as const,
        label: "Fair",
        color: "#F39C12",
        isIncomplete: true,
        completenessLevel: "partial" as const,
      };
      const description = getScoreDescription(result);

      expect(description).toBe("Moderate nutritional value");
    });
  });

  describe("integration tests", () => {
    it("should calculate score and get description for apple", () => {
      const apple: NutritionInfo = {
        calories: 95,
        protein: 0.5,
        carbs: 25,
        fat: 0.3,
        fiber: 4.4,
        sugar: 19,
        sodium: 2,
      };

      const result = calculateNutritionScore(apple);
      const description = getScoreDescription(result);

      expect(result.grade).not.toBe("?");
      expect(result.completenessLevel).toBe("full");
      expect(description).toBeTruthy();
      expect(result.isIncomplete).toBe(false);
    });

    it("should calculate score and get description for processed food", () => {
      const processedFood: NutritionInfo = {
        calories: 250,
        protein: 8,
        carbs: 35,
        fat: 10,
        fiber: 0.5,
        sugar: 15,
        sodium: 400,
      };

      const result = calculateNutritionScore(processedFood);
      const description = getScoreDescription(result);

      expect(result.grade).not.toBe("?");
      expect(description).toBeTruthy();
    });

    it("should handle food with only one optional field", () => {
      const nutrition: NutritionInfo = {
        calories: 150,
        protein: 15,
        carbs: 20,
        fat: 8,
        fiber: 3,
      };

      const result = calculateNutritionScore(nutrition);

      expect(result.completenessLevel).toBe("partial");
      expect(result.isIncomplete).toBe(true);
      expect(result.grade).not.toBe("?");
      expect(result.score).toBeGreaterThan(0);
    });

    it("should calculate different scores for similar foods with different completeness", () => {
      const baselineNutrition: NutritionInfo = {
        calories: 100,
        protein: 15,
        carbs: 12,
        fat: 5,
      };

      const completeNutrition: NutritionInfo = {
        calories: 100,
        protein: 15,
        carbs: 12,
        fat: 5,
        fiber: 2,
        sugar: 2,
        sodium: 100,
      };

      const baselineResult = calculateNutritionScore(baselineNutrition);
      const completeResult = calculateNutritionScore(completeNutrition);

      expect(baselineResult.grade).toBe("?");
      expect(completeResult.grade).not.toBe("?");
    });
  });

  describe("edge cases", () => {
    it("should handle very small calorie values", () => {
      const nutrition: NutritionInfo = {
        calories: 1,
        protein: 0.5,
        carbs: 0,
        fat: 0,
        fiber: 0.1,
        sugar: 0,
        sodium: 10,
      };
      const result = calculateNutritionScore(nutrition);

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it("should handle very large calorie values", () => {
      const nutrition: NutritionInfo = {
        calories: 5000,
        protein: 500,
        carbs: 500,
        fat: 500,
        fiber: 50,
        sugar: 50,
        sodium: 2000,
      };
      const result = calculateNutritionScore(nutrition);

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it("should apply partial penalty minimum score floor of 35", () => {
      const nutrition: NutritionInfo = {
        calories: 100,
        protein: 1,
        carbs: 1,
        fat: 1,
        fiber: 0.1,
        sugar: 50,
      };
      const result = calculateNutritionScore(nutrition);

      expect(result.completenessLevel).toBe("partial");
      expect(result.score).toBeGreaterThanOrEqual(35);
    });

    it("should correctly identify macro ratios", () => {
      const balancedMacros: NutritionInfo = {
        calories: 100,
        protein: 17,
        carbs: 20,
        fat: 13,
        fiber: 2,
        sugar: 3,
        sodium: 100,
      };
      const result = calculateNutritionScore(balancedMacros);

      expect(result.score).toBeGreaterThan(50);
    });
  });
});
