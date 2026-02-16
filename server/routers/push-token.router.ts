import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { db } from "../db";
import { userPushTokens } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { Expo } from "expo-server-sdk";
import { AppError } from "../middleware/errorHandler";
import { successResponse } from "../lib/apiResponse";
import { logger } from "../lib/logger";
import { validateBody } from "../middleware/validateBody";

const router = Router();

const pushTokenSchema = z.object({
  token: z.string().min(1, "Push token is required"),
  platform: z.string().optional(),
});

router.post("/", validateBody(pushTokenSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;
    if (!userId) {
      throw AppError.unauthorized("Authentication required", "UNAUTHORIZED");
    }

    const { token, platform } = req.body;
    const devicePlatform = platform || "unknown";

    if (!Expo.isExpoPushToken(token)) {
      throw AppError.badRequest("Invalid Expo push token format", "INVALID_TOKEN");
    }

    const existing = await db
      .select({ id: userPushTokens.id })
      .from(userPushTokens)
      .where(eq(userPushTokens.token, token))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(userPushTokens)
        .set({ userId, platform: devicePlatform, updatedAt: new Date() })
        .where(eq(userPushTokens.token, token));
    } else {
      await db.insert(userPushTokens).values({
        userId,
        token,
        platform: devicePlatform,
      });
    }

    logger.info("Push token registered", { userId, platform: devicePlatform });

    res.json(successResponse({ registered: true }));
  } catch (error) {
    next(error);
  }
});

router.delete("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;
    if (!userId) {
      throw AppError.unauthorized("Authentication required", "UNAUTHORIZED");
    }

    const { token } = req.body || {};

    if (token) {
      await db
        .delete(userPushTokens)
        .where(and(eq(userPushTokens.userId, userId), eq(userPushTokens.token, token)));
    } else {
      await db
        .delete(userPushTokens)
        .where(eq(userPushTokens.userId, userId));
    }

    logger.info("Push token removed", { userId });

    res.json(successResponse({ removed: true }));
  } catch (error) {
    next(error);
  }
});

export default router;
