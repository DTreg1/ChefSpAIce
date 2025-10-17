// Hook to handle Replit cold starts and connection warming
import { useEffect, useState } from "react";

export function useReplitWarmup() {
  const [isWarmedUp, setIsWarmedUp] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);

  useEffect(() => {
    let isMounted = true;
    let retryTimeout: NodeJS.Timeout;

    const warmupConnection = async () => {
      try {
        // Simple ping to wake up the server
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch('/api/health', {
          method: 'GET',
          credentials: 'include',
          signal: controller.signal,
        }).catch(() => null);
        
        clearTimeout(timeoutId);

        if (isMounted) {
          if (response && response.ok) {
            setIsWarmedUp(true);
          } else {
            // Retry quickly for Replit cold starts
            setAttemptCount(prev => prev + 1);
            retryTimeout = setTimeout(() => {
              if (isMounted && attemptCount < 10) {
                warmupConnection();
              }
            }, 200); // Very short delay for aggressive retry
          }
        }
      } catch (error) {
        if (isMounted && attemptCount < 10) {
          setAttemptCount(prev => prev + 1);
          retryTimeout = setTimeout(() => {
            warmupConnection();
          }, 200);
        }
      }
    };

    // Start warming up immediately
    warmupConnection();

    return () => {
      isMounted = false;
      clearTimeout(retryTimeout);
    };
  }, []);

  return { isWarmedUp, attemptCount };
}