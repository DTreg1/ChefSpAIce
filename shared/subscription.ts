export enum SubscriptionTier {
  STANDARD = "STANDARD",
}

export interface TierLimits {
  maxPantryItems: number;
  maxAiRecipesPerMonth: number;
  maxCookwareItems: number;
  canCustomizeStorageAreas: boolean;
  canUseRecipeScanning: boolean;
  canUseBulkScanning: boolean;
  canUseAiKitchenAssistant: boolean;
  canUseWeeklyMealPrepping: boolean;
}

export const TIER_CONFIG: Record<SubscriptionTier, TierLimits> = {
  [SubscriptionTier.STANDARD]: {
    maxPantryItems: -1,
    maxAiRecipesPerMonth: -1,
    maxCookwareItems: -1,
    canCustomizeStorageAreas: true,
    canUseRecipeScanning: true,
    canUseBulkScanning: true,
    canUseAiKitchenAssistant: true,
    canUseWeeklyMealPrepping: true,
  },
};

export const MONTHLY_PRICE = 9.99;
export const ANNUAL_PRICE = 99.90;

export const MONTHLY_PRICES = {
  STANDARD: MONTHLY_PRICE,
} as const;

export const ANNUAL_PRICES = {
  STANDARD: ANNUAL_PRICE,
} as const;

export function getTierLimits(tier: SubscriptionTier): TierLimits {
  return TIER_CONFIG[tier];
}

export function isWithinLimit(
  tier: SubscriptionTier,
  limitKey: "maxPantryItems" | "maxAiRecipesPerMonth" | "maxCookwareItems",
  currentCount: number,
): boolean {
  const limits = getTierLimits(tier);
  const limit = limits[limitKey];
  if (limit === -1) {
    return true;
  }
  return currentCount < limit;
}

export function getRemainingQuota(
  tier: SubscriptionTier,
  limitKey: "maxPantryItems" | "maxAiRecipesPerMonth" | "maxCookwareItems",
  currentCount: number,
): number | "unlimited" {
  const limits = getTierLimits(tier);
  const limit = limits[limitKey];
  if (limit === -1) {
    return "unlimited";
  }
  return Math.max(0, limit - currentCount);
}

export const ERROR_CODES = {
  PANTRY_LIMIT_REACHED: "PANTRY_LIMIT_REACHED",
  COOKWARE_LIMIT_REACHED: "COOKWARE_LIMIT_REACHED",
  AI_RECIPE_LIMIT_REACHED: "AI_RECIPE_LIMIT_REACHED",
  FEATURE_NOT_AVAILABLE: "FEATURE_NOT_AVAILABLE",
} as const;

export const ERROR_MESSAGES: Record<string, string> = {
  [ERROR_CODES.PANTRY_LIMIT_REACHED]:
    "Subscribe to ChefSpAIce to add pantry items.",
  [ERROR_CODES.COOKWARE_LIMIT_REACHED]:
    "Subscribe to ChefSpAIce to add cookware.",
  [ERROR_CODES.AI_RECIPE_LIMIT_REACHED]:
    "Subscribe to ChefSpAIce to generate AI recipes.",
  [ERROR_CODES.FEATURE_NOT_AVAILABLE]:
    "Subscribe to ChefSpAIce to unlock this feature.",
};
