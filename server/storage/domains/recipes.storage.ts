/**
 * Recipes Domain Storage
 * Implements IRecipesStorage interface for recipe and meal planning operations
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
      
      // Convert Date objects to ISO strings for legacy compatibility
      return rows.map(row => ({
        ...row,
        createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
        updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt
      })) as Recipe[];
    } catch (error) {
      console.error(`Error getting recipes for user ${userId}:`, error);
      throw new Error("Failed to retrieve recipes");
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
      
      // Get total count
      const [countResult] = await db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(userRecipes)
        .where(conditions);
      
      // Get paginated recipes
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
      console.error(`Error getting paginated recipes for user ${userId}:`, error);
      throw new Error("Failed to retrieve paginated recipes");
    }
  }
  
  async getRecipe(userId: string, id: string): Promise<Recipe | undefined> {
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
      console.error(`Error getting recipe ${id} for user ${userId}:`, error);
      throw new Error("Failed to retrieve recipe");
    }
  }
  
  async searchRecipes(userId: string, query: string): Promise<Recipe[]> {
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
      console.error(`Error searching recipes for user ${userId}:`, error);
      throw new Error("Failed to search recipes");
    }
  }
  
  async searchRecipesByIngredients(userId: string, ingredients: string[]): Promise<Recipe[]> {
    try {
      if (!ingredients || ingredients.length === 0) {
        return [];
      }
      
      // Build SQL conditions for ingredient matching using JSONB operators
      // This searches in the ingredients array for matching strings
      const ingredientConditions = ingredients.map(ingredient => 
        sql`EXISTS (
          SELECT 1 FROM jsonb_array_elements_text(${userRecipes.ingredients}) AS ing
          WHERE LOWER(ing) LIKE ${'%' + ingredient.toLowerCase() + '%'}
        )`
      );
      
      // Get all matching recipes with SQL-based filtering
      const rows = await db
        .select({
          recipe: userRecipes,
          // Count matching ingredients for sorting
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
      
      // Extract recipes and convert dates to ISO strings for legacy compatibility
      return rows.map(({ recipe }) => ({
        ...recipe,
        createdAt: recipe.createdAt instanceof Date ? recipe.createdAt.toISOString() : recipe.createdAt,
        updatedAt: recipe.updatedAt instanceof Date ? recipe.updatedAt.toISOString() : recipe.updatedAt
      })) as Recipe[];
    } catch (error) {
      console.error(`Error searching recipes by ingredients for user ${userId}:`, error);
      throw new Error("Failed to search recipes by ingredients");
    }
  }
  
  async createRecipe(userId: string, recipe: InsertRecipe): Promise<Recipe> {
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
      console.error(`Error creating recipe for user ${userId}:`, error);
      throw new Error("Failed to create recipe");
    }
  }
  
  async updateRecipe(
    userId: string,
    id: string,
    updates: Partial<Recipe>
  ): Promise<Recipe | undefined> {
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
      console.error(`Error updating recipe ${id} for user ${userId}:`, error);
      throw new Error("Failed to update recipe");
    }
  }
  
  async deleteRecipe(userId: string, id: string): Promise<void> {
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
      console.error(`Error deleting recipe ${id} for user ${userId}:`, error);
      throw new Error("Failed to delete recipe");
    }
  }
  
  async toggleRecipeFavorite(userId: string, id: string): Promise<Recipe | undefined> {
    try {
      const recipe = await this.getRecipe(userId, id);
      if (!recipe) return undefined;
      
      return await this.updateRecipe(userId, id, {
        isFavorite: !recipe.isFavorite,
      });
    } catch (error) {
      console.error(`Error toggling favorite for recipe ${id}:`, error);
      throw new Error("Failed to toggle recipe favorite");
    }
  }
  
  async rateRecipe(userId: string, id: string, rating: number): Promise<Recipe | undefined> {
    try {
      if (rating < 1 || rating > 5) {
        throw new Error("Rating must be between 1 and 5");
      }
      
      return await this.updateRecipe(userId, id, { rating });
    } catch (error) {
      console.error(`Error rating recipe ${id}:`, error);
      throw new Error("Failed to rate recipe");
    }
  }
  
  // ============= Recipe Duplication Detection =============
  
  async findSimilarRecipes(
    userId: string,
    title: string,
    ingredients: string[]
  ): Promise<Recipe[]> {
    try {
      const allRecipes = await this.getRecipes(userId);
      
      return allRecipes.filter((recipe) => {
        // Check title similarity
        const titleSimilarity = recipe.title.toLowerCase().includes(title.toLowerCase()) ||
                               title.toLowerCase().includes(recipe.title.toLowerCase());
        
        if (titleSimilarity) return true;
        
        // Check ingredient overlap (at least 70% match)
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
      console.error(`Error finding similar recipes for user ${userId}:`, error);
      throw new Error("Failed to find similar recipes");
    }
  }
  
  // ============= Meal Planning =============
  
  async getMealPlans(userId: string, startDate?: string, endDate?: string): Promise<MealPlan[]> {
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
      
      // Convert Date objects to ISO strings for legacy compatibility
      return rows.map(row => ({
        ...row,
        date: row.date,  // Already stored as text YYYY-MM-DD
        createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
        updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt
      })) as MealPlan[];
    } catch (error) {
      console.error(`Error getting meal plans for user ${userId}:`, error);
      throw new Error("Failed to retrieve meal plans");
    }
  }
  
  async getMealPlansByDate(userId: string, date: string): Promise<MealPlan[]> {
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
      
      // Convert Date objects to ISO strings for legacy compatibility
      return rows.map(row => ({
        ...row,
        date: row.date,  // Already stored as text YYYY-MM-DD
        createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
        updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt
      })) as MealPlan[];
    } catch (error) {
      console.error(`Error getting meal plans for date ${date}:`, error);
      throw new Error("Failed to retrieve meal plans by date");
    }
  }
  
  async getMealPlan(userId: string, id: string): Promise<MealPlan | undefined> {
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
      console.error(`Error getting meal plan ${id}:`, error);
      throw new Error("Failed to retrieve meal plan");
    }
  }
  
  async createMealPlan(plan: InsertMealPlan): Promise<MealPlan> {
    try {
      const [newPlan] = await db
        .insert(mealPlans)
        .values(plan)
        .returning();
      
      return newPlan;
    } catch (error) {
      console.error("Error creating meal plan:", error);
      throw new Error("Failed to create meal plan");
    }
  }
  
  async updateMealPlan(
    userId: string,
    id: string,
    updates: Partial<MealPlan>
  ): Promise<MealPlan | undefined> {
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
      console.error(`Error updating meal plan ${id}:`, error);
      throw new Error("Failed to update meal plan");
    }
  }
  
  async deleteMealPlan(userId: string, id: string): Promise<void> {
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
      console.error(`Error deleting meal plan ${id}:`, error);
      throw new Error("Failed to delete meal plan");
    }
  }
  
  async markMealPlanCompleted(userId: string, id: string): Promise<void> {
    try {
      await this.updateMealPlan(userId, id, { isCompleted: true });
    } catch (error) {
      console.error(`Error marking meal plan ${id} as completed:`, error);
      throw new Error("Failed to mark meal plan as completed");
    }
  }
  
  // ============= Recipe Analytics =============
  
  async getMostUsedRecipes(userId: string, limit: number = 10): Promise<Recipe[]> {
    try {
      // Get recipes that are most frequently used in meal plans
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
      
      const recipeIds = mealPlanCounts.map((mp) => mp.recipeId);
      
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
      
      // Sort recipes by usage count
      return recipes.sort((a, b) => {
        const aIndex = recipeIds.indexOf(a.id);
        const bIndex = recipeIds.indexOf(b.id);
        return aIndex - bIndex;
      });
    } catch (error) {
      console.error(`Error getting most used recipes for user ${userId}:`, error);
      throw new Error("Failed to get most used recipes");
    }
  }
  
  async getRecipeCategories(userId: string): Promise<string[]> {
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
      console.error(`Error getting recipe categories for user ${userId}:`, error);
      throw new Error("Failed to get recipe categories");
    }
  }
  
  async getRecipeCuisines(userId: string): Promise<string[]> {
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
      console.error(`Error getting recipe cuisines for user ${userId}:`, error);
      throw new Error("Failed to get recipe cuisines");
    }
  }
  
  // ============= Recipe Suggestions =============
  
  async getRecipeSuggestionsBasedOnInventory(
    userId: string,
    limit: number = 5
  ): Promise<Recipe[]> {
    try {
      // Get user's current inventory
      const inventory = await db
        .select()
        .from(userInventory)
        .where(eq(userInventory.userId, userId));
      
      const ingredientNames = inventory.map((item) => item.name.toLowerCase());
      
      // Get all user recipes
      const allRecipes = await this.getRecipes(userId);
      
      // Score recipes based on how many ingredients user has
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
      
      // Sort by score and return top recipes
      scoredRecipes.sort((a, b) => b.score - a.score);
      
      return scoredRecipes.slice(0, limit).map((sr) => sr.recipe);
    } catch (error) {
      console.error(`Error getting recipe suggestions based on inventory for user ${userId}:`, error);
      throw new Error("Failed to get recipe suggestions");
    }
  }
  
  async getRecipeSuggestionsBasedOnExpiring(
    userId: string,
    daysAhead: number = 3
  ): Promise<Recipe[]> {
    try {
      // Get expiring items
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
      
      // Find recipes that use expiring ingredients
      return await this.searchRecipesByIngredients(userId, expiringIngredients);
    } catch (error) {
      console.error(`Error getting recipe suggestions based on expiring items for user ${userId}:`, error);
      throw new Error("Failed to get recipe suggestions for expiring items");
    }
  }
}

// Export singleton instance
export const recipesStorage = new RecipesDomainStorage();