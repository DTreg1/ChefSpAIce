import { Router, Request as ExpressRequest, Response as ExpressResponse } from "express";
import { z } from "zod";
import { storage } from "../storage";
// Use OAuth authentication middleware
import { isAuthenticated, getAuthenticatedUserId } from "../middleware/auth.middleware";
import { validateBody } from "../middleware";
import { asyncHandler } from "../middleware/error.middleware";
import type { StorageLocation } from "@shared/schema";

const router = Router();

// Get authenticated user
router.get("/user", isAuthenticated, asyncHandler(async (req: ExpressRequest<any, any, any, any>, res) => {
  const userId = getAuthenticatedUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const user = await storage.getUser(userId);
  res.json(user);
}));

// Get user preferences  
router.get("/user/preferences", isAuthenticated, asyncHandler(async (req: ExpressRequest<any, any, any, any>, res) => {
  const userId = getAuthenticatedUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const preferences = await storage.getUserPreferences(userId);
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
  asyncHandler(async (req: ExpressRequest<any, any, any, any>, res) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const preferences = await storage.updateUserPreferences(userId, req.body);
    res.json(preferences);
  })
);

// Reset user data
router.post("/user/reset", isAuthenticated, asyncHandler(async (req: ExpressRequest<any, any, any, any>, res) => {
  const userId = getAuthenticatedUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  await storage.resetUserData(userId);
  res.json({ success: true, message: "Account data reset successfully" });
}));

// Health check
router.get("/health", asyncHandler(async (req: ExpressRequest<any, any, any, any>, res) => {
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
    const user = req.user as any;
    health.currentUser = {
      authenticated: true,
      hasAccessToken: !!user?.access_token,
      hasRefreshToken: !!user?.refresh_token,
      tokenExpiry: user?.expires_at
        ? new Date(user.expires_at * 1000).toISOString()
        : null,
      isTokenExpired: user?.expires_at
        ? Math.floor(Date.now() / 1000) > user.expires_at
        : null,
      userId: user?.claims?.sub,
      email: user?.claims?.email,
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
router.get("/diagnostics", isAuthenticated, asyncHandler(async (req: ExpressRequest<any, any, any, any>, res) => {
  const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const user = req.user as any;

  const diagnostics: any = {
    user: {
      id: userId,
      email: user.claims?.email,
      firstName: user.claims?.first_name,
      lastName: user.claims?.last_name,
      profileImageUrl: user.claims?.profile_image_url,
    },
    session: {
      hasAccessToken: !!user.access_token,
      hasRefreshToken: !!user.refresh_token,
      tokenExpiry: user.expires_at
        ? new Date(user.expires_at * 1000).toISOString()
        : null,
      isTokenExpired: user.expires_at
        ? Math.floor(Date.now() / 1000) > user.expires_at
        : null,
      tokenExpiresIn: user.expires_at
        ? Math.max(0, user.expires_at - Math.floor(Date.now() / 1000))
        : null,
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

// Token status
router.get("/token-status", asyncHandler(async (req: ExpressRequest<any, any, any, any>, res) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({
      authenticated: false,
      message: "Not authenticated",
    });
  }

  const user = req.user as any;
  const now = Math.floor(Date.now() / 1000);
  const isExpired = user.expires_at ? now > user.expires_at : false;

  res.json({
    authenticated: true,
    hasAccessToken: !!user.access_token,
    hasRefreshToken: !!user.refresh_token,
    tokenExpiry: user.expires_at
      ? new Date(user.expires_at * 1000).toISOString()
      : null,
    isTokenExpired: isExpired,
    tokenExpiresIn: user.expires_at
      ? Math.max(0, user.expires_at - now)
      : null,
    needsRefresh: isExpired,
    userId: user.claims?.sub,
    email: user.claims?.email,
  });
}));

// Map to track active token refreshes per user
const activeManualRefreshes = new Map<
  string,
  { promise: Promise<any>; timestamp: number }
>();

// Clean up stale refresh promises (older than 30 seconds)
const cleanupStaleManualRefreshes = () => {
  const now = Date.now();
  const staleTimeout = 30000; // 30 seconds

  Array.from(activeManualRefreshes.entries()).forEach(([key, value]) => {
    if (now - value.timestamp > staleTimeout) {
      activeManualRefreshes.delete(key);
    }
  });
};

// Force token refresh
router.post("/force-refresh", asyncHandler(async (req: ExpressRequest<any, any, any, any>, res) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({
      error: "Not authenticated",
      message: "Authentication required",
    });
  }

  const user = req.user as any;

  // Check current token state before refresh
  const preRefreshState = {
    tokenExpiry: user.expires_at
      ? new Date(user.expires_at * 1000).toISOString()
      : null,
    isExpired: user.expires_at
      ? Math.floor(Date.now() / 1000) > user.expires_at
      : null,
  };

  if (!user.refresh_token) {
    return res.status(400).json({
      error: "No refresh token available",
      message: "User session lacks refresh token",
      preRefreshState,
    });
  }

  // Create a unique key for this user's refresh operation
  const userId = getAuthenticatedUserId(req) || "unknown";
  const refreshKey = `${userId}-${user.refresh_token.substring(0, 10)}`;

  // Clean up stale refreshes periodically
  cleanupStaleManualRefreshes();

  // Check if a refresh is already in progress for this user
  const existingRefresh = activeManualRefreshes.get(refreshKey);

  if (existingRefresh) {
    // A refresh is already in progress, wait for it
    console.log(
      `[Auth] Concurrent refresh detected for user ${userId}, waiting for existing refresh...`,
    );

    try {
      await existingRefresh.promise;
      // The existing refresh updated the session, so return current state
      return res.json({
        success: true,
        message: "Token already being refreshed (used existing refresh)",
        preRefreshState,
        postRefreshState: {
          newExpiry: user.expires_at
            ? new Date(user.expires_at * 1000).toISOString()
            : null,
          expiresIn: user.expires_at
            ? user.expires_at - Math.floor(Date.now() / 1000)
            : null,
        },
        wasQueued: true,
      });
    } catch {
      // The existing refresh failed, try our own
      console.log(
        `[Auth] Existing refresh failed for user ${userId}, attempting new refresh`,
      );
    }
  }

  // Start a new refresh operation
  const refreshPromise = (async () => {
    // Perform the actual refresh using the OpenID client
    // This would require importing the actual refresh logic from replitAuth.ts
    // For now, we'll keep the existing pattern and let the main routes handle this
    
    throw new Error("Token refresh logic needs to be imported from replitAuth");
  })();

  // Track this refresh operation
  activeManualRefreshes.set(refreshKey, {
    promise: refreshPromise,
    timestamp: Date.now(),
  });

  try {
    await refreshPromise;
    
    // Clean up the tracking
    activeManualRefreshes.delete(refreshKey);
    
    res.json({
      success: true,
      message: "Token refreshed successfully",
      preRefreshState,
      postRefreshState: {
        newExpiry: user.expires_at
          ? new Date(user.expires_at * 1000).toISOString()
          : null,
        expiresIn: user.expires_at
          ? user.expires_at - Math.floor(Date.now() / 1000)
          : null,
      },
      wasQueued: false,
    });
  } catch (error) {
    // Clean up the tracking
    activeManualRefreshes.delete(refreshKey);
    throw error;
  }
}));

// Get common items for onboarding
router.get("/onboarding/common-items", asyncHandler(async (req, res) => {
  const { getItemsByCategory } = await import("../onboarding-items-expanded");
  const itemsByCategory = getItemsByCategory();

  res.json({
    categories: itemsByCategory,
    totalItems: Object.values(itemsByCategory).reduce(
      (sum, items) => sum + items.length,
      0,
    ),
  });
}));

// Get enriched USDA data for onboarding items
router.get("/onboarding/enriched-item/:itemName", asyncHandler(async (req: ExpressRequest<any, any, any, any>, res) => {
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
  asyncHandler(async (req: ExpressRequest<any, any, any, any>, res) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const { preferences, customStorageAreas, selectedCommonItems  } = req.body || {};

    const failedItems: string[] = [];
    let successCount = 0;
    const createdStorageLocations: StorageLocation[] = [];

    // Step 1: Save user preferences
    const savedPreferences = await storage.updateUserPreferences(userId, {
      ...preferences,
      hasCompletedOnboarding: true,
    });

    // Step 2: Create custom storage locations
    for (const customArea of customStorageAreas || []) {
      try {
        const location = await storage.createStorageLocation(userId, {
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
    const allLocations = await storage.getStorageLocations(userId);
    const locationMap = new Map(
      allLocations.map((loc: any) => [loc.name, loc.id]),
    );

    // Step 4: Import common items and get enriched data
    const { getItemsByCategory } = await import("../onboarding-items-expanded");
    const { normalizeCategory } = await import("../category-mapping");
    const itemsByCategory = getItemsByCategory();

    // Flatten all items to create a lookup map
    const allItemsMap = new Map<string, any>();
    Object.values(itemsByCategory).forEach((items) => {
      items.forEach((item) => {
        allItemsMap.set(item.displayName, item);
      });
    });

    // Step 5: Create selected common food items from pre-populated database
    const commonItems = await storage.getOnboardingInventoryByNames(
      selectedCommonItems || [],
    );
    const commonItemsMap = new Map(
      commonItems.map((item: any) => [item.displayName, item]),
    );

    for (const itemName of selectedCommonItems || []) {
      try {
        // Get pre-populated data from database (instant lookup, no API calls!)
        const commonItem = commonItemsMap.get(itemName);

        if (commonItem) {
          const storageLocationId = locationMap.get(commonItem.storage);
          if (!storageLocationId) {
            console.error(
              `No storage location found for ${commonItem.storage}`,
            );
            failedItems.push(itemName);
            continue;
          }

          const expirationDate = new Date();
          expirationDate.setDate(
            expirationDate.getDate() + commonItem.expirationDays,
          );

          // Create the food item with pre-populated USDA data
          await storage.createFoodItem(userId, {
            name: commonItem.displayName,
            quantity: commonItem.quantity,
            unit: commonItem.unit,
            storageLocationId,
            expirationDate: expirationDate.toISOString(),
            nutrition: commonItem.nutrition || null,
            usdaData: commonItem.usdaData || null,
            foodCategory: commonItem.foodCategory,
          });
          successCount++;
        } else {
          // Fall back to basic data from the items map (shouldn't happen if DB is seeded)
          const itemData = allItemsMap.get(itemName);
          if (!itemData) {
            console.error(
              `No data found for ${itemName} in commonFoodItems or local map`,
            );
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

          // Normalize the category from our predefined list
          const foodCategory = normalizeCategory(itemData.category);

          await storage.createFoodItem(userId, {
            name: itemData.displayName,
            quantity: itemData.quantity,
            unit: itemData.unit,
            storageLocationId,
            expirationDate: expirationDate.toISOString(),
            foodCategory,
          });
          successCount++;
        }
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