/**
 * @file server/storage/domains/food.storage.ts
 * @description Food inventory and nutrition domain storage implementation
 * 
 * EXPORT PATTERN:
 * - Export CLASS (FoodStorage) for dependency injection and testing
 * - Export singleton INSTANCE (foodStorage) for convenience in production code
 * - Facades should instantiate their own instances OR use the shared singleton consistently
 */

import { db } from "../../db";
import { eq, and, desc, sql, ilike, or } from "drizzle-orm";
import {
  userInventory,
  userStorage,
  cookingTerms,
  applianceLibrary,
  userAppliances,
  type UserInventory,
  type InsertUserInventory,
  type UserStorage,
  type InsertUserStorage,
  type CookingTerm,
  type InsertCookingTerm,
  type ApplianceLibrary,
  type InsertApplianceLibrary,
  type UserAppliance,
  type InsertUserAppliance,
} from "@shared/schema";

import { PaginationHelper, PaginatedResponse } from "../../utils/pagination";
import type { IFoodStorage } from "../interfaces/IFoodStorage";

// Type for storage location with item count
export interface StorageLocationWithCount extends UserStorage {
  itemCount?: number;
}

export class FoodStorage implements IFoodStorage {
  // ==================== Food Inventory Methods ====================

  async getFoodItems(
    userId: string,
    storageLocationId?: string,
    foodCategory?: string,
    limit: number = 500,
  ): Promise<UserInventory[]> {
    const whereConditions = [eq(userInventory.userId, userId)];

    if (storageLocationId) {
      whereConditions.push(
        eq(userInventory.storageLocationId, storageLocationId),
      );
    }

    if (foodCategory) {
      whereConditions.push(eq(userInventory.foodCategory, foodCategory));
    }

    return await db
      .select()
      .from(userInventory)
      .where(and(...whereConditions))
      .orderBy(userInventory.expirationDate)
      .limit(limit);
  }

  async getFoodItemsPaginated(
    userId: string,
    page: number = 1,
    limit: number = 30,
    storageLocationId?: string,
    foodCategory?: string,
    sortBy: "name" | "expirationDate" | "createdAt" = "expirationDate",
  ): Promise<PaginatedResponse<UserInventory>> {
    const offset = (page - 1) * limit;

    // Build where clause
    const whereConditions = [eq(userInventory.userId, userId)];
    if (storageLocationId && storageLocationId !== "all") {
      whereConditions.push(
        eq(userInventory.storageLocationId, storageLocationId),
      );
    }
    if (foodCategory) {
      whereConditions.push(eq(userInventory.foodCategory, foodCategory));
    }

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(userInventory)
      .where(and(...whereConditions));

    const total = Number(countResult?.count || 0);

    // Determine sort order
    const orderClause =
      sortBy === "name"
        ? userInventory.name
        : sortBy === "createdAt"
          ? sql`${userInventory.createdAt} DESC`
          : userInventory.expirationDate;

    // Get paginated items
    const items = await db
      .select()
      .from(userInventory)
      .where(and(...whereConditions))
      .orderBy(orderClause)
      .limit(limit)
      .offset(offset);

    return PaginationHelper.createResponse(items, total, page, limit);
  }

  async getFoodItem(userId: string, id: string): Promise<UserInventory | null> {
    const [item] = await db
      .select()
      .from(userInventory)
      .where(and(eq(userInventory.id, id), eq(userInventory.userId, userId)));
    return item || null;
  }

  async createFoodItem(
    userId: string,
    item: Omit<InsertUserInventory, "userId">,
  ): Promise<UserInventory> {
    const [newItem] = await db
      .insert(userInventory)
      .values({ ...item, userId })
      .returning();
    return newItem;
  }

  async updateFoodItem(
    userId: string,
    id: string,
    item: Partial<Omit<InsertUserInventory, "userId">>,
  ): Promise<UserInventory> {
    const [updated] = await db
      .update(userInventory)
      .set({
        ...item,
        updatedAt: new Date(),
      })
      .where(and(eq(userInventory.id, id), eq(userInventory.userId, userId)))
      .returning();

    if (!updated) {
      throw new Error("Food item not found");
    }

    return updated;
  }

  async deleteFoodItem(userId: string, id: string): Promise<void> {
    await db
      .delete(userInventory)
      .where(and(eq(userInventory.id, id), eq(userInventory.userId, userId)));
  }

  async getFoodCategories(userId: string): Promise<string[]> {
    const results = await db.execute<{ food_category: string }>(
      sql`SELECT DISTINCT food_category 
          FROM user_inventory 
          WHERE user_id = ${userId} 
            AND food_category IS NOT NULL 
          ORDER BY food_category`,
    );

    return results.rows.map((r) => r.food_category);
  }

  // ==================== Storage Location Methods ====================

  async getStorageLocations(
    userId: string,
  ): Promise<StorageLocationWithCount[]> {
    // Get user's storage locations
    const locations = await db
      .select()
      .from(userStorage)
      .where(
        and(eq(userStorage.userId, userId), eq(userStorage.isActive, true)),
      )
      .orderBy(userStorage.sortOrder);

    // Get item counts for each location
    const items = await db
      .select({
        storageLocationId: userInventory.storageLocationId,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(userInventory)
      .where(eq(userInventory.userId, userId))
      .groupBy(userInventory.storageLocationId);

    const countMap = new Map(
      items.map((item) => [item.storageLocationId, item.count]),
    );

    // Add itemCount to each location
    return locations.map((loc) => ({
      ...loc,
      itemCount: countMap.get(loc.id) || 0,
    }));
  }

  async getStorageLocation(
    userId: string,
    id: string,
  ): Promise<UserStorage | null> {
    const [location] = await db
      .select()
      .from(userStorage)
      .where(
        and(
          eq(userStorage.userId, userId),
          eq(userStorage.id, id),
          eq(userStorage.isActive, true),
        ),
      );

    return location || null;
  }

  async createStorageLocation(
    userId: string,
    location: { name: string; icon?: string },
  ): Promise<UserStorage> {
    // Get current max sort order for this user
    const [maxSort] = await db
      .select({
        maxOrder: sql<number>`COALESCE(MAX(${userStorage.sortOrder}), 0)`,
      })
      .from(userStorage)
      .where(eq(userStorage.userId, userId));

    // Create new storage location
    const [newLocation] = await db
      .insert(userStorage)
      .values({
        userId,
        name: location.name,
        icon: location.icon || "package",
        isDefault: false,
        isActive: true,
        sortOrder: (maxSort?.maxOrder || 0) + 1,
      })
      .returning();

    return newLocation;
  }

  async updateStorageLocation(
    userId: string,
    id: string,
    updates: Partial<UserStorage>,
  ): Promise<UserStorage> {
    // Ensure the storage location exists and belongs to the user
    const [existing] = await db
      .select()
      .from(userStorage)
      .where(and(eq(userStorage.userId, userId), eq(userStorage.id, id)));

    if (!existing) {
      throw new Error("Storage location not found");
    }

    // Don't allow changing the default storage locations
    if (existing.isDefault && updates.isDefault === false) {
      throw new Error("Cannot unset default storage location");
    }

    // Update the storage location
    const [updated] = await db
      .update(userStorage)
      .set({
        ...updates,
        updatedAt: new Date(),
        userId: existing.userId, // Ensure userId cannot be changed
        id: existing.id, // Ensure id cannot be changed
      })
      .where(and(eq(userStorage.userId, userId), eq(userStorage.id, id)))
      .returning();

    return updated;
  }

  async deleteStorageLocation(userId: string, id: string): Promise<void> {
    // Check if the location exists and is not a default
    const [location] = await db
      .select()
      .from(userStorage)
      .where(and(eq(userStorage.userId, userId), eq(userStorage.id, id)));

    if (!location) {
      throw new Error("Storage location not found");
    }

    if (location.isDefault) {
      throw new Error("Cannot delete default storage locations");
    }

    // Check if there are items in this location
    const [itemCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(userInventory)
      .where(
        and(
          eq(userInventory.userId, userId),
          eq(userInventory.storageLocationId, id),
        ),
      );

    if (itemCount && Number(itemCount.count) > 0) {
      throw new Error(
        "Cannot delete storage location with items. Move or delete items first.",
      );
    }

    // Delete the storage location
    await db
      .delete(userStorage)
      .where(and(eq(userStorage.userId, userId), eq(userStorage.id, id)));
  }

  // ==================== Cooking Terms Methods ====================

  async getCookingTerms(): Promise<CookingTerm[]> {
    return await db.select().from(cookingTerms);
  }

  async getCookingTerm(id: number): Promise<CookingTerm | null> {
    const [term] = await db
      .select()
      .from(cookingTerms)
      .where(eq(cookingTerms.id, id));
    return term || null;
  }

  async getCookingTermByTerm(term: string): Promise<CookingTerm | null> {
    const [result] = await db
      .select()
      .from(cookingTerms)
      .where(eq(cookingTerms.term, term));
    return result || null;
  }

  async getCookingTermsByCategory(category: string): Promise<CookingTerm[]> {
    return await db
      .select()
      .from(cookingTerms)
      .where(eq(cookingTerms.category, category));
  }

  async createCookingTerm(term: InsertCookingTerm): Promise<CookingTerm> {
    // Ensure required fields are provided
    const termWithDefaults = {
      ...term,
      shortDefinition: term.shortDefinition || "",
      longDefinition: term.longDefinition || "",
    };
    const [result] = await db
      .insert(cookingTerms)
      .values(termWithDefaults)
      .returning();
    return result;
  }

  async updateCookingTerm(
    id: number,
    term: Partial<InsertCookingTerm>,
  ): Promise<CookingTerm> {
    const [result] = await db
      .update(cookingTerms)
      .set(term)
      .where(eq(cookingTerms.id, id))
      .returning();

    if (!result) {
      throw new Error("Cooking term not found");
    }
    return result;
  }

  async deleteCookingTerm(id: number): Promise<void> {
    await db.delete(cookingTerms).where(eq(cookingTerms.id, id));
  }

  async searchCookingTerms(searchText: string): Promise<CookingTerm[]> {
    const lowerSearch = searchText.toLowerCase();

    // Search in term, short/long definitions, and related terms array
    return await db
      .select()
      .from(cookingTerms)
      .where(
        sql`LOWER(${cookingTerms.term}) LIKE ${`%${lowerSearch}%`} 
             OR LOWER(${cookingTerms.shortDefinition}) LIKE ${`%${lowerSearch}%`}
             OR LOWER(${cookingTerms.longDefinition}) LIKE ${`%${lowerSearch}%`}
             OR EXISTS (
               SELECT 1 FROM unnest(${cookingTerms.relatedTerms}) AS related_term
               WHERE LOWER(related_term) LIKE ${`%${lowerSearch}%`}
             )`,
      );
  }

  // ==================== Appliance Library Methods ====================

  /**
   * Get all appliances from the master library
   */
  async getAppliances(): Promise<ApplianceLibrary[]> {
    return await db
      .select()
      .from(applianceLibrary)
      .orderBy(applianceLibrary.category, applianceLibrary.name);
  }

  /**
   * Get distinct appliance categories
   */
  async getApplianceCategories(): Promise<string[]> {
    const results = await db
      .selectDistinct({ category: applianceLibrary.category })
      .from(applianceLibrary)
      .orderBy(applianceLibrary.category);
    
    return results.map((r) => r.category);
  }

  /**
   * Alias for getAppliances - get all from appliance library
   */
  async getApplianceLibrary(): Promise<ApplianceLibrary[]> {
    return this.getAppliances();
  }

  /**
   * Get appliances from library filtered by category
   */
  async getApplianceLibraryByCategory(category: string): Promise<ApplianceLibrary[]> {
    return await db
      .select()
      .from(applianceLibrary)
      .where(eq(applianceLibrary.category, category))
      .orderBy(applianceLibrary.name);
  }

  /**
   * Search appliance library by name or description
   */
  async searchApplianceLibrary(query: string): Promise<ApplianceLibrary[]> {
    const searchPattern = `%${query}%`;
    return await db
      .select()
      .from(applianceLibrary)
      .where(
        or(
          ilike(applianceLibrary.name, searchPattern),
          ilike(applianceLibrary.description, searchPattern)
        )
      )
      .orderBy(applianceLibrary.name);
  }

  // ==================== User Appliance Methods ====================

  /**
   * User appliance with joined library data
   */
  async getUserAppliances(userId: string): Promise<(UserAppliance & { libraryAppliance?: ApplianceLibrary })[]> {
    const results = await db
      .select({
        userAppliance: userAppliances,
        libraryAppliance: applianceLibrary,
      })
      .from(userAppliances)
      .leftJoin(applianceLibrary, eq(userAppliances.applianceId, applianceLibrary.id))
      .where(eq(userAppliances.userId, userId))
      .orderBy(userAppliances.category, userAppliances.createdAt);

    return results.map((r) => ({
      ...r.userAppliance,
      libraryAppliance: r.libraryAppliance || undefined,
    }));
  }

  /**
   * Get user's appliances filtered by category
   */
  async getUserAppliancesByCategory(
    userId: string,
    category: string
  ): Promise<(UserAppliance & { libraryAppliance?: ApplianceLibrary })[]> {
    const results = await db
      .select({
        userAppliance: userAppliances,
        libraryAppliance: applianceLibrary,
      })
      .from(userAppliances)
      .leftJoin(applianceLibrary, eq(userAppliances.applianceId, applianceLibrary.id))
      .where(
        and(
          eq(userAppliances.userId, userId),
          eq(userAppliances.category, category)
        )
      )
      .orderBy(userAppliances.createdAt);

    return results.map((r) => ({
      ...r.userAppliance,
      libraryAppliance: r.libraryAppliance || undefined,
    }));
  }

  /**
   * Add a new appliance to the master library (admin)
   */
  async createAppliance(data: InsertApplianceLibrary): Promise<ApplianceLibrary> {
    const [created] = await db
      .insert(applianceLibrary)
      .values(data)
      .returning();
    
    return created;
  }

  /**
   * Update an appliance in the master library (admin)
   */
  async updateAppliance(
    id: string,
    data: Partial<InsertApplianceLibrary>
  ): Promise<ApplianceLibrary> {
    const [updated] = await db
      .update(applianceLibrary)
      .set(data)
      .where(eq(applianceLibrary.id, id))
      .returning();

    if (!updated) {
      throw new Error("Appliance not found");
    }

    return updated;
  }

  /**
   * Delete an appliance from the master library (admin)
   */
  async deleteAppliance(id: string): Promise<void> {
    await db
      .delete(applianceLibrary)
      .where(eq(applianceLibrary.id, id));
  }

  /**
   * Add an appliance to user's collection (link to library or custom)
   */
  async addUserAppliance(
    userId: string,
    data: Omit<InsertUserAppliance, "userId">
  ): Promise<UserAppliance> {
    const [created] = await db
      .insert(userAppliances)
      .values({
        ...data,
        userId,
      })
      .returning();

    return created;
  }

  /**
   * Update a user's appliance settings
   */
  async updateUserAppliance(
    userId: string,
    applianceId: string,
    data: Partial<Omit<InsertUserAppliance, "userId">>
  ): Promise<UserAppliance> {
    const [updated] = await db
      .update(userAppliances)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(userAppliances.id, applianceId),
          eq(userAppliances.userId, userId)
        )
      )
      .returning();

    if (!updated) {
      throw new Error("User appliance not found");
    }

    return updated;
  }

  /**
   * Remove an appliance from user's collection
   */
  async deleteUserAppliance(userId: string, applianceId: string): Promise<void> {
    await db
      .delete(userAppliances)
      .where(
        and(
          eq(userAppliances.id, applianceId),
          eq(userAppliances.userId, userId)
        )
      );
  }

  // ==================== Cache Methods (Stubs) ====================

  async getUSDACacheStats(): Promise<any> {
    console.warn("getUSDACacheStats: stub method called");
    return { size: 0, entries: [] };
  }

  async clearOldCache(_maxAge?: number): Promise<number> {
    console.warn("clearOldCache: stub method called");
    return 0;
  }
}

// Export singleton instance for convenience
export const foodStorage = new FoodStorage();
