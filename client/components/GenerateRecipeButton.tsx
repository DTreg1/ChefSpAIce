import React, { useCallback } from "react";
import { ViewStyle } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { storage, FoodItem } from "@/lib/storage";

interface GenerateRecipeButtonProps {
  style?: ViewStyle;
  variant?: "primary" | "secondary" | "outline" | "ghost";
  label?: string;
  onBeforeNavigate?: () => void;
}

const EXPIRING_THRESHOLD_DAYS = 5;

function calculateDaysUntilExpiry(
  expiryDate: string | null | undefined,
): number | null {
  if (!expiryDate) return null;
  const expiry = new Date(expiryDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);
  const diffTime = expiry.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function GenerateRecipeButton({
  style,
  variant = "primary",
  label = "Generate Recipe",
  onBeforeNavigate,
}: GenerateRecipeButtonProps) {
  const { theme } = useTheme();
  const navigation = useNavigation<any>();

  const handlePress = useCallback(async () => {
    const inventory = await storage.getInventory();

    const expiringItems = inventory.filter((item: FoodItem) => {
      const daysUntilExpiry = calculateDaysUntilExpiry(item.expirationDate);
      return (
        daysUntilExpiry !== null && daysUntilExpiry <= EXPIRING_THRESHOLD_DAYS
      );
    });

    const expiringItemNames = expiringItems.map((item: FoodItem) => item.name);

    if (onBeforeNavigate) {
      onBeforeNavigate();
    }

    navigation.navigate("RecipesTab", {
      screen: "GenerateRecipe",
      params: {
        preselectedIngredientNames: expiringItemNames,
        prioritizeExpiring: true,
      },
    });
  }, [navigation, onBeforeNavigate]);

  return (
    <Button
      onPress={handlePress}
      variant={variant}
      icon={<Feather name="book-open" size={16} color="#FFFFFF" />}
      style={style}
    >
      {label}
    </Button>
  );
}

export async function getGenerateRecipeParams(): Promise<{
  preselectedIngredientNames: string[];
  prioritizeExpiring: boolean;
}> {
  const inventory = await storage.getInventory();

  const expiringItems = inventory.filter((item: FoodItem) => {
    const daysUntilExpiry = calculateDaysUntilExpiry(item.expirationDate);
    return (
      daysUntilExpiry !== null && daysUntilExpiry <= EXPIRING_THRESHOLD_DAYS
    );
  });

  const expiringItemNames = expiringItems.map((item: FoodItem) => item.name);

  return {
    preselectedIngredientNames: expiringItemNames,
    prioritizeExpiring: true,
  };
}
