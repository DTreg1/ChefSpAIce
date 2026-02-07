import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  Alert,
  Share,
  Platform,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useNavigation,
  useRoute,
  RouteProp,
  useFocusEffect,
} from "@react-navigation/native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { RecipeVoiceControls } from "@/components/RecipeVoiceControls";
import { CookingTerm } from "@/components/TermHighlighter";
import { TermTooltip } from "@/components/TermTooltip";
import { IngredientSwapModal } from "@/components/IngredientSwapModal";
import { RecipeDetailSkeleton } from "@/components/Skeleton";
import { ExpoGlassHeader, MenuItemConfig } from "@/components/ExpoGlassHeader";
import { useTheme } from "@/hooks/useTheme";
import { useRecipeVoiceNavigation } from "@/hooks/useRecipeVoiceNavigation";
import { Spacing } from "@/constants/theme";
import {
  storage,
  Recipe,
  RecipeIngredient,
  FoodItem,
  ShoppingListItem,
  generateId,
} from "@/lib/storage";

import { IngredientSwap } from "@/lib/ingredient-swaps";
import { exportSingleRecipeToPDF } from "@/lib/export";
import { saveRecipeImage, saveRecipeImageFromUrl } from "@/lib/recipe-image";
import { useInstacart } from "@/hooks/useInstacart";
import { getRecipeDeepLink } from "@/lib/deep-linking";

import { getApiUrl, apiRequestJson } from "@/lib/query-client";
import { RecipesStackParamList } from "@/navigation/RecipesStackNavigator";
import { logger } from "@/lib/logger";

import { RecipeHero } from "@/components/recipe-detail/RecipeHero";
import { RecipeHeader } from "@/components/recipe-detail/RecipeHeader";
import { RecipeCookwareSection } from "@/components/recipe-detail/RecipeCookwareSection";
import { RecipeNutritionCard } from "@/components/recipe-detail/RecipeNutritionCard";
import { RecipeIngredientsList } from "@/components/recipe-detail/RecipeIngredientsList";
import { RecipeInstructions } from "@/components/recipe-detail/RecipeInstructions";

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

  const {
    isConfigured: instacartConfigured,
    isLoading: instacartLoading,
    openRecipeLink,
  } = useInstacart();

  const scrollViewRef = useRef<ScrollView>(null);
  const stepPositions = useRef<Record<number, number>>({});
  const instructionSectionY = useRef(0);
  const imageGenerationInProgress = useRef<Set<string>>(new Set());

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
          const allAppliances = (await response.json()).data;
          const cookwareNames = allAppliances
            .filter((a: any) => cookwareIds.includes(a.id))
            .map((a: any) => a.name.toLowerCase());
          setUserCookware(cookwareNames);
        }
      } catch (err) {
        logger.error("Error loading cookware:", err);
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

  useEffect(() => {
    if (!recipe || recipe.imageUri || !recipe.isAIGenerated) {
      return;
    }

    if (imageGenerationInProgress.current.has(recipe.id)) {
      return;
    }

    let isCancelled = false;
    let intervalId: NodeJS.Timeout | null = null;

    const generateAndSaveImage = async () => {
      if (imageGenerationInProgress.current.has(recipe.id)) {
        return;
      }
      imageGenerationInProgress.current.add(recipe.id);

      try {
        logger.log("[RecipeDetail] Generating image for AI recipe:", recipe.id);
        const imageData: any = await apiRequestJson(
          "POST",
          "/api/recipes/generate-image",
          {
            title: recipe.title,
            description: recipe.description,
          },
        );

        if (isCancelled) return;
        if (!imageData || isCancelled) return;

        let imageUri: string | undefined;
        if (imageData.imageBase64) {
          imageUri = await saveRecipeImage(recipe.id, imageData.imageBase64);
        } else if (imageData.imageUrl) {
          imageUri = await saveRecipeImageFromUrl(
            recipe.id,
            imageData.imageUrl,
          );
        }

        if (imageUri && !isCancelled) {
          const updatedRecipe = { ...recipe, imageUri };
          await storage.updateRecipe(updatedRecipe);
          setRecipe(updatedRecipe);
          logger.log("[RecipeDetail] Image saved for recipe:", recipe.id);
        }
      } catch (error) {
        logger.log("[RecipeDetail] Image generation failed:", error);
      } finally {
        imageGenerationInProgress.current.delete(recipe.id);
      }
    };

    const pollForImage = async () => {
      const recipes = await storage.getRecipes();
      const updated = recipes.find((r) => r.id === recipe.id);
      if (updated?.imageUri) {
        setRecipe(updated);
        return true;
      }
      return false;
    };

    generateAndSaveImage();

    let attempts = 0;
    const maxAttempts = 20;

    intervalId = setInterval(async () => {
      attempts++;
      const found = await pollForImage();
      if (found || attempts >= maxAttempts || isCancelled) {
        if (intervalId) clearInterval(intervalId);
      }
    }, 3000);

    return () => {
      isCancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
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
      logger.log("Voice command executed:", cmd);
    },
  });

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

  const handleOrderMissingOnInstacart = async () => {
    if (!recipe) return;

    const missingIngredients = recipe.ingredients.filter(
      (ing) => !isIngredientAvailable(ing.name),
    );

    if (missingIngredients.length === 0) {
      Alert.alert("All Set!", "You have all the ingredients for this recipe.");
      return;
    }

    const baseServings = recipe.servings || 1;
    const ingredients = missingIngredients.map((ing) => {
      const numQuantity =
        typeof ing.quantity === "string"
          ? parseFloat(ing.quantity)
          : ing.quantity;
      const scaledNum = isNaN(numQuantity)
        ? 1
        : (numQuantity * selectedServings) / baseServings;
      return {
        name: ing.name,
        quantity: Math.round(scaledNum * 100) / 100,
        unit: ing.unit || "each",
      };
    });

    const publicImageUrl =
      recipe.imageUri && recipe.imageUri.startsWith("http")
        ? recipe.imageUri
        : undefined;
    await openRecipeLink(recipe.title, ingredients, publicImageUrl);
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

    const deepLink = getRecipeDeepLink(recipe.id);
    const shareMessage = `${recipe.title}\n\n${recipe.description}\n\nIngredients:\n${ingredientsList}\n\nInstructions:\n${instructionsList}\n\nPrepared in ${recipe.prepTime + recipe.cookTime} minutes | Serves ${selectedServings}\n\nOpen in ChefSpAIce: ${deepLink}\n\nGenerated by ChefSpAIce`;

    try {
      if (Platform.OS === "web") {
        await Clipboard.setStringAsync(shareMessage);
        Alert.alert("Copied", "Recipe copied to clipboard!");
      } else {
        await Share.share({
          message: shareMessage,
          title: recipe.title,
        });
      }
    } catch (error) {
      logger.error("Error sharing recipe:", error);
    }
  };

  const handleExportPDF = async () => {
    if (!recipe || exporting) return;
    setExporting(true);
    try {
      await exportSingleRecipeToPDF(recipe);
    } catch (error) {
      logger.error("Error exporting recipe:", error);
      Alert.alert(
        "Export Error",
        "Failed to export the recipe. Please try again.",
      );
    } finally {
      setExporting(false);
    }
  };

  const loadingHeaderPadding = 56 + insets.top + Spacing.lg;

  if (loading) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      >
        <ExpoGlassHeader
          title="Recipe"
          screenKey="recipe-detail"
          showSearch={false}
          showBackButton={true}
          menuItems={[]}
        />
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: loadingHeaderPadding,
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
        <ExpoGlassHeader
          title="Recipe"
          screenKey="recipe-detail"
          showSearch={false}
          showBackButton={true}
          menuItems={[]}
        />
        <View
          style={[
            styles.notFoundContainer,
            { paddingTop: loadingHeaderPadding },
          ]}
          accessibilityRole="text"
          accessibilityLabel="Recipe not found. This recipe may have been deleted"
        >
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

  const menuItems: MenuItemConfig[] = [
    {
      label: showVoiceControls ? "Voice Mode On" : "Voice Mode",
      icon: "mic",
      onPress: () => setShowVoiceControls((prev) => !prev),
      active: showVoiceControls,
    },
    {
      label: recipe.isFavorite ? "Unfavorite" : "Favorite",
      icon: "heart",
      onPress: handleToggleFavorite,
      active: recipe.isFavorite,
    },
    {
      label: "Share",
      icon: "share-2",
      onPress: handleShare,
    },
    {
      label: exporting ? "Exporting..." : "Export PDF",
      icon: "download",
      onPress: handleExportPDF,
      disabled: exporting,
    },
  ];

  const headerPadding = 56 + insets.top + Spacing.lg;

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ExpoGlassHeader
        title={recipe.title}
        screenKey="recipe-detail"
        showSearch={false}
        showBackButton={true}
        menuItems={menuItems}
        headerRight={
          <Pressable
            onPress={handleShare}
            style={styles.shareButton}
            testID="button-share-recipe"
            data-testid="button-share-recipe"
            accessibilityRole="button"
            accessibilityLabel="Share this recipe"
          >
            <Feather name="share" size={20} color={theme.text} />
          </Pressable>
        }
      />
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: headerPadding,
            paddingBottom: tabBarHeight + (showVoiceControls ? 280 : 100),
          },
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
      >
        <RecipeHero
          imageUri={recipe.imageUri}
          title={recipe.title}
          theme={theme}
        />

        <View style={styles.headerGroup}>
          <RecipeHeader
            recipe={recipe}
            selectedServings={selectedServings}
            termHighlightingEnabled={termHighlightingEnabled}
            onTermPress={handleTermPress}
            theme={theme}
          />

          <RecipeCookwareSection
            recipe={recipe}
            userCookware={userCookware}
            navigation={navigation}
            theme={theme}
          />
        </View>

        {recipe.nutrition ? (
          <RecipeNutritionCard
            nutrition={recipe.nutrition}
            theme={theme}
          />
        ) : null}

        <RecipeIngredientsList
          recipe={recipe}
          selectedServings={selectedServings}
          onServingsChange={setSelectedServings}
          scaleQuantity={scaleQuantity}
          onSwapPress={handleSwapPress}
          onAddMissingToShoppingList={handleAddMissingToShoppingList}
          availableCount={availableCount}
          totalCount={totalCount}
          instacartConfigured={instacartConfigured}
          instacartLoading={instacartLoading}
          onOrderInstacart={handleOrderMissingOnInstacart}
          theme={theme}
        />

        <RecipeInstructions
          recipe={recipe}
          showVoiceControls={showVoiceControls}
          voiceNav={voiceNav}
          termHighlightingEnabled={termHighlightingEnabled}
          onTermPress={handleTermPress}
          stepPositions={stepPositions}
          onInstructionSectionLayout={(y) => {
            instructionSectionY.current = y;
          }}
          theme={theme}
        />
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
  headerGroup: {
    gap: Spacing.sm,
  },
  voiceControlsContainer: {
    position: "absolute",
    left: Spacing.lg,
    right: Spacing.lg,
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
  shareButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
});
