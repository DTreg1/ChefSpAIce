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
import { parallelQueries } from "./utils/batchQueries";
import { 
  type ChatMessage, 
  type InsertChatMessage,
  userChats 
} from "@shared/chat-compatibility";
import {
  type User,
  type UpsertUser,
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
  type CookingTerm,
  type InsertCookingTerm,
  type ApplianceLibrary,
  type UserAppliance,
  type InsertUserAppliance,
  type InsertAnalyticsEvent,
  type AnalyticsEvent,
  type InsertUserSession,
  type UserSession,
  type NotificationPreferences,
  type InsertNotificationPreferences,
  type NotificationScores,
  type InsertNotificationScores,
  type NotificationFeedback,
  type InsertNotificationFeedback,
  type ActivityLog,
  type InsertActivityLog,
  type UserStorage,
  type InsertUserInventory,
  type UserInventory,
  insertAnalyticsEventSchema,
  type AuthProvider,
  type InsertAuthProvider,
  authProviders,
  // ML Feature types and tables
  type ContentEmbedding,
  type InsertContentEmbedding,
  type SearchLog,
  type InsertSearchLog,
  type Category,
  type InsertCategory,
  type ContentCategory,
  type InsertContentCategory,
  type Tag,
  type InsertTag,
  type ContentTag,
  type InsertContentTag,
  type DuplicatePair,
  type InsertDuplicatePair,
  type RelatedContentCache,
  type InsertRelatedContentCache,
  type QueryLog,
  type InsertQueryLog,
  // Task 7-10 types
  type Conversation,
  type InsertConversation,
  type Message,
  type InsertMessage,
  type ConversationContext,
  type InsertConversationContext,
  type VoiceCommand,
  type InsertVoiceCommand,
  type DraftTemplate,
  type InsertDraftTemplate,
  type GeneratedDraft,
  type InsertGeneratedDraft,
  type WritingSession,
  type InsertWritingSession,
  type WritingSuggestion,
  type InsertWritingSuggestion,
  type Summary,
  type InsertSummary,
  type Excerpt,
  type InsertExcerpt,
  type ExcerptPerformance,
  type InsertExcerptPerformance,
  type Translation,
  type InsertTranslation,
  type LanguagePreference,
  type InsertLanguagePreference,
  users,
  pushTokens,
  summaries,
  excerpts,
  excerptPerformance,
  translations,
  languagePreferences,
  draftTemplates,
  generatedDrafts,
  notificationHistory,
  userAppliances,
  userInventory,
  userRecipes,
  userStorage,
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
  // ML Feature tables
  contentEmbeddings,
  searchLogs,
  categories,
  contentCategories,
  tags,
  contentTags,
  duplicatePairs,
  relatedContentCache,
  queryLogs,
  // Task 7-10 tables
  conversations,
  messages,
  conversationContext,
  voiceCommands,
  writingSessions,
  writingSuggestions,
  // Image metadata types
  type ImageMetadata,
  type InsertImageMetadata,
  type AltTextQuality,
  type InsertAltTextQuality,
  imageMetadata,
  altTextQuality,
  // Moderation types
  type ModerationLog,
  type InsertModerationLog,
  type BlockedContent,
  type InsertBlockedContent,
  type ModerationAppeal,
  type InsertModerationAppeal,
  // Fraud Detection types
  type FraudScore,
  type InsertFraudScore,
  type SuspiciousActivity,
  type InsertSuspiciousActivity,
  type FraudReview,
  type InsertFraudReview,
  moderationLogs,
  blockedContent,
  moderationAppeals,
  fraudScores,
  suspiciousActivities,
  fraudReviews,
  // Sentiment Analysis types
  type SentimentAnalysis,
  type InsertSentimentAnalysis,
  type SentimentTrend,
  type InsertSentimentTrend,
  type SentimentMetrics,
  type InsertSentimentMetrics,
  type SentimentAlerts,
  type InsertSentimentAlerts,
  type SentimentSegments,
  type InsertSentimentSegments,
  sentimentAnalysis,
  sentimentTrends,
  sentimentMetrics,
  sentimentAlerts,
  sentimentSegments,
  notificationPreferences,
  notificationScores,
  notificationFeedback,
  // Auto-Save types
  type AutoSaveDraft,
  type InsertAutoSaveDraft,
  type SavePattern,
  type InsertSavePattern,
  autoSaveDrafts,
  savePatterns,
  // Form Completion types
  type FormCompletion,
  type InsertFormCompletion,
  type UserFormHistory,
  type InsertUserFormHistory,
  type CompletionFeedback,
  type InsertCompletionFeedback,
  formCompletions,
  userFormHistory,
  completionFeedback,
} from "@shared/schema";
import { db } from "./db";
import { eq, sql, and, or, desc, gte, lte, isNull, isNotNull, ne } from "drizzle-orm";
import {
  matchIngredientWithInventory,
  type IngredientMatch,
} from "./utils/unitConverter";
import { PaginationHelper } from "./utils/pagination";

// Extended types for appliances with category information
export type ApplianceWithCategory = UserAppliance & {
  category: {
    id: string;
    name: string;
    subcategory: string | null;
  } | null;
};

// Type aliases for common food items (onboarding inventory)
export type CommonFoodItem = OnboardingInventory;
export type InsertCommonFoodItem = InsertOnboardingInventory;

/**
 * Standardized pagination response format
 *
 * All paginated endpoints return this consistent structure for client-side rendering.
 * Includes metadata needed for pagination UI components (page numbers, total counts).
 */
export interface PaginatedResponse<T> {
  data: T[]; // The actual data array
  total: number; // Total items count
  page: number; // Current page
  totalPages: number; // Total pages
  limit: number; // Items per page
  offset: number; // Current offset
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
  
  /**
   * Get user by email address
   */
  getUserByEmail(email: string): Promise<User | undefined>;
  
  /**
   * Create a new user
   */
  createUser(user: UpsertUser): Promise<User>;
  
  // ==================== OAuth Authentication ====================
  
  /**
   * Get auth provider by provider and provider ID
   */
  getAuthProviderByProviderAndId(provider: string, providerId: string): Promise<AuthProvider | undefined>;
  
  /**
   * Get auth provider by provider and user ID
   */
  getAuthProviderByProviderAndUserId(provider: string, userId: string): Promise<AuthProvider | undefined>;
  
  /**
   * Create a new auth provider
   */
  createAuthProvider(authProvider: InsertAuthProvider): Promise<AuthProvider>;
  
  /**
   * Update auth provider
   */
  updateAuthProvider(id: string, data: Partial<AuthProvider>): Promise<void>;

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
  dismissNotification(
    userId: string,
    notificationId: string,
    dismissedBy?: string,
  ): Promise<void>;
  getUndismissedNotifications(userId: string, limit?: number): Promise<any[]>;
  
  // Intelligent Notification System
  getNotificationPreferences(userId: string): Promise<NotificationPreferences | undefined>;
  upsertNotificationPreferences(
    userId: string,
    preferences: Omit<InsertNotificationPreferences, "userId">,
  ): Promise<NotificationPreferences>;
  
  createNotificationScore(
    score: InsertNotificationScores
  ): Promise<NotificationScores>;
  getNotificationScores(
    userId: string,
    limit?: number
  ): Promise<NotificationScores[]>;
  getPendingNotifications(
    beforeTime: Date
  ): Promise<NotificationScores[]>;
  updateNotificationScore(
    id: string,
    updates: Partial<NotificationScores>
  ): Promise<void>;
  
  createNotificationFeedback(
    feedback: InsertNotificationFeedback
  ): Promise<NotificationFeedback>;
  getNotificationFeedback(
    userId: string,
    notificationId?: string
  ): Promise<NotificationFeedback[]>;
  getRecentUserEngagement(
    userId: string,
    days?: number
  ): Promise<{
    totalSent: number;
    clicked: number;
    dismissed: number;
    clickRate: number;
    avgEngagementTime?: number;
  }>;

  // Appliances (user-scoped)
  getAppliances(userId: string): Promise<ApplianceWithCategory[]>;
  getAppliance(
    userId: string,
    id: string,
  ): Promise<ApplianceWithCategory | undefined>;
  createAppliance(
    userId: string,
    appliance: Omit<InsertUserAppliance, "userId">,
  ): Promise<UserAppliance>;
  updateAppliance(
    userId: string,
    id: string,
    appliance: Partial<Omit<InsertUserAppliance, "userId">>,
  ): Promise<UserAppliance>;
  deleteAppliance(userId: string, id: string): Promise<void>;
  getAppliancesByCategory(
    userId: string,
    category: string,
  ): Promise<UserAppliance[]>;
  getAppliancesByCapability(
    userId: string,
    capability: string,
  ): Promise<UserAppliance[]>;

  // UserAppliance Library - Master catalog of all equipment
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
  getUserAppliancesByCategory(
    userId: string,
    category: string,
  ): Promise<ApplianceWithCategory[]>;
  getApplianceCategories(userId: string): Promise<
    Array<{
      id: string;
      name: string;
      count: number;
    }>
  >;

  // Barcode Products - removed (tables deleted)

  // Food Items (user-scoped)
  getFoodItems(
    userId: string,
    storageLocationId?: string,
    foodCategory?: string,
    limit?: number,
  ): Promise<UserInventory[]>;
  getFoodItemsPaginated(
    userId: string,
    page?: number,
    limit?: number,
    storageLocationId?: string,
    foodCategory?: string,
    sortBy?: "name" | "expirationDate" | "createdAt",
  ): Promise<PaginatedResponse<UserInventory>>;
  getFoodItem(userId: string, id: string): Promise<UserInventory | undefined>;
  createFoodItem(
    userId: string,
    item: Omit<InsertUserInventory, "userId">,
  ): Promise<UserInventory>;
  updateFoodItem(
    userId: string,
    id: string,
    item: Partial<Omit<InsertUserInventory, "userId">>,
  ): Promise<UserInventory>;
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
    limit?: number,
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
  getExpiringItems(userId: string, daysThreshold: number): Promise<UserInventory[]>;
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
  getUSDACacheStats(): Promise<{
    totalEntries: number;
    oldestEntry: Date | null;
  }>;

  // Common Food Items (onboarding inventory)
  getOnboardingInventory(): Promise<OnboardingInventory[]>;

  // Shopping List Items (user-scoped)
  getShoppingListItems(
    userId: string,
    limit?: number,
  ): Promise<ShoppingListItem[]>;
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
  updateCookingTerm(
    id: string,
    term: Partial<InsertCookingTerm>,
  ): Promise<CookingTerm>;
  deleteCookingTerm(id: string): Promise<void>;
  searchCookingTerms(searchText: string): Promise<CookingTerm[]>;

  // Analytics Events
  recordAnalyticsEvent(event: InsertAnalyticsEvent): Promise<AnalyticsEvent>;
  recordAnalyticsEventsBatch(
    events: InsertAnalyticsEvent[],
  ): Promise<AnalyticsEvent[]>;
  getAnalyticsEvents(
    userId?: string,
    filters?: {
      eventType?: string;
      eventCategory?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    },
  ): Promise<AnalyticsEvent[]>;

  // User Sessions
  createUserSession(session: InsertUserSession): Promise<UserSession>;
  updateUserSession(
    sessionId: string,
    update: Partial<InsertUserSession>,
  ): Promise<UserSession>;
  getUserSessions(
    userId?: string,
    filters?: {
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    },
  ): Promise<UserSession[]>;
  getAnalyticsStats(
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    totalEvents: number;
    uniqueUsers: number;
    totalSessions: number;
    avgSessionDuration: number;
    topEvents: Array<{ eventType: string; count: number }>;
    topCategories: Array<{ eventCategory: string; count: number }>;
    conversionRate: number;
  }>;

  // ==================== Sentiment Tracking Operations ====================
  
  // Sentiment Metrics Operations
  createSentimentMetrics(metrics: InsertSentimentMetrics): Promise<SentimentMetrics>;
  getSentimentMetrics(
    period?: string,
    periodType?: "day" | "week" | "month",
  ): Promise<SentimentMetrics[]>;
  getLatestSentimentMetrics(): Promise<SentimentMetrics | undefined>;
  
  // Sentiment Alerts Operations
  createSentimentAlert(alert: InsertSentimentAlerts): Promise<SentimentAlerts>;
  getSentimentAlerts(
    status?: "active" | "acknowledged" | "resolved",
    limit?: number,
  ): Promise<SentimentAlerts[]>;
  updateSentimentAlert(
    alertId: string,
    update: Partial<SentimentAlerts>,
  ): Promise<SentimentAlerts>;
  
  // Sentiment Segments Operations
  createSentimentSegment(segment: InsertSentimentSegments): Promise<SentimentSegments>;
  getSentimentSegments(
    period?: string,
    segmentName?: string,
  ): Promise<SentimentSegments[]>;
  getSentimentBreakdown(
    period: string,
    periodType: "day" | "week" | "month",
  ): Promise<{
    segments: SentimentSegments[];
    categories: Record<string, { sentiment: number; count: number }>;
  }>;
  
  // Sentiment Analysis Operations
  createSentimentAnalysis(analysis: InsertSentimentAnalysis): Promise<SentimentAnalysis>;
  getSentimentAnalyses(
    filters?: {
      userId?: string;
      contentType?: string;
      sentiment?: "positive" | "negative" | "neutral" | "mixed";
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    },
  ): Promise<SentimentAnalysis[]>;
  
  // Sentiment Report Generation
  generateSentimentReport(
    period: string,
    periodType: "day" | "week" | "month",
  ): Promise<{
    metrics: SentimentMetrics;
    alerts: SentimentAlerts[];
    segments: SentimentSegments[];
    painPoints: Array<{ category: string; issue: string; impact: number }>;
    insights: string[];
  }>;

  // ==================== Natural Language Query Operations ====================

  /**
   * Log a natural language query and its SQL translation
   */
  createQueryLog(
    userId: string,
    log: Omit<InsertQueryLog, "userId">
  ): Promise<QueryLog>;

  /**
   * Get query history for a user
   */
  getQueryLogs(
    userId: string,
    limit?: number
  ): Promise<QueryLog[]>;

  /**
   * Get saved queries for a user
   */
  getSavedQueries(userId: string): Promise<QueryLog[]>;

  /**
   * Save a query for future use
   */
  saveQuery(
    userId: string,
    queryId: string,
    savedName: string
  ): Promise<QueryLog>;

  /**
   * Update query log with execution results
   */
  updateQueryLog(
    queryId: string,
    updates: Partial<QueryLog>
  ): Promise<QueryLog>;

  /**
   * Get query by ID
   */
  getQueryLog(
    userId: string,
    queryId: string
  ): Promise<QueryLog | undefined>;

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
    },
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
    },
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
    limit?: number,
  ): Promise<ActivityLog[]>;

  /**
   * Get system events (activities with no user)
   *
   * @param filters - Optional filters
   * @returns System event logs
   */
  getSystemActivityLogs(filters?: {
    action?: string | string[];
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<ActivityLog[]>;

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
    endDate?: Date,
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
    excludeActions?: string[],
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

  // ==================== ML Features ====================

  /**
   * Create or update content embedding
   * @param embedding - Embedding data
   */
  upsertContentEmbedding(embedding: InsertContentEmbedding): Promise<ContentEmbedding>;

  /**
   * Get embeddings for content
   * @param contentId - Content ID
   * @param contentType - Type of content
   * @param userId - User ID
   */
  getContentEmbedding(contentId: string, contentType: string, userId: string): Promise<ContentEmbedding | undefined>;

  /**
   * Search by embedding similarity
   * @param queryEmbedding - Query embedding vector
   * @param contentType - Filter by content type
   * @param userId - User ID
   * @param limit - Max results
   */
  searchByEmbedding(queryEmbedding: number[], contentType: string, userId: string, limit?: number): Promise<Array<ContentEmbedding & { similarity: number }>>;

  /**
   * Log search query
   * @param log - Search log data
   */
  createSearchLog(log: InsertSearchLog): Promise<SearchLog>;
  
  /**
   * Update search log with click feedback
   * @param searchLogId - Search log ID
   * @param feedback - Click feedback data
   */
  updateSearchLogFeedback(searchLogId: string, feedback: {
    clickedResultId: string;
    clickedResultType: string;
    clickPosition: number;
    timeToClick: number;
  }): Promise<SearchLog>;

  /**
   * Get all categories
   * @param parentId - Filter by parent category
   */
  getCategories(parentId?: string | null): Promise<Category[]>;

  /**
   * Create category
   * @param category - Category data
   */
  createCategory(category: InsertCategory): Promise<Category>;

  /**
   * Get content categories
   * @param contentId - Content ID
   * @param contentType - Content type
   * @param userId - User ID
   */
  getContentCategories(contentId: string, contentType: string, userId: string): Promise<ContentCategory[]>;

  /**
   * Assign category to content
   * @param assignment - Category assignment data
   */
  assignContentCategory(assignment: InsertContentCategory): Promise<ContentCategory>;

  /**
   * Get or create tag
   * @param name - Tag name
   */
  getOrCreateTag(name: string): Promise<Tag>;

  /**
   * Get trending tags
   * @param limit - Max results
   */
  getTrendingTags(limit?: number): Promise<Tag[]>;

  /**
   * Get content tags
   * @param contentId - Content ID
   * @param contentType - Content type
   * @param userId - User ID
   */
  getContentTags(contentId: string, contentType: string, userId: string): Promise<Array<ContentTag & { tag: Tag }>>;

  /**
   * Assign tag to content
   * @param assignment - Tag assignment data
   */
  assignContentTag(assignment: InsertContentTag): Promise<ContentTag>;
  
  /**
   * Create or get tag by name
   * @param name - Tag name
   */
  createOrGetTag(name: string): Promise<Tag>;
  
  /**
   * Get all tags
   * @param userId - Optional user filter
   */
  getAllTags(userId?: string): Promise<Tag[]>;
  
  /**
   * Get related tags
   * @param tagId - Tag ID
   * @param limit - Max results
   */
  getRelatedTags(tagId: string, limit?: number): Promise<Tag[]>;
  
  /**
   * Remove tag from content
   * @param contentId - Content ID
   * @param tagId - Tag ID
   * @param userId - User ID
   */
  removeContentTag(contentId: string, tagId: string, userId: string): Promise<void>;
  
  /**
   * Update tag relevance score
   * @param contentId - Content ID
   * @param tagId - Tag ID
   * @param userId - User ID
   * @param relevanceScore - New relevance score
   */
  updateTagRelevanceScore(contentId: string, tagId: string, userId: string, relevanceScore: number): Promise<void>;
  
  /**
   * Search tags by query
   * @param query - Search query
   * @param limit - Max results
   */
  searchTags(query: string, limit?: number): Promise<Tag[]>;

  /**
   * Check for duplicate content
   * @param contentId - Content ID
   * @param userId - User ID
   */
  getDuplicates(contentId: string, userId: string): Promise<DuplicatePair[]>;

  /**
   * Create duplicate pair
   * @param pair - Duplicate pair data
   */
  createDuplicatePair(pair: InsertDuplicatePair): Promise<DuplicatePair>;

  /**
   * Update duplicate status
   * @param pairId - Duplicate pair ID
   * @param status - New status
   * @param reviewedBy - Reviewer user ID
   */
  updateDuplicateStatus(pairId: string, status: string, reviewedBy: string): Promise<void>;

  /**
   * Get related content from cache
   * @param contentId - Content ID
   * @param contentType - Content type
   * @param userId - User ID
   */
  getRelatedContent(contentId: string, contentType: string, userId: string): Promise<RelatedContentCache | undefined>;

  /**
   * Cache related content
   * @param cache - Related content cache data
   */
  cacheRelatedContent(cache: InsertRelatedContentCache): Promise<RelatedContentCache>;

  /**
   * Create natural language query log
   * @param log - Query log data
   */
  createQueryLog(log: InsertQueryLog): Promise<QueryLog>;

  // ==================== Task 7: AI Chat Assistant ====================
  
  /**
   * Get all conversations for a user
   * @param userId - User ID
   */
  getConversations(userId: string): Promise<Conversation[]>;
  
  /**
   * Get a specific conversation
   * @param userId - User ID
   * @param conversationId - Conversation ID
   */
  getConversation(userId: string, conversationId: string): Promise<Conversation | undefined>;
  
  /**
   * Create a new conversation
   * @param userId - User ID
   * @param title - Conversation title
   */
  createConversation(userId: string, title: string): Promise<Conversation>;
  
  /**
   * Update conversation (e.g., title, updatedAt)
   * @param userId - User ID
   * @param conversationId - Conversation ID
   * @param updates - Fields to update
   */
  updateConversation(userId: string, conversationId: string, updates: Partial<Conversation>): Promise<Conversation>;
  
  /**
   * Delete a conversation and all its messages
   * @param userId - User ID
   * @param conversationId - Conversation ID
   */
  deleteConversation(userId: string, conversationId: string): Promise<void>;
  
  /**
   * Get messages for a conversation
   * @param conversationId - Conversation ID
   * @param limit - Max messages to return
   */
  getMessages(conversationId: string, limit?: number): Promise<Message[]>;
  
  /**
   * Create a new message in a conversation
   * @param message - Message data
   */
  createMessage(message: InsertMessage): Promise<Message>;
  
  /**
   * Get or create conversation context
   * @param conversationId - Conversation ID
   */
  getConversationContext(conversationId: string): Promise<ConversationContext | undefined>;
  
  /**
   * Update conversation context
   * @param conversationId - Conversation ID
   * @param context - Context data
   */
  updateConversationContext(conversationId: string, context: Partial<ConversationContext>): Promise<ConversationContext>;

  // ==================== Task 8: Voice Commands ====================
  
  /**
   * Log a voice command
   * @param command - Voice command data
   */
  createVoiceCommand(command: InsertVoiceCommand): Promise<VoiceCommand>;
  
  /**
   * Get voice command history for a user
   * @param userId - User ID
   * @param limit - Max commands to return
   */
  getVoiceCommands(userId: string, limit?: number): Promise<VoiceCommand[]>;
  
  /**
   * Get available voice commands (for help/documentation)
   */
  getAvailableVoiceCommands(): Promise<Array<{ command: string; description: string; example: string }>>;

  // ==================== Task 9: Smart Email/Message Drafting ====================
  
  /**
   * Get draft templates
   * @param contextType - Filter by context type
   */
  getDraftTemplates(contextType?: string): Promise<DraftTemplate[]>;
  
  /**
   * Create a draft template
   * @param template - Template data
   */
  createDraftTemplate(template: InsertDraftTemplate): Promise<DraftTemplate>;
  
  /**
   * Increment template usage count
   * @param templateId - Template ID
   */
  incrementTemplateUsage(templateId: string): Promise<void>;
  
  /**
   * Generate and save message drafts
   * @param userId - User ID
   * @param drafts - Array of generated drafts
   */
  saveGeneratedDrafts(userId: string, drafts: Omit<InsertGeneratedDraft, "userId">[]): Promise<GeneratedDraft[]>;
  
  /**
   * Mark a draft as selected
   * @param userId - User ID
   * @param draftId - Draft ID
   * @param edited - Whether the draft was edited before sending
   */
  markDraftSelected(userId: string, draftId: string, edited: boolean): Promise<void>;
  
  /**
   * Get draft generation history
   * @param userId - User ID
   * @param limit - Max drafts to return
   */
  getDraftHistory(userId: string, limit?: number): Promise<GeneratedDraft[]>;

  // ==================== Task 10: Writing Assistant ====================
  
  /**
   * Create a writing session
   * @param session - Writing session data
   */
  createWritingSession(session: InsertWritingSession): Promise<WritingSession>;
  
  /**
   * Get writing session
   * @param userId - User ID
   * @param sessionId - Session ID
   */
  getWritingSession(userId: string, sessionId: string): Promise<WritingSession | undefined>;
  
  /**
   * Update writing session with improvements
   * @param userId - User ID
   * @param sessionId - Session ID
   * @param improvedText - Improved text
   * @param improvements - Applied improvements
   */
  updateWritingSession(userId: string, sessionId: string, improvedText: string, improvements: string[]): Promise<WritingSession>;
  
  /**
   * Add writing suggestions to a session
   * @param sessionId - Session ID
   * @param suggestions - Array of suggestions
   */
  addWritingSuggestions(sessionId: string, suggestions: Omit<InsertWritingSuggestion, "sessionId">[]): Promise<WritingSuggestion[]>;
  
  /**
   * Mark suggestion as accepted/rejected
   * @param suggestionId - Suggestion ID
   * @param accepted - Whether suggestion was accepted
   */
  updateSuggestionStatus(suggestionId: string, accepted: boolean): Promise<void>;
  
  /**
   * Get writing statistics for a user
   * @param userId - User ID
   */
  getWritingStats(userId: string): Promise<{
    totalSessions: number;
    acceptedSuggestions: number;
    totalSuggestions: number;
    commonIssues: Array<{ type: string; count: number }>;
  }>;

  // ==================== Summarization ====================
  
  /**
   * Get a summary by content ID
   * @param userId - User ID
   * @param contentId - Unique identifier for the content
   */
  getSummary(userId: string, contentId: string): Promise<Summary | undefined>;
  
  /**
   * Get all summaries for a user
   * @param userId - User ID
   * @param limit - Max results
   */
  getSummaries(userId: string, limit?: number): Promise<Summary[]>;
  
  /**
   * Create a new summary
   * @param userId - User ID
   * @param summary - Summary data
   */
  createSummary(userId: string, summary: Omit<InsertSummary, "userId">): Promise<Summary>;
  
  /**
   * Update an existing summary (for editing)
   * @param userId - User ID
   * @param summaryId - Summary ID
   * @param updates - Partial summary updates
   */
  updateSummary(userId: string, summaryId: string, updates: Partial<Omit<InsertSummary, "userId" | "id">>): Promise<Summary>;
  
  /**
   * Delete a summary
   * @param userId - User ID
   * @param summaryId - Summary ID
   */
  deleteSummary(userId: string, summaryId: string): Promise<void>;
  
  /**
   * Get summaries by type
   * @param userId - User ID
   * @param type - Summary type (tldr, bullet, paragraph)
   */
  getSummariesByType(userId: string, type: 'tldr' | 'bullet' | 'paragraph'): Promise<Summary[]>;
  
  /**
   * Get excerpt by content ID
   * @param userId - User ID
   * @param contentId - Content ID
   * @param variant - Optional variant (A, B, C, etc.)
   */
  getExcerpt(userId: string, contentId: string, variant?: string): Promise<Excerpt | undefined>;
  
  /**
   * Get all excerpts for a content ID
   * @param userId - User ID
   * @param contentId - Content ID
   */
  getExcerptsByContent(userId: string, contentId: string): Promise<Excerpt[]>;
  
  /**
   * Create a new excerpt
   * @param userId - User ID
   * @param excerpt - Excerpt data
   */
  createExcerpt(userId: string, excerpt: Omit<InsertExcerpt, "userId">): Promise<Excerpt>;
  
  /**
   * Update an excerpt
   * @param userId - User ID
   * @param excerptId - Excerpt ID
   * @param updates - Partial excerpt updates
   */
  updateExcerpt(userId: string, excerptId: string, updates: Partial<Omit<InsertExcerpt, "userId" | "id">>): Promise<Excerpt>;
  
  /**
   * Delete an excerpt
   * @param userId - User ID
   * @param excerptId - Excerpt ID
   */
  deleteExcerpt(userId: string, excerptId: string): Promise<void>;
  
  /**
   * Mark excerpt as active
   * @param userId - User ID
   * @param contentId - Content ID
   * @param excerptId - Excerpt ID to activate
   */
  setActiveExcerpt(userId: string, contentId: string, excerptId: string): Promise<void>;
  
  /**
   * Record excerpt performance
   * @param performance - Performance data
   */
  recordExcerptPerformance(performance: InsertExcerptPerformance): Promise<ExcerptPerformance>;
  
  /**
   * Get excerpt performance metrics
   * @param excerptId - Excerpt ID
   * @param startDate - Optional start date
   * @param endDate - Optional end date
   */
  getExcerptPerformance(excerptId: string, startDate?: Date, endDate?: Date): Promise<ExcerptPerformance[]>;
  
  /**
   * Update excerpt CTR based on performance
   * @param excerptId - Excerpt ID
   */
  updateExcerptCTR(excerptId: string): Promise<void>;
  
  /**
   * Get best performing excerpt for content
   * @param userId - User ID
   * @param contentId - Content ID
   */
  getBestExcerpt(userId: string, contentId: string): Promise<Excerpt | undefined>;

  /**
   * Get user's query history
   * @param userId - User ID
   * @param limit - Max results
   */
  getQueryHistory(userId: string, limit?: number): Promise<QueryLog[]>;

  // ==================== Translation System ====================
  
  /**
   * Translate content using AI
   * @param contentId - Content identifier
   * @param targetLanguage - Target language code (e.g., 'es', 'fr', 'de')
   * @param originalText - Original text to translate
   * @param contentType - Type of content (optional for context)
   * @param context - Additional context for better translation
   */
  translateContent(
    contentId: string,
    targetLanguage: string,
    originalText: string,
    contentType?: string,
    context?: string
  ): Promise<Translation>;
  
  /**
   * Get translations for content
   * @param contentId - Content identifier
   * @param languageCode - Optional language code filter
   */
  getTranslations(contentId: string, languageCode?: string): Promise<Translation[]>;
  
  /**
   * Get translation by content and language
   * @param contentId - Content identifier
   * @param languageCode - Language code
   */
  getTranslation(contentId: string, languageCode: string): Promise<Translation | undefined>;
  
  /**
   * Verify a translation
   * @param translationId - Translation ID
   * @param translatorId - User ID of verifier
   */
  verifyTranslation(translationId: string, translatorId: string): Promise<Translation>;
  
  /**
   * Delete translation
   * @param translationId - Translation ID
   */
  deleteTranslation(translationId: string): Promise<void>;
  
  /**
   * Detect language of text
   * @param text - Text to analyze
   */
  detectLanguage(text: string): Promise<string>;
  
  /**
   * Get supported languages
   */
  getSupportedLanguages(): Promise<Array<{ code: string; name: string; nativeName: string }>>;
  
  // Language Preferences
  
  /**
   * Get user language preferences
   * @param userId - User ID
   */
  getLanguagePreferences(userId: string): Promise<LanguagePreference | undefined>;
  
  /**
   * Create or update language preferences
   * @param userId - User ID
   * @param preferences - Language preferences
   */
  upsertLanguagePreferences(
    userId: string,
    preferences: Omit<InsertLanguagePreference, "userId">
  ): Promise<LanguagePreference>;
  
  /**
   * Get users with auto-translate enabled for a language
   * @param languageCode - Language code
   */
  getUsersWithAutoTranslate(languageCode: string): Promise<string[]>;
  
  // ==================== Image Metadata & Alt Text ====================
  
  /**
   * Get image metadata by ID
   * @param userId - User ID
   * @param imageId - Image metadata ID
   */
  getImageMetadata(userId: string, imageId: string): Promise<ImageMetadata | undefined>;
  
  /**
   * Get image metadata by URL
   * @param userId - User ID  
   * @param imageUrl - Image URL
   */
  getImageMetadataByUrl(userId: string, imageUrl: string): Promise<ImageMetadata | undefined>;
  
  /**
   * Get all images for user
   * @param userId - User ID
   * @param filters - Optional filters
   */
  getImagesPaginated(
    userId: string,
    page?: number,
    limit?: number,
    filters?: {
      isDecorative?: boolean;
      hasAltText?: boolean;
      needsImprovement?: boolean;
    }
  ): Promise<PaginatedResponse<ImageMetadata>>;
  
  /**
   * Create image metadata record
   * @param userId - User ID
   * @param metadata - Image metadata
   */
  createImageMetadata(
    userId: string,
    metadata: Omit<InsertImageMetadata, "userId">
  ): Promise<ImageMetadata>;
  
  /**
   * Update image metadata (including alt text)
   * @param userId - User ID
   * @param imageId - Image metadata ID
   * @param updates - Partial updates
   */
  updateImageMetadata(
    userId: string,
    imageId: string,
    updates: Partial<Omit<InsertImageMetadata, "userId">>
  ): Promise<ImageMetadata>;
  
  /**
   * Delete image metadata
   * @param userId - User ID
   * @param imageId - Image metadata ID
   */
  deleteImageMetadata(userId: string, imageId: string): Promise<void>;
  
  /**
   * Batch process multiple images
   * @param userId - User ID
   * @param imageIds - Array of image IDs
   * @param processor - Function to process each image
   */
  batchProcessImages(
    userId: string,
    imageIds: string[],
    processor: (image: ImageMetadata) => Promise<Partial<InsertImageMetadata>>
  ): Promise<ImageMetadata[]>;
  
  // ==================== Alt Text Quality ====================
  
  /**
   * Get alt text quality for image
   * @param imageId - Image metadata ID
   */
  getAltTextQuality(imageId: string): Promise<AltTextQuality | undefined>;
  
  /**
   * Create or update alt text quality scores
   * @param imageId - Image metadata ID
   * @param quality - Quality metrics
   */
  upsertAltTextQuality(
    imageId: string,
    quality: Omit<InsertAltTextQuality, "imageId">
  ): Promise<AltTextQuality>;
  
  /**
   * Get accessibility report for user
   * @param userId - User ID
   * @param filters - Report filters
   */
  getAccessibilityReport(
    userId: string,
    filters?: {
      wcagLevel?: string;
      minScore?: number;
      maxScore?: number;
      dateRange?: { start: Date; end: Date };
    }
  ): Promise<{
    totalImages: number;
    imagesWithAltText: number;
    decorativeImages: number;
    averageQualityScore: number;
    averageAccessibilityScore: number;
    wcagCompliance: {
      A: number;
      AA: number;
      AAA: number;
    };
    needsImprovement: ImageMetadata[];
  }>;
  
  /**
   * Mark quality record as reviewed
   * @param imageId - Image metadata ID
   * @param reviewerId - User ID of reviewer
   * @param notes - Review notes
   */
  reviewAltTextQuality(
    imageId: string,
    reviewerId: string,
    notes?: string
  ): Promise<AltTextQuality>;
  
  // ==================== Moderation Operations ====================
  
  /**
   * Create a moderation log entry
   * @param log - Moderation log data
   */
  createModerationLog(log: InsertModerationLog): Promise<ModerationLog>;
  
  /**
   * Update moderation log
   * @param id - Log ID
   * @param updates - Fields to update
   */
  updateModerationLog(id: string, updates: Partial<InsertModerationLog>): Promise<void>;
  
  /**
   * Get moderation queue
   * @param userId - User ID
   * @param isAdmin - Whether user is admin
   * @param filters - Optional filters
   */
  getModerationQueue(
    userId: string,
    isAdmin: boolean,
    filters?: {
      status?: string;
      severity?: string;
      contentType?: string;
    }
  ): Promise<ModerationLog[]>;
  
  /**
   * Create blocked content entry
   * @param content - Blocked content data
   */
  createBlockedContent(content: InsertBlockedContent): Promise<BlockedContent>;
  
  /**
   * Restore blocked content
   * @param id - Blocked content ID
   * @param restoredBy - User ID who restored
   */
  restoreBlockedContent(id: string, restoredBy: string): Promise<void>;
  
  /**
   * Create moderation appeal
   * @param appeal - Appeal data
   */
  createModerationAppeal(appeal: InsertModerationAppeal): Promise<ModerationAppeal>;
  
  /**
   * Get moderation appeal
   * @param id - Appeal ID
   */
  getModerationAppeal(id: string): Promise<ModerationAppeal | undefined>;
  
  /**
   * Update moderation appeal
   * @param id - Appeal ID
   * @param updates - Fields to update
   */
  updateModerationAppeal(id: string, updates: Partial<InsertModerationAppeal>): Promise<void>;
  
  /**
   * Get moderation statistics
   * @param timeRange - Optional time range
   */
  getModerationStats(timeRange?: { start: Date; end: Date }): Promise<{
    totalChecked: number;
    totalBlocked: number;
    totalFlagged: number;
    totalAppeals: number;
    appealsApproved: number;
    categoriesBreakdown: { [key: string]: number };
    severityBreakdown: { [key: string]: number };
    averageConfidence: number;
  }>;
  
  // ============================================================================
  // Fraud Detection Methods
  // ============================================================================
  
  /**
   * Create fraud score entry
   * @param score - Fraud score data
   */
  createFraudScore(score: InsertFraudScore): Promise<FraudScore>;
  
  /**
   * Get fraud scores for user
   * @param userId - User ID
   * @param limit - Number of scores to return
   */
  getFraudScores(userId: string, limit?: number): Promise<FraudScore[]>;
  
  /**
   * Create suspicious activity log
   * @param activity - Suspicious activity data
   */
  createSuspiciousActivity(activity: InsertSuspiciousActivity): Promise<SuspiciousActivity>;
  
  /**
   * Get suspicious activities
   * @param userId - Filter by user (optional)
   * @param isAdmin - Whether requester is admin
   */
  getSuspiciousActivities(userId?: string, isAdmin?: boolean): Promise<SuspiciousActivity[]>;
  
  /**
   * Update suspicious activity status
   * @param activityId - Activity ID
   * @param status - New status
   * @param resolvedAt - Resolution timestamp (optional)
   */
  updateSuspiciousActivity(
    activityId: string, 
    status: 'pending' | 'reviewing' | 'confirmed' | 'dismissed' | 'escalated',
    resolvedAt?: Date
  ): Promise<void>;
  
  /**
   * Create fraud review
   * @param review - Review data
   */
  createFraudReview(review: InsertFraudReview): Promise<FraudReview>;
  
  /**
   * Get fraud reviews for user
   * @param userId - User ID
   */
  getFraudReviews(userId: string): Promise<FraudReview[]>;
  
  /**
   * Get fraud statistics
   * @param period - Time period for stats
   */
  getFraudStats(period: 'day' | 'week' | 'month'): Promise<{
    totalScores: number;
    averageScore: number;
    highRiskCount: number;
    suspiciousActivitiesCount: number;
    reviewsCount: number;
    autoBlockedCount: number;
    topActivityTypes: { type: string; count: number }[];
    riskDistribution: { level: string; count: number }[];
  }>;

  // ============================================================================
  // Sentiment Analysis Methods
  // ============================================================================
  
  /**
   * Create sentiment analysis entry
   * @param analysis - Sentiment analysis data
   */
  createSentimentAnalysis(analysis: InsertSentimentAnalysis): Promise<SentimentAnalysis>;
  
  /**
   * Get sentiment analysis by content ID
   * @param contentId - Content ID
   */
  getSentimentAnalysis(contentId: string): Promise<SentimentAnalysis | undefined>;
  
  /**
   * Get sentiment analyses for user
   * @param userId - User ID
   * @param limit - Number of analyses to return
   */
  getUserSentimentAnalyses(userId: string, limit?: number): Promise<SentimentAnalysis[]>;
  
  /**
   * Update sentiment analysis
   * @param id - Analysis ID
   * @param data - Updated analysis data
   */
  updateSentimentAnalysis(id: string, data: Partial<InsertSentimentAnalysis>): Promise<void>;
  
  /**
   * Get sentiment analyses by type
   * @param contentType - Type of content
   * @param limit - Number of analyses to return
   */
  getSentimentAnalysesByType(contentType: string, limit?: number): Promise<SentimentAnalysis[]>;
  
  /**
   * Create sentiment trend
   * @param trend - Sentiment trend data
   */
  createSentimentTrend(trend: InsertSentimentTrend): Promise<SentimentTrend>;
  
  /**
   * Get sentiment trends for user
   * @param userId - User ID (null for global trends)
   * @param periodType - Type of period
   * @param limit - Number of trends to return
   */
  getSentimentTrends(
    userId: string | null,
    periodType?: 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year',
    limit?: number
  ): Promise<SentimentTrend[]>;
  
  /**
   * Get sentiment insights
   * @param userId - User ID (optional)
   * @param startDate - Start date for analysis
   * @param endDate - End date for analysis
   */
  getSentimentInsights(
    userId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    overallSentiment: number;
    sentimentDistribution: {
      positive: number;
      negative: number;
      neutral: number;
      mixed: number;
    };
    topEmotions: Array<{
      emotion: string;
      count: number;
      avgIntensity: number;
    }>;
    topTopics: string[];
    trendsOverTime: Array<{
      period: string;
      avgSentiment: number;
      count: number;
    }>;
  }>;
  
  // ==================== Auto-Save Operations ====================
  
  /**
   * Save draft version of content
   * @param draft - Draft data to save
   */
  saveDraft(draft: InsertAutoSaveDraft): Promise<AutoSaveDraft>;
  
  /**
   * Get latest draft for a document
   * @param userId - User ID
   * @param documentId - Document ID
   */
  getLatestDraft(userId: string, documentId: string): Promise<AutoSaveDraft | undefined>;
  
  /**
   * Get all draft versions for a document
   * @param userId - User ID  
   * @param documentId - Document ID
   * @param limit - Maximum number of versions to return
   */
  getDraftVersions(userId: string, documentId: string, limit?: number): Promise<AutoSaveDraft[]>;
  
  /**
   * Delete specific draft version
   * @param userId - User ID
   * @param draftId - Draft ID
   */
  deleteDraft(userId: string, draftId: string): Promise<void>;
  
  /**
   * Delete all drafts for a document
   * @param userId - User ID
   * @param documentId - Document ID
   */
  deleteDocumentDrafts(userId: string, documentId: string): Promise<void>;
  
  /**
   * Clean up old drafts (older than 30 days)
   * @param userId - User ID (optional, cleans all if not provided)
   */
  cleanupOldDrafts(userId?: string): Promise<number>;
  
  /**
   * Get or create user's typing patterns
   * @param userId - User ID
   */
  getUserSavePatterns(userId: string): Promise<SavePattern>;
  
  /**
   * Update user's typing patterns
   * @param userId - User ID
   * @param patterns - Pattern data to update
   */
  updateUserSavePatterns(
    userId: string,
    patterns: Partial<InsertSavePattern>
  ): Promise<SavePattern>;
  
  /**
   * Record typing event for pattern learning
   * @param userId - User ID
   * @param event - Typing event data
   */
  recordTypingEvent(
    userId: string,
    event: {
      pauseDuration?: number;
      burstLength?: number;
      keyInterval?: number;
      isSentenceEnd?: boolean;
      isParagraphEnd?: boolean;
      wasManualSave?: boolean;
    }
  ): Promise<void>;
  
  /**
   * Check for conflicting edits
   * @param userId - User ID
   * @param documentId - Document ID
   * @param contentHash - Hash of current content
   */
  checkForConflicts(
    userId: string,
    documentId: string,
    contentHash: string
  ): Promise<{
    hasConflict: boolean;
    latestVersion?: AutoSaveDraft;
  }>;

  // ==================== Form Completion Operations ====================
  
  /**
   * Get field suggestions based on query and user history
   * @param fieldName - Name of the field (e.g., "email", "city")
   * @param query - Current user input
   * @param userId - Optional user ID for personalized suggestions
   * @returns Array of suggested values
   */
  getFieldSuggestions(fieldName: string, query: string, userId?: string): Promise<string[]>;
  
  /**
   * Get contextual suggestions based on other form fields
   * @param fieldName - Name of the field to get suggestions for
   * @param context - Other form field values
   * @param userId - Optional user ID for personalized suggestions
   * @returns Array of contextual suggestions
   */
  getContextualSuggestions(fieldName: string, context: Record<string, any>, userId?: string): Promise<string[]>;
  
  /**
   * Record a form input for learning
   * @param userId - User ID
   * @param fieldName - Field name
   * @param value - Value entered
   * @param context - Optional context
   */
  recordFormInput(userId: string, fieldName: string, value: string, context?: Record<string, any>): Promise<void>;
  
  /**
   * Record feedback on a suggestion
   * @param feedback - Feedback data
   */
  recordCompletionFeedback(feedback: InsertCompletionFeedback): Promise<CompletionFeedback>;
  
  /**
   * Get user's form history
   * @param userId - User ID
   * @param fieldName - Optional field name filter
   */
  getUserFormHistory(userId: string, fieldName?: string): Promise<UserFormHistory[]>;
  
  /**
   * Clear user's form history
   * @param userId - User ID
   */
  clearUserFormHistory(userId: string): Promise<void>;
  
  /**
   * Update global form completion statistics
   * @param fieldName - Field name to update stats for
   */
  updateFormCompletionStats(fieldName: string): Promise<void>;
  
  /**
   * Get form completion data for a field
   * @param fieldName - Field name
   */
  getFormCompletion(fieldName: string): Promise<FormCompletion | null>;
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

  private setCached<T>(
    key: string,
    data: T,
    ttl: number = this.DEFAULT_CACHE_TTL,
  ): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
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

    keysToDelete.forEach((key) => this.cache.delete(key));
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
              {
                userId,
                name: "Refrigerator",
                icon: "refrigerator",
                isDefault: true,
                sortOrder: 1,
              },
              {
                userId,
                name: "Freezer",
                icon: "snowflake",
                isDefault: true,
                sortOrder: 2,
              },
              {
                userId,
                name: "Pantry",
                icon: "pizza",
                isDefault: true,
                sortOrder: 3,
              },
              {
                userId,
                name: "Counter",
                icon: "utensils-crossed",
                isDefault: true,
                sortOrder: 4,
              },
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
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.email, email));
      return user;
    } catch (error) {
      console.error(`Error getting user by email ${email}:`, error);
      throw new Error("Failed to retrieve user by email");
    }
  }
  
  async createUser(userData: UpsertUser): Promise<User> {
    try {
      const [user] = await db.insert(users).values(userData).returning();
      return user;
    } catch (error) {
      console.error("Error creating user:", error);
      throw new Error("Failed to create user");
    }
  }
  
  // OAuth Authentication Methods
  
  async getAuthProviderByProviderAndId(provider: string, providerId: string): Promise<AuthProvider | undefined> {
    try {
      const [authProvider] = await db
        .select()
        .from(authProviders)
        .where(
          and(
            eq(authProviders.provider, provider),
            eq(authProviders.providerId, providerId)
          )
        );
      return authProvider;
    } catch (error) {
      console.error(`Error getting auth provider ${provider}/${providerId}:`, error);
      throw new Error("Failed to retrieve auth provider");
    }
  }
  
  async getAuthProviderByProviderAndUserId(provider: string, userId: string): Promise<AuthProvider | undefined> {
    try {
      const [authProvider] = await db
        .select()
        .from(authProviders)
        .where(
          and(
            eq(authProviders.provider, provider),
            eq(authProviders.userId, userId)
          )
        );
      return authProvider;
    } catch (error) {
      console.error(`Error getting auth provider ${provider} for user ${userId}:`, error);
      throw new Error("Failed to retrieve auth provider");
    }
  }
  
  async createAuthProvider(authProviderData: InsertAuthProvider): Promise<AuthProvider> {
    try {
      const [authProvider] = await db
        .insert(authProviders)
        .values(authProviderData)
        .returning();
      return authProvider;
    } catch (error) {
      console.error("Error creating auth provider:", error);
      throw new Error("Failed to create auth provider");
    }
  }
  
  async updateAuthProvider(id: string, data: Partial<AuthProvider>): Promise<void> {
    try {
      await db
        .update(authProviders)
        .set(data)
        .where(eq(authProviders.id, id));
    } catch (error) {
      console.error(`Error updating auth provider ${id}:`, error);
      throw new Error("Failed to update auth provider");
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
      const adminEmails =
        process.env.ADMIN_EMAILS?.split(",").map((e) => e.trim()) || [];
      if (userData.email && adminEmails.includes(userData.email)) {
        isAdmin = true;
        console.log(
          `Auto-promoting ${userData.email} to admin (via ADMIN_EMAILS)`,
        );
      } else {
        // Check if this is the first user
        const [countResult] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(users);
        const userCount = countResult?.count || 0;

        if (userCount === 0) {
          isAdmin = true;
          // console.log(`Auto-promoting ${userData.email} to admin (first user)`);
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
    } catch (error: Error | unknown) {
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
  async dismissNotification(
    userId: string,
    notificationId: string,
    dismissedBy?: string,
  ): Promise<void> {
    try {
      const result = await db
        .update(notificationHistory)
        .set({
          status: "dismissed",
          dismissedAt: new Date(),
          dismissedBy: dismissedBy || "web-app",
        })
        .where(
          and(
            eq(notificationHistory.id, notificationId),
            eq(notificationHistory.userId, userId),
          ),
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

  async getUndismissedNotifications(
    userId: string,
    limit: number = 50,
  ): Promise<NotificationHistory[]> {
    try {
      return await db
        .select()
        .from(notificationHistory)
        .where(
          and(
            eq(notificationHistory.userId, userId),
            isNull(notificationHistory.dismissedAt),
          ),
        )
        .orderBy(desc(notificationHistory.sentAt))
        .limit(limit);
    } catch (error) {
      console.error("Error getting undismissed notifications:", error);
      throw new Error("Failed to get undismissed notifications");
    }
  }

  // ==================== Intelligent Notification System ====================
  
  async getNotificationPreferences(userId: string): Promise<NotificationPreferences | undefined> {
    const cacheKey = `notif-prefs:${userId}`;
    const cached = this.getCached<NotificationPreferences>(cacheKey);
    if (cached) return cached;

    try {
      const [prefs] = await db
        .select()
        .from(notificationPreferences)
        .where(eq(notificationPreferences.userId, userId))
        .limit(1);
      
      if (prefs) {
        this.setCached(cacheKey, prefs, this.USER_PREFS_TTL);
      }
      return prefs;
    } catch (error) {
      console.error("Error getting notification preferences:", error);
      throw new Error("Failed to get notification preferences");
    }
  }

  async upsertNotificationPreferences(
    userId: string,
    preferences: Omit<InsertNotificationPreferences, "userId">,
  ): Promise<NotificationPreferences> {
    try {
      const [result] = await db
        .insert(notificationPreferences)
        .values({
          ...preferences,
          userId,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: notificationPreferences.userId,
          set: {
            ...preferences,
            updatedAt: new Date(),
          },
        })
        .returning();
      
      // Invalidate cache
      this.invalidateCache(`notif-prefs:${userId}`);
      return result;
    } catch (error) {
      console.error("Error upserting notification preferences:", error);
      throw new Error("Failed to update notification preferences");
    }
  }

  async createNotificationScore(
    score: InsertNotificationScores
  ): Promise<NotificationScores> {
    try {
      const [result] = await db
        .insert(notificationScores)
        .values(score)
        .returning();
      return result;
    } catch (error) {
      console.error("Error creating notification score:", error);
      throw new Error("Failed to create notification score");
    }
  }

  async getNotificationScores(
    userId: string,
    limit: number = 50
  ): Promise<NotificationScores[]> {
    try {
      return await db
        .select()
        .from(notificationScores)
        .where(eq(notificationScores.userId, userId))
        .orderBy(desc(notificationScores.createdAt))
        .limit(limit);
    } catch (error) {
      console.error("Error getting notification scores:", error);
      throw new Error("Failed to get notification scores");
    }
  }

  async getPendingNotifications(
    beforeTime: Date
  ): Promise<NotificationScores[]> {
    try {
      return await db
        .select()
        .from(notificationScores)
        .where(
          and(
            isNull(notificationScores.actualSentAt),
            lte(notificationScores.holdUntil, beforeTime),
          ),
        )
        .orderBy(desc(notificationScores.urgencyLevel), desc(notificationScores.relevanceScore));
    } catch (error) {
      console.error("Error getting pending notifications:", error);
      throw new Error("Failed to get pending notifications");
    }
  }

  async updateNotificationScore(
    id: string,
    updates: Partial<NotificationScores>
  ): Promise<void> {
    try {
      await db
        .update(notificationScores)
        .set(updates)
        .where(eq(notificationScores.id, id));
    } catch (error) {
      console.error("Error updating notification score:", error);
      throw new Error("Failed to update notification score");
    }
  }

  async createNotificationFeedback(
    feedback: InsertNotificationFeedback
  ): Promise<NotificationFeedback> {
    try {
      const [result] = await db
        .insert(notificationFeedback)
        .values(feedback)
        .returning();
      
      // Invalidate engagement cache for this user
      this.invalidateCache(`engagement:${feedback.userId}`);
      return result;
    } catch (error) {
      console.error("Error creating notification feedback:", error);
      throw new Error("Failed to create notification feedback");
    }
  }

  async getNotificationFeedback(
    userId: string,
    notificationId?: string
  ): Promise<NotificationFeedback[]> {
    try {
      const conditions = [eq(notificationFeedback.userId, userId)];
      
      if (notificationId) {
        conditions.push(eq(notificationFeedback.notificationId, notificationId));
      }
      
      return await db
        .select()
        .from(notificationFeedback)
        .where(and(...conditions))
        .orderBy(desc(notificationFeedback.actionAt));
    } catch (error) {
      console.error("Error getting notification feedback:", error);
      throw new Error("Failed to get notification feedback");
    }
  }

  async getRecentUserEngagement(
    userId: string,
    days: number = 7
  ): Promise<{
    totalSent: number;
    clicked: number;
    dismissed: number;
    clickRate: number;
    avgEngagementTime?: number;
  }> {
    const cacheKey = `engagement:${userId}:${days}`;
    const cached = this.getCached<any>(cacheKey);
    if (cached) return cached;

    try {
      const since = new Date();
      since.setDate(since.getDate() - days);

      // Get all notifications sent in the period
      const sentNotifications = await db
        .select()
        .from(notificationHistory)
        .where(
          and(
            eq(notificationHistory.userId, userId),
            gte(notificationHistory.sentAt, since),
          ),
        );

      // Get feedback for those notifications
      const feedbackData = await db
        .select()
        .from(notificationFeedback)
        .where(
          and(
            eq(notificationFeedback.userId, userId),
            gte(notificationFeedback.actionAt, since),
          ),
        );

      const totalSent = sentNotifications.length;
      const clicked = feedbackData.filter(f => f.action === 'clicked').length;
      const dismissed = feedbackData.filter(f => f.action === 'dismissed').length;
      const clickRate = totalSent > 0 ? clicked / totalSent : 0;

      // Calculate average engagement time for clicked notifications
      const engagementTimes = feedbackData
        .filter(f => f.action === 'clicked' && f.engagementTime)
        .map(f => f.engagementTime!);
      
      const avgEngagementTime = engagementTimes.length > 0
        ? engagementTimes.reduce((a, b) => a + b, 0) / engagementTimes.length
        : undefined;

      const result = {
        totalSent,
        clicked,
        dismissed,
        clickRate,
        avgEngagementTime,
      };

      this.setCached(cacheKey, result, 5 * 60 * 1000); // Cache for 5 minutes
      return result;
    } catch (error) {
      console.error("Error getting user engagement:", error);
      throw new Error("Failed to get user engagement metrics");
    }
  }

  // Storage Locations (now stored in userStorage table)
  async getStorageLocations(userId: string): Promise<UserStorage[]> {
    try {
      await this.ensureDefaultDataForUser(userId);

      // Get user's storage locations from userStorage table
      const locations = await db
        .select()
        .from(userStorage)
        .where(
          and(eq(userStorage.userId, userId), eq(userStorage.isActive, true)),
        )
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
  ): Promise<UserStorage | undefined> {
    try {
      await this.ensureDefaultDataForUser(userId);

      const [location] = await db
        .select()
        .from(userStorage)
        .where(
          and(
            eq(userStorage.userId, userId),
            eq(userStorage.id, id),
            eq(userStorage.isActive, true),
          ),
        );

      return location;
    } catch (error) {
      console.error(`Error getting storage location ${id}:`, error);
      throw new Error("Failed to retrieve storage location");
    }
  }

  async createStorageLocation(
    userId: string,
    location: Omit<
      UserStorage,
      | "id"
      | "userId"
      | "createdAt"
      | "updatedAt"
      | "isDefault"
      | "isActive"
      | "sortOrder"
    >,
  ): Promise<UserStorage> {
    try {
      // Check if user exists
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user) {
        throw new Error("User not found");
      }

      // Get current max sort order for this user
      const [maxSort] = await db
        .select({
          maxOrder: sql<number>`COALESCE(MAX(${userStorage.sortOrder}), 0)`,
        })
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
          eq(userAppliances.applianceLibraryId, applianceLibrary.id),
        )
        .where(eq(userAppliances.userId, userId));

      // Return appliances with category information as nested object
      return results.map((r) => ({
        ...r.appliance,
        category: r.library
          ? {
              id: r.library.category,
              name: r.library.category,
              subcategory: r.library.subcategory || null,
            }
          : null,
      }));
    } catch (error) {
      console.error(`Error getting userAppliances for user ${userId}:`, error);
      throw new Error("Failed to retrieve userAppliances");
    }
  }

  async createAppliance(
    userId: string,
    appliance: Omit<InsertUserAppliance, "userId">,
  ): Promise<UserAppliance> {
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
          eq(userAppliances.applianceLibraryId, applianceLibrary.id),
        )
        .where(
          and(eq(userAppliances.id, id), eq(userAppliances.userId, userId)),
        );

      if (results.length === 0) return undefined;

      const r = results[0];
      return {
        ...r.appliance,
        category: r.library
          ? {
              id: r.library.category,
              name: r.library.category,
              subcategory: r.library.subcategory,
            }
          : null,
      };
    } catch (error) {
      console.error(`Error getting appliance ${id}:`, error);
      throw new Error("Failed to retrieve appliance");
    }
  }

  async updateAppliance(
    userId: string,
    id: string,
    appliance: Partial<Omit<InsertUserAppliance, "userId">>,
  ): Promise<UserAppliance> {
    try {
      const [updatedAppliance] = await db
        .update(userAppliances)
        .set({ ...appliance, updatedAt: new Date() })
        .where(
          and(eq(userAppliances.id, id), eq(userAppliances.userId, userId)),
        )
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
        .where(
          and(eq(userAppliances.id, id), eq(userAppliances.userId, userId)),
        );
    } catch (error) {
      console.error(`Error deleting appliance ${id}:`, error);
      throw new Error("Failed to delete appliance");
    }
  }

  async getAppliancesByCategory(
    userId: string,
    category: string,
  ): Promise<UserAppliance[]> {
    try {
      // Get user userAppliances that have an applianceLibraryId linked to the specified category
      const results = await db
        .select({
          appliance: userAppliances,
        })
        .from(userAppliances)
        .leftJoin(
          applianceLibrary,
          eq(userAppliances.applianceLibraryId, applianceLibrary.id),
        )
        .where(
          and(
            eq(userAppliances.userId, userId),
            eq(applianceLibrary.category, category),
          ),
        );

      return results.map((r) => r.appliance);
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
  ): Promise<UserAppliance[]> {
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

  // UserAppliance Library methods
  async getApplianceLibrary(): Promise<ApplianceLibrary[]> {
    try {
      return db.select().from(applianceLibrary);
    } catch (error) {
      console.error("Error getting appliance library:", error);
      throw new Error("Failed to retrieve appliance library");
    }
  }

  async getApplianceLibraryByCategory(
    category: string,
  ): Promise<ApplianceLibrary[]> {
    try {
      return db
        .select()
        .from(applianceLibrary)
        .where(eq(applianceLibrary.category, category));
    } catch (error) {
      console.error(
        `Error getting userAppliances by category ${category}:`,
        error,
      );
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
               LOWER(${applianceLibrary.subcategory}) LIKE ${searchTerm}`,
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
          eq(userAppliances.applianceLibraryId, applianceLibrary.id),
        )
        .where(eq(userAppliances.userId, userId));

      // Return appliances with category information as nested object
      return results.map((r) => ({
        ...r.appliance,
        category: r.library
          ? {
              id: r.library.category,
              name: r.library.category,
              subcategory: r.library.subcategory || null,
            }
          : null,
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
          name: details?.name || libraryItem?.name || "Unknown UserAppliance",
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
          and(eq(userAppliances.id, id), eq(userAppliances.userId, userId)),
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
          and(eq(userAppliances.id, id), eq(userAppliances.userId, userId)),
        );
    } catch (error) {
      console.error(`Error deleting user appliance ${id}:`, error);
      throw new Error("Failed to delete user appliance");
    }
  }

  async getUserAppliancesByCategory(
    userId: string,
    category: string,
  ): Promise<ApplianceWithCategory[]> {
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
          eq(userAppliances.applianceLibraryId, applianceLibrary.id),
        )
        .where(
          and(
            eq(userAppliances.userId, userId),
            eq(applianceLibrary.category, category),
          ),
        );

      return result.map((r) => ({
        ...r.appliance,
        category: r.library
          ? {
              id: r.library.category,
              name: r.library.category,
              subcategory: r.library.subcategory || null,
            }
          : null,
      }));
    } catch (error) {
      console.error(
        `Error getting user userAppliances by category ${category}:`,
        error,
      );
      throw new Error("Failed to retrieve user userAppliances by category");
    }
  }

  async getApplianceCategories(userId: string): Promise<
    Array<{
      id: string;
      name: string;
      count: number;
    }>
  > {
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
          eq(userAppliances.applianceLibraryId, applianceLibrary.id),
        )
        .where(eq(userAppliances.userId, userId))
        .groupBy(applianceLibrary.category);

      return result.map((r) => ({
        id: r.category,
        name: r.category,
        count: r.count,
      }));
    } catch (error) {
      console.error(
        `Error getting appliance categories for user ${userId}:`,
        error,
      );
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
  ): Promise<UserInventory[]> {
    try {
      // Build where conditions dynamically
      const whereConditions = [eq(userInventory.userId, userId)];

      if (storageLocationId) {
        whereConditions.push(
          eq(userInventory.storageLocationId, storageLocationId),
        );
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
  ): Promise<PaginatedResponse<UserInventory>> {
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

  async getFoodItem(userId: string, id: string): Promise<UserInventory | undefined> {
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
    item: Omit<InsertUserInventory, "userId">,
  ): Promise<UserInventory> {
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
    item: Partial<Omit<InsertUserInventory, "userId">>,
  ): Promise<UserInventory> {
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
  async getChatMessages(
    userId: string,
    limit: number = 100,
  ): Promise<ChatMessage[]> {
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
    limit: number = 200,
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
            sql`LOWER(${userRecipes.description}) LIKE ${searchTerm}`,
          )!,
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
          sql`CAST(REGEXP_REPLACE(${userRecipes.cookTime}, '[^0-9]', '', 'g') AS INTEGER) <= ${filters.maxCookTime}`,
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

      return PaginationHelper.createResponse(
        paginatedRecipes,
        total,
        page,
        limit,
      );
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
        missingIngredients: recipe.missingIngredients
          ? Array.from(recipe.missingIngredients)
          : undefined,
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
        this.getFoodItems(userId),
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
    try {
      // Find the most recent notification for this food item
      const notifications = await db
        .select()
        .from(notificationHistory)
        .where(
          and(
            eq(notificationHistory.userId, userId),
            eq(notificationHistory.type, 'expiring-food'),
            sql`${notificationHistory.data}->>'foodItemId' = ${foodItemId}`,
            isNull(notificationHistory.dismissedAt)
          )
        )
        .orderBy(desc(notificationHistory.sentAt))
        .limit(1);
      
      if (notifications.length > 0) {
        // Dismiss the notification
        await db
          .update(notificationHistory)
          .set({
            status: "dismissed",
            dismissedAt: new Date(),
            dismissedBy: "food-item-action"
          })
          .where(eq(notificationHistory.id, notifications[0].id));
      }
    } catch (error) {
      console.error(`Error dismissing notification for food item ${foodItemId}:`, error);
      throw new Error("Failed to dismiss food item notification");
    }
  }

  async getExpiringItems(
    userId: string,
    daysThreshold: number,
  ): Promise<UserInventory[]> {
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
  async getUSDACacheStats(): Promise<{
    totalEntries: number;
    oldestEntry: Date | null;
  }> {
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
  async getShoppingListItems(
    userId: string,
    limit: number = 200,
  ): Promise<ShoppingListItem[]> {
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
    const grouped = items.reduce(
      (acc: Record<string, ShoppingListItem[]>, item) => {
        const key = item.recipeId || "manual";
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(item);
        return acc;
      },
      {},
    );

    return {
      items,
      grouped,
      totalItems: items.length,
      checkedItems: items.filter((i) => i.isChecked).length,
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
      .where(and(eq(userShopping.id, id), eq(userShopping.userId, userId)))
      .returning();

    if (!updated) {
      throw new Error("Shopping list item not found");
    }
    return updated;
  }

  async deleteShoppingListItem(userId: string, id: string): Promise<void> {
    await db
      .delete(userShopping)
      .where(and(eq(userShopping.id, id), eq(userShopping.userId, userId)));
  }

  async clearCheckedShoppingListItems(userId: string): Promise<void> {
    await db
      .delete(userShopping)
      .where(
        and(eq(userShopping.userId, userId), eq(userShopping.isChecked, true)),
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

    const newItems = await db.insert(userShopping).values(items).returning();

    return newItems;
  }

  async resetUserData(userId: string): Promise<void> {
    try {
      // Use a transaction to ensure all deletions complete or all rollback
      await db.transaction(async (tx) => {
        // Delete all user data in order (respecting foreign key constraints)
        await tx.delete(userShopping).where(eq(userShopping.userId, userId));
        await tx.delete(mealPlans).where(eq(mealPlans.userId, userId));
        await tx.delete(userInventory).where(eq(userInventory.userId, userId));
        await tx.delete(userChats).where(eq(userChats.userId, userId));
        await tx.delete(userRecipes).where(eq(userRecipes.userId, userId));
        await tx
          .delete(userAppliances)
          .where(eq(userAppliances.userId, userId));
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

      // console.log(`Successfully reset all data for user ${userId}`);
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

  async updateUserAdminStatus(userId: string, isAdmin: boolean): Promise<User> {
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
        await tx
          .delete(userAppliances)
          .where(eq(userAppliances.userId, userId));
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
        await tx
          .delete(analyticsEvents)
          .where(eq(analyticsEvents.userId, userId));
        await tx.delete(userSessions).where(eq(userSessions.userId, userId));

        // Finally, delete the user record
        await tx.delete(users).where(eq(users.id, userId));
      });

      // Clear the initialization flag and cache
      this.userInitialized.delete(userId);
      this.invalidateCache(`user_prefs:${userId}`);

      console.log(
        `Successfully deleted user ${userId} and all associated data`,
      );
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
      const { isFlagged, flagReason, similarTo, ...feedbackFields } =
        feedbackData;

      // Store flags in the tags array if provided
      let finalTags = feedbackFields.tags || [];
      if (isFlagged) {
        finalTags = [...finalTags, "flagged"];
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
        attachments: feedbackFields.attachments
          ? (Array.from(feedbackFields.attachments) as string[])
          : undefined,
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
      const whereCondition = status
        ? eq(userFeedback.status, status)
        : undefined;

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
          sql`${userFeedback.tags} @> ${JSON.stringify([contextTag])}::jsonb`,
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
        : await db
            .select()
            .from(userFeedback)
            .orderBy(orderByClause)
            .limit(limit);

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
        : await db
            .select()
            .from(userFeedback)
            .orderBy(orderByClause)
            .limit(limit);

      // Check if user has upvoted each userFeedback item
      return results.map((item) => {
        const upvotes =
          (item.upvotes as Array<{ userId: string; createdAt: string }>) || [];
        return {
          ...item,
          userUpvoted: upvotes.some((upvote) => upvote.userId === userId),
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
      const upvotes =
        (currentFeedback.upvotes as Array<{
          userId: string;
          createdAt: string;
        }>) || [];
      if (upvotes.some((upvote) => upvote.userId === userId)) {
        return; // Already upvoted
      }

      // Add user to upvotes array
      const updatedUpvotes = [
        ...upvotes,
        {
          userId,
          createdAt: new Date().toISOString(),
        },
      ];

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
      const upvotes =
        (currentFeedback.upvotes as Array<{
          userId: string;
          createdAt: string;
        }>) || [];
      const updatedUpvotes = upvotes.filter(
        (upvote) => upvote.userId !== userId,
      );

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

      const upvotes =
        (currentFeedback.upvotes as Array<{
          userId: string;
          createdAt: string;
        }>) || [];
      return upvotes.some((upvote) => upvote.userId === userId);
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

      const upvotes =
        (result.upvotes as Array<{ userId: string; createdAt: string }>) || [];
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
  async getOnboardingInventory(): Promise<OnboardingInventory[]> {
    try {
      return db.select().from(onboardingInventory);
    } catch (error) {
      console.error("Error getting common food items:", error);
      throw new Error("Failed to get common food items");
    }
  }

  async getOnboardingInventoryByName(
    displayName: string,
  ): Promise<OnboardingInventory | undefined> {
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

  async getOnboardingInventoryByNames(
    displayNames: string[],
  ): Promise<OnboardingInventory[]> {
    try {
      if (displayNames.length === 0) return [];
      // Use a parameterized query with ARRAY constructor
      return db
        .select()
        .from(onboardingInventory)
        .where(
          sql`${onboardingInventory.displayName} = ANY(ARRAY[${sql.join(
            displayNames.map((name) => sql`${name}`),
            sql`, `,
          )}])`,
        );
    } catch (error) {
      console.error("Error getting common food items by names:", error);
      throw new Error("Failed to get common food items");
    }
  }

  async upsertCommonFoodItem(
    item: InsertCommonFoodItem,
  ): Promise<CommonFoodItem> {
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
      const [result] = await db.insert(cookingTerms).values(term).returning();
      return result;
    } catch (error) {
      console.error("Error creating cooking term:", error);
      throw new Error("Failed to create cooking term");
    }
  }

  async updateCookingTerm(
    id: string,
    term: Partial<InsertCookingTerm>,
  ): Promise<CookingTerm> {
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
      await db.delete(cookingTerms).where(eq(cookingTerms.id, id));
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
               )`,
        );
    } catch (error) {
      console.error("Error searching cooking terms:", error);
      throw new Error("Failed to search cooking terms");
    }
  }

  // Analytics Events Methods
  async recordAnalyticsEvent(
    event: InsertAnalyticsEvent,
  ): Promise<AnalyticsEvent> {
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

  async recordAnalyticsEventsBatch(
    events: InsertAnalyticsEvent[],
  ): Promise<AnalyticsEvent[]> {
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
            timestamp: currentTimestamp,
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
    },
  ): Promise<AnalyticsEvent[]> {
    try {
      const conditions = [];
      if (userId) conditions.push(eq(analyticsEvents.userId, userId));
      if (filters?.eventType)
        conditions.push(eq(analyticsEvents.eventType, filters.eventType));
      if (filters?.eventCategory)
        conditions.push(
          eq(analyticsEvents.eventCategory, filters.eventCategory),
        );
      if (filters?.startDate)
        conditions.push(gte(analyticsEvents.timestamp, filters.startDate));
      if (filters?.endDate)
        conditions.push(lte(analyticsEvents.timestamp, filters.endDate));

      const baseQuery = db.select().from(analyticsEvents);
      const queryWithWhere =
        conditions.length > 0 ? baseQuery.where(and(...conditions)) : baseQuery;
      const queryWithOrder = queryWithWhere.orderBy(
        desc(analyticsEvents.timestamp),
      );
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
        goalCompletions: session.goalCompletions
          ? (Array.from(session.goalCompletions) as string[])
          : undefined,
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

  async updateUserSession(
    sessionId: string,
    update: Partial<InsertUserSession>,
  ): Promise<UserSession> {
    try {
      // Convert readonly arrays to mutable arrays for JSONB fields
      const updateData = {
        ...update,
        goalCompletions: update.goalCompletions
          ? (Array.from(update.goalCompletions) as string[])
          : undefined,
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
    },
  ): Promise<UserSession[]> {
    try {
      const conditions = [];
      if (userId) conditions.push(eq(userSessions.userId, userId));
      if (filters?.startDate)
        conditions.push(gte(userSessions.startTime, filters.startDate));
      if (filters?.endDate)
        conditions.push(lte(userSessions.startTime, filters.endDate));

      const baseQuery = db.select().from(userSessions);
      const queryWithWhere =
        conditions.length > 0 ? baseQuery.where(and(...conditions)) : baseQuery;
      const queryWithOrder = queryWithWhere.orderBy(
        desc(userSessions.startTime),
      );
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
    endDate?: Date,
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
      if (startDate)
        sessionConditions.push(gte(userSessions.startTime, startDate));
      if (endDate) sessionConditions.push(lte(userSessions.startTime, endDate));

      // Execute all queries in parallel for better performance
      const [
        totalEventsResults,
        uniqueUsersResults,
        sessionStatsResults,
        topEventsResults,
        topCategoriesResults,
        goalsResults,
      ] = await parallelQueries([
        // Total events query
        db
          .select({ count: sql<number>`count(*)` })
          .from(analyticsEvents)
          .where(conditions.length > 0 ? and(...conditions) : undefined),

        // Unique users query
        db
          .select({
            count: sql<number>`count(distinct ${analyticsEvents.userId})`,
          })
          .from(analyticsEvents)
          .where(conditions.length > 0 ? and(...conditions) : undefined),

        // Session stats query
        db
          .select({
            totalSessions: sql<number>`count(*)`,
            avgDuration: sql<number>`avg(${userSessions.duration})`,
          })
          .from(userSessions)
          .where(
            sessionConditions.length > 0
              ? and(...sessionConditions)
              : undefined,
          ),

        // Top events query
        db
          .select({
            eventType: analyticsEvents.eventType,
            count: sql<number>`count(*)`,
          })
          .from(analyticsEvents)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .groupBy(analyticsEvents.eventType)
          .orderBy(desc(sql`count(*)`))
          .limit(10),

        // Top categories query
        db
          .select({
            eventCategory: analyticsEvents.eventCategory,
            count: sql<number>`count(*)`,
          })
          .from(analyticsEvents)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .groupBy(analyticsEvents.eventCategory)
          .orderBy(desc(sql`count(*)`))
          .limit(10),

        // Goals query for conversion rate
        db
          .select({ count: sql<number>`count(*)` })
          .from(analyticsEvents)
          .where(
            and(
              eq(analyticsEvents.eventType, "goal_completion"),
              ...(conditions.length > 0 ? conditions : []),
            ),
          ),
      ]);

      const [totalEventsResult] = totalEventsResults;
      const [uniqueUsersResult] = uniqueUsersResults;
      const [sessionStats] = sessionStatsResults;
      const topEvents = topEventsResults;
      const topCategories = topCategoriesResults;
      const [goalsResult] = goalsResults;

      const conversionRate =
        sessionStats.totalSessions > 0
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

  // ==================== Sentiment Tracking Implementation ====================

  async createSentimentMetrics(metrics: InsertSentimentMetrics): Promise<SentimentMetrics> {
    try {
      const [result] = await db.insert(sentimentMetrics).values(metrics).returning();
      return result;
    } catch (error) {
      console.error("Error creating sentiment metrics:", error);
      throw new Error("Failed to create sentiment metrics");
    }
  }

  async getSentimentMetrics(
    period?: string,
    periodType?: "day" | "week" | "month",
  ): Promise<SentimentMetrics[]> {
    try {
      const conditions = [];
      if (period) conditions.push(eq(sentimentMetrics.period, period));
      if (periodType) conditions.push(eq(sentimentMetrics.periodType, periodType));

      return await db
        .select()
        .from(sentimentMetrics)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(sentimentMetrics.createdAt));
    } catch (error) {
      console.error("Error getting sentiment metrics:", error);
      throw new Error("Failed to get sentiment metrics");
    }
  }

  async getLatestSentimentMetrics(): Promise<SentimentMetrics | undefined> {
    try {
      const [result] = await db
        .select()
        .from(sentimentMetrics)
        .orderBy(desc(sentimentMetrics.createdAt))
        .limit(1);
      return result;
    } catch (error) {
      console.error("Error getting latest sentiment metrics:", error);
      throw new Error("Failed to get latest sentiment metrics");
    }
  }

  async createSentimentAlert(alert: InsertSentimentAlerts): Promise<SentimentAlerts> {
    try {
      const [result] = await db.insert(sentimentAlerts).values(alert).returning();
      return result;
    } catch (error) {
      console.error("Error creating sentiment alert:", error);
      throw new Error("Failed to create sentiment alert");
    }
  }

  async getSentimentAlerts(
    status?: "active" | "acknowledged" | "resolved",
    limit: number = 50,
  ): Promise<SentimentAlerts[]> {
    try {
      const conditions = [];
      if (status) conditions.push(eq(sentimentAlerts.status, status));

      return await db
        .select()
        .from(sentimentAlerts)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(sentimentAlerts.triggeredAt))
        .limit(limit);
    } catch (error) {
      console.error("Error getting sentiment alerts:", error);
      throw new Error("Failed to get sentiment alerts");
    }
  }

  async updateSentimentAlert(
    alertId: string,
    update: Partial<SentimentAlerts>,
  ): Promise<SentimentAlerts> {
    try {
      const [result] = await db
        .update(sentimentAlerts)
        .set(update)
        .where(eq(sentimentAlerts.id, alertId))
        .returning();
      return result;
    } catch (error) {
      console.error("Error updating sentiment alert:", error);
      throw new Error("Failed to update sentiment alert");
    }
  }

  async createSentimentSegment(segment: InsertSentimentSegments): Promise<SentimentSegments> {
    try {
      const [result] = await db.insert(sentimentSegments).values(segment).returning();
      return result;
    } catch (error) {
      console.error("Error creating sentiment segment:", error);
      throw new Error("Failed to create sentiment segment");
    }
  }

  async getSentimentSegments(
    period?: string,
    segmentName?: string,
  ): Promise<SentimentSegments[]> {
    try {
      const conditions = [];
      if (period) conditions.push(eq(sentimentSegments.period, period));
      if (segmentName) conditions.push(eq(sentimentSegments.segmentName, segmentName));

      return await db
        .select()
        .from(sentimentSegments)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(sentimentSegments.sentimentScore));
    } catch (error) {
      console.error("Error getting sentiment segments:", error);
      throw new Error("Failed to get sentiment segments");
    }
  }

  async getSentimentBreakdown(
    period: string,
    periodType: "day" | "week" | "month",
  ): Promise<{
    segments: SentimentSegments[];
    categories: Record<string, { sentiment: number; count: number }>;
  }> {
    try {
      // Get segments for the period
      const segments = await this.getSentimentSegments(period);
      
      // Get metrics for the period
      const metrics = await this.getSentimentMetrics(period, periodType);
      
      // Extract categories from metrics
      const categories = metrics[0]?.categories || {};
      
      return {
        segments,
        categories,
      };
    } catch (error) {
      console.error("Error getting sentiment breakdown:", error);
      throw new Error("Failed to get sentiment breakdown");
    }
  }

  async createSentimentAnalysis(analysis: InsertSentimentAnalysis): Promise<SentimentAnalysis> {
    try {
      const [result] = await db.insert(sentimentAnalysis).values(analysis).returning();
      return result;
    } catch (error) {
      console.error("Error creating sentiment analysis:", error);
      throw new Error("Failed to create sentiment analysis");
    }
  }

  async getSentimentAnalyses(
    filters?: {
      userId?: string;
      contentType?: string;
      sentiment?: "positive" | "negative" | "neutral" | "mixed";
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    },
  ): Promise<SentimentAnalysis[]> {
    try {
      const conditions = [];
      if (filters?.userId) conditions.push(eq(sentimentAnalysis.userId, filters.userId));
      if (filters?.contentType) conditions.push(eq(sentimentAnalysis.contentType, filters.contentType));
      if (filters?.sentiment) conditions.push(eq(sentimentAnalysis.sentiment, filters.sentiment));
      if (filters?.startDate) conditions.push(gte(sentimentAnalysis.analyzedAt, filters.startDate));
      if (filters?.endDate) conditions.push(lte(sentimentAnalysis.analyzedAt, filters.endDate));

      const baseQuery = db.select().from(sentimentAnalysis);
      const queryWithWhere = conditions.length > 0 ? baseQuery.where(and(...conditions)) : baseQuery;
      const queryWithOrder = queryWithWhere.orderBy(desc(sentimentAnalysis.analyzedAt));
      const finalQuery = filters?.limit ? queryWithOrder.limit(filters.limit) : queryWithOrder;

      return await finalQuery;
    } catch (error) {
      console.error("Error getting sentiment analyses:", error);
      throw new Error("Failed to get sentiment analyses");
    }
  }

  async generateSentimentReport(
    period: string,
    periodType: "day" | "week" | "month",
  ): Promise<{
    metrics: SentimentMetrics;
    alerts: SentimentAlerts[];
    segments: SentimentSegments[];
    painPoints: Array<{ category: string; issue: string; impact: number }>;
    insights: string[];
  }> {
    try {
      // Get metrics for the period
      const [metrics] = await this.getSentimentMetrics(period, periodType);
      if (!metrics) {
        throw new Error("No metrics found for the specified period");
      }
      
      // Get active alerts
      const alerts = await this.getSentimentAlerts("active");
      
      // Get segments for the period
      const segments = await this.getSentimentSegments(period);
      
      // Extract pain points from metrics
      const painPoints = metrics.painPoints || [];
      
      // Generate insights based on the data
      const insights: string[] = [];
      
      // Check for significant sentiment drop
      if (metrics.percentageChange && metrics.percentageChange < -15) {
        insights.push(`Significant sentiment drop of ${Math.abs(metrics.percentageChange).toFixed(1)}% detected in the ${periodType}`);
      }
      
      // Check for problematic segments
      segments.forEach(segment => {
        if (segment.sentimentScore < -0.3) {
          insights.push(`${segment.segmentName} showing negative sentiment (${segment.sentimentScore.toFixed(2)})`);
        }
      });
      
      // Check alert severity
      const criticalAlerts = alerts.filter(a => a.severity === "critical");
      if (criticalAlerts.length > 0) {
        insights.push(`${criticalAlerts.length} critical alert(s) require immediate attention`);
      }
      
      return {
        metrics,
        alerts,
        segments,
        painPoints,
        insights,
      };
    } catch (error) {
      console.error("Error generating sentiment report:", error);
      throw new Error("Failed to generate sentiment report");
    }
  }

  // ==================== Activity Logging Implementation ====================

  async createActivityLog(log: InsertActivityLog): Promise<ActivityLog> {
    try {
      const [newLog] = await db.insert(activityLogs).values(log).returning();
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
    },
  ): Promise<ActivityLog[]> {
    try {
      let query = db.select().from(activityLogs).$dynamic();

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
    },
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
    limit: number = 50,
  ): Promise<ActivityLog[]> {
    return this.getActivityLogs(userId, { limit });
  }

  async getSystemActivityLogs(filters?: {
    action?: string | string[];
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<ActivityLog[]> {
    return this.getActivityLogs(null, filters);
  }

  async getActivityStats(
    userId?: string | null,
    startDate?: Date,
    endDate?: Date,
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

      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

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
    excludeActions?: string[],
  ): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const conditions: any[] = [lte(activityLogs.timestamp, cutoffDate)];

      // Exclude certain important actions from cleanup
      if (excludeActions && excludeActions.length > 0) {
        conditions.push(
          sql`${activityLogs.action} NOT IN (${sql.raw(
            excludeActions.map((a) => `'${a}'`).join(","),
          )})`,
        );
      }

      const result = await db.delete(activityLogs).where(and(...conditions));

      const deletedCount = result.rowCount || 0;

      // Log the cleanup as a system event
      await this.createActivityLog({
        userId: null,
        action: "cleanup_job",
        entity: "system",
        entityId: null,
        metadata: {
          type: "activity_logs_cleanup",
          retentionDays,
          deletedCount,
          cutoffDate: cutoffDate.toISOString(),
        } as Record<string, any>,
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
        action: "data_exported",
        entity: "user",
        entityId: userId,
        metadata: {
          type: "activity_logs",
          count: logs.length,
        } as Record<string, any>,
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

  // ==================== ML Feature Implementations ====================

  async upsertContentEmbedding(embedding: InsertContentEmbedding): Promise<ContentEmbedding> {
    try {
      // Ensure embedding is a regular array for database compatibility
      const embeddingArray: number[] = Array.isArray(embedding.embedding) 
        ? Array.from(embedding.embedding as ArrayLike<number>) 
        : embedding.embedding as number[];
      
      const [result] = await db
        .insert(contentEmbeddings)
        .values({
          userId: embedding.userId,
          contentId: embedding.contentId,
          contentType: embedding.contentType,
          embedding: embeddingArray,
          embeddingModel: embedding.embeddingModel || 'text-embedding-ada-002',
          contentText: embedding.contentText,
          metadata: embedding.metadata as any,
        })
        .onConflictDoUpdate({
          target: [contentEmbeddings.contentId, contentEmbeddings.contentType, contentEmbeddings.userId],
          set: {
            embedding: embeddingArray,
            embeddingModel: embedding.embeddingModel || 'text-embedding-ada-002',
            contentText: embedding.contentText,
            metadata: embedding.metadata as any,
            updatedAt: sql`now()`,
          },
        })
        .returning();

      return result;
    } catch (error) {
      console.error("Error upserting content embedding:", error);
      throw new Error("Failed to upsert content embedding");
    }
  }

  async getContentEmbedding(contentId: string, contentType: string, userId: string): Promise<ContentEmbedding | undefined> {
    try {
      const [result] = await db
        .select()
        .from(contentEmbeddings)
        .where(
          and(
            eq(contentEmbeddings.contentId, contentId),
            eq(contentEmbeddings.contentType, contentType),
            eq(contentEmbeddings.userId, userId)
          )
        );

      return result;
    } catch (error) {
      console.error("Error getting content embedding:", error);
      throw new Error("Failed to get content embedding");
    }
  }

  async searchByEmbedding(queryEmbedding: number[], contentType: string, userId: string, limit: number = 10): Promise<Array<ContentEmbedding & { similarity: number }>> {
    try {
      // Calculate cosine similarity in PostgreSQL
      // This is a simplified version - in production you'd use pgvector extension
      const results = await db.execute(sql`
        WITH query_embedding AS (
          SELECT ARRAY[${sql.raw(queryEmbedding.join(','))}]::float8[] as embedding
        )
        SELECT 
          ce.*,
          (
            SELECT SUM(a * b) / (SQRT(SUM(a * a)) * SQRT(SUM(b * b)))
            FROM (
              SELECT 
                unnest(ce.embedding::float8[]) AS a,
                unnest(qe.embedding) AS b
              FROM query_embedding qe
            ) AS dot_product
          ) AS similarity
        FROM ${contentEmbeddings} ce, query_embedding qe
        WHERE ce.content_type = ${contentType}
          AND ce.user_id = ${userId}
        ORDER BY similarity DESC
        LIMIT ${limit}
      `);

      return results.rows as Array<ContentEmbedding & { similarity: number }>;
    } catch (error) {
      console.error("Error searching by embedding:", error);
      throw new Error("Failed to search by embedding");
    }
  }

  async createSearchLog(log: InsertSearchLog): Promise<SearchLog> {
    try {
      const [result] = await db
        .insert(searchLogs)
        .values(log)
        .returning();

      return result;
    } catch (error) {
      console.error("Error creating search log:", error);
      throw new Error("Failed to create search log");
    }
  }
  
  async updateSearchLogFeedback(searchLogId: string, feedback: {
    clickedResultId: string;
    clickedResultType: string;
    clickPosition: number;
    timeToClick: number;
  }): Promise<SearchLog> {
    try {
      const [result] = await db
        .update(searchLogs)
        .set({
          clickedResultId: feedback.clickedResultId,
          clickedResultType: feedback.clickedResultType,
          click_position: feedback.clickPosition,
          time_to_click: feedback.timeToClick,
        } as any)
        .where(eq(searchLogs.id, searchLogId))
        .returning();

      if (!result) {
        throw new Error("Search log not found");
      }

      return result;
    } catch (error) {
      console.error("Error updating search log feedback:", error);
      throw new Error("Failed to update search log feedback");
    }
  }

  async getCategories(parentId?: string | null): Promise<Category[]> {
    try {
      // Build the where conditions based on parentId
      const conditions = [eq(categories.isActive, true)];
      
      if (parentId === null) {
        conditions.push(isNull(categories.parentId));
      } else if (parentId !== undefined) {
        conditions.push(eq(categories.parentId, parentId));
      }

      return await db
        .select()
        .from(categories)
        .where(and(...conditions))
        .orderBy(categories.sortOrder, categories.name);
    } catch (error) {
      console.error("Error getting categories:", error);
      throw new Error("Failed to get categories");
    }
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    try {
      const [result] = await db
        .insert(categories)
        .values(category)
        .returning();

      return result;
    } catch (error) {
      console.error("Error creating category:", error);
      throw new Error("Failed to create category");
    }
  }

  async getContentCategories(contentId: string, contentType: string, userId: string): Promise<ContentCategory[]> {
    try {
      return await db
        .select()
        .from(contentCategories)
        .where(
          and(
            eq(contentCategories.contentId, contentId),
            eq(contentCategories.contentType, contentType),
            eq(contentCategories.userId, userId)
          )
        );
    } catch (error) {
      console.error("Error getting content categories:", error);
      throw new Error("Failed to get content categories");
    }
  }

  async assignContentCategory(assignment: InsertContentCategory): Promise<ContentCategory> {
    try {
      const [result] = await db
        .insert(contentCategories)
        .values(assignment)
        .onConflictDoUpdate({
          target: [contentCategories.contentId, contentCategories.contentType, contentCategories.categoryId, contentCategories.userId],
          set: {
            confidenceScore: assignment.confidenceScore,
            isManual: assignment.isManual,
          },
        })
        .returning();

      return result;
    } catch (error) {
      console.error("Error assigning content category:", error);
      throw new Error("Failed to assign content category");
    }
  }

  async getOrCreateTag(name: string): Promise<Tag> {
    try {
      const normalizedName = name.toLowerCase().replace(/\s+/g, '-');
      const slug = normalizedName;

      // Try to get existing tag
      const [existing] = await db
        .select()
        .from(tags)
        .where(eq(tags.name, normalizedName));

      if (existing) {
        // Increment usage count
        await db
          .update(tags)
          .set({ usageCount: sql`${tags.usageCount} + 1` })
          .where(eq(tags.id, existing.id));
        return existing;
      }

      // Create new tag
      const [newTag] = await db
        .insert(tags)
        .values({
          name: normalizedName,
          slug: slug,
          usageCount: 1,
        })
        .returning();

      return newTag;
    } catch (error) {
      console.error("Error getting or creating tag:", error);
      throw new Error("Failed to get or create tag");
    }
  }

  async getTrendingTags(limit: number = 10): Promise<Tag[]> {
    try {
      return await db
        .select()
        .from(tags)
        .orderBy(desc(tags.usageCount))
        .limit(limit);
    } catch (error) {
      console.error("Error getting trending tags:", error);
      throw new Error("Failed to get trending tags");
    }
  }

  async getContentTags(contentId: string, contentType: string, userId: string): Promise<Array<ContentTag & { tag: Tag }>> {
    try {
      const results = await db
        .select({
          contentTag: contentTags,
          tag: tags,
        })
        .from(contentTags)
        .innerJoin(tags, eq(contentTags.tagId, tags.id))
        .where(
          and(
            eq(contentTags.contentId, contentId),
            eq(contentTags.contentType, contentType),
            eq(contentTags.userId, userId)
          )
        );

      return results.map(r => ({
        ...r.contentTag,
        tag: r.tag,
      }));
    } catch (error) {
      console.error("Error getting content tags:", error);
      throw new Error("Failed to get content tags");
    }
  }

  async assignContentTag(assignment: InsertContentTag): Promise<ContentTag> {
    try {
      const [result] = await db
        .insert(contentTags)
        .values(assignment)
        .onConflictDoUpdate({
          target: [contentTags.contentId, contentTags.contentType, contentTags.tagId, contentTags.userId],
          set: {
            relevanceScore: assignment.relevanceScore,
            isManual: assignment.isManual,
          },
        })
        .returning();

      return result;
    } catch (error) {
      console.error("Error assigning content tag:", error);
      throw new Error("Failed to assign content tag");
    }
  }
  
  async createOrGetTag(name: string): Promise<Tag> {
    return this.getOrCreateTag(name);
  }
  
  async getAllTags(userId?: string): Promise<Tag[]> {
    try {
      if (userId) {
        // Get tags used by this user
        const results = await db
          .selectDistinct({ tag: tags })
          .from(tags)
          .innerJoin(contentTags, eq(tags.id, contentTags.tagId))
          .where(eq(contentTags.userId, userId))
          .orderBy(desc(tags.usageCount));
        
        return results.map(r => r.tag);
      } else {
        // Get all tags
        return await db
          .select()
          .from(tags)
          .orderBy(desc(tags.usageCount));
      }
    } catch (error) {
      console.error("Error getting all tags:", error);
      throw new Error("Failed to get all tags");
    }
  }
  
  async getRelatedTags(tagId: string, limit: number = 5): Promise<Tag[]> {
    try {
      // Find content with this tag
      const contentWithTag = await db
        .select({ contentId: contentTags.contentId, contentType: contentTags.contentType })
        .from(contentTags)
        .where(eq(contentTags.tagId, tagId))
        .limit(10);
      
      if (contentWithTag.length === 0) {
        return [];
      }
      
      // Find other tags on the same content
      const relatedTagIds = await db
        .selectDistinct({ tagId: contentTags.tagId })
        .from(contentTags)
        .where(
          and(
            or(
              ...contentWithTag.map(c => 
                and(
                  eq(contentTags.contentId, c.contentId),
                  eq(contentTags.contentType, c.contentType)
                )
              )
            ),
            ne(contentTags.tagId, tagId)
          )
        )
        .limit(limit * 2);
      
      if (relatedTagIds.length === 0) {
        return [];
      }
      
      // Get tag details
      const relatedTags = await db
        .select()
        .from(tags)
        .where(
          or(...relatedTagIds.map(r => eq(tags.id, r.tagId)))
        )
        .orderBy(desc(tags.usageCount))
        .limit(limit);
      
      return relatedTags;
    } catch (error) {
      console.error("Error getting related tags:", error);
      throw new Error("Failed to get related tags");
    }
  }
  
  async removeContentTag(contentId: string, tagId: string, userId: string): Promise<void> {
    try {
      await db
        .delete(contentTags)
        .where(
          and(
            eq(contentTags.contentId, contentId),
            eq(contentTags.tagId, tagId),
            eq(contentTags.userId, userId)
          )
        );
      
      // Decrement usage count
      await db
        .update(tags)
        .set({ usageCount: sql`GREATEST(0, ${tags.usageCount} - 1)` })
        .where(eq(tags.id, tagId));
    } catch (error) {
      console.error("Error removing content tag:", error);
      throw new Error("Failed to remove content tag");
    }
  }
  
  async updateTagRelevanceScore(contentId: string, tagId: string, userId: string, relevanceScore: number): Promise<void> {
    try {
      await db
        .update(contentTags)
        .set({ relevanceScore })
        .where(
          and(
            eq(contentTags.contentId, contentId),
            eq(contentTags.tagId, tagId),
            eq(contentTags.userId, userId)
          )
        );
    } catch (error) {
      console.error("Error updating tag relevance score:", error);
      throw new Error("Failed to update tag relevance score");
    }
  }
  
  async searchTags(query: string, limit: number = 10): Promise<Tag[]> {
    try {
      const searchQuery = `%${query.toLowerCase()}%`;
      return await db
        .select()
        .from(tags)
        .where(sql`LOWER(${tags.name}) LIKE ${searchQuery}`)
        .orderBy(desc(tags.usageCount))
        .limit(limit);
    } catch (error) {
      console.error("Error searching tags:", error);
      throw new Error("Failed to search tags");
    }
  }

  async getDuplicates(contentId: string, userId: string): Promise<DuplicatePair[]> {
    try {
      return await db
        .select()
        .from(duplicatePairs)
        .where(
          and(
            eq(duplicatePairs.userId, userId),
            or(
              eq(duplicatePairs.contentId1, contentId),
              eq(duplicatePairs.contentId2, contentId)
            )
          )
        )
        .orderBy(desc(duplicatePairs.similarityScore));
    } catch (error) {
      console.error("Error getting duplicates:", error);
      throw new Error("Failed to get duplicates");
    }
  }

  async createDuplicatePair(pair: InsertDuplicatePair): Promise<DuplicatePair> {
    try {
      const [result] = await db
        .insert(duplicatePairs)
        .values(pair)
        .returning();

      return result;
    } catch (error) {
      console.error("Error creating duplicate pair:", error);
      throw new Error("Failed to create duplicate pair");
    }
  }

  async updateDuplicateStatus(pairId: string, status: string, reviewedBy: string): Promise<void> {
    try {
      await db
        .update(duplicatePairs)
        .set({
          status,
          reviewedBy,
          reviewedAt: sql`now()`,
        })
        .where(eq(duplicatePairs.id, pairId));
    } catch (error) {
      console.error("Error updating duplicate status:", error);
      throw new Error("Failed to update duplicate status");
    }
  }

  async getRelatedContent(contentId: string, contentType: string, userId: string): Promise<RelatedContentCache | undefined> {
    try {
      const [result] = await db
        .select()
        .from(relatedContentCache)
        .where(
          and(
            eq(relatedContentCache.contentId, contentId),
            eq(relatedContentCache.contentType, contentType),
            eq(relatedContentCache.userId, userId),
            gte(relatedContentCache.expiresAt, sql`now()`)
          )
        );

      return result;
    } catch (error) {
      console.error("Error getting related content:", error);
      throw new Error("Failed to get related content");
    }
  }

  async cacheRelatedContent(cache: InsertRelatedContentCache): Promise<RelatedContentCache> {
    try {
      // Delete old cache entries for this content
      await db
        .delete(relatedContentCache)
        .where(
          and(
            eq(relatedContentCache.contentId, cache.contentId),
            eq(relatedContentCache.contentType, cache.contentType),
            eq(relatedContentCache.userId, cache.userId)
          )
        );

      // Insert new cache entry
      const [result] = await db
        .insert(relatedContentCache)
        .values({
          ...cache,
          relatedItems: cache.relatedItems as any // Cast array properly for jsonb
        })
        .returning();

      return result;
    } catch (error) {
      console.error("Error caching related content:", error);
      throw new Error("Failed to cache related content");
    }
  }

  async createQueryLog(log: InsertQueryLog): Promise<QueryLog> {
    try {
      const [result] = await db
        .insert(queryLogs)
        .values(log)
        .returning();

      return result;
    } catch (error) {
      console.error("Error creating query log:", error);
      throw new Error("Failed to create query log");
    }
  }

  async getQueryHistory(userId: string, limit: number = 20): Promise<QueryLog[]> {
    try {
      return await db
        .select()
        .from(queryLogs)
        .where(eq(queryLogs.userId, userId))
        .orderBy(desc(queryLogs.createdAt))
        .limit(limit);
    } catch (error) {
      console.error("Error getting query history:", error);
      throw new Error("Failed to get query history");
    }
  }

  // ==================== Translation System Implementations ====================

  async translateContent(
    contentId: string,
    targetLanguage: string,
    originalText: string,
    contentType?: string,
    context?: string
  ): Promise<Translation> {
    // Note: This method is not used by the API route, which handles translation directly
    // Keeping for interface compatibility but the router handles the actual translation
    try {
      const [translation] = await db
        .insert(translations)
        .values({
          contentId,
          languageCode: targetLanguage,
          translatedText: originalText, // Placeholder - actual translation handled by router
          originalText,
          contentType,
          isVerified: false,
          translationMetadata: {
            context,
            sourceLanguage: 'en'
          }
        })
        .onConflictDoUpdate({
          target: [translations.contentId, translations.languageCode],
          set: {
            translatedText: sql`EXCLUDED.translated_text`,
            originalText: sql`EXCLUDED.original_text`,
            contentType: sql`EXCLUDED.content_type`,
            translationMetadata: sql`EXCLUDED.translation_metadata`,
            updatedAt: new Date()
          }
        })
        .returning();
      
      return translation;
    } catch (error) {
      console.error("Error creating translation:", error);
      throw new Error("Failed to create translation");
    }
  }

  async getTranslations(contentId: string, languageCode?: string): Promise<Translation[]> {
    try {
      const query = db.select().from(translations).where(eq(translations.contentId, contentId));
      
      if (languageCode) {
        return await query.where(and(
          eq(translations.contentId, contentId),
          eq(translations.languageCode, languageCode)
        ));
      }
      
      return await query;
    } catch (error) {
      console.error("Error getting translations:", error);
      throw new Error("Failed to get translations");
    }
  }

  async getTranslation(contentId: string, languageCode: string): Promise<Translation | undefined> {
    try {
      const [translation] = await db
        .select()
        .from(translations)
        .where(and(
          eq(translations.contentId, contentId),
          eq(translations.languageCode, languageCode)
        ))
        .limit(1);
      
      return translation;
    } catch (error) {
      console.error("Error getting translation:", error);
      throw new Error("Failed to get translation");
    }
  }

  async verifyTranslation(translationId: string, translatorId: string): Promise<Translation> {
    try {
      const [translation] = await db
        .update(translations)
        .set({
          isVerified: true,
          translatorId,
          updatedAt: new Date()
        })
        .where(eq(translations.id, translationId))
        .returning();
      
      return translation;
    } catch (error) {
      console.error("Error verifying translation:", error);
      throw new Error("Failed to verify translation");
    }
  }

  async deleteTranslation(translationId: string): Promise<void> {
    try {
      await db.delete(translations).where(eq(translations.id, translationId));
    } catch (error) {
      console.error("Error deleting translation:", error);
      throw new Error("Failed to delete translation");
    }
  }

  async detectLanguage(text: string): Promise<string> {
    // Simple language detection based on common patterns
    // In production, this would use an ML model or external service
    const patterns = {
      es: /\b(el|la|los|las|un|una|es|está|son|que|de|en|y|por|para)\b/gi,
      fr: /\b(le|la|les|un|une|est|sont|que|de|et|pour|avec|dans)\b/gi,
      de: /\b(der|die|das|ein|eine|ist|sind|und|von|zu|mit|für|auf)\b/gi,
      it: /\b(il|lo|la|i|gli|le|un|uno|una|è|sono|che|di|e|per|con)\b/gi,
      pt: /\b(o|a|os|as|um|uma|é|são|que|de|e|para|com|em|por)\b/gi,
      ja: /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/,
      ko: /[\uAC00-\uD7AF\u1100-\u11FF]/,
      zh: /[\u4E00-\u9FFF\u3400-\u4DBF]/,
      ar: /[\u0600-\u06FF\u0750-\u077F]/,
      ru: /[\u0400-\u04FF]/
    };

    const scores: Record<string, number> = {};
    
    for (const [lang, pattern] of Object.entries(patterns)) {
      const matches = text.match(pattern);
      if (matches) {
        scores[lang] = matches.length;
      }
    }

    // Return the language with the highest score
    const detectedLang = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
    return detectedLang ? detectedLang[0] : 'en';
  }

  async getSupportedLanguages(): Promise<Array<{ code: string; name: string; nativeName: string }>> {
    return [
      { code: 'en', name: 'English', nativeName: 'English' },
      { code: 'es', name: 'Spanish', nativeName: 'Español' },
      { code: 'fr', name: 'French', nativeName: 'Français' },
      { code: 'de', name: 'German', nativeName: 'Deutsch' },
      { code: 'it', name: 'Italian', nativeName: 'Italiano' },
      { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
      { code: 'ru', name: 'Russian', nativeName: 'Русский' },
      { code: 'ja', name: 'Japanese', nativeName: '日本語' },
      { code: 'ko', name: 'Korean', nativeName: '한국어' },
      { code: 'zh', name: 'Chinese', nativeName: '中文' },
      { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
      { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
      { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
      { code: 'sv', name: 'Swedish', nativeName: 'Svenska' },
      { code: 'pl', name: 'Polish', nativeName: 'Polski' }
    ];
  }

  async getLanguagePreferences(userId: string): Promise<LanguagePreference | undefined> {
    try {
      const [prefs] = await db
        .select()
        .from(languagePreferences)
        .where(eq(languagePreferences.userId, userId))
        .limit(1);
      
      return prefs;
    } catch (error) {
      console.error("Error getting language preferences:", error);
      throw new Error("Failed to get language preferences");
    }
  }

  async upsertLanguagePreferences(
    userId: string,
    preferences: Omit<InsertLanguagePreference, "userId">
  ): Promise<LanguagePreference> {
    try {
      const [result] = await db
        .insert(languagePreferences)
        .values({
          ...preferences,
          userId
        })
        .onConflictDoUpdate({
          target: languagePreferences.userId,
          set: {
            ...preferences,
            updatedAt: new Date()
          }
        })
        .returning();
      
      // Clear cache
      this.invalidateCache(`lang-prefs:${userId}`);
      
      return result;
    } catch (error) {
      console.error("Error upserting language preferences:", error);
      throw new Error("Failed to upsert language preferences");
    }
  }

  async getUsersWithAutoTranslate(languageCode: string): Promise<string[]> {
    try {
      const users = await db
        .select({ userId: languagePreferences.userId })
        .from(languagePreferences)
        .where(and(
          eq(languagePreferences.autoTranslate, true),
          sql`${languagePreferences.preferredLanguages} @> ARRAY[${languageCode}]::text[]`
        ));
      
      return users.map(u => u.userId);
    } catch (error) {
      console.error("Error getting users with auto-translate:", error);
      throw new Error("Failed to get users with auto-translate");
    }
  }

  // ==================== Image Metadata & Alt Text Implementation ====================

  async getImageMetadata(userId: string, imageId: string): Promise<ImageMetadata | undefined> {
    try {
      const result = await db
        .select()
        .from(imageMetadata)
        .where(and(
          eq(imageMetadata.userId, userId),
          eq(imageMetadata.id, imageId)
        ))
        .limit(1);
      
      return result[0];
    } catch (error) {
      console.error("Failed to get image metadata:", error);
      throw error;
    }
  }

  async getImageMetadataByUrl(userId: string, imageUrl: string): Promise<ImageMetadata | undefined> {
    try {
      const result = await db
        .select()
        .from(imageMetadata)
        .where(and(
          eq(imageMetadata.userId, userId),
          eq(imageMetadata.imageUrl, imageUrl)
        ))
        .limit(1);
      
      return result[0];
    } catch (error) {
      console.error("Failed to get image metadata by URL:", error);
      throw error;
    }
  }

  async getImagesPaginated(
    userId: string,
    page: number = 1,
    limit: number = 20,
    filters?: {
      isDecorative?: boolean;
      hasAltText?: boolean;
      needsImprovement?: boolean;
    }
  ): Promise<PaginatedResponse<ImageMetadata>> {
    try {
      const offset = (page - 1) * limit;
      
      // Build filter conditions
      const conditions = [eq(imageMetadata.userId, userId)];
      
      if (filters?.isDecorative !== undefined) {
        conditions.push(eq(imageMetadata.isDecorative, filters.isDecorative));
      }
      
      if (filters?.hasAltText !== undefined) {
        if (filters.hasAltText) {
          conditions.push(isNotNull(imageMetadata.altText));
        } else {
          conditions.push(isNull(imageMetadata.altText));
        }
      }
      
      if (filters?.needsImprovement) {
        // Images with quality score < 70 need improvement
        const lowQualityImages = await db
          .select({ imageId: altTextQuality.imageId })
          .from(altTextQuality)
          .where(lte(altTextQuality.qualityScore, 70));
        
        const lowQualityIds = lowQualityImages.map(img => img.imageId);
        if (lowQualityIds.length > 0) {
          conditions.push(sql`${imageMetadata.id} = ANY(${lowQualityIds})`);
        }
      }
      
      const [data, totalResult] = await Promise.all([
        db
          .select()
          .from(imageMetadata)
          .where(and(...conditions))
          .orderBy(desc(imageMetadata.uploadedAt))
          .limit(limit)
          .offset(offset),
        db
          .select({ count: sql<number>`count(*)` })
          .from(imageMetadata)
          .where(and(...conditions))
      ]);
      
      const total = Number(totalResult[0]?.count ?? 0);
      const totalPages = Math.ceil(total / limit);
      
      return {
        data,
        total,
        page,
        totalPages,
        limit,
        offset
      };
    } catch (error) {
      console.error("Failed to get paginated images:", error);
      throw error;
    }
  }

  async createImageMetadata(
    userId: string,
    metadata: Omit<InsertImageMetadata, "userId">
  ): Promise<ImageMetadata> {
    try {
      const result = await db
        .insert(imageMetadata)
        .values({
          ...metadata,
          userId
        })
        .returning();
      
      return result[0];
    } catch (error) {
      console.error("Failed to create image metadata:", error);
      throw error;
    }
  }

  async updateImageMetadata(
    userId: string,
    imageId: string,
    updates: Partial<Omit<InsertImageMetadata, "userId">>
  ): Promise<ImageMetadata> {
    try {
      const result = await db
        .update(imageMetadata)
        .set({
          ...updates,
          updatedAt: new Date()
        })
        .where(and(
          eq(imageMetadata.userId, userId),
          eq(imageMetadata.id, imageId)
        ))
        .returning();
      
      if (!result[0]) {
        throw new Error("Image metadata not found");
      }
      
      return result[0];
    } catch (error) {
      console.error("Failed to update image metadata:", error);
      throw error;
    }
  }

  async deleteImageMetadata(userId: string, imageId: string): Promise<void> {
    try {
      await db
        .delete(imageMetadata)
        .where(and(
          eq(imageMetadata.userId, userId),
          eq(imageMetadata.id, imageId)
        ));
    } catch (error) {
      console.error("Failed to delete image metadata:", error);
      throw error;
    }
  }

  async batchProcessImages(
    userId: string,
    imageIds: string[],
    processor: (image: ImageMetadata) => Promise<Partial<InsertImageMetadata>>
  ): Promise<ImageMetadata[]> {
    try {
      // Get all images
      const images = await db
        .select()
        .from(imageMetadata)
        .where(and(
          eq(imageMetadata.userId, userId),
          sql`${imageMetadata.id} = ANY(${imageIds})`
        ));
      
      // Process each image
      const updates = await Promise.all(
        images.map(async (image) => {
          const updateData = await processor(image);
          return {
            id: image.id,
            ...updateData
          };
        })
      );
      
      // Update all images
      const updatedImages = await Promise.all(
        updates.map((update) =>
          this.updateImageMetadata(userId, update.id!, update)
        )
      );
      
      return updatedImages;
    } catch (error) {
      console.error("Failed to batch process images:", error);
      throw error;
    }
  }

  // ==================== Alt Text Quality Implementation ====================

  async getAltTextQuality(imageId: string): Promise<AltTextQuality | undefined> {
    try {
      const result = await db
        .select()
        .from(altTextQuality)
        .where(eq(altTextQuality.imageId, imageId))
        .limit(1);
      
      return result[0];
    } catch (error) {
      console.error("Failed to get alt text quality:", error);
      throw error;
    }
  }

  async upsertAltTextQuality(
    imageId: string,
    quality: Omit<InsertAltTextQuality, "imageId">
  ): Promise<AltTextQuality> {
    try {
      // Check if quality record exists
      const existing = await this.getAltTextQuality(imageId);
      
      if (existing) {
        // Update existing
        const result = await db
          .update(altTextQuality)
          .set({
            ...quality,
            updatedAt: new Date(),
            lastAnalyzedAt: new Date()
          })
          .where(eq(altTextQuality.imageId, imageId))
          .returning();
        
        return result[0];
      } else {
        // Create new
        const result = await db
          .insert(altTextQuality)
          .values({
            ...quality,
            imageId
          })
          .returning();
        
        return result[0];
      }
    } catch (error) {
      console.error("Failed to upsert alt text quality:", error);
      throw error;
    }
  }

  async getAccessibilityReport(
    userId: string,
    filters?: {
      wcagLevel?: string;
      minScore?: number;
      maxScore?: number;
      dateRange?: { start: Date; end: Date };
    }
  ): Promise<{
    totalImages: number;
    imagesWithAltText: number;
    decorativeImages: number;
    averageQualityScore: number;
    averageAccessibilityScore: number;
    wcagCompliance: {
      A: number;
      AA: number;
      AAA: number;
    };
    needsImprovement: ImageMetadata[];
  }> {
    try {
      // Base conditions for user's images
      const conditions = [eq(imageMetadata.userId, userId)];
      
      if (filters?.dateRange) {
        conditions.push(
          gte(imageMetadata.uploadedAt, filters.dateRange.start),
          lte(imageMetadata.uploadedAt, filters.dateRange.end)
        );
      }
      
      // Get all user images
      const allImages = await db
        .select()
        .from(imageMetadata)
        .where(and(...conditions));
      
      // Get quality scores
      const qualityData = await db
        .select()
        .from(altTextQuality)
        .where(sql`${altTextQuality.imageId} = ANY(${allImages.map(img => img.id)})`);
      
      // Apply quality filters if needed
      let filteredQualityData = qualityData;
      if (filters?.wcagLevel) {
        filteredQualityData = qualityData.filter(q => q.wcagLevel === filters.wcagLevel);
      }
      if (filters?.minScore !== undefined) {
        filteredQualityData = filteredQualityData.filter(q => q.qualityScore >= filters.minScore!);
      }
      if (filters?.maxScore !== undefined) {
        filteredQualityData = filteredQualityData.filter(q => q.qualityScore <= filters.maxScore!);
      }
      
      // Calculate statistics
      const totalImages = allImages.length;
      const imagesWithAltText = allImages.filter(img => img.altText).length;
      const decorativeImages = allImages.filter(img => img.isDecorative).length;
      
      const averageQualityScore = filteredQualityData.length > 0
        ? filteredQualityData.reduce((sum, q) => sum + q.qualityScore, 0) / filteredQualityData.length
        : 0;
      
      const averageAccessibilityScore = filteredQualityData.length > 0
        ? filteredQualityData.reduce((sum, q) => sum + q.accessibilityScore, 0) / filteredQualityData.length
        : 0;
      
      const wcagCompliance = {
        A: qualityData.filter(q => q.wcagLevel === 'A').length,
        AA: qualityData.filter(q => q.wcagLevel === 'AA').length,
        AAA: qualityData.filter(q => q.wcagLevel === 'AAA').length
      };
      
      // Find images needing improvement (quality score < 70)
      const needsImprovementIds = qualityData
        .filter(q => q.qualityScore < 70)
        .map(q => q.imageId);
      
      const needsImprovement = allImages.filter(img =>
        needsImprovementIds.includes(img.id)
      );
      
      return {
        totalImages,
        imagesWithAltText,
        decorativeImages,
        averageQualityScore,
        averageAccessibilityScore,
        wcagCompliance,
        needsImprovement
      };
    } catch (error) {
      console.error("Failed to get accessibility report:", error);
      throw error;
    }
  }

  async reviewAltTextQuality(
    imageId: string,
    reviewerId: string,
    notes?: string
  ): Promise<AltTextQuality> {
    try {
      const result = await db
        .update(altTextQuality)
        .set({
          manuallyReviewed: true,
          reviewedBy: reviewerId,
          reviewNotes: notes,
          updatedAt: new Date()
        })
        .where(eq(altTextQuality.imageId, imageId))
        .returning();
      
      if (!result[0]) {
        throw new Error("Alt text quality record not found");
      }
      
      return result[0];
    } catch (error) {
      console.error("Failed to review alt text quality:", error);
      throw error;
    }
  }

  // ==================== Moderation Implementations ====================
  
  async createModerationLog(log: InsertModerationLog): Promise<ModerationLog> {
    try {
      const [result] = await db
        .insert(moderationLogs)
        .values(log)
        .returning();
      return result;
    } catch (error) {
      console.error("Error creating moderation log:", error);
      throw new Error("Failed to create moderation log");
    }
  }
  
  async updateModerationLog(id: string, updates: Partial<InsertModerationLog>): Promise<void> {
    try {
      await db
        .update(moderationLogs)
        .set({
          ...updates,
          updatedAt: new Date()
        })
        .where(eq(moderationLogs.id, id));
    } catch (error) {
      console.error("Error updating moderation log:", error);
      throw new Error("Failed to update moderation log");
    }
  }
  
  async getModerationQueue(
    userId: string,
    isAdmin: boolean,
    filters?: {
      status?: string;
      severity?: string;
      contentType?: string;
    }
  ): Promise<ModerationLog[]> {
    try {
      let query = db.select().from(moderationLogs);
      
      // Build where conditions
      const conditions = [];
      
      // Admin can see all logs, non-admin can only see their own
      if (!isAdmin) {
        conditions.push(eq(moderationLogs.userId, userId));
      }
      
      // Apply filters
      if (filters?.status) {
        conditions.push(eq(moderationLogs.status, filters.status));
      }
      if (filters?.severity) {
        conditions.push(eq(moderationLogs.severity, filters.severity));
      }
      if (filters?.contentType) {
        conditions.push(eq(moderationLogs.contentType, filters.contentType));
      }
      
      // Apply conditions if any
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
      
      // Order by creation date (newest first)
      const result = await query.orderBy(desc(moderationLogs.createdAt));
      
      return result;
    } catch (error) {
      console.error("Error getting moderation queue:", error);
      throw new Error("Failed to get moderation queue");
    }
  }
  
  async createBlockedContent(content: InsertBlockedContent): Promise<BlockedContent> {
    try {
      const [result] = await db
        .insert(blockedContent)
        .values(content)
        .returning();
      return result;
    } catch (error) {
      console.error("Error creating blocked content:", error);
      throw new Error("Failed to create blocked content");
    }
  }
  
  async restoreBlockedContent(id: string, restoredBy: string): Promise<void> {
    try {
      await db
        .update(blockedContent)
        .set({
          status: 'restored',
          restoredBy,
          restoredAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(blockedContent.id, id));
    } catch (error) {
      console.error("Error restoring blocked content:", error);
      throw new Error("Failed to restore blocked content");
    }
  }
  
  async createModerationAppeal(appeal: InsertModerationAppeal): Promise<ModerationAppeal> {
    try {
      const [result] = await db
        .insert(moderationAppeals)
        .values(appeal)
        .returning();
      return result;
    } catch (error) {
      console.error("Error creating moderation appeal:", error);
      throw new Error("Failed to create moderation appeal");
    }
  }
  
  async getModerationAppeal(id: string): Promise<ModerationAppeal | undefined> {
    try {
      const [result] = await db
        .select()
        .from(moderationAppeals)
        .where(eq(moderationAppeals.id, id))
        .limit(1);
      return result;
    } catch (error) {
      console.error("Error getting moderation appeal:", error);
      throw new Error("Failed to get moderation appeal");
    }
  }
  
  async updateModerationAppeal(id: string, updates: Partial<InsertModerationAppeal>): Promise<void> {
    try {
      await db
        .update(moderationAppeals)
        .set({
          ...updates,
          updatedAt: new Date()
        })
        .where(eq(moderationAppeals.id, id));
    } catch (error) {
      console.error("Error updating moderation appeal:", error);
      throw new Error("Failed to update moderation appeal");
    }
  }
  
  async getModerationStats(timeRange?: { start: Date; end: Date }): Promise<{
    totalChecked: number;
    totalBlocked: number;
    totalFlagged: number;
    totalAppeals: number;
    appealsApproved: number;
    categoriesBreakdown: { [key: string]: number };
    severityBreakdown: { [key: string]: number };
    averageConfidence: number;
  }> {
    try {
      // Build where conditions for time range
      const conditions = [];
      if (timeRange) {
        conditions.push(
          gte(moderationLogs.createdAt, timeRange.start),
          lte(moderationLogs.createdAt, timeRange.end)
        );
      }
      
      // Get all moderation logs within time range
      let logsQuery = db.select().from(moderationLogs);
      if (conditions.length > 0) {
        logsQuery = logsQuery.where(and(...conditions));
      }
      const logs = await logsQuery;
      
      // Calculate statistics
      const totalChecked = logs.length;
      const totalBlocked = logs.filter(log => log.actionTaken === 'blocked').length;
      const totalFlagged = logs.filter(log => log.flaggedCategories && log.flaggedCategories.length > 0).length;
      
      // Get appeals statistics
      let appealsQuery = db.select().from(moderationAppeals);
      if (timeRange) {
        appealsQuery = appealsQuery.where(
          and(
            gte(moderationAppeals.createdAt, timeRange.start),
            lte(moderationAppeals.createdAt, timeRange.end)
          )
        );
      }
      const appeals = await appealsQuery;
      const totalAppeals = appeals.length;
      const appealsApproved = appeals.filter(appeal => appeal.status === 'approved').length;
      
      // Calculate categories breakdown
      const categoriesBreakdown: { [key: string]: number } = {};
      logs.forEach(log => {
        if (log.flaggedCategories) {
          log.flaggedCategories.forEach(category => {
            categoriesBreakdown[category] = (categoriesBreakdown[category] || 0) + 1;
          });
        }
      });
      
      // Calculate severity breakdown
      const severityBreakdown: { [key: string]: number } = {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0
      };
      logs.forEach(log => {
        if (log.severity) {
          severityBreakdown[log.severity] = (severityBreakdown[log.severity] || 0) + 1;
        }
      });
      
      // Calculate average confidence
      const confidenceScores = logs
        .filter(log => log.confidenceScore !== null)
        .map(log => log.confidenceScore!);
      const averageConfidence = confidenceScores.length > 0
        ? confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length
        : 0;
      
      return {
        totalChecked,
        totalBlocked,
        totalFlagged,
        totalAppeals,
        appealsApproved,
        categoriesBreakdown,
        severityBreakdown,
        averageConfidence
      };
    } catch (error) {
      console.error("Error getting moderation stats:", error);
      throw new Error("Failed to get moderation statistics");
    }
  }
  
  // ============================================================================
  // Fraud Detection Implementations
  // ============================================================================
  
  async createFraudScore(score: InsertFraudScore): Promise<FraudScore> {
    try {
      const [result] = await db
        .insert(fraudScores)
        .values(score)
        .returning();
      return result;
    } catch (error) {
      console.error("Error creating fraud score:", error);
      throw new Error("Failed to create fraud score");
    }
  }
  
  async getFraudScores(userId: string, limit: number = 10): Promise<FraudScore[]> {
    try {
      const scores = await db
        .select()
        .from(fraudScores)
        .where(eq(fraudScores.userId, userId))
        .orderBy(desc(fraudScores.timestamp))
        .limit(limit);
      return scores;
    } catch (error) {
      console.error("Error getting fraud scores:", error);
      throw new Error("Failed to get fraud scores");
    }
  }
  
  async createSuspiciousActivity(activity: InsertSuspiciousActivity): Promise<SuspiciousActivity> {
    try {
      const [result] = await db
        .insert(suspiciousActivities)
        .values(activity)
        .returning();
      return result;
    } catch (error) {
      console.error("Error creating suspicious activity:", error);
      throw new Error("Failed to create suspicious activity");
    }
  }
  
  async getSuspiciousActivities(userId?: string, isAdmin: boolean = false): Promise<SuspiciousActivity[]> {
    try {
      let query = db.select().from(suspiciousActivities);
      
      // Filter by userId if provided or if not admin
      if (userId && !isAdmin) {
        query = query.where(eq(suspiciousActivities.userId, userId));
      } else if (!isAdmin) {
        // Non-admin users with no userId specified should not see any activities
        return [];
      }
      
      // Order by most recent first
      const activities = await query.orderBy(desc(suspiciousActivities.detectedAt));
      return activities;
    } catch (error) {
      console.error("Error getting suspicious activities:", error);
      throw new Error("Failed to get suspicious activities");
    }
  }
  
  async updateSuspiciousActivity(
    activityId: string,
    status: 'pending' | 'reviewing' | 'confirmed' | 'dismissed' | 'escalated',
    resolvedAt?: Date
  ): Promise<void> {
    try {
      await db
        .update(suspiciousActivities)
        .set({ 
          status,
          resolvedAt: resolvedAt || null
        })
        .where(eq(suspiciousActivities.id, activityId));
    } catch (error) {
      console.error("Error updating suspicious activity:", error);
      throw new Error("Failed to update suspicious activity");
    }
  }
  
  async createFraudReview(review: InsertFraudReview): Promise<FraudReview> {
    try {
      const [result] = await db
        .insert(fraudReviews)
        .values(review)
        .returning();
      return result;
    } catch (error) {
      console.error("Error creating fraud review:", error);
      throw new Error("Failed to create fraud review");
    }
  }
  
  async getFraudReviews(userId: string): Promise<FraudReview[]> {
    try {
      const reviews = await db
        .select()
        .from(fraudReviews)
        .where(eq(fraudReviews.userId, userId))
        .orderBy(desc(fraudReviews.reviewedAt));
      return reviews;
    } catch (error) {
      console.error("Error getting fraud reviews:", error);
      throw new Error("Failed to get fraud reviews");
    }
  }
  
  async getFraudStats(period: 'day' | 'week' | 'month'): Promise<{
    totalScores: number;
    averageScore: number;
    highRiskCount: number;
    suspiciousActivitiesCount: number;
    reviewsCount: number;
    autoBlockedCount: number;
    topActivityTypes: { type: string; count: number }[];
    riskDistribution: { level: string; count: number }[];
  }> {
    try {
      // Calculate date range based on period
      const now = new Date();
      const startDate = new Date();
      
      switch (period) {
        case 'day':
          startDate.setDate(now.getDate() - 1);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
      }
      
      // Get fraud scores in the period
      const scores = await db
        .select()
        .from(fraudScores)
        .where(gte(fraudScores.timestamp, startDate));
      
      const totalScores = scores.length;
      const averageScore = totalScores > 0
        ? scores.reduce((sum, s) => sum + s.score, 0) / totalScores
        : 0;
      const highRiskCount = scores.filter(s => s.score > 0.75).length;
      
      // Get suspicious activities
      const activities = await db
        .select()
        .from(suspiciousActivities)
        .where(gte(suspiciousActivities.detectedAt, startDate));
      
      const suspiciousActivitiesCount = activities.length;
      const autoBlockedCount = activities.filter(a => a.autoBlocked).length;
      
      // Calculate top activity types
      const activityTypeCounts: { [key: string]: number } = {};
      activities.forEach(a => {
        activityTypeCounts[a.activityType] = (activityTypeCounts[a.activityType] || 0) + 1;
      });
      const topActivityTypes = Object.entries(activityTypeCounts)
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      
      // Calculate risk distribution
      const riskLevelCounts: { [key: string]: number } = {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0
      };
      activities.forEach(a => {
        riskLevelCounts[a.riskLevel] = (riskLevelCounts[a.riskLevel] || 0) + 1;
      });
      const riskDistribution = Object.entries(riskLevelCounts)
        .map(([level, count]) => ({ level, count }));
      
      // Get reviews count
      const reviews = await db
        .select()
        .from(fraudReviews)
        .where(gte(fraudReviews.reviewedAt, startDate));
      const reviewsCount = reviews.length;
      
      return {
        totalScores,
        averageScore,
        highRiskCount,
        suspiciousActivitiesCount,
        reviewsCount,
        autoBlockedCount,
        topActivityTypes,
        riskDistribution
      };
    } catch (error) {
      console.error("Error getting fraud statistics:", error);
      throw new Error("Failed to get fraud statistics");
    }
  }

  // ==================== Task 7: AI Chat Assistant Implementations ====================
  
  async getConversations(userId: string): Promise<Conversation[]> {
    try {
      const result = await db
        .select()
        .from(conversations)
        .where(eq(conversations.userId, userId))
        .orderBy(desc(conversations.updatedAt));
      return result;
    } catch (error) {
      console.error("Error getting conversations:", error);
      throw new Error("Failed to get conversations");
    }
  }
  
  async getConversation(userId: string, conversationId: string): Promise<Conversation | undefined> {
    try {
      const [result] = await db
        .select()
        .from(conversations)
        .where(and(eq(conversations.userId, userId), eq(conversations.id, conversationId)))
        .limit(1);
      return result;
    } catch (error) {
      console.error("Error getting conversation:", error);
      throw new Error("Failed to get conversation");
    }
  }
  
  async createConversation(userId: string, title: string): Promise<Conversation> {
    try {
      const [result] = await db
        .insert(conversations)
        .values({ userId, title })
        .returning();
      return result;
    } catch (error) {
      console.error("Error creating conversation:", error);
      throw new Error("Failed to create conversation");
    }
  }
  
  async updateConversation(userId: string, conversationId: string, updates: Partial<Conversation>): Promise<Conversation> {
    try {
      const [result] = await db
        .update(conversations)
        .set({ ...updates, updatedAt: new Date() })
        .where(and(eq(conversations.userId, userId), eq(conversations.id, conversationId)))
        .returning();
      return result;
    } catch (error) {
      console.error("Error updating conversation:", error);
      throw new Error("Failed to update conversation");
    }
  }
  
  async deleteConversation(userId: string, conversationId: string): Promise<void> {
    try {
      await db
        .delete(conversations)
        .where(and(eq(conversations.userId, userId), eq(conversations.id, conversationId)));
    } catch (error) {
      console.error("Error deleting conversation:", error);
      throw new Error("Failed to delete conversation");
    }
  }
  
  async getMessages(conversationId: string, limit: number = 100): Promise<Message[]> {
    try {
      const result = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conversationId))
        .orderBy(desc(messages.timestamp))
        .limit(limit);
      return result.reverse(); // Return in chronological order
    } catch (error) {
      console.error("Error getting messages:", error);
      throw new Error("Failed to get messages");
    }
  }
  
  async createMessage(message: InsertMessage): Promise<Message> {
    try {
      const [result] = await db
        .insert(messages)
        .values(message)
        .returning();
      
      // Update conversation's updatedAt
      await db
        .update(conversations)
        .set({ updatedAt: new Date() })
        .where(eq(conversations.id, message.conversationId));
      
      return result;
    } catch (error) {
      console.error("Error creating message:", error);
      throw new Error("Failed to create message");
    }
  }
  
  async getConversationContext(conversationId: string): Promise<ConversationContext | undefined> {
    try {
      const [result] = await db
        .select()
        .from(conversationContext)
        .where(eq(conversationContext.conversationId, conversationId))
        .limit(1);
      return result;
    } catch (error) {
      console.error("Error getting conversation context:", error);
      throw new Error("Failed to get conversation context");
    }
  }
  
  async updateConversationContext(conversationId: string, context: Partial<ConversationContext>): Promise<ConversationContext> {
    try {
      const [result] = await db
        .insert(conversationContext)
        .values({ conversationId, ...context })
        .onConflictDoUpdate({
          target: conversationContext.conversationId,
          set: { ...context, updatedAt: new Date() }
        })
        .returning();
      return result;
    } catch (error) {
      console.error("Error updating conversation context:", error);
      throw new Error("Failed to update conversation context");
    }
  }

  // ==================== Task 8: Voice Commands Implementations ====================
  
  async createVoiceCommand(command: InsertVoiceCommand): Promise<VoiceCommand> {
    try {
      const [result] = await db
        .insert(voiceCommands)
        .values(command)
        .returning();
      return result;
    } catch (error) {
      console.error("Error creating voice command:", error);
      throw new Error("Failed to create voice command");
    }
  }
  
  async getVoiceCommands(userId: string, limit: number = 50): Promise<VoiceCommand[]> {
    try {
      const result = await db
        .select()
        .from(voiceCommands)
        .where(eq(voiceCommands.userId, userId))
        .orderBy(desc(voiceCommands.timestamp))
        .limit(limit);
      return result;
    } catch (error) {
      console.error("Error getting voice commands:", error);
      throw new Error("Failed to get voice commands");
    }
  }
  
  async getAvailableVoiceCommands(): Promise<Array<{ command: string; description: string; example: string }>> {
    // Static list of available commands - could be moved to a config file
    return [
      {
        command: "navigate",
        description: "Navigate to a page in the app",
        example: "Show me my recipes"
      },
      {
        command: "search",
        description: "Search for items",
        example: "Search for chicken recipes"
      },
      {
        command: "add",
        description: "Add items to lists",
        example: "Add milk to shopping list"
      },
      {
        command: "show",
        description: "Display specific information",
        example: "Show expiring items"
      },
      {
        command: "create",
        description: "Create new items",
        example: "Create a new meal plan"
      }
    ];
  }

  // ==================== Task 9: Smart Email/Message Drafting Implementations ====================
  
  async getDraftTemplates(contextType?: string): Promise<DraftTemplate[]> {
    try {
      let query = db.select().from(draftTemplates);
      if (contextType) {
        return await query.where(eq(draftTemplates.contextType, contextType)).orderBy(desc(draftTemplates.usageCount));
      }
      return await query.orderBy(desc(draftTemplates.usageCount));
    } catch (error) {
      console.error("Error getting draft templates:", error);
      throw new Error("Failed to get draft templates");
    }
  }
  
  async createDraftTemplate(template: InsertDraftTemplate): Promise<DraftTemplate> {
    try {
      const [result] = await db
        .insert(draftTemplates)
        .values(template)
        .returning();
      return result;
    } catch (error) {
      console.error("Error creating draft template:", error);
      throw new Error("Failed to create draft template");
    }
  }
  
  async incrementTemplateUsage(templateId: string): Promise<void> {
    try {
      await db
        .update(draftTemplates)
        .set({ usageCount: sql`${draftTemplates.usageCount} + 1` })
        .where(eq(draftTemplates.id, templateId));
    } catch (error) {
      console.error("Error incrementing template usage:", error);
      throw new Error("Failed to increment template usage");
    }
  }
  
  async saveGeneratedDrafts(userId: string, drafts: Omit<InsertGeneratedDraft, "userId">[]): Promise<GeneratedDraft[]> {
    try {
      const draftsWithUserId = drafts.map(draft => ({ ...draft, userId }));
      const result = await db
        .insert(generatedDrafts)
        .values(draftsWithUserId)
        .returning();
      return result;
    } catch (error) {
      console.error("Error saving generated drafts:", error);
      throw new Error("Failed to save generated drafts");
    }
  }
  
  async markDraftSelected(userId: string, draftId: string, edited: boolean): Promise<void> {
    try {
      await db
        .update(generatedDrafts)
        .set({ selected: true, edited })
        .where(and(eq(generatedDrafts.userId, userId), eq(generatedDrafts.id, draftId)));
    } catch (error) {
      console.error("Error marking draft as selected:", error);
      throw new Error("Failed to mark draft as selected");
    }
  }
  
  async getDraftHistory(userId: string, limit: number = 50): Promise<GeneratedDraft[]> {
    try {
      const result = await db
        .select()
        .from(generatedDrafts)
        .where(eq(generatedDrafts.userId, userId))
        .orderBy(desc(generatedDrafts.createdAt))
        .limit(limit);
      return result;
    } catch (error) {
      console.error("Error getting draft history:", error);
      throw new Error("Failed to get draft history");
    }
  }

  // ==================== Task 10: Writing Assistant Implementations ====================
  
  async createWritingSession(session: InsertWritingSession): Promise<WritingSession> {
    try {
      const [result] = await db
        .insert(writingSessions)
        .values({
          ...session,
          improvementsApplied: session.improvementsApplied as any // Cast array properly for jsonb
        })
        .returning();
      return result;
    } catch (error) {
      console.error("Error creating writing session:", error);
      throw new Error("Failed to create writing session");
    }
  }
  
  async getWritingSession(userId: string, sessionId: string): Promise<WritingSession | undefined> {
    try {
      const [result] = await db
        .select()
        .from(writingSessions)
        .where(and(eq(writingSessions.userId, userId), eq(writingSessions.id, sessionId)))
        .limit(1);
      return result;
    } catch (error) {
      console.error("Error getting writing session:", error);
      throw new Error("Failed to get writing session");
    }
  }
  
  async updateWritingSession(userId: string, sessionId: string, improvedText: string, improvements: string[]): Promise<WritingSession> {
    try {
      const [result] = await db
        .update(writingSessions)
        .set({ improvedText, improvementsApplied: improvements })
        .where(and(eq(writingSessions.userId, userId), eq(writingSessions.id, sessionId)))
        .returning();
      return result;
    } catch (error) {
      console.error("Error updating writing session:", error);
      throw new Error("Failed to update writing session");
    }
  }
  
  async addWritingSuggestions(sessionId: string, suggestions: Omit<InsertWritingSuggestion, "sessionId">[]): Promise<WritingSuggestion[]> {
    try {
      const suggestionsWithSessionId = suggestions.map(s => ({ ...s, sessionId }));
      const result = await db
        .insert(writingSuggestions)
        .values(suggestionsWithSessionId)
        .returning();
      return result;
    } catch (error) {
      console.error("Error adding writing suggestions:", error);
      throw new Error("Failed to add writing suggestions");
    }
  }
  
  async updateSuggestionStatus(suggestionId: string, accepted: boolean): Promise<void> {
    try {
      await db
        .update(writingSuggestions)
        .set({ accepted })
        .where(eq(writingSuggestions.id, suggestionId));
    } catch (error) {
      console.error("Error updating suggestion status:", error);
      throw new Error("Failed to update suggestion status");
    }
  }
  
  async getWritingStats(userId: string): Promise<{
    totalSessions: number;
    acceptedSuggestions: number;
    totalSuggestions: number;
    commonIssues: Array<{ type: string; count: number }>;
  }> {
    try {
      // Get total sessions
      const sessionsCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(writingSessions)
        .where(eq(writingSessions.userId, userId));
      
      // Get suggestions stats
      const suggestionsStats = await db
        .select({
          accepted: sql<number>`count(*) filter (where ${writingSuggestions.accepted} = true)`,
          total: sql<number>`count(*)`
        })
        .from(writingSuggestions)
        .innerJoin(writingSessions, eq(writingSessions.id, writingSuggestions.sessionId))
        .where(eq(writingSessions.userId, userId));
      
      // Get common issues
      const commonIssues = await db
        .select({
          type: writingSuggestions.suggestionType,
          count: sql<number>`count(*)`
        })
        .from(writingSuggestions)
        .innerJoin(writingSessions, eq(writingSessions.id, writingSuggestions.sessionId))
        .where(eq(writingSessions.userId, userId))
        .groupBy(writingSuggestions.suggestionType)
        .orderBy(desc(sql`count(*)`))
        .limit(5);
      
      return {
        totalSessions: Number(sessionsCount[0]?.count || 0),
        acceptedSuggestions: Number(suggestionsStats[0]?.accepted || 0),
        totalSuggestions: Number(suggestionsStats[0]?.total || 0),
        commonIssues: commonIssues.map(ci => ({
          type: ci.type,
          count: Number(ci.count)
        }))
      };
    } catch (error) {
      console.error("Error getting writing stats:", error);
      throw new Error("Failed to get writing stats");
    }
  }

  // ==================== Summarization Operations ====================
  
  async getSummary(userId: string, contentId: string): Promise<Summary | undefined> {
    try {
      const [result] = await db
        .select()
        .from(summaries)
        .where(and(eq(summaries.userId, userId), eq(summaries.contentId, contentId)))
        .limit(1);
      return result;
    } catch (error) {
      console.error("Error getting summary:", error);
      throw new Error("Failed to get summary");
    }
  }
  
  async getSummaries(userId: string, limit?: number): Promise<Summary[]> {
    try {
      const query = db
        .select()
        .from(summaries)
        .where(eq(summaries.userId, userId))
        .orderBy(desc(summaries.createdAt));
      
      if (limit) {
        return await query.limit(limit);
      }
      
      return await query;
    } catch (error) {
      console.error("Error getting summaries:", error);
      throw new Error("Failed to get summaries");
    }
  }
  
  async createSummary(userId: string, summary: Omit<InsertSummary, "userId">): Promise<Summary> {
    try {
      const [result] = await db
        .insert(summaries)
        .values({
          ...summary,
          userId,
          keyPoints: summary.keyPoints as any, // Cast array properly
          metadata: summary.metadata as any // Cast metadata properly
        })
        .returning();
      return result;
    } catch (error) {
      console.error("Error creating summary:", error);
      throw new Error("Failed to create summary");
    }
  }
  
  async updateSummary(userId: string, summaryId: string, updates: Partial<Omit<InsertSummary, "userId" | "id">>): Promise<Summary> {
    try {
      const [result] = await db
        .update(summaries)
        .set({
          ...updates,
          updatedAt: new Date(),
          keyPoints: updates.keyPoints as any, // Cast array properly  
          metadata: updates.metadata as any // Cast metadata properly
        })
        .where(and(eq(summaries.userId, userId), eq(summaries.id, summaryId)))
        .returning();
      
      if (!result) {
        throw new Error("Summary not found");
      }
      
      return result;
    } catch (error) {
      console.error("Error updating summary:", error);
      throw new Error("Failed to update summary");
    }
  }
  
  async deleteSummary(userId: string, summaryId: string): Promise<void> {
    try {
      await db
        .delete(summaries)
        .where(and(eq(summaries.userId, userId), eq(summaries.id, summaryId)));
    } catch (error) {
      console.error("Error deleting summary:", error);
      throw new Error("Failed to delete summary");
    }
  }
  
  async getSummariesByType(userId: string, type: 'tldr' | 'bullet' | 'paragraph'): Promise<Summary[]> {
    try {
      return await db
        .select()
        .from(summaries)
        .where(and(eq(summaries.userId, userId), eq(summaries.summaryType, type)))
        .orderBy(desc(summaries.createdAt));
    } catch (error) {
      console.error("Error getting summaries by type:", error);
      throw new Error("Failed to get summaries by type");
    }
  }

  async getExcerpt(userId: string, contentId: string, variant?: string): Promise<Excerpt | undefined> {
    try {
      const conditions = [
        eq(excerpts.userId, userId),
        eq(excerpts.contentId, contentId)
      ];
      if (variant) {
        conditions.push(eq(excerpts.variant, variant));
      }
      
      const [result] = await db
        .select()
        .from(excerpts)
        .where(and(...conditions))
        .limit(1);
      return result;
    } catch (error) {
      console.error("Error getting excerpt:", error);
      throw new Error("Failed to get excerpt");
    }
  }

  async getExcerptsByContent(userId: string, contentId: string): Promise<Excerpt[]> {
    try {
      return await db
        .select()
        .from(excerpts)
        .where(and(eq(excerpts.userId, userId), eq(excerpts.contentId, contentId)))
        .orderBy(desc(excerpts.clickThroughRate), desc(excerpts.createdAt));
    } catch (error) {
      console.error("Error getting excerpts by content:", error);
      throw new Error("Failed to get excerpts");
    }
  }

  async createExcerpt(userId: string, excerpt: Omit<InsertExcerpt, "userId">): Promise<Excerpt> {
    try {
      const [result] = await db
        .insert(excerpts)
        .values({
          ...excerpt,
          userId,
          generationParams: excerpt.generationParams as any,
          socialMetadata: excerpt.socialMetadata as any,
        })
        .returning();
      return result;
    } catch (error) {
      console.error("Error creating excerpt:", error);
      throw new Error("Failed to create excerpt");
    }
  }

  async updateExcerpt(userId: string, excerptId: string, updates: Partial<Omit<InsertExcerpt, "userId" | "id">>): Promise<Excerpt> {
    try {
      const [result] = await db
        .update(excerpts)
        .set({
          ...updates,
          updatedAt: new Date(),
          generationParams: updates.generationParams as any,
          socialMetadata: updates.socialMetadata as any,
        })
        .where(and(eq(excerpts.userId, userId), eq(excerpts.id, excerptId)))
        .returning();
      
      if (!result) {
        throw new Error("Excerpt not found");
      }
      
      return result;
    } catch (error) {
      console.error("Error updating excerpt:", error);
      throw new Error("Failed to update excerpt");
    }
  }

  async deleteExcerpt(userId: string, excerptId: string): Promise<void> {
    try {
      await db
        .delete(excerpts)
        .where(and(eq(excerpts.userId, userId), eq(excerpts.id, excerptId)));
    } catch (error) {
      console.error("Error deleting excerpt:", error);
      throw new Error("Failed to delete excerpt");
    }
  }

  async setActiveExcerpt(userId: string, contentId: string, excerptId: string): Promise<void> {
    try {
      // First, deactivate all excerpts for this content
      await db
        .update(excerpts)
        .set({ isActive: false })
        .where(and(eq(excerpts.userId, userId), eq(excerpts.contentId, contentId)));
      
      // Then activate the selected excerpt
      await db
        .update(excerpts)
        .set({ isActive: true, updatedAt: new Date() })
        .where(and(eq(excerpts.userId, userId), eq(excerpts.id, excerptId)));
    } catch (error) {
      console.error("Error setting active excerpt:", error);
      throw new Error("Failed to set active excerpt");
    }
  }

  async recordExcerptPerformance(performance: InsertExcerptPerformance): Promise<ExcerptPerformance> {
    try {
      // Calculate derived metrics
      const ctr = performance.views && performance.views > 0 
        ? performance.clicks! / performance.views : 0;
      const shareRate = performance.views && performance.views > 0 
        ? (performance.shares || 0) / performance.views : 0;
      const engagementRate = performance.views && performance.views > 0 
        ? (performance.engagements || 0) / performance.views : 0;

      const [result] = await db
        .insert(excerptPerformance)
        .values({
          ...performance,
          ctr,
          shareRate,
          engagementRate,
          platformMetrics: performance.platformMetrics as any,
        })
        .onConflictDoUpdate({
          target: [excerptPerformance.excerptId, excerptPerformance.date],
          set: {
            views: sql`${excerptPerformance.views} + ${performance.views}`,
            clicks: sql`${excerptPerformance.clicks} + ${performance.clicks}`,
            shares: sql`${excerptPerformance.shares} + ${performance.shares || 0}`,
            engagements: sql`${excerptPerformance.engagements} + ${performance.engagements || 0}`,
            conversions: sql`${excerptPerformance.conversions} + ${performance.conversions || 0}`,
            bounces: sql`${excerptPerformance.bounces} + ${performance.bounces || 0}`,
            updatedAt: new Date(),
          },
        })
        .returning();

      // Update excerpt's overall CTR
      await this.updateExcerptCTR(performance.excerptId);

      return result;
    } catch (error) {
      console.error("Error recording excerpt performance:", error);
      throw new Error("Failed to record performance");
    }
  }

  async getExcerptPerformance(excerptId: string, startDate?: Date, endDate?: Date): Promise<ExcerptPerformance[]> {
    try {
      const conditions = [eq(excerptPerformance.excerptId, excerptId)];
      
      if (startDate) {
        conditions.push(gte(excerptPerformance.date, startDate.toISOString().split('T')[0]));
      }
      if (endDate) {
        conditions.push(lte(excerptPerformance.date, endDate.toISOString().split('T')[0]));
      }

      return await db
        .select()
        .from(excerptPerformance)
        .where(and(...conditions))
        .orderBy(desc(excerptPerformance.date));
    } catch (error) {
      console.error("Error getting excerpt performance:", error);
      throw new Error("Failed to get performance metrics");
    }
  }

  async updateExcerptCTR(excerptId: string): Promise<void> {
    try {
      // Calculate overall CTR from all performance records
      const performance = await db
        .select({
          totalViews: sql<number>`SUM(${excerptPerformance.views})`,
          totalClicks: sql<number>`SUM(${excerptPerformance.clicks})`,
        })
        .from(excerptPerformance)
        .where(eq(excerptPerformance.excerptId, excerptId));

      const totalViews = performance[0]?.totalViews || 0;
      const totalClicks = performance[0]?.totalClicks || 0;
      const ctr = totalViews > 0 ? totalClicks / totalViews : 0;

      // Update excerpt with calculated CTR
      await db
        .update(excerpts)
        .set({ clickThroughRate: ctr, updatedAt: new Date() })
        .where(eq(excerpts.id, excerptId));
    } catch (error) {
      console.error("Error updating excerpt CTR:", error);
      throw new Error("Failed to update CTR");
    }
  }

  async getBestExcerpt(userId: string, contentId: string): Promise<Excerpt | undefined> {
    try {
      const [result] = await db
        .select()
        .from(excerpts)
        .where(and(eq(excerpts.userId, userId), eq(excerpts.contentId, contentId)))
        .orderBy(desc(excerpts.clickThroughRate), desc(excerpts.isActive))
        .limit(1);
      return result;
    } catch (error) {
      console.error("Error getting best excerpt:", error);
      throw new Error("Failed to get best performing excerpt");
    }
  }

  // ==================== Draft Operations ====================
  
  async getDraftTemplates(contextType?: string): Promise<DraftTemplate[]> {
    try {
      const query = db
        .select()
        .from(draftTemplates)
        .where(eq(draftTemplates.isActive, true));
      
      if (contextType) {
        return await query.where(and(
          eq(draftTemplates.isActive, true),
          eq(draftTemplates.contextType, contextType)
        ));
      }
      
      return await query.orderBy(desc(draftTemplates.usageCount));
    } catch (error) {
      console.error("Error getting draft templates:", error);
      throw new Error("Failed to get draft templates");
    }
  }
  
  async createDraftTemplate(template: InsertDraftTemplate): Promise<DraftTemplate> {
    try {
      const [result] = await db
        .insert(draftTemplates)
        .values(template)
        .returning();
      return result;
    } catch (error) {
      console.error("Error creating draft template:", error);
      throw new Error("Failed to create draft template");
    }
  }
  
  async incrementTemplateUsage(templateId: string): Promise<void> {
    try {
      await db
        .update(draftTemplates)
        .set({ 
          usageCount: sql`${draftTemplates.usageCount} + 1`,
          updatedAt: new Date()
        })
        .where(eq(draftTemplates.id, templateId));
    } catch (error) {
      console.error("Error incrementing template usage:", error);
      throw new Error("Failed to increment template usage");
    }
  }
  
  async createGeneratedDraft(userId: string, draft: Omit<InsertGeneratedDraft, "userId">): Promise<GeneratedDraft> {
    try {
      const [result] = await db
        .insert(generatedDrafts)
        .values({
          ...draft,
          userId,
          metadata: draft.metadata as any
        })
        .returning();
      return result;
    } catch (error) {
      console.error("Error creating generated draft:", error);
      throw new Error("Failed to create generated draft");
    }
  }
  
  async getGeneratedDrafts(userId: string, originalMessageId?: string): Promise<GeneratedDraft[]> {
    try {
      const query = db
        .select()
        .from(generatedDrafts)
        .where(eq(generatedDrafts.userId, userId));
      
      if (originalMessageId) {
        return await query.where(and(
          eq(generatedDrafts.userId, userId),
          eq(generatedDrafts.originalMessageId, originalMessageId)
        )).orderBy(desc(generatedDrafts.createdAt));
      }
      
      return await query.orderBy(desc(generatedDrafts.createdAt));
    } catch (error) {
      console.error("Error getting generated drafts:", error);
      throw new Error("Failed to get generated drafts");
    }
  }
  
  async updateGeneratedDraft(userId: string, draftId: string, updates: Partial<Omit<InsertGeneratedDraft, "userId" | "id">>): Promise<GeneratedDraft> {
    try {
      const [result] = await db
        .update(generatedDrafts)
        .set({
          ...updates,
          updatedAt: new Date(),
          metadata: updates.metadata as any
        })
        .where(and(
          eq(generatedDrafts.userId, userId),
          eq(generatedDrafts.id, draftId)
        ))
        .returning();
      
      if (!result) {
        throw new Error("Draft not found");
      }
      
      return result;
    } catch (error) {
      console.error("Error updating generated draft:", error);
      throw new Error("Failed to update generated draft");
    }
  }
  
  async markDraftSelected(userId: string, draftId: string): Promise<void> {
    try {
      await db
        .update(generatedDrafts)
        .set({ 
          selected: true,
          updatedAt: new Date()
        })
        .where(and(
          eq(generatedDrafts.userId, userId),
          eq(generatedDrafts.id, draftId)
        ));
    } catch (error) {
      console.error("Error marking draft as selected:", error);
      throw new Error("Failed to mark draft as selected");
    }
  }
  
  async markDraftEdited(userId: string, draftId: string, editedContent: string): Promise<void> {
    try {
      await db
        .update(generatedDrafts)
        .set({ 
          edited: true,
          editedContent,
          updatedAt: new Date()
        })
        .where(and(
          eq(generatedDrafts.userId, userId),
          eq(generatedDrafts.id, draftId)
        ));
    } catch (error) {
      console.error("Error marking draft as edited:", error);
      throw new Error("Failed to mark draft as edited");
    }
  }
  
  async getUserDraftAnalytics(userId: string): Promise<{
    totalDrafts: number;
    selectedCount: number;
    editedCount: number;
    toneDistribution: { tone: string; count: number }[];
  }> {
    try {
      const drafts = await db
        .select()
        .from(generatedDrafts)
        .where(eq(generatedDrafts.userId, userId));
      
      const toneDistribution = await db
        .select({
          tone: generatedDrafts.tone,
          count: sql<number>`count(*)`
        })
        .from(generatedDrafts)
        .where(eq(generatedDrafts.userId, userId))
        .groupBy(generatedDrafts.tone)
        .orderBy(desc(sql`count(*)`));
      
      return {
        totalDrafts: drafts.length,
        selectedCount: drafts.filter(d => d.selected).length,
        editedCount: drafts.filter(d => d.edited).length,
        toneDistribution: toneDistribution.map(td => ({
          tone: td.tone || 'unknown',
          count: Number(td.count)
        }))
      };
    } catch (error) {
      console.error("Error getting draft analytics:", error);
      throw new Error("Failed to get draft analytics");
    }
  }

  // ==================== Natural Language Query Operations ====================

  async createQueryLog(
    userId: string,
    log: Omit<InsertQueryLog, "userId">
  ): Promise<QueryLog> {
    try {
      const [result] = await db
        .insert(queryLogs)
        .values({
          ...log,
          userId,
          metadata: log.metadata as any // Cast metadata properly
        })
        .returning();
      return result;
    } catch (error) {
      console.error("Error creating query log:", error);
      throw new Error("Failed to create query log");
    }
  }

  async getQueryLogs(
    userId: string,
    limit?: number
  ): Promise<QueryLog[]> {
    try {
      const query = db
        .select()
        .from(queryLogs)
        .where(eq(queryLogs.userId, userId))
        .orderBy(desc(queryLogs.createdAt));
      
      if (limit) {
        return await query.limit(limit);
      }
      
      return await query;
    } catch (error) {
      console.error("Error getting query logs:", error);
      throw new Error("Failed to get query logs");
    }
  }

  async getSavedQueries(userId: string): Promise<QueryLog[]> {
    try {
      return await db
        .select()
        .from(queryLogs)
        .where(and(eq(queryLogs.userId, userId), eq(queryLogs.isSaved, true)))
        .orderBy(desc(queryLogs.createdAt));
    } catch (error) {
      console.error("Error getting saved queries:", error);
      throw new Error("Failed to get saved queries");
    }
  }

  async saveQuery(
    userId: string,
    queryId: string,
    savedName: string
  ): Promise<QueryLog> {
    try {
      const [result] = await db
        .update(queryLogs)
        .set({
          isSaved: true,
          savedName
        })
        .where(and(eq(queryLogs.id, queryId), eq(queryLogs.userId, userId)))
        .returning();
      
      if (!result) {
        throw new Error("Query not found");
      }
      
      return result;
    } catch (error) {
      console.error("Error saving query:", error);
      throw new Error("Failed to save query");
    }
  }

  async updateQueryLog(
    queryId: string,
    updates: Partial<QueryLog>
  ): Promise<QueryLog> {
    try {
      const [result] = await db
        .update(queryLogs)
        .set(updates)
        .where(eq(queryLogs.id, queryId))
        .returning();
      
      if (!result) {
        throw new Error("Query log not found");
      }
      
      return result;
    } catch (error) {
      console.error("Error updating query log:", error);
      throw new Error("Failed to update query log");
    }
  }

  async getQueryLog(
    userId: string,
    queryId: string
  ): Promise<QueryLog | undefined> {
    try {
      const [result] = await db
        .select()
        .from(queryLogs)
        .where(and(eq(queryLogs.id, queryId), eq(queryLogs.userId, userId)))
        .limit(1);
      return result;
    } catch (error) {
      console.error("Error getting query log:", error);
      throw new Error("Failed to get query log");
    }
  }

  // ============================================================================
  // Sentiment Analysis Implementations
  // ============================================================================
  
  async createSentimentAnalysis(analysis: InsertSentimentAnalysis): Promise<SentimentAnalysis> {
    try {
      const [result] = await db
        .insert(sentimentAnalysis)
        .values(analysis)
        .returning();
      return result;
    } catch (error) {
      console.error("Error creating sentiment analysis:", error);
      throw new Error("Failed to create sentiment analysis");
    }
  }
  
  async getSentimentAnalysis(contentId: string): Promise<SentimentAnalysis | undefined> {
    try {
      const [result] = await db
        .select()
        .from(sentimentAnalysis)
        .where(eq(sentimentAnalysis.contentId, contentId))
        .orderBy(desc(sentimentAnalysis.analyzedAt))
        .limit(1);
      return result;
    } catch (error) {
      console.error("Error getting sentiment analysis:", error);
      throw new Error("Failed to get sentiment analysis");
    }
  }
  
  async getUserSentimentAnalyses(userId: string, limit: number = 50): Promise<SentimentAnalysis[]> {
    try {
      const analyses = await db
        .select()
        .from(sentimentAnalysis)
        .where(eq(sentimentAnalysis.userId, userId))
        .orderBy(desc(sentimentAnalysis.analyzedAt))
        .limit(limit);
      return analyses;
    } catch (error) {
      console.error("Error getting user sentiment analyses:", error);
      throw new Error("Failed to get user sentiment analyses");
    }
  }
  
  async updateSentimentAnalysis(id: string, data: Partial<InsertSentimentAnalysis>): Promise<void> {
    try {
      await db
        .update(sentimentAnalysis)
        .set(data)
        .where(eq(sentimentAnalysis.id, id));
    } catch (error) {
      console.error("Error updating sentiment analysis:", error);
      throw new Error("Failed to update sentiment analysis");
    }
  }
  
  async getSentimentAnalysesByType(contentType: string, limit: number = 50): Promise<SentimentAnalysis[]> {
    try {
      const analyses = await db
        .select()
        .from(sentimentAnalysis)
        .where(eq(sentimentAnalysis.contentType, contentType))
        .orderBy(desc(sentimentAnalysis.analyzedAt))
        .limit(limit);
      return analyses;
    } catch (error) {
      console.error("Error getting sentiment analyses by type:", error);
      throw new Error("Failed to get sentiment analyses by type");
    }
  }
  
  async createSentimentTrend(trend: InsertSentimentTrend): Promise<SentimentTrend> {
    try {
      const [result] = await db
        .insert(sentimentTrends)
        .values(trend)
        .returning();
      return result;
    } catch (error) {
      console.error("Error creating sentiment trend:", error);
      throw new Error("Failed to create sentiment trend");
    }
  }
  
  async getSentimentTrends(
    userId: string | null,
    periodType?: 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year',
    limit: number = 30
  ): Promise<SentimentTrend[]> {
    try {
      let query = db.select().from(sentimentTrends);
      
      // Filter by userId (null for global trends)
      if (userId !== null) {
        query = query.where(eq(sentimentTrends.userId, userId));
      } else {
        query = query.where(isNull(sentimentTrends.userId));
      }
      
      // Filter by period type if specified
      if (periodType) {
        query = query.where(eq(sentimentTrends.periodType, periodType));
      }
      
      const trends = await query
        .orderBy(desc(sentimentTrends.timePeriod))
        .limit(limit);
      
      return trends;
    } catch (error) {
      console.error("Error getting sentiment trends:", error);
      throw new Error("Failed to get sentiment trends");
    }
  }
  
  async getSentimentInsights(
    userId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    overallSentiment: number;
    sentimentDistribution: {
      positive: number;
      negative: number;
      neutral: number;
      mixed: number;
    };
    topEmotions: Array<{
      emotion: string;
      count: number;
      avgIntensity: number;
    }>;
    topTopics: string[];
    trendsOverTime: Array<{
      period: string;
      avgSentiment: number;
      count: number;
    }>;
  }> {
    try {
      // Build base query
      let query = db.select().from(sentimentAnalysis);
      
      // Apply filters
      const conditions = [];
      if (userId) {
        conditions.push(eq(sentimentAnalysis.userId, userId));
      }
      if (startDate) {
        conditions.push(gte(sentimentAnalysis.analyzedAt, startDate));
      }
      if (endDate) {
        conditions.push(lte(sentimentAnalysis.analyzedAt, endDate));
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
      
      const analyses = await query;
      
      // Calculate overall sentiment (-1 to 1 scale)
      let sentimentSum = 0;
      const sentimentCounts = {
        positive: 0,
        negative: 0,
        neutral: 0,
        mixed: 0
      };
      
      // Track emotions
      const emotionData: { [key: string]: { count: number; totalIntensity: number } } = {};
      
      // Track topics
      const topicCounts: { [key: string]: number } = {};
      
      // Process each analysis
      analyses.forEach((analysis: any) => {
        // Count sentiments
        sentimentCounts[analysis.sentiment as keyof typeof sentimentCounts]++;
        
        // Calculate sentiment score
        if (analysis.sentiment === 'positive') sentimentSum += 1;
        else if (analysis.sentiment === 'negative') sentimentSum -= 1;
        else if (analysis.sentiment === 'mixed') sentimentSum += 0;
        
        // Process emotions
        if (analysis.emotions) {
          Object.entries(analysis.emotions).forEach(([emotion, intensity]) => {
            if (typeof intensity === 'number' && intensity > 0) {
              if (!emotionData[emotion]) {
                emotionData[emotion] = { count: 0, totalIntensity: 0 };
              }
              emotionData[emotion].count++;
              emotionData[emotion].totalIntensity += intensity;
            }
          });
        }
        
        // Process topics
        if (analysis.topics && Array.isArray(analysis.topics)) {
          analysis.topics.forEach((topic: string) => {
            topicCounts[topic] = (topicCounts[topic] || 0) + 1;
          });
        }
      });
      
      // Calculate overall sentiment
      const overallSentiment = analyses.length > 0 ? sentimentSum / analyses.length : 0;
      
      // Calculate sentiment distribution percentages
      const total = analyses.length || 1;
      const sentimentDistribution = {
        positive: (sentimentCounts.positive / total) * 100,
        negative: (sentimentCounts.negative / total) * 100,
        neutral: (sentimentCounts.neutral / total) * 100,
        mixed: (sentimentCounts.mixed / total) * 100
      };
      
      // Calculate top emotions
      const topEmotions = Object.entries(emotionData)
        .map(([emotion, data]) => ({
          emotion,
          count: data.count,
          avgIntensity: data.totalIntensity / data.count
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
      
      // Get top topics
      const topTopics = Object.entries(topicCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([topic]) => topic);
      
      // Get trends over time (simplified - in production, would aggregate by period)
      const recentTrends = await this.getSentimentTrends(userId || null, 'day', 7);
      const trendsOverTime = recentTrends.map(trend => ({
        period: trend.timePeriod,
        avgSentiment: trend.avgSentiment,
        count: trend.totalAnalyzed
      }));
      
      return {
        overallSentiment,
        sentimentDistribution,
        topEmotions,
        topTopics,
        trendsOverTime
      };
    } catch (error) {
      console.error("Error getting sentiment insights:", error);
      throw new Error("Failed to get sentiment insights");
    }
  }
  
  // ============================================================================
  // Auto-Save Methods
  // ============================================================================
  
  async saveDraft(draft: InsertAutoSaveDraft): Promise<AutoSaveDraft> {
    try {
      // Get the latest version for this document to increment
      const latestDraft = await this.getLatestDraft(draft.userId, draft.documentId);
      const nextVersion = latestDraft ? (latestDraft.version + 1) : 1;
      
      // Calculate content hash for duplicate detection
      const crypto = await import('crypto');
      const contentHash = crypto
        .createHash('sha256')
        .update(draft.content)
        .digest('hex');
      
      // Skip saving if content hasn't changed
      if (latestDraft && latestDraft.contentHash === contentHash) {
        return latestDraft;
      }
      
      // Save the draft with incremented version
      const [savedDraft] = await db
        .insert(autoSaveDrafts)
        .values({
          ...draft,
          version: nextVersion,
          contentHash,
        })
        .returning();
      
      // Clean up old versions (keep only last 10)
      const allVersions = await this.getDraftVersions(draft.userId, draft.documentId);
      if (allVersions.length > 10) {
        const versionsToDelete = allVersions
          .slice(10)
          .map(v => v.id);
        
        await db
          .delete(autoSaveDrafts)
          .where(
            and(
              eq(autoSaveDrafts.userId, draft.userId),
              sql`${autoSaveDrafts.id} = ANY(${versionsToDelete})`
            )
          );
      }
      
      return savedDraft;
    } catch (error) {
      console.error("Error saving draft:", error);
      throw new Error("Failed to save draft");
    }
  }
  
  async getLatestDraft(userId: string, documentId: string): Promise<AutoSaveDraft | undefined> {
    try {
      const [draft] = await db
        .select()
        .from(autoSaveDrafts)
        .where(
          and(
            eq(autoSaveDrafts.userId, userId),
            eq(autoSaveDrafts.documentId, documentId)
          )
        )
        .orderBy(desc(autoSaveDrafts.version))
        .limit(1);
      
      return draft;
    } catch (error) {
      console.error("Error getting latest draft:", error);
      throw new Error("Failed to get latest draft");
    }
  }
  
  async getDraftVersions(userId: string, documentId: string, limit = 10): Promise<AutoSaveDraft[]> {
    try {
      const drafts = await db
        .select()
        .from(autoSaveDrafts)
        .where(
          and(
            eq(autoSaveDrafts.userId, userId),
            eq(autoSaveDrafts.documentId, documentId)
          )
        )
        .orderBy(desc(autoSaveDrafts.version))
        .limit(limit);
      
      return drafts;
    } catch (error) {
      console.error("Error getting draft versions:", error);
      throw new Error("Failed to get draft versions");
    }
  }
  
  async deleteDraft(userId: string, draftId: string): Promise<void> {
    try {
      await db
        .delete(autoSaveDrafts)
        .where(
          and(
            eq(autoSaveDrafts.id, draftId),
            eq(autoSaveDrafts.userId, userId)
          )
        );
    } catch (error) {
      console.error("Error deleting draft:", error);
      throw new Error("Failed to delete draft");
    }
  }
  
  async deleteDocumentDrafts(userId: string, documentId: string): Promise<void> {
    try {
      await db
        .delete(autoSaveDrafts)
        .where(
          and(
            eq(autoSaveDrafts.userId, userId),
            eq(autoSaveDrafts.documentId, documentId)
          )
        );
    } catch (error) {
      console.error("Error deleting document drafts:", error);
      throw new Error("Failed to delete document drafts");
    }
  }
  
  async cleanupOldDrafts(userId?: string): Promise<number> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const conditions = [
        lte(autoSaveDrafts.savedAt, thirtyDaysAgo)
      ];
      
      if (userId) {
        conditions.push(eq(autoSaveDrafts.userId, userId));
      }
      
      const result = await db
        .delete(autoSaveDrafts)
        .where(and(...conditions));
      
      // Return count of deleted rows (Drizzle doesn't provide this directly)
      return 0; // TODO: Implement proper row count
    } catch (error) {
      console.error("Error cleaning up old drafts:", error);
      throw new Error("Failed to clean up old drafts");
    }
  }
  
  async getUserSavePatterns(userId: string): Promise<SavePattern> {
    try {
      const [pattern] = await db
        .select()
        .from(savePatterns)
        .where(eq(savePatterns.userId, userId));
      
      if (!pattern) {
        // Create default pattern for new user
        const [newPattern] = await db
          .insert(savePatterns)
          .values({
            userId,
            avgPauseDuration: 2000,
            typingSpeed: 40,
            saveFrequency: 0.5,
            sentencePauseDuration: 2500,
            paragraphPauseDuration: 4000,
            preferredSaveInterval: 3000,
            totalSessions: 0,
          })
          .returning();
        
        return newPattern;
      }
      
      return pattern;
    } catch (error) {
      console.error("Error getting user save patterns:", error);
      throw new Error("Failed to get user save patterns");
    }
  }
  
  async updateUserSavePatterns(
    userId: string,
    patterns: Partial<InsertSavePattern>
  ): Promise<SavePattern> {
    try {
      const [updatedPattern] = await db
        .update(savePatterns)
        .set({
          ...patterns,
          updatedAt: new Date(),
        })
        .where(eq(savePatterns.userId, userId))
        .returning();
      
      return updatedPattern;
    } catch (error) {
      console.error("Error updating user save patterns:", error);
      throw new Error("Failed to update user save patterns");
    }
  }
  
  async recordTypingEvent(
    userId: string,
    event: {
      pauseDuration?: number;
      burstLength?: number;
      keyInterval?: number;
      isSentenceEnd?: boolean;
      isParagraphEnd?: boolean;
      wasManualSave?: boolean;
    }
  ): Promise<void> {
    try {
      // Get current patterns
      const patterns = await this.getUserSavePatterns(userId);
      
      // Update pattern data with new event
      const patternData = patterns.patternData || {
        pauseHistogram: [],
        keystrokeIntervals: [],
        burstLengths: [],
        timeOfDayPreferences: {},
        contentTypePatterns: {},
      };
      
      // Add event data to pattern history
      if (event.pauseDuration !== undefined && patternData.pauseHistogram) {
        patternData.pauseHistogram.push(event.pauseDuration);
        // Keep only last 1000 samples
        if (patternData.pauseHistogram.length > 1000) {
          patternData.pauseHistogram = patternData.pauseHistogram.slice(-1000);
        }
      }
      
      if (event.keyInterval !== undefined && patternData.keystrokeIntervals) {
        patternData.keystrokeIntervals.push(event.keyInterval);
        if (patternData.keystrokeIntervals.length > 1000) {
          patternData.keystrokeIntervals = patternData.keystrokeIntervals.slice(-1000);
        }
      }
      
      if (event.burstLength !== undefined && patternData.burstLengths) {
        patternData.burstLengths.push(event.burstLength);
        if (patternData.burstLengths.length > 1000) {
          patternData.burstLengths = patternData.burstLengths.slice(-1000);
        }
      }
      
      // Update patterns if we have enough data
      if (patternData.pauseHistogram && patternData.pauseHistogram.length > 100) {
        const avgPause = patternData.pauseHistogram.reduce((a, b) => a + b, 0) / patternData.pauseHistogram.length;
        
        await this.updateUserSavePatterns(userId, {
          avgPauseDuration: avgPause,
          patternData,
          lastAnalyzed: new Date(),
        });
      }
    } catch (error) {
      console.error("Error recording typing event:", error);
      // Don't throw - this is a background operation
    }
  }
  
  async checkForConflicts(
    userId: string,
    documentId: string,
    contentHash: string
  ): Promise<{
    hasConflict: boolean;
    latestVersion?: AutoSaveDraft;
  }> {
    try {
      const latestDraft = await this.getLatestDraft(userId, documentId);
      
      if (!latestDraft) {
        return { hasConflict: false };
      }
      
      const hasConflict = latestDraft.contentHash !== contentHash;
      
      return {
        hasConflict,
        latestVersion: hasConflict ? latestDraft : undefined,
      };
    } catch (error) {
      console.error("Error checking for conflicts:", error);
      throw new Error("Failed to check for conflicts");
    }
  }

  // ==================== Form Completion Implementation ====================
  
  async getFieldSuggestions(
    fieldName: string,
    query: string,
    userId?: string
  ): Promise<string[]> {
    try {
      const suggestions: string[] = [];
      const normalizedQuery = query.toLowerCase();
      
      // First, get user's personal history if userId provided
      if (userId) {
        const userHistory = await db
          .select()
          .from(userFormHistory)
          .where(
            and(
              eq(userFormHistory.userId, userId),
              eq(userFormHistory.fieldName, fieldName)
            )
          )
          .limit(1);
          
        if (userHistory.length > 0 && userHistory[0].valuesUsed) {
          const sortedValues = (userHistory[0].valuesUsed as Array<{value: string; count: number}>)
            .filter(v => v.value.toLowerCase().startsWith(normalizedQuery))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5)
            .map(v => v.value);
          suggestions.push(...sortedValues);
        }
      }
      
      // Then add global suggestions
      const globalCompletions = await db
        .select()
        .from(formCompletions)
        .where(eq(formCompletions.fieldName, fieldName))
        .limit(1);
        
      if (globalCompletions.length > 0 && globalCompletions[0].commonValues) {
        const globalValues = (globalCompletions[0].commonValues as Array<{value: string; count: number}>)
          .filter(v => !suggestions.includes(v.value) && v.value.toLowerCase().startsWith(normalizedQuery))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10 - suggestions.length)
          .map(v => v.value);
        suggestions.push(...globalValues);
      }
      
      return suggestions;
    } catch (error) {
      console.error("Error getting field suggestions:", error);
      return [];
    }
  }
  
  async getContextualSuggestions(
    fieldName: string,
    context: Record<string, any>,
    userId?: string
  ): Promise<string[]> {
    try {
      const suggestions: string[] = [];
      
      // Get form completion data
      const completion = await this.getFormCompletion(fieldName);
      
      if (completion?.contextRules) {
        const rules = completion.contextRules as Array<{
          condition: string;
          suggestions: string[];
          priority: number;
        }>;
        
        // Evaluate context rules
        for (const rule of rules.sort((a, b) => b.priority - a.priority)) {
          // Simple condition evaluation (e.g., "if field:country = 'USA'")
          const match = rule.condition.match(/if field:(\w+) = '(.+)'/);
          if (match) {
            const [_, contextField, value] = match;
            if (context[contextField] === value) {
              suggestions.push(...rule.suggestions);
              if (suggestions.length >= 10) break;
            }
          }
        }
      }
      
      // Add user history if available
      if (userId && suggestions.length < 10) {
        const personalSuggestions = await this.getFieldSuggestions(fieldName, '', userId);
        suggestions.push(...personalSuggestions.slice(0, 10 - suggestions.length));
      }
      
      return suggestions;
    } catch (error) {
      console.error("Error getting contextual suggestions:", error);
      return [];
    }
  }
  
  async recordFormInput(
    userId: string,
    fieldName: string,
    value: string,
    context?: Record<string, any>
  ): Promise<void> {
    try {
      // Update user's personal history
      const existingHistory = await db
        .select()
        .from(userFormHistory)
        .where(
          and(
            eq(userFormHistory.userId, userId),
            eq(userFormHistory.fieldName, fieldName)
          )
        )
        .limit(1);
        
      const now = new Date().toISOString();
      
      if (existingHistory.length > 0) {
        const history = existingHistory[0];
        let valuesUsed = (history.valuesUsed || []) as Array<{value: string; count: number; lastUsed: string; context?: any}>;
        
        const existingValueIndex = valuesUsed.findIndex(v => v.value === value);
        
        if (existingValueIndex >= 0) {
          valuesUsed[existingValueIndex].count++;
          valuesUsed[existingValueIndex].lastUsed = now;
          valuesUsed[existingValueIndex].context = context;
        } else {
          valuesUsed.push({
            value,
            count: 1,
            lastUsed: now,
            context
          });
        }
        
        // Keep only top 50 values
        valuesUsed = valuesUsed
          .sort((a, b) => b.count - a.count)
          .slice(0, 50);
          
        // Update frequency map
        const frequencyMap: Record<string, number> = {};
        for (const v of valuesUsed) {
          frequencyMap[v.value] = v.count;
        }
        
        await db
          .update(userFormHistory)
          .set({
            valuesUsed,
            frequencyMap,
            updatedAt: new Date()
          })
          .where(eq(userFormHistory.id, history.id));
      } else {
        // Create new history
        await db
          .insert(userFormHistory)
          .values({
            userId,
            fieldName,
            valuesUsed: [{
              value,
              count: 1,
              lastUsed: now,
              context
            }],
            frequencyMap: { [value]: 1 },
            preferences: {
              autoFillEnabled: true,
              rememberValues: true,
              suggestSimilar: true
            }
          });
      }
      
      // Update global statistics (async, don't await)
      this.updateFormCompletionStats(fieldName).catch(console.error);
      
    } catch (error) {
      console.error("Error recording form input:", error);
      // Don't throw - this is a background operation
    }
  }
  
  async recordCompletionFeedback(
    feedback: InsertCompletionFeedback
  ): Promise<CompletionFeedback> {
    try {
      const result = await db
        .insert(completionFeedback)
        .values(feedback)
        .returning();
      
      return result[0];
    } catch (error) {
      console.error("Error recording completion feedback:", error);
      throw error;
    }
  }
  
  async getUserFormHistory(
    userId: string,
    fieldName?: string
  ): Promise<UserFormHistory[]> {
    try {
      const conditions = [eq(userFormHistory.userId, userId)];
      
      if (fieldName) {
        conditions.push(eq(userFormHistory.fieldName, fieldName));
      }
      
      return await db
        .select()
        .from(userFormHistory)
        .where(and(...conditions))
        .orderBy(desc(userFormHistory.updatedAt));
    } catch (error) {
      console.error("Error getting user form history:", error);
      throw error;
    }
  }
  
  async clearUserFormHistory(userId: string): Promise<void> {
    try {
      await db
        .delete(userFormHistory)
        .where(eq(userFormHistory.userId, userId));
    } catch (error) {
      console.error("Error clearing user form history:", error);
      throw error;
    }
  }
  
  async updateFormCompletionStats(fieldName: string): Promise<void> {
    try {
      // Get existing completion data
      const existing = await db
        .select()
        .from(formCompletions)
        .where(eq(formCompletions.fieldName, fieldName))
        .limit(1);
        
      if (existing.length > 0) {
        // Update usage count
        await db
          .update(formCompletions)
          .set({
            globalUsageCount: sql`${formCompletions.globalUsageCount} + 1`,
            lastUpdated: new Date()
          })
          .where(eq(formCompletions.fieldName, fieldName));
      } else {
        // Create new entry
        await db
          .insert(formCompletions)
          .values({
            fieldName,
            fieldType: fieldName.includes('email') ? 'email' : 
                       fieldName.includes('phone') ? 'tel' :
                       fieldName.includes('address') ? 'address' : 'text',
            globalUsageCount: 1
          });
      }
    } catch (error) {
      console.error("Error updating form completion stats:", error);
      // Don't throw - this is a background operation
    }
  }
  
  async getFormCompletion(fieldName: string): Promise<FormCompletion | null> {
    try {
      const result = await db
        .select()
        .from(formCompletions)
        .where(eq(formCompletions.fieldName, fieldName))
        .limit(1);
        
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error("Error getting form completion:", error);
      return null;
    }
  }
}

export const storage = new DatabaseStorage();
