import { getStripeSync, getUncachableStripeClient } from "./stripeClient";
import { db } from "../db";
import { subscriptions, users, conversionEvents, winbackCampaigns } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { getPlanTypeFromPriceId, getTierFromPriceId } from "./subscriptionConfig";
import Stripe from "stripe";
import { SubscriptionTier } from "@shared/subscription";
import { logger } from "../lib/logger";
import { queueNotification } from "../services/notificationService";
import { invalidateSubscriptionCache } from "../lib/subscription-cache";

export class WebhookHandlers {
  static async processWebhook(
    payload: Buffer,
    signature: string,
    uuid: string,
  ): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        "STRIPE WEBHOOK ERROR: Payload must be a Buffer. " +
          "Received type: " +
          typeof payload +
          ". " +
          "This usually means express.json() parsed the body before reaching this handler. " +
          "FIX: Ensure webhook route is registered BEFORE app.use(express.json()).",
      );
    }

    const sync = await getStripeSync();
    await sync.processWebhook(payload, signature, uuid);

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    let event: Stripe.Event;

    if (webhookSecret) {
      const stripe = await getUncachableStripeClient();
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
      logger.info("Webhook signature verified via constructEvent", { eventId: event.id, eventType: event.type });
    } else {
      event = JSON.parse(payload.toString()) as Stripe.Event;
      logger.warn(
        "STRIPE_WEBHOOK_SECRET not set: signature was verified by stripe-replit-sync managed webhook, " +
        "but explicit constructEvent verification is skipped. Set STRIPE_WEBHOOK_SECRET for full auditability.",
        { eventId: event.id, eventType: event.type },
      );
    }

    await processSubscriptionEvent(event);
  }
}

async function processSubscriptionEvent(event: Stripe.Event): Promise<void> {
  logger.info("Processing webhook event", { eventType: event.type });

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case "customer.subscription.created":
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case "invoice.paid":
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;
      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      default:
        break;
    }
  } catch (error) {
    logger.error("Error processing webhook event", { eventType: event.type, error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

async function findUserByStripeCustomerId(stripeCustomerId: string): Promise<string | null> {
  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.stripeCustomerId, stripeCustomerId))
    .limit(1);

  return subscription?.userId || null;
}

async function findUserIdFromCustomerMetadata(stripeCustomerId: string): Promise<string | null> {
  try {
    const stripe = await getUncachableStripeClient();
    const customer = await stripe.customers.retrieve(stripeCustomerId);
    if (customer.deleted) return null;
    return (customer as Stripe.Customer).metadata?.userId || null;
  } catch (error) {
    logger.error("Error fetching customer metadata", { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

async function updateUserSubscriptionTier(
  userId: string,
  tier: SubscriptionTier,
  status: string,
  stripeCustomerId?: string,
  stripeSubscriptionId?: string,
  trialEnd?: Date | null
): Promise<void> {
  const updateData: Record<string, unknown> = {
    subscriptionTier: tier,
    subscriptionStatus: status,
    updatedAt: new Date(),
  };

  if (stripeCustomerId) {
    updateData.stripeCustomerId = stripeCustomerId;
  }
  if (stripeSubscriptionId) {
    updateData.stripeSubscriptionId = stripeSubscriptionId;
  }
  await db
    .update(users)
    .set(updateData)
    .where(eq(users.id, userId));

  logger.info("Updated user subscription tier", { userId, tier, status });
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session): Promise<void> {
  logger.info("Processing checkout.session.completed", { sessionId: session.id });

  if (session.mode !== "subscription") {
    logger.info("Skipping non-subscription checkout session");
    return;
  }

  const stripeCustomerId = typeof session.customer === "string" 
    ? session.customer 
    : session.customer?.id;
  const stripeSubscriptionId = typeof session.subscription === "string"
    ? session.subscription
    : (session.subscription as any)?.id;

  if (!stripeCustomerId || !stripeSubscriptionId) {
    logger.error("Missing customer or subscription ID in checkout session");
    return;
  }

  const userId = session.metadata?.userId || await findUserIdFromCustomerMetadata(stripeCustomerId);

  if (!userId) {
    logger.error("Could not find userId for checkout session", { sessionId: session.id });
    return;
  }

  const stripe = await getUncachableStripeClient();
  const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId) as any;

  const priceId = subscription.items?.data?.[0]?.price?.id;
  let planType = getPlanTypeFromPriceId(priceId || "") || "monthly";
  
  let tier: SubscriptionTier = session.metadata?.tier as SubscriptionTier || SubscriptionTier.STANDARD;
  
  if (priceId) {
    const tierInfo = await getTierFromPriceId(priceId, stripe);
    if (tierInfo) {
      tier = tierInfo.tier;
      planType = tierInfo.planType;
    }
  }

  const now = new Date();
  const currentPeriodStart = new Date((subscription.current_period_start || subscription.start_date || Date.now() / 1000) * 1000);
  const currentPeriodEnd = new Date((subscription.current_period_end || (Date.now() / 1000 + 30 * 24 * 60 * 60)) * 1000);
  const trialStart = subscription.trial_start ? new Date(subscription.trial_start * 1000) : null;
  const trialEnd = subscription.trial_end ? new Date(subscription.trial_end * 1000) : null;

  await db
    .insert(subscriptions)
    .values({
      userId,
      stripeCustomerId,
      stripeSubscriptionId,
      stripePriceId: priceId || null,
      status: subscription.status,
      planType,
      currentPeriodStart,
      currentPeriodEnd,
      trialStart,
      trialEnd,
      cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
    })
    .onConflictDoUpdate({
      target: subscriptions.userId,
      set: {
        stripeCustomerId,
        stripeSubscriptionId,
        stripePriceId: priceId || null,
        status: subscription.status,
        planType,
        currentPeriodStart,
        currentPeriodEnd,
        trialStart,
        trialEnd,
        cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
        updatedAt: now,
      },
    });

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const previousTier = user?.subscriptionTier || SubscriptionTier.STANDARD;
  const selectedTier = tier;

  logger.info("Subscription conversion", {
    userId,
    previousTier,
    newTier: selectedTier,
    source: session.metadata?.source || "unknown",
  });

  if (previousTier !== selectedTier) {
    await db.insert(conversionEvents).values({
      userId,
      fromTier: previousTier,
      toTier: selectedTier,
      source: session.metadata?.source || "unknown",
      stripeSessionId: session.id,
    }).onConflictDoNothing({ target: conversionEvents.stripeSessionId });
  }

  await updateUserSubscriptionTier(userId, tier, "active", stripeCustomerId, stripeSubscriptionId, trialEnd);
  await invalidateSubscriptionCache(userId);

  logger.info("Subscription record created/updated", { userId, tier });
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription): Promise<void> {
  logger.info("Processing customer.subscription.created", { subscriptionId: subscription.id });

  const stripeCustomerId = typeof subscription.customer === "string"
    ? subscription.customer
    : (subscription.customer as any)?.id;

  if (!stripeCustomerId) {
    logger.error("Missing customer ID in subscription");
    return;
  }

  const userId = subscription.metadata?.userId || 
    await findUserByStripeCustomerId(stripeCustomerId) ||
    await findUserIdFromCustomerMetadata(stripeCustomerId);

  if (!userId) {
    logger.info("No userId found for subscription, will be linked via checkout.session.completed");
    return;
  }

  const sub = subscription as any;
  const priceId = sub.items?.data?.[0]?.price?.id;
  let planType = getPlanTypeFromPriceId(priceId || "") || "monthly";
  
  let tier: SubscriptionTier = subscription.metadata?.tier as SubscriptionTier || SubscriptionTier.STANDARD;
  
  if (priceId) {
    const stripe = await getUncachableStripeClient();
    const tierInfo = await getTierFromPriceId(priceId, stripe);
    if (tierInfo) {
      tier = tierInfo.tier;
      planType = tierInfo.planType;
    }
  }

  const now = new Date();
  const currentPeriodStart = new Date((sub.current_period_start || sub.start_date || Date.now() / 1000) * 1000);
  const currentPeriodEnd = new Date((sub.current_period_end || (Date.now() / 1000 + 30 * 24 * 60 * 60)) * 1000);
  const trialStart = sub.trial_start ? new Date(sub.trial_start * 1000) : null;
  const trialEnd = sub.trial_end ? new Date(sub.trial_end * 1000) : null;

  await db
    .insert(subscriptions)
    .values({
      userId,
      stripeCustomerId,
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId || null,
      status: subscription.status,
      planType,
      currentPeriodStart,
      currentPeriodEnd,
      trialStart,
      trialEnd,
      cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
    })
    .onConflictDoUpdate({
      target: subscriptions.userId,
      set: {
        stripeCustomerId,
        stripeSubscriptionId: subscription.id,
        stripePriceId: priceId || null,
        status: subscription.status,
        planType,
        currentPeriodStart,
        currentPeriodEnd,
        trialStart,
        trialEnd,
        cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
        updatedAt: now,
      },
    });

  await updateUserSubscriptionTier(userId, tier, "active", stripeCustomerId, subscription.id, trialEnd);
  await invalidateSubscriptionCache(userId);

  logger.info("Subscription created", { userId, tier });
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
  logger.info("Processing customer.subscription.updated", { subscriptionId: subscription.id });

  const stripeCustomerId = typeof subscription.customer === "string"
    ? subscription.customer
    : (subscription.customer as any)?.id;

  if (!stripeCustomerId) {
    logger.error("Missing customer ID in subscription update");
    return;
  }

  const userId = await findUserByStripeCustomerId(stripeCustomerId);

  if (!userId) {
    logger.info("No user found for subscription update", { subscriptionId: subscription.id });
    return;
  }

  const sub = subscription as any;
  const priceId = sub.items?.data?.[0]?.price?.id;
  let planType = getPlanTypeFromPriceId(priceId || "") || "monthly";
  
  let tier: SubscriptionTier = subscription.metadata?.tier as SubscriptionTier || SubscriptionTier.STANDARD;
  
  if (priceId) {
    const stripe = await getUncachableStripeClient();
    const tierInfo = await getTierFromPriceId(priceId, stripe);
    if (tierInfo) {
      tier = tierInfo.tier;
      planType = tierInfo.planType;
    }
  }

  const currentPeriodStart = new Date((sub.current_period_start || sub.start_date || Date.now() / 1000) * 1000);
  const currentPeriodEnd = new Date((sub.current_period_end || (Date.now() / 1000 + 30 * 24 * 60 * 60)) * 1000);
  const trialStart = sub.trial_start ? new Date(sub.trial_start * 1000) : null;
  const trialEnd = sub.trial_end ? new Date(sub.trial_end * 1000) : null;
  const canceledAt = sub.canceled_at ? new Date(sub.canceled_at * 1000) : null;

  await db
    .update(subscriptions)
    .set({
      stripePriceId: priceId || null,
      status: subscription.status,
      planType,
      currentPeriodStart,
      currentPeriodEnd,
      trialStart,
      trialEnd,
      cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
      canceledAt,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.stripeCustomerId, stripeCustomerId));

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const previousTier = user?.subscriptionTier || SubscriptionTier.STANDARD;
  const previousStatus = user?.subscriptionStatus || "none";

  if (previousTier !== tier) {
    logger.info("Subscription tier conversion via update", {
      userId,
      previousTier,
      newTier: tier,
      source: "subscription_update",
    });

    await db.insert(conversionEvents).values({
      userId,
      fromTier: previousTier,
      toTier: tier,
      source: "subscription_update",
      stripeSessionId: `sub_update_${subscription.id}_${Date.now()}`,
    }).onConflictDoNothing({ target: conversionEvents.stripeSessionId });
  }

  if ((previousStatus === "canceled" || previousStatus === "past_due") && subscription.status === "active") {
    await db.insert(conversionEvents).values({
      userId,
      fromTier: previousTier,
      toTier: tier,
      source: "reactivation",
      stripeSessionId: `sub_reactivate_${subscription.id}_${Date.now()}`,
    }).onConflictDoNothing({ target: conversionEvents.stripeSessionId });

    const [openCampaign] = await db
      .select({ id: winbackCampaigns.id })
      .from(winbackCampaigns)
      .where(
        and(
          eq(winbackCampaigns.userId, userId),
          eq(winbackCampaigns.status, "sent")
        )
      )
      .orderBy(desc(winbackCampaigns.sentAt))
      .limit(1);

    if (openCampaign) {
      await db
        .update(winbackCampaigns)
        .set({ status: "accepted", acceptedAt: new Date() })
        .where(eq(winbackCampaigns.id, openCampaign.id));
      logger.info("Winback campaign accepted", { userId, campaignId: openCampaign.id });
    }

    logger.info("Subscription reactivated", { userId, fromTier: previousTier, toTier: tier });
  }

  const statusStr = subscription.status === "active" ? "active" : subscription.status;
  await updateUserSubscriptionTier(userId, tier, statusStr, stripeCustomerId, undefined, trialEnd);
  await invalidateSubscriptionCache(userId);

  logger.info("Subscription updated", { userId, tier, status: subscription.status });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  logger.info("Processing customer.subscription.deleted", { subscriptionId: subscription.id });

  const stripeCustomerId = typeof subscription.customer === "string"
    ? subscription.customer
    : (subscription.customer as any)?.id;

  if (!stripeCustomerId) {
    logger.error("Missing customer ID in subscription deletion");
    return;
  }

  const sub = subscription as any;
  const canceledAt = sub.canceled_at 
    ? new Date(sub.canceled_at * 1000) 
    : new Date();

  const finalStatus = subscription.status === "canceled" ? "canceled" : "expired";

  await db
    .update(subscriptions)
    .set({
      status: finalStatus,
      canceledAt,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.stripeCustomerId, stripeCustomerId));

  const userId = await findUserByStripeCustomerId(stripeCustomerId);
  if (userId) {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const previousTier = user?.subscriptionTier || SubscriptionTier.STANDARD;
    const previousStatus = user?.subscriptionStatus || "active";

    if (finalStatus === "expired" && previousStatus === "canceled") {
      await db.insert(conversionEvents).values({
        userId,
        fromTier: previousTier,
        toTier: SubscriptionTier.STANDARD,
        source: "expiration",
        stripeSessionId: `sub_expired_${subscription.id}_${Date.now()}`,
      }).onConflictDoNothing({ target: conversionEvents.stripeSessionId });

      logger.info("Subscription expiration event recorded", { userId, fromTier: previousTier });
    } else if (finalStatus === "canceled") {
      await db.insert(conversionEvents).values({
        userId,
        fromTier: previousTier,
        toTier: SubscriptionTier.STANDARD,
        source: "cancellation",
        stripeSessionId: `sub_canceled_${subscription.id}_${Date.now()}`,
      }).onConflictDoNothing({ target: conversionEvents.stripeSessionId });

      logger.info("Subscription cancellation event recorded", { userId, fromTier: previousTier });
    }

    await updateUserSubscriptionTier(userId, SubscriptionTier.STANDARD, finalStatus);
    await invalidateSubscriptionCache(userId);
  }

  logger.info("Subscription deleted", { status: finalStatus, stripeCustomerId });
}

async function handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  logger.info("Processing invoice.paid", { invoiceId: invoice.id });

  const inv = invoice as any;
  if (!inv.subscription) {
    logger.info("Invoice not related to subscription, skipping");
    return;
  }

  const stripeCustomerId = typeof invoice.customer === "string"
    ? invoice.customer
    : (invoice.customer as any)?.id;

  if (!stripeCustomerId) {
    logger.error("Missing customer ID in invoice");
    return;
  }

  const stripe = await getUncachableStripeClient();
  const subscriptionId = typeof inv.subscription === "string"
    ? inv.subscription
    : inv.subscription?.id;

  if (!subscriptionId) return;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId) as any;

  const currentPeriodStart = new Date((subscription.current_period_start || Date.now() / 1000) * 1000);
  const currentPeriodEnd = new Date((subscription.current_period_end || (Date.now() / 1000 + 30 * 24 * 60 * 60)) * 1000);

  await db
    .update(subscriptions)
    .set({
      status: "active",
      currentPeriodStart,
      currentPeriodEnd,
      paymentFailedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.stripeCustomerId, stripeCustomerId));

  const invoicePaidUserId = await findUserByStripeCustomerId(stripeCustomerId);
  if (invoicePaidUserId) {
    await invalidateSubscriptionCache(invoicePaidUserId);
  }

  logger.info("Subscription confirmed active", { stripeCustomerId });
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  logger.info("Processing invoice.payment_failed", { invoiceId: invoice.id });

  const inv = invoice as any;
  if (!inv.subscription) {
    logger.info("Invoice not related to subscription, skipping");
    return;
  }

  const stripeCustomerId = typeof invoice.customer === "string"
    ? invoice.customer
    : (invoice.customer as any)?.id;

  if (!stripeCustomerId) {
    logger.error("Missing customer ID in failed invoice");
    return;
  }

  const now = new Date();
  await db
    .update(subscriptions)
    .set({
      status: "past_due",
      paymentFailedAt: now,
      updatedAt: now,
    })
    .where(eq(subscriptions.stripeCustomerId, stripeCustomerId));

  const paymentFailedUserId = await findUserByStripeCustomerId(stripeCustomerId);
  if (paymentFailedUserId) {
    await invalidateSubscriptionCache(paymentFailedUserId);
    await queueNotification({
      userId: paymentFailedUserId,
      type: "payment_failed",
      title: "Payment Failed",
      body: "Your subscription payment couldn't be processed. Please update your payment method to avoid losing access to your premium features.",
      data: { stripeCustomerId, invoiceId: invoice.id },
      deepLink: "chefspaice://subscription/manage",
    });
  }

  logger.info("Subscription marked as past_due", { stripeCustomerId });
}
