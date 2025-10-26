import webpush from "web-push";
import { eq, and, lt } from "drizzle-orm";
import { db } from "../db";
import { pushTokens, users, userInventory, notificationHistory } from "@shared/schema";
import crypto from "crypto";

// Configure web push
const publicVapidKey = process.env.VITE_VAPID_PUBLIC_KEY || "BKd0F0KpK_3Yw2c4lxVhQGNqPWnMGqWXA1kapi6VLEsL0VBs9K8PtRmUugKM8qCqX7EMz_2lPcrecNaRc9LbKxo";
const privateVapidKey = process.env.VAPID_PRIVATE_KEY || "your-private-key-here";
const vapidSubject = process.env.VAPID_SUBJECT || "mailto:admin@chefspaice.com";

// Validate VAPID configuration
const isVapidConfigured = privateVapidKey !== "your-private-key-here" && publicVapidKey.length > 20;
if (!isVapidConfigured) {
  console.warn(
    '⚠️  VAPID keys are not properly configured. Web push notifications will NOT work.\n' +
    '   To enable web push notifications:\n' +
    '   1. Generate VAPID keys using: npx web-push generate-vapid-keys\n' +
    '   2. Set environment variables:\n' +
    '      - VITE_VAPID_PUBLIC_KEY=<your-public-key>\n' +
    '      - VAPID_PRIVATE_KEY=<your-private-key>\n' +
    '      - VAPID_SUBJECT=mailto:your-email@domain.com\n'
  );
}

// Initialize web push (even with placeholder keys for development)
webpush.setVapidDetails(vapidSubject, publicVapidKey, privateVapidKey);

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

export class PushNotificationService {
  /**
   * Send a push notification to a specific user
   */
  static async sendToUser(userId: string, payload: NotificationPayload) {
    try {
      // Get user's active push tokens
      const tokens = await db
        .select()
        .from(pushTokens)
        .where(and(eq(pushTokens.userId, userId), eq(pushTokens.isActive, true)));

      if (tokens.length === 0) {
        console.log(`No active push tokens found for user ${userId}`);
        return { sent: 0, failed: 0 };
      }

      let sent = 0;
      let failed = 0;

      // Send notification to all active tokens
      for (const token of tokens) {
        try {
          // Handle different platform types
          if (token.platform === 'web') {
            // Web push uses subscription objects
            const subscription = JSON.parse(token.token);
            await webpush.sendNotification(subscription, JSON.stringify(payload));
          } else {
            // Native platforms (iOS/Android) - not yet implemented
            // For now, skip native tokens as they require APNS/FCM integration
            console.warn(`Native push notifications for ${token.platform} are not yet implemented`);
            continue;
          }
          
          sent++;
          
          // Record notification in history
          await db.insert(notificationHistory).values({
            id: crypto.randomUUID(),
            userId,
            type: payload.tag || 'notification',
            title: payload.title,
            body: payload.body,
            data: payload.data,
            status: 'sent',
            platform: token.platform,
            pushTokenId: token.id,
          });
          
          // Update last used time
          await db
            .update(pushTokens)
            .set({ updatedAt: new Date() })
            .where(eq(pushTokens.id, token.id));
        } catch (error: any) {
          console.error(`Failed to send notification to token ${token.id}:`, error);
          failed++;
          
          // Record failed notification in history
          await db.insert(notificationHistory).values({
            id: crypto.randomUUID(),
            userId,
            type: payload.tag || 'notification',
            title: payload.title,
            body: payload.body,
            data: payload.data,
            status: 'failed',
            platform: token.platform,
            pushTokenId: token.id,
          });
          
          // If the subscription is invalid, deactivate it
          if (error.statusCode === 410) {
            await db
              .update(pushTokens)
              .set({ 
                isActive: false, 
                updatedAt: new Date() 
              })
              .where(eq(pushTokens.id, token.id));
          }
        }
      }

      return { sent, failed };
    } catch (error) {
      console.error("Error sending push notification:", error);
      throw error;
    }
  }

  /**
   * Send notifications about expiring food items
   */
  static async sendExpiringFoodNotifications() {
    try {
      // Get users with notifications enabled for expiring food
      const usersWithNotifications = await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.notificationsEnabled, true),
            eq(users.notifyExpiringFood, true)
          )
        );

      const today = new Date();
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(today.getDate() + 3);

      let totalSent = 0;

      for (const user of usersWithNotifications) {
        // Get expiring items for this user
        const expiringItems = await db
          .select()
          .from(userInventory)
          .where(
            and(
              eq(userInventory.userId, user.id),
              lt(userInventory.expirationDate, threeDaysFromNow.toISOString().split('T')[0])
            )
          );

        if (expiringItems.length === 0) continue;

        // Group items by days until expiration
        const todayStr = today.toISOString().split('T')[0];
        const threeDaysStr = threeDaysFromNow.toISOString().split('T')[0];
        
        const expiredItems = expiringItems.filter(
          item => item.expirationDate && item.expirationDate < todayStr
        );
        const todayItems = expiringItems.filter(
          item => item.expirationDate && item.expirationDate === todayStr
        );
        const soonItems = expiringItems.filter(
          item => item.expirationDate && 
            item.expirationDate > todayStr &&
            item.expirationDate < threeDaysStr
        );

        let notificationBody = "";
        
        if (expiredItems.length > 0) {
          notificationBody += `${expiredItems.length} item${expiredItems.length > 1 ? 's have' : ' has'} expired. `;
        }
        
        if (todayItems.length > 0) {
          notificationBody += `${todayItems.length} item${todayItems.length > 1 ? 's expire' : ' expires'} today. `;
        }
        
        if (soonItems.length > 0) {
          notificationBody += `${soonItems.length} item${soonItems.length > 1 ? 's expire' : ' expires'} soon.`;
        }

        const notification: NotificationPayload = {
          title: "⏰ Food Expiration Alert",
          body: notificationBody.trim(),
          icon: "/icon-192x192.png",
          badge: "/icon-72x72.png",
          tag: "expiring-food",
          data: {
            type: "expiring-food",
            url: "/inventory",
            itemCount: expiringItems.length
          },
          actions: [
            {
              action: "view",
              title: "View Items",
            },
            {
              action: "dismiss",
              title: "Dismiss",
            }
          ]
        };

        const result = await PushNotificationService.sendToUser(user.id, notification);
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
  static async sendRecipeSuggestions() {
    try {
      // Get users with notifications enabled for recipe suggestions
      const usersWithNotifications = await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.notificationsEnabled, true),
            eq(users.notifyRecipeSuggestions, true)
          )
        );

      let totalSent = 0;

      for (const user of usersWithNotifications) {
        // Get user's inventory count
        const inventoryItems = await db
          .select()
          .from(userInventory)
          .where(eq(userInventory.userId, user.id));

        if (inventoryItems.length === 0) continue;

        const notification: NotificationPayload = {
          title: "👨‍🍳 Recipe Suggestion",
          body: `ChefSpAIce has new recipe ideas based on your ${inventoryItems.length} ingredients!`,
          icon: "/icon-192x192.png",
          badge: "/icon-72x72.png",
          tag: "recipe-suggestion",
          data: {
            type: "recipe-suggestion",
            url: "/chat"
          },
          actions: [
            {
              action: "view",
              title: "View Recipes",
            },
            {
              action: "later",
              title: "Maybe Later",
            }
          ]
        };

        const result = await PushNotificationService.sendToUser(user.id, notification);
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
  static async sendMealReminder(userId: string, mealName: string, mealTime: string) {
    try {
      const notification: NotificationPayload = {
        title: "🍽️ Meal Reminder",
        body: `Time to prepare "${mealName}" for ${mealTime}!`,
        icon: "/icon-192x192.png",
        badge: "/icon-72x72.png",
        tag: `meal-reminder-${mealTime}`,
        data: {
          type: "meal-reminder",
          url: "/meal-planning",
          mealName,
          mealTime
        },
        actions: [
          {
            action: "start-cooking",
            title: "Start Cooking",
          },
          {
            action: "snooze",
            title: "Remind in 30 min",
          }
        ]
      };

      return await PushNotificationService.sendToUser(userId, notification);
    } catch (error) {
      console.error("Error sending meal reminder:", error);
      throw error;
    }
  }

  /**
   * Test notification for a user
   */
  static async sendTestNotification(userId: string) {
    try {
      const notification: NotificationPayload = {
        title: "🧪 Test Notification",
        body: "Your push notifications are working correctly!",
        icon: "/icon-192x192.png",
        badge: "/icon-72x72.png",
        tag: "test",
        data: {
          type: "test",
          timestamp: new Date().toISOString()
        }
      };

      return await PushNotificationService.sendToUser(userId, notification);
    } catch (error) {
      console.error("Error sending test notification:", error);
      throw error;
    }
  }
}

export default PushNotificationService;