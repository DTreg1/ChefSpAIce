import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { withSuspense } from "@/lib/lazy-screen";
import { HamburgerButton } from "@/navigation/HamburgerButton";
import { useScreenOptions } from "@/hooks/useScreenOptions";

const LazyMealPlanScreen = withSuspense(React.lazy(() => import("@/screens/MealPlanScreen")));
const LazyShoppingListScreen = withSuspense(React.lazy(() => import("@/screens/ShoppingListScreen")));
const LazySelectRecipeScreen = withSuspense(React.lazy(() => import("@/screens/SelectRecipeScreen")));

export type MealPlanStackParamList = {
  MealPlan: undefined;
  ShoppingList: undefined;
  SelectRecipe: {
    date: string;
    mealType: string;
  };
};

const Stack = createNativeStackNavigator<MealPlanStackParamList>();

export default function MealPlanStackNavigator() {
  const screenOptions = useScreenOptions({ transparent: false });

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="MealPlan"
        component={LazyMealPlanScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="ShoppingList"
        component={LazyShoppingListScreen}
        options={({ navigation }) => ({
          headerTitle: "Shopping List",
          headerLeft: navigation.canGoBack()
            ? undefined
            : () => <HamburgerButton />,
        })}
      />
      <Stack.Screen
        name="SelectRecipe"
        component={LazySelectRecipeScreen}
        options={{
          headerTitle: "Select Recipe",
        }}
      />
    </Stack.Navigator>
  );
}
