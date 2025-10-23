// Referenced from blueprint:javascript_log_in_with_replit - Added authentication and user-scoped routes
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { openai } from "./openai";
import Stripe from "stripe";
import axios from "axios";
import { searchUSDAFoods, getFoodByFdcId, isNutritionDataValid } from "./usda";
import type { USDAFoodItem } from "@shared/schema";
import {
  searchBarcodeLookup,
  getBarcodeLookupProduct,
  getBarcodeLookupBatch,
  extractImageUrl,
  getBarcodeLookupRateLimits,
  checkRateLimitBeforeCall,
} from "./barcodelookup";
import {
  getOpenFoodFactsProduct,
  getOpenFoodFactsBatch,
  extractProductInfo,
} from "./openfoodfacts";
import { getEnrichedOnboardingItem } from "./onboarding-usda";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { ApiError } from "./apiError";
import { batchedApiLogger } from "./batchedApiLogger";
import { cleanupOldMessagesForUser } from "./chatCleanup";
import { createSeedEndpoint } from "./seed-cooking-terms-endpoint";
import { z } from "zod";
import {
  insertFoodItemSchema,
  insertChatMessageSchema,
  insertRecipeSchema,
  insertApplianceSchema,
  insertMealPlanSchema,
  insertFeedbackSchema,
  insertWebVitalSchema,
  type BarcodeProduct,
  type StorageLocation,
  type InsertStorageLocation,
} from "@shared/schema";

// Define inline schema for storage locations validation
const insertStorageLocationSchema = z.object({
  name: z.string(),
  icon: z.string(),
});

// Constants for API endpoints
const OPEN_FOOD_FACTS_API_BASE = "https://world.openfoodfacts.org/api/v2";

// Helper functions for appliance barcode processing
function extractApplianceCapabilities(product: any): string[] {
  const capabilities: string[] = [];
  const text =
    `${product.title || ""} ${product.productAttributes?.description || product.description || ""}`.toLowerCase();

  const capabilityKeywords = {
    grill: ["grill", "grilling"],
    bake: ["bake", "baking", "oven"],
    air_fry: ["air fry", "air fryer", "air crisp", "air-fry"],
    dehydrate: ["dehydrate", "dehydrator"],
    broil: ["broil", "broiling"],
    toast: ["toast", "toaster"],
    roast: ["roast", "roasting"],
    steam: ["steam", "steamer"],
    pressure_cook: ["pressure cook", "pressure cooker", "instant pot"],
    slow_cook: ["slow cook", "slow cooker", "crock pot"],
    blend: ["blend", "blender", "mix"],
    food_process: ["food process", "processor", "chop", "dice"],
    warm: ["warm", "warmer", "keep warm"],
    reheat: ["reheat", "microwave"],
    sauté: ["sauté", "saute", "pan fry"],
  };

  for (const [capability, keywords] of Object.entries(capabilityKeywords)) {
    if (keywords.some((keyword) => text.includes(keyword))) {
      capabilities.push(capability);
    }
  }

  return capabilities;
}

function extractApplianceCapacity(product: any): {
  capacity?: string;
  servingSize?: string;
} {
  const text = `${product.title || ""} ${product.productAttributes?.description || product.description || ""}`;

  // Look for capacity patterns (e.g., "4-qt", "6 quart", "5L")
  const capacityMatch = text.match(
    /(\d+(?:\.\d+)?)\s*[-\s]?(qt|quart|l|liter|litre|gal|gallon|oz|cup)/i,
  );

  // Look for serving patterns (e.g., "serves 4", "4 servings", "up to 6 people")
  const servingMatch = text.match(
    /(?:serves?|serving[s]?|up to)\s+(\d+)\s*(?:people|person|servings?)?/i,
  );

  return {
    capacity: capacityMatch ? capacityMatch[0] : undefined,
    servingSize: servingMatch ? `up to ${servingMatch[1]} servings` : undefined,
  };
}

function determineApplianceType(barcodeProduct: BarcodeProduct): string {
  const title = (barcodeProduct.title || "").toLowerCase();
  const category = (barcodeProduct.category || "").toLowerCase();
  const description = (
    barcodeProduct.productAttributes?.description || ""
  ).toLowerCase();
  const combined = `${title} ${category} ${description}`;

  // Check for specific appliance types
  if (combined.includes("bake") || combined.includes("oven")) return "baking";
  if (combined.includes("grill") || combined.includes("bbq")) return "cooking";
  if (combined.includes("fryer") || combined.includes("fry")) return "cooking";
  if (combined.includes("pressure") || combined.includes("instant pot"))
    return "cooking";
  if (combined.includes("slow cook") || combined.includes("crock"))
    return "cooking";
  if (combined.includes("microwave")) return "cooking";
  if (
    combined.includes("blender") ||
    combined.includes("mixer") ||
    combined.includes("processor")
  )
    return "prep";
  if (
    combined.includes("whisk") ||
    combined.includes("masher") ||
    combined.includes("slicer")
  )
    return "prep";
  if (
    combined.includes("pan") ||
    combined.includes("pot") ||
    combined.includes("skillet")
  )
    return "bakeware";
  if (
    combined.includes("sheet") ||
    combined.includes("tin") ||
    combined.includes("mold")
  )
    return "bakeware";

  // Default based on capabilities if available
  const capabilities = barcodeProduct.productAttributes?.capabilities;
  if (capabilities?.length) {
    if (
      capabilities.some((c) =>
        ["grill", "bake", "air_fry", "broil"].includes(c),
      )
    ) {
      return "cooking";
    }
    if (
      capabilities.some((c) => ["blend", "food_process", "chop"].includes(c))
    ) {
      return "prep";
    }
  }

  return "cooking"; // default
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware (from blueprint:javascript_log_in_with_replit)
  await setupAuth(app);

  // Auth routes (from blueprint:javascript_log_in_with_replit)
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  // User Preferences
  app.get("/api/user/preferences", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const preferences = await storage.getUserPreferences(userId);
      res.json(preferences);
    } catch (error) {
      console.error("Error fetching preferences:", error);
      res.status(500).json({ error: "Failed to fetch preferences" });
    }
  });

  app.put("/api/user/preferences", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      // Validate the preference updates using Zod
      const userPreferencesUpdateSchema = z.object({
        dietaryRestrictions: z.array(z.string()).optional(),
        allergens: z.array(z.string()).optional(),
        favoriteCategories: z.array(z.string()).optional(),
        expirationAlertDays: z.number().int().min(1).max(30).optional(),
        storageAreasEnabled: z.array(z.string()).optional(),
        householdSize: z.number().int().min(1).max(50).optional(),
        cookingSkillLevel: z
          .enum(["beginner", "intermediate", "advanced"])
          .optional(),
        preferredUnits: z.enum(["metric", "imperial"]).optional(),
        foodsToAvoid: z.array(z.string()).optional(),
        hasCompletedOnboarding: z.boolean().optional(),
      });

      const validatedData = userPreferencesUpdateSchema.parse(req.body);
      const preferences = await storage.updateUserPreferences(
        userId,
        validatedData,
      );
      res.json(preferences);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res
          .status(400)
          .json({ error: "Invalid preferences data", details: error.errors });
      } else {
        console.error("Error updating preferences:", error);
        res.status(500).json({ error: "Failed to update preferences" });
      }
    }
  });

  app.post("/api/user/reset", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.resetUserData(userId);
      res.json({ success: true, message: "Account data reset successfully" });
    } catch (error) {
      console.error("Error resetting user data:", error);
      res.status(500).json({ error: "Failed to reset account data" });
    }
  });

  // Auth Health Check Endpoint
  app.get("/api/auth/health", async (req: any, res) => {
    try {
      const health: any = {
        status: "healthy",
        timestamp: new Date().toISOString(),
        environment: {
          hasSessionSecret: !!process.env.SESSION_SECRET,
          hasReplitDomains: !!process.env.REPLIT_DOMAINS,
          hasDatabaseUrl: !!process.env.DATABASE_URL,
          hasIssuerUrl: !!process.env.ISSUER_URL,
          defaultIssuerUrl: process.env.ISSUER_URL || "https://replit.com/oidc",
          replId: !!process.env.REPL_ID,
        },
      };

      // Check session store
      try {
        // Import db and sql for raw queries
        const { db } = await import("./db");
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
      } catch (error) {
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
    } catch (error) {
      console.error("Health check error:", error);
      res.status(500).json({
        status: "error",
        message: "Health check failed",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Auth Session Diagnostics (Protected)
  app.get("/api/auth/diagnostics", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
          const { db } = await import("./db");
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
        } catch (error) {
          diagnostics.sessionDatabase = { error: "Failed to query session" };
        }
      }

      res.json(diagnostics);
    } catch (error) {
      console.error("Diagnostics error:", error);
      res.status(500).json({
        error: "Failed to generate diagnostics",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Token Refresh Test (Protected) - for testing refresh mechanism
  // This endpoint checks if token needs refresh WITHOUT auto-refreshing
  app.get("/api/auth/token-status", async (req: any, res) => {
    try {
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
    } catch (error) {
      console.error("Token status error:", error);
      res.status(500).json({
        error: "Failed to check token status",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Map to track active token refreshes per user (shared with replitAuth.ts)
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

  // Force Token Refresh (Protected) - manually trigger refresh with concurrent protection
  app.post("/api/auth/force-refresh", async (req: any, res) => {
    try {
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
      const userId = user.claims?.sub || "unknown";
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
        } catch (error) {
          // The existing refresh failed, try our own
          console.log(
            `[Auth] Existing refresh failed for user ${userId}, attempting new refresh`,
          );
        }
      }

      // Start a new refresh operation
      const refreshPromise = (async () => {
        // Import necessary functions from replitAuth
        const { discovery } = await import("openid-client");
        const config = await discovery(
          new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
          process.env.REPL_ID!,
        );

        const { refreshTokenGrant } = await import("openid-client");
        const tokenResponse = await refreshTokenGrant(
          config,
          user.refresh_token,
        );

        // Update session with new tokens
        const oldExpiry = user.expires_at;
        user.claims = tokenResponse.claims();
        user.access_token = tokenResponse.access_token;
        user.refresh_token = tokenResponse.refresh_token;
        user.expires_at = user.claims?.exp;

        return {
          oldExpiry,
          newExpiry: user.expires_at,
        };
      })();

      // Store the promise so concurrent requests can wait for it
      activeManualRefreshes.set(refreshKey, {
        promise: refreshPromise,
        timestamp: Date.now(),
      });

      // Clean up after completion
      refreshPromise
        .then(() => {
          activeManualRefreshes.delete(refreshKey);
        })
        .catch(() => {
          // Keep failed refreshes briefly to prevent retry storms
          setTimeout(() => {
            activeManualRefreshes.delete(refreshKey);
          }, 5000);
        });

      try {
        const result = await refreshPromise;

        res.json({
          success: true,
          message: "Token refreshed successfully",
          preRefreshState,
          postRefreshState: {
            oldExpiry: result.oldExpiry
              ? new Date(result.oldExpiry * 1000).toISOString()
              : null,
            newExpiry: result.newExpiry
              ? new Date(result.newExpiry * 1000).toISOString()
              : null,
            expiresIn: result.newExpiry
              ? result.newExpiry - Math.floor(Date.now() / 1000)
              : null,
          },
          wasQueued: false,
        });
      } catch (refreshError: any) {
        const errorMessage =
          refreshError?.cause?.error || refreshError?.error || "Unknown error";
        console.error("Token refresh failed:", refreshError);

        res.status(400).json({
          error: "Token refresh failed",
          message: errorMessage,
          requiresReauth: errorMessage === "invalid_grant",
          preRefreshState,
        });
      }
    } catch (error) {
      console.error("Force refresh error:", error);
      res.status(500).json({
        error: "Failed to refresh token",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Onboarding - get common items grouped by category
  app.get("/api/onboarding/common-items", async (req, res) => {
    try {
      const { getItemsByCategory } = await import(
        "./onboarding-items-expanded"
      );
      const itemsByCategory = getItemsByCategory();

      res.json({
        categories: itemsByCategory,
        totalItems: Object.values(itemsByCategory).reduce(
          (sum, items) => sum + items.length,
          0,
        ),
      });
    } catch (error) {
      console.error("Error fetching onboarding items:", error);
      res.status(500).json({ error: "Failed to fetch onboarding items" });
    }
  });

  // Storage Locations (user-scoped)
  app.get("/api/storage-locations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const locations = await storage.getStorageLocations(userId);
      res.json(locations);
    } catch (error) {
      console.error("Error fetching storage locations:", error);
      res.status(500).json({ error: "Failed to fetch storage locations" });
    }
  });

  app.post("/api/storage-locations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validated = insertStorageLocationSchema.parse(req.body);
      const location = await storage.createStorageLocation(userId, validated);
      res.json(location);
    } catch (error) {
      console.error("Error creating storage location:", error);
      res.status(400).json({ error: "Invalid storage location data" });
    }
  });

  // Food Items (user-scoped)
  app.get("/api/food-items", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { storageLocationId } = req.query;
      const items = await storage.getFoodItems(
        userId,
        storageLocationId as string | undefined,
      );
      res.json(items);
    } catch (error) {
      console.error("Error fetching food items:", error);
      res.status(500).json({ error: "Failed to fetch food items" });
    }
  });

  app.post("/api/food-items", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { normalizeCategory } = await import("./category-mapping");
      const validated = insertFoodItemSchema.parse(req.body);

      let nutrition = validated.nutrition;
      let usdaData = validated.usdaData;
      let fcdId = validated.fcdId;

      // Always validate nutrition if provided
      let needsFreshNutrition = !nutrition;

      if (nutrition) {
        try {
          const parsedNutrition = JSON.parse(nutrition);
          if (!isNutritionDataValid(parsedNutrition, validated.name)) {
            console.log(`Invalid nutrition detected for "${validated.name}"`);
            needsFreshNutrition = true;
            nutrition = null;
            usdaData = null;
          }
        } catch (e) {
          console.error("Error parsing/validating nutrition:", e);
          needsFreshNutrition = true;
          nutrition = null;
          usdaData = null;
        }
      }

      // If we need nutrition data, try to fetch it
      if (needsFreshNutrition) {
        // First try with FDC ID if available
        if (fcdId) {
          console.log(
            `Fetching full USDA details for FDC ID ${fcdId} during item creation`,
          );
          const foodDetails = await getFoodByFdcId(parseInt(fcdId));
          if (foodDetails && foodDetails.nutrition) {
            console.log(`Found valid nutrition data for FDC ID ${fcdId}`);
            nutrition = JSON.stringify(foodDetails.nutrition);
            usdaData = JSON.stringify(foodDetails);
          }
        }

        // If still no nutrition, search by name
        if (!nutrition) {
          console.log(
            `Searching USDA for "${validated.name}" to get nutrition data`,
          );
          const searchResults = await searchUSDAFoods(validated.name);

          if (searchResults.foods && searchResults.foods.length > 0) {
            // Try multiple search results until we find one with valid nutrition
            for (const searchResult of searchResults.foods.slice(0, 5)) {
              try {
                console.log(
                  `Trying FDC ID: ${searchResult.fdcId} for "${validated.name}"`,
                );

                // Fetch full details for this search result
                const foodDetails = await getFoodByFdcId(searchResult.fdcId);

                if (foodDetails && foodDetails.nutrition) {
                  console.log(
                    `Found valid nutrition data using FDC ID: ${searchResult.fdcId} for "${validated.name}"`,
                  );
                  nutrition = JSON.stringify(foodDetails.nutrition);
                  usdaData = JSON.stringify(foodDetails);
                  fcdId = foodDetails.fdcId.toString();
                  break; // Found valid nutrition, stop searching
                } else {
                  console.log(
                    `Skipping FDC ID: ${searchResult.fdcId} - nutrition data invalid or missing`,
                  );
                }
              } catch (err) {
                console.error(
                  `Error fetching details for FDC ID ${searchResult.fdcId}:`,
                  err,
                );
                // Continue to next result
              }
            }
          }
        }

        // If still no nutrition after searching, log warning
        if (!nutrition) {
          console.warn(
            `Could not find nutrition data for "${validated.name}" - storing without nutrition`,
          );
        }
      }

      // Calculate weightInGrams from quantity and USDA serving size
      let weightInGrams: number | null = null;
      if (nutrition) {
        try {
          const nutritionData = JSON.parse(nutrition);
          const quantity = parseFloat(validated.quantity) || 1;
          const servingSize = parseFloat(nutritionData.servingSize) || 100;
          weightInGrams = quantity * servingSize;
        } catch (e) {
          console.error("Error calculating weight:", e);
        }
      }

      // Normalize the foodCategory if it exists
      const foodCategory = validated.foodCategory
        ? normalizeCategory(validated.foodCategory)
        : normalizeCategory(null);

      const item = await storage.createFoodItem(userId, {
        ...validated,
        fcdId,
        foodCategory,
        nutrition,
        usdaData,
        weightInGrams,
      });
      res.json(item);
    } catch (error) {
      console.error("Error creating food item:", error);
      res.status(400).json({ error: "Invalid food item data" });
    }
  });

  app.put("/api/food-items/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const { normalizeCategory } = await import("./category-mapping");
      const updateSchema = insertFoodItemSchema.partial().required({
        quantity: true,
        unit: true,
        storageLocationId: true,
        expirationDate: true,
      });
      const validated = updateSchema.parse(req.body);

      // Get the current item to preserve nutrition if not in update
      const items = await storage.getFoodItems(userId);
      const currentItem = items.find((i) => i.id === id);

      if (!currentItem) {
        return res.status(404).json({ error: "Food item not found" });
      }

      // Normalize the foodCategory if it's being updated
      let updateData: any = { ...validated };
      if (validated.foodCategory !== undefined) {
        updateData.foodCategory = normalizeCategory(validated.foodCategory);
      }

      // Use existing nutrition if not provided in update
      let nutrition = validated.nutrition || currentItem.nutrition;
      let usdaData = validated.usdaData || currentItem.usdaData;
      let fcdId = validated.fcdId || currentItem.fcdId;

      // If still no nutrition, try to fetch it
      if (!nutrition) {
        console.log(
          `No nutrition data for "${currentItem.name}" during update, fetching from USDA`,
        );
        const searchResults = await searchUSDAFoods(currentItem.name);

        if (searchResults.foods && searchResults.foods.length > 0) {
          for (const searchResult of searchResults.foods.slice(0, 5)) {
            try {
              const foodDetails = await getFoodByFdcId(searchResult.fdcId);

              if (foodDetails && foodDetails.nutrition) {
                console.log(
                  `Found nutrition data for "${currentItem.name}" using FDC ID: ${searchResult.fdcId}`,
                );
                nutrition = JSON.stringify(foodDetails.nutrition);
                usdaData = JSON.stringify(foodDetails);
                fcdId = foodDetails.fdcId.toString();
                updateData.nutrition = nutrition;
                updateData.usdaData = usdaData;
                updateData.fcdId = fcdId;
                break;
              }
            } catch (err) {
              console.error(
                `Error fetching details for FDC ID ${searchResult.fdcId}:`,
                err,
              );
            }
          }
        }
      }

      // Recalculate weightInGrams if quantity or nutrition changes
      let weightInGrams: number | null | undefined = undefined;
      if (validated.quantity && nutrition) {
        try {
          const nutritionData = JSON.parse(nutrition);
          const quantity = parseFloat(validated.quantity) || 1;
          const servingSize = parseFloat(nutritionData.servingSize) || 100;
          weightInGrams = quantity * servingSize;
        } catch (e) {
          console.error("Error calculating weight:", e);
        }
      }

      if (weightInGrams !== undefined) {
        updateData.weightInGrams = weightInGrams;
      }

      const item = await storage.updateFoodItem(userId, id, updateData);
      res.json(item);
    } catch (error) {
      console.error("Error updating food item:", error);
      res.status(400).json({ error: "Failed to update food item" });
    }
  });

  app.delete("/api/food-items/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      await storage.deleteFoodItem(userId, id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting food item:", error);
      res.status(500).json({ error: "Failed to delete food item" });
    }
  });

  app.post(
    "/api/food-items/:id/refresh-nutrition",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const { id } = req.params;

        // Get the current food item
        const items = await storage.getFoodItems(userId);
        const item = items.find((i) => i.id === id);

        if (!item) {
          return res.status(404).json({ error: "Food item not found" });
        }

        let usdaData = null;
        let nutrition = null;

        // Try to fetch fresh USDA data
        if (item.fcdId) {
          // If we have an FDC ID, try to fetch by ID first
          console.log(
            `Refreshing nutrition for "${item.name}" using FDC ID: ${item.fcdId}`,
          );
          usdaData = await getFoodByFdcId(parseInt(item.fcdId));

          if (usdaData && usdaData.nutrition) {
            nutrition = JSON.stringify(usdaData.nutrition);
          }
        }

        // If no FDC ID or fetch failed, try searching by name
        if (!nutrition) {
          console.log(
            `Searching USDA for "${item.name}" to refresh nutrition data`,
          );
          const searchResults = await searchUSDAFoods(item.name);

          if (searchResults.foods && searchResults.foods.length > 0) {
            // Try multiple search results until we find one with valid nutrition
            for (const searchResult of searchResults.foods) {
              try {
                console.log(
                  `Trying FDC ID: ${searchResult.fdcId} for "${item.name}"`,
                );

                // Fetch full details for this search result
                const foodDetails = await getFoodByFdcId(searchResult.fdcId);

                if (foodDetails && foodDetails.nutrition) {
                  console.log(
                    `Found valid nutrition data using FDC ID: ${searchResult.fdcId} for "${item.name}"`,
                  );
                  usdaData = foodDetails;
                  nutrition = JSON.stringify(foodDetails.nutrition);

                  // Update FDC ID if we found a better match
                  if (foodDetails.fdcId) {
                    await storage.updateFoodItem(userId, id, {
                      fcdId: foodDetails.fdcId.toString(),
                    });
                  }
                  break; // Found valid nutrition, stop searching
                } else {
                  console.log(
                    `Skipping FDC ID: ${searchResult.fdcId} - nutrition data invalid or missing`,
                  );
                }
              } catch (err) {
                console.error(
                  `Error fetching details for FDC ID ${searchResult.fdcId}:`,
                  err,
                );
                // Continue to next result
              }
            }
          }
        }

        if (nutrition) {
          // Recalculate weight based on new nutrition data
          let weightInGrams: number | null = null;
          try {
            const nutritionData = JSON.parse(nutrition);
            const quantity = parseFloat(item.quantity) || 1;
            const servingSize = parseFloat(nutritionData.servingSize) || 100;
            weightInGrams = quantity * servingSize;
          } catch (e) {
            console.error("Error calculating weight:", e);
          }

          // Update the item with new nutrition data
          const updatedItem = await storage.updateFoodItem(userId, id, {
            nutrition,
            weightInGrams: weightInGrams || undefined,
            usdaData: usdaData ? JSON.stringify(usdaData) : undefined,
          });

          res.json({ success: true, item: updatedItem });
        } else {
          res
            .status(404)
            .json({ error: "No nutrition data found for this item" });
        }
      } catch (error) {
        console.error("Error refreshing nutrition data:", error);
        res.status(500).json({ error: "Failed to refresh nutrition data" });
      }
    },
  );

  app.get("/api/food-categories", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const categories = await storage.getFoodCategories(userId);
      res.json(categories);
    } catch (error) {
      console.error("Error fetching food categories:", error);
      res.status(500).json({ error: "Failed to fetch food categories" });
    }
  });

  // Appliances (user-scoped)
  app.get("/api/appliances", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const appliances = await storage.getAppliances(userId);
      res.json(appliances);
    } catch (error) {
      console.error("Error fetching appliances:", error);
      res.status(500).json({ error: "Failed to fetch appliances" });
    }
  });

  app.post("/api/appliances", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validated = insertApplianceSchema.parse(req.body);
      const appliance = await storage.createAppliance(userId, validated);
      res.json(appliance);
    } catch (error) {
      console.error("Error creating appliance:", error);
      res.status(400).json({ error: "Invalid appliance data" });
    }
  });

  app.get("/api/appliances/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const appliance = await storage.getAppliance(userId, id);
      if (!appliance) {
        return res.status(404).json({ error: "Appliance not found" });
      }
      res.json(appliance);
    } catch (error) {
      console.error("Error fetching appliance:", error);
      res.status(500).json({ error: "Failed to fetch appliance" });
    }
  });

  app.put("/api/appliances/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const validated = insertApplianceSchema.partial().parse(req.body);
      const appliance = await storage.updateAppliance(userId, id, validated);
      res.json(appliance);
    } catch (error) {
      console.error("Error updating appliance:", error);
      res.status(400).json({ error: "Invalid appliance data" });
    }
  });

  app.delete("/api/appliances/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      await storage.deleteAppliance(userId, id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting appliance:", error);
      res.status(500).json({ error: "Failed to delete appliance" });
    }
  });

  // Appliance Categories
  app.get("/api/appliance-categories", async (req, res) => {
    try {
      const categories = await storage.getApplianceCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching appliance categories:", error);
      res.status(500).json({ error: "Failed to fetch appliance categories" });
    }
  });

  app.post(
    "/api/appliance-categories",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const category = await storage.createApplianceCategory(req.body);
        res.json(category);
      } catch (error) {
        console.error("Error creating appliance category:", error);
        res.status(400).json({ error: "Invalid category data" });
      }
    },
  );

  // Get appliances by category
  app.get(
    "/api/appliances/category/:categoryId",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const { categoryId } = req.params;
        const appliances = await storage.getAppliancesByCategory(
          userId,
          categoryId,
        );
        res.json(appliances);
      } catch (error) {
        console.error("Error fetching appliances by category:", error);
        res.status(500).json({ error: "Failed to fetch appliances" });
      }
    },
  );

  // Get appliances by capability
  app.get(
    "/api/appliances/capability/:capability",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const { capability } = req.params;
        const appliances = await storage.getAppliancesByCapability(
          userId,
          capability,
        );
        res.json(appliances);
      } catch (error) {
        console.error("Error fetching appliances by capability:", error);
        res.status(500).json({ error: "Failed to fetch appliances" });
      }
    },
  );

  // Create appliance from barcode
  app.post(
    "/api/appliances/from-barcode",
    isAuthenticated,
    async (req: any, res) => {
      const userId = req.user.claims.sub;
      const { barcode, nickname, notes } = req.body;

      try {
        if (!barcode) {
          return res.status(400).json({ error: "Barcode is required" });
        }

        // Check if barcode product exists in our database
        let barcodeProduct = await storage.getBarcodeProduct(barcode);

        // If not in database, fetch from API
        if (!barcodeProduct) {
          // Check rate limits before making API call
          await checkRateLimitBeforeCall();

          const apiProduct = await getBarcodeLookupProduct(barcode);

          if (!apiProduct) {
            return res
              .status(404)
              .json({ error: "Product not found for this barcode" });
          }

          // Extract capabilities from description
          const capabilities = extractApplianceCapabilities(apiProduct);
          const { capacity, servingSize } =
            extractApplianceCapacity(apiProduct);

          // Save to barcode products table
          barcodeProduct = await storage.createBarcodeProduct({
            barcodeNumber: apiProduct.barcode_number || barcode,
            title: apiProduct.title || "Unknown Product",
            brand: apiProduct.brand,
            category: apiProduct.category,
            productAttributes: {
              manufacturer: apiProduct.manufacturer,
              model: apiProduct.model,
              description: apiProduct.description,
              images: apiProduct.images,
              capabilities,
              capacity,
              servingSize,
            },
            rawData: apiProduct,
          });
        }

        // Create appliance for user
        const appliance = await storage.createAppliance(userId, {
          name: barcodeProduct.title,
          type: determineApplianceType(barcodeProduct),
          barcodeProductId: barcodeProduct.id,
          nickname: nickname || barcodeProduct.title,
          notes,
          imageUrl: barcodeProduct.productAttributes?.images?.[0],
          customCapabilities: barcodeProduct.productAttributes?.capabilities,
          customCapacity: barcodeProduct.productAttributes?.capacity,
          customServingSize: barcodeProduct.productAttributes?.servingSize,
        });

        res.json(appliance);
      } catch (error: any) {
        console.error("Error creating appliance from barcode:", error);
        if (error instanceof ApiError) {
          return res.status(error.statusCode).json({ error: error.message });
        }
        res
          .status(500)
          .json({ error: "Failed to create appliance from barcode" });
      }
    },
  );

  // FDC Food Search with Cache (public)
  app.get("/api/fdc/search", async (req, res) => {
    try {
      const {
        query,
        pageSize,
        pageNumber,
        dataType,
        sortBy,
        sortOrder,
        brandOwner,
      } = req.query;
      if (!query || typeof query !== "string") {
        return res.status(400).json({ error: "Query parameter is required" });
      }

      const size = pageSize ? parseInt(pageSize as string) : 25;
      const page = pageNumber ? parseInt(pageNumber as string) : 1;

      // Parse dataType - can be comma-separated string or array
      let dataTypes: string[] = [];
      if (dataType) {
        if (Array.isArray(dataType)) {
          dataTypes = dataType as string[];
        } else if (typeof dataType === "string") {
          dataTypes = dataType
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean);
        }
      }

      // Parse brandOwner - Express automatically handles multiple params as array
      let brandOwners: string[] = [];
      if (brandOwner) {
        if (Array.isArray(brandOwner)) {
          brandOwners = brandOwner as string[];
        } else if (typeof brandOwner === "string") {
          brandOwners = [brandOwner];
        }
      }

      const sort = sortBy as string | undefined;
      const order = sortOrder as string | undefined;

      // Only cache the simplest searches (query + page) to avoid stale results with filters
      // Advanced filters (dataType, sort, brand) bypass cache completely
      const hasAnyFilters = !!(
        sort ||
        brandOwners.length > 0 ||
        dataTypes.length > 0 ||
        size !== 25
      );

      // Use shorter TTL for complex searches, longer TTL for simple searches
      const cachedResults = await storage.getCachedSearchResults(
        query,
        undefined,
        page,
      );
      if (
        cachedResults &&
        cachedResults.fdcIds &&
        cachedResults.pageSize === size
      ) {
        console.log(
          `FDC search cache hit for query: ${query} (complex: ${hasAnyFilters})`,
        );

        // Fetch actual food details for the cached fdcIds
        const foods = await Promise.all(
          cachedResults.fdcIds.map(async (fdcId) => {
            const cachedFood = await storage.getCachedFood(fdcId);
            return cachedFood
              ? {
                  fdcId: cachedFood.fdcId,
                  description: cachedFood.description,
                  dataType: cachedFood.dataType,
                  brandOwner: cachedFood.brandOwner,
                  brandName: cachedFood.brandName,
                  score: 0,
                }
              : null;
          }),
        );

        const validFoods = foods.filter((f) => f !== null);

        return res.json({
          foods: validFoods,
          totalHits: cachedResults.totalHits,
          currentPage: page,
          totalPages: Math.ceil((cachedResults.totalHits || 0) / size),
          fromCache: true,
        });
      }

      // If not in cache, call FDC API
      console.log(`FDC search calling API for query: ${query}`);

      // Build API URL
      const apiKey = process.env.FDC_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "FDC API key not configured" });
      }

      const searchUrl = new URL("https://api.nal.usda.gov/fdc/v1/foods/search");
      searchUrl.searchParams.append("api_key", apiKey);
      searchUrl.searchParams.append("query", query);
      searchUrl.searchParams.append("pageSize", size.toString());
      searchUrl.searchParams.append("pageNumber", page.toString());

      // Add each dataType as a separate parameter for FDC API array handling
      if (dataTypes.length > 0) {
        dataTypes.forEach((type) => {
          searchUrl.searchParams.append("dataType", type);
        });
      }

      if (sort) {
        searchUrl.searchParams.append("sortBy", sort);
      }

      if (order) {
        searchUrl.searchParams.append("sortOrder", order);
      }

      // Add each brandOwner as a separate parameter for FDC API array handling
      if (brandOwners.length > 0) {
        brandOwners.forEach((brand) => {
          searchUrl.searchParams.append("brandOwner", brand);
        });
      }

      const response = await fetch(searchUrl);
      if (!response.ok) {
        throw new Error(`FDC API error: ${response.statusText}`);
      }

      const data = await response.json();

      // Extract FDC IDs for caching
      const fdcIdsToCache =
        data.foods?.map((food: any) => food.fdcId.toString()) || [];

      // Cache all searches, but complex searches will have shorter TTL (2 hours vs 24 hours)
      // This is handled by the getCachedSearchResults method which checks isComplexSearch
      await storage.cacheSearchResults({
        query,
        dataType: null,
        pageNumber: page,
        pageSize: size,
        totalHits: data.totalHits || 0,
        fdcIds: fdcIdsToCache,
      });

      // Create results to return
      const resultsToReturn =
        data.foods?.map((food: any) => ({
          fdcId: food.fdcId.toString(),
          description: food.description || food.lowercaseDescription,
          dataType: food.dataType,
          brandOwner: food.brandOwner,
          brandName: food.brandName,
          score: food.score,
        })) || [];

      // Cache individual food items for faster detail lookups
      for (const food of data.foods || []) {
        const nutrients =
          food.foodNutrients?.map((n: any) => ({
            nutrientId: n.nutrientId,
            nutrientName: n.nutrientName,
            nutrientNumber: n.nutrientNumber,
            unitName: n.unitName,
            value: n.value,
          })) || [];

        await storage.cacheFood({
          fdcId: food.fdcId.toString(),
          description: food.description || food.lowercaseDescription,
          dataType: food.dataType,
          brandOwner: food.brandOwner,
          brandName: food.brandName,
          ingredients: food.ingredients,
          servingSize: food.servingSize,
          servingSizeUnit: food.servingSizeUnit,
          nutrients,
          fullData: food,
        });
      }

      res.json({
        foods: resultsToReturn,
        totalHits: data.totalHits || 0,
        currentPage: page,
        totalPages: Math.ceil((data.totalHits || 0) / size),
        fromCache: false,
      });
    } catch (error: any) {
      console.error("FDC search error:", error);
      res.status(500).json({ error: "Failed to search FDC database" });
    }
  });

  // FDC Food Details with Cache (public)
  app.get("/api/fdc/food/:fdcId", async (req, res) => {
    try {
      const { fdcId } = req.params;

      // Check cache first
      const cachedFood = await storage.getCachedFood(fdcId);
      if (cachedFood) {
        console.log(`FDC food cache hit for fdcId: ${fdcId}`);
        await storage.updateFoodLastAccessed(fdcId);
        return res.json({
          ...(cachedFood.fullData || {}),
          fromCache: true,
        });
      }

      // If not in cache, call FDC API
      console.log(`FDC food cache miss for fdcId: ${fdcId}, calling API`);

      const apiKey = process.env.FDC_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "FDC API key not configured" });
      }

      const foodUrl = `https://api.nal.usda.gov/fdc/v1/food/${fdcId}?api_key=${apiKey}`;
      const response = await fetch(foodUrl);

      if (!response.ok) {
        if (response.status === 404) {
          return res.status(404).json({ error: "Food not found" });
        }
        throw new Error(`FDC API error: ${response.statusText}`);
      }

      const food = await response.json();

      // Cache the food item
      const nutrients =
        food.foodNutrients?.map((n: any) => ({
          nutrientId: n.nutrient?.id || n.nutrientId,
          nutrientName: n.nutrient?.name || n.nutrientName,
          nutrientNumber: n.nutrient?.number || n.nutrientNumber,
          unitName: n.nutrient?.unitName || n.unitName,
          value: n.amount || n.value || 0,
        })) || [];

      await storage.cacheFood({
        fdcId: fdcId,
        description: food.description || food.lowercaseDescription,
        dataType: food.dataType,
        brandOwner: food.brandOwner,
        brandName: food.brandName,
        ingredients: food.ingredients,
        servingSize: food.servingSize,
        servingSizeUnit: food.servingSizeUnit,
        nutrients,
        fullData: food,
      });

      res.json({
        ...food,
        fromCache: false,
      });
    } catch (error: any) {
      console.error("FDC food details error:", error);
      res.status(500).json({ error: "Failed to fetch food details" });
    }
  });

  // Clear old cache entries (admin endpoint - could be scheduled)
  app.post("/api/fdc/cache/clear", async (req, res) => {
    try {
      const { daysOld = 30 } = req.body;
      await storage.clearOldCache(daysOld);
      res.json({
        success: true,
        message: `Cleared cache entries older than ${daysOld} days`,
      });
    } catch (error) {
      console.error("Error clearing cache:", error);
      res.status(500).json({ error: "Failed to clear cache" });
    }
  });

  // USDA Food Search (public) - Enhanced with all FDC search parameters
  app.get("/api/usda/search", async (req, res) => {
    try {
      const {
        query,
        pageSize,
        pageNumber,
        dataType,
        sortBy,
        sortOrder,
        brandOwner,
      } = req.query;
      if (!query || typeof query !== "string") {
        return res.status(400).json({ error: "Query parameter is required" });
      }

      const size = pageSize ? parseInt(pageSize as string) : 20;
      const page = pageNumber ? parseInt(pageNumber as string) : 1;

      // Parse dataType - can be comma-separated string or array
      let dataTypes: string[] = [];
      if (dataType) {
        if (Array.isArray(dataType)) {
          dataTypes = dataType as string[];
        } else if (typeof dataType === "string") {
          dataTypes = dataType
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean);
        }
      }

      // Parse brandOwner - can be comma-separated string or array
      let brandOwners: string[] = [];
      if (brandOwner) {
        if (Array.isArray(brandOwner)) {
          brandOwners = brandOwner as string[];
        } else if (typeof brandOwner === "string") {
          brandOwners = brandOwner
            .split(",")
            .map((b) => b.trim())
            .filter(Boolean);
        }
      }

      const results = await searchUSDAFoods({
        query,
        pageSize: size,
        pageNumber: page,
        dataType: dataTypes.length > 0 ? dataTypes : undefined,
        sortBy: sortBy as any,
        sortOrder: sortOrder as any,
        brandOwner: brandOwners.length > 0 ? brandOwners : undefined,
      });
      res.json(results);
    } catch (error: any) {
      console.error("USDA search error:", error);
      if (error instanceof ApiError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      res.status(500).json({ error: "Failed to search USDA database" });
    }
  });

  app.get("/api/usda/food/:fdcId", async (req, res) => {
    try {
      const { fdcId } = req.params;
      const food = await getFoodByFdcId(Number(fdcId));
      if (!food) {
        return res.status(404).json({ error: "Food not found" });
      }
      res.json(food);
    } catch (error: any) {
      console.error("USDA food details error:", error);
      if (error instanceof ApiError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      res.status(500).json({ error: "Failed to fetch food details" });
    }
  });

  // Unified Search - Search all food databases in parallel
  app.get("/api/food/unified-search", async (req, res) => {
    try {
      const { query } = req.query;
      if (!query || typeof query !== "string") {
        return res.status(400).json({ error: "Query parameter is required" });
      }

      // Search all three APIs in parallel
      const [usdaResults, barcodeLookupResults, openFoodFactsResults] =
        await Promise.allSettled([
          // USDA search
          searchUSDAFoods({ query, pageSize: 10, pageNumber: 1 }).catch(
            (error) => {
              console.error("USDA search error in unified search:", error);
              return { foods: [], totalHits: 0, currentPage: 1, totalPages: 0 };
            },
          ),

          // Barcode Lookup search
          searchBarcodeLookup(query).catch((error) => {
            console.error(
              "Barcode Lookup search error in unified search:",
              error,
            );
            return { products: [] };
          }),

          // Open Food Facts search (using their search API)
          axios
            .get(`${OPEN_FOOD_FACTS_API_BASE}/search`, {
              params: {
                search_terms: query,
                page_size: 10,
                page: 1,
                fields:
                  "code,product_name,brands,image_url,nutriments,quantity,categories",
              },
              headers: {
                "User-Agent": "ChefSpAIce/1.0 (https://chefspice.app)",
                Accept: "application/json",
              },
              timeout: 5000,
            })
            .then((response) => response.data)
            .catch((error) => {
              console.error(
                "Open Food Facts search error in unified search:",
                error,
              );
              return { products: [] };
            }),
        ]);

      res.json({
        usda:
          usdaResults.status === "fulfilled"
            ? usdaResults.value
            : { foods: [], totalHits: 0, currentPage: 1, totalPages: 0 },
        barcodeLookup:
          barcodeLookupResults.status === "fulfilled"
            ? barcodeLookupResults.value
            : { products: [] },
        openFoodFacts:
          openFoodFactsResults.status === "fulfilled"
            ? openFoodFactsResults.value
            : { products: [] },
      });
    } catch (error: any) {
      console.error("Unified search error:", error);
      res.status(500).json({ error: "Failed to perform unified search" });
    }
  });

  // Food Enrichment - Waterfall enrichment for USDA items using Open Food Facts and Barcode Lookup
  app.post("/api/food/enrich", async (req, res) => {
    try {
      const usdaItem = req.body as USDAFoodItem;

      if (!usdaItem || !usdaItem.fdcId) {
        return res
          .status(400)
          .json({ error: "Valid USDA food item is required" });
      }

      // Helper function to check if fields are missing
      const checkMissingFields = (item: any) => {
        const hasUpc = !!item.gtinUpc;
        const missingFields = {
          image: hasUpc && !item.imageUrl, // Image only required if has UPC
          nutrition: !item.nutrition || !item.nutrition.calories,
          ingredients: !item.ingredients,
          servingSize: !item.servingSize || !item.servingSizeUnit,
        };
        return {
          hasUpc,
          missingFields,
          needsEnrichment: Object.values(missingFields).some((v) => v),
        };
      };

      let enrichedItem = { ...usdaItem };
      const { hasUpc, missingFields, needsEnrichment } =
        checkMissingFields(enrichedItem);

      console.log(`Enriching item: ${usdaItem.description}`, {
        hasUpc,
        missingFields,
        needsEnrichment,
      });

      if (!needsEnrichment) {
        // No enrichment needed
        return res.json(enrichedItem);
      }

      // Waterfall enrichment
      let imageUrl: string | null = null;

      // Step 1: Try Open Food Facts if has UPC
      if (hasUpc && usdaItem.gtinUpc) {
        try {
          console.log(`Querying Open Food Facts for UPC: ${usdaItem.gtinUpc}`);
          const offProduct = await getOpenFoodFactsProduct(usdaItem.gtinUpc);

          if (offProduct && offProduct.product) {
            const product = offProduct.product;

            // Merge nutrition data if missing - only if we have meaningful values
            if (missingFields.nutrition && product.nutriments) {
              const calories =
                product.nutriments["energy-kcal"] ||
                product.nutriments.energy_100g;
              const protein =
                product.nutriments.proteins || product.nutriments.proteins_100g;
              const carbs =
                product.nutriments.carbohydrates ||
                product.nutriments.carbohydrates_100g;
              const fat = product.nutriments.fat || product.nutriments.fat_100g;

              // Only merge if we have at least calories or a macro
              if (calories || protein || carbs || fat) {
                enrichedItem.nutrition = {
                  calories: calories || 0,
                  protein: protein || 0,
                  carbs: carbs || 0,
                  fat: fat || 0,
                  fiber:
                    product.nutriments.fiber || product.nutriments.fiber_100g,
                  sugar:
                    product.nutriments.sugars || product.nutriments.sugars_100g,
                  sodium:
                    product.nutriments.sodium || product.nutriments.sodium_100g,
                  servingSize: product.serving_size || "100",
                  servingUnit: "g",
                };
                console.log("Enriched nutrition from Open Food Facts");
              }
            }

            // Merge ingredients if missing
            if (missingFields.ingredients && product.ingredients_text_en) {
              enrichedItem.ingredients = product.ingredients_text_en;
              console.log("Enriched ingredients from Open Food Facts");
            }

            // Merge serving size if missing
            if (missingFields.servingSize && product.serving_size) {
              // Parse serving size (e.g., "250g" -> 250, "g")
              const servingMatch = product.serving_size.match(
                /(\d+(?:\.\d+)?)\s*([a-zA-Z]+)?/,
              );
              if (servingMatch) {
                enrichedItem.servingSize = parseFloat(servingMatch[1]);
                enrichedItem.servingSizeUnit = servingMatch[2] || "g";
                console.log("Enriched serving size from Open Food Facts");
              }
            }

            // Get image
            if (missingFields.image) {
              imageUrl = product.image_front_url || product.image_url || null;
              if (imageUrl) {
                console.log("Got image from Open Food Facts");
              }
            }
          }
        } catch (error) {
          console.error("Error querying Open Food Facts:", error);
        }
      }

      // Step 2: Recheck missing fields after Open Food Facts enrichment
      const afterOFFCheck = checkMissingFields({ ...enrichedItem, imageUrl });

      // Try Barcode Lookup if still missing fields and has UPC
      if (afterOFFCheck.needsEnrichment && hasUpc && usdaItem.gtinUpc) {
        try {
          console.log(`Querying Barcode Lookup for UPC: ${usdaItem.gtinUpc}`);
          const barcodeResult = await searchBarcodeLookup(usdaItem.gtinUpc);

          if (barcodeResult.products && barcodeResult.products.length > 0) {
            const product = barcodeResult.products[0];

            // Get image if still missing
            if (!imageUrl && product.images && product.images.length > 0) {
              imageUrl = product.images[0];
              console.log("Got image from Barcode Lookup");
            }

            // Ingredients from description/features
            if (afterOFFCheck.missingFields.ingredients) {
              if (product.description) {
                enrichedItem.ingredients = product.description;
                console.log("Enriched ingredients from Barcode Lookup");
              } else if (product.features && product.features.length > 0) {
                enrichedItem.ingredients = product.features.join(", ");
                console.log(
                  "Enriched ingredients from Barcode Lookup features",
                );
              }
            }
          }
        } catch (error) {
          console.error("Error querying Barcode Lookup:", error);
        }
      }

      // Step 3: Recheck missing fields after Barcode Lookup enrichment
      const afterBarcodeLookupCheck = checkMissingFields({
        ...enrichedItem,
        imageUrl,
      });

      // Fuzzy matching fallback if still missing fields (works for both UPC and non-UPC items)
      if (afterBarcodeLookupCheck.needsEnrichment && usdaItem.description) {
        try {
          // Try fuzzy search with product name (and brand if available)
          const searchQuery = usdaItem.brandOwner
            ? `${usdaItem.brandOwner} ${usdaItem.description}`
            : usdaItem.description;

          console.log(`Trying fuzzy match with query: ${searchQuery}`);

          // Try Open Food Facts search if we still need any fields
          if (afterBarcodeLookupCheck.needsEnrichment) {
            try {
              const offSearchResponse = await axios.get(
                `${OPEN_FOOD_FACTS_API_BASE}/search`,
                {
                  params: {
                    search_terms: searchQuery,
                    page_size: 1,
                    page: 1,
                    fields:
                      "code,product_name,brands,image_url,nutriments,ingredients_text_en,serving_size",
                  },
                  headers: {
                    "User-Agent": "ChefSpAIce/1.0 (https://chefspice.app)",
                    Accept: "application/json",
                  },
                  timeout: 5000,
                },
              );

              if (
                offSearchResponse.data.products &&
                offSearchResponse.data.products.length > 0
              ) {
                const product = offSearchResponse.data.products[0];

                // Merge missing data from fuzzy match
                if (!imageUrl && product.image_url) {
                  imageUrl = product.image_url;
                  console.log("Got image from Open Food Facts fuzzy search");
                }

                if (
                  afterBarcodeLookupCheck.missingFields.nutrition &&
                  product.nutriments
                ) {
                  const calories =
                    product.nutriments["energy-kcal"] ||
                    product.nutriments.energy_100g;
                  const protein =
                    product.nutriments.proteins ||
                    product.nutriments.proteins_100g;
                  const carbs =
                    product.nutriments.carbohydrates ||
                    product.nutriments.carbohydrates_100g;
                  const fat =
                    product.nutriments.fat || product.nutriments.fat_100g;

                  // Only merge if we have meaningful values
                  if (calories || protein || carbs || fat) {
                    enrichedItem.nutrition = {
                      calories: calories || 0,
                      protein: protein || 0,
                      carbs: carbs || 0,
                      fat: fat || 0,
                      fiber:
                        product.nutriments.fiber ||
                        product.nutriments.fiber_100g,
                      sugar:
                        product.nutriments.sugars ||
                        product.nutriments.sugars_100g,
                      sodium:
                        product.nutriments.sodium ||
                        product.nutriments.sodium_100g,
                      servingSize: product.serving_size || "100",
                      servingUnit: "g",
                    };
                    console.log(
                      "Enriched nutrition from Open Food Facts fuzzy search",
                    );
                  }
                }

                if (
                  afterBarcodeLookupCheck.missingFields.ingredients &&
                  product.ingredients_text_en
                ) {
                  enrichedItem.ingredients = product.ingredients_text_en;
                  console.log(
                    "Enriched ingredients from Open Food Facts fuzzy search",
                  );
                }
              }
            } catch (error) {
              console.error("Error in Open Food Facts fuzzy search:", error);
            }
          }
        } catch (error) {
          console.error("Error in fuzzy matching:", error);
        }
      }

      // Return enriched item with image URL
      res.json({
        ...enrichedItem,
        imageUrl: imageUrl,
      });
    } catch (error: any) {
      console.error("Food enrichment error:", error);
      res.status(500).json({ error: "Failed to enrich food item" });
    }
  });

  // Onboarding - Get enriched USDA data for common items (public - used during onboarding)
  app.get("/api/onboarding/enriched-item/:itemName", async (req: any, res) => {
    try {
      const { itemName } = req.params;
      const enrichedItem = await getEnrichedOnboardingItem(
        decodeURIComponent(itemName),
      );

      if (!enrichedItem) {
        return res
          .status(404)
          .json({ error: "Item not found in onboarding list" });
      }

      res.json(enrichedItem);
    } catch (error: any) {
      console.error("Error fetching enriched onboarding item:", error);
      res.status(500).json({ error: "Failed to fetch enriched item data" });
    }
  });

  // Onboarding - Complete onboarding in a single request
  app.post(
    "/api/onboarding/complete",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const { preferences, customStorageAreas, selectedCommonItems } =
          req.body;

        const failedItems: string[] = [];
        let successCount = 0;
        let createdStorageLocations: StorageLocation[] = [];

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
        const { getItemsByCategory } = await import(
          "./onboarding-items-expanded"
        );
        const { normalizeCategory } = await import("./category-mapping");
        const itemsByCategory = getItemsByCategory();

        // Flatten all items to create a lookup map
        const allItemsMap = new Map<string, any>();
        Object.values(itemsByCategory).forEach((items) => {
          items.forEach((item) => {
            allItemsMap.set(item.displayName, item);
          });
        });

        // Step 5: Create selected common food items from pre-populated database
        // INSTANT ONBOARDING: Fetch all selected items from commonFoodItems table in one query
        const commonItems = await storage.getCommonFoodItemsByNames(
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
                fcdId: commonItem.fcdId || null,
                nutrition: commonItem.nutrition || null,
                usdaData: commonItem.usdaData
                  ? JSON.stringify(commonItem.usdaData)
                  : null,
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
                fcdId: itemData.fcdId || null,
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
      } catch (error: any) {
        console.error("Error completing onboarding:", error);
        res.status(500).json({ error: "Failed to complete onboarding" });
      }
    },
  );

  // Barcode Lookup - Product Images (public)
  app.get("/api/barcodelookup/search", async (req: any, res) => {
    const userId = req.user?.claims?.sub;
    const { query } = req.query;
    let apiCallMade = false;
    let statusCode = 200;
    let success = true;

    try {
      if (!query || typeof query !== "string") {
        return res.status(400).json({ error: "Query parameter is required" });
      }

      // Check rate limits before making API call
      await checkRateLimitBeforeCall();

      apiCallMade = true;
      const results = await searchBarcodeLookup(query);

      const products = results.products.map((product) => ({
        code: product.barcode_number || "",
        name: product.title || "Unknown Product",
        brand: product.brand || "",
        imageUrl: extractImageUrl(product),
        description: product.description,
      }));

      res.json({ products, count: products.length });
    } catch (error: any) {
      console.error("Barcode Lookup search error:", error);
      if (error instanceof ApiError) {
        statusCode = error.statusCode;
        success = false;
        return res.status(error.statusCode).json({ error: error.message });
      }
      statusCode = 500;
      success = false;
      res.status(500).json({ error: "Failed to search Barcode Lookup" });
    } finally {
      // Use batched logging for better performance
      if (userId && apiCallMade) {
        try {
          await batchedApiLogger.logApiUsage(userId, {
            apiName: "barcode_lookup",
            endpoint: "search",
            queryParams: `query=${query}`,
            statusCode,
            success,
          });
        } catch (logError) {
          console.error("Failed to log API usage:", logError);
        }
      }
    }
  });

  app.get("/api/barcodelookup/product/:barcode", async (req: any, res) => {
    const userId = req.user?.claims?.sub;
    const { barcode } = req.params;
    let apiCallMade = false;
    let statusCode = 200;
    let success = true;
    let source = "cache";
    let cacheHit = false;

    try {
      // First, check cache
      const { checkCache, saveToCache, formatCachedProduct } = await import(
        "./cache"
      );
      const cacheResult = await checkCache(barcode);

      if (cacheResult.found && !cacheResult.expired) {
        // Cache hit - return cached product
        cacheHit = true;
        const cachedProduct = cacheResult.product!;

        if (cachedProduct.lookupFailed) {
          // This was a failed lookup that we cached
          statusCode = 404;
          success = false;
          return res.status(404).json({
            error: "Product not found in any database",
            cached: true,
          });
        }

        // Return cached successful product
        const formattedProduct = formatCachedProduct(cachedProduct);
        return res.json({
          ...formattedProduct,
          cached: true,
          cacheInfo: {
            cachedAt: cachedProduct.cachedAt,
            expiresAt: cachedProduct.expiresAt,
          },
        });
      }

      // Cache miss or expired - proceed with API calls
      // Check rate limits before making API call
      await checkRateLimitBeforeCall();

      apiCallMade = true;
      const product = await getBarcodeLookupProduct(barcode);

      if (product) {
        // Found in Barcode Lookup
        source = "barcode_lookup";
        const productInfo = {
          code: product.barcode_number || "",
          name: product.title || "Unknown Product",
          brand: product.brand || "",
          imageUrl: extractImageUrl(product),
          description: product.description,
          source: "barcode_lookup" as const,
        };

        // Save to cache
        await saveToCache(productInfo, false);

        res.json({
          ...productInfo,
          cached: false,
        });
      } else {
        // Not found in Barcode Lookup, try Open Food Facts as fallback
        console.log(
          `Product ${barcode} not in Barcode Lookup, trying Open Food Facts...`,
        );
        source = "openfoodfacts";

        const offProduct = await getOpenFoodFactsProduct(barcode);
        if (offProduct) {
          const productInfo = extractProductInfo(offProduct);
          if (productInfo) {
            // Save successful lookup to cache
            await saveToCache(
              {
                ...productInfo,
                source: "openfoodfacts",
              },
              false,
            );

            res.json({
              ...productInfo,
              cached: false,
              nutrition: productInfo.nutrition,
              categories: productInfo.categories,
            });
          } else {
            // Save failed lookup to cache
            await saveToCache(
              {
                code: barcode,
                name: "Not found",
                source: "openfoodfacts",
              },
              true,
            );

            statusCode = 404;
            success = false;
            return res.status(404).json({
              error: "Product not found in any database",
              cached: false,
            });
          }
        } else {
          // Save failed lookup to cache
          await saveToCache(
            {
              code: barcode,
              name: "Not found",
              source: "openfoodfacts",
            },
            true,
          );

          statusCode = 404;
          success = false;
          return res.status(404).json({
            error: "Product not found in any database",
            cached: false,
          });
        }
      }
    } catch (error: any) {
      console.error("Barcode product lookup error:", error);
      if (error instanceof ApiError) {
        statusCode = error.statusCode;
        success = false;
        return res.status(error.statusCode).json({ error: error.message });
      }
      statusCode = 500;
      success = false;
      res.status(500).json({ error: "Failed to fetch product details" });
    } finally {
      // Use batched logging for better performance
      if (userId && apiCallMade) {
        try {
          await batchedApiLogger.logApiUsage(userId, {
            apiName: source,
            endpoint: "product",
            queryParams: `barcode=${barcode}`,
            statusCode,
            success,
          });
        } catch (logError) {
          console.error("Failed to log API usage:", logError);
        }
      }
    }
  });

  app.post("/api/barcodelookup/batch", async (req: any, res) => {
    const userId = req.user?.claims?.sub;
    const { barcodes } = req.body;
    let apiCallMade = false;
    let statusCode = 200;
    let success = true;
    let cacheHits = 0;
    let cacheMisses = 0;

    try {
      // Validate input
      if (!barcodes || !Array.isArray(barcodes)) {
        return res.status(400).json({ error: "barcodes array is required" });
      }

      if (barcodes.length === 0) {
        return res.json({ products: [], count: 0 });
      }

      if (barcodes.length > 10) {
        return res
          .status(400)
          .json({ error: "Maximum 10 barcodes allowed per batch" });
      }

      // Import cache functions
      const { checkMultipleCache, saveToCache, formatCachedProduct } =
        await import("./cache");

      // Check cache for all barcodes
      const cacheResults = await checkMultipleCache(barcodes);
      const formattedProducts: any[] = [];
      const uncachedBarcodes: string[] = [];

      // Process cached results
      for (const [barcode, cacheResult] of Array.from(cacheResults.entries())) {
        if (cacheResult.found && !cacheResult.expired && cacheResult.product) {
          // Cache hit
          cacheHits++;
          if (!cacheResult.product.lookupFailed) {
            const formattedProduct = formatCachedProduct(cacheResult.product);
            formattedProducts.push({
              ...formattedProduct,
              cached: true,
            });
          }
        } else {
          // Cache miss or expired
          cacheMisses++;
          uncachedBarcodes.push(barcode);
        }
      }

      // Only query APIs for uncached items
      if (uncachedBarcodes.length > 0) {
        // Check rate limits before making API call
        await checkRateLimitBeforeCall();

        apiCallMade = true;
        const products = await getBarcodeLookupBatch(uncachedBarcodes);

        // Track which barcodes were found
        const foundBarcodes = new Set(products.map((p) => p.barcode_number));
        const notFoundBarcodes = uncachedBarcodes.filter(
          (bc) => !foundBarcodes.has(bc),
        );

        // Process and cache found products
        for (const product of products) {
          const productInfo = {
            code: product.barcode_number || "",
            name: product.title || "Unknown Product",
            brand: product.brand || "",
            imageUrl: extractImageUrl(product),
            description: product.description,
            source: "barcode_lookup" as const,
          };

          // Save to cache
          await saveToCache(productInfo, false);

          formattedProducts.push({
            ...productInfo,
            cached: false,
          });
        }

        // If some barcodes weren't found, try Open Food Facts
        if (notFoundBarcodes.length > 0) {
          console.log(
            `${notFoundBarcodes.length} products not in Barcode Lookup, trying Open Food Facts...`,
          );
          const offProducts = await getOpenFoodFactsBatch(notFoundBarcodes);

          for (const offProduct of offProducts) {
            const productInfo = extractProductInfo(offProduct);
            if (productInfo) {
              // Save to cache
              await saveToCache(
                {
                  ...productInfo,
                  source: "openfoodfacts",
                },
                false,
              );

              formattedProducts.push({
                ...productInfo,
                source: "openfoodfacts",
                cached: false,
              });
            }
          }

          // Cache failed lookups for products not found in either database
          const finalFoundBarcodes = new Set(
            formattedProducts.map((p) => p.code),
          );
          for (const barcode of notFoundBarcodes) {
            if (!finalFoundBarcodes.has(barcode)) {
              await saveToCache(
                {
                  code: barcode,
                  name: "Not found",
                  source: "openfoodfacts",
                },
                true,
              );
            }
          }
        }
      }

      // Count products by source
      const barcodeLookupCount = formattedProducts.filter(
        (p) => p.source === "barcode_lookup",
      ).length;
      const openFoodFactsCount = formattedProducts.filter(
        (p) => p.source === "openfoodfacts",
      ).length;

      res.json({
        products: formattedProducts,
        count: formattedProducts.length,
        requested: barcodes.length,
        cacheInfo: {
          hits: cacheHits,
          misses: cacheMisses,
          apiCallsSaved: cacheHits > 0 ? 1 : 0, // We save 1 batch API call for all cache hits
        },
        apiCallsSaved: barcodes.length > 1 ? barcodes.length - 1 : 0,
        sources: {
          barcode_lookup: barcodeLookupCount,
          openfoodfacts: openFoodFactsCount,
        },
      });
    } catch (error: any) {
      console.error("Barcode batch lookup error:", error);
      if (error instanceof ApiError) {
        statusCode = error.statusCode;
        success = false;
        return res.status(error.statusCode).json({ error: error.message });
      }
      statusCode = 500;
      success = false;
      res.status(500).json({ error: "Failed to fetch batch products" });
    } finally {
      // Use batched logging for better performance
      if (userId && apiCallMade) {
        try {
          await batchedApiLogger.logApiUsage(userId, {
            apiName: "barcode_lookup",
            endpoint: "batch",
            queryParams: `batch_size=${barcodes.length}`,
            statusCode,
            success,
          });
        } catch (logError) {
          console.error("Failed to log API usage:", logError);
        }
      }
    }
  });

  app.get(
    "/api/barcodelookup/cache-stats",
    isAuthenticated,
    async (req, res) => {
      try {
        const { getCacheStatistics } = await import("./cache");
        const stats = await getCacheStatistics();
        res.json(stats);
      } catch (error: any) {
        console.error("Cache statistics error:", error);
        res.status(500).json({ error: "Failed to fetch cache statistics" });
      }
    },
  );

  app.get(
    "/api/barcodelookup/rate-limits",
    isAuthenticated,
    async (req, res) => {
      try {
        const limits = await getBarcodeLookupRateLimits();
        res.json(limits);
      } catch (error: any) {
        console.error("Barcode Lookup rate limits error:", error);
        if (error instanceof ApiError) {
          return res.status(error.statusCode).json({ error: error.message });
        }
        res.status(500).json({ error: "Failed to fetch rate limits" });
      }
    },
  );

  app.get(
    "/api/barcodelookup/usage/stats",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const { days } = req.query;
        const daysParam = days ? parseInt(days as string) : 30;

        const stats = await storage.getApiUsageStats(
          userId,
          "barcode_lookup",
          daysParam,
        );
        res.json(stats);
      } catch (error) {
        console.error("Error fetching API usage stats:", error);
        res.status(500).json({ error: "Failed to fetch usage stats" });
      }
    },
  );

  app.get(
    "/api/barcodelookup/usage/logs",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const { limit } = req.query;
        const limitParam = limit ? parseInt(limit as string) : 50;

        const logs = await storage.getApiUsageLogs(
          userId,
          "barcode_lookup",
          limitParam,
        );
        res.json(logs);
      } catch (error) {
        console.error("Error fetching API usage logs:", error);
        res.status(500).json({ error: "Failed to fetch usage logs" });
      }
    },
  );

  // Object Storage - Image Uploads (referenced from blueprint:javascript_object_storage)
  app.get("/objects/:objectPath(*)", async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(
        req.path,
      );
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error serving object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  app.post("/api/objects/upload", isAuthenticated, async (_req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });

  app.put("/api/food-images", isAuthenticated, async (req, res) => {
    if (!req.body.imageURL) {
      return res.status(400).json({ error: "imageURL is required" });
    }

    try {
      const objectStorageService = new ObjectStorageService();
      const objectPath = objectStorageService.normalizeObjectEntityPath(
        req.body.imageURL,
      );
      res.status(200).json({ objectPath });
    } catch (error) {
      console.error("Error setting food image:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Chat Messages (user-scoped) - Now with pagination support
  app.get("/api/chat/messages", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      // Trigger automatic cleanup of old messages (runs in background)
      cleanupOldMessagesForUser(userId).catch((err) =>
        console.error("Background cleanup error:", err),
      );

      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100); // Max 100 per page

      // If pagination params are provided, use paginated method
      if (req.query.page || req.query.limit) {
        const result = await storage.getChatMessagesPaginated(
          userId,
          page,
          limit,
        );
        res.json(result);
      } else {
        // Fallback to non-paginated for backward compatibility
        const messages = await storage.getChatMessages(userId);
        res.json(messages);
      }
    } catch (error) {
      console.error("Error fetching chat messages:", error);
      res.status(500).json({ error: "Failed to fetch chat messages" });
    }
  });

  // Create a single chat message
  app.post("/api/chat/messages", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const messageData = {
        role: req.body.role,
        content: req.body.content,
        metadata: req.body.metadata || null,
      };
      const message = await storage.createChatMessage(userId, messageData);
      res.json(message);
    } catch (error) {
      console.error("Error creating chat message:", error);
      res.status(400).json({ error: "Invalid chat message data" });
    }
  });

  // Clear all chat messages for a user
  app.delete("/api/chat/messages", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.clearChatMessages(userId);
      res.json({ success: true, message: "Chat history cleared" });
    } catch (error) {
      console.error("Error clearing chat messages:", error);
      res.status(500).json({ error: "Failed to clear chat history" });
    }
  });

  // Delete old chat messages (older than specified hours)
  app.post(
    "/api/chat/messages/cleanup",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const { hoursOld = 24 } = req.body;
        const deleted = await storage.deleteOldChatMessages(userId, hoursOld);
        res.json({
          success: true,
          deletedCount: deleted,
          message: `Deleted messages older than ${hoursOld} hours`,
        });
      } catch (error) {
        console.error("Error cleaning up chat messages:", error);
        res.status(500).json({ error: "Failed to cleanup chat messages" });
      }
    },
  );

  // Define schema for chat message validation
  const chatMessageRequestSchema = z.object({
    message: z
      .string()
      .min(1, "Message cannot be empty")
      .max(10000, "Message is too long (max 10,000 characters)")
      .trim(),
    attachments: z
      .array(
        z.object({
          type: z.enum(["image", "audio", "file"]),
          url: z.string(),
          name: z.string().optional(),
          size: z.number().optional(),
          mimeType: z.string().optional(),
        }),
      )
      .optional(),
  });

  app.post("/api/chat", isAuthenticated, async (req: any, res) => {
    const abortController = new AbortController();

    req.on("close", () => {
      abortController.abort();
    });

    try {
      const userId = req.user.claims.sub;

      // Validate request body using Zod
      const validation = chatMessageRequestSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: "Invalid message format",
          details: validation.error.issues,
        });
      }

      const { message, attachments } = validation.data;

      // Save user message with attachments
      await storage.createChatMessage(userId, {
        role: "user",
        content: message,
        metadata: null,
        attachments: attachments || [],
      });

      // Get current inventory and appliances for context
      const foodItems = await storage.getFoodItems(userId);
      const appliances = await storage.getAppliances(userId);
      const storageLocations = await storage.getStorageLocations(userId);

      // Optimize inventory context for large inventories
      // Prioritize: 1) expiring items, 2) recently added items
      const now = new Date();
      const prioritizedItems = foodItems
        .map((item) => {
          const daysToExpiry = item.expirationDate
            ? Math.ceil(
                (new Date(item.expirationDate).getTime() - now.getTime()) /
                  (1000 * 60 * 60 * 24),
              )
            : Infinity;
          return { ...item, daysToExpiry };
        })
        .sort((a, b) => {
          // Sort by expiring soon first, then by most recently created
          if (a.daysToExpiry !== b.daysToExpiry) {
            return a.daysToExpiry - b.daysToExpiry;
          }
          return 0;
        })
        .slice(0, 100); // Limit to top 100 items to prevent excessive context size

      const inventoryContext = prioritizedItems
        .map((item) => {
          const location = storageLocations.find(
            (loc) => loc.id === item.storageLocationId,
          );
          const expiryNote =
            item.expirationDate && item.daysToExpiry < 7
              ? ` (expires in ${item.daysToExpiry} days)`
              : "";
          return `${item.name} (${item.quantity} ${item.unit || ""}) in ${location?.name || "unknown"}${expiryNote}`;
        })
        .join(", ");

      const totalItemCount = foodItems.length;
      const contextNote =
        totalItemCount > 100
          ? ` [Showing ${prioritizedItems.length} of ${totalItemCount} items - prioritizing expiring and recent items]`
          : "";

      const appliancesContext = appliances.map((a) => a.name).join(", ");

      const systemPrompt = `You are an ChefSpAIce assistant. You help users manage their food inventory and suggest recipes.

Current inventory: ${inventoryContext || "No items in inventory"}${contextNote}
Available appliances: ${appliancesContext || "No appliances registered"}

Your tasks:
1. Answer cooking and recipe questions
2. Help users add, update, or remove food items from their inventory
3. Suggest recipes based on available ingredients
4. Provide cooking tips and guidance

When the user asks to add items, respond with the details and suggest saving them to inventory.
When asked for recipes, consider the available inventory and appliances.`;

      // Prepare messages with vision capabilities for images
      const userMessage: any = { role: "user", content: [] };

      // Add text content
      userMessage.content.push({ type: "text", text: message });

      // Add image attachments if present
      if (attachments && attachments.length > 0) {
        for (const attachment of attachments) {
          if (attachment.type === "image") {
            userMessage.content.push({
              type: "image_url",
              image_url: {
                url: attachment.url,
                detail: "auto",
              },
            });
          }
        }
      }

      // Stream response from OpenAI
      let stream;
      try {
        // Use vision-capable model if we have images
        const model = attachments?.some((a) => a.type === "image")
          ? "gpt-4o"
          : "gpt-4o-mini";

        stream = await openai.chat.completions.create({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            userMessage.content.length === 1 &&
            userMessage.content[0].type === "text"
              ? { role: "user", content: message }
              : userMessage,
          ],
          stream: true,
          max_completion_tokens: 8192,
        });
      } catch (openaiError: any) {
        console.error("OpenAI API error:", {
          message: openaiError.message,
          status: openaiError.status,
          code: openaiError.code,
          type: openaiError.type,
          requestId: openaiError.headers?.["x-request-id"],
        });

        const errorMessage =
          openaiError.status === 429
            ? "Rate limit exceeded. Please try again in a moment."
            : openaiError.status === 401 || openaiError.status === 403
              ? "Authentication failed with OpenAI API."
              : openaiError.message || "Failed to connect to AI service.";

        return res.status(openaiError.status || 500).json({
          error: errorMessage,
          details: openaiError.code,
        });
      }

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      let fullResponse = "";
      let streamCompleted = false;

      try {
        for await (const chunk of stream) {
          if (abortController.signal.aborted) {
            console.log("Stream aborted by client disconnect");
            break;
          }

          const content = chunk.choices[0]?.delta?.content || "";
          if (content) {
            fullResponse += content;
            try {
              res.write(`data: ${JSON.stringify({ content })}\n\n`);
            } catch (writeError) {
              console.error("Error writing to stream:", writeError);
              break;
            }
          }
        }

        streamCompleted = true;

        // Save AI response only if stream completed successfully and client is still connected
        if (fullResponse && !abortController.signal.aborted) {
          await storage.createChatMessage(userId, {
            role: "assistant",
            content: fullResponse,
            metadata: null,
          });
        }

        // Only write and end response if client is still connected and response is writable
        if (!abortController.signal.aborted && !res.writableEnded) {
          try {
            res.write("data: [DONE]\n\n");
            res.end();
          } catch (finalWriteError) {
            console.error("Error in final write to stream:", finalWriteError);
          }
        } else if (!res.writableEnded) {
          res.end();
        }
      } catch (streamError: any) {
        console.error("Streaming error:", {
          message: streamError.message,
          code: streamError.code,
          aborted: abortController.signal.aborted,
        });

        if (!res.writableEnded) {
          const errorData = {
            error: abortController.signal.aborted
              ? "Stream cancelled"
              : "Stream interrupted unexpectedly. Please try again.",
            type: streamError.code || "stream_error",
          };
          res.write(`data: ${JSON.stringify(errorData)}\n\n`);
          res.end();
        }
      }
    } catch (error: any) {
      console.error("Chat error:", {
        message: error.message,
        stack: error.stack,
        userId: req.user?.claims?.sub,
      });

      if (!res.headersSent) {
        res.status(500).json({
          error: "Failed to process chat message",
          details: error.message,
        });
      } else {
        res.end();
      }
    }
  });

  // Recipe Generation (user-scoped)
  app.post("/api/recipes/generate", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const foodItems = await storage.getFoodItems(userId);
      const appliances = await storage.getAppliances(userId);

      // Extract customization preferences if provided
      const {
        timeConstraint = "moderate",
        servings = 4,
        difficulty = "intermediate",
        mealType = "dinner",
        creativity = 5,
        onlyUseOnHand = true,
      } = req.body;

      // Only require inventory if onlyUseOnHand is true
      if (onlyUseOnHand && foodItems.length === 0) {
        return res.status(400).json({
          error:
            "No ingredients in inventory. Turn off 'Only use ingredients on hand' to generate recipes without inventory.",
        });
      }

      // Sort items by expiration date to prioritize expiring items
      const now = new Date();
      const sortedItems = foodItems.sort((a, b) => {
        // Items without expiration dates go to the end
        if (!a.expirationDate && !b.expirationDate) return 0;
        if (!a.expirationDate) return 1;
        if (!b.expirationDate) return -1;

        // Sort by expiration date (earliest first)
        return (
          new Date(a.expirationDate).getTime() -
          new Date(b.expirationDate).getTime()
        );
      });

      // Categorize ingredients by urgency
      const expiringIngredients: any[] = [];
      const freshIngredients: any[] = [];
      const stableIngredients: any[] = [];

      sortedItems.forEach((item) => {
        const daysUntilExpiration = item.expirationDate
          ? Math.floor(
              (new Date(item.expirationDate).getTime() - now.getTime()) /
                (1000 * 60 * 60 * 24),
            )
          : null;

        const ingredientInfo = {
          name: item.name,
          quantity: item.quantity,
          unit: item.unit || "",
          expiresIn: daysUntilExpiration,
        };

        if (daysUntilExpiration !== null && daysUntilExpiration <= 3) {
          expiringIngredients.push(ingredientInfo);
        } else if (daysUntilExpiration !== null && daysUntilExpiration <= 7) {
          freshIngredients.push(ingredientInfo);
        } else {
          stableIngredients.push(ingredientInfo);
        }
      });

      // Create detailed ingredient lists for the prompt
      const formatIngredientList = (items: any[]) =>
        items
          .map((item) => {
            const expiryNote =
              item.expiresIn !== null
                ? item.expiresIn <= 0
                  ? " [EXPIRES TODAY]"
                  : item.expiresIn === 1
                    ? " [EXPIRES TOMORROW]"
                    : ` [expires in ${item.expiresIn} days]`
                : "";
            return `${item.name} (${item.quantity} ${item.unit})${expiryNote}`;
          })
          .join(", ");

      const urgentIngredientsList = formatIngredientList(expiringIngredients);
      const freshIngredientsList = formatIngredientList(freshIngredients);
      const stableIngredientsList = formatIngredientList(stableIngredients);

      const appliancesList = appliances.map((a) => a.name).join(", ");

      // Map time constraint to actual time ranges
      const timeMap = {
        quick: "under 30 minutes total",
        moderate: "30-60 minutes total",
        elaborate: "over 60 minutes total",
      };

      // Map creativity to style guidance
      const creativityGuidance =
        creativity <= 3
          ? "traditional and familiar"
          : creativity <= 7
            ? "balanced mix of familiar with some creative elements"
            : "experimental and innovative with unique flavor combinations";

      const onlyUseOnHandInstructions = onlyUseOnHand
        ? `4. ONLY use ingredients from the available list above. Do NOT suggest any ingredients that are not listed.
5. If you need basic seasonings (salt, pepper, oil), you may include them ONLY if absolutely necessary.`
        : `4. You MAY suggest additional ingredients that would enhance the recipe, even if they're not in the available list.
5. Clearly distinguish between ingredients that are available vs. those that need to be purchased.`;

      const prompt =
        foodItems.length > 0
          ? `You are an intelligent kitchen assistant that creates recipes based on available ingredients, prioritizing items that are expiring soon to minimize food waste.

AVAILABLE INGREDIENTS:
${
  expiringIngredients.length > 0
    ? `
⚠️ URGENT - USE FIRST (expiring within 3 days):
${urgentIngredientsList}`
    : ""
}
${
  freshIngredients.length > 0
    ? `
Fresh ingredients (expiring within 7 days):
${freshIngredientsList}`
    : ""
}
${
  stableIngredients.length > 0
    ? `
Stable ingredients:
${stableIngredientsList}`
    : ""
}

Available cooking appliances: ${appliancesList}`
          : `You are an intelligent kitchen assistant that creates recipes. The user has no ingredients in their inventory, so you'll need to suggest a complete recipe with all necessary ingredients.

Available cooking appliances: ${appliancesList}`;

      const recipeInstructions =
        foodItems.length > 0
          ? `CRITICAL INSTRUCTIONS:
1. PRIORITIZE using ingredients marked as "URGENT" or expiring soon
2. Try to use AS MANY expiring ingredients as possible while still creating a delicious meal
3. You don't need to use ALL ingredients, but focus on those expiring first
${onlyUseOnHandInstructions}
6. Adjust quantities to match the requested number of servings (${servings})
7. Ensure total time fits within ${timeMap[timeConstraint as keyof typeof timeMap]}`
          : `INSTRUCTIONS:
1. Create a complete recipe with all necessary ingredients
2. All ingredients will be listed as "missing" since the user has no inventory
${onlyUseOnHandInstructions}
4. Adjust quantities to match the requested number of servings (${servings})
5. Ensure total time fits within ${timeMap[timeConstraint as keyof typeof timeMap]}`;

      const fullPrompt = `${prompt}

Recipe Requirements:
- Meal Type: ${mealType}
- Servings: ${servings} servings
- Time Constraint: ${timeMap[timeConstraint as keyof typeof timeMap]}
- Difficulty Level: ${difficulty}
- Style: ${creativityGuidance}
- Ingredient Restriction: ${onlyUseOnHand ? "ONLY use ingredients on hand" : "Can suggest additional ingredients"}

${recipeInstructions}

Respond ONLY with a valid JSON object in this exact format:
{
  "title": "Recipe name",
  "prepTime": "X minutes",
  "cookTime": "X minutes", 
  "servings": ${servings},
  "ingredients": ["ingredient 1 with quantity", "ingredient 2 with quantity"],
  "instructions": ["step 1", "step 2"],
  "usedIngredients": ["ingredient from inventory"],
  "missingIngredients": ["ingredient not in inventory"]
}`;

      let completion;
      try {
        completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: fullPrompt }],
          response_format: { type: "json_object" },
          max_completion_tokens: 1500,
        });
      } catch (openAIError: any) {
        console.error("OpenAI API error:", openAIError);
        if (openAIError.status === 429) {
          return res
            .status(429)
            .json({ error: "Rate limit exceeded. Please try again later." });
        }
        if (openAIError.status === 401 || openAIError.status === 403) {
          return res.status(503).json({
            error: "AI service configuration error. Please contact support.",
          });
        }
        return res
          .status(500)
          .json({ error: "AI service temporarily unavailable" });
      }

      const recipeData = JSON.parse(
        completion.choices[0]?.message?.content || "{}",
      );

      const recipe = await storage.createRecipe(userId, {
        title: recipeData.title,
        prepTime: recipeData.prepTime,
        cookTime: recipeData.cookTime,
        servings: recipeData.servings,
        ingredients: recipeData.ingredients,
        instructions: recipeData.instructions,
        usedIngredients: recipeData.usedIngredients,
        missingIngredients: recipeData.missingIngredients || [],
      });

      res.json(recipe);
    } catch (error) {
      console.error("Recipe generation error:", error);
      res.status(500).json({ error: "Failed to generate recipe" });
    }
  });

  app.get("/api/recipes", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 50); // Max 50 per page

      // Disable caching for inventory matching to ensure fresh results
      res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");

      // Always include inventory matching by default
      if (req.query.page || req.query.limit) {
        // If pagination params are provided, use paginated method
        const result = await storage.getRecipesPaginated(userId, page, limit);
        res.json(result);
      } else {
        // Default: always include inventory matching data
        const recipesWithMatching =
          await storage.getRecipesWithInventoryMatching(userId);
        res.json(recipesWithMatching);
      }
    } catch (error) {
      console.error("Error fetching recipes:", error);
      res.status(500).json({ error: "Failed to fetch recipes" });
    }
  });

  app.patch("/api/recipes/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const recipe = await storage.updateRecipe(userId, id, req.body);
      res.json(recipe);
    } catch (error) {
      console.error("Error updating recipe:", error);
      res.status(400).json({ error: "Failed to update recipe" });
    }
  });

  // Process recipe from image upload
  app.post(
    "/api/recipes/from-image",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const { image } = req.body; // Base64 encoded image or image URL

        if (!image) {
          return res.status(400).json({ error: "No image provided" });
        }

        // Create the prompt for recipe extraction
        const extractionPrompt = `You are a recipe extraction expert. Analyze this image of a recipe and extract all the information.
      
Return ONLY a valid JSON object with the following structure:
{
  "title": "Recipe name",
  "prepTime": "X minutes",
  "cookTime": "X minutes",
  "servings": number,
  "ingredients": ["ingredient 1 with quantity", "ingredient 2 with quantity"],
  "instructions": ["step 1", "step 2", "step 3"],
  "usedIngredients": [],
  "missingIngredients": []
}

Important:
- Extract ALL ingredients with their exact quantities
- Break down instructions into clear, numbered steps
- If prep time or cook time is not visible, estimate based on recipe complexity
- If servings is not specified, estimate based on ingredient quantities
- Leave usedIngredients and missingIngredients as empty arrays
- Ensure the JSON is properly formatted and parseable`;

        // Prepare the message with image
        const imageContent = image.startsWith("http")
          ? { type: "image_url" as const, image_url: { url: image } }
          : {
              type: "image_url" as const,
              image_url: { url: `data:image/jpeg;base64,${image}` },
            };

        // Call OpenAI with vision capabilities
        let completion;
        try {
          completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: extractionPrompt },
                  imageContent,
                ],
              },
            ],
            response_format: { type: "json_object" },
            max_completion_tokens: 8192,
          });
        } catch (openAIError: any) {
          console.error("OpenAI Vision API error:", openAIError);
          if (openAIError.status === 429) {
            return res
              .status(429)
              .json({ error: "Rate limit exceeded. Please try again later." });
          }
          if (openAIError.status === 401 || openAIError.status === 403) {
            return res.status(503).json({
              error: "AI service configuration error. Please contact support.",
            });
          }
          return res
            .status(500)
            .json({ error: "Failed to process image with AI service" });
        }

        const extractedData = JSON.parse(
          completion.choices[0]?.message?.content || "{}",
        );

        // Validate the extracted data
        if (
          !extractedData.title ||
          !extractedData.ingredients ||
          !extractedData.instructions
        ) {
          throw new Error(
            "Could not extract complete recipe information from the image",
          );
        }

        // Create the recipe in the database
        const recipe = await storage.createRecipe(userId, {
          title: extractedData.title,
          prepTime: extractedData.prepTime || "Unknown",
          cookTime: extractedData.cookTime || "Unknown",
          servings: extractedData.servings || 4,
          ingredients: extractedData.ingredients || [],
          instructions: extractedData.instructions || [],
          usedIngredients: extractedData.usedIngredients || [],
          missingIngredients: extractedData.missingIngredients || [],
        });

        res.json(recipe);
      } catch (error: any) {
        console.error("Recipe image processing error:", error);
        res.status(500).json({
          error: "Failed to extract recipe from image",
          details: error.message || "Unknown error occurred",
        });
      }
    },
  );

  // Analyze food item from image (for leftovers)
  app.post(
    "/api/food/analyze-image",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const { image } = req.body; // Base64 encoded image or image URL

        if (!image) {
          return res.status(400).json({ error: "No image provided" });
        }

        // Create the prompt for food analysis
        const analysisPrompt = `You are a food analysis expert. Analyze this image of a leftover meal or food item and extract nutritional information.
      
Return ONLY a valid JSON object with the following structure:
{
  "name": "Name of the dish or food item",
  "quantity": "Estimated portion size (e.g., '1 cup', '200g', '1 serving', '1 plate')",
  "unit": "The unit from quantity (e.g., 'cup', 'g', 'serving', 'plate')",
  "category": "Category (produce, dairy, meat, grains, leftovers, prepared_meal, etc.)",
  "ingredients": [
    {
      "name": "Ingredient name",
      "quantity": "Estimated amount",
      "unit": "Unit (g, oz, cup, tbsp, etc.)"
    }
  ],
  "calories": number (estimated total calories),
  "protein": number (estimated grams of protein),
  "carbs": number (estimated grams of carbohydrates),
  "fat": number (estimated grams of fat),
  "confidence": number (0-100, how confident you are in the analysis)
}

Important:
- Identify the main dish/food item and give it a descriptive name
- Estimate realistic portion sizes based on visual cues (plates, utensils, containers)
- Break down visible ingredients with approximate quantities
- Provide nutritional estimates based on typical recipes and portion sizes
- Use confidence score to indicate certainty (100 = very clear image and common dish, 50 = unclear or unusual)
- For complex dishes, list main visible ingredients
- Consider cooking methods (fried, grilled, steamed) when estimating nutrition
- If it's clearly a leftover meal, categorize as "leftovers" or "prepared_meal"`;

        // Prepare the message with image
        const imageContent = image.startsWith("http")
          ? { type: "image_url" as const, image_url: { url: image } }
          : {
              type: "image_url" as const,
              image_url: { url: `data:image/jpeg;base64,${image}` },
            };

        // Call OpenAI with vision capabilities
        let completion;
        try {
          completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "user",
                content: [{ type: "text", text: analysisPrompt }, imageContent],
              },
            ],
            response_format: { type: "json_object" },
            max_completion_tokens: 8192,
          });
        } catch (openAIError: any) {
          console.error("OpenAI Vision API error:", openAIError);
          if (openAIError.status === 429) {
            return res
              .status(429)
              .json({ error: "Rate limit exceeded. Please try again later." });
          }
          if (openAIError.status === 401 || openAIError.status === 403) {
            return res.status(503).json({
              error: "AI service configuration error. Please contact support.",
            });
          }
          return res
            .status(500)
            .json({ error: "Failed to process image with AI service" });
        }

        const analysisData = JSON.parse(
          completion.choices[0]?.message?.content || "{}",
        );

        // Validate the analyzed data
        if (!analysisData.name || analysisData.confidence === undefined) {
          throw new Error("Could not analyze food item from the image");
        }

        // Return the analysis (don't save to database yet, let frontend handle that)
        res.json({
          success: true,
          analysis: analysisData,
        });
      } catch (error: any) {
        console.error("Food image analysis error:", error);
        res.status(500).json({
          error: "Failed to analyze food from image",
          details: error.message || "Unknown error occurred",
        });
      }
    },
  );

  // Expiration Notifications (user-scoped)
  app.get(
    "/api/notifications/expiration",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const daysThreshold = 3; // Get items expiring within 3 days
        const expiringItems = await storage.getExpiringItems(
          userId,
          daysThreshold,
        );

        const now = new Date();
        const notifications = expiringItems
          .filter((item) => !item.notificationDismissed && item.expirationDate)
          .map((item) => {
            const expiry = new Date(item.expirationDate);
            const daysUntil = Math.ceil(
              (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
            );
            return {
              id: item.id,
              foodItemId: item.id,
              foodItemName: item.name,
              expirationDate: item.expirationDate,
              daysUntilExpiry: daysUntil,
              dismissed: item.notificationDismissed || false,
            };
          })
          .filter((notification) => notification.daysUntilExpiry >= 0);

        res.json(notifications);
      } catch (error) {
        console.error("Error fetching expiration notifications:", error);
        res.status(500).json({ error: "Failed to fetch notifications" });
      }
    },
  );

  app.post(
    "/api/notifications/expiration/check",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const expiringItems = await storage.getExpiringItems(userId, 3);
        const now = new Date();

        // Simply return expiring items that haven't been dismissed
        const notifications = expiringItems
          .filter((item) => !item.notificationDismissed && item.expirationDate)
          .map((item) => {
            const expiry = new Date(item.expirationDate);
            const daysUntil = Math.ceil(
              (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
            );
            return {
              id: item.id,
              foodItemId: item.id,
              foodItemName: item.name,
              expirationDate: item.expirationDate,
              daysUntilExpiry: daysUntil,
              dismissed: item.notificationDismissed || false,
            };
          })
          .filter((notification) => notification.daysUntilExpiry >= 0);

        res.json({ notifications, count: notifications.length });
      } catch (error) {
        console.error("Notification check error:", error);
        res.status(500).json({ error: "Failed to check for expiring items" });
      }
    },
  );

  app.post(
    "/api/notifications/:id/dismiss",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const { id } = req.params;
        // id is the foodItemId in the new schema
        await storage.dismissFoodItemNotification(userId, id);
        res.json({ success: true });
      } catch (error) {
        console.error("Error dismissing notification:", error);
        res.status(500).json({ error: "Failed to dismiss notification" });
      }
    },
  );

  // Nutrition Statistics (user-scoped)
  app.get("/api/nutrition/stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const foodItems = await storage.getFoodItems(userId);

      let totalCalories = 0;
      let totalProtein = 0;
      let totalCarbs = 0;
      let totalFat = 0;
      let itemsWithNutrition = 0;

      const categoryBreakdown: Record<
        string,
        { calories: number; count: number }
      > = {};

      foodItems.forEach((item) => {
        if (item.nutrition && item.weightInGrams) {
          try {
            const nutrition = JSON.parse(item.nutrition);
            const servingSize = parseFloat(nutrition.servingSize) || 100;
            // Multiplier is weightInGrams / servingSize
            const multiplier = item.weightInGrams / servingSize;

            totalCalories += nutrition.calories * multiplier;
            totalProtein += nutrition.protein * multiplier;
            totalCarbs += nutrition.carbs * multiplier;
            totalFat += nutrition.fat * multiplier;
            itemsWithNutrition++;

            const locationId = item.storageLocationId;
            if (!categoryBreakdown[locationId]) {
              categoryBreakdown[locationId] = { calories: 0, count: 0 };
            }
            categoryBreakdown[locationId].calories +=
              nutrition.calories * multiplier;
            categoryBreakdown[locationId].count++;
          } catch (e) {
            // Skip items with invalid nutrition data
          }
        }
      });

      res.json({
        totalCalories: Math.round(totalCalories),
        totalProtein: Math.round(totalProtein * 10) / 10,
        totalCarbs: Math.round(totalCarbs * 10) / 10,
        totalFat: Math.round(totalFat * 10) / 10,
        itemsWithNutrition,
        totalItems: foodItems.length,
        categoryBreakdown,
      });
    } catch (error) {
      console.error("Error fetching nutrition stats:", error);
      res.status(500).json({ error: "Failed to fetch nutrition stats" });
    }
  });

  app.get("/api/nutrition/items", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const foodItems = await storage.getFoodItems(userId);
      const locations = await storage.getStorageLocations(userId);

      const itemsWithNutrition = foodItems
        .filter((item) => item.nutrition && item.weightInGrams)
        .map((item) => {
          const location = locations.find(
            (loc) => loc.id === item.storageLocationId,
          );
          let nutrition = null;
          try {
            nutrition = JSON.parse(item.nutrition!);
          } catch (e) {
            // Skip invalid nutrition
          }
          return {
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            weightInGrams: item.weightInGrams,
            locationName: location?.name || "Unknown",
            nutrition,
          };
        })
        .filter((item) => item.nutrition !== null);

      res.json(itemsWithNutrition);
    } catch (error) {
      console.error("Error fetching nutrition items:", error);
      res.status(500).json({ error: "Failed to fetch nutrition items" });
    }
  });

  app.get(
    "/api/nutrition/items/missing",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const foodItems = await storage.getFoodItems(userId);
        const locations = await storage.getStorageLocations(userId);

        const itemsWithoutNutrition = foodItems
          .filter((item) => !item.nutrition || !item.weightInGrams)
          .map((item) => {
            const location = locations.find(
              (loc) => loc.id === item.storageLocationId,
            );
            return {
              id: item.id,
              name: item.name,
              quantity: item.quantity,
              unit: item.unit,
              fcdId: item.fcdId,
              locationName: location?.name || "Unknown",
            };
          });

        res.json(itemsWithoutNutrition);
      } catch (error) {
        console.error("Error fetching items missing nutrition:", error);
        res
          .status(500)
          .json({ error: "Failed to fetch items missing nutrition" });
      }
    },
  );

  // Waste reduction suggestions (user-scoped)
  app.get(
    "/api/suggestions/waste-reduction",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const expiringItems = await storage.getExpiringItems(userId, 5);

        if (expiringItems.length === 0) {
          return res.json({ suggestions: [] });
        }

        // Get ALL food items for context
        const allItems = await storage.getFoodItems(userId);

        // Categorize items
        const expiringList = expiringItems
          .map((item) => {
            const daysLeft = Math.ceil(
              (new Date(item.expirationDate!).getTime() - Date.now()) /
                (1000 * 60 * 60 * 24),
            );
            return `${item.name} (${item.quantity} ${item.unit || ""}, expires in ${daysLeft} days)`;
          })
          .join(", ");

        // Get non-expiring items that could be used in recipes
        const otherItems = allItems
          .filter((item) => !expiringItems.some((exp) => exp.id === item.id))
          .slice(0, 20) // Limit to avoid token limits
          .map((item) => `${item.name} (${item.quantity} ${item.unit || ""})`)
          .join(", ");

        const appliances = await storage.getAppliances(userId);
        const appliancesList =
          appliances.map((a) => a.name).join(", ") ||
          "standard kitchen appliances";

        const prompt = `You are a helpful kitchen assistant providing quick waste reduction tips.

ITEMS EXPIRING SOON (focus on these):
${expiringList}

OTHER AVAILABLE INGREDIENTS:
${otherItems}

Generate 3 QUICK TIPS for using the expiring items. Tips should be:
- Short substitution suggestions ("Use your expiring milk instead of water in...")
- Creative combinations ("Try mixing your feta with...")
- Alternative uses ("Your bacon could add flavor to...")
- Storage tips or preservation methods
- Quick ideas, NOT full recipes

Focus on practical, actionable tips that help use expiring items in unexpected ways or as substitutes. Be specific about which expiring items you're referring to.

Respond ONLY with a valid JSON object:
{
  "suggestions": ["tip 1", "tip 2", "tip 3"]
}`;

        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
          max_completion_tokens: 8192,
        });

        const data = JSON.parse(
          completion.choices[0].message.content || '{"suggestions":[]}',
        );
        res.json(data);
      } catch (error) {
        console.error("Waste reduction error:", error);
        res.status(500).json({ error: "Failed to generate suggestions" });
      }
    },
  );

  // Meal Plans (user-scoped)
  app.get("/api/meal-plans", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { startDate, endDate } = req.query;
      const plans = await storage.getMealPlans(
        userId,
        startDate as string | undefined,
        endDate as string | undefined,
      );
      res.json(plans);
    } catch (error) {
      console.error("Error fetching meal plans:", error);
      res.status(500).json({ error: "Failed to fetch meal plans" });
    }
  });

  app.post("/api/meal-plans", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validated = insertMealPlanSchema.parse(req.body);
      const plan = await storage.createMealPlan(userId, validated);
      res.json(plan);
    } catch (error) {
      console.error("Error creating meal plan:", error);
      res.status(400).json({ error: "Invalid meal plan data" });
    }
  });

  app.put("/api/meal-plans/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const validated = insertMealPlanSchema.partial().parse(req.body);
      const plan = await storage.updateMealPlan(userId, id, validated);
      res.json(plan);
    } catch (error) {
      console.error("Error updating meal plan:", error);
      res.status(400).json({ error: "Failed to update meal plan" });
    }
  });

  app.delete("/api/meal-plans/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      await storage.deleteMealPlan(userId, id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting meal plan:", error);
      res.status(500).json({ error: "Failed to delete meal plan" });
    }
  });

  // Shopping list generation (user-scoped)
  app.post(
    "/api/shopping-list/generate",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const { recipeIds } = req.body;

        if (!recipeIds || !Array.isArray(recipeIds) || recipeIds.length === 0) {
          return res.status(400).json({ error: "Recipe IDs are required" });
        }

        const recipes = await Promise.all(
          recipeIds.map((id: string) => storage.getRecipe(userId, id)),
        );

        const validRecipes = recipes.filter((r) => r !== undefined);
        if (validRecipes.length === 0) {
          return res.status(404).json({ error: "No valid recipes found" });
        }

        const allMissingIngredients = validRecipes.flatMap(
          (r) => r!.missingIngredients || [],
        );
        const uniqueIngredients = Array.from(new Set(allMissingIngredients));

        res.json({ items: uniqueIngredients });
      } catch (error) {
        console.error("Shopping list error:", error);
        res.status(500).json({ error: "Failed to generate shopping list" });
      }
    },
  );

  // Shopping List Item endpoints
  app.get(
    "/api/shopping-list/items",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const items = await storage.getShoppingListItems(userId);
        res.json(items);
      } catch (error) {
        console.error("Error fetching shopping list items:", error);
        res.status(500).json({ error: "Failed to fetch shopping list items" });
      }
    },
  );

  app.post(
    "/api/shopping-list/items",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        // Map 'name' field to 'ingredient' to match database schema
        const itemData = {
          ...req.body,
          ingredient: req.body.ingredient || req.body.name, // Support both field names
        };
        // Remove 'name' field if it exists to avoid confusion
        delete itemData.name;

        const newItem = await storage.createShoppingListItem(userId, itemData);
        res.json(newItem);
      } catch (error) {
        console.error("Error creating shopping list item:", error);
        res.status(500).json({ error: "Failed to create shopping list item" });
      }
    },
  );

  app.post(
    "/api/shopping-list/add-missing",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const { recipeId, ingredients } = req.body;

        if (!recipeId || !ingredients || !Array.isArray(ingredients)) {
          return res
            .status(400)
            .json({ error: "Recipe ID and ingredients array are required" });
        }

        const newItems = await storage.addMissingIngredientsToShoppingList(
          userId,
          recipeId,
          ingredients,
        );
        res.json(newItems);
      } catch (error) {
        console.error("Error adding missing ingredients:", error);
        res.status(500).json({
          error: "Failed to add missing ingredients to shopping list",
        });
      }
    },
  );

  app.patch(
    "/api/shopping-list/items/:id",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const { id } = req.params;
        const updated = await storage.updateShoppingListItem(
          userId,
          id,
          req.body,
        );
        res.json(updated);
      } catch (error) {
        console.error("Error updating shopping list item:", error);
        res.status(500).json({ error: "Failed to update shopping list item" });
      }
    },
  );

  app.delete(
    "/api/shopping-list/items/:id",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const { id } = req.params;
        await storage.deleteShoppingListItem(userId, id);
        res.json({ success: true });
      } catch (error) {
        console.error("Error deleting shopping list item:", error);
        res.status(500).json({ error: "Failed to delete shopping list item" });
      }
    },
  );

  app.delete(
    "/api/shopping-list/clear-checked",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        await storage.clearCheckedShoppingListItems(userId);
        res.json({ success: true });
      } catch (error) {
        console.error("Error clearing checked items:", error);
        res.status(500).json({ error: "Failed to clear checked items" });
      }
    },
  );

  // Feedback System Routes
  app.post("/api/feedback", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;

      if (!userId) {
        console.error("User ID not found in session:", req.user);
        return res
          .status(401)
          .json({ error: "User not authenticated properly" });
      }

      const validated = insertFeedbackSchema.parse(req.body);

      let enrichedFeedback: typeof validated & {
        isFlagged?: boolean;
        flagReason?: string | null;
        similarTo?: string | null;
      } = { ...validated };

      if (validated.content && validated.content.length > 10) {
        try {
          const existingFeedback = await storage.getUserFeedback(userId, 20);
          const { moderateFeedback } = await import("./feedbackModerator");

          const moderation = await moderateFeedback(
            validated.content,
            validated.type,
            existingFeedback,
          );

          enrichedFeedback = {
            ...enrichedFeedback,
            isFlagged: moderation.isFlagged,
            flagReason: moderation.flagReason,
            category: moderation.category || enrichedFeedback.category,
            priority:
              (moderation.priority as "low" | "medium" | "high" | "critical") ||
              enrichedFeedback.priority ||
              "medium",
            sentiment:
              (moderation.sentiment as
                | "positive"
                | "negative"
                | "neutral"
                | undefined) || enrichedFeedback.sentiment,
            tags: moderation.tags || enrichedFeedback.tags,
            similarTo: moderation.similarTo,
          };
        } catch (aiError) {
          console.error("Failed to moderate feedback:", aiError);
        }
      }

      const feedback = await storage.createFeedback(userId, enrichedFeedback);
      res.json(feedback);
    } catch (error) {
      console.error("Error creating feedback:", error);
      if (error instanceof z.ZodError) {
        res
          .status(400)
          .json({ error: "Invalid feedback data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create feedback" });
      }
    }
  });

  app.get("/api/feedback", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const limit = parseInt(req.query.limit as string) || 50;
      const feedback = await storage.getUserFeedback(userId, limit);
      res.json(feedback);
    } catch (error) {
      console.error("Error fetching feedback:", error);
      res.status(500).json({ error: "Failed to fetch feedback" });
    }
  });

  // Community Feedback Routes - must come before /api/feedback/:id to avoid route collision
  app.get("/api/feedback/community", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const type = req.query.type as string | undefined;
      const sortBy = (req.query.sortBy as "upvotes" | "recent") || "recent";
      const limit = parseInt(req.query.limit as string) || 50;

      const feedback = await storage.getCommunityFeedbackForUser(
        userId,
        type,
        sortBy,
        limit,
      );
      res.json(feedback);
    } catch (error) {
      console.error("Error fetching community feedback:", error);
      res.status(500).json({ error: "Failed to fetch community feedback" });
    }
  });

  app.get("/api/feedback/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const feedback = await storage.getFeedback(userId, id);

      if (!feedback) {
        return res.status(404).json({ error: "Feedback not found" });
      }

      res.json(feedback);
    } catch (error) {
      console.error("Error fetching feedback:", error);
      res.status(500).json({ error: "Failed to fetch feedback" });
    }
  });

  app.get(
    "/api/feedback/context/:contextType/:contextId",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const { contextType, contextId } = req.params;
        const feedback = await storage.getFeedbackByContext(
          contextId,
          contextType,
        );
        res.json(feedback);
      } catch (error) {
        console.error("Error fetching feedback by context:", error);
        res.status(500).json({ error: "Failed to fetch feedback by context" });
      }
    },
  );

  app.get(
    "/api/feedback/analytics/summary",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const days = parseInt(req.query.days as string) || 30;
        const analytics = await storage.getFeedbackAnalytics(userId, days);
        res.json(analytics);
      } catch (error) {
        console.error("Error fetching feedback analytics:", error);
        res.status(500).json({ error: "Failed to fetch feedback analytics" });
      }
    },
  );

  app.patch(
    "/api/feedback/:id/status",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const { id } = req.params;
        const { status, estimatedTurnaround } = req.body;

        if (
          !status ||
          !["open", "in_progress", "completed", "wont_fix"].includes(status)
        ) {
          return res.status(400).json({ error: "Invalid status" });
        }

        const resolvedAt = status === "completed" ? new Date() : undefined;
        const updated = await storage.updateFeedbackStatus(
          id,
          status,
          estimatedTurnaround,
          resolvedAt,
        );
        res.json(updated);
      } catch (error) {
        console.error("Error updating feedback status:", error);
        res.status(500).json({ error: "Failed to update feedback status" });
      }
    },
  );

  app.post(
    "/api/feedback/:id/responses",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const { id } = req.params;
        const { response, action } = req.body;

        if (!response) {
          return res.status(400).json({ error: "Response is required" });
        }

        const feedbackResponse = await storage.addFeedbackResponse(id, {
          response,
          action,
          responderId: req.user.claims.sub,
          createdAt: new Date().toISOString(),
        });

        res.json(feedbackResponse);
      } catch (error) {
        console.error("Error adding feedback response:", error);
        res.status(500).json({ error: "Failed to add feedback response" });
      }
    },
  );

  app.get(
    "/api/feedback/:id/responses",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const { id } = req.params;
        const responses = await storage.getFeedbackResponses(id);
        res.json(responses);
      } catch (error) {
        console.error("Error fetching feedback responses:", error);
        res.status(500).json({ error: "Failed to fetch feedback responses" });
      }
    },
  );

  // Admin endpoint to seed/refresh common food items (for instant onboarding)
  app.post(
    "/api/admin/seed-common-food-items",
    isAuthenticated,
    async (req: any, res) => {
      try {
        // Check if user is admin (you may want to add proper admin check)
        // For now, we'll allow any authenticated user to seed (change this in production)
        const forceUpdate = req.body.forceUpdate || false;

        console.log("Starting to seed common food items via admin endpoint...");

        // Import and run the seeding function
        const { seedCommonFoodItems } = await import(
          "./seed-common-food-items"
        );
        const result = await seedCommonFoodItems(forceUpdate);

        res.json({
          success: true,
          message: "Common food items seeded successfully",
          ...result,
        });
      } catch (error: any) {
        console.error("Error seeding common food items:", error);
        res.status(500).json({
          error: "Failed to seed common food items",
          details: error.message,
        });
      }
    },
  );

  // Admin feedback endpoints (for viewing all feedback)
  app.get("/api/admin/feedback", isAuthenticated, async (req: any, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const status = req.query.status as string;

      const result = await storage.getAllFeedback(limit, offset, status);
      res.json(result);
    } catch (error) {
      console.error("Error fetching all feedback:", error);
      res.status(500).json({ error: "Failed to fetch all feedback" });
    }
  });

  app.get(
    "/api/admin/feedback/analytics",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const days = parseInt(req.query.days as string) || 30;
        const analytics = await storage.getFeedbackAnalytics(undefined, days);
        res.json(analytics);
      } catch (error) {
        console.error("Error fetching global feedback analytics:", error);
        res
          .status(500)
          .json({ error: "Failed to fetch global feedback analytics" });
      }
    },
  );

  // Upvote routes
  app.post(
    "/api/feedback/:id/upvote",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const { id } = req.params;

        await storage.upvoteFeedback(userId, id);
        const upvoteCount = await storage.getFeedbackUpvoteCount(id);

        res.json({ success: true, upvoteCount });
      } catch (error) {
        console.error("Error upvoting feedback:", error);
        res.status(500).json({ error: "Failed to upvote feedback" });
      }
    },
  );

  app.delete(
    "/api/feedback/:id/upvote",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const { id } = req.params;

        await storage.removeUpvote(userId, id);
        const upvoteCount = await storage.getFeedbackUpvoteCount(id);

        res.json({ success: true, upvoteCount });
      } catch (error) {
        console.error("Error removing upvote:", error);
        res.status(500).json({ error: "Failed to remove upvote" });
      }
    },
  );

  // Donation routes (from blueprint:javascript_stripe)
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2024-10-28.acacia" as any,
  });

  // Create payment intent for donation
  app.post("/api/donations/create-payment-intent", async (req: any, res) => {
    try {
      const { amount, donorEmail, donorName, message, anonymous } = req.body;

      // Validate amount
      if (!amount || amount < 100) {
        // Minimum $1.00
        return res
          .status(400)
          .json({ error: "Minimum donation amount is $1.00" });
      }

      // Create Stripe payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount), // Amount is already in cents
        currency: "usd",
        metadata: {
          donorEmail: donorEmail || "",
          donorName: donorName || "Anonymous",
          message: message || "",
          anonymous: String(anonymous || false),
        },
      });

      // Create donation record in database
      const userId = req.user?.claims?.sub || null; // Allow anonymous donations
      const donation = await storage.createDonation({
        userId,
        stripePaymentIntentId: paymentIntent.id,
        amount: Math.round(amount),
        currency: "usd",
        status: "pending",
        donorEmail,
        donorName,
        message,
        anonymous: anonymous || false,
      });

      res.json({
        clientSecret: paymentIntent.client_secret,
        donationId: donation.id,
      });
    } catch (error: any) {
      console.error("Error creating payment intent:", error);
      res.status(500).json({
        error: "Failed to create payment intent",
        message: error.message,
      });
    }
  });

  // Webhook to handle Stripe payment events
  app.post("/api/donations/webhook", async (req: any, res) => {
    const sig = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
      if (webhookSecret) {
        // Verify webhook signature if secret is configured
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      } else {
        // For testing without webhook secret
        event = req.body;
      }
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
      case "payment_intent.succeeded":
        const paymentIntent = event.data.object;
        await storage.updateDonation(paymentIntent.id, {
          status: "succeeded",
        });
        break;

      case "payment_intent.payment_failed":
        const failedPaymentIntent = event.data.object;
        await storage.updateDonation(failedPaymentIntent.id, {
          status: "failed",
        });
        break;

      case "payment_intent.canceled":
        const canceledPaymentIntent = event.data.object;
        await storage.updateDonation(canceledPaymentIntent.id, {
          status: "canceled",
        });
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  });

  // Get donation statistics
  app.get("/api/donations/stats", async (req: any, res) => {
    try {
      const stats = await storage.getTotalDonations();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching donation stats:", error);
      res.status(500).json({ error: "Failed to fetch donation statistics" });
    }
  });

  // Update donation with donor info (called before payment confirmation)
  app.post("/api/donations/update-donor-info", async (req: any, res) => {
    try {
      // Validate request body
      const updateDonorSchema = z.object({
        paymentIntentId: z.string().min(1),
        donorName: z.string().optional(),
        donorEmail: z.string().email().optional(),
        message: z.string().optional(),
        anonymous: z.boolean().optional(),
      });

      const validatedData = updateDonorSchema.parse(req.body);

      // Verify the payment intent exists in Stripe before updating
      try {
        await stripe.paymentIntents.retrieve(validatedData.paymentIntentId);
      } catch (stripeError) {
        return res.status(404).json({ error: "Invalid payment intent" });
      }

      // Update donation record with donor information
      const updateData: any = {};
      if (validatedData.donorName !== undefined)
        updateData.donorName = validatedData.donorName;
      if (validatedData.donorEmail !== undefined)
        updateData.donorEmail = validatedData.donorEmail;
      if (validatedData.message !== undefined)
        updateData.message = validatedData.message;
      if (validatedData.anonymous !== undefined)
        updateData.anonymous = validatedData.anonymous;

      await storage.updateDonation(validatedData.paymentIntentId, updateData);
      res.json({ success: true });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ error: "Invalid request data", details: error.errors });
      }
      console.error("Error updating donor info:", error);
      res.status(500).json({ error: "Failed to update donor information" });
    }
  });

  // Confirm donation payment status (called from success page)
  app.post("/api/donations/confirm", async (req: any, res) => {
    try {
      // Validate request body
      const confirmSchema = z.object({
        paymentIntentId: z.string().min(1),
      });

      const { paymentIntentId } = confirmSchema.parse(req.body);

      // Get payment intent from Stripe to check status
      const paymentIntent =
        await stripe.paymentIntents.retrieve(paymentIntentId);

      // Verify the donation exists in our database
      const existingDonation =
        await storage.getDonationByPaymentIntent(paymentIntentId);
      if (!existingDonation) {
        return res.status(404).json({ error: "Donation not found" });
      }

      // Update donation status based on Stripe payment status
      if (paymentIntent.status === "succeeded") {
        const donation = await storage.updateDonation(paymentIntentId, {
          status: "succeeded",
        });
        res.json({ status: "succeeded", donation });
      } else if (paymentIntent.status === "processing") {
        res.json({ status: "processing" });
      } else {
        res.json({ status: paymentIntent.status });
      }
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ error: "Invalid request data", details: error.errors });
      }
      if (error.type === "StripeInvalidRequestError") {
        return res.status(404).json({ error: "Payment intent not found" });
      }
      console.error("Error confirming donation:", error);
      res.status(500).json({ error: "Failed to confirm donation" });
    }
  });

  // Get recent donations (public, anonymous info only)
  app.get("/api/donations/recent", async (req: any, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const { donations } = await storage.getDonations(limit, 0);

      // Filter out personal information for public display
      const publicDonations = donations.map((d) => ({
        id: d.id,
        amount: d.amount,
        currency: d.currency,
        donorName: d.anonymous ? "Anonymous" : d.donorName || "Anonymous",
        message: d.anonymous ? null : d.message,
        createdAt: d.createdAt,
      }));

      res.json(publicDonations);
    } catch (error) {
      console.error("Error fetching recent donations:", error);
      res.status(500).json({ error: "Failed to fetch recent donations" });
    }
  });

  // Get user's own donations (authenticated)
  app.get(
    "/api/donations/my-donations",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const donations = await storage.getUserDonations(userId);
        res.json(donations);
      } catch (error) {
        console.error("Error fetching user donations:", error);
        res.status(500).json({ error: "Failed to fetch your donations" });
      }
    },
  );

  // Push notification token endpoints
  app.post("/api/push-token", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { token, platform, deviceInfo } = req.body;

      if (!token || !platform) {
        return res
          .status(400)
          .json({ error: "Token and platform are required" });
      }

      // Validate platform
      const validPlatforms = ["ios", "android", "web"];
      if (!validPlatforms.includes(platform)) {
        return res
          .status(400)
          .json({ error: "Invalid platform. Must be ios, android, or web" });
      }

      const savedToken = await storage.upsertPushToken(userId, {
        token,
        platform,
        deviceInfo: deviceInfo || null,
      });

      res.json(savedToken);
    } catch (error) {
      console.error("Error saving push token:", error);
      res.status(500).json({ error: "Failed to save push token" });
    }
  });

  app.delete(
    "/api/push-token/:token",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const { token } = req.params;

        // This will only delete the token if it belongs to the authenticated user
        await storage.deletePushToken(userId, token);
        res.json({ success: true });
      } catch (error) {
        console.error("Error deleting push token:", error);
        res.status(500).json({ error: "Failed to delete push token" });
      }
    },
  );

  // Rate limiting for analytics - simple in-memory implementation
  const analyticsRateLimitMap = new Map<string, { count: number; resetTime: number }>();
  const ANALYTICS_RATE_LIMIT = 60; // Max 60 requests per minute per IP
  const ANALYTICS_WINDOW_MS = 60000; // 1 minute window
  
  // Cleanup old entries periodically
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of analyticsRateLimitMap.entries()) {
      if (value.resetTime < now) {
        analyticsRateLimitMap.delete(key);
      }
    }
  }, ANALYTICS_WINDOW_MS);

  // Web Vitals Analytics endpoint
  app.post("/api/analytics", async (req: any, res) => {
    try {
      // Rate limiting check
      const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
      const now = Date.now();
      const rateInfo = analyticsRateLimitMap.get(clientIp);
      
      if (rateInfo) {
        if (rateInfo.resetTime > now) {
          if (rateInfo.count >= ANALYTICS_RATE_LIMIT) {
            return res.status(429).json({ 
              error: 'Too many analytics requests. Please slow down.',
              retryAfter: Math.ceil((rateInfo.resetTime - now) / 1000)
            });
          }
          rateInfo.count++;
        } else {
          // Reset window
          rateInfo.count = 1;
          rateInfo.resetTime = now + ANALYTICS_WINDOW_MS;
        }
      } else {
        // First request from this IP
        analyticsRateLimitMap.set(clientIp, { 
          count: 1, 
          resetTime: now + ANALYTICS_WINDOW_MS 
        });
      }
      
      // Get user ID if authenticated, otherwise null for anonymous tracking
      const userId = req.user?.claims?.sub || null;

      // Capture request metadata
      const userAgent = req.headers["user-agent"] || null;
      const url = req.headers["referer"] || req.headers["origin"] || null;

      // Validate using Zod schema
      const validated = insertWebVitalSchema.parse({
        ...req.body,
        userId,
        metricId: req.body.id, // Map 'id' from web-vitals to 'metricId'
        navigationType: req.body.navigationType || null,
        userAgent,
        url,
      });

      await storage.recordWebVital(validated);

      res.status(200).json({ success: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ error: "Invalid web vital data", details: error.errors });
      }
      console.error("Error recording web vital:", error);
      res.status(500).json({ error: "Failed to record web vital" });
    }
  });

  // Get Web Vitals statistics (optional admin endpoint)
  app.get("/api/analytics/stats", async (req: any, res) => {
    try {
      const { metric, days } = req.query;

      // Validate days parameter
      let daysNum = 7; // default
      if (days) {
        const parsed = parseInt(days as string);
        if (isNaN(parsed) || parsed < 1 || parsed > 365) {
          return res.status(400).json({
            error:
              "Invalid 'days' parameter. Must be a number between 1 and 365",
          });
        }
        daysNum = parsed;
      }

      const stats = await storage.getWebVitalsStats(
        metric as string | undefined,
        daysNum,
      );
      res.json(stats);
    } catch (error) {
      console.error("Error getting web vitals stats:", error);
      res.status(500).json({ error: "Failed to get web vitals stats" });
    }
  });

  // Cooking Terms Routes

  // Get all cooking terms or search
  app.get("/api/cooking-terms", async (req: any, res) => {
    try {
      const { search, category } = req.query;

      let terms;
      if (search) {
        terms = await storage.searchCookingTerms(search as string);
      } else if (category) {
        terms = await storage.getCookingTermsByCategory(category as string);
      } else {
        terms = await storage.getCookingTerms();
      }

      res.json(terms);
    } catch (error) {
      console.error("Error getting cooking terms:", error);
      res.status(500).json({ error: "Failed to get cooking terms" });
    }
  });

  // Get a specific cooking term by ID
  app.get("/api/cooking-terms/:id", async (req: any, res) => {
    try {
      const { id } = req.params;
      const term = await storage.getCookingTerm(id);

      if (!term) {
        return res.status(404).json({ error: "Cooking term not found" });
      }

      res.json(term);
    } catch (error) {
      console.error("Error getting cooking term:", error);
      res.status(500).json({ error: "Failed to get cooking term" });
    }
  });

  // Get cooking term by term name
  app.get("/api/cooking-terms/by-name/:term", async (req: any, res) => {
    try {
      const { term } = req.params;
      const cookingTerm = await storage.getCookingTermByTerm(term);

      if (!cookingTerm) {
        return res.status(404).json({ error: "Cooking term not found" });
      }

      res.json(cookingTerm);
    } catch (error) {
      console.error("Error getting cooking term by name:", error);
      res.status(500).json({ error: "Failed to get cooking term" });
    }
  });

  // Create a new cooking term (admin only - for now open to all authenticated users)
  app.post("/api/cooking-terms", isAuthenticated, async (req: any, res) => {
    try {
      const termData = req.body;

      // Basic validation
      if (
        !termData.term ||
        !termData.category ||
        !termData.shortDefinition ||
        !termData.longDefinition
      ) {
        return res.status(400).json({
          error:
            "Missing required fields: term, category, shortDefinition, longDefinition",
        });
      }

      const newTerm = await storage.createCookingTerm(termData);
      res.json(newTerm);
    } catch (error: any) {
      if (error.message?.includes("unique constraint")) {
        return res
          .status(409)
          .json({ error: "A cooking term with this name already exists" });
      }
      console.error("Error creating cooking term:", error);
      res.status(500).json({ error: "Failed to create cooking term" });
    }
  });

  // Update a cooking term (admin only - for now open to all authenticated users)
  app.put("/api/cooking-terms/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const updatedTerm = await storage.updateCookingTerm(id, updates);
      res.json(updatedTerm);
    } catch (error: any) {
      if (error.message === "Cooking term not found") {
        return res.status(404).json({ error: "Cooking term not found" });
      }
      console.error("Error updating cooking term:", error);
      res.status(500).json({ error: "Failed to update cooking term" });
    }
  });

  // Delete a cooking term (admin only - for now open to all authenticated users)
  app.delete(
    "/api/cooking-terms/:id",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const { id } = req.params;
        await storage.deleteCookingTerm(id);
        res.json({ success: true });
      } catch (error) {
        console.error("Error deleting cooking term:", error);
        res.status(500).json({ error: "Failed to delete cooking term" });
      }
    },
  );

  // Seed initial cooking terms data
  app.post(
    "/api/cooking-terms/seed",
    isAuthenticated,
    createSeedEndpoint(storage),
  );

  // Handle 404s for API routes that weren't matched above
  app.use("/api/*", (_req: any, res) => {
    res.status(404).json({ message: "API endpoint not found" });
  });

  const httpServer = createServer(app);
  return httpServer;
}
