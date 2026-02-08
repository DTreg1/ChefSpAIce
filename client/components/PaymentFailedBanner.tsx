import React from "react";
import { View, StyleSheet, Pressable, Platform, Linking } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { getApiUrl } from "@/lib/query-client";
import { logger } from "@/lib/logger";
import { Spacing, BorderRadius } from "@/constants/theme";

export function PaymentFailedBanner() {
  const { isAuthenticated, token } = useAuth();
  const { isPastDue, graceDaysRemaining, isLoading } = useSubscription();

  if (isLoading || !isAuthenticated || !isPastDue || graceDaysRemaining === null) {
    return null;
  }

  const handleUpdatePayment = async () => {
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
        const data = (await response.json()).data;
        if (data.url) {
          if (Platform.OS === "web") {
            window.location.href = data.url;
          } else {
            Linking.openURL(data.url);
          }
        }
      }
    } catch (error) {
      logger.error("Error opening subscription portal:", error);
    }
  };

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
        <Feather name="alert-circle" size={18} color="#fff" style={styles.icon} />
        <View style={styles.textContainer}>
          <ThemedText style={styles.title}>Payment failed</ThemedText>
          <ThemedText style={styles.message}>
            Please update your payment method {daysText} to keep your subscription active.
          </ThemedText>
        </View>
      </View>
      <Pressable
        onPress={handleUpdatePayment}
        style={({ pressed }) => [
          styles.button,
          pressed && styles.buttonPressed,
        ]}
        data-testid="button-update-payment"
        accessibilityLabel="Update payment method"
      >
        <ThemedText style={styles.buttonText}>Update payment</ThemedText>
        <Feather name="external-link" size={14} color="#b45309" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#b45309",
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
    color: "#b45309",
  },
});
