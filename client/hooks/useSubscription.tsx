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
import { Platform, Alert, AppState, AppStateStatus, Linking } from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import { getApiUrl } from "@/lib/query-client";
import { logger } from "@/lib/logger";
import { trackSubscriptionChange } from "@/lib/crash-reporter";
import { SubscriptionTier, TIER_CONFIG } from "@shared/subscription";
import { TrialEndedModal } from "@/components/TrialEndedModal";
import { useStoreKit } from "@/hooks/useStoreKit";

declare global {
  interface Window {
    __subscriptionFetched?: boolean;
    __subscriptionCache?: SubscriptionData | null;
    __subscriptionLastToken?: string | null;
  }
}

type SubscriptionStatus =
  | "trialing"
  | "active"
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
  planType: "monthly" | "annual" | "trial" | null;
  entitlements: Entitlements;
  usage: Usage;
  remaining: {
    pantryItems: number | "unlimited";
    aiRecipes: number | "unlimited";
    cookware: number | "unlimited";
  };
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  paymentFailedAt: string | null;
  gracePeriodEnd: string | null;
  graceDaysRemaining: number | null;
}

export interface LimitCheckResult {
  allowed: boolean;
  remaining: number | "unlimited";
}

export interface SubscriptionContextValue {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  planType: "monthly" | "annual" | "trial" | null;
  isProUser: boolean;
  isTrialUser: boolean;
  isTrialing: boolean;
  isActive: boolean;
  isLoading: boolean;
  trialDaysRemaining: number | null;
  entitlements: Entitlements;
  usage: Usage;
  subscription: SubscriptionData | null;
  isPastDue: boolean;
  graceDaysRemaining: number | null;
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
  maxPantryItems: TIER_CONFIG[SubscriptionTier.PRO].maxPantryItems,
  maxAiRecipes: TIER_CONFIG[SubscriptionTier.PRO].maxAiRecipesPerMonth,
  maxCookware: TIER_CONFIG[SubscriptionTier.PRO].maxCookwareItems,
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
  tier: SubscriptionTier.PRO,
  status: "none",
  planType: null,
  isProUser: false,
  isTrialUser: true,
  isTrialing: false,
  isActive: true,
  isLoading: true,
  trialDaysRemaining: null,
  entitlements: defaultEntitlements,
  usage: defaultUsage,
  subscription: null,
  isPastDue: false,
  graceDaysRemaining: null,
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
  const [showTrialEndedModal, setShowTrialEndedModal] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoringPurchases, setIsRestoringPurchases] = useState(false);
  const [isManaging, setIsManaging] = useState(false);

  const {
    isAvailable: isStoreKitAvailable,
    offerings,
    purchasePackage,
    presentPaywall,
    restorePurchases,
    presentCustomerCenter,
    isCustomerCenterAvailable,
  } = useStoreKit();

  const storeKitPrices = useMemo(() => {
    const shouldUseStoreKit = (Platform.OS === "ios" || Platform.OS === "android") && isStoreKitAvailable;
    if (!shouldUseStoreKit || !offerings?.availablePackages) return null;

    const prices: { proMonthly?: string; proAnnual?: string } = {};
    for (const pkg of offerings.availablePackages) {
      const id = pkg.identifier.toLowerCase();
      const priceStr = pkg.product.priceString;
      if (pkg.packageType === 'MONTHLY' || id.includes('monthly')) {
        prices.proMonthly = priceStr;
      } else if (pkg.packageType === 'ANNUAL' || id.includes('annual')) {
        prices.proAnnual = priceStr;
      }
    }
    return Object.keys(prices).length > 0 ? prices : null;
  }, [isStoreKitAvailable, offerings]);

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
      const baseUrl = getApiUrl();
      const url = new URL("/api/subscriptions/me", baseUrl);

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = (await response.json()).data as any;

        const tierConfig =
          TIER_CONFIG[data.tier as SubscriptionTier] ||
          TIER_CONFIG[SubscriptionTier.PRO];

        const sub: SubscriptionData = {
          tier: data.tier || SubscriptionTier.PRO,
          status: data.status || "none",
          planType: data.planType || null,
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
            pantryItemCount: data.usage?.pantryItemCount || 0,
            aiRecipesUsedThisMonth: data.usage?.aiRecipesUsedThisMonth || 0,
            cookwareCount: data.usage?.cookwareCount || 0,
          },
          remaining: {
            pantryItems: data.remaining?.pantryItems ?? "unlimited",
            aiRecipes: data.remaining?.aiRecipes ?? "unlimited",
            cookware: data.remaining?.cookware ?? "unlimited",
          },
          trialEndsAt: data.trialEndsAt || null,
          currentPeriodEnd: data.currentPeriodEnd || null,
          cancelAtPeriodEnd: data.cancelAtPeriodEnd || false,
          paymentFailedAt: data.paymentFailedAt || null,
          gracePeriodEnd: data.gracePeriodEnd || null,
          graceDaysRemaining: data.graceDaysRemaining ?? null,
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
      } else {
        setSubscriptionData(null);
        if (typeof window !== "undefined") {
          window.__subscriptionCache = null;
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

  const tier = subscriptionData?.tier ?? SubscriptionTier.PRO;
  const status = subscriptionData?.status ?? "none";
  const planType = subscriptionData?.planType ?? null;
  const isProUser = tier === SubscriptionTier.PRO;
  const isTrialUser = status === "trialing";
  const isTrialing = status === "trialing";
  const isPastDue = status === "past_due";
  const graceDaysRemaining = subscriptionData?.graceDaysRemaining ?? null;
  const isActive = status === "active" || status === "trialing" || (isPastDue && graceDaysRemaining !== null && graceDaysRemaining > 0);

  const trialDaysRemaining = useMemo(() => {
    if (!isTrialing || !subscriptionData?.trialEndsAt) return null;
    const trialEnd = new Date(subscriptionData.trialEndsAt);
    const now = new Date();
    const diff = trialEnd.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [isTrialing, subscriptionData?.trialEndsAt]);

  // Handle plan selection from trial ended modal
  const handleSelectPlan = useCallback(
    async (_tier: "pro", plan: "monthly" | "annual") => {
      setIsPurchasing(true);

      try {
        if (Platform.OS === "ios" || Platform.OS === "android") {
          if (!isStoreKitAvailable) {
            Alert.alert(
              "Not Available",
              "In-app purchases are not available on this device. Please try again later.",
              [{ text: "OK" }],
            );
            return;
          }

          let pkg = null;
          if (offerings?.availablePackages) {
            const expectedPackageId = `pro_${plan}`;
            pkg = offerings.availablePackages.find((p) => {
              const id = p.identifier.toLowerCase();
              const matchesType = plan === "monthly"
                ? p.packageType === "MONTHLY"
                : p.packageType === "ANNUAL";
              return (
                id === expectedPackageId ||
                (id.includes("pro") && id.includes(plan)) ||
                (id.includes("pro") && matchesType) ||
                matchesType
              );
            });
          }

          if (pkg) {
            const success = await purchasePackage(pkg);
            if (success) {
              Alert.alert("Success", "Thank you for subscribing to ChefSpAIce!");
              setShowTrialEndedModal(false);
              await forceRefetch();
            }
          } else {
            const result = await presentPaywall();
            if (result === "purchased" || result === "restored") {
              setShowTrialEndedModal(false);
              await forceRefetch();
              Alert.alert("Success", "Thank you for subscribing!");
            }
          }
          return;
        }

        if (Platform.OS === "web") {
          const baseUrl = getApiUrl();

          const pricesResponse = await fetch(
            `${baseUrl}/api/subscriptions/prices`,
          );
          const prices = (await pricesResponse.json()).data as any;

          const priceKey = plan === "monthly" ? "proMonthly" : "proAnnual";
          const fallbackKey = plan === "monthly" ? "monthly" : "annual";
          const priceId = prices[priceKey]?.id || prices[fallbackKey]?.id;

          if (!priceId) {
            Alert.alert(
              "Price Not Available",
              `The ${plan} subscription pricing is not yet configured. Please contact support or try a different option.`,
              [{ text: "OK" }],
            );
            return;
          }

          const response = await fetch(
            `${baseUrl}/api/subscriptions/create-checkout-session`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              credentials: "include",
              body: JSON.stringify({
                priceId,
                tier: "pro",
                successUrl: `${window.location.origin}/subscription-success?session_id={CHECKOUT_SESSION_ID}`,
                cancelUrl: `${window.location.origin}/subscription-canceled`,
              }),
            },
          );

          if (response.ok) {
            const data = (await response.json()).data as any;
            if (data.url) {
              window.location.href = data.url;
            }
          } else {
            const errorBody = await response.json();
            Alert.alert(
              "Error",
              errorBody.error || "Failed to start checkout. Please try again.",
            );
          }
        }
      } catch (error) {
        logger.error("Error starting checkout:", error);
        Alert.alert("Error", "Something went wrong. Please try again later.");
      } finally {
        setIsPurchasing(false);
      }
    },
    [isStoreKitAvailable, offerings, purchasePackage, forceRefetch, token],
  );

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
        const baseUrl = getApiUrl();
        const url = new URL("/api/subscriptions/create-portal-session", baseUrl);
        const response = await fetch(url.toString(), {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        });
        if (response.ok) {
          const data = (await response.json()).data as any;
          if (data.url) {
            (window as Window).location.href = data.url;
          }
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
      isProUser,
      isTrialUser,
      isTrialing,
      isActive,
      isLoading,
      trialDaysRemaining,
      entitlements,
      usage,
      subscription: subscriptionData,
      isPastDue,
      graceDaysRemaining,
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
      isProUser,
      isTrialUser,
      isTrialing,
      isActive,
      isLoading,
      trialDaysRemaining,
      entitlements,
      usage,
      subscriptionData,
      isPastDue,
      graceDaysRemaining,
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
      <TrialEndedModal
        visible={showTrialEndedModal}
        onSelectPlan={handleSelectPlan}
        isLoading={isPurchasing}
        onRestorePurchases={isStoreKitAvailable ? async () => {
          setIsRestoringPurchases(true);
          try {
            const success = await restorePurchases();
            if (success) {
              Alert.alert("Success", "Purchases restored successfully!");
              setShowTrialEndedModal(false);
              await forceRefetch();
            } else {
              Alert.alert("No Purchases Found", "No previous purchases were found to restore.");
            }
          } catch (error) {
            Alert.alert("Error", "Failed to restore purchases. Please try again.");
          } finally {
            setIsRestoringPurchases(false);
          }
        } : undefined}
        isRestoring={isRestoringPurchases}
        storeKitPrices={storeKitPrices}
      />
    </SubscriptionContext.Provider>
  );
}
