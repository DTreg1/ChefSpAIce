import { StyleSheet, View, Text, Pressable, Image, Platform } from "react-native";
import { webAccessibilityProps } from "@/lib/web-accessibility";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { GlassEffect } from "@/constants/theme";
import { HeroDeviceMockup } from "./HeroDeviceMockup";
import { ScreenshotShowcase } from "./ScreenshotShowcase";
import { ReplitLogo } from "./ReplitLogo";
import { trustLogos } from "@/data/landing-data";

const logoImage = require("../../assets/images/transparent/chef-hat-light-256.png");

interface HeroSectionProps {
  isWide: boolean;
  isDark: boolean;
  onSupport?: () => void;
}

export function HeroSection({ isWide, isDark, onSupport }: HeroSectionProps) {
  return (
    <>
      <View style={styles.header} data-testid="header" role="banner" accessibilityLabel="Site header">
        <View style={styles.logoContainer}>
          <Image source={logoImage} style={{ width: 28, height: 28 }} accessibilityElementsHidden={true} importantForAccessibility="no-hide-descendants" />
          <Text style={styles.logoText} data-testid="text-logo">
            ChefSpAIce
          </Text>
        </View>
        {onSupport && (
          <Pressable
            style={({ pressed }) => [
              styles.signInButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={onSupport}
            {...webAccessibilityProps(onSupport)}
            data-testid="button-support"
            accessibilityRole="button"
            accessibilityLabel="Contact support"
          >
            <Text style={styles.signInButtonText}>Support</Text>
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
            <View style={styles.tagline}>
              <MaterialCommunityIcons name="leaf" size={14} color="#FFFFFF" />
              <Text style={styles.taglineText} data-testid="text-tagline">
                Reduce Food Waste, Save Money
              </Text>
            </View>

            <Text style={styles.heroTitle} data-testid="text-hero-title">
              Your AI-Powered{"\n"}Kitchen Assistant
            </Text>

            <Text
              style={styles.heroSubtitle}
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

      <View style={styles.trustSection} data-testid="section-trust">
        <Text style={styles.trustTitle}>Featured On</Text>
        <View style={[styles.trustLogos, isWide && styles.trustLogosWide]}>
          {trustLogos.map((logo, index) => (
            <View key={index} style={styles.trustLogoItem}>
              <View style={styles.trustLogoIconContainer}>
                {logo.iconType === "material" ? (
                  <MaterialCommunityIcons
                    name={logo.icon as any}
                    size={24}
                    color="rgba(255, 255, 255, 0.8)"
                  />
                ) : logo.iconType === "custom" && logo.icon === "replit" ? (
                  <ReplitLogo size={24} color="rgba(255, 255, 255, 0.8)" />
                ) : (
                  <Feather
                    name={logo.icon as any}
                    size={24}
                    color="rgba(255, 255, 255, 0.8)"
                  />
                )}
              </View>
              <Text style={styles.trustLogoText}>{logo.name}</Text>
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
    color: "rgba(255, 255, 255, 0.95)",
  },
  signInButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: GlassEffect.borderRadius.pill,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  signInButtonText: {
    color: "rgba(255, 255, 255, 0.95)",
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
    borderRadius: GlassEffect.borderRadius.pill,
    backgroundColor: "rgba(39, 174, 96, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(39, 174, 96, 0.3)",
    marginBottom: 24,
  },
  taglineText: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.95)",
  },
  heroTitle: {
    fontSize: 40,
    fontWeight: "800",
    color: "rgba(255, 255, 255, 0.95)",
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 48,
  },
  heroSubtitle: {
    fontSize: 18,
    color: "rgba(255, 255, 255, 0.9)",
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
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  trustTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.95)",
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
    color: "rgba(255, 255, 255, 0.95)",
  },
});
