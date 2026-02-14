import { Alert } from "react-native";
import { logger } from "@/lib/logger";
import { MAX_SYNC_QUEUE_SIZE } from "@/lib/sync-types";
import type { SyncQueueItem } from "@/lib/sync-types";

export interface SyncConflictOps {
  getQueue: () => Promise<SyncQueueItem[]>;
  setQueue: (queue: SyncQueueItem[]) => Promise<void>;
  notifyListeners: () => void;
  processSyncQueue: () => Promise<void>;
  fullSync: () => Promise<{ success: boolean; error?: string }>;
}

export function showConflictAlert(
  item: SyncQueueItem,
  serverVersion: unknown,
  onResolve: (item: SyncQueueItem, choice: "local" | "remote") => void,
) {
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
          onResolve(item, "local");
        },
      },
      {
        text: "Other Device",
        onPress: () => {
          onResolve(item, "remote");
        },
      },
    ],
  );
}

export async function resolveConflict(
  item: SyncQueueItem,
  choice: "local" | "remote",
  ops: SyncConflictOps,
): Promise<void> {
  const queue = await ops.getQueue();
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
    await ops.setQueue(newQueue);
    ops.notifyListeners();
    ops.processSyncQueue();
  } else {
    logger.log("[Sync] User chose remote version — discarding local change", { dataType: item.dataType, itemId });
    const newQueue = queue.filter((q) => q.id !== item.id);
    await ops.setQueue(newQueue);
    ops.notifyListeners();
    await ops.fullSync();
  }
}

export function showQueueCapacityWarning(hasShownWarning: boolean): boolean {
  logger.warn("[Sync] Queue at 80%+ capacity — sync soon to avoid data loss", {
    threshold: Math.floor(MAX_SYNC_QUEUE_SIZE * 0.8),
    max: MAX_SYNC_QUEUE_SIZE,
  });

  if (hasShownWarning) return hasShownWarning;

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

  return true;
}

export function notifySyncFailure(dataType: string, itemName: string) {
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
