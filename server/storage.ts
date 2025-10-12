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
  users,
  userPreferences,
  storageLocations,
  appliances,
  foodItems,
  chatMessages,
  recipes,
  expirationNotifications,
  mealPlans
} from "@shared/schema";
import { db } from "./db";
import { eq, sql, and } from "drizzle-orm";

export interface IStorage {
  // User operations - REQUIRED for Replit Auth (from blueprint:javascript_log_in_with_replit)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // User Preferences
  getUserPreferences(userId: string): Promise<UserPreferences | undefined>;
  upsertUserPreferences(preferences: InsertUserPreferences): Promise<UserPreferences>;
  
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
  getFoodItem(userId: string, id: string): Promise<FoodItem | undefined>;
  createFoodItem(userId: string, item: Omit<InsertFoodItem, 'userId'>): Promise<FoodItem>;
  updateFoodItem(userId: string, id: string, item: Partial<Omit<InsertFoodItem, 'userId'>>): Promise<FoodItem>;
  deleteFoodItem(userId: string, id: string): Promise<void>;

  // Chat Messages (user-scoped)
  getChatMessages(userId: string): Promise<ChatMessage[]>;
  createChatMessage(userId: string, message: Omit<InsertChatMessage, 'userId'>): Promise<ChatMessage>;

  // Recipes (user-scoped)
  getRecipes(userId: string): Promise<Recipe[]>;
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
}

export class DatabaseStorage implements IStorage {
  private userInitialized = new Set<string>();

  private async ensureDefaultDataForUser(userId: string) {
    if (this.userInitialized.has(userId)) return;
    
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
    
    this.userInitialized.add(userId);
  }

  // User operations - REQUIRED for Replit Auth (from blueprint:javascript_log_in_with_replit)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
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
  }

  // User Preferences
  async getUserPreferences(userId: string): Promise<UserPreferences | undefined> {
    const [preferences] = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId));
    return preferences;
  }

  async upsertUserPreferences(preferencesData: InsertUserPreferences): Promise<UserPreferences> {
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
  }

  // Storage Locations
  async getStorageLocations(userId: string): Promise<StorageLocation[]> {
    await this.ensureDefaultDataForUser(userId);
    
    // Get item counts dynamically
    const locations = await db.select().from(storageLocations).where(eq(storageLocations.userId, userId));
    
    const locationsWithCounts = await Promise.all(
      locations.map(async (location) => {
        const [result] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(foodItems)
          .where(and(
            eq(foodItems.storageLocationId, location.id),
            eq(foodItems.userId, userId)
          ));
        
        return {
          ...location,
          itemCount: result?.count || 0
        };
      })
    );
    
    return locationsWithCounts;
  }

  async getStorageLocation(userId: string, id: string): Promise<StorageLocation | undefined> {
    await this.ensureDefaultDataForUser(userId);
    const [location] = await db.select().from(storageLocations).where(
      and(eq(storageLocations.id, id), eq(storageLocations.userId, userId))
    );
    return location || undefined;
  }

  async createStorageLocation(userId: string, location: Omit<InsertStorageLocation, 'userId'>): Promise<StorageLocation> {
    const [newLocation] = await db
      .insert(storageLocations)
      .values({ ...location, userId })
      .returning();
    return newLocation;
  }

  async updateStorageLocationCount(userId: string, id: string, count: number): Promise<void> {
    await db
      .update(storageLocations)
      .set({ itemCount: count })
      .where(and(eq(storageLocations.id, id), eq(storageLocations.userId, userId)));
  }

  // Appliances
  async getAppliances(userId: string): Promise<Appliance[]> {
    await this.ensureDefaultDataForUser(userId);
    return db.select().from(appliances).where(eq(appliances.userId, userId));
  }

  async createAppliance(userId: string, appliance: Omit<InsertAppliance, 'userId'>): Promise<Appliance> {
    const [newAppliance] = await db
      .insert(appliances)
      .values({ ...appliance, userId })
      .returning();
    return newAppliance;
  }

  async deleteAppliance(userId: string, id: string): Promise<void> {
    await db.delete(appliances).where(and(eq(appliances.id, id), eq(appliances.userId, userId)));
  }

  // Food Items
  async getFoodItems(userId: string, storageLocationId?: string): Promise<FoodItem[]> {
    if (storageLocationId) {
      return db.select().from(foodItems).where(
        and(eq(foodItems.storageLocationId, storageLocationId), eq(foodItems.userId, userId))
      );
    }
    return db.select().from(foodItems).where(eq(foodItems.userId, userId));
  }

  async getFoodItem(userId: string, id: string): Promise<FoodItem | undefined> {
    const [item] = await db.select().from(foodItems).where(
      and(eq(foodItems.id, id), eq(foodItems.userId, userId))
    );
    return item || undefined;
  }

  async createFoodItem(userId: string, item: Omit<InsertFoodItem, 'userId'>): Promise<FoodItem> {
    const [newItem] = await db
      .insert(foodItems)
      .values({ ...item, userId })
      .returning();
    return newItem;
  }

  async updateFoodItem(userId: string, id: string, item: Partial<Omit<InsertFoodItem, 'userId'>>): Promise<FoodItem> {
    const [updated] = await db
      .update(foodItems)
      .set(item)
      .where(and(eq(foodItems.id, id), eq(foodItems.userId, userId)))
      .returning();
    
    if (!updated) {
      throw new Error("Food item not found");
    }
    
    return updated;
  }

  async deleteFoodItem(userId: string, id: string): Promise<void> {
    await db.delete(foodItems).where(and(eq(foodItems.id, id), eq(foodItems.userId, userId)));
  }

  // Chat Messages
  async getChatMessages(userId: string): Promise<ChatMessage[]> {
    return db.select().from(chatMessages)
      .where(eq(chatMessages.userId, userId))
      .orderBy(chatMessages.timestamp);
  }

  async createChatMessage(userId: string, message: Omit<InsertChatMessage, 'userId'>): Promise<ChatMessage> {
    const [newMessage] = await db
      .insert(chatMessages)
      .values({ ...message, userId })
      .returning();
    return newMessage;
  }

  // Recipes
  async getRecipes(userId: string): Promise<Recipe[]> {
    return db.select().from(recipes)
      .where(eq(recipes.userId, userId))
      .orderBy(sql`${recipes.createdAt} DESC`);
  }

  async getRecipe(userId: string, id: string): Promise<Recipe | undefined> {
    const [recipe] = await db.select().from(recipes).where(
      and(eq(recipes.id, id), eq(recipes.userId, userId))
    );
    return recipe || undefined;
  }

  async createRecipe(userId: string, recipe: Omit<InsertRecipe, 'userId'>): Promise<Recipe> {
    const [newRecipe] = await db
      .insert(recipes)
      .values({ ...recipe, userId })
      .returning();
    return newRecipe;
  }

  async updateRecipe(userId: string, id: string, updates: Partial<Recipe>): Promise<Recipe> {
    const [updated] = await db
      .update(recipes)
      .set(updates)
      .where(and(eq(recipes.id, id), eq(recipes.userId, userId)))
      .returning();
    
    if (!updated) {
      throw new Error("Recipe not found");
    }
    
    return updated;
  }

  // Expiration Notifications
  async getExpirationNotifications(userId: string): Promise<ExpirationNotification[]> {
    return db.select()
      .from(expirationNotifications)
      .where(and(
        eq(expirationNotifications.userId, userId),
        eq(expirationNotifications.dismissed, false)
      ))
      .orderBy(expirationNotifications.daysUntilExpiry);
  }

  async createExpirationNotification(userId: string, notification: Omit<InsertExpirationNotification, 'userId'>): Promise<ExpirationNotification> {
    const [newNotification] = await db
      .insert(expirationNotifications)
      .values({ ...notification, userId })
      .returning();
    return newNotification;
  }

  async dismissNotification(userId: string, id: string): Promise<void> {
    await db
      .update(expirationNotifications)
      .set({ dismissed: true })
      .where(and(eq(expirationNotifications.id, id), eq(expirationNotifications.userId, userId)));
  }

  async getExpiringItems(userId: string, daysThreshold: number): Promise<FoodItem[]> {
    // Get items with expiration dates that are within the threshold
    const items = await db.select().from(foodItems).where(eq(foodItems.userId, userId));
    
    const expiringItems = items.filter(item => {
      if (!item.expirationDate) return false;
      
      const expiry = new Date(item.expirationDate);
      const now = new Date();
      const daysUntil = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      return daysUntil >= 0 && daysUntil <= daysThreshold;
    });
    
    return expiringItems;
  }

  // Meal Plans
  async getMealPlans(userId: string, startDate?: string, endDate?: string): Promise<MealPlan[]> {
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
  }

  async getMealPlan(userId: string, id: string): Promise<MealPlan | undefined> {
    await this.ensureDefaultDataForUser(userId);
    const [plan] = await db.select().from(mealPlans).where(
      and(eq(mealPlans.id, id), eq(mealPlans.userId, userId))
    );
    return plan || undefined;
  }

  async createMealPlan(userId: string, plan: Omit<InsertMealPlan, 'userId'>): Promise<MealPlan> {
    await this.ensureDefaultDataForUser(userId);
    const [newPlan] = await db.insert(mealPlans).values({ ...plan, userId }).returning();
    return newPlan;
  }

  async updateMealPlan(userId: string, id: string, updates: Partial<Omit<InsertMealPlan, 'userId'>>): Promise<MealPlan> {
    await this.ensureDefaultDataForUser(userId);
    const [updated] = await db.update(mealPlans)
      .set(updates)
      .where(and(eq(mealPlans.id, id), eq(mealPlans.userId, userId)))
      .returning();
    
    if (!updated) {
      throw new Error("Meal plan not found");
    }
    
    return updated;
  }

  async deleteMealPlan(userId: string, id: string): Promise<void> {
    await this.ensureDefaultDataForUser(userId);
    await db.delete(mealPlans).where(and(eq(mealPlans.id, id), eq(mealPlans.userId, userId)));
  }
}

export const storage = new DatabaseStorage();
