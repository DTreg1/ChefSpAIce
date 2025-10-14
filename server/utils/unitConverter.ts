// Unit conversion utilities for ingredient quantity matching

// Define common unit types and their conversion factors
const UNIT_CONVERSIONS: { [key: string]: { [key: string]: number } } = {
  // Volume conversions (base unit: ml)
  volume: {
    ml: 1,
    milliliter: 1,
    milliliters: 1,
    l: 1000,
    liter: 1000,
    liters: 1000,
    tsp: 4.92892,
    teaspoon: 4.92892,
    teaspoons: 4.92892,
    tbsp: 14.7868,
    tablespoon: 14.7868,
    tablespoons: 14.7868,
    'fl oz': 29.5735,
    'fluid ounce': 29.5735,
    'fluid ounces': 29.5735,
    cup: 236.588,
    cups: 236.588,
    pint: 473.176,
    pints: 473.176,
    quart: 946.353,
    quarts: 946.353,
    gallon: 3785.41,
    gallons: 3785.41,
  },
  // Weight conversions (base unit: grams)
  weight: {
    g: 1,
    gram: 1,
    grams: 1,
    kg: 1000,
    kilogram: 1000,
    kilograms: 1000,
    mg: 0.001,
    milligram: 0.001,
    milligrams: 0.001,
    oz: 28.3495,
    ounce: 28.3495,
    ounces: 28.3495,
    lb: 453.592,
    lbs: 453.592,
    pound: 453.592,
    pounds: 453.592,
  },
  // Count units (no conversion)
  count: {
    piece: 1,
    pieces: 1,
    item: 1,
    items: 1,
    whole: 1,
    can: 1,
    cans: 1,
    package: 1,
    packages: 1,
    bag: 1,
    bags: 1,
    box: 1,
    boxes: 1,
    bunch: 1,
    bunches: 1,
    clove: 1,
    cloves: 1,
    head: 1,
    heads: 1,
    stick: 1,
    sticks: 1,
  },
};

// Identify unit type
function getUnitType(unit: string): string | null {
  const normalizedUnit = unit.toLowerCase().trim();
  for (const [type, units] of Object.entries(UNIT_CONVERSIONS)) {
    if (units[normalizedUnit]) {
      return type;
    }
  }
  return null;
}

// Convert quantity between units
export function convertUnit(
  quantity: number,
  fromUnit: string,
  toUnit: string
): number | null {
  const fromType = getUnitType(fromUnit);
  const toType = getUnitType(toUnit);

  // Can't convert between different types or unknown units
  if (!fromType || !toType || fromType !== toType) {
    return null;
  }

  // Count units don't convert
  if (fromType === 'count') {
    return fromUnit.toLowerCase() === toUnit.toLowerCase() ? quantity : null;
  }

  const conversions = UNIT_CONVERSIONS[fromType];
  const fromFactor = conversions[fromUnit.toLowerCase()];
  const toFactor = conversions[toUnit.toLowerCase()];

  if (!fromFactor || !toFactor) {
    return null;
  }

  // Convert to base unit, then to target unit
  return (quantity * fromFactor) / toFactor;
}

// Parse ingredient string to extract quantity and unit
export function parseIngredient(ingredientStr: string): {
  quantity: number;
  unit: string;
  name: string;
} {
  // Remove parenthetical notes
  const cleanStr = ingredientStr.replace(/\([^)]*\)/g, '').trim();
  
  // Match patterns like "2 cups flour" or "1/2 cup sugar" or "3.5 oz cheese"
  const patterns = [
    // Fraction followed by unit and name
    /^(\d+\/\d+)\s+([a-zA-Z\s]+?)\s+(.+)$/,
    // Mixed number (e.g., "1 1/2")
    /^(\d+\s+\d+\/\d+)\s+([a-zA-Z\s]+?)\s+(.+)$/,
    // Decimal number
    /^(\d+\.?\d*)\s+([a-zA-Z\s]+?)\s+(.+)$/,
    // Just a number (count)
    /^(\d+\.?\d*)\s+(.+)$/,
  ];

  for (const pattern of patterns) {
    const match = cleanStr.match(pattern);
    if (match) {
      let quantity: number;
      let unit: string;
      let name: string;

      if (pattern.source.includes('Mixed number')) {
        // Handle mixed numbers like "1 1/2"
        const parts = match[1].split(/\s+/);
        const whole = parseFloat(parts[0]);
        const fraction = parts[1].split('/');
        quantity = whole + parseFloat(fraction[0]) / parseFloat(fraction[1]);
        unit = match[2];
        name = match[3];
      } else if (match[1].includes('/')) {
        // Handle fractions
        const parts = match[1].split('/');
        quantity = parseFloat(parts[0]) / parseFloat(parts[1]);
        unit = match[2];
        name = match[3];
      } else if (match.length === 3) {
        // Just number + name (no unit)
        quantity = parseFloat(match[1]);
        unit = 'piece';
        name = match[2];
      } else {
        // Standard decimal number
        quantity = parseFloat(match[1]);
        unit = match[2];
        name = match[3];
      }

      return { quantity, unit: unit.trim(), name: name.trim() };
    }
  }

  // If no pattern matches, assume whole string is the name
  return { quantity: 1, unit: 'piece', name: cleanStr };
}

// Match ingredient names (fuzzy matching)
export function ingredientNamesMatch(name1: string, name2: string): boolean {
  const normalize = (str: string) => 
    str.toLowerCase()
      .replace(/[^a-z0-9]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const n1 = normalize(name1);
  const n2 = normalize(name2);

  // Exact match
  if (n1 === n2) return true;

  // One contains the other
  if (n1.includes(n2) || n2.includes(n1)) return true;

  // Handle plurals
  const singular1 = n1.replace(/s$/, '');
  const singular2 = n2.replace(/s$/, '');
  if (singular1 === singular2) return true;

  // Handle common variations
  const variations: { [key: string]: string[] } = {
    'flour': ['all purpose flour', 'plain flour', 'white flour'],
    'sugar': ['white sugar', 'granulated sugar'],
    'brown sugar': ['light brown sugar', 'dark brown sugar'],
    'butter': ['unsalted butter', 'salted butter'],
    'oil': ['vegetable oil', 'cooking oil', 'canola oil'],
    'milk': ['whole milk', '2% milk', 'skim milk'],
    'egg': ['eggs', 'large egg', 'medium egg'],
    'chicken': ['chicken breast', 'chicken thigh', 'chicken pieces'],
    'beef': ['ground beef', 'beef mince', 'minced beef'],
    'tomato': ['tomatoes', 'fresh tomato', 'ripe tomato'],
    'onion': ['yellow onion', 'white onion', 'brown onion'],
    'garlic': ['garlic clove', 'fresh garlic'],
  };

  // Check if both names belong to the same variation group
  for (const [base, variants] of Object.entries(variations)) {
    const allTerms = [base, ...variants].map(normalize);
    if (allTerms.includes(n1) && allTerms.includes(n2)) {
      return true;
    }
  }

  return false;
}

// Calculate how much of an ingredient is available vs needed
export interface IngredientMatch {
  ingredientName: string;
  neededQuantity: number;
  neededUnit: string;
  availableQuantity: number;
  availableUnit: string;
  hasEnough: boolean;
  percentageAvailable: number;
  shortage?: {
    quantity: number;
    unit: string;
  };
}

export function matchIngredientWithInventory(
  recipeIngredient: string,
  inventoryItems: Array<{ name: string; quantity: string; unit: string }>
): IngredientMatch {
  const parsed = parseIngredient(recipeIngredient);
  
  // Find matching inventory item
  const matchingItem = inventoryItems.find(item => 
    ingredientNamesMatch(parsed.name, item.name)
  );

  if (!matchingItem) {
    return {
      ingredientName: parsed.name,
      neededQuantity: parsed.quantity,
      neededUnit: parsed.unit,
      availableQuantity: 0,
      availableUnit: parsed.unit,
      hasEnough: false,
      percentageAvailable: 0,
      shortage: {
        quantity: parsed.quantity,
        unit: parsed.unit,
      },
    };
  }

  // Parse inventory quantity
  const inventoryQuantity = parseFloat(matchingItem.quantity) || 0;
  
  // Try to convert inventory quantity to recipe unit
  const convertedQuantity = convertUnit(
    inventoryQuantity,
    matchingItem.unit,
    parsed.unit
  );

  // If conversion successful, use converted values
  if (convertedQuantity !== null) {
    const hasEnough = convertedQuantity >= parsed.quantity;
    const percentageAvailable = Math.min(100, (convertedQuantity / parsed.quantity) * 100);
    
    return {
      ingredientName: parsed.name,
      neededQuantity: parsed.quantity,
      neededUnit: parsed.unit,
      availableQuantity: convertedQuantity,
      availableUnit: parsed.unit,
      hasEnough,
      percentageAvailable,
      shortage: hasEnough ? undefined : {
        quantity: parsed.quantity - convertedQuantity,
        unit: parsed.unit,
      },
    };
  }

  // If units can't be converted, do simple comparison
  const sameUnit = matchingItem.unit.toLowerCase() === parsed.unit.toLowerCase();
  if (sameUnit) {
    const hasEnough = inventoryQuantity >= parsed.quantity;
    const percentageAvailable = Math.min(100, (inventoryQuantity / parsed.quantity) * 100);
    
    return {
      ingredientName: parsed.name,
      neededQuantity: parsed.quantity,
      neededUnit: parsed.unit,
      availableQuantity: inventoryQuantity,
      availableUnit: matchingItem.unit,
      hasEnough,
      percentageAvailable,
      shortage: hasEnough ? undefined : {
        quantity: parsed.quantity - inventoryQuantity,
        unit: parsed.unit,
      },
    };
  }

  // Can't compare different unit types
  return {
    ingredientName: parsed.name,
    neededQuantity: parsed.quantity,
    neededUnit: parsed.unit,
    availableQuantity: inventoryQuantity,
    availableUnit: matchingItem.unit,
    hasEnough: false, // Conservative: assume not enough if we can't compare
    percentageAvailable: -1, // Indicate unknown
    shortage: {
      quantity: parsed.quantity,
      unit: parsed.unit,
    },
  };
}