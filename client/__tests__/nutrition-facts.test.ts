import {
  NutritionFacts,
  DAILY_VALUES,
  DailyValueNutrient,
  calculateDailyValuePercent,
  scaleNutrition,
  mergeNutrition,
} from "@shared/schema";

const validNutrition: NutritionFacts = {
  servingSize: "100g",
  servingsPerContainer: 2,
  calories: 200,
  totalFat: 10,
  saturatedFat: 3,
  transFat: 0,
  cholesterol: 50,
  sodium: 500,
  totalCarbohydrates: 25,
  dietaryFiber: 3,
  totalSugars: 10,
  addedSugars: 5,
  protein: 15,
  vitaminD: 2,
  calcium: 100,
  iron: 2,
  potassium: 300,
};

const minimalNutrition: NutritionFacts = {
  servingSize: "1 serving",
  calories: 150,
  totalFat: 8,
  sodium: 300,
  totalCarbohydrates: 20,
  protein: 10,
};

describe("NutritionFacts Type", () => {
  describe("Valid nutrition objects", () => {
    it("accepts full nutrition data with all fields", () => {
      expect(validNutrition.servingSize).toBe("100g");
      expect(validNutrition.calories).toBe(200);
      expect(validNutrition.totalFat).toBe(10);
      expect(validNutrition.protein).toBe(15);
      expect(validNutrition.sodium).toBe(500);
      expect(validNutrition.totalCarbohydrates).toBe(25);
    });

    it("accepts minimal nutrition with only required fields", () => {
      expect(minimalNutrition.servingSize).toBe("1 serving");
      expect(minimalNutrition.calories).toBe(150);
      expect(minimalNutrition.totalFat).toBe(8);
      expect(minimalNutrition.sodium).toBe(300);
      expect(minimalNutrition.totalCarbohydrates).toBe(20);
      expect(minimalNutrition.protein).toBe(10);
    });

    it("allows optional fields to be undefined", () => {
      expect(minimalNutrition.servingsPerContainer).toBeUndefined();
      expect(minimalNutrition.saturatedFat).toBeUndefined();
      expect(minimalNutrition.transFat).toBeUndefined();
      expect(minimalNutrition.cholesterol).toBeUndefined();
      expect(minimalNutrition.dietaryFiber).toBeUndefined();
      expect(minimalNutrition.totalSugars).toBeUndefined();
      expect(minimalNutrition.addedSugars).toBeUndefined();
      expect(minimalNutrition.vitaminD).toBeUndefined();
      expect(minimalNutrition.calcium).toBeUndefined();
      expect(minimalNutrition.iron).toBeUndefined();
      expect(minimalNutrition.potassium).toBeUndefined();
    });

    it("accepts zero values for numeric fields", () => {
      const zeroNutrition: NutritionFacts = {
        servingSize: "100g",
        calories: 0,
        totalFat: 0,
        sodium: 0,
        totalCarbohydrates: 0,
        protein: 0,
      };
      expect(zeroNutrition.calories).toBe(0);
      expect(zeroNutrition.totalFat).toBe(0);
      expect(zeroNutrition.sodium).toBe(0);
    });

    it("accepts decimal values for nutrients", () => {
      const decimalNutrition: NutritionFacts = {
        servingSize: "100g",
        calories: 125.5,
        totalFat: 5.5,
        saturatedFat: 1.2,
        sodium: 150,
        totalCarbohydrates: 15.3,
        protein: 8.7,
      };
      expect(decimalNutrition.totalFat).toBe(5.5);
      expect(decimalNutrition.saturatedFat).toBe(1.2);
      expect(decimalNutrition.totalCarbohydrates).toBe(15.3);
    });
  });

  describe("Required fields validation", () => {
    it("requires servingSize", () => {
      expect(validNutrition.servingSize).toBeDefined();
      expect(typeof validNutrition.servingSize).toBe("string");
    });

    it("requires calories", () => {
      expect(typeof validNutrition.calories).toBe("number");
    });

    it("requires totalFat", () => {
      expect(typeof validNutrition.totalFat).toBe("number");
    });

    it("requires sodium", () => {
      expect(typeof validNutrition.sodium).toBe("number");
    });

    it("requires totalCarbohydrates", () => {
      expect(typeof validNutrition.totalCarbohydrates).toBe("number");
    });

    it("requires protein", () => {
      expect(typeof validNutrition.protein).toBe("number");
    });
  });
});

describe("Daily Values", () => {
  describe("DAILY_VALUES constant", () => {
    it("has all expected nutrients defined", () => {
      expect(DAILY_VALUES.totalFat).toBe(78);
      expect(DAILY_VALUES.saturatedFat).toBe(20);
      expect(DAILY_VALUES.cholesterol).toBe(300);
      expect(DAILY_VALUES.sodium).toBe(2300);
      expect(DAILY_VALUES.totalCarbohydrates).toBe(275);
      expect(DAILY_VALUES.dietaryFiber).toBe(28);
      expect(DAILY_VALUES.addedSugars).toBe(50);
      expect(DAILY_VALUES.protein).toBe(50);
      expect(DAILY_VALUES.vitaminD).toBe(20);
      expect(DAILY_VALUES.calcium).toBe(1300);
      expect(DAILY_VALUES.iron).toBe(18);
      expect(DAILY_VALUES.potassium).toBe(4700);
    });

    it("all values are positive numbers", () => {
      for (const [nutrient, value] of Object.entries(DAILY_VALUES)) {
        expect(typeof value).toBe("number");
        expect(value).toBeGreaterThanOrEqual(0);
      }
    });

    it("transFat has no daily value (0)", () => {
      expect(DAILY_VALUES.transFat).toBe(0);
    });

    it("totalSugars has no daily value (0)", () => {
      expect(DAILY_VALUES.totalSugars).toBe(0);
    });
  });
});

describe("calculateDailyValuePercent", () => {
  describe("Standard calculations", () => {
    it("calculates correct percentage for totalFat", () => {
      expect(calculateDailyValuePercent(39, "totalFat")).toBe(50);
      expect(calculateDailyValuePercent(78, "totalFat")).toBe(100);
      expect(calculateDailyValuePercent(156, "totalFat")).toBe(200);
    });

    it("calculates correct percentage for sodium", () => {
      expect(calculateDailyValuePercent(1150, "sodium")).toBe(50);
      expect(calculateDailyValuePercent(2300, "sodium")).toBe(100);
      expect(calculateDailyValuePercent(460, "sodium")).toBe(20);
    });

    it("calculates correct percentage for protein", () => {
      expect(calculateDailyValuePercent(25, "protein")).toBe(50);
      expect(calculateDailyValuePercent(50, "protein")).toBe(100);
      expect(calculateDailyValuePercent(10, "protein")).toBe(20);
    });

    it("calculates correct percentage for dietaryFiber", () => {
      expect(calculateDailyValuePercent(14, "dietaryFiber")).toBe(50);
      expect(calculateDailyValuePercent(28, "dietaryFiber")).toBe(100);
      expect(calculateDailyValuePercent(7, "dietaryFiber")).toBe(25);
    });

    it("calculates correct percentage for calcium", () => {
      expect(calculateDailyValuePercent(650, "calcium")).toBe(50);
      expect(calculateDailyValuePercent(1300, "calcium")).toBe(100);
    });
  });

  describe("Edge cases", () => {
    it("returns 0 for zero value", () => {
      expect(calculateDailyValuePercent(0, "totalFat")).toBe(0);
      expect(calculateDailyValuePercent(0, "sodium")).toBe(0);
      expect(calculateDailyValuePercent(0, "protein")).toBe(0);
    });

    it("returns 0 for undefined value", () => {
      expect(calculateDailyValuePercent(undefined, "totalFat")).toBe(0);
      expect(calculateDailyValuePercent(undefined, "sodium")).toBe(0);
    });

    it("returns 0 when daily value is 0", () => {
      expect(calculateDailyValuePercent(10, "transFat")).toBe(0);
      expect(calculateDailyValuePercent(10, "totalSugars")).toBe(0);
    });

    it("rounds to nearest integer", () => {
      expect(calculateDailyValuePercent(7, "protein")).toBe(14);
      expect(calculateDailyValuePercent(12, "protein")).toBe(24);
      expect(calculateDailyValuePercent(13, "protein")).toBe(26);
    });

    it("handles very small values", () => {
      expect(calculateDailyValuePercent(0.1, "protein")).toBe(0);
      expect(calculateDailyValuePercent(0.5, "protein")).toBe(1);
    });

    it("handles large values exceeding 100%", () => {
      expect(calculateDailyValuePercent(150, "protein")).toBe(300);
      expect(calculateDailyValuePercent(4600, "sodium")).toBe(200);
    });
  });
});

describe("scaleNutrition", () => {
  describe("Scaling by quantity", () => {
    it("doubles all values when multiplier is 2", () => {
      const scaled = scaleNutrition(validNutrition, 2);
      expect(scaled.calories).toBe(400);
      expect(scaled.totalFat).toBe(20);
      expect(scaled.protein).toBe(30);
      expect(scaled.sodium).toBe(1000);
      expect(scaled.totalCarbohydrates).toBe(50);
    });

    it("halves all values when multiplier is 0.5", () => {
      const scaled = scaleNutrition(validNutrition, 0.5);
      expect(scaled.calories).toBe(100);
      expect(scaled.totalFat).toBe(5);
      expect(scaled.protein).toBe(7.5);
      expect(scaled.sodium).toBe(250);
    });

    it("returns same values when multiplier is 1", () => {
      const scaled = scaleNutrition(validNutrition, 1);
      expect(scaled.calories).toBe(validNutrition.calories);
      expect(scaled.totalFat).toBe(validNutrition.totalFat);
      expect(scaled.protein).toBe(validNutrition.protein);
    });

    it("returns zero values when multiplier is 0", () => {
      const scaled = scaleNutrition(validNutrition, 0);
      expect(scaled.calories).toBe(0);
      expect(scaled.totalFat).toBe(0);
      expect(scaled.protein).toBe(0);
    });
  });

  describe("Optional field handling", () => {
    it("preserves undefined optional fields", () => {
      const scaled = scaleNutrition(minimalNutrition, 2);
      expect(scaled.saturatedFat).toBeUndefined();
      expect(scaled.transFat).toBeUndefined();
      expect(scaled.cholesterol).toBeUndefined();
      expect(scaled.dietaryFiber).toBeUndefined();
      expect(scaled.vitaminD).toBeUndefined();
    });

    it("scales optional fields when defined", () => {
      const scaled = scaleNutrition(validNutrition, 2);
      expect(scaled.saturatedFat).toBe(6);
      expect(scaled.cholesterol).toBe(100);
      expect(scaled.dietaryFiber).toBe(6);
      expect(scaled.vitaminD).toBe(4);
      expect(scaled.calcium).toBe(200);
    });
  });

  describe("Rounding behavior", () => {
    it("rounds calories to whole numbers", () => {
      const nutrition: NutritionFacts = {
        servingSize: "100g",
        calories: 100,
        totalFat: 5,
        sodium: 200,
        totalCarbohydrates: 10,
        protein: 5,
      };
      const scaled = scaleNutrition(nutrition, 1.5);
      expect(scaled.calories).toBe(150);
    });

    it("rounds fat-based nutrients to one decimal", () => {
      const nutrition: NutritionFacts = {
        servingSize: "100g",
        calories: 100,
        totalFat: 5.3,
        saturatedFat: 2.1,
        sodium: 200,
        totalCarbohydrates: 10,
        protein: 5,
      };
      const scaled = scaleNutrition(nutrition, 1.5);
      expect(scaled.totalFat).toBe(8);
      expect(scaled.saturatedFat).toBe(3.2);
    });

    it("rounds sodium to whole numbers", () => {
      const scaled = scaleNutrition(validNutrition, 1.3);
      expect(Number.isInteger(scaled.sodium)).toBe(true);
    });

    it("rounds cholesterol to whole numbers", () => {
      const scaled = scaleNutrition(validNutrition, 1.3);
      expect(Number.isInteger(scaled.cholesterol as number)).toBe(true);
    });
  });

  describe("Metadata preservation", () => {
    it("preserves servingSize", () => {
      const scaled = scaleNutrition(validNutrition, 2);
      expect(scaled.servingSize).toBe(validNutrition.servingSize);
    });

    it("preserves servingsPerContainer", () => {
      const scaled = scaleNutrition(validNutrition, 2);
      expect(scaled.servingsPerContainer).toBe(
        validNutrition.servingsPerContainer,
      );
    });
  });
});

describe("mergeNutrition", () => {
  describe("Combining multiple items", () => {
    it("sums calories from multiple items", () => {
      const items: NutritionFacts[] = [
        { ...minimalNutrition, calories: 100 },
        { ...minimalNutrition, calories: 150 },
        { ...minimalNutrition, calories: 200 },
      ];
      const merged = mergeNutrition(items);
      expect(merged.calories).toBe(450);
    });

    it("sums all required nutrients", () => {
      const items: NutritionFacts[] = [
        {
          ...minimalNutrition,
          totalFat: 5,
          protein: 10,
          sodium: 100,
          totalCarbohydrates: 20,
        },
        {
          ...minimalNutrition,
          totalFat: 8,
          protein: 15,
          sodium: 200,
          totalCarbohydrates: 30,
        },
      ];
      const merged = mergeNutrition(items);
      expect(merged.totalFat).toBe(13);
      expect(merged.protein).toBe(25);
      expect(merged.sodium).toBe(300);
      expect(merged.totalCarbohydrates).toBe(50);
    });

    it("handles optional fields that are undefined in some items", () => {
      const items: NutritionFacts[] = [
        { ...minimalNutrition, dietaryFiber: 5 },
        { ...minimalNutrition },
      ];
      const merged = mergeNutrition(items);
      expect(merged.dietaryFiber).toBe(5);
    });

    it("sums optional fields when defined in multiple items", () => {
      const items: NutritionFacts[] = [
        { ...minimalNutrition, dietaryFiber: 5, vitaminD: 2 },
        { ...minimalNutrition, dietaryFiber: 3, vitaminD: 3 },
      ];
      const merged = mergeNutrition(items);
      expect(merged.dietaryFiber).toBe(8);
      expect(merged.vitaminD).toBe(5);
    });
  });

  describe("Edge cases", () => {
    it("returns zero values for empty array", () => {
      const merged = mergeNutrition([]);
      expect(merged.calories).toBe(0);
      expect(merged.totalFat).toBe(0);
      expect(merged.protein).toBe(0);
      expect(merged.sodium).toBe(0);
      expect(merged.totalCarbohydrates).toBe(0);
      expect(merged.servingSize).toBe("Combined");
    });

    it("returns same values for single item", () => {
      const merged = mergeNutrition([minimalNutrition]);
      expect(merged.calories).toBe(minimalNutrition.calories);
      expect(merged.totalFat).toBe(minimalNutrition.totalFat);
    });

    it("handles all optional fields being undefined", () => {
      const items: NutritionFacts[] = [minimalNutrition, minimalNutrition];
      const merged = mergeNutrition(items);
      expect(merged.saturatedFat).toBeUndefined();
      expect(merged.transFat).toBeUndefined();
      expect(merged.cholesterol).toBeUndefined();
      expect(merged.dietaryFiber).toBeUndefined();
    });
  });

  describe("Serving size formatting", () => {
    it("creates combined serving size label", () => {
      const items = [minimalNutrition, minimalNutrition, minimalNutrition];
      const merged = mergeNutrition(items);
      expect(merged.servingSize).toBe("3 items combined");
    });

    it("sets servingsPerContainer to undefined for merged items", () => {
      const items = [validNutrition, validNutrition];
      const merged = mergeNutrition(items);
      expect(merged.servingsPerContainer).toBeUndefined();
    });
  });
});
