import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { db } from "../../db";
import { users, subscriptions, conversionEvents, winbackCampaigns } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { getUncachableStripeClient, getStripePublishableKey } from "../stripeClient";
import { SubscriptionTier } from "@shared/subscription";
import { AppError } from "../../middleware/errorHandler";
import { validateBody } from "../../middleware/validateBody";
import { successResponse } from "../../lib/apiResponse";
import { logger } from "../../lib/logger";
import { invalidateSubscriptionCache } from "../../lib/subscription-cache";
import {
  isNativeMobileApp,
  PriceInfo,
  TieredPrices,
  pricesCache,
  PRICES_CACHE_TTL_MS,
  getAuthenticatedUser,
} from "./shared";

const router = Router();

const createCheckoutSchema = z.object({
  priceId: z.string().min(1, "priceId is required"),
  successUrl: z.string().optional(),
  cancelUrl: z.string().optional(),
  offer: z.string().optional(),
});

const createUpgradeSchema = z.object({
  billingPeriod: z.enum(["monthly", "annual"]).optional().default("monthly"),
  priceId: z.string().optional(),
  successUrl: z.string().optional(),
  cancelUrl: z.string().optional(),
  offer: z.string().optional(),
});

const previewProrationSchema = z.object({
  newPriceId: z.string().min(1, "newPriceId is required"),
});

router.get("/prices", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    if (pricesCache.data && Date.now() - pricesCache.timestamp < PRICES_CACHE_TTL_MS) {
      return res.json(successResponse(pricesCache.data));
    }

    const stripe = await getUncachableStripeClient();

    const prices = await stripe.prices.list({
      active: true,
      type: "recurring",
      expand: ["data.product"],
    });

    logger.info("Found active recurring prices", { count: prices.data.length });
    for (const p of prices.data) {
      logger.info("Stripe price details", { priceId: p.id, interval: p.recurring?.interval, intervalCount: p.recurring?.interval_count, amount: p.unit_amount });
    }

    const result: TieredPrices = {
      proMonthly: null,
      proAnnual: null,
      monthly: null,
      annual: null,
    };

    for (const price of prices.data) {
      const product = price.product as { name?: string; metadata?: Record<string, string> } | null;
      const productName = typeof product === "object" && product?.name ? product.name : "Subscription";

      const priceInfo: PriceInfo = {
        id: price.id,
        amount: price.unit_amount || 0,
        currency: price.currency,
        interval: price.recurring?.interval || "month",
        intervalCount: price.recurring?.interval_count || 1,
        trialDays: price.recurring?.trial_period_days || 7,
        productName,
      };

      const isMonthly = price.recurring?.interval === "month" && price.recurring.interval_count === 1;
      const isAnnual = price.recurring?.interval === "year" && price.recurring.interval_count === 1;

      if (isMonthly) {
        result.proMonthly = priceInfo;
        if (!result.monthly || priceInfo.amount > 0) {
          result.monthly = priceInfo;
        }
      } else if (isAnnual) {
        result.proAnnual = priceInfo;
        if (!result.annual || priceInfo.amount > 0) {
          result.annual = priceInfo;
        }
      }
    }

    if (result.proMonthly || result.monthly || result.annual) {
      pricesCache.data = result;
      pricesCache.timestamp = Date.now();
    }

    res.json(successResponse(result));
  } catch (error) {
    next(error);
  }
});

router.post("/create-checkout-session", validateBody(createCheckoutSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (isNativeMobileApp(req)) {
      throw AppError.badRequest(
        "Stripe checkout is not available on mobile apps. Please use in-app purchases.",
        "PLATFORM_NOT_SUPPORTED"
      );
    }

    const user = await getAuthenticatedUser(req);
    if (!user) {
      throw AppError.unauthorized("Authentication required", "AUTHENTICATION_REQUIRED");
    }

    const { priceId, successUrl, cancelUrl } = req.body;

    const stripe = await getUncachableStripeClient();

    const [existingSubscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, user.id))
      .limit(1);

    let stripeCustomerId = existingSubscription?.stripeCustomerId;

    if (!stripeCustomerId) {
      const existingCustomers = await stripe.customers.list({
        email: user.email,
        limit: 1,
      });

      if (existingCustomers.data.length > 0) {
        stripeCustomerId = existingCustomers.data[0].id;
      } else {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: {
            userId: user.id,
          },
        });
        stripeCustomerId = customer.id;
      }
    }

    const { offer } = req.body;
    let winbackPromoCode: string | null = null;

    if (offer === "winback") {
      const [campaign] = await db
        .select()
        .from(winbackCampaigns)
        .where(
          and(
            eq(winbackCampaigns.userId, user.id),
            eq(winbackCampaigns.status, "sent")
          )
        )
        .limit(1);

      if (campaign?.stripePromotionCodeId) {
        winbackPromoCode = campaign.stripePromotionCodeId;
      }
    }

    const baseUrl = process.env.REPLIT_DOMAINS?.split(",")[0]
      ? `https://${process.env.REPLIT_DOMAINS?.split(",")[0]}`
      : "http://localhost:5000";

    const sessionParams: any = {
      mode: "subscription" as const,
      customer: stripeCustomerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: 7,
        proration_behavior: "create_prorations" as const,
        metadata: {
          userId: user.id,
        },
      },
      success_url: successUrl || `${baseUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${baseUrl}/subscription/cancel`,
      metadata: {
        userId: user.id,
        type: "subscription",
      },
    };

    if (winbackPromoCode) {
      sessionParams.discounts = [{ promotion_code: winbackPromoCode }];
    } else {
      sessionParams.allow_promotion_codes = true;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    if (winbackPromoCode) {
      await db
        .update(winbackCampaigns)
        .set({ status: "accepted", acceptedAt: new Date() })
        .where(
          and(
            eq(winbackCampaigns.userId, user.id),
            eq(winbackCampaigns.status, "sent")
          )
        );
    }

    res.json(successResponse({
      sessionId: session.id,
      url: session.url,
    }));
  } catch (error) {
    next(error);
  }
});

router.post("/create-portal-session", async (req: Request, res: Response, next: NextFunction) => {
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

    if (!existingSubscription?.stripeCustomerId) {
      throw AppError.badRequest("No subscription found for this user", "NO_SUBSCRIPTION");
    }

    const stripe = await getUncachableStripeClient();

    const baseUrl = process.env.REPLIT_DOMAINS?.split(",")[0]
      ? `https://${process.env.REPLIT_DOMAINS?.split(",")[0]}`
      : "http://localhost:5000";

    const session = await stripe.billingPortal.sessions.create({
      customer: existingSubscription.stripeCustomerId,
      return_url: req.body.returnUrl || `${baseUrl}/settings`,
    });

    res.json(successResponse({ url: session.url }));
  } catch (error) {
    next(error);
  }
});

router.get("/publishable-key", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const publishableKey = await getStripePublishableKey();
    res.json(successResponse({ publishableKey }));
  } catch (error) {
    next(error);
  }
});

router.get("/session/:sessionId", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      throw AppError.badRequest("Session ID is required", "MISSING_SESSION_ID");
    }

    const stripe = await getUncachableStripeClient();

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    });

    if (!session) {
      throw AppError.notFound("Session not found", "SESSION_NOT_FOUND");
    }

    const subscription = session.subscription as {
      id?: string;
      trial_end?: number | null;
      current_period_end?: number | null;
      items?: { data?: Array<{ price?: { recurring?: { interval?: string } } }> };
    } | null;

    res.json(successResponse({
      customerEmail: session.customer_email || session.customer_details?.email || null,
      subscriptionId: typeof session.subscription === "string" ? session.subscription : subscription?.id || null,
      planType: subscription?.items?.data?.[0]?.price?.recurring?.interval === "year" ? "annual" : "monthly",
      trialEnd: subscription?.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
      amount: session.amount_total,
      currency: session.currency,
    }));
  } catch (error) {
    next(error);
  }
});

router.post("/upgrade", validateBody(createUpgradeSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (isNativeMobileApp(req)) {
      throw AppError.badRequest(
        "Stripe upgrades are not available on mobile apps. Please use in-app purchases.",
        "PLATFORM_NOT_SUPPORTED"
      );
    }

    const user = await getAuthenticatedUser(req);
    if (!user) {
      throw AppError.unauthorized("Authentication required", "AUTHENTICATION_REQUIRED");
    }

    const { billingPeriod, priceId: requestedPriceId, successUrl, cancelUrl } = req.body;

    const stripe = await getUncachableStripeClient();

    const [existingSubscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, user.id))
      .limit(1);

    let stripeCustomerId = existingSubscription?.stripeCustomerId;

    if (!stripeCustomerId) {
      const existingCustomers = await stripe.customers.list({
        email: user.email,
        limit: 1,
      });

      if (existingCustomers.data.length > 0) {
        stripeCustomerId = existingCustomers.data[0].id;
      } else {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: {
            userId: user.id,
          },
        });
        stripeCustomerId = customer.id;
      }
    }

    const prices = await stripe.prices.list({
      active: true,
      type: "recurring",
      expand: ["data.product"],
    });

    let priceId: string | null = null;

    if (requestedPriceId) {
      const isValidPrice = prices.data.some((p) => p.id === requestedPriceId && p.active);
      if (!isValidPrice) {
        throw AppError.badRequest("Invalid price ID", "INVALID_PRICE_ID");
      }
      priceId = requestedPriceId;
    }

    if (!priceId) {
      for (const price of prices.data) {
        if (billingPeriod === "annual" && price.recurring?.interval === "year") {
          priceId = price.id;
          break;
        } else if (billingPeriod === "monthly" && price.recurring?.interval === "month") {
          priceId = price.id;
          break;
        }
      }
    }

    if (!priceId) {
      throw AppError.badRequest("No suitable price found for subscription", "NO_PRICE_FOUND");
    }

    const { offer: upgradeOffer } = req.body;
    let upgradeWinbackPromoCode: string | null = null;

    if (upgradeOffer === "winback") {
      const [campaign] = await db
        .select()
        .from(winbackCampaigns)
        .where(
          and(
            eq(winbackCampaigns.userId, user.id),
            eq(winbackCampaigns.status, "sent")
          )
        )
        .limit(1);

      if (campaign?.stripePromotionCodeId) {
        upgradeWinbackPromoCode = campaign.stripePromotionCodeId;
      }
    }

    const hasActiveStripeSubscription =
      existingSubscription?.stripeSubscriptionId &&
      existingSubscription.status === "active";

    if (hasActiveStripeSubscription) {
      const stripeSubscription = await stripe.subscriptions.retrieve(existingSubscription.stripeSubscriptionId!);
      const existingItemId = stripeSubscription.items.data[0]?.id;

      if (!existingItemId) {
        throw AppError.badRequest("Could not find existing subscription item", "NO_SUBSCRIPTION_ITEM");
      }

      const updatedSubscription = await stripe.subscriptions.update(existingSubscription.stripeSubscriptionId!, {
        items: [{ id: existingItemId, price: priceId }],
        proration_behavior: "create_prorations",
      });

      const newPrice = updatedSubscription.items.data[0]?.price;
      const newTier = "STANDARD";
      const newPlanType = newPrice?.recurring?.interval === "year" ? "annual" : "monthly";

      await db
        .update(subscriptions)
        .set({
          stripePriceId: priceId,
          planType: newPlanType,
          status: updatedSubscription.status === "active" ? "active" : existingSubscription.status,
          currentPeriodStart: new Date(updatedSubscription.items.data[0].current_period_start * 1000),
          currentPeriodEnd: new Date(updatedSubscription.items.data[0].current_period_end * 1000),
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.userId, user.id));

      const [currentUser] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
      const previousTier = currentUser?.subscriptionTier || SubscriptionTier.STANDARD;

      await db
        .update(users)
        .set({
          subscriptionTier: newTier,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));

      if (previousTier !== newTier) {
        await db.insert(conversionEvents).values({
          userId: user.id,
          fromTier: previousTier,
          toTier: newTier,
          source: "upgrade_proration",
          stripeSessionId: `upgrade_inplace_${existingSubscription.stripeSubscriptionId}_${Date.now()}`,
        }).onConflictDoNothing({ target: conversionEvents.stripeSessionId });
      }

      await invalidateSubscriptionCache(user.id);

      logger.info("Subscription upgraded in-place", {
        userId: user.id,
        previousTier,
        newTier,
        newPlanType,
        subscriptionId: existingSubscription.stripeSubscriptionId,
      });

      return res.json(successResponse({
        upgraded: true,
        tier: newTier,
        planType: newPlanType,
        status: updatedSubscription.status,
      }));
    }

    const baseUrl = process.env.REPLIT_DOMAINS?.split(",")[0]
      ? `https://${process.env.REPLIT_DOMAINS?.split(",")[0]}`
      : "http://localhost:5000";

    const upgradeSessionParams: any = {
      mode: "subscription" as const,
      customer: stripeCustomerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      subscription_data: {
        proration_behavior: "create_prorations" as const,
        metadata: {
          userId: user.id,
          tier: SubscriptionTier.STANDARD,
        },
      },
      success_url: successUrl || `${baseUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${baseUrl}/subscription/cancel`,
      metadata: {
        userId: user.id,
        type: "upgrade",
        tier: SubscriptionTier.STANDARD,
      },
    };

    if (upgradeWinbackPromoCode) {
      upgradeSessionParams.discounts = [{ promotion_code: upgradeWinbackPromoCode }];
    } else {
      upgradeSessionParams.allow_promotion_codes = true;
    }

    const session = await stripe.checkout.sessions.create(upgradeSessionParams);

    if (upgradeWinbackPromoCode) {
      await db
        .update(winbackCampaigns)
        .set({ status: "accepted", acceptedAt: new Date() })
        .where(
          and(
            eq(winbackCampaigns.userId, user.id),
            eq(winbackCampaigns.status, "sent")
          )
        );
    }

    res.json(successResponse({
      sessionId: session.id,
      url: session.url,
    }));
  } catch (error) {
    next(error);
  }
});

router.post("/preview-proration", validateBody(previewProrationSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (isNativeMobileApp(req)) {
      throw AppError.badRequest(
        "Stripe proration preview is not available on mobile apps. Please use in-app purchases.",
        "PLATFORM_NOT_SUPPORTED"
      );
    }

    const user = await getAuthenticatedUser(req);
    if (!user) {
      throw AppError.unauthorized("Authentication required", "AUTHENTICATION_REQUIRED");
    }

    const { newPriceId } = req.body;

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

    const allowedPrices = await stripe.prices.list({ active: true, type: "recurring" });
    const isAllowedPrice = allowedPrices.data.some((p) => p.id === newPriceId);
    if (!isAllowedPrice) {
      throw AppError.badRequest("Invalid price ID", "INVALID_PRICE_ID");
    }

    let stripeCustomerId = existingSubscription.stripeCustomerId;
    if (!stripeCustomerId) {
      const existingCustomers = await stripe.customers.list({ email: user.email, limit: 1 });
      if (existingCustomers.data.length > 0) {
        stripeCustomerId = existingCustomers.data[0].id;
      } else {
        throw AppError.badRequest("No Stripe customer found for this account", "NO_STRIPE_CUSTOMER");
      }
    }

    const stripeSubscription = await stripe.subscriptions.retrieve(existingSubscription.stripeSubscriptionId);
    const existingItemId = stripeSubscription.items.data[0]?.id;

    if (!existingItemId) {
      throw AppError.badRequest("Could not find existing subscription item", "NO_SUBSCRIPTION_ITEM");
    }

    const previewInvoice = await stripe.invoices.createPreview({
      customer: stripeCustomerId,
      subscription: existingSubscription.stripeSubscriptionId,
      subscription_details: {
        items: [{ id: existingItemId, price: newPriceId }],
        proration_behavior: "create_prorations",
      },
    });

    const prorationLines = (previewInvoice.lines?.data || []).filter(
      (line: any) => line.proration
    );
    const creditAmount = prorationLines
      .filter((line: any) => line.amount < 0)
      .reduce((sum: number, line: any) => sum + Math.abs(line.amount), 0);
    const proratedAmount = prorationLines
      .filter((line: any) => line.amount > 0)
      .reduce((sum: number, line: any) => sum + line.amount, 0);

    const immediatePayment = Math.max(0, (previewInvoice.amount_due || 0));
    const newAmount = previewInvoice.total || 0;

    logger.info("Proration preview generated", {
      userId: user.id,
      newPriceId,
      proratedAmount,
      creditAmount,
      newAmount,
      immediatePayment,
    });

    res.json(successResponse({
      proratedAmount,
      creditAmount,
      newAmount,
      currency: previewInvoice.currency || "usd",
      immediatePayment,
    }));
  } catch (error) {
    next(error);
  }
});

export default router;
