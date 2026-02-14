import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState, AppStateStatus } from "react-native";
import { getApiUrl } from "@/lib/query-client";
import { logger } from "@/lib/logger";
import {
  MAX_SYNC_QUEUE_SIZE,
  SYNC_KEYS,
  type SyncOperation,
  type SyncDataType,
  type SyncStatus,
  type SyncQueueItem,
  type SyncState,
  type SyncListener,
} from "@/lib/sync-types";
import { showConflictAlert, resolveConflict, showQueueCapacityWarning, notifySyncFailure } from "@/lib/sync-conflicts";

export type { SyncStatus, SyncState } from "@/lib/sync-types";

class SyncManager {
  private listeners: Set<SyncListener> = new Set();
  private isOnline = true;
  private isSyncing = false;
  private syncTimer: ReturnType<typeof setTimeout> | null = null;
  private networkCheckInterval: ReturnType<typeof setInterval> | null = null;
  private consecutiveFailures = 0;
  private lastSuccessfulRequest = Date.now();
  private appState: AppStateStatus = "active";
  private appStateSubscription: ReturnType<
    typeof AppState.addEventListener
  > | null = null;
  private isPaused = false;
  private preferencesSyncTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingPreferences: unknown = null;
  private userProfileSyncTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingUserProfile: unknown = null;
  private consecutiveItemFailures = new Map<string, number>();
  private hasShownQueueWarning = false;

  constructor() {
    this.initNetworkListener();
    this.initAppStateListener();
  }

  private initAppStateListener() {
    this.appState = AppState.currentState;
    this.appStateSubscription = AppState.addEventListener(
      "change",
      (nextAppState) => {
        const wasBackground =
          this.appState === "background" || this.appState === "inactive";
        const isNowActive = nextAppState === "active";

        this.appState = nextAppState;

        if (nextAppState === "background" || nextAppState === "inactive") {
          this.pauseSync();
        } else if (isNowActive && wasBackground) {
          this.resumeSync();
        }
      },
    );
  }

  private pauseSync() {
    if (this.isPaused) return;
    this.isPaused = true;
    logger.log("[Sync] Pausing sync (app in background)");
    if (this.syncTimer) { clearTimeout(this.syncTimer); this.syncTimer = null; }
    if (this.preferencesSyncTimer) { clearTimeout(this.preferencesSyncTimer); this.preferencesSyncTimer = null; }
    if (this.userProfileSyncTimer) { clearTimeout(this.userProfileSyncTimer); this.userProfileSyncTimer = null; }
    if (this.networkCheckInterval) { clearInterval(this.networkCheckInterval); this.networkCheckInterval = null; }
  }

  private resumeSync() {
    if (!this.isPaused) return;
    this.isPaused = false;
    logger.log("[Sync] Resuming sync (app in foreground)");
    if (this.networkCheckInterval) { clearInterval(this.networkCheckInterval); this.networkCheckInterval = null; }
    this.networkCheckInterval = setInterval(() => {
      if (!this.isPaused) { this.checkNetworkStatus(); }
    }, 60000);
    this.checkNetworkStatus();
    this.processSyncQueue();
    if (this.pendingPreferences) { this.flushPreferencesSync(); }
    if (this.pendingUserProfile) { this.flushUserProfileSync(); }
  }

  private async initNetworkListener() {
    this.isOnline = true;

    this.networkCheckInterval = setInterval(() => {
      if (!this.isPaused) {
        this.checkNetworkStatus();
      }
    }, 60000);
  }

  private checkNetworkStatus() {
    const timeSinceLastSuccess = Date.now() - this.lastSuccessfulRequest;
    const wasOffline = !this.isOnline;

    if (this.consecutiveFailures >= 3) {
      this.isOnline = false;
    } else if (timeSinceLastSuccess < 60000) {
      this.isOnline = true;
    }

    if (wasOffline && this.isOnline) {
      logger.log("[Sync] Network restored, processing sync queue");
      this.processSyncQueue();
    } else if (!wasOffline && !this.isOnline) {
      logger.log("[Sync] Network appears offline after multiple failures");
    }

    this.notifyListeners();
  }

  markRequestSuccess() {
    this.consecutiveFailures = 0;
    this.lastSuccessfulRequest = Date.now();
    if (!this.isOnline) {
      this.isOnline = true;
      logger.log("[Sync] Network restored (API request succeeded)");
      this.notifyListeners();
      this.processSyncQueue();
    }
  }

  markRequestFailure() {
    this.consecutiveFailures++;
    if (this.consecutiveFailures >= 3 && this.isOnline) {
      this.isOnline = false;
      logger.log("[Sync] Network appears offline after 3 consecutive failures");
      this.notifyListeners();
    }
  }

  subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    this.getState().then(listener);
    return () => this.listeners.delete(listener);
  }

  private async notifyListeners() {
    const state = await this.getState();
    this.listeners.forEach((listener) => listener(state));
  }

  async getState(): Promise<SyncState> {
    const queue = await this.getQueue();
    const lastSync = await AsyncStorage.getItem(SYNC_KEYS.LAST_SYNC);

    const fatalItems = queue.filter((item) => item.isFatal);
    const pendingItems = queue.filter((item) => !item.isFatal);
    const totalQueueSize = queue.length;
    const queueUsagePercent = Math.round((totalQueueSize / MAX_SYNC_QUEUE_SIZE) * 100);

    let status: SyncStatus = "idle";
    if (!this.isOnline) {
      status = "offline";
    } else if (this.isSyncing) {
      status = "syncing";
    } else if (fatalItems.length > 0) {
      status = "error";
    } else if (pendingItems.length > 0) {
      status = "idle";
    }

    return {
      status,
      lastSyncAt: lastSync,
      pendingChanges: pendingItems.length,
      isOnline: this.isOnline,
      failedItems: fatalItems.length,
      queueSize: totalQueueSize,
      maxQueueSize: MAX_SYNC_QUEUE_SIZE,
      queueUsagePercent,
      isQueueNearCapacity: totalQueueSize >= MAX_SYNC_QUEUE_SIZE * 0.8,
    };
  }

  private async getQueue(): Promise<SyncQueueItem[]> {
    try {
      const data = await AsyncStorage.getItem(SYNC_KEYS.SYNC_QUEUE);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private async setQueue(queue: SyncQueueItem[]): Promise<void> {
    await AsyncStorage.setItem(SYNC_KEYS.SYNC_QUEUE, JSON.stringify(queue));
    if (queue.length < MAX_SYNC_QUEUE_SIZE * 0.8) {
      this.hasShownQueueWarning = false;
    }
    this.notifyListeners();
  }

  async queueChange(
    dataType: SyncDataType,
    operation: SyncOperation,
    data: unknown,
  ): Promise<void> {
    const queue = await this.getQueue();

    const existingIndex = queue.findIndex(
      (item) =>
        item.dataType === dataType &&
        (data as { id?: string })?.id &&
        (item.data as { id?: string })?.id === (data as { id?: string })?.id,
    );

    const newItem: SyncQueueItem = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      dataType,
      operation,
      data,
      timestamp: new Date().toISOString(),
      retryCount: 0,
    };

    if (existingIndex !== -1) {
      if (operation === "delete") {
        queue[existingIndex] = newItem;
      } else if (
        queue[existingIndex].operation === "create" &&
        operation === "update"
      ) {
        queue[existingIndex] = { ...newItem, operation: "create" };
      } else {
        queue[existingIndex] = newItem;
      }
    } else {
      if (queue.length >= MAX_SYNC_QUEUE_SIZE) {
        const oldestUpdateIndex = queue.findIndex(item => item.operation === "update");
        if (oldestUpdateIndex !== -1) {
          queue.splice(oldestUpdateIndex, 1);
        }
      }
      queue.push(newItem);
    }

    if (queue.length >= MAX_SYNC_QUEUE_SIZE * 0.8) {
      this.hasShownQueueWarning = showQueueCapacityWarning(this.hasShownQueueWarning);
    }

    await this.setQueue(queue);
    this.scheduleSyncDebounced();
  }

  private scheduleSyncDebounced() {
    if (this.isPaused) {
      return;
    }

    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
    }

    this.syncTimer = setTimeout(() => {
      this.processSyncQueue();
    }, 2000);
  }

  async processSyncQueue(): Promise<void> {
    if (this.isPaused || !this.isOnline || this.isSyncing) {
      return;
    }

    const token = await this.getAuthToken();
    if (!token) {
      return;
    }

    const queue = await this.getQueue();
    if (queue.length === 0) {
      return;
    }

    this.isSyncing = true;
    this.notifyListeners();

    const processedIds: Set<string> = new Set();
    const failedItems: SyncQueueItem[] = [];
    const maxRetries = 5;
    let hasRetryableErrors = false;

    for (const item of queue) {
      if (item.isFatal) {
        failedItems.push(item);
        continue;
      }

      try {
        await this.syncItem(item, token);
        processedIds.add(item.id);
        const successKey = `${item.dataType}:${(item.data as { id?: string })?.id || "unknown"}`;
        this.consecutiveItemFailures.delete(successKey);
      } catch (error) {
        const syncError = error as {
          statusCode?: number;
          message?: string;
          isConflict?: boolean;
          serverVersion?: unknown;
        };
        const statusCode = syncError.statusCode || 0;
        const is4xxError = statusCode >= 400 && statusCode < 500;
        const isConflict = syncError.isConflict === true;
        const errorMessage = syncError.message || "Unknown sync error";

        logger.error(`[Sync] Failed for ${item.dataType}`, { error: errorMessage, itemId: (item.data as { id?: string })?.id, statusCode });

        const itemKey = `${item.dataType}:${(item.data as { id?: string })?.id || "unknown"}`;
        const prevFailures = this.consecutiveItemFailures.get(itemKey) || 0;
        this.consecutiveItemFailures.set(itemKey, prevFailures + 1);

        if (prevFailures + 1 >= 3 && !item.isFatal) {
          notifySyncFailure(item.dataType, (item.data as { name?: string })?.name || (item.data as { title?: string })?.title || itemKey);
        }

        if (isConflict) {
          logger.warn("[Sync] Conflict detected — pausing queue to ask user", { dataType: item.dataType, itemId: (item.data as { id?: string })?.id });
          const serverVersion = syncError.serverVersion;

          const conflictItem: SyncQueueItem = {
            ...item,
            isFatal: true,
            errorMessage: "Sync conflict — waiting for your choice",
            retryCount: item.retryCount + 1,
          };
          const remainingUnprocessed = queue.filter(
            (q) => !processedIds.has(q.id) && q.id !== item.id && !failedItems.some((f) => f.id === q.id),
          );
          const currentQueue = await this.getQueue();
          const newlyAddedItems = currentQueue.filter(
            (q) => !queue.some((oldItem) => oldItem.id === q.id),
          );
          const pausedQueue = [conflictItem, ...failedItems, ...remainingUnprocessed, ...newlyAddedItems];
          await this.setQueue(pausedQueue);

          if (processedIds.size > 0) {
            await AsyncStorage.setItem(SYNC_KEYS.LAST_SYNC, new Date().toISOString());
          }

          this.isSyncing = false;
          this.notifyListeners();
          showConflictAlert(conflictItem, serverVersion, (conflictedItem, choice) => {
            resolveConflict(conflictedItem, choice, {
              getQueue: () => this.getQueue(),
              setQueue: (q) => this.setQueue(q),
              notifyListeners: () => { this.notifyListeners(); },
              processSyncQueue: () => this.processSyncQueue(),
              fullSync: () => this.fullSync(),
            }).catch((err) => {
              logger.error(`[Sync] Failed to resolve conflict with ${choice} version`, { error: (err as Error).message });
            });
          });
          return;
        } else if (is4xxError || item.retryCount >= maxRetries) {
          logger.warn("[Sync] Marking item as fatal", { dataType: item.dataType, itemId: (item.data as { id?: string })?.id, retryCount: item.retryCount, statusCode });
          failedItems.push({
            ...item,
            isFatal: true,
            errorMessage: `Failed to sync: ${errorMessage}`,
            retryCount: item.retryCount + 1,
          });
        } else {
          failedItems.push({ ...item, retryCount: item.retryCount + 1 });
          hasRetryableErrors = true;
        }
      }
    }

    const currentQueue = await this.getQueue();
    const newlyAddedItems = currentQueue.filter(
      (item) => !queue.some((oldItem) => oldItem.id === item.id),
    );

    const newQueue = [...failedItems, ...newlyAddedItems];
    await this.setQueue(newQueue);

    if (processedIds.size > 0) {
      await AsyncStorage.setItem(SYNC_KEYS.LAST_SYNC, new Date().toISOString());
    }

    this.isSyncing = false;
    this.notifyListeners();

    if (hasRetryableErrors && this.isOnline) {
      const firstRetryableItem = failedItems.find((item) => !item.isFatal);
      const retryCount = firstRetryableItem?.retryCount || 1;
      const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 60000);
      setTimeout(() => {
        this.processSyncQueue();
      }, retryDelay);
    }
  }

  private async syncItem(item: SyncQueueItem, token: string): Promise<void> {
    const baseUrl = getApiUrl();
    const endpoint = `/api/sync/${item.dataType}`;
    const url = new URL(endpoint, baseUrl);

    const method =
      item.operation === "delete"
        ? "DELETE"
        : item.operation === "create"
          ? "POST"
          : "PUT";

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          operation: item.operation,
          data: item.data,
          clientTimestamp: item.timestamp,
        }),
      });
    } catch (error) {
      this.markRequestFailure();
      throw error;
    }

    this.markRequestSuccess();

    if (!response.ok) {
      const error = new Error(`Sync failed: ${response.status}`) as Error & {
        statusCode: number;
      };
      error.statusCode = response.status;
      throw error;
    }

    if (response.status === 204) {
      return;
    }

    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      return;
    }

    const result = (await response.json()).data;

    if (result.operation === "skipped" && result.reason === "stale_update") {
      const error = new Error(
        "Update was stale - server has newer version",
      ) as Error & {
        statusCode: number;
        isConflict: boolean;
        serverVersion: unknown;
      };
      error.statusCode = 409;
      error.isConflict = true;
      error.serverVersion = result.serverVersion || null;
      throw error;
    }
  }

  private async getAuthToken(): Promise<string | null> {
    try {
      const token = await AsyncStorage.getItem("@chefspaice/auth_token");
      return token ? JSON.parse(token) : null;
    } catch {
      return null;
    }
  }

  async fullSync(): Promise<{ success: boolean; error?: string }> {
    const token = await this.getAuthToken();
    if (!token) {
      return { success: false, error: "Not authenticated" };
    }

    this.isSyncing = true;
    this.notifyListeners();

    try {
      await this.processSyncQueue();

      const baseUrl = getApiUrl();
      const url = new URL("/api/auth/sync", baseUrl);

      const lastServerTimestamp = await AsyncStorage.getItem(SYNC_KEYS.SERVER_TIMESTAMP);
      if (lastServerTimestamp) {
        url.searchParams.set("lastSyncedAt", lastServerTimestamp);
      }

      let response: Response;
      try {
        response = await fetch(url.toString(), {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
      } catch (error) {
        this.markRequestFailure();
        throw error;
      }

      this.markRequestSuccess();

      if (!response.ok) {
        throw new Error("Failed to fetch from server");
      }

      const responseData = await response.json();
      const result = responseData.data;

      if (result.serverTimestamp) {
        await AsyncStorage.setItem(SYNC_KEYS.SERVER_TIMESTAMP, result.serverTimestamp);
      }

      if (result.unchanged) {
        logger.log("[Sync] No changes since last sync");
        this.isSyncing = false;
        this.notifyListeners();
        return { success: true };
      }

      const { data } = result;

      if (data) {
        if (data.inventory) {
          await AsyncStorage.setItem(
            "@chefspaice/inventory",
            JSON.stringify(data.inventory),
          );
        }
        if (data.recipes) {
          await AsyncStorage.setItem(
            "@chefspaice/recipes",
            JSON.stringify(data.recipes),
          );
        }
        if (data.mealPlans) {
          await AsyncStorage.setItem(
            "@chefspaice/meal_plans",
            JSON.stringify(data.mealPlans),
          );
        }
        if (data.shoppingList) {
          await AsyncStorage.setItem(
            "@chefspaice/shopping_list",
            JSON.stringify(data.shoppingList),
          );
        }
      }

      await AsyncStorage.setItem(SYNC_KEYS.LAST_SYNC, new Date().toISOString());

      this.isSyncing = false;
      this.notifyListeners();

      return { success: true };
    } catch (error) {
      this.isSyncing = false;
      this.notifyListeners();
      return { success: false, error: (error as Error).message };
    }
  }

  async clearQueue(): Promise<void> {
    await AsyncStorage.removeItem(SYNC_KEYS.SYNC_QUEUE);
    this.notifyListeners();
  }

  async syncPreferences(preferences: unknown): Promise<void> {
    this.pendingPreferences = preferences;

    if (this.isPaused) {
      return;
    }

    if (this.preferencesSyncTimer) {
      clearTimeout(this.preferencesSyncTimer);
    }

    this.preferencesSyncTimer = setTimeout(() => {
      this.flushPreferencesSync();
    }, 2000);
  }

  private async flushPreferencesSync(): Promise<void> {
    if (!this.pendingPreferences || this.isPaused) {
      return;
    }

    const preferences = this.pendingPreferences;
    this.pendingPreferences = null;

    const token = await this.getAuthToken();
    if (!token) {
      logger.log("[Sync] Cannot sync preferences - not authenticated");
      return;
    }

    try {
      const baseUrl = getApiUrl();
      const url = new URL("/api/auth/sync", baseUrl);

      const response = await fetch(url.toString(), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ data: { preferences } }),
      });

      if (response.ok) {
        this.markRequestSuccess();
        logger.log("[Sync] Preferences synced successfully");
      } else {
        this.markRequestFailure();
        logger.error("[Sync] Failed to sync preferences", { status: response.status });
        if (response.status >= 500) {
          this.pendingPreferences = preferences;
          this.preferencesSyncTimer = setTimeout(() => {
            this.flushPreferencesSync();
          }, 5000);
        }
      }
    } catch (error) {
      this.markRequestFailure();
      logger.error("[Sync] Network error syncing preferences", { error: (error as Error).message });
      this.pendingPreferences = preferences;
      this.preferencesSyncTimer = setTimeout(() => {
        this.flushPreferencesSync();
      }, 5000);
    }
  }

  async syncUserProfile(userProfile: unknown): Promise<void> {
    this.pendingUserProfile = userProfile;

    if (this.isPaused) {
      return;
    }

    if (this.userProfileSyncTimer) {
      clearTimeout(this.userProfileSyncTimer);
    }

    this.userProfileSyncTimer = setTimeout(() => {
      this.flushUserProfileSync();
    }, 2000);
  }

  private async flushUserProfileSync(): Promise<void> {
    if (!this.pendingUserProfile || this.isPaused) {
      return;
    }

    const userProfile = this.pendingUserProfile;
    this.pendingUserProfile = null;

    const token = await this.getAuthToken();
    if (!token) {
      logger.log("[Sync] Cannot sync userProfile - not authenticated");
      return;
    }

    try {
      const baseUrl = getApiUrl();
      const url = new URL("/api/auth/sync", baseUrl);

      const response = await fetch(url.toString(), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ data: { userProfile } }),
      });

      if (response.ok) {
        this.markRequestSuccess();
        logger.log("[Sync] UserProfile synced successfully");
      } else {
        this.markRequestFailure();
        logger.error("[Sync] Failed to sync userProfile", { status: response.status });
        if (response.status >= 500) {
          this.pendingUserProfile = userProfile;
          this.userProfileSyncTimer = setTimeout(() => {
            this.flushUserProfileSync();
          }, 5000);
        }
      }
    } catch (error) {
      this.markRequestFailure();
      logger.error("[Sync] Network error syncing userProfile", { error: (error as Error).message });
      this.pendingUserProfile = userProfile;
      this.userProfileSyncTimer = setTimeout(() => {
        this.flushUserProfileSync();
      }, 5000);
    }
  }

  destroy() {
    if (this.networkCheckInterval) {
      clearInterval(this.networkCheckInterval);
    }
    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
    }
    if (this.preferencesSyncTimer) {
      clearTimeout(this.preferencesSyncTimer);
    }
    if (this.userProfileSyncTimer) {
      clearTimeout(this.userProfileSyncTimer);
    }
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }
    this.listeners.clear();
  }

  async getFailedItems(): Promise<SyncQueueItem[]> {
    const queue = await this.getQueue();
    return queue.filter((item) => item.isFatal);
  }

  async clearFailedItems(): Promise<void> {
    const queue = await this.getQueue();
    const newQueue = queue.filter((item) => !item.isFatal);
    await this.setQueue(newQueue);
    this.notifyListeners();
  }

  async retryFailedItems(): Promise<void> {
    const queue = await this.getQueue();
    const hasConflicts = queue.some(
      (item) => item.isFatal && item.errorMessage?.includes("overwritten"),
    );

    if (hasConflicts) {
      await this.fullSync();
      const updatedQueue = await this.getQueue();
      const newQueue = updatedQueue.filter((item) => !item.isFatal);
      await this.setQueue(newQueue);
      this.notifyListeners();
      return;
    }

    const newQueue = queue.map((item) => {
      if (item.isFatal) {
        return {
          ...item,
          isFatal: false,
          retryCount: 0,
          errorMessage: undefined,
        };
      }
      return item;
    });
    await this.setQueue(newQueue);
    this.notifyListeners();
    this.processSyncQueue();
  }

  async getFailedItemDetails(): Promise<
    Array<{ dataType: string; itemName: string; errorMessage: string }>
  > {
    const failedItems = await this.getFailedItems();
    return failedItems.map((item) => {
      const data = item.data as { name?: string; title?: string; id?: string };
      const itemName = data.name || data.title || data.id || "Unknown item";
      return {
        dataType: item.dataType,
        itemName,
        errorMessage: item.errorMessage || "Unknown error",
      };
    });
  }
}

export const syncManager = new SyncManager();
