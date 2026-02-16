import { db } from "../../db";
import { users, userSessions, userSyncData, referrals } from "@shared/schema";
import { eq, and, inArray } from "drizzle-orm";
import { generateToken, getExpiryDate } from "../../lib/session-utils";
import { hashToken, anonymizeIpAddress } from "../../lib/auth-utils";
import bcrypt from "bcrypt";
import { checkAndRedeemReferralCredits } from "../../services/subscriptionService";
import { createOrUpdateSubscription } from "../../stripe/subscriptionService";
import { logger } from "../../lib/logger";
import type { User } from "@shared/domain";
import type { DomainEvent, UserSignedUp, UserLoggedIn } from "@shared/domain";
import { createEvent, createEmail } from "@shared/domain";
import { AppError } from "../../middleware/errorHandler";
import { sessionCache } from "../../lib/session-cache";

const BCRYPT_ROUNDS = 12;

export interface RegisterResult {
  user: User;
  rawToken: string;
  events: DomainEvent[];
}

export interface LoginResult {
  user: User;
  rawToken: string;
  events: DomainEvent[];
}

export function validatePassword(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters";
  if (!/[A-Z]/.test(password)) return "Password must contain an uppercase letter";
  if (!/[a-z]/.test(password)) return "Password must contain a lowercase letter";
  if (!/[0-9]/.test(password)) return "Password must contain a number";
  return null;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(
  userId: string,
  requestMeta?: { userAgent?: string; ipAddress?: string }
): Promise<{ rawToken: string; expiresAt: Date }> {
  const rawToken = generateToken();
  const hashedToken = hashToken(rawToken);
  const expiresAt = getExpiryDate();

  await db.insert(userSessions).values({
    userId,
    token: hashedToken,
    userAgent: requestMeta?.userAgent || "unknown",
    ipAddress: anonymizeIpAddress(requestMeta?.ipAddress),
    expiresAt,
  });

  return { rawToken, expiresAt };
}

export async function registerWithEmail(
  email: string,
  password: string,
  displayName?: string,
  selectedPlan?: "monthly" | "annual",
  referralCode?: string,
  requestMeta?: { userAgent?: string; ipAddress?: string }
): Promise<RegisterResult> {
  if (!email || !password) {
    throw AppError.badRequest("Email and password are required", "MISSING_CREDENTIALS");
  }

  let emailVO: ReturnType<typeof createEmail>;
  try {
    emailVO = createEmail(email);
  } catch {
    throw AppError.badRequest("Please enter a valid email address", "INVALID_EMAIL");
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    throw AppError.badRequest(passwordError, "WEAK_PASSWORD");
  }

  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.email, emailVO.value))
    .limit(1);

  if (existingUser.length > 0) {
    throw AppError.conflict("An account with this email already exists", "EMAIL_EXISTS");
  }

  const hashedPw = await hashPassword(password);

  const { newUser, rawToken } = await db.transaction(async (tx) => {
    const [createdUser] = await tx
      .insert(users)
      .values({
        email: emailVO.value,
        password: hashedPw,
        displayName: displayName || email.split("@")[0],
      })
      .returning();

    const rawTokenInner = generateToken();
    const hashedTokenInner = hashToken(rawTokenInner);
    const expiresAtInner = getExpiryDate();

    await tx.insert(userSessions).values({
      userId: createdUser.id,
      token: hashedTokenInner,
      userAgent: requestMeta?.userAgent || "unknown",
      ipAddress: anonymizeIpAddress(requestMeta?.ipAddress),
      expiresAt: expiresAtInner,
    });

    await tx.insert(userSyncData).values({
      userId: createdUser.id,
    });

    if (referralCode && typeof referralCode === "string") {
      try {
        const [referrer] = await tx
          .select({ id: users.id, referralCode: users.referralCode })
          .from(users)
          .where(eq(users.referralCode, referralCode.toUpperCase()))
          .limit(1);

        if (referrer && referrer.id !== createdUser.id) {
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

          await checkAndRedeemReferralCredits(referrer.id);
        }
      } catch (refError) {
        logger.error("Referral processing error (non-fatal)", {
          error: refError instanceof Error ? refError.message : String(refError),
        });
      }
    }

    return { newUser: createdUser, rawToken: rawTokenInner };
  });

  try {
    const now = new Date();
    const trialEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    await createOrUpdateSubscription({
      userId: newUser.id,
      status: "trialing",
      planType: "monthly",
      currentPeriodStart: now,
      currentPeriodEnd: trialEnd,
      trialStart: now,
      trialEnd: trialEnd,
    });
  } catch (subError) {
    logger.error("Failed to create trial subscription (non-fatal)", {
      userId: newUser.id,
      error: subError instanceof Error ? subError.message : String(subError),
    });
  }

  const event = createEvent<UserSignedUp>({
    type: "UserSignedUp",
    userId: newUser.id,
    email: newUser.email,
    provider: "email",
    referralCode: referralCode || undefined,
  });

  return { user: newUser, rawToken, events: [event] };
}

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

export async function loginWithEmail(
  email: string,
  password: string,
  requestMeta?: { userAgent?: string; ipAddress?: string }
): Promise<LoginResult> {
  if (!email || !password) {
    throw AppError.badRequest("Email and password are required", "MISSING_CREDENTIALS");
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);

  if (!user || !user.password) {
    await bcrypt.compare(password, "$2b$12$LJ3m4ys3Lg2VJkgfNrB3aeL2s7E7ZV6R5V5j3K2gWq4oD8N0W7Xm6");
    throw AppError.unauthorized("Invalid email or password", "INVALID_CREDENTIALS");
  }

  if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS && user.lastFailedLoginAt) {
    const lockoutExpires = new Date(user.lastFailedLoginAt.getTime() + LOCKOUT_DURATION_MS);
    if (new Date() < lockoutExpires) {
      throw AppError.unauthorized("Invalid email or password", "INVALID_CREDENTIALS");
    }
    await db
      .update(users)
      .set({ failedLoginAttempts: 0, lastFailedLoginAt: null, updatedAt: new Date() })
      .where(eq(users.id, user.id));
  }

  const isValidPassword = await verifyPassword(password, user.password);
  if (!isValidPassword) {
    await db
      .update(users)
      .set({
        failedLoginAttempts: user.failedLoginAttempts + 1,
        lastFailedLoginAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));
    throw AppError.unauthorized("Invalid email or password", "INVALID_CREDENTIALS");
  }

  if (user.failedLoginAttempts > 0) {
    await db
      .update(users)
      .set({ failedLoginAttempts: 0, lastFailedLoginAt: null, updatedAt: new Date() })
      .where(eq(users.id, user.id));
  }

  const { rawToken } = await createSession(user.id, requestMeta);

  const event = createEvent<UserLoggedIn>({
    type: "UserLoggedIn",
    userId: user.id,
    provider: "email",
  });

  return { user, rawToken, events: [event] };
}

export async function revokeSession(
  sessionId: string,
  userId: string,
  currentToken?: string
): Promise<void> {
  const [session] = await db
    .select({ id: userSessions.id, userId: userSessions.userId, token: userSessions.token })
    .from(userSessions)
    .where(and(eq(userSessions.id, sessionId), eq(userSessions.userId, userId)))
    .limit(1);

  if (!session) {
    throw AppError.notFound("Session not found", "SESSION_NOT_FOUND");
  }

  if (currentToken) {
    const currentHashedToken = hashToken(currentToken);
    if (session.token === currentHashedToken) {
      throw AppError.badRequest("Cannot revoke your current session", "CANNOT_REVOKE_CURRENT");
    }
  }

  await sessionCache.delete(session.token);
  await db.delete(userSessions).where(eq(userSessions.id, sessionId));
}

export async function revokeAllOtherSessions(
  userId: string,
  currentTokenHash: string
): Promise<number> {
  const allSessions = await db
    .select({ id: userSessions.id, token: userSessions.token })
    .from(userSessions)
    .where(eq(userSessions.userId, userId));

  const otherSessions = allSessions.filter((s) => s.token !== currentTokenHash);
  const otherSessionIds = otherSessions.map((s) => s.id);

  if (otherSessionIds.length > 0) {
    await Promise.all(otherSessions.map((s) => sessionCache.delete(s.token)));
    await db.delete(userSessions).where(inArray(userSessions.id, otherSessionIds));
  }

  return otherSessionIds.length;
}

export async function logoutSession(rawToken: string): Promise<void> {
  const hashed = hashToken(rawToken);
  await sessionCache.delete(hashed);
  await db.delete(userSessions).where(eq(userSessions.token, hashed));
}
