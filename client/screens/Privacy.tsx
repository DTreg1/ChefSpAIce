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

export default function PrivacyPolicyPage() {
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
          <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>Privacy Policy</Text>
          <Text style={[styles.lastUpdated, { color: colors.textSecondary }]}>
            Last Updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </Text>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Introduction</Text>
            <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
              At ChefSpAIce, we respect your privacy and are committed to protecting your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our application.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Information We Collect</Text>
            
            <Text style={[styles.subTitle, { color: colors.textPrimary }]}>Personal Information</Text>
            <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
              When you register for an account, we collect your username and password. Your password is securely hashed and never stored in plain text.
            </Text>
            
            <Text style={[styles.subTitle, { color: colors.textPrimary }]}>Food Inventory Data</Text>
            <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
              We collect information about the food items you add to your inventory, including product names, quantities, expiration dates, storage locations, and nutritional information.
            </Text>
            
            <Text style={[styles.subTitle, { color: colors.textPrimary }]}>Usage Information</Text>
            <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
              We collect information about how you interact with our application, including recipes viewed, food items added, and features used.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>How We Use Your Information</Text>
            <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
              We use the information we collect to provide, maintain, and improve our application; to process your account registration; to generate personalized recipe recommendations; to send expiration notifications; and to sync your data across devices.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Third-Party Services</Text>
            <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
              Our application integrates with third-party services including OpenAI (for recipe generation), Open Food Facts (for product information), and USDA FoodData Central (for nutrition data). Your use of these services is subject to their respective privacy policies.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Data Storage</Text>
            <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
              Guest users: Your data is stored locally on your device.{"\n"}
              Registered users: Your data is stored both locally and synced to our cloud database for access across devices.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Data Security</Text>
            <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
              We implement appropriate technical and organizational measures to protect the security of your personal information. Your account is protected by a password that is hashed using SHA-256.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Your Rights</Text>
            <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
              You can review and update your account information in the app settings. You may request the deletion of your account and personal information by contacting us. You can control expiration notifications in the app settings.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Contact Us</Text>
            <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
              If you have any questions about our Privacy Policy, please contact us at privacy@chefspaice.com.
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
        <Text style={[styles.copyright, { color: colors.textMuted }]}>
          © {new Date().getFullYear()} ChefSpAIce. All rights reserved.
        </Text>
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
  subTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
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
    paddingVertical: 24,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  copyright: {
    fontSize: 14,
  },
});
