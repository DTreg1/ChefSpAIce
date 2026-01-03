import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../lib/query-client";
import { SubscriptionTier, TIER_CONFIG, TierLimits } from "../../shared/subscription";

interface SubscriptionEntitlements {
  tier: SubscriptionTier;
  status: string;
  entitlements: TierLimits;
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
  trialEndsAt: string | null;
}

interface LimitCheckResult {
  allowed: boolean;
  current: number;
  limit: number | null;
  remaining: number | null;
  upgradeRequired: boolean;
  tier: SubscriptionTier;
}

interface FeatureCheckResult {
  allowed: boolean;
  upgradeRequired: boolean;
}

interface UpgradeResult {
  sessionId: string;
  url: string;
}

export function useSubscription() {
  const queryClient = useQueryClient();

  const { data: subscription, isLoading, error, refetch } = useQuery<SubscriptionEntitlements>({
    queryKey: ["/api/subscriptions/me"],
    staleTime: 30 * 1000,
    retry: 1,
  });

  const checkLimitMutation = useMutation<LimitCheckResult, Error, string>({
    mutationFn: async (limitType: string) => {
      const response = await apiRequest("GET", `/api/subscriptions/check-limit/${limitType}`);
      return response.json();
    },
  });

  const checkFeatureMutation = useMutation<FeatureCheckResult, Error, string>({
    mutationFn: async (feature: string) => {
      const response = await apiRequest("GET", `/api/subscriptions/check-feature/${feature}`);
      return response.json();
    },
  });

  const upgradeMutation = useMutation<UpgradeResult, Error, { billingPeriod?: "monthly" | "annual" }>({
    mutationFn: async ({ billingPeriod = "monthly" }) => {
      const response = await apiRequest("POST", "/api/subscriptions/upgrade", { billingPeriod });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions/me"] });
    },
  });

  const tier = subscription?.tier ?? SubscriptionTier.BASIC;
  const limits = TIER_CONFIG[tier];
  const features = TIER_CONFIG[tier];

  const isOnTrial = subscription?.status === "trialing";
  const isActive = subscription?.status === "active" || isOnTrial;
  const isPro = tier === SubscriptionTier.PRO;
  const isBasic = tier === SubscriptionTier.BASIC;

  const canAddPantryItem = () => {
    if (limits.maxPantryItems === -1) return true;
    return (subscription?.usage?.pantryItemCount ?? 0) < limits.maxPantryItems;
  };

  const canGenerateAiRecipe = () => {
    if (limits.maxAiRecipesPerMonth === -1) return true;
    return (subscription?.usage?.aiRecipesUsedThisMonth ?? 0) < limits.maxAiRecipesPerMonth;
  };

  const canAddCookware = () => {
    if (limits.maxCookwareItems === -1) return true;
    return (subscription?.usage?.cookwareCount ?? 0) < limits.maxCookwareItems;
  };

  const featureKeyMap: Record<string, keyof TierLimits> = {
    recipeScanning: "canUseRecipeScanning",
    bulkScanning: "canUseBulkScanning",
    aiKitchenAssistant: "canUseAiKitchenAssistant",
    weeklyMealPrepping: "canUseWeeklyMealPrepping",
    customStorageAreas: "canCustomizeStorageAreas",
  };

  const hasFeature = (feature: string) => {
    const key = featureKeyMap[feature];
    if (!key) return false;
    return features[key] === true;
  };

  const checkLimit = async (limitType: "pantryItems" | "aiRecipes" | "cookware") => {
    return checkLimitMutation.mutateAsync(limitType);
  };

  const checkFeature = async (
    feature: "recipeScanning" | "bulkScanning" | "aiKitchenAssistant" | "weeklyMealPrepping" | "customStorageAreas"
  ) => {
    return checkFeatureMutation.mutateAsync(feature);
  };

  const upgrade = async (billingPeriod: "monthly" | "annual" = "monthly") => {
    return upgradeMutation.mutateAsync({ billingPeriod });
  };

  return {
    tier,
    status: subscription?.status ?? "none",
    limits,
    features,
    usage: subscription?.usage,
    remaining: subscription?.remaining,
    trialEndsAt: subscription?.trialEndsAt ? new Date(subscription.trialEndsAt) : null,
    isLoading,
    error,
    refetch,
    isOnTrial,
    isActive,
    isPro,
    isBasic,
    canAddPantryItem,
    canGenerateAiRecipe,
    canAddCookware,
    hasFeature,
    checkLimit,
    checkFeature,
    upgrade,
    isCheckingLimit: checkLimitMutation.isPending,
    isCheckingFeature: checkFeatureMutation.isPending,
    isUpgrading: upgradeMutation.isPending,
  };
}
