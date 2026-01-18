import { AppColors } from "@/constants/theme";

export interface IdentifiedFood {
  name: string;
  category: string;
  quantity: number;
  quantityUnit: string;
  storageLocation: string;
  shelfLifeDays: number;
  confidence: number;
}

export interface AnalysisResult {
  items: IdentifiedFood[];
  notes?: string;
  error?: string;
}

export function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.8) return AppColors.confidenceHigh;
  if (confidence >= 0.5) return AppColors.confidenceMedium;
  return AppColors.confidenceLow;
}

export function getConfidenceLabel(
  confidence: number,
): "High" | "Medium" | "Low" {
  if (confidence >= 0.8) return "High";
  if (confidence >= 0.5) return "Medium";
  return "Low";
}

export function getConfidenceIcon(
  confidence: number,
): "check-circle" | "alert-triangle" | "alert-circle" {
  if (confidence >= 0.8) return "check-circle";
  if (confidence >= 0.5) return "alert-triangle";
  return "alert-circle";
}

export function shouldShowLowConfidenceWarning(confidence: number): boolean {
  return confidence < 0.5;
}

export function toggleItemInSet(
  index: number,
  selectedSet: Set<number>,
): Set<number> {
  const newSet = new Set(selectedSet);
  if (newSet.has(index)) {
    newSet.delete(index);
  } else {
    newSet.add(index);
  }
  return newSet;
}

export function selectAllItems(itemCount: number): Set<number> {
  return new Set(Array.from({ length: itemCount }, (_, i) => i));
}

export function deselectAllItems(): Set<number> {
  return new Set();
}

export function getSelectedItems<T>(
  items: T[],
  selectedIndexes: Set<number>,
): T[] {
  return items.filter((_, index) => selectedIndexes.has(index));
}

export function updateItemInArray<T extends object>(
  items: T[],
  index: number,
  updates: Partial<T>,
): T[] {
  const newItems = [...items];
  newItems[index] = { ...newItems[index], ...updates };
  return newItems;
}

export function shouldShowEmptyState(
  results: AnalysisResult,
  items: unknown[],
): boolean {
  return !!results.error || items.length === 0;
}

export const CATEGORIES = [
  "produce",
  "dairy",
  "meat",
  "seafood",
  "bread",
  "canned",
  "frozen",
  "beverages",
  "condiments",
  "snacks",
  "grains",
  "spices",
  "other",
];

export const STORAGE_LOCATIONS = [
  "refrigerator",
  "freezer",
  "pantry",
  "counter",
];

export const QUANTITY_UNITS = [
  "items",
  "lbs",
  "oz",
  "bunch",
  "container",
  "bag",
  "box",
  "bottle",
  "can",
];

export function formatCategoryDisplay(category: string): string {
  return category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
}

export function formatStorageLocationDisplay(location: string): string {
  return location.charAt(0).toUpperCase() + location.slice(1).toLowerCase();
}
