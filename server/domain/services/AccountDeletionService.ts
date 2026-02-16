import type { Response } from "express";
import { db } from "../../db";
import {
  users,
  userSessions,
  userSyncData,
  subscriptions,
  userAppliances,
  authProviders,
  feedback,
  userInventoryItems,
  userSavedRecipes,
  userMealPlans,
  userShoppingItems,
  userCookwareItems,
  userWasteLogs,
  userConsumedLogs,
  userStorageLocations,
  userSyncKV,
  notifications,
  conversionEvents,
  cancellationReasons,
  referrals,
  nutritionCorrections,
} from "@shared/schema";
import { eq, or } from "drizzle-orm";
import { getUncachableStripeClient } from "../../stripe/stripeClient";
import { logger } from "../../lib/logger";
import { clearAuthCookie } from "../../lib/session-utils";
import { createEvent, type AccountDeleted } from "@shared/domain/events";
import { sessionCache } from "../../lib/session-cache";

export async function deleteAccount(userId: string, res: Response): Promise<AccountDeleted> {
  logger.info("Starting account deletion", { userId });

  const [user] = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const userEmail = user?.email || "unknown";

  let hadStripeSubscription = false;

  try {
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .limit(1);

    if (subscription?.stripeSubscriptionId) {
      hadStripeSubscription = true;
      const stripe = await getUncachableStripeClient();
      await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
      logger.info("Cancelled Stripe subscription", { stripeSubscriptionId: subscription.stripeSubscriptionId });
    }
  } catch (e) {
    logger.warn("Error cancelling Stripe subscription", { userId, error: e instanceof Error ? e.message : String(e) });
  }

  const userSessionRows = await db
    .select({ token: userSessions.token })
    .from(userSessions)
    .where(eq(userSessions.userId, userId));
  await Promise.all(userSessionRows.map((s) => sessionCache.delete(s.token)));

  await db.transaction(async (tx) => {
    await tx.delete(notifications).where(eq(notifications.userId, userId));
    await tx.delete(conversionEvents).where(eq(conversionEvents.userId, userId));
    await tx.delete(cancellationReasons).where(eq(cancellationReasons.userId, userId));
    await tx.delete(referrals).where(or(eq(referrals.referrerId, userId), eq(referrals.referredUserId, userId)));
    await tx.delete(nutritionCorrections).where(eq(nutritionCorrections.userId, userId));
    await tx.delete(feedback).where(eq(feedback.userId, userId));
    await tx.delete(userInventoryItems).where(eq(userInventoryItems.userId, userId));
    await tx.delete(userSavedRecipes).where(eq(userSavedRecipes.userId, userId));
    await tx.delete(userMealPlans).where(eq(userMealPlans.userId, userId));
    await tx.delete(userShoppingItems).where(eq(userShoppingItems.userId, userId));
    await tx.delete(userCookwareItems).where(eq(userCookwareItems.userId, userId));
    await tx.delete(userWasteLogs).where(eq(userWasteLogs.userId, userId));
    await tx.delete(userConsumedLogs).where(eq(userConsumedLogs.userId, userId));
    await tx.delete(userStorageLocations).where(eq(userStorageLocations.userId, userId));
    await tx.delete(userSyncKV).where(eq(userSyncKV.userId, userId));
    await tx.delete(authProviders).where(eq(authProviders.userId, userId));
    await tx.delete(userAppliances).where(eq(userAppliances.userId, userId));
    await tx.delete(subscriptions).where(eq(subscriptions.userId, userId));
    await tx.delete(userSyncData).where(eq(userSyncData.userId, userId));
    await tx.delete(userSessions).where(eq(userSessions.userId, userId));
    await tx.delete(users).where(eq(users.id, userId));
  });

  clearAuthCookie(res);

  logger.info("Account deleted successfully", { userId });

  return createEvent<AccountDeleted>({
    type: "AccountDeleted",
    userId,
    email: userEmail,
    hadStripeSubscription,
  });
}
