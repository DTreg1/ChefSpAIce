/**
 * User Storage Interface
 * Handles user account management, authentication providers, and preferences
 */

import type {
  User,
  UpsertUser,
  AuthProvider,
  InsertAuthProvider,
  NotificationPreference,
  InsertNotificationPreference,
} from "@shared/schema";

export interface IUserStorage {
  // User Management
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: UpsertUser): Promise<User>;
  updateUserPreferences(
    userId: string,
    preferences: Partial<User>,
  ): Promise<User | undefined>;
  updateUserAdminStatus(userId: string, isAdmin: boolean): Promise<User>;
  deleteUser(userId: string): Promise<void>;
  
  // Auth Providers
  getAuthProviderByProviderAndId(
    provider: string,
    providerId: string,
  ): Promise<AuthProvider | undefined>;
  getAuthProviderByProviderAndUserId(
    provider: string,
    userId: string,
  ): Promise<AuthProvider | undefined>;
  createAuthProvider(authProvider: InsertAuthProvider): Promise<AuthProvider>;
  updateAuthProvider(id: string, data: Partial<AuthProvider>): Promise<void>;
  
  // Admin
  getAllUsers(
    limit?: number,
    offset?: number,
  ): Promise<{ users: User[]; total: number }>;
  getAdminCount(): Promise<number>;
  
  // User Preferences
  getUserPreferences(userId: string): Promise<User | undefined>;
  getNotificationPreferences(
    userId: string,
  ): Promise<NotificationPreference | undefined>;
}