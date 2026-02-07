import React, { useState, useCallback } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { format, addDays, startOfWeek } from "date-fns";

import { ThemedText } from "@/components/ThemedText";
import { GlassCard } from "@/components/GlassCard";
import { ExpoGlassHeader } from "@/components/ExpoGlassHeader";
import { MenuItemConfig } from "@/components/HeaderMenu";
import { UpgradePrompt } from "@/components/UpgradePrompt";
import { LoadingState } from "@/components/LoadingState";
import { EmptyState } from "@/components/EmptyState";
import { MealPlanWeekNav } from "@/components/meal-plan/MealPlanWeekNav";
import { MealPlanDaySelector } from "@/components/meal-plan/MealPlanDaySelector";
import { MealPlanSlotCard } from "@/components/meal-plan/MealPlanSlotCard";
import { MealPlanActionSheet } from "@/components/meal-plan/MealPlanActionSheet";
import { useTheme } from "@/hooks/useTheme";
import { useSubscription } from "@/hooks/useSubscription";
import { Spacing, AppColors } from "@/constants/theme";
import { storage, MealPlan, Recipe, UserPreferences } from "@/lib/storage";
import { MealPlanStackParamList } from "@/navigation/MealPlanStackNavigator";
import { getPresetById, DEFAULT_PRESET_ID } from "@/constants/meal-plan";

export default function MealPlanScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
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

  const handleAddMeal = (date: string, slotId: string) => {
    navigation.navigate("SelectRecipe", {
      date,
      mealType: slotId as "breakfast" | "lunch" | "dinner",
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
        <MealPlanWeekNav
          currentWeekStart={currentWeekStart}
          canUseWeeklyPrepping={canUseWeeklyPrepping}
          onPrevWeek={navigatePrevWeek}
          onNextWeek={navigateNextWeek}
        />

        <MealPlanDaySelector
          weekDays={getWeekDays()}
          selectedDay={selectedDay}
          mealPlans={mealPlans}
          onSelectDay={setSelectedDay}
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
              <MealPlanSlotCard
                key={slot.id}
                slot={slot}
                recipe={recipe}
                selectedDay={selectedDay}
                onMealPress={handleMealPress}
                onAddMeal={handleAddMeal}
              />
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
  selectedDayCard: {
    gap: Spacing.md,
  },
  selectedDayTitle: {
    marginBottom: Spacing.xs,
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
});
