import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, ReactNode } from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const AUTH_TOKEN_KEY = "chefspaice-auth-token";

interface SubscriptionStatus {
  status: string;
  planType: string | null;
  currentPeriodEnd: string | null;
  trialEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

interface UseSubscriptionResult {
  subscription: SubscriptionStatus | null;
  isLoading: boolean;
  isActive: boolean;
  isTrialing: boolean;
  trialDaysRemaining: number | null;
  error: Error | null;
}

function getApiBase(): string {
  if (typeof window === "undefined") return "";
  const isDev = window.location.port === "8081";
  return isDev ? `${window.location.protocol}//${window.location.hostname}:5000` : "";
}

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

async function fetchSubscriptionStatus(): Promise<SubscriptionStatus> {
  const token = getAuthToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  const response = await fetch(`${getApiBase()}/api/subscriptions/status`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch subscription status");
  }

  return response.json();
}

export function useSubscription(): UseSubscriptionResult {
  const token = getAuthToken();

  const { data, isLoading, error } = useQuery<SubscriptionStatus, Error>({
    queryKey: ["/api/subscriptions/status"],
    queryFn: fetchSubscriptionStatus,
    enabled: !!token,
    staleTime: 60 * 1000,
    retry: false,
  });

  const isActive = useMemo(() => {
    if (!data) return false;
    return data.status === "active" || data.status === "trialing";
  }, [data]);

  const isTrialing = useMemo(() => {
    if (!data) return false;
    return data.status === "trialing";
  }, [data]);

  const trialDaysRemaining = useMemo(() => {
    if (!data?.trialEnd) return null;
    const trialEndDate = new Date(data.trialEnd);
    const now = new Date();
    const diffTime = trialEndDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  }, [data]);

  return {
    subscription: data ?? null,
    isLoading,
    isActive,
    isTrialing,
    trialDaysRemaining,
    error: error ?? null,
  };
}

interface UseRequireSubscriptionResult extends UseSubscriptionResult {
  isRedirecting: boolean;
}

export function useRequireSubscription(): UseRequireSubscriptionResult {
  const subscriptionResult = useSubscription();
  const { isLoading, isActive } = subscriptionResult;

  useEffect(() => {
    if (!isLoading && !isActive) {
      window.location.href = "/pricing";
    }
  }, [isLoading, isActive]);

  const isRedirecting = !isLoading && !isActive;

  return {
    ...subscriptionResult,
    isRedirecting,
  };
}

const BRAND_GREEN = "#27AE60";

interface SubscriptionGateProps {
  children: ReactNode;
  loadingComponent?: ReactNode;
  upgradeTitle?: string;
  upgradeMessage?: string;
}

export function SubscriptionGate({
  children,
  loadingComponent,
  upgradeTitle = "Premium Feature",
  upgradeMessage = "Upgrade to access this feature and unlock the full ChefSpAIce experience.",
}: SubscriptionGateProps) {
  const { isLoading, isActive, isTrialing, trialDaysRemaining } = useSubscription();

  if (isLoading) {
    return loadingComponent ?? (
      <View style={styles.loadingContainer} data-testid="subscription-loading">
        <ActivityIndicator size="large" color={BRAND_GREEN} />
        <Text style={styles.loadingText}>Checking subscription...</Text>
      </View>
    );
  }

  if (!isActive) {
    return (
      <View style={styles.upgradeContainer} data-testid="subscription-upgrade-prompt">
        <View style={styles.upgradeCard}>
          <MaterialCommunityIcons name="lock" size={48} color={BRAND_GREEN} />
          <Text style={styles.upgradeTitle} data-testid="text-upgrade-title">{upgradeTitle}</Text>
          <Text style={styles.upgradeMessage} data-testid="text-upgrade-message">{upgradeMessage}</Text>
          <Pressable
            style={styles.upgradeButton}
            onPress={() => (window.location.href = "/pricing")}
            data-testid="button-upgrade"
          >
            <Text style={styles.upgradeButtonText}>View Plans</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (isTrialing && trialDaysRemaining !== null) {
    return (
      <View style={styles.trialWrapper} data-testid="subscription-trial-wrapper">
        <View style={styles.trialBanner} data-testid="banner-trial-countdown">
          <MaterialCommunityIcons name="clock-outline" size={16} color="#FFFFFF" />
          <Text style={styles.trialBannerText} data-testid="text-trial-days">
            {trialDaysRemaining === 0
              ? "Trial ends today!"
              : trialDaysRemaining === 1
                ? "1 day left in trial"
                : `${trialDaysRemaining} days left in trial`}
          </Text>
        </View>
        {children}
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#64748B",
  },
  upgradeContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  upgradeCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  upgradeTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1A202C",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  upgradeMessage: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  upgradeButton: {
    backgroundColor: BRAND_GREEN,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  upgradeButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  trialWrapper: {
    flex: 1,
  },
  trialBanner: {
    backgroundColor: "#F59E0B",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 8,
  },
  trialBannerText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
});
