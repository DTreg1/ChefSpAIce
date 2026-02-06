import { StyleSheet, View, Text, Pressable, Platform, Linking } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";
import { AppColors } from "@/constants/theme";
import { GlassCard } from "./GlassCard";
import { donationAmounts } from "@/data/landing-data";
import { sharedStyles } from "./shared-styles";

const isWeb = Platform.OS === "web";

interface DonationSectionProps {
  isWide: boolean;
}

export function DonationSection({ isWide }: DonationSectionProps) {
  const [isDonating, setIsDonating] = useState(false);

  const handleDonate = async (amount: number) => {
    if (isDonating) return;
    setIsDonating(true);

    try {
      const expoDomain = process.env.EXPO_PUBLIC_DOMAIN;
      const apiBaseUrl = expoDomain
        ? `https://${expoDomain}`
        : isWeb
          ? window.location.origin
          : "https://chefspaice.com";

      const redirectBaseUrl = isWeb
        ? window.location.origin
        : "https://chefspaice.com";

      const response = await fetch(
        `${apiBaseUrl}/api/donations/create-checkout-session`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount,
            successUrl: `${redirectBaseUrl}/?donation=success`,
            cancelUrl: `${redirectBaseUrl}/?donation=cancelled`,
          }),
        },
      );

      if (!response.ok) {
        console.error(
          "Donation API error:",
          response.status,
          response.statusText,
        );
        return;
      }

      const data = await response.json();

      if (data.url) {
        if (isWeb) {
          window.location.href = data.url;
        } else {
          Linking.openURL(data.url);
        }
      } else if (data.error) {
        console.error("Donation error:", data.error);
      }
    } catch (error) {
      console.error("Donation error:", error);
    } finally {
      setIsDonating(false);
    }
  };

  return (
    <>
      <View style={styles.ctaSection} data-testid="section-cta">
        <GlassCard style={styles.ctaCard}>
          <Text style={styles.ctaTitle}>Ready to reduce food waste?</Text>
          <Text style={styles.ctaSubtitle}>
            Join thousands of users saving money and the planet
          </Text>
        </GlassCard>
      </View>

      <View style={sharedStyles.section} data-testid="section-donate">
        <Text style={sharedStyles.sectionTitle} data-testid="text-donate-title">
          Support ChefSpAIce
        </Text>
        <Text
          style={sharedStyles.sectionSubtitle}
          data-testid="text-donate-subtitle"
        >
          Help us fight food waste and keep the app free for everyone
        </Text>

        <GlassCard style={styles.donationCard}>
          <View style={styles.donationContent}>
            <MaterialCommunityIcons
              name="heart"
              size={32}
              color={AppColors.primary}
            />
            <Text style={styles.donationText}>
              Your donation helps us maintain and improve ChefSpAIce, keeping
              it accessible to everyone while we work to reduce global food
              waste.
            </Text>
            <View
              style={[
                styles.donationAmounts,
                isWide && styles.donationAmountsWide,
              ]}
            >
              {donationAmounts.map((item) => (
                <Pressable
                  key={item.amount}
                  style={({ pressed }) => [
                    styles.donationButton,
                    pressed && styles.donationButtonPressed,
                    isDonating && styles.donationButtonDisabled,
                  ]}
                  onPress={() => handleDonate(item.amount)}
                  disabled={isDonating}
                  data-testid={`button-donate-${item.label}`}
                >
                  <Text style={styles.donationButtonText}>{item.label}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.donationNote}>
              Secure payment powered by Stripe
            </Text>
          </View>
        </GlassCard>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  ctaSection: {
    paddingHorizontal: 24,
    paddingVertical: 24,
    alignItems: "center",
  },
  ctaCard: {
    padding: 40,
    alignItems: "center",
    maxWidth: 500,
    width: "100%",
  },
  ctaTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.5)",
    textAlign: "center",
    marginBottom: 12,
  },
  ctaSubtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
    marginBottom: 24,
  },
  donationCard: {
    padding: 32,
    alignItems: "center",
    maxWidth: 500,
    width: "100%",
  },
  donationContent: {
    alignItems: "center",
    gap: 16,
  },
  donationText: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
    lineHeight: 24,
  },
  donationAmounts: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "center",
    marginTop: 8,
  },
  donationAmountsWide: {
    gap: 16,
  },
  donationButton: {
    backgroundColor: AppColors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 80,
    alignItems: "center",
  },
  donationButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  donationButtonDisabled: {
    opacity: 0.5,
  },
  donationButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  donationNote: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.5)",
    marginTop: 8,
  },
});
