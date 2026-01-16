import { StyleSheet, View, Text, ScrollView, Pressable, Platform } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AnimatedBackground } from "@/components/AnimatedBackground";

const BRAND_GREEN = "#27AE60";
const isWeb = Platform.OS === "web";

function getThemeColors() {
  return {
    card: "rgba(255, 255, 255, 0.08)",
    cardBorder: "rgba(255, 255, 255, 0.15)",
    textPrimary: "#FFFFFF",
    textSecondary: "rgba(255, 255, 255, 0.8)",
    textMuted: "rgba(255, 255, 255, 0.5)",
    footerBg: "rgba(0, 0, 0, 0.3)",
  };
}

const NAV_LINKS = [
  { label: "Home", path: "/" },
  { label: "About", path: "/about" },
  { label: "Privacy", path: "/privacy" },
  { label: "Terms", path: "/terms" },
  { label: "Support", path: "/support" },
];

export default function PrivacyScreen() {
  const colors = getThemeColors();
  const currentPath = "/privacy";

  const navigateTo = (path: string) => {
    if (isWeb && typeof window !== "undefined") {
      window.location.href = path;
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <AnimatedBackground />
      
      {isWeb && (
        <View style={styles.header}>
          <Pressable style={styles.logoContainer} onPress={() => navigateTo("/")}>
            <MaterialCommunityIcons name="chef-hat" size={32} color={BRAND_GREEN} />
            <Text style={[styles.logoText, { color: colors.textPrimary }]}>ChefSpAIce</Text>
          </Pressable>
          <View style={styles.navLinks}>
            {NAV_LINKS.map((link) => (
              <Pressable
                key={link.path}
                onPress={() => navigateTo(link.path)}
                style={styles.navLink}
                data-testid={`nav-link-${link.label.toLowerCase()}`}
              >
                <Text style={[
                  styles.navLinkText,
                  { color: currentPath === link.path ? BRAND_GREEN : colors.textSecondary }
                ]}>
                  {link.label}
                </Text>
              </Pressable>
            ))}
          </View>
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
  navLinks: { flexDirection: "row", alignItems: "center", gap: 24 },
  navLink: { cursor: "pointer" as any },
  navLinkText: { fontSize: 14, fontWeight: "500" },
  content: { paddingHorizontal: 24, paddingVertical: 60, maxWidth: 800, alignSelf: "center", width: "100%" },
  title: { fontSize: 42, fontWeight: "700", textAlign: "center", marginBottom: 8 },
  lastUpdated: { fontSize: 14, textAlign: "center", marginBottom: 40 },
  card: { borderRadius: 16, padding: 24, borderWidth: 1, marginBottom: 24 },
  sectionTitle: { fontSize: 22, fontWeight: "600", marginBottom: 12 },
  paragraph: { fontSize: 16, lineHeight: 26 },
  footer: { paddingVertical: 32, paddingHorizontal: 24, alignItems: "center" },
  copyright: { fontSize: 12 },
});
