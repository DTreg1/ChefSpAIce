import { Platform } from "react-native";
import Constants from "expo-constants";
import { differenceInDays, parseISO, startOfDay } from "date-fns";
import { storage } from "./storage";

// Check if running in Expo Go (notifications have limited functionality in SDK 53+)
// Android: Remote push notifications completely removed
// iOS: Some functionality still works but with warnings
const isExpoGo = Constants.appOwnership === "expo";

// Export for UI to show appropriate message
export function isNotificationsUnsupported(): boolean {
  // On Android Expo Go, notifications are completely unsupported
  return Platform.OS === "android" && isExpoGo;
}

// Check if we should skip importing the module entirely to avoid warnings
function shouldSkipNotificationsImport(): boolean {
  // Skip on Android Expo Go (completely unsupported)
  // On iOS Expo Go, local notifications still work, so we allow import
  return Platform.OS === "android" && isExpoGo;
}

// Lazy load notifications module only when supported
let Notifications: typeof import("expo-notifications") | null = null;

async function getNotificationsModule() {
  if (shouldSkipNotificationsImport()) {
    return null;
  }
  if (!Notifications) {
    Notifications = await import("expo-notifications");
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowInForeground: true,
      }),
    });
  }
  return Notifications;
}

const NOTIFICATION_CHANNEL_ID = "expiration-alerts";

async function setupNotificationChannel(): Promise<void> {
  if (Platform.OS === "android") {
    const notif = await getNotificationsModule();
    if (!notif) return;
    await notif.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
      name: "Expiration Alerts",
      importance: notif.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#22C55E",
    });
  }
}

export async function requestNotificationPermissions(): Promise<boolean> {
  const notif = await getNotificationsModule();
  if (!notif) return false;

  const { status: existingStatus } = await notif.getPermissionsAsync();

  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await notif.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    return false;
  }

  await setupNotificationChannel();
  return true;
}

export async function getNotificationPermissionStatus(): Promise<string> {
  const notif = await getNotificationsModule();
  if (!notif) return "unavailable";
  const { status } = await notif.getPermissionsAsync();
  return status;
}

export async function cancelAllExpirationNotifications(): Promise<void> {
  const notif = await getNotificationsModule();
  if (!notif) return;

  const scheduledNotifications = await notif.getAllScheduledNotificationsAsync();

  for (const notification of scheduledNotifications) {
    const data = notification.content.data as { type?: string } | undefined;
    if (data?.type === "expiration-alert") {
      await notif.cancelScheduledNotificationAsync(notification.identifier);
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
  const notif = await getNotificationsModule();
  if (!notif) return 0;

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
  const now = new Date();

  let scheduledCount = 0;

  for (const item of inventory) {
    if (!item.expirationDate) continue;

    const expirationDate = startOfDay(parseISO(item.expirationDate));
    const daysUntilExpiration = differenceInDays(expirationDate, today);

    if (daysUntilExpiration < 0) continue;

    let triggerDate: Date;

    if (daysUntilExpiration <= alertDays) {
      triggerDate = new Date(today);
      triggerDate.setHours(9, 0, 0, 0);

      if (triggerDate <= now) {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(9, 0, 0, 0);

        const tomorrowDay = startOfDay(tomorrow);
        if (differenceInDays(expirationDate, tomorrowDay) >= 0) {
          triggerDate = tomorrow;
        } else {
          continue;
        }
      }
    } else {
      triggerDate = new Date(expirationDate);
      triggerDate.setDate(triggerDate.getDate() - alertDays);
      triggerDate.setHours(9, 0, 0, 0);

      if (triggerDate <= now) {
        continue;
      }
    }

    const daysAtNotification = differenceInDays(expirationDate, startOfDay(triggerDate));
    const { title, body } = getExpirationMessage(item.name, daysAtNotification);

    await notif.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: {
          type: "expiration-alert",
          itemId: item.id,
          itemName: item.name,
          daysRemaining: daysAtNotification,
        },
        sound: true,
        priority: notif.AndroidNotificationPriority.HIGH,
      },
      trigger: {
        type: notif.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
        channelId: NOTIFICATION_CHANNEL_ID,
      },
    });

    scheduledCount++;
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
  if (shouldSkipNotificationsImport()) {
    return;
  }

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
  callback: (notification: any) => void,
): { remove: () => void } {
  if (shouldSkipNotificationsImport()) {
    return { remove: () => {} };
  }
  
  let subscription: { remove: () => void } | null = null;
  
  getNotificationsModule().then((notif) => {
    if (notif) {
      subscription = notif.addNotificationReceivedListener(callback);
    }
  });
  
  return {
    remove: () => {
      if (subscription) {
        subscription.remove();
      }
    },
  };
}

export function addNotificationResponseListener(
  callback: (response: any) => void,
): { remove: () => void } {
  if (shouldSkipNotificationsImport()) {
    return { remove: () => {} };
  }
  
  let subscription: { remove: () => void } | null = null;
  
  getNotificationsModule().then((notif) => {
    if (notif) {
      subscription = notif.addNotificationResponseReceivedListener(callback);
    }
  });
  
  return {
    remove: () => {
      if (subscription) {
        subscription.remove();
      }
    },
  };
}
