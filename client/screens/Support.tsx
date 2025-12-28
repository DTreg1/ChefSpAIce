import { useState } from "react";
import { StyleSheet, View, Text, ScrollView, Pressable, Platform, TextInput } from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useWebTheme } from "@/contexts/WebThemeContext";

const BRAND_GREEN = "#27AE60";
const SUPPORT_EMAIL = "support@chefspaice.com";

function getThemeColors(isDark: boolean) {
  return {
    background: isDark ? "#0F1419" : "#F8FAFC",
    card: isDark ? "#1A1F25" : "#FFFFFF",
    cardBorder: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
    textPrimary: isDark ? "#FFFFFF" : "#1A202C",
    textSecondary: isDark ? "#A0AEC0" : "#4A5568",
    textMuted: isDark ? "rgba(255, 255, 255, 0.4)" : "rgba(0, 0, 0, 0.5)",
    footerBg: isDark ? "#0A0D10" : "#F1F5F9",
    brandGreen: BRAND_GREEN,
    inputBg: isDark ? "#262D34" : "#F1F5F9",
    inputBorder: isDark ? "rgba(255, 255, 255, 0.15)" : "rgba(0, 0, 0, 0.1)",
  };
}

interface FAQItemProps {
  question: string;
  answer: string;
  colors: ReturnType<typeof getThemeColors>;
  isOpen: boolean;
  onToggle: () => void;
}

function FAQItem({ question, answer, colors, isOpen, onToggle }: FAQItemProps) {
  return (
    <Pressable 
      onPress={onToggle}
      style={[styles.faqItem, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
    >
      <View style={styles.faqHeader}>
        <Text style={[styles.faqQuestion, { color: colors.textPrimary }]}>{question}</Text>
        <Feather name={isOpen ? "chevron-up" : "chevron-down"} size={20} color={colors.textSecondary} />
      </View>
      {isOpen && (
        <Text style={[styles.faqAnswer, { color: colors.textSecondary }]}>{answer}</Text>
      )}
    </Pressable>
  );
}

const FAQ_DATA = [
  {
    question: "How do I add items to my inventory?",
    answer: "You can add items in several ways: tap the + button to manually add items, use the barcode scanner to scan packaged foods, or take a photo of your food and let our AI identify it automatically. Each method will guide you through entering the item details including quantity, storage location, and expiration date."
  },
  {
    question: "How does the AI recipe generator work?",
    answer: "Our AI analyzes the ingredients in your inventory and generates personalized recipes that use what you already have. It considers your dietary preferences, available kitchen equipment, and can prioritize items that are expiring soon. Simply go to the Recipes tab and tap 'Generate Recipe' to get started."
  },
  {
    question: "Why am I getting expiration notifications?",
    answer: "ChefSpAIce sends you notifications when food items are approaching their expiration date, helping you use them before they go bad. You can customize when you receive these alerts (1-7 days before expiration) or disable them entirely in Settings > Notifications."
  },
  {
    question: "How do I scan barcodes?",
    answer: "From the main inventory screen, tap the + button and select 'Scan Barcode'. Point your camera at the product's barcode and hold steady. The app will automatically detect the barcode and look up the product information. Make sure you've granted camera permissions when prompted."
  },
  {
    question: "Can I use the app offline?",
    answer: "Yes! ChefSpAIce stores your inventory data locally on your device, so you can view and manage your items without an internet connection. However, features that require AI (like recipe generation and the kitchen assistant) need an internet connection to work. Your changes will sync automatically when you're back online."
  },
  {
    question: "How do I set up dietary preferences?",
    answer: "Go to Profile > Settings > Dietary Preferences. You can specify dietary restrictions (vegetarian, vegan, gluten-free, etc.), food allergies, and nutritional goals. The AI will respect these preferences when generating recipes."
  },
  {
    question: "What kitchen equipment does the app support?",
    answer: "ChefSpAIce supports over 50 common kitchen appliances and tools including air fryers, instant pots, stand mixers, food processors, and more. You can manage your equipment in Profile > Kitchen Equipment. The AI uses this information to only suggest recipes you can actually make."
  },
  {
    question: "How do I use the meal planner?",
    answer: "Navigate to the Meal Plan tab to see your weekly calendar. Tap on any meal slot (breakfast, lunch, or dinner) to add a recipe. You can add recipes from your saved collection or generate new ones on the spot. Long-press to move or remove planned meals."
  },
];

const TROUBLESHOOTING_DATA = [
  {
    title: "Barcode not scanning",
    solution: "Make sure you have good lighting and hold your phone steady. If a product isn't found, you can manually enter the item details. Some regional or store-brand products may not be in our database."
  },
  {
    title: "Camera permissions issues",
    solution: "Go to your device Settings > ChefSpAIce > Permissions and enable Camera access. On iOS, you may need to restart the app after granting permissions."
  },
  {
    title: "Data not syncing",
    solution: "Ensure you have an active internet connection. Try pulling down to refresh on the main screen. If issues persist, go to Profile > Settings > Sync and tap 'Force Sync'."
  },
  {
    title: "Recipes not generating",
    solution: "Recipe generation requires an internet connection and at least 3 items in your inventory. Check your connection and make sure you have ingredients added to your pantry."
  },
];

export default function SupportPage() {
  const { isDark, toggleTheme } = useWebTheme();
  const colors = getThemeColors(isDark);
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);

  const navigateTo = (path: string) => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.location.href = path;
    }
  };

  const openEmail = () => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.location.href = `mailto:${SUPPORT_EMAIL}?subject=ChefSpAIce Support Request`;
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Pressable onPress={() => navigateTo("/")} style={styles.logoContainer}>
          <MaterialCommunityIcons name="chef-hat" size={28} color={colors.brandGreen} />
          <Text style={[styles.logoText, { color: colors.brandGreen }]}>ChefSpAIce</Text>
        </Pressable>
        <Pressable
          onPress={toggleTheme}
          style={[styles.themeToggle, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)" }]}
          data-testid="button-theme-toggle"
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
          <Text style={[styles.pageTitle, { color: colors.textPrimary }]} data-testid="text-support-title">Support</Text>
          <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]} data-testid="text-support-subtitle">
            We're here to help you get the most out of ChefSpAIce
          </Text>

          <View style={[styles.contactCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]} data-testid="card-contact">
            <View style={styles.contactIcon}>
              <Feather name="mail" size={28} color={BRAND_GREEN} />
            </View>
            <Text style={[styles.contactTitle, { color: colors.textPrimary }]}>Contact Us</Text>
            <Text style={[styles.contactText, { color: colors.textSecondary }]}>
              Have a question or feedback? We'd love to hear from you.
            </Text>
            <Pressable 
              onPress={openEmail}
              style={styles.contactButton}
              data-testid="button-contact-email"
            >
              <Text style={styles.contactButtonText}>Email Support</Text>
            </Pressable>
            <Text style={[styles.contactEmail, { color: colors.textMuted }]}>{SUPPORT_EMAIL}</Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]} data-testid="text-faq-title">Frequently Asked Questions</Text>
            
            {FAQ_DATA.map((faq, index) => (
              <FAQItem
                key={index}
                question={faq.question}
                answer={faq.answer}
                colors={colors}
                isOpen={openFAQ === index}
                onToggle={() => setOpenFAQ(openFAQ === index ? null : index)}
              />
            ))}
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]} data-testid="text-troubleshooting-title">Troubleshooting</Text>
            
            {TROUBLESHOOTING_DATA.map((item, index) => (
              <View 
                key={index} 
                style={[styles.troubleshootCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                data-testid={`card-troubleshoot-${index}`}
              >
                <View style={styles.troubleshootHeader}>
                  <Feather name="alert-circle" size={20} color="#F59E0B" />
                  <Text style={[styles.troubleshootTitle, { color: colors.textPrimary }]}>{item.title}</Text>
                </View>
                <Text style={[styles.troubleshootSolution, { color: colors.textSecondary }]}>{item.solution}</Text>
              </View>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]} data-testid="text-features-title">Feature Guides</Text>
            
            <View style={styles.guidesGrid}>
              <View style={[styles.guideCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <Feather name="box" size={24} color={BRAND_GREEN} style={styles.guideIcon} />
                <Text style={[styles.guideTitle, { color: colors.textPrimary }]}>Getting Started with Inventory</Text>
                <Text style={[styles.guideText, { color: colors.textSecondary }]}>
                  Learn how to add, organize, and track your food items effectively.
                </Text>
              </View>
              
              <View style={[styles.guideCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <Feather name="calendar" size={24} color={BRAND_GREEN} style={styles.guideIcon} />
                <Text style={[styles.guideTitle, { color: colors.textPrimary }]}>Using the Meal Planner</Text>
                <Text style={[styles.guideText, { color: colors.textSecondary }]}>
                  Plan your weekly meals and automatically generate shopping lists.
                </Text>
              </View>
              
              <View style={[styles.guideCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <Feather name="sliders" size={24} color={BRAND_GREEN} style={styles.guideIcon} />
                <Text style={[styles.guideTitle, { color: colors.textPrimary }]}>Setting Dietary Preferences</Text>
                <Text style={[styles.guideText, { color: colors.textSecondary }]}>
                  Customize the AI to respect your dietary needs and restrictions.
                </Text>
              </View>
              
              <View style={[styles.guideCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <Feather name="bar-chart-2" size={24} color={BRAND_GREEN} style={styles.guideIcon} />
                <Text style={[styles.guideTitle, { color: colors.textPrimary }]}>Understanding Analytics</Text>
                <Text style={[styles.guideText, { color: colors.textSecondary }]}>
                  Track your food waste reduction and nutritional insights over time.
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>App Information</Text>
            <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Version</Text>
                <Text style={[styles.infoValue, { color: colors.textPrimary }]}>1.0.0</Text>
              </View>
              <View style={[styles.infoDivider, { backgroundColor: colors.cardBorder }]} />
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Platform</Text>
                <Text style={[styles.infoValue, { color: colors.textPrimary }]}>iOS & Android</Text>
              </View>
            </View>
          </View>

          <View style={styles.linksSection}>
            <Pressable onPress={() => navigateTo("/privacy")} data-testid="link-privacy">
              <Text style={[styles.linkText, { color: colors.brandGreen }]}>Privacy Policy</Text>
            </Pressable>
            <Pressable onPress={() => navigateTo("/terms")} data-testid="link-terms">
              <Text style={[styles.linkText, { color: colors.brandGreen }]}>Terms of Service</Text>
            </Pressable>
          </View>

          <View style={[styles.backLink, { borderTopColor: colors.cardBorder }]}>
            <Pressable onPress={() => navigateTo("/")} data-testid="link-back">
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
    gap: 10,
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
    marginBottom: 8,
  },
  pageSubtitle: {
    fontSize: 18,
    marginBottom: 32,
  },
  contactCard: {
    borderRadius: 16,
    padding: 32,
    marginBottom: 48,
    borderWidth: 1,
    alignItems: "center",
  },
  contactIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(39, 174, 96, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  contactTitle: {
    fontSize: 24,
    fontWeight: "600",
    marginBottom: 8,
  },
  contactText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
    maxWidth: 400,
  },
  contactButton: {
    backgroundColor: BRAND_GREEN,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 10,
    marginBottom: 12,
  },
  contactButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  contactEmail: {
    fontSize: 14,
  },
  section: {
    marginBottom: 48,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "600",
    marginBottom: 20,
  },
  faqItem: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
  },
  faqHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
    paddingRight: 16,
  },
  faqAnswer: {
    fontSize: 15,
    lineHeight: 24,
    marginTop: 16,
  },
  troubleshootCard: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
  },
  troubleshootHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  troubleshootTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  troubleshootSolution: {
    fontSize: 15,
    lineHeight: 24,
    paddingLeft: 32,
  },
  guidesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  guideCard: {
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    width: "100%",
    maxWidth: 380,
  },
  guideIcon: {
    marginBottom: 12,
  },
  guideTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  guideText: {
    fontSize: 15,
    lineHeight: 22,
  },
  infoCard: {
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 15,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: "600",
  },
  infoDivider: {
    height: 1,
    marginVertical: 8,
  },
  linksSection: {
    flexDirection: "row",
    gap: 24,
    marginBottom: 24,
  },
  linkText: {
    fontSize: 16,
  },
  backLink: {
    borderTopWidth: 1,
    paddingTop: 24,
    marginTop: 24,
  },
  link: {
    fontSize: 16,
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
