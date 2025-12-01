/**
 * @file server/storage/interfaces/IFoodStorage.ts
 * @description Interface for food inventory and nutrition storage operations
 * 
 * This interface defines the contract for food-related storage operations including:
 * - Food item management with filtering and pagination
 * - Storage location management with item counts
 * - Cooking terms glossary management
 * - Appliance library and user appliance management
 * - USDA cache management
 * 
 * Note: This interface overlaps with IInventoryStorage for food items.
 * FoodStorage provides additional features like pagination options and cooking terms.
 */

import type {
  UserInventory,
  InsertUserInventory,
  UserStorage,
  CookingTerm,
  InsertCookingTerm,
  ApplianceLibrary,
  InsertApplianceLibrary,
  UserAppliance,
  InsertUserAppliance,
} from "@shared/schema";
import type { PaginatedResponse } from "../../utils/pagination";
import type { StorageLocationWithCount } from "../domains/food.storage";

/** Re-export the canonical StorageLocationWithCount type from domain */
export type { StorageLocationWithCount };

/**
 * Sort options for paginated food queries
 */
export type FoodSortBy = "name" | "expirationDate" | "createdAt";

/**
 * Food Storage Interface
 * Handles food inventory and cooking terminology operations
 */
export interface IFoodStorage {
  // ==================== Food Inventory Methods ====================
  
  /**
   * Get food items for a user with optional filtering
   * @param userId - The user's UUID
   * @param storageLocationId - Optional filter by storage location
   * @param foodCategory - Optional filter by food category
   * @param limit - Maximum items to return (default: 500)
   * @returns Array of food items ordered by expiration date
   */
  getFoodItems(
    userId: string,
    storageLocationId?: string,
    foodCategory?: string,
    limit?: number
  ): Promise<UserInventory[]>;
  
  /**
   * Get paginated food items with filtering and sorting options
   * @param userId - The user's UUID
   * @param page - Page number (1-indexed, default: 1)
   * @param limit - Items per page (default: 30)
   * @param storageLocationId - Optional filter by storage location ('all' to skip)
   * @param foodCategory - Optional filter by food category
   * @param sortBy - Sort field (default: 'expirationDate')
   * @returns Paginated response with items, total count, and pagination metadata
   */
  getFoodItemsPaginated(
    userId: string,
    page?: number,
    limit?: number,
    storageLocationId?: string,
    foodCategory?: string,
    sortBy?: FoodSortBy
  ): Promise<PaginatedResponse<UserInventory>>;
  
  /**
   * Get a single food item by ID
   * @param userId - The user's UUID (for ownership verification)
   * @param id - The food item's UUID
   * @returns The food item or null if not found
   */
  getFoodItem(userId: string, id: string): Promise<UserInventory | null>;
  
  /**
   * Create a new food item
   * @param userId - The user's UUID
   * @param item - Food item data (userId will be set automatically)
   * @returns The newly created food item
   */
  createFoodItem(
    userId: string,
    item: Omit<InsertUserInventory, "userId">
  ): Promise<UserInventory>;
  
  /**
   * Update an existing food item
   * @param userId - The user's UUID (for ownership verification)
   * @param id - The food item's UUID
   * @param item - Partial food item data to update
   * @returns The updated food item
   * @throws Error if food item not found
   */
  updateFoodItem(
    userId: string,
    id: string,
    item: Partial<Omit<InsertUserInventory, "userId">>
  ): Promise<UserInventory>;
  
  /**
   * Delete a food item permanently
   * @param userId - The user's UUID (for ownership verification)
   * @param id - The food item's UUID
   */
  deleteFoodItem(userId: string, id: string): Promise<void>;
  
  /**
   * Get all unique food categories for a user
   * @param userId - The user's UUID
   * @returns Array of category names, sorted alphabetically
   */
  getFoodCategories(userId: string): Promise<string[]>;
  
  // ==================== Storage Location Methods ====================
  
  /**
   * Get all active storage locations for a user with item counts
   * @param userId - The user's UUID
   * @returns Array of storage locations with itemCount, ordered by sortOrder
   */
  getStorageLocations(userId: string): Promise<StorageLocationWithCount[]>;
  
  /**
   * Get a single storage location by ID
   * @param userId - The user's UUID (for ownership verification)
   * @param id - The storage location's UUID
   * @returns The storage location or null if not found
   */
  getStorageLocation(userId: string, id: string): Promise<UserStorage | null>;
  
  /**
   * Create a new storage location
   * Sort order is automatically assigned as max + 1
   * @param userId - The user's UUID
   * @param location - Storage location data (name required, icon optional)
   * @returns The newly created storage location
   */
  createStorageLocation(
    userId: string,
    location: { name: string; icon?: string }
  ): Promise<UserStorage>;
  
  /**
   * Update an existing storage location
   * @param userId - The user's UUID (for ownership verification)
   * @param id - The storage location's UUID
   * @param updates - Partial storage location data to update
   * @returns The updated storage location
   * @throws Error if location not found or trying to unset default
   */
  updateStorageLocation(
    userId: string,
    id: string,
    updates: Partial<UserStorage>
  ): Promise<UserStorage>;
  
  /**
   * Delete a storage location
   * @param userId - The user's UUID (for ownership verification)
   * @param id - The storage location's UUID
   * @throws Error if location is default or contains items
   */
  deleteStorageLocation(userId: string, id: string): Promise<void>;
  
  // ==================== Cooking Terms Methods ====================
  
  /**
   * Get all cooking terms from the glossary
   * @returns Array of all cooking terms
   */
  getCookingTerms(): Promise<CookingTerm[]>;
  
  /**
   * Get a single cooking term by ID
   * @param id - The cooking term's numeric ID
   * @returns The cooking term or null if not found
   */
  getCookingTerm(id: number): Promise<CookingTerm | null>;
  
  /**
   * Get a cooking term by its exact term name
   * @param term - The term to look up (e.g., 'julienne', 'blanch')
   * @returns The cooking term or null if not found
   */
  getCookingTermByTerm(term: string): Promise<CookingTerm | null>;
  
  /**
   * Get all cooking terms in a specific category
   * @param category - The category to filter by (e.g., 'techniques', 'equipment')
   * @returns Array of cooking terms in that category
   */
  getCookingTermsByCategory(category: string): Promise<CookingTerm[]>;
  
  /**
   * Create a new cooking term
   * @param term - Cooking term data to insert
   * @returns The newly created cooking term
   */
  createCookingTerm(term: InsertCookingTerm): Promise<CookingTerm>;
  
  /**
   * Update an existing cooking term
   * @param id - The cooking term's numeric ID
   * @param term - Partial cooking term data to update
   * @returns The updated cooking term
   * @throws Error if cooking term not found
   */
  updateCookingTerm(
    id: number,
    term: Partial<InsertCookingTerm>
  ): Promise<CookingTerm>;
  
  /**
   * Delete a cooking term
   * @param id - The cooking term's numeric ID
   */
  deleteCookingTerm(id: number): Promise<void>;
  
  /**
   * Search cooking terms by text
   * Searches in term name, definitions, and related terms
   * @param searchText - Text to search for (case-insensitive)
   * @returns Array of matching cooking terms
   */
  searchCookingTerms(searchText: string): Promise<CookingTerm[]>;

  // ==================== USDA Cache Methods ====================

  /**
   * Get statistics about the USDA cache
   * @returns Object with cache statistics including counts, dates, and size
   */
  getUSDACacheStats(): Promise<{
    totalEntries: number;
    expiredEntries: number;
    oldestEntry: Date | null;
    newestEntry: Date | null;
    totalSize: number;
  }>;

  /**
   * Clear cache entries older than the specified date
   * @param olderThan - Delete entries where createdAt < this date
   * @returns Number of entries deleted
   */
  clearOldCache(olderThan: Date): Promise<number>;

  // ==================== Appliance Library Methods ====================

  /**
   * Get all appliances from the master library
   * @returns Array of all appliances ordered by category and name
   */
  getAppliances(): Promise<ApplianceLibrary[]>;

  /**
   * Get distinct appliance categories
   * @returns Array of category names
   */
  getApplianceCategories(): Promise<string[]>;

  /**
   * Alias for getAppliances - get all from appliance library
   * @returns Array of all appliances
   */
  getApplianceLibrary(): Promise<ApplianceLibrary[]>;

  /**
   * Get appliances from library filtered by category
   * @param category - The category to filter by
   * @returns Array of appliances in that category
   */
  getApplianceLibraryByCategory(category: string): Promise<ApplianceLibrary[]>;

  /**
   * Search appliance library by name or description
   * @param query - Search text (case-insensitive)
   * @returns Array of matching appliances
   */
  searchApplianceLibrary(query: string): Promise<ApplianceLibrary[]>;

  /**
   * Add a new appliance to the master library (admin)
   * @param data - Appliance data to insert
   * @returns The newly created appliance
   */
  createAppliance(data: InsertApplianceLibrary): Promise<ApplianceLibrary>;

  /**
   * Update an appliance in the master library (admin)
   * @param id - The appliance's UUID
   * @param data - Partial appliance data to update
   * @returns The updated appliance
   * @throws Error if appliance not found
   */
  updateAppliance(id: string, data: Partial<InsertApplianceLibrary>): Promise<ApplianceLibrary>;

  /**
   * Delete an appliance from the master library (admin)
   * @param id - The appliance's UUID
   */
  deleteAppliance(id: string): Promise<void>;

  // ==================== User Appliance Methods ====================

  /**
   * Get user's appliances with joined library data
   * @param userId - The user's UUID
   * @returns Array of user appliances with optional library appliance data
   */
  getUserAppliances(userId: string): Promise<(UserAppliance & { libraryAppliance?: ApplianceLibrary })[]>;

  /**
   * Get user's appliances filtered by category
   * @param userId - The user's UUID
   * @param category - The category to filter by
   * @returns Array of user appliances in that category
   */
  getUserAppliancesByCategory(
    userId: string,
    category: string
  ): Promise<(UserAppliance & { libraryAppliance?: ApplianceLibrary })[]>;

  /**
   * Add an appliance to user's collection
   * @param userId - The user's UUID
   * @param data - User appliance data (can be linked to library or custom)
   * @returns The newly created user appliance
   */
  addUserAppliance(
    userId: string,
    data: Omit<InsertUserAppliance, "userId">
  ): Promise<UserAppliance>;

  /**
   * Update a user's appliance settings
   * @param userId - The user's UUID (for ownership verification)
   * @param applianceId - The user appliance's UUID
   * @param data - Partial appliance data to update
   * @returns The updated user appliance
   * @throws Error if user appliance not found
   */
  updateUserAppliance(
    userId: string,
    applianceId: string,
    data: Partial<Omit<InsertUserAppliance, "userId">>
  ): Promise<UserAppliance>;

  /**
   * Remove an appliance from user's collection
   * @param userId - The user's UUID (for ownership verification)
   * @param applianceId - The user appliance's UUID
   */
  deleteUserAppliance(userId: string, applianceId: string): Promise<void>;
}
