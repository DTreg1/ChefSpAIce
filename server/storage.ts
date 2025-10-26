// Referenced from blueprint:javascript_log_in_with_replit - Added user operations and user-scoped data
import { parallelQueries, batchInsert, QueryCache } from "./utils/batchQueries";
import {
  type User,
  type UpsertUser,
  type UserStorage,
  type UserStorage as StorageLocation,
  type InsertUserStorage,
  userStorage,
  type UserInventory,
  type InsertUserInventory,
  type UserInventory as FoodItem,
  type InsertUserInventory as InsertFoodItem,
  type ChatMessage,
  type InsertChatMessage,
  type Recipe,
  type InsertRecipe,
  type MealPlan,
  type InsertMealPlan,
  type ApiUsageLog,
  type InsertApiUsageLog,
  type FdcCache,
  type InsertFdcCache,
  type ShoppingListItem,
  type InsertShoppingListItem,
  type Feedback,
  type InsertFeedback,
  type FeedbackResponse,
  type FeedbackAnalytics,
  type Donation,
  type InsertDonation,
  type PushToken,
  type InsertPushToken,
  type WebVital,
  type InsertWebVital,
  type OnboardingInventory,
  type InsertOnboardingInventory,
  type OnboardingInventory as CommonFoodItem,
  type InsertOnboardingInventory as InsertCommonFoodItem,
  type CookingTerm,
  type InsertCookingTerm,
  type ApplianceLibrary,
  type InsertApplianceLibrary,
  type UserAppliance,
  type InsertUserAppliance,
  type UserAppliance as Appliance,
  type InsertUserAppliance as InsertAppliance,
  type InsertAnalyticsEvent,
  type AnalyticsEvent,
  type InsertUserSession,
  type UserSession,
  insertAnalyticsEventSchema,
  users,
  pushTokens,
  userAppliances,
  userInventory,
  userChats,
  userRecipes,
  mealPlans,
  apiUsageLogs,
  fdcCache,
  userShopping,
  userFeedback,
  donations,
  webVitals,
  onboardingInventory,
  cookingTerms,
  analyticsEvents,
  userSessions,
  applianceLibrary,
} from "@shared/schema";
import { db } from "./db";
import { eq, sql, and, or, desc, gte, lte } from "drizzle-orm";
import {
  matchIngredientWithInventory,
  type IngredientMatch,
} from "./utils/unitConverter";
import { PaginationHelper } from "./utils/pagination";

// Standardized pagination response format
export interface PaginatedResponse<T> {
  data: T[];           // The actual data array
  total: number;       // Total items count
  page: number;        // Current page
  totalPages: number;  // Total pages
  limit: number;       // Items per page
  offset: number;      // Current offset
}

export interface IStorage {
  // User operations - REQUIRED for Replit Auth (from blueprint:javascript_log_in_with_replit)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // User Preferences (merged into users table)
  getUserPreferences(userId: string): Promise<User | undefined>;
  updateUserPreferences(
    userId: string,
    preferences: Partial<User>,
  ): Promise<User>;

  // Push Tokens (user-scoped)
  getPushTokens(userId: string): Promise<PushToken[]>;
  upsertPushToken(
    userId: string,
    token: Omit<InsertPushToken, "userId">,
  ): Promise<PushToken>;
  deletePushToken(userId: string, token: string): Promise<void>;

  // Storage Locations (now in users.storageLocations JSONB)
  getStorageLocations(userId: string): Promise<StorageLocation[]>;
  getStorageLocation(
    userId: string,
    id: string,
  ): Promise<StorageLocation | undefined>;
  createStorageLocation(
    userId: string,
    location: Omit<StorageLocation, "id">,
  ): Promise<StorageLocation>;

  // Appliances (user-scoped)
  getAppliances(userId: string): Promise<Appliance[]>;
  getAppliance(userId: string, id: string): Promise<Appliance | undefined>;
  createAppliance(
    userId: string,
    appliance: Omit<InsertAppliance, "userId">,
  ): Promise<Appliance>;
  updateAppliance(
    userId: string,
    id: string,
    appliance: Partial<Omit<InsertAppliance, "userId">>,
  ): Promise<Appliance>;
  deleteAppliance(userId: string, id: string): Promise<void>;
  getAppliancesByCategory(
    userId: string,
    category: string,
  ): Promise<Appliance[]>;
  getAppliancesByCapability(
    userId: string,
    capability: string,
  ): Promise<Appliance[]>;

  // Appliance Library - Master catalog of all equipment
  getApplianceLibrary(): Promise<ApplianceLibrary[]>;
  getApplianceLibraryByCategory(category: string): Promise<ApplianceLibrary[]>;
  searchApplianceLibrary(query: string): Promise<ApplianceLibrary[]>;
  getCommonAppliances(): Promise<ApplianceLibrary[]>;

  // User Appliances - What equipment each user owns
  getUserAppliances(userId: string): Promise<UserAppliance[]>;
  addUserAppliance(
    userId: string,
    applianceLibraryId: string,
    details?: Partial<InsertUserAppliance>,
  ): Promise<UserAppliance>;
  updateUserAppliance(
    userId: string,
    id: string,
    updates: Partial<InsertUserAppliance>,
  ): Promise<UserAppliance>;
  deleteUserAppliance(userId: string, id: string): Promise<void>;
  getUserAppliancesByCategory(userId: string, category: string): Promise<UserAppliance[]>;

  // Barcode Products - removed (tables deleted)

  // Food Items (user-scoped)
  getFoodItems(userId: string, storageLocationId?: string, limit?: number): Promise<FoodItem[]>;
  getFoodItemsPaginated(
    userId: string,
    page?: number,
    limit?: number,
    storageLocationId?: string,
    sortBy?: "name" | "expirationDate" | "createdAt",
  ): Promise<PaginatedResponse<FoodItem>>;
  getFoodItem(userId: string, id: string): Promise<FoodItem | undefined>;
  createFoodItem(
    userId: string,
    item: Omit<InsertFoodItem, "userId">,
  ): Promise<FoodItem>;
  updateFoodItem(
    userId: string,
    id: string,
    item: Partial<Omit<InsertFoodItem, "userId">>,
  ): Promise<FoodItem>;
  deleteFoodItem(userId: string, id: string): Promise<void>;
  getFoodCategories(userId: string): Promise<string[]>;

  // Chat Messages (user-scoped)
  getChatMessages(userId: string, limit?: number): Promise<ChatMessage[]>;
  getChatMessagesPaginated(
    userId: string,
    page?: number,
    limit?: number,
  ): Promise<PaginatedResponse<ChatMessage>>;
  createChatMessage(
    userId: string,
    message: Omit<InsertChatMessage, "userId">,
  ): Promise<ChatMessage>;

  // Recipes (user-scoped)
  getRecipes(
    userId: string, 
    filters?: {
      isFavorite?: boolean;
      search?: string;
      cuisine?: string;
      difficulty?: string;
      maxCookTime?: number;
    },
    limit?: number
  ): Promise<Recipe[]>;
  getRecipesPaginated(
    userId: string,
    page?: number,
    limit?: number,
  ): Promise<PaginatedResponse<Recipe>>;
  getRecipe(userId: string, id: string): Promise<Recipe | undefined>;
  createRecipe(
    userId: string,
    recipe: Omit<InsertRecipe, "userId">,
  ): Promise<Recipe>;
  updateRecipe(
    userId: string,
    id: string,
    updates: Partial<Recipe>,
  ): Promise<Recipe>;
  getRecipesWithInventoryMatching(
    userId: string,
  ): Promise<Array<Recipe & { ingredientMatches: any[] }>>;

  // Expiration Handling (now in userInventory table)
  getExpiringItems(userId: string, daysThreshold: number): Promise<FoodItem[]>;
  dismissFoodItemNotification(
    userId: string,
    foodItemId: string,
  ): Promise<void>;

  // Meal Plans (user-scoped)
  getMealPlans(
    userId: string,
    startDate?: string,
    endDate?: string,
    mealType?: string,
    date?: string,
  ): Promise<MealPlan[]>;
  getMealPlan(userId: string, id: string): Promise<MealPlan | undefined>;
  createMealPlan(
    userId: string,
    plan: Omit<InsertMealPlan, "userId">,
  ): Promise<MealPlan>;
  updateMealPlan(
    userId: string,
    id: string,
    updates: Partial<Omit<InsertMealPlan, "userId">>,
  ): Promise<MealPlan>;
  deleteMealPlan(userId: string, id: string): Promise<void>;

  // API Usage Logs (user-scoped)
  logApiUsage(
    userId: string,
    log: Omit<InsertApiUsageLog, "userId">,
  ): Promise<ApiUsageLog>;
  getApiUsageLogs(
    userId: string,
    apiName?: string,
    limit?: number,
  ): Promise<ApiUsageLog[]>;
  getApiUsageStats(
    userId: string,
    apiName: string,
    days?: number,
  ): Promise<{
    totalCalls: number;
    successfulCalls: number;
    failedCalls: number;
  }>;

  // FDC Cache Methods
  getCachedFood(fdcId: string | number): Promise<FdcCache | undefined>;
  cacheFood(food: InsertFdcCache): Promise<FdcCache>;
  updateFoodLastAccessed(fdcId: string): Promise<void>;
  clearOldCache(daysOld: number): Promise<void>;
  
  // Cache Stats Methods
  getUSDACacheStats(): Promise<{ totalEntries: number; oldestEntry: Date | null }>;
  
  // Common Food Items (onboarding inventory)
  getCommonFoodItems(): Promise<CommonFoodItem[]>;

  // Shopping List Items (user-scoped)
  getShoppingListItems(userId: string, limit?: number): Promise<ShoppingListItem[]>;
  getGroupedShoppingListItems(userId: string): Promise<{
    items: ShoppingListItem[];
    grouped: Record<string, ShoppingListItem[]>;
    totalItems: number;
    checkedItems: number;
  }>;
  createShoppingListItem(
    userId: string,
    item: Omit<InsertShoppingListItem, "userId">,
  ): Promise<ShoppingListItem>;
  updateShoppingListItem(
    userId: string,
    id: string,
    updates: Partial<Omit<InsertShoppingListItem, "userId">>,
  ): Promise<ShoppingListItem>;
  deleteShoppingListItem(userId: string, id: string): Promise<void>;
  clearCheckedShoppingListItems(userId: string): Promise<void>;
  addMissingIngredientsToShoppingList(
    userId: string,
    recipeId: string,
    ingredients: string[],
  ): Promise<ShoppingListItem[]>;

  // Account Management
  resetUserData(userId: string): Promise<void>;

  // Feedback System (consolidated with upvotes and responses in JSONB)
  createFeedback(
    userId: string,
    feedbackData: Omit<InsertFeedback, "userId"> & {
      isFlagged?: boolean;
      flagReason?: string | null;
      similarTo?: string | null;
    },
  ): Promise<Feedback>;
  getFeedback(userId: string, id: string): Promise<Feedback | undefined>;
  getUserFeedback(userId: string, limit?: number): Promise<Feedback[]>;
  getAllFeedback(
    page?: number,
    limit?: number,
    status?: string,
  ): Promise<PaginatedResponse<Feedback>>;
  getCommunityFeedback(
    type?: string,
    sortBy?: "upvotes" | "recent",
    limit?: number,
  ): Promise<Array<Feedback & { userUpvoted: boolean }>>;
  getCommunityFeedbackForUser(
    userId: string,
    type?: string,
    sortBy?: "upvotes" | "recent",
    limit?: number,
  ): Promise<Array<Feedback & { userUpvoted: boolean }>>;
  updateFeedbackStatus(
    id: string,
    status: string,
    estimatedTurnaround?: string,
    resolvedAt?: Date,
  ): Promise<Feedback>;
  addFeedbackResponse(
    feedbackId: string,
    response: FeedbackResponse,
  ): Promise<Feedback>;
  getFeedbackResponses(feedbackId: string): Promise<FeedbackResponse[]>;
  getFeedbackAnalytics(
    userId?: string,
    days?: number,
  ): Promise<FeedbackAnalytics>;
  getFeedbackByContext(
    contextId: string,
    contextType: string,
  ): Promise<Feedback[]>;

  // Feedback Upvotes (now in userFeedback.upvotes JSONB)
  upvoteFeedback(userId: string, feedbackId: string): Promise<void>;
  removeUpvote(userId: string, feedbackId: string): Promise<void>;
  hasUserUpvoted(userId: string, feedbackId: string): Promise<boolean>;
  getFeedbackUpvoteCount(feedbackId: string): Promise<number>;

  // Donation System (from blueprint:javascript_stripe)
  createDonation(
    donation: Omit<InsertDonation, "id" | "createdAt" | "completedAt">,
  ): Promise<Donation>;
  updateDonation(
    stripePaymentIntentId: string,
    updates: Partial<Donation>,
  ): Promise<Donation>;
  getDonation(id: string): Promise<Donation | undefined>;
  getDonationByPaymentIntent(
    stripePaymentIntentId: string,
  ): Promise<Donation | undefined>;
  getDonations(
    limit?: number,
    offset?: number,
  ): Promise<{ donations: Donation[]; total: number }>;
  getUserDonations(userId: string, limit?: number): Promise<Donation[]>;
  getTotalDonations(): Promise<{ totalAmount: number; donationCount: number }>;

  // Web Vitals Analytics
  recordWebVital(
    vital: Omit<InsertWebVital, "id" | "createdAt">,
  ): Promise<WebVital>;
  getWebVitals(
    limit?: number,
    offset?: number,
  ): Promise<{ vitals: WebVital[]; total: number }>;
  getWebVitalsByMetric(metricName: string, limit?: number): Promise<WebVital[]>;
  getWebVitalsStats(
    metricName?: string,
    days?: number,
  ): Promise<{
    average: number;
    p75: number;
    p95: number;
    count: number;
    goodCount: number;
    needsImprovementCount: number;
    poorCount: number;
  }>;

  // Cooking Terms
  getCookingTerms(): Promise<CookingTerm[]>;
  getCookingTerm(id: string): Promise<CookingTerm | undefined>;
  getCookingTermByTerm(term: string): Promise<CookingTerm | undefined>;
  getCookingTermsByCategory(category: string): Promise<CookingTerm[]>;
  createCookingTerm(term: InsertCookingTerm): Promise<CookingTerm>;
  updateCookingTerm(id: string, term: Partial<InsertCookingTerm>): Promise<CookingTerm>;
  deleteCookingTerm(id: string): Promise<void>;
  searchCookingTerms(searchText: string): Promise<CookingTerm[]>;

  // Analytics Events
  recordAnalyticsEvent(event: InsertAnalyticsEvent): Promise<AnalyticsEvent>;
  recordAnalyticsEventsBatch(events: InsertAnalyticsEvent[]): Promise<AnalyticsEvent[]>;
  getAnalyticsEvents(
    userId?: string,
    filters?: {
      eventType?: string;
      eventCategory?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    }
  ): Promise<AnalyticsEvent[]>;

  // User Sessions
  createUserSession(session: InsertUserSession): Promise<UserSession>;
  updateUserSession(sessionId: string, update: Partial<InsertUserSession>): Promise<UserSession>;
  getUserSessions(
    userId?: string,
    filters?: {
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    }
  ): Promise<UserSession[]>;
  getAnalyticsStats(
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalEvents: number;
    uniqueUsers: number;
    totalSessions: number;
    avgSessionDuration: number;
    topEvents: Array<{ eventType: string; count: number }>;
    topCategories: Array<{ eventCategory: string; count: number }>;
    conversionRate: number;
  }>;
}

// Simple cache interface
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

export class DatabaseStorage implements IStorage {
  private userInitialized = new Set<string>();
  private initializationPromises = new Map<string, Promise<void>>();
  private initializationLock = new Map<string, boolean>(); // Mutex for atomic operations
  
  // Cache for frequently accessed data
  private cache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly USER_PREFS_TTL = 10 * 60 * 1000; // 10 minutes for user preferences
  
  // Cache management methods
  private getCached<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }
  
  private setCached<T>(key: string, data: T, ttl: number = this.DEFAULT_CACHE_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }
  
  private invalidateCache(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }
    
    // Remove all cache entries that match the pattern
    const keysToDelete: string[] = [];
    this.cache.forEach((_, key) => {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  private async ensureDefaultDataForUser(userId: string) {
    // Fast path: already initialized
    if (this.userInitialized.has(userId)) return;

    // Atomic check-and-set operation
    let shouldInitialize = false;
    let existingPromise: Promise<void> | undefined;

    // Synchronously check and claim initialization if needed
    if (this.initializationLock.get(userId)) {
      // Another initialization is in progress, wait for it
      existingPromise = this.initializationPromises.get(userId);
    } else {
      // Check if we need to initialize
      existingPromise = this.initializationPromises.get(userId);
      if (!existingPromise && !this.userInitialized.has(userId)) {
        // Claim the lock atomically
        this.initializationLock.set(userId, true);
        shouldInitialize = true;
      }
    }

    // Wait for existing initialization if present
    if (existingPromise) {
      await existingPromise;
      return;
    }

    // Perform initialization if we claimed the lock
    if (shouldInitialize) {
      const initPromise = (async () => {
        try {
          // Double-check in case of extreme race conditions
          if (this.userInitialized.has(userId)) {
            return;
          }

          // Check if user has storage locations in the userStorage table
          const [user] = await db
            .select()
            .from(users)
            .where(eq(users.id, userId));

          if (!user) {
            throw new Error(`User ${userId} not found`);
          }

          // Check if user already has storage locations
          const existingLocations = await db
            .select()
            .from(userStorage)
            .where(eq(userStorage.userId, userId));

          if (existingLocations.length === 0) {
            // Initialize default storage locations for this user
            const defaultLocations = [
              { userId, name: "Refrigerator", icon: "refrigerator", isDefault: true, sortOrder: 1 },
              { userId, name: "Freezer", icon: "snowflake", isDefault: true, sortOrder: 2 },
              { userId, name: "Pantry", icon: "pizza", isDefault: true, sortOrder: 3 },
              { userId, name: "Counter", icon: "utensils-crossed", isDefault: true, sortOrder: 4 },
            ];

            await db.insert(userStorage).values(defaultLocations);

            // Initialize default userAppliances for this user
            const defaultAppliances = [
              { userId, name: "Oven", type: "cooking" },
              { userId, name: "Stove", type: "cooking" },
              { userId, name: "Microwave", type: "cooking" },
              { userId, name: "Air Fryer", type: "cooking" },
            ];

            await db.insert(userAppliances).values(defaultAppliances);
          }

          // Mark as initialized only on success
          this.userInitialized.add(userId);
        } catch (error) {
          console.error(
            `Failed to initialize default data for user ${userId}:`,
            error,
          );
          // Re-throw to inform callers of failure
          throw error;
        } finally {
          // Clean up the promise and lock
          this.initializationPromises.delete(userId);
          this.initializationLock.delete(userId);
        }
      })();

      // Store the promise before starting async work
      this.initializationPromises.set(userId, initPromise);

      await initPromise;
    }
  }

  // User operations - REQUIRED for Replit Auth (from blueprint:javascript_log_in_with_replit)
  async getUser(id: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user;
    } catch (error) {
      console.error(`Error getting user ${id}:`, error);
      throw new Error("Failed to retrieve user");
    }
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    try {
      // First check if a user with this email already exists
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, userData.email!));

      if (existingUser) {
        // Update the existing user (keep the same ID to avoid foreign key issues)
        const [updatedUser] = await db
          .update(users)
          .set({
            firstName: userData.firstName,
            lastName: userData.lastName,
            profileImageUrl: userData.profileImageUrl,
            updatedAt: new Date(),
          })
          .where(eq(users.id, existingUser.id))
          .returning();
        return updatedUser;
      }

      // No existing user, insert new one
      const [user] = await db
        .insert(users)
        .values(userData)
        .onConflictDoUpdate({
          target: users.id,
          set: {
            firstName: userData.firstName,
            lastName: userData.lastName,
            email: userData.email,
            profileImageUrl: userData.profileImageUrl,
            updatedAt: new Date(),
          },
        })
        .returning();
      return user;
    } catch (error: any) {
      console.error("Error upserting user:", error);
      throw new Error("Failed to save user");
    }
  }

  // User Preferences
  async getUserPreferences(userId: string): Promise<User | undefined> {
    try {
      // Check cache first
      const cacheKey = `user_prefs:${userId}`;
      const cached = this.getCached<User>(cacheKey);
      if (cached) {
        return cached;
      }
      
      // Fetch from database
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      
      // Cache the result
      if (user) {
        this.setCached(cacheKey, user, this.USER_PREFS_TTL);
      }
      
      return user;
    } catch (error) {
      console.error(`Error getting user preferences for ${userId}:`, error);
      throw new Error("Failed to retrieve user preferences");
    }
  }

  async updateUserPreferences(
    userId: string,
    preferences: Partial<User>,
  ): Promise<User> {
    try {
      // Invalidate cache for this user
      this.invalidateCache(`user_prefs:${userId}`);
      
      const [updatedUser] = await db
        .update(users)
        .set({
          ...preferences,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
        .returning();

      if (!updatedUser) {
        throw new Error("User not found");
      }
      
      // Cache the updated preferences
      const cacheKey = `user_prefs:${userId}`;
      this.setCached(cacheKey, updatedUser, this.USER_PREFS_TTL);

      return updatedUser;
    } catch (error) {
      console.error("Error updating user preferences:", error);
      throw new Error("Failed to save user preferences");
    }
  }

  async getPushTokens(userId: string): Promise<PushToken[]> {
    try {
      return await db
        .select()
        .from(pushTokens)
        .where(eq(pushTokens.userId, userId));
    } catch (error) {
      console.error("Error getting push tokens:", error);
      throw new Error("Failed to get push tokens");
    }
  }

  async upsertPushToken(
    userId: string,
    tokenData: Omit<InsertPushToken, "userId">,
  ): Promise<PushToken> {
    try {
      const insertData: any = {
        ...tokenData,
        userId,
      };

      // Type cast JSONB field if present
      if (tokenData.deviceInfo) {
        insertData.deviceInfo = tokenData.deviceInfo as {
          deviceId?: string;
          model?: string;
          osVersion?: string;
        };
      }

      const [token] = await db
        .insert(pushTokens)
        .values(insertData)
        .onConflictDoUpdate({
          target: pushTokens.token,
          set: {
            platform: tokenData.platform,
            deviceInfo: tokenData.deviceInfo as
              | { deviceId?: string; model?: string; osVersion?: string }
              | null
              | undefined,
            updatedAt: new Date(),
          },
        })
        .returning();
      return token;
    } catch (error) {
      console.error("Error upserting push token:", error);
      throw new Error("Failed to save push token");
    }
  }

  async deletePushToken(userId: string, token: string): Promise<void> {
    try {
      await db
        .delete(pushTokens)
        .where(and(eq(pushTokens.userId, userId), eq(pushTokens.token, token)));
    } catch (error) {
      console.error("Error deleting push token:", error);
      throw new Error("Failed to delete push token");
    }
  }

  // Storage Locations (now stored in userStorage table)
  async getStorageLocations(userId: string): Promise<StorageLocation[]> {
    try {
      await this.ensureDefaultDataForUser(userId);

      // Get user's storage locations from userStorage table
      const locations = await db
        .select()
        .from(userStorage)
        .where(and(eq(userStorage.userId, userId), eq(userStorage.isActive, true)))
        .orderBy(userStorage.sortOrder);

      // Get item counts for each location
      const items = await db
        .select({
          storageLocationId: userInventory.storageLocationId,
          count: sql<number>`COUNT(*)::int`,
        })
        .from(userInventory)
        .where(eq(userInventory.userId, userId))
        .groupBy(userInventory.storageLocationId);

      const countMap = new Map(
        items.map((item) => [item.storageLocationId, item.count]),
      );

      // Add itemCount to each location
      return locations.map((loc) => ({
        ...loc,
        itemCount: countMap.get(loc.id) || 0,
      }));
    } catch (error) {
      console.error(
        `Error getting storage locations for user ${userId}:`,
        error,
      );
      throw new Error("Failed to retrieve storage locations");
    }
  }

  async getStorageLocation(
    userId: string,
    id: string,
  ): Promise<StorageLocation | undefined> {
    try {
      await this.ensureDefaultDataForUser(userId);
      
      const [location] = await db
        .select()
        .from(userStorage)
        .where(and(
          eq(userStorage.userId, userId),
          eq(userStorage.id, id),
          eq(userStorage.isActive, true)
        ));

      return location;
    } catch (error) {
      console.error(`Error getting storage location ${id}:`, error);
      throw new Error("Failed to retrieve storage location");
    }
  }

  async createStorageLocation(
    userId: string,
    location: Omit<StorageLocation, "id" | "userId" | "createdAt" | "updatedAt" | "isDefault" | "isActive" | "sortOrder">,
  ): Promise<StorageLocation> {
    try {
      // Check if user exists
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user) {
        throw new Error("User not found");
      }

      // Get current max sort order for this user
      const [maxSort] = await db
        .select({ maxOrder: sql<number>`COALESCE(MAX(${userStorage.sortOrder}), 0)` })
        .from(userStorage)
        .where(eq(userStorage.userId, userId));

      // Create new storage location
      const [newLocation] = await db
        .insert(userStorage)
        .values({
          userId,
          name: location.name,
          icon: location.icon || "package",
          isDefault: false,
          isActive: true,
          sortOrder: (maxSort?.maxOrder || 0) + 1,
        })
        .returning();

      return newLocation;
    } catch (error) {
      console.error("Error creating storage location:", error);
      throw new Error("Failed to create storage location");
    }
  }

  // Appliances
  async getAppliances(userId: string): Promise<Appliance[]> {
    try {
      await this.ensureDefaultDataForUser(userId);
      return db.select().from(userAppliances).where(eq(userAppliances.userId, userId));
    } catch (error) {
      console.error(`Error getting userAppliances for user ${userId}:`, error);
      throw new Error("Failed to retrieve userAppliances");
    }
  }

  async createAppliance(
    userId: string,
    appliance: Omit<InsertAppliance, "userId">,
  ): Promise<Appliance> {
    try {
      const [newAppliance] = await db
        .insert(userAppliances)
        .values({ ...appliance, userId })
        .returning();
      return newAppliance;
    } catch (error) {
      console.error("Error creating appliance:", error);
      throw new Error("Failed to create appliance");
    }
  }

  async getAppliance(
    userId: string,
    id: string,
  ): Promise<Appliance | undefined> {
    try {
      const [appliance] = await db
        .select()
        .from(userAppliances)
        .where(and(eq(userAppliances.id, id), eq(userAppliances.userId, userId)));
      return appliance || undefined;
    } catch (error) {
      console.error(`Error getting appliance ${id}:`, error);
      throw new Error("Failed to retrieve appliance");
    }
  }

  async updateAppliance(
    userId: string,
    id: string,
    appliance: Partial<Omit<InsertAppliance, "userId">>,
  ): Promise<Appliance> {
    try {
      const [updatedAppliance] = await db
        .update(userAppliances)
        .set({ ...appliance, updatedAt: new Date() })
        .where(and(eq(userAppliances.id, id), eq(userAppliances.userId, userId)))
        .returning();
      return updatedAppliance;
    } catch (error) {
      console.error(`Error updating appliance ${id}:`, error);
      throw new Error("Failed to update appliance");
    }
  }

  async deleteAppliance(userId: string, id: string): Promise<void> {
    try {
      await db
        .delete(userAppliances)
        .where(and(eq(userAppliances.id, id), eq(userAppliances.userId, userId)));
    } catch (error) {
      console.error(`Error deleting appliance ${id}:`, error);
      throw new Error("Failed to delete appliance");
    }
  }

  async getAppliancesByCategory(
    userId: string,
    category: string,
  ): Promise<Appliance[]> {
    try {
      // Get user userAppliances that have an applianceLibraryId linked to the specified category
      const results = await db
        .select({
          appliance: userAppliances,
        })
        .from(userAppliances)
        .leftJoin(
          applianceLibrary,
          eq(userAppliances.applianceLibraryId, applianceLibrary.id)
        )
        .where(
          and(
            eq(userAppliances.userId, userId),
            eq(applianceLibrary.category, category)
          )
        );
      
      return results.map(r => r.appliance);
    } catch (error) {
      console.error(
        `Error getting userAppliances by category for user ${userId}:`,
        error,
      );
      throw new Error("Failed to retrieve userAppliances by category");
    }
  }

  async getAppliancesByCapability(
    userId: string,
    capability: string,
  ): Promise<Appliance[]> {
    try {
      const results = await db
        .select()
        .from(userAppliances)
        .where(and(eq(userAppliances.userId, userId)));

      // Filter userAppliances that have the specified capability
      return results.filter((appliance) => {
        const capabilities = appliance.customCapabilities || [];
        return capabilities.includes(capability);
      });
    } catch (error) {
      console.error(
        `Error getting userAppliances by capability for user ${userId}:`,
        error,
      );
      throw new Error("Failed to retrieve userAppliances by capability");
    }
  }


  // Appliance Library methods
  async getApplianceLibrary(): Promise<ApplianceLibrary[]> {
    try {
      return db.select().from(applianceLibrary);
    } catch (error) {
      console.error("Error getting appliance library:", error);
      throw new Error("Failed to retrieve appliance library");
    }
  }

  async getApplianceLibraryByCategory(category: string): Promise<ApplianceLibrary[]> {
    try {
      return db
        .select()
        .from(applianceLibrary)
        .where(eq(applianceLibrary.category, category));
    } catch (error) {
      console.error(`Error getting userAppliances by category ${category}:`, error);
      throw new Error("Failed to retrieve userAppliances by category");
    }
  }

  async searchApplianceLibrary(query: string): Promise<ApplianceLibrary[]> {
    try {
      const searchTerm = `%${query.toLowerCase()}%`;
      return db
        .select()
        .from(applianceLibrary)
        .where(
          sql`LOWER(${applianceLibrary.name}) LIKE ${searchTerm} OR 
               LOWER(${applianceLibrary.description}) LIKE ${searchTerm} OR
               LOWER(${applianceLibrary.subcategory}) LIKE ${searchTerm}`
        );
    } catch (error) {
      console.error(`Error searching appliance library for "${query}":`, error);
      throw new Error("Failed to search appliance library");
    }
  }

  async getCommonAppliances(): Promise<ApplianceLibrary[]> {
    try {
      return db
        .select()
        .from(applianceLibrary)
        .where(eq(applianceLibrary.isCommon, true));
    } catch (error) {
      console.error("Error getting common userAppliances:", error);
      throw new Error("Failed to retrieve common userAppliances");
    }
  }

  // User Appliances methods
  async getUserAppliances(userId: string): Promise<UserAppliance[]> {
    try {
      return db
        .select()
        .from(userAppliances)
        .where(eq(userAppliances.userId, userId));
    } catch (error) {
      console.error(`Error getting user userAppliances for ${userId}:`, error);
      throw new Error("Failed to retrieve user userAppliances");
    }
  }

  async addUserAppliance(
    userId: string,
    applianceLibraryId: string,
    details?: Partial<InsertUserAppliance>,
  ): Promise<UserAppliance> {
    try {
      // Get appliance library item to extract name if not provided in details
      const [libraryItem] = await db
        .select()
        .from(applianceLibrary)
        .where(eq(applianceLibrary.id, applianceLibraryId));
      
      const [newUserAppliance] = await db
        .insert(userAppliances)
        .values({
          userId,
          applianceLibraryId,
          name: details?.name || libraryItem?.name || 'Unknown Appliance',
          type: details?.type || libraryItem?.category,
          ...details,
        })
        .returning();
      return newUserAppliance;
    } catch (error) {
      console.error("Error adding user appliance:", error);
      throw new Error("Failed to add user appliance");
    }
  }

  async updateUserAppliance(
    userId: string,
    id: string,
    updates: Partial<InsertUserAppliance>,
  ): Promise<UserAppliance> {
    try {
      const [updated] = await db
        .update(userAppliances)
        .set({ ...updates, updatedAt: new Date() })
        .where(
          and(
            eq(userAppliances.id, id),
            eq(userAppliances.userId, userId)
          )
        )
        .returning();
      return updated;
    } catch (error) {
      console.error(`Error updating user appliance ${id}:`, error);
      throw new Error("Failed to update user appliance");
    }
  }

  async deleteUserAppliance(userId: string, id: string): Promise<void> {
    try {
      await db
        .delete(userAppliances)
        .where(
          and(
            eq(userAppliances.id, id),
            eq(userAppliances.userId, userId)
          )
        );
    } catch (error) {
      console.error(`Error deleting user appliance ${id}:`, error);
      throw new Error("Failed to delete user appliance");
    }
  }

  async getUserAppliancesByCategory(userId: string, category: string): Promise<UserAppliance[]> {
    try {
      // Join with appliance library to filter by category
      const result = await db
        .select({
          userAppliance: userAppliances,
        })
        .from(userAppliances)
        .innerJoin(
          applianceLibrary,
          eq(userAppliances.applianceLibraryId, applianceLibrary.id)
        )
        .where(
          and(
            eq(userAppliances.userId, userId),
            eq(applianceLibrary.category, category)
          )
        );
      
      return result.map(r => r.userAppliance);
    } catch (error) {
      console.error(`Error getting user userAppliances by category ${category}:`, error);
      throw new Error("Failed to retrieve user userAppliances by category");
    }
  }

  // Barcode Products - removed (tables deleted)

  // Food Items - Optimized with default limit to prevent memory issues
  async getFoodItems(
    userId: string,
    storageLocationId?: string,
    limit: number = 500, // Default limit to prevent loading thousands of items
  ): Promise<FoodItem[]> {
    try {
      if (storageLocationId) {
        return db
          .select()
          .from(userInventory)
          .where(
            and(
              eq(userInventory.storageLocationId, storageLocationId),
              eq(userInventory.userId, userId),
            ),
          )
          .orderBy(userInventory.expirationDate) // Prioritize expiring items
          .limit(limit);
      }
      return db
        .select()
        .from(userInventory)
        .where(eq(userInventory.userId, userId))
        .orderBy(userInventory.expirationDate) // Prioritize expiring items
        .limit(limit);
    } catch (error) {
      console.error(`Error getting food items for user ${userId}:`, error);
      throw new Error("Failed to retrieve food items");
    }
  }

  async getFoodItemsPaginated(
    userId: string,
    page: number = 1,
    limit: number = 30,
    storageLocationId?: string,
    sortBy: "name" | "expirationDate" | "createdAt" = "expirationDate",
  ): Promise<PaginatedResponse<FoodItem>> {
    try {
      const offset = (page - 1) * limit;

      // Build where clause
      const whereConditions = [eq(userInventory.userId, userId)];
      if (storageLocationId && storageLocationId !== "all") {
        whereConditions.push(
          eq(userInventory.storageLocationId, storageLocationId),
        );
      }

      // Get total count
      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(userInventory)
        .where(and(...whereConditions));

      const total = Number(countResult?.count || 0);

      // Determine sort order
      const orderClause =
        sortBy === "name"
          ? userInventory.name
          : sortBy === "createdAt"
            ? sql`${userInventory.createdAt} DESC`
            : userInventory.expirationDate;

      // Get paginated items
      const items = await db
        .select()
        .from(userInventory)
        .where(and(...whereConditions))
        .orderBy(orderClause)
        .limit(limit)
        .offset(offset);

      return PaginationHelper.createResponse(items, total, page, limit);
    } catch (error) {
      console.error(
        `Error getting paginated food items for user ${userId}:`,
        error,
      );
      throw new Error("Failed to retrieve food items");
    }
  }

  async getFoodItem(userId: string, id: string): Promise<FoodItem | undefined> {
    try {
      const [item] = await db
        .select()
        .from(userInventory)
        .where(and(eq(userInventory.id, id), eq(userInventory.userId, userId)));
      return item || undefined;
    } catch (error) {
      console.error(`Error getting food item ${id}:`, error);
      throw new Error("Failed to retrieve food item");
    }
  }

  async createFoodItem(
    userId: string,
    item: Omit<InsertFoodItem, "userId">,
  ): Promise<FoodItem> {
    try {
      const [newItem] = await db
        .insert(userInventory)
        .values({ ...item, userId })
        .returning();
      return newItem;
    } catch (error) {
      console.error("Error creating food item:", error);
      throw new Error("Failed to create food item");
    }
  }

  async updateFoodItem(
    userId: string,
    id: string,
    item: Partial<Omit<InsertFoodItem, "userId">>,
  ): Promise<FoodItem> {
    try {
      const [updated] = await db
        .update(userInventory)
        .set(item)
        .where(and(eq(userInventory.id, id), eq(userInventory.userId, userId)))
        .returning();

      if (!updated) {
        throw new Error("Food item not found");
      }

      return updated;
    } catch (error) {
      console.error(`Error updating food item ${id}:`, error);
      throw new Error("Failed to update food item");
    }
  }

  async deleteFoodItem(userId: string, id: string): Promise<void> {
    try {
      await db
        .delete(userInventory)
        .where(and(eq(userInventory.id, id), eq(userInventory.userId, userId)));
    } catch (error) {
      console.error(`Error deleting food item ${id}:`, error);
      throw new Error("Failed to delete food item");
    }
  }

  async getFoodCategories(userId: string): Promise<string[]> {
    try {
      const results = await db.execute<{ food_category: string }>(
        sql`SELECT DISTINCT food_category 
            FROM food_items 
            WHERE user_id = ${userId} 
              AND food_category IS NOT NULL 
            ORDER BY food_category`,
      );

      return results.rows.map((r) => r.food_category);
    } catch (error) {
      console.error(`Error getting food categories for user ${userId}:`, error);
      throw new Error("Failed to retrieve food categories");
    }
  }

  // Chat Messages - Optimized with default limit to prevent memory issues
  async getChatMessages(userId: string, limit: number = 100): Promise<ChatMessage[]> {
    try {
      return db
        .select()
        .from(userChats)
        .where(eq(userChats.userId, userId))
        .orderBy(desc(userChats.createdAt)) // Most recent first
        .limit(limit);
    } catch (error) {
      console.error(`Error getting chat messages for user ${userId}:`, error);
      throw new Error("Failed to retrieve chat messages");
    }
  }

  async getChatMessagesPaginated(
    userId: string,
    page: number = 1,
    limit: number = 50,
  ): Promise<PaginatedResponse<ChatMessage>> {
    try {
      const offset = (page - 1) * limit;

      // Get total count
      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(userChats)
        .where(eq(userChats.userId, userId));

      const total = Number(countResult?.count || 0);

      // Get paginated messages
      const messages = await db
        .select()
        .from(userChats)
        .where(eq(userChats.userId, userId))
        .orderBy(desc(userChats.createdAt))
        .limit(limit)
        .offset(offset);

      return PaginationHelper.createResponse(messages, total, page, limit);
    } catch (error) {
      console.error(
        `Error getting paginated chat messages for user ${userId}:`,
        error,
      );
      throw new Error("Failed to retrieve chat messages");
    }
  }

  async createChatMessage(
    userId: string,
    message: Omit<InsertChatMessage, "userId">,
  ): Promise<ChatMessage> {
    try {
      const messageData = {
        userId,
        role: message.role,
        content: message.content,
      };
      
      const [newMessage] = await db
        .insert(userChats)
        .values(messageData)
        .returning();
      return newMessage;
    } catch (error) {
      console.error("Error creating chat message:", error);
      throw new Error("Failed to create chat message");
    }
  }

  async clearChatMessages(userId: string): Promise<void> {
    try {
      await db.delete(userChats).where(eq(userChats.userId, userId));
    } catch (error) {
      console.error(`Error clearing chat messages for user ${userId}:`, error);
      throw new Error("Failed to clear chat messages");
    }
  }

  async deleteOldChatMessages(
    userId: string,
    hoursOld: number = 24,
  ): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setHours(cutoffDate.getHours() - hoursOld);

      const result = await db
        .delete(userChats)
        .where(
          and(
            eq(userChats.userId, userId),
            sql`${userChats.createdAt} < ${cutoffDate}`,
          ),
        )
        .returning();

      return result.length;
    } catch (error) {
      console.error(
        `Error deleting old chat messages for user ${userId}:`,
        error,
      );
      throw new Error("Failed to delete old chat messages");
    }
  }

  // Recipes - Optimized with database-level filtering
  async getRecipes(
    userId: string, 
    filters?: {
      isFavorite?: boolean;
      search?: string;
      cuisine?: string;
      difficulty?: string;
      maxCookTime?: number;
    },
    limit: number = 200
  ): Promise<Recipe[]> {
    try {
      const conditions = [eq(userRecipes.userId, userId)];
      
      // Apply filters at the database level
      if (filters?.isFavorite !== undefined) {
        conditions.push(eq(userRecipes.isFavorite, filters.isFavorite));
      }
      
      if (filters?.search) {
        const searchTerm = `%${filters.search.toLowerCase()}%`;
        conditions.push(
          or(
            sql`LOWER(${userRecipes.title}) LIKE ${searchTerm}`,
            sql`LOWER(${userRecipes.description}) LIKE ${searchTerm}`
          )!
        );
      }
      
      if (filters?.cuisine) {
        conditions.push(eq(userRecipes.cuisine, filters.cuisine));
      }
      
      if (filters?.difficulty) {
        conditions.push(eq(userRecipes.difficulty, filters.difficulty));
      }
      
      if (filters?.maxCookTime) {
        // Convert cook time string to minutes for comparison
        conditions.push(
          sql`CAST(REGEXP_REPLACE(${userRecipes.cookTime}, '[^0-9]', '', 'g') AS INTEGER) <= ${filters.maxCookTime}`
        );
      }
      
      return db
        .select()
        .from(userRecipes)
        .where(and(...conditions))
        .orderBy(sql`${userRecipes.createdAt} DESC`)
        .limit(limit);
    } catch (error) {
      console.error(`Error getting userRecipes for user ${userId}:`, error);
      throw new Error("Failed to retrieve userRecipes");
    }
  }

  async getRecipesPaginated(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedResponse<Recipe>> {
    try {
      const offset = (page - 1) * limit;

      // Get total count
      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(userRecipes)
        .where(eq(userRecipes.userId, userId));

      const total = Number(countResult?.count || 0);

      // Get paginated userRecipes
      const paginatedRecipes = await db
        .select()
        .from(userRecipes)
        .where(eq(userRecipes.userId, userId))
        .orderBy(sql`${userRecipes.createdAt} DESC`)
        .limit(limit)
        .offset(offset);

      return PaginationHelper.createResponse(paginatedRecipes, total, page, limit);
    } catch (error) {
      console.error(
        `Error getting paginated userRecipes for user ${userId}:`,
        error,
      );
      throw new Error("Failed to retrieve userRecipes");
    }
  }

  async getRecipe(userId: string, id: string): Promise<Recipe | undefined> {
    try {
      const [recipe] = await db
        .select()
        .from(userRecipes)
        .where(and(eq(userRecipes.id, id), eq(userRecipes.userId, userId)));
      return recipe || undefined;
    } catch (error) {
      console.error(`Error getting recipe ${id}:`, error);
      throw new Error("Failed to retrieve recipe");
    }
  }

  async createRecipe(
    userId: string,
    recipe: Omit<InsertRecipe, "userId">,
  ): Promise<Recipe> {
    try {
      const recipeToInsert = {
        ...recipe,
        userId,
        ingredients: Array.from(recipe.ingredients || []),
        instructions: Array.from(recipe.instructions || []),
        usedIngredients: Array.from(recipe.usedIngredients || []),
        missingIngredients: recipe.missingIngredients ? Array.from(recipe.missingIngredients) : undefined,
      };
      const [newRecipe] = await db
        .insert(userRecipes)
        .values(recipeToInsert as typeof userRecipes.$inferInsert)
        .returning();
      return newRecipe;
    } catch (error) {
      console.error("Error creating recipe:", error);
      throw new Error("Failed to create recipe");
    }
  }

  async updateRecipe(
    userId: string,
    id: string,
    updates: Partial<Recipe>,
  ): Promise<Recipe> {
    try {
      const [updated] = await db
        .update(userRecipes)
        .set(updates)
        .where(and(eq(userRecipes.id, id), eq(userRecipes.userId, userId)))
        .returning();

      if (!updated) {
        throw new Error("Recipe not found");
      }

      return updated;
    } catch (error) {
      console.error(`Error updating recipe ${id}:`, error);
      throw new Error("Failed to update recipe");
    }
  }

  async getRecipesWithInventoryMatching(
    userId: string,
  ): Promise<Array<Recipe & { ingredientMatches: IngredientMatch[] }>> {
    try {
      // Fetch userRecipes and inventory in parallel for better performance
      const [userRecipes, inventory] = await parallelQueries([
        this.getRecipes(userId),
        this.getFoodItems(userId)
      ]);

      // Enrich each recipe with real-time inventory matching
      return userRecipes.map((recipe) => {
        const ingredientMatches: IngredientMatch[] = recipe.ingredients.map(
          (ingredient) => {
            return matchIngredientWithInventory(ingredient, inventory);
          },
        );

        // Update the usedIngredients and missingIngredients based on current inventory
        const usedIngredients = ingredientMatches
          .filter((match) => match.hasEnough)
          .map((match) => match.ingredientName);

        const missingIngredients = ingredientMatches
          .filter((match) => !match.hasEnough)
          .map((match) => match.ingredientName);

        return {
          ...recipe,
          usedIngredients, // Update with current inventory state
          missingIngredients, // Update with current inventory state
          ingredientMatches, // Add detailed match information
        };
      });
    } catch (error) {
      console.error(
        `Error getting userRecipes with inventory matching for user ${userId}:`,
        error,
      );
      throw new Error("Failed to retrieve userRecipes with inventory matching");
    }
  }

  // Expiration Handling (now using userInventory table with notification fields)
  async dismissFoodItemNotification(
    userId: string,
    foodItemId: string,
  ): Promise<void> {
    // TODO: Implement notification dismissal tracking
    // The notificationDismissed and lastNotifiedAt columns don't exist in userInventory
    // This would need to be tracked in a separate table or added to the schema
    console.log(`Dismissing notification for food item ${foodItemId} for user ${userId}`);
  }

  async getExpiringItems(
    userId: string,
    daysThreshold: number,
  ): Promise<FoodItem[]> {
    try {
      // Optimized: use SQL to filter items expiring within threshold instead of fetching all items
      const now = new Date();
      const maxExpiryDate = new Date(
        now.getTime() + daysThreshold * 24 * 60 * 60 * 1000,
      );

      const expiringItems = await db
        .select()
        .from(userInventory)
        .where(
          and(
            eq(userInventory.userId, userId),
            sql`${userInventory.expirationDate} IS NOT NULL`,
            sql`${userInventory.expirationDate} != ''`,
            sql`CAST(NULLIF(${userInventory.expirationDate}, '') AS TIMESTAMP) >= ${now.toISOString()}::TIMESTAMP`,
            sql`CAST(NULLIF(${userInventory.expirationDate}, '') AS TIMESTAMP) <= ${maxExpiryDate.toISOString()}::TIMESTAMP`,
          ),
        );

      return expiringItems;
    } catch (error) {
      console.error(`Error getting expiring items for user ${userId}:`, error);
      throw new Error("Failed to retrieve expiring items");
    }
  }

  // Meal Plans
  async getMealPlans(
    userId: string,
    startDate?: string,
    endDate?: string,
    mealType?: string,
    date?: string,
  ): Promise<MealPlan[]> {
    try {
      await this.ensureDefaultDataForUser(userId);

      // Build where conditions
      const conditions: any[] = [eq(mealPlans.userId, userId)];
      
      if (date) {
        conditions.push(eq(mealPlans.date, date));
      } else {
        if (startDate) {
          conditions.push(sql`${mealPlans.date} >= ${startDate}`);
        }
        if (endDate) {
          conditions.push(sql`${mealPlans.date} <= ${endDate}`);
        }
      }
      
      if (mealType) {
        conditions.push(eq(mealPlans.mealType, mealType));
      }

      const plans = await db
        .select()
        .from(mealPlans)
        .where(and(...conditions))
        .orderBy(mealPlans.date);

      return plans;
    } catch (error) {
      console.error(`Error getting meal plans for user ${userId}:`, error);
      throw new Error("Failed to retrieve meal plans");
    }
  }

  async getMealPlan(userId: string, id: string): Promise<MealPlan | undefined> {
    try {
      await this.ensureDefaultDataForUser(userId);
      const [plan] = await db
        .select()
        .from(mealPlans)
        .where(and(eq(mealPlans.id, id), eq(mealPlans.userId, userId)));
      return plan || undefined;
    } catch (error) {
      console.error(`Error getting meal plan ${id}:`, error);
      throw new Error("Failed to retrieve meal plan");
    }
  }

  async createMealPlan(
    userId: string,
    plan: Omit<InsertMealPlan, "userId">,
  ): Promise<MealPlan> {
    try {
      await this.ensureDefaultDataForUser(userId);
      const [newPlan] = await db
        .insert(mealPlans)
        .values({ ...plan, userId })
        .returning();
      return newPlan;
    } catch (error) {
      console.error("Error creating meal plan:", error);
      throw new Error("Failed to create meal plan");
    }
  }

  async updateMealPlan(
    userId: string,
    id: string,
    updates: Partial<Omit<InsertMealPlan, "userId">>,
  ): Promise<MealPlan> {
    try {
      await this.ensureDefaultDataForUser(userId);
      const [updated] = await db
        .update(mealPlans)
        .set(updates)
        .where(and(eq(mealPlans.id, id), eq(mealPlans.userId, userId)))
        .returning();

      if (!updated) {
        throw new Error("Meal plan not found");
      }

      return updated;
    } catch (error) {
      console.error(`Error updating meal plan ${id}:`, error);
      throw new Error("Failed to update meal plan");
    }
  }

  async deleteMealPlan(userId: string, id: string): Promise<void> {
    try {
      await this.ensureDefaultDataForUser(userId);
      await db
        .delete(mealPlans)
        .where(and(eq(mealPlans.id, id), eq(mealPlans.userId, userId)));
    } catch (error) {
      console.error(`Error deleting meal plan ${id}:`, error);
      throw new Error("Failed to delete meal plan");
    }
  }

  async logApiUsage(
    userId: string,
    log: Omit<InsertApiUsageLog, "userId">,
  ): Promise<ApiUsageLog> {
    try {
      const logToInsert = {
        ...log,
        userId,
        timestamp: new Date(),
      };
      const [newLog] = await db
        .insert(apiUsageLogs)
        .values(logToInsert)
        .returning();
      return newLog;
    } catch (error) {
      console.error("Error logging API usage:", error);
      throw new Error("Failed to log API usage");
    }
  }

  async getApiUsageLogs(
    userId: string,
    apiName?: string,
    limit: number = 100,
  ): Promise<ApiUsageLog[]> {
    try {
      const conditions = apiName
        ? and(
            eq(apiUsageLogs.userId, userId),
            eq(apiUsageLogs.apiName, apiName),
          )
        : eq(apiUsageLogs.userId, userId);

      const logs = await db
        .select()
        .from(apiUsageLogs)
        .where(conditions)
        .orderBy(sql`${apiUsageLogs.timestamp} DESC`)
        .limit(limit);
      return logs;
    } catch (error) {
      console.error(`Error getting API usage logs for user ${userId}:`, error);
      throw new Error("Failed to retrieve API usage logs");
    }
  }

  async getApiUsageStats(
    userId: string,
    apiName: string,
    days: number = 30,
  ): Promise<{
    totalCalls: number;
    successfulCalls: number;
    failedCalls: number;
  }> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const logs = await db
        .select()
        .from(apiUsageLogs)
        .where(
          and(
            eq(apiUsageLogs.userId, userId),
            eq(apiUsageLogs.apiName, apiName),
            sql`${apiUsageLogs.timestamp} >= ${cutoffDate.toISOString()}`,
          ),
        );

      const totalCalls = logs.length;
      const successfulCalls = logs.filter((log) => log.success).length;
      const failedCalls = totalCalls - successfulCalls;

      return { totalCalls, successfulCalls, failedCalls };
    } catch (error) {
      console.error(`Error getting API usage stats for user ${userId}:`, error);
      throw new Error("Failed to retrieve API usage stats");
    }
  }

  // FDC Cache Methods
  async getCachedFood(fdcId: string | number): Promise<FdcCache | undefined> {
    try {
      const fdcIdStr = String(fdcId);
      const [cached] = await db
        .select()
        .from(fdcCache)
        .where(eq(fdcCache.fdcId, fdcIdStr));
      return cached;
    } catch (error) {
      console.error(`Error getting cached food ${fdcId}:`, error);
      throw new Error("Failed to retrieve cached food");
    }
  }

  async cacheFood(food: InsertFdcCache): Promise<FdcCache> {
    try {
      const now = new Date();
      const foodToInsert = {
        id: `fdc_${food.fdcId}`,
        fdcId: food.fdcId,
        description: food.description,
        dataType: food.dataType,
        brandOwner: food.brandOwner,
        brandName: food.brandName,
        ingredients: food.ingredients,
        servingSize: food.servingSize,
        servingSizeUnit: food.servingSizeUnit,
        nutrients: food.nutrients,
        fullData: food.fullData,
        cachedAt: now,
        lastAccessed: now,
      };

      const [cachedFood] = await db
        .insert(fdcCache)
        .values(foodToInsert)
        .onConflictDoUpdate({
          target: fdcCache.id,
          set: {
            ...foodToInsert,
            lastAccessed: new Date(),
          },
        })
        .returning();
      return cachedFood;
    } catch (error) {
      console.error("Error caching food:", error);
      throw new Error("Failed to cache food");
    }
  }

  async updateFoodLastAccessed(fdcId: string): Promise<void> {
    try {
      await db
        .update(fdcCache)
        .set({ cachedAt: new Date() })
        .where(eq(fdcCache.fdcId, fdcId));
    } catch (error) {
      console.error(`Error updating last accessed for ${fdcId}:`, error);
      // Don't throw - this is not critical
    }
  }

  async clearOldCache(daysOld: number = 30): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      // Clear old food cache that hasn't been accessed recently
      await db
        .delete(fdcCache)
        .where(sql`${fdcCache.cachedAt} < ${cutoffDate.toISOString()}`);
    } catch (error) {
      console.error("Error clearing old cache:", error);
      // Don't throw - cache cleanup is not critical
    }
  }
  
  // Cache Stats Methods
  async getUSDACacheStats(): Promise<{ totalEntries: number; oldestEntry: Date | null }> {
    try {
      const [countResult] = await db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(fdcCache);
      
      const [oldestResult] = await db
        .select({ oldest: sql<Date>`MIN(${fdcCache.cachedAt})` })
        .from(fdcCache);
      
      return {
        totalEntries: countResult?.count || 0,
        oldestEntry: oldestResult?.oldest || null,
      };
    } catch (error) {
      console.error("Error getting USDA cache stats:", error);
      return { totalEntries: 0, oldestEntry: null };
    }
  }

  // Shopping List Methods - Optimized with default limit
  async getShoppingListItems(userId: string, limit: number = 200): Promise<ShoppingListItem[]> {
    await this.ensureDefaultDataForUser(userId);
    const items = await db
      .select()
      .from(userShopping)
      .where(eq(userShopping.userId, userId))
      .orderBy(userShopping.createdAt)
      .limit(limit);
    return items;
  }

  async getGroupedShoppingListItems(userId: string): Promise<{
    items: ShoppingListItem[];
    grouped: Record<string, ShoppingListItem[]>;
    totalItems: number;
    checkedItems: number;
  }> {
    const items = await this.getShoppingListItems(userId);
    
    // Group by recipe or manual entry
    const grouped = items.reduce((acc: Record<string, ShoppingListItem[]>, item) => {
      const key = item.recipeId || "manual";
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(item);
      return acc;
    }, {});
    
    return {
      items,
      grouped,
      totalItems: items.length,
      checkedItems: items.filter(i => i.isChecked).length,
    };
  }

  async createShoppingListItem(
    userId: string,
    item: Omit<InsertShoppingListItem, "userId">,
  ): Promise<ShoppingListItem> {
    await this.ensureDefaultDataForUser(userId);
    const [newItem] = await db
      .insert(userShopping)
      .values({ ...item, userId, createdAt: new Date() })
      .returning();
    return newItem;
  }

  async updateShoppingListItem(
    userId: string,
    id: string,
    updates: Partial<Omit<InsertShoppingListItem, "userId">>,
  ): Promise<ShoppingListItem> {
    const [updated] = await db
      .update(userShopping)
      .set(updates)
      .where(
        and(eq(userShopping.id, id), eq(userShopping.userId, userId)),
      )
      .returning();

    if (!updated) {
      throw new Error("Shopping list item not found");
    }
    return updated;
  }

  async deleteShoppingListItem(userId: string, id: string): Promise<void> {
    await db
      .delete(userShopping)
      .where(
        and(eq(userShopping.id, id), eq(userShopping.userId, userId)),
      );
  }

  async clearCheckedShoppingListItems(userId: string): Promise<void> {
    await db
      .delete(userShopping)
      .where(
        and(
          eq(userShopping.userId, userId),
          eq(userShopping.isChecked, true),
        ),
      );
  }

  async addMissingIngredientsToShoppingList(
    userId: string,
    recipeId: string,
    ingredients: string[],
  ): Promise<ShoppingListItem[]> {
    await this.ensureDefaultDataForUser(userId);

    const now = new Date();
    // Parse each ingredient to extract quantity and unit if possible
    const items = ingredients.map((ingredient) => {
      // Simple parsing - could be enhanced
      const match = ingredient.match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z]+)?\s+(.+)$/);
      if (match) {
        return {
          ingredient: match[3],
          quantity: match[1],
          unit: match[2] || "",
          recipeId,
          isChecked: false,
          userId,
          createdAt: now,
        };
      }
      return {
        ingredient,
        quantity: null,
        unit: null,
        recipeId,
        isChecked: false,
        userId,
        createdAt: now,
      };
    });

    const newItems = await db
      .insert(userShopping)
      .values(items)
      .returning();

    return newItems;
  }

  async resetUserData(userId: string): Promise<void> {
    try {
      // Use a transaction to ensure all deletions complete or all rollback
      await db.transaction(async (tx) => {
        // Delete all user data in order (respecting foreign key constraints)
        await tx
          .delete(userShopping)
          .where(eq(userShopping.userId, userId));
        await tx.delete(mealPlans).where(eq(mealPlans.userId, userId));
        await tx.delete(userInventory).where(eq(userInventory.userId, userId));
        await tx.delete(userChats).where(eq(userChats.userId, userId));
        await tx.delete(userRecipes).where(eq(userRecipes.userId, userId));
        await tx.delete(userAppliances).where(eq(userAppliances.userId, userId));
        await tx.delete(apiUsageLogs).where(eq(apiUsageLogs.userId, userId));
        await tx.delete(userFeedback).where(eq(userFeedback.userId, userId));

        // Reset user data including preferences to defaults
        await tx
          .update(users)
          .set({
            // Reset preferences to defaults
            dietaryRestrictions: [],
            allergens: [],
            favoriteCategories: [],
            expirationAlertDays: 3,
            storageAreasEnabled: [],
            householdSize: 2,
            cookingSkillLevel: "beginner",
            preferredUnits: "imperial",
            foodsToAvoid: [],
            hasCompletedOnboarding: false,
            updatedAt: new Date(),
          })
          .where(eq(users.id, userId));
      });

      // Clear the initialization flag so default data will be recreated
      // This is done outside the transaction since it's an in-memory operation
      this.userInitialized.delete(userId);

      console.log(`Successfully reset all data for user ${userId}`);
    } catch (error) {
      console.error(`Error resetting user data for ${userId}:`, error);
      throw new Error("Failed to reset user data - transaction rolled back");
    }
  }

  // Feedback System Implementation
  async createFeedback(
    userId: string,
    feedbackData: Omit<InsertFeedback, "userId"> & {
      isFlagged?: boolean;
      flagReason?: string | null;
      similarTo?: string | null;
    },
  ): Promise<Feedback> {
    try {
      // Extract the extra fields that aren't part of the userFeedback table
      const { isFlagged, flagReason, similarTo, ...feedbackFields } = feedbackData;
      
      // Store flags in the tags array if provided
      let finalTags = feedbackFields.tags || [];
      if (isFlagged) {
        finalTags = [...finalTags, 'flagged'];
        if (flagReason) {
          finalTags = [...finalTags, `flag-reason:${flagReason}`];
        }
        if (similarTo) {
          finalTags = [...finalTags, `similar-to:${similarTo}`];
        }
      }
      
      // Prepare the insert data following the pattern of other nullable userId tables
      const insertData = {
        ...feedbackFields,
        ...(userId && { userId }), // Only include userId if provided (nullable for anonymous)
        tags: Array.from(finalTags) as string[],
        upvotes: [],
        responses: [],
        // Convert readonly arrays to mutable for JSONB fields
        attachments: feedbackFields.attachments ? Array.from(feedbackFields.attachments) as string[] : undefined
      };
      
      const [newFeedback] = await db
        .insert(userFeedback)
        .values(insertData)
        .returning();
      return newFeedback;
    } catch (error) {
      console.error("Error creating userFeedback:", error);
      throw new Error("Failed to create userFeedback");
    }
  }

  async getFeedback(userId: string, id: string): Promise<Feedback | undefined> {
    try {
      const [result] = await db
        .select()
        .from(userFeedback)
        .where(and(eq(userFeedback.id, id), eq(userFeedback.userId, userId)));
      return result;
    } catch (error) {
      console.error("Error getting userFeedback:", error);
      throw new Error("Failed to get userFeedback");
    }
  }

  async getUserFeedback(
    userId: string,
    limit: number = 50,
  ): Promise<Feedback[]> {
    try {
      const results = await db
        .select()
        .from(userFeedback)
        .where(eq(userFeedback.userId, userId))
        .orderBy(sql`${userFeedback.createdAt} DESC`)
        .limit(limit);
      return results;
    } catch (error) {
      console.error("Error getting user userFeedback:", error);
      throw new Error("Failed to get user userFeedback");
    }
  }

  async getAllFeedback(
    page: number = 1,
    limit: number = 50,
    status?: string,
  ): Promise<PaginatedResponse<Feedback>> {
    try {
      const offset = (page - 1) * limit;
      const whereCondition = status ? eq(userFeedback.status, status) : undefined;

      const countQuery = db
        .select({ count: sql<number>`count(*)` })
        .from(userFeedback);

      const dataQuery = db.select().from(userFeedback);

      const [{ count }] = whereCondition
        ? await countQuery.where(whereCondition)
        : await countQuery;

      const items = whereCondition
        ? await dataQuery
            .where(whereCondition)
            .orderBy(sql`${userFeedback.createdAt} DESC`)
            .limit(limit)
            .offset(offset)
        : await dataQuery
            .orderBy(sql`${userFeedback.createdAt} DESC`)
            .limit(limit)
            .offset(offset);

      const total = Number(count || 0);
      return PaginationHelper.createResponse(items, total, page, limit);
    } catch (error) {
      console.error("Error getting all userFeedback:", error);
      throw new Error("Failed to get all userFeedback");
    }
  }

  async updateFeedbackStatus(
    id: string,
    status: string,
    estimatedTurnaround?: string,
    resolvedAt?: Date,
  ): Promise<Feedback> {
    try {
      const updateData: any = { status };
      if (estimatedTurnaround !== undefined) {
        updateData.estimatedTurnaround = estimatedTurnaround;
      }
      if (resolvedAt) {
        updateData.resolvedAt = resolvedAt;
      }

      const [updated] = await db
        .update(userFeedback)
        .set(updateData)
        .where(eq(userFeedback.id, id))
        .returning();

      if (!updated) {
        throw new Error("Feedback not found");
      }

      return updated;
    } catch (error) {
      console.error("Error updating userFeedback status:", error);
      throw new Error("Failed to update userFeedback status");
    }
  }

  async addFeedbackResponse(
    feedbackId: string,
    response: FeedbackResponse,
  ): Promise<Feedback> {
    try {
      // Get current userFeedback
      const [currentFeedback] = await db
        .select()
        .from(userFeedback)
        .where(eq(userFeedback.id, feedbackId));

      if (!currentFeedback) {
        throw new Error("Feedback not found");
      }

      // Add new response to responses array
      const currentResponses =
        (currentFeedback.responses as FeedbackResponse[]) || [];
      const newResponse: FeedbackResponse = {
        ...response,
        createdAt: response.createdAt || new Date().toISOString(),
      };
      const updatedResponses = [...currentResponses, newResponse];

      // Update userFeedback with new responses
      const [updated] = await db
        .update(userFeedback)
        .set({
          responses: updatedResponses,
        })
        .where(eq(userFeedback.id, feedbackId))
        .returning();

      return updated;
    } catch (error) {
      console.error("Error adding userFeedback response:", error);
      throw new Error("Failed to add userFeedback response");
    }
  }

  async getFeedbackResponses(feedbackId: string): Promise<FeedbackResponse[]> {
    try {
      const [currentFeedback] = await db
        .select({ responses: userFeedback.responses })
        .from(userFeedback)
        .where(eq(userFeedback.id, feedbackId));

      if (!currentFeedback) {
        return [];
      }

      const responses = (currentFeedback.responses as FeedbackResponse[]) || [];
      // Sort by createdAt
      return responses.sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateA - dateB;
      });
    } catch (error) {
      console.error("Error getting userFeedback responses:", error);
      throw new Error("Failed to get userFeedback responses");
    }
  }

  async getFeedbackAnalytics(
    userId?: string,
    days: number = 30,
  ): Promise<FeedbackAnalytics> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const allFeedback = userId
        ? await db
            .select()
            .from(userFeedback)
            .where(
              and(
                eq(userFeedback.userId, userId),
                sql`${userFeedback.createdAt} >= ${startDate}`,
              ),
            )
        : await db
            .select()
            .from(userFeedback)
            .where(sql`${userFeedback.createdAt} >= ${startDate}`);

      // Calculate analytics
      const totalFeedback = allFeedback.length;
      const averageRating = null; // Rating field no longer exists in schema

      const sentimentDistribution = {
        positive: allFeedback.filter((f) => f.sentiment === "positive").length,
        negative: allFeedback.filter((f) => f.sentiment === "negative").length,
        neutral: allFeedback.filter((f) => f.sentiment === "neutral").length,
      };

      const typeDistribution: Record<string, number> = {};
      const priorityDistribution: Record<string, number> = {};

      allFeedback.forEach((f) => {
        typeDistribution[f.type] = (typeDistribution[f.type] || 0) + 1;
        if (f.priority) {
          priorityDistribution[f.priority] =
            (priorityDistribution[f.priority] || 0) + 1;
        }
      });

      // Calculate daily trends
      const dailyTrends = new Map<
        string,
        { count: number; sentiments: number[] }
      >();
      allFeedback.forEach((f) => {
        const date = new Date(f.createdAt).toISOString().split("T")[0];
        if (!dailyTrends.has(date)) {
          dailyTrends.set(date, { count: 0, sentiments: [] });
        }
        const dayData = dailyTrends.get(date)!;
        dayData.count++;
        if (f.sentiment) {
          dayData.sentiments.push(
            f.sentiment === "positive"
              ? 1
              : f.sentiment === "negative"
                ? -1
                : 0,
          );
        }
      });

      const recentTrends = Array.from(dailyTrends.entries())
        .map(([date, data]) => ({
          date,
          count: data.count,
          averageSentiment:
            data.sentiments.length > 0
              ? data.sentiments.reduce((a, b) => a + b, 0) /
                data.sentiments.length
              : 0,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Calculate top issues
      const categoryMap = new Map<
        string,
        { count: number; priority: string }
      >();
      allFeedback.forEach((f) => {
        if (f.category && f.priority) {
          const key = f.category;
          if (!categoryMap.has(key)) {
            categoryMap.set(key, { count: 0, priority: f.priority });
          }
          const cat = categoryMap.get(key)!;
          cat.count++;
          // Update to highest priority
          const priorities = ["low", "medium", "high", "critical"];
          if (
            priorities.indexOf(f.priority) > priorities.indexOf(cat.priority)
          ) {
            cat.priority = f.priority;
          }
        }
      });

      const topIssues = Array.from(categoryMap.entries())
        .map(([category, data]) => ({
          category,
          count: data.count,
          priority: data.priority,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return {
        totalFeedback,
        averageRating,
        sentimentDistribution,
        typeDistribution,
        priorityDistribution,
        recentTrends,
        topIssues,
      };
    } catch (error) {
      console.error("Error getting userFeedback analytics:", error);
      throw new Error("Failed to get userFeedback analytics");
    }
  }

  async getFeedbackByContext(
    contextId: string,
    contextType: string,
  ): Promise<Feedback[]> {
    try {
      // Note: contextId and contextType fields don't exist in the schema
      // This method searches for context information encoded in tags
      const contextTag = `context:${contextType}:${contextId}`;
      
      const results = await db
        .select()
        .from(userFeedback)
        .where(
          sql`${userFeedback.tags} @> ${JSON.stringify([contextTag])}::jsonb`
        )
        .orderBy(sql`${userFeedback.createdAt} DESC`);
      return results;
    } catch (error) {
      console.error("Error getting userFeedback by context:", error);
      throw new Error("Failed to get userFeedback by context");
    }
  }

  async getCommunityFeedback(
    type?: string,
    sortBy: "upvotes" | "recent" = "recent",
    limit: number = 50,
  ): Promise<Array<Feedback & { userUpvoted: boolean }>> {
    try {
      const whereCondition = type ? eq(userFeedback.type, type) : undefined;
      const orderByClause =
        sortBy === "upvotes"
          ? sql`jsonb_array_length(COALESCE(${userFeedback.upvotes}, '[]'::jsonb)) DESC, ${userFeedback.createdAt} DESC`
          : sql`${userFeedback.createdAt} DESC`;

      const results = whereCondition
        ? await db
            .select()
            .from(userFeedback)
            .where(whereCondition)
            .orderBy(orderByClause)
            .limit(limit)
        : await db.select().from(userFeedback).orderBy(orderByClause).limit(limit);

      return results.map((item) => ({ ...item, userUpvoted: false }));
    } catch (error) {
      console.error("Error getting community userFeedback:", error);
      throw new Error("Failed to get community userFeedback");
    }
  }

  async getCommunityFeedbackForUser(
    userId: string,
    type?: string,
    sortBy: "upvotes" | "recent" = "recent",
    limit: number = 50,
  ): Promise<Array<Feedback & { userUpvoted: boolean }>> {
    try {
      const whereCondition = type ? eq(userFeedback.type, type) : undefined;
      const orderByClause =
        sortBy === "upvotes"
          ? sql`jsonb_array_length(COALESCE(${userFeedback.upvotes}, '[]'::jsonb)) DESC, ${userFeedback.createdAt} DESC`
          : sql`${userFeedback.createdAt} DESC`;

      const results = whereCondition
        ? await db
            .select()
            .from(userFeedback)
            .where(whereCondition)
            .orderBy(orderByClause)
            .limit(limit)
        : await db.select().from(userFeedback).orderBy(orderByClause).limit(limit);

      // Check if user has upvoted each userFeedback item
      return results.map((item) => {
        const upvotes = (item.upvotes as Array<{userId: string, createdAt: string}>) || [];
        return {
          ...item,
          userUpvoted: upvotes.some(upvote => upvote.userId === userId),
        };
      });
    } catch (error) {
      console.error("Error getting community userFeedback for user:", error);
      throw new Error("Failed to get community userFeedback");
    }
  }

  async upvoteFeedback(userId: string, feedbackId: string): Promise<void> {
    try {
      // Get the current userFeedback item
      const [currentFeedback] = await db
        .select()
        .from(userFeedback)
        .where(eq(userFeedback.id, feedbackId));

      if (!currentFeedback) {
        throw new Error("Feedback not found");
      }

      // Check if user already upvoted
      const upvotes = (currentFeedback.upvotes as Array<{userId: string, createdAt: string}>) || [];
      if (upvotes.some(upvote => upvote.userId === userId)) {
        return; // Already upvoted
      }

      // Add user to upvotes array
      const updatedUpvotes = [...upvotes, { 
        userId, 
        createdAt: new Date().toISOString() 
      }];

      await db
        .update(userFeedback)
        .set({
          upvotes: updatedUpvotes,
        })
        .where(eq(userFeedback.id, feedbackId));
    } catch (error) {
      console.error("Error upvoting userFeedback:", error);
      throw new Error("Failed to upvote userFeedback");
    }
  }

  async removeUpvote(userId: string, feedbackId: string): Promise<void> {
    try {
      // Get the current userFeedback item
      const [currentFeedback] = await db
        .select()
        .from(userFeedback)
        .where(eq(userFeedback.id, feedbackId));

      if (!currentFeedback) {
        throw new Error("Feedback not found");
      }

      // Remove user from upvotes array
      const upvotes = (currentFeedback.upvotes as Array<{userId: string, createdAt: string}>) || [];
      const updatedUpvotes = upvotes.filter((upvote) => upvote.userId !== userId);

      // Only update if the user was actually in the upvotes array
      if (upvotes.length !== updatedUpvotes.length) {
        await db
          .update(userFeedback)
          .set({
            upvotes: updatedUpvotes,
          })
          .where(eq(userFeedback.id, feedbackId));
      }
    } catch (error) {
      console.error("Error removing upvote:", error);
      throw new Error("Failed to remove upvote");
    }
  }

  async hasUserUpvoted(userId: string, feedbackId: string): Promise<boolean> {
    try {
      const [currentFeedback] = await db
        .select({ upvotes: userFeedback.upvotes })
        .from(userFeedback)
        .where(eq(userFeedback.id, feedbackId));

      if (!currentFeedback) {
        return false;
      }

      const upvotes = (currentFeedback.upvotes as Array<{userId: string, createdAt: string}>) || [];
      return upvotes.some(upvote => upvote.userId === userId);
    } catch (error) {
      console.error("Error checking upvote status:", error);
      return false;
    }
  }

  async getFeedbackUpvoteCount(feedbackId: string): Promise<number> {
    try {
      const [result] = await db
        .select({ upvotes: userFeedback.upvotes })
        .from(userFeedback)
        .where(eq(userFeedback.id, feedbackId));
      
      if (!result) return 0;
      
      const upvotes = (result.upvotes as Array<{userId: string, createdAt: string}>) || [];
      return upvotes.length;
    } catch (error) {
      console.error("Error getting upvote count:", error);
      return 0;
    }
  }

  // Donation System Implementation (from blueprint:javascript_stripe)
  async createDonation(
    donation: Omit<InsertDonation, "id" | "createdAt" | "completedAt">,
  ): Promise<Donation> {
    try {
      const [newDonation] = await db
        .insert(donations)
        .values(donation)
        .returning();
      return newDonation;
    } catch (error) {
      console.error("Error creating donation:", error);
      throw new Error("Failed to create donation");
    }
  }

  async updateDonation(
    stripePaymentIntentId: string,
    updates: Partial<Donation>,
  ): Promise<Donation> {
    try {
      const [updated] = await db
        .update(donations)
        .set({
          ...updates,
          completedAt: updates.status === "succeeded" ? new Date() : undefined,
        })
        .where(eq(donations.stripePaymentIntentId, stripePaymentIntentId))
        .returning();

      if (!updated) {
        throw new Error("Donation not found");
      }
      return updated;
    } catch (error) {
      console.error("Error updating donation:", error);
      throw new Error("Failed to update donation");
    }
  }

  async getDonation(id: string): Promise<Donation | undefined> {
    try {
      const [donation] = await db
        .select()
        .from(donations)
        .where(eq(donations.id, id));
      return donation;
    } catch (error) {
      console.error("Error getting donation:", error);
      throw new Error("Failed to get donation");
    }
  }

  async getDonationByPaymentIntent(
    stripePaymentIntentId: string,
  ): Promise<Donation | undefined> {
    try {
      const [donation] = await db
        .select()
        .from(donations)
        .where(eq(donations.stripePaymentIntentId, stripePaymentIntentId));
      return donation;
    } catch (error) {
      console.error("Error getting donation by payment intent:", error);
      throw new Error("Failed to get donation");
    }
  }

  async getDonations(
    limit: number = 50,
    offset: number = 0,
  ): Promise<{ donations: Donation[]; total: number }> {
    try {
      const [donationResults, totalResult] = await Promise.all([
        db
          .select()
          .from(donations)
          .orderBy(sql`${donations.createdAt} DESC`)
          .limit(limit)
          .offset(offset),
        db.select({ count: sql<number>`COUNT(*)::int` }).from(donations),
      ]);

      return {
        donations: donationResults,
        total: totalResult[0]?.count || 0,
      };
    } catch (error) {
      console.error("Error getting donations:", error);
      throw new Error("Failed to get donations");
    }
  }

  async getUserDonations(
    userId: string,
    limit: number = 10,
  ): Promise<Donation[]> {
    try {
      const results = await db
        .select()
        .from(donations)
        .where(eq(donations.userId, userId))
        .orderBy(sql`${donations.createdAt} DESC`)
        .limit(limit);
      return results;
    } catch (error) {
      console.error("Error getting user donations:", error);
      throw new Error("Failed to get user donations");
    }
  }

  async getTotalDonations(): Promise<{
    totalAmount: number;
    donationCount: number;
  }> {
    try {
      const result = await db
        .select({
          totalAmount: sql<number>`COALESCE(SUM(amount), 0)::int`,
          donationCount: sql<number>`COUNT(*)::int`,
        })
        .from(donations)
        .where(eq(donations.status, "succeeded"));

      return result[0] || { totalAmount: 0, donationCount: 0 };
    } catch (error) {
      console.error("Error getting total donations:", error);
      throw new Error("Failed to get total donations");
    }
  }

  async recordWebVital(
    vital: Omit<InsertWebVital, "id" | "createdAt">,
  ): Promise<WebVital> {
    try {
      const [newVital] = await db.insert(webVitals).values(vital).returning();
      return newVital;
    } catch (error) {
      console.error("Error recording web vital:", error);
      throw new Error("Failed to record web vital");
    }
  }

  async getWebVitals(
    limit: number = 100,
    offset: number = 0,
  ): Promise<{ vitals: WebVital[]; total: number }> {
    try {
      const vitals = await db
        .select()
        .from(webVitals)
        .orderBy(sql`${webVitals.createdAt} DESC`)
        .limit(limit)
        .offset(offset);

      const [{ count }] = await db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(webVitals);

      return { vitals, total: count };
    } catch (error) {
      console.error("Error getting web vitals:", error);
      throw new Error("Failed to get web vitals");
    }
  }

  async getWebVitalsByMetric(
    metricName: string,
    limit: number = 100,
  ): Promise<WebVital[]> {
    try {
      return await db
        .select()
        .from(webVitals)
        .where(eq(webVitals.name, metricName))
        .orderBy(sql`${webVitals.createdAt} DESC`)
        .limit(limit);
    } catch (error) {
      console.error("Error getting web vitals by metric:", error);
      throw new Error("Failed to get web vitals by metric");
    }
  }

  async getWebVitalsStats(
    metricName?: string,
    days: number = 7,
  ): Promise<{
    average: number;
    p75: number;
    p95: number;
    count: number;
    goodCount: number;
    needsImprovementCount: number;
    poorCount: number;
  }> {
    try {
      const dateThreshold = new Date();
      dateThreshold.setDate(dateThreshold.getDate() - days);

      const whereClause = metricName
        ? and(
            eq(webVitals.name, metricName),
            sql`${webVitals.createdAt} >= ${dateThreshold.toISOString()}`,
          )
        : sql`${webVitals.createdAt} >= ${dateThreshold.toISOString()}`;

      const stats = await db
        .select({
          average: sql<number>`AVG(${webVitals.value})::numeric`,
          p75: sql<number>`PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY ${webVitals.value})::numeric`,
          p95: sql<number>`PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY ${webVitals.value})::numeric`,
          count: sql<number>`COUNT(*)::int`,
          goodCount: sql<number>`COUNT(*) FILTER (WHERE ${webVitals.rating} = 'good')::int`,
          needsImprovementCount: sql<number>`COUNT(*) FILTER (WHERE ${webVitals.rating} = 'needs-improvement')::int`,
          poorCount: sql<number>`COUNT(*) FILTER (WHERE ${webVitals.rating} = 'poor')::int`,
        })
        .from(webVitals)
        .where(whereClause);

      return (
        stats[0] || {
          average: 0,
          p75: 0,
          p95: 0,
          count: 0,
          goodCount: 0,
          needsImprovementCount: 0,
          poorCount: 0,
        }
      );
    } catch (error) {
      console.error("Error getting web vitals stats:", error);
      throw new Error("Failed to get web vitals stats");
    }
  }

  // Common Food Items Methods
  async getCommonFoodItems(): Promise<CommonFoodItem[]> {
    try {
      return db.select().from(onboardingInventory);
    } catch (error) {
      console.error("Error getting common food items:", error);
      throw new Error("Failed to get common food items");
    }
  }

  async getCommonFoodItemByName(displayName: string): Promise<CommonFoodItem | undefined> {
    try {
      const [item] = await db
        .select()
        .from(onboardingInventory)
        .where(eq(onboardingInventory.displayName, displayName));
      return item;
    } catch (error) {
      console.error("Error getting common food item by name:", error);
      throw new Error("Failed to get common food item");
    }
  }

  async getCommonFoodItemsByNames(displayNames: string[]): Promise<CommonFoodItem[]> {
    try {
      if (displayNames.length === 0) return [];
      // Use a parameterized query with ARRAY constructor
      return db
        .select()
        .from(onboardingInventory)
        .where(sql`${onboardingInventory.displayName} = ANY(ARRAY[${sql.join(displayNames.map(name => sql`${name}`), sql`, `)}])`);
    } catch (error) {
      console.error("Error getting common food items by names:", error);
      throw new Error("Failed to get common food items");
    }
  }

  async upsertCommonFoodItem(item: InsertCommonFoodItem): Promise<CommonFoodItem> {
    try {
      const [result] = await db
        .insert(onboardingInventory)
        .values(item)
        .onConflictDoUpdate({
          target: onboardingInventory.displayName,
          set: {
            ...item,
            lastUpdated: new Date(),
          },
        })
        .returning();
      return result;
    } catch (error) {
      console.error("Error upserting common food item:", error);
      throw new Error("Failed to upsert common food item");
    }
  }

  async deleteCommonFoodItem(displayName: string): Promise<void> {
    try {
      await db
        .delete(onboardingInventory)
        .where(eq(onboardingInventory.displayName, displayName));
    } catch (error) {
      console.error("Error deleting common food item:", error);
      throw new Error("Failed to delete common food item");
    }
  }

  // Cooking Terms Methods
  async getCookingTerms(): Promise<CookingTerm[]> {
    try {
      return db.select().from(cookingTerms);
    } catch (error) {
      console.error("Error getting cooking terms:", error);
      throw new Error("Failed to get cooking terms");
    }
  }

  async getCookingTerm(id: string): Promise<CookingTerm | undefined> {
    try {
      const [term] = await db
        .select()
        .from(cookingTerms)
        .where(eq(cookingTerms.id, id));
      return term;
    } catch (error) {
      console.error("Error getting cooking term:", error);
      throw new Error("Failed to get cooking term");
    }
  }

  async getCookingTermByTerm(term: string): Promise<CookingTerm | undefined> {
    try {
      const [result] = await db
        .select()
        .from(cookingTerms)
        .where(eq(cookingTerms.term, term));
      return result;
    } catch (error) {
      console.error("Error getting cooking term by term:", error);
      throw new Error("Failed to get cooking term");
    }
  }

  async getCookingTermsByCategory(category: string): Promise<CookingTerm[]> {
    try {
      return db
        .select()
        .from(cookingTerms)
        .where(eq(cookingTerms.category, category));
    } catch (error) {
      console.error("Error getting cooking terms by category:", error);
      throw new Error("Failed to get cooking terms by category");
    }
  }

  async createCookingTerm(term: InsertCookingTerm): Promise<CookingTerm> {
    try {
      const [result] = await db
        .insert(cookingTerms)
        .values(term)
        .returning();
      return result;
    } catch (error) {
      console.error("Error creating cooking term:", error);
      throw new Error("Failed to create cooking term");
    }
  }

  async updateCookingTerm(id: string, term: Partial<InsertCookingTerm>): Promise<CookingTerm> {
    try {
      const [result] = await db
        .update(cookingTerms)
        .set({
          ...term,
          updatedAt: new Date(),
        })
        .where(eq(cookingTerms.id, id))
        .returning();
      
      if (!result) {
        throw new Error("Cooking term not found");
      }
      return result;
    } catch (error) {
      console.error("Error updating cooking term:", error);
      throw new Error("Failed to update cooking term");
    }
  }

  async deleteCookingTerm(id: string): Promise<void> {
    try {
      await db
        .delete(cookingTerms)
        .where(eq(cookingTerms.id, id));
    } catch (error) {
      console.error("Error deleting cooking term:", error);
      throw new Error("Failed to delete cooking term");
    }
  }

  async searchCookingTerms(searchText: string): Promise<CookingTerm[]> {
    try {
      const lowerSearch = searchText.toLowerCase();
      
      // Search in term, short definition, and search terms array
      return db
        .select()
        .from(cookingTerms)
        .where(
          sql`LOWER(${cookingTerms.term}) LIKE ${`%${lowerSearch}%`} 
               OR LOWER(${cookingTerms.shortDefinition}) LIKE ${`%${lowerSearch}%`}
               OR EXISTS (
                 SELECT 1 FROM unnest(${cookingTerms.searchTerms}) AS search_term
                 WHERE LOWER(search_term) LIKE ${`%${lowerSearch}%`}
               )`
        );
    } catch (error) {
      console.error("Error searching cooking terms:", error);
      throw new Error("Failed to search cooking terms");
    }
  }

  // Analytics Events Methods
  async recordAnalyticsEvent(event: InsertAnalyticsEvent): Promise<AnalyticsEvent> {
    try {
      const [result] = await db
        .insert(analyticsEvents)
        .values(event)
        .returning();
      return result;
    } catch (error) {
      console.error("Error recording analytics event:", error);
      throw new Error("Failed to record analytics event");
    }
  }

  async recordAnalyticsEventsBatch(events: InsertAnalyticsEvent[]): Promise<AnalyticsEvent[]> {
    try {
      if (events.length === 0) return [];
      
      // Validate each event and set server-side timestamps
      const validatedEvents = [];
      const currentTimestamp = new Date();
      
      for (const event of events) {
        try {
          // Validate event using the schema
          const validated = insertAnalyticsEventSchema.parse(event);
          
          // Add server-side timestamp (will override any client timestamp)
          validatedEvents.push({
            ...validated,
            timestamp: currentTimestamp
          });
        } catch (validationError) {
          // Log validation errors but continue with valid events
          console.warn("Event validation error in batch:", validationError);
        }
      }
      
      if (validatedEvents.length === 0) {
        console.warn("No valid events to insert after validation");
        return [];
      }
      
      // Batch insert validated events
      return await db
        .insert(analyticsEvents)
        .values(validatedEvents)
        .returning();
    } catch (error) {
      console.error("Error recording analytics events batch:", error);
      throw new Error("Failed to record analytics events batch");
    }
  }

  async getAnalyticsEvents(
    userId?: string,
    filters?: {
      eventType?: string;
      eventCategory?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    }
  ): Promise<AnalyticsEvent[]> {
    try {
      const conditions = [];
      if (userId) conditions.push(eq(analyticsEvents.userId, userId));
      if (filters?.eventType) conditions.push(eq(analyticsEvents.eventType, filters.eventType));
      if (filters?.eventCategory) conditions.push(eq(analyticsEvents.eventCategory, filters.eventCategory));
      if (filters?.startDate) conditions.push(gte(analyticsEvents.timestamp, filters.startDate));
      if (filters?.endDate) conditions.push(lte(analyticsEvents.timestamp, filters.endDate));
      
      const baseQuery = db.select().from(analyticsEvents);
      const queryWithWhere = conditions.length > 0 
        ? baseQuery.where(and(...conditions))
        : baseQuery;
      const queryWithOrder = queryWithWhere.orderBy(desc(analyticsEvents.timestamp));
      const finalQuery = filters?.limit 
        ? queryWithOrder.limit(filters.limit)
        : queryWithOrder;
      
      return await finalQuery;
    } catch (error) {
      console.error("Error getting analytics events:", error);
      throw new Error("Failed to get analytics events");
    }
  }

  // User Sessions Methods
  async createUserSession(session: InsertUserSession): Promise<UserSession> {
    try {
      // Convert readonly arrays to mutable arrays for JSONB fields
      const sessionData = {
        ...session,
        goalCompletions: session.goalCompletions ? Array.from(session.goalCompletions) as string[] : undefined,
      };
      const [result] = await db
        .insert(userSessions)
        .values(sessionData)
        .returning();
      return result;
    } catch (error) {
      console.error("Error creating user session:", error);
      throw new Error("Failed to create user session");
    }
  }

  async updateUserSession(sessionId: string, update: Partial<InsertUserSession>): Promise<UserSession> {
    try {
      // Convert readonly arrays to mutable arrays for JSONB fields
      const updateData = {
        ...update,
        goalCompletions: update.goalCompletions ? Array.from(update.goalCompletions) as string[] : undefined,
      };
      const [result] = await db
        .update(userSessions)
        .set(updateData)
        .where(eq(userSessions.sessionId, sessionId))
        .returning();
      
      if (!result) {
        throw new Error("Session not found");
      }
      return result;
    } catch (error) {
      console.error("Error updating user session:", error);
      throw new Error("Failed to update user session");
    }
  }

  async getUserSessions(
    userId?: string,
    filters?: {
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    }
  ): Promise<UserSession[]> {
    try {
      const conditions = [];
      if (userId) conditions.push(eq(userSessions.userId, userId));
      if (filters?.startDate) conditions.push(gte(userSessions.startTime, filters.startDate));
      if (filters?.endDate) conditions.push(lte(userSessions.startTime, filters.endDate));
      
      const baseQuery = db.select().from(userSessions);
      const queryWithWhere = conditions.length > 0 
        ? baseQuery.where(and(...conditions))
        : baseQuery;
      const queryWithOrder = queryWithWhere.orderBy(desc(userSessions.startTime));
      const finalQuery = filters?.limit 
        ? queryWithOrder.limit(filters.limit)
        : queryWithOrder;
      
      return await finalQuery;
    } catch (error) {
      console.error("Error getting user sessions:", error);
      throw new Error("Failed to get user sessions");
    }
  }

  async getAnalyticsStats(
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalEvents: number;
    uniqueUsers: number;
    totalSessions: number;
    avgSessionDuration: number;
    topEvents: Array<{ eventType: string; count: number }>;
    topCategories: Array<{ eventCategory: string; count: number }>;
    conversionRate: number;
  }> {
    try {
      const conditions = [];
      if (startDate) conditions.push(gte(analyticsEvents.timestamp, startDate));
      if (endDate) conditions.push(lte(analyticsEvents.timestamp, endDate));
      
      const sessionConditions = [];
      if (startDate) sessionConditions.push(gte(userSessions.startTime, startDate));
      if (endDate) sessionConditions.push(lte(userSessions.startTime, endDate));
      
      // Execute all queries in parallel for better performance
      const [
        totalEventsResults,
        uniqueUsersResults,
        sessionStatsResults,
        topEventsResults,
        topCategoriesResults,
        goalsResults
      ] = await parallelQueries([
        // Total events query
        db.select({ count: sql<number>`count(*)` })
          .from(analyticsEvents)
          .where(conditions.length > 0 ? and(...conditions) : undefined),
        
        // Unique users query
        db.select({ count: sql<number>`count(distinct ${analyticsEvents.userId})` })
          .from(analyticsEvents)
          .where(conditions.length > 0 ? and(...conditions) : undefined),
        
        // Session stats query
        db.select({
          totalSessions: sql<number>`count(*)`,
          avgDuration: sql<number>`avg(${userSessions.duration})`,
        })
          .from(userSessions)
          .where(sessionConditions.length > 0 ? and(...sessionConditions) : undefined),
        
        // Top events query
        db.select({
          eventType: analyticsEvents.eventType,
          count: sql<number>`count(*)`,
        })
          .from(analyticsEvents)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .groupBy(analyticsEvents.eventType)
          .orderBy(desc(sql`count(*)`))
          .limit(10),
        
        // Top categories query
        db.select({
          eventCategory: analyticsEvents.eventCategory,
          count: sql<number>`count(*)`,
        })
          .from(analyticsEvents)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .groupBy(analyticsEvents.eventCategory)
          .orderBy(desc(sql`count(*)`))
          .limit(10),
        
        // Goals query for conversion rate
        db.select({ count: sql<number>`count(*)` })
          .from(analyticsEvents)
          .where(
            and(
              eq(analyticsEvents.eventType, 'goal_completion'),
              ...(conditions.length > 0 ? conditions : [])
            )
          )
      ]);
      
      const [totalEventsResult] = totalEventsResults;
      const [uniqueUsersResult] = uniqueUsersResults;
      const [sessionStats] = sessionStatsResults;
      const topEvents = topEventsResults;
      const topCategories = topCategoriesResults;
      const [goalsResult] = goalsResults;
      
      const conversionRate = sessionStats.totalSessions > 0
        ? (goalsResult.count / sessionStats.totalSessions) * 100
        : 0;
      
      return {
        totalEvents: totalEventsResult.count || 0,
        uniqueUsers: uniqueUsersResult.count || 0,
        totalSessions: sessionStats.totalSessions || 0,
        avgSessionDuration: sessionStats.avgDuration || 0,
        topEvents: topEvents || [],
        topCategories: topCategories || [],
        conversionRate,
      };
    } catch (error) {
      console.error("Error getting analytics stats:", error);
      throw new Error("Failed to get analytics stats");
    }
  }
}

export const storage = new DatabaseStorage();
