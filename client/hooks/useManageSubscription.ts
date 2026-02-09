import { useState, useCallback } from "react";
import { Platform, Linking } from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import { useStoreKit } from "@/hooks/useStoreKit";
import { getApiUrl } from "@/lib/query-client";
import { logger } from "@/lib/logger";

export function useManageSubscription() {
  const { token } = useAuth();
  const { presentCustomerCenter, isCustomerCenterAvailable } = useStoreKit();
  const [isManaging, setIsManaging] = useState(false);

  const handleManageSubscription = useCallback(async () => {
    setIsManaging(true);
    try {
      if (isCustomerCenterAvailable) {
        try {
          await presentCustomerCenter();
          return;
        } catch (error) {
          logger.error("Error opening customer center:", error);
        }
      }

      if (Platform.OS === "ios") {
        Linking.openURL("https://apps.apple.com/account/subscriptions");
        return;
      }
      if (Platform.OS === "android") {
        Linking.openURL("https://play.google.com/store/account/subscriptions");
        return;
      }

      try {
        const baseUrl = getApiUrl();
        const url = new URL("/api/subscriptions/create-portal-session", baseUrl);

        const response = await fetch(url.toString(), {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        });

        if (response.ok) {
          const data = (await response.json()).data as any;
          if (data.url) {
            (window as Window).location.href = data.url;
          }
        }
      } catch (error) {
        logger.error("Error opening subscription portal:", error);
      }
    } finally {
      setIsManaging(false);
    }
  }, [isCustomerCenterAvailable, presentCustomerCenter, token]);

  return { handleManageSubscription, isManaging };
}
