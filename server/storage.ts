// Referenced from blueprint:javascript_log_in_with_replit - Added user operations and user-scoped data
import { 
  type User,
  type UpsertUser,
  type UserPreferences,
  type InsertUserPreferences,
  type StorageLocation, 
  type InsertStorageLocation,
  type Appliance,
  type InsertAppliance,
  type FoodItem,
  type InsertFoodItem,
  type ChatMessage,
  type InsertChatMessage,
  type Recipe,
  type InsertRecipe,
  type ExpirationNotification,
  type InsertExpirationNotification,
  type MealPlan,
  type InsertMealPlan,
  type ApiUsageLog,
  type InsertApiUsageLog,
  type FdcCache,
  type InsertFdcCache,
  type FdcSearchCache,
  type InsertFdcSearchCache,
  users,
  userPreferences,
  storageLocations,
  appliances,
  foodItems,
  chatMessages,
  recipes,
  expirationNotifications,
  mealPlans,
  apiUsageLogs,
  fdcCache,
  fdcSearchCache
} from "@shared/schema";
import { db } from "./db";
import { eq, sql, and } from "drizzle-orm";

export interface IStorage {
  // User operations - REQUIRED for Replit Auth (from blueprint:javascript_log_in_with_replit)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // User Preferences
  getUserPreferences(userId: string): Promise<UserPreferences | undefined>;
  upsertUserPreferences(preferences: InsertUserPreferences & { userId: string }): Promise<UserPreferences>;
  
  // Storage Locations (user-scoped)
  getStorageLocations(userId: string): Promise<StorageLocation[]>;
  getStorageLocation(userId: string, id: string): Promise<StorageLocation | undefined>;
  createStorageLocation(userId: string, location: Omit<InsertStorageLocation, 'userId'>): Promise<StorageLocation>;
  updateStorageLocationCount(userId: string, id: string, count: number): Promise<void>;

  // Appliances (user-scoped)
  getAppliances(userId: string): Promise<Appliance[]>;
  createAppliance(userId: string, appliance: Omit<InsertAppliance, 'userId'>): Promise<Appliance>;
  deleteAppliance(userId: string, id: string): Promise<void>;

  // Food Items (user-scoped)
  getFoodItems(userId: string, storageLocationId?: string): Promise<FoodItem[]>;
  getFoodItemsPaginated(userId: string, page?: number, limit?: number, storageLocationId?: string, sortBy?: 'name' | 'expirationDate' | 'addedAt'): Promise<{ items: FoodItem[], total: number, page: number, totalPages: number }>;
  getFoodItem(userId: string, id: string): Promise<FoodItem | undefined>;
  createFoodItem(userId: string, item: Omit<InsertFoodItem, 'userId'>): Promise<FoodItem>;
  updateFoodItem(userId: string, id: string, item: Partial<Omit<InsertFoodItem, 'userId'>>): Promise<FoodItem>;
  deleteFoodItem(userId: string, id: string): Promise<void>;
  getFoodCategories(userId: string): Promise<string[]>;

  // Chat Messages (user-scoped)
  getChatMessages(userId: string): Promise<ChatMessage[]>;
  getChatMessagesPaginated(userId: string, page?: number, limit?: number): Promise<{ messages: ChatMessage[], total: number, page: number, totalPages: number }>;
  createChatMessage(userId: string, message: Omit<InsertChatMessage, 'userId'>): Promise<ChatMessage>;

  // Recipes (user-scoped)
  getRecipes(userId: string): Promise<Recipe[]>;
  getRecipesPaginated(userId: string, page?: number, limit?: number): Promise<{ recipes: Recipe[], total: number, page: number, totalPages: number }>;
  getRecipe(userId: string, id: string): Promise<Recipe | undefined>;
  createRecipe(userId: string, recipe: Omit<InsertRecipe, 'userId'>): Promise<Recipe>;
  updateRecipe(userId: string, id: string, updates: Partial<Recipe>): Promise<Recipe>;

  // Expiration Notifications (user-scoped)
  getExpirationNotifications(userId: string): Promise<ExpirationNotification[]>;
  createExpirationNotification(userId: string, notification: Omit<InsertExpirationNotification, 'userId'>): Promise<ExpirationNotification>;
  dismissNotification(userId: string, id: string): Promise<void>;
  getExpiringItems(userId: string, daysThreshold: number): Promise<FoodItem[]>;

  // Meal Plans (user-scoped)
  getMealPlans(userId: string, startDate?: string, endDate?: string): Promise<MealPlan[]>;
  getMealPlan(userId: string, id: string): Promise<MealPlan | undefined>;
  createMealPlan(userId: string, plan: Omit<InsertMealPlan, 'userId'>): Promise<MealPlan>;
  updateMealPlan(userId: string, id: string, updates: Partial<Omit<InsertMealPlan, 'userId'>>): Promise<MealPlan>;
  deleteMealPlan(userId: string, id: string): Promise<void>;

  // API Usage Logs (user-scoped)
  logApiUsage(userId: string, log: Omit<InsertApiUsageLog, 'userId'>): Promise<ApiUsageLog>;
  getApiUsageLogs(userId: string, apiName?: string, limit?: number): Promise<ApiUsageLog[]>;
  getApiUsageStats(userId: string, apiName: string, days?: number): Promise<{ totalCalls: number; successfulCalls: number; failedCalls: number }>;
  
  // FDC Cache Methods
  getCachedFood(fdcId: string): Promise<FdcCache | undefined>;
  cacheFood(food: InsertFdcCache): Promise<FdcCache>;
  updateFoodLastAccessed(fdcId: string): Promise<void>;
  getCachedSearchResults(query: string, dataType?: string, pageNumber?: number): Promise<FdcSearchCache | undefined>;
  cacheSearchResults(search: InsertFdcSearchCache): Promise<FdcSearchCache>;
  clearOldCache(daysOld: number): Promise<void>;
  
  // Account Management
  resetUserData(userId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  private userInitialized = new Set<string>();
  private initializationPromises = new Map<string, Promise<void>>();

  private async ensureDefaultDataForUser(userId: string) {
    if (this.userInitialized.has(userId)) return;
    
    // Check if initialization is already in progress for this user
    const existingPromise = this.initializationPromises.get(userId);
    if (existingPromise) {
      await existingPromise;
      return;
    }
    
    // Create a new initialization promise for this user
    const initPromise = (async () => {
      try {
        // Check if user has storage locations
        const existingLocations = await db.select().from(storageLocations).where(eq(storageLocations.userId, userId));
        
        if (existingLocations.length === 0) {
          // Initialize default storage locations for this user
          const defaultLocations = [
            { userId, name: "Fridge", icon: "refrigerator", itemCount: 0 },
            { userId, name: "Freezer", icon: "snowflake", itemCount: 0 },
            { userId, name: "Pantry", icon: "pizza", itemCount: 0 },
            { userId, name: "Counter", icon: "utensils-crossed", itemCount: 0 },
          ];

          await db.insert(storageLocations).values(defaultLocations);

          // Initialize default appliances for this user
          const defaultAppliances = [
            { userId, name: "Oven", type: "cooking" },
            { userId, name: "Stove", type: "cooking" },
            { userId, name: "Microwave", type: "cooking" },
            { userId, name: "Air Fryer", type: "cooking" },
          ];

          await db.insert(appliances).values(defaultAppliances);
        }
        
        // Mark as initialized only on success
        this.userInitialized.add(userId);
      } catch (error) {
        console.error(`Failed to initialize default data for user ${userId}:`, error);
        throw error;
      } finally {
        // Clean up the promise from the map
        this.initializationPromises.delete(userId);
      }
    })();
    
    // Store the promise so concurrent calls can await it
    this.initializationPromises.set(userId, initPromise);
    
    await initPromise;
  }

  // User operations - REQUIRED for Replit Auth (from blueprint:javascript_log_in_with_replit)
  async getUser(id: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user;
    } catch (error) {
      console.error(`Error getting user ${id}:`, error);
      throw new Error('Failed to retrieve user');
    }
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    try {
      // Try to insert with conflict resolution on ID
      const [user] = await db
        .insert(users)
        .values(userData)
        .onConflictDoUpdate({
          target: users.id,
          set: {
            ...userData,
            updatedAt: new Date(),
          },
        })
        .returning();
      return user;
    } catch (error: any) {
      // If we get a duplicate email error, update the existing user with that email
      if (error?.message?.includes('duplicate key') && error?.message?.includes('email')) {
        try {
          const [existingUser] = await db
            .update(users)
            .set({
              ...userData,
              updatedAt: new Date(),
            })
            .where(eq(users.email, userData.email!))
            .returning();
          
          if (existingUser) {
            return existingUser;
          }
        } catch (updateError) {
          console.error('Error updating user by email:', updateError);
        }
      }
      
      console.error('Error upserting user:', error);
      throw new Error('Failed to save user');
    }
  }

  // User Preferences
  async getUserPreferences(userId: string): Promise<UserPreferences | undefined> {
    try {
      const [preferences] = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId));
      return preferences;
    } catch (error) {
      console.error(`Error getting user preferences for ${userId}:`, error);
      throw new Error('Failed to retrieve user preferences');
    }
  }

  async upsertUserPreferences(preferencesData: InsertUserPreferences & { userId: string }): Promise<UserPreferences> {
    try {
      const [preferences] = await db
        .insert(userPreferences)
        .values(preferencesData)
        .onConflictDoUpdate({
          target: userPreferences.userId,
          set: {
            ...preferencesData,
            updatedAt: new Date(),
          },
        })
        .returning();
      return preferences;
    } catch (error) {
      console.error('Error upserting user preferences:', error);
      throw new Error('Failed to save user preferences');
    }
  }

  // Storage Locations
  async getStorageLocations(userId: string): Promise<StorageLocation[]> {
    try {
      await this.ensureDefaultDataForUser(userId);
      
      // Optimized query: get locations with counts in a single query using LEFT JOIN and GROUP BY
      const locationsWithCounts = await db
        .select({
          id: storageLocations.id,
          userId: storageLocations.userId,
          name: storageLocations.name,
          icon: storageLocations.icon,
          itemCount: sql<number>`COALESCE(COUNT(${foodItems.id})::int, 0)`.as('itemCount'),
        })
        .from(storageLocations)
        .leftJoin(
          foodItems,
          and(
            eq(foodItems.storageLocationId, storageLocations.id),
            eq(foodItems.userId, userId)
          )
        )
        .where(eq(storageLocations.userId, userId))
        .groupBy(storageLocations.id, storageLocations.userId, storageLocations.name, storageLocations.icon);
      
      return locationsWithCounts;
    } catch (error) {
      console.error(`Error getting storage locations for user ${userId}:`, error);
      throw new Error('Failed to retrieve storage locations');
    }
  }

  async getStorageLocation(userId: string, id: string): Promise<StorageLocation | undefined> {
    try {
      await this.ensureDefaultDataForUser(userId);
      const [location] = await db.select().from(storageLocations).where(
        and(eq(storageLocations.id, id), eq(storageLocations.userId, userId))
      );
      return location || undefined;
    } catch (error) {
      console.error(`Error getting storage location ${id}:`, error);
      throw new Error('Failed to retrieve storage location');
    }
  }

  async createStorageLocation(userId: string, location: Omit<InsertStorageLocation, 'userId'>): Promise<StorageLocation> {
    try {
      const [newLocation] = await db
        .insert(storageLocations)
        .values({ ...location, userId })
        .returning();
      return newLocation;
    } catch (error) {
      console.error('Error creating storage location:', error);
      throw new Error('Failed to create storage location');
    }
  }

  async updateStorageLocationCount(userId: string, id: string, count: number): Promise<void> {
    try {
      await db
        .update(storageLocations)
        .set({ itemCount: count })
        .where(and(eq(storageLocations.id, id), eq(storageLocations.userId, userId)));
    } catch (error) {
      console.error(`Error updating storage location count for ${id}:`, error);
      throw new Error('Failed to update storage location count');
    }
  }

  // Appliances
  async getAppliances(userId: string): Promise<Appliance[]> {
    try {
      await this.ensureDefaultDataForUser(userId);
      return db.select().from(appliances).where(eq(appliances.userId, userId));
    } catch (error) {
      console.error(`Error getting appliances for user ${userId}:`, error);
      throw new Error('Failed to retrieve appliances');
    }
  }

  async createAppliance(userId: string, appliance: Omit<InsertAppliance, 'userId'>): Promise<Appliance> {
    try {
      const [newAppliance] = await db
        .insert(appliances)
        .values({ ...appliance, userId })
        .returning();
      return newAppliance;
    } catch (error) {
      console.error('Error creating appliance:', error);
      throw new Error('Failed to create appliance');
    }
  }

  async deleteAppliance(userId: string, id: string): Promise<void> {
    try {
      await db.delete(appliances).where(and(eq(appliances.id, id), eq(appliances.userId, userId)));
    } catch (error) {
      console.error(`Error deleting appliance ${id}:`, error);
      throw new Error('Failed to delete appliance');
    }
  }

  // Food Items
  async getFoodItems(userId: string, storageLocationId?: string): Promise<FoodItem[]> {
    try {
      if (storageLocationId) {
        return db.select().from(foodItems).where(
          and(eq(foodItems.storageLocationId, storageLocationId), eq(foodItems.userId, userId))
        );
      }
      return db.select().from(foodItems).where(eq(foodItems.userId, userId));
    } catch (error) {
      console.error(`Error getting food items for user ${userId}:`, error);
      throw new Error('Failed to retrieve food items');
    }
  }

  async getFoodItemsPaginated(
    userId: string, 
    page: number = 1, 
    limit: number = 30, 
    storageLocationId?: string,
    sortBy: 'name' | 'expirationDate' | 'addedAt' = 'expirationDate'
  ): Promise<{ items: FoodItem[], total: number, page: number, totalPages: number }> {
    try {
      const offset = (page - 1) * limit;
      
      // Build where clause
      const whereConditions = [eq(foodItems.userId, userId)];
      if (storageLocationId && storageLocationId !== "all") {
        whereConditions.push(eq(foodItems.storageLocationId, storageLocationId));
      }
      
      // Get total count
      const [countResult] = await db.select({ count: sql<number>`count(*)` })
        .from(foodItems)
        .where(and(...whereConditions));
      
      const total = Number(countResult?.count || 0);
      
      // Determine sort order
      const orderClause = sortBy === 'name' 
        ? foodItems.name
        : sortBy === 'addedAt'
        ? sql`${foodItems.addedAt} DESC`
        : foodItems.expirationDate;
      
      // Get paginated items
      const items = await db.select().from(foodItems)
        .where(and(...whereConditions))
        .orderBy(orderClause)
        .limit(limit)
        .offset(offset);
      
      return {
        items,
        total,
        page,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      console.error(`Error getting paginated food items for user ${userId}:`, error);
      throw new Error('Failed to retrieve food items');
    }
  }

  async getFoodItem(userId: string, id: string): Promise<FoodItem | undefined> {
    try {
      const [item] = await db.select().from(foodItems).where(
        and(eq(foodItems.id, id), eq(foodItems.userId, userId))
      );
      return item || undefined;
    } catch (error) {
      console.error(`Error getting food item ${id}:`, error);
      throw new Error('Failed to retrieve food item');
    }
  }

  async createFoodItem(userId: string, item: Omit<InsertFoodItem, 'userId'>): Promise<FoodItem> {
    try {
      const [newItem] = await db
        .insert(foodItems)
        .values({ ...item, userId })
        .returning();
      return newItem;
    } catch (error) {
      console.error('Error creating food item:', error);
      throw new Error('Failed to create food item');
    }
  }

  async updateFoodItem(userId: string, id: string, item: Partial<Omit<InsertFoodItem, 'userId'>>): Promise<FoodItem> {
    try {
      const [updated] = await db
        .update(foodItems)
        .set(item)
        .where(and(eq(foodItems.id, id), eq(foodItems.userId, userId)))
        .returning();
      
      if (!updated) {
        throw new Error("Food item not found");
      }
      
      return updated;
    } catch (error) {
      console.error(`Error updating food item ${id}:`, error);
      throw new Error('Failed to update food item');
    }
  }

  async deleteFoodItem(userId: string, id: string): Promise<void> {
    try {
      await db.delete(foodItems).where(and(eq(foodItems.id, id), eq(foodItems.userId, userId)));
    } catch (error) {
      console.error(`Error deleting food item ${id}:`, error);
      throw new Error('Failed to delete food item');
    }
  }

  async getFoodCategories(userId: string): Promise<string[]> {
    try {
      const results = await db.execute<{ food_category: string }>(
        sql`SELECT DISTINCT food_category 
            FROM food_items 
            WHERE user_id = ${userId} 
              AND food_category IS NOT NULL 
            ORDER BY food_category`
      );
      
      return results.rows.map(r => r.food_category);
    } catch (error) {
      console.error(`Error getting food categories for user ${userId}:`, error);
      throw new Error('Failed to retrieve food categories');
    }
  }

  // Chat Messages
  async getChatMessages(userId: string): Promise<ChatMessage[]> {
    try {
      return db.select().from(chatMessages)
        .where(eq(chatMessages.userId, userId))
        .orderBy(chatMessages.timestamp);
    } catch (error) {
      console.error(`Error getting chat messages for user ${userId}:`, error);
      throw new Error('Failed to retrieve chat messages');
    }
  }

  async getChatMessagesPaginated(userId: string, page: number = 1, limit: number = 50): Promise<{ messages: ChatMessage[], total: number, page: number, totalPages: number }> {
    try {
      const offset = (page - 1) * limit;
      
      // Get total count
      const [countResult] = await db.select({ count: sql<number>`count(*)` })
        .from(chatMessages)
        .where(eq(chatMessages.userId, userId));
      
      const total = Number(countResult?.count || 0);
      
      // Get paginated messages
      const messages = await db.select().from(chatMessages)
        .where(eq(chatMessages.userId, userId))
        .orderBy(sql`${chatMessages.timestamp} DESC`)
        .limit(limit)
        .offset(offset);
      
      return {
        messages,
        total,
        page,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      console.error(`Error getting paginated chat messages for user ${userId}:`, error);
      throw new Error('Failed to retrieve chat messages');
    }
  }

  async createChatMessage(userId: string, message: Omit<InsertChatMessage, 'userId'>): Promise<ChatMessage> {
    try {
      const [newMessage] = await db
        .insert(chatMessages)
        .values({ ...message, userId })
        .returning();
      return newMessage;
    } catch (error) {
      console.error('Error creating chat message:', error);
      throw new Error('Failed to create chat message');
    }
  }

  // Recipes
  async getRecipes(userId: string): Promise<Recipe[]> {
    try {
      return db.select().from(recipes)
        .where(eq(recipes.userId, userId))
        .orderBy(sql`${recipes.createdAt} DESC`);
    } catch (error) {
      console.error(`Error getting recipes for user ${userId}:`, error);
      throw new Error('Failed to retrieve recipes');
    }
  }

  async getRecipesPaginated(userId: string, page: number = 1, limit: number = 20): Promise<{ recipes: Recipe[], total: number, page: number, totalPages: number }> {
    try {
      const offset = (page - 1) * limit;
      
      // Get total count
      const [countResult] = await db.select({ count: sql<number>`count(*)` })
        .from(recipes)
        .where(eq(recipes.userId, userId));
      
      const total = Number(countResult?.count || 0);
      
      // Get paginated recipes
      const paginatedRecipes = await db.select().from(recipes)
        .where(eq(recipes.userId, userId))
        .orderBy(sql`${recipes.createdAt} DESC`)
        .limit(limit)
        .offset(offset);
      
      return {
        recipes: paginatedRecipes,
        total,
        page,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      console.error(`Error getting paginated recipes for user ${userId}:`, error);
      throw new Error('Failed to retrieve recipes');
    }
  }

  async getRecipe(userId: string, id: string): Promise<Recipe | undefined> {
    try {
      const [recipe] = await db.select().from(recipes).where(
        and(eq(recipes.id, id), eq(recipes.userId, userId))
      );
      return recipe || undefined;
    } catch (error) {
      console.error(`Error getting recipe ${id}:`, error);
      throw new Error('Failed to retrieve recipe');
    }
  }

  async createRecipe(userId: string, recipe: Omit<InsertRecipe, 'userId'>): Promise<Recipe> {
    try {
      const [newRecipe] = await db
        .insert(recipes)
        .values({ ...recipe, userId })
        .returning();
      return newRecipe;
    } catch (error) {
      console.error('Error creating recipe:', error);
      throw new Error('Failed to create recipe');
    }
  }

  async updateRecipe(userId: string, id: string, updates: Partial<Recipe>): Promise<Recipe> {
    try {
      const [updated] = await db
        .update(recipes)
        .set(updates)
        .where(and(eq(recipes.id, id), eq(recipes.userId, userId)))
        .returning();
      
      if (!updated) {
        throw new Error("Recipe not found");
      }
      
      return updated;
    } catch (error) {
      console.error(`Error updating recipe ${id}:`, error);
      throw new Error('Failed to update recipe');
    }
  }

  // Expiration Notifications
  async getExpirationNotifications(userId: string): Promise<ExpirationNotification[]> {
    try {
      return db.select()
        .from(expirationNotifications)
        .where(and(
          eq(expirationNotifications.userId, userId),
          eq(expirationNotifications.dismissed, false)
        ))
        .orderBy(expirationNotifications.daysUntilExpiry);
    } catch (error) {
      console.error(`Error getting expiration notifications for user ${userId}:`, error);
      throw new Error('Failed to retrieve expiration notifications');
    }
  }

  async createExpirationNotification(userId: string, notification: Omit<InsertExpirationNotification, 'userId'>): Promise<ExpirationNotification> {
    try {
      const [newNotification] = await db
        .insert(expirationNotifications)
        .values({ ...notification, userId })
        .returning();
      return newNotification;
    } catch (error) {
      console.error('Error creating expiration notification:', error);
      throw new Error('Failed to create expiration notification');
    }
  }

  async dismissNotification(userId: string, id: string): Promise<void> {
    try {
      await db
        .update(expirationNotifications)
        .set({ dismissed: true })
        .where(and(eq(expirationNotifications.id, id), eq(expirationNotifications.userId, userId)));
    } catch (error) {
      console.error(`Error dismissing notification ${id}:`, error);
      throw new Error('Failed to dismiss notification');
    }
  }

  async getExpiringItems(userId: string, daysThreshold: number): Promise<FoodItem[]> {
    try {
      // Optimized: use SQL to filter items expiring within threshold instead of fetching all items
      const now = new Date();
      const maxExpiryDate = new Date(now.getTime() + daysThreshold * 24 * 60 * 60 * 1000);
      
      const expiringItems = await db
        .select()
        .from(foodItems)
        .where(
          and(
            eq(foodItems.userId, userId),
            sql`${foodItems.expirationDate} IS NOT NULL`,
            sql`${foodItems.expirationDate} >= ${now.toISOString()}`,
            sql`${foodItems.expirationDate} <= ${maxExpiryDate.toISOString()}`
          )
        );
      
      return expiringItems;
    } catch (error) {
      console.error(`Error getting expiring items for user ${userId}:`, error);
      throw new Error('Failed to retrieve expiring items');
    }
  }

  // Meal Plans
  async getMealPlans(userId: string, startDate?: string, endDate?: string): Promise<MealPlan[]> {
    try {
      await this.ensureDefaultDataForUser(userId);
      
      const plans = await db.select().from(mealPlans).where(eq(mealPlans.userId, userId));
      
      // Filter by date range if provided
      if (startDate || endDate) {
        return plans.filter(plan => {
          if (startDate && endDate) {
            return plan.date >= startDate && plan.date <= endDate;
          } else if (startDate) {
            return plan.date >= startDate;
          } else if (endDate) {
            return plan.date <= endDate;
          }
          return true;
        });
      }
      
      return plans;
    } catch (error) {
      console.error(`Error getting meal plans for user ${userId}:`, error);
      throw new Error('Failed to retrieve meal plans');
    }
  }

  async getMealPlan(userId: string, id: string): Promise<MealPlan | undefined> {
    try {
      await this.ensureDefaultDataForUser(userId);
      const [plan] = await db.select().from(mealPlans).where(
        and(eq(mealPlans.id, id), eq(mealPlans.userId, userId))
      );
      return plan || undefined;
    } catch (error) {
      console.error(`Error getting meal plan ${id}:`, error);
      throw new Error('Failed to retrieve meal plan');
    }
  }

  async createMealPlan(userId: string, plan: Omit<InsertMealPlan, 'userId'>): Promise<MealPlan> {
    try {
      await this.ensureDefaultDataForUser(userId);
      const [newPlan] = await db.insert(mealPlans).values({ ...plan, userId }).returning();
      return newPlan;
    } catch (error) {
      console.error('Error creating meal plan:', error);
      throw new Error('Failed to create meal plan');
    }
  }

  async updateMealPlan(userId: string, id: string, updates: Partial<Omit<InsertMealPlan, 'userId'>>): Promise<MealPlan> {
    try {
      await this.ensureDefaultDataForUser(userId);
      const [updated] = await db.update(mealPlans)
        .set(updates)
        .where(and(eq(mealPlans.id, id), eq(mealPlans.userId, userId)))
        .returning();
      
      if (!updated) {
        throw new Error("Meal plan not found");
      }
      
      return updated;
    } catch (error) {
      console.error(`Error updating meal plan ${id}:`, error);
      throw new Error('Failed to update meal plan');
    }
  }

  async deleteMealPlan(userId: string, id: string): Promise<void> {
    try {
      await this.ensureDefaultDataForUser(userId);
      await db.delete(mealPlans).where(and(eq(mealPlans.id, id), eq(mealPlans.userId, userId)));
    } catch (error) {
      console.error(`Error deleting meal plan ${id}:`, error);
      throw new Error('Failed to delete meal plan');
    }
  }

  async logApiUsage(userId: string, log: Omit<InsertApiUsageLog, 'userId'>): Promise<ApiUsageLog> {
    try {
      const [newLog] = await db.insert(apiUsageLogs).values({ ...log, userId }).returning();
      return newLog;
    } catch (error) {
      console.error('Error logging API usage:', error);
      throw new Error('Failed to log API usage');
    }
  }

  async getApiUsageLogs(userId: string, apiName?: string, limit: number = 100): Promise<ApiUsageLog[]> {
    try {
      const conditions = apiName 
        ? and(eq(apiUsageLogs.userId, userId), eq(apiUsageLogs.apiName, apiName))
        : eq(apiUsageLogs.userId, userId);
      
      const logs = await db.select().from(apiUsageLogs)
        .where(conditions)
        .orderBy(sql`${apiUsageLogs.timestamp} DESC`)
        .limit(limit);
      return logs;
    } catch (error) {
      console.error(`Error getting API usage logs for user ${userId}:`, error);
      throw new Error('Failed to retrieve API usage logs');
    }
  }

  async getApiUsageStats(userId: string, apiName: string, days: number = 30): Promise<{ totalCalls: number; successfulCalls: number; failedCalls: number }> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      const logs = await db.select().from(apiUsageLogs).where(
        and(
          eq(apiUsageLogs.userId, userId),
          eq(apiUsageLogs.apiName, apiName),
          sql`${apiUsageLogs.timestamp} >= ${cutoffDate.toISOString()}`
        )
      );
      
      const totalCalls = logs.length;
      const successfulCalls = logs.filter(log => log.success).length;
      const failedCalls = totalCalls - successfulCalls;
      
      return { totalCalls, successfulCalls, failedCalls };
    } catch (error) {
      console.error(`Error getting API usage stats for user ${userId}:`, error);
      throw new Error('Failed to retrieve API usage stats');
    }
  }

  // FDC Cache Methods
  async getCachedFood(fdcId: string): Promise<FdcCache | undefined> {
    try {
      const [cached] = await db.select().from(fdcCache).where(eq(fdcCache.fdcId, fdcId));
      return cached;
    } catch (error) {
      console.error(`Error getting cached food ${fdcId}:`, error);
      throw new Error('Failed to retrieve cached food');
    }
  }

  async cacheFood(food: InsertFdcCache): Promise<FdcCache> {
    try {
      const foodToInsert = {
        fdcId: food.fdcId,
        description: food.description,
        dataType: food.dataType,
        brandOwner: food.brandOwner,
        brandName: food.brandName,
        ingredients: food.ingredients,
        servingSize: food.servingSize,
        servingSizeUnit: food.servingSizeUnit,
        nutrients: food.nutrients as Array<{
          nutrientId: number;
          nutrientName: string;
          nutrientNumber: string;
          unitName: string;
          value: number;
        }> | null | undefined,
        fullData: food.fullData
      };
      
      const [cachedFood] = await db
        .insert(fdcCache)
        .values(foodToInsert)
        .onConflictDoUpdate({
          target: fdcCache.fdcId,
          set: {
            ...foodToInsert,
            lastAccessed: new Date(),
          },
        })
        .returning();
      return cachedFood;
    } catch (error) {
      console.error('Error caching food:', error);
      throw new Error('Failed to cache food');
    }
  }

  async updateFoodLastAccessed(fdcId: string): Promise<void> {
    try {
      await db
        .update(fdcCache)
        .set({ lastAccessed: new Date() })
        .where(eq(fdcCache.fdcId, fdcId));
    } catch (error) {
      console.error(`Error updating last accessed for ${fdcId}:`, error);
      // Don't throw - this is not critical
    }
  }

  async getCachedSearchResults(query: string, dataType?: string, pageNumber: number = 1, isComplexSearch: boolean = false): Promise<FdcSearchCache | undefined> {
    try {
      const conditions = [
        eq(fdcSearchCache.query, query.toLowerCase()),
        eq(fdcSearchCache.pageNumber, pageNumber)
      ];
      
      if (dataType) {
        conditions.push(eq(fdcSearchCache.dataType, dataType));
      }
      
      const [cached] = await db
        .select()
        .from(fdcSearchCache)
        .where(and(...conditions))
        .orderBy(sql`${fdcSearchCache.cachedAt} DESC`)
        .limit(1);
      
      // Use shorter TTL for complex searches (2 hours), longer for simple searches (24 hours)
      if (cached) {
        const cacheAge = Date.now() - new Date(cached.cachedAt).getTime();
        const ttlMs = isComplexSearch 
          ? 2 * 60 * 60 * 1000  // 2 hours for complex searches with filters
          : 24 * 60 * 60 * 1000; // 24 hours for simple searches
        
        if (cacheAge < ttlMs) {
          return cached;
        }
      }
      
      return undefined;
    } catch (error) {
      console.error('Error getting cached search results:', error);
      return undefined;
    }
  }

  async cacheSearchResults(search: InsertFdcSearchCache): Promise<FdcSearchCache> {
    try {
      const searchToInsert = {
        query: search.query.toLowerCase(),
        dataType: search.dataType,
        pageNumber: search.pageNumber,
        pageSize: search.pageSize,
        totalHits: search.totalHits,
        results: search.results as Array<{
          fdcId: string;
          description: string;
          dataType: string;
          brandOwner?: string;
          brandName?: string;
          score?: number;
        }> | null | undefined
      };
      
      const [cachedSearch] = await db
        .insert(fdcSearchCache)
        .values(searchToInsert)
        .returning();
      return cachedSearch;
    } catch (error) {
      console.error('Error caching search results:', error);
      throw new Error('Failed to cache search results');
    }
  }

  async clearOldCache(daysOld: number = 30): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      
      // Clear old search cache
      await db
        .delete(fdcSearchCache)
        .where(sql`${fdcSearchCache.cachedAt} < ${cutoffDate.toISOString()}`);
      
      // Clear old food cache that hasn't been accessed recently
      await db
        .delete(fdcCache)
        .where(sql`${fdcCache.lastAccessed} < ${cutoffDate.toISOString()}`);
    } catch (error) {
      console.error('Error clearing old cache:', error);
      // Don't throw - cache cleanup is not critical
    }
  }

  async resetUserData(userId: string): Promise<void> {
    try {
      // Delete all user data in order (respecting foreign key constraints)
      await db.delete(mealPlans).where(eq(mealPlans.userId, userId));
      await db.delete(expirationNotifications).where(eq(expirationNotifications.userId, userId));
      await db.delete(foodItems).where(eq(foodItems.userId, userId));
      await db.delete(chatMessages).where(eq(chatMessages.userId, userId));
      await db.delete(recipes).where(eq(recipes.userId, userId));
      await db.delete(appliances).where(eq(appliances.userId, userId));
      await db.delete(apiUsageLogs).where(eq(apiUsageLogs.userId, userId));
      
      // Delete custom storage locations (keep default ones for re-initialization)
      await db.delete(storageLocations).where(eq(storageLocations.userId, userId));
      
      // Reset user preferences to defaults
      await db.delete(userPreferences).where(eq(userPreferences.userId, userId));
      
      // Clear the initialization flag so default data will be recreated
      this.userInitialized.delete(userId);
      
      console.log(`Successfully reset all data for user ${userId}`);
    } catch (error) {
      console.error(`Error resetting user data for ${userId}:`, error);
      throw new Error('Failed to reset user data');
    }
  }
}

export const storage = new DatabaseStorage();
