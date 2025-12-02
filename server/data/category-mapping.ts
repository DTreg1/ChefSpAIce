// The 5 major food groups
export const CANONICAL_CATEGORIES = {
  Fruits: "Fruits",
  Vegetables: "Vegetables",
  Grains: "Grains",
  Protein: "Protein",
  Dairy: "Dairy",
} as const;

// Map various category names to the 5 major food groups
export const CATEGORY_MAPPINGS: Record<string, string> = {
  // Fruits mappings
  fruits: "Fruits",
  fruit: "Fruits",
  "fresh fruits": "Fruits",
  "fruits and fruit juices": "Fruits",
  berries: "Fruits",
  citrus: "Fruits",
  melons: "Fruits",
  "stone fruits": "Fruits",
  "tropical fruits": "Fruits",
  "dried fruits": "Fruits",
  "frozen berries": "Fruits",

  // Vegetables mappings
  vegetables: "Vegetables",
  vegetable: "Vegetables",
  veggies: "Vegetables",
  "fresh vegetables": "Vegetables",
  "vegetables and vegetable products": "Vegetables",
  "frozen vegetables": "Vegetables",
  "canned vegetables": "Vegetables",
  "leafy greens": "Vegetables",
  "root vegetables": "Vegetables",
  cruciferous: "Vegetables",
  nightshades: "Vegetables",
  "legumes and legume products": "Protein", // Beans go to Protein
  herbs: "Vegetables",
  "herbs & aromatics": "Vegetables",
  "herbs and aromatics": "Vegetables",
  "fresh herbs": "Vegetables",
  "fresh produce": "Vegetables",
  onions: "Vegetables",
  garlic: "Vegetables",
  potatoes: "Vegetables",
  tomatoes: "Vegetables",
  mushrooms: "Vegetables",

  // Grains mappings
  grains: "Grains",
  grain: "Grains",
  "grains & carbs": "Grains",
  "grains and carbs": "Grains",
  carbs: "Grains",
  cereals: "Grains",
  "cereal grains and pasta": "Grains",
  "grains & pasta": "Grains",
  "grains and pasta": "Grains",
  pasta: "Grains",
  rice: "Grains",
  bread: "Grains",
  flour: "Grains",
  "baked products": "Grains",
  "breakfast cereals": "Grains",
  crackers: "Grains",
  snacks: "Grains",
  "snacks & sweets": "Grains",
  "snacks and sweets": "Grains",
  sweets: "Grains",
  desserts: "Grains",
  "sweets and desserts": "Grains",
  "baking essentials": "Grains",
  baking: "Grains",
  "baking ingredients": "Grains",
  "baking supplies": "Grains",
  sugar: "Grains",
  sweeteners: "Grains",

  // Protein mappings
  protein: "Protein",
  proteins: "Protein",
  meat: "Protein",
  meats: "Protein",
  "meat & poultry": "Protein",
  poultry: "Protein",
  "poultry products": "Protein",
  beef: "Protein",
  "beef products": "Protein",
  pork: "Protein",
  "pork products": "Protein",
  lamb: "Protein",
  chicken: "Protein",
  turkey: "Protein",
  seafood: "Protein",
  fish: "Protein",
  "finfish and shellfish products": "Protein",
  shellfish: "Protein",
  "sausages and luncheon meats": "Protein",
  tofu: "Protein",
  beans: "Protein",
  legumes: "Protein",
  nuts: "Protein",
  seeds: "Protein",
  "nuts & seeds": "Protein",
  "nuts and seeds": "Protein",
  "nut and seed products": "Protein",
  eggs: "Dairy", // Eggs traditionally grouped with Dairy
  egg: "Dairy",
  "canned goods": "Protein", // Canned beans, tuna, etc
  tuna: "Protein",

  // Dairy mappings
  dairy: "Dairy",
  "dairy & eggs": "Dairy",
  "dairy and eggs": "Dairy",
  "dairy products": "Dairy",
  milk: "Dairy",
  cheese: "Dairy",
  yogurt: "Dairy",
  butter: "Dairy",
  cream: "Dairy",
  "ice cream": "Dairy",
  "frozen desserts": "Dairy",

  // Other foods mapped to closest group
  oils: "Protein", // Healthy fats grouped with protein
  "oils & vinegars": "Protein",
  "oils and vinegars": "Protein",
  oil: "Protein",
  vinegar: "Vegetables", // Vinegar with vegetables
  vinegars: "Vegetables",
  "fats and oils": "Protein",

  spices: "Vegetables", // Spices/herbs with vegetables
  "spices & seasonings": "Vegetables",
  "spices and seasonings": "Vegetables",
  seasonings: "Vegetables",
  "herbs and spices": "Vegetables",
  salt: "Vegetables",
  pepper: "Vegetables",

  condiments: "Vegetables", // Condiments varied, default to vegetables
  "condiments & sauces": "Vegetables",
  "condiments and sauces": "Vegetables",
  sauces: "Vegetables",
  "sauces and condiments": "Vegetables",
  "soups, sauces, and gravies": "Vegetables",

  beverages: "Fruits", // Most beverages are fruit-based
  beverage: "Fruits",
  drinks: "Fruits",
  juices: "Fruits",
  sodas: "Grains", // Sodas are sugar-based
  coffee: "Grains",
  tea: "Vegetables",

  "prepared foods": "Grains", // Most prepared foods are grain-based
  prepared: "Grains",
  "ready meals": "Grains",
  "meals, entrees, and side dishes": "Grains",
  "fast foods": "Grains",
  "restaurant foods": "Grains",
  "frozen foods": "Grains",
  "frozen meals": "Grains",
  "broths & soups": "Vegetables",

  "baby foods": "Grains",
  international: "Grains",
  ethnic: "Grains",
  "ethnic foods": "Grains",

  // Default mapping for branded/generic types
  branded: "Grains",
  foundation: "Grains",
  "survey (fndds)": "Grains",
  "sr legacy": "Grains",
  other: "Grains",
  uncategorized: "Grains",
};

/**
 * Normalizes a category name to one of the 5 major food groups
 * @param category - The raw category name from any source
 * @returns One of the 5 major food groups
 */
export function normalizeCategory(category: string | null | undefined): string {
  if (!category) {
    return "Grains"; // Default for uncategorized items
  }

  const normalized = category.toLowerCase().trim();

  // Check if it's already one of the 5 groups
  const canonicalKeys = Object.keys(CANONICAL_CATEGORIES).map((k) =>
    k.toLowerCase(),
  );
  if (canonicalKeys.includes(normalized)) {
    // Return the proper case version
    return (
      Object.keys(CANONICAL_CATEGORIES).find(
        (k) => k.toLowerCase() === normalized,
      ) || "Grains"
    );
  }

  // Look up in mappings
  return CATEGORY_MAPPINGS[normalized] || "Grains";
}

/**
 * Gets all canonical categories (the 5 major food groups)
 */
export function getCanonicalCategories(): string[] {
  return Object.keys(CANONICAL_CATEGORIES);
}

/**
 * Validates if a category is one of the 5 major food groups
 */
export function isCanonicalCategory(category: string): boolean {
  return category in CANONICAL_CATEGORIES;
}
