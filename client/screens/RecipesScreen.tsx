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

import React, { useState, useCallback, useEffect, useMemo } from "react";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import {
  View,
  StyleSheet,
  Pressable,
  RefreshControl,
  Modal,
  Platform,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  AccessibilityRole,
} from "react-native";
import * as Haptics from "expo-haptics";
import { FlashList } from "@shopify/flash-list";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeIn } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { GlassCard } from "@/components/GlassCard";
import { ExpoGlassHeader } from "@/components/ExpoGlassHeader";
import { MenuItemConfig } from "@/components/HeaderMenu";
import { RecipesSkeleton } from "@/components/recipes/RecipesSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { RecipeSettingsModal } from "@/components/RecipeSettingsModal";
import { UpgradePrompt } from "@/components/UpgradePrompt";
import { useTheme } from "@/hooks/useTheme";
import { useQuickRecipeGeneration } from "@/hooks/useQuickRecipeGeneration";
import {
  Spacing,
  BorderRadius,
  AppColors,
  GlassEffect,
} from "@/constants/theme";
import { storage, Recipe, FoodItem } from "@/lib/storage";
import { apiClient } from "@/lib/api-client";
import { exportRecipesToCSV, exportRecipesToPDF } from "@/lib/export";
import type { ApplianceItem, RecipesNavigation } from "@/lib/types";
import { useSearch } from "@/contexts/SearchContext";
import { logger } from "@/lib/logger";
import { useOnlineStatus } from "@/hooks/useSyncStatus";
import { useDeviceType } from "@/hooks/useDeviceType";
import { syncManager } from "@/lib/sync-manager";

export default function RecipesScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const navigation =
    useNavigation<RecipesNavigation>();
  const { isTablet, isLargeTablet, screenWidth, isLandscape } = useDeviceType();

  const isOnline = useOnlineStatus();
  const { getSearchQuery, collapseSearch } = useSearch();
  const searchQuery = getSearchQuery("recipes");

  useEffect(() => {
    const unsubscribe = navigation.addListener("blur", () => {
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
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [localSearchQuery, setLocalSearchQuery] = useState("");
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  const [selectedDietaryTags, setSelectedDietaryTags] = useState<string[]>([]);
  const [recipesStatusLabel, setRecipesStatusLabel] = useState("");

  const {
    generateQuickRecipe,
    isGenerating,
    progressStage,
    showUpgradePrompt,
    dismissUpgradePrompt,
    entitlements,
    checkLimit,
  } = useQuickRecipeGeneration();

  const { focusTargetRef: progressFocusRef, containerRef: progressContainerRef, onAccessibilityEscape: onProgressEscape } = useFocusTrap({
    visible: isGenerating,
    onDismiss: () => {},
  });
  const { containerRef: upgradeContainerRef, onAccessibilityEscape: onUpgradeEscape } = useFocusTrap({
    visible: showUpgradePrompt,
    onDismiss: dismissUpgradePrompt,
  });

  useEffect(() => {
    if (loading) {
      setRecipesStatusLabel("Loading recipes");
    } else {
      setRecipesStatusLabel(`${recipes.length} recipe${recipes.length !== 1 ? "s" : ""} in collection`);
    }
  }, [loading, recipes.length]);

  const menuItems: MenuItemConfig[] = useMemo(
    () => [
      {
        label: showFavoritesOnly ? "Show All" : "Favorites Only",
        icon: "heart",
        onPress: () => setShowFavoritesOnly((prev) => !prev),
        active: showFavoritesOnly,
      },
      {
        label: "Custom Recipe",
        icon: "sliders",
        onPress: () => setShowSettingsModal(true),
        disabled: !isOnline,
        sublabel: !isOnline ? "Available when online" : undefined,
      },
      {
        label: !isOnline ? "Quick Recipe" : (isGenerating ? "Generating..." : "Quick Recipe"),
        icon: "zap",
        onPress: generateQuickRecipe,
        disabled: isGenerating || !isOnline,
        sublabel: !isOnline ? "Available when online" : undefined,
      },
      {
        label: exporting ? "Exporting..." : "Export to CSV",
        icon: "file-text",
        onPress: async () => {
          if (recipes.length === 0 || loading) return;
          setExporting(true);
          try {
            await exportRecipesToCSV(recipes);
          } finally {
            setExporting(false);
          }
        },
        disabled: loading || recipes.length === 0 || exporting,
      },
      {
        label: exporting ? "Exporting..." : "Export to PDF",
        icon: "file",
        onPress: async () => {
          if (recipes.length === 0 || loading) return;
          setExporting(true);
          try {
            await exportRecipesToPDF(recipes);
          } finally {
            setExporting(false);
          }
        },
        disabled: loading || recipes.length === 0 || exporting,
      },
    ],
    [
      showFavoritesOnly,
      loading,
      recipes,
      exporting,
      isGenerating,
      generateQuickRecipe,
      isOnline,
    ],
  );

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
          const allAppliances = await apiClient.get<ApplianceItem[]>("/api/appliances");
          const cookwareNames = allAppliances
            .filter((a: ApplianceItem) => cookwareIds.includes(a.id))
            .map((a: ApplianceItem) => a.name.toLowerCase());
          setUserCookware(cookwareNames);
        } catch (err) {
          logger.error("Error loading cookware:", err);
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
    try { await syncManager.fullSync(); } catch { Alert.alert("Sync failed", "We'll try again shortly"); }
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

  const availableCuisines = useMemo(() => {
    const set = new Set<string>();
    recipes.forEach((r) => {
      if (r.cuisine) set.add(r.cuisine);
    });
    return Array.from(set).sort();
  }, [recipes]);

  const availableDietaryTags = useMemo(() => {
    const set = new Set<string>();
    recipes.forEach((r) => {
      r.dietaryTags?.forEach((t) => set.add(t));
    });
    return Array.from(set).sort();
  }, [recipes]);

  const filteredRecipes = useMemo(() => {
    const headerQ = searchQuery.toLowerCase();
    const localQ = localSearchQuery.trim().toLowerCase();

    return recipes.filter((recipe) => {
      if (headerQ) {
        const matchesHeader =
          recipe.title.toLowerCase().includes(headerQ) ||
          recipe.description.toLowerCase().includes(headerQ);
        if (!matchesHeader) return false;
      }

      if (localQ) {
        const matchesLocal =
          recipe.title.toLowerCase().includes(localQ) ||
          recipe.ingredients?.some((i) =>
            i.name.toLowerCase().includes(localQ),
          ) ||
          recipe.cuisine?.toLowerCase().includes(localQ);
        if (!matchesLocal) return false;
      }

      if (showFavoritesOnly && !recipe.isFavorite) return false;

      if (
        selectedCuisines.length > 0 &&
        (!recipe.cuisine || !selectedCuisines.includes(recipe.cuisine))
      )
        return false;

      if (selectedDietaryTags.length > 0) {
        const tags = recipe.dietaryTags || [];
        if (!selectedDietaryTags.some((t) => tags.includes(t))) return false;
      }

      return true;
    });
  }, [
    recipes,
    searchQuery,
    localSearchQuery,
    showFavoritesOnly,
    selectedCuisines,
    selectedDietaryTags,
  ]);

  const handleToggleFavorite = async (recipe: Recipe) => {
    Haptics.selectionAsync();
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
        data-testid={`card-recipe-${recipe.id}`}
        {...(Platform.OS === "web" ? { accessibilityRole: "listitem" as unknown as AccessibilityRole } : {})}
        accessibilityLabel={`${recipe.title}, ${getMatchPercentage(recipe)}% ingredient match`}
      >
        <GlassCard
          style={[styles.recipeCard, isTablet && selectedRecipeId === recipe.id ? { borderColor: AppColors.primary, borderWidth: 2 } : undefined]}
          onPress={() => {
            if (isTablet) {
              setSelectedRecipeId(recipe.id);
            } else {
              navigation.navigate("RecipeDetail", { recipeId: recipe.id });
            }
          }}
          accessibilityLabel={`${recipe.title}, ${matchPercentage}% ingredient match`}
          accessibilityHint="Opens recipe details"
        >
          {recipe.imageUri ? (
            <View
              style={styles.recipeImageContainer}
              data-testid={`container-recipe-image-${recipe.id}`}
            >
              <Image
                source={{ uri: recipe.imageUri }}
                style={styles.recipeImage}
                contentFit="cover"
                cachePolicy="memory-disk"
                accessibilityLabel={`Photo of ${recipe.title}`}
                data-testid={`img-recipe-${recipe.id}`}
              />
              {hasCookwareData && !hasCookware ? (
                <View style={styles.cookwareWarning} accessibilityRole="image" accessibilityLabel="Missing required cookware">
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
                <View style={styles.cookwareWarning} accessibilityRole="image" accessibilityLabel="Missing required cookware">
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
                  accessibilityRole="button"
                  accessibilityLabel={`${recipe.isFavorite ? 'Remove from favorites' : 'Add to favorites'}, ${recipe.title}`}
                  accessibilityState={{ selected: recipe.isFavorite }}
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
      return (
        <View accessibilityLiveRegion="polite" accessibilityLabel="Loading recipes">
          <RecipesSkeleton count={4} />
        </View>
      );
    }

    return (
      <View accessibilityLiveRegion="polite" accessibilityLabel="Recipes loaded, no recipes found">
        <EmptyState
          icon="book-open"
          title="No recipes yet"
          description="Generate your first AI recipe!"
          actionLabel={!isOnline ? "Available when online" : (isGenerating ? "Generating..." : "Generate Recipe")}
          onAction={generateQuickRecipe}
          actionDisabled={isGenerating || !isOnline}
        />
      </View>
    );
  };

  const selectedRecipe = useMemo(() => {
    if (!selectedRecipeId) return null;
    return recipes.find((r) => r.id === selectedRecipeId) || null;
  }, [selectedRecipeId, recipes]);

  const previewPanelWidth = isLandscape && isTablet ? Math.min(400, screenWidth * 0.4) : 340;

  const renderPreviewPanel = () => {
    if (!isTablet) return null;

    return (
      <View style={[styles.previewPanel, { width: previewPanelWidth, borderLeftColor: theme.glass.border }]}>
        {selectedRecipe ? (
          <ScrollView style={styles.previewScroll} contentContainerStyle={styles.previewScrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.previewHeader}>
              <ThemedText type="h4" style={{ flex: 1 }} numberOfLines={2}>
                {selectedRecipe.title}
              </ThemedText>
              <Pressable
                onPress={() => setSelectedRecipeId(null)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Close preview"
                style={styles.previewCloseButton}
              >
                <Feather name="x" size={20} color={theme.textSecondary} />
              </Pressable>
            </View>

            {selectedRecipe.imageUri ? (
              <View style={styles.previewImageContainer}>
                <Image
                  source={{ uri: selectedRecipe.imageUri }}
                  style={styles.previewImage}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  accessibilityLabel={`Photo of ${selectedRecipe.title}`}
                />
              </View>
            ) : null}

            <View style={[styles.previewMatchBadge, {
              backgroundColor: getMatchPercentage(selectedRecipe) >= 80
                ? AppColors.success
                : getMatchPercentage(selectedRecipe) >= 50
                  ? AppColors.warning
                  : AppColors.secondary,
            }]}>
              <ThemedText type="caption" style={styles.matchText}>
                {getMatchPercentage(selectedRecipe)}% ingredient match
              </ThemedText>
            </View>

            {selectedRecipe.description ? (
              <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>
                {selectedRecipe.description}
              </ThemedText>
            ) : null}

            {selectedRecipe.ingredients && selectedRecipe.ingredients.length > 0 ? (
              <View style={styles.previewIngredientsSection}>
                <ThemedText type="small" style={{ fontWeight: "600", marginBottom: Spacing.xs }}>
                  Ingredients
                </ThemedText>
                {selectedRecipe.ingredients.slice(0, 8).map((ing, idx) => (
                  <View key={idx} style={styles.previewIngredientRow}>
                    <Feather name="check" size={12} color={AppColors.primary} style={{ marginRight: Spacing.xs }} />
                    <ThemedText type="caption" numberOfLines={1} style={{ flex: 1 }}>
                      {ing.quantity ? `${ing.quantity} ` : ""}{ing.unit ? `${ing.unit} ` : ""}{ing.name}
                    </ThemedText>
                  </View>
                ))}
                {selectedRecipe.ingredients.length > 8 ? (
                  <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
                    +{selectedRecipe.ingredients.length - 8} more...
                  </ThemedText>
                ) : null}
              </View>
            ) : null}

            <View style={styles.previewActions}>
              <Pressable
                style={[styles.previewViewButton, { backgroundColor: AppColors.primary }]}
                onPress={() => navigation.navigate("RecipeDetail", { recipeId: selectedRecipe.id })}
                accessibilityRole="button"
                accessibilityLabel="View full recipe"
              >
                <Feather name="arrow-right" size={16} color="#FFFFFF" style={{ marginRight: Spacing.xs }} />
                <ThemedText type="small" style={{ color: "#FFFFFF", fontWeight: "600" }}>
                  View Full Recipe
                </ThemedText>
              </Pressable>

              <Pressable
                onPress={() => handleToggleFavorite(selectedRecipe)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={selectedRecipe.isFavorite ? "Remove from favorites" : "Add to favorites"}
                style={[styles.previewFavoriteButton, { borderColor: theme.glass.border }]}
              >
                <Feather
                  name="heart"
                  size={20}
                  color={selectedRecipe.isFavorite ? AppColors.error : theme.textSecondary}
                  style={{ opacity: selectedRecipe.isFavorite ? 1 : 0.5 }}
                />
              </Pressable>
            </View>
          </ScrollView>
        ) : (
          <View style={styles.previewPlaceholder}>
            <Feather name="book-open" size={48} color={theme.textSecondary} style={{ opacity: 0.3 }} />
            <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.md, textAlign: "center" }}>
              Select a recipe to preview
            </ThemedText>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ExpoGlassHeader
        title="Recipes"
        materialIcon="notebook-heart-outline"
        screenKey="recipes"
        searchPlaceholder="Search recipes..."
        menuItems={menuItems}
      />
      <View
        accessibilityLiveRegion="polite"
        accessibilityLabel={recipesStatusLabel}
        style={{ position: "absolute", width: 1, height: 1, overflow: "hidden" }}
      />
      <View style={isTablet ? styles.masterDetailRow : styles.masterDetailColumn}>
      <FlashList
        accessibilityRole="list"
        accessibilityLabel="Recipe collection"
        style={styles.list}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingTop: 56 + insets.top + Spacing.md,
            paddingBottom: tabBarHeight + 80,
          },
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        data={filteredRecipes}
        keyExtractor={(item) => item.id}
        key={isLargeTablet ? "large-tablet" : isTablet ? "tablet" : "phone"}
        numColumns={isTablet ? 2 : 2}

        renderItem={renderRecipeCard}
        ListHeaderComponent={
          <View style={styles.searchSection}>
            <View
              style={[
                styles.searchInputContainer,
                {
                  backgroundColor: theme.glass.background,
                  borderColor: theme.glass.border,
                },
              ]}
            >
              <Feather
                name="search"
                size={18}
                color={theme.textSecondary}
              />
              <TextInput
                testID="input-recipe-search"
                style={[styles.searchInput, { color: theme.text }]}
                placeholder="Search by name, ingredient, cuisine..."
                placeholderTextColor={theme.textSecondary}
                value={localSearchQuery}
                onChangeText={setLocalSearchQuery}
                returnKeyType="search"
                autoCorrect={false}
                accessibilityLabel="Search recipes"
              />
              {localSearchQuery.length > 0 && (
                <Pressable
                  testID="button-clear-recipe-search"
                  onPress={() => setLocalSearchQuery("")}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Clear search"
                >
                  <Feather
                    name="x"
                    size={18}
                    color={theme.textSecondary}
                  />
                </Pressable>
              )}
            </View>

            {(availableCuisines.length > 0 ||
              availableDietaryTags.length > 0) && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipScrollContent}
              >
                {availableCuisines.map((cuisine) => {
                  const isSelected = selectedCuisines.includes(cuisine);
                  return (
                    <Pressable
                      key={`cuisine-${cuisine}`}
                      testID={`filter-cuisine-${cuisine}`}
                      accessibilityRole="button"
                      accessibilityLabel={`Filter by ${cuisine} cuisine, ${isSelected ? "selected" : "not selected"}`}
                      accessibilityState={{ selected: isSelected }}
                      style={[
                        styles.filterChip,
                        {
                          backgroundColor: isSelected
                            ? AppColors.primary
                            : theme.glass.background,
                          borderColor: isSelected
                            ? AppColors.primary
                            : theme.glass.border,
                          borderWidth: 1,
                        },
                      ]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setSelectedCuisines((prev) =>
                          isSelected
                            ? prev.filter((c) => c !== cuisine)
                            : [...prev, cuisine],
                        );
                      }}
                    >
                      <Feather
                        name="globe"
                        size={12}
                        color={isSelected ? "#FFFFFF" : theme.textSecondary}
                        style={{ marginRight: 4 }}
                      />
                      <ThemedText
                        type="caption"
                        style={{
                          color: isSelected ? "#FFFFFF" : theme.textSecondary,
                          fontWeight: isSelected ? "600" : "400",
                        }}
                      >
                        {cuisine}
                      </ThemedText>
                    </Pressable>
                  );
                })}

                {availableDietaryTags.map((tag) => {
                  const isSelected = selectedDietaryTags.includes(tag);
                  return (
                    <Pressable
                      key={`diet-${tag}`}
                      testID={`filter-dietary-${tag}`}
                      accessibilityRole="button"
                      accessibilityLabel={`Filter by ${tag}, ${isSelected ? "selected" : "not selected"}`}
                      accessibilityState={{ selected: isSelected }}
                      style={[
                        styles.filterChip,
                        {
                          backgroundColor: isSelected
                            ? AppColors.accent
                            : theme.glass.background,
                          borderColor: isSelected
                            ? AppColors.accent
                            : theme.glass.border,
                          borderWidth: 1,
                        },
                      ]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setSelectedDietaryTags((prev) =>
                          isSelected
                            ? prev.filter((t) => t !== tag)
                            : [...prev, tag],
                        );
                      }}
                    >
                      <Feather
                        name="check-circle"
                        size={12}
                        color={isSelected ? "#FFFFFF" : theme.textSecondary}
                        style={{ marginRight: 4 }}
                      />
                      <ThemedText
                        type="caption"
                        style={{
                          color: isSelected ? "#FFFFFF" : theme.textSecondary,
                          fontWeight: isSelected ? "600" : "400",
                        }}
                      >
                        {tag}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
          </View>
        }
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={AppColors.primary}
          />
        }
      />
      {renderPreviewPanel()}
      </View>
      <RecipeSettingsModal
        visible={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        onGenerate={(settings) =>
          navigation.navigate("GenerateRecipe", {
            customSettings: settings,
          })
        }
      />

      <Modal visible={isGenerating} transparent animationType="fade" accessibilityViewIsModal={true}>
        <View style={styles.progressModalOverlay}>
          <View
            ref={progressContainerRef}
            style={[
              styles.progressModalContent,
              { backgroundColor: theme.glass.background },
            ]}
            onAccessibilityEscape={onProgressEscape}
          >
            <View
              ref={progressFocusRef}
              accessibilityLiveRegion="polite"
              accessibilityLabel={
                progressStage === "loading"
                  ? "Loading your kitchen"
                  : progressStage === "recipe"
                    ? "Creating your recipe"
                    : progressStage === "image"
                      ? "Generating image"
                      : "Almost done"
              }
            >
              <ActivityIndicator size="large" />
              <ThemedText style={{ marginTop: 12, color: theme.textSecondary }}>
                {progressStage === "loading"
                  ? "Loading your kitchen..."
                  : progressStage === "recipe"
                    ? "Creating your recipe..."
                    : progressStage === "image"
                      ? "Generating image..."
                      : "Almost done..."}
              </ThemedText>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showUpgradePrompt}
        transparent
        animationType="fade"
        onRequestClose={dismissUpgradePrompt}
        accessibilityViewIsModal={true}
      >
        <View ref={upgradeContainerRef} style={styles.upgradeModalOverlay} onAccessibilityEscape={onUpgradeEscape}>
          <UpgradePrompt
            type="limit"
            limitName="AI recipes"
            remaining={(() => {
              const r = checkLimit("aiRecipes").remaining;
              return typeof r === "number" ? r : undefined;
            })()}
            max={
              typeof entitlements.maxAiRecipes === "number"
                ? entitlements.maxAiRecipes
                : 3
            }
            onUpgrade={() => {
              dismissUpgradePrompt();
              navigation.navigate("Subscription");
            }}
            onDismiss={dismissUpgradePrompt}
          />
        </View>
      </Modal>
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
  chipScrollContent: {
    gap: Spacing.sm,
    paddingTop: Spacing.xs,
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
    flex: 1,
    marginBottom: Spacing.md,
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
  progressModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  progressModalContent: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    gap: Spacing.md,
  },
  progressText: {
    textAlign: "center",
  },
  upgradeModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  masterDetailRow: {
    flex: 1,
    flexDirection: "row",
  },
  masterDetailColumn: {
    flex: 1,
  },
  previewPanel: {
    borderLeftWidth: 1,
    height: "100%",
  },
  previewScroll: {
    flex: 1,
  },
  previewScrollContent: {
    padding: Spacing.md,
    paddingTop: Spacing.lg,
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  previewCloseButton: {
    padding: Spacing.xs,
  },
  previewImageContainer: {
    height: 200,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    marginBottom: Spacing.md,
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  previewMatchBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  previewIngredientsSection: {
    marginTop: Spacing.md,
  },
  previewIngredientRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.xs,
  },
  previewActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  previewViewButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  previewFavoriteButton: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  previewPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
