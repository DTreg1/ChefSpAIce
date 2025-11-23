/**
 * AdminStorage Facade
 * Consolidates administrative and business storage operations into organized sub-modules
 */

import { db } from "../../db";
import {
  donations, recurringDonations,
  tickets, ticketResponses, routingRules, agentExpertise, satisfactionScores,
  moderationLogs, fraudScores, fraudDetectionResults, suspiciousActivities, 
  fraudReviews, privacySettings, privacyRequests, blockedContent,
  pricingRules, priceHistory, pricingPerformance, marketIntelligence,
  pricingOptimizations, competitorPrices,
  abTests, abTestResults, abTestInsights, cohorts, cohortMembers, 
  cohortMetrics, cohortComparisons,
  Donation, InsertDonation, RecurringDonation, InsertRecurringDonation,
  Ticket, InsertTicket, TicketResponse, InsertTicketResponse,
  RoutingRule, InsertRoutingRule, AgentExpertise, InsertAgentExpertise,
  SatisfactionScore, InsertSatisfactionScore,
  ModerationLog, InsertModerationLog, FraudScore, InsertFraudScore,
  FraudDetectionResult, InsertFraudDetectionResult, SuspiciousActivity, InsertSuspiciousActivity,
  FraudReview, InsertFraudReview, PrivacySettings, InsertPrivacySettings,
  PrivacyRequest, InsertPrivacyRequest, BlockedContent, InsertBlockedContent,
  PricingRules, InsertPricingRules, PriceHistory, InsertPriceHistory,
  PricingPerformance, InsertPricingPerformance, MarketIntelligence, InsertMarketIntelligence,
  PricingOptimization, InsertPricingOptimization, CompetitorPrice, InsertCompetitorPrice,
  AbTest, InsertAbTest, AbTestResult, InsertAbTestResult,
  AbTestInsight, InsertAbTestInsight, Cohort, InsertCohort,
  CohortMember, InsertCohortMember, CohortMetric, InsertCohortMetric,
  CohortComparison, InsertCohortComparison
} from "@shared/schema";
import { eq, and, or, sql, desc, asc, gte, lt, lte, ilike, isNull, not, inArray, between, SQL } from "drizzle-orm";

/**
 * Billing module - handles donations and payment processing
 */
class BillingModule {
  async createDonation(donation: Omit<InsertDonation, "id" | "createdAt" | "completedAt">): Promise<Donation> {
    const [newDonation] = await db.insert(donations)
      .values(donation as any)
      .returning();
    return newDonation;
  }

  async updateDonation(stripePaymentIntentId: string, updates: Partial<Donation>): Promise<Donation> {
    const [updated] = await db.update(donations)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(donations.stripePaymentIntentId, stripePaymentIntentId))
      .returning();
    
    if (!updated) {
      throw new Error("Donation not found");
    }
    return updated;
  }

  async getDonationById(id: string): Promise<Donation | undefined> {
    const [donation] = await db.select().from(donations).where(eq(donations.id, id));
    return donation;
  }

  async getDonationByPaymentIntent(stripePaymentIntentId: string): Promise<Donation | undefined> {
    const [donation] = await db.select().from(donations)
      .where(eq(donations.stripePaymentIntentId, stripePaymentIntentId));
    return donation;
  }

  async getUserDonations(userId: string): Promise<Donation[]> {
    return await db.select().from(donations)
      .where(eq(donations.userId, userId))
      .orderBy(desc(donations.createdAt));
  }

  async getDonations(limit: number = 50, offset: number = 0): Promise<{ donations: Donation[]; total: number }> {
    const [donationResults, totalResult] = await Promise.all([
      db.select().from(donations)
        .orderBy(desc(donations.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: sql<number>`COUNT(*)::int` }).from(donations),
    ]);

    return {
      donations: donationResults,
      total: totalResult[0]?.count || 0,
    };
  }

  async getTotalDonations(): Promise<{ totalAmount: number; donationCount: number }> {
    const result = await db.select({
      totalAmount: sql<number>`COALESCE(SUM(${donations.amount}), 0)::int`,
      donationCount: sql<number>`COUNT(*)::int`,
    })
    .from(donations)
    .where(eq(donations.status, "completed"));

    return result[0] || { totalAmount: 0, donationCount: 0 };
  }

  async getTotalDonationsByUser(userId: string): Promise<{ totalAmount: number; donationCount: number }> {
    const result = await db.select({
      totalAmount: sql<number>`COALESCE(SUM(${donations.amount}), 0)::int`,
      donationCount: sql<number>`COUNT(*)::int`,
    })
    .from(donations)
    .where(and(
      eq(donations.userId, userId),
      eq(donations.status, "completed")
    ));

    return result[0] || { totalAmount: 0, donationCount: 0 };
  }

  async getDonationStats(startDate?: Date, endDate?: Date): Promise<{
    totalAmount: number;
    totalCount: number;
    averageAmount: number;
    byStatus: Record<string, { count: number; amount: number }>;
    byCurrency: Record<string, { count: number; amount: number }>;
    recurringCount: number;
    recurringAmount: number;
  }> {
    const conditions = [];
    
    if (startDate) {
      conditions.push(gte(donations.createdAt, startDate));
    }
    if (endDate) {
      conditions.push(lte(donations.createdAt, endDate));
    }

    const filteredDonations = conditions.length > 0
      ? await db.select().from(donations).where(and(...conditions))
      : await db.select().from(donations);

    const byStatus: Record<string, { count: number; amount: number }> = {};
    const byCurrency: Record<string, { count: number; amount: number }> = {};
    let totalAmount = 0;
    let totalCount = 0;
    let recurringCount = 0;
    let recurringAmount = 0;

    for (const donation of filteredDonations) {
      totalCount++;
      
      if (donation.status === "completed") {
        totalAmount += donation.amount;
      }

      // By status
      if (!byStatus[donation.status]) {
        byStatus[donation.status] = { count: 0, amount: 0 };
      }
      byStatus[donation.status].count++;
      if (donation.status === "completed") {
        byStatus[donation.status].amount += donation.amount;
      }

      // By currency
      if (!byCurrency[donation.currency]) {
        byCurrency[donation.currency] = { count: 0, amount: 0 };
      }
      byCurrency[donation.currency].count++;
      if (donation.status === "completed") {
        byCurrency[donation.currency].amount += donation.amount;
      }

      // Recurring
      if (donation.isRecurring) {
        recurringCount++;
        if (donation.status === "completed") {
          recurringAmount += donation.amount;
        }
      }
    }

    return {
      totalAmount,
      totalCount,
      averageAmount: totalCount > 0 ? totalAmount / totalCount : 0,
      byStatus,
      byCurrency,
      recurringCount,
      recurringAmount,
    };
  }

  async getMonthlyDonations(months: number = 12): Promise<Array<{
    month: string;
    totalAmount: number;
    count: number;
  }>> {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const monthlyData = await db.select({
      month: sql<string>`TO_CHAR(${donations.createdAt}, 'YYYY-MM')`,
      totalAmount: sql<number>`COALESCE(SUM(${donations.amount}), 0)::int`,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(donations)
    .where(and(
      gte(donations.createdAt, startDate),
      eq(donations.status, "completed")
    ))
    .groupBy(sql`TO_CHAR(${donations.createdAt}, 'YYYY-MM')`)
    .orderBy(sql`TO_CHAR(${donations.createdAt}, 'YYYY-MM')`);

    return monthlyData;
  }

  async getDonationsByDateRange(startDate: Date, endDate: Date): Promise<Donation[]> {
    return await db.select().from(donations)
      .where(and(
        gte(donations.createdAt, startDate),
        lte(donations.createdAt, endDate)
      ))
      .orderBy(desc(donations.createdAt));
  }

  async getTopDonors(limit: number = 10): Promise<Array<{
    userId: string;
    userEmail: string;
    totalAmount: number;
    donationCount: number;
  }>> {
    const topDonors = await db.select({
      userId: donations.userId,
      userEmail: donations.userEmail,
      totalAmount: sql<number>`SUM(${donations.amount})::int`,
      donationCount: sql<number>`COUNT(*)::int`,
    })
    .from(donations)
    .where(eq(donations.status, "completed"))
    .groupBy(donations.userId, donations.userEmail)
    .orderBy(desc(sql`SUM(${donations.amount})`))
    .limit(limit);

    return topDonors;
  }

  async createRecurringDonation(recurring: InsertRecurringDonation): Promise<RecurringDonation> {
    const [newRecurring] = await db.insert(recurringDonations)
      .values(recurring)
      .returning();
    return newRecurring;
  }

  async getRecurringDonations(status?: string): Promise<RecurringDonation[]> {
    const conditions = [];
    if (status) {
      conditions.push(eq(recurringDonations.status, status));
    }

    return conditions.length > 0
      ? await db.select().from(recurringDonations)
          .where(and(...conditions))
          .orderBy(desc(recurringDonations.createdAt))
      : await db.select().from(recurringDonations)
          .orderBy(desc(recurringDonations.createdAt));
  }

  async cancelRecurringDonation(subscriptionId: string): Promise<RecurringDonation> {
    const [cancelled] = await db.update(recurringDonations)
      .set({
        status: "cancelled",
        updatedAt: new Date(),
      })
      .where(eq(recurringDonations.stripeSubscriptionId, subscriptionId))
      .returning();
    
    if (!cancelled) {
      throw new Error("Recurring donation not found");
    }
    return cancelled;
  }

  async updateRecurringDonation(subscriptionId: string, updates: Partial<RecurringDonation>): Promise<RecurringDonation> {
    const [updated] = await db.update(recurringDonations)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(recurringDonations.stripeSubscriptionId, subscriptionId))
      .returning();
    
    if (!updated) {
      throw new Error("Recurring donation not found");
    }
    return updated;
  }
}

/**
 * Security module - handles moderation, fraud detection, and privacy
 */
class SecurityModule {
  private cache = new Map<string, { data: any; expires: number }>();
  private readonly CACHE_TTL = 30 * 60 * 1000; // 30 minutes

  private getCached<T>(key: string): T | undefined {
    const cached = this.cache.get(key);
    if (cached && cached.expires > Date.now()) {
      return cached.data as T;
    }
    this.cache.delete(key);
    return undefined;
  }

  private setCached(key: string, data: any, ttl: number = this.CACHE_TTL): void {
    this.cache.set(key, { data, expires: Date.now() + ttl });
  }

  async createModerationLog(log: InsertModerationLog): Promise<ModerationLog> {
    const [result] = await db.insert(moderationLogs).values([log]).returning();
    return result;
  }

  async getModerationLogs(filters?: {
    userId?: string;
    moderatorId?: string;
    status?: string;
    severity?: string;
  }): Promise<ModerationLog[]> {
    const conditions = [];

    if (filters?.userId) {
      conditions.push(eq(moderationLogs.userId, filters.userId));
    }
    if (filters?.moderatorId) {
      conditions.push(eq(moderationLogs.moderatorId, filters.moderatorId));
    }
    if (filters?.status) {
      conditions.push(eq(moderationLogs.status, filters.status));
    }
    if (filters?.severity) {
      conditions.push(eq(moderationLogs.severity, filters.severity));
    }

    return conditions.length > 0
      ? await db.select().from(moderationLogs)
          .where(and(...conditions))
          .orderBy(desc(moderationLogs.createdAt))
      : await db.select().from(moderationLogs)
          .orderBy(desc(moderationLogs.createdAt));
  }

  async getModerationLogById(id: string): Promise<ModerationLog | undefined> {
    const [log] = await db.select().from(moderationLogs)
      .where(eq(moderationLogs.id, id));
    return log;
  }

  async updateModerationLog(id: string, updates: Partial<InsertModerationLog>): Promise<void> {
    await db.update(moderationLogs)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(moderationLogs.id, id));
  }

  async getUserModerationHistory(userId: string): Promise<ModerationLog[]> {
    return await db.select().from(moderationLogs)
      .where(eq(moderationLogs.userId, userId))
      .orderBy(desc(moderationLogs.createdAt));
  }

  async getModerationStats(period?: "day" | "week" | "month"): Promise<{
    totalLogs: number;
    byStatus: Record<string, number>;
    bySeverity: Record<string, number>;
    topViolationTypes: Array<{ type: string; count: number }>;
  }> {
    const startDate = new Date();
    if (period === "day") {
      startDate.setDate(startDate.getDate() - 1);
    } else if (period === "week") {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === "month") {
      startDate.setMonth(startDate.getMonth() - 1);
    }

    const logs = period 
      ? await db.select().from(moderationLogs)
          .where(gte(moderationLogs.createdAt, startDate))
      : await db.select().from(moderationLogs);

    const byStatus: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    const violationTypes: Record<string, number> = {};

    for (const log of logs) {
      byStatus[log.status] = (byStatus[log.status] || 0) + 1;
      bySeverity[log.severity] = (bySeverity[log.severity] || 0) + 1;
      violationTypes[log.violationType] = (violationTypes[log.violationType] || 0) + 1;
    }

    const topViolationTypes = Object.entries(violationTypes)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalLogs: logs.length,
      byStatus,
      bySeverity,
      topViolationTypes,
    };
  }

  async addBlockedContent(content: InsertBlockedContent): Promise<void> {
    await db.insert(blockedContent).values(content);
  }

  async getBlockedContent(): Promise<BlockedContent[]> {
    return await db.select().from(blockedContent)
      .orderBy(desc(blockedContent.createdAt));
  }

  async removeBlockedContent(id: string): Promise<void> {
    await db.delete(blockedContent).where(eq(blockedContent.id, id));
  }

  async isContentBlocked(content: string): Promise<boolean> {
    const blocked = await db.select().from(blockedContent);
    
    for (const item of blocked) {
      if (item.contentPattern && content.includes(item.contentPattern)) {
        return true;
      }
      if (item.contentHash && item.contentHash === this.hashContent(content)) {
        return true;
      }
    }
    
    return false;
  }

  private hashContent(content: string): string {
    // Simple hash function for demonstration
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
  }

  async createFraudScore(score: InsertFraudScore): Promise<FraudScore> {
    const [result] = await db.insert(fraudScores).values([score]).returning();
    return result;
  }

  async updateFraudScore(userId: string, score: number): Promise<FraudScore> {
    const [existing] = await db.select().from(fraudScores)
      .where(eq(fraudScores.userId, userId))
      .orderBy(desc(fraudScores.timestamp))
      .limit(1);

    const [updated] = await db.insert(fraudScores)
      .values({
        userId,
        score,
        factors: existing?.factors || {},
        metadata: existing?.metadata || {},
      })
      .returning();
    
    return updated;
  }

  async getUserFraudScore(userId: string): Promise<FraudScore | undefined> {
    const [score] = await db.select().from(fraudScores)
      .where(eq(fraudScores.userId, userId))
      .orderBy(desc(fraudScores.timestamp))
      .limit(1);
    return score;
  }

  async getFraudScoreHistory(userId: string, limit: number = 10): Promise<FraudScore[]> {
    return await db.select().from(fraudScores)
      .where(eq(fraudScores.userId, userId))
      .orderBy(desc(fraudScores.timestamp))
      .limit(limit);
  }

  async getHighRiskUsers(threshold: number = 0.75, limit: number = 50): Promise<Array<{
    userId: string;
    score: number;
    timestamp: Date;
  }>> {
    const subquery = db.select({
      userId: fraudScores.userId,
      score: fraudScores.score,
      timestamp: fraudScores.timestamp,
      rowNum: sql<number>`ROW_NUMBER() OVER (PARTITION BY ${fraudScores.userId} ORDER BY ${fraudScores.timestamp} DESC)`,
    })
    .from(fraudScores)
    .as('ranked_scores');

    const results = await db.select({
      userId: subquery.userId,
      score: subquery.score,
      timestamp: subquery.timestamp,
    })
    .from(subquery)
    .where(and(
      eq(subquery.rowNum, 1),
      gte(subquery.score, threshold)
    ))
    .orderBy(desc(subquery.score))
    .limit(limit);

    return results;
  }

  async recordFraudAttempt(activity: InsertSuspiciousActivity): Promise<void> {
    await db.insert(suspiciousActivities).values(activity);
  }

  async getFraudAttempts(userId?: string, limit: number = 100): Promise<SuspiciousActivity[]> {
    const conditions = userId ? [eq(suspiciousActivities.userId, userId)] : [];
    
    return await db.select().from(suspiciousActivities)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(suspiciousActivities.detectedAt))
      .limit(limit);
  }

  async getPrivacySettings(userId: string): Promise<PrivacySettings | undefined> {
    const cacheKey = `privacy:${userId}`;
    const cached = this.getCached<PrivacySettings>(cacheKey);
    if (cached) return cached;

    const [settings] = await db.select().from(privacySettings)
      .where(eq(privacySettings.userId, userId));
    
    if (settings) {
      this.setCached(cacheKey, settings);
    }
    
    return settings;
  }

  async updatePrivacySettings(userId: string, settings: Partial<InsertPrivacySettings>): Promise<PrivacySettings> {
    const existing = await this.getPrivacySettings(userId);
    
    let result: PrivacySettings;
    if (existing) {
      [result] = await db.update(privacySettings)
        .set({
          ...settings,
          updatedAt: new Date(),
        })
        .where(eq(privacySettings.userId, userId))
        .returning();
    } else {
      [result] = await db.insert(privacySettings)
        .values({
          userId,
          ...settings,
        })
        .returning();
    }
    
    // Invalidate cache
    this.cache.delete(`privacy:${userId}`);
    
    return result;
  }

  async logPrivacyRequest(request: InsertPrivacyRequest): Promise<void> {
    await db.insert(privacyRequests).values(request);
  }

  async getPrivacyRequests(userId?: string, status?: string): Promise<PrivacyRequest[]> {
    const conditions = [];
    if (userId) {
      conditions.push(eq(privacyRequests.userId, userId));
    }
    if (status) {
      conditions.push(eq(privacyRequests.status, status));
    }

    return conditions.length > 0
      ? await db.select().from(privacyRequests)
          .where(and(...conditions))
          .orderBy(desc(privacyRequests.requestedAt))
      : await db.select().from(privacyRequests)
          .orderBy(desc(privacyRequests.requestedAt));
  }

  async processPrivacyRequest(requestId: string, status: string, processedBy: string): Promise<void> {
    await db.update(privacyRequests)
      .set({
        status,
        processedBy,
        processedAt: new Date(),
      })
      .where(eq(privacyRequests.id, requestId));
  }
}

/**
 * Pricing module - handles dynamic pricing and market intelligence
 */
class PricingModule {
  async getPricingRules(): Promise<PricingRules[]> {
    return await db.select().from(pricingRules)
      .where(eq(pricingRules.isActive, true));
  }

  async getPricingRule(id: string): Promise<PricingRules | undefined> {
    const [rule] = await db.select().from(pricingRules)
      .where(eq(pricingRules.id, id));
    return rule;
  }

  async createPricingRule(rule: InsertPricingRules): Promise<PricingRules> {
    const [result] = await db.insert(pricingRules).values([rule]).returning();
    return result;
  }

  async updatePricingRule(id: string, rule: Partial<InsertPricingRules>): Promise<PricingRules> {
    const [result] = await db.update(pricingRules)
      .set({
        ...rule,
        updatedAt: new Date(),
      })
      .where(eq(pricingRules.id, id))
      .returning();
    return result;
  }

  async deletePricingRule(id: string): Promise<void> {
    await db.delete(pricingRules).where(eq(pricingRules.id, id));
  }

  async getPricingRuleByProduct(productId: string): Promise<PricingRules | undefined> {
    const [result] = await db.select().from(pricingRules)
      .where(and(
        eq(pricingRules.productId, productId),
        eq(pricingRules.isActive, true)
      ))
      .limit(1);
    return result;
  }

  async recordPriceChange(history: InsertPriceHistory): Promise<PriceHistory> {
    const [result] = await db.insert(priceHistory).values([history]).returning();
    return result;
  }

  async getPriceHistory(productId: string, params?: {
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<PriceHistory[]> {
    const conditions: SQL<unknown>[] = [eq(priceHistory.productId, productId)];

    if (params?.startDate) {
      conditions.push(gte(priceHistory.changedAt, params.startDate));
    }
    if (params?.endDate) {
      conditions.push(lte(priceHistory.changedAt, params.endDate));
    }

    let query = db.select().from(priceHistory)
      .where(and(...conditions))
      .orderBy(desc(priceHistory.changedAt));

    if (params?.limit) {
      query = query.limit(params.limit);
    }

    return await query;
  }

  async recordPricingPerformance(performance: InsertPricingPerformance): Promise<PricingPerformance> {
    const [result] = await db.insert(pricingPerformance)
      .values(performance)
      .returning();
    return result;
  }

  async getPricingPerformance(productId: string, startDate?: Date, endDate?: Date): Promise<PricingPerformance[]> {
    const conditions: SQL<unknown>[] = [eq(pricingPerformance.productId, productId)];

    if (startDate) {
      conditions.push(gte(pricingPerformance.periodStart, startDate));
    }
    if (endDate) {
      conditions.push(lte(pricingPerformance.periodEnd, endDate));
    }

    return await db.select().from(pricingPerformance)
      .where(and(...conditions))
      .orderBy(desc(pricingPerformance.periodStart));
  }

  async recordMarketIntelligence(intel: InsertMarketIntelligence): Promise<MarketIntelligence> {
    const [result] = await db.insert(marketIntelligence)
      .values(intel)
      .returning();
    return result;
  }

  async getMarketIntelligence(productId?: string, source?: string): Promise<MarketIntelligence[]> {
    const conditions = [];
    if (productId) {
      conditions.push(eq(marketIntelligence.productId, productId));
    }
    if (source) {
      conditions.push(eq(marketIntelligence.source, source));
    }

    return conditions.length > 0
      ? await db.select().from(marketIntelligence)
          .where(and(...conditions))
          .orderBy(desc(marketIntelligence.collectedAt))
      : await db.select().from(marketIntelligence)
          .orderBy(desc(marketIntelligence.collectedAt));
  }

  async createPricingOptimization(optimization: InsertPricingOptimization): Promise<PricingOptimization> {
    const [result] = await db.insert(pricingOptimizations)
      .values(optimization)
      .returning();
    return result;
  }

  async getPricingOptimizations(productId: string, status?: string): Promise<PricingOptimization[]> {
    const conditions = [eq(pricingOptimizations.productId, productId)];
    if (status) {
      conditions.push(eq(pricingOptimizations.status, status));
    }

    return await db.select().from(pricingOptimizations)
      .where(and(...conditions))
      .orderBy(desc(pricingOptimizations.createdAt));
  }

  async recordCompetitorPrice(price: InsertCompetitorPrice): Promise<void> {
    await db.insert(competitorPrices).values(price);
  }

  async getCompetitorPrices(productId: string, competitorId?: string): Promise<CompetitorPrice[]> {
    const conditions = [eq(competitorPrices.productId, productId)];
    if (competitorId) {
      conditions.push(eq(competitorPrices.competitorId, competitorId));
    }

    return await db.select().from(competitorPrices)
      .where(and(...conditions))
      .orderBy(desc(competitorPrices.observedAt));
  }

  async getPricingMetrics(productId: string, period: "day" | "week" | "month" = "month"): Promise<{
    averagePrice: number;
    priceVolatility: number;
    conversionRate: number;
    revenue: number;
    elasticity: number;
  }> {
    const startDate = new Date();
    if (period === "day") {
      startDate.setDate(startDate.getDate() - 1);
    } else if (period === "week") {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === "month") {
      startDate.setMonth(startDate.getMonth() - 1);
    }

    const performance = await this.getPricingPerformance(productId, startDate);
    
    if (performance.length === 0) {
      return {
        averagePrice: 0,
        priceVolatility: 0,
        conversionRate: 0,
        revenue: 0,
        elasticity: 0,
      };
    }

    const averagePrice = performance.reduce((sum, p) => sum + p.pricePoint, 0) / performance.length;
    const revenue = performance.reduce((sum, p) => sum + p.revenue, 0);
    const totalUnits = performance.reduce((sum, p) => sum + p.unitsSold, 0);
    const conversionRate = performance.reduce((sum, p) => sum + p.conversionRate, 0) / performance.length;
    
    // Calculate price volatility (standard deviation)
    const priceSquaredDiff = performance.reduce((sum, p) => sum + Math.pow(p.pricePoint - averagePrice, 2), 0);
    const priceVolatility = Math.sqrt(priceSquaredDiff / performance.length);
    
    // Simple elasticity calculation
    const elasticity = totalUnits > 0 ? (revenue / totalUnits) / averagePrice : 0;

    return {
      averagePrice,
      priceVolatility,
      conversionRate,
      revenue,
      elasticity,
    };
  }
}

/**
 * Experiments module - handles A/B testing and cohort analysis
 */
class ExperimentsModule {
  async createAbTest(test: InsertAbTest): Promise<AbTest> {
    const [newTest] = await db.insert(abTests).values(test).returning();
    return newTest;
  }

  async getAbTest(testId: string): Promise<AbTest | undefined> {
    const [test] = await db.select().from(abTests).where(eq(abTests.id, testId));
    return test;
  }

  async getAbTests(filters?: {
    status?: string;
    createdBy?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<AbTest[]> {
    const conditions: SQL<unknown>[] = [];
    
    if (filters?.status) {
      conditions.push(eq(abTests.status, filters.status));
    }
    if (filters?.createdBy) {
      conditions.push(eq(abTests.createdBy, filters.createdBy));
    }
    if (filters?.startDate) {
      conditions.push(gte(abTests.startDate, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(abTests.endDate, filters.endDate));
    }

    return conditions.length > 0
      ? await db.select().from(abTests)
          .where(and(...conditions))
          .orderBy(desc(abTests.createdAt))
      : await db.select().from(abTests)
          .orderBy(desc(abTests.createdAt));
  }

  async updateAbTest(testId: string, update: Partial<Omit<AbTest, "id" | "createdAt" | "updatedAt">>): Promise<AbTest> {
    const [updatedTest] = await db.update(abTests)
      .set({
        ...update,
        updatedAt: new Date(),
      })
      .where(eq(abTests.id, testId))
      .returning();
    return updatedTest;
  }

  async deleteAbTest(testId: string): Promise<void> {
    await db.delete(abTests).where(eq(abTests.id, testId));
  }

  async upsertAbTestResult(result: InsertAbTestResult): Promise<AbTestResult> {
    const existing = await db.select().from(abTestResults)
      .where(and(
        eq(abTestResults.testId, result.testId),
        eq(abTestResults.userId, result.userId || ""),
        eq(abTestResults.variant, result.variant)
      ))
      .limit(1);

    if (existing.length > 0) {
      const [updated] = await db.update(abTestResults)
        .set(result)
        .where(eq(abTestResults.id, existing[0].id))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(abTestResults)
        .values(result)
        .returning();
      return created;
    }
  }

  async getAbTestResults(testId: string, variant?: string): Promise<AbTestResult[]> {
    const conditions: SQL<unknown>[] = [eq(abTestResults.testId, testId)];
    
    if (variant) {
      conditions.push(eq(abTestResults.variant, variant));
    }

    return await db.select().from(abTestResults)
      .where(and(...conditions))
      .orderBy(desc(abTestResults.exposedAt));
  }

  async createAbTestInsight(insight: InsertAbTestInsight): Promise<AbTestInsight> {
    const [created] = await db.insert(abTestInsights)
      .values(insight)
      .returning();
    return created;
  }

  async getAbTestInsights(testId: string): Promise<AbTestInsight[]> {
    return await db.select().from(abTestInsights)
      .where(eq(abTestInsights.testId, testId))
      .orderBy(desc(abTestInsights.createdAt));
  }

  async createCohort(cohort: InsertCohort): Promise<Cohort> {
    const [newCohort] = await db.insert(cohorts).values([cohort]).returning();
    await this.refreshCohortMembership(newCohort.id);
    return newCohort;
  }

  async getCohort(cohortId: string): Promise<Cohort | undefined> {
    const [cohort] = await db.select().from(cohorts)
      .where(eq(cohorts.id, cohortId));
    return cohort;
  }

  async getCohorts(filters?: {
    isActive?: boolean;
    createdBy?: string;
  }): Promise<Cohort[]> {
    const conditions: SQL<unknown>[] = [];

    if (filters?.isActive !== undefined) {
      conditions.push(eq(cohorts.isActive, filters.isActive));
    }

    return conditions.length > 0
      ? await db.select().from(cohorts)
          .where(and(...conditions))
          .orderBy(desc(cohorts.createdAt))
      : await db.select().from(cohorts).orderBy(desc(cohorts.createdAt));
  }

  async updateCohort(cohortId: string, updates: Partial<InsertCohort>): Promise<Cohort> {
    const [updated] = await db.update(cohorts)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(cohorts.id, cohortId))
      .returning();

    if (updates.criteria) {
      await this.refreshCohortMembership(cohortId);
    }

    return updated;
  }

  async deleteCohort(cohortId: string): Promise<void> {
    await db.delete(cohorts).where(eq(cohorts.id, cohortId));
  }

  async refreshCohortMembership(cohortId: string): Promise<void> {
    await db.update(cohorts)
      .set({ lastRefreshed: new Date() })
      .where(eq(cohorts.id, cohortId));
  }

  async addCohortMember(member: InsertCohortMember): Promise<void> {
    await db.insert(cohortMembers).values(member);
  }

  async removeCohortMember(cohortId: string, userId: string): Promise<void> {
    await db.delete(cohortMembers)
      .where(and(
        eq(cohortMembers.cohortId, cohortId),
        eq(cohortMembers.userId, userId)
      ));
  }

  async getCohortMembers(cohortId: string): Promise<CohortMember[]> {
    return await db.select().from(cohortMembers)
      .where(eq(cohortMembers.cohortId, cohortId))
      .orderBy(desc(cohortMembers.joinedAt));
  }

  async upsertCohortMetric(metric: InsertCohortMetric): Promise<CohortMetric> {
    const existing = await db.select().from(cohortMetrics)
      .where(and(
        eq(cohortMetrics.cohortId, metric.cohortId),
        eq(cohortMetrics.metricName, metric.metricName),
        eq(cohortMetrics.calculatedAt, metric.calculatedAt)
      ))
      .limit(1);

    if (existing.length > 0) {
      const [updated] = await db.update(cohortMetrics)
        .set(metric)
        .where(eq(cohortMetrics.id, existing[0].id))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(cohortMetrics)
        .values(metric)
        .returning();
      return created;
    }
  }

  async getCohortMetrics(cohortId: string, metricName?: string): Promise<CohortMetric[]> {
    const conditions = [eq(cohortMetrics.cohortId, cohortId)];
    if (metricName) {
      conditions.push(eq(cohortMetrics.metricName, metricName));
    }

    return await db.select().from(cohortMetrics)
      .where(and(...conditions))
      .orderBy(desc(cohortMetrics.calculatedAt));
  }

  async createCohortComparison(comparison: InsertCohortComparison): Promise<CohortComparison> {
    const [created] = await db.insert(cohortComparisons)
      .values(comparison)
      .returning();
    return created;
  }

  async getCohortComparisons(cohortIdA: string, cohortIdB?: string): Promise<CohortComparison[]> {
    const conditions = [
      or(
        eq(cohortComparisons.cohortIdA, cohortIdA),
        eq(cohortComparisons.cohortIdB, cohortIdA)
      )
    ];

    if (cohortIdB) {
      conditions.push(
        or(
          eq(cohortComparisons.cohortIdA, cohortIdB),
          eq(cohortComparisons.cohortIdB, cohortIdB)
        )
      );
    }

    return await db.select().from(cohortComparisons)
      .where(and(...conditions))
      .orderBy(desc(cohortComparisons.comparedAt));
  }
}

/**
 * Support module - handles tickets and customer support
 */
class SupportModule {
  async getTickets(filters?: {
    status?: string;
    assignedTo?: string;
    priority?: string;
    category?: string;
    userId?: string;
  }): Promise<Ticket[]> {
    const conditions = [];

    if (filters?.status) {
      conditions.push(eq(tickets.status, filters.status));
    }
    if (filters?.assignedTo) {
      conditions.push(eq(tickets.assignedTo, filters.assignedTo));
    }
    if (filters?.priority) {
      conditions.push(eq(tickets.priority, filters.priority));
    }
    if (filters?.category) {
      conditions.push(eq(tickets.category, filters.category));
    }
    if (filters?.userId) {
      conditions.push(eq(tickets.userId, filters.userId));
    }

    return conditions.length > 0
      ? await db.select().from(tickets)
          .where(and(...conditions))
          .orderBy(desc(tickets.createdAt))
      : await db.select().from(tickets).orderBy(desc(tickets.createdAt));
  }

  async getTicket(ticketId: string): Promise<Ticket | undefined> {
    const [ticket] = await db.select().from(tickets)
      .where(eq(tickets.id, ticketId));
    return ticket;
  }

  async createTicket(ticket: InsertTicket): Promise<Ticket> {
    const [newTicket] = await db.insert(tickets)
      .values([ticket])
      .returning();
    return newTicket;
  }

  async updateTicket(ticketId: string, updates: Partial<Ticket>): Promise<Ticket> {
    const [updatedTicket] = await db.update(tickets)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(tickets.id, ticketId))
      .returning();
    return updatedTicket;
  }

  async deleteTicket(ticketId: string): Promise<void> {
    await db.delete(tickets).where(eq(tickets.id, ticketId));
  }

  async assignTicket(ticketId: string, agentId: string): Promise<Ticket> {
    const [updatedTicket] = await db.update(tickets)
      .set({
        assignedTo: agentId,
        status: "in_progress",
        updatedAt: new Date(),
      })
      .where(eq(tickets.id, ticketId))
      .returning();
    return updatedTicket;
  }

  async escalateTicket(ticketId: string, reason: string): Promise<Ticket> {
    const [updatedTicket] = await db.update(tickets)
      .set({
        priority: "high",
        status: "escalated",
        metadata: { escalationReason: reason },
        updatedAt: new Date(),
      })
      .where(eq(tickets.id, ticketId))
      .returning();
    return updatedTicket;
  }

  async resolveTicket(ticketId: string, resolution: string): Promise<Ticket> {
    const [updatedTicket] = await db.update(tickets)
      .set({
        status: "resolved",
        resolvedAt: new Date(),
        metadata: { resolution },
        updatedAt: new Date(),
      })
      .where(eq(tickets.id, ticketId))
      .returning();
    return updatedTicket;
  }

  async addTicketResponse(response: InsertTicketResponse): Promise<TicketResponse> {
    const [newResponse] = await db.insert(ticketResponses)
      .values(response)
      .returning();
    
    // Update ticket's last response time
    await db.update(tickets)
      .set({ lastResponseAt: new Date() })
      .where(eq(tickets.id, response.ticketId));
    
    return newResponse;
  }

  async getTicketResponses(ticketId: string): Promise<TicketResponse[]> {
    return await db.select().from(ticketResponses)
      .where(eq(ticketResponses.ticketId, ticketId))
      .orderBy(asc(ticketResponses.createdAt));
  }

  async getTicketsByUser(userId: string): Promise<Ticket[]> {
    return await db.select().from(tickets)
      .where(eq(tickets.userId, userId))
      .orderBy(desc(tickets.createdAt));
  }

  async getTicketsByAgent(agentId: string): Promise<Ticket[]> {
    return await db.select().from(tickets)
      .where(eq(tickets.assignedTo, agentId))
      .orderBy(desc(tickets.createdAt));
  }

  async getTicketStats(period?: "day" | "week" | "month"): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
    avgResolutionTime: number;
    satisfactionScore: number;
  }> {
    const startDate = new Date();
    if (period === "day") {
      startDate.setDate(startDate.getDate() - 1);
    } else if (period === "week") {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === "month") {
      startDate.setMonth(startDate.getMonth() - 1);
    }

    const allTickets = period
      ? await db.select().from(tickets)
          .where(gte(tickets.createdAt, startDate))
      : await db.select().from(tickets);

    const byStatus: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    let totalResolutionTime = 0;
    let resolvedCount = 0;

    for (const ticket of allTickets) {
      byStatus[ticket.status] = (byStatus[ticket.status] || 0) + 1;
      byPriority[ticket.priority] = (byPriority[ticket.priority] || 0) + 1;
      
      if (ticket.resolvedAt) {
        const resolutionTime = ticket.resolvedAt.getTime() - ticket.createdAt.getTime();
        totalResolutionTime += resolutionTime;
        resolvedCount++;
      }
    }

    const avgResolutionTime = resolvedCount > 0 
      ? totalResolutionTime / resolvedCount / (1000 * 60 * 60) // Convert to hours
      : 0;

    // Get satisfaction scores
    const scores = await db.select().from(satisfactionScores);
    const satisfactionScore = scores.length > 0
      ? scores.reduce((sum, s) => sum + s.rating, 0) / scores.length
      : 0;

    return {
      total: allTickets.length,
      byStatus,
      byPriority,
      avgResolutionTime,
      satisfactionScore,
    };
  }

  async getAgentPerformance(agentId: string): Promise<{
    ticketsResolved: number;
    avgResolutionTime: number;
    satisfactionScore: number;
    currentLoad: number;
  }> {
    const agentTickets = await this.getTicketsByAgent(agentId);
    
    let resolvedCount = 0;
    let totalResolutionTime = 0;
    let currentLoad = 0;

    for (const ticket of agentTickets) {
      if (ticket.status === "in_progress") {
        currentLoad++;
      }
      if (ticket.resolvedAt) {
        resolvedCount++;
        const resolutionTime = ticket.resolvedAt.getTime() - ticket.createdAt.getTime();
        totalResolutionTime += resolutionTime;
      }
    }

    const avgResolutionTime = resolvedCount > 0
      ? totalResolutionTime / resolvedCount / (1000 * 60 * 60) // Convert to hours
      : 0;

    // Get satisfaction scores for this agent's tickets
    const ticketIds = agentTickets.map(t => t.id);
    const scores = ticketIds.length > 0
      ? await db.select().from(satisfactionScores)
          .where(inArray(satisfactionScores.ticketId, ticketIds))
      : [];

    const satisfactionScore = scores.length > 0
      ? scores.reduce((sum, s) => sum + s.rating, 0) / scores.length
      : 0;

    return {
      ticketsResolved: resolvedCount,
      avgResolutionTime,
      satisfactionScore,
      currentLoad,
    };
  }

  async searchTickets(query: string): Promise<Ticket[]> {
    return await db.select().from(tickets)
      .where(or(
        ilike(tickets.subject, `%${query}%`),
        ilike(tickets.description, `%${query}%`)
      ))
      .orderBy(desc(tickets.createdAt));
  }

  async getRoutingRules(): Promise<RoutingRule[]> {
    return await db.select().from(routingRules)
      .where(eq(routingRules.isActive, true))
      .orderBy(asc(routingRules.priority));
  }

  async createRoutingRule(rule: InsertRoutingRule): Promise<RoutingRule> {
    const [newRule] = await db.insert(routingRules)
      .values(rule)
      .returning();
    return newRule;
  }

  async updateRoutingRule(ruleId: string, updates: Partial<RoutingRule>): Promise<RoutingRule> {
    const [updated] = await db.update(routingRules)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(routingRules.id, ruleId))
      .returning();
    return updated;
  }

  async deleteRoutingRule(ruleId: string): Promise<void> {
    await db.delete(routingRules).where(eq(routingRules.id, ruleId));
  }

  async getAgentExpertise(agentId: string): Promise<AgentExpertise[]> {
    return await db.select().from(agentExpertise)
      .where(eq(agentExpertise.agentId, agentId));
  }

  async updateAgentExpertise(agentId: string, expertise: Partial<InsertAgentExpertise>): Promise<void> {
    const existing = await this.getAgentExpertise(agentId);
    
    if (existing.length > 0) {
      await db.update(agentExpertise)
        .set({
          ...expertise,
          updatedAt: new Date(),
        })
        .where(eq(agentExpertise.agentId, agentId));
    } else {
      await db.insert(agentExpertise)
        .values({
          agentId,
          ...expertise,
        });
    }
  }

  async getSatisfactionScores(ticketId?: string): Promise<SatisfactionScore[]> {
    return ticketId
      ? await db.select().from(satisfactionScores)
          .where(eq(satisfactionScores.ticketId, ticketId))
      : await db.select().from(satisfactionScores)
          .orderBy(desc(satisfactionScores.createdAt));
  }

  async recordSatisfactionScore(score: InsertSatisfactionScore): Promise<SatisfactionScore> {
    const [newScore] = await db.insert(satisfactionScores)
      .values(score)
      .returning();
    return newScore;
  }
}

/**
 * AdminStorage Facade
 */
export class AdminStorage {
  public readonly billing: BillingModule;
  public readonly security: SecurityModule;
  public readonly pricing: PricingModule;
  public readonly experiments: ExperimentsModule;
  public readonly support: SupportModule;

  constructor() {
    this.billing = new BillingModule();
    this.security = new SecurityModule();
    this.pricing = new PricingModule();
    this.experiments = new ExperimentsModule();
    this.support = new SupportModule();
  }
}