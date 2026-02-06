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
import { users, userSyncData, subscriptions } from "@shared/schema";
import { eq } from "drizzle-orm";
import {
  SubscriptionTier,
  TierLimits,
  TRIAL_CONFIG,
  getTierLimits,
  isWithinLimit,
  getRemainingQuota,
} from "@shared/subscription";

const { TRIAL_DAYS } = TRIAL_CONFIG;

// Cache for AI recipe limit checks (avoids redundant DB calls for rapid generations)
const aiLimitCache = new Map<string, { result: LimitCheckResult; expiresAt: number }>();
const AI_LIMIT_CACHE_TTL_MS = 30_000; // 30 seconds

function getCachedAiLimit(userId: string): LimitCheckResult | null {
  const cached = aiLimitCache.get(userId);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.result;
  }
  aiLimitCache.delete(userId);
  return null;
}

function setCachedAiLimit(userId: string, result: LimitCheckResult): void {
  aiLimitCache.set(userId, {
    result,
    expiresAt: Date.now() + AI_LIMIT_CACHE_TTL_MS,
  });
}

export function invalidateAiLimitCache(userId: string): void {
  aiLimitCache.delete(userId);
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

async function getUserSyncData(userId: string) {
  const [syncData] = await db
    .select()
    .from(userSyncData)
    .where(eq(userSyncData.userId, userId))
    .limit(1);
  return syncData;
}

interface ParsedInventoryItem {
  id: string;
  name: string;
  quantity?: number;
  [key: string]: unknown;
}

interface ParsedCookwareItem {
  id: number | string;
  name?: string;
  [key: string]: unknown;
}

function parseInventoryArray(value: unknown): ParsedInventoryItem[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value as ParsedInventoryItem[];
  }
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as ParsedInventoryItem[];
    } catch {
      return [];
    }
  }
  return [];
}

function parseCookwareArray(value: unknown): ParsedCookwareItem[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value as ParsedCookwareItem[];
  }
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as ParsedCookwareItem[];
    } catch {
      return [];
    }
  }
  return [];
}

export async function getUserEntitlements(
  userId: string
): Promise<UserEntitlements> {
  // Optimized: Fetch user and sync data in parallel, then check monthly reset
  const [initialUser, syncData] = await Promise.all([
    getUserById(userId),
    getUserSyncData(userId),
  ]);

  if (!initialUser) {
    throw new Error("User not found");
  }

  // Check if monthly counters need reset (only re-fetches user if update occurred)
  const wasReset = await resetMonthlyCountsIfNeededOptimized(userId, initialUser);
  
  // Use refreshed user only if reset occurred, otherwise use cached user
  const user = wasReset ? await getUserById(userId) : initialUser;
  if (!user) {
    throw new Error("User not found after refresh");
  }

  const tier = (user.subscriptionTier as SubscriptionTier) || SubscriptionTier.BASIC;
  const limits = getTierLimits(tier);

  const inventory = parseInventoryArray(syncData?.inventory || null);
  const cookware = parseCookwareArray(syncData?.cookware || null);

  const pantryItemCount = inventory.length;
  const cookwareCount = cookware.length;
  const aiRecipesUsedThisMonth = user.aiRecipesGeneratedThisMonth || 0;

  return {
    tier,
    status: user.subscriptionStatus || "trialing",
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
  const cached = getCachedAiLimit(userId);
  if (cached) {
    return cached;
  }

  await resetMonthlyCountsIfNeeded(userId);

  const user = await getUserById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  const tier = (user.subscriptionTier as SubscriptionTier) || SubscriptionTier.BASIC;
  const limits = getTierLimits(tier);
  const currentCount = user.aiRecipesGeneratedThisMonth || 0;

  const limit: number | "unlimited" = limits.maxAiRecipesPerMonth === -1 ? "unlimited" : limits.maxAiRecipesPerMonth;
  const remaining = getRemainingQuota(tier, "maxAiRecipesPerMonth", currentCount);
  const allowed = isWithinLimit(tier, "maxAiRecipesPerMonth", currentCount);

  const result: LimitCheckResult = { allowed, remaining, limit };
  setCachedAiLimit(userId, result);
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

  const tier = (user.subscriptionTier as SubscriptionTier) || SubscriptionTier.BASIC;
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

  const currentCount = user.aiRecipesGeneratedThisMonth || 0;

  let resetDate = user.aiRecipesResetDate;
  if (!resetDate) {
    const oneMonthFromNow = new Date();
    oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);
    resetDate = oneMonthFromNow;
  }

  await db
    .update(users)
    .set({
      aiRecipesGeneratedThisMonth: currentCount + 1,
      aiRecipesResetDate: resetDate,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  // Invalidate the cache so the next limit check reflects the new count
  invalidateAiLimitCache(userId);
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
}

export async function downgradeUserTier(userId: string): Promise<void> {
  await db
    .update(subscriptions)
    .set({
      status: 'canceled',
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.userId, userId));

  await db
    .update(users)
    .set({
      subscriptionTier: SubscriptionTier.BASIC,
      subscriptionStatus: "canceled",
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
}

export async function setTrialExpiration(
  userId: string,
  trialDays: number = 7
): Promise<void> {
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

  await db
    .update(subscriptions)
    .set({
      status: 'trialing',
      trialEnd: trialEndsAt,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.userId, userId));

  await db
    .update(users)
    .set({
      subscriptionTier: SubscriptionTier.PRO,
      subscriptionStatus: "trialing",
      trialEndsAt,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
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

export async function ensureTrialSubscription(
  userId: string,
  selectedPlan: 'monthly' | 'annual' = 'monthly'
): Promise<{ created: boolean; trialEnd: Date }> {
  const now = new Date();
  const trialEnd = new Date(now);
  trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS);

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
    await db.insert(subscriptions).values({
      userId,
      status: 'trialing',
      planType: selectedPlan,
      currentPeriodStart: now,
      currentPeriodEnd: trialEnd,
      trialStart: now,
      trialEnd: trialEnd,
      cancelAtPeriodEnd: false,
    });

    await db
      .update(users)
      .set({
        subscriptionTier: SubscriptionTier.PRO,
        subscriptionStatus: 'trialing',
        trialEndsAt: trialEnd,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

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

export async function expireTrialSubscription(userId: string): Promise<void> {
  await db
    .update(subscriptions)
    .set({
      status: 'expired',
    })
    .where(eq(subscriptions.userId, userId));

  await db
    .update(users)
    .set({
      subscriptionTier: SubscriptionTier.BASIC,
      subscriptionStatus: 'expired',
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
}
