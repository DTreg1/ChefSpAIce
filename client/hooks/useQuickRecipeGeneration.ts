import { useState, useCallback } from "react";
import { Alert } from "react-native";
import { CommonActions, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { logger } from "@/lib/logger";
import {
  storage,
  FoodItem,
  Recipe,
  generateId,
  DEFAULT_MACRO_TARGETS,
} from "@/lib/storage";
import { apiRequest, getApiUrl } from "@/lib/query-client";
import { analytics } from "@/lib/analytics";
import { saveRecipeImage, saveRecipeImageFromUrl } from "@/lib/recipe-image";
import { useSubscription } from "@/hooks/useSubscription";
import { RecipesStackParamList } from "@/navigation/RecipesStackNavigator";

const EXPIRING_THRESHOLD_DAYS = 5;

interface InventoryItemWithExpiry extends FoodItem {
  daysUntilExpiry: number | null;
}

function calculateDaysUntilExpiry(
  expiryDate: string | null | undefined,
): number | null {
  if (!expiryDate) return null;
  const expiry = new Date(expiryDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);
  const diffTime = expiry.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function getMealTypeFromTime(): { mealType: string; greeting: string } {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) {
    return { mealType: "breakfast", greeting: "Good morning" };
  } else if (hour >= 11 && hour < 14) {
    return { mealType: "lunch", greeting: "Good afternoon" };
  } else if (hour >= 14 && hour < 17) {
    return { mealType: "snack", greeting: "Good afternoon" };
  } else if (hour >= 17 && hour < 21) {
    return { mealType: "dinner", greeting: "Good evening" };
  } else {
    return { mealType: "late night snack", greeting: "Good evening" };
  }
}

export type QuickRecipeProgressStage = "loading" | "recipe" | "image" | "done";

interface _QuickRecipeGenerationState {
  isGenerating: boolean;
  progressStage: QuickRecipeProgressStage;
  showUpgradePrompt: boolean;
}
// @ts-ignore - defined for future use
type QuickRecipeGenerationState = _QuickRecipeGenerationState;

export function useQuickRecipeGeneration() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RecipesStackParamList>>();
  const {
    checkLimit,
    entitlements,
    refetch: refetchSubscription,
  } = useSubscription();

  const [isGenerating, setIsGenerating] = useState(false);
  const [progressStage, setProgressStage] =
    useState<QuickRecipeProgressStage>("loading");
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  const dismissUpgradePrompt = useCallback(() => {
    setShowUpgradePrompt(false);
  }, []);

  const generateQuickRecipe = useCallback(async () => {
    const aiRecipeLimit = checkLimit("aiRecipes");
    if (!aiRecipeLimit.allowed) {
      setShowUpgradePrompt(true);
      return;
    }

    setIsGenerating(true);
    setProgressStage("loading");

    try {
      const [items, prefs, cookwareIds] = await Promise.all([
        storage.getInventory(),
        storage.getPreferences(),
        storage.getCookware(),
      ]);

      if (items.length === 0) {
        setIsGenerating(false);
        Alert.alert(
          "No Ingredients",
          "Add some ingredients to your pantry first, then we can create a recipe for you!",
          [{ text: "OK" }],
        );
        return;
      }

      const inventory: InventoryItemWithExpiry[] = items.map((item) => ({
        ...item,
        daysUntilExpiry: calculateDaysUntilExpiry(item.expirationDate),
      }));

      let cookware: Array<{
        id: number;
        name: string;
        alternatives?: string[];
      }> = [];
      if (cookwareIds.length > 0) {
        try {
          const baseUrl = getApiUrl();
          const url = new URL("/api/appliances", baseUrl);
          const response = await fetch(url, { credentials: "include" });
          if (response.ok) {
            const allAppliances = await response.json();
            cookware = allAppliances
              .filter((a: any) => cookwareIds.includes(a.id))
              .map((a: any) => ({
                id: a.id,
                name: a.name,
                alternatives: a.alternatives || [],
              }));
          }
        } catch (err) {
          logger.error("Error loading cookware:", err);
        }
      }

      setProgressStage("recipe");

      const { mealType } = getMealTypeFromTime();

      const dietaryRestrictions = prefs?.dietaryRestrictions?.length
        ? prefs.dietaryRestrictions.join(", ")
        : undefined;
      const cuisinePreference = prefs?.cuisinePreferences?.length
        ? prefs.cuisinePreferences[
            Math.floor(Math.random() * prefs.cuisinePreferences.length)
          ]
        : undefined;

      const macroTargets = prefs?.macroTargets || DEFAULT_MACRO_TARGETS;

      const inventoryPayload = inventory.map((item, index) => ({
        id: index + 1,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        expiryDate: item.expirationDate,
      }));

      const expiringItems = inventory.filter(
        (item) =>
          item.daysUntilExpiry !== null &&
          item.daysUntilExpiry <= EXPIRING_THRESHOLD_DAYS,
      );

      const response = await apiRequest("POST", "/api/recipes/generate", {
        prioritizeExpiring: true,
        quickRecipe: true,
        inventory: inventoryPayload,
        servings: 1,
        maxTime: 15,
        mealType,
        cookware: cookware.length > 0 ? cookware : undefined,
        dietaryRestrictions,
        cuisine: cuisinePreference,
        macroTargets,
      });

      const generatedRecipe = await response.json();

      const usedExpiringItems = generatedRecipe.usedExpiringItems || [];
      const expiringItemsUsed = usedExpiringItems.length;

      await analytics.trackRecipeGenerated({
        prioritizeExpiring: true,
        expiringItemsAvailable: expiringItems.length,
        expiringItemsUsed,
        totalIngredients: inventory.length,
        recipeTitle: generatedRecipe.title,
        mealType,
      });

      const recipeTitle =
        generatedRecipe.title ||
        `${mealType.charAt(0).toUpperCase() + mealType.slice(1)} Recipe`;
      const recipeDescription =
        generatedRecipe.description ||
        "A delicious recipe created just for you.";

      const newRecipe: Recipe = {
        id: generateId(),
        title: recipeTitle,
        description: recipeDescription,
        ingredients:
          generatedRecipe.ingredients ||
          inventory.slice(0, 5).map((item) => ({
            name: item.name,
            quantity: 1,
            unit: "portion",
          })),
        instructions: generatedRecipe.instructions || [
          "Follow your culinary instincts!",
        ],
        prepTime: generatedRecipe.prepTime || 15,
        cookTime: generatedRecipe.cookTime || 30,
        servings: generatedRecipe.servings || 1,
        nutrition: generatedRecipe.nutrition,
        isFavorite: false,
        isAIGenerated: true,
        createdAt: new Date().toISOString(),
        requiredCookware: generatedRecipe.requiredCookware,
        optionalCookware: generatedRecipe.optionalCookware,
      };

      setProgressStage("image");
      try {
        const imageResponse = await apiRequest(
          "POST",
          "/api/recipes/generate-image",
          {
            title: recipeTitle,
            description: recipeDescription,
            cuisine: cuisinePreference,
          },
        );

        if (imageResponse.ok) {
          const imageData = await imageResponse.json();
          if (imageData.success) {
            let imageUri: string | undefined;
            if (imageData.imageBase64) {
              imageUri = await saveRecipeImage(
                newRecipe.id,
                imageData.imageBase64,
              );
            } else if (imageData.imageUrl) {
              imageUri = await saveRecipeImageFromUrl(
                newRecipe.id,
                imageData.imageUrl,
              );
            }
            if (imageUri) {
              newRecipe.imageUri = imageUri;
            }
          }
        }
      } catch (imgError) {
        logger.log("Image generation failed:", imgError);
      }

      await storage.addRecipe(newRecipe);
      await refetchSubscription();

      setProgressStage("done");
      setIsGenerating(false);

      navigation.dispatch(
        CommonActions.reset({
          index: 1,
          routes: [
            { name: "Recipes" },
            {
              name: "RecipeDetail",
              params: { recipeId: newRecipe.id, initialRecipe: newRecipe },
            },
          ],
        }),
      );
    } catch (error) {
      logger.error("Error generating quick recipe:", error);

      try {
        const items = await storage.getInventory();
        const ingredientNames = items.slice(0, 5).map((i) => i.name);
        const { mealType } = getMealTypeFromTime();

        const fallbackRecipe: Recipe = {
          id: generateId(),
          title: `${mealType.charAt(0).toUpperCase() + mealType.slice(1)} with ${ingredientNames[0] || "Fresh Ingredients"}`,
          description: `A tasty ${mealType} dish featuring ${ingredientNames.join(", ")}.`,
          ingredients: ingredientNames.map((name) => ({
            name,
            quantity: 1,
            unit: "portion",
          })),
          instructions: [
            "Prepare all ingredients by washing and chopping as needed.",
            "Heat a pan over medium heat with a little oil.",
            "Add ingredients in order of cooking time - longest first.",
            "Season with salt, pepper, and your favorite spices.",
            "Cook until everything is heated through and flavors have melded.",
            "Serve hot and enjoy!",
          ],
          prepTime: 15,
          cookTime: 25,
          servings: 1,
          nutrition: {
            calories: 350,
            protein: 15,
            carbs: 40,
            fat: 12,
          },
          isFavorite: false,
          isAIGenerated: true,
          createdAt: new Date().toISOString(),
        };

        await storage.addRecipe(fallbackRecipe);
        await refetchSubscription();

        setProgressStage("done");
        setIsGenerating(false);

        navigation.dispatch(
          CommonActions.reset({
            index: 1,
            routes: [
              { name: "Recipes" },
              {
                name: "RecipeDetail",
                params: {
                  recipeId: fallbackRecipe.id,
                  initialRecipe: fallbackRecipe,
                },
              },
            ],
          }),
        );
      } catch (fallbackError) {
        logger.error("Error creating fallback recipe:", fallbackError);
        setIsGenerating(false);
        setProgressStage("loading");
        Alert.alert(
          "Recipe Generation Failed",
          "We couldn't generate a recipe right now. Please try again.",
          [{ text: "OK" }],
        );
      }
    }
  }, [checkLimit, navigation, refetchSubscription]);

  return {
    generateQuickRecipe,
    isGenerating,
    progressStage,
    showUpgradePrompt,
    dismissUpgradePrompt,
    entitlements,
    checkLimit,
  };
}
