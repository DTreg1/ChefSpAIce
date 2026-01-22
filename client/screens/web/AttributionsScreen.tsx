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

const BRAND_GREEN = "#27AE60";
const isWeb = Platform.OS === "web";

function getThemeColors(isDark: boolean) {
  return {
    background: isDark ? "#0F1419" : "#F8FAFC",
    backgroundGradient: isDark ? "#0A0F14" : "#EDF2F7",
    card: isDark ? "#1A1F25" : "#FFFFFF",
    cardBorder: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.08)",
    textPrimary: isDark ? "#FFFFFF" : "#1A202C",
    textSecondary: isDark ? "#A0AEC0" : "#4A5568",
    textMuted: isDark ? "rgba(255, 255, 255, 0.4)" : "rgba(0, 0, 0, 0.5)",
    footerBg: isDark ? "#0A0D10" : "#F1F5F9",
  };
}

function useNavigationSafe() {
  try {
    return useNavigation();
  } catch {
    return null;
  }
}

export default function AttributionsScreen() {
  const { isDark, setThemePreference } = useTheme();
  const toggleTheme = () => setThemePreference(isDark ? "light" : "dark");
  const colors = getThemeColors(isDark);
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
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      <LinearGradient
        colors={[colors.background, colors.backgroundGradient]}
        style={StyleSheet.absoluteFillObject}
      />

      {isWeb && (
        <View style={styles.header}>
          <Pressable style={styles.logoContainer} onPress={handleGoHome}>
            <MaterialCommunityIcons
              name="chef-hat"
              size={32}
              color={BRAND_GREEN}
            />
            <Text style={[styles.logoText, { color: colors.textPrimary }]}>
              ChefSpAIce
            </Text>
          </Pressable>
          <Pressable
            onPress={toggleTheme}
            style={[
              styles.themeToggle,
              {
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.1)"
                  : "rgba(0,0,0,0.05)",
              },
            ]}
          >
            {isDark ? (
              <Feather name="sun" size={20} color={colors.textPrimary} />
            ) : (
              <Feather name="moon" size={20} color={colors.textPrimary} />
            )}
          </Pressable>
        </View>
      )}

      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Attributions
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          ChefSpAIce is built with the help of these amazing open-source
          projects and services.
        </Text>

        {attributions.map((item, index) => (
          <View
            key={index}
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <Text style={[styles.itemName, { color: colors.textPrimary }]}>
              {item.name}
            </Text>
            <Text
              style={[styles.itemDescription, { color: colors.textSecondary }]}
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
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Special Thanks
          </Text>
          <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
            Thank you to the open-source community for making projects like
            ChefSpAIce possible. Your contributions to libraries, frameworks,
            and tools help developers build better software every day.
          </Text>
        </View>

        <Pressable style={styles.backButton} onPress={handleGoHome}>
          <Feather name="arrow-left" size={20} color="#FFFFFF" />
          <Text style={styles.backButtonText}>
            {isWeb ? "Back to Home" : "Go Back"}
          </Text>
        </Pressable>
      </View>

      {isWeb && (
        <View style={[styles.footer, { backgroundColor: colors.footerBg }]}>
          <Text style={[styles.copyright, { color: colors.textMuted }]}>
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
    cursor: "pointer" as any,
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
