import {
  View,
  Text,
  ScrollView,
  Pressable,
  Platform,
  Image,
} from "react-native";
import { GradientBackground } from "@/components/GradientBackground.web";
import { useTheme } from "@/hooks/useTheme";
import { useNavigate } from "@/lib/web-router";
import { Spacing } from "@/constants/theme";
import { AppUrls } from "@/constants/urls";
import { webSharedStyles, WebTypography, NAV_LINKS } from "./sharedStyles";

const isWeb = Platform.OS === "web";
const chefHatLight = require("../../assets/images/transparent/chef-hat-light-128.png");

export default function PrivacyScreen() {
  const { style } = useTheme();
  const colors = style.webInfo;
  const currentPath = "/privacy";
  const navigate = useNavigate();

  return (
    <ScrollView
      style={webSharedStyles.container}
      contentContainerStyle={webSharedStyles.contentContainer}
    >
      <GradientBackground />

      {isWeb && (
        <View style={webSharedStyles.header} role="banner" accessibilityLabel="Site header">
          <Pressable
            style={webSharedStyles.logoContainer}
            onPress={() => navigate("/")}
            accessibilityRole="link"
            accessibilityLabel="Go to home page"
          >
            <Image
              source={chefHatLight}
              style={{ width: 32, height: 32 }}
              resizeMode="contain"
              accessibilityElementsHidden={true}
              importantForAccessibility="no-hide-descendants"
            />
            <Text style={[WebTypography.logoText, { color: colors.textPrimary }]}>
              ChefSpAIce
            </Text>
          </Pressable>
          <View style={webSharedStyles.navLinks} role="navigation" accessibilityLabel="Site navigation">
            {NAV_LINKS.map((link) => (
              <Pressable
                key={link.path}
                onPress={() => navigate(link.path)}
                style={webSharedStyles.navLink}
                data-testid={`nav-link-${link.label.toLowerCase()}`}
                accessibilityRole="link"
                accessibilityLabel={`Navigate to ${link.label}`}
              >
                <Text
                  style={[
                    WebTypography.navLinkText,
                    {
                      color:
                        currentPath === link.path
                          ? colors.brandGreen
                          : colors.textSecondary,
                    },
                  ]}
                >
                  {link.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      <View style={webSharedStyles.content}>
        <Text style={[WebTypography.pageTitle, { color: colors.textPrimary, marginBottom: Spacing.sm }]}>
          Privacy Policy
        </Text>
        <Text style={[WebTypography.lastUpdated, { color: colors.textMuted }]}>
          Last updated: February 2026
        </Text>

        <View
          style={[
            webSharedStyles.card,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <Text style={[WebTypography.sectionTitle, { color: colors.textPrimary }]}>
            1. Information We Collect
          </Text>
          <Text style={[WebTypography.paragraph, { color: colors.textSecondary }]}>
            We collect information you provide directly, including:{"\n\n"}-
            Account information (email, name) when you register{"\n"}- Food
            inventory data (items, quantities, expiration dates){"\n"}- Recipe
            preferences and dietary restrictions{"\n"}- Usage data to improve
            our services{"\n\n"}
            We do not sell, rent, or share your personal information with third
            parties for marketing purposes.
          </Text>
        </View>

        <View
          style={[
            webSharedStyles.card,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <Text style={[WebTypography.sectionTitle, { color: colors.textPrimary }]}>
            2. How We Use Your Information
          </Text>
          <Text style={[WebTypography.paragraph, { color: colors.textSecondary }]}>
            Your information is used to:{"\n\n"}- Track your food inventory and
            expiration dates{"\n"}- Generate personalized AI-powered recipe
            suggestions{"\n"}- Send notifications about expiring items{"\n"}-
            Improve and personalize your experience{"\n"}- Provide customer
            support
          </Text>
        </View>

        <View
          style={[
            webSharedStyles.card,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <Text style={[WebTypography.sectionTitle, { color: colors.textPrimary }]}>
            3. Data Storage & Security
          </Text>
          <Text style={[WebTypography.paragraph, { color: colors.textSecondary }]}>
            Your data is stored securely using industry-standard encryption.
            Inventory data is stored locally on your device by default. If you
            create an account, data may be synced to our secure cloud servers
            for backup and cross-device access. We implement appropriate
            technical and organizational measures to protect your personal data
            against unauthorized access, alteration, disclosure, or destruction.
          </Text>
        </View>

        <View
          style={[
            webSharedStyles.card,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <Text style={[WebTypography.sectionTitle, { color: colors.textPrimary }]}>
            4. Third-Party Services
          </Text>
          <Text style={[WebTypography.paragraph, { color: colors.textSecondary }]}>
            We integrate with the following third-party services:{"\n\n"}-
            OpenAI: Powers our AI recipe generation. When you request a recipe,
            relevant inventory information is processed by OpenAI's API.{"\n"}-
            RevenueCat: Manages in-app subscriptions and purchase verification.{"\n"}-
            Stripe: Handles secure payment processing for subscriptions.{"\n"}-
            Barcode databases: Used to identify scanned products.{"\n\n"}
            Each third-party service has its own privacy policy governing the
            use of your information.
          </Text>
        </View>

        <View
          style={[
            webSharedStyles.card,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <Text style={[WebTypography.sectionTitle, { color: colors.textPrimary }]}>
            5. Your Rights
          </Text>
          <Text style={[WebTypography.paragraph, { color: colors.textSecondary }]}>
            You have the right to:{"\n\n"}- Access your personal data{"\n"}-
            Correct inaccurate information{"\n"}- Delete your account and
            associated data{"\n"}- Export your data in a portable format{"\n"}-
            Opt out of non-essential communications{"\n\n"}
            To exercise these rights, contact us at {AppUrls.privacyEmail} or
            use the settings within the app.
          </Text>
        </View>

        <View
          style={[
            webSharedStyles.card,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <Text style={[WebTypography.sectionTitle, { color: colors.textPrimary }]}>
            6. Nutrition Information Disclaimer
          </Text>
          <Text style={[WebTypography.paragraph, { color: colors.textSecondary }]}>
            Nutrition data provided in ChefSpAIce is sourced from third-party
            databases (USDA, OpenFoodFacts) and AI-generated estimates. This
            information is for general informational purposes only and should
            not be considered a substitute for professional medical or dietary
            advice. Always consult with a qualified healthcare professional
            before making dietary decisions based on nutrition information
            provided in this app.
          </Text>
        </View>

        <View
          style={[
            webSharedStyles.card,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <Text style={[WebTypography.sectionTitle, { color: colors.textPrimary }]}>
            7. Children's Privacy
          </Text>
          <Text style={[WebTypography.paragraph, { color: colors.textSecondary }]}>
            ChefSpAIce is not intended for children under 13 years of age. We do
            not knowingly collect personal information from children under 13.
            If you believe we have collected information from a child under 13,
            please contact us immediately so we can delete the information.
          </Text>
        </View>

        <View
          style={[
            webSharedStyles.card,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <Text style={[WebTypography.sectionTitle, { color: colors.textPrimary }]}>
            8. Data Retention & Account Deletion
          </Text>
          <Text style={[WebTypography.paragraph, { color: colors.textSecondary }]}>
            We retain your personal data only for as long as your account is
            active and as needed to provide you with our services. When you
            delete your account through the app settings, all associated data
            is permanently and immediately removed from our systems, including:
            {"\n\n"}- Account information (email, name, profile){"\n"}- All
            pantry items and food inventory data{"\n"}- Recipe preferences,
            dietary restrictions, and saved recipes{"\n"}- Subscription
            records and payment metadata{"\n"}- Any images stored in our
            cloud storage{"\n\n"}
            This deletion is irreversible. We do not retain backups of deleted
            account data. If you have an active subscription, it will be
            canceled automatically upon account deletion. We recommend
            exporting your data before deleting your account using the data
            export feature in your account settings.
          </Text>
        </View>

        <View
          style={[
            webSharedStyles.card,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <Text style={[WebTypography.sectionTitle, { color: colors.textPrimary }]}>
            9. Changes to This Policy
          </Text>
          <Text style={[WebTypography.paragraph, { color: colors.textSecondary }]}>
            We may update this Privacy Policy from time to time. We will notify
            you of any significant changes by posting the new policy on this
            page and updating the "Last updated" date. We encourage you to
            review this policy periodically for any changes.
          </Text>
        </View>

        <View
          style={[
            webSharedStyles.card,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <Text style={[WebTypography.sectionTitle, { color: colors.textPrimary }]}>
            10. Contact Us
          </Text>
          <Text style={[WebTypography.paragraph, { color: colors.textSecondary }]}>
            If you have questions about this Privacy Policy or our data
            practices, please contact us at:{"\n\n"}
            Email: {AppUrls.privacyEmail}{"\n"}
            Or visit our Support page for additional contact options.
          </Text>
        </View>
      </View>

      {isWeb && (
        <View style={[webSharedStyles.footer, { backgroundColor: colors.footerBg }]} role="contentinfo">
          <Text style={[WebTypography.copyright, { color: colors.textMuted }]}>
            © {new Date().getFullYear()} ChefSpAIce. All rights reserved.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}
