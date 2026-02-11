import React from "react";
import { View, StyleSheet, Pressable, Linking } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { GlassCard } from "@/components/GlassCard";
import { Spacing, BorderRadius } from "@/constants/theme";

interface SettingsLegalSupportProps {
  navigation: any;
  theme: any;
}

export function SettingsLegalSupport({
  navigation,
  theme,
}: SettingsLegalSupportProps) {
  return (
    <GlassCard style={styles.section}>
      <ThemedText type="h4" style={styles.sectionTitle}>
        Legal & Support
      </ThemedText>

      <Pressable
        style={[styles.legalMenuItem, { borderColor: theme.glass.border }]}
        onPress={() => navigation.navigate("PrivacyPolicy")}
        data-testid="button-privacy-policy"
        accessibilityRole="button"
        accessibilityLabel="View privacy policy"
      >
        <View style={styles.legalMenuIcon}>
          <Feather name="shield" size={18} color={theme.text} />
        </View>
        <View style={styles.legalMenuText}>
          <ThemedText type="body">Privacy Policy</ThemedText>
          <ThemedText type="caption">How we handle your data</ThemedText>
        </View>
        <Feather
          name="chevron-right"
          size={16}
          color={theme.textSecondary}
        />
      </Pressable>

      <Pressable
        style={[styles.legalMenuItem, { borderColor: theme.glass.border }]}
        onPress={() => navigation.navigate("TermsOfService")}
        data-testid="button-terms-of-service"
        accessibilityRole="button"
        accessibilityLabel="View terms of service"
      >
        <View style={styles.legalMenuIcon}>
          <Feather name="file-text" size={18} color={theme.text} />
        </View>
        <View style={styles.legalMenuText}>
          <ThemedText type="body">Terms of Service</ThemedText>
          <ThemedText type="caption">Usage terms and conditions</ThemedText>
        </View>
        <Feather
          name="chevron-right"
          size={16}
          color={theme.textSecondary}
        />
      </Pressable>

      <Pressable
        style={[styles.legalMenuItem, { borderColor: theme.glass.border }]}
        onPress={() => Linking.openURL("https://chefspaice.com/support")}
        data-testid="button-support"
        accessibilityRole="button"
        accessibilityLabel="Open help and support"
      >
        <View style={styles.legalMenuIcon}>
          <Feather name="help-circle" size={18} color={theme.text} />
        </View>
        <View style={styles.legalMenuText}>
          <ThemedText type="body">Help & Support</ThemedText>
          <ThemedText type="caption">Get help or contact us</ThemedText>
        </View>
        <Feather
          name="external-link"
          size={16}
          color={theme.textSecondary}
        />
      </Pressable>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.lg,
  },
  sectionTitle: {
    marginBottom: Spacing.xs,
  },
  legalMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.md,
  },
  legalMenuIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  legalMenuText: {
    flex: 1,
    gap: 2,
  },
});
