import { Router, Request, Response } from "express";
import { db } from "../db";
import { users, userSessions, userSyncData, subscriptions } from "@shared/schema";
import { eq } from "drizzle-orm";
import { randomBytes } from "crypto";
import bcrypt from "bcrypt";

const router = Router();

type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired' | 'none';
type PlanType = 'monthly' | 'annual' | 'trial' | null;

const TRIAL_DAYS = 7;

interface SubscriptionInfo {
  subscriptionStatus: SubscriptionStatus;
  subscriptionPlanType: PlanType;
  trialEndsAt: string | null;
  subscriptionEndsAt: string | null;
}

async function createTrialSubscription(userId: string): Promise<void> {
  // Check if subscription already exists (idempotent)
  const [existing] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  if (existing) {
    // Subscription already exists (maybe from Stripe webhook), don't overwrite
    return;
  }

  const now = new Date();
  const trialEnd = new Date(now);
  trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS);

  try {
    await db.insert(subscriptions).values({
      userId,
      status: 'trialing',
      planType: 'trial',
      currentPeriodStart: now,
      currentPeriodEnd: trialEnd,
      trialStart: now,
      trialEnd: trialEnd,
      cancelAtPeriodEnd: false,
    });
  } catch (error: unknown) {
    // Handle race condition where subscription was created between check and insert
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('unique') || errorMessage.includes('duplicate')) {
      console.log('Trial subscription already exists for user:', userId);
      return;
    }
    throw error;
  }
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

router.post("/register", async (req: Request, res: Response) => {
  try {
    const { email, password, displayName } = req.body;

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

    // Create trial subscription for new user (7-day free trial)
    await createTrialSubscription(newUser.id);

    const subscriptionInfo = await getSubscriptionInfo(newUser.id);

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
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(200).json({ success: true });
    }

    const token = authHeader.substring(7);
    await db.delete(userSessions).where(eq(userSessions.token, token));

    res.json({ success: true });
  } catch (error) {
    console.error("Logout error:", error);
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

    res.json({ success: true, syncedAt: new Date().toISOString() });
  } catch (error) {
    console.error("Sync save error:", error);
    res.status(500).json({ error: "Failed to save sync data" });
  }
});

export default router;
