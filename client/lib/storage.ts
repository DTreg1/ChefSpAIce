import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { getApiUrl, apiRequest } from "@/lib/query-client";
import { syncManager } from "@/lib/sync-manager";

let scheduleNotifications: (() => Promise<number>) | null = null;

async function triggerNotificationReschedule() {
  if (!scheduleNotifications) {
    const { scheduleExpirationNotifications } = await import("@/lib/notifications");
    scheduleNotifications = scheduleExpirationNotifications;
  }
  try {
    await scheduleNotifications();
  } catch (error) {
    console.error("Failed to reschedule notifications:", error);
  }
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
  INSTACART_SETTINGS: "@chefspaice/instacart_settings",
} as const;

export const DEFAULT_STORAGE_LOCATIONS = [
  { key: "fridge", label: "Fridge", icon: "thermometer" },
  { key: "freezer", label: "Freezer", icon: "wind" },
  { key: "pantry", label: "Pantry", icon: "archive" },
  { key: "counter", label: "Counter", icon: "coffee" },
] as const;

export interface CustomStorageLocation {
  key: string;
  label: string;
  icon: string;
}

export interface OnboardingStatus {
  cookwareSetupCompleted: boolean;
  cookwareSetupSkipped: boolean;
  completedAt?: string;
}

export interface UserProfile {
  displayName: string;
  avatarUri?: string;
  createdAt: string;
  isLoggedIn: boolean;
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
  cuisine?: string;
  dietaryTags?: string[];
  requiredCookware?: string[];
  optionalCookware?: string[];
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
}

export interface InstacartStore {
  id: string;
  name: string;
  isDefault?: boolean;
}

export interface InstacartSettings {
  isConnected: boolean;
  preferredStores: InstacartStore[];
  zipCode?: string;
  apiKeyConfigured?: boolean;
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
    console.error(`Error reading ${key}:`, error);
    return null;
  }
}

async function setItem<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error writing ${key}:`, error);
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
    items.push(item);
    await this.setInventory(items);
    
    const token = await this.getAuthToken();
    if (token) {
      syncManager.queueChange("inventory", "create", item);
    }
    
    if (item.expirationDate) {
      triggerNotificationReschedule();
    }
  },

  async addInventoryItems(
    newItems: FoodItem[],
  ): Promise<{ added: number; failed: number }> {
    const items = await this.getInventory();
    let added = 0;
    let failed = 0;

    for (const item of newItems) {
      try {
        items.push(item);
        added++;
      } catch {
        failed++;
      }
    }

    await this.setInventory(items);
    
    const token = await this.getAuthToken();
    if (token) {
      for (const item of newItems) {
        syncManager.queueChange("inventory", "create", item);
      }
    }
    
    if (newItems.some(item => item.expirationDate)) {
      triggerNotificationReschedule();
    }
    
    return { added, failed };
  },

  async updateInventoryItem(item: FoodItem): Promise<void> {
    const items = await this.getInventory();
    const index = items.findIndex((i) => i.id === item.id);
    if (index !== -1) {
      const oldItem = items[index];
      items[index] = item;
      await this.setInventory(items);
      
      const token = await this.getAuthToken();
      if (token) {
        syncManager.queueChange("inventory", "update", item);
      }
      
      if (oldItem.expirationDate !== item.expirationDate || item.expirationDate) {
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
    const resolvedRecipes = await Promise.all(
      recipes.map(async (recipe) => {
        if (recipe.imageUri?.startsWith("stored:")) {
          const recipeId = recipe.imageUri.replace("stored:", "");
          const imageUri = await this.getRecipeImage(recipeId);
          return { ...recipe, imageUri: imageUri || undefined };
        }
        return recipe;
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

    console.log("[storage.addRecipe] Adding recipe:", recipe.id);
    console.log("[storage.addRecipe] Has imageUri:", !!recipe.imageUri);
    console.log("[storage.addRecipe] Platform:", Platform.OS);

    // Store images separately to avoid AsyncStorage size limits
    let recipeToStore = recipe;
    if (recipe.imageUri?.startsWith("data:image")) {
      console.log("[storage.addRecipe] Image is data URI, storing separately");
      // Store image separately (works on both web and native)
      const success = await this.setRecipeImage(recipe.id, recipe.imageUri);
      console.log("[storage.addRecipe] Image storage success:", success);
      if (success) {
        recipeToStore = { ...recipe, imageUri: `stored:${recipe.id}` };
      } else {
        // If storage failed, don't store image reference
        recipeToStore = { ...recipe, imageUri: undefined };
      }
    }

    recipes.push(recipeToStore);
    await this.setRecipes(recipes);
    console.log("[storage.addRecipe] Recipe saved with imageUri:", recipeToStore.imageUri);
    
    const token = await this.getAuthToken();
    if (token) {
      const recipeForSync = { ...recipeToStore, imageUri: undefined };
      syncManager.queueChange("recipes", "create", recipeForSync);
    }
  },

  async updateRecipe(recipe: Recipe): Promise<void> {
    // Use raw recipes to avoid re-resolving images (which would bloat storage)
    const recipes = await this.getRawRecipes();
    const index = recipes.findIndex((r) => r.id === recipe.id);
    if (index !== -1) {
      // Store large base64 images separately to avoid AsyncStorage size limits
      if (recipe.imageUri?.startsWith("data:image")) {
        await this.setRecipeImage(recipe.id, recipe.imageUri);
        // Store reference flag instead of full data
        recipes[index] = { ...recipe, imageUri: `stored:${recipe.id}` };
      } else {
        recipes[index] = recipe;
      }
      await this.setRecipes(recipes);
      
      const token = await this.getAuthToken();
      if (token) {
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
      console.log("[storage.getRecipeImage] Retrieved for:", recipeId, "found:", !!image);
      return image;
    } catch (error) {
      console.log("[storage.getRecipeImage] Failed:", error);
      return null;
    }
  },

  async setRecipeImage(recipeId: string, imageUri: string): Promise<boolean> {
    try {
      // Store each image in its own key to avoid size limits
      const key = `${STORAGE_KEYS.RECIPE_IMAGES}:${recipeId}`;
      console.log("[storage.setRecipeImage] Storing image for:", recipeId);
      console.log("[storage.setRecipeImage] Image size:", imageUri?.length || 0);
      await setItem(key, imageUri);
      console.log("[storage.setRecipeImage] Success");
      return true;
    } catch (error) {
      console.log("[storage.setRecipeImage] Failed:", error);
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
    plans.push(plan);
    await this.setMealPlans(plans);
    
    const token = await this.getAuthToken();
    if (token) {
      syncManager.queueChange("mealPlans", "create", plan);
    }
  },

  async updateMealPlan(updatedPlan: MealPlan): Promise<void> {
    const plans = await this.getMealPlans();
    const index = plans.findIndex((p) => p.id === updatedPlan.id);
    if (index !== -1) {
      plans[index] = updatedPlan;
    } else {
      plans.push(updatedPlan);
    }
    await this.setMealPlans(plans);
    
    const token = await this.getAuthToken();
    if (token) {
      syncManager.queueChange("mealPlans", "update", updatedPlan);
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

  async setCookware(applianceIds: number[]): Promise<void> {
    await setItem(STORAGE_KEYS.COOKWARE, applianceIds);
  },

  async addCookware(applianceId: number): Promise<void> {
    const cookware = await this.getCookware();
    if (!cookware.includes(applianceId)) {
      cookware.push(applianceId);
      await setItem(STORAGE_KEYS.COOKWARE, cookware);
    }
  },

  async removeCookware(applianceId: number): Promise<void> {
    const cookware = await this.getCookware();
    const updated = cookware.filter((id) => id !== applianceId);
    await setItem(STORAGE_KEYS.COOKWARE, updated);
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

  async needsOnboarding(): Promise<boolean> {
    const status = await this.getOnboardingStatus();
    return !status.cookwareSetupCompleted && !status.cookwareSetupSkipped;
  },

  async resetOnboarding(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEYS.ONBOARDING);
  },

  async clearGuestData(): Promise<void> {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.INVENTORY,
      STORAGE_KEYS.COOKWARE,
      STORAGE_KEYS.ONBOARDING,
      STORAGE_KEYS.RECIPES,
      STORAGE_KEYS.SHOPPING_LIST,
      STORAGE_KEYS.MEAL_PLANS,
      STORAGE_KEYS.CONSUMED_LOG,
    ]);
  },

  async getCustomStorageLocations(): Promise<CustomStorageLocation[]> {
    return (await getItem<CustomStorageLocation[]>(STORAGE_KEYS.CUSTOM_STORAGE_LOCATIONS)) || [];
  },

  async addCustomStorageLocation(location: CustomStorageLocation): Promise<void> {
    const locations = await this.getCustomStorageLocations();
    const exists = locations.some(l => l.key === location.key);
    if (!exists) {
      locations.push(location);
      await setItem(STORAGE_KEYS.CUSTOM_STORAGE_LOCATIONS, locations);
    }
  },

  async removeCustomStorageLocation(key: string, migrateToLocation: string = "pantry"): Promise<{ migratedCount: number }> {
    const locations = await this.getCustomStorageLocations();
    await setItem(STORAGE_KEYS.CUSTOM_STORAGE_LOCATIONS, locations.filter(l => l.key !== key));
    
    const inventory = await this.getInventory();
    let migratedCount = 0;
    const updatedInventory = inventory.map(item => {
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

  async getAllStorageLocations(): Promise<Array<{ key: string; label: string; icon: string }>> {
    const custom = await this.getCustomStorageLocations();
    return [...DEFAULT_STORAGE_LOCATIONS, ...custom];
  },

  async getUserProfile(): Promise<UserProfile> {
    const profile = await getItem<UserProfile>(STORAGE_KEYS.USER_PROFILE);
    return profile || {
      displayName: "Food Manager",
      createdAt: new Date().toISOString(),
      isLoggedIn: true,
    };
  },

  async setUserProfile(profile: UserProfile): Promise<void> {
    await setItem(STORAGE_KEYS.USER_PROFILE, profile);
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

  async getInstacartSettings(): Promise<InstacartSettings> {
    const settings = await getItem<InstacartSettings>(STORAGE_KEYS.INSTACART_SETTINGS);
    return settings || {
      isConnected: false,
      preferredStores: [],
      zipCode: undefined,
      apiKeyConfigured: false,
    };
  },

  async setInstacartSettings(settings: InstacartSettings): Promise<void> {
    await setItem(STORAGE_KEYS.INSTACART_SETTINGS, settings);
  },

  async updateInstacartZipCode(zipCode: string): Promise<void> {
    const settings = await this.getInstacartSettings();
    await this.setInstacartSettings({ ...settings, zipCode });
  },

  async addInstacartStore(store: InstacartStore): Promise<void> {
    const settings = await this.getInstacartSettings();
    const exists = settings.preferredStores.some(s => s.id === store.id);
    if (!exists) {
      settings.preferredStores.push(store);
      await this.setInstacartSettings(settings);
    }
  },

  async removeInstacartStore(storeId: string): Promise<void> {
    const settings = await this.getInstacartSettings();
    settings.preferredStores = settings.preferredStores.filter(s => s.id !== storeId);
    await this.setInstacartSettings(settings);
  },

  async setDefaultInstacartStore(storeId: string): Promise<void> {
    const settings = await this.getInstacartSettings();
    settings.preferredStores = settings.preferredStores.map(s => ({
      ...s,
      isDefault: s.id === storeId,
    }));
    await this.setInstacartSettings(settings);
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

      return { success: true };
    } catch (error) {
      console.error("Cloud sync error:", error);
      return { success: false, error: "Failed to sync to cloud" };
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

      const data = await response.json();
      
      if (!data.data) {
        return { success: true };
      }

      const syncData = data.data;

      await Promise.all([
        syncData.inventory && this.setInventory(syncData.inventory),
        syncData.recipes && this.setRecipes(syncData.recipes),
        syncData.mealPlans && this.setMealPlans(syncData.mealPlans),
        syncData.shoppingList && this.setShoppingList(syncData.shoppingList),
        syncData.preferences && this.setPreferences(syncData.preferences),
        syncData.cookware && this.setCookware(syncData.cookware),
        syncData.userProfile && this.setUserProfile(syncData.userProfile),
      ].filter(Boolean));

      return { success: true };
    } catch (error) {
      console.error("Cloud sync error:", error);
      return { success: false, error: "Failed to sync from cloud" };
    }
  },
};

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
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

const LEGACY_STORAGE_KEYS = [
  "@freshpantry/inventory",
  "@freshpantry/recipes",
  "@freshpantry/meal_plans",
  "@freshpantry/shopping_list",
  "@freshpantry/chat_history",
  "@freshpantry/preferences",
  "@freshpantry/waste_log",
  "@freshpantry/consumed_log",
  "@freshpantry/analytics",
  "@freshpantry/cookware",
  "@freshpantry/onboarding",
];

export async function clearLegacyStorage(): Promise<{
  cleared: boolean;
  keysRemoved: string[];
}> {
  const keysRemoved: string[] = [];

  for (const key of LEGACY_STORAGE_KEYS) {
    try {
      const value = await AsyncStorage.getItem(key);
      if (value !== null) {
        await AsyncStorage.removeItem(key);
        keysRemoved.push(key);
      }
    } catch (error) {
      console.error(`Failed to remove legacy key ${key}:`, error);
    }
  }

  return { cleared: keysRemoved.length > 0, keysRemoved };
}
