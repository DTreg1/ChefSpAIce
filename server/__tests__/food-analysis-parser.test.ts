import { describe, it, expect } from "@jest/globals";
import {
  parseAnalysisResponse,
  normalizeItems,
  normalizeCategory,
  normalizeUnit,
  normalizeStorageLocation,
  normalizeQuantity,
  normalizeShelfLife,
  normalizeConfidence,
  getImageMimeType,
  isValidImageFormat,
  detectMimeTypeFromBuffer,
  SUPPORTED_IMAGE_FORMATS,
  MAX_FILE_SIZE,
} from "../lib/food-analysis-parser";

describe("Food Analysis Parser", () => {
  describe("parseAnalysisResponse", () => {
    it("should return error for null content", () => {
      const result = parseAnalysisResponse(null);
      expect(result.success).toBe(false);
      expect(result.normalized).toBe(false);
      expect(result.error).toContain("No response content");
    });

    it("should return error for invalid JSON", () => {
      const result = parseAnalysisResponse("not valid json {");
      expect(result.success).toBe(false);
      expect(result.normalized).toBe(false);
      expect(result.error).toContain("parse");
    });

    it("should parse valid items array correctly", () => {
      const content = JSON.stringify({
        items: [
          {
            name: "Gala Apple",
            category: "produce",
            quantity: 3,
            quantityUnit: "items",
            storageLocation: "refrigerator",
            shelfLifeDays: 14,
            confidence: 0.92,
          },
        ],
        notes: "Fresh apple detected",
      });

      const result = parseAnalysisResponse(content);
      expect(result.success).toBe(true);
      expect(result.normalized).toBe(false);
      expect(result.data?.items).toHaveLength(1);
      expect(result.data?.items[0].name).toBe("Gala Apple");
      expect(result.data?.notes).toBe("Fresh apple detected");
    });

    it("should handle empty items array", () => {
      const content = JSON.stringify({
        items: [],
        error: "No food items detected",
      });

      const result = parseAnalysisResponse(content);
      expect(result.success).toBe(true);
      expect(result.normalized).toBe(false);
      expect(result.data?.items).toEqual([]);
      expect(result.data?.error).toBe("No food items detected");
    });

    it("should normalize invalid fields with defaults", () => {
      const content = JSON.stringify({
        items: [
          {
            name: "Test Item",
            category: "invalid_category",
            quantity: -5,
            quantityUnit: "invalid_unit",
            storageLocation: "invalid_location",
            shelfLifeDays: 0,
            confidence: 1.5,
          },
        ],
      });

      const result = parseAnalysisResponse(content);
      expect(result.success).toBe(true);
      expect(result.normalized).toBe(true);
      expect(result.data?.items[0]).toEqual({
        name: "Test Item",
        category: "other",
        quantity: 0,
        quantityUnit: "items",
        storageLocation: "refrigerator",
        shelfLifeDays: 1,
        confidence: 1,
      });
    });

    it("should handle missing fields with defaults", () => {
      const content = JSON.stringify({
        items: [{ name: "Minimal Item" }],
      });

      const result = parseAnalysisResponse(content);
      expect(result.success).toBe(true);
      expect(result.data?.items[0]).toEqual({
        name: "Minimal Item",
        category: "other",
        quantity: 1,
        quantityUnit: "items",
        storageLocation: "refrigerator",
        shelfLifeDays: 7,
        confidence: 0.5,
      });
    });

    it("should default name to 'Unknown Item' if missing", () => {
      const content = JSON.stringify({
        items: [{ category: "produce" }],
      });

      const result = parseAnalysisResponse(content);
      expect(result.success).toBe(true);
      expect(result.data?.items[0].name).toBe("Unknown Item");
    });
  });

  describe("normalizeItems", () => {
    it("should return empty array for non-array input", () => {
      expect(normalizeItems("not an array" as any)).toEqual([]);
      expect(normalizeItems(null as any)).toEqual([]);
      expect(normalizeItems(undefined as any)).toEqual([]);
    });

    it("should normalize multiple items", () => {
      const items = [
        { name: "Apple", category: "produce", quantity: 3 },
        { name: "Milk", category: "dairy", quantity: 1 },
      ];

      const result = normalizeItems(items);
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("Apple");
      expect(result[1].name).toBe("Milk");
    });
  });

  describe("normalizeCategory", () => {
    it("should return valid categories as-is (lowercased)", () => {
      expect(normalizeCategory("produce")).toBe("produce");
      expect(normalizeCategory("DAIRY")).toBe("dairy");
      expect(normalizeCategory("Meat")).toBe("meat");
    });

    it("should return 'other' for invalid categories", () => {
      expect(normalizeCategory("invalid")).toBe("other");
      expect(normalizeCategory(123)).toBe("other");
      expect(normalizeCategory(null)).toBe("other");
      expect(normalizeCategory(undefined)).toBe("other");
    });

    it("should handle all valid categories", () => {
      const validCategories = [
        "produce",
        "dairy",
        "meat",
        "seafood",
        "bread",
        "canned",
        "frozen",
        "beverages",
        "condiments",
        "snacks",
        "grains",
        "spices",
        "other",
      ];
      validCategories.forEach((cat) => {
        expect(normalizeCategory(cat)).toBe(cat);
      });
    });
  });

  describe("normalizeUnit", () => {
    it("should return valid units as-is (lowercased)", () => {
      expect(normalizeUnit("items")).toBe("items");
      expect(normalizeUnit("LBS")).toBe("lbs");
      expect(normalizeUnit("Bottle")).toBe("bottle");
    });

    it("should return 'items' for invalid units", () => {
      expect(normalizeUnit("invalid")).toBe("items");
      expect(normalizeUnit(123)).toBe("items");
      expect(normalizeUnit(null)).toBe("items");
    });

    it("should handle all valid units", () => {
      const validUnits = [
        "items",
        "lbs",
        "oz",
        "bunch",
        "container",
        "bag",
        "box",
        "bottle",
        "can",
      ];
      validUnits.forEach((unit) => {
        expect(normalizeUnit(unit)).toBe(unit);
      });
    });
  });

  describe("normalizeStorageLocation", () => {
    it("should return valid locations as-is (lowercased)", () => {
      expect(normalizeStorageLocation("refrigerator")).toBe("refrigerator");
      expect(normalizeStorageLocation("FREEZER")).toBe("freezer");
      expect(normalizeStorageLocation("Pantry")).toBe("pantry");
    });

    it("should return 'refrigerator' for invalid locations", () => {
      expect(normalizeStorageLocation("shelf")).toBe("refrigerator");
      expect(normalizeStorageLocation(123)).toBe("refrigerator");
      expect(normalizeStorageLocation(null)).toBe("refrigerator");
    });

    it("should handle all valid locations", () => {
      const validLocations = ["refrigerator", "freezer", "pantry", "counter"];
      validLocations.forEach((loc) => {
        expect(normalizeStorageLocation(loc)).toBe(loc);
      });
    });
  });

  describe("normalizeQuantity", () => {
    it("should return valid positive numbers", () => {
      expect(normalizeQuantity(5)).toBe(5);
      expect(normalizeQuantity(3.5)).toBe(3.5);
      expect(normalizeQuantity("10")).toBe(10);
    });

    it("should clamp negative numbers to 0", () => {
      expect(normalizeQuantity(-5)).toBe(0);
    });

    it("should default to 1 for invalid input", () => {
      expect(normalizeQuantity(NaN)).toBe(1);
      expect(normalizeQuantity("not a number")).toBe(1);
    });

    it("should treat null/undefined as 0 (Number coercion)", () => {
      expect(normalizeQuantity(null)).toBe(0);
      expect(normalizeQuantity(undefined)).toBe(1);
    });
  });

  describe("normalizeShelfLife", () => {
    it("should return valid shelf life values", () => {
      expect(normalizeShelfLife(7)).toBe(7);
      expect(normalizeShelfLife(30)).toBe(30);
      expect(normalizeShelfLife("14")).toBe(14);
    });

    it("should clamp to minimum of 1", () => {
      expect(normalizeShelfLife(0)).toBe(1);
      expect(normalizeShelfLife(-5)).toBe(1);
    });

    it("should clamp to maximum of 365", () => {
      expect(normalizeShelfLife(500)).toBe(365);
      expect(normalizeShelfLife(1000)).toBe(365);
    });

    it("should default to 7 for invalid input", () => {
      expect(normalizeShelfLife(NaN)).toBe(7);
      expect(normalizeShelfLife("not a number")).toBe(7);
    });

    it("should treat null as 0 which clamps to 1", () => {
      expect(normalizeShelfLife(null)).toBe(1);
    });
  });

  describe("normalizeConfidence", () => {
    it("should return valid confidence values", () => {
      expect(normalizeConfidence(0.5)).toBe(0.5);
      expect(normalizeConfidence(0.92)).toBe(0.92);
      expect(normalizeConfidence("0.8")).toBe(0.8);
    });

    it("should clamp to minimum of 0", () => {
      expect(normalizeConfidence(-0.5)).toBe(0);
    });

    it("should clamp to maximum of 1", () => {
      expect(normalizeConfidence(1.5)).toBe(1);
      expect(normalizeConfidence(100)).toBe(1);
    });

    it("should default to 0.5 for invalid input", () => {
      expect(normalizeConfidence(NaN)).toBe(0.5);
      expect(normalizeConfidence("not a number")).toBe(0.5);
    });

    it("should treat null as 0 (valid confidence)", () => {
      expect(normalizeConfidence(null)).toBe(0);
    });
  });

  describe("Image Format Utilities", () => {
    describe("getImageMimeType", () => {
      it("should return correct MIME type for valid extensions", () => {
        expect(getImageMimeType("image.jpg")).toBe("image/jpeg");
        expect(getImageMimeType("image.jpeg")).toBe("image/jpeg");
        expect(getImageMimeType("image.png")).toBe("image/png");
        expect(getImageMimeType("image.webp")).toBe("image/webp");
        expect(getImageMimeType("image.gif")).toBe("image/gif");
      });

      it("should be case insensitive", () => {
        expect(getImageMimeType("image.JPG")).toBe("image/jpeg");
        expect(getImageMimeType("image.PNG")).toBe("image/png");
      });

      it("should return null for invalid extensions", () => {
        expect(getImageMimeType("image.txt")).toBeNull();
        expect(getImageMimeType("image.pdf")).toBeNull();
        expect(getImageMimeType("noextension")).toBeNull();
      });
    });

    describe("isValidImageFormat", () => {
      it("should return true for valid formats", () => {
        expect(isValidImageFormat("image.jpg")).toBe(true);
        expect(isValidImageFormat("image.jpeg")).toBe(true);
        expect(isValidImageFormat("image.png")).toBe(true);
        expect(isValidImageFormat("image.webp")).toBe(true);
        expect(isValidImageFormat("image.gif")).toBe(true);
      });

      it("should return false for invalid formats", () => {
        expect(isValidImageFormat("image.txt")).toBe(false);
        expect(isValidImageFormat("image.pdf")).toBe(false);
        expect(isValidImageFormat("noextension")).toBe(false);
      });
    });

    describe("detectMimeTypeFromBuffer", () => {
      it("should detect JPEG from magic bytes", () => {
        const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x00]);
        expect(detectMimeTypeFromBuffer(jpeg)).toBe("image/jpeg");
      });

      it("should detect PNG from magic bytes", () => {
        const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);
        expect(detectMimeTypeFromBuffer(png)).toBe("image/png");
      });

      it("should detect GIF from magic bytes", () => {
        const gif = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
        expect(detectMimeTypeFromBuffer(gif)).toBe("image/gif");
      });

      it("should detect WebP from magic bytes", () => {
        const webp = Buffer.alloc(12);
        webp[0] = 0x52; // R
        webp[1] = 0x49; // I
        webp[2] = 0x46; // F
        webp[3] = 0x46; // F
        webp.write("WEBP", 8, 4, "utf8");
        expect(detectMimeTypeFromBuffer(webp)).toBe("image/webp");
      });

      it("should return null for unknown format", () => {
        const unknown = Buffer.from([0x00, 0x00, 0x00, 0x00]);
        expect(detectMimeTypeFromBuffer(unknown)).toBeNull();
      });

      it("should return null for too short buffer", () => {
        const short = Buffer.from([0xff, 0xd8]);
        expect(detectMimeTypeFromBuffer(short)).toBeNull();
      });
    });
  });

  describe("Constants", () => {
    it("should have correct supported image formats", () => {
      expect(SUPPORTED_IMAGE_FORMATS).toContain("jpeg");
      expect(SUPPORTED_IMAGE_FORMATS).toContain("jpg");
      expect(SUPPORTED_IMAGE_FORMATS).toContain("png");
      expect(SUPPORTED_IMAGE_FORMATS).toContain("webp");
      expect(SUPPORTED_IMAGE_FORMATS).toContain("gif");
    });

    it("should have 10MB max file size", () => {
      expect(MAX_FILE_SIZE).toBe(10 * 1024 * 1024);
    });
  });

  describe("Mock Scenarios", () => {
    describe("Single item detected with high confidence", () => {
      it("should parse single high-confidence item", () => {
        const content = JSON.stringify({
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
        });

        const result = parseAnalysisResponse(content);
        expect(result.success).toBe(true);
        expect(result.data?.items).toHaveLength(1);
        expect(result.data?.items[0].confidence).toBeGreaterThanOrEqual(0.8);
        expect(result.data?.items[0].name).toBe("Organic Bananas");
      });
    });

    describe("Multiple items detected", () => {
      it("should parse multiple items correctly", () => {
        const content = JSON.stringify({
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
              name: "Orange",
              category: "produce",
              quantity: 3,
              quantityUnit: "items",
              storageLocation: "refrigerator",
              shelfLifeDays: 10,
              confidence: 0.88,
            },
            {
              name: "Banana",
              category: "produce",
              quantity: 5,
              quantityUnit: "items",
              storageLocation: "counter",
              shelfLifeDays: 5,
              confidence: 0.92,
            },
            {
              name: "Milk",
              category: "dairy",
              quantity: 1,
              quantityUnit: "bottle",
              storageLocation: "refrigerator",
              shelfLifeDays: 7,
              confidence: 0.85,
            },
          ],
        });

        const result = parseAnalysisResponse(content);
        expect(result.success).toBe(true);
        expect(result.data?.items).toHaveLength(4);
        expect(result.data?.items.map((i) => i.name)).toEqual([
          "Apple",
          "Orange",
          "Banana",
          "Milk",
        ]);
      });
    });

    describe("No food detected", () => {
      it("should handle empty results with error message", () => {
        const content = JSON.stringify({
          items: [],
          error: "No food items detected in this image",
        });

        const result = parseAnalysisResponse(content);
        expect(result.success).toBe(true);
        expect(result.data?.items).toEqual([]);
        expect(result.data?.error).toBeTruthy();
      });
    });

    describe("Low confidence items", () => {
      it("should parse low confidence items correctly", () => {
        const content = JSON.stringify({
          items: [
            {
              name: "Possible Apple",
              category: "produce",
              quantity: 1,
              quantityUnit: "items",
              storageLocation: "refrigerator",
              shelfLifeDays: 7,
              confidence: 0.35,
            },
            {
              name: "Maybe Cheese",
              category: "dairy",
              quantity: 1,
              quantityUnit: "items",
              storageLocation: "refrigerator",
              shelfLifeDays: 14,
              confidence: 0.25,
            },
          ],
          notes: "Low visibility, items partially obscured",
        });

        const result = parseAnalysisResponse(content);
        expect(result.success).toBe(true);
        expect(result.data?.items).toHaveLength(2);
        result.data?.items.forEach((item) => {
          expect(item.confidence).toBeLessThan(0.5);
        });
      });
    });

    describe("Mixed confidence items", () => {
      it("should parse mixed confidence items correctly", () => {
        const content = JSON.stringify({
          items: [
            {
              name: "Clear Apple",
              category: "produce",
              quantity: 2,
              quantityUnit: "items",
              storageLocation: "refrigerator",
              shelfLifeDays: 14,
              confidence: 0.92,
            },
            {
              name: "Blurry Item",
              category: "other",
              quantity: 1,
              quantityUnit: "items",
              storageLocation: "pantry",
              shelfLifeDays: 30,
              confidence: 0.3,
            },
            {
              name: "Somewhat Visible Bread",
              category: "bread",
              quantity: 1,
              quantityUnit: "items",
              storageLocation: "counter",
              shelfLifeDays: 5,
              confidence: 0.65,
            },
          ],
        });

        const result = parseAnalysisResponse(content);
        expect(result.success).toBe(true);
        expect(result.data?.items).toHaveLength(3);

        const highConfidence = result.data!.items.filter(
          (i) => i.confidence >= 0.8,
        );
        const mediumConfidence = result.data!.items.filter(
          (i) => i.confidence >= 0.5 && i.confidence < 0.8,
        );
        const lowConfidence = result.data!.items.filter(
          (i) => i.confidence < 0.5,
        );

        expect(highConfidence).toHaveLength(1);
        expect(mediumConfidence).toHaveLength(1);
        expect(lowConfidence).toHaveLength(1);
      });
    });
  });
});
