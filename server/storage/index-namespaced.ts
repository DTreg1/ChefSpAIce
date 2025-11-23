/**
 * Namespace-Based Three-Tier Storage Architecture
 * 
 * This implementation provides a three-tier organizational structure
 * while maintaining 100% backward compatibility with existing code.
 * 
 * Key Features:
 * - No breaking changes - all existing imports continue to work
 * - Uses existing singleton instances - no duplicate state
 * - Adds organized tier namespaces for better API discovery
 * - All prototype methods preserved
 * - Zero migration required for existing code
 * 
 * Architecture:
 * 1. Legacy flat access (for backward compatibility)
 * 2. Organized tier namespaces (for new code and better organization)
 * 
 * Three Tiers:
 * - user: User-specific data and operations
 * - admin: Administrative and business operations  
 * - platform: Cross-cutting platform concerns
 */

// Import domain storage modules (singleton instances)
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

// Import composition helper
import { mergeStorageModules } from "./utils/compose-storage";

// Create instances of class-based domain modules
// These are the modules that don't export singleton instances
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
 * Legacy merged storage for backward compatibility
 * This maintains the exact same behavior as the current system
 */
const mergedStorage = mergeStorageModules(
  inventoryStorage,        // Domain 1: Inventory management
  userStorage,             // Domain 2: User authentication & management  
  recipesStorage,          // Domain 3: Recipes & meal planning
  chatStorage,             // Domain 4: Chat & conversations
  analyticsStorage,        // Domain 5: Analytics & metrics
  feedbackStorage,         // Domain 6: Feedback & community
  notificationStorage,     // Domain 7: Notifications & push tokens
  foodStorage,             // Domain 8: Food inventory & nutrition
  aiMlStorage,             // Domain 9: AI/ML features
  systemStorage,           // Domain 10: System operations
  supportStorage,          // Domain 11: Customer support
  billingStorage,          // Domain 12: Billing & payments
  experimentsStorage,      // Domain 13: A/B testing
  securityStorage,         // Domain 14: Security & moderation
  schedulingStorage,       // Domain 15: Scheduling & meetings
  pricingStorage,          // Domain 16: Dynamic pricing
  contentStorage           // Domain 17: Content organization
);

/**
 * Main storage export with namespace-based three-tier architecture
 * 
 * This provides both:
 * 1. Direct access to all methods (backward compatibility)
 * 2. Organized tier namespaces (improved organization)
 * 
 * Usage examples:
 * ```typescript
 * // Legacy style (still works)
 * storage.getFoodItems(userId);
 * storage.createTicket(ticket);
 * 
 * // New organized style
 * storage.user.inventory.getFoodItems(userId);
 * storage.admin.support.createTicket(ticket);
 * storage.platform.analytics.recordEvent(event);
 * ```
 */
export const storage = {
  // ============= LEGACY FLAT ACCESS =============
  // All methods directly accessible for backward compatibility
  ...mergedStorage,
  
  // Legacy method mappings
  getUser: userStorage.getUserById.bind(userStorage),
  getShoppingListItems: inventoryStorage.getShoppingItems.bind(inventoryStorage),
  getGroupedShoppingListItems: inventoryStorage.getGroupedShoppingItems.bind(inventoryStorage),
  createShoppingListItem: inventoryStorage.createShoppingItem.bind(inventoryStorage),
  updateShoppingListItem: inventoryStorage.updateShoppingItem.bind(inventoryStorage),
  deleteShoppingListItem: inventoryStorage.deleteShoppingItem.bind(inventoryStorage),
  clearCheckedShoppingListItems: inventoryStorage.clearCheckedShoppingItems.bind(inventoryStorage),
  addMissingIngredientsToShoppingList: inventoryStorage.addMissingIngredientsToShoppingList.bind(inventoryStorage),
  upsertNotificationPreferences: userStorage.updateUserNotificationPreferences.bind(userStorage),
  
  // ============= THREE-TIER NAMESPACES =============
  /**
   * User Tier: User-specific data and operations
   * Contains 7 domain modules related to user functionality
   */
  user: {
    inventory: inventoryStorage,
    food: foodStorage,
    recipes: recipesStorage,
    auth: userStorage,
    chat: chatStorage,
    feedback: feedbackStorage,
    notifications: notificationStorage,
  },
  
  /**
   * Admin Tier: Administrative and business operations
   * Contains 5 domain modules for admin functionality
   */
  admin: {
    billing: billingStorage,
    support: supportStorage,
    security: securityStorage,
    pricing: pricingStorage,
    scheduling: schedulingStorage,
  },
  
  /**
   * Platform Tier: Cross-cutting platform concerns
   * Contains 5 domain modules for platform-wide features
   */
  platform: {
    aiMl: aiMlStorage,
    analytics: analyticsStorage,
    system: systemStorage,
    content: contentStorage,
    experiments: experimentsStorage,
  },
};

/**
 * Export individual domain modules for direct import
 * 
 * This allows existing code to continue importing specific modules:
 * ```typescript
 * import { inventoryStorage } from "../storage/index-namespaced";
 * ```
 */
export { 
  // User tier domains
  inventoryStorage,
  userStorage,
  recipesStorage,
  chatStorage,
  feedbackStorage,
  notificationStorage,
  foodStorage,
  
  // Admin tier domains
  billingStorage,
  supportStorage,
  securityStorage,
  pricingStorage,
  schedulingStorage,
  
  // Platform tier domains
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
 * MIGRATION GUIDE
 * ==============
 * 
 * This implementation requires ZERO migration!
 * 
 * All existing code continues to work exactly as before.
 * New code can optionally use the organized tier structure.
 * 
 * Gradual Adoption:
 * ----------------
 * 1. Keep existing imports unchanged
 * 2. For new code, use tier namespaces for better organization
 * 3. Optionally refactor old code to use tiers when convenient
 * 
 * Examples:
 * --------
 * ```typescript
 * // Old style (still works)
 * import { inventoryStorage, userStorage } from "../storage/index-namespaced";
 * await inventoryStorage.getFoodItems(userId);
 * 
 * // New style (better organization)
 * import { storage } from "../storage/index-namespaced";
 * await storage.user.inventory.getFoodItems(userId);
 * await storage.admin.support.createTicket(ticket);
 * await storage.platform.analytics.recordEvent(event);
 * ```
 * 
 * Benefits:
 * --------
 * - No breaking changes
 * - Better code organization
 * - Easier to understand domain boundaries
 * - Potential for role-based access control
 * - Improved API discovery through namespaces
 */