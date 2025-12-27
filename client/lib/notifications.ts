import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { differenceInDays, parseISO, startOfDay, addDays, subDays } from "date-fns";
import { storage, FoodItem, UserPreferences } from "./storage";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowInForeground: true,
  }),
});

const NOTIFICATION_CHANNEL_ID = "expiration-alerts";

async function setupNotificationChannel(): Promise<void> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
      name: "Expiration Alerts",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#22C55E",
    });
  }
}

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } =
    await Notifications.getPermissionsAsync();

  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    return false;
  }

  await setupNotificationChannel();
  return true;
}

export async function getNotificationPermissionStatus(): Promise<string> {
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

export async function cancelAllExpirationNotifications(): Promise<void> {
  const scheduledNotifications =
    await Notifications.getAllScheduledNotificationsAsync();

  for (const notification of scheduledNotifications) {
    const data = notification.content.data as { type?: string } | undefined;
    if (data?.type === "expiration-alert") {
      await Notifications.cancelScheduledNotificationAsync(
        notification.identifier,
      );
    }
  }
}

function getExpirationMessage(
  itemName: string,
  daysRemaining: number,
): { title: string; body: string } {
  if (daysRemaining <= 0) {
    return {
      title: "Item Expired",
      body: `${itemName} has expired. Consider using it soon or removing it from your inventory.`,
    };
  } else if (daysRemaining === 1) {
    return {
      title: "Expiring Tomorrow",
      body: `${itemName} expires tomorrow. Plan to use it soon.`,
    };
  } else {
    return {
      title: "Expiring Soon",
      body: `${itemName} expires in ${daysRemaining} days. Consider using it in your next meal.`,
    };
  }
}

export async function scheduleExpirationNotifications(): Promise<number> {
  const preferences = await storage.getPreferences();

  if (!preferences.notificationsEnabled) {
    return 0;
  }

  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) {
    return 0;
  }

  await cancelAllExpirationNotifications();

  const inventory = await storage.getInventory();
  const alertDays = preferences.expirationAlertDays || 3;
  const today = startOfDay(new Date());

  let scheduledCount = 0;

  for (const item of inventory) {
    if (!item.expirationDate) continue;

    const expirationDate = startOfDay(parseISO(item.expirationDate));
    const daysUntilExpiration = differenceInDays(expirationDate, today);

    if (daysUntilExpiration <= alertDays && daysUntilExpiration >= 0) {
      const { title, body } = getExpirationMessage(
        item.name,
        daysUntilExpiration,
      );

      const now = new Date();
      let triggerDate: Date;

      if (daysUntilExpiration === 0) {
        triggerDate = new Date(expirationDate);
        triggerDate.setHours(9, 0, 0, 0);
        if (triggerDate <= now) {
          triggerDate = new Date(now.getTime() + 5000);
        }
      } else {
        const alertDate = subDays(expirationDate, Math.min(daysUntilExpiration, alertDays));
        triggerDate = new Date(alertDate);
        triggerDate.setHours(9, 0, 0, 0);

        if (triggerDate <= now) {
          triggerDate = new Date(now.getTime() + 5000);
        }
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: {
            type: "expiration-alert",
            itemId: item.id,
            itemName: item.name,
            daysRemaining: daysUntilExpiration,
          },
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate,
          channelId: NOTIFICATION_CHANNEL_ID,
        },
      });

      scheduledCount++;
    }
  }

  return scheduledCount;
}

export async function getExpiringItemsCount(alertDays?: number): Promise<number> {
  const preferences = await storage.getPreferences();
  const days = alertDays ?? preferences.expirationAlertDays ?? 3;

  const inventory = await storage.getInventory();
  const today = startOfDay(new Date());

  return inventory.filter((item) => {
    if (!item.expirationDate) return false;
    const expirationDate = startOfDay(parseISO(item.expirationDate));
    const daysUntilExpiration = differenceInDays(expirationDate, today);
    return daysUntilExpiration >= 0 && daysUntilExpiration <= days;
  }).length;
}

export async function initializeNotifications(): Promise<void> {
  try {
    const preferences = await storage.getPreferences();

    if (!preferences.notificationsEnabled) {
      return;
    }

    await scheduleExpirationNotifications();
  } catch (error) {
    console.error("Failed to initialize notifications:", error);
  }
}

export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void,
): Notifications.EventSubscription {
  return Notifications.addNotificationReceivedListener(callback);
}

export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void,
): Notifications.EventSubscription {
  return Notifications.addNotificationResponseReceivedListener(callback);
}
