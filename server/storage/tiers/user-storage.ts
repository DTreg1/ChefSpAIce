/**
 * @file server/storage/tiers/user-storage.ts
 * @description UserStorage tier - Manages all user-specific data and operations
 * 
 * This tier consolidates 6 domain modules:
 * - inventoryStorage: Food items, expiration tracking, shopping lists
 * - foodStorage: Food data, storage locations, cooking terms
 * - recipesStorage: Recipe CRUD, meal planning, suggestions
 * - userStorage: User management, OAuth, sessions, preferences
 * - chatStorage: AI conversation history, messages
 * - feedbackStorage: User feedback, donations, community features
 * - notificationStorage: Push tokens, notification preferences, engagement
 */

import { inventoryStorage } from "../domains/inventory.storage";
import { FoodStorage } from "../domains/food.storage";
import { recipesStorage } from "../domains/recipes.storage";
import { userStorage } from "../domains/user.storage";
import { chatStorage } from "../domains/chat.storage";
import { FeedbackStorage } from "../domains/feedback.storage";
import { NotificationStorage } from "../domains/notification.storage";

// Import interfaces
import type { IInventoryStorage } from "../interfaces/IInventoryStorage";
import type { IFoodStorage } from "../interfaces/IFoodStorage";
import type { IRecipesStorage } from "../interfaces/IRecipesStorage";
import type { IUserStorage } from "../interfaces/IUserStorage";
import type { IChatStorage } from "../interfaces/IChatStorage";
import type { IFeedbackStorage } from "../interfaces/IFeedbackStorage";
import type { INotificationStorage } from "../interfaces/INotificationStorage";

/**
 * UserStorage consolidates all user-specific storage operations
 * 
 * Key responsibilities:
 * - User account management and authentication
 * - Food inventory and expiration tracking
 * - Recipe management and meal planning
 * - Chat conversations with AI assistant
 * - User feedback and community features
 * - Notification preferences and push tokens
 */
export class UserStorage implements 
  IInventoryStorage, 
  IFoodStorage, 
  IRecipesStorage, 
  IUserStorage, 
  IChatStorage, 
  IFeedbackStorage, 
  INotificationStorage {
  
  private inventory: IInventoryStorage;
  private food: IFoodStorage;
  private recipes: IRecipesStorage;
  private users: IUserStorage;
  private chat: IChatStorage;
  private feedback: IFeedbackStorage;
  private notifications: INotificationStorage;

  constructor() {
    this.inventory = inventoryStorage;
    this.food = new FoodStorage();
    this.recipes = recipesStorage;
    this.users = userStorage;
    this.chat = chatStorage;
    this.feedback = new FeedbackStorage();
    this.notifications = new NotificationStorage();
  }

  // ============= Inventory Management =============
  getFoodItems = this.inventory.getFoodItems.bind(this.inventory);
  getFoodItemsPaginated = this.inventory.getFoodItemsPaginated.bind(this.inventory);
  getFoodItem = this.inventory.getFoodItem.bind(this.inventory);
  createFoodItem = this.inventory.createFoodItem.bind(this.inventory);
  updateFoodItem = this.inventory.updateFoodItem.bind(this.inventory);
  deleteFoodItem = this.inventory.deleteFoodItem.bind(this.inventory);
  getFoodCategories = this.inventory.getFoodCategories.bind(this.inventory);
  getExpiringItems = this.inventory.getExpiringItems.bind(this.inventory);
  getStorageLocations = this.inventory.getStorageLocations.bind(this.inventory);
  getStorageLocation = this.inventory.getStorageLocation.bind(this.inventory);
  createStorageLocation = this.inventory.createStorageLocation.bind(this.inventory);
  updateStorageLocation = this.inventory.updateStorageLocation.bind(this.inventory);
  deleteStorageLocation = this.inventory.deleteStorageLocation.bind(this.inventory);
  getShoppingItems = this.inventory.getShoppingItems.bind(this.inventory);
  getGroupedShoppingItems = this.inventory.getGroupedShoppingItems.bind(this.inventory);
  createShoppingItem = this.inventory.createShoppingItem.bind(this.inventory);
  updateShoppingItem = this.inventory.updateShoppingItem.bind(this.inventory);
  deleteShoppingItem = this.inventory.deleteShoppingItem.bind(this.inventory);
  clearCheckedShoppingItems = this.inventory.clearCheckedShoppingItems.bind(this.inventory);
  addMissingIngredientsToShoppingList = this.inventory.addMissingIngredientsToShoppingList.bind(this.inventory);

  // ============= Food Storage (Cooking Terms) =============
  getCookingTerms = this.food.getCookingTerms.bind(this.food);
  getCookingTerm = this.food.getCookingTerm.bind(this.food);
  getCookingTermByTerm = this.food.getCookingTermByTerm.bind(this.food);
  getCookingTermsByCategory = this.food.getCookingTermsByCategory.bind(this.food);
  createCookingTerm = this.food.createCookingTerm.bind(this.food);
  updateCookingTerm = this.food.updateCookingTerm.bind(this.food);
  deleteCookingTerm = this.food.deleteCookingTerm.bind(this.food);
  searchCookingTerms = this.food.searchCookingTerms.bind(this.food);

  // ============= Recipe Management =============
  getRecipes = this.recipes.getRecipes.bind(this.recipes);
  getRecipesPaginated = this.recipes.getRecipesPaginated.bind(this.recipes);
  getRecipe = this.recipes.getRecipe.bind(this.recipes);
  searchRecipes = this.recipes.searchRecipes.bind(this.recipes);
  searchRecipesByIngredients = this.recipes.searchRecipesByIngredients.bind(this.recipes);
  createRecipe = this.recipes.createRecipe.bind(this.recipes);
  updateRecipe = this.recipes.updateRecipe.bind(this.recipes);
  deleteRecipe = this.recipes.deleteRecipe.bind(this.recipes);
  toggleRecipeFavorite = this.recipes.toggleRecipeFavorite.bind(this.recipes);
  rateRecipe = this.recipes.rateRecipe.bind(this.recipes);
  findSimilarRecipes = this.recipes.findSimilarRecipes.bind(this.recipes);
  getMealPlans = this.recipes.getMealPlans.bind(this.recipes);
  getMealPlansByDate = this.recipes.getMealPlansByDate.bind(this.recipes);
  getMealPlan = this.recipes.getMealPlan.bind(this.recipes);
  createMealPlan = this.recipes.createMealPlan.bind(this.recipes);
  updateMealPlan = this.recipes.updateMealPlan.bind(this.recipes);
  deleteMealPlan = this.recipes.deleteMealPlan.bind(this.recipes);
  markMealPlanCompleted = this.recipes.markMealPlanCompleted.bind(this.recipes);
  getMostUsedRecipes = this.recipes.getMostUsedRecipes.bind(this.recipes);
  getRecipeCategories = this.recipes.getRecipeCategories.bind(this.recipes);
  getRecipeCuisines = this.recipes.getRecipeCuisines.bind(this.recipes);
  getRecipeSuggestionsBasedOnInventory = this.recipes.getRecipeSuggestionsBasedOnInventory.bind(this.recipes);
  getRecipeSuggestionsBasedOnExpiring = this.recipes.getRecipeSuggestionsBasedOnExpiring.bind(this.recipes);

  // ============= User Management =============
  getUserById = this.users.getUserById.bind(this.users);
  getUserByEmail = this.users.getUserByEmail.bind(this.users);
  getUserByPrimaryProviderId = this.users.getUserByPrimaryProviderId.bind(this.users);
  createUser = this.users.createUser.bind(this.users);
  updateUser = this.users.updateUser.bind(this.users);
  deleteUser = this.users.deleteUser.bind(this.users);
  updateUserPreferences = this.users.updateUserPreferences.bind(this.users);
  updateUserNotificationPreferences = this.users.updateUserNotificationPreferences.bind(this.users);
  markOnboardingComplete = this.users.markOnboardingComplete.bind(this.users);
  createSession = this.users.createSession.bind(this.users);
  getSession = this.users.getSession.bind(this.users);
  updateSession = this.users.updateSession.bind(this.users);
  deleteSession = this.users.deleteSession.bind(this.users);
  cleanupExpiredSessions = this.users.cleanupExpiredSessions.bind(this.users);
  linkOAuthProvider = this.users.linkOAuthProvider.bind(this.users);
  unlinkOAuthProvider = this.users.unlinkOAuthProvider.bind(this.users);
  getAuthProviderByProviderAndId = this.users.getAuthProviderByProviderAndId.bind(this.users);
  getAuthProviderByProviderAndUserId = this.users.getAuthProviderByProviderAndUserId.bind(this.users);
  createAuthProvider = this.users.createAuthProvider.bind(this.users);
  updateAuthProvider = this.users.updateAuthProvider.bind(this.users);
  updateUserAdminStatus = this.users.updateUserAdminStatus.bind(this.users);
  getAdminCount = this.users.getAdminCount.bind(this.users);
  getAllUsers = this.users.getAllUsers.bind(this.users);
  getUserPreferences = this.users.getUserPreferences.bind(this.users);
  getUserCount = this.users.getUserCount.bind(this.users);
  getActiveUserCount = this.users.getActiveUserCount.bind(this.users);
  getUsersByProvider = this.users.getUsersByProvider.bind(this.users);
  ensureDefaultDataForUser = this.users.ensureDefaultDataForUser.bind(this.users);

  // ============= Chat Management =============
  getChatMessages = this.chat.getChatMessages.bind(this.chat);
  getChatMessagesPaginated = this.chat.getChatMessagesPaginated.bind(this.chat);
  createChatMessage = this.chat.createChatMessage.bind(this.chat);
  deleteChatHistory = this.chat.deleteChatHistory.bind(this.chat);

  // ============= Feedback Management =============
  createFeedback = this.feedback.createFeedback.bind(this.feedback);
  getFeedback = this.feedback.getFeedback.bind(this.feedback);
  getUserFeedback = this.feedback.getUserFeedback.bind(this.feedback);
  getAllFeedback = this.feedback.getAllFeedback.bind(this.feedback);
  getCommunityFeedback = this.feedback.getCommunityFeedback.bind(this.feedback);
  getCommunityFeedbackForUser = this.feedback.getCommunityFeedbackForUser.bind(this.feedback);
  updateFeedbackStatus = this.feedback.updateFeedbackStatus.bind(this.feedback);
  getFeedbackByContext = this.feedback.getFeedbackByContext.bind(this.feedback);
  addFeedbackResponse = this.feedback.addFeedbackResponse.bind(this.feedback);
  getFeedbackResponses = this.feedback.getFeedbackResponses.bind(this.feedback);
  getFeedbackAnalytics = this.feedback.getFeedbackAnalytics.bind(this.feedback);
  upvoteFeedback = this.feedback.upvoteFeedback.bind(this.feedback);
  removeUpvote = this.feedback.removeUpvote.bind(this.feedback);
  hasUserUpvoted = this.feedback.hasUserUpvoted.bind(this.feedback);
  getFeedbackUpvoteCount = this.feedback.getFeedbackUpvoteCount.bind(this.feedback);
  createDonation = this.feedback.createDonation.bind(this.feedback);
  updateDonation = this.feedback.updateDonation.bind(this.feedback);
  getDonation = this.feedback.getDonation.bind(this.feedback);
  getDonationByPaymentIntent = this.feedback.getDonationByPaymentIntent.bind(this.feedback);
  getDonations = this.feedback.getDonations.bind(this.feedback);
  getUserDonations = this.feedback.getUserDonations.bind(this.feedback);
  getTotalDonations = this.feedback.getTotalDonations.bind(this.feedback);

  // ============= Notification Management =============
  savePushToken = this.notifications.savePushToken.bind(this.notifications);
  getUserPushTokens = this.notifications.getUserPushTokens.bind(this.notifications);
  deletePushToken = this.notifications.deletePushToken.bind(this.notifications);
  deleteUserPushTokens = this.notifications.deleteUserPushTokens.bind(this.notifications);
  createNotification = this.notifications.createNotification.bind(this.notifications);
  getNotification = this.notifications.getNotification.bind(this.notifications);
  getUserNotifications = this.notifications.getUserNotifications.bind(this.notifications);
  getUndismissedNotifications = this.notifications.getUndismissedNotifications.bind(this.notifications);
  dismissNotification = this.notifications.dismissNotification.bind(this.notifications);
  markNotificationRead = this.notifications.markNotificationRead.bind(this.notifications);
  getPendingNotifications = this.notifications.getPendingNotifications.bind(this.notifications);
  getNotificationPreferences = this.notifications.getNotificationPreferences.bind(this.notifications);
  getAllNotificationPreferences = this.notifications.getAllNotificationPreferences.bind(this.notifications);
  getNotificationPreferenceByType = this.notifications.getNotificationPreferenceByType.bind(this.notifications);
  upsertNotificationPreferences = this.notifications.upsertNotificationPreferences.bind(this.notifications);
  createNotificationScore = this.notifications.createNotificationScore.bind(this.notifications);
  getNotificationScores = this.notifications.getNotificationScores.bind(this.notifications);
  getNotificationScoreByType = this.notifications.getNotificationScoreByType.bind(this.notifications);
  updateNotificationScore = this.notifications.updateNotificationScore.bind(this.notifications);
  createNotificationFeedback = this.notifications.createNotificationFeedback.bind(this.notifications);
  getNotificationFeedback = this.notifications.getNotificationFeedback.bind(this.notifications);
  getUserNotificationFeedback = this.notifications.getUserNotificationFeedback.bind(this.notifications);
  getRecentUserEngagement = this.notifications.getRecentUserEngagement.bind(this.notifications);
  getNotificationStats = this.notifications.getNotificationStats.bind(this.notifications);
}