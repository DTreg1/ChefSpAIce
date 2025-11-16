/**
 * User/Auth Storage Interface
 * Handles user accounts, authentication, and session management
 */

import type {
  User,
} from "@shared/schema";

// Type definitions for user creation and session management
export type InsertUser = Omit<User, 'id' | 'createdAt' | 'updatedAt'>;
export type Session = {
  sid: string;
  sess: Record<string, any>;
  expire: Date;
};

export interface IUserAuthStorage {
  // User Management
  getUserById(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByPrimaryProviderId(provider: string, providerId: string): Promise<User | undefined>;
  
  createUser(user: Partial<InsertUser>): Promise<User>;
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
  
  // Session Management
  createSession(sid: string, sess: any, expire: Date): Promise<Session>;
  getSession(sid: string): Promise<Session | undefined>;
  updateSession(sid: string, sess: any, expire: Date): Promise<void>;
  deleteSession(sid: string): Promise<void>;
  cleanupExpiredSessions(): Promise<number>;
  
  // OAuth Provider Management
  linkOAuthProvider(userId: string, provider: string, providerId: string): Promise<void>;
  unlinkOAuthProvider(userId: string, provider: string): Promise<void>;
  
  // Analytics
  getUserCount(): Promise<number>;
  getActiveUserCount(since: Date): Promise<number>;
  getUsersByProvider(provider: string): Promise<User[]>;
  
  // Default data initialization
  ensureDefaultDataForUser(userId: string): Promise<void>;
}