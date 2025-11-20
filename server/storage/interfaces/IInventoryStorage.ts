/**
 * Inventory Storage Interface
 * Handles food items, storage locations, and expiration tracking
 */

import type {
  UserInventory,
  InsertUserInventory,
  UserStorage,
  InsertUserStorage,
  ShoppingItem,
  InsertShoppingItem,
  onboardingInventory,
  InsertOnboardingInventory,
} from "@shared/schema";

export interface IInventoryStorage {
  // Food Items
  getFoodItems(
    userId: string,
    filter?: "all" | "expiring" | "expired",
  ): Promise<UserInventory[]>;
  
  getFoodItemsPaginated(
    userId: string,
    limit: number,
    offset: number,
    filter?: "all" | "expiring" | "expired",
  ): Promise<{ items: UserInventory[]; total: number }>;
  
  getFoodItem(userId: string, id: string): Promise<UserInventory | undefined>;
  
  createFoodItem(
    userId: string,
    item: InsertUserInventory,
  ): Promise<UserInventory>;
  
  updateFoodItem(
    userId: string,
    id: string,
    updates: Partial<UserInventory>,
  ): Promise<UserInventory | undefined>;
  
  deleteFoodItem(userId: string, id: string): Promise<void>;
  
  getFoodCategories(userId: string): Promise<string[]>;
  
  getExpiringItems(
    userId: string,
    daysAhead?: number,
  ): Promise<{
    expiringSoon: UserInventory[];
    expired: UserInventory[];
  }>;
  
  // Storage Locations
  getStorageLocations(userId: string): Promise<UserStorage[]>;
  
  getStorageLocation(
    userId: string,
    id: string,
  ): Promise<UserStorage | undefined>;
  
  createStorageLocation(
    userId: string,
    location: Omit<
      InsertUserStorage,
      "id" | "userId" | "createdAt" | "updatedAt"
    >,
  ): Promise<UserStorage>;
  
  updateStorageLocation(
    userId: string,
    id: string,
    updates: Partial<UserStorage>,
  ): Promise<UserStorage | undefined>;
  
  deleteStorageLocation(userId: string, id: string): Promise<void>;
  
  // Onboarding
  getOnboardingInventory(): Promise<typeof onboardingInventory.$inferSelect[]>;
  getOnboardingInventoryByName(name: string): Promise<typeof onboardingInventory.$inferSelect | undefined>;
  upsertOnboardingInventoryItem(item: InsertOnboardingInventory): Promise<typeof onboardingInventory.$inferSelect>;
  
  // Shopping List Operations
  getShoppingItems(userId: string): Promise<ShoppingItem[]>;
  getGroupedShoppingItems(userId: string): Promise<{
    items: ShoppingItem[];
    grouped: { [category: string]: ShoppingItem[] };
    totals: { category: string; count: number }[];
  }>;
  createShoppingItem(item: InsertShoppingItem): Promise<ShoppingItem>;
  updateShoppingItem(userId: string, id: string, updates: Partial<ShoppingItem>): Promise<ShoppingItem | undefined>;
  deleteShoppingItem(userId: string, id: string): Promise<void>;
  clearCheckedShoppingItems(userId: string): Promise<number>;
  
  // TODO: Move to IMealPlanningStorage to avoid interface conflict
  addMissingIngredientsToShoppingList(
    userId: string, 
    recipeId: string,
    servings?: number
  ): Promise<{ added: number; skipped: number }>;
}