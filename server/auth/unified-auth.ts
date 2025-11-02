/**
 * Unified Authentication Module
 * 
 * Provides a single entry point for authentication that automatically
 * switches between Replit Auth and custom OAuth based on the environment.
 */

import type { Express, RequestHandler } from "express";
import { getAuthMode, logAuthConfiguration } from "./auth-mode";
import { setupAuth as setupReplitAuth, isAuthenticated as isReplitAuthenticated } from "../replitAuth";
import { setupOAuth as setupCustomOAuth } from "./setup-oauth";
import { isAuthenticated as isOAuthAuthenticated } from "../middleware/auth.middleware";
import authRouter from "./oauth-routes";

// Store the current auth mode for runtime checks
let currentAuthMode: 'replit' | 'oauth' | null = null;

/**
 * Setup authentication based on detected mode
 */
export async function setupUnifiedAuth(app: Express) {
  // Log the configuration for debugging
  const config = logAuthConfiguration();
  currentAuthMode = getAuthMode();
  
  console.log(`\n🚀 Initializing authentication in ${currentAuthMode.toUpperCase()} mode\n`);
  
  if (currentAuthMode === 'replit') {
    // Use Replit Auth for testing/development
    await setupReplitAuth(app);
    
    // Add compatibility endpoint for OAuth-style user fetching
    app.get('/api/user', isReplitAuthenticated, async (req: any, res) => {
      try {
        const userId = req.user?.claims?.sub;
        if (!userId) {
          return res.status(401).json({ message: "Unauthorized" });
        }
        const { storage } = await import("../storage");
        const user = await storage.getUser(userId);
        res.json(user);
      } catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).json({ message: "Failed to fetch user" });
      }
    });
    
  } else {
    // Use custom OAuth for production
    await setupCustomOAuth(app);
    
    // Register OAuth routes at correct path
    app.use("/api/auth", authRouter);
    
    // Add Replit Auth compatibility endpoints that redirect to OAuth
    app.get("/api/login", (req, res) => {
      // Try to redirect to the first available OAuth provider
      const providers = ['google', 'github', 'twitter', 'apple'];
      for (const provider of providers) {
        if (config.oauthProviders[provider as keyof typeof config.oauthProviders]) {
          return res.redirect(`/api/auth/${provider}/login`);
        }
      }
      // No OAuth providers configured
      res.status(503).json({ 
        message: "No authentication providers are configured. Please add OAuth credentials."
      });
    });
    
    app.get("/api/logout", (req, res) => {
      req.logout(() => {
        res.redirect("/");
      });
    });
    
    app.get("/api/callback", (req, res) => {
      // This is a fallback for Replit Auth callback URLs
      res.status(400).json({ 
        message: "Invalid callback. Please use provider-specific OAuth endpoints."
      });
    });
  }
  
  console.log(`✅ Authentication initialized in ${currentAuthMode.toUpperCase()} mode\n`);
}

/**
 * Unified authentication middleware
 * Delegates to the appropriate auth middleware based on current mode
 */
export const isAuthenticated: RequestHandler = (req, res, next) => {
  if (currentAuthMode === 'replit') {
    return isReplitAuthenticated(req, res, next);
  } else {
    return isOAuthAuthenticated(req, res, next);
  }
};

/**
 * Get the current authentication mode
 */
export function getCurrentAuthMode() {
  return currentAuthMode;
}