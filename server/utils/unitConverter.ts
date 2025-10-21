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
    count: 1,
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
    slice: 1,
    slices: 1,
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

// Check if a word is a valid unit (volume, weight, or count)
function isValidUnit(word: string): boolean {
  return getUnitType(word) !== null;
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

  // Count units all convert 1:1 (piece, count, slice, etc. are all equivalent)
  if (fromType === 'count') {
    return quantity;
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

// Common size descriptors that are adjectives, not units
// These describe the SIZE of a countable item (eggs, tomatoes, etc.)
// NOT actual units like "slices", "pieces", "cups", etc.
const SIZE_DESCRIPTORS = [
  'large', 'medium', 'small', 
  'extra large', 'extra-large', 'x-large', 
  'jumbo', 'mini', 'tiny', 
  'extra small', 'extra-small'
];

// Parse ingredient string to extract quantity and unit
export function parseIngredient(ingredientStr: string): {
  quantity: number;
  unit: string;
  name: string;
} {
  // First, normalize commas in the ingredient name (e.g., "olive oil, extra virgin" -> "olive oil extra virgin")
  let cleanStr = ingredientStr.replace(/,\s*/g, ' ');
  // Remove parenthetical notes
  cleanStr = cleanStr.replace(/\([^)]*\)/g, '').trim();
  
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

      // Check if the unit is actually a size descriptor
      // Need to handle both single-word ("large") and multi-word ("extra large") descriptors
      // Also normalize hyphens to spaces for comparison (e.g., "extra-large" → "extra large")
      const trimmedUnit = unit.trim().toLowerCase().replace(/-/g, ' ');
      let trimmedName = name.trim();
      let nameWords = trimmedName.split(/\s+/);
      
      // Check if unit is a descriptor AND first word of name is a valid unit (e.g., "large cloves garlic")
      if (SIZE_DESCRIPTORS.includes(trimmedUnit) && nameWords.length > 0 && isValidUnit(nameWords[0])) {
        // The descriptor modifies a real unit - use the real unit and skip the descriptor
        return {
          quantity,
          unit: nameWords[0],
          name: nameWords.slice(1).join(' ')
        };
      }
      
      // Check if unit alone is a descriptor (e.g., "large eggs")
      if (SIZE_DESCRIPTORS.includes(trimmedUnit)) {
        // It's a size descriptor, not a unit - treat as countable item
        // Keep the descriptor as part of the ingredient name
        return { 
          quantity, 
          unit: 'piece', 
          name: `${unit.trim()} ${trimmedName}`
        };
      }
      
      // Check if unit + first word of name forms a multi-word descriptor (e.g., "extra large eggs")
      if (nameWords.length > 1) {
        const potentialDescriptor = `${trimmedUnit} ${nameWords[0].toLowerCase()}`;
        // But first check if the NEXT word after that is a valid unit (e.g., "extra large slices bacon")
        if (SIZE_DESCRIPTORS.includes(potentialDescriptor) && nameWords.length > 1 && isValidUnit(nameWords[1])) {
          // Multi-word descriptor modifies a real unit
          return {
            quantity,
            unit: nameWords[1],
            name: nameWords.slice(2).join(' ')
          };
        }
        if (SIZE_DESCRIPTORS.includes(potentialDescriptor)) {
          // It's a multi-word size descriptor - treat as countable item
          // Keep the descriptor as part of the ingredient name
          const actualName = nameWords.slice(1).join(' ');
          return { 
            quantity, 
            unit: 'piece', 
            name: `${unit.trim()} ${nameWords[0]} ${actualName}` 
          };
        }
      }
      
      // If unit is 'piece', keep the name as-is, including any size descriptors
      // Size descriptors like "large", "medium", "small" should remain part of the ingredient name
      // This allows "2 large eggs" to match with "eggs" in inventory

      return { quantity, unit: unit.trim(), name: trimmedName };
    }
  }

  // If no pattern matches, assume whole string is the name
  return { quantity: 1, unit: 'piece', name: cleanStr };
}

// Match ingredient names (fuzzy matching)
export function ingredientNamesMatch(name1: string, name2: string): boolean {
  const normalize = (str: string) => {
    let normalized = str.toLowerCase()
      .replace(/,\s*/g, ' ') // Remove commas
      .replace(/[^a-z0-9]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Strip size descriptors from the start of the name for matching
    // This allows "large eggs" to match "eggs"
    const words = normalized.split(' ');
    
    // Check for single-word descriptor at the start
    if (words.length > 1) {
      const firstWord = words[0];
      const normalizedDescriptors = SIZE_DESCRIPTORS.map(d => d.toLowerCase().replace(/-/g, ' '));
      
      if (normalizedDescriptors.includes(firstWord)) {
        // Strip single-word descriptor
        normalized = words.slice(1).join(' ');
      } else if (words.length > 2) {
        // Check for multi-word descriptor (e.g., "extra large")
        const firstTwoWords = `${words[0]} ${words[1]}`;
        if (normalizedDescriptors.includes(firstTwoWords)) {
          // Strip multi-word descriptor
          normalized = words.slice(2).join(' ');
        }
      }
    }
    
    return normalized;
  };

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
  
  // Check if the core ingredient name matches (e.g., "olive oil" in "olive oil extra virgin")
  const words1 = n1.split(' ');
  const words2 = n2.split(' ');
  
  // Check if the first two words match (common for oil, flour, etc.)
  if (words1.length >= 2 && words2.length >= 2) {
    const core1 = words1.slice(0, 2).join(' ');
    const core2 = words2.slice(0, 2).join(' ');
    if (core1 === core2) return true;
  }

  // Handle common variations
  const variations: { [key: string]: string[] } = {
    'flour': ['all purpose flour', 'plain flour', 'white flour', 'all purpose flour for pasta'],
    'sugar': ['white sugar', 'granulated sugar'],
    'brown sugar': ['light brown sugar', 'dark brown sugar'],
    'butter': ['unsalted butter', 'salted butter', 'butter salted'],
    'oil': ['vegetable oil', 'cooking oil', 'canola oil', 'olive oil', 'extra virgin olive oil', 'olive oil extra virgin'],
    'milk': ['whole milk', '2% milk', 'skim milk', '2 milk', 'full fat milk'],
    'egg': ['eggs', 'large egg', 'medium egg', 'large eggs'],
    'chicken': ['chicken breast', 'chicken thigh', 'chicken pieces'],
    'beef': ['ground beef', 'beef mince', 'minced beef', 'beef hot dog', 'beef hot dogs'],
    'tomato': ['tomatoes', 'fresh tomato', 'ripe tomato'],
    'onion': ['yellow onion', 'white onion', 'brown onion'],
    'garlic': ['garlic clove', 'fresh garlic'],
    'cheese': ['parmesan', 'parmesan cheese', 'grated parmesan', 'grated parmesan cheese', 'parmesan cheese kraft', 'kraft parmesan'],
    'pepper': ['black pepper', 'white pepper', 'ground pepper'],
    'pear': ['pears', 'bartlett pear', 'bartlett pears', 'ripe pear', 'ripe pears'],
    'hot dog': ['hot dogs', 'beef hot dog', 'beef hot dogs', 'hot dog beef'],
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
  inventoryItems: Array<{ name: string; quantity: string; unit: string; weightInGrams?: number | null }>
): IngredientMatch {
  const parsed = parseIngredient(recipeIngredient);
  
  console.log(`[DEBUG] Matching "${recipeIngredient}" -> parsed name: "${parsed.name}", unit: "${parsed.unit}", qty: ${parsed.quantity}`);
  
  // Find matching inventory item
  const matchingItem = inventoryItems.find(item => {
    const matches = ingredientNamesMatch(parsed.name, item.name);
    if (matches) {
      console.log(`  ✓ MATCHED with inventory: "${item.name}"`);
    }
    return matches;
  });
  
  if (!matchingItem) {
    console.log(`  ✗ NO MATCH FOUND for "${parsed.name}"`);
  }

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

  // Parse inventory quantity - handle both simple numbers and fractional strings
  let inventoryQuantity = parseFloat(matchingItem.quantity);
  if (isNaN(inventoryQuantity) || inventoryQuantity <= 0) {
    console.log(`  ⚠ Invalid quantity: "${matchingItem.quantity}" - treating as 0`);
    inventoryQuantity = 0;
  }
  
  // NEW: Smart weight-based conversion
  // If the recipe needs a weight unit and we have weight data, use it!
  const neededUnitType = getUnitType(parsed.unit);
  const hasValidWeight = matchingItem.weightInGrams && matchingItem.weightInGrams > 0;
  
  if (neededUnitType === 'weight' && hasValidWeight && inventoryQuantity > 0) {
    // We have weight data! Convert it to the needed unit
    const totalGrams = matchingItem.weightInGrams! * inventoryQuantity;
    const convertedQuantity = convertUnit(totalGrams, 'g', parsed.unit);
    
    if (convertedQuantity !== null) {
      const hasEnough = convertedQuantity >= parsed.quantity;
      const percentageAvailable = Math.min(100, (convertedQuantity / parsed.quantity) * 100);
      
      console.log(`  → Using weight data: ${inventoryQuantity} ${matchingItem.unit} × ${matchingItem.weightInGrams}g = ${totalGrams}g`);
      console.log(`  → Converted: ${totalGrams}g = ${convertedQuantity} ${parsed.unit}`);
      console.log(`  → Has enough: ${hasEnough} (need ${parsed.quantity}, have ${convertedQuantity})`);
      
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
  }
  
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
    
    console.log(`  → Converted: ${inventoryQuantity} ${matchingItem.unit} = ${convertedQuantity} ${parsed.unit}`);
    console.log(`  → Has enough: ${hasEnough} (need ${parsed.quantity}, have ${convertedQuantity})`);
    
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

  // Special handling for 'piece' units
  // If the recipe also specifies 'piece' or a countable unit, compare quantities
  // Otherwise, we can't determine sufficiency
  if (matchingItem.unit.toLowerCase() === 'piece') {
    const isPieceOrCountable = parsed.unit.toLowerCase() === 'piece' || 
                               parsed.unit === '' || 
                               ['egg', 'eggs', 'clove', 'cloves'].includes(parsed.unit.toLowerCase());
    
    if (isPieceOrCountable) {
      const hasEnough = inventoryQuantity >= parsed.quantity;
      const percentageAvailable = Math.min(100, (inventoryQuantity / parsed.quantity) * 100);
      
      return {
        ingredientName: parsed.name,
        neededQuantity: parsed.quantity,
        neededUnit: parsed.unit || 'piece',
        availableQuantity: inventoryQuantity,
        availableUnit: matchingItem.unit,
        hasEnough,
        percentageAvailable,
        shortage: hasEnough ? undefined : {
          quantity: parsed.quantity - inventoryQuantity,
          unit: parsed.unit || 'piece',
        },
      };
    }
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