import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import RecipesScreen from "@/screens/RecipesScreen";
import RecipeDetailScreen from "@/screens/RecipeDetailScreen";
import GenerateRecipeScreen from "@/screens/GenerateRecipeScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import type { Recipe } from "@/lib/storage";

export type RecipeSettings = {
  servings: number;
  maxTime: number;
  mealType: "breakfast" | "lunch" | "dinner" | "snack" | "late night snack";
  ingredientCount: { min: number; max: number };
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
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="RecipeDetail"
        component={RecipeDetailScreen}
        options={{
          headerShown: false,
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
    </Stack.Navigator>
  );
}
