import { 
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
  storageLocations,
  appliances,
  foodItems,
  chatMessages,
  recipes,
  expirationNotifications
} from "@shared/schema";
import { db } from "./db";
import { eq, sql, and, lte } from "drizzle-orm";

export interface IStorage {
  // Storage Locations
  getStorageLocations(): Promise<StorageLocation[]>;
  getStorageLocation(id: string): Promise<StorageLocation | undefined>;
  createStorageLocation(location: InsertStorageLocation): Promise<StorageLocation>;
  updateStorageLocationCount(id: string, count: number): Promise<void>;

  // Appliances
  getAppliances(): Promise<Appliance[]>;
  createAppliance(appliance: InsertAppliance): Promise<Appliance>;
  deleteAppliance(id: string): Promise<void>;

  // Food Items
  getFoodItems(storageLocationId?: string): Promise<FoodItem[]>;
  getFoodItem(id: string): Promise<FoodItem | undefined>;
  createFoodItem(item: InsertFoodItem): Promise<FoodItem>;
  updateFoodItem(id: string, item: Partial<InsertFoodItem>): Promise<FoodItem>;
  deleteFoodItem(id: string): Promise<void>;

  // Chat Messages
  getChatMessages(): Promise<ChatMessage[]>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;

  // Recipes
  getRecipes(): Promise<Recipe[]>;
  getRecipe(id: string): Promise<Recipe | undefined>;
  createRecipe(recipe: InsertRecipe): Promise<Recipe>;
  updateRecipe(id: string, updates: Partial<Recipe>): Promise<Recipe>;

  // Expiration Notifications
  getExpirationNotifications(): Promise<ExpirationNotification[]>;
  createExpirationNotification(notification: InsertExpirationNotification): Promise<ExpirationNotification>;
  dismissNotification(id: string): Promise<void>;
  getExpiringItems(daysThreshold: number): Promise<FoodItem[]>;
}

export class DatabaseStorage implements IStorage {
  private initialized = false;

  private async ensureDefaultData() {
    if (this.initialized) return;
    
    // Check if storage locations exist
    const existingLocations = await db.select().from(storageLocations);
    
    if (existingLocations.length === 0) {
      // Initialize default storage locations
      const defaultLocations = [
        { name: "Fridge", icon: "refrigerator", itemCount: 0 },
        { name: "Freezer", icon: "snowflake", itemCount: 0 },
        { name: "Pantry", icon: "pizza", itemCount: 0 },
        { name: "Counter", icon: "utensils-crossed", itemCount: 0 },
      ];

      await db.insert(storageLocations).values(defaultLocations);

      // Initialize default appliances
      const defaultAppliances = [
        { name: "Oven", type: "cooking" },
        { name: "Stove", type: "cooking" },
        { name: "Microwave", type: "cooking" },
        { name: "Air Fryer", type: "cooking" },
      ];

      await db.insert(appliances).values(defaultAppliances);
    }
    
    this.initialized = true;
  }

  // Storage Locations
  async getStorageLocations(): Promise<StorageLocation[]> {
    await this.ensureDefaultData();
    
    // Get item counts dynamically
    const locations = await db.select().from(storageLocations);
    
    const locationsWithCounts = await Promise.all(
      locations.map(async (location) => {
        const [result] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(foodItems)
          .where(eq(foodItems.storageLocationId, location.id));
        
        return {
          ...location,
          itemCount: result?.count || 0
        };
      })
    );
    
    return locationsWithCounts;
  }

  async getStorageLocation(id: string): Promise<StorageLocation | undefined> {
    await this.ensureDefaultData();
    const [location] = await db.select().from(storageLocations).where(eq(storageLocations.id, id));
    return location || undefined;
  }

  async createStorageLocation(location: InsertStorageLocation): Promise<StorageLocation> {
    const [newLocation] = await db
      .insert(storageLocations)
      .values(location)
      .returning();
    return newLocation;
  }

  async updateStorageLocationCount(id: string, count: number): Promise<void> {
    await db
      .update(storageLocations)
      .set({ itemCount: count })
      .where(eq(storageLocations.id, id));
  }

  // Appliances
  async getAppliances(): Promise<Appliance[]> {
    await this.ensureDefaultData();
    return db.select().from(appliances);
  }

  async createAppliance(appliance: InsertAppliance): Promise<Appliance> {
    const [newAppliance] = await db
      .insert(appliances)
      .values(appliance)
      .returning();
    return newAppliance;
  }

  async deleteAppliance(id: string): Promise<void> {
    await db.delete(appliances).where(eq(appliances.id, id));
  }

  // Food Items
  async getFoodItems(storageLocationId?: string): Promise<FoodItem[]> {
    if (storageLocationId) {
      return db.select().from(foodItems).where(eq(foodItems.storageLocationId, storageLocationId));
    }
    return db.select().from(foodItems);
  }

  async getFoodItem(id: string): Promise<FoodItem | undefined> {
    const [item] = await db.select().from(foodItems).where(eq(foodItems.id, id));
    return item || undefined;
  }

  async createFoodItem(item: InsertFoodItem): Promise<FoodItem> {
    const [newItem] = await db
      .insert(foodItems)
      .values(item)
      .returning();
    return newItem;
  }

  async updateFoodItem(id: string, item: Partial<InsertFoodItem>): Promise<FoodItem> {
    const [updated] = await db
      .update(foodItems)
      .set(item)
      .where(eq(foodItems.id, id))
      .returning();
    
    if (!updated) {
      throw new Error("Food item not found");
    }
    
    return updated;
  }

  async deleteFoodItem(id: string): Promise<void> {
    await db.delete(foodItems).where(eq(foodItems.id, id));
  }

  // Chat Messages
  async getChatMessages(): Promise<ChatMessage[]> {
    return db.select().from(chatMessages).orderBy(chatMessages.timestamp);
  }

  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const [newMessage] = await db
      .insert(chatMessages)
      .values(message)
      .returning();
    return newMessage;
  }

  // Recipes
  async getRecipes(): Promise<Recipe[]> {
    return db.select().from(recipes).orderBy(sql`${recipes.createdAt} DESC`);
  }

  async getRecipe(id: string): Promise<Recipe | undefined> {
    const [recipe] = await db.select().from(recipes).where(eq(recipes.id, id));
    return recipe || undefined;
  }

  async createRecipe(recipe: InsertRecipe): Promise<Recipe> {
    const [newRecipe] = await db
      .insert(recipes)
      .values(recipe)
      .returning();
    return newRecipe;
  }

  async updateRecipe(id: string, updates: Partial<Recipe>): Promise<Recipe> {
    const [updated] = await db
      .update(recipes)
      .set(updates)
      .where(eq(recipes.id, id))
      .returning();
    
    if (!updated) {
      throw new Error("Recipe not found");
    }
    
    return updated;
  }

  // Expiration Notifications
  async getExpirationNotifications(): Promise<ExpirationNotification[]> {
    return db.select()
      .from(expirationNotifications)
      .where(eq(expirationNotifications.dismissed, false))
      .orderBy(expirationNotifications.daysUntilExpiry);
  }

  async createExpirationNotification(notification: InsertExpirationNotification): Promise<ExpirationNotification> {
    const [newNotification] = await db
      .insert(expirationNotifications)
      .values(notification)
      .returning();
    return newNotification;
  }

  async dismissNotification(id: string): Promise<void> {
    await db
      .update(expirationNotifications)
      .set({ dismissed: true })
      .where(eq(expirationNotifications.id, id));
  }

  async getExpiringItems(daysThreshold: number): Promise<FoodItem[]> {
    // Get items with expiration dates that are within the threshold
    const items = await db.select().from(foodItems);
    
    const expiringItems = items.filter(item => {
      if (!item.expirationDate) return false;
      
      const expiry = new Date(item.expirationDate);
      const now = new Date();
      const daysUntil = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      return daysUntil >= 0 && daysUntil <= daysThreshold;
    });
    
    return expiringItems;
  }
}

export const storage = new DatabaseStorage();
