import { Alert } from "react-native";
import { syncManager } from "@/lib/sync-manager";
import { offlineMutationQueue, MutationQueueItem } from "@/lib/offline-queue";
import { getApiUrl } from "@/lib/query-client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { logger } from "@/lib/logger";

const AUTH_TOKEN_KEY = "@chefspaice/auth_token";
const MAX_RETRIES = 3;

async function getStoredAuthToken(): Promise<string | null> {
  try {
    const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
    return token ? JSON.parse(token) : null;
  } catch {
    return null;
  }
}

type ReplayResult = "success" | "auth_expired" | "retriable" | "permanent_fail";

async function replayMutation(item: MutationQueueItem): Promise<ReplayResult> {
  const baseUrl = getApiUrl();
  const url = new URL(item.endpoint, baseUrl);
  const token = await getStoredAuthToken();

  const headers: Record<string, string> = {};
  if (item.body) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url.toString(), {
    method: item.method,
    headers,
    body: item.body ? JSON.stringify(item.body) : undefined,
    credentials: "include",
  });

  if (res.status === 401 || res.status === 403) {
    logger.warn("[OfflineProcessor] Auth expired for queued mutation", { endpoint: item.endpoint });
    return "auth_expired";
  }

  if (res.status >= 500 || res.status === 408 || res.status === 429) {
    logger.warn("[OfflineProcessor] Retriable server error", { endpoint: item.endpoint, status: res.status });
    return "retriable";
  }

  if (!res.ok) {
    logger.warn("[OfflineProcessor] Permanent client error", { endpoint: item.endpoint, status: res.status });
    return "permanent_fail";
  }

  syncManager.markRequestSuccess();
  return "success";
}

let isProcessing = false;

async function processQueue(): Promise<void> {
  if (isProcessing) return;

  const items = await offlineMutationQueue.getAll();
  if (items.length === 0) return;

  isProcessing = true;
  logger.log("[OfflineProcessor] Processing mutation queue", { count: items.length });

  const permanentlyFailed: MutationQueueItem[] = [];

  for (const item of items) {
    try {
      const result = await replayMutation(item);
      if (result === "success") {
        await offlineMutationQueue.remove(item.id);
        logger.log("[OfflineProcessor] Successfully replayed mutation", { endpoint: item.endpoint });
      } else if (result === "auth_expired" || result === "permanent_fail") {
        permanentlyFailed.push(item);
        await offlineMutationQueue.remove(item.id);
        logger.warn("[OfflineProcessor] Mutation discarded (non-retriable)", { endpoint: item.endpoint, result });
      } else {
        const newRetryCount = item.retryCount + 1;
        if (newRetryCount >= MAX_RETRIES) {
          permanentlyFailed.push(item);
          await offlineMutationQueue.remove(item.id);
          logger.warn("[OfflineProcessor] Mutation permanently failed after max retries", { endpoint: item.endpoint });
        } else {
          await offlineMutationQueue.updateRetryCount(item.id, newRetryCount);
        }
      }
    } catch (error) {
      syncManager.markRequestFailure();
      logger.error("[OfflineProcessor] Network error replaying mutation", { endpoint: item.endpoint, error: (error as Error).message });
      break;
    }
  }

  isProcessing = false;

  if (permanentlyFailed.length > 0) {
    const count = permanentlyFailed.length;
    try {
      Alert.alert(
        "Some actions could not be completed",
        `${count} offline action${count > 1 ? "s" : ""} failed after multiple retries. These actions have been discarded.`,
        [{ text: "OK", style: "default" }],
      );
    } catch {
      logger.warn("[OfflineProcessor] Could not show failure alert");
    }
  }

  const remaining = await offlineMutationQueue.getAll();
  if (remaining.length > 0 && remaining.some((i) => i.retryCount < MAX_RETRIES)) {
    setTimeout(() => processQueue(), 5000);
  }
}

let initialized = false;

export function initOfflineProcessor(): void {
  if (initialized) return;
  initialized = true;

  syncManager.subscribe((state) => {
    if (state.isOnline) {
      processQueue();
    }
  });

  logger.log("[OfflineProcessor] Initialized - listening for connectivity changes");
}
