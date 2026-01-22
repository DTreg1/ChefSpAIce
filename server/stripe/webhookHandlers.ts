import { getStripeSync, getUncachableStripeClient } from "./stripeClient";
import { db } from "../db";
import { subscriptions, users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { getPlanTypeFromPriceId, getTierFromPriceId } from "./subscriptionConfig";
import Stripe from "stripe";
import { SubscriptionTier } from "@shared/subscription";

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

    const event = JSON.parse(payload.toString()) as Stripe.Event;
    await processSubscriptionEvent(event);
  }
}

async function processSubscriptionEvent(event: Stripe.Event): Promise<void> {
  console.log("[Webhook] Processing event:", event.type);

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
    console.error(`[Webhook] Error processing ${event.type}:`, error);
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
    console.error("[Webhook] Error fetching customer metadata:", error);
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
  if (trialEnd) {
    updateData.trialEndsAt = trialEnd;
  }

  await db
    .update(users)
    .set(updateData)
    .where(eq(users.id, userId));

  console.log(`[Webhook] Updated user ${userId} tier to ${tier}, status to ${status}`);
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session): Promise<void> {
  console.log("[Webhook] checkout.session.completed:", session.id);

  if (session.mode !== "subscription") {
    console.log("[Webhook] Skipping non-subscription checkout session");
    return;
  }

  const stripeCustomerId = typeof session.customer === "string" 
    ? session.customer 
    : session.customer?.id;
  const stripeSubscriptionId = typeof session.subscription === "string"
    ? session.subscription
    : (session.subscription as any)?.id;

  if (!stripeCustomerId || !stripeSubscriptionId) {
    console.error("[Webhook] Missing customer or subscription ID in checkout session");
    return;
  }

  const userId = session.metadata?.userId || await findUserIdFromCustomerMetadata(stripeCustomerId);

  if (!userId) {
    console.error("[Webhook] Could not find userId for checkout session:", session.id);
    return;
  }

  const stripe = await getUncachableStripeClient();
  const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId) as any;

  const priceId = subscription.items?.data?.[0]?.price?.id;
  let planType = getPlanTypeFromPriceId(priceId || "") || "monthly";
  
  let tier: SubscriptionTier = session.metadata?.tier as SubscriptionTier || SubscriptionTier.BASIC;
  
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

  const status = subscription.status === "trialing" ? "trialing" : "active";
  await updateUserSubscriptionTier(userId, tier, status, stripeCustomerId, stripeSubscriptionId, trialEnd);

  console.log("[Webhook] Subscription record created/updated for user:", userId, "Tier:", tier);
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription): Promise<void> {
  console.log("[Webhook] customer.subscription.created:", subscription.id);

  const stripeCustomerId = typeof subscription.customer === "string"
    ? subscription.customer
    : (subscription.customer as any)?.id;

  if (!stripeCustomerId) {
    console.error("[Webhook] Missing customer ID in subscription");
    return;
  }

  const userId = subscription.metadata?.userId || 
    await findUserByStripeCustomerId(stripeCustomerId) ||
    await findUserIdFromCustomerMetadata(stripeCustomerId);

  if (!userId) {
    console.log("[Webhook] No userId found for subscription, will be linked via checkout.session.completed");
    return;
  }

  const sub = subscription as any;
  const priceId = sub.items?.data?.[0]?.price?.id;
  let planType = getPlanTypeFromPriceId(priceId || "") || "monthly";
  
  let tier: SubscriptionTier = subscription.metadata?.tier as SubscriptionTier || SubscriptionTier.BASIC;
  
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
  
  const status = subscription.status === "trialing" ? "trialing" : "active";
  await updateUserSubscriptionTier(userId, tier, status, stripeCustomerId, subscription.id, trialEnd);

  console.log("[Webhook] Subscription created for user:", userId, "Tier:", tier);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
  console.log("[Webhook] customer.subscription.updated:", subscription.id);

  const stripeCustomerId = typeof subscription.customer === "string"
    ? subscription.customer
    : (subscription.customer as any)?.id;

  if (!stripeCustomerId) {
    console.error("[Webhook] Missing customer ID in subscription");
    return;
  }

  const userId = await findUserByStripeCustomerId(stripeCustomerId);

  if (!userId) {
    console.log("[Webhook] No user found for subscription update:", subscription.id);
    return;
  }

  const sub = subscription as any;
  const priceId = sub.items?.data?.[0]?.price?.id;
  let planType = getPlanTypeFromPriceId(priceId || "") || "monthly";
  
  let tier: SubscriptionTier = subscription.metadata?.tier as SubscriptionTier || SubscriptionTier.BASIC;
  
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

  const statusStr = subscription.status === "trialing" ? "trialing" : 
                    subscription.status === "active" ? "active" : subscription.status;
  await updateUserSubscriptionTier(userId, tier, statusStr, stripeCustomerId, undefined, trialEnd);

  console.log("[Webhook] Subscription updated for user:", userId, "Tier:", tier, "Status:", subscription.status);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  console.log("[Webhook] customer.subscription.deleted:", subscription.id);

  const stripeCustomerId = typeof subscription.customer === "string"
    ? subscription.customer
    : (subscription.customer as any)?.id;

  if (!stripeCustomerId) {
    console.error("[Webhook] Missing customer ID in subscription");
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
    await updateUserSubscriptionTier(userId, SubscriptionTier.BASIC, finalStatus);
  }

  console.log("[Webhook] Subscription marked as", finalStatus, "for customer:", stripeCustomerId);
}

async function handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  console.log("[Webhook] invoice.paid:", invoice.id);

  const inv = invoice as any;
  if (!inv.subscription) {
    console.log("[Webhook] Invoice not related to subscription, skipping");
    return;
  }

  const stripeCustomerId = typeof invoice.customer === "string"
    ? invoice.customer
    : (invoice.customer as any)?.id;

  if (!stripeCustomerId) {
    console.error("[Webhook] Missing customer ID in invoice");
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
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.stripeCustomerId, stripeCustomerId));

  console.log("[Webhook] Subscription confirmed active for customer:", stripeCustomerId);
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  console.log("[Webhook] invoice.payment_failed:", invoice.id);

  const inv = invoice as any;
  if (!inv.subscription) {
    console.log("[Webhook] Invoice not related to subscription, skipping");
    return;
  }

  const stripeCustomerId = typeof invoice.customer === "string"
    ? invoice.customer
    : (invoice.customer as any)?.id;

  if (!stripeCustomerId) {
    console.error("[Webhook] Missing customer ID in invoice");
    return;
  }

  await db
    .update(subscriptions)
    .set({
      status: "past_due",
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.stripeCustomerId, stripeCustomerId));

  console.log("[Webhook] Subscription marked as past_due for customer:", stripeCustomerId);
}
