// Referenced from blueprint:javascript_log_in_with_replit
import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    const replId = process.env.REPL_ID || process.env.REPLIT_DOMAINS?.split(',')[0] || 'unknown';
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      replId
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
    // Add error logging for debugging
    errorLog: (error: any) => {
      console.error('Session store error:', error);
    }
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      maxAge: sessionTtl,
      sameSite: 'lax', // Add sameSite for better security
    },
    // Add session touch to update expiry on activity
    rolling: true,
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };

  for (const domain of process.env
    .REPLIT_DOMAINS!.split(",")) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  // Redirect from incorrect endpoint to correct one (fixing 404 error)
  app.get("/api/auth/login-with-replit", (req, res) => {
    res.redirect("/api/login");
  });

  app.get("/api/callback", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      const replId = process.env.REPL_ID || process.env.REPLIT_DOMAINS?.split(',')[0] || 'unknown';
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: replId,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

// Map to track active token refreshes per user to prevent concurrent refreshes
const activeRefreshes = new Map<string, {
  promise: Promise<client.TokenEndpointResponse & client.TokenEndpointResponseHelpers>;
  timestamp: number;
}>();

// Clean up expired refresh promises (older than 10 seconds)
const cleanupExpiredRefreshes = () => {
  const now = Date.now();
  const expiredKeys: string[] = [];
  
  activeRefreshes.forEach((value, key) => {
    // Keep the promise for at least 10 seconds to handle burst requests
    // This ensures concurrent requests within 10 seconds reuse the same refresh
    if (now - value.timestamp > 10000) {
      expiredKeys.push(key);
    }
  });
  
  expiredKeys.forEach(key => activeRefreshes.delete(key));
};

// Run cleanup every 15 seconds
setInterval(cleanupExpiredRefreshes, 15000);

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user?.claims?.sub) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Check if we have an expires_at value
  if (!user.expires_at) {
    // If no expiry set, treat token as expired to force refresh
    console.warn(`No expiry time for user ${user.claims?.sub}, forcing token refresh`);
  } else {
    const now = Math.floor(Date.now() / 1000);
    // Add a 60-second buffer before expiry to refresh proactively
    if (now <= user.expires_at - 60) {
      return next();
    }
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Use only userId as key since tokens should be same across sessions for same user
  // This prevents multiple refresh attempts for same user across different sessions
  const userId = user.claims?.sub || 'unknown';
  const refreshKey = userId;
  
  try {
    // Check if a refresh is already in progress for this user
    let refreshEntry = activeRefreshes.get(refreshKey);
    
    if (!refreshEntry) {
      // Log the start of a new refresh operation
      console.log(`Starting token refresh for user: ${userId}`);
      
      // Start a new refresh operation
      const config = await getOidcConfig();
      const tokenPromise = client.refreshTokenGrant(config, refreshToken);
      
      // Store the promise with timestamp for concurrent requests to reuse
      refreshEntry = {
        promise: tokenPromise,
        timestamp: Date.now()
      };
      activeRefreshes.set(refreshKey, refreshEntry);
      
      // Clean up on completion (let the interval handle cleanup)
      tokenPromise
        .then(() => {
          console.log(`Token refresh successful for user: ${userId}`);
        })
        .catch((err: any) => {
          console.error(`Token refresh failed for user: ${userId}`, err.message);
          // Remove failed refresh immediately so retries can occur
          activeRefreshes.delete(refreshKey);
        });
    } else {
      console.log(`Reusing existing refresh promise for user: ${userId}`);
    }
    
    // Wait for the refresh to complete
    const tokenResponse = await refreshEntry.promise;
    updateUserSession(user, tokenResponse);
    
    // Simplified session save with single retry
    try {
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            console.error(`Failed to save session after token refresh for user ${userId}:`, err);
            reject(err);
          } else {
            console.log(`Session saved successfully for user: ${userId}`);
            resolve();
          }
        });
      });
    } catch (sessionError: any) {
      // Try once more after a brief delay
      console.log(`Retrying session save for user ${userId}`);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      try {
        await new Promise<void>((resolve, reject) => {
          req.session.save((err) => {
            if (err) {
              reject(err);
            } else {
              console.log(`Session saved successfully on retry for user: ${userId}`);
              resolve();
            }
          });
        });
      } catch (finalError: any) {
        // If both attempts fail, log but continue
        // The token refresh succeeded, so the user is authenticated
        console.error('Session save failed after retry, continuing anyway:', {
          userId,
          error: finalError.message
        });
        // Don't block the request since authentication succeeded
      }
    }
    
    return next();
  } catch (error: any) {
    console.error('Token refresh failed:', {
      userId,
      error: error.message
    });
    
    // Remove failed refresh to allow retry
    activeRefreshes.delete(refreshKey);
    
    res.status(401).json({ 
      message: "Unauthorized", 
      error: "Token refresh failed"
    });
    return;
  }
};
