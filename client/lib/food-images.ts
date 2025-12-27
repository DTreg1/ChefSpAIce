import { ImageSourcePropType } from "react-native";

export const CATEGORY_IMAGES: Record<string, ImageSourcePropType> = {
  "Dairy and Egg Products": require("@/assets/food-images/dairy_products_category_icon.png"),
  "Vegetables and Vegetable Products": require("@/assets/food-images/fresh_produce_category_icon.png"),
  "Fruits and Fruit Juices": require("@/assets/food-images/fresh_produce_category_icon.png"),
  "Cereal Grains and Pasta": require("@/assets/food-images/grains_and_pasta_category_icon.png"),
  "Poultry Products": require("@/assets/food-images/meat_and_poultry_category_icon.png"),
  "Beef Products": require("@/assets/food-images/meat_and_poultry_category_icon.png"),
  "Pork Products": require("@/assets/food-images/meat_and_poultry_category_icon.png"),
  "Finfish and Shellfish Products": require("@/assets/food-images/meat_and_poultry_category_icon.png"),
  "Fats and Oils": require("@/assets/food-images/fats_and_oils_category_icon.png"),
  "Baked Products": require("@/assets/food-images/baked_goods_category_icon.png"),
  Beverages: require("@/assets/food-images/beverages_category_icon.png"),
  "Legumes and Legume Products": require("@/assets/food-images/fresh_produce_category_icon.png"),
  "Nuts and Seed Products": require("@/assets/food-images/grains_and_pasta_category_icon.png"),
  "Spices and Herbs": require("@/assets/food-images/fresh_produce_category_icon.png"),
  Sweets: require("@/assets/food-images/baked_goods_category_icon.png"),
  Snacks: require("@/assets/food-images/baked_goods_category_icon.png"),
  "Soups, Sauces, and Gravies": require("@/assets/food-images/beverages_category_icon.png"),
  "Baby Foods": require("@/assets/food-images/dairy_products_category_icon.png"),
  "Meals, Entrees, and Side Dishes": require("@/assets/food-images/meat_and_poultry_category_icon.png"),
  "Fast Foods": require("@/assets/food-images/meat_and_poultry_category_icon.png"),
  "Restaurant Foods": require("@/assets/food-images/meat_and_poultry_category_icon.png"),
  "Breakfast Cereals": require("@/assets/food-images/grains_and_pasta_category_icon.png"),
  "Sausages and Luncheon Meats": require("@/assets/food-images/meat_and_poultry_category_icon.png"),
};

export const STARTER_FOOD_IMAGES: Record<string, ImageSourcePropType> = {
  milk: require("@/assets/food-images/whole_milk_bottle_icon.png"),
  eggs: require("@/assets/food-images/fresh_eggs_icon.png"),
  butter: require("@/assets/food-images/butter_stick_icon.png"),
  cheese: require("@/assets/food-images/cheddar_cheese_icon.png"),
  yogurt: require("@/assets/food-images/plain_yogurt_icon.png"),
  bread: require("@/assets/food-images/white_bread_loaf_icon.png"),
  rice: require("@/assets/food-images/white_rice_icon.png"),
  pasta: require("@/assets/food-images/pasta_spaghetti_icon.png"),
  chicken: require("@/assets/food-images/chicken_breast_icon.png"),
  ground_beef: require("@/assets/food-images/ground_beef_icon.png"),
  apples: require("@/assets/food-images/red_apples_icon.png"),
  bananas: require("@/assets/food-images/yellow_bananas_icon.png"),
  onions: require("@/assets/food-images/yellow_onions_icon.png"),
  potatoes: require("@/assets/food-images/russet_potatoes_icon.png"),
  tomatoes: require("@/assets/food-images/red_tomatoes_icon.png"),
  carrots: require("@/assets/food-images/orange_carrots_icon.png"),
  broccoli: require("@/assets/food-images/green_broccoli_icon.png"),
  orange_juice: require("@/assets/food-images/orange_juice_glass_icon.png"),
};

export function getFoodImage(
  foodId?: string,
  category?: string,
): ImageSourcePropType | null {
  if (foodId && STARTER_FOOD_IMAGES[foodId]) {
    return STARTER_FOOD_IMAGES[foodId];
  }
  if (category && CATEGORY_IMAGES[category]) {
    return CATEGORY_IMAGES[category];
  }
  return null;
}

export function getCategoryImage(category: string): ImageSourcePropType | null {
  return CATEGORY_IMAGES[category] || null;
}
