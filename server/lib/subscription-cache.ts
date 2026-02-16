import { CacheService } from "./cache";

export interface CachedSubscriptionStatus {
  subscriptionStatus: string | null;
  subscriptionPaymentFailedAt: Date | null;
  subscriptionUpdatedAt: Date | null;
  subscriptionTrialEnd: Date | null;
  userTier: string | null;
}

const SUBSCRIPTION_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export const subscriptionCache = new CacheService<CachedSubscriptionStatus>({
  defaultTtlMs: SUBSCRIPTION_CACHE_TTL_MS,
});

export async function invalidateSubscriptionCache(userId: string): Promise<void> {
  await subscriptionCache.delete(userId);
}
