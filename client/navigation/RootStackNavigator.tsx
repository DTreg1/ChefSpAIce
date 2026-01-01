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
import DrawerNavigator from "@/navigation/DrawerNavigator";
import AddItemScreen from "@/screens/AddItemScreen";
import AddFoodBatchScreen from "@/screens/AddFoodBatchScreen";
import BarcodeScannerScreen from "@/screens/BarcodeScannerScreen";
import IngredientScannerScreen from "@/screens/IngredientScannerScreen";
import FoodCameraScreen, { IdentifiedFood } from "@/screens/FoodCameraScreen";
import FoodSearchScreen, { USDAFoodItem } from "@/screens/FoodSearchScreen";
import OnboardingScreen from "@/screens/OnboardingScreen";
import LandingScreen from "@/screens/LandingScreen";
import ScanHubScreen from "@/screens/ScanHubScreen";
import RecipeScannerScreen from "@/screens/RecipeScannerScreen";
import AboutScreen from "@/screens/AboutScreen";
import PrivacyScreen from "@/screens/PrivacyScreen";
import TermsScreen from "@/screens/TermsScreen";
import SupportScreen from "@/screens/SupportScreen";
import AttributionsScreen from "@/screens/AttributionsScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { storage } from "@/lib/storage";
import { AppColors } from "@/constants/theme";

const isWeb = Platform.OS === "web";

export type RootStackParamList = {
  SignIn: undefined;
  Main: undefined;
  Onboarding: undefined;
  Landing: undefined;
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
      }
    | undefined;
  AddFoodBatch: { items: IdentifiedFood[] };
  ScanHub: undefined;
  BarcodeScanner: undefined;
  IngredientScanner: { mode?: "nutrition" | "recipe" } | undefined;
  RecipeScanner: { mode?: "recipe" } | undefined;
  FoodCamera: undefined;
  FoodSearch: undefined;
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
    refresh: refreshSubscription,
  } = useSubscription();
  const [isLoading, setIsLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const hasInitialized = useRef(false);
  const prevAuthState = useRef({ isAuthenticated });
  const prevSubscriptionState = useRef({ isActive, subscriptionLoading });

  useEffect(() => {
    checkOnboardingStatus();
  }, [isAuthenticated]);

  // Set up sign out callback to navigate to Landing (web) or Onboarding (mobile)
  useEffect(() => {
    setSignOutCallback(() => {
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: isWeb ? "Landing" : "Onboarding" }],
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

    // If user was authenticated but now is not, redirect to Landing (web) or Onboarding (mobile)
    const wasAuthenticated = prevAuthState.current.isAuthenticated;
    const isNowUnauthenticated = !isAuthenticated;

    if (wasAuthenticated && isNowUnauthenticated) {
      // Redirect to Landing for web, Onboarding for mobile
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: isWeb ? "Landing" : "Onboarding" }],
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

    // Authenticated user lost subscription - redirect to Onboarding (has pricing)
    if (isAuthenticated && wasActive && !isActive) {
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: "Onboarding" }],
        }),
      );
    }

    // Authenticated user gained subscription - redirect to Main
    if (isAuthenticated && !wasActive && isActive) {
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: "Main" }],
        }),
      );
    }

    prevSubscriptionState.current = { isActive, subscriptionLoading };
  }, [
    isActive,
    subscriptionLoading,
    isAuthenticated,
    navigation,
    authLoading,
    isLoading,
  ]);

  const checkOnboardingStatus = async () => {
    try {
      const needs = await storage.needsOnboarding();
      setNeedsOnboarding(needs);
    } catch (err) {
      console.error("Error checking onboarding status:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || authLoading || subscriptionLoading) {
    return <LoadingScreen />;
  }

  // Determine initial route:
  // 1. Web + not authenticated → Landing (marketing page)
  // 2. Needs onboarding (new user) → Onboarding (has embedded sign-in on step 1)
  // 3. Not authenticated (returning user who completed onboarding) → Onboarding
  // 4. Authenticated but no active subscription → Onboarding (has pricing)
  // 5. Otherwise → Main
  const getInitialRoute = (): keyof RootStackParamList => {
    // Show landing page for web users who aren't authenticated
    if (isWeb && !isAuthenticated) {
      return "Landing";
    }
    if (!isAuthenticated || needsOnboarding || !isActive) {
      return "Onboarding";
    }
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
            onGetStarted={() => props.navigation.navigate("Onboarding")}
            onSignIn={() => props.navigation.navigate("Onboarding")}
            onAbout={() => props.navigation.navigate("About")}
            onPrivacy={() => props.navigation.navigate("Privacy")}
            onTerms={() => props.navigation.navigate("Terms")}
            onSupport={() => props.navigation.navigate("Support")}
          />
        )}
      </Stack.Screen>
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
        name="AddItem"
        component={AddItemScreen}
        options={{
          presentation: "fullScreenModal",
          headerTitle: "Add Item",
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
          headerTitle: "Search Foods",
        }}
      />
      <Stack.Screen
        name="AddFoodBatch"
        component={AddFoodBatchScreen}
        options={{
          presentation: "fullScreenModal",
          headerTitle: "Add Items",
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
        name="About"
        component={AboutScreen}
        options={{ headerTitle: "About" }}
      />
      <Stack.Screen
        name="Privacy"
        component={PrivacyScreen}
        options={{ headerTitle: "Privacy Policy" }}
      />
      <Stack.Screen
        name="Terms"
        component={TermsScreen}
        options={{ headerTitle: "Terms of Service" }}
      />
      <Stack.Screen
        name="Support"
        component={SupportScreen}
        options={{ headerTitle: "Support" }}
      />
      <Stack.Screen
        name="Attributions"
        component={AttributionsScreen}
        options={{ headerTitle: "Attributions" }}
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
