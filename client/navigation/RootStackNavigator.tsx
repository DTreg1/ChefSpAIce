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
 * ├── Onboarding - First-time user setup
 * ├── Auth - Sign in / Sign up
 * ├── Main (DrawerNavigator)
 * │   ├── TabNavigator
 * │   │   ├── InventoryStack (Inventory, ItemDetail)
 * │   │   ├── RecipesStack (Recipes, RecipeDetail, GenerateRecipe)
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
 * NAVIGATION PRIORITY:
 * 1. Web + unauthenticated → Landing
 * 2. Not authenticated + needsOnboarding → Onboarding
 * 3. Not authenticated → Auth
 * 4. Authenticated + needsOnboarding → Onboarding
 * 5. Authenticated + subscription inactive → Subscription
 * 6. Otherwise → Main
 *
 * @module navigation/RootStackNavigator
 */

import React, { useState, useEffect, useRef } from "react";
import { View, StyleSheet, Platform, ActivityIndicator } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { CommonActions, useNavigation } from "@react-navigation/native";
import { logger } from "@/lib/logger";
import { consumePendingDeepLink } from '@/lib/deep-linking';
import { withSuspense } from "@/lib/lazy-screen";
import { IdentifiedFood } from "@/components/ImageAnalysisResult";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { storage } from "@/lib/storage";
const LazyDrawerNavigator = withSuspense(React.lazy(() => import("@/navigation/DrawerNavigator")));
const LazyAddItemScreen = withSuspense(React.lazy(() => import("@/screens/AddItemScreen")));
const LazyAddFoodBatchScreen = withSuspense(React.lazy(() => import("@/screens/AddFoodBatchScreen")));
const LazyBarcodeScannerScreen = withSuspense(React.lazy(() => import("@/screens/BarcodeScannerScreen")));
const LazyIngredientScannerScreen = withSuspense(React.lazy(() => import("@/screens/IngredientScannerScreen")));
const LazyFoodCameraScreen = withSuspense(React.lazy(() => import("@/screens/FoodCameraScreen")));
const LazyOnboardingScreen = withSuspense(React.lazy(() => import("@/screens/OnboardingScreen")));
const LazyLandingScreen = withSuspense(React.lazy(() => import("@/screens/LandingScreen")));
const LazyAuthScreen = withSuspense(React.lazy(() => import("@/screens/AuthScreen")));
const LazyScanHubScreen = withSuspense(React.lazy(() => import("@/screens/ScanHubScreen")));
const LazyRecipeScannerScreen = withSuspense(React.lazy(() => import("@/screens/RecipeScannerScreen")));
const LazyReceiptScanScreen = withSuspense(React.lazy(() => import("@/screens/ReceiptScanScreen")));
const LazyAboutScreen = withSuspense(React.lazy(() => import("@/screens/web/AboutScreen")));
const LazyPrivacyScreen = withSuspense(React.lazy(() => import("@/screens/web/PrivacyScreen")));
const LazyTermsScreen = withSuspense(React.lazy(() => import("@/screens/web/TermsScreen")));
const LazySupportScreen = withSuspense(React.lazy(() => import("@/screens/web/SupportScreen")));
const LazyAttributionsScreen = withSuspense(React.lazy(() => import("@/screens/web/AttributionsScreen")));
const LazySubscriptionScreen = withSuspense(React.lazy(() => import("@/screens/SubscriptionScreen")));
const LazyGrocerySearchScreen = withSuspense(React.lazy(() => import("@/screens/GrocerySearchScreen")));

const isWeb = Platform.OS === "web";

export type RootStackParamList = {
  SignIn: undefined;
  Auth:
    | { selectedTier?: "pro"; billingPeriod?: "monthly" | "annual" }
    | undefined;
  Main: undefined;
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

const Stack = createNativeStackNavigator<RootStackParamList>();

function LoadingScreen() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" />
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
    user,
  } = useAuth();
  const { isActive, isLoading: subscriptionLoading } = useSubscription();
  const [isLoading, setIsLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(true);
  const hasInitialized = useRef(false);
  const prevAuthState = useRef({ isAuthenticated });
  const prevSubscriptionState = useRef({ isActive, subscriptionLoading });

  useEffect(() => {
    checkOnboardingStatus();
  }, [isAuthenticated, user?.hasCompletedOnboarding]);

  // Set up sign out callback to navigate to the appropriate screen
  // After account deletion, onboarding is reset so user should see Onboarding
  // After regular sign out, user should see Auth (mobile) or Landing (web)
  useEffect(() => {
    setSignOutCallback(async () => {
      if (isWeb) {
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: "Landing" }],
          }),
        );
        return;
      }

      let needs = false;
      try {
        needs = await storage.needsOnboarding();
      } catch (err) {
        logger.error("[Nav] Error checking onboarding in sign-out callback:", err);
      }
      logger.log(`[Nav] Sign-out callback: needsOnboarding=${needs}`);
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: needs ? "Onboarding" : "Auth" }],
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

    // If user was authenticated but now is not, redirect appropriately
    const wasAuthenticated = prevAuthState.current.isAuthenticated;
    const isNowUnauthenticated = !isAuthenticated;

    if (wasAuthenticated && isNowUnauthenticated) {
      (async () => {
        if (isWeb) {
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: "Landing" }],
            }),
          );
          return;
        }

        let needs = false;
        try {
          needs = await storage.needsOnboarding();
        } catch (err) {
          logger.error("[Nav] Error checking onboarding in auth change:", err);
        }
        logger.log(`[Nav] Auth state change: needsOnboarding=${needs}`);
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: needs ? "Onboarding" : "Auth" }],
          }),
        );
      })();
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
    if (!isAuthenticated) return;
    if (needsOnboarding) return;
    if (!isActive) return;

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
  }, [isLoading, authLoading, subscriptionLoading, isAuthenticated, isActive, needsOnboarding, navigation]);

  const checkOnboardingStatus = async () => {
    try {
      if (isAuthenticated && user) {
        const needs = !(user.hasCompletedOnboarding ?? false);
        logger.log(`[Nav] Onboarding check (server): needsOnboarding=${needs}`);
        setNeedsOnboarding(needs);
      } else {
        const needs = await storage.needsOnboarding();
        logger.log(`[Nav] Onboarding check (local): needsOnboarding=${needs}`);
        setNeedsOnboarding(needs);
      }
    } catch (err) {
      logger.error("[Nav] Error checking onboarding status:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || authLoading || subscriptionLoading) {
    return <LoadingScreen />;
  }

  const getInitialRoute = (): keyof RootStackParamList => {
    if (isWeb && !isAuthenticated) {
      logger.log("[Nav] Initial route: Landing (web, unauthenticated)");
      return "Landing";
    }

    if (!isAuthenticated && needsOnboarding) {
      logger.log("[Nav] Initial route: Onboarding (unauthenticated, needs onboarding)");
      return "Onboarding";
    }

    if (!isAuthenticated) {
      logger.log("[Nav] Initial route: Auth (unauthenticated)");
      return "Auth";
    }

    if (needsOnboarding) {
      logger.log("[Nav] Initial route: Onboarding (authenticated, needsOnboarding=true)");
      return "Onboarding";
    }

    if (!isActive) {
      logger.log("[Nav] Initial route: Subscription (authenticated, inactive subscription)");
      return "Subscription";
    }

    logger.log("[Nav] Initial route: Main (authenticated, active subscription)");
    return "Main";
  };

  return (
    <Stack.Navigator
      screenOptions={screenOptions}
      initialRouteName={getInitialRoute()}
    >
      <Stack.Screen name="Landing" options={{ headerShown: false }}>
        {(props) => (
          <LazyLandingScreen
            onAbout={() => props.navigation.navigate("About")}
            onPrivacy={() => props.navigation.navigate("Privacy")}
            onTerms={() => props.navigation.navigate("Terms")}
            onSupport={() => props.navigation.navigate("Support")}
          />
        )}
      </Stack.Screen>
      <Stack.Screen
        name="Auth"
        component={LazyAuthScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Onboarding"
        component={LazyOnboardingScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Main"
        component={LazyDrawerNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Subscription"
        component={LazySubscriptionScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AddItem"
        component={LazyAddItemScreen}
        options={{
          presentation: "fullScreenModal",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="BarcodeScanner"
        component={LazyBarcodeScannerScreen}
        options={{
          presentation: "fullScreenModal",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="FoodCamera"
        component={LazyFoodCameraScreen}
        options={{
          presentation: "fullScreenModal",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="IngredientScanner"
        component={LazyIngredientScannerScreen}
        options={{
          presentation: "fullScreenModal",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="AddFoodBatch"
        component={LazyAddFoodBatchScreen}
        options={{
          presentation: "fullScreenModal",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="ScanHub"
        component={LazyScanHubScreen}
        options={{
          presentation: "fullScreenModal",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="RecipeScanner"
        component={LazyRecipeScannerScreen}
        options={{
          presentation: "fullScreenModal",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="ReceiptScan"
        component={LazyReceiptScanScreen}
        options={{
          presentation: "fullScreenModal",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="GrocerySearch"
        component={LazyGrocerySearchScreen}
        options={{
          presentation: "fullScreenModal",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="About"
        component={LazyAboutScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Privacy"
        component={LazyPrivacyScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Terms"
        component={LazyTermsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Support"
        component={LazySupportScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Attributions"
        component={LazyAttributionsScreen}
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
