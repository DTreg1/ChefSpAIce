import { StyleSheet, View, ScrollView, useWindowDimensions, Linking, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/hooks/useTheme";
import { logger } from "@/lib/logger";
import {
  HeroSection,
  BenefitsSection,
  HowItWorksSection,
  FeatureGridSection,
  PricingSection,
  FAQSection,
  DonationSection,
  FooterSection,
} from "@/components/landing";

import { APP_STORE_URL, PLAY_STORE_URL } from "@/data/landing-data";

interface LandingScreenProps {
  onAbout?: () => void;
  onPrivacy?: () => void;
  onTerms?: () => void;
  onSupport?: () => void;
}

export default function LandingScreen({
  onAbout,
  onPrivacy,
  onTerms,
  onSupport,
}: LandingScreenProps) {
  const { width } = useWindowDimensions();
  const { style } = useTheme();
  const isWide = width > 768;

  const handleDownloadApp = (store: "ios" | "android") => {
    const url = store === "ios" ? APP_STORE_URL : PLAY_STORE_URL;
    Linking.openURL(url).catch((err) => {
      logger.error("Failed to open app store:", err);
    });
  };

  const gradientColors = [
    ...(Platform.OS === "web" 
      ? style.landing.backgrounds.gradient.web 
      : style.landing.backgrounds.gradient.native)
  ] as [string, string, ...string[]];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={gradientColors}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <HeroSection isWide={isWide} onSupport={onSupport} />
        <BenefitsSection isWide={isWide} />
        <HowItWorksSection isWide={isWide} />
        <FeatureGridSection isWide={isWide} />
        <PricingSection isWide={isWide} onDownloadApp={handleDownloadApp} />
        <FAQSection />
        {Platform.OS === "web" && <DonationSection isWide={isWide} />}
        <FooterSection
          isWide={isWide}
          onAbout={onAbout}
          onPrivacy={onPrivacy}
          onTerms={onTerms}
          onSupport={onSupport}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
  },
});
