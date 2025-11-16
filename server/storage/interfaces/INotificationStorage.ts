/**
 * @file server/storage/interfaces/INotificationStorage.ts
 * @description Interface for notification and push token storage operations
 */

import type {
  PushToken,
  InsertPushToken,
  Notification,
  InsertNotification,
  NotificationPreference,
  InsertNotificationPreference,
  NotificationScore,
  InsertNotificationScore,
  NotificationFeedback,
  InsertNotificationFeedback
} from "@shared/schema";

export interface NotificationStats {
  totalSent: number;
  deliveryRate: number;
  openRate: number;
  dismissRate: number;
  averageEngagementScore: number;
}

export interface INotificationStorage {
  // Push Token Management
  savePushToken(userId: string, token: string, type: 'web' | 'ios' | 'android', deviceId?: string): Promise<void>;
  getUserPushTokens(userId: string, type?: 'web' | 'ios' | 'android'): Promise<PushToken[]>;
  deletePushToken(token: string): Promise<void>;
  deleteUserPushTokens(userId: string, type?: 'web' | 'ios' | 'android'): Promise<void>;
  
  // Notification Management
  createNotification(notification: InsertNotification): Promise<Notification>;
  getNotification(notificationId: string): Promise<Notification | null>;
  getUserNotifications(userId: string, limit?: number): Promise<Notification[]>;
  getUndismissedNotifications(userId: string): Promise<Notification[]>;
  dismissNotification(notificationId: string): Promise<void>;
  markNotificationRead(notificationId: string): Promise<void>;
  getPendingNotifications(): Promise<Notification[]>;
  
  // Notification Preferences
  getNotificationPreferences(userId: string): Promise<NotificationPreference | null>;
  upsertNotificationPreferences(preferences: InsertNotificationPreference): Promise<NotificationPreference>;
  
  // Notification Scoring & Intelligence
  createNotificationScore(score: InsertNotificationScore): Promise<NotificationScore>;
  getNotificationScores(userId: string): Promise<NotificationScore[]>;
  updateNotificationScore(scoreId: string, updates: Partial<InsertNotificationScore>): Promise<NotificationScore>;
  
  // Notification Feedback
  createNotificationFeedback(feedback: InsertNotificationFeedback): Promise<NotificationFeedback>;
  getNotificationFeedback(notificationId: string): Promise<NotificationFeedback[]>;
  
  // Analytics
  getRecentUserEngagement(userId: string, days?: number): Promise<{
    sent: number;
    opened: number;
    dismissed: number;
    clicked: number;
  }>;
  getNotificationStats(startDate?: Date, endDate?: Date): Promise<NotificationStats>;
}