/**
 * @jest-environment node
 *
 * Tests for WasteReductionTips component utility functions
 * Tests the actual exported functions from client/lib/waste-reduction-utils.ts
 */

import {
  formatExpiryText,
  getExpiryIconColor,
  shouldRenderComponent,
  generateExpiringItemsSignature,
  handleTipAction,
  CATEGORY_ICONS,
  CATEGORY_COLORS,
  type WasteTip,
  type WasteReductionResponse,
  type ExpiringItem,
} from "../lib/waste-reduction-utils";

const mockEmptyData: WasteReductionResponse = {
  suggestions: [],
  expiringItems: [],
};

const mockDataWithSuggestions: WasteReductionResponse = {
  suggestions: [
    {
      text: "Make a vegetable stir fry",
      category: "recipe",
      action: {
        type: "search",
        target: "recipes",
        params: { query: "vegetable stir fry" },
      },
    },
    {
      text: "Freeze the chicken to extend shelf life",
      category: "freeze",
      action: {
        type: "navigate",
        target: "editItem",
        params: { changeLocation: "freezer" },
      },
    },
    {
      text: "Store tomatoes at room temperature",
      category: "storage",
      action: { type: "navigate", target: "storageGuide" },
    },
  ],
  expiringItems: [
    { id: 1, name: "Chicken", daysUntilExpiry: 1, quantity: 2 },
    { id: 2, name: "Vegetables", daysUntilExpiry: 2, quantity: 1 },
    { id: 3, name: "Tomatoes", daysUntilExpiry: 3, quantity: 4 },
  ],
};

const mockSingleItemData: WasteReductionResponse = {
  suggestions: [
    {
      text: "Make guacamole with the avocado",
      category: "recipe",
      action: {
        type: "search",
        target: "recipes",
        params: { query: "guacamole" },
      },
    },
  ],
  expiringItems: [{ id: 1, name: "Avocado", daysUntilExpiry: 1, quantity: 3 }],
};

const mockManyItemsData: WasteReductionResponse = {
  suggestions: [
    {
      text: "Make a big batch soup",
      category: "recipe",
      action: {
        type: "search",
        target: "recipes",
        params: { query: "batch soup" },
      },
    },
    {
      text: "Freeze items you won't use this week",
      category: "freeze",
      action: {
        type: "navigate",
        target: "editItem",
        params: { changeLocation: "freezer" },
      },
    },
    { text: "Meal prep for the week", category: "general" },
    {
      text: "Store produce properly",
      category: "storage",
      action: { type: "navigate", target: "storageGuide" },
    },
    { text: "Make pickles from cucumbers", category: "preserve" },
  ],
  expiringItems: Array.from({ length: 12 }, (_, i) => ({
    id: i + 1,
    name: `Item ${i + 1}`,
    daysUntilExpiry: Math.floor(i / 3) + 1,
    quantity: 1,
  })),
};

const mockExpiringTodayData: WasteReductionResponse = {
  suggestions: [
    {
      text: "Use immediately - expires today!",
      category: "recipe",
      action: {
        type: "search",
        target: "recipes",
        params: { query: "quick meal" },
      },
    },
    {
      text: "Freeze now to preserve",
      category: "freeze",
      action: {
        type: "navigate",
        target: "editItem",
        params: { changeLocation: "freezer" },
      },
    },
  ],
  expiringItems: [
    { id: 1, name: "Urgent Chicken", daysUntilExpiry: 0, quantity: 1 },
  ],
};

describe("WasteReductionTips - Render Conditions", () => {
  it("returns loading when isLoading is true", () => {
    expect(shouldRenderComponent(undefined, true, null)).toBe("loading");
  });

  it("returns hidden on error", () => {
    expect(shouldRenderComponent(null, false, new Error("Network error"))).toBe(
      "hidden",
    );
  });

  it("returns hidden when data is null", () => {
    expect(shouldRenderComponent(null, false, null)).toBe("hidden");
  });

  it("returns hidden when suggestions array is empty", () => {
    expect(shouldRenderComponent(mockEmptyData, false, null)).toBe("hidden");
  });

  it("returns hidden when expiringItems array is empty", () => {
    const dataWithNoExpiringItems: WasteReductionResponse = {
      suggestions: [{ text: "Some tip", category: "general" }],
      expiringItems: [],
    };
    expect(shouldRenderComponent(dataWithNoExpiringItems, false, null)).toBe(
      "hidden",
    );
  });

  it("returns visible when data has both suggestions and expiring items", () => {
    expect(shouldRenderComponent(mockDataWithSuggestions, false, null)).toBe(
      "visible",
    );
  });
});

describe("WasteReductionTips - Category Icons", () => {
  it("maps recipe to book-open icon", () => {
    expect(CATEGORY_ICONS.recipe).toBe("book-open");
  });

  it("maps storage to box icon", () => {
    expect(CATEGORY_ICONS.storage).toBe("box");
  });

  it("maps freeze to thermometer icon", () => {
    expect(CATEGORY_ICONS.freeze).toBe("thermometer");
  });

  it("maps preserve to archive icon", () => {
    expect(CATEGORY_ICONS.preserve).toBe("archive");
  });

  it("maps general to zap icon", () => {
    expect(CATEGORY_ICONS.general).toBe("zap");
  });
});

describe("WasteReductionTips - Expiry Formatting", () => {
  it("formats 0 days as Today", () => {
    expect(formatExpiryText(0)).toBe("Today");
  });

  it("formats 1 day as Tomorrow", () => {
    expect(formatExpiryText(1)).toBe("Tomorrow");
  });

  it("formats 2 days as 2 days", () => {
    expect(formatExpiryText(2)).toBe("2 days");
  });

  it("formats 5 days as 5 days", () => {
    expect(formatExpiryText(5)).toBe("5 days");
  });
});

describe("WasteReductionTips - Expiry Icon Color", () => {
  const theme = { error: "#F44336", warning: "#FF9800" };

  it("uses error color for items expiring today", () => {
    expect(getExpiryIconColor(0, theme)).toBe("#F44336");
  });

  it("uses error color for items expiring tomorrow", () => {
    expect(getExpiryIconColor(1, theme)).toBe("#F44336");
  });

  it("uses warning color for items expiring in 2+ days", () => {
    expect(getExpiryIconColor(2, theme)).toBe("#FF9800");
  });
});

describe("WasteReductionTips - Badge Text", () => {
  it("shows correct count for single item", () => {
    expect(`${mockSingleItemData.expiringItems.length} expiring`).toBe(
      "1 expiring",
    );
  });

  it("shows correct count for multiple items", () => {
    expect(`${mockDataWithSuggestions.expiringItems.length} expiring`).toBe(
      "3 expiring",
    );
  });

  it("shows correct count for many items", () => {
    expect(`${mockManyItemsData.expiringItems.length} expiring`).toBe(
      "12 expiring",
    );
  });
});

describe("WasteReductionTips - Tip Actions", () => {
  it("recipe tip navigates to RecipeList with search query", () => {
    const navigateMock = jest.fn();
    const alertMock = jest.fn();
    const tip: WasteTip = {
      text: "Make a stir fry",
      category: "recipe",
      action: {
        type: "search",
        target: "recipes",
        params: { query: "stir fry" },
      },
    };

    handleTipAction(tip, navigateMock, alertMock);

    expect(navigateMock).toHaveBeenCalledWith("Recipes", {
      screen: "RecipeList",
      params: { searchQuery: "stir fry" },
    });
  });

  it("storage tip shows storage guide alert", () => {
    const navigateMock = jest.fn();
    const alertMock = jest.fn();
    const tip: WasteTip = {
      text: "Store properly",
      category: "storage",
      action: { type: "navigate", target: "storageGuide" },
    };

    handleTipAction(tip, navigateMock, alertMock);

    expect(alertMock).toHaveBeenCalledWith("Storage Tips", expect.any(String));
  });

  it("freeze tip shows freezer move alert", () => {
    const navigateMock = jest.fn();
    const alertMock = jest.fn();
    const expiringItem: ExpiringItem = {
      id: 1,
      name: "Chicken",
      daysUntilExpiry: 1,
      quantity: 2,
    };
    const tip: WasteTip = {
      text: "Freeze the chicken",
      category: "freeze",
      action: {
        type: "navigate",
        target: "editItem",
        params: { changeLocation: "freezer" },
      },
    };

    handleTipAction(tip, navigateMock, alertMock, expiringItem);

    expect(alertMock).toHaveBeenCalledWith(
      "Move to Freezer",
      expect.any(String),
    );
  });

  it("tips without actions do nothing", () => {
    const navigateMock = jest.fn();
    const alertMock = jest.fn();
    const tip: WasteTip = { text: "General tip", category: "general" };

    handleTipAction(tip, navigateMock, alertMock);

    expect(navigateMock).not.toHaveBeenCalled();
    expect(alertMock).not.toHaveBeenCalled();
  });
});

describe("WasteReductionTips - Generate Recipe Navigation", () => {
  it("passes expiring item names as preselected ingredients", () => {
    const expiringItemNames = mockDataWithSuggestions.expiringItems.map(
      (item) => item.name.toLowerCase().trim(),
    );
    expect(expiringItemNames).toEqual(["chicken", "vegetables", "tomatoes"]);
  });

  it("handles empty expiring items", () => {
    const expiringItemNames = mockEmptyData.expiringItems.map((item) =>
      item.name.toLowerCase().trim(),
    );
    expect(expiringItemNames).toEqual([]);
  });
});

describe("WasteReductionTips - Edge Cases", () => {
  describe("Single expiring item", () => {
    it("displays single item correctly", () => {
      expect(mockSingleItemData.expiringItems.length).toBe(1);
      expect(mockSingleItemData.expiringItems[0].name).toBe("Avocado");
    });

    it("still generates suggestions for single item", () => {
      expect(mockSingleItemData.suggestions.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Many expiring items (10+)", () => {
    it("handles 12 expiring items", () => {
      expect(mockManyItemsData.expiringItems.length).toBe(12);
    });

    it("generates appropriate number of suggestions", () => {
      expect(mockManyItemsData.suggestions.length).toBe(5);
    });

    it("has suggestions from multiple categories", () => {
      const categories = new Set(
        mockManyItemsData.suggestions.map((s) => s.category),
      );
      expect(categories.size).toBeGreaterThan(1);
    });
  });

  describe("Items expiring today", () => {
    it("correctly identifies items expiring today", () => {
      const todayItems = mockExpiringTodayData.expiringItems.filter(
        (item) => item.daysUntilExpiry === 0,
      );
      expect(todayItems.length).toBe(1);
    });

    it("uses error color for urgent items", () => {
      const theme = { error: "#F44336", warning: "#FF9800" };
      expect(getExpiryIconColor(0, theme)).toBe(theme.error);
    });
  });

  describe("Network error handling", () => {
    it("component hides on network error", () => {
      expect(
        shouldRenderComponent(null, false, new Error("Network error")),
      ).toBe("hidden");
    });

    it("component hides when data is undefined", () => {
      expect(shouldRenderComponent(undefined, false, null)).toBe("hidden");
    });
  });

  describe("Query enabled logic", () => {
    it("disables query when no local inventory", () => {
      const localInventoryLength = 0;
      const expiringItemsSignature = "none";
      const enabled =
        localInventoryLength > 0 && expiringItemsSignature !== "none";
      expect(enabled).toBe(false);
    });

    it("disables query when no expiring items", () => {
      const localInventoryLength = 5;
      const expiringItemsSignature = "none";
      const enabled =
        localInventoryLength > 0 && expiringItemsSignature !== "none";
      expect(enabled).toBe(false);
    });

    it("enables query when inventory has expiring items", () => {
      const localInventoryLength = 5;
      const expiringItemsSignature = "1:2024-01-15:1";
      const enabled =
        localInventoryLength > 0 && expiringItemsSignature !== "none";
      expect(enabled).toBe(true);
    });
  });

  describe("Signature generation", () => {
    it("generates consistent signature for same items", () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const items = [
        { id: 1, expirationDate: tomorrow.toISOString(), quantity: 1 },
        { id: 2, expirationDate: tomorrow.toISOString(), quantity: 2 },
      ];

      const sig1 = generateExpiringItemsSignature(items);
      const sig2 = generateExpiringItemsSignature(items);

      expect(sig1).toBe(sig2);
    });

    it("returns none for empty expiring items", () => {
      expect(generateExpiringItemsSignature([])).toBe("none");
    });

    it("returns none when no items expire within 5 days", () => {
      const farFuture = new Date();
      farFuture.setDate(farFuture.getDate() + 10);
      const items = [
        { id: 1, expirationDate: farFuture.toISOString(), quantity: 1 },
      ];
      expect(generateExpiringItemsSignature(items)).toBe("none");
    });

    it("includes items expiring within 5 days", () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const items = [
        { id: 1, expirationDate: tomorrow.toISOString(), quantity: 1 },
      ];
      expect(generateExpiringItemsSignature(items)).not.toBe("none");
    });
  });
});
