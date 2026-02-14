/**
 * =============================================================================
 * APP UPDATE HOOK - OTA Update Management
 * =============================================================================
 *
 * Manages over-the-air (OTA) updates via expo-updates.
 * Checks for updates when the app comes to foreground and also
 * queries the server version-check endpoint to determine if a
 * force update is required.
 *
 * In __DEV__ mode, expo-updates calls are skipped (they don't work
 * in development), but the server endpoint is still checked.
 *
 * @module hooks/useAppUpdate
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { AppState } from "react-native";
import * as Updates from "expo-updates";
import Constants from "expo-constants";
import { getApiUrl } from "@/lib/query-client";
import { logger } from "@/lib/logger";

interface AppUpdateState {
  updateAvailable: boolean;
  isDownloading: boolean;
  forceUpdate: boolean;
}

export function useAppUpdate() {
  const [state, setState] = useState<AppUpdateState>({
    updateAvailable: false,
    isDownloading: false,
    forceUpdate: false,
  });
  const appState = useRef(AppState.currentState);

  const checkForUpdate = useCallback(async () => {
    try {
      if (!__DEV__) {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          setState((prev) => ({ ...prev, updateAvailable: true }));
        }
      }
    } catch (err) {
      logger.warn("[AppUpdate] Failed to check for OTA update", err);
    }

    try {
      const currentVersion =
        Constants.expoConfig?.version ?? "1.0.0";
      const baseUrl = getApiUrl();
      const res = await fetch(
        `${baseUrl}/api/version-check?currentVersion=${encodeURIComponent(currentVersion)}`,
      );
      if (res.ok) {
        const body = await res.json();
        const data = body?.data ?? body;
        if (data.forceUpdate) {
          setState((prev) => ({
            ...prev,
            updateAvailable: true,
            forceUpdate: true,
          }));
        }
      }
    } catch (err) {
      logger.warn("[AppUpdate] Failed to check server version", err);
    }
  }, []);

  const applyUpdate = useCallback(async () => {
    if (__DEV__) {
      logger.log("[AppUpdate] Skipping update apply in dev mode");
      return;
    }

    setState((prev) => ({ ...prev, isDownloading: true }));
    try {
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
    } catch (err) {
      logger.error("[AppUpdate] Failed to apply update", err);
      setState((prev) => ({ ...prev, isDownloading: false }));
    }
  }, []);

  useEffect(() => {
    checkForUpdate();

    const subscription = AppState.addEventListener("change", (nextState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextState === "active"
      ) {
        checkForUpdate();
      }
      appState.current = nextState;
    });

    return () => {
      subscription.remove();
    };
  }, [checkForUpdate]);

  return {
    updateAvailable: state.updateAvailable,
    isDownloading: state.isDownloading,
    forceUpdate: state.forceUpdate,
    applyUpdate,
  };
}
