/**
 * StorageRoot - Composes all storage tiers into a single unified interface
 * Maintains all existing method signatures while delegating to appropriate facades
 */

import { UserStorage } from "./facades/UserStorage";
import { AdminStorage } from "./facades/AdminStorage";
import { PlatformStorage } from "./facades/PlatformStorage";

/**
 * StorageRoot class that composes all three storage tiers
 * This provides a single point of access for all storage operations
 */
export class StorageRoot {
  public readonly user: UserStorage;
  public readonly admin: AdminStorage;
  public readonly platform: PlatformStorage;

  constructor() {
    this.user = new UserStorage();
    this.admin = new AdminStorage();
    this.platform = new PlatformStorage();
  }

  // ==================== User Management ====================
  async getUserById(id: string) {
    return this.user.user.getUserById(id);
  }

  async getUserByEmail(email: string) {
    return this.user.user.getUserByEmail(email);
  }

  async getUserByPrimaryProviderId(provider: string, providerId: string) {
    return this.user.user.getUserByPrimaryProviderId(provider, providerId);
  }

  async createUser(userData: any) {
    return this.user.user.createUser(userData);
  }

  async updateUser(id: string, userData: any) {
    return this.user.user.updateUser(id, userData);
  }

  async deleteUser(id: string) {
    return this.user.user.deleteUser(id);
  }

  async updateUserPreferences(userId: string, preferences: any) {
    return this.user.user.updateUserPreferences(userId, preferences);
  }

  async getUserPreferences(userId: string) {
    return this.user.user.getUserPreferences(userId);
  }

  async markOnboardingComplete(userId: string) {
    return this.user.user.markOnboardingComplete(userId);
  }

  // ==================== Session Management ====================
  async createSession(sessionData: any) {
    return this.user.user.createSession(sessionData);
  }

  async getSession(sessionId: string) {
    return this.user.user.getSession(sessionId);
  }

  async updateSession(sessionId: string, data: any) {
    return this.user.user.updateSession(sessionId, data);
  }

  async deleteSession(sessionId: string) {
    return this.user.user.deleteSession(sessionId);
  }

  async cleanupExpiredSessions() {
    return this.user.user.cleanupExpiredSessions();
  }

  // ==================== Auth Providers ====================
  async linkOAuthProvider(userId: string, provider: string, providerId: string, accessToken?: string, refreshToken?: string) {
    return this.user.user.linkOAuthProvider(userId, provider, providerId, accessToken, refreshToken);
  }

  async unlinkOAuthProvider(userId: string, provider: string) {
    return this.user.user.unlinkOAuthProvider(userId, provider);
  }

  async getAuthProviderByProviderAndId(provider: string, providerId: string) {
    return this.user.user.getAuthProviderByProviderAndId(provider, providerId);
  }

  async getAuthProviderByProviderAndUserId(provider: string, userId: string) {
    return this.user.user.getAuthProviderByProviderAndUserId(provider, userId);
  }

  async createAuthProvider(data: any) {
    return this.user.user.createAuthProvider(data);
  }

  async updateAuthProvider(id: string, data: any) {
    return this.user.user.updateAuthProvider(id, data);
  }

  // ==================== Food & Inventory ====================
  async getFoodItems(userId: string, storageLocationId?: string) {
    return this.user.inventory.getFoodItems(userId, storageLocationId);
  }

  async getFoodItemsPaginated(userId: string, limit?: number, offset?: number, storageLocationId?: string) {
    return this.user.inventory.getFoodItemsPaginated(userId, limit, offset, storageLocationId);
  }

  async getFoodItem(id: string, userId: string) {
    return this.user.inventory.getFoodItem(id, userId);
  }

  async createFoodItem(data: any) {
    return this.user.inventory.createFoodItem(data);
  }

  async updateFoodItem(id: string, userId: string, data: any) {
    return this.user.inventory.updateFoodItem(id, userId, data);
  }

  async deleteFoodItem(id: string, userId: string) {
    return this.user.inventory.deleteFoodItem(id, userId);
  }

  async getExpiringItems(userId: string, daysAhead?: number) {
    return this.user.inventory.getExpiringItems(userId, daysAhead);
  }

  async getStorageLocations(userId: string) {
    return this.user.inventory.getStorageLocations(userId);
  }

  async getStorageLocation(id: string, userId: string) {
    return this.user.inventory.getStorageLocation(id, userId);
  }

  async createStorageLocation(data: any) {
    return this.user.inventory.createStorageLocation(data);
  }

  async updateStorageLocation(id: string, userId: string, data: any) {
    return this.user.inventory.updateStorageLocation(id, userId, data);
  }

  async deleteStorageLocation(id: string, userId: string) {
    return this.user.inventory.deleteStorageLocation(id, userId);
  }

  // ==================== Shopping ====================
  async getShoppingItems(userId: string) {
    return this.user.inventory.getShoppingItems(userId);
  }

  async getGroupedShoppingItems(userId: string) {
    return this.user.inventory.getGroupedShoppingItems(userId);
  }

  async createShoppingItem(data: any) {
    return this.user.inventory.createShoppingItem(data);
  }

  async updateShoppingItem(id: string, userId: string, data: any) {
    return this.user.inventory.updateShoppingItem(id, userId, data);
  }

  async deleteShoppingItem(id: string, userId: string) {
    return this.user.inventory.deleteShoppingItem(id, userId);
  }

  async clearCheckedShoppingItems(userId: string) {
    return this.user.inventory.clearCheckedShoppingItems(userId);
  }

  // ==================== Recipes ====================
  async getRecipes(userId: string) {
    return this.user.recipes.getRecipes(userId);
  }

  async getRecipesPaginated(userId: string, limit?: number, offset?: number) {
    return this.user.recipes.getRecipesPaginated(userId, limit, offset);
  }

  async getRecipe(id: string, userId: string) {
    return this.user.recipes.getRecipe(id, userId);
  }

  async searchRecipes(userId: string, query: string) {
    return this.user.recipes.searchRecipes(userId, query);
  }

  async createRecipe(data: any) {
    return this.user.recipes.createRecipe(data);
  }

  async updateRecipe(id: string, userId: string, data: any) {
    return this.user.recipes.updateRecipe(id, userId, data);
  }

  async deleteRecipe(id: string, userId: string) {
    return this.user.recipes.deleteRecipe(id, userId);
  }

  async toggleRecipeFavorite(id: string, userId: string) {
    return this.user.recipes.toggleRecipeFavorite(id, userId);
  }

  async rateRecipe(id: string, userId: string, rating: number) {
    return this.user.recipes.rateRecipe(id, userId, rating);
  }

  // ==================== Chat ====================
  async getChatMessages(userId: string) {
    return this.user.chat.getChatMessages(userId);
  }

  async getChatMessagesPaginated(userId: string, limit?: number, offset?: number) {
    return this.user.chat.getChatMessagesPaginated(userId, limit, offset);
  }

  async createChatMessage(data: any) {
    return this.user.chat.createChatMessage(data);
  }

  async deleteChatHistory(userId: string) {
    return this.user.chat.deleteChatHistory(userId);
  }

  // ==================== Notifications ====================
  async savePushToken(data: any) {
    return this.user.notifications.savePushToken(data);
  }

  async getUserPushTokens(userId: string) {
    return this.user.notifications.getUserPushTokens(userId);
  }

  async deletePushToken(tokenId: string) {
    return this.user.notifications.deletePushToken(tokenId);
  }

  async createNotification(data: any) {
    return this.user.notifications.createNotification(data);
  }

  async getNotification(id: string) {
    return this.user.notifications.getNotification(id);
  }

  async getUserNotifications(userId: string, limit?: number) {
    return this.user.notifications.getUserNotifications(userId, limit);
  }

  async getUndismissedNotifications(userId: string) {
    return this.user.notifications.getUndismissedNotifications(userId);
  }

  async dismissNotification(id: string) {
    return this.user.notifications.dismissNotification(id);
  }

  async markNotificationRead(id: string) {
    return this.user.notifications.markNotificationRead(id);
  }

  async getNotificationPreferences(userId: string) {
    return this.user.notifications.getNotificationPreferences(userId);
  }

  async upsertNotificationPreferences(userId: string, preferences: Record<string, boolean>) {
    return this.user.notifications.upsertNotificationPreferences(userId, preferences);
  }

  // ==================== Billing ====================
  async createDonation(donation: any) {
    return this.admin.billing.createDonation(donation);
  }

  async updateDonation(stripePaymentIntentId: string, updates: any) {
    return this.admin.billing.updateDonation(stripePaymentIntentId, updates);
  }

  async getDonationById(id: string) {
    return this.admin.billing.getDonationById(id);
  }

  async getDonationByPaymentIntent(stripePaymentIntentId: string) {
    return this.admin.billing.getDonationByPaymentIntent(stripePaymentIntentId);
  }

  async getUserDonations(userId: string) {
    return this.admin.billing.getUserDonations(userId);
  }

  async getDonations(limit?: number, offset?: number) {
    return this.admin.billing.getDonations(limit, offset);
  }

  async getTotalDonations() {
    return this.admin.billing.getTotalDonations();
  }

  async getTotalDonationsByUser(userId: string) {
    return this.admin.billing.getTotalDonationsByUser(userId);
  }

  async getDonationStats(startDate?: Date, endDate?: Date) {
    return this.admin.billing.getDonationStats(startDate, endDate);
  }

  async getMonthlyDonations(months?: number) {
    return this.admin.billing.getMonthlyDonations(months);
  }

  async getTopDonors(limit?: number) {
    return this.admin.billing.getTopDonors(limit);
  }

  // ==================== Support Tickets ====================
  async getTickets(filters?: any) {
    return this.admin.support.getTickets(filters);
  }

  async getTicket(ticketId: string) {
    return this.admin.support.getTicket(ticketId);
  }

  async createTicket(ticket: any) {
    return this.admin.support.createTicket(ticket);
  }

  async updateTicket(ticketId: string, updates: any) {
    return this.admin.support.updateTicket(ticketId, updates);
  }

  async deleteTicket(ticketId: string) {
    return this.admin.support.deleteTicket(ticketId);
  }

  async assignTicket(ticketId: string, agentId: string) {
    return this.admin.support.assignTicket(ticketId, agentId);
  }

  async escalateTicket(ticketId: string, reason: string) {
    return this.admin.support.escalateTicket(ticketId, reason);
  }

  async resolveTicket(ticketId: string, resolution: string) {
    return this.admin.support.resolveTicket(ticketId, resolution);
  }

  async addTicketResponse(response: any) {
    return this.admin.support.addTicketResponse(response);
  }

  async getTicketResponses(ticketId: string) {
    return this.admin.support.getTicketResponses(ticketId);
  }

  async getTicketStats(period?: "day" | "week" | "month") {
    return this.admin.support.getTicketStats(period);
  }

  // ==================== Security ====================
  async createModerationLog(log: any) {
    return this.admin.security.createModerationLog(log);
  }

  async getModerationLogs(filters?: any) {
    return this.admin.security.getModerationLogs(filters);
  }

  async getModerationLogById(id: string) {
    return this.admin.security.getModerationLogById(id);
  }

  async updateModerationLog(id: string, updates: any) {
    return this.admin.security.updateModerationLog(id, updates);
  }

  async getUserModerationHistory(userId: string) {
    return this.admin.security.getUserModerationHistory(userId);
  }

  async getModerationStats(period?: "day" | "week" | "month") {
    return this.admin.security.getModerationStats(period);
  }

  async createFraudScore(score: any) {
    return this.admin.security.createFraudScore(score);
  }

  async updateFraudScore(userId: string, score: number) {
    return this.admin.security.updateFraudScore(userId, score);
  }

  async getUserFraudScore(userId: string) {
    return this.admin.security.getUserFraudScore(userId);
  }

  async getFraudScoreHistory(userId: string, limit?: number) {
    return this.admin.security.getFraudScoreHistory(userId, limit);
  }

  async getHighRiskUsers(threshold?: number, limit?: number) {
    return this.admin.security.getHighRiskUsers(threshold, limit);
  }

  async recordFraudAttempt(activity: any) {
    return this.admin.security.recordFraudAttempt(activity);
  }

  async getFraudAttempts(userId?: string, limit?: number) {
    return this.admin.security.getFraudAttempts(userId, limit);
  }

  async getPrivacySettings(userId: string) {
    return this.admin.security.getPrivacySettings(userId);
  }

  async updatePrivacySettings(userId: string, settings: any) {
    return this.admin.security.updatePrivacySettings(userId, settings);
  }

  async logPrivacyRequest(request: any) {
    return this.admin.security.logPrivacyRequest(request);
  }

  async getPrivacyRequests(userId?: string, status?: string) {
    return this.admin.security.getPrivacyRequests(userId, status);
  }

  async processPrivacyRequest(requestId: string, status: string, processedBy: string) {
    return this.admin.security.processPrivacyRequest(requestId, status, processedBy);
  }

  // ==================== Pricing ====================
  async getPricingRules() {
    return this.admin.pricing.getPricingRules();
  }

  async getPricingRule(id: string) {
    return this.admin.pricing.getPricingRule(id);
  }

  async createPricingRule(rule: any) {
    return this.admin.pricing.createPricingRule(rule);
  }

  async updatePricingRule(id: string, rule: any) {
    return this.admin.pricing.updatePricingRule(id, rule);
  }

  async deletePricingRule(id: string) {
    return this.admin.pricing.deletePricingRule(id);
  }

  async getPricingRuleByProduct(productId: string) {
    return this.admin.pricing.getPricingRuleByProduct(productId);
  }

  async recordPriceChange(history: any) {
    return this.admin.pricing.recordPriceChange(history);
  }

  async getPriceHistory(productId: string, params?: any) {
    return this.admin.pricing.getPriceHistory(productId, params);
  }

  async recordPricingPerformance(performance: any) {
    return this.admin.pricing.recordPricingPerformance(performance);
  }

  async getPricingPerformance(productId: string, startDate?: Date, endDate?: Date) {
    return this.admin.pricing.getPricingPerformance(productId, startDate, endDate);
  }

  async getPricingMetrics(productId: string, period?: "day" | "week" | "month") {
    return this.admin.pricing.getPricingMetrics(productId, period);
  }

  // ==================== Experiments ====================
  async createAbTest(test: any) {
    return this.admin.experiments.createAbTest(test);
  }

  async getAbTest(testId: string) {
    return this.admin.experiments.getAbTest(testId);
  }

  async getAbTests(filters?: any) {
    return this.admin.experiments.getAbTests(filters);
  }

  async updateAbTest(testId: string, update: any) {
    return this.admin.experiments.updateAbTest(testId, update);
  }

  async deleteAbTest(testId: string) {
    return this.admin.experiments.deleteAbTest(testId);
  }

  async upsertAbTestResult(result: any) {
    return this.admin.experiments.upsertAbTestResult(result);
  }

  async getAbTestResults(testId: string, variant?: string) {
    return this.admin.experiments.getAbTestResults(testId, variant);
  }

  async createAbTestInsight(insight: any) {
    return this.admin.experiments.createAbTestInsight(insight);
  }

  async getAbTestInsights(testId: string) {
    return this.admin.experiments.getAbTestInsights(testId);
  }

  async createCohort(cohort: any) {
    return this.admin.experiments.createCohort(cohort);
  }

  async getCohort(cohortId: string) {
    return this.admin.experiments.getCohort(cohortId);
  }

  async getCohorts(filters?: any) {
    return this.admin.experiments.getCohorts(filters);
  }

  async updateCohort(cohortId: string, updates: any) {
    return this.admin.experiments.updateCohort(cohortId, updates);
  }

  async deleteCohort(cohortId: string) {
    return this.admin.experiments.deleteCohort(cohortId);
  }

  // ==================== Analytics ====================
  async logApiUsage(userId: string, endpoint: string, method: string, statusCode: number, responseTime: number, metadata?: any) {
    return this.platform.analytics.logApiUsage(userId, endpoint, method, statusCode, responseTime, metadata);
  }

  async getApiUsageLogs(userId?: string, startDate?: Date, endDate?: Date) {
    return this.platform.analytics.getApiUsageLogs(userId, startDate, endDate);
  }

  async recordWebVital(vital: any) {
    return this.platform.analytics.recordWebVital(vital);
  }

  async getWebVitals(userId?: string, metricName?: string, startDate?: Date, endDate?: Date) {
    return this.platform.analytics.getWebVitals(userId, metricName, startDate, endDate);
  }

  async createUserSession(session: any) {
    return this.platform.analytics.createUserSession(session);
  }

  async updateUserSession(sessionId: string, updates: any) {
    return this.platform.analytics.updateUserSession(sessionId, updates);
  }

  async getUserSessions(userId: string, limit?: number) {
    return this.platform.analytics.getUserSessions(userId, limit);
  }

  async recordAnalyticsEvent(event: any) {
    return this.platform.analytics.recordAnalyticsEvent(event);
  }

  async getAnalyticsEvents(userId?: string, eventType?: string, startDate?: Date, endDate?: Date) {
    return this.platform.analytics.getAnalyticsEvents(userId, eventType, startDate, endDate);
  }

  async getAnalyticsStats(userId?: string, type?: 'session' | 'events' | 'usage', period?: 'day' | 'week' | 'month') {
    return this.platform.analytics.getAnalyticsStats(userId, type, period);
  }

  // ==================== AI/ML ====================
  async createVoiceCommand(command: any) {
    return this.platform.ai.createVoiceCommand(command);
  }

  async getVoiceCommands(userId: string, intent?: string, limit?: number) {
    return this.platform.ai.getVoiceCommands(userId, intent, limit);
  }

  async getVoiceCommand(id: string) {
    return this.platform.ai.getVoiceCommand(id);
  }

  async getVoiceCommandStats(userId: string) {
    return this.platform.ai.getVoiceCommandStats(userId);
  }

  async getDraftTemplates(category?: string) {
    return this.platform.ai.getDraftTemplates(category);
  }

  async getDraftTemplate(id: string) {
    return this.platform.ai.getDraftTemplate(id);
  }

  async createDraftTemplate(template: any) {
    return this.platform.ai.createDraftTemplate(template);
  }

  async updateDraftTemplate(id: string, updates: any) {
    return this.platform.ai.updateDraftTemplate(id, updates);
  }

  async deleteDraftTemplate(id: string) {
    return this.platform.ai.deleteDraftTemplate(id);
  }

  async createGeneratedDraft(draft: any) {
    return this.platform.ai.createGeneratedDraft(draft);
  }

  async getGeneratedDrafts(userId: string, documentType?: string) {
    return this.platform.ai.getGeneratedDrafts(userId, documentType);
  }

  async getGeneratedDraft(id: string) {
    return this.platform.ai.getGeneratedDraft(id);
  }

  async updateGeneratedDraft(id: string, updates: any) {
    return this.platform.ai.updateGeneratedDraft(id, updates);
  }

  async deleteGeneratedDraft(id: string) {
    return this.platform.ai.deleteGeneratedDraft(id);
  }

  async createSummary(summary: any) {
    return this.platform.ai.createSummary(summary);
  }

  async getSummaries(userId: string, contentType?: string) {
    return this.platform.ai.getSummaries(userId, contentType);
  }

  async getSummary(id: string) {
    return this.platform.ai.getSummary(id);
  }

  async updateSummary(id: string, updates: any) {
    return this.platform.ai.updateSummary(id, updates);
  }

  async deleteSummary(id: string) {
    return this.platform.ai.deleteSummary(id);
  }

  async createTranslation(translation: any) {
    return this.platform.ai.createTranslation(translation);
  }

  async getTranslations(userId: string, targetLanguage?: string) {
    return this.platform.ai.getTranslations(userId, targetLanguage);
  }

  async getTranslation(id: string) {
    return this.platform.ai.getTranslation(id);
  }

  async createTranscription(transcription: any) {
    return this.platform.ai.createTranscription(transcription);
  }

  async getTranscriptions(userId: string, audioFormat?: string) {
    return this.platform.ai.getTranscriptions(userId, audioFormat);
  }

  async getTranscription(id: string) {
    return this.platform.ai.getTranscription(id);
  }

  async updateTranscription(id: string, updates: any) {
    return this.platform.ai.updateTranscription(id, updates);
  }

  async deleteTranscription(id: string) {
    return this.platform.ai.deleteTranscription(id);
  }

  // ==================== System ====================
  async logSystemApiUsage(userId: string, log: any) {
    return this.platform.system.logApiUsage(userId, log);
  }

  async getSystemApiUsageLogs(userId: string, apiName?: string, limit?: number) {
    return this.platform.system.getApiUsageLogs(userId, apiName, limit);
  }

  async getSystemApiUsageStats(userId: string, apiName: string, days?: number) {
    return this.platform.system.getApiUsageStats(userId, apiName, days);
  }

  async createActivityLog(log: any) {
    return this.platform.system.createActivityLog(log);
  }

  async getActivityLogs(filters?: any) {
    return this.platform.system.getActivityLogs(filters);
  }

  async recordSystemMetric(metric: any) {
    return this.platform.system.recordSystemMetric(metric);
  }

  async getSystemMetrics(metricType?: string, limit?: number) {
    return this.platform.system.getSystemMetrics(metricType, limit);
  }

  async createMaintenancePrediction(prediction: any) {
    return this.platform.system.createMaintenancePrediction(prediction);
  }

  async getMaintenancePredictions(componentType?: string) {
    return this.platform.system.getMaintenancePredictions(componentType);
  }

  async recordMaintenanceHistory(history: any) {
    return this.platform.system.recordMaintenanceHistory(history);
  }

  async getMaintenanceHistory(componentType?: string, limit?: number) {
    return this.platform.system.getMaintenanceHistory(componentType, limit);
  }

  async getSystemHealth() {
    return this.platform.system.getSystemHealth();
  }

  // ==================== Content Management ====================
  async getCategories(parentId?: number | null) {
    return this.platform.content.getCategories(parentId);
  }

  async getCategory(id: number) {
    return this.platform.content.getCategory(id);
  }

  async getCategoryBySlug(slug: string) {
    return this.platform.content.getCategoryBySlug(slug);
  }

  async createCategory(category: any) {
    return this.platform.content.createCategory(category);
  }

  async updateCategory(id: number, updates: any) {
    return this.platform.content.updateCategory(id, updates);
  }

  async deleteCategory(id: number) {
    return this.platform.content.deleteCategory(id);
  }

  async getCategoryHierarchy() {
    return this.platform.content.getCategoryHierarchy();
  }

  async assignContentCategory(contentId: string, contentType: string, categoryId: number) {
    return this.platform.content.assignContentCategory(contentId, contentType, categoryId);
  }

  async removeContentCategory(contentId: string, contentType: string, categoryId: number) {
    return this.platform.content.removeContentCategory(contentId, contentType, categoryId);
  }

  async getOrCreateTag(tagData: { name: string; slug?: string; description?: string }) {
    return this.platform.content.getOrCreateTag(tagData);
  }

  async getTag(id: number) {
    return this.platform.content.getTag(id);
  }

  async getTagBySlug(slug: string) {
    return this.platform.content.getTagBySlug(slug);
  }

  async getTags(search?: string) {
    return this.platform.content.getTags(search);
  }

  async assignContentTag(contentId: string, contentType: string, tagId: number) {
    return this.platform.content.assignContentTag(contentId, contentType, tagId);
  }

  async removeContentTag(contentId: string, contentType: string, tagId: number) {
    return this.platform.content.removeContentTag(contentId, contentType, tagId);
  }

  async getContentTags(contentId: string, contentType: string) {
    return this.platform.content.getContentTags(contentId, contentType);
  }

  // ==================== Feedback ====================
  async createFeedback(feedbackData: any) {
    return this.platform.feedback.createFeedback(feedbackData);
  }

  async getFeedback(feedbackId: string) {
    return this.platform.feedback.getFeedback(feedbackId);
  }

  async getUserFeedback(userId: string) {
    return this.platform.feedback.getUserFeedback(userId);
  }

  async getAllFeedback(status?: string, type?: string) {
    return this.platform.feedback.getAllFeedback(status, type);
  }

  async getCommunityFeedback(limit?: number) {
    return this.platform.feedback.getCommunityFeedback(limit);
  }

  async getCommunityFeedbackForUser(userId: string, limit?: number) {
    return this.platform.feedback.getCommunityFeedbackForUser(userId, limit);
  }

  async updateFeedbackStatus(feedbackId: string, status: string) {
    return this.platform.feedback.updateFeedbackStatus(feedbackId, status);
  }

  async getFeedbackByContext(context: string) {
    return this.platform.feedback.getFeedbackByContext(context);
  }

  async addFeedbackResponse(feedbackId: string, response: string, responderId: string) {
    return this.platform.feedback.addFeedbackResponse(feedbackId, response, responderId);
  }

  async getFeedbackResponses(feedbackId: string) {
    return this.platform.feedback.getFeedbackResponses(feedbackId);
  }

  async getFeedbackAnalytics(period?: 'day' | 'week' | 'month') {
    return this.platform.feedback.getFeedbackAnalytics(period);
  }

  async upvoteFeedback(feedbackId: string, userId: string) {
    return this.platform.feedback.upvoteFeedback(feedbackId, userId);
  }

  async removeUpvote(feedbackId: string, userId: string) {
    return this.platform.feedback.removeUpvote(feedbackId, userId);
  }

  async hasUserUpvoted(feedbackId: string, userId: string) {
    return this.platform.feedback.hasUserUpvoted(feedbackId, userId);
  }

  async getFeedbackUpvoteCount(feedbackId: string) {
    return this.platform.feedback.getFeedbackUpvoteCount(feedbackId);
  }

  // ==================== Helper Methods ====================
  async getUserCount() {
    return this.user.user.getUserCount();
  }

  async getActiveUserCount(daysAgo?: number) {
    return this.user.user.getActiveUserCount(daysAgo);
  }

  async getAllUsers() {
    return this.user.user.getAllUsers();
  }

  async getUsersByProvider(provider: string) {
    return this.user.user.getUsersByProvider(provider);
  }

  async updateUserAdminStatus(userId: string, isAdmin: boolean) {
    return this.user.user.updateUserAdminStatus(userId, isAdmin);
  }

  async getAdminCount() {
    return this.user.user.getAdminCount();
  }

  // ==================== Scheduling ====================
  async getMeetingSchedules(userId: string) {
    return this.user.scheduling.getMeetingSchedules(userId);
  }

  async getMeetingSchedule(id: string) {
    return this.user.scheduling.getMeetingSchedule(id);
  }

  async createMeetingSchedule(data: any) {
    return this.user.scheduling.createMeetingSchedule(data);
  }

  async updateMeetingSchedule(id: string, data: any) {
    return this.user.scheduling.updateMeetingSchedule(id, data);
  }

  async deleteMeetingSchedule(id: string) {
    return this.user.scheduling.deleteMeetingSchedule(id);
  }

  async getUpcomingMeetings(userId: string, limit?: number) {
    return this.user.scheduling.getUpcomingMeetings(userId, limit);
  }

  async getMeetingsByDateRange(userId: string, startDate: Date, endDate: Date) {
    return this.user.scheduling.getMeetingsByDateRange(userId, startDate, endDate);
  }

  async getMeetingPreferences(userId: string) {
    return this.user.scheduling.getMeetingPreferences(userId);
  }

  async upsertMeetingPreferences(userId: string, preferences: any) {
    return this.user.scheduling.upsertMeetingPreferences(userId, preferences);
  }

  async checkConflicts(userId: string, startTime: Date, endTime: Date) {
    return this.user.scheduling.checkConflicts(userId, startTime, endTime);
  }

  async getAvailableSlots(userId: string, date: Date, duration: number, startHour?: number, endHour?: number) {
    return this.user.scheduling.getAvailableSlots(userId, date, duration, startHour, endHour);
  }

  // ==================== Cooking Terms ====================
  async getCookingTerms() {
    return this.user.food.getCookingTerms();
  }

  async getCookingTerm(id: string) {
    return this.user.food.getCookingTerm(id);
  }

  async getCookingTermByTerm(term: string) {
    return this.user.food.getCookingTermByTerm(term);
  }

  async getCookingTermsByCategory(category: string) {
    return this.user.food.getCookingTermsByCategory(category);
  }

  async createCookingTerm(data: any) {
    return this.user.food.createCookingTerm(data);
  }

  async updateCookingTerm(id: string, data: any) {
    return this.user.food.updateCookingTerm(id, data);
  }

  async deleteCookingTerm(id: string) {
    return this.user.food.deleteCookingTerm(id);
  }

  async searchCookingTerms(query: string) {
    return this.user.food.searchCookingTerms(query);
  }
}

// Export a singleton instance for convenience
export const storage = new StorageRoot();