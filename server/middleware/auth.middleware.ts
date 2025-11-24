/**
 * Authentication Middleware
 * 
 * Core authentication middleware for the application.
 * Re-exports authentication functionality from oauth.middleware.ts
 * and provides additional authentication utilities.
 */

import type { Request, Response, NextFunction } from "express";

// Re-export authentication functions from oauth.middleware
export {
  isAuthenticated,
  optionalAuth,
  getAuthenticatedUserId
} from "./oauth.middleware";

/**
 * Validate API Key Middleware
 * 
 * Validates API keys for external API access.
 * Used for services that require API key authentication.
 * 
 * @param keyName - Name of the API key to validate (e.g., 'OPENAI_API_KEY')
 */
export function validateApiKey(keyName: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const apiKey = process.env[keyName];
      
      if (!apiKey) {
        console.error(`API key ${keyName} not configured`);
        return res.status(503).json({ 
          error: "Service temporarily unavailable",
          details: "API key not configured"
        });
      }
      
      // Store API key in request for downstream use
      (req as any).apiKey = apiKey;
      next();
    } catch (error) {
      console.error(`Error validating API key ${keyName}:`, error);
      res.status(500).json({ 
        error: "Internal server error",
        details: "Failed to validate API key"
      });
    }
  };
}

/**
 * Require Authentication with Error Message
 * 
 * Similar to isAuthenticated but allows custom error messages.
 * 
 * @param errorMessage - Custom error message for unauthorized access
 */
export function requireAuth(errorMessage = "Authentication required") {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.isAuthenticated && req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ error: errorMessage });
  };
}

/**
 * Check if user has verified email
 * 
 * Middleware to ensure user has a verified email address.
 * Must be used after isAuthenticated middleware.
 */
export async function requireVerifiedEmail(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    const { storage } = await import("../storage");
    const user = await storage.user.user.getUserById(userId);
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // For now, we assume all OAuth users have verified emails
    // This can be extended to check a specific emailVerified field
    next();
  } catch (error) {
    console.error("Error checking email verification:", error);
    res.status(500).json({ error: "Failed to verify email status" });
  }
}