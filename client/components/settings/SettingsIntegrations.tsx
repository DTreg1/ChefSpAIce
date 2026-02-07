import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { GlassCard } from "@/components/GlassCard";
import { Spacing, BorderRadius } from "@/constants/theme";

interface SettingsIntegrationsProps {
  navigation: any;
  theme: any;
}

export function SettingsIntegrations({
  navigation,
  theme,
}: SettingsIntegrationsProps) {
  return (
    <GlassCard style={styles.section}>
      <ThemedText type="h4" style={styles.sectionTitle}>
        Integrations
      </ThemedText>

      <Pressable
        style={[styles.legalMenuItem, { borderColor: theme.glass.border }]}
        onPress={() => navigation.navigate("SiriShortcutsGuide")}
        data-testid="button-siri-shortcuts"
      >
        <View style={styles.legalMenuIcon}>
          <Feather name="mic" size={18} color={theme.text} />
        </View>
        <View style={styles.legalMenuText}>
          <ThemedText type="body">Siri Shortcuts</ThemedText>
          <ThemedText type="caption">
            Set up voice commands for your kitchen
          </ThemedText>
        </View>
        <Feather
          name="chevron-right"
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
