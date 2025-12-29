import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getApiUrl } from "@/lib/query-client";

// Global guard to prevent re-fetching (survives HMR/module reloads)
declare global {
  interface Window {
    __subscriptionFetched?: boolean;
    __subscriptionCache?: Subscription | null;
    __subscriptionLastToken?: string | null;
  }
}

export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "expired"
  | "incomplete"
  | null;

export interface Subscription {
  status: SubscriptionStatus;
  planType: "monthly" | "annual" | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  trialStart?: string | null;
  trialEnd?: string | null;
  cancelAtPeriodEnd: boolean;
  canceledAt?: string | null;
}

interface SubscriptionContextType {
  subscription: Subscription | null;
  status: SubscriptionStatus;
  isLoading: boolean;
  isActive: boolean;
  isTrialing: boolean;
  isPastDue: boolean;
  trialDaysRemaining: number | null;
  daysUntilExpiry: number | null;
  refresh: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType>({
  subscription: null,
  status: null,
  isLoading: true,
  isActive: false,
  isTrialing: false,
  isPastDue: false,
  trialDaysRemaining: null,
  daysUntilExpiry: null,
  refresh: async () => {},
});

export const useSubscription = () => useContext(SubscriptionContext);

export function SubscriptionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, token } = useAuth();
  
  // Use global window variables that survive HMR and module reloads
  const hasFetched = typeof window !== 'undefined' && window.__subscriptionFetched;
  const cachedSub = typeof window !== 'undefined' ? window.__subscriptionCache : null;
  const lastToken = typeof window !== 'undefined' ? window.__subscriptionLastToken : null;
  
  const [subscription, setSubscription] = useState<Subscription | null>(cachedSub || null);
  const [isLoading, setIsLoading] = useState(!hasFetched);

  const fetchSubscription = useCallback(async () => {
    if (!isAuthenticated || !token) {
      setSubscription(null);
      if (typeof window !== 'undefined') {
        window.__subscriptionCache = null;
      }
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const baseUrl = getApiUrl();
      const url = new URL("/api/subscriptions/status", baseUrl);

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.status && data.status !== "none") {
          const sub: Subscription = {
            status: data.status,
            planType: data.planType,
            currentPeriodStart: data.currentPeriodStart,
            currentPeriodEnd: data.currentPeriodEnd,
            trialStart: data.trialStart,
            trialEnd: data.trialEnd,
            cancelAtPeriodEnd: data.cancelAtPeriodEnd,
            canceledAt: data.canceledAt,
          };
          setSubscription(sub);
          if (typeof window !== 'undefined') {
            window.__subscriptionCache = sub;
          }
        } else {
          setSubscription(null);
          if (typeof window !== 'undefined') {
            window.__subscriptionCache = null;
          }
        }
      } else {
        setSubscription(null);
        if (typeof window !== 'undefined') {
          window.__subscriptionCache = null;
        }
      }
    } catch (error) {
      console.error("Error fetching subscription:", error instanceof Error ? error.message : error);
      setSubscription(null);
      if (typeof window !== 'undefined') {
        window.__subscriptionCache = null;
      }
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, token]);

  useEffect(() => {
    // Global guard: only fetch if token changed or never fetched
    if (typeof window !== 'undefined') {
      if (window.__subscriptionFetched && window.__subscriptionLastToken === token) {
        setIsLoading(false);
        return;
      }
      window.__subscriptionFetched = true;
      window.__subscriptionLastToken = token;
    }
    fetchSubscription();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const status = subscription?.status ?? null;

  const isActive = status === "active" || status === "trialing";
  const isTrialing = status === "trialing";
  const isPastDue = status === "past_due";

  const trialDaysRemaining = useMemo(() => {
    if (!isTrialing || !subscription?.trialEnd) return null;
    const trialEnd = new Date(subscription.trialEnd);
    const now = new Date();
    const diff = trialEnd.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [isTrialing, subscription?.trialEnd]);

  const daysUntilExpiry = useMemo(() => {
    if (!subscription?.currentPeriodEnd) return null;
    const periodEnd = new Date(subscription.currentPeriodEnd);
    const now = new Date();
    const diff = periodEnd.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [subscription?.currentPeriodEnd]);

  const value = useMemo(
    () => ({
      subscription,
      status,
      isLoading,
      isActive,
      isTrialing,
      isPastDue,
      trialDaysRemaining,
      daysUntilExpiry,
      refresh: fetchSubscription,
    }),
    [
      subscription,
      status,
      isLoading,
      isActive,
      isTrialing,
      isPastDue,
      trialDaysRemaining,
      daysUntilExpiry,
      fetchSubscription,
    ]
  );

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}
