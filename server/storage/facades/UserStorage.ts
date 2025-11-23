/**
 * UserStorage Facade
 * Consolidates user-specific storage operations into organized sub-modules
 */

import { db } from "../../db";
import { 
  users, sessions, authProviders, 
  userInventory, userStorage, userShopping, userRecipes, chatHistory,
  notifications, notificationPreferences, pushTokens, notificationScores, notificationFeedback,
  meetingSchedules, meetingPreferences, meetingSuggestions,
  cookingTerms, foodCategories,
  User, Session, AuthProvider,
  UserInventory, UserStorage as UserStorageType, ShoppingItem, UserRecipe,
  ChatMessage, Notification, NotificationPreference, PushToken,
  MeetingSchedule, MeetingPreference, MeetingSuggestion,
  CookingTerm, FoodCategory,
  InsertUser, InsertUserInventory, InsertUserStorage, InsertShoppingItem,
  InsertUserRecipe, InsertChatMessage, InsertNotification, InsertPushToken,
  InsertMeetingSchedule, InsertCookingTerm
} from "@shared/schema";
import { eq, and, or, sql, desc, asc, gte, lt, lte, ilike, isNull, not, inArray } from "drizzle-orm";
import { createInsertData, createUpdateData, buildMetadata } from "../../types/storage-helpers";

/**
 * User module - handles user management, authentication, and sessions
 */
class UserModule {
  private defaultInventoryInitialized = new Set<string>();

  async getUserById(id: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user;
    } catch (error) {
      console.error(`Error getting user by ID ${id}:`, error);
      throw new Error("Failed to retrieve user");
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      if (!email) return undefined;
      const [user] = await db.select().from(users).where(eq(users.email, email));
      return user;
    } catch (error) {
      console.error(`Error getting user by email ${email}:`, error);
      throw new Error("Failed to retrieve user");
    }
  }

  async getUserByPrimaryProviderId(provider: string, providerId: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users)
        .where(and(
          eq(users.primaryProvider, provider),
          eq(users.primaryProviderId, providerId)
        ));
      return user;
    } catch (error) {
      console.error(`Error getting user by provider ${provider}:`, error);
      throw new Error("Failed to retrieve user");
    }
  }

  async createUser(userData: Partial<User>): Promise<User> {
    try {
      const [newUser] = await db.insert(users).values({
        email: userData.email || null,
        firstName: userData.firstName || null,
        lastName: userData.lastName || null,
        profileImageUrl: userData.profileImageUrl || null,
        primaryProvider: userData.primaryProvider || "email",
        primaryProviderId: userData.primaryProviderId || null,
        dietaryRestrictions: userData.dietaryRestrictions || [],
        allergens: userData.allergens || [],
        foodsToAvoid: userData.foodsToAvoid || [],
        cuisinePreferences: userData.cuisinePreferences || [],
        skillLevel: userData.skillLevel || "intermediate",
        servingSize: userData.servingSize || 2,
      }).returning();
      
      if (newUser && newUser.id) {
        await this.ensureDefaultDataForUser(newUser.id);
      }
      
      return newUser;
    } catch (error) {
      console.error("Error creating user:", error);
      throw new Error("Failed to create user");
    }
  }

  async updateUser(id: string, userData: Partial<User>): Promise<User | undefined> {
    try {
      const [updatedUser] = await db.update(users)
        .set(userData)
        .where(eq(users.id, id))
        .returning();
      return updatedUser;
    } catch (error) {
      console.error(`Error updating user ${id}:`, error);
      throw new Error("Failed to update user");
    }
  }

  async deleteUser(id: string): Promise<boolean> {
    try {
      const result = await db.delete(users).where(eq(users.id, id));
      return result.rowCount > 0;
    } catch (error) {
      console.error(`Error deleting user ${id}:`, error);
      throw new Error("Failed to delete user");
    }
  }

  async updateUserPreferences(
    userId: string,
    preferences: {
      dietaryRestrictions?: string[];
      allergens?: string[];
      foodsToAvoid?: string[];
      cuisinePreferences?: string[];
      skillLevel?: string;
      servingSize?: number;
    }
  ): Promise<User | undefined> {
    try {
      const [updatedUser] = await db.update(users)
        .set(preferences)
        .where(eq(users.id, userId))
        .returning();
      return updatedUser;
    } catch (error) {
      console.error(`Error updating preferences for user ${userId}:`, error);
      throw new Error("Failed to update user preferences");
    }
  }

  async updateUserNotificationPreferences(
    userId: string,
    preferences: { notifications?: boolean }
  ): Promise<User | undefined> {
    try {
      const [updatedUser] = await db.update(users)
        .set({ notifications: preferences.notifications })
        .where(eq(users.id, userId))
        .returning();
      return updatedUser;
    } catch (error) {
      console.error(`Error updating notification preferences for user ${userId}:`, error);
      throw new Error("Failed to update notification preferences");
    }
  }

  async markOnboardingComplete(userId: string): Promise<User | undefined> {
    try {
      const [updatedUser] = await db.update(users)
        .set({ onboardingCompleted: true })
        .where(eq(users.id, userId))
        .returning();
      return updatedUser;
    } catch (error) {
      console.error(`Error marking onboarding complete for user ${userId}:`, error);
      throw new Error("Failed to mark onboarding complete");
    }
  }

  async createSession(sessionData: Partial<Session>): Promise<Session> {
    try {
      const [session] = await db.insert(sessions).values({
        userId: sessionData.userId!,
        expiresAt: sessionData.expiresAt!,
      }).returning();
      return session;
    } catch (error) {
      console.error("Error creating session:", error);
      throw new Error("Failed to create session");
    }
  }

  async getSession(sessionId: string): Promise<Session | undefined> {
    try {
      const [session] = await db.select().from(sessions).where(eq(sessions.id, sessionId));
      return session;
    } catch (error) {
      console.error(`Error getting session ${sessionId}:`, error);
      throw new Error("Failed to retrieve session");
    }
  }

  async updateSession(sessionId: string, data: Partial<Session>): Promise<Session | undefined> {
    try {
      const [updatedSession] = await db.update(sessions)
        .set(data)
        .where(eq(sessions.id, sessionId))
        .returning();
      return updatedSession;
    } catch (error) {
      console.error(`Error updating session ${sessionId}:`, error);
      throw new Error("Failed to update session");
    }
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      const result = await db.delete(sessions).where(eq(sessions.id, sessionId));
      return result.rowCount > 0;
    } catch (error) {
      console.error(`Error deleting session ${sessionId}:`, error);
      throw new Error("Failed to delete session");
    }
  }

  async cleanupExpiredSessions(): Promise<number> {
    try {
      const result = await db.delete(sessions)
        .where(lt(sessions.expiresAt, new Date()));
      return result.rowCount;
    } catch (error) {
      console.error("Error cleaning up expired sessions:", error);
      throw new Error("Failed to cleanup expired sessions");
    }
  }

  async linkOAuthProvider(userId: string, provider: string, providerId: string, accessToken?: string, refreshToken?: string): Promise<void> {
    try {
      await db.insert(authProviders).values({
        userId,
        provider,
        providerId,
        accessToken: accessToken || null,
        refreshToken: refreshToken || null,
      });
    } catch (error) {
      console.error(`Error linking OAuth provider for user ${userId}:`, error);
      throw new Error("Failed to link OAuth provider");
    }
  }

  async unlinkOAuthProvider(userId: string, provider: string): Promise<boolean> {
    try {
      const result = await db.delete(authProviders)
        .where(and(
          eq(authProviders.userId, userId),
          eq(authProviders.provider, provider)
        ));
      return result.rowCount > 0;
    } catch (error) {
      console.error(`Error unlinking OAuth provider for user ${userId}:`, error);
      throw new Error("Failed to unlink OAuth provider");
    }
  }

  async getAuthProviderByProviderAndId(provider: string, providerId: string): Promise<AuthProvider | undefined> {
    try {
      const [authProvider] = await db.select().from(authProviders)
        .where(and(
          eq(authProviders.provider, provider),
          eq(authProviders.providerId, providerId)
        ));
      return authProvider;
    } catch (error) {
      console.error(`Error getting auth provider ${provider}:${providerId}:`, error);
      throw new Error("Failed to retrieve auth provider");
    }
  }

  async getAuthProviderByProviderAndUserId(provider: string, userId: string): Promise<AuthProvider | undefined> {
    try {
      const [authProvider] = await db.select().from(authProviders)
        .where(and(
          eq(authProviders.provider, provider),
          eq(authProviders.userId, userId)
        ));
      return authProvider;
    } catch (error) {
      console.error(`Error getting auth provider ${provider} for user ${userId}:`, error);
      throw new Error("Failed to retrieve auth provider");
    }
  }

  async createAuthProvider(data: Partial<AuthProvider>): Promise<AuthProvider> {
    try {
      const [authProvider] = await db.insert(authProviders).values({
        userId: data.userId!,
        provider: data.provider!,
        providerId: data.providerId!,
        accessToken: data.accessToken || null,
        refreshToken: data.refreshToken || null,
      }).returning();
      return authProvider;
    } catch (error) {
      console.error("Error creating auth provider:", error);
      throw new Error("Failed to create auth provider");
    }
  }

  async updateAuthProvider(id: string, data: Partial<AuthProvider>): Promise<AuthProvider | undefined> {
    try {
      const [updated] = await db.update(authProviders)
        .set(data)
        .where(eq(authProviders.id, id))
        .returning();
      return updated;
    } catch (error) {
      console.error(`Error updating auth provider ${id}:`, error);
      throw new Error("Failed to update auth provider");
    }
  }

  async updateUserAdminStatus(userId: string, isAdmin: boolean): Promise<User | undefined> {
    try {
      const [updatedUser] = await db.update(users)
        .set({ isAdmin })
        .where(eq(users.id, userId))
        .returning();
      return updatedUser;
    } catch (error) {
      console.error(`Error updating admin status for user ${userId}:`, error);
      throw new Error("Failed to update admin status");
    }
  }

  async getAdminCount(): Promise<number> {
    try {
      const [result] = await db.select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(eq(users.isAdmin, true));
      return result?.count || 0;
    } catch (error) {
      console.error("Error getting admin count:", error);
      throw new Error("Failed to get admin count");
    }
  }

  async getAllUsers(): Promise<User[]> {
    try {
      return await db.select().from(users).orderBy(desc(users.createdAt));
    } catch (error) {
      console.error("Error getting all users:", error);
      throw new Error("Failed to retrieve users");
    }
  }

  async getUserPreferences(userId: string): Promise<any> {
    try {
      const user = await this.getUserById(userId);
      if (!user) return null;
      
      return {
        dietaryRestrictions: user.dietaryRestrictions || [],
        allergens: user.allergens || [],
        foodsToAvoid: user.foodsToAvoid || [],
        cuisinePreferences: user.cuisinePreferences || [],
        skillLevel: user.skillLevel || "intermediate",
        servingSize: user.servingSize || 2,
        notifications: user.notifications ?? true,
      };
    } catch (error) {
      console.error(`Error getting preferences for user ${userId}:`, error);
      throw new Error("Failed to retrieve user preferences");
    }
  }

  async getUserCount(): Promise<number> {
    try {
      const [result] = await db.select({ count: sql<number>`count(*)::int` }).from(users);
      return result?.count || 0;
    } catch (error) {
      console.error("Error getting user count:", error);
      throw new Error("Failed to get user count");
    }
  }

  async getActiveUserCount(daysAgo: number = 30): Promise<number> {
    try {
      const date = new Date();
      date.setDate(date.getDate() - daysAgo);
      
      const [result] = await db.select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(gte(users.lastActive, date));
      return result?.count || 0;
    } catch (error) {
      console.error("Error getting active user count:", error);
      throw new Error("Failed to get active user count");
    }
  }

  async getUsersByProvider(provider: string): Promise<User[]> {
    try {
      return await db.select().from(users)
        .where(eq(users.primaryProvider, provider))
        .orderBy(desc(users.createdAt));
    } catch (error) {
      console.error(`Error getting users by provider ${provider}:`, error);
      throw new Error("Failed to retrieve users by provider");
    }
  }

  async ensureDefaultDataForUser(userId: string): Promise<void> {
    if (this.defaultInventoryInitialized.has(userId)) {
      return;
    }

    try {
      const existingLocations = await db.select()
        .from(userStorage)
        .where(eq(userStorage.userId, userId))
        .limit(1);

      if (existingLocations.length === 0) {
        const defaultLocations = [
          { name: "Fridge", icon: "🧊", sortOrder: 1, isDefault: true },
          { name: "Pantry", icon: "🥫", sortOrder: 2, isDefault: true },
          { name: "Freezer", icon: "❄️", sortOrder: 3, isDefault: true },
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

      this.defaultInventoryInitialized.add(userId);
    } catch (error) {
      console.error(`Error ensuring default data for user ${userId}:`, error);
    }
  }
}

/**
 * Food module - handles food data and cooking terms
 */
class FoodModule {
  async getCookingTerms(): Promise<CookingTerm[]> {
    try {
      return await db.select().from(cookingTerms).orderBy(cookingTerms.term);
    } catch (error) {
      console.error("Error getting cooking terms:", error);
      throw new Error("Failed to retrieve cooking terms");
    }
  }

  async getCookingTerm(id: string): Promise<CookingTerm | undefined> {
    try {
      const [term] = await db.select().from(cookingTerms).where(eq(cookingTerms.id, id));
      return term;
    } catch (error) {
      console.error(`Error getting cooking term ${id}:`, error);
      throw new Error("Failed to retrieve cooking term");
    }
  }

  async getCookingTermByTerm(term: string): Promise<CookingTerm | undefined> {
    try {
      const [result] = await db.select().from(cookingTerms).where(eq(cookingTerms.term, term));
      return result;
    } catch (error) {
      console.error(`Error getting cooking term by term ${term}:`, error);
      throw new Error("Failed to retrieve cooking term");
    }
  }

  async getCookingTermsByCategory(category: string): Promise<CookingTerm[]> {
    try {
      return await db.select().from(cookingTerms)
        .where(eq(cookingTerms.category, category))
        .orderBy(cookingTerms.term);
    } catch (error) {
      console.error(`Error getting cooking terms by category ${category}:`, error);
      throw new Error("Failed to retrieve cooking terms");
    }
  }

  async createCookingTerm(data: InsertCookingTerm): Promise<CookingTerm> {
    try {
      const [term] = await db.insert(cookingTerms).values(data).returning();
      return term;
    } catch (error) {
      console.error("Error creating cooking term:", error);
      throw new Error("Failed to create cooking term");
    }
  }

  async updateCookingTerm(id: string, data: Partial<CookingTerm>): Promise<CookingTerm | undefined> {
    try {
      const [updated] = await db.update(cookingTerms)
        .set(data)
        .where(eq(cookingTerms.id, id))
        .returning();
      return updated;
    } catch (error) {
      console.error(`Error updating cooking term ${id}:`, error);
      throw new Error("Failed to update cooking term");
    }
  }

  async deleteCookingTerm(id: string): Promise<boolean> {
    try {
      const result = await db.delete(cookingTerms).where(eq(cookingTerms.id, id));
      return result.rowCount > 0;
    } catch (error) {
      console.error(`Error deleting cooking term ${id}:`, error);
      throw new Error("Failed to delete cooking term");
    }
  }

  async searchCookingTerms(query: string): Promise<CookingTerm[]> {
    try {
      return await db.select().from(cookingTerms)
        .where(or(
          ilike(cookingTerms.term, `%${query}%`),
          ilike(cookingTerms.definition, `%${query}%`),
          ilike(cookingTerms.techniques, `%${query}%`)
        ))
        .orderBy(cookingTerms.term);
    } catch (error) {
      console.error(`Error searching cooking terms with query ${query}:`, error);
      throw new Error("Failed to search cooking terms");
    }
  }
}

/**
 * Recipes module - handles recipe management and meal planning
 */
class RecipesModule {
  async getRecipes(userId: string): Promise<UserRecipe[]> {
    try {
      return await db.select().from(userRecipes)
        .where(eq(userRecipes.userId, userId))
        .orderBy(desc(userRecipes.createdAt));
    } catch (error) {
      console.error(`Error getting recipes for user ${userId}:`, error);
      throw new Error("Failed to retrieve recipes");
    }
  }

  async getRecipesPaginated(userId: string, limit: number = 20, offset: number = 0): Promise<{
    recipes: UserRecipe[];
    total: number;
  }> {
    try {
      const recipes = await db.select().from(userRecipes)
        .where(eq(userRecipes.userId, userId))
        .orderBy(desc(userRecipes.createdAt))
        .limit(limit)
        .offset(offset);
      
      const [countResult] = await db.select({ count: sql<number>`count(*)::int` })
        .from(userRecipes)
        .where(eq(userRecipes.userId, userId));
      
      return {
        recipes,
        total: countResult?.count || 0,
      };
    } catch (error) {
      console.error(`Error getting paginated recipes for user ${userId}:`, error);
      throw new Error("Failed to retrieve paginated recipes");
    }
  }

  async getRecipe(id: string, userId: string): Promise<UserRecipe | undefined> {
    try {
      const [recipe] = await db.select().from(userRecipes)
        .where(and(
          eq(userRecipes.id, id),
          eq(userRecipes.userId, userId)
        ));
      return recipe;
    } catch (error) {
      console.error(`Error getting recipe ${id}:`, error);
      throw new Error("Failed to retrieve recipe");
    }
  }

  async searchRecipes(userId: string, query: string): Promise<UserRecipe[]> {
    try {
      return await db.select().from(userRecipes)
        .where(and(
          eq(userRecipes.userId, userId),
          or(
            ilike(userRecipes.name, `%${query}%`),
            ilike(userRecipes.description, `%${query}%`),
            sql`${userRecipes.ingredients}::text ILIKE ${`%${query}%`}`
          )
        ))
        .orderBy(desc(userRecipes.createdAt));
    } catch (error) {
      console.error(`Error searching recipes for user ${userId}:`, error);
      throw new Error("Failed to search recipes");
    }
  }

  async searchRecipesByIngredients(userId: string, ingredients: string[]): Promise<UserRecipe[]> {
    try {
      const conditions = ingredients.map(ing => 
        sql`${userRecipes.ingredients}::text ILIKE ${`%${ing}%`}`
      );
      
      return await db.select().from(userRecipes)
        .where(and(
          eq(userRecipes.userId, userId),
          and(...conditions)
        ))
        .orderBy(desc(userRecipes.createdAt));
    } catch (error) {
      console.error(`Error searching recipes by ingredients for user ${userId}:`, error);
      throw new Error("Failed to search recipes by ingredients");
    }
  }

  async createRecipe(data: InsertUserRecipe): Promise<UserRecipe> {
    try {
      const [recipe] = await db.insert(userRecipes).values(data).returning();
      return recipe;
    } catch (error) {
      console.error("Error creating recipe:", error);
      throw new Error("Failed to create recipe");
    }
  }

  async updateRecipe(id: string, userId: string, data: Partial<UserRecipe>): Promise<UserRecipe | undefined> {
    try {
      const [updated] = await db.update(userRecipes)
        .set(data)
        .where(and(
          eq(userRecipes.id, id),
          eq(userRecipes.userId, userId)
        ))
        .returning();
      return updated;
    } catch (error) {
      console.error(`Error updating recipe ${id}:`, error);
      throw new Error("Failed to update recipe");
    }
  }

  async deleteRecipe(id: string, userId: string): Promise<boolean> {
    try {
      const result = await db.delete(userRecipes)
        .where(and(
          eq(userRecipes.id, id),
          eq(userRecipes.userId, userId)
        ));
      return result.rowCount > 0;
    } catch (error) {
      console.error(`Error deleting recipe ${id}:`, error);
      throw new Error("Failed to delete recipe");
    }
  }

  async toggleRecipeFavorite(id: string, userId: string): Promise<UserRecipe | undefined> {
    try {
      const recipe = await this.getRecipe(id, userId);
      if (!recipe) return undefined;
      
      const [updated] = await db.update(userRecipes)
        .set({ isFavorite: !recipe.isFavorite })
        .where(and(
          eq(userRecipes.id, id),
          eq(userRecipes.userId, userId)
        ))
        .returning();
      return updated;
    } catch (error) {
      console.error(`Error toggling favorite for recipe ${id}:`, error);
      throw new Error("Failed to toggle recipe favorite");
    }
  }

  async rateRecipe(id: string, userId: string, rating: number): Promise<UserRecipe | undefined> {
    try {
      const [updated] = await db.update(userRecipes)
        .set({ rating })
        .where(and(
          eq(userRecipes.id, id),
          eq(userRecipes.userId, userId)
        ))
        .returning();
      return updated;
    } catch (error) {
      console.error(`Error rating recipe ${id}:`, error);
      throw new Error("Failed to rate recipe");
    }
  }

  async findSimilarRecipes(userId: string, recipeId: string, limit: number = 5): Promise<UserRecipe[]> {
    try {
      const recipe = await this.getRecipe(recipeId, userId);
      if (!recipe) return [];
      
      return await db.select().from(userRecipes)
        .where(and(
          eq(userRecipes.userId, userId),
          not(eq(userRecipes.id, recipeId)),
          or(
            eq(userRecipes.category, recipe.category),
            eq(userRecipes.cuisine, recipe.cuisine)
          )
        ))
        .limit(limit);
    } catch (error) {
      console.error(`Error finding similar recipes for ${recipeId}:`, error);
      throw new Error("Failed to find similar recipes");
    }
  }

  async getMealPlans(userId: string): Promise<any[]> {
    return [];
  }

  async getMealPlansByDate(userId: string, startDate: Date, endDate: Date): Promise<any[]> {
    return [];
  }

  async getMealPlan(id: string, userId: string): Promise<any | undefined> {
    return undefined;
  }

  async createMealPlan(data: any): Promise<any> {
    return {};
  }

  async updateMealPlan(id: string, userId: string, data: any): Promise<any | undefined> {
    return undefined;
  }

  async deleteMealPlan(id: string, userId: string): Promise<boolean> {
    return false;
  }

  async markMealPlanCompleted(id: string, userId: string): Promise<any | undefined> {
    return undefined;
  }

  async getMostUsedRecipes(userId: string, limit: number = 10): Promise<UserRecipe[]> {
    try {
      return await db.select().from(userRecipes)
        .where(eq(userRecipes.userId, userId))
        .orderBy(desc(userRecipes.timesCooked))
        .limit(limit);
    } catch (error) {
      console.error(`Error getting most used recipes for user ${userId}:`, error);
      throw new Error("Failed to retrieve most used recipes");
    }
  }

  async getRecipeCategories(userId: string): Promise<string[]> {
    try {
      const results = await db.selectDistinct({ category: userRecipes.category })
        .from(userRecipes)
        .where(and(
          eq(userRecipes.userId, userId),
          not(isNull(userRecipes.category))
        ));
      return results.map(r => r.category).filter(Boolean) as string[];
    } catch (error) {
      console.error(`Error getting recipe categories for user ${userId}:`, error);
      throw new Error("Failed to retrieve recipe categories");
    }
  }

  async getRecipeCuisines(userId: string): Promise<string[]> {
    try {
      const results = await db.selectDistinct({ cuisine: userRecipes.cuisine })
        .from(userRecipes)
        .where(and(
          eq(userRecipes.userId, userId),
          not(isNull(userRecipes.cuisine))
        ));
      return results.map(r => r.cuisine).filter(Boolean) as string[];
    } catch (error) {
      console.error(`Error getting recipe cuisines for user ${userId}:`, error);
      throw new Error("Failed to retrieve recipe cuisines");
    }
  }

  async getRecipeSuggestionsBasedOnInventory(userId: string, limit: number = 5): Promise<UserRecipe[]> {
    try {
      const inventory = await db.select().from(userInventory)
        .where(eq(userInventory.userId, userId));
      
      if (inventory.length === 0) return [];
      
      const itemNames = inventory.map(item => item.name);
      const conditions = itemNames.map(name => 
        sql`${userRecipes.ingredients}::text ILIKE ${`%${name}%`}`
      );
      
      return await db.select().from(userRecipes)
        .where(and(
          eq(userRecipes.userId, userId),
          or(...conditions)
        ))
        .limit(limit);
    } catch (error) {
      console.error(`Error getting recipe suggestions for user ${userId}:`, error);
      throw new Error("Failed to get recipe suggestions");
    }
  }

  async getRecipeSuggestionsBasedOnExpiring(userId: string, daysAhead: number = 3): Promise<UserRecipe[]> {
    try {
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + daysAhead);
      
      const expiringItems = await db.select().from(userInventory)
        .where(and(
          eq(userInventory.userId, userId),
          not(isNull(userInventory.expirationDate)),
          lte(userInventory.expirationDate, expirationDate)
        ));
      
      if (expiringItems.length === 0) return [];
      
      const itemNames = expiringItems.map(item => item.name);
      const conditions = itemNames.map(name => 
        sql`${userRecipes.ingredients}::text ILIKE ${`%${name}%`}`
      );
      
      return await db.select().from(userRecipes)
        .where(and(
          eq(userRecipes.userId, userId),
          or(...conditions)
        ))
        .limit(10);
    } catch (error) {
      console.error(`Error getting expiring recipe suggestions for user ${userId}:`, error);
      throw new Error("Failed to get expiring recipe suggestions");
    }
  }
}

/**
 * Inventory module - handles food inventory and shopping lists
 */
class InventoryModule {
  private defaultInventoryInitialized = new Set<string>();

  private async ensureDefaultInventoryForUser(userId: string): Promise<void> {
    if (this.defaultInventoryInitialized.has(userId)) {
      return;
    }

    try {
      const existingLocations = await db.select()
        .from(userStorage)
        .where(eq(userStorage.userId, userId))
        .limit(1);

      if (existingLocations.length === 0) {
        const defaultLocations = [
          { name: "Fridge", icon: "🧊", sortOrder: 1, isDefault: true },
          { name: "Pantry", icon: "🥫", sortOrder: 2, isDefault: true },
          { name: "Freezer", icon: "❄️", sortOrder: 3, isDefault: true },
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

      this.defaultInventoryInitialized.add(userId);
    } catch (error) {
      console.error(`Failed to initialize default data for user ${userId}:`, error);
    }
  }

  async getFoodItems(userId: string, storageLocationId?: string): Promise<UserInventory[]> {
    try {
      await this.ensureDefaultInventoryForUser(userId);
      
      const conditions = [eq(userInventory.userId, userId)];
      if (storageLocationId) {
        conditions.push(eq(userInventory.storageLocationId, storageLocationId));
      }
      
      return await db.select().from(userInventory)
        .where(and(...conditions))
        .orderBy(asc(userInventory.expirationDate), asc(userInventory.name));
    } catch (error) {
      console.error(`Error getting food items for user ${userId}:`, error);
      throw new Error("Failed to retrieve food items");
    }
  }

  async getFoodItemsPaginated(
    userId: string, 
    limit: number = 20, 
    offset: number = 0,
    storageLocationId?: string
  ): Promise<{ items: UserInventory[]; total: number }> {
    try {
      await this.ensureDefaultInventoryForUser(userId);
      
      const conditions = [eq(userInventory.userId, userId)];
      if (storageLocationId) {
        conditions.push(eq(userInventory.storageLocationId, storageLocationId));
      }
      
      const items = await db.select().from(userInventory)
        .where(and(...conditions))
        .orderBy(asc(userInventory.expirationDate), asc(userInventory.name))
        .limit(limit)
        .offset(offset);
      
      const [countResult] = await db.select({ count: sql<number>`count(*)::int` })
        .from(userInventory)
        .where(and(...conditions));
      
      return {
        items,
        total: countResult?.count || 0,
      };
    } catch (error) {
      console.error(`Error getting paginated food items for user ${userId}:`, error);
      throw new Error("Failed to retrieve paginated food items");
    }
  }

  async getFoodItem(id: string, userId: string): Promise<UserInventory | undefined> {
    try {
      const [item] = await db.select().from(userInventory)
        .where(and(
          eq(userInventory.id, id),
          eq(userInventory.userId, userId)
        ));
      return item;
    } catch (error) {
      console.error(`Error getting food item ${id}:`, error);
      throw new Error("Failed to retrieve food item");
    }
  }

  async createFoodItem(data: InsertUserInventory): Promise<UserInventory> {
    try {
      await this.ensureDefaultInventoryForUser(data.userId);
      const [item] = await db.insert(userInventory).values(data).returning();
      return item;
    } catch (error) {
      console.error("Error creating food item:", error);
      throw new Error("Failed to create food item");
    }
  }

  async updateFoodItem(id: string, userId: string, data: Partial<UserInventory>): Promise<UserInventory | undefined> {
    try {
      const [updated] = await db.update(userInventory)
        .set(data)
        .where(and(
          eq(userInventory.id, id),
          eq(userInventory.userId, userId)
        ))
        .returning();
      return updated;
    } catch (error) {
      console.error(`Error updating food item ${id}:`, error);
      throw new Error("Failed to update food item");
    }
  }

  async deleteFoodItem(id: string, userId: string): Promise<boolean> {
    try {
      const result = await db.delete(userInventory)
        .where(and(
          eq(userInventory.id, id),
          eq(userInventory.userId, userId)
        ));
      return result.rowCount > 0;
    } catch (error) {
      console.error(`Error deleting food item ${id}:`, error);
      throw new Error("Failed to delete food item");
    }
  }

  async getFoodCategories(): Promise<string[]> {
    return ["Dairy", "Meat", "Vegetables", "Fruits", "Grains", "Beverages", "Snacks", "Condiments", "Other"];
  }

  async getExpiringItems(userId: string, daysAhead: number = 7): Promise<UserInventory[]> {
    try {
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + daysAhead);
      
      return await db.select().from(userInventory)
        .where(and(
          eq(userInventory.userId, userId),
          not(isNull(userInventory.expirationDate)),
          lte(userInventory.expirationDate, expirationDate)
        ))
        .orderBy(asc(userInventory.expirationDate));
    } catch (error) {
      console.error(`Error getting expiring items for user ${userId}:`, error);
      throw new Error("Failed to retrieve expiring items");
    }
  }

  async getStorageLocations(userId: string): Promise<UserStorageType[]> {
    try {
      await this.ensureDefaultInventoryForUser(userId);
      
      return await db.select().from(userStorage)
        .where(and(
          eq(userStorage.userId, userId),
          eq(userStorage.isActive, true)
        ))
        .orderBy(asc(userStorage.sortOrder));
    } catch (error) {
      console.error(`Error getting storage locations for user ${userId}:`, error);
      throw new Error("Failed to retrieve storage locations");
    }
  }

  async getStorageLocation(id: string, userId: string): Promise<UserStorageType | undefined> {
    try {
      const [location] = await db.select().from(userStorage)
        .where(and(
          eq(userStorage.id, id),
          eq(userStorage.userId, userId)
        ));
      return location;
    } catch (error) {
      console.error(`Error getting storage location ${id}:`, error);
      throw new Error("Failed to retrieve storage location");
    }
  }

  async createStorageLocation(data: InsertUserStorage): Promise<UserStorageType> {
    try {
      const [location] = await db.insert(userStorage).values(data).returning();
      return location;
    } catch (error) {
      console.error("Error creating storage location:", error);
      throw new Error("Failed to create storage location");
    }
  }

  async updateStorageLocation(id: string, userId: string, data: Partial<UserStorageType>): Promise<UserStorageType | undefined> {
    try {
      const [updated] = await db.update(userStorage)
        .set(data)
        .where(and(
          eq(userStorage.id, id),
          eq(userStorage.userId, userId)
        ))
        .returning();
      return updated;
    } catch (error) {
      console.error(`Error updating storage location ${id}:`, error);
      throw new Error("Failed to update storage location");
    }
  }

  async deleteStorageLocation(id: string, userId: string): Promise<boolean> {
    try {
      const result = await db.delete(userStorage)
        .where(and(
          eq(userStorage.id, id),
          eq(userStorage.userId, userId),
          eq(userStorage.isDefault, false)
        ));
      return result.rowCount > 0;
    } catch (error) {
      console.error(`Error deleting storage location ${id}:`, error);
      throw new Error("Failed to delete storage location");
    }
  }

  async getShoppingItems(userId: string): Promise<ShoppingItem[]> {
    try {
      return await db.select().from(userShopping)
        .where(eq(userShopping.userId, userId))
        .orderBy(asc(userShopping.category), asc(userShopping.name));
    } catch (error) {
      console.error(`Error getting shopping items for user ${userId}:`, error);
      throw new Error("Failed to retrieve shopping items");
    }
  }

  async getGroupedShoppingItems(userId: string): Promise<Record<string, ShoppingItem[]>> {
    try {
      const items = await this.getShoppingItems(userId);
      const grouped: Record<string, ShoppingItem[]> = {};
      
      items.forEach(item => {
        const category = item.category || 'Other';
        if (!grouped[category]) {
          grouped[category] = [];
        }
        grouped[category].push(item);
      });
      
      return grouped;
    } catch (error) {
      console.error(`Error getting grouped shopping items for user ${userId}:`, error);
      throw new Error("Failed to retrieve grouped shopping items");
    }
  }

  async createShoppingItem(data: InsertShoppingItem): Promise<ShoppingItem> {
    try {
      const [item] = await db.insert(userShopping).values(data).returning();
      return item;
    } catch (error) {
      console.error("Error creating shopping item:", error);
      throw new Error("Failed to create shopping item");
    }
  }

  async updateShoppingItem(id: string, userId: string, data: Partial<ShoppingItem>): Promise<ShoppingItem | undefined> {
    try {
      const [updated] = await db.update(userShopping)
        .set(data)
        .where(and(
          eq(userShopping.id, id),
          eq(userShopping.userId, userId)
        ))
        .returning();
      return updated;
    } catch (error) {
      console.error(`Error updating shopping item ${id}:`, error);
      throw new Error("Failed to update shopping item");
    }
  }

  async deleteShoppingItem(id: string, userId: string): Promise<boolean> {
    try {
      const result = await db.delete(userShopping)
        .where(and(
          eq(userShopping.id, id),
          eq(userShopping.userId, userId)
        ));
      return result.rowCount > 0;
    } catch (error) {
      console.error(`Error deleting shopping item ${id}:`, error);
      throw new Error("Failed to delete shopping item");
    }
  }

  async clearCheckedShoppingItems(userId: string): Promise<number> {
    try {
      const result = await db.delete(userShopping)
        .where(and(
          eq(userShopping.userId, userId),
          eq(userShopping.isChecked, true)
        ));
      return result.rowCount;
    } catch (error) {
      console.error(`Error clearing checked shopping items for user ${userId}:`, error);
      throw new Error("Failed to clear checked shopping items");
    }
  }

  async addMissingIngredientsToShoppingList(userId: string, recipeId: string): Promise<ShoppingItem[]> {
    try {
      const recipe = await db.select().from(userRecipes)
        .where(and(
          eq(userRecipes.id, recipeId),
          eq(userRecipes.userId, userId)
        ))
        .limit(1);
      
      if (!recipe[0] || !recipe[0].ingredients) return [];
      
      const ingredients = recipe[0].ingredients as any[];
      const inventory = await this.getFoodItems(userId);
      const inventoryNames = inventory.map(item => item.name.toLowerCase());
      
      const newShoppingItems: ShoppingItem[] = [];
      
      for (const ingredient of ingredients) {
        const name = ingredient.name || ingredient;
        if (!inventoryNames.includes(name.toLowerCase())) {
          const [item] = await db.insert(userShopping).values({
            userId,
            name,
            quantity: ingredient.quantity || 1,
            unit: ingredient.unit || 'unit',
            category: 'Other',
            isChecked: false,
            notes: `For recipe: ${recipe[0].name}`,
          }).returning();
          newShoppingItems.push(item);
        }
      }
      
      return newShoppingItems;
    } catch (error) {
      console.error(`Error adding missing ingredients to shopping list:`, error);
      throw new Error("Failed to add missing ingredients to shopping list");
    }
  }
}

/**
 * Chat module - handles chat messages
 */
class ChatModule {
  async getChatMessages(userId: string): Promise<ChatMessage[]> {
    try {
      return await db.select().from(chatHistory)
        .where(eq(chatHistory.userId, userId))
        .orderBy(asc(chatHistory.timestamp));
    } catch (error) {
      console.error(`Error getting chat messages for user ${userId}:`, error);
      throw new Error("Failed to retrieve chat messages");
    }
  }

  async getChatMessagesPaginated(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ messages: ChatMessage[]; total: number }> {
    try {
      const messages = await db.select().from(chatHistory)
        .where(eq(chatHistory.userId, userId))
        .orderBy(desc(chatHistory.timestamp))
        .limit(limit)
        .offset(offset);
      
      const [countResult] = await db.select({ count: sql<number>`count(*)::int` })
        .from(chatHistory)
        .where(eq(chatHistory.userId, userId));
      
      return {
        messages: messages.reverse(),
        total: countResult?.count || 0,
      };
    } catch (error) {
      console.error(`Error getting paginated chat messages for user ${userId}:`, error);
      throw new Error("Failed to retrieve paginated chat messages");
    }
  }

  async createChatMessage(data: InsertChatMessage): Promise<ChatMessage> {
    try {
      const [message] = await db.insert(chatHistory).values(data).returning();
      return message;
    } catch (error) {
      console.error("Error creating chat message:", error);
      throw new Error("Failed to create chat message");
    }
  }

  async deleteChatHistory(userId: string): Promise<boolean> {
    try {
      const result = await db.delete(chatHistory)
        .where(eq(chatHistory.userId, userId));
      return result.rowCount > 0;
    } catch (error) {
      console.error(`Error deleting chat history for user ${userId}:`, error);
      throw new Error("Failed to delete chat history");
    }
  }
}

/**
 * Notifications module - handles notifications and push tokens
 */
class NotificationsModule {
  async savePushToken(data: InsertPushToken): Promise<PushToken> {
    try {
      const existingToken = await db.select().from(pushTokens)
        .where(and(
          eq(pushTokens.userId, data.userId),
          eq(pushTokens.token, data.token)
        ))
        .limit(1);
      
      if (existingToken.length > 0) {
        const [updated] = await db.update(pushTokens)
          .set({ lastUsed: new Date() })
          .where(eq(pushTokens.id, existingToken[0].id))
          .returning();
        return updated;
      }
      
      const [token] = await db.insert(pushTokens).values(data).returning();
      return token;
    } catch (error) {
      console.error("Error saving push token:", error);
      throw new Error("Failed to save push token");
    }
  }

  async getUserPushTokens(userId: string): Promise<PushToken[]> {
    try {
      return await db.select().from(pushTokens)
        .where(eq(pushTokens.userId, userId))
        .orderBy(desc(pushTokens.lastUsed));
    } catch (error) {
      console.error(`Error getting push tokens for user ${userId}:`, error);
      throw new Error("Failed to retrieve push tokens");
    }
  }

  async deletePushToken(tokenId: string): Promise<boolean> {
    try {
      const result = await db.delete(pushTokens).where(eq(pushTokens.id, tokenId));
      return result.rowCount > 0;
    } catch (error) {
      console.error(`Error deleting push token ${tokenId}:`, error);
      throw new Error("Failed to delete push token");
    }
  }

  async deleteUserPushTokens(userId: string): Promise<number> {
    try {
      const result = await db.delete(pushTokens).where(eq(pushTokens.userId, userId));
      return result.rowCount;
    } catch (error) {
      console.error(`Error deleting push tokens for user ${userId}:`, error);
      throw new Error("Failed to delete user push tokens");
    }
  }

  async createNotification(data: InsertNotification): Promise<Notification> {
    try {
      const [notification] = await db.insert(notifications).values(data).returning();
      return notification;
    } catch (error) {
      console.error("Error creating notification:", error);
      throw new Error("Failed to create notification");
    }
  }

  async getNotification(id: string): Promise<Notification | undefined> {
    try {
      const [notification] = await db.select().from(notifications).where(eq(notifications.id, id));
      return notification;
    } catch (error) {
      console.error(`Error getting notification ${id}:`, error);
      throw new Error("Failed to retrieve notification");
    }
  }

  async getUserNotifications(userId: string, limit: number = 50): Promise<Notification[]> {
    try {
      return await db.select().from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(desc(notifications.createdAt))
        .limit(limit);
    } catch (error) {
      console.error(`Error getting notifications for user ${userId}:`, error);
      throw new Error("Failed to retrieve user notifications");
    }
  }

  async getUndismissedNotifications(userId: string): Promise<Notification[]> {
    try {
      return await db.select().from(notifications)
        .where(and(
          eq(notifications.userId, userId),
          eq(notifications.dismissed, false)
        ))
        .orderBy(desc(notifications.createdAt));
    } catch (error) {
      console.error(`Error getting undismissed notifications for user ${userId}:`, error);
      throw new Error("Failed to retrieve undismissed notifications");
    }
  }

  async dismissNotification(id: string): Promise<Notification | undefined> {
    try {
      const [updated] = await db.update(notifications)
        .set({ dismissed: true, dismissedAt: new Date() })
        .where(eq(notifications.id, id))
        .returning();
      return updated;
    } catch (error) {
      console.error(`Error dismissing notification ${id}:`, error);
      throw new Error("Failed to dismiss notification");
    }
  }

  async markNotificationRead(id: string): Promise<Notification | undefined> {
    try {
      const [updated] = await db.update(notifications)
        .set({ read: true, readAt: new Date() })
        .where(eq(notifications.id, id))
        .returning();
      return updated;
    } catch (error) {
      console.error(`Error marking notification ${id} as read:`, error);
      throw new Error("Failed to mark notification as read");
    }
  }

  async getPendingNotifications(): Promise<Notification[]> {
    try {
      return await db.select().from(notifications)
        .where(and(
          eq(notifications.status, 'pending'),
          lte(notifications.scheduledFor, new Date())
        ))
        .orderBy(asc(notifications.scheduledFor));
    } catch (error) {
      console.error("Error getting pending notifications:", error);
      throw new Error("Failed to retrieve pending notifications");
    }
  }

  async getNotificationPreferences(userId: string): Promise<NotificationPreference[]> {
    try {
      return await db.select().from(notificationPreferences)
        .where(eq(notificationPreferences.userId, userId));
    } catch (error) {
      console.error(`Error getting notification preferences for user ${userId}:`, error);
      throw new Error("Failed to retrieve notification preferences");
    }
  }

  async getAllNotificationPreferences(): Promise<NotificationPreference[]> {
    try {
      return await db.select().from(notificationPreferences);
    } catch (error) {
      console.error("Error getting all notification preferences:", error);
      throw new Error("Failed to retrieve all notification preferences");
    }
  }

  async getNotificationPreferenceByType(userId: string, type: string): Promise<NotificationPreference | undefined> {
    try {
      const [pref] = await db.select().from(notificationPreferences)
        .where(and(
          eq(notificationPreferences.userId, userId),
          eq(notificationPreferences.type, type)
        ));
      return pref;
    } catch (error) {
      console.error(`Error getting notification preference for user ${userId}, type ${type}:`, error);
      throw new Error("Failed to retrieve notification preference");
    }
  }

  async upsertNotificationPreferences(userId: string, preferences: Record<string, boolean>): Promise<void> {
    try {
      for (const [type, enabled] of Object.entries(preferences)) {
        const existing = await this.getNotificationPreferenceByType(userId, type);
        
        if (existing) {
          await db.update(notificationPreferences)
            .set({ enabled })
            .where(eq(notificationPreferences.id, existing.id));
        } else {
          await db.insert(notificationPreferences).values({
            userId,
            type,
            enabled,
          });
        }
      }
    } catch (error) {
      console.error(`Error upserting notification preferences for user ${userId}:`, error);
      throw new Error("Failed to upsert notification preferences");
    }
  }

  async createNotificationScore(userId: string, type: string, score: number = 0.5): Promise<any> {
    try {
      const [result] = await db.insert(notificationScores).values({
        userId,
        notificationType: type,
        score,
        sampleSize: 0,
      }).returning();
      return result;
    } catch (error) {
      console.error("Error creating notification score:", error);
      throw new Error("Failed to create notification score");
    }
  }

  async getNotificationScores(userId: string): Promise<any[]> {
    try {
      return await db.select().from(notificationScores)
        .where(eq(notificationScores.userId, userId));
    } catch (error) {
      console.error(`Error getting notification scores for user ${userId}:`, error);
      throw new Error("Failed to retrieve notification scores");
    }
  }

  async getNotificationScoreByType(userId: string, type: string): Promise<any | undefined> {
    try {
      const [score] = await db.select().from(notificationScores)
        .where(and(
          eq(notificationScores.userId, userId),
          eq(notificationScores.notificationType, type)
        ));
      return score;
    } catch (error) {
      console.error(`Error getting notification score for user ${userId}, type ${type}:`, error);
      throw new Error("Failed to retrieve notification score");
    }
  }

  async updateNotificationScore(userId: string, type: string, engaged: boolean): Promise<any | undefined> {
    try {
      const existing = await this.getNotificationScoreByType(userId, type);
      
      if (!existing) {
        return await this.createNotificationScore(userId, type);
      }
      
      const alpha = 0.1;
      const newScore = alpha * (engaged ? 1 : 0) + (1 - alpha) * existing.score;
      
      const [updated] = await db.update(notificationScores)
        .set({
          score: newScore,
          sampleSize: existing.sampleSize + 1,
          lastUpdated: new Date(),
        })
        .where(eq(notificationScores.id, existing.id))
        .returning();
      
      return updated;
    } catch (error) {
      console.error(`Error updating notification score for user ${userId}, type ${type}:`, error);
      throw new Error("Failed to update notification score");
    }
  }

  async createNotificationFeedback(userId: string, notificationId: string, feedback: string): Promise<any> {
    try {
      const [result] = await db.insert(notificationFeedback).values({
        userId,
        notificationId,
        feedback,
        helpful: feedback === 'helpful',
      }).returning();
      return result;
    } catch (error) {
      console.error("Error creating notification feedback:", error);
      throw new Error("Failed to create notification feedback");
    }
  }

  async getNotificationFeedback(notificationId: string): Promise<any[]> {
    try {
      return await db.select().from(notificationFeedback)
        .where(eq(notificationFeedback.notificationId, notificationId));
    } catch (error) {
      console.error(`Error getting notification feedback for notification ${notificationId}:`, error);
      throw new Error("Failed to retrieve notification feedback");
    }
  }

  async getUserNotificationFeedback(userId: string): Promise<any[]> {
    try {
      return await db.select().from(notificationFeedback)
        .where(eq(notificationFeedback.userId, userId))
        .orderBy(desc(notificationFeedback.createdAt));
    } catch (error) {
      console.error(`Error getting notification feedback for user ${userId}:`, error);
      throw new Error("Failed to retrieve user notification feedback");
    }
  }

  async getRecentUserEngagement(userId: string, days: number = 30): Promise<number> {
    try {
      const since = new Date();
      since.setDate(since.getDate() - days);
      
      const [result] = await db.select({
        total: sql<number>`count(*)::int`,
        engaged: sql<number>`sum(case when read = true then 1 else 0 end)::int`,
      }).from(notifications)
        .where(and(
          eq(notifications.userId, userId),
          gte(notifications.createdAt, since)
        ));
      
      if (!result || result.total === 0) return 0;
      return result.engaged / result.total;
    } catch (error) {
      console.error(`Error getting recent user engagement for user ${userId}:`, error);
      throw new Error("Failed to get recent user engagement");
    }
  }

  async getNotificationStats(userId: string): Promise<any> {
    try {
      const [stats] = await db.select({
        total: sql<number>`count(*)::int`,
        read: sql<number>`sum(case when read = true then 1 else 0 end)::int`,
        dismissed: sql<number>`sum(case when dismissed = true then 1 else 0 end)::int`,
        pending: sql<number>`sum(case when status = 'pending' then 1 else 0 end)::int`,
        sent: sql<number>`sum(case when status = 'sent' then 1 else 0 end)::int`,
        failed: sql<number>`sum(case when status = 'failed' then 1 else 0 end)::int`,
      }).from(notifications)
        .where(eq(notifications.userId, userId));
      
      return stats || {
        total: 0,
        read: 0,
        dismissed: 0,
        pending: 0,
        sent: 0,
        failed: 0,
      };
    } catch (error) {
      console.error(`Error getting notification stats for user ${userId}:`, error);
      throw new Error("Failed to get notification stats");
    }
  }
}

/**
 * Scheduling module - handles meeting scheduling
 */
class SchedulingModule {
  async getMeetingSchedules(userId: string): Promise<MeetingSchedule[]> {
    try {
      return await db.select().from(meetingSchedules)
        .where(eq(meetingSchedules.userId, userId))
        .orderBy(asc(meetingSchedules.startTime));
    } catch (error) {
      console.error(`Error getting meeting schedules for user ${userId}:`, error);
      throw new Error("Failed to retrieve meeting schedules");
    }
  }

  async getMeetingSchedule(id: string): Promise<MeetingSchedule | undefined> {
    try {
      const [schedule] = await db.select().from(meetingSchedules)
        .where(eq(meetingSchedules.id, id));
      return schedule;
    } catch (error) {
      console.error(`Error getting meeting schedule ${id}:`, error);
      throw new Error("Failed to retrieve meeting schedule");
    }
  }

  async createMeetingSchedule(data: InsertMeetingSchedule): Promise<MeetingSchedule> {
    try {
      const [schedule] = await db.insert(meetingSchedules).values(data).returning();
      return schedule;
    } catch (error) {
      console.error("Error creating meeting schedule:", error);
      throw new Error("Failed to create meeting schedule");
    }
  }

  async updateMeetingSchedule(id: string, data: Partial<MeetingSchedule>): Promise<MeetingSchedule | undefined> {
    try {
      const [updated] = await db.update(meetingSchedules)
        .set(data)
        .where(eq(meetingSchedules.id, id))
        .returning();
      return updated;
    } catch (error) {
      console.error(`Error updating meeting schedule ${id}:`, error);
      throw new Error("Failed to update meeting schedule");
    }
  }

  async deleteMeetingSchedule(id: string): Promise<boolean> {
    try {
      const result = await db.delete(meetingSchedules)
        .where(eq(meetingSchedules.id, id));
      return result.rowCount > 0;
    } catch (error) {
      console.error(`Error deleting meeting schedule ${id}:`, error);
      throw new Error("Failed to delete meeting schedule");
    }
  }

  async getUpcomingMeetings(userId: string, limit: number = 10): Promise<MeetingSchedule[]> {
    try {
      return await db.select().from(meetingSchedules)
        .where(and(
          eq(meetingSchedules.userId, userId),
          gte(meetingSchedules.startTime, new Date()),
          eq(meetingSchedules.status, 'scheduled')
        ))
        .orderBy(asc(meetingSchedules.startTime))
        .limit(limit);
    } catch (error) {
      console.error(`Error getting upcoming meetings for user ${userId}:`, error);
      throw new Error("Failed to retrieve upcoming meetings");
    }
  }

  async getMeetingsByDateRange(userId: string, startDate: Date, endDate: Date): Promise<MeetingSchedule[]> {
    try {
      return await db.select().from(meetingSchedules)
        .where(and(
          eq(meetingSchedules.userId, userId),
          gte(meetingSchedules.startTime, startDate),
          lte(meetingSchedules.startTime, endDate)
        ))
        .orderBy(asc(meetingSchedules.startTime));
    } catch (error) {
      console.error(`Error getting meetings by date range for user ${userId}:`, error);
      throw new Error("Failed to retrieve meetings by date range");
    }
  }

  async getMeetingPreferences(userId: string): Promise<MeetingPreference | undefined> {
    try {
      const [pref] = await db.select().from(meetingPreferences)
        .where(eq(meetingPreferences.userId, userId));
      return pref;
    } catch (error) {
      console.error(`Error getting meeting preferences for user ${userId}:`, error);
      throw new Error("Failed to retrieve meeting preferences");
    }
  }

  async upsertMeetingPreferences(userId: string, preferences: Partial<MeetingPreference>): Promise<MeetingPreference> {
    try {
      const existing = await this.getMeetingPreferences(userId);
      
      if (existing) {
        const [updated] = await db.update(meetingPreferences)
          .set(preferences)
          .where(eq(meetingPreferences.userId, userId))
          .returning();
        return updated;
      }
      
      const [created] = await db.insert(meetingPreferences)
        .values({ ...preferences, userId })
        .returning();
      return created;
    } catch (error) {
      console.error(`Error upserting meeting preferences for user ${userId}:`, error);
      throw new Error("Failed to upsert meeting preferences");
    }
  }

  async createMeetingSuggestion(data: Partial<MeetingSuggestion>): Promise<MeetingSuggestion> {
    try {
      const [suggestion] = await db.insert(meetingSuggestions)
        .values(data as any)
        .returning();
      return suggestion;
    } catch (error) {
      console.error("Error creating meeting suggestion:", error);
      throw new Error("Failed to create meeting suggestion");
    }
  }

  async getMeetingSuggestions(userId: string): Promise<MeetingSuggestion[]> {
    try {
      return await db.select().from(meetingSuggestions)
        .where(eq(meetingSuggestions.userId, userId))
        .orderBy(desc(meetingSuggestions.confidence));
    } catch (error) {
      console.error(`Error getting meeting suggestions for user ${userId}:`, error);
      throw new Error("Failed to retrieve meeting suggestions");
    }
  }

  async acceptMeetingSuggestion(id: string): Promise<MeetingSuggestion | undefined> {
    try {
      const [updated] = await db.update(meetingSuggestions)
        .set({ status: 'accepted' })
        .where(eq(meetingSuggestions.id, id))
        .returning();
      return updated;
    } catch (error) {
      console.error(`Error accepting meeting suggestion ${id}:`, error);
      throw new Error("Failed to accept meeting suggestion");
    }
  }

  async rejectMeetingSuggestion(id: string, reason?: string): Promise<MeetingSuggestion | undefined> {
    try {
      const [updated] = await db.update(meetingSuggestions)
        .set({ 
          status: 'rejected',
          rejectionReason: reason 
        })
        .where(eq(meetingSuggestions.id, id))
        .returning();
      return updated;
    } catch (error) {
      console.error(`Error rejecting meeting suggestion ${id}:`, error);
      throw new Error("Failed to reject meeting suggestion");
    }
  }

  async detectSchedulingPatterns(userId: string): Promise<any[]> {
    try {
      const meetings = await db.select().from(meetingSchedules)
        .where(eq(meetingSchedules.userId, userId))
        .orderBy(desc(meetingSchedules.createdAt))
        .limit(100);
      
      const patterns: any[] = [];
      const timeSlots: Record<string, number> = {};
      const durations: Record<number, number> = {};
      const types: Record<string, number> = {};
      
      meetings.forEach(meeting => {
        const hour = new Date(meeting.startTime).getHours();
        const duration = Math.round((meeting.endTime.getTime() - meeting.startTime.getTime()) / (1000 * 60));
        
        timeSlots[hour] = (timeSlots[hour] || 0) + 1;
        durations[duration] = (durations[duration] || 0) + 1;
        if (meeting.type) {
          types[meeting.type] = (types[meeting.type] || 0) + 1;
        }
      });
      
      const mostCommonHour = Object.entries(timeSlots)
        .sort((a, b) => b[1] - a[1])[0];
      if (mostCommonHour) {
        patterns.push({
          type: 'preferred_time',
          value: parseInt(mostCommonHour[0]),
          frequency: mostCommonHour[1],
        });
      }
      
      const mostCommonDuration = Object.entries(durations)
        .sort((a, b) => b[1] - a[1])[0];
      if (mostCommonDuration) {
        patterns.push({
          type: 'preferred_duration',
          value: parseInt(mostCommonDuration[0]),
          frequency: mostCommonDuration[1],
        });
      }
      
      return patterns;
    } catch (error) {
      console.error(`Error detecting scheduling patterns for user ${userId}:`, error);
      throw new Error("Failed to detect scheduling patterns");
    }
  }

  async checkConflicts(userId: string, startTime: Date, endTime: Date): Promise<MeetingSchedule[]> {
    try {
      return await db.select().from(meetingSchedules)
        .where(and(
          eq(meetingSchedules.userId, userId),
          or(
            and(
              lte(meetingSchedules.startTime, startTime),
              gte(meetingSchedules.endTime, startTime)
            ),
            and(
              lte(meetingSchedules.startTime, endTime),
              gte(meetingSchedules.endTime, endTime)
            ),
            and(
              gte(meetingSchedules.startTime, startTime),
              lte(meetingSchedules.endTime, endTime)
            )
          ),
          eq(meetingSchedules.status, 'scheduled')
        ));
    } catch (error) {
      console.error(`Error checking conflicts for user ${userId}:`, error);
      throw new Error("Failed to check meeting conflicts");
    }
  }

  async getAvailableSlots(
    userId: string,
    date: Date,
    duration: number,
    startHour: number = 9,
    endHour: number = 17
  ): Promise<{ start: Date; end: Date }[]> {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(startHour, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(endHour, 0, 0, 0);
      
      const meetings = await this.getMeetingsByDateRange(userId, startOfDay, endOfDay);
      
      const slots: { start: Date; end: Date }[] = [];
      let currentTime = new Date(startOfDay);
      
      for (const meeting of meetings) {
        const slotEnd = new Date(currentTime.getTime() + duration * 60000);
        
        if (slotEnd <= meeting.startTime) {
          slots.push({
            start: new Date(currentTime),
            end: slotEnd,
          });
        }
        
        currentTime = new Date(Math.max(currentTime.getTime(), meeting.endTime.getTime()));
      }
      
      const finalSlotEnd = new Date(currentTime.getTime() + duration * 60000);
      if (finalSlotEnd <= endOfDay) {
        slots.push({
          start: new Date(currentTime),
          end: finalSlotEnd,
        });
      }
      
      return slots;
    } catch (error) {
      console.error(`Error getting available slots for user ${userId}:`, error);
      throw new Error("Failed to get available slots");
    }
  }
}

/**
 * UserStorage Facade
 */
export class UserStorage {
  public readonly user: UserModule;
  public readonly food: FoodModule;
  public readonly recipes: RecipesModule;
  public readonly inventory: InventoryModule;
  public readonly chat: ChatModule;
  public readonly notifications: NotificationsModule;
  public readonly scheduling: SchedulingModule;

  constructor() {
    this.user = new UserModule();
    this.food = new FoodModule();
    this.recipes = new RecipesModule();
    this.inventory = new InventoryModule();
    this.chat = new ChatModule();
    this.notifications = new NotificationsModule();
    this.scheduling = new SchedulingModule();
  }
}