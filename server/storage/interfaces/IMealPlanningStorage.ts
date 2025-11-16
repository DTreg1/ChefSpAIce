/**
 * Meal Planning Storage Interface
 * Handles meal plans, shopping lists, and ingredient management
 */

import type {
  MealPlan,
  InsertMealPlan,
  ShoppingListItem,
  InsertShoppingListItem,
} from "@shared/schema";

export interface IMealPlanningStorage {
  // Meal Plans
  getMealPlans(
    userId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<MealPlan[]>;
  
  getMealPlan(userId: string, id: string): Promise<MealPlan | undefined>;
  
  createMealPlan(
    userId: string,
    mealPlan: InsertMealPlan,
  ): Promise<MealPlan>;
  
  updateMealPlan(
    userId: string,
    id: string,
    updates: Partial<Omit<InsertMealPlan, "userId">>,
  ): Promise<MealPlan | undefined>;
  
  deleteMealPlan(userId: string, id: string): Promise<void>;
  
  // Shopping Lists
  getShoppingListItems(
    userId: string,
    includeChecked?: boolean,
  ): Promise<ShoppingListItem[]>;
  
  getGroupedShoppingListItems(userId: string): Promise<{
    categories: Record<string, ShoppingListItem[]>;
    totalItems: number;
    checkedItems: number;
  }>;
  
  createShoppingListItem(
    userId: string,
    item: InsertShoppingListItem,
  ): Promise<ShoppingListItem>;
  
  updateShoppingListItem(
    userId: string,
    id: string,
    updates: Partial<Omit<InsertShoppingListItem, "userId">>,
  ): Promise<ShoppingListItem | undefined>;
  
  deleteShoppingListItem(userId: string, id: string): Promise<void>;
  
  clearCheckedShoppingListItems(userId: string): Promise<void>;
  
  addMissingIngredientsToShoppingList(
    userId: string,
    recipeId: string,
    servings?: number,
  ): Promise<{
    added: string[];
    existing: string[];
    inInventory: string[];
  }>;
}