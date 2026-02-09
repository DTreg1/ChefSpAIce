import React from "react";
import { View, Pressable, StyleSheet, Platform, Linking } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, AppColors } from "@/constants/theme";
import { getSubscriptionTermsText, APPLE_EULA_URL, GOOGLE_PLAY_TERMS_URL } from "@/constants/subscription-terms";
import { webAccessibilityProps } from "@/lib/web-accessibility";

interface SubscriptionLegalLinksProps {
  onOpenPrivacyPolicy: () => void;
  onOpenTermsOfUse: () => void;
  testIdPrefix?: string;
}

export function SubscriptionLegalLinks({
  onOpenPrivacyPolicy,
  onOpenTermsOfUse,
  testIdPrefix = "",
}: SubscriptionLegalLinksProps) {
  const { theme } = useTheme();

  const privacyTestId = testIdPrefix
    ? `link-${testIdPrefix}-privacy-policy`
    : "link-privacy-policy";
  const termsTestId = testIdPrefix
    ? `link-${testIdPrefix}-terms-of-use`
    : "link-terms-of-use";
  const eulaTestId = testIdPrefix
    ? `link-${testIdPrefix}-apple-eula`
    : "link-apple-eula";

  return (
    <>
      <ThemedText
        style={[styles.subscriptionTerms, { color: theme.textSecondary }]}
      >
        {getSubscriptionTermsText(Platform.OS)}
      </ThemedText>
      <View style={styles.legalLinksContainer}>
        <Pressable
          onPress={onOpenPrivacyPolicy}
          data-testid={privacyTestId}
          {...webAccessibilityProps(onOpenPrivacyPolicy)}
        >
          <ThemedText
            style={[styles.legalLink, { color: AppColors.primary }]}
          >
            Privacy Policy
          </ThemedText>
        </Pressable>
        <ThemedText
          style={[styles.legalSeparator, { color: theme.textSecondary }]}
        >
          |
        </ThemedText>
        <Pressable
          onPress={onOpenTermsOfUse}
          data-testid={termsTestId}
          {...webAccessibilityProps(onOpenTermsOfUse)}
        >
          <ThemedText
            style={[styles.legalLink, { color: AppColors.primary }]}
          >
            Terms of Use
          </ThemedText>
        </Pressable>
        {Platform.OS !== "web" && (
          <>
            <ThemedText
              style={[styles.legalSeparator, { color: theme.textSecondary }]}
            >
              |
            </ThemedText>
            <Pressable
              onPress={() => {
                if (Platform.OS === "ios") {
                  Linking.openURL(APPLE_EULA_URL);
                } else {
                  Linking.openURL(GOOGLE_PLAY_TERMS_URL);
                }
              }}
              data-testid={eulaTestId}
              {...webAccessibilityProps(() => {
                if (Platform.OS === "ios") {
                  Linking.openURL(APPLE_EULA_URL);
                } else {
                  Linking.openURL(GOOGLE_PLAY_TERMS_URL);
                }
              })}
            >
              <ThemedText
                style={[styles.legalLink, { color: AppColors.primary }]}
              >
                {Platform.OS === "ios" ? "EULA" : "Google Play Terms"}
              </ThemedText>
            </Pressable>
          </>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  subscriptionTerms: {
    fontSize: 11,
    lineHeight: 16,
    textAlign: "center",
    marginTop: Spacing.sm,
  },
  legalLinksContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  legalLink: {
    fontSize: 11,
    fontWeight: "500",
    textDecorationLine: "underline",
  },
  legalSeparator: {
    fontSize: 11,
  },
});
