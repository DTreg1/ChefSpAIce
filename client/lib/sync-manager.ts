import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState, AppStateStatus } from "react-native";
import { getApiUrl } from "@/lib/query-client";
import { logger } from "@/lib/logger";

const SYNC_KEYS = {
  SYNC_QUEUE: "@chefspaice/sync_queue",
  LAST_SYNC: "@chefspaice/last_sync",
  SYNC_STATUS: "@chefspaice/sync_status",
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
  private appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;
  private isPaused = false;
  private preferencesSyncTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingPreferences: unknown = null;
  private userProfileSyncTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingUserProfile: unknown = null;

  constructor() {
    this.initNetworkListener();
    this.initAppStateListener();
  }

  private initAppStateListener() {
    this.appState = AppState.currentState;
    this.appStateSubscription = AppState.addEventListener("change", (nextAppState) => {
      const wasBackground = this.appState === "background" || this.appState === "inactive";
      const isNowActive = nextAppState === "active";
      
      this.appState = nextAppState;
      
      if (nextAppState === "background" || nextAppState === "inactive") {
        // App going to background - pause sync operations to save battery
        this.pauseSync();
      } else if (isNowActive && wasBackground) {
        // App coming back to foreground - resume sync
        this.resumeSync();
      }
    });
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
    this.notifyListeners();
  }

  async queueChange(
    dataType: SyncDataType,
    operation: SyncOperation,
    data: unknown
  ): Promise<void> {
    const queue = await this.getQueue();
    
    const existingIndex = queue.findIndex(
      (item) =>
        item.dataType === dataType &&
        (data as { id?: string })?.id &&
        (item.data as { id?: string })?.id === (data as { id?: string })?.id
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
      } else if (queue[existingIndex].operation === "create" && operation === "update") {
        queue[existingIndex] = { ...newItem, operation: "create" };
      } else {
        queue[existingIndex] = newItem;
      }
    } else {
      queue.push(newItem);
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
      } catch (error) {
        const syncError = error as { statusCode?: number; message?: string; isConflict?: boolean };
        const statusCode = syncError.statusCode || 0;
        const is4xxError = statusCode >= 400 && statusCode < 500;
        const isConflict = syncError.isConflict === true;
        const errorMessage = syncError.message || "Unknown sync error";
        
        console.error(`Sync failed for ${item.dataType}:`, error);
        
        if (isConflict) {
          console.warn(`[SyncManager] Conflict detected - server has newer version:`, 
            item.dataType, (item.data as { id?: string })?.id);
          failedItems.push({ 
            ...item, 
            isFatal: true, 
            errorMessage: "Your changes were overwritten by a newer version from another device",
            retryCount: item.retryCount + 1 
          });
        } else if (is4xxError || item.retryCount >= maxRetries) {
          console.warn(`[SyncManager] Marking item as fatal after ${item.retryCount} retries (status: ${statusCode}):`, 
            item.dataType, (item.data as { id?: string })?.id);
          failedItems.push({ 
            ...item, 
            isFatal: true, 
            errorMessage: `Failed to sync: ${errorMessage}`,
            retryCount: item.retryCount + 1 
          });
        } else {
          failedItems.push({ ...item, retryCount: item.retryCount + 1 });
          hasRetryableErrors = true;
        }
      }
    }

    const currentQueue = await this.getQueue();
    const newlyAddedItems = currentQueue.filter(
      (item) => !queue.some((oldItem) => oldItem.id === item.id)
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

    const method = item.operation === "delete" ? "DELETE" : 
                   item.operation === "create" ? "POST" : "PUT";

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
      const error = new Error(`Sync failed: ${response.status}`) as Error & { statusCode: number };
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
    
    const result = await response.json();
    
    if (result.operation === "skipped" && result.reason === "stale_update") {
      const error = new Error("Update was stale - server has newer version") as Error & { 
        statusCode: number; 
        isConflict: boolean;
      };
      error.statusCode = 409;
      error.isConflict = true;
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
    // Don't block on offline status - try anyway and let the request determine connectivity
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

      const { data } = await response.json();
      
      if (data) {
        if (data.inventory) {
          await AsyncStorage.setItem("@chefspaice/inventory", JSON.stringify(data.inventory));
        }
        if (data.recipes) {
          await AsyncStorage.setItem("@chefspaice/recipes", JSON.stringify(data.recipes));
        }
        if (data.mealPlans) {
          await AsyncStorage.setItem("@chefspaice/meal_plans", JSON.stringify(data.mealPlans));
        }
        if (data.shoppingList) {
          await AsyncStorage.setItem("@chefspaice/shopping_list", JSON.stringify(data.shoppingList));
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
        console.error("[Sync] Failed to sync preferences:", response.status);
        if (response.status >= 500) {
          this.pendingPreferences = preferences;
          this.preferencesSyncTimer = setTimeout(() => {
            this.flushPreferencesSync();
          }, 5000);
        }
      }
    } catch (error) {
      this.markRequestFailure();
      console.error("[Sync] Network error syncing preferences:", error);
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
        console.error("[Sync] Failed to sync userProfile:", response.status);
        if (response.status >= 500) {
          this.pendingUserProfile = userProfile;
          this.userProfileSyncTimer = setTimeout(() => {
            this.flushUserProfileSync();
          }, 5000);
        }
      }
    } catch (error) {
      this.markRequestFailure();
      console.error("[Sync] Network error syncing userProfile:", error);
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
    const hasConflicts = queue.some((item) => item.isFatal && item.errorMessage?.includes("overwritten"));
    
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
        return { ...item, isFatal: false, retryCount: 0, errorMessage: undefined };
      }
      return item;
    });
    await this.setQueue(newQueue);
    this.notifyListeners();
    this.processSyncQueue();
  }
  
  async getFailedItemDetails(): Promise<Array<{ dataType: string; itemName: string; errorMessage: string }>> {
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
