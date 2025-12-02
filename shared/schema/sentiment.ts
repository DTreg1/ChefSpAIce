/**
 * Sentiment Analysis Schema
 *
 * Tables for sentiment analysis, emotion detection, and trend tracking.
 * Includes metrics aggregation, alerting, and segment analysis.
 */

import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  integer,
  timestamp,
  boolean,
  index,
  jsonb,
  real,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./auth";

// ==================== TypeScript Interfaces ====================

/**
 * Main sentiment analysis data structure
 */
export interface SentimentData {
  /** Overall sentiment score from -1 (very negative) to 1 (very positive) */
  overallScore: number;
  /** Sentiment polarity classification */
  polarity: "positive" | "negative" | "neutral";
  /** Subjectivity score from 0 (objective) to 1 (subjective) */
  subjectivity: number;
  /** Document-level sentiment metrics */
  documentScore?: number;
  /** Aspect-based sentiment scores */
  aspectScores?: Record<string, number>;
}

/**
 * Emotion detection scores
 */
export interface EmotionScores {
  joy?: number;
  sadness?: number;
  anger?: number;
  fear?: number;
  surprise?: number;
  disgust?: number;
  [emotion: string]: number | undefined;
}

/**
 * Key phrase extraction result
 * Represents important phrases identified in analyzed content
 */
export interface KeyPhrase {
  /** The extracted phrase text */
  phrase: string;
  /** Relevance score (0-1, higher = more relevant) */
  relevance: number;
  /** Position in the original text (character offset) */
  position?: number;
  /** Sentiment associated with this phrase */
  sentiment?: "positive" | "negative" | "neutral";
}

/**
 * Contextual factors affecting sentiment analysis
 * Environmental and situational context that influences sentiment interpretation
 */
export interface ContextFactor {
  /** Type of context (e.g., 'temporal', 'cultural', 'situational', 'demographic') */
  type: string;
  /** Description of the context factor */
  description: string;
  /** Impact weight on overall sentiment (0-1) */
  weight: number;
  /** Whether this factor increases or decreases sentiment intensity */
  effect?: "amplify" | "dampen" | "neutral";
}

// ==================== Tables ====================

/**
 * Sentiment Metrics Table
 *
 * Stores aggregated sentiment metrics by period.
 * Used for trend analysis and dashboard displays.
 *
 * Fields:
 * - id: UUID primary key
 * - period: Time period identifier (e.g., "2024-01-15", "2024-W03")
 * - avgSentiment: Average sentiment score for the period
 * - totalItems: Number of items analyzed
 * - alertTriggered: Whether an alert was triggered
 * - periodType: Type of period (day, week, month)
 * - percentageChange: Change from previous period
 * - categories: Breakdown by category with issues
 * - painPoints: Identified pain points with impact scores
 * - metadata: Additional metadata
 * - createdAt: Creation timestamp
 *
 * Indexes:
 * - period: For period-based queries
 * - alertTriggered: For alert filtering
 * - period + periodType: Unique constraint
 */
export const sentimentMetrics = pgTable(
  "sentiment_metrics",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    period: text("period").notNull(),
    avgSentiment: real("avg_sentiment").notNull(),
    totalItems: integer("total_items").notNull(),
    alertTriggered: boolean("alert_triggered").notNull().default(false),
    periodType: text("period_type").notNull().$type<"day" | "week" | "month">(),
    percentageChange: real("percentage_change"),
    categories: jsonb("categories").$type<
      Record<
        string,
        {
          sentiment: number;
          count: number;
          issues: string[];
        }
      >
    >(),
    painPoints: jsonb("pain_points").$type<
      Array<{
        category: string;
        issue: string;
        impact: number;
        frequency: number;
      }>
    >(),
    metadata: jsonb("metadata").$type<Record<string, any>>(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("sentiment_metrics_period_idx").on(table.period),
    index("sentiment_metrics_alert_idx").on(table.alertTriggered),
    uniqueIndex("sentiment_metrics_unique_idx").on(
      table.period,
      table.periodType,
    ),
  ],
);

/**
 * Sentiment Alerts Table
 *
 * Configuration and history of sentiment-based alerts.
 * Tracks thresholds and triggered alerts.
 *
 * Fields:
 * - id: UUID primary key
 * - alertType: Type of alert (drop, spike, sustained_negative, etc.)
 * - threshold: Threshold value that triggers the alert
 * - currentValue: Current value when alert triggered
 * - triggeredAt: When the alert was triggered
 * - status: Current status (active, acknowledged, resolved)
 * - severity: Alert severity level
 * - affectedCategory: Category affected (if applicable)
 * - message: Alert message
 * - notificationSent: Whether notification was sent
 * - acknowledgedBy: User who acknowledged
 * - acknowledgedAt: When acknowledged
 * - resolvedAt: When resolved
 * - metadata: Additional alert details
 *
 * Indexes:
 * - status: For status filtering
 * - alertType: For type-based queries
 * - triggeredAt: For temporal queries
 */
export const sentimentAlerts = pgTable(
  "sentiment_alerts",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    alertType: text("alert_type")
      .notNull()
      .$type<
        | "sentiment_drop"
        | "sustained_negative"
        | "volume_spike"
        | "category_issue"
      >(),
    threshold: real("threshold").notNull(),
    currentValue: real("current_value").notNull(),
    triggeredAt: timestamp("triggered_at").notNull().defaultNow(),
    status: text("status")
      .notNull()
      .default("active")
      .$type<"active" | "acknowledged" | "resolved">(),
    severity: text("severity")
      .notNull()
      .$type<"low" | "medium" | "high" | "critical">(),
    affectedCategory: text("affected_category"),
    message: text("message").notNull(),
    notificationSent: boolean("notification_sent").notNull().default(false),
    acknowledgedBy: varchar("acknowledged_by"),
    acknowledgedAt: timestamp("acknowledged_at"),
    resolvedAt: timestamp("resolved_at"),
    metadata: jsonb("metadata").$type<{
      previousValue?: number;
      percentageChange?: number;
      affectedUsers?: number;
      relatedIssues?: string[];
      suggestedActions?: string[];
    }>(),
  },
  (table) => [
    index("sentiment_alerts_status_idx").on(table.status),
    index("sentiment_alerts_type_idx").on(table.alertType),
    index("sentiment_alerts_triggered_idx").on(table.triggeredAt),
  ],
);

/**
 * Sentiment Segments Table
 *
 * Tracks sentiment by different user segments or categories.
 * Enables targeted analysis of specific groups.
 *
 * Fields:
 * - id: UUID primary key
 * - segmentName: Name of the segment
 * - period: Time period
 * - sentimentScore: Average sentiment for the segment
 * - periodType: Type of period (day, week, month)
 * - sampleSize: Number of items in segment
 * - positiveCount: Count of positive items
 * - negativeCount: Count of negative items
 * - neutralCount: Count of neutral items
 * - topIssues: Top issues in this segment
 * - topPraises: Top positive feedback
 * - trendDirection: Direction of trend
 * - comparisonToPrevious: Comparison to previous period
 * - metadata: Additional metadata
 * - createdAt: Creation timestamp
 *
 * Indexes:
 * - segmentName: For segment filtering
 * - period: For time-based queries
 * - segmentName + period + periodType: Unique constraint
 */
export const sentimentSegments = pgTable(
  "sentiment_segments",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    segmentName: text("segment_name").notNull(),
    period: text("period").notNull(),
    sentimentScore: real("sentiment_score").notNull(),
    periodType: text("period_type").notNull().$type<"day" | "week" | "month">(),
    sampleSize: integer("sample_size").notNull(),
    positiveCount: integer("positive_count").notNull(),
    negativeCount: integer("negative_count").notNull(),
    neutralCount: integer("neutral_count").notNull(),
    topIssues: jsonb("top_issues").$type<
      Array<{
        issue: string;
        count: number;
        sentiment: number;
      }>
    >(),
    topPraises: jsonb("top_praises").$type<
      Array<{
        praise: string;
        count: number;
        sentiment: number;
      }>
    >(),
    trendDirection: text("trend_direction").$type<"up" | "down" | "stable">(),
    comparisonToPrevious: real("comparison_to_previous"),
    metadata: jsonb("metadata").$type<Record<string, any>>(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("sentiment_segments_name_idx").on(table.segmentName),
    index("sentiment_segments_period_idx").on(table.period),
    uniqueIndex("sentiment_segments_unique_idx").on(
      table.segmentName,
      table.period,
      table.periodType,
    ),
  ],
);

/**
 * Sentiment Results Table
 *
 * Individual sentiment analysis results for content.
 * Stores detailed analysis including emotions and key phrases.
 *
 * Fields:
 * - id: UUID primary key
 * - contentId: Unique identifier for the content
 * - userId: User who created the content
 * - contentType: Type of content (review, comment, feedback, etc.)
 * - content: The analyzed content
 * - sentiment: Overall sentiment classification
 * - confidence: Confidence score (0-1)
 * - sentimentData: Comprehensive sentiment analysis
 * - emotionScores: Detected emotions
 * - keyPhrases: Extracted key phrases
 * - contextFactors: Contextual factors
 * - topics: Identified topics
 * - keywords: Extracted keywords
 * - aspectSentiments: Aspect-based sentiment
 * - processingTime: Time to process (ms)
 * - language: Detected language
 * - metadata: Additional metadata
 * - createdAt: Analysis timestamp
 *
 * Indexes:
 * - contentId: For content lookup
 * - userId: For user-specific queries
 * - sentiment: For sentiment filtering
 * - createdAt: For temporal queries
 */
export const sentimentResults = pgTable(
  "sentiment_results",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    contentId: varchar("content_id").notNull(),
    userId: varchar("user_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    contentType: text("content_type"), // 'review', 'comment', 'feedback', 'chat', etc.
    content: text("content").notNull(),

    // Core sentiment
    sentiment: text("sentiment")
      .notNull()
      .$type<"positive" | "negative" | "neutral" | "mixed">(),
    confidence: real("confidence").notNull(),

    // Comprehensive sentiment analysis (using SentimentData interface)
    sentimentData: jsonb("sentiment_data").$type<SentimentData>(),

    // Emotion detection (using EmotionScores interface)
    emotionScores: jsonb("emotion_scores").$type<EmotionScores>(),

    // Key phrase extraction (using KeyPhrase[] interface)
    keyPhrases: jsonb("key_phrases").$type<KeyPhrase[]>(),

    // Contextual factors (using ContextFactor[] interface)
    contextFactors: jsonb("context_factors").$type<ContextFactor[]>(),

    // Content analysis
    topics: text("topics").array(),
    keywords: text("keywords").array(),

    // Aspect-based sentiment (e.g., for product reviews)
    aspectSentiments:
      jsonb("aspect_sentiments").$type<Record<string, string>>(),

    // Metadata
    processingTime: integer("processing_time"), // milliseconds
    language: text("language"),
    metadata: jsonb("metadata").$type<Record<string, any>>(),

    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("sentiment_results_content_id_idx").on(table.contentId),
    index("sentiment_results_user_id_idx").on(table.userId),
    index("sentiment_results_sentiment_idx").on(table.sentiment),
    index("sentiment_results_created_at_idx").on(table.createdAt),
  ],
);

/**
 * Sentiment Trends Table
 *
 * Aggregated sentiment trends over time.
 * Supports both user-specific and global trends.
 *
 * Fields:
 * - id: UUID primary key
 * - userId: User ID (null for global trends)
 * - timePeriod: Time period identifier
 * - periodType: Type of period (hour, day, week, etc.)
 * - avgSentiment: Average sentiment (-1 to 1)
 * - totalAnalyzed: Number of items analyzed
 * - sentimentCounts: Breakdown by sentiment type
 * - dominantEmotions: Most common emotions
 * - topTopics: Most discussed topics
 * - changeFromPrevious: Change from previous period
 * - volatility: Sentiment volatility score
 * - predictedNext: Predicted sentiment for next period
 * - anomalyDetected: Whether anomaly was detected
 * - createdAt: Creation timestamp
 *
 * Indexes:
 * - userId: For user-specific queries
 * - timePeriod + periodType: For time-based queries
 * - createdAt: For temporal queries
 */
export const sentimentTrends = pgTable(
  "sentiment_trends",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id").references(() => users.id, {
      onDelete: "cascade",
    }), // NULL for global

    timePeriod: text("time_period").notNull(), // "2024-01", "2024-W01", etc.
    periodType: text("period_type")
      .notNull()
      .$type<"hour" | "day" | "week" | "month" | "quarter" | "year">(),

    // Aggregated metrics
    avgSentiment: real("avg_sentiment").notNull(), // -1 (negative) to 1 (positive)
    totalAnalyzed: integer("total_analyzed").notNull(),

    sentimentCounts: jsonb("sentiment_counts").notNull().$type<{
      positive: number;
      negative: number;
      neutral: number;
      mixed: number;
    }>(),

    // Top insights
    dominantEmotions: jsonb("dominant_emotions").$type<
      Array<{
        emotion: string;
        count: number;
        avgIntensity: number;
      }>
    >(),

    topTopics: text("top_topics").array(),

    // Trend analysis
    changeFromPrevious: real("change_from_previous"),
    volatility: real("volatility"), // Measure of sentiment fluctuation
    predictedNext: real("predicted_next"), // ML prediction for next period
    anomalyDetected: boolean("anomaly_detected").default(false),

    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("sentiment_trends_user_id_idx").on(table.userId),
    index("sentiment_trends_period_idx").on(table.timePeriod, table.periodType),
    index("sentiment_trends_created_at_idx").on(table.createdAt),
  ],
);

// ==================== Zod Schemas & Type Exports ====================

export const periodTypeSchema = z.enum(["day", "week", "month"]);
export const alertTypeSchema = z.enum([
  "sentiment_drop",
  "sustained_negative",
  "volume_spike",
  "category_issue",
]);
export const sentimentSeveritySchema = z.enum([
  "low",
  "medium",
  "high",
  "critical",
]);
export const sentimentAlertStatusSchema = z.enum([
  "active",
  "acknowledged",
  "resolved",
]);
export const sentimentSchema = z.enum([
  "positive",
  "negative",
  "neutral",
  "mixed",
]);
export const trendDirectionSchema = z.enum(["up", "down", "stable"]);
export const periodTypeExtendedSchema = z.enum([
  "hour",
  "day",
  "week",
  "month",
  "quarter",
  "year",
]);

// Sentiment Metrics
export const insertSentimentMetricsSchema = createInsertSchema(
  sentimentMetrics,
).extend({
  periodType: periodTypeSchema,
});

export type InsertSentimentMetrics = z.infer<
  typeof insertSentimentMetricsSchema
>;
export type SentimentMetrics = typeof sentimentMetrics.$inferSelect;

// Sentiment Alerts
export const insertSentimentAlertsSchema = createInsertSchema(
  sentimentAlerts,
).extend({
  alertType: alertTypeSchema,
  status: sentimentAlertStatusSchema.default("active"),
  severity: sentimentSeveritySchema,
});

export type InsertSentimentAlerts = z.infer<typeof insertSentimentAlertsSchema>;
export type SentimentAlerts = typeof sentimentAlerts.$inferSelect;

// Sentiment Segments
export const insertSentimentSegmentsSchema = createInsertSchema(
  sentimentSegments,
).extend({
  periodType: periodTypeSchema,
  trendDirection: trendDirectionSchema.optional(),
});

export type InsertSentimentSegments = z.infer<
  typeof insertSentimentSegmentsSchema
>;
export type SentimentSegments = typeof sentimentSegments.$inferSelect;

// Sentiment Results
export const insertSentimentResultsSchema = createInsertSchema(
  sentimentResults,
).extend({
  sentiment: sentimentSchema,
  confidence: z.number().min(0).max(1),
});

export type InsertSentimentResults = z.infer<
  typeof insertSentimentResultsSchema
>;
export type SentimentResults = typeof sentimentResults.$inferSelect;

// Sentiment Trends
export const insertSentimentTrendsSchema = createInsertSchema(
  sentimentTrends,
).extend({
  periodType: periodTypeExtendedSchema,
  avgSentiment: z.number().min(-1).max(1),
});

export type InsertSentimentTrends = z.infer<typeof insertSentimentTrendsSchema>;
export type SentimentTrends = typeof sentimentTrends.$inferSelect;

// Backward compatibility alias
export const sentimentAnalysis = sentimentResults;
