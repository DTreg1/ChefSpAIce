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
 *
 * ERROR HANDLING PATTERN:
 * - Facades do NOT catch and swallow storage errors
 * - Facades add context to errors via proxy wrapper before propagating
 * - StorageErrors bubble up to callers with facade context enrichment
 * - All errors are logged at facade level for observability
 */

import { UserAuthDomainStorage } from "../domains/user.storage";
import { FoodStorage } from "../domains/food.storage";
import { RecipesDomainStorage } from "../domains/recipes.storage";
import { InventoryDomainStorage } from "../domains/inventory.storage";
import { ChatDomainStorage } from "../domains/chat.storage";
import { NotificationStorage } from "../domains/notification.storage";
import { SchedulingStorage } from "../domains/scheduling.storage";
import { createDomainStorageProxy } from "./FacadeErrorBoundary";

const FACADE_NAME = "user" as const;

/**
 * UserStorage facade that consolidates all user-related storage modules
 *
 * All domain storage instances are wrapped with error boundary proxies that:
 * 1. Log errors at facade level for observability
 * 2. Enrich StorageErrors with facade context
 * 3. Propagate errors without transformation (StorageErrors remain StorageErrors)
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
    this.user = createDomainStorageProxy(
      new UserAuthDomainStorage(),
      FACADE_NAME,
      "user",
    );
    this.food = createDomainStorageProxy(
      new FoodStorage(),
      FACADE_NAME,
      "food",
    );
    this.recipes = createDomainStorageProxy(
      new RecipesDomainStorage(),
      FACADE_NAME,
      "recipes",
    );
    this.inventory = createDomainStorageProxy(
      new InventoryDomainStorage(),
      FACADE_NAME,
      "inventory",
    );
    this.chat = createDomainStorageProxy(
      new ChatDomainStorage(),
      FACADE_NAME,
      "chat",
    );
    this.notifications = createDomainStorageProxy(
      new NotificationStorage(),
      FACADE_NAME,
      "notifications",
    );
    this.scheduling = createDomainStorageProxy(
      new SchedulingStorage(),
      FACADE_NAME,
      "scheduling",
    );
  }
}

/**
 * Singleton instance for convenient usage in production code.
 * Import this when you don't need dependency injection.
 */
export const userStorageFacade = new UserStorage();
