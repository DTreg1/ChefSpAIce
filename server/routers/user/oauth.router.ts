/**
 * OAuth Authentication Routes
 *
 * Handles OAuth login flows for multiple providers
 */

import { Router, Request, Response, NextFunction } from "express";
import passport from "passport";
import { isOAuthConfigured } from "../../config/oauth-config";
import { registerEmailUser, registeredStrategies } from "../../auth/oauth";
import { isAuthenticated } from "../../middleware/oauth.middleware";
import { storage } from "../../storage";

const router = Router();

// Helper to check if OAuth is properly configured
const checkOAuthConfig =
  (provider: string) => (req: Request, res: Response, next: NextFunction) => {
    if (!isOAuthConfigured(provider)) {
      return res.status(503).json({
        error: "Service Unavailable",
        message: `${provider.charAt(0).toUpperCase() + provider.slice(1)} OAuth is not configured. Please add valid OAuth credentials.`,
        provider,
        requiresConfiguration: true,
      });
    }
    next();
  };

// Google OAuth
router.get("/google/login", checkOAuthConfig("google"), (req, res, next) => {
  // Store redirect URL if provided
  if (req.query.redirect_to) {
    req.session.returnTo = req.query.redirect_to as string;
  }

  passport.authenticate("google", {
    scope: ["profile", "email"],
  })(req, res, next);
});

router.get(
  "/google/callback",
  checkOAuthConfig("google"),
  passport.authenticate("google", {
    failureRedirect: "/login?error=oauth_failed",
  }),
  (req, res) => {
    const redirectTo = req.session.returnTo || "/";
    delete req.session.returnTo;
    res.redirect(redirectTo);
  },
);

// GitHub OAuth
router.get("/github/login", checkOAuthConfig("github"), (req, res, next) => {
  if (req.query.redirect_to) {
    req.session.returnTo = req.query.redirect_to as string;
  }

  passport.authenticate("github", {
    scope: ["user:email"],
  })(req, res, next);
});

router.get(
  "/github/callback",
  checkOAuthConfig("github"),
  passport.authenticate("github", {
    failureRedirect: "/login?error=oauth_failed",
  }),
  (req, res) => {
    const redirectTo = req.session.returnTo || "/";
    delete req.session.returnTo;
    res.redirect(redirectTo);
  },
);

// Twitter OAuth
router.get("/twitter/login", checkOAuthConfig("twitter"), (req, res, next) => {
  if (req.query.redirect_to) {
    req.session.returnTo = req.query.redirect_to as string;
  }

  passport.authenticate("twitter")(req, res, next);
});

// Twitter OAuth 2.0 callback
router.get(
  "/twitter/callback",
  checkOAuthConfig("twitter"),
  passport.authenticate("twitter", {
    failureRedirect: "/login?error=oauth_failed",
  }),
  (req, res) => {
    const redirectTo = req.session.returnTo || "/";
    delete req.session.returnTo;
    res.redirect(redirectTo);
  },
);

// Apple Sign In
router.get("/apple/login", checkOAuthConfig("apple"), (req, res, next) => {
  if (req.query.redirect_to) {
    req.session.returnTo = req.query.redirect_to as string;
  }

  passport.authenticate("apple")(req, res, next);
});

router.post(
  "/apple/callback",
  checkOAuthConfig("apple"),
  passport.authenticate("apple", {
    failureRedirect: "/login?error=oauth_failed",
  }),
  (req, res) => {
    const redirectTo = req.session.returnTo || "/";
    delete req.session.returnTo;
    res.redirect(redirectTo);
  },
);

// Replit OIDC
router.get("/replit/login", checkOAuthConfig("replit"), (req, res, next) => {
  if (req.query.redirect_to) {
    req.session.returnTo = req.query.redirect_to as string;
  }

  passport.authenticate("replit")(req, res, next);
});

router.get(
  "/replit/callback",
  checkOAuthConfig("replit"),
  passport.authenticate("replit", {
    failureRedirect: "/login?error=oauth_failed",
  }),
  (req, res) => {
    const redirectTo = req.session.returnTo || "/";
    delete req.session.returnTo;
    res.redirect(redirectTo);
  },
);

// Email/Password Authentication
router.post("/email/register", async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password are required",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        error: "Password must be at least 8 characters",
      });
    }

    const user = await registerEmailUser(email, password, firstName, lastName);

    // Log the user in after registration
    req.login(user, (err) => {
      if (err) {
        console.error("Login error after registration:", err);
        return res
          .status(500)
          .json({ error: "Registration successful but login failed" });
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

router.post("/email/login", (req, res, next) => {
  passport.authenticate("local", (err: any, user: any, info: any) => {
    if (err) {
      console.error("Authentication error:", err);
      return res.status(500).json({ error: "Authentication failed" });
    }

    if (!user) {
      return res.status(401).json({
        error: info?.message || "Invalid email or password",
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
router.post("/logout", (req, res) => {
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

// Get current user - /api/v1/auth/me
router.get("/me", (req, res) => {
  if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  const sessionUser = req.user;
  res.json(sessionUser);
});

// Get current user with full details - /api/v1/auth/user
router.get("/user", isAuthenticated, async (req, res) => {
  try {
    const sessionUser = req.user;
    if (!sessionUser || !("id" in sessionUser)) {
      return res.status(401).json({ error: "User not authenticated" });
    }
    const user = await storage.getUserById(sessionUser.id);
    res.json(user);
  } catch (error) {
    console.error("Error getting user:", error);
    res.status(500).json({ error: "Failed to get user" });
  }
});

// Get common items for onboarding - /api/v1/auth/onboarding/common-items
router.get("/onboarding/common-items", async (_req, res) => {
  try {
    const { onboardingUsdaMapping } = await import(
      "../../data/onboarding-usda-mapping"
    );

    const categories: Record<
      string,
      Array<{
        displayName: string;
        fdcId: string;
        description: string;
        storage: string;
        quantity: string;
        unit: string;
        expirationDays: number;
        category: string;
      }>
    > = {};

    for (const [name, item] of Object.entries(onboardingUsdaMapping)) {
      const category = item.foodCategory || "Other";
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push({
        displayName: item.displayName || name,
        fdcId: item.fdcId,
        description: item.description,
        storage: item.storage,
        quantity: item.quantity,
        unit: item.unit,
        expirationDays: item.expirationDays,
        category: category,
      });
    }

    res.json({ categories });
  } catch (error) {
    console.error("Error getting common items:", error);
    res.status(500).json({ error: "Failed to get common items" });
  }
});

// Complete onboarding - /api/v1/auth/onboarding/complete
router.post("/onboarding/complete", isAuthenticated, async (req, res) => {
  try {
    const sessionUser = req.user;
    if (!sessionUser || !("id" in sessionUser)) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const userId = sessionUser.id;
    const { preferences, customStorageAreas, selectedEquipment } = req.body;

    const results = {
      foodItemsCreated: 0,
      failedItems: [] as string[],
      createdStorageLocations: [] as string[],
      equipmentAdded: selectedEquipment?.length || 0,
    };

    // 1. Update user preferences
    if (preferences) {
      await storage.updateUserPreferences(userId, {
        householdSize: preferences.householdSize,
        cookingSkillLevel: preferences.cookingSkillLevel,
        preferredUnits: preferences.preferredUnits,
        dietaryRestrictions: preferences.dietaryRestrictions,
        allergens: preferences.allergens,
        foodsToAvoid: preferences.foodsToAvoid,
        expirationAlertDays: preferences.expirationAlertDays,
      });
    }

    // 2. Create storage locations from selected areas (only if they don't exist)
    const existingLocations =
      await storage.user.inventory.getStorageLocations(userId);
    const existingNames = new Set(
      existingLocations.map((loc: { name: string }) => loc.name.toLowerCase()),
    );

    const storageAreas = [
      ...(preferences?.storageAreasEnabled || []),
      ...(customStorageAreas || []),
    ];
    for (const areaName of storageAreas) {
      // Skip if location already exists
      if (existingNames.has(areaName.toLowerCase())) {
        continue;
      }

      try {
        const location = await storage.createStorageLocation(userId, {
          name: areaName,
          icon: getStorageIcon(areaName),
        });
        if (location) {
          results.createdStorageLocations.push(areaName);
        }
      } catch (err) {
        // Location creation failed, log but continue
        console.warn(`Could not create storage location "${areaName}":`, err);
      }
    }

    // 3. Mark onboarding as complete
    await storage.markOnboardingComplete(userId);

    res.json(results);
  } catch (error) {
    console.error("Error completing onboarding:", error);
    res.status(500).json({ error: "Failed to complete onboarding" });
  }
});

// Helper function to get storage icon based on name
function getStorageIcon(name: string): string {
  const lowerName = name.toLowerCase();
  if (lowerName.includes("fridge") || lowerName.includes("refrigerator"))
    return "refrigerator";
  if (lowerName.includes("freezer")) return "snowflake";
  if (lowerName.includes("pantry")) return "utensils-crossed";
  if (lowerName.includes("counter")) return "pizza";
  return "box";
}

// Link additional OAuth provider
router.post("/link/:provider", isAuthenticated, (req, res, next) => {
  const { provider } = req.params;

  if (!["google", "github", "twitter", "apple", "replit"].includes(provider)) {
    return res.status(400).json({ error: "Invalid provider" });
  }

  if (!isOAuthConfigured(provider)) {
    return res.status(503).json({
      error: "Service Unavailable",
      message: `${provider.charAt(0).toUpperCase() + provider.slice(1)} OAuth is not configured.`,
      requiresConfiguration: true,
    });
  }

  // Store that we're linking, not signing in
  req.session.linkingProvider = provider;
  if (req.user && "id" in req.user) {
    req.session.linkingUserId = req.user.id;
  }

  // Redirect to OAuth flow
  res.json({
    redirectUrl: `/api/v1/auth/${provider}/login`,
  });
});

// Check OAuth configuration status
router.get("/config-status", (req, res) => {
  // Check both configured and actually registered strategies
  const providers = {
    google: isOAuthConfigured("google") && registeredStrategies.has("google"),
    github: isOAuthConfigured("github") && registeredStrategies.has("github"),
    twitter:
      isOAuthConfigured("twitter") && registeredStrategies.has("twitter"),
    apple: isOAuthConfigured("apple") && registeredStrategies.has("apple"),
    replit: isOAuthConfigured("replit") && registeredStrategies.has("replit"),
    email: registeredStrategies.has("email"), // Email is registered if strategy was set up
  };

  res.json({
    providers,
    configured: Object.values(providers).some((v) => v),
    message: Object.values(providers).every((v) => !v)
      ? "No OAuth providers are configured. Please add OAuth credentials to enable authentication."
      : "OAuth is partially configured.",
  });
});

// Fallback for old Replit Auth login route
router.get("/login", (req, res) => {
  res.status(410).json({
    error: "Replit Auth has been replaced with OAuth",
    message:
      "Please use the new OAuth endpoints: /api/v1/auth/[provider]/login",
    availableProviders: [
      "/api/v1/auth/google/login",
      "/api/v1/auth/github/login",
      "/api/v1/auth/twitter/login",
      "/api/v1/auth/apple/login",
      "/api/v1/auth/email/login",
    ],
  });
});

export default router;
