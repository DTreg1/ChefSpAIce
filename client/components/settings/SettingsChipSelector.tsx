import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { GlassCard } from "@/components/GlassCard";
import { Spacing, AppColors, BorderRadius } from "@/constants/theme";

interface ChipOption {
  value: string;
  label: string;
  icon?: string;
}

interface SettingsChipSelectorProps {
  title: string;
  description: string;
  options: ChipOption[];
  selected: string[];
  onToggle: (value: string) => void;
  selectedColor?: string;
  theme: any;
}

export function SettingsChipSelector({
  title,
  description,
  options,
  selected,
  onToggle,
  selectedColor = AppColors.primary,
  theme,
}: SettingsChipSelectorProps) {
  return (
    <GlassCard style={styles.section}>
      <ThemedText type="h4" style={styles.sectionTitle}>
        {title}
      </ThemedText>
      <ThemedText type="caption" style={styles.dataInfo}>
        {description}
      </ThemedText>
      <View style={styles.chipContainer}>
        {options.map((option) => {
          const isSelected = selected.includes(option.value);
          return (
            <Pressable
              key={option.value}
              onPress={() => onToggle(option.value)}
              style={[
                styles.chip,
                {
                  backgroundColor: isSelected
                    ? selectedColor
                    : theme.backgroundSecondary,
                  borderColor: isSelected ? selectedColor : theme.border,
                },
              ]}
              data-testid={`button-${title.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${option.value}`}
            >
              {option.icon ? (
                <Feather
                  name={option.icon as any}
                  size={14}
                  color={isSelected ? "#FFFFFF" : theme.text}
                  style={{ marginRight: 4 }}
                />
              ) : null}
              <ThemedText
                type="small"
                style={{ color: isSelected ? "#FFFFFF" : theme.text }}
              >
                {option.label}
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
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
});
