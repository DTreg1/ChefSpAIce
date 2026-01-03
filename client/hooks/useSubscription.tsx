import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/contexts/AuthContext";
import { getApiUrl } from "@/lib/query-client";
import { SubscriptionTier, TierLimits, TIER_CONFIG } from "../../shared/subscription";
import { TrialEndedModal } from "@/components/TrialEndedModal";
import { Linking } from "react-native";

const TRIAL_ENDED_DISMISSED_KEY = "trial_ended_dismissed";

declare global {
  interface Window {
    __subscriptionFetched?: boolean;
    __subscriptionCache?: SubscriptionData | null;
    __subscriptionLastToken?: string | null;
  }
}

export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired' | 'none';

export interface Entitlements {
  maxPantryItems: number | 'unlimited';
  maxAiRecipes: number | 'unlimited';
  maxCookware: number | 'unlimited';
  canCustomizeStorageAreas: boolean;
  canUseRecipeScanning: boolean;
  canUseBulkScanning: boolean;
  canUseAiKitchenAssistant: boolean;
  canUseWeeklyMealPrepping: boolean;
}

export interface Usage {
  pantryItemCount: number;
  aiRecipesUsedThisMonth: number;
  cookwareCount: number;
}

export interface SubscriptionData {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  planType: 'monthly' | 'annual' | 'trial' | null;
  entitlements: Entitlements;
  usage: Usage;
  remaining: {
    pantryItems: number | 'unlimited';
    aiRecipes: number | 'unlimited';
    cookware: number | 'unlimited';
  };
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
}

export interface LimitCheckResult {
  allowed: boolean;
  remaining: number | 'unlimited';
}

export interface SubscriptionContextValue {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  planType: 'monthly' | 'annual' | 'trial' | null;
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
  checkLimit: (type: 'pantryItems' | 'aiRecipes' | 'cookware') => LimitCheckResult;
  checkFeature: (feature: keyof Omit<Entitlements, 'maxPantryItems' | 'maxAiRecipes' | 'maxCookware'>) => boolean;
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
  status: 'none',
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
  checkLimit: () => ({ allowed: true, remaining: 'unlimited' }),
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
  
  const hasFetched = typeof window !== 'undefined' && window.__subscriptionFetched;
  const cachedSub = typeof window !== 'undefined' ? window.__subscriptionCache : null;
  const lastToken = typeof window !== 'undefined' ? window.__subscriptionLastToken : null;
  
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(cachedSub || null);
  const [isLoading, setIsLoading] = useState(!hasFetched);
  const [showTrialEndedModal, setShowTrialEndedModal] = useState(false);
  const [trialEndedDismissed, setTrialEndedDismissed] = useState(false);

  const fetchSubscription = useCallback(async () => {
    if (!isAuthenticated || !token) {
      setSubscriptionData(null);
      if (typeof window !== 'undefined') {
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
        
        const tierConfig = TIER_CONFIG[data.tier as SubscriptionTier] || TIER_CONFIG[SubscriptionTier.BASIC];
        
        const sub: SubscriptionData = {
          tier: data.tier || SubscriptionTier.BASIC,
          status: data.status || 'none',
          planType: data.planType || null,
          entitlements: {
            maxPantryItems: tierConfig.maxPantryItems === -1 ? 'unlimited' : tierConfig.maxPantryItems,
            maxAiRecipes: tierConfig.maxAiRecipesPerMonth === -1 ? 'unlimited' : tierConfig.maxAiRecipesPerMonth,
            maxCookware: tierConfig.maxCookwareItems === -1 ? 'unlimited' : tierConfig.maxCookwareItems,
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
            pantryItems: data.remaining?.pantryItems ?? 'unlimited',
            aiRecipes: data.remaining?.aiRecipes ?? 'unlimited',
            cookware: data.remaining?.cookware ?? 'unlimited',
          },
          trialEndsAt: data.trialEndsAt || null,
          currentPeriodEnd: data.currentPeriodEnd || null,
        };
        
        setSubscriptionData(sub);
        if (typeof window !== 'undefined') {
          window.__subscriptionCache = sub;
        }
      } else {
        setSubscriptionData(null);
        if (typeof window !== 'undefined') {
          window.__subscriptionCache = null;
        }
      }
    } catch (error) {
      console.error("Error fetching subscription:", error instanceof Error ? error.message : error);
      setSubscriptionData(null);
      if (typeof window !== 'undefined') {
        window.__subscriptionCache = null;
      }
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, token]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (window.__subscriptionFetched && window.__subscriptionLastToken === token) {
        setIsLoading(false);
        return;
      }
      window.__subscriptionFetched = true;
      window.__subscriptionLastToken = token;
    }
    fetchSubscription();
  }, [token, fetchSubscription]);

  const tier = subscriptionData?.tier ?? SubscriptionTier.BASIC;
  const status = subscriptionData?.status ?? 'none';
  const planType = subscriptionData?.planType ?? null;
  const isProUser = tier === SubscriptionTier.PRO;
  const isTrialing = status === 'trialing';
  const isActive = status === 'active' || status === 'trialing';
  const isPastDue = status === 'past_due';
  const isTrialExpired = status === 'expired' || (planType === 'trial' && status === 'canceled');

  const trialDaysRemaining = useMemo(() => {
    if (!isTrialing || !subscriptionData?.trialEndsAt) return null;
    const trialEnd = new Date(subscriptionData.trialEndsAt);
    const now = new Date();
    const diff = trialEnd.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [isTrialing, subscriptionData?.trialEndsAt]);

  // Check if trial ended modal should be shown
  useEffect(() => {
    const checkTrialEndedDismissed = async () => {
      try {
        const dismissed = await AsyncStorage.getItem(TRIAL_ENDED_DISMISSED_KEY);
        setTrialEndedDismissed(dismissed === 'true');
      } catch (e) {
        // Ignore errors
      }
    };
    checkTrialEndedDismissed();
  }, []);

  // Show trial ended modal when trial expires
  useEffect(() => {
    if (isTrialExpired && !trialEndedDismissed && !isLoading) {
      setShowTrialEndedModal(true);
    }
  }, [isTrialExpired, trialEndedDismissed, isLoading]);

  const handleDismissTrialModal = useCallback(async () => {
    try {
      await AsyncStorage.setItem(TRIAL_ENDED_DISMISSED_KEY, 'true');
      setTrialEndedDismissed(true);
    } catch (e) {
      // Ignore errors
    }
    setShowTrialEndedModal(false);
  }, []);

  const handleUpgradePress = useCallback(() => {
    setShowTrialEndedModal(false);
    // Use Linking to navigate to pricing - this works without navigation context
    Linking.openURL('/pricing').catch(() => {
      // Fallback for web: direct window navigation
      if (typeof window !== 'undefined') {
        window.location.href = '/pricing';
      }
    });
  }, []);

  const entitlements = subscriptionData?.entitlements ?? defaultEntitlements;
  const usage = subscriptionData?.usage ?? defaultUsage;

  const checkLimit = useCallback((type: 'pantryItems' | 'aiRecipes' | 'cookware'): LimitCheckResult => {
    const remaining = subscriptionData?.remaining?.[type];
    
    if (remaining === 'unlimited') {
      return { allowed: true, remaining: 'unlimited' };
    }
    
    const remainingNum = typeof remaining === 'number' ? remaining : 0;
    return {
      allowed: remainingNum > 0,
      remaining: remainingNum,
    };
  }, [subscriptionData?.remaining]);

  const checkFeature = useCallback((feature: keyof Omit<Entitlements, 'maxPantryItems' | 'maxAiRecipes' | 'maxCookware'>): boolean => {
    return entitlements[feature] === true;
  }, [entitlements]);

  const value = useMemo<SubscriptionContextValue>(() => ({
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
  }), [
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
  ]);

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
      <TrialEndedModal
        visible={showTrialEndedModal}
        onDismiss={handleDismissTrialModal}
        onUpgrade={handleUpgradePress}
      />
    </SubscriptionContext.Provider>
  );
}

export { SubscriptionContext, SubscriptionTier };
