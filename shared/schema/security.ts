/**
 * Security & Moderation Schema
 * 
 * Tables for content moderation, fraud detection, privacy settings, and security monitoring.
 * Combines TensorFlow.js and OpenAI for comprehensive threat detection.
 */

import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, index, jsonb, real, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./auth";

// ==================== TypeScript Interfaces ====================

/**
 * Content moderation toxicity scores
 * Combines TensorFlow.js and OpenAI moderation scores
 * Maps to moderationLogs.toxicityScores JSONB column
 */
export interface ModerationResult {
  /** General toxicity score (0-1, higher = more toxic) */
  toxicity?: number;
  /** Severe toxicity score (0-1) */
  severeToxicity?: number;
  /** Identity-based attack score (0-1) */
  identityAttack?: number;
  /** Insult score (0-1) */
  insult?: number;
  /** Profanity score (0-1) */
  profanity?: number;
  /** Threat score (0-1) */
  threat?: number;
  /** Sexually explicit content score (0-1) */
  sexuallyExplicit?: number;
  /** Obscene content score (0-1) */
  obscene?: number;
  /** Harassment score (0-1) - OpenAI specific */
  harassment?: number;
  /** Threatening harassment score (0-1) - OpenAI specific */
  harassmentThreatening?: number;
  /** Hate speech score (0-1) - OpenAI specific */
  hate?: number;
  /** Threatening hate speech score (0-1) - OpenAI specific */
  hateThreatening?: number;
  /** Self-harm content score (0-1) - OpenAI specific */
  selfHarm?: number;
  /** Self-harm intent score (0-1) - OpenAI specific */
  selfHarmIntent?: number;
  /** Self-harm instruction score (0-1) - OpenAI specific */
  selfHarmInstruction?: number;
  /** Sexual content score (0-1) - OpenAI specific */
  sexual?: number;
  /** Sexual content involving minors score (0-1) - OpenAI specific */
  sexualMinors?: number;
  /** Violence score (0-1) - OpenAI specific */
  violence?: number;
  /** Graphic violence score (0-1) - OpenAI specific */
  violenceGraphic?: number;
}

/**
 * Additional context about blocked content
 * Provides context for moderation decisions
 * Maps to blockedContent.metadata JSONB column
 */
export interface ModerationMetadata {
  /** Original location where content was posted */
  originalLocation?: string;
  /** User IDs of target users (for directed harassment) */
  targetUsers?: string[];
  /** Additional context about the content */
  context?: string;
  /** Number of previous violations by this user */
  previousViolations?: number;
}

/**
 * Individual fraud risk factor with score and weight
 * Used to break down overall fraud risk into component factors
 * Maps to fraudScores.factors JSONB column
 */
export interface FraudRiskFactor {
  /** Behavior pattern analysis score (0-1, higher = more suspicious) */
  behaviorScore: number;
  /** Account age risk score (0-1, newer accounts = higher risk) */
  accountAgeScore: number;
  /** Transaction velocity risk score (0-1, rapid transactions = higher risk) */
  transactionVelocityScore: number;
  /** Content pattern analysis score (0-1, spam/bot-like = higher risk) */
  contentPatternScore: number;
  /** Network reputation score (0-1, bad IP/proxy = higher risk) */
  networkScore: number;
  /** Device fingerprint analysis score (0-1, suspicious device = higher risk) */
  deviceScore: number;
  /** Geographic anomaly score (0-1, unusual location = higher risk) */
  geoScore: number;
  /** Additional detailed scoring information */
  details: Record<string, any>;
}

/**
 * Evidence supporting fraud detection
 * Documents suspicious activities and related information
 * Maps to suspiciousActivities.details JSONB column
 */
export interface FraudEvidenceDetail {
  /** Human-readable description of the suspicious activity */
  description: string;
  /** Raw data or logs that triggered the detection */
  evidence?: any[];
  /** Pattern that matched (if pattern-based detection) */
  matchedPattern?: string;
  /** Risk indicators that were triggered */
  riskIndicators?: string[];
  /** Timestamp of the activity */
  timestamp?: string;
  /** Related user IDs or entities */
  relatedEntities?: string[];
}

/**
 * Device information for fraud detection
 * Captures device fingerprinting data for fraud analysis
 * Maps to fraudDetectionResults.deviceInfo JSONB column
 */
export interface FraudDeviceInfo {
  /** Unique device fingerprint hash */
  fingerprint?: string;
  /** Device type (mobile, desktop, tablet, etc.) */
  deviceType?: string;
  /** Operating system information */
  os?: string;
  /** Browser information */
  browser?: string;
  /** Screen resolution */
  screenResolution?: string;
  /** Timezone offset */
  timezone?: string;
  /** Language preferences */
  language?: string;
  /** IP address */
  ipAddress?: string;
  /** Geolocation data */
  location?: {
    country?: string;
    region?: string;
    city?: string;
    lat?: number;
    lng?: number;
  };
  /** Whether using VPN/proxy */
  isVpn?: boolean;
  /** Whether using Tor */
  isTor?: boolean;
  /** Whether using known bot user agent */
  isBot?: boolean;
}

/**
 * Behavioral analysis data for fraud detection
 * Tracks user behavior patterns for anomaly detection
 * Maps to fraudDetectionResults.behaviorData JSONB column
 */
export interface FraudBehaviorData {
  /** Session count in the analyzed period */
  sessionCount?: number;
  /** Average session duration (seconds) */
  avgSessionDuration?: number;
  /** Transaction count in the analyzed period */
  transactionCount?: number;
  /** Transaction velocity (transactions per hour) */
  transactionVelocity?: number;
  /** Content posting frequency (posts per hour) */
  postingFrequency?: number;
  /** Failed login attempts */
  failedLoginAttempts?: number;
  /** Account creation date (ISO string) */
  accountCreatedAt?: string;
  /** Days since account creation */
  accountAge?: number;
  /** Activity time distribution (by hour of day) */
  activityTimeDistribution?: Record<string, number>;
  /** Device switching frequency (unique devices used) */
  deviceSwitchCount?: number;
  /** Unusual activity patterns detected */
  anomalies?: string[];
  /** Behavior similarity to known fraud patterns */
  fraudPatternSimilarity?: number;
}

// ==================== Tables ====================

/**
 * Moderation Logs Table
 * 
 * Records all content moderation decisions and analysis.
 * Combines multiple AI models for comprehensive toxicity detection.
 * 
 * Fields:
 * - id: UUID primary key
 * - contentId: Unique identifier for the content
 * - contentType: Type of content (chat, recipe, comment, etc.)
 * - userId: User who created the content
 * - content: The actual content text
 * - toxicityScores: Detailed toxicity scores
 * - actionTaken: Moderation action taken
 * - modelUsed: Which AI model was used
 * - confidence: Confidence in the decision
 * - categories: Violated categories
 * - severity: Severity level
 * - manualReview: Whether manually reviewed
 * - reviewedBy: Reviewer user ID
 * - reviewNotes: Review notes
 * - overrideReason: Reason for override
 * - reviewedAt: Review timestamp
 * - createdAt: Creation timestamp
 * - updatedAt: Last update timestamp
 * 
 * Indexes:
 * - userId: For user-specific queries
 * - contentId: For content lookup
 * - actionTaken: For action filtering
 * - severity: For severity filtering
 * - createdAt: For temporal queries
 */
export const moderationLogs = pgTable("moderation_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contentId: varchar("content_id").notNull(),
  contentType: varchar("content_type", { length: 50 }).notNull(), // 'chat', 'recipe', 'comment', 'feedback'
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  
  // Toxicity analysis (using ModerationResult interface)
  toxicityScores: jsonb("toxicity_scores").$type<ModerationResult>().notNull(),
  
  // Moderation decision
  actionTaken: varchar("action_taken", { length: 20 }).notNull(), // 'approved', 'blocked', 'flagged', 'warning'
  modelUsed: varchar("model_used", { length: 50 }).notNull(), // 'tensorflow', 'openai', 'both'
  confidence: real("confidence").notNull().default(0),
  categories: text("categories").array(),
  severity: varchar("severity", { length: 20 }).notNull(), // 'low', 'medium', 'high', 'critical'
  
  // Manual review
  manualReview: boolean("manual_review").notNull().default(false),
  reviewedBy: varchar("reviewed_by").references(() => users.id, { onDelete: "set null" }),
  reviewNotes: text("review_notes"),
  overrideReason: text("override_reason"),
  reviewedAt: timestamp("reviewed_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("moderation_logs_user_id_idx").on(table.userId),
  index("moderation_logs_content_id_idx").on(table.contentId),
  index("moderation_logs_action_idx").on(table.actionTaken),
  index("moderation_logs_severity_idx").on(table.severity),
  index("moderation_logs_created_at_idx").on(table.createdAt),
]);

/**
 * Blocked Content Table
 * 
 * Stores content that has been blocked by moderation.
 * Maintains history for appeal processes and pattern analysis.
 */
export const blockedContent = pgTable("blocked_content", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  content: text("content").notNull(),
  originalContentId: varchar("original_content_id"),
  contentType: varchar("content_type", { length: 50 }).notNull(),
  reason: text("reason").notNull(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Blocking details
  blockedCategories: text("blocked_categories").array(),
  toxicityLevel: real("toxicity_level"),
  
  // Additional context about the block (using ModerationMetadata interface)
  metadata: jsonb("metadata").$type<ModerationMetadata>(),
  
  autoBlocked: boolean("auto_blocked").notNull().default(true),
  
  // Resolution
  status: varchar("status", { length: 20 }).notNull().default('blocked'), // 'blocked', 'appealed', 'restored', 'deleted'
  appealId: varchar("appeal_id"),
  restoredAt: timestamp("restored_at"),
  restoredBy: varchar("restored_by").references(() => users.id, { onDelete: "set null" }),
  
  timestamp: timestamp("timestamp").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("blocked_content_user_id_idx").on(table.userId),
  index("blocked_content_status_idx").on(table.status),
  index("blocked_content_timestamp_idx").on(table.timestamp),
]);

/**
 * Moderation Appeals Table
 * 
 * Handles appeals against moderation decisions.
 * Tracks appeal process and outcomes.
 */
export const moderationAppeals = pgTable("moderation_appeals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contentId: varchar("content_id").notNull(),
  blockedContentId: varchar("blocked_content_id").references(() => blockedContent.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  appealReason: text("appeal_reason").notNull(),
  status: varchar("status", { length: 20 }).notNull().default('pending'), // 'pending', 'reviewing', 'approved', 'rejected', 'withdrawn'
  
  // Appeal details
  appealType: varchar("appeal_type", { length: 50 }), // 'false_positive', 'context_needed', 'technical_error', 'other'
  supportingEvidence: text("supporting_evidence"),
  originalAction: varchar("original_action", { length: 20 }),
  originalSeverity: varchar("original_severity", { length: 20 }),
  
  // Review process
  assignedTo: varchar("assigned_to").references(() => users.id, { onDelete: "set null" }),
  reviewStartedAt: timestamp("review_started_at"),
  decision: varchar("decision", { length: 20 }), // 'approved', 'rejected', 'partially_approved'
  decisionReason: text("decision_reason"),
  decidedBy: varchar("decided_by").references(() => users.id, { onDelete: "set null" }),
  decidedAt: timestamp("decided_at"),
  
  // Outcome
  actionTaken: text("action_taken"),
  userNotified: boolean("user_notified").notNull().default(false),
  notifiedAt: timestamp("notified_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("moderation_appeals_user_id_idx").on(table.userId),
  index("moderation_appeals_status_idx").on(table.status),
  index("moderation_appeals_created_at_idx").on(table.createdAt),
]);

/**
 * Fraud Scores Table
 * 
 * Stores fraud risk scores and detailed analysis factors.
 * Used for real-time fraud prevention and user risk assessment.
 */
export const fraudScores = pgTable("fraud_scores", {
  id: varchar("id", { length: 50 })
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 50 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  
  // Risk score (0.0 = safe, 1.0 = definite fraud)
  score: real("score").notNull(),
  
  // Detailed scoring factors (using FraudRiskFactor interface)
  factors: jsonb("factors").notNull().$type<FraudRiskFactor>(),
  
  modelVersion: varchar("model_version", { length: 20 }).notNull().default("v1.0"),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  index("fraud_scores_user_id_idx").on(table.userId),
  index("fraud_scores_timestamp_idx").on(table.timestamp),
  index("fraud_scores_score_idx").on(table.score)
]);

/**
 * Suspicious Activities Table
 * 
 * Logs detected suspicious activities and patterns.
 * Triggers alerts and automated responses.
 */
export const suspiciousActivities = pgTable("suspicious_activities", {
  id: varchar("id", { length: 50 })
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 50 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  
  // Type of suspicious activity
  activityType: varchar("activity_type", { length: 50 }).notNull(), 
  // Types: 'rapid_transactions', 'unusual_pattern', 'fake_profile', 'bot_behavior', 'account_takeover'
  
  // Detailed information about the activity (using FraudEvidenceDetail interface)
  details: jsonb("details").notNull().$type<FraudEvidenceDetail>(),
  
  riskLevel: varchar("risk_level", { length: 20 }).notNull().$type<"low" | "medium" | "high" | "critical">(),
  status: varchar("status", { length: 20 })
    .notNull()
    .default("pending")
    .$type<"pending" | "reviewing" | "confirmed" | "dismissed" | "escalated">(),
  
  detectedAt: timestamp("detected_at", { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  autoBlocked: boolean("auto_blocked").notNull().default(false)
}, (table) => [
  index("suspicious_activities_user_id_idx").on(table.userId),
  index("suspicious_activities_type_idx").on(table.activityType),
  index("suspicious_activities_risk_idx").on(table.riskLevel),
  index("suspicious_activities_status_idx").on(table.status),
  index("suspicious_activities_detected_idx").on(table.detectedAt)
]);

/**
 * Fraud Reviews Table
 * 
 * Manual review decisions for suspected fraud cases.
 * Documents actions taken and restrictions applied.
 */
export const fraudReviews = pgTable("fraud_reviews", {
  id: varchar("id", { length: 50 })
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 50 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  reviewerId: varchar("reviewer_id", { length: 50 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  
  // Link to specific suspicious activity
  activityId: varchar("activity_id", { length: 50 })
    .references(() => suspiciousActivities.id, { onDelete: "cascade" }),
  
  // Review decision
  decision: varchar("decision", { length: 20 })
    .notNull()
    .$type<"cleared" | "flagged" | "banned" | "restricted" | "monitor">(),
  
  notes: text("notes"),
  
  // Restrictions applied (if any)
  restrictions: jsonb("restrictions").$type<{
    canPost?: boolean;
    canMessage?: boolean;
    canTransaction?: boolean;
    dailyLimit?: number;
    requiresVerification?: boolean;
  }>(),
  
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true })
}, (table) => [
  index("fraud_reviews_user_id_idx").on(table.userId),
  index("fraud_reviews_reviewer_id_idx").on(table.reviewerId),
  index("fraud_reviews_reviewed_at_idx").on(table.reviewedAt)
]);

/**
 * Fraud Detection Results Table
 * 
 * Comprehensive fraud analysis results with evidence.
 * Includes device fingerprinting and behavioral analysis.
 */
export const fraudDetectionResults = pgTable("fraud_detection_results", {
  id: varchar("id", { length: 50 })
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 50 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  
  // Analysis metadata
  analysisType: varchar("analysis_type", { length: 50 })
    .notNull()
    .$type<"account_creation" | "transaction" | "content_posting" | "account_takeover" | "behavioral">(),
  
  // Overall risk assessment
  overallRiskScore: real("overall_risk_score").notNull(), // 0.0 = safe, 1.0 = definite fraud
  riskLevel: varchar("risk_level", { length: 20 })
    .notNull()
    .$type<"low" | "medium" | "high" | "critical">(),
  
  // Detailed risk factors array (using FraudRiskFactor[] interface)
  riskFactors: jsonb("risk_factors").$type<FraudRiskFactor[]>(),
  
  // Evidence supporting the detection (using FraudEvidenceDetail[] interface)
  evidenceDetails: jsonb("evidence_details").$type<FraudEvidenceDetail[]>(),
  
  // Device and network information (using FraudDeviceInfo interface)
  deviceInfo: jsonb("device_info").$type<FraudDeviceInfo>(),
  
  // Behavioral analysis data (using FraudBehaviorData interface)
  behaviorData: jsonb("behavior_data").$type<FraudBehaviorData>(),
  
  // Action taken based on detection
  actionTaken: varchar("action_taken", { length: 50 }),
  actionReason: text("action_reason"),
  
  // Model performance
  modelVersion: varchar("model_version", { length: 20 }).notNull().default("v1.0"),
  processingTime: integer("processing_time"), // milliseconds
  confidence: real("confidence").notNull(), // 0.0 to 1.0
  
  analyzedAt: timestamp("analyzed_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  index("fraud_detection_results_user_id_idx").on(table.userId),
  index("fraud_detection_results_type_idx").on(table.analysisType),
  index("fraud_detection_results_risk_idx").on(table.riskLevel),
  index("fraud_detection_results_analyzed_idx").on(table.analyzedAt)
]);

/**
 * Privacy Settings Table
 * 
 * User privacy preferences and consent settings.
 * Controls data processing and retention policies.
 */
export const privacySettings = pgTable("privacy_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  autoBlurFaces: boolean("auto_blur_faces").notNull().default(false),
  faceRecognitionEnabled: boolean("face_recognition_enabled").notNull().default(true),
  blurIntensity: integer("blur_intensity").notNull().default(5),
  excludedFaces: jsonb("excluded_faces").$type<string[]>().default([]),
  privacyMode: text("privacy_mode", {
    enum: ["strict", "balanced", "minimal"]
  }).notNull().default("balanced"),
  consentToProcessing: boolean("consent_to_processing").notNull().default(false),
  dataRetentionDays: integer("data_retention_days").notNull().default(30),
  notifyOnFaceDetection: boolean("notify_on_face_detection").notNull().default(false),
  allowGroupPhotoTagging: boolean("allow_group_photo_tagging").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("privacy_settings_user_id_idx").on(table.userId),
]);

// ==================== Zod Schemas & Type Exports ====================

export const actionTakenSchema = z.enum(['approved', 'blocked', 'flagged', 'warning']);
export const modelUsedSchema = z.enum(['tensorflow', 'openai', 'both']);
export const securitySeveritySchema = z.enum(['low', 'medium', 'high', 'critical']);
export const blockedStatusSchema = z.enum(['blocked', 'appealed', 'restored', 'deleted']);
export const appealStatusSchema = z.enum(['pending', 'reviewing', 'approved', 'rejected', 'withdrawn']);
export const appealTypeSchema = z.enum(['false_positive', 'context_needed', 'technical_error', 'other']);
export const decisionSchema = z.enum(['approved', 'rejected', 'partially_approved']);
export const fraudRiskLevelSchema = z.enum(['low', 'medium', 'high', 'critical']);
export const activityStatusSchema = z.enum(['pending', 'reviewing', 'confirmed', 'dismissed', 'escalated']);
export const fraudDecisionSchema = z.enum(['cleared', 'flagged', 'banned', 'restricted', 'monitor']);
export const analysisTypeSchema = z.enum(['account_creation', 'transaction', 'content_posting', 'account_takeover', 'behavioral']);
export const privacyModeSchema = z.enum(['strict', 'balanced', 'minimal']);

// Moderation Logs
export const insertModerationLogSchema = createInsertSchema(moderationLogs)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    actionTaken: actionTakenSchema,
    modelUsed: modelUsedSchema,
    severity: securitySeveritySchema,
    confidence: z.number().min(0).max(1).default(0),
  });

export type InsertModerationLog = z.infer<typeof insertModerationLogSchema>;
export type ModerationLog = typeof moderationLogs.$inferSelect;

// Blocked Content
export const insertBlockedContentSchema = createInsertSchema(blockedContent)
  .omit({
    id: true,
    timestamp: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    status: blockedStatusSchema.default('blocked'),
    autoBlocked: z.boolean().default(true),
  });

export type InsertBlockedContent = z.infer<typeof insertBlockedContentSchema>;
export type BlockedContent = typeof blockedContent.$inferSelect;

// Moderation Appeals
export const insertModerationAppealSchema = createInsertSchema(moderationAppeals)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    status: appealStatusSchema.default('pending'),
    appealType: appealTypeSchema.optional(),
    decision: decisionSchema.optional(),
    userNotified: z.boolean().default(false),
  });

export type InsertModerationAppeal = z.infer<typeof insertModerationAppealSchema>;
export type ModerationAppeal = typeof moderationAppeals.$inferSelect;

// Fraud Scores
export const insertFraudScoreSchema = createInsertSchema(fraudScores)
  .omit({
    id: true,
    timestamp: true,
  })
  .extend({
    score: z.number().min(0).max(1),
    modelVersion: z.string().default("v1.0"),
  });

export type InsertFraudScore = z.infer<typeof insertFraudScoreSchema>;
export type FraudScore = typeof fraudScores.$inferSelect;

// Suspicious Activities
export const insertSuspiciousActivitySchema = createInsertSchema(suspiciousActivities)
  .omit({
    id: true,
    detectedAt: true,
  })
  .extend({
    riskLevel: fraudRiskLevelSchema,
    status: activityStatusSchema.default("pending"),
    autoBlocked: z.boolean().default(false),
  });

export type InsertSuspiciousActivity = z.infer<typeof insertSuspiciousActivitySchema>;
export type SuspiciousActivity = typeof suspiciousActivities.$inferSelect;

// Fraud Reviews
export const insertFraudReviewSchema = createInsertSchema(fraudReviews)
  .omit({
    id: true,
    reviewedAt: true,
  })
  .extend({
    decision: fraudDecisionSchema,
  });

export type InsertFraudReview = z.infer<typeof insertFraudReviewSchema>;
export type FraudReview = typeof fraudReviews.$inferSelect;

// Fraud Detection Results
export const insertFraudDetectionResultSchema = createInsertSchema(fraudDetectionResults)
  .omit({
    id: true,
    analyzedAt: true,
  })
  .extend({
    analysisType: analysisTypeSchema,
    overallRiskScore: z.number().min(0).max(1),
    riskLevel: fraudRiskLevelSchema,
    confidence: z.number().min(0).max(1),
    modelVersion: z.string().default("v1.0"),
  });

export type InsertFraudDetectionResult = z.infer<typeof insertFraudDetectionResultSchema>;
export type FraudDetectionResult = typeof fraudDetectionResults.$inferSelect;

// Privacy Settings
export const insertPrivacySettingsSchema = createInsertSchema(privacySettings)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    privacyMode: privacyModeSchema.default("balanced"),
    blurIntensity: z.number().min(0).max(10).default(5),
    dataRetentionDays: z.number().min(1).max(365).default(30),
  });

export type InsertPrivacySettings = z.infer<typeof insertPrivacySettingsSchema>;
export type PrivacySettings = typeof privacySettings.$inferSelect;