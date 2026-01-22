import { Router, Request, Response } from "express";
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

  const token = authHeader.substring(7);

  const [session] = await db
    .select()
    .from(userSessions)
    .where(eq(userSessions.token, token))
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

router.get("/prices", async (_req: Request, res: Response) => {
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

    console.log(`[Stripe Prices] Found ${prices.data.length} active recurring prices`);
    for (const p of prices.data) {
      console.log(`[Stripe Price] id=${p.id}, interval=${p.recurring?.interval}, interval_count=${p.recurring?.interval_count}, amount=${p.unit_amount}`);
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

    // Only cache if we have at least one valid price
    if (monthlyPrice || annualPrice) {
      pricesCache.data = result;
      pricesCache.timestamp = Date.now();
    }

    res.json(result);
  } catch (error) {
    console.error("Error fetching subscription prices:", error);
    res.status(500).json({ error: "Failed to fetch subscription prices" });
  }
});

router.post("/create-checkout-session", async (req: Request, res: Response) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { priceId, successUrl, cancelUrl } = req.body;

    if (!priceId) {
      return res.status(400).json({ error: "priceId is required" });
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
    console.error("Error creating checkout session:", error);
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

router.post("/create-portal-session", async (req: Request, res: Response) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const [existingSubscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, user.id))
      .limit(1);

    if (!existingSubscription?.stripeCustomerId) {
      return res.status(400).json({ error: "No subscription found for this user" });
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
    console.error("Error creating portal session:", error);
    res.status(500).json({ error: "Failed to create billing portal session" });
  }
});

router.get("/status", async (req: Request, res: Response) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
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
    console.error("Error fetching subscription status:", error);
    res.status(500).json({ error: "Failed to fetch subscription status" });
  }
});

router.get("/publishable-key", async (_req: Request, res: Response) => {
  try {
    const publishableKey = await getStripePublishableKey();
    res.json({ publishableKey });
  } catch (error) {
    console.error("Error fetching publishable key:", error);
    res.status(500).json({ error: "Failed to get Stripe publishable key" });
  }
});

router.get("/session/:sessionId", async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({ error: "Session ID is required" });
    }

    const stripe = await getUncachableStripeClient();

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    });

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
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
    console.error("Error fetching session details:", error);
    res.status(500).json({ error: "Failed to fetch session details" });
  }
});

router.post("/sync-revenuecat", async (req: Request, res: Response) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { tier, status, expirationDate } = req.body;

    if (!tier || !status) {
      return res.status(400).json({ error: "tier and status are required" });
    }

    const validTiers = ['BASIC', 'PRO'];
    const validStatuses = ['active', 'trialing', 'canceled', 'expired', 'past_due'];

    if (!validTiers.includes(tier)) {
      return res.status(400).json({ error: "Invalid tier. Must be BASIC or PRO" });
    }

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
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

    console.log(`[Sync RevenueCat] Updated user ${user.id}: tier=${tier}, status=${status}`);

    res.json({ 
      success: true,
      tier,
      status,
    });
  } catch (error) {
    console.error("Error syncing RevenueCat purchase:", error);
    res.status(500).json({ error: "Failed to sync purchase" });
  }
});

router.get("/me", async (req: Request, res: Response) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const entitlements = await getUserEntitlements(user.id);

    // Get subscription for additional fields
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
    console.error("Error fetching subscription entitlements:", error);
    res.status(500).json({ error: "Failed to fetch subscription info" });
  }
});

router.get("/check-limit/:limitType", async (req: Request, res: Response) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
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
        return res.status(400).json({ error: "Invalid limit type. Use: pantryItems, aiRecipes, or cookware" });
    }

    res.json(result);
  } catch (error) {
    console.error("Error checking limit:", error);
    res.status(500).json({ error: "Failed to check limit" });
  }
});

router.get("/check-feature/:feature", async (req: Request, res: Response) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
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
      return res.status(400).json({
        error: `Invalid feature. Use: ${validFeatures.join(", ")}`,
      });
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
    console.error("Error checking feature access:", error);
    res.status(500).json({ error: "Failed to check feature access" });
  }
});

router.post("/upgrade", async (req: Request, res: Response) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
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
      return res.status(400).json({ error: "No suitable price found for Pro upgrade" });
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
    console.error("Error creating upgrade checkout session:", error);
    res.status(500).json({ error: "Failed to create upgrade session" });
  }
});

export default router;
