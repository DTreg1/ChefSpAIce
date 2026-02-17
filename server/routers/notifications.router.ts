import { Router, Request, Response, NextFunction } from "express";
import {
  getUnreadNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "../services/notificationService";
import { db } from "../db";
import { notifications } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { AppError } from "../middleware/errorHandler";
import { successResponse } from "../lib/apiResponse";

const router = Router();

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
