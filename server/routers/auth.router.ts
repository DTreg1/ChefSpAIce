import { Router, Request, Response } from "express";
import { z } from "zod";
import { userAuthStorage, inventoryStorage } from "../storage/index";
// Use OAuth authentication middleware
import { isAuthenticated, getAuthenticatedUserId } from "../middleware/auth.middleware";
import { validateBody } from "../middleware";
import { asyncHandler } from "../middleware/error.middleware";
import type { StorageLocation } from "@shared/schema";

const router = Router();

// Get authenticated user
router.get("/user", isAuthenticated, asyncHandler(async (req: Request, res) => {
  const userId = getAuthenticatedUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const user = await userAuthStorage.getUserById(userId);
  res.json(user);
}));

// Get user preferences  
router.get("/user/preferences", isAuthenticated, asyncHandler(async (req: Request, res) => {
  const userId = getAuthenticatedUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const preferences = await userAuthStorage.getUserPreferences(userId);
  res.json(preferences);
}));

// Update user preferences
const userPreferencesUpdateSchema = z.object({
  dietaryRestrictions: z.array(z.string()).optional(),
  allergens: z.array(z.string()).optional(),
  favoriteCategories: z.array(z.string()).optional(),
  expirationAlertDays: z.number().int().min(1).max(30).optional(),
  storageAreasEnabled: z.array(z.string()).optional(),
  householdSize: z.number().int().min(1).max(50).optional(),
  cookingSkillLevel: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  preferredUnits: z.enum(["metric", "imperial"]).optional(),
  foodsToAvoid: z.array(z.string()).optional(),
  hasCompletedOnboarding: z.boolean().optional(),
  // Notification preferences
  notificationsEnabled: z.boolean().optional(),
  notifyExpiringFood: z.boolean().optional(),
  notifyRecipeSuggestions: z.boolean().optional(),
  notifyMealReminders: z.boolean().optional(),
  notificationTime: z.string().optional(),
});

router.put(
  "/user/preferences",
  isAuthenticated,
  validateBody(userPreferencesUpdateSchema),
  asyncHandler(async (req: Request, res) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const preferences = await userAuthStorage.updateUserPreferences(userId, req.body);
    res.json(preferences);
  })
);

// Reset user data
router.post("/user/reset", isAuthenticated, asyncHandler(async (req: Request, res) => {
  const userId = getAuthenticatedUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  // TODO: Implement resetUserData if needed
  res.json({ success: true, message: "Account data reset not implemented" });
}));

// Health check
router.get("/health", asyncHandler(async (req: Request, res) => {
  const health: any = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    environment: {
      hasSessionSecret: !!process.env.SESSION_SECRET,
      hasReplitDomains: !!process.env.REPLIT_DOMAINS,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      hasOAuthConfigured: !!process.env.GOOGLE_CLIENT_ID || !!process.env.GITHUB_CLIENT_ID || !!process.env.TWITTER_CONSUMER_KEY || !!process.env.APPLE_CLIENT_ID,
      replId: !!process.env.REPL_ID,
    },
  };

  // Check session store
  try {
    const { db } = await import("../db");
    const { sql } = await import("drizzle-orm");

    const result = await db.execute<{
      total_sessions: string;
      active_sessions: string;
    }>(
      sql`SELECT COUNT(*) as total_sessions,
                 COUNT(CASE WHEN expire > NOW() THEN 1 END) as active_sessions
          FROM sessions`,
    );
    health.sessions = {
      total: parseInt(result.rows[0].total_sessions),
      active: parseInt(result.rows[0].active_sessions),
    };
  } catch {
    health.sessions = { error: "Failed to query sessions" };
    health.status = "degraded";
  }

  // Check authenticated user (if any)
  if (req.isAuthenticated && req.isAuthenticated()) {
    const user = req.user;
    health.currentUser = {
      authenticated: true,
      userId: user?.id,
      email: user?.email,
      provider: user?.provider,
      providerId: user?.providerId,
    };
  } else {
    health.currentUser = { authenticated: false };
  }

  // Check registered domains
  const domainsArray =
    process.env.REPLIT_DOMAINS?.split(",")
      .map((d) => d.trim())
      .filter((d) => d) || [];
  health.oauth = {
    currentDomain: req.hostname,
    registeredDomains: domainsArray,
    callbackUrl: `https://${req.hostname}/api/callback`,
  };

  res.json(health);
}));

// Session diagnostics
router.get("/diagnostics", isAuthenticated, asyncHandler(async (req: Request, res) => {
  const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const user = req.user;

  const diagnostics: any = {
    user: {
      id: userId,
      email: user?.email,
      firstName: user?.firstName,
      lastName: user?.lastName,
      profileImageUrl: user?.profileImageUrl,
      provider: user?.provider,
      providerId: user?.providerId,
    },
    session: {
      isAuthenticated: true,
      sessionId: req.sessionID,
      sessionData: {
        cookie: {
          expires: req.session?.cookie?.expires,
          maxAge: req.session?.cookie?.maxAge,
          httpOnly: req.session?.cookie?.httpOnly,
          secure: req.session?.cookie?.secure,
        },
      },
    },
  };

  // Get session from database
  if (req.sessionID) {
    try {
      const { db } = await import("../db");
      const { sql } = await import("drizzle-orm");

      const dbSession = await db.execute<{
        sid: string;
        expire: string;
        sess: any;
      }>(
        sql`SELECT sid, expire, sess FROM sessions WHERE sid = ${req.sessionID}`,
      );
      if (dbSession.rows.length > 0) {
        diagnostics.sessionDatabase = {
          expires: dbSession.rows[0].expire,
          hasPassportData: !!dbSession.rows[0].sess?.passport,
          hasUserData: !!dbSession.rows[0].sess?.passport?.user,
        };
      }
    } catch {
      diagnostics.sessionDatabase = { error: "Failed to query session" };
    }
  }

  res.json(diagnostics);
}));

// Session status endpoint
router.get("/session-status", asyncHandler(async (req: Request, res) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({
      authenticated: false,
      message: "Not authenticated",
    });
  }

  const user = req.user;

  res.json({
    authenticated: true,
    userId: user?.id,
    email: user?.email,
    provider: user?.provider,
    providerId: user?.providerId,
    sessionId: req.sessionID,
  });
}));

// OAuth sessions are managed by Passport.js and don't need manual refresh
// The session middleware handles session lifetime and renewal automatically

// Get common items for onboarding
router.get("/onboarding/common-items", asyncHandler(async (req, res) => {
  const { onboardingUsdaMapping } = await import("../onboarding-usda-mapping");
  
  // Group items by category for organized display
  const itemsByCategory: Record<string, any[]> = {};
  
  Object.entries(onboardingUsdaMapping).forEach(([key, item]) => {
    const category = item.foodCategory || "Other";
    if (!itemsByCategory[category]) {
      itemsByCategory[category] = [];
    }
    itemsByCategory[category].push({
      ...item,
      name: key, // Original key as fallback
    });
  });

  res.json({
    categories: itemsByCategory,
    totalItems: Object.keys(onboardingUsdaMapping).length,
  });
}));

// Get enriched USDA data for onboarding items
router.get("/onboarding/enriched-item/:itemName", asyncHandler(async (req: Request, res) => {
  const { itemName } = req.params;
  const { getEnrichedOnboardingItem } = await import("../usda");
  const enrichedItem = await getEnrichedOnboardingItem(
    decodeURIComponent(itemName),
  );

  if (!enrichedItem) {
    return res
      .status(404)
      .json({ error: "Item not found in onboarding list" });
  }

  res.json(enrichedItem);
}));

// Complete onboarding
const onboardingCompleteSchema = z.object({
  preferences: z.object({
    dietaryRestrictions: z.array(z.string()).optional(),
    allergens: z.array(z.string()).optional(),
    favoriteCategories: z.array(z.string()).optional(),
    expirationAlertDays: z.number().int().min(1).max(30).optional(),
    storageAreasEnabled: z.array(z.string()).optional(),
    householdSize: z.number().int().min(1).max(50).optional(),
    cookingSkillLevel: z.enum(["beginner", "intermediate", "advanced"]).optional(),
    preferredUnits: z.enum(["metric", "imperial"]).optional(),
    foodsToAvoid: z.array(z.string()).optional(),
  }),
  customStorageAreas: z.array(z.string()).optional(),
  selectedCommonItems: z.array(z.string()).optional(),
});

router.post(
  "/onboarding/complete",
  isAuthenticated,
  validateBody(onboardingCompleteSchema),
  asyncHandler(async (req: Request, res) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const { preferences, customStorageAreas, selectedCommonItems  } = req.body || {};

    const failedItems: string[] = [];
    let successCount = 0;
    const createdStorageLocations: StorageLocation[] = [];

    // Step 1: Save user preferences
    const savedPreferences = await userAuthStorage.updateUserPreferences(userId, {
      ...preferences,
      hasCompletedOnboarding: true,
    });

    // Step 2: Create custom storage locations
    for (const customArea of customStorageAreas || []) {
      try {
        const location = await inventoryStorage.createStorageLocation(userId, {
          name: customArea,
          icon: "package",
        });
        createdStorageLocations.push(location);
      } catch (error) {
        console.error(
          `Failed to create storage location ${customArea}:`,
          error,
        );
      }
    }

    // Step 3: Get all storage locations to map names to IDs
    const allLocations = await inventoryStorage.getStorageLocations(userId);
    const locationMap = new Map(
      allLocations.map((loc: any) => [loc.name, loc.id]),
    );

    // Step 4: Import common items from hardcoded list
    const { onboardingUsdaMapping } = await import("../onboarding-usda-mapping");

    // Step 5: Create selected common food items directly from hardcoded list
    for (const itemName of selectedCommonItems || []) {
      try {
        // Get item data from hardcoded mapping
        const itemData = onboardingUsdaMapping[itemName];
        
        if (!itemData) {
          console.error(`No data found for ${itemName} in onboarding mapping`);
          failedItems.push(itemName);
          continue;
        }

        const storageLocationId = locationMap.get(itemData.storage);
        if (!storageLocationId) {
          console.error(
            `No storage location found for ${itemData.storage}`,
          );
          failedItems.push(itemName);
          continue;
        }

        const expirationDate = new Date();
        expirationDate.setDate(
          expirationDate.getDate() + itemData.expirationDays,
        );

        // Create the food item with data from hardcoded mapping
        await inventoryStorage.createFoodItem(userId, {
          name: itemData.displayName,
          quantity: itemData.quantity,
          unit: itemData.unit,
          storageLocationId,
          expirationDate: expirationDate.toISOString(),
          nutrition: itemData.nutrition || null,
          fdcId: itemData.fdcId || null,
          foodCategory: itemData.foodCategory || null,
        });
        successCount++;
      } catch (error) {
        console.error(`Failed to create food item ${itemName}:`, error);
        failedItems.push(itemName);
      }
    }

    res.json({
      success: true,
      preferences: savedPreferences,
      createdStorageLocations: createdStorageLocations.length,
      foodItemsCreated: successCount,
      failedItems,
    });
  })
);

export default router;