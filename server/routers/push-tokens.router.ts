import { Router, Request, Response } from "express";
import { getAuthenticatedUserId, sendError, sendSuccess } from "../types/request-helpers";
import { eq, and } from "drizzle-orm";
import { db } from "../db";
import { pushTokens } from "@shared/schema";
import { isAuthenticated, adminOnly } from "../middleware/auth.middleware";
import crypto from "crypto";
import PushStatusService from "../services/push-status.service";

const router = Router();

// Register a push token
router.post("/api/push-tokens/register", isAuthenticated, async (req: Request, res) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { token, subscription, platform, deviceInfo  } = req.body || {};

    // Accept either 'token' (for native) or 'subscription' (for web)
    const tokenData = token || subscription;
    
    if (!tokenData || !platform) {
      return res.status(400).json({ error: "Token/subscription and platform are required" });
    }

    // Normalize token data to string for storage
    const tokenString = typeof tokenData === 'string' ? tokenData : JSON.stringify(tokenData);

    // Check if token already exists
    const existingToken = await db
      .select()
      .from(pushTokens)
      .where(
        and(
          eq(pushTokens.userId, userId),
          eq(pushTokens.platform, platform),
          eq(pushTokens.token, tokenString)
        )
      );

    if (existingToken.length > 0) {
      // Update last used time and device info if provided
      await db
        .update(pushTokens)
        .set({
          deviceInfo: deviceInfo || existingToken[0].deviceInfo,
          updatedAt: new Date(),
        })
        .where(eq(pushTokens.id, existingToken[0].id));

      return res.json({ message: "Token updated", id: existingToken[0].id });
    }

    // Create new push token
    const [newToken] = await db
      .insert(pushTokens)
      .values({
        id: crypto.randomUUID(),
        userId,
        token: tokenString,
        platform,
        deviceInfo,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    res.json({ message: "Token registered", id: newToken.id });
  } catch (error) {
    console.error("Error registering push token:", error);
    res.status(500).json({ error: "Failed to register push token" });
  }
});

// Unregister a push token
router.delete("/api/push-tokens/unregister", isAuthenticated, async (req: Request, res) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { platform  } = req.body || {};

    if (!platform) {
      return res.status(400).json({ error: "Platform is required" });
    }

    // Deactivate all tokens for this user and platform
    await db
      .update(pushTokens)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(and(eq(pushTokens.userId, userId), eq(pushTokens.platform, platform)));

    res.json({ message: "Tokens unregistered" });
  } catch (error) {
    console.error("Error unregistering push token:", error);
    res.status(500).json({ error: "Failed to unregister push token" });
  }
});

// Update push token status
router.put("/api/push-tokens/:id/status", isAuthenticated, async (req: Request, res) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id } = req.params;
    const { isActive  } = req.body || {};

    if (typeof isActive !== "boolean") {
      return res.status(400).json({ error: "isActive must be a boolean" });
    }

    // Update token status
    const result = await db
      .update(pushTokens)
      .set({
        isActive,
        updatedAt: new Date(),
      })
      .where(and(eq(pushTokens.id, id), eq(pushTokens.userId, userId)))
      .returning();

    if (result.length === 0) {
      return res.status(404).json({ error: "Token not found" });
    }

    res.json({ message: "Token status updated", token: result[0] });
  } catch (error) {
    console.error("Error updating token status:", error);
    res.status(500).json({ error: "Failed to update token status" });
  }
});

// Get user's push tokens
router.get("/api/push-tokens", isAuthenticated, async (req: Request, res) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const tokens = await db
      .select()
      .from(pushTokens)
      .where(eq(pushTokens.userId, userId))
      .orderBy(pushTokens.createdAt);

    res.json(tokens);
  } catch (error) {
    console.error("Error fetching push tokens:", error);
    res.status(500).json({ error: "Failed to fetch push tokens" });
  }
});

// Test push notification
router.post("/api/push-tokens/test", isAuthenticated, async (req: Request, res) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Dynamically import to avoid circular dependencies
    const { default: PushNotificationService } = await import("../services/push-notification.service");
    
    const result = await PushNotificationService.sendTestNotification(userId);
    res.json({ 
      message: "Test notification sent", 
      sent: result.sent, 
      failed: result.failed 
    });
  } catch (error) {
    console.error("Error sending test notification:", error);
    res.status(500).json({ error: "Failed to send test notification" });
  }
});

// Trigger expiring food notifications (admin only)
router.post("/api/push-tokens/trigger-expiring", isAuthenticated, adminOnly, async (req: Request, res) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { default: NotificationScheduler } = await import("../services/notification-scheduler");
    
    const result = await NotificationScheduler.triggerExpiringFoodNotifications();
    res.json({ 
      message: "Expiring food notifications triggered", 
      totalSent: result.totalSent,
      usersNotified: result.usersNotified
    });
  } catch (error) {
    console.error("Error triggering expiring food notifications:", error);
    res.status(500).json({ error: "Failed to trigger notifications" });
  }
});

// Trigger recipe suggestions (admin only)
router.post("/api/push-tokens/trigger-recipes", isAuthenticated, adminOnly, async (req: Request, res) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { default: NotificationScheduler } = await import("../services/notification-scheduler");
    
    const result = await NotificationScheduler.triggerRecipeSuggestions();
    res.json({ 
      message: "Recipe suggestions triggered", 
      totalSent: result.totalSent,
      usersNotified: result.usersNotified
    });
  } catch (error) {
    console.error("Error triggering recipe suggestions:", error);
    res.status(500).json({ error: "Failed to trigger suggestions" });
  }
});

// Get push notification services status
router.get("/api/push-tokens/status", isAuthenticated, async (req: Request, res) => {
  try {
    const status = PushStatusService.getStatus();
    res.json(status);
  } catch (error) {
    console.error("Error getting push notification status:", error);
    res.status(500).json({ error: "Failed to get status" });
  }
});

export default router;