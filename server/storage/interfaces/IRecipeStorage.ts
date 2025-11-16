/**
 * Recipe Storage Interface
 * Handles recipe management, favorites, and inventory matching
 */

import type {
  Recipe,
  InsertRecipe,
  UserInventory,
} from "@shared/schema";

export interface IRecipeStorage {
  // Recipe Management
  getRecipes(
    userId: string,
    filters?: {
      isFavorite?: boolean;
      category?: string;
      search?: string;
    },
  ): Promise<Recipe[]>;
  
  getRecipesPaginated(
    userId: string,
    limit: number,
    offset: number,
    filters?: any,
  ): Promise<{ recipes: Recipe[]; total: number }>;
  
  getRecipe(userId: string, id: string): Promise<Recipe | undefined>;
  
  createRecipe(
    userId: string,
    recipe: InsertRecipe,
  ): Promise<Recipe>;
  
  updateRecipe(
    userId: string,
    id: string,
    updates: Partial<Recipe>,
  ): Promise<Recipe | undefined>;
  
  deleteRecipe(userId: string, id: string): Promise<void>;
  
  // Recipe Matching
  getRecipesWithInventoryMatching(
    userId: string,
    minMatchPercentage?: number,
  ): Promise<Array<Recipe & { matchPercentage: number; missingIngredients: string[] }>>;
}