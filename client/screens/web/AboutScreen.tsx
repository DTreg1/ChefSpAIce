import {
  View,
  Text,
  ScrollView,
  Pressable,
  Platform,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { GradientBackground } from "@/components/GradientBackground.web";
import { useTheme } from "@/hooks/useTheme";
import { useNavigate } from "@/lib/web-router";
import { Spacing } from "@/constants/theme";
import { webSharedStyles, WebTypography, NAV_LINKS } from "./sharedStyles";

const isWeb = Platform.OS === "web";

export default function AboutScreen() {
  const { style } = useTheme();
  const colors = style.webInfo;
  const currentPath = "/about";
  const navigate = useNavigate();

  return (
    <ScrollView
      style={webSharedStyles.container}
      contentContainerStyle={webSharedStyles.contentContainer}
    >
      <GradientBackground />

      {isWeb && (
        <View style={webSharedStyles.header} role="banner" accessibilityLabel="Site header">
          <Pressable
            style={webSharedStyles.logoContainer}
            onPress={() => navigate("/")}
            accessibilityRole="link"
            accessibilityLabel="Go to home page"
          >
            <MaterialCommunityIcons
              name="chef-hat"
              size={32}
              color={colors.iconLight}
            />
            <Text style={[WebTypography.logoText, { color: colors.textPrimary }]}>
              ChefSpAIce
            </Text>
          </Pressable>
          <View style={webSharedStyles.navLinks} role="navigation" accessibilityLabel="Site navigation">
            {NAV_LINKS.map((link) => (
              <Pressable
                key={link.path}
                onPress={() => navigate(link.path)}
                style={webSharedStyles.navLink}
                data-testid={`nav-link-${link.label.toLowerCase()}`}
                accessibilityRole="link"
                accessibilityLabel={`Navigate to ${link.label}`}
              >
                <Text
                  style={[
                    WebTypography.navLinkText,
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

      <View style={webSharedStyles.content}>
        <Text style={[WebTypography.pageTitle, { color: colors.textPrimary, marginBottom: Spacing["3xl"] }]}>
          About ChefSpAIce
        </Text>

        <View
          style={[
            webSharedStyles.card,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <Text style={[WebTypography.sectionTitle, { color: colors.textPrimary }]}>
            The Mission
          </Text>
          <Text style={[WebTypography.paragraph, { color: colors.textSecondary }]}>
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
            webSharedStyles.card,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <Text style={[WebTypography.sectionTitle, { color: colors.textPrimary }]}>
            What ChefSpAIce Does
          </Text>
          <Text style={[WebTypography.paragraph, { color: colors.textSecondary }]}>
            ChefSpAIce combines barcode scanning, expiration tracking, and
            AI-powered recipe generation to help you make the most of every
            ingredient. The app learns your preferences and suggests recipes
            that use what you already have before it expires — keeping things
            fresh and creative in the kitchen.
          </Text>
        </View>

        <View
          style={[
            webSharedStyles.card,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <Text style={[WebTypography.sectionTitle, { color: colors.textPrimary }]}>
            About the Founder
          </Text>
          <Text style={[WebTypography.paragraph, { color: colors.textSecondary }]}>
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
              WebTypography.paragraph,
              { color: colors.textSecondary, marginTop: Spacing.lg },
            ]}
          >
            From there, I moved to Houston, TX to support a Microchip Processing
            plant being built in Ohio. When the company chose not to follow my
            recommendations, I made the difficult decision to resign and take a
            leap of faith — starting my own single-person company.
          </Text>
          <Text
            style={[
              WebTypography.paragraph,
              { color: colors.textSecondary, marginTop: Spacing.lg },
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
            webSharedStyles.card,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <Text style={[WebTypography.sectionTitle, { color: colors.textPrimary }]}>
            The Vision
          </Text>
          <Text style={[WebTypography.paragraph, { color: colors.textSecondary }]}>
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
            webSharedStyles.card,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <Text style={[WebTypography.sectionTitle, { color: colors.textPrimary }]}>
            Environmental Impact
          </Text>
          <Text style={[WebTypography.paragraph, { color: colors.textSecondary }]}>
            Food waste is one of the largest contributors to greenhouse gas
            emissions. By helping reduce food waste, ChefSpAIce contributes to a
            more sustainable future. Every item saved from the trash is a small
            victory for our planet.
          </Text>
        </View>
      </View>

      {isWeb && (
        <View style={[webSharedStyles.footer, { backgroundColor: colors.footerBg }]} role="contentinfo">
          <Text style={[WebTypography.copyright, { color: colors.textMuted }]}>
            © {new Date().getFullYear()} ChefSpAIce. All rights reserved.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}
