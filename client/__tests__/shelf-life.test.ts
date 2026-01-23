import {
  getShelfLife,
  getValidStorageLocations,
  getShelfLifeEntry,
  SHELF_LIFE_DATA,
} from "../lib/shelf-life-data";

describe("Shelf Life Data Functions", () => {
  describe("getShelfLife", () => {
    describe("returns correct days for known category/location combinations", () => {
      it("returns 7 days for milk in refrigerator", () => {
        expect(getShelfLife("milk", "refrigerator")).toBe(7);
      });

      it("returns 90 days for milk in freezer", () => {
        expect(getShelfLife("milk", "freezer")).toBe(90);
      });

      it("returns 35 days for eggs in refrigerator", () => {
        expect(getShelfLife("eggs", "refrigerator")).toBe(35);
      });

      it("returns 365 days for beef in freezer (1 year)", () => {
        expect(getShelfLife("beef", "freezer")).toBe(365);
      });

      it("returns 1825 days for canned goods in pantry (5 years)", () => {
        expect(getShelfLife("canned goods", "pantry")).toBe(1825);
      });

      it("returns 7 days for bread on counter", () => {
        expect(getShelfLife("bread", "counter")).toBe(7);
      });

      it("returns 730 days for grains in pantry (2 years)", () => {
        expect(getShelfLife("grains", "pantry")).toBe(730);
      });
    });

    describe("returns null for invalid storage locations", () => {
      it("returns null for milk on counter (not safe)", () => {
        expect(getShelfLife("milk", "counter")).toBeNull();
      });

      it("returns null for milk in pantry (not safe)", () => {
        expect(getShelfLife("milk", "pantry")).toBeNull();
      });

      it("returns null for seafood on counter", () => {
        expect(getShelfLife("seafood", "counter")).toBeNull();
      });

      it("returns null for chicken in pantry", () => {
        expect(getShelfLife("chicken", "pantry")).toBeNull();
      });

      it("returns null for unknown storage location", () => {
        expect(getShelfLife("milk", "garage")).toBeNull();
      });

      it("returns null for empty storage location", () => {
        expect(getShelfLife("milk", "")).toBeNull();
      });
    });

    describe("returns null for unknown categories", () => {
      it("returns null for unknown food item", () => {
        expect(getShelfLife("dragon fruit", "refrigerator")).toBeNull();
      });

      it("returns null for gibberish category", () => {
        expect(getShelfLife("xyzabc123", "refrigerator")).toBeNull();
      });

      it("returns null for empty category", () => {
        expect(getShelfLife("", "refrigerator")).toBeNull();
      });
    });

    describe("case insensitive category matching", () => {
      it("matches MILK uppercase", () => {
        expect(getShelfLife("MILK", "refrigerator")).toBe(7);
      });

      it("matches Milk mixed case", () => {
        expect(getShelfLife("Milk", "refrigerator")).toBe(7);
      });

      it("matches mIlK weird case", () => {
        expect(getShelfLife("mIlK", "refrigerator")).toBe(7);
      });

      it("matches with leading/trailing whitespace", () => {
        expect(getShelfLife("  milk  ", "refrigerator")).toBe(7);
      });

      it("matches location case insensitively", () => {
        expect(getShelfLife("milk", "REFRIGERATOR")).toBe(7);
      });

      it("matches fridge alias for refrigerator", () => {
        expect(getShelfLife("milk", "fridge")).toBe(7);
      });
    });
  });

  describe("getValidStorageLocations", () => {
    describe("returns correct locations for each category", () => {
      it("returns refrigerator and freezer for milk (dairy)", () => {
        const locations = getValidStorageLocations("milk");
        expect(locations).toContain("refrigerator");
        expect(locations).toContain("freezer");
        expect(locations).not.toContain("pantry");
        expect(locations).not.toContain("counter");
      });

      it("returns all locations for fruits", () => {
        const locations = getValidStorageLocations("fruits");
        expect(locations).toContain("refrigerator");
        expect(locations).toContain("freezer");
        expect(locations).toContain("pantry");
        expect(locations).toContain("counter");
      });

      it("returns all four locations for bread", () => {
        const locations = getValidStorageLocations("bread");
        expect(locations.length).toBe(4);
      });

      it("returns refrigerator, freezer, pantry for grains (no counter)", () => {
        const locations = getValidStorageLocations("grains");
        expect(locations).toContain("refrigerator");
        expect(locations).toContain("freezer");
        expect(locations).toContain("pantry");
        expect(locations).not.toContain("counter");
      });
    });

    describe("excludes locations with 0 days", () => {
      it("excludes pantry for milk", () => {
        const locations = getValidStorageLocations("milk");
        expect(locations).not.toContain("pantry");
      });

      it("excludes counter for milk", () => {
        const locations = getValidStorageLocations("milk");
        expect(locations).not.toContain("counter");
      });

      it("excludes freezer for condiments (0 days)", () => {
        const locations = getValidStorageLocations("condiments");
        expect(locations).not.toContain("freezer");
      });

      it("excludes freezer for pickles", () => {
        const locations = getValidStorageLocations("pickles");
        expect(locations).not.toContain("freezer");
      });
    });

    describe("returns empty array for unknown category", () => {
      it("returns empty array for unknown food", () => {
        expect(getValidStorageLocations("unicorn meat")).toEqual([]);
      });

      it("returns empty array for empty string", () => {
        expect(getValidStorageLocations("")).toEqual([]);
      });

      it("returns empty array for whitespace only", () => {
        expect(getValidStorageLocations("   ")).toEqual([]);
      });
    });

    describe("case insensitive", () => {
      it("matches MILK uppercase", () => {
        const locations = getValidStorageLocations("MILK");
        expect(locations.length).toBeGreaterThan(0);
      });

      it("matches with whitespace", () => {
        const locations = getValidStorageLocations("  milk  ");
        expect(locations.length).toBeGreaterThan(0);
      });
    });
  });

  describe("getShelfLifeEntry", () => {
    it("returns full entry for known category", () => {
      const entry = getShelfLifeEntry("milk");
      expect(entry).not.toBeNull();
      expect(entry?.category).toBe("milk");
      expect(entry?.refrigerator).toBe(7);
      expect(entry?.freezer).toBe(90);
      expect(entry?.notes).toBeDefined();
    });

    it("returns null for unknown category", () => {
      expect(getShelfLifeEntry("mystery food")).toBeNull();
    });

    it("is case insensitive", () => {
      const entry = getShelfLifeEntry("EGGS");
      expect(entry).not.toBeNull();
      expect(entry?.category).toBe("eggs");
    });

    it("handles whitespace", () => {
      const entry = getShelfLifeEntry("  cheese  ");
      expect(entry).not.toBeNull();
    });
  });

  describe("getAllCategories", () => {
    it("returns all categories from the database", () => {
      const categories = SHELF_LIFE_DATA.map((entry) => entry.category);
      expect(categories.length).toBe(SHELF_LIFE_DATA.length);
    });

    it("includes expected categories", () => {
      const categories = SHELF_LIFE_DATA.map((entry) => entry.category);
      expect(categories).toContain("milk");
      expect(categories).toContain("eggs");
      expect(categories).toContain("beef");
      expect(categories).toContain("vegetables");
    });
  });

  describe("Edge Cases", () => {
    describe("empty strings", () => {
      it("getShelfLife returns null for empty category", () => {
        expect(getShelfLife("", "refrigerator")).toBeNull();
      });

      it("getShelfLife returns null for empty location", () => {
        expect(getShelfLife("milk", "")).toBeNull();
      });

      it("getShelfLife returns null for both empty", () => {
        expect(getShelfLife("", "")).toBeNull();
      });

      it("getValidStorageLocations returns empty for empty category", () => {
        expect(getValidStorageLocations("")).toEqual([]);
      });
    });

    describe("special characters in food names", () => {
      it("handles hyphenated names", () => {
        expect(getShelfLife("milk-product", "refrigerator")).toBeNull();
      });

      it("handles apostrophes", () => {
        expect(getShelfLife("baker's cheese", "refrigerator")).toBeNull();
      });

      it("handles numbers", () => {
        expect(getShelfLife("milk123", "refrigerator")).toBeNull();
      });

      it("handles special characters without crashing", () => {
        expect(() => getShelfLife("!@#$%", "refrigerator")).not.toThrow();
        expect(getShelfLife("!@#$%", "refrigerator")).toBeNull();
      });
    });

    describe("very long shelf life (years)", () => {
      it("canned goods have 1825 days (5 years) in pantry", () => {
        const days = getShelfLife("canned goods", "pantry");
        expect(days).toBe(1825);
        expect(days! / 365).toBeCloseTo(5, 0);
      });

      it("spices have 1460 days (4 years) in pantry", () => {
        const days = getShelfLife("spices", "pantry");
        expect(days).toBe(1460);
        expect(days! / 365).toBe(4);
      });

      it("grains have 730 days (2 years) in pantry", () => {
        const days = getShelfLife("grains", "pantry");
        expect(days).toBe(730);
        expect(days! / 365).toBe(2);
      });

      it("pasta has 730 days (2 years) in pantry", () => {
        const days = getShelfLife("pasta", "pantry");
        expect(days).toBe(730);
      });

      it("pickles have 730 days (2 years) in pantry", () => {
        const days = getShelfLife("pickles", "pantry");
        expect(days).toBe(730);
      });
    });

    describe("zero shelf life items", () => {
      it("returns null when shelf life is 0 (milk pantry)", () => {
        expect(getShelfLife("milk", "pantry")).toBeNull();
      });

      it("returns null when shelf life is 0 (eggs counter)", () => {
        expect(getShelfLife("eggs", "counter")).toBeNull();
      });

      it("returns null when shelf life is 0 (condiments freezer)", () => {
        expect(getShelfLife("condiments", "freezer")).toBeNull();
      });

      it("excludes zero-day locations from valid storage", () => {
        const milkLocations = getValidStorageLocations("milk");
        expect(milkLocations).not.toContain("pantry");
        expect(milkLocations).not.toContain("counter");
      });
    });

    describe("whitespace handling", () => {
      it("trims leading whitespace", () => {
        expect(getShelfLife("   milk", "refrigerator")).toBe(7);
      });

      it("trims trailing whitespace", () => {
        expect(getShelfLife("milk   ", "refrigerator")).toBe(7);
      });

      it("trims both ends", () => {
        expect(getShelfLife("   milk   ", "   refrigerator   ")).toBe(7);
      });

      it("handles tabs", () => {
        expect(getShelfLife("\tmilk\t", "refrigerator")).toBe(7);
      });
    });

    describe("data integrity", () => {
      it("all entries have required fields", () => {
        SHELF_LIFE_DATA.forEach((entry) => {
          expect(entry.category).toBeDefined();
          expect(typeof entry.category).toBe("string");
          expect(entry.refrigerator).toBeDefined();
          expect(typeof entry.refrigerator).toBe("number");
          expect(entry.freezer).toBeDefined();
          expect(typeof entry.freezer).toBe("number");
          expect(entry.pantry).toBeDefined();
          expect(typeof entry.pantry).toBe("number");
          expect(entry.counter).toBeDefined();
          expect(typeof entry.counter).toBe("number");
        });
      });

      it("all entries have non-negative shelf life values", () => {
        SHELF_LIFE_DATA.forEach((entry) => {
          expect(entry.refrigerator).toBeGreaterThanOrEqual(0);
          expect(entry.freezer).toBeGreaterThanOrEqual(0);
          expect(entry.pantry).toBeGreaterThanOrEqual(0);
          expect(entry.counter).toBeGreaterThanOrEqual(0);
        });
      });

      it("all entries have unique categories", () => {
        const categories = SHELF_LIFE_DATA.map((e) => e.category.toLowerCase());
        const uniqueCategories = [...new Set(categories)];
        expect(categories.length).toBe(uniqueCategories.length);
      });

      it("perishable items have at least one valid storage location", () => {
        SHELF_LIFE_DATA.forEach((entry) => {
          const hasValidStorage =
            entry.refrigerator > 0 ||
            entry.freezer > 0 ||
            entry.pantry > 0 ||
            entry.counter > 0;
          expect(hasValidStorage).toBe(true);
        });
      });
    });
  });
});
