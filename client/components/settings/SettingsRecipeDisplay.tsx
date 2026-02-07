import React from "react";
import { View, StyleSheet, Switch } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { GlassCard } from "@/components/GlassCard";
import { UserPreferences } from "@/lib/storage";
import { Spacing, AppColors } from "@/constants/theme";

interface SettingsRecipeDisplayProps {
  preferences: UserPreferences;
  onToggleTermHighlighting: (value: boolean) => void;
  theme: any;
}

export function SettingsRecipeDisplay({
  preferences,
  onToggleTermHighlighting,
  theme,
}: SettingsRecipeDisplayProps) {
  return (
    <GlassCard style={styles.section}>
      <ThemedText type="h4" style={styles.sectionTitle}>
        Recipe Display
      </ThemedText>

      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Feather name="book" size={20} color={theme.text} />
          <View style={styles.settingText}>
            <ThemedText type="body">Cooking Term Highlights</ThemedText>
            <ThemedText type="caption">
              Highlight cooking terms in recipes for quick definitions
            </ThemedText>
          </View>
        </View>
        <Switch
          value={preferences.termHighlightingEnabled ?? true}
          onValueChange={onToggleTermHighlighting}
          trackColor={{
            false: theme.backgroundSecondary,
            true: AppColors.primary,
          }}
          thumbColor="#FFFFFF"
        />
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
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  settingInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: Spacing.md,
  },
  settingText: {
    flex: 1,
  },
});
