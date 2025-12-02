/**
 * @file server/storage/interfaces/IInventoryStorage.ts
 * @description Interface for inventory management including food items, storage locations, and shopping lists
 *
 * This interface defines the contract for all inventory-related storage operations including:
 * - Food item CRUD with expiration tracking
 * - Storage location management
 * - Shopping list operations
 * - Integration with meal planning (adding recipe ingredients)
 */

import type {
  UserInventory,
  InsertUserInventory,
  UserStorage,
  InsertUserStorage,
  ShoppingItem,
  InsertShoppingItem,
} from "@shared/schema";

/**
 * Filter options for food item queries
 */
export type FoodItemFilter = "all" | "expiring" | "expired";

/**
 * Result type for expiring items query
 */
export interface ExpiringItemsResult {
  /** Items expiring within the specified time window */
  expiringSoon: UserInventory[];
  /** Items already past their expiration date */
  expired: UserInventory[];
}

/**
 * Result type for grouped shopping items
 */
export interface GroupedShoppingItemsResult {
  /** All shopping items for the user */
  items: ShoppingItem[];
  /** Items grouped by category */
  grouped: { [category: string]: ShoppingItem[] };
  /** Count of items per category */
  totals: { category: string; count: number }[];
}

/**
 * Inventory Storage Interface
 * Handles all inventory-related database operations
 */
export interface IInventoryStorage {
  // ============= Food Items =============

  /**
   * Get all food items for a user with optional filtering by status
   * @param userId - The user's UUID
   * @param filter - Optional filter: 'all', 'expiring' (within 7 days), or 'expired'
   * @returns Array of food items, ordered by creation date descending
   */
  getFoodItems(
    userId: string,
    filter?: FoodItemFilter,
  ): Promise<UserInventory[]>;

  /**
   * Get paginated food items for a user
   * @param userId - The user's UUID
   * @param limit - Maximum number of items to return
   * @param offset - Number of items to skip
   * @param filter - Optional filter: 'all', 'expiring', or 'expired'
   * @returns Object containing items array and total count
   */
  getFoodItemsPaginated(
    userId: string,
    limit: number,
    offset: number,
    filter?: FoodItemFilter,
  ): Promise<{ items: UserInventory[]; total: number }>;

  /**
   * Get a single food item by ID
   * @param userId - The user's UUID (for ownership verification)
   * @param id - The food item's UUID
   * @returns The food item or undefined if not found
   */
  getFoodItem(userId: string, id: string): Promise<UserInventory | undefined>;

  /**
   * Create a new food item in inventory
   * @param userId - The user's UUID
   * @param item - Food item data to insert
   * @returns The newly created food item
   */
  createFoodItem(
    userId: string,
    item: InsertUserInventory,
  ): Promise<UserInventory>;

  /**
   * Update an existing food item
   * @param userId - The user's UUID (for ownership verification)
   * @param id - The food item's UUID
   * @param updates - Partial food item data to update
   * @returns The updated food item or undefined if not found
   */
  updateFoodItem(
    userId: string,
    id: string,
    updates: Partial<UserInventory>,
  ): Promise<UserInventory | undefined>;

  /**
   * Delete a food item permanently
   * @param userId - The user's UUID (for ownership verification)
   * @param id - The food item's UUID
   */
  deleteFoodItem(userId: string, id: string): Promise<void>;

  /**
   * Get all unique food categories for a user's inventory
   * @param userId - The user's UUID
   * @returns Array of unique category names, sorted alphabetically
   */
  getFoodCategories(userId: string): Promise<string[]>;

  /**
   * Get items that are expiring soon or already expired
   * @param userId - The user's UUID
   * @param daysAhead - Number of days to look ahead (default: 7)
   * @returns Object containing expiringSoon and expired arrays
   */
  getExpiringItems(
    userId: string,
    daysAhead?: number,
  ): Promise<ExpiringItemsResult>;

  // ============= Storage Locations =============

  /**
   * Get all active storage locations for a user
   * Includes item count for each location
   * @param userId - The user's UUID
   * @returns Array of storage locations with item counts, ordered by sortOrder
   */
  getStorageLocations(userId: string): Promise<UserStorage[]>;

  /**
   * Get a single storage location by ID
   * @param userId - The user's UUID (for ownership verification)
   * @param id - The storage location's UUID
   * @returns The storage location or undefined if not found
   */
  getStorageLocation(
    userId: string,
    id: string,
  ): Promise<UserStorage | undefined>;

  /**
   * Create a new storage location
   * @param userId - The user's UUID
   * @param location - Storage location data (name, icon, etc.)
   * @returns The newly created storage location
   */
  createStorageLocation(
    userId: string,
    location: Omit<
      InsertUserStorage,
      "id" | "userId" | "createdAt" | "updatedAt"
    >,
  ): Promise<UserStorage>;

  /**
   * Update an existing storage location
   * @param userId - The user's UUID (for ownership verification)
   * @param id - The storage location's UUID
   * @param updates - Partial storage location data to update
   * @returns The updated storage location or undefined if not found
   * @throws Error if trying to unset a default location
   */
  updateStorageLocation(
    userId: string,
    id: string,
    updates: Partial<UserStorage>,
  ): Promise<UserStorage | undefined>;

  /**
   * Delete a storage location
   * @param userId - The user's UUID (for ownership verification)
   * @param id - The storage location's UUID
   * @throws Error if location is a default or contains items
   */
  deleteStorageLocation(userId: string, id: string): Promise<void>;

  // ============= Shopping List Operations =============

  /**
   * Get all shopping list items for a user
   * @param userId - The user's UUID
   * @returns Array of shopping items, ordered by purchased status and name
   */
  getShoppingItems(userId: string): Promise<ShoppingItem[]>;

  /**
   * Get shopping list items grouped by category
   * @param userId - The user's UUID
   * @returns Object containing items, grouped items by category, and category totals
   */
  getGroupedShoppingItems(userId: string): Promise<GroupedShoppingItemsResult>;

  /**
   * Create a new shopping list item
   * @param item - Shopping item data including userId
   * @returns The newly created shopping item
   */
  createShoppingItem(item: InsertShoppingItem): Promise<ShoppingItem>;

  /**
   * Update an existing shopping list item
   * @param userId - The user's UUID (for ownership verification)
   * @param id - The shopping item's UUID
   * @param updates - Partial shopping item data to update
   * @returns The updated shopping item or undefined if not found
   */
  updateShoppingItem(
    userId: string,
    id: string,
    updates: Partial<ShoppingItem>,
  ): Promise<ShoppingItem | undefined>;

  /**
   * Delete a shopping list item
   * @param userId - The user's UUID (for ownership verification)
   * @param id - The shopping item's UUID
   */
  deleteShoppingItem(userId: string, id: string): Promise<void>;

  /**
   * Clear all purchased (checked) items from the shopping list
   * @param userId - The user's UUID
   * @returns The number of items deleted
   */
  clearCheckedShoppingItems(userId: string): Promise<number>;

  /**
   * Add missing ingredients from a recipe to the shopping list
   * Skips ingredients that are already on the list
   * @param userId - The user's UUID
   * @param recipeId - The recipe's UUID
   * @param servings - Optional serving multiplier
   * @returns Object containing count of added and skipped items
   */
  addMissingIngredientsToShoppingList(
    userId: string,
    recipeId: string,
    servings?: number,
  ): Promise<{ added: number; skipped: number }>;
}
