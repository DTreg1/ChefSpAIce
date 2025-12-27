import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MealPlanScreen from "@/screens/MealPlanScreen";
import ShoppingListScreen from "@/screens/ShoppingListScreen";
import SelectRecipeScreen from "@/screens/SelectRecipeScreen";
import { HamburgerButton } from "@/components/HamburgerButton";
import { useScreenOptions } from "@/hooks/useScreenOptions";

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
        component={MealPlanScreen}
        options={{
          headerTitle: "Meal Plan",
          headerLeft: () => <HamburgerButton />,
        }}
      />
      <Stack.Screen
        name="ShoppingList"
        component={ShoppingListScreen}
        options={({ navigation }) => ({
          headerTitle: "Shopping List",
          headerLeft: navigation.canGoBack()
            ? undefined
            : () => <HamburgerButton />,
        })}
      />
      <Stack.Screen
        name="SelectRecipe"
        component={SelectRecipeScreen}
        options={{
          headerTitle: "Select Recipe",
        }}
      />
    </Stack.Navigator>
  );
}
