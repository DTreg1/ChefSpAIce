// Utilities for recipe manipulation and parsing

export interface ParsedIngredient {
  quantity: number | null;
  unit: string | null;
  name: string;
  originalMatch: string;
}

export function parseIngredient(ingredientStr: string): ParsedIngredient {
  // Remove parenthetical notes for parsing
  const cleanStr = ingredientStr.trim();

  // Common patterns for ingredients
  const patterns = [
    // Fraction followed by unit and name (e.g., "1/2 cup flour")
    /^(\d+\/\d+)\s+([a-zA-Z]+)\s+(.+)$/,
    // Mixed number (e.g., "1 1/2 cups sugar")
    /^(\d+\s+\d+\/\d+)\s+([a-zA-Z]+)\s+(.+)$/,
    // Decimal number with unit (e.g., "2.5 cups rice")
    /^(\d+\.?\d*)\s+([a-zA-Z]+)\s+(.+)$/,
    // Just a number without unit (e.g., "3 eggs")
    /^(\d+\.?\d*)\s+(.+)$/,
  ];

  for (const pattern of patterns) {
    const match = cleanStr.match(pattern);
    if (match) {
      let quantity: number;
      let unit: string | null = null;
      let name: string;
      let originalMatch: string;

      if (pattern.source.includes("Mixed number")) {
        // Handle mixed numbers like "1 1/2"
        originalMatch = match[1] + " " + match[2];
        const parts = match[1].split(/\s+/);
        const whole = parseFloat(parts[0]);
        const fraction = parts[1].split("/");
        quantity = whole + parseFloat(fraction[0]) / parseFloat(fraction[1]);
        unit = match[2];
        name = match[3];
      } else if (match[1].includes("/")) {
        // Handle fractions
        originalMatch = match[1] + (match[3] ? " " + match[2] : "");
        const parts = match[1].split("/");
        quantity = parseFloat(parts[0]) / parseFloat(parts[1]);
        unit = match[3] ? match[2] : null;
        name = match[3] || match[2];
      } else if (match.length === 3) {
        // Just number + name (no unit)
        originalMatch = match[1];
        quantity = parseFloat(match[1]);
        unit = null;
        name = match[2];
      } else {
        // Standard decimal number with unit
        originalMatch = match[1] + " " + match[2];
        quantity = parseFloat(match[1]);
        unit = match[2];
        name = match[3];
      }

      return {
        quantity,
        unit: unit?.trim() || null,
        name: name.trim(),
        originalMatch,
      };
    }
  }

  // If no pattern matches, return null for quantity
  return {
    quantity: null,
    unit: null,
    name: cleanStr,
    originalMatch: cleanStr, // Use the full string as originalMatch
  };
}

// Format a number to remove unnecessary decimals
export function formatQuantity(num: number): string {
  // Check if it's close to a common fraction
  const fractions = [
    { decimal: 0.25, fraction: "1/4" },
    { decimal: 0.33, fraction: "1/3" },
    { decimal: 0.5, fraction: "1/2" },
    { decimal: 0.66, fraction: "2/3" },
    { decimal: 0.67, fraction: "2/3" },
    { decimal: 0.75, fraction: "3/4" },
  ];

  const wholePart = Math.floor(num);
  const decimalPart = num - wholePart;

  for (const { decimal, fraction } of fractions) {
    if (Math.abs(decimalPart - decimal) < 0.05) {
      return wholePart > 0 ? `${wholePart} ${fraction}` : fraction;
    }
  }

  // Otherwise return as decimal, removing trailing zeros
  return num.toFixed(2).replace(/\.?0+$/, "");
}
