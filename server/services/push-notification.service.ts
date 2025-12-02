/**
 * Push Notification Core Service
 *
 * Consolidated service for all push notification operations across platforms.
 * Handles Web Push (VAPID), iOS (APNs), and Android (FCM).
 *
 * Features:
 * - Multi-platform support (web, iOS, Android)
 * - Multi-device support per user
 * - Batch processing with configurable batch size
 * - Automatic invalid token cleanup
 * - Notification history tracking
 * - Business logic for expiring food alerts, recipe suggestions, meal reminders
 */

import webpush from "web-push";
import { eq, and, lt } from "drizzle-orm";
import { db } from "../db";
import {
  pushTokens,
  users,
  userInventory,
  notificationHistory,
} from "@shared/schema";
import { storage } from "../storage/index";
import crypto from "crypto";
import type { PushToken } from "@shared/schema";

// Lazy imports to avoid circular dependencies
let FcmService: typeof import("./fcm.service").FcmService;
let ApnsService: typeof import("./apns.service").ApnsService;

const loadPlatformServices = async () => {
  if (!FcmService) {
    const fcmModule = await import("./fcm.service");
    FcmService = fcmModule.FcmService;
  }
  if (!ApnsService) {
    const apnsModule = await import("./apns.service");
    ApnsService = apnsModule.ApnsService;
  }
};

// Configure web push
const publicVapidKey =
  process.env.VITE_VAPID_PUBLIC_KEY ||
  "BKd0F0KpK_3Yw2c4lxVhQGNqPWnMGqWXA1kapi6VLEsL0VBs9K8PtRmUugKM8qCqX7EMz_2lPcrecNaRc9LbKxo";
const privateVapidKey =
  process.env.VAPID_PRIVATE_KEY || "your-private-key-here";
const vapidSubject = process.env.VAPID_SUBJECT || "mailto:admin@chefspaice.com";

// Validate VAPID configuration
const isVapidConfigured =
  privateVapidKey !== "your-private-key-here" && publicVapidKey.length > 20;
if (!isVapidConfigured) {
  console.warn(
    "⚠️  VAPID keys are not properly configured. Web push notifications will NOT work.\n" +
      "   To enable web push notifications:\n" +
      "   1. Generate VAPID keys using: npx web-push generate-vapid-keys\n" +
      "   2. Set environment variables:\n" +
      "      - VITE_VAPID_PUBLIC_KEY=<your-public-key>\n" +
      "      - VAPID_PRIVATE_KEY=<your-private-key>\n" +
      "      - VAPID_SUBJECT=mailto:your-email@domain.com\n",
  );
}

// Initialize web push (even with placeholder keys for development)
webpush.setVapidDetails(vapidSubject, publicVapidKey, privateVapidKey);

// Types
export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

export interface PushNotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
  shouldRemoveToken?: boolean;
}

export interface BatchSendResult {
  sent: number;
  failed: number;
  invalidTokens: string[];
}

// Configuration
const BATCH_SIZE = 100;

/**
 * Push Notification Core Service
 *
 * Unified service for sending push notifications across all platforms.
 */
export class PushNotificationCoreService {
  /**
   * Send a push notification to a specific user's devices
   */
  static async sendToUser(
    userId: string,
    payload: NotificationPayload,
  ): Promise<BatchSendResult> {
    try {
      await loadPlatformServices();

      const tokens = await db
        .select()
        .from(pushTokens)
        .where(
          and(eq(pushTokens.userId, userId), eq(pushTokens.isActive, true)),
        );

      if (tokens.length === 0) {
        return { sent: 0, failed: 0, invalidTokens: [] };
      }

      return this.sendToTokens(userId, tokens, payload);
    } catch (error) {
      console.error("Error sending push notification:", error);
      throw error;
    }
  }

  /**
   * Send notifications to multiple tokens with batching
   */
  private static async sendToTokens(
    userId: string,
    tokens: PushToken[],
    payload: NotificationPayload,
  ): Promise<BatchSendResult> {
    let sent = 0;
    let failed = 0;
    const invalidTokens: string[] = [];

    // Process in batches to avoid overwhelming the service
    for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
      const batch = tokens.slice(i, i + BATCH_SIZE);

      const batchPromises = batch.map(async (token) => {
        try {
          const result = await this.sendToSingleToken(token, payload);

          if (result.success) {
            sent++;
            await this.recordNotificationSuccess(userId, token, payload);
          } else {
            failed++;
            await this.recordNotificationFailure(userId, token, payload);

            if (result.shouldRemoveToken) {
              invalidTokens.push(token.token);
              await this.deactivateToken(token.id);
            }
          }
        } catch (error) {
          failed++;
          console.error(
            `Failed to send notification to token ${token.id}:`,
            error,
          );
          await this.recordNotificationFailure(userId, token, payload);

          if (this.isTokenInvalidError(error)) {
            invalidTokens.push(token.token);
            await this.deactivateToken(token.id);
          }
        }
      });

      await Promise.all(batchPromises);
    }

    return { sent, failed, invalidTokens };
  }

  /**
   * Send notification to a single token based on platform
   */
  private static async sendToSingleToken(
    token: PushToken,
    payload: NotificationPayload,
  ): Promise<PushNotificationResult> {
    switch (token.platform) {
      case "web":
        return this.sendWebPush(token.token, payload);
      case "ios":
        return this.sendApnsPush(token.token, payload);
      case "android":
        return this.sendFcmPush(token.token, payload);
      default:
        console.warn(`Unknown platform: ${token.platform}`);
        return { success: false, error: `Unknown platform: ${token.platform}` };
    }
  }

  /**
   * Send Web Push notification
   */
  private static async sendWebPush(
    tokenString: string,
    payload: NotificationPayload,
  ): Promise<PushNotificationResult> {
    try {
      const subscription = JSON.parse(tokenString);
      await webpush.sendNotification(subscription, JSON.stringify(payload));
      return { success: true };
    } catch (error: any) {
      return this.handleSendError(error);
    }
  }

  /**
   * Send APNs notification (iOS)
   */
  private static async sendApnsPush(
    tokenString: string,
    payload: NotificationPayload,
  ): Promise<PushNotificationResult> {
    try {
      await ApnsService.sendNotification(tokenString, payload);
      return { success: true };
    } catch (error: any) {
      return this.handleSendError(error);
    }
  }

  /**
   * Send FCM notification (Android)
   */
  private static async sendFcmPush(
    tokenString: string,
    payload: NotificationPayload,
  ): Promise<PushNotificationResult> {
    try {
      await FcmService.sendNotification(tokenString, payload);
      return { success: true };
    } catch (error: any) {
      return this.handleSendError(error);
    }
  }

  /**
   * Handle send errors and determine if token should be removed
   */
  private static handleSendError(error: Error | any): PushNotificationResult {
    const errorMessage = error instanceof Error ? error.message : String(error);

    const invalidTokenPatterns = [
      /invalid.?registration/i,
      /not.?registered/i,
      /invalid.?token/i,
      /bad.?device.?token/i,
      /unregistered/i,
      /invalid.?recipient/i,
      /mismatch.?sender/i,
    ];

    const shouldRemoveToken =
      error.statusCode === 410 ||
      invalidTokenPatterns.some((pattern) => pattern.test(errorMessage));

    return {
      success: false,
      error: errorMessage,
      shouldRemoveToken,
    };
  }

  /**
   * Check if error indicates invalid token
   */
  private static isTokenInvalidError(error: any): boolean {
    if (error?.statusCode === 410) return true;

    const errorMessage = error instanceof Error ? error.message : String(error);
    const invalidPatterns = [
      /invalid.?registration/i,
      /not.?registered/i,
      /invalid.?token/i,
      /bad.?device.?token/i,
      /unregistered/i,
    ];

    return invalidPatterns.some((pattern) => pattern.test(errorMessage));
  }

  /**
   * Deactivate an invalid token
   */
  private static async deactivateToken(tokenId: string): Promise<void> {
    await db
      .update(pushTokens)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(pushTokens.id, tokenId));
  }

  /**
   * Record successful notification in history
   */
  private static async recordNotificationSuccess(
    userId: string,
    token: PushToken,
    payload: NotificationPayload,
  ): Promise<void> {
    await db.insert(notificationHistory).values({
      id: crypto.randomUUID(),
      userId,
      type: payload.tag || "notification",
      title: payload.title,
      body: payload.body,
      data: payload.data,
      status: "sent",
      platform: token.platform,
      pushTokenId: token.id,
    });

    await db
      .update(pushTokens)
      .set({ updatedAt: new Date() })
      .where(eq(pushTokens.id, token.id));
  }

  /**
   * Record failed notification in history
   */
  private static async recordNotificationFailure(
    userId: string,
    token: PushToken,
    payload: NotificationPayload,
  ): Promise<void> {
    await db.insert(notificationHistory).values({
      id: crypto.randomUUID(),
      userId,
      type: payload.tag || "notification",
      title: payload.title,
      body: payload.body,
      data: payload.data,
      status: "failed",
      platform: token.platform,
      pushTokenId: token.id,
    });
  }

  // ==========================================
  // Business Logic Methods
  // ==========================================

  /**
   * Send expiring food notifications to all eligible users
   */
  static async sendExpiringFoodNotifications(): Promise<{
    totalSent: number;
    usersNotified: number;
  }> {
    try {
      const usersWithNotifications = await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.notificationsEnabled, true),
            eq(users.notifyExpiringFood, true),
          ),
        );

      const today = new Date();
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(today.getDate() + 3);

      let totalSent = 0;

      for (const user of usersWithNotifications) {
        const expiringItems = await db
          .select()
          .from(userInventory)
          .where(
            and(
              eq(userInventory.userId, user.id),
              lt(
                userInventory.expirationDate,
                threeDaysFromNow.toISOString().split("T")[0],
              ),
            ),
          );

        if (expiringItems.length === 0) continue;

        const todayStr = today.toISOString().split("T")[0];
        const threeDaysStr = threeDaysFromNow.toISOString().split("T")[0];

        const expiredItems = expiringItems.filter(
          (item) => item.expirationDate && item.expirationDate < todayStr,
        );
        const todayItems = expiringItems.filter(
          (item) => item.expirationDate && item.expirationDate === todayStr,
        );
        const soonItems = expiringItems.filter(
          (item) =>
            item.expirationDate &&
            item.expirationDate > todayStr &&
            item.expirationDate < threeDaysStr,
        );

        let notificationBody = "";

        if (expiredItems.length > 0) {
          notificationBody += `${expiredItems.length} item${expiredItems.length > 1 ? "s have" : " has"} expired. `;
        }

        if (todayItems.length > 0) {
          notificationBody += `${todayItems.length} item${todayItems.length > 1 ? "s expire" : " expires"} today. `;
        }

        if (soonItems.length > 0) {
          notificationBody += `${soonItems.length} item${soonItems.length > 1 ? "s expire" : " expires"} soon.`;
        }

        const notification: NotificationPayload = {
          title: "Food Expiration Alert",
          body: notificationBody.trim(),
          icon: "/icon-192x192.png",
          badge: "/icon-72x72.png",
          tag: "expiring-food",
          data: {
            type: "expiring-food",
            url: "/inventory",
            itemCount: expiringItems.length,
          },
          actions: [
            { action: "view", title: "View Items" },
            { action: "dismiss", title: "Dismiss" },
          ],
        };

        const result = await PushNotificationCoreService.sendToUser(
          user.id,
          notification,
        );
        totalSent += result.sent;
      }

      return { totalSent, usersNotified: usersWithNotifications.length };
    } catch (error) {
      console.error("Error sending expiring food notifications:", error);
      throw error;
    }
  }

  /**
   * Send recipe suggestion notifications
   */
  static async sendRecipeSuggestions(): Promise<{
    totalSent: number;
    usersNotified: number;
  }> {
    try {
      const usersWithNotifications = await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.notificationsEnabled, true),
            eq(users.notifyRecipeSuggestions, true),
          ),
        );

      let totalSent = 0;

      for (const user of usersWithNotifications) {
        const inventoryItems = await db
          .select()
          .from(userInventory)
          .where(eq(userInventory.userId, user.id));

        if (inventoryItems.length === 0) continue;

        const notification: NotificationPayload = {
          title: "Recipe Suggestion",
          body: `ChefSpAIce has new recipe ideas based on your ${inventoryItems.length} ingredients!`,
          icon: "/icon-192x192.png",
          badge: "/icon-72x72.png",
          tag: "recipe-suggestion",
          data: {
            type: "recipe-suggestion",
            url: "/chat",
          },
          actions: [
            { action: "view", title: "View Recipes" },
            { action: "later", title: "Maybe Later" },
          ],
        };

        const result = await PushNotificationCoreService.sendToUser(
          user.id,
          notification,
        );
        totalSent += result.sent;
      }

      return { totalSent, usersNotified: usersWithNotifications.length };
    } catch (error) {
      console.error("Error sending recipe suggestions:", error);
      throw error;
    }
  }

  /**
   * Send meal reminder notifications
   */
  static async sendMealReminder(
    userId: string,
    mealName: string,
    mealTime: string,
  ): Promise<BatchSendResult> {
    try {
      const notification: NotificationPayload = {
        title: "Meal Reminder",
        body: `Time to prepare "${mealName}" for ${mealTime}!`,
        icon: "/icon-192x192.png",
        badge: "/icon-72x72.png",
        tag: `meal-reminder-${mealTime}`,
        data: {
          type: "meal-reminder",
          url: "/meal-planning",
          mealName,
          mealTime,
        },
        actions: [
          { action: "start-cooking", title: "Start Cooking" },
          { action: "snooze", title: "Remind in 30 min" },
        ],
      };

      return await PushNotificationCoreService.sendToUser(userId, notification);
    } catch (error) {
      console.error("Error sending meal reminder:", error);
      throw error;
    }
  }

  /**
   * Send test notification to a user
   */
  static async sendTestNotification(userId: string): Promise<BatchSendResult> {
    try {
      const notification: NotificationPayload = {
        title: "Test Notification",
        body: "Your push notifications are working correctly!",
        icon: "/icon-192x192.png",
        badge: "/icon-72x72.png",
        tag: "test",
        data: {
          type: "test",
          timestamp: new Date().toISOString(),
        },
      };

      return await PushNotificationCoreService.sendToUser(userId, notification);
    } catch (error) {
      console.error("Error sending test notification:", error);
      throw error;
    }
  }

  /**
   * Get service status
   */
  static getStatus(): { vapidConfigured: boolean; publicKey: string } {
    return {
      vapidConfigured: isVapidConfigured,
      publicKey: publicVapidKey,
    };
  }
}

// Backward compatibility exports
export const PushNotificationService = PushNotificationCoreService;
export default PushNotificationCoreService;
