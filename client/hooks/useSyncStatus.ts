import { useState, useEffect } from "react";
import { syncManager, SyncState } from "@/lib/sync-manager";

export function useSyncStatus() {
  const [syncState, setSyncState] = useState<SyncState>({
    status: "idle",
    lastSyncAt: null,
    pendingChanges: 0,
    isOnline: true,
    failedItems: 0,
  });

  useEffect(() => {
    const unsubscribe = syncManager.subscribe((state) => {
      setSyncState(state);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return {
    ...syncState,
    fullSync: () => syncManager.fullSync(),
    clearQueue: () => syncManager.clearQueue(),
    clearFailedItems: () => syncManager.clearFailedItems(),
    retryFailedItems: () => syncManager.retryFailedItems(),
    getFailedItemDetails: () => syncManager.getFailedItemDetails(),
  };
}
