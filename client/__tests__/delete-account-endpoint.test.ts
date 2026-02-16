/**
 * =============================================================================
 * DELETE ACCOUNT ENDPOINT TESTS
 * =============================================================================
 *
 * Regression tests for the bug where SettingsScreen used the wrong endpoint
 * path `/api/auth/account` instead of `/api/auth/delete-account` for account
 * deletion. This caused 404 errors when users tried to delete their account.
 *
 * THE BUG:
 * - SettingsScreen sent DELETE to `/api/auth/account`
 * - The server registered the route at `/api/auth/delete-account`
 * - Mismatched paths meant account deletion silently failed
 *
 * THE FIX:
 * - SettingsScreen now uses `/api/auth/delete-account`
 * - storage.deleteAccount() clears all @chefspaice/ keys from local storage
 * - signOut is called after deletion (not manual reload)
 *
 * @module __tests__/delete-account-endpoint.test
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

import * as fs from "fs";
import * as path from "path";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { storage } from "@/lib/storage";

const CORRECT_DELETE_ENDPOINT = "/api/auth/delete-account";
const WRONG_DELETE_ENDPOINT = "/api/auth/account";

describe("Delete account endpoint correctness", () => {
  describe("server route definition", () => {
    let authRouterSource: string;

    beforeAll(() => {
      const routerPath = path.resolve(
        __dirname,
        "../../server/routers/auth.router.ts",
      );
      authRouterSource = fs.readFileSync(routerPath, "utf-8");
    });

    it("server defines DELETE /delete-account route", () => {
      expect(authRouterSource).toMatch(
        /router\.delete\(\s*["']\/delete-account["']/,
      );
    });

    it("the delete-account route path matches expected endpoint", () => {
      const routeMatch = authRouterSource.match(
        /router\.delete\(\s*["'](\/delete-account)["']/,
      );
      expect(routeMatch).not.toBeNull();
      expect(`/api/auth${routeMatch![1]}`).toBe(CORRECT_DELETE_ENDPOINT);
    });
  });

  describe("client endpoint usage", () => {
    let settingsSource: string;

    beforeAll(() => {
      const settingsPath = path.resolve(
        __dirname,
        "../screens/SettingsScreen.tsx",
      );
      settingsSource = fs.readFileSync(settingsPath, "utf-8");
    });

    it("SettingsScreen uses the correct /api/auth/delete-account endpoint", () => {
      expect(settingsSource).toContain("/api/auth/delete-account");
    });

    it("SettingsScreen does NOT use the wrong /api/auth/account endpoint for deletion", () => {
      const wrongEndpointUsages = settingsSource.match(
        /\/api\/auth\/account(?![\w-])/g,
      );
      expect(wrongEndpointUsages).toBeNull();
    });

    it("SettingsScreen calls storage.deleteAccount() after server deletion", () => {
      expect(settingsSource).toMatch(/storage\.deleteAccount\(\)/);
    });
  });
});

describe("storage.deleteAccount() clears all local data", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("removes all @chefspaice/ prefixed keys from AsyncStorage", async () => {
    const keysToSeed = [
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
      "@chefspaice/onboarding",
      "@chefspaice/auth_token",
    ];

    for (const key of keysToSeed) {
      await AsyncStorage.setItem(key, JSON.stringify({ data: "test" }));
    }

    const keysBefore = await AsyncStorage.getAllKeys();
    expect(keysBefore.length).toBe(keysToSeed.length);

    await storage.deleteAccount();

    const keysAfter = await AsyncStorage.getAllKeys();
    const remainingAppKeys = keysAfter.filter((k) =>
      k.startsWith("@chefspaice/"),
    );
    expect(remainingAppKeys).toEqual([]);
  });

  it("leaves non-app keys intact", async () => {
    await AsyncStorage.setItem(
      "@chefspaice/recipes",
      JSON.stringify([{ id: "r1" }]),
    );
    await AsyncStorage.setItem("some_other_app_key", "other_value");

    await storage.deleteAccount();

    const otherValue = await AsyncStorage.getItem("some_other_app_key");
    expect(otherValue).toBe("other_value");
  });

  it("getRecipes returns empty array after deleteAccount", async () => {
    await AsyncStorage.setItem(
      "@chefspaice/recipes",
      JSON.stringify([
        {
          id: "r1",
          title: "Pasta",
          description: "",
          ingredients: [],
          instructions: [],
          prepTime: 10,
          cookTime: 20,
          servings: 2,
          isFavorite: false,
          isAIGenerated: false,
          createdAt: new Date().toISOString(),
        },
      ]),
    );

    const before = await storage.getRecipes();
    expect(before.length).toBe(1);

    await storage.deleteAccount();

    const after = await storage.getRecipes();
    expect(after).toEqual([]);
  });

  it("getInventory returns empty array after deleteAccount", async () => {
    await AsyncStorage.setItem(
      "@chefspaice/inventory",
      JSON.stringify([
        {
          id: "i1",
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

    const before = await storage.getInventory();
    expect(before.length).toBe(1);

    await storage.deleteAccount();

    const after = await storage.getInventory();
    expect(after).toEqual([]);
  });
});
