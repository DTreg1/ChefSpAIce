import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import {
  getUnreadNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "../services/notificationService";
import { db } from "../db";
import { notifications, userPushTokens } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { AppError } from "../middleware/errorHandler";
import { successResponse } from "../lib/apiResponse";
import { validateBody } from "../middleware/validateBody";
import { logger } from "../lib/logger";

const router = Router();

const registerDeviceSchema = z.object({
  token: z.string().min(1, "Push token is required"),
  platform: z.string().min(1, "Platform is required"),
});

router.post("/register-device", validateBody(registerDeviceSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;
    if (!userId) {
      throw AppError.unauthorized("Authentication required", "UNAUTHORIZED");
    }

    const { token, platform } = req.body;

    const existing = await db
      .select({ id: userPushTokens.id })
      .from(userPushTokens)
      .where(eq(userPushTokens.token, token))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(userPushTokens)
        .set({ userId, platform, updatedAt: new Date() })
        .where(eq(userPushTokens.token, token));
    } else {
      await db.insert(userPushTokens).values({
        userId,
        token,
        platform,
      });
    }

    logger.info("Device registered for push notifications", { userId, platform });

    res.json(successResponse({ registered: true }));
  } catch (error) {
    next(error);
  }
});

router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;
    if (!userId) {
      throw AppError.unauthorized("Authentication required", "UNAUTHORIZED");
    }

    const unread = await getUnreadNotifications(userId);
    res.json(successResponse(unread));
  } catch (error) {
    next(error);
  }
});

router.get("/all", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;
    if (!userId) {
      throw AppError.unauthorized("Authentication required", "UNAUTHORIZED");
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

    const allNotifications = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);

    res.json(successResponse(allNotifications));
  } catch (error) {
    next(error);
  }
});

router.post("/:id/read", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;
    if (!userId) {
      throw AppError.unauthorized("Authentication required", "UNAUTHORIZED");
    }

    const notificationId = parseInt(req.params.id);
    if (isNaN(notificationId)) {
      throw AppError.badRequest("Invalid notification ID", "INVALID_ID");
    }

    await markNotificationRead(notificationId, userId);
    res.json(successResponse({ marked: true }));
  } catch (error) {
    next(error);
  }
});

router.post("/read-all", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;
    if (!userId) {
      throw AppError.unauthorized("Authentication required", "UNAUTHORIZED");
    }

    await markAllNotificationsRead(userId);
    res.json(successResponse({ marked: true }));
  } catch (error) {
    next(error);
  }
});

export default router;
