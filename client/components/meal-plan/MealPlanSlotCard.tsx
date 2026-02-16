import React from "react";
import { View, StyleSheet, Pressable, Platform, AccessibilityRole } from "react-native";
import { Feather } from "@expo/vector-icons";
import { format } from "date-fns";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import {
  Spacing,
  BorderRadius,
} from "@/constants/theme";
import { Recipe } from "@/lib/storage";

interface MealSlot {
  id: string;
  name: string;
  icon: "sunrise" | "sun" | "moon" | "coffee" | "sunset";
}

interface MealPlanSlotCardProps {
  slot: MealSlot;
  recipe: Recipe | undefined;
  selectedDay: Date;
  onMealPress: (date: Date, slotId: string, recipe: Recipe) => void;
  onAddMeal: (date: string, slotId: string) => void;
  onRemoveMeal?: (date: string, slotId: string) => void;
  onSwapRecipe?: (date: string, slotId: string) => void;
}

export function MealPlanSlotCard({
  slot,
  recipe,
  selectedDay,
  onMealPress,
  onAddMeal,
  onRemoveMeal,
  onSwapRecipe,
}: MealPlanSlotCardProps) {
  const { theme, style: themeStyle } = useTheme();

  return (
    <View style={styles.mealSlot} {...(Platform.OS === "web" ? { accessibilityRole: "listitem" as unknown as AccessibilityRole } : {})} accessibilityLabel={`${slot.name}${recipe ? `, ${recipe.title}` : ', empty'}`}>
      <View style={styles.mealHeader}>
        <Feather
          name={slot.icon}
          size={18}
          color={theme.textSecondary}
        />
        <ThemedText type="small" style={styles.mealLabel}>
          {slot.name}
        </ThemedText>
      </View>
      {recipe ? (
        <Pressable
          style={[
            styles.mealContent,
            {
              backgroundColor: theme.glass.background,
              borderColor: theme.glass.border,
              borderRadius: themeStyle.glassEffect.borderRadius.md,
            },
          ]}
          onPress={() =>
            onMealPress(selectedDay, slot.id, recipe)
          }
          accessibilityRole="button"
          accessibilityLabel={`${recipe.title} for ${slot.name}, ${recipe.prepTime + recipe.cookTime} minutes`}
          accessibilityHint="Opens meal options"
          accessibilityActions={[
            { name: "activate", label: "View meal options" },
            ...(onRemoveMeal ? [{ name: "delete", label: "Remove meal" }] : []),
            ...(onSwapRecipe ? [{ name: "magicTap", label: "Swap recipe" }] : []),
          ]}
          onAccessibilityAction={(event) => {
            const dateStr = format(selectedDay, "yyyy-MM-dd");
            switch (event.nativeEvent.actionName) {
              case "activate":
                onMealPress(selectedDay, slot.id, recipe);
                break;
              case "delete":
                onRemoveMeal?.(dateStr, slot.id);
                break;
              case "magicTap":
                onSwapRecipe?.(dateStr, slot.id);
                break;
            }
          }}
        >
          <View style={styles.mealContentInner}>
            <View style={styles.mealTextContainer}>
              <ThemedText type="body">{recipe.title}</ThemedText>
              <View style={styles.mealMeta}>
                <Feather
                  name="clock"
                  size={14}
                  color={theme.textSecondary}
                />
                <ThemedText type="caption">
                  {recipe.prepTime + recipe.cookTime} min
                </ThemedText>
              </View>
            </View>
            <Feather
              name="more-horizontal"
              size={20}
              color={theme.textSecondary}
            />
          </View>
        </Pressable>
      ) : (
        <Pressable
          style={[
            styles.addMealButton,
            { borderColor: theme.glass.border },
          ]}
          onPress={() => {
            onAddMeal(
              format(selectedDay, "yyyy-MM-dd"),
              slot.id,
            );
          }}
          accessibilityRole="button"
          accessibilityLabel={`Add ${slot.name.toLowerCase()} for ${format(selectedDay, 'EEEE, MMMM d')}`}
          accessibilityHint="Opens recipe selection"
        >
          <Feather
            name="plus"
            size={18}
            color={theme.textSecondary}
          />
          <ThemedText
            type="small"
            style={{ color: theme.textSecondary }}
          >
            Add {slot.name.toLowerCase()}
          </ThemedText>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  mealSlot: {
    gap: Spacing.sm,
  },
  mealHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  mealLabel: {
    textTransform: "capitalize",
    fontWeight: "600",
  },
  mealContent: {
    padding: Spacing.md,
    borderWidth: 1,
  },
  mealContentInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  mealTextContainer: {
    flex: 1,
  },
  mealMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  addMealButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderStyle: "dashed",
  },
});
