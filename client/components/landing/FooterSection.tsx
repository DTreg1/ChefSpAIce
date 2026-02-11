import { StyleSheet, View, Text, Pressable, Image } from "react-native";
import { webAccessibilityProps } from "@/lib/web-accessibility";
import QRCode from "react-native-qrcode-svg";

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
  return (
    <View style={styles.footer} data-testid="footer">
      <View style={styles.footerContent}>
        <View style={styles.footerLogo}>
          <Image source={logoImage} style={{ width: 28, height: 28 }} accessibilityElementsHidden={true} importantForAccessibility="no-hide-descendants" />
          <Text style={styles.footerLogoText}>ChefSpAIce</Text>
        </View>
        <Text style={styles.footerText}>
          Your AI-powered kitchen companion
        </Text>

        <View style={styles.qrCodeSection} data-testid="qr-code-section">
          <View style={styles.qrCodeContainer}>
            <QRCode
              value="https://chefspaice.com"
              size={280}
              color="#FFFFFF"
              backgroundColor="transparent"
            />
          </View>
          <Text style={styles.qrCodeLabel} data-testid="text-qr-label">
            Scan to share with a friend
          </Text>
        </View>

        <View
          style={[styles.footerLinks, isWide ? {} : styles.footerLinksWrap]}
        >
          <Pressable onPress={() => onAbout?.()} {...webAccessibilityProps(() => onAbout?.())} data-testid="link-about" accessibilityRole="button" accessibilityLabel="About ChefSpAIce">
            <Text style={styles.footerLink}>About</Text>
          </Pressable>
          <Text style={styles.footerDivider}>|</Text>
          <Pressable onPress={() => onPrivacy?.()} {...webAccessibilityProps(() => onPrivacy?.())} data-testid="link-privacy" accessibilityRole="button" accessibilityLabel="View privacy policy">
            <Text style={styles.footerLink}>Privacy</Text>
          </Pressable>
          <Text style={styles.footerDivider}>|</Text>
          <Pressable onPress={() => onTerms?.()} {...webAccessibilityProps(() => onTerms?.())} data-testid="link-terms" accessibilityRole="button" accessibilityLabel="View terms of service">
            <Text style={styles.footerLink}>Terms</Text>
          </Pressable>
          <Text style={styles.footerDivider}>|</Text>
          <Pressable onPress={() => onSupport?.()} {...webAccessibilityProps(() => onSupport?.())} data-testid="link-support" accessibilityRole="button" accessibilityLabel="Contact support">
            <Text style={styles.footerLink}>Support</Text>
          </Pressable>
        </View>
        <Text style={styles.copyright}>
          &copy; {new Date().getFullYear()} ChefSpAIce. All rights reserved.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    backgroundColor: "rgba(0, 0, 0, 0.3)",
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
    color: "rgba(255, 255, 255, 0.5)",
  },
  footerText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
    marginBottom: 24,
  },
  qrCodeSection: {
    alignItems: "center",
    marginBottom: 24,
    padding: 16,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  qrCodeContainer: {
    padding: 8,
    backgroundColor: "rgba(39, 174, 96, 0.15)",
    borderRadius: 12,
    marginBottom: 12,
  },
  qrCodeLabel: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.7)",
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
    color: "rgba(255, 255, 255, 0.6)",
  },
  footerDivider: {
    color: "rgba(255, 255, 255, 0.2)",
  },
  copyright: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.4)",
  },
});
