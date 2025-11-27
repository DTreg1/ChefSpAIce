/**
 * User Storage Interface
 * Handles user account management, authentication providers, sessions, and preferences
 */

import type {
  User,
  UpsertUser,
  Session,
  InsertSession,
  AuthProvider,
  InsertAuthProvider,
  SessionData,
  AuthProviderInfo,
  InsertAuthProviderInfo,
  UpdateAuthProviderInfo,
} from "@shared/schema";

/**
 * User preferences type (embedded in users table)
 */
export interface UserPreferences {
  dietaryRestrictions?: string[] | null;
  allergens?: string[] | null;
  foodsToAvoid?: string[] | null;
  favoriteCategories?: string[] | null;
  householdSize?: number;
  cookingSkillLevel?: string;
  preferredUnits?: string;
  expirationAlertDays?: number;
  storageAreasEnabled?: string[] | null;
  notificationsEnabled?: boolean;
  notifyExpiringFood?: boolean;
  notifyRecipeSuggestions?: boolean;
  notifyMealReminders?: boolean;
  notificationTime?: string | null;
}

export interface IUserStorage {
  // ============= User Management =============
  getUserById(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByPrimaryProviderId(provider: string, providerId: string): Promise<User | undefined>;
  createUser(user: Partial<User>): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  deleteUser(id: string): Promise<void>;
  
  // User Preferences (embedded in users table)
  updateUserPreferences(userId: string, preferences: {
    dietaryRestrictions?: string[];
    allergens?: string[];
    foodsToAvoid?: string[];
    favoriteCategories?: string[];
    householdSize?: number;
    cookingSkillLevel?: string;
    preferredUnits?: string;
    expirationAlertDays?: number;
    storageAreasEnabled?: string[];
  }): Promise<User | undefined>;
  
  updateUserNotificationPreferences(userId: string, preferences: {
    notificationsEnabled?: boolean;
    notifyExpiringFood?: boolean;
    notifyRecipeSuggestions?: boolean;
    notifyMealReminders?: boolean;
    notificationTime?: string;
  }): Promise<User | undefined>;
  
  // Onboarding
  markOnboardingComplete(userId: string): Promise<void>;
  
  // ============= Session Management =============
  /** Create or update a session with typed session data */
  createSession(sid: string, sess: SessionData, expire: Date): Promise<Session>;
  getSession(sid: string): Promise<Session | undefined>;
  /** Update a session with typed session data */
  updateSession(sid: string, sess: SessionData, expire: Date): Promise<void>;
  deleteSession(sid: string): Promise<void>;
  cleanupExpiredSessions(): Promise<number>;
  
  // ============= OAuth Provider Management =============
  linkOAuthProvider(userId: string, provider: string, providerId: string): Promise<void>;
  unlinkOAuthProvider(userId: string, provider: string): Promise<void>;
  /** Get auth provider info by provider name and provider ID */
  getAuthProviderByProviderAndId(provider: string, providerId: string): Promise<AuthProviderInfo | undefined>;
  /** Get auth provider info by provider name and user ID */
  getAuthProviderByProviderAndUserId(provider: string, userId: string): Promise<AuthProviderInfo | undefined>;
  /** Create a new auth provider record */
  createAuthProvider(provider: InsertAuthProviderInfo): Promise<AuthProviderInfo>;
  /** Update an existing auth provider record */
  updateAuthProvider(id: string, updates: UpdateAuthProviderInfo): Promise<AuthProviderInfo>;
  
  // ============= Admin Management =============
  updateUserAdminStatus(userId: string, isAdmin: boolean): Promise<User | undefined>;
  getAdminCount(): Promise<number>;
  getAllUsers(): Promise<User[]>;
  /** Get user preferences from the users table */
  getUserPreferences(userId: string): Promise<UserPreferences | undefined>;
  
  // ============= Analytics =============
  getUserCount(): Promise<number>;
  getActiveUserCount(since: Date): Promise<number>;
  getUsersByProvider(provider: string): Promise<User[]>;
  
  // ============= Default Data Initialization =============
  ensureDefaultDataForUser(userId: string): Promise<void>;
}