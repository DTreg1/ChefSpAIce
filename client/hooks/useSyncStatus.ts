import { useState, useEffect } from "react";
import { syncManager, SyncState } from "@/lib/sync-manager";
import { offlineMutationQueue } from "@/lib/offline-queue";

export function useSyncStatus() {
  const [syncState, setSyncState] = useState<SyncState>({
    status: "idle",
    lastSyncAt: null,
    pendingChanges: 0,
    isOnline: true,
    failedItems: 0,
  });
  const [pendingMutations, setPendingMutations] = useState(0);

  useEffect(() => {
    const unsubscribe = syncManager.subscribe((state) => {
      setSyncState(state);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const unsubscribe = offlineMutationQueue.subscribe((count) => {
      setPendingMutations(count);
    });
    return () => { unsubscribe(); };
  }, []);

  return {
    ...syncState,
    pendingMutations,
    fullSync: () => syncManager.fullSync(),
    clearQueue: () => syncManager.clearQueue(),
    clearFailedItems: () => syncManager.clearFailedItems(),
    retryFailedItems: () => syncManager.retryFailedItems(),
    getFailedItemDetails: () => syncManager.getFailedItemDetails(),
  };
}
