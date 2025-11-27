/**
 * @file server/storage/domains/security.storage.ts
 * @description Security, moderation, fraud detection, and privacy storage operations
 * 
 * Domain: Security & Trust
 * Scope: Content moderation, fraud detection, suspicious activity tracking, privacy settings
 * 
 * EXPORT PATTERN:
 * - Export CLASS (SecurityStorage) for dependency injection and testing
 * - Export singleton INSTANCE (securityStorage) for convenience in production code
 * - Facades should instantiate their own instances OR use the shared singleton consistently
 */

import { db } from "../../db";
import { and, eq, desc, sql, gte, lte, or, type SQL } from "drizzle-orm";
import { createInsertData, createUpdateData, buildMetadata } from "../../types/storage-helpers";
import type { ISecurityStorage } from "../interfaces/ISecurityStorage";
import {
  moderationLogs,
  blockedContent,
  moderationAppeals,
  fraudScores,
  suspiciousActivities,
  fraudReviews,
  fraudDetectionResults,
  privacySettings,
  type ModerationLog,
  type InsertModerationLog,
  type BlockedContent,
  type InsertBlockedContent,
  type ModerationAppeal,
  type InsertModerationAppeal,
  type FraudScore,
  type InsertFraudScore,
  type SuspiciousActivity,
  type InsertSuspiciousActivity,
  type FraudReview,
  type InsertFraudReview,
  type FraudDetectionResult,
  type InsertFraudDetectionResult,
  type PrivacySettings,
  type InsertPrivacySettings,
  type FraudReviewRestrictions,
} from "@shared/schema/security";

/**
 * Security Storage
 * 
 * Manages content moderation, fraud detection, and privacy settings.
 * Provides comprehensive security monitoring and threat prevention capabilities.
 */
export class SecurityStorage implements ISecurityStorage {
  private cache = new Map<string, { data: any; expires: number }>();
  private readonly USER_PREFS_TTL = 30 * 60 * 1000; // 30 minutes

  private getCached<T>(key: string): T | undefined {
    const cached = this.cache.get(key);
    if (cached && cached.expires > Date.now()) {
      return cached.data as T;
    }
    this.cache.delete(key);
    return undefined;
  }

  private setCached(key: string, data: any, ttl: number): void {
    this.cache.set(key, { data, expires: Date.now() + ttl });
  }

  private invalidateCache(key: string): void {
    this.cache.delete(key);
  }

  // ==================== Content Moderation ====================

  async createModerationLog(log: InsertModerationLog): Promise<ModerationLog> {
    const [result] = await db
      .insert(moderationLogs)
      .values([log as typeof moderationLogs.$inferInsert])
      .returning();
    return result;
  }

  async updateModerationLog(
    id: string,
    updates: Partial<InsertModerationLog>
  ): Promise<void> {
    const updateData: Record<string, unknown> = {
      ...updates,
      updatedAt: new Date(),
    };
    await db
      .update(moderationLogs)
      .set(updateData)
      .where(eq(moderationLogs.id, id));
  }

  async getModerationQueue(
    userId: string,
    isAdmin: boolean,
    filters?: {
      status?: string;
      severity?: string;
      contentType?: string;
    }
  ): Promise<ModerationLog[]> {
    // Build where conditions
    const conditions: SQL<unknown>[] = [];

    // Admin can see all logs, non-admin can only see their own
    if (!isAdmin) {
      conditions.push(eq(moderationLogs.userId, userId));
    }

    // Apply filters
    if (filters?.status) {
      conditions.push(eq(moderationLogs.actionTaken, filters.status));
    }
    if (filters?.severity) {
      conditions.push(eq(moderationLogs.severity, filters.severity));
    }
    if (filters?.contentType) {
      conditions.push(eq(moderationLogs.contentType, filters.contentType));
    }

    // Build and execute query
    if (conditions.length > 0) {
      return await db
        .select()
        .from(moderationLogs)
        .where(and(...conditions))
        .orderBy(desc(moderationLogs.createdAt));
    }

    return await db
      .select()
      .from(moderationLogs)
      .orderBy(desc(moderationLogs.createdAt));
  }

  async getModerationStats(timeRange?: { start: Date; end: Date }): Promise<{
    totalChecked: number;
    totalBlocked: number;
    totalFlagged: number;
    totalAppeals: number;
    appealsApproved: number;
    categoriesBreakdown: { [key: string]: number };
    severityBreakdown: { [key: string]: number };
    averageConfidence: number;
  }> {
    // Build where conditions for time range
    const conditions: SQL<unknown>[] = [];
    if (timeRange) {
      conditions.push(
        gte(moderationLogs.createdAt, timeRange.start),
        lte(moderationLogs.createdAt, timeRange.end)
      );
    }

    // Get moderation logs
    const query = db.select().from(moderationLogs);
    const logs =
      conditions.length > 0
        ? await query.where(and(...conditions))
        : await query;

    const totalChecked = logs.length;
    const totalBlocked = logs.filter((log) => log.actionTaken === "blocked").length;
    const totalFlagged = logs.filter((log) => log.actionTaken === "flagged").length;

    // Get appeals
    const appealsQuery = db.select().from(moderationAppeals);
    const appeals = conditions.length > 0
      ? await appealsQuery.where(and(...conditions.map(c => 
          // Map createdAt conditions to moderationAppeals.createdAt
          sql`${moderationAppeals.createdAt} ${c}`.as('condition')
        )))
      : await appealsQuery;

    const totalAppeals = appeals.length;
    const appealsApproved = appeals.filter(
      (appeal) => appeal.decision === "approved"
    ).length;

    // Calculate breakdowns
    const categoriesBreakdown: { [key: string]: number } = {};
    const severityBreakdown: { [key: string]: number } = {};

    logs.forEach((log) => {
      // Categories breakdown
      if (log.categories) {
        log.categories.forEach((category) => {
          categoriesBreakdown[category] =
            (categoriesBreakdown[category] || 0) + 1;
        });
      }

      // Severity breakdown
      if (log.severity) {
        severityBreakdown[log.severity] =
          (severityBreakdown[log.severity] || 0) + 1;
      }
    });

    // Calculate average confidence
    const confidenceScores = logs
      .filter((log) => log.confidence !== null)
      .map((log) => log.confidence!);
    const averageConfidence =
      confidenceScores.length > 0
        ? confidenceScores.reduce((sum, score) => sum + score, 0) /
          confidenceScores.length
        : 0;

    return {
      totalChecked,
      totalBlocked,
      totalFlagged,
      totalAppeals,
      appealsApproved,
      categoriesBreakdown,
      severityBreakdown,
      averageConfidence,
    };
  }

  // ==================== Blocked Content ====================

  async createBlockedContent(
    content: InsertBlockedContent
  ): Promise<BlockedContent> {
    const [result] = await db
      .insert(blockedContent)
      .values([content as typeof blockedContent.$inferInsert])
      .returning();
    return result;
  }

  async restoreBlockedContent(id: string, restoredBy: string): Promise<void> {
    await db
      .update(blockedContent)
      .set({
        status: "restored",
        restoredBy,
        restoredAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(blockedContent.id, id));
  }

  async getBlockedContent(
    userId: string,
    filters?: { status?: string }
  ): Promise<BlockedContent[]> {
    const conditions: SQL<unknown>[] = [eq(blockedContent.userId, userId)];

    if (filters?.status) {
      conditions.push(eq(blockedContent.status, filters.status));
    }

    return await db
      .select()
      .from(blockedContent)
      .where(and(...conditions))
      .orderBy(desc(blockedContent.timestamp));
  }

  async deleteBlockedContent(id: string): Promise<void> {
    await db.delete(blockedContent).where(eq(blockedContent.id, id));
  }

  // ==================== Moderation Appeals ====================

  async createModerationAppeal(
    appeal: InsertModerationAppeal
  ): Promise<ModerationAppeal> {
    const [result] = await db
      .insert(moderationAppeals)
      .values([appeal])
      .returning();
    return result;
  }

  async getModerationAppeal(id: string): Promise<ModerationAppeal | undefined> {
    const [result] = await db
      .select()
      .from(moderationAppeals)
      .where(eq(moderationAppeals.id, id))
      .limit(1);
    return result;
  }

  async updateModerationAppeal(
    id: string,
    updates: Partial<InsertModerationAppeal>
  ): Promise<void> {
    await db
      .update(moderationAppeals)
      .set({
        ...(updates),
        updatedAt: new Date(),
      })
      .where(eq(moderationAppeals.id, id));
  }

  async getModerationAppeals(
    userId: string,
    filters?: { status?: string }
  ): Promise<ModerationAppeal[]> {
    const conditions: SQL<unknown>[] = [eq(moderationAppeals.userId, userId)];

    if (filters?.status) {
      conditions.push(eq(moderationAppeals.status, filters.status));
    }

    return await db
      .select()
      .from(moderationAppeals)
      .where(and(...conditions))
      .orderBy(desc(moderationAppeals.createdAt));
  }

  async decideModerationAppeal(
    id: string,
    decision: "approved" | "rejected" | "partially_approved",
    decisionReason: string,
    decidedBy: string
  ): Promise<void> {
    await db
      .update(moderationAppeals)
      .set({
        decision,
        decisionReason,
        decidedBy,
        decidedAt: new Date(),
        status: decision === "approved" ? "approved" : "rejected",
        updatedAt: new Date(),
      })
      .where(eq(moderationAppeals.id, id));
  }

  // ==================== Fraud Detection ====================

  async createFraudScore(score: InsertFraudScore): Promise<FraudScore> {
    const [result] = await db
      .insert(fraudScores)
      .values([score])
      .returning();
    return result;
  }

  async getFraudScores(
    userId: string,
    limit: number = 10
  ): Promise<FraudScore[]> {
    const scores = await db
      .select()
      .from(fraudScores)
      .where(eq(fraudScores.userId, userId))
      .orderBy(desc(fraudScores.timestamp))
      .limit(limit);
    return scores;
  }

  async getLatestFraudScore(userId: string): Promise<FraudScore | undefined> {
    const [score] = await db
      .select()
      .from(fraudScores)
      .where(eq(fraudScores.userId, userId))
      .orderBy(desc(fraudScores.timestamp))
      .limit(1);
    return score;
  }

  async createFraudDetectionResult(
    result: InsertFraudDetectionResult
  ): Promise<FraudDetectionResult> {
    const [created] = await db
      .insert(fraudDetectionResults)
      .values([result as typeof fraudDetectionResults.$inferInsert])
      .returning();
    return created;
  }

  async getFraudDetectionResults(
    userId: string,
    filters?: {
      analysisType?: string;
      riskLevel?: string;
      startDate?: Date;
    }
  ): Promise<FraudDetectionResult[]> {
    const conditions: SQL<unknown>[] = [
      eq(fraudDetectionResults.userId, userId),
    ];

    if (filters?.analysisType) {
      conditions.push(
        eq(fraudDetectionResults.analysisType, filters.analysisType as typeof fraudDetectionResults.analysisType._.data)
      );
    }

    if (filters?.riskLevel) {
      conditions.push(
        eq(fraudDetectionResults.riskLevel, filters.riskLevel as typeof fraudDetectionResults.riskLevel._.data)
      );
    }

    if (filters?.startDate) {
      conditions.push(gte(fraudDetectionResults.analyzedAt, filters.startDate));
    }

    return await db
      .select()
      .from(fraudDetectionResults)
      .where(and(...conditions))
      .orderBy(desc(fraudDetectionResults.analyzedAt));
  }

  async getHighRiskUsers(
    threshold: number = 0.75,
    limit: number = 50
  ): Promise<Array<{ userId: string; score: number; timestamp: Date }>> {
    // Get latest fraud score for each user
    const results = await db
      .select({
        userId: fraudScores.userId,
        score: fraudScores.score,
        timestamp: fraudScores.timestamp,
      })
      .from(fraudScores)
      .where(gte(fraudScores.score, threshold))
      .orderBy(desc(fraudScores.timestamp))
      .limit(limit);

    return results.map((r) => ({
      userId: r.userId,
      score: r.score,
      timestamp: r.timestamp!,
    }));
  }

  // ==================== Suspicious Activities ====================

  async createSuspiciousActivity(
    activity: InsertSuspiciousActivity
  ): Promise<SuspiciousActivity> {
    const [result] = await db
      .insert(suspiciousActivities)
      .values([activity as typeof suspiciousActivities.$inferInsert])
      .returning();
    return result;
  }

  async getSuspiciousActivities(
    userId?: string,
    isAdmin: boolean = false
  ): Promise<SuspiciousActivity[]> {
    // Filter by userId if provided or if not admin
    if (userId && !isAdmin) {
      return await db
        .select()
        .from(suspiciousActivities)
        .where(eq(suspiciousActivities.userId, userId))
        .orderBy(desc(suspiciousActivities.detectedAt));
    } else if (!isAdmin) {
      // Non-admin users with no userId specified should not see any activities
      return [];
    }

    // Admin can see all activities
    return await db
      .select()
      .from(suspiciousActivities)
      .orderBy(desc(suspiciousActivities.detectedAt));
  }

  async updateSuspiciousActivity(
    activityId: string,
    status: "pending" | "reviewing" | "confirmed" | "dismissed" | "escalated",
    resolvedAt?: Date
  ): Promise<void> {
    await db
      .update(suspiciousActivities)
      .set({
        status,
        resolvedAt: resolvedAt || null,
      })
      .where(eq(suspiciousActivities.id, activityId));
  }

  async getSuspiciousActivitiesByType(
    activityType: string,
    limit: number = 100
  ): Promise<SuspiciousActivity[]> {
    return await db
      .select()
      .from(suspiciousActivities)
      .where(eq(suspiciousActivities.activityType, activityType))
      .orderBy(desc(suspiciousActivities.detectedAt))
      .limit(limit);
  }

  // ==================== Fraud Reviews ====================

  async createFraudReview(review: InsertFraudReview): Promise<FraudReview> {
    const [result] = await db
      .insert(fraudReviews)
      .values([review as typeof fraudReviews.$inferInsert])
      .returning();
    return result;
  }

  async getFraudReviews(userId: string): Promise<FraudReview[]> {
    const reviews = await db
      .select()
      .from(fraudReviews)
      .where(eq(fraudReviews.userId, userId))
      .orderBy(desc(fraudReviews.reviewedAt));
    return reviews;
  }

  async getActiveRestrictions(
    userId: string
  ): Promise<FraudReview | undefined> {
    const [review] = await db
      .select()
      .from(fraudReviews)
      .where(
        and(
          eq(fraudReviews.userId, userId),
          or(
            eq(fraudReviews.decision, "restricted"),
            eq(fraudReviews.decision, "flagged"),
            eq(fraudReviews.decision, "monitor")
          ),
          // Only get active restrictions (not expired)
          or(
            sql`${fraudReviews.expiresAt} IS NULL`,
            gte(fraudReviews.expiresAt, new Date())
          )
        )
      )
      .orderBy(desc(fraudReviews.reviewedAt))
      .limit(1);
    return review;
  }

  async blockUserForFraud(
    userId: string,
    reviewerId: string,
    reason: string,
    restrictions?: FraudReviewRestrictions
  ): Promise<FraudReview> {
    const [review] = await db
      .insert(fraudReviews)
      .values([{
        userId,
        reviewerId,
        decision: "banned",
        notes: reason,
        restrictions,
      }])
      .returning();
    return review;
  }

  // ==================== Fraud Statistics ====================

  async getFraudStats(period: "day" | "week" | "month"): Promise<{
    totalScores: number;
    averageScore: number;
    highRiskCount: number;
    suspiciousActivitiesCount: number;
    reviewsCount: number;
    autoBlockedCount: number;
    topActivityTypes: { type: string; count: number }[];
    riskDistribution: { level: string; count: number }[];
  }> {
    // Calculate date range based on period
    const now = new Date();
    const startDate = new Date();

    switch (period) {
      case "day":
        startDate.setDate(now.getDate() - 1);
        break;
      case "week":
        startDate.setDate(now.getDate() - 7);
        break;
      case "month":
        startDate.setMonth(now.getMonth() - 1);
        break;
    }

    // Get fraud scores in the period
    const scores = await db
      .select()
      .from(fraudScores)
      .where(gte(fraudScores.timestamp, startDate));

    const totalScores = scores.length;
    const averageScore =
      totalScores > 0
        ? scores.reduce((sum, s) => sum + s.score, 0) / totalScores
        : 0;
    const highRiskCount = scores.filter((s) => s.score > 0.75).length;

    // Get suspicious activities
    const activities = await db
      .select()
      .from(suspiciousActivities)
      .where(gte(suspiciousActivities.detectedAt, startDate));

    const suspiciousActivitiesCount = activities.length;
    const autoBlockedCount = activities.filter((a) => a.autoBlocked).length;

    // Calculate top activity types
    const activityTypeCounts: { [key: string]: number } = {};
    activities.forEach((a) => {
      activityTypeCounts[a.activityType] =
        (activityTypeCounts[a.activityType] || 0) + 1;
    });
    const topActivityTypes = Object.entries(activityTypeCounts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Calculate risk distribution
    const riskLevelCounts: { [key: string]: number } = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };
    activities.forEach((a) => {
      riskLevelCounts[a.riskLevel] = (riskLevelCounts[a.riskLevel] || 0) + 1;
    });
    const riskDistribution = Object.entries(riskLevelCounts).map(
      ([level, count]) => ({ level, count })
    );

    // Get reviews count
    const reviews = await db
      .select()
      .from(fraudReviews)
      .where(gte(fraudReviews.reviewedAt, startDate));
    const reviewsCount = reviews.length;

    return {
      totalScores,
      averageScore,
      highRiskCount,
      suspiciousActivitiesCount,
      reviewsCount,
      autoBlockedCount,
      topActivityTypes,
      riskDistribution,
    };
  }

  // ==================== Privacy Settings ====================

  async getPrivacySettings(
    userId: string
  ): Promise<PrivacySettings | undefined> {
    const cacheKey = `privacy:${userId}`;
    const cached = this.getCached<PrivacySettings>(cacheKey);
    if (cached) return cached;

    const [settings] = await db
      .select()
      .from(privacySettings)
      .where(eq(privacySettings.userId, userId))
      .limit(1);

    if (settings) {
      this.setCached(cacheKey, settings, this.USER_PREFS_TTL);
    }

    return settings;
  }

  async upsertPrivacySettings(
    userId: string,
    settings: Omit<InsertPrivacySettings, "userId">
  ): Promise<PrivacySettings> {
    const insertData = {
      ...settings,
      userId,
    } as typeof privacySettings.$inferInsert;
    
    const updateData: Record<string, unknown> = {
      ...settings,
      updatedAt: new Date(),
    };
    
    const [upserted] = await db
      .insert(privacySettings)
      .values([insertData])
      .onConflictDoUpdate({
        target: privacySettings.userId,
        set: updateData,
      })
      .returning();

    // Invalidate cache
    this.invalidateCache(`privacy:${userId}`);

    return upserted;
  }

  async deletePrivacySettings(userId: string): Promise<void> {
    await db.delete(privacySettings).where(eq(privacySettings.userId, userId));
    this.invalidateCache(`privacy:${userId}`);
  }
}

// Export singleton instance for convenience
export const securityStorage = new SecurityStorage();
