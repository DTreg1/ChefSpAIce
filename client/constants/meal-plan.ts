interface MealSlot {
  id: string;
  name: string;
  icon: "sunrise" | "sun" | "moon" | "coffee" | "sunset";
  order: number;
}

interface MealPlanPreset {
  id: string;
  name: string;
  description: string;
  slots: MealSlot[];
}

export const MEAL_PLAN_PRESETS: MealPlanPreset[] = [
  {
    id: "two_meals",
    name: "2 Meals",
    description: "Lunch and Dinner",
    slots: [
      { id: "lunch", name: "Lunch", icon: "sun", order: 1 },
      { id: "dinner", name: "Dinner", icon: "moon", order: 2 },
    ],
  },
  {
    id: "classic",
    name: "Classic (3 meals)",
    description: "Breakfast, Lunch, Dinner",
    slots: [
      { id: "breakfast", name: "Breakfast", icon: "sunrise", order: 1 },
      { id: "lunch", name: "Lunch", icon: "sun", order: 2 },
      { id: "dinner", name: "Dinner", icon: "moon", order: 3 },
    ],
  },
  {
    id: "with_snacks",
    name: "With Snacks (5 meals)",
    description: "3 meals + morning and afternoon snacks",
    slots: [
      { id: "breakfast", name: "Breakfast", icon: "sunrise", order: 1 },
      { id: "morning_snack", name: "Morning Snack", icon: "coffee", order: 2 },
      { id: "lunch", name: "Lunch", icon: "sun", order: 3 },
      {
        id: "afternoon_snack",
        name: "Afternoon Snack",
        icon: "coffee",
        order: 4,
      },
      { id: "dinner", name: "Dinner", icon: "moon", order: 5 },
    ],
  },
  {
    id: "four_meals",
    name: "4 Meals",
    description: "Breakfast, Lunch, Snack, Dinner",
    slots: [
      { id: "breakfast", name: "Breakfast", icon: "sunrise", order: 1 },
      { id: "lunch", name: "Lunch", icon: "sun", order: 2 },
      { id: "snack", name: "Snack", icon: "coffee", order: 3 },
      { id: "dinner", name: "Dinner", icon: "moon", order: 4 },
    ],
  },
  {
    id: "six_meals",
    name: "6 Small Meals",
    description: "For frequent small meals throughout the day",
    slots: [
      { id: "breakfast", name: "Breakfast", icon: "sunrise", order: 1 },
      { id: "mid_morning", name: "Mid-Morning", icon: "coffee", order: 2 },
      { id: "lunch", name: "Lunch", icon: "sun", order: 3 },
      { id: "afternoon", name: "Afternoon", icon: "coffee", order: 4 },
      { id: "dinner", name: "Dinner", icon: "sunset", order: 5 },
      { id: "evening", name: "Evening", icon: "moon", order: 6 },
    ],
  },
];

export const DEFAULT_PRESET_ID = "classic";

export function getPresetById(id: string): MealPlanPreset {
  return MEAL_PLAN_PRESETS.find((p) => p.id === id) || MEAL_PLAN_PRESETS[1];
}

const DAILY_MEALS_TO_PRESET: Record<number, string> = {
  2: "two_meals",
  3: "classic",
  4: "four_meals",
  5: "with_snacks",
};

export function getPresetIdForDailyMeals(dailyMeals: number): string {
  return DAILY_MEALS_TO_PRESET[dailyMeals] || DEFAULT_PRESET_ID;
}
