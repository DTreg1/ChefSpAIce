import { logger } from "@/lib/logger";

export function initCrashReporter(): void {
  logger.log("[Sentry] Web platform – crash reporting disabled");
}

export function trackScreenView(screenName: string): void {
  logger.log(`[Tracking] Screen view: ${screenName}`);
}

export function trackEvent(name: string, data?: Record<string, unknown>): void {
  logger.log(`[Tracking] Event: ${name}`, data);
}

export function trackRecipeGeneration(data: {
  recipeName: string;
  expiringItemsUsed: number;
  totalIngredients: number;
}): void {
  logger.log("[Tracking] Recipe generation:", data);
}

export function trackInventoryAction(
  action: "add" | "update" | "delete" | "restore",
  data?: Record<string, unknown>,
): void {
  logger.log(`[Tracking] Inventory action: ${action}`, data);
}

export function trackSubscriptionChange(data: {
  tier: string;
  status: string;
  planType?: string | null;
}): void {
  logger.log("[Tracking] Subscription change:", data);
}

export function captureError(
  error: Error,
  context?: Record<string, unknown>,
): void {
  logger.error("[Tracking] Error captured:", error, context);
}

export function setUser(
  user: { id: string; email?: string } | null,
): void {
  if (user) {
    logger.log("[Tracking] User set:", user.id);
  } else {
    logger.log("[Tracking] User cleared");
  }
}

const noopComponent = (props: { children?: React.ReactNode; fallback?: unknown }) =>
  props.children ?? null;

export const Sentry = {
  wrap: <T extends (...args: unknown[]) => unknown>(component: T): T => component,
  ErrorBoundary: noopComponent,
  init: () => {},
  captureException: () => {},
  captureEvent: () => {},
  addBreadcrumb: () => {},
  setUser: () => {},
};
