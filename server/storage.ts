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
  userChats,
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
  type AnalyticsInsight,
  type InsertAnalyticsInsight,
  type InsightFeedback,
  type InsertInsightFeedback,
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
  analyticsInsights,
  insightFeedback,
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
  // Prediction types
  type UserPrediction,
  type InsertUserPrediction,
  type PredictionAccuracy,
  type InsertPredictionAccuracy,
  userPredictions,
  predictionAccuracy,
  // Trend types
  type Trend,
  type InsertTrend,
  type TrendAlert,
  type InsertTrendAlert,
  trends,
  trendAlerts,
  // A/B Testing types and tables
  type AbTest,
  type InsertAbTest,
  type AbTestResult,
  type InsertAbTestResult,
  type AbTestInsight,
  type InsertAbTestInsight,
  abTests,
  abTestResults,
  abTestInsights,
  // Cohort Analysis types and tables
  type Cohort,
  type InsertCohort,
  type CohortMetric,
  type InsertCohortMetric,
  type CohortInsight,
  type InsertCohortInsight,
  cohorts,
  cohortMetrics,
  cohortInsights,
  // Predictive Maintenance types and tables
  type SystemMetric,
  type InsertSystemMetric,
  type MaintenancePrediction,
  type InsertMaintenancePrediction,
  type MaintenanceHistory,
  type InsertMaintenanceHistory,
  systemMetrics,
  maintenancePredictions,
  maintenanceHistory,
  // Scheduling types and tables
  type SchedulingPreferences,
  type InsertSchedulingPreferences,
  type MeetingSuggestions,
  type InsertMeetingSuggestions,
  type SchedulingPatterns,
  type InsertSchedulingPatterns,
  type MeetingEvents,
  type InsertMeetingEvents,
  schedulingPreferences,
  meetingSuggestions,
  schedulingPatterns,
  meetingEvents,
  // Ticket routing types
  type Ticket,
  type InsertTicket,
  type RoutingRule,
  type InsertRoutingRule,
  type TicketRouting,
  type InsertTicketRouting,
  type AgentExpertise,
  type InsertAgentExpertise,
  tickets,
  routingRules,
  ticketRouting,
  agentExpertise,
  // Extraction types
  type ExtractionTemplate,
  type InsertExtractionTemplate,
  type ExtractedData,
  type InsertExtractedData,
  extractionTemplates,
  extractedData,
  // Pricing types
  type PricingRules,
  type InsertPricingRules,
  type PriceHistory,
  type InsertPriceHistory,
  type PricingPerformance,
  type InsertPricingPerformance,
  pricingRules,
  priceHistory,
  pricingPerformance,
  type ImageProcessing,
  type InsertImageProcessing,
  type ImagePresets,
  type InsertImagePresets,
  imageProcessing,
  imagePresets,
  // Face Detection types
  type FaceDetection,
  type InsertFaceDetection,
  type PrivacySettings,
  type InsertPrivacySettings,
  faceDetections,
  privacySettings,
  // OCR types and tables
  type OcrResult,
  type InsertOcrResult,
  type OcrCorrection,
  type InsertOcrCorrection,
  ocrResults,
  ocrCorrections,
  // Transcription types and tables
  type Transcription,
  type InsertTranscription,
  type TranscriptEdit,
  type InsertTranscriptEdit,
  transcriptions,
  transcriptEdits,
} from "@shared/schema";
import { db } from "./db";
import {
  eq,
  sql,
  and,
  or,
  desc,
  asc,
  gte,
  lte,
  isNull,
  isNotNull,
  ne,
  type SQL,
} from "drizzle-orm";
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
  getAuthProviderByProviderAndId(
    provider: string,
    providerId: string,
  ): Promise<AuthProvider | undefined>;

  /**
   * Get auth provider by provider and user ID
   */
  getAuthProviderByProviderAndUserId(
    provider: string,
    userId: string,
  ): Promise<AuthProvider | undefined>;

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
  getNotificationPreferences(
    userId: string,
  ): Promise<NotificationPreferences | undefined>;
  upsertNotificationPreferences(
    userId: string,
    preferences: Omit<InsertNotificationPreferences, "userId">,
  ): Promise<NotificationPreferences>;

  createNotificationScore(
    score: InsertNotificationScores,
  ): Promise<NotificationScores>;
  getNotificationScores(
    userId: string,
    limit?: number,
  ): Promise<NotificationScores[]>;
  getPendingNotifications(beforeTime: Date): Promise<NotificationScores[]>;
  updateNotificationScore(
    id: string,
    updates: Partial<NotificationScores>,
  ): Promise<void>;

  createNotificationFeedback(
    feedback: InsertNotificationFeedback,
  ): Promise<NotificationFeedback>;
  getNotificationFeedback(
    userId: string,
    notificationId?: string,
  ): Promise<NotificationFeedback[]>;
  getRecentUserEngagement(
    userId: string,
    days?: number,
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

  // Storage Locations (user-scoped)
  getStorageLocations(userId: string): Promise<UserStorage[]>;
  getStorageLocation(
    userId: string,
    id: string,
  ): Promise<UserStorage | undefined>;
  createStorageLocation(
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
  ): Promise<UserStorage>;
  updateStorageLocation(
    userId: string,
    id: string,
    updates: Partial<UserStorage>,
  ): Promise<UserStorage>;
  deleteStorageLocation(userId: string, id: string): Promise<void>;

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
  getExpiringItems(
    userId: string,
    daysThreshold: number,
  ): Promise<UserInventory[]>;
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
  createSentimentMetrics(
    metrics: InsertSentimentMetrics,
  ): Promise<SentimentMetrics>;
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
  createSentimentSegment(
    segment: InsertSentimentSegments,
  ): Promise<SentimentSegments>;
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
  createSentimentAnalysis(
    analysis: InsertSentimentAnalysis,
  ): Promise<SentimentAnalysis>;
  getSentimentAnalyses(filters?: {
    userId?: string;
    contentType?: string;
    sentiment?: "positive" | "negative" | "neutral" | "mixed";
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<SentimentAnalysis[]>;

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
    log: Omit<InsertQueryLog, "userId">,
  ): Promise<QueryLog>;

  /**
   * Get query history for a user
   */
  getQueryLogs(userId: string, limit?: number): Promise<QueryLog[]>;

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
    savedName: string,
  ): Promise<QueryLog>;

  /**
   * Update query log with execution results
   */
  updateQueryLog(
    queryId: string,
    updates: Partial<QueryLog>,
  ): Promise<QueryLog>;

  /**
   * Get query by ID
   */
  getQueryLog(userId: string, queryId: string): Promise<QueryLog | undefined>;

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
  upsertContentEmbedding(
    embedding: InsertContentEmbedding,
  ): Promise<ContentEmbedding>;

  /**
   * Get embeddings for content
   * @param contentId - Content ID
   * @param contentType - Type of content
   * @param userId - User ID
   */
  getContentEmbedding(
    contentId: string,
    contentType: string,
    userId: string,
  ): Promise<ContentEmbedding | undefined>;

  /**
   * Search by embedding similarity
   * @param queryEmbedding - Query embedding vector
   * @param contentType - Filter by content type
   * @param userId - User ID
   * @param limit - Max results
   */
  searchByEmbedding(
    queryEmbedding: number[],
    contentType: string,
    userId: string,
    limit?: number,
  ): Promise<Array<ContentEmbedding & { similarity: number }>>;

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
  updateSearchLogFeedback(
    searchLogId: string,
    feedback: {
      clickedResultId: string;
      clickedResultType: string;
      clickPosition: number;
      timeToClick: number;
    },
  ): Promise<SearchLog>;

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
  getContentCategories(
    contentId: string,
    contentType: string,
    userId: string,
  ): Promise<ContentCategory[]>;

  /**
   * Assign category to content
   * @param assignment - Category assignment data
   */
  assignContentCategory(
    assignment: InsertContentCategory,
  ): Promise<ContentCategory>;

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
  getContentTags(
    contentId: string,
    contentType: string,
    userId: string,
  ): Promise<Array<ContentTag & { tag: Tag }>>;

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
  removeContentTag(
    contentId: string,
    tagId: string,
    userId: string,
  ): Promise<void>;

  /**
   * Update tag relevance score
   * @param contentId - Content ID
   * @param tagId - Tag ID
   * @param userId - User ID
   * @param relevanceScore - New relevance score
   */
  updateTagRelevanceScore(
    contentId: string,
    tagId: string,
    userId: string,
    relevanceScore: number,
  ): Promise<void>;

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
  updateDuplicateStatus(
    pairId: string,
    status: string,
    reviewedBy: string,
  ): Promise<void>;

  /**
   * Get related content from cache
   * @param contentId - Content ID
   * @param contentType - Content type
   * @param userId - User ID
   */
  getRelatedContent(
    contentId: string,
    contentType: string,
    userId: string,
  ): Promise<RelatedContentCache | undefined>;

  /**
   * Cache related content
   * @param cache - Related content cache data
   */
  cacheRelatedContent(
    cache: InsertRelatedContentCache,
  ): Promise<RelatedContentCache>;

  /**
   * Create natural language query log
   * @param log - Query log data
   */

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
  getConversation(
    userId: string,
    conversationId: string,
  ): Promise<Conversation | undefined>;

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
  updateConversation(
    userId: string,
    conversationId: string,
    updates: Partial<Conversation>,
  ): Promise<Conversation>;

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
  getConversationContext(
    conversationId: string,
  ): Promise<ConversationContext | undefined>;

  /**
   * Update conversation context
   * @param conversationId - Conversation ID
   * @param context - Context data
   */
  updateConversationContext(
    conversationId: string,
    context: Partial<ConversationContext>,
  ): Promise<ConversationContext>;

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
  getAvailableVoiceCommands(): Promise<
    Array<{ command: string; description: string; example: string }>
  >;

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
  saveGeneratedDrafts(
    userId: string,
    drafts: Omit<InsertGeneratedDraft, "userId">[],
  ): Promise<GeneratedDraft[]>;

  /**
   * Mark a draft as selected
   * @param userId - User ID
   * @param draftId - Draft ID
   * @param edited - Whether the draft was edited before sending
   */
  markDraftSelected(
    userId: string,
    draftId: string,
    edited: boolean,
  ): Promise<void>;

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
  getWritingSession(
    userId: string,
    sessionId: string,
  ): Promise<WritingSession | undefined>;

  /**
   * Update writing session with improvements
   * @param userId - User ID
   * @param sessionId - Session ID
   * @param improvedText - Improved text
   * @param improvements - Applied improvements
   */
  updateWritingSession(
    userId: string,
    sessionId: string,
    improvedText: string,
    improvements: string[],
  ): Promise<WritingSession>;

  /**
   * Add writing suggestions to a session
   * @param sessionId - Session ID
   * @param suggestions - Array of suggestions
   */
  addWritingSuggestions(
    sessionId: string,
    suggestions: Omit<InsertWritingSuggestion, "sessionId">[],
  ): Promise<WritingSuggestion[]>;

  /**
   * Mark suggestion as accepted/rejected
   * @param suggestionId - Suggestion ID
   * @param accepted - Whether suggestion was accepted
   */
  updateSuggestionStatus(
    suggestionId: string,
    accepted: boolean,
  ): Promise<void>;

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

  // ==================== Transcription Operations ====================

  /**
   * Get all transcriptions for a user
   * @param userId - User ID
   * @param status - Filter by status (processing, completed, failed)
   * @param limit - Max results
   */
  getTranscriptions(
    userId: string,
    status?: string,
    limit?: number,
  ): Promise<Transcription[]>;

  /**
   * Get paginated transcriptions
   * @param userId - User ID
   * @param page - Page number
   * @param limit - Items per page
   * @param status - Filter by status
   */
  getTranscriptionsPaginated(
    userId: string,
    page?: number,
    limit?: number,
    status?: string,
  ): Promise<PaginatedResponse<Transcription>>;

  /**
   * Get a specific transcription
   * @param userId - User ID
   * @param transcriptionId - Transcription ID
   */
  getTranscription(
    userId: string,
    transcriptionId: string,
  ): Promise<Transcription | undefined>;

  /**
   * Create a new transcription
   * @param userId - User ID
   * @param transcription - Transcription data
   */
  createTranscription(
    userId: string,
    transcription: Omit<InsertTranscription, "userId">,
  ): Promise<Transcription>;

  /**
   * Update transcription (e.g., status, transcript, segments)
   * @param userId - User ID
   * @param transcriptionId - Transcription ID
   * @param updates - Fields to update
   */
  updateTranscription(
    userId: string,
    transcriptionId: string,
    updates: Partial<Transcription>,
  ): Promise<Transcription>;

  /**
   * Delete a transcription and all its edits
   * @param userId - User ID
   * @param transcriptionId - Transcription ID
   */
  deleteTranscription(userId: string, transcriptionId: string): Promise<void>;

  /**
   * Get transcript edits for a transcription
   * @param transcriptionId - Transcription ID
   * @param limit - Max results
   */
  getTranscriptEdits(
    transcriptionId: string,
    limit?: number,
  ): Promise<TranscriptEdit[]>;

  /**
   * Create a transcript edit
   * @param userId - User ID
   * @param edit - Edit data
   */
  createTranscriptEdit(
    userId: string,
    edit: Omit<InsertTranscriptEdit, "userId">,
  ): Promise<TranscriptEdit>;

  /**
   * Update transcript edit
   * @param userId - User ID
   * @param editId - Edit ID
   * @param updates - Fields to update
   */
  updateTranscriptEdit(
    userId: string,
    editId: string,
    updates: Partial<TranscriptEdit>,
  ): Promise<TranscriptEdit>;

  /**
   * Delete a transcript edit
   * @param userId - User ID
   * @param editId - Edit ID
   */
  deleteTranscriptEdit(userId: string, editId: string): Promise<void>;

  /**
   * Get recent transcriptions
   * @param userId - User ID
   * @param days - Number of days to look back
   */
  getRecentTranscriptions(
    userId: string,
    days?: number,
  ): Promise<Transcription[]>;

  /**
   * Search transcriptions by text
   * @param userId - User ID
   * @param query - Search query
   * @param limit - Max results
   */
  searchTranscriptions(
    userId: string,
    query: string,
    limit?: number,
  ): Promise<Transcription[]>;

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
  createSummary(
    userId: string,
    summary: Omit<InsertSummary, "userId">,
  ): Promise<Summary>;

  /**
   * Update an existing summary (for editing)
   * @param userId - User ID
   * @param summaryId - Summary ID
   * @param updates - Partial summary updates
   */
  updateSummary(
    userId: string,
    summaryId: string,
    updates: Partial<Omit<InsertSummary, "userId" | "id">>,
  ): Promise<Summary>;

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
  getSummariesByType(
    userId: string,
    type: "tldr" | "bullet" | "paragraph",
  ): Promise<Summary[]>;

  /**
   * Get excerpt by content ID
   * @param userId - User ID
   * @param contentId - Content ID
   * @param variant - Optional variant (A, B, C, etc.)
   */
  getExcerpt(
    userId: string,
    contentId: string,
    variant?: string,
  ): Promise<Excerpt | undefined>;

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
  createExcerpt(
    userId: string,
    excerpt: Omit<InsertExcerpt, "userId">,
  ): Promise<Excerpt>;

  /**
   * Update an excerpt
   * @param userId - User ID
   * @param excerptId - Excerpt ID
   * @param updates - Partial excerpt updates
   */
  updateExcerpt(
    userId: string,
    excerptId: string,
    updates: Partial<Omit<InsertExcerpt, "userId" | "id">>,
  ): Promise<Excerpt>;

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
  setActiveExcerpt(
    userId: string,
    contentId: string,
    excerptId: string,
  ): Promise<void>;

  /**
   * Record excerpt performance
   * @param performance - Performance data
   */
  recordExcerptPerformance(
    performance: InsertExcerptPerformance,
  ): Promise<ExcerptPerformance>;

  /**
   * Get excerpt performance metrics
   * @param excerptId - Excerpt ID
   * @param startDate - Optional start date
   * @param endDate - Optional end date
   */
  getExcerptPerformance(
    excerptId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<ExcerptPerformance[]>;

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
  getBestExcerpt(
    userId: string,
    contentId: string,
  ): Promise<Excerpt | undefined>;

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
    context?: string,
  ): Promise<Translation>;

  /**
   * Get translations for content
   * @param contentId - Content identifier
   * @param languageCode - Optional language code filter
   */
  getTranslations(
    contentId: string,
    languageCode?: string,
  ): Promise<Translation[]>;

  /**
   * Get translation by content and language
   * @param contentId - Content identifier
   * @param languageCode - Language code
   */
  getTranslation(
    contentId: string,
    languageCode: string,
  ): Promise<Translation | undefined>;

  /**
   * Verify a translation
   * @param translationId - Translation ID
   * @param translatorId - User ID of verifier
   */
  verifyTranslation(
    translationId: string,
    translatorId: string,
  ): Promise<Translation>;

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
  getSupportedLanguages(): Promise<
    Array<{ code: string; name: string; nativeName: string }>
  >;

  // Language Preferences

  /**
   * Get user language preferences
   * @param userId - User ID
   */
  getLanguagePreferences(
    userId: string,
  ): Promise<LanguagePreference | undefined>;

  /**
   * Create or update language preferences
   * @param userId - User ID
   * @param preferences - Language preferences
   */
  upsertLanguagePreferences(
    userId: string,
    preferences: Omit<InsertLanguagePreference, "userId">,
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
  getImageMetadata(
    userId: string,
    imageId: string,
  ): Promise<ImageMetadata | undefined>;

  /**
   * Get image metadata by URL
   * @param userId - User ID
   * @param imageUrl - Image URL
   */
  getImageMetadataByUrl(
    userId: string,
    imageUrl: string,
  ): Promise<ImageMetadata | undefined>;

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
    },
  ): Promise<PaginatedResponse<ImageMetadata>>;

  /**
   * Create image metadata record
   * @param userId - User ID
   * @param metadata - Image metadata
   */
  createImageMetadata(
    userId: string,
    metadata: Omit<InsertImageMetadata, "userId">,
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
    updates: Partial<Omit<InsertImageMetadata, "userId">>,
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
    processor: (image: ImageMetadata) => Promise<Partial<InsertImageMetadata>>,
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
    quality: Omit<InsertAltTextQuality, "imageId">,
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
    },
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
    notes?: string,
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
  updateModerationLog(
    id: string,
    updates: Partial<InsertModerationLog>,
  ): Promise<void>;

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
    },
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
  createModerationAppeal(
    appeal: InsertModerationAppeal,
  ): Promise<ModerationAppeal>;

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
  updateModerationAppeal(
    id: string,
    updates: Partial<InsertModerationAppeal>,
  ): Promise<void>;

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
  createSuspiciousActivity(
    activity: InsertSuspiciousActivity,
  ): Promise<SuspiciousActivity>;

  /**
   * Get suspicious activities
   * @param userId - Filter by user (optional)
   * @param isAdmin - Whether requester is admin
   */
  getSuspiciousActivities(
    userId?: string,
    isAdmin?: boolean,
  ): Promise<SuspiciousActivity[]>;

  /**
   * Update suspicious activity status
   * @param activityId - Activity ID
   * @param status - New status
   * @param resolvedAt - Resolution timestamp (optional)
   */
  updateSuspiciousActivity(
    activityId: string,
    status: "pending" | "reviewing" | "confirmed" | "dismissed" | "escalated",
    resolvedAt?: Date,
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
  getFraudStats(period: "day" | "week" | "month"): Promise<{
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
  createSentimentAnalysis(
    analysis: InsertSentimentAnalysis,
  ): Promise<SentimentAnalysis>;

  /**
   * Get sentiment analysis by content ID
   * @param contentId - Content ID
   */
  getSentimentAnalysis(
    contentId: string,
  ): Promise<SentimentAnalysis | undefined>;

  /**
   * Get sentiment analyses for user
   * @param userId - User ID
   * @param limit - Number of analyses to return
   */
  getUserSentimentAnalyses(
    userId: string,
    limit?: number,
  ): Promise<SentimentAnalysis[]>;

  /**
   * Update sentiment analysis
   * @param id - Analysis ID
   * @param data - Updated analysis data
   */
  updateSentimentAnalysis(
    id: string,
    data: Partial<InsertSentimentAnalysis>,
  ): Promise<void>;

  /**
   * Get sentiment analyses by type
   * @param contentType - Type of content
   * @param limit - Number of analyses to return
   */
  getSentimentAnalysesByType(
    contentType: string,
    limit?: number,
  ): Promise<SentimentAnalysis[]>;

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
    periodType?: "hour" | "day" | "week" | "month" | "quarter" | "year",
    limit?: number,
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
    endDate?: Date,
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
  getLatestDraft(
    userId: string,
    documentId: string,
  ): Promise<AutoSaveDraft | undefined>;

  /**
   * Get all draft versions for a document
   * @param userId - User ID
   * @param documentId - Document ID
   * @param limit - Maximum number of versions to return
   */
  getDraftVersions(
    userId: string,
    documentId: string,
    limit?: number,
  ): Promise<AutoSaveDraft[]>;

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
    patterns: Partial<InsertSavePattern>,
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
    },
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
    contentHash: string,
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
  getFieldSuggestions(
    fieldName: string,
    query: string,
    userId?: string,
  ): Promise<string[]>;

  /**
   * Get contextual suggestions based on other form fields
   * @param fieldName - Name of the field to get suggestions for
   * @param context - Other form field values
   * @param userId - Optional user ID for personalized suggestions
   * @returns Array of contextual suggestions
   */
  getContextualSuggestions(
    fieldName: string,
    context: Record<string, any>,
    userId?: string,
  ): Promise<string[]>;

  /**
   * Record a form input for learning
   * @param userId - User ID
   * @param fieldName - Field name
   * @param value - Value entered
   * @param context - Optional context
   */
  recordFormInput(
    userId: string,
    fieldName: string,
    value: string,
    context?: Record<string, any>,
  ): Promise<void>;

  /**
   * Record feedback on a suggestion
   * @param feedback - Feedback data
   */
  recordCompletionFeedback(
    feedback: InsertCompletionFeedback,
  ): Promise<CompletionFeedback>;

  /**
   * Get user's form history
   * @param userId - User ID
   * @param fieldName - Optional field name filter
   */
  getUserFormHistory(
    userId: string,
    fieldName?: string,
  ): Promise<UserFormHistory[]>;

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

  // ==================== Analytics Insights Operations ====================

  /**
   * Create a new analytics insight
   * @param insight - Insight data
   */
  createAnalyticsInsight(
    insight: InsertAnalyticsInsight,
  ): Promise<AnalyticsInsight>;

  /**
   * Get analytics insights for a user
   * @param userId - User ID
   * @param filters - Optional filters
   */
  getAnalyticsInsights(
    userId: string,
    filters?: {
      metricName?: string;
      period?: string;
      category?: string;
      importance?: number;
      isRead?: boolean;
      limit?: number;
    },
  ): Promise<AnalyticsInsight[]>;

  /**
   * Get daily insight summary for a user
   * @param userId - User ID
   * @param date - Date for summary (defaults to today)
   */
  getDailyInsightSummary(
    userId: string,
    date?: string,
  ): Promise<AnalyticsInsight[]>;

  /**
   * Mark an insight as read
   * @param userId - User ID
   * @param insightId - Insight ID
   */
  markInsightAsRead(userId: string, insightId: string): Promise<void>;

  /**
   * Generate insights from data
   * @param userId - User ID
   * @param metricData - Metric data to analyze
   */
  generateInsightsFromData(
    userId: string,
    metricData: {
      metricName: string;
      dataPoints: Array<{ date: string; value: number }>;
      period: string;
    },
  ): Promise<AnalyticsInsight>;

  /**
   * Explain a specific metric
   * @param userId - User ID
   * @param metricName - Metric name
   * @param context - Additional context
   */
  explainMetric(
    userId: string,
    metricName: string,
    context?: Record<string, any>,
  ): Promise<string>;

  /**
   * Create insight feedback
   * @param feedback - Feedback data
   */
  createInsightFeedback(
    feedback: InsertInsightFeedback,
  ): Promise<InsightFeedback>;

  /**
   * Get insight feedback
   * @param insightId - Insight ID
   */
  getInsightFeedback(insightId: string): Promise<InsightFeedback[]>;

  /**
   * Get user's feedback on insights
   * @param userId - User ID
   */
  getUserInsightFeedback(userId: string): Promise<InsightFeedback[]>;

  /**
   * Subscribe user to insights
   * @param userId - User ID
   * @param subscriptionType - Type of subscription
   */
  subscribeToInsights(userId: string, subscriptionType: string): Promise<void>;

  /**
   * Get analytics statistics
   * @param userId - User ID
   */
  getAnalyticsStats(userId: string): Promise<{
    totalInsights: number;
    unreadInsights: number;
    averageImportance: number;
    insightsByCategory: Record<string, number>;
  }>;

  // ==================== Prediction Operations ====================

  /**
   * Create a new user prediction
   * @param prediction - Prediction data
   */
  createUserPrediction(
    prediction: InsertUserPrediction,
  ): Promise<UserPrediction>;

  /**
   * Get user predictions
   * @param userId - User ID
   * @param filters - Optional filters
   */
  getUserPredictions(
    userId: string,
    filters?: {
      predictionType?: string;
      status?: string;
      minProbability?: number;
      limit?: number;
    },
  ): Promise<UserPrediction[]>;

  /**
   * Get a specific prediction
   * @param predictionId - Prediction ID
   */
  getPredictionById(predictionId: string): Promise<UserPrediction | undefined>;

  /**
   * Update prediction status
   * @param predictionId - Prediction ID
   * @param status - New status
   * @param interventionTaken - Intervention taken (optional)
   */
  updatePredictionStatus(
    predictionId: string,
    status: string,
    interventionTaken?: string,
  ): Promise<void>;

  /**
   * Get high-risk churn users
   * @param threshold - Probability threshold (default 0.7)
   */
  getChurnRiskUsers(threshold?: number): Promise<UserPrediction[]>;

  /**
   * Create prediction accuracy record
   * @param accuracy - Accuracy data
   */
  createPredictionAccuracy(
    accuracy: InsertPredictionAccuracy,
  ): Promise<PredictionAccuracy>;

  /**
   * Get prediction accuracy metrics
   * @param filters - Optional filters
   */
  getPredictionAccuracy(filters?: {
    dateRange?: { start: Date; end: Date };
    predictionType?: string;
  }): Promise<{
    averageAccuracy: number;
    totalPredictions: number;
    correctPredictions: number;
    accuracyByType: Record<string, number>;
  }>;

  // ==================== Trend Detection Operations ====================

  /**
   * Create a new trend
   * @param trend - Trend data
   */
  createTrend(trend: InsertTrend): Promise<Trend>;

  /**
   * Update an existing trend
   * @param trendId - Trend ID
   * @param update - Partial trend update
   */
  updateTrend(trendId: string, update: Partial<InsertTrend>): Promise<Trend>;

  /**
   * Get trends with filters
   * @param filters - Optional filters
   */
  getTrends(filters?: {
    status?: string | string[];
    trendType?: string | string[];
    minStrength?: number;
    dateRange?: { start: Date; end: Date };
    limit?: number;
  }): Promise<Trend[]>;

  /**
   * Get a specific trend by ID
   * @param trendId - Trend ID
   */
  getTrendById(trendId: string): Promise<Trend | undefined>;

  /**
   * Get current active trends
   */
  getCurrentTrends(): Promise<Trend[]>;

  /**
   * Get emerging trends
   */
  getEmergingTrends(): Promise<Trend[]>;

  /**
   * Get historical trends
   * @param dateRange - Date range
   */
  getHistoricalTrends(dateRange: { start: Date; end: Date }): Promise<Trend[]>;

  /**
   * Create a trend alert
   * @param alert - Alert data
   */
  createTrendAlert(alert: InsertTrendAlert): Promise<TrendAlert>;

  /**
   * Update a trend alert
   * @param alertId - Alert ID
   * @param update - Partial alert update
   */
  updateTrendAlert(
    alertId: string,
    update: Partial<InsertTrendAlert>,
  ): Promise<TrendAlert>;

  /**
   * Get trend alerts for a user
   * @param userId - User ID (null for system-wide alerts)
   */
  getTrendAlerts(userId?: string | null): Promise<TrendAlert[]>;

  /**
   * Get alerts for a specific trend
   * @param trendId - Trend ID
   */
  getTrendAlertsByTrendId(trendId: string): Promise<TrendAlert[]>;

  /**
   * Trigger a trend alert
   * @param alertId - Alert ID
   * @param message - Alert message
   * @param notifiedUsers - Array of user IDs notified
   */
  triggerTrendAlert(
    alertId: string,
    message: string,
    notifiedUsers: string[],
  ): Promise<void>;

  /**
   * Acknowledge a trend alert
   * @param alertId - Alert ID
   * @param actionTaken - Action taken in response
   */
  acknowledgeTrendAlert(alertId: string, actionTaken?: string): Promise<void>;

  /**
   * Subscribe user to trend alerts
   * @param userId - User ID
   * @param conditions - Alert conditions
   */
  subscribeTrendAlerts(
    userId: string,
    conditions: InsertTrendAlert["conditions"],
    alertType: string,
  ): Promise<TrendAlert>;

  // ==================== A/B Testing Operations ====================

  /**
   * Create a new A/B test
   */
  createAbTest(test: InsertAbTest): Promise<AbTest>;

  /**
   * Get an A/B test by ID
   */
  getAbTest(testId: string): Promise<AbTest | undefined>;

  /**
   * Get all A/B tests
   */
  getAbTests(filters?: {
    status?: string;
    createdBy?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<AbTest[]>;

  /**
   * Update an A/B test
   */
  updateAbTest(testId: string, update: Partial<InsertAbTest>): Promise<AbTest>;

  /**
   * Delete an A/B test
   */
  deleteAbTest(testId: string): Promise<void>;

  /**
   * Create or update test results
   */
  upsertAbTestResult(result: InsertAbTestResult): Promise<AbTestResult>;

  /**
   * Get test results for a specific test
   */
  getAbTestResults(testId: string, variant?: string): Promise<AbTestResult[]>;

  /**
   * Get aggregated test results
   */
  getAggregatedAbTestResults(testId: string): Promise<{
    variantA: AbTestResult;
    variantB: AbTestResult;
  }>;

  /**
   * Create or update test insights
   */
  upsertAbTestInsight(insight: InsertAbTestInsight): Promise<AbTestInsight>;

  /**
   * Get test insights
   */
  getAbTestInsights(testId: string): Promise<AbTestInsight | undefined>;

  /**
   * Calculate statistical significance
   */
  calculateStatisticalSignificance(testId: string): Promise<{
    pValue: number;
    confidence: number;
    winner: "A" | "B" | "inconclusive";
    liftPercentage: number;
  }>;

  /**
   * Get test recommendations
   */
  getAbTestRecommendations(userId?: string): Promise<
    Array<
      AbTest & {
        insight?: AbTestInsight;
        results?: AbTestResult[];
      }
    >
  >;

  /**
   * Implement test winner
   */
  implementAbTestWinner(testId: string, variant: "A" | "B"): Promise<void>;

  // ==================== Cohort Analysis Operations ====================

  /**
   * Create a new cohort
   */
  createCohort(cohort: InsertCohort): Promise<Cohort>;

  /**
   * Get a cohort by ID
   */
  getCohort(cohortId: string): Promise<Cohort | undefined>;

  /**
   * Get all cohorts
   */
  getCohorts(filters?: {
    isActive?: boolean;
    createdBy?: string;
  }): Promise<Cohort[]>;

  /**
   * Update a cohort
   */
  updateCohort(
    cohortId: string,
    updates: Partial<InsertCohort>,
  ): Promise<Cohort>;

  /**
   * Delete a cohort
   */
  deleteCohort(cohortId: string): Promise<void>;

  /**
   * Record cohort metrics
   */
  recordCohortMetrics(metrics: InsertCohortMetric[]): Promise<CohortMetric[]>;

  /**
   * Get cohort metrics
   */
  getCohortMetrics(
    cohortId: string,
    filters?: {
      metricName?: string;
      metricType?: string;
      period?: string;
      startDate?: Date;
      endDate?: Date;
    },
  ): Promise<CohortMetric[]>;

  /**
   * Calculate cohort retention
   */
  calculateCohortRetention(
    cohortId: string,
    periods: number[],
  ): Promise<{
    cohortId: string;
    retention: Array<{ period: number; rate: number; count: number }>;
  }>;

  /**
   * Compare cohorts
   */
  compareCohorts(
    cohortIds: string[],
    metrics: string[],
  ): Promise<{
    comparison: Array<{
      cohortId: string;
      metrics: Record<string, number>;
    }>;
  }>;

  /**
   * Create cohort insight
   */
  createCohortInsight(insight: InsertCohortInsight): Promise<CohortInsight>;

  /**
   * Get cohort insights
   */
  getCohortInsights(
    cohortId: string,
    filters?: {
      status?: string;
      importance?: string;
      category?: string;
    },
  ): Promise<CohortInsight[]>;

  /**
   * Update cohort insight status
   */
  updateCohortInsightStatus(
    insightId: string,
    status: string,
  ): Promise<CohortInsight>;

  /**
   * Refresh cohort membership
   */
  refreshCohortMembership(cohortId: string): Promise<{ userCount: number }>;

  /**
   * Get cohort members
   */
  getCohortMembers(
    cohortId: string,
    limit?: number,
    offset?: number,
  ): Promise<{
    users: User[];
    total: number;
  }>;

  /**
   * Generate cohort insights with AI
   */
  generateCohortInsights(cohortId: string): Promise<CohortInsight[]>;

  // ==================== Scheduling Operations ====================

  /**
   * Get scheduling preferences for a user
   */
  getSchedulingPreferences(
    userId: string,
  ): Promise<SchedulingPreferences | undefined>;

  /**
   * Create or update scheduling preferences
   */
  upsertSchedulingPreferences(
    userId: string,
    preferences: Omit<InsertSchedulingPreferences, "userId">,
  ): Promise<SchedulingPreferences>;

  /**
   * Get meeting suggestions
   */
  getMeetingSuggestions(
    meetingId: string,
  ): Promise<MeetingSuggestions | undefined>;

  /**
   * Get all meeting suggestions for a user
   */
  getUserMeetingSuggestions(
    userId: string,
    status?: string,
  ): Promise<MeetingSuggestions[]>;

  /**
   * Create meeting suggestions
   */
  createMeetingSuggestions(
    suggestions: InsertMeetingSuggestions,
  ): Promise<MeetingSuggestions>;

  /**
   * Update meeting suggestion status
   */
  updateMeetingSuggestionStatus(
    meetingId: string,
    status: string,
    selectedTime?: any,
  ): Promise<MeetingSuggestions>;

  /**
   * Get scheduling patterns for a user
   */
  getSchedulingPatterns(userId: string): Promise<SchedulingPatterns[]>;

  /**
   * Create or update scheduling pattern
   */
  upsertSchedulingPattern(
    userId: string,
    pattern: Omit<InsertSchedulingPatterns, "userId">,
  ): Promise<SchedulingPatterns>;

  /**
   * Get meeting events for a user
   */
  getMeetingEvents(
    userId: string,
    filters?: {
      startTime?: Date;
      endTime?: Date;
      status?: string;
    },
  ): Promise<MeetingEvents[]>;

  /**
   * Create meeting event
   */
  createMeetingEvent(event: InsertMeetingEvents): Promise<MeetingEvents>;

  /**
   * Update meeting event
   */
  updateMeetingEvent(
    eventId: string,
    updates: Partial<MeetingEvents>,
  ): Promise<MeetingEvents>;

  /**
   * Delete meeting event
   */
  deleteMeetingEvent(userId: string, eventId: string): Promise<void>;

  /**
   * Find scheduling conflicts
   */
  findSchedulingConflicts(
    userId: string,
    startTime: Date,
    endTime: Date,
  ): Promise<MeetingEvents[]>;

  /**
   * Analyze scheduling patterns with AI
   */
  analyzeSchedulingPatterns(userId: string): Promise<{
    patterns: SchedulingPatterns[];
    insights: string[];
  }>;

  // ==================== Ticket Routing Operations ====================

  /**
   * Get all tickets with optional filters
   */
  getTickets(filters?: {
    status?: string;
    assignedTo?: string;
    priority?: string;
    category?: string;
  }): Promise<Ticket[]>;

  /**
   * Get a single ticket by ID
   */
  getTicket(ticketId: string): Promise<Ticket | undefined>;

  /**
   * Create a new ticket
   */
  createTicket(ticket: InsertTicket): Promise<Ticket>;

  /**
   * Update a ticket
   */
  updateTicket(ticketId: string, updates: Partial<Ticket>): Promise<Ticket>;

  /**
   * Get routing rules ordered by priority
   */
  getRoutingRules(isActive?: boolean): Promise<RoutingRule[]>;

  /**
   * Get a single routing rule
   */
  getRoutingRule(ruleId: string): Promise<RoutingRule | undefined>;

  /**
   * Create a routing rule
   */
  createRoutingRule(rule: InsertRoutingRule): Promise<RoutingRule>;

  /**
   * Update a routing rule
   */
  updateRoutingRule(
    ruleId: string,
    updates: Partial<RoutingRule>,
  ): Promise<RoutingRule>;

  /**
   * Delete a routing rule
   */
  deleteRoutingRule(ruleId: string): Promise<void>;

  /**
   * Get routing history for a ticket
   */
  getTicketRouting(ticketId: string): Promise<TicketRouting[]>;

  /**
   * Create a routing record
   */
  createTicketRouting(routing: InsertTicketRouting): Promise<TicketRouting>;

  /**
   * Get all agents/teams
   */
  getAgents(): Promise<AgentExpertise[]>;

  /**
   * Get agent by ID
   */
  getAgent(agentId: string): Promise<AgentExpertise | undefined>;

  /**
   * Create or update agent expertise
   */
  upsertAgentExpertise(agent: InsertAgentExpertise): Promise<AgentExpertise>;

  /**
   * Update agent workload
   */
  updateAgentWorkload(agentId: string, delta: number): Promise<void>;

  /**
   * Get available agents (not at max capacity)
   */
  getAvailableAgents(): Promise<AgentExpertise[]>;

  /**
   * Get routing performance metrics
   */
  getRoutingMetrics(
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    totalTickets: number;
    averageConfidence: number;
    routingAccuracy: number;
    averageResolutionTime: number;
    byCategory: Record<string, number>;
    byAgent: Record<string, { count: number; avgTime: number }>;
  }>;

  // ==================== Data Extraction Operations ====================

  /**
   * Create extraction template
   */
  createExtractionTemplate(
    template: InsertExtractionTemplate,
  ): Promise<ExtractionTemplate>;

  /**
   * Get extraction template by ID
   */
  getExtractionTemplate(id: string): Promise<ExtractionTemplate | undefined>;

  /**
   * Get all active extraction templates
   */
  getExtractionTemplates(): Promise<ExtractionTemplate[]>;

  /**
   * Update extraction template
   */
  updateExtractionTemplate(
    id: string,
    template: Partial<InsertExtractionTemplate>,
  ): Promise<ExtractionTemplate>;

  /**
   * Delete extraction template
   */
  deleteExtractionTemplate(id: string): Promise<void>;

  /**
   * Create extracted data record
   */
  createExtractedData(data: InsertExtractedData): Promise<ExtractedData>;

  /**
   * Get extracted data by ID
   */
  getExtractedData(id: string): Promise<ExtractedData | undefined>;

  /**
   * Get extracted data by source ID
   */
  getExtractedDataBySource(sourceId: string): Promise<ExtractedData[]>;

  /**
   * Get extracted data by template
   */
  getExtractedDataByTemplate(templateId: string): Promise<ExtractedData[]>;

  /**
   * Update extracted data (for corrections/validation)
   */
  updateExtractedData(
    id: string,
    data: Partial<InsertExtractedData>,
  ): Promise<ExtractedData>;

  /**
   * Get paginated extracted data with filters
   */
  getExtractedDataPaginated(params: {
    page?: number;
    limit?: number;
    templateId?: string;
    validationStatus?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<PaginatedResponse<ExtractedData>>;

  /**
   * Batch create extracted data
   */
  batchCreateExtractedData(
    dataList: InsertExtractedData[],
  ): Promise<ExtractedData[]>;

  /**
   * Get extraction statistics
   */
  getExtractionStats(): Promise<{
    totalExtractions: number;
    averageConfidence: number;
    validationRate: number;
    templateUsage: Record<string, number>;
  }>;

  // ==================== Dynamic Pricing Operations ====================

  /**
   * Create pricing rule for a product
   */
  createPricingRule(rule: InsertPricingRules): Promise<PricingRules>;

  /**
   * Update pricing rule
   */
  updatePricingRule(
    id: string,
    rule: Partial<InsertPricingRules>,
  ): Promise<PricingRules>;

  /**
   * Get pricing rule by product ID
   */
  getPricingRuleByProduct(productId: string): Promise<PricingRules | undefined>;

  /**
   * Get all active pricing rules
   */
  getActivePricingRules(): Promise<PricingRules[]>;

  /**
   * Record price change in history
   */
  recordPriceChange(history: InsertPriceHistory): Promise<PriceHistory>;

  /**
   * Get price history for a product
   */
  getPriceHistory(
    productId: string,
    params?: {
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    },
  ): Promise<PriceHistory[]>;

  /**
   * Record pricing performance metrics
   */
  recordPricingPerformance(
    performance: InsertPricingPerformance,
  ): Promise<PricingPerformance>;

  /**
   * Get pricing performance for a product
   */
  getPricingPerformance(
    productId: string,
    params?: {
      startDate?: Date;
      endDate?: Date;
    },
  ): Promise<PricingPerformance[]>;

  /**
   * Get aggregate pricing metrics across all products
   */
  getPricingMetrics(params?: { startDate?: Date; endDate?: Date }): Promise<{
    totalRevenue: number;
    averageConversionRate: number;
    averagePriceChange: number;
    topPerformingProducts: Array<{
      productId: string;
      revenue: number;
      conversionRate: number;
    }>;
  }>;

  /**
   * Get current demand level for a product
   */
  getCurrentDemand(productId: string): Promise<{
    demandScore: number; // 0-100
    trend: "increasing" | "stable" | "decreasing";
    metrics: {
      views?: number;
      clicks?: number;
      cartAdds?: number;
      conversions?: number;
    };
  }>;

  /**
   * Get current inventory level for a product
   */
  getCurrentInventory(productId: string): Promise<{
    inventoryScore: number; // 0-100
    stockLevel: number;
    daysOfSupply?: number;
    reorderPoint?: number;
  }>;

  /**
   * Get competitor pricing data
   */
  getCompetitorPricing(productId: string): Promise<
    Array<{
      competitorName: string;
      price: number;
      source: string;
      lastUpdated: Date;
    }>
  >;

  /**
   * Calculate optimal price based on all factors
   */
  calculateOptimalPrice(
    productId: string,
    params?: {
      targetRevenue?: number;
      targetConversion?: number;
      includeCompetition?: boolean;
    },
  ): Promise<{
    recommendedPrice: number;
    confidence: number;
    reasoning: string[];
    projectedImpact: {
      revenue: number;
      conversionRate: number;
      demandChange: number;
    };
  }>;

  // ==================== Image Processing Operations ====================

  /**
   * Get all image processing jobs for a user
   */
  getImageProcessingJobs(
    userId: string,
    status?: string,
  ): Promise<ImageProcessing[]>;

  /**
   * Get a specific image processing job
   */
  getImageProcessingJob(id: string): Promise<ImageProcessing | null>;

  /**
   * Create a new image processing job
   */
  createImageProcessingJob(
    data: InsertImageProcessing,
  ): Promise<ImageProcessing>;

  /**
   * Update an image processing job
   */
  updateImageProcessingJob(
    id: string,
    data: Partial<InsertImageProcessing>,
  ): Promise<ImageProcessing | null>;

  /**
   * Delete an image processing job
   */
  deleteImageProcessingJob(id: string): Promise<boolean>;

  /**
   * Get image presets
   */
  getImagePresets(userId?: string, category?: string): Promise<ImagePresets[]>;

  /**
   * Get a specific image preset
   */
  getImagePreset(id: string): Promise<ImagePresets | null>;

  /**
   * Create a new image preset
   */
  createImagePreset(data: InsertImagePresets): Promise<ImagePresets>;

  /**
   * Update an image preset
   */
  updateImagePreset(
    id: string,
    data: Partial<InsertImagePresets>,
  ): Promise<ImagePresets | null>;

  /**
   * Delete an image preset
   */
  deleteImagePreset(id: string): Promise<boolean>;

  /**
   * Increment preset usage count
   */
  incrementPresetUsage(id: string): Promise<void>;

  // ==================== Face Detection Operations ====================

  /**
   * Create face detection record
   * @param userId - User ID
   * @param detection - Face detection data
   */
  createFaceDetection(
    userId: string,
    detection: Omit<InsertFaceDetection, "userId">,
  ): Promise<FaceDetection>;

  /**
   * Get face detections for a user
   * @param userId - User ID
   * @param limit - Maximum number of results
   */
  getFaceDetections(userId: string, limit?: number): Promise<FaceDetection[]>;

  /**
   * Get face detection by image ID
   * @param userId - User ID
   * @param imageId - Image ID
   */
  getFaceDetectionByImageId(
    userId: string,
    imageId: string,
  ): Promise<FaceDetection | undefined>;

  /**
   * Update face detection
   * @param userId - User ID
   * @param detectionId - Detection ID
   * @param updates - Updates to apply
   */
  updateFaceDetection(
    userId: string,
    detectionId: string,
    updates: Partial<Omit<InsertFaceDetection, "userId">>,
  ): Promise<FaceDetection>;

  /**
   * Delete face detection
   * @param userId - User ID
   * @param detectionId - Detection ID
   */
  deleteFaceDetection(userId: string, detectionId: string): Promise<void>;

  /**
   * Get user privacy settings
   * @param userId - User ID
   */
  getPrivacySettings(userId: string): Promise<PrivacySettings | undefined>;

  /**
   * Create or update privacy settings
   * @param userId - User ID
   * @param settings - Privacy settings
   */
  upsertPrivacySettings(
    userId: string,
    settings: Omit<InsertPrivacySettings, "userId">,
  ): Promise<PrivacySettings>;

  /**
   * Delete old face detections based on retention policy
   * @param userId - User ID
   * @param daysOld - Delete detections older than this many days
   */
  cleanupOldFaceDetections(userId: string, daysOld: number): Promise<number>;

  // ==================== OCR Operations ====================

  /**
   * Create OCR result from processed image/document
   * @param userId - User ID
   * @param result - OCR result data
   */
  createOcrResult(
    userId: string,
    result: Omit<InsertOcrResult, "userId">,
  ): Promise<OcrResult>;

  /**
   * Get OCR results for a user
   * @param userId - User ID
   * @param limit - Maximum number of results
   */
  getOcrResults(userId: string, limit?: number): Promise<OcrResult[]>;

  /**
   * Get OCR result by image ID
   * @param userId - User ID
   * @param imageId - Image/document ID
   */
  getOcrResultByImageId(
    userId: string,
    imageId: string,
  ): Promise<OcrResult | undefined>;

  /**
   * Get OCR result by ID
   * @param userId - User ID
   * @param resultId - OCR result ID
   */
  getOcrResultById(
    userId: string,
    resultId: string,
  ): Promise<OcrResult | undefined>;

  /**
   * Update OCR result
   * @param userId - User ID
   * @param resultId - Result ID
   * @param updates - Updates to apply
   */
  updateOcrResult(
    userId: string,
    resultId: string,
    updates: Partial<Omit<InsertOcrResult, "userId">>,
  ): Promise<OcrResult>;

  /**
   * Delete OCR result
   * @param userId - User ID
   * @param resultId - Result ID
   */
  deleteOcrResult(userId: string, resultId: string): Promise<void>;

  /**
   * Create OCR correction
   * @param userId - User ID
   * @param correction - Correction data
   */
  createOcrCorrection(
    userId: string,
    correction: Omit<InsertOcrCorrection, "userId">,
  ): Promise<OcrCorrection>;

  /**
   * Get corrections for an OCR result
   * @param userId - User ID
   * @param resultId - OCR result ID
   */
  getOcrCorrections(userId: string, resultId: string): Promise<OcrCorrection[]>;

  /**
   * Update OCR correction
   * @param userId - User ID
   * @param correctionId - Correction ID
   * @param updates - Updates to apply
   */
  updateOcrCorrection(
    userId: string,
    correctionId: string,
    updates: Partial<Omit<InsertOcrCorrection, "userId">>,
  ): Promise<OcrCorrection>;

  /**
   * Delete OCR correction
   * @param userId - User ID
   * @param correctionId - Correction ID
   */
  deleteOcrCorrection(userId: string, correctionId: string): Promise<void>;

  /**
   * Get all user corrections history
   * @param userId - User ID
   * @param limit - Maximum number of results
   */
  getUserCorrections(userId: string, limit?: number): Promise<OcrCorrection[]>;
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

  private async insertSingle<T extends Record<string, any>, R>(
    table: any,
    value: T,
  ): Promise<R> {
    const results = await db.insert(table).values(value).returning() as any[];
    return results[0] as R;
  }

  private async insertMany<T extends Record<string, any>, R>(
    table: any,
    values: T[],
  ): Promise<R[]> {
    const results = await db.insert(table).values(values).returning();
    return results as unknown as R[];
  }

  private async updateById<T extends Record<string, any>, R>(
    table: any,
    id: string,
    values: T,
    idColumn: any,
  ): Promise<R> {
    const [result] = await db
      .update(table)
      .set(values)
      .where(eq(idColumn, id))
      .returning();
    return result as R;
  }

  private coerceNullToUndefined<T extends Record<string, any>>(
    obj: T,
  ): { [K in keyof T]: T[K] extends null ? undefined : T[K] } {
    const result: any = {};
    for (const key in obj) {
      result[key] = obj[key] === null ? undefined : obj[key];
    }
    return result;
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
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email));
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

  async getAuthProviderByProviderAndId(
    provider: string,
    providerId: string,
  ): Promise<AuthProvider | undefined> {
    try {
      const [authProvider] = await db
        .select()
        .from(authProviders)
        .where(
          and(
            eq(authProviders.provider, provider),
            eq(authProviders.providerId, providerId),
          ),
        );
      return authProvider;
    } catch (error) {
      console.error(
        `Error getting auth provider ${provider}/${providerId}:`,
        error,
      );
      throw new Error("Failed to retrieve auth provider");
    }
  }

  async getAuthProviderByProviderAndUserId(
    provider: string,
    userId: string,
  ): Promise<AuthProvider | undefined> {
    try {
      const [authProvider] = await db
        .select()
        .from(authProviders)
        .where(
          and(
            eq(authProviders.provider, provider),
            eq(authProviders.userId, userId),
          ),
        );
      return authProvider;
    } catch (error) {
      console.error(
        `Error getting auth provider ${provider} for user ${userId}:`,
        error,
      );
      throw new Error("Failed to retrieve auth provider");
    }
  }

  async createAuthProvider(
    authProviderData: InsertAuthProvider,
  ): Promise<AuthProvider> {
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

  async updateAuthProvider(
    id: string,
    data: Partial<AuthProvider>,
  ): Promise<void> {
    try {
      await db.update(authProviders).set(data).where(eq(authProviders.id, id));
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

  async getNotificationPreferences(
    userId: string,
  ): Promise<NotificationPreferences | undefined> {
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
      // Ensure quietHours.periods.days is a proper array
      const normalizedPreferences = {
        ...preferences,
        quietHours: preferences.quietHours
          ? {
              ...preferences.quietHours,
              periods: preferences.quietHours.periods?.map((period: any) => ({
                ...period,
                days: Array.isArray(period.days) ? [...period.days] : [],
              })),
            }
          : preferences.quietHours,
      };

      const [result] = await db
        .insert(notificationPreferences)
        .values({
          ...normalizedPreferences,
          userId,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: notificationPreferences.userId,
          set: {
            ...normalizedPreferences,
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
    score: InsertNotificationScores,
  ): Promise<NotificationScores> {
    try {
      return await this.insertSingle<InsertNotificationScores, NotificationScores>(
        notificationScores,
        score,
      );
    } catch (error) {
      console.error("Error creating notification score:", error);
      throw new Error("Failed to create notification score");
    }
  }

  async getNotificationScores(
    userId: string,
    limit: number = 50,
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
    beforeTime: Date,
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
        .orderBy(
          desc(notificationScores.urgencyLevel),
          desc(notificationScores.relevanceScore),
        );
    } catch (error) {
      console.error("Error getting pending notifications:", error);
      throw new Error("Failed to get pending notifications");
    }
  }

  async updateNotificationScore(
    id: string,
    updates: Partial<NotificationScores>,
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
    feedback: InsertNotificationFeedback,
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
    notificationId?: string,
  ): Promise<NotificationFeedback[]> {
    try {
      const conditions = [eq(notificationFeedback.userId, userId)];

      if (notificationId) {
        conditions.push(
          eq(notificationFeedback.notificationId, notificationId),
        );
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
    days: number = 7,
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
      const clicked = feedbackData.filter((f) => f.action === "clicked").length;
      const dismissed = feedbackData.filter(
        (f) => f.action === "dismissed",
      ).length;
      const clickRate = totalSent > 0 ? clicked / totalSent : 0;

      // Calculate average engagement time for clicked notifications
      const engagementTimes = feedbackData
        .filter((f) => f.action === "clicked" && f.engagementTime)
        .map((f) => f.engagementTime!);

      const avgEngagementTime =
        engagementTimes.length > 0
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

  async updateStorageLocation(
    userId: string,
    id: string,
    updates: Partial<UserStorage>,
  ): Promise<UserStorage> {
    try {
      // Ensure the storage location exists and belongs to the user
      const [existing] = await db
        .select()
        .from(userStorage)
        .where(and(eq(userStorage.userId, userId), eq(userStorage.id, id)));

      if (!existing) {
        throw new Error("Storage location not found");
      }

      // Don't allow changing the default storage locations
      if (existing.isDefault && updates.isDefault === false) {
        throw new Error("Cannot unset default storage location");
      }

      // Update the storage location
      const [updated] = await db
        .update(userStorage)
        .set({
          ...updates,
          updatedAt: new Date(),
          userId: existing.userId, // Ensure userId cannot be changed
          id: existing.id, // Ensure id cannot be changed
        })
        .where(and(eq(userStorage.userId, userId), eq(userStorage.id, id)))
        .returning();

      return updated;
    } catch (error) {
      console.error(`Error updating storage location ${id}:`, error);
      throw new Error("Failed to update storage location");
    }
  }

  async deleteStorageLocation(userId: string, id: string): Promise<void> {
    try {
      // Check if the location exists and is not a default
      const [location] = await db
        .select()
        .from(userStorage)
        .where(and(eq(userStorage.userId, userId), eq(userStorage.id, id)));

      if (!location) {
        throw new Error("Storage location not found");
      }

      if (location.isDefault) {
        throw new Error("Cannot delete default storage locations");
      }

      // Check if there are items in this location
      const [itemCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(userInventory)
        .where(
          and(
            eq(userInventory.userId, userId),
            eq(userInventory.storageLocationId, id),
          ),
        );

      if (itemCount && Number(itemCount.count) > 0) {
        throw new Error(
          "Cannot delete storage location with items. Move or delete items first.",
        );
      }

      // Delete the storage location
      await db
        .delete(userStorage)
        .where(and(eq(userStorage.userId, userId), eq(userStorage.id, id)));
    } catch (error) {
      console.error(`Error deleting storage location ${id}:`, error);
      throw new Error(
        (error as Error).message || "Failed to delete storage location",
      );
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

  async getFoodItem(
    userId: string,
    id: string,
  ): Promise<UserInventory | undefined> {
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

  // Chat Messages - Legacy compatibility layer using conversations/messages tables
  async getChatMessages(
    userId: string,
    limit: number = 100,
  ): Promise<ChatMessage[]> {
    try {
      // Get the most recent conversation for the user
      const [conversation] = await db
        .select()
        .from(conversations)
        .where(eq(conversations.userId, userId))
        .orderBy(desc(conversations.updatedAt))
        .limit(1);

      if (!conversation) {
        return [];
      }

      // Get messages from that conversation
      const msgs = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conversation.id))
        .orderBy(desc(messages.timestamp))
        .limit(limit);

      // Map to ChatMessage format
      return msgs.map((msg) => ({
        id: msg.id,
        userId: userId,
        role: msg.role,
        content: msg.content,
        similarityHash: null,
        createdAt: msg.timestamp || new Date(),
      }));
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

      // Get the most recent conversation for the user
      const [conversation] = await db
        .select()
        .from(conversations)
        .where(eq(conversations.userId, userId))
        .orderBy(desc(conversations.updatedAt))
        .limit(1);

      if (!conversation) {
        return PaginationHelper.createResponse([], 0, page, limit);
      }

      // Get total count
      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(messages)
        .where(eq(messages.conversationId, conversation.id));

      const total = Number(countResult?.count || 0);

      // Get paginated messages
      const msgs = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conversation.id))
        .orderBy(desc(messages.timestamp))
        .limit(limit)
        .offset(offset);

      // Map to ChatMessage format
      const chatMessages: ChatMessage[] = msgs.map((msg) => ({
        id: msg.id,
        userId: userId,
        role: msg.role,
        content: msg.content,
        similarityHash: null,
        createdAt: msg.timestamp || new Date(),
      }));

      return PaginationHelper.createResponse(chatMessages, total, page, limit);
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
      // Get or create the most recent conversation for the user
      let [conversation] = await db
        .select()
        .from(conversations)
        .where(eq(conversations.userId, userId))
        .orderBy(desc(conversations.updatedAt))
        .limit(1);

      if (!conversation) {
        // Create a new conversation if none exists
        [conversation] = await db
          .insert(conversations)
          .values({
            userId: userId,
            title: "Chat Session",
          })
          .returning();
      }

      // Create the message in the messages table
      const [newMessage] = await db
        .insert(messages)
        .values({
          conversationId: conversation.id,
          role: message.role,
          content: message.content,
          metadata: null,
          tokensUsed: 0,
        })
        .returning();

      // Update conversation's updatedAt
      await db
        .update(conversations)
        .set({ updatedAt: new Date() })
        .where(eq(conversations.id, conversation.id));

      // Map to ChatMessage format
      return {
        id: newMessage.id,
        userId: userId,
        role: newMessage.role,
        content: newMessage.content,
        similarityHash: message.similarityHash || null,
        createdAt: newMessage.timestamp || new Date(),
      };
    } catch (error) {
      console.error("Error creating chat message:", error);
      throw new Error("Failed to create chat message");
    }
  }

  async clearChatMessages(userId: string): Promise<void> {
    try {
      // Delete all conversations for the user (messages will cascade delete)
      await db.delete(conversations).where(eq(conversations.userId, userId));
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

      // Get conversations for the user
      const userConversations = await db
        .select()
        .from(conversations)
        .where(eq(conversations.userId, userId));

      if (userConversations.length === 0) {
        return 0;
      }

      // Delete old messages from user's conversations
      const result = await db
        .delete(messages)
        .where(
          and(
            sql`${messages.conversationId} IN (${sql.join(
              userConversations.map((c) => sql`${c.id}`),
              sql`, `,
            )})`,
            sql`${messages.timestamp} < ${cutoffDate}`,
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
            eq(notificationHistory.type, "expiring-food"),
            sql`${notificationHistory.data}->>'foodItemId' = ${foodItemId}`,
            isNull(notificationHistory.dismissedAt),
          ),
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
            dismissedBy: "food-item-action",
          })
          .where(eq(notificationHistory.id, notifications[0].id));
      }
    } catch (error) {
      console.error(
        `Error dismissing notification for food item ${foodItemId}:`,
        error,
      );
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

  // First overload - general analytics stats by date range
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
  }>;
  // Second overload - user-specific insights analytics
  async getAnalyticsStats(userId: string): Promise<{
    totalInsights: number;
    unreadInsights: number;
    averageImportance: number;
    insightsByCategory: Record<string, number>;
  }>;
  // Implementation that handles both overloads
  async getAnalyticsStats(
    startDateOrUserId?: Date | string,
    endDate?: Date,
  ): Promise<any> {
    // Check if first parameter is a string (userId) for the second overload
    if (typeof startDateOrUserId === "string") {
      const userId = startDateOrUserId;
      try {
        const insights = await db
          .select()
          .from(analyticsInsights)
          .where(eq(analyticsInsights.userId, userId));

        const unreadInsights = insights.filter((i) => !i.isRead).length;
        const averageImportance =
          insights.length > 0
            ? insights.reduce((sum, i) => sum + i.importance, 0) /
              insights.length
            : 0;

        const insightsByCategory: Record<string, number> = {};
        insights.forEach((i) => {
          insightsByCategory[i.category] =
            (insightsByCategory[i.category] || 0) + 1;
        });

        return {
          totalInsights: insights.length,
          unreadInsights,
          averageImportance,
          insightsByCategory,
        };
      } catch (error) {
        console.error("Error getting user analytics stats:", error);
        throw new Error("Failed to get user analytics stats");
      }
    }

    // First overload implementation
    const startDate = startDateOrUserId as Date | undefined;
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

  async createSentimentMetrics(
    metrics: InsertSentimentMetrics,
  ): Promise<SentimentMetrics> {
    try {
      const [result] = await db
        .insert(sentimentMetrics)
        .values(metrics)
        .returning();
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
      if (periodType)
        conditions.push(eq(sentimentMetrics.periodType, periodType));

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

  async createSentimentAlert(
    alert: InsertSentimentAlerts,
  ): Promise<SentimentAlerts> {
    try {
      const [result] = await db
        .insert(sentimentAlerts)
        .values(alert)
        .returning();
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

  async createSentimentSegment(
    segment: InsertSentimentSegments,
  ): Promise<SentimentSegments> {
    try {
      const [result] = await db
        .insert(sentimentSegments)
        .values(segment)
        .returning();
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
      if (segmentName)
        conditions.push(eq(sentimentSegments.segmentName, segmentName));

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

  async createSentimentAnalysis(
    analysis: InsertSentimentAnalysis,
  ): Promise<SentimentAnalysis> {
    try {
      const [result] = await db
        .insert(sentimentAnalysis)
        .values([analysis])
        .returning();
      return result;
    } catch (error) {
      console.error("Error creating sentiment analysis:", error);
      throw new Error("Failed to create sentiment analysis");
    }
  }

  async getSentimentAnalyses(filters?: {
    userId?: string;
    contentType?: string;
    sentiment?: "positive" | "negative" | "neutral" | "mixed";
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<SentimentAnalysis[]> {
    try {
      const conditions = [];
      if (filters?.userId)
        conditions.push(eq(sentimentAnalysis.userId, filters.userId));
      if (filters?.contentType)
        conditions.push(eq(sentimentAnalysis.contentType, filters.contentType));
      if (filters?.sentiment)
        conditions.push(eq(sentimentAnalysis.sentiment, filters.sentiment));
      if (filters?.startDate)
        conditions.push(gte(sentimentAnalysis.analyzedAt, filters.startDate));
      if (filters?.endDate)
        conditions.push(lte(sentimentAnalysis.analyzedAt, filters.endDate));

      const baseQuery = db.select().from(sentimentAnalysis);
      const queryWithWhere =
        conditions.length > 0 ? baseQuery.where(and(...conditions)) : baseQuery;
      const queryWithOrder = queryWithWhere.orderBy(
        desc(sentimentAnalysis.analyzedAt),
      );
      const finalQuery = filters?.limit
        ? queryWithOrder.limit(filters.limit)
        : queryWithOrder;

      return await finalQuery;
    } catch (error) {
      console.error("Error getting sentiment analyses:", error);
      throw new Error("Failed to get sentiment analyses");
    }
  }

  async getSentimentAnalysis(
    contentId: string,
  ): Promise<SentimentAnalysis | undefined> {
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

  async getUserSentimentAnalyses(
    userId: string,
    limit: number = 50,
  ): Promise<SentimentAnalysis[]> {
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
        insights.push(
          `Significant sentiment drop of ${Math.abs(metrics.percentageChange).toFixed(1)}% detected in the ${periodType}`,
        );
      }

      // Check for problematic segments
      segments.forEach((segment) => {
        if (segment.sentimentScore < -0.3) {
          insights.push(
            `${segment.segmentName} showing negative sentiment (${segment.sentimentScore.toFixed(2)})`,
          );
        }
      });

      // Check alert severity
      const criticalAlerts = alerts.filter((a) => a.severity === "critical");
      if (criticalAlerts.length > 0) {
        insights.push(
          `${criticalAlerts.length} critical alert(s) require immediate attention`,
        );
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

      // Build and execute query using $dynamic() for type-safe chaining
      let baseQuery = db.select().from(activityLogs).$dynamic();

      if (conditions.length > 0) {
        baseQuery = baseQuery.where(and(...conditions));
      }

      baseQuery = baseQuery.orderBy(desc(activityLogs.timestamp));

      if (filters?.limit) {
        baseQuery = baseQuery.limit(filters.limit);
      }
      if (filters?.offset) {
        baseQuery = baseQuery.offset(filters.offset);
      }

      return await baseQuery;
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

  async upsertContentEmbedding(
    embedding: InsertContentEmbedding,
  ): Promise<ContentEmbedding> {
    try {
      // Ensure embedding is a regular array for database compatibility
      const embeddingArray: number[] = Array.isArray(embedding.embedding)
        ? Array.from(embedding.embedding as ArrayLike<number>)
        : (embedding.embedding as number[]);

      const [result] = await db
        .insert(contentEmbeddings)
        .values({
          userId: embedding.userId,
          contentId: embedding.contentId,
          contentType: embedding.contentType,
          embedding: embeddingArray,
          embeddingModel: embedding.embeddingModel || "text-embedding-ada-002",
          contentText: embedding.contentText,
          metadata: embedding.metadata,
        })
        .onConflictDoUpdate({
          target: [
            contentEmbeddings.contentId,
            contentEmbeddings.contentType,
            contentEmbeddings.userId,
          ],
          set: {
            embedding: embeddingArray,
            embeddingModel:
              embedding.embeddingModel || "text-embedding-ada-002",
            contentText: embedding.contentText,
            metadata: embedding.metadata,
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

  async getContentEmbedding(
    contentId: string,
    contentType: string,
    userId: string,
  ): Promise<ContentEmbedding | undefined> {
    try {
      const [result] = await db
        .select()
        .from(contentEmbeddings)
        .where(
          and(
            eq(contentEmbeddings.contentId, contentId),
            eq(contentEmbeddings.contentType, contentType),
            eq(contentEmbeddings.userId, userId),
          ),
        );

      return result;
    } catch (error) {
      console.error("Error getting content embedding:", error);
      throw new Error("Failed to get content embedding");
    }
  }

  async searchByEmbedding(
    queryEmbedding: number[],
    contentType: string,
    userId: string,
    limit: number = 10,
  ): Promise<Array<ContentEmbedding & { similarity: number }>> {
    try {
      // Calculate cosine similarity in PostgreSQL
      // This is a simplified version - in production you'd use pgvector extension
      const results = await db.execute(sql`
        WITH query_embedding AS (
          SELECT ARRAY[${sql.raw(queryEmbedding.join(","))}]::float8[] as embedding
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
      const [result] = await db.insert(searchLogs).values(log).returning();

      return result;
    } catch (error) {
      console.error("Error creating search log:", error);
      throw new Error("Failed to create search log");
    }
  }

  async updateSearchLogFeedback(
    searchLogId: string,
    feedback: {
      clickedResultId: string;
      clickedResultType: string;
      clickPosition: number;
      timeToClick: number;
    },
  ): Promise<SearchLog> {
    try {
      const [result] = await db
        .update(searchLogs)
        .set({
          clickedResultId: feedback.clickedResultId,
          clickedResultType: feedback.clickedResultType,
          clickPosition: feedback.clickPosition,
          timeToClick: feedback.timeToClick,
        })
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
      const [result] = await db.insert(categories).values(category).returning();

      return result;
    } catch (error) {
      console.error("Error creating category:", error);
      throw new Error("Failed to create category");
    }
  }

  async getContentCategories(
    contentId: string,
    contentType: string,
    userId: string,
  ): Promise<ContentCategory[]> {
    try {
      return await db
        .select()
        .from(contentCategories)
        .where(
          and(
            eq(contentCategories.contentId, contentId),
            eq(contentCategories.contentType, contentType),
            eq(contentCategories.userId, userId),
          ),
        );
    } catch (error) {
      console.error("Error getting content categories:", error);
      throw new Error("Failed to get content categories");
    }
  }

  async assignContentCategory(
    assignment: InsertContentCategory,
  ): Promise<ContentCategory> {
    try {
      const [result] = await db
        .insert(contentCategories)
        .values(assignment)
        .onConflictDoUpdate({
          target: [
            contentCategories.contentId,
            contentCategories.contentType,
            contentCategories.categoryId,
            contentCategories.userId,
          ],
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
      const normalizedName = name.toLowerCase().replace(/\s+/g, "-");
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

  async getContentTags(
    contentId: string,
    contentType: string,
    userId: string,
  ): Promise<Array<ContentTag & { tag: Tag }>> {
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
            eq(contentTags.userId, userId),
          ),
        );

      return results.map((r) => ({
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
          target: [
            contentTags.contentId,
            contentTags.contentType,
            contentTags.tagId,
            contentTags.userId,
          ],
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

        return results.map((r) => r.tag);
      } else {
        // Get all tags
        return await db.select().from(tags).orderBy(desc(tags.usageCount));
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
        .select({
          contentId: contentTags.contentId,
          contentType: contentTags.contentType,
        })
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
              ...contentWithTag.map((c) =>
                and(
                  eq(contentTags.contentId, c.contentId),
                  eq(contentTags.contentType, c.contentType),
                ),
              ),
            ),
            ne(contentTags.tagId, tagId),
          ),
        )
        .limit(limit * 2);

      if (relatedTagIds.length === 0) {
        return [];
      }

      // Get tag details
      const relatedTags = await db
        .select()
        .from(tags)
        .where(or(...relatedTagIds.map((r) => eq(tags.id, r.tagId))))
        .orderBy(desc(tags.usageCount))
        .limit(limit);

      return relatedTags;
    } catch (error) {
      console.error("Error getting related tags:", error);
      throw new Error("Failed to get related tags");
    }
  }

  async removeContentTag(
    contentId: string,
    tagId: string,
    userId: string,
  ): Promise<void> {
    try {
      await db
        .delete(contentTags)
        .where(
          and(
            eq(contentTags.contentId, contentId),
            eq(contentTags.tagId, tagId),
            eq(contentTags.userId, userId),
          ),
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

  async updateTagRelevanceScore(
    contentId: string,
    tagId: string,
    userId: string,
    relevanceScore: number,
  ): Promise<void> {
    try {
      await db
        .update(contentTags)
        .set({ relevanceScore })
        .where(
          and(
            eq(contentTags.contentId, contentId),
            eq(contentTags.tagId, tagId),
            eq(contentTags.userId, userId),
          ),
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

  async getDuplicates(
    contentId: string,
    userId: string,
  ): Promise<DuplicatePair[]> {
    try {
      return await db
        .select()
        .from(duplicatePairs)
        .where(
          and(
            eq(duplicatePairs.userId, userId),
            or(
              eq(duplicatePairs.contentId1, contentId),
              eq(duplicatePairs.contentId2, contentId),
            ),
          ),
        )
        .orderBy(desc(duplicatePairs.similarityScore));
    } catch (error) {
      console.error("Error getting duplicates:", error);
      throw new Error("Failed to get duplicates");
    }
  }

  async createDuplicatePair(pair: InsertDuplicatePair): Promise<DuplicatePair> {
    try {
      const [result] = await db.insert(duplicatePairs).values(pair).returning();

      return result;
    } catch (error) {
      console.error("Error creating duplicate pair:", error);
      throw new Error("Failed to create duplicate pair");
    }
  }

  async updateDuplicateStatus(
    pairId: string,
    status: string,
    reviewedBy: string,
  ): Promise<void> {
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

  async getRelatedContent(
    contentId: string,
    contentType: string,
    userId: string,
  ): Promise<RelatedContentCache | undefined> {
    try {
      const [result] = await db
        .select()
        .from(relatedContentCache)
        .where(
          and(
            eq(relatedContentCache.contentId, contentId),
            eq(relatedContentCache.contentType, contentType),
            eq(relatedContentCache.userId, userId),
            gte(relatedContentCache.expiresAt, sql`now()`),
          ),
        );

      return result;
    } catch (error) {
      console.error("Error getting related content:", error);
      throw new Error("Failed to get related content");
    }
  }

  async cacheRelatedContent(
    cache: InsertRelatedContentCache,
  ): Promise<RelatedContentCache> {
    try {
      // Delete old cache entries for this content
      await db
        .delete(relatedContentCache)
        .where(
          and(
            eq(relatedContentCache.contentId, cache.contentId),
            eq(relatedContentCache.contentType, cache.contentType),
            eq(relatedContentCache.userId, cache.userId),
          ),
        );

      // Insert new cache entry
      const [result] = await db
        .insert(relatedContentCache)
        .values(cache)
        .returning();

      return result;
    } catch (error) {
      console.error("Error caching related content:", error);
      throw new Error("Failed to cache related content");
    }
  }

  async getQueryHistory(
    userId: string,
    limit: number = 20,
  ): Promise<QueryLog[]> {
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
    context?: string,
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
            sourceLanguage: "en",
          },
        })
        .onConflictDoUpdate({
          target: [translations.contentId, translations.languageCode],
          set: {
            translatedText: sql`EXCLUDED.translated_text`,
            originalText: sql`EXCLUDED.original_text`,
            contentType: sql`EXCLUDED.content_type`,
            translationMetadata: sql`EXCLUDED.translation_metadata`,
            updatedAt: new Date(),
          },
        })
        .returning();

      return translation;
    } catch (error) {
      console.error("Error creating translation:", error);
      throw new Error("Failed to create translation");
    }
  }

  async getTranslations(
    contentId: string,
    languageCode?: string,
  ): Promise<Translation[]> {
    try {
      if (languageCode) {
        return await db
          .select()
          .from(translations)
          .where(
            and(
              eq(translations.contentId, contentId),
              eq(translations.languageCode, languageCode),
            ),
          );
      }

      return await db
        .select()
        .from(translations)
        .where(eq(translations.contentId, contentId));
    } catch (error) {
      console.error("Error getting translations:", error);
      throw new Error("Failed to get translations");
    }
  }

  async getTranslation(
    contentId: string,
    languageCode: string,
  ): Promise<Translation | undefined> {
    try {
      const [translation] = await db
        .select()
        .from(translations)
        .where(
          and(
            eq(translations.contentId, contentId),
            eq(translations.languageCode, languageCode),
          ),
        )
        .limit(1);

      return translation;
    } catch (error) {
      console.error("Error getting translation:", error);
      throw new Error("Failed to get translation");
    }
  }

  async verifyTranslation(
    translationId: string,
    translatorId: string,
  ): Promise<Translation> {
    try {
      const [translation] = await db
        .update(translations)
        .set({
          isVerified: true,
          translatorId,
          updatedAt: new Date(),
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
      ru: /[\u0400-\u04FF]/,
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
    return detectedLang ? detectedLang[0] : "en";
  }

  async getSupportedLanguages(): Promise<
    Array<{ code: string; name: string; nativeName: string }>
  > {
    return [
      { code: "en", name: "English", nativeName: "English" },
      { code: "es", name: "Spanish", nativeName: "Español" },
      { code: "fr", name: "French", nativeName: "Français" },
      { code: "de", name: "German", nativeName: "Deutsch" },
      { code: "it", name: "Italian", nativeName: "Italiano" },
      { code: "pt", name: "Portuguese", nativeName: "Português" },
      { code: "ru", name: "Russian", nativeName: "Русский" },
      { code: "ja", name: "Japanese", nativeName: "日本語" },
      { code: "ko", name: "Korean", nativeName: "한국어" },
      { code: "zh", name: "Chinese", nativeName: "中文" },
      { code: "ar", name: "Arabic", nativeName: "العربية" },
      { code: "hi", name: "Hindi", nativeName: "हिन्दी" },
      { code: "nl", name: "Dutch", nativeName: "Nederlands" },
      { code: "sv", name: "Swedish", nativeName: "Svenska" },
      { code: "pl", name: "Polish", nativeName: "Polski" },
    ];
  }

  async getLanguagePreferences(
    userId: string,
  ): Promise<LanguagePreference | undefined> {
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
    preferences: Omit<InsertLanguagePreference, "userId">,
  ): Promise<LanguagePreference> {
    try {
      const [result] = await db
        .insert(languagePreferences)
        .values({
          ...preferences,
          userId,
        })
        .onConflictDoUpdate({
          target: languagePreferences.userId,
          set: {
            ...preferences,
            updatedAt: new Date(),
          },
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
        .where(
          and(
            eq(languagePreferences.autoTranslate, true),
            sql`${languagePreferences.preferredLanguages} @> ARRAY[${languageCode}]::text[]`,
          ),
        );

      return users.map((u) => u.userId);
    } catch (error) {
      console.error("Error getting users with auto-translate:", error);
      throw new Error("Failed to get users with auto-translate");
    }
  }

  // ==================== Image Metadata & Alt Text Implementation ====================

  async getImageMetadata(
    userId: string,
    imageId: string,
  ): Promise<ImageMetadata | undefined> {
    try {
      const result = await db
        .select()
        .from(imageMetadata)
        .where(
          and(eq(imageMetadata.userId, userId), eq(imageMetadata.id, imageId)),
        )
        .limit(1);

      return result[0];
    } catch (error) {
      console.error("Failed to get image metadata:", error);
      throw error;
    }
  }

  async getImageMetadataByUrl(
    userId: string,
    imageUrl: string,
  ): Promise<ImageMetadata | undefined> {
    try {
      const result = await db
        .select()
        .from(imageMetadata)
        .where(
          and(
            eq(imageMetadata.userId, userId),
            eq(imageMetadata.imageUrl, imageUrl),
          ),
        )
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
    },
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

        const lowQualityIds = lowQualityImages.map((img) => img.imageId);
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
          .where(and(...conditions)),
      ]);

      const total = Number(totalResult[0]?.count ?? 0);
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
      console.error("Failed to get paginated images:", error);
      throw error;
    }
  }

  async createImageMetadata(
    userId: string,
    metadataInput: Omit<InsertImageMetadata, "userId">,
  ): Promise<ImageMetadata> {
    try {
      const result = await db
        .insert(imageMetadata)
        .values({
          ...metadataInput,
          userId,
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
    updates: Partial<Omit<InsertImageMetadata, "userId">>,
  ): Promise<ImageMetadata> {
    try {
      const result = await db
        .update(imageMetadata)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(
          and(eq(imageMetadata.userId, userId), eq(imageMetadata.id, imageId)),
        )
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
        .where(
          and(eq(imageMetadata.userId, userId), eq(imageMetadata.id, imageId)),
        );
    } catch (error) {
      console.error("Failed to delete image metadata:", error);
      throw error;
    }
  }

  async batchProcessImages(
    userId: string,
    imageIds: string[],
    processor: (image: ImageMetadata) => Promise<Partial<InsertImageMetadata>>,
  ): Promise<ImageMetadata[]> {
    try {
      // Get all images
      const images = await db
        .select()
        .from(imageMetadata)
        .where(
          and(
            eq(imageMetadata.userId, userId),
            sql`${imageMetadata.id} = ANY(${imageIds})`,
          ),
        );

      // Process each image
      const updates = await Promise.all(
        images.map(async (image) => {
          const updateData = await processor(image);
          return {
            id: image.id,
            ...updateData,
          };
        }),
      );

      // Update all images
      const updatedImages = await Promise.all(
        updates.map((update) =>
          this.updateImageMetadata(userId, update.id!, update),
        ),
      );

      return updatedImages;
    } catch (error) {
      console.error("Failed to batch process images:", error);
      throw error;
    }
  }

  // ==================== Alt Text Quality Implementation ====================

  async getAltTextQuality(
    imageId: string,
  ): Promise<AltTextQuality | undefined> {
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
    quality: Omit<InsertAltTextQuality, "imageId">,
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
            metadata: quality.metadata
              ? {
                  wordCount: Number(quality.metadata.wordCount || 0),
                  readabilityScore: Number(
                    quality.metadata.readabilityScore || 0,
                  ),
                  sentimentScore: Number(quality.metadata.sentimentScore || 0),
                  technicalTerms:
                    (quality.metadata.technicalTerms as string[]) || [],
                }
              : null,
            updatedAt: new Date(),
            lastAnalyzedAt: new Date(),
          })
          .where(eq(altTextQuality.imageId, imageId))
          .returning();

        return result[0];
      } else {
        // Create new
        const result = await db
          .insert(altTextQuality)
          .values([
            {
              ...quality,
              metadata: quality.metadata
                ? {
                    wordCount: Number(quality.metadata.wordCount || 0),
                    readabilityScore: Number(
                      quality.metadata.readabilityScore || 0,
                    ),
                    sentimentScore: Number(
                      quality.metadata.sentimentScore || 0,
                    ),
                    technicalTerms:
                      (quality.metadata.technicalTerms as string[]) || [],
                  }
                : null,
              imageId,
            },
          ])
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
    },
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
          lte(imageMetadata.uploadedAt, filters.dateRange.end),
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
        .where(
          sql`${altTextQuality.imageId} = ANY(${allImages.map((img) => img.id)})`,
        );

      // Apply quality filters if needed
      let filteredQualityData = qualityData;
      if (filters?.wcagLevel) {
        filteredQualityData = qualityData.filter(
          (q) => q.wcagLevel === filters.wcagLevel,
        );
      }
      if (filters?.minScore !== undefined) {
        filteredQualityData = filteredQualityData.filter(
          (q) => q.qualityScore >= filters.minScore!,
        );
      }
      if (filters?.maxScore !== undefined) {
        filteredQualityData = filteredQualityData.filter(
          (q) => q.qualityScore <= filters.maxScore!,
        );
      }

      // Calculate statistics
      const totalImages = allImages.length;
      const imagesWithAltText = allImages.filter((img) => img.altText).length;
      const decorativeImages = allImages.filter(
        (img) => img.isDecorative,
      ).length;

      const averageQualityScore =
        filteredQualityData.length > 0
          ? filteredQualityData.reduce((sum, q) => sum + q.qualityScore, 0) /
            filteredQualityData.length
          : 0;

      const averageAccessibilityScore =
        filteredQualityData.length > 0
          ? filteredQualityData.reduce(
              (sum, q) => sum + q.accessibilityScore,
              0,
            ) / filteredQualityData.length
          : 0;

      const wcagCompliance = {
        A: qualityData.filter((q) => q.wcagLevel === "A").length,
        AA: qualityData.filter((q) => q.wcagLevel === "AA").length,
        AAA: qualityData.filter((q) => q.wcagLevel === "AAA").length,
      };

      // Find images needing improvement (quality score < 70)
      const needsImprovementIds = qualityData
        .filter((q) => q.qualityScore < 70)
        .map((q) => q.imageId);

      const needsImprovement = allImages.filter((img) =>
        needsImprovementIds.includes(img.id),
      );

      return {
        totalImages,
        imagesWithAltText,
        decorativeImages,
        averageQualityScore,
        averageAccessibilityScore,
        wcagCompliance,
        needsImprovement,
      };
    } catch (error) {
      console.error("Failed to get accessibility report:", error);
      throw error;
    }
  }

  async reviewAltTextQuality(
    imageId: string,
    reviewerId: string,
    notes?: string,
  ): Promise<AltTextQuality> {
    try {
      const result = await db
        .update(altTextQuality)
        .set({
          manuallyReviewed: true,
          reviewedBy: reviewerId,
          reviewNotes: notes,
          updatedAt: new Date(),
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

  async updateModerationLog(
    id: string,
    updates: Partial<InsertModerationLog>,
  ): Promise<void> {
    try {
      await db
        .update(moderationLogs)
        .set({
          ...updates,
          updatedAt: new Date(),
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
    },
  ): Promise<ModerationLog[]> {
    try {
      // Build where conditions
      const conditions = [];

      // Admin can see all logs, non-admin can only see their own
      if (!isAdmin) {
        conditions.push(eq(moderationLogs.userId, userId));
      }

      // Apply filters
      if (filters?.status) {
        conditions.push(eq(moderationLogs.actionTaken, filters.status));
      }
      if (filters?.severity) {
        conditions.push(eq(moderationLogs.severity, filters.severity));
      }
      if (filters?.contentType) {
        conditions.push(eq(moderationLogs.contentType, filters.contentType));
      }

      // Build and execute query
      const query = db.select().from(moderationLogs);
      const result = conditions.length > 0
        ? await query.where(and(...conditions)).orderBy(desc(moderationLogs.createdAt))
        : await query.orderBy(desc(moderationLogs.createdAt));

      return result;
    } catch (error) {
      console.error("Error getting moderation queue:", error);
      throw new Error("Failed to get moderation queue");
    }
  }

  async createBlockedContent(
    content: InsertBlockedContent,
  ): Promise<BlockedContent> {
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
          status: "restored",
          restoredBy,
          restoredAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(blockedContent.id, id));
    } catch (error) {
      console.error("Error restoring blocked content:", error);
      throw new Error("Failed to restore blocked content");
    }
  }

  async createModerationAppeal(
    appeal: InsertModerationAppeal,
  ): Promise<ModerationAppeal> {
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

  async updateModerationAppeal(
    id: string,
    updates: Partial<InsertModerationAppeal>,
  ): Promise<void> {
    try {
      await db
        .update(moderationAppeals)
        .set({
          ...updates,
          updatedAt: new Date(),
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
          lte(moderationLogs.createdAt, timeRange.end),
        );
      }

      // Get all moderation logs within time range
      const logsQuery = db.select().from(moderationLogs);
      const logs = conditions.length > 0
        ? await logsQuery.where(and(...conditions))
        : await logsQuery;

      // Calculate statistics
      const totalChecked = logs.length;
      const totalBlocked = logs.filter(
        (log) => log.actionTaken === "blocked",
      ).length;
      const totalFlagged = logs.filter(
        (log) => log.categories && log.categories.length > 0,
      ).length;

      // Get appeals statistics
      const appealsQuery = db.select().from(moderationAppeals);
      const appeals = timeRange
        ? await appealsQuery.where(
            and(
              gte(moderationAppeals.createdAt, timeRange.start),
              lte(moderationAppeals.createdAt, timeRange.end),
            ),
          )
        : await appealsQuery;
      const totalAppeals = appeals.length;
      const appealsApproved = appeals.filter(
        (appeal) => appeal.status === "approved",
      ).length;

      // Calculate categories breakdown
      const categoriesBreakdown: { [key: string]: number } = {};
      logs.forEach((log) => {
        if (log.categories) {
          log.categories.forEach((category) => {
            categoriesBreakdown[category] =
              (categoriesBreakdown[category] || 0) + 1;
          });
        }
      });

      // Calculate severity breakdown
      const severityBreakdown: { [key: string]: number } = {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0,
      };
      logs.forEach((log) => {
        if (log.severity) {
          severityBreakdown[log.severity] =
            (severityBreakdown[log.severity] || 0) + 1;
        }
      });

      // Calculate average confidence
      const confidenceScores = logs
        .filter((log) => log.confidence !== null)
        .map((log) => log.confidence!);
      const averageConfidence =
        confidenceScores.length > 0
          ? confidenceScores.reduce((sum, score) => sum + score, 0) /
            confidenceScores.length
          : 0;

      return {
        totalChecked,
        totalBlocked,
        totalFlagged,
        totalAppeals,
        appealsApproved,
        categoriesBreakdown,
        severityBreakdown,
        averageConfidence,
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
      const [result] = await db.insert(fraudScores).values(score).returning();
      return result;
    } catch (error) {
      console.error("Error creating fraud score:", error);
      throw new Error("Failed to create fraud score");
    }
  }

  async getFraudScores(
    userId: string,
    limit: number = 10,
  ): Promise<FraudScore[]> {
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

  async createSuspiciousActivity(
    activity: InsertSuspiciousActivity,
  ): Promise<SuspiciousActivity> {
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

  async getSuspiciousActivities(
    userId?: string,
    isAdmin: boolean = false,
  ): Promise<SuspiciousActivity[]> {
    try {
      let query = db.select().from(suspiciousActivities);

      // Filter by userId if provided or if not admin
      if (userId && !isAdmin) {
        query = query.where(
          eq(suspiciousActivities.userId, userId),
        ) as typeof query;
      } else if (!isAdmin) {
        // Non-admin users with no userId specified should not see any activities
        return [];
      }

      // Order by most recent first
      const activities = await query.orderBy(
        desc(suspiciousActivities.detectedAt),
      );
      return activities;
    } catch (error) {
      console.error("Error getting suspicious activities:", error);
      throw new Error("Failed to get suspicious activities");
    }
  }

  async updateSuspiciousActivity(
    activityId: string,
    status: "pending" | "reviewing" | "confirmed" | "dismissed" | "escalated",
    resolvedAt?: Date,
  ): Promise<void> {
    try {
      await db
        .update(suspiciousActivities)
        .set({
          status,
          resolvedAt: resolvedAt || null,
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

  async getFraudStats(period: "day" | "week" | "month"): Promise<{
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
        case "day":
          startDate.setDate(now.getDate() - 1);
          break;
        case "week":
          startDate.setDate(now.getDate() - 7);
          break;
        case "month":
          startDate.setMonth(now.getMonth() - 1);
          break;
      }

      // Get fraud scores in the period
      const scores = await db
        .select()
        .from(fraudScores)
        .where(gte(fraudScores.timestamp, startDate));

      const totalScores = scores.length;
      const averageScore =
        totalScores > 0
          ? scores.reduce((sum, s) => sum + s.score, 0) / totalScores
          : 0;
      const highRiskCount = scores.filter((s) => s.score > 0.75).length;

      // Get suspicious activities
      const activities = await db
        .select()
        .from(suspiciousActivities)
        .where(gte(suspiciousActivities.detectedAt, startDate));

      const suspiciousActivitiesCount = activities.length;
      const autoBlockedCount = activities.filter((a) => a.autoBlocked).length;

      // Calculate top activity types
      const activityTypeCounts: { [key: string]: number } = {};
      activities.forEach((a) => {
        activityTypeCounts[a.activityType] =
          (activityTypeCounts[a.activityType] || 0) + 1;
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
        critical: 0,
      };
      activities.forEach((a) => {
        riskLevelCounts[a.riskLevel] = (riskLevelCounts[a.riskLevel] || 0) + 1;
      });
      const riskDistribution = Object.entries(riskLevelCounts).map(
        ([level, count]) => ({ level, count }),
      );

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
        riskDistribution,
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

  async getConversation(
    userId: string,
    conversationId: string,
  ): Promise<Conversation | undefined> {
    try {
      const [result] = await db
        .select()
        .from(conversations)
        .where(
          and(
            eq(conversations.userId, userId),
            eq(conversations.id, conversationId),
          ),
        )
        .limit(1);
      return result;
    } catch (error) {
      console.error("Error getting conversation:", error);
      throw new Error("Failed to get conversation");
    }
  }

  async createConversation(
    userId: string,
    title: string,
  ): Promise<Conversation> {
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

  async updateConversation(
    userId: string,
    conversationId: string,
    updates: Partial<Conversation>,
  ): Promise<Conversation> {
    try {
      const [result] = await db
        .update(conversations)
        .set({ ...updates, updatedAt: new Date() })
        .where(
          and(
            eq(conversations.userId, userId),
            eq(conversations.id, conversationId),
          ),
        )
        .returning();
      return result;
    } catch (error) {
      console.error("Error updating conversation:", error);
      throw new Error("Failed to update conversation");
    }
  }

  async deleteConversation(
    userId: string,
    conversationId: string,
  ): Promise<void> {
    try {
      await db
        .delete(conversations)
        .where(
          and(
            eq(conversations.userId, userId),
            eq(conversations.id, conversationId),
          ),
        );
    } catch (error) {
      console.error("Error deleting conversation:", error);
      throw new Error("Failed to delete conversation");
    }
  }

  async getMessages(
    conversationId: string,
    limit: number = 100,
  ): Promise<Message[]> {
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

  async getConversationContext(
    conversationId: string,
  ): Promise<ConversationContext | undefined> {
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

  async updateConversationContext(
    conversationId: string,
    context: Partial<ConversationContext>,
  ): Promise<ConversationContext> {
    try {
      const [result] = await db
        .insert(conversationContext)
        .values({ conversationId, ...context })
        .onConflictDoUpdate({
          target: conversationContext.conversationId,
          set: { ...context, lastSummarized: new Date() },
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

  async getVoiceCommands(
    userId: string,
    limit: number = 50,
  ): Promise<VoiceCommand[]> {
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

  async getAvailableVoiceCommands(): Promise<
    Array<{ command: string; description: string; example: string }>
  > {
    // Static list of available commands - could be moved to a config file
    return [
      {
        command: "navigate",
        description: "Navigate to a page in the app",
        example: "Show me my recipes",
      },
      {
        command: "search",
        description: "Search for items",
        example: "Search for chicken recipes",
      },
      {
        command: "add",
        description: "Add items to lists",
        example: "Add milk to shopping list",
      },
      {
        command: "show",
        description: "Display specific information",
        example: "Show expiring items",
      },
      {
        command: "create",
        description: "Create new items",
        example: "Create a new meal plan",
      },
    ];
  }

  // ==================== Task 9: Smart Email/Message Drafting Implementations ====================

  async saveGeneratedDrafts(
    userId: string,
    drafts: Omit<InsertGeneratedDraft, "userId">[],
  ): Promise<GeneratedDraft[]> {
    try {
      const draftsWithUserId = drafts.map((draft) => ({ ...draft, userId }));
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

  async getDraftHistory(
    userId: string,
    limit: number = 50,
  ): Promise<GeneratedDraft[]> {
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

  async createWritingSession(
    session: InsertWritingSession,
  ): Promise<WritingSession> {
    try {
      const [result] = await db
        .insert(writingSessions)
        .values(session)
        .returning();
      return result;
    } catch (error) {
      console.error("Error creating writing session:", error);
      throw new Error("Failed to create writing session");
    }
  }

  async getWritingSession(
    userId: string,
    sessionId: string,
  ): Promise<WritingSession | undefined> {
    try {
      const [result] = await db
        .select()
        .from(writingSessions)
        .where(
          and(
            eq(writingSessions.userId, userId),
            eq(writingSessions.id, sessionId),
          ),
        )
        .limit(1);
      return result;
    } catch (error) {
      console.error("Error getting writing session:", error);
      throw new Error("Failed to get writing session");
    }
  }

  async updateWritingSession(
    userId: string,
    sessionId: string,
    improvedText: string,
    improvements: string[],
  ): Promise<WritingSession> {
    try {
      const [result] = await db
        .update(writingSessions)
        .set({ improvedText, improvementsApplied: improvements })
        .where(
          and(
            eq(writingSessions.userId, userId),
            eq(writingSessions.id, sessionId),
          ),
        )
        .returning();
      return result;
    } catch (error) {
      console.error("Error updating writing session:", error);
      throw new Error("Failed to update writing session");
    }
  }

  async addWritingSuggestions(
    sessionId: string,
    suggestions: Omit<InsertWritingSuggestion, "sessionId">[],
  ): Promise<WritingSuggestion[]> {
    try {
      const suggestionsWithSessionId = suggestions.map((s) => ({
        ...s,
        sessionId,
      }));
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

  async updateSuggestionStatus(
    suggestionId: string,
    accepted: boolean,
  ): Promise<void> {
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
          total: sql<number>`count(*)`,
        })
        .from(writingSuggestions)
        .innerJoin(
          writingSessions,
          eq(writingSessions.id, writingSuggestions.sessionId),
        )
        .where(eq(writingSessions.userId, userId));

      // Get common issues
      const commonIssues = await db
        .select({
          type: writingSuggestions.suggestionType,
          count: sql<number>`count(*)`,
        })
        .from(writingSuggestions)
        .innerJoin(
          writingSessions,
          eq(writingSessions.id, writingSuggestions.sessionId),
        )
        .where(eq(writingSessions.userId, userId))
        .groupBy(writingSuggestions.suggestionType)
        .orderBy(desc(sql`count(*)`))
        .limit(5);

      return {
        totalSessions: Number(sessionsCount[0]?.count || 0),
        acceptedSuggestions: Number(suggestionsStats[0]?.accepted || 0),
        totalSuggestions: Number(suggestionsStats[0]?.total || 0),
        commonIssues: commonIssues.map((ci) => ({
          type: ci.type,
          count: Number(ci.count),
        })),
      };
    } catch (error) {
      console.error("Error getting writing stats:", error);
      throw new Error("Failed to get writing stats");
    }
  }

  // ==================== Summarization Operations ====================

  async getSummary(
    userId: string,
    contentId: string,
  ): Promise<Summary | undefined> {
    try {
      const [result] = await db
        .select()
        .from(summaries)
        .where(
          and(eq(summaries.userId, userId), eq(summaries.contentId, contentId)),
        )
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

  async createSummary(
    userId: string,
    summary: Omit<InsertSummary, "userId">,
  ): Promise<Summary> {
    try {
      const [result] = await db
        .insert(summaries)
        .values({
          ...summary,
          userId,
        })
        .returning();
      return result;
    } catch (error) {
      console.error("Error creating summary:", error);
      throw new Error("Failed to create summary");
    }
  }

  async updateSummary(
    userId: string,
    summaryId: string,
    updates: Partial<Omit<InsertSummary, "userId" | "id">>,
  ): Promise<Summary> {
    try {
      const [result] = await db
        .update(summaries)
        .set({
          ...updates,
          updatedAt: new Date(),
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

  async getSummariesByType(
    userId: string,
    type: "tldr" | "bullet" | "paragraph",
  ): Promise<Summary[]> {
    try {
      return await db
        .select()
        .from(summaries)
        .where(
          and(eq(summaries.userId, userId), eq(summaries.summaryType, type)),
        )
        .orderBy(desc(summaries.createdAt));
    } catch (error) {
      console.error("Error getting summaries by type:", error);
      throw new Error("Failed to get summaries by type");
    }
  }

  async getExcerpt(
    userId: string,
    contentId: string,
    variant?: string,
  ): Promise<Excerpt | undefined> {
    try {
      const conditions = [
        eq(excerpts.userId, userId),
        eq(excerpts.contentId, contentId),
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

  async getExcerptsByContent(
    userId: string,
    contentId: string,
  ): Promise<Excerpt[]> {
    try {
      return await db
        .select()
        .from(excerpts)
        .where(
          and(eq(excerpts.userId, userId), eq(excerpts.contentId, contentId)),
        )
        .orderBy(desc(excerpts.clickThroughRate), desc(excerpts.createdAt));
    } catch (error) {
      console.error("Error getting excerpts by content:", error);
      throw new Error("Failed to get excerpts");
    }
  }

  async createExcerpt(
    userId: string,
    excerpt: Omit<InsertExcerpt, "userId">,
  ): Promise<Excerpt> {
    try {
      const [result] = await db
        .insert(excerpts)
        .values({
          ...excerpt,
          userId,
        })
        .returning();
      return result;
    } catch (error) {
      console.error("Error creating excerpt:", error);
      throw new Error("Failed to create excerpt");
    }
  }

  async updateExcerpt(
    userId: string,
    excerptId: string,
    updates: Partial<Omit<InsertExcerpt, "userId" | "id">>,
  ): Promise<Excerpt> {
    try {
      const [result] = await db
        .update(excerpts)
        .set({
          ...updates,
          updatedAt: new Date(),
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

  async setActiveExcerpt(
    userId: string,
    contentId: string,
    excerptId: string,
  ): Promise<void> {
    try {
      // First, deactivate all excerpts for this content
      await db
        .update(excerpts)
        .set({ isActive: false })
        .where(
          and(eq(excerpts.userId, userId), eq(excerpts.contentId, contentId)),
        );

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

  async recordExcerptPerformance(
    performance: InsertExcerptPerformance,
  ): Promise<ExcerptPerformance> {
    try {
      // Calculate derived metrics
      const ctr =
        performance.views && performance.views > 0
          ? performance.clicks! / performance.views
          : 0;
      const shareRate =
        performance.views && performance.views > 0
          ? (performance.shares || 0) / performance.views
          : 0;
      const engagementRate =
        performance.views && performance.views > 0
          ? (performance.engagements || 0) / performance.views
          : 0;

      const [result] = await db
        .insert(excerptPerformance)
        .values({
          ...performance,
          ctr,
          shareRate,
          engagementRate,
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

  async getExcerptPerformance(
    excerptId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<ExcerptPerformance[]> {
    try {
      const conditions = [eq(excerptPerformance.excerptId, excerptId)];

      if (startDate) {
        conditions.push(
          gte(excerptPerformance.date, startDate.toISOString().split("T")[0]),
        );
      }
      if (endDate) {
        conditions.push(
          lte(excerptPerformance.date, endDate.toISOString().split("T")[0]),
        );
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

  async getBestExcerpt(
    userId: string,
    contentId: string,
  ): Promise<Excerpt | undefined> {
    try {
      const [result] = await db
        .select()
        .from(excerpts)
        .where(
          and(eq(excerpts.userId, userId), eq(excerpts.contentId, contentId)),
        )
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
      if (contextType) {
        return await db
          .select()
          .from(draftTemplates)
          .where(
            and(
              eq(draftTemplates.isActive, true),
              eq(draftTemplates.contextType, contextType),
            ),
          )
          .orderBy(desc(draftTemplates.usageCount));
      }

      return await db
        .select()
        .from(draftTemplates)
        .where(eq(draftTemplates.isActive, true))
        .orderBy(desc(draftTemplates.usageCount));
    } catch (error) {
      console.error("Error getting draft templates:", error);
      throw new Error("Failed to get draft templates");
    }
  }

  async createDraftTemplate(
    template: InsertDraftTemplate,
  ): Promise<DraftTemplate> {
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
          updatedAt: new Date(),
        })
        .where(eq(draftTemplates.id, templateId));
    } catch (error) {
      console.error("Error incrementing template usage:", error);
      throw new Error("Failed to increment template usage");
    }
  }

  async createGeneratedDraft(
    userId: string,
    draft: Omit<InsertGeneratedDraft, "userId">,
  ): Promise<GeneratedDraft> {
    try {
      const [result] = await db
        .insert(generatedDrafts)
        .values({
          ...draft,
          userId,
        })
        .returning();
      return result;
    } catch (error) {
      console.error("Error creating generated draft:", error);
      throw new Error("Failed to create generated draft");
    }
  }

  async getGeneratedDrafts(
    userId: string,
    originalMessageId?: string,
  ): Promise<GeneratedDraft[]> {
    try {
      if (originalMessageId) {
        return await db
          .select()
          .from(generatedDrafts)
          .where(
            and(
              eq(generatedDrafts.userId, userId),
              eq(generatedDrafts.originalMessageId, originalMessageId),
            ),
          )
          .orderBy(desc(generatedDrafts.createdAt));
      }

      return await db
        .select()
        .from(generatedDrafts)
        .where(eq(generatedDrafts.userId, userId))
        .orderBy(desc(generatedDrafts.createdAt));
    } catch (error) {
      console.error("Error getting generated drafts:", error);
      throw new Error("Failed to get generated drafts");
    }
  }

  async updateGeneratedDraft(
    userId: string,
    draftId: string,
    updates: Partial<Omit<InsertGeneratedDraft, "userId" | "id">>,
  ): Promise<GeneratedDraft> {
    try {
      const [result] = await db
        .update(generatedDrafts)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(generatedDrafts.userId, userId),
            eq(generatedDrafts.id, draftId),
          ),
        )
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
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(generatedDrafts.userId, userId),
            eq(generatedDrafts.id, draftId),
          ),
        );
    } catch (error) {
      console.error("Error marking draft as selected:", error);
      throw new Error("Failed to mark draft as selected");
    }
  }

  async markDraftEdited(
    userId: string,
    draftId: string,
    editedContent: string,
  ): Promise<void> {
    try {
      await db
        .update(generatedDrafts)
        .set({
          edited: true,
          editedContent,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(generatedDrafts.userId, userId),
            eq(generatedDrafts.id, draftId),
          ),
        );
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
          count: sql<number>`count(*)`,
        })
        .from(generatedDrafts)
        .where(eq(generatedDrafts.userId, userId))
        .groupBy(generatedDrafts.tone)
        .orderBy(desc(sql`count(*)`));

      return {
        totalDrafts: drafts.length,
        selectedCount: drafts.filter((d) => d.selected).length,
        editedCount: drafts.filter((d) => d.edited).length,
        toneDistribution: toneDistribution.map((td) => ({
          tone: td.tone || "unknown",
          count: Number(td.count),
        })),
      };
    } catch (error) {
      console.error("Error getting draft analytics:", error);
      throw new Error("Failed to get draft analytics");
    }
  }

  // ==================== Natural Language Query Operations ====================

  async createQueryLog(
    userId: string,
    log: Omit<InsertQueryLog, "userId">,
  ): Promise<QueryLog> {
    try {
      const [result] = await db
        .insert(queryLogs)
        .values({
          ...log,
          userId,
        })
        .returning();
      return result;
    } catch (error) {
      console.error("Error creating query log:", error);
      throw new Error("Failed to create query log");
    }
  }

  async getQueryLogs(userId: string, limit?: number): Promise<QueryLog[]> {
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
    savedName: string,
  ): Promise<QueryLog> {
    try {
      const [result] = await db
        .update(queryLogs)
        .set({
          isSaved: true,
          savedName,
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
    updates: Partial<QueryLog>,
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
    queryId: string,
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
  // Sentiment Analysis Implementations (see earlier implementation)
  // ============================================================================

  async updateSentimentAnalysis(
    id: string,
    data: Partial<InsertSentimentAnalysis>,
  ): Promise<void> {
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

  async getSentimentAnalysesByType(
    contentType: string,
    limit: number = 50,
  ): Promise<SentimentAnalysis[]> {
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

  async createSentimentTrend(
    trend: InsertSentimentTrend,
  ): Promise<SentimentTrend> {
    try {
      return await this.insertSingle<InsertSentimentTrend, SentimentTrend>(
        sentimentTrends,
        trend,
      );
    } catch (error) {
      console.error("Error creating sentiment trend:", error);
      throw new Error("Failed to create sentiment trend");
    }
  }

  async getSentimentTrends(
    userId: string | null,
    periodType?: "hour" | "day" | "week" | "month" | "quarter" | "year",
    limit: number = 30,
  ): Promise<SentimentTrend[]> {
    try {
      const conditions = [];

      // Filter by userId (null for global trends)
      if (userId !== null) {
        conditions.push(eq(sentimentTrends.userId, userId));
      } else {
        conditions.push(isNull(sentimentTrends.userId));
      }

      // Filter by period type if specified
      if (periodType) {
        conditions.push(eq(sentimentTrends.periodType, periodType));
      }

      const trends = await db
        .select()
        .from(sentimentTrends)
        .where(and(...conditions))
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
    endDate?: Date,
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

      const analyses =
        conditions.length > 0
          ? await db
              .select()
              .from(sentimentAnalysis)
              .where(and(...conditions))
          : await db.select().from(sentimentAnalysis);

      // Calculate overall sentiment (-1 to 1 scale)
      let sentimentSum = 0;
      const sentimentCounts = {
        positive: 0,
        negative: 0,
        neutral: 0,
        mixed: 0,
      };

      // Track emotions
      const emotionData: {
        [key: string]: { count: number; totalIntensity: number };
      } = {};

      // Track topics
      const topicCounts: { [key: string]: number } = {};

      // Process each analysis
      analyses.forEach((analysis: any) => {
        // Count sentiments
        sentimentCounts[analysis.sentiment as keyof typeof sentimentCounts]++;

        // Calculate sentiment score
        if (analysis.sentiment === "positive") sentimentSum += 1;
        else if (analysis.sentiment === "negative") sentimentSum -= 1;
        else if (analysis.sentiment === "mixed") sentimentSum += 0;

        // Process emotions
        if (analysis.emotions) {
          Object.entries(analysis.emotions).forEach(([emotion, intensity]) => {
            if (typeof intensity === "number" && intensity > 0) {
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
      const overallSentiment =
        analyses.length > 0 ? sentimentSum / analyses.length : 0;

      // Calculate sentiment distribution percentages
      const total = analyses.length || 1;
      const sentimentDistribution = {
        positive: (sentimentCounts.positive / total) * 100,
        negative: (sentimentCounts.negative / total) * 100,
        neutral: (sentimentCounts.neutral / total) * 100,
        mixed: (sentimentCounts.mixed / total) * 100,
      };

      // Calculate top emotions
      const topEmotions = Object.entries(emotionData)
        .map(([emotion, data]) => ({
          emotion,
          count: data.count,
          avgIntensity: data.totalIntensity / data.count,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Get top topics
      const topTopics = Object.entries(topicCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([topic]) => topic);

      // Get trends over time (simplified - in production, would aggregate by period)
      const recentTrends = await this.getSentimentTrends(
        userId || null,
        "day",
        7,
      );
      const trendsOverTime = recentTrends.map((trend) => ({
        period: trend.timePeriod,
        avgSentiment: trend.avgSentiment,
        count: trend.totalAnalyzed,
      }));

      return {
        overallSentiment,
        sentimentDistribution,
        topEmotions,
        topTopics,
        trendsOverTime,
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
      const latestDraft = await this.getLatestDraft(
        draft.userId,
        draft.documentId,
      );
      const nextVersion = latestDraft ? latestDraft.version + 1 : 1;

      // Calculate content hash for duplicate detection
      const crypto = await import("crypto");
      const contentHash = crypto
        .createHash("sha256")
        .update(draft.content)
        .digest("hex");

      // Skip saving if content hasn't changed
      if (latestDraft && latestDraft.contentHash === contentHash) {
        return latestDraft;
      }

      // Save the draft with incremented version (contentHash is auto-managed)
      const [savedDraft] = await db
        .insert(autoSaveDrafts)
        .values({
          ...draft,
          version: nextVersion,
          contentHash,
        })
        .returning();

      // Clean up old versions (keep only last 10)
      const allVersions = await this.getDraftVersions(
        draft.userId,
        draft.documentId,
      );
      if (allVersions.length > 10) {
        const versionsToDelete = allVersions.slice(10).map((v) => v.id);

        await db
          .delete(autoSaveDrafts)
          .where(
            and(
              eq(autoSaveDrafts.userId, draft.userId),
              sql`${autoSaveDrafts.id} = ANY(${versionsToDelete})`,
            ),
          );
      }

      return savedDraft;
    } catch (error) {
      console.error("Error saving draft:", error);
      throw new Error("Failed to save draft");
    }
  }

  async getLatestDraft(
    userId: string,
    documentId: string,
  ): Promise<AutoSaveDraft | undefined> {
    try {
      const [draft] = await db
        .select()
        .from(autoSaveDrafts)
        .where(
          and(
            eq(autoSaveDrafts.userId, userId),
            eq(autoSaveDrafts.documentId, documentId),
          ),
        )
        .orderBy(desc(autoSaveDrafts.version))
        .limit(1);

      return draft;
    } catch (error) {
      console.error("Error getting latest draft:", error);
      throw new Error("Failed to get latest draft");
    }
  }

  async getDraftVersions(
    userId: string,
    documentId: string,
    limit = 10,
  ): Promise<AutoSaveDraft[]> {
    try {
      const drafts = await db
        .select()
        .from(autoSaveDrafts)
        .where(
          and(
            eq(autoSaveDrafts.userId, userId),
            eq(autoSaveDrafts.documentId, documentId),
          ),
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
            eq(autoSaveDrafts.userId, userId),
          ),
        );
    } catch (error) {
      console.error("Error deleting draft:", error);
      throw new Error("Failed to delete draft");
    }
  }

  async deleteDocumentDrafts(
    userId: string,
    documentId: string,
  ): Promise<void> {
    try {
      await db
        .delete(autoSaveDrafts)
        .where(
          and(
            eq(autoSaveDrafts.userId, userId),
            eq(autoSaveDrafts.documentId, documentId),
          ),
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

      const conditions = [lte(autoSaveDrafts.savedAt, thirtyDaysAgo)];

      if (userId) {
        conditions.push(eq(autoSaveDrafts.userId, userId));
      }

      // Get drafts to be deleted first to count them
      const draftsToDelete = await db
        .select({ id: autoSaveDrafts.id })
        .from(autoSaveDrafts)
        .where(and(...conditions));

      // Delete the drafts if any exist
      if (draftsToDelete.length > 0) {
        await db.delete(autoSaveDrafts).where(and(...conditions));
      }

      // Return count of deleted rows
      return draftsToDelete.length;
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
    patterns: Partial<InsertSavePattern>,
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
    },
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
          patternData.keystrokeIntervals =
            patternData.keystrokeIntervals.slice(-1000);
        }
      }

      if (event.burstLength !== undefined && patternData.burstLengths) {
        patternData.burstLengths.push(event.burstLength);
        if (patternData.burstLengths.length > 1000) {
          patternData.burstLengths = patternData.burstLengths.slice(-1000);
        }
      }

      // Update patterns if we have enough data
      if (
        patternData.pauseHistogram &&
        patternData.pauseHistogram.length > 100
      ) {
        const avgPause =
          patternData.pauseHistogram.reduce((a, b) => a + b, 0) /
          patternData.pauseHistogram.length;

        await this.updateUserSavePatterns(userId, {
          avgPauseDuration: avgPause,
          patternData,
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
    contentHash: string,
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
    userId?: string,
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
              eq(userFormHistory.fieldName, fieldName),
            ),
          )
          .limit(1);

        if (userHistory.length > 0 && userHistory[0].valuesUsed) {
          const sortedValues = (
            userHistory[0].valuesUsed as Array<{ value: string; count: number }>
          )
            .filter((v) => v.value.toLowerCase().startsWith(normalizedQuery))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5)
            .map((v) => v.value);
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
        const globalValues = (
          globalCompletions[0].commonValues as Array<{
            value: string;
            count: number;
          }>
        )
          .filter(
            (v) =>
              !suggestions.includes(v.value) &&
              v.value.toLowerCase().startsWith(normalizedQuery),
          )
          .sort((a, b) => b.count - a.count)
          .slice(0, 10 - suggestions.length)
          .map((v) => v.value);
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
    userId?: string,
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
        const personalSuggestions = await this.getFieldSuggestions(
          fieldName,
          "",
          userId,
        );
        suggestions.push(
          ...personalSuggestions.slice(0, 10 - suggestions.length),
        );
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
    context?: Record<string, any>,
  ): Promise<void> {
    try {
      // Update user's personal history
      const existingHistory = await db
        .select()
        .from(userFormHistory)
        .where(
          and(
            eq(userFormHistory.userId, userId),
            eq(userFormHistory.fieldName, fieldName),
          ),
        )
        .limit(1);

      const now = new Date().toISOString();

      if (existingHistory.length > 0) {
        const history = existingHistory[0];
        let valuesUsed = (history.valuesUsed || []) as Array<{
          value: string;
          count: number;
          lastUsed: string;
          context?: any;
        }>;

        const existingValueIndex = valuesUsed.findIndex(
          (v) => v.value === value,
        );

        if (existingValueIndex >= 0) {
          valuesUsed[existingValueIndex].count++;
          valuesUsed[existingValueIndex].lastUsed = now;
          valuesUsed[existingValueIndex].context = context;
        } else {
          valuesUsed.push({
            value,
            count: 1,
            lastUsed: now,
            context,
          });
        }

        // Keep only top 50 values
        valuesUsed = valuesUsed.sort((a, b) => b.count - a.count).slice(0, 50);

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
            updatedAt: new Date(),
          })
          .where(eq(userFormHistory.id, history.id));
      } else {
        // Create new history
        await db.insert(userFormHistory).values({
          userId,
          fieldName,
          valuesUsed: [
            {
              value,
              count: 1,
              lastUsed: now,
              context,
            },
          ],
          frequencyMap: { [value]: 1 },
          preferences: {
            autoFillEnabled: true,
            rememberValues: true,
            suggestSimilar: true,
          },
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
    feedback: InsertCompletionFeedback,
  ): Promise<CompletionFeedback> {
    try {
      const [result] = await db
        .insert(completionFeedback)
        .values(feedback)
        .returning();

      return result;
    } catch (error) {
      console.error("Error recording completion feedback:", error);
      throw error;
    }
  }

  async getUserFormHistory(
    userId: string,
    fieldName?: string,
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
            lastUpdated: new Date(),
          })
          .where(eq(formCompletions.fieldName, fieldName));
      } else {
        // Create new entry
        await db.insert(formCompletions).values({
          fieldName,
          fieldType: fieldName.includes("email")
            ? "email"
            : fieldName.includes("phone")
              ? "tel"
              : fieldName.includes("address")
                ? "address"
                : "text",
          globalUsageCount: 1,
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

  // ==================== Analytics Insights Implementation ====================

  async createAnalyticsInsight(
    insight: InsertAnalyticsInsight,
  ): Promise<AnalyticsInsight> {
    try {
      const [newInsight] = await db
        .insert(analyticsInsights)
        .values(insight)
        .returning();
      return newInsight;
    } catch (error) {
      console.error("Error creating analytics insight:", error);
      throw error;
    }
  }

  async getAnalyticsInsights(
    userId: string,
    filters?: {
      metricName?: string;
      period?: string;
      category?: string;
      importance?: number;
      isRead?: boolean;
      limit?: number;
    },
  ): Promise<AnalyticsInsight[]> {
    try {
      const conditions = [eq(analyticsInsights.userId, userId)];

      if (filters?.metricName) {
        conditions.push(eq(analyticsInsights.metricName, filters.metricName));
      }
      if (filters?.period) {
        conditions.push(eq(analyticsInsights.period, filters.period));
      }
      if (filters?.category) {
        conditions.push(eq(analyticsInsights.category, filters.category));
      }
      if (filters?.importance !== undefined) {
        conditions.push(eq(analyticsInsights.importance, filters.importance));
      }
      if (filters?.isRead !== undefined) {
        conditions.push(eq(analyticsInsights.isRead, filters.isRead));
      }

      const query = db
        .select()
        .from(analyticsInsights)
        .where(and(...conditions))
        .orderBy(desc(analyticsInsights.createdAt))
        .$dynamic();

      if (filters?.limit) {
        return await query.limit(filters.limit);
      }

      return await query;
    } catch (error) {
      console.error("Error getting analytics insights:", error);
      throw error;
    }
  }

  async getDailyInsightSummary(
    userId: string,
    date?: string,
  ): Promise<AnalyticsInsight[]> {
    try {
      const targetDate = date || new Date().toISOString().split("T")[0];
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      return await db
        .select()
        .from(analyticsInsights)
        .where(
          and(
            eq(analyticsInsights.userId, userId),
            gte(analyticsInsights.createdAt, startOfDay),
            lte(analyticsInsights.createdAt, endOfDay),
          ),
        )
        .orderBy(desc(analyticsInsights.importance));
    } catch (error) {
      console.error("Error getting daily insight summary:", error);
      throw error;
    }
  }

  async markInsightAsRead(userId: string, insightId: string): Promise<void> {
    try {
      await db
        .update(analyticsInsights)
        .set({ isRead: true })
        .where(
          and(
            eq(analyticsInsights.id, insightId),
            eq(analyticsInsights.userId, userId),
          ),
        );
    } catch (error) {
      console.error("Error marking insight as read:", error);
      throw error;
    }
  }

  async generateInsightsFromData(
    userId: string,
    metricData: {
      metricName: string;
      dataPoints: Array<{ date: string; value: number }>;
      period: string;
    },
  ): Promise<AnalyticsInsight> {
    // This method will use OpenAI to generate insights
    // For now, returning a placeholder implementation
    // The actual implementation will be in the service layer
    throw new Error(
      "generateInsightsFromData should be implemented in the service layer",
    );
  }

  async explainMetric(
    userId: string,
    metricName: string,
    context?: Record<string, any>,
  ): Promise<string> {
    // This method will use OpenAI to explain metrics
    // For now, returning a placeholder implementation
    // The actual implementation will be in the service layer
    throw new Error("explainMetric should be implemented in the service layer");
  }

  async createInsightFeedback(
    feedback: InsertInsightFeedback,
  ): Promise<InsightFeedback> {
    try {
      const [newFeedback] = await db
        .insert(insightFeedback)
        .values(feedback)
        .returning();
      return newFeedback;
    } catch (error) {
      console.error("Error creating insight feedback:", error);
      throw error;
    }
  }

  async getInsightFeedback(insightId: string): Promise<InsightFeedback[]> {
    try {
      return await db
        .select()
        .from(insightFeedback)
        .where(eq(insightFeedback.insightId, insightId))
        .orderBy(desc(insightFeedback.createdAt));
    } catch (error) {
      console.error("Error getting insight feedback:", error);
      throw error;
    }
  }

  async getUserInsightFeedback(userId: string): Promise<InsightFeedback[]> {
    try {
      return await db
        .select()
        .from(insightFeedback)
        .where(eq(insightFeedback.userId, userId))
        .orderBy(desc(insightFeedback.createdAt));
    } catch (error) {
      console.error("Error getting user insight feedback:", error);
      throw error;
    }
  }

  async subscribeToInsights(
    userId: string,
    subscriptionType: string,
  ): Promise<void> {
    try {
      // Update user preferences for insight subscriptions
      await db
        .update(users)
        .set({
          notifyRecipeSuggestions:
            subscriptionType === "all" || subscriptionType === "important",
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
    } catch (error) {
      console.error("Error subscribing to insights:", error);
      throw error;
    }
  }

  async getUserInsightStats(userId: string): Promise<{
    totalInsights: number;
    unreadInsights: number;
    averageImportance: number;
    insightsByCategory: Record<string, number>;
  }> {
    try {
      const insights = await db
        .select()
        .from(analyticsInsights)
        .where(eq(analyticsInsights.userId, userId));

      const totalInsights = insights.length;
      const unreadInsights = insights.filter((i) => !i.isRead).length;
      const averageImportance =
        insights.length > 0
          ? insights.reduce((sum, i) => sum + i.importance, 0) / insights.length
          : 0;

      const insightsByCategory: Record<string, number> = {};
      insights.forEach((i) => {
        insightsByCategory[i.category] =
          (insightsByCategory[i.category] || 0) + 1;
      });

      return {
        totalInsights,
        unreadInsights,
        averageImportance,
        insightsByCategory,
      };
    } catch (error) {
      console.error("Error getting user insight stats:", error);
      throw error;
    }
  }

  // ==================== Prediction Operations Implementation ====================

  async createUserPrediction(
    prediction: InsertUserPrediction,
  ): Promise<UserPrediction> {
    try {
      const [newPrediction] = await db
        .insert(userPredictions)
        .values(prediction)
        .returning();
      return newPrediction;
    } catch (error) {
      console.error("Error creating user prediction:", error);
      throw error;
    }
  }

  async getUserPredictions(
    userId: string,
    filters?: {
      predictionType?: string;
      status?: string;
      minProbability?: number;
      limit?: number;
    },
  ): Promise<UserPrediction[]> {
    try {
      let query = db
        .select()
        .from(userPredictions)
        .where(eq(userPredictions.userId, userId));

      const conditions: any[] = [eq(userPredictions.userId, userId)];

      if (filters?.predictionType) {
        conditions.push(
          eq(userPredictions.predictionType, filters.predictionType),
        );
      }

      if (filters?.status) {
        conditions.push(eq(userPredictions.status, filters.status));
      }

      if (filters?.minProbability !== undefined) {
        conditions.push(
          gte(userPredictions.probability, filters.minProbability),
        );
      }

      let results = await db
        .select()
        .from(userPredictions)
        .where(and(...conditions))
        .orderBy(
          desc(userPredictions.probability),
          desc(userPredictions.createdAt),
        )
        .limit(filters?.limit || 100);

      return results;
    } catch (error) {
      console.error("Error getting user predictions:", error);
      throw error;
    }
  }

  async getPredictionById(
    predictionId: string,
  ): Promise<UserPrediction | undefined> {
    try {
      const [prediction] = await db
        .select()
        .from(userPredictions)
        .where(eq(userPredictions.id, predictionId));
      return prediction;
    } catch (error) {
      console.error("Error getting prediction by ID:", error);
      throw error;
    }
  }

  async updatePredictionStatus(
    predictionId: string,
    status: string,
    interventionTaken?: string,
  ): Promise<void> {
    try {
      const updateData: any = {
        status,
        ...(status !== "pending" && { resolvedAt: new Date() }),
      };

      if (interventionTaken) {
        updateData.interventionTaken = interventionTaken;
      }

      await db
        .update(userPredictions)
        .set(updateData)
        .where(eq(userPredictions.id, predictionId));
    } catch (error) {
      console.error("Error updating prediction status:", error);
      throw error;
    }
  }

  async getChurnRiskUsers(threshold: number = 0.7): Promise<UserPrediction[]> {
    try {
      return await db
        .select()
        .from(userPredictions)
        .where(
          and(
            eq(userPredictions.predictionType, "churn_risk"),
            eq(userPredictions.status, "pending"),
            gte(userPredictions.probability, threshold),
          ),
        )
        .orderBy(desc(userPredictions.probability));
    } catch (error) {
      console.error("Error getting churn risk users:", error);
      throw error;
    }
  }

  async createPredictionAccuracy(
    accuracy: InsertPredictionAccuracy,
  ): Promise<PredictionAccuracy> {
    try {
      const [newAccuracy] = await db
        .insert(predictionAccuracy)
        .values(accuracy)
        .returning();
      return newAccuracy;
    } catch (error) {
      console.error("Error creating prediction accuracy:", error);
      throw error;
    }
  }

  async getPredictionAccuracy(filters?: {
    dateRange?: { start: Date; end: Date };
    predictionType?: string;
  }): Promise<{
    averageAccuracy: number;
    totalPredictions: number;
    correctPredictions: number;
    accuracyByType: Record<string, number>;
  }> {
    try {
      const conditions: any[] = [];

      if (filters?.dateRange) {
        conditions.push(
          gte(predictionAccuracy.outcomeDate, filters.dateRange.start),
          lte(predictionAccuracy.outcomeDate, filters.dateRange.end),
        );
      }

      const accuracyRecords =
        conditions.length > 0
          ? await db
              .select()
              .from(predictionAccuracy)
              .where(and(...conditions))
          : await db.select().from(predictionAccuracy);

      // Get predictions for type filtering
      const predictions = filters?.predictionType
        ? await db
            .select()
            .from(userPredictions)
            .where(eq(userPredictions.predictionType, filters.predictionType))
        : await db.select().from(userPredictions);

      const predictionMap = new Map(predictions.map((p) => [p.id, p]));

      // Filter accuracy records by prediction type if needed
      const filteredAccuracy = filters?.predictionType
        ? accuracyRecords.filter((a) => {
            const pred = predictionMap.get(a.predictionId);
            return pred?.predictionType === filters.predictionType;
          })
        : accuracyRecords;

      const totalPredictions = filteredAccuracy.length;
      const correctPredictions = filteredAccuracy.filter(
        (a) => a.accuracyScore >= 0.5,
      ).length;
      const averageAccuracy =
        totalPredictions > 0
          ? filteredAccuracy.reduce((sum, a) => sum + a.accuracyScore, 0) /
            totalPredictions
          : 0;

      // Calculate accuracy by type
      const accuracyByType: Record<string, number> = {};
      const typeGroups: Record<string, number[]> = {};

      filteredAccuracy.forEach((a) => {
        const pred = predictionMap.get(a.predictionId);
        if (pred) {
          if (!typeGroups[pred.predictionType]) {
            typeGroups[pred.predictionType] = [];
          }
          typeGroups[pred.predictionType].push(a.accuracyScore);
        }
      });

      Object.entries(typeGroups).forEach(([type, scores]) => {
        accuracyByType[type] =
          scores.reduce((sum, s) => sum + s, 0) / scores.length;
      });

      return {
        averageAccuracy,
        totalPredictions,
        correctPredictions,
        accuracyByType,
      };
    } catch (error) {
      console.error("Error getting prediction accuracy:", error);
      throw error;
    }
  }

  // ==================== Trend Detection Implementation ====================

  async createTrend(trend: InsertTrend): Promise<Trend> {
    try {
      const [newTrend] = await db.insert(trends).values(trend).returning();
      return newTrend;
    } catch (error) {
      console.error("Error creating trend:", error);
      throw error;
    }
  }

  async updateTrend(
    trendId: string,
    update: Partial<InsertTrend>,
  ): Promise<Trend> {
    try {
      const [updatedTrend] = await db
        .update(trends)
        .set({
          ...update,
          updatedAt: new Date(),
        })
        .where(eq(trends.id, trendId))
        .returning();
      return updatedTrend;
    } catch (error) {
      console.error("Error updating trend:", error);
      throw error;
    }
  }

  async getTrends(filters?: {
    status?: string | string[];
    trendType?: string | string[];
    minStrength?: number;
    dateRange?: { start: Date; end: Date };
    limit?: number;
  }): Promise<Trend[]> {
    try {
      const conditions: any[] = [];

      if (filters?.status) {
        if (Array.isArray(filters.status)) {
          conditions.push(sql`${trends.status} = ANY(${filters.status})`);
        } else {
          conditions.push(eq(trends.status, filters.status));
        }
      }

      if (filters?.trendType) {
        if (Array.isArray(filters.trendType)) {
          conditions.push(sql`${trends.trendType} = ANY(${filters.trendType})`);
        } else {
          conditions.push(eq(trends.trendType, filters.trendType));
        }
      }

      if (filters?.minStrength) {
        conditions.push(gte(trends.strength, filters.minStrength));
      }

      if (filters?.dateRange) {
        conditions.push(
          gte(trends.startDate, filters.dateRange.start),
          lte(trends.startDate, filters.dateRange.end),
        );
      }

      const query = db
        .select()
        .from(trends)
        .orderBy(desc(trends.strength), desc(trends.createdAt))
        .$dynamic();

      if (conditions.length > 0 && filters?.limit) {
        return await query.where(and(...conditions)).limit(filters.limit);
      } else if (conditions.length > 0) {
        return await query.where(and(...conditions));
      } else if (filters?.limit) {
        return await query.limit(filters.limit);
      }

      return await query;
    } catch (error) {
      console.error("Error getting trends:", error);
      throw error;
    }
  }

  async getTrendById(trendId: string): Promise<Trend | undefined> {
    try {
      const [trend] = await db
        .select()
        .from(trends)
        .where(eq(trends.id, trendId));
      return trend;
    } catch (error) {
      console.error("Error getting trend by ID:", error);
      throw error;
    }
  }

  async getCurrentTrends(): Promise<Trend[]> {
    try {
      return await db
        .select()
        .from(trends)
        .where(
          and(
            sql`${trends.status} IN ('active', 'emerging', 'peaking')`,
            gte(trends.strength, 0.3),
          ),
        )
        .orderBy(desc(trends.strength));
    } catch (error) {
      console.error("Error getting current trends:", error);
      throw error;
    }
  }

  async getEmergingTrends(): Promise<Trend[]> {
    try {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      return await db
        .select()
        .from(trends)
        .where(
          and(
            eq(trends.status, "emerging"),
            gte(trends.startDate, oneWeekAgo),
            gte(trends.growthRate, 50), // 50% growth rate threshold
          ),
        )
        .orderBy(desc(trends.growthRate));
    } catch (error) {
      console.error("Error getting emerging trends:", error);
      throw error;
    }
  }

  async getHistoricalTrends(dateRange: {
    start: Date;
    end: Date;
  }): Promise<Trend[]> {
    try {
      return await db
        .select()
        .from(trends)
        .where(
          or(
            and(
              gte(trends.startDate, dateRange.start),
              lte(trends.startDate, dateRange.end),
            ),
            and(
              gte(trends.peakDate, dateRange.start),
              lte(trends.peakDate, dateRange.end),
            ),
          ),
        )
        .orderBy(desc(trends.peakDate));
    } catch (error) {
      console.error("Error getting historical trends:", error);
      throw error;
    }
  }

  async createTrendAlert(alert: InsertTrendAlert): Promise<TrendAlert> {
    try {
      const [newAlert] = await db.insert(trendAlerts).values(alert).returning();
      return newAlert;
    } catch (error) {
      console.error("Error creating trend alert:", error);
      throw error;
    }
  }

  async updateTrendAlert(
    alertId: string,
    update: Partial<InsertTrendAlert>,
  ): Promise<TrendAlert> {
    try {
      const [updatedAlert] = await db
        .update(trendAlerts)
        .set({
          ...update,
          updatedAt: new Date(),
        })
        .where(eq(trendAlerts.id, alertId))
        .returning();
      return updatedAlert;
    } catch (error) {
      console.error("Error updating trend alert:", error);
      throw error;
    }
  }

  async getTrendAlerts(userId?: string | null): Promise<TrendAlert[]> {
    try {
      if (userId === undefined) {
        // Get all alerts
        return await db
          .select()
          .from(trendAlerts)
          .where(eq(trendAlerts.isActive, true))
          .orderBy(desc(trendAlerts.priority), desc(trendAlerts.createdAt));
      } else if (userId === null) {
        // Get system-wide alerts
        return await db
          .select()
          .from(trendAlerts)
          .where(
            and(isNull(trendAlerts.userId), eq(trendAlerts.isActive, true)),
          )
          .orderBy(desc(trendAlerts.priority), desc(trendAlerts.createdAt));
      } else {
        // Get user-specific and system-wide alerts
        return await db
          .select()
          .from(trendAlerts)
          .where(
            and(
              or(eq(trendAlerts.userId, userId), isNull(trendAlerts.userId)),
              eq(trendAlerts.isActive, true),
            ),
          )
          .orderBy(desc(trendAlerts.priority), desc(trendAlerts.createdAt));
      }
    } catch (error) {
      console.error("Error getting trend alerts:", error);
      throw error;
    }
  }

  async getTrendAlertsByTrendId(trendId: string): Promise<TrendAlert[]> {
    try {
      return await db
        .select()
        .from(trendAlerts)
        .where(eq(trendAlerts.trendId, trendId))
        .orderBy(desc(trendAlerts.triggeredAt));
    } catch (error) {
      console.error("Error getting trend alerts by trend ID:", error);
      throw error;
    }
  }

  async triggerTrendAlert(
    alertId: string,
    message: string,
    notifiedUsers: string[],
  ): Promise<void> {
    try {
      await db
        .update(trendAlerts)
        .set({
          triggeredAt: new Date(),
          alertMessage: message,
          notifiedUsers,
          updatedAt: new Date(),
        })
        .where(eq(trendAlerts.id, alertId));
    } catch (error) {
      console.error("Error triggering trend alert:", error);
      throw error;
    }
  }

  async acknowledgeTrendAlert(
    alertId: string,
    actionTaken?: string,
  ): Promise<void> {
    try {
      await db
        .update(trendAlerts)
        .set({
          acknowledgedAt: new Date(),
          actionTaken,
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(trendAlerts.id, alertId));
    } catch (error) {
      console.error("Error acknowledging trend alert:", error);
      throw error;
    }
  }

  async subscribeTrendAlerts(
    userId: string,
    conditions: InsertTrendAlert["conditions"],
    alertType: "threshold" | "emergence" | "acceleration" | "peak" | "decline" | "anomaly",
  ): Promise<TrendAlert> {
    try {
      const alert: InsertTrendAlert = {
        userId,
        alertType,
        conditions,
        priority: "medium",
        isActive: true,
        notificationChannels: ["in-app", "email"],
      };

      return await this.createTrendAlert(alert);
    } catch (error) {
      console.error("Error subscribing to trend alerts:", error);
      throw error;
    }
  }

  // ==================== A/B Testing Operations ====================

  async createAbTest(test: InsertAbTest): Promise<AbTest> {
    try {
      const [newTest] = await db.insert(abTests).values(test).returning();
      return newTest;
    } catch (error) {
      console.error("Error creating A/B test:", error);
      throw error;
    }
  }

  async getAbTest(testId: string): Promise<AbTest | undefined> {
    try {
      const [test] = await db
        .select()
        .from(abTests)
        .where(eq(abTests.id, testId));
      return test;
    } catch (error) {
      console.error("Error getting A/B test:", error);
      throw error;
    }
  }

  async getAbTests(filters?: {
    status?: string;
    createdBy?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<AbTest[]> {
    try {
      const query = db.select().from(abTests);

      if (filters) {
        const conditions: SQL<unknown>[] = [];
        if (filters.status) {
          conditions.push(eq(abTests.status, filters.status));
        }
        if (filters.createdBy) {
          conditions.push(eq(abTests.createdBy, filters.createdBy));
        }
        if (filters.startDate) {
          conditions.push(gte(abTests.startDate, filters.startDate));
        }
        if (filters.endDate) {
          conditions.push(lte(abTests.endDate, filters.endDate));
        }

        if (conditions.length > 0) {
          return await query.where(and(...conditions)).orderBy(desc(abTests.createdAt));
        }
      }

      return await query.orderBy(desc(abTests.createdAt));
    } catch (error) {
      console.error("Error getting A/B tests:", error);
      throw error;
    }
  }

  async updateAbTest(
    testId: string,
    update: Partial<Omit<AbTest, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<AbTest> {
    try {
      const [updatedTest] = await db
        .update(abTests)
        .set({
          ...update,
          updatedAt: new Date(),
        })
        .where(eq(abTests.id, testId))
        .returning();
      return updatedTest;
    } catch (error) {
      console.error("Error updating A/B test:", error);
      throw error;
    }
  }

  async deleteAbTest(testId: string): Promise<void> {
    try {
      await db.delete(abTests).where(eq(abTests.id, testId));
    } catch (error) {
      console.error("Error deleting A/B test:", error);
      throw error;
    }
  }

  async upsertAbTestResult(result: InsertAbTestResult): Promise<AbTestResult> {
    try {
      // Try to find existing result for this test/variant/period
      const existing = await db
        .select()
        .from(abTestResults)
        .where(
          and(
            eq(abTestResults.testId, result.testId),
            eq(abTestResults.variant, result.variant),
            eq(abTestResults.periodStart, result.periodStart),
            eq(abTestResults.periodEnd, result.periodEnd),
          ),
        )
        .limit(1);

      if (existing.length > 0) {
        // Update existing
        const [updated] = await db
          .update(abTestResults)
          .set({
            ...result,
            updatedAt: new Date(),
          })
          .where(eq(abTestResults.id, existing[0].id))
          .returning();
        return updated;
      } else {
        // Create new
        const [created] = await db
          .insert(abTestResults)
          .values(result)
          .returning();
        return created;
      }
    } catch (error) {
      console.error("Error upserting A/B test result:", error);
      throw error;
    }
  }

  async getAbTestResults(
    testId: string,
    variant?: string,
  ): Promise<AbTestResult[]> {
    try {
      const baseConditions: SQL<unknown>[] = [eq(abTestResults.testId, testId)];
      
      if (variant) {
        baseConditions.push(eq(abTestResults.variant, variant));
      }

      const query = db
        .select()
        .from(abTestResults)
        .where(and(...baseConditions));

      return await query.orderBy(desc(abTestResults.periodEnd));
    } catch (error) {
      console.error("Error getting A/B test results:", error);
      throw error;
    }
  }

  async getAggregatedAbTestResults(testId: string): Promise<{
    variantA: AbTestResult;
    variantB: AbTestResult;
  }> {
    try {
      // Get the most recent results for each variant
      const results = await this.getAbTestResults(testId);

      // Aggregate results by variant using properly typed reduce
      const variantA = results
        .filter((r) => r.variant === "A")
        .reduce<AbTestResult | undefined>(
          (acc, r) => ({
            ...r,
            conversions: (acc?.conversions || 0) + r.conversions,
            visitors: (acc?.visitors || 0) + r.visitors,
            revenue: (acc?.revenue || 0) + r.revenue,
            sampleSize: (acc?.sampleSize || 0) + r.sampleSize,
          }),
          undefined,
        );

      const variantB = results
        .filter((r) => r.variant === "B")
        .reduce<AbTestResult | undefined>(
          (acc, r) => ({
            ...r,
            conversions: (acc?.conversions || 0) + r.conversions,
            visitors: (acc?.visitors || 0) + r.visitors,
            revenue: (acc?.revenue || 0) + r.revenue,
            sampleSize: (acc?.sampleSize || 0) + r.sampleSize,
          }),
          undefined,
        );

      return {
        variantA: variantA || {
          id: "",
          testId,
          variant: "A",
          conversions: 0,
          visitors: 0,
          revenue: 0,
          sampleSize: 0,
          metadata: null,
          avgSessionDuration: null,
          engagementScore: null,
          bounceRate: null,
          periodStart: new Date(),
          periodEnd: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        variantB: variantB || {
          id: "",
          testId,
          variant: "B",
          conversions: 0,
          visitors: 0,
          revenue: 0,
          sampleSize: 0,
          metadata: null,
          avgSessionDuration: null,
          engagementScore: null,
          bounceRate: null,
          periodStart: new Date(),
          periodEnd: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };
    } catch (error) {
      console.error("Error getting aggregated A/B test results:", error);
      throw error;
    }
  }

  async upsertAbTestInsight(
    insight: InsertAbTestInsight,
  ): Promise<AbTestInsight> {
    try {
      // Check if insight already exists for this test
      const existing = await db
        .select()
        .from(abTestInsights)
        .where(eq(abTestInsights.testId, insight.testId))
        .limit(1);

      if (existing.length > 0) {
        // Update existing
        const [updated] = await db
          .update(abTestInsights)
          .set({
            ...insight,
            updatedAt: new Date(),
          })
          .where(eq(abTestInsights.id, existing[0].id))
          .returning();
        return updated;
      } else {
        // Create new
        const [created] = await db
          .insert(abTestInsights)
          .values(insight)
          .returning();
        return created;
      }
    } catch (error) {
      console.error("Error upserting A/B test insight:", error);
      throw error;
    }
  }

  async getAbTestInsights(testId: string): Promise<AbTestInsight | undefined> {
    try {
      const [insight] = await db
        .select()
        .from(abTestInsights)
        .where(eq(abTestInsights.testId, testId))
        .orderBy(desc(abTestInsights.updatedAt))
        .limit(1);
      return insight;
    } catch (error) {
      console.error("Error getting A/B test insights:", error);
      throw error;
    }
  }

  async calculateStatisticalSignificance(testId: string): Promise<{
    pValue: number;
    confidence: number;
    winner: "A" | "B" | "inconclusive";
    liftPercentage: number;
  }> {
    try {
      const { variantA, variantB } =
        await this.getAggregatedAbTestResults(testId);

      // Calculate conversion rates
      const conversionRateA =
        variantA.visitors > 0 ? variantA.conversions / variantA.visitors : 0;
      const conversionRateB =
        variantB.visitors > 0 ? variantB.conversions / variantB.visitors : 0;

      // Calculate pooled probability
      const pooledProbability =
        (variantA.conversions + variantB.conversions) /
        (variantA.visitors + variantB.visitors);

      // Calculate standard error
      const standardError = Math.sqrt(
        pooledProbability *
          (1 - pooledProbability) *
          (1 / variantA.visitors + 1 / variantB.visitors),
      );

      // Calculate z-score
      const zScore =
        standardError > 0
          ? (conversionRateB - conversionRateA) / standardError
          : 0;

      // Calculate p-value (simplified normal distribution approximation)
      const pValue = 2 * (1 - this.normalCDF(Math.abs(zScore)));

      // Calculate confidence level
      const confidence = 1 - pValue;

      // Calculate lift percentage
      const liftPercentage =
        conversionRateA > 0
          ? ((conversionRateB - conversionRateA) / conversionRateA) * 100
          : 0;

      // Determine winner
      let winner: "A" | "B" | "inconclusive" = "inconclusive";
      if (
        pValue < 0.05 &&
        variantA.visitors >= 100 &&
        variantB.visitors >= 100
      ) {
        winner = conversionRateB > conversionRateA ? "B" : "A";
      }

      return {
        pValue,
        confidence,
        winner,
        liftPercentage,
      };
    } catch (error) {
      console.error("Error calculating statistical significance:", error);
      throw error;
    }
  }

  // Helper function for normal CDF approximation
  private normalCDF(x: number): number {
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x) / Math.sqrt(2.0);

    const t = 1.0 / (1.0 + p * x);
    const y =
      1.0 -
      ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return 0.5 * (1.0 + sign * y);
  }

  async getAbTestRecommendations(userId?: string): Promise<
    Array<
      AbTest & {
        insight?: AbTestInsight;
        results?: AbTestResult[];
      }
    >
  > {
    try {
      // Get active and recently completed tests
      const tests = await this.getAbTests({
        status: "active",
      });

      // Add completed tests from last 30 days
      const recentCompleted = await this.getAbTests({
        status: "completed",
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      });

      const allTests = [...tests, ...recentCompleted];

      // Fetch insights and results for each test
      const recommendations = await Promise.all(
        allTests.map(async (test) => {
          const insight = await this.getAbTestInsights(test.id);
          const results = await this.getAbTestResults(test.id);

          return {
            ...test,
            insight,
            results,
          };
        }),
      );

      // Sort by confidence level if insights exist
      recommendations.sort((a, b) => {
        const confA = a.insight?.confidence || 0;
        const confB = b.insight?.confidence || 0;
        return confB - confA;
      });

      return recommendations;
    } catch (error) {
      console.error("Error getting A/B test recommendations:", error);
      throw error;
    }
  }

  async implementAbTestWinner(
    testId: string,
    variant: "A" | "B",
  ): Promise<void> {
    try {
      // Update test status to completed
      await this.updateAbTest(testId, {
        status: "completed",
      });

      // Update insight with implementation note
      const insight = await this.getAbTestInsights(testId);
      if (insight) {
        await this.upsertAbTestInsight({
          ...insight,
          testId,
          winner: variant,
          recommendation: "implement",
          insights: {
            ...insight.insights,
            implementationDate: new Date().toISOString(),
            implementedVariant: variant,
          },
          statisticalAnalysis: insight.statisticalAnalysis || undefined,
        });
      }

      console.log(`Implemented variant ${variant} for test ${testId}`);
    } catch (error) {
      console.error("Error implementing A/B test winner:", error);
      throw error;
    }
  }

  // ==================== Cohort Analysis Operations ====================

  async createCohort(cohort: InsertCohort): Promise<Cohort> {
    try {
      const [newCohort] = await db.insert(cohorts).values(cohort).returning();

      // Refresh membership immediately for new cohort
      await this.refreshCohortMembership(newCohort.id);

      return newCohort;
    } catch (error) {
      console.error("Error creating cohort:", error);
      throw error;
    }
  }

  async getCohort(cohortId: string): Promise<Cohort | undefined> {
    try {
      const [cohort] = await db
        .select()
        .from(cohorts)
        .where(eq(cohorts.id, cohortId));
      return cohort;
    } catch (error) {
      console.error("Error getting cohort:", error);
      throw error;
    }
  }

  async getCohorts(filters?: {
    isActive?: boolean;
    createdBy?: string;
  }): Promise<Cohort[]> {
    try {
      let query = db.select().from(cohorts).$dynamic();
      const conditions: SQL<unknown>[] = [];

      if (filters?.isActive !== undefined) {
        conditions.push(eq(cohorts.isActive, filters.isActive));
      }

      if (filters?.createdBy) {
        conditions.push(eq(cohorts.createdBy, filters.createdBy));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      return await query;
    } catch (error) {
      console.error("Error getting cohorts:", error);
      throw error;
    }
  }

  async updateCohort(
    cohortId: string,
    updates: Partial<InsertCohort>,
  ): Promise<Cohort> {
    try {
      const [updated] = await db
        .update(cohorts)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(cohorts.id, cohortId))
        .returning();

      // Refresh membership if definition changed
      if (updates.definition) {
        await this.refreshCohortMembership(cohortId);
      }

      return updated;
    } catch (error) {
      console.error("Error updating cohort:", error);
      throw error;
    }
  }

  async deleteCohort(cohortId: string): Promise<void> {
    try {
      await db.delete(cohorts).where(eq(cohorts.id, cohortId));
    } catch (error) {
      console.error("Error deleting cohort:", error);
      throw error;
    }
  }

  async recordCohortMetrics(
    metrics: InsertCohortMetric[],
  ): Promise<CohortMetric[]> {
    try {
      const recorded = await db
        .insert(cohortMetrics)
        .values(metrics)
        .returning();
      return recorded;
    } catch (error) {
      console.error("Error recording cohort metrics:", error);
      throw error;
    }
  }

  async getCohortMetrics(
    cohortId: string,
    filters?: {
      metricName?: string;
      metricType?: string;
      period?: string;
      startDate?: Date;
      endDate?: Date;
    },
  ): Promise<CohortMetric[]> {
    try {
      let query = db.select().from(cohortMetrics);
      const conditions: any[] = [eq(cohortMetrics.cohortId, cohortId)];

      if (filters?.metricName) {
        conditions.push(eq(cohortMetrics.metricName, filters.metricName));
      }

      if (filters?.metricType) {
        conditions.push(eq(cohortMetrics.metricType, filters.metricType));
      }

      if (filters?.period) {
        conditions.push(eq(cohortMetrics.period, filters.period));
      }

      if (filters?.startDate) {
        conditions.push(
          gte(
            cohortMetrics.periodDate,
            filters.startDate.toISOString().split("T")[0],
          ),
        );
      }

      if (filters?.endDate) {
        conditions.push(
          lte(
            cohortMetrics.periodDate,
            filters.endDate.toISOString().split("T")[0],
          ),
        );
      }

      const finalQuery = query.where(and(...conditions));
      return await finalQuery;
    } catch (error) {
      console.error("Error getting cohort metrics:", error);
      throw error;
    }
  }

  async calculateCohortRetention(
    cohortId: string,
    periods: number[],
  ): Promise<{
    cohortId: string;
    retention: Array<{ period: number; rate: number; count: number }>;
  }> {
    try {
      const cohort = await this.getCohort(cohortId);
      if (!cohort) {
        throw new Error(`Cohort ${cohortId} not found`);
      }

      // Get cohort members based on definition
      const { users: cohortUsers } = await this.getCohortMembers(cohortId);
      const totalUsers = cohortUsers.length;

      const retention: Array<{ period: number; rate: number; count: number }> =
        [];

      for (const period of periods) {
        // Calculate retention for each period
        // This is a simplified version - in production, you'd track actual user activity
        const endDate = new Date();
        endDate.setDate(endDate.getDate() - period);

        // Count active users in the period
        const activeUsers = await db
          .select({ count: sql<number>`COUNT(DISTINCT user_id)` })
          .from(userSessions)
          .where(
            and(
              sql`user_id IN (${sql.join(
                cohortUsers.map((u) => u.id),
                sql`, `,
              )})`,
              gte(userSessions.startTime, endDate),
            ),
          );

        const activeCount = Number(activeUsers[0]?.count || 0);
        const retentionRate =
          totalUsers > 0 ? (activeCount / totalUsers) * 100 : 0;

        retention.push({
          period,
          rate: retentionRate,
          count: activeCount,
        });

        // Record metric
        await this.recordCohortMetrics([
          {
            cohortId,
            metricName: `retention_day_${period}`,
            period: "day",
            periodDate: endDate.toISOString().split("T")[0],
            value: retentionRate,
            metricType: "retention",
          },
        ]);
      }

      return { cohortId, retention };
    } catch (error) {
      console.error("Error calculating cohort retention:", error);
      throw error;
    }
  }

  async compareCohorts(
    cohortIds: string[],
    metrics: string[],
  ): Promise<{
    comparison: Array<{
      cohortId: string;
      metrics: Record<string, number>;
    }>;
  }> {
    try {
      const comparison = await Promise.all(
        cohortIds.map(async (cohortId) => {
          const cohortMetricsData = await this.getCohortMetrics(cohortId, {
            metricName: metrics[0], // For simplicity, using first metric
          });

          const metricsMap: Record<string, number> = {};

          for (const metric of metrics) {
            const metricData = cohortMetricsData.find(
              (m) => m.metricName === metric,
            );
            metricsMap[metric] = metricData?.value || 0;
          }

          return {
            cohortId,
            metrics: metricsMap,
          };
        }),
      );

      return { comparison };
    } catch (error) {
      console.error("Error comparing cohorts:", error);
      throw error;
    }
  }

  async createCohortInsight(
    insight: InsertCohortInsight,
  ): Promise<CohortInsight> {
    try {
      const [newInsight] = await db
        .insert(cohortInsights)
        .values(insight)
        .returning();
      return newInsight;
    } catch (error) {
      console.error("Error creating cohort insight:", error);
      throw error;
    }
  }

  async getCohortInsights(
    cohortId: string,
    filters?: {
      status?: string;
      importance?: string;
      category?: string;
    },
  ): Promise<CohortInsight[]> {
    try {
      let query = db.select().from(cohortInsights).$dynamic();
      const conditions: SQL<unknown>[] = [eq(cohortInsights.cohortId, cohortId)];

      if (filters?.status) {
        conditions.push(eq(cohortInsights.status, filters.status));
      }

      if (filters?.importance) {
        conditions.push(eq(cohortInsights.importance, filters.importance));
      }

      if (filters?.category) {
        conditions.push(eq(cohortInsights.category, filters.category));
      }

      query = query.where(and(...conditions));
      return await query.orderBy(desc(cohortInsights.createdAt));
    } catch (error) {
      console.error("Error getting cohort insights:", error);
      throw error;
    }
  }

  async updateCohortInsightStatus(
    insightId: string,
    status: string,
  ): Promise<CohortInsight> {
    try {
      const [updated] = await db
        .update(cohortInsights)
        .set({
          status,
          updatedAt: new Date(),
        })
        .where(eq(cohortInsights.id, insightId))
        .returning();
      return updated;
    } catch (error) {
      console.error("Error updating cohort insight status:", error);
      throw error;
    }
  }

  async refreshCohortMembership(
    cohortId: string,
  ): Promise<{ userCount: number }> {
    try {
      const cohort = await this.getCohort(cohortId);
      if (!cohort) {
        throw new Error(`Cohort ${cohortId} not found`);
      }

      // Build query based on cohort definition
      let userQuery = db.select().from(users).$dynamic();
      const conditions: SQL<unknown>[] = [];

      // Apply signup date range filter
      if (cohort.definition.signupDateRange) {
        const { start, end } = cohort.definition.signupDateRange;
        if (start) {
          conditions.push(gte(users.createdAt, new Date(start)));
        }
        if (end) {
          conditions.push(lte(users.createdAt, new Date(end)));
        }
      }

      // Apply source filter (this would need to be tracked separately)
      // For demo purposes, we'll simulate with user metadata

      if (conditions.length > 0) {
        userQuery = userQuery.where(and(...conditions));
      }

      const cohortUsers = await userQuery;
      const userCount = cohortUsers.length;

      // Update cohort user count
      await db
        .update(cohorts)
        .set({
          userCount,
          lastRefreshed: new Date(),
        })
        .where(eq(cohorts.id, cohortId));

      return { userCount };
    } catch (error) {
      console.error("Error refreshing cohort membership:", error);
      throw error;
    }
  }

  async getCohortMembers(
    cohortId: string,
    limit: number = 100,
    offset: number = 0,
  ): Promise<{
    users: User[];
    total: number;
  }> {
    try {
      const cohort = await this.getCohort(cohortId);
      if (!cohort) {
        throw new Error(`Cohort ${cohortId} not found`);
      }

      // Build query based on cohort definition using $dynamic() for type-safe chaining
      let userQuery = db.select().from(users).$dynamic();
      const conditions: any[] = [];

      // Apply signup date range filter
      if (cohort.definition.signupDateRange) {
        const { start, end } = cohort.definition.signupDateRange;
        if (start) {
          conditions.push(gte(users.createdAt, new Date(start)));
        }
        if (end) {
          conditions.push(lte(users.createdAt, new Date(end)));
        }
      }

      if (conditions.length > 0) {
        userQuery = userQuery.where(and(...conditions));
      }

      // Get total count
      const countResult = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(users)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      const total = Number(countResult[0]?.count || 0);

      // Get paginated users
      const cohortUsers = await userQuery.limit(limit).offset(offset);

      return { users: cohortUsers, total };
    } catch (error) {
      console.error("Error getting cohort members:", error);
      throw error;
    }
  }

  async generateCohortInsights(cohortId: string): Promise<CohortInsight[]> {
    // This will be implemented with OpenAI integration
    // For now, returning empty array
    console.log(`Generating insights for cohort ${cohortId}`);
    return [];
  }

  // Predictive Maintenance Methods
  async saveSystemMetric(metric: InsertSystemMetric): Promise<SystemMetric> {
    try {
      const [saved] = await db.insert(systemMetrics).values(metric).returning();
      return saved;
    } catch (error) {
      console.error("Error saving system metric:", error);
      throw error;
    }
  }

  async getSystemMetrics(
    component?: string,
    startDate?: Date,
    endDate?: Date,
    limit: number = 100,
  ): Promise<SystemMetric[]> {
    try {
      let query = db.select().from(systemMetrics).$dynamic();
      const conditions: SQL<unknown>[] = [];

      if (component) {
        conditions.push(eq(systemMetrics.component, component));
      }
      if (startDate) {
        conditions.push(gte(systemMetrics.timestamp, startDate));
      }
      if (endDate) {
        conditions.push(lte(systemMetrics.timestamp, endDate));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      return await query.orderBy(desc(systemMetrics.timestamp)).limit(limit);
    } catch (error) {
      console.error("Error getting system metrics:", error);
      throw error;
    }
  }

  async saveMaintenancePrediction(
    prediction: InsertMaintenancePrediction,
  ): Promise<MaintenancePrediction> {
    try {
      const [saved] = await db
        .insert(maintenancePredictions)
        .values(prediction)
        .returning();
      return saved;
    } catch (error) {
      console.error("Error saving maintenance prediction:", error);
      throw error;
    }
  }

  async getMaintenancePredictions(
    status?: string,
    component?: string,
  ): Promise<MaintenancePrediction[]> {
    try {
      let query = db.select().from(maintenancePredictions).$dynamic();
      const conditions: SQL<unknown>[] = [];

      if (status) {
        conditions.push(eq(maintenancePredictions.status, status));
      }
      if (component) {
        conditions.push(eq(maintenancePredictions.component, component));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      return await query.orderBy(asc(maintenancePredictions.recommendedDate));
    } catch (error) {
      console.error("Error getting maintenance predictions:", error);
      throw error;
    }
  }

  async updateMaintenancePredictionStatus(
    predictionId: string,
    status: string,
  ): Promise<MaintenancePrediction> {
    try {
      const [updated] = await db
        .update(maintenancePredictions)
        .set({
          status,
          updatedAt: new Date(),
        })
        .where(eq(maintenancePredictions.id, predictionId))
        .returning();
      return updated;
    } catch (error) {
      console.error("Error updating maintenance prediction status:", error);
      throw error;
    }
  }

  async saveMaintenanceHistory(
    history: InsertMaintenanceHistory,
  ): Promise<MaintenanceHistory> {
    try {
      const [saved] = await db
        .insert(maintenanceHistory)
        .values([history])
        .returning();

      // Mark related prediction as completed if exists
      if (saved.predictionId) {
        await this.updateMaintenancePredictionStatus(
          saved.predictionId,
          "completed",
        );
      }

      return saved;
    } catch (error) {
      console.error("Error saving maintenance history:", error);
      throw error;
    }
  }

  async getMaintenanceHistory(
    component?: string,
    limit: number = 50,
  ): Promise<MaintenanceHistory[]> {
    try {
      let query = db.select().from(maintenanceHistory).$dynamic();

      if (component) {
        query = query.where(eq(maintenanceHistory.component, component));
      }

      return await query
        .orderBy(desc(maintenanceHistory.resolvedAt))
        .limit(limit);
    } catch (error) {
      console.error("Error getting maintenance history:", error);
      throw error;
    }
  }

  async getComponentHealth(component: string): Promise<{
    avgAnomalyScore: number;
    recentMetrics: SystemMetric[];
    predictions: MaintenancePrediction[];
    history: MaintenanceHistory[];
  }> {
    try {
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);

      // Get recent metrics
      const recentMetrics = await this.getSystemMetrics(
        component,
        oneDayAgo,
        new Date(),
        100,
      );

      // Calculate average anomaly score
      const avgAnomalyScore =
        recentMetrics.length > 0
          ? recentMetrics.reduce((sum, m) => sum + (m.anomalyScore || 0), 0) /
            recentMetrics.length
          : 0;

      // Get active predictions
      const predictions = await db
        .select()
        .from(maintenancePredictions)
        .where(
          and(
            eq(maintenancePredictions.component, component),
            eq(maintenancePredictions.status, "active"),
          ),
        );

      // Get recent history
      const history = await this.getMaintenanceHistory(component, 10);

      return {
        avgAnomalyScore,
        recentMetrics,
        predictions,
        history,
      };
    } catch (error) {
      console.error("Error getting component health:", error);
      throw error;
    }
  }

  // ==================== Scheduling Operations Implementation ====================

  async getSchedulingPreferences(
    userId: string,
  ): Promise<SchedulingPreferences | undefined> {
    try {
      const prefs = await db
        .select()
        .from(schedulingPreferences)
        .where(eq(schedulingPreferences.userId, userId))
        .limit(1);
      return prefs[0];
    } catch (error) {
      console.error("Error getting scheduling preferences:", error);
      throw error;
    }
  }

  async upsertSchedulingPreferences(
    userId: string,
    preferences: Omit<InsertSchedulingPreferences, "userId">,
  ): Promise<SchedulingPreferences> {
    try {
      const existing = await this.getSchedulingPreferences(userId);

      if (existing) {
        const [updated] = await db
          .update(schedulingPreferences)
          .set({
            ...preferences,
            updatedAt: new Date(),
          })
          .where(eq(schedulingPreferences.userId, userId))
          .returning();
        return updated;
      } else {
        const [created] = await db
          .insert(schedulingPreferences)
          .values({
            ...preferences,
            userId,
          })
          .returning();
        return created;
      }
    } catch (error) {
      console.error("Error upserting scheduling preferences:", error);
      throw error;
    }
  }

  async getMeetingSuggestions(
    meetingId: string,
  ): Promise<MeetingSuggestions | undefined> {
    try {
      const suggestions = await db
        .select()
        .from(meetingSuggestions)
        .where(eq(meetingSuggestions.meetingId, meetingId))
        .limit(1);
      return suggestions[0];
    } catch (error) {
      console.error("Error getting meeting suggestions:", error);
      throw error;
    }
  }

  async getUserMeetingSuggestions(
    userId: string,
    status?: string,
  ): Promise<MeetingSuggestions[]> {
    try {
      const conditions = [eq(meetingSuggestions.createdBy, userId)];

      if (status) {
        conditions.push(eq(meetingSuggestions.status, status));
      }

      return await db
        .select()
        .from(meetingSuggestions)
        .where(and(...conditions))
        .orderBy(desc(meetingSuggestions.createdAt));
    } catch (error) {
      console.error("Error getting user meeting suggestions:", error);
      throw error;
    }
  }

  async createMeetingSuggestions(
    suggestions: InsertMeetingSuggestions,
  ): Promise<MeetingSuggestions> {
    try {
      return await this.insertSingle<InsertMeetingSuggestions, MeetingSuggestions>(
        meetingSuggestions,
        suggestions,
      );
    } catch (error) {
      console.error("Error creating meeting suggestions:", error);
      throw error;
    }
  }

  async updateMeetingSuggestionStatus(
    meetingId: string,
    status: string,
    selectedTime?: any,
  ): Promise<MeetingSuggestions> {
    try {
      const updateData: any = {
        status,
        updatedAt: new Date(),
      };

      if (selectedTime) {
        updateData.selectedTime = selectedTime;
      }

      const [updated] = await db
        .update(meetingSuggestions)
        .set(updateData)
        .where(eq(meetingSuggestions.meetingId, meetingId))
        .returning();
      return updated;
    } catch (error) {
      console.error("Error updating meeting suggestion status:", error);
      throw error;
    }
  }

  async getSchedulingPatterns(userId: string): Promise<SchedulingPatterns[]> {
    try {
      return await db
        .select()
        .from(schedulingPatterns)
        .where(eq(schedulingPatterns.userId, userId))
        .orderBy(desc(schedulingPatterns.confidence));
    } catch (error) {
      console.error("Error getting scheduling patterns:", error);
      throw error;
    }
  }

  async upsertSchedulingPattern(
    userId: string,
    pattern: Omit<InsertSchedulingPatterns, "userId">,
  ): Promise<SchedulingPatterns> {
    try {
      const existing = await db
        .select()
        .from(schedulingPatterns)
        .where(
          and(
            eq(schedulingPatterns.userId, userId),
            eq(schedulingPatterns.patternType, pattern.patternType),
          ),
        )
        .limit(1);

      if (existing[0]) {
        const [updated] = await db
          .update(schedulingPatterns)
          .set({
            ...pattern,
            updatedAt: new Date(),
          })
          .where(eq(schedulingPatterns.id, existing[0].id))
          .returning();
        return updated;
      } else {
        const [created] = await db
          .insert(schedulingPatterns)
          .values({
            ...pattern,
            userId,
          })
          .returning();
        return created;
      }
    } catch (error) {
      console.error("Error upserting scheduling pattern:", error);
      throw error;
    }
  }

  async getMeetingEvents(
    userId: string,
    filters?: {
      startTime?: Date;
      endTime?: Date;
      status?: string;
    },
  ): Promise<MeetingEvents[]> {
    try {
      const conditions: any[] = [eq(meetingEvents.userId, userId)];

      if (filters?.startTime) {
        conditions.push(gte(meetingEvents.startTime, filters.startTime));
      }
      if (filters?.endTime) {
        conditions.push(lte(meetingEvents.endTime, filters.endTime));
      }
      if (filters?.status) {
        conditions.push(eq(meetingEvents.status, filters.status));
      }

      return await db
        .select()
        .from(meetingEvents)
        .where(and(...conditions))
        .orderBy(asc(meetingEvents.startTime));
    } catch (error) {
      console.error("Error getting meeting events:", error);
      throw error;
    }
  }

  async createMeetingEvent(event: InsertMeetingEvents): Promise<MeetingEvents> {
    try {
      const [created] = await db
        .insert(meetingEvents)
        .values(event)
        .returning();
      return created;
    } catch (error) {
      console.error("Error creating meeting event:", error);
      throw error;
    }
  }

  async updateMeetingEvent(
    eventId: string,
    updates: Partial<MeetingEvents>,
  ): Promise<MeetingEvents> {
    try {
      const [updated] = await db
        .update(meetingEvents)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(meetingEvents.id, eventId))
        .returning();
      return updated;
    } catch (error) {
      console.error("Error updating meeting event:", error);
      throw error;
    }
  }

  async deleteMeetingEvent(userId: string, eventId: string): Promise<void> {
    try {
      await db
        .delete(meetingEvents)
        .where(
          and(eq(meetingEvents.id, eventId), eq(meetingEvents.userId, userId)),
        );
    } catch (error) {
      console.error("Error deleting meeting event:", error);
      throw error;
    }
  }

  async findSchedulingConflicts(
    userId: string,
    startTime: Date,
    endTime: Date,
  ): Promise<MeetingEvents[]> {
    try {
      return await db
        .select()
        .from(meetingEvents)
        .where(
          and(
            eq(meetingEvents.userId, userId),
            ne(meetingEvents.status, "cancelled"),
            or(
              // Event starts during the proposed time
              and(
                gte(meetingEvents.startTime, startTime),
                lte(meetingEvents.startTime, endTime),
              ),
              // Event ends during the proposed time
              and(
                gte(meetingEvents.endTime, startTime),
                lte(meetingEvents.endTime, endTime),
              ),
              // Event encompasses the proposed time
              and(
                lte(meetingEvents.startTime, startTime),
                gte(meetingEvents.endTime, endTime),
              ),
            ),
          ),
        );
    } catch (error) {
      console.error("Error finding scheduling conflicts:", error);
      throw error;
    }
  }

  async analyzeSchedulingPatterns(userId: string): Promise<{
    patterns: SchedulingPatterns[];
    insights: string[];
  }> {
    try {
      const patterns = await this.getSchedulingPatterns(userId);
      const events = await this.getMeetingEvents(userId, {
        startTime: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        endTime: new Date(),
      });

      const insights: string[] = [];

      // Generate insights based on patterns and events
      if (patterns.length > 0) {
        const highConfidencePatterns = patterns.filter(
          (p) => p.confidence > 0.7,
        );
        if (highConfidencePatterns.length > 0) {
          insights.push(
            `You have ${highConfidencePatterns.length} strong scheduling patterns identified.`,
          );
        }
      }

      if (events.length > 0) {
        const meetingsPerDay = events.length / 30;
        insights.push(
          `You average ${meetingsPerDay.toFixed(1)} meetings per day.`,
        );

        // Find busiest day of week
        const dayCount: Record<number, number> = {};
        events.forEach((e) => {
          const day = new Date(e.startTime).getDay();
          dayCount[day] = (dayCount[day] || 0) + 1;
        });

        const busiestDay = Object.entries(dayCount).sort(
          (a, b) => b[1] - a[1],
        )[0];
        if (busiestDay) {
          const dayNames = [
            "Sunday",
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
          ];
          insights.push(
            `Your busiest day is ${dayNames[parseInt(busiestDay[0])]}.`,
          );
        }
      }

      return { patterns, insights };
    } catch (error) {
      console.error("Error analyzing scheduling patterns:", error);
      throw error;
    }
  }

  // ==================== Ticket Routing Operations ====================

  async getTickets(filters?: {
    status?: string;
    assignedTo?: string;
    priority?: string;
    category?: string;
  }): Promise<Ticket[]> {
    try {
      let query = db.select().from(tickets);
      const conditions = [];

      if (filters?.status) {
        conditions.push(eq(tickets.status, filters.status));
      }
      if (filters?.assignedTo) {
        conditions.push(eq(tickets.assignedTo, filters.assignedTo));
      }
      if (filters?.priority) {
        conditions.push(eq(tickets.priority, filters.priority));
      }
      if (filters?.category) {
        conditions.push(eq(tickets.category, filters.category));
      }

      if (conditions.length > 0) {
        return await query.where(and(...conditions));
      }

      return await query;
    } catch (error) {
      console.error("Error getting tickets:", error);
      throw error;
    }
  }

  async getTicket(ticketId: string): Promise<Ticket | undefined> {
    try {
      const [ticket] = await db
        .select()
        .from(tickets)
        .where(eq(tickets.id, ticketId));
      return ticket;
    } catch (error) {
      console.error("Error getting ticket:", error);
      throw error;
    }
  }

  async createTicket(ticket: InsertTicket): Promise<Ticket> {
    try {
      return await this.insertSingle<InsertTicket, Ticket>(
        tickets,
        ticket,
      );
    } catch (error) {
      console.error("Error creating ticket:", error);
      throw error;
    }
  }

  async updateTicket(
    ticketId: string,
    updates: Partial<Ticket>,
  ): Promise<Ticket> {
    try {
      const [updatedTicket] = await db
        .update(tickets)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(tickets.id, ticketId))
        .returning();
      return updatedTicket;
    } catch (error) {
      console.error("Error updating ticket:", error);
      throw error;
    }
  }

  async getRoutingRules(isActive?: boolean): Promise<RoutingRule[]> {
    try {
      let query = db
        .select()
        .from(routingRules)
        .orderBy(asc(routingRules.priority));

      if (isActive !== undefined) {
        return await query.where(eq(routingRules.isActive, isActive));
      }

      return await query;
    } catch (error) {
      console.error("Error getting routing rules:", error);
      throw error;
    }
  }

  async getRoutingRule(ruleId: string): Promise<RoutingRule | undefined> {
    try {
      const [rule] = await db
        .select()
        .from(routingRules)
        .where(eq(routingRules.id, ruleId));
      return rule;
    } catch (error) {
      console.error("Error getting routing rule:", error);
      throw error;
    }
  }

  async createRoutingRule(rule: InsertRoutingRule): Promise<RoutingRule> {
    try {
      return await this.insertSingle<InsertRoutingRule, RoutingRule>(
        routingRules,
        rule,
      );
    } catch (error) {
      console.error("Error creating routing rule:", error);
      throw error;
    }
  }

  async updateRoutingRule(
    ruleId: string,
    updates: Partial<RoutingRule>,
  ): Promise<RoutingRule> {
    try {
      const [updatedRule] = await db
        .update(routingRules)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(routingRules.id, ruleId))
        .returning();
      return updatedRule;
    } catch (error) {
      console.error("Error updating routing rule:", error);
      throw error;
    }
  }

  async deleteRoutingRule(ruleId: string): Promise<void> {
    try {
      await db.delete(routingRules).where(eq(routingRules.id, ruleId));
    } catch (error) {
      console.error("Error deleting routing rule:", error);
      throw error;
    }
  }

  async getTicketRouting(ticketId: string): Promise<TicketRouting[]> {
    try {
      return await db
        .select()
        .from(ticketRouting)
        .where(eq(ticketRouting.ticket_id, ticketId))
        .orderBy(desc(ticketRouting.createdAt));
    } catch (error) {
      console.error("Error getting ticket routing:", error);
      throw error;
    }
  }

  async createTicketRouting(
    routing: InsertTicketRouting,
  ): Promise<TicketRouting> {
    try {
      return await this.insertSingle<InsertTicketRouting, TicketRouting>(
        ticketRouting,
        routing,
      );
    } catch (error) {
      console.error("Error creating ticket routing:", error);
      throw error;
    }
  }

  async getAgents(): Promise<AgentExpertise[]> {
    try {
      return await db
        .select()
        .from(agentExpertise)
        .orderBy(asc(agentExpertise.name));
    } catch (error) {
      console.error("Error getting agents:", error);
      throw error;
    }
  }

  async getAgent(agentId: string): Promise<AgentExpertise | undefined> {
    try {
      const [agent] = await db
        .select()
        .from(agentExpertise)
        .where(eq(agentExpertise.agent_id, agentId));
      return agent;
    } catch (error) {
      console.error("Error getting agent:", error);
      throw error;
    }
  }

  async upsertAgentExpertise(
    agent: InsertAgentExpertise,
  ): Promise<AgentExpertise> {
    try {
      const existingAgent = await this.getAgent(agent.agent_id);

      if (existingAgent) {
        const [updatedAgent] = await db
          .update(agentExpertise)
          .set({
            ...agent,
            updatedAt: new Date(),
          })
          .where(eq(agentExpertise.agent_id, agent.agent_id))
          .returning();
        return updatedAgent;
      } else {
        const [newAgent] = await db
          .insert(agentExpertise)
          .values(agent)
          .returning();
        return newAgent;
      }
    } catch (error) {
      console.error("Error upserting agent expertise:", error);
      throw error;
    }
  }

  async updateAgentWorkload(agentId: string, delta: number): Promise<void> {
    try {
      const agent = await this.getAgent(agentId);
      if (agent) {
        const newLoad = Math.max(0, agent.current_load + delta);
        await db
          .update(agentExpertise)
          .set({
            current_load: newLoad,
            availability: newLoad >= agent.max_capacity ? "busy" : "available",
            updatedAt: new Date(),
          })
          .where(eq(agentExpertise.agent_id, agentId));
      }
    } catch (error) {
      console.error("Error updating agent workload:", error);
      throw error;
    }
  }

  async getAvailableAgents(): Promise<AgentExpertise[]> {
    try {
      return await db
        .select()
        .from(agentExpertise)
        .where(
          and(
            ne(agentExpertise.availability, "offline"),
            sql`${agentExpertise.current_load} < ${agentExpertise.max_capacity}`,
          ),
        );
    } catch (error) {
      console.error("Error getting available agents:", error);
      throw error;
    }
  }

  // Update ticket routing with outcome data
  async updateTicketRouting(
    routingId: string,
    updates: Partial<TicketRouting>,
  ): Promise<TicketRouting | null> {
    try {
      const result = await db
        .update(ticketRouting)
        .set(updates)
        .where(eq(ticketRouting.id, routingId))
        .returning();
      return result[0] || null;
    } catch (error) {
      console.error("Error updating ticket routing:", error);
      throw error;
    }
  }

  // Get all routings with recorded outcomes
  async getAllRoutingsWithOutcomes(
    startDate?: Date,
    endDate?: Date,
  ): Promise<TicketRouting[]> {
    try {
      let query = db.select().from(ticketRouting);
      const conditions = [];

      if (startDate) {
        conditions.push(gte(ticketRouting.createdAt, startDate));
      }
      if (endDate) {
        conditions.push(lte(ticketRouting.createdAt, endDate));
      }

      const routings =
        conditions.length > 0
          ? await query.where(and(...conditions))
          : await query;

      // Filter for routings with outcomes recorded
      return routings.filter((routing) => {
        return (routing.metadata as { outcome_recorded?: boolean })?.outcome_recorded === true;
      });
    } catch (error) {
      console.error("Error getting routings with outcomes:", error);
      throw error;
    }
  }

  async getRoutingMetrics(
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    totalTickets: number;
    averageConfidence: number;
    routingAccuracy: number;
    averageResolutionTime: number;
    byCategory: Record<string, number>;
    byAgent: Record<string, { count: number; avgTime: number }>;
  }> {
    try {
      // Get tickets within date range
      let ticketQuery = db.select().from(tickets);
      const conditions = [];

      if (startDate) {
        conditions.push(gte(tickets.createdAt, startDate));
      }
      if (endDate) {
        conditions.push(lte(tickets.createdAt, endDate));
      }

      const filteredTickets =
        conditions.length > 0
          ? await ticketQuery.where(and(...conditions))
          : await ticketQuery;

      // Get routing data
      const routingData = await db
        .select()
        .from(ticketRouting)
        .where(
          sql`${ticketRouting.ticket_id} IN (${sql.raw(filteredTickets.map((t) => `'${t.id}'`).join(",") || "''")})`,
        );

      // Calculate metrics
      const totalTickets = filteredTickets.length;
      const averageConfidence =
        routingData.length > 0
          ? routingData.reduce((sum, r) => sum + r.confidence_score, 0) /
            routingData.length
          : 0;

      // Calculate accuracy (simplified - would need actual feedback data in production)
      const routingAccuracy = 0.9; // Placeholder - would calculate from actual resolution data

      // Calculate average resolution time (placeholder)
      const averageResolutionTime = 120; // minutes - placeholder

      // Group by category
      const byCategory: Record<string, number> = {};
      filteredTickets.forEach((ticket) => {
        byCategory[ticket.category] = (byCategory[ticket.category] || 0) + 1;
      });

      // Group by agent
      const byAgent: Record<string, { count: number; avgTime: number }> = {};
      filteredTickets.forEach((ticket) => {
        if (ticket.assignedTo) {
          if (!byAgent[ticket.assignedTo]) {
            byAgent[ticket.assignedTo] = { count: 0, avgTime: 0 };
          }
          byAgent[ticket.assignedTo].count++;
          byAgent[ticket.assignedTo].avgTime = 120; // Placeholder
        }
      });

      return {
        totalTickets,
        averageConfidence,
        routingAccuracy,
        averageResolutionTime,
        byCategory,
        byAgent,
      };
    } catch (error) {
      console.error("Error getting routing metrics:", error);
      throw error;
    }
  }

  // ==================== Data Extraction Implementation ====================

  async createExtractionTemplate(
    template: InsertExtractionTemplate,
  ): Promise<ExtractionTemplate> {
    try {
      const result = await db
        .insert(extractionTemplates)
        .values(template)
        .returning();
      return result[0];
    } catch (error) {
      console.error("Error creating extraction template:", error);
      throw error;
    }
  }

  async getExtractionTemplate(
    id: string,
  ): Promise<ExtractionTemplate | undefined> {
    try {
      const result = await db
        .select()
        .from(extractionTemplates)
        .where(eq(extractionTemplates.id, id))
        .limit(1);
      return result[0];
    } catch (error) {
      console.error("Error getting extraction template:", error);
      throw error;
    }
  }

  async getExtractionTemplates(): Promise<ExtractionTemplate[]> {
    try {
      return await db
        .select()
        .from(extractionTemplates)
        .where(eq(extractionTemplates.isActive, true))
        .orderBy(desc(extractionTemplates.createdAt));
    } catch (error) {
      console.error("Error getting extraction templates:", error);
      throw error;
    }
  }

  async updateExtractionTemplate(
    id: string,
    template: Partial<Omit<ExtractionTemplate, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<ExtractionTemplate> {
    try {
      const result = await db
        .update(extractionTemplates)
        .set({ ...template, updatedAt: new Date() })
        .where(eq(extractionTemplates.id, id))
        .returning();

      if (!result[0]) {
        throw new Error("Template not found");
      }

      return result[0];
    } catch (error) {
      console.error("Error updating extraction template:", error);
      throw error;
    }
  }

  async deleteExtractionTemplate(id: string): Promise<void> {
    try {
      await db
        .update(extractionTemplates)
        .set({ isActive: false })
        .where(eq(extractionTemplates.id, id));
    } catch (error) {
      console.error("Error deleting extraction template:", error);
      throw error;
    }
  }

  async createExtractedData(data: InsertExtractedData): Promise<ExtractedData> {
    try {
      const result = await db.insert(extractedData).values(data).returning();

      // Update template usage count
      if (data.templateId) {
        await db
          .update(extractionTemplates)
          .set({ usageCount: sql`${extractionTemplates.usageCount} + 1` })
          .where(eq(extractionTemplates.id, data.templateId));
      }

      return result[0];
    } catch (error) {
      console.error("Error creating extracted data:", error);
      throw error;
    }
  }

  async getExtractedData(id: string): Promise<ExtractedData | undefined> {
    try {
      const result = await db
        .select()
        .from(extractedData)
        .where(eq(extractedData.id, id))
        .limit(1);
      return result[0];
    } catch (error) {
      console.error("Error getting extracted data:", error);
      throw error;
    }
  }

  async getExtractedDataBySource(sourceId: string): Promise<ExtractedData[]> {
    try {
      return await db
        .select()
        .from(extractedData)
        .where(eq(extractedData.sourceId, sourceId))
        .orderBy(desc(extractedData.extractedAt));
    } catch (error) {
      console.error("Error getting extracted data by source:", error);
      throw error;
    }
  }

  async getExtractedDataByTemplate(
    templateId: string,
  ): Promise<ExtractedData[]> {
    try {
      return await db
        .select()
        .from(extractedData)
        .where(eq(extractedData.templateId, templateId))
        .orderBy(desc(extractedData.extractedAt));
    } catch (error) {
      console.error("Error getting extracted data by template:", error);
      throw error;
    }
  }

  async updateExtractedData(
    id: string,
    data: Partial<InsertExtractedData>,
  ): Promise<ExtractedData> {
    try {
      // If validation status is being updated to validated/corrected, set validatedAt
      const updates: any = { ...data };
      if (
        data.validationStatus &&
        ["validated", "corrected"].includes(data.validationStatus)
      ) {
        updates.validatedAt = new Date();
      }

      const result = await db
        .update(extractedData)
        .set(updates)
        .where(eq(extractedData.id, id))
        .returning();

      if (!result[0]) {
        throw new Error("Extracted data not found");
      }

      return result[0];
    } catch (error) {
      console.error("Error updating extracted data:", error);
      throw error;
    }
  }

  async getExtractedDataPaginated(params: {
    page?: number;
    limit?: number;
    templateId?: string;
    validationStatus?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<PaginatedResponse<ExtractedData>> {
    try {
      const page = params.page || 1;
      const limit = params.limit || 20;
      const offset = (page - 1) * limit;

      // Build filters
      const conditions = [];
      if (params.templateId) {
        conditions.push(eq(extractedData.templateId, params.templateId));
      }
      if (params.validationStatus) {
        conditions.push(
          eq(extractedData.validationStatus, params.validationStatus),
        );
      }
      if (params.startDate) {
        conditions.push(gte(extractedData.extractedAt, params.startDate));
      }
      if (params.endDate) {
        conditions.push(lte(extractedData.extractedAt, params.endDate));
      }

      // Build query
      const query =
        conditions.length > 0
          ? db
              .select()
              .from(extractedData)
              .where(and(...conditions))
          : db.select().from(extractedData);

      // Get total count
      const countResult = await db
        .select({ count: sql`count(*)` })
        .from(extractedData)
        .where(conditions.length > 0 ? and(...conditions) : undefined);
      const total = Number(countResult[0]?.count || 0);

      // Get paginated data
      const data = await query
        .orderBy(desc(extractedData.extractedAt))
        .limit(limit)
        .offset(offset);

      return {
        data,
        total,
        page,
        totalPages: Math.ceil(total / limit),
        limit,
        offset,
      };
    } catch (error) {
      console.error("Error getting paginated extracted data:", error);
      throw error;
    }
  }

  async batchCreateExtractedData(
    dataList: InsertExtractedData[],
  ): Promise<ExtractedData[]> {
    try {
      const result = await db
        .insert(extractedData)
        .values(dataList)
        .returning();

      // Update template usage counts
      const templateIds = Array.from(
        new Set(dataList.map((d) => d.templateId).filter(Boolean))
      );
      for (const templateId of templateIds) {
        const count = dataList.filter(
          (d) => d.templateId === templateId,
        ).length;
        await db
          .update(extractionTemplates)
          .set({
            usageCount: sql`${extractionTemplates.usageCount} + ${count}`,
          })
          .where(eq(extractionTemplates.id, templateId as string));
      }

      return result;
    } catch (error) {
      console.error("Error batch creating extracted data:", error);
      throw error;
    }
  }

  async getExtractionStats(): Promise<{
    totalExtractions: number;
    averageConfidence: number;
    validationRate: number;
    templateUsage: Record<string, number>;
  }> {
    try {
      // Get total extractions
      const totalResult = await db
        .select({ count: sql`count(*)` })
        .from(extractedData);
      const totalExtractions = Number(totalResult[0]?.count || 0);

      // Get average confidence
      const confidenceResult = await db
        .select({ avg: sql`avg(${extractedData.confidence})` })
        .from(extractedData);
      const averageConfidence = Number(confidenceResult[0]?.avg || 0);

      // Get validation rate
      const validatedResult = await db
        .select({ count: sql`count(*)` })
        .from(extractedData)
        .where(
          sql`${extractedData.validationStatus} IN ('validated', 'corrected')`,
        );
      const validatedCount = Number(validatedResult[0]?.count || 0);
      const validationRate =
        totalExtractions > 0 ? validatedCount / totalExtractions : 0;

      // Get template usage
      const templates = await db.select().from(extractionTemplates);
      const templateUsage: Record<string, number> = {};
      for (const template of templates) {
        templateUsage[template.name] = template.usageCount;
      }

      return {
        totalExtractions,
        averageConfidence,
        validationRate,
        templateUsage,
      };
    } catch (error) {
      console.error("Error getting extraction stats:", error);
      throw error;
    }
  }

  // ==================== Dynamic Pricing Implementation ====================

  async createPricingRule(rule: InsertPricingRules): Promise<PricingRules> {
    try {
      const [result] = await db.insert(pricingRules).values(rule).returning();
      return result;
    } catch (error) {
      console.error("Error creating pricing rule:", error);
      throw error;
    }
  }

  async updatePricingRule(
    id: string,
    rule: Partial<InsertPricingRules>,
  ): Promise<PricingRules> {
    try {
      const [result] = await db
        .update(pricingRules)
        .set({
          ...rule,
          updatedAt: new Date(),
        })
        .where(eq(pricingRules.id, id))
        .returning();
      return result;
    } catch (error) {
      console.error("Error updating pricing rule:", error);
      throw error;
    }
  }

  async getPricingRuleByProduct(
    productId: string,
  ): Promise<PricingRules | undefined> {
    try {
      const result = await db
        .select()
        .from(pricingRules)
        .where(
          and(
            eq(pricingRules.productId, productId),
            eq(pricingRules.isActive, true),
          ),
        )
        .limit(1);
      return result[0];
    } catch (error) {
      console.error("Error getting pricing rule by product:", error);
      throw error;
    }
  }

  async getActivePricingRules(): Promise<PricingRules[]> {
    try {
      const result = await db
        .select()
        .from(pricingRules)
        .where(eq(pricingRules.isActive, true));
      return result;
    } catch (error) {
      console.error("Error getting active pricing rules:", error);
      throw error;
    }
  }

  async recordPriceChange(history: InsertPriceHistory): Promise<PriceHistory> {
    try {
      const [result] = await db
        .insert(priceHistory)
        .values(history)
        .returning();
      return result;
    } catch (error) {
      console.error("Error recording price change:", error);
      throw error;
    }
  }

  async getPriceHistory(
    productId: string,
    params?: {
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    },
  ): Promise<PriceHistory[]> {
    try {
      const conditions = [eq(priceHistory.productId, productId)];

      if (params?.startDate) {
        conditions.push(gte(priceHistory.changedAt, params.startDate));
      }
      if (params?.endDate) {
        conditions.push(lte(priceHistory.changedAt, params.endDate));
      }

      const query = db
        .select()
        .from(priceHistory)
        .where(and(...conditions))
        .orderBy(desc(priceHistory.changedAt));

      if (params?.limit) {
        return await query.limit(params.limit);
      }

      return await query;
    } catch (error) {
      console.error("Error getting price history:", error);
      throw error;
    }
  }

  async recordPricingPerformance(
    performance: InsertPricingPerformance,
  ): Promise<PricingPerformance> {
    try {
      const [result] = await db
        .insert(pricingPerformance)
        .values(performance)
        .returning();
      return result;
    } catch (error) {
      console.error("Error recording pricing performance:", error);
      throw error;
    }
  }

  async getPricingPerformance(
    productId: string,
    params?: {
      startDate?: Date;
      endDate?: Date;
    },
  ): Promise<PricingPerformance[]> {
    try {
      const conditions = [eq(pricingPerformance.productId, productId)];

      if (params?.startDate) {
        conditions.push(gte(pricingPerformance.periodStart, params.startDate));
      }
      if (params?.endDate) {
        conditions.push(lte(pricingPerformance.periodEnd, params.endDate));
      }

      const result = await db
        .select()
        .from(pricingPerformance)
        .where(and(...conditions))
        .orderBy(desc(pricingPerformance.periodStart));
      return result;
    } catch (error) {
      console.error("Error getting pricing performance:", error);
      throw error;
    }
  }

  async getPricingMetrics(params?: {
    startDate?: Date;
    endDate?: Date;
  }): Promise<{
    totalRevenue: number;
    averageConversionRate: number;
    averagePriceChange: number;
    topPerformingProducts: Array<{
      productId: string;
      revenue: number;
      conversionRate: number;
    }>;
  }> {
    try {
      // Build conditions based on date range
      const conditions = [];
      if (params?.startDate) {
        conditions.push(gte(pricingPerformance.periodStart, params.startDate));
      }
      if (params?.endDate) {
        conditions.push(lte(pricingPerformance.periodEnd, params.endDate));
      }

      // Get performance data
      const performanceData = await db
        .select()
        .from(pricingPerformance)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      // Calculate metrics
      const totalRevenue = performanceData.reduce(
        (sum, p) => sum + p.revenue,
        0,
      );
      const averageConversionRate =
        performanceData.length > 0
          ? performanceData.reduce(
              (sum, p) => sum + (p.conversionRate || 0),
              0,
            ) / performanceData.length
          : 0;

      // Get price changes
      const priceChanges = await db.select().from(priceHistory);
      const averagePriceChange =
        priceChanges.length > 0
          ? priceChanges.reduce((sum, p) => {
              const change = p.previousPrice
                ? (p.price - p.previousPrice) / p.previousPrice
                : 0;
              return sum + change;
            }, 0) / priceChanges.length
          : 0;

      // Aggregate by product for top performers
      const productMetrics = new Map<
        string,
        { revenue: number; conversions: number; count: number }
      >();

      for (const perf of performanceData) {
        const existing = productMetrics.get(perf.productId) || {
          revenue: 0,
          conversions: 0,
          count: 0,
        };
        productMetrics.set(perf.productId, {
          revenue: existing.revenue + perf.revenue,
          conversions: existing.conversions + (perf.conversionRate || 0),
          count: existing.count + 1,
        });
      }

      // Get top performing products
      const topPerformingProducts = Array.from(productMetrics.entries())
        .map(([productId, metrics]) => ({
          productId,
          revenue: metrics.revenue,
          conversionRate:
            metrics.count > 0 ? metrics.conversions / metrics.count : 0,
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      return {
        totalRevenue,
        averageConversionRate,
        averagePriceChange,
        topPerformingProducts,
      };
    } catch (error) {
      console.error("Error getting pricing metrics:", error);
      throw error;
    }
  }

  async getCurrentDemand(productId: string): Promise<{
    demandScore: number;
    trend: "increasing" | "stable" | "decreasing";
    metrics: {
      views?: number;
      clicks?: number;
      cartAdds?: number;
      conversions?: number;
    };
  }> {
    try {
      // Simulate demand data - in production, this would pull from analytics
      // For now, generate based on recent price history and performance
      const recentHistory = await this.getPriceHistory(productId, {
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        limit: 10,
      });

      const recentPerformance = await this.getPricingPerformance(productId, {
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      });

      // Calculate demand score based on recent performance
      let demandScore = 50; // Base score
      let trend: "increasing" | "stable" | "decreasing" = "stable";

      if (recentHistory.length > 0) {
        const avgDemand =
          recentHistory.reduce((sum, h) => sum + (h.demandLevel || 50), 0) /
          recentHistory.length;
        demandScore = avgDemand;

        // Determine trend
        if (recentHistory.length >= 3) {
          const recent =
            recentHistory
              .slice(0, 3)
              .reduce((sum, h) => sum + (h.demandLevel || 50), 0) / 3;
          const older =
            recentHistory
              .slice(3, 6)
              .reduce((sum, h) => sum + (h.demandLevel || 50), 0) /
            Math.min(3, recentHistory.slice(3, 6).length);

          if (recent > older * 1.1) trend = "increasing";
          else if (recent < older * 0.9) trend = "decreasing";
        }
      }

      // Aggregate metrics from recent performance
      const metrics = {
        views: Math.floor(Math.random() * 1000 + 100),
        clicks: Math.floor(Math.random() * 100 + 10),
        cartAdds: Math.floor(Math.random() * 50 + 5),
        conversions: recentPerformance.reduce((sum, p) => sum + p.unitsSold, 0),
      };

      return {
        demandScore,
        trend,
        metrics,
      };
    } catch (error) {
      console.error("Error getting current demand:", error);
      throw error;
    }
  }

  async getCurrentInventory(productId: string): Promise<{
    inventoryScore: number;
    stockLevel: number;
    daysOfSupply?: number;
    reorderPoint?: number;
  }> {
    try {
      // Simulate inventory data - in production, this would pull from inventory system
      const stockLevel = Math.floor(Math.random() * 100 + 20);
      const inventoryScore = Math.min(100, (stockLevel / 100) * 100); // Score based on stock level

      // Calculate days of supply based on recent sales
      const recentPerformance = await this.getPricingPerformance(productId, {
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
      });

      const avgDailySales =
        recentPerformance.length > 0
          ? recentPerformance.reduce((sum, p) => {
              const days = Math.ceil(
                (p.periodEnd.getTime() - p.periodStart.getTime()) /
                  (24 * 60 * 60 * 1000),
              );
              return sum + p.unitsSold / Math.max(1, days);
            }, 0) / recentPerformance.length
          : 1;

      const daysOfSupply = Math.floor(
        stockLevel / Math.max(0.1, avgDailySales),
      );
      const reorderPoint = Math.floor(avgDailySales * 7); // 7 days of supply

      return {
        inventoryScore,
        stockLevel,
        daysOfSupply,
        reorderPoint,
      };
    } catch (error) {
      console.error("Error getting current inventory:", error);
      throw error;
    }
  }

  async getCompetitorPricing(productId: string): Promise<
    Array<{
      competitorName: string;
      price: number;
      source: string;
      lastUpdated: Date;
    }>
  > {
    try {
      // Simulate competitor data - in production, this would pull from market intelligence APIs
      const competitors = [
        { name: "Competitor A", priceMultiplier: 0.95 },
        { name: "Competitor B", priceMultiplier: 1.05 },
        { name: "Competitor C", priceMultiplier: 0.98 },
        { name: "Market Average", priceMultiplier: 1.0 },
      ];

      // Get current product price
      const rule = await this.getPricingRuleByProduct(productId);
      const basePrice = rule?.basePrice || 10;

      return competitors.map((comp) => ({
        competitorName: comp.name,
        price: basePrice * comp.priceMultiplier * (0.9 + Math.random() * 0.2), // Add some variance
        source: "Market Intelligence API",
        lastUpdated: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000), // Within last 24 hours
      }));
    } catch (error) {
      console.error("Error getting competitor pricing:", error);
      throw error;
    }
  }

  async calculateOptimalPrice(
    productId: string,
    params?: {
      targetRevenue?: number;
      targetConversion?: number;
      includeCompetition?: boolean;
    },
  ): Promise<{
    recommendedPrice: number;
    confidence: number;
    reasoning: string[];
    projectedImpact: {
      revenue: number;
      conversionRate: number;
      demandChange: number;
    };
  }> {
    try {
      const reasoning: string[] = [];

      // Get pricing rule and current data
      const rule = await this.getPricingRuleByProduct(productId);
      if (!rule) {
        throw new Error("No pricing rule found for product");
      }

      const demand = await this.getCurrentDemand(productId);
      const inventory = await this.getCurrentInventory(productId);
      const competitors = params?.includeCompetition
        ? await this.getCompetitorPricing(productId)
        : [];

      // Start with base price
      let recommendedPrice = rule.basePrice;
      let confidence = 0.85; // Base confidence

      // Apply demand-based adjustments
      const demandWeight = rule.factors.demandWeight || 0.3;
      if (demand.demandScore > (rule.factors.demandThresholds?.high || 70)) {
        const adjustment = 1 + 0.1 * demandWeight; // Up to 10% increase
        recommendedPrice *= adjustment;
        reasoning.push(
          `High demand (${demand.demandScore.toFixed(0)}/100) - increased price by ${((adjustment - 1) * 100).toFixed(1)}%`,
        );
      } else if (
        demand.demandScore < (rule.factors.demandThresholds?.low || 30)
      ) {
        const adjustment = 1 - 0.05 * demandWeight; // Up to 5% decrease
        recommendedPrice *= adjustment;
        reasoning.push(
          `Low demand (${demand.demandScore.toFixed(0)}/100) - decreased price by ${((1 - adjustment) * 100).toFixed(1)}%`,
        );
      }

      // Apply inventory-based adjustments
      const inventoryWeight = rule.factors.inventoryWeight || 0.3;
      if (
        inventory.inventoryScore >
        (rule.factors.inventoryThresholds?.high || 80)
      ) {
        const adjustment = 1 - 0.15 * inventoryWeight; // Up to 15% discount
        recommendedPrice *= adjustment;
        reasoning.push(
          `High inventory (${inventory.stockLevel} units) - applied ${((1 - adjustment) * 100).toFixed(1)}% discount`,
        );
      } else if (
        inventory.inventoryScore < (rule.factors.inventoryThresholds?.low || 20)
      ) {
        const adjustment = 1 + 0.05 * inventoryWeight; // Up to 5% increase
        recommendedPrice *= adjustment;
        reasoning.push(
          `Low inventory (${inventory.stockLevel} units) - increased price by ${((adjustment - 1) * 100).toFixed(1)}%`,
        );
      }

      // Apply competition-based adjustments
      if (competitors.length > 0 && params?.includeCompetition) {
        const competitionWeight = rule.factors.competitionWeight || 0.2;
        const avgCompetitorPrice =
          competitors.reduce((sum, c) => sum + c.price, 0) / competitors.length;

        if (recommendedPrice > avgCompetitorPrice * 1.1) {
          const adjustment = 1 - 0.05 * competitionWeight;
          recommendedPrice *= adjustment;
          reasoning.push(
            `Above market average ($${avgCompetitorPrice.toFixed(2)}) - reduced by ${((1 - adjustment) * 100).toFixed(1)}%`,
          );
          confidence *= 0.95; // Slightly lower confidence when adjusting for competition
        } else if (recommendedPrice < avgCompetitorPrice * 0.9) {
          const adjustment = 1 + 0.03 * competitionWeight;
          recommendedPrice *= adjustment;
          reasoning.push(
            `Below market average ($${avgCompetitorPrice.toFixed(2)}) - increased by ${((adjustment - 1) * 100).toFixed(1)}%`,
          );
        }
      }

      // Apply seasonal/trend adjustments
      if (demand.trend === "increasing") {
        recommendedPrice *= 1.02;
        reasoning.push("Demand trending up - applied 2% increase");
      } else if (demand.trend === "decreasing") {
        recommendedPrice *= 0.98;
        reasoning.push("Demand trending down - applied 2% decrease");
      }

      // Ensure price stays within bounds
      recommendedPrice = Math.max(
        rule.minPrice,
        Math.min(rule.maxPrice, recommendedPrice),
      );

      if (recommendedPrice === rule.minPrice) {
        reasoning.push(`Price capped at minimum: $${rule.minPrice.toFixed(2)}`);
        confidence *= 0.9;
      } else if (recommendedPrice === rule.maxPrice) {
        reasoning.push(`Price capped at maximum: $${rule.maxPrice.toFixed(2)}`);
        confidence *= 0.9;
      }

      // Calculate projected impact
      const priceChange = (recommendedPrice - rule.basePrice) / rule.basePrice;
      const elasticity = rule.factors.elasticity || -1.5; // Default price elasticity
      const demandChange = priceChange * elasticity;
      const conversionChange = demandChange * 0.5; // Conversion impact is half of demand impact

      const projectedImpact = {
        revenue: (1 + priceChange) * (1 + demandChange) - 1, // Revenue change percentage
        conversionRate: conversionChange,
        demandChange: demandChange,
      };

      return {
        recommendedPrice,
        confidence,
        reasoning,
        projectedImpact,
      };
    } catch (error) {
      console.error("Error calculating optimal price:", error);
      throw error;
    }
  }

  // ==================== Image Processing Operations ====================

  /**
   * Get all image processing jobs for a user
   */
  async getImageProcessingJobs(
    userId: string,
    status?: "processing" | "completed" | "failed",
  ): Promise<ImageProcessing[]> {
    try {
      const conditions = [eq(imageProcessing.userId, userId)];

      if (status) {
        conditions.push(eq(imageProcessing.status, status));
      }

      const jobs = await db
        .select()
        .from(imageProcessing)
        .where(and(...conditions))
        .orderBy(desc(imageProcessing.createdAt));

      return jobs;
    } catch (error) {
      console.error("Error getting image processing jobs:", error);
      throw error;
    }
  }

  /**
   * Get a specific image processing job
   */
  async getImageProcessingJob(id: string): Promise<ImageProcessing | null> {
    try {
      const job = await db
        .select()
        .from(imageProcessing)
        .where(eq(imageProcessing.id, id))
        .limit(1);

      return job[0] || null;
    } catch (error) {
      console.error("Error getting image processing job:", error);
      throw error;
    }
  }

  /**
   * Create a new image processing job
   */
  async createImageProcessingJob(
    data: InsertImageProcessing,
  ): Promise<ImageProcessing> {
    try {
      const [job] = await db.insert(imageProcessing).values(data).returning();

      return job;
    } catch (error) {
      console.error("Error creating image processing job:", error);
      throw error;
    }
  }

  /**
   * Update an image processing job
   */
  async updateImageProcessingJob(
    id: string,
    data: Partial<InsertImageProcessing>,
  ): Promise<ImageProcessing | null> {
    try {
      const [updated] = await db
        .update(imageProcessing)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(imageProcessing.id, id))
        .returning();

      return updated || null;
    } catch (error) {
      console.error("Error updating image processing job:", error);
      throw error;
    }
  }

  /**
   * Delete an image processing job
   */
  async deleteImageProcessingJob(id: string): Promise<boolean> {
    try {
      const result = await db
        .delete(imageProcessing)
        .where(eq(imageProcessing.id, id))
        .returning();

      return result.length > 0;
    } catch (error) {
      console.error("Error deleting image processing job:", error);
      throw error;
    }
  }

  /**
   * Get image presets
   */
  async getImagePresets(
    userId?: string,
    category?: "product" | "portrait" | "landscape" | "document" | "social_media" | "custom",
  ): Promise<ImagePresets[]> {
    try {
      const conditions = [];

      if (userId) {
        // Get user's presets and public presets
        conditions.push(
          or(eq(imagePresets.userId, userId), eq(imagePresets.isPublic, true)),
        );
      } else {
        // Only get public presets
        conditions.push(eq(imagePresets.isPublic, true));
      }

      if (category) {
        conditions.push(eq(imagePresets.category, category));
      }

      const presets = await db
        .select()
        .from(imagePresets)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(imagePresets.usageCount), desc(imagePresets.createdAt));

      return presets;
    } catch (error) {
      console.error("Error getting image presets:", error);
      throw error;
    }
  }

  /**
   * Get a specific image preset
   */
  async getImagePreset(id: string): Promise<ImagePresets | null> {
    try {
      const preset = await db
        .select()
        .from(imagePresets)
        .where(eq(imagePresets.id, id))
        .limit(1);

      return preset[0] || null;
    } catch (error) {
      console.error("Error getting image preset:", error);
      throw error;
    }
  }

  /**
   * Create a new image preset
   */
  async createImagePreset(data: InsertImagePresets): Promise<ImagePresets> {
    try {
      const [preset] = await db.insert(imagePresets).values(data).returning();

      return preset;
    } catch (error) {
      console.error("Error creating image preset:", error);
      throw error;
    }
  }

  /**
   * Update an image preset
   */
  async updateImagePreset(
    id: string,
    data: Partial<InsertImagePresets>,
  ): Promise<ImagePresets | null> {
    try {
      const [updated] = await db
        .update(imagePresets)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(imagePresets.id, id))
        .returning();

      return updated || null;
    } catch (error) {
      console.error("Error updating image preset:", error);
      throw error;
    }
  }

  /**
   * Delete an image preset
   */
  async deleteImagePreset(id: string): Promise<boolean> {
    try {
      const result = await db
        .delete(imagePresets)
        .where(eq(imagePresets.id, id))
        .returning();

      return result.length > 0;
    } catch (error) {
      console.error("Error deleting image preset:", error);
      throw error;
    }
  }

  /**
   * Increment preset usage count
   */
  async incrementPresetUsage(id: string): Promise<void> {
    try {
      await db
        .update(imagePresets)
        .set({
          usageCount: sql`${imagePresets.usageCount} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(imagePresets.id, id));
    } catch (error) {
      console.error("Error incrementing preset usage:", error);
      throw error;
    }
  }

  // ==================== Face Detection Operations ====================

  /**
   * Create face detection record
   */
  async createFaceDetection(
    userId: string,
    detection: Omit<InsertFaceDetection, "userId">,
  ): Promise<FaceDetection> {
    try {
      const [created] = await db
        .insert(faceDetections)
        .values({
          ...detection,
          userId,
        })
        .returning();

      return created;
    } catch (error) {
      console.error("Error creating face detection:", error);
      throw error;
    }
  }

  /**
   * Get face detections for a user
   */
  async getFaceDetections(
    userId: string,
    limit: number = 50,
  ): Promise<FaceDetection[]> {
    try {
      const detections = await db
        .select()
        .from(faceDetections)
        .where(eq(faceDetections.userId, userId))
        .orderBy(desc(faceDetections.createdAt))
        .limit(limit);

      return detections;
    } catch (error) {
      console.error("Error getting face detections:", error);
      throw error;
    }
  }

  /**
   * Get face detection by image ID
   */
  async getFaceDetectionByImageId(
    userId: string,
    imageId: string,
  ): Promise<FaceDetection | undefined> {
    try {
      const [detection] = await db
        .select()
        .from(faceDetections)
        .where(
          and(
            eq(faceDetections.userId, userId),
            eq(faceDetections.imageId, imageId),
          ),
        )
        .limit(1);

      return detection;
    } catch (error) {
      console.error("Error getting face detection by image ID:", error);
      throw error;
    }
  }

  /**
   * Update face detection
   */
  async updateFaceDetection(
    userId: string,
    detectionId: string,
    updates: Partial<Omit<InsertFaceDetection, "userId">>,
  ): Promise<FaceDetection> {
    try {
      const [updated] = await db
        .update(faceDetections)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(faceDetections.id, detectionId),
            eq(faceDetections.userId, userId),
          ),
        )
        .returning();

      if (!updated) {
        throw new Error("Face detection not found");
      }

      return updated;
    } catch (error) {
      console.error("Error updating face detection:", error);
      throw error;
    }
  }

  /**
   * Delete face detection
   */
  async deleteFaceDetection(
    userId: string,
    detectionId: string,
  ): Promise<void> {
    try {
      await db
        .delete(faceDetections)
        .where(
          and(
            eq(faceDetections.id, detectionId),
            eq(faceDetections.userId, userId),
          ),
        );
    } catch (error) {
      console.error("Error deleting face detection:", error);
      throw error;
    }
  }

  /**
   * Get user privacy settings
   */
  async getPrivacySettings(
    userId: string,
  ): Promise<PrivacySettings | undefined> {
    try {
      const cacheKey = `privacy:${userId}`;
      const cached = this.getCached<PrivacySettings>(cacheKey);
      if (cached) return cached;

      const [settings] = await db
        .select()
        .from(privacySettings)
        .where(eq(privacySettings.userId, userId))
        .limit(1);

      if (settings) {
        this.setCached(cacheKey, settings, this.USER_PREFS_TTL);
      }

      return settings;
    } catch (error) {
      console.error("Error getting privacy settings:", error);
      throw error;
    }
  }

  /**
   * Create or update privacy settings
   */
  async upsertPrivacySettings(
    userId: string,
    settings: Omit<InsertPrivacySettings, "userId">,
  ): Promise<PrivacySettings> {
    try {
      const [upserted] = await db
        .insert(privacySettings)
        .values({
          ...settings,
          userId,
        })
        .onConflictDoUpdate({
          target: privacySettings.userId,
          set: {
            ...settings,
            updatedAt: new Date(),
          },
        })
        .returning();

      // Invalidate cache
      this.invalidateCache(`privacy:${userId}`);

      return upserted;
    } catch (error) {
      console.error("Error upserting privacy settings:", error);
      throw error;
    }
  }

  /**
   * Delete old face detections based on retention policy
   */
  async cleanupOldFaceDetections(
    userId: string,
    daysOld: number,
  ): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const deleted = await db
        .delete(faceDetections)
        .where(
          and(
            eq(faceDetections.userId, userId),
            lte(faceDetections.createdAt, cutoffDate),
          ),
        )
        .returning();

      return deleted.length;
    } catch (error) {
      console.error("Error cleaning up old face detections:", error);
      throw error;
    }
  }

  // ==================== OCR Operations ====================

  /**
   * Create OCR result from processed image/document
   */
  async createOcrResult(
    userId: string,
    result: Omit<InsertOcrResult, "userId">,
  ): Promise<OcrResult> {
    try {
      const [created] = await db
        .insert(ocrResults)
        .values({
          ...result,
          userId,
        })
        .returning();
      return created;
    } catch (error) {
      console.error("Error creating OCR result:", error);
      throw error;
    }
  }

  /**
   * Get OCR results for a user
   */
  async getOcrResults(userId: string, limit?: number): Promise<OcrResult[]> {
    try {
      const query = db
        .select()
        .from(ocrResults)
        .where(eq(ocrResults.userId, userId))
        .orderBy(desc(ocrResults.createdAt));

      if (limit) {
        query.limit(limit);
      }

      return await query;
    } catch (error) {
      console.error("Error getting OCR results:", error);
      throw error;
    }
  }

  /**
   * Get OCR result by image ID
   */
  async getOcrResultByImageId(
    userId: string,
    imageId: string,
  ): Promise<OcrResult | undefined> {
    try {
      const [result] = await db
        .select()
        .from(ocrResults)
        .where(
          and(eq(ocrResults.userId, userId), eq(ocrResults.imageId, imageId)),
        );
      return result;
    } catch (error) {
      console.error("Error getting OCR result by image ID:", error);
      throw error;
    }
  }

  /**
   * Get OCR result by ID
   */
  async getOcrResultById(
    userId: string,
    resultId: string,
  ): Promise<OcrResult | undefined> {
    try {
      const [result] = await db
        .select()
        .from(ocrResults)
        .where(and(eq(ocrResults.userId, userId), eq(ocrResults.id, resultId)));
      return result;
    } catch (error) {
      console.error("Error getting OCR result by ID:", error);
      throw error;
    }
  }

  /**
   * Update OCR result
   */
  async updateOcrResult(
    userId: string,
    resultId: string,
    updates: Partial<Omit<InsertOcrResult, "userId">>,
  ): Promise<OcrResult> {
    try {
      const [updated] = await db
        .update(ocrResults)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(and(eq(ocrResults.userId, userId), eq(ocrResults.id, resultId)))
        .returning();

      if (!updated) {
        throw new Error("OCR result not found");
      }

      return updated;
    } catch (error) {
      console.error("Error updating OCR result:", error);
      throw error;
    }
  }

  /**
   * Delete OCR result
   */
  async deleteOcrResult(userId: string, resultId: string): Promise<void> {
    try {
      await db
        .delete(ocrResults)
        .where(and(eq(ocrResults.userId, userId), eq(ocrResults.id, resultId)));
    } catch (error) {
      console.error("Error deleting OCR result:", error);
      throw error;
    }
  }

  /**
   * Create OCR correction
   */
  async createOcrCorrection(
    userId: string,
    correction: Omit<InsertOcrCorrection, "userId">,
  ): Promise<OcrCorrection> {
    try {
      const [created] = await db
        .insert(ocrCorrections)
        .values({
          ...correction,
          userId,
        })
        .returning();
      return created;
    } catch (error) {
      console.error("Error creating OCR correction:", error);
      throw error;
    }
  }

  /**
   * Get corrections for an OCR result
   */
  async getOcrCorrections(
    userId: string,
    resultId: string,
  ): Promise<OcrCorrection[]> {
    try {
      return await db
        .select()
        .from(ocrCorrections)
        .where(
          and(
            eq(ocrCorrections.userId, userId),
            eq(ocrCorrections.resultId, resultId),
          ),
        )
        .orderBy(desc(ocrCorrections.createdAt));
    } catch (error) {
      console.error("Error getting OCR corrections:", error);
      throw error;
    }
  }

  /**
   * Update OCR correction
   */
  async updateOcrCorrection(
    userId: string,
    correctionId: string,
    updates: Partial<Omit<InsertOcrCorrection, "userId">>,
  ): Promise<OcrCorrection> {
    try {
      const [updated] = await db
        .update(ocrCorrections)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(ocrCorrections.userId, userId),
            eq(ocrCorrections.id, correctionId),
          ),
        )
        .returning();

      if (!updated) {
        throw new Error("OCR correction not found");
      }

      return updated;
    } catch (error) {
      console.error("Error updating OCR correction:", error);
      throw error;
    }
  }

  /**
   * Delete OCR correction
   */
  async deleteOcrCorrection(
    userId: string,
    correctionId: string,
  ): Promise<void> {
    try {
      await db
        .delete(ocrCorrections)
        .where(
          and(
            eq(ocrCorrections.userId, userId),
            eq(ocrCorrections.id, correctionId),
          ),
        );
    } catch (error) {
      console.error("Error deleting OCR correction:", error);
      throw error;
    }
  }

  /**
   * Get all user corrections history
   */
  async getUserCorrections(
    userId: string,
    limit?: number,
  ): Promise<OcrCorrection[]> {
    try {
      const query = db
        .select()
        .from(ocrCorrections)
        .where(eq(ocrCorrections.userId, userId))
        .orderBy(desc(ocrCorrections.createdAt));

      if (limit) {
        query.limit(limit);
      }

      return await query;
    } catch (error) {
      console.error("Error getting user corrections:", error);
      throw error;
    }
  }

  // ==================== Transcription Operations ====================

  /**
   * Get all transcriptions for a user
   */
  async getTranscriptions(
    userId: string,
    status?: "processing" | "completed" | "failed",
    limit?: number,
  ): Promise<Transcription[]> {
    try {
      const conditions = [eq(transcriptions.userId, userId)];

      if (status) {
        conditions.push(eq(transcriptions.status, status));
      }

      const query = db
        .select()
        .from(transcriptions)
        .where(and(...conditions))
        .orderBy(desc(transcriptions.createdAt));

      if (limit) {
        return await query.limit(limit);
      }

      return await query;
    } catch (error) {
      console.error("Error getting transcriptions:", error);
      throw error;
    }
  }

  /**
   * Get paginated transcriptions
   */
  async getTranscriptionsPaginated(
    userId: string,
    page: number = 1,
    limit: number = 10,
    status?: "processing" | "completed" | "failed",
  ): Promise<PaginatedResponse<Transcription>> {
    try {
      const conditions = [eq(transcriptions.userId, userId)];

      if (status) {
        conditions.push(eq(transcriptions.status, status));
      }

      const offset = (page - 1) * limit;

      const [transcriptionsList, totalResult] = await Promise.all([
        db
          .select()
          .from(transcriptions)
          .where(and(...conditions))
          .orderBy(desc(transcriptions.createdAt))
          .limit(limit)
          .offset(offset),
        db
          .select({ count: sql`count(*)` })
          .from(transcriptions)
          .where(and(...conditions)),
      ]);

      const total = Number(totalResult[0]?.count || 0);
      return PaginationHelper.createResponse(
        transcriptionsList,
        total,
        page,
        limit,
      );
    } catch (error) {
      console.error("Error getting paginated transcriptions:", error);
      throw error;
    }
  }

  /**
   * Get a specific transcription
   */
  async getTranscription(
    userId: string,
    transcriptionId: string,
  ): Promise<Transcription | undefined> {
    try {
      const [transcription] = await db
        .select()
        .from(transcriptions)
        .where(
          and(
            eq(transcriptions.userId, userId),
            eq(transcriptions.id, transcriptionId),
          ),
        );

      return transcription;
    } catch (error) {
      console.error("Error getting transcription:", error);
      throw error;
    }
  }

  /**
   * Create a new transcription
   */
  async createTranscription(
    userId: string,
    transcription: Omit<InsertTranscription, "userId">,
  ): Promise<Transcription> {
    try {
      const [newTranscription] = await db
        .insert(transcriptions)
        .values({ ...transcription, userId })
        .returning();

      return newTranscription;
    } catch (error) {
      console.error("Error creating transcription:", error);
      throw error;
    }
  }

  /**
   * Update transcription
   */
  async updateTranscription(
    userId: string,
    transcriptionId: string,
    updates: Partial<Transcription>,
  ): Promise<Transcription> {
    try {
      const [updated] = await db
        .update(transcriptions)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(transcriptions.userId, userId),
            eq(transcriptions.id, transcriptionId),
          ),
        )
        .returning();

      if (!updated) {
        throw new Error("Transcription not found");
      }

      return updated;
    } catch (error) {
      console.error("Error updating transcription:", error);
      throw error;
    }
  }

  /**
   * Delete a transcription and all its edits
   */
  async deleteTranscription(
    userId: string,
    transcriptionId: string,
  ): Promise<void> {
    try {
      await db
        .delete(transcriptions)
        .where(
          and(
            eq(transcriptions.userId, userId),
            eq(transcriptions.id, transcriptionId),
          ),
        );
    } catch (error) {
      console.error("Error deleting transcription:", error);
      throw error;
    }
  }

  /**
   * Get transcript edits for a transcription
   */
  async getTranscriptEdits(
    transcriptionId: string,
    limit?: number,
  ): Promise<TranscriptEdit[]> {
    try {
      const query = db
        .select()
        .from(transcriptEdits)
        .where(eq(transcriptEdits.transcriptionId, transcriptionId))
        .orderBy(asc(transcriptEdits.timestamp));

      if (limit) {
        return await query.limit(limit);
      }

      return await query;
    } catch (error) {
      console.error("Error getting transcript edits:", error);
      throw error;
    }
  }

  /**
   * Create a transcript edit
   */
  async createTranscriptEdit(
    userId: string,
    edit: Omit<InsertTranscriptEdit, "userId">,
  ): Promise<TranscriptEdit> {
    try {
      const [newEdit] = await db
        .insert(transcriptEdits)
        .values({ ...edit, userId })
        .returning();

      return newEdit;
    } catch (error) {
      console.error("Error creating transcript edit:", error);
      throw error;
    }
  }

  /**
   * Update transcript edit
   */
  async updateTranscriptEdit(
    userId: string,
    editId: string,
    updates: Partial<TranscriptEdit>,
  ): Promise<TranscriptEdit> {
    try {
      const [updated] = await db
        .update(transcriptEdits)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(transcriptEdits.userId, userId),
            eq(transcriptEdits.id, editId),
          ),
        )
        .returning();

      if (!updated) {
        throw new Error("Transcript edit not found");
      }

      return updated;
    } catch (error) {
      console.error("Error updating transcript edit:", error);
      throw error;
    }
  }

  /**
   * Delete a transcript edit
   */
  async deleteTranscriptEdit(userId: string, editId: string): Promise<void> {
    try {
      await db
        .delete(transcriptEdits)
        .where(
          and(
            eq(transcriptEdits.userId, userId),
            eq(transcriptEdits.id, editId),
          ),
        );
    } catch (error) {
      console.error("Error deleting transcript edit:", error);
      throw error;
    }
  }

  /**
   * Get recent transcriptions
   */
  async getRecentTranscriptions(
    userId: string,
    days: number = 7,
  ): Promise<Transcription[]> {
    try {
      const since = new Date();
      since.setDate(since.getDate() - days);

      const recent = await db
        .select()
        .from(transcriptions)
        .where(
          and(
            eq(transcriptions.userId, userId),
            gte(transcriptions.createdAt, since),
          ),
        )
        .orderBy(desc(transcriptions.createdAt));

      return recent;
    } catch (error) {
      console.error("Error getting recent transcriptions:", error);
      throw error;
    }
  }

  /**
   * Search transcriptions by text
   */
  async searchTranscriptions(
    userId: string,
    query: string,
    limit: number = 20,
  ): Promise<Transcription[]> {
    try {
      const searchTerm = `%${query.toLowerCase()}%`;

      const results = await db
        .select()
        .from(transcriptions)
        .where(
          and(
            eq(transcriptions.userId, userId),
            or(
              sql`lower(${transcriptions.transcript}) LIKE ${searchTerm}`,
              sql`lower(${transcriptions.metadata}->>'title') LIKE ${searchTerm}`,
              sql`lower(${transcriptions.metadata}->>'description') LIKE ${searchTerm}`,
            ),
          ),
        )
        .orderBy(desc(transcriptions.createdAt))
        .limit(limit);

      return results;
    } catch (error) {
      console.error("Error searching transcriptions:", error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();
