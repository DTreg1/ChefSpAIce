import { StyleSheet, View, Text, ScrollView, Pressable, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { ExpoGlassHeader, MenuItemConfig } from "@/components/ExpoGlassHeader";
import { Spacing } from "@/constants/Spacing";

function getThemeColors(isDark: boolean) {
  return {
    background: isDark ? "#0F1419" : "#F8FAFC",
    card: isDark ? "#1A1F25" : "#FFFFFF",
    cardBorder: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
    textPrimary: isDark ? "#FFFFFF" : "#1A202C",
    textSecondary: isDark ? "#A0AEC0" : "#4A5568",
    textMuted: isDark ? "rgba(255, 255, 255, 0.4)" : "rgba(0, 0, 0, 0.5)",
    footerBg: isDark ? "#0A0D10" : "#F1F5F9",
    borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
    brandGreen: "#27AE60",
  };
}

export default function AttributionsPage() {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);
  const insets = useSafeAreaInsets();
  const menuItems: MenuItemConfig[] = [];

  const navigateTo = (path: string) => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.location.href = path;
    }
  };

  const openLink = (url: string) => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.open(url, "_blank");
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ExpoGlassHeader
        title="Attributions"
        screenKey="attributions"
        showSearch={false}
        menuItems={menuItems}
      />
      <ScrollView
        style={[styles.container, { backgroundColor: "transparent" }]}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingTop: 56 + insets.top + Spacing.lg },
        ]}
      >
        <View style={styles.main}>
        <View style={styles.content}>
          <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>Attributions</Text>
          <Text style={[styles.intro, { color: colors.textSecondary }]}>
            ChefSpAIce is made possible by the following amazing technologies, services, and open-source projects.
          </Text>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Core Technologies</Text>
            
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>OpenAI</Text>
              <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
                Powering our AI features with GPT-4o-mini for intelligent recipe generation, AI Kitchen Assistant for cooking guidance, and smart shelf-life predictions.
              </Text>
              <Pressable onPress={() => openLink("https://openai.com")}>
                <Text style={[styles.link, { color: colors.brandGreen }]}>openai.com</Text>
              </Pressable>
            </View>

            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Expo & React Native</Text>
              <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
                The foundation of our cross-platform mobile app. React Native for native iOS and Android experience, Expo for streamlined development, and EAS Build for app store submissions.
              </Text>
              <View style={styles.linkRow}>
                <Pressable onPress={() => openLink("https://expo.dev")}>
                  <Text style={[styles.link, { color: colors.brandGreen }]}>expo.dev</Text>
                </Pressable>
                <Text style={[styles.linkSeparator, { color: colors.textMuted }]}>•</Text>
                <Pressable onPress={() => openLink("https://reactnative.dev")}>
                  <Text style={[styles.link, { color: colors.brandGreen }]}>reactnative.dev</Text>
                </Pressable>
              </View>
            </View>

            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Replit</Text>
              <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
                Our cloud development and hosting platform providing cloud-based development environment, seamless deployment, and AI-assisted development tools.
              </Text>
              <Pressable onPress={() => openLink("https://replit.com")}>
                <Text style={[styles.link, { color: colors.brandGreen }]}>replit.com</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Data Sources</Text>
            
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>USDA FoodData Central</Text>
              <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
                Comprehensive nutrition data from the U.S. Department of Agriculture including detailed nutrient information, calorie and macronutrient data, and vitamins and minerals content.
              </Text>
              <Text style={[styles.license, { color: colors.textMuted }]}>Public domain resource</Text>
              <Pressable onPress={() => openLink("https://fdc.nal.usda.gov/")}>
                <Text style={[styles.link, { color: colors.brandGreen }]}>fdc.nal.usda.gov</Text>
              </Pressable>
            </View>

            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Open Food Facts</Text>
              <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
                Free, open-source food product database providing barcode scanning, product lookup, nutrition facts, ingredient lists, and a global database of food products.
              </Text>
              <Text style={[styles.license, { color: colors.textMuted }]}>Open Database License (ODbL)</Text>
              <Pressable onPress={() => openLink("https://openfoodfacts.org")}>
                <Text style={[styles.link, { color: colors.brandGreen }]}>openfoodfacts.org</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Open Source Libraries</Text>
            
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
                ChefSpAIce is built with many open-source libraries including:
              </Text>
              <View style={styles.libraryColumns}>
                <View style={styles.libraryColumn}>
                  <Text style={[styles.libraryHeader, { color: colors.textPrimary }]}>Frontend</Text>
                  <Text style={[styles.libraryItem, { color: colors.textSecondary }]}>• React Navigation</Text>
                  <Text style={[styles.libraryItem, { color: colors.textSecondary }]}>• React Native Reanimated</Text>
                  <Text style={[styles.libraryItem, { color: colors.textSecondary }]}>• TanStack React Query</Text>
                  <Text style={[styles.libraryItem, { color: colors.textSecondary }]}>• date-fns</Text>
                  <Text style={[styles.libraryItem, { color: colors.textSecondary }]}>• Expo Vector Icons</Text>
                </View>
                <View style={styles.libraryColumn}>
                  <Text style={[styles.libraryHeader, { color: colors.textPrimary }]}>Backend</Text>
                  <Text style={[styles.libraryItem, { color: colors.textSecondary }]}>• Express.js</Text>
                  <Text style={[styles.libraryItem, { color: colors.textSecondary }]}>• Drizzle ORM</Text>
                  <Text style={[styles.libraryItem, { color: colors.textSecondary }]}>• PostgreSQL</Text>
                  <Text style={[styles.libraryItem, { color: colors.textSecondary }]}>• Zod</Text>
                  <Text style={[styles.libraryItem, { color: colors.textSecondary }]}>• Stripe</Text>
                </View>
              </View>
            </View>
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
            <Pressable onPress={() => navigateTo("/terms")} data-testid="link-terms">
              <Text style={[styles.footerLink, { color: colors.textSecondary }]}>Terms of Service</Text>
            </Pressable>
            <Text style={[styles.footerDivider, { color: colors.textMuted }]}>•</Text>
            <Pressable onPress={() => navigateTo("/support")} data-testid="link-support">
              <Text style={[styles.footerLink, { color: colors.textSecondary }]}>Support</Text>
            </Pressable>
          </View>
          <Text style={[styles.copyright, { color: colors.textMuted }]}>
            © {new Date().getFullYear()} ChefSpAIce. All rights reserved.
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
    marginBottom: 12,
  },
  intro: {
    fontSize: 16,
    lineHeight: 26,
    marginBottom: 32,
  },
  section: {
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "600",
    marginBottom: 20,
  },
  card: {
    borderRadius: 12,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 12,
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 26,
    marginBottom: 12,
  },
  license: {
    fontSize: 14,
    marginBottom: 8,
  },
  link: {
    fontSize: 16,
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  linkSeparator: {
    fontSize: 14,
  },
  libraryColumns: {
    flexDirection: "row",
    marginTop: 16,
    gap: 40,
  },
  libraryColumn: {
    flex: 1,
  },
  libraryHeader: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  libraryItem: {
    fontSize: 14,
    lineHeight: 24,
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
