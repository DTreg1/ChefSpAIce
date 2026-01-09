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

export function parseUnit(unit: string | undefined | null): UnitInfo | null {
  if (!unit) return null;
  const normalized = unit.toLowerCase().trim();
  return ALL_UNITS[normalized] || null;
}

export function getUnitType(unit: string | undefined | null): UnitType {
  const info = parseUnit(unit);
  return info?.type || "unknown";
}

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
