/**
 * Notifications Schema
 * 
 * Tables for managing push notifications, user preferences, and notification analytics.
 */

import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, index, jsonb, real, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./auth";

// ==================== TypeScript Interfaces ====================

/**
 * Device information for push tokens
 */
export interface DeviceInfo {
  deviceId?: string;
  deviceModel?: string;
  osVersion?: string;
  appVersion?: string;
}

/**
 * Push Token device info schema
 */
export const pushTokenDeviceInfoSchema = z.object({
  deviceId: z.string().optional(),
  deviceModel: z.string().optional(),
  osVersion: z.string().optional(),
  appVersion: z.string().optional(),
});

// ==================== Tables ====================

/**
 * Push Notification Tokens Table
 * 
 * Stores device tokens for push notifications across platforms.
 * Enables multi-device notification delivery per user.
 */
export const pushTokens = pgTable("push_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull(),
  platform: text("platform").notNull(), // 'ios', 'android', 'web'
  isActive: boolean("is_active").notNull().default(true),
  deviceInfo: jsonb("device_info").$type<DeviceInfo>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("push_tokens_user_token_idx").on(table.userId, table.token),
  index("push_tokens_user_id_idx").on(table.userId),
]);

/**
 * Notification History Table
 * 
 * Tracks all delivered push notifications and their engagement.
 * Provides analytics for notification effectiveness.
 */
export const notificationHistory = pgTable("notification_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // 'expiring-food', 'recipe-suggestion', 'meal-reminder', 'test'
  title: text("title").notNull(),
  body: text("body").notNull(),
  data: jsonb("data").$type<Record<string, any>>(),
  status: text("status").notNull().default('sent'), // 'sent', 'delivered', 'opened', 'dismissed', 'failed'
  platform: text("platform").notNull(), // 'ios', 'android', 'web'
  pushTokenId: varchar("push_token_id").references(() => pushTokens.id, { onDelete: "set null" }),
  sentAt: timestamp("sent_at").notNull().defaultNow(),
  deliveredAt: timestamp("delivered_at"),
  openedAt: timestamp("opened_at"),
  dismissedAt: timestamp("dismissed_at"),
  dismissedBy: varchar("dismissed_by"), // device/client identifier that dismissed the notification
}, (table) => [
  index("notification_history_user_id_idx").on(table.userId),
  index("notification_history_type_idx").on(table.type),
  index("notification_history_status_idx").on(table.status),
  index("notification_history_sent_at_idx").on(table.sentAt),
]);

/**
 * Notification Preferences Table
 * 
 * Granular notification preferences per user and notification type.
 */
export const notificationPreferences = pgTable("notification_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  notificationType: text("notification_type").notNull(), // 'expiring-food', 'recipe-suggestion', etc.
  enabled: boolean("enabled").notNull().default(true),
  frequency: text("frequency"), // 'immediate', 'hourly', 'daily', 'weekly'
  quietHoursStart: text("quiet_hours_start"), // "22:00" format
  quietHoursEnd: text("quiet_hours_end"), // "08:00" format
  minImportance: integer("min_importance").default(3), // 1-5 scale
  channels: jsonb("channels").$type<string[]>().default(['push']), // ['push', 'email', 'sms', 'in-app']
  metadata: jsonb("metadata").$type<Record<string, any>>(), // Type-specific preferences
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("notification_preferences_user_id_idx").on(table.userId),
  uniqueIndex("notification_preferences_user_type_idx").on(table.userId, table.notificationType),
]);

/**
 * Notification Scores Table
 * 
 * ML-powered notification relevance scoring for personalization.
 */
export const notificationScores = pgTable("notification_scores", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  notificationType: text("notification_type").notNull(),
  score: real("score").notNull(), // 0-1 relevance score
  relevanceScore: real("relevance_score"), // Alias for score for compatibility
  factors: jsonb("factors").$type<Record<string, number>>(), // Individual scoring factors
  confidence: real("confidence"), // Model confidence 0-1
  modelVersion: text("model_version"),
  urgencyLevel: integer("urgency_level"), // 1-5 urgency scale
  holdUntil: timestamp("hold_until"), // Delay notification until this time
  actualSentAt: timestamp("actual_sent_at"), // When notification was actually sent
  createdAt: timestamp("created_at").defaultNow(), // Alias for calculatedAt
  calculatedAt: timestamp("calculated_at").defaultNow(),
  expiresAt: timestamp("expires_at"), // When score should be recalculated
}, (table) => [
  index("notification_scores_user_id_idx").on(table.userId),
  index("notification_scores_user_type_idx").on(table.userId, table.notificationType),
  index("notification_scores_expires_at_idx").on(table.expiresAt),
]);

/**
 * Notification Feedback Table
 * 
 * User feedback on notification relevance and usefulness.
 */
export const notificationFeedback = pgTable("notification_feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  notificationId: varchar("notification_id").references(() => notificationHistory.id, { onDelete: "cascade" }),
  feedbackType: text("feedback_type").notNull(), // 'useful', 'not_useful', 'wrong_time', 'too_frequent'
  rating: integer("rating"), // 1-5 stars
  reason: text("reason"),
  suggestedImprovement: text("suggested_improvement"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("notification_feedback_user_id_idx").on(table.userId),
  index("notification_feedback_notification_id_idx").on(table.notificationId),
  uniqueIndex("notification_feedback_user_notification_idx").on(table.userId, table.notificationId),
]);

// ==================== Zod Schemas & Type Exports ====================

export const platformSchema = z.enum(['ios', 'android', 'web']);
export const notificationTypeSchema = z.enum([
  'expiring-food',
  'recipe-suggestion',
  'meal-reminder',
  'test',
  'system',
  'promotion',
  'feature-update'
]);
export const notificationStatusSchema = z.enum(['sent', 'delivered', 'opened', 'dismissed', 'failed']);
export const notificationFrequencySchema = z.enum(['immediate', 'hourly', 'daily', 'weekly', 'monthly']);
export const notificationChannelSchema = z.enum(['push', 'email', 'sms', 'in-app']);
export const notificationFeedbackTypeSchema = z.enum(['useful', 'not_useful', 'wrong_time', 'too_frequent', 'irrelevant']);

export const insertPushTokenSchema = createInsertSchema(pushTokens)
  .extend({
    deviceInfo: pushTokenDeviceInfoSchema.optional(),
    platform: platformSchema,
  });

export type InsertPushToken = z.infer<typeof insertPushTokenSchema>;
export type PushToken = typeof pushTokens.$inferSelect;

export const insertNotificationHistorySchema = createInsertSchema(notificationHistory)
  .extend({
    type: notificationTypeSchema,
    status: notificationStatusSchema.default('sent'),
    platform: platformSchema,
  });

export type InsertNotificationHistory = z.infer<typeof insertNotificationHistorySchema>;
export type NotificationHistoryItem = typeof notificationHistory.$inferSelect;

export const insertNotificationPreferenceSchema = createInsertSchema(notificationPreferences)
  .extend({
    notificationType: notificationTypeSchema,
    frequency: notificationFrequencySchema.optional(),
    channels: z.array(notificationChannelSchema).default(['push']),
    minImportance: z.number().min(1).max(5).default(3),
    quietHoursStart: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
    quietHoursEnd: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  });

export type InsertNotificationPreference = z.infer<typeof insertNotificationPreferenceSchema>;
export type NotificationPreference = typeof notificationPreferences.$inferSelect;

export const insertNotificationScoreSchema = createInsertSchema(notificationScores)
  .extend({
    notificationType: notificationTypeSchema,
    score: z.number().min(0).max(1),
    confidence: z.number().min(0).max(1).optional(),
  });

export type InsertNotificationScore = z.infer<typeof insertNotificationScoreSchema>;
export type NotificationScore = typeof notificationScores.$inferSelect;

export const insertNotificationFeedbackSchema = createInsertSchema(notificationFeedback)
  .extend({
    feedbackType: notificationFeedbackTypeSchema,
    rating: z.number().min(1).max(5).optional(),
  });

export type InsertNotificationFeedback = z.infer<typeof insertNotificationFeedbackSchema>;
export type NotificationFeedback = typeof notificationFeedback.$inferSelect;