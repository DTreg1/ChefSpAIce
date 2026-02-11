import { db } from "../db";
import { subscriptions } from "@shared/schema";
import { eq, and, lt } from "drizzle-orm";
import { expireTrialSubscription } from "../services/subscriptionService";
import { logger } from "../lib/logger";
import { registerJob } from "./jobScheduler";

export async function checkExpiredTrials(): Promise<{ expired: number; errors: string[] }> {
  const now = new Date();
  const errors: string[] = [];
  let expiredCount = 0;

  try {
    const expiredTrials = await db
      .select({
        userId: subscriptions.userId,
        trialEnd: subscriptions.trialEnd,
        status: subscriptions.status,
      })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.status, "trialing"),
          lt(subscriptions.trialEnd, now)
        )
      );

    for (const trial of expiredTrials) {
      try {
        await expireTrialSubscription(trial.userId);
        expiredCount++;
      } catch (error) {
        const msg = `Failed to expire trial for user ${trial.userId}: ${error}`;
        errors.push(msg);
        logger.error("Failed to expire trial", { userId: trial.userId, error: error instanceof Error ? error.message : String(error) });
      }
    }

    if (expiredCount > 0) {
      logger.info("Expired trials", { count: expiredCount });
    }
  } catch (error) {
    const msg = `Error querying expired trials: ${error}`;
    errors.push(msg);
    logger.error("Error querying expired trials", { error: error instanceof Error ? error.message : String(error) });
  }

  return { expired: expiredCount, errors };
}

export function registerTrialExpirationJob(intervalMs: number = 60 * 60 * 1000): void {
  registerJob("trial-expiration", intervalMs, async () => {
    await checkExpiredTrials();
  });
}
