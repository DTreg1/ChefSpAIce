import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ScrollView,
  useWindowDimensions,
  Platform,
  Linking,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
import { useTheme } from "@/hooks/useTheme";
import { GlassEffect, AppColors } from "@/constants/theme";
import { useState } from "react";

import {
  GlassCard,
  FeatureCard,
  StepCard,
  BenefitCard,
  PricingCard,
  HeroDeviceMockup,
  ScreenshotShowcase,
  FAQItem,
  ReplitLogo,
} from "@/components/landing";

import {
  faqs,
  trustLogos,
  donationAmounts,
  APP_STORE_URL,
  PLAY_STORE_URL,
  BASIC_FEATURES,
  PRO_FEATURES,
} from "@/data/landing-data";

const isWeb = Platform.OS === "web";
const logoImage = require("assets/images/transparent/chef-hat-light-256.png");

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

  const [openFAQ, setOpenFAQ] = useState<number | null>(null);
  const [isAnnual, setIsAnnual] = useState(false);

  const handleDownloadApp = (store: "ios" | "android") => {
    const url = store === "ios" ? APP_STORE_URL : PLAY_STORE_URL;
    Linking.openURL(url).catch((err) => {
      console.error("Failed to open app store:", err);
    });
  };

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
        <View style={styles.header} data-testid="header">
          <View style={styles.logoContainer}>
            <Image source={logoImage} style={{ width: 28, height: 28 }} />
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
              data-testid="button-support"
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
                      color="rgba(255,255,255,0.5)"
                    />
                  ) : logo.iconType === "custom" && logo.icon === "replit" ? (
                    <ReplitLogo size={24} color="rgba(255,255,255,0.5)" />
                  ) : (
                    <Feather
                      name={logo.icon as any}
                      size={24}
                      color="rgba(255,255,255,0.5)"
                    />
                  )}
                </View>
                <Text style={styles.trustLogoText}>{logo.name}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section} data-testid="section-benefits">
          <Text style={styles.sectionTitle} data-testid="text-benefits-title">
            Why Choose ChefSpAIce?
          </Text>
          <Text
            style={styles.sectionSubtitle}
            data-testid="text-benefits-subtitle"
          >
            Save money, reduce waste, and eat better
          </Text>

          <View
            style={[styles.benefitsGrid, isWide && styles.benefitsGridWide]}
          >
            <BenefitCard
              testId="save-money"
              isWide={isWide}
              icon={
                <Feather
                  name="dollar-sign"
                  size={32}
                  color={AppColors.primary}
                />
              }
              title="Save $200+/month"
              description="Stop throwing away expired food. Our users save an average of $200 per month on groceries."
            />
            <BenefitCard
              testId="reduce-waste"
              isWide={isWide}
              icon={
                <Feather name="trash-2" size={32} color={AppColors.primary} />
              }
              title="Reduce Waste by 70%"
              description="Smart expiration tracking and AI-powered meal planning means less food in the trash."
            />
            <BenefitCard
              testId="eat-better"
              isWide={isWide}
              icon={
                <Feather name="heart" size={32} color={AppColors.primary} />
              }
              title="Eat Healthier"
              description="Personalized recipes based on your dietary preferences and what's actually in your kitchen."
            />
            <BenefitCard
              testId="save-time"
              isWide={isWide}
              icon={
                <Feather name="clock" size={32} color={AppColors.primary} />
              }
              title="Save 5+ Hours/Week"
              description="No more wondering 'what's for dinner?' AI suggests meals in seconds, not hours."
            />
          </View>
        </View>

        <View style={styles.section} data-testid="section-how-it-works">
          <Text style={styles.sectionTitle} data-testid="text-howitworks-title">
            How It Works
          </Text>
          <Text
            style={styles.sectionSubtitle}
            data-testid="text-howitworks-subtitle"
          >
            Get started in three simple steps
          </Text>

          <View
            style={[styles.stepsContainer, isWide && styles.stepsContainerWide]}
          >
            <StepCard
              number="1"
              title="Add Your Food"
              description="Scan barcodes, take photos, or manually add items to your inventory."
              isDark={isDark}
              isWide={isWide}
            />
            <StepCard
              number="2"
              title="Get AI Recipes"
              description="Tell us what you're craving and we'll create recipes using your ingredients."
              isDark={isDark}
              isWide={isWide}
            />
            <StepCard
              number="3"
              title="Plan & Cook"
              description="Add recipes to your meal plan and follow step-by-step instructions."
              isDark={isDark}
              isWide={isWide}
            />
          </View>
        </View>

        <View style={styles.section} data-testid="section-features">
          <Text style={styles.sectionTitle} data-testid="text-features-title">
            Smart Features
          </Text>
          <Text
            style={styles.sectionSubtitle}
            data-testid="text-features-subtitle"
          >
            Everything you need to run an efficient kitchen
          </Text>

          <View
            style={[styles.featuresGrid, isWide && styles.featuresGridWide]}
          >
            <FeatureCard
              testId="barcode"
              isDark={isDark}
              isWide={isWide}
              icon={
                <MaterialCommunityIcons
                  name="barcode-scan"
                  size={28}
                  color={AppColors.primary}
                />
              }
              title="Barcode Scanning"
              description="Quickly add items to your inventory by scanning barcodes. Automatic product info lookup."
            />
            <FeatureCard
              testId="ai-recipes"
              isDark={isDark}
              isWide={isWide}
              icon={
                <MaterialCommunityIcons
                  name="creation"
                  size={28}
                  color={AppColors.primary}
                />
              }
              title="AI Recipe Generation"
              description="Get personalized recipes based on what's in your pantry. No more wasted ingredients."
            />
            <FeatureCard
              testId="expiration"
              isDark={isDark}
              isWide={isWide}
              icon={
                <Feather name="clock" size={28} color={AppColors.primary} />
              }
              title="Expiration Tracking"
              description="Never forget about food again. Get notifications before items expire."
            />
            <FeatureCard
              testId="meal-planning"
              isDark={isDark}
              isWide={isWide}
              icon={
                <Feather name="calendar" size={28} color={AppColors.primary} />
              }
              title="Meal Planning"
              description="Plan your week with a beautiful calendar view. Drag and drop recipes to any day."
            />
            <FeatureCard
              testId="shopping"
              isDark={isDark}
              isWide={isWide}
              icon={
                <Feather
                  name="shopping-cart"
                  size={28}
                  color={AppColors.primary}
                />
              }
              title="Smart Shopping Lists"
              description="Auto-generate shopping lists from recipes. Check off items as you shop."
            />
            <FeatureCard
              testId="analytics"
              isDark={isDark}
              isWide={isWide}
              icon={
                <Feather
                  name="bar-chart-2"
                  size={28}
                  color={AppColors.primary}
                />
              }
              title="Waste Analytics"
              description="Track your food waste and savings over time. See your environmental impact."
            />
          </View>
        </View>

        <View style={styles.section} data-testid="section-pricing">
          <Text style={styles.sectionTitle} data-testid="text-pricing-title">
            Simple, Transparent Pricing
          </Text>
          <Text
            style={styles.sectionSubtitle}
            data-testid="text-pricing-subtitle"
          >
            Choose the plan that works best for you
          </Text>

          <View style={styles.billingToggleContainer}>
            <Pressable
              style={styles.billingToggle}
              onPress={() => setIsAnnual(!isAnnual)}
              data-testid="toggle-billing-period"
            >
              <View
                style={[
                  styles.billingOption,
                  !isAnnual && styles.billingOptionActive,
                ]}
              >
                <Text
                  style={[
                    styles.billingOptionText,
                    !isAnnual && styles.billingOptionTextActive,
                  ]}
                >
                  Monthly
                </Text>
              </View>
              <View
                style={[
                  styles.billingOption,
                  isAnnual && styles.billingOptionActive,
                ]}
              >
                <Text
                  style={[
                    styles.billingOptionText,
                    isAnnual && styles.billingOptionTextActive,
                  ]}
                >
                  Annually
                </Text>
                <View style={styles.saveBadge}>
                  <Text style={styles.saveBadgeText}>Save 17%</Text>
                </View>
              </View>
            </Pressable>
          </View>

          <View style={[styles.pricingGrid, isWide && styles.pricingGridWide]}>
            <PricingCard
              tier="Basic"
              price={isAnnual ? "$49.90" : "$4.99"}
              period={isAnnual ? "year" : "month"}
              description="Perfect for getting started"
              features={BASIC_FEATURES}
              buttonText="Download App"
              onPress={() => {}}
              testId="basic"
              isWide={isWide}
              showDownloadButtons={true}
              onDownloadiOS={() => handleDownloadApp("ios")}
              onDownloadAndroid={() => handleDownloadApp("android")}
            />
            <PricingCard
              tier="Pro"
              price={isAnnual ? "$99.90" : "$9.99"}
              period={isAnnual ? "year" : "month"}
              description="Best for home cooks"
              features={PRO_FEATURES}
              isPopular={true}
              buttonText="Download App"
              onPress={() => {}}
              testId="pro"
              isWide={isWide}
              showDownloadButtons={true}
              onDownloadiOS={() => handleDownloadApp("ios")}
              onDownloadAndroid={() => handleDownloadApp("android")}
            />
          </View>
        </View>

        <View style={styles.section} data-testid="section-faq">
          <Text style={styles.sectionTitle} data-testid="text-faq-title">
            Frequently Asked Questions
          </Text>
          <Text style={styles.sectionSubtitle} data-testid="text-faq-subtitle">
            Got questions? We've got answers
          </Text>

          <View style={styles.faqContainer}>
            {faqs.map((faq, index) => (
              <FAQItem
                key={index}
                question={faq.question}
                answer={faq.answer}
                isOpen={openFAQ === index}
                onToggle={() => setOpenFAQ(openFAQ === index ? null : index)}
                testId={`${index + 1}`}
              />
            ))}
          </View>
        </View>

        <View style={styles.ctaSection} data-testid="section-cta">
          <GlassCard style={styles.ctaCard}>
            <Text style={styles.ctaTitle}>Ready to reduce food waste?</Text>
            <Text style={styles.ctaSubtitle}>
              Join thousands of users saving money and the planet
            </Text>
          </GlassCard>
        </View>

        <View style={styles.section} data-testid="section-donate">
          <Text style={styles.sectionTitle} data-testid="text-donate-title">
            Support ChefSpAIce
          </Text>
          <Text
            style={styles.sectionSubtitle}
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

        <View style={styles.footer} data-testid="footer">
          <View style={styles.footerContent}>
            <View style={styles.footerLogo}>
              <Image source={logoImage} style={{ width: 28, height: 28 }} />
              <Text style={styles.footerLogoText}>ChefSpAIce</Text>
            </View>
            <Text style={styles.footerText}>
              Your AI-powered kitchen companion
            </Text>

            <View style={styles.qrCodeSection} data-testid="qr-code-section">
              <View style={styles.qrCodeContainer}>
                <QRCode
                  value="https://chefspaice.com"
                  size={280}
                  color="#FFFFFF"
                  backgroundColor="transparent"
                />
              </View>
              <Text style={styles.qrCodeLabel} data-testid="text-qr-label">
                Scan to share with a friend
              </Text>
            </View>

            <View
              style={[styles.footerLinks, isWide ? {} : styles.footerLinksWrap]}
            >
              <Pressable onPress={() => onAbout?.()} data-testid="link-about">
                <Text style={styles.footerLink}>About</Text>
              </Pressable>
              <Text style={styles.footerDivider}>|</Text>
              <Pressable onPress={() => onPrivacy?.()} data-testid="link-privacy">
                <Text style={styles.footerLink}>Privacy</Text>
              </Pressable>
              <Text style={styles.footerDivider}>|</Text>
              <Pressable onPress={() => onTerms?.()} data-testid="link-terms">
                <Text style={styles.footerLink}>Terms</Text>
              </Pressable>
              <Text style={styles.footerDivider}>|</Text>
              <Pressable onPress={() => onSupport?.()} data-testid="link-support">
                <Text style={styles.footerLink}>Support</Text>
              </Pressable>
            </View>
            <Text style={styles.copyright}>
              &copy; {new Date().getFullYear()} ChefSpAIce. All rights reserved.
            </Text>
          </View>
        </View>
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
    color: "rgba(255, 255, 255, 0.5)",
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
    color: "rgba(255, 255, 255, 0.5)",
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
    color: "rgba(255, 255, 255, 0.5)",
  },
  heroTitle: {
    fontSize: 40,
    fontWeight: "800",
    color: "rgba(255, 255, 255, 0.5)",
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 48,
  },
  heroSubtitle: {
    fontSize: 18,
    color: "rgba(255, 255, 255, 0.8)",
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
    color: "rgba(255, 255, 255, 0.5)",
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
    color: "rgba(255, 255, 255, 0.5)",
  },
  section: {
    paddingHorizontal: 24,
    paddingVertical: 24,
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 32,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.5)",
    textAlign: "center",
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.7)",
    textAlign: "center",
    marginBottom: 40,
  },
  benefitsGrid: {
    flexDirection: "column",
    gap: 24,
    width: "100%",
    maxWidth: 800,
  },
  benefitsGridWide: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 32,
  },
  featuresGrid: {
    flexDirection: "column",
    gap: 16,
    width: "100%",
  },
  featuresGridWide: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    maxWidth: 1000,
    gap: 20,
  },
  stepsContainer: {
    flexDirection: "column",
    gap: 16,
    width: "100%",
  },
  stepsContainerWide: {
    flexDirection: "row",
    justifyContent: "center",
    maxWidth: 1000,
    gap: 20,
  },
  billingToggleContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  billingToggle: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 30,
    padding: 4,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  billingOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 26,
    gap: 8,
  },
  billingOptionActive: {
    backgroundColor: AppColors.primary,
  },
  billingOptionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.6)",
  },
  billingOptionTextActive: {
    color: "rgba(255, 255, 255, 0.5)",
  },
  saveBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  saveBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.5)",
  },
  pricingGrid: {
    flexDirection: "column",
    gap: 20,
    width: "100%",
    maxWidth: 400,
  },
  pricingGridWide: {
    flexDirection: "row",
    justifyContent: "center",
    maxWidth: 1000,
    gap: 24,
  },
  faqContainer: {
    width: "100%",
    maxWidth: 700,
    gap: 12,
  },
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
  footer: {
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    paddingVertical: 24,
    paddingHorizontal: 24,
  },
  footerContent: {
    alignItems: "center",
  },
  footerLogo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  footerLogoText: {
    fontSize: 20,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.5)",
  },
  footerText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
    marginBottom: 24,
  },
  qrCodeSection: {
    alignItems: "center",
    marginBottom: 24,
    padding: 16,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  qrCodeContainer: {
    padding: 8,
    backgroundColor: "rgba(39, 174, 96, 0.15)",
    borderRadius: 12,
    marginBottom: 12,
  },
  qrCodeLabel: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.7)",
    textAlign: "center",
  },
  footerLinks: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 24,
  },
  footerLinksWrap: {
    flexWrap: "wrap",
    justifyContent: "center",
  },
  footerLink: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
  },
  footerDivider: {
    color: "rgba(255, 255, 255, 0.2)",
  },
  copyright: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.4)",
  },
});
