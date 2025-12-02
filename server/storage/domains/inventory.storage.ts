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
 * 
 * EXPORT PATTERN:
 * - Export CLASS (InventoryDomainStorage) for dependency injection and testing
 * - Export singleton INSTANCE (inventoryStorage) for convenience in production code
 * - Facades should instantiate their own instances OR use the shared singleton consistently
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
import {
  StorageError,
  StorageNotFoundError,
  StorageValidationError,
  StorageConstraintError,
  wrapDatabaseError,
  type StorageErrorContext,
} from "../errors";

const DOMAIN = "inventory";

function createContext(operation: string, entityId?: string | number, entityType: string = "FoodItem"): StorageErrorContext {
  return { domain: DOMAIN, operation, entityId, entityType };
}

export class InventoryDomainStorage implements IInventoryStorage {
  private defaultInventoryInitialized = new Set<string>();

  private async ensureDefaultInventoryForUser(userId: string): Promise<void> {
    if (this.defaultInventoryInitialized.has(userId)) {
      return;
    }

    try {
      const existingLocations = await db
        .select()
        .from(userStorage)
        .where(eq(userStorage.userId, userId))
        .limit(1);

      if (existingLocations.length === 0) {
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
      console.error(`[${DOMAIN}] Failed to initialize default data for user ${userId}:`, error);
    }
  }

  // ============= Food Items =============

  async getFoodItems(
    userId: string,
    filter?: "all" | "expiring" | "expired",
  ): Promise<UserInventory[]> {
    const context = createContext("getFoodItems");
    context.additionalInfo = { userId, filter };
    try {
      await this.ensureDefaultInventoryForUser(userId);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];

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
      console.error(`[${DOMAIN}] Error getting food items for user ${userId}:`, error);
      throw wrapDatabaseError(error, context);
    }
  }

  async getFoodItemsPaginated(
    userId: string,
    limit: number,
    offset: number,
    filter?: "all" | "expiring" | "expired",
  ): Promise<{ items: UserInventory[]; total: number }> {
    const context = createContext("getFoodItemsPaginated");
    context.additionalInfo = { userId, limit, offset, filter };
    try {
      await this.ensureDefaultInventoryForUser(userId);

      let whereClause = eq(userInventory.userId, userId);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];

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

      const [countResult] = await db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(userInventory)
        .where(whereClause);

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
      console.error(`[${DOMAIN}] Error getting paginated food items for user ${userId}:`, error);
      throw wrapDatabaseError(error, context);
    }
  }

  async getFoodItem(
    userId: string,
    id: string,
  ): Promise<UserInventory | undefined> {
    const context = createContext("getFoodItem", id);
    try {
      const [item] = await db
        .select()
        .from(userInventory)
        .where(
          and(eq(userInventory.userId, userId), eq(userInventory.id, id)),
        );

      return item;
    } catch (error) {
      console.error(`[${DOMAIN}] Error getting food item ${id}:`, error);
      throw wrapDatabaseError(error, context);
    }
  }

  async createFoodItem(
    userId: string,
    item: InsertUserInventory,
  ): Promise<UserInventory> {
    const context = createContext("createFoodItem");
    context.additionalInfo = { userId, name: item.name };
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
      console.error(`[${DOMAIN}] Error creating food item:`, error);
      throw wrapDatabaseError(error, context);
    }
  }

  async updateFoodItem(
    userId: string,
    id: string,
    updates: Partial<UserInventory>,
  ): Promise<UserInventory | undefined> {
    const context = createContext("updateFoodItem", id);
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
      console.error(`[${DOMAIN}] Error updating food item ${id}:`, error);
      throw wrapDatabaseError(error, context);
    }
  }

  async deleteFoodItem(userId: string, id: string): Promise<void> {
    const context = createContext("deleteFoodItem", id);
    try {
      await db
        .delete(userInventory)
        .where(
          and(eq(userInventory.userId, userId), eq(userInventory.id, id)),
        );
    } catch (error) {
      console.error(`[${DOMAIN}] Error deleting food item ${id}:`, error);
      throw wrapDatabaseError(error, context);
    }
  }

  async getFoodCategories(userId: string): Promise<string[]> {
    const context = createContext("getFoodCategories");
    context.additionalInfo = { userId };
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
      console.error(`[${DOMAIN}] Error getting food categories for user ${userId}:`, error);
      throw wrapDatabaseError(error, context);
    }
  }

  async getExpiringItems(
    userId: string,
    daysAhead: number = 7,
  ): Promise<{
    expiringSoon: UserInventory[];
    expired: UserInventory[];
  }> {
    const context = createContext("getExpiringItems");
    context.additionalInfo = { userId, daysAhead };
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];

      const futureDate = new Date(today);
      futureDate.setDate(futureDate.getDate() + daysAhead);
      const futureDateStr = futureDate.toISOString().split('T')[0];

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
      console.error(`[${DOMAIN}] Error getting expiring items for user ${userId}:`, error);
      throw wrapDatabaseError(error, context);
    }
  }

  // ============= Storage Locations =============

  async getStorageLocations(userId: string): Promise<UserStorageType[]> {
    const context = createContext("getStorageLocations", undefined, "StorageLocation");
    context.additionalInfo = { userId };
    try {
      await this.ensureDefaultInventoryForUser(userId);

      const locations = await db
        .select()
        .from(userStorage)
        .where(
          and(eq(userStorage.userId, userId), eq(userStorage.isActive, true)),
        )
        .orderBy(userStorage.sortOrder);

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

      return locations.map((loc) => ({
        ...loc,
        itemCount: countMap.get(loc.id) || 0,
      }));
    } catch (error) {
      console.error(`[${DOMAIN}] Error getting storage locations for user ${userId}:`, error);
      throw wrapDatabaseError(error, context);
    }
  }

  async getStorageLocation(
    userId: string,
    id: string,
  ): Promise<UserStorageType | undefined> {
    const context = createContext("getStorageLocation", id, "StorageLocation");
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
      console.error(`[${DOMAIN}] Error getting storage location ${id}:`, error);
      throw wrapDatabaseError(error, context);
    }
  }

  async createStorageLocation(
    userId: string,
    location: Omit<
      InsertUserStorage,
      "id" | "userId" | "createdAt" | "updatedAt"
    >,
  ): Promise<UserStorageType> {
    const context = createContext("createStorageLocation", undefined, "StorageLocation");
    context.additionalInfo = { userId, name: location.name };
    try {
      const [user] = await db.select().from(users).where(eq(users.email, userId));
      if (!user) {
        throw new StorageNotFoundError(
          `User with ID ${userId} not found`,
          { domain: DOMAIN, operation: "createStorageLocation", entityId: userId, entityType: "User" }
        );
      }

      const [maxSort] = await db
        .select({
          maxOrder: sql<number>`COALESCE(MAX(${userStorage.sortOrder}), 0)`,
        })
        .from(userStorage)
        .where(eq(userStorage.userId, userId));

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
      console.error(`[${DOMAIN}] Error creating storage location:`, error);
      if (error instanceof StorageError) throw error;
      throw wrapDatabaseError(error, context);
    }
  }

  async updateStorageLocation(
    userId: string,
    id: string,
    updates: Partial<UserStorageType>,
  ): Promise<UserStorageType | undefined> {
    const context = createContext("updateStorageLocation", id, "StorageLocation");
    try {
      const [existing] = await db
        .select()
        .from(userStorage)
        .where(and(eq(userStorage.userId, userId), eq(userStorage.id, id)));

      if (!existing) {
        throw new StorageNotFoundError(
          `Storage location with ID ${id} not found`,
          context
        );
      }

      if (existing.isDefault && updates.isDefault === false) {
        throw new StorageValidationError(
          "Cannot unset default storage location",
          context,
          ["isDefault"]
        );
      }

      const [updated] = await db
        .update(userStorage)
        .set({
          ...updates,
          updatedAt: new Date(),
          userId: existing.userId,
          id: existing.id,
        })
        .where(and(eq(userStorage.userId, userId), eq(userStorage.id, id)))
        .returning();

      return updated;
    } catch (error) {
      console.error(`[${DOMAIN}] Error updating storage location ${id}:`, error);
      if (error instanceof StorageError) throw error;
      throw wrapDatabaseError(error, context);
    }
  }

  async deleteStorageLocation(userId: string, id: string): Promise<void> {
    const context = createContext("deleteStorageLocation", id, "StorageLocation");
    try {
      const [location] = await db
        .select()
        .from(userStorage)
        .where(and(eq(userStorage.userId, userId), eq(userStorage.id, id)));

      if (!location) {
        throw new StorageNotFoundError(
          `Storage location with ID ${id} not found`,
          context
        );
      }

      if (location.isDefault) {
        throw new StorageValidationError(
          "Cannot delete default storage locations",
          context,
          ["isDefault"]
        );
      }

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
        throw new StorageConstraintError(
          "Cannot delete storage location with items. Move or delete items first.",
          context,
          "foreign_key",
          undefined
        );
      }

      await db
        .delete(userStorage)
        .where(and(eq(userStorage.userId, userId), eq(userStorage.id, id)));
    } catch (error) {
      console.error(`[${DOMAIN}] Error deleting storage location ${id}:`, error);
      if (error instanceof StorageError) throw error;
      throw wrapDatabaseError(error, context);
    }
  }


  // ============= Shopping List Operations =============

  async getShoppingItems(userId: string): Promise<ShoppingItem[]> {
    const context = createContext("getShoppingItems", undefined, "ShoppingItem");
    context.additionalInfo = { userId };
    try {
      return await db
        .select()
        .from(userShopping)
        .where(eq(userShopping.userId, userId))
        .orderBy(asc(userShopping.isPurchased), asc(userShopping.name));
    } catch (error) {
      console.error(`[${DOMAIN}] Error getting shopping list items for user ${userId}:`, error);
      throw wrapDatabaseError(error, context);
    }
  }

  async getGroupedShoppingItems(userId: string): Promise<{
    items: ShoppingItem[];
    grouped: { [category: string]: ShoppingItem[] };
    totals: { category: string; count: number }[];
  }> {
    const context = createContext("getGroupedShoppingItems", undefined, "ShoppingItem");
    context.additionalInfo = { userId };
    try {
      const items = await this.getShoppingItems(userId);
      
      const grouped = items.reduce((acc, item) => {
        const category = item.category || 'Other';
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(item);
        return acc;
      }, {} as { [category: string]: ShoppingItem[] });
      
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
      console.error(`[${DOMAIN}] Error getting grouped shopping list items for user ${userId}:`, error);
      if (error instanceof StorageError) throw error;
      throw wrapDatabaseError(error, context);
    }
  }

  async createShoppingItem(item: InsertShoppingItem): Promise<ShoppingItem> {
    const context = createContext("createShoppingItem", undefined, "ShoppingItem");
    context.additionalInfo = { userId: item.userId, name: item.name };
    try {
      const [newItem] = await db
        .insert(userShopping)
        .values(item)
        .returning();
      return newItem;
    } catch (error) {
      console.error(`[${DOMAIN}] Error creating shopping list item:`, error);
      throw wrapDatabaseError(error, context);
    }
  }

  async updateShoppingItem(
    userId: string,
    id: string,
    updates: Partial<ShoppingItem>
  ): Promise<ShoppingItem | undefined> {
    const context = createContext("updateShoppingItem", id, "ShoppingItem");
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
      console.error(`[${DOMAIN}] Error updating shopping list item ${id}:`, error);
      throw wrapDatabaseError(error, context);
    }
  }

  async deleteShoppingItem(userId: string, id: string): Promise<void> {
    const context = createContext("deleteShoppingItem", id, "ShoppingItem");
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
      console.error(`[${DOMAIN}] Error deleting shopping list item ${id}:`, error);
      throw wrapDatabaseError(error, context);
    }
  }

  async clearCheckedShoppingItems(userId: string): Promise<number> {
    const context = createContext("clearCheckedShoppingItems", undefined, "ShoppingItem");
    context.additionalInfo = { userId };
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
      console.error(`[${DOMAIN}] Error clearing checked shopping list items for user ${userId}:`, error);
      throw wrapDatabaseError(error, context);
    }
  }

  async addMissingIngredientsToShoppingList(
    userId: string,
    recipeId: string,
    servings?: number
  ): Promise<{ added: number; skipped: number }> {
    const context = createContext("addMissingIngredientsToShoppingList", recipeId, "Recipe");
    context.additionalInfo = { userId, servings };
    try {
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
        throw new StorageNotFoundError(
          `Recipe with ID ${recipeId} not found`,
          context
        );
      }
      
      const ingredients = recipe.ingredients || [];
      const servingMultiplier = servings ? (servings / (recipe.servings || 1)) : 1;
      
      const existingItems = await this.getShoppingItems(userId);
      const existingNames = new Set(existingItems.map(item => item.name?.toLowerCase()));
      
      let added = 0;
      let skipped = 0;
      
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
      console.error(`[${DOMAIN}] Error adding ingredients to shopping list for recipe ${recipeId}:`, error);
      if (error instanceof StorageError) throw error;
      throw wrapDatabaseError(error, context);
    }
  }

}

export const inventoryStorage = new InventoryDomainStorage();
