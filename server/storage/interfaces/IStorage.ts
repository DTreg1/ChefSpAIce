/**
 * Main Storage Interface
 * Combines all domain-specific storage interfaces
 */

import type { IUserStorage } from "./IUserStorage";
import type { IInventoryStorage } from "./IInventoryStorage";
import type { IRecipesStorage } from "./IRecipesStorage";
import type { IChatStorage } from "./IChatStorage";
import type { IAiMlStorage } from "./IAiMlStorage";

// Re-export domain interfaces for convenience
export type { IUserStorage } from "./IUserStorage";
export type { IInventoryStorage } from "./IInventoryStorage";
export type { IRecipesStorage } from "./IRecipesStorage";
export type { IChatStorage } from "./IChatStorage";
export type { IAiMlStorage } from "./IAiMlStorage";

// Note: IMealPlanningStorage is kept separate as it overlaps with IRecipesStorage
// which already includes meal planning functionality
export type { IMealPlanningStorage } from "./IMealPlanningStorage";

/**
 * Combined Storage Interface
 * Provides access to all storage domains
 * 
 * Note: IRecipesStorage includes both recipe and meal planning operations
 */
export interface IStorage extends
  IUserStorage,
  IInventoryStorage,
  IRecipesStorage,
  IChatStorage,
  IAiMlStorage {
  // Add any cross-domain methods here if needed
}