import { Router, Request, Response } from "express";
import { OAuth2Client } from "google-auth-library";
import appleSignin from "apple-signin-auth";
import { randomBytes } from "crypto";
import pg from "pg";
import { db } from "../db";
import { userSessions, userSyncData, subscriptions } from "@shared/schema";
import { eq } from "drizzle-orm";

const router = Router();

const TRIAL_DAYS = 7;

async function createTrialSubscription(userId: string, selectedPlan: 'monthly' | 'annual' = 'monthly'): Promise<void> {
  const [existing] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  if (existing) {
    return;
  }

  const now = new Date();
  const trialEnd = new Date(now);
  trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS);

  try {
    await db.insert(subscriptions).values({
      userId,
      status: 'trialing',
      planType: selectedPlan,
      currentPeriodStart: now,
      currentPeriodEnd: trialEnd,
      trialStart: now,
      trialEnd: trialEnd,
      cancelAtPeriodEnd: false,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('unique') || errorMessage.includes('duplicate')) {
      return;
    }
    throw error;
  }
}

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
  identityToken: string;
  authorizationCode: string;
  selectedPlan?: 'monthly' | 'annual';
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
    const { identityToken, authorizationCode, user, selectedPlan } = req.body as AppleTokenPayload;

    if (!identityToken) {
      return res.status(400).json({ error: "Identity token is required" });
    }

    const verifiedToken = await verifyAppleToken(identityToken);
    if (!verifiedToken || !verifiedToken.sub) {
      return res.status(401).json({ error: "Invalid Apple token" });
    }

    const { sub: appleUserId, email: tokenEmail } = verifiedToken;
    const email = tokenEmail || user?.email || null;
    const firstName = user?.name?.firstName || null;
    const lastName = user?.name?.lastName || null;
    const validPlans = ['monthly', 'annual'];
    const plan = validPlans.includes(selectedPlan || '') ? selectedPlan as 'monthly' | 'annual' : 'monthly';

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
      await createTrialSubscription(userId, plan);
    }

    const { token, expiresAt } = await createSessionWithDrizzle(userId);

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
      await createTrialSubscription(userId, plan);
    }

    const { token, expiresAt } = await createSessionWithDrizzle(userId);

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

async function verifyAppleToken(identityToken: string): Promise<{ sub: string; email?: string } | null> {
  // Support both bundle ID (native iOS) and service ID (web)
  // Native iOS uses bundle ID as audience, web uses service ID
  const bundleId = "com.chefspaice.chefspaice";
  const serviceId = process.env.APPLE_CLIENT_ID || `service.${bundleId}`;
  const validAudiences = [bundleId, serviceId];
  
  try {
    // Try each audience - native iOS tokens use bundle ID, web tokens use service ID
    for (const audience of validAudiences) {
      try {
        const payload = await appleSignin.verifyIdToken(identityToken, {
          audience,
          ignoreExpiration: false,
        });
        
        if (payload && payload.sub) {
          console.log(`Apple token verified with audience: ${audience}`);
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
