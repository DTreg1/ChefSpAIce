/**
 * =============================================================================
 * LOCAL STORAGE MODULE
 * =============================================================================
 *
 * The core data persistence layer for ChefSpAIce.
 * Implements a local-first architecture with cloud sync capabilities.
 *
 * ARCHITECTURE:
 * - Uses AsyncStorage for persistent local storage on device
 * - All data operations happen locally first (instant UI updates)
 * - Syncs with server when online via sync-manager
 * - Works offline - data is never lost
 *
 * DATA ENTITIES:
 * - FoodItem: Inventory items with expiration dates and nutrition
 * - Recipe: Saved recipes (AI-generated or user-created)
 * - MealPlan: Weekly meal planning assignments
 * - ShoppingListItem: Shopping list with check states
 * - ChatMessage: AI assistant conversation history
 * - UserPreferences: User settings and preferences
 * - WasteLogEntry: Tracking of wasted food for analytics
 * - ConsumedLogEntry: Tracking of consumed food for analytics
 *
 * KEY FEATURES:
 * - Type-safe interfaces for all data models
 * - Utility functions for expiration status
 * - Cloud sync integration for authenticated users
 * - Notification scheduling for expiring items
 * - ID generation utilities
 *
 * STORAGE KEYS:
 * All keys are namespaced with @chefspaice/ prefix to avoid conflicts
 *
 * @module lib/storage
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { getApiUrl } from "@/lib/query-client";
import { syncManager } from "@/lib/sync-manager";
import { logger } from "@/lib/logger";

/** Lazy-loaded notification scheduler to avoid circular dependencies */
let scheduleNotifications: (() => Promise<number>) | null = null;
let notificationDebounceTimer: ReturnType<typeof setTimeout> | null = null;

/** Debounced notification rescheduling to avoid excessive CPU/battery usage */
function triggerNotificationReschedule() {
  // Debounce notification rescheduling - wait 5 seconds after last change
  if (notificationDebounceTimer) {
    clearTimeout(notificationDebounceTimer);
  }

  notificationDebounceTimer = setTimeout(async () => {
    notificationDebounceTimer = null;

    if (!scheduleNotifications) {
      const { scheduleExpirationNotifications } = await import(
        "@/lib/notifications"
      );
      scheduleNotifications = scheduleExpirationNotifications;
    }
    try {
      await scheduleNotifications();
    } catch (error) {
      logger.error("Failed to reschedule notifications:", error);
    }
  }, 5000); // 5 second debounce
}

const STORAGE_KEYS = {
  AUTH_TOKEN: "@chefspaice/auth_token",
  INVENTORY: "@chefspaice/inventory",
  RECIPES: "@chefspaice/recipes",
  RECIPE_IMAGES: "@chefspaice/recipe_images",
  MEAL_PLANS: "@chefspaice/meal_plans",
  SHOPPING_LIST: "@chefspaice/shopping_list",
  CHAT_HISTORY: "@chefspaice/chat_history",
  USER_PREFERENCES: "@chefspaice/preferences",
  USER_PROFILE: "@chefspaice/user_profile",
  WASTE_LOG: "@chefspaice/waste_log",
  CONSUMED_LOG: "@chefspaice/consumed_log",
  ANALYTICS: "@chefspaice/analytics",
  COOKWARE: "@chefspaice/cookware",
  ONBOARDING: "@chefspaice/onboarding",
  CUSTOM_STORAGE_LOCATIONS: "@chefspaice/custom_storage_locations",
  ONBOARDING_STEP: "@chefspaice/onboarding_step",
  PENDING_PURCHASE: "@chefspaice/pending_purchase",
  GUEST_ID: "@chefspaice/guest_id",
  TRIAL_START_DATE: "@chefspaice/trial_start_date",
  IS_GUEST_USER: "@chefspaice/is_guest_user",
  REGISTER_PROMPT_DISMISSED_AT: "@chefspaice/register_prompt_dismissed_at",
} as const;

export const DEFAULT_STORAGE_LOCATIONS = [
  { key: "fridge", label: "Fridge", icon: "thermometer" },
  { key: "freezer", label: "Freezer", icon: "wind" },
  { key: "pantry", label: "Pantry", icon: "archive" },
  { key: "counter", label: "Counter", icon: "coffee" },
] as const;

interface CustomStorageLocation {
  key: string;
  label: string;
  icon: string;
}

export interface OnboardingStatus {
  cookwareSetupCompleted: boolean;
  cookwareSetupSkipped: boolean;
  completedAt?: string;
  currentStep?: string;
}

export interface UserProfile {
  displayName: string;
  avatarUri?: string;
  createdAt: string;
  isLoggedIn: boolean;
}

export interface GuestUserInfo {
  guestId: string;
  trialStartDate: string;
  isGuest: boolean;
}

export interface FoodItem {
  id: string;
  name: string;
  barcode?: string;
  quantity: number;
  unit: string;
  storageLocation: string;
  purchaseDate: string;
  expirationDate: string;
  category: string;
  usdaCategory?: string;
  nutrition?: NutritionInfo;
  notes?: string;
  imageUri?: string;
  fdcId?: number;
  updatedAt?: string;
}

export interface NutritionInfo {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  servingSize?: string;
}

export interface Recipe {
  id: string;
  title: string;
  description: string;
  ingredients: RecipeIngredient[];
  instructions: string[];
  prepTime: number;
  cookTime: number;
  servings: number;
  nutrition?: NutritionInfo;
  isFavorite: boolean;
  isAIGenerated: boolean;
  createdAt: string;
  imageUri?: string;
  cloudImageUri?: string;
  cuisine?: string;
  dietaryTags?: string[];
  requiredCookware?: string[];
  optionalCookware?: string[];
  updatedAt?: string;
}

export type IngredientAvailability = "available" | "partial" | "unavailable";

export interface RecipeIngredient {
  name: string;
  quantity: number;
  unit: string;
  isOptional?: boolean;
  availabilityStatus?: IngredientAvailability;
  percentAvailable?: number;
}

export interface MealPlan {
  id: string;
  date: string;
  meals: Record<string, string | undefined>;
  updatedAt?: string;
}

export interface ShoppingListItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  isChecked: boolean;
  category?: string;
  recipeId?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface MacroTargets {
  protein: number; // percentage
  carbs: number; // percentage
  fat: number; // percentage
}

export interface UserPreferences {
  dietaryRestrictions: string[];
  cuisinePreferences: string[];
  notificationsEnabled: boolean;
  expirationAlertDays: number;
  termHighlightingEnabled?: boolean;
  mealPlanPresetId?: string;
  macroTargets?: MacroTargets;
  servingSize?: number;
  dailyMeals?: number;
  storageAreas?: string[];
  maxCookingTime?: number;
  mealType?: "breakfast" | "lunch" | "dinner" | "snack";
  prioritizeExpiring?: boolean;
  cookingLevel?: "basic" | "intermediate" | "professional";
  llmCreativity?: "basic" | "special" | "spicy" | "wild";
  ingredientCountMin?: number;
  ingredientCountMax?: number;
}

export const DEFAULT_MACRO_TARGETS: MacroTargets = {
  protein: 50,
  carbs: 35,
  fat: 15,
};

export interface WasteLogEntry {
  id: string;
  itemName: string;
  quantity: number;
  unit: string;
  category: string;
  reason: "expired" | "spoiled" | "not_wanted" | "other";
  estimatedValue?: number;
  date: string;
}

export interface ConsumedLogEntry {
  id: string;
  itemName: string;
  quantity: number;
  unit: string;
  category: string;
  nutrition?: NutritionInfo;
  date: string;
}

export interface RecipeGenerationEvent {
  id: string;
  timestamp: string;
  prioritizeExpiring: boolean;
  expiringItemsAvailable: number;
  expiringItemsUsed: number;
  totalIngredients: number;
  recipeId?: string;
  recipeTitle?: string;
  mealType?: string;
}

export interface RecipeSaveEvent {
  id: string;
  timestamp: string;
  recipeId: string;
  fromSmartGenerate: boolean;
  expiringItemsCount: number;
}

export interface WasteReductionStats {
  totalItemsSavedFromWaste: number;
  estimatedValueSaved: number;
  recipesGeneratedWithExpiring: number;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string;
  badges: Badge[];
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  iconName: string;
  earnedAt: string;
  tier: "bronze" | "silver" | "gold" | "platinum";
}

export interface AnalyticsData {
  recipeGenerationEvents: RecipeGenerationEvent[];
  recipeSaveEvents: RecipeSaveEvent[];
  wasteReductionStats: WasteReductionStats;
}

async function getItem<T>(key: string): Promise<T | null> {
  try {
    const value = await AsyncStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    logger.error(`Error reading ${key}:`, error);
    return null;
  }
}

async function setItem<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    logger.error(`Error writing ${key}:`, error);
    throw error;
  }
}

export const storage = {
  async getInventory(): Promise<FoodItem[]> {
    return (await getItem<FoodItem[]>(STORAGE_KEYS.INVENTORY)) || [];
  },

  async setInventory(items: FoodItem[]): Promise<void> {
    await setItem(STORAGE_KEYS.INVENTORY, items);
  },

  async addInventoryItem(item: FoodItem): Promise<void> {
    const items = await this.getInventory();
    const itemWithTimestamp = { ...item, updatedAt: new Date().toISOString() };
    items.push(itemWithTimestamp);
    await this.setInventory(items);

    const token = await this.getAuthToken();
    if (token) {
      syncManager.queueChange("inventory", "create", itemWithTimestamp);
    }

    if (item.expirationDate) {
      triggerNotificationReschedule();
    }
  },

  async addInventoryItems(
    newItems: FoodItem[],
    options?: { skipSync?: boolean },
  ): Promise<{ added: number; failed: number }> {
    const items = await this.getInventory();
    let added = 0;
    let failed = 0;
    const timestamp = new Date().toISOString();
    const itemsWithTimestamp: FoodItem[] = [];

    for (const item of newItems) {
      try {
        const itemWithTimestamp = { ...item, updatedAt: timestamp };
        items.push(itemWithTimestamp);
        itemsWithTimestamp.push(itemWithTimestamp);
        added++;
      } catch {
        failed++;
      }
    }

    await this.setInventory(items);

    // Skip sync if requested (e.g., during onboarding before subscription)
    if (!options?.skipSync) {
      const token = await this.getAuthToken();
      if (token) {
        for (const item of itemsWithTimestamp) {
          syncManager.queueChange("inventory", "create", item);
        }
      }
    }

    if (newItems.some((item) => item.expirationDate)) {
      triggerNotificationReschedule();
    }

    return { added, failed };
  },

  async updateInventoryItem(
    item: FoodItem,
    options?: { skipSync?: boolean },
  ): Promise<void> {
    const items = await this.getInventory();
    const index = items.findIndex((i) => i.id === item.id);
    if (index !== -1) {
      const oldItem = items[index];
      const itemWithTimestamp = {
        ...item,
        updatedAt: new Date().toISOString(),
      };
      items[index] = itemWithTimestamp;
      await this.setInventory(items);

      // Skip sync if requested (e.g., during onboarding before subscription)
      if (!options?.skipSync) {
        const token = await this.getAuthToken();
        if (token) {
          syncManager.queueChange("inventory", "update", itemWithTimestamp);
        }
      }

      if (
        oldItem.expirationDate !== item.expirationDate ||
        item.expirationDate
      ) {
        triggerNotificationReschedule();
      }
    }
  },

  async deleteInventoryItem(id: string): Promise<void> {
    const items = await this.getInventory();
    const deletedItem = items.find((i) => i.id === id);
    await this.setInventory(items.filter((i) => i.id !== id));

    const token = await this.getAuthToken();
    if (token) {
      syncManager.queueChange("inventory", "delete", { id });
    }

    if (deletedItem?.expirationDate) {
      triggerNotificationReschedule();
    }
  },

  async getRawRecipes(): Promise<Recipe[]> {
    return (await getItem<Recipe[]>(STORAGE_KEYS.RECIPES)) || [];
  },

  async getRecipes(): Promise<Recipe[]> {
    const recipes = await this.getRawRecipes();
    // Resolve stored image references (images are stored individually per recipe)
    // Falls back to cloudImageUri if local image is permanently unavailable
    const resolvedRecipes = await Promise.all(
      recipes.map(async (recipe) => {
        let resolvedImageUri: string | undefined = recipe.imageUri;
        let useCloudFallback = false;

        if (recipe.imageUri?.startsWith("stored:")) {
          const recipeId = recipe.imageUri.replace("stored:", "");
          const imageUri = await this.getRecipeImage(recipeId);
          if (imageUri && imageUri.length > 100) {
            // Valid image data found in local storage
            resolvedImageUri = imageUri;
          } else {
            // Local storage doesn't have it or data is corrupted
            logger.log(
              "[getRecipes] Local image missing for recipe:",
              recipe.id,
              "cloudImageUri available:",
              !!recipe.cloudImageUri,
            );
            if (recipe.cloudImageUri) {
              useCloudFallback = true;
            } else {
              // No cloud fallback available, clear the broken reference
              resolvedImageUri = undefined;
            }
          }
        } else if (recipe.imageUri?.startsWith("file://")) {
          // Check if local file exists (native only)
          if (Platform.OS !== "web") {
            try {
              const FileSystem = await import("expo-file-system/legacy");
              const fileInfo = await FileSystem.getInfoAsync(recipe.imageUri);
              if (!fileInfo.exists) {
                logger.log(
                  "[getRecipes] Local file missing for recipe:",
                  recipe.id,
                );
                if (recipe.cloudImageUri) {
                  useCloudFallback = true;
                } else {
                  resolvedImageUri = undefined;
                }
              }
            } catch {
              // On error, keep original reference - don't lose it
            }
          }
        } else if (!recipe.imageUri && recipe.cloudImageUri) {
          // No local image but cloud image exists - use it directly
          useCloudFallback = true;
        }

        // Use cloud fallback if local is confirmed missing and cloud is available
        if (useCloudFallback && recipe.cloudImageUri) {
          logger.log(
            "[getRecipes] Using cloud fallback for recipe:",
            recipe.id,
          );
          resolvedImageUri = recipe.cloudImageUri;
        }

        return { ...recipe, imageUri: resolvedImageUri };
      }),
    );
    return resolvedRecipes;
  },

  async setRecipes(recipes: Recipe[]): Promise<void> {
    await setItem(STORAGE_KEYS.RECIPES, recipes);
  },

  async addRecipe(recipe: Recipe): Promise<void> {
    // Use raw recipes to avoid re-resolving images (which would bloat storage)
    const recipes = await this.getRawRecipes();

    logger.log("[storage.addRecipe] Adding recipe:", recipe.id);
    logger.log("[storage.addRecipe] Has imageUri:", !!recipe.imageUri);
    logger.log("[storage.addRecipe] Platform:", Platform.OS);

    // Store images separately to avoid AsyncStorage size limits
    let recipeToStore = recipe;

    if (recipe.imageUri?.startsWith("data:image")) {
      logger.log("[storage.addRecipe] Image is data URI, storing separately");
      // Store image separately (works on both web and native)
      const success = await this.setRecipeImage(recipe.id, recipe.imageUri);
      logger.log("[storage.addRecipe] Image storage success:", success);

      if (success) {
        recipeToStore = { ...recipe, imageUri: `stored:${recipe.id}` };
      } else {
        // If local storage failed, keep original image for display
        recipeToStore = recipe;
      }
    }
    // file:// URIs are kept as-is for native

    const recipeWithTimestamp = {
      ...recipeToStore,
      updatedAt: new Date().toISOString(),
    };
    recipes.push(recipeWithTimestamp);
    await this.setRecipes(recipes);
    logger.log(
      "[storage.addRecipe] Recipe saved with imageUri:",
      recipeWithTimestamp.imageUri,
    );

    const token = await this.getAuthToken();
    if (token) {
      // Queue cloud upload in background (non-blocking)
      this.uploadRecipeImageToCloud(recipe.id, recipe.imageUri).catch(() => {});

      // Queue sync change - cloudImageUri will be added after upload completes
      const recipeForSync = { ...recipeWithTimestamp, imageUri: undefined };
      syncManager.queueChange("recipes", "create", recipeForSync);
    }
  },

  async uploadRecipeImageToCloud(
    recipeId: string,
    imageUri?: string,
  ): Promise<void> {
    if (!imageUri) return;

    try {
      const token = await this.getAuthToken();
      if (!token) return;

      let base64Data: string;

      if (imageUri.startsWith("data:image")) {
        base64Data = imageUri;
      } else if (imageUri.startsWith("file://") && Platform.OS !== "web") {
        const FileSystem = await import("expo-file-system/legacy");
        base64Data = await FileSystem.readAsStringAsync(imageUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        // Add data URI prefix
        base64Data = `data:image/jpeg;base64,${base64Data}`;
      } else {
        return;
      }

      const { getApiUrl } = await import("@/lib/query-client");
      const baseUrl = getApiUrl();
      const response = await fetch(
        new URL("/api/recipe-images/upload", baseUrl).toString(),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            recipeId,
            base64Data,
          }),
        },
      );

      if (response.ok) {
        const result = (await response.json()).data;
        logger.log(
          "[storage.uploadRecipeImageToCloud] Success:",
          result.cloudImageUri,
        );

        // Update the recipe with cloudImageUri
        const recipes = await this.getRawRecipes();
        const index = recipes.findIndex((r) => r.id === recipeId);
        if (index !== -1) {
          recipes[index].cloudImageUri = result.cloudImageUri;
          await this.setRecipes(recipes);

          // Queue sync update with cloudImageUri
          const recipeForSync = { ...recipes[index], imageUri: undefined };
          syncManager.queueChange("recipes", "update", recipeForSync);
        }
      }
    } catch (error) {
      logger.log("[storage.uploadRecipeImageToCloud] Failed:", error);
    }
  },

  async updateRecipe(recipe: Recipe): Promise<void> {
    // Use raw recipes to avoid re-resolving images (which would bloat storage)
    const recipes = await this.getRawRecipes();
    const index = recipes.findIndex((r) => r.id === recipe.id);
    if (index !== -1) {
      const oldRecipe = recipes[index];
      const updatedRecipe = { ...recipe, updatedAt: new Date().toISOString() };
      // Store large base64 images separately to avoid AsyncStorage size limits
      if (recipe.imageUri?.startsWith("data:image")) {
        await this.setRecipeImage(recipe.id, recipe.imageUri);
        // Store reference flag instead of full data
        recipes[index] = { ...updatedRecipe, imageUri: `stored:${recipe.id}` };
      } else {
        recipes[index] = updatedRecipe;
      }
      await this.setRecipes(recipes);

      const token = await this.getAuthToken();
      if (token) {
        // Upload to cloud if image changed
        const imageChanged =
          recipe.imageUri !== oldRecipe.imageUri &&
          (recipe.imageUri?.startsWith("data:image") ||
            recipe.imageUri?.startsWith("file://"));
        if (imageChanged) {
          this.uploadRecipeImageToCloud(recipe.id, recipe.imageUri).catch(
            () => {},
          );
        }

        const recipeForSync = { ...recipes[index], imageUri: undefined };
        syncManager.queueChange("recipes", "update", recipeForSync);
      }
    }
  },

  async getRecipeImage(recipeId: string): Promise<string | null> {
    try {
      // Store each image in its own key to avoid size limits
      const key = `${STORAGE_KEYS.RECIPE_IMAGES}:${recipeId}`;
      const image = await getItem<string>(key);
      logger.log(
        "[storage.getRecipeImage] Retrieved for:",
        recipeId,
        "found:",
        !!image,
      );
      return image;
    } catch (error) {
      logger.log("[storage.getRecipeImage] Failed:", error);
      return null;
    }
  },

  async setRecipeImage(recipeId: string, imageUri: string): Promise<boolean> {
    try {
      // Store each image in its own key to avoid size limits
      const key = `${STORAGE_KEYS.RECIPE_IMAGES}:${recipeId}`;
      logger.log("[storage.setRecipeImage] Storing image for:", recipeId);
      logger.log("[storage.setRecipeImage] Image size:", imageUri?.length || 0);
      await setItem(key, imageUri);
      logger.log("[storage.setRecipeImage] Success");
      return true;
    } catch (error) {
      logger.log("[storage.setRecipeImage] Failed:", error);
      return false;
    }
  },

  async deleteRecipeImage(recipeId: string): Promise<void> {
    try {
      const key = `${STORAGE_KEYS.RECIPE_IMAGES}:${recipeId}`;
      await AsyncStorage.removeItem(key);
    } catch {
      // Ignore deletion errors
    }
  },

  async deleteRecipe(id: string): Promise<void> {
    const recipes = await this.getRawRecipes();
    const recipe = recipes.find((r) => r.id === id);
    if (recipe?.imageUri?.startsWith("file://")) {
      try {
        const { deleteRecipeImage } = await import("@/lib/recipe-image");
        await deleteRecipeImage(id);
      } catch {
        // Ignore image deletion errors
      }
    }
    // Also delete from separate image storage
    await this.deleteRecipeImage(id);
    await this.setRecipes(recipes.filter((r) => r.id !== id));

    const token = await this.getAuthToken();
    if (token) {
      syncManager.queueChange("recipes", "delete", { id });
    }
  },

  async toggleRecipeFavorite(id: string): Promise<void> {
    const recipes = await this.getRawRecipes();
    const index = recipes.findIndex((r) => r.id === id);
    if (index !== -1) {
      recipes[index].isFavorite = !recipes[index].isFavorite;
      recipes[index].updatedAt = new Date().toISOString();
      await this.setRecipes(recipes);

      const token = await this.getAuthToken();
      if (token) {
        const recipeForSync = { ...recipes[index], imageUri: undefined };
        syncManager.queueChange("recipes", "update", recipeForSync);
      }
    }
  },

  async getMealPlans(): Promise<MealPlan[]> {
    return (await getItem<MealPlan[]>(STORAGE_KEYS.MEAL_PLANS)) || [];
  },

  async setMealPlans(plans: MealPlan[]): Promise<void> {
    await setItem(STORAGE_KEYS.MEAL_PLANS, plans);
  },

  async addMealPlan(plan: MealPlan): Promise<void> {
    const plans = await this.getMealPlans();
    const planWithTimestamp = { ...plan, updatedAt: new Date().toISOString() };
    plans.push(planWithTimestamp);
    await this.setMealPlans(plans);

    const token = await this.getAuthToken();
    if (token) {
      syncManager.queueChange("mealPlans", "create", planWithTimestamp);
    }
  },

  async updateMealPlan(updatedPlan: MealPlan): Promise<void> {
    const plans = await this.getMealPlans();
    const index = plans.findIndex((p) => p.id === updatedPlan.id);
    const planWithTimestamp = {
      ...updatedPlan,
      updatedAt: new Date().toISOString(),
    };
    if (index !== -1) {
      plans[index] = planWithTimestamp;
    } else {
      plans.push(planWithTimestamp);
    }
    await this.setMealPlans(plans);

    const token = await this.getAuthToken();
    if (token) {
      syncManager.queueChange("mealPlans", "update", planWithTimestamp);
    }
  },

  async getShoppingList(): Promise<ShoppingListItem[]> {
    return (
      (await getItem<ShoppingListItem[]>(STORAGE_KEYS.SHOPPING_LIST)) || []
    );
  },

  async setShoppingList(items: ShoppingListItem[]): Promise<void> {
    await setItem(STORAGE_KEYS.SHOPPING_LIST, items);
  },

  async addShoppingListItem(item: ShoppingListItem): Promise<void> {
    const items = await this.getShoppingList();
    items.push(item);
    await this.setShoppingList(items);
  },

  async getChatHistory(): Promise<ChatMessage[]> {
    return (await getItem<ChatMessage[]>(STORAGE_KEYS.CHAT_HISTORY)) || [];
  },

  async setChatHistory(messages: ChatMessage[]): Promise<void> {
    await setItem(STORAGE_KEYS.CHAT_HISTORY, messages);
  },

  async clearChatHistory(): Promise<void> {
    await setItem(STORAGE_KEYS.CHAT_HISTORY, []);
  },

  async getPreferences(): Promise<UserPreferences> {
    return (
      (await getItem<UserPreferences>(STORAGE_KEYS.USER_PREFERENCES)) || {
        dietaryRestrictions: [],
        cuisinePreferences: [],
        notificationsEnabled: true,
        expirationAlertDays: 3,
        termHighlightingEnabled: true,
      }
    );
  },

  async setPreferences(preferences: UserPreferences): Promise<void> {
    await setItem(STORAGE_KEYS.USER_PREFERENCES, preferences);
    syncManager.syncPreferences(preferences);
  },

  async getWasteLog(): Promise<WasteLogEntry[]> {
    return (await getItem<WasteLogEntry[]>(STORAGE_KEYS.WASTE_LOG)) || [];
  },

  async addWasteEntry(entry: WasteLogEntry): Promise<void> {
    const log = await this.getWasteLog();
    log.push(entry);
    await setItem(STORAGE_KEYS.WASTE_LOG, log);
  },

  async getConsumedLog(): Promise<ConsumedLogEntry[]> {
    return (await getItem<ConsumedLogEntry[]>(STORAGE_KEYS.CONSUMED_LOG)) || [];
  },

  async addConsumedEntry(entry: ConsumedLogEntry): Promise<void> {
    const log = await this.getConsumedLog();
    log.push(entry);
    await setItem(STORAGE_KEYS.CONSUMED_LOG, log);
  },

  async clearAllData(): Promise<void> {
    await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
  },

  async getCookware(): Promise<number[]> {
    return (await getItem<number[]>(STORAGE_KEYS.COOKWARE)) || [];
  },

  async setCookware(
    applianceIds: number[],
    options?: { skipSync?: boolean },
  ): Promise<void> {
    await setItem(STORAGE_KEYS.COOKWARE, applianceIds);

    if (options?.skipSync) return;

    const token = await this.getAuthToken();
    if (token) {
      try {
        const baseUrl = getApiUrl();
        await fetch(new URL("/api/user/appliances/bulk", baseUrl).toString(), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ applianceIds }),
        });
      } catch (error) {
        logger.error("[storage.setCookware] Failed to sync to server:", error);
      }
    }
  },

  async addCookware(applianceId: number): Promise<void> {
    const cookware = await this.getCookware();
    if (!cookware.includes(applianceId)) {
      cookware.push(applianceId);
      await setItem(STORAGE_KEYS.COOKWARE, cookware);

      const token = await this.getAuthToken();
      if (token) {
        try {
          const baseUrl = getApiUrl();
          await fetch(new URL("/api/user/appliances", baseUrl).toString(), {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ applianceId }),
          });
        } catch (error) {
          logger.error(
            "[storage.addCookware] Failed to sync to server:",
            error,
          );
        }
      }
    }
  },

  async removeCookware(applianceId: number): Promise<void> {
    const cookware = await this.getCookware();
    const updated = cookware.filter((id) => id !== applianceId);
    await setItem(STORAGE_KEYS.COOKWARE, updated);

    const token = await this.getAuthToken();
    if (token) {
      try {
        const baseUrl = getApiUrl();
        await fetch(
          new URL(`/api/user/appliances/${applianceId}`, baseUrl).toString(),
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );
      } catch (error) {
        logger.error(
          "[storage.removeCookware] Failed to sync to server:",
          error,
        );
      }
    }
  },

  async hasCookwareSetup(): Promise<boolean> {
    const cookware = await this.getCookware();
    return cookware.length > 0;
  },

  async getOnboardingStatus(): Promise<OnboardingStatus> {
    const status = await getItem<OnboardingStatus>(STORAGE_KEYS.ONBOARDING);
    return (
      status || { cookwareSetupCompleted: false, cookwareSetupSkipped: false }
    );
  },

  async setOnboardingCompleted(): Promise<void> {
    await setItem(STORAGE_KEYS.ONBOARDING, {
      cookwareSetupCompleted: true,
      cookwareSetupSkipped: false,
      completedAt: new Date().toISOString(),
    });
  },

  async setOnboardingSkipped(): Promise<void> {
    await setItem(STORAGE_KEYS.ONBOARDING, {
      cookwareSetupCompleted: false,
      cookwareSetupSkipped: true,
      completedAt: new Date().toISOString(),
    });
  },

  async getOnboardingStep(): Promise<string | null> {
    return await getItem<string>(STORAGE_KEYS.ONBOARDING_STEP);
  },

  async setOnboardingStep(step: string): Promise<void> {
    await setItem(STORAGE_KEYS.ONBOARDING_STEP, step);
  },

  async clearOnboardingStep(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEYS.ONBOARDING_STEP);
  },

  async needsOnboarding(): Promise<boolean> {
    try {
      const status = await this.getOnboardingStatus();

      // If onboarding was explicitly completed or skipped, respect that
      if (status.cookwareSetupCompleted || status.cookwareSetupSkipped) {
        logger.log(
          `[Storage] needsOnboarding: false (explicitly ${status.cookwareSetupCompleted ? "completed" : "skipped"})`,
        );
        return false;
      }

      // Fallback: If user has existing data, assume onboarding was completed
      // This prevents false redirects due to storage read failures or cleared cache
      const [recipes, inventory, preferences] = await Promise.all([
        this.getRecipes().catch(() => []),
        this.getInventory().catch(() => []),
        this.getPreferences().catch(() => null),
      ]);

      const hasExistingData =
        recipes.length > 0 || inventory.length > 0 || preferences !== null;
      if (hasExistingData) {
        logger.log(
          `[Storage] needsOnboarding: false (has existing data: recipes=${recipes.length}, inventory=${inventory.length}, prefs=${!!preferences})`,
        );
        // Auto-fix: Mark onboarding as completed since user has data
        await this.setOnboardingCompleted().catch(() => {});
        return false;
      }

      logger.log(
        `[Storage] needsOnboarding: true (no completion flag, no existing data)`,
      );
      return true;
    } catch (error) {
      // On any error, default to NOT needing onboarding to prevent redirect loops
      logger.error(
        `[Storage] needsOnboarding error, defaulting to false:`,
        error,
      );
      return false;
    }
  },

  async resetOnboarding(): Promise<void> {
    // Clear onboarding status so needsOnboarding() returns true
    await AsyncStorage.removeItem(STORAGE_KEYS.ONBOARDING);
    // Also clear any saved onboarding step to start fresh
    await AsyncStorage.removeItem(STORAGE_KEYS.ONBOARDING_STEP);
  },

  async resetForNewUser(): Promise<void> {
    // Clear all user data to ensure new users see onboarding
    // This is called when isNewUser is true from social sign-in
    logger.log("[Storage] Resetting for new user - clearing all local data");
    await Promise.all([
      AsyncStorage.removeItem(STORAGE_KEYS.ONBOARDING),
      AsyncStorage.removeItem(STORAGE_KEYS.ONBOARDING_STEP),
      AsyncStorage.removeItem(STORAGE_KEYS.USER_PREFERENCES),
      AsyncStorage.removeItem(STORAGE_KEYS.INVENTORY),
      AsyncStorage.removeItem(STORAGE_KEYS.RECIPES),
      AsyncStorage.removeItem(STORAGE_KEYS.MEAL_PLANS),
      AsyncStorage.removeItem(STORAGE_KEYS.SHOPPING_LIST),
      AsyncStorage.removeItem(STORAGE_KEYS.CUSTOM_STORAGE_LOCATIONS),
      AsyncStorage.removeItem(STORAGE_KEYS.COOKWARE),
      AsyncStorage.removeItem(STORAGE_KEYS.IS_GUEST_USER),
    ]);
    logger.log("[Storage] New user reset complete");
  },

  async resetAllStorage(): Promise<void> {
    const allKeys = await AsyncStorage.getAllKeys();
    const appKeys = allKeys.filter(
      (key) =>
        key.startsWith("@chefspaice/") ||
        key.startsWith("@freshpantry/") ||
        key === "auth_state",
    );
    if (appKeys.length > 0) {
      await AsyncStorage.multiRemove(appKeys);
    }
    logger.log("[Storage] Reset all storage, cleared keys:", appKeys.length);
  },

  async getCustomStorageLocations(): Promise<CustomStorageLocation[]> {
    return (
      (await getItem<CustomStorageLocation[]>(
        STORAGE_KEYS.CUSTOM_STORAGE_LOCATIONS,
      )) || []
    );
  },

  async addCustomStorageLocation(
    location: CustomStorageLocation,
  ): Promise<void> {
    const locations = await this.getCustomStorageLocations();
    const exists = locations.some((l) => l.key === location.key);
    if (!exists) {
      locations.push(location);
      await setItem(STORAGE_KEYS.CUSTOM_STORAGE_LOCATIONS, locations);
    }
  },

  async removeCustomStorageLocation(
    key: string,
    migrateToLocation: string = "pantry",
  ): Promise<{ migratedCount: number }> {
    const locations = await this.getCustomStorageLocations();
    await setItem(
      STORAGE_KEYS.CUSTOM_STORAGE_LOCATIONS,
      locations.filter((l) => l.key !== key),
    );

    const inventory = await this.getInventory();
    let migratedCount = 0;
    const updatedInventory = inventory.map((item) => {
      if (item.storageLocation === key) {
        migratedCount++;
        return { ...item, storageLocation: migrateToLocation };
      }
      return item;
    });

    if (migratedCount > 0) {
      await setItem(STORAGE_KEYS.INVENTORY, updatedInventory);
    }

    return { migratedCount };
  },

  async getAllStorageLocations(): Promise<
    Array<{ key: string; label: string; icon: string }>
  > {
    const custom = await this.getCustomStorageLocations();
    return [...DEFAULT_STORAGE_LOCATIONS, ...custom];
  },

  async getUserProfile(): Promise<UserProfile> {
    const profile = await getItem<UserProfile>(STORAGE_KEYS.USER_PROFILE);
    return (
      profile || {
        displayName: "Food Manager",
        createdAt: new Date().toISOString(),
        isLoggedIn: true,
      }
    );
  },

  async setUserProfile(profile: UserProfile): Promise<void> {
    await setItem(STORAGE_KEYS.USER_PROFILE, profile);
    syncManager.syncUserProfile(profile);
  },

  async updateDisplayName(displayName: string): Promise<void> {
    const profile = await this.getUserProfile();
    await this.setUserProfile({ ...profile, displayName });
  },

  async updateAvatarUri(avatarUri: string | undefined): Promise<void> {
    const profile = await this.getUserProfile();
    await this.setUserProfile({ ...profile, avatarUri });
  },

  async logout(): Promise<void> {
    const profile = await this.getUserProfile();
    await this.setUserProfile({ ...profile, isLoggedIn: false });
  },

  async deleteAccount(): Promise<void> {
    const allKeys = await AsyncStorage.getAllKeys();
    const appKeys = allKeys.filter((key) => key.startsWith("@chefspaice/"));
    if (appKeys.length > 0) {
      await AsyncStorage.multiRemove(appKeys);
    }
  },

  async getAuthToken(): Promise<string | null> {
    return await getItem<string>(STORAGE_KEYS.AUTH_TOKEN);
  },

  async setAuthToken(token: string): Promise<void> {
    await setItem(STORAGE_KEYS.AUTH_TOKEN, token);
  },

  async clearAuthToken(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
  },

  // ==========================================================================
  // PENDING PURCHASE STORAGE
  // For Apple App Store compliance - allows purchases before account creation
  // ==========================================================================

  async savePendingPurchase(customerInfo: unknown): Promise<void> {
    await setItem(STORAGE_KEYS.PENDING_PURCHASE, {
      customerInfo,
      timestamp: Date.now(),
    });
  },

  async getPendingPurchase(): Promise<{
    customerInfo: unknown;
    timestamp: number;
  } | null> {
    return await getItem(STORAGE_KEYS.PENDING_PURCHASE);
  },

  async clearPendingPurchase(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEYS.PENDING_PURCHASE);
  },

  // ==========================================================================
  // GUEST USER STORAGE
  // For users who haven't registered yet - allows trial usage before signup
  // ==========================================================================

  async getGuestId(): Promise<string | null> {
    return await getItem<string>(STORAGE_KEYS.GUEST_ID);
  },

  async setGuestId(guestId: string): Promise<void> {
    await setItem(STORAGE_KEYS.GUEST_ID, guestId);
  },

  async getTrialStartDate(): Promise<string | null> {
    return await getItem<string>(STORAGE_KEYS.TRIAL_START_DATE);
  },

  async setTrialStartDate(date: string): Promise<void> {
    await setItem(STORAGE_KEYS.TRIAL_START_DATE, date);
  },

  async getIsGuestUser(): Promise<boolean> {
    const isGuest = await getItem<boolean>(STORAGE_KEYS.IS_GUEST_USER);
    return isGuest ?? false;
  },

  async setIsGuestUser(isGuest: boolean): Promise<void> {
    await setItem(STORAGE_KEYS.IS_GUEST_USER, isGuest);
  },

  async isGuestUser(): Promise<boolean> {
    const authToken = await this.getAuthToken();
    if (authToken) {
      return false;
    }
    return await this.getIsGuestUser();
  },

  async initializeGuestUser(): Promise<GuestUserInfo> {
    const existingGuestId = await this.getGuestId();

    if (existingGuestId) {
      const trialStartDate = await this.getTrialStartDate();
      const isGuest = await this.getIsGuestUser();
      logger.log("[Storage] Guest user already initialized:", existingGuestId);
      return {
        guestId: existingGuestId,
        trialStartDate: trialStartDate || new Date().toISOString(),
        isGuest,
      };
    }

    const newGuestId = generateGuestId();
    const trialStartDate = new Date().toISOString();

    await Promise.all([
      this.setGuestId(newGuestId),
      this.setTrialStartDate(trialStartDate),
      this.setIsGuestUser(true),
    ]);

    logger.log("[Storage] New guest user initialized:", newGuestId);

    return {
      guestId: newGuestId,
      trialStartDate,
      isGuest: true,
    };
  },

  async clearGuestUser(): Promise<void> {
    await Promise.all([
      AsyncStorage.removeItem(STORAGE_KEYS.GUEST_ID),
      AsyncStorage.removeItem(STORAGE_KEYS.TRIAL_START_DATE),
      AsyncStorage.removeItem(STORAGE_KEYS.IS_GUEST_USER),
    ]);
    logger.log("[Storage] Guest user data cleared");
  },

  async getGuestUserInfo(): Promise<GuestUserInfo | null> {
    const guestId = await this.getGuestId();
    if (!guestId) {
      return null;
    }

    const trialStartDate = await this.getTrialStartDate();
    const isGuest = await this.getIsGuestUser();

    return {
      guestId,
      trialStartDate: trialStartDate || new Date().toISOString(),
      isGuest,
    };
  },

  async getRegisterPromptDismissedAt(): Promise<string | null> {
    return await getItem<string>(STORAGE_KEYS.REGISTER_PROMPT_DISMISSED_AT);
  },

  async setRegisterPromptDismissedAt(date: string): Promise<void> {
    await setItem(STORAGE_KEYS.REGISTER_PROMPT_DISMISSED_AT, date);
  },

  async clearRegisterPromptDismissedAt(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEYS.REGISTER_PROMPT_DISMISSED_AT);
  },

  async shouldShowRegisterPrompt(hoursToWait: number = 24): Promise<boolean> {
    const dismissedAt = await this.getRegisterPromptDismissedAt();
    if (!dismissedAt) {
      return true;
    }

    const dismissedDate = new Date(dismissedAt);
    const now = new Date();
    const hoursSinceDismissal =
      (now.getTime() - dismissedDate.getTime()) / (1000 * 60 * 60);

    return hoursSinceDismissal >= hoursToWait;
  },

  async syncToCloud(): Promise<{ success: boolean; error?: string }> {
    try {
      const token = await this.getAuthToken();
      if (!token) {
        return { success: false, error: "Not authenticated" };
      }

      const [
        inventory,
        recipes,
        mealPlans,
        shoppingList,
        preferences,
        wasteLog,
        consumedLog,
        cookware,
        onboarding,
        customLocations,
        userProfile,
      ] = await Promise.all([
        this.getInventory(),
        this.getRawRecipes(),
        this.getMealPlans(),
        this.getShoppingList(),
        this.getPreferences(),
        this.getWasteLog(),
        this.getConsumedLog(),
        this.getCookware(),
        this.getOnboardingStatus(),
        this.getCustomStorageLocations(),
        this.getUserProfile(),
      ]);

      const syncData = {
        data: {
          inventory,
          recipes,
          mealPlans,
          shoppingList,
          preferences,
          wasteLog,
          consumedLog,
          cookware,
          onboarding,
          customLocations,
          userProfile,
        },
      };

      const baseUrl = getApiUrl();
      const url = new URL("/api/auth/sync", baseUrl);

      const response = await fetch(url.toString(), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(syncData),
      });

      if (!response.ok) {
        return { success: false, error: "Failed to sync to cloud" };
      }

      // Clear the individual sync queue since we've synced everything in bulk
      await syncManager.clearQueue();

      return { success: true };
    } catch (error) {
      logger.error("Cloud sync error:", error);
      return { success: false, error: "Failed to sync to cloud" };
    }
  },

  async migrateGuestDataToAccount(
    token: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const isGuest = await this.getIsGuestUser();
      if (!isGuest) {
        logger.log(
          "[Storage] migrateGuestDataToAccount: Not a guest user, skipping migration",
        );
        return { success: true };
      }

      const guestId = await this.getGuestId();
      logger.log("[Storage] migrateGuestDataToAccount: Starting migration", {
        guestId,
      });

      const [
        inventory,
        recipes,
        mealPlans,
        shoppingList,
        preferences,
        wasteLog,
        consumedLog,
        cookware,
        onboarding,
        customLocations,
        userProfile,
      ] = await Promise.all([
        this.getInventory(),
        this.getRawRecipes(),
        this.getMealPlans(),
        this.getShoppingList(),
        this.getPreferences(),
        this.getWasteLog(),
        this.getConsumedLog(),
        this.getCookware(),
        this.getOnboardingStatus(),
        this.getCustomStorageLocations(),
        this.getUserProfile(),
      ]);

      const hasData =
        inventory.length > 0 ||
        recipes.length > 0 ||
        mealPlans.length > 0 ||
        shoppingList.length > 0 ||
        cookware.length > 0 ||
        customLocations.length > 0 ||
        onboarding.cookwareSetupCompleted;

      if (!hasData) {
        logger.log(
          "[Storage] migrateGuestDataToAccount: No guest data to migrate",
        );
        await this.setIsGuestUser(false);
        return { success: true };
      }

      const migrationData = {
        guestId,
        data: {
          inventory,
          recipes,
          mealPlans,
          shoppingList,
          preferences,
          wasteLog,
          consumedLog,
          cookware,
          onboarding,
          customLocations,
          userProfile,
        },
      };

      const baseUrl = getApiUrl();
      const url = new URL("/api/auth/migrate-guest-data", baseUrl);

      const response = await fetch(url.toString(), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(migrationData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        logger.log(
          "[Storage] migrateGuestDataToAccount: Migration failed",
          errorData,
        );
        return {
          success: false,
          error: errorData.error || "Failed to migrate guest data",
        };
      }

      await this.setIsGuestUser(false);
      await this.clearRegisterPromptDismissedAt();

      logger.log("[Storage] migrateGuestDataToAccount: Migration successful");
      return { success: true };
    } catch (error) {
      logger.error("Guest data migration error:", error);
      return { success: false, error: "Failed to migrate guest data" };
    }
  },

  async syncFromCloud(): Promise<{ success: boolean; error?: string }> {
    try {
      const token = await this.getAuthToken();
      if (!token) {
        return { success: false, error: "Not authenticated" };
      }

      const baseUrl = getApiUrl();
      const url = new URL("/api/auth/sync", baseUrl);

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        return { success: false, error: "Failed to fetch cloud data" };
      }

      const responseData = await response.json();
      const data = responseData.data;

      if (!data) {
        return { success: true };
      }

      const syncData = data;

      await Promise.all(
        [
          syncData.inventory && this.setInventory(syncData.inventory),
          syncData.recipes && this.setRecipes(syncData.recipes),
          syncData.mealPlans && this.setMealPlans(syncData.mealPlans),
          syncData.shoppingList && this.setShoppingList(syncData.shoppingList),
          syncData.preferences && this.setPreferences(syncData.preferences),
          syncData.cookware &&
            this.setCookware(syncData.cookware, { skipSync: true }),
          syncData.userProfile && this.setUserProfile(syncData.userProfile),
          syncData.onboarding &&
            setItem(STORAGE_KEYS.ONBOARDING, syncData.onboarding),
        ].filter(Boolean),
      );

      return { success: true };
    } catch (error) {
      logger.error("Cloud sync error:", error);
      return { success: false, error: "Failed to sync from cloud" };
    }
  },
};

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function generateGuestId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart1 = Math.random().toString(36).substring(2, 10);
  const randomPart2 = Math.random().toString(36).substring(2, 10);
  return `guest_${timestamp}_${randomPart1}${randomPart2}`;
}

export function getDaysUntilExpiration(expirationDate: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // Parse the expiration date and normalize to local midnight
  const expDate = new Date(expirationDate);
  expDate.setHours(0, 0, 0, 0);

  const diffTime = expDate.getTime() - now.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

export function getExpirationStatus(
  expirationDate: string,
): "expired" | "expiring" | "fresh" {
  const days = getDaysUntilExpiration(expirationDate);
  if (days < 0) return "expired";
  if (days <= 3) return "expiring";
  return "fresh";
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
