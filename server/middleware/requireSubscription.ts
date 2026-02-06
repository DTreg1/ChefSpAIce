import type { Request, Response, NextFunction } from "express";
import { db } from "../db";
import { subscriptions } from "@shared/schema";
import { eq } from "drizzle-orm";
import { AppError } from "./errorHandler";

const ACTIVE_STATUSES = ["active", "trialing"];

export async function requireSubscription(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.userId;

    if (!userId) {
      return next(AppError.unauthorized("Authentication required", "AUTHENTICATION_REQUIRED"));
    }

    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .limit(1);

    if (!subscription) {
      return next(AppError.forbidden("Active subscription required", "SUBSCRIPTION_REQUIRED"));
    }

    if (!ACTIVE_STATUSES.includes(subscription.status)) {
      return next(AppError.forbidden("Active subscription required", "SUBSCRIPTION_REQUIRED"));
    }

    next();
  } catch (error) {
    next(error);
  }
}
