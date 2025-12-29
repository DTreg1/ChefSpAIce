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
  const { isAuthenticated, token, isGuest } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSubscription = useCallback(async () => {
    if (!isAuthenticated || !token || isGuest) {
      setSubscription(null);
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
          setSubscription({
            status: data.status,
            planType: data.planType,
            currentPeriodStart: data.currentPeriodStart,
            currentPeriodEnd: data.currentPeriodEnd,
            trialStart: data.trialStart,
            trialEnd: data.trialEnd,
            cancelAtPeriodEnd: data.cancelAtPeriodEnd,
            canceledAt: data.canceledAt,
          });
        } else {
          setSubscription(null);
        }
      } else {
        setSubscription(null);
      }
    } catch (error) {
      console.error("Error fetching subscription:", error);
      setSubscription(null);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, token, isGuest]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

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
