import type { Request, Response, NextFunction } from "express";
import { db } from "../db";
import { subscriptions, users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { AppError } from "./errorHandler";
import { SubscriptionTier } from "@shared/subscription";

const ACTIVE_STATUSES = ["active", "trialing", "past_due"];
const GRACE_PERIOD_DAYS = 7;

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
      const [userRecord] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (userRecord && [SubscriptionTier.FREE, SubscriptionTier.BASIC, SubscriptionTier.PRO].includes(userRecord.subscriptionTier as SubscriptionTier)) {
        (req as any).subscriptionTier = userRecord.subscriptionTier;
        return next();
      }

      return next(AppError.forbidden("Active subscription required", "SUBSCRIPTION_REQUIRED"));
    }

    if (!ACTIVE_STATUSES.includes(subscription.status)) {
      return next(AppError.forbidden("Active subscription required", "SUBSCRIPTION_REQUIRED"));
    }

    if (subscription.status === "past_due") {
      const paymentFailedAt = subscription.paymentFailedAt || subscription.updatedAt || new Date();
      const gracePeriodEnd = new Date(paymentFailedAt);
      gracePeriodEnd.setDate(gracePeriodEnd.getDate() + GRACE_PERIOD_DAYS);

      if (new Date() > gracePeriodEnd) {
        return res.status(403).json({
          error: "payment_required",
          message: "Your payment failed. Please update your payment method.",
        });
      }
    }

    const [subUser] = await db
      .select({ subscriptionTier: users.subscriptionTier })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    (req as any).subscriptionTier = subUser?.subscriptionTier || 'FREE';
    next();
  } catch (error) {
    next(error);
  }
}
