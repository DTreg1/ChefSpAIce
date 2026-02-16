import { db } from "../db";
import { subscriptions, winbackCampaigns } from "@shared/schema";
import { eq, and, lt } from "drizzle-orm";
import { queueNotification } from "../services/notificationService";
import { logger } from "../lib/logger";
import { registerJob } from "./jobScheduler";
import { getUncachableStripeClient } from "../stripe/stripeClient";

export async function checkWinbackCandidates(): Promise<{ sent: number; skipped: number; errors: string[] }> {
  const errors: string[] = [];
  let sentCount = 0;
  let skippedCount = 0;

  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const candidates = await db
      .select({
        userId: subscriptions.userId,
        subscriptionId: subscriptions.id,
        canceledAt: subscriptions.canceledAt,
      })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.status, "canceled"),
          lt(subscriptions.canceledAt, thirtyDaysAgo)
        )
      );

    for (const candidate of candidates) {
      try {
        const existing = await db
          .select({ id: winbackCampaigns.id })
          .from(winbackCampaigns)
          .where(
            eq(winbackCampaigns.userId, candidate.userId)
          )
          .limit(1);

        if (existing.length > 0) {
          skippedCount++;
          continue;
        }

        await queueNotification({
          userId: candidate.userId,
          type: "winback",
          title: "We miss you! Come back for $4.99",
          body: "It's been a while since you left ChefSpAIce. Come back and enjoy your first month for just $4.99 — that's over 50% off!",
          deepLink: "chefspaice://subscription?offer=winback",
          data: { offerAmount: 499, offerType: "first_month_discount" },
        });

        const stripe = await getUncachableStripeClient();

        const coupon = await stripe.coupons.create({
          amount_off: 501,
          currency: "usd",
          duration: "once",
          name: "Winback - $4.99 First Month",
          metadata: {
            userId: candidate.userId,
            type: "winback",
          },
        });

        const promotionCode = await stripe.promotionCodes.create({
          promotion: {
            type: "coupon",
            coupon: coupon.id,
          },
          max_redemptions: 1,
          metadata: {
            userId: candidate.userId,
            type: "winback",
          },
        });

        await db.insert(winbackCampaigns).values({
          userId: candidate.userId,
          subscriptionId: candidate.subscriptionId,
          status: "sent",
          offerAmount: 499,
          offerType: "first_month_discount",
          stripeCouponId: coupon.id,
          stripePromotionCodeId: promotionCode.id,
        });

        sentCount++;
      } catch (error) {
        const msg = `Failed to send winback campaign for user ${candidate.userId}: ${error}`;
        errors.push(msg);
        logger.error("Failed to send winback campaign", { userId: candidate.userId, error: error instanceof Error ? error.message : String(error) });
      }
    }

    if (sentCount > 0) {
      logger.info("Winback campaigns sent", { sent: sentCount, skipped: skippedCount });
    }
  } catch (error) {
    const msg = `Error querying winback candidates: ${error}`;
    errors.push(msg);
    logger.error("Error querying winback candidates", { error: error instanceof Error ? error.message : String(error) });
  }

  return { sent: sentCount, skipped: skippedCount, errors };
}

export function registerWinbackJob(intervalMs: number = 7 * 24 * 60 * 60 * 1000): void {
  registerJob("winback-campaign", intervalMs, async () => {
    await checkWinbackCandidates();
  });
}
