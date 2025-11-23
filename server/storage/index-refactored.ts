/**
 * Refactored Storage Layer - Three-Tier Architecture
 * 
 * This is the refactored storage facade that organizes all domain modules
 * into three logical tiers for better organization and separation of concerns.
 * 
 * Three-Tier Architecture:
 * 1. UserStorage - User-specific data and operations (7 domains)
 * 2. AdminStorage - Administrative and business operations (5 domains)
 * 3. PlatformStorage - Cross-cutting platform concerns (5 domains)
 * 
 * Benefits of this architecture:
 * - Clear separation of concerns
 * - Easier to maintain and test
 * - Better access control potential
 * - Reduced import complexity
 * - More intuitive API surface
 * 
 * Migration from 17 separate domains to 3 tiers:
 * 
 * UserStorage (User-specific operations):
 *   - inventoryStorage → UserStorage.inventory
 *   - foodStorage → UserStorage.food
 *   - recipesStorage → UserStorage.recipes
 *   - userStorage → UserStorage.users
 *   - chatStorage → UserStorage.chat
 *   - feedbackStorage → UserStorage.feedback
 *   - notificationStorage → UserStorage.notifications
 * 
 * AdminStorage (Administrative operations):
 *   - billingStorage → AdminStorage.billing
 *   - supportStorage → AdminStorage.support
 *   - securityStorage → AdminStorage.security
 *   - pricingStorage → AdminStorage.pricing
 *   - schedulingStorage → AdminStorage.scheduling
 * 
 * PlatformStorage (Platform-wide concerns):
 *   - aiMlStorage → PlatformStorage.aiMl
 *   - analyticsStorage → PlatformStorage.analytics
 *   - systemStorage → PlatformStorage.system
 *   - contentStorage → PlatformStorage.content
 *   - experimentsStorage → PlatformStorage.experiments
 */

// Import the three tier classes
import { UserStorage } from "./tiers/user-storage";
import { AdminStorage } from "./tiers/admin-storage";
import { PlatformStorage } from "./tiers/platform-storage";

// Import legacy domain modules for backward compatibility
import { inventoryStorage } from "./domains/inventory.storage";
import { userStorage } from "./domains/user.storage";
import { recipesStorage } from "./domains/recipes.storage";
import { chatStorage } from "./domains/chat.storage";
import { AnalyticsStorage } from "./domains/analytics.storage";
import { FeedbackStorage } from "./domains/feedback.storage";
import { NotificationStorage } from "./domains/notification.storage";
import { FoodStorage } from "./domains/food.storage";
import { AiMlStorage } from "./domains/ai-ml.storage";
import { SystemStorage } from "./domains/system.storage";
import { SupportStorage } from "./domains/support.storage";
import { BillingStorage } from "./domains/billing.storage";
import { ExperimentsStorage } from "./domains/experiments.storage";
import { SecurityStorage } from "./domains/security.storage";
import { SchedulingStorage } from "./domains/scheduling.storage";
import { PricingStorage } from "./domains/pricing.storage";
import { ContentStorage } from "./domains/content.storage";

// Create instances of the three tiers
const userStorageTier = new UserStorage();
const adminStorageTier = new AdminStorage();
const platformStorageTier = new PlatformStorage();

// Create instances of class-based domain modules for backward compatibility
const analyticsStorage = new AnalyticsStorage();
const feedbackStorage = new FeedbackStorage();
const notificationStorage = new NotificationStorage();
const foodStorage = new FoodStorage();
const aiMlStorage = new AiMlStorage();
const systemStorage = new SystemStorage();
const supportStorage = new SupportStorage();
const billingStorage = new BillingStorage();
const experimentsStorage = new ExperimentsStorage();
const securityStorage = new SecurityStorage();
const schedulingStorage = new SchedulingStorage();
const pricingStorage = new PricingStorage();
const contentStorage = new ContentStorage();

/**
 * Main storage export - Three-tier architecture
 * 
 * This provides the new, organized interface for storage operations
 */
export const storage = {
  // Three-tier architecture
  user: userStorageTier,
  admin: adminStorageTier,
  platform: platformStorageTier,
  
  // Legacy compatibility - flat access to all methods
  // This ensures existing code continues to work
  ...userStorageTier,
  ...adminStorageTier,
  ...platformStorageTier,
  
  // Additional legacy method mappings for backward compatibility
  getUser: userStorageTier.getUserById,
  getShoppingListItems: userStorageTier.getShoppingItems,
  getGroupedShoppingListItems: userStorageTier.getGroupedShoppingItems,
  createShoppingListItem: userStorageTier.createShoppingItem,
  updateShoppingListItem: userStorageTier.updateShoppingItem,
  deleteShoppingListItem: userStorageTier.deleteShoppingItem,
  clearCheckedShoppingListItems: userStorageTier.clearCheckedShoppingItems,
  addMissingIngredientsToShoppingList: userStorageTier.addMissingIngredientsToShoppingList,
  upsertNotificationPreferences: userStorageTier.updateUserNotificationPreferences,
};

/**
 * Named exports for the three tiers
 * 
 * Usage examples:
 * ```typescript
 * // Import specific tier
 * import { userStorage } from "../storage/index-refactored";
 * const user = await userStorage.getUserById(userId);
 * 
 * // Import multiple tiers
 * import { userStorage, adminStorage } from "../storage/index-refactored";
 * 
 * // Import the unified storage
 * import { storage } from "../storage/index-refactored";
 * const user = await storage.user.getUserById(userId);
 * ```
 */
export { 
  userStorageTier as userStorage,
  adminStorageTier as adminStorage,
  platformStorageTier as platformStorage,
};

/**
 * Export domain storage modules for backward compatibility
 * 
 * This allows existing code that imports specific domain modules to continue working
 * during the migration period.
 * 
 * @deprecated Use the three-tier exports instead
 */
export { 
  // Core domains (now in UserStorage)
  inventoryStorage,
  userStorage as userStorageLegacy,
  recipesStorage,
  chatStorage,
  feedbackStorage,
  notificationStorage,
  foodStorage,
  
  // Admin domains (now in AdminStorage)
  billingStorage,
  supportStorage,
  securityStorage,
  pricingStorage,
  schedulingStorage,
  
  // Platform domains (now in PlatformStorage)
  aiMlStorage,
  analyticsStorage,
  systemStorage,
  contentStorage,
  experimentsStorage,
};

// Export interface types
export type { IInventoryStorage } from "./interfaces/IInventoryStorage";
export type { IUserStorage } from "./interfaces/IUserStorage";
export type { IRecipesStorage } from "./interfaces/IRecipesStorage";
export type { IChatStorage } from "./interfaces/IChatStorage";
export type { IAnalyticsStorage } from "./interfaces/IAnalyticsStorage";
export type { IFeedbackStorage } from "./interfaces/IFeedbackStorage";
export type { INotificationStorage } from "./interfaces/INotificationStorage";
export type { IFoodStorage } from "./interfaces/IFoodStorage";
export type { IAiMlStorage } from "./interfaces/IAiMlStorage";
export type { ISystemStorage } from "./interfaces/ISystemStorage";
export type { ISupportStorage } from "./interfaces/ISupportStorage";
export type { IBillingStorage } from "./interfaces/IBillingStorage";
export type { IExperimentsStorage } from "./interfaces/IExperimentsStorage";
export type { ISecurityStorage } from "./interfaces/ISecurityStorage";
export type { ISchedulingStorage } from "./interfaces/ISchedulingStorage";
export type { IPricingStorage } from "./interfaces/IPricingStorage";
export type { IContentStorage } from "./interfaces/IContentStorage";

// Export shared types from domain modules
export type { StorageLocationWithCount } from "./domains/food.storage";

/**
 * Migration Guide
 * ==============
 * 
 * Option 1: Gradual Migration (Recommended)
 * -----------------------------------------
 * 1. Start using index-refactored.ts instead of index.ts
 * 2. Update imports gradually:
 *    OLD: import { inventoryStorage, userStorage } from "../storage/index";
 *    NEW: import { userStorage } from "../storage/index-refactored";
 * 
 * 3. Update method calls to use tier structure:
 *    OLD: inventoryStorage.getFoodItems(userId)
 *    NEW: userStorage.getFoodItems(userId)
 * 
 * Option 2: Use Three-Tier Structure
 * -----------------------------------
 * 1. Import the unified storage object:
 *    import { storage } from "../storage/index-refactored";
 * 
 * 2. Access methods through tiers:
 *    storage.user.getFoodItems(userId)
 *    storage.admin.createTicket(ticket)
 *    storage.platform.recordAnalyticsEvent(event)
 * 
 * Benefits of Three-Tier Structure:
 * - Clear separation of concerns
 * - Better code organization
 * - Easier to implement access control
 * - More intuitive API discovery
 */