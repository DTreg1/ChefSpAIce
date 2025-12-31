import React, { useState, useCallback } from "react";
import { View, StyleSheet, Pressable, Share, Platform } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
  withDelay,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { GlassCard } from "@/components/GlassCard";
import { GlassButton } from "@/components/GlassButton";
import { ExpiryBadge } from "@/components/ExpiryBadge";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, AppColors } from "@/constants/theme";
import { storage, generateId, ShoppingListItem } from "@/lib/storage";

import type { IngredientAvailability } from "@/lib/storage";

// Helper to get color and icon for availability status
function getAvailabilityIndicator(status?: IngredientAvailability): {
  color: string;
  icon: "check-circle" | "alert-circle" | "x-circle";
  label: string;
} {
  switch (status) {
    case "available":
      return { color: AppColors.success, icon: "check-circle", label: "In stock" };
    case "partial":
      return { color: AppColors.warning, icon: "alert-circle", label: "Low quantity" };
    case "unavailable":
      return { color: AppColors.error, icon: "x-circle", label: "Not enough" };
    default:
      return { color: AppColors.success, icon: "check-circle", label: "In stock" };
  }
}

export interface GeneratedRecipeResult {
  title: string;
  description: string;
  ingredients: Array<{
    name: string;
    quantity: number | string;
    unit: string;
    fromInventory?: boolean;
    availabilityStatus?: IngredientAvailability;
    percentAvailable?: number;
  }>;
  instructions: string[];
  prepTime: number;
  cookTime: number;
  servings: number;
  nutrition?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  usedExpiringItems?: string[];
  usedExpiringCount?: number;
}

interface RecipeResultProps {
  recipe: GeneratedRecipeResult | null;
  expiringItemsUsed: string[];
  onSave: () => void;
  onRegenerate: () => void;
  error?: string | null;
  loading?: boolean;
}

const WASTE_TIPS = [
  "Tip: Freeze leftovers to extend their life by months!",
  "Tip: Use vegetable scraps to make homemade stock.",
  "Tip: Overripe fruits are perfect for smoothies and baking.",
  "Tip: Store herbs in water like flowers to keep them fresh longer.",
  "Tip: Plan your meals around what needs to be used first.",
];

function getRandomTip(): string {
  return WASTE_TIPS[Math.floor(Math.random() * WASTE_TIPS.length)];
}

export function RecipeResult({
  recipe,
  expiringItemsUsed,
  onSave,
  onRegenerate,
  error,
  loading,
}: RecipeResultProps) {
  const { theme } = useTheme();
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(
    new Set(),
  );
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [addingToList, setAddingToList] = useState(false);

  const celebrationScale = useSharedValue(1);
  const celebrationOpacity = useSharedValue(0);

  const showCelebration = expiringItemsUsed.length >= 2;

  React.useEffect(() => {
    if (showCelebration && recipe) {
      celebrationOpacity.value = withDelay(300, withSpring(1));
      celebrationScale.value = withDelay(
        300,
        withSequence(
          withSpring(1.1, { damping: 8 }),
          withSpring(1, { damping: 12 }),
        ),
      );
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }
  }, [showCelebration, recipe, celebrationOpacity, celebrationScale]);

  const celebrationStyle = useAnimatedStyle(() => ({
    transform: [{ scale: celebrationScale.value }],
    opacity: celebrationOpacity.value,
  }));

  const toggleIngredient = useCallback((index: number) => {
    setCheckedIngredients((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  const toggleStep = useCallback((index: number) => {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
        if (Platform.OS !== "web") {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      }
      return next;
    });
  }, []);

  const handleShare = useCallback(async () => {
    if (!recipe) return;

    const ingredientsList = recipe.ingredients
      .map((i) => `- ${i.quantity} ${i.unit} ${i.name}`)
      .join("\n");

    const instructionsList = recipe.instructions
      .map((step, i) => `${i + 1}. ${step}`)
      .join("\n");

    const shareText = `${recipe.title}\n\n${recipe.description}\n\nIngredients:\n${ingredientsList}\n\nInstructions:\n${instructionsList}\n\nPrep: ${recipe.prepTime}min | Cook: ${recipe.cookTime}min | Serves: ${recipe.servings}`;

    try {
      await Share.share({
        message: shareText,
        title: recipe.title,
      });
    } catch (err) {
      console.error("Share error:", err);
    }
  }, [recipe]);

  const handleAddMissingToList = useCallback(async () => {
    if (!recipe) return;

    setAddingToList(true);
    try {
      const missingItems = recipe.ingredients.filter((i) => !i.fromInventory);
      const existingList = await storage.getShoppingList();
      const existingNames = new Set(
        existingList.map((i) => i.name.toLowerCase()),
      );

      const newItems: ShoppingListItem[] = missingItems
        .filter((i) => !existingNames.has(i.name.toLowerCase()))
        .map((i) => ({
          id: generateId(),
          name: i.name,
          quantity: typeof i.quantity === "number" ? i.quantity : 1,
          unit: i.unit,
          isChecked: false,
          category: "Recipe Ingredients",
        }));

      for (const item of newItems) {
        await storage.addShoppingListItem(item);
      }

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err) {
      console.error("Error adding to shopping list:", err);
    } finally {
      setAddingToList(false);
    }
  }, [recipe]);

  if (error) {
    return (
      <GlassCard style={styles.errorContainer}>
        <Feather name="alert-circle" size={48} color={AppColors.error} />
        <ThemedText type="h4" style={styles.errorTitle}>
          Generation Failed
        </ThemedText>
        <ThemedText type="body" style={styles.errorMessage}>
          {error ||
            "Something went wrong while creating your recipe. Please try again."}
        </ThemedText>
        <GlassButton onPress={onRegenerate} style={styles.retryButton}>
          Try Again
        </GlassButton>
      </GlassCard>
    );
  }

  if (!recipe) {
    return null;
  }

  const totalTime = recipe.prepTime + recipe.cookTime;
  const missingIngredients = recipe.ingredients.filter((i) => !i.fromInventory);
  const inventoryIngredients = recipe.ingredients.filter(
    (i) => i.fromInventory,
  );

  return (
    <View style={styles.container}>
      {showCelebration ? (
        <Animated.View style={[styles.celebrationBanner, celebrationStyle]}>
          <GlassCard
            style={[
              styles.celebrationCard,
              { backgroundColor: `${AppColors.success}15` },
            ]}
          >
            <View style={styles.celebrationHeader}>
              <Feather name="award" size={24} color={AppColors.success} />
              <ThemedText type="h4" style={{ color: AppColors.success }}>
                Great Job Saving Food!
              </ThemedText>
            </View>
            <ThemedText type="body" style={styles.celebrationText}>
              You're using {expiringItemsUsed.length} items that were about to
              expire!
            </ThemedText>
            <ThemedText type="caption" style={styles.tipText}>
              {getRandomTip()}
            </ThemedText>
          </GlassCard>
        </Animated.View>
      ) : null}

      <GlassCard style={styles.headerSection}>
        <ThemedText type="h3">{recipe.title}</ThemedText>
        <ThemedText type="body" style={styles.description}>
          {recipe.description}
        </ThemedText>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Feather name="clock" size={16} color={theme.textSecondary} />
            <ThemedText type="small">{totalTime} min</ThemedText>
          </View>
          <View style={styles.metaItem}>
            <Feather name="users" size={16} color={theme.textSecondary} />
            <ThemedText type="small">{recipe.servings} servings</ThemedText>
          </View>
          {recipe.nutrition ? (
            <View style={styles.metaItem}>
              <Feather name="zap" size={16} color={theme.textSecondary} />
              <ThemedText type="small">
                {recipe.nutrition.calories} cal
              </ThemedText>
            </View>
          ) : null}
        </View>

        {expiringItemsUsed.length > 0 ? (
          <View style={styles.expiringBadge}>
            <Feather name="check-circle" size={16} color={AppColors.success} />
            <ThemedText type="small" style={{ color: AppColors.success }}>
              Uses {expiringItemsUsed.length} expiring item
              {expiringItemsUsed.length > 1 ? "s" : ""}!
            </ThemedText>
          </View>
        ) : null}
      </GlassCard>

      <GlassCard style={styles.section}>
        <View style={styles.sectionHeader}>
          <ThemedText type="h4">Ingredients</ThemedText>
          <ThemedText type="caption" style={{ opacity: 0.7 }}>
            {checkedIngredients.size}/{recipe.ingredients.length} checked
          </ThemedText>
        </View>

        {inventoryIngredients.length > 0 ? (
          <View style={styles.ingredientGroup}>
            <ThemedText type="small" style={styles.groupLabel}>
              From Your Inventory
            </ThemedText>
            {recipe.ingredients.map((ingredient, index) => {
              if (!ingredient.fromInventory) return null;
              const isExpiring = expiringItemsUsed.some(
                (name) => name.toLowerCase() === ingredient.name.toLowerCase(),
              );
              const isChecked = checkedIngredients.has(index);
              const availability = getAvailabilityIndicator(ingredient.availabilityStatus);

              return (
                <Pressable
                  key={index}
                  style={[
                    styles.ingredientItem,
                    {
                      backgroundColor: isChecked
                        ? `${AppColors.success}10`
                        : isExpiring
                          ? `${AppColors.warning}10`
                          : theme.backgroundDefault,
                    },
                  ]}
                  onPress={() => toggleIngredient(index)}
                  testID={`ingredient-item-${index}`}
                  accessibilityRole="checkbox"
                  accessibilityLabel={`${ingredient.quantity} ${ingredient.unit} ${ingredient.name}`}
                  accessibilityState={{ checked: isChecked }}
                  accessibilityHint={isChecked ? "Tap to uncheck" : "Tap to check off ingredient"}
                >
                  <View
                    style={[
                      styles.checkbox,
                      {
                        backgroundColor: isChecked
                          ? AppColors.success
                          : "transparent",
                        borderColor: isChecked
                          ? AppColors.success
                          : theme.textSecondary,
                      },
                    ]}
                  >
                    {isChecked ? (
                      <Feather name="check" size={12} color="#FFFFFF" />
                    ) : null}
                  </View>
                  <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: Spacing.xs }}>
                    <Feather name={availability.icon} size={16} color={availability.color} />
                    <ThemedText
                      type="body"
                      style={[
                        styles.ingredientText,
                        isChecked ? styles.checkedText : null,
                        { flex: 1 },
                      ]}
                    >
                      {ingredient.quantity} {ingredient.unit} {ingredient.name}
                    </ThemedText>
                  </View>
                  {ingredient.availabilityStatus === "partial" && ingredient.percentAvailable ? (
                    <ThemedText type="caption" style={{ color: AppColors.warning }}>
                      {ingredient.percentAvailable}%
                    </ThemedText>
                  ) : null}
                  {isExpiring ? (
                    <ExpiryBadge daysUntilExpiry={2} size="small" />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {missingIngredients.length > 0 ? (
          <View style={styles.ingredientGroup}>
            <View style={styles.groupLabelRow}>
              <ThemedText type="small" style={styles.groupLabel}>
                Need to Purchase
              </ThemedText>
              <View style={styles.purchaseBadge}>
                <Feather
                  name="shopping-cart"
                  size={12}
                  color={AppColors.primary}
                />
                <ThemedText type="caption" style={{ color: AppColors.primary }}>
                  {missingIngredients.length}
                </ThemedText>
              </View>
            </View>
            {recipe.ingredients.map((ingredient, index) => {
              if (ingredient.fromInventory) return null;
              const isChecked = checkedIngredients.has(index);

              return (
                <Pressable
                  key={index}
                  style={[
                    styles.ingredientItem,
                    {
                      backgroundColor: isChecked
                        ? `${AppColors.success}10`
                        : theme.backgroundDefault,
                    },
                  ]}
                  onPress={() => toggleIngredient(index)}
                  testID={`missing-ingredient-${index}`}
                  accessibilityRole="checkbox"
                  accessibilityLabel={`${ingredient.quantity} ${ingredient.unit} ${ingredient.name}, need to purchase`}
                  accessibilityState={{ checked: isChecked }}
                  accessibilityHint={isChecked ? "Tap to uncheck" : "Tap to check off ingredient"}
                >
                  <View
                    style={[
                      styles.checkbox,
                      {
                        backgroundColor: isChecked
                          ? AppColors.success
                          : "transparent",
                        borderColor: isChecked
                          ? AppColors.success
                          : theme.textSecondary,
                      },
                    ]}
                  >
                    {isChecked ? (
                      <Feather name="check" size={12} color="#FFFFFF" />
                    ) : null}
                  </View>
                  <ThemedText
                    type="body"
                    style={[
                      styles.ingredientText,
                      isChecked ? styles.checkedText : null,
                    ]}
                  >
                    {ingredient.quantity} {ingredient.unit} {ingredient.name}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </GlassCard>

      <GlassCard style={styles.section}>
        <View style={styles.sectionHeader}>
          <ThemedText type="h4">Instructions</ThemedText>
          <ThemedText type="caption" style={{ opacity: 0.7 }}>
            {completedSteps.size}/{recipe.instructions.length} done
          </ThemedText>
        </View>

        <View style={styles.instructionsList}>
          {recipe.instructions.map((step, index) => {
            const isCompleted = completedSteps.has(index);

            return (
              <Pressable
                key={index}
                style={[
                  styles.instructionItem,
                  {
                    backgroundColor: isCompleted
                      ? `${AppColors.success}10`
                      : theme.backgroundDefault,
                  },
                ]}
                onPress={() => toggleStep(index)}
                testID={`instruction-step-${index}`}
                accessibilityRole="checkbox"
                accessibilityLabel={`Step ${index + 1}: ${step}`}
                accessibilityState={{ checked: isCompleted }}
                accessibilityHint={isCompleted ? "Tap to mark as incomplete" : "Tap to mark as complete"}
              >
                <View
                  style={[
                    styles.stepNumber,
                    {
                      backgroundColor: isCompleted
                        ? AppColors.success
                        : AppColors.primary,
                    },
                  ]}
                >
                  {isCompleted ? (
                    <Feather name="check" size={14} color="#FFFFFF" />
                  ) : (
                    <ThemedText type="small" style={styles.stepNumberText}>
                      {index + 1}
                    </ThemedText>
                  )}
                </View>
                <ThemedText
                  type="body"
                  style={[
                    styles.stepText,
                    isCompleted ? styles.completedStepText : null,
                  ]}
                >
                  {step}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </GlassCard>

      <View style={styles.actionsContainer}>
        <GlassButton
          onPress={onSave}
          icon={<Feather name="bookmark" size={18} color="#FFFFFF" />}
          style={styles.primaryAction}
        >
          Save to Recipes
        </GlassButton>

        <View style={styles.secondaryActions}>
          <GlassButton
            onPress={onRegenerate}
            variant="outline"
            icon={
              <Feather name="refresh-cw" size={16} color={AppColors.primary} />
            }
            style={styles.secondaryButton}
          >
            Generate Another
          </GlassButton>

          <GlassButton
            onPress={handleShare}
            variant="outline"
            icon={
              <Feather name="share-2" size={16} color={AppColors.primary} />
            }
            style={styles.secondaryButton}
          >
            Share
          </GlassButton>
        </View>

        {missingIngredients.length > 0 ? (
          <GlassButton
            onPress={handleAddMissingToList}
            variant="ghost"
            loading={addingToList}
            icon={<Feather name="shopping-cart" size={16} color={theme.text} />}
            style={styles.addToListButton}
          >
            Add {missingIngredients.length} missing items to shopping list
          </GlassButton>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.lg,
  },
  errorContainer: {
    alignItems: "center",
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  errorTitle: {
    textAlign: "center",
  },
  errorMessage: {
    textAlign: "center",
    opacity: 0.7,
  },
  retryButton: {
    marginTop: Spacing.md,
  },
  celebrationBanner: {
    marginBottom: Spacing.sm,
  },
  celebrationCard: {
    borderWidth: 1,
    borderColor: `${AppColors.success}30`,
  },
  celebrationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  celebrationText: {
    marginBottom: Spacing.xs,
  },
  tipText: {
    opacity: 0.8,
    fontStyle: "italic",
  },
  headerSection: {
    gap: Spacing.md,
  },
  description: {
    opacity: 0.8,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.lg,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  expiringBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    backgroundColor: `${AppColors.success}15`,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    alignSelf: "flex-start",
  },
  section: {
    gap: Spacing.md,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ingredientGroup: {
    gap: Spacing.sm,
  },
  groupLabel: {
    fontWeight: "600",
    opacity: 0.7,
    marginBottom: Spacing.xs,
  },
  groupLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.xs,
  },
  purchaseBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ingredientItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: BorderRadius.xs,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  ingredientText: {
    flex: 1,
  },
  checkedText: {
    textDecorationLine: "line-through",
    opacity: 0.6,
  },
  instructionsList: {
    gap: Spacing.md,
  },
  instructionItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  stepNumberText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  stepText: {
    flex: 1,
    lineHeight: 24,
  },
  completedStepText: {
    textDecorationLine: "line-through",
    opacity: 0.6,
  },
  actionsContainer: {
    gap: Spacing.md,
  },
  primaryAction: {
    marginBottom: Spacing.xs,
  },
  secondaryActions: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  secondaryButton: {
    flex: 1,
  },
  addToListButton: {
    marginTop: Spacing.xs,
  },
});
