/**
 * Authentication & User Management Schema
 * 
 * Core authentication and user account tables.
 * Includes session management, user profiles, and OAuth provider linking.
 */

import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, index, jsonb, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ==================== Shared Type Definitions ====================
// These must be defined before tables that reference them

/**
 * OAuth Provider types supported by the application
 */
export type OAuthProvider = 'google' | 'github' | 'twitter' | 'apple' | 'email' | 'replit';

/**
 * SessionUser - User data serialized in session by Passport.js
 * Stored in session.sess.passport.user
 */
export interface SessionUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  provider: OAuthProvider;
  providerId: string;
}

/**
 * SessionData - Structure of data stored in session.sess JSONB column
 * Used by express-session/connect-pg-simple for session serialization
 * 
 * This replaces `any` usage in:
 * - IUserStorage.createSession(sess)
 * - IUserStorage.updateSession(sess)
 * - sessions.sess column type
 */
export interface SessionData {
  cookie: {
    originalMaxAge: number | null;
    expires?: string | Date | null;
    secure?: boolean;
    httpOnly?: boolean;
    path?: string;
    domain?: string;
    sameSite?: 'strict' | 'lax' | 'none' | boolean;
  };
  passport?: {
    user?: SessionUser;
  };
  [key: string]: unknown;
}

/**
 * AuthProviderInfo - Normalized auth provider lookup result
 * Used by storage methods that lookup auth providers
 * 
 * This replaces `any` usage in:
 * - IUserStorage.getAuthProviderByProviderAndId() return type
 * - IUserStorage.getAuthProviderByProviderAndUserId() return type
 * - IUserStorage.createAuthProvider() parameter and return type
 * - IUserStorage.updateAuthProvider() parameter and return type
 */
export interface AuthProviderInfo {
  id: string;
  userId: string;
  provider: OAuthProvider;
  providerId: string;
  providerEmail?: string | null;
  displayName?: string;
  email?: string | null;
  accessToken?: string | null;
  refreshToken?: string | null;
  tokenExpiry?: Date | null;
  isPrimary?: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Insert type for auth provider creation
 * userId is optional because createAuthProvider can create new users
 */
export type InsertAuthProviderInfo = Omit<AuthProviderInfo, 'id' | 'userId'> & { 
  id?: string;
  userId?: string;  // Optional: will be assigned when user is created/found
};

/**
 * Update type for auth provider modifications
 */
export type UpdateAuthProviderInfo = Partial<Omit<AuthProviderInfo, 'id' | 'userId'>>;

// ==================== Tables ====================

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
    sess: jsonb("sess").$type<SessionData>().notNull(),
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
  metadata: jsonb("metadata").$type<Record<string, any>>(), // Provider-specific additional data
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("auth_providers_user_id_idx").on(table.userId),
  uniqueIndex("auth_providers_provider_id_idx").on(table.provider, table.providerId),
]);

// ==================== Zod Schemas & Type Exports ====================

// Sessions table exports
export const insertSessionSchema = createInsertSchema(sessions);

export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessions.$inferSelect;

// Auth Providers table exports
export const insertAuthProviderSchema = createInsertSchema(authProviders)
  .extend({
    metadata: z.record(z.any()).optional(),
    // Add stricter validation for provider field
    provider: z.enum(['google', 'github', 'twitter', 'apple', 'email', 'replit']),
  });

export type InsertAuthProvider = z.infer<typeof insertAuthProviderSchema>;
export type AuthProvider = typeof authProviders.$inferSelect;

// Export validation schemas for user preferences (stricter validation)
export const cookingSkillLevelSchema = z.enum(['beginner', 'intermediate', 'advanced']);
export const preferredUnitsSchema = z.enum(['imperial', 'metric']);

export const insertUserSchema = createInsertSchema(users)
  .extend({
    // Add stricter validation for user fields
    email: z.string().email(),
    householdSize: z.number().min(1).max(20).default(2),
    cookingSkillLevel: cookingSkillLevelSchema.default('beginner'),
    preferredUnits: preferredUnitsSchema.default('imperial'),
    expirationAlertDays: z.number().min(0).max(30).default(3),
    notificationTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).default("09:00"),
    primaryProvider: z.enum(['google', 'github', 'twitter', 'apple', 'email', 'replit']).optional(),
  });

export type InsertUser = z.infer<typeof insertUserSchema>;