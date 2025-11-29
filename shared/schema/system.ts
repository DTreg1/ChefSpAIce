/**
 * System & Monitoring Schema
 * 
 * Tables for system monitoring, API usage, maintenance, and activity logging.
 */

import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, index, jsonb, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./auth";

// ==================== TypeScript Interfaces ====================

/**
 * API response metadata
 */
export interface ApiResponseMetadata {
  statusCode: number;
  errorMessage?: string;
  retryCount?: number;
  cacheHit?: boolean;
  [key: string]: any;
}

/**
 * System metrics data structure
 */
export interface SystemMetricsData {
  cpu: {
    usage: number;
    cores: number;
    temperature?: number;
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  disk: {
    used: number;
    total: number;
    percentage: number;
  };
  network?: {
    bytesIn: number;
    bytesOut: number;
    connections: number;
  };
}

// ==================== Tables ====================

/**
 * API Usage Logs Table
 * 
 * Tracks external API calls for monitoring and cost control.
 */
export const apiUsageLogs = pgTable("api_usage_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  apiName: text("api_name").notNull(), // 'openai', 'stripe', 'usda', 'barcode'
  endpoint: text("endpoint").notNull(),
  method: text("method").notNull(), // 'GET', 'POST', 'PUT', 'DELETE'
  requestSize: integer("request_size"), // bytes
  responseSize: integer("response_size"), // bytes
  responseTime: integer("response_time"), // milliseconds
  statusCode: integer("status_code"),
  tokensUsed: integer("tokens_used"), // For AI APIs
  cost: real("cost"), // Estimated cost in USD
  metadata: jsonb("metadata").$type<ApiResponseMetadata>(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
}, (table) => [
  index("api_usage_logs_user_id_idx").on(table.userId),
  index("api_usage_logs_api_name_idx").on(table.apiName),
  index("api_usage_logs_timestamp_idx").on(table.timestamp),
]);

/**
 * Activity Logs Table
 * 
 * Comprehensive activity tracking for audit and security.
 */
export const activityLogs = pgTable("activity_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  activityType: text("activity_type").notNull(), // 'create', 'update', 'delete', 'view', 'export'
  resourceType: text("resource_type").notNull(), // 'recipe', 'inventory', 'user', etc.
  resourceId: varchar("resource_id"),
  action: text("action").notNull(),
  details: jsonb("details").$type<Record<string, any>>(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  success: boolean("success").notNull().default(true),
  errorMessage: text("error_message"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
}, (table) => [
  index("activity_logs_user_id_idx").on(table.userId),
  index("activity_logs_activity_type_idx").on(table.activityType),
  index("activity_logs_resource_type_idx").on(table.resourceType),
  index("activity_logs_timestamp_idx").on(table.timestamp),
]);

/**
 * System Metrics Table
 * 
 * System performance and resource utilization metrics.
 */
export const systemMetrics = pgTable("system_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  metricType: text("metric_type").notNull(), // 'performance', 'resource', 'error_rate'
  metricName: text("metric_name").notNull(),
  value: real("value").notNull(),
  unit: text("unit"),
  metadata: jsonb("metadata").$type<SystemMetricsData>(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
}, (table) => [
  index("system_metrics_metric_type_idx").on(table.metricType),
  index("system_metrics_metric_name_idx").on(table.metricName),
  index("system_metrics_timestamp_idx").on(table.timestamp),
]);

/**
 * Maintenance Predictions Table
 * 
 * Predictive maintenance recommendations based on system metrics.
 */
export const maintenancePredictions = pgTable("maintenance_predictions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  component: text("component").notNull(), // 'database', 'cache', 'storage', 'api'
  predictionType: text("prediction_type").notNull(), // 'failure', 'degradation', 'capacity'
  risk: text("risk").notNull(), // 'low', 'medium', 'high', 'critical'
  predictedDate: timestamp("predicted_date"),
  confidence: real("confidence").notNull(), // 0-1
  recommendation: text("recommendation").notNull(),
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  isAddressed: boolean("is_addressed").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("maintenance_predictions_component_idx").on(table.component),
  index("maintenance_predictions_risk_idx").on(table.risk),
  index("maintenance_predictions_created_at_idx").on(table.createdAt),
]);

/**
 * Maintenance History Table
 * 
 * Record of maintenance actions performed on the system.
 */
export const maintenanceHistory = pgTable("maintenance_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  maintenanceType: text("maintenance_type").notNull(), // 'scheduled', 'emergency', 'preventive'
  component: text("component").notNull(),
  action: text("action").notNull(),
  performedBy: varchar("performed_by"),
  duration: integer("duration"), // minutes
  downtime: boolean("downtime").notNull().default(false),
  result: text("result"), // 'success', 'partial', 'failed'
  notes: text("notes"),
  startedAt: timestamp("started_at").notNull(),
  completedAt: timestamp("completed_at"),
}, (table) => [
  index("maintenance_history_component_idx").on(table.component),
  index("maintenance_history_started_at_idx").on(table.startedAt),
]);

// ==================== Zod Schemas & Type Exports ====================

export const apiNameSchema = z.enum(['openai', 'stripe', 'usda', 'barcode', 'twilio', 'sendgrid', 'aws', 'google']);
export const httpMethodSchema = z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
export const activityTypeSchema = z.enum(['create', 'update', 'delete', 'view', 'export', 'import', 'login', 'logout']);
export const resourceTypeSchema = z.enum([
  'recipe', 
  'inventory', 
  'user', 
  'meal_plan', 
  'shopping_list', 
  'settings',
  'food_item',
  'chat',
  'storage_location',
  'appliance',
  'notification',
  'admin',
  'feedback',
  'api'
]);
export const metricTypeSchema = z.enum(['performance', 'resource', 'error_rate', 'availability', 'latency']);
export const riskLevelSchema = z.enum(['low', 'medium', 'high', 'critical']);
export const maintenanceTypeSchema = z.enum(['scheduled', 'emergency', 'preventive', 'corrective']);
export const maintenanceResultSchema = z.enum(['success', 'partial', 'failed']);

export const insertApiUsageLogSchema = createInsertSchema(apiUsageLogs)
  .extend({
    apiName: apiNameSchema,
    method: httpMethodSchema,
    statusCode: z.number().int().min(100).max(599).optional(),
    tokensUsed: z.number().nonnegative().optional(),
    cost: z.number().nonnegative().optional(),
    responseTime: z.number().positive().optional(),
  });

export type InsertApiUsageLog = z.infer<typeof insertApiUsageLogSchema>;
export type ApiUsageLog = typeof apiUsageLogs.$inferSelect;

export const insertActivityLogSchema = createInsertSchema(activityLogs)
  .extend({
    activityType: activityTypeSchema,
    resourceType: resourceTypeSchema,
  });

export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ActivityLog = typeof activityLogs.$inferSelect;

export const insertSystemMetricSchema = createInsertSchema(systemMetrics)
  .extend({
    metricType: metricTypeSchema,
    value: z.number(),
  });

export type InsertSystemMetric = z.infer<typeof insertSystemMetricSchema>;
export type SystemMetric = typeof systemMetrics.$inferSelect;

export const insertMaintenancePredictionSchema = createInsertSchema(maintenancePredictions)
  .extend({
    risk: riskLevelSchema,
    confidence: z.number().min(0).max(1),
    predictionType: z.enum(['failure', 'degradation', 'capacity', 'optimization']),
  });

export type InsertMaintenancePrediction = z.infer<typeof insertMaintenancePredictionSchema>;
export type MaintenancePrediction = typeof maintenancePredictions.$inferSelect;

export const insertMaintenanceHistorySchema = createInsertSchema(maintenanceHistory)
  .extend({
    maintenanceType: maintenanceTypeSchema,
    result: maintenanceResultSchema.optional(),
    duration: z.number().positive().optional(),
  });

export type InsertMaintenanceHistory = z.infer<typeof insertMaintenanceHistorySchema>;
export type MaintenanceHistory = typeof maintenanceHistory.$inferSelect;