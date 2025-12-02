/**
 * Integration Test Utilities
 * 
 * Provides utilities for integration testing the storage layer:
 * - Unique ID generation for test isolation
 * - Test data factories with cleanup tracking
 * - Database cleanup utilities
 * - Test context management
 */

import { db } from "../../../db";
import { 
  users, 
  userRecipes, 
  mealPlans, 
  userInventory,
  sessions,
  userStorage as userStorageTable,
} from "@shared/schema";
import { eq, like, sql } from "drizzle-orm";
import { randomBytes } from "crypto";

const TEST_PREFIX = "test_";

/**
 * Generates a unique test ID with timestamp and random suffix
 */
export function generateTestId(): string {
  const timestamp = Date.now().toString(36);
  const random = randomBytes(4).toString('hex');
  return `${TEST_PREFIX}${timestamp}_${random}`;
}

/**
 * Generates a unique test email
 */
export function generateTestEmail(): string {
  return `${generateTestId()}@test.example.com`;
}

/**
 * TestContext tracks all test data created during a test session
 * for cleanup purposes
 */
export class TestContext {
  private userIds: string[] = [];
  private recipeIds: string[] = [];
  private mealPlanIds: string[] = [];
  private inventoryIds: string[] = [];
  private sessionIds: string[] = [];
  private storageIds: string[] = [];

  trackUser(id: string): void {
    this.userIds.push(id);
  }

  trackRecipe(id: string): void {
    this.recipeIds.push(id);
  }

  trackMealPlan(id: string): void {
    this.mealPlanIds.push(id);
  }

  trackInventory(id: string): void {
    this.inventoryIds.push(id);
  }

  trackSession(id: string): void {
    this.sessionIds.push(id);
  }

  trackStorage(id: string): void {
    this.storageIds.push(id);
  }

  /**
   * Cleans up all tracked test data in reverse order of dependencies
   */
  async cleanup(): Promise<void> {
    const errors: Error[] = [];

    try {
      if (this.mealPlanIds.length > 0) {
        for (const id of this.mealPlanIds) {
          await db.delete(mealPlans).where(eq(mealPlans.id, id)).catch(e => errors.push(e));
        }
      }
    } catch (e) {
      errors.push(e instanceof Error ? e : new Error(String(e)));
    }

    try {
      if (this.recipeIds.length > 0) {
        for (const id of this.recipeIds) {
          await db.delete(userRecipes).where(eq(userRecipes.id, id)).catch(e => errors.push(e));
        }
      }
    } catch (e) {
      errors.push(e instanceof Error ? e : new Error(String(e)));
    }

    try {
      if (this.inventoryIds.length > 0) {
        for (const id of this.inventoryIds) {
          await db.delete(userInventory).where(eq(userInventory.id, id)).catch(e => errors.push(e));
        }
      }
    } catch (e) {
      errors.push(e instanceof Error ? e : new Error(String(e)));
    }

    try {
      if (this.storageIds.length > 0) {
        for (const id of this.storageIds) {
          await db.delete(userStorageTable).where(eq(userStorageTable.id, id)).catch(e => errors.push(e));
        }
      }
    } catch (e) {
      errors.push(e instanceof Error ? e : new Error(String(e)));
    }

    try {
      if (this.sessionIds.length > 0) {
        for (const id of this.sessionIds) {
          await db.delete(sessions).where(eq(sessions.sid, id)).catch(e => errors.push(e));
        }
      }
    } catch (e) {
      errors.push(e instanceof Error ? e : new Error(String(e)));
    }

    try {
      if (this.userIds.length > 0) {
        for (const id of this.userIds) {
          await db.delete(users).where(eq(users.id, id)).catch(e => errors.push(e));
        }
      }
    } catch (e) {
      errors.push(e instanceof Error ? e : new Error(String(e)));
    }

    if (errors.length > 0) {
      console.warn(`Cleanup encountered ${errors.length} errors:`, errors.map(e => e.message));
    }
  }
}

/**
 * Test data factories
 */
export const testFactories = {
  user: (ctx: TestContext, overrides: Record<string, unknown> = {}) => ({
    email: generateTestEmail(),
    firstName: "Test",
    lastName: "User",
    primaryProvider: "email" as const,
    dietaryRestrictions: [] as string[],
    allergens: [] as string[],
    foodsToAvoid: [] as string[],
    favoriteCategories: [] as string[],
    householdSize: 2,
    cookingSkillLevel: "beginner",
    preferredUnits: "imperial",
    expirationAlertDays: 3,
    storageAreasEnabled: ["Fridge", "Pantry"] as string[],
    hasCompletedOnboarding: false,
    notificationsEnabled: false,
    notifyExpiringFood: true,
    notifyRecipeSuggestions: false,
    notifyMealReminders: true,
    notificationTime: "09:00",
    isAdmin: false,
    ...overrides,
  }),

  recipe: (userId: string, overrides: Record<string, unknown> = {}) => ({
    userId,
    title: `Test Recipe ${generateTestId()}`,
    description: "A test recipe for integration testing",
    ingredients: ["ingredient1", "ingredient2", "ingredient3"] as string[],
    instructions: ["Step 1", "Step 2", "Step 3"] as string[],
    prepTime: 15,
    cookTime: 30,
    servings: 4,
    category: "main",
    cuisine: "american",
    difficulty: "easy",
    source: "manual",
    rating: null,
    isFavorite: false,
    imageUrl: null,
    ...overrides,
  }),

  mealPlan: (userId: string, recipeId: string | null, overrides: Record<string, unknown> = {}) => ({
    userId,
    recipeId,
    date: new Date().toISOString().split('T')[0],
    mealType: "dinner",
    servings: 4,
    isCompleted: false,
    notes: null,
    ...overrides,
  }),

  inventoryItem: (userId: string, overrides: Record<string, unknown> = {}) => ({
    userId,
    name: `Test Item ${generateTestId()}`,
    category: "produce",
    quantity: 2,
    unit: "pieces",
    storageLocation: "Fridge",
    expirationDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    purchaseDate: new Date().toISOString().split('T')[0],
    notes: null,
    ...overrides,
  }),

  session: (overrides: Record<string, unknown> = {}) => ({
    sid: generateTestId(),
    sess: {
      cookie: { originalMaxAge: 86400000 },
      passport: { user: generateTestId() },
    },
    expire: new Date(Date.now() + 86400000),
    ...overrides,
  }),
};

/**
 * Verifies database connection is available
 */
export async function verifyDatabaseConnection(): Promise<boolean> {
  try {
    await db.execute(sql`SELECT 1`);
    return true;
  } catch (error) {
    console.error("Database connection failed:", error);
    return false;
  }
}

/**
 * Cleans up any orphaned test data from previous test runs
 * Uses the TEST_PREFIX to identify test data
 */
export async function cleanupOrphanedTestData(): Promise<void> {
  try {
    await db.delete(mealPlans).where(like(mealPlans.id, `${TEST_PREFIX}%`));
    await db.delete(userRecipes).where(like(userRecipes.id, `${TEST_PREFIX}%`));
    await db.delete(userInventory).where(like(userInventory.id, `${TEST_PREFIX}%`));
    await db.delete(sessions).where(like(sessions.sid, `${TEST_PREFIX}%`));
    await db.delete(users).where(like(users.email, `${TEST_PREFIX}%`));
  } catch (error) {
    console.warn("Failed to cleanup orphaned test data:", error);
  }
}

/**
 * Waits for async operations to complete
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Assertion helpers for integration tests
 */
export const assertions = {
  isValidId(id: unknown): boolean {
    return typeof id === 'string' && id.length > 0;
  },

  isValidDate(date: unknown): boolean {
    if (date instanceof Date) return !isNaN(date.getTime());
    if (typeof date === 'string') return !isNaN(Date.parse(date));
    return false;
  },

  hasRequiredFields(obj: Record<string, unknown>, fields: string[]): boolean {
    return fields.every(field => field in obj && obj[field] !== undefined);
  },
};

console.log('Integration test utilities loaded successfully');
