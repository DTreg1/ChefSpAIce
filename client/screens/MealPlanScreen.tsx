import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  RefreshControl,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { format, addDays, startOfWeek, isSameDay } from "date-fns";
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from "react-native-draggable-flatlist";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";
import { syncManager } from "@/lib/sync-manager";

import { ThemedText } from "@/components/ThemedText";
import { GlassCard } from "@/components/GlassCard";
import { GlassHeader } from "@/components/GlassHeader";
import { MenuItemConfig } from "@/components/HeaderMenu";
import { UpgradePrompt } from "@/components/UpgradePrompt";
import { EmptyState } from "@/components/EmptyState";
import { MealPlanWeekNav } from "@/components/meal-plan/MealPlanWeekNav";
import { MealPlanDaySelector } from "@/components/meal-plan/MealPlanDaySelector";
import { MealPlanSlotCard } from "@/components/meal-plan/MealPlanSlotCard";
import { MealPlanActionSheet } from "@/components/meal-plan/MealPlanActionSheet";
import { MealPlanSkeleton } from "@/components/meal-plan/MealPlanSkeleton";
import { useTheme } from "@/hooks/useTheme";
import { useSubscription } from "@/hooks/useSubscription";
import { useDeviceType } from "@/hooks/useDeviceType";
import { Spacing, AppColors, GlassEffect } from "@/constants/theme"; // TODO: migrate GlassEffect in StyleSheet to style.glassEffect
import { storage, MealPlan, Recipe, UserPreferences } from "@/lib/storage";
import type { MealPlanNavigation, RootNavigation } from "@/lib/types";
import { getPresetById, DEFAULT_PRESET_ID } from "@/constants/meal-plan";

interface DraggableSlotItem {
  slotId: string;
  slotName: string;
  slotIcon: "sunrise" | "sun" | "moon" | "coffee" | "sunset";
  recipe: Recipe | undefined;
}

export default function MealPlanScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const navigation = useNavigation<MealPlanNavigation>();
  const { checkFeature } = useSubscription();
  const { isTablet, screenWidth, isLandscape } = useDeviceType();

  const menuItems: MenuItemConfig[] = [];

  const [currentWeekStart, setCurrentWeekStart] = useState(
    startOfWeek(new Date()),
  );
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [actionSheet, setActionSheet] = useState<{
    visible: boolean;
    recipe: Recipe | null;
    slotId: string;
    date: Date;
  }>({ visible: false, recipe: null, slotId: "", date: new Date() });
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const canUseWeeklyPrepping = checkFeature("canUseWeeklyMealPrepping");

  const currentPreset = getPresetById(
    preferences?.mealPlanPresetId || DEFAULT_PRESET_ID,
  );
  const mealSlots = currentPreset.slots;

  const loadData = useCallback(async () => {
    try {
      const [plans, loadedRecipes, prefs] = await Promise.all([
        storage.getMealPlans(),
        storage.getRecipes(),
        storage.getPreferences(),
      ]);
      setMealPlans(plans);
      setRecipes(loadedRecipes);
      setPreferences(prefs);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    try { await syncManager.fullSync(); } catch { Alert.alert("Sync failed", "We'll try again shortly"); }
    await loadData();
    setRefreshing(false);
  };

  const navigatePrevWeek = () => {
    if (!canUseWeeklyPrepping) {
      setShowUpgradePrompt(true);
      return;
    }
    setCurrentWeekStart(addDays(currentWeekStart, -7));
  };

  const navigateNextWeek = () => {
    if (!canUseWeeklyPrepping) {
      setShowUpgradePrompt(true);
      return;
    }
    setCurrentWeekStart(addDays(currentWeekStart, 7));
  };

  const getWeekDays = () => {
    return Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  };

  const getMealForDay = (date: Date, slotId: string): Recipe | undefined => {
    const dateStr = format(date, "yyyy-MM-dd");
    const plan = mealPlans.find((p) => p.date === dateStr);
    if (!plan) return undefined;

    const recipeId = plan.meals[slotId];
    if (!recipeId) return undefined;

    return recipes.find((r) => r.id === recipeId);
  };

  const handleRemoveMeal = async (date: Date, slotId: string) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const planIndex = mealPlans.findIndex((p) => p.date === dateStr);
    if (planIndex === -1) return;

    const updatedPlans = [...mealPlans];
    const updatedPlan = { ...updatedPlans[planIndex] };
    updatedPlan.meals = { ...updatedPlan.meals };
    delete updatedPlan.meals[slotId];
    updatedPlans[planIndex] = updatedPlan;
    await storage.setMealPlans(updatedPlans);
    setMealPlans(updatedPlans);
    setActionSheet({
      visible: false,
      recipe: null,
      slotId: "",
      date: new Date(),
    });
  };

  const handleMealPress = (date: Date, slotId: string, recipe: Recipe) => {
    setActionSheet({ visible: true, recipe, slotId, date });
  };

  const handleChangeRecipe = () => {
    setActionSheet({
      visible: false,
      recipe: null,
      slotId: "",
      date: new Date(),
    });
    navigation.navigate("SelectRecipe", {
      date: format(actionSheet.date, "yyyy-MM-dd"),
      mealType: actionSheet.slotId,
    });
  };

  const handleRemoveMealByDateStr = useCallback(async (dateStr: string, slotId: string) => {
    const date = new Date(dateStr + "T00:00:00");
    await handleRemoveMeal(date, slotId);
  }, [mealPlans]);

  const handleSwapRecipeByDateStr = useCallback((dateStr: string, slotId: string) => {
    navigation.navigate("SelectRecipe", {
      date: dateStr,
      mealType: slotId,
    });
  }, [navigation]);

  const closeActionSheet = () => {
    setActionSheet({
      visible: false,
      recipe: null,
      slotId: "",
      date: new Date(),
    });
  };

  const handleAddMeal = (date: string, slotId: string) => {
    Haptics.selectionAsync();
    navigation.navigate("SelectRecipe", {
      date,
      mealType: slotId as "breakfast" | "lunch" | "dinner",
    });
  };

  const handleDragEnd = async ({
    data: reorderedItems,
  }: {
    data: DraggableSlotItem[];
  }) => {
    const dateStr = format(selectedDay, "yyyy-MM-dd");
    const planIndex = mealPlans.findIndex((p) => p.date === dateStr);
    const updatedPlans = [...mealPlans];

    const existingMeals =
      planIndex !== -1 ? { ...updatedPlans[planIndex].meals } : {};

    const draggedSlotIds = new Set(mealSlots.map((s) => s.id));

    const newMeals: Record<string, string | undefined> = {};
    Object.entries(existingMeals).forEach(([slotId, recipeId]) => {
      if (!draggedSlotIds.has(slotId) && recipeId) {
        newMeals[slotId] = recipeId;
      }
    });

    reorderedItems.forEach((item, index) => {
      if (index < mealSlots.length) {
        const targetSlot = mealSlots[index];
        if (item.recipe) {
          newMeals[targetSlot.id] = item.recipe.id;
        }
      }
    });

    if (planIndex === -1) {
      if (Object.keys(newMeals).length > 0) {
        updatedPlans.push({
          id: `plan-${dateStr}`,
          date: dateStr,
          meals: newMeals,
        });
      }
    } else {
      updatedPlans[planIndex] = {
        ...updatedPlans[planIndex],
        meals: newMeals,
      };
    }

    await storage.setMealPlans(updatedPlans);
    setMealPlans(updatedPlans);
  };

  const draggableSlotItems: DraggableSlotItem[] = useMemo(
    () =>
      mealSlots.map((slot) => ({
        slotId: slot.id,
        slotName: slot.name,
        slotIcon: slot.icon,
        recipe: getMealForDay(selectedDay, slot.id),
      })),
    [mealSlots, selectedDay, mealPlans, recipes],
  );

  const renderDraggableSlot = ({
    item,
    drag,
    isActive,
  }: RenderItemParams<DraggableSlotItem>) => {
    return (
      <ScaleDecorator>
        <View
          style={[
            styles.draggableSlotWrapper,
            isActive && styles.draggableSlotActive,
          ]}
        >
          <View style={styles.slotRow}>
            <Pressable
              onLongPress={drag}
              delayLongPress={150}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              style={[
                styles.dragHandle,
                {
                  backgroundColor: theme.glass.background,
                  borderColor: theme.glass.border,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Drag to reorder ${item.slotName}`}
              accessibilityHint="Long press and drag to move this meal to a different slot"
              testID={`drag-handle-${item.slotId}`}
            >
              <Feather
                name="menu"
                size={16}
                color={theme.textSecondary}
              />
            </Pressable>
            <View style={styles.slotCardContent}>
              <MealPlanSlotCard
                slot={{
                  id: item.slotId,
                  name: item.slotName,
                  icon: item.slotIcon,
                }}
                recipe={item.recipe}
                selectedDay={selectedDay}
                onMealPress={handleMealPress}
                onAddMeal={handleAddMeal}
                onRemoveMeal={handleRemoveMealByDateStr}
                onSwapRecipe={handleSwapRecipeByDateStr}
              />
            </View>
          </View>
        </View>
      </ScaleDecorator>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <GlassHeader
        title="Meals"
        screenKey="mealplan"
        showSearch={false}
        menuItems={menuItems}
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: 56 + insets.top + Spacing.lg,
            paddingBottom: tabBarHeight + Spacing.xl,
          },
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={AppColors.primary}
          />
        }
      >
        {loading ? (
          <MealPlanSkeleton />
        ) : (
        <>
        <MealPlanWeekNav
          currentWeekStart={currentWeekStart}
          canUseWeeklyPrepping={canUseWeeklyPrepping}
          onPrevWeek={navigatePrevWeek}
          onNextWeek={navigateNextWeek}
        />

        {isTablet ? (
          <>
            <View style={styles.hintRow}>
              <Feather name="info" size={16} color={theme.textSecondary} />
              <ThemedText
                type="caption"
                style={{ color: theme.textSecondary, flex: 1 }}
              >
                Browse recipes and tap "Add to Meal Plan" to schedule your meals
              </ThemedText>
            </View>

            {mealPlans.length === 0 && recipes.length === 0 ? (
              <EmptyState
                icon="calendar"
                title="No meal plan yet"
                description="Create your first weekly plan!"
                actionLabel="Create Plan"
                onAction={() => navigation.navigate("SelectRecipe", {
                  date: format(selectedDay, "yyyy-MM-dd"),
                  mealType: "dinner" as const,
                })}
              />
            ) : (
              <View style={[styles.tabletDaysContainer, { gap: screenWidth > 1024 ? Spacing.sm : Spacing.xs }]}>
                {getWeekDays().map((day) => {
                  const isToday = isSameDay(day, new Date());
                  const dateStr = format(day, "yyyy-MM-dd");
                  return (
                    <GlassCard
                      key={dateStr}
                      style={[
                        styles.tabletDayColumn,
                        isToday && { borderColor: AppColors.primary, borderWidth: 2 },
                      ]}
                    >
                      <View style={[styles.tabletDayHeader, { borderBottomColor: theme.glass.border }]}>
                        <ThemedText type={isLandscape ? "h4" : "small"} style={styles.tabletDayTitle}>
                          {format(day, isLandscape ? "EEE" : "EEEEE")}
                        </ThemedText>
                        <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                          {format(day, isLandscape ? "MMM d" : "d")}
                        </ThemedText>
                      </View>
                      <View style={styles.tabletDaySlots}>
                        {mealSlots.map((slot) => (
                          <MealPlanSlotCard
                            key={slot.id}
                            slot={slot}
                            recipe={getMealForDay(day, slot.id)}
                            selectedDay={day}
                            onMealPress={handleMealPress}
                            onAddMeal={handleAddMeal}
                            onRemoveMeal={handleRemoveMealByDateStr}
                            onSwapRecipe={handleSwapRecipeByDateStr}
                          />
                        ))}
                      </View>
                    </GlassCard>
                  );
                })}
              </View>
            )}
          </>
        ) : (
          <>
            <MealPlanDaySelector
              weekDays={getWeekDays()}
              selectedDay={selectedDay}
              mealPlans={mealPlans}
              onSelectDay={(day) => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedDay(day);
              }}
            />

            <View style={styles.hintRow}>
              <Feather name="info" size={16} color={theme.textSecondary} />
              <ThemedText
                type="caption"
                style={{ color: theme.textSecondary, flex: 1 }}
              >
                Browse recipes and tap "Add to Meal Plan" to schedule your meals
              </ThemedText>
            </View>

            {mealPlans.length === 0 && recipes.length === 0 ? (
              <EmptyState
                icon="calendar"
                title="No meal plan yet"
                description="Create your first weekly plan!"
                actionLabel="Create Plan"
                onAction={() => navigation.navigate("SelectRecipe", {
                  date: format(selectedDay, "yyyy-MM-dd"),
                  mealType: "dinner" as const,
                })}
              />
            ) : (
              <GlassCard style={styles.selectedDayCard}>
                <View style={styles.selectedDayHeader}>
                  <ThemedText type="h3" style={styles.selectedDayTitle}>
                    {format(selectedDay, "EEEE, MMMM d")}
                  </ThemedText>
                  {draggableSlotItems.some((s) => s.recipe) && (
                    <View style={styles.dragHintRow}>
                      <Feather name="move" size={12} color={theme.textSecondary} />
                      <ThemedText
                        type="caption"
                        style={{ color: theme.textSecondary }}
                      >
                        Hold & drag to reorder
                      </ThemedText>
                    </View>
                  )}
                </View>

                <GestureHandlerRootView>
                  <DraggableFlatList
                    data={draggableSlotItems}
                    keyExtractor={(item) => item.slotId}
                    renderItem={renderDraggableSlot}
                    onDragBegin={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    }}
                    onDragEnd={handleDragEnd}
                    containerStyle={styles.draggableListContainer}
                    scrollEnabled={false}
                    accessibilityRole="list"
                    accessibilityLabel="Meal slots for selected day, drag to reorder"
                  />
                </GestureHandlerRootView>
              </GlassCard>
            )}
          </>
        )}

        <GlassCard style={styles.statsCard}>
          <View style={styles.statsHeader}>
            <ThemedText type="h4">This Week</ThemedText>
            <Pressable
              onPress={() => navigation.navigate("ShoppingList")}
              accessibilityRole="link"
              accessibilityLabel="Go to shopping list"
            >
              <View style={styles.shoppingListLink}>
                <Feather
                  name="shopping-cart"
                  size={18}
                  color={AppColors.primary}
                />
                <ThemedText type="small" style={{ color: AppColors.primary }}>
                  Shopping List
                </ThemedText>
              </View>
            </Pressable>
          </View>

          <View style={styles.statsGrid}>
            <View
              style={styles.statItem}
              accessibilityRole="text"
              accessibilityLabel={`${mealPlans.reduce(
                (total, plan) =>
                  total + Object.values(plan.meals).filter(Boolean).length,
                0,
              )} meals planned`}
            >
              <ThemedText type="h2" style={{ color: AppColors.primary }}>
                {mealPlans.reduce(
                  (total, plan) =>
                    total + Object.values(plan.meals).filter(Boolean).length,
                  0,
                )}
              </ThemedText>
              <ThemedText type="caption">Meals Planned</ThemedText>
            </View>
            <View
              style={styles.statItem}
              accessibilityRole="text"
              accessibilityLabel={`${recipes.filter((r) => r.isFavorite).length} favorites`}
            >
              <ThemedText type="h2" style={{ color: AppColors.secondary }}>
                {recipes.filter((r) => r.isFavorite).length}
              </ThemedText>
              <ThemedText type="caption">Favorites</ThemedText>
            </View>
            <View
              style={styles.statItem}
              accessibilityRole="text"
              accessibilityLabel={`${recipes.length} recipes`}
            >
              <ThemedText type="h2" style={{ color: AppColors.success }}>
                {recipes.length}
              </ThemedText>
              <ThemedText type="caption">Recipes</ThemedText>
            </View>
          </View>
        </GlassCard>
        </>
        )}
      </ScrollView>

      <MealPlanActionSheet
        visible={actionSheet.visible}
        recipe={actionSheet.recipe}
        onChangeRecipe={handleChangeRecipe}
        onRemoveMeal={() => handleRemoveMeal(actionSheet.date, actionSheet.slotId)}
        onClose={closeActionSheet}
      />

      {showUpgradePrompt && (
        <UpgradePrompt
          type="feature"
          featureName="Weekly Meal Prepping"
          onUpgrade={() => {
            setShowUpgradePrompt(false);
            const rootNav = navigation.getParent()?.getParent()?.getParent() as RootNavigation | undefined;
            if (rootNav) {
              rootNav.navigate("Main", {
                screen: "Tabs",
                params: {
                  screen: "ProfileTab",
                  params: { screen: "Subscription" },
                },
              });
            }
          }}
          onDismiss={() => setShowUpgradePrompt(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.lg,
  },
  selectedDayCard: {
    gap: Spacing.md,
  },
  selectedDayHeader: {
    gap: Spacing.xs,
  },
  selectedDayTitle: {
    marginBottom: 0,
  },
  dragHintRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  draggableListContainer: {
    gap: Spacing.sm,
  },
  draggableSlotWrapper: {
    marginBottom: Spacing.xs,
  },
  draggableSlotActive: {
    opacity: 0.9,
    transform: [{ scale: 1.02 }],
  },
  slotRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  dragHandle: {
    width: 32,
    height: 32,
    minHeight: 44,
    borderRadius: GlassEffect.borderRadius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  slotCardContent: {
    flex: 1,
  },
  statsCard: {
    gap: Spacing.md,
  },
  statsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  shoppingListLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
    gap: Spacing.xs,
  },
  hintRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  tabletDaysContainer: {
    flexDirection: "row",
    flexWrap: "nowrap",
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
  tabletDayColumn: {
    flex: 1,
    gap: Spacing.sm,
    minWidth: 0,
  },
  tabletDayHeader: {
    alignItems: "center",
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    gap: Spacing.xs / 2,
  },
  tabletDayTitle: {
    fontWeight: "700",
  },
  tabletDaySlots: {
    gap: Spacing.md,
  },
});
