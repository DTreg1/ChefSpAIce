/**
 * @jest-environment node
 *
 * Tests for ImageAnalysisResult component utility functions
 * Tests the actual exported functions from client/lib/image-analysis-utils.ts
 */

/// <reference types="jest" />

import {
  getConfidenceColor,
  getConfidenceLabel,
  getConfidenceIcon,
  shouldShowLowConfidenceWarning,
  toggleItemInSet,
  selectAllItems,
  deselectAllItems,
  getSelectedItems,
  updateItemInArray,
  getBatchButtonText,
  shouldShowEmptyState,
  isSingleItemSelected,
  mapStorageLocation,
  calculateExpirationDate,
  normalizeCategory,
  formatCategoryDisplay,
  formatStorageLocationDisplay,
  CATEGORIES,
  STORAGE_LOCATIONS,
  QUANTITY_UNITS,
  type IdentifiedFood,
  type AnalysisResult,
} from "../lib/image-analysis-utils";

describe("ImageAnalysisResult - Confidence Helpers", () => {
  describe("getConfidenceColor", () => {
    it("should return green color for high confidence (>= 0.8)", () => {
      expect(getConfidenceColor(0.8)).toContain("22c55e");
      expect(getConfidenceColor(0.9)).toContain("22c55e");
      expect(getConfidenceColor(1.0)).toContain("22c55e");
    });

    it("should return amber color for medium confidence (0.5 - 0.79)", () => {
      expect(getConfidenceColor(0.5)).toContain("eab308");
      expect(getConfidenceColor(0.65)).toContain("eab308");
      expect(getConfidenceColor(0.79)).toContain("eab308");
    });

    it("should return orange color for low confidence (< 0.5)", () => {
      expect(getConfidenceColor(0.49)).toContain("f97316");
      expect(getConfidenceColor(0.3)).toContain("f97316");
      expect(getConfidenceColor(0.1)).toContain("f97316");
    });
  });

  describe("getConfidenceLabel", () => {
    it("should return 'High' for >= 0.8", () => {
      expect(getConfidenceLabel(0.8)).toBe("High");
      expect(getConfidenceLabel(0.95)).toBe("High");
    });

    it("should return 'Medium' for 0.5 - 0.79", () => {
      expect(getConfidenceLabel(0.5)).toBe("Medium");
      expect(getConfidenceLabel(0.7)).toBe("Medium");
    });

    it("should return 'Low' for < 0.5", () => {
      expect(getConfidenceLabel(0.49)).toBe("Low");
      expect(getConfidenceLabel(0.2)).toBe("Low");
    });
  });

  describe("getConfidenceIcon", () => {
    it("should return check-circle for high confidence", () => {
      expect(getConfidenceIcon(0.8)).toBe("check-circle");
      expect(getConfidenceIcon(0.95)).toBe("check-circle");
    });

    it("should return alert-triangle for medium confidence", () => {
      expect(getConfidenceIcon(0.5)).toBe("alert-triangle");
      expect(getConfidenceIcon(0.7)).toBe("alert-triangle");
    });

    it("should return alert-circle for low confidence", () => {
      expect(getConfidenceIcon(0.49)).toBe("alert-circle");
      expect(getConfidenceIcon(0.2)).toBe("alert-circle");
    });
  });

  describe("shouldShowLowConfidenceWarning", () => {
    it("should return true for confidence < 0.5", () => {
      expect(shouldShowLowConfidenceWarning(0.3)).toBe(true);
      expect(shouldShowLowConfidenceWarning(0.49)).toBe(true);
    });

    it("should return false for confidence >= 0.5", () => {
      expect(shouldShowLowConfidenceWarning(0.5)).toBe(false);
      expect(shouldShowLowConfidenceWarning(0.9)).toBe(false);
    });
  });
});

describe("ImageAnalysisResult - Item Selection", () => {
  describe("toggleItemInSet", () => {
    it("should remove item if already selected", () => {
      const selectedItems = new Set([0, 1, 2]);
      const result = toggleItemInSet(1, selectedItems);
      expect(result.has(1)).toBe(false);
      expect(result.has(0)).toBe(true);
      expect(result.has(2)).toBe(true);
    });

    it("should add item if not selected", () => {
      const selectedItems = new Set([0, 2]);
      const result = toggleItemInSet(1, selectedItems);
      expect(result.has(1)).toBe(true);
    });

    it("should not mutate original set", () => {
      const original = new Set([0, 1]);
      toggleItemInSet(1, original);
      expect(original.has(1)).toBe(true);
    });
  });

  describe("selectAllItems", () => {
    it("should select all items by index", () => {
      const result = selectAllItems(3);
      expect(result.size).toBe(3);
      expect(result.has(0)).toBe(true);
      expect(result.has(1)).toBe(true);
      expect(result.has(2)).toBe(true);
    });

    it("should return empty set for zero items", () => {
      expect(selectAllItems(0).size).toBe(0);
    });
  });

  describe("deselectAllItems", () => {
    it("should return empty set", () => {
      expect(deselectAllItems().size).toBe(0);
    });
  });

  describe("getSelectedItems", () => {
    it("should filter items by selected indexes", () => {
      const items = [{ name: "Apple" }, { name: "Banana" }, { name: "Milk" }];
      const selected = new Set([0, 2]);
      const result = getSelectedItems(items, selected);
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("Apple");
      expect(result[1].name).toBe("Milk");
    });

    it("should return empty array when no items selected", () => {
      const items = [{ name: "Apple" }, { name: "Milk" }];
      const result = getSelectedItems(items, new Set());
      expect(result).toHaveLength(0);
    });
  });
});

describe("ImageAnalysisResult - Item Updates", () => {
  describe("updateItemInArray", () => {
    it("should update individual item fields", () => {
      const items = [
        { name: "Apple", category: "Produce", quantity: 3 },
        { name: "Milk", category: "Dairy", quantity: 1 },
      ];
      const result = updateItemInArray(items, 0, { name: "Gala Apple" });
      expect(result[0].name).toBe("Gala Apple");
      expect(result[0].category).toBe("Produce");
      expect(result[1].name).toBe("Milk");
    });

    it("should update multiple fields at once", () => {
      const items = [{ name: "Apple", category: "Produce", quantity: 3 }];
      const result = updateItemInArray(items, 0, {
        name: "Red Apple",
        quantity: 5,
      });
      expect(result[0].name).toBe("Red Apple");
      expect(result[0].quantity).toBe(5);
      expect(result[0].category).toBe("Produce");
    });

    it("should not mutate original array", () => {
      const items = [{ name: "Apple", quantity: 3 }];
      updateItemInArray(items, 0, { name: "Changed" });
      expect(items[0].name).toBe("Apple");
    });
  });
});

describe("ImageAnalysisResult - Display Logic", () => {
  describe("getBatchButtonText", () => {
    it("should format singular correctly", () => {
      expect(getBatchButtonText(1)).toBe("Add 1 Item to Inventory");
    });

    it("should format plural correctly", () => {
      expect(getBatchButtonText(3)).toBe("Add 3 Items to Inventory");
      expect(getBatchButtonText(0)).toBe("Add 0 Items to Inventory");
    });
  });

  describe("shouldShowEmptyState", () => {
    it("should return true when error exists", () => {
      const results = { items: [], error: "No food detected" };
      expect(shouldShowEmptyState(results, [])).toBe(true);
    });

    it("should return true when items array is empty", () => {
      const results = { items: [] };
      expect(shouldShowEmptyState(results, [])).toBe(true);
    });

    it("should return false when items exist and no error", () => {
      const results: AnalysisResult = {
        items: [
          {
            name: "Apple",
            category: "produce",
            quantity: 1,
            quantityUnit: "items",
            storageLocation: "refrigerator",
            shelfLifeDays: 14,
            confidence: 0.9,
          },
        ],
      };
      const itemsArray = [
        { name: "Apple" },
        { name: "Banana" },
        { name: "Orange" },
      ];
      expect(shouldShowEmptyState(results, itemsArray)).toBe(false);
    });
  });

  describe("isSingleItemSelected", () => {
    it("should return true for exactly 1 item", () => {
      expect(isSingleItemSelected(1)).toBe(true);
    });

    it("should return false for other counts", () => {
      expect(isSingleItemSelected(0)).toBe(false);
      expect(isSingleItemSelected(2)).toBe(false);
    });
  });
});

describe("FoodCameraScreen - Storage Mapping", () => {
  describe("mapStorageLocation", () => {
    it("should map refrigerator to fridge", () => {
      expect(mapStorageLocation("refrigerator")).toBe("fridge");
      expect(mapStorageLocation("Refrigerator")).toBe("fridge");
    });

    it("should map other locations correctly", () => {
      expect(mapStorageLocation("freezer")).toBe("freezer");
      expect(mapStorageLocation("pantry")).toBe("pantry");
      expect(mapStorageLocation("counter")).toBe("counter");
    });

    it("should default to fridge for unknown locations", () => {
      expect(mapStorageLocation(undefined)).toBe("fridge");
      expect(mapStorageLocation("shelf")).toBe("fridge");
      expect(mapStorageLocation("")).toBe("fridge");
    });
  });
});

describe("FoodCameraScreen - Date Calculation", () => {
  describe("calculateExpirationDate", () => {
    it("should calculate expiration date based on shelf life", () => {
      const today = new Date();
      const sevenDaysFromNow = new Date(today);
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
      const expected = sevenDaysFromNow.toISOString().split("T")[0];
      expect(calculateExpirationDate(7)).toBe(expected);
    });

    it("should handle large shelf life values", () => {
      const result = calculateExpirationDate(365);
      const today = new Date();
      const oneYearFromNow = new Date(today);
      oneYearFromNow.setDate(oneYearFromNow.getDate() + 365);
      expect(result).toBe(oneYearFromNow.toISOString().split("T")[0]);
    });
  });
});

describe("FoodCameraScreen - Category Normalization", () => {
  describe("normalizeCategory", () => {
    it("should capitalize first letter", () => {
      expect(normalizeCategory("produce")).toBe("Produce");
      expect(normalizeCategory("DAIRY")).toBe("Dairy");
      expect(normalizeCategory("meat")).toBe("Meat");
    });

    it("should return 'Other' for undefined", () => {
      expect(normalizeCategory(undefined)).toBe("Other");
    });
  });
});

describe("Constants - Aligned with Server Enums", () => {
  it("should have lowercase categories matching server schema", () => {
    expect(CATEGORIES).toContain("produce");
    expect(CATEGORIES).toContain("dairy");
    expect(CATEGORIES).toContain("meat");
    expect(CATEGORIES).toContain("bread");
    expect(CATEGORIES).toContain("other");
  });

  it("should have lowercase storage locations matching server schema", () => {
    expect(STORAGE_LOCATIONS).toContain("refrigerator");
    expect(STORAGE_LOCATIONS).toContain("freezer");
    expect(STORAGE_LOCATIONS).toContain("pantry");
    expect(STORAGE_LOCATIONS).toContain("counter");
  });

  it("should have quantity units matching server schema", () => {
    expect(QUANTITY_UNITS).toContain("items");
    expect(QUANTITY_UNITS).toContain("lbs");
    expect(QUANTITY_UNITS).toContain("oz");
    expect(QUANTITY_UNITS).toContain("bottle");
    expect(QUANTITY_UNITS).toContain("can");
  });
});

describe("Display Formatting", () => {
  describe("formatCategoryDisplay", () => {
    it("should capitalize first letter of category", () => {
      expect(formatCategoryDisplay("produce")).toBe("Produce");
      expect(formatCategoryDisplay("dairy")).toBe("Dairy");
      expect(formatCategoryDisplay("meat")).toBe("Meat");
      expect(formatCategoryDisplay("other")).toBe("Other");
    });

    it("should handle already capitalized categories", () => {
      expect(formatCategoryDisplay("Produce")).toBe("Produce");
    });
  });

  describe("formatStorageLocationDisplay", () => {
    it("should capitalize first letter of storage location", () => {
      expect(formatStorageLocationDisplay("refrigerator")).toBe("Refrigerator");
      expect(formatStorageLocationDisplay("freezer")).toBe("Freezer");
      expect(formatStorageLocationDisplay("pantry")).toBe("Pantry");
      expect(formatStorageLocationDisplay("counter")).toBe("Counter");
    });

    it("should handle already capitalized locations", () => {
      expect(formatStorageLocationDisplay("Refrigerator")).toBe("Refrigerator");
    });
  });
});

describe("Mock Scenarios", () => {
  describe("Single high-confidence item", () => {
    const results: AnalysisResult = {
      items: [
        {
          name: "Organic Bananas",
          category: "produce",
          quantity: 6,
          quantityUnit: "items",
          storageLocation: "counter",
          shelfLifeDays: 5,
          confidence: 0.95,
        },
      ],
      notes: "Fresh organic bananas",
    };

    it("should identify as single item flow", () => {
      expect(isSingleItemSelected(1)).toBe(true);
    });

    it("should show high confidence indicators", () => {
      expect(getConfidenceLabel(results.items[0].confidence)).toBe("High");
      expect(getConfidenceIcon(results.items[0].confidence)).toBe(
        "check-circle",
      );
      expect(shouldShowLowConfidenceWarning(results.items[0].confidence)).toBe(
        false,
      );
    });
  });

  describe("Multiple mixed-confidence items", () => {
    const results: AnalysisResult = {
      items: [
        {
          name: "Apple",
          category: "produce",
          quantity: 4,
          quantityUnit: "items",
          storageLocation: "refrigerator",
          shelfLifeDays: 14,
          confidence: 0.9,
        },
        {
          name: "Mystery Item",
          category: "other",
          quantity: 1,
          quantityUnit: "items",
          storageLocation: "pantry",
          shelfLifeDays: 30,
          confidence: 0.3,
        },
        {
          name: "Bread",
          category: "bread",
          quantity: 1,
          quantityUnit: "items",
          storageLocation: "counter",
          shelfLifeDays: 5,
          confidence: 0.65,
        },
      ],
    };

    it("should correctly categorize confidence levels", () => {
      expect(getConfidenceLabel(results.items[0].confidence)).toBe("High");
      expect(getConfidenceLabel(results.items[1].confidence)).toBe("Low");
      expect(getConfidenceLabel(results.items[2].confidence)).toBe("Medium");
    });

    it("should identify items needing review", () => {
      const lowConfidenceItems = results.items.filter((i) =>
        shouldShowLowConfidenceWarning(i.confidence),
      );
      expect(lowConfidenceItems).toHaveLength(1);
      expect(lowConfidenceItems[0].name).toBe("Mystery Item");
    });

    it("should format batch button correctly", () => {
      expect(getBatchButtonText(3)).toBe("Add 3 Items to Inventory");
    });
  });

  describe("No food detected scenario", () => {
    const results: AnalysisResult = {
      items: [],
      error: "No food items detected in this image",
    };

    it("should show empty state", () => {
      expect(shouldShowEmptyState(results, results.items)).toBe(true);
    });

    it("should have empty selection", () => {
      expect(selectAllItems(results.items.length).size).toBe(0);
    });
  });
});
