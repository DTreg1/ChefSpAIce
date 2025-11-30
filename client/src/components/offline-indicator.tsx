import { useEffect, useState } from "react";
import { WifiOff, Wifi } from "lucide-react";

export function OfflineIndicator() {
  // Initialize based on current connectivity state with SSR safety
  const [isOffline, setIsOffline] = useState(() => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return false; // Assume online during SSR
    }
    return !navigator.onLine;
  });
  const [showToast, setShowToast] = useState(() => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return false; // Don't show during SSR
    }
    return !navigator.onLine;
  });

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    };

    const handleOffline = () => {
      setIsOffline(true);
      setShowToast(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!showToast) return null;

  return (
    <div
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg transition-all duration-300 hover-elevate ${
        isOffline 
          ? 'bg-destructive text-destructive-foreground' 
          : 'bg-primary text-primary-foreground'
      }`}
      data-testid={isOffline ? "offline-indicator" : "online-indicator"}
    >
      {isOffline ? (
        <>
          <WifiOff className="h-4 w-4" />
          <span className="text-sm font-medium">You're offline - Using cached data</span>
        </>
      ) : (
        <>
          <Wifi className="h-4 w-4" />
          <span className="text-sm font-medium">Back online!</span>
        </>
      )}
    </div>
  );
}
