/**
 * =============================================================================
 * ROOT STACK NAVIGATOR
 * =============================================================================
 * 
 * The top-level navigation structure for ChefSpAIce.
 * Controls the main navigation flow based on auth and onboarding state.
 * 
 * NAVIGATION STRUCTURE:
 * 
 * RootStack (this file)
 * ├── Onboarding - First-time user setup and sign-in
 * ├── Main (DrawerNavigator)
 * │   ├── TabNavigator
 * │   │   ├── InventoryStack (Inventory, ItemDetail)
 * │   │   ├── RecipesStack (Recipes, RecipeDetail, GenerateRecipe, Chat)
 * │   │   ├── MealPlanStack (MealPlan, SelectRecipe)
 * │   │   ├── ShoppingListStack (ShoppingList)
 * │   │   └── ProfileStack (Settings, Analytics, Cookware, etc.)
 * │   └── Drawer items (same as tabs + extras)
 * ├── AddItem - Add/edit inventory items (modal)
 * ├── AddFoodBatch - Add multiple items from camera
 * ├── ScanHub - Choose scanning method
 * ├── BarcodeScanner - Scan product barcodes
 * ├── IngredientScanner - Scan nutrition labels
 * ├── RecipeScanner - Scan recipe cards
 * ├── FoodCamera - AI food recognition
 * └── FoodSearch - USDA food database search
 * 
 * AUTH FLOW:
 * - Shows Onboarding for new/logged-out users
 * - Redirects to Main after successful auth
 * - Auto-logs out on 401 errors
 * 
 * SUBSCRIPTION HANDLING:
 * - Checks subscription status after auth
 * - Redirects to pricing if no active subscription
 * - Supports 7-day free trial
 * 
 * @module navigation/RootStackNavigator
 */

import React, { useState, useEffect, useRef } from "react";
import { View, ActivityIndicator, StyleSheet, Platform } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { CommonActions, useNavigation } from "@react-navigation/native";
import { logger } from "@/lib/logger";
import DrawerNavigator from "@/navigation/DrawerNavigator";
import AddItemScreen from "@/screens/AddItemScreen";
import AddFoodBatchScreen from "@/screens/AddFoodBatchScreen";
import BarcodeScannerScreen from "@/screens/BarcodeScannerScreen";
import IngredientScannerScreen from "@/screens/IngredientScannerScreen";
import FoodCameraScreen from "@/screens/FoodCameraScreen";
import { IdentifiedFood } from "@/components/ImageAnalysisResult";
import FoodSearchScreen, { USDAFoodItem } from "@/screens/FoodSearchScreen";
import OnboardingScreen from "@/screens/OnboardingScreen";
import LandingScreen from "@/screens/LandingScreen";
import AuthScreen from "@/screens/AuthScreen";
import ScanHubScreen from "@/screens/ScanHubScreen";
import RecipeScannerScreen from "@/screens/RecipeScannerScreen";
import ReceiptScanScreen from "@/screens/ReceiptScanScreen";
import AboutScreen from "@/screens/web/AboutScreen";
import PrivacyScreen from "@/screens/web/PrivacyScreen";
import TermsScreen from "@/screens/web/TermsScreen";
import SupportScreen from "@/screens/web/SupportScreen";
import AttributionsScreen from "@/screens/web/AttributionsScreen";
import SubscriptionScreen from "@/screens/SubscriptionScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { storage } from "@/lib/storage";
import { AppColors } from "@/constants/theme";

const isWeb = Platform.OS === "web";

export type RootStackParamList = {
  SignIn: undefined;
  Auth: { selectedTier?: 'basic' | 'pro'; billingPeriod?: 'monthly' | 'annual' } | undefined;
  Main: undefined;
  Onboarding: undefined;
  Landing: undefined;
  LogoPreview: undefined;
  Subscription: { reason?: 'expired' | 'resubscribe' } | undefined;
  About: undefined;
  Privacy: undefined;
  Terms: undefined;
  Support: undefined;
  Attributions: undefined;
  AddItem:
    | {
        barcode?: string;
        productName?: string;
        usdaFood?: USDAFoodItem;
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
  IngredientScanner: { 
    mode?: "nutrition" | "recipe"; 
    returnTo?: "AddItem";
    existingBarcode?: string;
    existingProductName?: string;
  } | undefined;
  RecipeScanner: { mode?: "recipe" } | undefined;
  FoodCamera: undefined;
  FoodSearch: undefined;
  ReceiptScan: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function LoadingScreen() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={AppColors.primary} />
    </View>
  );
}

function AuthGuardedNavigator() {
  const screenOptions = useScreenOptions();
  const navigation = useNavigation();
  const {
    isAuthenticated,
    isLoading: authLoading,
    setSignOutCallback,
  } = useAuth();
  const {
    isActive,
    isLoading: subscriptionLoading,
    refetch: refreshSubscription,
  } = useSubscription();
  const [isLoading, setIsLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const hasInitialized = useRef(false);
  const prevAuthState = useRef({ isAuthenticated });
  const prevSubscriptionState = useRef({ isActive, subscriptionLoading });

  useEffect(() => {
    checkOnboardingStatus();
  }, [isAuthenticated]);

  // Set up sign out callback to navigate to Landing (web) or Auth (mobile)
  useEffect(() => {
    setSignOutCallback(() => {
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: isWeb ? "Landing" : "Auth" }],
        }),
      );
    });
  }, [navigation, setSignOutCallback]);

  // Monitor auth state changes and redirect when user becomes unauthenticated
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      prevAuthState.current = { isAuthenticated };
      return;
    }

    // If user was authenticated but now is not, redirect to Landing (web) or Auth (mobile)
    const wasAuthenticated = prevAuthState.current.isAuthenticated;
    const isNowUnauthenticated = !isAuthenticated;

    if (wasAuthenticated && isNowUnauthenticated) {
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: isWeb ? "Landing" : "Auth" }],
        }),
      );
    }

    prevAuthState.current = { isAuthenticated };
  }, [isAuthenticated, navigation, needsOnboarding]);

  // Monitor subscription state changes and enforce navigation
  useEffect(() => {
    // Skip during loading
    if (subscriptionLoading || authLoading || isLoading) {
      prevSubscriptionState.current = { isActive, subscriptionLoading };
      return;
    }

    const wasLoading = prevSubscriptionState.current.subscriptionLoading;
    const wasActive = prevSubscriptionState.current.isActive;

    // Only act on state changes after initial load completes
    if (!wasLoading && subscriptionLoading) {
      // Starting to load, skip
      prevSubscriptionState.current = { isActive, subscriptionLoading };
      return;
    }

    // Authenticated user lost subscription - redirect to Subscription screen
    // This allows users to resubscribe instead of being stuck in an auth loop
    if (isAuthenticated && wasActive && !isActive) {
      const target = needsOnboarding ? "Onboarding" : "Subscription";
      logger.log(`[Nav] Subscription lost, redirecting to ${target} (needsOnboarding: ${needsOnboarding})`);
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: target, params: { reason: 'expired' } }],
        }),
      );
    }

    // Authenticated user gained subscription - redirect to Main (unless onboarding is needed)
    if (isAuthenticated && !wasActive && isActive) {
      // Only redirect to Main if onboarding is complete
      // This prevents bypassing onboarding for new users who just activated their trial
      if (!needsOnboarding) {
        logger.log("[Nav] Subscription gained, redirecting to Main");
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: "Main" }],
          }),
        );
      } else {
        logger.log("[Nav] Subscription gained but needs onboarding, staying in current flow");
      }
    }

    prevSubscriptionState.current = { isActive, subscriptionLoading };
  }, [
    isActive,
    subscriptionLoading,
    isAuthenticated,
    navigation,
    authLoading,
    isLoading,
    needsOnboarding,
  ]);

  const checkOnboardingStatus = async () => {
    try {
      const needs = await storage.needsOnboarding();
      logger.log(`[Nav] Onboarding check: needsOnboarding=${needs}`);
      setNeedsOnboarding(needs);
    } catch (err) {
      console.error("[Nav] Error checking onboarding status:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || authLoading || subscriptionLoading) {
    return <LoadingScreen />;
  }

  // Determine initial route:
  // 1. Web + not authenticated → Landing (marketing page)
  // 2. Mobile + not authenticated → Auth (sign in/sign up required)
  // 3. Authenticated + needs onboarding → Onboarding
  // 4. Authenticated + subscription inactive → Subscription (to show pricing/resubscribe)
  // 5. Otherwise → Main
  const getInitialRoute = (): keyof RootStackParamList => {
    // Show landing page for web users who aren't authenticated
    if (isWeb && !isAuthenticated) {
      logger.log("[Nav] Initial route: Landing (web, unauthenticated)");
      return "Landing";
    }
    // Require authentication for mobile users before accessing the app
    // ChefSpAIce stores personal data (inventory, recipes, meal plans) which justifies requiring an account
    if (!isAuthenticated) {
      logger.log("[Nav] Initial route: Auth (mobile, unauthenticated - account required for personal data)");
      return "Auth";
    }
    // User needs onboarding - send to Onboarding (includes pricing)
    if (needsOnboarding) {
      logger.log("[Nav] Initial route: Onboarding (needsOnboarding=true)");
      return "Onboarding";
    }
    // User has completed onboarding but has no active subscription - send to Subscription
    // so they can see pricing and resubscribe (instead of going through onboarding again)
    if (!isActive) {
      logger.log("[Nav] Initial route: Subscription (inactive subscription)");
      return "Subscription";
    }
    logger.log("[Nav] Initial route: Main (authenticated, onboarding complete, active subscription)");
    return "Main";
  };

  return (
    <Stack.Navigator
      screenOptions={screenOptions}
      initialRouteName={getInitialRoute()}
    >
      <Stack.Screen
        name="Landing"
        options={{ headerShown: false }}
      >
        {(props) => (
          <LandingScreen
            onAbout={() => props.navigation.navigate("About")}
            onPrivacy={() => props.navigation.navigate("Privacy")}
            onTerms={() => props.navigation.navigate("Terms")}
            onSupport={() => props.navigation.navigate("Support")}
          />
        )}
      </Stack.Screen>
      <Stack.Screen
        name="Auth"
        component={AuthScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Onboarding"
        component={OnboardingScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Main"
        component={DrawerNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Subscription"
        component={SubscriptionScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AddItem"
        component={AddItemScreen}
        options={{
          presentation: "fullScreenModal",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="BarcodeScanner"
        component={BarcodeScannerScreen}
        options={{
          presentation: "fullScreenModal",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="FoodCamera"
        component={FoodCameraScreen}
        options={{
          presentation: "fullScreenModal",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="IngredientScanner"
        component={IngredientScannerScreen}
        options={{
          presentation: "fullScreenModal",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="FoodSearch"
        component={FoodSearchScreen}
        options={{
          presentation: "fullScreenModal",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="AddFoodBatch"
        component={AddFoodBatchScreen}
        options={{
          presentation: "fullScreenModal",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="ScanHub"
        component={ScanHubScreen}
        options={{
          presentation: "fullScreenModal",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="RecipeScanner"
        component={RecipeScannerScreen}
        options={{
          presentation: "fullScreenModal",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="ReceiptScan"
        component={ReceiptScanScreen}
        options={{
          presentation: "fullScreenModal",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="About"
        component={AboutScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Privacy"
        component={PrivacyScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Terms"
        component={TermsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Support"
        component={SupportScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Attributions"
        component={AttributionsScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

// Export wrapper that renders the auth-guarded navigator
export default function RootStackNavigator() {
  return <AuthGuardedNavigator />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
});
