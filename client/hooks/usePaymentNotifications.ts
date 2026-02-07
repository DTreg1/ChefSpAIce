import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { useSubscription } from "@/hooks/useSubscription";
import { logger } from "@/lib/logger";

const PAYMENT_CHANNEL_ID = "payment-alerts";
const GRACE_PERIOD_DAYS = 7;

async function getNotificationsModule() {
  if (Platform.OS === "web") return null;
  const Constants = (await import("expo-constants")).default;
  if (Platform.OS === "android" && Constants.appOwnership === "expo") return null;
  const Notifications = await import("expo-notifications");
  return Notifications;
}

async function cancelPaymentNotifications() {
  const notif = await getNotificationsModule();
  if (!notif) return;

  const scheduled = await notif.getAllScheduledNotificationsAsync();
  for (const n of scheduled) {
    const data = n.content.data as { type?: string } | undefined;
    if (data?.type === "payment-failed") {
      await notif.cancelScheduledNotificationAsync(n.identifier);
    }
  }
}

async function schedulePaymentNotification(
  title: string,
  body: string,
  triggerDate: Date,
) {
  const notif = await getNotificationsModule();
  if (!notif) return;

  if (Platform.OS === "android") {
    await notif.setNotificationChannelAsync(PAYMENT_CHANNEL_ID, {
      name: "Payment Alerts",
      importance: notif.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#EF4444",
    });
  }

  await notif.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: { type: "payment-failed" },
      sound: true,
      priority: notif.AndroidNotificationPriority.HIGH,
    },
    trigger: {
      type: notif.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
      channelId: PAYMENT_CHANNEL_ID,
    },
  });
}

async function sendImmediatePaymentNotification() {
  const notif = await getNotificationsModule();
  if (!notif) return;

  if (Platform.OS === "android") {
    await notif.setNotificationChannelAsync(PAYMENT_CHANNEL_ID, {
      name: "Payment Alerts",
      importance: notif.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#EF4444",
    });
  }

  await notif.scheduleNotificationAsync({
    content: {
      title: "Payment failed",
      body: "Your subscription payment failed. Please update your payment method to keep your subscription active.",
      data: { type: "payment-failed" },
      sound: true,
      priority: notif.AndroidNotificationPriority.HIGH,
    },
    trigger: null,
  });
}

export function usePaymentNotifications() {
  const { isPastDue, subscription } = useSubscription();
  const hasScheduled = useRef(false);
  const lastPaymentFailedAt = useRef<string | null>(null);

  useEffect(() => {
    if (!isPastDue || !subscription?.paymentFailedAt) {
      if (hasScheduled.current) {
        cancelPaymentNotifications().catch((e) =>
          logger.error("Error canceling payment notifications:", e),
        );
        hasScheduled.current = false;
        lastPaymentFailedAt.current = null;
      }
      return;
    }

    if (lastPaymentFailedAt.current === subscription.paymentFailedAt) {
      return;
    }
    lastPaymentFailedAt.current = subscription.paymentFailedAt;

    const scheduleAll = async () => {
      try {
        await cancelPaymentNotifications();

        await sendImmediatePaymentNotification();

        const failedAt = new Date(subscription.paymentFailedAt!);
        const now = new Date();

        const threeDayReminder = new Date(failedAt);
        threeDayReminder.setDate(threeDayReminder.getDate() + (GRACE_PERIOD_DAYS - 3));
        threeDayReminder.setHours(10, 0, 0, 0);

        if (threeDayReminder > now) {
          await schedulePaymentNotification(
            "Payment reminder",
            "Your subscription payment is still pending. You have 3 days left to update your payment method.",
            threeDayReminder,
          );
        }

        const oneDayReminder = new Date(failedAt);
        oneDayReminder.setDate(oneDayReminder.getDate() + (GRACE_PERIOD_DAYS - 1));
        oneDayReminder.setHours(10, 0, 0, 0);

        if (oneDayReminder > now) {
          await schedulePaymentNotification(
            "Last day to update payment",
            "Your subscription will be suspended tomorrow. Please update your payment method now.",
            oneDayReminder,
          );
        }

        hasScheduled.current = true;
      } catch (error) {
        logger.error("Error scheduling payment notifications:", error);
      }
    };

    scheduleAll();
  }, [isPastDue, subscription?.paymentFailedAt]);
}
