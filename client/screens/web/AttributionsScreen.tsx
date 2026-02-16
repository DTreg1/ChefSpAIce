import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { useNavigation } from "@react-navigation/native";
import { webClickable } from "@/lib/types";

const BRAND_GREEN = "#1a2e05";
const isWeb = Platform.OS === "web";

function useNavigationSafe() {
  try {
    return useNavigation();
  } catch {
    return null;
  }
}

export default function AttributionsScreen() {
  const { setThemePreference, style: themeStyle } = useTheme();
  const toggleTheme = () => setThemePreference(themeStyle.colorScheme === "dark" ? "light" : "dark");
  const navigation = useNavigationSafe();

  const handleGoHome = () => {
    if (isWeb && typeof window !== "undefined") {
      window.location.href = "/";
    } else if (navigation?.canGoBack()) {
      navigation.goBack();
    }
  };

  const attributions = [
    {
      name: "Expo",
      description: "React Native development platform",
      url: "https://expo.dev",
    },
    {
      name: "OpenAI",
      description: "AI-powered recipe generation",
      url: "https://openai.com",
    },
    {
      name: "Stripe",
      description: "Secure payment processing",
      url: "https://stripe.com",
    },
    {
      name: "Instacart",
      description: "Grocery ordering and delivery",
      url: "https://instacart.com",
    },
    {
      name: "React Navigation",
      description: "Navigation framework",
      url: "https://reactnavigation.org",
    },
    {
      name: "Lucide Icons",
      description: "Beautiful open-source icons",
      url: "https://lucide.dev",
    },
    {
      name: "Open Food Facts",
      description: "Food product database",
      url: "https://openfoodfacts.org",
    },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: themeStyle.webPage.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      <LinearGradient
        colors={[themeStyle.webPage.background, themeStyle.webPage.backgroundGradient]}
        style={StyleSheet.absoluteFillObject}
      />

      {isWeb && (
        <View style={styles.header}>
          <Pressable style={styles.logoContainer} onPress={handleGoHome} accessibilityRole="link" accessibilityLabel="Go to home page">
            <MaterialCommunityIcons
              name="chef-hat"
              size={32}
              color={BRAND_GREEN}
            />
            <Text style={[styles.logoText, { color: themeStyle.webPage.textPrimary }]}>
              ChefSpAIce
            </Text>
          </Pressable>
          <Pressable
            onPress={toggleTheme}
            style={[
              styles.themeToggle,
              {
                backgroundColor: themeStyle.webPage.toggleBg,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Toggle theme"
          >
            <Feather name={themeStyle.icon.themeToggle === "moon" ? "sun" : "moon"} size={20} color={themeStyle.webPage.textPrimary} />
          </Pressable>
        </View>
      )}

      <View style={styles.content}>
        <Text style={[styles.title, { color: themeStyle.webPage.textPrimary }]}>
          Attributions
        </Text>
        <Text style={[styles.subtitle, { color: themeStyle.webPage.textSecondary }]}>
          ChefSpAIce is built with the help of these amazing open-source
          projects and services.
        </Text>

        {attributions.map((item, index) => (
          <View
            key={index}
            style={[
              styles.card,
              { backgroundColor: themeStyle.webPage.card, borderColor: themeStyle.webPage.cardBorder },
            ]}
          >
            <Text style={[styles.itemName, { color: themeStyle.webPage.textPrimary }]}>
              {item.name}
            </Text>
            <Text
              style={[styles.itemDescription, { color: themeStyle.webPage.textSecondary }]}
            >
              {item.description}
            </Text>
            <Text style={[styles.itemUrl, { color: BRAND_GREEN }]}>
              {item.url}
            </Text>
          </View>
        ))}

        <View
          style={[
            styles.card,
            { backgroundColor: themeStyle.webPage.card, borderColor: themeStyle.webPage.cardBorder },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: themeStyle.webPage.textPrimary }]}>
            Special Thanks
          </Text>
          <Text style={[styles.paragraph, { color: themeStyle.webPage.textSecondary }]}>
            Thank you to the open-source community for making projects like
            ChefSpAIce possible. Your contributions to libraries, frameworks,
            and tools help developers build better software every day.
          </Text>
        </View>

        <Pressable style={styles.backButton} onPress={handleGoHome} accessibilityRole="link" accessibilityLabel="Back to home">
          <Feather name="arrow-left" size={20} color="#FFFFFF" />
          <Text style={styles.backButtonText}>
            {isWeb ? "Back to Home" : "Go Back"}
          </Text>
        </Pressable>
      </View>

      {isWeb && (
        <View style={[styles.footer, { backgroundColor: themeStyle.webPage.footerBg }]}>
          <Text style={[styles.copyright, { color: themeStyle.webPage.textMuted }]}>
            © {new Date().getFullYear()} ChefSpAIce. All rights reserved.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { minHeight: "100%" },
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
    gap: 10,
    ...webClickable,
  },
  logoText: { fontSize: 24, fontWeight: "700" },
  themeToggle: { padding: 10, borderRadius: 10 },
  content: {
    paddingHorizontal: 24,
    paddingVertical: 60,
    maxWidth: 800,
    alignSelf: "center",
    width: "100%",
  },
  title: {
    fontSize: 42,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 16,
  },
  subtitle: { fontSize: 18, textAlign: "center", marginBottom: 40 },
  card: { borderRadius: 16, padding: 24, borderWidth: 1, marginBottom: 16 },
  itemName: { fontSize: 20, fontWeight: "600", marginBottom: 4 },
  itemDescription: { fontSize: 15, marginBottom: 8 },
  itemUrl: { fontSize: 14 },
  sectionTitle: { fontSize: 22, fontWeight: "600", marginBottom: 12 },
  paragraph: { fontSize: 16, lineHeight: 26 },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: BRAND_GREEN,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    alignSelf: "center",
    marginTop: 20,
  },
  backButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  footer: { paddingVertical: 32, paddingHorizontal: 24, alignItems: "center" },
  copyright: { fontSize: 12 },
});
