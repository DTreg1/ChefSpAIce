import { StyleSheet, View, ScrollView, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/contexts/ThemeContext";
import { ThemedText } from "@/components/ThemedText";
import { GlassCard } from "@/components/GlassCard";
import { ExpoGlassHeader } from "@/components/ExpoGlassHeader";
import { Spacing, AppColors } from "@/constants/theme";

const STATIC_TERMS_SECTIONS = [
  {
    title: "1. Acceptance of Terms",
    content: `By downloading, installing, or using ChefSpAIce, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the app.

These terms constitute a legally binding agreement between you and ChefSpAIce.`,
  },
  {
    title: "2. Description of Service",
    content: `ChefSpAIce is a kitchen management application that helps you:

• Track food inventory and expiration dates
• Generate AI-powered recipe suggestions
• Plan meals and reduce food waste
• Scan barcodes to add items quickly

The app may include free and premium features.`,
  },
  {
    title: "3. User Accounts",
    content: `To access certain features, you may need to create an account. You are responsible for:

• Maintaining the confidentiality of your account credentials
• All activities that occur under your account
• Notifying us immediately of any unauthorized use

We reserve the right to suspend or terminate accounts that violate these terms.`,
  },
  {
    title: "5. Acceptable Use",
    content: `You agree not to:

• Use the app for any unlawful purpose
• Attempt to reverse engineer or modify the app
• Transmit harmful code or malware
• Violate any applicable laws or regulations
• Infringe on the rights of others
• Use the app to harass or harm others`,
  },
  {
    title: "6. AI-Generated Content",
    content: `ChefSpAIce uses artificial intelligence to generate recipe suggestions. You acknowledge that:

• AI-generated recipes are suggestions only
• You should verify ingredients for allergies and dietary restrictions
• We are not responsible for the outcome of recipes
• AI suggestions may not always be accurate or appropriate for all situations`,
  },
  {
    title: "7. Intellectual Property",
    content: `All content, features, and functionality of ChefSpAIce are owned by us and protected by intellectual property laws.

User-generated content (such as saved recipes) remains yours, but you grant us a license to use it to provide our services.`,
  },
  {
    title: "8. Limitation of Liability",
    content: `ChefSpAIce is provided "as is" without warranties of any kind. We are not liable for:

• Any indirect, incidental, or consequential damages
• Food safety issues resulting from app usage
• Data loss or service interruptions
• Third-party service failures

Our total liability is limited to the amount you paid for the service.`,
  },
  {
    title: "9. Changes to Terms",
    content: `We may update these Terms of Service from time to time. We will notify you of significant changes.

Your continued use of the app after changes constitutes acceptance of the new terms.`,
  },
  {
    title: "10. Contact Us",
    content: `If you have any questions about these Terms of Service, please contact us:

Email: support@chefspaice.com
Website: https://chefspaice.com/support`,
  },
];

export default function TermsOfServiceScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = Platform.select({ ios: 90, android: 70, default: 0 });

  const getSubscriptionContent = () => {
    if (Platform.OS === "web") {
      return `ChefSpAIce offers the following auto-renewable subscription options:

• Basic Monthly: $4.99/month
• Basic Annual: $49.90/year
• Pro Monthly: $9.99/month
• Pro Annual: $99.90/year

Payment will be charged at confirmation of purchase. Subscriptions automatically renew unless auto-renew is turned off at least 24 hours before the end of the current period. Your account will be charged for renewal within 24 hours prior to the end of the current period at the same price.

You can manage and cancel your subscriptions from your account settings after purchase. Any unused portion of a free trial period, if offered, will be forfeited when you purchase a subscription.

Prices may change with notice provided in advance.`;
    } else if (Platform.OS === "ios") {
      return `ChefSpAIce offers auto-renewable subscription options available as monthly or annual plans.

Actual pricing is displayed in the App Store and may vary by region. Payment will be charged to your Apple ID account at confirmation of purchase. Subscriptions automatically renew unless auto-renew is turned off at least 24 hours before the end of the current period. Your account will be charged for renewal within 24 hours prior to the end of the current period at the same price.

You can manage and cancel your subscriptions by going to your Account Settings on the App Store after purchase. Any unused portion of a free trial period, if offered, will be forfeited when you purchase a subscription.

Prices may change with notice provided in advance. Refunds are handled by Apple in accordance with their refund policies.

For full subscription terms, please refer to Apple's Standard End User License Agreement (EULA): https://www.apple.com/legal/internet-services/itunes/dev/stdeula/`;
    } else {
      return `ChefSpAIce offers auto-renewable subscription options available as monthly or annual plans.

Actual pricing is displayed in the Google Play Store and may vary by region. Payment will be charged to your Google Play account at confirmation of purchase. Subscriptions automatically renew unless auto-renew is turned off at least 24 hours before the end of the current period. Your account will be charged for renewal within 24 hours prior to the end of the current period at the same price.

You can manage and cancel your subscriptions by going to your Account Settings on the Google Play app after purchase. Any unused portion of a free trial period, if offered, will be forfeited when you purchase a subscription.

Prices may change with notice provided in advance. Refunds are handled by Google in accordance with their refund policies.

For full terms, please refer to Google Play's Terms of Service: https://play.google.com/intl/en_us/about/play-terms/`;
    }
  };

  const TERMS_SECTIONS = [
    ...STATIC_TERMS_SECTIONS.slice(0, 3),
    {
      title: "4. Subscriptions & Payments",
      content: getSubscriptionContent(),
    },
    ...STATIC_TERMS_SECTIONS.slice(3),
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ExpoGlassHeader
        title="Terms of Service"
        screenKey="terms"
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
            <Feather name="file-text" size={32} color={AppColors.primary} />
          </View>
          <ThemedText type="h3" style={styles.headerTitle}>
            Terms of Service
          </ThemedText>
          <ThemedText type="caption" style={styles.lastUpdated}>
            Last updated: January 2026
          </ThemedText>
        </GlassCard>

        {TERMS_SECTIONS.map((section, index) => (
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
