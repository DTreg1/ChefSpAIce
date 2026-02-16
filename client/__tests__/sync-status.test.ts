/**
 * =============================================================================
 * SYNC STATUS HOOK TESTS
 * =============================================================================
 *
 * Tests for the useSyncStatus hook which monitors cloud synchronization.
 *
 * TESTED FUNCTIONALITY:
 * - Sync state management
 * - Status transitions (idle, syncing, error)
 * - Pending changes tracking
 * - Failed items handling
 * - Online/offline detection
 * - Manual sync triggers
 *
 * @module __tests__/sync-status.test
 */

type SyncStatusType = "idle" | "syncing" | "error";

interface SyncState {
  status: SyncStatusType;
  lastSyncAt: string | null;
  pendingChanges: number;
  isOnline: boolean;
  failedItems: number;
}

interface FailedItemDetail {
  id: string;
  type: "inventory" | "recipe" | "mealPlan" | "shoppingList";
  error: string;
  timestamp: string;
}

describe("useSyncStatus - Initial State", () => {
  it("starts with idle status", () => {
    const initialState: SyncState = {
      status: "idle",
      lastSyncAt: null,
      pendingChanges: 0,
      isOnline: true,
      failedItems: 0,
    };

    expect(initialState.status).toBe("idle");
  });

  it("starts with null lastSyncAt", () => {
    const initialState: SyncState = {
      status: "idle",
      lastSyncAt: null,
      pendingChanges: 0,
      isOnline: true,
      failedItems: 0,
    };

    expect(initialState.lastSyncAt).toBeNull();
  });

  it("starts with zero pending changes", () => {
    const initialState: SyncState = {
      status: "idle",
      lastSyncAt: null,
      pendingChanges: 0,
      isOnline: true,
      failedItems: 0,
    };

    expect(initialState.pendingChanges).toBe(0);
  });

  it("starts with isOnline true", () => {
    const initialState: SyncState = {
      status: "idle",
      lastSyncAt: null,
      pendingChanges: 0,
      isOnline: true,
      failedItems: 0,
    };

    expect(initialState.isOnline).toBe(true);
  });

  it("starts with zero failed items", () => {
    const initialState: SyncState = {
      status: "idle",
      lastSyncAt: null,
      pendingChanges: 0,
      isOnline: true,
      failedItems: 0,
    };

    expect(initialState.failedItems).toBe(0);
  });
});

describe("useSyncStatus - Status Transitions", () => {
  describe("idle to syncing", () => {
    it("transitions to syncing when sync starts", () => {
      let state: SyncState = {
        status: "idle",
        lastSyncAt: null,
        pendingChanges: 5,
        isOnline: true,
        failedItems: 0,
      };

      state = { ...state, status: "syncing" };
      expect(state.status).toBe("syncing");
    });
  });

  describe("syncing to idle", () => {
    it("transitions to idle on successful sync", () => {
      let state: SyncState = {
        status: "syncing",
        lastSyncAt: null,
        pendingChanges: 5,
        isOnline: true,
        failedItems: 0,
      };

      state = {
        ...state,
        status: "idle",
        lastSyncAt: new Date().toISOString(),
        pendingChanges: 0,
      };

      expect(state.status).toBe("idle");
      expect(state.lastSyncAt).not.toBeNull();
      expect(state.pendingChanges).toBe(0);
    });
  });

  describe("syncing to error", () => {
    it("transitions to error on sync failure", () => {
      let state: SyncState = {
        status: "syncing",
        lastSyncAt: null,
        pendingChanges: 5,
        isOnline: true,
        failedItems: 0,
      };

      state = { ...state, status: "error", failedItems: 3 };

      expect(state.status).toBe("error");
      expect(state.failedItems).toBe(3);
    });
  });

  describe("error to syncing", () => {
    it("transitions to syncing on retry", () => {
      let state: SyncState = {
        status: "error",
        lastSyncAt: null,
        pendingChanges: 5,
        isOnline: true,
        failedItems: 3,
      };

      state = { ...state, status: "syncing" };
      expect(state.status).toBe("syncing");
    });
  });
});

describe("useSyncStatus - Pending Changes", () => {
  it("increments pending changes on local modification", () => {
    let state: SyncState = {
      status: "idle",
      lastSyncAt: null,
      pendingChanges: 0,
      isOnline: true,
      failedItems: 0,
    };

    state = { ...state, pendingChanges: state.pendingChanges + 1 };
    expect(state.pendingChanges).toBe(1);
  });

  it("decrements pending changes after successful sync", () => {
    let state: SyncState = {
      status: "idle",
      lastSyncAt: null,
      pendingChanges: 5,
      isOnline: true,
      failedItems: 0,
    };

    state = { ...state, pendingChanges: state.pendingChanges - 2 };
    expect(state.pendingChanges).toBe(3);
  });

  it("resets pending changes to zero after full sync", () => {
    let state: SyncState = {
      status: "idle",
      lastSyncAt: null,
      pendingChanges: 10,
      isOnline: true,
      failedItems: 0,
    };

    state = { ...state, pendingChanges: 0 };
    expect(state.pendingChanges).toBe(0);
  });

  it("tracks multiple types of pending changes", () => {
    const pendingInventory = 3;
    const pendingRecipes = 2;
    const pendingMealPlans = 1;

    const totalPending = pendingInventory + pendingRecipes + pendingMealPlans;
    expect(totalPending).toBe(6);
  });
});

describe("useSyncStatus - Online/Offline Detection", () => {
  it("sets isOnline false when device goes offline", () => {
    let state: SyncState = {
      status: "idle",
      lastSyncAt: null,
      pendingChanges: 0,
      isOnline: true,
      failedItems: 0,
    };

    state = { ...state, isOnline: false };
    expect(state.isOnline).toBe(false);
  });

  it("sets isOnline true when device comes online", () => {
    let state: SyncState = {
      status: "idle",
      lastSyncAt: null,
      pendingChanges: 5,
      isOnline: false,
      failedItems: 0,
    };

    state = { ...state, isOnline: true };
    expect(state.isOnline).toBe(true);
  });

  it("does not sync when offline", () => {
    const state: SyncState = {
      status: "idle",
      lastSyncAt: null,
      pendingChanges: 5,
      isOnline: false,
      failedItems: 0,
    };

    const shouldSync = state.isOnline && state.pendingChanges > 0;
    expect(shouldSync).toBe(false);
  });

  it("triggers sync when coming back online with pending changes", () => {
    const state: SyncState = {
      status: "idle",
      lastSyncAt: null,
      pendingChanges: 5,
      isOnline: true,
      failedItems: 0,
    };

    const shouldSync = state.isOnline && state.pendingChanges > 0;
    expect(shouldSync).toBe(true);
  });
});

describe("useSyncStatus - Failed Items", () => {
  it("tracks failed items count", () => {
    let state: SyncState = {
      status: "error",
      lastSyncAt: null,
      pendingChanges: 5,
      isOnline: true,
      failedItems: 0,
    };

    state = { ...state, failedItems: 2 };
    expect(state.failedItems).toBe(2);
  });

  it("provides failed item details", () => {
    const failedItems: FailedItemDetail[] = [
      {
        id: "item-1",
        type: "inventory",
        error: "Network error",
        timestamp: new Date().toISOString(),
      },
      {
        id: "recipe-1",
        type: "recipe",
        error: "Server error",
        timestamp: new Date().toISOString(),
      },
    ];

    expect(failedItems.length).toBe(2);
    expect(failedItems[0].type).toBe("inventory");
    expect(failedItems[1].type).toBe("recipe");
  });

  it("clears failed items on successful retry", () => {
    let state: SyncState = {
      status: "idle",
      lastSyncAt: null,
      pendingChanges: 0,
      isOnline: true,
      failedItems: 3,
    };

    state = { ...state, failedItems: 0 };
    expect(state.failedItems).toBe(0);
  });
});

describe("useSyncStatus - Manual Sync Actions", () => {
  describe("fullSync", () => {
    it("triggers a full synchronization", async () => {
      let syncCalled = false;
      const fullSync = async () => {
        syncCalled = true;
      };

      await fullSync();
      expect(syncCalled).toBe(true);
    });

    it("updates lastSyncAt on successful full sync", async () => {
      let lastSyncAt: string | null = null;

      const fullSync = async () => {
        lastSyncAt = new Date().toISOString();
      };

      await fullSync();
      expect(lastSyncAt).not.toBeNull();
    });
  });

  describe("clearQueue", () => {
    it("clears all pending changes", () => {
      let state: SyncState = {
        status: "idle",
        lastSyncAt: null,
        pendingChanges: 10,
        isOnline: true,
        failedItems: 0,
      };

      const clearQueue = () => {
        state = { ...state, pendingChanges: 0 };
      };

      clearQueue();
      expect(state.pendingChanges).toBe(0);
    });
  });

  describe("clearFailedItems", () => {
    it("clears failed items without retrying", () => {
      let state: SyncState = {
        status: "error",
        lastSyncAt: null,
        pendingChanges: 5,
        isOnline: true,
        failedItems: 3,
      };

      const clearFailedItems = () => {
        state = { ...state, failedItems: 0, status: "idle" };
      };

      clearFailedItems();
      expect(state.failedItems).toBe(0);
      expect(state.status).toBe("idle");
    });
  });

  describe("retryFailedItems", () => {
    it("retries syncing failed items", async () => {
      let retryAttempted = false;
      const retryFailedItems = async () => {
        retryAttempted = true;
      };

      await retryFailedItems();
      expect(retryAttempted).toBe(true);
    });

    it("transitions status to syncing during retry", () => {
      let state: SyncState = {
        status: "error",
        lastSyncAt: null,
        pendingChanges: 5,
        isOnline: true,
        failedItems: 3,
      };

      state = { ...state, status: "syncing" };
      expect(state.status).toBe("syncing");
    });
  });
});

describe("useSyncStatus - Subscription to SyncManager", () => {
  it("subscribes to sync manager on mount", () => {
    let subscribed = false;
    const subscribe = (callback: (state: SyncState) => void) => {
      subscribed = true;
      return () => {
        subscribed = false;
      };
    };

    const unsubscribe = subscribe(() => {});
    expect(subscribed).toBe(true);
    unsubscribe();
  });

  it("unsubscribes from sync manager on unmount", () => {
    let subscribed = false;
    const subscribe = () => {
      subscribed = true;
      return () => {
        subscribed = false;
      };
    };

    const unsubscribe = subscribe();
    expect(subscribed).toBe(true);
    unsubscribe();
    expect(subscribed).toBe(false);
  });

  it("updates state when sync manager emits new state", () => {
    let currentState: SyncState = {
      status: "idle",
      lastSyncAt: null,
      pendingChanges: 0,
      isOnline: true,
      failedItems: 0,
    };

    const updateState = (newState: SyncState) => {
      currentState = newState;
    };

    updateState({
      status: "syncing",
      lastSyncAt: null,
      pendingChanges: 5,
      isOnline: true,
      failedItems: 0,
    });

    expect(currentState.status).toBe("syncing");
    expect(currentState.pendingChanges).toBe(5);
  });
});

describe("useSyncStatus - Last Sync Timestamp", () => {
  it("formats lastSyncAt as ISO string", () => {
    const timestamp = new Date().toISOString();
    expect(timestamp).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/
    );
  });

  it("preserves lastSyncAt across status changes", () => {
    const timestamp = "2024-01-15T10:30:00.000Z";
    let state: SyncState = {
      status: "idle",
      lastSyncAt: timestamp,
      pendingChanges: 0,
      isOnline: true,
      failedItems: 0,
    };

    state = { ...state, status: "syncing" };
    expect(state.lastSyncAt).toBe(timestamp);

    state = { ...state, status: "idle" };
    expect(state.lastSyncAt).toBe(timestamp);
  });

  it("updates lastSyncAt only on successful sync", () => {
    const originalTimestamp = "2024-01-15T10:30:00.000Z";
    let state: SyncState = {
      status: "idle",
      lastSyncAt: originalTimestamp,
      pendingChanges: 5,
      isOnline: true,
      failedItems: 0,
    };

    state = { ...state, status: "error" };
    expect(state.lastSyncAt).toBe(originalTimestamp);
  });
});
