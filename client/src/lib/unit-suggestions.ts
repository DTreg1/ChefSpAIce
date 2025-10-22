// Smart unit suggestion system based on USDA food categories and common patterns

interface UnitSuggestion {
  primary: string;
  alternatives: string[];
  confidence: 'high' | 'medium' | 'low';
}

// USDA food category mappings to common units
const CATEGORY_UNITS: Record<string, { primary: string; alternatives: string[] }> = {
  // Major USDA categories
  'Dairy and Egg Products': { primary: 'count', alternatives: ['dozen', 'carton', 'gallon', 'oz', 'lb'] },
  'Vegetables and Vegetable Products': { primary: 'lb', alternatives: ['oz', 'count', 'bunch', 'head', 'bag'] },
  'Fruits and Fruit Juices': { primary: 'lb', alternatives: ['oz', 'count', 'cup', 'pint', 'quart'] },
  'Poultry Products': { primary: 'lb', alternatives: ['oz', 'count', 'package'] },
  'Beef Products': { primary: 'lb', alternatives: ['oz', 'package'] },
  'Pork Products': { primary: 'lb', alternatives: ['oz', 'package'] },
  'Finfish and Shellfish Products': { primary: 'lb', alternatives: ['oz', 'fillet', 'count'] },
  'Legumes and Legume Products': { primary: 'lb', alternatives: ['oz', 'can', 'cup', 'bag'] },
  'Nut and Seed Products': { primary: 'oz', alternatives: ['lb', 'cup', 'bag', 'jar'] },
  'Cereal Grains and Pasta': { primary: 'box', alternatives: ['bag', 'lb', 'oz', 'cup'] },
  'Spices and Herbs': { primary: 'tsp', alternatives: ['tbsp', 'oz', 'jar', 'bunch'] },
  'Fats and Oils': { primary: 'tbsp', alternatives: ['cup', 'stick', 'bottle', 'oz'] },
  'Beverages': { primary: 'bottle', alternatives: ['can', 'fl oz', 'cup', 'liter', 'gallon'] },
  'Baked Products': { primary: 'count', alternatives: ['loaf', 'package', 'box', 'bag'] },
  'Sweets': { primary: 'package', alternatives: ['bar', 'bag', 'box', 'count'] },
  'Snacks': { primary: 'bag', alternatives: ['box', 'package', 'oz'] },
  'Baby Foods': { primary: 'jar', alternatives: ['pouch', 'box', 'can'] },
  'Soups, Sauces, and Gravies': { primary: 'can', alternatives: ['jar', 'bottle', 'cup', 'oz'] },
  'Sausages and Luncheon Meats': { primary: 'package', alternatives: ['lb', 'oz', 'slice'] },
  'Breakfast Cereals': { primary: 'box', alternatives: ['bag', 'cup', 'oz'] },
  'Fast Foods': { primary: 'count', alternatives: ['meal', 'serving', 'order'] },
  'Meals, Entrees, and Side Dishes': { primary: 'serving', alternatives: ['package', 'tray', 'bowl'] },
  'Restaurant Foods': { primary: 'serving', alternatives: ['plate', 'order', 'portion'] },
};

// Keyword-based unit mappings for more specific suggestions
const KEYWORD_UNITS: Array<{ keywords: string[]; unit: { primary: string; alternatives: string[] } }> = [
  // Dairy specifics
  { keywords: ['egg', 'eggs'], unit: { primary: 'count', alternatives: ['dozen', 'carton'] } },
  { keywords: ['milk', 'cream'], unit: { primary: 'gallon', alternatives: ['quart', 'pint', 'cup', 'fl oz'] } },
  { keywords: ['cheese', 'cheddar', 'mozzarella'], unit: { primary: 'lb', alternatives: ['oz', 'slice', 'package', 'block'] } },
  { keywords: ['yogurt', 'yoghurt'], unit: { primary: 'oz', alternatives: ['cup', 'container', 'package'] } },
  { keywords: ['butter'], unit: { primary: 'stick', alternatives: ['lb', 'tbsp', 'package'] } },
  
  // Meat specifics
  { keywords: ['ground beef', 'ground turkey', 'ground pork', 'ground'], unit: { primary: 'lb', alternatives: ['oz', 'package'] } },
  { keywords: ['steak', 'chop', 'roast'], unit: { primary: 'lb', alternatives: ['oz', 'count', 'package'] } },
  { keywords: ['chicken breast', 'chicken thigh', 'chicken wing'], unit: { primary: 'lb', alternatives: ['count', 'package', 'oz'] } },
  { keywords: ['whole chicken', 'whole turkey'], unit: { primary: 'count', alternatives: ['lb'] } },
  { keywords: ['bacon', 'sausage'], unit: { primary: 'package', alternatives: ['lb', 'oz', 'link'] } },
  { keywords: ['deli', 'sliced', 'lunch meat'], unit: { primary: 'oz', alternatives: ['lb', 'package', 'slice'] } },
  
  // Produce specifics
  { keywords: ['lettuce', 'cabbage', 'cauliflower'], unit: { primary: 'head', alternatives: ['count', 'lb'] } },
  { keywords: ['spinach', 'kale', 'greens'], unit: { primary: 'bunch', alternatives: ['bag', 'oz', 'lb'] } },
  { keywords: ['apple', 'orange', 'banana', 'peach', 'pear'], unit: { primary: 'count', alternatives: ['lb', 'bag'] } },
  { keywords: ['berries', 'strawberry', 'blueberry', 'raspberry'], unit: { primary: 'pint', alternatives: ['lb', 'oz', 'container'] } },
  { keywords: ['potato', 'potatoes', 'sweet potato'], unit: { primary: 'lb', alternatives: ['count', 'bag'] } },
  { keywords: ['onion', 'garlic'], unit: { primary: 'count', alternatives: ['lb', 'head', 'clove'] } },
  { keywords: ['carrot', 'celery'], unit: { primary: 'lb', alternatives: ['bunch', 'bag', 'count'] } },
  { keywords: ['tomato', 'tomatoes'], unit: { primary: 'lb', alternatives: ['count', 'pint', 'container'] } },
  
  // Grains and bread
  { keywords: ['bread', 'loaf'], unit: { primary: 'loaf', alternatives: ['slice', 'package'] } },
  { keywords: ['rice', 'quinoa', 'barley'], unit: { primary: 'lb', alternatives: ['cup', 'bag', 'box'] } },
  { keywords: ['pasta', 'spaghetti', 'noodles'], unit: { primary: 'box', alternatives: ['lb', 'oz', 'bag'] } },
  { keywords: ['flour'], unit: { primary: 'lb', alternatives: ['cup', 'bag', 'oz'] } },
  { keywords: ['sugar'], unit: { primary: 'lb', alternatives: ['cup', 'bag', 'box'] } },
  
  // Beverages
  { keywords: ['soda', 'cola', 'pop'], unit: { primary: 'can', alternatives: ['bottle', 'liter', 'pack'] } },
  { keywords: ['juice'], unit: { primary: 'bottle', alternatives: ['carton', 'fl oz', 'gallon', 'can'] } },
  { keywords: ['water', 'sparkling water'], unit: { primary: 'bottle', alternatives: ['gallon', 'case', 'liter'] } },
  { keywords: ['coffee'], unit: { primary: 'bag', alternatives: ['lb', 'oz', 'can', 'pod'] } },
  { keywords: ['tea'], unit: { primary: 'box', alternatives: ['bag', 'oz', 'tin'] } },
  
  // Condiments and spices
  { keywords: ['salt', 'pepper', 'spice', 'seasoning'], unit: { primary: 'tsp', alternatives: ['tbsp', 'oz', 'jar', 'shaker'] } },
  { keywords: ['sauce', 'ketchup', 'mustard', 'mayo'], unit: { primary: 'bottle', alternatives: ['jar', 'oz', 'tbsp'] } },
  { keywords: ['oil', 'olive oil', 'vegetable oil'], unit: { primary: 'bottle', alternatives: ['fl oz', 'cup', 'tbsp'] } },
  { keywords: ['vinegar'], unit: { primary: 'bottle', alternatives: ['fl oz', 'cup', 'tbsp'] } },
  
  // Canned goods
  { keywords: ['can of', 'canned'], unit: { primary: 'can', alternatives: ['oz', 'lb'] } },
  { keywords: ['jar of', 'jarred'], unit: { primary: 'jar', alternatives: ['oz', 'cup'] } },
  
  // Frozen foods
  { keywords: ['frozen', 'ice cream'], unit: { primary: 'package', alternatives: ['bag', 'pint', 'quart', 'gallon'] } },
  
  // Snacks
  { keywords: ['chips', 'crackers', 'pretzels'], unit: { primary: 'bag', alternatives: ['box', 'oz', 'package'] } },
  { keywords: ['cookies', 'candy'], unit: { primary: 'package', alternatives: ['box', 'bag', 'count'] } },
  { keywords: ['nuts', 'almonds', 'peanuts'], unit: { primary: 'oz', alternatives: ['lb', 'bag', 'can', 'jar'] } },
];

// Common serving size unit conversions
const SERVING_UNIT_MAPPINGS: Record<string, string> = {
  'g': 'oz',
  'gram': 'oz',
  'grams': 'oz',
  'ml': 'fl oz',
  'milliliter': 'fl oz',
  'milliliters': 'fl oz',
  'l': 'liter',
  'liters': 'liter',
  'kg': 'lb',
  'kilogram': 'lb',
  'kilograms': 'lb',
  'piece': 'count',
  'pieces': 'count',
  'item': 'count',
  'items': 'count',
  'each': 'count',
  'ea': 'count',
  'serving': 'serving',
  'servings': 'serving',
  'portion': 'serving',
  'portions': 'serving',
};

export function getSmartUnitSuggestion(
  foodName: string,
  foodCategory?: string | null,
  servingSizeUnit?: string | null,
  usdaData?: any
): UnitSuggestion {
  const lowercaseName = foodName.toLowerCase();
  
  // First, check for keyword matches (most specific)
  for (const keywordMapping of KEYWORD_UNITS) {
    const hasMatch = keywordMapping.keywords.some(keyword => 
      lowercaseName.includes(keyword.toLowerCase())
    );
    if (hasMatch) {
      return {
        ...keywordMapping.unit,
        confidence: 'high'
      };
    }
  }
  
  // Second, check USDA food category
  if (foodCategory && CATEGORY_UNITS[foodCategory]) {
    return {
      ...CATEGORY_UNITS[foodCategory],
      confidence: 'medium'
    };
  }
  
  // Third, try to use serving size unit if available
  if (servingSizeUnit) {
    const normalizedUnit = SERVING_UNIT_MAPPINGS[servingSizeUnit.toLowerCase()] || servingSizeUnit;
    const categoryDefault = foodCategory ? CATEGORY_UNITS[foodCategory] : null;
    
    return {
      primary: normalizedUnit,
      alternatives: categoryDefault?.alternatives || ['oz', 'lb', 'count', 'package'],
      confidence: 'medium'
    };
  }
  
  // Analyze food name patterns for fallback suggestions
  let fallbackUnit: UnitSuggestion = {
    primary: 'count',
    alternatives: ['lb', 'oz', 'package', 'bag', 'box'],
    confidence: 'low'
  };
  
  // Check for common patterns in the name
  if (lowercaseName.includes('liquid') || lowercaseName.includes('drink') || lowercaseName.includes('beverage')) {
    fallbackUnit = { primary: 'fl oz', alternatives: ['cup', 'bottle', 'can', 'liter'], confidence: 'low' };
  } else if (lowercaseName.includes('powder') || lowercaseName.includes('mix')) {
    fallbackUnit = { primary: 'oz', alternatives: ['lb', 'box', 'bag', 'package'], confidence: 'low' };
  } else if (lowercaseName.includes('fresh')) {
    fallbackUnit = { primary: 'lb', alternatives: ['oz', 'count', 'bunch', 'bag'], confidence: 'low' };
  } else if (lowercaseName.includes('dried') || lowercaseName.includes('dry')) {
    fallbackUnit = { primary: 'oz', alternatives: ['lb', 'cup', 'bag', 'box'], confidence: 'low' };
  }
  
  return fallbackUnit;
}

// Get all available units for dropdown
export function getAllAvailableUnits(): string[] {
  const units = new Set<string>();
  
  // Add all primary and alternative units from category mappings
  Object.values(CATEGORY_UNITS).forEach(mapping => {
    units.add(mapping.primary);
    mapping.alternatives.forEach(alt => units.add(alt));
  });
  
  // Add all units from keyword mappings
  KEYWORD_UNITS.forEach(mapping => {
    units.add(mapping.unit.primary);
    mapping.unit.alternatives.forEach(alt => units.add(alt));
  });
  
  // Add common measurement units not already included
  const commonUnits = [
    'tsp', 'tbsp', 'cup', 'pint', 'quart', 'gallon', 'liter',
    'fl oz', 'oz', 'lb', 'g', 'kg', 'ml', 'l',
    'count', 'dozen', 'piece', 'item', 'each',
    'bag', 'box', 'package', 'container', 'jar', 'can', 'bottle',
    'stick', 'bunch', 'head', 'clove', 'slice', 'loaf',
    'serving', 'portion', 'meal', 'plate',
    'carton', 'case', 'pack', 'pouch', 'tin', 'tray'
  ];
  
  commonUnits.forEach(unit => units.add(unit));
  
  return Array.from(units).sort();
}

// Helper to format unit for display
export function formatUnitDisplay(unit: string): string {
  const abbreviations: Record<string, string> = {
    'teaspoon': 'tsp',
    'tablespoon': 'tbsp',
    'fluid ounce': 'fl oz',
    'ounce': 'oz',
    'pound': 'lb',
    'gram': 'g',
    'kilogram': 'kg',
    'milliliter': 'ml',
    'liter': 'L',
  };
  
  return abbreviations[unit.toLowerCase()] || unit;
}