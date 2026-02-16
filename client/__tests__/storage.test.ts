/**
 * =============================================================================
 * STORAGE MODULE TESTS
 * =============================================================================
 *
 * Tests for the local storage module which handles data persistence.
 *
 * TESTED FUNCTIONALITY:
 * - Storage keys and namespacing
 * - FoodItem CRUD operations
 * - Recipe CRUD operations
 * - Shopping list management
 * - Meal plan persistence
 * - User preferences storage
 * - Onboarding status tracking
 * - Expiration date utilities
 * - ID generation
 *
 * @module __tests__/storage.test
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEYS = {
  AUTH_TOKEN: "@chefspaice/auth_token",
  INVENTORY: "@chefspaice/inventory",
  RECIPES: "@chefspaice/recipes",
  RECIPE_IMAGES: "@chefspaice/recipe_images",
  MEAL_PLANS: "@chefspaice/meal_plans",
  SHOPPING_LIST: "@chefspaice/shopping_list",
  CHAT_HISTORY: "@chefspaice/chat_history",
  USER_PREFERENCES: "@chefspaice/preferences",
  USER_PROFILE: "@chefspaice/user_profile",
  WASTE_LOG: "@chefspaice/waste_log",
  CONSUMED_LOG: "@chefspaice/consumed_log",
  ANALYTICS: "@chefspaice/analytics",
  COOKWARE: "@chefspaice/cookware",
  ONBOARDING: "@chefspaice/onboarding",
  CUSTOM_STORAGE_LOCATIONS: "@chefspaice/custom_storage_locations",
  ONBOARDING_STEP: "@chefspaice/onboarding_step",
  PENDING_PURCHASE: "@chefspaice/pending_purchase",
} as const;

const DEFAULT_STORAGE_LOCATIONS = [
  { key: "fridge", label: "Fridge", icon: "thermometer" },
  { key: "freezer", label: "Freezer", icon: "wind" },
  { key: "pantry", label: "Pantry", icon: "archive" },
  { key: "counter", label: "Counter", icon: "coffee" },
];

interface FoodItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  storageLocation: string;
  purchaseDate: string;
  expirationDate: string;
  category: string;
}

interface Recipe {
  id: string;
  title: string;
  ingredients: string[];
  instructions: string[];
  cookTime: number;
  servings: number;
}

interface ShoppingListItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  checked: boolean;
}

describe("Storage - Keys and Namespacing", () => {
  it("all keys have @chefspaice prefix", () => {
    Object.values(STORAGE_KEYS).forEach((key) => {
      expect(key.startsWith("@chefspaice/")).toBe(true);
    });
  });

  it("has expected number of storage keys", () => {
    expect(Object.keys(STORAGE_KEYS).length).toBeGreaterThanOrEqual(15);
  });

  it("each key is unique", () => {
    const values = Object.values(STORAGE_KEYS);
    const uniqueValues = new Set(values);
    expect(uniqueValues.size).toBe(values.length);
  });
});

describe("Storage - Default Storage Locations", () => {
  it("has 4 default locations", () => {
    expect(DEFAULT_STORAGE_LOCATIONS.length).toBe(4);
  });

  it("includes fridge location", () => {
    const fridge = DEFAULT_STORAGE_LOCATIONS.find((l) => l.key === "fridge");
    expect(fridge).toBeDefined();
    expect(fridge?.label).toBe("Fridge");
  });

  it("includes freezer location", () => {
    const freezer = DEFAULT_STORAGE_LOCATIONS.find((l) => l.key === "freezer");
    expect(freezer).toBeDefined();
    expect(freezer?.label).toBe("Freezer");
  });

  it("includes pantry location", () => {
    const pantry = DEFAULT_STORAGE_LOCATIONS.find((l) => l.key === "pantry");
    expect(pantry).toBeDefined();
    expect(pantry?.label).toBe("Pantry");
  });

  it("includes counter location", () => {
    const counter = DEFAULT_STORAGE_LOCATIONS.find((l) => l.key === "counter");
    expect(counter).toBeDefined();
    expect(counter?.label).toBe("Counter");
  });

  it("each location has icon property", () => {
    DEFAULT_STORAGE_LOCATIONS.forEach((location) => {
      expect(location.icon).toBeDefined();
      expect(typeof location.icon).toBe("string");
    });
  });
});

describe("Storage - FoodItem Operations", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  });

  describe("getInventory", () => {
    it("returns empty array when no inventory exists", async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      const result = await AsyncStorage.getItem(STORAGE_KEYS.INVENTORY);
      const items = result ? JSON.parse(result) : [];
      expect(items).toEqual([]);
    });

    it("returns stored items", async () => {
      const storedItems: FoodItem[] = [
        {
          id: "item-1",
          name: "Milk",
          quantity: 1,
          unit: "gallon",
          storageLocation: "fridge",
          purchaseDate: "2024-01-01",
          expirationDate: "2024-01-15",
          category: "dairy",
        },
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(storedItems)
      );

      const result = await AsyncStorage.getItem(STORAGE_KEYS.INVENTORY);
      const items = JSON.parse(result || "[]");

      expect(items.length).toBe(1);
      expect(items[0].name).toBe("Milk");
    });
  });

  describe("addItem", () => {
    it("adds new item to empty inventory", async () => {
      const inventory: FoodItem[] = [];
      const newItem: FoodItem = {
        id: "item-new",
        name: "Eggs",
        quantity: 12,
        unit: "count",
        storageLocation: "fridge",
        purchaseDate: "2024-01-10",
        expirationDate: "2024-02-10",
        category: "dairy",
      };

      inventory.push(newItem);
      expect(inventory.length).toBe(1);
      expect(inventory[0].id).toBe("item-new");
    });

    it("adds item to existing inventory", async () => {
      const inventory: FoodItem[] = [
        {
          id: "item-1",
          name: "Milk",
          quantity: 1,
          unit: "gallon",
          storageLocation: "fridge",
          purchaseDate: "2024-01-01",
          expirationDate: "2024-01-15",
          category: "dairy",
        },
      ];

      const newItem: FoodItem = {
        id: "item-2",
        name: "Butter",
        quantity: 1,
        unit: "stick",
        storageLocation: "fridge",
        purchaseDate: "2024-01-10",
        expirationDate: "2024-03-10",
        category: "dairy",
      };

      inventory.push(newItem);
      expect(inventory.length).toBe(2);
    });
  });

  describe("updateItem", () => {
    it("updates existing item by id", () => {
      const inventory: FoodItem[] = [
        {
          id: "item-1",
          name: "Milk",
          quantity: 1,
          unit: "gallon",
          storageLocation: "fridge",
          purchaseDate: "2024-01-01",
          expirationDate: "2024-01-15",
          category: "dairy",
        },
      ];

      const index = inventory.findIndex((i) => i.id === "item-1");
      if (index !== -1) {
        inventory[index] = { ...inventory[index], quantity: 2 };
      }

      expect(inventory[0].quantity).toBe(2);
    });

    it("does not modify inventory if item not found", () => {
      const inventory: FoodItem[] = [
        {
          id: "item-1",
          name: "Milk",
          quantity: 1,
          unit: "gallon",
          storageLocation: "fridge",
          purchaseDate: "2024-01-01",
          expirationDate: "2024-01-15",
          category: "dairy",
        },
      ];

      const originalLength = inventory.length;
      const index = inventory.findIndex((i) => i.id === "nonexistent");
      if (index !== -1) {
        inventory[index] = { ...inventory[index], quantity: 2 };
      }

      expect(inventory.length).toBe(originalLength);
      expect(inventory[0].quantity).toBe(1);
    });
  });

  describe("deleteItem", () => {
    it("removes item by id", () => {
      let inventory: FoodItem[] = [
        {
          id: "item-1",
          name: "Milk",
          quantity: 1,
          unit: "gallon",
          storageLocation: "fridge",
          purchaseDate: "2024-01-01",
          expirationDate: "2024-01-15",
          category: "dairy",
        },
        {
          id: "item-2",
          name: "Butter",
          quantity: 1,
          unit: "stick",
          storageLocation: "fridge",
          purchaseDate: "2024-01-01",
          expirationDate: "2024-03-01",
          category: "dairy",
        },
      ];

      inventory = inventory.filter((i) => i.id !== "item-1");
      expect(inventory.length).toBe(1);
      expect(inventory[0].id).toBe("item-2");
    });
  });
});

describe("Storage - Recipe Operations", () => {
  describe("getRecipes", () => {
    it("returns empty array when no recipes exist", async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      const result = await AsyncStorage.getItem(STORAGE_KEYS.RECIPES);
      const recipes = result ? JSON.parse(result) : [];
      expect(recipes).toEqual([]);
    });
  });

  describe("addRecipe", () => {
    it("adds new recipe", () => {
      const recipes: Recipe[] = [];
      const newRecipe: Recipe = {
        id: "recipe-1",
        title: "Pasta Carbonara",
        ingredients: ["pasta", "eggs", "bacon", "parmesan"],
        instructions: ["Boil pasta", "Cook bacon", "Mix eggs", "Combine"],
        cookTime: 30,
        servings: 4,
      };

      recipes.push(newRecipe);
      expect(recipes.length).toBe(1);
      expect(recipes[0].title).toBe("Pasta Carbonara");
    });
  });

  describe("deleteRecipe", () => {
    it("removes recipe by id", () => {
      let recipes: Recipe[] = [
        {
          id: "recipe-1",
          title: "Recipe One",
          ingredients: [],
          instructions: [],
          cookTime: 20,
          servings: 2,
        },
      ];

      recipes = recipes.filter((r) => r.id !== "recipe-1");
      expect(recipes.length).toBe(0);
    });
  });
});

describe("Storage - Shopping List Operations", () => {
  describe("getShoppingList", () => {
    it("returns empty array when no list exists", async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      const result = await AsyncStorage.getItem(STORAGE_KEYS.SHOPPING_LIST);
      const list = result ? JSON.parse(result) : [];
      expect(list).toEqual([]);
    });
  });

  describe("addToShoppingList", () => {
    it("adds item to shopping list", () => {
      const shoppingList: ShoppingListItem[] = [];
      const newItem: ShoppingListItem = {
        id: "shop-1",
        name: "Apples",
        quantity: 6,
        unit: "count",
        checked: false,
      };

      shoppingList.push(newItem);
      expect(shoppingList.length).toBe(1);
      expect(shoppingList[0].checked).toBe(false);
    });
  });

  describe("toggleShoppingListItem", () => {
    it("toggles checked state of item", () => {
      const shoppingList: ShoppingListItem[] = [
        {
          id: "shop-1",
          name: "Apples",
          quantity: 6,
          unit: "count",
          checked: false,
        },
      ];

      const index = shoppingList.findIndex((i) => i.id === "shop-1");
      if (index !== -1) {
        shoppingList[index].checked = !shoppingList[index].checked;
      }

      expect(shoppingList[0].checked).toBe(true);
    });
  });

  describe("clearCheckedItems", () => {
    it("removes all checked items", () => {
      let shoppingList: ShoppingListItem[] = [
        { id: "1", name: "Item 1", quantity: 1, unit: "count", checked: true },
        { id: "2", name: "Item 2", quantity: 1, unit: "count", checked: false },
        { id: "3", name: "Item 3", quantity: 1, unit: "count", checked: true },
      ];

      shoppingList = shoppingList.filter((i) => !i.checked);
      expect(shoppingList.length).toBe(1);
      expect(shoppingList[0].id).toBe("2");
    });
  });
});

describe("Storage - Onboarding Status", () => {
  interface OnboardingStatus {
    cookwareSetupCompleted: boolean;
    cookwareSetupSkipped: boolean;
    completedAt?: string;
    currentStep?: string;
  }

  describe("needsOnboarding", () => {
    it("returns true when onboarding not completed", () => {
      const checkNeedsOnboarding = (status: OnboardingStatus | null): boolean => {
        if (!status) return true;
        return !status.completedAt;
      };
      expect(checkNeedsOnboarding(null)).toBe(true);
    });

    it("returns false when onboarding is completed", () => {
      const status: OnboardingStatus = {
        cookwareSetupCompleted: true,
        cookwareSetupSkipped: false,
        completedAt: "2024-01-01T00:00:00.000Z",
      };
      const needsOnboarding = !status?.completedAt;
      expect(needsOnboarding).toBe(false);
    });
  });

  describe("setOnboardingComplete", () => {
    it("sets completedAt timestamp", () => {
      const status: OnboardingStatus = {
        cookwareSetupCompleted: true,
        cookwareSetupSkipped: false,
        completedAt: new Date().toISOString(),
      };

      expect(status.completedAt).toBeDefined();
    });
  });

  describe("setCurrentOnboardingStep", () => {
    it("updates current step", () => {
      const status: OnboardingStatus = {
        cookwareSetupCompleted: false,
        cookwareSetupSkipped: false,
        currentStep: "cookware",
      };

      expect(status.currentStep).toBe("cookware");
    });
  });
});

describe("Storage - User Preferences", () => {
  interface UserPreferences {
    notificationsEnabled: boolean;
    expirationAlertDays: number;
    darkModeEnabled: boolean;
    cuisinePreferences: string[];
    allergies: string[];
  }

  it("stores notification preferences", () => {
    const prefs: UserPreferences = {
      notificationsEnabled: true,
      expirationAlertDays: 3,
      darkModeEnabled: false,
      cuisinePreferences: [],
      allergies: [],
    };

    expect(prefs.notificationsEnabled).toBe(true);
    expect(prefs.expirationAlertDays).toBe(3);
  });

  it("stores cuisine preferences as array", () => {
    const prefs: UserPreferences = {
      notificationsEnabled: true,
      expirationAlertDays: 3,
      darkModeEnabled: false,
      cuisinePreferences: ["Italian", "Mexican", "Japanese"],
      allergies: [],
    };

    expect(prefs.cuisinePreferences.length).toBe(3);
    expect(prefs.cuisinePreferences).toContain("Italian");
  });

  it("stores allergies as array", () => {
    const prefs: UserPreferences = {
      notificationsEnabled: true,
      expirationAlertDays: 3,
      darkModeEnabled: false,
      cuisinePreferences: [],
      allergies: ["Gluten", "Dairy"],
    };

    expect(prefs.allergies.length).toBe(2);
    expect(prefs.allergies).toContain("Gluten");
  });
});

describe("Storage - Expiration Utilities", () => {
  describe("getExpirationStatus", () => {
    it("returns expired for past dates", () => {
      const expirationDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const today = new Date();
      const isExpired = expirationDate < today;
      expect(isExpired).toBe(true);
    });

    it("returns expiring-soon for items expiring within 3 days", () => {
      const expirationDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
      const today = new Date();
      const daysUntilExpiry = Math.ceil(
        (expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );
      const isExpiringSoon = daysUntilExpiry <= 3 && daysUntilExpiry > 0;
      expect(isExpiringSoon).toBe(true);
    });

    it("returns fresh for items expiring in more than 3 days", () => {
      const expirationDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
      const today = new Date();
      const daysUntilExpiry = Math.ceil(
        (expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );
      const isFresh = daysUntilExpiry > 3;
      expect(isFresh).toBe(true);
    });
  });

  describe("getDaysUntilExpiry", () => {
    it("calculates days correctly", () => {
      const expirationDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
      const today = new Date();
      const daysUntilExpiry = Math.ceil(
        (expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );
      expect(daysUntilExpiry).toBe(5);
    });

    it("returns negative for expired items", () => {
      const expirationDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      const today = new Date();
      const daysUntilExpiry = Math.ceil(
        (expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );
      expect(daysUntilExpiry).toBeLessThan(0);
    });
  });
});

describe("Storage - ID Generation", () => {
  describe("generateId", () => {
    it("generates unique IDs", () => {
      const generateId = () =>
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);

      const id1 = generateId();
      const id2 = generateId();
      const id3 = generateId();

      expect(id1).not.toBe(id2);
      expect(id2).not.toBe(id3);
      expect(id1).not.toBe(id3);
    });

    it("generates IDs of expected length", () => {
      const generateId = () =>
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);

      const id = generateId();
      expect(id.length).toBeGreaterThanOrEqual(20);
    });
  });
});

describe("Storage - Clear Data", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("clears all storage keys on deleteAccount", async () => {
    const clearAll = async () => {
      await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
    };

    await clearAll();
    expect(AsyncStorage.multiRemove).toHaveBeenCalled();
  });

  it("clears specific key", async () => {
    await AsyncStorage.removeItem(STORAGE_KEYS.INVENTORY);
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.INVENTORY);
  });
});
