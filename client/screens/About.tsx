import { StyleSheet, View, Text, ScrollView, Pressable, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useWebTheme } from "@/contexts/WebThemeContext";

function getThemeColors(isDark: boolean) {
  return {
    background: isDark ? "#0F1419" : "#F8FAFC",
    card: isDark ? "#1A1F25" : "#FFFFFF",
    cardBorder: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
    textPrimary: isDark ? "#FFFFFF" : "#1A202C",
    textSecondary: isDark ? "#A0AEC0" : "#4A5568",
    textMuted: isDark ? "rgba(255, 255, 255, 0.4)" : "rgba(0, 0, 0, 0.5)",
    footerBg: isDark ? "#0A0D10" : "#F1F5F9",
    brandGreen: "#27AE60",
    iconColor: isDark ? "#FFFFFF" : "#4A5568",
  };
}

export default function AboutPage() {
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
          <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>About ChefSpAIce</Text>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Our Mission</Text>
            <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
              ChefSpAIce was developed to help individuals manage their food inventory more efficiently, 
              reduce food waste, and discover new recipes based on ingredients they already have. 
              Our AI-powered platform provides personalized recommendations and a comprehensive kitchen 
              management system that makes cooking easier and more enjoyable.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Technology Stack</Text>
            <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
              ChefSpAIce is built using modern mobile and web technologies to provide a seamless experience across all platforms:
            </Text>
            <View style={styles.list}>
              <Text style={[styles.listItem, { color: colors.textSecondary }]}>
                <Text style={{ color: colors.textPrimary, fontWeight: "600" }}>Mobile App:</Text> React Native with Expo for iOS and Android
              </Text>
              <Text style={[styles.listItem, { color: colors.textSecondary }]}>
                <Text style={{ color: colors.textPrimary, fontWeight: "600" }}>Backend:</Text> Node.js with Express
              </Text>
              <Text style={[styles.listItem, { color: colors.textSecondary }]}>
                <Text style={{ color: colors.textPrimary, fontWeight: "600" }}>Database:</Text> PostgreSQL for reliable data storage
              </Text>
              <Text style={[styles.listItem, { color: colors.textSecondary }]}>
                <Text style={{ color: colors.textPrimary, fontWeight: "600" }}>AI:</Text> OpenAI GPT-4o-mini for recipe generation and kitchen assistance
              </Text>
              <Text style={[styles.listItem, { color: colors.textSecondary }]}>
                <Text style={{ color: colors.textPrimary, fontWeight: "600" }}>Hosting:</Text> Deployed on Replit for seamless cloud operation
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Partners and Attributions</Text>
            
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>OpenAI</Text>
              <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
                ChefSpAIce leverages OpenAI's advanced AI models to provide intelligent features including recipe generation, kitchen assistance, and smart shelf-life suggestions.
              </Text>
              <Pressable onPress={() => Platform.OS === "web" && window.open("https://openai.com", "_blank")}>
                <Text style={[styles.link, { color: colors.brandGreen }]}>Learn more about OpenAI</Text>
              </Pressable>
            </View>

            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Replit</Text>
              <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
                ChefSpAIce is proudly hosted on Replit, a powerful cloud development platform that enables seamless deployment, real-time collaborative development, and efficient CI/CD workflows.
              </Text>
              <Pressable onPress={() => Platform.OS === "web" && window.open("https://replit.com", "_blank")}>
                <Text style={[styles.link, { color: colors.brandGreen }]}>Learn more about Replit</Text>
              </Pressable>
            </View>

            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Open Food Facts</Text>
              <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
                ChefSpAIce integrates with Open Food Facts, a free and open food product database that provides comprehensive nutritional information, barcode scanning capabilities, and access to a global database of food products.
              </Text>
              <Pressable onPress={() => Platform.OS === "web" && window.open("https://openfoodfacts.org", "_blank")}>
                <Text style={[styles.link, { color: colors.brandGreen }]}>Learn more about Open Food Facts</Text>
              </Pressable>
            </View>

            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>USDA FoodData Central</Text>
              <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
                ChefSpAIce uses the USDA FoodData Central API to provide comprehensive nutrition data lookup, accurate calorie and macronutrient information, and vitamin and mineral content for food items.
              </Text>
              <Pressable onPress={() => Platform.OS === "web" && window.open("https://fdc.nal.usda.gov/", "_blank")}>
                <Text style={[styles.link, { color: colors.brandGreen }]}>Learn more about USDA FoodData Central</Text>
              </Pressable>
            </View>
          </View>

          <View style={[styles.backLink, { borderTopColor: colors.cardBorder }]}>
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
    marginBottom: 24,
  },
  section: {
    marginBottom: 40,
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
  list: {
    marginTop: 8,
  },
  listItem: {
    fontSize: 16,
    lineHeight: 28,
    paddingLeft: 16,
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
  link: {
    fontSize: 16,
    marginTop: 8,
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
