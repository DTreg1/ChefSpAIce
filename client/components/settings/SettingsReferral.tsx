import React from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { GlassCard } from "@/components/GlassCard";
import { GlassButton } from "@/components/GlassButton";
import { Spacing, AppColors } from "@/constants/theme";

interface SettingsReferralProps {
  isLoadingReferral: boolean;
  referralData: any;
  referralCopied: boolean;
  onCopyReferralCode: () => void;
  onShareReferral: () => void;
  theme: any;
}

export function SettingsReferral({
  isLoadingReferral,
  referralData,
  referralCopied,
  onCopyReferralCode,
  onShareReferral,
  theme,
}: SettingsReferralProps) {
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
            Share your referral code with friends. You'll earn 3 extra AI
            recipe generations, and they'll get an extended 14-day free trial!
          </ThemedText>

          <View
            style={[
              styles.settingRow,
              {
                backgroundColor: theme.glass.background,
                borderRadius: 8,
                padding: 12,
                marginBottom: 12,
              },
            ]}
            data-testid="text-referral-code"
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
              data-testid="button-copy-referral"
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
                <Feather name="share-2" size={16} color="#fff" />
              }
              data-testid="button-share-referral"
            >
              <ThemedText style={{ color: "#fff" }}>Share</ThemedText>
            </GlassButton>
          </View>

          <View
            style={[
              styles.settingRow,
              {
                backgroundColor: theme.glass.background,
                borderRadius: 8,
                padding: 12,
              },
            ]}
          >
            <View style={styles.settingInfo}>
              <Feather name="users" size={18} color={theme.textSecondary} />
              <View style={styles.settingText}>
                <ThemedText type="body">
                  {referralData.stats.completedSignups} friend
                  {referralData.stats.completedSignups !== 1 ? "s" : ""} signed up
                </ThemedText>
                <ThemedText type="caption">
                  {referralData.stats.totalReferrals} total referral
                  {referralData.stats.totalReferrals !== 1 ? "s" : ""}
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
