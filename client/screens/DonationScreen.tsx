import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  Platform,
  TextInput,
  Switch,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { GlassCard } from "@/components/GlassCard";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, AppColors } from "@/constants/theme";
import { getApiUrl, apiRequest } from "@/lib/query-client";

interface DonationStats {
  totalAmount: number;
  donationCount: number;
}

interface RecentDonation {
  id: string;
  amount: number;
  donorName: string;
  message: string | null;
  createdAt: string;
}

const PRESET_AMOUNTS = [500, 1000, 2000, 5000, 10000];

export default function DonationScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const queryClient = useQueryClient();

  const [selectedAmount, setSelectedAmount] = useState(1000);
  const [customAmount, setCustomAmount] = useState("");
  const [donorName, setDonorName] = useState("");
  const [donorEmail, setDonorEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);

  const { data: stats } = useQuery<DonationStats>({
    queryKey: ["/api/donations/stats"],
  });

  const { data: recentDonations = [] } = useQuery<RecentDonation[]>({
    queryKey: ["/api/donations/recent"],
  });

  const pollSessionStatus = async (
    sessionId: string,
    maxAttempts = 5,
  ): Promise<string> => {
    const delays = [1000, 2000, 3000, 4000, 5000];

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await fetch(
          new URL(
            `/api/donations/session/${sessionId}`,
            getApiUrl(),
          ).toString(),
        );
        if (response.ok) {
          const data = await response.json();
          if (data.status === "paid") {
            return "paid";
          }
          if (attempt < maxAttempts - 1) {
            await new Promise((resolve) =>
              setTimeout(resolve, delays[attempt] || 5000),
            );
          }
        }
      } catch (error) {
        console.error("Error checking session status:", error);
      }
    }
    return "incomplete";
  };

  const createCheckoutMutation = useMutation({
    mutationFn: async (data: {
      amount: number;
      donorName?: string;
      donorEmail?: string;
      message?: string;
      anonymous?: boolean;
    }) => {
      const response = await apiRequest(
        "POST",
        "/api/donations/create-checkout-session",
        data,
      );
      return (await response.json()) as { sessionId: string; url: string };
    },
    onSuccess: async (response) => {
      if (response.url && response.sessionId) {
        await WebBrowser.openBrowserAsync(response.url, {
          dismissButtonStyle: "done",
          showTitle: true,
        });

        const status = await pollSessionStatus(response.sessionId);

        queryClient.invalidateQueries({ queryKey: ["/api/donations/stats"] });
        queryClient.invalidateQueries({ queryKey: ["/api/donations/recent"] });

        if (status === "paid") {
          Alert.alert(
            "Thank You!",
            `Your donation of ${displayAmount} was successful! Your generosity helps us continue our mission to reduce food waste.`,
            [{ text: "OK" }],
          );
          setDonorName("");
          setDonorEmail("");
          setMessage("");
          setIsAnonymous(false);
          setCustomAmount("");
        } else {
          Alert.alert(
            "Check Your Donation",
            "If you completed your donation, it may take a moment to process. Check back shortly to see your contribution reflected.",
            [{ text: "OK" }],
          );
        }
      } else {
        Alert.alert("Error", "Failed to create checkout session");
      }
    },
    onError: (error: any) => {
      console.error("Checkout error:", error);
      Alert.alert(
        "Error",
        "Failed to create checkout session. Please try again.",
      );
    },
  });

  const handleDonate = () => {
    const finalAmount = customAmount
      ? Math.round(parseFloat(customAmount) * 100)
      : selectedAmount;

    if (finalAmount < 100) {
      Alert.alert("Invalid Amount", "Minimum donation is $1.00");
      return;
    }

    createCheckoutMutation.mutate({
      amount: finalAmount,
      donorName: isAnonymous ? "Anonymous" : donorName || "Anonymous",
      donorEmail: donorEmail || undefined,
      message: message || undefined,
      anonymous: isAnonymous,
    });
  };

  const formatAmount = (cents: number) => {
    return `$${(cents / 100).toFixed(0)}`;
  };

  const displayAmount = customAmount
    ? `$${parseFloat(customAmount) || 0}`
    : formatAmount(selectedAmount);

  const isLoading = createCheckoutMutation.isPending;

  return (
    <KeyboardAwareScrollViewCompat
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: Spacing.lg,
          paddingBottom: insets.bottom + 120,
        },
      ]}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
    >
      <View style={styles.headerSection}>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: `${AppColors.primary}15` },
          ]}
        >
          <Feather name="heart" size={40} color={AppColors.primary} />
        </View>
        <ThemedText type="h2" style={styles.title}>
          Support Our Mission
        </ThemedText>
        <ThemedText
          type="body"
          style={[styles.subtitle, { color: theme.textSecondary }]}
        >
          Your donation helps us continue providing tools to reduce food waste
          and make meal planning easier for everyone.
        </ThemedText>
      </View>

      {stats ? (
        <GlassCard style={styles.statsCard}>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <ThemedText type="h2" style={{ color: AppColors.primary }}>
                {formatAmount(stats.totalAmount)}
              </ThemedText>
              <ThemedText type="caption">Total Raised</ThemedText>
            </View>
            <View style={styles.statItem}>
              <ThemedText type="h2" style={{ color: AppColors.primary }}>
                {stats.donationCount}
              </ThemedText>
              <ThemedText type="caption">Supporters</ThemedText>
            </View>
          </View>
        </GlassCard>
      ) : null}

      <GlassCard style={styles.amountCard}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          Select Amount
        </ThemedText>
        <View style={styles.amountGrid}>
          {PRESET_AMOUNTS.map((amount) => (
            <Pressable
              key={amount}
              style={[
                styles.amountButton,
                {
                  backgroundColor:
                    selectedAmount === amount && !customAmount
                      ? AppColors.primary
                      : theme.glass.background,
                  borderColor:
                    selectedAmount === amount && !customAmount
                      ? AppColors.primary
                      : theme.glass.border,
                },
              ]}
              onPress={() => {
                setSelectedAmount(amount);
                setCustomAmount("");
              }}
            >
              <ThemedText
                type="body"
                style={{
                  color:
                    selectedAmount === amount && !customAmount
                      ? "#FFFFFF"
                      : theme.text,
                  fontWeight: "600",
                }}
              >
                {formatAmount(amount)}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        <View style={styles.customAmountRow}>
          <ThemedText type="body" style={{ color: theme.textSecondary }}>
            Or enter custom amount:
          </ThemedText>
          <View
            style={[
              styles.customInput,
              {
                backgroundColor: theme.glass.background,
                borderColor: theme.glass.border,
              },
            ]}
          >
            <ThemedText type="body">$</ThemedText>
            <TextInput
              style={[styles.customInputText, { color: theme.text }]}
              value={customAmount}
              onChangeText={setCustomAmount}
              placeholder="0.00"
              placeholderTextColor={theme.textSecondary}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        <View style={styles.selectedAmountRow}>
          <ThemedText type="body" style={{ color: theme.textSecondary }}>
            Donation:
          </ThemedText>
          <ThemedText type="h3" style={{ color: AppColors.primary }}>
            {displayAmount}
          </ThemedText>
        </View>
      </GlassCard>

      <GlassCard style={styles.formCard}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          Your Information (Optional)
        </ThemedText>

        <View style={styles.formField}>
          <ThemedText
            type="caption"
            style={{ color: theme.textSecondary, marginBottom: Spacing.xs }}
          >
            Name
          </ThemedText>
          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: theme.glass.background,
                borderColor: theme.glass.border,
                color: theme.text,
              },
            ]}
            value={donorName}
            onChangeText={setDonorName}
            placeholder="Your name"
            placeholderTextColor={theme.textSecondary}
            editable={!isAnonymous}
          />
        </View>

        <View style={styles.formField}>
          <ThemedText
            type="caption"
            style={{ color: theme.textSecondary, marginBottom: Spacing.xs }}
          >
            Email
          </ThemedText>
          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: theme.glass.background,
                borderColor: theme.glass.border,
                color: theme.text,
              },
            ]}
            value={donorEmail}
            onChangeText={setDonorEmail}
            placeholder="your@email.com"
            placeholderTextColor={theme.textSecondary}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.formField}>
          <ThemedText
            type="caption"
            style={{ color: theme.textSecondary, marginBottom: Spacing.xs }}
          >
            Message
          </ThemedText>
          <TextInput
            style={[
              styles.textInput,
              styles.messageInput,
              {
                backgroundColor: theme.glass.background,
                borderColor: theme.glass.border,
                color: theme.text,
              },
            ]}
            value={message}
            onChangeText={setMessage}
            placeholder="Share a message of support..."
            placeholderTextColor={theme.textSecondary}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.switchRow}>
          <ThemedText type="body">Donate anonymously</ThemedText>
          <Switch
            value={isAnonymous}
            onValueChange={setIsAnonymous}
            trackColor={{ false: theme.glass.border, true: AppColors.primary }}
            thumbColor="#FFFFFF"
          />
        </View>
      </GlassCard>

      <GlassCard style={styles.infoCard}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          Your Support Helps Us
        </ThemedText>
        <View style={styles.benefitsList}>
          <View style={styles.benefitItem}>
            <Feather name="check-circle" size={20} color={AppColors.success} />
            <ThemedText type="body" style={styles.benefitText}>
              Reduce food waste in households
            </ThemedText>
          </View>
          <View style={styles.benefitItem}>
            <Feather name="check-circle" size={20} color={AppColors.success} />
            <ThemedText type="body" style={styles.benefitText}>
              Provide free access to meal planning tools
            </ThemedText>
          </View>
          <View style={styles.benefitItem}>
            <Feather name="check-circle" size={20} color={AppColors.success} />
            <ThemedText type="body" style={styles.benefitText}>
              Develop new AI-powered features
            </ThemedText>
          </View>
        </View>
      </GlassCard>

      <Pressable
        style={[
          styles.donateButton,
          { backgroundColor: AppColors.primary },
          isLoading ? styles.donateButtonDisabled : null,
        ]}
        onPress={handleDonate}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <Feather name="heart" size={20} color="#FFFFFF" />
            <ThemedText
              type="body"
              style={{
                color: "#FFFFFF",
                fontWeight: "600",
                marginLeft: Spacing.sm,
              }}
            >
              Donate {displayAmount}
            </ThemedText>
          </>
        )}
      </Pressable>

      {Platform.OS === "web" ? (
        <View style={styles.webNote}>
          <ThemedText
            type="caption"
            style={{ color: theme.textSecondary, textAlign: "center" }}
          >
            You will be redirected to a secure Stripe payment page
          </ThemedText>
        </View>
      ) : null}

      {recentDonations.length > 0 ? (
        <GlassCard style={styles.recentCard}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Recent Supporters
          </ThemedText>
          {recentDonations.map((donation) => (
            <View key={donation.id} style={styles.donationRow}>
              <View style={styles.donorInfo}>
                <ThemedText type="body" style={{ fontWeight: "600" }}>
                  {donation.donorName}
                </ThemedText>
                {donation.message ? (
                  <ThemedText
                    type="caption"
                    style={{ color: theme.textSecondary }}
                    numberOfLines={1}
                  >
                    {donation.message}
                  </ThemedText>
                ) : null}
              </View>
              <ThemedText
                type="body"
                style={{ color: AppColors.primary, fontWeight: "600" }}
              >
                {formatAmount(donation.amount)}
              </ThemedText>
            </View>
          ))}
        </GlassCard>
      ) : null}
    </KeyboardAwareScrollViewCompat>
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
  headerSection: {
    alignItems: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.lg,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    textAlign: "center",
  },
  subtitle: {
    textAlign: "center",
    paddingHorizontal: Spacing.lg,
  },
  statsCard: {
    padding: Spacing.lg,
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
  },
  amountCard: {
    gap: Spacing.md,
  },
  sectionTitle: {
    marginBottom: Spacing.xs,
  },
  amountGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    justifyContent: "center",
  },
  amountButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    minWidth: 80,
    alignItems: "center",
  },
  customAmountRow: {
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  customInput: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  customInputText: {
    flex: 1,
    fontSize: 16,
    marginLeft: Spacing.xs,
  },
  selectedAmountRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  formCard: {
    gap: Spacing.md,
  },
  formField: {
    gap: Spacing.xs,
  },
  textInput: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    fontSize: 16,
  },
  messageInput: {
    minHeight: 80,
    paddingTop: Spacing.sm,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: Spacing.sm,
  },
  infoCard: {
    gap: Spacing.md,
  },
  benefitsList: {
    gap: Spacing.sm,
  },
  benefitItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  benefitText: {
    flex: 1,
  },
  donateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.sm,
  },
  donateButtonDisabled: {
    opacity: 0.7,
  },
  webNote: {
    paddingHorizontal: Spacing.lg,
  },
  recentCard: {
    gap: Spacing.md,
  },
  donationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  donorInfo: {
    flex: 1,
  },
});
