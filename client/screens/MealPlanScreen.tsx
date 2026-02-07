import React, { useState, useCallback } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  Platform,
  Modal,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import {
  GlassView,
  isLiquidGlassAvailable,
} from "@/components/GlassViewWithContext";
import { format, addDays, startOfWeek, isSameDay } from "date-fns";

import { ThemedText } from "@/components/ThemedText";
import { GlassCard } from "@/components/GlassCard";
import { ExpoGlassHeader } from "@/components/ExpoGlassHeader";
import { MenuItemConfig } from "@/components/HeaderMenu";
import { UpgradePrompt } from "@/components/UpgradePrompt";
import { LoadingState } from "@/components/LoadingState";
import { EmptyState } from "@/components/EmptyState";
import { useTheme } from "@/hooks/useTheme";
import { useSubscription } from "@/hooks/useSubscription";
import {
  Spacing,
  BorderRadius,
  AppColors,
  GlassEffect,
} from "@/constants/theme";
import { storage, MealPlan, Recipe, UserPreferences } from "@/lib/storage";
import { MealPlanStackParamList } from "@/navigation/MealPlanStackNavigator";
import { getPresetById, DEFAULT_PRESET_ID } from "@/constants/meal-plan";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function MealPlanScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme, isDark } = useTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<MealPlanStackParamList>>();
  const { checkFeature } = useSubscription();

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

  const closeActionSheet = () => {
    setActionSheet({
      visible: false,
      recipe: null,
      slotId: "",
      date: new Date(),
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ExpoGlassHeader
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
          <LoadingState variant="detail" />
        ) : (
        <>
        <View style={styles.weekNavigation}>
          <Pressable
            onPress={navigatePrevWeek}
            style={[
              styles.navButton,
              !canUseWeeklyPrepping && styles.navButtonLocked,
            ]}
            accessibilityRole="button"
            accessibilityLabel={canUseWeeklyPrepping ? "Go to previous week" : "Previous week, requires Pro upgrade"}
            accessibilityState={{ disabled: !canUseWeeklyPrepping }}
          >
            {!canUseWeeklyPrepping && (
              <View style={styles.navLockBadge}>
                <Feather name="lock" size={8} color="#FFFFFF" />
              </View>
            )}
            <Feather
              name="chevron-left"
              size={24}
              color={!canUseWeeklyPrepping ? theme.textSecondary : theme.text}
            />
          </Pressable>
          <View style={styles.weekTitleContainer}>
            <ThemedText type="h4">
              {format(currentWeekStart, "MMM d")} -{" "}
              {format(addDays(currentWeekStart, 6), "MMM d, yyyy")}
            </ThemedText>
            {!canUseWeeklyPrepping && (
              <View style={styles.weekProBadge}>
                <ThemedText type="small" style={styles.weekProBadgeText}>
                  PRO
                </ThemedText>
              </View>
            )}
          </View>
          <Pressable
            onPress={navigateNextWeek}
            style={[
              styles.navButton,
              !canUseWeeklyPrepping && styles.navButtonLocked,
            ]}
            accessibilityRole="button"
            accessibilityLabel={canUseWeeklyPrepping ? "Go to next week" : "Next week, requires Pro upgrade"}
            accessibilityState={{ disabled: !canUseWeeklyPrepping }}
          >
            {!canUseWeeklyPrepping && (
              <View style={styles.navLockBadge}>
                <Feather name="lock" size={8} color="#FFFFFF" />
              </View>
            )}
            <Feather
              name="chevron-right"
              size={24}
              color={!canUseWeeklyPrepping ? theme.textSecondary : theme.text}
            />
          </Pressable>
        </View>

        <View style={styles.weekGrid}>
          {getWeekDays().map((day, index) => {
            const isSelected = isSameDay(day, selectedDay);
            const isToday = isSameDay(day, new Date());
            const hasMeals = mealPlans.some(
              (p) =>
                p.date === format(day, "yyyy-MM-dd") &&
                Object.values(p.meals).some(Boolean),
            );

            const renderDayCardContent = () => (
              <>
                <ThemedText
                  type="caption"
                  style={{
                    color: isSelected ? "#FFFFFF" : theme.textSecondary,
                  }}
                >
                  {DAYS[day.getDay()]}
                </ThemedText>
                <ThemedText
                  type="h4"
                  style={{ color: isSelected ? "#FFFFFF" : theme.text }}
                >
                  {format(day, "d")}
                </ThemedText>
                {hasMeals ? (
                  <View
                    style={[
                      styles.mealIndicator,
                      {
                        backgroundColor: isSelected
                          ? "#FFFFFF"
                          : AppColors.success,
                      },
                    ]}
                  />
                ) : null}
              </>
            );

            if (isSelected) {
              return (
                <Pressable
                  key={index}
                  style={[
                    styles.dayCard,
                    {
                      backgroundColor: AppColors.primary,
                      borderColor: isToday ? AppColors.primary : "transparent",
                      borderWidth: isToday && !isSelected ? 2 : 0,
                    },
                  ]}
                  onPress={() => setSelectedDay(day)}
                  accessibilityRole="button"
                  accessibilityLabel={`${DAYS[day.getDay()]} ${format(day, 'd')}, ${isToday ? 'today, ' : ''}${isSelected ? 'selected, ' : ''}${hasMeals ? 'has meals planned' : 'no meals planned'}`}
                  accessibilityState={{ selected: isSelected }}
                >
                  {renderDayCardContent()}
                </Pressable>
              );
            }

            if (Platform.OS === "ios") {
              const useLiquidGlass = isLiquidGlassAvailable();
              return (
                <Pressable
                  key={index}
                  onPress={() => setSelectedDay(day)}
                  style={[styles.dayCard, styles.dayCardGlass]}
                  accessibilityRole="button"
                  accessibilityLabel={`${DAYS[day.getDay()]} ${format(day, 'd')}, ${isToday ? 'today, ' : ''}${isSelected ? 'selected, ' : ''}${hasMeals ? 'has meals planned' : 'no meals planned'}`}
                  accessibilityState={{ selected: isSelected }}
                >
                  {useLiquidGlass ? (
                    <GlassView
                      glassEffectStyle="regular"
                      style={[
                        StyleSheet.absoluteFill,
                        styles.dayCardBlur,
                        {
                          borderColor: isToday
                            ? AppColors.primary
                            : "transparent",
                          borderWidth: isToday ? 2 : 0,
                        },
                      ]}
                    />
                  ) : (
                    <BlurView
                      intensity={40}
                      tint={isDark ? "dark" : "light"}
                      style={[
                        StyleSheet.absoluteFill,
                        styles.dayCardBlur,
                        {
                          borderColor: isToday
                            ? AppColors.primary
                            : theme.glass.border,
                          borderWidth: isToday ? 2 : 1,
                        },
                      ]}
                    />
                  )}
                  {renderDayCardContent()}
                </Pressable>
              );
            }

            return (
              <Pressable
                key={index}
                style={[
                  styles.dayCard,
                  {
                    backgroundColor: theme.glass.background,
                    borderColor: isToday
                      ? AppColors.primary
                      : theme.glass.border,
                    borderWidth: isToday ? 2 : 1,
                  },
                ]}
                onPress={() => setSelectedDay(day)}
                accessibilityRole="button"
                accessibilityLabel={`${DAYS[day.getDay()]} ${format(day, 'd')}, ${isToday ? 'today, ' : ''}${isSelected ? 'selected, ' : ''}${hasMeals ? 'has meals planned' : 'no meals planned'}`}
                accessibilityState={{ selected: isSelected }}
              >
                {renderDayCardContent()}
              </Pressable>
            );
          })}
        </View>

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
            onAction={() => navigation.navigate("SelectRecipe" as any, {
              date: format(selectedDay, "yyyy-MM-dd"),
              mealType: "dinner" as const,
            })}
          />
        ) : (
        <GlassCard style={styles.selectedDayCard}>
          <ThemedText type="h3" style={styles.selectedDayTitle}>
            {format(selectedDay, "EEEE, MMMM d")}
          </ThemedText>

          <View accessibilityRole="list" accessibilityLabel="Meal slots for selected day">
          {mealSlots.map((slot) => {
            const recipe = getMealForDay(selectedDay, slot.id);
            return (
              <View key={slot.id} style={styles.mealSlot} {...(Platform.OS === "web" ? { accessibilityRole: "listitem" as any } : {})} accessibilityLabel={`${slot.name}${recipe ? `, ${recipe.title}` : ', empty'}`}>
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
                      },
                    ]}
                    onPress={() =>
                      handleMealPress(selectedDay, slot.id, recipe)
                    }
                    accessibilityRole="button"
                    accessibilityLabel={`${recipe.title} for ${slot.name}, ${recipe.prepTime + recipe.cookTime} minutes`}
                    accessibilityHint="Opens meal options"
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
                      navigation.navigate("SelectRecipe", {
                        date: format(selectedDay, "yyyy-MM-dd"),
                        mealType: slot.id as "breakfast" | "lunch" | "dinner",
                      });
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
          })}
          </View>
        </GlassCard>
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

      <Modal
        visible={actionSheet.visible}
        transparent
        animationType="fade"
        onRequestClose={closeActionSheet}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={closeActionSheet}
          accessibilityRole="button"
          accessibilityLabel="Close meal options"
        >
          <View
            style={[
              styles.actionSheet,
              { backgroundColor: theme.backgroundDefault },
            ]}
          >
            <ThemedText type="h4" style={styles.actionSheetTitle}>
              {actionSheet.recipe?.title || "Meal Options"}
            </ThemedText>

            <Pressable
              style={[styles.actionButton, { borderColor: theme.border }]}
              onPress={handleChangeRecipe}
              accessibilityRole="button"
              accessibilityLabel="Change recipe for this meal"
            >
              <Feather name="refresh-cw" size={20} color={AppColors.primary} />
              <ThemedText type="body" style={{ color: AppColors.primary }}>
                Change Recipe
              </ThemedText>
            </Pressable>

            <Pressable
              style={[styles.actionButton, { borderColor: theme.border }]}
              onPress={() =>
                handleRemoveMeal(actionSheet.date, actionSheet.slotId)
              }
              accessibilityRole="button"
              accessibilityLabel="Remove this meal from your plan"
            >
              <Feather name="trash-2" size={20} color={AppColors.error} />
              <ThemedText type="body" style={{ color: AppColors.error }}>
                Remove from Plan
              </ThemedText>
            </Pressable>

            <Pressable
              style={[
                styles.actionButton,
                styles.cancelButton,
                { backgroundColor: theme.backgroundSecondary },
              ]}
              onPress={closeActionSheet}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
            >
              <ThemedText type="body">Cancel</ThemedText>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {showUpgradePrompt && (
        <UpgradePrompt
          type="feature"
          featureName="Weekly Meal Prepping"
          onUpgrade={() => {
            setShowUpgradePrompt(false);
            // Use getParent 3x to reach root: Stack -> Tab -> Drawer -> Root
            const rootNav = navigation.getParent()?.getParent()?.getParent();
            if (rootNav) {
              rootNav.navigate("Main" as any, {
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
  weekNavigation: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  navButton: {
    padding: Spacing.sm,
    position: "relative",
  },
  navButtonLocked: {
    opacity: 0.6,
  },
  navLockBadge: {
    position: "absolute",
    top: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: AppColors.warning,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  weekTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  weekProBadge: {
    backgroundColor: AppColors.warning,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  weekProBadgeText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 10,
    letterSpacing: 0.5,
  },
  weekGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dayCard: {
    width: 44,
    height: 72,
    borderRadius: GlassEffect.borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
  },
  dayCardGlass: {
    backgroundColor: "transparent",
  },
  dayCardBlur: {
    borderRadius: GlassEffect.borderRadius.md,
  },
  mealIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  selectedDayCard: {
    gap: Spacing.md,
  },
  selectedDayTitle: {
    marginBottom: Spacing.xs,
  },
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
    borderRadius: GlassEffect.borderRadius.md,
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
  },
  hintRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  actionSheet: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  actionSheetTitle: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  cancelButton: {
    marginTop: Spacing.sm,
    justifyContent: "center",
    borderWidth: 0,
  },
});
