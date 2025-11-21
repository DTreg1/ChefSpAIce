/**
 * @file server/storage/domains/food.storage.ts
 * @description Food inventory and nutrition domain storage implementation
 */

import { db } from "../../db";
import { eq, and, desc, sql } from "drizzle-orm";
import {
  userInventory,
  userStorage,
  cookingTerms,
  type UserInventory,
  type InsertUserInventory,
  type UserStorage,
  type InsertUserStorage,
  type CookingTerm,
  type InsertCookingTerm,
} from "@shared/schema";

import { PaginationHelper, PaginatedResponse } from "../../utils/pagination";

// Type for storage location with item count
export interface StorageLocationWithCount extends UserStorage {
  itemCount?: number;
}

export class FoodStorage {
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
}
