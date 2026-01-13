import { StyleSheet, View, Text, ScrollView, Pressable, Platform } from "react-native";
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

export default function AboutScreen() {
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

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.contentContainer}>
      <LinearGradient colors={[colors.background, colors.backgroundGradient]} style={StyleSheet.absoluteFillObject} />
      
      {isWeb && (
        <View style={styles.header}>
          <Pressable style={styles.logoContainer} onPress={handleGoHome}>
            <MaterialCommunityIcons name="chef-hat" size={32} color={BRAND_GREEN} />
            <Text style={[styles.logoText, { color: colors.textPrimary }]}>ChefSpAIce</Text>
          </Pressable>
          <Pressable
            onPress={toggleTheme}
            style={[styles.themeToggle, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)" }]}
          >
            {isDark ? <Feather name="sun" size={20} color={colors.textPrimary} /> : <Feather name="moon" size={20} color={colors.textPrimary} />}
          </Pressable>
        </View>
      )}

      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>About ChefSpAIce</Text>
        
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Our Mission</Text>
          <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
            ChefSpAIce was born from a simple observation: too much food goes to waste because we forget what's in our kitchens. 
            Our mission is to help every household reduce food waste, save money, and eat better through smart technology.
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>What We Do</Text>
          <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
            We combine barcode scanning, expiration tracking, and AI-powered recipe generation to help you make the most of every ingredient. 
            Our app learns your preferences and suggests recipes that use what you already have before it expires.
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Environmental Impact</Text>
          <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
            Food waste is one of the largest contributors to greenhouse gas emissions. By helping users reduce their food waste, 
            ChefSpAIce contributes to a more sustainable future. Every item saved from the trash is a small victory for our planet.
          </Text>
        </View>

        <Pressable style={styles.backButton} onPress={handleGoHome}>
          <Feather name="arrow-left" size={20} color="#FFFFFF" />
          <Text style={styles.backButtonText}>{isWeb ? "Back to Home" : "Go Back"}</Text>
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
  logoContainer: { flexDirection: "row", alignItems: "center", gap: 10, cursor: "pointer" as any },
  logoText: { fontSize: 24, fontWeight: "700" },
  themeToggle: { padding: 10, borderRadius: 10 },
  content: { paddingHorizontal: 24, paddingVertical: 60, maxWidth: 800, alignSelf: "center", width: "100%" },
  title: { fontSize: 42, fontWeight: "700", textAlign: "center", marginBottom: 40 },
  card: { borderRadius: 16, padding: 24, borderWidth: 1, marginBottom: 24 },
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
