import { StyleSheet, View, ScrollView, useWindowDimensions, Linking } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/hooks/useTheme";

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
      console.error("Failed to open app store:", err);
    });
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={
          isDark
            ? ["#0A1F0F", "#0F1419", "#0A0F14"]
            : ["#1A3D2A", "#1E4D35", "#0F2A1A"]
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
        <DonationSection isWide={isWide} />
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
