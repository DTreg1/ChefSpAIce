import * as Sentry from "@sentry/react";
import { logger } from "@/lib/logger";

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;
let initialized = false;

export function initCrashReporter(): void {
  if (initialized) return;
  initialized = true;

  if (!DSN) {
    logger.log("[Sentry] No DSN configured, running in noop mode");
    return;
  }

  try {
    Sentry.init({
      dsn: DSN,
      environment: process.env.NODE_ENV === "production" ? "production" : "development",
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration(),
      ],
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
    });
    logger.log("[Sentry] Web initialized successfully");
  } catch (error) {
    logger.warn("[Sentry] Failed to initialize:", error);
  }
}

export function trackScreenView(screenName: string): void {
  if (!DSN) return;

  try {
    Sentry.addBreadcrumb({
      category: "navigation",
      message: `Navigated to ${screenName}`,
      level: "info",
      data: { screenName },
    });
    logger.log(`[Tracking] Screen view: ${screenName}`);
  } catch (error) {
    logger.warn("[Sentry] Failed to track screen view:", error);
  }
}

export function trackEvent(name: string, data?: Record<string, unknown>): void {
  if (!DSN) return;

  try {
    Sentry.captureEvent({
      message: name,
      level: "info",
      contexts: {
        custom: data || {},
      },
    });
    logger.log(`[Tracking] Event: ${name}`, data);
  } catch (error) {
    logger.warn("[Sentry] Failed to track event:", error);
  }
}

export function trackRecipeGeneration(data: {
  recipeName: string;
  expiringItemsUsed: number;
  totalIngredients: number;
}): void {
  if (!DSN) return;

  try {
    Sentry.captureEvent({
      message: "recipe_generated",
      level: "info",
      contexts: {
        recipe: {
          name: data.recipeName,
          expiringItemsUsed: data.expiringItemsUsed,
          totalIngredients: data.totalIngredients,
        },
      },
    });
    logger.log("[Tracking] Recipe generation:", data);
  } catch (error) {
    logger.warn("[Sentry] Failed to track recipe generation:", error);
  }
}

export function trackInventoryAction(
  action: "add" | "update" | "delete" | "restore",
  data?: Record<string, unknown>,
): void {
  if (!DSN) return;

  try {
    Sentry.addBreadcrumb({
      category: "inventory",
      message: `Inventory item ${action}d`,
      level: "info",
      data: { action, ...data },
    });
    logger.log(`[Tracking] Inventory action: ${action}`, data);
  } catch (error) {
    logger.warn("[Sentry] Failed to track inventory action:", error);
  }
}

export function trackSubscriptionChange(data: {
  tier: string;
  status: string;
  planType?: string | null;
}): void {
  if (!DSN) return;

  try {
    Sentry.captureEvent({
      message: "subscription_changed",
      level: "info",
      contexts: {
        subscription: {
          tier: data.tier,
          status: data.status,
          planType: data.planType || undefined,
        },
      },
    });
    logger.log("[Tracking] Subscription change:", data);
  } catch (error) {
    logger.warn("[Sentry] Failed to track subscription change:", error);
  }
}

export function captureError(
  error: Error,
  context?: Record<string, unknown>,
): void {
  if (!DSN) return;

  try {
    Sentry.captureException(error, {
      contexts: context ? { custom: context } : undefined,
    });
    logger.error("[Tracking] Error captured:", error, context);
  } catch (sentryError) {
    logger.warn("[Sentry] Failed to capture error:", sentryError);
  }
}

export function setUser(
  user: { id: string; email?: string } | null,
): void {
  if (!DSN) return;

  try {
    if (user) {
      Sentry.setUser({
        id: user.id,
        email: user.email,
      });
      logger.log("[Tracking] User set:", user.id);
    } else {
      Sentry.setUser(null);
      logger.log("[Tracking] User cleared");
    }
  } catch (error) {
    logger.warn("[Sentry] Failed to set user:", error);
  }
}

export { Sentry };
