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
import ScanHubScreen from "@/screens/ScanHubScreen";
import RecipeScannerScreen from "@/screens/RecipeScannerScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { useAuth } from "@/contexts/AuthContext";
import { storage } from "@/lib/storage";
import { AppColors } from "@/constants/theme";

export type RootStackParamList = {
  Main: undefined;
  Onboarding: undefined;
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
  const { isAuthenticated, isGuest, isLoading: authLoading, setSignOutCallback } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const hasInitialized = useRef(false);
  const prevAuthState = useRef({ isAuthenticated, isGuest });

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  // Set up sign out callback to navigate to Onboarding
  useEffect(() => {
    setSignOutCallback(() => {
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: "Onboarding" }],
        })
      );
    });
  }, [navigation, setSignOutCallback]);

  // Monitor auth state changes and redirect when user becomes unauthenticated
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      prevAuthState.current = { isAuthenticated, isGuest };
      return;
    }

    // If user was authenticated but now is not (and not guest), redirect appropriately
    const wasAuthenticated = prevAuthState.current.isAuthenticated || prevAuthState.current.isGuest;
    const isNowUnauthenticated = !isAuthenticated && !isGuest;

    if (wasAuthenticated && isNowUnauthenticated) {
      // Redirect to Onboarding for authentication
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: "Onboarding" }],
        })
      );
    }

    prevAuthState.current = { isAuthenticated, isGuest };
  }, [isAuthenticated, isGuest, navigation, needsOnboarding]);

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

  if (isLoading || authLoading) {
    return <LoadingScreen />;
  }

  // Determine initial route:
  // 1. Not authenticated and not guest → Onboarding (includes sign-in UI)
  // 2. Otherwise → Main
  const getInitialRoute = (): keyof RootStackParamList => {
    if (!isAuthenticated && !isGuest) {
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
