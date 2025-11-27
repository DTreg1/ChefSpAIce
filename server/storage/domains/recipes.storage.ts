/**
 * Recipes Domain Storage
 * Implements IRecipesStorage interface for recipe and meal planning operations
 * 
 * EXPORT PATTERN:
 * - Export CLASS (RecipesDomainStorage) for dependency injection and testing
 * - Export singleton INSTANCE (recipesStorage) for convenience in production code
 * - Facades should instantiate their own instances OR use the shared singleton consistently
 */

import { db } from "../../db";
import {
  userRecipes,
  mealPlans,
  userInventory,
  Recipe,
  InsertRecipe,
  MealPlan,
  InsertMealPlan,
} from "@shared/schema";
import {
  eq,
  and,
  or,
  sql,
  desc,
  asc,
  ilike,
  inArray,
  gte,
  lte,
} from "drizzle-orm";
import type { IRecipesStorage } from "../interfaces/IRecipesStorage";
import {
  StorageError,
  StorageNotFoundError,
  StorageValidationError,
  StorageConstraintError,
  wrapDatabaseError,
  type StorageErrorContext,
} from "../errors";

const DOMAIN = "recipes";

function createContext(operation: string, entityId?: string | number, entityType: string = "Recipe"): StorageErrorContext {
  return { domain: DOMAIN, operation, entityId, entityType };
}

export class RecipesDomainStorage implements IRecipesStorage {
  // ============= Recipe Management =============
  
  async getRecipes(
    userId: string,
    filter?: {
      isFavorite?: boolean;
      source?: string;
      category?: string;
      cuisine?: string;
      difficulty?: string;
    }
  ): Promise<Recipe[]> {
    const context = createContext("getRecipes");
    context.additionalInfo = { userId, filter };
    try {
      let conditions;
      
      if (filter) {
        const filterConditions = [];
        filterConditions.push(eq(userRecipes.userId, userId));
        
        if (filter.isFavorite !== undefined) {
          filterConditions.push(eq(userRecipes.isFavorite, filter.isFavorite));
        }
        if (filter.source) {
          filterConditions.push(eq(userRecipes.source, filter.source));
        }
        if (filter.category) {
          filterConditions.push(eq(userRecipes.category, filter.category));
        }
        if (filter.cuisine) {
          filterConditions.push(eq(userRecipes.cuisine, filter.cuisine));
        }
        if (filter.difficulty) {
          filterConditions.push(eq(userRecipes.difficulty, filter.difficulty));
        }
        
        conditions = and(...filterConditions);
      } else {
        conditions = eq(userRecipes.userId, userId);
      }
      
      const rows = await db
        .select()
        .from(userRecipes)
        .where(conditions!)
        .orderBy(desc(userRecipes.createdAt));
      
      return rows.map(row => ({
        ...row,
        createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
        updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt
      })) as Recipe[];
    } catch (error) {
      console.error(`[${DOMAIN}] Error getting recipes for user ${userId}:`, error);
      throw wrapDatabaseError(error, context);
    }
  }
  
  async getRecipesPaginated(
    userId: string,
    limit: number,
    offset: number,
    filter?: {
      isFavorite?: boolean;
      source?: string;
      category?: string;
      cuisine?: string;
      difficulty?: string;
    }
  ): Promise<{ recipes: Recipe[]; total: number }> {
    const context = createContext("getRecipesPaginated");
    context.additionalInfo = { userId, limit, offset, filter };
    try {
      let conditions;
      
      if (filter) {
        const filterConditions = [];
        filterConditions.push(eq(userRecipes.userId, userId));
        
        if (filter.isFavorite !== undefined) {
          filterConditions.push(eq(userRecipes.isFavorite, filter.isFavorite));
        }
        if (filter.source) {
          filterConditions.push(eq(userRecipes.source, filter.source));
        }
        if (filter.category) {
          filterConditions.push(eq(userRecipes.category, filter.category));
        }
        if (filter.cuisine) {
          filterConditions.push(eq(userRecipes.cuisine, filter.cuisine));
        }
        if (filter.difficulty) {
          filterConditions.push(eq(userRecipes.difficulty, filter.difficulty));
        }
        
        conditions = and(...filterConditions);
      } else {
        conditions = eq(userRecipes.userId, userId);
      }
      
      const [countResult] = await db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(userRecipes)
        .where(conditions);
      
      const recipes = await db
        .select()
        .from(userRecipes)
        .where(conditions)
        .orderBy(desc(userRecipes.createdAt))
        .limit(limit)
        .offset(offset);
      
      return {
        recipes,
        total: countResult.count,
      };
    } catch (error) {
      console.error(`[${DOMAIN}] Error getting paginated recipes for user ${userId}:`, error);
      throw wrapDatabaseError(error, context);
    }
  }
  
  async getRecipe(userId: string, id: string): Promise<Recipe | undefined> {
    const context = createContext("getRecipe", id);
    try {
      const [recipe] = await db
        .select()
        .from(userRecipes)
        .where(
          and(
            eq(userRecipes.id, id),
            eq(userRecipes.userId, userId)
          )
        );
      return recipe;
    } catch (error) {
      console.error(`[${DOMAIN}] Error getting recipe ${id} for user ${userId}:`, error);
      throw wrapDatabaseError(error, context);
    }
  }
  
  async searchRecipes(userId: string, query: string): Promise<Recipe[]> {
    const context = createContext("searchRecipes");
    context.additionalInfo = { userId, query };
    try {
      const searchTerm = `%${query}%`;
      
      return await db
        .select()
        .from(userRecipes)
        .where(
          and(
            eq(userRecipes.userId, userId),
            or(
              ilike(userRecipes.title, searchTerm),
              ilike(userRecipes.description, searchTerm),
              ilike(userRecipes.cuisine, searchTerm),
              ilike(userRecipes.category, searchTerm)
            )
          )
        )
        .orderBy(desc(userRecipes.createdAt));
    } catch (error) {
      console.error(`[${DOMAIN}] Error searching recipes for user ${userId}:`, error);
      throw wrapDatabaseError(error, context);
    }
  }
  
  async searchRecipesByIngredients(userId: string, ingredients: string[]): Promise<Recipe[]> {
    const context = createContext("searchRecipesByIngredients");
    context.additionalInfo = { userId, ingredientCount: ingredients.length };
    try {
      if (!ingredients || ingredients.length === 0) {
        return [];
      }
      
      const ingredientConditions = ingredients.map(ingredient => 
        sql`EXISTS (
          SELECT 1 FROM jsonb_array_elements_text(${userRecipes.ingredients}) AS ing
          WHERE LOWER(ing) LIKE ${'%' + ingredient.toLowerCase() + '%'}
        )`
      );
      
      const rows = await db
        .select({
          recipe: userRecipes,
          matchCount: sql<number>`(
            SELECT COUNT(DISTINCT search_ing.value)
            FROM jsonb_array_elements_text(${userRecipes.ingredients}) AS recipe_ing,
                 jsonb_array_elements_text(${JSON.stringify(ingredients)}::jsonb) AS search_ing
            WHERE LOWER(recipe_ing) LIKE '%' || LOWER(search_ing.value) || '%'
          )`.as('match_count')
        })
        .from(userRecipes)
        .where(and(
          eq(userRecipes.userId, userId),
          or(...ingredientConditions)
        ))
        .orderBy(desc(sql`match_count`), desc(userRecipes.createdAt));
      
      return rows.map(({ recipe }) => ({
        ...recipe,
        createdAt: recipe.createdAt instanceof Date ? recipe.createdAt.toISOString() : recipe.createdAt,
        updatedAt: recipe.updatedAt instanceof Date ? recipe.updatedAt.toISOString() : recipe.updatedAt
      })) as Recipe[];
    } catch (error) {
      console.error(`[${DOMAIN}] Error searching recipes by ingredients for user ${userId}:`, error);
      throw wrapDatabaseError(error, context);
    }
  }
  
  async createRecipe(userId: string, recipe: InsertRecipe): Promise<Recipe> {
    const context = createContext("createRecipe");
    context.additionalInfo = { userId, title: recipe.title };
    try {
      const [newRecipe] = await db
        .insert(userRecipes)
        .values({
          ...recipe,
          userId,
        })
        .returning();
      
      return newRecipe;
    } catch (error) {
      console.error(`[${DOMAIN}] Error creating recipe for user ${userId}:`, error);
      const originalError = error instanceof Error ? error : new Error(String(error));
      
      if (originalError.message.includes("unique") || originalError.message.includes("duplicate")) {
        throw new StorageConstraintError(
          "A recipe with this title already exists",
          context,
          "unique",
          undefined,
          originalError
        );
      }
      throw wrapDatabaseError(error, context);
    }
  }
  
  async updateRecipe(
    userId: string,
    id: string,
    updates: Partial<Recipe>
  ): Promise<Recipe | undefined> {
    const context = createContext("updateRecipe", id);
    try {
      const { id: _id, userId: _userId, createdAt, ...safeUpdates } = updates;
      
      const [updatedRecipe] = await db
        .update(userRecipes)
        .set({
          ...safeUpdates,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(userRecipes.id, id),
            eq(userRecipes.userId, userId)
          )
        )
        .returning();
      
      return updatedRecipe;
    } catch (error) {
      console.error(`[${DOMAIN}] Error updating recipe ${id} for user ${userId}:`, error);
      throw wrapDatabaseError(error, context);
    }
  }
  
  async deleteRecipe(userId: string, id: string): Promise<void> {
    const context = createContext("deleteRecipe", id);
    try {
      await db
        .delete(userRecipes)
        .where(
          and(
            eq(userRecipes.id, id),
            eq(userRecipes.userId, userId)
          )
        );
    } catch (error) {
      console.error(`[${DOMAIN}] Error deleting recipe ${id} for user ${userId}:`, error);
      throw wrapDatabaseError(error, context);
    }
  }
  
  async toggleRecipeFavorite(userId: string, id: string): Promise<Recipe | undefined> {
    const context = createContext("toggleRecipeFavorite", id);
    try {
      const recipe = await this.getRecipe(userId, id);
      if (!recipe) return undefined;
      
      return await this.updateRecipe(userId, id, {
        isFavorite: !recipe.isFavorite,
      });
    } catch (error) {
      console.error(`[${DOMAIN}] Error toggling favorite for recipe ${id}:`, error);
      if (error instanceof StorageError) throw error;
      throw wrapDatabaseError(error, context);
    }
  }
  
  async rateRecipe(userId: string, id: string, rating: number): Promise<Recipe | undefined> {
    const context = createContext("rateRecipe", id);
    try {
      if (rating < 1 || rating > 5) {
        throw new StorageValidationError(
          "Rating must be between 1 and 5",
          context,
          ["rating"]
        );
      }
      
      return await this.updateRecipe(userId, id, { rating });
    } catch (error) {
      console.error(`[${DOMAIN}] Error rating recipe ${id}:`, error);
      if (error instanceof StorageError) throw error;
      throw wrapDatabaseError(error, context);
    }
  }
  
  // ============= Recipe Duplication Detection =============
  
  async findSimilarRecipes(
    userId: string,
    title: string,
    ingredients: string[]
  ): Promise<Recipe[]> {
    const context = createContext("findSimilarRecipes");
    context.additionalInfo = { userId, title };
    try {
      const allRecipes = await this.getRecipes(userId);
      
      return allRecipes.filter((recipe) => {
        const titleSimilarity = recipe.title.toLowerCase().includes(title.toLowerCase()) ||
                               title.toLowerCase().includes(recipe.title.toLowerCase());
        
        if (titleSimilarity) return true;
        
        const recipeIngredients = recipe.ingredients || [];
        const matchingIngredients = ingredients.filter((ing) =>
          recipeIngredients.some((rIng) =>
            rIng.toLowerCase().includes(ing.toLowerCase()) ||
            ing.toLowerCase().includes(rIng.toLowerCase())
          )
        );
        
        const overlapPercentage = matchingIngredients.length / Math.max(ingredients.length, recipeIngredients.length);
        
        return overlapPercentage >= 0.7;
      });
    } catch (error) {
      console.error(`[${DOMAIN}] Error finding similar recipes for user ${userId}:`, error);
      if (error instanceof StorageError) throw error;
      throw wrapDatabaseError(error, context);
    }
  }
  
  // ============= Meal Planning =============
  
  async getMealPlans(userId: string, startDate?: string, endDate?: string): Promise<MealPlan[]> {
    const context = createContext("getMealPlans", undefined, "MealPlan");
    context.additionalInfo = { userId, startDate, endDate };
    try {
      let conditions;
      
      if (startDate && endDate) {
        conditions = and(
          eq(mealPlans.userId, userId),
          gte(mealPlans.date, startDate),
          lte(mealPlans.date, endDate)
        );
      } else {
        conditions = eq(mealPlans.userId, userId);
      }
      
      const rows = await db
        .select()
        .from(mealPlans)
        .where(conditions)
        .orderBy(asc(mealPlans.date), asc(mealPlans.mealType));
      
      return rows.map(row => ({
        ...row,
        date: row.date,
        createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
        updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt
      })) as MealPlan[];
    } catch (error) {
      console.error(`[${DOMAIN}] Error getting meal plans for user ${userId}:`, error);
      throw wrapDatabaseError(error, context);
    }
  }
  
  async getMealPlansByDate(userId: string, date: string): Promise<MealPlan[]> {
    const context = createContext("getMealPlansByDate", undefined, "MealPlan");
    context.additionalInfo = { userId, date };
    try {
      const rows = await db
        .select()
        .from(mealPlans)
        .where(
          and(
            eq(mealPlans.userId, userId),
            eq(mealPlans.date, date)
          )
        )
        .orderBy(asc(mealPlans.mealType));
      
      return rows.map(row => ({
        ...row,
        date: row.date,
        createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
        updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt
      })) as MealPlan[];
    } catch (error) {
      console.error(`[${DOMAIN}] Error getting meal plans for date ${date}:`, error);
      throw wrapDatabaseError(error, context);
    }
  }
  
  async getMealPlan(userId: string, id: string): Promise<MealPlan | undefined> {
    const context = createContext("getMealPlan", id, "MealPlan");
    try {
      const [plan] = await db
        .select()
        .from(mealPlans)
        .where(
          and(
            eq(mealPlans.id, id),
            eq(mealPlans.userId, userId)
          )
        );
      return plan;
    } catch (error) {
      console.error(`[${DOMAIN}] Error getting meal plan ${id}:`, error);
      throw wrapDatabaseError(error, context);
    }
  }
  
  async createMealPlan(plan: InsertMealPlan): Promise<MealPlan> {
    const context = createContext("createMealPlan", undefined, "MealPlan");
    context.additionalInfo = { userId: plan.userId, date: plan.date };
    try {
      const [newPlan] = await db
        .insert(mealPlans)
        .values(plan)
        .returning();
      
      return newPlan;
    } catch (error) {
      console.error(`[${DOMAIN}] Error creating meal plan:`, error);
      throw wrapDatabaseError(error, context);
    }
  }
  
  async updateMealPlan(
    userId: string,
    id: string,
    updates: Partial<MealPlan>
  ): Promise<MealPlan | undefined> {
    const context = createContext("updateMealPlan", id, "MealPlan");
    try {
      const { id: _id, userId: _userId, createdAt, ...safeUpdates } = updates;
      
      const [updatedPlan] = await db
        .update(mealPlans)
        .set(safeUpdates)
        .where(
          and(
            eq(mealPlans.id, id),
            eq(mealPlans.userId, userId)
          )
        )
        .returning();
      
      return updatedPlan;
    } catch (error) {
      console.error(`[${DOMAIN}] Error updating meal plan ${id}:`, error);
      throw wrapDatabaseError(error, context);
    }
  }
  
  async deleteMealPlan(userId: string, id: string): Promise<void> {
    const context = createContext("deleteMealPlan", id, "MealPlan");
    try {
      await db
        .delete(mealPlans)
        .where(
          and(
            eq(mealPlans.id, id),
            eq(mealPlans.userId, userId)
          )
        );
    } catch (error) {
      console.error(`[${DOMAIN}] Error deleting meal plan ${id}:`, error);
      throw wrapDatabaseError(error, context);
    }
  }
  
  async markMealPlanCompleted(userId: string, id: string): Promise<void> {
    const context = createContext("markMealPlanCompleted", id, "MealPlan");
    try {
      await this.updateMealPlan(userId, id, { isCompleted: true });
    } catch (error) {
      console.error(`[${DOMAIN}] Error marking meal plan ${id} as completed:`, error);
      if (error instanceof StorageError) throw error;
      throw wrapDatabaseError(error, context);
    }
  }
  
  // ============= Recipe Analytics =============
  
  async getMostUsedRecipes(userId: string, limit: number = 10): Promise<Recipe[]> {
    const context = createContext("getMostUsedRecipes");
    context.additionalInfo = { userId, limit };
    try {
      const mealPlanCounts = await db
        .select({
          recipeId: mealPlans.recipeId,
          count: sql<number>`COUNT(*)::int`,
        })
        .from(mealPlans)
        .where(eq(mealPlans.userId, userId))
        .groupBy(mealPlans.recipeId)
        .orderBy(desc(sql`COUNT(*)`))
        .limit(limit);
      
      const recipeIds = mealPlanCounts
        .map((mp) => mp.recipeId)
        .filter((id): id is string => id !== null);
      
      if (recipeIds.length === 0) return [];
      
      const recipes = await db
        .select()
        .from(userRecipes)
        .where(
          and(
            eq(userRecipes.userId, userId),
            inArray(userRecipes.id, recipeIds)
          )
        );
      
      return recipes.sort((a, b) => {
        const aIndex = recipeIds.indexOf(a.id);
        const bIndex = recipeIds.indexOf(b.id);
        return aIndex - bIndex;
      });
    } catch (error) {
      console.error(`[${DOMAIN}] Error getting most used recipes for user ${userId}:`, error);
      throw wrapDatabaseError(error, context);
    }
  }
  
  async getRecipeCategories(userId: string): Promise<string[]> {
    const context = createContext("getRecipeCategories");
    context.additionalInfo = { userId };
    try {
      const recipes = await this.getRecipes(userId);
      const categories = new Set<string>();
      
      recipes.forEach((recipe) => {
        if (recipe.category) {
          categories.add(recipe.category);
        }
      });
      
      return Array.from(categories).sort();
    } catch (error) {
      console.error(`[${DOMAIN}] Error getting recipe categories for user ${userId}:`, error);
      if (error instanceof StorageError) throw error;
      throw wrapDatabaseError(error, context);
    }
  }
  
  async getRecipeCuisines(userId: string): Promise<string[]> {
    const context = createContext("getRecipeCuisines");
    context.additionalInfo = { userId };
    try {
      const recipes = await this.getRecipes(userId);
      const cuisines = new Set<string>();
      
      recipes.forEach((recipe) => {
        if (recipe.cuisine) {
          cuisines.add(recipe.cuisine);
        }
      });
      
      return Array.from(cuisines).sort();
    } catch (error) {
      console.error(`[${DOMAIN}] Error getting recipe cuisines for user ${userId}:`, error);
      if (error instanceof StorageError) throw error;
      throw wrapDatabaseError(error, context);
    }
  }
  
  // ============= Recipe Suggestions =============
  
  async getRecipeSuggestionsBasedOnInventory(
    userId: string,
    limit: number = 5
  ): Promise<Recipe[]> {
    const context = createContext("getRecipeSuggestionsBasedOnInventory");
    context.additionalInfo = { userId, limit };
    try {
      const inventory = await db
        .select()
        .from(userInventory)
        .where(eq(userInventory.userId, userId));
      
      const ingredientNames = inventory.map((item) => item.name.toLowerCase());
      
      const allRecipes = await this.getRecipes(userId);
      
      const scoredRecipes = allRecipes.map((recipe) => {
        const recipeIngredients = recipe.ingredients || [];
        const availableIngredients = recipeIngredients.filter((ing) =>
          ingredientNames.some((invIng) =>
            ing.toLowerCase().includes(invIng) ||
            invIng.includes(ing.toLowerCase())
          )
        );
        
        return {
          recipe,
          score: availableIngredients.length / Math.max(recipeIngredients.length, 1),
          availableCount: availableIngredients.length,
          totalCount: recipeIngredients.length,
        };
      });
      
      scoredRecipes.sort((a, b) => b.score - a.score);
      
      return scoredRecipes.slice(0, limit).map((sr) => sr.recipe);
    } catch (error) {
      console.error(`[${DOMAIN}] Error getting recipe suggestions based on inventory for user ${userId}:`, error);
      if (error instanceof StorageError) throw error;
      throw wrapDatabaseError(error, context);
    }
  }
  
  async getRecipeSuggestionsBasedOnExpiring(
    userId: string,
    daysAhead: number = 3
  ): Promise<Recipe[]> {
    const context = createContext("getRecipeSuggestionsBasedOnExpiring");
    context.additionalInfo = { userId, daysAhead };
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];
      
      const futureDate = new Date(today);
      futureDate.setDate(futureDate.getDate() + daysAhead);
      const futureDateStr = futureDate.toISOString().split('T')[0];
      
      const expiringItems = await db
        .select()
        .from(userInventory)
        .where(
          and(
            eq(userInventory.userId, userId),
            gte(userInventory.expirationDate, todayStr),
            lte(userInventory.expirationDate, futureDateStr)
          )
        );
      
      if (expiringItems.length === 0) return [];
      
      const expiringIngredients = expiringItems.map((item) => item.name.toLowerCase());
      
      return await this.searchRecipesByIngredients(userId, expiringIngredients);
    } catch (error) {
      console.error(`[${DOMAIN}] Error getting recipe suggestions based on expiring items for user ${userId}:`, error);
      if (error instanceof StorageError) throw error;
      throw wrapDatabaseError(error, context);
    }
  }
}

export const recipesStorage = new RecipesDomainStorage();
