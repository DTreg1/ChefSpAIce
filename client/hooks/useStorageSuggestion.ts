import { useMemo, useState, useEffect, useCallback } from "react";
import {
  STORAGE_RECOMMENDATIONS,
  getItemStorageRecommendation,
} from "@/lib/shelf-life-data";
import {
  getUserPreference,
  recordStorageChoice,
} from "@/lib/user-storage-preferences";

export interface StorageSuggestionResult {
  primary: string;
  alternatives: string[];
  notes: string;
  confidence: "high" | "medium" | "low" | "learned" | "strong" | "weak";
  isUserPreference?: boolean;
  originalSuggestion?: string;
  isItemSpecific?: boolean;
}

const CATEGORY_ALIASES: Record<string, string> = {
  "fresh produce": "produce",
  fruits: "produce",
  vegetables: "produce",
  veggies: "produce",
  salad: "produce",
  lettuce: "produce",
  tomatoes: "produce",
  "chicken breast": "meat",
  chicken: "meat",
  beef: "meat",
  pork: "meat",
  steak: "meat",
  "ground beef": "meat",
  turkey: "meat",
  lamb: "meat",
  bacon: "meat",
  sausage: "meat",
  "deli meat": "meat",
  fish: "seafood",
  shrimp: "seafood",
  salmon: "seafood",
  tuna: "seafood",
  crab: "seafood",
  lobster: "seafood",
  "ice cream": "frozen",
  "frozen pizza": "frozen",
  "frozen vegetables": "frozen",
  "frozen dinner": "frozen",
  "frozen meals": "frozen",
  popsicles: "frozen",
  milk: "dairy",
  cheese: "dairy",
  yogurt: "dairy",
  butter: "dairy",
  cream: "dairy",
  "sour cream": "dairy",
  "cottage cheese": "dairy",
  "cream cheese": "dairy",
  rice: "grains",
  pasta: "grains",
  oats: "grains",
  cereal: "grains",
  flour: "grains",
  quinoa: "grains",
  barley: "grains",
  chips: "snacks",
  crackers: "snacks",
  cookies: "snacks",
  nuts: "snacks",
  popcorn: "snacks",
  pretzels: "snacks",
  ketchup: "condiments",
  mustard: "condiments",
  mayonnaise: "condiments",
  "soy sauce": "condiments",
  "hot sauce": "condiments",
  salsa: "condiments",
  "bbq sauce": "condiments",
  dressing: "condiments",
  juice: "beverages",
  soda: "beverages",
  water: "beverages",
  coffee: "beverages",
  tea: "beverages",
  wine: "beverages",
  beer: "beverages",
  "canned beans": "canned",
  "canned soup": "canned",
  "canned tomatoes": "canned",
  "canned vegetables": "canned",
  "canned fruit": "canned",
  "canned tuna": "canned",
  salt: "spices",
  pepper: "spices",
  oregano: "spices",
  basil: "spices",
  cinnamon: "spices",
  cumin: "spices",
  paprika: "spices",
  "garlic powder": "spices",
  loaf: "bread",
  bagel: "bread",
  baguette: "bread",
  rolls: "bread",
  tortilla: "bread",
  pita: "bread",
  muffins: "bread",
  croissant: "bread",
};

const DEFAULT_SUGGESTION: StorageSuggestionResult = {
  primary: "pantry",
  alternatives: ["refrigerator"],
  notes:
    "When in doubt, store in a cool, dry place. Check packaging for specific instructions.",
  confidence: "low",
};

function normalizeCategory(category: string): string {
  return category.toLowerCase().trim();
}

function findItemSpecificMatch(
  itemName: string,
): StorageSuggestionResult | null {
  if (!itemName || itemName.trim() === "") {
    return null;
  }

  const itemRec = getItemStorageRecommendation(itemName);
  if (itemRec && itemRec.locations.length > 0) {
    return {
      primary: itemRec.locations[0],
      alternatives: itemRec.locations.slice(1),
      notes: itemRec.notes,
      confidence: "high",
      isItemSpecific: true,
    };
  }

  return null;
}

function findExactMatch(category: string): StorageSuggestionResult | null {
  const normalized = normalizeCategory(category);

  if (STORAGE_RECOMMENDATIONS[normalized]) {
    const rec = STORAGE_RECOMMENDATIONS[normalized];
    return {
      primary: rec.primary,
      alternatives: [...rec.alternatives],
      notes: rec.notes,
      confidence: "high",
    };
  }

  return null;
}

function findAliasMatch(category: string): StorageSuggestionResult | null {
  const normalized = normalizeCategory(category);

  const aliasKey = CATEGORY_ALIASES[normalized];
  if (aliasKey && STORAGE_RECOMMENDATIONS[aliasKey]) {
    const rec = STORAGE_RECOMMENDATIONS[aliasKey];
    return {
      primary: rec.primary,
      alternatives: [...rec.alternatives],
      notes: rec.notes,
      confidence: "high",
    };
  }

  return null;
}

function findPartialMatch(category: string): StorageSuggestionResult | null {
  const normalized = normalizeCategory(category);

  for (const alias of Object.keys(CATEGORY_ALIASES)) {
    if (normalized.includes(alias) || alias.includes(normalized)) {
      const targetKey = CATEGORY_ALIASES[alias];
      if (STORAGE_RECOMMENDATIONS[targetKey]) {
        const rec = STORAGE_RECOMMENDATIONS[targetKey];
        return {
          primary: rec.primary,
          alternatives: [...rec.alternatives],
          notes: rec.notes,
          confidence: "medium",
        };
      }
    }
  }

  for (const key of Object.keys(STORAGE_RECOMMENDATIONS)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      const rec = STORAGE_RECOMMENDATIONS[key];
      return {
        primary: rec.primary,
        alternatives: [...rec.alternatives],
        notes: rec.notes,
        confidence: "medium",
      };
    }
  }

  return null;
}

export function getBaseSuggestion(
  category: string,
  itemName?: string,
): StorageSuggestionResult {
  if (itemName) {
    const itemMatch = findItemSpecificMatch(itemName);
    if (itemMatch) {
      return itemMatch;
    }
  }

  const exactMatch = findExactMatch(category);
  if (exactMatch) {
    return exactMatch;
  }

  const aliasMatch = findAliasMatch(category);
  if (aliasMatch) {
    return aliasMatch;
  }

  const partialMatch = findPartialMatch(category);
  if (partialMatch) {
    return partialMatch;
  }

  return DEFAULT_SUGGESTION;
}

export function useStorageSuggestion(
  category: string | undefined,
  itemName?: string,
): StorageSuggestionResult | null {
  const [userPreference, setUserPreference] = useState<{
    location: string;
    confidence: "learned" | "strong" | "weak";
  } | null>(null);

  useEffect(() => {
    if (!category || category.trim() === "") {
      setUserPreference(null);
      return;
    }

    const loadUserPreference = async () => {
      const prefKey = itemName?.toLowerCase().trim() || category;
      const pref = await getUserPreference(prefKey);
      if (!pref && itemName) {
        const categoryPref = await getUserPreference(category);
        setUserPreference(categoryPref);
      } else {
        setUserPreference(pref);
      }
    };

    loadUserPreference();
  }, [category, itemName]);

  return useMemo(() => {
    if (!category || category.trim() === "") {
      return null;
    }

    const baseSuggestion = getBaseSuggestion(category, itemName);

    if (userPreference) {
      const normalizedUserLoc =
        userPreference.location === "refrigerator"
          ? "fridge"
          : userPreference.location;
      const alternatives = [
        baseSuggestion.primary,
        ...baseSuggestion.alternatives,
      ].filter(
        (loc) => loc !== normalizedUserLoc && loc !== userPreference.location,
      );

      return {
        primary: normalizedUserLoc,
        alternatives,
        notes: `Based on your preferences. ${baseSuggestion.notes}`,
        confidence: userPreference.confidence,
        isUserPreference: true,
        originalSuggestion: baseSuggestion.primary,
        isItemSpecific: baseSuggestion.isItemSpecific,
      };
    }

    return baseSuggestion;
  }, [category, itemName, userPreference]);
}

function normalizeLocation(location: string): string {
  if (location === "refrigerator") return "fridge";
  return location;
}

export function useStorageRecorder() {
  const record = useCallback(
    async (
      category: string,
      location: string,
      suggestedLocation: string,
      itemName?: string,
    ) => {
      const normalizedLocation = normalizeLocation(location);
      const normalizedSuggested = normalizeLocation(suggestedLocation);
      const wasSuggested = normalizedLocation === normalizedSuggested;
      const prefKey = itemName?.toLowerCase().trim() || category;
      await recordStorageChoice(prefKey, normalizedLocation, wasSuggested);
      if (
        itemName &&
        itemName.toLowerCase().trim() !== category.toLowerCase()
      ) {
        await recordStorageChoice(category, normalizedLocation, wasSuggested);
      }
    },
    [],
  );

  return { recordChoice: record };
}

export function getStorageSuggestion(
  category: string | undefined,
  itemName?: string,
): StorageSuggestionResult | null {
  if (!category || category.trim() === "") {
    return null;
  }

  return getBaseSuggestion(category, itemName);
}

export async function getStorageSuggestionWithPreference(
  category: string | undefined,
  itemName?: string,
): Promise<StorageSuggestionResult | null> {
  if (!category || category.trim() === "") {
    return null;
  }

  const baseSuggestion = getBaseSuggestion(category, itemName);
  const prefKey = itemName?.toLowerCase().trim() || category;
  let userPref = await getUserPreference(prefKey);

  if (!userPref && itemName) {
    userPref = await getUserPreference(category);
  }

  if (userPref) {
    const normalizedUserLoc = normalizeLocation(userPref.location);
    const alternatives = [
      baseSuggestion.primary,
      ...baseSuggestion.alternatives,
    ].filter((loc) => loc !== normalizedUserLoc && loc !== userPref.location);

    return {
      primary: normalizedUserLoc,
      alternatives,
      notes: `Based on your preferences. ${baseSuggestion.notes}`,
      confidence: userPref.confidence,
      isUserPreference: true,
      originalSuggestion: baseSuggestion.primary,
      isItemSpecific: baseSuggestion.isItemSpecific,
    };
  }

  return baseSuggestion;
}
