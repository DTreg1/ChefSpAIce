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
import { Spacing, BorderRadius } from "@/constants/theme";
import { webSharedStyles, WebTypography } from "./sharedStyles";

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
      style={[webSharedStyles.container, { backgroundColor: themeStyle.webPage.background }]}
      contentContainerStyle={webSharedStyles.contentContainer}
    >
      <LinearGradient
        colors={[themeStyle.webPage.background, themeStyle.webPage.backgroundGradient]}
        style={StyleSheet.absoluteFillObject}
      />

      {isWeb && (
        <View style={webSharedStyles.headerRow}>
          <Pressable style={webSharedStyles.logoContainerNoMargin} onPress={handleGoHome} accessibilityRole="link" accessibilityLabel="Go to home page">
            <MaterialCommunityIcons
              name="chef-hat"
              size={32}
              color={themeStyle.webInfo.brandGreen}
            />
            <Text style={[WebTypography.logoText, { color: themeStyle.webPage.textPrimary }]}>
              ChefSpAIce
            </Text>
          </Pressable>
          <Pressable
            onPress={toggleTheme}
            style={[
              webSharedStyles.themeToggle,
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
        <Text style={[WebTypography.pageTitle, { color: themeStyle.webPage.textPrimary, marginBottom: Spacing.lg }]}>
          Attributions
        </Text>
        <Text style={[WebTypography.subtitle, { color: themeStyle.webPage.textSecondary }]}>
          ChefSpAIce is built with the help of these amazing open-source
          projects and services.
        </Text>

        {attributions.map((item, index) => (
          <View
            key={index}
            style={[
              styles.attributionCard,
              { backgroundColor: themeStyle.webPage.card, borderColor: themeStyle.webPage.cardBorder },
            ]}
          >
            <Text style={[WebTypography.itemName, { color: themeStyle.webPage.textPrimary }]}>
              {item.name}
            </Text>
            <Text
              style={[WebTypography.itemDescription, { color: themeStyle.webPage.textSecondary }]}
            >
              {item.description}
            </Text>
            <Text style={[WebTypography.itemUrl, { color: themeStyle.webInfo.brandGreen }]}>
              {item.url}
            </Text>
          </View>
        ))}

        <View
          style={[
            styles.attributionCard,
            { backgroundColor: themeStyle.webPage.card, borderColor: themeStyle.webPage.cardBorder },
          ]}
        >
          <Text style={[WebTypography.sectionTitle, { color: themeStyle.webPage.textPrimary }]}>
            Special Thanks
          </Text>
          <Text style={[WebTypography.paragraph, { color: themeStyle.webPage.textSecondary }]}>
            Thank you to the open-source community for making projects like
            ChefSpAIce possible. Your contributions to libraries, frameworks,
            and tools help developers build better software every day.
          </Text>
        </View>

        <Pressable style={[styles.backButton, { backgroundColor: themeStyle.webInfo.brandGreen }]} onPress={handleGoHome} accessibilityRole="link" accessibilityLabel="Back to home">
          <Feather name="arrow-left" size={20} color="#FFFFFF" />
          <Text style={WebTypography.backButtonText}>
            {isWeb ? "Back to Home" : "Go Back"}
          </Text>
        </Pressable>
      </View>

      {isWeb && (
        <View style={[webSharedStyles.footer, { backgroundColor: themeStyle.webPage.footerBg }]}>
          <Text style={[WebTypography.copyright, { color: themeStyle.webPage.textMuted }]}>
            © {new Date().getFullYear()} ChefSpAIce. All rights reserved.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: 60,
    maxWidth: 800,
    alignSelf: "center",
    width: "100%",
  },
  attributionCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: BorderRadius.md,
    alignSelf: "center",
    marginTop: Spacing.xl,
  },
});
