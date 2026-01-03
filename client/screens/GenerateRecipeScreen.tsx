import React, {
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
} from "react";
import { View, StyleSheet, Modal, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useNavigation,
  useFocusEffect,
  CommonActions,
} from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { GlassCard } from "@/components/GlassCard";
import { GlassButton } from "@/components/GlassButton";
import { ExpiryBadge } from "@/components/ExpiryBadge";
import { UpgradePrompt, UsageBadge } from "@/components/UpgradePrompt";
import { useTheme } from "@/hooks/useTheme";
import { useSubscription } from "@/hooks/useSubscription";
import { Spacing, BorderRadius, AppColors } from "@/constants/theme";
import {
  storage,
  FoodItem,
  Recipe,
  generateId,
  UserPreferences,
  DEFAULT_MACRO_TARGETS,
} from "@/lib/storage";
import { RecipesStackParamList } from "@/navigation/RecipesStackNavigator";
import { apiRequest, getApiUrl } from "@/lib/query-client";
import { analytics } from "@/lib/analytics";
import { saveRecipeImage, saveRecipeImageFromUrl } from "@/lib/recipe-image";

const EXPIRING_THRESHOLD_DAYS = 3;

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

export default function GenerateRecipeScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<RecipesStackParamList>>();
  const { checkLimit, usage, entitlements, isProUser, refetch: refetchSubscription } = useSubscription();

  const [inventory, setInventory] = useState<InventoryItemWithExpiry[]>([]);
  const [cookware, setCookware] = useState<
    Array<{ id: number; name: string; alternatives?: string[] }>
  >([]);
  const [userPreferences, setUserPreferences] =
    useState<UserPreferences | null>(null);
  const [previousRecipeTitles, setPreviousRecipeTitles] = useState<string[]>(
    [],
  );
  const [generating, setGenerating] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [progressStage, setProgressStage] = useState<"recipe" | "image">(
    "recipe",
  );
  const [dataLoaded, setDataLoaded] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const autoGenerateTriggered = useRef(false);

  const { mealType, greeting } = useMemo(() => getMealTypeFromTime(), []);

  const { expiringItems, otherItems } = useMemo(() => {
    const expiring: InventoryItemWithExpiry[] = [];
    const other: InventoryItemWithExpiry[] = [];

    inventory.forEach((item) => {
      if (
        item.daysUntilExpiry !== null &&
        item.daysUntilExpiry <= EXPIRING_THRESHOLD_DAYS
      ) {
        expiring.push(item);
      } else {
        other.push(item);
      }
    });

    expiring.sort(
      (a, b) => (a.daysUntilExpiry ?? 999) - (b.daysUntilExpiry ?? 999),
    );

    return { expiringItems: expiring, otherItems: other };
  }, [inventory]);

  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        setDataLoaded(false);

        const [items, prefs] = await Promise.all([
          storage.getInventory(),
          storage.getPreferences(),
        ]);

        const itemsWithExpiry: InventoryItemWithExpiry[] = items.map(
          (item) => ({
            ...item,
            daysUntilExpiry: calculateDaysUntilExpiry(item.expirationDate),
          }),
        );
        setInventory(itemsWithExpiry);
        setUserPreferences(prefs);

        const cookwareIds = await storage.getCookware();
        if (cookwareIds.length > 0) {
          try {
            const baseUrl = getApiUrl();
            const url = new URL("/api/appliances", baseUrl);
            const response = await fetch(url, { credentials: "include" });
            if (response.ok) {
              const allAppliances = await response.json();
              const userCookware = allAppliances
                .filter((a: any) => cookwareIds.includes(a.id))
                .map((a: any) => ({
                  id: a.id,
                  name: a.name,
                  alternatives: a.alternatives || [],
                }));
              setCookware(userCookware);
            }
          } catch (err) {
            console.error("Error loading cookware:", err);
          }
        }

        setDataLoaded(true);
      };
      loadData();
    }, []),
  );

  useEffect(() => {
    if (
      dataLoaded &&
      inventory.length > 0 &&
      !autoGenerateTriggered.current &&
      !generating
    ) {
      autoGenerateTriggered.current = true;
      handleGenerate();
    }
  }, [dataLoaded, inventory, generating]);

  const handleGenerate = async () => {
    if (inventory.length === 0) {
      return;
    }

    // Check AI recipe limit before generating
    const aiRecipeLimit = checkLimit('aiRecipes');
    if (!aiRecipeLimit.allowed) {
      setShowUpgradePrompt(true);
      return;
    }

    setGenerating(true);
    setProgressStage("recipe");
    setShowProgressModal(true);

    try {
      const inventoryPayload = inventory.map((item, index) => ({
        id: index + 1,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        expiryDate: item.expirationDate,
      }));

      const isQuickRecipe =
        mealType === "snack" ||
        mealType === "late night snack" ||
        mealType === "breakfast";

      const dietaryRestrictions = userPreferences?.dietaryRestrictions?.length
        ? userPreferences.dietaryRestrictions.join(", ")
        : undefined;
      const cuisinePreference = userPreferences?.cuisinePreferences?.length
        ? userPreferences.cuisinePreferences[
            Math.floor(
              Math.random() * userPreferences.cuisinePreferences.length,
            )
          ]
        : undefined;

      const macroTargets =
        userPreferences?.macroTargets || DEFAULT_MACRO_TARGETS;

      const response = await apiRequest("POST", "/api/recipes/generate", {
        prioritizeExpiring: true,
        quickRecipe: isQuickRecipe,
        inventory: inventoryPayload,
        servings: 1,
        maxTime: isQuickRecipe ? 20 : 60,
        mealType: mealType,
        cookware: cookware.length > 0 ? cookware : undefined,
        dietaryRestrictions,
        cuisine: cuisinePreference,
        macroTargets,
        previousRecipeTitles: previousRecipeTitles.slice(-5), // Send last 5 for variety
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

      // Track this recipe title for variety in future generations
      setPreviousRecipeTitles((prev) => [...prev.slice(-4), recipeTitle]);

      // Generate image before saving (so recipe loads complete)
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

        console.log("[GenerateRecipe] Image response status:", imageResponse.ok);
        if (imageResponse.ok) {
          const imageData = await imageResponse.json();
          console.log("[GenerateRecipe] Image data success:", imageData.success);
          console.log("[GenerateRecipe] Has base64:", !!imageData.imageBase64);
          console.log("[GenerateRecipe] Has URL:", !!imageData.imageUrl);
          if (imageData.success) {
            let imageUri: string | undefined;
            if (imageData.imageBase64) {
              imageUri = await saveRecipeImage(
                newRecipe.id,
                imageData.imageBase64,
              );
              console.log("[GenerateRecipe] Saved base64 image, URI:", imageUri?.substring(0, 50));
            } else if (imageData.imageUrl) {
              imageUri = await saveRecipeImageFromUrl(
                newRecipe.id,
                imageData.imageUrl,
              );
              console.log("[GenerateRecipe] Saved URL image, URI:", imageUri);
            }
            if (imageUri) {
              newRecipe.imageUri = imageUri;
              console.log("[GenerateRecipe] Recipe imageUri set:", !!newRecipe.imageUri);
            }
          }
        }
      } catch (imgError) {
        console.log("Image generation failed:", imgError);
      }

      // Save the complete recipe (with image if available)
      await storage.addRecipe(newRecipe);

      // Refetch subscription to update AI recipe count
      await refetchSubscription();

      // Navigate with complete recipe (pass full recipe so image is available immediately)
      setShowProgressModal(false);
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
      console.error("Error generating recipe:", error);

      const ingredientNames = inventory.slice(0, 5).map((i) => i.name);

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

      setShowProgressModal(false);
      // Reset navigation stack so back button goes to Recipes list, not GenerateRecipe
      navigation.dispatch(
        CommonActions.reset({
          index: 1,
          routes: [
            { name: "Recipes" },
            { name: "RecipeDetail", params: { recipeId: fallbackRecipe.id } },
          ],
        }),
      );
    } finally {
      setGenerating(false);
    }
  };

  const hasNoInventory = inventory.length === 0;

  return (
    <ThemedView
      style={[styles.container, { paddingBottom: insets.bottom + Spacing.xl }]}
    >
      <View style={styles.content}>
        <View style={styles.heroSection}>
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: `${AppColors.primary}15` },
            ]}
          >
            <Feather name="zap" size={48} color={AppColors.primary} />
          </View>
          <ThemedText type="h2" style={styles.title}>
            {greeting}!
          </ThemedText>
          <ThemedText type="body" style={styles.subtitle}>
            {hasNoInventory
              ? "Add items to your inventory to generate recipes"
              : `Creating a ${mealType} recipe using your pantry items`}
          </ThemedText>

          {/* AI Recipe Usage Indicator */}
          <View style={styles.usageIndicatorRow}>
            <ThemedText type="caption">AI Recipes</ThemedText>
            {isProUser ? (
              <View style={styles.unlimitedBadge}>
                <Feather name="infinity" size={12} color={AppColors.secondary} />
                <ThemedText type="caption" style={{ color: AppColors.secondary, marginLeft: 4 }}>
                  Unlimited
                </ThemedText>
              </View>
            ) : (
              <UsageBadge
                current={usage.aiRecipesUsedThisMonth}
                max={typeof entitlements.maxAiRecipes === 'number' ? entitlements.maxAiRecipes : 5}
                label="this month"
              />
            )}
          </View>
        </View>

        {!hasNoInventory ? (
          <GlassCard style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <View
                  style={[
                    styles.summaryIcon,
                    { backgroundColor: `${AppColors.primary}20` },
                  ]}
                >
                  <Feather name="package" size={24} color={AppColors.primary} />
                </View>
                <View>
                  <ThemedText type="h3">{inventory.length}</ThemedText>
                  <ThemedText type="caption">Items Available</ThemedText>
                </View>
              </View>
              <View style={styles.summaryItem}>
                <View
                  style={[
                    styles.summaryIcon,
                    {
                      backgroundColor:
                        expiringItems.length > 0
                          ? `${AppColors.warning}20`
                          : `${theme.textSecondary}20`,
                    },
                  ]}
                >
                  <Feather
                    name="clock"
                    size={24}
                    color={
                      expiringItems.length > 0
                        ? AppColors.warning
                        : theme.textSecondary
                    }
                  />
                </View>
                <View>
                  <ThemedText
                    type="h3"
                    style={
                      expiringItems.length > 0
                        ? { color: AppColors.warning }
                        : undefined
                    }
                  >
                    {expiringItems.length}
                  </ThemedText>
                  <ThemedText type="caption">Expiring Soon</ThemedText>
                </View>
              </View>
            </View>

            {expiringItems.length > 0 ? (
              <View style={styles.expiringPreview}>
                <View style={styles.expiringHeader}>
                  <Feather
                    name="alert-circle"
                    size={14}
                    color={AppColors.warning}
                  />
                  <ThemedText
                    type="caption"
                    style={{ color: AppColors.warning }}
                  >
                    Will prioritize these items:
                  </ThemedText>
                </View>
                <View style={styles.expiringTags}>
                  {expiringItems.slice(0, 4).map((item) => (
                    <View key={item.id} style={styles.expiringTag}>
                      <ThemedText type="small" numberOfLines={1}>
                        {item.name}
                      </ThemedText>
                      {item.daysUntilExpiry !== null ? (
                        <ExpiryBadge
                          daysUntilExpiry={item.daysUntilExpiry}
                          size="small"
                        />
                      ) : null}
                    </View>
                  ))}
                  {expiringItems.length > 4 ? (
                    <ThemedText type="caption">
                      +{expiringItems.length - 4} more
                    </ThemedText>
                  ) : null}
                </View>
              </View>
            ) : null}
          </GlassCard>
        ) : null}

        <View style={styles.mealTypeCard}>
          <View style={styles.mealTypeHeader}>
            <Feather
              name={
                mealType === "breakfast"
                  ? "sunrise"
                  : mealType === "lunch"
                    ? "sun"
                    : mealType === "dinner"
                      ? "sunset"
                      : "moon"
              }
              size={20}
              color={AppColors.secondary}
            />
            <ThemedText type="body" style={{ marginLeft: Spacing.sm }}>
              {mealType.charAt(0).toUpperCase() + mealType.slice(1)} Time
            </ThemedText>
          </View>
          <ThemedText type="caption">
            Recipe will be optimized for this meal
          </ThemedText>
        </View>
      </View>

      {hasNoInventory ? (
        <GlassButton
          onPress={() => navigation.goBack()}
          style={styles.actionButton}
          icon={<Feather name="plus" size={20} color="#FFFFFF" />}
        >
          Go to Inventory
        </GlassButton>
      ) : null}

      <Modal
        visible={showProgressModal}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <GlassCard style={styles.progressModal}>
            <ActivityIndicator size="large" color={AppColors.primary} />
            <ThemedText type="h3" style={styles.modalTitle}>
              Creating Your{" "}
              {mealType.charAt(0).toUpperCase() + mealType.slice(1)}
            </ThemedText>
            <ThemedText type="body" style={styles.modalSubtitle}>
              {progressStage === "recipe"
                ? "Checking what's in the kitchen..."
                : "Creating a beautiful image..."}
            </ThemedText>
            {expiringItems.length > 0 ? (
              <View style={styles.progressExpiringNote}>
                <Feather name="clock" size={16} color={AppColors.warning} />
                <ThemedText type="caption" style={{ color: AppColors.warning }}>
                  Considering {expiringItems.length} item
                  {expiringItems.length !== 1 ? "s" : ""} expiring soon
                </ThemedText>
              </View>
            ) : null}
          </GlassCard>
        </View>
      </Modal>

      <UpgradePrompt
        visible={showUpgradePrompt}
        onClose={() => setShowUpgradePrompt(false)}
        type="limit"
        limitType="aiRecipes"
        currentUsage={usage.aiRecipesUsedThisMonth}
        maxAllowed={typeof entitlements.maxAiRecipes === 'number' ? entitlements.maxAiRecipes : 5}
        onUpgrade={() => {
          setShowUpgradePrompt(false);
          navigation.navigate("Pricing" as any);
        }}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    gap: Spacing.lg,
  },
  heroSection: {
    alignItems: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.xl,
  },
  usageIndicatorRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  unlimitedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(130, 87, 229, 0.15)",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  title: {
    textAlign: "center",
  },
  subtitle: {
    textAlign: "center",
    paddingHorizontal: Spacing.xl,
  },
  summaryCard: {
    gap: Spacing.md,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  summaryItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  expiringPreview: {
    gap: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 152, 0, 0.2)",
  },
  expiringHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  expiringTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    alignItems: "center",
  },
  expiringTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    backgroundColor: "rgba(255, 152, 0, 0.1)",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  mealTypeCard: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: "rgba(130, 87, 229, 0.1)",
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  mealTypeHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionButton: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  progressModal: {
    width: "100%",
    alignItems: "center",
    gap: Spacing.lg,
    padding: Spacing.xl,
  },
  modalTitle: {
    textAlign: "center",
    marginTop: Spacing.lg,
  },
  modalSubtitle: {
    textAlign: "center",
    marginTop: Spacing.sm,
  },
  progressExpiringNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.md,
    backgroundColor: "rgba(255, 152, 0, 0.1)",
    borderRadius: BorderRadius.sm,
  },
});
