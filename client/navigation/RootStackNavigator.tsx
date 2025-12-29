import React, { useState, useEffect, useRef } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
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
import SignInScreen from "@/screens/SignInScreen";
import PricingScreen from "@/screens/PricingScreen";
import ScanHubScreen from "@/screens/ScanHubScreen";
import RecipeScannerScreen from "@/screens/RecipeScannerScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { storage } from "@/lib/storage";
import { AppColors } from "@/constants/theme";

export type RootStackParamList = {
  SignIn: undefined;
  Main: undefined;
  Onboarding: undefined;
  Pricing: undefined;
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
  const { isAuthenticated, isLoading: authLoading, setSignOutCallback } = useAuth();
  const { isActive, isLoading: subscriptionLoading, refresh: refreshSubscription } = useSubscription();
  const [isLoading, setIsLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const hasInitialized = useRef(false);
  const prevAuthState = useRef({ isAuthenticated });
  const prevSubscriptionState = useRef({ isActive, subscriptionLoading });

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  // Set up sign out callback to navigate to SignIn
  useEffect(() => {
    setSignOutCallback(() => {
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: "SignIn" }],
        })
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

    // If user was authenticated but now is not, redirect to SignIn
    const wasAuthenticated = prevAuthState.current.isAuthenticated;
    const isNowUnauthenticated = !isAuthenticated;

    if (wasAuthenticated && isNowUnauthenticated) {
      // Redirect to SignIn for authentication
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: "SignIn" }],
        })
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

    // Authenticated user lost subscription - redirect to Pricing
    if (isAuthenticated && wasActive && !isActive) {
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: "Pricing" }],
        })
      );
    }

    // Authenticated user gained subscription - redirect to Main
    if (isAuthenticated && !wasActive && isActive) {
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: "Main" }],
        })
      );
    }

    prevSubscriptionState.current = { isActive, subscriptionLoading };
  }, [isActive, subscriptionLoading, isAuthenticated, navigation, authLoading, isLoading]);

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
  // 1. Not authenticated → SignIn
  // 2. Authenticated but needs onboarding → Onboarding
  // 3. Authenticated but no active subscription → Pricing
  // 4. Otherwise → Main
  const getInitialRoute = (): keyof RootStackParamList => {
    if (!isAuthenticated) {
      return "SignIn";
    }
    if (needsOnboarding) {
      return "Onboarding";
    }
    if (!isActive) {
      return "Pricing";
    }
    return "Main";
  };

  return (
    <Stack.Navigator
      screenOptions={screenOptions}
      initialRouteName={getInitialRoute()}
    >
      <Stack.Screen
        name="SignIn"
        component={SignInScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Onboarding"
        component={OnboardingScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Pricing"
        component={PricingScreen}
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
          presentation: "modal",
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
          presentation: "modal",
          headerTitle: "Search Foods",
        }}
      />
      <Stack.Screen
        name="AddFoodBatch"
        component={AddFoodBatchScreen}
        options={{
          presentation: "modal",
          headerTitle: "Add Items",
        }}
      />
      <Stack.Screen
        name="ScanHub"
        component={ScanHubScreen}
        options={{
          presentation: "modal",
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
