import React from "react";
import { View, StyleSheet, Pressable, Linking, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import { AppColors, Spacing, BorderRadius } from "@/constants/theme";
import { getApiUrl } from "@/lib/query-client";

export function SubscriptionBanner() {
  const { theme } = useTheme();
  const { isAuthenticated, token } = useAuth();
  const { isTrialing, isPastDue, trialDaysRemaining, isLoading, subscription } =
    useSubscription();

  if (isLoading || !isAuthenticated) {
    return null;
  }

  const handleManageSubscription = async () => {
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
      console.error("Error opening subscription portal:", error);
    }
  };

  if (isTrialing && trialDaysRemaining !== null) {
    return (
      <Pressable
        style={[styles.banner, { backgroundColor: `${AppColors.primary}20` }]}
        onPress={handleManageSubscription}
        data-testid="banner-trial"
      >
        <View style={styles.bannerContent}>
          <Feather name="clock" size={18} color={AppColors.primary} />
          <ThemedText type="body" style={styles.bannerText}>
            {trialDaysRemaining === 0
              ? "Trial ends today"
              : trialDaysRemaining === 1
                ? "1 day left in your trial"
                : `${trialDaysRemaining} days left in your trial`}
          </ThemedText>
        </View>
        <Feather name="chevron-right" size={18} color={theme.textSecondary} />
      </Pressable>
    );
  }

  if (isPastDue) {
    return (
      <Pressable
        style={[styles.banner, { backgroundColor: `${AppColors.warning}20` }]}
        onPress={handleManageSubscription}
        data-testid="banner-past-due"
      >
        <View style={styles.bannerContent}>
          <Feather name="alert-circle" size={18} color={AppColors.warning} />
          <ThemedText type="body" style={styles.bannerText}>
            Payment issue - update your payment method
          </ThemedText>
        </View>
        <Feather name="chevron-right" size={18} color={theme.textSecondary} />
      </Pressable>
    );
  }

  if (subscription?.cancelAtPeriodEnd && subscription?.currentPeriodEnd) {
    const endDate = new Date(subscription.currentPeriodEnd);
    const formattedDate = endDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

    return (
      <Pressable
        style={[styles.banner, { backgroundColor: `${AppColors.error}20` }]}
        onPress={handleManageSubscription}
        data-testid="banner-canceling"
      >
        <View style={styles.bannerContent}>
          <Feather name="alert-triangle" size={18} color={AppColors.error} />
          <ThemedText type="body" style={styles.bannerText}>
            Subscription ends {formattedDate}
          </ThemedText>
        </View>
        <Feather name="chevron-right" size={18} color={theme.textSecondary} />
      </Pressable>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  bannerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flex: 1,
  },
  bannerText: {
    flex: 1,
    fontWeight: "500",
  },
});
