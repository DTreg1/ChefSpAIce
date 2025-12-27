import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Network from "expo-network";
import { getApiUrl } from "@/lib/query-client";

const SYNC_KEYS = {
  SYNC_QUEUE: "@chefspaice/sync_queue",
  LAST_SYNC: "@chefspaice/last_sync",
  SYNC_STATUS: "@chefspaice/sync_status",
} as const;

export type SyncOperation = "create" | "update" | "delete";
export type SyncDataType = "inventory" | "recipes" | "mealPlans" | "shoppingList";

export type SyncStatus = "idle" | "syncing" | "offline" | "error";

export interface SyncQueueItem {
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

  constructor() {
    this.initNetworkListener();
  }

  private async initNetworkListener() {
    await this.checkNetworkStatus();
    
    this.networkCheckInterval = setInterval(async () => {
      await this.checkNetworkStatus();
    }, 5000);
  }

  private async checkNetworkStatus() {
    try {
      const networkState = await Network.getNetworkStateAsync();
      const wasOffline = !this.isOnline;
      this.isOnline = networkState.isConnected ?? true;
      
      if (wasOffline && this.isOnline) {
        this.processSyncQueue();
      }
      
      this.notifyListeners();
    } catch {
      this.isOnline = true;
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
    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
    }
    
    this.syncTimer = setTimeout(() => {
      this.processSyncQueue();
    }, 1000);
  }

  async processSyncQueue(): Promise<void> {
    if (!this.isOnline || this.isSyncing) {
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

    const response = await fetch(url.toString(), {
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
    if (!this.isOnline) {
      return { success: false, error: "No internet connection" };
    }

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
      
      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch from server");
      }

      const { data } = await response.json();
      
      if (data) {
        if (data.inventory) {
          await AsyncStorage.setItem("@freshpantry/inventory", JSON.stringify(data.inventory));
        }
        if (data.recipes) {
          await AsyncStorage.setItem("@freshpantry/saved_recipes", JSON.stringify(data.recipes));
        }
        if (data.mealPlans) {
          await AsyncStorage.setItem("@freshpantry/meal_plans", JSON.stringify(data.mealPlans));
        }
        if (data.shoppingList) {
          await AsyncStorage.setItem("@freshpantry/shopping_list", JSON.stringify(data.shoppingList));
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

  destroy() {
    if (this.networkCheckInterval) {
      clearInterval(this.networkCheckInterval);
    }
    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
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
