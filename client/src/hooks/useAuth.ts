// Referenced from blueprint:javascript_log_in_with_replit
import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

export function useAuth() {
  const { data: user, isLoading, isError, error } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: false,
    // Only try to fetch auth status once on mount, don't refetch on window focus
    refetchOnWindowFocus: false,
    // Consider the auth check stale after 5 minutes
    staleTime: 5 * 60 * 1000,
  });

  // If we get a 401, user is not authenticated (expected for new users)
  const isUnauthenticated = isError && (error as any)?.status === 401;

  return {
    user,
    isLoading,
    isError: isError && !isUnauthenticated, // Only treat non-401 errors as real errors
    isAuthenticated: !!user,
  };
}
