import { StyleSheet, View, ScrollView, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/contexts/ThemeContext";
import { ThemedText } from "@/components/ThemedText";
import { GlassCard } from "@/components/GlassCard";
import { ExpoGlassHeader } from "@/components/ExpoGlassHeader";
import { Spacing, AppColors } from "@/constants/theme";

const PRIVACY_SECTIONS = [
  {
    title: "1. Information We Collect",
    content: `We collect information you provide directly, including:

• Account information (email, name) when you register
• Food inventory data (items, quantities, expiration dates)
• Recipe preferences and dietary restrictions
• Usage data to improve our services

We do not sell, rent, or share your personal information with third parties for marketing purposes.`,
  },
  {
    title: "2. How We Use Your Information",
    content: `Your information is used to:

• Track your food inventory and expiration dates
• Generate personalized AI-powered recipe suggestions
• Send notifications about expiring items
• Improve and personalize your experience
• Provide customer support`,
  },
  {
    title: "3. Data Storage & Security",
    content: `Your data is stored securely using industry-standard encryption. Inventory data is stored locally on your device by default.

If you create an account, data may be synced to our secure cloud servers for backup and cross-device access.

We implement appropriate technical and organizational measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction.`,
  },
  {
    title: "4. Third-Party Services",
    content: `We integrate with the following third-party services:

• OpenAI: Powers our AI recipe generation. When you request a recipe, relevant inventory information is processed by OpenAI's API.
• RevenueCat: Handles in-app purchase and subscription management.
• Barcode databases: Used to identify scanned products.

Each third-party service has its own privacy policy governing the use of your information.`,
  },
  {
    title: "5. Your Rights",
    content: `You have the right to:

• Access your personal data
• Correct inaccurate information
• Delete your account and associated data
• Export your data in a portable format
• Opt out of non-essential communications

To exercise these rights, contact us at privacy@chefspaice.com or use the settings within the app.`,
  },
  {
    title: "6. Nutrition Information Disclaimer",
    content: `Nutrition data displayed in ChefSpAIce is sourced from third-party databases (USDA FoodData Central, OpenFoodFacts) and AI-generated estimates.

This information is provided for general informational purposes only and:

• May not be 100% accurate for all products
• Should not be considered medical or dietary advice
• Is not intended to diagnose, treat, or prevent any condition
• Should not replace consultation with a qualified healthcare professional

Always verify nutrition information and consult a healthcare provider for dietary decisions, especially if you have allergies, medical conditions, or specific nutritional requirements.`,
  },
  {
    title: "7. Children's Privacy",
    content: `ChefSpAIce is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13.

If you believe we have collected information from a child under 13, please contact us immediately so we can delete the information.`,
  },
  {
    title: "8. Data Retention & Account Deletion",
    content: `We retain your personal data only for as long as your account is active and as needed to provide you with our services. When you delete your account through the app settings, all associated data is permanently and immediately removed from our systems, including:

• Account information (email, name, profile)
• All pantry items and food inventory data
• Recipe preferences, dietary restrictions, and saved recipes
• Subscription records and payment metadata
• Any images stored in our cloud storage

This deletion is irreversible. We do not retain backups of deleted account data. If you have an active subscription, it will be canceled automatically upon account deletion. We recommend exporting your data before deleting your account using the data export feature in your account settings.`,
  },
  {
    title: "9. Changes to This Policy",
    content: `We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last updated" date.

Your continued use of the app after any changes constitutes acceptance of the new policy.`,
  },
  {
    title: "10. Contact Us",
    content: `If you have any questions about this Privacy Policy, please contact us:

Email: privacy@chefspaice.com
Website: https://chefspaice.com/support`,
  },
];

export default function PrivacyPolicyScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = Platform.select({ ios: 90, android: 70, default: 0 });

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ExpoGlassHeader
        title="Privacy Policy"
        screenKey="privacy"
        showSearch={false}
        showBackButton={true}
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: 56 + insets.top + Spacing.lg,
            paddingBottom: tabBarHeight + Spacing.xl,
          },
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
      >
        <GlassCard style={styles.headerCard}>
          <View style={styles.headerIconContainer}>
            <Feather name="shield" size={32} color={AppColors.primary} />
          </View>
          <ThemedText type="h3" style={styles.headerTitle}>
            Your Privacy Matters
          </ThemedText>
          <ThemedText type="caption" style={styles.lastUpdated}>
            Last updated: February 2026
          </ThemedText>
        </GlassCard>

        {PRIVACY_SECTIONS.map((section, index) => (
          <GlassCard key={index} style={styles.sectionCard}>
            <ThemedText type="h4" style={styles.sectionTitle}>
              {section.title}
            </ThemedText>
            <ThemedText type="body" style={styles.sectionContent}>
              {section.content}
            </ThemedText>
          </GlassCard>
        ))}
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
  content: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  headerCard: {
    alignItems: "center",
    padding: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  headerIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${AppColors.primary}15`,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  headerTitle: {
    textAlign: "center",
    marginBottom: Spacing.xs,
  },
  lastUpdated: {
    textAlign: "center",
    opacity: 0.7,
  },
  sectionCard: {
    padding: Spacing.lg,
  },
  sectionTitle: {
    marginBottom: Spacing.sm,
  },
  sectionContent: {
    lineHeight: 22,
    opacity: 0.9,
  },
});
