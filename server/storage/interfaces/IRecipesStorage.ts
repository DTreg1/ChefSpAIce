/**
 * @file server/storage/interfaces/IRecipesStorage.ts
 * @description Interface for recipe management and meal planning storage operations
 * 
 * This interface defines the contract for all recipe-related storage operations including:
 * - Recipe CRUD operations with filtering and pagination
 * - Recipe search by text and ingredients
 * - Duplicate detection
 * - Meal planning and scheduling
 * - Recipe analytics and suggestions
 */

import type {
  Recipe,
  InsertRecipe,
  MealPlan,
  InsertMealPlan,
} from "@shared/schema";

/**
 * Filter options for recipe queries
 */
export interface RecipeFilter {
  /** Filter by favorite status */
  isFavorite?: boolean;
  /** Filter by recipe source (e.g., 'ai-generated', 'imported', 'manual') */
  source?: string;
  /** Filter by recipe category (e.g., 'breakfast', 'dinner', 'dessert') */
  category?: string;
  /** Filter by cuisine type (e.g., 'italian', 'mexican', 'asian') */
  cuisine?: string;
  /** Filter by difficulty level (e.g., 'easy', 'medium', 'hard') */
  difficulty?: string;
}

/**
 * Recipes Storage Interface
 * Handles all recipe and meal planning database operations
 */
export interface IRecipesStorage {
  // ============= Recipe Management =============
  
  /**
   * Get all recipes for a user with optional filtering
   * @param userId - The user's UUID
   * @param filter - Optional filter criteria
   * @returns Array of recipes matching the criteria
   */
  getRecipes(userId: string, filter?: RecipeFilter): Promise<Recipe[]>;
  
  /**
   * Get paginated recipes for a user with optional filtering
   * @param userId - The user's UUID
   * @param limit - Maximum number of recipes to return
   * @param offset - Number of recipes to skip
   * @param filter - Optional filter criteria
   * @returns Object containing recipes array and total count
   */
  getRecipesPaginated(
    userId: string,
    limit: number,
    offset: number,
    filter?: RecipeFilter
  ): Promise<{ recipes: Recipe[]; total: number }>;
  
  /**
   * Get a single recipe by ID
   * @param userId - The user's UUID (for ownership verification)
   * @param id - The recipe's UUID
   * @returns The recipe or undefined if not found
   */
  getRecipe(userId: string, id: string): Promise<Recipe | undefined>;
  
  /**
   * Search recipes by text query (searches title, description, cuisine, category)
   * @param userId - The user's UUID
   * @param query - Search text
   * @returns Array of matching recipes
   */
  searchRecipes(userId: string, query: string): Promise<Recipe[]>;
  
  /**
   * Search recipes by ingredient list
   * Returns recipes sorted by the number of matching ingredients
   * @param userId - The user's UUID
   * @param ingredients - Array of ingredient names to search for
   * @returns Array of recipes containing the specified ingredients
   */
  searchRecipesByIngredients(userId: string, ingredients: string[]): Promise<Recipe[]>;
  
  /**
   * Create a new recipe
   * @param userId - The user's UUID
   * @param recipe - Recipe data to insert
   * @returns The newly created recipe
   */
  createRecipe(userId: string, recipe: InsertRecipe): Promise<Recipe>;
  
  /**
   * Update an existing recipe
   * @param userId - The user's UUID (for ownership verification)
   * @param id - The recipe's UUID
   * @param updates - Partial recipe data to update
   * @returns The updated recipe or undefined if not found
   */
  updateRecipe(userId: string, id: string, updates: Partial<Recipe>): Promise<Recipe | undefined>;
  
  /**
   * Delete a recipe permanently
   * @param userId - The user's UUID (for ownership verification)
   * @param id - The recipe's UUID
   */
  deleteRecipe(userId: string, id: string): Promise<void>;
  
  /**
   * Toggle the favorite status of a recipe
   * @param userId - The user's UUID
   * @param id - The recipe's UUID
   * @returns The updated recipe or undefined if not found
   */
  toggleRecipeFavorite(userId: string, id: string): Promise<Recipe | undefined>;
  
  /**
   * Rate a recipe (1-5 stars)
   * @param userId - The user's UUID
   * @param id - The recipe's UUID
   * @param rating - Rating value between 1 and 5
   * @returns The updated recipe or undefined if not found
   * @throws Error if rating is not between 1 and 5
   */
  rateRecipe(userId: string, id: string, rating: number): Promise<Recipe | undefined>;
  
  // ============= Recipe Duplication Detection =============
  
  /**
   * Find recipes that are similar to the given title and ingredients
   * Used to prevent duplicate recipe creation
   * @param userId - The user's UUID
   * @param title - Recipe title to compare
   * @param ingredients - Ingredient list to compare
   * @returns Array of similar recipes (>70% ingredient overlap or title match)
   */
  findSimilarRecipes(userId: string, title: string, ingredients: string[]): Promise<Recipe[]>;
  
  // ============= Meal Planning =============
  
  /**
   * Get meal plans for a user, optionally filtered by date range
   * @param userId - The user's UUID
   * @param startDate - Optional start date (YYYY-MM-DD format)
   * @param endDate - Optional end date (YYYY-MM-DD format)
   * @returns Array of meal plans ordered by date and meal type
   */
  getMealPlans(userId: string, startDate?: string, endDate?: string): Promise<MealPlan[]>;
  
  /**
   * Get all meal plans for a specific date
   * @param userId - The user's UUID
   * @param date - Date in YYYY-MM-DD format
   * @returns Array of meal plans for that date, ordered by meal type
   */
  getMealPlansByDate(userId: string, date: string): Promise<MealPlan[]>;
  
  /**
   * Get a single meal plan by ID
   * @param userId - The user's UUID (for ownership verification)
   * @param id - The meal plan's UUID
   * @returns The meal plan or undefined if not found
   */
  getMealPlan(userId: string, id: string): Promise<MealPlan | undefined>;
  
  /**
   * Create a new meal plan entry
   * @param plan - Meal plan data including userId, date, mealType, and recipeId
   * @returns The newly created meal plan
   */
  createMealPlan(plan: InsertMealPlan): Promise<MealPlan>;
  
  /**
   * Update an existing meal plan
   * @param userId - The user's UUID (for ownership verification)
   * @param id - The meal plan's UUID
   * @param updates - Partial meal plan data to update
   * @returns The updated meal plan or undefined if not found
   */
  updateMealPlan(
    userId: string,
    id: string,
    updates: Partial<MealPlan>
  ): Promise<MealPlan | undefined>;
  
  /**
   * Delete a meal plan permanently
   * @param userId - The user's UUID (for ownership verification)
   * @param id - The meal plan's UUID
   */
  deleteMealPlan(userId: string, id: string): Promise<void>;
  
  /**
   * Mark a meal plan as completed
   * @param userId - The user's UUID
   * @param id - The meal plan's UUID
   */
  markMealPlanCompleted(userId: string, id: string): Promise<void>;
  
  // ============= Recipe Analytics =============
  
  /**
   * Get the most frequently used recipes in meal plans
   * @param userId - The user's UUID
   * @param limit - Maximum number of recipes to return (default: 10)
   * @returns Array of recipes sorted by usage frequency
   */
  getMostUsedRecipes(userId: string, limit?: number): Promise<Recipe[]>;
  
  /**
   * Get all unique recipe categories for a user
   * @param userId - The user's UUID
   * @returns Array of unique category names, sorted alphabetically
   */
  getRecipeCategories(userId: string): Promise<string[]>;
  
  /**
   * Get all unique cuisine types for a user
   * @param userId - The user's UUID
   * @returns Array of unique cuisine names, sorted alphabetically
   */
  getRecipeCuisines(userId: string): Promise<string[]>;
  
  // ============= Recipe Suggestions =============
  
  /**
   * Get recipe suggestions based on current inventory
   * Scores recipes by how many ingredients the user has available
   * @param userId - The user's UUID
   * @param limit - Maximum number of suggestions (default: 5)
   * @returns Array of recipes sorted by ingredient availability score
   */
  getRecipeSuggestionsBasedOnInventory(
    userId: string,
    limit?: number
  ): Promise<Recipe[]>;
  
  /**
   * Get recipe suggestions that use expiring ingredients
   * Helps reduce food waste by prioritizing items about to expire
   * @param userId - The user's UUID
   * @param daysAhead - Number of days to look ahead for expiring items (default: 3)
   * @returns Array of recipes that use expiring ingredients
   */
  getRecipeSuggestionsBasedOnExpiring(
    userId: string,
    daysAhead?: number
  ): Promise<Recipe[]>;
}
