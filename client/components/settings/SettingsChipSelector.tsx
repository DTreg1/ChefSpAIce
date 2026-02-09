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
  onAdd?: () => void;
  selectedColor?: string;
  theme: any;
}

export function SettingsChipSelector({
  title,
  description,
  options,
  selected,
  onToggle,
  onAdd,
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
        {onAdd ? (
          <Pressable
            onPress={onAdd}
            style={[
              styles.chip,
              styles.addChip,
              {
                backgroundColor: "transparent",
                borderColor: theme.border,
                borderStyle: "dashed" as any,
              },
            ]}
            data-testid={`button-${title.toLowerCase().replace(/[^a-z0-9]/g, "-")}-add-new`}
          >
            <Feather name="plus" size={14} color={theme.textSecondary} />
            <ThemedText
              type="small"
              style={{ color: theme.textSecondary }}
            >
              Add New
            </ThemedText>
          </Pressable>
        ) : null}
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
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  addChip: {
    borderWidth: 1.5,
  },
});
