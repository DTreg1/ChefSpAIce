import React from "react";
import { View, StyleSheet } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { GlassCard } from "@/components/GlassCard";
import { Spacing } from "@/constants/theme";

export function SettingsAbout() {
  return (
    <GlassCard style={styles.section}>
      <ThemedText type="h4" style={styles.sectionTitle}>
        About
      </ThemedText>

      <View style={styles.aboutItem}>
        <ThemedText type="body">Version</ThemedText>
        <ThemedText type="caption">1.0.0</ThemedText>
      </View>

      <View style={styles.aboutItem}>
        <ThemedText type="body">ChefSpAIce</ThemedText>
        <ThemedText type="caption">Your smart kitchen companion</ThemedText>
      </View>
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
  aboutItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
});
