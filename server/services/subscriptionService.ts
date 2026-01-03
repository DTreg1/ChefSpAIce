import { db } from "../db";
import { users, userSyncData } from "@shared/schema";
import { eq } from "drizzle-orm";
import {
  SubscriptionTier,
  TierLimits,
  TIER_CONFIG,
  getTierLimits,
  isWithinLimit,
  getRemainingQuota,
} from "@shared/subscription";

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

function parseJsonArray(jsonString: string | null): any[] {
  if (!jsonString) return [];
  try {
    return JSON.parse(jsonString);
  } catch {
    return [];
  }
}

export async function getUserEntitlements(
  userId: string
): Promise<UserEntitlements> {
  const user = await getUserById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  await resetMonthlyCountsIfNeeded(userId);

  const refreshedUser = await getUserById(userId);
  if (!refreshedUser) {
    throw new Error("User not found after refresh");
  }

  const syncData = await getUserSyncData(userId);

  const tier = (refreshedUser.subscriptionTier as SubscriptionTier) || SubscriptionTier.BASIC;
  const limits = getTierLimits(tier);

  const inventory = parseJsonArray(syncData?.inventory || null);
  const cookware = parseJsonArray(syncData?.cookware || null);

  const pantryItemCount = inventory.length;
  const cookwareCount = cookware.length;
  const aiRecipesUsedThisMonth = refreshedUser.aiRecipesGeneratedThisMonth || 0;

  return {
    tier,
    status: refreshedUser.subscriptionStatus || "trialing",
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
    trialEndsAt: refreshedUser.trialEndsAt,
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
  await resetMonthlyCountsIfNeeded(userId);

  const user = await getUserById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  const tier = (user.subscriptionTier as SubscriptionTier) || SubscriptionTier.BASIC;
  const limits = getTierLimits(tier);
  const currentCount = user.aiRecipesGeneratedThisMonth || 0;

  const limit = limits.maxAiRecipesPerMonth === -1 ? "unlimited" : limits.maxAiRecipesPerMonth;
  const remaining = getRemainingQuota(tier, "maxAiRecipesPerMonth", currentCount);
  const allowed = isWithinLimit(tier, "maxAiRecipesPerMonth", currentCount);

  return { allowed, remaining, limit };
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
    .update(users)
    .set({
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
    await db
      .update(users)
      .set({
        subscriptionStatus: "expired",
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
    return true;
  }

  return false;
}
