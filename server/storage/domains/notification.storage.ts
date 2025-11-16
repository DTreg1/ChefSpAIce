/**
 * @file server/storage/domains/notification.storage.ts
 * @description Notification and push token domain storage implementation
 */

import { db } from "@db";
import { eq, and, desc, sql, gte, lte, or, isNull } from "drizzle-orm";
import {
  pushTokens,
  notifications,
  notificationPreferences,
  notificationScores,
  notificationFeedback,
  type PushToken,
  type InsertPushToken,
  type Notification,
  type InsertNotification,
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
          type,
          deviceId,
          updatedAt: new Date()
        })
        .where(eq(pushTokens.token, token));
    } else {
      // Insert new token
      await db.insert(pushTokens).values({
        userId,
        token,
        type,
        deviceId
      });
    }
  }

  async getUserPushTokens(userId: string, type?: 'web' | 'ios' | 'android'): Promise<PushToken[]> {
    let query = db.select().from(pushTokens).where(eq(pushTokens.userId, userId));
    
    if (type) {
      query = query.where(and(
        eq(pushTokens.userId, userId),
        eq(pushTokens.type, type)
      ));
    }
    
    return await query.orderBy(desc(pushTokens.createdAt));
  }

  async deletePushToken(token: string): Promise<void> {
    await db.delete(pushTokens).where(eq(pushTokens.token, token));
  }

  async deleteUserPushTokens(userId: string, type?: 'web' | 'ios' | 'android'): Promise<void> {
    let deleteQuery = db.delete(pushTokens).where(eq(pushTokens.userId, userId));
    
    if (type) {
      deleteQuery = deleteQuery.where(and(
        eq(pushTokens.userId, userId),
        eq(pushTokens.type, type)
      ));
    }
    
    await deleteQuery;
  }
  
  // Notification Management
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [result] = await db.insert(notifications).values(notification).returning();
    return result;
  }

  async getNotification(notificationId: string): Promise<Notification | null> {
    const [result] = await db.select()
      .from(notifications)
      .where(eq(notifications.id, notificationId));
    return result || null;
  }

  async getUserNotifications(userId: string, limit = 50): Promise<Notification[]> {
    return await db.select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
  }

  async getUndismissedNotifications(userId: string): Promise<Notification[]> {
    return await db.select()
      .from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        or(
          eq(notifications.dismissed, false),
          isNull(notifications.dismissed)
        )
      ))
      .orderBy(desc(notifications.createdAt));
  }

  async dismissNotification(notificationId: string): Promise<void> {
    await db.update(notifications)
      .set({ 
        dismissed: true,
        dismissedAt: new Date()
      })
      .where(eq(notifications.id, notificationId));
  }

  async markNotificationRead(notificationId: string): Promise<void> {
    await db.update(notifications)
      .set({ 
        read: true,
        readAt: new Date()
      })
      .where(eq(notifications.id, notificationId));
  }

  async getPendingNotifications(): Promise<Notification[]> {
    return await db.select()
      .from(notifications)
      .where(and(
        eq(notifications.status, 'pending'),
        or(
          isNull(notifications.scheduledFor),
          lte(notifications.scheduledFor, new Date())
        )
      ))
      .orderBy(notifications.createdAt);
  }
  
  // Notification Preferences
  async getNotificationPreferences(userId: string): Promise<NotificationPreference | null> {
    const [result] = await db.select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId));
    return result || null;
  }

  async upsertNotificationPreferences(preferences: InsertNotificationPreference): Promise<NotificationPreference> {
    const existing = await this.getNotificationPreferences(preferences.userId);
    
    if (existing) {
      const [result] = await db.update(notificationPreferences)
        .set({
          ...preferences,
          updatedAt: new Date()
        })
        .where(eq(notificationPreferences.userId, preferences.userId))
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
        const scores = await this.getNotificationScores(notification.userId);
        const relevantScore = scores.find(s => 
          s.notificationType === notification.type &&
          s.channel === notification.channel
        );
        
        if (relevantScore) {
          const currentEngagement = relevantScore.engagementScore || 0.5;
          const adjustment = feedback.wasHelpful ? 0.1 : -0.1;
          const newScore = Math.max(0, Math.min(1, currentEngagement + adjustment));
          
          await this.updateNotificationScore(relevantScore.id, {
            engagementScore: newScore,
            lastInteraction: new Date()
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
      .from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        gte(notifications.createdAt, startDate)
      ));
    
    return {
      sent: userNotifications.length,
      opened: userNotifications.filter(n => n.read).length,
      dismissed: userNotifications.filter(n => n.dismissed).length,
      clicked: userNotifications.filter(n => n.clickedAt !== null).length
    };
  }

  async getNotificationStats(startDate?: Date, endDate?: Date): Promise<NotificationStats> {
    let query = db.select().from(notifications);
    const conditions = [];
    
    if (startDate) {
      conditions.push(gte(notifications.createdAt, startDate));
    }
    
    if (endDate) {
      conditions.push(lte(notifications.createdAt, endDate));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    const allNotifications = await query;
    
    const delivered = allNotifications.filter(n => n.status === 'delivered').length;
    const opened = allNotifications.filter(n => n.read).length;
    const dismissed = allNotifications.filter(n => n.dismissed).length;
    
    // Calculate engagement scores
    const scores = await db.select().from(notificationScores);
    const averageEngagementScore = scores.length > 0
      ? scores.reduce((sum, s) => sum + (s.engagementScore || 0.5), 0) / scores.length
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