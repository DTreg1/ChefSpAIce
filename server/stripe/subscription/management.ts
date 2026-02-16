import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { db } from "../../db";
import { users, subscriptions, cancellationReasons, conversionEvents, retentionOffers } from "@shared/schema";
import { eq, and, gte } from "drizzle-orm";
import { getUncachableStripeClient } from "../stripeClient";
import { SubscriptionTier } from "@shared/subscription";
import { AppError } from "../../middleware/errorHandler";
import { validateBody } from "../../middleware/validateBody";
import { successResponse } from "../../lib/apiResponse";
import { logger } from "../../lib/logger";
import { invalidateSubscriptionCache } from "../../lib/subscription-cache";
import { getAuthenticatedUser } from "./shared";

const router = Router();

const cancelSubscriptionSchema = z.object({
  reason: z.enum(["too_expensive", "not_using", "missing_features", "other"], { required_error: "Cancellation reason is required" }),
  details: z.string().optional(),
  offerShown: z.boolean().optional(),
  offerAccepted: z.boolean().optional(),
});

const pauseSubscriptionSchema = z.object({
  durationMonths: z.number().int().refine(val => [1, 2, 3].includes(val), "Duration must be 1, 2, or 3 months").optional().default(1),
});

const logCancellationSchema = z.object({
  reason: z.enum(["too_expensive", "not_using", "missing_features", "other"]).optional(),
  details: z.string().optional(),
  offerShown: z.boolean().optional(),
  offerAccepted: z.boolean().optional(),
});

const syncRevenuecatSchema = z.object({
  tier: z.enum(["STANDARD"], { required_error: "tier is required" }),
  status: z.enum(["active", "trialing", "canceled", "expired", "past_due"], { required_error: "status is required" }),
  expirationDate: z.string().optional(),
});

router.post("/cancel", validateBody(cancelSubscriptionSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      throw AppError.unauthorized("Authentication required", "AUTHENTICATION_REQUIRED");
    }

    const { reason, details, offerShown, offerAccepted } = req.body;

    const [existingSubscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, user.id))
      .limit(1);

    if (!existingSubscription || !existingSubscription.stripeSubscriptionId) {
      throw AppError.badRequest("No active subscription found", "NO_ACTIVE_SUBSCRIPTION");
    }

    if (existingSubscription.status !== "active") {
      throw AppError.badRequest("Subscription is not active", "SUBSCRIPTION_NOT_ACTIVE");
    }

    const stripe = await getUncachableStripeClient();

    await stripe.subscriptions.update(existingSubscription.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    await db.update(subscriptions).set({
      cancelAtPeriodEnd: true,
      updatedAt: new Date(),
    }).where(eq(subscriptions.userId, user.id));

    await db.insert(cancellationReasons).values({
      userId: user.id,
      reason,
      details: details || null,
      offerShown: offerShown || null,
      offerAccepted: offerAccepted || false,
    });

    const [currentUser] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
    const currentTier = currentUser?.subscriptionTier || SubscriptionTier.STANDARD;

    await db.insert(conversionEvents).values({
      userId: user.id,
      fromTier: currentTier,
      toTier: SubscriptionTier.STANDARD,
      source: "cancellation_scheduled",
      stripeSessionId: `cancel_scheduled_${existingSubscription.stripeSubscriptionId}_${Date.now()}`,
    }).onConflictDoNothing({ target: conversionEvents.stripeSessionId });

    logger.info("Subscription cancellation scheduled", {
      userId: user.id,
      reason,
      fromTier: currentTier,
      offerShown,
      offerAccepted,
    });

    res.json(successResponse({
      canceled: true,
      cancelAtPeriodEnd: true,
      currentPeriodEnd: existingSubscription.currentPeriodEnd?.toISOString(),
    }));
  } catch (error) {
    next(error);
  }
});

router.post("/pause", validateBody(pauseSubscriptionSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      throw AppError.unauthorized("Authentication required", "AUTHENTICATION_REQUIRED");
    }

    const { durationMonths } = req.body;

    const [existingSubscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, user.id))
      .limit(1);

    if (!existingSubscription || !existingSubscription.stripeSubscriptionId) {
      throw AppError.badRequest("No active subscription found", "NO_ACTIVE_SUBSCRIPTION");
    }

    if (existingSubscription.status !== "active") {
      throw AppError.badRequest("Subscription is not active", "SUBSCRIPTION_NOT_ACTIVE");
    }

    const stripe = await getUncachableStripeClient();
    const resumesAt = Math.floor(Date.now() / 1000) + (durationMonths * 30 * 24 * 60 * 60);

    await stripe.subscriptions.update(existingSubscription.stripeSubscriptionId, {
      pause_collection: {
        behavior: "void",
        resumes_at: resumesAt,
      },
    });

    await db.update(subscriptions).set({
      status: "paused",
      updatedAt: new Date(),
    }).where(eq(subscriptions.userId, user.id));

    logger.info("Subscription paused", {
      userId: user.id,
      durationMonths,
      resumesAt: new Date(resumesAt * 1000).toISOString(),
    });

    res.json(successResponse({
      paused: true,
      resumesAt: new Date(resumesAt * 1000).toISOString(),
      durationMonths,
    }));
  } catch (error) {
    next(error);
  }
});

router.post("/log-cancellation-flow", validateBody(logCancellationSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      throw AppError.unauthorized("Authentication required", "AUTHENTICATION_REQUIRED");
    }

    const { reason, details, offerShown, offerAccepted } = req.body;

    await db.insert(cancellationReasons).values({
      userId: user.id,
      reason: reason || "unknown",
      details: details || null,
      offerShown: offerShown || null,
      offerAccepted: offerAccepted || false,
    });

    logger.info("Cancellation flow interaction logged", {
      userId: user.id,
      reason,
      offerShown,
      offerAccepted,
    });

    res.json(successResponse({ logged: true }));
  } catch (error) {
    next(error);
  }
});

router.post("/apply-retention-offer", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      throw AppError.unauthorized("Authentication required", "AUTHENTICATION_REQUIRED");
    }

    const [existingSubscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, user.id))
      .limit(1);

    if (!existingSubscription || !existingSubscription.stripeSubscriptionId) {
      throw AppError.badRequest("No active subscription found", "NO_ACTIVE_SUBSCRIPTION");
    }

    if (existingSubscription.status !== "active") {
      throw AppError.badRequest("Subscription is not active", "SUBSCRIPTION_NOT_ACTIVE");
    }

    const stripe = await getUncachableStripeClient();

    const stripeSub = await stripe.subscriptions.retrieve(
      existingSubscription.stripeSubscriptionId,
      { expand: ["discounts"] }
    );

    const activeRetentionDiscount = (stripeSub.discounts || []).find(
      (d: any) => d.coupon?.name?.startsWith("Retention Offer")
    );
    if (activeRetentionDiscount) {
      throw AppError.conflict(
        "A retention offer is already active on this subscription",
        "RETENTION_OFFER_ALREADY_APPLIED"
      );
    }

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const [recentOffer] = await db
      .select()
      .from(retentionOffers)
      .where(
        and(
          eq(retentionOffers.userId, user.id),
          gte(retentionOffers.appliedAt, sixMonthsAgo)
        )
      )
      .limit(1);

    if (recentOffer) {
      throw AppError.conflict(
        "A retention offer was already applied within the last 6 months",
        "RETENTION_OFFER_ALREADY_APPLIED"
      );
    }

    const coupon = await stripe.coupons.create({
      percent_off: 50,
      duration: "repeating",
      duration_in_months: 3,
      name: "Retention Offer - 50% Off for 3 Months",
    });

    await stripe.subscriptions.update(existingSubscription.stripeSubscriptionId, {
      discounts: [{ coupon: coupon.id }],
    });

    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 3);

    await db.insert(retentionOffers).values({
      userId: user.id,
      stripeSubscriptionId: existingSubscription.stripeSubscriptionId,
      stripeCouponId: coupon.id,
      discountPercent: 50,
      durationMonths: 3,
      status: "applied",
      expiresAt,
    });

    logger.info("Retention offer applied", {
      userId: user.id,
      couponId: coupon.id,
    });

    res.json(successResponse({
      applied: true,
      discountPercent: 50,
      durationMonths: 3,
    }));
  } catch (error) {
    next(error);
  }
});

router.post("/sync-revenuecat", validateBody(syncRevenuecatSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      throw AppError.unauthorized("Authentication required", "AUTHENTICATION_REQUIRED");
    }

    const { tier, status, expirationDate } = req.body;
    const now = new Date();

    const updateData: Record<string, unknown> = {
      subscriptionTier: tier,
      subscriptionStatus: status,
      updatedAt: now,
    };

    await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, user.id));

    await db
      .update(subscriptions)
      .set({
        status,
        ...(expirationDate ? { currentPeriodEnd: new Date(expirationDate) } : {}),
        updatedAt: now,
      })
      .where(eq(subscriptions.userId, user.id));

    await invalidateSubscriptionCache(user.id);

    logger.info("RevenueCat purchase synced", { userId: user.id, tier, status });

    res.json(successResponse({ tier, status }));
  } catch (error) {
    next(error);
  }
});

export default router;
