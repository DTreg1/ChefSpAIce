import React, { useState, useMemo } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  Modal,
  Platform,
} from "react-native";
import { BlurView } from "expo-blur";
import {
  GlassView,
  isLiquidGlassAvailable,
} from "@/components/GlassViewWithContext";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { Spacing, BorderRadius, AppColors } from "@/constants/theme";
import {
  findSwapsForIngredient,
  formatSwapRatio,
  DIETARY_FILTERS,
  DietaryFilter,
  IngredientSwap,
} from "@/lib/ingredient-swaps";
import { RecipeIngredient, FoodItem } from "@/lib/storage";

interface IngredientSwapModalProps {
  visible: boolean;
  onClose: () => void;
  ingredient: RecipeIngredient;
  inventory: FoodItem[];
  onSelectSwap?: (original: RecipeIngredient, swap: IngredientSwap) => void;
}

export function IngredientSwapModal({
  visible,
  onClose,
  ingredient,
  inventory,
  onSelectSwap,
}: IngredientSwapModalProps) {
  const { theme, isDark } = useTheme();
  const { focusTargetRef, containerRef, onAccessibilityEscape } = useFocusTrap({
    visible,
    onDismiss: onClose,
  });
  const [selectedFilters, setSelectedFilters] = useState<DietaryFilter[]>([]);
  const useLiquidGlass = Platform.OS === "ios" && isLiquidGlassAvailable();

  const swaps = useMemo(() => {
    return findSwapsForIngredient(ingredient.name, selectedFilters);
  }, [ingredient.name, selectedFilters]);

  const toggleFilter = (filter: DietaryFilter) => {
    setSelectedFilters((prev) =>
      prev.includes(filter)
        ? prev.filter((f) => f !== filter)
        : [...prev, filter],
    );
  };

  const isInInventory = (alternativeName: string): boolean => {
    const normalizedAlt = alternativeName.toLowerCase().trim();
    const altWords = normalizedAlt.split(/\s+/).filter((w) => w.length > 2);

    return inventory.some((item) => {
      const normalizedItem = item.name.toLowerCase().trim();
      if (normalizedItem === normalizedAlt) return true;
      const itemWords = normalizedItem.split(/\s+/).filter((w) => w.length > 2);
      const matchingWords = altWords.filter((word) =>
        itemWords.some(
          (itemWord) =>
            itemWord === word ||
            itemWord.startsWith(word) ||
            word.startsWith(itemWord),
        ),
      );
      return (
        matchingWords.length >= Math.min(altWords.length, itemWords.length) &&
        matchingWords.length > 0
      );
    });
  };

  const handleSelectSwap = (swap: IngredientSwap) => {
    onSelectSwap?.(ingredient, swap);
    onClose();
  };

  const renderContent = () => (
    <View style={styles.content}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Feather name="repeat" size={20} color={AppColors.primary} />
          <ThemedText type="h3" style={styles.headerTitle} ref={focusTargetRef}>
            Swap Ingredient
          </ThemedText>
        </View>
        <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close ingredient swap">
          <Feather name="x" size={24} color={theme.text} />
        </Pressable>
      </View>

      <View
        style={[
          styles.ingredientBadge,
          { backgroundColor: theme.backgroundSecondary },
        ]}
      >
        <ThemedText type="body" style={{ fontWeight: "600" }}>
          {ingredient.quantity} {ingredient.unit} {ingredient.name}
        </ThemedText>
      </View>

      <View style={styles.filtersSection}>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          Filter by dietary needs:
        </ThemedText>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersScroll}
          contentContainerStyle={styles.filtersContent}
        >
          {DIETARY_FILTERS.map((filter) => {
            const isSelected = selectedFilters.includes(filter.id);
            return (
              <Pressable
                key={filter.id}
                onPress={() => toggleFilter(filter.id)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isSelected
                      ? AppColors.primary
                      : theme.backgroundSecondary,
                    borderColor: isSelected
                      ? AppColors.primary
                      : theme.glass.border,
                  },
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`${filter.label} dietary filter`}
              >
                <Feather
                  name={filter.icon as any}
                  size={14}
                  color={isSelected ? "#FFFFFF" : theme.textSecondary}
                />
                <ThemedText
                  type="caption"
                  style={{
                    color: isSelected ? "#FFFFFF" : theme.text,
                    marginLeft: Spacing.xs,
                  }}
                >
                  {filter.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.swapsList}
        contentContainerStyle={styles.swapsContent}
        showsVerticalScrollIndicator={false}
      >
        {swaps.length === 0 ? (
          <View style={styles.emptyState} accessibilityRole="text">
            <Feather
              name="alert-circle"
              size={32}
              color={theme.textSecondary}
            />
            <ThemedText
              type="body"
              style={{
                color: theme.textSecondary,
                textAlign: "center",
                marginTop: Spacing.md,
              }}
            >
              {selectedFilters.length > 0
                ? "No swaps match your dietary filters. Try removing some filters."
                : "No swaps available for this ingredient."}
            </ThemedText>
          </View>
        ) : (
          swaps.map((swap, index) => {
            const inStock = isInInventory(swap.alternative);
            return (
              <Animated.View
                key={`${swap.alternative}-${index}`}
                entering={FadeIn.delay(index * 50)}
              >
                <Pressable
                  onPress={() => handleSelectSwap(swap)}
                  style={({ pressed }) => [
                    styles.swapCard,
                    {
                      backgroundColor: pressed
                        ? theme.backgroundSecondary
                        : theme.backgroundDefault,
                      borderColor: inStock
                        ? AppColors.success + "50"
                        : theme.glass.border,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`${swap.alternative}, ratio ${formatSwapRatio(swap.ratio)}${inStock ? ', in stock' : ''}`}
                  accessibilityHint="Tap to use this substitute"
                >
                  <View style={styles.swapHeader}>
                    <View style={styles.swapTitleRow}>
                      <ThemedText type="body" style={{ fontWeight: "600" }}>
                        {swap.alternative}
                      </ThemedText>
                      {inStock ? (
                        <View
                          style={[
                            styles.inStockBadge,
                            { backgroundColor: AppColors.success + "20" },
                          ]}
                        >
                          <Feather
                            name="check"
                            size={12}
                            color={AppColors.success}
                          />
                          <ThemedText
                            type="caption"
                            style={{
                              color: AppColors.success,
                              marginLeft: 4,
                            }}
                          >
                            In Stock
                          </ThemedText>
                        </View>
                      ) : null}
                    </View>
                    <View
                      style={[
                        styles.ratioBadge,
                        { backgroundColor: AppColors.accent + "20" },
                      ]}
                    >
                      <ThemedText
                        type="caption"
                        style={{ color: AppColors.accent }}
                      >
                        {formatSwapRatio(swap.ratio)}
                      </ThemedText>
                    </View>
                  </View>

                  {swap.notes ? (
                    <ThemedText
                      type="small"
                      style={{
                        color: theme.textSecondary,
                        marginTop: Spacing.xs,
                      }}
                    >
                      {swap.notes}
                    </ThemedText>
                  ) : null}

                  <View style={styles.tagsRow}>
                    {swap.dietaryTags.slice(0, 4).map((tag) => (
                      <View
                        key={tag}
                        style={[
                          styles.tagBadge,
                          { backgroundColor: theme.backgroundSecondary },
                        ]}
                      >
                        <ThemedText type="caption">{tag}</ThemedText>
                      </View>
                    ))}
                  </View>
                </Pressable>
              </Animated.View>
            );
          })
        )}
      </ScrollView>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      accessibilityViewIsModal={true}
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close swap modal" accessibilityRole="button" />
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
          ref={containerRef}
          onAccessibilityEscape={onAccessibilityEscape}
          style={styles.modalContainer}
        >
          {useLiquidGlass ? (
            <GlassView glassEffectStyle="regular" style={styles.modalContent}>
              {renderContent()}
            </GlassView>
          ) : Platform.OS === "ios" ? (
            <BlurView
              intensity={80}
              tint={isDark ? "dark" : "light"}
              style={styles.modalContent}
            >
              {renderContent()}
            </BlurView>
          ) : (
            <View
              style={[
                styles.modalContent,
                {
                  backgroundColor: isDark
                    ? "rgba(30, 30, 30, 0.98)"
                    : "rgba(255, 255, 255, 0.98)",
                },
              ]}
            >
              {renderContent()}
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  modalContainer: {
    width: "100%",
    maxWidth: 400,
    maxHeight: "80%",
  },
  modalContent: {
    borderRadius: BorderRadius.xl,
    overflow: "hidden",
  },
  content: {
    padding: Spacing.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  headerTitle: {
    marginLeft: Spacing.xs,
  },
  ingredientBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignSelf: "flex-start",
    marginBottom: Spacing.md,
  },
  filtersSection: {
    marginBottom: Spacing.md,
  },
  filtersScroll: {
    marginTop: Spacing.sm,
  },
  filtersContent: {
    gap: Spacing.sm,
    paddingRight: Spacing.md,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  swapsList: {
    maxHeight: 350,
  },
  swapsContent: {
    gap: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  swapCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  swapHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  swapTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: Spacing.sm,
  },
  inStockBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  ratioBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  tagBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
  },
});
