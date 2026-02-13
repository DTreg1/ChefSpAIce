import { useEffect, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { differenceInDays, parseISO, startOfDay, subDays } from "date-fns";
import { storage, FoodItem } from "@/lib/storage";
import { logger } from "@/lib/logger";

const EXPIRING_THRESHOLD_DAYS = 3;
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;
const SCHEDULED_IDS_PREFIX = "@chefspaice/notif_id_";

async function getNotificationsModule() {
  try {
    const mod = await import("expo-notifications");
    return mod;
  } catch {
    return null;
  }
}

async function getStoredNotificationId(
  itemId: string,
): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(`${SCHEDULED_IDS_PREFIX}${itemId}`);
  } catch {
    return null;
  }
}

async function storeNotificationId(
  itemId: string,
  notificationId: string,
): Promise<void> {
  try {
    await AsyncStorage.setItem(
      `${SCHEDULED_IDS_PREFIX}${itemId}`,
      notificationId,
    );
  } catch {
    logger.error("Failed to store notification ID for item:", itemId);
  }
}

async function removeStoredNotificationId(itemId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(`${SCHEDULED_IDS_PREFIX}${itemId}`);
  } catch {
    logger.error("Failed to remove notification ID for item:", itemId);
  }
}

async function cancelAllScheduledExpirationNotifications(
  inventory: FoodItem[],
): Promise<void> {
  const Notifications = await getNotificationsModule();
  if (!Notifications) return;

  for (const item of inventory) {
    const storedId = await getStoredNotificationId(item.id);
    if (storedId) {
      try {
        await Notifications.cancelScheduledNotificationAsync(storedId);
      } catch {
        // already expired or cancelled
      }
      await removeStoredNotificationId(item.id);
    }
  }
}

async function scheduleItemNotifications(): Promise<void> {
  const Notifications = await getNotificationsModule();
  if (!Notifications) return;

  const { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") return;

  const inventory = await storage.getInventory();
  const today = startOfDay(new Date());
  const now = new Date();

  await cancelAllScheduledExpirationNotifications(inventory);

  const expiringItems = inventory.filter((item) => {
    if (!item.expirationDate) return false;
    const expDate = startOfDay(parseISO(item.expirationDate));
    const daysUntil = differenceInDays(expDate, today);
    return daysUntil >= 0 && daysUntil <= EXPIRING_THRESHOLD_DAYS;
  });

  for (const item of expiringItems) {
    const expDate = startOfDay(parseISO(item.expirationDate));
    const triggerDate = subDays(expDate, EXPIRING_THRESHOLD_DAYS);
    triggerDate.setHours(9, 0, 0, 0);

    if (triggerDate <= now) continue;

    const daysRemaining = differenceInDays(expDate, today);

    let title: string;
    let body: string;
    if (daysRemaining <= 0) {
      title = "Item Expired";
      body = `${item.name} has expired. Consider using it soon or removing it from your inventory.`;
    } else if (daysRemaining === 1) {
      title = "Expiring Tomorrow";
      body = `${item.name} expires tomorrow. Plan to use it soon.`;
    } else {
      title = "Expiring Soon";
      body = `${item.name} expires in ${daysRemaining} days. Consider using it in your next meal.`;
    }

    try {
      const notificationId =
        await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            data: {
              type: "expiration-alert",
              itemId: item.id,
              itemName: item.name,
              daysRemaining,
            },
            sound: true,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: triggerDate,
          },
        });

      await storeNotificationId(item.id, notificationId);
    } catch (error) {
      logger.error(
        "Failed to schedule notification for item:",
        item.name,
        error,
      );
    }
  }
}

export function useExpirationNotifications() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    scheduleItemNotifications().catch((err) =>
      logger.error("Initial expiration notification check failed:", err),
    );

    intervalRef.current = setInterval(() => {
      scheduleItemNotifications().catch((err) =>
        logger.error("Periodic expiration notification check failed:", err),
      );
    }, CHECK_INTERVAL_MS);

    const subscription = AppState.addEventListener(
      "change",
      (nextState: AppStateStatus) => {
        if (nextState === "active") {
          scheduleItemNotifications().catch((err) =>
            logger.error(
              "Foreground expiration notification check failed:",
              err,
            ),
          );
        }
      },
    );

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      subscription.remove();
    };
  }, []);
}
