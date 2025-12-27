import type { NutritionInfo } from "./storage";
import { AppColors } from "@/constants/theme";

export interface NutritionScoreResult {
  score: number;
  grade: "A" | "B" | "C" | "D" | "E" | "?";
  label: string;
  color: string;
  isIncomplete: boolean;
  completenessLevel: "full" | "partial" | "minimal";
}

export function calculateNutritionScore(nutrition: NutritionInfo): NutritionScoreResult {
  const { calories, protein, carbs, fat, fiber, sugar, sodium } = nutrition;

  const hasFiber = fiber !== undefined && fiber !== null;
  const hasSugar = sugar !== undefined && sugar !== null;
  const hasSodium = sodium !== undefined && sodium !== null;

  const optionalFieldCount = [hasFiber, hasSugar, hasSodium].filter(Boolean).length;
  const completenessLevel: "full" | "partial" | "minimal" =
    optionalFieldCount === 3 ? "full" :
    optionalFieldCount >= 1 ? "partial" : "minimal";

  if (completenessLevel === "minimal") {
    return {
      score: 0,
      grade: "?",
      label: "Incomplete",
      color: AppColors.textSecondary,
      isIncomplete: true,
      completenessLevel,
    };
  }

  let score = 50;

  const calorieRatio = calories > 0 ? 100 / calories : 1;
  const proteinPer100Cal = (protein * calorieRatio);
  const fiberPer100Cal = hasFiber ? ((fiber || 0) * calorieRatio) : 0;
  const sugarPer100Cal = hasSugar ? ((sugar || 0) * calorieRatio) : 0;
  const sodiumPer100Cal = hasSodium ? ((sodium || 0) * calorieRatio) : 0;

  if (proteinPer100Cal >= 8) {
    score += 12;
  } else if (proteinPer100Cal >= 5) {
    score += 8;
  } else if (proteinPer100Cal >= 3) {
    score += 4;
  }

  if (hasFiber) {
    if (fiberPer100Cal >= 3) {
      score += 10;
    } else if (fiberPer100Cal >= 1.5) {
      score += 6;
    } else if (fiberPer100Cal >= 0.5) {
      score += 2;
    }
  }

  if (hasSugar) {
    if (sugarPer100Cal <= 2) {
      score += 8;
    } else if (sugarPer100Cal <= 5) {
      score += 4;
    } else if (sugarPer100Cal <= 10) {
      score -= 2;
    } else if (sugarPer100Cal <= 20) {
      score -= 8;
    } else {
      score -= 12;
    }
  }

  if (hasSodium) {
    if (sodiumPer100Cal <= 50) {
      score += 4;
    } else if (sodiumPer100Cal <= 150) {
      score += 0;
    } else if (sodiumPer100Cal <= 300) {
      score -= 4;
    } else {
      score -= 8;
    }
  }

  const totalMacros = protein + carbs + fat;
  if (totalMacros > 0) {
    const proteinRatio = protein / totalMacros;
    const fatRatio = fat / totalMacros;

    if (proteinRatio >= 0.30 && proteinRatio <= 0.40) {
      score += 4;
    }
    if (fatRatio > 0.55) {
      score -= 4;
    }
  }

  if (completenessLevel === "partial") {
    const partialPenalty = (3 - optionalFieldCount) * 3;
    score = Math.max(35, score - partialPenalty);
  }

  score = Math.max(0, Math.min(100, score));

  let grade: "A" | "B" | "C" | "D" | "E" | "?";
  let label: string;
  let color: string;

  if (score >= 80) {
    grade = "A";
    label = "Excellent";
    color = AppColors.success;
  } else if (score >= 65) {
    grade = "B";
    label = "Good";
    color = "#82C341";
  } else if (score >= 50) {
    grade = "C";
    label = "Fair";
    color = AppColors.warning;
  } else if (score >= 35) {
    grade = "D";
    label = "Poor";
    color = AppColors.secondary;
  } else {
    grade = "E";
    label = "Low";
    color = AppColors.error;
  }

  return {
    score,
    grade,
    label,
    color,
    isIncomplete: completenessLevel !== "full",
    completenessLevel,
  };
}

export function getScoreDescription(result: NutritionScoreResult): string {
  if (result.isIncomplete && result.grade === "?") {
    return "Not enough nutrition data to calculate score";
  }

  switch (result.grade) {
    case "A":
      return "High protein, low sugar, nutrient-dense";
    case "B":
      return "Good nutritional balance";
    case "C":
      return "Moderate nutritional value";
    case "D":
      return "Consider healthier alternatives";
    case "E":
      return "Limit consumption";
    default:
      return "Score based on partial data";
  }
}
