import React from "react";
import { View, StyleSheet, Pressable, Linking, Platform } from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Spacing, AppColors, BorderRadius } from "@/constants/theme";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useAuth } from "@/contexts/AuthContext";
import { getApiUrl } from "@/lib/query-client";

interface HeaderTitleProps {
  title: string;
}

function TrialBadge() {
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
    const trialText =
      trialDaysRemaining === 0
        ? "Trial ends today"
        : trialDaysRemaining === 1
          ? "1 day left"
          : `${trialDaysRemaining} days left`;

    return (
      <Pressable
        style={styles.trialBadge}
        onPress={handleManageSubscription}
        data-testid="header-trial-badge"
      >
        <Feather name="clock" size={12} color="#fff" />
        <ThemedText style={styles.trialText}>{trialText}</ThemedText>
        <Feather name="chevron-right" size={12} color="#fff" />
      </Pressable>
    );
  }

  if (isPastDue) {
    return (
      <Pressable
        style={[styles.trialBadge, styles.pastDueBadge]}
        onPress={handleManageSubscription}
        data-testid="header-past-due-badge"
      >
        <Feather name="alert-circle" size={12} color="#fff" />
        <ThemedText style={styles.trialText}>Payment issue</ThemedText>
        <Feather name="chevron-right" size={12} color="#fff" />
      </Pressable>
    );
  }

  if (subscription?.cancelAtPeriodEnd) {
    return (
      <Pressable
        style={[styles.trialBadge, styles.cancelingBadge]}
        onPress={handleManageSubscription}
        data-testid="header-canceling-badge"
      >
        <Feather name="alert-triangle" size={12} color="#fff" />
        <ThemedText style={styles.trialText}>Ending soon</ThemedText>
        <Feather name="chevron-right" size={12} color="#fff" />
      </Pressable>
    );
  }

  return null;
}

export function HeaderTitle({ title }: HeaderTitleProps) {
  return (
    <View style={styles.container}>
      <MaterialCommunityIcons
        name="chef-hat"
        size={28}
        color={AppColors.primary}
      />
      <ThemedText style={styles.title}>{title}</ThemedText>
      <TrialBadge />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: Spacing.sm,
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
    color: AppColors.primary,
  },
  trialBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: AppColors.primary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  pastDueBadge: {
    backgroundColor: AppColors.warning,
  },
  cancelingBadge: {
    backgroundColor: AppColors.error,
  },
  trialText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#fff",
  },
});
