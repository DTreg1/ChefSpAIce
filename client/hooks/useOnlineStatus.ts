import { useState, useEffect } from "react";
import { syncManager } from "@/lib/sync-manager";

export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const unsubscribe = syncManager.subscribe((state) => {
      setIsOnline(state.isOnline);
    });
    return unsubscribe;
  }, []);

  return isOnline;
}
