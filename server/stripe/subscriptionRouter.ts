import { Router, Request, Response, NextFunction } from "express";
import { db } from "../db";
import { users, subscriptions, cancellationReasons, conversionEvents } from "@shared/schema";
import { eq } from "drizzle-orm";
import { getUserByToken } from "../lib/auth-utils";
import { getUncachableStripeClient, getStripePublishableKey } from "./stripeClient";
import {
  getUserEntitlements,
  checkPantryItemLimit,
  checkAiRecipeLimit,
  checkCookwareLimit,
  checkFeatureAccess,
} from "../services/subscriptionService";
import { SubscriptionTier } from "@shared/subscription";
import { AppError } from "../middleware/errorHandler";
import { successResponse } from "../lib/apiResponse";
import { logger } from "../lib/logger";

const router = Router();

function isNativeMobileApp(req: Request): boolean {
  const clientPlatform = (req.headers["x-platform"] as string || "").toLowerCase();
  if (clientPlatform === "ios" || clientPlatform === "android") {
    return true;
  }
  if (/chefsp[a]ice\/(ios|android)/i.test(req.headers["user-agent"] || "")) {
    return true;
  }
  return false;
}

interface PriceInfo {
  id: string;
  amount: number;
  currency: string;
  interval: string;
  intervalCount: number;
  trialDays: number;
  productName: string;
}

interface TieredPrices {
  proMonthly: PriceInfo | null;
  proAnnual: PriceInfo | null;
  monthly: PriceInfo | null;
  annual: PriceInfo | null;
}

interface PricesCache {
  data: TieredPrices | null;
  timestamp: number;
}

const pricesCache: PricesCache = {
  data: null,
  timestamp: 0,
};

const PRICES_CACHE_TTL_MS = 60 * 60 * 1000;

async function getAuthenticatedUser(req: Request): Promise<{ id: string; email: string } | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const rawToken = authHeader.substring(7);
  const user = await getUserByToken(rawToken);
  return user ? { id: user.id, email: user.email } : null;
}

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

router.post("/create-checkout-session", async (req: Request, res: Response, next: NextFunction) => {
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

    if (!priceId) {
      throw AppError.badRequest("priceId is required", "MISSING_PRICE_ID");
    }

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

    const baseUrl = process.env.REPLIT_DOMAINS?.split(",")[0]
      ? `https://${process.env.REPLIT_DOMAINS?.split(",")[0]}`
      : "http://localhost:5000";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: 7,
        proration_behavior: "create_prorations",
        metadata: {
          userId: user.id,
        },
      },
      allow_promotion_codes: true,
      success_url: successUrl || `${baseUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${baseUrl}/subscription/cancel`,
      metadata: {
        userId: user.id,
        type: "subscription",
      },
    });

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

router.get("/status", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      throw AppError.unauthorized("Authentication required", "AUTHENTICATION_REQUIRED");
    }

    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, user.id))
      .limit(1);

    if (!subscription) {
      return res.json(successResponse({
        status: "none",
        planType: null,
        currentPeriodEnd: null,
        trialEnd: null,
        cancelAtPeriodEnd: false,
      }));
    }

    res.json(successResponse({
      status: subscription.status,
      planType: subscription.planType,
      currentPeriodStart: subscription.currentPeriodStart?.toISOString() || null,
      currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() || null,
      trialStart: subscription.trialStart?.toISOString() || null,
      trialEnd: subscription.trialEnd?.toISOString() || null,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      canceledAt: subscription.canceledAt?.toISOString() || null,
    }));
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

router.post("/sync-revenuecat", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      throw AppError.unauthorized("Authentication required", "AUTHENTICATION_REQUIRED");
    }

    const { tier, status, expirationDate } = req.body;

    if (!tier || !status) {
      throw AppError.badRequest("tier and status are required", "MISSING_REQUIRED_FIELDS");
    }

    const validTiers = ['TRIAL', 'PRO'];
    const validStatuses = ['active', 'trialing', 'canceled', 'expired', 'past_due'];

    if (!validTiers.includes(tier)) {
      throw AppError.badRequest("Invalid tier. Must be TRIAL or PRO", "INVALID_TIER");
    }

    if (!validStatuses.includes(status)) {
      throw AppError.badRequest("Invalid status", "INVALID_STATUS");
    }

    const updateData: Record<string, unknown> = {
      subscriptionTier: tier,
      subscriptionStatus: status,
      updatedAt: new Date(),
    };

    if (expirationDate) {
      updateData.trialEndsAt = new Date(expirationDate);
    }

    await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, user.id));

    logger.info("RevenueCat purchase synced", { userId: user.id, tier, status });

    res.json(successResponse({ tier, status }));
  } catch (error) {
    next(error);
  }
});

router.get("/me", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      throw AppError.unauthorized("Authentication required", "AUTHENTICATION_REQUIRED");
    }

    const entitlements = await getUserEntitlements(user.id);

    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, user.id))
      .limit(1);

    let gracePeriodInfo: {
      paymentFailedAt: string | null;
      gracePeriodEnd: string | null;
      graceDaysRemaining: number | null;
    } = { paymentFailedAt: null, gracePeriodEnd: null, graceDaysRemaining: null };

    if (subscription?.status === "past_due") {
      const paymentFailedAt = subscription.paymentFailedAt || subscription.updatedAt || new Date();
      const gracePeriodEnd = new Date(paymentFailedAt);
      gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 7);
      const now = new Date();
      const msRemaining = gracePeriodEnd.getTime() - now.getTime();
      const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));

      gracePeriodInfo = {
        paymentFailedAt: paymentFailedAt.toISOString(),
        gracePeriodEnd: gracePeriodEnd.toISOString(),
        graceDaysRemaining: daysRemaining,
      };
    }

    res.json(successResponse({
      tier: entitlements.tier,
      status: entitlements.status,
      planType: subscription?.planType || null,
      entitlements: entitlements.limits,
      usage: entitlements.usage,
      remaining: entitlements.remaining,
      trialEndsAt: entitlements.trialEndsAt?.toISOString() || null,
      currentPeriodEnd: subscription?.currentPeriodEnd?.toISOString() || null,
      cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd || false,
      ...gracePeriodInfo,
    }));
  } catch (error) {
    next(error);
  }
});

router.get("/check-limit/:limitType", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      throw AppError.unauthorized("Authentication required", "AUTHENTICATION_REQUIRED");
    }

    const { limitType } = req.params;

    let result;
    switch (limitType) {
      case "pantryItems":
        result = await checkPantryItemLimit(user.id);
        break;
      case "aiRecipes":
        result = await checkAiRecipeLimit(user.id);
        break;
      case "cookware":
        result = await checkCookwareLimit(user.id);
        break;
      default:
        throw AppError.badRequest("Invalid limit type. Use: pantryItems, aiRecipes, or cookware", "INVALID_LIMIT_TYPE");
    }

    res.json(successResponse(result));
  } catch (error) {
    next(error);
  }
});

router.get("/check-feature/:feature", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      throw AppError.unauthorized("Authentication required", "AUTHENTICATION_REQUIRED");
    }

    const { feature } = req.params;
    const validFeatures = [
      "recipeScanning",
      "bulkScanning",
      "aiKitchenAssistant",
      "weeklyMealPrepping",
      "customStorageAreas",
    ];

    if (!validFeatures.includes(feature)) {
      throw AppError.badRequest(
        `Invalid feature. Use: ${validFeatures.join(", ")}`,
        "INVALID_FEATURE",
      );
    }

    const allowed = await checkFeatureAccess(
      user.id,
      feature as "recipeScanning" | "bulkScanning" | "aiKitchenAssistant" | "weeklyMealPrepping" | "customStorageAreas"
    );

    res.json(successResponse({
      allowed,
      upgradeRequired: !allowed,
    }));
  } catch (error) {
    next(error);
  }
});

router.post("/upgrade", async (req: Request, res: Response, next: NextFunction) => {
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

    const { billingPeriod = "monthly", priceId: requestedPriceId, successUrl, cancelUrl } = req.body;

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

    const hasActiveStripeSubscription =
      existingSubscription?.stripeSubscriptionId &&
      (existingSubscription.status === "active" || existingSubscription.status === "trialing");

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
      const newTier = "PRO";
      const newPlanType = newPrice?.recurring?.interval === "year" ? "annual" : "monthly";

      await db
        .update(subscriptions)
        .set({
          stripePriceId: priceId,
          planType: newPlanType,
          status: updatedSubscription.status === "active" ? "active" : updatedSubscription.status === "trialing" ? "trialing" : existingSubscription.status,
          currentPeriodStart: new Date(updatedSubscription.items.data[0].current_period_start * 1000),
          currentPeriodEnd: new Date(updatedSubscription.items.data[0].current_period_end * 1000),
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.userId, user.id));

      const [currentUser] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
      const previousTier = currentUser?.subscriptionTier || SubscriptionTier.TRIAL;

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

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      subscription_data: {
        proration_behavior: "create_prorations",
        metadata: {
          userId: user.id,
          tier: SubscriptionTier.PRO,
        },
      },
      allow_promotion_codes: true,
      success_url: successUrl || `${baseUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${baseUrl}/subscription/cancel`,
      metadata: {
        userId: user.id,
        type: "upgrade",
        tier: SubscriptionTier.PRO,
      },
    });

    res.json(successResponse({
      sessionId: session.id,
      url: session.url,
    }));
  } catch (error) {
    next(error);
  }
});

router.post("/preview-proration", async (req: Request, res: Response, next: NextFunction) => {
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

    if (!newPriceId) {
      throw AppError.badRequest("newPriceId is required", "MISSING_PRICE_ID");
    }

    const [existingSubscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, user.id))
      .limit(1);

    if (!existingSubscription || !existingSubscription.stripeSubscriptionId) {
      throw AppError.badRequest("No active subscription found", "NO_ACTIVE_SUBSCRIPTION");
    }

    if (existingSubscription.status !== "active" && existingSubscription.status !== "trialing") {
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

router.post("/cancel", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      throw AppError.unauthorized("Authentication required", "AUTHENTICATION_REQUIRED");
    }

    const { reason, details, offerShown, offerAccepted } = req.body;

    if (!reason) {
      throw AppError.badRequest("Cancellation reason is required", "MISSING_REASON");
    }

    const allowedReasons = ["too_expensive", "not_using", "missing_features", "other"];
    if (!allowedReasons.includes(reason)) {
      throw AppError.badRequest("Invalid cancellation reason", "INVALID_REASON");
    }

    const [existingSubscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, user.id))
      .limit(1);

    if (!existingSubscription || !existingSubscription.stripeSubscriptionId) {
      throw AppError.badRequest("No active subscription found", "NO_ACTIVE_SUBSCRIPTION");
    }

    if (existingSubscription.status !== "active" && existingSubscription.status !== "trialing") {
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
    const currentTier = currentUser?.subscriptionTier || SubscriptionTier.TRIAL;

    await db.insert(conversionEvents).values({
      userId: user.id,
      fromTier: currentTier,
      toTier: SubscriptionTier.TRIAL,
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

router.post("/pause", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      throw AppError.unauthorized("Authentication required", "AUTHENTICATION_REQUIRED");
    }

    const { durationMonths = 1 } = req.body;

    if (![1, 2, 3].includes(durationMonths)) {
      throw AppError.badRequest("Duration must be 1, 2, or 3 months", "INVALID_DURATION");
    }

    const [existingSubscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, user.id))
      .limit(1);

    if (!existingSubscription || !existingSubscription.stripeSubscriptionId) {
      throw AppError.badRequest("No active subscription found", "NO_ACTIVE_SUBSCRIPTION");
    }

    if (existingSubscription.status !== "active" && existingSubscription.status !== "trialing") {
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

router.post("/log-cancellation-flow", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      throw AppError.unauthorized("Authentication required", "AUTHENTICATION_REQUIRED");
    }

    const { reason, details, offerShown, offerAccepted } = req.body;

    const allowedReasons = ["too_expensive", "not_using", "missing_features", "other"];
    if (reason && !allowedReasons.includes(reason)) {
      throw AppError.badRequest("Invalid cancellation reason", "INVALID_REASON");
    }

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

    if (existingSubscription.status !== "active" && existingSubscription.status !== "trialing") {
      throw AppError.badRequest("Subscription is not active", "SUBSCRIPTION_NOT_ACTIVE");
    }

    const stripe = await getUncachableStripeClient();

    const coupon = await stripe.coupons.create({
      percent_off: 50,
      duration: "repeating",
      duration_in_months: 3,
      name: "Retention Offer - 50% Off for 3 Months",
    });

    await stripe.subscriptions.update(existingSubscription.stripeSubscriptionId, {
      discounts: [{ coupon: coupon.id }],
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

export default router;
