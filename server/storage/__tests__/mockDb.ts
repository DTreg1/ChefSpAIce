/**
 * Database Mocking Utilities for Storage Layer Unit Tests
 *
 * Provides mock implementations for database operations to enable
 * isolated unit testing of storage classes without actual database connections.
 */

export interface MockQueryResult<T = unknown> {
  rows: T[];
  rowCount: number;
}

export interface MockDbConfig {
  selectResult?: unknown[];
  insertResult?: unknown[];
  updateResult?: unknown[];
  deleteResult?: { rowCount: number };
  shouldThrow?: Error;
}

export interface MockFn<T = unknown, Args extends unknown[] = unknown[]> {
  (...args: Args): T;
  mock: {
    calls: Args[];
    results: { type: "return" | "throw"; value: unknown }[];
  };
  mockClear(): MockFn<T, Args>;
  mockReset(): MockFn<T, Args>;
  mockImplementation(fn: (...args: Args) => T): MockFn<T, Args>;
  mockReturnValue(value: T): MockFn<T, Args>;
  mockReturnThis(): MockFn<T, Args>;
  mockResolvedValue(value: unknown): MockFn<T, Args>;
  mockRejectedValue(value: unknown): MockFn<T, Args>;
}

/**
 * Creates a mock function similar to Jest's jest.fn()
 */
export function createMockFn<T = unknown, Args extends unknown[] = unknown[]>(
  implementation?: (...args: Args) => T,
): MockFn<T, Args> {
  const calls: Args[] = [];
  const results: { type: "return" | "throw"; value: unknown }[] = [];
  let mockImplementation = implementation;
  let mockReturnValue: T | undefined;
  let mockResolvedValue: unknown;
  let mockRejectedValue: unknown;

  const mockFn = function (this: unknown, ...args: Args): T {
    calls.push(args);
    try {
      let result: T;
      if (mockRejectedValue !== undefined) {
        result = Promise.reject(mockRejectedValue) as T;
      } else if (mockResolvedValue !== undefined) {
        result = Promise.resolve(mockResolvedValue) as T;
      } else if (mockReturnValue !== undefined) {
        result = mockReturnValue;
      } else if (mockImplementation) {
        result = mockImplementation.apply(this, args);
      } else {
        result = undefined as T;
      }
      results.push({ type: "return", value: result });
      return result;
    } catch (error) {
      results.push({ type: "throw", value: error });
      throw error;
    }
  } as MockFn<T, Args>;

  mockFn.mock = { calls, results };

  mockFn.mockClear = () => {
    calls.length = 0;
    results.length = 0;
    return mockFn;
  };

  mockFn.mockReset = () => {
    mockFn.mockClear();
    mockImplementation = undefined;
    mockReturnValue = undefined;
    mockResolvedValue = undefined;
    mockRejectedValue = undefined;
    return mockFn;
  };

  mockFn.mockImplementation = (fn: (...args: Args) => T) => {
    mockImplementation = fn;
    return mockFn;
  };

  mockFn.mockReturnValue = (value: T) => {
    mockReturnValue = value;
    return mockFn;
  };

  mockFn.mockReturnThis = () => {
    mockReturnValue = mockFn as unknown as T;
    return mockFn;
  };

  mockFn.mockResolvedValue = (value: unknown) => {
    mockResolvedValue = value;
    return mockFn;
  };

  mockFn.mockRejectedValue = (value: unknown) => {
    mockRejectedValue = value;
    return mockFn;
  };

  return mockFn;
}

/**
 * Creates a mock database object that simulates drizzle-orm's query interface
 */
export function createMockDb(config: MockDbConfig = {}) {
  const createChainableMock = () => {
    const chain: Record<string, unknown> = {};

    const methods = [
      "select",
      "from",
      "where",
      "orderBy",
      "limit",
      "offset",
      "leftJoin",
      "rightJoin",
      "innerJoin",
      "groupBy",
      "having",
      "onConflictDoUpdate",
      "onConflictDoNothing",
      "values",
      "set",
    ];

    methods.forEach((method) => {
      chain[method] = createMockFn(() => chain);
    });

    chain.returning = createMockFn(() => {
      if (config.shouldThrow) {
        return Promise.reject(config.shouldThrow);
      }
      return Promise.resolve(config.insertResult || config.updateResult || []);
    });

    return chain;
  };

  const mockDb = {
    select: createMockFn(() => {
      const chain = createChainableMock();
      chain.from = createMockFn(() => {
        const fromChain = createChainableMock();
        fromChain.where = createMockFn(() => {
          if (config.shouldThrow) {
            return Promise.reject(config.shouldThrow);
          }
          return Promise.resolve(config.selectResult || []);
        });
        return fromChain;
      });
      return chain;
    }),

    insert: createMockFn(() => {
      const chain = createChainableMock();
      chain.values = createMockFn(() => {
        const valuesChain = createChainableMock();
        valuesChain.returning = createMockFn(() => {
          if (config.shouldThrow) {
            return Promise.reject(config.shouldThrow);
          }
          return Promise.resolve(config.insertResult || []);
        });
        valuesChain.onConflictDoUpdate = createMockFn(() => valuesChain);
        return valuesChain;
      });
      return chain;
    }),

    update: createMockFn(() => {
      const chain = createChainableMock();
      chain.set = createMockFn(() => {
        const setChain = createChainableMock();
        setChain.where = createMockFn(() => {
          const whereChain = createChainableMock();
          whereChain.returning = createMockFn(() => {
            if (config.shouldThrow) {
              return Promise.reject(config.shouldThrow);
            }
            return Promise.resolve(config.updateResult || []);
          });
          return whereChain;
        });
        return setChain;
      });
      return chain;
    }),

    delete: createMockFn(() => {
      const chain = createChainableMock();
      chain.where = createMockFn(() => {
        if (config.shouldThrow) {
          return Promise.reject(config.shouldThrow);
        }
        return Promise.resolve(config.deleteResult || { rowCount: 1 });
      });
      return chain;
    }),

    execute: createMockFn(),
  };

  return mockDb;
}

/**
 * Creates a mock user object for testing
 */
export function createMockUser(overrides: Record<string, unknown> = {}) {
  return {
    id: "test-user-id",
    email: "test@example.com",
    firstName: "Test",
    lastName: "User",
    profileImageUrl: null,
    primaryProvider: "email",
    primaryProviderId: null,
    googleId: null,
    appleId: null,
    dietaryRestrictions: [],
    allergens: [],
    foodsToAvoid: [],
    favoriteCategories: [],
    householdSize: 2,
    cookingSkillLevel: "beginner",
    preferredUnits: "imperial",
    expirationAlertDays: 3,
    storageAreasEnabled: ["Fridge", "Pantry"],
    hasCompletedOnboarding: false,
    notificationsEnabled: false,
    notifyExpiringFood: true,
    notifyRecipeSuggestions: false,
    notifyMealReminders: true,
    notificationTime: "09:00",
    isAdmin: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Creates a mock recipe object for testing
 */
export function createMockRecipe(overrides: Record<string, unknown> = {}) {
  return {
    id: "test-recipe-id",
    userId: "test-user-id",
    title: "Test Recipe",
    description: "A test recipe description",
    ingredients: ["ingredient1", "ingredient2"],
    instructions: ["Step 1", "Step 2"],
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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Creates a mock meal plan object for testing
 */
export function createMockMealPlan(overrides: Record<string, unknown> = {}) {
  return {
    id: "test-meal-plan-id",
    userId: "test-user-id",
    recipeId: "test-recipe-id",
    date: "2024-01-15",
    mealType: "dinner",
    servings: 4,
    isCompleted: false,
    notes: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Creates a mock session object for testing
 */
export function createMockSession(overrides: Record<string, unknown> = {}) {
  return {
    sid: "test-session-id",
    sess: {
      cookie: { originalMaxAge: 86400000 },
      passport: { user: "test-user-id" },
    },
    expire: new Date(Date.now() + 86400000),
    ...overrides,
  };
}

/**
 * Creates a mock inventory item for testing
 */
export function createMockInventoryItem(
  overrides: Record<string, unknown> = {},
) {
  return {
    id: "test-inventory-id",
    userId: "test-user-id",
    name: "Test Food Item",
    category: "produce",
    quantity: 2,
    unit: "pieces",
    storageLocation: "Fridge",
    expirationDate: new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    purchaseDate: new Date().toISOString(),
    notes: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Creates a mock donation object for testing
 */
export function createMockDonation(overrides: Record<string, unknown> = {}) {
  return {
    id: "test-donation-id",
    userId: "test-user-id",
    amount: 1000,
    currency: "usd",
    status: "completed",
    stripePaymentIntentId: "pi_test123",
    stripeCustomerId: "cus_test123",
    message: "Test donation",
    isAnonymous: false,
    createdAt: new Date(),
    completedAt: new Date(),
    ...overrides,
  };
}

/**
 * Creates a mock ticket object for testing
 */
export function createMockTicket(overrides: Record<string, unknown> = {}) {
  return {
    id: "test-ticket-id",
    userId: "test-user-id",
    subject: "Test support ticket",
    description: "Test ticket description",
    status: "open",
    priority: "medium",
    category: "general",
    assignedTo: null,
    resolvedAt: null,
    resolution: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Creates a mock pricing rule for testing
 */
export function createMockPricingRule(overrides: Record<string, unknown> = {}) {
  return {
    id: "test-rule-id",
    name: "Test Rule",
    productId: "product-123",
    type: "percentage",
    value: 10,
    isActive: true,
    priority: 1,
    conditions: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Creates a mock A/B test for testing
 */
export function createMockAbTest(overrides: Record<string, unknown> = {}) {
  return {
    id: "test-ab-test-id",
    name: "Test A/B Test",
    description: "Test description",
    status: "active",
    variants: ["control", "treatment"],
    trafficAllocation: { control: 50, treatment: 50 },
    startDate: new Date(),
    endDate: null,
    createdBy: "admin-user-id",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export { createMockFn as mockFn };
