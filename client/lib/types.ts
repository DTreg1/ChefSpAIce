import type { ViewStyle } from "react-native";
import type { NavigatorScreenParams, CompositeNavigationProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { DrawerNavigationProp } from "@react-navigation/drawer";
import type { IdentifiedFood } from "@/components/ImageAnalysisResult";
import type { Recipe } from "@/lib/storage";

export type RecipeSettings = {
  servings: number;
  maxTime: number;
  mealType: "breakfast" | "lunch" | "dinner" | "snack" | "late night snack";
  ingredientCount: { min: number; max: number };
  cuisine?: string;
};

export type InventoryStackParamList = {
  Inventory: undefined;
  ItemDetail: { itemId?: string };
};

export type RecipesStackParamList = {
  Recipes: undefined;
  RecipeDetail: { recipeId: string; initialRecipe?: Recipe };
  GenerateRecipe:
    | {
        preselectedIngredientNames?: string[];
        prioritizeExpiring?: boolean;
        customSettings?: RecipeSettings;
      }
    | undefined;
};

export type MealPlanStackParamList = {
  MealPlan: undefined;
  ShoppingList: undefined;
  SelectRecipe: {
    date: string;
    mealType: string;
  };
};

export type CookwareStackParamList = {
  Cookware: undefined;
};

export type ProfileStackParamList = {
  Profile: undefined;
  Settings: { scrollTo?: string } | undefined;
  Analytics: undefined;
  CookingTerms: undefined;
  Cookware: undefined;
  StorageLocations: undefined;
  Subscription: undefined;
  PrivacyPolicy: undefined;
  TermsOfService: undefined;
  SiriShortcutsGuide: undefined;
};

export type MainTabParamList = {
  KitchenTab: NavigatorScreenParams<InventoryStackParamList>;
  RecipesTab: NavigatorScreenParams<RecipesStackParamList>;
  AddTab: undefined;
  MealPlanTab: NavigatorScreenParams<MealPlanStackParamList>;
  CookwareTab: NavigatorScreenParams<CookwareStackParamList>;
  SettingsTab: undefined;
  NotificationsTab: undefined;
  ProfileTab: NavigatorScreenParams<ProfileStackParamList>;
};

export type DrawerParamList = {
  Tabs: NavigatorScreenParams<MainTabParamList>;
};

export type RootStackParamList = {
  SignIn: undefined;
  Auth:
    | { selectedTier?: "pro"; billingPeriod?: "monthly" | "annual" }
    | undefined;
  Main: NavigatorScreenParams<DrawerParamList>;
  Onboarding: undefined;
  Landing: undefined;
  LogoPreview: undefined;
  Subscription: { reason?: "expired" | "resubscribe" } | undefined;
  About: undefined;
  Privacy: undefined;
  Terms: undefined;
  Support: undefined;
  Attributions: undefined;
  AddItem:
    | {
        barcode?: string;
        productName?: string;
        identifiedFoods?: IdentifiedFood[];
        scannedNutrition?: {
          calories?: number;
          protein?: number;
          carbs?: number;
          fat?: number;
          fiber?: number;
          sugar?: number;
          sodium?: number;
          servingSize?: string;
        };
      }
    | undefined;
  AddFoodBatch: { items: IdentifiedFood[] };
  ScanHub: undefined;
  BarcodeScanner: undefined;
  IngredientScanner:
    | {
        mode?: "nutrition" | "recipe";
        returnTo?: "AddItem";
        existingBarcode?: string;
        existingProductName?: string;
      }
    | undefined;
  RecipeScanner: { mode?: "recipe" } | undefined;
  FoodCamera: undefined;
  ReceiptScan: undefined;
  GrocerySearch: undefined;
};

export type RootNavigation = NativeStackNavigationProp<RootStackParamList>;

export type InventoryNavigation = CompositeNavigationProp<
  NativeStackNavigationProp<InventoryStackParamList>,
  CompositeNavigationProp<
    BottomTabNavigationProp<MainTabParamList>,
    NativeStackNavigationProp<RootStackParamList>
  >
>;

export type RecipesNavigation = CompositeNavigationProp<
  NativeStackNavigationProp<RecipesStackParamList>,
  CompositeNavigationProp<
    BottomTabNavigationProp<MainTabParamList>,
    NativeStackNavigationProp<RootStackParamList>
  >
>;

export type MealPlanNavigation = CompositeNavigationProp<
  NativeStackNavigationProp<MealPlanStackParamList>,
  CompositeNavigationProp<
    BottomTabNavigationProp<MainTabParamList>,
    NativeStackNavigationProp<RootStackParamList>
  >
>;

export type ProfileNavigation = CompositeNavigationProp<
  NativeStackNavigationProp<ProfileStackParamList>,
  CompositeNavigationProp<
    BottomTabNavigationProp<MainTabParamList>,
    NativeStackNavigationProp<RootStackParamList>
  >
>;

export type CookwareNavigation = CompositeNavigationProp<
  NativeStackNavigationProp<CookwareStackParamList>,
  CompositeNavigationProp<
    BottomTabNavigationProp<MainTabParamList>,
    NativeStackNavigationProp<RootStackParamList>
  >
>;

export type DrawerNavigation = CompositeNavigationProp<
  DrawerNavigationProp<DrawerParamList>,
  NativeStackNavigationProp<RootStackParamList>
>;

export interface AuthResponseData {
  user: {
    id: string;
    email: string;
    displayName?: string;
    avatarUrl?: string;
    provider?: string;
    isNewUser?: boolean;
    createdAt: string;
  };
  token: string;
}

export interface RestoreSessionData {
  user: {
    id: string;
    email: string;
    displayName?: string;
    avatarUrl?: string;
    provider?: string;
    createdAt: string;
  };
}

export interface ApiResponseBody<T = unknown> {
  data?: T;
  error?: string;
}

export interface ApplianceItem {
  id: number;
  name: string;
  category: string;
  isCommon: boolean;
  alternatives: string[] | null;
}

export interface GeneratedRecipe {
  id?: string;
  title: string;
  description?: string;
  ingredients: Array<{
    name: string;
    amount: string;
    unit?: string;
    notes?: string;
  }>;
  instructions: Array<{
    step: number;
    text: string;
    time?: number;
  }>;
  prepTime?: number;
  cookTime?: number;
  servings?: number;
  cuisine?: string;
  nutrition?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    fiber?: number;
    sugar?: number;
    sodium?: number;
    servingSize?: string;
  };
  requiredCookware?: string[];
  tags?: string[];
  imageUri?: string;
}

export interface ImageGenerationResponse {
  imageUrl?: string;
  url?: string;
}

export const webClickable: ViewStyle = {
  cursor: "pointer" as unknown as undefined,
} as ViewStyle;

export const webNavLink: ViewStyle = {
  cursor: "pointer" as unknown as undefined,
} as ViewStyle;
