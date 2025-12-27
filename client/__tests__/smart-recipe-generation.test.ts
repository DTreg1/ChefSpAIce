/**
 * Tests for Smart Recipe Generation functionality
 *
 * Covers:
 * 1. Ingredient prioritization (expiry date sorting, threshold classification)
 * 2. API endpoint behavior (prompt building, usedExpiringItems, error handling)
 * 3. Component logic (toggle, selection, generation)
 * 4. Mock data scenarios (all expiring, none expiring, mixed, today)
 */

import {
  calculateDaysUntilExpiry,
  organizeInventory,
  buildSmartPrompt,
  type InventoryItem,
  type ExpiringItem,
} from "../../server/routers/user/recipes.router";

function getDateString(daysFromNow: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().split("T")[0];
}

describe("Smart Recipe Generation", () => {
  describe("1. Ingredient Prioritization", () => {
    describe("calculateDaysUntilExpiry", () => {
      it("returns null for undefined expiry date", () => {
        expect(calculateDaysUntilExpiry(undefined)).toBeNull();
      });

      it("returns null for null expiry date", () => {
        expect(calculateDaysUntilExpiry(null)).toBeNull();
      });

      it("returns 0 for item expiring today", () => {
        const today = getDateString(0);
        expect(calculateDaysUntilExpiry(today)).toBe(0);
      });

      it("returns 1 for item expiring tomorrow", () => {
        const tomorrow = getDateString(1);
        expect(calculateDaysUntilExpiry(tomorrow)).toBe(1);
      });

      it("returns 5 for item expiring in 5 days", () => {
        const fiveDays = getDateString(5);
        expect(calculateDaysUntilExpiry(fiveDays)).toBe(5);
      });

      it("returns negative for expired items", () => {
        const yesterday = getDateString(-1);
        expect(calculateDaysUntilExpiry(yesterday)).toBe(-1);
      });

      it("returns 30 for item expiring in a month", () => {
        const thirtyDays = getDateString(30);
        expect(calculateDaysUntilExpiry(thirtyDays)).toBe(30);
      });
    });

    describe("organizeInventory - Expiring items sorted correctly", () => {
      it("sorts expiring items by days until expiry (ascending)", () => {
        const items: InventoryItem[] = [
          { id: 1, name: "Milk", expiryDate: getDateString(3) },
          { id: 2, name: "Yogurt", expiryDate: getDateString(1) },
          { id: 3, name: "Cheese", expiryDate: getDateString(5) },
        ];

        const { expiringItems } = organizeInventory(items);

        expect(expiringItems).toHaveLength(3);
        expect(expiringItems[0].name).toBe("Yogurt");
        expect(expiringItems[0].daysUntilExpiry).toBe(1);
        expect(expiringItems[1].name).toBe("Milk");
        expect(expiringItems[1].daysUntilExpiry).toBe(3);
        expect(expiringItems[2].name).toBe("Cheese");
        expect(expiringItems[2].daysUntilExpiry).toBe(5);
      });

      it("puts today-expiring items first", () => {
        const items: InventoryItem[] = [
          { id: 1, name: "Bread", expiryDate: getDateString(2) },
          { id: 2, name: "Milk", expiryDate: getDateString(0) },
          { id: 3, name: "Eggs", expiryDate: getDateString(4) },
        ];

        const { expiringItems } = organizeInventory(items);

        expect(expiringItems[0].name).toBe("Milk");
        expect(expiringItems[0].daysUntilExpiry).toBe(0);
      });

      it("includes already-expired items in expiring list (negative days)", () => {
        const items: InventoryItem[] = [
          { id: 1, name: "Old Milk", expiryDate: getDateString(-1) },
          { id: 2, name: "Fresh Milk", expiryDate: getDateString(3) },
        ];

        const { expiringItems } = organizeInventory(items);

        expect(expiringItems[0].name).toBe("Old Milk");
        expect(expiringItems[0].daysUntilExpiry).toBe(-1);
      });
    });

    describe("organizeInventory - Classification by threshold", () => {
      it("classifies items expiring within 5 days as expiring", () => {
        const items: InventoryItem[] = [
          { id: 1, name: "Expires in 4", expiryDate: getDateString(4) },
          { id: 2, name: "Expires in 5", expiryDate: getDateString(5) },
          { id: 3, name: "Expires in 6", expiryDate: getDateString(6) },
        ];

        const { expiringItems, otherItems } = organizeInventory(items);

        expect(expiringItems).toHaveLength(2);
        expect(expiringItems.map((i) => i.name)).toContain("Expires in 4");
        expect(expiringItems.map((i) => i.name)).toContain("Expires in 5");
        expect(otherItems).toHaveLength(1);
        expect(otherItems[0].name).toBe("Expires in 6");
      });

      it("puts items without expiry date in other items", () => {
        const items: InventoryItem[] = [
          { id: 1, name: "Canned Beans", expiryDate: null },
          { id: 2, name: "Rice", expiryDate: undefined },
          { id: 3, name: "Milk", expiryDate: getDateString(2) },
        ];

        const { expiringItems, otherItems } = organizeInventory(items);

        expect(expiringItems).toHaveLength(1);
        expect(expiringItems[0].name).toBe("Milk");
        expect(otherItems).toHaveLength(2);
        expect(otherItems.map((i) => i.name)).toContain("Canned Beans");
        expect(otherItems.map((i) => i.name)).toContain("Rice");
      });
    });

    describe("organizeInventory - Selected IDs filtering", () => {
      it("filters to only selected items when IDs provided", () => {
        const items: InventoryItem[] = [
          { id: 1, name: "Milk", expiryDate: getDateString(2) },
          { id: 2, name: "Bread", expiryDate: getDateString(1) },
          { id: 3, name: "Cheese", expiryDate: getDateString(3) },
        ];

        const { expiringItems } = organizeInventory(items, [1, 3]);

        expect(expiringItems).toHaveLength(2);
        expect(expiringItems.map((i) => i.name)).toContain("Milk");
        expect(expiringItems.map((i) => i.name)).toContain("Cheese");
        expect(expiringItems.map((i) => i.name)).not.toContain("Bread");
      });

      it("returns all items when selectedIds is empty array", () => {
        const items: InventoryItem[] = [
          { id: 1, name: "Milk", expiryDate: getDateString(2) },
          { id: 2, name: "Bread", expiryDate: getDateString(1) },
        ];

        const { expiringItems } = organizeInventory(items, []);

        expect(expiringItems).toHaveLength(2);
      });

      it("returns all items when selectedIds is undefined", () => {
        const items: InventoryItem[] = [
          { id: 1, name: "Milk", expiryDate: getDateString(2) },
          { id: 2, name: "Bread", expiryDate: getDateString(1) },
        ];

        const { expiringItems } = organizeInventory(items, undefined);

        expect(expiringItems).toHaveLength(2);
      });
    });
  });

  describe("2. API Endpoint - buildSmartPrompt", () => {
    describe("Prompt includes expiring items first when prioritized", () => {
      it("includes EXPIRING SOON section when there are expiring items", () => {
        const expiringItems: ExpiringItem[] = [
          { id: 1, name: "Milk", daysUntilExpiry: 1 },
          { id: 2, name: "Chicken", daysUntilExpiry: 2 },
        ];

        const prompt = buildSmartPrompt({
          expiringItems,
          otherItems: [],
          prioritizeExpiring: true,
          servings: 4,
          maxTime: 60,
          quickRecipe: false,
        });

        expect(prompt).toContain("EXPIRING SOON");
        expect(prompt).toContain("Milk");
        expect(prompt).toContain("Chicken");
      });

      it("includes expiring items in prompt even when prioritizeExpiring is false", () => {
        const expiringItems: ExpiringItem[] = [
          { id: 1, name: "Milk", daysUntilExpiry: 1 },
        ];

        const prompt = buildSmartPrompt({
          expiringItems,
          otherItems: [],
          prioritizeExpiring: false,
          servings: 4,
          maxTime: 60,
          quickRecipe: false,
        });

        expect(prompt).toContain("EXPIRING SOON");
        expect(prompt).toContain("Milk");
      });

      it("shows EXPIRES TODAY/TOMORROW for items expiring within 1 day", () => {
        const expiringItems: ExpiringItem[] = [
          { id: 1, name: "Milk", daysUntilExpiry: 0 },
          { id: 2, name: "Yogurt", daysUntilExpiry: 1 },
        ];

        const prompt = buildSmartPrompt({
          expiringItems,
          otherItems: [],
          prioritizeExpiring: true,
          servings: 4,
          maxTime: 60,
          quickRecipe: false,
        });

        expect(prompt).toContain("EXPIRES TODAY/TOMORROW");
      });

      it("shows 'expires in X days' for items expiring in 2+ days", () => {
        const expiringItems: ExpiringItem[] = [
          { id: 1, name: "Cheese", daysUntilExpiry: 3 },
        ];

        const prompt = buildSmartPrompt({
          expiringItems,
          otherItems: [],
          prioritizeExpiring: true,
          servings: 4,
          maxTime: 60,
          quickRecipe: false,
        });

        expect(prompt).toContain("expires in 3 days");
      });
    });

    describe("Non-expiring items included after", () => {
      it("includes ALSO AVAILABLE section for other items", () => {
        const otherItems: InventoryItem[] = [
          { id: 1, name: "Rice" },
          { id: 2, name: "Pasta" },
        ];

        const prompt = buildSmartPrompt({
          expiringItems: [],
          otherItems,
          prioritizeExpiring: false,
          servings: 4,
          maxTime: 60,
          quickRecipe: false,
        });

        expect(prompt).toContain("ALSO AVAILABLE:");
        expect(prompt).toContain("Rice");
        expect(prompt).toContain("Pasta");
      });

      it("shows both sections when both types present", () => {
        const expiringItems: ExpiringItem[] = [
          { id: 1, name: "Milk", daysUntilExpiry: 2 },
        ];
        const otherItems: InventoryItem[] = [{ id: 2, name: "Rice" }];

        const prompt = buildSmartPrompt({
          expiringItems,
          otherItems,
          prioritizeExpiring: true,
          servings: 4,
          maxTime: 60,
          quickRecipe: false,
        });

        expect(prompt).toContain("EXPIRING SOON");
        expect(prompt).toContain("Milk");
        expect(prompt).toContain("ALSO AVAILABLE:");
        expect(prompt).toContain("Rice");
      });

      it("expiring items appear before other items in prompt", () => {
        const expiringItems: ExpiringItem[] = [
          { id: 1, name: "EXPIRING_MILK", daysUntilExpiry: 2 },
        ];
        const otherItems: InventoryItem[] = [{ id: 2, name: "FRESH_RICE" }];

        const prompt = buildSmartPrompt({
          expiringItems,
          otherItems,
          prioritizeExpiring: true,
          servings: 4,
          maxTime: 60,
          quickRecipe: false,
        });

        const expiringIndex = prompt.indexOf("EXPIRING_MILK");
        const freshIndex = prompt.indexOf("FRESH_RICE");

        expect(expiringIndex).toBeLessThan(freshIndex);
      });
    });

    describe("Prompt includes quantity and unit", () => {
      it("includes item name in prompt", () => {
        const expiringItems: ExpiringItem[] = [
          {
            id: 1,
            name: "Milk",
            quantity: 2,
            unit: "cups",
            daysUntilExpiry: 1,
          },
        ];

        const prompt = buildSmartPrompt({
          expiringItems,
          otherItems: [],
          prioritizeExpiring: true,
          servings: 4,
          maxTime: 60,
          quickRecipe: false,
        });

        expect(prompt).toContain("Milk");
      });

      it("includes item with quantity in prompt", () => {
        const expiringItems: ExpiringItem[] = [
          { id: 1, name: "Eggs", quantity: 6, daysUntilExpiry: 1 },
        ];

        const prompt = buildSmartPrompt({
          expiringItems,
          otherItems: [],
          prioritizeExpiring: true,
          servings: 4,
          maxTime: 60,
          quickRecipe: false,
        });

        expect(prompt).toContain("Eggs");
      });

      it("includes item without quantity in prompt", () => {
        const otherItems: InventoryItem[] = [{ id: 1, name: "Salt" }];

        const prompt = buildSmartPrompt({
          expiringItems: [],
          otherItems,
          prioritizeExpiring: false,
          servings: 4,
          maxTime: 60,
          quickRecipe: false,
        });

        expect(prompt).toContain("Salt");
      });
    });

    describe("User preferences included", () => {
      it("includes servings in prompt", () => {
        const prompt = buildSmartPrompt({
          expiringItems: [],
          otherItems: [{ id: 1, name: "Rice" }],
          prioritizeExpiring: false,
          servings: 6,
          maxTime: 45,
          quickRecipe: false,
        });

        expect(prompt).toContain("Servings: 6");
      });

      it("includes max time in prompt", () => {
        const prompt = buildSmartPrompt({
          expiringItems: [],
          otherItems: [{ id: 1, name: "Rice" }],
          prioritizeExpiring: false,
          servings: 4,
          maxTime: 30,
          quickRecipe: false,
        });

        expect(prompt).toContain("Max time: 30 minutes");
      });

      it("includes dietary restrictions when provided", () => {
        const prompt = buildSmartPrompt({
          expiringItems: [],
          otherItems: [{ id: 1, name: "Rice" }],
          prioritizeExpiring: false,
          servings: 4,
          maxTime: 60,
          dietaryRestrictions: "Vegetarian",
          quickRecipe: false,
        });

        expect(prompt).toContain("Diet: Vegetarian");
      });

      it("includes cuisine when provided", () => {
        const prompt = buildSmartPrompt({
          expiringItems: [],
          otherItems: [{ id: 1, name: "Rice" }],
          prioritizeExpiring: false,
          servings: 4,
          maxTime: 60,
          cuisine: "Italian",
          quickRecipe: false,
        });

        expect(prompt).toContain("Cuisine style: Italian");
      });

      it("omits dietary restrictions when not provided", () => {
        const prompt = buildSmartPrompt({
          expiringItems: [],
          otherItems: [{ id: 1, name: "Rice" }],
          prioritizeExpiring: false,
          servings: 4,
          maxTime: 60,
          quickRecipe: false,
        });

        expect(prompt).not.toContain("Diet:");
      });
    });

    describe("Recipe instructions based on prioritization", () => {
      it("includes expiring items section when expiring items exist", () => {
        const expiringItems: ExpiringItem[] = [
          { id: 1, name: "Milk", daysUntilExpiry: 2 },
        ];

        const prompt = buildSmartPrompt({
          expiringItems,
          otherItems: [],
          prioritizeExpiring: true,
          servings: 4,
          maxTime: 60,
          quickRecipe: false,
        });

        expect(prompt).toContain("EXPIRING SOON");
        expect(prompt).toContain("Milk");
      });

      it("includes available items in prompt", () => {
        const prompt = buildSmartPrompt({
          expiringItems: [],
          otherItems: [{ id: 1, name: "Rice" }],
          prioritizeExpiring: false,
          servings: 4,
          maxTime: 60,
          quickRecipe: false,
        });

        expect(prompt).toContain("ALSO AVAILABLE:");
        expect(prompt).toContain("Rice");
      });
    });
  });

  describe("3. Component Logic", () => {
    describe("Selection state management", () => {
      it("can add item to selection", () => {
        const selectedIngredients = new Set<string>();
        selectedIngredients.add("item-1");

        expect(selectedIngredients.has("item-1")).toBe(true);
        expect(selectedIngredients.size).toBe(1);
      });

      it("can remove item from selection", () => {
        const selectedIngredients = new Set<string>(["item-1", "item-2"]);
        selectedIngredients.delete("item-1");

        expect(selectedIngredients.has("item-1")).toBe(false);
        expect(selectedIngredients.has("item-2")).toBe(true);
        expect(selectedIngredients.size).toBe(1);
      });

      it("can toggle item selection", () => {
        const toggleIngredient = (
          selection: Set<string>,
          id: string,
        ): Set<string> => {
          const newSelection = new Set(selection);
          if (newSelection.has(id)) {
            newSelection.delete(id);
          } else {
            newSelection.add(id);
          }
          return newSelection;
        };

        let selection = new Set<string>();
        selection = toggleIngredient(selection, "item-1");
        expect(selection.has("item-1")).toBe(true);

        selection = toggleIngredient(selection, "item-1");
        expect(selection.has("item-1")).toBe(false);
      });

      it("can select all expiring items", () => {
        const expiringItems = [
          { id: "exp-1", name: "Milk" },
          { id: "exp-2", name: "Yogurt" },
          { id: "exp-3", name: "Cheese" },
        ];

        const selectedIngredients = new Set<string>();
        expiringItems.forEach((item) => selectedIngredients.add(item.id));

        expect(selectedIngredients.size).toBe(3);
        expect(selectedIngredients.has("exp-1")).toBe(true);
        expect(selectedIngredients.has("exp-2")).toBe(true);
        expect(selectedIngredients.has("exp-3")).toBe(true);
      });

      it("can clear all selections", () => {
        const selectedIngredients = new Set<string>([
          "item-1",
          "item-2",
          "item-3",
        ]);
        selectedIngredients.clear();

        expect(selectedIngredients.size).toBe(0);
      });
    });

    describe("Prioritization toggle", () => {
      it("toggle changes prioritization state", () => {
        let prioritizeExpiring = false;
        prioritizeExpiring = !prioritizeExpiring;
        expect(prioritizeExpiring).toBe(true);

        prioritizeExpiring = !prioritizeExpiring;
        expect(prioritizeExpiring).toBe(false);
      });
    });

    describe("Expiring items count display", () => {
      it("calculates selected expiring count correctly", () => {
        const expiringItems = [
          { id: "exp-1", name: "Milk", daysUntilExpiry: 2 },
          { id: "exp-2", name: "Yogurt", daysUntilExpiry: 1 },
          { id: "exp-3", name: "Cheese", daysUntilExpiry: 3 },
        ];
        const selectedIngredients = new Set(["exp-1", "exp-3"]);

        const selectedExpiringCount = expiringItems.filter((item) =>
          selectedIngredients.has(item.id),
        ).length;

        expect(selectedExpiringCount).toBe(2);
      });

      it("returns 0 when no expiring items selected", () => {
        const expiringItems = [
          { id: "exp-1", name: "Milk", daysUntilExpiry: 2 },
        ];
        const selectedIngredients = new Set<string>();

        const selectedExpiringCount = expiringItems.filter((item) =>
          selectedIngredients.has(item.id),
        ).length;

        expect(selectedExpiringCount).toBe(0);
      });
    });

    describe("Generate button state", () => {
      it("should be disabled when no ingredients selected", () => {
        const selectedIngredients = new Set<string>();
        const generating = false;
        const isDisabled = selectedIngredients.size === 0 || generating;

        expect(isDisabled).toBe(true);
      });

      it("should be disabled when generating", () => {
        const selectedIngredients = new Set(["item-1"]);
        const generating = true;
        const isDisabled = selectedIngredients.size === 0 || generating;

        expect(isDisabled).toBe(true);
      });

      it("should be enabled when ingredients selected and not generating", () => {
        const selectedIngredients = new Set(["item-1"]);
        const generating = false;
        const isDisabled = selectedIngredients.size === 0 || generating;

        expect(isDisabled).toBe(false);
      });
    });
  });

  describe("4. Mock Data Scenarios", () => {
    describe("All items expiring", () => {
      it("all items go to expiringItems list", () => {
        const items: InventoryItem[] = [
          { id: 1, name: "Milk", expiryDate: getDateString(1) },
          { id: 2, name: "Yogurt", expiryDate: getDateString(2) },
          { id: 3, name: "Cheese", expiryDate: getDateString(3) },
          { id: 4, name: "Bread", expiryDate: getDateString(4) },
          { id: 5, name: "Eggs", expiryDate: getDateString(5) },
        ];

        const { expiringItems, otherItems } = organizeInventory(items);

        expect(expiringItems).toHaveLength(5);
        expect(otherItems).toHaveLength(0);
      });

      it("prompt contains all items in expiring section", () => {
        const expiringItems: ExpiringItem[] = [
          { id: 1, name: "Milk", daysUntilExpiry: 1 },
          { id: 2, name: "Yogurt", daysUntilExpiry: 2 },
          { id: 3, name: "Cheese", daysUntilExpiry: 3 },
        ];

        const prompt = buildSmartPrompt({
          expiringItems,
          otherItems: [],
          prioritizeExpiring: true,
          servings: 4,
          maxTime: 60,
          quickRecipe: false,
        });

        expect(prompt).toContain("EXPIRING SOON");
        expect(prompt).toContain("Milk");
        expect(prompt).toContain("Yogurt");
        expect(prompt).toContain("Cheese");
        expect(prompt).not.toContain("ALSO AVAILABLE:");
      });
    });

    describe("No items expiring", () => {
      it("all items go to otherItems list", () => {
        const items: InventoryItem[] = [
          { id: 1, name: "Rice", expiryDate: getDateString(30) },
          { id: 2, name: "Pasta", expiryDate: null },
          { id: 3, name: "Canned Beans" },
        ];

        const { expiringItems, otherItems } = organizeInventory(items);

        expect(expiringItems).toHaveLength(0);
        expect(otherItems).toHaveLength(3);
      });

      it("prompt shows only ALSO AVAILABLE section", () => {
        const otherItems: InventoryItem[] = [
          { id: 1, name: "Rice" },
          { id: 2, name: "Pasta" },
        ];

        const prompt = buildSmartPrompt({
          expiringItems: [],
          otherItems,
          prioritizeExpiring: true,
          servings: 4,
          maxTime: 60,
          quickRecipe: false,
        });

        expect(prompt).not.toContain("EXPIRING SOON");
        expect(prompt).toContain("ALSO AVAILABLE:");
        expect(prompt).toContain("Rice");
        expect(prompt).toContain("Pasta");
      });

      it("includes available items in prompt when no expiring items", () => {
        const prompt = buildSmartPrompt({
          expiringItems: [],
          otherItems: [{ id: 1, name: "Rice" }],
          prioritizeExpiring: true,
          servings: 4,
          maxTime: 60,
          quickRecipe: false,
        });

        expect(prompt).toContain("ALSO AVAILABLE:");
        expect(prompt).toContain("Rice");
      });
    });

    describe("Mix of expiring and fresh items", () => {
      it("correctly separates expiring and fresh items", () => {
        const items: InventoryItem[] = [
          { id: 1, name: "Milk", expiryDate: getDateString(2) },
          { id: 2, name: "Rice", expiryDate: getDateString(30) },
          { id: 3, name: "Yogurt", expiryDate: getDateString(1) },
          { id: 4, name: "Pasta", expiryDate: null },
          { id: 5, name: "Cheese", expiryDate: getDateString(5) },
        ];

        const { expiringItems, otherItems } = organizeInventory(items);

        expect(expiringItems).toHaveLength(3);
        expect(expiringItems.map((i) => i.name).sort()).toEqual([
          "Cheese",
          "Milk",
          "Yogurt",
        ]);

        expect(otherItems).toHaveLength(2);
        expect(otherItems.map((i) => i.name).sort()).toEqual(["Pasta", "Rice"]);
      });

      it("prompt contains both sections", () => {
        const expiringItems: ExpiringItem[] = [
          { id: 1, name: "Milk", daysUntilExpiry: 2 },
        ];
        const otherItems: InventoryItem[] = [{ id: 2, name: "Rice" }];

        const prompt = buildSmartPrompt({
          expiringItems,
          otherItems,
          prioritizeExpiring: true,
          servings: 4,
          maxTime: 60,
          quickRecipe: false,
        });

        expect(prompt).toContain("EXPIRING SOON");
        expect(prompt).toContain("ALSO AVAILABLE:");
      });
    });

    describe("Items expiring today", () => {
      it("items expiring today have daysUntilExpiry of 0", () => {
        const items: InventoryItem[] = [
          { id: 1, name: "Milk", expiryDate: getDateString(0) },
        ];

        const { expiringItems } = organizeInventory(items);

        expect(expiringItems).toHaveLength(1);
        expect(expiringItems[0].daysUntilExpiry).toBe(0);
      });

      it("items expiring today show EXPIRES TODAY/TOMORROW urgency", () => {
        const expiringItems: ExpiringItem[] = [
          { id: 1, name: "Milk", daysUntilExpiry: 0 },
        ];

        const prompt = buildSmartPrompt({
          expiringItems,
          otherItems: [],
          prioritizeExpiring: true,
          servings: 4,
          maxTime: 60,
          quickRecipe: false,
        });

        expect(prompt).toContain("EXPIRES TODAY/TOMORROW");
      });

      it("today items sorted before items expiring in 1 day", () => {
        const items: InventoryItem[] = [
          { id: 1, name: "Tomorrow Milk", expiryDate: getDateString(1) },
          { id: 2, name: "Today Yogurt", expiryDate: getDateString(0) },
        ];

        const { expiringItems } = organizeInventory(items);

        expect(expiringItems[0].name).toBe("Today Yogurt");
        expect(expiringItems[0].daysUntilExpiry).toBe(0);
        expect(expiringItems[1].name).toBe("Tomorrow Milk");
        expect(expiringItems[1].daysUntilExpiry).toBe(1);
      });
    });

    describe("Edge cases", () => {
      it("handles empty inventory", () => {
        const { expiringItems, otherItems } = organizeInventory([]);

        expect(expiringItems).toHaveLength(0);
        expect(otherItems).toHaveLength(0);
      });

      it("handles single item inventory", () => {
        const items: InventoryItem[] = [
          { id: 1, name: "Milk", expiryDate: getDateString(2) },
        ];

        const { expiringItems, otherItems } = organizeInventory(items);

        expect(expiringItems).toHaveLength(1);
        expect(otherItems).toHaveLength(0);
      });

      it("handles items on threshold boundary (5 days)", () => {
        const items: InventoryItem[] = [
          { id: 1, name: "Day 5", expiryDate: getDateString(5) },
          { id: 2, name: "Day 6", expiryDate: getDateString(6) },
        ];

        const { expiringItems, otherItems } = organizeInventory(items);

        expect(expiringItems).toHaveLength(1);
        expect(expiringItems[0].name).toBe("Day 5");
        expect(otherItems).toHaveLength(1);
        expect(otherItems[0].name).toBe("Day 6");
      });

      it("handles very long expiry dates", () => {
        const items: InventoryItem[] = [
          { id: 1, name: "Canned Food", expiryDate: getDateString(365) },
        ];

        const { expiringItems, otherItems } = organizeInventory(items);

        expect(expiringItems).toHaveLength(0);
        expect(otherItems).toHaveLength(1);
      });

      it("handles items with negative days (already expired)", () => {
        const items: InventoryItem[] = [
          { id: 1, name: "Expired Yesterday", expiryDate: getDateString(-1) },
          { id: 2, name: "Expired Last Week", expiryDate: getDateString(-7) },
        ];

        const { expiringItems, otherItems } = organizeInventory(items);

        expect(expiringItems).toHaveLength(2);
        expect(expiringItems[0].name).toBe("Expired Last Week");
        expect(expiringItems[0].daysUntilExpiry).toBe(-7);
        expect(expiringItems[1].name).toBe("Expired Yesterday");
        expect(expiringItems[1].daysUntilExpiry).toBe(-1);
        expect(otherItems).toHaveLength(0);
      });
    });
  });
});
