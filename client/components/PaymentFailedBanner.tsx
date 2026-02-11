import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { useManageSubscription } from "@/hooks/useManageSubscription";
import { AppColors, Spacing, BorderRadius } from "@/constants/theme";

export function PaymentFailedBanner() {
  const { isAuthenticated } = useAuth();
  const { isPastDue, graceDaysRemaining, isLoading } = useSubscription();
  const { handleManageSubscription } = useManageSubscription();

  if (isLoading || !isAuthenticated || !isPastDue || graceDaysRemaining === null) {
    return null;
  }

  const daysText =
    graceDaysRemaining === 0
      ? "today"
      : graceDaysRemaining === 1
        ? "within 1 day"
        : `within ${graceDaysRemaining} days`;

  return (
    <View
      style={styles.container}
      data-testid="banner-payment-failed"
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      accessibilityLabel={`Payment failed. Please update your payment method ${daysText} to keep your subscription active.`}
    >
      <View style={styles.content}>
        <Feather name="alert-circle" size={18} color="#FFFFFF" style={styles.icon} />
        <View style={styles.textContainer}>
          <ThemedText style={styles.title}>Payment failed</ThemedText>
          <ThemedText style={styles.message}>
            Please update your payment method {daysText} to keep your subscription active.
          </ThemedText>
        </View>
      </View>
      <Pressable
        onPress={handleManageSubscription}
        style={({ pressed }) => [
          styles.button,
          pressed && styles.buttonPressed,
        ]}
        data-testid="button-update-payment"
        accessibilityRole="button"
        accessibilityLabel="Update payment method"
      >
        <ThemedText style={styles.buttonText}>Update payment</ThemedText>
        <Feather name="external-link" size={14} color={AppColors.paymentWarning} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: AppColors.paymentWarning,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  content: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: Spacing.sm,
  },
  icon: {
    marginRight: Spacing.sm,
    marginTop: 2,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 2,
  },
  message: {
    fontSize: 13,
    color: "rgba(255,255,255,0.9)",
    lineHeight: 18,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    alignSelf: "flex-start",
    marginLeft: 26,
    gap: 6,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonText: {
    fontSize: 13,
    fontWeight: "600",
    color: AppColors.paymentWarning,
  },
});
