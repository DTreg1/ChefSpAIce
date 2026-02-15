import { Router } from "express";
import { OAuth2Client } from "google-auth-library";
import appleSignin from "apple-signin-auth";
import { z } from "zod";
import { setAuthCookie } from "../lib/session-utils";
import { db } from "../db";
import { users, authProviders, userSyncData } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { AppError } from "../middleware/errorHandler";
import { validateBody } from "../middleware/validateBody";
import { successResponse } from "../lib/apiResponse";
import { logger } from "../lib/logger";
import { createSession } from "../domain/services";
import { encryptTokenOrNull } from "../lib/token-encryption";
import { createOrUpdateSubscription } from "../stripe/subscriptionService";

const router = Router();

async function createSyncDataIfNeeded(userId: string): Promise<void> {
  try {
    await db.insert(userSyncData).values({
      userId,
    }).onConflictDoNothing();
  } catch (error) {
    logger.warn("Failed to create sync data row", { userId, error: error instanceof Error ? error.message : String(error) });
  }
}

function getGoogleClientIds(): string[] {
  const clientIds: string[] = [];
  if (process.env.GOOGLE_CLIENT_ID) clientIds.push(process.env.GOOGLE_CLIENT_ID);
  if (process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID) clientIds.push(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID);
  if (process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID) clientIds.push(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID);
  if (process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID) clientIds.push(process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID);
  return clientIds.filter((id, index, self) => id && self.indexOf(id) === index);
}

const appleAuthSchema = z.object({
  identityToken: z.string().optional(),
  authorizationCode: z.string().optional(),
  user: z.object({ email: z.string().optional() }).optional(),
  isWebAuth: z.boolean().optional(),
  redirectUri: z.string().optional(),
  selectedPlan: z.enum(["monthly", "annual"]).optional(),
  selectedTier: z.enum(["basic", "pro"]).optional(),
});

router.post("/apple", validateBody(appleAuthSchema), async (req, res, next) => {
  logger.info("Apple sign-in request received");
  try {
    const { identityToken, authorizationCode, user, isWebAuth, redirectUri } = req.body;

    logger.info("Apple auth payload received", { hasIdentityToken: !!identityToken, hasAuthCode: !!authorizationCode, isWebAuth });

    let verifiedToken: { sub: string; email?: string } | null = null;
    
    // Handle web OAuth flow - exchange authorization code for tokens
    if (isWebAuth && authorizationCode && !identityToken) {
      try {
        const tokenResponse = await exchangeAppleAuthCode(authorizationCode, redirectUri);
        if (!tokenResponse) {
          throw AppError.unauthorized("Failed to exchange Apple authorization code. Please try again.", "APPLE_AUTH_CODE_EXCHANGE_FAILED");
        }
        verifiedToken = tokenResponse;
      } catch (error) {
        if (error instanceof AppError) throw error;
        throw AppError.unauthorized("Apple web authentication failed. Please try again.", "APPLE_WEB_AUTH_FAILED");
      }
    }
    // Handle native iOS flow - verify identity token directly
    else if (identityToken) {
      logger.info("Verifying native iOS Apple token");
      verifiedToken = await verifyAppleToken(identityToken);
    }
    else {
      throw AppError.badRequest("Sign-in incomplete. Please try again.", "APPLE_AUTH_INCOMPLETE");
    }

    if (!verifiedToken || !verifiedToken.sub) {
      throw AppError.unauthorized("Unable to verify Apple credentials. Please try signing in again.", "APPLE_TOKEN_VERIFICATION_FAILED");
    }
    
    logger.info("Apple token verified successfully", { subPrefix: verifiedToken.sub.substring(0, 8) });

    const { sub: appleUserId, email: tokenEmail } = verifiedToken;
    const email = tokenEmail || user?.email || null;
    const { userId, isNewUser, dbUser } = await db.transaction(async (tx) => {
      const existingProvider = await tx
        .select({ userId: authProviders.userId })
        .from(authProviders)
        .where(and(eq(authProviders.provider, 'apple'), eq(authProviders.providerId, appleUserId)))
        .limit(1);

      let resolvedUserId: string;
      let newUser = false;

      if (existingProvider.length > 0) {
        resolvedUserId = existingProvider[0].userId;
      } else {
        if (email) {
          const existingUserByEmail = await tx
            .select({ id: users.id })
            .from(users)
            .where(eq(users.email, email))
            .limit(1);
          
          if (existingUserByEmail.length > 0) {
            resolvedUserId = existingUserByEmail[0].id;
            
            await tx
              .insert(authProviders)
              .values({
                userId: resolvedUserId,
                provider: 'apple',
                providerId: appleUserId,
                providerEmail: email,
                isPrimary: false,
                metadata: {},
              })
              .onConflictDoNothing();
          } else {
            newUser = true;
            const [userResult] = await tx
              .insert(users)
              .values({
                email,
                primaryProvider: 'apple',
                primaryProviderId: appleUserId,
              })
              .returning({ id: users.id });
            resolvedUserId = userResult.id;

            await tx.insert(authProviders).values({
              userId: resolvedUserId,
              provider: 'apple',
              providerId: appleUserId,
              providerEmail: email,
              isPrimary: true,
              metadata: {},
            });
          }
        } else {
          newUser = true;
          const [userResult] = await tx
            .insert(users)
            .values({
              email: appleUserId + '@noreply.chefspaice.com',
              primaryProvider: 'apple',
              primaryProviderId: appleUserId,
            })
            .returning({ id: users.id });
          resolvedUserId = userResult.id;

          await tx.insert(authProviders).values({
            userId: resolvedUserId,
            provider: 'apple',
            providerId: appleUserId,
            isPrimary: true,
            metadata: {},
          });
        }
      }

      const [fetchedUser] = await tx
        .select({
          id: users.id,
          email: users.email,
          displayName: users.displayName,
          profileImageUrl: users.profileImageUrl,
          createdAt: users.createdAt,
          hasCompletedOnboarding: users.hasCompletedOnboarding,
        })
        .from(users)
        .where(eq(users.id, resolvedUserId))
        .limit(1);

      if (!fetchedUser) {
        throw AppError.internal("Failed to retrieve user data", "USER_DATA_RETRIEVAL_FAILED");
      }

      return { userId: resolvedUserId, isNewUser: newUser, dbUser: fetchedUser };
    });

    if (isNewUser) {
      await createSyncDataIfNeeded(userId);
      
      try {
        const now = new Date();
        const trialEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        await createOrUpdateSubscription({
          userId,
          status: "trialing",
          planType: "monthly",
          currentPeriodStart: now,
          currentPeriodEnd: trialEnd,
          trialStart: now,
          trialEnd: trialEnd,
        });
      } catch (subError) {
        logger.error("Failed to create trial subscription for Apple auth (non-fatal)", {
          userId,
          error: subError instanceof Error ? subError.message : String(subError),
        });
      }
    }

    const { rawToken, expiresAt } = await createSession(userId, {
      userAgent: req.headers["user-agent"],
      ipAddress: req.ip,
    });

    // Set persistent auth cookie for web auto sign-in
    setAuthCookie(res, rawToken, req);

    res.json(successResponse({
      user: {
        id: dbUser.id,
        email: dbUser.email,
        displayName: dbUser.displayName || undefined,
        avatarUrl: dbUser.profileImageUrl,
        provider: "apple",
        isNewUser,
        createdAt: dbUser.createdAt?.toISOString() || new Date().toISOString(),
        hasCompletedOnboarding: dbUser.hasCompletedOnboarding ?? false,
      },
      token: rawToken,
      expiresAt: expiresAt.toISOString(),
    }));
  } catch (error) {
    next(error);
  }
});

const googleAuthSchema = z.object({
  idToken: z.string().min(1, "ID token is required"),
  accessToken: z.string().optional(),
  selectedPlan: z.enum(["monthly", "annual"]).optional(),
});

router.post("/google", validateBody(googleAuthSchema), async (req, res, next) => {
  try {
    const { idToken, accessToken: rawAccessToken } = req.body;
    const accessToken = encryptTokenOrNull(rawAccessToken);
    
    const googleClient = new OAuth2Client();
    let payload;

    const clientIds = getGoogleClientIds();
    if (clientIds.length === 0) {
      throw AppError.internal("Google authentication not configured", "GOOGLE_AUTH_NOT_CONFIGURED");
    }

    try {
      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: clientIds,
      });
      payload = ticket.getPayload();
    } catch (verifyError) {
      throw AppError.unauthorized("Invalid Google token", "INVALID_GOOGLE_TOKEN");
    }

    if (!payload || !payload.sub) {
      throw AppError.unauthorized("Invalid Google token payload", "INVALID_GOOGLE_TOKEN_PAYLOAD");
    }

    const googleUserId = payload.sub;
    const email = payload.email || null;
    const picture = payload.picture || null;

    const { userId, isNewUser, dbUser } = await db.transaction(async (tx) => {
      const existingProvider = await tx
        .select({ userId: authProviders.userId })
        .from(authProviders)
        .where(and(eq(authProviders.provider, 'google'), eq(authProviders.providerId, googleUserId)))
        .limit(1);

      let resolvedUserId: string;
      let newUser = false;

      if (existingProvider.length > 0) {
        resolvedUserId = existingProvider[0].userId;

        await tx
          .update(authProviders)
          .set({ accessToken, updatedAt: new Date() })
          .where(and(eq(authProviders.provider, 'google'), eq(authProviders.providerId, googleUserId)));
      } else {
        if (email) {
          const existingUserByEmail = await tx
            .select({ id: users.id })
            .from(users)
            .where(eq(users.email, email))
            .limit(1);

          if (existingUserByEmail.length > 0) {
            resolvedUserId = existingUserByEmail[0].id;

            await tx
              .insert(authProviders)
              .values({
                userId: resolvedUserId,
                provider: 'google',
                providerId: googleUserId,
                providerEmail: email,
                accessToken,
                isPrimary: false,
                metadata: { name: payload.name, picture },
              })
              .onConflictDoUpdate({
                target: [authProviders.provider, authProviders.providerId],
                set: { accessToken, updatedAt: new Date() },
              });

            if (picture) {
              await tx
                .update(users)
                .set({ profileImageUrl: sql`COALESCE(${users.profileImageUrl}, ${picture})` })
                .where(eq(users.id, resolvedUserId));
            }
          } else {
            newUser = true;
            const [userResult] = await tx
              .insert(users)
              .values({
                email,
                profileImageUrl: picture,
                primaryProvider: 'google',
                primaryProviderId: googleUserId,
              })
              .returning({ id: users.id });
            resolvedUserId = userResult.id;

            await tx.insert(authProviders).values({
              userId: resolvedUserId,
              provider: 'google',
              providerId: googleUserId,
              providerEmail: email,
              accessToken,
              isPrimary: true,
              metadata: { name: payload.name, picture },
            });
          }
        } else {
          newUser = true;
          const [userResult] = await tx
            .insert(users)
            .values({
              email: googleUserId + '@noreply.chefspaice.com',
              profileImageUrl: picture,
              primaryProvider: 'google',
              primaryProviderId: googleUserId,
            })
            .returning({ id: users.id });
          resolvedUserId = userResult.id;

          await tx.insert(authProviders).values({
            userId: resolvedUserId,
            provider: 'google',
            providerId: googleUserId,
            accessToken,
            isPrimary: true,
            metadata: { name: payload.name, picture },
          });
        }
      }

      const [fetchedUser] = await tx
        .select({
          id: users.id,
          email: users.email,
          displayName: users.displayName,
          profileImageUrl: users.profileImageUrl,
          createdAt: users.createdAt,
          hasCompletedOnboarding: users.hasCompletedOnboarding,
        })
        .from(users)
        .where(eq(users.id, resolvedUserId))
        .limit(1);

      if (!fetchedUser) {
        throw AppError.internal("Failed to retrieve user data", "USER_DATA_RETRIEVAL_FAILED");
      }

      return { userId: resolvedUserId, isNewUser: newUser, dbUser: fetchedUser };
    });

    if (isNewUser) {
      await createSyncDataIfNeeded(userId);
      
      try {
        const now = new Date();
        const trialEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        await createOrUpdateSubscription({
          userId,
          status: "trialing",
          planType: "monthly",
          currentPeriodStart: now,
          currentPeriodEnd: trialEnd,
          trialStart: now,
          trialEnd: trialEnd,
        });
      } catch (subError) {
        logger.error("Failed to create trial subscription for Google auth (non-fatal)", {
          userId,
          error: subError instanceof Error ? subError.message : String(subError),
        });
      }
    }

    const { rawToken, expiresAt } = await createSession(userId, {
      userAgent: req.headers["user-agent"],
      ipAddress: req.ip,
    });

    // Set persistent auth cookie for web auto sign-in
    setAuthCookie(res, rawToken, req);

    res.json(successResponse({
      user: {
        id: dbUser.id,
        email: dbUser.email,
        displayName: dbUser.displayName || payload.name || undefined,
        avatarUrl: dbUser.profileImageUrl,
        provider: "google",
        isNewUser,
        createdAt: dbUser.createdAt?.toISOString() || new Date().toISOString(),
        hasCompletedOnboarding: dbUser.hasCompletedOnboarding ?? false,
      },
      token: rawToken,
      expiresAt: expiresAt.toISOString(),
    }));
  } catch (error) {
    next(error);
  }
});

// Exchange Apple authorization code for tokens (web OAuth flow)
async function exchangeAppleAuthCode(authorizationCode: string, clientRedirectUri?: string): Promise<{ sub: string; email?: string } | null> {
  const clientId = process.env.APPLE_CLIENT_ID;
  const teamId = process.env.APPLE_TEAM_ID;
  const keyId = process.env.APPLE_KEY_ID;
  const privateKey = process.env.APPLE_PRIVATE_KEY;
  
  if (!clientId || !teamId || !keyId || !privateKey) {
    logger.error("Apple web auth not configured: missing APPLE_CLIENT_ID, APPLE_TEAM_ID, APPLE_KEY_ID, or APPLE_PRIVATE_KEY");
    return null;
  }
  
  try {
    // Generate client secret for Apple token exchange
    const clientSecret = appleSignin.getClientSecret({
      clientID: clientId,
      teamID: teamId,
      keyIdentifier: keyId,
      privateKey: privateKey.replace(/\\n/g, '\n'), // Handle escaped newlines from env
    });
    
    // Use the redirect URI from the client if provided, otherwise construct one
    // This must exactly match what was used in the authorization request
    let redirectUri = clientRedirectUri;
    if (!redirectUri) {
      const domain = process.env.REPLIT_DEV_DOMAIN || 'localhost:5000';
      redirectUri = domain.includes('localhost') 
        ? 'https://localhost:5000/auth/callback/apple'
        : `https://${domain}/auth/callback/apple`;
    }
    
    if (process.env.NODE_ENV !== "production") {
      logger.debug("Apple auth code exchange", { redirectUri });
    }
      
    const tokenResponse = await appleSignin.getAuthorizationToken(authorizationCode, {
      clientID: clientId,
      clientSecret,
      redirectUri,
    });
    
    if (!tokenResponse || !tokenResponse.id_token) {
      logger.error("Apple token exchange failed: no id_token in response");
      return null;
    }
    
    // Verify the ID token from the exchange
    const payload = await appleSignin.verifyIdToken(tokenResponse.id_token, {
      audience: clientId,
      ignoreExpiration: false,
    });
    
    if (!payload || !payload.sub) {
      logger.error("Apple token verification failed after exchange");
      return null;
    }
    
    return {
      sub: payload.sub,
      email: payload.email,
    };
  } catch (error) {
    logger.error("Apple auth code exchange error", { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

async function verifyAppleToken(identityToken: string): Promise<{ sub: string; email?: string } | null> {
  // Support bundle ID (native iOS), service ID (web), and Expo Go (development)
  // Native iOS uses bundle ID as audience, web uses service ID
  // Expo Go uses its own bundle ID for development testing
  const bundleId = "com.chefspaice.chefspaice";
  const serviceId = process.env.APPLE_CLIENT_ID || `service.${bundleId}`;
  const expoGoBundleId = "host.exp.Exponent"; // Expo Go bundle ID for development
  const validAudiences = [bundleId, serviceId, expoGoBundleId];
  
  logger.info("Verifying Apple token", { audiences: validAudiences });
  
  const errors: Array<{ audience: string; error: string }> = [];
  
  try {
    // Try each audience - native iOS tokens use bundle ID, web tokens use service ID
    for (const audience of validAudiences) {
      try {
        const payload = await appleSignin.verifyIdToken(identityToken, {
          audience,
          ignoreExpiration: false,
        });
        
        if (payload && payload.sub) {
          logger.info("Apple token verified successfully", { audience });
          return {
            sub: payload.sub,
            email: payload.email,
          };
        }
      } catch (err) {
        const errMessage = err instanceof Error ? err.message : String(err);
        errors.push({ audience, error: errMessage });
        // Try next audience
        continue;
      }
    }
    
    logger.error("Apple token verification failed - no valid audience matched", { errors });
    return null;
  } catch (error) {
    logger.error("Apple token JWKS verification failed", { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

export default router;
