/**
 * @file server/storage/interfaces/IUserStorage.ts
 * @description Interface for user account management, authentication, sessions, and preferences
 * 
 * This interface defines the contract for all user-related storage operations including:
 * - User CRUD operations
 * - Session management for authentication
 * - OAuth provider linking/unlinking
 * - User preferences and notification settings
 * - Admin management
 * - Analytics for user tracking
 */

import type {
  User,
  Session,
  SessionData,
  AuthProviderInfo,
  InsertAuthProviderInfo,
  UpdateAuthProviderInfo,
} from "@shared/schema";

/**
 * User preferences configuration
 * These fields are embedded in the users table rather than a separate table
 */
export interface UserPreferences {
  /** Dietary restrictions (e.g., vegetarian, vegan, keto) */
  dietaryRestrictions?: string[] | null;
  /** Food allergens to avoid (e.g., peanuts, shellfish) */
  allergens?: string[] | null;
  /** Specific foods the user wants to avoid */
  foodsToAvoid?: string[] | null;
  /** Favorite recipe categories */
  favoriteCategories?: string[] | null;
  /** Number of people in the household */
  householdSize?: number;
  /** Cooking skill level (beginner, intermediate, advanced) */
  cookingSkillLevel?: string;
  /** Preferred measurement units (metric, imperial) */
  preferredUnits?: string;
  /** Days before expiration to receive alerts */
  expirationAlertDays?: number;
  /** Enabled storage areas (e.g., Fridge, Pantry, Freezer) */
  storageAreasEnabled?: string[] | null;
  /** Whether push notifications are enabled */
  notificationsEnabled?: boolean;
  /** Notify about expiring food items */
  notifyExpiringFood?: boolean;
  /** Notify about recipe suggestions */
  notifyRecipeSuggestions?: boolean;
  /** Notify about meal reminders */
  notifyMealReminders?: boolean;
  /** Time of day for notifications (HH:MM format) */
  notificationTime?: string | null;
}

/**
 * User Storage Interface
 * Handles all user-related database operations
 */
export interface IUserStorage {
  // ============= User Management =============
  
  /**
   * Retrieve a user by their unique ID
   * @param id - The user's UUID
   * @returns The user object or undefined if not found
   */
  getUserById(id: string): Promise<User | undefined>;
  
  /**
   * Retrieve a user by their email address
   * @param email - The user's email address
   * @returns The user object or undefined if not found
   */
  getUserByEmail(email: string): Promise<User | undefined>;
  
  /**
   * Retrieve a user by their primary OAuth provider and provider ID
   * @param provider - The OAuth provider name (e.g., 'google', 'github')
   * @param providerId - The unique ID from the OAuth provider
   * @returns The user object or undefined if not found
   */
  getUserByPrimaryProviderId(provider: string, providerId: string): Promise<User | undefined>;
  
  /**
   * Create a new user account
   * @param user - Partial user data for creation (email, name, provider info, etc.)
   * @returns The newly created user object
   */
  createUser(user: Partial<User>): Promise<User>;
  
  /**
   * Update an existing user's information
   * @param id - The user's UUID
   * @param updates - Partial user data to update
   * @returns The updated user object or undefined if not found
   */
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  
  /**
   * Delete a user account permanently
   * @param id - The user's UUID
   */
  deleteUser(id: string): Promise<void>;
  
  // ============= User Preferences =============
  
  /**
   * Update a user's kitchen and cooking preferences
   * @param userId - The user's UUID
   * @param preferences - Preference settings to update
   * @returns The updated user object or undefined if not found
   */
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
  
  /**
   * Update a user's notification preferences
   * @param userId - The user's UUID
   * @param preferences - Notification settings to update
   * @returns The updated user object or undefined if not found
   */
  updateUserNotificationPreferences(userId: string, preferences: {
    notificationsEnabled?: boolean;
    notifyExpiringFood?: boolean;
    notifyRecipeSuggestions?: boolean;
    notifyMealReminders?: boolean;
    notificationTime?: string;
  }): Promise<User | undefined>;
  
  /**
   * Get a user's preferences extracted from their user record
   * @param userId - The user's UUID
   * @returns The user's preferences or undefined if user not found
   */
  getUserPreferences(userId: string): Promise<UserPreferences | undefined>;
  
  // ============= Onboarding =============
  
  /**
   * Mark the user's onboarding as complete
   * @param userId - The user's UUID
   */
  markOnboardingComplete(userId: string): Promise<void>;
  
  // ============= Session Management =============
  
  /**
   * Create or update a session (upsert behavior)
   * @param sid - Session ID (unique identifier)
   * @param sess - Typed session data containing user info and metadata
   * @param expire - Expiration date for the session
   * @returns The created/updated session object
   */
  createSession(sid: string, sess: SessionData, expire: Date): Promise<Session>;
  
  /**
   * Retrieve a session by its ID
   * @param sid - Session ID
   * @returns The session object or undefined if not found/expired
   */
  getSession(sid: string): Promise<Session | undefined>;
  
  /**
   * Update an existing session's data and expiration
   * @param sid - Session ID
   * @param sess - Updated typed session data
   * @param expire - New expiration date
   */
  updateSession(sid: string, sess: SessionData, expire: Date): Promise<void>;
  
  /**
   * Delete a session (logout)
   * @param sid - Session ID
   */
  deleteSession(sid: string): Promise<void>;
  
  /**
   * Remove all expired sessions from the database
   * @returns The number of sessions deleted
   */
  cleanupExpiredSessions(): Promise<number>;
  
  // ============= OAuth Provider Management =============
  
  /**
   * Link an OAuth provider to a user's account
   * @param userId - The user's UUID
   * @param provider - OAuth provider name (e.g., 'google', 'github', 'apple')
   * @param providerId - The unique ID from the OAuth provider
   */
  linkOAuthProvider(userId: string, provider: string, providerId: string): Promise<void>;
  
  /**
   * Unlink an OAuth provider from a user's account
   * @param userId - The user's UUID
   * @param provider - OAuth provider name to unlink
   */
  unlinkOAuthProvider(userId: string, provider: string): Promise<void>;
  
  /**
   * Find auth provider information by provider name and provider-specific ID
   * @param provider - OAuth provider name
   * @param providerId - The unique ID from the OAuth provider
   * @returns Auth provider info or undefined if not found
   */
  getAuthProviderByProviderAndId(provider: string, providerId: string): Promise<AuthProviderInfo | undefined>;
  
  /**
   * Find auth provider information by provider name and user ID
   * @param provider - OAuth provider name
   * @param userId - The user's UUID
   * @returns Auth provider info or undefined if not found
   */
  getAuthProviderByProviderAndUserId(provider: string, userId: string): Promise<AuthProviderInfo | undefined>;
  
  /**
   * Create a new auth provider record (and potentially a new user)
   * @param provider - Auth provider data to create
   * @returns The created auth provider info
   */
  createAuthProvider(provider: InsertAuthProviderInfo): Promise<AuthProviderInfo>;
  
  /**
   * Update an existing auth provider record
   * @param id - The auth provider record ID (same as user ID in current implementation)
   * @param updates - Data to update
   * @returns The updated auth provider info
   */
  updateAuthProvider(id: string, updates: UpdateAuthProviderInfo): Promise<AuthProviderInfo>;
  
  // ============= Admin Management =============
  
  /**
   * Update a user's admin status
   * @param userId - The user's UUID
   * @param isAdmin - Whether the user should be an admin
   * @returns The updated user object or undefined if not found
   */
  updateUserAdminStatus(userId: string, isAdmin: boolean): Promise<User | undefined>;
  
  /**
   * Get the total count of admin users
   * @returns The number of admin users
   */
  getAdminCount(): Promise<number>;
  
  /**
   * Get all users in the system (admin operation)
   * @returns Array of all users, ordered by creation date descending
   */
  getAllUsers(): Promise<User[]>;
  
  // ============= Analytics =============
  
  /**
   * Get the total count of registered users
   * @returns The total number of users
   */
  getUserCount(): Promise<number>;
  
  /**
   * Get the count of users who have been active since a given date
   * @param since - The date to check activity from
   * @returns The number of active users
   */
  getActiveUserCount(since: Date): Promise<number>;
  
  /**
   * Get all users who signed up with a specific OAuth provider
   * @param provider - OAuth provider name
   * @returns Array of users using that provider
   */
  getUsersByProvider(provider: string): Promise<User[]>;
  
  // ============= Default Data Initialization =============
  
  /**
   * Ensure default data (storage locations, etc.) exists for a new user
   * Called automatically during user creation
   * @param userId - The user's UUID
   */
  ensureDefaultDataForUser(userId: string): Promise<void>;
}
