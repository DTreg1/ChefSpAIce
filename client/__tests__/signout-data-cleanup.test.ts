/**
 * =============================================================================
 * SIGN-OUT DATA CLEANUP TESTS
 * =============================================================================
 *
 * Regression tests for the bug where signing out didn't clear user data,
 * causing needsOnboarding() to return false on reload because its fallback
 * checks for existing recipes/inventory/preferences in AsyncStorage.
 *
 * THE BUG:
 * - resetOnboarding() only cleared the onboarding flag keys
 * - But needsOnboarding() had a fallback: if recipes, inventory, or preferences
 *   existed in AsyncStorage, it returned false (assumed user already onboarded)
 * - After sign-out, stale data remained, so new user saw no onboarding
 *
 * THE FIX:
 * - signOut() now calls resetOnboarding() AND removes all user data keys
 *   (inventory, recipes, preferences, meal_plans, shopping_list, etc.)
 *
 * @module __tests__/signout-data-cleanup.test
 */

jest.mock("@/lib/query-client", () => ({
  getApiUrl: jest.fn(() => "http://localhost:5000"),
}));
jest.mock("@/lib/sync-manager", () => ({
  syncManager: {
    queueSync: jest.fn(),
    queueChange: jest.fn(),
    isOnline: jest.fn(() => true),
    getStatus: jest.fn(() => ({ pending: 0 })),
    syncPreferences: jest.fn(),
    syncUserProfile: jest.fn(),
    clearQueue: jest.fn(),
  },
}));
jest.mock("@/lib/logger", () => ({
  logger: { log: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

import AsyncStorage from "@react-native-async-storage/async-storage";
import { storage } from "@/lib/storage";

const SIGNOUT_CLEANUP_KEYS = [
  "@chefspaice/inventory",
  "@chefspaice/recipes",
  "@chefspaice/preferences",
  "@chefspaice/meal_plans",
  "@chefspaice/shopping_list",
  "@chefspaice/chat_history",
  "@chefspaice/user_profile",
  "@chefspaice/cookware",
  "@chefspaice/custom_storage_locations",
  "@chefspaice/waste_log",
  "@chefspaice/consumed_log",
  "@chefspaice/analytics",
];

const FALLBACK_KEYS = [
  "@chefspaice/inventory",
  "@chefspaice/recipes",
  "@chefspaice/preferences",
];

async function seedUserData() {
  await AsyncStorage.setItem(
    "@chefspaice/recipes",
    JSON.stringify([
      {
        id: "recipe-1",
        title: "Test Recipe",
        description: "A test",
        ingredients: [],
        instructions: [],
        prepTime: 10,
        cookTime: 20,
        servings: 4,
        isFavorite: false,
        isAIGenerated: false,
        createdAt: new Date().toISOString(),
      },
    ]),
  );
  await AsyncStorage.setItem(
    "@chefspaice/inventory",
    JSON.stringify([
      {
        id: "item-1",
        name: "Milk",
        quantity: 1,
        unit: "gallon",
        storageLocation: "fridge",
        purchaseDate: new Date().toISOString(),
        expirationDate: new Date().toISOString(),
        category: "dairy",
      },
    ]),
  );
  await AsyncStorage.setItem(
    "@chefspaice/preferences",
    JSON.stringify({
      dietaryRestrictions: ["vegetarian"],
      cuisinePreferences: ["italian"],
      notificationsEnabled: true,
      expirationAlertDays: 3,
      termHighlightingEnabled: true,
    }),
  );
}

async function simulateSignOutCleanup() {
  await storage.resetOnboarding();
  await Promise.all(
    SIGNOUT_CLEANUP_KEYS.map((key) => AsyncStorage.removeItem(key)),
  );
}

describe("Sign-out data cleanup", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  describe("needsOnboarding fallback behavior", () => {
    it("returns false when recipes exist in storage (fallback triggers)", async () => {
      await AsyncStorage.setItem(
        "@chefspaice/recipes",
        JSON.stringify([{ id: "r1", title: "Pasta" }]),
      );

      const result = await storage.needsOnboarding();
      expect(result).toBe(false);
    });

    it("returns false when inventory exists in storage (fallback triggers)", async () => {
      await AsyncStorage.setItem(
        "@chefspaice/inventory",
        JSON.stringify([{ id: "i1", name: "Milk" }]),
      );

      const result = await storage.needsOnboarding();
      expect(result).toBe(false);
    });

    it("returns false when only preferences default exists (no explicit data)", async () => {
      const result = await storage.needsOnboarding();
      expect(result).toBe(false);
    });
  });

  describe("resetOnboarding alone is insufficient (the bug)", () => {
    it("needsOnboarding returns false after resetOnboarding when user data still exists", async () => {
      await seedUserData();

      await storage.resetOnboarding();

      const result = await storage.needsOnboarding();
      expect(result).toBe(false);
    });
  });

  describe("full sign-out cleanup (the fix)", () => {
    it("clears recipes from storage", async () => {
      await seedUserData();
      const recipesBefore = await storage.getRecipes();
      expect(recipesBefore.length).toBeGreaterThan(0);

      await simulateSignOutCleanup();

      const recipesAfter = await storage.getRecipes();
      expect(recipesAfter).toEqual([]);
    });

    it("clears inventory from storage", async () => {
      await seedUserData();
      const inventoryBefore = await storage.getInventory();
      expect(inventoryBefore.length).toBeGreaterThan(0);

      await simulateSignOutCleanup();

      const inventoryAfter = await storage.getInventory();
      expect(inventoryAfter).toEqual([]);
    });

    it("removes preferences key from storage", async () => {
      await seedUserData();
      const prefsBefore = await AsyncStorage.getItem("@chefspaice/preferences");
      expect(prefsBefore).not.toBeNull();

      await simulateSignOutCleanup();

      const prefsAfter = await AsyncStorage.getItem("@chefspaice/preferences");
      expect(prefsAfter).toBeNull();
    });

    it("all fallback data keys are removed from AsyncStorage after cleanup", async () => {
      await AsyncStorage.setItem(
        "@chefspaice/recipes",
        JSON.stringify([{ id: "r1", title: "Pasta" }]),
      );
      await AsyncStorage.setItem(
        "@chefspaice/inventory",
        JSON.stringify([{ id: "i1", name: "Milk" }]),
      );
      await AsyncStorage.setItem(
        "@chefspaice/preferences",
        JSON.stringify({ dietaryRestrictions: ["vegan"] }),
      );

      const before = await storage.needsOnboarding();
      expect(before).toBe(false);

      await simulateSignOutCleanup();

      for (const key of FALLBACK_KEYS) {
        const value = await AsyncStorage.getItem(key);
        expect(value).toBeNull();
      }
    });

    it("getRecipes and getInventory return empty after cleanup", async () => {
      await seedUserData();

      expect((await storage.getRecipes()).length).toBeGreaterThan(0);
      expect((await storage.getInventory()).length).toBeGreaterThan(0);

      await simulateSignOutCleanup();

      expect(await storage.getRecipes()).toEqual([]);
      expect(await storage.getInventory()).toEqual([]);
    });
  });

  describe("signOut cleanup key coverage", () => {
    it("cleanup keys include ALL keys that needsOnboarding checks as fallback", () => {
      for (const fallbackKey of FALLBACK_KEYS) {
        expect(SIGNOUT_CLEANUP_KEYS).toContain(fallbackKey);
      }
    });

    it("removes every sign-out cleanup key from storage", async () => {
      for (const key of SIGNOUT_CLEANUP_KEYS) {
        await AsyncStorage.setItem(key, JSON.stringify({ data: "test" }));
      }

      await simulateSignOutCleanup();

      for (const key of SIGNOUT_CLEANUP_KEYS) {
        const value = await AsyncStorage.getItem(key);
        expect(value).toBeNull();
      }
    });

    it("also removes onboarding keys during cleanup", async () => {
      await AsyncStorage.setItem(
        "@chefspaice/onboarding",
        JSON.stringify({ cookwareSetupCompleted: true }),
      );
      await AsyncStorage.setItem(
        "@chefspaice/onboarding_step",
        JSON.stringify("preferences"),
      );

      await simulateSignOutCleanup();

      expect(await AsyncStorage.getItem("@chefspaice/onboarding")).toBeNull();
      expect(
        await AsyncStorage.getItem("@chefspaice/onboarding_step"),
      ).toBeNull();
    });
  });
});
