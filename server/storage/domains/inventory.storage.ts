/**
 * Inventory Domain Storage
 * 
 * Handles all inventory-related database operations including:
 * - Food items management
 * - Storage locations
 * - Expiration tracking
 * - Onboarding inventory
 * 
 * This module is extracted from the monolithic storage.ts as part of the
 * domain-driven refactoring to improve maintainability and testability.
 */

import { and, eq, gte, isNull, lte, or, sql, desc, asc, ilike } from "drizzle-orm";
import { createInsertData, createUpdateData, buildMetadata } from "../../types/storage-helpers";
import { db } from "../../db";
import {
  users,
  userInventory,
  userStorage,
  userShopping,
  userRecipes,
  type UserInventory,
  type InsertUserInventory,
  type UserStorage as UserStorageType,
  type InsertUserStorage,
  type ShoppingItem,
  type InsertShoppingItem,
} from "@shared/schema";
import type { IInventoryStorage } from "../interfaces/IInventoryStorage";

export class InventoryDomainStorage implements IInventoryStorage {
  private defaultInventoryInitialized = new Set<string>();

  /**
   * Ensures default storage locations exist for a user
   * Called automatically when accessing inventory data
   */
  private async ensureDefaultInventoryForUser(userId: string): Promise<void> {
    if (this.defaultInventoryInitialized.has(userId)) {
      return;
    }

    try {
      // Check if user has any storage locations
      const existingLocations = await db
        .select()
        .from(userStorage)
        .where(eq(userStorage.userId, userId))
        .limit(1);

      if (existingLocations.length === 0) {
        // Create default storage locations
        const defaultLocations = [
          { name: "Fridge", icon: "🧊", sortOrder: 1, isDefault: true },
          { name: "Pantry", icon: "🥫", sortOrder: 2, isDefault: true },
          { name: "Freezer", icon: "❄️", sortOrder: 3, isDefault: true },
        ];

        await db.insert(userStorage).values(
          defaultLocations.map((loc) => ({
            userId,
            name: loc.name,
            icon: loc.icon,
            isDefault: loc.isDefault,
            isActive: true,
            sortOrder: loc.sortOrder,
          })),
        );
      }

      this.defaultInventoryInitialized.add(userId);
    } catch (error) {
      console.error(`Failed to initialize default data for user ${userId}:`, error);
      // Don't throw - allow operation to continue even if defaults fail
    }
  }

  // ============= Food Items =============

  async getFoodItems(
    userId: string,
    filter?: "all" | "expiring" | "expired",
  ): Promise<UserInventory[]> {
    try {
      await this.ensureDefaultInventoryForUser(userId);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format

      let conditions;
      if (filter === "expiring") {
        const sevenDaysFromNow = new Date(today);
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
        const sevenDaysStr = sevenDaysFromNow.toISOString().split('T')[0];

        conditions = and(
          eq(userInventory.userId, userId),
          gte(userInventory.expirationDate, todayStr),
          lte(userInventory.expirationDate, sevenDaysStr),
        );
      } else if (filter === "expired") {
        conditions = and(
          eq(userInventory.userId, userId),
          lte(userInventory.expirationDate, todayStr),
        );
      } else {
        conditions = eq(userInventory.userId, userId);
      }

      const items = await db
        .select()
        .from(userInventory)
        .where(conditions)
        .orderBy(desc(userInventory.createdAt));

      return items;
    } catch (error) {
      console.error(`Error getting food items for user ${userId}:`, error);
      throw new Error("Failed to retrieve food items");
    }
  }

  async getFoodItemsPaginated(
    userId: string,
    limit: number,
    offset: number,
    filter?: "all" | "expiring" | "expired",
  ): Promise<{ items: UserInventory[]; total: number }> {
    try {
      await this.ensureDefaultInventoryForUser(userId);

      let whereClause = eq(userInventory.userId, userId);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format

      if (filter === "expiring") {
        const sevenDaysFromNow = new Date(today);
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
        const sevenDaysStr = sevenDaysFromNow.toISOString().split('T')[0];

        whereClause = and(
          eq(userInventory.userId, userId),
          gte(userInventory.expirationDate, todayStr),
          lte(userInventory.expirationDate, sevenDaysStr),
        ) as typeof whereClause;
      } else if (filter === "expired") {
        whereClause = and(
          eq(userInventory.userId, userId),
          lte(userInventory.expirationDate, todayStr),
        ) as typeof whereClause;
      }

      // Get total count
      const [countResult] = await db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(userInventory)
        .where(whereClause);

      // Get paginated items
      const items = await db
        .select()
        .from(userInventory)
        .where(whereClause)
        .orderBy(desc(userInventory.createdAt))
        .limit(limit)
        .offset(offset);

      return {
        items,
        total: countResult?.count || 0,
      };
    } catch (error) {
      console.error(`Error getting paginated food items for user ${userId}:`, error);
      throw new Error("Failed to retrieve paginated food items");
    }
  }

  async getFoodItem(
    userId: string,
    id: string,
  ): Promise<UserInventory | undefined> {
    try {
      const [item] = await db
        .select()
        .from(userInventory)
        .where(
          and(eq(userInventory.userId, userId), eq(userInventory.id, id)),
        );

      return item;
    } catch (error) {
      console.error(`Error getting food item ${id}:`, error);
      throw new Error("Failed to retrieve food item");
    }
  }

  async createFoodItem(
    userId: string,
    item: InsertUserInventory,
  ): Promise<UserInventory> {
    try {
      await this.ensureDefaultInventoryForUser(userId);

      const [newItem] = await db
        .insert(userInventory)
        .values({
          ...item,
          userId,
        })
        .returning();

      return newItem;
    } catch (error) {
      console.error("Error creating food item:", error);
      throw new Error("Failed to create food item");
    }
  }

  async updateFoodItem(
    userId: string,
    id: string,
    updates: Partial<UserInventory>,
  ): Promise<UserInventory | undefined> {
    try {
      const [updated] = await db
        .update(userInventory)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(
          and(eq(userInventory.userId, userId), eq(userInventory.id, id)),
        )
        .returning();

      return updated;
    } catch (error) {
      console.error(`Error updating food item ${id}:`, error);
      throw new Error("Failed to update food item");
    }
  }

  async deleteFoodItem(userId: string, id: string): Promise<void> {
    try {
      await db
        .delete(userInventory)
        .where(
          and(eq(userInventory.userId, userId), eq(userInventory.id, id)),
        );
    } catch (error) {
      console.error(`Error deleting food item ${id}:`, error);
      throw new Error("Failed to delete food item");
    }
  }

  async getFoodCategories(userId: string): Promise<string[]> {
    try {
      const categories = await db
        .selectDistinct({ category: userInventory.foodCategory })
        .from(userInventory)
        .where(eq(userInventory.userId, userId));

      return categories
        .map((c) => c.category)
        .filter((c): c is string => c !== null && c !== undefined)
        .sort();
    } catch (error) {
      console.error(`Error getting food categories for user ${userId}:`, error);
      throw new Error("Failed to retrieve food categories");
    }
  }

  async getExpiringItems(
    userId: string,
    daysAhead: number = 7,
  ): Promise<{
    expiringSoon: UserInventory[];
    expired: UserInventory[];
  }> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];

      const futureDate = new Date(today);
      futureDate.setDate(futureDate.getDate() + daysAhead);
      const futureDateStr = futureDate.toISOString().split('T')[0];

      // Get items expiring soon
      const expiringSoon = await db
        .select()
        .from(userInventory)
        .where(
          and(
            eq(userInventory.userId, userId),
            gte(userInventory.expirationDate, todayStr),
            lte(userInventory.expirationDate, futureDateStr),
          ),
        )
        .orderBy(asc(userInventory.expirationDate));

      // Get expired items
      const expired = await db
        .select()
        .from(userInventory)
        .where(
          and(
            eq(userInventory.userId, userId),
            lte(userInventory.expirationDate, todayStr),
          ),
        )
        .orderBy(desc(userInventory.expirationDate));

      return {
        expiringSoon,
        expired,
      };
    } catch (error) {
      console.error(`Error getting expiring items for user ${userId}:`, error);
      throw new Error("Failed to retrieve expiring items");
    }
  }

  // ============= Storage Locations =============

  async getStorageLocations(userId: string): Promise<UserStorageType[]> {
    try {
      await this.ensureDefaultInventoryForUser(userId);

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
    } catch (error) {
      console.error(`Error getting storage locations for user ${userId}:`, error);
      throw new Error("Failed to retrieve storage locations");
    }
  }

  async getStorageLocation(
    userId: string,
    id: string,
  ): Promise<UserStorageType | undefined> {
    try {
      await this.ensureDefaultInventoryForUser(userId);

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

      return location;
    } catch (error) {
      console.error(`Error getting storage location ${id}:`, error);
      throw new Error("Failed to retrieve storage location");
    }
  }

  async createStorageLocation(
    userId: string,
    location: Omit<
      InsertUserStorage,
      "id" | "userId" | "createdAt" | "updatedAt"
    >,
  ): Promise<UserStorageType> {
    try {
      // Check if user exists
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user) {
        throw new Error("User not found");
      }

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
    } catch (error) {
      console.error("Error creating storage location:", error);
      throw new Error("Failed to create storage location");
    }
  }

  async updateStorageLocation(
    userId: string,
    id: string,
    updates: Partial<UserStorageType>,
  ): Promise<UserStorageType | undefined> {
    try {
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
    } catch (error) {
      console.error(`Error updating storage location ${id}:`, error);
      throw new Error("Failed to update storage location");
    }
  }

  async deleteStorageLocation(userId: string, id: string): Promise<void> {
    try {
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
    } catch (error) {
      console.error(`Error deleting storage location ${id}:`, error);
      throw new Error(
        (error as Error).message || "Failed to delete storage location",
      );
    }
  }


  // ============= Shopping List Operations =============

  async getShoppingItems(userId: string): Promise<ShoppingItem[]> {
    try {
      return await db
        .select()
        .from(userShopping)
        .where(eq(userShopping.userId, userId))
        .orderBy(asc(userShopping.isPurchased), asc(userShopping.name));
    } catch (error) {
      console.error(`Error getting shopping list items for user ${userId}:`, error);
      throw new Error("Failed to retrieve shopping list items");
    }
  }

  async getGroupedShoppingItems(userId: string): Promise<{
    items: ShoppingItem[];
    grouped: { [category: string]: ShoppingItem[] };
    totals: { category: string; count: number }[];
  }> {
    try {
      const items = await this.getShoppingItems(userId);
      
      // Group items by category
      const grouped = items.reduce((acc, item) => {
        const category = item.category || 'Other';
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(item);
        return acc;
      }, {} as { [category: string]: ShoppingItem[] });
      
      // Calculate totals for each category
      const totals = Object.entries(grouped).map(([category, categoryItems]) => ({
        category,
        count: categoryItems.length
      }));
      
      return {
        items,
        grouped,
        totals
      };
    } catch (error) {
      console.error(`Error getting grouped shopping list items for user ${userId}:`, error);
      throw new Error("Failed to retrieve grouped shopping list items");
    }
  }

  async createShoppingItem(item: InsertShoppingItem): Promise<ShoppingItem> {
    try {
      const [newItem] = await db
        .insert(userShopping)
        .values(item)
        .returning();
      return newItem;
    } catch (error) {
      console.error("Error creating shopping list item:", error);
      throw new Error("Failed to create shopping list item");
    }
  }

  async updateShoppingItem(
    userId: string,
    id: string,
    updates: Partial<ShoppingItem>
  ): Promise<ShoppingItem | undefined> {
    try {
      const { id: _id, userId: _userId, ...safeUpdates } = updates;
      
      const [updated] = await db
        .update(userShopping)
        .set(safeUpdates)
        .where(
          and(
            eq(userShopping.id, id),
            eq(userShopping.userId, userId)
          )
        )
        .returning();
      
      return updated;
    } catch (error) {
      console.error(`Error updating shopping list item ${id}:`, error);
      throw new Error("Failed to update shopping list item");
    }
  }

  async deleteShoppingItem(userId: string, id: string): Promise<void> {
    try {
      await db
        .delete(userShopping)
        .where(
          and(
            eq(userShopping.id, id),
            eq(userShopping.userId, userId)
          )
        );
    } catch (error) {
      console.error(`Error deleting shopping list item ${id}:`, error);
      throw new Error("Failed to delete shopping list item");
    }
  }

  async clearCheckedShoppingItems(userId: string): Promise<number> {
    try {
      const itemsToDelete = await db
        .select()
        .from(userShopping)
        .where(
          and(
            eq(userShopping.userId, userId),
            eq(userShopping.isPurchased, true)
          )
        );
      
      if (itemsToDelete.length > 0) {
        await db
          .delete(userShopping)
          .where(
            and(
              eq(userShopping.userId, userId),
              eq(userShopping.isPurchased, true)
            )
          );
      }
      
      return itemsToDelete.length;
    } catch (error) {
      console.error(`Error clearing checked shopping list items for user ${userId}:`, error);
      throw new Error("Failed to clear checked shopping list items");
    }
  }

  // TODO: Move to meal planning domain to resolve interface conflict
  async addMissingIngredientsToShoppingList(
    userId: string,
    recipeId: string,
    servings?: number
  ): Promise<{ added: number; skipped: number }> {
    try {
      // Get the recipe
      const [recipe] = await db
        .select()
        .from(userRecipes)
        .where(
          and(
            eq(userRecipes.id, recipeId),
            eq(userRecipes.userId, userId)
          )
        );
      
      if (!recipe) {
        throw new Error("Recipe not found");
      }
      
      const ingredients = recipe.ingredients || [];
      const servingMultiplier = servings ? (servings / (recipe.servings || 1)) : 1;
      
      // Get existing shopping list items
      const existingItems = await this.getShoppingItems(userId);
      const existingNames = new Set(existingItems.map(item => item.name?.toLowerCase()));
      
      let added = 0;
      let skipped = 0;
      
      // Add missing ingredients
      for (const ingredient of ingredients) {
        const ingredientName = ingredient.toLowerCase();
        
        if (existingNames.has(ingredientName)) {
          skipped++;
        } else {
          await this.createShoppingItem({
            userId,
            name: ingredient,
            quantity: servingMultiplier.toString(),
            category: 'Ingredients',
            isPurchased: false,
            notes: `From recipe: ${recipe.title}`
          });
          added++;
        }
      }
      
      return { added, skipped };
    } catch (error) {
      console.error(`Error adding ingredients to shopping list for recipe ${recipeId}:`, error);
      throw new Error("Failed to add ingredients to shopping list");
    }
  }

}

// Export singleton instance
export const inventoryStorage = new InventoryDomainStorage();