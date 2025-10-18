// Referenced from blueprint:javascript_log_in_with_replit
import { useState, useEffect } from "react";
import type { User } from "@shared/schema";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    
    const checkAuth = async () => {
      console.log("[useAuth] Checking authentication...");
      try {
        const response = await fetch('/api/auth/user', {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        console.log(`[useAuth] Auth response status: ${response.status}`);
        
        if (mounted) {
          if (response.status === 401) {
            console.log("[useAuth] Not authenticated");
            setUser(null);
          } else if (response.ok) {
            const userData = await response.json();
            console.log("[useAuth] Authenticated:", userData);
            setUser(userData);
          } else {
            console.error(`[useAuth] Unexpected status: ${response.status}`);
            setUser(null);
          }
          setIsLoading(false);
        }
      } catch (error) {
        console.error('[useAuth] Auth check failed:', error);
        if (mounted) {
          setUser(null);
          setIsLoading(false);
        }
      }
    };
    
    checkAuth();
    
    return () => {
      mounted = false;
    };
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}
