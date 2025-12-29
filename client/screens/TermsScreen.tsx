import { StyleSheet, View, Text, ScrollView, Pressable, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useWebTheme } from "@/contexts/WebThemeContext";

function getThemeColors(isDark: boolean) {
  return {
    background: isDark ? "#0F1419" : "#F8FAFC",
    textPrimary: isDark ? "#FFFFFF" : "#1A202C",
    textSecondary: isDark ? "#A0AEC0" : "#4A5568",
    textMuted: isDark ? "rgba(255, 255, 255, 0.4)" : "rgba(0, 0, 0, 0.5)",
    footerBg: isDark ? "#0A0D10" : "#F1F5F9",
    borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
    brandGreen: "#27AE60",
  };
}

export default function TermsOfServicePage() {
  const { isDark, toggleTheme } = useWebTheme();
  const colors = getThemeColors(isDark);

  const navigateTo = (path: string) => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.location.href = path;
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Pressable onPress={() => navigateTo("/")} style={styles.logoContainer}>
          <Text style={[styles.logoText, { color: colors.brandGreen }]}>ChefSpAIce</Text>
        </Pressable>
        <Pressable
          onPress={toggleTheme}
          style={[styles.themeToggle, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)" }]}
        >
          {isDark ? (
            <Feather name="sun" size={20} color={colors.textPrimary} />
          ) : (
            <Feather name="moon" size={20} color={colors.textPrimary} />
          )}
        </Pressable>
      </View>

      <View style={styles.main}>
        <View style={styles.content}>
          <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>Terms of Service</Text>
          <Text style={[styles.lastUpdated, { color: colors.textSecondary }]}>
            Last Updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </Text>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Introduction</Text>
            <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
              Welcome to ChefSpAIce. These Terms of Service govern your access to and use of the ChefSpAIce application and services. By accessing or using our application, you agree to be bound by these Terms and our Privacy Policy.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Account Registration</Text>
            <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
              To use ChefSpAIce, you must register for an account and maintain an active subscription. You are responsible for safeguarding your password and for all activities that occur under your account.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Free Service</Text>
            <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
              ChefSpAIce is currently provided as a free service. We reserve the right to introduce paid features or subscriptions in the future, with reasonable notice to users. We also accept voluntary donations to support development and maintenance.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>User Content</Text>
            <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
              Our application allows you to store content, including food inventory data, recipes, and meal plans. You retain ownership of your content. By using ChefSpAIce, you grant us a limited license to store and process your content for the purpose of providing our services.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Acceptable Use</Text>
            <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
              You agree to use our application only for lawful purposes. You agree not to violate any applicable laws, impersonate others, interfere with the functioning of the application, attempt unauthorized access, use automated means without permission, or share your account credentials.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Third-Party Services</Text>
            <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
              Our application integrates with third-party services including OpenAI, Open Food Facts, and USDA FoodData Central. Your use of these services is subject to their respective terms and privacy policies. We do not control these services and are not responsible for their content or practices.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Disclaimers</Text>
            <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
              Our application is provided "as is" without warranties of any kind. We do not guarantee the accuracy of nutritional information or recipe recommendations. The information provided should not be considered as professional medical or food safety advice. Always use your own judgment regarding food safety.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Limitation of Liability</Text>
            <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
              To the maximum extent permitted by law, ChefSpAIce shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the application, including food spoilage, waste, or health issues arising from following recipes or nutritional information.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Contact Us</Text>
            <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
              If you have any questions about these Terms, please contact us at terms@chefspaice.com.
            </Text>
          </View>

          <View style={[styles.backLink, { borderTopColor: colors.borderColor }]}>
            <Pressable onPress={() => navigateTo("/")}>
              <Text style={[styles.link, { color: colors.brandGreen }]}>&larr; Back to Home</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <View style={[styles.footer, { backgroundColor: colors.footerBg }]}>
        <View style={styles.footerContent}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            Helping you reduce food waste, one meal at a time.
          </Text>
          <View style={styles.footerLinks}>
            <Pressable onPress={() => navigateTo("/about")} data-testid="link-about">
              <Text style={[styles.footerLink, { color: colors.textSecondary }]}>About</Text>
            </Pressable>
            <Text style={[styles.footerDivider, { color: colors.textMuted }]}>•</Text>
            <Pressable onPress={() => navigateTo("/privacy")} data-testid="link-privacy">
              <Text style={[styles.footerLink, { color: colors.textSecondary }]}>Privacy Policy</Text>
            </Pressable>
            <Text style={[styles.footerDivider, { color: colors.textMuted }]}>•</Text>
            <Pressable onPress={() => navigateTo("/support")} data-testid="link-support">
              <Text style={[styles.footerLink, { color: colors.textSecondary }]}>Support</Text>
            </Pressable>
            <Text style={[styles.footerDivider, { color: colors.textMuted }]}>•</Text>
            <Pressable onPress={() => navigateTo("/attributions")} data-testid="link-attributions">
              <Text style={[styles.footerLink, { color: colors.textSecondary }]}>Attributions</Text>
            </Pressable>
          </View>
          <Text style={[styles.copyright, { color: colors.textMuted }]}>
            © {new Date().getFullYear()} ChefSpAIce. All rights reserved.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    minHeight: "100%",
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoText: {
    fontSize: 24,
    fontWeight: "700",
  },
  themeToggle: {
    padding: 10,
    borderRadius: 10,
  },
  main: {
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  content: {
    maxWidth: 800,
    alignSelf: "center",
    width: "100%",
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: "700",
    marginBottom: 8,
  },
  lastUpdated: {
    fontSize: 14,
    marginBottom: 32,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "600",
    marginBottom: 16,
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 26,
    marginBottom: 12,
  },
  link: {
    fontSize: 16,
  },
  backLink: {
    borderTopWidth: 1,
    paddingTop: 24,
    marginTop: 24,
  },
  footer: {
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  footerContent: {
    alignItems: "center",
  },
  footerText: {
    fontSize: 14,
    marginBottom: 24,
  },
  footerLinks: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 24,
  },
  footerLink: {
    fontSize: 14,
  },
  footerDivider: {},
  copyright: {
    fontSize: 12,
  },
});
