/**
 * Unified Authentication Module
 * 
 * Provides a single entry point for OAuth authentication with support for
 * multiple providers including Replit, Google, GitHub, Twitter/X, Apple, and email.
 */

import type { Express, RequestHandler } from "express";
import { logAuthConfiguration } from "./auth-mode";
import { setupOAuth } from "./setup-oauth";
import { isAuthenticated as isOAuthAuthenticated } from "../middleware/auth.middleware";

/**
 * Setup OAuth authentication with all providers
 */
export async function setupUnifiedAuth(app: Express) {
  // Log the configuration for debugging
  logAuthConfiguration();
  
  console.log(`\n🚀 Initializing unified OAuth authentication\n`);
  
  // Setup OAuth with all providers including Replit
  await setupOAuth(app);
  
  // Add legacy compatibility endpoints
  app.get("/api/login", (req, res) => {
    // Redirect to login page which shows all available providers
    res.redirect("/login");
  });
  
  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect("/");
    });
  });
  
  app.get("/api/callback", (req, res) => {
    // Legacy callback endpoint - redirect to appropriate OAuth callback
    res.status(400).json({ 
      message: "Invalid callback. Please use provider-specific OAuth endpoints."
    });
  });
  
  console.log(`✅ OAuth authentication initialized with all providers\n`);
}

/**
 * Unified authentication middleware
 * Always uses OAuth authentication
 */
export const isAuthenticated: RequestHandler = isOAuthAuthenticated;