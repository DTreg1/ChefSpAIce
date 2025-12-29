import { Router, Request, Response } from "express";
import { db } from "../db";
import { users, userSessions, subscriptions } from "@shared/schema";
import { eq } from "drizzle-orm";
import { getUncachableStripeClient, getStripePublishableKey } from "./stripeClient";

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

    pricesCache.data = result;
    pricesCache.timestamp = Date.now();

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

export default router;
