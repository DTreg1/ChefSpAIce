import React from "react";
import { View, StyleSheet } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import RecipesScreen from "@/screens/RecipesScreen";
import RecipeDetailScreen from "@/screens/RecipeDetailScreen";
import GenerateRecipeScreen from "@/screens/GenerateRecipeScreen";
import { HeaderTitle } from "@/components/HeaderTitle";
import { HeaderSearch } from "@/components/HeaderSearch";
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

function RecipesHeaderLeft() {
  return (
    <View style={styles.headerLeftContainer}>
      <HamburgerButton />
      <HeaderSearch screenKey="recipes" placeholder="Search recipes..." />
    </View>
  );
}

export default function RecipesStackNavigator() {
  const screenOptions = useScreenOptions({ transparent: false });

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Recipes"
        component={RecipesScreen}
        options={{
          headerTitle: () => <HeaderTitle title="Recipes" materialIcon="notebook-heart-outline" />,
          headerLeft: () => <RecipesHeaderLeft />,
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
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  headerLeftContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
});
