/**
 * Storage Compatibility Facade
 * 
 * This file provides backward compatibility during the migration from
 * monolithic storage.ts to domain-driven storage modules.
 * 
 * Migration Strategy:
 * 1. Each domain module exports its storage instance
 * 2. This facade re-exports all methods from domain modules
 * 3. Routers can import from here during transition
 * 4. Eventually, routers will import directly from domain modules
 * 5. Once migration is complete, this file and storage.ts can be removed
 */

// Import domain storage modules
import { inventoryStorage } from "./domains/inventory.storage";
import { userAuthStorage } from "./domains/user-auth.storage";
import { recipesStorage } from "./domains/recipes.storage";
import { chatStorage } from "./domains/chat.storage";
import { AnalyticsStorage } from "./domains/analytics.storage";
import { FeedbackStorage } from "./domains/feedback.storage";
import { NotificationStorage } from "./domains/notification.storage";

// Import the legacy monolithic storage for methods not yet migrated
import { storage as legacyStorage } from "../storage";

// Import composition helper
import { mergeStorageModules } from "./utils/compose-storage";

// Create instances of new domain modules
const analyticsStorage = new AnalyticsStorage();
const feedbackStorage = new FeedbackStorage();
const notificationStorage = new NotificationStorage();

/**
 * Compatibility storage object that combines domain modules with legacy storage
 * This maintains the same interface as the original monolithic storage
 * 
 * Domain modules are applied in order of precedence (later modules override earlier)
 * Legacy storage has lowest precedence as the fallback
 * 
 * NOTE: Notification domain temporarily disabled due to schema column name mismatches
 * Active domains: Analytics (80+ methods), Feedback (20+ methods), Inventory, UserAuth, Recipes, Chat
 */
export const storage = mergeStorageModules(
  legacyStorage,           // Base/legacy (lowest precedence)
  inventoryStorage,        // Domain: Inventory management
  userAuthStorage,         // Domain: User authentication & management  
  recipesStorage,          // Domain: Recipes & meal planning
  chatStorage,             // Domain: Chat & conversations
  analyticsStorage,        // Domain: Analytics & metrics
  feedbackStorage          // Domain: Feedback & community
  // TEMPORARILY DISABLED - schema column name fixes needed:
  // notificationStorage     // Domain: Notifications & push tokens
);

// Legacy method mappings for backward compatibility
// These ensure old method names still work with new implementations
Object.assign(storage, {
  // Map old getUserById to new getUser pattern
  getUser: userAuthStorage.getUserById.bind(userAuthStorage),
  
  // Shopping list methods are now in inventory domain
  getShoppingListItems: inventoryStorage.getShoppingListItems.bind(inventoryStorage),
  getGroupedShoppingListItems: inventoryStorage.getGroupedShoppingListItems.bind(inventoryStorage),
  createShoppingListItem: inventoryStorage.createShoppingListItem.bind(inventoryStorage),
  updateShoppingListItem: inventoryStorage.updateShoppingListItem.bind(inventoryStorage),
  deleteShoppingListItem: inventoryStorage.deleteShoppingListItem.bind(inventoryStorage),
  clearCheckedShoppingListItems: inventoryStorage.clearCheckedShoppingListItems.bind(inventoryStorage),
  addMissingIngredientsToShoppingList: inventoryStorage.addMissingIngredientsToShoppingList.bind(inventoryStorage),
  
  // Nutrition notification preferences
  upsertNotificationPreferences: userAuthStorage.updateUserNotificationPreferences.bind(userAuthStorage)
});

// Export domain storage modules for direct import
export { 
  inventoryStorage,
  userAuthStorage,
  recipesStorage,
  chatStorage,
  analyticsStorage,
  feedbackStorage,
  notificationStorage
};

// Export types
export type { IInventoryStorage } from "./interfaces/IInventoryStorage";
export type { IUserAuthStorage } from "./interfaces/IUserAuthStorage";
export type { IRecipesStorage } from "./interfaces/IRecipesStorage";
export type { IChatStorage } from "./interfaces/IChatStorage";
export type { IAnalyticsStorage } from "./interfaces/IAnalyticsStorage";
export type { IFeedbackStorage } from "./interfaces/IFeedbackStorage";
export type { INotificationStorage } from "./interfaces/INotificationStorage";