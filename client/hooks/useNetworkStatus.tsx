import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import NetInfo from "@react-native-community/netinfo";
import { syncManager } from "@/lib/sync-manager";
import { offlineMutationQueue } from "@/lib/offline-queue";
import { logger } from "@/lib/logger";

interface NetworkStatusContextType {
  isConnected: boolean;
  isInternetReachable: boolean | null;
}

const NetworkStatusContext = createContext<NetworkStatusContextType | undefined>(undefined);

export function NetworkStatusProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(true);
  const [isInternetReachable, setIsInternetReachable] = useState<boolean | null>(null);
  const prevConnectedRef = useRef(true);
  const connectedRef = useRef(true);
  const backoffTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearBackoffTimer = useCallback(() => {
    if (backoffTimerRef.current) {
      clearTimeout(backoffTimerRef.current);
      backoffTimerRef.current = null;
    }
  }, []);

  const handleReconnection = useCallback(async (attempt = 0) => {
    const jitter = 500 + Math.random() * 1000;
    await new Promise((resolve) => setTimeout(resolve, jitter));

    if (!connectedRef.current) {
      logger.log("[NetworkStatus] Aborting reconnection sync — went offline during backoff");
      return;
    }

    try {
      const items = await offlineMutationQueue.getAll();
      if (items.length > 0) {
        syncManager.markRequestSuccess();
      }

      const result = await syncManager.fullSync();
      if (!result.success) {
        throw new Error(result.error || "Sync failed");
      }

      logger.log("[NetworkStatus] Reconnection sync completed successfully");
    } catch (error) {
      if (!connectedRef.current) {
        logger.log("[NetworkStatus] Aborting reconnection retry — went offline");
        return;
      }

      const nextAttempt = attempt + 1;
      const delay = Math.min(2000 * Math.pow(2, attempt), 30000);
      logger.warn("[NetworkStatus] Reconnection sync failed, retrying", {
        attempt: nextAttempt,
        delay,
        error: (error as Error).message,
      });

      clearBackoffTimer();
      backoffTimerRef.current = setTimeout(() => {
        handleReconnection(nextAttempt);
      }, delay);
    }
  }, [clearBackoffTimer]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const connected = state.isConnected ?? false;
      const reachable = state.isInternetReachable ?? null;

      setIsConnected(connected);
      setIsInternetReachable(reachable);
      connectedRef.current = connected;

      syncManager.setNetworkStatus(connected);

      const wasDisconnected = !prevConnectedRef.current;
      prevConnectedRef.current = connected;

      if (!connected) {
        clearBackoffTimer();
        return;
      }

      if (wasDisconnected && connected) {
        logger.log("[NetworkStatus] Connection restored, initiating reconnection sync");
        clearBackoffTimer();
        handleReconnection(0);
      }
    });

    return () => {
      unsubscribe();
      if (backoffTimerRef.current) {
        clearTimeout(backoffTimerRef.current);
      }
    };
  }, [handleReconnection]);

  return (
    <NetworkStatusContext.Provider value={{ isConnected, isInternetReachable }}>
      {children}
    </NetworkStatusContext.Provider>
  );
}

export function useNetworkStatus(): NetworkStatusContextType {
  const context = useContext(NetworkStatusContext);
  if (context === undefined) {
    throw new Error("useNetworkStatus must be used within a NetworkStatusProvider");
  }
  return context;
}
