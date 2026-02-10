import { AppColors } from "@/constants/theme";

export type FoodSource = "usda" | "openfoodfacts";

export const SOURCE_BADGE_COLORS: Record<FoodSource, { bg: string; text: string }> = {
  usda: { bg: "rgba(52, 152, 219, 0.15)", text: AppColors.accent },
  openfoodfacts: { bg: "rgba(39, 174, 96, 0.15)", text: AppColors.sourceOpenFoodFacts },
};

export const SOURCE_LABELS: Record<FoodSource, string> = {
  usda: "USDA",
  openfoodfacts: "OFF",
};
