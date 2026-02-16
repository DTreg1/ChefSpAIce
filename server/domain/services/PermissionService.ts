import type { Permission } from "@shared/domain/entities";
import {
  getUserEntitlements,
  checkFeatureAccess as checkFeatureAccessService,
  checkPantryItemLimit,
  checkAiRecipeLimit,
  checkCookwareLimit,
} from "../../services/subscriptionService";
import { db } from "../../db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

export async function getUserPermission(userId: string): Promise<Permission> {
  const [entitlements, user] = await Promise.all([
    getUserEntitlements(userId),
    db.select().from(users).where(eq(users.id, userId)).limit(1).then(rows => rows[0]),
  ]);

  if (!user) {
    throw new Error("User not found");
  }

  return {
    tier: entitlements.tier,
    limits: entitlements.limits,
    isAdmin: user.isAdmin ?? false,
  };
}

export async function canAccessFeature(
  userId: string,
  feature: string
): Promise<boolean> {
  return checkFeatureAccessService(
    userId,
    feature as Parameters<typeof checkFeatureAccessService>[1]
  );
}

const limitCheckMap = {
  maxPantryItems: checkPantryItemLimit,
  maxAiRecipesPerMonth: checkAiRecipeLimit,
  maxCookwareItems: checkCookwareLimit,
} as const;

const usageKeyMap = {
  maxPantryItems: "pantryItemCount",
  maxAiRecipesPerMonth: "aiRecipesUsedThisMonth",
  maxCookwareItems: "cookwareCount",
} as const;

export async function checkLimit(
  userId: string,
  limitKey: "maxPantryItems" | "maxAiRecipesPerMonth" | "maxCookwareItems"
): Promise<{ allowed: boolean; current: number; limit: number | null }> {
  const [limitResult, entitlements] = await Promise.all([
    limitCheckMap[limitKey](userId),
    getUserEntitlements(userId),
  ]);

  const current = entitlements.usage[usageKeyMap[limitKey]];
  const limit = limitResult.limit === "unlimited" ? null : limitResult.limit;

  return {
    allowed: limitResult.allowed,
    current,
    limit,
  };
}
