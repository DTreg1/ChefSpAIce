import { useEffect, useRef, useCallback } from "react";
import { AppState, AppStateStatus } from "react-native";
import * as Sentry from "@sentry/react-native";
import { useAuth } from "@/contexts/AuthContext";
import { storage } from "@/lib/storage";
import { apiClient } from "@/lib/api-client";
import { trackEvent } from "@/lib/crash-reporter";
import { logger } from "@/lib/logger";

async function validateSession(): Promise<void> {
  await apiClient.get<unknown>("/api/sessions/sessions");
}

async function triggerSync(): Promise<void> {
  try {
    const result = await storage.syncFromCloud();
    if (result.success) {
      logger.log("[AppLifecycle] Foreground sync completed");
    }
  } catch (error) {
    logger.warn("[AppLifecycle] Foreground sync failed:", error);
  }
}

async function rescheduleNotifications(): Promise<void> {
  try {
    const { scheduleExpirationNotifications } = await import("@/lib/notifications");
    await scheduleExpirationNotifications();
    logger.log("[AppLifecycle] Notifications rescheduled on foreground");
  } catch (error) {
    logger.warn("[AppLifecycle] Failed to reschedule notifications:", error);
  }
}

async function flushPendingAnalytics(): Promise<void> {
  try {
    trackEvent("app_backgrounded", {
      timestamp: new Date().toISOString(),
    });
    await Sentry.flush();
    logger.log("[AppLifecycle] Analytics flushed on background");
  } catch (error) {
    logger.warn("[AppLifecycle] Failed to flush analytics:", error);
  }
}

async function persistPendingChanges(): Promise<void> {
  try {
    const result = await storage.syncToCloud();
    if (result.success) {
      logger.log("[AppLifecycle] Pending changes persisted on background");
    }
  } catch (error) {
    logger.warn("[AppLifecycle] Failed to persist pending changes:", error);
  }
}

export function useAppLifecycle() {
  const { isAuthenticated } = useAuth();
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const isAuthenticatedRef = useRef(isAuthenticated);

  useEffect(() => {
    isAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated]);

  const handleForeground = useCallback(async () => {
    if (!isAuthenticatedRef.current) return;

    logger.log("[AppLifecycle] App entered foreground");

    try {
      await validateSession();
    } catch {
      return;
    }

    triggerSync();
    rescheduleNotifications();
  }, []);

  const handleBackground = useCallback(async () => {
    if (!isAuthenticatedRef.current) return;

    logger.log("[AppLifecycle] App entered background");

    await Promise.all([
      flushPendingAnalytics(),
      persistPendingChanges(),
    ]);
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      const previousState = appStateRef.current;

      const wasBg = previousState === "background" || previousState === "inactive";
      const isActive = nextAppState === "active";
      const wasActive = previousState === "active";
      const isBg = nextAppState === "background" || nextAppState === "inactive";

      if (wasBg && isActive) {
        handleForeground();
      } else if (wasActive && isBg) {
        handleBackground();
      }

      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [handleForeground, handleBackground]);
}
