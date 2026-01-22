import React, { useState, useCallback } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  TextInput,
  Pressable,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";

import { ThemedText } from "@/components/ThemedText";
import { GlassCard } from "@/components/GlassCard";
import { GlassButton } from "@/components/GlassButton";
import { ExpoGlassHeader } from "@/components/ExpoGlassHeader";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, AppColors } from "@/constants/theme";
import { storage, Recipe, MealPlan } from "@/lib/storage";
import { getApiUrl } from "@/lib/query-client";
import { MealPlanStackParamList } from "@/navigation/MealPlanStackNavigator";

type SelectRecipeRouteProp = RouteProp<MealPlanStackParamList, "SelectRecipe">;

export default function SelectRecipeScreen() {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<MealPlanStackParamList>>();
  const route = useRoute<SelectRecipeRouteProp>();
  const { date, mealType } = route.params;

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const loadRecipes = useCallback(async () => {
    const loadedRecipes = await storage.getRecipes();
    setRecipes(loadedRecipes);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    loadRecipes();
  }, [loadRecipes]);

  const handleSelectRecipe = async (recipe: Recipe) => {
    const mealPlans = await storage.getMealPlans();
    const existingPlanIndex = mealPlans.findIndex((p) => p.date === date);

    if (existingPlanIndex !== -1) {
      const existingPlan = mealPlans[existingPlanIndex];
      const updatedPlan: MealPlan = {
        ...existingPlan,
        meals: {
          ...existingPlan.meals,
          [mealType]: recipe.id,
        },
      };
      mealPlans[existingPlanIndex] = updatedPlan;
      await storage.setMealPlans(mealPlans);
    } else {
      const newPlan: MealPlan = {
        id: `mp_${Date.now()}`,
        date,
        meals: {
          [mealType]: recipe.id,
        },
      };
      await storage.addMealPlan(newPlan);
    }

    navigation.goBack();
  };

  const filteredRecipes = recipes.filter(
    (recipe) =>
      recipe.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      recipe.description.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const renderRecipeItem = ({ item }: { item: Recipe }) => {
    const imageUrl = item.imageUri
      ? item.imageUri.startsWith("http") ||
        item.imageUri.startsWith("file://") ||
        item.imageUri.startsWith("data:")
        ? item.imageUri
        : `${getApiUrl()}${item.imageUri}`
      : null;

    return (
      <Pressable
        style={styles.recipeItem}
        onPress={() => handleSelectRecipe(item)}
      >
        <GlassCard style={styles.recipeCard}>
          <View style={styles.recipeContent}>
            {imageUrl ? (
              <Image
                source={{ uri: imageUrl }}
                style={styles.recipeImage}
                contentFit="cover"
              />
            ) : (
              <View
                style={[
                  styles.recipeImage,
                  styles.placeholderImage,
                  { backgroundColor: theme.glass.background },
                ]}
              >
                <Feather
                  name="book-open"
                  size={24}
                  color={theme.textSecondary}
                />
              </View>
            )}
            <View style={styles.recipeInfo}>
              <ThemedText type="body" numberOfLines={2}>
                {item.title}
              </ThemedText>
              <View style={styles.recipeMeta}>
                <Feather name="clock" size={14} color={theme.textSecondary} />
                <ThemedText type="caption">
                  {item.prepTime + item.cookTime} min
                </ThemedText>
                {item.isFavorite ? (
                  <Feather
                    name="heart"
                    size={14}
                    color={AppColors.error}
                    style={{ marginLeft: Spacing.sm }}
                  />
                ) : null}
              </View>
            </View>
            <Feather name="plus-circle" size={24} color={AppColors.primary} />
          </View>
        </GlassCard>
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ExpoGlassHeader
        title="Select Recipe"
        screenKey="selectRecipe"
        showSearch={false}
        showBackButton={true}
      />
      <View
        style={[
          styles.contentContainer,
          { paddingTop: 56 + insets.top + Spacing.lg },
        ]}
      >
        <View style={styles.searchContainer}>
          {Platform.OS === "ios" ? (
            <BlurView
              intensity={40}
              tint={isDark ? "dark" : "light"}
              style={[
                styles.searchBar,
                { borderColor: theme.glass.border, borderWidth: 1 },
              ]}
            >
              <Feather name="search" size={18} color={theme.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: theme.text }]}
                placeholder="Search recipes..."
                placeholderTextColor={theme.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </BlurView>
          ) : (
            <View
              style={[
                styles.searchBar,
                {
                  backgroundColor: theme.glass.background,
                  borderColor: theme.glass.border,
                  borderWidth: 1,
                },
              ]}
            >
              <Feather name="search" size={18} color={theme.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: theme.text }]}
                placeholder="Search recipes..."
                placeholderTextColor={theme.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          )}
        </View>

        {filteredRecipes.length === 0 && !loading ? (
          <View style={styles.emptyState}>
            <Feather name="book-open" size={48} color={theme.textSecondary} />
            <ThemedText type="h4" style={styles.emptyTitle}>
              No Recipes Found
            </ThemedText>
            <ThemedText type="body" style={styles.emptyText}>
              {recipes.length === 0
                ? "Generate some recipes first to add them to your meal plan."
                : "Try a different search term."}
            </ThemedText>
            {recipes.length === 0 ? (
              <GlassButton
                variant="primary"
                onPress={() => navigation.goBack()}
                style={{ marginTop: Spacing.lg }}
              >
                Go Back
              </GlassButton>
            ) : null}
          </View>
        ) : (
          <FlatList
            data={filteredRecipes}
            renderItem={renderRecipeItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: insets.bottom + Spacing.xl },
            ]}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
    overflow: "hidden",
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: Spacing.xs,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  recipeItem: {
    marginBottom: Spacing.sm,
  },
  recipeCard: {
    padding: Spacing.md,
  },
  recipeContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  recipeImage: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.md,
  },
  placeholderImage: {
    alignItems: "center",
    justifyContent: "center",
  },
  recipeInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  recipeMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle: {
    marginTop: Spacing.md,
    textAlign: "center",
  },
  emptyText: {
    marginTop: Spacing.sm,
    textAlign: "center",
    opacity: 0.7,
  },
});
