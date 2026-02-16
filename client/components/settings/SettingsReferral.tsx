import React from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { GlassCard } from "@/components/GlassCard";
import { GlassButton } from "@/components/GlassButton";
import { Spacing, AppColors } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import type { ThemeColors } from "@/lib/types";

interface SettingsReferralProps {
  isLoadingReferral: boolean;
  referralData: {
    referralCode: string;
    stats: {
      successfulReferrals: number;
      rewardsEarned: number;
      creditsRemaining: number;
      creditsNeededForReward: number;
    };
  } | null;
  referralCopied: boolean;
  onCopyReferralCode: () => void;
  onShareReferral: () => void;
  theme: ThemeColors;
}

export function SettingsReferral({
  isLoadingReferral,
  referralData,
  referralCopied,
  onCopyReferralCode,
  onShareReferral,
  theme,
}: SettingsReferralProps) {
  const { style: themeStyle } = useTheme();
  return (
    <GlassCard style={styles.section}>
      <ThemedText type="h4" style={styles.sectionTitle}>
        Refer a Friend
      </ThemedText>

      {isLoadingReferral ? (
        <View style={{ alignItems: "center", padding: 16 }}>
          <ActivityIndicator size="small" color={AppColors.primary} />
        </View>
      ) : referralData ? (
        <>
          <ThemedText type="caption" style={{ marginBottom: 12 }}>
            Share your referral code with friends. They'll get 7 extra days
            on their trial! Every 3 successful referrals earns you 1 month free.
          </ThemedText>

          <View
            style={[
              styles.settingRow,
              {
                backgroundColor: themeStyle.glass.background,
                borderRadius: 8,
                padding: 12,
                marginBottom: 12,
              },
            ]}
            testID="text-referral-code"
          >
            <View style={styles.settingInfo}>
              <Feather name="gift" size={20} color={AppColors.primary} />
              <View style={styles.settingText}>
                <ThemedText type="caption">Your Referral Code</ThemedText>
                <ThemedText
                  type="h4"
                  style={{ letterSpacing: 2, fontWeight: "700" }}
                >
                  {referralData.referralCode}
                </ThemedText>
              </View>
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
            <GlassButton
              variant="outline"
              onPress={onCopyReferralCode}
              style={{ flex: 1 }}
              icon={
                <Feather
                  name={referralCopied ? "check" : "copy"}
                  size={16}
                  color={referralCopied ? AppColors.success : theme.text}
                />
              }
              testID="button-copy-referral"
            >
              <ThemedText>
                {referralCopied ? "Copied!" : "Copy Link"}
              </ThemedText>
            </GlassButton>

            <GlassButton
              variant="primary"
              onPress={onShareReferral}
              style={{ flex: 1 }}
              icon={
                <Feather name="share-2" size={16} color={theme.buttonText} />
              }
              testID="button-share-referral"
            >
              <ThemedText style={{ color: theme.buttonText }}>Share</ThemedText>
            </GlassButton>
          </View>

          <View
            style={[
              styles.settingRow,
              {
                backgroundColor: themeStyle.glass.background,
                borderRadius: 8,
                padding: 12,
                marginBottom: 12,
              },
            ]}
            testID="text-referral-stats"
          >
            <View style={styles.settingInfo}>
              <Feather name="users" size={18} color={theme.textSecondary} />
              <View style={styles.settingText}>
                <ThemedText type="body">
                  {referralData.stats.successfulReferrals} successful referral
                  {referralData.stats.successfulReferrals !== 1 ? "s" : ""}
                </ThemedText>
                <ThemedText type="caption">
                  {referralData.stats.rewardsEarned} month
                  {referralData.stats.rewardsEarned !== 1 ? "s" : ""} earned
                </ThemedText>
              </View>
            </View>
          </View>

          <View
            style={[
              styles.settingRow,
              {
                backgroundColor: themeStyle.glass.background,
                borderRadius: 8,
                padding: 12,
              },
            ]}
            testID="text-referral-credits"
          >
            <View style={styles.settingInfo}>
              <Feather name="star" size={18} color={AppColors.primary} />
              <View style={styles.settingText}>
                <ThemedText type="body">
                  {referralData.stats.creditsRemaining} / 3 credits toward next reward
                </ThemedText>
                <ThemedText type="caption">
                  {referralData.stats.creditsNeededForReward} more referral
                  {referralData.stats.creditsNeededForReward !== 1 ? "s" : ""} for 1 month free
                </ThemedText>
              </View>
            </View>
          </View>
        </>
      ) : (
        <ThemedText type="caption">
          Unable to load referral information. Please try again later.
        </ThemedText>
      )}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.lg,
  },
  sectionTitle: {
    marginBottom: Spacing.xs,
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  settingInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: Spacing.md,
  },
  settingText: {
    flex: 1,
  },
});
