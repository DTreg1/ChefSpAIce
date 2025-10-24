// Referenced from blueprint:javascript_log_in_with_replit
import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

export function useAuth() {
  const { data: user, isLoading, refetch } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: 1, // Allow one retry for transient failures
    refetchOnWindowFocus: true, // Refetch when window regains focus
    refetchOnMount: true, // Always refetch on component mount
    staleTime: 0, // Consider data immediately stale to ensure fresh auth state
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    refetch, // Expose refetch method for manual refresh if needed
  };
}
