import React, { useState, useEffect } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { GlassCard } from "@/components/GlassCard";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { AppColors, Spacing, BorderRadius } from "@/constants/theme";
import { getApiUrl } from "@/lib/query-client";

interface PriceInfo {
  id: string;
  amount: number;
  currency: string;
  interval: string;
  intervalCount: number;
  trialDays: number;
  productName: string;
}

const FEATURES = [
  "Unlimited food inventory tracking",
  "AI-powered recipe generation",
  "Smart meal planning",
  "Expiration alerts & notifications",
  "Nutrition tracking & analytics",
  "Cloud sync across devices",
  "Shopping list management",
  "Waste reduction insights",
];

function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

export default function PricingScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { token, isAuthenticated } = useAuth();
  const { refresh: refreshSubscription } = useSubscription();

  const [prices, setPrices] = useState<{
    monthly: PriceInfo | null;
    annual: PriceInfo | null;
  }>({ monthly: null, annual: null });
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "annual">("annual");
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  useEffect(() => {
    fetchPrices();
  }, []);

  // Refresh subscription status only when screen mounts (not on every focus)
  // This prevents constant re-fetching while still getting fresh data on navigation
  useEffect(() => {
    refreshSubscription();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchPrices = async () => {
    try {
      const baseUrl = getApiUrl();
      const url = new URL("/api/subscriptions/prices", baseUrl);
      const response = await fetch(url.toString());
      if (response.ok) {
        const data = await response.json();
        setPrices(data);
      }
    } catch (error) {
      console.error("Error fetching prices:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async () => {
    if (!isAuthenticated || !token) {
      return;
    }

    const priceId = selectedPlan === "annual" ? prices.annual?.id : prices.monthly?.id;
    if (!priceId) return;

    setCheckoutLoading(true);
    try {
      const baseUrl = getApiUrl();
      const url = new URL("/api/subscriptions/create-checkout-session", baseUrl);

      const response = await fetch(url.toString(), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ priceId }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.url) {
          if (Platform.OS === "web") {
            window.location.href = data.url;
          } else {
            Linking.openURL(data.url);
          }
        }
      }
    } catch (error) {
      console.error("Error creating checkout session:", error);
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.backgroundRoot }]}>
        <ActivityIndicator size="large" color={AppColors.primary} />
      </View>
    );
  }

  const annualPrice = prices.annual;
  const monthlyPrice = prices.monthly;
  const annualSavings =
    annualPrice && monthlyPrice
      ? Math.round(((monthlyPrice.amount * 12 - annualPrice.amount) / (monthlyPrice.amount * 12)) * 100)
      : 0;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + Spacing.lg,
          paddingBottom: insets.bottom + Spacing.xl,
        },
      ]}
    >
      <View style={styles.header}>
        <ThemedText type="h1" style={styles.title}>
          Unlock Premium
        </ThemedText>
        <ThemedText type="body" style={styles.subtitle}>
          Get full access to all features with a free 7-day trial
        </ThemedText>
      </View>

      <View style={styles.planSelector}>
        <Pressable
          style={[
            styles.planOption,
            selectedPlan === "monthly" && { backgroundColor: `${AppColors.primary}20` },
            { borderColor: selectedPlan === "monthly" ? AppColors.primary : theme.glass.border },
          ]}
          onPress={() => setSelectedPlan("monthly")}
          data-testid="button-plan-monthly"
        >
          <ThemedText type="body" style={{ fontWeight: "600" }}>
            Monthly
          </ThemedText>
          {monthlyPrice && (
            <ThemedText type="h3" style={{ color: AppColors.primary }}>
              {formatPrice(monthlyPrice.amount, monthlyPrice.currency)}
            </ThemedText>
          )}
          <ThemedText type="caption">per month</ThemedText>
        </Pressable>

        <Pressable
          style={[
            styles.planOption,
            selectedPlan === "annual" && { backgroundColor: `${AppColors.primary}20` },
            { borderColor: selectedPlan === "annual" ? AppColors.primary : theme.glass.border },
          ]}
          onPress={() => setSelectedPlan("annual")}
          data-testid="button-plan-annual"
        >
          {annualSavings > 0 && (
            <View style={styles.saveBadge}>
              <ThemedText style={styles.saveBadgeText}>Save {annualSavings}%</ThemedText>
            </View>
          )}
          <ThemedText type="body" style={{ fontWeight: "600" }}>
            Annual
          </ThemedText>
          {annualPrice && (
            <ThemedText type="h3" style={{ color: AppColors.primary }}>
              {formatPrice(annualPrice.amount, annualPrice.currency)}
            </ThemedText>
          )}
          <ThemedText type="caption">per year</ThemedText>
        </Pressable>
      </View>

      <GlassCard style={styles.featuresCard}>
        <ThemedText type="h4" style={styles.featuresTitle}>
          Everything you get:
        </ThemedText>
        {FEATURES.map((feature, index) => (
          <View key={index} style={styles.featureRow}>
            <Feather name="check-circle" size={18} color={AppColors.success} />
            <ThemedText type="body">{feature}</ThemedText>
          </View>
        ))}
      </GlassCard>

      <Pressable
        style={[
          styles.subscribeButton,
          { backgroundColor: checkoutLoading ? theme.glass.background : AppColors.primary },
        ]}
        onPress={handleSubscribe}
        disabled={checkoutLoading}
        data-testid="button-subscribe"
      >
        {checkoutLoading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <ThemedText style={styles.subscribeButtonText}>
            Start 7-Day Free Trial
          </ThemedText>
        )}
      </Pressable>

      <ThemedText type="caption" style={styles.trialNote}>
        Cancel anytime during your trial. No charges until trial ends.
      </ThemedText>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    alignItems: "center",
    gap: Spacing.sm,
  },
  title: {
    textAlign: "center",
  },
  subtitle: {
    textAlign: "center",
    opacity: 0.8,
  },
  planSelector: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  planOption: {
    flex: 1,
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    gap: Spacing.xs,
    position: "relative",
  },
  saveBadge: {
    position: "absolute",
    top: -10,
    right: -10,
    backgroundColor: AppColors.success,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  saveBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  featuresCard: {
    gap: Spacing.md,
  },
  featuresTitle: {
    marginBottom: Spacing.xs,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  subscribeButton: {
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
  },
  subscribeButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  trialNote: {
    textAlign: "center",
    opacity: 0.6,
  },
});
