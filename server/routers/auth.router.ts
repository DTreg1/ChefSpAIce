import { Router, Request, Response } from "express";
import { db } from "../db";
import { users, userSessions, userSyncData, subscriptions, userAppliances, authProviders, feedback } from "@shared/schema";
import { eq, and, inArray } from "drizzle-orm";
import { randomBytes, createHash } from "crypto";
import bcrypt from "bcrypt";
import { z } from "zod";
import { checkCookwareLimit, checkFeatureAccess, ensureTrialSubscription } from "../services/subscriptionService";
import { csrfProtection, generateCsrfToken } from "../middleware/csrf";
import { requireAuth } from "../middleware/auth";
import { getUncachableStripeClient } from "../stripe/stripeClient";
import { deleteRecipeImage } from "../services/objectStorageService";
import { logger } from "../lib/logger";

const syncPreferencesSchema = z.object({
  servingSize: z.coerce.number().int().min(1).max(10).optional(),
  dailyMeals: z.coerce.number().int().min(1).max(10).optional(),
  dietaryRestrictions: z.array(z.string().max(100)).max(50).optional(),
  cuisinePreferences: z.array(z.string().max(100)).max(50).optional(),
  storageAreas: z.array(z.string().max(50)).max(20).optional(),
  cookingLevel: z.enum(["basic", "intermediate", "professional"]).optional(),
  expirationAlertDays: z.coerce.number().int().min(1).max(30).optional(),
});

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
  
  // If trialing and trial has expired, mark as expired
  if (subscription.status === 'trialing' && subscription.trialEnd && new Date(subscription.trialEnd) < now) {
    await db
      .update(subscriptions)
      .set({ status: 'expired', updatedAt: now })
      .where(eq(subscriptions.userId, subscription.userId));
    return 'expired';
  }
  
  // If active but current period has ended, mark as expired (unless it's a Stripe subscription which handles this via webhooks)
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

  // Evaluate and potentially update the subscription status (e.g., expire trials)
  const currentStatus = await evaluateAndUpdateSubscriptionStatus(subscription);

  return {
    subscriptionStatus: currentStatus,
    subscriptionPlanType: subscription.planType as PlanType,
    trialEndsAt: subscription.trialEnd?.toISOString() || null,
    subscriptionEndsAt: subscription.currentPeriodEnd?.toISOString() || null,
  };
}
const BCRYPT_ROUNDS = 12;

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

function generateToken(): string {
  return randomBytes(32).toString("hex");
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function getExpiryDate(): Date {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date;
}

const AUTH_COOKIE_NAME = "chefspaice_auth";
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

function setAuthCookie(res: Response, token: string, req?: Request): void {
  // Always use secure cookies when served over HTTPS (Replit always uses HTTPS)
  const isSecure = req ? req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' : true;
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
}

function clearAuthCookie(res: Response): void {
  res.clearCookie(AUTH_COOKIE_NAME, { path: "/" });
}

router.post("/register", async (req: Request, res: Response) => {
  try {
    const { email, password, displayName, selectedPlan, referralCode } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Please enter a valid email address" });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    // Validate selectedPlan if provided
    const validPlans = ['monthly', 'annual'];
    const plan = validPlans.includes(selectedPlan) ? selectedPlan : 'monthly';

    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (existingUser.length > 0) {
      return res.status(409).json({ error: "An account with this email already exists" });
    }

    const hashedPassword = await hashPassword(password);

    const [newUser] = await db
      .insert(users)
      .values({
        email: email.toLowerCase(),
        password: hashedPassword,
        displayName: displayName || email.split("@")[0],
      })
      .returning();

    const rawToken = generateToken();
    const hashedToken = hashToken(rawToken);
    const expiresAt = getExpiryDate();

    await db.insert(userSessions).values({
      userId: newUser.id,
      token: hashedToken,
      expiresAt,
    });

    await db.insert(userSyncData).values({
      userId: newUser.id,
    });

    // Handle referral code if provided
    let referralTrialDays: number | undefined;
    if (referralCode && typeof referralCode === 'string') {
      try {
        const [referrer] = await db
          .select({ id: users.id, aiRecipeBonusCredits: users.aiRecipeBonusCredits, referralCode: users.referralCode })
          .from(users)
          .where(eq(users.referralCode, referralCode.toUpperCase()))
          .limit(1);

        if (referrer && referrer.id !== newUser.id) {
          const { referrals } = await import("@shared/schema");
          await db.insert(referrals).values({
            referrerId: referrer.id,
            referredUserId: newUser.id,
            codeUsed: referralCode.toUpperCase(),
            status: "completed",
            bonusGranted: true,
          });

          await db
            .update(users)
            .set({ referredBy: referrer.id, updatedAt: new Date() })
            .where(eq(users.id, newUser.id));

          await db
            .update(users)
            .set({
              aiRecipeBonusCredits: (referrer.aiRecipeBonusCredits || 0) + 3,
              updatedAt: new Date(),
            })
            .where(eq(users.id, referrer.id));

          referralTrialDays = 14;
        }
      } catch (refError) {
        logger.error("Referral processing error (non-fatal)", { error: refError instanceof Error ? refError.message : String(refError) });
      }
    }

    // Create trial subscription for new user (7-day free trial, or 14-day if referred) with selected plan
    await ensureTrialSubscription(newUser.id, plan, referralTrialDays);

    const subscriptionInfo = await getSubscriptionInfo(newUser.id);

    // Set persistent auth cookie for web auto sign-in
    setAuthCookie(res, rawToken, req);

    const csrfToken = generateCsrfToken(req, res);

    res.status(201).json({
      user: {
        id: newUser.id,
        email: newUser.email,
        displayName: newUser.displayName,
        createdAt: newUser.createdAt?.toISOString() || new Date().toISOString(),
        ...subscriptionInfo,
      },
      token: rawToken,
      csrfToken,
    });
  } catch (error) {
    logger.error("Registration error", { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: "Registration failed. Please try again." });
  }
});

router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (!user || !user.password) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const isValidPassword = await verifyPassword(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const rawToken = generateToken();
    const hashedToken = hashToken(rawToken);
    const expiresAt = getExpiryDate();

    await db.insert(userSessions).values({
      userId: user.id,
      token: hashedToken,
      expiresAt,
    });

    const subscriptionInfo = await getSubscriptionInfo(user.id);

    // Set persistent auth cookie for web auto sign-in
    setAuthCookie(res, rawToken, req);

    const csrfToken = generateCsrfToken(req, res);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        createdAt: user.createdAt?.toISOString() || new Date().toISOString(),
        ...subscriptionInfo,
      },
      token: rawToken,
      csrfToken,
    });
  } catch (error) {
    logger.error("Login error", { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: "Login failed. Please try again." });
  }
});

router.post("/logout", csrfProtection, async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const cookieToken = req.cookies?.[AUTH_COOKIE_NAME];
    
    // Get token from either header or cookie
    let token: string | null = null;
    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    } else if (cookieToken) {
      token = cookieToken;
    }
    
    if (token) {
      const hashed = hashToken(token);
      await db.delete(userSessions).where(eq(userSessions.token, hashed));
    }

    // Always clear the auth cookie
    clearAuthCookie(res);

    res.json({ success: true });
  } catch (error) {
    logger.error("Logout error", { error: error instanceof Error ? error.message : String(error) });
    clearAuthCookie(res);
    res.status(200).json({ success: true });
  }
});

router.get("/me", async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const rawToken = authHeader.substring(7);
    const hashedToken = hashToken(rawToken);

    const [session] = await db
      .select()
      .from(userSessions)
      .where(eq(userSessions.token, hashedToken))
      .limit(1);

    if (!session || new Date(session.expiresAt) < new Date()) {
      return res.status(401).json({ error: "Session expired" });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    const subscriptionInfo = await getSubscriptionInfo(user.id);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        createdAt: user.createdAt?.toISOString() || new Date().toISOString(),
        ...subscriptionInfo,
      },
    });
  } catch (error) {
    logger.error("Auth check error", { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: "Failed to verify authentication" });
  }
});

router.get("/restore-session", async (req: Request, res: Response) => {
  try {
    const cookieToken = req.cookies?.[AUTH_COOKIE_NAME];
    
    if (!cookieToken) {
      return res.status(401).json({ error: "No session cookie" });
    }

    const hashedCookieToken = hashToken(cookieToken);

    const [session] = await db
      .select()
      .from(userSessions)
      .where(eq(userSessions.token, hashedCookieToken))
      .limit(1);

    if (!session || new Date(session.expiresAt) < new Date()) {
      clearAuthCookie(res);
      return res.status(401).json({ error: "Session expired" });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);

    if (!user) {
      clearAuthCookie(res);
      return res.status(401).json({ error: "User not found" });
    }

    const subscriptionInfo = await getSubscriptionInfo(user.id);

    const csrfToken = generateCsrfToken(req, res);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        createdAt: user.createdAt?.toISOString() || new Date().toISOString(),
        ...subscriptionInfo,
      },
      token: cookieToken,
      csrfToken,
    });
  } catch (error) {
    logger.error("Session restore error", { error: error instanceof Error ? error.message : String(error) });
    clearAuthCookie(res);
    res.status(500).json({ error: "Failed to restore session" });
  }
});

router.get("/sync", async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const rawToken = authHeader.substring(7);
    const hashedToken = hashToken(rawToken);

    const [session] = await db
      .select()
      .from(userSessions)
      .where(eq(userSessions.token, hashedToken))
      .limit(1);

    if (!session || new Date(session.expiresAt) < new Date()) {
      return res.status(401).json({ error: "Session expired" });
    }

    const [syncData] = await db
      .select()
      .from(userSyncData)
      .where(eq(userSyncData.userId, session.userId))
      .limit(1);

    // Fetch cookware from userAppliances table (source of truth)
    const userCookware = await db
      .select({ applianceId: userAppliances.applianceId })
      .from(userAppliances)
      .where(eq(userAppliances.userId, session.userId));
    
    const cookwareIds = userCookware.map(ua => ua.applianceId);
    const serverTimestamp = new Date().toISOString();
    
    const clientLastSyncedAt = req.query.lastSyncedAt as string | undefined;

    if (!syncData) {
      return res.json({ 
        data: { cookware: cookwareIds }, 
        lastSyncedAt: null,
        serverTimestamp,
      });
    }

    if (clientLastSyncedAt) {
      const clientTime = new Date(clientLastSyncedAt);
      if (isNaN(clientTime.getTime())) {
        logger.warn("Invalid lastSyncedAt value, falling through to full sync", { lastSyncedAt: clientLastSyncedAt, userId: session.userId });
      } else {
      const rowUpdatedAt = syncData.updatedAt ? new Date(syncData.updatedAt) : null;
      
      if (rowUpdatedAt && rowUpdatedAt <= clientTime) {
        return res.json({
          data: null,
          unchanged: true,
          serverTimestamp,
          lastSyncedAt: syncData.lastSyncedAt?.toISOString() || null,
        });
      }
      
      const sectionTimestamps = (syncData.sectionUpdatedAt as Record<string, string>) || {};
      const deltaData: Record<string, unknown> = {};
      
      const sections = [
        "inventory", "recipes", "mealPlans", "shoppingList", 
        "preferences", "wasteLog", "consumedLog", "analytics",
        "onboarding", "customLocations", "userProfile"
      ] as const;
      
      for (const section of sections) {
        const sectionTime = sectionTimestamps[section];
        if (sectionTime && new Date(sectionTime) > clientTime) {
          deltaData[section] = syncData[section] ?? null;
        }
      }
      
      deltaData.cookware = cookwareIds;
      
      return res.json({
        data: deltaData,
        delta: true,
        serverTimestamp,
        lastSyncedAt: syncData.lastSyncedAt?.toISOString() || null,
      });
      }
    }

    res.json({
      data: {
        inventory: syncData.inventory ?? null,
        recipes: syncData.recipes ?? null,
        mealPlans: syncData.mealPlans ?? null,
        shoppingList: syncData.shoppingList ?? null,
        preferences: syncData.preferences ?? null,
        cookware: cookwareIds,
        wasteLog: syncData.wasteLog ?? null,
        consumedLog: syncData.consumedLog ?? null,
        analytics: syncData.analytics ?? null,
        onboarding: syncData.onboarding ?? null,
        customLocations: syncData.customLocations ?? null,
        userProfile: syncData.userProfile ?? null,
      },
      lastSyncedAt: syncData.lastSyncedAt?.toISOString() || null,
      serverTimestamp,
    });
  } catch (error) {
    logger.error("Sync fetch error", { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: "Failed to fetch sync data" });
  }
});

router.post("/sync", async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const rawToken = authHeader.substring(7);
    const hashedToken = hashToken(rawToken);

    const [session] = await db
      .select()
      .from(userSessions)
      .where(eq(userSessions.token, hashedToken))
      .limit(1);

    if (!session || new Date(session.expiresAt) < new Date()) {
      return res.status(401).json({ error: "Session expired" });
    }

    const { data } = req.body;

    if (data.cookware && Array.isArray(data.cookware)) {
      const limitCheck = await checkCookwareLimit(session.userId);
      const maxLimit = typeof limitCheck.limit === 'number' ? limitCheck.limit : Infinity;
      const incomingCount = data.cookware.length;
      
      if (incomingCount > maxLimit) {
        return res.status(403).json({
          error: "Cookware limit reached. Upgrade to Pro for unlimited cookware.",
          code: "COOKWARE_LIMIT_REACHED",
          limit: limitCheck.limit,
          count: incomingCount,
        });
      }
    }

    if (data.customLocations && Array.isArray(data.customLocations) && data.customLocations.length > 0) {
      const hasAccess = await checkFeatureAccess(session.userId, "customStorageAreas");
      if (!hasAccess) {
        return res.status(403).json({
          error: "Custom storage areas are a Pro feature. Upgrade to Pro to create custom storage locations.",
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
            .where(eq(users.id, session.userId));
        }
      } else {
        prefsSynced = false;
        prefsError = parseResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
        logger.warn("Invalid sync preferences", { userId: session.userId, prefsError });
      }
    }

    const [existingSyncForTimestamps] = await db
      .select({ sectionUpdatedAt: userSyncData.sectionUpdatedAt })
      .from(userSyncData)
      .where(eq(userSyncData.userId, session.userId))
      .limit(1);
    
    const currentSectionTimestamps = (existingSyncForTimestamps?.sectionUpdatedAt as Record<string, string>) || {};
    const updatedSectionTimestamps = { ...currentSectionTimestamps };
    const now = new Date().toISOString();

    const syncUpdate: Record<string, unknown> = {
      lastSyncedAt: new Date(),
      updatedAt: new Date(),
    };

    if (data.inventory !== undefined) {
      syncUpdate.inventory = data.inventory ?? null;
      updatedSectionTimestamps.inventory = now;
    }
    if (data.recipes !== undefined) {
      syncUpdate.recipes = data.recipes ?? null;
      updatedSectionTimestamps.recipes = now;
    }
    if (data.mealPlans !== undefined) {
      syncUpdate.mealPlans = data.mealPlans ?? null;
      updatedSectionTimestamps.mealPlans = now;
    }
    if (data.shoppingList !== undefined) {
      syncUpdate.shoppingList = data.shoppingList ?? null;
      updatedSectionTimestamps.shoppingList = now;
    }
    if (data.cookware !== undefined && Array.isArray(data.cookware)) {
      // Sync cookware to userAppliances table (source of truth)
      const newCookwareIds: number[] = data.cookware.filter((id: unknown): id is number => typeof id === 'number');
      
      // Get current cookware for this user
      const currentCookware = await db
        .select({ applianceId: userAppliances.applianceId })
        .from(userAppliances)
        .where(eq(userAppliances.userId, session.userId));
      
      const currentIds = new Set(currentCookware.map(c => c.applianceId));
      const newIds = new Set(newCookwareIds);
      
      // Find IDs to add and remove
      const toAdd = newCookwareIds.filter(id => !currentIds.has(id));
      const toRemove = Array.from(currentIds).filter(id => !newIds.has(id));
      
      // Remove old cookware
      if (toRemove.length > 0) {
        await db
          .delete(userAppliances)
          .where(and(
            eq(userAppliances.userId, session.userId),
            inArray(userAppliances.applianceId, toRemove)
          ));
      }
      
      // Add new cookware
      if (toAdd.length > 0) {
        await db
          .insert(userAppliances)
          .values(toAdd.map(applianceId => ({
            userId: session.userId,
            applianceId,
          })))
          .onConflictDoNothing();
      }
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
      .where(eq(userSyncData.userId, session.userId));

    if (data.onboarding && data.onboarding.completedAt) {
      await db
        .update(users)
        .set({ hasCompletedOnboarding: true, updatedAt: new Date() })
        .where(eq(users.id, session.userId));
    }

    res.json({ 
      success: true, 
      syncedAt: new Date().toISOString(),
      prefsSynced,
      ...(prefsError && { prefsError })
    });
  } catch (error) {
    logger.error("Sync save error", { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: "Failed to save sync data" });
  }
});

// =============================================================================
// MIGRATE GUEST DATA ENDPOINT
// Transfers local guest data to new registered account
// =============================================================================

router.post("/migrate-guest-data", async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const rawToken = authHeader.substring(7);
    const hashedToken = hashToken(rawToken);

    const [session] = await db
      .select()
      .from(userSessions)
      .where(eq(userSessions.token, hashedToken))
      .limit(1);

    if (!session || new Date(session.expiresAt) < new Date()) {
      return res.status(401).json({ error: "Session expired" });
    }

    const { guestId, data } = req.body;

    if (!data) {
      return res.status(400).json({ error: "No data provided for migration" });
    }

    logger.info("Starting guest data migration", { userId: session.userId, guestId });

    // Check for existing data in user's sync record
    const [existingSyncData] = await db
      .select()
      .from(userSyncData)
      .where(eq(userSyncData.userId, session.userId))
      .limit(1);

    // Determine merge strategy: if user already has data, we'll merge arrays
    const hasExistingData = existingSyncData && (
      existingSyncData.inventory ||
      existingSyncData.recipes ||
      existingSyncData.mealPlans ||
      existingSyncData.shoppingList
    );

    if (hasExistingData) {
      logger.info("User has existing data, merging", { userId: session.userId });
    }

    // Prepare sync update with guest data
    const syncUpdate: Record<string, unknown> = {
      lastSyncedAt: new Date(),
      updatedAt: new Date(),
    };

    // Helper to safely merge arrays - validates input is array and merges by ID
    const mergeOrReplace = (existing: unknown, incoming: unknown): unknown => {
      // Validate incoming is an array
      if (!Array.isArray(incoming) || incoming.length === 0) return existing;
      if (!existing) return incoming;
      
      try {
        const existingArr = Array.isArray(existing) ? existing : null;
        if (!existingArr) return incoming;
        
        // Merge: add incoming items that don't exist (by id if available)
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

    // Check cookware limits if guest has cookware
    if (data.cookware && Array.isArray(data.cookware) && data.cookware.length > 0) {
      const limitCheck = await checkCookwareLimit(session.userId);
      const maxLimit = typeof limitCheck.limit === 'number' ? limitCheck.limit : Infinity;
      const incomingCount = data.cookware.length;
      
      // Get current cookware count
      const currentCookware = await db
        .select({ applianceId: userAppliances.applianceId })
        .from(userAppliances)
        .where(eq(userAppliances.userId, session.userId));
      
      const totalCount = currentCookware.length + incomingCount;
      
      if (totalCount > maxLimit) {
        // Truncate guest cookware to fit within limit
        const slotsAvailable = Math.max(0, maxLimit - currentCookware.length);
        data.cookware = data.cookware.slice(0, slotsAvailable);
        logger.info("Truncated cookware due to limit", { slotsAvailable });
      }
    }

    // Check custom locations feature access
    if (data.customLocations && Array.isArray(data.customLocations) && data.customLocations.length > 0) {
      const hasAccess = await checkFeatureAccess(session.userId, "customStorageAreas");
      if (!hasAccess) {
        // Skip custom locations migration for non-Pro users
        logger.info("Skipping custom locations - user doesn't have Pro access");
        delete data.customLocations;
      }
    }

    // Process array data types with safe merge
    if (data.inventory !== undefined) {
      syncUpdate.inventory = mergeOrReplace(
        hasExistingData ? existingSyncData?.inventory || null : null,
        data.inventory
      );
    }
    if (data.recipes !== undefined) {
      syncUpdate.recipes = mergeOrReplace(
        hasExistingData ? existingSyncData?.recipes || null : null,
        data.recipes
      );
    }
    if (data.mealPlans !== undefined) {
      syncUpdate.mealPlans = mergeOrReplace(
        hasExistingData ? existingSyncData?.mealPlans || null : null,
        data.mealPlans
      );
    }
    if (data.shoppingList !== undefined) {
      syncUpdate.shoppingList = mergeOrReplace(
        hasExistingData ? existingSyncData?.shoppingList || null : null,
        data.shoppingList
      );
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
    
    // For non-array data, only use guest data if no existing data
    if (data.preferences !== undefined && !existingSyncData?.preferences) {
      const parseResult = syncPreferencesSchema.safeParse(data.preferences);
      if (parseResult.success) {
        syncUpdate.preferences = parseResult.data;
        
        // Also update user profile with preferences
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
          await db.update(users).set(userUpdate).where(eq(users.id, session.userId));
        }
      }
    }
    // Only set onboarding if no existing onboarding data
    if (data.onboarding !== undefined && !existingSyncData?.onboarding) {
      syncUpdate.onboarding = data.onboarding;
    }
    // Only set userProfile if no existing userProfile data
    if (data.userProfile !== undefined && !existingSyncData?.userProfile) {
      syncUpdate.userProfile = data.userProfile;
    }

    // Handle cookware migration
    if (data.cookware !== undefined && Array.isArray(data.cookware)) {
      const newCookwareIds: number[] = data.cookware.filter((id: unknown): id is number => typeof id === 'number');
      
      if (newCookwareIds.length > 0) {
        // Get current cookware
        const currentCookware = await db
          .select({ applianceId: userAppliances.applianceId })
          .from(userAppliances)
          .where(eq(userAppliances.userId, session.userId));
        
        const currentIds = new Set(currentCookware.map(c => c.applianceId));
        const toAdd = newCookwareIds.filter(id => !currentIds.has(id));
        
        if (toAdd.length > 0) {
          await db
            .insert(userAppliances)
            .values(toAdd.map(applianceId => ({
              userId: session.userId,
              applianceId,
            })))
            .onConflictDoNothing();
        }
      }
    }

    // Update or insert sync data
    if (existingSyncData) {
      await db
        .update(userSyncData)
        .set(syncUpdate)
        .where(eq(userSyncData.userId, session.userId));
    } else {
      await db.insert(userSyncData).values({
        userId: session.userId,
        ...syncUpdate,
      });
    }

    // Update onboarding status if completed during guest mode
    if (data.onboarding?.completedAt) {
      await db
        .update(users)
        .set({ hasCompletedOnboarding: true, updatedAt: new Date() })
        .where(eq(users.id, session.userId));
    }

    logger.info("Successfully migrated guest data", { userId: session.userId });

    res.json({ 
      success: true, 
      migratedAt: new Date().toISOString(),
      merged: hasExistingData,
    });
  } catch (error) {
    logger.error("Guest data migration error", { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: "Failed to migrate guest data" });
  }
});

// =============================================================================
// DELETE ACCOUNT ENDPOINT
// Apple App Store Guideline 5.1.1(v) and 5.1.1(vi) Compliance
// =============================================================================

const DEMO_EMAIL = "demo@chefspaice.com";

router.delete("/delete-account", csrfProtection, async (req: Request, res: Response) => {
  try {
    // Get auth token from header or cookie
    const authHeader = req.headers.authorization;
    const cookieToken = req.cookies?.[AUTH_COOKIE_NAME];
    const rawToken = authHeader?.replace("Bearer ", "") || cookieToken;

    if (!rawToken) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const hashedToken = hashToken(rawToken);

    // Validate session
    const [session] = await db
      .select()
      .from(userSessions)
      .where(eq(userSessions.token, hashedToken))
      .limit(1);

    if (!session || new Date(session.expiresAt) < new Date()) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }

    const userId = session.userId;

    // Get user to check if it's the demo account
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Protect demo account from deletion
    if (user.email === DEMO_EMAIL) {
      return res.status(403).json({ 
        error: "Demo account cannot be deleted. This account is used for App Store review purposes." 
      });
    }

    logger.info("Starting account deletion", { userId });

    // Delete all user data in a transaction
    // Note: Due to cascade delete on users table, most data will be automatically deleted
    // But we explicitly delete to ensure everything is removed
    
    try {
      // Delete user appliances
      await db.delete(userAppliances).where(eq(userAppliances.userId, userId));
      logger.info("Deleted user appliances", { userId });
    } catch (e) {
      logger.warn("Error deleting appliances", { userId, error: e instanceof Error ? e.message : String(e) });
    }

    try {
      // Delete subscriptions
      await db.delete(subscriptions).where(eq(subscriptions.userId, userId));
      logger.info("Deleted subscriptions", { userId });
    } catch (e) {
      logger.warn("Error deleting subscriptions", { userId, error: e instanceof Error ? e.message : String(e) });
    }

    try {
      // Delete sync data
      await db.delete(userSyncData).where(eq(userSyncData.userId, userId));
      logger.info("Deleted sync data", { userId });
    } catch (e) {
      logger.warn("Error deleting sync data", { userId, error: e instanceof Error ? e.message : String(e) });
    }

    try {
      // Delete all sessions
      await db.delete(userSessions).where(eq(userSessions.userId, userId));
      logger.info("Deleted sessions", { userId });
    } catch (e) {
      logger.warn("Error deleting sessions", { userId, error: e instanceof Error ? e.message : String(e) });
    }

    // Finally, delete the user (this should cascade delete remaining data)
    await db.delete(users).where(eq(users.id, userId));
    logger.info("Deleted user record", { userId });

    // Clear auth cookie
    clearAuthCookie(res);

    logger.info("User deleted successfully", { userId });

    res.json({ 
      success: true, 
      message: "Account and all associated data have been permanently deleted" 
    });

  } catch (error) {
    logger.error("Account deletion error", { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ 
      error: "Failed to delete account. Please try again or contact support." 
    });
  }
});

router.delete("/account", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email confirmation is required to delete your account." });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.email.toLowerCase() !== email.toLowerCase()) {
      return res.status(400).json({ error: "Email does not match your account email. Please confirm with the correct email address." });
    }

    if (user.email === DEMO_EMAIL) {
      return res.status(403).json({
        error: "Demo account cannot be deleted. This account is used for App Store review purposes."
      });
    }

    logger.info("Starting account deletion", { userId });

    try {
      const [subscription] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, userId))
        .limit(1);

      if (subscription?.stripeSubscriptionId) {
        const stripe = await getUncachableStripeClient();
        await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
        logger.info("Cancelled Stripe subscription", { stripeSubscriptionId: subscription.stripeSubscriptionId });
      }
    } catch (e) {
      logger.warn("Error cancelling Stripe subscription", { userId, error: e instanceof Error ? e.message : String(e) });
    }

    try {
      const [syncData] = await db
        .select()
        .from(userSyncData)
        .where(eq(userSyncData.userId, userId))
        .limit(1);

      if (syncData?.recipes) {
        const recipes = Array.isArray(syncData.recipes) ? syncData.recipes : JSON.parse(String(syncData.recipes));
        if (Array.isArray(recipes)) {
          for (const recipe of recipes) {
            if (recipe && typeof recipe === "object" && "id" in recipe) {
              try {
                await deleteRecipeImage(String(recipe.id));
              } catch (imgErr) {
                logger.warn("Error deleting recipe image", { recipeId: String(recipe.id), error: imgErr instanceof Error ? imgErr.message : String(imgErr) });
              }
            }
          }
          logger.info("Processed recipe images for deletion", { count: recipes.length });
        }
      }
    } catch (e) {
      logger.warn("Error deleting recipe images", { userId, error: e instanceof Error ? e.message : String(e) });
    }

    try {
      await db.delete(feedback).where(eq(feedback.userId, userId));
      logger.info("Deleted feedback", { userId });
    } catch (e) {
      logger.warn("Error deleting feedback", { userId, error: e instanceof Error ? e.message : String(e) });
    }

    try {
      await db.delete(authProviders).where(eq(authProviders.userId, userId));
      logger.info("Deleted auth providers", { userId });
    } catch (e) {
      logger.warn("Error deleting auth providers", { userId, error: e instanceof Error ? e.message : String(e) });
    }

    try {
      await db.delete(userAppliances).where(eq(userAppliances.userId, userId));
      logger.info("Deleted user appliances", { userId });
    } catch (e) {
      logger.warn("Error deleting appliances", { userId, error: e instanceof Error ? e.message : String(e) });
    }

    try {
      await db.delete(subscriptions).where(eq(subscriptions.userId, userId));
      logger.info("Deleted subscriptions", { userId });
    } catch (e) {
      logger.warn("Error deleting subscriptions", { userId, error: e instanceof Error ? e.message : String(e) });
    }

    try {
      await db.delete(userSyncData).where(eq(userSyncData.userId, userId));
      logger.info("Deleted sync data", { userId });
    } catch (e) {
      logger.warn("Error deleting sync data", { userId, error: e instanceof Error ? e.message : String(e) });
    }

    try {
      await db.delete(userSessions).where(eq(userSessions.userId, userId));
      logger.info("Deleted sessions", { userId });
    } catch (e) {
      logger.warn("Error deleting sessions", { userId, error: e instanceof Error ? e.message : String(e) });
    }

    await db.delete(users).where(eq(users.id, userId));
    logger.info("Deleted user record", { userId });

    clearAuthCookie(res);

    logger.info("User account deleted successfully", { userId });

    res.json({
      success: true,
      message: "Your account and all associated data have been permanently deleted."
    });

  } catch (error) {
    logger.error("Account deletion error", { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({
      error: "Failed to delete account. Please try again or contact support."
    });
  }
});

export default router;
