import { Router, Request, Response, NextFunction } from "express";
import { db } from "../db";
import { users, userSessions, userSyncData, subscriptions, userAppliances, passwordResetTokens, userInventoryItems, userSavedRecipes, userMealPlans, userShoppingItems, userCookwareItems } from "@shared/schema";
import { eq, and, inArray, lt, isNull } from "drizzle-orm";
import { extractExtraData, recipeKnownKeys, mealPlanKnownKeys, shoppingListKnownKeys, cookwareKnownKeys } from "./sync/sync-helpers";
import { randomBytes } from "crypto";
import { AUTH_COOKIE_NAME, setAuthCookie, clearAuthCookie } from "../lib/session-utils";
import { z } from "zod";
import { checkCookwareLimit, checkFeatureAccess } from "../services/subscriptionService";
import { csrfProtection, generateCsrfToken } from "../middleware/csrf";
import { requireAuth } from "../middleware/auth";
import { passwordResetLimiter } from "../middleware/rateLimiter";
import { logger } from "../lib/logger";
import { AppError } from "../middleware/errorHandler";
import { successResponse } from "../lib/apiResponse";
import { hashToken } from "../lib/auth-utils";
import { registerWithEmail, loginWithEmail, logoutSession, revokeSession, revokeAllOtherSessions, validatePassword, hashPassword } from "../domain/services";
import { deleteAccount } from "../domain/services";

const syncPreferencesSchema = z.object({
  servingSize: z.coerce.number().int().min(1).max(10).optional(),
  dailyMeals: z.coerce.number().int().min(1).max(10).optional(),
  dietaryRestrictions: z.array(z.string().max(100)).max(50).optional(),
  cuisinePreferences: z.array(z.string().max(100)).max(50).optional(),
  storageAreas: z.array(z.string().max(50)).max(20).optional(),
  cookingLevel: z.enum(["basic", "intermediate", "professional"]).optional(),
  expirationAlertDays: z.coerce.number().int().min(1).max(30).optional(),
});

function maskIpAddress(ip: string | null | undefined): string {
  if (!ip) return "Unknown";
  if (ip.includes(":")) {
    const parts = ip.split(":");
    if (parts.length >= 4) {
      return parts.slice(0, 4).join(":") + ":****:****:****:****";
    }
    return ip;
  }
  const parts = ip.split(".");
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.***.***`;
  }
  return ip;
}

const router = Router();

type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired' | 'none';
type PlanType = 'monthly' | 'annual' | 'trial' | null;

interface SubscriptionInfo {
  subscriptionStatus: SubscriptionStatus;
  subscriptionPlanType: PlanType;
  trialEndsAt: string | null;
  subscriptionEndsAt: string | null;
}

async function evaluateAndUpdateSubscriptionStatus(subscription: typeof subscriptions.$inferSelect): Promise<SubscriptionStatus> {
  const now = new Date();
  
  if (subscription.status === 'trialing' && subscription.trialEnd && new Date(subscription.trialEnd) < now) {
    await db
      .update(subscriptions)
      .set({ status: 'expired', updatedAt: now })
      .where(eq(subscriptions.userId, subscription.userId));
    return 'expired';
  }
  
  if (subscription.status === 'active' && subscription.currentPeriodEnd && !subscription.stripeSubscriptionId) {
    if (new Date(subscription.currentPeriodEnd) < now) {
      await db
        .update(subscriptions)
        .set({ status: 'expired', updatedAt: now })
        .where(eq(subscriptions.userId, subscription.userId));
      return 'expired';
    }
  }
  
  return subscription.status as SubscriptionStatus;
}

async function getSubscriptionInfo(userId: string): Promise<SubscriptionInfo> {
  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  if (!subscription) {
    return {
      subscriptionStatus: 'none',
      subscriptionPlanType: null,
      trialEndsAt: null,
      subscriptionEndsAt: null,
    };
  }

  const currentStatus = await evaluateAndUpdateSubscriptionStatus(subscription);

  return {
    subscriptionStatus: currentStatus,
    subscriptionPlanType: subscription.planType as PlanType,
    trialEndsAt: subscription.trialEnd?.toISOString() || null,
    subscriptionEndsAt: subscription.currentPeriodEnd?.toISOString() || null,
  };
}
router.post("/register", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, displayName, selectedPlan, referralCode } = req.body;

    const result = await registerWithEmail(
      email,
      password,
      displayName,
      selectedPlan,
      referralCode,
      { userAgent: req.headers["user-agent"], ipAddress: req.ip }
    );

    const subscriptionInfo = await getSubscriptionInfo(result.user.id);

    setAuthCookie(res, result.rawToken, req);
    const csrfToken = generateCsrfToken(req, res);

    res.status(201).json(successResponse({
      user: {
        id: result.user.id,
        email: result.user.email,
        displayName: result.user.displayName,
        createdAt: result.user.createdAt?.toISOString() || new Date().toISOString(),
        ...subscriptionInfo,
      },
      token: result.rawToken,
      csrfToken,
    }));
  } catch (error) {
    next(error);
  }
});

router.post("/login", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    const result = await loginWithEmail(
      email,
      password,
      { userAgent: req.headers["user-agent"], ipAddress: req.ip }
    );

    const subscriptionInfo = await getSubscriptionInfo(result.user.id);

    setAuthCookie(res, result.rawToken, req);
    const csrfToken = generateCsrfToken(req, res);

    res.json(successResponse({
      user: {
        id: result.user.id,
        email: result.user.email,
        displayName: result.user.displayName,
        avatarUrl: result.user.profileImageUrl,
        createdAt: result.user.createdAt?.toISOString() || new Date().toISOString(),
        ...subscriptionInfo,
      },
      token: result.rawToken,
      csrfToken,
    }));
  } catch (error) {
    next(error);
  }
});

router.post("/logout", csrfProtection, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const cookieToken = req.cookies?.[AUTH_COOKIE_NAME];

    let rawToken: string | null = null;
    if (authHeader?.startsWith("Bearer ")) {
      rawToken = authHeader.substring(7);
    } else if (cookieToken) {
      rawToken = cookieToken;
    }

    if (rawToken) {
      await logoutSession(rawToken);
    }

    clearAuthCookie(res);

    res.json(successResponse(null));
  } catch (error) {
    logger.error("Logout error", { error: error instanceof Error ? error.message : String(error) });
    clearAuthCookie(res);
    res.status(200).json(successResponse(null));
  }
});

router.get("/me", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      throw AppError.unauthorized("Not authenticated", "AUTH_REQUIRED");
    }

    const rawToken = authHeader.substring(7);
    const hashedToken = hashToken(rawToken);

    const [session] = await db
      .select()
      .from(userSessions)
      .where(eq(userSessions.token, hashedToken))
      .limit(1);

    if (!session || new Date(session.expiresAt) < new Date()) {
      throw AppError.unauthorized("Session expired", "SESSION_EXPIRED");
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);

    if (!user) {
      throw AppError.unauthorized("User not found", "USER_NOT_FOUND");
    }

    const subscriptionInfo = await getSubscriptionInfo(user.id);

    res.json(successResponse({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        createdAt: user.createdAt?.toISOString() || new Date().toISOString(),
        ...subscriptionInfo,
      },
    }));
  } catch (error) {
    next(error);
  }
});

router.get("/restore-session", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cookieToken = req.cookies?.[AUTH_COOKIE_NAME];
    
    if (!cookieToken) {
      throw AppError.unauthorized("No session cookie", "AUTH_REQUIRED");
    }

    const hashedCookieToken = hashToken(cookieToken);

    const [session] = await db
      .select()
      .from(userSessions)
      .where(eq(userSessions.token, hashedCookieToken))
      .limit(1);

    if (!session || new Date(session.expiresAt) < new Date()) {
      throw AppError.unauthorized("Session expired", "SESSION_EXPIRED");
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);

    if (!user) {
      throw AppError.unauthorized("User not found", "USER_NOT_FOUND");
    }

    const subscriptionInfo = await getSubscriptionInfo(user.id);

    const csrfToken = generateCsrfToken(req, res);

    res.json(successResponse({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        createdAt: user.createdAt?.toISOString() || new Date().toISOString(),
        ...subscriptionInfo,
      },
      token: cookieToken,
      csrfToken,
    }));
  } catch (error) {
    next(error);
  }
});

router.get("/sessions", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const now = new Date();

    const sessions = await db
      .select({
        id: userSessions.id,
        userAgent: userSessions.userAgent,
        ipAddress: userSessions.ipAddress,
        createdAt: userSessions.createdAt,
        expiresAt: userSessions.expiresAt,
        token: userSessions.token,
      })
      .from(userSessions)
      .where(eq(userSessions.userId, userId))
      .orderBy(userSessions.createdAt);

    const currentToken = req.headers.authorization?.substring(7);
    const currentHashedToken = currentToken ? hashToken(currentToken) : null;

    const activeSessions = sessions
      .filter((s) => new Date(s.expiresAt) > now)
      .map((s) => ({
        id: s.id,
        userAgent: s.userAgent || "Unknown device",
        ipAddress: maskIpAddress(s.ipAddress),
        createdAt: s.createdAt,
        expiresAt: s.expiresAt,
        isCurrent: s.token === currentHashedToken,
      }));

    res.json(successResponse({ sessions: activeSessions }));
  } catch (error) {
    next(error);
  }
});

router.delete("/sessions/:sessionId", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const { sessionId } = req.params;
    const currentToken = req.headers.authorization?.substring(7);

    await revokeSession(sessionId, userId, currentToken);

    res.json(successResponse({ message: "Session revoked successfully" }));
  } catch (error) {
    next(error);
  }
});

router.delete("/sessions", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const currentToken = req.headers.authorization?.substring(7);
    const currentHashedToken = currentToken ? hashToken(currentToken) : null;

    if (!currentHashedToken) {
      throw AppError.badRequest("Unable to identify current session", "NO_CURRENT_SESSION");
    }

    const revokedCount = await revokeAllOtherSessions(userId, currentHashedToken);

    res.json(successResponse({ message: `Revoked ${revokedCount} other session(s)` }));
  } catch (error) {
    next(error);
  }
});

const PASSWORD_RESET_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

async function cleanupExpiredResetTokens() {
  await db
    .delete(passwordResetTokens)
    .where(lt(passwordResetTokens.expiresAt, new Date()));
}

const PASSWORD_RESET_SUCCESS_MESSAGE = "If an account with that email exists, a password reset link has been sent.";

router.post("/forgot-password", passwordResetLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;

    if (!email) {
      throw AppError.badRequest("Email is required", "MISSING_EMAIL");
    }

    await cleanupExpiredResetTokens();

    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (!user) {
      return res.json(successResponse({ message: PASSWORD_RESET_SUCCESS_MESSAGE }));
    }

    await db
      .delete(passwordResetTokens)
      .where(eq(passwordResetTokens.userId, user.id));

    const resetToken = randomBytes(32).toString("hex");
    const hashedResetToken = hashToken(resetToken);

    await db.insert(passwordResetTokens).values({
      userId: user.id,
      tokenHash: hashedResetToken,
      expiresAt: new Date(Date.now() + PASSWORD_RESET_EXPIRY_MS),
    });

    logger.info("Password reset token generated", { userId: user.id });

    res.json(successResponse({ message: PASSWORD_RESET_SUCCESS_MESSAGE }));
  } catch (error) {
    next(error);
  }
});

router.post("/reset-password", passwordResetLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token: resetToken, password } = req.body;

    if (!resetToken || !password) {
      throw AppError.badRequest("Token and new password are required", "MISSING_FIELDS");
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      throw AppError.badRequest(passwordError, "WEAK_PASSWORD");
    }

    await cleanupExpiredResetTokens();

    const hashedResetToken = hashToken(resetToken);

    const [entry] = await db
      .select({ userId: passwordResetTokens.userId, expiresAt: passwordResetTokens.expiresAt })
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.tokenHash, hashedResetToken))
      .limit(1);

    if (!entry || entry.expiresAt < new Date()) {
      if (entry) {
        await db.delete(passwordResetTokens).where(eq(passwordResetTokens.tokenHash, hashedResetToken));
      }
      throw AppError.badRequest("Invalid or expired reset token", "INVALID_RESET_TOKEN");
    }

    const hashedPassword = await hashPassword(password);

    await db
      .update(users)
      .set({ password: hashedPassword, updatedAt: new Date() })
      .where(eq(users.id, entry.userId));

    await db
      .delete(passwordResetTokens)
      .where(eq(passwordResetTokens.userId, entry.userId));

    await db
      .delete(userSessions)
      .where(eq(userSessions.userId, entry.userId));

    res.json(successResponse({ message: "Password has been reset successfully." }));
  } catch (error) {
    next(error);
  }
});

async function queryNormalizedInventory(userId: string) {
  const rows = await db.select().from(userInventoryItems).where(and(eq(userInventoryItems.userId, userId), isNull(userInventoryItems.deletedAt)));
  return rows.map(row => ({ id: row.itemId, name: row.name, barcode: row.barcode, quantity: row.quantity, unit: row.unit, storageLocation: row.storageLocation, purchaseDate: row.purchaseDate, expirationDate: row.expirationDate, category: row.category, usdaCategory: row.usdaCategory, nutrition: row.nutrition, notes: row.notes, imageUri: row.imageUri, fdcId: row.fdcId }));
}

async function queryNormalizedRecipes(userId: string) {
  const rows = await db.select().from(userSavedRecipes).where(eq(userSavedRecipes.userId, userId));
  return rows.map(row => ({ id: row.itemId, title: row.title, description: row.description, ingredients: row.ingredients, instructions: row.instructions, prepTime: row.prepTime, cookTime: row.cookTime, servings: row.servings, imageUri: row.imageUri, cloudImageUri: row.cloudImageUri, nutrition: row.nutrition, isFavorite: row.isFavorite, ...((row.extraData as Record<string, unknown>) || {}) }));
}

async function queryNormalizedMealPlans(userId: string) {
  const rows = await db.select().from(userMealPlans).where(eq(userMealPlans.userId, userId));
  return rows.map(row => ({ id: row.itemId, date: row.date, meals: row.meals, ...((row.extraData as Record<string, unknown>) || {}) }));
}

async function queryNormalizedShoppingList(userId: string) {
  const rows = await db.select().from(userShoppingItems).where(eq(userShoppingItems.userId, userId));
  return rows.map(row => ({ id: row.itemId, name: row.name, quantity: row.quantity, unit: row.unit, isChecked: row.isChecked, category: row.category, recipeId: row.recipeId, ...((row.extraData as Record<string, unknown>) || {}) }));
}

router.get("/sync", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;

    const [syncData] = await db
      .select()
      .from(userSyncData)
      .where(eq(userSyncData.userId, userId))
      .limit(1);

    const userCookwareRows = await db
      .select()
      .from(userCookwareItems)
      .where(eq(userCookwareItems.userId, userId));
    
    const cookwareList = userCookwareRows.map(row => ({
      id: row.itemId,
      name: row.name,
      category: row.category,
      alternatives: row.alternatives,
      ...((row.extraData as Record<string, unknown>) || {}),
    }));
    const serverTimestamp = new Date().toISOString();
    
    const clientLastSyncedAt = req.query.lastSyncedAt as string | undefined;

    if (!syncData) {
      return res.json(successResponse({ 
        data: { inventory: [], recipes: [], mealPlans: [], shoppingList: [], cookware: cookwareList }, 
        lastSyncedAt: null,
        serverTimestamp,
      }));
    }

    if (clientLastSyncedAt) {
      const clientTime = new Date(clientLastSyncedAt);
      if (isNaN(clientTime.getTime())) {
        logger.warn("Invalid lastSyncedAt value, falling through to full sync", { lastSyncedAt: clientLastSyncedAt, userId });
      } else {
      const rowUpdatedAt = syncData.updatedAt ? new Date(syncData.updatedAt) : null;
      
      if (rowUpdatedAt && rowUpdatedAt <= clientTime) {
        return res.json(successResponse({
          data: null,
          unchanged: true,
          serverTimestamp,
          lastSyncedAt: syncData.lastSyncedAt?.toISOString() || null,
        }));
      }
      
      const sectionTimestamps = (syncData.sectionUpdatedAt as Record<string, string>) || {};
      const deltaData: Record<string, unknown> = {};
      
      const normalizedSections = ["inventory", "recipes", "mealPlans", "shoppingList"] as const;
      const jsonbSections = ["preferences", "wasteLog", "consumedLog", "analytics", "onboarding", "customLocations", "userProfile"] as const;
      
      for (const section of normalizedSections) {
        const sectionTime = sectionTimestamps[section];
        if (sectionTime && new Date(sectionTime) > clientTime) {
          if (section === "inventory") deltaData.inventory = await queryNormalizedInventory(userId);
          else if (section === "recipes") deltaData.recipes = await queryNormalizedRecipes(userId);
          else if (section === "mealPlans") deltaData.mealPlans = await queryNormalizedMealPlans(userId);
          else if (section === "shoppingList") deltaData.shoppingList = await queryNormalizedShoppingList(userId);
        }
      }
      
      for (const section of jsonbSections) {
        const sectionTime = sectionTimestamps[section];
        if (sectionTime && new Date(sectionTime) > clientTime) {
          deltaData[section] = syncData[section] ?? null;
        }
      }
      
      deltaData.cookware = cookwareList;
      
      return res.json(successResponse({
        data: deltaData,
        delta: true,
        serverTimestamp,
        lastSyncedAt: syncData.lastSyncedAt?.toISOString() || null,
      }));
      }
    }

    const [inventory, recipes, mealPlansData, shoppingList] = await Promise.all([
      queryNormalizedInventory(userId),
      queryNormalizedRecipes(userId),
      queryNormalizedMealPlans(userId),
      queryNormalizedShoppingList(userId),
    ]);

    res.json(successResponse({
      data: {
        inventory,
        recipes,
        mealPlans: mealPlansData,
        shoppingList,
        preferences: syncData.preferences ?? null,
        cookware: cookwareList,
        wasteLog: syncData.wasteLog ?? null,
        consumedLog: syncData.consumedLog ?? null,
        analytics: syncData.analytics ?? null,
        onboarding: syncData.onboarding ?? null,
        customLocations: syncData.customLocations ?? null,
        userProfile: syncData.userProfile ?? null,
      },
      lastSyncedAt: syncData.lastSyncedAt?.toISOString() || null,
      serverTimestamp,
    }));
  } catch (error) {
    next(error);
  }
});

router.post("/sync", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const { data } = req.body;

    if (data.cookware && Array.isArray(data.cookware)) {
      const limitCheck = await checkCookwareLimit(userId);
      const maxLimit = typeof limitCheck.limit === 'number' ? limitCheck.limit : Infinity;
      const incomingCount = data.cookware.length;
      
      if (incomingCount > maxLimit) {
        throw AppError.forbidden("Cookware limit reached. Upgrade to Pro for unlimited cookware.", "COOKWARE_LIMIT_REACHED").withDetails({
          code: "COOKWARE_LIMIT_REACHED",
          limit: limitCheck.limit,
          count: incomingCount,
        });
      }
    }

    if (data.customLocations && Array.isArray(data.customLocations) && data.customLocations.length > 0) {
      const hasAccess = await checkFeatureAccess(userId, "customStorageAreas");
      if (!hasAccess) {
        throw AppError.forbidden("Custom storage areas are a Pro feature. Upgrade to Pro to create custom storage locations.", "FEATURE_NOT_AVAILABLE").withDetails({
          code: "FEATURE_NOT_AVAILABLE",
          feature: "customStorageAreas",
        });
      }
    }

    let prefsSynced = true;
    let prefsError: string | null = null;
    let validatedPreferences: unknown = undefined;

    if (data.preferences) {
      const parseResult = syncPreferencesSchema.safeParse(data.preferences);
      if (parseResult.success) {
        const prefs = parseResult.data;
        validatedPreferences = prefs;
        const userUpdate: Record<string, unknown> = { updatedAt: new Date() };
        
        if (prefs.servingSize !== undefined) {
          userUpdate.householdSize = prefs.servingSize;
        }
        if (prefs.dailyMeals !== undefined) {
          userUpdate.dailyMeals = prefs.dailyMeals;
        }
        if (prefs.dietaryRestrictions !== undefined) {
          userUpdate.dietaryRestrictions = prefs.dietaryRestrictions;
        }
        if (prefs.cuisinePreferences !== undefined) {
          userUpdate.favoriteCategories = prefs.cuisinePreferences;
        }
        if (prefs.storageAreas !== undefined) {
          userUpdate.storageAreasEnabled = prefs.storageAreas;
        }
        if (prefs.cookingLevel !== undefined) {
          const levelMap: Record<string, string> = {
            basic: "beginner",
            intermediate: "intermediate", 
            professional: "advanced"
          };
          userUpdate.cookingSkillLevel = levelMap[prefs.cookingLevel] || "beginner";
        }
        if (prefs.expirationAlertDays !== undefined) {
          userUpdate.expirationAlertDays = prefs.expirationAlertDays;
        }
        
        if (Object.keys(userUpdate).length > 1) {
          await db
            .update(users)
            .set(userUpdate)
            .where(eq(users.id, userId));
        }
      } else {
        prefsSynced = false;
        prefsError = parseResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
        logger.warn("Invalid sync preferences", { userId, prefsError });
      }
    }

    const [existingSyncForTimestamps] = await db
      .select({ sectionUpdatedAt: userSyncData.sectionUpdatedAt })
      .from(userSyncData)
      .where(eq(userSyncData.userId, userId))
      .limit(1);
    
    const currentSectionTimestamps = (existingSyncForTimestamps?.sectionUpdatedAt as Record<string, string>) || {};
    const updatedSectionTimestamps = { ...currentSectionTimestamps };
    const now = new Date().toISOString();

    const syncUpdate: Record<string, unknown> = {
      lastSyncedAt: new Date(),
      updatedAt: new Date(),
    };

    if (data.inventory !== undefined) {
      await db.transaction(async (tx) => {
        await tx.delete(userInventoryItems).where(eq(userInventoryItems.userId, userId));
        if (Array.isArray(data.inventory) && data.inventory.length > 0) {
          await tx.insert(userInventoryItems).values(data.inventory.map((item: Record<string, unknown>) => ({
            userId,
            itemId: String(item.id),
            name: String(item.name || ""),
            barcode: item.barcode as string | undefined,
            quantity: typeof item.quantity === "number" ? item.quantity : 1,
            unit: typeof item.unit === "string" ? item.unit : "unit",
            storageLocation: typeof item.storageLocation === "string" ? item.storageLocation : "pantry",
            purchaseDate: item.purchaseDate as string | undefined,
            expirationDate: item.expirationDate as string | undefined,
            category: typeof item.category === "string" ? item.category : "other",
            usdaCategory: item.usdaCategory as string | undefined,
            nutrition: item.nutrition ?? null,
            notes: item.notes as string | undefined,
            imageUri: item.imageUri as string | undefined,
            fdcId: typeof item.fdcId === "number" ? item.fdcId : undefined,
            deletedAt: item.deletedAt ? new Date(item.deletedAt as string) : null,
          })));
        }
      });
      updatedSectionTimestamps.inventory = now;
    }
    if (data.recipes !== undefined) {
      await db.transaction(async (tx) => {
        await tx.delete(userSavedRecipes).where(eq(userSavedRecipes.userId, userId));
        if (Array.isArray(data.recipes) && data.recipes.length > 0) {
          await tx.insert(userSavedRecipes).values(data.recipes.map((item: Record<string, unknown>) => ({
            userId,
            itemId: String(item.id),
            title: String(item.title || ""),
            description: item.description as string | undefined,
            ingredients: item.ingredients ?? null,
            instructions: item.instructions ?? null,
            prepTime: typeof item.prepTime === "number" ? item.prepTime : undefined,
            cookTime: typeof item.cookTime === "number" ? item.cookTime : undefined,
            servings: typeof item.servings === "number" ? item.servings : undefined,
            imageUri: item.imageUri as string | undefined,
            cloudImageUri: item.cloudImageUri as string | undefined,
            nutrition: item.nutrition ?? null,
            isFavorite: typeof item.isFavorite === "boolean" ? item.isFavorite : false,
            extraData: extractExtraData(item, recipeKnownKeys),
          })));
        }
      });
      updatedSectionTimestamps.recipes = now;
    }
    if (data.mealPlans !== undefined) {
      await db.transaction(async (tx) => {
        await tx.delete(userMealPlans).where(eq(userMealPlans.userId, userId));
        if (Array.isArray(data.mealPlans) && data.mealPlans.length > 0) {
          await tx.insert(userMealPlans).values(data.mealPlans.map((item: Record<string, unknown>) => ({
            userId,
            itemId: String(item.id),
            date: String(item.date || ""),
            meals: item.meals ?? null,
            extraData: extractExtraData(item, mealPlanKnownKeys),
          })));
        }
      });
      updatedSectionTimestamps.mealPlans = now;
    }
    if (data.shoppingList !== undefined) {
      await db.transaction(async (tx) => {
        await tx.delete(userShoppingItems).where(eq(userShoppingItems.userId, userId));
        if (Array.isArray(data.shoppingList) && data.shoppingList.length > 0) {
          await tx.insert(userShoppingItems).values(data.shoppingList.map((item: Record<string, unknown>) => ({
            userId,
            itemId: String(item.id),
            name: String(item.name || ""),
            quantity: typeof item.quantity === "number" ? item.quantity : 1,
            unit: typeof item.unit === "string" ? item.unit : "unit",
            isChecked: typeof item.isChecked === "boolean" ? item.isChecked : false,
            category: item.category as string | undefined,
            recipeId: item.recipeId as string | undefined,
            extraData: extractExtraData(item, shoppingListKnownKeys),
          })));
        }
      });
      updatedSectionTimestamps.shoppingList = now;
    }
    if (data.cookware !== undefined && Array.isArray(data.cookware)) {
      await db.transaction(async (tx) => {
        await tx.delete(userCookwareItems).where(eq(userCookwareItems.userId, userId));
        if (data.cookware.length > 0) {
          await tx.insert(userCookwareItems).values(data.cookware.map((item: Record<string, unknown>) => ({
            userId,
            itemId: String(item.id ?? item),
            name: typeof item.name === "string" ? item.name : null,
            category: typeof item.category === "string" ? item.category : null,
            alternatives: Array.isArray(item.alternatives) ? item.alternatives : null,
            extraData: extractExtraData(item, cookwareKnownKeys),
          })));
        }
      });
    }
    if (data.cookware !== undefined) {
      updatedSectionTimestamps.cookware = now;
    }
    if (data.wasteLog !== undefined) {
      syncUpdate.wasteLog = data.wasteLog ?? null;
      updatedSectionTimestamps.wasteLog = now;
    }
    if (data.consumedLog !== undefined) {
      syncUpdate.consumedLog = data.consumedLog ?? null;
      updatedSectionTimestamps.consumedLog = now;
    }
    if (data.analytics !== undefined) {
      syncUpdate.analytics = data.analytics ?? null;
      updatedSectionTimestamps.analytics = now;
    }
    if (data.onboarding !== undefined) {
      syncUpdate.onboarding = data.onboarding ?? null;
      updatedSectionTimestamps.onboarding = now;
    }
    if (data.customLocations !== undefined) {
      syncUpdate.customLocations = data.customLocations ?? null;
      updatedSectionTimestamps.customLocations = now;
    }
    if (data.userProfile !== undefined) {
      syncUpdate.userProfile = data.userProfile ?? null;
      updatedSectionTimestamps.userProfile = now;
    }
    if (validatedPreferences !== undefined) {
      syncUpdate.preferences = validatedPreferences;
      updatedSectionTimestamps.preferences = now;
    }

    syncUpdate.sectionUpdatedAt = updatedSectionTimestamps;

    await db
      .update(userSyncData)
      .set(syncUpdate)
      .where(eq(userSyncData.userId, userId));

    if (data.onboarding && data.onboarding.completedAt) {
      await db
        .update(users)
        .set({ hasCompletedOnboarding: true, updatedAt: new Date() })
        .where(eq(users.id, userId));
    }

    res.json(successResponse({ 
      syncedAt: new Date().toISOString(),
      prefsSynced,
      ...(prefsError && { prefsError })
    }));
  } catch (error) {
    next(error);
  }
});

// =============================================================================
// MIGRATE GUEST DATA ENDPOINT
// Transfers local guest data to new registered account
// =============================================================================

router.post("/migrate-guest-data", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;

    const { guestId, data } = req.body;

    if (!data) {
      throw AppError.badRequest("No data provided for migration", "MISSING_DATA");
    }

    logger.info("Starting guest data migration", { userId, guestId });

    const [existingSyncData] = await db
      .select()
      .from(userSyncData)
      .where(eq(userSyncData.userId, userId))
      .limit(1);

    const hasExistingData = !!existingSyncData;

    if (hasExistingData) {
      logger.info("User has existing data, merging", { userId });
    }

    const syncUpdate: Record<string, unknown> = {
      lastSyncedAt: new Date(),
      updatedAt: new Date(),
    };

    const mergeOrReplace = (existing: unknown, incoming: unknown): unknown => {
      if (!Array.isArray(incoming) || incoming.length === 0) return existing;
      if (!existing) return incoming;
      
      try {
        const existingArr = Array.isArray(existing) ? existing : null;
        if (!existingArr) return incoming;
        
        const merged = [...existingArr];
        for (const item of incoming) {
          const itemId = (item as { id?: string })?.id;
          if (itemId) {
            const exists = merged.some((e: { id?: string }) => e.id === itemId);
            if (!exists) merged.push(item);
          } else {
            merged.push(item);
          }
        }
        return merged;
      } catch {
        return incoming;
      }
    };

    if (data.cookware && Array.isArray(data.cookware) && data.cookware.length > 0) {
      const limitCheck = await checkCookwareLimit(userId);
      const maxLimit = typeof limitCheck.limit === 'number' ? limitCheck.limit : Infinity;
      const incomingCount = data.cookware.length;
      
      const currentCookware = await db
        .select({ itemId: userCookwareItems.itemId })
        .from(userCookwareItems)
        .where(eq(userCookwareItems.userId, userId));
      
      const totalCount = currentCookware.length + incomingCount;
      
      if (totalCount > maxLimit) {
        const slotsAvailable = Math.max(0, maxLimit - currentCookware.length);
        data.cookware = data.cookware.slice(0, slotsAvailable);
        logger.info("Truncated cookware due to limit", { slotsAvailable });
      }
    }

    if (data.customLocations && Array.isArray(data.customLocations) && data.customLocations.length > 0) {
      const hasAccess = await checkFeatureAccess(userId, "customStorageAreas");
      if (!hasAccess) {
        logger.info("Skipping custom locations - user doesn't have Pro access");
        delete data.customLocations;
      }
    }

    if (data.inventory !== undefined && Array.isArray(data.inventory) && data.inventory.length > 0) {
      for (const item of data.inventory) {
        const rec = item as Record<string, unknown>;
        await db.insert(userInventoryItems).values({
          userId,
          itemId: String(rec.id),
          name: String(rec.name || ""),
          barcode: rec.barcode as string | undefined,
          quantity: typeof rec.quantity === "number" ? rec.quantity : 1,
          unit: typeof rec.unit === "string" ? rec.unit : "unit",
          storageLocation: typeof rec.storageLocation === "string" ? rec.storageLocation : "pantry",
          purchaseDate: rec.purchaseDate as string | undefined,
          expirationDate: rec.expirationDate as string | undefined,
          category: typeof rec.category === "string" ? rec.category : "other",
          usdaCategory: rec.usdaCategory as string | undefined,
          nutrition: rec.nutrition ?? null,
          notes: rec.notes as string | undefined,
          imageUri: rec.imageUri as string | undefined,
          fdcId: typeof rec.fdcId === "number" ? rec.fdcId : undefined,
        }).onConflictDoUpdate({
          target: [userInventoryItems.userId, userInventoryItems.itemId],
          set: {
            name: String(rec.name || ""),
            barcode: rec.barcode as string | undefined,
            quantity: typeof rec.quantity === "number" ? rec.quantity : 1,
            unit: typeof rec.unit === "string" ? rec.unit : "unit",
            storageLocation: typeof rec.storageLocation === "string" ? rec.storageLocation : "pantry",
            purchaseDate: rec.purchaseDate as string | undefined,
            expirationDate: rec.expirationDate as string | undefined,
            category: typeof rec.category === "string" ? rec.category : "other",
            usdaCategory: rec.usdaCategory as string | undefined,
            nutrition: rec.nutrition ?? null,
            notes: rec.notes as string | undefined,
            imageUri: rec.imageUri as string | undefined,
            fdcId: typeof rec.fdcId === "number" ? rec.fdcId : undefined,
            updatedAt: new Date(),
          },
        });
      }
    }
    if (data.recipes !== undefined && Array.isArray(data.recipes) && data.recipes.length > 0) {
      for (const item of data.recipes) {
        const rec = item as Record<string, unknown>;
        await db.insert(userSavedRecipes).values({
          userId,
          itemId: String(rec.id),
          title: String(rec.title || ""),
          description: rec.description as string | undefined,
          ingredients: rec.ingredients ?? null,
          instructions: rec.instructions ?? null,
          prepTime: typeof rec.prepTime === "number" ? rec.prepTime : undefined,
          cookTime: typeof rec.cookTime === "number" ? rec.cookTime : undefined,
          servings: typeof rec.servings === "number" ? rec.servings : undefined,
          imageUri: rec.imageUri as string | undefined,
          cloudImageUri: rec.cloudImageUri as string | undefined,
          nutrition: rec.nutrition ?? null,
          isFavorite: typeof rec.isFavorite === "boolean" ? rec.isFavorite : false,
          extraData: extractExtraData(rec, recipeKnownKeys),
        }).onConflictDoUpdate({
          target: [userSavedRecipes.userId, userSavedRecipes.itemId],
          set: {
            title: String(rec.title || ""),
            description: rec.description as string | undefined,
            ingredients: rec.ingredients ?? null,
            instructions: rec.instructions ?? null,
            prepTime: typeof rec.prepTime === "number" ? rec.prepTime : undefined,
            cookTime: typeof rec.cookTime === "number" ? rec.cookTime : undefined,
            servings: typeof rec.servings === "number" ? rec.servings : undefined,
            imageUri: rec.imageUri as string | undefined,
            cloudImageUri: rec.cloudImageUri as string | undefined,
            nutrition: rec.nutrition ?? null,
            isFavorite: typeof rec.isFavorite === "boolean" ? rec.isFavorite : false,
            extraData: extractExtraData(rec, recipeKnownKeys),
            updatedAt: new Date(),
          },
        });
      }
    }
    if (data.mealPlans !== undefined && Array.isArray(data.mealPlans) && data.mealPlans.length > 0) {
      for (const item of data.mealPlans) {
        const rec = item as Record<string, unknown>;
        await db.insert(userMealPlans).values({
          userId,
          itemId: String(rec.id),
          date: String(rec.date || ""),
          meals: rec.meals ?? null,
          extraData: extractExtraData(rec, mealPlanKnownKeys),
        }).onConflictDoUpdate({
          target: [userMealPlans.userId, userMealPlans.itemId],
          set: {
            date: String(rec.date || ""),
            meals: rec.meals ?? null,
            extraData: extractExtraData(rec, mealPlanKnownKeys),
            updatedAt: new Date(),
          },
        });
      }
    }
    if (data.shoppingList !== undefined && Array.isArray(data.shoppingList) && data.shoppingList.length > 0) {
      for (const item of data.shoppingList) {
        const rec = item as Record<string, unknown>;
        await db.insert(userShoppingItems).values({
          userId,
          itemId: String(rec.id),
          name: String(rec.name || ""),
          quantity: typeof rec.quantity === "number" ? rec.quantity : 1,
          unit: typeof rec.unit === "string" ? rec.unit : "unit",
          isChecked: typeof rec.isChecked === "boolean" ? rec.isChecked : false,
          category: rec.category as string | undefined,
          recipeId: rec.recipeId as string | undefined,
          extraData: extractExtraData(rec, shoppingListKnownKeys),
        }).onConflictDoUpdate({
          target: [userShoppingItems.userId, userShoppingItems.itemId],
          set: {
            name: String(rec.name || ""),
            quantity: typeof rec.quantity === "number" ? rec.quantity : 1,
            unit: typeof rec.unit === "string" ? rec.unit : "unit",
            isChecked: typeof rec.isChecked === "boolean" ? rec.isChecked : false,
            category: rec.category as string | undefined,
            recipeId: rec.recipeId as string | undefined,
            extraData: extractExtraData(rec, shoppingListKnownKeys),
            updatedAt: new Date(),
          },
        });
      }
    }
    if (data.wasteLog !== undefined) {
      syncUpdate.wasteLog = mergeOrReplace(
        hasExistingData ? existingSyncData?.wasteLog || null : null,
        data.wasteLog
      );
    }
    if (data.consumedLog !== undefined) {
      syncUpdate.consumedLog = mergeOrReplace(
        hasExistingData ? existingSyncData?.consumedLog || null : null,
        data.consumedLog
      );
    }
    if (data.customLocations !== undefined) {
      syncUpdate.customLocations = mergeOrReplace(
        hasExistingData ? existingSyncData?.customLocations || null : null,
        data.customLocations
      );
    }
    
    if (data.preferences !== undefined && !existingSyncData?.preferences) {
      const parseResult = syncPreferencesSchema.safeParse(data.preferences);
      if (parseResult.success) {
        syncUpdate.preferences = parseResult.data;
        
        const prefs = parseResult.data;
        const userUpdate: Record<string, unknown> = { updatedAt: new Date() };
        if (prefs.servingSize !== undefined) userUpdate.householdSize = prefs.servingSize;
        if (prefs.dailyMeals !== undefined) userUpdate.dailyMeals = prefs.dailyMeals;
        if (prefs.dietaryRestrictions !== undefined) userUpdate.dietaryRestrictions = prefs.dietaryRestrictions;
        if (prefs.cuisinePreferences !== undefined) userUpdate.favoriteCategories = prefs.cuisinePreferences;
        if (prefs.storageAreas !== undefined) userUpdate.storageAreasEnabled = prefs.storageAreas;
        if (prefs.cookingLevel !== undefined) {
          const levelMap: Record<string, string> = { basic: "beginner", intermediate: "intermediate", professional: "advanced" };
          userUpdate.cookingSkillLevel = levelMap[prefs.cookingLevel] || "beginner";
        }
        if (prefs.expirationAlertDays !== undefined) userUpdate.expirationAlertDays = prefs.expirationAlertDays;
        
        if (Object.keys(userUpdate).length > 1) {
          await db.update(users).set(userUpdate).where(eq(users.id, userId));
        }
      }
    }
    if (data.onboarding !== undefined && !existingSyncData?.onboarding) {
      syncUpdate.onboarding = data.onboarding;
    }
    if (data.userProfile !== undefined && !existingSyncData?.userProfile) {
      syncUpdate.userProfile = data.userProfile;
    }

    if (data.cookware !== undefined && Array.isArray(data.cookware)) {
      for (const item of data.cookware) {
        const rec = typeof item === 'object' && item !== null ? item as Record<string, unknown> : { id: item };
        await db.insert(userCookwareItems).values({
          userId,
          itemId: String(rec.id ?? rec),
          name: typeof rec.name === "string" ? rec.name : null,
          category: typeof rec.category === "string" ? rec.category : null,
          alternatives: Array.isArray(rec.alternatives) ? rec.alternatives : null,
          extraData: typeof rec === 'object' ? extractExtraData(rec, cookwareKnownKeys) : null,
        }).onConflictDoUpdate({
          target: [userCookwareItems.userId, userCookwareItems.itemId],
          set: {
            name: typeof rec.name === "string" ? rec.name : null,
            category: typeof rec.category === "string" ? rec.category : null,
            alternatives: Array.isArray(rec.alternatives) ? rec.alternatives : null,
            extraData: typeof rec === 'object' ? extractExtraData(rec, cookwareKnownKeys) : null,
            updatedAt: new Date(),
          },
        });
      }
    }

    if (existingSyncData) {
      await db
        .update(userSyncData)
        .set(syncUpdate)
        .where(eq(userSyncData.userId, userId));
    } else {
      await db.insert(userSyncData).values({
        userId: userId,
        ...syncUpdate,
      });
    }

    if (data.onboarding?.completedAt) {
      await db
        .update(users)
        .set({ hasCompletedOnboarding: true, updatedAt: new Date() })
        .where(eq(users.id, userId));
    }

    logger.info("Successfully migrated guest data", { userId });

    res.json(successResponse({ 
      migratedAt: new Date().toISOString(),
      merged: hasExistingData,
    }));
  } catch (error) {
    next(error);
  }
});

// =============================================================================
// DELETE ACCOUNT ENDPOINT
// Apple App Store Guideline 5.1.1(v) and 5.1.1(vi) Compliance
// =============================================================================

router.delete("/delete-account", csrfProtection, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const cookieToken = req.cookies?.[AUTH_COOKIE_NAME];
    const rawToken = authHeader?.replace("Bearer ", "") || cookieToken;

    if (!rawToken) {
      throw AppError.unauthorized("Authentication required", "AUTH_REQUIRED");
    }

    const hashedToken = hashToken(rawToken);

    const [session] = await db
      .select()
      .from(userSessions)
      .where(eq(userSessions.token, hashedToken))
      .limit(1);

    if (!session || new Date(session.expiresAt) < new Date()) {
      throw AppError.unauthorized("Invalid or expired session", "SESSION_EXPIRED");
    }

    const userId = session.userId;

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw AppError.notFound("User not found", "USER_NOT_FOUND");
    }

    if (user.email === "demo@chefspaice.com") {
      throw AppError.forbidden("Demo account cannot be deleted. This account is used for App Store review purposes.", "DEMO_PROTECTED");
    }

    await deleteAccount(userId, res);

    res.json(successResponse(null, "Account and all associated data have been permanently deleted"));

  } catch (error) {
    next(error);
  }
});

router.delete("/account", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const { email } = req.body;

    if (!email) {
      throw AppError.badRequest("Email confirmation is required to delete your account.", "MISSING_DATA");
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw AppError.notFound("User not found", "USER_NOT_FOUND");
    }

    if (user.email.toLowerCase() !== email.toLowerCase()) {
      throw AppError.badRequest("Email does not match your account email. Please confirm with the correct email address.", "EMAIL_MISMATCH");
    }

    if (user.email === "demo@chefspaice.com") {
      throw AppError.forbidden("Demo account cannot be deleted. This account is used for App Store review purposes.", "DEMO_PROTECTED");
    }

    await deleteAccount(userId, res);

    res.json(successResponse(null, "Your account and all associated data have been permanently deleted."));

  } catch (error) {
    next(error);
  }
});

export default router;
