import React from "react";
import { View, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { GlassCard } from "@/components/GlassCard";
import { GlassButton } from "@/components/GlassButton";
import { Spacing, AppColors } from "@/constants/theme";
import type { ThemeColors } from "@/lib/types";

interface SettingsStoragePrefsProps {
  learnedPrefsCount: number;
  onResetStoragePreferences: () => void;
  theme: ThemeColors;
}

export function SettingsStoragePrefs({
  learnedPrefsCount,
  onResetStoragePreferences,
  theme,
}: SettingsStoragePrefsProps) {
  return (
    <GlassCard style={styles.section}>
      <ThemedText type="h4" style={styles.sectionTitle}>
        Storage Preferences
      </ThemedText>

      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Feather name="database" size={20} color={theme.text} />
          <View style={styles.settingText}>
            <ThemedText type="body">Learned Preferences</ThemedText>
            <ThemedText type="caption">
              {learnedPrefsCount > 0
                ? `${learnedPrefsCount} categories with custom storage locations`
                : "No custom preferences yet"}
            </ThemedText>
          </View>
        </View>
      </View>

      <ThemedText type="caption" style={styles.dataInfo}>
        The app learns your preferred storage locations based on your
        choices. After selecting a different location 3 or more times for a
        category, it becomes your new default.
      </ThemedText>

      {learnedPrefsCount > 0 ? (
        <GlassButton
          variant="outline"
          onPress={onResetStoragePreferences}
          style={styles.resetButton}
          icon={
            <Feather
              name="refresh-cw"
              size={18}
              color={AppColors.warning}
            />
          }
        >
          <ThemedText style={{ color: AppColors.warning }}>
            Reset Storage Preferences
          </ThemedText>
        </GlassButton>
      ) : null}
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
  dataInfo: {
    marginBottom: Spacing.sm,
  },
  resetButton: {
    borderColor: AppColors.warning,
  },
});
