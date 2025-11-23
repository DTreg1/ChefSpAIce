/**
 * UserStorage Facade
 * Consolidates user-specific storage operations into organized sub-modules
 */

import { UserAuthDomainStorage } from "../domains/user.storage";
import { FoodStorage } from "../domains/food.storage";
import { recipesStorage } from "../domains/recipes.storage";
import { inventoryStorage } from "../domains/inventory.storage";
import { chatStorage } from "../domains/chat.storage";
import { NotificationStorage } from "../domains/notification.storage";
import { SchedulingStorage } from "../domains/scheduling.storage";

/**
 * UserStorage facade that consolidates all user-related storage modules
 */
export class UserStorage {
  public readonly user: UserAuthDomainStorage;
  public readonly food: FoodStorage;
  public readonly recipes: typeof recipesStorage;
  public readonly inventory: typeof inventoryStorage;
  public readonly chat: typeof chatStorage;
  public readonly notifications: NotificationStorage;
  public readonly scheduling: SchedulingStorage;

  constructor() {
    this.user = new UserAuthDomainStorage();
    this.food = new FoodStorage();
    this.recipes = recipesStorage;
    this.inventory = inventoryStorage;
    this.chat = chatStorage;
    this.notifications = new NotificationStorage();
    this.scheduling = new SchedulingStorage();
  }
}