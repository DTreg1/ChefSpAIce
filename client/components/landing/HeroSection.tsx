import { StyleSheet, View, Text, Pressable, Image, Platform } from "react-native";
import { webAccessibilityProps } from "@/lib/web-accessibility";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { HeroDeviceMockup } from "./HeroDeviceMockup";
import { ScreenshotShowcase } from "./ScreenshotShowcase";
import { ReplitLogo } from "./ReplitLogo";
import { trustLogos } from "@/data/landing-data";
import { useTheme } from "@/hooks/useTheme";

const logoImage = require("../../assets/images/transparent/chef-hat-light-256.png");

interface HeroSectionProps {
  isWide: boolean;
  onSupport?: () => void;
}

export function HeroSection({ isWide, onSupport }: HeroSectionProps) {
  const { style } = useTheme();
  const lc = style.landing;
  const ge = style.glassEffect;

  return (
    <>
      <View style={styles.header} data-testid="header" role="banner" accessibilityLabel="Site header">
        <View style={styles.logoContainer}>
          <Image source={logoImage} style={{ width: 28, height: 28 }} accessibilityElementsHidden={true} importantForAccessibility="no-hide-descendants" />
          <Text style={[styles.logoText, { color: lc.textPrimary }]} data-testid="text-logo">
            ChefSpAIce
          </Text>
        </View>
        {onSupport && (
          <Pressable
            style={({ pressed }) => [
              styles.signInButton,
              { borderColor: lc.borderStrong, backgroundColor: lc.surfaceMedium, borderRadius: ge.borderRadius.pill },
              pressed && styles.buttonPressed,
            ]}
            onPress={onSupport}
            {...webAccessibilityProps(onSupport)}
            data-testid="button-support"
            accessibilityRole="button"
            accessibilityLabel="Contact support"
          >
            <Text style={[styles.signInButtonText, { color: lc.textPrimary }]}>Support</Text>
          </Pressable>
        )}
      </View>

      <View
        style={[styles.heroSection, isWide && styles.heroSectionWide]}
        data-testid="section-hero"
      >
        <View style={[styles.heroInner, isWide && styles.heroInnerWide]}>
          <View
            style={[styles.heroContent, isWide && styles.heroContentWide]}
          >
            <View style={[styles.tagline, { backgroundColor: lc.taglineBg, borderColor: lc.taglineBorder, borderRadius: ge.borderRadius.pill }]}>
              <MaterialCommunityIcons name="leaf" size={14} color={lc.taglineIcon} />
              <Text style={[styles.taglineText, { color: lc.textPrimary }]} data-testid="text-tagline">
                Reduce Food Waste, Save Money
              </Text>
            </View>

            <Text style={[styles.heroTitle, { color: lc.textPrimary }]} data-testid="text-hero-title">
              Your AI-Powered{"\n"}Kitchen Assistant
            </Text>

            <Text
              style={[styles.heroSubtitle, { color: lc.textSecondary }]}
              data-testid="text-hero-subtitle"
            >
              Manage your pantry, generate recipes from what you have, plan
              meals, and never let food go to waste again.
            </Text>

          </View>

          <View
            style={[
              styles.heroDeviceContainer,
              isWide && styles.heroDeviceContainerWide,
            ]}
          >
            <HeroDeviceMockup isWide={isWide} />
          </View>
        </View>
      </View>

      <ScreenshotShowcase isWide={isWide} />

      <View style={[styles.trustSection, { borderColor: lc.borderSubtle }]} data-testid="section-trust">
        <Text style={[styles.trustTitle, { color: lc.textPrimary }]}>Featured On</Text>
        <View style={[styles.trustLogos, isWide && styles.trustLogosWide]}>
          {trustLogos.map((logo, index) => (
            <View key={index} style={styles.trustLogoItem}>
              <View style={styles.trustLogoIconContainer}>
                {logo.iconType === "material" ? (
                  <MaterialCommunityIcons
                    name={logo.icon as keyof typeof MaterialCommunityIcons.glyphMap}
                    size={24}
                    color={lc.iconColor}
                  />
                ) : logo.iconType === "custom" && logo.icon === "replit" ? (
                  <ReplitLogo size={24} color={lc.iconColor} />
                ) : (
                  <Feather
                    name={logo.icon as keyof typeof Feather.glyphMap}
                    size={24}
                    color={lc.iconColor}
                  />
                )}
              </View>
              <Text style={[styles.trustLogoText, { color: lc.textPrimary }]}>{logo.name}</Text>
            </View>
          ))}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 16,
    paddingTop: Platform.OS === "ios" ? 60 : 16,
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  logoText: {
    fontSize: 22,
    fontWeight: "700",
  },
  signInButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 1,
  },
  signInButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  heroSection: {
    paddingHorizontal: 24,
    paddingVertical: 24,
    alignItems: "center",
  },
  heroSectionWide: {
    paddingVertical: 40,
  },
  heroInner: {
    flexDirection: "column",
    alignItems: "center",
    width: "100%",
    maxWidth: 1200,
    gap: 32,
  },
  heroInnerWide: {
    flexDirection: "column",
    alignItems: "center",
    gap: 40,
  },
  heroContent: {
    alignItems: "center",
    maxWidth: 600,
  },
  heroContentWide: {
    alignItems: "center",
  },
  heroDeviceContainer: {
    marginTop: 8,
  },
  heroDeviceContainerWide: {
    marginTop: 16,
  },
  tagline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    marginBottom: 24,
  },
  taglineText: {
    fontSize: 14,
    fontWeight: "600",
  },
  heroTitle: {
    fontSize: 40,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 48,
  },
  heroSubtitle: {
    fontSize: 18,
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 28,
    maxWidth: 500,
  },
  trustSection: {
    paddingHorizontal: 24,
    paddingVertical: 32,
    alignItems: "center",
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  trustTitle: {
    fontSize: 14,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 24,
  },
  trustLogos: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 32,
  },
  trustLogosWide: {
    gap: 48,
  },
  trustLogoItem: {
    alignItems: "center",
    gap: 8,
  },
  trustLogoIconContainer: {
    height: 24,
    width: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  trustLogoText: {
    fontSize: 12,
  },
});
