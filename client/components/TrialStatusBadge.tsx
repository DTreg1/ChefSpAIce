/**
 * =============================================================================
 * TRIAL STATUS BADGE
 * =============================================================================
 *
 * Displays the current trial status with days remaining.
 * Shows different states for active trial, expiring soon, and expired.
 *
 * @module components/TrialStatusBadge
 */

import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useTrialStatus } from "@/hooks/useTrialStatus";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { BorderRadius, Spacing, AppColors } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

interface TrialStatusBadgeProps {
  compact?: boolean;
  showUpgradeButton?: boolean;
}

export function TrialStatusBadge({
  compact = false,
  showUpgradeButton = true,
}: TrialStatusBadgeProps) {
  const { theme } = useTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { isAuthenticated } = useAuth();
  const { isActive: hasActiveSubscription, isLoading: subscriptionLoading } =
    useSubscription();
  const { isTrialing, daysRemaining, isExpired, isLoading, isGuestTrial } =
    useTrialStatus();

  if (isLoading || subscriptionLoading) {
    return null;
  }

  if (hasActiveSubscription && !isGuestTrial) {
    return null;
  }

  if (!isTrialing && !isExpired) {
    return null;
  }

  const handleUpgrade = () => {
    navigation.navigate("Subscription");
  };

  const getStatusColor = () => {
    if (isExpired) return AppColors.error;
    if (daysRemaining <= 2) return AppColors.warning;
    return AppColors.success;
  };

  const getStatusIcon = (): keyof typeof Feather.glyphMap => {
    if (isExpired) return "alert-circle";
    if (daysRemaining <= 2) return "clock";
    return "check-circle";
  };

  const getStatusText = () => {
    if (isExpired) {
      return "Trial expired";
    }
    if (daysRemaining === 1) {
      return "1 day left";
    }
    return `${daysRemaining} days left`;
  };

  const statusColor = getStatusColor();

  if (compact) {
    return (
      <View
        style={[styles.compactContainer, { backgroundColor: statusColor + "20" }]}
        data-testid="badge-trial-status-compact"
      >
        <Feather name={getStatusIcon()} size={12} color={statusColor} />
        <ThemedText style={[styles.compactText, { color: statusColor }]}>
          {getStatusText()}
        </ThemedText>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.backgroundDefault,
          borderColor: statusColor + "40",
        },
      ]}
      data-testid="card-trial-status"
    >
      <View style={styles.header}>
        <View
          style={[styles.iconContainer, { backgroundColor: statusColor + "20" }]}
        >
          <Feather name={getStatusIcon()} size={20} color={statusColor} />
        </View>
        <View style={styles.textContainer}>
          <ThemedText style={styles.title}>
            {isGuestTrial ? "Guest Trial" : "Free Trial"}
          </ThemedText>
          <ThemedText style={[styles.status, { color: statusColor }]}>
            {getStatusText()}
          </ThemedText>
        </View>
      </View>

      {!isAuthenticated && (
        <ThemedText style={[styles.hint, { color: theme.textSecondary }]}>
          Sign up to save your data and unlock more features
        </ThemedText>
      )}

      {showUpgradeButton && (isExpired || daysRemaining <= 3) && (
        <Pressable
          style={[styles.upgradeButton, { backgroundColor: AppColors.primary }]}
          onPress={handleUpgrade}
          data-testid="button-upgrade-from-trial"
        >
          <ThemedText style={styles.upgradeButtonText}>
            {isExpired ? "Subscribe Now" : "Upgrade"}
          </ThemedText>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
  },
  status: {
    fontSize: 14,
    fontWeight: "500",
    marginTop: 2,
  },
  hint: {
    fontSize: 13,
    marginTop: Spacing.sm,
  },
  upgradeButton: {
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  upgradeButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
  },
  compactContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  compactText: {
    fontSize: 12,
    fontWeight: "500",
  },
});
