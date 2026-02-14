export const MAX_SYNC_QUEUE_SIZE = 500;

export const SYNC_KEYS = {
  SYNC_QUEUE: "@chefspaice/sync_queue",
  LAST_SYNC: "@chefspaice/last_sync",
  SYNC_STATUS: "@chefspaice/sync_status",
  SERVER_TIMESTAMP: "@chefspaice/server_timestamp",
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
  queueSize: number;
  maxQueueSize: number;
  queueUsagePercent: number;
  isQueueNearCapacity: boolean;
}

export type SyncListener = (state: SyncState) => void;
