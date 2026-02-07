import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { GlassCard } from "@/components/GlassCard";
import { UserPreferences } from "@/lib/storage";
import { MEAL_PLAN_PRESETS, DEFAULT_PRESET_ID } from "@/constants/meal-plan";
import { Spacing, AppColors, BorderRadius } from "@/constants/theme";

interface SettingsMealPlanningProps {
  preferences: UserPreferences;
  onSelectPreset: (presetId: string) => void;
  theme: any;
}

export function SettingsMealPlanning({
  preferences,
  onSelectPreset,
  theme,
}: SettingsMealPlanningProps) {
  return (
    <GlassCard style={styles.section}>
      <ThemedText type="h4" style={styles.sectionTitle}>
        Meal Planning
      </ThemedText>
      <ThemedText type="caption" style={styles.dataInfo}>
        Choose how many meals you want to plan each day
      </ThemedText>
      <View style={styles.presetContainer}>
        {MEAL_PLAN_PRESETS.map((preset) => {
          const isSelected =
            (preferences.mealPlanPresetId || DEFAULT_PRESET_ID) ===
            preset.id;
          return (
            <Pressable
              key={preset.id}
              onPress={() => onSelectPreset(preset.id)}
              style={[
                styles.presetOption,
                {
                  backgroundColor: isSelected
                    ? AppColors.primary
                    : theme.backgroundSecondary,
                  borderColor: isSelected
                    ? AppColors.primary
                    : theme.border,
                },
              ]}
            >
              <View style={styles.presetHeader}>
                <Feather
                  name={isSelected ? "check-circle" : "circle"}
                  size={20}
                  color={isSelected ? "#FFFFFF" : theme.textSecondary}
                />
                <ThemedText
                  type="body"
                  style={{
                    color: isSelected ? "#FFFFFF" : theme.text,
                    fontWeight: "600",
                  }}
                >
                  {preset.name}
                </ThemedText>
              </View>
              <ThemedText
                type="caption"
                style={{
                  color: isSelected
                    ? "rgba(255,255,255,0.8)"
                    : theme.textSecondary,
                }}
              >
                {preset.description}
              </ThemedText>
            </Pressable>
          );
        })}
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
  dataInfo: {
    marginBottom: Spacing.sm,
  },
  presetContainer: {
    gap: Spacing.sm,
  },
  presetOption: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  presetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
});
