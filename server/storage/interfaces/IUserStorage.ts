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
} from "@shared/schema";

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
  createSession(sid: string, sess: any, expire: Date): Promise<Session>;
  getSession(sid: string): Promise<Session | undefined>;
  updateSession(sid: string, sess: any, expire: Date): Promise<void>;
  deleteSession(sid: string): Promise<void>;
  cleanupExpiredSessions(): Promise<number>;
  
  // ============= OAuth Provider Management =============
  linkOAuthProvider(userId: string, provider: string, providerId: string): Promise<void>;
  unlinkOAuthProvider(userId: string, provider: string): Promise<void>;
  getAuthProviderByProviderAndId(provider: string, providerId: string): Promise<any | undefined>;
  getAuthProviderByProviderAndUserId(provider: string, userId: string): Promise<any | undefined>;
  createAuthProvider(provider: any): Promise<any>;
  updateAuthProvider(id: string, updates: any): Promise<any>;
  
  // ============= Admin Management =============
  updateUserAdminStatus(userId: string, isAdmin: boolean): Promise<User | undefined>;
  getAdminCount(): Promise<number>;
  getAllUsers(): Promise<User[]>;
  getUserPreferences(userId: string): Promise<any | undefined>;
  
  // ============= Analytics =============
  getUserCount(): Promise<number>;
  getActiveUserCount(since: Date): Promise<number>;
  getUsersByProvider(provider: string): Promise<User[]>;
  
  // ============= Default Data Initialization =============
  ensureDefaultDataForUser(userId: string): Promise<void>;
}