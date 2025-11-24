/**
 * Role-Based Access Control (RBAC) Middleware
 * 
 * Provides role-based authorization middleware for the application.
 * Centralizes role checks for admin, moderator, and other user roles.
 */

import type { Request, Response, NextFunction } from "express";
import { getAuthenticatedUserId } from "./auth.middleware";

/**
 * Check if user is an admin
 * 
 * Verifies that the authenticated user has admin privileges.
 * Must be used after isAuthenticated middleware.
 * 
 * @param req - Express request with user session
 * @param res - Express response
 * @param next - Next middleware function
 */
export async function isAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    // Import storage dynamically to avoid circular dependencies
    const { storage } = await import("../storage");
    
    // Check if user exists and has admin privileges
    const user = await storage.user.user.getUserById(userId);
    if (!user) {
      return res.status(403).json({ error: "Access denied - User not found" });
    }
    
    // Check admin flag
    if (!user.isAdmin) {
      return res.status(403).json({ error: "Access denied - Admin privileges required" });
    }
    
    next();
  } catch (error) {
    console.error("Admin authorization check failed:", error);
    res.status(500).json({ error: "Authorization check failed" });
  }
}

/**
 * Check if user is a moderator
 * 
 * Verifies that the authenticated user has moderator privileges.
 * Currently, moderator role is equivalent to admin role.
 * Must be used after isAuthenticated middleware.
 * 
 * @param req - Express request with user session
 * @param res - Express response
 * @param next - Next middleware function
 */
export async function isModerator(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    // Import storage dynamically to avoid circular dependencies
    const { storage } = await import("../storage");
    
    // Check if user exists and has admin/moderator privileges
    const user = await storage.user.user.getUserById(userId);
    if (!user) {
      return res.status(403).json({ error: "Access denied - User not found" });
    }
    
    // For now, only admins can moderate
    // This can be extended to check a specific isModerator field
    if (!user.isAdmin) {
      return res.status(403).json({ error: "Access denied - Moderator privileges required" });
    }
    
    next();
  } catch (error) {
    console.error("Moderator authorization check failed:", error);
    res.status(500).json({ error: "Authorization check failed" });
  }
}

/**
 * Generic role checker
 * 
 * Factory function to create middleware that checks for specific roles.
 * Allows for flexible role-based access control.
 * 
 * @param role - The role to check for (e.g., 'admin', 'moderator', 'premium')
 * @returns Middleware function that validates the specified role
 * 
 * @example
 * router.get('/api/premium', isAuthenticated, hasRole('premium'), handler);
 * router.delete('/api/content', isAuthenticated, hasRole('moderator'), handler);
 */
export function hasRole(role: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = getAuthenticatedUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Import storage dynamically to avoid circular dependencies
      const { storage } = await import("../storage");
      
      // Get user from database
      const user = await storage.user.user.getUserById(userId);
      if (!user) {
        return res.status(403).json({ error: "Access denied - User not found" });
      }
      
      // Check role based on role parameter
      let hasRequiredRole = false;
      
      switch (role.toLowerCase()) {
        case 'admin':
          hasRequiredRole = !!user.isAdmin;
          break;
        case 'moderator':
          // For now, moderators are admins
          hasRequiredRole = !!user.isAdmin;
          break;
        case 'premium':
          // Check for premium subscription (placeholder)
          // This would check user.isPremium or user.subscriptionLevel
          hasRequiredRole = !!user.isAdmin; // Placeholder: admins have all roles
          break;
        default:
          // Unknown role - deny access
          hasRequiredRole = false;
      }
      
      if (!hasRequiredRole) {
        return res.status(403).json({ 
          error: `Access denied - ${role} privileges required` 
        });
      }
      
      next();
    } catch (error) {
      console.error(`Role authorization check failed for role ${role}:`, error);
      res.status(500).json({ error: "Authorization check failed" });
    }
  };
}

/**
 * Check if user owns a resource
 * 
 * Middleware factory to verify resource ownership.
 * Useful for ensuring users can only modify their own data.
 * 
 * @param getResourceOwnerId - Function to extract resource owner ID from request
 * @returns Middleware function that validates ownership
 * 
 * @example
 * const getRecipeOwnerId = async (req) => {
 *   const recipe = await storage.getRecipe(req.params.id);
 *   return recipe?.userId;
 * };
 * router.put('/api/recipes/:id', isAuthenticated, isOwner(getRecipeOwnerId), handler);
 */
export function isOwner(getResourceOwnerId: (req: Request) => Promise<string | null>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = getAuthenticatedUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const ownerId = await getResourceOwnerId(req);
      if (!ownerId) {
        return res.status(404).json({ error: "Resource not found" });
      }
      
      if (userId !== ownerId) {
        // Check if user is admin (admins can access all resources)
        const { storage } = await import("../storage");
        const user = await storage.user.user.getUserById(userId);
        
        if (!user?.isAdmin) {
          return res.status(403).json({ error: "Access denied - You don't own this resource" });
        }
      }
      
      next();
    } catch (error) {
      console.error("Ownership check failed:", error);
      res.status(500).json({ error: "Ownership verification failed" });
    }
  };
}

/**
 * Require any of the specified roles
 * 
 * Checks if user has at least one of the specified roles.
 * Useful for endpoints accessible by multiple role types.
 * 
 * @param roles - Array of roles, user must have at least one
 * @returns Middleware function
 * 
 * @example
 * router.get('/api/reports', isAuthenticated, hasAnyRole(['admin', 'moderator']), handler);
 */
export function hasAnyRole(roles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = getAuthenticatedUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const { storage } = await import("../storage");
      const user = await storage.user.user.getUserById(userId);
      
      if (!user) {
        return res.status(403).json({ error: "Access denied - User not found" });
      }
      
      // Check if user has any of the required roles
      for (const role of roles) {
        switch (role.toLowerCase()) {
          case 'admin':
            if (user.isAdmin) return next();
            break;
          case 'moderator':
            if (user.isAdmin) return next(); // For now, moderators are admins
            break;
          // Add more roles as needed
        }
      }
      
      return res.status(403).json({ 
        error: `Access denied - Requires one of: ${roles.join(', ')}`
      });
    } catch (error) {
      console.error("Role check failed:", error);
      res.status(500).json({ error: "Authorization check failed" });
    }
  };
}

// Re-export adminOnly from oauth.middleware for backward compatibility
export { adminOnly } from "./oauth.middleware";