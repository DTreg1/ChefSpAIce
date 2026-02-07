import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { GlassCard } from "@/components/GlassCard";
import { GlassButton } from "@/components/GlassButton";
import {
  UserPreferences,
  DEFAULT_MACRO_TARGETS,
  MacroTargets,
} from "@/lib/storage";
import { Spacing, AppColors, BorderRadius } from "@/constants/theme";

interface SettingsNutritionTargetsProps {
  preferences: UserPreferences;
  onMacroChange: (macro: keyof MacroTargets, delta: number) => void;
  onResetMacros: () => void;
  theme: any;
}

export function SettingsNutritionTargets({
  preferences,
  onMacroChange,
  onResetMacros,
  theme,
}: SettingsNutritionTargetsProps) {
  return (
    <GlassCard style={styles.section}>
      <ThemedText type="h4" style={styles.sectionTitle}>
        Nutrition Targets
      </ThemedText>
      <ThemedText type="caption" style={styles.dataInfo}>
        Set your preferred macro ratios for recipe generation. Values must
        total 100%.
      </ThemedText>

      {(["protein", "carbs", "fat"] as const).map((macro) => {
        const macros = preferences.macroTargets || DEFAULT_MACRO_TARGETS;
        const labels = { protein: "Protein", carbs: "Carbs", fat: "Fat" };
        const colors = {
          protein: AppColors.primary,
          carbs: AppColors.warning,
          fat: AppColors.accent,
        };
        return (
          <View key={macro} style={styles.macroRow}>
            <View style={styles.macroLabel}>
              <View
                style={[
                  styles.macroIndicator,
                  { backgroundColor: colors[macro] },
                ]}
              />
              <ThemedText type="body">{labels[macro]}</ThemedText>
            </View>
            <View style={styles.macroControls}>
              <Pressable
                onPress={() => onMacroChange(macro, -5)}
                style={[
                  styles.macroButton,
                  { backgroundColor: theme.backgroundSecondary },
                ]}
              >
                <Feather name="minus" size={16} color={theme.text} />
              </Pressable>
              <View
                style={[
                  styles.macroValue,
                  { backgroundColor: colors[macro] },
                ]}
              >
                <ThemedText
                  type="body"
                  style={{ color: "#FFFFFF", fontWeight: "600" }}
                >
                  {macros[macro]}%
                </ThemedText>
              </View>
              <Pressable
                onPress={() => onMacroChange(macro, 5)}
                style={[
                  styles.macroButton,
                  { backgroundColor: theme.backgroundSecondary },
                ]}
              >
                <Feather name="plus" size={16} color={theme.text} />
              </Pressable>
            </View>
          </View>
        );
      })}

      <GlassButton
        variant="outline"
        onPress={onResetMacros}
        style={styles.resetMacroButton}
        icon={
          <Feather
            name="refresh-cw"
            size={16}
            color={theme.textSecondary}
          />
        }
      >
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          Reset to Default (50/35/15)
        </ThemedText>
      </GlassButton>
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
  macroRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  macroLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  macroIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  macroControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  macroButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  macroValue: {
    minWidth: 56,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  resetMacroButton: {
    marginTop: Spacing.sm,
  },
});
