import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  Alert,
  Share,
  LayoutChangeEvent,
  Linking,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useNavigation,
  useRoute,
  RouteProp,
  useFocusEffect,
} from "@react-navigation/native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { HeaderButton } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { GlassCard } from "@/components/GlassCard";
import { GlassButton } from "@/components/GlassButton";
import { RecipeVoiceControls } from "@/components/RecipeVoiceControls";
import { TermHighlighter, CookingTerm } from "@/components/TermHighlighter";
import { TermTooltip } from "@/components/TermTooltip";
import { IngredientSwapModal } from "@/components/IngredientSwapModal";
import { RecipeDetailSkeleton } from "@/components/Skeleton";
import { NutritionBadge } from "@/components/NutritionBadge";
import { useTheme } from "@/hooks/useTheme";
import { useRecipeVoiceNavigation } from "@/hooks/useRecipeVoiceNavigation";
import { Spacing, BorderRadius, AppColors } from "@/constants/theme";
import {
  storage,
  Recipe,
  RecipeIngredient,
  FoodItem,
  ShoppingListItem,
  generateId,
  IngredientAvailability,
} from "@/lib/storage";

import { hasSwapsAvailable, IngredientSwap } from "@/lib/ingredient-swaps";
import { exportSingleRecipeToPDF } from "@/lib/export";

import { getApiUrl } from "@/lib/query-client";
import { RecipesStackParamList } from "@/navigation/RecipesStackNavigator";

// Helper to get color and icon for availability status
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

export default function RecipeDetailScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RecipesStackParamList, "RecipeDetail">>();

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [inventory, setInventory] = useState<FoodItem[]>([]);
  const [userCookware, setUserCookware] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showVoiceControls, setShowVoiceControls] = useState(false);
  const [termHighlightingEnabled, setTermHighlightingEnabled] = useState(true);
  const [selectedTerm, setSelectedTerm] = useState<CookingTerm | null>(null);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [selectedServings, setSelectedServings] = useState<number>(1);
  const [swapModalVisible, setSwapModalVisible] = useState(false);
  const [selectedIngredient, setSelectedIngredient] =
    useState<RecipeIngredient | null>(null);
  const [exporting, setExporting] = useState(false);
  const [sendingToInstacart, setSendingToInstacart] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const stepPositions = useRef<Record<number, number>>({});
  const instructionSectionY = useRef(0);

  const scaleQuantity = useCallback(
    (
      quantity: number | string,
      baseServings: number,
      targetServings: number,
    ): string => {
      const numQuantity =
        typeof quantity === "string" ? parseFloat(quantity) : quantity;
      if (isNaN(numQuantity)) return String(quantity);
      const scaled = (numQuantity * targetServings) / baseServings;
      if (scaled === Math.floor(scaled)) return String(scaled);
      if (scaled < 1) {
        const fractions: [number, string][] = [
          [0.25, "1/4"],
          [0.33, "1/3"],
          [0.5, "1/2"],
          [0.66, "2/3"],
          [0.75, "3/4"],
        ];
        for (const [val, str] of fractions) {
          if (Math.abs(scaled - val) < 0.1) return str;
        }
      }
      return scaled.toFixed(1).replace(/\.0$/, "");
    },
    [],
  );

  const loadData = useCallback(async () => {
    const [recipes, items, prefs, cookwareIds] = await Promise.all([
      storage.getRecipes(),
      storage.getInventory(),
      storage.getPreferences(),
      storage.getCookware(),
    ]);
    // Use initialRecipe if passed via navigation (has image data for freshly generated recipes)
    // Otherwise fall back to storage lookup
    const initialRecipe = route.params.initialRecipe;
    const found =
      initialRecipe || recipes.find((r) => r.id === route.params.recipeId);
    setRecipe(found || null);
    if (found) {
      setSelectedServings(found.servings || 1);
    }
    setInventory(items);
    setTermHighlightingEnabled(prefs.termHighlightingEnabled ?? true);

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

    setLoading(false);
  }, [route.params.recipeId]);

  const handleTermPress = useCallback((term: CookingTerm) => {
    setSelectedTerm(term);
    setTooltipVisible(true);
  }, []);

  const handleCloseTooltip = useCallback(() => {
    setTooltipVisible(false);
    setSelectedTerm(null);
  }, []);

  const handleSwapPress = useCallback((ingredient: RecipeIngredient) => {
    setSelectedIngredient(ingredient);
    setSwapModalVisible(true);
  }, []);

  const handleSwapSelect = useCallback(
    (original: RecipeIngredient, swap: IngredientSwap) => {
      if (!recipe) return;
      const updatedIngredients = recipe.ingredients.map((ing) => {
        if (ing.name === original.name) {
          const numQuantity =
            typeof ing.quantity === "number"
              ? ing.quantity
              : parseFloat(String(ing.quantity));
          const isValidNumber = !isNaN(numQuantity) && isFinite(numQuantity);
          const newQuantity = isValidNumber
            ? Math.round(numQuantity * swap.ratio * 10) / 10
            : ing.quantity;
          return {
            ...ing,
            name: swap.alternative,
            quantity: newQuantity,
          };
        }
        return ing;
      });
      const updatedRecipe = { ...recipe, ingredients: updatedIngredients };
      setRecipe(updatedRecipe);
      storage.updateRecipe(updatedRecipe);
    },
    [recipe],
  );

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  // Poll for image updates if recipe exists but has no image (image generating in background)
  useEffect(() => {
    if (!recipe || recipe.imageUri || !recipe.isAIGenerated) {
      return;
    }

    // Check for image updates every 3 seconds for up to 60 seconds
    let attempts = 0;
    const maxAttempts = 20;

    const pollForImage = async () => {
      const recipes = await storage.getRecipes();
      const updated = recipes.find((r) => r.id === recipe.id);
      if (updated?.imageUri) {
        setRecipe(updated);
        return true;
      }
      return false;
    };

    const intervalId = setInterval(async () => {
      attempts++;
      const found = await pollForImage();
      if (found || attempts >= maxAttempts) {
        clearInterval(intervalId);
      }
    }, 3000);

    return () => clearInterval(intervalId);
  }, [recipe?.id, recipe?.imageUri, recipe?.isAIGenerated]);

  const handleStepChange = useCallback((step: number) => {
    if (scrollViewRef.current) {
      const stepY = stepPositions.current[step];
      if (stepY !== undefined) {
        const yOffset = instructionSectionY.current + stepY;
        scrollViewRef.current.scrollTo({ y: yOffset - 100, animated: true });
      }
    }
  }, []);

  const voiceNav = useRecipeVoiceNavigation({
    recipe,
    onStepChange: handleStepChange,
    onCommandExecuted: (cmd) => {
      console.log("Voice command executed:", cmd);
    },
  });

  useEffect(() => {
    if (recipe) {
      navigation.setOptions({
        headerRight: () => (
          <View style={styles.headerRight}>
            <HeaderButton onPress={() => setShowVoiceControls((prev) => !prev)}>
              <Feather
                name="mic"
                size={22}
                color={showVoiceControls ? AppColors.primary : theme.text}
                style={{ opacity: showVoiceControls ? 1 : 0.6 }}
              />
            </HeaderButton>
            <HeaderButton onPress={handleToggleFavorite}>
              <Feather
                name="heart"
                size={22}
                color={recipe.isFavorite ? AppColors.error : theme.text}
                style={{ opacity: recipe.isFavorite ? 1 : 0.6 }}
              />
            </HeaderButton>
            <HeaderButton onPress={handleShare}>
              <Feather
                name="share-2"
                size={22}
                color={theme.text}
                style={{ opacity: 0.6 }}
              />
            </HeaderButton>
            <HeaderButton onPress={handleExportPDF} disabled={exporting}>
              <Feather
                name="download"
                size={22}
                color={exporting ? theme.textSecondary : theme.text}
                style={{ opacity: exporting ? 0.3 : 0.6 }}
              />
            </HeaderButton>
          </View>
        ),
      });
    }
  }, [navigation, recipe, theme, showVoiceControls, exporting]);

  const handleToggleFavorite = async () => {
    if (!recipe) return;
    await storage.toggleRecipeFavorite(recipe.id);
    loadData();
  };

  const isIngredientAvailable = (ingredientName: string): boolean => {
    const inventoryNames = inventory.map((i) => i.name.toLowerCase());
    return inventoryNames.some(
      (name) =>
        name.includes(ingredientName.toLowerCase()) ||
        ingredientName.toLowerCase().includes(name),
    );
  };

  const handleAddToMealPlan = () => {
    Alert.alert(
      "Add to Meal Plan",
      "This recipe will be added to your meal plan. You can organize it in the Meal Plan tab.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Add",
          onPress: async () => {
            Alert.alert("Added", "Recipe added to your meal plan!");
          },
        },
      ],
    );
  };

  const handleAddMissingToShoppingList = async () => {
    if (!recipe) return;

    const missingIngredients = recipe.ingredients.filter(
      (ing) => !isIngredientAvailable(ing.name),
    );

    if (missingIngredients.length === 0) {
      Alert.alert("All Set!", "You have all the ingredients for this recipe.");
      return;
    }

    const existingList = await storage.getShoppingList();
    const baseServings = recipe.servings || 1;
    const newItems: ShoppingListItem[] = missingIngredients.map((ing) => {
      const numQuantity =
        typeof ing.quantity === "string"
          ? parseFloat(ing.quantity)
          : ing.quantity;
      const scaledNum = isNaN(numQuantity)
        ? 1
        : (numQuantity * selectedServings) / baseServings;
      return {
        id: generateId(),
        name: ing.name,
        quantity: Math.round(scaledNum * 100) / 100,
        unit: ing.unit,
        isChecked: false,
        recipeId: recipe.id,
      };
    });

    await storage.setShoppingList([...existingList, ...newItems]);
    Alert.alert(
      "Added to Shopping List",
      `${missingIngredients.length} ingredients added to your shopping list.`,
    );
  };

  const handleShare = async () => {
    if (!recipe) return;

    const baseServings = recipe.servings || 1;
    const ingredientsList = recipe.ingredients
      .map(
        (ing) =>
          `- ${scaleQuantity(ing.quantity, baseServings, selectedServings)} ${ing.unit} ${ing.name}`,
      )
      .join("\n");

    const instructionsList = recipe.instructions
      .map((inst, i) => `${i + 1}. ${inst}`)
      .join("\n");

    const shareMessage = `${recipe.title}\n\n${recipe.description}\n\nIngredients:\n${ingredientsList}\n\nInstructions:\n${instructionsList}\n\nPrepared in ${recipe.prepTime + recipe.cookTime} minutes | Serves ${selectedServings}`;

    try {
      await Share.share({
        message: shareMessage,
        title: recipe.title,
      });
    } catch (error) {
      console.error("Error sharing recipe:", error);
    }
  };

  const handleExportPDF = async () => {
    if (!recipe || exporting) return;
    setExporting(true);
    try {
      await exportSingleRecipeToPDF(recipe);
    } catch (error) {
      console.error("Error exporting recipe:", error);
      Alert.alert("Export Error", "Failed to export the recipe. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const handleShopOnInstacart = async () => {
    if (!recipe || sendingToInstacart) return;
    setSendingToInstacart(true);

    try {
      const statusResponse = await fetch(`${getApiUrl()}api/instacart/status`);
      const status = await statusResponse.json();

      if (!status.configured) {
        Alert.alert(
          "Instacart Not Available",
          "Instacart integration is not yet configured. Please check back later."
        );
        setSendingToInstacart(false);
        return;
      }

      const baseServings = recipe.servings || 1;
      const ingredients = recipe.ingredients.map((ing) => {
        const numQuantity = typeof ing.quantity === "string" 
          ? parseFloat(ing.quantity) 
          : ing.quantity;
        const scaledQty = isNaN(numQuantity) 
          ? 1 
          : (numQuantity * selectedServings) / baseServings;
        const roundedQty = Math.round(scaledQty * 100) / 100;
        
        return {
          name: ing.name,
          quantity: roundedQty,
          unit: ing.unit || undefined,
          display_text: `${roundedQty}${ing.unit ? ` ${ing.unit}` : ""} ${ing.name}`,
        };
      });

      let instructionsArray: string[] = [];
      const rawInstructions = recipe.instructions as string[] | string | undefined;
      if (Array.isArray(rawInstructions)) {
        instructionsArray = rawInstructions.map((s) => String(s));
      } else if (typeof rawInstructions === "string" && rawInstructions.trim()) {
        instructionsArray = rawInstructions.split(/\n+/).filter((s) => s.trim());
      }

      const response = await fetch(`${getApiUrl()}api/instacart/create-recipe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: recipe.title,
          ingredients,
          instructions: instructionsArray.length > 0 ? instructionsArray : undefined,
          imageUrl: recipe.imageUri || undefined,
        }),
      });

      const result = await response.json();

      if (result.success && result.recipeUrl) {
        if (Platform.OS === "web") {
          window.open(result.recipeUrl, "_blank");
        } else {
          await Linking.openURL(result.recipeUrl);
        }
      } else {
        Alert.alert("Error", result.message || result.error || "Failed to create Instacart recipe.");
      }
    } catch (error) {
      console.error("Instacart error:", error);
      Alert.alert("Error", "Failed to connect to Instacart. Please try again.");
    } finally {
      setSendingToInstacart(false);
    }
  };

  if (loading) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: Spacing.lg,
              paddingBottom: tabBarHeight + 100,
            },
          ]}
        >
          <RecipeDetailSkeleton />
        </ScrollView>
      </View>
    );
  }

  if (!recipe) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      >
        <View style={styles.notFoundContainer}>
          <Feather name="alert-circle" size={48} color={theme.textSecondary} />
          <ThemedText type="h3" style={styles.notFoundText}>
            Recipe not found
          </ThemedText>
          <ThemedText type="body" style={styles.notFoundSubtext}>
            This recipe may have been deleted
          </ThemedText>
        </View>
      </View>
    );
  }

  const availableCount = recipe.ingredients.filter((ing) =>
    isIngredientAvailable(ing.name),
  ).length;
  const totalCount = recipe.ingredients.length;

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Spacing.lg,
            paddingBottom: tabBarHeight + (showVoiceControls ? 280 : 100),
          },
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
      >
        {recipe.imageUri ? (
          <Image
            source={{ uri: recipe.imageUri }}
            style={styles.heroImage}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        ) : (
          <View
            style={[
              styles.heroPlaceholder,
              { backgroundColor: theme.backgroundDefault },
            ]}
          >
            <Feather name="image" size={48} color={theme.textSecondary} />
          </View>
        )}

        <View style={styles.header}>
          <ThemedText type="h2">{recipe.title}</ThemedText>
          <View style={styles.description}>
            {termHighlightingEnabled ? (
              <TermHighlighter
                text={recipe.description}
                onTermPress={handleTermPress}
              />
            ) : (
              <ThemedText type="body">{recipe.description}</ThemedText>
            )}
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Feather name="clock" size={16} color={theme.textSecondary} />
              <ThemedText type="small" style={styles.metaText}>
                {recipe.prepTime + recipe.cookTime} min
              </ThemedText>
            </View>
            <View style={styles.metaItem}>
              <Feather name="users" size={16} color={theme.textSecondary} />
              <ThemedText type="small" style={styles.metaText}>
                {selectedServings} serving{selectedServings !== 1 ? "s" : ""}
              </ThemedText>
            </View>
            {recipe.cuisine ? (
              <View style={styles.metaItem}>
                <Feather name="globe" size={16} color={theme.textSecondary} />
                <ThemedText type="small" style={styles.metaText}>
                  {recipe.cuisine}
                </ThemedText>
              </View>
            ) : null}
          </View>

          {recipe.dietaryTags && recipe.dietaryTags.length > 0 ? (
            <View style={styles.tagRow}>
              {recipe.dietaryTags.map((tag) => (
                <View
                  key={tag}
                  style={[
                    styles.tag,
                    { backgroundColor: theme.backgroundDefault },
                  ]}
                >
                  <ThemedText type="caption">{tag}</ThemedText>
                </View>
              ))}
            </View>
          ) : null}

          {(recipe.requiredCookware && recipe.requiredCookware.length > 0) ||
          (recipe.optionalCookware && recipe.optionalCookware.length > 0) ? (
            <GlassCard style={styles.cookwareSection}>
              <View style={styles.sectionHeader}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: Spacing.xs,
                  }}
                >
                  <Feather name="tool" size={16} color={theme.text} />
                  <ThemedText type="h4">Cookware</ThemedText>
                </View>
                <Pressable
                  onPress={() =>
                    (navigation as any).navigate("CookwareTab", {
                      screen: "Cookware",
                    })
                  }
                  hitSlop={8}
                >
                  <ThemedText
                    type="caption"
                    style={{ color: AppColors.primary }}
                  >
                    My Cookware
                  </ThemedText>
                </Pressable>
              </View>
              <View style={styles.cookwareList}>
                {recipe.requiredCookware?.map((eq, idx) => {
                  const hasIt = userCookware.includes(eq.toLowerCase());
                  return (
                    <View
                      key={`req-${idx}`}
                      style={[
                        styles.cookwareBadge,
                        {
                          backgroundColor: hasIt
                            ? AppColors.success + "20"
                            : AppColors.warning + "20",
                        },
                      ]}
                    >
                      <Feather
                        name={hasIt ? "check" : "alert-circle"}
                        size={12}
                        color={hasIt ? AppColors.success : AppColors.warning}
                        style={{ marginRight: Spacing.xs }}
                      />
                      <ThemedText
                        type="caption"
                        style={{
                          color: hasIt ? AppColors.success : AppColors.warning,
                        }}
                      >
                        {eq}
                      </ThemedText>
                    </View>
                  );
                })}
                {recipe.optionalCookware?.map((eq, idx) => (
                  <View
                    key={`opt-${idx}`}
                    style={[
                      styles.cookwareBadge,
                      { backgroundColor: theme.backgroundSecondary },
                    ]}
                  >
                    <ThemedText type="caption">{eq} (optional)</ThemedText>
                  </View>
                ))}
              </View>
              {recipe.requiredCookware?.some(
                (eq) => !userCookware.includes(eq.toLowerCase()),
              ) ? (
                <ThemedText type="caption" style={{ marginTop: Spacing.sm }}>
                  Some cookware is missing. Check alternatives or update your
                  cookware list.
                </ThemedText>
              ) : null}
            </GlassCard>
          ) : null}
        </View>

        {recipe.nutrition ? (
          <GlassCard style={styles.nutritionCard}>
            <View style={styles.nutritionHeader}>
              <View style={styles.nutritionTitleRow}>
                <Feather name="zap" size={18} color={theme.text} />
                <ThemedText type="h4">Nutrition</ThemedText>
              </View>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                per serving
              </ThemedText>
            </View>
            <View style={styles.nutritionContent}>
              <View style={styles.caloriesDisplay}>
                <ThemedText type="h2" style={{ color: AppColors.primary }}>
                  {recipe.nutrition.calories}
                </ThemedText>
                <ThemedText type="caption">calories</ThemedText>
              </View>
              <View style={styles.macrosDisplay}>
                <NutritionBadge
                  nutrition={recipe.nutrition}
                  quantity={1}
                  showCalories={false}
                  showMacros={true}
                />
              </View>
            </View>
          </GlassCard>
        ) : null}

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
                  setSelectedServings(Math.max(1, selectedServings - 1))
                }
                style={[
                  styles.stepperButton,
                  { backgroundColor: theme.backgroundSecondary },
                ]}
                disabled={selectedServings <= 1}
              >
                <Feather
                  name="minus"
                  size={18}
                  color={
                    selectedServings <= 1 ? theme.textSecondary : theme.text
                  }
                />
              </Pressable>
              <ThemedText type="h4" style={styles.servingsValue}>
                {selectedServings}
              </ThemedText>
              <Pressable
                onPress={() =>
                  setSelectedServings(Math.min(20, selectedServings + 1))
                }
                style={[
                  styles.stepperButton,
                  { backgroundColor: theme.backgroundSecondary },
                ]}
                disabled={selectedServings >= 20}
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
            const availability = getAvailabilityIndicator(ingredient.availabilityStatus);
            const canSwap = hasSwapsAvailable(ingredient.name);
            const scaledQty = scaleQuantity(
              ingredient.quantity,
              recipe.servings || 1,
              selectedServings,
            );
            const isLowOrMissing = ingredient.availabilityStatus === "partial" || ingredient.availabilityStatus === "unavailable";
            return (
              <View key={index} style={styles.ingredientRow}>
                <Feather
                  name={availability.icon}
                  size={20}
                  color={availability.color}
                />
                <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: Spacing.xs }}>
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
                  {ingredient.availabilityStatus === "partial" && ingredient.percentAvailable ? (
                    <ThemedText type="caption" style={{ color: AppColors.warning }}>
                      ({ingredient.percentAvailable}%)
                    </ThemedText>
                  ) : null}
                </View>
                {canSwap ? (
                  <Pressable
                    onPress={() => handleSwapPress(ingredient)}
                    hitSlop={8}
                    style={styles.swapButton}
                  >
                    <Feather name="repeat" size={16} color={AppColors.accent} />
                  </Pressable>
                ) : null}
              </View>
            );
          })}

          {availableCount < totalCount ? (
            <GlassButton
              variant="outline"
              onPress={handleAddMissingToShoppingList}
              style={styles.addMissingButton}
              icon={
                <Feather
                  name="shopping-cart"
                  size={18}
                  color={AppColors.primary}
                />
              }
            >
              Add Missing to List
            </GlassButton>
          ) : null}

          <GlassButton
            onPress={handleShopOnInstacart}
            loading={sendingToInstacart}
            disabled={sendingToInstacart}
            style={styles.instacartButton}
            icon={<Feather name="shopping-bag" size={18} color="#FFFFFF" />}
            data-testid="button-shop-instacart"
          >
            Shop on Instacart
          </GlassButton>
        </GlassCard>

        <View
          onLayout={(e) => {
            instructionSectionY.current = e.nativeEvent.layout.y;
          }}
        >
          <GlassCard style={styles.section}>
            <View style={styles.sectionHeader}>
              <ThemedText type="h4">Instructions</ThemedText>
              {showVoiceControls ? (
                <ThemedText type="caption" style={{ color: AppColors.primary }}>
                  Step {voiceNav.currentStep + 1}/{recipe.instructions.length}
                </ThemedText>
              ) : null}
            </View>

            {recipe.instructions.map((instruction, index) => {
              const isCurrentStep =
                showVoiceControls && voiceNav.currentStep === index;
              const isPastStep =
                showVoiceControls && index < voiceNav.currentStep;

              return (
                <View
                  key={index}
                  onLayout={(e) => {
                    stepPositions.current[index] = e.nativeEvent.layout.y;
                  }}
                >
                  <Pressable
                    onPress={() => {
                      if (showVoiceControls) {
                        voiceNav.goToStep(index);
                      }
                    }}
                  >
                    <View
                      style={[
                        styles.instructionRow,
                        isCurrentStep && styles.currentStepRow,
                        isPastStep && styles.pastStepRow,
                      ]}
                    >
                      <View
                        style={[
                          styles.stepNumber,
                          {
                            backgroundColor: isCurrentStep
                              ? AppColors.primary
                              : isPastStep
                                ? AppColors.success
                                : theme.backgroundDefault,
                          },
                        ]}
                      >
                        {isPastStep ? (
                          <Feather name="check" size={14} color="#FFFFFF" />
                        ) : (
                          <ThemedText
                            type="small"
                            style={[
                              styles.stepNumberText,
                              { color: isCurrentStep ? "#FFFFFF" : theme.text },
                            ]}
                          >
                            {index + 1}
                          </ThemedText>
                        )}
                      </View>
                      <View style={styles.instructionText}>
                        {termHighlightingEnabled ? (
                          <TermHighlighter
                            text={instruction}
                            onTermPress={handleTermPress}
                          />
                        ) : (
                          <ThemedText
                            type="body"
                            style={[
                              isCurrentStep && styles.currentStepText,
                              isPastStep && styles.pastStepText,
                            ]}
                          >
                            {instruction}
                          </ThemedText>
                        )}
                      </View>
                      {isCurrentStep && voiceNav.isSpeaking ? (
                        <Feather
                          name="volume-2"
                          size={16}
                          color={AppColors.primary}
                        />
                      ) : null}
                    </View>
                  </Pressable>
                </View>
              );
            })}
          </GlassCard>
        </View>
      </ScrollView>

      {showVoiceControls ? (
        <View
          style={[
            styles.voiceControlsContainer,
            { bottom: tabBarHeight + Spacing.lg },
          ]}
        >
          <RecipeVoiceControls
            currentStep={voiceNav.currentStep}
            totalSteps={voiceNav.totalSteps}
            isSpeaking={voiceNav.isSpeaking}
            isPaused={voiceNav.isPaused}
            isListening={voiceNav.isListening}
            isProcessing={voiceNav.isProcessing}
            speechRate={voiceNav.speechRate}
            handsFreeModeEnabled={voiceNav.handsFreeModeEnabled}
            canPause={voiceNav.canPause}
            onNextStep={voiceNav.nextStep}
            onPreviousStep={voiceNav.previousStep}
            onRepeatStep={voiceNav.repeatStep}
            onTogglePause={voiceNav.togglePause}
            onStop={voiceNav.stopReading}
            onIncreaseSpeechRate={voiceNav.increaseSpeechRate}
            onDecreaseSpeechRate={voiceNav.decreaseSpeechRate}
            onToggleHandsFree={voiceNav.toggleHandsFreeMode}
            onStartListening={voiceNav.startListening}
            onStopListening={voiceNav.stopListening}
            onReadRecipe={voiceNav.readRecipe}
          />
        </View>
      ) : null}

      <TermTooltip
        term={selectedTerm}
        visible={tooltipVisible}
        onClose={handleCloseTooltip}
      />

      {selectedIngredient ? (
        <IngredientSwapModal
          visible={swapModalVisible}
          onClose={() => {
            setSwapModalVisible(false);
            setSelectedIngredient(null);
          }}
          ingredient={selectedIngredient}
          inventory={inventory}
          onSelectSwap={handleSwapSelect}
        />
      ) : null}
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
  headerRight: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  heroImage: {
    height: 250,
    borderRadius: BorderRadius.lg,
    width: "100%",
  },
  heroPlaceholder: {
    height: 200,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    gap: Spacing.sm,
  },
  description: {},
  metaRow: {
    flexDirection: "row",
    gap: Spacing.lg,
    marginTop: Spacing.sm,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  metaText: {},
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  tag: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  cookwareRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  cookwareSection: {
    gap: Spacing.md,
  },
  cookwareList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  cookwareBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  section: {
    gap: Spacing.md,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    marginBottom: Spacing.xs,
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
    marginTop: Spacing.sm,
  },
  instacartButton: {
    marginTop: Spacing.sm,
    backgroundColor: "#003D29",
  },
  instructionRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.md,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: "flex-start",
  },
  currentStepRow: {
    backgroundColor: "rgba(0, 122, 255, 0.1)",
    borderWidth: 1,
    borderColor: AppColors.primary,
  },
  pastStepRow: {},
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumberText: {
    fontWeight: "600",
  },
  instructionText: {
    flex: 1,
    paddingTop: 2,
  },
  currentStepText: {
    fontWeight: "600",
  },
  pastStepText: {
    textDecorationLine: "line-through",
  },
  nutritionCard: {
    gap: Spacing.md,
  },
  nutritionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  nutritionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  nutritionContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  caloriesDisplay: {
    alignItems: "flex-start",
  },
  macrosDisplay: {
    alignItems: "flex-end",
  },
  voiceControlsContainer: {
    position: "absolute",
    left: Spacing.lg,
    right: Spacing.lg,
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
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  servingsValue: {
    minWidth: 32,
    textAlign: "center",
  },
  notFoundContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  notFoundText: {
    textAlign: "center",
  },
  notFoundSubtext: {
    textAlign: "center",
    opacity: 0.7,
  },
});
