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

export default function AboutScreen() {
  const colors = getThemeColors();
  const currentPath = "/about";

  const navigateTo = (path: string) => {
    if (isWeb && typeof window !== "undefined") {
      window.history.pushState({}, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
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
    paddingTop: 20,
    paddingBottom: 12,
    alignItems: "center",
  },
  logoContainer: { flexDirection: "row", alignItems: "center", gap: 10, cursor: "pointer" as any, marginBottom: 16 },
  logoText: { fontSize: 24, fontWeight: "700" },
  navLinks: { flexDirection: "row", alignItems: "center", gap: 24, flexWrap: "wrap", justifyContent: "center" },
  navLink: { cursor: "pointer" as any },
  navLinkText: { fontSize: 14, fontWeight: "500" },
  content: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 60, maxWidth: 800, alignSelf: "center", width: "100%" },
  title: { fontSize: 42, fontWeight: "700", textAlign: "center", marginBottom: 40 },
  card: { borderRadius: 16, padding: 24, borderWidth: 1, marginBottom: 24 },
  sectionTitle: { fontSize: 22, fontWeight: "600", marginBottom: 12 },
  paragraph: { fontSize: 16, lineHeight: 26 },
  footer: { paddingVertical: 32, paddingHorizontal: 24, alignItems: "center" },
  copyright: { fontSize: 12 },
});
