import { Router, Request, Response, NextFunction } from "express";
import { db } from "../db";
import { users, userSessions, userSyncData, subscriptions, userAppliances, authProviders, feedback, userInventoryItems, userSavedRecipes, userMealPlans, userShoppingItems, userCookwareItems, notifications, conversionEvents, cancellationReasons, referrals, nutritionCorrections, passwordResetTokens } from "@shared/schema";
import { eq, and, inArray, or, lt } from "drizzle-orm";
import { randomBytes, createHash } from "crypto";
import bcrypt from "bcrypt";
import { z } from "zod";
import { checkCookwareLimit, checkFeatureAccess, ensureTrialSubscription } from "../services/subscriptionService";
import { csrfProtection, generateCsrfToken } from "../middleware/csrf";
import { requireAuth } from "../middleware/auth";
import { passwordResetLimiter } from "../middleware/rateLimiter";
import { getUncachableStripeClient } from "../stripe/stripeClient";
import { deleteRecipeImage } from "../services/objectStorageService";
import { logger } from "../lib/logger";
import { AppError } from "../middleware/errorHandler";
import { successResponse } from "../lib/apiResponse";

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

function validatePassword(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters";
  if (!/[A-Z]/.test(password)) return "Password must contain an uppercase letter";
  if (!/[a-z]/.test(password)) return "Password must contain a lowercase letter";
  if (!/[0-9]/.test(password)) return "Password must contain a number";
  return null;
}

const AUTH_COOKIE_NAME = "chefspaice_auth";
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

function setAuthCookie(res: Response, token: string, req?: Request): void {
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

router.post("/register", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, displayName, selectedPlan, referralCode } = req.body;

    if (!email || !password) {
      throw AppError.badRequest("Email and password are required", "MISSING_CREDENTIALS");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw AppError.badRequest("Please enter a valid email address", "INVALID_EMAIL");
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      throw AppError.badRequest(passwordError, "WEAK_PASSWORD");
    }

    const validPlans = ['monthly', 'annual'];
    const plan = validPlans.includes(selectedPlan) ? selectedPlan : 'monthly';

    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (existingUser.length > 0) {
      throw AppError.conflict("An account with this email already exists", "EMAIL_EXISTS");
    }

    const hashedPassword = await hashPassword(password);

    const { newUser, referralTrialDays, rawToken } = await db.transaction(async (tx) => {
      const [createdUser] = await tx
        .insert(users)
        .values({
          email: email.toLowerCase(),
          password: hashedPassword,
          displayName: displayName || email.split("@")[0],
        })
        .returning();

      const rawTokenInner = generateToken();
      const hashedTokenInner = hashToken(rawTokenInner);
      const expiresAtInner = getExpiryDate();

      await tx.insert(userSessions).values({
        userId: createdUser.id,
        token: hashedTokenInner,
        userAgent: req.headers["user-agent"] || "unknown",
        ipAddress: req.ip || "unknown",
        expiresAt: expiresAtInner,
      });

      await tx.insert(userSyncData).values({
        userId: createdUser.id,
      });

      let trialDays: number | undefined;
      if (referralCode && typeof referralCode === 'string') {
        try {
          const [referrer] = await tx
            .select({ id: users.id, referralCode: users.referralCode })
            .from(users)
            .where(eq(users.referralCode, referralCode.toUpperCase()))
            .limit(1);

          if (referrer && referrer.id !== createdUser.id) {
            const { referrals } = await import("@shared/schema");
            await tx.insert(referrals).values({
              referrerId: referrer.id,
              referredUserId: createdUser.id,
              codeUsed: referralCode.toUpperCase(),
              status: "completed",
              bonusGranted: false,
            });

            await tx
              .update(users)
              .set({ referredBy: referrer.id, updatedAt: new Date() })
              .where(eq(users.id, createdUser.id));

            const { checkAndRedeemReferralCredits } = await import("../services/subscriptionService");
            await checkAndRedeemReferralCredits(referrer.id);

            trialDays = 14;
          }
        } catch (refError) {
          logger.error("Referral processing error (non-fatal)", { error: refError instanceof Error ? refError.message : String(refError) });
        }
      }

      return { newUser: createdUser, referralTrialDays: trialDays, rawToken: rawTokenInner };
    });

    await ensureTrialSubscription(newUser.id, plan, referralTrialDays);

    const subscriptionInfo = await getSubscriptionInfo(newUser.id);

    setAuthCookie(res, rawToken, req);

    const csrfToken = generateCsrfToken(req, res);

    res.status(201).json(successResponse({
      user: {
        id: newUser.id,
        email: newUser.email,
        displayName: newUser.displayName,
        createdAt: newUser.createdAt?.toISOString() || new Date().toISOString(),
        ...subscriptionInfo,
      },
      token: rawToken,
      csrfToken,
    }));
  } catch (error) {
    next(error);
  }
});

router.post("/login", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw AppError.badRequest("Email and password are required", "MISSING_CREDENTIALS");
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (!user || !user.password) {
      throw AppError.unauthorized("Invalid email or password", "INVALID_CREDENTIALS");
    }

    const isValidPassword = await verifyPassword(password, user.password);
    if (!isValidPassword) {
      throw AppError.unauthorized("Invalid email or password", "INVALID_CREDENTIALS");
    }

    const rawToken = generateToken();
    const hashedToken = hashToken(rawToken);
    const expiresAt = getExpiryDate();

    await db.insert(userSessions).values({
      userId: user.id,
      token: hashedToken,
      userAgent: req.headers["user-agent"] || "unknown",
      ipAddress: req.ip || "unknown",
      expiresAt,
    });

    const subscriptionInfo = await getSubscriptionInfo(user.id);

    setAuthCookie(res, rawToken, req);

    const csrfToken = generateCsrfToken(req, res);

    res.json(successResponse({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        createdAt: user.createdAt?.toISOString() || new Date().toISOString(),
        ...subscriptionInfo,
      },
      token: rawToken,
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
        ipAddress: s.ipAddress || "Unknown",
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

    const [session] = await db
      .select({ id: userSessions.id, userId: userSessions.userId, token: userSessions.token })
      .from(userSessions)
      .where(and(
        eq(userSessions.id, sessionId),
        eq(userSessions.userId, userId),
      ))
      .limit(1);

    if (!session) {
      throw AppError.notFound("Session not found", "SESSION_NOT_FOUND");
    }

    const currentToken = req.headers.authorization?.substring(7);
    const currentHashedToken = currentToken ? hashToken(currentToken) : null;
    if (session.token === currentHashedToken) {
      throw AppError.badRequest("Cannot revoke your current session", "CANNOT_REVOKE_CURRENT");
    }

    await db.delete(userSessions).where(eq(userSessions.id, sessionId));

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

    const allSessions = await db
      .select({ id: userSessions.id, token: userSessions.token })
      .from(userSessions)
      .where(eq(userSessions.userId, userId));

    const otherSessionIds = allSessions
      .filter((s) => s.token !== currentHashedToken)
      .map((s) => s.id);

    if (otherSessionIds.length > 0) {
      await db.delete(userSessions).where(inArray(userSessions.id, otherSessionIds));
    }

    res.json(successResponse({ message: `Revoked ${otherSessionIds.length} other session(s)` }));
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
    const hashedResetToken = createHash("sha256").update(resetToken).digest("hex");

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

    const hashedResetToken = createHash("sha256").update(resetToken).digest("hex");

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

router.get("/sync", async (req: Request, res: Response, next: NextFunction) => {
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

    const [syncData] = await db
      .select()
      .from(userSyncData)
      .where(eq(userSyncData.userId, session.userId))
      .limit(1);

    const userCookware = await db
      .select({ applianceId: userAppliances.applianceId })
      .from(userAppliances)
      .where(eq(userAppliances.userId, session.userId));
    
    const cookwareIds = userCookware.map(ua => ua.applianceId);
    const serverTimestamp = new Date().toISOString();
    
    const clientLastSyncedAt = req.query.lastSyncedAt as string | undefined;

    if (!syncData) {
      return res.json(successResponse({ 
        data: { cookware: cookwareIds }, 
        lastSyncedAt: null,
        serverTimestamp,
      }));
    }

    if (clientLastSyncedAt) {
      const clientTime = new Date(clientLastSyncedAt);
      if (isNaN(clientTime.getTime())) {
        logger.warn("Invalid lastSyncedAt value, falling through to full sync", { lastSyncedAt: clientLastSyncedAt, userId: session.userId });
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
      
      return res.json(successResponse({
        data: deltaData,
        delta: true,
        serverTimestamp,
        lastSyncedAt: syncData.lastSyncedAt?.toISOString() || null,
      }));
      }
    }

    res.json(successResponse({
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
    }));
  } catch (error) {
    next(error);
  }
});

router.post("/sync", async (req: Request, res: Response, next: NextFunction) => {
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

    const { data } = req.body;

    if (data.cookware && Array.isArray(data.cookware)) {
      const limitCheck = await checkCookwareLimit(session.userId);
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
      const hasAccess = await checkFeatureAccess(session.userId, "customStorageAreas");
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
      const newCookwareIds: number[] = data.cookware.filter((id: unknown): id is number => typeof id === 'number');
      
      const currentCookware = await db
        .select({ applianceId: userAppliances.applianceId })
        .from(userAppliances)
        .where(eq(userAppliances.userId, session.userId));
      
      const currentIds = new Set(currentCookware.map(c => c.applianceId));
      const newIds = new Set(newCookwareIds);
      
      const toAdd = newCookwareIds.filter(id => !currentIds.has(id));
      const toRemove = Array.from(currentIds).filter(id => !newIds.has(id));
      
      if (toRemove.length > 0) {
        await db
          .delete(userAppliances)
          .where(and(
            eq(userAppliances.userId, session.userId),
            inArray(userAppliances.applianceId, toRemove)
          ));
      }
      
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

router.post("/migrate-guest-data", async (req: Request, res: Response, next: NextFunction) => {
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

    const { guestId, data } = req.body;

    if (!data) {
      throw AppError.badRequest("No data provided for migration", "MISSING_DATA");
    }

    logger.info("Starting guest data migration", { userId: session.userId, guestId });

    const [existingSyncData] = await db
      .select()
      .from(userSyncData)
      .where(eq(userSyncData.userId, session.userId))
      .limit(1);

    const hasExistingData = existingSyncData && (
      existingSyncData.inventory ||
      existingSyncData.recipes ||
      existingSyncData.mealPlans ||
      existingSyncData.shoppingList
    );

    if (hasExistingData) {
      logger.info("User has existing data, merging", { userId: session.userId });
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
      const limitCheck = await checkCookwareLimit(session.userId);
      const maxLimit = typeof limitCheck.limit === 'number' ? limitCheck.limit : Infinity;
      const incomingCount = data.cookware.length;
      
      const currentCookware = await db
        .select({ applianceId: userAppliances.applianceId })
        .from(userAppliances)
        .where(eq(userAppliances.userId, session.userId));
      
      const totalCount = currentCookware.length + incomingCount;
      
      if (totalCount > maxLimit) {
        const slotsAvailable = Math.max(0, maxLimit - currentCookware.length);
        data.cookware = data.cookware.slice(0, slotsAvailable);
        logger.info("Truncated cookware due to limit", { slotsAvailable });
      }
    }

    if (data.customLocations && Array.isArray(data.customLocations) && data.customLocations.length > 0) {
      const hasAccess = await checkFeatureAccess(session.userId, "customStorageAreas");
      if (!hasAccess) {
        logger.info("Skipping custom locations - user doesn't have Pro access");
        delete data.customLocations;
      }
    }

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
          await db.update(users).set(userUpdate).where(eq(users.id, session.userId));
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
      const newCookwareIds: number[] = data.cookware.filter((id: unknown): id is number => typeof id === 'number');
      
      if (newCookwareIds.length > 0) {
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

    if (data.onboarding?.completedAt) {
      await db
        .update(users)
        .set({ hasCompletedOnboarding: true, updatedAt: new Date() })
        .where(eq(users.id, session.userId));
    }

    logger.info("Successfully migrated guest data", { userId: session.userId });

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

const DEMO_EMAIL = "demo@chefspaice.com";

async function performAccountDeletion(userId: string, res: Response): Promise<void> {
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
      }
    }

    const savedRecipes = await db
      .select({ itemId: userSavedRecipes.itemId, cloudImageUri: userSavedRecipes.cloudImageUri })
      .from(userSavedRecipes)
      .where(eq(userSavedRecipes.userId, userId));

    for (const recipe of savedRecipes) {
      if (recipe.cloudImageUri) {
        try {
          await deleteRecipeImage(recipe.itemId);
        } catch (imgErr) {
          logger.warn("Error deleting saved recipe image", { recipeId: recipe.itemId, error: imgErr instanceof Error ? imgErr.message : String(imgErr) });
        }
      }
    }
  } catch (e) {
    logger.warn("Error deleting recipe images", { userId, error: e instanceof Error ? e.message : String(e) });
  }

  await db.transaction(async (tx) => {
    await tx.delete(notifications).where(eq(notifications.userId, userId));
    await tx.delete(conversionEvents).where(eq(conversionEvents.userId, userId));
    await tx.delete(cancellationReasons).where(eq(cancellationReasons.userId, userId));
    await tx.delete(referrals).where(or(eq(referrals.referrerId, userId), eq(referrals.referredUserId, userId)));
    await tx.delete(nutritionCorrections).where(eq(nutritionCorrections.userId, userId));
    await tx.delete(feedback).where(eq(feedback.userId, userId));
    await tx.delete(userInventoryItems).where(eq(userInventoryItems.userId, userId));
    await tx.delete(userSavedRecipes).where(eq(userSavedRecipes.userId, userId));
    await tx.delete(userMealPlans).where(eq(userMealPlans.userId, userId));
    await tx.delete(userShoppingItems).where(eq(userShoppingItems.userId, userId));
    await tx.delete(userCookwareItems).where(eq(userCookwareItems.userId, userId));
    await tx.delete(authProviders).where(eq(authProviders.userId, userId));
    await tx.delete(userAppliances).where(eq(userAppliances.userId, userId));
    await tx.delete(subscriptions).where(eq(subscriptions.userId, userId));
    await tx.delete(userSyncData).where(eq(userSyncData.userId, userId));
    await tx.delete(userSessions).where(eq(userSessions.userId, userId));
    await tx.delete(users).where(eq(users.id, userId));
  });

  clearAuthCookie(res);

  logger.info("Account deleted successfully", { userId });
}

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

    if (user.email === DEMO_EMAIL) {
      throw AppError.forbidden("Demo account cannot be deleted. This account is used for App Store review purposes.", "DEMO_PROTECTED");
    }

    await performAccountDeletion(userId, res);

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

    if (user.email === DEMO_EMAIL) {
      throw AppError.forbidden("Demo account cannot be deleted. This account is used for App Store review purposes.", "DEMO_PROTECTED");
    }

    await performAccountDeletion(userId, res);

    res.json(successResponse(null, "Your account and all associated data have been permanently deleted."));

  } catch (error) {
    next(error);
  }
});

export default router;
