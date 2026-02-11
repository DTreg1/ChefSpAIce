import { Platform } from "react-native";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApiUrl } from "@/lib/query-client";
import { logger } from "@/lib/logger";
import { captureError } from "@/lib/crash-reporter";

const AUTH_TOKEN_KEY = "@chefspaice/auth_token";

async function getToken(): Promise<string | null> {
  try {
    const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
    return token ? JSON.parse(token) : null;
  } catch {
    return null;
  }
}

interface ErrorReportPayload {
  error: Error;
  componentStack?: string;
  screenName?: string;
}

export async function reportError({ error, componentStack, screenName }: ErrorReportPayload): Promise<void> {
  try {
    const baseUrl = getApiUrl();
    const token = await getToken();

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

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

    await fetch(`${baseUrl}/api/error-report`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
  } catch (reportErr) {
    logger.warn("Failed to send error report", reportErr);
  }
}
