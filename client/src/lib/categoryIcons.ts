import {
  Apple,
  Package,
  Carrot,
  Fish,
  Milk,
  Coffee,
  Cake,
  Beef,
  Wheat,
  Egg,
  Wine,
  Cookie,
  Soup,
  Baby,
  Cherry,
  Candy,
  Pizza,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";

/**
 * Maps food categories to appropriate Lucide icons based on keywords in the category name.
 * Uses USDA food category naming conventions.
 */
export const getCategoryIcon = (category: string): LucideIcon => {
  const categoryLower = category.toLowerCase();

  // Check for specific keywords in the category name
  if (categoryLower.includes("vegetable")) return Carrot;
  if (categoryLower.includes("fruit")) return Apple;
  if (categoryLower.includes("dairy") || categoryLower.includes("milk"))
    return Milk;
  if (categoryLower.includes("egg")) return Egg;
  if (
    categoryLower.includes("meat") ||
    categoryLower.includes("beef") ||
    categoryLower.includes("pork")
  )
    return Beef;
  if (
    categoryLower.includes("poultry") ||
    categoryLower.includes("chicken") ||
    categoryLower.includes("turkey")
  )
    return Egg;
  if (categoryLower.includes("fish") || categoryLower.includes("seafood"))
    return Fish;
  if (
    categoryLower.includes("grain") ||
    categoryLower.includes("cereal") ||
    categoryLower.includes("bread") ||
    categoryLower.includes("pasta")
  )
    return Wheat;
  if (categoryLower.includes("beverage") || categoryLower.includes("drink"))
    return Coffee;
  if (categoryLower.includes("wine") || categoryLower.includes("alcohol"))
    return Wine;
  if (
    categoryLower.includes("sweet") ||
    categoryLower.includes("dessert") ||
    categoryLower.includes("candy")
  )
    return Candy;
  if (categoryLower.includes("cake") || categoryLower.includes("baked"))
    return Cake;
  if (categoryLower.includes("cookie") || categoryLower.includes("cracker"))
    return Cookie;
  if (categoryLower.includes("soup") || categoryLower.includes("stew"))
    return Soup;
  if (categoryLower.includes("baby")) return Baby;
  if (categoryLower.includes("snack")) return Cookie;
  if (categoryLower.includes("nut") || categoryLower.includes("seed"))
    return Cherry;
  if (
    categoryLower.includes("spice") ||
    categoryLower.includes("herb") ||
    categoryLower.includes("condiment")
  )
    return UtensilsCrossed;
  if (
    categoryLower.includes("fast food") ||
    categoryLower.includes("restaurant")
  )
    return Pizza;
  if (
    categoryLower.includes("legume") ||
    categoryLower.includes("bean") ||
    categoryLower.includes("pea")
  )
    return Cherry;
  if (categoryLower.includes("oil") || categoryLower.includes("fat"))
    return UtensilsCrossed;

  // Default icon for uncategorized or unknown categories
  return Package;
};
