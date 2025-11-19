/**
 * @file server/storage/domains/notification.storage.ts
 * @description Notification and push token domain storage implementation
 */

import { db } from "../../db";
import { eq, and, desc, sql, gte, lte, or, isNull } from "drizzle-orm";
import {
  pushTokens,
  notificationHistory,
  notificationPreferences,
  notificationScores,
  notificationFeedback,
  type PushToken,
  type InsertPushToken,
  type NotificationHistoryItem,
  type InsertNotificationHistory,
  type NotificationPreference,
  type InsertNotificationPreference,
  type NotificationScore,
  type InsertNotificationScore,
  type NotificationFeedback,
  type InsertNotificationFeedback
} from "@shared/schema";
import type { INotificationStorage, NotificationStats } from "../interfaces/INotificationStorage";

export class NotificationStorage implements INotificationStorage {
  // Push Token Management
  async savePushToken(
    userId: string,
    token: string,
    type: 'web' | 'ios' | 'android',
    deviceId?: string
  ): Promise<void> {
    // Check if token already exists
    const existing = await db.select()
      .from(pushTokens)
      .where(eq(pushTokens.token, token));
    
    if (existing.length > 0) {
      // Update existing token
      await db.update(pushTokens)
        .set({
          userId,
          platform: type,
          deviceInfo: deviceId ? { deviceId } : null,
          isActive: true,
          updatedAt: new Date()
        })
        .where(eq(pushTokens.token, token));
    } else {
      // Insert new token
      await db.insert(pushTokens).values({
        userId,
        token,
        platform: type,
        deviceInfo: deviceId ? { deviceId } : null,
        isActive: true
      });
    }
  }

  async getUserPushTokens(userId: string, type?: 'web' | 'ios' | 'android'): Promise<PushToken[]> {
    const conditions = [
      eq(pushTokens.userId, userId),
      eq(pushTokens.isActive, true)
    ];
    
    if (type) {
      conditions.push(eq(pushTokens.platform, type));
    }
    
    return await db.select()
      .from(pushTokens)
      .where(and(...conditions))
      .orderBy(desc(pushTokens.createdAt));
  }

  async deletePushToken(token: string): Promise<void> {
    await db.delete(pushTokens).where(eq(pushTokens.token, token));
  }

  async deleteUserPushTokens(userId: string, type?: 'web' | 'ios' | 'android'): Promise<void> {
    const conditions = [eq(pushTokens.userId, userId)];
    
    if (type) {
      conditions.push(eq(pushTokens.platform, type));
    }
    
    await db.delete(pushTokens).where(and(...conditions));
  }
  
  // Notification Management (using notificationHistory table)
  async createNotification(notification: InsertNotificationHistory): Promise<NotificationHistoryItem> {
    const [result] = await db.insert(notificationHistory).values(notification).returning();
    return result;
  }

  async getNotification(notificationId: string): Promise<NotificationHistoryItem | null> {
    const [result] = await db.select()
      .from(notificationHistory)
      .where(eq(notificationHistory.id, notificationId));
    return result || null;
  }

  async getUserNotifications(userId: string, limit = 50): Promise<NotificationHistoryItem[]> {
    return await db.select()
      .from(notificationHistory)
      .where(eq(notificationHistory.userId, userId))
      .orderBy(desc(notificationHistory.sentAt))
      .limit(limit);
  }

  async getUndismissedNotifications(userId: string): Promise<NotificationHistoryItem[]> {
    return await db.select()
      .from(notificationHistory)
      .where(and(
        eq(notificationHistory.userId, userId),
        isNull(notificationHistory.dismissedAt)
      ))
      .orderBy(desc(notificationHistory.sentAt));
  }

  async dismissNotification(notificationId: string): Promise<void> {
    await db.update(notificationHistory)
      .set({ 
        status: 'dismissed',
        dismissedAt: new Date()
      })
      .where(eq(notificationHistory.id, notificationId));
  }

  async markNotificationRead(notificationId: string): Promise<void> {
    await db.update(notificationHistory)
      .set({ 
        status: 'opened',
        openedAt: new Date()
      })
      .where(eq(notificationHistory.id, notificationId));
  }

  async getPendingNotifications(): Promise<NotificationHistoryItem[]> {
    // Return notifications that were sent but not yet delivered
    return await db.select()
      .from(notificationHistory)
      .where(eq(notificationHistory.status, 'sent'))
      .orderBy(notificationHistory.sentAt);
  }
  
  // Notification Preferences (now per notification type)
  async getNotificationPreferences(userId: string): Promise<NotificationPreference | null> {
    // Get all preferences for a user and return the first one
    // This maintains backward compatibility
    const [result] = await db.select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId))
      .limit(1);
    return result || null;
  }

  async getAllNotificationPreferences(userId: string): Promise<NotificationPreference[]> {
    return await db.select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId))
      .orderBy(notificationPreferences.notificationType);
  }

  async getNotificationPreferenceByType(
    userId: string, 
    notificationType: string
  ): Promise<NotificationPreference | null> {
    const [result] = await db.select()
      .from(notificationPreferences)
      .where(and(
        eq(notificationPreferences.userId, userId),
        eq(notificationPreferences.notificationType, notificationType)
      ));
    return result || null;
  }

  async upsertNotificationPreferences(preferences: InsertNotificationPreference): Promise<NotificationPreference> {
    const existing = await this.getNotificationPreferenceByType(
      preferences.userId, 
      preferences.notificationType
    );
    
    if (existing) {
      const [result] = await db.update(notificationPreferences)
        .set({
          ...preferences,
          updatedAt: new Date()
        })
        .where(and(
          eq(notificationPreferences.userId, preferences.userId),
          eq(notificationPreferences.notificationType, preferences.notificationType)
        ))
        .returning();
      return result;
    } else {
      const [result] = await db.insert(notificationPreferences)
        .values(preferences)
        .returning();
      return result;
    }
  }
  
  // Notification Scoring & Intelligence
  async createNotificationScore(score: InsertNotificationScore): Promise<NotificationScore> {
    const [result] = await db.insert(notificationScores).values(score).returning();
    return result;
  }

  async getNotificationScores(userId: string): Promise<NotificationScore[]> {
    return await db.select()
      .from(notificationScores)
      .where(eq(notificationScores.userId, userId))
      .orderBy(desc(notificationScores.createdAt));
  }

  async getNotificationScoreByType(
    userId: string, 
    notificationType: string
  ): Promise<NotificationScore | null> {
    const [result] = await db.select()
      .from(notificationScores)
      .where(and(
        eq(notificationScores.userId, userId),
        eq(notificationScores.notificationType, notificationType)
      ))
      .orderBy(desc(notificationScores.createdAt))
      .limit(1);
    return result || null;
  }

  async updateNotificationScore(scoreId: string, updates: Partial<InsertNotificationScore>): Promise<NotificationScore> {
    const [result] = await db.update(notificationScores)
      .set(updates)
      .where(eq(notificationScores.id, scoreId))
      .returning();
    return result;
  }
  
  // Notification Feedback
  async createNotificationFeedback(feedback: InsertNotificationFeedback): Promise<NotificationFeedback> {
    const [result] = await db.insert(notificationFeedback).values(feedback).returning();
    
    // Update notification score based on feedback
    if (feedback.notificationId) {
      const notification = await this.getNotification(feedback.notificationId);
      if (notification) {
        // Find and update the associated score
        const score = await this.getNotificationScoreByType(
          notification.userId,
          notification.type
        );
        
        if (score) {
          // Adjust score based on feedback type
          const currentScore = score.score || 0.5;
          let adjustment = 0;
          
          switch (feedback.feedbackType) {
            case 'useful':
              adjustment = 0.1;
              break;
            case 'not_useful':
            case 'irrelevant':
              adjustment = -0.1;
              break;
            case 'wrong_time':
            case 'too_frequent':
              adjustment = -0.05;
              break;
          }
          
          const newScore = Math.max(0, Math.min(1, currentScore + adjustment));
          
          await this.updateNotificationScore(score.id, {
            score: newScore,
            relevanceScore: newScore
          });
        }
      }
    }
    
    return result;
  }

  async getNotificationFeedback(notificationId: string): Promise<NotificationFeedback[]> {
    return await db.select()
      .from(notificationFeedback)
      .where(eq(notificationFeedback.notificationId, notificationId))
      .orderBy(desc(notificationFeedback.createdAt));
  }

  async getUserNotificationFeedback(userId: string): Promise<NotificationFeedback[]> {
    return await db.select()
      .from(notificationFeedback)
      .where(eq(notificationFeedback.userId, userId))
      .orderBy(desc(notificationFeedback.createdAt));
  }
  
  // Analytics
  async getRecentUserEngagement(userId: string, days = 30): Promise<{
    sent: number;
    opened: number;
    dismissed: number;
    clicked: number;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const userNotifications = await db.select()
      .from(notificationHistory)
      .where(and(
        eq(notificationHistory.userId, userId),
        gte(notificationHistory.sentAt, startDate)
      ));
    
    return {
      sent: userNotifications.length,
      opened: userNotifications.filter(n => n.openedAt !== null).length,
      dismissed: userNotifications.filter(n => n.dismissedAt !== null).length,
      clicked: userNotifications.filter(n => n.openedAt !== null).length // opened is equivalent to clicked
    };
  }

  async getNotificationStats(startDate?: Date, endDate?: Date): Promise<NotificationStats> {
    const conditions = [];
    
    if (startDate) {
      conditions.push(gte(notificationHistory.sentAt, startDate));
    }
    
    if (endDate) {
      conditions.push(lte(notificationHistory.sentAt, endDate));
    }
    
    const allNotifications = conditions.length > 0
      ? await db.select().from(notificationHistory).where(and(...conditions))
      : await db.select().from(notificationHistory);
    
    const delivered = allNotifications.filter(n => n.deliveredAt !== null).length;
    const opened = allNotifications.filter(n => n.openedAt !== null).length;
    const dismissed = allNotifications.filter(n => n.dismissedAt !== null).length;
    
    // Calculate average score
    const scores = await db.select().from(notificationScores);
    const averageEngagementScore = scores.length > 0
      ? scores.reduce((sum, s) => sum + (s.score || 0.5), 0) / scores.length
      : 0.5;
    
    return {
      totalSent: allNotifications.length,
      deliveryRate: allNotifications.length > 0 ? delivered / allNotifications.length : 0,
      openRate: delivered > 0 ? opened / delivered : 0,
      dismissRate: delivered > 0 ? dismissed / delivered : 0,
      averageEngagementScore
    };
  }
}
