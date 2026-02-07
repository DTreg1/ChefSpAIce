import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { addDays } from "date-fns";
import {
  SHELF_LIFE_DATA,
  getShelfLife,
  getValidStorageLocations,
  getShelfLifeEntry,
  getShelfLifeForFood,
} from "@/lib/shelf-life-data";
import { getApiUrl } from "@/lib/query-client";
import { useDebounce } from "@/hooks/useDebounce";

export type ConfidenceLevel = "high" | "medium" | "low";

interface ShelfLifeSuggestion {
  suggestedDate: Date;
  suggestedDays: number;
  confidence: ConfidenceLevel;
  notes?: string;
  signsOfSpoilage?: string;
}

export interface UseShelfLifeSuggestionResult {
  suggestion: ShelfLifeSuggestion | null;
  isLoading: boolean;
  isFromAI: boolean;
}

interface UseShelfLifeSuggestionParams {
  category: string;
  storageLocation: string;
  foodName?: string;
}

interface AIShelfLifeResponse {
  suggestedDays: number;
  confidence: ConfidenceLevel;
  source: "local" | "ai";
  notes?: string;
  signsOfSpoilage?: string;
}

const DEFAULT_DAYS = 7;
const DEBOUNCE_MS = 500;

function normalizeString(str: string): string {
  return str.toLowerCase().trim();
}

function findPartialMatch(category: string): {
  days: number;
  notes?: string;
  matchedCategory: string;
} | null {
  const normalizedCategory = normalizeString(category);

  for (const entry of SHELF_LIFE_DATA) {
    const entryCategory = normalizeString(entry.category);

    if (
      normalizedCategory.includes(entryCategory) ||
      entryCategory.includes(normalizedCategory)
    ) {
      return {
        days:
          entry.refrigerator || entry.pantry || entry.freezer || DEFAULT_DAYS,
        notes: entry.notes,
        matchedCategory: entry.category,
      };
    }
  }

  const categoryKeywords: Record<string, string[]> = {
    milk: ["dairy", "cream", "lactose"],
    cheese: ["cheddar", "mozzarella", "parmesan", "brie", "gouda", "swiss"],
    yogurt: ["greek", "probiotic"],
    beef: ["steak", "ground beef", "roast", "brisket"],
    chicken: ["poultry", "turkey", "duck", "wings", "breast", "thigh"],
    pork: ["bacon", "ham", "sausage", "chop"],
    seafood: [
      "fish",
      "salmon",
      "tuna",
      "shrimp",
      "lobster",
      "crab",
      "shellfish",
    ],
    fruits: ["apple", "banana", "orange", "berry", "grape", "melon", "citrus"],
    vegetables: [
      "carrot",
      "broccoli",
      "spinach",
      "lettuce",
      "tomato",
      "onion",
      "pepper",
    ],
    bread: ["loaf", "baguette", "roll", "toast", "sourdough"],
    bakery: ["cake", "pastry", "cookie", "muffin", "croissant", "donut"],
    eggs: ["egg"],
    condiments: [
      "ketchup",
      "mustard",
      "mayo",
      "mayonnaise",
      "salsa",
      "dressing",
    ],
    leftovers: ["leftover", "cooked", "prepared"],
    grains: ["rice", "quinoa", "oat", "barley", "wheat"],
    pasta: ["spaghetti", "noodle", "macaroni", "penne", "linguine"],
    snacks: ["chip", "cracker", "pretzel", "popcorn"],
    spices: ["spice", "seasoning", "salt", "pepper", "cumin", "paprika"],
    herbs: ["basil", "cilantro", "parsley", "mint", "rosemary", "thyme"],
    nuts: ["almond", "walnut", "peanut", "cashew", "pistachio"],
    juice: ["orange juice", "apple juice", "smoothie"],
    sauces: ["sauce", "marinara", "pesto", "gravy"],
  };

  for (const [mainCategory, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some((keyword) => normalizedCategory.includes(keyword))) {
      const entry = SHELF_LIFE_DATA.find(
        (e) => normalizeString(e.category) === mainCategory,
      );
      if (entry) {
        return {
          days:
            entry.refrigerator || entry.pantry || entry.freezer || DEFAULT_DAYS,
          notes: entry.notes,
          matchedCategory: entry.category,
        };
      }
    }
  }

  return null;
}

function getDaysForLocation(category: string, location: string): number | null {
  const normalizedLocation = normalizeString(location);

  const locationMap: Record<string, string> = {
    fridge: "refrigerator",
    freezer: "freezer",
    pantry: "pantry",
    counter: "counter",
    refrigerator: "refrigerator",
  };

  const mappedLocation = locationMap[normalizedLocation];
  if (!mappedLocation) {
    return null;
  }

  return getShelfLife(category, mappedLocation);
}

async function fetchAIShelfLife(
  foodName: string,
  category: string,
  storage: string,
): Promise<AIShelfLifeResponse> {
  const baseUrl = getApiUrl();
  const url = new URL("/api/suggestions/shelf-life", baseUrl);

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      foodName,
      category,
      storageLocation: storage,
    }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return (await response.json()).data as any;
}

interface LocalSuggestionResult {
  suggestion: ShelfLifeSuggestion | null;
  needsAI: boolean;
}

function getLocalSuggestion(
  category: string,
  storageLocation: string,
  foodName?: string,
): LocalSuggestionResult {
  if (!storageLocation) {
    return { suggestion: null, needsAI: false };
  }

  const normalizedLocation = normalizeString(storageLocation);
  const mappedLocation =
    normalizedLocation === "fridge" ? "refrigerator" : normalizedLocation;

  const validLocationAliases = [
    "refrigerator",
    "fridge",
    "freezer",
    "pantry",
    "counter",
  ];

  if (!validLocationAliases.includes(normalizedLocation)) {
    return { suggestion: null, needsAI: false };
  }

  // First try to match by food name using fuzzy matching
  if (foodName) {
    const foodResult = getShelfLifeForFood(foodName, mappedLocation);
    if (foodResult && foodResult.days > 0) {
      return {
        suggestion: {
          suggestedDate: addDays(new Date(), foodResult.days),
          suggestedDays: foodResult.days,
          confidence: "high",
          notes: foodResult.notes,
        },
        needsAI: false,
      };
    }
  }

  if (!category) {
    return {
      suggestion: {
        suggestedDate: addDays(new Date(), DEFAULT_DAYS),
        suggestedDays: DEFAULT_DAYS,
        confidence: "low",
        notes: "No specific data available. Using default 7-day estimate.",
      },
      needsAI: true,
    };
  }

  // Try exact category match
  const exactDays = getDaysForLocation(category, storageLocation);
  const entry = getShelfLifeEntry(category);

  if (exactDays !== null && exactDays > 0 && entry) {
    return {
      suggestion: {
        suggestedDate: addDays(new Date(), exactDays),
        suggestedDays: exactDays,
        confidence: "high",
        notes: entry.notes,
      },
      needsAI: false,
    };
  }

  if (entry) {
    const validLocations = getValidStorageLocations(category);
    if (validLocations.length > 0 && !validLocations.includes(mappedLocation)) {
      return { suggestion: null, needsAI: false };
    }
  }

  // Try partial match on category
  const partialMatch = findPartialMatch(category);
  if (partialMatch) {
    const matchedEntry = getShelfLifeEntry(partialMatch.matchedCategory);
    if (matchedEntry) {
      const locationDays = getDaysForLocation(
        partialMatch.matchedCategory,
        storageLocation,
      );

      if (locationDays !== null && locationDays > 0) {
        return {
          suggestion: {
            suggestedDate: addDays(new Date(), locationDays),
            suggestedDays: locationDays,
            confidence: "medium",
            notes: partialMatch.notes,
          },
          needsAI: false,
        };
      }

      const validLocations = getValidStorageLocations(
        partialMatch.matchedCategory,
      );
      if (
        validLocations.length > 0 &&
        !validLocations.includes(mappedLocation)
      ) {
        return { suggestion: null, needsAI: false };
      }
    }

    return {
      suggestion: {
        suggestedDate: addDays(new Date(), partialMatch.days),
        suggestedDays: partialMatch.days,
        confidence: "medium",
        notes: partialMatch.notes,
      },
      needsAI: false,
    };
  }

  return {
    suggestion: {
      suggestedDate: addDays(new Date(), DEFAULT_DAYS),
      suggestedDays: DEFAULT_DAYS,
      confidence: "low",
      notes: "No specific data available. Using default 7-day estimate.",
    },
    needsAI: true,
  };
}

export function useShelfLifeSuggestion({
  category,
  storageLocation,
  foodName,
}: UseShelfLifeSuggestionParams): UseShelfLifeSuggestionResult {
  const debouncedFoodName = useDebounce(foodName || category, DEBOUNCE_MS);
  const debouncedCategory = useDebounce(category, DEBOUNCE_MS);
  const debouncedLocation = useDebounce(storageLocation, DEBOUNCE_MS);

  const localResult = useMemo(() => {
    return getLocalSuggestion(category, storageLocation, foodName);
  }, [category, storageLocation, foodName]);

  const shouldFetchAI =
    localResult.needsAI && !!debouncedFoodName && !!debouncedLocation;

  const { data: aiData, isLoading: isAILoading } =
    useQuery<AIShelfLifeResponse>({
      queryKey: [
        "/api/suggestions/shelf-life",
        debouncedFoodName,
        debouncedCategory,
        debouncedLocation,
      ],
      queryFn: () =>
        fetchAIShelfLife(
          debouncedFoodName,
          debouncedCategory,
          debouncedLocation,
        ),
      enabled: shouldFetchAI,
      staleTime: 24 * 60 * 60 * 1000,
      gcTime: 24 * 60 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
    });

  const result = useMemo((): UseShelfLifeSuggestionResult => {
    if (!localResult.needsAI) {
      return {
        suggestion: localResult.suggestion,
        isLoading: false,
        isFromAI: false,
      };
    }

    if (shouldFetchAI && isAILoading) {
      return {
        suggestion: localResult.suggestion,
        isLoading: true,
        isFromAI: false,
      };
    }

    if (aiData && aiData.source === "ai") {
      return {
        suggestion: {
          suggestedDate: addDays(new Date(), aiData.suggestedDays),
          suggestedDays: aiData.suggestedDays,
          confidence: aiData.confidence,
          notes: aiData.notes,
          signsOfSpoilage: aiData.signsOfSpoilage,
        },
        isLoading: false,
        isFromAI: true,
      };
    }

    if (aiData) {
      return {
        suggestion: {
          suggestedDate: addDays(new Date(), aiData.suggestedDays),
          suggestedDays: aiData.suggestedDays,
          confidence: aiData.confidence,
          notes: aiData.notes,
        },
        isLoading: false,
        isFromAI: false,
      };
    }

    return {
      suggestion: localResult.suggestion,
      isLoading: false,
      isFromAI: false,
    };
  }, [localResult, shouldFetchAI, isAILoading, aiData]);

  return result;
}
