import type { Request, Response, NextFunction } from "express";
import { db } from "../db";
import { subscriptions, users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { AppError } from "./errorHandler";
import { SubscriptionTier } from "@shared/subscription";
import { subscriptionCache, type CachedSubscriptionStatus } from "../lib/subscription-cache";

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

    let result: CachedSubscriptionStatus | undefined = await subscriptionCache.get(userId);

    if (!result) {
      const [dbResult] = await db
        .select({
          subscriptionStatus: subscriptions.status,
          subscriptionPaymentFailedAt: subscriptions.paymentFailedAt,
          subscriptionUpdatedAt: subscriptions.updatedAt,
          subscriptionTrialEnd: subscriptions.trialEnd,
          userTier: users.subscriptionTier,
        })
        .from(users)
        .leftJoin(subscriptions, eq(subscriptions.userId, users.id))
        .where(eq(users.id, userId))
        .limit(1);

      if (dbResult) {
        await subscriptionCache.set(userId, dbResult);
        result = dbResult;
      }
    }

    if (!result) {
      return next(AppError.forbidden("Active subscription required", "SUBSCRIPTION_REQUIRED"));
    }

    const { subscriptionStatus, subscriptionPaymentFailedAt, subscriptionUpdatedAt, subscriptionTrialEnd, userTier } = result;

    if (!subscriptionStatus) {
      if (userTier === SubscriptionTier.STANDARD) {
        req.subscriptionTier = userTier;
        return next();
      }

      return next(AppError.forbidden("Active subscription required", "SUBSCRIPTION_REQUIRED"));
    }

    if (!ACTIVE_STATUSES.includes(subscriptionStatus)) {
      return next(AppError.forbidden("Active subscription required", "SUBSCRIPTION_REQUIRED"));
    }

    if (subscriptionStatus === "trialing" && subscriptionTrialEnd) {
      if (new Date() > new Date(subscriptionTrialEnd)) {
        await Promise.all([
          subscriptionCache.delete(userId),
          db.update(subscriptions).set({ status: "expired", updatedAt: new Date() }).where(eq(subscriptions.userId, userId)),
          db.update(users).set({ subscriptionStatus: "expired" }).where(eq(users.id, userId)),
        ]);
        return next(AppError.forbidden(
          "Your free trial has expired. Please subscribe to continue using ChefSpAIce.",
          "TRIAL_EXPIRED"
        ));
      }
    }

    if (subscriptionStatus === "past_due") {
      const paymentFailedAt = subscriptionPaymentFailedAt || subscriptionUpdatedAt || new Date();
      const gracePeriodEnd = new Date(paymentFailedAt);
      gracePeriodEnd.setDate(gracePeriodEnd.getDate() + GRACE_PERIOD_DAYS);

      if (new Date() > gracePeriodEnd) {
        return next(AppError.forbidden(
          "Your payment failed. Please update your payment method.",
          "PAYMENT_REQUIRED"
        ));
      }
    }

    req.subscriptionTier = userTier || SubscriptionTier.STANDARD;
    next();
  } catch (error) {
    next(error);
  }
}
