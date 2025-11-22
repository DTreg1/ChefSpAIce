/**
 * Unified Storage Layer - Domain-Driven Architecture
 * 
 * This is the central storage facade that combines all domain-specific storage modules
 * into a single, cohesive interface using the composition pattern.
 * 
 * Architecture:
 * 1. Each domain module handles its own data operations with full type safety
 * 2. This facade composes all domains into a unified storage object
 * 3. Routers and services can import the unified storage or specific domains
 * 4. All methods are strongly typed with proper error handling
 * 5. No monolithic storage file - pure domain-driven design
 * 
 * All 17 Domain Modules:
 * - Inventory: Food items, expiration tracking, shopping lists
 * - UserAuth: User management, OAuth, authentication, sessions
 * - Recipes: Recipe CRUD, search, meal planning
 * - Chat: AI conversation history and context management
 * - Analytics: Activity logging, API usage, web vitals, predictions, trends
 * - Feedback: User feedback, community features, donations
 * - Notification: Push notifications, preferences, engagement tracking
 * - Food: Food inventory, storage locations, USDA cache, cooking terms
 * - AI/ML: Voice commands, writing assistance, summarization, translations
 * - System: API logging, system metrics, maintenance predictions
 * - Support: Ticket management, routing rules, agent expertise
 * - Billing: Donations, Stripe payments, recurring billing
 * - Experiments: A/B testing, cohort analysis, statistical significance
 * - Security: Content moderation, fraud detection, privacy settings
 * - Scheduling: Meeting preferences, AI time suggestions, conflict detection
 * - Pricing: Dynamic pricing rules, market intelligence, AI optimization
 * - Content: Categories, tagging, embeddings, duplicate detection
 */

// Import domain storage modules
import { inventoryStorage } from "./domains/inventory.storage";
import { userAuthStorage } from "./domains/user-auth.storage";
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
 * Unified storage object combining all 17 domain modules
 * 
 * This is the single source of truth for all storage operations,
 * providing a clean, domain-driven architecture with full TypeScript type safety.
 * 
 * All 17 domains are ACTIVE with full TypeScript type safety!
 * ✓ Core Domains (8):
 *   - Inventory: Food tracking, expiration, shopping
 *   - UserAuth: User accounts, OAuth, sessions
 *   - Recipes: Recipe management, meal planning
 *   - Chat: AI conversations, message history
 *   - Analytics: Events, metrics, predictions
 *   - Feedback: User feedback, donations
 *   - Notification: Push tokens, preferences
 *   - Food: Food data, USDA cache, cooking terms
 * 
 * ✓ Advanced Domains (9):
 *   - AI/ML: Voice, writing, translations (1,322 lines)
 *   - System: API logging, metrics (982 lines)
 *   - Support: Ticket management (578 lines)
 *   - Billing: Payments, donations (486 lines)
 *   - Experiments: A/B testing (728 lines)
 *   - Security: Moderation, fraud (704 lines)
 *   - Scheduling: Meetings, AI suggestions (550 lines)
 *   - Pricing: Dynamic pricing (689 lines)
 *   - Content: Categories, tags, embeddings (839 lines)
 */
export const storage = mergeStorageModules(
  inventoryStorage,        // Domain 1: Inventory management
  userAuthStorage,         // Domain 2: User authentication & management  
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

// Legacy method mappings for backward compatibility
// These ensure old method names still work with new implementations
Object.assign(storage, {
  // Map legacy getUser to standard getUserById pattern
  getUser: userAuthStorage.getUserById.bind(userAuthStorage),
  
  // Shopping list methods are now in inventory domain
  getShoppingListItems: inventoryStorage.getShoppingItems.bind(inventoryStorage),
  getGroupedShoppingListItems: inventoryStorage.getGroupedShoppingItems.bind(inventoryStorage),
  createShoppingListItem: inventoryStorage.createShoppingItem.bind(inventoryStorage),
  updateShoppingListItem: inventoryStorage.updateShoppingItem.bind(inventoryStorage),
  deleteShoppingListItem: inventoryStorage.deleteShoppingItem.bind(inventoryStorage),
  clearCheckedShoppingListItems: inventoryStorage.clearCheckedShoppingItems.bind(inventoryStorage),
  addMissingIngredientsToShoppingList: inventoryStorage.addMissingIngredientsToShoppingList.bind(inventoryStorage),
  
  // Notification preferences
  upsertNotificationPreferences: userAuthStorage.updateUserNotificationPreferences.bind(userAuthStorage)
});

// Export domain storage modules for direct import
export { 
  // Core domains
  inventoryStorage,
  userAuthStorage,
  recipesStorage,
  chatStorage,
  analyticsStorage,
  feedbackStorage,
  notificationStorage,
  foodStorage,
  // Advanced domains
  aiMlStorage,
  systemStorage,
  supportStorage,
  billingStorage,
  experimentsStorage,
  securityStorage,
  schedulingStorage,
  pricingStorage,
  contentStorage
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
