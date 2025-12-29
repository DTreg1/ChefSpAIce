import { db } from "../db";
import { subscriptions, users, Subscription, InsertSubscription } from "@shared/schema";
import { eq } from "drizzle-orm";

export async function getSubscriptionByUserId(userId: string): Promise<Subscription | null> {
  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  return subscription || null;
}

export async function getSubscriptionByStripeId(stripeSubscriptionId: string): Promise<Subscription | null> {
  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId))
    .limit(1);

  return subscription || null;
}

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

    return created;
  }
}

export async function getUserByStripeCustomerId(customerId: string): Promise<typeof users.$inferSelect | null> {
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

export function isSubscriptionActive(subscription: Subscription | null): boolean {
  if (!subscription) return false;
  return subscription.status === "trialing" || subscription.status === "active";
}

export function getTrialDaysRemaining(subscription: Subscription | null): number {
  if (!subscription || !subscription.trialEnd) return 0;

  const now = new Date();
  const trialEnd = new Date(subscription.trialEnd);

  if (trialEnd <= now) return 0;

  const diffMs = trialEnd.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  return diffDays;
}
