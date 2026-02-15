import { StyleSheet, View, Text, Pressable, Image } from "react-native";
import { webAccessibilityProps } from "@/lib/web-accessibility";
import QRCode from "react-native-qrcode-svg";
import { getLandingColors } from "./landing-colors";
import { useTheme } from "@/hooks/useTheme";

const logoImage = require("../../assets/images/transparent/chef-hat-light-256.png");

interface FooterSectionProps {
  isWide: boolean;
  onAbout?: () => void;
  onPrivacy?: () => void;
  onTerms?: () => void;
  onSupport?: () => void;
}

export function FooterSection({
  isWide,
  onAbout,
  onPrivacy,
  onTerms,
  onSupport,
}: FooterSectionProps) {
  const { isDark } = useTheme();
  const lc = getLandingColors(isDark);

  return (
    <View style={[styles.footer, { backgroundColor: lc.footerBg }]} data-testid="footer" role="contentinfo">
      <View style={styles.footerContent}>
        <View style={styles.footerLogo}>
          <Image source={logoImage} style={{ width: 28, height: 28 }} accessibilityElementsHidden={true} importantForAccessibility="no-hide-descendants" />
          <Text style={[styles.footerLogoText, { color: lc.textPrimary }]}>ChefSpAIce</Text>
        </View>
        <Text style={[styles.footerText, { color: lc.textSecondary }]}>
          Your AI-powered kitchen companion
        </Text>

        <View style={[styles.qrCodeSection, { backgroundColor: lc.surfaceSubtle, borderColor: lc.borderSubtle }]} data-testid="qr-code-section">
          <View style={styles.qrCodeContainer}>
            <QRCode
              value="https://chefspaice.com"
              size={280}
              color="#FFFFFF"
              backgroundColor="transparent"
            />
          </View>
          <Text style={[styles.qrCodeLabel, { color: lc.textMuted }]} data-testid="text-qr-label">
            Scan to share with a friend
          </Text>
        </View>

        <View
          style={[styles.footerLinks, isWide ? {} : styles.footerLinksWrap]}
          role="navigation"
          accessibilityLabel="Footer navigation"
        >
          <Pressable onPress={() => onAbout?.()} {...webAccessibilityProps(() => onAbout?.())} data-testid="link-about" accessibilityRole="button" accessibilityLabel="About ChefSpAIce">
            <Text style={[styles.footerLink, { color: lc.textSecondary }]}>About</Text>
          </Pressable>
          <Text style={[styles.footerDivider, { color: lc.footerDivider }]}>|</Text>
          <Pressable onPress={() => onPrivacy?.()} {...webAccessibilityProps(() => onPrivacy?.())} data-testid="link-privacy" accessibilityRole="button" accessibilityLabel="View privacy policy">
            <Text style={[styles.footerLink, { color: lc.textSecondary }]}>Privacy</Text>
          </Pressable>
          <Text style={[styles.footerDivider, { color: lc.footerDivider }]}>|</Text>
          <Pressable onPress={() => onTerms?.()} {...webAccessibilityProps(() => onTerms?.())} data-testid="link-terms" accessibilityRole="button" accessibilityLabel="View terms of service">
            <Text style={[styles.footerLink, { color: lc.textSecondary }]}>Terms</Text>
          </Pressable>
          <Text style={[styles.footerDivider, { color: lc.footerDivider }]}>|</Text>
          <Pressable onPress={() => onSupport?.()} {...webAccessibilityProps(() => onSupport?.())} data-testid="link-support" accessibilityRole="button" accessibilityLabel="Contact support">
            <Text style={[styles.footerLink, { color: lc.textSecondary }]}>Support</Text>
          </Pressable>
        </View>
        <Text style={[styles.copyright, { color: lc.textMuted }]}>
          &copy; {new Date().getFullYear()} ChefSpAIce. All rights reserved.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    paddingVertical: 24,
    paddingHorizontal: 24,
  },
  footerContent: {
    alignItems: "center",
  },
  footerLogo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  footerLogoText: {
    fontSize: 20,
    fontWeight: "600",
  },
  footerText: {
    fontSize: 14,
    marginBottom: 24,
  },
  qrCodeSection: {
    alignItems: "center",
    marginBottom: 24,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  qrCodeContainer: {
    padding: 8,
    backgroundColor: "rgba(39, 174, 96, 0.15)",
    borderRadius: 12,
    marginBottom: 12,
  },
  qrCodeLabel: {
    fontSize: 13,
    textAlign: "center",
  },
  footerLinks: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 24,
  },
  footerLinksWrap: {
    flexWrap: "wrap",
    justifyContent: "center",
  },
  footerLink: {
    fontSize: 14,
  },
  footerDivider: {},
  copyright: {
    fontSize: 12,
  },
});
