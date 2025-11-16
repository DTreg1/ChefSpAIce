/**
 * OAuth Authentication Routes
 * 
 * Handles OAuth login flows for multiple providers
 */

import { Router, Request, Response, NextFunction } from "express";
import passport from "passport";
import { isOAuthConfigured } from "./oauth-config";
import { registerEmailUser, registeredStrategies } from "./oauth";
import { isAuthenticated } from "../middleware/auth.middleware";
import { storage } from "../storage";

const router = Router();

// Helper to check if OAuth is properly configured
const checkOAuthConfig = (provider: string) => (req: Request, res: Response, next: NextFunction) => {
  if (!isOAuthConfigured(provider)) {
    return res.status(503).json({
      error: "Service Unavailable",
      message: `${provider.charAt(0).toUpperCase() + provider.slice(1)} OAuth is not configured. Please add valid OAuth credentials.`,
      provider,
      requiresConfiguration: true
    });
  }
  next();
};

// Google OAuth
router.get("/auth/google/login", checkOAuthConfig("google"), (req, res, next) => {
  // Store redirect URL if provided
  if (req.query.redirect_to) {
    req.session.returnTo = req.query.redirect_to as string;
  }
  
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })(req, res, next);
});

router.get("/auth/google/callback", checkOAuthConfig("google"), 
  passport.authenticate("google", { failureRedirect: "/login?error=oauth_failed" }),
  (req, res) => {
    const redirectTo = req.session.returnTo || "/";
    delete req.session.returnTo;
    res.redirect(redirectTo);
  }
);

// GitHub OAuth
router.get("/auth/github/login", checkOAuthConfig("github"), (req, res, next) => {
  if (req.query.redirect_to) {
    req.session.returnTo = req.query.redirect_to as string;
  }
  
  passport.authenticate("github", {
    scope: ["user:email"],
  })(req, res, next);
});

router.get("/auth/github/callback", checkOAuthConfig("github"),
  passport.authenticate("github", { failureRedirect: "/login?error=oauth_failed" }),
  (req, res) => {
    const redirectTo = req.session.returnTo || "/";
    delete req.session.returnTo;
    res.redirect(redirectTo);
  }
);

// Twitter OAuth
router.get("/auth/twitter/login", checkOAuthConfig("twitter"), (req, res, next) => {
  if (req.query.redirect_to) {
    req.session.returnTo = req.query.redirect_to as string;
  }
  
  passport.authenticate("twitter")(req, res, next);
});

// Twitter OAuth 1.0a requires GET for callback (not POST)
router.get("/auth/twitter/callback", checkOAuthConfig("twitter"),
  passport.authenticate("twitter", { failureRedirect: "/login?error=oauth_failed" }),
  (req, res) => {
    const redirectTo = req.session.returnTo || "/";
    delete req.session.returnTo;
    res.redirect(redirectTo);
  }
);

// Apple Sign In
router.get("/auth/apple/login", checkOAuthConfig("apple"), (req, res, next) => {
  if (req.query.redirect_to) {
    req.session.returnTo = req.query.redirect_to as string;
  }
  
  passport.authenticate("apple")(req, res, next);
});

router.post("/auth/apple/callback", checkOAuthConfig("apple"),
  passport.authenticate("apple", { failureRedirect: "/login?error=oauth_failed" }),
  (req, res) => {
    const redirectTo = req.session.returnTo || "/";
    delete req.session.returnTo;
    res.redirect(redirectTo);
  }
);

// Replit OIDC
router.get("/auth/replit/login", checkOAuthConfig("replit"), (req, res, next) => {
  if (req.query.redirect_to) {
    req.session.returnTo = req.query.redirect_to as string;
  }
  
  passport.authenticate("replit")(req, res, next);
});

router.get("/auth/replit/callback", checkOAuthConfig("replit"),
  passport.authenticate("replit", { failureRedirect: "/login?error=oauth_failed" }),
  (req, res) => {
    const redirectTo = req.session.returnTo || "/";
    delete req.session.returnTo;
    res.redirect(redirectTo);
  }
);

// Email/Password Authentication
router.post("/auth/email/register", async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        error: "Email and password are required" 
      });
    }
    
    if (password.length < 8) {
      return res.status(400).json({ 
        error: "Password must be at least 8 characters" 
      });
    }
    
    const user = await registerEmailUser(email, password, firstName, lastName);
    
    // Log the user in after registration
    req.login(user, (err) => {
      if (err) {
        console.error("Login error after registration:", err);
        return res.status(500).json({ error: "Registration successful but login failed" });
      }
      res.json({ success: true, user });
    });
  } catch (error: any) {
    console.error("Registration error:", error);
    if (error.message.includes("already exists")) {
      res.status(409).json({ error: "User with this email already exists" });
    } else {
      res.status(500).json({ error: "Registration failed" });
    }
  }
});

router.post("/auth/email/login", (req, res, next) => {
  passport.authenticate("local", (err: any, user: any, info: any) => {
    if (err) {
      console.error("Authentication error:", err);
      return res.status(500).json({ error: "Authentication failed" });
    }
    
    if (!user) {
      return res.status(401).json({ 
        error: info?.message || "Invalid email or password" 
      });
    }
    
    req.login(user, (loginErr) => {
      if (loginErr) {
        console.error("Login error:", loginErr);
        return res.status(500).json({ error: "Login failed" });
      }
      res.json({ success: true, user });
    });
  })(req, res, next);
});

// Logout
router.post("/auth/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error("Logout error:", err);
      return res.status(500).json({ error: "Logout failed" });
    }
    
    // Destroy the session
    req.session.destroy((destroyErr) => {
      if (destroyErr) {
        console.error("Session destroy error:", destroyErr);
      }
      res.json({ success: true });
    });
  });
});

// Get current user
router.get("/auth/user", isAuthenticated, async (req, res) => {
  try {
    const sessionUser = req.user as any;
    const user = await storage.getUser(sessionUser.id);
    res.json(user);
  } catch (error) {
    console.error("Error getting user:", error);
    res.status(500).json({ error: "Failed to get user" });
  }
});

// Link additional OAuth provider
router.post("/auth/link/:provider", isAuthenticated, (req, res, next) => {
  const { provider } = req.params;
  
  if (!["google", "github", "twitter", "apple", "replit"].includes(provider)) {
    return res.status(400).json({ error: "Invalid provider" });
  }
  
  if (!isOAuthConfigured(provider)) {
    return res.status(503).json({
      error: "Service Unavailable",
      message: `${provider.charAt(0).toUpperCase() + provider.slice(1)} OAuth is not configured.`,
      requiresConfiguration: true
    });
  }
  
  // Store that we're linking, not signing in
  req.session.linkingProvider = provider;
  req.session.linkingUserId = (req.user as any).id;
  
  // Redirect to OAuth flow
  res.json({ 
    redirectUrl: `/api/auth/${provider}/login` 
  });
});

// Check OAuth configuration status
router.get("/auth/config-status", (req, res) => {
  // Check both configured and actually registered strategies
  const providers = {
    google: isOAuthConfigured("google") && registeredStrategies.has("google"),
    github: isOAuthConfigured("github") && registeredStrategies.has("github"),
    twitter: isOAuthConfigured("twitter") && registeredStrategies.has("twitter"),
    apple: isOAuthConfigured("apple") && registeredStrategies.has("apple"),
    replit: isOAuthConfigured("replit") && registeredStrategies.has("replit"),
    email: registeredStrategies.has("email"), // Email is registered if strategy was set up
  };
  
  res.json({
    providers,
    configured: Object.values(providers).some(v => v),
    message: Object.values(providers).every(v => !v) 
      ? "No OAuth providers are configured. Please add OAuth credentials to enable authentication."
      : "OAuth is partially configured."
  });
});

// Fallback for old Replit Auth login route
router.get("/login", (req, res) => {
  res.status(410).json({
    error: "Replit Auth has been replaced with OAuth",
    message: "Please use the new OAuth endpoints: /api/auth/[provider]/login",
    availableProviders: [
      "/api/auth/google/login",
      "/api/auth/github/login", 
      "/api/auth/twitter/login",
      "/api/auth/apple/login",
      "/api/auth/email/login"
    ]
  });
});

export default router;