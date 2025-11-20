/**
 * Main Storage Interface
 * Combines all domain-specific storage interfaces
 */

import type { IUserStorage } from "./IUserStorage";
import type { IInventoryStorage } from "./IInventoryStorage";
import type { IRecipeStorage } from "./IRecipeStorage";
import type { IChatStorage } from "./IChatStorage";
import type { IMealPlanningStorage } from "./IMealPlanningStorage";
import type { IFoodStorage } from "./IFoodStorage";
import type { IAiMlStorage } from "./IAiMlStorage";

// Re-export domain interfaces for convenience
export type { IUserStorage } from "./IUserStorage";
export type { IInventoryStorage } from "./IInventoryStorage";
export type { IRecipeStorage } from "./IRecipeStorage";
export type { IChatStorage } from "./IChatStorage";
export type { IMealPlanningStorage } from "./IMealPlanningStorage";
export type { IFoodStorage } from "./IFoodStorage";
export type { IAiMlStorage } from "./IAiMlStorage";

/**
 * Combined Storage Interface
 * Provides access to all storage domains
 */
export interface IStorage extends
  IUserStorage,
  IInventoryStorage,
  IRecipeStorage,
  IChatStorage,
  IMealPlanningStorage,
  IFoodStorage,
  IAiMlStorage {
  // Add any cross-domain methods here if needed
}