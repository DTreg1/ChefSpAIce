/**
 * User/Auth Domain Storage
 * Implements IUserAuthStorage interface for user and authentication operations
 */

import { db } from "../../db";
import {
  users,
  sessions,
  userStorage,
  User,
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
import type { IUserAuthStorage, InsertUser, Session } from "../interfaces/IUserAuthStorage";

export class UserAuthDomainStorage implements IUserAuthStorage {
  // ============= User Management =============
  
  async getUserById(id: string): Promise<User | undefined> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id));
      return user;
    } catch (error) {
      console.error(`Error getting user by ID ${id}:`, error);
      throw new Error("Failed to retrieve user");
    }
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      if (!email) return undefined;
      
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email));
      return user;
    } catch (error) {
      console.error(`Error getting user by email ${email}:`, error);
      throw new Error("Failed to retrieve user");
    }
  }
  
  async getUserByPrimaryProviderId(provider: string, providerId: string): Promise<User | undefined> {
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
      console.error(`Error getting user by provider ${provider}:`, error);
      throw new Error("Failed to retrieve user");
    }
  }
  
  async createUser(userData: Partial<InsertUser>): Promise<User> {
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
          // Set default preferences
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
          // Notification preferences
          notificationsEnabled: userData.notificationsEnabled || false,
          notifyExpiringFood: userData.notifyExpiringFood ?? true,
          notifyRecipeSuggestions: userData.notifyRecipeSuggestions || false,
          notifyMealReminders: userData.notifyMealReminders ?? true,
          notificationTime: userData.notificationTime || "09:00",
          // Admin status
          isAdmin: userData.isAdmin || false,
        })
        .returning();
      
      // Initialize default storage locations for new user
      await this.ensureDefaultDataForUser(newUser.id);
      
      return newUser;
    } catch (error) {
      console.error("Error creating user:", error);
      throw new Error("Failed to create user");
    }
  }
  
  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    try {
      // Remove fields that shouldn't be updated
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
      console.error(`Error updating user ${id}:`, error);
      throw new Error("Failed to update user");
    }
  }
  
  async deleteUser(id: string): Promise<void> {
    try {
      await db.delete(users).where(eq(users.id, id));
    } catch (error) {
      console.error(`Error deleting user ${id}:`, error);
      throw new Error("Failed to delete user");
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
    try {
      return await this.updateUser(userId, preferences);
    } catch (error) {
      console.error(`Error updating preferences for user ${userId}:`, error);
      throw new Error("Failed to update user preferences");
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
    try {
      return await this.updateUser(userId, preferences);
    } catch (error) {
      console.error(`Error updating notification preferences for user ${userId}:`, error);
      throw new Error("Failed to update notification preferences");
    }
  }
  
  // ============= Onboarding =============
  
  async markOnboardingComplete(userId: string): Promise<void> {
    try {
      await this.updateUser(userId, { hasCompletedOnboarding: true });
    } catch (error) {
      console.error(`Error marking onboarding complete for user ${userId}:`, error);
      throw new Error("Failed to mark onboarding complete");
    }
  }
  
  // ============= Session Management =============
  
  async createSession(sid: string, sess: any, expire: Date): Promise<Session> {
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
      console.error("Error creating session:", error);
      throw new Error("Failed to create session");
    }
  }
  
  async getSession(sid: string): Promise<Session | undefined> {
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
      console.error(`Error getting session ${sid}:`, error);
      throw new Error("Failed to retrieve session");
    }
  }
  
  async updateSession(sid: string, sess: any, expire: Date): Promise<void> {
    try {
      await db
        .update(sessions)
        .set({ sess, expire })
        .where(eq(sessions.sid, sid));
    } catch (error) {
      console.error(`Error updating session ${sid}:`, error);
      throw new Error("Failed to update session");
    }
  }
  
  async deleteSession(sid: string): Promise<void> {
    try {
      await db.delete(sessions).where(eq(sessions.sid, sid));
    } catch (error) {
      console.error(`Error deleting session ${sid}:`, error);
      throw new Error("Failed to delete session");
    }
  }
  
  async cleanupExpiredSessions(): Promise<number> {
    try {
      const now = new Date();
      const result = await db
        .delete(sessions)
        .where(lt(sessions.expire, now));
      
      // Return count of deleted sessions
      return result.rowCount || 0;
    } catch (error) {
      console.error("Error cleaning up expired sessions:", error);
      throw new Error("Failed to cleanup expired sessions");
    }
  }
  
  // ============= OAuth Provider Management =============
  
  async linkOAuthProvider(userId: string, provider: string, providerId: string): Promise<void> {
    try {
      const providerField = `${provider}Id`;
      const updates: any = {};
      updates[providerField] = providerId;
      
      await this.updateUser(userId, updates);
    } catch (error) {
      console.error(`Error linking OAuth provider for user ${userId}:`, error);
      throw new Error("Failed to link OAuth provider");
    }
  }
  
  async unlinkOAuthProvider(userId: string, provider: string): Promise<void> {
    try {
      const providerField = `${provider}Id`;
      const updates: any = {};
      updates[providerField] = null;
      
      await this.updateUser(userId, updates);
    } catch (error) {
      console.error(`Error unlinking OAuth provider for user ${userId}:`, error);
      throw new Error("Failed to unlink OAuth provider");
    }
  }
  
  async getAuthProviderByProviderAndId(provider: string, providerId: string): Promise<any | undefined> {
    try {
      const providerField = `${provider}Id`;
      const query = db
        .select()
        .from(users)
        .where(sql`${sql.identifier(providerField)} = ${providerId}`)
        .limit(1);
      
      const [user] = await query;
      
      return user ? {
        id: user.id,
        provider,
        providerId,
        userId: user.id,
        displayName: user.name,
        email: user.email
      } : undefined;
    } catch (error) {
      console.error(`Error getting auth provider for ${provider}/${providerId}:`, error);
      throw new Error("Failed to get auth provider");
    }
  }
  
  async getAuthProviderByProviderAndUserId(provider: string, userId: string): Promise<any | undefined> {
    try {
      const user = await this.getUserById(userId);
      
      if (!user) return undefined;
      
      const providerField = `${provider}Id`;
      const providerId = (user)[providerField];
      
      return providerId ? {
        id: user.id,
        provider,
        providerId,
        userId: user.id,
        displayName: user.name,
        email: user.email
      } : undefined;
    } catch (error) {
      console.error(`Error getting auth provider for user ${userId}:`, error);
      throw new Error("Failed to get auth provider");
    }
  }
  
  async createAuthProvider(provider: any): Promise<any> {
    try {
      // This creates or updates a user with provider info
      const user = await this.getUserByEmail(provider.email);
      
      if (user) {
        // Update existing user with provider info
        const providerField = `${provider.provider}Id`;
        const updates: any = {};
        updates[providerField] = provider.providerId;
        
        await this.updateUser(user.id, updates);
        return { ...provider, userId: user.id };
      } else {
        // Create new user with provider info
        const providerField = `${provider.provider}Id`;
        const userToCreate: any = {
          email: provider.email,
          name: provider.displayName || provider.email,
          primaryProvider: provider.provider,
        };
        userToCreate[providerField] = provider.providerId;
        
        const newUser = await this.createUser(userToCreate);
        return { ...provider, userId: newUser.id };
      }
    } catch (error) {
      console.error("Error creating auth provider:", error);
      throw new Error("Failed to create auth provider");
    }
  }
  
  async updateAuthProvider(id: string, updates: any): Promise<any> {
    try {
      // Update user with provider changes
      const user = await this.getUserById(id);
      
      if (!user) {
        throw new Error("User not found");
      }
      
      if (updates.providerId && updates.provider) {
        const providerField = `${updates.provider}Id`;
        const userUpdates: any = {};
        userUpdates[providerField] = updates.providerId;
        
        await this.updateUser(id, userUpdates);
      }
      
      return { ...updates, userId: id };
    } catch (error) {
      console.error(`Error updating auth provider for user ${id}:`, error);
      throw new Error("Failed to update auth provider");
    }
  }
  
  // ============= Admin Management =============
  
  async updateUserAdminStatus(userId: string, isAdmin: boolean): Promise<User | undefined> {
    try {
      const [updated] = await db
        .update(users)
        .set({ isAdmin })
        .where(eq(users.id, userId))
        .returning();
      return updated;
    } catch (error) {
      console.error(`Error updating admin status for user ${userId}:`, error);
      throw new Error("Failed to update admin status");
    }
  }
  
  async getAdminCount(): Promise<number> {
    try {
      const [result] = await db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(users)
        .where(eq(users.isAdmin, true));
      return result.count;
    } catch (error) {
      console.error("Error getting admin count:", error);
      throw new Error("Failed to get admin count");
    }
  }
  
  async getAllUsers(): Promise<User[]> {
    try {
      return await db
        .select()
        .from(users)
        .orderBy(desc(users.createdAt));
    } catch (error) {
      console.error("Error getting all users:", error);
      throw new Error("Failed to get all users");
    }
  }
  
  async getUserPreferences(userId: string): Promise<any | undefined> {
    try {
      const user = await this.getUserById(userId);
      
      if (!user) return undefined;
      
      // Extract preference fields from user object
      return {
        userId: user.id,
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
      console.error(`Error getting preferences for user ${userId}:`, error);
      throw new Error("Failed to get user preferences");
    }
  }
  
  // ============= Analytics =============
  
  async getUserCount(): Promise<number> {
    try {
      const [result] = await db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(users);
      return result.count;
    } catch (error) {
      console.error("Error getting user count:", error);
      throw new Error("Failed to get user count");
    }
  }
  
  async getActiveUserCount(since: Date): Promise<number> {
    try {
      const [result] = await db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(users)
        .where(gte(users.updatedAt, since));
      return result.count;
    } catch (error) {
      console.error("Error getting active user count:", error);
      throw new Error("Failed to get active user count");
    }
  }
  
  async getUsersByProvider(provider: string): Promise<User[]> {
    try {
      return await db
        .select()
        .from(users)
        .where(eq(users.primaryProvider, provider))
        .orderBy(desc(users.createdAt));
    } catch (error) {
      console.error(`Error getting users by provider ${provider}:`, error);
      throw new Error("Failed to get users by provider");
    }
  }
  
  // ============= Default Data Initialization =============
  
  async ensureDefaultDataForUser(userId: string): Promise<void> {
    try {
      // Check if user already has storage locations
      const existingStorage = await db
        .select()
        .from(userStorage)
        .where(eq(userStorage.userId, userId));
      
      if (existingStorage.length === 0) {
        // Create default storage locations
        const defaultLocations = [
          { name: "Fridge", icon: "🍎", isDefault: true, sortOrder: 1 },
          { name: "Pantry", icon: "🥫", isDefault: true, sortOrder: 2 },
          { name: "Freezer", icon: "🧊", isDefault: false, sortOrder: 3 },
        ];
        
        await db.insert(userStorage).values(
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
      console.error(`Error ensuring default data for user ${userId}:`, error);
      // Don't throw here - this is a non-critical operation
    }
  }
}

// Export singleton instance
export const userAuthStorage = new UserAuthDomainStorage();