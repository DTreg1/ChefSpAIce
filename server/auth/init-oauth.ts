/**
 * OAuth Setup
 * 
 * Initializes OAuth authentication for the application
 */

import { Express } from "express";
import passport from "passport";
import { getSessionMiddleware } from "../config/session-config";
import { initializeOAuthStrategies } from "./oauth";

export async function setupOAuth(app: Express) {
  // Set up trust proxy for secure cookies
  app.set("trust proxy", 1);
  
  // Set up session middleware
  app.use(getSessionMiddleware());
  
  // Initialize Passport
  app.use(passport.initialize());
  app.use(passport.session());
  
  // Get hostname for OAuth callbacks
  const hostname = process.env.REPLIT_DOMAINS?.split(",")[0]?.trim() || "localhost";
  
  // Initialize all OAuth strategies
  await initializeOAuthStrategies(hostname);
  
  console.log("🔐 OAuth authentication initialized");
  console.log("Available providers:");
  console.log("  - Google:", process.env.GOOGLE_CLIENT_ID ? "✓ Configured" : "✗ Needs configuration");
  console.log("  - GitHub:", process.env.GITHUB_CLIENT_ID ? "✓ Configured" : "✗ Needs configuration");
  console.log("  - Apple:", process.env.APPLE_CLIENT_ID ? "✓ Configured" : "✗ Needs configuration");
  console.log("  - Replit:", (process.env.REPLIT_CLIENT_ID || process.env.REPLIT_DOMAINS) ? "✓ Configured" : "✗ Needs configuration");
  console.log("  - Email/Password: ✓ Always available");
}