import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { GlassCard } from "@/components/GlassCard";
import { GlassButton } from "@/components/GlassButton";
import { Spacing, BorderRadius, AppColors } from "@/constants/theme";
import {
  Recipe,
  RecipeIngredient,
  IngredientAvailability,
} from "@/lib/storage";
import { hasSwapsAvailable } from "@/lib/ingredient-swaps";
import type { ThemeColors } from "@/lib/types";

function getAvailabilityIndicator(status?: IngredientAvailability): {
  color: string;
  icon: "check-circle" | "alert-circle" | "x-circle";
} {
  switch (status) {
    case "available":
      return { color: AppColors.success, icon: "check-circle" };
    case "partial":
      return { color: AppColors.warning, icon: "alert-circle" };
    case "unavailable":
      return { color: AppColors.error, icon: "x-circle" };
    default:
      return { color: AppColors.success, icon: "check-circle" };
  }
}

interface RecipeIngredientsListProps {
  recipe: Recipe;
  selectedServings: number;
  onServingsChange: (n: number) => void;
  scaleQuantity: (quantity: number | string, baseServings: number, targetServings: number) => string;
  onSwapPress: (ingredient: RecipeIngredient) => void;
  onAddMissingToShoppingList: () => void;
  availableCount: number;
  totalCount: number;
  instacartConfigured: boolean | null;
  instacartLoading: boolean;
  onOrderInstacart: () => void;
  theme: ThemeColors;
}

export function RecipeIngredientsList({
  recipe,
  selectedServings,
  onServingsChange,
  scaleQuantity,
  onSwapPress,
  onAddMissingToShoppingList,
  availableCount,
  totalCount,
  instacartConfigured,
  instacartLoading,
  onOrderInstacart,
  theme,
}: RecipeIngredientsListProps) {
  return (
    <GlassCard style={styles.section}>
      <View style={styles.sectionHeader}>
        <ThemedText type="h4">Ingredients</ThemedText>
        <ThemedText type="caption">
          {availableCount}/{totalCount} available
        </ThemedText>
      </View>

      <View style={styles.servingsStepper}>
        <ThemedText type="body">Servings</ThemedText>
        <View style={styles.stepperControls}>
          <Pressable
            onPress={() =>
              onServingsChange(Math.max(1, selectedServings - 1))
            }
            style={[
              styles.stepperButton,
              { backgroundColor: theme.backgroundSecondary },
            ]}
            disabled={selectedServings <= 1}
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
            accessibilityRole="button"
            accessibilityLabel="Decrease servings"
            accessibilityState={{ disabled: selectedServings <= 1 }}
          >
            <Feather
              name="minus"
              size={18}
              color={
                selectedServings <= 1 ? theme.textSecondary : theme.text
              }
            />
          </Pressable>
          <ThemedText
            type="h4"
            style={styles.servingsValue}
            accessibilityRole="text"
            accessibilityLabel={`${selectedServings} servings`}
            accessibilityLiveRegion="polite"
          >
            {selectedServings}
          </ThemedText>
          <Pressable
            onPress={() =>
              onServingsChange(Math.min(20, selectedServings + 1))
            }
            style={[
              styles.stepperButton,
              { backgroundColor: theme.backgroundSecondary },
            ]}
            disabled={selectedServings >= 20}
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
            accessibilityRole="button"
            accessibilityLabel="Increase servings"
            accessibilityState={{ disabled: selectedServings >= 20 }}
          >
            <Feather
              name="plus"
              size={18}
              color={
                selectedServings >= 20 ? theme.textSecondary : theme.text
              }
            />
          </Pressable>
        </View>
      </View>

      {recipe.ingredients.map((ingredient, index) => {
        const availability = getAvailabilityIndicator(
          ingredient.availabilityStatus,
        );
        const canSwap = hasSwapsAvailable(ingredient.name);
        const scaledQty = scaleQuantity(
          ingredient.quantity,
          recipe.servings || 1,
          selectedServings,
        );
        const isLowOrMissing =
          ingredient.availabilityStatus === "partial" ||
          ingredient.availabilityStatus === "unavailable";
        return (
          <View key={index} style={styles.ingredientRow} accessibilityRole="text" accessibilityLabel={`${ingredient.name}, ${scaledQty} ${ingredient.unit}, ${ingredient.availabilityStatus === 'available' ? 'in stock' : ingredient.availabilityStatus === 'partial' ? 'partially available' : 'not in stock'}`}>
            <Feather
              name={availability.icon}
              size={20}
              color={availability.color}
            />
            <View
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                gap: Spacing.xs,
              }}
            >
              <ThemedText
                type="body"
                style={[
                  styles.ingredientText,
                  isLowOrMissing && styles.missingIngredient,
                ]}
              >
                {scaledQty} {ingredient.unit} {ingredient.name}
                {ingredient.isOptional ? " (optional)" : ""}
              </ThemedText>
              {ingredient.availabilityStatus === "partial" &&
              ingredient.percentAvailable ? (
                <ThemedText
                  type="caption"
                  style={{ color: AppColors.warning }}
                >
                  ({ingredient.percentAvailable}%)
                </ThemedText>
              ) : null}
            </View>
            {canSwap ? (
              <Pressable
                onPress={() => onSwapPress(ingredient)}
                hitSlop={8}
                style={styles.swapButton}
                accessibilityRole="button"
                accessibilityLabel={`Swap ${ingredient.name} for an alternative`}
              >
                <Feather name="repeat" size={16} color={AppColors.accent} />
              </Pressable>
            ) : null}
          </View>
        );
      })}

      {availableCount < totalCount ? (
        <View style={styles.missingActionsContainer}>
          <GlassButton
            variant="outline"
            onPress={onAddMissingToShoppingList}
            style={styles.addMissingButton}
            icon={
              <Feather
                name="shopping-cart"
                size={18}
                color={AppColors.primary}
              />
            }
            accessibilityLabel="Add missing ingredients to shopping list"
          >
            Add Missing to List
          </GlassButton>
          {instacartConfigured ? (
            <GlassButton
              onPress={onOrderInstacart}
              disabled={instacartLoading}
              style={styles.instacartButton}
              icon={
                <Feather name="shopping-bag" size={18} color={theme.buttonText} />
              }
              testID="button-order-instacart-recipe"
              accessibilityLabel={instacartLoading ? "Creating Instacart link" : "Order missing ingredients on Instacart"}
            >
              {instacartLoading ? "Loading..." : "Order on Instacart"}
            </GlassButton>
          ) : null}
        </View>
      ) : null}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.md,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ingredientRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  ingredientText: {
    flex: 1,
  },
  missingIngredient: {},
  swapButton: {
    padding: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  addMissingButton: {
    flex: 1,
  },
  missingActionsContainer: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  instacartButton: {
    flex: 1,
    backgroundColor: AppColors.instacartGreen,
  },
  servingsStepper: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  stepperControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  stepperButton: {
    width: 36,
    height: 36,
    minHeight: 44,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  servingsValue: {
    minWidth: 32,
    textAlign: "center",
  },
});
