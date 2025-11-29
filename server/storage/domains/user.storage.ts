/**
 * User/Auth Domain Storage
 * Implements IUserStorage interface for user and authentication operations
 * 
 * EXPORT PATTERN:
 * - Export CLASS (UserAuthDomainStorage) for dependency injection and testing
 * - Export singleton INSTANCE (userStorage) for convenience in production code
 * - Facades should instantiate their own instances OR use the shared singleton consistently
 */

import { db } from "../../db";
import {
  users,
  sessions,
  userStorage as userStorageTable,
  User,
  Session,
  SessionData,
  AuthProviderInfo,
  InsertAuthProviderInfo,
  UpdateAuthProviderInfo,
} from "@shared/schema";
import {
  eq,
  and,
  or,
  sql,
  desc,
  gte,
  lt,
} from "drizzle-orm";
import type { IUserStorage, UserPreferences } from "../interfaces/IUserStorage";
import {
  StorageError,
  StorageNotFoundError,
  StorageValidationError,
  StorageConnectionError,
  StorageConstraintError,
  StorageErrorCode,
  wrapDatabaseError,
  type StorageErrorContext,
} from "../errors";

const DOMAIN = "user";

function createContext(operation: string, entityId?: string | number): StorageErrorContext {
  return { domain: DOMAIN, operation, entityId, entityType: "User" };
}

export class UserAuthDomainStorage implements IUserStorage {
  // ============= User Management =============
  
  async getUserById(id: string): Promise<User | undefined> {
    const context = createContext("getUserById", id);
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id));
      return user;
    } catch (error) {
      console.error(`[${DOMAIN}] Error getting user by ID ${id}:`, error);
      throw wrapDatabaseError(error, context);
    }
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    const context = createContext("getUserByEmail");
    try {
      if (!email) return undefined;
      
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email));
      return user;
    } catch (error) {
      console.error(`[${DOMAIN}] Error getting user by email:`, error);
      throw wrapDatabaseError(error, context);
    }
  }
  
  async getUserByPrimaryProviderId(provider: string, providerId: string): Promise<User | undefined> {
    const context = createContext("getUserByPrimaryProviderId");
    context.additionalInfo = { provider, providerId };
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.primaryProvider, provider),
            eq(users.primaryProviderId, providerId)
          )
        );
      return user;
    } catch (error) {
      console.error(`[${DOMAIN}] Error getting user by provider ${provider}:`, error);
      throw wrapDatabaseError(error, context);
    }
  }
  
  async createUser(userData: Partial<User>): Promise<User> {
    const context = createContext("createUser");
    context.additionalInfo = { email: userData.email };
    try {
      const [newUser] = await db
        .insert(users)
        .values({
          email: userData.email || null,
          firstName: userData.firstName || null,
          lastName: userData.lastName || null,
          profileImageUrl: userData.profileImageUrl || null,
          primaryProvider: userData.primaryProvider || "email",
          primaryProviderId: userData.primaryProviderId || null,
          dietaryRestrictions: userData.dietaryRestrictions || [],
          allergens: userData.allergens || [],
          foodsToAvoid: userData.foodsToAvoid || [],
          favoriteCategories: userData.favoriteCategories || [],
          householdSize: userData.householdSize || 2,
          cookingSkillLevel: userData.cookingSkillLevel || "beginner",
          preferredUnits: userData.preferredUnits || "imperial",
          expirationAlertDays: userData.expirationAlertDays || 3,
          storageAreasEnabled: userData.storageAreasEnabled || ["Fridge", "Pantry"],
          hasCompletedOnboarding: userData.hasCompletedOnboarding || false,
          notificationsEnabled: userData.notificationsEnabled || false,
          notifyExpiringFood: userData.notifyExpiringFood ?? true,
          notifyRecipeSuggestions: userData.notifyRecipeSuggestions || false,
          notifyMealReminders: userData.notifyMealReminders ?? true,
          notificationTime: userData.notificationTime || "09:00",
          isAdmin: userData.isAdmin || false,
        })
        .returning();
      
      await this.ensureDefaultDataForUser(newUser.id);
      
      return newUser;
    } catch (error) {
      console.error(`[${DOMAIN}] Error creating user:`, error);
      const originalError = error instanceof Error ? error : new Error(String(error));
      
      if (originalError.message.includes("unique") || originalError.message.includes("duplicate")) {
        throw new StorageConstraintError(
          "A user with this email already exists",
          context,
          "unique",
          "users_email_unique",
          originalError
        );
      }
      throw wrapDatabaseError(error, context);
    }
  }
  
  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const context = createContext("updateUser", id);
    try {
      const { id: _id, createdAt, ...safeUpdates } = updates;
      
      const [updatedUser] = await db
        .update(users)
        .set({
          ...safeUpdates,
          updatedAt: new Date(),
        })
        .where(eq(users.id, id))
        .returning();
      
      return updatedUser;
    } catch (error) {
      console.error(`[${DOMAIN}] Error updating user ${id}:`, error);
      throw wrapDatabaseError(error, context);
    }
  }
  
  async deleteUser(id: string): Promise<void> {
    const context = createContext("deleteUser", id);
    try {
      await db.delete(users).where(eq(users.id, id));
    } catch (error) {
      console.error(`[${DOMAIN}] Error deleting user ${id}:`, error);
      throw wrapDatabaseError(error, context);
    }
  }
  
  // ============= User Preferences =============
  
  async updateUserPreferences(
    userId: string,
    preferences: {
      dietaryRestrictions?: string[];
      allergens?: string[];
      foodsToAvoid?: string[];
      favoriteCategories?: string[];
      householdSize?: number;
      cookingSkillLevel?: string;
      preferredUnits?: string;
      expirationAlertDays?: number;
      storageAreasEnabled?: string[];
    }
  ): Promise<User | undefined> {
    const context = createContext("updateUserPreferences", userId);
    try {
      return await this.updateUser(userId, preferences);
    } catch (error) {
      console.error(`[${DOMAIN}] Error updating preferences for user ${userId}:`, error);
      if (error instanceof StorageError) throw error;
      throw wrapDatabaseError(error, context);
    }
  }
  
  async updateUserNotificationPreferences(
    userId: string,
    preferences: {
      notificationsEnabled?: boolean;
      notifyExpiringFood?: boolean;
      notifyRecipeSuggestions?: boolean;
      notifyMealReminders?: boolean;
      notificationTime?: string;
    }
  ): Promise<User | undefined> {
    const context = createContext("updateUserNotificationPreferences", userId);
    try {
      return await this.updateUser(userId, preferences);
    } catch (error) {
      console.error(`[${DOMAIN}] Error updating notification preferences for user ${userId}:`, error);
      if (error instanceof StorageError) throw error;
      throw wrapDatabaseError(error, context);
    }
  }
  
  // ============= Onboarding =============
  
  async markOnboardingComplete(userId: string): Promise<void> {
    const context = createContext("markOnboardingComplete", userId);
    try {
      await this.updateUser(userId, { hasCompletedOnboarding: true });
    } catch (error) {
      console.error(`[${DOMAIN}] Error marking onboarding complete for user ${userId}:`, error);
      if (error instanceof StorageError) throw error;
      throw wrapDatabaseError(error, context);
    }
  }
  
  // ============= Session Management =============
  
  async createSession(sid: string, sess: SessionData, expire: Date): Promise<Session> {
    const context: StorageErrorContext = { 
      domain: DOMAIN, 
      operation: "createSession", 
      entityType: "Session" 
    };
    try {
      await db
        .insert(sessions)
        .values({
          sid,
          sess,
          expire,
        })
        .onConflictDoUpdate({
          target: sessions.sid,
          set: {
            sess,
            expire,
          },
        });
      
      return { sid, sess, expire };
    } catch (error) {
      console.error(`[${DOMAIN}] Error creating session:`, error);
      throw wrapDatabaseError(error, context);
    }
  }
  
  async getSession(sid: string): Promise<Session | undefined> {
    const context: StorageErrorContext = { 
      domain: DOMAIN, 
      operation: "getSession", 
      entityId: sid,
      entityType: "Session" 
    };
    try {
      const [session] = await db
        .select()
        .from(sessions)
        .where(eq(sessions.sid, sid));
      
      if (!session) return undefined;
      
      return {
        sid: session.sid,
        sess: session.sess,
        expire: session.expire,
      };
    } catch (error) {
      console.error(`[${DOMAIN}] Error getting session ${sid}:`, error);
      throw wrapDatabaseError(error, context);
    }
  }
  
  async updateSession(sid: string, sess: SessionData, expire: Date): Promise<void> {
    const context: StorageErrorContext = { 
      domain: DOMAIN, 
      operation: "updateSession", 
      entityId: sid,
      entityType: "Session" 
    };
    try {
      await db
        .update(sessions)
        .set({ sess, expire })
        .where(eq(sessions.sid, sid));
    } catch (error) {
      console.error(`[${DOMAIN}] Error updating session ${sid}:`, error);
      throw wrapDatabaseError(error, context);
    }
  }
  
  async deleteSession(sid: string): Promise<void> {
    const context: StorageErrorContext = { 
      domain: DOMAIN, 
      operation: "deleteSession", 
      entityId: sid,
      entityType: "Session" 
    };
    try {
      await db.delete(sessions).where(eq(sessions.sid, sid));
    } catch (error) {
      console.error(`[${DOMAIN}] Error deleting session ${sid}:`, error);
      throw wrapDatabaseError(error, context);
    }
  }
  
  async cleanupExpiredSessions(): Promise<number> {
    const context: StorageErrorContext = { 
      domain: DOMAIN, 
      operation: "cleanupExpiredSessions", 
      entityType: "Session" 
    };
    try {
      const now = new Date();
      const result = await db
        .delete(sessions)
        .where(lt(sessions.expire, now));
      
      return result.rowCount || 0;
    } catch (error) {
      console.error(`[${DOMAIN}] Error cleaning up expired sessions:`, error);
      throw wrapDatabaseError(error, context);
    }
  }
  
  // ============= OAuth Provider Management =============
  
  async linkOAuthProvider(userId: string, provider: string, providerId: string): Promise<void> {
    const context = createContext("linkOAuthProvider", userId);
    context.additionalInfo = { provider, providerId };
    try {
      // Update user's primary provider info
      await this.updateUser(userId, {
        primaryProvider: provider,
        primaryProviderId: providerId,
      } as Partial<User>);
    } catch (error) {
      console.error(`[${DOMAIN}] Error linking OAuth provider for user ${userId}:`, error);
      if (error instanceof StorageError) throw error;
      throw wrapDatabaseError(error, context);
    }
  }
  
  async unlinkOAuthProvider(userId: string, provider: string): Promise<void> {
    const context = createContext("unlinkOAuthProvider", userId);
    context.additionalInfo = { provider };
    try {
      // Only unlink if it matches the current primary provider
      const user = await this.getUserById(userId);
      if (user?.primaryProvider === provider) {
        await this.updateUser(userId, {
          primaryProvider: null,
          primaryProviderId: null,
        } as Partial<User>);
      }
    } catch (error) {
      console.error(`[${DOMAIN}] Error unlinking OAuth provider for user ${userId}:`, error);
      if (error instanceof StorageError) throw error;
      throw wrapDatabaseError(error, context);
    }
  }
  
  async getAuthProviderByProviderAndId(provider: string, providerId: string): Promise<AuthProviderInfo | undefined> {
    const context: StorageErrorContext = { 
      domain: DOMAIN, 
      operation: "getAuthProviderByProviderAndId", 
      entityType: "AuthProvider",
      additionalInfo: { provider, providerId }
    };
    try {
      // Query using primaryProvider and primaryProviderId columns
      const [user] = await db
        .select()
        .from(users)
        .where(and(
          eq(users.primaryProvider, provider),
          eq(users.primaryProviderId, providerId)
        ))
        .limit(1);
      
      if (!user) return undefined;
      
      return {
        id: user.id,
        provider: provider as AuthProviderInfo['provider'],
        providerId,
        userId: user.id,
        displayName: user.firstName || user.email || '',
        email: user.email
      };
    } catch (error) {
      console.error(`[${DOMAIN}] Error getting auth provider for ${provider}/${providerId}:`, error);
      throw wrapDatabaseError(error, context);
    }
  }
  
  async getAuthProviderByProviderAndUserId(provider: string, userId: string): Promise<AuthProviderInfo | undefined> {
    const context: StorageErrorContext = { 
      domain: DOMAIN, 
      operation: "getAuthProviderByProviderAndUserId", 
      entityId: userId,
      entityType: "AuthProvider",
      additionalInfo: { provider }
    };
    try {
      const user = await this.getUserById(userId);
      
      if (!user) return undefined;
      
      // Check if this user's primary provider matches
      if (user.primaryProvider !== provider || !user.primaryProviderId) {
        return undefined;
      }
      
      return {
        id: user.id,
        provider: provider as AuthProviderInfo['provider'],
        providerId: user.primaryProviderId,
        userId: user.id,
        displayName: user.firstName || user.email || '',
        email: user.email
      };
    } catch (error) {
      console.error(`[${DOMAIN}] Error getting auth provider for user ${userId}:`, error);
      if (error instanceof StorageError) throw error;
      throw wrapDatabaseError(error, context);
    }
  }
  
  async createAuthProvider(provider: InsertAuthProviderInfo): Promise<AuthProviderInfo> {
    const context: StorageErrorContext = { 
      domain: DOMAIN, 
      operation: "createAuthProvider", 
      entityType: "AuthProvider",
      additionalInfo: { provider: provider.provider }
    };
    try {
      const user = provider.email ? await this.getUserByEmail(provider.email) : null;
      
      if (user) {
        const providerField = `${provider.provider}Id`;
        const updates: Partial<User> = {};
        (updates as Record<string, unknown>)[providerField] = provider.providerId;
        
        await this.updateUser(user.id, updates);
        return { 
          id: user.id,
          userId: user.id,
          provider: provider.provider,
          providerId: provider.providerId,
          displayName: provider.displayName,
          email: user.email,
          providerEmail: provider.providerEmail,
        };
      } else {
        const providerField = `${provider.provider}Id`;
        const userToCreate: Partial<User> = {
          email: provider.email || undefined,
          firstName: provider.displayName || provider.email || undefined,
          primaryProvider: provider.provider,
        };
        (userToCreate as Record<string, unknown>)[providerField] = provider.providerId;
        
        const newUser = await this.createUser(userToCreate);
        return { 
          id: newUser.id,
          userId: newUser.id,
          provider: provider.provider,
          providerId: provider.providerId,
          displayName: provider.displayName,
          email: newUser.email,
          providerEmail: provider.providerEmail,
        };
      }
    } catch (error) {
      console.error(`[${DOMAIN}] Error creating auth provider:`, error);
      if (error instanceof StorageError) throw error;
      throw wrapDatabaseError(error, context);
    }
  }
  
  async updateAuthProvider(id: string, updates: UpdateAuthProviderInfo): Promise<AuthProviderInfo> {
    const context: StorageErrorContext = { 
      domain: DOMAIN, 
      operation: "updateAuthProvider", 
      entityId: id,
      entityType: "AuthProvider"
    };
    try {
      const user = await this.getUserById(id);
      
      if (!user) {
        throw new StorageNotFoundError(
          `User with ID ${id} not found`,
          context
        );
      }
      
      if (updates.providerId && updates.provider) {
        const providerField = `${updates.provider}Id`;
        const userUpdates: Partial<User> = {};
        (userUpdates as Record<string, unknown>)[providerField] = updates.providerId;
        
        await this.updateUser(id, userUpdates);
      }
      
      return { 
        id,
        userId: id,
        provider: updates.provider || user.primaryProvider as AuthProviderInfo['provider'] || 'email',
        providerId: updates.providerId || user.primaryProviderId || '',
        displayName: updates.displayName || user.firstName || undefined,
        email: user.email,
        providerEmail: updates.providerEmail,
        accessToken: updates.accessToken,
        refreshToken: updates.refreshToken,
        tokenExpiry: updates.tokenExpiry,
        isPrimary: updates.isPrimary,
        metadata: updates.metadata,
      };
    } catch (error) {
      console.error(`[${DOMAIN}] Error updating auth provider for user ${id}:`, error);
      if (error instanceof StorageError) throw error;
      throw wrapDatabaseError(error, context);
    }
  }
  
  // ============= Admin Management =============
  
  async updateUserAdminStatus(userId: string, isAdmin: boolean): Promise<User | undefined> {
    const context = createContext("updateUserAdminStatus", userId);
    try {
      const [updated] = await db
        .update(users)
        .set({ isAdmin })
        .where(eq(users.id, userId))
        .returning();
      return updated;
    } catch (error) {
      console.error(`[${DOMAIN}] Error updating admin status for user ${userId}:`, error);
      throw wrapDatabaseError(error, context);
    }
  }
  
  async getAdminCount(): Promise<number> {
    const context = createContext("getAdminCount");
    try {
      const [result] = await db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(users)
        .where(eq(users.isAdmin, true));
      return result.count;
    } catch (error) {
      console.error(`[${DOMAIN}] Error getting admin count:`, error);
      throw wrapDatabaseError(error, context);
    }
  }
  
  async getAllUsers(): Promise<User[]> {
    const context = createContext("getAllUsers");
    try {
      return await db
        .select()
        .from(users)
        .orderBy(desc(users.createdAt));
    } catch (error) {
      console.error(`[${DOMAIN}] Error getting all users:`, error);
      throw wrapDatabaseError(error, context);
    }
  }
  
  async getUserPreferences(userId: string): Promise<UserPreferences | undefined> {
    const context = createContext("getUserPreferences", userId);
    try {
      const user = await this.getUserById(userId);
      
      if (!user) return undefined;
      
      return {
        dietaryRestrictions: user.dietaryRestrictions || [],
        allergens: user.allergens || [],
        foodsToAvoid: user.foodsToAvoid || [],
        favoriteCategories: user.favoriteCategories || [],
        householdSize: user.householdSize || 1,
        cookingSkillLevel: user.cookingSkillLevel || "intermediate",
        preferredUnits: user.preferredUnits || "metric",
        expirationAlertDays: user.expirationAlertDays || 3,
        storageAreasEnabled: user.storageAreasEnabled || [],
        notificationsEnabled: user.notificationsEnabled || false,
        notifyExpiringFood: user.notifyExpiringFood || false,
        notifyRecipeSuggestions: user.notifyRecipeSuggestions || false,
        notifyMealReminders: user.notifyMealReminders || false,
        notificationTime: user.notificationTime || "09:00",
      };
    } catch (error) {
      console.error(`[${DOMAIN}] Error getting preferences for user ${userId}:`, error);
      if (error instanceof StorageError) throw error;
      throw wrapDatabaseError(error, context);
    }
  }
  
  // ============= Analytics =============
  
  async getUserCount(): Promise<number> {
    const context = createContext("getUserCount");
    try {
      const [result] = await db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(users);
      return result.count;
    } catch (error) {
      console.error(`[${DOMAIN}] Error getting user count:`, error);
      throw wrapDatabaseError(error, context);
    }
  }
  
  async getActiveUserCount(since: Date): Promise<number> {
    const context = createContext("getActiveUserCount");
    try {
      const [result] = await db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(users)
        .where(gte(users.updatedAt, since));
      return result.count;
    } catch (error) {
      console.error(`[${DOMAIN}] Error getting active user count:`, error);
      throw wrapDatabaseError(error, context);
    }
  }
  
  async getUsersByProvider(provider: string): Promise<User[]> {
    const context = createContext("getUsersByProvider");
    context.additionalInfo = { provider };
    try {
      return await db
        .select()
        .from(users)
        .where(eq(users.primaryProvider, provider))
        .orderBy(desc(users.createdAt));
    } catch (error) {
      console.error(`[${DOMAIN}] Error getting users by provider ${provider}:`, error);
      throw wrapDatabaseError(error, context);
    }
  }
  
  // ============= Default Data Initialization =============
  
  async ensureDefaultDataForUser(userId: string): Promise<void> {
    const context = createContext("ensureDefaultDataForUser", userId);
    try {
      const existingStorage = await db
        .select()
        .from(userStorageTable)
        .where(eq(userStorageTable.userId, userId));
      
      if (existingStorage.length === 0) {
        const defaultLocations = [
          { name: "Fridge", icon: "🍎", isDefault: true, sortOrder: 1 },
          { name: "Pantry", icon: "🥫", isDefault: true, sortOrder: 2 },
          { name: "Freezer", icon: "🧊", isDefault: false, sortOrder: 3 },
        ];
        
        await db.insert(userStorageTable).values(
          defaultLocations.map((loc) => ({
            userId,
            name: loc.name,
            icon: loc.icon,
            isDefault: loc.isDefault,
            isActive: true,
            sortOrder: loc.sortOrder,
          }))
        );
      }
    } catch (error) {
      console.error(`[${DOMAIN}] Error ensuring default data for user ${userId}:`, error);
    }
  }
}

export const userStorage = new UserAuthDomainStorage();
