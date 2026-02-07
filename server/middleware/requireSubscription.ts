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

    const [result] = await db
      .select({
        subscriptionStatus: subscriptions.status,
        subscriptionPaymentFailedAt: subscriptions.paymentFailedAt,
        subscriptionUpdatedAt: subscriptions.updatedAt,
        userTier: users.subscriptionTier,
      })
      .from(users)
      .leftJoin(subscriptions, eq(subscriptions.userId, users.id))
      .where(eq(users.id, userId))
      .limit(1);

    if (!result) {
      return next(AppError.forbidden("Active subscription required", "SUBSCRIPTION_REQUIRED"));
    }

    const { subscriptionStatus, subscriptionPaymentFailedAt, subscriptionUpdatedAt, userTier } = result;

    if (!subscriptionStatus) {
      if (userTier && [SubscriptionTier.FREE, SubscriptionTier.BASIC, SubscriptionTier.PRO].includes(userTier as SubscriptionTier)) {
        (req as any).subscriptionTier = userTier;
        return next();
      }

      return next(AppError.forbidden("Active subscription required", "SUBSCRIPTION_REQUIRED"));
    }

    if (!ACTIVE_STATUSES.includes(subscriptionStatus)) {
      return next(AppError.forbidden("Active subscription required", "SUBSCRIPTION_REQUIRED"));
    }

    if (subscriptionStatus === "past_due") {
      const paymentFailedAt = subscriptionPaymentFailedAt || subscriptionUpdatedAt || new Date();
      const gracePeriodEnd = new Date(paymentFailedAt);
      gracePeriodEnd.setDate(gracePeriodEnd.getDate() + GRACE_PERIOD_DAYS);

      if (new Date() > gracePeriodEnd) {
        return res.status(403).json({
          error: "payment_required",
          message: "Your payment failed. Please update your payment method.",
        });
      }
    }

    (req as any).subscriptionTier = userTier || 'FREE';
    next();
  } catch (error) {
    next(error);
  }
}
