export type UnitType = "volume" | "weight" | "count" | "unknown";

export interface UnitInfo {
  type: UnitType;
  baseUnit: string;
  toBase: number;
}

const VOLUME_UNITS: Record<string, UnitInfo> = {
  ml: { type: "volume", baseUnit: "ml", toBase: 1 },
  milliliter: { type: "volume", baseUnit: "ml", toBase: 1 },
  milliliters: { type: "volume", baseUnit: "ml", toBase: 1 },
  l: { type: "volume", baseUnit: "ml", toBase: 1000 },
  liter: { type: "volume", baseUnit: "ml", toBase: 1000 },
  liters: { type: "volume", baseUnit: "ml", toBase: 1000 },
  litre: { type: "volume", baseUnit: "ml", toBase: 1000 },
  litres: { type: "volume", baseUnit: "ml", toBase: 1000 },
  tsp: { type: "volume", baseUnit: "ml", toBase: 4.929 },
  teaspoon: { type: "volume", baseUnit: "ml", toBase: 4.929 },
  teaspoons: { type: "volume", baseUnit: "ml", toBase: 4.929 },
  tbsp: { type: "volume", baseUnit: "ml", toBase: 14.787 },
  tablespoon: { type: "volume", baseUnit: "ml", toBase: 14.787 },
  tablespoons: { type: "volume", baseUnit: "ml", toBase: 14.787 },
  cup: { type: "volume", baseUnit: "ml", toBase: 236.588 },
  cups: { type: "volume", baseUnit: "ml", toBase: 236.588 },
  "fl oz": { type: "volume", baseUnit: "ml", toBase: 29.574 },
  "fluid ounce": { type: "volume", baseUnit: "ml", toBase: 29.574 },
  "fluid ounces": { type: "volume", baseUnit: "ml", toBase: 29.574 },
  pint: { type: "volume", baseUnit: "ml", toBase: 473.176 },
  pints: { type: "volume", baseUnit: "ml", toBase: 473.176 },
  pt: { type: "volume", baseUnit: "ml", toBase: 473.176 },
  quart: { type: "volume", baseUnit: "ml", toBase: 946.353 },
  quarts: { type: "volume", baseUnit: "ml", toBase: 946.353 },
  qt: { type: "volume", baseUnit: "ml", toBase: 946.353 },
  gallon: { type: "volume", baseUnit: "ml", toBase: 3785.41 },
  gallons: { type: "volume", baseUnit: "ml", toBase: 3785.41 },
  gal: { type: "volume", baseUnit: "ml", toBase: 3785.41 },
};

const WEIGHT_UNITS: Record<string, UnitInfo> = {
  g: { type: "weight", baseUnit: "g", toBase: 1 },
  gram: { type: "weight", baseUnit: "g", toBase: 1 },
  grams: { type: "weight", baseUnit: "g", toBase: 1 },
  kg: { type: "weight", baseUnit: "g", toBase: 1000 },
  kilogram: { type: "weight", baseUnit: "g", toBase: 1000 },
  kilograms: { type: "weight", baseUnit: "g", toBase: 1000 },
  mg: { type: "weight", baseUnit: "g", toBase: 0.001 },
  milligram: { type: "weight", baseUnit: "g", toBase: 0.001 },
  milligrams: { type: "weight", baseUnit: "g", toBase: 0.001 },
  oz: { type: "weight", baseUnit: "g", toBase: 28.3495 },
  ounce: { type: "weight", baseUnit: "g", toBase: 28.3495 },
  ounces: { type: "weight", baseUnit: "g", toBase: 28.3495 },
  lb: { type: "weight", baseUnit: "g", toBase: 453.592 },
  lbs: { type: "weight", baseUnit: "g", toBase: 453.592 },
  pound: { type: "weight", baseUnit: "g", toBase: 453.592 },
  pounds: { type: "weight", baseUnit: "g", toBase: 453.592 },
};

const COUNT_UNITS: Record<string, UnitInfo> = {
  piece: { type: "count", baseUnit: "piece", toBase: 1 },
  pieces: { type: "count", baseUnit: "piece", toBase: 1 },
  pcs: { type: "count", baseUnit: "piece", toBase: 1 },
  item: { type: "count", baseUnit: "piece", toBase: 1 },
  items: { type: "count", baseUnit: "piece", toBase: 1 },
  unit: { type: "count", baseUnit: "piece", toBase: 1 },
  units: { type: "count", baseUnit: "piece", toBase: 1 },
  each: { type: "count", baseUnit: "piece", toBase: 1 },
  whole: { type: "count", baseUnit: "piece", toBase: 1 },
  slice: { type: "count", baseUnit: "piece", toBase: 1 },
  slices: { type: "count", baseUnit: "piece", toBase: 1 },
  clove: { type: "count", baseUnit: "piece", toBase: 1 },
  cloves: { type: "count", baseUnit: "piece", toBase: 1 },
  head: { type: "count", baseUnit: "piece", toBase: 1 },
  heads: { type: "count", baseUnit: "piece", toBase: 1 },
  bunch: { type: "count", baseUnit: "piece", toBase: 1 },
  bunches: { type: "count", baseUnit: "piece", toBase: 1 },
  stalk: { type: "count", baseUnit: "piece", toBase: 1 },
  stalks: { type: "count", baseUnit: "piece", toBase: 1 },
  sprig: { type: "count", baseUnit: "piece", toBase: 1 },
  sprigs: { type: "count", baseUnit: "piece", toBase: 1 },
  can: { type: "count", baseUnit: "piece", toBase: 1 },
  cans: { type: "count", baseUnit: "piece", toBase: 1 },
  bottle: { type: "count", baseUnit: "piece", toBase: 1 },
  bottles: { type: "count", baseUnit: "piece", toBase: 1 },
  jar: { type: "count", baseUnit: "piece", toBase: 1 },
  jars: { type: "count", baseUnit: "piece", toBase: 1 },
  package: { type: "count", baseUnit: "piece", toBase: 1 },
  packages: { type: "count", baseUnit: "piece", toBase: 1 },
  bag: { type: "count", baseUnit: "piece", toBase: 1 },
  bags: { type: "count", baseUnit: "piece", toBase: 1 },
  box: { type: "count", baseUnit: "piece", toBase: 1 },
  boxes: { type: "count", baseUnit: "piece", toBase: 1 },
  dozen: { type: "count", baseUnit: "piece", toBase: 12 },
};

const ALL_UNITS: Record<string, UnitInfo> = {
  ...VOLUME_UNITS,
  ...WEIGHT_UNITS,
  ...COUNT_UNITS,
};

/**
 * Parses a unit string and returns its type information, or null if unknown.
 */
export function parseUnit(unit: string | undefined | null): UnitInfo | null {
  if (!unit) return null;
  const normalized = unit.toLowerCase().trim();
  return ALL_UNITS[normalized] || null;
}

/**
 * Returns the unit type for a given unit string.
 */
export function getUnitType(unit: string | undefined | null): UnitType {
  const info = parseUnit(unit);
  return info?.type || "unknown";
}

/**
 * Converts a quantity to its base unit (g for weight, ml for volume, piece for count).
 */
export function convertToBase(
  quantity: number,
  unit: string | undefined | null,
): { value: number; baseUnit: string; type: UnitType } | null {
  const info = parseUnit(unit);
  if (!info) return null;
  return {
    value: quantity * info.toBase,
    baseUnit: info.baseUnit,
    type: info.type,
  };
}

/**
 * Converts a quantity from one unit to another within the same unit type.
 * Returns null if units are incompatible or unknown.
 */
export function convert(
  quantity: number,
  fromUnit: string,
  toUnit: string,
): number | null {
  const fromInfo = parseUnit(fromUnit);
  const toInfo = parseUnit(toUnit);

  if (!fromInfo || !toInfo) return null;
  if (fromInfo.type !== toInfo.type) return null;

  const baseValue = quantity * fromInfo.toBase;
  return baseValue / toInfo.toBase;
}

/**
 * Checks if two units are compatible (same type) for conversion.
 */
export function areUnitsCompatible(
  unit1: string | undefined | null,
  unit2: string | undefined | null,
): boolean {
  const type1 = getUnitType(unit1);
  const type2 = getUnitType(unit2);

  if (type1 === "unknown" || type2 === "unknown") {
    return false;
  }

  return type1 === type2;
}

/**
 * Formats a quantity with its unit, rounding to 2 decimal places.
 */
export function formatQuantityWithUnit(quantity: number, unit: string): string {
  const rounded = Math.round(quantity * 100) / 100;
  if (rounded === Math.floor(rounded)) {
    return `${Math.floor(rounded)} ${unit}`;
  }
  return `${rounded} ${unit}`;
}

export interface InventoryMatchResult {
  matches: boolean;
  inventoryQuantityInRecipeUnits?: number;
  sufficientQuantity?: boolean;
  conversionNote?: string;
}

/**
 * Matches an inventory item's quantity/unit against a recipe requirement.
 * Returns whether they match and conversion details.
 */
export function matchInventoryToRecipe(
  inventoryQuantity: number | undefined,
  inventoryUnit: string | undefined | null,
  recipeQuantity: number,
  recipeUnit: string,
): InventoryMatchResult {
  if (inventoryQuantity === undefined) {
    return { matches: true };
  }

  const invUnitType = getUnitType(inventoryUnit);
  const recipeUnitType = getUnitType(recipeUnit);

  if (invUnitType === "unknown" && recipeUnitType === "unknown") {
    return { matches: true };
  }

  if (invUnitType === "unknown" || recipeUnitType === "unknown") {
    return {
      matches: true,
      conversionNote: `Units differ (${inventoryUnit || "no unit"} vs ${recipeUnit})`,
    };
  }

  if (invUnitType !== recipeUnitType) {
    return {
      matches: false,
      conversionNote: `Cannot convert ${inventoryUnit} (${invUnitType}) to ${recipeUnit} (${recipeUnitType})`,
    };
  }

  const convertedQuantity = convert(
    inventoryQuantity,
    inventoryUnit!,
    recipeUnit,
  );
  if (convertedQuantity === null) {
    return { matches: true };
  }

  return {
    matches: true,
    inventoryQuantityInRecipeUnits: convertedQuantity,
    sufficientQuantity: convertedQuantity >= recipeQuantity,
    conversionNote:
      inventoryUnit !== recipeUnit
        ? `${inventoryQuantity} ${inventoryUnit} = ${formatQuantityWithUnit(convertedQuantity, recipeUnit)}`
        : undefined,
  };
}

/**
 * Returns the preferred unit for a given unit type.
 */
export function getPreferredUnit(
  unitType: UnitType,
  preferMetric: boolean = true,
): string {
  switch (unitType) {
    case "volume":
      return preferMetric ? "ml" : "cup";
    case "weight":
      return preferMetric ? "g" : "oz";
    case "count":
      return "piece";
    default:
      return "";
  }
}

/**
 * Normalizes a unit string to its canonical short form (e.g., "tablespoon" -> "tbsp").
 */
export function normalizeUnit(unit: string | undefined | null): string {
  if (!unit) return "";
  const info = parseUnit(unit);
  if (!info) return unit;

  const unitLower = unit.toLowerCase().trim();

  const canonicalForms: Record<string, string> = {
    milliliter: "ml",
    milliliters: "ml",
    liter: "L",
    liters: "L",
    litre: "L",
    litres: "L",
    l: "L",
    teaspoon: "tsp",
    teaspoons: "tsp",
    tablespoon: "tbsp",
    tablespoons: "tbsp",
    "fluid ounce": "fl oz",
    "fluid ounces": "fl oz",
    gram: "g",
    grams: "g",
    kilogram: "kg",
    kilograms: "kg",
    milligram: "mg",
    milligrams: "mg",
    ounce: "oz",
    ounces: "oz",
    pound: "lb",
    pounds: "lb",
    lbs: "lb",
    piece: "pc",
    pieces: "pc",
    pcs: "pc",
  };

  return canonicalForms[unitLower] || unit;
}

/**
 * Formats inventory items with quantities and unit equivalents for AI prompts.
 */
export function formatInventoryForPrompt(
  items: Array<{ name: string; quantity?: number; unit?: string | null }>,
): string[] {
  return items.map((item) => {
    if (!item.quantity) {
      return item.name;
    }

    if (!item.unit) {
      return `${item.name}: ${item.quantity}`;
    }

    const normalizedUnit = normalizeUnit(item.unit);
    const unitType = getUnitType(item.unit);

    let equivalents = "";
    if (unitType === "weight") {
      const inGrams = convertToBase(item.quantity, item.unit);
      if (inGrams && item.unit?.toLowerCase() !== "g") {
        equivalents = ` (~${Math.round(inGrams.value)}g)`;
      } else if (item.unit?.toLowerCase() === "g" && item.quantity >= 100) {
        const inOz = convert(item.quantity, "g", "oz");
        if (inOz) equivalents = ` (~${Math.round(inOz * 10) / 10} oz)`;
      }
    } else if (unitType === "volume") {
      const inMl = convertToBase(item.quantity, item.unit);
      if (
        inMl &&
        !["ml", "milliliter", "milliliters"].includes(
          item.unit?.toLowerCase() || "",
        )
      ) {
        equivalents = ` (~${Math.round(inMl.value)}ml)`;
      }
    }

    return `${item.name}: ${item.quantity} ${normalizedUnit}${equivalents}`;
  });
}

export const UNIT_CONVERSION_PROMPT_ADDITION = `
UNIT HANDLING INSTRUCTIONS:
- The user's inventory may use different units than your recipe (e.g., grams vs cups, ml vs fl oz)
- When matching inventory items to recipe ingredients, recognize that units can be converted:
  - VOLUME: 1 cup = 236.6ml, 1 tbsp = 14.8ml, 1 tsp = 4.9ml, 1 fl oz = 29.6ml
  - WEIGHT: 1 oz = 28.3g, 1 lb = 453.6g, 1 kg = 1000g
- If the inventory shows "500g flour" and your recipe needs "2 cups flour", these are compatible
- Use practical, common units in your recipe output (cups, tbsp, g, oz - whatever fits the ingredient best)
- When the user has enough quantity in a compatible unit, mark the ingredient as "fromInventory": true
`;

// ============================================================================
// UNIT ALIASES & NORMALIZATION (extracted from USDA integration)
// ============================================================================

/**
 * Common unit aliases for matching unit names across different formats.
 */
export const UNIT_ALIASES: Record<string, string[]> = {
  slice: ["slice", "slices", "sl"],
  loaf: ["loaf", "loaves"],
  cup: ["cup", "cups", "c"],
  tablespoon: ["tablespoon", "tablespoons", "tbsp", "tbs", "tb"],
  teaspoon: ["teaspoon", "teaspoons", "tsp", "ts"],
  ounce: ["ounce", "ounces", "oz"],
  pound: ["pound", "pounds", "lb", "lbs"],
  gram: ["gram", "grams", "g"],
  kilogram: ["kilogram", "kilograms", "kg"],
  piece: ["piece", "pieces", "pc", "pcs", "each", "ea", "whole"],
  serving: ["serving", "servings", "srv"],
  can: ["can", "cans"],
  bottle: ["bottle", "bottles"],
  package: ["package", "packages", "pkg", "pkgs"],
  head: ["head", "heads"],
  clove: ["clove", "cloves"],
  bunch: ["bunch", "bunches"],
  stalk: ["stalk", "stalks"],
  sprig: ["sprig", "sprigs"],
  large: ["large", "lg"],
  medium: ["medium", "med", "md"],
  small: ["small", "sm"],
};

/**
 * Normalizes a unit name to its canonical form using the UNIT_ALIASES map.
 * @param unit - The unit string to normalize
 * @returns The canonical unit name
 */
export function normalizeUnitName(unit: string): string {
  const lower = unit.toLowerCase().trim();

  for (const [canonical, aliases] of Object.entries(UNIT_ALIASES)) {
    if (aliases.includes(lower)) {
      return canonical;
    }
  }

  return lower;
}

/**
 * Checks if two unit strings match, including partial containment matching.
 * For example, "large slice" contains "slice" so they match.
 * @param portionUnit - The first unit to compare
 * @param searchUnit - The second unit to compare
 * @returns True if the units match
 */
export function unitMatches(portionUnit: string, searchUnit: string): boolean {
  const normPortion = normalizeUnitName(portionUnit);
  const normSearch = normalizeUnitName(searchUnit);

  if (normPortion === normSearch) return true;

  if (normPortion.includes(normSearch) || normSearch.includes(normPortion)) {
    return true;
  }

  return false;
}

// ============================================================================
// STANDARD CONVERSIONS TO GRAMS
// ============================================================================

/**
 * Standard weight unit to grams conversion factors.
 */
export const STANDARD_WEIGHT_TO_GRAMS: Record<string, number> = {
  g: 1,
  gram: 1,
  grams: 1,
  kg: 1000,
  kilogram: 1000,
  kilograms: 1000,
  oz: 28.3495,
  ounce: 28.3495,
  ounces: 28.3495,
  lb: 453.592,
  lbs: 453.592,
  pound: 453.592,
  pounds: 453.592,
  mg: 0.001,
  milligram: 0.001,
  milligrams: 0.001,
};

/**
 * Standard volume unit to grams conversion factors (approximate, assumes water density).
 */
export const STANDARD_VOLUME_TO_GRAMS: Record<string, number> = {
  ml: 1,
  milliliter: 1,
  milliliters: 1,
  l: 1000,
  liter: 1000,
  liters: 1000,
  litre: 1000,
  litres: 1000,
  cup: 240,
  cups: 240,
  tbsp: 15,
  tablespoon: 15,
  tablespoons: 15,
  tsp: 5,
  teaspoon: 5,
  teaspoons: 5,
  "fl oz": 30,
  "fluid ounce": 30,
  "fluid ounces": 30,
};

/**
 * Result of converting a quantity to grams.
 */
export interface QuantityInGrams {
  grams: number;
  conversionUsed: string;
  isApproximate: boolean;
}

/**
 * Converts a quantity with a given unit to grams using standard weight/volume conversions.
 * @param quantity - The numeric quantity to convert
 * @param unit - The unit of the quantity
 * @returns The quantity in grams, or null if the unit cannot be converted
 */
export function convertToGrams(
  quantity: number,
  unit: string,
): QuantityInGrams | null {
  const normalizedUnit = unit.toLowerCase().trim();

  if (STANDARD_WEIGHT_TO_GRAMS[normalizedUnit]) {
    return {
      grams: quantity * STANDARD_WEIGHT_TO_GRAMS[normalizedUnit],
      conversionUsed: `standard weight conversion`,
      isApproximate: false,
    };
  }

  if (STANDARD_VOLUME_TO_GRAMS[normalizedUnit]) {
    return {
      grams: quantity * STANDARD_VOLUME_TO_GRAMS[normalizedUnit],
      conversionUsed: `volume approximation (density varies)`,
      isApproximate: true,
    };
  }

  return null;
}

// ============================================================================
// QUANTITY COMPARISON
// ============================================================================

/**
 * Availability status for an ingredient comparison.
 */
export type AvailabilityStatus = "available" | "partial" | "unavailable";

/**
 * Result of comparing inventory quantity against a required quantity.
 */
export interface QuantityComparisonResult {
  status: AvailabilityStatus;
  inventoryGrams: number | null;
  requiredGrams: number | null;
  percentAvailable: number | null;
  conversionNote?: string;
}

/**
 * Compares an inventory quantity against a required quantity, attempting gram conversion.
 * Falls back to direct comparison for same units, or assumes available if conversion is not possible.
 * @param inventoryQty - The quantity available in inventory
 * @param inventoryUnit - The unit of the inventory quantity
 * @param requiredQty - The required quantity
 * @param requiredUnit - The unit of the required quantity
 * @returns Comparison result with availability status and gram conversions
 */
export function compareQuantities(
  inventoryQty: number,
  inventoryUnit: string | null | undefined,
  requiredQty: number,
  requiredUnit: string,
): QuantityComparisonResult {
  if (!inventoryUnit) {
    if (inventoryQty >= requiredQty) {
      return { status: "available", inventoryGrams: null, requiredGrams: null, percentAvailable: 100 };
    }
    const pct = Math.round((inventoryQty / requiredQty) * 100);
    return {
      status: pct >= 50 ? "partial" : "unavailable",
      inventoryGrams: null,
      requiredGrams: null,
      percentAvailable: pct,
    };
  }

  const inventoryInGrams = convertToGrams(inventoryQty, inventoryUnit);
  const requiredInGrams = convertToGrams(requiredQty, requiredUnit);

  if (!inventoryInGrams || !requiredInGrams) {
    const normInv = normalizeUnitName(inventoryUnit);
    const normReq = normalizeUnitName(requiredUnit);

    if (normInv === normReq || unitMatches(inventoryUnit, requiredUnit)) {
      if (inventoryQty >= requiredQty) {
        return { status: "available", inventoryGrams: null, requiredGrams: null, percentAvailable: 100 };
      }
      const pct = Math.round((inventoryQty / requiredQty) * 100);
      return {
        status: pct >= 50 ? "partial" : "unavailable",
        inventoryGrams: null,
        requiredGrams: null,
        percentAvailable: pct,
        conversionNote: `Same unit comparison: ${inventoryQty}/${requiredQty} ${inventoryUnit}`,
      };
    }

    return {
      status: "available",
      inventoryGrams: null,
      requiredGrams: null,
      percentAvailable: null,
      conversionNote: `Cannot convert between ${inventoryUnit} and ${requiredUnit}`,
    };
  }

  const pct = Math.round((inventoryInGrams.grams / requiredInGrams.grams) * 100);

  let status: AvailabilityStatus;
  if (pct >= 100) {
    status = "available";
  } else if (pct >= 50) {
    status = "partial";
  } else {
    status = "unavailable";
  }

  return {
    status,
    inventoryGrams: inventoryInGrams.grams,
    requiredGrams: requiredInGrams.grams,
    percentAvailable: Math.min(pct, 100),
    conversionNote: `${inventoryQty} ${inventoryUnit} = ${Math.round(inventoryInGrams.grams)}g, need ${Math.round(requiredInGrams.grams)}g`,
  };
}

// ============================================================================
// INSTACART UNIT MAPPING
// ============================================================================

/**
 * All units supported by Instacart's API.
 */
export const INSTACART_UNITS: readonly string[] = [
  "cups",
  "fl oz",
  "tablespoon",
  "teaspoon",
  "gallon",
  "ml",
  "liter",
  "gram",
  "kg",
  "lb",
  "oz",
  "bunch",
  "each",
  "head",
  "large",
  "medium",
  "small",
  "package",
  "bag",
  "bottle",
  "box",
  "can",
  "carton",
  "case",
  "container",
  "dozen",
  "jar",
  "loaf",
  "pack",
  "pair",
  "pallet",
  "piece",
  "pint",
  "quart",
  "roll",
  "set",
  "stick",
  "tray",
  "tub",
  "tube",
  "unit",
] as const;

const INSTACART_UNIT_SET = new Set(INSTACART_UNITS);

const INSTACART_ALIAS_MAP: Record<string, string> = {
  cup: "cups",
  c: "cups",
  "fluid ounce": "fl oz",
  "fluid ounces": "fl oz",
  tbsp: "tablespoon",
  tbs: "tablespoon",
  tb: "tablespoon",
  tablespoons: "tablespoon",
  tsp: "teaspoon",
  ts: "teaspoon",
  teaspoons: "teaspoon",
  gal: "gallon",
  gallons: "gallon",
  milliliter: "ml",
  milliliters: "ml",
  l: "liter",
  liters: "liter",
  litre: "liter",
  litres: "liter",
  g: "gram",
  grams: "gram",
  kilogram: "kg",
  kilograms: "kg",
  lbs: "lb",
  pound: "lb",
  pounds: "lb",
  ounce: "oz",
  ounces: "oz",
  bunches: "bunch",
  ea: "each",
  pc: "each",
  pcs: "each",
  whole: "each",
  item: "each",
  items: "each",
  heads: "head",
  lg: "large",
  med: "medium",
  md: "medium",
  sm: "small",
  packages: "package",
  pkg: "package",
  pkgs: "package",
  bags: "bag",
  bottles: "bottle",
  boxes: "box",
  cans: "can",
  cartons: "carton",
  cases: "case",
  containers: "container",
  dozens: "dozen",
  jars: "jar",
  loaves: "loaf",
  packs: "pack",
  pairs: "pair",
  pallets: "pallet",
  pieces: "piece",
  pints: "pint",
  pt: "pint",
  quarts: "quart",
  qt: "quart",
  rolls: "roll",
  sets: "set",
  sticks: "stick",
  trays: "tray",
  tubs: "tub",
  tubes: "tube",
  units: "unit",
  slice: "piece",
  slices: "piece",
  sl: "piece",
  serving: "each",
  servings: "each",
  srv: "each",
  clove: "each",
  cloves: "each",
  stalk: "each",
  stalks: "each",
  sprig: "each",
  sprigs: "each",
  mg: "gram",
  milligram: "gram",
  milligrams: "gram",
};

/**
 * Normalizes any unit alias to the corresponding Instacart-supported unit string.
 * @param unit - The unit string to normalize
 * @returns The Instacart-compatible unit string
 */
export function toInstacartUnit(unit: string): string {
  const lower = unit.toLowerCase().trim();

  if (INSTACART_UNIT_SET.has(lower)) {
    return lower;
  }

  return INSTACART_ALIAS_MAP[lower] || lower;
}

/**
 * Checks if a unit string (after normalization) is in Instacart's supported unit list.
 * @param unit - The unit string to check
 * @returns True if the unit is supported by Instacart
 */
export function isInstacartUnit(unit: string): boolean {
  const lower = unit.toLowerCase().trim();
  return INSTACART_UNIT_SET.has(lower);
}
