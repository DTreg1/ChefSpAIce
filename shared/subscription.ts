export enum SubscriptionTier {
  BASIC = 'BASIC',
  PRO = 'PRO',
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
  [SubscriptionTier.BASIC]: {
    maxPantryItems: 25,
    maxAiRecipesPerMonth: 5,
    maxCookwareItems: 5,
    canCustomizeStorageAreas: false,
    canUseRecipeScanning: false,
    canUseBulkScanning: false,
    canUseAiKitchenAssistant: false,
    canUseWeeklyMealPrepping: false,
  },
  [SubscriptionTier.PRO]: {
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

export const MONTHLY_PRICES = {
  BASIC: 4.99,
  PRO: 9.99,
} as const;

export const ANNUAL_PRICES = {
  BASIC: 49.90,
  PRO: 99.90,
} as const;

export const TRIAL_CONFIG = {
  TRIAL_DAYS: 7,
  TRIAL_TIER: SubscriptionTier.PRO,
} as const;

export function getTierLimits(tier: SubscriptionTier): TierLimits {
  return TIER_CONFIG[tier];
}

export function isWithinLimit(
  tier: SubscriptionTier,
  limitKey: 'maxPantryItems' | 'maxAiRecipesPerMonth' | 'maxCookwareItems',
  currentCount: number
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
  limitKey: 'maxPantryItems' | 'maxAiRecipesPerMonth' | 'maxCookwareItems',
  currentCount: number
): number | 'unlimited' {
  const limits = getTierLimits(tier);
  const limit = limits[limitKey];
  if (limit === -1) {
    return 'unlimited';
  }
  return Math.max(0, limit - currentCount);
}
