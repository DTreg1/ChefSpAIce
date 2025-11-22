/**
 * Food Category Default Mappings
 * 
 * Provides intelligent defaults for food items based on their USDA category
 * or food description. Used to populate required fields when importing from
 * USDA or other data sources that may have incomplete information.
 */

export interface FoodDefaults {
  quantity: string;
  unit: string;
  storageLocation: 'Fridge' | 'Freezer' | 'Pantry';
  estimatedExpirationDays: number;
}

/**
 * Category-based default mappings
 * Maps USDA food categories to sensible defaults for storage and expiration
 */
const categoryDefaults: Record<string, FoodDefaults> = {
  // Dairy and Egg Products
  'dairy and egg products': {
    quantity: '1',
    unit: 'container',
    storageLocation: 'Fridge',
    estimatedExpirationDays: 14
  },
  'dairy': {
    quantity: '1',
    unit: 'container',
    storageLocation: 'Fridge',
    estimatedExpirationDays: 14
  },
  'cheese': {
    quantity: '1',
    unit: 'package',
    storageLocation: 'Fridge',
    estimatedExpirationDays: 30
  },
  
  // Meat and Poultry
  'beef products': {
    quantity: '1',
    unit: 'lb',
    storageLocation: 'Fridge',
    estimatedExpirationDays: 3
  },
  'pork products': {
    quantity: '1',
    unit: 'lb',
    storageLocation: 'Fridge',
    estimatedExpirationDays: 3
  },
  'poultry products': {
    quantity: '1',
    unit: 'lb',
    storageLocation: 'Fridge',
    estimatedExpirationDays: 2
  },
  'sausages and luncheon meats': {
    quantity: '1',
    unit: 'package',
    storageLocation: 'Fridge',
    estimatedExpirationDays: 7
  },
  
  // Seafood
  'finfish and shellfish products': {
    quantity: '1',
    unit: 'lb',
    storageLocation: 'Fridge',
    estimatedExpirationDays: 2
  },
  
  // Fruits and Vegetables
  'fruits and fruit juices': {
    quantity: '1',
    unit: 'lb',
    storageLocation: 'Fridge',
    estimatedExpirationDays: 7
  },
  'vegetables and vegetable products': {
    quantity: '1',
    unit: 'lb',
    storageLocation: 'Fridge',
    estimatedExpirationDays: 7
  },
  
  // Grains and Cereals
  'cereal grains and pasta': {
    quantity: '1',
    unit: 'box',
    storageLocation: 'Pantry',
    estimatedExpirationDays: 365
  },
  'breakfast cereals': {
    quantity: '1',
    unit: 'box',
    storageLocation: 'Pantry',
    estimatedExpirationDays: 180
  },
  'baked products': {
    quantity: '1',
    unit: 'loaf',
    storageLocation: 'Pantry',
    estimatedExpirationDays: 5
  },
  
  // Legumes and Nuts
  'legumes and legume products': {
    quantity: '1',
    unit: 'can',
    storageLocation: 'Pantry',
    estimatedExpirationDays: 730
  },
  'nut and seed products': {
    quantity: '1',
    unit: 'container',
    storageLocation: 'Pantry',
    estimatedExpirationDays: 180
  },
  
  // Fats and Oils
  'fats and oils': {
    quantity: '1',
    unit: 'bottle',
    storageLocation: 'Pantry',
    estimatedExpirationDays: 365
  },
  
  // Beverages
  'beverages': {
    quantity: '1',
    unit: 'bottle',
    storageLocation: 'Pantry',
    estimatedExpirationDays: 365
  },
  
  // Soups and Sauces
  'soups, sauces, and gravies': {
    quantity: '1',
    unit: 'can',
    storageLocation: 'Pantry',
    estimatedExpirationDays: 730
  },
  
  // Snacks
  'snacks': {
    quantity: '1',
    unit: 'package',
    storageLocation: 'Pantry',
    estimatedExpirationDays: 90
  },
  
  // Sweets
  'sweets': {
    quantity: '1',
    unit: 'package',
    storageLocation: 'Pantry',
    estimatedExpirationDays: 180
  },
  
  // Spices and Herbs
  'spices and herbs': {
    quantity: '1',
    unit: 'container',
    storageLocation: 'Pantry',
    estimatedExpirationDays: 730
  },
  
  // Baby Foods
  'baby foods': {
    quantity: '1',
    unit: 'jar',
    storageLocation: 'Pantry',
    estimatedExpirationDays: 365
  },
  
  // Frozen items
  'meals, entrees, and side dishes': {
    quantity: '1',
    unit: 'package',
    storageLocation: 'Freezer',
    estimatedExpirationDays: 180
  }
};

/**
 * Keywords to detect food types from descriptions
 */
const descriptionPatterns: Array<{pattern: RegExp, defaults: FoodDefaults}> = [
  // Dairy
  { pattern: /\bmilk\b/i, defaults: { quantity: '1', unit: 'gallon', storageLocation: 'Fridge', estimatedExpirationDays: 7 } },
  { pattern: /\byogurt\b/i, defaults: { quantity: '1', unit: 'container', storageLocation: 'Fridge', estimatedExpirationDays: 14 } },
  { pattern: /\bbutter\b/i, defaults: { quantity: '1', unit: 'stick', storageLocation: 'Fridge', estimatedExpirationDays: 60 } },
  { pattern: /\bcheese\b/i, defaults: { quantity: '8', unit: 'oz', storageLocation: 'Fridge', estimatedExpirationDays: 30 } },
  { pattern: /\begg/i, defaults: { quantity: '12', unit: 'count', storageLocation: 'Fridge', estimatedExpirationDays: 21 } },
  
  // Meat
  { pattern: /\bchicken\b/i, defaults: { quantity: '1', unit: 'lb', storageLocation: 'Fridge', estimatedExpirationDays: 2 } },
  { pattern: /\bbeef\b/i, defaults: { quantity: '1', unit: 'lb', storageLocation: 'Fridge', estimatedExpirationDays: 3 } },
  { pattern: /\bpork\b/i, defaults: { quantity: '1', unit: 'lb', storageLocation: 'Fridge', estimatedExpirationDays: 3 } },
  { pattern: /\bfish\b/i, defaults: { quantity: '1', unit: 'lb', storageLocation: 'Fridge', estimatedExpirationDays: 2 } },
  { pattern: /\bsalmon\b/i, defaults: { quantity: '1', unit: 'lb', storageLocation: 'Fridge', estimatedExpirationDays: 2 } },
  
  // Produce
  { pattern: /\blettuce\b/i, defaults: { quantity: '1', unit: 'head', storageLocation: 'Fridge', estimatedExpirationDays: 7 } },
  { pattern: /\btomato/i, defaults: { quantity: '1', unit: 'lb', storageLocation: 'Fridge', estimatedExpirationDays: 7 } },
  { pattern: /\bcarrot/i, defaults: { quantity: '1', unit: 'lb', storageLocation: 'Fridge', estimatedExpirationDays: 21 } },
  { pattern: /\bapple/i, defaults: { quantity: '1', unit: 'lb', storageLocation: 'Fridge', estimatedExpirationDays: 30 } },
  { pattern: /\bbanana/i, defaults: { quantity: '1', unit: 'bunch', storageLocation: 'Pantry', estimatedExpirationDays: 5 } },
  { pattern: /\bpotato/i, defaults: { quantity: '5', unit: 'lb', storageLocation: 'Pantry', estimatedExpirationDays: 30 } },
  { pattern: /\bonion/i, defaults: { quantity: '3', unit: 'count', storageLocation: 'Pantry', estimatedExpirationDays: 30 } },
  
  // Pantry staples
  { pattern: /\brice\b/i, defaults: { quantity: '1', unit: 'lb', storageLocation: 'Pantry', estimatedExpirationDays: 730 } },
  { pattern: /\bpasta\b/i, defaults: { quantity: '1', unit: 'box', storageLocation: 'Pantry', estimatedExpirationDays: 730 } },
  { pattern: /\bflour\b/i, defaults: { quantity: '5', unit: 'lb', storageLocation: 'Pantry', estimatedExpirationDays: 365 } },
  { pattern: /\bsugar\b/i, defaults: { quantity: '4', unit: 'lb', storageLocation: 'Pantry', estimatedExpirationDays: 730 } },
  { pattern: /\boil\b/i, defaults: { quantity: '1', unit: 'bottle', storageLocation: 'Pantry', estimatedExpirationDays: 365 } },
  { pattern: /\bsalt\b/i, defaults: { quantity: '1', unit: 'container', storageLocation: 'Pantry', estimatedExpirationDays: 1825 } },
  { pattern: /\bpepper\b/i, defaults: { quantity: '1', unit: 'container', storageLocation: 'Pantry', estimatedExpirationDays: 1095 } },
  
  // Canned goods
  { pattern: /\bcanned\b/i, defaults: { quantity: '1', unit: 'can', storageLocation: 'Pantry', estimatedExpirationDays: 730 } },
  { pattern: /\bcan of\b/i, defaults: { quantity: '1', unit: 'can', storageLocation: 'Pantry', estimatedExpirationDays: 730 } },
  { pattern: /\bsoup\b/i, defaults: { quantity: '1', unit: 'can', storageLocation: 'Pantry', estimatedExpirationDays: 730 } },
  { pattern: /\bsauce\b/i, defaults: { quantity: '1', unit: 'jar', storageLocation: 'Pantry', estimatedExpirationDays: 365 } },
  
  // Bread
  { pattern: /\bbread\b/i, defaults: { quantity: '1', unit: 'loaf', storageLocation: 'Pantry', estimatedExpirationDays: 5 } },
  
  // Frozen
  { pattern: /\bfrozen\b/i, defaults: { quantity: '1', unit: 'package', storageLocation: 'Freezer', estimatedExpirationDays: 180 } },
  { pattern: /\bice cream\b/i, defaults: { quantity: '1', unit: 'pint', storageLocation: 'Freezer', estimatedExpirationDays: 90 } },
];

/**
 * Get intelligent defaults for a food item based on category and description
 * 
 * @param category - USDA food category (optional)
 * @param description - Food description/name
 * @returns FoodDefaults with appropriate storage, quantity, unit, and expiration
 */
export function getFoodDefaults(category?: string, description?: string): FoodDefaults {
  // Try category-based defaults first
  if (category) {
    const categoryLower = category.toLowerCase();
    const categoryDefault = categoryDefaults[categoryLower];
    if (categoryDefault) {
      return categoryDefault;
    }
    
    // Try partial category matches
    for (const [key, defaults] of Object.entries(categoryDefaults)) {
      if (categoryLower.includes(key) || key.includes(categoryLower)) {
        return defaults;
      }
    }
  }
  
  // Try description-based patterns
  if (description) {
    for (const {pattern, defaults} of descriptionPatterns) {
      if (pattern.test(description)) {
        return defaults;
      }
    }
  }
  
  // Ultimate fallback - generic pantry item
  return {
    quantity: '1',
    unit: 'item',
    storageLocation: 'Pantry',
    estimatedExpirationDays: 90
  };
}

/**
 * Calculate expiration date from current date and estimated days
 * 
 * @param estimatedDays - Number of days until expiration
 * @returns ISO date string for expiration
 */
export function calculateExpirationDate(estimatedDays: number): string {
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + estimatedDays);
  return expirationDate.toISOString().split('T')[0];
}

/**
 * Validate and ensure all required inventory fields are populated
 * NOTE: This does NOT resolve storageLocationId as it requires user context.
 * The storageLocation field will contain a name that needs to be resolved later.
 * 
 * @param item - Partial inventory item data
 * @param category - USDA food category (optional)
 * @param description - Food description/name
 * @returns Complete inventory item with all required fields except storageLocationId
 */
export function ensureRequiredFields(
  item: any,
  category?: string,
  description?: string
): any {
  const defaults = getFoodDefaults(category, description || item.name);
  
  return {
    ...item,
    quantity: item.quantity || defaults.quantity,
    unit: item.unit || defaults.unit,
    storageLocation: item.storageLocation || defaults.storageLocation, // Name, not ID
    expirationDate: item.expirationDate || calculateExpirationDate(defaults.estimatedExpirationDays),
    // Ensure name is always set
    name: item.name || description || 'Unknown Item',
    // Include the defaults for reference
    _suggestedDefaults: defaults
  };
}

/**
 * Get data quality score for imported item
 * Returns a score from 0-100 indicating completeness
 */
export function getDataQualityScore(item: any): number {
  let score = 0;
  const weights = {
    name: 15,
    quantity: 10,
    unit: 10,
    storageLocation: 10,
    expirationDate: 10,
    nutrition: 20,
    servingSize: 10,
    fdcId: 5,
    barcode: 5,
    foodCategory: 5
  };
  
  for (const [field, weight] of Object.entries(weights)) {
    if (item[field] && item[field] !== 'Unknown' && item[field] !== '1' && item[field] !== 'item') {
      score += weight;
    }
  }
  
  return score;
}

export interface DataQualityIndicator {
  score: number;
  level: 'excellent' | 'good' | 'fair' | 'poor';
  missingFields: string[];
  message: string;
}

/**
 * Get detailed data quality assessment
 */
export function assessDataQuality(item: any): DataQualityIndicator {
  const score = getDataQualityScore(item);
  const missingFields: string[] = [];
  
  // Check for missing important fields
  const importantFields = ['nutrition', 'servingSize', 'foodCategory', 'fdcId', 'barcode'];
  for (const field of importantFields) {
    if (!item[field]) {
      missingFields.push(field);
    }
  }
  
  let level: 'excellent' | 'good' | 'fair' | 'poor';
  let message: string;
  
  if (score >= 85) {
    level = 'excellent';
    message = 'Complete data with nutrition information';
  } else if (score >= 70) {
    level = 'good';
    message = 'Most data available, some optional fields missing';
  } else if (score >= 50) {
    level = 'fair';
    message = 'Basic information available, nutrition data may be incomplete';
  } else {
    level = 'poor';
    message = 'Minimal data available, manual entry recommended';
  }
  
  return {
    score,
    level,
    missingFields,
    message
  };
}