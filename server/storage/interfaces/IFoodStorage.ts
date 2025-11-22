/**
 * @file server/storage/interfaces/IFoodStorage.ts
 * @description Interface for food inventory and nutrition storage operations
 */

import type {
  UserInventory,
  InsertUserInventory,
  UserStorage,
  CookingTerm,
  InsertCookingTerm,
} from "@shared/schema";
import type { PaginatedResponse } from "../../utils/pagination";
import type { StorageLocationWithCount } from "../domains/food.storage";

export interface IFoodStorage {
  // ==================== Food Inventory Methods ====================
  getFoodItems(
    userId: string,
    storageLocationId?: string,
    foodCategory?: string,
    limit?: number
  ): Promise<UserInventory[]>;

  getFoodItemsPaginated(
    userId: string,
    page?: number,
    limit?: number,
    storageLocationId?: string,
    foodCategory?: string,
    sortBy?: "name" | "expirationDate" | "createdAt"
  ): Promise<PaginatedResponse<UserInventory>>;

  getFoodItem(userId: string, id: string): Promise<UserInventory | null>;

  createFoodItem(
    userId: string,
    item: Omit<InsertUserInventory, "userId">
  ): Promise<UserInventory>;

  updateFoodItem(
    userId: string,
    id: string,
    item: Partial<Omit<InsertUserInventory, "userId">>
  ): Promise<UserInventory>;

  deleteFoodItem(userId: string, id: string): Promise<void>;

  getFoodCategories(userId: string): Promise<string[]>;

  // ==================== Storage Location Methods ====================
  getStorageLocations(userId: string): Promise<StorageLocationWithCount[]>;

  getStorageLocation(userId: string, id: string): Promise<UserStorage | null>;

  createStorageLocation(
    userId: string,
    location: { name: string; icon?: string }
  ): Promise<UserStorage>;

  updateStorageLocation(
    userId: string,
    id: string,
    updates: Partial<UserStorage>
  ): Promise<UserStorage>;

  deleteStorageLocation(userId: string, id: string): Promise<void>;

  // ==================== Cooking Terms Methods ====================
  getCookingTerms(): Promise<CookingTerm[]>;

  getCookingTerm(id: number): Promise<CookingTerm | null>;

  getCookingTermByTerm(term: string): Promise<CookingTerm | null>;

  getCookingTermsByCategory(category: string): Promise<CookingTerm[]>;

  createCookingTerm(term: InsertCookingTerm): Promise<CookingTerm>;

  updateCookingTerm(
    id: number,
    term: Partial<InsertCookingTerm>
  ): Promise<CookingTerm>;

  deleteCookingTerm(id: number): Promise<void>;

  searchCookingTerms(searchText: string): Promise<CookingTerm[]>;
}
