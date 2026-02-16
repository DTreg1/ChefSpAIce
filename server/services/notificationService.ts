import { db } from "../db";
import { notifications, userPushTokens } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { logger } from "../lib/logger";

export async function sendPushNotification({
  userId,
  title,
  body,
  data,
}: {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}): Promise<void> {
  try {
    const tokens = await db
      .select({ token: userPushTokens.token })
      .from(userPushTokens)
      .where(eq(userPushTokens.userId, userId));

    if (tokens.length === 0) {
      return;
    }

    const messages = tokens
      .filter((t) => /^ExponentPushToken\[.+\]$/.test(t.token) || /^ExpoPushToken\[.+\]$/.test(t.token))
      .map((t) => ({
        to: t.token,
        title,
        body,
        data: data as Record<string, unknown> | undefined,
        sound: "default" as const,
      }));

    if (messages.length === 0) {
      return;
    }

    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });

    if (!response.ok) {
      logger.error("Expo push API request failed", {
        userId,
        status: response.status,
        statusText: response.statusText,
      });
      return;
    }

    const result = await response.json() as { data: Array<{ status: string; id?: string; message?: string; details?: unknown }> };

    for (const ticket of result.data) {
      if (ticket.status === "error") {
        logger.error("Push notification delivery failed", {
          userId,
          error: ticket.message,
          details: ticket.details,
        });
      } else {
        logger.info("Push notification sent", { userId, ticketId: ticket.id });
      }
    }
  } catch (error) {
    logger.error("Failed to send push notification", {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function queueNotification({
  userId,
  type,
  title,
  body,
  data,
  deepLink,
}: {
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  deepLink?: string;
}): Promise<void> {
  try {
    await db.insert(notifications).values({
      userId,
      type,
      title,
      body,
      data: data || null,
      deepLink: deepLink || null,
    });
    logger.info("Notification queued", { userId, type, title });

    await sendPushNotification({ userId, title, body, data });
  } catch (error) {
    logger.error("Failed to queue notification", {
      userId,
      type,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function getUnreadNotifications(userId: string) {
  return db
    .select()
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)))
    .orderBy(desc(notifications.createdAt));
}

export async function markNotificationRead(notificationId: number, userId: string) {
  return db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));
}

export async function markAllNotificationsRead(userId: string) {
  return db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
}
