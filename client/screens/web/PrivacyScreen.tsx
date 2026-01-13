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

export default function PrivacyScreen() {
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
        <Text style={[styles.title, { color: colors.textPrimary }]}>Privacy Policy</Text>
        <Text style={[styles.lastUpdated, { color: colors.textMuted }]}>Last updated: December 2024</Text>
        
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Information We Collect</Text>
          <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
            ChefSpAIce collects only the information necessary to provide our services. This includes your inventory data, 
            recipe preferences, and basic usage analytics. We do not sell your personal information to third parties.
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Data Storage</Text>
          <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
            Your inventory and recipe data is stored locally on your device by default. If you create an account, 
            your data may be synced to our secure servers to enable cross-device access and backup functionality.
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Third-Party Services</Text>
          <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
            We use OpenAI to power our AI recipe generation feature. When you request a recipe, relevant inventory 
            information is sent to OpenAI's API. We also use Stripe for payment processing if you choose to donate.
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Your Rights</Text>
          <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
            You have the right to access, correct, or delete your personal data at any time. You can export your data 
            from the app settings or contact us to request complete deletion of your account and associated data.
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
  title: { fontSize: 42, fontWeight: "700", textAlign: "center", marginBottom: 8 },
  lastUpdated: { fontSize: 14, textAlign: "center", marginBottom: 40 },
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
