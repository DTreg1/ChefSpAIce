/**
 * Recipes Storage Interface
 * Handles recipe management and meal planning operations
 */

import type {
  Recipe,
  InsertRecipe,
  MealPlan,
  InsertMealPlan,
} from "@shared/schema";

export interface IRecipesStorage {
  // Recipe Management
  getRecipes(userId: string, filter?: {
    isFavorite?: boolean;
    source?: string;
    category?: string;
    cuisine?: string;
    difficulty?: string;
  }): Promise<Recipe[]>;
  
  getRecipesPaginated(
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
  ): Promise<{ recipes: Recipe[]; total: number }>;
  
  getRecipe(userId: string, id: string): Promise<Recipe | undefined>;
  
  searchRecipes(userId: string, query: string): Promise<Recipe[]>;
  
  searchRecipesByIngredients(userId: string, ingredients: string[]): Promise<Recipe[]>;
  
  createRecipe(userId: string, recipe: InsertRecipe): Promise<Recipe>;
  
  updateRecipe(userId: string, id: string, updates: Partial<Recipe>): Promise<Recipe | undefined>;
  
  deleteRecipe(userId: string, id: string): Promise<void>;
  
  toggleRecipeFavorite(userId: string, id: string): Promise<Recipe | undefined>;
  
  rateRecipe(userId: string, id: string, rating: number): Promise<Recipe | undefined>;
  
  // Recipe Duplication Detection
  findSimilarRecipes(userId: string, title: string, ingredients: string[]): Promise<Recipe[]>;
  
  // Meal Planning
  getMealPlans(userId: string, startDate?: string, endDate?: string): Promise<MealPlan[]>;
  
  getMealPlansByDate(userId: string, date: string): Promise<MealPlan[]>;
  
  getMealPlan(userId: string, id: string): Promise<MealPlan | undefined>;
  
  createMealPlan(plan: InsertMealPlan): Promise<MealPlan>;
  
  updateMealPlan(
    userId: string,
    id: string,
    updates: Partial<MealPlan>
  ): Promise<MealPlan | undefined>;
  
  deleteMealPlan(userId: string, id: string): Promise<void>;
  
  markMealPlanCompleted(userId: string, id: string): Promise<void>;
  
  // Recipe Analytics
  getMostUsedRecipes(userId: string, limit?: number): Promise<Recipe[]>;
  
  getRecipeCategories(userId: string): Promise<string[]>;
  
  getRecipeCuisines(userId: string): Promise<string[]>;
  
  // Recipe Suggestions
  getRecipeSuggestionsBasedOnInventory(
    userId: string,
    limit?: number
  ): Promise<Recipe[]>;
  
  getRecipeSuggestionsBasedOnExpiring(
    userId: string,
    daysAhead?: number
  ): Promise<Recipe[]>;
}