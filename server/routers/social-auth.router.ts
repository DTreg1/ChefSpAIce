import { Router, Request, Response } from "express";
import { OAuth2Client } from "google-auth-library";
import appleSignin from "apple-signin-auth";
import { randomBytes } from "crypto";
import pg from "pg";
import { db } from "../db";
import { userSessions, userSyncData } from "@shared/schema";
import { eq } from "drizzle-orm";
import { ensureTrialSubscription } from "../services/subscriptionService";

const router = Router();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

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

async function createSessionWithDrizzle(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = generateToken();
  const expiresAt = getExpiryDate();
  
  await db.insert(userSessions).values({
    userId,
    token,
    expiresAt,
  });
  
  return { token, expiresAt };
}

async function createSyncDataIfNeeded(userId: string): Promise<void> {
  try {
    await db.insert(userSyncData).values({
      userId,
    }).onConflictDoNothing();
  } catch (error) {
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

interface AppleTokenPayload {
  identityToken?: string;
  authorizationCode?: string;
  selectedPlan?: 'monthly' | 'annual';
  selectedTier?: 'basic' | 'pro';
  isWebAuth?: boolean;
  redirectUri?: string; // For web auth: the redirect URI used in the auth request
  user?: {
    email?: string;
    name?: {
      firstName?: string;
      lastName?: string;
    };
  };
}

interface GoogleTokenPayload {
  idToken: string;
  accessToken?: string;
  selectedPlan?: 'monthly' | 'annual';
}

router.post("/apple", async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const { identityToken, authorizationCode, user, selectedPlan, selectedTier, isWebAuth, redirectUri } = req.body as AppleTokenPayload;

    let verifiedToken: { sub: string; email?: string } | null = null;
    
    // Handle web OAuth flow - exchange authorization code for tokens
    if (isWebAuth && authorizationCode && !identityToken) {
      try {
        const tokenResponse = await exchangeAppleAuthCode(authorizationCode, redirectUri);
        if (!tokenResponse) {
          return res.status(401).json({ error: "Failed to exchange Apple authorization code" });
        }
        verifiedToken = tokenResponse;
      } catch (error) {
        console.error("Apple web auth code exchange error:", error);
        return res.status(401).json({ error: "Apple web authentication failed" });
      }
    }
    // Handle native iOS flow - verify identity token directly
    else if (identityToken) {
      verifiedToken = await verifyAppleToken(identityToken);
    }
    else {
      return res.status(400).json({ error: "Identity token or authorization code is required" });
    }

    if (!verifiedToken || !verifiedToken.sub) {
      return res.status(401).json({ error: "Invalid Apple token" });
    }

    const { sub: appleUserId, email: tokenEmail } = verifiedToken;
    const email = tokenEmail || user?.email || null;
    const firstName = user?.name?.firstName || null;
    const lastName = user?.name?.lastName || null;
    // Support both selectedPlan (legacy) and selectedTier (new)
    const validPlans = ['monthly', 'annual'];
    const validTiers = ['basic', 'pro'];
    const plan = validPlans.includes(selectedPlan || '') 
      ? selectedPlan as 'monthly' | 'annual' 
      : validTiers.includes(selectedTier || '') 
        ? 'monthly'  // Default to monthly billing when tier is selected
        : 'monthly';

    await client.query("BEGIN");

    const existingProviderResult = await client.query(
      `SELECT user_id FROM auth_providers WHERE provider = 'apple' AND provider_id = $1 LIMIT 1`,
      [appleUserId]
    );

    let userId: string;
    let isNewUser = false;

    if (existingProviderResult.rows.length > 0) {
      userId = existingProviderResult.rows[0].user_id;
    } else {
      if (email) {
        const existingUserByEmail = await client.query(
          `SELECT id FROM users WHERE email = $1 LIMIT 1`,
          [email]
        );
        
        if (existingUserByEmail.rows.length > 0) {
          userId = existingUserByEmail.rows[0].id;
          
          await client.query(
            `INSERT INTO auth_providers (user_id, provider, provider_id, provider_email, is_primary, metadata)
             VALUES ($1, 'apple', $2, $3, false, $4)
             ON CONFLICT (provider, provider_id) DO NOTHING`,
            [userId, appleUserId, email, JSON.stringify({ firstName, lastName })]
          );
        } else {
          isNewUser = true;
          const userResult = await client.query(
            `INSERT INTO users (email, first_name, last_name, primary_provider, primary_provider_id)
             VALUES ($1, $2, $3, 'apple', $4)
             RETURNING id`,
            [email, firstName, lastName, appleUserId]
          );
          userId = userResult.rows[0].id;

          await client.query(
            `INSERT INTO auth_providers (user_id, provider, provider_id, provider_email, is_primary, metadata)
             VALUES ($1, 'apple', $2, $3, true, $4)`,
            [userId, appleUserId, email, JSON.stringify({ firstName, lastName })]
          );
        }
      } else {
        isNewUser = true;
        const userResult = await client.query(
          `INSERT INTO users (first_name, last_name, primary_provider, primary_provider_id)
           VALUES ($1, $2, 'apple', $3)
           RETURNING id`,
          [firstName, lastName, appleUserId]
        );
        userId = userResult.rows[0].id;

        await client.query(
          `INSERT INTO auth_providers (user_id, provider, provider_id, is_primary, metadata)
           VALUES ($1, 'apple', $2, true, $3)`,
          [userId, appleUserId, JSON.stringify({ firstName, lastName })]
        );
      }
    }

    const userResult = await client.query(
      `SELECT id, email, first_name, last_name, profile_image_url, created_at FROM users WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(500).json({ error: "Failed to retrieve user data" });
    }

    const dbUser = userResult.rows[0];

    await client.query("COMMIT");

    if (isNewUser) {
      await createSyncDataIfNeeded(userId);
      await ensureTrialSubscription(userId, plan);
    }

    const { token, expiresAt } = await createSessionWithDrizzle(userId);

    // Set persistent auth cookie for web auto sign-in
    setAuthCookie(res, token, req);

    res.json({
      user: {
        id: dbUser.id,
        email: dbUser.email,
        displayName: [dbUser.first_name, dbUser.last_name].filter(Boolean).join(" ") || undefined,
        avatarUrl: dbUser.profile_image_url,
        provider: "apple",
        isNewUser,
        createdAt: dbUser.created_at?.toISOString() || new Date().toISOString(),
      },
      token,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Apple auth error:", error);
    res.status(500).json({ error: "Apple authentication failed" });
  } finally {
    client.release();
  }
});

router.post("/google", async (req: Request, res: Response) => {
  const dbClient = await pool.connect();
  try {
    const { idToken, accessToken, selectedPlan } = req.body as GoogleTokenPayload;

    if (!idToken) {
      return res.status(400).json({ error: "ID token is required" });
    }
    
    const validPlans = ['monthly', 'annual'];
    const plan = validPlans.includes(selectedPlan || '') ? selectedPlan as 'monthly' | 'annual' : 'monthly';

    const googleClient = new OAuth2Client();
    let payload;

    const clientIds = getGoogleClientIds();
    if (clientIds.length === 0) {
      console.error("No Google client IDs configured");
      return res.status(500).json({ error: "Google authentication not configured" });
    }

    try {
      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: clientIds,
      });
      payload = ticket.getPayload();
    } catch (verifyError) {
      console.error("Google token verification error:", verifyError);
      return res.status(401).json({ error: "Invalid Google token" });
    }

    if (!payload || !payload.sub) {
      return res.status(401).json({ error: "Invalid Google token payload" });
    }

    const googleUserId = payload.sub;
    const email = payload.email || null;
    const firstName = payload.given_name || null;
    const lastName = payload.family_name || null;
    const picture = payload.picture || null;

    await dbClient.query("BEGIN");

    const existingProviderResult = await dbClient.query(
      `SELECT user_id FROM auth_providers WHERE provider = 'google' AND provider_id = $1 LIMIT 1`,
      [googleUserId]
    );

    let userId: string;
    let isNewUser = false;

    if (existingProviderResult.rows.length > 0) {
      userId = existingProviderResult.rows[0].user_id;

      await dbClient.query(
        `UPDATE auth_providers SET access_token = $1, updated_at = NOW() WHERE provider = 'google' AND provider_id = $2`,
        [accessToken, googleUserId]
      );
    } else {
      if (email) {
        const existingUserByEmail = await dbClient.query(
          `SELECT id FROM users WHERE email = $1 LIMIT 1`,
          [email]
        );

        if (existingUserByEmail.rows.length > 0) {
          userId = existingUserByEmail.rows[0].id;

          await dbClient.query(
            `INSERT INTO auth_providers (user_id, provider, provider_id, provider_email, access_token, is_primary, metadata)
             VALUES ($1, 'google', $2, $3, $4, false, $5)
             ON CONFLICT (provider, provider_id) DO UPDATE SET access_token = $4, updated_at = NOW()`,
            [userId, googleUserId, email, accessToken, JSON.stringify({ name: payload.name, picture })]
          );

          if (picture) {
            await dbClient.query(
              `UPDATE users SET profile_image_url = COALESCE(profile_image_url, $1) WHERE id = $2`,
              [picture, userId]
            );
          }
        } else {
          isNewUser = true;
          const userResult = await dbClient.query(
            `INSERT INTO users (email, first_name, last_name, profile_image_url, primary_provider, primary_provider_id)
             VALUES ($1, $2, $3, $4, 'google', $5)
             RETURNING id`,
            [email, firstName, lastName, picture, googleUserId]
          );
          userId = userResult.rows[0].id;

          await dbClient.query(
            `INSERT INTO auth_providers (user_id, provider, provider_id, provider_email, access_token, is_primary, metadata)
             VALUES ($1, 'google', $2, $3, $4, true, $5)`,
            [userId, googleUserId, email, accessToken, JSON.stringify({ name: payload.name, picture })]
          );
        }
      } else {
        isNewUser = true;
        const userResult = await dbClient.query(
          `INSERT INTO users (first_name, last_name, profile_image_url, primary_provider, primary_provider_id)
           VALUES ($1, $2, $3, 'google', $4)
           RETURNING id`,
          [firstName, lastName, picture, googleUserId]
        );
        userId = userResult.rows[0].id;

        await dbClient.query(
          `INSERT INTO auth_providers (user_id, provider, provider_id, access_token, is_primary, metadata)
           VALUES ($1, 'google', $2, $3, true, $4)`,
          [userId, googleUserId, accessToken, JSON.stringify({ name: payload.name, picture })]
        );
      }
    }

    const userResult = await dbClient.query(
      `SELECT id, email, first_name, last_name, profile_image_url, created_at FROM users WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      await dbClient.query("ROLLBACK");
      return res.status(500).json({ error: "Failed to retrieve user data" });
    }

    const dbUser = userResult.rows[0];

    await dbClient.query("COMMIT");

    if (isNewUser) {
      await createSyncDataIfNeeded(userId);
      await ensureTrialSubscription(userId, plan);
    }

    const { token, expiresAt } = await createSessionWithDrizzle(userId);

    // Set persistent auth cookie for web auto sign-in
    setAuthCookie(res, token, req);

    res.json({
      user: {
        id: dbUser.id,
        email: dbUser.email,
        displayName: [dbUser.first_name, dbUser.last_name].filter(Boolean).join(" ") || payload.name,
        avatarUrl: dbUser.profile_image_url,
        provider: "google",
        isNewUser,
        createdAt: dbUser.created_at?.toISOString() || new Date().toISOString(),
      },
      token,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    await dbClient.query("ROLLBACK").catch(() => {});
    console.error("Google auth error:", error);
    res.status(500).json({ error: "Google authentication failed" });
  } finally {
    dbClient.release();
  }
});

// Exchange Apple authorization code for tokens (web OAuth flow)
async function exchangeAppleAuthCode(authorizationCode: string, clientRedirectUri?: string): Promise<{ sub: string; email?: string } | null> {
  const clientId = process.env.APPLE_CLIENT_ID;
  const teamId = process.env.APPLE_TEAM_ID;
  const keyId = process.env.APPLE_KEY_ID;
  const privateKey = process.env.APPLE_PRIVATE_KEY;
  
  if (!clientId || !teamId || !keyId || !privateKey) {
    console.error("Apple web auth not configured: missing APPLE_CLIENT_ID, APPLE_TEAM_ID, APPLE_KEY_ID, or APPLE_PRIVATE_KEY");
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
      console.log("[Auth] Apple auth code exchange with redirectUri:", redirectUri);
    }
      
    const tokenResponse = await appleSignin.getAuthorizationToken(authorizationCode, {
      clientID: clientId,
      clientSecret,
      redirectUri,
    });
    
    if (!tokenResponse || !tokenResponse.id_token) {
      console.error("Apple token exchange failed: no id_token in response");
      return null;
    }
    
    // Verify the ID token from the exchange
    const payload = await appleSignin.verifyIdToken(tokenResponse.id_token, {
      audience: clientId,
      ignoreExpiration: false,
    });
    
    if (!payload || !payload.sub) {
      console.error("Apple token verification failed after exchange");
      return null;
    }
    
    return {
      sub: payload.sub,
      email: payload.email,
    };
  } catch (error) {
    console.error("Apple auth code exchange error:", error);
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
  
  try {
    // Try each audience - native iOS tokens use bundle ID, web tokens use service ID
    for (const audience of validAudiences) {
      try {
        const payload = await appleSignin.verifyIdToken(identityToken, {
          audience,
          ignoreExpiration: false,
        });
        
        if (payload && payload.sub) {
          if (process.env.NODE_ENV !== "production") {
            console.log(`[Auth] Apple token verified with audience: ${audience}`);
          }
          return {
            sub: payload.sub,
            email: payload.email,
          };
        }
      } catch (err) {
        // Try next audience
        continue;
      }
    }
    
    console.warn("Apple token verification failed: no valid audience matched");
    return null;
  } catch (error) {
    console.error("Apple token JWKS verification failed:", error);
    return null;
  }
}

export default router;
