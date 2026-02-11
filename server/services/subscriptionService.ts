/**
 * =============================================================================
 * SUBSCRIPTION ENTITLEMENTS SERVICE
 * =============================================================================
 * 
 * Manages user subscription entitlements, usage limits, and feature access.
 * This is the core business logic layer for subscription features.
 * 
 * RESPONSIBILITIES:
 * - User entitlements calculation (tier, limits, remaining quota)
 * - Usage limit checks (pantry items, AI recipes, cookware)
 * - Feature access control (recipe scanning, AI assistant, etc.)
 * - Trial management (creation, expiration, checking)
 * - Monthly usage counter resets
 * 
 * RELATED FILES:
 * - server/stripe/subscriptionService.ts: Stripe-specific database operations
 * - server/middleware/requireSubscription.ts: Route-level access control
 * - shared/subscription.ts: Tier configuration and limits
 * 
 * @module server/services/subscriptionService
 */

import { db } from "../db";
import { users, subscriptions, userInventoryItems, userCookwareItems, referrals } from "@shared/schema";
import { eq, and, count, sql, isNull } from "drizzle-orm";
import { logger } from "../lib/logger";
import {
  SubscriptionTier,
  TierLimits,
  TRIAL_CONFIG,
  getTierLimits,
  isWithinLimit,
  getRemainingQuota,
} from "@shared/subscription";
import { CacheService } from "../lib/cache";
import { invalidateSubscriptionCache } from "../lib/subscription-cache";

const { TRIAL_DAYS } = TRIAL_CONFIG;

const AI_LIMIT_CACHE_TTL_MS = 30_000; // 30 seconds

const aiLimitCache = new CacheService<LimitCheckResult>({
  defaultTtlMs: AI_LIMIT_CACHE_TTL_MS,
});

async function getCachedAiLimit(userId: string): Promise<LimitCheckResult | null> {
  const cached = await aiLimitCache.get(userId);
  return cached ?? null;
}

async function setCachedAiLimit(userId: string, result: LimitCheckResult): Promise<void> {
  await aiLimitCache.set(userId, result);
}

export async function invalidateAiLimitCache(userId: string): Promise<void> {
  await aiLimitCache.delete(userId);
}

export interface UserEntitlements {
  tier: SubscriptionTier;
  status: string;
  limits: TierLimits;
  usage: {
    pantryItemCount: number;
    aiRecipesUsedThisMonth: number;
    cookwareCount: number;
  };
  remaining: {
    pantryItems: number | "unlimited";
    aiRecipes: number | "unlimited";
    cookware: number | "unlimited";
  };
  trialEndsAt: Date | null;
}

export interface LimitCheckResult {
  allowed: boolean;
  remaining: number | "unlimited";
  limit: number | "unlimited";
}

async function getUserById(userId: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return user;
}

async function getInventoryCount(userId: string): Promise<number> {
  const [result] = await db
    .select({ value: count() })
    .from(userInventoryItems)
    .where(and(eq(userInventoryItems.userId, userId), isNull(userInventoryItems.deletedAt)));
  return result?.value ?? 0;
}

async function getCookwareCount(userId: string): Promise<number> {
  const [result] = await db
    .select({ value: count() })
    .from(userCookwareItems)
    .where(eq(userCookwareItems.userId, userId));
  return result?.value ?? 0;
}

export async function getUserEntitlements(
  userId: string
): Promise<UserEntitlements> {
  const [initialUser, pantryItemCount, cookwareCount] = await Promise.all([
    getUserById(userId),
    getInventoryCount(userId),
    getCookwareCount(userId),
  ]);

  if (!initialUser) {
    throw new Error("User not found");
  }

  const wasReset = await resetMonthlyCountsIfNeededOptimized(userId, initialUser);
  
  const user = wasReset ? await getUserById(userId) : initialUser;
  if (!user) {
    throw new Error("User not found after refresh");
  }

  const tier = (user.subscriptionTier as SubscriptionTier) || SubscriptionTier.TRIAL;
  const limits = getTierLimits(tier);
  const aiRecipesUsedThisMonth = user.aiRecipesGeneratedThisMonth || 0;

  return {
    tier,
    status: user.subscriptionStatus || "active",
    limits,
    usage: {
      pantryItemCount,
      aiRecipesUsedThisMonth,
      cookwareCount,
    },
    remaining: {
      pantryItems: getRemainingQuota(tier, "maxPantryItems", pantryItemCount),
      aiRecipes: getRemainingQuota(tier, "maxAiRecipesPerMonth", aiRecipesUsedThisMonth),
      cookware: getRemainingQuota(tier, "maxCookwareItems", cookwareCount),
    },
    trialEndsAt: user.trialEndsAt,
  };
}

export async function checkPantryItemLimit(
  userId: string
): Promise<LimitCheckResult> {
  const entitlements = await getUserEntitlements(userId);
  const { tier, usage } = entitlements;
  const limits = getTierLimits(tier);

  const limit = limits.maxPantryItems === -1 ? "unlimited" : limits.maxPantryItems;
  const remaining = getRemainingQuota(tier, "maxPantryItems", usage.pantryItemCount);
  const allowed = isWithinLimit(tier, "maxPantryItems", usage.pantryItemCount);

  return { allowed, remaining, limit };
}

export async function checkAiRecipeLimit(
  userId: string
): Promise<LimitCheckResult> {
  // Check cache first to avoid redundant DB calls for rapid generations
  const cached = await getCachedAiLimit(userId);
  if (cached) {
    return cached;
  }

  await resetMonthlyCountsIfNeeded(userId);

  const user = await getUserById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  const tier = (user.subscriptionTier as SubscriptionTier) || SubscriptionTier.TRIAL;
  const limits = getTierLimits(tier);
  const currentCount = user.aiRecipesGeneratedThisMonth || 0;
  const bonusCredits = user.aiRecipeBonusCredits || 0;

  const baseLimit = limits.maxAiRecipesPerMonth;
  const effectiveLimit = baseLimit === -1 ? -1 : baseLimit + bonusCredits;
  const limit: number | "unlimited" = effectiveLimit === -1 ? "unlimited" : effectiveLimit;
  const remaining = effectiveLimit === -1 ? ("unlimited" as const) : Math.max(0, effectiveLimit - currentCount);
  const allowed = effectiveLimit === -1 ? true : currentCount < effectiveLimit;

  const result: LimitCheckResult = { allowed, remaining, limit };
  await setCachedAiLimit(userId, result);
  return result;
}

export async function checkCookwareLimit(
  userId: string
): Promise<LimitCheckResult> {
  const entitlements = await getUserEntitlements(userId);
  const { tier, usage } = entitlements;
  const limits = getTierLimits(tier);

  const limit = limits.maxCookwareItems === -1 ? "unlimited" : limits.maxCookwareItems;
  const remaining = getRemainingQuota(tier, "maxCookwareItems", usage.cookwareCount);
  const allowed = isWithinLimit(tier, "maxCookwareItems", usage.cookwareCount);

  return { allowed, remaining, limit };
}

type FeatureKey =
  | "recipeScanning"
  | "bulkScanning"
  | "aiKitchenAssistant"
  | "weeklyMealPrepping"
  | "customStorageAreas";

const featureToLimitKey: Record<FeatureKey, keyof TierLimits> = {
  recipeScanning: "canUseRecipeScanning",
  bulkScanning: "canUseBulkScanning",
  aiKitchenAssistant: "canUseAiKitchenAssistant",
  weeklyMealPrepping: "canUseWeeklyMealPrepping",
  customStorageAreas: "canCustomizeStorageAreas",
};

export async function checkFeatureAccess(
  userId: string,
  feature: FeatureKey
): Promise<boolean> {
  const user = await getUserById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  const tier = (user.subscriptionTier as SubscriptionTier) || SubscriptionTier.TRIAL;
  const limits = getTierLimits(tier);

  const limitKey = featureToLimitKey[feature];
  if (!limitKey) {
    return false;
  }

  return limits[limitKey] as boolean;
}

export async function incrementAiRecipeCount(userId: string): Promise<void> {
  const user = await getUserById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  const oneMonthFromNow = new Date();
  oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);
  const resetDate = user.aiRecipesResetDate || oneMonthFromNow;

  const [updated] = await db
    .update(users)
    .set({
      aiRecipesGeneratedThisMonth: sql`COALESCE(${users.aiRecipesGeneratedThisMonth}, 0) + 1`,
      aiRecipesResetDate: resetDate,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning({ newCount: users.aiRecipesGeneratedThisMonth });

  if (!updated) {
    throw new Error("Failed to increment AI recipe count");
  }

  await invalidateAiLimitCache(userId);
}

export async function resetMonthlyCountsIfNeeded(userId: string): Promise<void> {
  const user = await getUserById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  const resetDate = user.aiRecipesResetDate;
  if (!resetDate) {
    return;
  }

  const now = new Date();
  if (now >= new Date(resetDate)) {
    const oneMonthFromNow = new Date();
    oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);

    await db
      .update(users)
      .set({
        aiRecipesGeneratedThisMonth: 0,
        aiRecipesResetDate: oneMonthFromNow,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }
}

/**
 * Optimized version of resetMonthlyCountsIfNeeded that accepts a pre-fetched user
 * to avoid redundant database queries. Returns true if a reset was performed.
 * 
 * @param userId - The user's ID
 * @param user - Pre-fetched user object to avoid additional DB query
 * @returns boolean indicating if monthly counts were reset
 */
async function resetMonthlyCountsIfNeededOptimized(
  userId: string,
  user: NonNullable<Awaited<ReturnType<typeof getUserById>>>
): Promise<boolean> {
  const resetDate = user.aiRecipesResetDate;
  if (!resetDate) {
    return false;
  }

  const now = new Date();
  if (now >= new Date(resetDate)) {
    const oneMonthFromNow = new Date();
    oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);

    await db
      .update(users)
      .set({
        aiRecipesGeneratedThisMonth: 0,
        aiRecipesResetDate: oneMonthFromNow,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
    
    return true;
  }
  
  return false;
}

export async function upgradeUserTier(
  userId: string,
  tier: SubscriptionTier,
  stripeCustomerId?: string,
  stripeSubscriptionId?: string
): Promise<void> {
  await db
    .update(users)
    .set({
      subscriptionTier: tier,
      subscriptionStatus: "active",
      stripeCustomerId: stripeCustomerId || undefined,
      stripeSubscriptionId: stripeSubscriptionId || undefined,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
  await invalidateSubscriptionCache(userId);
}

export async function downgradeUserTier(userId: string): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .update(subscriptions)
      .set({
        status: 'canceled',
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.userId, userId));

    await tx
      .update(users)
      .set({
        subscriptionTier: SubscriptionTier.TRIAL,
        subscriptionStatus: "canceled",
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  });
  await invalidateSubscriptionCache(userId);
}

export async function setTrialExpiration(
  userId: string,
  trialDays: number = 7
): Promise<void> {
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

  await db.transaction(async (tx) => {
    await tx
      .update(subscriptions)
      .set({
        status: 'trialing',
        trialEnd: trialEndsAt,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.userId, userId));

    await tx
      .update(users)
      .set({
        subscriptionTier: SubscriptionTier.PRO,
        subscriptionStatus: "trialing",
        trialEndsAt,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  });
  await invalidateSubscriptionCache(userId);
}

export async function checkTrialExpiration(userId: string): Promise<boolean> {
  const user = await getUserById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  if (user.subscriptionStatus !== "trialing") {
    return false;
  }

  if (!user.trialEndsAt) {
    return false;
  }

  const now = new Date();
  if (now >= new Date(user.trialEndsAt)) {
    await expireTrialSubscription(userId);
    return true;
  }

  return false;
}

/**
 * DESIGN DECISION: Trial users receive full PRO-tier access for the duration of
 * their 7-day trial. This is intentional — it lets new users experience every
 * premium feature before deciding to subscribe. When the trial expires,
 * `expireTrialSubscription()` downgrades them to the restricted TRIAL tier
 * (all limits set to 0 — fully locked out). The TRIAL tier limits in
 * shared/subscription.ts are only enforced *after* trial expiration.
 */
export async function ensureTrialSubscription(
  userId: string,
  selectedPlan: 'monthly' | 'annual' = 'monthly',
  trialDaysOverride?: number
): Promise<{ created: boolean; trialEnd: Date }> {
  const now = new Date();
  const trialEnd = new Date(now);
  const effectiveTrialDays = trialDaysOverride ?? TRIAL_DAYS;
  trialEnd.setDate(trialEnd.getDate() + effectiveTrialDays);

  const [existing] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  if (existing) {
    if (existing.status === 'trialing') {
      await db
        .update(users)
        .set({
          subscriptionTier: SubscriptionTier.PRO,
          subscriptionStatus: 'trialing',
          trialEndsAt: existing.trialEnd || trialEnd,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
      return { created: false, trialEnd: existing.trialEnd || trialEnd };
    }
    return { created: false, trialEnd: existing.trialEnd || trialEnd };
  }

  try {
    await db.transaction(async (tx) => {
      await tx.insert(subscriptions).values({
        userId,
        status: 'trialing',
        planType: selectedPlan,
        currentPeriodStart: now,
        currentPeriodEnd: trialEnd,
        trialStart: now,
        trialEnd: trialEnd,
        cancelAtPeriodEnd: false,
      });

      await tx
        .update(users)
        .set({
          subscriptionTier: SubscriptionTier.PRO,
          subscriptionStatus: 'trialing',
          trialEndsAt: trialEnd,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
    });

    await invalidateSubscriptionCache(userId);
    return { created: true, trialEnd };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('unique') || errorMessage.includes('duplicate')) {
      const [sub] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, userId))
        .limit(1);

      if (sub?.status === 'trialing') {
        await db
          .update(users)
          .set({
            subscriptionTier: SubscriptionTier.PRO,
            subscriptionStatus: 'trialing',
            trialEndsAt: sub.trialEnd || trialEnd,
            updatedAt: new Date(),
          })
          .where(eq(users.id, userId));
      }
      return { created: false, trialEnd: sub?.trialEnd || trialEnd };
    }
    throw error;
  }
}

export async function checkAndRedeemReferralCredits(userId: string): Promise<void> {
  const [result] = await db
    .select({ value: count() })
    .from(referrals)
    .where(
      and(
        eq(referrals.referrerId, userId),
        eq(referrals.status, "completed"),
        eq(referrals.bonusGranted, false)
      )
    );

  const unredeemedCount = result?.value ?? 0;

  if (unredeemedCount >= 3) {
    await db.transaction(async (tx) => {
      await tx.execute(
        sql`UPDATE referrals SET bonus_granted = true WHERE id IN (SELECT id FROM referrals WHERE referrer_id = ${userId} AND status = 'completed' AND bonus_granted = false ORDER BY created_at ASC LIMIT 3)`
      );

      const [subscription] = await tx
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, userId))
        .limit(1);

      if (subscription) {
        const thirtyDays = 30 * 24 * 60 * 60 * 1000;

        if (subscription.status === "trialing") {
          const newTrialEnd = new Date((subscription.trialEnd?.getTime() || Date.now()) + thirtyDays);
          const newPeriodEnd = new Date((subscription.currentPeriodEnd?.getTime() || Date.now()) + thirtyDays);

          await tx
            .update(subscriptions)
            .set({
              trialEnd: newTrialEnd,
              currentPeriodEnd: newPeriodEnd,
              updatedAt: new Date(),
            })
            .where(eq(subscriptions.userId, userId));

          await tx
            .update(users)
            .set({
              trialEndsAt: newTrialEnd,
              updatedAt: new Date(),
            })
            .where(eq(users.id, userId));
        } else if (subscription.status === "active") {
          const newPeriodEnd = new Date((subscription.currentPeriodEnd?.getTime() || Date.now()) + thirtyDays);

          await tx
            .update(subscriptions)
            .set({
              currentPeriodEnd: newPeriodEnd,
              updatedAt: new Date(),
            })
            .where(eq(subscriptions.userId, userId));
        }
      }
    });

    logger.info("Referral reward granted: 1 month free", { userId, creditsRedeemed: 3 });
  }
}

export async function expireTrialSubscription(userId: string): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .update(subscriptions)
      .set({
        status: 'expired',
      })
      .where(eq(subscriptions.userId, userId));

    await tx
      .update(users)
      .set({
        subscriptionTier: SubscriptionTier.TRIAL,
        subscriptionStatus: 'expired',
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  });
  await invalidateSubscriptionCache(userId);
}
