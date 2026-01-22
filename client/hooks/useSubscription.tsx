import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import { Platform, Alert } from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import { getApiUrl } from "@/lib/query-client";
import { SubscriptionTier, TIER_CONFIG } from "../../shared/subscription";
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
  isTrialing: boolean;
  isActive: boolean;
  isLoading: boolean;
  isTrialExpired: boolean;
  trialDaysRemaining: number | null;
  entitlements: Entitlements;
  usage: Usage;
  subscription: SubscriptionData | null;
  isPastDue: boolean;
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
}

const defaultEntitlements: Entitlements = {
  maxPantryItems: TIER_CONFIG[SubscriptionTier.BASIC].maxPantryItems,
  maxAiRecipes: TIER_CONFIG[SubscriptionTier.BASIC].maxAiRecipesPerMonth,
  maxCookware: TIER_CONFIG[SubscriptionTier.BASIC].maxCookwareItems,
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
  tier: SubscriptionTier.BASIC,
  status: "none",
  planType: null,
  isProUser: false,
  isTrialing: false,
  isActive: false,
  isLoading: true,
  isTrialExpired: false,
  trialDaysRemaining: null,
  entitlements: defaultEntitlements,
  usage: defaultUsage,
  subscription: null,
  isPastDue: false,
  checkLimit: () => ({ allowed: true, remaining: "unlimited" }),
  checkFeature: () => false,
  refetch: async () => {},
});

export function useSubscription(): SubscriptionContextValue {
  return useContext(SubscriptionContext);
}

interface SubscriptionProviderProps {
  children: ReactNode;
}

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

  const {
    isAvailable: isStoreKitAvailable,
    offerings,
    purchasePackage,
  } = useStoreKit();

  const fetchSubscription = useCallback(async () => {
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
        const data = await response.json();

        const tierConfig =
          TIER_CONFIG[data.tier as SubscriptionTier] ||
          TIER_CONFIG[SubscriptionTier.BASIC];

        const sub: SubscriptionData = {
          tier: data.tier || SubscriptionTier.BASIC,
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
        };

        setSubscriptionData(sub);
        if (typeof window !== "undefined") {
          window.__subscriptionCache = sub;
        }
      } else {
        setSubscriptionData(null);
        if (typeof window !== "undefined") {
          window.__subscriptionCache = null;
        }
      }
    } catch (error) {
      console.error(
        "Error fetching subscription:",
        error instanceof Error ? error.message : error,
      );
      setSubscriptionData(null);
      if (typeof window !== "undefined") {
        window.__subscriptionCache = null;
      }
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, token]);

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
    fetchSubscription();
  }, [token, fetchSubscription]);

  const tier = subscriptionData?.tier ?? SubscriptionTier.BASIC;
  const status = subscriptionData?.status ?? "none";
  const planType = subscriptionData?.planType ?? null;
  const isProUser = tier === SubscriptionTier.PRO;
  const isTrialing = status === "trialing";
  const isActive = status === "active" || status === "trialing";
  const isPastDue = status === "past_due";
  const isTrialExpired =
    status === "expired" || (planType === "trial" && status === "canceled");

  const trialDaysRemaining = useMemo(() => {
    if (!isTrialing || !subscriptionData?.trialEndsAt) return null;
    const trialEnd = new Date(subscriptionData.trialEndsAt);
    const now = new Date();
    const diff = trialEnd.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [isTrialing, subscriptionData?.trialEndsAt]);

  // Show trial ended modal when trial expires
  useEffect(() => {
    if (isTrialExpired && !isLoading && isAuthenticated) {
      setShowTrialEndedModal(true);
    }
  }, [isTrialExpired, isLoading, isAuthenticated]);

  // Handle plan selection from trial ended modal
  const handleSelectPlan = useCallback(
    async (tier: "basic" | "pro", plan: "monthly" | "annual") => {
      setIsPurchasing(true);
      const tierName = tier === "pro" ? "Pro" : "Basic";

      try {
        if (Platform.OS === "ios" || Platform.OS === "android") {
          const shouldUseStoreKit = isStoreKitAvailable && offerings;

          if (!shouldUseStoreKit) {
            Alert.alert(
              "Not Available",
              "In-app purchases are not available. Please try again later or contact support.",
              [{ text: "OK" }],
            );
            return;
          }

          const expectedPackageId = `${tier}_${plan}`;
          const pkg = offerings.availablePackages.find((p) => {
            const id = p.identifier.toLowerCase();
            return (
              id === expectedPackageId ||
              (id.includes(tier) && id.includes(plan)) ||
              (id.includes(tier) &&
                p.packageType === (plan === "monthly" ? "MONTHLY" : "ANNUAL"))
            );
          });

          if (!pkg) {
            Alert.alert(
              "Package Not Available",
              `The ${tierName} ${plan} subscription is not yet configured. Please contact support or try a different option.`,
              [{ text: "OK" }],
            );
            return;
          }

          const success = await purchasePackage(pkg);
          if (success) {
            Alert.alert("Success", `Thank you for subscribing to ${tierName}!`);
            setShowTrialEndedModal(false);
            await fetchSubscription();
          }
          return;
        }

        if (Platform.OS === "web") {
          const baseUrl = getApiUrl();

          const pricesResponse = await fetch(
            `${baseUrl}/api/subscriptions/prices`,
          );
          const prices = await pricesResponse.json();

          const priceKey =
            tier === "pro"
              ? plan === "monthly"
                ? "proMonthly"
                : "proAnnual"
              : plan === "monthly"
                ? "basicMonthly"
                : "basicAnnual";
          const priceId = prices[priceKey]?.id;

          if (!priceId) {
            Alert.alert(
              "Price Not Available",
              `The ${tierName} ${plan} subscription pricing is not yet configured. Please contact support or try a different option.`,
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
                tier,
                successUrl: `${window.location.origin}/subscription-success?session_id={CHECKOUT_SESSION_ID}`,
                cancelUrl: `${window.location.origin}/subscription-canceled`,
              }),
            },
          );

          if (response.ok) {
            const data = await response.json();
            if (data.url) {
              window.location.href = data.url;
            }
          } else {
            const errorData = await response.json();
            Alert.alert(
              "Error",
              errorData.error || "Failed to start checkout. Please try again.",
            );
          }
        }
      } catch (error) {
        console.error("Error starting checkout:", error);
        Alert.alert("Error", "Something went wrong. Please try again later.");
      } finally {
        setIsPurchasing(false);
      }
    },
    [isStoreKitAvailable, offerings, purchasePackage, fetchSubscription, token],
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

  const value = useMemo<SubscriptionContextValue>(
    () => ({
      tier,
      status,
      planType,
      isProUser,
      isTrialing,
      isActive,
      isLoading,
      isTrialExpired,
      trialDaysRemaining,
      entitlements,
      usage,
      subscription: subscriptionData,
      isPastDue,
      checkLimit,
      checkFeature,
      refetch: fetchSubscription,
    }),
    [
      tier,
      status,
      planType,
      isProUser,
      isTrialing,
      isActive,
      isLoading,
      isTrialExpired,
      trialDaysRemaining,
      entitlements,
      usage,
      subscriptionData,
      isPastDue,
      checkLimit,
      checkFeature,
      fetchSubscription,
    ],
  );

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
      <TrialEndedModal
        visible={showTrialEndedModal}
        onSelectPlan={handleSelectPlan}
        isLoading={isPurchasing}
      />
    </SubscriptionContext.Provider>
  );
}
