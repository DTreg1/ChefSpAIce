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
  type InsertRecipe
} from "@shared/schema";
import { randomUUID } from "crypto";

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
  createRecipe(recipe: InsertRecipe): Promise<Recipe>;
}

export class MemStorage implements IStorage {
  private storageLocations: Map<string, StorageLocation>;
  private appliances: Map<string, Appliance>;
  private foodItems: Map<string, FoodItem>;
  private chatMessages: Map<string, ChatMessage>;
  private recipes: Map<string, Recipe>;

  constructor() {
    this.storageLocations = new Map();
    this.appliances = new Map();
    this.foodItems = new Map();
    this.chatMessages = new Map();
    this.recipes = new Map();

    // Initialize default storage locations
    this.initializeDefaultData();
  }

  private async initializeDefaultData() {
    const defaultLocations = [
      { name: "Fridge", icon: "refrigerator", itemCount: 0 },
      { name: "Freezer", icon: "snowflake", itemCount: 0 },
      { name: "Pantry", icon: "pizza", itemCount: 0 },
      { name: "Counter", icon: "utensils-crossed", itemCount: 0 },
    ];

    for (const loc of defaultLocations) {
      const id = randomUUID();
      this.storageLocations.set(id, { ...loc, id });
    }

    const defaultAppliances = [
      { name: "Oven", type: "cooking" },
      { name: "Stove", type: "cooking" },
      { name: "Microwave", type: "cooking" },
      { name: "Air Fryer", type: "cooking" },
    ];

    for (const app of defaultAppliances) {
      const id = randomUUID();
      this.appliances.set(id, { ...app, id });
    }
  }

  // Storage Locations
  async getStorageLocations(): Promise<StorageLocation[]> {
    return Array.from(this.storageLocations.values());
  }

  async getStorageLocation(id: string): Promise<StorageLocation | undefined> {
    return this.storageLocations.get(id);
  }

  async createStorageLocation(location: InsertStorageLocation): Promise<StorageLocation> {
    const id = randomUUID();
    const newLocation: StorageLocation = { ...location, id };
    this.storageLocations.set(id, newLocation);
    return newLocation;
  }

  async updateStorageLocationCount(id: string, count: number): Promise<void> {
    const location = this.storageLocations.get(id);
    if (location) {
      location.itemCount = count;
      this.storageLocations.set(id, location);
    }
  }

  // Appliances
  async getAppliances(): Promise<Appliance[]> {
    return Array.from(this.appliances.values());
  }

  async createAppliance(appliance: InsertAppliance): Promise<Appliance> {
    const id = randomUUID();
    const newAppliance: Appliance = { ...appliance, id };
    this.appliances.set(id, newAppliance);
    return newAppliance;
  }

  async deleteAppliance(id: string): Promise<void> {
    this.appliances.delete(id);
  }

  // Food Items
  async getFoodItems(storageLocationId?: string): Promise<FoodItem[]> {
    const items = Array.from(this.foodItems.values());
    if (storageLocationId) {
      return items.filter(item => item.storageLocationId === storageLocationId);
    }
    return items;
  }

  async getFoodItem(id: string): Promise<FoodItem | undefined> {
    return this.foodItems.get(id);
  }

  async createFoodItem(item: InsertFoodItem): Promise<FoodItem> {
    const id = randomUUID();
    const newItem: FoodItem = { 
      ...item, 
      id,
      addedAt: new Date()
    };
    this.foodItems.set(id, newItem);

    // Update storage location count
    const location = this.storageLocations.get(item.storageLocationId);
    if (location) {
      await this.updateStorageLocationCount(item.storageLocationId, location.itemCount + 1);
    }

    return newItem;
  }

  async updateFoodItem(id: string, item: Partial<InsertFoodItem>): Promise<FoodItem> {
    const existing = this.foodItems.get(id);
    if (!existing) {
      throw new Error("Food item not found");
    }

    const oldLocationId = existing.storageLocationId;
    const newLocationId = item.storageLocationId;

    const updated: FoodItem = { ...existing, ...item };
    this.foodItems.set(id, updated);

    // Update storage location counts if location changed
    if (newLocationId && oldLocationId !== newLocationId) {
      const oldLocation = this.storageLocations.get(oldLocationId);
      const newLocation = this.storageLocations.get(newLocationId);
      
      if (oldLocation) {
        await this.updateStorageLocationCount(oldLocationId, oldLocation.itemCount - 1);
      }
      if (newLocation) {
        await this.updateStorageLocationCount(newLocationId, newLocation.itemCount + 1);
      }
    }

    return updated;
  }

  async deleteFoodItem(id: string): Promise<void> {
    const item = this.foodItems.get(id);
    if (item) {
      this.foodItems.delete(id);
      
      // Update storage location count
      const location = this.storageLocations.get(item.storageLocationId);
      if (location) {
        await this.updateStorageLocationCount(item.storageLocationId, location.itemCount - 1);
      }
    }
  }

  // Chat Messages
  async getChatMessages(): Promise<ChatMessage[]> {
    return Array.from(this.chatMessages.values())
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const id = randomUUID();
    const newMessage: ChatMessage = {
      ...message,
      id,
      timestamp: new Date(),
    };
    this.chatMessages.set(id, newMessage);
    return newMessage;
  }

  // Recipes
  async getRecipes(): Promise<Recipe[]> {
    return Array.from(this.recipes.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async createRecipe(recipe: InsertRecipe): Promise<Recipe> {
    const id = randomUUID();
    const newRecipe: Recipe = {
      ...recipe,
      id,
      createdAt: new Date(),
    };
    this.recipes.set(id, newRecipe);
    return newRecipe;
  }
}

export const storage = new MemStorage();
