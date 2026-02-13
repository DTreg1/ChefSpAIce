/**
 * =============================================================================
 * STRIPE SUBSCRIPTION DATABASE SERVICE
 * =============================================================================
 * 
 * Handles Stripe-specific subscription database operations.
 * This service manages the `subscriptions` table with Stripe integration data.
 * 
 * RESPONSIBILITIES:
 * - CRUD operations for subscription records
 * - Stripe customer/subscription ID lookups
 * - Subscription status checks (active, trialing, etc.)
 * - Trial days remaining calculations
 * 
 * RELATED FILES:
 * - server/services/subscriptionService.ts: Entitlements, limits, usage tracking
 * - server/stripe/webhookHandlers.ts: Stripe webhook event processing
 * - server/stripe/stripeClient.ts: Stripe API client
 * 
 * @module server/stripe/subscriptionService
 */

import { db } from "../db";
import { subscriptions, users, Subscription, InsertSubscription, User } from "@shared/schema";
import { eq } from "drizzle-orm";
import { invalidateSubscriptionCache } from "../lib/subscription-cache";

/**
 * Retrieves a subscription by user ID.
 */
export async function getSubscriptionByUserId(userId: string): Promise<Subscription | null> {
  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  return subscription || null;
}

/**
 * Retrieves a subscription by Stripe subscription ID.
 */
export async function getSubscriptionByStripeId(stripeSubscriptionId: string): Promise<Subscription | null> {
  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId))
    .limit(1);

  return subscription || null;
}

/**
 * Creates or updates a subscription record.
 * Uses upsert pattern based on userId.
 */
export async function createOrUpdateSubscription(data: Partial<InsertSubscription> & { userId: string }): Promise<Subscription> {
  const existingSubscription = await getSubscriptionByUserId(data.userId);

  if (existingSubscription) {
    const [updated] = await db
      .update(subscriptions)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.userId, data.userId))
      .returning();

    await invalidateSubscriptionCache(data.userId);
    return updated;
  } else {
    const [created] = await db
      .insert(subscriptions)
      .values({
        ...data,
        status: data.status || "incomplete",
        planType: data.planType || "monthly",
        currentPeriodStart: data.currentPeriodStart || new Date(),
        currentPeriodEnd: data.currentPeriodEnd || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      } as InsertSubscription)
      .returning();

    await invalidateSubscriptionCache(data.userId);
    return created;
  }
}

/**
 * Finds a user by their Stripe customer ID.
 * Looks up the subscription first, then retrieves the associated user.
 */
export async function getUserByStripeCustomerId(customerId: string): Promise<User | null> {
  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.stripeCustomerId, customerId))
    .limit(1);

  if (!subscription) return null;

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, subscription.userId))
    .limit(1);

  return user || null;
}

/**
 * Links a Stripe customer ID to a user's subscription record.
 * Creates a new subscription record if one doesn't exist.
 */
export async function linkStripeCustomerToUser(userId: string, customerId: string): Promise<void> {
  const existingSubscription = await getSubscriptionByUserId(userId);

  if (existingSubscription) {
    await db
      .update(subscriptions)
      .set({
        stripeCustomerId: customerId,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.userId, userId));
  } else {
    await db
      .insert(subscriptions)
      .values({
        userId,
        stripeCustomerId: customerId,
        status: "incomplete",
        planType: "monthly",
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
  }
}

/**
 * Checks if a subscription is currently active.
 */
export function isSubscriptionActive(subscription: Subscription | null): boolean {
  if (!subscription) return false;
  return subscription.status === "active";
}

/**
 * Calculates the number of days remaining in a trial period.
 * Returns 0 if no trial or trial has expired.
 */
export function getTrialDaysRemaining(subscription: Subscription | null): number {
  if (!subscription || !subscription.trialEnd) return 0;

  const now = new Date();
  const trialEnd = new Date(subscription.trialEnd);

  if (trialEnd <= now) return 0;

  const diffMs = trialEnd.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  return diffDays;
}
