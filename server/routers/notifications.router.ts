import { Router } from "express";
import { eq, desc, and, isNull } from "drizzle-orm";
import { db } from "../db";
import { notificationHistory } from "@shared/schema";
import { isAuthenticated } from "../middleware/auth.middleware";
import crypto from "crypto";
import { storage } from "../storage";

const router = Router();

// Track notification delivery/status
router.post("/api/notifications/track", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { notificationId, status, data } = req.body;

    if (!status) {
      return res.status(400).json({ error: "Status is required" });
    }

    // For now, we'll just log the tracking event
    // In a production system, you'd update the notification history record
    console.log(`Notification tracking: User ${userId}, Status: ${status}, ID: ${notificationId}`);

    res.json({ message: "Notification tracked successfully" });
  } catch (error) {
    console.error("Error tracking notification:", error);
    res.status(500).json({ error: "Failed to track notification" });
  }
});

// Get notification history for the current user
router.get("/api/notifications/history", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const includeDismissed = req.query.includeDismissed === 'true';

    let query = db
      .select()
      .from(notificationHistory)
      .where(eq(notificationHistory.userId, userId))
      .orderBy(desc(notificationHistory.sentAt))
      .limit(limit)
      .offset(offset);

    // Filter out dismissed notifications by default
    if (!includeDismissed) {
      query = db
        .select()
        .from(notificationHistory)
        .where(
          and(
            eq(notificationHistory.userId, userId),
            isNull(notificationHistory.dismissedAt)
          )
        )
        .orderBy(desc(notificationHistory.sentAt))
        .limit(limit)
        .offset(offset);
    }

    const history = await query;

    res.json(history);
  } catch (error) {
    console.error("Error fetching notification history:", error);
    res.status(500).json({ error: "Failed to fetch notification history" });
  }
});

// Get unread notification count
router.get("/api/notifications/unread-count", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const unreadNotifications = await db
      .select()
      .from(notificationHistory)
      .where(
        and(
          eq(notificationHistory.userId, userId),
          eq(notificationHistory.status, 'delivered')
        )
      );

    res.json({ count: unreadNotifications.length });
  } catch (error) {
    console.error("Error fetching unread count:", error);
    res.status(500).json({ error: "Failed to fetch unread count" });
  }
});

// Mark notification as read
router.post("/api/notifications/:id/mark-read", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id } = req.params;

    const [updated] = await db
      .update(notificationHistory)
      .set({
        status: 'opened',
        openedAt: new Date(),
      })
      .where(
        and(
          eq(notificationHistory.id, id),
          eq(notificationHistory.userId, userId)
        )
      )
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "Notification not found" });
    }

    res.json({ message: "Notification marked as read", notification: updated });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({ error: "Failed to mark notification as read" });
  }
});

// Dismiss a notification
router.post("/api/notifications/:id/dismiss", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id } = req.params;
    const { dismissedBy } = req.body;

    await storage.dismissNotification(userId, id, dismissedBy);

    res.json({ message: "Notification dismissed successfully" });
  } catch (error: any) {
    console.error("Error dismissing notification:", error);
    if (error.message === "Notification not found") {
      return res.status(404).json({ error: "Notification not found" });
    }
    res.status(500).json({ error: "Failed to dismiss notification" });
  }
});

// Clear all notifications
router.delete("/api/notifications/clear", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    await db
      .delete(notificationHistory)
      .where(eq(notificationHistory.userId, userId));

    res.json({ message: "All notifications cleared" });
  } catch (error) {
    console.error("Error clearing notifications:", error);
    res.status(500).json({ error: "Failed to clear notifications" });
  }
});

export default router;
