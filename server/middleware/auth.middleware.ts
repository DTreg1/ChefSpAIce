/**
 * Authentication Middleware
 * 
 * Provides authentication verification for protected routes using Replit Auth OIDC.
 * Integrates with Passport.js session-based authentication configured in replitAuth.ts.
 * 
 * Middleware Functions:
 * - isAuthenticated: Requires valid authentication (401 if not authenticated)
 * - optionalAuth: Allows both authenticated and unauthenticated access
 * - adminOnly: Requires authentication + admin email verification (403 if not admin)
 * 
 * Authentication State:
 * - req.isAuthenticated(): Passport.js method indicating session validity
 * - req.user.claims: OIDC token claims (sub, email, first_name, last_name, etc.)
 * - Session configured by replitAuth.ts (token refresh requires replitAuth.ts middleware)
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
 * Environment Variables:
 * - ADMIN_EMAILS: Comma-separated list of admin email addresses
 * 
 * @module server/middleware/auth.middleware
 */

import type { Response, NextFunction } from "express";

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
 * - Session must contain valid OIDC tokens (configured by replitAuth.ts)
 * - Does NOT handle token refresh (use replitAuth.ts isAuthenticated for that)
 * 
 * Side Effects:
 * - None (read-only check)
 * - User data available in req.user.claims for downstream handlers
 * 
 * Error Cases:
 * - Missing session: 401 "Authentication required"
 * - Invalid session: 401 "Authentication required"
 * 
 * Token Refresh:
 * - This middleware does NOT handle token refresh
 * - Use replitAuth.ts isAuthenticated middleware for automatic token refresh
 * - This is a simpler alternative for routes that don't need refresh logic
 * 
 * @example
 * // Protect a route
 * router.get('/api/user/profile', isAuthenticated, async (req, res) => {
 *   const userId = req.user.claims.sub;
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
 *     const userId = req.user.claims.sub;
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
 * Admin-only access control
 * 
 * Verifies user is authenticated AND has admin privileges.
 * Checks user email against ADMIN_EMAILS environment variable.
 * 
 * @param req - Express request (expects Passport session)
 * @param res - Express response
 * @param next - Next middleware function
 * 
 * Admin Verification:
 * 1. Check authentication (req.isAuthenticated())
 * 2. Extract email from req.user.claims.email
 * 3. Verify email exists in process.env.ADMIN_EMAILS
 * 
 * Environment Variable Format:
 * - ADMIN_EMAILS: Comma-separated list (e.g., "admin@example.com,super@example.com")
 * - Not set: No users have admin access
 * 
 * Error Cases:
 * - Not authenticated: 403 "Admin access required"
 * - Authenticated but not admin: 403 "Admin access required"
 * - No email in claims: 403 "Admin access required"
 * 
 * Security Note:
 * - Uses string.includes() for email matching (simple but effective)
 * - Email comes from verified OIDC token (cannot be spoofed)
 * - Consider moving to database-based role system for production
 * 
 * @example
 * // Admin-only endpoint
 * router.delete('/api/users/:id', isAuthenticated, adminOnly, async (req, res) => {
 *   await storage.deleteUser(req.params.id);
 *   res.json({ success: true });
 * });
 * 
 * @example
 * // Set admin emails in environment
 * // ADMIN_EMAILS=admin@example.com,superadmin@example.com
 */
export function adminOnly(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    const userEmail = req.user?.claims?.email;
    // Add your admin email check here
    if (userEmail && process.env.ADMIN_EMAILS?.includes(userEmail)) {
      return next();
    }
  }
  res.status(403).json({ error: "Admin access required" });
}