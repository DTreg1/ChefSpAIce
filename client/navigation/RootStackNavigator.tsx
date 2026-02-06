/**
 * =============================================================================
 * ROOT STACK NAVIGATOR
 * =============================================================================
 *
 * The top-level navigation structure for ChefSpAIce.
 * Controls the main navigation flow based on auth, guest, and onboarding state.
 *
 * NAVIGATION STRUCTURE:
 *
 * RootStack (this file)
 * ├── Onboarding - First-time user setup (for new guests)
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
 * GUEST USER FLOW (Apple-compliant):
 * - New mobile users start as guests with a trial period
 * - Guest ID and trial start date are stored locally
 * - Flow: New user → Onboarding → Main (during trial)
 * - When trial expires → Subscription screen
 * - Registration is optional and enables cloud sync
 *
 * NAVIGATION PRIORITY:
 * 1. Web + unauthenticated → Landing
 * 2. Guest trial expired → TrialExpired
 * 3. Authenticated + subscription inactive → Subscription
 * 4. Needs onboarding → Onboarding
 * 5. Otherwise → Main
 *
 * @module navigation/RootStackNavigator
 */

import React, { useState, useEffect, useRef } from "react";
import { View, ActivityIndicator, StyleSheet, Platform } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { CommonActions, useNavigation } from "@react-navigation/native";
import { logger } from "@/lib/logger";
import { consumePendingDeepLink } from '@/lib/deep-linking';
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
import TrialExpiredScreen from "@/screens/TrialExpiredScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { storage } from "@/lib/storage";
import { AppColors } from "@/constants/theme";

const isWeb = Platform.OS === "web";
const TRIAL_DURATION_DAYS = 7;

export type RootStackParamList = {
  SignIn: undefined;
  Auth:
    | { selectedTier?: "basic" | "pro"; billingPeriod?: "monthly" | "annual" }
    | undefined;
  Main: undefined;
  Onboarding: undefined;
  Landing: undefined;
  LogoPreview: undefined;
  Subscription: { reason?: "expired" | "resubscribe" } | undefined;
  TrialExpired: undefined;
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
  const { isActive, isLoading: subscriptionLoading } = useSubscription();
  const [isLoading, setIsLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [isTrialExpired, setIsTrialExpired] = useState(false);
  const hasInitialized = useRef(false);
  const prevAuthState = useRef({ isAuthenticated });
  const prevSubscriptionState = useRef({ isActive, subscriptionLoading });

  useEffect(() => {
    checkOnboardingAndGuestStatus();
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
      logger.log(
        `[Nav] Subscription lost, redirecting to ${target} (needsOnboarding: ${needsOnboarding})`,
      );
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: target, params: { reason: "expired" } }],
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
        logger.log(
          "[Nav] Subscription gained but needs onboarding, staying in current flow",
        );
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

  useEffect(() => {
    if (isLoading || authLoading || subscriptionLoading) return;
    if (!isAuthenticated && !(!isWeb && !isTrialExpired)) return;
    if (needsOnboarding) return;
    if (isAuthenticated && !isActive) return;

    const timer = setTimeout(async () => {
      const pending = await consumePendingDeepLink();
      if (!pending) return;

      const { path } = pending;
      logger.log(`[DeepLink] Consuming pending deep link: ${path}`);

      if (path.startsWith('recipe/')) {
        const recipeId = path.replace('recipe/', '');
        if (recipeId) {
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{
                name: 'Main',
                state: {
                  routes: [{
                    name: 'Tabs',
                    state: {
                      routes: [{
                        name: 'RecipesTab',
                        state: {
                          routes: [
                            { name: 'Recipes' },
                            { name: 'RecipeDetail', params: { recipeId } },
                          ],
                        },
                      }],
                    },
                  }],
                },
              }],
            })
          );
        }
      } else if (path === 'inventory') {
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{
              name: 'Main',
              state: {
                routes: [{
                  name: 'Tabs',
                  state: {
                    routes: [{ name: 'KitchenTab' }],
                  },
                }],
              },
            }],
          })
        );
      } else if (path === 'scan') {
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [
              { name: 'Main' },
              { name: 'ScanHub' },
            ],
          })
        );
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [isLoading, authLoading, subscriptionLoading, isAuthenticated, isActive, needsOnboarding, isTrialExpired, navigation]);

  const checkTrialExpired = (trialStartDate: string): boolean => {
    const startDate = new Date(trialStartDate);
    const now = new Date();
    const diffTime = now.getTime() - startDate.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    return diffDays > TRIAL_DURATION_DAYS;
  };

  const checkOnboardingAndGuestStatus = async () => {
    try {
      // Check onboarding status
      const needs = await storage.needsOnboarding();
      logger.log(`[Nav] Onboarding check: needsOnboarding=${needs}`);
      setNeedsOnboarding(needs);

      // For mobile users, initialize or retrieve guest user info
      if (!isWeb && !isAuthenticated) {
        const guest = await storage.initializeGuestUser();

        // Check if trial has expired
        const expired = checkTrialExpired(guest.trialStartDate);
        setIsTrialExpired(expired);
        logger.log(
          `[Nav] Guest user: id=${guest.guestId}, trialStart=${guest.trialStartDate}, expired=${expired}`,
        );
      } else {
        // For authenticated users, trial expiration doesn't apply
        // Subscription status is checked separately
        setIsTrialExpired(false);
      }
    } catch (err) {
      console.error("[Nav] Error checking onboarding/guest status:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || authLoading || subscriptionLoading) {
    return <LoadingScreen />;
  }

  // Determine initial route with guest user support:
  // Priority order:
  // 1. Web + unauthenticated → Landing (marketing page)
  // 2. Guest trial expired → TrialExpired (must register/subscribe to continue)
  // 3. Authenticated + subscription inactive → Subscription (resubscribe)
  // 4. Needs onboarding → Onboarding (first-time setup)
  // 5. Otherwise → Main (active trial or subscription)
  const getInitialRoute = (): keyof RootStackParamList => {
    // Show landing page for web users who aren't authenticated
    if (isWeb && !isAuthenticated) {
      logger.log("[Nav] Initial route: Landing (web, unauthenticated)");
      return "Landing";
    }

    // For mobile guest users (not authenticated)
    if (!isAuthenticated) {
      // Check if trial has expired - show trial expired screen for guests
      if (isTrialExpired) {
        logger.log(
          "[Nav] Initial route: TrialExpired (guest trial expired)",
        );
        return "TrialExpired";
      }

      // New guest user or returning guest who needs onboarding
      if (needsOnboarding) {
        logger.log(
          "[Nav] Initial route: Onboarding (new guest or needs onboarding)",
        );
        return "Onboarding";
      }

      // Returning guest with active trial - go to main app
      logger.log(
        "[Nav] Initial route: Main (guest with active trial)",
      );
      return "Main";
    }

    // For authenticated users
    // User needs onboarding - send to Onboarding first
    if (needsOnboarding) {
      logger.log("[Nav] Initial route: Onboarding (authenticated, needsOnboarding=true)");
      return "Onboarding";
    }

    // Authenticated user with no active subscription - send to Subscription to resubscribe
    if (!isActive) {
      logger.log("[Nav] Initial route: Subscription (authenticated, inactive subscription)");
      return "Subscription";
    }

    logger.log(
      "[Nav] Initial route: Main (authenticated, onboarding complete, active subscription)",
    );
    return "Main";
  };

  return (
    <Stack.Navigator
      screenOptions={screenOptions}
      initialRouteName={getInitialRoute()}
    >
      <Stack.Screen name="Landing" options={{ headerShown: false }}>
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
        name="TrialExpired"
        component={TrialExpiredScreen}
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
