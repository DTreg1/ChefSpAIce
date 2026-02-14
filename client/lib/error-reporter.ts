import { Platform } from "react-native";
import Constants from "expo-constants";
import { apiClient } from "@/lib/api-client";
import { logger } from "@/lib/logger";
import { captureError } from "@/lib/crash-reporter";

interface ErrorReportPayload {
  error: Error | unknown;
  componentStack?: string;
  screenName?: string;
}

export async function reportError({ error: rawError, componentStack, screenName }: ErrorReportPayload): Promise<void> {
  const error = rawError instanceof Error
    ? rawError
    : new Error(typeof rawError === "string" ? rawError : JSON.stringify(rawError) || "Unknown error");
  try {
    const body = {
      errorMessage: error.message || String(error),
      stackTrace: error.stack ?? undefined,
      componentStack: componentStack ?? undefined,
      screenName: screenName ?? undefined,
      platform: Platform.OS,
      appVersion: Constants.expoConfig?.version ?? undefined,
      deviceInfo: JSON.stringify({
        os: Platform.OS,
        osVersion: Platform.Version,
        isDevice: Constants.isDevice,
      }),
    };

    captureError(error, {
      componentStack: componentStack ?? undefined,
      screenName: screenName ?? undefined,
      platform: Platform.OS,
      appVersion: Constants.expoConfig?.version ?? undefined,
    });

    await apiClient.post<void>("/api/error-report", body);
  } catch (reportErr) {
    logger.warn("Failed to send error report", reportErr);
  }
}
