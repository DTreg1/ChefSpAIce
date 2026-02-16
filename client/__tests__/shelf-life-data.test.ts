import { describe, it, expect } from "vitest";
import {
  getShelfLife,
  getShelfLifeEntry,
  getValidStorageLocations,
  getItemStorageRecommendation,
  getShelfLifeForFood,
} from "./shelf-life-data";

describe("shelf-life-data", () => {
  // ==========================================
  // getShelfLife tests
  // ==========================================
  describe("getShelfLife", () => {
    it("returns correct days for known category with valid location", () => {
      expect(getShelfLife("milk", "refrigerator")).toBe(7);
    });

    it("handles 'fridge' as alias for 'refrigerator'", () => {
      expect(getShelfLife("milk", "fridge")).toBe(7);
    });

    it("returns null for unknown category", () => {
      expect(getShelfLife("unknown_food", "refrigerator")).toBeNull();
    });

    it("returns null for known category at location with 0 days", () => {
      expect(getShelfLife("milk", "pantry")).toBeNull();
    });

    it("returns null for known category at location with 0 days (counter)", () => {
      expect(getShelfLife("milk", "counter")).toBeNull();
    });

    it("handles case insensitivity for category", () => {
      expect(getShelfLife("MILK", "refrigerator")).toBe(7);
      expect(getShelfLife("Milk", "REFRIGERATOR")).toBe(7);
    });

    it("returns correct days for multiple known categories", () => {
      expect(getShelfLife("eggs", "refrigerator")).toBe(35);
      expect(getShelfLife("eggs", "freezer")).toBe(365);
      expect(getShelfLife("chicken", "refrigerator")).toBe(3);
      expect(getShelfLife("chicken", "freezer")).toBe(270);
    });

    it("returns null for invalid location", () => {
      expect(getShelfLife("milk", "invalid_location")).toBeNull();
    });

    it("returns correct days for bread in various locations", () => {
      expect(getShelfLife("bread", "refrigerator")).toBe(7);
      expect(getShelfLife("bread", "freezer")).toBe(90);
      expect(getShelfLife("bread", "pantry")).toBe(5);
      expect(getShelfLife("bread", "counter")).toBe(7);
    });
  });

  // ==========================================
  // getShelfLifeEntry tests
  // ==========================================
  describe("getShelfLifeEntry", () => {
    it("returns full entry for known category", () => {
      const entry = getShelfLifeEntry("milk");
      expect(entry).not.toBeNull();
      expect(entry?.category).toBe("milk");
      expect(entry?.refrigerator).toBe(7);
      expect(entry?.freezer).toBe(90);
      expect(entry?.pantry).toBe(0);
      expect(entry?.counter).toBe(0);
    });

    it("returns null for unknown category", () => {
      expect(getShelfLifeEntry("unknown_food")).toBeNull();
    });

    it("handles case insensitive matching", () => {
      const entry1 = getShelfLifeEntry("MILK");
      const entry2 = getShelfLifeEntry("milk");
      const entry3 = getShelfLifeEntry("Milk");

      expect(entry1).not.toBeNull();
      expect(entry2).not.toBeNull();
      expect(entry3).not.toBeNull();
      expect(entry1?.category).toBe(entry2?.category);
    });

    it("returns entry with notes when available", () => {
      const entry = getShelfLifeEntry("eggs");
      expect(entry?.notes).toBeDefined();
      expect(entry?.notes?.length).toBeGreaterThan(0);
    });

    it("returns entries for multiple known categories", () => {
      const breadEntry = getShelfLifeEntry("bread");
      const chickenEntry = getShelfLifeEntry("chicken");

      expect(breadEntry).not.toBeNull();
      expect(chickenEntry).not.toBeNull();
      expect(breadEntry?.category).toBe("bread");
      expect(chickenEntry?.category).toBe("chicken");
    });
  });

  // ==========================================
  // getValidStorageLocations tests
  // ==========================================
  describe("getValidStorageLocations", () => {
    it("returns array of valid locations for category with multiple locations", () => {
      const locations = getValidStorageLocations("bread");
      expect(locations).toContain("pantry");
      expect(locations).toContain("freezer");
      expect(locations).toContain("refrigerator");
      expect(locations).toContain("counter");
      expect(locations.length).toBe(4);
    });

    it("returns empty array for unknown category", () => {
      expect(getValidStorageLocations("unknown_food")).toEqual([]);
    });

    it("returns only valid locations for milk (refrigerator and freezer)", () => {
      const locations = getValidStorageLocations("milk");
      expect(locations).toContain("refrigerator");
      expect(locations).toContain("freezer");
      expect(locations).not.toContain("pantry");
      expect(locations).not.toContain("counter");
    });

    it("returns correct locations for eggs (only refrigerator and freezer)", () => {
      const locations = getValidStorageLocations("eggs");
      expect(locations).toContain("refrigerator");
      expect(locations).toContain("freezer");
      expect(locations).not.toContain("pantry");
      expect(locations).not.toContain("counter");
    });

    it("handles case insensitive category matching", () => {
      const locations1 = getValidStorageLocations("BREAD");
      const locations2 = getValidStorageLocations("bread");
      expect(locations1).toEqual(locations2);
    });

    it("returns locations with proper exclusion of zero-day locations", () => {
      const locations = getValidStorageLocations("milk");
      expect(locations.length).toBe(2);
      expect(locations).toEqual(["refrigerator", "freezer"]);
    });
  });

  // ==========================================
  // getItemStorageRecommendation tests
  // ==========================================
  describe("getItemStorageRecommendation", () => {
    it("returns recommendation for exact match", () => {
      const rec = getItemStorageRecommendation("milk");
      expect(rec).not.toBeNull();
      expect(rec?.locations).toContain("refrigerator");
      expect(rec?.notes).toBeDefined();
    });

    it("returns null for unknown item", () => {
      expect(getItemStorageRecommendation("unknown_item_xyz")).toBeNull();
    });

    it("performs fuzzy/partial matching on item name", () => {
      // "whole milk" should match because it includes "milk"
      const rec = getItemStorageRecommendation("whole milk");
      expect(rec).not.toBeNull();
    });

    it("returns correct locations for bread", () => {
      const rec = getItemStorageRecommendation("bread");
      expect(rec).not.toBeNull();
      expect(rec?.locations).toContain("pantry");
      expect(rec?.locations).toContain("freezer");
    });

    it("handles case insensitivity for item names", () => {
      const rec1 = getItemStorageRecommendation("MILK");
      const rec2 = getItemStorageRecommendation("milk");
      expect(rec1).not.toBeNull();
      expect(rec2).not.toBeNull();
    });

    it("handles whitespace trimming", () => {
      const rec1 = getItemStorageRecommendation("  milk  ");
      const rec2 = getItemStorageRecommendation("milk");
      expect(rec1?.locations).toEqual(rec2?.locations);
    });

    it("returns recommendation for specific item variants like 'white bread'", () => {
      const rec = getItemStorageRecommendation("white bread");
      expect(rec).not.toBeNull();
      expect(rec?.locations).toContain("pantry");
    });
  });

  // ==========================================
  // getShelfLifeForFood tests
  // ==========================================
  describe("getShelfLifeForFood", () => {
    it("performs food alias mapping (apple → fruits)", () => {
      const result = getShelfLifeForFood("apple", "refrigerator");
      expect(result).not.toBeNull();
      expect(result?.category).toBe("fruits");
      expect(result?.days).toBe(7);
    });

    it("performs food alias mapping (cheddar → cheese)", () => {
      const result = getShelfLifeForFood("cheddar", "refrigerator");
      expect(result).not.toBeNull();
      expect(result?.category).toBe("cheese");
    });

    it("performs food alias mapping (salmon → seafood)", () => {
      const result = getShelfLifeForFood("salmon", "refrigerator");
      expect(result).not.toBeNull();
      expect(result?.category).toBe("seafood");
    });

    it("performs food alias mapping (rice → grains)", () => {
      const result = getShelfLifeForFood("rice", "pantry");
      expect(result).not.toBeNull();
      expect(result?.category).toBe("grains");
    });

    it("performs food alias mapping (spaghetti → pasta)", () => {
      const result = getShelfLifeForFood("spaghetti", "pantry");
      expect(result).not.toBeNull();
      expect(result?.category).toBe("pasta");
    });

    it("returns null for unknown food", () => {
      expect(getShelfLifeForFood("unknown_food_xyz", "refrigerator")).toBeNull();
    });

    it("handles partial matching for food names", () => {
      // Test various food name variations
      const result1 = getShelfLifeForFood("whole milk", "refrigerator");
      expect(result1).not.toBeNull();
      expect(result1?.category).toBe("milk");
    });

    it("handles 'fridge' as alias for location parameter", () => {
      const result1 = getShelfLifeForFood("apple", "fridge");
      const result2 = getShelfLifeForFood("apple", "refrigerator");
      expect(result1?.days).toBe(result2?.days);
    });

    it("returns null when days is 0 or negative for location", () => {
      // Milk should have 0 days in pantry, so should return null
      const result = getShelfLifeForFood("milk", "pantry");
      expect(result).toBeNull();
    });

    it("includes notes in the result when available", () => {
      const result = getShelfLifeForFood("apple", "refrigerator");
      expect(result?.notes).toBeDefined();
    });

    it("handles case insensitivity for food names", () => {
      const result1 = getShelfLifeForFood("APPLE", "refrigerator");
      const result2 = getShelfLifeForFood("apple", "refrigerator");
      expect(result1?.days).toBe(result2?.days);
    });

    it("returns correct days for different locations", () => {
      const fridgeResult = getShelfLifeForFood("apple", "refrigerator");
      const counterResult = getShelfLifeForFood("apple", "counter");
      expect(fridgeResult?.days).toBe(7);
      expect(counterResult?.days).toBe(5);
    });

    it("handles direct category match without alias lookup", () => {
      const result = getShelfLifeForFood("bread", "refrigerator");
      expect(result).not.toBeNull();
      expect(result?.category).toBe("bread");
    });
  });

  // ==========================================
  // Integration tests
  // ==========================================
  describe("Integration tests across functions", () => {
    it("getShelfLifeEntry and getShelfLife return consistent data", () => {
      const entry = getShelfLifeEntry("milk");
      const refrigeratorDays = getShelfLife("milk", "refrigerator");

      expect(entry?.refrigerator).toBe(refrigeratorDays);
    });

    it("getValidStorageLocations are all supported by getShelfLife", () => {
      const locations = getValidStorageLocations("bread");

      for (const location of locations) {
        const days = getShelfLife("bread", location);
        expect(days).not.toBeNull();
        expect(days).toBeGreaterThan(0);
      }
    });

    it("getShelfLifeForFood resolves to valid categories from SHELF_LIFE_DATA", () => {
      const foodResult = getShelfLifeForFood("apple", "refrigerator");
      const entryResult = getShelfLifeEntry("fruits");

      expect(foodResult?.category).toBe(entryResult?.category);
    });

    it("getItemStorageRecommendation and getValidStorageLocations alignment", () => {
      const itemRec = getItemStorageRecommendation("bread");
      const validLocations = getValidStorageLocations("bread");

      if (itemRec && validLocations.length > 0) {
        for (const location of itemRec.locations) {
          expect(validLocations).toContain(location);
        }
      }
    });
  });
});
