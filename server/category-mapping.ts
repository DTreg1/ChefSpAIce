// Canonical category definitions
export const CANONICAL_CATEGORIES = {
  'Dairy & Eggs': 'Dairy & Eggs',
  'Grains & Carbs': 'Grains & Carbs',
  'Oils & Vinegars': 'Oils & Vinegars',
  'Baking Essentials': 'Baking Essentials',
  'Spices & Seasonings': 'Spices & Seasonings',
  'Canned Goods': 'Canned Goods',
  'Condiments & Sauces': 'Condiments & Sauces',
  'Proteins': 'Proteins',
  'Vegetables': 'Vegetables',
  'Fruits': 'Fruits',
  'Frozen Foods': 'Frozen Foods',
  'Beverages': 'Beverages',
  'Snacks & Sweets': 'Snacks & Sweets',
  'Grains & Pasta': 'Grains & Pasta',
  'Nuts & Seeds': 'Nuts & Seeds',
  'International': 'International',
  'Prepared Foods': 'Prepared Foods',
  'Herbs & Aromatics': 'Herbs & Aromatics',
  'Other': 'Other'
} as const;

// Map various category names to canonical categories
export const CATEGORY_MAPPINGS: Record<string, string> = {
  // Dairy & Eggs mappings
  'dairy & eggs': 'Dairy & Eggs',
  'dairy and eggs': 'Dairy & Eggs',
  'dairy': 'Dairy & Eggs',
  'dairy products': 'Dairy & Eggs',
  'eggs': 'Dairy & Eggs',
  'egg': 'Dairy & Eggs',
  'milk': 'Dairy & Eggs',
  'cheese': 'Dairy & Eggs',
  'yogurt': 'Dairy & Eggs',
  'butter': 'Dairy & Eggs',
  'cream': 'Dairy & Eggs',
  
  // Grains & Carbs mappings
  'grains & carbs': 'Grains & Carbs',
  'grains and carbs': 'Grains & Carbs',
  'grains': 'Grains & Carbs',
  'carbs': 'Grains & Carbs',
  'rice': 'Grains & Carbs',
  'bread': 'Grains & Carbs',
  'pasta': 'Grains & Carbs',
  'flour': 'Grains & Carbs',
  'cereals': 'Grains & Carbs',
  
  // Oils & Vinegars mappings
  'oils & vinegars': 'Oils & Vinegars',
  'oils and vinegars': 'Oils & Vinegars',
  'oils': 'Oils & Vinegars',
  'vinegars': 'Oils & Vinegars',
  'oil': 'Oils & Vinegars',
  'vinegar': 'Oils & Vinegars',
  'fats and oils': 'Oils & Vinegars',
  
  // Baking Essentials mappings
  'baking essentials': 'Baking Essentials',
  'baking': 'Baking Essentials',
  'baking ingredients': 'Baking Essentials',
  'baking supplies': 'Baking Essentials',
  
  // Spices & Seasonings mappings
  'spices & seasonings': 'Spices & Seasonings',
  'spices and seasonings': 'Spices & Seasonings',
  'spices': 'Spices & Seasonings',
  'seasonings': 'Spices & Seasonings',
  'herbs and spices': 'Spices & Seasonings',
  
  // Canned Goods mappings
  'canned goods': 'Canned Goods',
  'canned': 'Canned Goods',
  'canned foods': 'Canned Goods',
  'tinned goods': 'Canned Goods',
  
  // Condiments & Sauces mappings
  'condiments & sauces': 'Condiments & Sauces',
  'condiments and sauces': 'Condiments & Sauces',
  'condiments': 'Condiments & Sauces',
  'sauces': 'Condiments & Sauces',
  'sauces and condiments': 'Condiments & Sauces',
  
  // Proteins mappings
  'proteins': 'Proteins',
  'protein': 'Proteins',
  'meat': 'Proteins',
  'meats': 'Proteins',
  'poultry': 'Proteins',
  'seafood': 'Proteins',
  'fish': 'Proteins',
  'beef': 'Proteins',
  'pork': 'Proteins',
  'chicken': 'Proteins',
  'turkey': 'Proteins',
  'tofu': 'Proteins',
  'legumes': 'Proteins',
  'beans': 'Proteins',
  'pork products': 'Proteins',
  'poultry products': 'Proteins',
  'beef products': 'Proteins',
  'finfish and shellfish products': 'Proteins',
  'sausages and luncheon meats': 'Proteins',
  
  // Vegetables mappings
  'vegetables': 'Vegetables',
  'vegetable': 'Vegetables',
  'veggies': 'Vegetables',
  'fresh vegetables': 'Vegetables',
  'vegetables and vegetable products': 'Vegetables',
  
  // Fruits mappings
  'fruits': 'Fruits',
  'fruit': 'Fruits',
  'fresh fruits': 'Fruits',
  'fruits and fruit juices': 'Fruits',
  
  // Frozen Foods mappings
  'frozen foods': 'Frozen Foods',
  'frozen': 'Frozen Foods',
  'frozen items': 'Frozen Foods',
  
  // Beverages mappings
  'beverages': 'Beverages',
  'beverage': 'Beverages',
  'drinks': 'Beverages',
  'juices': 'Beverages',
  'sodas': 'Beverages',
  'coffee': 'Beverages',
  'tea': 'Beverages',
  
  // Snacks & Sweets mappings
  'snacks & sweets': 'Snacks & Sweets',
  'snacks and sweets': 'Snacks & Sweets',
  'snacks': 'Snacks & Sweets',
  'sweets': 'Snacks & Sweets',
  'candy': 'Snacks & Sweets',
  'chocolate': 'Snacks & Sweets',
  'sweets and desserts': 'Snacks & Sweets',
  
  // Grains & Pasta (alternative grouping)
  'grains & pasta': 'Grains & Carbs',
  'grains and pasta': 'Grains & Carbs',
  'cereal grains and pasta': 'Grains & Carbs',
  
  // Nuts & Seeds mappings
  'nuts & seeds': 'Nuts & Seeds',
  'nuts and seeds': 'Nuts & Seeds',
  'nuts': 'Nuts & Seeds',
  'seeds': 'Nuts & Seeds',
  'nut and seed products': 'Nuts & Seeds',
  
  // International mappings
  'international': 'International',
  'ethnic': 'International',
  'ethnic foods': 'International',
  'asian': 'International',
  'mexican': 'International',
  'italian': 'International',
  'american indian/alaska native foods': 'International',
  
  // Prepared Foods mappings
  'prepared foods': 'Prepared Foods',
  'prepared': 'Prepared Foods',
  'ready meals': 'Prepared Foods',
  'meals, entrees, and side dishes': 'Prepared Foods',
  'fast foods': 'Prepared Foods',
  'restaurant foods': 'Prepared Foods',
  'soups, sauces, and gravies': 'Prepared Foods',
  
  // Herbs & Aromatics mappings
  'herbs & aromatics': 'Herbs & Aromatics',
  'herbs and aromatics': 'Herbs & Aromatics',
  'herbs': 'Herbs & Aromatics',
  'fresh herbs': 'Herbs & Aromatics',
  
  // Baby Foods
  'baby foods': 'Other',
  
  // Breakfast
  'breakfast cereals': 'Grains & Carbs',
  
  // Default mapping for branded/generic types
  'branded': 'Other',
  'foundation': 'Other',
  'survey (fndds)': 'Other',
  'sr legacy': 'Other'
};

/**
 * Normalizes a category name to its canonical form
 * @param category - The raw category name from any source
 * @returns The canonical category name
 */
export function normalizeCategory(category: string | null | undefined): string {
  if (!category) {
    return 'Other';
  }
  
  const normalized = category.toLowerCase().trim();
  
  // Check if it's already canonical
  const canonicalKeys = Object.keys(CANONICAL_CATEGORIES).map(k => k.toLowerCase());
  if (canonicalKeys.includes(normalized)) {
    // Return the proper case version
    return Object.keys(CANONICAL_CATEGORIES).find(k => k.toLowerCase() === normalized) || 'Other';
  }
  
  // Look up in mappings
  return CATEGORY_MAPPINGS[normalized] || 'Other';
}

/**
 * Gets all canonical categories sorted alphabetically
 */
export function getCanonicalCategories(): string[] {
  return Object.keys(CANONICAL_CATEGORIES).sort();
}

/**
 * Validates if a category is canonical
 */
export function isCanonicalCategory(category: string): boolean {
  return category in CANONICAL_CATEGORIES;
}