/**
 * Authentication Middleware
 * 
 * Provides authentication verification for protected routes using OAuth.
 * Integrates with Passport.js session-based authentication configured in auth/oauth.ts.
 * 
 * Middleware Functions:
 * - isAuthenticated: Requires valid authentication (401 if not authenticated)
 * - optionalAuth: Allows both authenticated and unauthenticated access
 * - adminOnly: Requires authentication + admin verification (403 if not admin)
 * 
 * Authentication State:
 * - req.isAuthenticated(): Passport.js method indicating session validity
 * - req.user: OAuth user object with id, email, firstName, lastName, etc.
 * - Session managed by OAuth module with PostgreSQL storage
 * 
 * Usage Pattern:
 * - Protected routes: Apply isAuthenticated middleware
 * - Public routes with optional features: Apply optionalAuth middleware
 * - Admin-only routes: Apply isAuthenticated + adminOnly middleware
 * 
 * Error Responses:
 * - 401 Unauthorized: User not authenticated (missing/invalid session)
 * - 403 Forbidden: User authenticated but lacks admin privileges
 * 
 * @module server/middleware/auth.middleware
 */

import type { Request, Response, NextFunction } from "express";

/**
 * Verify user authentication
 * 
 * Checks if user has valid authenticated session via Passport.js.
 * Blocks unauthenticated requests with 401 error.
 * 
 * @param req - Express request (expects Passport session)
 * @param res - Express response
 * @param next - Next middleware function
 * 
 * Authentication Check:
 * - Verifies req.isAuthenticated() returns true (Passport.js method)
 * - Session must contain valid OAuth session data (configured by auth/oauth.ts)
 * 
 * Side Effects:
 * - None (read-only check)
 * - User data available in req.user for downstream handlers
 * 
 * Error Cases:
 * - Missing session: 401 "Authentication required"
 * - Invalid session: 401 "Authentication required"
 * 
 * @example
 * // Protect a route
 * router.get('/api/user/profile', isAuthenticated, async (req, res) => {
 *   const userId = req.user.id;
 *   const user = await storage.getUser(userId);
 *   res.json(user);
 * });
 */
export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Authentication required" });
}

/**
 * Optional authentication middleware
 * 
 * Allows routes to work with or without authentication.
 * Useful for endpoints that provide enhanced features for authenticated users
 * but remain accessible to anonymous users.
 * 
 * @param req - Express request (may or may not have session)
 * @param res - Express response
 * @param next - Next middleware function
 * 
 * Behavior:
 * - Always calls next() (never blocks request)
 * - Downstream handlers check req.isAuthenticated() to provide user-specific features
 * - User data available in req.user.claims if authenticated
 * 
 * Use Cases:
 * - Public content with personalization for logged-in users
 * - Features that work better with authentication but don't require it
 * - Analytics endpoints that track both authenticated and anonymous users
 * 
 * @example
 * // Public route with optional personalization
 * router.get('/api/recipes/popular', optionalAuth, async (req, res) => {
 *   const recipes = await storage.getPopularRecipes();
 *   if (req.isAuthenticated()) {
 *     // Personalize based on user preferences
 *     const userId = req.user.id;
 *     const preferences = await storage.getUserPreferences(userId);
 *     // Filter or rank recipes based on preferences
 *   }
 *   res.json(recipes);
 * });
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  // Middleware for routes that work with or without authentication
  // but may provide additional features when authenticated
  next();
}

/**
 * Get authenticated user ID
 * 
 * Extracts the user ID from the request object.
 * In our unified OAuth system, all authenticated users have req.user.id set.
 * 
 * @param req - Express request with user session
 * @returns User ID string if authenticated, null otherwise
 * 
 * @example
 * // In a protected route
 * router.get('/api/profile', isAuthenticated, async (req, res) => {
 *   const userId = getAuthenticatedUserId(req);
 *   if (!userId) {
 *     return res.status(401).json({ error: "Authentication required" });
 *   }
 *   const user = await storage.getUser(userId);
 *   res.json(user);
 * });
 */
export function getAuthenticatedUserId(req: Request): string | null {
  return req.user?.id ?? null;
}

/**
 * Admin-only access control
 * 
 * Verifies user is authenticated AND has admin privileges.
 * Checks user's isAdmin field in the database.
 * 
 * @param req - Express request (expects Passport session)
 * @param res - Express response
 * @param next - Next middleware function
 * 
 * Admin Verification:
 * 1. Check authentication (req.isAuthenticated())
 * 2. Extract userId from req.user.id
 * 3. Query database to check isAdmin field
 * 
 * Error Cases:
 * - Not authenticated: 403 "Admin access required"
 * - Authenticated but not admin: 403 "Admin access required"
 * - User not found: 403 "Admin access required"
 * 
 * Security Note:
 * - Uses database isAdmin field for authorization
 * - userId comes from verified OIDC token (cannot be spoofed)
 * - Database-based role system suitable for production
 * 
 * @example
 * // Admin-only endpoint
 * router.delete('/api/users/:id', isAuthenticated, adminOnly, async (req, res) => {
 *   await storage.deleteUser(req.params.id);
 *   res.json({ success: true });
 * });
 */
export async function adminOnly(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    // Support both req.user.id and req.user.claims.sub for compatibility
    const userId = req.user?.id || req.user?.claims?.sub;
    
    if (!userId) {
      return res.status(403).json({ error: "Admin access required" });
    }
    
    // Import storage dynamically to avoid circular dependencies
    const { storage } = await import("../storage");
    
    try {
      // Check if user is admin in database
      const user = await storage.getUserById(userId);
      if (user && user.isAdmin) {
        return next();
      }
    } catch (error) {
      console.error("Error checking admin status:", error);
    }
  }
  res.status(403).json({ error: "Admin access required" });
}