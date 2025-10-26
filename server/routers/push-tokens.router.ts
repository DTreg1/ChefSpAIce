import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "../db";
import { pushTokens } from "@shared/schema";
import { isAuthenticated } from "../middleware/auth.middleware";
import crypto from "crypto";

const router = Router();

// Register a push token
router.post("/api/push-tokens/register", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { subscription, platform } = req.body;

    if (!subscription || !platform) {
      return res.status(400).json({ error: "Subscription and platform are required" });
    }

    // Check if token already exists
    const existingToken = await db
      .select()
      .from(pushTokens)
      .where(
        and(
          eq(pushTokens.userId, userId),
          eq(pushTokens.platform, platform),
          eq(pushTokens.token, JSON.stringify(subscription))
        )
      );

    if (existingToken.length > 0) {
      // Update last used time
      await db
        .update(pushTokens)
        .set({
          updatedAt: new Date(),
        })
        .where(eq(pushTokens.id, existingToken[0].id));

      return res.json({ message: "Token updated", id: existingToken[0].id });
    }

    // Create new push token
    const [token] = await db
      .insert(pushTokens)
      .values({
        id: crypto.randomUUID(),
        userId,
        token: JSON.stringify(subscription),
        platform,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    res.json({ message: "Token registered", id: token.id });
  } catch (error) {
    console.error("Error registering push token:", error);
    res.status(500).json({ error: "Failed to register push token" });
  }
});

// Unregister a push token
router.delete("/api/push-tokens/unregister", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { platform } = req.body;

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
router.put("/api/push-tokens/:id/status", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id } = req.params;
    const { isActive } = req.body;

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
router.get("/api/push-tokens", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
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

export default router;