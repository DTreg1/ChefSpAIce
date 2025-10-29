/**
 * Unit Conversion Utilities
 * 
 * Comprehensive ingredient quantity conversion system for recipe-inventory matching.
 * Handles volume, weight, count, and food-specific conversions.
 * 
 * Core Features:
 * - Universal Units: Converts between metric/imperial volume and weight
 * - Food-Specific: Special conversions (e.g., 1 lb bacon = 16 slices)
 * - Ingredient Parsing: Extracts quantity, unit, and name from recipe strings
 * - Fuzzy Matching: Intelligently matches ingredient names despite variations
 * - Size Normalization: Handles "large eggs" vs "eggs" matching
 * 
 * Conversion Categories:
 * 1. Volume: ml, l, tsp, tbsp, cup, pint, quart, gallon (base: ml)
 * 2. Weight: g, kg, mg, oz, lb (base: grams)
 * 3. Count: piece, slice, can, jar, clove, head, etc. (no conversion)
 * 
 * Food-Specific Conversions:
 * - Bacon: 1 lb = 16 slices
 * - Butter: 1 lb = 4 sticks = 32 tbsp; 1 stick = 8 tbsp
 * - Cheese: 1 lb = 4 cups (shredded)
 * - Eggs: 1 dozen = 12 pieces
 * 
 * Example Usage:
 * ```
 * // Recipe requires "2 cups flour"
 * // User has "500g flour" in inventory
 * const parsed = parseIngredient("2 cups flour");
 * // { quantity: 2, unit: "cups", name: "flour" }
 * 
 * const grams = convertUnit(2, "cups", "g");
 * // ~240g (2 cups * 120g/cup approximation for flour)
 * 
 * const matches = ingredientNamesMatch("flour", "all purpose flour");
 * // true - fuzzy matching handles variations
 * ```
 */

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
    
    // Packaging types
    can: 1,
    cans: 1,
    package: 1,
    packages: 1,
    bag: 1,
    bags: 1,
    box: 1,
    boxes: 1,
    container: 1,
    containers: 1,
    jar: 1,
    jars: 1,
    bottle: 1,
    bottles: 1,
    carton: 1,
    cartons: 1,
    packet: 1,
    packets: 1,
    pouch: 1,
    pouches: 1,
    tube: 1,
    tubes: 1,
    
    // Groupings
    bunch: 1,
    bunches: 1,
    bundle: 1,
    bundles: 1,
    
    // Food-specific portions
    clove: 1,
    cloves: 1,
    head: 1,
    heads: 1,
    bulb: 1,
    bulbs: 1,
    rib: 1,
    ribs: 1,
    stalk: 1,
    stalks: 1,
    ear: 1,
    ears: 1,
    leaf: 1,
    leaves: 1,
    sprig: 1,
    sprigs: 1,
    stem: 1,
    stems: 1,
    
    // Meat cuts & portions
    fillet: 1,
    fillets: 1,
    breast: 1,
    breasts: 1,
    thigh: 1,
    thighs: 1,
    leg: 1,
    legs: 1,
    wing: 1,
    wings: 1,
    link: 1,
    links: 1,
    patty: 1,
    patties: 1,
    strip: 1,
    strips: 1,
    
    // Baked goods & sliced items
    stick: 1,
    sticks: 1,
    slice: 1,
    slices: 1,
    loaf: 1,
    loaves: 1,
    roll: 1,
    rolls: 1,
    
    // Small measures
    dash: 1,
    dashes: 1,
    pinch: 1,
    pinches: 1,
    handful: 1,
    handfuls: 1,
  },
};

// Unit aliases - map common abbreviations to canonical forms
const UNIT_ALIASES: { [key: string]: string } = {
  // Volume abbreviations
  'tsp.': 'tsp',
  't': 'tsp',
  'tbsp.': 'tbsp',
  'T': 'tbsp',
  'fl. oz': 'fl oz',
  'fl. oz.': 'fl oz',
  'floz': 'fl oz',
  'c': 'cup',
  'c.': 'cup',
  'pt': 'pint',
  'pt.': 'pint',
  'qt': 'quart',
  'qt.': 'quart',
  'gal': 'gallon',
  'gal.': 'gallon',
  
  // Weight abbreviations
  'oz.': 'oz',
  'lb.': 'lb',
  'g.': 'g',
  'kg.': 'kg',
  'mg.': 'mg',
  
  // Count abbreviations
  'cnt': 'count',
  'ea': 'piece',
  'ea.': 'piece',
  'each': 'piece',
  'pc': 'piece',
  'pc.': 'piece',
  'pcs': 'pieces',
  'pkg': 'package',
  'pkg.': 'package',
  'pkgs': 'packages',
  'btl': 'bottle',
  'btl.': 'bottle',
  'btls': 'bottles',
  'ctn': 'carton',
  'ctn.': 'carton',
  'ctns': 'cartons',
  'pkt': 'packet',
  'pkt.': 'packet',
  'pkts': 'packets',
  'ct': 'count',
  'ct.': 'count',
};

// Food-specific unit conversions
// Maps food names to their specific unit conversions (e.g., "1 lb bacon = 16 slices")
// Structure: { foodName: { fromUnit: { toUnit: conversionFactor } } }
const FOOD_CONVERSIONS: { [foodName: string]: { [fromUnit: string]: { [toUnit: string]: number } } } = {
  'bacon': {
    'lb': { 'slice': 16, 'slices': 16 },
    'lbs': { 'slice': 16, 'slices': 16 },
    'pound': { 'slice': 16, 'slices': 16 },
    'pounds': { 'slice': 16, 'slices': 16 },
  },
  'butter': {
    'lb': { 'stick': 4, 'sticks': 4, 'tbsp': 32, 'tablespoon': 32, 'tablespoons': 32 },
    'lbs': { 'stick': 4, 'sticks': 4, 'tbsp': 32, 'tablespoon': 32, 'tablespoons': 32 },
    'pound': { 'stick': 4, 'sticks': 4, 'tbsp': 32, 'tablespoon': 32, 'tablespoons': 32 },
    'pounds': { 'stick': 4, 'sticks': 4, 'tbsp': 32, 'tablespoon': 32, 'tablespoons': 32 },
    'stick': { 'tbsp': 8, 'tablespoon': 8, 'tablespoons': 8 },
    'sticks': { 'tbsp': 8, 'tablespoon': 8, 'tablespoons': 8 },
  },
  'cheese': {
    // Shredded cheese conversions
    'lb': { 'cup': 4, 'cups': 4 },
    'lbs': { 'cup': 4, 'cups': 4 },
    'pound': { 'cup': 4, 'cups': 4 },
    'pounds': { 'cup': 4, 'cups': 4 },
  },
  'cheddar cheese': {
    'lb': { 'cup': 4, 'cups': 4 },
    'lbs': { 'cup': 4, 'cups': 4 },
    'pound': { 'cup': 4, 'cups': 4 },
    'pounds': { 'cup': 4, 'cups': 4 },
  },
  'mozzarella cheese': {
    'lb': { 'cup': 4, 'cups': 4 },
    'lbs': { 'cup': 4, 'cups': 4 },
    'pound': { 'cup': 4, 'cups': 4 },
    'pounds': { 'cup': 4, 'cups': 4 },
  },
  // Use singular forms as primary keys (extractFoodName normalizes plurals)
  'egg': {
    'dozen': { 'count': 12, 'piece': 12, 'pieces': 12 },
  },
  'eggs': {  // Keep for backwards compatibility
    'dozen': { 'count': 12, 'piece': 12, 'pieces': 12 },
  },
};

// Normalize unit by applying aliases
function normalizeUnit(unit: string): string {
  const trimmed = unit.trim();
  
  // Check for case-sensitive aliases first (e.g., "T" for tablespoon)
  if (UNIT_ALIASES[trimmed]) {
    return UNIT_ALIASES[trimmed];
  }
  
  // Then check lowercase version
  const lowercased = trimmed.toLowerCase();
  return UNIT_ALIASES[lowercased] || lowercased;
}

// Identify unit type
function getUnitType(unit: string): string | null {
  const normalizedUnit = normalizeUnit(unit);
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
  // Normalize units through aliases first
  const normalizedFrom = normalizeUnit(fromUnit);
  const normalizedTo = normalizeUnit(toUnit);
  
  const fromType = getUnitType(normalizedFrom);
  const toType = getUnitType(normalizedTo);

  // Can't convert between different types or unknown units
  if (!fromType || !toType || fromType !== toType) {
    return null;
  }

  // Count units all convert 1:1 (piece, count, slice, etc. are all equivalent)
  if (fromType === 'count') {
    return quantity;
  }

  const conversions = UNIT_CONVERSIONS[fromType];
  const fromFactor = conversions[normalizedFrom];
  const toFactor = conversions[normalizedTo];

  if (!fromFactor || !toFactor) {
    return null;
  }

  // Convert to base unit, then to target unit
  return (quantity * fromFactor) / toFactor;
}

// Convert quantity between units using food-specific conversions
// e.g., "1 lb bacon" to "slices" -> 16 slices
export function convertFoodSpecificUnits(
  foodName: string,
  quantity: number,
  fromUnit: string,
  toUnit: string
): number | null {
  // Normalize food name (lowercase, trim)
  const normalizedFood = foodName.toLowerCase().trim();
  
  // Normalize units through aliases
  const normalizedFrom = normalizeUnit(fromUnit);
  const normalizedTo = normalizeUnit(toUnit);
  
  // Check if we have conversions for this food
  if (!FOOD_CONVERSIONS[normalizedFood]) {
    return null;
  }
  
  const foodConversions = FOOD_CONVERSIONS[normalizedFood];
  
  // Direct conversion: fromUnit -> toUnit
  if (foodConversions[normalizedFrom]?.[normalizedTo]) {
    const conversionFactor = foodConversions[normalizedFrom][normalizedTo];
    return quantity * conversionFactor;
  }
  
  // Reverse conversion: toUnit -> fromUnit (invert the factor)
  if (foodConversions[normalizedTo]?.[normalizedFrom]) {
    const conversionFactor = foodConversions[normalizedTo][normalizedFrom];
    return quantity / conversionFactor;
  }
  
  return null;
}

// Helper function to extract the core food name from an ingredient string
// e.g., "bacon, cooked" -> "bacon", "large eggs" -> "egg", "unsalted butter" -> "butter"
export function extractFoodName(ingredientName: string): string {
  // Remove everything after comma (cooking instructions, states, etc.)
  const baseName = ingredientName.split(',')[0].trim().toLowerCase();
  
  // Remove common preparation, size, and flavor descriptors
  const descriptorTerms = [
    // Preparation terms
    'raw', 'cooked', 'fresh', 'frozen', 'canned', 'dried',
    'shredded', 'sliced', 'diced', 'chopped', 'minced',
    
    // Fat content descriptors
    'whole', 'reduced fat', 'low fat', 'nonfat', 'skim', '2%', 'fat-free',
    
    // Size descriptors  
    'large', 'medium', 'small', 'extra large', 'extra-large', 'x-large',
    'jumbo', 'mini', 'tiny', 'extra small', 'extra-small',
    
    // Flavor/variety descriptors
    'unsalted', 'salted', 'sweetened', 'unsweetened', 'plain',
    'organic', 'free-range', 'grass-fed', 'wild-caught',
  ];
  
  let cleanName = baseName;
  for (const term of descriptorTerms) {
    cleanName = cleanName.replace(new RegExp(`\\b${term}\\b`, 'gi'), '').trim();
  }
  
  // Handle plurals -> singular for better matching
  // egg/eggs -> egg, butter/butters -> butter
  const pluralMappings: { [key: string]: string } = {
    'eggs': 'egg',
    'cheeses': 'cheese',
    'butters': 'butter',
  };
  
  if (pluralMappings[cleanName]) {
    cleanName = pluralMappings[cleanName];
  }
  
  // Clean up extra whitespace
  return cleanName.replace(/\s+/g, ' ').trim();
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
  
  // SPECIAL CASE: Non-quantifiable recipe terminology
  // Phrases like "to taste", "as needed", "for serving" don't have meaningful quantities
  const nonQuantifiablePatterns = [
    /^(to taste|as needed|for serving|optional)\s*(.*)$/i,
    /^(salt and pepper)\s*(to taste)?$/i,
  ];
  
  for (const pattern of nonQuantifiablePatterns) {
    const match = cleanStr.match(pattern);
    if (match) {
      // Extract ingredient name, treating the phrase as the full name if no specific ingredient follows
      const ingredientName = match[2] ? match[2].trim() : match[1].trim();
      return {
        quantity: 0,  // Zero quantity since it's "to taste"
        unit: 'piece',
        name: ingredientName || cleanStr,
      };
    }
  }
  
  // COMPOUND UNIT HANDLING: Detect patterns like "5-oz can tomatoes" or "1 14.5-oz can tomatoes"
  // These have a hyphenated quantity-unit that should be extracted as the primary measurement
  const compoundPatterns = [
    // Pattern: "1 5-oz can tomatoes" (count + hyphenated weight/volume + container + name)
    /^(\d+)\s+(\d+\.?\d*)-([a-z]+)\s+([a-z]+)\s+(.+)$/i,
    // Pattern: "5-oz can tomatoes" (hyphenated weight/volume + container + name)
    /^(\d+\.?\d*)-([a-z]+)\s+([a-z]+)\s+(.+)$/i,
  ];
  
  for (const pattern of compoundPatterns) {
    const match = cleanStr.match(pattern);
    if (match) {
      if (match.length === 6) {
        // Format: "1 5-oz can tomatoes"
        const count = parseFloat(match[1]);
        const weight = parseFloat(match[2]);
        const weightUnit = match[3];
        const container = match[4];
        const ingredientName = match[5];
        
        // Check if the weight unit is valid and container is valid
        if (isValidUnit(weightUnit) && isValidUnit(container)) {
          // Use the weight unit as primary, multiply by count if needed
          return {
            quantity: weight * count,
            unit: weightUnit,
            name: ingredientName,
          };
        }
      } else if (match.length === 5) {
        // Format: "5-oz can tomatoes"
        const weight = parseFloat(match[1]);
        const weightUnit = match[2];
        const ingredientName = match[4];
        
        // Check if the weight unit is valid
        if (isValidUnit(weightUnit)) {
          return {
            quantity: weight,
            unit: weightUnit,
            name: ingredientName,
          };
        }
      }
    }
  }
  
  // Common food descriptors that are not units
  const FOOD_DESCRIPTORS = [
    'boneless', 'skinless', 'fresh', 'frozen', 'dried', 'canned',
    'chopped', 'diced', 'sliced', 'minced', 'shredded', 'grated',
    'cooked', 'raw', 'ripe', 'organic', 'unsalted', 'salted',
    'crumbled', 'crushed', 'whole', 'ground', 'powdered'
  ];

  // Match patterns like "2 cups flour" or "1/2 cup sugar" or "3.5 oz cheese"
  const patterns = [
    // Fraction followed by unit and name
    /^(\d+\/\d+)\s+([a-zA-Z\s]+?)\s+(.+)$/,
    // Mixed number (e.g., "1 1/2")
    /^(\d+\s+\d+\/\d+)\s+([a-zA-Z\s]+?)\s+(.+)$/,
    // Decimal number with potential unit
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
        // Standard decimal number with potential unit
        quantity = parseFloat(match[1]);
        unit = match[2];
        name = match[3];
        
        // Special check: if "unit" starts with capital letter and is not a valid unit,
        // it's probably the food name (e.g., "2 Tomatoes diced")
        if (unit && /^[A-Z]/.test(unit.trim()) && !isValidUnit(unit.trim().toLowerCase())) {
          // Treat the whole thing after the number as the name
          name = `${unit} ${name}`.trim();
          unit = 'piece';
        }
      }

      // Check if the "unit" is actually a food descriptor (like "boneless", "skinless")
      const unitLower = unit?.trim().toLowerCase();
      if (unitLower && FOOD_DESCRIPTORS.includes(unitLower)) {
        // It's a descriptor, not a unit - treat as countable item
        // The whole rest becomes the name, including the descriptor
        return {
          quantity,
          unit: 'piece',
          name: `${unit.trim()} ${name}`.trim()
        };
      }

      // Check if the unit is actually a size descriptor
      // Need to handle both single-word ("large") and multi-word ("extra large") descriptors
      // Also normalize hyphens to spaces for comparison (e.g., "extra-large" → "extra large")
      const trimmedUnit = unit.trim().toLowerCase().replace(/-/g, ' ');
      const trimmedName = name.trim();
      const nameWords = trimmedName.split(/\s+/);
      
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
    'chicken': ['chicken breast', 'chicken breasts', 'chicken thigh', 'chicken pieces', 'boneless chicken', 'skinless chicken', 'boneless skinless chicken', 'boneless skinless chicken breasts', 'skinless chicken breasts'],
    'chicken breast': ['chicken breasts', 'boneless chicken breast', 'skinless chicken breast', 'boneless skinless chicken breast', 'boneless skinless chicken breasts', 'skinless chicken breasts'],
    'beef': ['ground beef', 'beef mince', 'minced beef', 'beef hot dog', 'beef hot dogs'],
    'tomato': ['tomatoes', 'fresh tomato', 'ripe tomato', 'diced tomato', 'tomatoes diced'],
    'onion': ['yellow onion', 'white onion', 'brown onion'],
    'garlic': ['garlic clove', 'fresh garlic'],
    'cheese': ['parmesan', 'parmesan cheese', 'grated parmesan', 'grated parmesan cheese', 'parmesan cheese kraft', 'kraft parmesan'],
    'feta': ['feta cheese', 'crumbled feta', 'feta cheese crumbled'],
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
  
  // Find ALL matching inventory items
  const allMatches = inventoryItems.filter(item => {
    const matches = ingredientNamesMatch(parsed.name, item.name);
    if (matches) {
      console.log(`  ✓ MATCHED with inventory: "${item.name}" (qty: ${item.quantity} ${item.unit}, weight: ${item.weightInGrams || 'N/A'}g)`);
    }
    return matches;
  });
  
  if (allMatches.length === 0) {
    console.log(`  ✗ NO MATCH FOUND for "${parsed.name}"`);
  }
  
  // Smart item selection: If recipe needs weight unit, prioritize items WITH weight data
  const neededUnitType = getUnitType(parsed.unit);
  let matchingItem: typeof allMatches[0] | undefined;
  
  if (neededUnitType === 'weight' && allMatches.length > 0) {
    // Prioritize items with valid weight data
    matchingItem = allMatches.find(item => item.weightInGrams && item.weightInGrams > 0);
    if (matchingItem) {
      console.log(`  → Selected item WITH weight data: ${matchingItem.quantity} ${matchingItem.unit} (${matchingItem.weightInGrams}g)`);
    } else {
      matchingItem = allMatches[0];
      console.log(`  → No weight data available, using first match`);
    }
  } else {
    // For non-weight units, just use the first match
    matchingItem = allMatches[0];
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
  // Note: neededUnitType was already declared above when selecting the matching item
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

  // Try food-specific conversion as fallback
  // e.g., "1 lb bacon" in inventory, recipe needs "2 slices bacon"
  const recipeFood = extractFoodName(parsed.name);
  const inventoryFood = extractFoodName(matchingItem.name);
  
  const foodConvertedQuantity = convertFoodSpecificUnits(
    recipeFood,
    inventoryQuantity,
    matchingItem.unit,
    parsed.unit
  );
  
  if (foodConvertedQuantity !== null) {
    const hasEnough = foodConvertedQuantity >= parsed.quantity;
    const percentageAvailable = Math.min(100, (foodConvertedQuantity / parsed.quantity) * 100);
    
    console.log(`  → Food-specific conversion: ${inventoryQuantity} ${matchingItem.unit} ${inventoryFood} = ${foodConvertedQuantity} ${parsed.unit}`);
    console.log(`  → Has enough: ${hasEnough} (need ${parsed.quantity}, have ${foodConvertedQuantity})`);
    
    return {
      ingredientName: parsed.name,
      neededQuantity: parsed.quantity,
      neededUnit: parsed.unit,
      availableQuantity: foodConvertedQuantity,
      availableUnit: parsed.unit,
      hasEnough,
      percentageAvailable,
      shortage: hasEnough ? undefined : {
        quantity: parsed.quantity - foodConvertedQuantity,
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