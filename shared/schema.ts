/**
 * =============================================================================
 * CHEFSP-AICE DATABASE SCHEMA
 * =============================================================================
 *
 * This file defines all database tables and types for the ChefSpAIce application.
 * It uses Drizzle ORM with PostgreSQL and Zod for validation.
 *
 * Key concepts:
 * - Tables are defined using pgTable() from drizzle-orm
 * - Insert schemas are created with createInsertSchema() from drizzle-zod
 * - Types are inferred for both insert operations and select queries
 *
 * The schema covers:
 * - User management and authentication
 * - User preferences and settings
 * - Data synchronization between devices
 * - Cooking terms reference data
 * - Kitchen appliances
 * - Nutrition tracking and corrections
 * - User feedback and bug reports
 * - Subscription management (Stripe integration)
 */

import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  integer,
  timestamp,
  index,
  boolean,
  uniqueIndex,
  jsonb,
  doublePrecision,
  serial,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// =============================================================================
// USER MANAGEMENT TABLES
// =============================================================================

/**
 * USERS TABLE
 *
 * Stores core user account information and preferences.
 * This is the central table that other tables reference via userId.
 *
 * Fields:
 * - id: UUID primary key, auto-generated
 * - password: Hashed password for email/password authentication
 * - displayName: User's chosen display name
 * - email: Required unique email address
 * - profileImageUrl: URL to user's profile picture
 *
 * Preference fields:
 * - dietaryRestrictions: Array of dietary needs (e.g., "vegetarian", "gluten-free")
 * - allergens: Array of food allergies (e.g., "peanuts", "shellfish")
 * - favoriteCategories: Preferred food categories
 * - expirationAlertDays: Days before expiration to send alerts (default: 3)
 * - storageAreasEnabled: Which storage areas user has (fridge, pantry, etc.)
 * - householdSize: Number of people in household (affects portion suggestions)
 * - cookingSkillLevel: "beginner", "intermediate", or "advanced"
 * - preferredUnits: "imperial" or "metric"
 * - foodsToAvoid: Foods user wants to avoid (separate from allergens)
 *
 * App state:
 * - hasCompletedOnboarding: Whether user finished initial setup
 * - notificationsEnabled: Master notification toggle
 * - notifyExpiringFood: Alert when food is about to expire
 * - notifyRecipeSuggestions: Send recipe ideas
 * - notifyMealReminders: Remind about planned meals
 * - notificationTime: Preferred time for notifications (24h format)
 * - isAdmin: Whether user has admin access
 *
 * Auth provider fields:
 * - primaryProvider: Main auth method ("email", "google", "apple")
 * - primaryProviderId: Provider's unique ID for this user
 *
 * Subscription fields:
 * - subscriptionTier: "PRO" (default: PRO)
 * - subscriptionStatus: "trialing", "active", "canceled", or "expired" (default: trialing)
 * - stripeCustomerId: Stripe customer ID for payment processing
 * - stripeSubscriptionId: Stripe subscription ID for managing subscription
 * - aiRecipesGeneratedThisMonth: Counter for AI recipe generation limit (resets monthly)
 * - aiRecipesResetDate: When the monthly AI recipe counter resets
 * - trialEndsAt: When the 7-day trial expires
 *
 * Pre-registration fields (for landing page signups):
 * - preRegistrationSource: Where the user signed up from ("landing", "app", etc.)
 * - preRegisteredAt: When the user pre-registered (before full activation)
 * - isActivated: Whether the user has completed registration (set password or linked social)
 */
export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  password: varchar("password"),
  displayName: varchar("display_name"),
  email: varchar("email").notNull().unique(),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  dietaryRestrictions: text("dietary_restrictions").array(),
  allergens: text("allergens").array(),
  favoriteCategories: text("favorite_categories").array(),
  expirationAlertDays: integer("expiration_alert_days").notNull().default(3),
  storageAreasEnabled: text("storage_areas_enabled").array(),
  householdSize: integer("household_size").notNull().default(2),
  dailyMeals: integer("daily_meals").notNull().default(3),
  cookingSkillLevel: text("cooking_skill_level").notNull().default("beginner"),
  preferredUnits: text("preferred_units").notNull().default("imperial"),
  foodsToAvoid: text("foods_to_avoid").array(),
  hasCompletedOnboarding: boolean("has_completed_onboarding")
    .notNull()
    .default(false),
  notificationsEnabled: boolean("notifications_enabled")
    .notNull()
    .default(false),
  notifyExpiringFood: boolean("notify_expiring_food").notNull().default(true),
  notifyRecipeSuggestions: boolean("notify_recipe_suggestions")
    .notNull()
    .default(false),
  notifyMealReminders: boolean("notify_meal_reminders").notNull().default(true),
  notificationTime: text("notification_time").default("09:00"),
  isAdmin: boolean("is_admin").notNull().default(false),
  primaryProvider: varchar("primary_provider"),
  primaryProviderId: varchar("primary_provider_id"),
  subscriptionTier: text("subscription_tier").notNull().default("PRO"),
  subscriptionStatus: text("subscription_status").notNull().default("trialing"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  aiRecipesGeneratedThisMonth: integer("ai_recipes_generated_this_month")
    .notNull()
    .default(0),
  aiRecipesResetDate: timestamp("ai_recipes_reset_date"),
  trialEndsAt: timestamp("trial_ends_at"),
  preRegistrationSource: varchar("pre_registration_source"),
  preRegisteredAt: timestamp("pre_registered_at"),
  privacyConsentedAt: timestamp("privacy_consented_at"),
  isActivated: boolean("is_activated").notNull().default(true),
  apiKeyHash: varchar("api_key_hash"),
  referralCode: varchar("referral_code", { length: 8 }).unique(),
  referredBy: varchar("referred_by"),
  aiRecipeBonusCredits: integer("ai_recipe_bonus_credits").notNull().default(0),
}, (table) => [
  index("idx_users_created_at").on(table.createdAt),
  index("idx_users_subscription_tier").on(table.subscriptionTier),
  index("idx_users_subscription_status").on(table.subscriptionStatus),
]);

/**
 * AUTH PROVIDERS TABLE
 *
 * Supports multiple authentication methods per user (email, Google, Apple).
 * Users can link multiple providers to the same account.
 *
 * Fields:
 * - provider: Auth provider name ("email", "google", "apple")
 * - providerId: Unique ID from the provider (e.g., Google user ID)
 * - providerEmail: Email associated with this provider
 * - accessToken/refreshToken: OAuth tokens for API access
 * - tokenExpiry: When the access token expires
 * - isPrimary: Whether this is the user's primary login method
 * - metadata: Additional provider-specific data (JSONB)
 *
 * Indexes ensure:
 * - Each provider+providerId combination is unique
 * - Fast lookup by userId
 */
export const authProviders = pgTable(
  "auth_providers",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: varchar("provider").notNull(),
    providerId: varchar("provider_id").notNull(),
    providerEmail: varchar("provider_email"),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    tokenExpiry: timestamp("token_expiry"),
    isPrimary: boolean("is_primary").default(false),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_auth_providers_provider_user").on(
      table.provider,
      table.providerId,
    ),
    index("idx_auth_providers_user").on(table.userId),
  ],
);

/**
 * USER SESSIONS TABLE
 *
 * Manages active login sessions for authenticated users.
 * Each session has a unique token that the client sends with API requests.
 *
 * Fields:
 * - token: Unique session token (sent in Authorization header)
 * - expiresAt: When the session becomes invalid
 *
 * Sessions are validated on each protected API request.
 * Expired sessions are periodically cleaned up.
 */
export const userSessions = pgTable(
  "user_sessions",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    userAgent: text("user_agent"),
    ipAddress: varchar("ip_address", { length: 45 }),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_user_sessions_user").on(table.userId),
    index("idx_user_sessions_expires").on(table.expiresAt),
  ],
);

export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_password_reset_user").on(table.userId),
    index("idx_password_reset_expires").on(table.expiresAt),
  ],
);

/**
 * USER SYNC DATA TABLE
 *
 * Stores user data for cloud synchronization between devices.
 * This enables the "local-first with cloud sync" architecture.
 *
 * All data is stored as JSON strings for flexibility:
 * - inventory: Food items in the user's pantry/fridge
 * - recipes: Saved and generated recipes
 * - mealPlans: Weekly/daily meal planning data
 * - shoppingList: Items to buy
 * - preferences: User preferences (cached from user table)
 * - cookware: Kitchen equipment the user has
 * - wasteLog: Record of discarded food (for waste tracking)
 * - consumedLog: Record of consumed food (for nutrition tracking)
 * - analytics: Usage statistics and insights
 * - onboarding: Onboarding flow progress
 * - customLocations: User-defined storage locations
 * - userProfile: Additional profile data
 *
 * Sync metadata:
 * - lastSyncedAt: When data was last synced
 * - updatedAt: When any field was last modified
 */
export const userSyncData = pgTable("user_sync_data", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" })
    .unique(),
  sectionUpdatedAt: jsonb("section_updated_at"),
  lastSyncedAt: timestamp("last_synced_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_user_sync_data_last_synced").on(table.lastSyncedAt),
]);

// =============================================================================
// NORMALIZED SYNC DATA TABLES
// =============================================================================

export const userInventoryItems = pgTable(
  "user_inventory_items",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    itemId: text("item_id").notNull(),
    name: text("name").notNull(),
    barcode: text("barcode"),
    quantity: doublePrecision("quantity").notNull().default(1),
    unit: text("unit").notNull().default("unit"),
    storageLocation: text("storage_location").notNull().default("pantry"),
    purchaseDate: text("purchase_date"),
    expirationDate: text("expiration_date"),
    category: text("category").notNull().default("other"),
    usdaCategory: text("usda_category"),
    nutrition: jsonb("nutrition"),
    notes: text("notes"),
    imageUri: text("image_uri"),
    fdcId: integer("fdc_id"),
    addedAt: timestamp("added_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    uniqueIndex("idx_user_inventory_user_item").on(table.userId, table.itemId),
    index("idx_user_inventory_user").on(table.userId),
    index("idx_user_inventory_user_category").on(table.userId, table.category),
    index("idx_user_inventory_user_expiration").on(table.userId, table.expirationDate),
    index("idx_user_inventory_user_deleted").on(table.userId, table.deletedAt),
    index("idx_user_inventory_cursor").on(table.userId, table.updatedAt, table.id),
  ],
);

export const insertUserInventoryItemSchema = createInsertSchema(userInventoryItems).omit({
  addedAt: true,
  updatedAt: true,
  deletedAt: true,
});
export type InsertUserInventoryItem = z.infer<typeof insertUserInventoryItemSchema>;
export type UserInventoryItem = typeof userInventoryItems.$inferSelect;

export const userSavedRecipes = pgTable(
  "user_saved_recipes",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    itemId: text("item_id").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    ingredients: jsonb("ingredients"),
    instructions: jsonb("instructions"),
    prepTime: integer("prep_time"),
    cookTime: integer("cook_time"),
    servings: integer("servings"),
    imageUri: text("image_uri"),
    cloudImageUri: text("cloud_image_uri"),
    nutrition: jsonb("nutrition"),
    isFavorite: boolean("is_favorite").default(false),
    extraData: jsonb("extra_data"),
    savedAt: timestamp("saved_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_user_recipes_user_item").on(table.userId, table.itemId),
    index("idx_user_recipes_user").on(table.userId),
    index("idx_user_recipes_user_favorite").on(table.userId, table.isFavorite),
    index("idx_user_recipes_cursor").on(table.userId, table.updatedAt, table.id),
  ],
);

export const insertUserSavedRecipeSchema = createInsertSchema(userSavedRecipes).omit({
  savedAt: true,
  updatedAt: true,
});
export type InsertUserSavedRecipe = z.infer<typeof insertUserSavedRecipeSchema>;
export type UserSavedRecipe = typeof userSavedRecipes.$inferSelect;

export const userMealPlans = pgTable(
  "user_meal_plans",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    itemId: text("item_id").notNull(),
    date: text("date").notNull(),
    meals: jsonb("meals"),
    extraData: jsonb("extra_data"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_user_meal_plans_user_item").on(table.userId, table.itemId),
    index("idx_user_meal_plans_user").on(table.userId),
    index("idx_user_meal_plans_user_date").on(table.userId, table.date),
  ],
);

export const insertUserMealPlanSchema = createInsertSchema(userMealPlans).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertUserMealPlan = z.infer<typeof insertUserMealPlanSchema>;
export type UserMealPlan = typeof userMealPlans.$inferSelect;

export const userShoppingItems = pgTable(
  "user_shopping_items",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    itemId: text("item_id").notNull(),
    name: text("name").notNull(),
    quantity: doublePrecision("quantity").notNull().default(1),
    unit: text("unit").notNull().default("unit"),
    isChecked: boolean("is_checked").notNull().default(false),
    category: text("category"),
    recipeId: text("recipe_id"),
    extraData: jsonb("extra_data"),
    addedAt: timestamp("added_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_user_shopping_user_item").on(table.userId, table.itemId),
    index("idx_user_shopping_user").on(table.userId),
    index("idx_user_shopping_user_checked").on(table.userId, table.isChecked),
    index("idx_user_shopping_cursor").on(table.userId, table.updatedAt, table.id),
  ],
);

export const insertUserShoppingItemSchema = createInsertSchema(userShoppingItems).omit({
  addedAt: true,
  updatedAt: true,
});
export type InsertUserShoppingItem = z.infer<typeof insertUserShoppingItemSchema>;
export type UserShoppingItem = typeof userShoppingItems.$inferSelect;

export const userCookwareItems = pgTable(
  "user_cookware_items",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    itemId: text("item_id").notNull(),
    name: text("name"),
    category: text("category"),
    alternatives: text("alternatives").array(),
    extraData: jsonb("extra_data"),
    addedAt: timestamp("added_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_user_cookware_user_item").on(table.userId, table.itemId),
    index("idx_user_cookware_user").on(table.userId),
  ],
);

export const insertUserCookwareItemSchema = createInsertSchema(userCookwareItems).omit({
  addedAt: true,
  updatedAt: true,
});
export type InsertUserCookwareItem = z.infer<typeof insertUserCookwareItemSchema>;
export type UserCookwareItem = typeof userCookwareItems.$inferSelect;

export const userWasteLogs = pgTable(
  "user_waste_logs",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    entryId: text("entry_id").notNull(),
    itemName: text("item_name").notNull(),
    quantity: doublePrecision("quantity"),
    unit: text("unit"),
    reason: text("reason"),
    date: text("date"),
    extraData: jsonb("extra_data"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_user_waste_logs_user_entry").on(table.userId, table.entryId),
    index("idx_user_waste_logs_user").on(table.userId),
    index("idx_user_waste_logs_user_date").on(table.userId, table.date),
  ],
);

export const insertUserWasteLogSchema = createInsertSchema(userWasteLogs).omit({
  createdAt: true,
});
export type InsertUserWasteLog = z.infer<typeof insertUserWasteLogSchema>;
export type UserWasteLog = typeof userWasteLogs.$inferSelect;

export const userConsumedLogs = pgTable(
  "user_consumed_logs",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    entryId: text("entry_id").notNull(),
    itemName: text("item_name").notNull(),
    quantity: doublePrecision("quantity"),
    unit: text("unit"),
    date: text("date"),
    extraData: jsonb("extra_data"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_user_consumed_logs_user_entry").on(table.userId, table.entryId),
    index("idx_user_consumed_logs_user").on(table.userId),
    index("idx_user_consumed_logs_user_date").on(table.userId, table.date),
  ],
);

export const insertUserConsumedLogSchema = createInsertSchema(userConsumedLogs).omit({
  createdAt: true,
});
export type InsertUserConsumedLog = z.infer<typeof insertUserConsumedLogSchema>;
export type UserConsumedLog = typeof userConsumedLogs.$inferSelect;

export const userCustomLocations = pgTable(
  "user_custom_locations",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    locationId: text("location_id").notNull(),
    name: text("name").notNull(),
    type: text("type"),
    extraData: jsonb("extra_data"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_user_custom_locations_user_loc").on(table.userId, table.locationId),
    index("idx_user_custom_locations_user").on(table.userId),
  ],
);

export const insertUserCustomLocationSchema = createInsertSchema(userCustomLocations).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertUserCustomLocation = z.infer<typeof insertUserCustomLocationSchema>;
export type UserCustomLocation = typeof userCustomLocations.$inferSelect;

export const userSyncKV = pgTable(
  "user_sync_kv",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    section: text("section").notNull(),
    data: jsonb("data"),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_user_sync_kv_user_section").on(table.userId, table.section),
    index("idx_user_sync_kv_user").on(table.userId),
  ],
);

export const insertUserSyncKVSchema = createInsertSchema(userSyncKV).omit({
  updatedAt: true,
});
export type InsertUserSyncKV = z.infer<typeof insertUserSyncKVSchema>;
export type UserSyncKV = typeof userSyncKV.$inferSelect;

// =============================================================================
// SYNC DATA JSONB SCHEMAS
// =============================================================================

export const syncNutritionSchema = z.object({
  calories: z.number(),
  protein: z.number(),
  carbs: z.number(),
  fat: z.number(),
  fiber: z.number().optional(),
  sugar: z.number().optional(),
}).optional().nullable();

export const syncIngredientSchema = z.object({
  name: z.string(),
  quantity: z.union([z.number(), z.string()]),
  unit: z.string(),
  fromInventory: z.boolean().optional(),
});

export const syncMealSchema = z.object({
  type: z.string(),
  recipeId: z.string().optional(),
  customMeal: z.string().optional(),
});

export const syncInventoryItemSchema = z.object({
  id: z.union([z.string(), z.number()]),
  name: z.string(),
  barcode: z.string().optional().nullable(),
  quantity: z.number().default(1),
  unit: z.string().default("unit"),
  storageLocation: z.string().default("pantry"),
  purchaseDate: z.string().optional().nullable(),
  expirationDate: z.string().optional().nullable(),
  category: z.string().default("other"),
  usdaCategory: z.string().optional().nullable(),
  nutrition: syncNutritionSchema,
  notes: z.string().optional().nullable(),
  imageUri: z.string().optional().nullable(),
  fdcId: z.number().optional().nullable(),
  updatedAt: z.string().optional(),
  deletedAt: z.string().optional().nullable(),
});

export const syncRecipeSchema = z.object({
  id: z.union([z.string(), z.number()]),
  title: z.string(),
  description: z.string().optional().nullable(),
  ingredients: z.array(syncIngredientSchema),
  instructions: z.array(z.string()),
  prepTime: z.number().optional().nullable(),
  cookTime: z.number().optional().nullable(),
  servings: z.number().optional().nullable(),
  imageUri: z.string().optional().nullable(),
  cloudImageUri: z.string().optional().nullable(),
  nutrition: z.object({
    calories: z.number(),
    protein: z.number(),
    carbs: z.number(),
    fat: z.number(),
  }).optional().nullable(),
  isFavorite: z.boolean().optional().nullable(),
  updatedAt: z.string().optional(),
}).passthrough();

export const syncMealPlanSchema = z.object({
  id: z.union([z.string(), z.number()]),
  date: z.string(),
  meals: z.array(syncMealSchema).optional().nullable(),
  updatedAt: z.string().optional(),
}).passthrough();

export const syncShoppingItemSchema = z.object({
  id: z.union([z.string(), z.number()]),
  name: z.string(),
  quantity: z.number().default(1),
  unit: z.string().default("unit"),
  isChecked: z.boolean().default(false),
  category: z.string().optional().nullable(),
  recipeId: z.string().optional().nullable(),
  updatedAt: z.string().optional(),
}).passthrough();

export const syncCookwareItemSchema = z.object({
  id: z.union([z.number(), z.string()]),
  name: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  alternatives: z.array(z.string()).optional().nullable(),
  updatedAt: z.string().optional(),
}).passthrough();

export const syncWasteLogEntrySchema = z.object({
  itemName: z.string(),
  quantity: z.number().optional(),
  unit: z.string().optional(),
  reason: z.string().optional(),
  date: z.string().optional(),
}).passthrough();

export const syncConsumedLogEntrySchema = z.object({
  itemName: z.string(),
  quantity: z.number().optional(),
  unit: z.string().optional(),
  date: z.string().optional(),
}).passthrough();

export const syncPreferencesSchema = z.record(z.unknown());
export const syncAnalyticsSchema = z.record(z.unknown());
export const syncOnboardingSchema = z.record(z.unknown());
export const syncCustomLocationsSchema = z.record(z.unknown());
export const syncUserProfileSchema = z.record(z.unknown());

export type SyncInventoryItem = z.infer<typeof syncInventoryItemSchema>;
export type SyncRecipe = z.infer<typeof syncRecipeSchema>;
export type SyncMealPlan = z.infer<typeof syncMealPlanSchema>;
export type SyncShoppingItem = z.infer<typeof syncShoppingItemSchema>;
export type SyncCookwareItem = z.infer<typeof syncCookwareItemSchema>;

// =============================================================================
// REFERENCE DATA TABLES
// =============================================================================

/**
 * COOKING TERMS TABLE
 *
 * Educational reference for cooking terminology.
 * Helps users learn cooking techniques and vocabulary.
 *
 * Fields:
 * - term: The cooking term (e.g., "sauté", "julienne")
 * - category: Type of term ("technique", "equipment", "ingredient", etc.)
 * - shortDefinition: Brief one-line explanation
 * - longDefinition: Detailed description with context
 * - difficulty: Skill level needed ("beginner", "intermediate", "advanced")
 * - timeEstimate: How long this technique typically takes
 * - tools: Equipment needed for this technique
 * - tips: Helpful hints for success
 * - relatedTerms: Links to related cooking terms
 * - imageUrl/videoUrl: Visual learning resources
 * - searchTerms: Alternative words that should find this term
 * - example: Usage example in a recipe
 */
export const cookingTerms = pgTable(
  "cooking_terms",
  {
    id: varchar("id").primaryKey(),
    term: text("term").notNull(),
    category: text("category").notNull(),
    shortDefinition: text("short_definition"),
    longDefinition: text("long_definition"),
    difficulty: text("difficulty").default("beginner"),
    timeEstimate: text("time_estimate"),
    tools: text("tools").array(),
    tips: text("tips").array(),
    relatedTerms: text("related_terms").array(),
    imageUrl: text("image_url"),
    videoUrl: text("video_url"),
    searchTerms: text("search_terms").array(),
    example: text("example"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_cooking_terms_term").on(table.term),
    index("idx_cooking_terms_category").on(table.category),
  ],
);

// =============================================================================
// INSERT SCHEMAS AND TYPES
// These are used for validating data before inserting into the database
// =============================================================================

/** Schema for creating a new user (omits auto-generated fields) */
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// =============================================================================
// APPLIANCES TABLES
// =============================================================================

/**
 * APPLIANCES TABLE
 *
 * Master list of kitchen appliances available in the app.
 * Used for recipe filtering and equipment suggestions.
 *
 * Fields:
 * - name: Appliance name (e.g., "Air Fryer", "Stand Mixer")
 * - category: Type of appliance ("cooking", "prep", "storage", etc.)
 * - description: What this appliance is used for
 * - icon: Icon name for display in the UI
 * - imageUrl: Photo of the appliance
 * - isCommon: Whether most kitchens have this
 * - alternatives: Other appliances that can substitute
 */
export const appliances = pgTable(
  "appliances",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    name: varchar("name", { length: 100 }).notNull().unique(),
    category: varchar("category", { length: 50 }).notNull(),
    description: text("description"),
    icon: varchar("icon", { length: 50 }),
    imageUrl: varchar("image_url", { length: 255 }),
    isCommon: boolean("is_common").default(false),
    alternatives: text("alternatives").array(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_appliances_category").on(table.category),
    index("idx_appliances_is_common").on(table.isCommon),
  ],
);

/**
 * USER APPLIANCES TABLE
 *
 * Junction table linking users to the appliances they own.
 * Enables personalized recipe suggestions based on available equipment.
 *
 * Fields:
 * - userId: Reference to the user
 * - applianceId: Reference to the appliance
 * - notes: User's notes (e.g., "6 quart model")
 * - brand: Specific brand they own
 */
export const userAppliances = pgTable(
  "user_appliances",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    applianceId: integer("appliance_id")
      .notNull()
      .references(() => appliances.id, { onDelete: "cascade" }),
    notes: text("notes"),
    brand: varchar("brand", { length: 100 }),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_user_appliances_unique").on(
      table.userId,
      table.applianceId,
    ),
  ],
);

// =============================================================================
// TYPE EXPORTS
// These TypeScript types are used throughout the app for type safety
// =============================================================================

/** Type for inserting a new user */
export type InsertUser = z.infer<typeof insertUserSchema>;
/** Type for a user retrieved from the database */
export type User = typeof users.$inferSelect;
/** Type for a session retrieved from the database */
export type UserSession = typeof userSessions.$inferSelect;
/** Type for sync data retrieved from the database */
export type UserSyncData = typeof userSyncData.$inferSelect;
/** Type for a cooking term retrieved from the database */
export type CookingTerm = typeof cookingTerms.$inferSelect;
/** Type for an appliance retrieved from the database */
export type Appliance = typeof appliances.$inferSelect;
/** Type for a user-appliance link retrieved from the database */
export type UserAppliance = typeof userAppliances.$inferSelect;

// =============================================================================
// NUTRITION TYPES AND FUNCTIONS
// =============================================================================

/**
 * NUTRITION FACTS INTERFACE
 *
 * Represents nutrition information for a food item or recipe.
 * Based on FDA nutrition label format.
 *
 * Required fields: servingSize, calories, totalFat, sodium, totalCarbohydrates, protein
 * Optional fields: All others (may not be available for all foods)
 */
export interface NutritionFacts {
  servingSize: string;
  servingsPerContainer?: number;
  calories: number;
  totalFat: number;
  saturatedFat?: number;
  transFat?: number;
  cholesterol?: number;
  sodium: number;
  totalCarbohydrates: number;
  dietaryFiber?: number;
  totalSugars?: number;
  addedSugars?: number;
  protein: number;
  vitaminD?: number;
  calcium?: number;
  iron?: number;
  potassium?: number;
}

/**
 * FDA DAILY VALUES
 *
 * Reference values for calculating % Daily Value on nutrition labels.
 * Based on a 2,000 calorie diet.
 * Values are in the same units as NutritionFacts (g, mg, mcg).
 */
export const DAILY_VALUES = {
  totalFat: 78, // grams
  saturatedFat: 20, // grams
  transFat: 0, // grams (no recommended limit, 0 means can't calculate %)
  cholesterol: 300, // mg
  sodium: 2300, // mg
  totalCarbohydrates: 275, // grams
  dietaryFiber: 28, // grams
  totalSugars: 0, // grams (no daily value)
  addedSugars: 50, // grams
  protein: 50, // grams
  vitaminD: 20, // mcg
  calcium: 1300, // mg
  iron: 18, // mg
  potassium: 4700, // mg
} as const;

export type DailyValueNutrient = keyof typeof DAILY_VALUES;

/**
 * Calculates the percentage of daily value for a nutrient.
 *
 * @param value - The amount of the nutrient
 * @param nutrient - Which nutrient to calculate for
 * @returns Percentage of daily value (0-100+), rounded to nearest integer
 *
 * @example
 * calculateDailyValuePercent(15, "totalFat") // Returns 19 (15g is 19% of 78g daily value)
 */
export function calculateDailyValuePercent(
  value: number | undefined,
  nutrient: DailyValueNutrient,
): number {
  if (value === undefined || value === 0) return 0;
  const dailyValue = DAILY_VALUES[nutrient];
  if (dailyValue === 0) return 0;
  return Math.round((value / dailyValue) * 100);
}

/**
 * Scales nutrition values by a multiplier.
 * Used when adjusting serving sizes or calculating totals for multiple servings.
 *
 * @param nutrition - Original nutrition facts
 * @param multiplier - Scale factor (e.g., 2 for double, 0.5 for half)
 * @returns New nutrition facts with scaled values
 *
 * @example
 * const doubled = scaleNutrition(originalNutrition, 2);
 */
export function scaleNutrition(
  nutrition: NutritionFacts,
  multiplier: number,
): NutritionFacts {
  return {
    servingSize: nutrition.servingSize,
    servingsPerContainer: nutrition.servingsPerContainer,
    calories: Math.round(nutrition.calories * multiplier),
    totalFat: Math.round(nutrition.totalFat * multiplier * 10) / 10,
    saturatedFat:
      nutrition.saturatedFat !== undefined
        ? Math.round(nutrition.saturatedFat * multiplier * 10) / 10
        : undefined,
    transFat:
      nutrition.transFat !== undefined
        ? Math.round(nutrition.transFat * multiplier * 10) / 10
        : undefined,
    cholesterol:
      nutrition.cholesterol !== undefined
        ? Math.round(nutrition.cholesterol * multiplier)
        : undefined,
    sodium: Math.round(nutrition.sodium * multiplier),
    totalCarbohydrates:
      Math.round(nutrition.totalCarbohydrates * multiplier * 10) / 10,
    dietaryFiber:
      nutrition.dietaryFiber !== undefined
        ? Math.round(nutrition.dietaryFiber * multiplier * 10) / 10
        : undefined,
    totalSugars:
      nutrition.totalSugars !== undefined
        ? Math.round(nutrition.totalSugars * multiplier * 10) / 10
        : undefined,
    addedSugars:
      nutrition.addedSugars !== undefined
        ? Math.round(nutrition.addedSugars * multiplier * 10) / 10
        : undefined,
    protein: Math.round(nutrition.protein * multiplier * 10) / 10,
    vitaminD:
      nutrition.vitaminD !== undefined
        ? Math.round(nutrition.vitaminD * multiplier * 10) / 10
        : undefined,
    calcium:
      nutrition.calcium !== undefined
        ? Math.round(nutrition.calcium * multiplier)
        : undefined,
    iron:
      nutrition.iron !== undefined
        ? Math.round(nutrition.iron * multiplier * 10) / 10
        : undefined,
    potassium:
      nutrition.potassium !== undefined
        ? Math.round(nutrition.potassium * multiplier)
        : undefined,
  };
}

// =============================================================================
// NUTRITION CORRECTIONS TABLE
// =============================================================================

/**
 * NUTRITION CORRECTIONS TABLE
 *
 * Allows users to submit corrections for inaccurate nutrition data.
 * Corrections are reviewed by admins before being applied.
 *
 * Fields:
 * - productName: Name of the product being corrected
 * - barcode: Product barcode if available
 * - brand: Product brand
 * - originalSource: Where the original data came from ("usda", "openfood", etc.)
 * - originalSourceId: ID in the original database
 * - originalNutrition: JSON string of original nutrition facts
 * - correctedNutrition: JSON string of user's corrections
 * - imageUrl: Photo of the actual nutrition label
 * - notes: User's explanation of the correction
 * - status: "pending", "approved", "rejected"
 * - reviewNotes: Admin's notes when reviewing
 */
export const nutritionCorrections = pgTable(
  "nutrition_corrections",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    userId: varchar("user_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    productName: text("product_name").notNull(),
    barcode: varchar("barcode", { length: 50 }),
    brand: varchar("brand", { length: 200 }),
    originalSource: varchar("original_source", { length: 50 }),
    originalSourceId: varchar("original_source_id", { length: 100 }),
    originalNutrition: text("original_nutrition"),
    correctedNutrition: text("corrected_nutrition"),
    imageUrl: text("image_url"),
    notes: text("notes"),
    status: varchar("status", { length: 20 }).default("pending").notNull(),
    reviewNotes: text("review_notes"),
    reviewedAt: timestamp("reviewed_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_nutrition_corrections_status").on(table.status),
    index("idx_nutrition_corrections_barcode").on(table.barcode),
    index("idx_nutrition_corrections_created").on(table.createdAt),
  ],
);

export const insertNutritionCorrectionSchema = createInsertSchema(
  nutritionCorrections,
).omit({
  createdAt: true,
  updatedAt: true,
  reviewedAt: true,
});

export type InsertNutritionCorrection = z.infer<
  typeof insertNutritionCorrectionSchema
>;
export type NutritionCorrection = typeof nutritionCorrections.$inferSelect;

// =============================================================================
// FEEDBACK SYSTEM TABLES
// =============================================================================

/**
 * FEEDBACK BUCKETS TABLE
 *
 * Groups similar feedback items together for easier management.
 * Multiple related issues/suggestions can be linked to one bucket.
 *
 * Fields:
 * - title: Brief title for the bucket
 * - description: Detailed description of the issue/feature
 * - bucketType: "bug" or "feature"
 * - status: "open", "in_progress", "completed"
 * - priority: "low", "medium", "high", "urgent"
 * - generatedPrompt: AI-generated prompt for implementing the feature/fix
 */
export const feedbackBuckets = pgTable(
  "feedback_buckets",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description"),
    bucketType: varchar("bucket_type", { length: 20 }).notNull(),
    status: varchar("status", { length: 20 }).default("open").notNull(),
    priority: varchar("priority", { length: 20 }).default("medium"),
    generatedPrompt: text("generated_prompt"),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_feedback_buckets_status").on(table.status),
    index("idx_feedback_buckets_type").on(table.bucketType),
  ],
);

export const insertFeedbackBucketSchema = createInsertSchema(
  feedbackBuckets,
).omit({
  createdAt: true,
  updatedAt: true,
});

export type InsertFeedbackBucket = z.infer<typeof insertFeedbackBucketSchema>;
export type FeedbackBucket = typeof feedbackBuckets.$inferSelect;

/**
 * FEEDBACK TABLE
 *
 * Stores individual user feedback submissions and bug reports.
 *
 * Fields:
 * - type: "feedback" or "bug"
 * - category: For feedback: "suggestion", "general", "compliment", "question"
 *             For bugs: "crash", "ui", "data", "performance"
 * - message: The user's feedback text
 * - userEmail: Optional email for follow-up
 * - deviceInfo: JSON with device/browser details
 * - screenContext: Which screen they were on
 * - stepsToReproduce: For bugs, how to recreate the issue
 * - severity: For bugs: "minor", "major", "critical"
 * - status: "new", "reviewed", "in_progress", "resolved", "closed"
 * - priority: Admin-assigned priority level
 * - resolutionPrompt: Detailed instructions for fixing
 * - assignedTo: Developer/team working on this
 * - bucketId: Link to a feedback bucket for grouping
 */
export const feedback = pgTable(
  "feedback",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    userId: varchar("user_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    bucketId: integer("bucket_id").references(() => feedbackBuckets.id, {
      onDelete: "set null",
    }),
    type: varchar("type", { length: 20 }).notNull(),
    category: varchar("category", { length: 50 }),
    message: text("message").notNull(),
    userEmail: varchar("user_email", { length: 255 }),
    deviceInfo: text("device_info"),
    screenContext: varchar("screen_context", { length: 100 }),
    stepsToReproduce: text("steps_to_reproduce"),
    severity: varchar("severity", { length: 20 }),
    status: varchar("status", { length: 20 }).default("new").notNull(),
    adminNotes: text("admin_notes"),
    priority: varchar("priority", { length: 20 }).default("medium"),
    resolutionPrompt: text("resolution_prompt"),
    assignedTo: varchar("assigned_to", { length: 100 }),
    resolvedAt: timestamp("resolved_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_feedback_type").on(table.type),
    index("idx_feedback_status").on(table.status),
    index("idx_feedback_created").on(table.createdAt),
    index("idx_feedback_priority").on(table.priority),
    index("idx_feedback_bucket").on(table.bucketId),
  ],
);

export const insertFeedbackSchema = createInsertSchema(feedback).omit({
  createdAt: true,
  updatedAt: true,
});

export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;
export type Feedback = typeof feedback.$inferSelect;

// =============================================================================
// SUBSCRIPTIONS TABLE (Stripe Integration)
// =============================================================================

/**
 * SUBSCRIPTIONS TABLE
 *
 * Tracks user subscription status with Stripe integration.
 * Controls access to premium features.
 *
 * Fields:
 * - stripeCustomerId: Stripe's customer ID
 * - stripeSubscriptionId: Stripe's subscription ID
 * - stripePriceId: Which price/plan they're on
 * - status: Current subscription state
 *   - "trialing": In 7-day free trial
 *   - "active": Paid and active
 *   - "past_due": Payment failed, grace period
 *   - "canceled": User canceled (may still have access until period end)
 *   - "expired": No longer active
 *   - "incomplete": Setup not finished
 * - planType: "monthly" or "annual"
 * - currentPeriodStart/End: Current billing period dates
 * - trialStart/End: Trial period dates (if applicable)
 * - cancelAtPeriodEnd: If true, won't renew
 * - canceledAt: When the user canceled (if applicable)
 */
export const subscriptions = pgTable(
  "subscriptions",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" })
      .unique(),
    stripeCustomerId: varchar("stripe_customer_id"),
    stripeSubscriptionId: varchar("stripe_subscription_id"),
    stripePriceId: varchar("stripe_price_id"),
    status: varchar("status", { length: 20 }).notNull(),
    planType: varchar("plan_type", { length: 20 }).notNull(),
    currentPeriodStart: timestamp("current_period_start").notNull(),
    currentPeriodEnd: timestamp("current_period_end").notNull(),
    trialStart: timestamp("trial_start"),
    trialEnd: timestamp("trial_end"),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false).notNull(),
    canceledAt: timestamp("canceled_at"),
    paymentFailedAt: timestamp("payment_failed_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_subscriptions_stripe_customer").on(table.stripeCustomerId),
    index("idx_subscriptions_stripe_subscription").on(
      table.stripeSubscriptionId,
    ),
    index("idx_subscriptions_status_plan").on(table.status, table.planType),
    index("idx_subscriptions_canceled_at").on(table.canceledAt),
    index("idx_subscriptions_period_start").on(table.currentPeriodStart),
  ],
);

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;

// =============================================================================
// CONVERSION EVENTS TABLE
// =============================================================================

export const conversionEvents = pgTable("conversion_events", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  fromTier: varchar("from_tier").notNull(),
  toTier: varchar("to_tier").notNull(),
  source: varchar("source"),
  stripeSessionId: varchar("stripe_session_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_conversion_events_user").on(table.userId),
  index("idx_conversion_events_created").on(table.createdAt),
  uniqueIndex("idx_conversion_events_session").on(table.stripeSessionId),
  index("idx_conversion_events_tiers").on(table.fromTier, table.toTier),
]);

export const insertConversionEventSchema = createInsertSchema(conversionEvents).omit({
  id: true,
  createdAt: true,
});

export type InsertConversionEvent = z.infer<typeof insertConversionEventSchema>;
export type ConversionEvent = typeof conversionEvents.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;

// =============================================================================
// CANCELLATION REASONS TABLE
// =============================================================================

export const cancellationReasons = pgTable("cancellation_reasons", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  reason: varchar("reason").notNull(),
  details: text("details"),
  offerShown: varchar("offer_shown"),
  offerAccepted: boolean("offer_accepted").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_cancellation_reasons_user").on(table.userId),
  index("idx_cancellation_reasons_created").on(table.createdAt),
]);

export const insertCancellationReasonSchema = createInsertSchema(cancellationReasons).omit({
  id: true,
  createdAt: true,
});

export type InsertCancellationReason = z.infer<typeof insertCancellationReasonSchema>;
export type CancellationReason = typeof cancellationReasons.$inferSelect;

// =============================================================================
// WINBACK CAMPAIGNS TABLE
// =============================================================================

export const winbackCampaigns = pgTable("winback_campaigns", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  subscriptionId: varchar("subscription_id").references(() => subscriptions.id),
  status: varchar("status", { length: 20 }).notNull().default("sent"),
  offerType: varchar("offer_type", { length: 50 }).notNull().default("first_month_discount"),
  offerAmount: integer("offer_amount").notNull().default(499),
  stripeCouponId: varchar("stripe_coupon_id"),
  stripePromotionCodeId: varchar("stripe_promotion_code_id"),
  notificationId: integer("notification_id"),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
  acceptedAt: timestamp("accepted_at"),
  expiredAt: timestamp("expired_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_winback_campaigns_user").on(table.userId),
  index("idx_winback_campaigns_status").on(table.status),
  index("idx_winback_campaigns_sent_at").on(table.sentAt),
]);

export const insertWinbackCampaignSchema = createInsertSchema(winbackCampaigns).omit({
  id: true,
  createdAt: true,
});

export type InsertWinbackCampaign = z.infer<typeof insertWinbackCampaignSchema>;
export type WinbackCampaign = typeof winbackCampaigns.$inferSelect;

// =============================================================================
// CRON JOBS TABLE (PostgreSQL-backed job scheduling)
// =============================================================================

export const cronJobs = pgTable("cron_jobs", {
  name: varchar("name", { length: 100 }).primaryKey(),
  intervalMs: integer("interval_ms").notNull(),
  lastRunAt: timestamp("last_run_at"),
  lastRunDurationMs: integer("last_run_duration_ms"),
  lastError: text("last_error"),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type CronJob = typeof cronJobs.$inferSelect;

// =============================================================================
// REFERRALS TABLE
// =============================================================================

export const referrals = pgTable(
  "referrals",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    referrerId: varchar("referrer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    referredUserId: varchar("referred_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" })
      .unique(),
    codeUsed: varchar("code_used", { length: 8 }).notNull(),
    status: varchar("status", { length: 20 }).notNull().default("completed"),
    bonusGranted: boolean("bonus_granted").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_referrals_referrer").on(table.referrerId),
    index("idx_referrals_referred_user").on(table.referredUserId),
  ],
);

export const insertReferralSchema = createInsertSchema(referrals).omit({
  createdAt: true,
});

export type InsertReferral = z.infer<typeof insertReferralSchema>;
export type Referral = typeof referrals.$inferSelect;

// =============================================================================
// NOTIFICATIONS TABLE
// =============================================================================

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  data: jsonb("data"),
  deepLink: text("deep_link"),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_notifications_user").on(table.userId),
  index("idx_notifications_user_unread").on(table.userId, table.isRead),
  index("idx_notifications_created").on(table.createdAt),
]);

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

// =============================================================================
// ERROR REPORTS
// =============================================================================

export const errorReports = pgTable("error_reports", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 255 }),
  errorMessage: text("error_message").notNull(),
  stackTrace: text("stack_trace"),
  componentStack: text("component_stack"),
  screenName: varchar("screen_name", { length: 255 }),
  platform: varchar("platform", { length: 50 }),
  appVersion: varchar("app_version", { length: 50 }),
  deviceInfo: text("device_info"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => [
  index("idx_error_reports_user").on(table.userId),
  index("idx_error_reports_created").on(table.createdAt),
]);

export const insertErrorReportSchema = createInsertSchema(errorReports).omit({
  id: true,
  createdAt: true,
});

export type InsertErrorReport = z.infer<typeof insertErrorReportSchema>;
export type ErrorReport = typeof errorReports.$inferSelect;

// =============================================================================
// NUTRITION UTILITY FUNCTIONS
// =============================================================================

/**
 * Merges nutrition facts from multiple food items.
 * Used for calculating total nutrition for recipes or meals.
 *
 * @param items - Array of NutritionFacts to combine
 * @returns Combined nutrition facts with totals
 *
 * @example
 * const mealTotal = mergeNutrition([ingredient1, ingredient2, ingredient3]);
 */
export function mergeNutrition(items: NutritionFacts[]): NutritionFacts {
  // Return empty nutrition if no items
  if (items.length === 0) {
    return {
      servingSize: "Combined",
      calories: 0,
      totalFat: 0,
      sodium: 0,
      totalCarbohydrates: 0,
      protein: 0,
    };
  }

  // Helper to sum values, treating undefined as 0
  const sum = (values: (number | undefined)[]): number => {
    return values.reduce((acc: number, val) => acc + (val ?? 0), 0);
  };

  // Helper for optional fields - only returns a value if at least one item has it
  const optionalSum = (values: (number | undefined)[]): number | undefined => {
    const defined = values.filter((v) => v !== undefined);
    if (defined.length === 0) return undefined;
    return sum(defined);
  };

  return {
    servingSize: `${items.length} items combined`,
    servingsPerContainer: undefined,
    calories: sum(items.map((i) => i.calories)),
    totalFat: Math.round(sum(items.map((i) => i.totalFat)) * 10) / 10,
    saturatedFat: optionalSum(items.map((i) => i.saturatedFat)),
    transFat: optionalSum(items.map((i) => i.transFat)),
    cholesterol: optionalSum(items.map((i) => i.cholesterol)),
    sodium: sum(items.map((i) => i.sodium)),
    totalCarbohydrates:
      Math.round(sum(items.map((i) => i.totalCarbohydrates)) * 10) / 10,
    dietaryFiber: optionalSum(items.map((i) => i.dietaryFiber)),
    totalSugars: optionalSum(items.map((i) => i.totalSugars)),
    addedSugars: optionalSum(items.map((i) => i.addedSugars)),
    protein: Math.round(sum(items.map((i) => i.protein)) * 10) / 10,
    vitaminD: optionalSum(items.map((i) => i.vitaminD)),
    calcium: optionalSum(items.map((i) => i.calcium)),
    iron: optionalSum(items.map((i) => i.iron)),
    potassium: optionalSum(items.map((i) => i.potassium)),
  };
}
