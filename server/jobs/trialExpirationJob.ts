import { db } from "../db";
import { subscriptions } from "@shared/schema";
import { eq, and, lt } from "drizzle-orm";
import { expireTrialSubscription } from "../services/subscriptionService";

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

    console.log(`[TrialJob] Found ${expiredTrials.length} expired trials to process`);

    for (const trial of expiredTrials) {
      try {
        await expireTrialSubscription(trial.userId);
        expiredCount++;
        console.log(`[TrialJob] Expired trial for user ${trial.userId}`);
      } catch (error) {
        const msg = `Failed to expire trial for user ${trial.userId}: ${error}`;
        errors.push(msg);
        console.error(`[TrialJob] ${msg}`);
      }
    }

    console.log(`[TrialJob] Successfully expired ${expiredCount} trials`);
  } catch (error) {
    const msg = `Error querying expired trials: ${error}`;
    errors.push(msg);
    console.error(`[TrialJob] ${msg}`);
  }

  return { expired: expiredCount, errors };
}

let jobInterval: NodeJS.Timeout | null = null;

export function startTrialExpirationJob(intervalMs: number = 60 * 60 * 1000): void {
  if (jobInterval) {
    console.log("[TrialJob] Job already running");
    return;
  }

  console.log(`[TrialJob] Starting trial expiration job (interval: ${intervalMs}ms)`);

  checkExpiredTrials();

  jobInterval = setInterval(async () => {
    console.log("[TrialJob] Running scheduled trial expiration check...");
    await checkExpiredTrials();
  }, intervalMs);
}

export function stopTrialExpirationJob(): void {
  if (jobInterval) {
    clearInterval(jobInterval);
    jobInterval = null;
    console.log("[TrialJob] Stopped trial expiration job");
  }
}
