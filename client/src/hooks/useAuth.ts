// Referenced from blueprint:javascript_log_in_with_replit
import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: false, // We handle retries in our custom fetch logic
    // Keep the query fresh on page load
    staleTime: 0,
    gcTime: 0,
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    error,
  };
}
