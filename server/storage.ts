/**
 * Data Storage Layer
 * 
 * Centralized database abstraction layer using Drizzle ORM with PostgreSQL.
 * Provides type-safe CRUD operations for all application entities with user-scoped data isolation.
 * 
 * Architecture:
 * - Database: PostgreSQL via Drizzle ORM
 * - User Scoping: All data operations enforce user ownership through userId checks
 * - Caching: In-memory cache with TTL for frequently accessed data (user preferences, etc.)
 * - Performance: Implements parallel queries, batch operations, and pagination
 * - Initialization: Lazy initialization of default data (storage locations, appliances) per user
 * 
 * Key Responsibilities:
 * - User Management: OIDC claims to user record mapping, admin status, preferences
 * - Inventory Operations: Food items with expiration tracking, storage locations, categories
 * - Recipe Management: Creation, favorites, inventory matching, search with filters
 * - Meal Planning: Meal plans with date filtering and shopping list generation
 * - Chat System: Conversation history with AI assistant
 * - Appliances: User equipment tracking with master library reference
 * - Analytics: API usage logging, web vitals, user sessions, event tracking
 * - Feedback System: User feedback with upvotes, responses, and community visibility
 * - Payments: Stripe donation tracking and statistics
 * - Caching: USDA FoodData Central API response caching
 * 
 * Error Handling:
 * - All methods throw descriptive errors on database failures
 * - User scoping prevents cross-user data access
 * - Transaction rollbacks handled automatically by Drizzle
 * 
 * @module server/storage
 */

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
  type NotificationHistory,
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
  type ActivityLog,
  type InsertActivityLog,
  insertAnalyticsEventSchema,
  users,
  pushTokens,
  notificationHistory,
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
  activityLogs,
} from "@shared/schema";
import { db } from "./db";
import { eq, sql, and, or, desc, gte, lte, isNull } from "drizzle-orm";
import {
  matchIngredientWithInventory,
  type IngredientMatch,
} from "./utils/unitConverter";
import { PaginationHelper } from "./utils/pagination";

// Extended types for appliances with category information
export type ApplianceWithCategory = Appliance & {
  category: {
    id: string;
    name: string;
    subcategory: string | null;
  } | null;
};

/**
 * Standardized pagination response format
 * 
 * All paginated endpoints return this consistent structure for client-side rendering.
 * Includes metadata needed for pagination UI components (page numbers, total counts).
 */
export interface PaginatedResponse<T> {
  data: T[];           // The actual data array
  total: number;       // Total items count
  page: number;        // Current page
  totalPages: number;  // Total pages
  limit: number;       // Items per page
  offset: number;      // Current offset
}

/**
 * Storage Interface
 * 
 * Defines all data access operations for the application.
 * All methods are user-scoped (require userId) except for:
 * - System-wide data (cooking terms, appliance library, common food items)
 * - Admin operations (user management, analytics aggregations)
 * - Public data (donation totals, feedback community view)
 * 
 * Method Patterns:
 * - get*: Retrieve single record or filtered list
 * - get*Paginated: Retrieve paginated results with metadata
 * - create*: Insert new record, returns created entity
 * - update*: Modify existing record, returns updated entity
 * - delete*: Remove record, returns void
 * - upsert*: Insert or update, returns entity
 * 
 * All user-scoped methods enforce data isolation via userId in WHERE clauses.
 */
export interface IStorage {
  // ==================== User Operations ====================
  // REQUIRED for Replit Auth (from blueprint:javascript_log_in_with_replit)
  
  /**
   * Retrieve user by ID
   * 
   * @param id - User ID (typically OIDC sub claim)
   * @returns User record or undefined if not found
   */
  getUser(id: string): Promise<User | undefined>;
  
  /**
   * Create or update user from OIDC claims
   * 
   * Called on every authenticated request to ensure user exists in database.
   * On first login: Creates user record with admin status if first user or in ADMIN_EMAILS env var
   * On subsequent logins: Updates user profile data (name, image, etc.)
   * 
   * @param user - User data from OIDC claims (id, email, firstName, lastName, profileImageUrl)
   * @returns Created or updated user record
   * 
   * Admin Assignment:
   * - First user in system is automatically admin
   * - Users with email in ADMIN_EMAILS environment variable are admin
   * - Existing users retain their admin status
   */
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

  // Notification Management (user-scoped)
  dismissNotification(userId: string, notificationId: string, dismissedBy?: string): Promise<void>;
  getUndismissedNotifications(userId: string, limit?: number): Promise<any[]>;

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
  getAppliances(userId: string): Promise<ApplianceWithCategory[]>;
  getAppliance(userId: string, id: string): Promise<ApplianceWithCategory | undefined>;
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
  getUserAppliances(userId: string): Promise<ApplianceWithCategory[]>;
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
  getUserAppliancesByCategory(userId: string, category: string): Promise<ApplianceWithCategory[]>;
  getApplianceCategories(userId: string): Promise<Array<{
    id: string;
    name: string;
    count: number;
  }>>;

  // Barcode Products - removed (tables deleted)

  // Food Items (user-scoped)
  getFoodItems(userId: string, storageLocationId?: string, foodCategory?: string, limit?: number): Promise<FoodItem[]>;
  getFoodItemsPaginated(
    userId: string,
    page?: number,
    limit?: number,
    storageLocationId?: string,
    foodCategory?: string,
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
  deleteRecipe(userId: string, id: string): Promise<void>;
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

  // Admin Management
  getAllUsers(
    page?: number,
    limit?: number,
    sortBy?: string,
    sortOrder?: string,
  ): Promise<PaginatedResponse<User>>;
  updateUserAdminStatus(userId: string, isAdmin: boolean): Promise<User>;
  deleteUser(userId: string): Promise<void>;
  getAdminCount(): Promise<number>;

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

  // ==================== Activity Logging ====================
  
  /**
   * Create an activity log entry
   * 
   * @param log - Activity log data
   * @returns Created activity log
   */
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;
  
  /**
   * Get activity logs with optional filters
   * 
   * @param userId - Filter by user ID (null for system events)
   * @param filters - Additional filters (action, entity, date range, etc.)
   * @returns Array of activity logs
   */
  getActivityLogs(
    userId?: string | null,
    filters?: {
      action?: string | string[];
      entity?: string;
      entityId?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    }
  ): Promise<ActivityLog[]>;
  
  /**
   * Get paginated activity logs
   * 
   * @param userId - Filter by user ID
   * @param page - Page number (1-indexed)
   * @param limit - Items per page
   * @param filters - Additional filters
   * @returns Paginated activity logs
   */
  getActivityLogsPaginated(
    userId?: string | null,
    page?: number,
    limit?: number,
    filters?: {
      action?: string | string[];
      entity?: string;
      entityId?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<PaginatedResponse<ActivityLog>>;
  
  /**
   * Get user's activity timeline
   * 
   * @param userId - User ID
   * @param limit - Number of recent activities
   * @returns User's activity timeline
   */
  getUserActivityTimeline(
    userId: string,
    limit?: number
  ): Promise<ActivityLog[]>;
  
  /**
   * Get system events (activities with no user)
   * 
   * @param filters - Optional filters
   * @returns System event logs
   */
  getSystemActivityLogs(
    filters?: {
      action?: string | string[];
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    }
  ): Promise<ActivityLog[]>;
  
  /**
   * Get activity statistics
   * 
   * @param userId - Filter by user ID (optional)
   * @param startDate - Start date for stats
   * @param endDate - End date for stats
   * @returns Activity statistics
   */
  getActivityStats(
    userId?: string | null,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    total: number;
    byAction: Array<{ action: string; count: number }>;
    byEntity: Array<{ entity: string; count: number }>;
  }>;
  
  /**
   * Clean up old activity logs based on retention policy
   * 
   * @param retentionDays - Days to retain logs (default: 90)
   * @param excludeActions - Actions to exclude from cleanup
   * @returns Number of deleted logs
   */
  cleanupOldActivityLogs(
    retentionDays?: number,
    excludeActions?: string[]
  ): Promise<number>;
  
  /**
   * Export user's activity logs
   * 
   * @param userId - User ID
   * @returns User's activity logs
   */
  exportUserActivityLogs(userId: string): Promise<ActivityLog[]>;
  
  /**
   * Delete user's activity logs (GDPR compliance)
   * 
   * @param userId - User ID
   * @returns Number of deleted logs
   */
  deleteUserActivityLogs(userId: string): Promise<number>;
}

/**
 * Cache entry structure for in-memory caching
 * @private
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

/**
 * Database Storage Implementation
 * 
 * Implements the IStorage interface using Drizzle ORM with PostgreSQL.
 * Provides comprehensive data access layer with caching, user initialization, and performance optimizations.
 * 
 * Key Features:
 * - User Initialization: Lazy creation of default data (storage locations, appliances) on first access
 * - Caching Strategy: In-memory cache with TTL for user preferences and frequently accessed data
 * - Performance: Parallel queries, batch inserts, pagination with proper indexing
 * - Data Isolation: All user-scoped methods enforce userId checks to prevent cross-user access
 * - Transaction Safety: Uses Drizzle's transaction support for multi-step operations
 * 
 * Initialization Process:
 * 1. First authenticated request for a user triggers ensureDefaultDataForUser()
 * 2. Creates default storage locations (Refrigerator, Freezer, Pantry, Counter)
 * 3. Creates default appliances (Oven, Stove, Microwave, Air Fryer)
 * 4. Uses atomic locks to prevent race conditions during concurrent requests
 * 
 * Caching Strategy:
 * - User preferences cached for 10 minutes
 * - Other frequently accessed data cached for 5 minutes
 * - Cache keys follow pattern: `{entity}:{userId}` or `{entity}:{id}`
 * - Cache invalidation on mutations affecting cached data
 * 
 * Error Handling:
 * - All database errors are caught, logged, and rethrown with user-friendly messages
 * - Failed initializations are retried on next access (lock is released)
 * - Stale cache entries are automatically pruned on access
 * 
 * @implements {IStorage}
 */
export class DatabaseStorage implements IStorage {
  /** Tracks which users have had default data initialized */
  private userInitialized = new Set<string>();
  
  /** Stores in-progress initialization promises to prevent duplicate initialization */
  private initializationPromises = new Map<string, Promise<void>>();
  
  /** Mutex for atomic initialization operations */
  private initializationLock = new Map<string, boolean>();
  
  /** In-memory cache for frequently accessed data */
  private cache = new Map<string, CacheEntry<any>>();
  
  /** Default cache TTL: 5 minutes */
  private readonly DEFAULT_CACHE_TTL = 5 * 60 * 1000;
  
  /** User preferences cache TTL: 10 minutes (accessed frequently) */
  private readonly USER_PREFS_TTL = 10 * 60 * 1000;
  
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

      // Check if this should be an admin
      let isAdmin = false;
      
      // Check if user email is in ADMIN_EMAILS env var
      const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim()) || [];
      if (userData.email && adminEmails.includes(userData.email)) {
        isAdmin = true;
        console.log(`Auto-promoting ${userData.email} to admin (via ADMIN_EMAILS)`);
      } else {
        // Check if this is the first user
        const [countResult] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(users);
        const userCount = countResult?.count || 0;
        
        if (userCount === 0) {
          isAdmin = true;
          console.log(`Auto-promoting ${userData.email} to admin (first user)`);
        }
      }

      // No existing user, insert new one with admin status
      const [user] = await db
        .insert(users)
        .values({
          ...userData,
          isAdmin,
        })
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

  // Notification Management
  async dismissNotification(userId: string, notificationId: string, dismissedBy?: string): Promise<void> {
    try {
      const result = await db
        .update(notificationHistory)
        .set({
          status: 'dismissed',
          dismissedAt: new Date(),
          dismissedBy: dismissedBy || 'web-app',
        })
        .where(
          and(
            eq(notificationHistory.id, notificationId),
            eq(notificationHistory.userId, userId)
          )
        )
        .returning();

      if (result.length === 0) {
        throw new Error("Notification not found");
      }
    } catch (error) {
      console.error("Error dismissing notification:", error);
      throw error;
    }
  }

  async getUndismissedNotifications(userId: string, limit: number = 50): Promise<NotificationHistory[]> {
    try {
      return await db
        .select()
        .from(notificationHistory)
        .where(
          and(
            eq(notificationHistory.userId, userId),
            isNull(notificationHistory.dismissedAt)
          )
        )
        .orderBy(desc(notificationHistory.sentAt))
        .limit(limit);
    } catch (error) {
      console.error("Error getting undismissed notifications:", error);
      throw new Error("Failed to get undismissed notifications");
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
  async getAppliances(userId: string): Promise<ApplianceWithCategory[]> {
    try {
      await this.ensureDefaultDataForUser(userId);
      
      // Join with applianceLibrary to get category information
      const results = await db
        .select({
          appliance: userAppliances,
          library: applianceLibrary,
        })
        .from(userAppliances)
        .leftJoin(
          applianceLibrary,
          eq(userAppliances.applianceLibraryId, applianceLibrary.id)
        )
        .where(eq(userAppliances.userId, userId));
      
      // Return appliances with category information as flat fields
      return results.map(r => ({
        ...r.appliance,
        category: r.library?.category || null,
        subcategory: r.library?.subcategory || null,
      }));
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
  ): Promise<ApplianceWithCategory | undefined> {
    try {
      const results = await db
        .select({
          appliance: userAppliances,
          library: applianceLibrary,
        })
        .from(userAppliances)
        .leftJoin(
          applianceLibrary,
          eq(userAppliances.applianceLibraryId, applianceLibrary.id)
        )
        .where(and(eq(userAppliances.id, id), eq(userAppliances.userId, userId)));
      
      if (results.length === 0) return undefined;
      
      const r = results[0];
      return {
        ...r.appliance,
        category: r.library ? {
          id: r.library.category,
          name: r.library.category,
          subcategory: r.library.subcategory,
        } : null,
      };
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
  async getUserAppliances(userId: string): Promise<ApplianceWithCategory[]> {
    try {
      const results = await db
        .select({
          appliance: userAppliances,
          library: applianceLibrary,
        })
        .from(userAppliances)
        .leftJoin(
          applianceLibrary,
          eq(userAppliances.applianceLibraryId, applianceLibrary.id)
        )
        .where(eq(userAppliances.userId, userId));
      
      // Return appliances with category information as flat fields
      return results.map(r => ({
        ...r.appliance,
        category: r.library?.category || null,
        subcategory: r.library?.subcategory || null,
      }));
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

  async getUserAppliancesByCategory(userId: string, category: string): Promise<ApplianceWithCategory[]> {
    try {
      // Join with appliance library to filter by category
      const result = await db
        .select({
          appliance: userAppliances,
          library: applianceLibrary,
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
      
      return result.map(r => ({
        ...r.appliance,
        category: r.library?.category || null,
        subcategory: r.library?.subcategory || null,
      }));
    } catch (error) {
      console.error(`Error getting user userAppliances by category ${category}:`, error);
      throw new Error("Failed to retrieve user userAppliances by category");
    }
  }

  async getApplianceCategories(userId: string): Promise<Array<{
    id: string;
    name: string;
    count: number;
  }>> {
    try {
      // Get all user appliances with their category info
      const result = await db
        .select({
          category: applianceLibrary.category,
          count: sql<number>`COUNT(*)`,
        })
        .from(userAppliances)
        .innerJoin(
          applianceLibrary,
          eq(userAppliances.applianceLibraryId, applianceLibrary.id)
        )
        .where(eq(userAppliances.userId, userId))
        .groupBy(applianceLibrary.category);
      
      return result.map(r => ({
        id: r.category,
        name: r.category,
        count: r.count,
      }));
    } catch (error) {
      console.error(`Error getting appliance categories for user ${userId}:`, error);
      throw new Error("Failed to retrieve appliance categories");
    }
  }

  // Barcode Products - removed (tables deleted)

  // Food Items - Optimized with default limit to prevent memory issues
  async getFoodItems(
    userId: string,
    storageLocationId?: string,
    foodCategory?: string,
    limit: number = 500, // Default limit to prevent loading thousands of items
  ): Promise<FoodItem[]> {
    try {
      // Build where conditions dynamically
      const whereConditions = [eq(userInventory.userId, userId)];
      
      if (storageLocationId) {
        whereConditions.push(eq(userInventory.storageLocationId, storageLocationId));
      }
      
      if (foodCategory) {
        whereConditions.push(eq(userInventory.foodCategory, foodCategory));
      }

      return db
        .select()
        .from(userInventory)
        .where(and(...whereConditions))
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
    foodCategory?: string,
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
      if (foodCategory) {
        whereConditions.push(eq(userInventory.foodCategory, foodCategory));
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

  async deleteRecipe(userId: string, id: string): Promise<void> {
    try {
      await db
        .delete(userRecipes)
        .where(and(eq(userRecipes.id, id), eq(userRecipes.userId, userId)));
    } catch (error) {
      console.error(`Error deleting recipe ${id}:`, error);
      throw new Error("Failed to delete recipe");
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

  // Admin Management Implementation
  async getAllUsers(
    page: number = 1,
    limit: number = 10,
    sortBy: string = "createdAt",
    sortOrder: string = "desc",
  ): Promise<PaginatedResponse<User>> {
    try {
      const offset = (page - 1) * limit;

      // Build sort column
      const sortColumn =
        sortBy === "email"
          ? users.email
          : sortBy === "firstName"
          ? users.firstName
          : sortBy === "lastName"
          ? users.lastName
          : users.createdAt;

      // Get total count
      const [countResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(users);
      const total = countResult?.count || 0;

      // Get paginated users
      const query = db.select().from(users);

      const data =
        sortOrder === "asc"
          ? await query.orderBy(sortColumn).limit(limit).offset(offset)
          : await query.orderBy(desc(sortColumn)).limit(limit).offset(offset);

      const totalPages = Math.ceil(total / limit);

      return {
        data,
        total,
        page,
        totalPages,
        limit,
        offset,
      };
    } catch (error) {
      console.error("Error getting all users:", error);
      throw new Error("Failed to retrieve users");
    }
  }

  async updateUserAdminStatus(
    userId: string,
    isAdmin: boolean,
  ): Promise<User> {
    try {
      const [updatedUser] = await db
        .update(users)
        .set({
          isAdmin,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
        .returning();

      if (!updatedUser) {
        throw new Error("User not found");
      }

      // Invalidate cache for this user
      this.invalidateCache(`user_prefs:${userId}`);

      return updatedUser;
    } catch (error) {
      console.error(`Error updating admin status for user ${userId}:`, error);
      throw new Error("Failed to update admin status");
    }
  }

  async deleteUser(userId: string): Promise<void> {
    try {
      // Use a transaction to ensure complete deletion or rollback
      await db.transaction(async (tx) => {
        // Delete all user-related data (cascade will handle most, but we'll be explicit)
        await tx.delete(pushTokens).where(eq(pushTokens.userId, userId));
        await tx.delete(userStorage).where(eq(userStorage.userId, userId));
        await tx.delete(userAppliances).where(eq(userAppliances.userId, userId));
        await tx.delete(userInventory).where(eq(userInventory.userId, userId));
        await tx.delete(userChats).where(eq(userChats.userId, userId));
        await tx.delete(userRecipes).where(eq(userRecipes.userId, userId));
        await tx.delete(mealPlans).where(eq(mealPlans.userId, userId));
        await tx.delete(apiUsageLogs).where(eq(apiUsageLogs.userId, userId));
        await tx.delete(userShopping).where(eq(userShopping.userId, userId));
        
        // Delete feedback where userId is set (nullable column)
        await tx.delete(userFeedback).where(eq(userFeedback.userId, userId));
        
        // Delete donations where userId is set (nullable column)
        await tx.delete(donations).where(eq(donations.userId, userId));
        
        // Delete analytics events
        await tx.delete(analyticsEvents).where(eq(analyticsEvents.userId, userId));
        await tx.delete(userSessions).where(eq(userSessions.userId, userId));

        // Finally, delete the user record
        await tx.delete(users).where(eq(users.id, userId));
      });

      // Clear the initialization flag and cache
      this.userInitialized.delete(userId);
      this.invalidateCache(`user_prefs:${userId}`);

      console.log(`Successfully deleted user ${userId} and all associated data`);
    } catch (error) {
      console.error(`Error deleting user ${userId}:`, error);
      throw new Error("Failed to delete user - transaction rolled back");
    }
  }

  async getAdminCount(): Promise<number> {
    try {
      const [result] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(eq(users.isAdmin, true));

      return result?.count || 0;
    } catch (error) {
      console.error("Error getting admin count:", error);
      throw new Error("Failed to get admin count");
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
          updatedAt: new Date(),
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

  // ==================== Activity Logging Implementation ====================

  async createActivityLog(log: InsertActivityLog): Promise<ActivityLog> {
    try {
      const [newLog] = await db
        .insert(activityLogs)
        .values(log)
        .returning();
      return newLog;
    } catch (error) {
      console.error("Error creating activity log:", error);
      throw new Error("Failed to create activity log");
    }
  }

  async getActivityLogs(
    userId?: string | null,
    filters?: {
      action?: string | string[];
      entity?: string;
      entityId?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    }
  ): Promise<ActivityLog[]> {
    try {
      let query = db
        .select()
        .from(activityLogs)
        .$dynamic();

      const conditions: any[] = [];

      // User filter
      if (userId !== undefined) {
        if (userId === null) {
          conditions.push(isNull(activityLogs.userId));
        } else {
          conditions.push(eq(activityLogs.userId, userId));
        }
      }

      // Action filter (single or multiple)
      if (filters?.action) {
        if (Array.isArray(filters.action)) {
          conditions.push(sql`${activityLogs.action} = ANY(${filters.action})`);
        } else {
          conditions.push(eq(activityLogs.action, filters.action));
        }
      }

      // Entity filters
      if (filters?.entity) {
        conditions.push(eq(activityLogs.entity, filters.entity));
      }
      if (filters?.entityId) {
        conditions.push(eq(activityLogs.entityId, filters.entityId));
      }

      // Date range filters
      if (filters?.startDate) {
        conditions.push(gte(activityLogs.timestamp, filters.startDate));
      }
      if (filters?.endDate) {
        conditions.push(lte(activityLogs.timestamp, filters.endDate));
      }

      // Apply conditions
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      // Order by timestamp descending
      query = query.orderBy(desc(activityLogs.timestamp));

      // Apply limit and offset
      if (filters?.limit) {
        query = query.limit(filters.limit);
      }
      if (filters?.offset) {
        query = query.offset(filters.offset);
      }

      return await query;
    } catch (error) {
      console.error("Error fetching activity logs:", error);
      throw new Error("Failed to fetch activity logs");
    }
  }

  async getActivityLogsPaginated(
    userId?: string | null,
    page: number = 1,
    limit: number = 50,
    filters?: {
      action?: string | string[];
      entity?: string;
      entityId?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<PaginatedResponse<ActivityLog>> {
    try {
      const offset = (page - 1) * limit;

      // Get logs with limit + offset
      const logs = await this.getActivityLogs(userId, {
        ...filters,
        limit,
        offset,
      });

      // Get total count for pagination
      let countQuery = db
        .select({ count: sql<number>`count(*)::int` })
        .from(activityLogs)
        .$dynamic();

      const conditions: any[] = [];

      if (userId !== undefined) {
        if (userId === null) {
          conditions.push(isNull(activityLogs.userId));
        } else {
          conditions.push(eq(activityLogs.userId, userId));
        }
      }

      if (filters?.action) {
        if (Array.isArray(filters.action)) {
          conditions.push(sql`${activityLogs.action} = ANY(${filters.action})`);
        } else {
          conditions.push(eq(activityLogs.action, filters.action));
        }
      }

      if (filters?.entity) {
        conditions.push(eq(activityLogs.entity, filters.entity));
      }
      if (filters?.entityId) {
        conditions.push(eq(activityLogs.entityId, filters.entityId));
      }
      if (filters?.startDate) {
        conditions.push(gte(activityLogs.timestamp, filters.startDate));
      }
      if (filters?.endDate) {
        conditions.push(lte(activityLogs.timestamp, filters.endDate));
      }

      if (conditions.length > 0) {
        countQuery = countQuery.where(and(...conditions));
      }

      const [{ count: total }] = await countQuery;

      return {
        data: logs,
        total,
        page,
        totalPages: Math.ceil(total / limit),
        limit,
        offset,
      };
    } catch (error) {
      console.error("Error fetching paginated activity logs:", error);
      throw new Error("Failed to fetch paginated activity logs");
    }
  }

  async getUserActivityTimeline(
    userId: string,
    limit: number = 50
  ): Promise<ActivityLog[]> {
    return this.getActivityLogs(userId, { limit });
  }

  async getSystemActivityLogs(
    filters?: {
      action?: string | string[];
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    }
  ): Promise<ActivityLog[]> {
    return this.getActivityLogs(null, filters);
  }

  async getActivityStats(
    userId?: string | null,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    total: number;
    byAction: Array<{ action: string; count: number }>;
    byEntity: Array<{ entity: string; count: number }>;
  }> {
    try {
      const conditions: any[] = [];

      if (userId !== undefined) {
        if (userId === null) {
          conditions.push(isNull(activityLogs.userId));
        } else {
          conditions.push(eq(activityLogs.userId, userId));
        }
      }
      if (startDate) {
        conditions.push(gte(activityLogs.timestamp, startDate));
      }
      if (endDate) {
        conditions.push(lte(activityLogs.timestamp, endDate));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Get action counts
      const actionCounts = await db
        .select({
          action: activityLogs.action,
          count: sql<number>`count(*)::int`,
        })
        .from(activityLogs)
        .where(whereClause)
        .groupBy(activityLogs.action)
        .orderBy(desc(sql`count(*)`));

      // Get entity counts
      const entityCounts = await db
        .select({
          entity: activityLogs.entity,
          count: sql<number>`count(*)::int`,
        })
        .from(activityLogs)
        .where(whereClause)
        .groupBy(activityLogs.entity)
        .orderBy(desc(sql`count(*)`));

      // Get total count
      const [totalResult] = await db
        .select({
          total: sql<number>`count(*)::int`,
        })
        .from(activityLogs)
        .where(whereClause);

      const total = totalResult?.total || 0;

      return {
        total,
        byAction: actionCounts,
        byEntity: entityCounts,
      };
    } catch (error) {
      console.error("Error fetching activity stats:", error);
      throw new Error("Failed to fetch activity stats");
    }
  }

  async cleanupOldActivityLogs(
    retentionDays: number = 90,
    excludeActions?: string[]
  ): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const conditions: any[] = [
        lte(activityLogs.timestamp, cutoffDate)
      ];

      // Exclude certain important actions from cleanup
      if (excludeActions && excludeActions.length > 0) {
        conditions.push(
          sql`${activityLogs.action} NOT IN (${sql.raw(
            excludeActions.map(a => `'${a}'`).join(',')
          )})`
        );
      }

      const result = await db
        .delete(activityLogs)
        .where(and(...conditions));

      const deletedCount = result.rowCount || 0;

      // Log the cleanup as a system event
      await this.createActivityLog({
        userId: null,
        action: 'cleanup_job',
        entity: 'system',
        entityId: null,
        metadata: {
          type: 'activity_logs_cleanup',
          retentionDays,
          deletedCount,
          cutoffDate: cutoffDate.toISOString(),
        },
        ipAddress: null,
        userAgent: null,
        sessionId: null,
      });

      return deletedCount;
    } catch (error) {
      console.error("Error cleaning up old activity logs:", error);
      throw new Error("Failed to clean up old activity logs");
    }
  }

  async exportUserActivityLogs(userId: string): Promise<ActivityLog[]> {
    try {
      const logs = await this.getActivityLogs(userId);

      // Log the export action
      await this.createActivityLog({
        userId,
        action: 'data_exported',
        entity: 'user',
        entityId: userId,
        metadata: {
          type: 'activity_logs',
          count: logs.length,
        },
        ipAddress: null,
        userAgent: null,
        sessionId: null,
      });

      return logs;
    } catch (error) {
      console.error("Error exporting user activity logs:", error);
      throw new Error("Failed to export user activity logs");
    }
  }

  async deleteUserActivityLogs(userId: string): Promise<number> {
    try {
      const result = await db
        .delete(activityLogs)
        .where(eq(activityLogs.userId, userId));

      return result.rowCount || 0;
    } catch (error) {
      console.error("Error deleting user activity logs:", error);
      throw new Error("Failed to delete user activity logs");
    }
  }
}

export const storage = new DatabaseStorage();
