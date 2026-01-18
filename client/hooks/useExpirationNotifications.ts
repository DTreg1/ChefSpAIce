import { useEffect, useRef } from "react";
import {
  initializeNotifications,
  addNotificationResponseListener,
} from "@/lib/notifications";

export function useExpirationNotifications() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    initializeNotifications();

    const subscription = addNotificationResponseListener((response) => {
      const data = response.notification.request.content.data as {
        type?: string;
        itemId?: string;
      };

      if (data?.type === "expiration-alert" && data?.itemId) {
        console.log("Notification tapped for item:", data.itemId);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);
}

