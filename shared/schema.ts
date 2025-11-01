/**
 * Database Schema & TypeScript Types
 * 
 * Defines all database tables and type-safe schemas using Drizzle ORM.
 * Shared between client and server for full-stack type safety.
 * 
 * Core Architecture:
 * - All user data tables foreign-key to users.id for data isolation
 * - Cascading deletes ensure clean data removal when user accounts are deleted
 * - JSONB columns for flexible nested data (nutrition, preferences, metadata)
 * - Comprehensive indexing for query performance
 * - Zod schemas for runtime validation and type inference
 * 
 * Primary Tables:
 * - sessions: Auth session storage (Replit OIDC)
 * - users: Core user accounts with merged preferences
 * - userStorage: User-defined storage locations (fridge, pantry, etc.)
 * - userInventory: Food items in user's possession
 * - userRecipes: User-created and AI-generated recipes
 * - mealPlans: Planned meals by date
 * - userShopping: Shopping list items
 * - userChats: Conversation history with AI assistant
 * 
 * Support Tables:
 * - pushTokens: Device tokens for push notifications
 * - notificationHistory: Delivered notification tracking
 * - userAppliances: Kitchen appliances linked to library
 * - apiUsageLogs: External API call tracking
 * - fdcCache: USDA FoodData Central response cache
 * - userFeedback: User feedback and issue tracking
 * - donations: Stripe payment tracking
 * - webVitals: Core Web Vitals performance metrics
 * - analyticsEvents: User interaction tracking
 * - userSessions: Session analytics
 * 
 * Reference Data:
 * - onboardingInventory: Pre-populated items for quick start
 * - cookingTerms: Interactive cooking knowledge bank
 * - applianceLibrary: Master catalog of appliances/cookware
 * 
 * Type Generation:
 * - Insert types: Created from Zod schemas with validation (e.g., InsertRecipe)
 * - Select types: Inferred from table definitions (e.g., Recipe)
 * - Omitted fields: id, createdAt, updatedAt (auto-generated)
 * 
 * Relationships & Cascading:
 * - users → userInventory: CASCADE (delete inventory when user deleted)
 * - users → userRecipes: CASCADE (delete recipes when user deleted)
 * - users → mealPlans: CASCADE (delete meal plans when user deleted)
 * - users → userShopping: CASCADE (delete shopping items when user deleted)
 * - users → userChats: CASCADE (delete chat history when user deleted)
 * - users → userStorage: CASCADE (delete storage locations when user deleted)
 * - users → pushTokens: CASCADE (delete push tokens when user deleted)
 * - users → notificationHistory: CASCADE (delete notifications when user deleted)
 * - users → userAppliances: CASCADE (delete appliances when user deleted)
 * - users → apiUsageLogs: CASCADE (delete API logs when user deleted)
 * - users → donations: SET NULL (preserve donation records)
 * - users → userFeedback: SET NULL (preserve feedback for analytics)
 * - userRecipes → mealPlans: CASCADE (delete meal plans when recipe deleted)
 * - userRecipes → userShopping: SET NULL (preserve shopping items)
 * - applianceLibrary → userAppliances: SET NULL (preserve appliance if library item removed)
 * - pushTokens → notificationHistory: SET NULL (preserve history if token removed)
 * 
 * Database Indexes:
 * - Primary keys: All tables have UUID or serial primary keys
 * - Foreign keys: Indexed for join performance
 * - Query optimization: Indexes on frequently filtered columns (date, status, userId, etc.)
 * - Unique constraints: email, session tokens, user+name combinations
 * - Composite indexes: user+date lookups, user+token combinations
 * 
 * Migration Strategy:
 * - Use `npm run db:push` to sync schema changes
 * - Use `npm run db:push --force` if data-loss warnings occur
 * - NEVER manually write SQL migrations
 * - Always preserve existing ID column types (serial vs varchar UUID)
 */

import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, index, jsonb, real, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

/**
 * Sessions Table
 * 
 * Stores server-side session data for Replit Auth OIDC.
 * Required by connect-pg-simple for express-session storage.
 * 
 * Fields:
 * - sid: Session ID (primary key from session cookie)
 * - sess: Session data as JSONB (user info, auth state)
 * - expire: Expiration timestamp for automatic cleanup
 * 
 * Usage:
 * - Automatically managed by express-session middleware
 * - Sessions expire based on cookie maxAge configuration
 * - Cleanup occurs via PostgreSQL cron or manual cleanup
 * 
 * Security:
 * - Cookie-based session IDs (httpOnly, secure in production)
 * - No sensitive data stored client-side
 * - Automatic expiration prevents stale sessions
 * 
 * Indexes:
 * - IDX_session_expire: Enables efficient expired session cleanup
 * 
 * Referenced from: blueprint:javascript_log_in_with_replit
 */
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

/**
 * Users Table
 * 
 * Core user accounts mapped from Replit Auth OIDC claims.
 * Merged with user preferences for optimized queries (denormalized).
 * 
 * Authentication Fields:
 * - id: UUID primary key (maps to OIDC 'sub' claim)
 * - email: User's email from OIDC (unique constraint)
 * - firstName: User's first name from OIDC
 * - lastName: User's last name from OIDC
 * - profileImageUrl: Avatar URL from OIDC provider
 * 
 * Dietary Preferences:
 * - dietaryRestrictions: Array of restrictions (vegetarian, vegan, gluten-free, etc.)
 * - allergens: Array of allergens to avoid (peanuts, shellfish, dairy, etc.)
 * - foodsToAvoid: Custom foods user wants to avoid
 * - favoriteCategories: Preferred food categories for suggestions
 * 
 * User Settings:
 * - householdSize: Number of people cooking for (default: 2)
 * - cookingSkillLevel: beginner|intermediate|advanced (default: beginner)
 * - preferredUnits: imperial|metric (default: imperial)
 * - expirationAlertDays: Days before expiration to alert (default: 3)
 * - storageAreasEnabled: Active storage location types
 * - hasCompletedOnboarding: Onboarding flow completion status
 * 
 * Notification Preferences:
 * - notificationsEnabled: Master notification toggle (default: false)
 * - notifyExpiringFood: Alert for expiring ingredients (default: true)
 * - notifyRecipeSuggestions: AI recipe suggestions (default: false)
 * - notifyMealReminders: Meal planning reminders (default: true)
 * - notificationTime: Daily notification time (HH:mm format, default: 09:00)
 * 
 * Admin & Metadata:
 * - isAdmin: Admin role flag for privileged operations
 * - createdAt: Account creation timestamp
 * - updatedAt: Last profile update timestamp
 * 
 * Business Rules:
 * - Email must be unique across all users
 * - Default preferences applied on account creation
 * - Preferences influence AI recipe generation
 * - Notification settings control push notification delivery
 * 
 * Indexes:
 * - email: Unique index for authentication lookups
 * 
 * Referenced from: blueprint:javascript_log_in_with_replit
 */
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  
  // OAuth provider information
  primaryProvider: varchar("primary_provider"), // 'google', 'github', 'twitter', 'apple', 'email', 'replit'
  primaryProviderId: varchar("primary_provider_id"), // Provider's unique user ID
  
  // Preferences (previously in userPreferences table)
  dietaryRestrictions: text("dietary_restrictions").array(),
  allergens: text("allergens").array(),
  favoriteCategories: text("favorite_categories").array(),
  expirationAlertDays: integer("expiration_alert_days").notNull().default(3),
  storageAreasEnabled: text("storage_areas_enabled").array(),
  householdSize: integer("household_size").notNull().default(2),
  cookingSkillLevel: text("cooking_skill_level").notNull().default('beginner'),
  preferredUnits: text("preferred_units").notNull().default('imperial'),
  foodsToAvoid: text("foods_to_avoid").array(),
  hasCompletedOnboarding: boolean("has_completed_onboarding").notNull().default(false),
  
  // Notification preferences
  notificationsEnabled: boolean("notifications_enabled").notNull().default(false),
  notifyExpiringFood: boolean("notify_expiring_food").notNull().default(true),
  notifyRecipeSuggestions: boolean("notify_recipe_suggestions").notNull().default(false),
  notifyMealReminders: boolean("notify_meal_reminders").notNull().default(true),
  notificationTime: text("notification_time").default("09:00"), // Time of day for daily notifications
  
  // Admin role
  isAdmin: boolean("is_admin").notNull().default(false),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

/**
 * Auth Providers Table
 * 
 * Tracks all authentication methods linked to a user account.
 * Allows users to sign in with multiple OAuth providers.
 * 
 * Fields:
 * - id: UUID primary key
 * - userId: Foreign key to users.id (CASCADE delete)
 * - provider: OAuth provider name (google, github, twitter, apple, email)
 * - providerId: Provider's unique user ID
 * - providerEmail: Email from the provider (may differ from primary email)
 * - accessToken: OAuth access token (encrypted in production)
 * - refreshToken: OAuth refresh token for token renewal
 * - tokenExpiry: Access token expiration timestamp
 * - isPrimary: Flag for primary authentication method
 * - metadata: Additional provider-specific data as JSONB
 * - createdAt: When the provider was linked
 * - updatedAt: Last authentication with this provider
 * 
 * Business Rules:
 * - Each user can have multiple auth providers
 * - Only one provider can be marked as primary
 * - Provider + providerId combination must be unique
 * - Tokens should be encrypted before storage in production
 * 
 * Indexes:
 * - userId: Fast user-specific queries
 * - provider + providerId: Unique constraint for provider accounts
 */
export const authProviders = pgTable("auth_providers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  provider: varchar("provider").notNull(), // 'google', 'github', 'twitter', 'apple', 'email'
  providerId: varchar("provider_id").notNull(),
  providerEmail: varchar("provider_email"),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  tokenExpiry: timestamp("token_expiry"),
  isPrimary: boolean("is_primary").default(false),
  metadata: jsonb("metadata"), // Provider-specific additional data
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("auth_providers_user_id_idx").on(table.userId),
  uniqueIndex("auth_providers_provider_id_idx").on(table.provider, table.providerId),
]);

export const insertAuthProviderSchema = createInsertSchema(authProviders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAuthProvider = z.infer<typeof insertAuthProviderSchema>;
export type AuthProvider = typeof authProviders.$inferSelect;

/**
 * User Storage Locations Table
 * 
 * User-defined storage areas for organizing food inventory.
 * Supports custom locations beyond default Fridge/Pantry/Freezer.
 * 
 * Fields:
 * - id: UUID primary key
 * - userId: Foreign key to users.id (CASCADE delete)
 * - name: Storage location name (e.g., "Wine Cellar", "Garage Freezer")
 * - icon: Icon name for UI display (lucide-react icon names)
 * - isDefault: Flag for system-provided default locations
 * - isActive: Soft delete flag for hiding without removing
 * - sortOrder: Display order in UI (user-customizable)
 * - createdAt: Creation timestamp
 * - updatedAt: Last modification timestamp
 * 
 * Default Locations:
 * - Refrigerator (isDefault: true, icon: "refrigerator")
 * - Freezer (isDefault: true, icon: "snowflake")
 * - Pantry (isDefault: true, icon: "warehouse")
 * - Counter (isDefault: true, icon: "layout-grid")
 * 
 * Custom Locations Examples:
 * - Wine Cellar, Garage Freezer, Root Cellar, Spice Rack
 * 
 * Business Rules:
 * - Users can add unlimited custom storage locations
 * - Each user+name combination must be unique
 * - Default locations created during user onboarding
 * - Soft delete (isActive: false) preserves historical data
 * - SortOrder determines display sequence in UI
 * 
 * Indexes:
 * - user_storage_user_id_idx: Fast user-specific queries
 * - user_storage_user_name_idx: Unique constraint on userId + name
 * 
 * Relationships:
 * - users → userStorage: CASCADE (delete locations when user deleted)
 * - userStorage ← userInventory: Referenced by storageLocationId
 */
export const userStorage = pgTable("user_storage", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // e.g., "Refrigerator", "Pantry", "Wine Cellar"
  icon: text("icon").notNull().default("package"), // Icon name for display
  isDefault: boolean("is_default").notNull().default(false), // If it's a default area like Fridge/Pantry
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("user_storage_user_id_idx").on(table.userId),
  uniqueIndex("user_storage_user_name_idx").on(table.userId, table.name),
]);

export const insertUserStorageSchema = createInsertSchema(userStorage).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUserStorage = z.infer<typeof insertUserStorageSchema>;
export type UserStorage = typeof userStorage.$inferSelect;
// For backward compatibility
export type StorageLocation = UserStorage;

/**
 * Push Notification Tokens Table
 * 
 * Stores device tokens for push notifications across platforms.
 * Enables multi-device notification delivery per user.
 * 
 * Fields:
 * - id: UUID primary key
 * - userId: Foreign key to users.id (CASCADE delete)
 * - token: Device-specific push token from OS
 * - platform: 'ios' | 'android' | 'web'
 * - isActive: Token validity flag (deactivated on errors)
 * - deviceInfo: JSONB with device metadata
 *   - deviceId: Unique device identifier
 *   - deviceModel: Device hardware model
 *   - osVersion: Operating system version
 *   - appVersion: Application version
 * - createdAt: Token registration timestamp
 * - updatedAt: Last token refresh timestamp
 * 
 * Token Lifecycle:
 * 1. Device registers → creates token record
 * 2. Token validated on notification send
 * 3. Failed delivery → isActive set to false
 * 4. Token refresh → updates existing record
 * 5. User logout → token deleted or deactivated
 * 
 * Business Rules:
 * - One user can have multiple active tokens (multiple devices)
 * - Unique constraint on userId + token combination
 * - Inactive tokens not used for notification delivery
 * - Device info helps debugging notification issues
 * 
 * Indexes:
 * - push_tokens_user_id_idx: User's devices lookup
 * - push_tokens_user_token_idx: Unique constraint, duplicate detection
 * 
 * Relationships:
 * - users → pushTokens: CASCADE (delete tokens when user deleted)
 * - pushTokens ← notificationHistory: Referenced by pushTokenId
 */
export const pushTokens = pgTable("push_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull(),
  platform: text("platform").notNull(), // 'ios', 'android', 'web'
  isActive: boolean("is_active").notNull().default(true),
  deviceInfo: jsonb("device_info").$type<{
    deviceId?: string;
    deviceModel?: string;
    osVersion?: string;
    appVersion?: string;
  }>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("push_tokens_user_token_idx").on(table.userId, table.token),
  index("push_tokens_user_id_idx").on(table.userId),
]);

export const insertPushTokenSchema = createInsertSchema(pushTokens).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPushToken = z.infer<typeof insertPushTokenSchema>;
export type PushToken = typeof pushTokens.$inferSelect;

/**
 * Notification History Table
 * 
 * Tracks all delivered push notifications and their engagement.
 * Provides analytics for notification effectiveness.
 * 
 * Fields:
 * - id: UUID primary key
 * - userId: Foreign key to users.id (CASCADE delete)
 * - type: Notification category
 *   - 'expiring-food': Ingredient expiration alerts
 *   - 'recipe-suggestion': AI-generated recipe ideas
 *   - 'meal-reminder': Upcoming meal reminders
 *   - 'test': Test notifications for debugging
 * - title: Notification title shown to user
 * - body: Notification message body
 * - data: JSONB with notification-specific data
 *   - recipeId: For recipe suggestions
 *   - ingredientIds: For expiring food alerts
 *   - mealPlanId: For meal reminders
 * - status: Delivery lifecycle
 *   - 'sent': Dispatched to push service
 *   - 'delivered': Confirmed device delivery
 *   - 'opened': User tapped notification
 *   - 'dismissed': User dismissed without opening
 *   - 'failed': Delivery failure
 * - platform: 'ios' | 'android' | 'web'
 * - pushTokenId: Foreign key to pushTokens.id (SET NULL on token delete)
 * - sentAt: When notification was sent (default: now)
 * - deliveredAt: When device received notification
 * - openedAt: When user tapped notification
 * - dismissedAt: When user dismissed notification
 * 
 * Engagement Tracking:
 * - Open rate: openedAt / sentAt count
 * - Dismiss rate: dismissedAt / sentAt count
 * - Delivery success: deliveredAt / sentAt count
 * - Time to open: openedAt - sentAt
 * 
 * Business Rules:
 * - All notifications logged regardless of delivery outcome
 * - Status transitions: sent → delivered → (opened | dismissed)
 * - Failed deliveries mark pushToken as inactive
 * - History preserved even if user/token deleted
 * 
 * Indexes:
 * - notification_history_user_id_idx: User's notification history
 * - notification_history_type_idx: Filter by notification type
 * - notification_history_status_idx: Filter by delivery status
 * - notification_history_sent_at_idx: Time-based queries
 * 
 * Relationships:
 * - users → notificationHistory: CASCADE
 * - pushTokens → notificationHistory: SET NULL
 */
export const notificationHistory = pgTable("notification_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // 'expiring-food', 'recipe-suggestion', 'meal-reminder', 'test'
  title: text("title").notNull(),
  body: text("body").notNull(),
  data: jsonb("data").$type<any>(),
  status: text("status").notNull().default('sent'), // 'sent', 'delivered', 'opened', 'dismissed', 'failed'
  platform: text("platform").notNull(), // 'ios', 'android', 'web'
  pushTokenId: varchar("push_token_id").references(() => pushTokens.id, { onDelete: "set null" }),
  sentAt: timestamp("sent_at").notNull().defaultNow(),
  deliveredAt: timestamp("delivered_at"),
  openedAt: timestamp("opened_at"),
  dismissedAt: timestamp("dismissed_at"),
  dismissedBy: varchar("dismissed_by"), // device/client identifier that dismissed the notification
}, (table) => [
  index("notification_history_user_id_idx").on(table.userId),
  index("notification_history_type_idx").on(table.type),
  index("notification_history_status_idx").on(table.status),
  index("notification_history_sent_at_idx").on(table.sentAt),
]);

export const insertNotificationHistorySchema = createInsertSchema(notificationHistory).omit({
  id: true,
  sentAt: true,
});

export type InsertNotificationHistory = z.infer<typeof insertNotificationHistorySchema>;
export type NotificationHistory = typeof notificationHistory.$inferSelect;

/**
 * User Appliances Table
 * 
 * User's kitchen appliances linked to master appliance library.
 * Supports both library items and fully custom appliances.
 * 
 * Fields:
 * - id: UUID primary key
 * - name: Display name for this appliance instance
 * - type: Appliance category override
 * - userId: Foreign key to users.id (CASCADE delete)
 * - applianceLibraryId: Foreign key to applianceLibrary.id (SET NULL)
 * 
 * Library-Linked Fields (when applianceLibraryId set):
 * - Inherits: category, capabilities, description from library
 * - Custom overrides below take precedence
 * 
 * Custom Appliance Fields (when applianceLibraryId null):
 * - customBrand: Manufacturer name
 * - customModel: Model number/name
 * - customCapabilities: Array of capabilities (bake, broil, air fry, etc.)
 * - customCapacity: Size specification (5qt, 9x13", etc.)
 * - customServingSize: Typical serving capacity
 * 
 * User Metadata:
 * - nickname: User-assigned nickname ("My Air Fryer")
 * - purchaseDate: When appliance was acquired
 * - warrantyEndDate: Warranty expiration for tracking
 * - notes: User notes (settings, maintenance, etc.)
 * - imageUrl: User-uploaded photo or library image
 * - isActive: Soft delete for appliances no longer owned
 * - createdAt: When added to user's kitchen
 * - updatedAt: Last modification timestamp
 * 
 * Use Cases:
 * - Recipe filtering: Show only recipes compatible with owned appliances
 * - Equipment suggestions: Recommend appliances for desired recipes
 * - Warranty tracking: Alert when warranties expire
 * - Recipe adaptation: Adjust instructions based on appliance capabilities
 * 
 * Business Rules:
 * - Can link to library OR be fully custom (not both)
 * - Library link preserved even if library item deleted (SET NULL)
 * - Custom fields ignored when library-linked
 * - Soft delete preserves historical recipe compatibility
 * 
 * Indexes:
 * - user_appliances_user_id_idx: User's appliance list
 * - user_appliances_appliance_library_id_idx: Library item usage tracking
 * 
 * Relationships:
 * - users → userAppliances: CASCADE
 * - applianceLibrary → userAppliances: SET NULL
 * - userAppliances ← userRecipes.neededEquipment: Referenced in recipe requirements
 */
export const userAppliances = pgTable("user_appliances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type"),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  applianceLibraryId: varchar("appliance_library_id").references(() => applianceLibrary.id, { onDelete: "set null" }),
  customBrand: text("custom_brand"),
  customModel: text("custom_model"),
  customCapabilities: text("custom_capabilities").array(),
  customCapacity: text("custom_capacity"),
  customServingSize: text("custom_serving_size"),
  nickname: text("nickname"),
  purchaseDate: text("purchase_date"),
  warrantyEndDate: text("warranty_end_date"),
  notes: text("notes"),
  imageUrl: text("image_url"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("user_appliances_user_id_idx").on(table.userId),
  index("user_appliances_appliance_library_id_idx").on(table.applianceLibraryId),
]);

export const insertUserApplianceSchema = createInsertSchema(userAppliances).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUserAppliance = z.infer<typeof insertUserApplianceSchema>;
export type UserAppliance = typeof userAppliances.$inferSelect;

/**
 * User Inventory Table
 * 
 * Food items currently in user's possession across storage locations.
 * Enhanced with USDA nutrition data and barcode integration.
 * 
 * Core Fields:
 * - id: UUID primary key
 * - userId: Foreign key to users.id (CASCADE delete)
 * - name: Food item name (user-editable)
 * - quantity: Amount as text ("2", "1.5", "half")
 * - unit: Measurement unit (cups, lbs, pieces, oz, ml, etc.)
 * - storageLocationId: Foreign key to userStorage.id
 * - expirationDate: When food expires (YYYY-MM-DD format, optional)
 * - foodCategory: Mapped USDA category (Dairy, Produce, Meat, Grains, Other)
 * 
 * Enhanced Data:
 * - imageUrl: Product photo (from barcode lookup or user upload)
 * - barcode: UPC/EAN barcode number if scanned
 * - notes: User notes (brand, variety, storage tips)
 * - nutrition: JSON string with NutritionInfo interface
 * - usdaData: Full USDA FoodData Central response (JSONB)
 * - barcodeData: Full barcode lookup API response (JSONB)
 * - servingSize: Serving size from USDA (e.g., "1 cup")
 * - servingSizeUnit: Unit for serving size
 * - weightInGrams: Numeric weight for nutrition calculations
 * 
 * Metadata:
 * - createdAt: When item was added to inventory
 * - updatedAt: Last modification timestamp
 * 
 * Data Sources:
 * 1. Manual Entry: User types name, quantity, unit
 * 2. Barcode Scan: Lookup via barcode API, populate all fields
 * 3. USDA Search: Search FoodData Central, link by fdcId
 * 4. Onboarding: Pre-populated from onboardingInventory table
 * 
 * Business Rules:
 * - Expiration alerts trigger when expirationDate - N days <= today
 * - Alert threshold N from users.expirationAlertDays (default: 3)
 * - Nutrition scaled by weightInGrams vs USDA serving size
 * - Categories used for recipe matching and analytics
 * - Storage location determines shelf life defaults
 * - Barcode data cached in barcodeData for offline access
 * 
 * Nutrition Calculations:
 * - If weightInGrams and servingSize both present:
 *   actualNutrition = (weightInGrams / servingSizeInGrams) * usdaNutrition
 * - Used for meal planning nutrition totals
 * 
 * Expiration Logic:
 * - expirationDate null: No expiration tracking
 * - expirationDate < today: Expired (red alert)
 * - expirationDate < today + alertDays: Expiring soon (yellow warning)
 * - expirationDate >= today + alertDays: Fresh (green)
 * 
 * Indexes:
 * - user_inventory_user_id_idx: User's inventory list
 * - user_inventory_expiration_date_idx: Expiration alert queries
 * - user_inventory_storage_location_idx: Group by storage area
 * - user_inventory_food_category_idx: Filter by category
 * 
 * Relationships:
 * - users → userInventory: CASCADE
 * - userStorage → userInventory: Referenced by storageLocationId
 * - userInventory ← userRecipes: Matched against recipe ingredients
 */
export const userInventory = pgTable("user_inventory", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  quantity: text("quantity").notNull(),
  unit: text("unit").notNull(),
  expirationDate: text("expiration_date"),
  storageLocationId: varchar("storage_location_id").notNull(),
  foodCategory: text("food_category"), // Mapped USDA category
  imageUrl: text("image_url"),
  barcode: text("barcode"),
  notes: text("notes"),
  nutrition: text("nutrition"), // JSON string for nutrition data
  usdaData: jsonb("usda_data").$type<any>(), // Full USDA FoodData Central data
  barcodeData: jsonb("barcode_data").$type<any>(), // Full barcode lookup data
  servingSize: text("serving_size"),
  servingSizeUnit: text("serving_size_unit"),
  weightInGrams: real("weight_in_grams"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("user_inventory_user_id_idx").on(table.userId),
  index("user_inventory_expiration_date_idx").on(table.expirationDate),
  index("user_inventory_storage_location_idx").on(table.storageLocationId),
  index("user_inventory_food_category_idx").on(table.foodCategory),
]);

export const insertUserInventorySchema = createInsertSchema(userInventory).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUserInventory = z.infer<typeof insertUserInventorySchema>;
export type UserInventory = typeof userInventory.$inferSelect;

/**
 * User Recipes Table
 * 
 * User-saved recipes from manual entry, AI generation, or imports.
 * Core feature for meal planning and inventory management.
 * 
 * Core Fields:
 * - id: UUID primary key
 * - userId: Foreign key to users.id (CASCADE delete)
 * - title: Recipe name
 * - description: Brief recipe overview
 * - ingredients: Array of ingredient strings ("2 cups flour", "1 lb chicken")
 * - instructions: Array of step-by-step instructions
 * - servings: Number of servings (default: 4)
 * 
 * Inventory Matching:
 * - usedIngredients: Array of ingredients user currently has (matched from inventory)
 * - missingIngredients: Array of ingredients user needs to buy
 * - Updated when inventory changes or recipe viewed
 * 
 * Recipe Metadata:
 * - prepTime: Preparation time ("15 min", "1 hour")
 * - cookTime: Cooking time ("30 min", "2 hours")
 * - totalTime: Total time (prep + cook)
 * - difficulty: 'easy' | 'medium' | 'hard' (default: medium)
 * - cuisine: Cuisine type (Italian, Mexican, Asian, etc.)
 * - tags: Array of searchable tags (quick, healthy, vegetarian, etc.)
 * 
 * Source Tracking:
 * - source: Recipe origin
 *   - 'manual': User-created from scratch
 *   - 'ai_generated': Created by OpenAI based on inventory
 *   - 'imported': Imported from external source
 * - aiPrompt: If AI-generated, stores the prompt used (for regeneration)
 * 
 * Dietary Information:
 * - dietaryInfo: Array of dietary labels (vegetarian, vegan, gluten-free, etc.)
 * - Used for filtering recipes by user preferences
 * 
 * Equipment Requirements:
 * - neededEquipment: Array of required appliances/cookware
 *   - Example: ["oven", "stand mixer", "9x13 baking pan"]
 *   - Used for recipe filtering based on userAppliances
 * 
 * Nutrition:
 * - nutrition: JSONB with NutritionInfo per serving
 *   - Calculated from ingredient USDA data
 *   - Aggregated to recipe level
 *   - Scaled based on servings
 * 
 * User Engagement:
 * - rating: User rating (1-5 stars, optional)
 * - notes: User notes (modifications, results, tips)
 * - isFavorite: Quick-access flag for favorite recipes
 * - imageUrl: Recipe photo (AI-generated, uploaded, or imported)
 * 
 * Timestamps:
 * - createdAt: When recipe was saved
 * - updatedAt: Last modification timestamp
 * 
 * Business Rules:
 * - Ingredient matching runs when recipe viewed or inventory changes
 * - Missing ingredients can be added to shopping list
 * - Recipes with all ingredients highlighted as "Ready to Cook"
 * - Favorite recipes appear in quick-access list
 * - AI-generated recipes can be regenerated with same prompt
 * 
 * Recipe Matching Algorithm:
 * 1. Parse ingredient strings (quantity, unit, name)
 * 2. Fuzzy match against user inventory names
 * 3. Split into usedIngredients vs missingIngredients
 * 4. Calculate match percentage (used / total)
 * 5. Suggest recipes with high match percentage
 * 
 * Indexes:
 * - user_recipes_user_id_idx: User's recipe collection
 * - user_recipes_is_favorite_idx: Quick favorite recipe access
 * - user_recipes_created_at_idx: Chronological sorting
 * 
 * Relationships:
 * - users → userRecipes: CASCADE
 * - userRecipes ← mealPlans: Referenced by recipeId
 * - userRecipes ← userShopping: Referenced by recipeId
 */
export const userRecipes = pgTable("user_recipes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  ingredients: text("ingredients").array().notNull(),
  instructions: text("instructions").array().notNull(),
  usedIngredients: text("used_ingredients").array().notNull().default([]),
  missingIngredients: text("missing_ingredients").array(),
  prepTime: text("prep_time"),
  cookTime: text("cook_time"),
  totalTime: text("total_time"),
  servings: integer("servings").notNull().default(4),
  difficulty: text("difficulty").default("medium"),
  cuisine: text("cuisine"),
  category: text("category"), // Recipe category for ML categorization
  dietaryInfo: jsonb("dietary_info").$type<string[]>(),
  imageUrl: text("image_url"),
  source: text("source"), // 'manual', 'ai_generated', 'imported'
  aiPrompt: text("ai_prompt"), // If AI generated, store the prompt
  rating: integer("rating"), // 1-5 rating
  notes: text("notes"),
  nutrition: jsonb("nutrition").$type<any>(),
  tags: jsonb("tags").$type<string[]>(),
  neededEquipment: jsonb("needed_equipment").$type<string[]>(), // Required appliances, cookware, bakeware
  isFavorite: boolean("is_favorite").notNull().default(false),
  similarityHash: text("similarity_hash"), // Hash for duplicate detection using embeddings
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("user_recipes_user_id_idx").on(table.userId),
  index("user_recipes_is_favorite_idx").on(table.isFavorite),
  index("user_recipes_created_at_idx").on(table.createdAt),
]);

export const insertRecipeSchema = createInsertSchema(userRecipes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertRecipe = z.infer<typeof insertRecipeSchema>;
export type Recipe = typeof userRecipes.$inferSelect;

/**
 * Meal Plans Table
 * 
 * User's planned meals organized by date and meal type.
 * Links recipes to specific meals for scheduling and preparation.
 * 
 * Fields:
 * - id: UUID primary key
 * - userId: Foreign key to users.id (CASCADE delete)
 * - recipeId: Foreign key to userRecipes.id (CASCADE delete)
 * - date: Meal date (YYYY-MM-DD format)
 * - mealType: Meal category
 *   - 'breakfast': Morning meal
 *   - 'lunch': Midday meal
 *   - 'dinner': Evening meal
 *   - 'snack': Snacks or desserts
 * - servings: Number of servings to prepare (default: 1)
 * - notes: Meal-specific notes (timing, prep ahead, modifications)
 * - isCompleted: Meal preparation/consumption status
 * - createdAt: When meal was planned
 * 
 * Meal Planning Flow:
 * 1. User selects recipe and date
 * 2. Choose mealType and servings
 * 3. Recipe added to calendar
 * 4. Missing ingredients added to shopping list
 * 5. Mark isCompleted when meal prepared
 * 
 * Calendar Features:
 * - Week view: Show all meals for 7 days
 * - Day view: Detailed meal schedule for single day
 * - Month view: High-level meal planning overview
 * - Drag-and-drop: Move meals between dates/mealTypes
 * 
 * Shopping List Integration:
 * - When meal planned → missing ingredients → shopping list
 * - Batch shopping list for entire week
 * - Check off items as purchased
 * 
 * Business Rules:
 * - One recipe can be planned multiple times (different dates/meals)
 * - Servings adjustable per meal plan instance
 * - Recipe nutrition scaled by servings for daily totals
 * - Completed meals affect inventory (optional feature)
 * - Deleting recipe deletes associated meal plans (CASCADE)
 * 
 * Nutrition Tracking:
 * - Aggregate nutrition by date
 * - Daily totals from planned meals
 * - Scaled by servings per meal
 * - Used for dietary goal tracking
 * 
 * Indexes:
 * - meal_plans_user_id_idx: User's meal plans
 * - meal_plans_recipe_id_idx: Recipe usage tracking
 * - meal_plans_date_idx: Calendar date queries
 * - meal_plans_meal_type_idx: Filter by meal category
 * 
 * Relationships:
 * - users → mealPlans: CASCADE
 * - userRecipes → mealPlans: CASCADE
 * 
 * Usage Example:
 * ```typescript
 * // Get week's meal plan
 * const weekMeals = await db
 *   .select()
 *   .from(mealPlans)
 *   .where(
 *     and(
 *       eq(mealPlans.userId, userId),
 *       gte(mealPlans.date, startDate),
 *       lte(mealPlans.date, endDate)
 *     )
 *   )
 *   .orderBy(mealPlans.date, mealPlans.mealType);
 * ```
 */
export const mealPlans = pgTable("meal_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  recipeId: varchar("recipe_id").notNull().references(() => userRecipes.id, { onDelete: "cascade" }),
  date: text("date").notNull(), // YYYY-MM-DD format
  mealType: text("meal_type").notNull(), // 'breakfast', 'lunch', 'dinner', 'snack'
  servings: integer("servings").notNull().default(1),
  notes: text("notes"),
  isCompleted: boolean("is_completed").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("meal_plans_user_id_idx").on(table.userId),
  index("meal_plans_recipe_id_idx").on(table.recipeId),
  index("meal_plans_date_idx").on(table.date),
  index("meal_plans_meal_type_idx").on(table.mealType),
]);

export const insertMealPlanSchema = createInsertSchema(mealPlans).omit({
  id: true,
  createdAt: true,
});

export type InsertMealPlan = z.infer<typeof insertMealPlanSchema>;
export type MealPlan = typeof mealPlans.$inferSelect;

/**
 * API Usage Logs Table
 * 
 * Tracks external API calls for cost monitoring and analytics.
 * Helps identify usage patterns and optimize API consumption.
 * 
 * Fields:
 * - id: UUID primary key
 * - userId: Foreign key to users.id (CASCADE delete)
 * - apiName: API service identifier
 *   - 'openai': ChatGPT API calls
 *   - 'barcode_lookup': Barcode product lookup
 *   - 'usda': USDA FoodData Central
 *   - 'stripe': Payment processing
 *   - Others as integrated
 * - endpoint: Specific API endpoint called
 * - queryParams: Query string or request parameters
 * - statusCode: HTTP response status code (200, 404, 500, etc.)
 * - success: Boolean success flag (true for 2xx responses)
 * - timestamp: When API call was made
 * 
 * Analytics Use Cases:
 * - Cost Tracking: Count API calls by user for billing
 * - Error Monitoring: Track failed API calls (success: false)
 * - Usage Patterns: Popular endpoints and features
 * - Rate Limiting: Identify users exceeding quotas
 * - Performance: Slow endpoints needing caching
 * 
 * Cost Optimization:
 * - Identify cacheable API calls
 * - Detect duplicate requests
 * - Find opportunities for batching
 * - Track most expensive users
 * 
 * Business Rules:
 * - All external API calls logged (success or failure)
 * - Logs retained for analytics period (e.g., 90 days)
 * - User-specific logs deleted with user account (CASCADE)
 * - Status codes guide error handling improvements
 * 
 * Indexes:
 * - api_usage_logs_user_id_idx: User's API usage
 * - api_usage_logs_api_name_idx: Filter by API service
 * - api_usage_logs_timestamp_idx: Time-based queries
 * - api_usage_logs_success_idx: Error rate analysis
 * 
 * Relationships:
 * - users → apiUsageLogs: CASCADE
 * 
 * Example Queries:
 * ```typescript
 * // Monthly OpenAI API usage by user
 * const usage = await db
 *   .select({
 *     userId: apiUsageLogs.userId,
 *     count: sql<number>`count(*)`,
 *   })
 *   .from(apiUsageLogs)
 *   .where(
 *     and(
 *       eq(apiUsageLogs.apiName, 'openai'),
 *       gte(apiUsageLogs.timestamp, startOfMonth)
 *     )
 *   )
 *   .groupBy(apiUsageLogs.userId);
 * ```
 */
export const apiUsageLogs = pgTable("api_usage_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  apiName: text("api_name").notNull(), // 'openai', 'barcode_lookup', 'usda', 'stripe', etc.
  endpoint: text("endpoint").notNull(),
  queryParams: text("query_params"),
  statusCode: integer("status_code").notNull(),
  success: boolean("success").notNull(),
  timestamp: timestamp("timestamp").notNull(),
}, (table) => [
  index("api_usage_logs_user_id_idx").on(table.userId),
  index("api_usage_logs_api_name_idx").on(table.apiName),
  index("api_usage_logs_timestamp_idx").on(table.timestamp),
  index("api_usage_logs_success_idx").on(table.success),
]);

export const insertApiUsageLogSchema = createInsertSchema(apiUsageLogs).omit({
  id: true,
  timestamp: true,
});

export type InsertApiUsageLog = z.infer<typeof insertApiUsageLogSchema>;
export type ApiUsageLog = typeof apiUsageLogs.$inferSelect;

/**
 * FDC Cache Table
 * 
 * Caches USDA FoodData Central API responses.
 * Reduces API calls and improves performance for food lookups.
 * 
 * Fields:
 * - id: Primary key (custom format, not auto-generated)
 * - fdcId: USDA FDC ID (unique food identifier)
 * - dataType: Food data type (Branded, SR Legacy, Survey, Foundation)
 * - description: Food description/name
 * - brandOwner: Brand/manufacturer name (for branded foods)
 * - brandName: Brand name (for branded foods)
 * - ingredients: Ingredient list text
 * - servingSize: Serving size value (numeric)
 * - servingSizeUnit: Serving size unit (g, ml, oz, etc.)
 * - nutrients: JSONB with nutrient array from USDA
 * - fullData: Complete USDA API response (JSONB)
 * - cachedAt: When response was cached
 * - lastAccessed: Last time cache entry was used
 * 
 * Cache Strategy:
 * - Cache USDA search results for 30 days
 * - Update lastAccessed on each use
 * - LRU eviction for old, unused entries
 * - Invalidate on USDA data updates (manual)
 * 
 * Performance Benefits:
 * - Instant food lookups (no API latency)
 * - Reduced USDA API quota consumption
 * - Offline food data access
 * - Consistent nutrition data across app
 * 
 * Data Structure:
 * - nutrients: Array of {nutrientId, nutrientName, value, unitName}
 * - fullData: Complete USDA response for advanced features
 * - Serves both quick lookups and detailed nutrition
 * 
 * Business Rules:
 * - Cache populated on USDA API calls
 * - Cache checked before making API request
 * - lastAccessed updated on cache hit
 * - Stale entries (>30 days, low access) purged periodically
 * 
 * Indexes:
 * - fdc_cache_description_idx: Text search on food names
 * - fdc_cache_brand_owner_idx: Filter by brand
 * 
 * Cache Invalidation:
 * - Time-based: Entries older than 30 days
 * - Manual: Admin can clear/refresh cache
 * - Selective: Individual fdcId updates
 * 
 * Usage Example:
 * ```typescript
 * // Check cache before API call
 * let foodData = await db
 *   .select()
 *   .from(fdcCache)
 *   .where(eq(fdcCache.fdcId, fdcId))
 *   .limit(1);
 * 
 * if (!foodData.length) {
 *   // Cache miss - call USDA API
 *   foodData = await fetchFromUSDA(fdcId);
 *   await db.insert(fdcCache).values(foodData);
 * } else {
 *   // Cache hit - update lastAccessed
 *   await db
 *     .update(fdcCache)
 *     .set({ lastAccessed: new Date() })
 *     .where(eq(fdcCache.id, foodData[0].id));
 * }
 * ```
 */
export const fdcCache = pgTable("fdc_cache", {
  id: varchar("id").primaryKey(),  // Changed to match database
  fdcId: text("fdc_id").notNull(),
  dataType: text("data_type"), // Nullable to match database
  description: text("description").notNull(),
  brandOwner: text("brand_owner"),
  brandName: text("brand_name"),
  ingredients: text("ingredients"),
  servingSize: real("serving_size"),
  servingSizeUnit: text("serving_size_unit"),
  nutrients: jsonb("nutrients").$type<any>(),  // Changed from foodNutrients to match database
  fullData: jsonb("full_data").$type<any>(),  // Nullable to match database
  cachedAt: timestamp("cached_at").notNull(),
  lastAccessed: timestamp("last_accessed").notNull(),  // Added to match database
}, (table) => [
  index("fdc_cache_description_idx").on(table.description),
  index("fdc_cache_brand_owner_idx").on(table.brandOwner),
]);

export const insertFdcCacheSchema = createInsertSchema(fdcCache).omit({
  id: true,
  cachedAt: true,
  lastAccessed: true,
});

export type InsertFdcCache = z.infer<typeof insertFdcCacheSchema>;
export type FdcCache = typeof fdcCache.$inferSelect;


/**
 * User Shopping List Table
 * 
 * Items user needs to purchase at grocery store.
 * Integrated with recipes and inventory management.
 * 
 * Fields:
 * - id: UUID primary key
 * - userId: Foreign key to users.id (CASCADE delete)
 * - ingredient: Item name/description
 * - quantity: Amount to purchase (optional, text)
 * - unit: Measurement unit (optional)
 * - recipeId: Foreign key to userRecipes.id (SET NULL if recipe deleted)
 * - fdcId: USDA FoodData Central ID for nutrition lookup
 * - isChecked: Purchase completion status
 * - createdAt: When item was added to list
 * 
 * Item Sources:
 * 1. Recipe Missing Ingredients: Auto-added from recipe.missingIngredients
 * 2. Meal Plan: Batch-add missing ingredients for weekly meals
 * 3. Manual Entry: User directly adds items
 * 4. AI Suggestions: Chatbot recommends based on preferences
 * 
 * Shopping Workflow:
 * 1. User views recipe or creates meal plan
 * 2. Missing ingredients added to shopping list
 * 3. User views consolidated shopping list
 * 4. Check items off as purchased (isChecked: true)
 * 5. Checked items can be added to inventory
 * 6. Completed items cleared or archived
 * 
 * Recipe Integration:
 * - recipeId links item to source recipe
 * - Null recipeId for manually added items
 * - Deleting recipe preserves shopping items (SET NULL)
 * - Recipe link enables "Shop for this recipe" feature
 * 
 * Smart Features:
 * - Duplicate detection: Combine similar items
 * - Quantity aggregation: Sum quantities for same ingredient
 * - Category grouping: Organize by store department
 * - Store layout: Sort by aisle (future feature)
 * 
 * Business Rules:
 * - Multiple recipes can contribute same ingredient
 * - Checked items not automatically deleted (user choice)
 * - fdcId enables nutrition tracking for purchased items
 * - Quantity/unit optional for generic items ("bread", "milk")
 * 
 * Indexes:
 * - user_shopping_list_items_user_id_idx: User's shopping list
 * - user_shopping_list_items_is_checked_idx: Filter active vs completed
 * - user_shopping_list_items_recipe_id_idx: Recipe-specific items
 * 
 * Relationships:
 * - users → userShopping: CASCADE
 * - userRecipes → userShopping: SET NULL
 * - fdcCache ← userShopping: Referenced by fdcId
 * 
 * Usage Example:
 * ```typescript
 * // Add recipe missing ingredients to shopping list
 * for (const ingredient of recipe.missingIngredients) {
 *   await db.insert(userShopping).values({
 *     userId,
 *     ingredient,
 *     recipeId: recipe.id,
 *     isChecked: false,
 *     createdAt: new Date(),
 *   });
 * }
 * ```
 */
export const userShopping = pgTable("user_shopping", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  ingredient: text("ingredient").notNull(),  // Changed from 'name' to match database
  quantity: text("quantity"),
  unit: text("unit"),
  recipeId: varchar("recipe_id").references(() => userRecipes.id, { onDelete: "set null" }), // If from a recipe
  isChecked: boolean("is_checked").notNull().default(false),
  createdAt: timestamp("created_at").notNull(),
  fdcId: text("fdc_id"), // Added to match database
}, (table) => [
  index("user_shopping_list_items_user_id_idx").on(table.userId),
  index("user_shopping_list_items_is_checked_idx").on(table.isChecked),
  index("user_shopping_list_items_recipe_id_idx").on(table.recipeId),
]);

export const insertShoppingListItemSchema = createInsertSchema(userShopping).omit({
  id: true,
  createdAt: true,
});

export type InsertShoppingListItem = z.infer<typeof insertShoppingListItemSchema>;
export type ShoppingListItem = typeof userShopping.$inferSelect;

/**
 * Nutrition Info Interface
 * 
 * TypeScript interface for nutrition data structure.
 * Used throughout app for consistent nutrition representation.
 * 
 * Macronutrients (g):
 * - calories: Energy (kcal)
 * - protein: Protein (g)
 * - carbs: Total carbohydrates (g)
 * - fat: Total fat (g)
 * - fiber: Dietary fiber (g)
 * - sugar: Sugars (g)
 * 
 * Fats (g):
 * - saturatedFat: Saturated fatty acids
 * - transFat: Trans fatty acids
 * - cholesterol: Cholesterol (mg)
 * 
 * Minerals (mg):
 * - sodium: Sodium
 * - calcium: Calcium
 * - iron: Iron
 * - potassium: Potassium
 * - phosphorus: Phosphorus
 * - magnesium: Magnesium
 * - zinc: Zinc
 * - selenium: Selenium (µg)
 * - copper: Copper
 * - manganese: Manganese
 * 
 * Vitamins:
 * - vitaminA: Vitamin A (µg RAE)
 * - vitaminC: Vitamin C (mg)
 * - vitaminD: Vitamin D (µg)
 * - vitaminE: Vitamin E (mg)
 * - vitaminK: Vitamin K (µg)
 * - thiamin: Vitamin B1 (mg)
 * - riboflavin: Vitamin B2 (mg)
 * - niacin: Vitamin B3 (mg)
 * - vitaminB6: Vitamin B6 (mg)
 * - folate: Folate (µg DFE)
 * - vitaminB12: Vitamin B12 (µg)
 * - pantothenicAcid: Vitamin B5 (mg)
 * 
 * Serving Info:
 * - servingSize: Serving size amount
 * - servingUnit: Serving size unit
 * 
 * Data Sources:
 * - USDA FoodData Central API
 * - Barcode lookup APIs
 * - User manual entry
 * - Calculated from ingredients
 * 
 * Usage:
 * - userInventory.nutrition: JSON string, parse to NutritionInfo
 * - userRecipes.nutrition: Aggregated from ingredients
 * - Displayed in nutrition labels
 * - Used for dietary goal tracking
 * 
 * All fields optional to handle partial nutrition data.
 */
export interface NutritionInfo {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  servingSize?: string;
  servingUnit?: string;
  saturatedFat?: number;
  transFat?: number;
  cholesterol?: number;
  calcium?: number;
  iron?: number;
  potassium?: number;
  vitaminA?: number;
  vitaminC?: number;
  vitaminD?: number;
  vitaminE?: number;
  vitaminK?: number;
  thiamin?: number;
  riboflavin?: number;
  niacin?: number;
  vitaminB6?: number;
  folate?: number;
  vitaminB12?: number;
  pantothenicAcid?: number;
  phosphorus?: number;
  magnesium?: number;
  zinc?: number;
  selenium?: number;
  copper?: number;
  manganese?: number;
}

/**
 * USDA FoodData Central Types
 * 
 * TypeScript interfaces for USDA FoodData Central API responses.
 * Provides type safety for food search and nutrition data.
 * 
 * USDAFoodItem:
 * Core food item from USDA database.
 * 
 * Fields:
 * - fdcId: Unique USDA food identifier
 * - description: Food name/description
 * - dataType: Food data source
 *   - 'Branded': Commercial products with UPC
 *   - 'SR Legacy': USDA Standard Reference
 *   - 'Survey (FNDDS)': Food and Nutrient Database for Dietary Studies
 *   - 'Foundation': Foundational foods with detailed nutrient data
 * - gtinUpc: UPC barcode (for branded foods)
 * - brandOwner: Manufacturer/brand owner
 * - brandName: Brand name
 * - ingredients: Ingredient list text
 * - marketCountry: Country where food is sold
 * - foodCategory: USDA food category
 * - packageWeight: Package size description
 * - servingSize: Numeric serving size
 * - servingSizeUnit: Serving size unit
 * - foodNutrients: Array of nutrient values
 *   - nutrientId: USDA nutrient ID
 *   - nutrientName: Nutrient name (Protein, Calcium, etc.)
 *   - nutrientNumber: USDA nutrient number (standardized)
 *   - unitName: Unit (g, mg, µg, kcal)
 *   - value: Nutrient amount
 * - nutrition: Transformed nutrition data (app-specific format)
 * - score: Search relevance score
 * - allHighlightFields: Search match highlights
 * 
 * USDASearchResponse:
 * API response for food search queries.
 * 
 * Fields:
 * - totalHits: Total matching foods
 * - currentPage: Current page number
 * - totalPages: Total pages available
 * - pageList: Available page numbers
 * - foodSearchCriteria: Search parameters used
 *   - query: Search query string
 *   - pageNumber: Requested page
 *   - pageSize: Results per page
 *   - dataType: Filter by food data types
 * - foods: Array of USDAFoodItem results
 * - aggregations: Search result statistics
 *   - dataType: Count by data type
 *   - nutrients: Count by nutrient availability
 * 
 * Usage:
 * - Type safety for USDA API integration
 * - Food search result parsing
 * - Nutrition data extraction
 * - Cache type definitions
 */
export interface USDAFoodItem {
  fdcId: number;
  description: string;
  dataType?: string;
  gtinUpc?: string;
  brandOwner?: string;
  brandName?: string;
  ingredients?: string;
  marketCountry?: string;
  foodCategory?: string;
  allHighlightFields?: string;
  score?: number;
  packageWeight?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  foodNutrients?: Array<{
    nutrientId: number;
    nutrientName: string;
    nutrientNumber?: string;
    unitName: string;
    value: number;
  }>;
  nutrition?: any; // Computed/transformed nutrition data for compatibility
  finalFoodInputFoods?: Array<any>;
  foodMeasures?: Array<any>;
  foodAttributes?: Array<any>;
  foodAttributeTypes?: Array<any>;
  foodVersionIds?: Array<any>;
}

export interface USDASearchResponse {
  totalHits: number;
  currentPage: number;
  totalPages: number;
  pageList: number[];
  foodSearchCriteria: {
    query: string;
    generalSearchInput?: string;
    pageNumber: number;
    numberOfResults?: number;
    pageSize?: number;
    requireAllWords?: boolean;
    dataType?: string[];
  };
  foods: USDAFoodItem[];
  aggregations?: {
    dataType?: Record<string, number>;
    nutrients?: Record<string, number>;
  };
}

/**
 * User Feedback Table
 * 
 * Comprehensive user feedback and issue tracking system.
 * Supports bug reports, feature requests, and user suggestions.
 * 
 * Core Fields:
 * - id: UUID primary key
 * - userId: Foreign key to users.id (SET NULL - allow anonymous)
 * - userEmail: Email for anonymous feedback follow-up
 * 
 * Feedback Content:
 * - type: Feedback category
 *   - 'bug': Something broken or not working
 *   - 'feature_request': New feature suggestion
 *   - 'improvement': Enhancement to existing feature
 *   - 'praise': Positive feedback
 *   - 'other': General feedback
 * - category: Feature area (ui, performance, functionality, content, api, etc.)
 * - subject: Brief title/summary
 * - description: Detailed feedback text
 * 
 * Context Metadata:
 * - url: Page URL where feedback submitted
 * - userAgent: Browser/device information
 * - appVersion: Application version number
 * 
 * Classification:
 * - sentiment: Feedback tone
 *   - 'positive': Happy, satisfied users
 *   - 'negative': Frustrated, unhappy users
 *   - 'neutral': Informational feedback
 * - priority: Urgency level
 *   - 'low': Nice to have, minor issues
 *   - 'medium': Should address soon
 *   - 'high': Important, affects many users
 *   - 'critical': Urgent, blocking functionality
 * 
 * Status Tracking:
 * - status: Feedback lifecycle state
 *   - 'pending': New, not yet reviewed
 *   - 'in_review': Team reviewing feedback
 *   - 'in_progress': Work started
 *   - 'resolved': Issue fixed or request implemented
 *   - 'closed': Resolved and verified
 *   - 'wont_fix': Declined or out of scope
 * - resolution: Resolution notes/explanation
 * - resolvedAt: When feedback was resolved
 * 
 * Engagement (JSONB Arrays):
 * - upvotes: Array of {userId, createdAt}
 *   - Users can upvote feedback to show support
 *   - Used for prioritization (popular requests)
 *   - One upvote per user
 * - responses: Array of {responderId, response, action, createdAt}
 *   - Admin/team responses to feedback
 *   - Communication thread
 *   - Action items documented
 * 
 * Additional Data:
 * - attachments: Array of file URLs (screenshots, videos, logs)
 * - tags: Array of string tags for categorization
 * 
 * Timestamps:
 * - createdAt: When feedback was submitted
 * - updatedAt: Last modification timestamp
 * - resolvedAt: When status changed to resolved
 * 
 * Business Rules:
 * - Anonymous feedback allowed (userId can be null)
 * - Email required for anonymous feedback follow-up
 * - Authenticated users auto-fill email from profile
 * - Upvotes stored as JSONB array (no separate table)
 * - Responses stored as JSONB array (no separate table)
 * - Priority auto-assigned based on type and sentiment
 * - Status workflow enforced (pending → in_review → in_progress → resolved)
 * 
 * Workflow:
 * 1. User submits feedback → status: 'pending'
 * 2. Admin reviews → status: 'in_review', assigns priority
 * 3. Work begins → status: 'in_progress'
 * 4. Fix deployed → status: 'resolved', resolution notes added
 * 5. User notified → status: 'closed'
 * 
 * Analytics:
 * - Most upvoted requests (prioritization)
 * - Sentiment trends (user satisfaction)
 * - Response time metrics (avg time to resolution)
 * - Category distribution (problem areas)
 * - Resolution rate (closed / total)
 * 
 * Indexes:
 * - user_feedback_user_id_idx: User's feedback history
 * - user_feedback_type_idx: Filter by feedback type
 * - user_feedback_status_idx: Filter by status
 * - user_feedback_priority_idx: Sort by priority
 * - user_feedback_created_at_idx: Chronological sorting
 * 
 * Relationships:
 * - users → userFeedback: SET NULL (preserve feedback after user deletion)
 */
export const userFeedback = pgTable("user_feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }), // Allow anonymous feedback
  userEmail: text("user_email"), // For anonymous feedback
  
  // Feedback content
  type: text("type").notNull(), // 'bug', 'feature_request', 'improvement', 'praise', 'other'
  category: text("category"), // 'ui', 'performance', 'functionality', 'content', 'api', etc.
  subject: text("subject").notNull(),
  description: text("description").notNull(),
  
  // Metadata
  url: text("url"), // Page where feedback was submitted
  userAgent: text("user_agent"),
  appVersion: text("app_version"),
  
  // Sentiment and priority
  sentiment: text("sentiment"), // 'positive', 'negative', 'neutral'
  priority: text("priority"), // 'low', 'medium', 'high', 'critical'
  
  // Status tracking
  status: text("status").notNull().default('pending'), // 'pending', 'in_review', 'in_progress', 'resolved', 'closed', 'wont_fix'
  resolution: text("resolution"),
  
  // Engagement tracking - Now as JSONB arrays to avoid separate tables
  upvotes: jsonb("upvotes").$type<Array<{userId: string; createdAt: string}>>().default([]),
  responses: jsonb("responses").$type<Array<{
    responderId: string;
    response: string;
    action?: string;
    createdAt: string;
  }>>().default([]),
  
  // Additional data
  attachments: jsonb("attachments").$type<string[]>(), // URLs to uploaded files
  tags: jsonb("tags").$type<string[]>(),
  
  // Timestamps
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at"),
}, (table) => [
  index("user_feedback_user_id_idx").on(table.userId),
  index("user_feedback_type_idx").on(table.type),
  index("user_feedback_status_idx").on(table.status),
  index("user_feedback_priority_idx").on(table.priority),
  index("user_feedback_created_at_idx").on(table.createdAt),
]);

export const insertFeedbackSchema = createInsertSchema(userFeedback).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  resolvedAt: true,
  upvotes: true,
  responses: true,
}).extend({
  type: z.enum(['bug', 'feature_request', 'improvement', 'praise', 'other']),
  sentiment: z.enum(['positive', 'negative', 'neutral']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  status: z.enum(['pending', 'in_review', 'in_progress', 'resolved', 'closed', 'wont_fix']).default('pending'),
});

export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;
export type Feedback = typeof userFeedback.$inferSelect & {
  // Add computed/optional fields that may be present in API responses
  content?: string; // Alias for description for backward compatibility
  rating?: number | null; // Optional rating field
  upvoteCount?: number; // Computed from upvotes array length
  estimatedTurnaround?: string | null; // Optional ETA for completion
};

// Feedback Upvotes and Responses - MERGED INTO feedback TABLE AS JSONB ARRAYS
// Types preserved for backward compatibility during migration
export type FeedbackUpvote = {
  userId: string;
  createdAt: string;
};

export type FeedbackResponse = {
  responderId: string;
  response: string;
  action?: string;
  createdAt: string;
};

// Feedback Analytics Aggregations (for dashboard)
export type FeedbackAnalytics = {
  totalFeedback: number;
  averageRating: number | null;
  sentimentDistribution: {
    positive: number;
    negative: number;
    neutral: number;
  };
  typeDistribution: Record<string, number>;
  priorityDistribution: Record<string, number>;
  recentTrends: {
    date: string;
    count: number;
    averageSentiment: number;
  }[];
  topIssues: {
    category: string;
    count: number;
    priority: string;
  }[];
};

/**
 * Donations Table
 * 
 * Tracks Stripe donation payments from users.
 * Supports one-time and recurring donations.
 * 
 * Fields:
 * - id: UUID primary key
 * - userId: Foreign key to users.id (SET NULL - preserve anonymous donations)
 * - stripePaymentIntentId: Stripe Payment Intent ID (unique)
 * - amount: Donation amount in cents (e.g., 1000 = $10.00)
 * - currency: Currency code (usd, eur, gbp, etc.)
 * - status: Payment status
 *   - 'succeeded': Payment completed
 *   - 'pending': Processing
 *   - 'failed': Payment failed
 *   - 'refunded': Donation refunded
 * - donorEmail: Email for receipt (from Stripe or user profile)
 * - donorName: Donor name (from Stripe or user profile)
 * - message: Optional message from donor
 * - isRecurring: Flag for subscription vs one-time
 * - stripeSubscriptionId: Subscription ID for recurring donations
 * - createdAt: When donation was made
 * - updatedAt: Last status update
 * 
 * Payment Flow:
 * 1. User initiates donation
 * 2. Stripe checkout session created
 * 3. User completes payment on Stripe
 * 4. Webhook received → create donation record
 * 5. Status updated based on payment outcome
 * 6. Receipt emailed to donor
 * 
 * Recurring Donations:
 * - isRecurring: true
 * - stripeSubscriptionId: Links to Stripe subscription
 * - Multiple donation records (one per charge)
 * - Webhooks create new record each billing cycle
 * 
 * Business Rules:
 * - Anonymous donations allowed (userId can be null)
 * - Amounts stored in cents (no floating point issues)
 * - Stripe IDs must be unique (prevent duplicate records)
 * - Email required for receipt delivery
 * - Refunds update status but preserve record
 * - Subscription cancellation stops future donations
 * 
 * Tax Receipts:
 * - donorEmail: Receipt delivery
 * - donorName: Tax receipt name
 * - amount + currency: Receipt amount
 * - createdAt: Receipt date
 * - Generated for status: 'succeeded'
 * 
 * Indexes:
 * - donations_user_id_idx: User's donation history
 * - donations_stripe_payment_intent_id_idx: Unique Stripe ID
 * - donations_status_idx: Filter by payment status
 * - donations_created_at_idx: Chronological sorting
 * 
 * Relationships:
 * - users → donations: SET NULL (preserve donation records)
 * 
 * Referenced from: blueprint:javascript_stripe
 */
export const donations = pgTable("donations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }), // Optional - allow anonymous donations
  stripePaymentIntentId: text("stripe_payment_intent_id").notNull().unique(),
  amount: integer("amount").notNull(), // Amount in cents
  currency: text("currency").notNull().default('usd'),
  status: text("status").notNull(), // 'succeeded', 'pending', 'failed', 'refunded'
  donorEmail: text("donor_email"),
  donorName: text("donor_name"),
  message: text("message"), // Optional message from donor
  isRecurring: boolean("is_recurring").notNull().default(false),
  stripeSubscriptionId: text("stripe_subscription_id"), // For recurring donations
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("donations_user_id_idx").on(table.userId),
  index("donations_stripe_payment_intent_id_idx").on(table.stripePaymentIntentId),
  index("donations_status_idx").on(table.status),
  index("donations_created_at_idx").on(table.createdAt),
]);

export const insertDonationSchema = createInsertSchema(donations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDonation = z.infer<typeof insertDonationSchema>;
export type Donation = typeof donations.$inferSelect;

/**
 * Web Vitals Table
 * 
 * Core Web Vitals performance metrics tracking.
 * Monitors real user performance for optimization insights.
 * 
 * Fields:
 * - id: UUID primary key
 * - userId: Foreign key to users.id (SET NULL - track anonymous users)
 * - sessionId: Browser session identifier
 * - name: Web Vital metric name
 *   - 'LCP': Largest Contentful Paint (loading performance)
 *   - 'FID': First Input Delay (interactivity)
 *   - 'CLS': Cumulative Layout Shift (visual stability)
 *   - 'FCP': First Contentful Paint (initial rendering)
 *   - 'TTFB': Time to First Byte (server response)
 *   - 'INP': Interaction to Next Paint (responsiveness)
 * - value: Metric value (milliseconds or score)
 * - delta: Change from previous navigation
 * - metricId: Unique metric instance ID
 * - rating: Performance rating
 *   - 'good': Meets performance threshold
 *   - 'needs-improvement': Below optimal
 *   - 'poor': Performance issue
 * - navigationType: Navigation type (navigate, reload, back_forward)
 * - url: Page URL where metric measured
 * - createdAt: When metric was captured
 * 
 * Core Web Vitals Thresholds:
 * 
 * LCP (Largest Contentful Paint):
 * - Good: ≤ 2.5s
 * - Needs Improvement: 2.5s - 4.0s
 * - Poor: > 4.0s
 * 
 * FID (First Input Delay):
 * - Good: ≤ 100ms
 * - Needs Improvement: 100ms - 300ms
 * - Poor: > 300ms
 * 
 * CLS (Cumulative Layout Shift):
 * - Good: ≤ 0.1
 * - Needs Improvement: 0.1 - 0.25
 * - Poor: > 0.25
 * 
 * FCP (First Contentful Paint):
 * - Good: ≤ 1.8s
 * - Needs Improvement: 1.8s - 3.0s
 * - Poor: > 3.0s
 * 
 * TTFB (Time to First Byte):
 * - Good: ≤ 800ms
 * - Needs Improvement: 800ms - 1800ms
 * - Poor: > 1800ms
 * 
 * INP (Interaction to Next Paint):
 * - Good: ≤ 200ms
 * - Needs Improvement: 200ms - 500ms
 * - Poor: > 500ms
 * 
 * Performance Monitoring:
 * - Real user metrics (RUM)
 * - Aggregated by page, device, user
 * - Identify slow pages
 * - Track performance over time
 * - User experience optimization
 * 
 * Business Rules:
 * - Metrics captured on page load and interaction
 * - Anonymous users tracked (userId null)
 * - SessionId groups metrics by visit
 * - Rating auto-assigned based on thresholds
 * - Used for performance dashboards
 * 
 * Analytics:
 * - 75th percentile values (Core Web Vitals standard)
 * - Performance trends over time
 * - Slow pages identification
 * - Device/browser comparisons
 * - Regression detection
 * 
 * Indexes:
 * - web_vitals_user_id_idx: User-specific performance
 * - web_vitals_name_idx: Filter by metric type
 * - web_vitals_created_at_idx: Time series analysis
 * - web_vitals_rating_idx: Filter by performance rating
 * 
 * Relationships:
 * - users → webVitals: SET NULL (preserve metrics)
 * 
 * Data Collection:
 * - web-vitals library (Google)
 * - Automatic instrumentation
 * - Sent to backend on visibility change
 * - Batched for efficiency
 */
export const webVitals = pgTable("web_vitals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  sessionId: text("session_id").notNull(),
  
  // Event details
  name: text("name").notNull(), // 'LCP', 'FID', 'CLS', 'FCP', 'TTFB', 'INP'
  value: real("value").notNull(),
  delta: real("delta").notNull(),
  metricId: text("metric_id").notNull(),
  rating: text("rating").notNull(), // 'good', 'needs-improvement', 'poor'
  navigationType: text("navigation_type"),
  url: text("url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("web_vitals_user_id_idx").on(table.userId),
  index("web_vitals_name_idx").on(table.name),
  index("web_vitals_created_at_idx").on(table.createdAt),
  index("web_vitals_rating_idx").on(table.rating),
]);

export const insertWebVitalSchema = createInsertSchema(webVitals).omit({
  id: true,
  createdAt: true,
}).extend({
  name: z.enum(['LCP', 'FID', 'CLS', 'FCP', 'TTFB', 'INP']),
  rating: z.enum(['good', 'needs-improvement', 'poor']),
  value: z.number(),
  delta: z.number(),
  metricId: z.string(),
});

export type InsertWebVital = z.infer<typeof insertWebVitalSchema>;
export type WebVital = typeof webVitals.$inferSelect;

/**
 * Content Embeddings Table
 * 
 * Stores vector embeddings for semantic search and similarity matching.
 * Enables ML-powered content discovery across recipes, inventory, and chats.
 * 
 * Fields:
 * - id: UUID primary key
 * - contentId: ID of the content (recipe, ingredient, chat message)
 * - contentType: Type of content (recipe, inventory, chat, meal_plan)
 * - embedding: Vector embedding as JSONB array (1536 dimensions for ada-002)
 * - embeddingModel: Model used (text-embedding-ada-002)
 * - contentText: Original text that was embedded
 * - metadata: Additional context (title, category, tags)
 * - userId: Foreign key to users.id (CASCADE delete)
 * - createdAt: Embedding creation timestamp
 * - updatedAt: Last update timestamp
 * 
 * Business Rules:
 * - One embedding per content item
 * - Regenerate on content update
 * - Used for semantic search and similarity
 * 
 * Indexes:
 * - content_embeddings_user_id_idx: User's embeddings
 * - content_embeddings_content_idx: Unique per content item
 */
export const contentEmbeddings = pgTable("content_embeddings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contentId: varchar("content_id").notNull(),
  contentType: text("content_type").notNull(), // 'recipe', 'inventory', 'chat', 'meal_plan'
  embedding: jsonb("embedding").notNull().$type<number[]>(), // Vector array
  embeddingModel: text("embedding_model").notNull().default('text-embedding-ada-002'),
  contentText: text("content_text").notNull(),
  metadata: jsonb("metadata").$type<{
    title?: string;
    category?: string;
    tags?: string[];
    description?: string;
  }>(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("content_embeddings_user_id_idx").on(table.userId),
  uniqueIndex("content_embeddings_content_idx").on(table.contentId, table.contentType, table.userId),
]);

export const insertContentEmbeddingSchema = createInsertSchema(contentEmbeddings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertContentEmbedding = z.infer<typeof insertContentEmbeddingSchema>;
export type ContentEmbedding = typeof contentEmbeddings.$inferSelect;

/**
 * Search Logs Table
 * 
 * Tracks search queries and user interactions for analytics.
 * 
 * Fields:
 * - id: UUID primary key
 * - query: Original search query text
 * - searchType: 'semantic' | 'keyword' | 'natural_language'
 * - userId: Foreign key to users.id (CASCADE delete)
 * - resultsCount: Number of results returned
 * - clickedResultId: ID of result user clicked (if any)
 * - clickedResultType: Type of clicked result
 * - searchLatency: Time to execute search in ms
 * - timestamp: When search was performed
 * 
 * Analytics:
 * - Click-through rate by query type
 * - Popular search terms
 * - Search performance metrics
 */
export const searchLogs = pgTable("search_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  query: text("query").notNull(),
  searchType: text("search_type").notNull().default('semantic'),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  resultsCount: integer("results_count").notNull(),
  clickedResultId: varchar("clicked_result_id"),
  clickedResultType: text("clicked_result_type"),
  clickPosition: integer("click_position"), // Position of the clicked result in the list
  timeToClick: integer("time_to_click"), // Time in milliseconds from search to click
  searchLatency: integer("search_latency"), // milliseconds
  timestamp: timestamp("timestamp").defaultNow(),
}, (table) => [
  index("search_logs_user_id_idx").on(table.userId),
  index("search_logs_timestamp_idx").on(table.timestamp),
]);

export const insertSearchLogSchema = createInsertSchema(searchLogs).omit({
  id: true,
  timestamp: true,
});

export type InsertSearchLog = z.infer<typeof insertSearchLogSchema>;
export type SearchLog = typeof searchLogs.$inferSelect;

/**
 * Categories Table
 * 
 * Hierarchical categories for content organization.
 * Supports both manual and AI-powered categorization.
 * 
 * Fields:
 * - id: UUID primary key
 * - name: Category name (e.g., "Italian", "Breakfast", "Vegan")
 * - description: Category description
 * - parentId: Parent category for hierarchy (self-referential)
 * - keywords: Keywords for classification
 * - color: UI color for category badges
 * - icon: Icon name for display
 * - sortOrder: Display order
 * - isActive: Soft delete flag
 * - createdAt: Creation timestamp
 * 
 * Hierarchy Example:
 * - Cuisine > Italian > Pasta
 * - Diet > Vegan > Raw
 * - Meal > Breakfast > Quick
 */
export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  parentId: varchar("parent_id"),
  keywords: text("keywords").array(),
  color: text("color").default('#3B82F6'),
  icon: text("icon").default('folder'),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("categories_parent_id_idx").on(table.parentId),
  uniqueIndex("categories_name_idx").on(table.name),
]);

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
  createdAt: true,
});

export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;

/**
 * Content Categories Table
 * 
 * Many-to-many relationship between content and categories.
 * Tracks both manual and AI assignments with confidence scores.
 * 
 * Fields:
 * - id: UUID primary key
 * - contentId: ID of categorized content
 * - contentType: Type of content
 * - categoryId: Foreign key to categories.id
 * - confidenceScore: AI confidence (0-1)
 * - isManual: Whether manually assigned
 * - userId: Who categorized it
 * - createdAt: Assignment timestamp
 */
export const contentCategories = pgTable("content_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contentId: varchar("content_id").notNull(),
  contentType: text("content_type").notNull(),
  categoryId: varchar("category_id").notNull().references(() => categories.id, { onDelete: "cascade" }),
  confidenceScore: real("confidence_score").default(1.0),
  isManual: boolean("is_manual").default(false),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("content_categories_content_idx").on(table.contentId, table.contentType),
  index("content_categories_category_idx").on(table.categoryId),
  index("content_categories_user_idx").on(table.userId),
  uniqueIndex("content_categories_unique_idx").on(table.contentId, table.contentType, table.categoryId, table.userId),
]);

export const insertContentCategorySchema = createInsertSchema(contentCategories).omit({
  id: true,
  createdAt: true,
});

export type InsertContentCategory = z.infer<typeof insertContentCategorySchema>;
export type ContentCategory = typeof contentCategories.$inferSelect;

/**
 * Tags Table
 * 
 * Flexible tagging system for all content types.
 * Generated automatically via NLP or added manually.
 * 
 * Fields:
 * - id: UUID primary key
 * - name: Tag name (lowercase, no spaces)
 * - slug: URL-friendly version
 * - usageCount: Times used across content
 * - createdAt: First use timestamp
 * 
 * Examples:
 * - quick-meals, gluten-free, budget-friendly
 * - summer-recipes, kid-approved, meal-prep
 */
export const tags = pgTable("tags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  usageCount: integer("usage_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  uniqueIndex("tags_name_idx").on(table.name),
  uniqueIndex("tags_slug_idx").on(table.slug),
]);

export const insertTagSchema = createInsertSchema(tags).omit({
  id: true,
  createdAt: true,
});

export type InsertTag = z.infer<typeof insertTagSchema>;
export type Tag = typeof tags.$inferSelect;

/**
 * Content Tags Table
 * 
 * Many-to-many relationship between content and tags.
 * 
 * Fields:
 * - id: UUID primary key
 * - contentId: Tagged content ID
 * - contentType: Type of content
 * - tagId: Foreign key to tags.id
 * - relevanceScore: AI-assigned relevance (0-1)
 * - isManual: Manual vs auto-generated
 * - userId: Who added the tag
 * - createdAt: Tag assignment timestamp
 */
export const contentTags = pgTable("content_tags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contentId: varchar("content_id").notNull(),
  contentType: text("content_type").notNull(),
  tagId: varchar("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
  relevanceScore: real("relevance_score").default(1.0),
  isManual: boolean("is_manual").default(false),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("content_tags_content_idx").on(table.contentId, table.contentType),
  index("content_tags_tag_idx").on(table.tagId),
  index("content_tags_user_idx").on(table.userId),
  uniqueIndex("content_tags_unique_idx").on(table.contentId, table.contentType, table.tagId, table.userId),
]);

export const insertContentTagSchema = createInsertSchema(contentTags).omit({
  id: true,
  createdAt: true,
});

export type InsertContentTag = z.infer<typeof insertContentTagSchema>;
export type ContentTag = typeof contentTags.$inferSelect;

/**
 * Duplicate Pairs Table
 * 
 * Tracks potential duplicate content for deduplication.
 * 
 * Fields:
 * - id: UUID primary key
 * - contentId1: First content item
 * - contentType1: Type of first item
 * - contentId2: Second content item
 * - contentType2: Type of second item
 * - similarityScore: Cosine similarity (0-1)
 * - status: 'pending' | 'duplicate' | 'unique' | 'merged'
 * - reviewedBy: User who reviewed
 * - reviewedAt: Review timestamp
 * - userId: Owner of content
 * - createdAt: Detection timestamp
 */
export const duplicatePairs = pgTable("duplicate_pairs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contentId1: varchar("content_id_1").notNull(),
  contentType1: text("content_type_1").notNull(),
  contentId2: varchar("content_id_2").notNull(),
  contentType2: text("content_type_2").notNull(),
  similarityScore: real("similarity_score").notNull(),
  status: text("status").notNull().default('pending'),
  reviewedBy: varchar("reviewed_by").references(() => users.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewed_at"),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("duplicate_pairs_user_idx").on(table.userId),
  index("duplicate_pairs_status_idx").on(table.status),
  index("duplicate_pairs_score_idx").on(table.similarityScore),
]);

export const insertDuplicatePairSchema = createInsertSchema(duplicatePairs).omit({
  id: true,
  createdAt: true,
});

export type InsertDuplicatePair = z.infer<typeof insertDuplicatePairSchema>;
export type DuplicatePair = typeof duplicatePairs.$inferSelect;

/**
 * Related Content Cache Table
 * 
 * Caches related content recommendations for performance.
 * 
 * Fields:
 * - id: UUID primary key
 * - contentId: Source content ID
 * - contentType: Type of content
 * - relatedItems: Array of related content with scores
 * - userId: Content owner
 * - expiresAt: Cache expiration
 * - createdAt: Cache creation
 */
export const relatedContentCache = pgTable("related_content_cache", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contentId: varchar("content_id").notNull(),
  contentType: text("content_type").notNull(),
  relatedItems: jsonb("related_items").notNull().$type<Array<{
    id: string;
    type: string;
    title: string;
    score: number;
  }>>(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("related_content_cache_content_idx").on(table.contentId, table.contentType),
  index("related_content_cache_user_idx").on(table.userId),
  index("related_content_cache_expires_idx").on(table.expiresAt),
]);

export const insertRelatedContentCacheSchema = createInsertSchema(relatedContentCache).omit({
  id: true,
  createdAt: true,
});

export type InsertRelatedContentCache = z.infer<typeof insertRelatedContentCacheSchema>;
export type RelatedContentCache = typeof relatedContentCache.$inferSelect;

/**
 * Natural Query Logs Table
 * 
 * Logs natural language queries and their SQL translations.
 * Tracks query performance and provides audit trail.
 * 
 * Core Fields:
 * - id: UUID primary key
 * - naturalQuery: User's question in plain English
 * - generatedSql: Translated SQL query
 * - resultCount: Number of results returned
 * - executionTime: Query execution time in ms
 * - error: Error message if failed
 * - userId: Who ran the query
 * - createdAt: Query timestamp
 * 
 * Additional Fields:
 * - queryType: Type of SQL operation (SELECT, INSERT, UPDATE, DELETE)
 * - tablesAccessed: Array of table names accessed in query
 * - isSuccessful: Whether query executed without errors
 * - metadata: JSONB for additional data (model used, confidence score, etc.)
 * - isSaved: Flag if user saved this as a useful query
 * - savedName: User-given name for saved queries
 */
export const queryLogs = pgTable("query_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  naturalQuery: text("natural_query").notNull(),
  generatedSql: text("generated_sql"),
  resultCount: integer("result_count").default(0),
  executionTime: integer("execution_time"), // milliseconds
  error: text("error"),
  queryType: varchar("query_type", { length: 20 }).default('SELECT'),
  tablesAccessed: text("tables_accessed").array(),
  isSuccessful: boolean("is_successful").notNull().default(true),
  metadata: jsonb("metadata").$type<{
    model?: string;
    confidence?: number;
    temperature?: number;
    tokensUsed?: number;
    explanations?: string[];
  }>(),
  isSaved: boolean("is_saved").notNull().default(false),
  savedName: varchar("saved_name", { length: 255 }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("query_logs_user_idx").on(table.userId),
  index("query_logs_created_idx").on(table.createdAt),
  index("query_logs_is_saved_idx").on(table.isSaved),
]);

export const insertQueryLogSchema = createInsertSchema(queryLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertQueryLog = z.infer<typeof insertQueryLogSchema>;
export type QueryLog = typeof queryLogs.$inferSelect;

/**
 * Analytics Events Table
 * 
 * Tracks user interactions and behaviors throughout the application.
 * Provides insights for feature usage, UX optimization, and funnel analysis.
 * 
 * Core Fields:
 * - id: UUID primary key
 * - userId: Foreign key to users.id (SET NULL - track anonymous)
 * - sessionId: Browser session identifier (groups events)
 * 
 * Event Classification:
 * - eventType: High-level event category
 *   - 'page_view': Page navigation
 *   - 'feature_use': Feature interaction
 *   - 'button_click': Button/CTA clicks
 *   - 'form_submit': Form submissions
 *   - 'error': Error occurrences
 * - eventCategory: Feature area
 *   - 'navigation', 'inventory', 'recipe', 'chat', 'meal_plan', etc.
 * - eventAction: Specific action taken
 *   - 'add_ingredient', 'generate_recipe', 'save_meal_plan', etc.
 * - eventLabel: Additional context (optional)
 * - eventValue: Numeric value (optional, e.g., quantity, count)
 * 
 * Page Context:
 * - pageUrl: Current page URL
 * - referrer: Previous page URL
 * - timeOnPage: Seconds spent before event (optional)
 * 
 * Device Context:
 * - userAgent: Full browser user agent string
 * - deviceType: 'mobile' | 'tablet' | 'desktop'
 * - browser: Browser name (Chrome, Firefox, Safari, etc.)
 * - os: Operating system (Windows, macOS, iOS, Android, etc.)
 * - screenResolution: Screen dimensions (e.g., "1920x1080")
 * - viewport: Browser viewport dimensions (e.g., "1440x900")
 * 
 * Feature-Specific Data:
 * - properties: JSONB object with event-specific data
 *   - Example: { recipeId: '123', ingredientCount: 5 }
 *   - Flexible schema per event type
 *   - Enables deep analysis without schema changes
 * 
 * Timing:
 * - timestamp: When event occurred
 * - timeOnPage: Time spent on page before event
 * 
 * Example Events:
 * 
 * ```typescript
 * // Recipe generation
 * {
 *   eventType: 'feature_use',
 *   eventCategory: 'recipe',
 *   eventAction: 'generate_ai_recipe',
 *   eventLabel: 'chat',
 *   properties: {
 *     ingredientCount: 5,
 *     missingCount: 2,
 *     generationTime: 3.2
 *   }
 * }
 * 
 * // Inventory add
 * {
 *   eventType: 'feature_use',
 *   eventCategory: 'inventory',
 *   eventAction: 'add_item',
 *   eventLabel: 'barcode_scan',
 *   properties: {
 *     storageLocation: 'refrigerator',
 *     hasNutrition: true
 *   }
 * }
 * 
 * // Error tracking
 * {
 *   eventType: 'error',
 *   eventCategory: 'api',
 *   eventAction: 'api_failure',
 *   eventLabel: 'openai_timeout',
 *   properties: {
 *     endpoint: '/api/chat',
 *     statusCode: 504,
 *     errorMessage: 'Gateway timeout'
 *   }
 * }
 * ```
 * 
 * Analytics Use Cases:
 * - Feature usage tracking (most/least used features)
 * - Funnel analysis (user journey completion rates)
 * - Error monitoring (error frequency, patterns)
 * - Performance insights (feature load times)
 * - Device analytics (mobile vs desktop usage)
 * - User segmentation (power users vs casual)
 * - A/B testing (feature variant performance)
 * 
 * Business Rules:
 * - All user interactions tracked
 * - Anonymous users tracked (userId null)
 * - SessionId groups events by visit
 * - Properties schema varies by event
 * - Timestamps in UTC
 * - Retention: 90 days default
 * 
 * Privacy:
 * - No PII in event properties
 * - User-specific data isolated by userId
 * - Anonymous events for logged-out users
 * - Compliant with analytics best practices
 * 
 * Indexes:
 * - analytics_events_user_id_idx: User-specific events
 * - analytics_events_session_id_idx: Session analytics
 * - analytics_events_event_type_idx: Filter by event type
 * - analytics_events_event_category_idx: Feature area analysis
 * - analytics_events_timestamp_idx: Time series queries
 * 
 * Relationships:
 * - users → analyticsEvents: SET NULL
 */
export const analyticsEvents = pgTable("analytics_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  sessionId: text("session_id").notNull(),
  
  // Event details
  eventType: text("event_type").notNull(), // 'page_view', 'feature_use', 'button_click', 'form_submit', 'error', etc.
  eventCategory: text("event_category").notNull(), // 'navigation', 'inventory', 'recipe', 'chat', 'meal_plan', etc.
  eventAction: text("event_action").notNull(), // Specific action taken
  eventLabel: text("event_label"), // Additional context
  eventValue: real("event_value"), // Numeric value if applicable
  
  // Context
  pageUrl: text("page_url"),
  referrer: text("referrer"),
  userAgent: text("user_agent"),
  deviceType: text("device_type"), // 'mobile', 'tablet', 'desktop'
  browser: text("browser"),
  os: text("os"),
  screenResolution: text("screen_resolution"),
  viewport: text("viewport"),
  
  // Feature-specific data
  properties: jsonb("properties").$type<Record<string, any>>(), // Flexible properties for specific events
  
  // Timing
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  timeOnPage: integer("time_on_page"), // Seconds spent on page before event
  
}, (table) => [
  index("analytics_events_user_id_idx").on(table.userId),
  index("analytics_events_session_id_idx").on(table.sessionId),
  index("analytics_events_event_type_idx").on(table.eventType),
  index("analytics_events_event_category_idx").on(table.eventCategory),
  index("analytics_events_timestamp_idx").on(table.timestamp),
]);

export const insertAnalyticsEventSchema = createInsertSchema(analyticsEvents).omit({
  id: true,
  timestamp: true,
}).extend({
  eventType: z.string(),
  eventCategory: z.string(),
  eventAction: z.string(),
  sessionId: z.string(),
});

export type InsertAnalyticsEvent = z.infer<typeof insertAnalyticsEventSchema>;
export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;

/**
 * User Sessions Table
 * 
 * Tracks user session metadata for analytics and engagement metrics.
 * Provides session-level insights beyond individual events.
 * 
 * Core Fields:
 * - id: UUID primary key
 * - sessionId: Unique session identifier (NOT the auth session)
 * - userId: Foreign key to users.id (SET NULL - track anonymous)
 * 
 * Session Duration:
 * - startTime: Session start timestamp
 * - endTime: Session end timestamp (updated on exit)
 * - duration: Total session length in seconds
 * - pageViews: Number of pages viewed in session
 * - events: Number of analytics events in session
 * 
 * Entry/Exit:
 * - entryPage: First page of session (landing page)
 * - exitPage: Last page before session end
 * - referrer: External referrer URL
 * - utmSource: UTM campaign source (e.g., 'google', 'facebook')
 * - utmMedium: UTM campaign medium (e.g., 'cpc', 'email')
 * - utmCampaign: UTM campaign name
 * 
 * Device Context:
 * - userAgent: Full browser user agent
 * - deviceType: 'mobile' | 'tablet' | 'desktop'
 * - browser: Browser name
 * - os: Operating system
 * - country: User's country (from IP geolocation)
 * - region: State/province
 * - city: City
 * 
 * Engagement Metrics:
 * - bounced: Boolean indicating single-page session
 *   - true: Only viewed one page (entryPage === exitPage)
 *   - false: Multiple pages viewed
 * - goalCompletions: Array of completed goal IDs
 *   - Example: ['signup', 'first_recipe', 'donation']
 *   - Tracks conversion events per session
 * 
 * Session Lifecycle:
 * 1. User visits site → create session record
 * 2. Page views/events → increment counters
 * 3. User navigates → update exitPage
 * 4. Session ends → set endTime, duration, bounced
 * 5. Goal completed → append to goalCompletions
 * 
 * Session Timeout:
 * - Standard: 30 minutes of inactivity
 * - New session after timeout
 * - Same user can have multiple sessions
 * 
 * Bounce Rate Calculation:
 * - bounced: true if only 1 page view AND duration < 10s
 * - Indicates low engagement
 * - Used for landing page optimization
 * 
 * Analytics Use Cases:
 * - Session duration trends
 * - Bounce rate by landing page
 * - Traffic source effectiveness (UTM analysis)
 * - Goal completion rates
 * - Device/browser preferences
 * - Geographic distribution
 * - User retention (session frequency)
 * 
 * Business Rules:
 * - One sessionId per browser session
 * - Anonymous sessions tracked (userId null)
 * - Geographic data from IP (privacy-friendly)
 * - UTM parameters from URL query string
 * - endTime updated on page visibility change
 * - Duration calculated: endTime - startTime
 * 
 * Indexes:
 * - user_sessions_session_id_idx: Unique session lookup
 * - user_sessions_user_id_idx: User's session history
 * - user_sessions_start_time_idx: Time series analysis
 * 
 * Relationships:
 * - users → userSessions: SET NULL
 * - userSessions ← analyticsEvents: Referenced by sessionId
 */
export const userSessions = pgTable("user_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: text("session_id").notNull().unique(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  
  // Session details
  startTime: timestamp("start_time").notNull().defaultNow(),
  endTime: timestamp("end_time"),
  duration: integer("duration"), // Total session duration in seconds
  pageViews: integer("page_views").notNull().default(0),
  events: integer("events").notNull().default(0),
  
  // Entry/Exit
  entryPage: text("entry_page"),
  exitPage: text("exit_page"),
  referrer: text("referrer"),
  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"),
  utmCampaign: text("utm_campaign"),
  
  // Device info
  userAgent: text("user_agent"),
  deviceType: text("device_type"),
  browser: text("browser"),
  os: text("os"),
  country: text("country"),
  region: text("region"),
  city: text("city"),
  
  // Engagement metrics
  bounced: boolean("bounced").notNull().default(false),
  goalCompletions: jsonb("goal_completions").$type<string[]>(), // List of completed goals
  
}, (table) => [
  index("user_sessions_session_id_idx").on(table.sessionId),
  index("user_sessions_user_id_idx").on(table.userId),
  index("user_sessions_start_time_idx").on(table.startTime),
]);

export const insertUserSessionSchema = createInsertSchema(userSessions).omit({
  id: true,
  startTime: true,
});

export type InsertUserSession = z.infer<typeof insertUserSessionSchema>;
export type UserSession = typeof userSessions.$inferSelect;

/**
 * Onboarding Inventory Table
 * 
 * Pre-populated food items with USDA data for quick onboarding.
 * Enables users to quickly stock their pantry during setup.
 * 
 * Core Fields:
 * - id: UUID primary key
 * - displayName: User-friendly name (unique, e.g., "Whole Milk")
 * - upc: UPC barcode if available (for barcode matching)
 * - fdcId: USDA FDC ID (for nutrition lookup)
 * 
 * Basic Item Data:
 * - description: Detailed USDA description
 * - quantity: Default quantity for onboarding (e.g., "1", "2")
 * - unit: Default unit (gallon, lb, dozen, etc.)
 * - storage: Default storage location
 *   - 'Pantry', 'Refrigerator', 'Freezer', 'Counter'
 * - expirationDays: Default shelf life (days after addition)
 * - category: Original category from mapping
 * - foodCategory: Normalized to 5 major groups
 *   - 'Dairy', 'Produce', 'Meat', 'Grains', 'Other'
 * 
 * USDA Enriched Data:
 * - nutrition: JSONB with NutritionInfo
 * - usdaData: Complete USDA FoodData Central response
 * - brandOwner: Manufacturer (for branded foods)
 * - ingredients: Ingredient list text
 * - servingSize: USDA serving size (e.g., "1 cup")
 * - servingSizeUnit: Unit for serving (g, ml, oz, etc.)
 * 
 * Image Data:
 * - imageUrl: Product photo
 * - barcodeLookupData: Full barcode API response
 * 
 * Metadata:
 * - lastUpdated: When data was last refreshed
 * - dataSource: How data was obtained
 *   - 'usda_upc': USDA lookup by UPC
 *   - 'usda_fdc': USDA lookup by FDC ID
 *   - 'usda_search': USDA text search
 *   - 'manual': Manually curated
 * 
 * Onboarding Flow:
 * 1. User starts onboarding
 * 2. Show common food items from this table
 * 3. User selects items they have
 * 4. Selected items → copied to userInventory
 * 5. Quantities/expiration dates editable
 * 6. User proceeds to create account
 * 
 * Item Selection Categories:
 * - Dairy: Milk, Eggs, Cheese, Yogurt, Butter
 * - Produce: Apples, Bananas, Carrots, Lettuce, Tomatoes
 * - Meat: Chicken Breast, Ground Beef, Bacon, Salmon
 * - Grains: Bread, Rice, Pasta, Flour, Oats
 * - Pantry: Salt, Pepper, Olive Oil, Sugar, Garlic
 * 
 * Business Rules:
 * - DisplayName must be unique (single canonical item)
 * - Pre-populated with ~50-100 common items
 * - USDA data periodically refreshed
 * - Default quantities/storage based on typical use
 * - Expiration days based on storage location
 * - Images from barcode lookup or manual upload
 * 
 * Data Quality:
 * - All items have USDA nutrition data
 * - Verified UPC codes where available
 * - Accurate default storage locations
 * - Realistic expiration estimates
 * - High-quality product photos
 * 
 * Maintenance:
 * - Quarterly USDA data refresh
 * - Add seasonal items
 * - Update based on user feedback
 * - Remove discontinued products
 * 
 * Indexes:
 * - onboarding_inventory_display_name_idx: Unique item lookup
 * - onboarding_inventory_upc_idx: Barcode matching
 * - onboarding_inventory_fdc_id_idx: USDA data linking
 * - onboarding_inventory_category_idx: Category filtering
 * - onboarding_inventory_food_category_idx: Major group filtering
 * 
 * Usage Example:
 * ```typescript
 * // Get all dairy items for onboarding
 * const dairyItems = await db
 *   .select()
 *   .from(onboardingInventory)
 *   .where(eq(onboardingInventory.foodCategory, 'Dairy'));
 * 
 * // Copy selected items to user inventory
 * for (const item of selectedItems) {
 *   await db.insert(userInventory).values({
 *     userId,
 *     name: item.displayName,
 *     quantity: item.quantity,
 *     unit: item.unit,
 *     storageLocationId: userStorageMap[item.storage],
 *     expirationDate: calculateExpiration(item.expirationDays),
 *     foodCategory: item.foodCategory,
 *     nutrition: item.nutrition,
 *     // ... other fields
 *   });
 * }
 * ```
 */
export const onboardingInventory = pgTable("onboarding_inventory", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Identifier fields
  displayName: text("display_name").notNull().unique(), // Unique name for the item
  upc: text("upc"), // UPC barcode if available
  fdcId: varchar("fdc_id"), // FDC ID from USDA
  
  // Basic item data
  description: text("description"), // Detailed description from USDA or predefined
  quantity: text("quantity").notNull(), // Default quantity for onboarding
  unit: text("unit").notNull(), // Default unit
  storage: text("storage").notNull(), // Default storage location (Pantry, Fridge, Freezer, etc.)
  expirationDays: integer("expiration_days").notNull(), // Default shelf life in days
  category: text("category"), // Original category from our mapping
  foodCategory: text("food_category"), // Normalized to 5 major groups
  
  // USDA enriched data
  nutrition: jsonb("nutrition"), // Nutrition data from USDA
  usdaData: jsonb("usda_data"), // Full USDA data object
  brandOwner: text("brand_owner"),
  ingredients: text("ingredients"),
  servingSize: text("serving_size"),
  servingSizeUnit: text("serving_size_unit"),
  
  // Image data
  imageUrl: text("image_url"),
  barcodeLookupData: jsonb("barcode_lookup_data"),
  
  // Metadata
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  dataSource: text("data_source"), // 'usda_upc', 'usda_fdc', 'usda_search', 'manual'
}, (table) => [
  index("onboarding_inventory_display_name_idx").on(table.displayName),
  index("onboarding_inventory_upc_idx").on(table.upc),
  index("onboarding_inventory_fdc_id_idx").on(table.fdcId),
  index("onboarding_inventory_category_idx").on(table.category),
  index("onboarding_inventory_food_category_idx").on(table.foodCategory),
]);

export const insertOnboardingInventorySchema = createInsertSchema(onboardingInventory).omit({
  id: true,
  lastUpdated: true,
});

export type InsertOnboardingInventory = z.infer<typeof insertOnboardingInventorySchema>;
export type OnboardingInventory = typeof onboardingInventory.$inferSelect;

/**
 * Cooking Terms Table
 * 
 * Interactive cooking knowledge bank with techniques and terminology.
 * Provides contextual help during recipe viewing and cooking.
 * 
 * Core Fields:
 * - id: UUID primary key
 * - term: Cooking term or technique name (unique)
 *   - Examples: "julienne", "sauté", "blanch", "deglaze"
 * - category: Term classification
 *   - 'knife_skills': Cutting techniques
 *   - 'cooking_methods': Heat-based techniques
 *   - 'prep_techniques': Preparation methods
 *   - 'baking_terms': Baking-specific
 *   - 'equipment': Tool and appliance terms
 * 
 * Definitions:
 * - shortDefinition: Brief tooltip text (1-2 sentences)
 *   - Displayed inline in recipes
 *   - Quick reference without leaving page
 * - longDefinition: Detailed explanation with steps
 *   - Expandable full description
 *   - Step-by-step instructions
 *   - When and why to use technique
 * - example: Usage example in context
 *   - Sample recipe instruction
 *   - Demonstrates proper application
 * 
 * Additional Information:
 * - difficulty: Skill level required
 *   - 'beginner': Basic techniques (chopping, stirring)
 *   - 'intermediate': Moderate skills (sautéing, folding)
 *   - 'advanced': Complex techniques (tempering, flambé)
 * - timeEstimate: How long technique takes
 *   - Examples: "2-3 minutes", "15-20 seconds", "1 hour"
 * - tools: Array of required tools/equipment
 *   - Example: ["chef's knife", "cutting board", "bowl"]
 * - tips: Array of pro tips and common mistakes
 *   - Helpful hints for success
 *   - What to avoid
 *   - Quality indicators
 * - relatedTerms: Array of related techniques
 *   - Cross-references for learning
 *   - Technique progressions
 * 
 * Media:
 * - imageUrl: Illustration or photo demonstrating technique
 * - videoUrl: Video tutorial link (YouTube, Vimeo, etc.)
 * 
 * Search & Matching:
 * - searchTerms: Alternative names/spellings
 *   - Example: ["sauté", "saute", "pan-fry"]
 *   - Enables flexible recipe instruction matching
 *   - Supports international variations
 * 
 * Metadata:
 * - createdAt: When term was added
 * - updatedAt: Last modification timestamp
 * 
 * Recipe Integration:
 * - Terms auto-detected in recipe instructions
 * - Hover over term → show shortDefinition tooltip
 * - Click term → expand longDefinition modal
 * - Links to related terms for learning progression
 * 
 * Example Term Entry:
 * ```typescript
 * {
 *   term: "julienne",
 *   category: "knife_skills",
 *   shortDefinition: "Cut food into thin, matchstick-shaped strips",
 *   longDefinition: "A French cutting technique that creates uniform thin strips...",
 *   example: "Julienne the carrots into 1/8-inch matchsticks for the salad",
 *   difficulty: "intermediate",
 *   timeEstimate: "5-7 minutes",
 *   tools: ["chef's knife", "cutting board", "ruler (optional)"],
 *   tips: [
 *     "Keep fingers curled inward for safety",
 *     "Use a sharp knife for clean cuts",
 *     "Cut vegetables into 2-inch sections first"
 *   ],
 *   relatedTerms: ["dice", "brunoise", "chiffonade", "mince"],
 *   imageUrl: "/images/techniques/julienne.jpg",
 *   videoUrl: "https://youtube.com/watch?v=..."
 * }
 * ```
 * 
 * Learning Features:
 * - Progressive difficulty (beginner → advanced)
 * - Related terms for skill building
 * - Video tutorials for visual learning
 * - Time estimates for planning
 * - Common mistakes prevention
 * 
 * Business Rules:
 * - Term names must be unique
 * - ShortDefinition under 150 characters
 * - All terms have category and difficulty
 * - Search terms enable fuzzy matching
 * - Media links validated on insert
 * 
 * Content Curation:
 * - Curated by culinary experts
 * - Verified techniques and definitions
 * - Professional photography/video
 * - Regular content updates
 * 
 * Indexes:
 * - cooking_terms_term_idx: Fast term lookup
 * - cooking_terms_category_idx: Browse by category
 * 
 * Usage Example:
 * ```typescript
 * // Auto-link terms in recipe instructions
 * function highlightCookingTerms(instruction: string) {
 *   const terms = await db.select().from(cookingTerms);
 *   
 *   for (const term of terms) {
 *     const pattern = new RegExp(
 *       `\\b(${[term.term, ...term.searchTerms].join('|')})\\b`,
 *       'gi'
 *     );
 *     
 *     instruction = instruction.replace(pattern, (match) =>
 *       `<Tooltip content="${term.shortDefinition}">
 *         <span class="cooking-term">${match}</span>
 *       </Tooltip>`
 *     );
 *   }
 *   
 *   return instruction;
 * }
 * ```
 */
export const cookingTerms = pgTable("cooking_terms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Term details
  term: text("term").notNull().unique(), // e.g., "julienne", "sauté", "blanch"
  category: text("category").notNull(), // "knife_skills", "cooking_methods", "prep_techniques"
  
  // Definitions
  shortDefinition: text("short_definition").notNull(), // Brief tooltip definition (1-2 sentences)
  longDefinition: text("long_definition").notNull(), // Detailed explanation with steps
  example: text("example"), // Example usage of the term
  
  // Additional information
  difficulty: text("difficulty"), // "beginner", "intermediate", "advanced"
  timeEstimate: text("time_estimate"), // e.g., "2-3 minutes"
  tools: text("tools").array(), // Tools needed for this technique
  tips: text("tips").array(), // Pro tips and common mistakes
  relatedTerms: text("related_terms").array(), // Related techniques to learn
  
  // Media
  imageUrl: text("image_url"), // Optional illustration
  videoUrl: text("video_url"), // Optional video tutorial link
  
  // Metadata
  searchTerms: text("search_terms").array(), // Alternative names/spellings for matching
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("cooking_terms_term_idx").on(table.term),
  index("cooking_terms_category_idx").on(table.category),
]);

export const insertCookingTermSchema = createInsertSchema(cookingTerms).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCookingTerm = z.infer<typeof insertCookingTermSchema>;
export type CookingTerm = typeof cookingTerms.$inferSelect;

/**
 * Appliance Library Table
 * 
 * Master catalog of all available appliances, cookware, and bakeware.
 * Reference data for userAppliances table.
 * 
 * Core Fields:
 * - id: UUID primary key
 * - name: Appliance/item name
 *   - Examples: "Stand Mixer", "9x13 Baking Pan", "Chef's Knife"
 * - category: High-level classification
 *   - 'appliance': Electric/gas appliances
 *   - 'cookware': Pots, pans, skillets
 *   - 'bakeware': Baking dishes, sheets, molds
 *   - 'utensil': Tools and gadgets
 * - subcategory: Detailed classification
 *   - Appliances: 'oven', 'stovetop', 'mixer', 'blender', 'air_fryer'
 *   - Cookware: 'pan', 'pot', 'wok', 'griddle'
 *   - Bakeware: 'sheet', 'cake_pan', 'muffin_tin', 'loaf_pan'
 *   - Utensils: 'knife', 'spatula', 'whisk', 'thermometer'
 * 
 * Product Details:
 * - brand: Manufacturer name (optional)
 *   - Examples: "KitchenAid", "Le Creuset", "Cuisinart"
 * - model: Specific model number/name (optional)
 * - description: Detailed description and features
 * - sizeOrCapacity: Dimensions or volume
 *   - Pans: '12-inch', '9x13 inches'
 *   - Pots: '5-quart', '8-liter'
 *   - Appliances: 'Countertop', 'Full-size'
 * - material: Construction material
 *   - Examples: 'stainless steel', 'cast iron', 'ceramic', 'aluminum'
 * 
 * Appliance Capabilities:
 * - capabilities: Array of functions (for appliances)
 *   - Examples: ['bake', 'broil', 'toast', 'air fry', 'convection']
 *   - Used for recipe equipment matching
 *   - Determines recipe compatibility
 * 
 * Common Items:
 * - isCommon: Flag for standard kitchen items
 *   - true: Items most people have (pot, pan, knife, etc.)
 *   - false: Specialty items (pasta maker, sous vide, etc.)
 *   - Used for recipe filtering (show recipes using common equipment)
 * 
 * Media & Search:
 * - imageUrl: Product photo or illustration
 * - searchTerms: Alternative names for flexible search
 *   - Examples: ["stand mixer", "mixer", "kitchen mixer", "electric mixer"]
 * 
 * Metadata:
 * - createdAt: When item was added to library
 * - updatedAt: Last modification timestamp
 * 
 * Example Library Entries:
 * 
 * ```typescript
 * // Appliance
 * {
 *   name: "Stand Mixer",
 *   category: "appliance",
 *   subcategory: "mixer",
 *   brand: "KitchenAid",
 *   model: "Classic Series",
 *   description: "5-quart stand mixer with multiple attachments",
 *   capabilities: ["mix", "knead", "whip", "beat"],
 *   sizeOrCapacity: "5-quart",
 *   isCommon: false,
 *   searchTerms: ["stand mixer", "kitchen mixer", "electric mixer"]
 * }
 * 
 * // Cookware
 * {
 *   name: "12-inch Cast Iron Skillet",
 *   category: "cookware",
 *   subcategory: "pan",
 *   brand: "Lodge",
 *   description: "Pre-seasoned cast iron skillet for stovetop and oven",
 *   sizeOrCapacity: "12-inch",
 *   material: "cast iron",
 *   isCommon: true,
 *   searchTerms: ["skillet", "frying pan", "cast iron pan"]
 * }
 * 
 * // Bakeware
 * {
 *   name: "9x13 Baking Pan",
 *   category: "bakeware",
 *   subcategory: "cake_pan",
 *   description: "Standard rectangular baking pan for cakes and casseroles",
 *   sizeOrCapacity: "9x13 inches",
 *   material: "aluminum",
 *   isCommon: true,
 *   searchTerms: ["baking pan", "cake pan", "casserole dish", "9x13"]
 * }
 * ```
 * 
 * Recipe Integration:
 * - Recipes specify neededEquipment array
 * - Match against library items or userAppliances
 * - Filter recipes by available equipment
 * - Suggest equipment for recipes
 * 
 * User Workflow:
 * 1. User views appliance library
 * 2. Selects items they own
 * 3. Creates userAppliance records (linked via applianceLibraryId)
 * 4. Recipes filtered by owned equipment
 * 5. Equipment suggestions for unavailable recipes
 * 
 * Business Rules:
 * - Library curated by admin/staff
 * - Common items prioritized in UI
 * - Search terms enable flexible matching
 * - Capabilities required for appliances
 * - Images recommended for all items
 * 
 * Content Curation:
 * - Comprehensive coverage (100+ items)
 * - Accurate capabilities and dimensions
 * - Quality product photos
 * - Regular additions for new equipment
 * - User requests tracked for additions
 * 
 * Indexes:
 * - appliance_library_category_idx: Browse by category
 * - appliance_library_subcategory_idx: Filter by subcategory
 * - appliance_library_is_common_idx: Common items first
 * 
 * Relationships:
 * - applianceLibrary ← userAppliances: Referenced by applianceLibraryId
 * - applianceLibrary ← userRecipes.neededEquipment: String matching
 */
export const applianceLibrary = pgTable("appliance_library", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  category: text("category").notNull(), // 'appliance', 'cookware', 'bakeware', 'utensil'
  subcategory: text("subcategory"), // 'oven', 'stovetop', 'pans', 'knives', etc.
  brand: text("brand"), // Optional brand for specific items
  model: text("model"), // Optional model
  description: text("description"),
  capabilities: text("capabilities").array(), // ['bake', 'broil', 'toast', 'air fry'] for appliances
  sizeOrCapacity: text("size_or_capacity"), // '9x13"' for pans, '5qt' for pots
  material: text("material"), // 'stainless steel', 'cast iron', 'ceramic'
  isCommon: boolean("is_common").notNull().default(false), // Common items most people have
  imageUrl: text("image_url"),
  searchTerms: text("search_terms").array(), // Alternative names for searching
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("appliance_library_category_idx").on(table.category),
  index("appliance_library_subcategory_idx").on(table.subcategory),
  index("appliance_library_is_common_idx").on(table.isCommon),
]);

export const insertApplianceLibrarySchema = createInsertSchema(applianceLibrary).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertApplianceLibrary = z.infer<typeof insertApplianceLibrarySchema>;
export type ApplianceLibrary = typeof applianceLibrary.$inferSelect;

/**
 * Conversations Table (Task 7 - AI Chat Assistant)
 * 
 * Manages AI chat conversations with context tracking.
 * Each conversation is a separate thread of messages.
 * 
 * Fields:
 * - id: UUID primary key
 * - userId: Foreign key to users.id (CASCADE delete)
 * - title: Conversation title (auto-generated or user-defined)
 * - createdAt: When conversation started
 * - updatedAt: Last activity in conversation
 * 
 * Business Rules:
 * - Title auto-generated from first message if not provided
 * - Updated timestamp refreshed on new messages
 * - Conversations ordered by updatedAt for recency
 * 
 * Indexes:
 * - conversations_user_id_idx: User's conversation list
 * - conversations_updated_at_idx: Recent conversations first
 * 
 * Relationships:
 * - users → conversations: CASCADE
 * - conversations ← messages: Referenced by conversationId
 * - conversations ← conversationContext: One-to-one context
 */
export const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull().default("New Conversation"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("conversations_user_id_idx").on(table.userId),
  index("conversations_updated_at_idx").on(table.updatedAt),
]);

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;

/**
 * Messages Table (Task 7 - AI Chat Assistant)
 * 
 * Individual messages within conversations.
 * Tracks token usage for cost monitoring.
 * 
 * Fields:
 * - id: UUID primary key
 * - conversationId: Foreign key to conversations.id (CASCADE delete)
 * - role: Message sender ('user' | 'assistant' | 'system')
 * - content: Message text content
 * - tokensUsed: OpenAI tokens consumed (for cost tracking)
 * - timestamp: When message was sent
 * 
 * Token Tracking:
 * - User messages: Input tokens
 * - Assistant messages: Completion tokens
 * - Used for billing and rate limiting
 * 
 * Indexes:
 * - messages_conversation_id_idx: Messages in conversation
 * - messages_timestamp_idx: Chronological ordering
 * 
 * Relationships:
 * - conversations → messages: CASCADE
 */
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // 'user', 'assistant', 'system'
  content: text("content").notNull(),
  tokensUsed: integer("tokens_used").default(0),
  timestamp: timestamp("timestamp").defaultNow(),
  metadata: jsonb("metadata").$type<{
    functionCall?: string;
    citedSources?: string[];
    sentiment?: string;
    feedback?: { rating: number; comment?: string };
  }>(),
}, (table) => [
  index("messages_conversation_id_idx").on(table.conversationId),
  index("messages_timestamp_idx").on(table.timestamp),
]);

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  timestamp: true,
});

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

/**
 * Conversation Context Table (Task 7 - AI Chat Assistant)
 * 
 * Stores summarized context and key facts for conversations.
 * Enables efficient context management for long conversations.
 * 
 * Fields:
 * - conversationId: Foreign key to conversations.id (PRIMARY KEY)
 * - contextSummary: AI-generated summary of conversation
 * - keyFacts: JSONB array of important facts extracted
 * - updatedAt: When context was last updated
 * 
 * Context Management:
 * - Summary regenerated periodically (every N messages)
 * - Key facts extracted for quick reference
 * - Reduces token usage for context window
 * 
 * Relationships:
 * - conversations → conversationContext: ONE-TO-ONE
 */
export const conversationContext = pgTable("conversation_context", {
  conversationId: varchar("conversation_id").primaryKey().references(() => conversations.id, { onDelete: "cascade" }),
  contextSummary: text("context_summary"),
  keyFacts: jsonb("key_facts").$type<Array<{
    fact: string;
    category: string;
    timestamp: string;
  }>>().default([]),
  lastSummarized: timestamp("last_summarized").defaultNow(),
  messageCount: integer("message_count").default(0),
});

export const insertConversationContextSchema = createInsertSchema(conversationContext).omit({
  lastSummarized: true,
});

export type InsertConversationContext = z.infer<typeof insertConversationContextSchema>;
export type ConversationContext = typeof conversationContext.$inferSelect;

/**
 * Voice Commands Table (Task 8 - Voice Commands)
 * 
 * Tracks voice command usage and success rates.
 * Enables voice-controlled app navigation.
 * 
 * Fields:
 * - id: UUID primary key
 * - userId: Foreign key to users.id (CASCADE delete)
 * - transcript: Speech-to-text result
 * - commandType: Interpreted command category
 * - actionTaken: What action was executed
 * - success: Whether command executed successfully
 * - timestamp: When command was issued
 * 
 * Command Types:
 * - navigation: "Show me X page"
 * - action: "Add X to cart"
 * - query: "What is X?"
 * - settings: "Change X setting"
 * 
 * Analytics:
 * - Success rate by command type
 * - Most common voice commands
 * - Failed command patterns for improvement
 * 
 * Indexes:
 * - voice_commands_user_id_idx: User's command history
 * - voice_commands_timestamp_idx: Recent commands
 * - voice_commands_success_idx: Success/failure analysis
 * 
 * Relationships:
 * - users → voiceCommands: CASCADE
 */
export const voiceCommands = pgTable("voice_commands", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  transcript: text("transcript").notNull(),
  commandType: text("command_type"),
  actionTaken: text("action_taken"),
  success: boolean("success").notNull().default(false),
  timestamp: timestamp("timestamp").defaultNow(),
}, (table) => [
  index("voice_commands_user_id_idx").on(table.userId),
  index("voice_commands_timestamp_idx").on(table.timestamp),
  index("voice_commands_success_idx").on(table.success),
]);

export const insertVoiceCommandSchema = createInsertSchema(voiceCommands).omit({
  id: true,
  timestamp: true,
});

export type InsertVoiceCommand = z.infer<typeof insertVoiceCommandSchema>;
export type VoiceCommand = typeof voiceCommands.$inferSelect;

/**
 * Draft Templates Table (Task 9 - Smart Email/Message Drafting)
 * 
 * Reusable templates for message drafting.
 * Tracks usage for popularity metrics.
 * 
 * Fields:
 * - id: UUID primary key
 * - contextType: Type of message context
 * - templatePrompt: Template for AI generation
 * - usageCount: Times template has been used
 * - isActive: Flag to enable/disable templates
 * - createdAt: When template was created
 * - updatedAt: Last modification timestamp
 * 
 * Context Types:
 * - email: Professional email responses
 * - message: Instant messages or chat
 * - comment: Social media or forum comments  
 * - customer_complaint: Response to complaints
 * - inquiry: Response to questions
 * - follow_up: Follow-up messages
 * - thank_you: Thank you messages
 * - apology: Apology messages
 * - general: General purpose responses
 * 
 * Indexes:
 * - draft_templates_context_type_idx: Filter by type
 * - draft_templates_usage_count_idx: Popular templates
 */
export const draftTemplates = pgTable("draft_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contextType: text("context_type").notNull(),
  templatePrompt: text("template_prompt").notNull(),
  usageCount: integer("usage_count").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("draft_templates_context_type_idx").on(table.contextType),
  index("draft_templates_usage_count_idx").on(table.usageCount),
]);

export const insertDraftTemplateSchema = createInsertSchema(draftTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDraftTemplate = z.infer<typeof insertDraftTemplateSchema>;
export type DraftTemplate = typeof draftTemplates.$inferSelect;

/**
 * Generated Drafts Table (Task 9 - Smart Email/Message Drafting)
 * 
 * AI-generated message drafts with tracking.
 * Records which drafts were selected and edited.
 * 
 * Fields:
 * - id: UUID primary key
 * - userId: Foreign key to users.id (CASCADE delete)
 * - originalMessageId: ID of message being responded to
 * - originalMessage: The message content being responded to
 * - draftContent: Generated draft text
 * - selected: Whether user selected this draft
 * - edited: Whether user edited before sending
 * - editedContent: The edited version of the draft (if edited)
 * - tone: Tone of the draft (formal, casual, friendly, apologetic, solution-focused, empathetic)
 * - contextType: Type of content being drafted ('email', 'message', 'comment')
 * - metadata: Additional generation metadata (model, temperature, etc.)
 * - createdAt: When draft was generated
 * - updatedAt: Last modification timestamp
 * 
 * Analytics:
 * - Selection rate by tone
 * - Edit frequency (quality metric)
 * - Most effective draft styles
 * 
 * Indexes:
 * - generated_drafts_user_id_idx: User's draft history
 * - generated_drafts_selected_idx: Selected drafts analysis
 * - generated_drafts_original_message_id_idx: Group drafts by original message
 * 
 * Relationships:
 * - users → generatedDrafts: CASCADE
 */
export const generatedDrafts = pgTable("generated_drafts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  originalMessageId: text("original_message_id"),
  originalMessage: text("original_message"),
  draftContent: text("draft_content").notNull(),
  selected: boolean("selected").notNull().default(false),
  edited: boolean("edited").notNull().default(false),
  editedContent: text("edited_content"),
  tone: text("tone"), // 'formal', 'casual', 'friendly', 'apologetic', 'solution-focused', 'empathetic'
  contextType: text("context_type"), // 'email', 'message', 'comment'
  metadata: jsonb("metadata").$type<{
    model?: string;
    temperature?: number;
    tokensUsed?: number;
    processingTime?: number;
    templateId?: string;
  }>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("generated_drafts_user_id_idx").on(table.userId),
  index("generated_drafts_selected_idx").on(table.selected),
  index("generated_drafts_original_message_id_idx").on(table.originalMessageId),
]);

export const insertGeneratedDraftSchema = createInsertSchema(generatedDrafts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertGeneratedDraft = z.infer<typeof insertGeneratedDraftSchema>;
export type GeneratedDraft = typeof generatedDrafts.$inferSelect;

/**
 * Writing Sessions Table (Task 10 - Writing Assistant)
 * 
 * Tracks writing improvement sessions.
 * Stores original and improved versions.
 * 
 * Fields:
 * - id: UUID primary key
 * - userId: Foreign key to users.id (CASCADE delete)
 * - documentId: Optional document identifier
 * - originalText: User's original text
 * - improvedText: AI-improved version
 * - improvementsApplied: JSONB array of applied improvements
 * - createdAt: When session started
 * 
 * Improvement Types:
 * - grammar: Grammar corrections
 * - spelling: Spelling fixes
 * - style: Style improvements
 * - tone: Tone adjustments
 * - clarity: Clarity enhancements
 * 
 * Indexes:
 * - writing_sessions_user_id_idx: User's writing history
 * - writing_sessions_document_id_idx: Document-specific sessions
 * 
 * Relationships:
 * - users → writingSessions: CASCADE
 * - writingSessions ← writingSuggestions: Referenced by sessionId
 */
export const writingSessions = pgTable("writing_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  documentId: text("document_id"),
  originalText: text("original_text").notNull(),
  improvedText: text("improved_text"),
  improvementsApplied: jsonb("improvements_applied").$type<string[]>(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("writing_sessions_user_id_idx").on(table.userId),
  index("writing_sessions_document_id_idx").on(table.documentId),
]);

export const insertWritingSessionSchema = createInsertSchema(writingSessions).omit({
  id: true,
  createdAt: true,
});

export type InsertWritingSession = z.infer<typeof insertWritingSessionSchema>;
export type WritingSession = typeof writingSessions.$inferSelect;

/**
 * Writing Suggestions Table (Task 10 - Writing Assistant)
 * 
 * Individual suggestions within writing sessions.
 * Tracks acceptance rate for quality metrics.
 * 
 * Fields:
 * - id: UUID primary key
 * - sessionId: Foreign key to writingSessions.id (CASCADE delete)
 * - suggestionType: Type of suggestion
 * - originalSnippet: Original text snippet
 * - suggestedSnippet: Suggested replacement
 * - accepted: Whether user accepted suggestion
 * - reason: Explanation for the suggestion
 * - createdAt: When suggestion was made
 * 
 * Suggestion Types:
 * - grammar: Grammar correction
 * - spelling: Spelling correction
 * - style: Style improvement
 * - tone: Tone adjustment
 * - clarity: Clarity improvement
 * - conciseness: Make more concise
 * - vocabulary: Better word choice
 * 
 * Analytics:
 * - Acceptance rate by type
 * - Most common corrections
 * - User writing patterns
 * 
 * Indexes:
 * - writing_suggestions_session_id_idx: Suggestions for session
 * - writing_suggestions_type_idx: Filter by suggestion type
 * - writing_suggestions_accepted_idx: Acceptance analysis
 * 
 * Relationships:
 * - writingSessions → writingSuggestions: CASCADE
 */
export const writingSuggestions = pgTable("writing_suggestions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => writingSessions.id, { onDelete: "cascade" }),
  suggestionType: text("suggestion_type").notNull(),
  originalSnippet: text("original_snippet").notNull(),
  suggestedSnippet: text("suggested_snippet").notNull(),
  accepted: boolean("accepted").notNull().default(false),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("writing_suggestions_session_id_idx").on(table.sessionId),
  index("writing_suggestions_type_idx").on(table.suggestionType),
  index("writing_suggestions_accepted_idx").on(table.accepted),
]);

export const insertWritingSuggestionSchema = createInsertSchema(writingSuggestions).omit({
  id: true,
  createdAt: true,
});

export type InsertWritingSuggestion = z.infer<typeof insertWritingSuggestionSchema>;
export type WritingSuggestion = typeof writingSuggestions.$inferSelect;

/**
 * Activity Logs Table
 * 
 * Comprehensive audit trail for all user actions and system events.
 * Tracks every significant activity for analytics, debugging, and compliance.
 * 
 * Core Fields:
 * - id: UUID primary key
 * - userId: Foreign key to users.id (nullable for system events)
 * - action: Type of action performed
 *   - User actions: 'login', 'logout', 'signup', 'settings_changed'
 *   - Food inventory: 'food_added', 'food_updated', 'food_deleted', 'food_consumed'
 *   - Recipes: 'recipe_generated', 'recipe_saved', 'recipe_deleted', 'recipe_rated', 'recipe_viewed'
 *   - AI chat: 'message_sent', 'ai_response_received'
 *   - Notifications: 'notification_sent', 'notification_dismissed'
 *   - Shopping: 'shopping_list_created', 'item_checked_off'
 *   - Meal planning: 'meal_planned', 'meal_completed'
 *   - System: 'data_exported', 'bulk_import', 'cleanup_job', 'error_occurred'
 * - entity: What was affected (e.g., 'food_item', 'recipe', 'user', 'meal_plan')
 * - entityId: ID of the affected entity (nullable for actions without specific entity)
 * 
 * Context & Metadata:
 * - metadata: JSONB field for additional context
 *   - Can include: previous values, new values, error details, user input, etc.
 *   - Example: { oldName: "Milk", newName: "Whole Milk", location: "fridge" }
 * - ipAddress: User's IP address for security auditing (nullable)
 * - userAgent: Browser/device information (nullable)
 * - sessionId: Links to user session for grouping activities (nullable)
 * - timestamp: When the action occurred
 * 
 * Privacy & Security:
 * - Sensitive data (passwords, tokens) never logged in metadata
 * - IP addresses stored for security but can be anonymized
 * - User agent helps detect automated/suspicious activity
 * - GDPR compliant with data deletion on user request
 * 
 * Performance Optimizations:
 * - Asynchronous logging (doesn't block requests)
 * - Batch inserts for high-volume events
 * - Retention policy for automatic cleanup (90 days default)
 * - Archival for important events before deletion
 * 
 * Query Patterns:
 * - User timeline: Filter by userId + timestamp DESC
 * - Action audit: Filter by action type
 * - Entity history: Filter by entity + entityId
 * - System events: WHERE userId IS NULL
 * - Security audit: Filter by IP address or suspicious patterns
 * 
 * Business Rules:
 * - Critical actions always logged (auth, deletions, admin actions)
 * - Read operations optionally logged (configurable)
 * - System events have null userId
 * - Errors logged with full context in metadata
 * - Retention: 90 days default, configurable per action type
 * 
 * Analytics Use Cases:
 * - User engagement metrics (actions per day/week)
 * - Feature usage tracking (which features are popular)
 * - Error tracking and debugging
 * - Security audit trail
 * - Compliance reporting
 * - Performance monitoring (via metadata.duration)
 * 
 * Example Log Entries:
 * 
 * ```typescript
 * // Food item added
 * {
 *   userId: "user123",
 *   action: "food_added",
 *   entity: "food_item",
 *   entityId: "food456",
 *   metadata: {
 *     name: "Organic Milk",
 *     location: "fridge",
 *     expirationDate: "2024-01-15",
 *     quantity: 1
 *   },
 *   ipAddress: "192.168.1.1",
 *   userAgent: "Mozilla/5.0...",
 *   sessionId: "session789",
 *   timestamp: "2024-01-05T10:30:00Z"
 * }
 * 
 * // Recipe generated
 * {
 *   userId: "user123",
 *   action: "recipe_generated",
 *   entity: "recipe",
 *   entityId: "recipe789",
 *   metadata: {
 *     title: "Chicken Stir Fry",
 *     source: "ai_generated",
 *     ingredientsUsed: 5,
 *     prompt: "Quick dinner with chicken and vegetables"
 *   },
 *   timestamp: "2024-01-05T18:45:00Z"
 * }
 * 
 * // System event
 * {
 *   userId: null,
 *   action: "cleanup_job",
 *   entity: "system",
 *   metadata: {
 *     type: "expired_logs",
 *     deletedCount: 1523,
 *     duration: 450,
 *     status: "success"
 *   },
 *   timestamp: "2024-01-05T02:00:00Z"
 * }
 * ```
 * 
 * Indexes:
 * - activity_logs_user_id_idx: User-specific queries
 * - activity_logs_action_idx: Filter by action type
 * - activity_logs_timestamp_idx: Time-based queries
 * - activity_logs_entity_entity_id_idx: Entity history lookup
 * 
 * Relationships:
 * - users → activityLogs: SET NULL (preserve logs if user deleted)
 * 
 * Implementation Notes:
 * - Use ActivityLogger service for logging (handles async, batching)
 * - Middleware auto-logs API requests
 * - Manual logging for business logic events
 * - Background job for retention/archival
 */
export const activityLogs = pgTable("activity_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }), // Nullable for system events
  action: varchar("action", { length: 100 }).notNull(), // Type of action performed
  entity: varchar("entity", { length: 50 }).notNull(), // What was affected
  entityId: varchar("entity_id"), // ID of affected entity (nullable)
  metadata: jsonb("metadata").$type<Record<string, any>>(), // Additional context data
  ipAddress: varchar("ip_address", { length: 45 }), // Support IPv6
  userAgent: text("user_agent"), // Browser/device info
  sessionId: varchar("session_id"), // Session identifier
  timestamp: timestamp("timestamp").notNull().defaultNow(), // When action occurred
}, (table) => [
  index("activity_logs_user_id_idx").on(table.userId),
  index("activity_logs_action_idx").on(table.action),
  index("activity_logs_timestamp_idx").on(table.timestamp),
  index("activity_logs_entity_entity_id_idx").on(table.entity, table.entityId),
]);

export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({
  id: true,
  timestamp: true,
});

export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ActivityLog = typeof activityLogs.$inferSelect;

/**
 * Summaries Table
 * 
 * Stores AI-generated summaries of long content, articles, or documents.
 * Supports multiple summary formats and caching for performance.
 * 
 * Core Fields:
 * - id: UUID primary key
 * - userId: Foreign key to users.id (CASCADE delete)
 * - contentId: Unique identifier for the original content
 * - originalContent: The full text that was summarized (for reference)
 * - summaryText: The generated summary text
 * - summaryType: Format of summary ('tldr', 'bullet', 'paragraph')
 * - wordCount: Number of words in the summary
 * - originalWordCount: Number of words in the original content
 * 
 * Additional Fields:
 * - summaryLength: User preference for summary length (1-3 sentences or bullet count)
 * - keyPoints: Array of extracted key points from the content
 * - metadata: JSONB for additional data (model used, temperature, etc.)
 * - isEdited: Flag indicating if user manually edited the summary
 * - editedText: User-edited version of the summary (if edited)
 * - createdAt: When summary was generated
 * - updatedAt: Last modification timestamp
 * 
 * Summary Types:
 * - 'tldr': 2-3 sentence ultra-concise summary
 * - 'bullet': Bullet point format with key takeaways
 * - 'paragraph': Single paragraph summary (3-5 sentences)
 * 
 * Business Rules:
 * - Cache summaries to avoid redundant API calls
 * - Allow users to edit/improve generated summaries
 * - Track word count reduction for analytics
 * - Support batch summarization for multiple items
 * 
 * Indexes:
 * - summaries_user_id_idx: User's summaries lookup
 * - summaries_content_id_idx: Fast content-based retrieval
 * - summaries_user_content_idx: Unique constraint on userId + contentId
 * 
 * Relationships:
 * - users → summaries: CASCADE (delete summaries when user deleted)
 */
export const summaries = pgTable("summaries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  contentId: varchar("content_id").notNull(), // Unique identifier for the content
  originalContent: text("original_content"), // Store the original text for reference
  summaryText: text("summary_text").notNull(), // The generated summary
  summaryType: varchar("summary_type", { length: 20 }).notNull().default('tldr'), // 'tldr', 'bullet', 'paragraph'
  wordCount: integer("word_count").notNull(), // Word count of the summary
  originalWordCount: integer("original_word_count"), // Word count of original content
  summaryLength: integer("summary_length").default(2), // 1-3 for sentences, or bullet count
  keyPoints: text("key_points").array(), // Extracted key points
  metadata: jsonb("metadata").$type<{
    model?: string;
    temperature?: number;
    tokensUsed?: number;
    processingTime?: number;
  }>(), // Additional metadata about generation
  isEdited: boolean("is_edited").notNull().default(false), // Has user edited this summary
  editedText: text("edited_text"), // User-edited version if edited
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("summaries_user_id_idx").on(table.userId),
  index("summaries_content_id_idx").on(table.contentId),
  uniqueIndex("summaries_user_content_idx").on(table.userId, table.contentId),
]);

export const insertSummarySchema = createInsertSchema(summaries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSummary = z.infer<typeof insertSummarySchema>;
export type Summary = typeof summaries.$inferSelect;
