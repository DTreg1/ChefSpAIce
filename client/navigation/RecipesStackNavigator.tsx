import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import RecipesScreen from "@/screens/RecipesScreen";
import RecipeDetailScreen from "@/screens/RecipeDetailScreen";
import GenerateRecipeScreen from "@/screens/GenerateRecipeScreen";
import ChatScreen from "@/screens/ChatScreen";
import { HamburgerButton } from "@/components/HamburgerButton";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import type { Recipe } from "@/lib/storage";

export type RecipesStackParamList = {
  Recipes: undefined;
  RecipeDetail: { recipeId: string; initialRecipe?: Recipe };
  GenerateRecipe:
    | {
        preselectedIngredientNames?: string[];
        prioritizeExpiring?: boolean;
      }
    | undefined;
  Chat: undefined;
};

const Stack = createNativeStackNavigator<RecipesStackParamList>();

export default function RecipesStackNavigator() {
  const screenOptions = useScreenOptions({ transparent: false });

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Recipes"
        component={RecipesScreen}
        options={{
          headerTitle: "Recipes",
          headerLeft: () => <HamburgerButton />,
        }}
      />
      <Stack.Screen
        name="RecipeDetail"
        component={RecipeDetailScreen}
        options={{
          headerTitle: "Recipe",
        }}
      />
      <Stack.Screen
        name="GenerateRecipe"
        component={GenerateRecipeScreen}
        options={{
          presentation: "modal",
          headerTitle: "Generate Recipe",
        }}
      />
      <Stack.Screen
        name="Chat"
        component={ChatScreen}
        options={{
          headerTitle: "Kitchen Assistant",
        }}
      />
    </Stack.Navigator>
  );
}
