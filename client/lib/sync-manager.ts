/**
 * SyncManager — Local-First Cloud Sync Engine
 *
 * ## When Sync Occurs
 * - **App foreground**: When the app transitions from background/inactive to active,
 *   `resumeSync()` immediately processes any queued changes and flushes pending
 *   preferences/profile updates.
 * - **After mutations**: Every local write (add, update, delete an inventory item,
 *   recipe, meal plan, or shopping list item) calls `queueChange()`, which
 *   debounces and triggers `processSyncQueue()` after 2 seconds of inactivity.
 * - **Periodic timer**: A network-health check runs every 60 seconds. When the
 *   manager detects connectivity has been restored (after 3+ consecutive failures),
 *   it automatically drains the queue.
 * - **Manual full sync**: `fullSync()` can be called explicitly (e.g. after a chat
 *   action or pull-to-refresh). It first drains the outbound queue, then fetches
 *   the latest server state via GET /api/auth/sync.
 *
 * ## Conflict Resolution Strategy (User Choice)
 * Each item carries an `updatedAt` ISO timestamp set at mutation time on the client.
 *
 * **Client → Server (outbound)**:
 * On POST (create) the server upserts — if the item already exists, it overwrites.
 * On PUT (update) the server compares `data.updatedAt` against the existing row's
 * `updatedAt`. If the incoming timestamp is older or equal, the server responds
 * with `{ operation: "skipped", reason: "stale_update", serverVersion: {...} }`
 * including the full server row. The client detects this as a conflict and
 * presents an Alert with two choices:
 *   - "This Device": re-sends the local data with a fresh `updatedAt` to
 *     override the server version.
 *   - "Other Device": discards the local queue item and runs `fullSync()` to
 *     pull the server's version.
 *
 * **Server → Client (inbound / full sync)**:
 * `fullSync()` fetches the server's current state and overwrites local storage
 * wholesale (per data section). This means the server is the source of truth
 * after a full sync — any local-only changes that were not yet pushed will be
 * lost unless they are still in the sync queue (which is drained first).
 *
 * ## Offline Behavior
 * - Changes are persisted to the sync queue in AsyncStorage and survive app restarts.
 * - Network status is inferred heuristically: 3+ consecutive fetch failures → offline.
 *   A single successful request → online.
 * - While offline, `processSyncQueue()` is a no-op. When connectivity returns
 *   (detected by the 60-second health check or an unrelated successful API call),
 *   the queue is automatically drained.
 * - Failed items are retried with exponential back-off (2^n seconds, max 30 s).
 *   After 5 retries or a 4xx status, the item is marked `isFatal` and surfaced
 *   to the user via an alert.
 *
 * ## Queue Coalescing
 * When a new change is queued for an item that already has a pending entry
 * (matched by `dataType` + `data.id`):
 * - A "delete" always replaces the earlier entry.
 * - An "update" on top of a pending "create" keeps the operation as "create"
 *   (the server only needs the final state).
 * - Otherwise the newer entry replaces the older one.
 *
 * ## How Deletions Are Handled
 * - **Soft delete** (inventory): The client sets `deletedAt` on the item and
 *   syncs it as an "update" operation. The server persists `deleted_at` on the
 *   row. The GET sync endpoint filters out soft-deleted items with
 *   `isNull(deletedAt)`, so they do not come back on full sync.
 * - **Permanent purge** (inventory, after 30 days): The client sends a "delete"
 *   operation. The server physically removes the row.
 * - **Hard delete** (recipes, meal plans, shopping list, cookware): The client
 *   sends a "delete" operation and the server removes the row immediately.
 *
 * ## Known Edge Case
 * If the same item is edited on two devices while both are offline, the device
 * that syncs last triggers a conflict. The earlier device sees an Alert showing
 * both versions and can choose "This Device" (override with fresh timestamp) or
 * "Other Device" (discard local change and pull server version via fullSync).
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert, AppState, AppStateStatus } from "react-native";
import { getApiUrl } from "@/lib/query-client";
import { logger } from "@/lib/logger";

const MAX_SYNC_QUEUE_SIZE = 500;

const SYNC_KEYS = {
  SYNC_QUEUE: "@chefspaice/sync_queue",
  LAST_SYNC: "@chefspaice/last_sync",
  SYNC_STATUS: "@chefspaice/sync_status",
  SERVER_TIMESTAMP: "@chefspaice/server_timestamp",
} as const;

type SyncOperation = "create" | "update" | "delete";
type SyncDataType = "inventory" | "recipes" | "mealPlans" | "shoppingList";

export type SyncStatus = "idle" | "syncing" | "offline" | "error";

interface SyncQueueItem {
  id: string;
  dataType: SyncDataType;
  operation: SyncOperation;
  data: unknown;
  timestamp: string;
  retryCount: number;
  errorMessage?: string;
  isFatal?: boolean;
}

export interface SyncState {
  status: SyncStatus;
  lastSyncAt: string | null;
  pendingChanges: number;
  isOnline: boolean;
  failedItems: number;
  queueSize: number;
  maxQueueSize: number;
  queueUsagePercent: number;
  isQueueNearCapacity: boolean;
}

type SyncListener = (state: SyncState) => void;

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
          // App going to background - pause sync operations to save battery
          this.pauseSync();
        } else if (isNowActive && wasBackground) {
          // App coming back to foreground - resume sync
          this.resumeSync();
        }
      },
    );
  }

  private pauseSync() {
    if (this.isPaused) return;

    this.isPaused = true;
    logger.log("[Sync] Pausing sync (app in background)");

    // Clear any pending sync timers
    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
      this.syncTimer = null;
    }

    // Clear preferences sync timer
    if (this.preferencesSyncTimer) {
      clearTimeout(this.preferencesSyncTimer);
      this.preferencesSyncTimer = null;
    }

    // Clear userProfile sync timer
    if (this.userProfileSyncTimer) {
      clearTimeout(this.userProfileSyncTimer);
      this.userProfileSyncTimer = null;
    }

    // Pause network check interval
    if (this.networkCheckInterval) {
      clearInterval(this.networkCheckInterval);
      this.networkCheckInterval = null;
    }
  }

  private resumeSync() {
    if (!this.isPaused) return;

    this.isPaused = false;
    logger.log("[Sync] Resuming sync (app in foreground)");

    // Clear any existing interval to avoid duplicates
    if (this.networkCheckInterval) {
      clearInterval(this.networkCheckInterval);
      this.networkCheckInterval = null;
    }

    // Always reinstate network check interval on resume
    this.networkCheckInterval = setInterval(() => {
      if (!this.isPaused) {
        this.checkNetworkStatus();
      }
    }, 60000); // 60 seconds

    // Immediately check network status on resume
    this.checkNetworkStatus();

    // Process any pending sync items
    this.processSyncQueue();

    // Flush any pending preferences sync
    if (this.pendingPreferences) {
      this.flushPreferencesSync();
    }

    // Flush any pending userProfile sync
    if (this.pendingUserProfile) {
      this.flushUserProfileSync();
    }
  }

  private async initNetworkListener() {
    // Assume online by default - expo-network is unreliable in Expo Go
    this.isOnline = true;

    // Check periodically but with a longer interval since we track API success/failure
    this.networkCheckInterval = setInterval(() => {
      if (!this.isPaused) {
        this.checkNetworkStatus();
      }
    }, 60000); // Check every 60 seconds (was 30) for better battery
  }

  private checkNetworkStatus() {
    // Simple heuristic: if we've had recent successful requests, we're online
    // If we've had 3+ consecutive failures, we're offline
    const timeSinceLastSuccess = Date.now() - this.lastSuccessfulRequest;
    const wasOffline = !this.isOnline;

    if (this.consecutiveFailures >= 3) {
      this.isOnline = false;
    } else if (timeSinceLastSuccess < 60000) {
      // Had success in the last minute - definitely online
      this.isOnline = true;
    }
    // Otherwise keep current state

    if (wasOffline && this.isOnline) {
      logger.log("[Sync] Network restored, processing sync queue");
      this.processSyncQueue();
    } else if (!wasOffline && !this.isOnline) {
      logger.log("[Sync] Network appears offline after multiple failures");
    }

    this.notifyListeners();
  }

  // Call this when any API request succeeds
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

  // Call this when any API request fails due to network error
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

    // Queue coalescing: find an existing entry for the same item (by dataType + id)
    // so we can merge operations instead of sending redundant requests.
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
      // Coalescing rules — collapse multiple operations on the same item:
      if (operation === "delete") {
        // A delete always wins: replace whatever was queued before.
        queue[existingIndex] = newItem;
      } else if (
        queue[existingIndex].operation === "create" &&
        operation === "update"
      ) {
        // Update-after-create: keep "create" operation but use the latest data,
        // because the server only needs the final state for a new item.
        queue[existingIndex] = { ...newItem, operation: "create" };
      } else {
        // Default: replace with the newer operation and data.
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
      this.showQueueCapacityWarning();
    }

    await this.setQueue(queue);
    this.scheduleSyncDebounced();
  }

  private scheduleSyncDebounced() {
    // Don't schedule if app is in background
    if (this.isPaused) {
      return;
    }

    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
    }

    this.syncTimer = setTimeout(() => {
      this.processSyncQueue();
    }, 2000); // Increased debounce to 2 seconds for battery
  }

  async processSyncQueue(): Promise<void> {
    // Don't process if app is in background
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
          this.notifySyncFailure(item.dataType, (item.data as { name?: string })?.name || (item.data as { title?: string })?.title || itemKey);
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
          this.showConflictAlert(conflictItem, serverVersion);
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
      const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 30000);
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
      // Network error - mark as failure
      this.markRequestFailure();
      throw error;
    }

    // Got a response - mark as success (even if it's an error status, network worked)
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

  // Full sync: push-then-pull. First drain the outbound queue (local→server),
  // then fetch the server's current state and overwrite local storage per section.
  // This ensures local pending changes are sent before the server snapshot replaces
  // local data. Uses delta sync via lastSyncedAt to avoid re-downloading unchanged
  // sections. After a full sync, the server is the source of truth for all sections
  // that were returned.
  async fullSync(): Promise<{ success: boolean; error?: string }> {
    const token = await this.getAuthToken();
    if (!token) {
      return { success: false, error: "Not authenticated" };
    }

    this.isSyncing = true;
    this.notifyListeners();

    try {
      // Step 1: Push — drain outbound queue so local changes reach the server first.
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

      // Step 2: Pull — overwrite local storage with the server's latest snapshot.
      // Each section is replaced entirely; the server is the source of truth.
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

  private showConflictAlert(item: SyncQueueItem, serverVersion: unknown) {
    const localData = item.data as { name?: string; title?: string; id?: string };
    const serverData = serverVersion as { name?: string; title?: string; id?: string } | null;
    const itemName = localData.name || localData.title || localData.id || "Unknown item";
    const serverName = serverData?.name || serverData?.title || serverData?.id || "Unknown item";

    const localLabel = `This Device: "${itemName}"`;
    const serverLabel = `Other Device: "${serverName}"`;

    Alert.alert(
      "Sync Conflict",
      `This item was modified on another device. Which version would you like to keep?\n\n${localLabel}\n${serverLabel}`,
      [
        {
          text: "This Device",
          onPress: () => {
            this.resolveConflict(item, "local").catch((err) => {
              logger.error("[Sync] Failed to resolve conflict with local version", { error: (err as Error).message });
            });
          },
        },
        {
          text: "Other Device",
          onPress: () => {
            this.resolveConflict(item, "remote").catch((err) => {
              logger.error("[Sync] Failed to resolve conflict with remote version", { error: (err as Error).message });
            });
          },
        },
      ],
    );
  }

  private async resolveConflict(
    item: SyncQueueItem,
    choice: "local" | "remote",
  ): Promise<void> {
    const queue = await this.getQueue();
    const itemId = (item.data as { id?: string })?.id;

    if (choice === "local") {
      logger.log("[Sync] User chose local version — re-sending with fresh timestamp", { dataType: item.dataType, itemId });
      const freshTimestamp = new Date().toISOString();
      const updatedData = {
        ...(item.data as Record<string, unknown>),
        updatedAt: freshTimestamp,
      };
      const newQueue = queue.map((q) => {
        if (q.id === item.id) {
          return {
            ...q,
            data: updatedData,
            timestamp: freshTimestamp,
            isFatal: false,
            retryCount: 0,
            errorMessage: undefined,
          };
        }
        return q;
      });
      await this.setQueue(newQueue);
      this.notifyListeners();
      this.processSyncQueue();
    } else {
      logger.log("[Sync] User chose remote version — discarding local change", { dataType: item.dataType, itemId });
      const newQueue = queue.filter((q) => q.id !== item.id);
      await this.setQueue(newQueue);
      this.notifyListeners();
      await this.fullSync();
    }
  }

  private showQueueCapacityWarning() {
    logger.warn("[Sync] Queue at 80%+ capacity — sync soon to avoid data loss", {
      threshold: Math.floor(MAX_SYNC_QUEUE_SIZE * 0.8),
      max: MAX_SYNC_QUEUE_SIZE,
    });

    if (this.hasShownQueueWarning) return;
    this.hasShownQueueWarning = true;

    try {
      Alert.alert(
        "Pending Changes Piling Up",
        "You have a lot of unsynced changes saved on this device. "
          + "Please connect to the internet so your data can sync to the cloud. "
          + "If the queue fills up, the oldest changes may be dropped.",
        [{ text: "OK", style: "default" }],
      );
    } catch {
      logger.warn("[Sync] Could not show queue capacity warning");
    }
  }

  private notifySyncFailure(dataType: string, itemName: string) {
    const title = "Sync Issue";
    const message =
      "Some changes couldn't be saved to the cloud. Your data is safe on this device. "
      + "Try these steps:\n\n"
      + "1. Check your internet connection\n"
      + "2. Go to Settings > Account > Sync Now\n"
      + "3. If the problem persists, contact support";
    try {
      Alert.alert(title, message, [
        {
          text: "Go to Settings",
          onPress: () => {
            try {
              const { navigationRef } = require("./navigationRef");
              if (navigationRef.isReady()) {
                navigationRef.navigate("Main" as never);
              }
            } catch {
              logger.warn("[Sync] Could not navigate to Settings");
            }
          },
        },
        { text: "Dismiss", style: "cancel" },
      ]);
    } catch {
      logger.warn("[Sync] Could not show sync failure alert", { dataType, itemName });
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
