import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  ReactNode,
} from "react";
import { Platform, AppState, AppStateStatus, Linking } from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/lib/api-client";
import { logger } from "@/lib/logger";
import { trackSubscriptionChange } from "@/lib/crash-reporter";
import { SubscriptionTier, TIER_CONFIG } from "@shared/subscription";
import { useStoreKit } from "@/hooks/useStoreKit";

declare global {
  interface Window {
    __subscriptionFetched?: boolean;
    __subscriptionCache?: SubscriptionData | null;
    __subscriptionLastToken?: string | null;
  }
}

type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "expired"
  | "none";

interface Entitlements {
  maxPantryItems: number | "unlimited";
  maxAiRecipes: number | "unlimited";
  maxCookware: number | "unlimited";
  canCustomizeStorageAreas: boolean;
  canUseRecipeScanning: boolean;
  canUseBulkScanning: boolean;
  canUseAiKitchenAssistant: boolean;
  canUseWeeklyMealPrepping: boolean;
}

interface Usage {
  pantryItemCount: number;
  aiRecipesUsedThisMonth: number;
  cookwareCount: number;
}

export interface SubscriptionData {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  planType: "monthly" | "annual" | null;
  entitlements: Entitlements;
  usage: Usage;
  remaining: {
    pantryItems: number | "unlimited";
    aiRecipes: number | "unlimited";
    cookware: number | "unlimited";
  };
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  paymentFailedAt: string | null;
  gracePeriodEnd: string | null;
  graceDaysRemaining: number | null;
  trialEnd: string | null;
  trialDaysRemaining: number | null;
}

export interface LimitCheckResult {
  allowed: boolean;
  remaining: number | "unlimited";
}

export interface SubscriptionContextValue {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  planType: "monthly" | "annual" | null;
  isStandardUser: boolean;
  isActive: boolean;
  isLoading: boolean;
  entitlements: Entitlements;
  usage: Usage;
  subscription: SubscriptionData | null;
  isPastDue: boolean;
  graceDaysRemaining: number | null;
  trialEnd: string | null;
  trialDaysRemaining: number | null;
  isTrialing: boolean;
  checkLimit: (
    type: "pantryItems" | "aiRecipes" | "cookware",
  ) => LimitCheckResult;
  checkFeature: (
    feature: keyof Omit<
      Entitlements,
      "maxPantryItems" | "maxAiRecipes" | "maxCookware"
    >,
  ) => boolean;
  refetch: () => Promise<void>;
  handleManageSubscription: () => Promise<void>;
  isManaging: boolean;
}

const defaultEntitlements: Entitlements = {
  maxPantryItems: TIER_CONFIG[SubscriptionTier.STANDARD].maxPantryItems,
  maxAiRecipes: TIER_CONFIG[SubscriptionTier.STANDARD].maxAiRecipesPerMonth,
  maxCookware: TIER_CONFIG[SubscriptionTier.STANDARD].maxCookwareItems,
  canCustomizeStorageAreas: false,
  canUseRecipeScanning: false,
  canUseBulkScanning: false,
  canUseAiKitchenAssistant: false,
  canUseWeeklyMealPrepping: false,
};

const defaultUsage: Usage = {
  pantryItemCount: 0,
  aiRecipesUsedThisMonth: 0,
  cookwareCount: 0,
};

const SubscriptionContext = createContext<SubscriptionContextValue>({
  tier: SubscriptionTier.STANDARD,
  status: "none",
  planType: null,
  isStandardUser: false,
  isActive: true,
  isLoading: true,
  entitlements: defaultEntitlements,
  usage: defaultUsage,
  subscription: null,
  isPastDue: false,
  graceDaysRemaining: null,
  trialEnd: null,
  trialDaysRemaining: null,
  isTrialing: false,
  checkLimit: () => ({ allowed: true, remaining: "unlimited" }),
  checkFeature: () => false,
  refetch: async () => {},
  handleManageSubscription: async () => {},
  isManaging: false,
});

export function useSubscription(): SubscriptionContextValue {
  return useContext(SubscriptionContext);
}

interface SubscriptionProviderProps {
  children: ReactNode;
}

const STALE_TIME_MS = 5 * 60 * 1000;

export function SubscriptionProvider({ children }: SubscriptionProviderProps) {
  const { isAuthenticated, token } = useAuth();

  const hasFetched =
    typeof window !== "undefined" && window.__subscriptionFetched;
  const cachedSub =
    typeof window !== "undefined" ? window.__subscriptionCache : null;

  const [subscriptionData, setSubscriptionData] =
    useState<SubscriptionData | null>(cachedSub || null);
  const [isLoading, setIsLoading] = useState(!hasFetched);
  const [isManaging, setIsManaging] = useState(false);

  const {
    presentCustomerCenter,
    isCustomerCenterAvailable,
  } = useStoreKit();

  const lastFetchRef = useRef<number>(0);
  const lastTrackedSubRef = useRef<string>("");
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const backgroundTimestampRef = useRef<number>(0);

  const performFetch = useCallback(async () => {
    if (!isAuthenticated || !token) {
      setSubscriptionData(null);
      if (typeof window !== "undefined") {
        window.__subscriptionCache = null;
      }
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const data = await apiClient.get<{
        tier?: SubscriptionTier;
        status?: SubscriptionStatus;
        planType?: "monthly" | "annual" | null;
        usage?: Usage;
        remaining?: {
          pantryItems: number | "unlimited";
          aiRecipes: number | "unlimited";
          cookware: number | "unlimited";
        };
        currentPeriodEnd?: string | null;
        cancelAtPeriodEnd?: boolean;
        paymentFailedAt?: string | null;
        gracePeriodEnd?: string | null;
        graceDaysRemaining?: number | null;
        trialEnd?: string | null;
        trialDaysRemaining?: number | null;
      }>("/api/subscriptions/me");
      if (data) {

        const tierConfig =
          TIER_CONFIG[data.tier ?? SubscriptionTier.STANDARD] ||
          TIER_CONFIG[SubscriptionTier.STANDARD];

        const sub: SubscriptionData = {
          tier: data.tier ?? SubscriptionTier.STANDARD,
          status: data.status ?? "none",
          planType: data.planType ?? null,
          entitlements: {
            maxPantryItems:
              tierConfig.maxPantryItems === -1
                ? "unlimited"
                : tierConfig.maxPantryItems,
            maxAiRecipes:
              tierConfig.maxAiRecipesPerMonth === -1
                ? "unlimited"
                : tierConfig.maxAiRecipesPerMonth,
            maxCookware:
              tierConfig.maxCookwareItems === -1
                ? "unlimited"
                : tierConfig.maxCookwareItems,
            canCustomizeStorageAreas: tierConfig.canCustomizeStorageAreas,
            canUseRecipeScanning: tierConfig.canUseRecipeScanning,
            canUseBulkScanning: tierConfig.canUseBulkScanning,
            canUseAiKitchenAssistant: tierConfig.canUseAiKitchenAssistant,
            canUseWeeklyMealPrepping: tierConfig.canUseWeeklyMealPrepping,
          },
          usage: {
            pantryItemCount: data.usage?.pantryItemCount ?? 0,
            aiRecipesUsedThisMonth: data.usage?.aiRecipesUsedThisMonth ?? 0,
            cookwareCount: data.usage?.cookwareCount ?? 0,
          },
          remaining: {
            pantryItems: data.remaining?.pantryItems ?? "unlimited",
            aiRecipes: data.remaining?.aiRecipes ?? "unlimited",
            cookware: data.remaining?.cookware ?? "unlimited",
          },
          currentPeriodEnd: data.currentPeriodEnd ?? null,
          cancelAtPeriodEnd: data.cancelAtPeriodEnd ?? false,
          paymentFailedAt: data.paymentFailedAt ?? null,
          gracePeriodEnd: data.gracePeriodEnd ?? null,
          graceDaysRemaining: data.graceDaysRemaining ?? null,
          trialEnd: data.trialEnd ?? null,
          trialDaysRemaining: data.trialDaysRemaining ?? null,
        };

        setSubscriptionData(sub);
        if (typeof window !== "undefined") {
          window.__subscriptionCache = sub;
        }

        const subKey = `${sub.tier}:${sub.status}:${sub.planType}`;
        if (subKey !== lastTrackedSubRef.current) {
          lastTrackedSubRef.current = subKey;
          trackSubscriptionChange({
            tier: sub.tier,
            status: sub.status,
            planType: sub.planType,
          });
        }
      }
    } catch (error) {
      logger.error(
        "Error fetching subscription:",
        error instanceof Error ? error.message : error,
      );
      setSubscriptionData(null);
      if (typeof window !== "undefined") {
        window.__subscriptionCache = null;
      }
    } finally {
      lastFetchRef.current = Date.now();
      setIsLoading(false);
    }
  }, [isAuthenticated, token]);

  const forceRefetch = useCallback(async () => {
    lastFetchRef.current = 0;
    await performFetch();
  }, [performFetch]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (
        window.__subscriptionFetched &&
        window.__subscriptionLastToken === token
      ) {
        setIsLoading(false);
        return;
      }
      window.__subscriptionFetched = true;
      window.__subscriptionLastToken = token;
    }
    lastFetchRef.current = 0;
    performFetch();
  }, [token, performFetch]);

  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextState === "active"
      ) {
        const elapsed = Date.now() - backgroundTimestampRef.current;
        if (elapsed >= STALE_TIME_MS) {
          forceRefetch();
        }
      } else if (nextState.match(/inactive|background/)) {
        backgroundTimestampRef.current = Date.now();
      }
      appStateRef.current = nextState;
    };

    const subscription = AppState.addEventListener("change", handleAppStateChange);
    return () => subscription.remove();
  }, [forceRefetch]);

  const tier = subscriptionData?.tier ?? SubscriptionTier.STANDARD;
  const status = subscriptionData?.status ?? "none";
  const planType = subscriptionData?.planType ?? null;
  const isStandardUser = tier === SubscriptionTier.STANDARD;
  const isPastDue = status === "past_due";
  const graceDaysRemaining = subscriptionData?.graceDaysRemaining ?? null;
  const isActive = status === "active" || status === "trialing" || (isPastDue && graceDaysRemaining !== null && graceDaysRemaining > 0);
  const isTrialing = status === "trialing";
  const trialEnd = subscriptionData?.trialEnd ?? null;
  const trialDaysRemaining = subscriptionData?.trialDaysRemaining ?? null;

  const entitlements = subscriptionData?.entitlements ?? defaultEntitlements;
  const usage = subscriptionData?.usage ?? defaultUsage;

  const checkLimit = useCallback(
    (type: "pantryItems" | "aiRecipes" | "cookware"): LimitCheckResult => {
      const remaining = subscriptionData?.remaining?.[type];

      if (remaining === "unlimited") {
        return { allowed: true, remaining: "unlimited" };
      }

      const remainingNum = typeof remaining === "number" ? remaining : 0;
      return {
        allowed: remainingNum > 0,
        remaining: remainingNum,
      };
    },
    [subscriptionData?.remaining],
  );

  const checkFeature = useCallback(
    (
      feature: keyof Omit<
        Entitlements,
        "maxPantryItems" | "maxAiRecipes" | "maxCookware"
      >,
    ): boolean => {
      return entitlements[feature] === true;
    },
    [entitlements],
  );

  const handleManageSubscription = useCallback(async () => {
    setIsManaging(true);
    try {
      if (isCustomerCenterAvailable) {
        try {
          await presentCustomerCenter();
          return;
        } catch (error) {
          logger.error("Error opening customer center:", error);
        }
      }
      if (Platform.OS === "ios") {
        Linking.openURL("https://apps.apple.com/account/subscriptions");
        return;
      }
      if (Platform.OS === "android") {
        Linking.openURL("https://play.google.com/store/account/subscriptions");
        return;
      }
      try {
        const data = await apiClient.post<{ url?: string }>("/api/subscriptions/create-portal-session", {});
        if (data.url) {
          (window as Window).location.href = data.url;
        }
      } catch (error) {
        logger.error("Error opening subscription portal:", error);
      }
    } finally {
      setIsManaging(false);
    }
  }, [isCustomerCenterAvailable, presentCustomerCenter, token]);

  const value = useMemo<SubscriptionContextValue>(
    () => ({
      tier,
      status,
      planType,
      isStandardUser,
      isActive,
      isLoading,
      entitlements,
      usage,
      subscription: subscriptionData,
      isPastDue,
      graceDaysRemaining,
      trialEnd,
      trialDaysRemaining,
      isTrialing,
      checkLimit,
      checkFeature,
      refetch: forceRefetch,
      handleManageSubscription,
      isManaging,
    }),
    [
      tier,
      status,
      planType,
      isStandardUser,
      isActive,
      isLoading,
      entitlements,
      usage,
      subscriptionData,
      isPastDue,
      graceDaysRemaining,
      trialEnd,
      trialDaysRemaining,
      isTrialing,
      checkLimit,
      checkFeature,
      forceRefetch,
      handleManageSubscription,
      isManaging,
    ],
  );

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}
