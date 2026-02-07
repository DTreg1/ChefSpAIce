import { FoodItem } from "@/lib/storage";

export type FoodGroup = "grains" | "vegetables" | "fruits" | "protein" | "dairy";

export function calculateNutritionTotals(itemList: FoodItem[]) {
  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;
  let itemsWithNutrition = 0;

  itemList.forEach((item) => {
    if (item.nutrition) {
      totalCalories += item.nutrition.calories * item.quantity;
      totalProtein += item.nutrition.protein * item.quantity;
      totalCarbs += item.nutrition.carbs * item.quantity;
      totalFat += item.nutrition.fat * item.quantity;
      itemsWithNutrition++;
    }
  });

  return {
    calories: Math.round(totalCalories),
    protein: Math.round(totalProtein),
    carbs: Math.round(totalCarbs),
    fat: Math.round(totalFat),
    itemsWithNutrition,
  };
}

export const FOOD_GROUPS: { key: FoodGroup; label: string }[] = [
  { key: "grains", label: "Grains" },
  { key: "vegetables", label: "Vegetables" },
  { key: "fruits", label: "Fruits" },
  { key: "protein", label: "Protein" },
  { key: "dairy", label: "Dairy" },
];

export const CATEGORY_TO_FOOD_GROUP: Record<string, FoodGroup> = {
  dairy: "dairy",
  meat: "protein",
  seafood: "protein",
  bread: "grains",
  grains: "grains",
  bakery: "grains",
  fruit: "fruits",
  fruits: "fruits",
  vegetable: "vegetables",
  vegetables: "vegetables",
  protein: "protein",
};

export const FRUIT_NAMES = [
  "apple",
  "banana",
  "orange",
  "grape",
  "berry",
  "strawberry",
  "blueberry",
  "raspberry",
  "mango",
  "pineapple",
  "watermelon",
  "melon",
  "peach",
  "pear",
  "cherry",
  "lemon",
  "lime",
  "kiwi",
  "avocado",
  "plum",
  "grapefruit",
];

export const getItemFoodGroup = (item: FoodItem): FoodGroup | null => {
  const categoryLower = item.category.toLowerCase().trim();
  const nameLower = item.name.toLowerCase().trim();

  if (CATEGORY_TO_FOOD_GROUP[categoryLower]) {
    return CATEGORY_TO_FOOD_GROUP[categoryLower];
  }

  if (categoryLower === "produce") {
    const isFruit = FRUIT_NAMES.some((fruit) => nameLower.includes(fruit));
    return isFruit ? "fruits" : "vegetables";
  }

  if (
    nameLower.includes("milk") ||
    nameLower.includes("cheese") ||
    nameLower.includes("yogurt")
  ) {
    return "dairy";
  }

  if (
    nameLower.includes("chicken") ||
    nameLower.includes("beef") ||
    nameLower.includes("pork") ||
    nameLower.includes("turkey") ||
    nameLower.includes("salmon") ||
    nameLower.includes("tuna") ||
    nameLower.includes("shrimp") ||
    nameLower.includes("fish") ||
    nameLower === "eggs"
  ) {
    return "protein";
  }

  if (
    nameLower.includes("bread") ||
    nameLower.includes("pasta") ||
    nameLower.includes("rice") ||
    nameLower.includes("cereal") ||
    nameLower.includes("oat")
  ) {
    return "grains";
  }

  const isFruit = FRUIT_NAMES.some((fruit) => nameLower.includes(fruit));
  if (isFruit) return "fruits";

  return null;
};
