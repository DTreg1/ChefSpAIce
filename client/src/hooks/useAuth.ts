/**
 * useAuth Hook
 *
 * Manages authentication state and user session.
 * Integrates with Replit Auth OIDC provider.
 *
 * Returns:
 * - user: Current user object (User type from schema) or undefined
 * - isLoading: True during initial auth check
 * - isAuthenticated: Boolean indicating if user is logged in
 * - refetch: Function to manually refresh auth state
 *
 * State Persistence:
 * - Session managed server-side via express-session with connect-pg-simple
 * - Cookie-based session storage (httpOnly, secure in production)
 * - No client-side storage of authentication tokens
 *
 * Auth Flow:
 * 1. Component mounts → query /api/auth/user endpoint
 * 2. Server checks existing session cookie
 * 3. Returns user object if session valid, or null/error if not
 * 4. React Query caches result and provides loading state
 * 5. On window focus or mount, automatically refetches to ensure fresh auth state
 *
 * Query Configuration:
 * - Retry: 1 attempt for transient failures
 * - RefetchOnWindowFocus: true (verifies auth when user returns to tab)
 * - RefetchOnMount: true (always checks auth when component mounts)
 * - StaleTime: 0 (considers data immediately stale for security)
 *
 * Usage:
 * ```tsx
 * const { user, isLoading, isAuthenticated, refetch } = useAuth();
 *
 * if (isLoading) return <LoadingSpinner />;
 * if (!isAuthenticated) return <LoginButton />;
 * return <div>Welcome, {user.name}!</div>;
 * ```
 *
 * Login/Logout:
 * - Login: Redirect to /api/auth/login (Replit OIDC flow)
 * - Logout: POST to /api/auth/logout, then refetch auth state
 */

// Referenced from blueprint:javascript_log_in_with_replit
import { useQuery } from "@tanstack/react-query";
import { API_ENDPOINTS } from "@/lib/api-endpoints";
import type { User } from "@shared/schema";

export function useAuth() {
  const {
    data: user,
    isLoading,
    refetch,
  } = useQuery<User>({
    queryKey: [API_ENDPOINTS.auth.user],
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
