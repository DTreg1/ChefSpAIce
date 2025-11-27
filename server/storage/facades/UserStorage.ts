/**
 * @file server/storage/facades/UserStorage.ts
 * @description UserStorage facade consolidating user-specific storage operations
 * 
 * EXPORT PATTERN:
 * - Export CLASS (UserStorage) for dependency injection and testing
 * - Export singleton INSTANCE (userStorageFacade) for convenience in production code
 * 
 * PATTERN: Facades instantiate their own instances of domain storage classes.
 * This enables dependency injection and isolated testing of each domain.
 */

import { UserAuthDomainStorage } from "../domains/user.storage";
import { FoodStorage } from "../domains/food.storage";
import { RecipesDomainStorage } from "../domains/recipes.storage";
import { InventoryDomainStorage } from "../domains/inventory.storage";
import { ChatDomainStorage } from "../domains/chat.storage";
import { NotificationStorage } from "../domains/notification.storage";
import { SchedulingStorage } from "../domains/scheduling.storage";

/**
 * UserStorage facade that consolidates all user-related storage modules
 */
export class UserStorage {
  public readonly user: UserAuthDomainStorage;
  public readonly food: FoodStorage;
  public readonly recipes: RecipesDomainStorage;
  public readonly inventory: InventoryDomainStorage;
  public readonly chat: ChatDomainStorage;
  public readonly notifications: NotificationStorage;
  public readonly scheduling: SchedulingStorage;

  constructor() {
    this.user = new UserAuthDomainStorage();
    this.food = new FoodStorage();
    this.recipes = new RecipesDomainStorage();
    this.inventory = new InventoryDomainStorage();
    this.chat = new ChatDomainStorage();
    this.notifications = new NotificationStorage();
    this.scheduling = new SchedulingStorage();
  }
}

/**
 * Singleton instance for convenient usage in production code.
 * Import this when you don't need dependency injection.
 */
export const userStorageFacade = new UserStorage();