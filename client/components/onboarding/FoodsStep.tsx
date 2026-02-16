import React from "react";
import { View, StyleSheet, Pressable, ScrollView, Platform } from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import Animated, {
  SlideInRight,
  SlideOutLeft,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { GlassButton } from "@/components/GlassButton";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, AppColors } from "@/constants/theme";
import { STARTER_FOOD_IMAGES } from "@/lib/food-images";
import { STARTER_FOODS, STORAGE_LABELS, StarterFood, springConfig } from "./onboarding-data";

interface FoodsStepProps {
  theme: any;
  selectedFoodIds: Set<string>;
  foodSelectedCount: number;
  toggleFood: (id: string) => void;
  selectAllFoods: () => void;
  deselectAllFoods: () => void;
  onNext: () => void;
  onBack: () => void;
}

function FoodItemRow({
  food,
  isSelected,
  onToggle,
}: {
  food: StarterFood;
  isSelected: boolean;
  onToggle: () => void;
}) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);
  const storageInfo = STORAGE_LABELS[food.recommendedStorage];

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, springConfig);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, springConfig);
  };

  const handlePress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onToggle();
  };

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.foodItem,
          {
            backgroundColor: isSelected
              ? `${AppColors.primary}15`
              : theme.backgroundSecondary,
            borderColor: isSelected ? AppColors.primary : theme.border,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Toggle ${food.name}`}
      >
        <View style={styles.foodItemContent}>
          <View
            style={[
              styles.foodIcon,
              {
                backgroundColor: isSelected
                  ? AppColors.primary
                  : theme.backgroundTertiary,
                overflow: "hidden",
              },
            ]}
          >
            {STARTER_FOOD_IMAGES[food.id] ? (
              <Image
                source={STARTER_FOOD_IMAGES[food.id]}
                style={styles.foodImage}
                contentFit="cover"
                cachePolicy="memory-disk"
                accessibilityLabel={`Image of ${food.name}`}
              />
            ) : (
              <Feather
                name={food.icon}
                size={18}
                color={isSelected ? theme.buttonText : theme.textSecondary}
              />
            )}
          </View>
          <View style={styles.foodInfo}>
            <ThemedText style={styles.foodName}>{food.name}</ThemedText>
            <View style={styles.foodMeta}>
              <View
                style={[
                  styles.storageTag,
                  { backgroundColor: `${storageInfo.color}20` },
                ]}
              >
                <Feather
                  name={storageInfo.icon}
                  size={10}
                  color={storageInfo.color}
                />
                <ThemedText
                  style={[styles.storageTagText, { color: storageInfo.color }]}
                >
                  {storageInfo.label}
                </ThemedText>
              </View>
              <ThemedText
                style={[styles.quantityText, { color: theme.textSecondary }]}
              >
                {food.defaultQuantity} {food.unit}
              </ThemedText>
            </View>
          </View>
          <View
            style={[
              styles.checkbox,
              {
                backgroundColor: isSelected ? AppColors.primary : "transparent",
                borderColor: isSelected
                  ? AppColors.primary
                  : theme.textSecondary,
              },
            ]}
          >
            {isSelected ? (
              <Feather name="check" size={14} color={theme.buttonText} />
            ) : null}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export function FoodsStep({
  theme,
  selectedFoodIds,
  foodSelectedCount,
  toggleFood,
  selectAllFoods,
  deselectAllFoods,
  onNext,
  onBack,
}: FoodsStepProps) {
  const allFoodsSelected = foodSelectedCount === STARTER_FOODS.length;
  const groupedFoods = STARTER_FOODS.reduce(
    (acc, food) => {
      if (!acc[food.recommendedStorage]) {
        acc[food.recommendedStorage] = [];
      }
      acc[food.recommendedStorage].push(food);
      return acc;
    },
    {} as Record<string, StarterFood[]>,
  );

  const storageOrder: Array<"fridge" | "freezer" | "pantry" | "counter"> = [
    "fridge",
    "pantry",
    "counter",
    "freezer",
  ];

  return (
    <Animated.View
      entering={SlideInRight.duration(300)}
      exiting={SlideOutLeft.duration(200)}
      style={styles.stepContainer}
    >
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Feather name="shopping-bag" size={48} color={AppColors.primary} />
        </View>
        <ThemedText style={styles.title}>Stock Your Kitchen</ThemedText>
        <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
          Select common items you already have. We've organized them by where
          they're best stored.
        </ThemedText>
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={allFoodsSelected ? deselectAllFoods : selectAllFoods}
          style={styles.selectAllButton}
          accessibilityRole="button"
          accessibilityLabel={allFoodsSelected ? "Deselect all foods" : "Select all foods"}
        >
          <ThemedText
            style={[styles.selectAllText, { color: AppColors.primary }]}
          >
            {allFoodsSelected ? "Deselect All" : "Select All"}
          </ThemedText>
        </Pressable>
        <ThemedText
          style={[styles.selectedCount, { color: theme.textSecondary }]}
        >
          {foodSelectedCount} selected
        </ThemedText>
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {storageOrder.map((storageType) => {
          const foods = groupedFoods[storageType];
          if (!foods || foods.length === 0) return null;
          const storageInfo = STORAGE_LABELS[storageType];

          return (
            <View key={storageType} style={styles.storageSection}>
              <View style={styles.sectionHeader}>
                <View
                  style={[
                    styles.sectionIcon,
                    { backgroundColor: `${storageInfo.color}15` },
                  ]}
                >
                  <Feather
                    name={storageInfo.icon}
                    size={16}
                    color={storageInfo.color}
                  />
                </View>
                <ThemedText style={styles.sectionTitle}>
                  {storageInfo.label}
                </ThemedText>
              </View>
              {foods.map((food) => (
                <FoodItemRow
                  key={food.id}
                  food={food}
                  isSelected={selectedFoodIds.has(food.id)}
                  onToggle={() => toggleFood(food.id)}
                />
              ))}
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.fixedFooter}>
        <View style={styles.navigationButtons}>
          <GlassButton
            onPress={onBack}
            variant="secondary"
            style={styles.navButton}
          >
            Back
          </GlassButton>
          <GlassButton
            onPress={onNext}
            variant="primary"
            style={styles.navButton}
          >
            Continue
          </GlassButton>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  stepContainer: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  header: {
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${AppColors.primary}15`,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: Spacing.md,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  selectAllButton: {
    paddingVertical: Spacing.xs,
  },
  selectAllText: {
    fontSize: 14,
    fontWeight: "600",
  },
  selectedCount: {
    fontSize: 14,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: Spacing.md,
  },
  storageSection: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  sectionIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  foodItem: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.xs,
  },
  foodItemContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  foodIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  foodImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  foodInfo: {
    flex: 1,
  },
  foodName: {
    fontSize: 15,
    fontWeight: "500",
    marginBottom: 2,
  },
  foodMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  storageTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.pill,
  },
  storageTagText: {
    fontSize: 10,
    fontWeight: "500",
  },
  quantityText: {
    fontSize: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  fixedFooter: {
    flexShrink: 0,
    paddingTop: Spacing.sm,
  },
  navigationButtons: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  navButton: {
    flex: 1,
  },
});
