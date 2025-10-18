// Referenced from blueprint:javascript_log_in_with_replit
import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";
import { getQueryFn } from "@/lib/queryClient";
import { useEffect } from "react";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn<User>({ on401: "returnNull" }),
    retry: false,
  });

  // Debug logging to understand what's happening
  useEffect(() => {
    console.log("Auth Hook Status:", { 
      isLoading, 
      hasUser: !!user, 
      error: error ? (error as any).message : null,
      errorStatus: error ? (error as any).status : null
    });
  }, [isLoading, user, error]);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}
