/**
 * @jest-environment node
 *
 * Tests for Waste Reduction API utility functions
 * Tests the actual exported functions from server/lib/waste-reduction-utils.ts
 */

import {
  generateItemsHash,
  parseTips,
  isCacheValid,
  CACHE_TTL_MS,
  type ExpiringItem,
  type WasteTip,
} from "../../server/lib/waste-reduction-utils";

describe("Waste Reduction API - Hash Generation", () => {
  describe("generateItemsHash", () => {
    it("returns consistent hash for same items", () => {
      const items: ExpiringItem[] = [
        { id: 1, name: "Milk", daysUntilExpiry: 2, quantity: 1 },
        { id: 2, name: "Eggs", daysUntilExpiry: 3, quantity: 12 },
      ];
      expect(generateItemsHash(items)).toBe(generateItemsHash(items));
    });

    it("returns different hash for different items", () => {
      const items1: ExpiringItem[] = [
        { id: 1, name: "Milk", daysUntilExpiry: 2, quantity: 1 },
      ];
      const items2: ExpiringItem[] = [
        { id: 2, name: "Eggs", daysUntilExpiry: 3, quantity: 12 },
      ];
      expect(generateItemsHash(items1)).not.toBe(generateItemsHash(items2));
    });

    it("returns different hash when quantity changes", () => {
      const items1: ExpiringItem[] = [
        { id: 1, name: "Milk", daysUntilExpiry: 2, quantity: 1 },
      ];
      const items2: ExpiringItem[] = [
        { id: 1, name: "Milk", daysUntilExpiry: 2, quantity: 2 },
      ];
      expect(generateItemsHash(items1)).not.toBe(generateItemsHash(items2));
    });

    it("returns different hash when daysUntilExpiry changes", () => {
      const items1: ExpiringItem[] = [
        { id: 1, name: "Milk", daysUntilExpiry: 2, quantity: 1 },
      ];
      const items2: ExpiringItem[] = [
        { id: 1, name: "Milk", daysUntilExpiry: 3, quantity: 1 },
      ];
      expect(generateItemsHash(items1)).not.toBe(generateItemsHash(items2));
    });

    it("order does not affect hash (sorted internally)", () => {
      const items1: ExpiringItem[] = [
        { id: 1, name: "Milk", daysUntilExpiry: 2, quantity: 1 },
        { id: 2, name: "Eggs", daysUntilExpiry: 3, quantity: 12 },
      ];
      const items2: ExpiringItem[] = [
        { id: 2, name: "Eggs", daysUntilExpiry: 3, quantity: 12 },
        { id: 1, name: "Milk", daysUntilExpiry: 2, quantity: 1 },
      ];
      expect(generateItemsHash(items1)).toBe(generateItemsHash(items2));
    });

    it("returns 0 for empty array", () => {
      expect(generateItemsHash([])).toBe("0");
    });
  });
});

describe("Waste Reduction API - Tip Parsing", () => {
  describe("parseTips", () => {
    it("parses recipe tips with search action", () => {
      const rawTips = [
        {
          text: "Make a vegetable stir fry",
          category: "recipe",
          searchQuery: "vegetable stir fry",
        },
      ];
      const parsed = parseTips(rawTips);
      expect(parsed[0]).toEqual({
        text: "Make a vegetable stir fry",
        category: "recipe",
        action: {
          type: "search",
          target: "recipes",
          params: { query: "vegetable stir fry" },
        },
      });
    });

    it("parses freeze tips with navigate action", () => {
      const rawTips = [
        { text: "Freeze the chicken within 24 hours", category: "freeze" },
      ];
      const parsed = parseTips(rawTips);
      expect(parsed[0]).toEqual({
        text: "Freeze the chicken within 24 hours",
        category: "freeze",
        action: {
          type: "navigate",
          target: "editItem",
          params: { changeLocation: "freezer" },
        },
      });
    });

    it("parses storage tips with navigate action", () => {
      const rawTips = [
        { text: "Store tomatoes at room temperature", category: "storage" },
      ];
      const parsed = parseTips(rawTips);
      expect(parsed[0]).toEqual({
        text: "Store tomatoes at room temperature",
        category: "storage",
        action: { type: "navigate", target: "storageGuide" },
      });
    });

    it("parses preserve and general tips without actions", () => {
      const rawTips = [
        { text: "Make pickles from cucumbers", category: "preserve" },
        { text: "Plan meals for the week", category: "general" },
      ];
      const parsed = parseTips(rawTips);
      expect(parsed[0]).toEqual({
        text: "Make pickles from cucumbers",
        category: "preserve",
      });
      expect(parsed[1]).toEqual({
        text: "Plan meals for the week",
        category: "general",
      });
    });

    it("handles string tips by converting to general category", () => {
      const rawTips = ["Use milk before it expires"];
      const parsed = parseTips(rawTips);
      expect(parsed[0]).toEqual({
        text: "Use milk before it expires",
        category: "general",
      });
    });

    it("handles tips missing text field", () => {
      const rawTips = [{ category: "recipe" }];
      const parsed = parseTips(rawTips);
      expect(parsed[0].text).toBe("");
    });
  });
});

describe("Waste Reduction API - Cache Validation", () => {
  describe("isCacheValid", () => {
    it("returns true for recent timestamp", () => {
      const recentTimestamp = Date.now() - 1000;
      expect(isCacheValid(recentTimestamp)).toBe(true);
    });

    it("returns true within 24 hours", () => {
      const withinTTL = Date.now() - CACHE_TTL_MS / 2;
      expect(isCacheValid(withinTTL)).toBe(true);
    });

    it("returns false after 24 hours", () => {
      const expiredTimestamp = Date.now() - CACHE_TTL_MS - 1000;
      expect(isCacheValid(expiredTimestamp)).toBe(false);
    });

    it("returns false exactly at TTL boundary plus 1ms", () => {
      const atBoundary = Date.now() - CACHE_TTL_MS - 1;
      expect(isCacheValid(atBoundary)).toBe(false);
    });
  });

  describe("CACHE_TTL_MS constant", () => {
    it("equals 24 hours in milliseconds", () => {
      expect(CACHE_TTL_MS).toBe(24 * 60 * 60 * 1000);
    });
  });
});

describe("Waste Reduction API - Edge Cases", () => {
  describe("Single expiring item", () => {
    it("generates hash for single item", () => {
      const items: ExpiringItem[] = [
        { id: 1, name: "Avocado", daysUntilExpiry: 1, quantity: 3 },
      ];
      const hash = generateItemsHash(items);
      expect(hash).toBeDefined();
      expect(typeof hash).toBe("string");
    });

    it("parses suggestions for single item", () => {
      const mockResponse = {
        suggestions: [
          {
            text: "Make guacamole",
            category: "recipe",
            searchQuery: "guacamole",
          },
          { text: "Store in airtight container", category: "storage" },
        ],
      };
      const tips = parseTips(mockResponse.suggestions);
      expect(tips.length).toBe(2);
      expect(tips[0].text).toContain("guacamole");
    });
  });

  describe("Many expiring items (10+)", () => {
    it("handles many expiring items", () => {
      const items: ExpiringItem[] = Array.from({ length: 12 }, (_, i) => ({
        id: i + 1,
        name: `Item ${i + 1}`,
        daysUntilExpiry: Math.floor(i / 3) + 1,
        quantity: 1,
      }));

      const hash = generateItemsHash(items);
      expect(hash).toBeDefined();
      expect(typeof hash).toBe("string");
    });

    it("prioritizes items expiring soonest when sorted", () => {
      const items: ExpiringItem[] = [
        { id: 1, name: "Tomorrow Item", daysUntilExpiry: 1, quantity: 1 },
        { id: 2, name: "Two Days Item", daysUntilExpiry: 2, quantity: 1 },
        { id: 3, name: "Today Item", daysUntilExpiry: 0, quantity: 1 },
        { id: 4, name: "Three Days Item", daysUntilExpiry: 3, quantity: 1 },
      ];

      const sorted = [...items].sort(
        (a, b) => a.daysUntilExpiry - b.daysUntilExpiry,
      );
      expect(sorted[0].name).toBe("Today Item");
      expect(sorted[1].name).toBe("Tomorrow Item");
    });
  });

  describe("Items expiring today", () => {
    it("handles items expiring today (daysUntilExpiry = 0)", () => {
      const items: ExpiringItem[] = [
        { id: 1, name: "Urgent Item", daysUntilExpiry: 0, quantity: 1 },
      ];
      expect(items[0].daysUntilExpiry).toBe(0);
      const hash = generateItemsHash(items);
      expect(hash).toBeDefined();
    });
  });

  describe("Malformed AI responses", () => {
    it("handles missing suggestions array", () => {
      const rawResponse = {};
      const suggestions = (rawResponse as any).suggestions || [];
      const tips = parseTips(suggestions);
      expect(tips).toEqual([]);
    });

    it("handles null AI response", () => {
      const rawResponse = null;
      const suggestions = (rawResponse as any)?.suggestions || [];
      const tips = parseTips(suggestions);
      expect(tips).toEqual([]);
    });

    it("handles malformed tip objects", () => {
      const rawSuggestions = [
        { text: "Valid tip", category: "recipe" },
        { category: "storage" },
      ];
      const tips = parseTips(rawSuggestions);
      expect(tips.length).toBe(2);
      expect(tips[1].text).toBe("");
    });
  });
});
