/**
 * @file server/storage/interfaces/IStorage.ts
 * @description Main Storage Interface - Aggregates all domain-specific storage interfaces
 * 
 * This module provides type definitions for the storage layer architecture.
 * StorageRoot organizes storage into three facade tiers:
 * 
 * USER TIER (UserStorage facade):
 * - IUserStorage: User management, sessions, OAuth providers, preferences
 * - IRecipesStorage: Recipe CRUD, meal planning, suggestions
 * - IInventoryStorage: Food items, storage locations, shopping lists
 * - IFoodStorage: Alternative food inventory with cooking terms
 * - IChatStorage: Chat messages and AI assistant interactions
 * - INotificationStorage: Push tokens, notifications, preferences
 * - ISchedulingStorage: Meeting scheduling, preferences, patterns
 * 
 * ADMIN TIER (AdminStorage facade):
 * - IBillingStorage: Donations, payment processing
 * - ISecurityStorage: Moderation, fraud detection, privacy
 * - IPricingStorage: Dynamic pricing, price optimization
 * - IExperimentsStorage: A/B testing, cohort analysis
 * - ISupportStorage: Support tickets, agent routing
 * 
 * PLATFORM TIER (PlatformStorage facade):
 * - IAnalyticsStorage: API usage, web vitals, events, sessions
 * - IAiMlStorage: Voice commands, drafts, translations, transcriptions
 * - ISystemStorage: Activity logs, system metrics, maintenance
 * - IContentStorage: Categories, tags, content embeddings
 * - IFeedbackStorage: User feedback, community features
 */

// ==================== USER TIER IMPORTS ====================
import type { IUserStorage, UserPreferences } from "./IUserStorage";
import type { IRecipesStorage, RecipeFilter } from "./IRecipesStorage";
import type { 
  IInventoryStorage, 
  FoodItemFilter, 
  ExpiringItemsResult, 
  GroupedShoppingItemsResult 
} from "./IInventoryStorage";
import type { IFoodStorage, FoodSortBy } from "./IFoodStorage";
import type { IChatStorage } from "./IChatStorage";
import type { INotificationStorage, NotificationStats } from "./INotificationStorage";
import type { ISchedulingStorage } from "./ISchedulingStorage";

// ==================== ADMIN TIER IMPORTS ====================
import type { IBillingStorage } from "./IBillingStorage";
import type { ISecurityStorage } from "./ISecurityStorage";
import type { IPricingStorage } from "./IPricingStorage";
import type { IExperimentsStorage } from "./IExperimentsStorage";
import type { ISupportStorage } from "./ISupportStorage";

// ==================== PLATFORM TIER IMPORTS ====================
import type { IAnalyticsStorage } from "./IAnalyticsStorage";
import type { IAiMlStorage } from "./IAiMlStorage";
import type { ISystemStorage } from "./ISystemStorage";
import type { IContentStorage } from "./IContentStorage";
import type { IFeedbackStorage, FeedbackAnalytics } from "./IFeedbackStorage";

// ==================== RE-EXPORTS FOR CONVENIENCE ====================
// User tier
export type { IUserStorage, UserPreferences } from "./IUserStorage";
export type { IRecipesStorage, RecipeFilter } from "./IRecipesStorage";
export type { 
  IInventoryStorage, 
  FoodItemFilter, 
  ExpiringItemsResult, 
  GroupedShoppingItemsResult 
} from "./IInventoryStorage";
export type { IFoodStorage, FoodSortBy } from "./IFoodStorage";
export type { IChatStorage } from "./IChatStorage";
export type { INotificationStorage, NotificationStats } from "./INotificationStorage";
export type { ISchedulingStorage } from "./ISchedulingStorage";

// Admin tier
export type { IBillingStorage } from "./IBillingStorage";
export type { ISecurityStorage } from "./ISecurityStorage";
export type { IPricingStorage } from "./IPricingStorage";
export type { IExperimentsStorage } from "./IExperimentsStorage";
export type { ISupportStorage } from "./ISupportStorage";

// Platform tier
export type { IAnalyticsStorage } from "./IAnalyticsStorage";
export type { IAiMlStorage } from "./IAiMlStorage";
export type { ISystemStorage } from "./ISystemStorage";
export type { IContentStorage } from "./IContentStorage";
export type { IFeedbackStorage, FeedbackAnalytics } from "./IFeedbackStorage";

// Re-export StorageLocationWithCount from domain for consumers
export type { StorageLocationWithCount } from "./IFoodStorage";

/**
 * User Storage Facade Interface
 * Groups all user-related storage domains
 */
export interface IUserStorageFacade {
  readonly user: IUserStorage;
  readonly recipes: IRecipesStorage;
  readonly inventory: IInventoryStorage;
  readonly food: IFoodStorage;
  readonly chat: IChatStorage;
  readonly notifications: INotificationStorage;
  readonly scheduling: ISchedulingStorage;
}

/**
 * Admin Storage Facade Interface
 * Groups all administrative storage domains
 */
export interface IAdminStorageFacade {
  readonly billing: IBillingStorage;
  readonly security: ISecurityStorage;
  readonly pricing: IPricingStorage;
  readonly experiments: IExperimentsStorage;
  readonly support: ISupportStorage;
}

/**
 * Platform Storage Facade Interface
 * Groups all platform-wide storage domains
 */
export interface IPlatformStorageFacade {
  readonly analytics: IAnalyticsStorage;
  readonly ai: IAiMlStorage;
  readonly system: ISystemStorage;
  readonly content: IContentStorage;
  readonly feedback: IFeedbackStorage;
}

/**
 * Storage tier types for tier-specific operations
 * Uses intersection types to combine interfaces within each tier
 */
export type UserTierStorage = 
  IUserStorage & 
  IRecipesStorage & 
  IInventoryStorage & 
  IChatStorage & 
  INotificationStorage & 
  ISchedulingStorage;

export type AdminTierStorage = 
  IBillingStorage & 
  ISecurityStorage & 
  IPricingStorage & 
  IExperimentsStorage & 
  ISupportStorage;

export type PlatformTierStorage = 
  IAnalyticsStorage & 
  IAiMlStorage & 
  ISystemStorage & 
  IContentStorage & 
  IFeedbackStorage;

/**
 * IStorage Interface
 * 
 * Provides type-safe access to the storage layer through three facade tiers.
 * This matches the structure of StorageRoot which delegates to facade instances.
 * 
 * Note: Due to method signature conflicts between some domain interfaces
 * (e.g., getApiUsageLogs in IAnalyticsStorage vs ISystemStorage, createDonation
 * in IBillingStorage vs IFeedbackStorage), we use facade accessors instead of
 * directly extending all interfaces. This provides cleaner separation and
 * avoids TypeScript interface inheritance conflicts.
 * 
 * Usage:
 * ```typescript
 * // Access via facades (recommended)
 * storage.user.recipes.getRecipes(userId);
 * storage.admin.billing.createDonation(donation);
 * storage.platform.analytics.logApiUsage(...);
 * 
 * // Direct method access (for backward compatibility)
 * storage.getRecipes(userId);
 * storage.createDonation(donation);
 * ```
 */
export interface IStorage {
  /**
   * User tier facade - handles user-facing features
   * Includes: user auth, recipes, inventory, food, chat, notifications, scheduling
   */
  readonly user: IUserStorageFacade;
  
  /**
   * Admin tier facade - handles administrative functions
   * Includes: billing, security, pricing, experiments, support
   */
  readonly admin: IAdminStorageFacade;
  
  /**
   * Platform tier facade - handles platform-wide services
   * Includes: analytics, AI/ML, system, content, feedback
   */
  readonly platform: IPlatformStorageFacade;
}

/**
 * StorageRoot type alias
 * The actual implementation class that provides IStorage interface
 */
export type StorageRootType = IStorage;

/**
 * Partial storage type for dependency injection
 * Allows services to specify only the storage domains they need
 */
export type PartialStorage = Partial<IStorage>;

/**
 * All domain storage interfaces as a union
 * Useful for type guards and conditional logic
 */
export type AnyDomainStorage = 
  | IUserStorage
  | IRecipesStorage
  | IInventoryStorage
  | IFoodStorage
  | IChatStorage
  | INotificationStorage
  | ISchedulingStorage
  | IBillingStorage
  | ISecurityStorage
  | IPricingStorage
  | IExperimentsStorage
  | ISupportStorage
  | IAnalyticsStorage
  | IAiMlStorage
  | ISystemStorage
  | IContentStorage
  | IFeedbackStorage;

/**
 * Domain storage names for runtime type checking
 */
export type UserDomainName = 'user' | 'recipes' | 'inventory' | 'food' | 'chat' | 'notifications' | 'scheduling';
export type AdminDomainName = 'billing' | 'security' | 'pricing' | 'experiments' | 'support';
export type PlatformDomainName = 'analytics' | 'ai' | 'system' | 'content' | 'feedback';
export type DomainName = UserDomainName | AdminDomainName | PlatformDomainName;
