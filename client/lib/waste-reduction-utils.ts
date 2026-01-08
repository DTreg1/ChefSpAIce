/**
 * Shared utilities for WasteReductionTips component
 * Exported for testing
 */
import { Feather } from "@expo/vector-icons";
import { AppColors } from "@/constants/theme";

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

export interface WasteReductionResponse {
  suggestions: WasteTip[];
  expiringItems: ExpiringItem[];
}

export const CATEGORY_ICONS: Record<
  TipCategory,
  keyof typeof Feather.glyphMap
> = {
  recipe: "book-open",
  storage: "box",
  freeze: "thermometer",
  preserve: "archive",
  general: "zap",
};

export const CATEGORY_COLORS: Record<TipCategory, string> = {
  recipe: AppColors.primary,
  storage: AppColors.secondary,
  freeze: "#4FC3F7",
  preserve: AppColors.accent,
  general: AppColors.warning,
};

export function formatExpiryText(daysUntilExpiry: number): string {
  if (daysUntilExpiry < 0) return "Expired";
  if (daysUntilExpiry === 0) return "Today";
  if (daysUntilExpiry === 1) return "Tomorrow";
  return `${daysUntilExpiry} days`;
}

export function getExpiryIconColor(
  daysUntilExpiry: number,
  theme: { error: string; warning: string },
): string {
  return daysUntilExpiry < 0 || daysUntilExpiry <= 1 ? theme.error : theme.warning;
}

export function shouldRenderComponent(
  data: WasteReductionResponse | null | undefined,
  isLoading: boolean,
  error: Error | null,
): "loading" | "hidden" | "visible" {
  if (isLoading) return "loading";
  if (error || !data) return "hidden";
  if (data.expiringItems.length === 0 || data.suggestions.length === 0)
    return "hidden";
  return "visible";
}

export function generateExpiringItemsSignature(
  items: Array<{ id: number; expirationDate: string; quantity: number }>,
): string {
  const today = new Date();
  const fiveDaysFromNow = new Date(today);
  fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5);

  const expiring = items
    .filter((item) => {
      const expiryDate = new Date(item.expirationDate);
      return expiryDate >= today && expiryDate <= fiveDaysFromNow;
    })
    .map((item) => `${item.id}:${item.expirationDate}:${item.quantity}`)
    .sort()
    .join("|");

  return expiring || "none";
}

interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: "default" | "cancel" | "destructive";
}

interface NavigateParams {
  screen?: string;
  params?: Record<string, string | number | boolean>;
  searchQuery?: string;
}

export function handleTipAction(
  tip: WasteTip,
  navigate: (screen: string, params: NavigateParams) => void,
  alertFn: (title: string, msg: string, buttons?: AlertButton[]) => void,
  expiringItem?: ExpiringItem,
): void {
  if (!tip.action) return;
  const { action } = tip;

  switch (action.type) {
    case "search":
      if (action.target === "recipes" && action.params?.query) {
        navigate("Recipes", {
          screen: "RecipeList",
          params: { searchQuery: action.params.query },
        });
      }
      break;
    case "navigate":
      if (action.target === "storageGuide") {
        alertFn(
          "Storage Tips",
          "Keep fruits and vegetables in proper containers. Store dairy on middle shelves where temperature is most consistent. Raw meats should be on bottom shelf to prevent drips.",
        );
      } else if (action.target === "editItem" && expiringItem) {
        alertFn(
          "Move to Freezer",
          `Would you like to move "${expiringItem.name}" to the freezer to extend its shelf life?`,
        );
      }
      break;
  }
}
