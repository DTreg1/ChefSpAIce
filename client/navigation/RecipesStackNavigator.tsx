import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { withSuspense } from "@/lib/lazy-screen";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import type { Recipe } from "@/lib/storage";

const LazyRecipesScreen = withSuspense(React.lazy(() => import("@/screens/RecipesScreen")));
const LazyRecipeDetailScreen = withSuspense(React.lazy(() => import("@/screens/RecipeDetailScreen")));
const LazyGenerateRecipeScreen = withSuspense(React.lazy(() => import("@/screens/GenerateRecipeScreen")));

export type RecipeSettings = {
  servings: number;
  maxTime: number;
  mealType: "breakfast" | "lunch" | "dinner" | "snack" | "late night snack";
  ingredientCount: { min: number; max: number };
  cuisine?: string;
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
};

const Stack = createNativeStackNavigator<RecipesStackParamList>();

export default function RecipesStackNavigator() {
  const screenOptions = useScreenOptions({ transparent: false });

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Recipes"
        component={LazyRecipesScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="RecipeDetail"
        component={LazyRecipeDetailScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="GenerateRecipe"
        component={LazyGenerateRecipeScreen}
        options={{
          presentation: "modal",
          headerTitle: "Generate Recipe",
        }}
      />
    </Stack.Navigator>
  );
}
