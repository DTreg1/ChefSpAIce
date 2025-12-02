/**
 * @file server/storage/interfaces/ISecurityStorage.ts
 * @description Interface for security, moderation, fraud detection, and privacy operations
 */

import type {
  ModerationLog,
  InsertModerationLog,
  BlockedContent,
  InsertBlockedContent,
  ModerationAppeal,
  InsertModerationAppeal,
  FraudScore,
  InsertFraudScore,
  SuspiciousActivity,
  InsertSuspiciousActivity,
  FraudReview,
  InsertFraudReview,
  FraudDetectionResult,
  InsertFraudDetectionResult,
  PrivacySettings,
  InsertPrivacySettings,
  FraudReviewRestrictions,
} from "@shared/schema/security";

export interface ISecurityStorage {
  // ==================== Content Moderation ====================
  createModerationLog(log: InsertModerationLog): Promise<ModerationLog>;
  updateModerationLog(
    id: string,
    updates: Partial<InsertModerationLog>,
  ): Promise<void>;
  getModerationQueue(
    userId: string,
    isAdmin: boolean,
    filters?: {
      status?: string;
      severity?: string;
      contentType?: string;
    },
  ): Promise<ModerationLog[]>;
  getModerationStats(timeRange?: { start: Date; end: Date }): Promise<{
    totalChecked: number;
    totalBlocked: number;
    totalFlagged: number;
    totalAppeals: number;
    appealsApproved: number;
    categoriesBreakdown: { [key: string]: number };
    severityBreakdown: { [key: string]: number };
    averageConfidence: number;
  }>;

  // ==================== Blocked Content ====================
  createBlockedContent(content: InsertBlockedContent): Promise<BlockedContent>;
  restoreBlockedContent(id: string, restoredBy: string): Promise<void>;
  getBlockedContent(
    userId: string,
    filters?: { status?: string },
  ): Promise<BlockedContent[]>;
  deleteBlockedContent(id: string): Promise<void>;

  // ==================== Moderation Appeals ====================
  createModerationAppeal(
    appeal: InsertModerationAppeal,
  ): Promise<ModerationAppeal>;
  getModerationAppeal(id: string): Promise<ModerationAppeal | undefined>;
  updateModerationAppeal(
    id: string,
    updates: Partial<InsertModerationAppeal>,
  ): Promise<void>;
  getModerationAppeals(
    userId: string,
    filters?: { status?: string },
  ): Promise<ModerationAppeal[]>;
  decideModerationAppeal(
    id: string,
    decision: "approved" | "rejected" | "partially_approved",
    decisionReason: string,
    decidedBy: string,
  ): Promise<void>;

  // ==================== Fraud Detection ====================
  createFraudScore(score: InsertFraudScore): Promise<FraudScore>;
  getFraudScores(userId: string, limit?: number): Promise<FraudScore[]>;
  getLatestFraudScore(userId: string): Promise<FraudScore | undefined>;
  createFraudDetectionResult(
    result: InsertFraudDetectionResult,
  ): Promise<FraudDetectionResult>;
  getFraudDetectionResults(
    userId: string,
    filters?: {
      analysisType?: string;
      riskLevel?: string;
      startDate?: Date;
    },
  ): Promise<FraudDetectionResult[]>;
  getHighRiskUsers(
    threshold: number,
    limit?: number,
  ): Promise<Array<{ userId: string; score: number; timestamp: Date }>>;

  // ==================== Suspicious Activities ====================
  createSuspiciousActivity(
    activity: InsertSuspiciousActivity,
  ): Promise<SuspiciousActivity>;
  getSuspiciousActivities(
    userId?: string,
    isAdmin?: boolean,
  ): Promise<SuspiciousActivity[]>;
  updateSuspiciousActivity(
    activityId: string,
    status: "pending" | "reviewing" | "confirmed" | "dismissed" | "escalated",
    resolvedAt?: Date,
  ): Promise<void>;
  getSuspiciousActivitiesByType(
    activityType: string,
    limit?: number,
  ): Promise<SuspiciousActivity[]>;

  // ==================== Fraud Reviews ====================
  createFraudReview(review: InsertFraudReview): Promise<FraudReview>;
  getFraudReviews(userId: string): Promise<FraudReview[]>;
  getActiveRestrictions(userId: string): Promise<FraudReview | undefined>;
  /** Block a user for fraud with optional restrictions */
  blockUserForFraud(
    userId: string,
    reviewerId: string,
    reason: string,
    restrictions?: FraudReviewRestrictions,
  ): Promise<FraudReview>;

  // ==================== Fraud Statistics ====================
  getFraudStats(period: "day" | "week" | "month"): Promise<{
    totalScores: number;
    averageScore: number;
    highRiskCount: number;
    suspiciousActivitiesCount: number;
    reviewsCount: number;
    autoBlockedCount: number;
    topActivityTypes: { type: string; count: number }[];
    riskDistribution: { level: string; count: number }[];
  }>;

  // ==================== Privacy Settings ====================
  getPrivacySettings(userId: string): Promise<PrivacySettings | undefined>;
  upsertPrivacySettings(
    userId: string,
    settings: Omit<InsertPrivacySettings, "userId">,
  ): Promise<PrivacySettings>;
  deletePrivacySettings(userId: string): Promise<void>;
}
