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
  const { isDark } = useTheme();
  const isWide = width > 768;

  const handleDownloadApp = (store: "ios" | "android") => {
    const url = store === "ios" ? APP_STORE_URL : PLAY_STORE_URL;
    Linking.openURL(url).catch((err) => {
      logger.error("Failed to open app store:", err);
    });
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={
          isDark
            ? (Platform.OS === "web" 
                ? ["oklch(24% 0.06 132)", "oklch(27.4% 0.072 132.109)", "oklch(21% 0.055 132)"]
                : ["#1a3510", "#1f3a0e", "#152c0b"])
            : (Platform.OS === "web"
                ? ["oklch(92.5% 0.084 155.995)", "oklch(90% 0.075 155)", "oklch(94% 0.07 155)"]
                : ["#d4eec8", "#c5e4b5", "#ddf4d4"])
        }
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <HeroSection isWide={isWide} isDark={isDark} onSupport={onSupport} />
        <BenefitsSection isWide={isWide} />
        <HowItWorksSection isWide={isWide} isDark={isDark} />
        <FeatureGridSection isWide={isWide} isDark={isDark} />
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
