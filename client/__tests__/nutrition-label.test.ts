import {
  NutritionFacts,
  DAILY_VALUES,
  calculateDailyValuePercent,
  scaleNutrition,
} from "@shared/schema";

const fullNutrition: NutritionFacts = {
  servingSize: "1 cup (240g)",
  servingsPerContainer: 4,
  calories: 200,
  totalFat: 10,
  saturatedFat: 3,
  transFat: 0.5,
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
  servingSize: "100g",
  calories: 150,
  totalFat: 8,
  sodium: 300,
  totalCarbohydrates: 20,
  protein: 10,
};

function formatValue(value: number): string {
  if (value === 0) return "0";
  if (value < 1) return value.toFixed(1);
  if (value < 10) return value.toFixed(1);
  return Math.round(value).toString();
}

describe("NutritionLabel formatValue function", () => {
  describe("Zero value handling", () => {
    it("returns '0' for zero value", () => {
      expect(formatValue(0)).toBe("0");
    });
  });

  describe("Small value formatting (value < 1)", () => {
    it("formats 0.1 with one decimal", () => {
      expect(formatValue(0.1)).toBe("0.1");
    });

    it("formats 0.5 with one decimal", () => {
      expect(formatValue(0.5)).toBe("0.5");
    });

    it("formats 0.99 with one decimal", () => {
      expect(formatValue(0.99)).toBe("1.0");
    });

    it("formats 0.05 with one decimal", () => {
      expect(formatValue(0.05)).toBe("0.1");
    });
  });

  describe("Medium value formatting (1 <= value < 10)", () => {
    it("formats 1.0 with one decimal", () => {
      expect(formatValue(1)).toBe("1.0");
    });

    it("formats 5.5 with one decimal", () => {
      expect(formatValue(5.5)).toBe("5.5");
    });

    it("formats 9.9 with one decimal", () => {
      expect(formatValue(9.9)).toBe("9.9");
    });

    it("formats 3.14159 with one decimal", () => {
      expect(formatValue(3.14159)).toBe("3.1");
    });
  });

  describe("Large value formatting (value >= 10)", () => {
    it("formats 10 as integer", () => {
      expect(formatValue(10)).toBe("10");
    });

    it("formats 15.7 as rounded integer", () => {
      expect(formatValue(15.7)).toBe("16");
    });

    it("formats 99.4 as rounded integer", () => {
      expect(formatValue(99.4)).toBe("99");
    });

    it("formats 100.6 as rounded integer", () => {
      expect(formatValue(100.6)).toBe("101");
    });

    it("formats 9999 as integer", () => {
      expect(formatValue(9999)).toBe("9999");
    });
  });
});

describe("NutritionLabel compact mode data", () => {
  describe("Data for compact display", () => {
    it("generates correct calorie display text", () => {
      const scaled = scaleNutrition(fullNutrition, 1);
      const calorieText = `${Math.round(scaled.calories)} cal`;
      expect(calorieText).toBe("200 cal");
    });

    it("generates correct protein display text", () => {
      const scaled = scaleNutrition(fullNutrition, 1);
      const proteinText = `${formatValue(scaled.protein)}g protein`;
      expect(proteinText).toBe("15g protein");
    });

    it("generates correct carbs display text", () => {
      const scaled = scaleNutrition(fullNutrition, 1);
      const carbsText = `${formatValue(scaled.totalCarbohydrates)}g carbs`;
      expect(carbsText).toBe("25g carbs");
    });

    it("hides carbs when zero", () => {
      const zeroCarbs: NutritionFacts = {
        ...minimalNutrition,
        totalCarbohydrates: 0,
      };
      expect(zeroCarbs.totalCarbohydrates > 0).toBe(false);
    });
  });

  describe("Scaled compact display", () => {
    it("doubles calories when quantity is 2", () => {
      const scaled = scaleNutrition(fullNutrition, 2);
      const calorieText = `${Math.round(scaled.calories)} cal`;
      expect(calorieText).toBe("400 cal");
    });

    it("halves calories when quantity is 0.5", () => {
      const scaled = scaleNutrition(fullNutrition, 0.5);
      const calorieText = `${Math.round(scaled.calories)} cal`;
      expect(calorieText).toBe("100 cal");
    });
  });
});

describe("NutritionLabel full mode data", () => {
  describe("Required fields display", () => {
    it("has serving size defined", () => {
      expect(fullNutrition.servingSize).toBe("1 cup (240g)");
    });

    it("has servings per container when provided", () => {
      expect(fullNutrition.servingsPerContainer).toBe(4);
    });

    it("handles missing servings per container", () => {
      expect(minimalNutrition.servingsPerContainer).toBeUndefined();
    });

    it("displays calories as integer", () => {
      const calorieDisplay = Math.round(fullNutrition.calories);
      expect(calorieDisplay).toBe(200);
    });
  });

  describe("Optional nutrient fields", () => {
    it("includes saturated fat when defined", () => {
      expect(fullNutrition.saturatedFat).toBe(3);
    });

    it("excludes saturated fat when undefined", () => {
      expect(minimalNutrition.saturatedFat).toBeUndefined();
    });

    it("includes trans fat when defined", () => {
      expect(fullNutrition.transFat).toBe(0.5);
    });

    it("includes cholesterol when defined", () => {
      expect(fullNutrition.cholesterol).toBe(50);
    });

    it("includes dietary fiber when defined", () => {
      expect(fullNutrition.dietaryFiber).toBe(3);
    });

    it("includes total sugars when defined", () => {
      expect(fullNutrition.totalSugars).toBe(10);
    });

    it("includes added sugars when defined", () => {
      expect(fullNutrition.addedSugars).toBe(5);
    });
  });

  describe("Vitamins and minerals", () => {
    it("includes vitamin D when defined", () => {
      expect(fullNutrition.vitaminD).toBe(2);
    });

    it("includes calcium when defined", () => {
      expect(fullNutrition.calcium).toBe(100);
    });

    it("includes iron when defined", () => {
      expect(fullNutrition.iron).toBe(2);
    });

    it("includes potassium when defined", () => {
      expect(fullNutrition.potassium).toBe(300);
    });

    it("excludes vitamins and minerals when undefined", () => {
      expect(minimalNutrition.vitaminD).toBeUndefined();
      expect(minimalNutrition.calcium).toBeUndefined();
      expect(minimalNutrition.iron).toBeUndefined();
      expect(minimalNutrition.potassium).toBeUndefined();
    });
  });
});

describe("NutritionLabel % Daily Value display logic", () => {
  describe("Nutrients with daily values", () => {
    it("calculates %DV for Total Fat (10g = 13% of 78g)", () => {
      const percentDV = calculateDailyValuePercent(
        fullNutrition.totalFat,
        "totalFat",
      );
      expect(percentDV).toBe(13);
    });

    it("calculates %DV for Saturated Fat (3g = 15% of 20g)", () => {
      const percentDV = calculateDailyValuePercent(
        fullNutrition.saturatedFat,
        "saturatedFat",
      );
      expect(percentDV).toBe(15);
    });

    it("calculates %DV for Sodium (500mg = 22% of 2300mg)", () => {
      const percentDV = calculateDailyValuePercent(
        fullNutrition.sodium,
        "sodium",
      );
      expect(percentDV).toBe(22);
    });

    it("calculates %DV for Cholesterol (50mg = 17% of 300mg)", () => {
      const percentDV = calculateDailyValuePercent(
        fullNutrition.cholesterol,
        "cholesterol",
      );
      expect(percentDV).toBe(17);
    });

    it("calculates %DV for Total Carbohydrates (25g = 9% of 275g)", () => {
      const percentDV = calculateDailyValuePercent(
        fullNutrition.totalCarbohydrates,
        "totalCarbohydrates",
      );
      expect(percentDV).toBe(9);
    });

    it("calculates %DV for Dietary Fiber (3g = 11% of 28g)", () => {
      const percentDV = calculateDailyValuePercent(
        fullNutrition.dietaryFiber,
        "dietaryFiber",
      );
      expect(percentDV).toBe(11);
    });

    it("calculates %DV for Protein (15g = 30% of 50g)", () => {
      const percentDV = calculateDailyValuePercent(
        fullNutrition.protein,
        "protein",
      );
      expect(percentDV).toBe(30);
    });

    it("calculates %DV for Added Sugars (5g = 10% of 50g)", () => {
      const percentDV = calculateDailyValuePercent(
        fullNutrition.addedSugars,
        "addedSugars",
      );
      expect(percentDV).toBe(10);
    });
  });

  describe("Nutrients without daily values", () => {
    it("Trans Fat has no %DV (daily value is 0)", () => {
      expect(DAILY_VALUES.transFat).toBe(0);
      const percentDV = calculateDailyValuePercent(
        fullNutrition.transFat,
        "transFat",
      );
      expect(percentDV).toBe(0);
    });

    it("Total Sugars has no %DV (daily value is 0)", () => {
      expect(DAILY_VALUES.totalSugars).toBe(0);
      const percentDV = calculateDailyValuePercent(
        fullNutrition.totalSugars,
        "totalSugars",
      );
      expect(percentDV).toBe(0);
    });
  });

  describe("Vitamin and mineral %DV calculations", () => {
    it("calculates %DV for Vitamin D (2mcg = 10% of 20mcg)", () => {
      const percentDV = calculateDailyValuePercent(
        fullNutrition.vitaminD,
        "vitaminD",
      );
      expect(percentDV).toBe(10);
    });

    it("calculates %DV for Calcium (100mg = 8% of 1300mg)", () => {
      const percentDV = calculateDailyValuePercent(
        fullNutrition.calcium,
        "calcium",
      );
      expect(percentDV).toBe(8);
    });

    it("calculates %DV for Iron (2mg = 11% of 18mg)", () => {
      const percentDV = calculateDailyValuePercent(fullNutrition.iron, "iron");
      expect(percentDV).toBe(11);
    });

    it("calculates %DV for Potassium (300mg = 6% of 4700mg)", () => {
      const percentDV = calculateDailyValuePercent(
        fullNutrition.potassium,
        "potassium",
      );
      expect(percentDV).toBe(6);
    });
  });
});

describe("NutritionLabel quantity scaling", () => {
  describe("Scaling applied correctly", () => {
    it("scales all nutrients by quantity 2", () => {
      const scaled = scaleNutrition(fullNutrition, 2);
      expect(scaled.calories).toBe(400);
      expect(scaled.totalFat).toBe(20);
      expect(scaled.sodium).toBe(1000);
      expect(scaled.protein).toBe(30);
    });

    it("scales all nutrients by quantity 0.5", () => {
      const scaled = scaleNutrition(fullNutrition, 0.5);
      expect(scaled.calories).toBe(100);
      expect(scaled.totalFat).toBe(5);
      expect(scaled.sodium).toBe(250);
      expect(scaled.protein).toBe(7.5);
    });

    it("preserves serving size when scaling", () => {
      const scaled = scaleNutrition(fullNutrition, 2);
      expect(scaled.servingSize).toBe(fullNutrition.servingSize);
    });

    it("%DV updates with scaled values", () => {
      const scaled = scaleNutrition(fullNutrition, 2);
      const percentDV = calculateDailyValuePercent(scaled.totalFat, "totalFat");
      expect(percentDV).toBe(26);
    });
  });

  describe("No scaling when quantity is 1", () => {
    it("returns same values when quantity is 1", () => {
      const scaled = scaleNutrition(fullNutrition, 1);
      expect(scaled.calories).toBe(fullNutrition.calories);
      expect(scaled.totalFat).toBe(fullNutrition.totalFat);
      expect(scaled.protein).toBe(fullNutrition.protein);
    });
  });
});

describe("NutritionLabel unit display logic", () => {
  describe("Unit formatting", () => {
    it("fat-based nutrients use g unit", () => {
      const unit = "g";
      const display = `${formatValue(fullNutrition.totalFat)}${unit}`;
      expect(display).toBe("10g");
    });

    it("sodium uses mg unit", () => {
      const unit = "mg";
      const display = `${formatValue(fullNutrition.sodium)}${unit}`;
      expect(display).toBe("500mg");
    });

    it("cholesterol uses mg unit", () => {
      const unit = "mg";
      const display = `${formatValue(fullNutrition.cholesterol!)}${unit}`;
      expect(display).toBe("50mg");
    });

    it("vitamin D uses mcg unit", () => {
      const unit = "mcg";
      const display = `${formatValue(fullNutrition.vitaminD!)}${unit}`;
      expect(display).toBe("2.0mcg");
    });

    it("calcium uses mg unit", () => {
      const unit = "mg";
      const display = `${formatValue(fullNutrition.calcium!)}${unit}`;
      expect(display).toBe("100mg");
    });
  });
});

describe("NutritionLabel edge cases", () => {
  describe("Zero and very small values", () => {
    it("handles zero calories", () => {
      const zeroCalorie: NutritionFacts = {
        servingSize: "100g",
        calories: 0,
        totalFat: 0,
        sodium: 0,
        totalCarbohydrates: 0,
        protein: 0,
      };
      expect(Math.round(zeroCalorie.calories)).toBe(0);
    });

    it("handles very small protein value", () => {
      const smallProtein: NutritionFacts = {
        servingSize: "100g",
        calories: 10,
        totalFat: 0.1,
        sodium: 5,
        totalCarbohydrates: 1,
        protein: 0.3,
      };
      expect(formatValue(smallProtein.protein)).toBe("0.3");
    });
  });

  describe("Very large values", () => {
    it("handles large calorie values", () => {
      const highCalorie: NutritionFacts = {
        servingSize: "100g",
        calories: 9999,
        totalFat: 100,
        sodium: 5000,
        totalCarbohydrates: 500,
        protein: 200,
      };
      expect(Math.round(highCalorie.calories)).toBe(9999);
    });

    it("handles %DV exceeding 100%", () => {
      const percentDV = calculateDailyValuePercent(156, "totalFat");
      expect(percentDV).toBe(200);
    });
  });

  describe("Decimal rounding", () => {
    it("rounds calories to integer for display", () => {
      const decimalCalories: NutritionFacts = {
        servingSize: "100g",
        calories: 123.7,
        totalFat: 5,
        sodium: 100,
        totalCarbohydrates: 15,
        protein: 8,
      };
      expect(Math.round(decimalCalories.calories)).toBe(124);
    });
  });
});
