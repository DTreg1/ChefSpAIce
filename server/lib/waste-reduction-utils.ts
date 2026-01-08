/**
 * Shared utilities for waste reduction feature
 * Exported for testing
 */

export type TipCategory =
  | "recipe"
  | "storage"
  | "freeze"
  | "preserve"
  | "general";

export interface TipAction {
  type: "navigate" | "search" | "external";
  target: string;
  params?: Record<string, string | number | boolean>;
}

export interface WasteTip {
  text: string;
  category: TipCategory;
  action?: TipAction;
}

export interface ExpiringItem {
  id: number;
  name: string;
  daysUntilExpiry: number;
  quantity: number;
}

export interface WasteReductionCacheEntry {
  suggestions: WasteTip[];
  expiringItems: ExpiringItem[];
  timestamp: number;
}

export const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export function generateItemsHash(items: ExpiringItem[]): string {
  const signature = items
    .map((item) => `${item.id}:${item.daysUntilExpiry}:${item.quantity}`)
    .sort()
    .join("|");
  let hash = 0;
  for (let i = 0; i < signature.length; i++) {
    const char = signature.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

interface RawTip {
  text?: string;
  category?: TipCategory;
  searchQuery?: string;
}

export function parseTips(rawSuggestions: (string | RawTip)[]): WasteTip[] {
  return rawSuggestions.map((tip) => {
    const baseTip: WasteTip = {
      text: typeof tip === "string" ? tip : tip.text || "",
      category: ((typeof tip === "object" && tip.category) ||
        "general") as TipCategory,
    };

    const tipObj = typeof tip === "object" ? tip : null;

    if (baseTip.category === "recipe" && tipObj?.searchQuery) {
      baseTip.action = {
        type: "search",
        target: "recipes",
        params: { query: tipObj.searchQuery },
      };
    } else if (baseTip.category === "freeze") {
      baseTip.action = {
        type: "navigate",
        target: "editItem",
        params: { changeLocation: "freezer" },
      };
    } else if (baseTip.category === "storage") {
      baseTip.action = {
        type: "navigate",
        target: "storageGuide",
      };
    }

    return baseTip;
  });
}

export function isCacheValid(timestamp: number): boolean {
  return Date.now() - timestamp <= CACHE_TTL_MS;
}
