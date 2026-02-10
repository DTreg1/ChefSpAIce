import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  Platform,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { WebInfoColors } from "@/constants/theme";
import { useNavigate } from "@/lib/web-router";
import { usePageMeta } from "@/lib/web-meta";

const isWeb = Platform.OS === "web";

const NAV_LINKS = [
  { label: "Home", path: "/" },
  { label: "About", path: "/about" },
  { label: "Privacy", path: "/privacy" },
  { label: "Terms", path: "/terms" },
  { label: "Support", path: "/support" },
];

export default function AboutScreen() {
  const colors = WebInfoColors;
  const currentPath = "/about";
  const navigate = useNavigate();

  usePageMeta({
    title: "About - ChefSpAIce",
    description: "Learn about ChefSpAIce, the AI-powered kitchen assistant that helps you manage inventory, generate recipes, and plan meals.",
    ogType: "website",
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <AnimatedBackground />

      {isWeb && (
        <View style={styles.header}>
          <Pressable
            style={styles.logoContainer}
            onPress={() => navigate("/")}
          >
            <MaterialCommunityIcons
              name="chef-hat"
              size={32}
              color={colors.iconLight}
            />
            <Text style={[styles.logoText, { color: colors.textPrimary }]}>
              ChefSpAIce
            </Text>
          </Pressable>
          <View style={styles.navLinks}>
            {NAV_LINKS.map((link) => (
              <Pressable
                key={link.path}
                onPress={() => navigate(link.path)}
                style={styles.navLink}
                data-testid={`nav-link-${link.label.toLowerCase()}`}
              >
                <Text
                  style={[
                    styles.navLinkText,
                    {
                      color:
                        currentPath === link.path
                          ? colors.brandGreen
                          : colors.textSecondary,
                    },
                  ]}
                >
                  {link.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          About ChefSpAIce
        </Text>

        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            The Mission
          </Text>
          <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
            ChefSpAIce was born from a personal frustration: I was wasting food
            because it would expire before I could use it. I wanted to stop
            throwing away good ingredients and instead find creative ways to
            turn them into delicious meals. My mission is simple — help you and
            others like me reduce food waste, save money, and keep cooking fun
            and exciting.
          </Text>
        </View>

        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            What ChefSpAIce Does
          </Text>
          <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
            ChefSpAIce combines barcode scanning, expiration tracking, and
            AI-powered recipe generation to help you make the most of every
            ingredient. The app learns your preferences and suggests recipes
            that use what you already have before it expires — keeping things
            fresh and creative in the kitchen.
          </Text>
        </View>

        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            About the Founder
          </Text>
          <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
            I studied Architectural Technology and Construction Management,
            driven by a passion for creating buildings. That love for
            construction evolved into a passion for building something else —
            clean, high-quality databases. This led me to a career in
            Construction Automation, where I had the privilege of leading the
            most successful digitally integrated mega project outside
            Pittsburgh, PA.
          </Text>
          <Text
            style={[
              styles.paragraph,
              { color: colors.textSecondary, marginTop: 16 },
            ]}
          >
            From there, I moved to Houston, TX to support a Microchip Processing
            plant being built in Ohio. When the company chose not to follow my
            recommendations, I made the difficult decision to resign and take a
            leap of faith — starting my own single-person company.
          </Text>
          <Text
            style={[
              styles.paragraph,
              { color: colors.textSecondary, marginTop: 16 },
            ]}
          >
            I like to set lofty goals, like building an entire app from nothing.
            With AI Agents as my development partners to teach and train
            alongside me as I build, the only thing left was a project worth
            pursuing. That's when I noticed how much food I was wasting — and
            ChefSpAIce was born.
          </Text>
        </View>

        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            The Vision
          </Text>
          <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
            I want to share this project with others who face the same problem.
            My goal is to work together with users to make ChefSpAIce the kind
            of app that helps you delete other apps — because this one has all
            the features you need in one place. No more juggling grocery lists,
            recipe apps, meal planners, and expiration trackers. Just one app
            that does it all.
          </Text>
        </View>

        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Environmental Impact
          </Text>
          <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
            Food waste is one of the largest contributors to greenhouse gas
            emissions. By helping reduce food waste, ChefSpAIce contributes to a
            more sustainable future. Every item saved from the trash is a small
            victory for our planet.
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
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    cursor: "pointer" as any,
    marginBottom: 16,
  },
  logoText: { fontSize: 24, fontWeight: "700" },
  navLinks: {
    flexDirection: "row",
    alignItems: "center",
    gap: 24,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  navLink: { cursor: "pointer" as any },
  navLinkText: { fontSize: 14, fontWeight: "500" },
  content: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 60,
    maxWidth: 800,
    alignSelf: "center",
    width: "100%",
  },
  title: {
    fontSize: 42,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 40,
  },
  card: { borderRadius: 16, padding: 24, borderWidth: 1, marginBottom: 24 },
  sectionTitle: { fontSize: 22, fontWeight: "600", marginBottom: 12 },
  paragraph: { fontSize: 16, lineHeight: 26 },
  footer: { paddingVertical: 32, paddingHorizontal: 24, alignItems: "center" },
  copyright: { fontSize: 12 },
});
