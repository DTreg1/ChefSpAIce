import React from "react";
import { View, StyleSheet, Pressable } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, AppColors } from "@/constants/theme";
import { FoodGroup, FOOD_GROUPS } from "./inventory-utils";
import type { ThemeColors } from "@/lib/types";

export type { FoodGroup };
export { FOOD_GROUPS };

interface InventoryFiltersProps {
  selectedFoodGroups: FoodGroup[];
  onToggleFoodGroup: (group: FoodGroup) => void;
  theme: ThemeColors;
}

export function InventoryFilters({
  selectedFoodGroups,
  onToggleFoodGroup,
  theme,
}: InventoryFiltersProps) {
  const { style: themeStyle } = useTheme();
  return (
    <View style={[styles.filterRow, styles.searchBlur]}>
      {FOOD_GROUPS.map((group) => {
        const isSelected = selectedFoodGroups.includes(group.key);
        return (
          <Pressable
            key={group.key}
            testID={`filter-foodgroup-${group.key}`}
            accessibilityRole="button"
            accessibilityLabel={`Filter by ${group.label}, ${isSelected ? 'selected' : 'not selected'}`}
            accessibilityState={{ selected: isSelected }}
            style={[
              styles.foodGroupChip,
              {
                backgroundColor: isSelected
                  ? AppColors.primary
                  : themeStyle.glass.background,
                borderColor: isSelected
                  ? AppColors.primary
                  : themeStyle.glass.border,
                borderRadius: themeStyle.glassEffect.borderRadius.pill,
              },
            ]}
            onPress={() => onToggleFoodGroup(group.key)}
          >
            <ThemedText
              type="caption"
              numberOfLines={1}
              style={{
                color: isSelected ? "#FFFFFF" : theme.textSecondary,
                fontWeight: isSelected ? "600" : "400",
                textAlign: "center",
              }}
            >
              {group.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  searchBlur: {
    paddingHorizontal: Spacing.lg,
  },
  filterRow: {
    flexDirection: "row",
    marginTop: Spacing.sm,
    gap: 6,
  },
  foodGroupChip: {
    flex: 1,
    flexBasis: 0,
    flexShrink: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.sm,
    minHeight: 40,
    borderWidth: 1,
  },
});
