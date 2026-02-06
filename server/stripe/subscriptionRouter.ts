import { Router, Request, Response, NextFunction } from "express";
import { createHash } from "crypto";
import { db } from "../db";
import { users, userSessions, subscriptions } from "@shared/schema";
import { eq } from "drizzle-orm";
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
import { logger } from "../lib/logger";

const router = Router();

interface PriceInfo {
  id: string;
  amount: number;
  currency: string;
  interval: string;
  intervalCount: number;
  trialDays: number;
  productName: string;
}

interface PricesCache {
  data: { monthly: PriceInfo | null; annual: PriceInfo | null } | null;
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
  const hashedToken = createHash("sha256").update(rawToken).digest("hex");

  const [session] = await db
    .select()
    .from(userSessions)
    .where(eq(userSessions.token, hashedToken))
    .limit(1);

  if (!session || new Date(session.expiresAt) < new Date()) {
    return null;
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  return user ? { id: user.id, email: user.email } : null;
}

router.get("/prices", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    if (pricesCache.data && Date.now() - pricesCache.timestamp < PRICES_CACHE_TTL_MS) {
      return res.json(pricesCache.data);
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

    let monthlyPrice: PriceInfo | null = null;
    let annualPrice: PriceInfo | null = null;

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

      if (price.recurring?.interval === "month" && price.recurring.interval_count === 1) {
        if (!monthlyPrice || priceInfo.amount > 0) {
          monthlyPrice = priceInfo;
        }
      } else if (price.recurring?.interval === "year" && price.recurring.interval_count === 1) {
        if (!annualPrice || priceInfo.amount > 0) {
          annualPrice = priceInfo;
        }
      }
    }

    const result = { monthly: monthlyPrice, annual: annualPrice };

    if (monthlyPrice || annualPrice) {
      pricesCache.data = result;
      pricesCache.timestamp = Date.now();
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post("/create-checkout-session", async (req: Request, res: Response, next: NextFunction) => {
  try {
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

    res.json({
      sessionId: session.id,
      url: session.url,
    });
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

    res.json({ url: session.url });
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
      return res.json({
        status: "none",
        planType: null,
        currentPeriodEnd: null,
        trialEnd: null,
        cancelAtPeriodEnd: false,
      });
    }

    res.json({
      status: subscription.status,
      planType: subscription.planType,
      currentPeriodStart: subscription.currentPeriodStart?.toISOString() || null,
      currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() || null,
      trialStart: subscription.trialStart?.toISOString() || null,
      trialEnd: subscription.trialEnd?.toISOString() || null,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      canceledAt: subscription.canceledAt?.toISOString() || null,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/publishable-key", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const publishableKey = await getStripePublishableKey();
    res.json({ publishableKey });
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

    res.json({
      customerEmail: session.customer_email || session.customer_details?.email || null,
      subscriptionId: typeof session.subscription === "string" ? session.subscription : subscription?.id || null,
      planType: subscription?.items?.data?.[0]?.price?.recurring?.interval === "year" ? "annual" : "monthly",
      trialEnd: subscription?.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
      amount: session.amount_total,
      currency: session.currency,
    });
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

    const validTiers = ['BASIC', 'PRO'];
    const validStatuses = ['active', 'trialing', 'canceled', 'expired', 'past_due'];

    if (!validTiers.includes(tier)) {
      throw AppError.badRequest("Invalid tier. Must be BASIC or PRO", "INVALID_TIER");
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

    res.json({ 
      success: true,
      tier,
      status,
    });
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

    res.json({
      tier: entitlements.tier,
      status: entitlements.status,
      planType: subscription?.planType || null,
      entitlements: entitlements.limits,
      usage: entitlements.usage,
      remaining: entitlements.remaining,
      trialEndsAt: entitlements.trialEndsAt?.toISOString() || null,
      currentPeriodEnd: subscription?.currentPeriodEnd?.toISOString() || null,
      cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd || false,
    });
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

    res.json(result);
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

    res.json({
      allowed,
      upgradeRequired: !allowed,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/upgrade", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      throw AppError.unauthorized("Authentication required", "AUTHENTICATION_REQUIRED");
    }

    const { billingPeriod = "monthly", successUrl, cancelUrl } = req.body;

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
    for (const price of prices.data) {
      const product = price.product as { name?: string } | null;
      const productName = (typeof product === "object" && product?.name) || "";

      if (productName.toLowerCase().includes("pro")) {
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
      throw AppError.badRequest("No suitable price found for Pro upgrade", "NO_PRICE_FOUND");
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

    res.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
