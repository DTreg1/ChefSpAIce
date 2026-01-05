/**
 * =============================================================================
 * RECIPES SCREEN
 * =============================================================================
 * 
 * The recipe browsing and management screen for ChefSpAIce.
 * Users can view their saved recipes, search, filter, and navigate to details.
 * 
 * KEY FEATURES:
 * - View saved recipes in a 2-column grid layout
 * - Search recipes by title or description
 * - Filter by favorites and available cookware
 * - See ingredient match percentage based on current inventory
 * - Quick access to AI chef chat for recipe suggestions
 * - Export recipes to CSV or PDF format
 * - Generate new recipes via AI
 * 
 * UI COMPONENTS:
 * - Blurred search header with filter chips
 * - Grid of recipe cards with images
 * - Match percentage badges (green/yellow/gray)
 * - Cookware compatibility indicators
 * - Favorite heart icons
 * - Empty state with generate button
 * 
 * DATA FLOW:
 * - Loads recipes and inventory from local storage
 * - Calculates ingredient match on the fly
 * - Checks cookware compatibility from user settings
 * 
 * @module screens/RecipesScreen
 */

import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  Pressable,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Alert,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeIn } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { GlassCard } from "@/components/GlassCard";
import { RecipeGridSkeleton } from "@/components/Skeleton";
import { RecipeSettingsModal } from "@/components/RecipeSettingsModal";
import { useTheme } from "@/hooks/useTheme";
import {
  Spacing,
  BorderRadius,
  AppColors,
  Shadows,
  GlassEffect,
} from "@/constants/theme";
import { storage, Recipe, FoodItem } from "@/lib/storage";
import { exportRecipesToCSV, exportRecipesToPDF } from "@/lib/export";
import { getApiUrl } from "@/lib/query-client";
import { RecipesStackParamList } from "@/navigation/RecipesStackNavigator";
import { useSearch } from "@/contexts/SearchContext";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - Spacing.lg * 3) / 2;

export default function RecipesScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme, isDark } = useTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<RecipesStackParamList>>();

  const { getSearchQuery, collapseSearch } = useSearch();
  const searchQuery = getSearchQuery("recipes");

  useEffect(() => {
    const unsubscribe = navigation.addListener('blur', () => {
      collapseSearch("recipes");
    });
    return unsubscribe;
  }, [navigation, collapseSearch]);

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [inventory, setInventory] = useState<FoodItem[]>([]);
  const [userCookware, setUserCookware] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const handleExport = useCallback(() => {
    if (recipes.length === 0) {
      Alert.alert("No Data", "There are no recipes to export.");
      return;
    }
    Alert.alert(
      "Export Recipes",
      "Choose export format:",
      [
        {
          text: "CSV (Spreadsheet)",
          onPress: async () => {
            setExporting(true);
            try {
              await exportRecipesToCSV(recipes);
            } catch (error) {
              Alert.alert("Export Failed", "Unable to export recipes. Please try again.");
            } finally {
              setExporting(false);
            }
          },
        },
        {
          text: "PDF (Document)",
          onPress: async () => {
            setExporting(true);
            try {
              await exportRecipesToPDF(recipes);
            } catch (error) {
              Alert.alert("Export Failed", "Unable to export recipes. Please try again.");
            } finally {
              setExporting(false);
            }
          },
        },
        { text: "Cancel", style: "cancel" },
      ],
    );
  }, [recipes]);

  const loadData = useCallback(async (showSkeleton = false) => {
    if (showSkeleton) setLoading(true);
    try {
      const [loadedRecipes, loadedInventory, cookwareIds] = await Promise.all([
        storage.getRecipes(),
        storage.getInventory(),
        storage.getCookware(),
      ]);
      setRecipes(loadedRecipes);
      setInventory(loadedInventory);

      if (cookwareIds.length > 0) {
        try {
          const baseUrl = getApiUrl();
          const url = new URL("/api/appliances", baseUrl);
          const response = await fetch(url, { credentials: "include" });
          if (response.ok) {
            const allAppliances = await response.json();
            const cookwareNames = allAppliances
              .filter((a: any) => cookwareIds.includes(a.id))
              .map((a: any) => a.name.toLowerCase());
            setUserCookware(cookwareNames);
          }
        } catch (err) {
          console.error("Error loading cookware:", err);
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData(recipes.length === 0);
    }, [loadData]),
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getMatchPercentage = (recipe: Recipe): number => {
    if (recipe.ingredients.length === 0) return 0;
    const inventoryNames = inventory.map((i) => i.name.toLowerCase());
    const matchedCount = recipe.ingredients.filter((ing) =>
      inventoryNames.some(
        (name) =>
          name.includes(ing.name.toLowerCase()) ||
          ing.name.toLowerCase().includes(name),
      ),
    ).length;
    return Math.round((matchedCount / recipe.ingredients.length) * 100);
  };

  const canMakeWithCookware = (recipe: Recipe): boolean => {
    if (!recipe.requiredCookware || recipe.requiredCookware.length === 0) {
      return true;
    }
    if (userCookware.length === 0) {
      return true;
    }
    return recipe.requiredCookware.every((eq) =>
      userCookware.includes(eq.toLowerCase()),
    );
  };

  const filteredRecipes = recipes.filter((recipe) => {
    const matchesSearch =
      recipe.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      recipe.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFavorite = showFavoritesOnly ? recipe.isFavorite : true;
    return matchesSearch && matchesFavorite;
  });

  const handleToggleFavorite = async (recipe: Recipe) => {
    await storage.toggleRecipeFavorite(recipe.id);
    loadData();
  };

  const renderRecipeCard = ({
    item: recipe,
    index,
  }: {
    item: Recipe;
    index: number;
  }) => {
    const matchPercentage = getMatchPercentage(recipe);
    const hasCookware = canMakeWithCookware(recipe);
    const hasCookwareData =
      recipe.requiredCookware && recipe.requiredCookware.length > 0;

    return (
      <Animated.View
        entering={FadeIn.delay(index * 50)}
        style={styles.cardWrapper}
      >
        <GlassCard
          style={styles.recipeCard}
          onPress={() =>
            navigation.navigate("RecipeDetail", { recipeId: recipe.id })
          }
        >
          {recipe.imageUri ? (
            <View style={styles.recipeImageContainer}>
              <Image
                source={{ uri: recipe.imageUri }}
                style={styles.recipeImage}
                contentFit="cover"
                cachePolicy="memory-disk"
              />
              {hasCookwareData && !hasCookware ? (
                <View style={styles.cookwareWarning}>
                  <Feather
                    name="alert-circle"
                    size={14}
                    color={AppColors.warning}
                  />
                </View>
              ) : null}
            </View>
          ) : (
            <View
              style={[
                styles.recipePlaceholder,
                {
                  backgroundColor: theme.glass.background,
                  borderWidth: 1,
                  borderColor: theme.glass.borderSubtle,
                },
              ]}
            >
              <Feather name="book-open" size={32} color={theme.textSecondary} />
              {hasCookwareData && !hasCookware ? (
                <View style={styles.cookwareWarning}>
                  <Feather
                    name="alert-circle"
                    size={14}
                    color={AppColors.warning}
                  />
                </View>
              ) : null}
            </View>
          )}
          <View style={styles.recipeContent}>
            <ThemedText
              type="small"
              numberOfLines={2}
              style={styles.recipeTitle}
            >
              {recipe.title}
            </ThemedText>
            <View style={styles.recipeFooter}>
              <View
                style={[
                  styles.matchBadge,
                  {
                    backgroundColor:
                      matchPercentage >= 80
                        ? AppColors.success
                        : matchPercentage >= 50
                          ? AppColors.warning
                          : AppColors.secondary,
                  },
                ]}
              >
                <ThemedText type="caption" style={styles.matchText}>
                  {matchPercentage}% match
                </ThemedText>
              </View>
              <View style={styles.cardIcons}>
                {hasCookwareData ? (
                  <Feather
                    name="tool"
                    size={14}
                    color={hasCookware ? AppColors.success : AppColors.warning}
                    style={{ marginRight: Spacing.xs }}
                  />
                ) : null}
                <Pressable
                  onPress={() => handleToggleFavorite(recipe)}
                  hitSlop={8}
                >
                  <Feather
                    name={recipe.isFavorite ? "heart" : "heart"}
                    size={18}
                    color={
                      recipe.isFavorite ? AppColors.error : theme.textSecondary
                    }
                    style={{ opacity: recipe.isFavorite ? 1 : 0.5 }}
                  />
                </Pressable>
              </View>
            </View>
          </View>
        </GlassCard>
      </Animated.View>
    );
  };

  const renderEmptyState = () => {
    if (loading) {
      return <RecipeGridSkeleton count={4} />;
    }
    
    return (
      <View style={styles.emptyState}>
        <View
          style={[
            styles.emptyIconContainer,
            {
              backgroundColor: theme.glass.background,
              borderColor: theme.glass.border,
            },
          ]}
        >
          <Feather name="book-open" size={48} color={theme.textSecondary} />
        </View>
        <ThemedText type="h3" style={styles.emptyTitle}>
          No recipes yet
        </ThemedText>
        <ThemedText type="body" style={styles.emptySubtitle}>
          Generate your first recipe based on what's in your kitchen
        </ThemedText>
        <Pressable
          style={[
            styles.generateButton,
            { backgroundColor: AppColors.primary },
          ]}
          onPress={() => navigation.navigate("GenerateRecipe")}
        >
          <Feather name="zap" size={18} color="#FFFFFF" />
          <ThemedText type="button" style={styles.generateButtonText}>
            Generate Recipe
          </ThemedText>
        </Pressable>
      </View>
    );
  };

  const renderMenuButton = () => (
    <View style={styles.menuContainer}>
      <TouchableOpacity
        style={[
          styles.menuButton,
          {
            backgroundColor: theme.glass.background,
            borderColor: theme.glass.border,
          },
        ]}
        onPress={() => setMenuOpen(!menuOpen)}
        testID="button-recipes-menu"
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Recipe options menu"
      >
        <Feather name="more-vertical" size={20} color={theme.text} />
      </TouchableOpacity>

      {menuOpen && (
        <>
          <Pressable
            style={styles.menuOverlay}
            onPress={() => setMenuOpen(false)}
          />
          <View
            style={[
              styles.menuDropdown,
              {
                backgroundColor: theme.backgroundSecondary,
                borderColor: theme.glass.border,
              },
            ]}
          >
            <Pressable
              style={styles.menuItem}
              onPress={() => {
                setShowFavoritesOnly(!showFavoritesOnly);
                setMenuOpen(false);
              }}
              testID="button-toggle-favorites"
            >
              <View style={styles.menuItemRow}>
                <Feather
                  name="heart"
                  size={18}
                  color={showFavoritesOnly ? AppColors.primary : theme.text}
                />
                <ThemedText type="small" style={{ flex: 1 }}>
                  Favorites Only
                </ThemedText>
                {showFavoritesOnly && (
                  <Feather name="check" size={16} color={AppColors.primary} />
                )}
              </View>
            </Pressable>

            <Pressable
              style={styles.menuItem}
              onPress={() => {
                setShowSettingsModal(true);
                setMenuOpen(false);
              }}
              testID="button-customize-recipes"
            >
              <View style={styles.menuItemRow}>
                <Feather name="sliders" size={18} color={theme.text} />
                <ThemedText type="small" style={{ flex: 1 }}>
                  Customize
                </ThemedText>
              </View>
            </Pressable>

            <Pressable
              style={styles.menuItem}
              onPress={() => {
                handleExport();
                setMenuOpen(false);
              }}
              disabled={exporting}
              testID="button-export-recipes"
            >
              <View style={styles.menuItemRow}>
                <Feather name="download" size={18} color={theme.text} />
                <ThemedText type="small" style={{ flex: 1 }}>
                  {exporting ? "Exporting..." : "Export"}
                </ThemedText>
              </View>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      {renderMenuButton()}
      <FlatList
        style={styles.list}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingTop: Spacing.md,
            paddingBottom: tabBarHeight + 80,
          },
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        data={filteredRecipes}
        keyExtractor={(item) => item.id}
        numColumns={2}
        renderItem={renderRecipeCard}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={AppColors.primary}
          />
        }
      />
      <RecipeSettingsModal
        visible={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchSection: {
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  searchContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 10,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    height: 44,
    borderRadius: GlassEffect.borderRadius.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: Spacing.sm,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: GlassEffect.borderRadius.pill,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
  },
  cardWrapper: {
    width: CARD_WIDTH,
    marginRight: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  recipeCard: {
    padding: 0,
    overflow: "hidden",
  },
  recipePlaceholder: {
    height: 100,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  recipeImageContainer: {
    height: 100,
    position: "relative",
    overflow: "hidden",
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
  },
  recipeImage: {
    width: "100%",
    height: "100%",
  },
  cookwareWarning: {
    position: "absolute",
    top: Spacing.xs,
    right: Spacing.xs,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: BorderRadius.full,
    padding: 2,
  },
  cardIcons: {
    flexDirection: "row",
    alignItems: "center",
  },
  recipeContent: {
    padding: Spacing.md,
  },
  recipeTitle: {
    fontWeight: "600",
    marginBottom: Spacing.sm,
  },
  recipeFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  matchBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  matchText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["4xl"],
    paddingHorizontal: Spacing.xl,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  emptyTitle: {
    marginTop: Spacing.lg,
    textAlign: "center",
  },
  emptySubtitle: {
    marginTop: Spacing.sm,
    textAlign: "center",
  },
  generateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.xl,
    gap: Spacing.sm,
  },
  generateButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  menuContainer: {
    position: "absolute",
    top: Spacing.sm,
    right: Spacing.lg,
    zIndex: 1000,
    elevation: 1000,
  },
  menuButton: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  menuOverlay: {
    position: "absolute",
    top: -100,
    left: -300,
    right: -50,
    bottom: -500,
    zIndex: 99,
  },
  menuDropdown: {
    position: "absolute",
    top: 44,
    right: 0,
    minWidth: 180,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 1001,
    zIndex: 1001,
    overflow: "hidden",
  },
  menuItem: {
    padding: Spacing.md,
  },
  menuItemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
});
