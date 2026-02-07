import React from "react";
import { View, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { GlassCard } from "@/components/GlassCard";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, AppColors } from "@/constants/theme";
import { SubscriptionTier } from "@shared/subscription";

interface CurrentPlanCardProps {
  planName: string;
  monthlyPrice: string;
  isProUser: boolean;
  tier: string;
  statusInfo: { label: string; color: string };
  isTrialing: boolean;
  trialDaysRemaining: number | null;
}

export function CurrentPlanCard({
  planName,
  monthlyPrice,
  isProUser,
  tier,
  statusInfo,
  isTrialing,
  trialDaysRemaining,
}: CurrentPlanCardProps) {
  const { theme } = useTheme();

  return (
    <GlassCard style={styles.planCard}>
      <View style={styles.sectionHeader}>
        <Feather
          name="credit-card"
          size={20}
          color={theme.textSecondaryOnGlass}
        />
        <ThemedText
          style={[
            styles.sectionTitle,
            { color: theme.textSecondaryOnGlass },
          ]}
        >
          Current Plan
        </ThemedText>
      </View>
      <View style={styles.planHeader}>
        <View style={styles.planInfo}>
          <View style={styles.planBadge}>
            <Feather
              name={isProUser ? "star" : tier === SubscriptionTier.BASIC ? "user" : "gift"}
              size={20}
              color={isProUser ? AppColors.warning : AppColors.primary}
            />
          </View>
          <View>
            <ThemedText style={styles.planName}>{planName}</ThemedText>
            <ThemedText
              style={[styles.planPrice, { color: theme.textSecondary }]}
            >
              {monthlyPrice}
            </ThemedText>
          </View>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: `${statusInfo.color}20` },
          ]}
        >
          <View
            style={[
              styles.statusDot,
              { backgroundColor: statusInfo.color },
            ]}
          />
          <ThemedText
            style={[styles.statusText, { color: statusInfo.color }]}
          >
            {statusInfo.label}
          </ThemedText>
        </View>
      </View>

      {isTrialing && trialDaysRemaining !== null && (
        <View
          style={[
            styles.trialBanner,
            { backgroundColor: `${AppColors.warning}15` },
          ]}
        >
          <Feather name="clock" size={16} color={AppColors.warning} />
          <View style={styles.trialTextContainer}>
            <ThemedText
              style={[styles.trialTitle, { color: AppColors.warning }]}
            >
              Trial expires in {trialDaysRemaining} day
              {trialDaysRemaining !== 1 ? "s" : ""}
            </ThemedText>
            <ThemedText
              style={[styles.trialSubtitle, { color: theme.textSecondary }]}
            >
              Choose a plan below to continue using ChefSpAIce after your
              trial.
            </ThemedText>
          </View>
        </View>
      )}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  planCard: {
    padding: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  planHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  planInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  planBadge: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: `${AppColors.primary}15`,
    justifyContent: "center",
    alignItems: "center",
  },
  planName: {
    fontSize: 22,
    fontWeight: "700",
  },
  planPrice: {
    fontSize: 14,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.pill,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  trialBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  trialTextContainer: {
    flex: 1,
  },
  trialTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  trialSubtitle: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 18,
  },
});
