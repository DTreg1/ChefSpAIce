import { useState, useCallback } from "react";
import { useSubscription } from "@/hooks/useSubscription";

type UpsellReason =
  | { type: "limit"; limitName: string; remaining: number; max: number }
  | { type: "feature"; featureName: string };

interface UseUpsellTriggerReturn {
  showUpgrade: boolean;
  upsellReason: UpsellReason | null;
  checkLimitOrUpsell: (
    type: "pantryItems" | "aiRecipes" | "cookware",
    displayName: string,
  ) => boolean;
  checkFeatureOrUpsell: (
    feature:
      | "canCustomizeStorageAreas"
      | "canUseRecipeScanning"
      | "canUseBulkScanning"
      | "canUseAiKitchenAssistant"
      | "canUseWeeklyMealPrepping",
    displayName: string,
  ) => boolean;
  dismissUpgrade: () => void;
  triggerUpgrade: (reason: UpsellReason) => void;
}

const limitToEntitlementKey = {
  pantryItems: "maxPantryItems",
  aiRecipes: "maxAiRecipes",
  cookware: "maxCookware",
} as const;

export function useUpsellTrigger(): UseUpsellTriggerReturn {
  const { checkLimit, checkFeature, entitlements } = useSubscription();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upsellReason, setUpsellReason] = useState<UpsellReason | null>(null);

  const checkLimitOrUpsell = useCallback(
    (
      type: "pantryItems" | "aiRecipes" | "cookware",
      displayName: string,
    ): boolean => {
      const entitlementKey = limitToEntitlementKey[type];
      const maxValue = entitlements[entitlementKey];

      if (maxValue === "unlimited") {
        return true;
      }

      const result = checkLimit(type);
      if (result.allowed) {
        return true;
      }

      const remaining =
        typeof result.remaining === "number" ? result.remaining : 0;

      setUpsellReason({
        type: "limit",
        limitName: displayName,
        remaining,
        max: maxValue as number,
      });
      setShowUpgrade(true);
      return false;
    },
    [checkLimit, entitlements],
  );

  const checkFeatureOrUpsell = useCallback(
    (
      feature:
        | "canCustomizeStorageAreas"
        | "canUseRecipeScanning"
        | "canUseBulkScanning"
        | "canUseAiKitchenAssistant"
        | "canUseWeeklyMealPrepping",
      displayName: string,
    ): boolean => {
      if (checkFeature(feature)) {
        return true;
      }

      setUpsellReason({
        type: "feature",
        featureName: displayName,
      });
      setShowUpgrade(true);
      return false;
    },
    [checkFeature],
  );

  const dismissUpgrade = useCallback(() => {
    setShowUpgrade(false);
    setUpsellReason(null);
  }, []);

  const triggerUpgrade = useCallback((reason: UpsellReason) => {
    setUpsellReason(reason);
    setShowUpgrade(true);
  }, []);

  return {
    showUpgrade,
    upsellReason,
    checkLimitOrUpsell,
    checkFeatureOrUpsell,
    dismissUpgrade,
    triggerUpgrade,
  };
}

export default useUpsellTrigger;
