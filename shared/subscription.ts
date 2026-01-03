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

export const STRIPE_PRICE_IDS = {
  BASIC_MONTHLY: 'price_basic_monthly_placeholder',
  BASIC_ANNUAL: 'price_basic_annual_placeholder',
  PRO_MONTHLY: 'price_pro_monthly_placeholder',
  PRO_ANNUAL: 'price_pro_annual_placeholder',
} as const;

export function getTierLimits(tier: SubscriptionTier): TierLimits {
  return TIER_CONFIG[tier];
}

export function isFeatureEnabled(tier: SubscriptionTier, feature: keyof TierLimits): boolean {
  const limits = getTierLimits(tier);
  const value = limits[feature];
  if (typeof value === 'boolean') {
    return value;
  }
  return true;
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

export const FEATURE_NAMES: Record<string, string> = {
  canCustomizeStorageAreas: 'Custom Storage Areas',
  canUseRecipeScanning: 'Recipe Scanning',
  canUseBulkScanning: 'Bulk Scanning',
  canUseAiKitchenAssistant: 'Live AI Kitchen Assistant',
  canUseWeeklyMealPrepping: 'Weekly Meal Prepping',
};

export const LIMIT_NAMES: Record<string, string> = {
  maxPantryItems: 'Pantry Items',
  maxAiRecipesPerMonth: 'AI Generated Recipes',
  maxCookwareItems: 'Cookware Items',
};
