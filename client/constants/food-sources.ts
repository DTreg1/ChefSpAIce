import { AppColors } from "@/constants/theme";

export type FoodSource = "usda" | "openfoodfacts" | "local";

export const SOURCE_BADGE_COLORS: Record<FoodSource, { bg: string; text: string }> = {
  usda: { bg: "rgba(52, 152, 219, 0.15)", text: AppColors.accent },
  openfoodfacts: { bg: "rgba(39, 174, 96, 0.15)", text: AppColors.sourceOpenFoodFacts },
  local: { bg: "rgba(108, 117, 125, 0.15)", text: AppColors.sourceLocal },
};

export const SOURCE_LABELS: Record<FoodSource, string> = {
  usda: "USDA",
  openfoodfacts: "OFF",
  local: "Local",
};
