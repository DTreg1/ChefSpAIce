import { Router, Request, Response } from "express";
import { db } from "../db";
import { users, userSessions, userSyncData, subscriptions } from "@shared/schema";
import { eq } from "drizzle-orm";
import { randomBytes } from "crypto";
import bcrypt from "bcrypt";
import { z } from "zod";
import { checkCookwareLimit, checkFeatureAccess, ensureTrialSubscription } from "../services/subscriptionService";

const syncPreferencesSchema = z.object({
  servingSize: z.number().int().min(1).max(10).optional(),
  dietaryRestrictions: z.array(z.string().max(100)).max(50).optional(),
  cuisinePreferences: z.array(z.string().max(100)).max(50).optional(),
  storageAreas: z.array(z.string().max(50)).max(20).optional(),
  cookingLevel: z.enum(["basic", "intermediate", "professional"]).optional(),
  expirationAlertDays: z.number().int().min(1).max(30).optional(),
}).passthrough();

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
    const { email, password, displayName, selectedPlan } = req.body;

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

    const token = generateToken();
    const expiresAt = getExpiryDate();

    await db.insert(userSessions).values({
      userId: newUser.id,
      token,
      expiresAt,
    });

    await db.insert(userSyncData).values({
      userId: newUser.id,
    });

    // Create trial subscription for new user (7-day free trial) with selected plan
    await ensureTrialSubscription(newUser.id, plan);

    const subscriptionInfo = await getSubscriptionInfo(newUser.id);

    // Set persistent auth cookie for web auto sign-in
    setAuthCookie(res, token, req);

    res.status(201).json({
      user: {
        id: newUser.id,
        email: newUser.email,
        displayName: newUser.displayName,
        createdAt: newUser.createdAt?.toISOString() || new Date().toISOString(),
        ...subscriptionInfo,
      },
      token,
    });
  } catch (error) {
    console.error("Registration error:", error);
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

    const token = generateToken();
    const expiresAt = getExpiryDate();

    await db.insert(userSessions).values({
      userId: user.id,
      token,
      expiresAt,
    });

    const subscriptionInfo = await getSubscriptionInfo(user.id);

    // Set persistent auth cookie for web auto sign-in
    setAuthCookie(res, token, req);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        createdAt: user.createdAt?.toISOString() || new Date().toISOString(),
        ...subscriptionInfo,
      },
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed. Please try again." });
  }
});

router.post("/logout", async (req: Request, res: Response) => {
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
      await db.delete(userSessions).where(eq(userSessions.token, token));
    }

    // Always clear the auth cookie
    clearAuthCookie(res);

    res.json({ success: true });
  } catch (error) {
    console.error("Logout error:", error);
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

    const token = authHeader.substring(7);

    const [session] = await db
      .select()
      .from(userSessions)
      .where(eq(userSessions.token, token))
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
    console.error("Auth check error:", error);
    res.status(500).json({ error: "Failed to verify authentication" });
  }
});

router.get("/restore-session", async (req: Request, res: Response) => {
  try {
    const cookieToken = req.cookies?.[AUTH_COOKIE_NAME];
    
    if (!cookieToken) {
      return res.status(401).json({ error: "No session cookie" });
    }

    const [session] = await db
      .select()
      .from(userSessions)
      .where(eq(userSessions.token, cookieToken))
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

    res.json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        createdAt: user.createdAt?.toISOString() || new Date().toISOString(),
        ...subscriptionInfo,
      },
      token: cookieToken,
    });
  } catch (error) {
    console.error("Session restore error:", error);
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

    const token = authHeader.substring(7);

    const [session] = await db
      .select()
      .from(userSessions)
      .where(eq(userSessions.token, token))
      .limit(1);

    if (!session || new Date(session.expiresAt) < new Date()) {
      return res.status(401).json({ error: "Session expired" });
    }

    const [syncData] = await db
      .select()
      .from(userSyncData)
      .where(eq(userSyncData.userId, session.userId))
      .limit(1);

    if (!syncData) {
      return res.json({ data: null, lastSyncedAt: null });
    }

    res.json({
      data: {
        inventory: syncData.inventory ? JSON.parse(syncData.inventory) : null,
        recipes: syncData.recipes ? JSON.parse(syncData.recipes) : null,
        mealPlans: syncData.mealPlans ? JSON.parse(syncData.mealPlans) : null,
        shoppingList: syncData.shoppingList ? JSON.parse(syncData.shoppingList) : null,
        preferences: syncData.preferences ? JSON.parse(syncData.preferences) : null,
        cookware: syncData.cookware ? JSON.parse(syncData.cookware) : null,
        wasteLog: syncData.wasteLog ? JSON.parse(syncData.wasteLog) : null,
        consumedLog: syncData.consumedLog ? JSON.parse(syncData.consumedLog) : null,
        analytics: syncData.analytics ? JSON.parse(syncData.analytics) : null,
        onboarding: syncData.onboarding ? JSON.parse(syncData.onboarding) : null,
        customLocations: syncData.customLocations ? JSON.parse(syncData.customLocations) : null,
        userProfile: syncData.userProfile ? JSON.parse(syncData.userProfile) : null,
      },
      lastSyncedAt: syncData.lastSyncedAt?.toISOString() || null,
    });
  } catch (error) {
    console.error("Sync fetch error:", error);
    res.status(500).json({ error: "Failed to fetch sync data" });
  }
});

router.post("/sync", async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const token = authHeader.substring(7);

    const [session] = await db
      .select()
      .from(userSessions)
      .where(eq(userSessions.token, token))
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

    await db
      .update(userSyncData)
      .set({
        inventory: data.inventory ? JSON.stringify(data.inventory) : null,
        recipes: data.recipes ? JSON.stringify(data.recipes) : null,
        mealPlans: data.mealPlans ? JSON.stringify(data.mealPlans) : null,
        shoppingList: data.shoppingList ? JSON.stringify(data.shoppingList) : null,
        preferences: data.preferences ? JSON.stringify(data.preferences) : null,
        cookware: data.cookware ? JSON.stringify(data.cookware) : null,
        wasteLog: data.wasteLog ? JSON.stringify(data.wasteLog) : null,
        consumedLog: data.consumedLog ? JSON.stringify(data.consumedLog) : null,
        analytics: data.analytics ? JSON.stringify(data.analytics) : null,
        onboarding: data.onboarding ? JSON.stringify(data.onboarding) : null,
        customLocations: data.customLocations ? JSON.stringify(data.customLocations) : null,
        userProfile: data.userProfile ? JSON.stringify(data.userProfile) : null,
        lastSyncedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(userSyncData.userId, session.userId));

    if (data.preferences) {
      const parseResult = syncPreferencesSchema.safeParse(data.preferences);
      if (parseResult.success) {
        const prefs = parseResult.data;
        const userUpdate: Record<string, unknown> = { updatedAt: new Date() };
        
        if (prefs.servingSize !== undefined) {
          userUpdate.householdSize = prefs.servingSize;
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
      }
    }

    if (data.onboarding && data.onboarding.completedAt) {
      await db
        .update(users)
        .set({ hasCompletedOnboarding: true, updatedAt: new Date() })
        .where(eq(users.id, session.userId));
    }

    res.json({ success: true, syncedAt: new Date().toISOString() });
  } catch (error) {
    console.error("Sync save error:", error);
    res.status(500).json({ error: "Failed to save sync data" });
  }
});

export default router;
