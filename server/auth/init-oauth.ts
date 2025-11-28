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
  // APP_URL takes priority (for production custom domains like chefspaice.com)
  // Falls back to REPLIT_DOMAINS for development
  let hostname = "localhost";
  if (process.env.APP_URL) {
    // Extract hostname from full URL (e.g., "https://chefspaice.com" -> "chefspaice.com")
    try {
      hostname = new URL(process.env.APP_URL).hostname;
    } catch {
      hostname = process.env.APP_URL.replace(/^https?:\/\//, '').split('/')[0];
    }
  } else if (process.env.REPLIT_DOMAINS) {
    hostname = process.env.REPLIT_DOMAINS.split(",")[0]?.trim();
  }
  
  // Initialize all OAuth strategies
  await initializeOAuthStrategies(hostname);
}