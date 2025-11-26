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

  constructor(db?: any) {
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
  async createSession(sessionId: string, sessionData: any, sessionExpire: any) {
    return this.user.user.createSession(sessionId, sessionData, sessionExpire);
  }

  async getSession(sessionId: string) {
    return this.user.user.getSession(sessionId);
  }

  async updateSession(sessionId: string, sessionData: any, sessionExpire: any) {
    return this.user.user.updateSession(sessionId, sessionData, sessionExpire);
  }

  async deleteSession(sessionId: string) {
    return this.user.user.deleteSession(sessionId);
  }

  async cleanupExpiredSessions() {
    return this.user.user.cleanupExpiredSessions();
  }

  // ==================== Auth Providers ====================
  async linkOAuthProvider(userId: string, provider: string, providerId: string) {
    return this.user.user.linkOAuthProvider(userId, provider, providerId);
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
  async getFoodItems(userId: string, filter?: "all" | "expiring" | "expired") {
    return this.user.inventory.getFoodItems(userId, filter);
  }

  async getFoodItemsPaginated(userId: string, limit: number = 30, offset: number = 0, filter?: "all" | "expiring" | "expired") {
    return this.user.inventory.getFoodItemsPaginated(userId, limit, offset, filter);
  }

  async getFoodItem(userId: string, id: string) {
    return this.user.inventory.getFoodItem(userId, id);
  }

  async createFoodItem(userId: string, data: any) {
    return this.user.inventory.createFoodItem(userId, data);
  }

  async updateFoodItem(userId: string, id: string, data: any) {
    return this.user.inventory.updateFoodItem(userId, id, data);
  }

  async deleteFoodItem(userId: string, id: string) {
    return this.user.inventory.deleteFoodItem(userId, id);
  }

  async getExpiringItems(userId: string, daysAhead: number = 7) {
    return this.user.inventory.getExpiringItems(userId, daysAhead);
  }

  async getStorageLocations(userId: string) {
    return this.user.inventory.getStorageLocations(userId);
  }

  async getStorageLocation(userId: string, id: string) {
    return this.user.inventory.getStorageLocation(userId, id);
  }

  async createStorageLocation(userId: string, data: any) {
    return this.user.inventory.createStorageLocation(userId, data);
  }

  async updateStorageLocation(userId: string, id: string, data: any) {
    return this.user.inventory.updateStorageLocation(userId, id, data);
  }

  async deleteStorageLocation(userId: string, id: string) {
    return this.user.inventory.deleteStorageLocation(userId, id);
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

  async updateShoppingItem(userId: string, id: string, data: any) {
    return this.user.inventory.updateShoppingItem(userId, id, data);
  }

  async deleteShoppingItem(userId: string, id: string) {
    return this.user.inventory.deleteShoppingItem(userId, id);
  }

  async clearCheckedShoppingItems(userId: string) {
    return this.user.inventory.clearCheckedShoppingItems(userId);
  }

  // ==================== Recipes ====================
  async getRecipes(userId: string) {
    return this.user.recipes.getRecipes(userId);
  }

  async getRecipesPaginated(userId: string, page: number = 1, limit: number = 20) {
    return this.user.recipes.getRecipesPaginated(userId, page, limit);
  }

  async getRecipe(userId: string, id: string) {
    return this.user.recipes.getRecipe(userId, id);
  }

  async searchRecipes(userId: string, query: string) {
    return this.user.recipes.searchRecipes(userId, query);
  }

  async createRecipe(userId: string, data: any) {
    return this.user.recipes.createRecipe(userId, data);
  }

  async updateRecipe(userId: string, id: string, data: any) {
    return this.user.recipes.updateRecipe(userId, id, data);
  }

  async deleteRecipe(userId: string, id: string) {
    return this.user.recipes.deleteRecipe(userId, id);
  }

  async toggleRecipeFavorite(userId: string, id: string) {
    return this.user.recipes.toggleRecipeFavorite(userId, id);
  }

  async rateRecipe(userId: string, id: string, rating: number) {
    return this.user.recipes.rateRecipe(userId, id, rating);
  }

  // ==================== Chat ====================
  async getChatMessages(userId: string) {
    return this.user.chat.getChatMessages(userId);
  }

  async getChatMessagesPaginated(userId: string, page: number = 1, limit: number = 50) {
    return this.user.chat.getChatMessagesPaginated(userId, page, limit);
  }

  async createChatMessage(userId: string, data: any) {
    return this.user.chat.createChatMessage(userId, data);
  }

  async deleteChatHistory(userId: string) {
    return this.user.chat.deleteChatHistory(userId);
  }

  // ==================== Notifications ====================
  async savePushToken(userId: string, token: string, platform: 'web' | 'ios' | 'android') {
    return this.user.notifications.savePushToken(userId, token, platform);
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
    type NotificationType = "expiring-food" | "recipe-suggestion" | "meal-reminder" | "test" | "system" | "promotion" | "feature-update";
    const validTypes: NotificationType[] = ["expiring-food", "recipe-suggestion", "meal-reminder", "test", "system", "promotion", "feature-update"];
    const results = [];
    for (const [key, enabled] of Object.entries(preferences)) {
      if (validTypes.includes(key as NotificationType)) {
        const result = await this.user.notifications.upsertNotificationPreferences({
          userId,
          notificationType: key as NotificationType,
          enabled,
          channels: ['push', 'email'],
          minImportance: 3,
          frequency: 'immediate'
        });
        results.push(result);
      }
    }
    return results;
  }

  // ==================== Billing ====================
  async createDonation(donation: any) {
    return this.admin.billing.createDonation(donation);
  }

  async updateDonation(stripePaymentIntentId: string, updates: any) {
    return this.admin.billing.updateDonation(stripePaymentIntentId, updates);
  }

  async getDonationById(id: string) {
    return this.admin.billing.getDonation(id);
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
    return this.admin.billing.getUserDonationStats(userId);
  }

  async getDonationStats(startDate?: Date, endDate?: Date) {
    return this.admin.billing.getDonationStats(startDate, endDate);
  }

  async getMonthlyDonations(months: number = 12) {
    return this.admin.billing.getDonationTrends(months * 30);
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

  async escalateTicket(ticketId: string, reason: string): Promise<any> {
    return this.admin.support.updateTicket(ticketId, { priority: 'urgent' });
  }

  async resolveTicket(ticketId: string, resolution: string, timeToResolution: number = 0) {
    return this.admin.support.resolveTicket(ticketId, resolution, timeToResolution);
  }

  async addTicketResponse(response: any): Promise<any> {
    console.warn("addTicketResponse: stub method - use ticket notes or comments instead");
    return { id: `response_${Date.now()}`, ...response };
  }

  async getTicketResponses(ticketId: string): Promise<any[]> {
    console.warn("getTicketResponses: stub method - use ticket notes or comments instead");
    return [];
  }

  async getTicketStats(startDate?: Date, endDate?: Date) {
    return this.admin.support.getTicketStats(startDate, endDate);
  }

  // ==================== Security ====================
  async createModerationLog(log: any) {
    return this.admin.security.createModerationLog(log);
  }

  async getModerationLogs(filters?: any): Promise<any[]> {
    console.warn("getModerationLogs: stub method - moderation log retrieval not implemented");
    return [];
  }

  async getModerationLogById(id: string): Promise<any | null> {
    console.warn("getModerationLogById: stub method - moderation log retrieval not implemented");
    return null;
  }

  async updateModerationLog(id: string, updates: any) {
    return this.admin.security.updateModerationLog(id, updates);
  }

  async getUserModerationHistory(userId: string): Promise<any[]> {
    console.warn("getUserModerationHistory: stub method - moderation history not implemented");
    return [];
  }

  async getModerationStats(dateRange?: { start: Date; end: Date }) {
    return this.admin.security.getModerationStats(dateRange);
  }

  async createFraudScore(score: any) {
    return this.admin.security.createFraudScore(score);
  }

  async updateFraudScore(userId: string, score: number) {
    const factors = {
      behaviorScore: 0,
      accountAgeScore: 0,
      transactionVelocityScore: 0,
      contentPatternScore: 0,
      networkScore: 0,
      deviceScore: 0,
      geoScore: 0,
      details: {}
    };
    return this.admin.security.createFraudScore({ userId, score, factors, modelVersion: '1.0' });
  }

  async getUserFraudScore(userId: string) {
    const scores = await this.admin.security.getFraudScores(userId, 1);
    return scores[0] || null;
  }

  async getFraudScoreHistory(userId: string, limit?: number) {
    return this.admin.security.getFraudScores(userId, limit);
  }

  async getHighRiskUsers(threshold?: number, limit?: number) {
    return this.admin.security.getHighRiskUsers(threshold, limit);
  }

  async recordFraudAttempt(activity: any) {
    return this.admin.security.createSuspiciousActivity(activity);
  }

  async getFraudAttempts(userId?: string, isAdmin?: boolean) {
    return this.admin.security.getSuspiciousActivities(userId, isAdmin);
  }

  async getPrivacySettings(userId: string) {
    return this.admin.security.getPrivacySettings(userId);
  }

  async updatePrivacySettings(userId: string, settings: any) {
    return this.admin.security.upsertPrivacySettings(userId, settings);
  }

  async logPrivacyRequest(request: any): Promise<any> {
    console.warn("logPrivacyRequest: stub method - privacy requests not implemented in security domain");
    return { id: `privacy_${Date.now()}`, ...request };
  }

  async getPrivacyRequests(userId?: string, status?: string): Promise<any[]> {
    console.warn("getPrivacyRequests: stub method - privacy requests not implemented in security domain");
    return [];
  }

  async processPrivacyRequest(requestId: string, status: string, processedBy: string): Promise<any> {
    console.warn("processPrivacyRequest: stub method - privacy requests not implemented in security domain");
    return { id: requestId, status, processedBy, processedAt: new Date() };
  }

  // ==================== Pricing ====================
  async getPricingRules() {
    return this.admin.pricing.getActivePricingRules();
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

  async getPriceHistory(productId: string, options?: { startDate?: Date; endDate?: Date; limit?: number }) {
    return this.admin.pricing.getPriceHistory(productId, options);
  }

  async recordPricingPerformance(performance: any) {
    return this.admin.pricing.recordPricingPerformance(performance);
  }

  async getPricingPerformance(productId: string, options?: { startDate?: Date; endDate?: Date }) {
    return this.admin.pricing.getPricingPerformance(productId, options);
  }

  async getPricingMetrics(options?: { startDate?: Date; endDate?: Date }) {
    return this.admin.pricing.getPricingMetrics(options);
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

  async createAbTestInsight(insight: any): Promise<any> {
    console.warn("createAbTestInsight: stub method - use getAbTestInsights instead");
    return { id: `insight_${Date.now()}`, ...insight };
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

  async getWebVitals(userId?: string, limit?: number) {
    return this.platform.analytics.getWebVitals(userId, limit);
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

  async getAnalyticsStats(type: 'sessions' | 'events' | 'usage', userId?: string, period?: 'day' | 'week' | 'month') {
    return this.platform.analytics.getAnalyticsStats(type, userId, period);
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

  async createGeneratedDraft(userId: string, draft: any) {
    return this.platform.ai.createGeneratedDraft(userId, draft);
  }

  async getGeneratedDrafts(userId: string, templateId?: string) {
    return this.platform.ai.getGeneratedDrafts(userId, templateId);
  }

  async getGeneratedDraft(userId: string, id: string) {
    return this.platform.ai.getGeneratedDraft(userId, id);
  }

  async updateGeneratedDraft(userId: string, id: string, updates: any) {
    return this.platform.ai.updateGeneratedDraft(userId, id, updates);
  }

  async deleteGeneratedDraft(userId: string, id: string) {
    return this.platform.ai.deleteGeneratedDraft(userId, id);
  }

  async createSummary(userId: string, summary: any) {
    return this.platform.ai.createSummary(userId, summary);
  }

  async getSummaries(userId: string, sourceType?: string) {
    return this.platform.ai.getSummaries(userId, sourceType);
  }

  async getSummary(userId: string, id: string) {
    return this.platform.ai.getSummary(userId, id);
  }

  async updateSummary(userId: string, id: string, updates: any) {
    return this.platform.ai.updateSummary(userId, id, updates);
  }

  async deleteSummary(userId: string, id: string) {
    return this.platform.ai.deleteSummary(userId, id);
  }

  async createTranslation(userId: string, translation: any) {
    return this.platform.ai.translateContent(userId, translation);
  }

  async getTranslations(userId: string, sourceLanguage?: string, targetLanguage?: string) {
    return this.platform.ai.getTranslations(userId, sourceLanguage, targetLanguage);
  }

  async getTranslation(userId: string, id: string) {
    return this.platform.ai.getTranslation(userId, id);
  }

  async createTranscription(userId: string, transcription: any) {
    return this.platform.ai.createTranscription(userId, transcription);
  }

  async getTranscriptions(userId: string, status?: 'processing' | 'completed' | 'failed', limit?: number) {
    return this.platform.ai.getTranscriptions(userId, status, limit);
  }

  async getTranscription(userId: string, id: string) {
    return this.platform.ai.getTranscription(userId, id);
  }

  async updateTranscription(userId: string, id: string, updates: any) {
    return this.platform.ai.updateTranscription(userId, id, updates);
  }

  async deleteTranscription(userId: string, id: string) {
    return this.platform.ai.deleteTranscription(userId, id);
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

  async getSystemMetrics(metricType?: string, limit?: string) {
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

  async getMaintenanceHistory(componentType?: string, limit?: string) {
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

  async assignContentCategory(assignment: { contentId: string; contentType: "recipe" | "document" | "article" | "product" | "media"; categoryId: number; isPrimary?: boolean }) {
    return this.platform.content.assignContentCategory(assignment);
  }

  async removeContentCategory(contentId: string, categoryId: number) {
    return this.platform.content.removeContentCategory(contentId, categoryId);
  }

  async getOrCreateTag(name: string) {
    return this.platform.content.getOrCreateTag(name);
  }

  async getTag(id: number) {
    return this.platform.content.getTag(id);
  }

  async getTagBySlug(slug: string) {
    return this.platform.content.getTagBySlug(slug);
  }

  async getTags(search?: string) {
    if (search) {
      return this.platform.content.searchTags(search);
    }
    return this.platform.content.getAllTags();
  }

  async assignContentTag(assignment: { contentId: string; contentType: "recipe" | "document" | "article" | "product" | "media"; tagId: number }) {
    return this.platform.content.assignContentTag(assignment);
  }

  async removeContentTag(contentId: string, tagId: number) {
    return this.platform.content.removeContentTag(contentId, tagId);
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

  async addFeedbackResponse(responseData: { feedbackId: string; response: string; respondedBy: string }) {
    return this.platform.feedback.addFeedbackResponse(responseData);
  }

  async getFeedbackResponses(feedbackId: string) {
    return this.platform.feedback.getFeedbackResponses(feedbackId);
  }

  async getFeedbackAnalytics(startDate?: Date, endDate?: Date) {
    return this.platform.feedback.getFeedbackAnalytics(startDate, endDate);
  }

  async upvoteFeedback(userId: string, feedbackId: string) {
    return this.platform.feedback.upvoteFeedback(userId, feedbackId);
  }

  async removeUpvote(userId: string, feedbackId: string) {
    return this.platform.feedback.removeUpvote(userId, feedbackId);
  }

  async hasUserUpvoted(userId: string, feedbackId: string) {
    return this.platform.feedback.hasUserUpvoted(userId, feedbackId);
  }

  async getFeedbackUpvoteCount(feedbackId: string) {
    return this.platform.feedback.getFeedbackUpvoteCount(feedbackId);
  }

  // ==================== Helper Methods ====================
  async getUserCount() {
    return this.user.user.getUserCount();
  }

  async getActiveUserCount(since: Date) {
    return this.user.user.getActiveUserCount(since);
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
  async getMeetingSchedules(userId: string): Promise<any[]> {
    console.warn("getMeetingSchedules: stub method - meeting schedules not implemented in scheduling domain");
    return [];
  }

  async getMeetingSchedule(id: string): Promise<any | null> {
    console.warn("getMeetingSchedule: stub method - meeting schedules not implemented in scheduling domain");
    return null;
  }

  async createMeetingSchedule(data: any): Promise<any> {
    console.warn("createMeetingSchedule: stub method - meeting schedules not implemented in scheduling domain");
    return { id: `meeting_${Date.now()}`, ...data };
  }

  async updateMeetingSchedule(id: string, data: any): Promise<any> {
    console.warn("updateMeetingSchedule: stub method - meeting schedules not implemented in scheduling domain");
    return { id, ...data };
  }

  async deleteMeetingSchedule(id: string): Promise<void> {
    console.warn("deleteMeetingSchedule: stub method - meeting schedules not implemented in scheduling domain");
  }

  async getUpcomingMeetings(userId: string, limit?: number) {
    return this.user.scheduling.getMeetingEvents(userId, { startTime: new Date() });
  }

  async getMeetingsByDateRange(userId: string, startDate: Date, endDate: Date): Promise<any[]> {
    console.warn("getMeetingsByDateRange: stub method - meeting schedules not implemented in scheduling domain");
    return [];
  }

  async getMeetingPreferences(userId: string) {
    return this.user.scheduling.getSchedulingPreferences(userId);
  }

  async upsertMeetingPreferences(userId: string, preferences: any) {
    return this.user.scheduling.upsertSchedulingPreferences(userId, preferences);
  }

  async checkConflicts(userId: string, startTime: Date, endTime: Date): Promise<boolean> {
    console.warn("checkConflicts: stub method - conflict checking not implemented in scheduling domain");
    return false;
  }

  async getAvailableSlots(userId: string, date: Date, duration: number, startHour?: number, endHour?: number): Promise<any[]> {
    console.warn("getAvailableSlots: stub method - availability slots not implemented in scheduling domain");
    return [];
  }

  // ==================== Cooking Terms ====================
  async getCookingTerms() {
    return this.user.food.getCookingTerms();
  }

  async getCookingTerm(id: number) {
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

  async updateCookingTerm(id: number, data: any) {
    return this.user.food.updateCookingTerm(id, data);
  }

  async deleteCookingTerm(id: number) {
    return this.user.food.deleteCookingTerm(id);
  }

  async searchCookingTerms(query: string) {
    return this.user.food.searchCookingTerms(query);
  }

  // ==================== Image Processing Stubs (TODO: Implement) ====================

  async createImageProcessingJob(_data: any): Promise<any> {
    console.warn("createImageProcessingJob: stub method called");
    return { id: `job_${Date.now()}`, status: 'pending', ...(_data || {}) };
  }

  async updateImageProcessingJob(_jobId: string, _data: any): Promise<any> {
    console.warn("updateImageProcessingJob: stub method called");
    return { id: _jobId, ...(_data || {}) };
  }

  async getImageProcessingJob(_jobId: string): Promise<any | null> {
    console.warn("getImageProcessingJob: stub method called");
    return null;
  }

  async getImageProcessingJobs(_userId: string, _status?: string): Promise<any[]> {
    console.warn("getImageProcessingJobs: stub method called");
    return [];
  }

  async getImagePresets(_userId?: string, _category?: string): Promise<any[]> {
    console.warn("getImagePresets: stub method called");
    return [];
  }

  async createImagePreset(_data: any): Promise<any> {
    console.warn("createImagePreset: stub method called");
    return { id: `preset_${Date.now()}`, ...(_data || {}) };
  }
}

// Export a singleton instance for convenience
export const storage = new StorageRoot();
