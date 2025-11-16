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

// Import the legacy monolithic storage for methods not yet migrated
import { storage as legacyStorage } from "../storage";

/**
 * Compatibility storage object that combines domain modules with legacy storage
 * This maintains the same interface as the original monolithic storage
 */
export const storage = {
  // ============= Inventory Domain (MIGRATED) =============
  // Food Items
  getFoodItems: inventoryStorage.getFoodItems.bind(inventoryStorage),
  getFoodItemsPaginated: inventoryStorage.getFoodItemsPaginated.bind(inventoryStorage),
  getFoodItem: inventoryStorage.getFoodItem.bind(inventoryStorage),
  createFoodItem: inventoryStorage.createFoodItem.bind(inventoryStorage),
  updateFoodItem: inventoryStorage.updateFoodItem.bind(inventoryStorage),
  deleteFoodItem: inventoryStorage.deleteFoodItem.bind(inventoryStorage),
  getFoodCategories: inventoryStorage.getFoodCategories.bind(inventoryStorage),
  getExpiringItems: inventoryStorage.getExpiringItems.bind(inventoryStorage),
  
  // Storage Locations
  getStorageLocations: inventoryStorage.getStorageLocations.bind(inventoryStorage),
  getStorageLocation: inventoryStorage.getStorageLocation.bind(inventoryStorage),
  createStorageLocation: inventoryStorage.createStorageLocation.bind(inventoryStorage),
  updateStorageLocation: inventoryStorage.updateStorageLocation.bind(inventoryStorage),
  deleteStorageLocation: inventoryStorage.deleteStorageLocation.bind(inventoryStorage),
  
  // Onboarding
  getOnboardingInventory: inventoryStorage.getOnboardingInventory.bind(inventoryStorage),
  
  // ============= User/Auth Domain (MIGRATED) =============
  // Users & Auth
  getUser: userAuthStorage.getUserById.bind(userAuthStorage),
  getUserById: userAuthStorage.getUserById.bind(userAuthStorage),
  getUserByEmail: userAuthStorage.getUserByEmail.bind(userAuthStorage),
  createUser: userAuthStorage.createUser.bind(userAuthStorage),
  updateUser: userAuthStorage.updateUser.bind(userAuthStorage),
  updateUserPreferences: userAuthStorage.updateUserPreferences.bind(userAuthStorage),
  updateUserNotificationPreferences: userAuthStorage.updateUserNotificationPreferences.bind(userAuthStorage),
  deleteUser: userAuthStorage.deleteUser.bind(userAuthStorage),
  markOnboardingComplete: userAuthStorage.markOnboardingComplete.bind(userAuthStorage),
  
  // Session Management
  createSession: userAuthStorage.createSession.bind(userAuthStorage),
  getSession: userAuthStorage.getSession.bind(userAuthStorage),
  updateSession: userAuthStorage.updateSession.bind(userAuthStorage),
  deleteSession: userAuthStorage.deleteSession.bind(userAuthStorage),
  cleanupExpiredSessions: userAuthStorage.cleanupExpiredSessions.bind(userAuthStorage),
  
  // OAuth Provider Management
  linkOAuthProvider: userAuthStorage.linkOAuthProvider.bind(userAuthStorage),
  unlinkOAuthProvider: userAuthStorage.unlinkOAuthProvider.bind(userAuthStorage),
  
  // Auth Providers (MIGRATED)
  getAuthProviderByProviderAndId: userAuthStorage.getAuthProviderByProviderAndId.bind(userAuthStorage),
  getAuthProviderByProviderAndUserId: userAuthStorage.getAuthProviderByProviderAndUserId.bind(userAuthStorage),
  createAuthProvider: userAuthStorage.createAuthProvider.bind(userAuthStorage),
  updateAuthProvider: userAuthStorage.updateAuthProvider.bind(userAuthStorage),
  
  // Admin Management (MIGRATED)
  updateUserAdminStatus: userAuthStorage.updateUserAdminStatus.bind(userAuthStorage),
  getUserPreferences: userAuthStorage.getUserPreferences.bind(userAuthStorage),
  getAllUsers: userAuthStorage.getAllUsers.bind(userAuthStorage),
  getAdminCount: userAuthStorage.getAdminCount.bind(userAuthStorage),
  
  // Analytics
  getUserCount: userAuthStorage.getUserCount.bind(userAuthStorage),
  getActiveUserCount: userAuthStorage.getActiveUserCount.bind(userAuthStorage),
  getUsersByProvider: userAuthStorage.getUsersByProvider.bind(userAuthStorage),
  
  // Chat
  getChatMessages: legacyStorage.getChatMessages.bind(legacyStorage),
  getChatMessagesPaginated: legacyStorage.getChatMessagesPaginated.bind(legacyStorage),
  createChatMessage: legacyStorage.createChatMessage.bind(legacyStorage),
  
  // Conversations
  getConversations: legacyStorage.getConversations.bind(legacyStorage),
  getConversation: legacyStorage.getConversation.bind(legacyStorage),
  createConversation: legacyStorage.createConversation.bind(legacyStorage),
  updateConversation: legacyStorage.updateConversation.bind(legacyStorage),
  deleteConversation: legacyStorage.deleteConversation.bind(legacyStorage),
  getMessages: legacyStorage.getMessages.bind(legacyStorage),
  createMessage: legacyStorage.createMessage.bind(legacyStorage),
  getConversationContext: legacyStorage.getConversationContext.bind(legacyStorage),
  updateConversationContext: legacyStorage.updateConversationContext.bind(legacyStorage),
  
  // ============= Recipes Domain (MIGRATED) =============
  // Recipes
  getRecipes: recipesStorage.getRecipes.bind(recipesStorage),
  getRecipesPaginated: recipesStorage.getRecipesPaginated.bind(recipesStorage),
  getRecipe: recipesStorage.getRecipe.bind(recipesStorage),
  searchRecipes: recipesStorage.searchRecipes.bind(recipesStorage),
  searchRecipesByIngredients: recipesStorage.searchRecipesByIngredients.bind(recipesStorage),
  createRecipe: recipesStorage.createRecipe.bind(recipesStorage),
  updateRecipe: recipesStorage.updateRecipe.bind(recipesStorage),
  deleteRecipe: recipesStorage.deleteRecipe.bind(recipesStorage),
  toggleRecipeFavorite: recipesStorage.toggleRecipeFavorite.bind(recipesStorage),
  rateRecipe: recipesStorage.rateRecipe.bind(recipesStorage),
  findSimilarRecipes: recipesStorage.findSimilarRecipes.bind(recipesStorage),
  
  // Recipe Analytics
  getMostUsedRecipes: recipesStorage.getMostUsedRecipes.bind(recipesStorage),
  getRecipeCategories: recipesStorage.getRecipeCategories.bind(recipesStorage),
  getRecipeCuisines: recipesStorage.getRecipeCuisines.bind(recipesStorage),
  
  // Recipe Suggestions
  getRecipeSuggestionsBasedOnInventory: recipesStorage.getRecipeSuggestionsBasedOnInventory.bind(recipesStorage),
  getRecipeSuggestionsBasedOnExpiring: recipesStorage.getRecipeSuggestionsBasedOnExpiring.bind(recipesStorage),
  
  // Legacy method still needed (TO BE MIGRATED)
  getRecipesWithInventoryMatching: legacyStorage.getRecipesWithInventoryMatching.bind(legacyStorage),
  
  // Meal Planning
  getMealPlans: recipesStorage.getMealPlans.bind(recipesStorage),
  getMealPlansByDate: recipesStorage.getMealPlansByDate.bind(recipesStorage),
  getMealPlan: recipesStorage.getMealPlan.bind(recipesStorage),
  createMealPlan: recipesStorage.createMealPlan.bind(recipesStorage),
  updateMealPlan: recipesStorage.updateMealPlan.bind(recipesStorage),
  deleteMealPlan: recipesStorage.deleteMealPlan.bind(recipesStorage),
  markMealPlanCompleted: recipesStorage.markMealPlanCompleted.bind(recipesStorage),
  
  // Shopping Lists
  getShoppingListItems: legacyStorage.getShoppingListItems.bind(legacyStorage),
  getGroupedShoppingListItems: legacyStorage.getGroupedShoppingListItems.bind(legacyStorage),
  createShoppingListItem: legacyStorage.createShoppingListItem.bind(legacyStorage),
  updateShoppingListItem: legacyStorage.updateShoppingListItem.bind(legacyStorage),
  deleteShoppingListItem: legacyStorage.deleteShoppingListItem.bind(legacyStorage),
  clearCheckedShoppingListItems: legacyStorage.clearCheckedShoppingListItems.bind(legacyStorage),
  addMissingIngredientsToShoppingList: legacyStorage.addMissingIngredientsToShoppingList.bind(legacyStorage),
  
  // Notifications
  getPushTokens: legacyStorage.getPushTokens.bind(legacyStorage),
  deletePushToken: legacyStorage.deletePushToken.bind(legacyStorage),
  getUndismissedNotifications: legacyStorage.getUndismissedNotifications.bind(legacyStorage),
  getNotificationPreferences: legacyStorage.getNotificationPreferences.bind(legacyStorage),
  createNotificationScore: legacyStorage.createNotificationScore.bind(legacyStorage),
  getNotificationScores: legacyStorage.getNotificationScores.bind(legacyStorage),
  getPendingNotifications: legacyStorage.getPendingNotifications.bind(legacyStorage),
  updateNotificationScore: legacyStorage.updateNotificationScore.bind(legacyStorage),
  createNotificationFeedback: legacyStorage.createNotificationFeedback.bind(legacyStorage),
  getNotificationFeedback: legacyStorage.getNotificationFeedback.bind(legacyStorage),
  getRecentUserEngagement: legacyStorage.getRecentUserEngagement.bind(legacyStorage),
  
  // Appliances
  getAppliances: legacyStorage.getAppliances.bind(legacyStorage),
  getAppliance: legacyStorage.getAppliance.bind(legacyStorage),
  createAppliance: legacyStorage.createAppliance.bind(legacyStorage),
  updateAppliance: legacyStorage.updateAppliance.bind(legacyStorage),
  deleteAppliance: legacyStorage.deleteAppliance.bind(legacyStorage),
  getAppliancesByCategory: legacyStorage.getAppliancesByCategory.bind(legacyStorage),
  getAppliancesByCapability: legacyStorage.getAppliancesByCapability.bind(legacyStorage),
  getApplianceLibrary: legacyStorage.getApplianceLibrary.bind(legacyStorage),
  getApplianceLibraryByCategory: legacyStorage.getApplianceLibraryByCategory.bind(legacyStorage),
  getCommonAppliances: legacyStorage.getCommonAppliances.bind(legacyStorage),
  getUserAppliances: legacyStorage.getUserAppliances.bind(legacyStorage),
  addUserAppliance: legacyStorage.addUserAppliance.bind(legacyStorage),
  updateUserAppliance: legacyStorage.updateUserAppliance.bind(legacyStorage),
  deleteUserAppliance: legacyStorage.deleteUserAppliance.bind(legacyStorage),
  getUserAppliancesByCategory: legacyStorage.getUserAppliancesByCategory.bind(legacyStorage),
  getApplianceCategories: legacyStorage.getApplianceCategories.bind(legacyStorage),
  
  // API Usage & Analytics
  getApiUsageLogs: legacyStorage.getApiUsageLogs.bind(legacyStorage),
  getApiUsageStats: legacyStorage.getApiUsageStats.bind(legacyStorage),
  getCachedFood: legacyStorage.getCachedFood.bind(legacyStorage),
  updateFoodLastAccessed: legacyStorage.updateFoodLastAccessed.bind(legacyStorage),
  clearOldCache: legacyStorage.clearOldCache.bind(legacyStorage),
  getUSDACacheStats: legacyStorage.getUSDACacheStats.bind(legacyStorage),
  
  // Feedback
  createFeedback: legacyStorage.createFeedback.bind(legacyStorage),
  getFeedback: legacyStorage.getFeedback.bind(legacyStorage),
  getUserFeedback: legacyStorage.getUserFeedback.bind(legacyStorage),
  getAllFeedback: legacyStorage.getAllFeedback.bind(legacyStorage),
  getCommunityFeedback: legacyStorage.getCommunityFeedback.bind(legacyStorage),
  getCommunityFeedbackForUser: legacyStorage.getCommunityFeedbackForUser.bind(legacyStorage),
  
  // Add any other methods that routers are using...
  // This list will grow as we discover more methods during migration
};

// Export domain storage modules for direct import
export { inventoryStorage } from "./domains/inventory.storage";

// Export types
export type { IInventoryStorage } from "./interfaces/IInventoryStorage";
export type { IUserStorage } from "./interfaces/IUserStorage";
export type { IRecipeStorage } from "./interfaces/IRecipeStorage";
export type { IChatStorage } from "./interfaces/IChatStorage";
export type { IMealPlanningStorage } from "./interfaces/IMealPlanningStorage";
export type { IStorage } from "./interfaces/IStorage";