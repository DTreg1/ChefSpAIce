/**
 * Analytics & Insights Schema
 * 
 * Tables for tracking user behavior, generating insights, and predictive analytics.
 */

import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, index, jsonb, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./auth";

// ==================== TypeScript Interfaces ====================

/**
 * Analytics event metadata structure
 */
export interface EventMetadata {
  sessionId?: string;
  deviceType?: string;
  browser?: string;
  os?: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  [key: string]: any;
}

/**
 * Prediction metadata structure
 */
export interface PredictionMetadata {
  confidence: number;
  factors: Record<string, number>;
  modelVersion: string;
  features: Record<string, any>;
}

// ==================== Tables ====================

/**
 * Analytics Events Table
 * 
 * Tracks all user interactions and system events for analytics.
 */
export const analyticsEvents = pgTable("analytics_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  eventName: text("event_name").notNull(),
  eventCategory: text("event_category").notNull(), // 'ui', 'api', 'system', 'error'
  eventAction: text("event_action"),
  eventLabel: text("event_label"),
  eventValue: real("event_value"),
  metadata: jsonb("metadata").$type<EventMetadata>(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("analytics_events_user_id_idx").on(table.userId),
  index("analytics_events_event_name_idx").on(table.eventName),
  index("analytics_events_event_category_idx").on(table.eventCategory),
  index("analytics_events_created_at_idx").on(table.createdAt),
]);

/**
 * User Sessions Table
 * 
 * Tracks user session analytics and engagement metrics.
 */
export const userSessions = pgTable("user_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  sessionToken: text("session_token").notNull(),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  endedAt: timestamp("ended_at"),
  durationSeconds: integer("duration_seconds"),
  pageViews: integer("page_views").notNull().default(0),
  interactions: integer("interactions").notNull().default(0),
  deviceInfo: jsonb("device_info").$type<Record<string, any>>(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  exitPage: text("exit_page"),
  bounced: boolean("bounced").notNull().default(false),
}, (table) => [
  index("user_sessions_user_id_idx").on(table.userId),
  index("user_sessions_session_token_idx").on(table.sessionToken),
  index("user_sessions_started_at_idx").on(table.startedAt),
]);

/**
 * Web Vitals Table
 * 
 * Core Web Vitals performance metrics for monitoring UX.
 */
export const webVitals = pgTable("web_vitals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  metric: text("metric").notNull(), // 'LCP', 'FID', 'CLS', 'FCP', 'TTFB'
  value: real("value").notNull(),
  rating: text("rating"), // 'good', 'needs-improvement', 'poor'
  page: text("page").notNull(),
  sessionId: text("session_id"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
}, (table) => [
  index("web_vitals_user_id_idx").on(table.userId),
  index("web_vitals_metric_idx").on(table.metric),
  index("web_vitals_timestamp_idx").on(table.timestamp),
]);

/**
 * Search Logs Table
 * 
 * Tracks search queries for improving search relevance.
 */
export const searchLogs = pgTable("search_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  searchQuery: text("search_query").notNull(),
  searchType: text("search_type").notNull(), // 'recipe', 'ingredient', 'term'
  resultsCount: integer("results_count").notNull(),
  clickedResultId: varchar("clicked_result_id"),
  clickedResultRank: integer("clicked_result_rank"),
  searchDuration: integer("search_duration"), // milliseconds
  timestamp: timestamp("timestamp").notNull().defaultNow(),
}, (table) => [
  index("search_logs_user_id_idx").on(table.userId),
  index("search_logs_search_type_idx").on(table.searchType),
  index("search_logs_timestamp_idx").on(table.timestamp),
]);

/**
 * Query Logs Table
 * 
 * Tracks database query performance and optimization opportunities.
 */
export const queryLogs = pgTable("query_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  queryType: text("query_type").notNull(), // 'select', 'insert', 'update', 'delete'
  tableName: text("table_name").notNull(),
  executionTime: integer("execution_time").notNull(), // milliseconds
  rowsAffected: integer("rows_affected"),
  queryHash: text("query_hash"), // For identifying duplicate queries
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  endpoint: text("endpoint"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
}, (table) => [
  index("query_logs_table_name_idx").on(table.tableName),
  index("query_logs_execution_time_idx").on(table.executionTime),
  index("query_logs_timestamp_idx").on(table.timestamp),
]);

/**
 * Analytics Insights Table
 * 
 * AI-generated insights from analytics data.
 */
export const analyticsInsights = pgTable("analytics_insights", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  insightType: text("insight_type").notNull(), // 'trend', 'anomaly', 'recommendation'
  category: text("category").notNull(), // 'usage', 'performance', 'engagement'
  title: text("title").notNull(),
  description: text("description").notNull(),
  severity: text("severity"), // 'info', 'warning', 'critical'
  metrics: jsonb("metrics").$type<Record<string, any>>(),
  recommendations: jsonb("recommendations").$type<string[]>(),
  isRead: boolean("is_read").notNull().default(false),
  isActionable: boolean("is_actionable").notNull().default(true),
  validUntil: timestamp("valid_until"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("analytics_insights_insight_type_idx").on(table.insightType),
  index("analytics_insights_category_idx").on(table.category),
  index("analytics_insights_created_at_idx").on(table.createdAt),
]);

/**
 * Insight Feedback Table
 * 
 * User feedback on analytics insights usefulness.
 */
export const insightFeedback = pgTable("insight_feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  insightId: varchar("insight_id").notNull().references(() => analyticsInsights.id, { onDelete: "cascade" }),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  isUseful: boolean("is_useful").notNull(),
  actionTaken: text("action_taken"),
  feedback: text("feedback"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("insight_feedback_insight_id_idx").on(table.insightId),
  index("insight_feedback_user_id_idx").on(table.userId),
]);

/**
 * User Predictions Table
 * 
 * ML predictions for user behavior and preferences.
 */
export const userPredictions = pgTable("user_predictions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  predictionType: text("prediction_type").notNull(), // 'churn', 'next_action', 'preference'
  prediction: jsonb("prediction").$type<any>(),
  confidence: real("confidence").notNull(), // 0-1
  metadata: jsonb("metadata").$type<PredictionMetadata>(),
  validUntil: timestamp("valid_until").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("user_predictions_user_id_idx").on(table.userId),
  index("user_predictions_prediction_type_idx").on(table.predictionType),
  index("user_predictions_valid_until_idx").on(table.validUntil),
]);

/**
 * Prediction Accuracy Table
 * 
 * Tracks prediction accuracy for model improvement.
 */
export const predictionAccuracy = pgTable("prediction_accuracy", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  predictionId: varchar("prediction_id").notNull().references(() => userPredictions.id, { onDelete: "cascade" }),
  actualOutcome: jsonb("actual_outcome").$type<any>(),
  isCorrect: boolean("is_correct"),
  accuracyScore: real("accuracy_score"), // 0-1
  evaluatedAt: timestamp("evaluated_at").defaultNow(),
}, (table) => [
  index("prediction_accuracy_prediction_id_idx").on(table.predictionId),
  index("prediction_accuracy_evaluated_at_idx").on(table.evaluatedAt),
]);

/**
 * Trends Table
 * 
 * Identified trends in user behavior and system metrics.
 */
export const trends = pgTable("trends", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  trendName: text("trend_name").notNull(),
  trendType: text("trend_type").notNull(), // 'increasing', 'decreasing', 'stable', 'seasonal'
  metric: text("metric").notNull(),
  currentValue: real("current_value").notNull(),
  previousValue: real("previous_value").notNull(),
  changePercent: real("change_percent").notNull(),
  timePeriod: text("time_period").notNull(), // 'day', 'week', 'month'
  significance: real("significance"), // Statistical significance
  detectedAt: timestamp("detected_at").defaultNow(),
}, (table) => [
  index("trends_trend_type_idx").on(table.trendType),
  index("trends_metric_idx").on(table.metric),
  index("trends_detected_at_idx").on(table.detectedAt),
]);

/**
 * Trend Alerts Table
 * 
 * Alerts generated from significant trend changes.
 */
export const trendAlerts = pgTable("trend_alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  trendId: varchar("trend_id").notNull().references(() => trends.id, { onDelete: "cascade" }),
  alertType: text("alert_type").notNull(), // 'threshold_exceeded', 'anomaly', 'prediction'
  alertLevel: text("alert_level").notNull(), // 'info', 'warning', 'critical'
  message: text("message").notNull(),
  conditions: jsonb("conditions").$type<Record<string, any>>(), // Alert trigger conditions
  isAcknowledged: boolean("is_acknowledged").notNull().default(false),
  acknowledgedBy: varchar("acknowledged_by"),
  acknowledgedAt: timestamp("acknowledged_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("trend_alerts_trend_id_idx").on(table.trendId),
  index("trend_alerts_alert_level_idx").on(table.alertLevel),
  index("trend_alerts_created_at_idx").on(table.createdAt),
]);

// ==================== Zod Schemas & Type Exports ====================

export const eventCategorySchema = z.enum(['ui', 'api', 'system', 'error', 'user']);
export const metricSchema = z.enum(['LCP', 'FID', 'CLS', 'FCP', 'TTFB', 'INP']);
export const ratingSchema = z.enum(['good', 'needs-improvement', 'poor']);
export const insightTypeSchema = z.enum(['trend', 'anomaly', 'recommendation', 'pattern']);
export const severitySchema = z.enum(['info', 'warning', 'critical']);
export const trendTypeSchema = z.enum(['increasing', 'decreasing', 'stable', 'seasonal', 'cyclical']);
export const timePeriodSchema = z.enum(['hour', 'day', 'week', 'month', 'quarter', 'year']);
export const alertLevelSchema = z.enum(['info', 'warning', 'critical', 'emergency']);

export const insertAnalyticsEventSchema = createInsertSchema(analyticsEvents)


  .extend({
    eventCategory: eventCategorySchema,
    eventValue: z.number().optional(),
  });

export type InsertAnalyticsEvent = z.infer<typeof insertAnalyticsEventSchema>;
export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;

export const insertUserSessionSchema = createInsertSchema(userSessions)


  .extend({
    pageViews: z.number().nonnegative().default(0),
    interactions: z.number().nonnegative().default(0),
    durationSeconds: z.number().positive().optional(),
  });

export type InsertUserSession = z.infer<typeof insertUserSessionSchema>;
export type UserSession = typeof userSessions.$inferSelect;

export const insertWebVitalSchema = createInsertSchema(webVitals)


  .extend({
    metric: metricSchema,
    rating: ratingSchema.optional(),
    value: z.number().positive(),
  });

export type InsertWebVital = z.infer<typeof insertWebVitalSchema>;
export type WebVital = typeof webVitals.$inferSelect;

export const insertSearchLogSchema = createInsertSchema(searchLogs)


  .extend({
    resultsCount: z.number().nonnegative(),
    clickedResultRank: z.number().positive().optional(),
    searchDuration: z.number().positive().optional(),
  });

export type InsertSearchLog = z.infer<typeof insertSearchLogSchema>;
export type SearchLog = typeof searchLogs.$inferSelect;

export const insertAnalyticsInsightSchema = createInsertSchema(analyticsInsights)


  .extend({
    insightType: insightTypeSchema,
    severity: severitySchema.optional(),
    recommendations: z.array(z.string()).optional(),
  });

export type InsertAnalyticsInsight = z.infer<typeof insertAnalyticsInsightSchema>;
export type AnalyticsInsight = typeof analyticsInsights.$inferSelect;

export const insertUserPredictionSchema = createInsertSchema(userPredictions)


  .extend({
    confidence: z.number().min(0).max(1),
  });

export type InsertUserPrediction = z.infer<typeof insertUserPredictionSchema>;
export type UserPrediction = typeof userPredictions.$inferSelect;

export const insertTrendSchema = createInsertSchema(trends)
  .extend({
    trendType: trendTypeSchema,
    timePeriod: timePeriodSchema,
    significance: z.number().min(0).max(1).optional(),
  });

export type InsertTrend = z.infer<typeof insertTrendSchema>;
export type Trend = typeof trends.$inferSelect;

export const insertQueryLogSchema = createInsertSchema(queryLogs)


  .extend({
    executionTime: z.number().positive(),
    rowsAffected: z.number().nonnegative().optional(),
  });

export type InsertQueryLog = z.infer<typeof insertQueryLogSchema>;
export type QueryLog = typeof queryLogs.$inferSelect;

export const insertInsightFeedbackSchema = createInsertSchema(insightFeedback);

export type InsertInsightFeedback = z.infer<typeof insertInsightFeedbackSchema>;
export type InsightFeedback = typeof insightFeedback.$inferSelect;

export const insertPredictionAccuracySchema = createInsertSchema(predictionAccuracy)
  .extend({
    isCorrect: z.boolean().optional(),
    accuracyScore: z.number().min(0).max(1).optional(),
  });

export type InsertPredictionAccuracy = z.infer<typeof insertPredictionAccuracySchema>;
export type PredictionAccuracy = typeof predictionAccuracy.$inferSelect;

export const insertTrendAlertSchema = createInsertSchema(trendAlerts)


  .extend({
    alertType: z.enum(['threshold_exceeded', 'anomaly', 'prediction']),
    alertLevel: alertLevelSchema,
  });

export type InsertTrendAlert = z.infer<typeof insertTrendAlertSchema>;
export type TrendAlert = typeof trendAlerts.$inferSelect;