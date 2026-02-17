import { Platform } from "react-native";
import Constants from "expo-constants";
import { differenceInDays, parseISO, startOfDay } from "date-fns";
import { storage } from "./storage";
import { logger } from "@/lib/logger";

const isExpoGo = Constants.appOwnership === "expo";

function shouldSkipNotificationsImport(): boolean {
  return Platform.OS === "android" && isExpoGo;
}

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

export async function cancelAllExpirationNotifications(): Promise<void> {
  const notif = await getNotificationsModule();
  if (!notif) return;

  const scheduledNotifications =
    await notif.getAllScheduledNotificationsAsync();

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

    const daysAtNotification = differenceInDays(
      expirationDate,
      startOfDay(triggerDate),
    );
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

export async function registerForPushNotifications(): Promise<string | null> {
  const notif = await getNotificationsModule();
  if (!notif) return null;

  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) return null;

  try {
    const projectId = Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId;

    const tokenData = await notif.getExpoPushTokenAsync({
      ...(projectId ? { projectId } : {}),
    });

    const token = tokenData.data;

    const authToken = await storage.getAuthToken();
    if (!authToken) return token;

    const { apiClient } = await import("@/lib/api-client");
    await apiClient.post<void>("/api/user/register-device", {
      token,
      platform: Platform.OS,
    });

    logger.info("Push token registered with server");
    return token;
  } catch (error) {
    logger.error("Failed to register push token:", error);
    return null;
  }
}

export async function registerPushToken(): Promise<string | null> {
  return registerForPushNotifications();
}

export async function refreshPushToken(): Promise<void> {
  try {
    const authToken = await storage.getAuthToken();
    if (!authToken) return;

    await registerForPushNotifications();
  } catch (error) {
    logger.error("Failed to refresh push token:", error);
  }
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
    await refreshPushToken();
  } catch (error) {
    logger.error("Failed to initialize notifications:", error);
  }
}

export function addNotificationResponseListener(
  callback: (response: unknown) => void,
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
