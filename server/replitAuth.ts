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
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
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
    },
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

  app.get("/api/callback", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

// Map to track active token refreshes per user session
const activeRefreshes = new Map<string, { promise: Promise<client.TokenEndpointResponse & client.TokenEndpointResponseHelpers>, timestamp: number }>();

// Clean up stale refresh promises (older than 30 seconds)
const cleanupStaleRefreshes = () => {
  const now = Date.now();
  const staleTimeout = 30000; // 30 seconds
  
  Array.from(activeRefreshes.entries()).forEach(([key, value]) => {
    if (now - value.timestamp > staleTimeout) {
      activeRefreshes.delete(key);
    }
  });
};

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  // Create a unique key for this user's refresh operation
  const userId = user.claims?.sub || 'unknown';
  const refreshKey = `${userId}-${refreshToken.substring(0, 10)}`;
  
  // Clean up stale refreshes periodically
  cleanupStaleRefreshes();
  
  try {
    // Check if a refresh is already in progress for this user
    const existingRefresh = activeRefreshes.get(refreshKey);
    let tokenResponsePromise: Promise<client.TokenEndpointResponse & client.TokenEndpointResponseHelpers>;
    
    if (!existingRefresh) {
      // No active refresh, start a new one
      const config = await getOidcConfig();
      tokenResponsePromise = client.refreshTokenGrant(config, refreshToken);
      
      // Store the promise with timestamp so concurrent requests can wait for it
      activeRefreshes.set(refreshKey, { 
        promise: tokenResponsePromise, 
        timestamp: Date.now() 
      });
      
      // Clean up the promise after success, but keep failed ones briefly to prevent retry storms
      tokenResponsePromise
        .then(() => {
          // On success, remove immediately
          activeRefreshes.delete(refreshKey);
        })
        .catch((error) => {
          // On failure, keep for 5 seconds to prevent immediate retries
          setTimeout(() => {
            activeRefreshes.delete(refreshKey);
          }, 5000);
        });
    } else {
      // Use the existing refresh promise
      tokenResponsePromise = existingRefresh.promise;
    }
    
    // Wait for the refresh to complete
    const tokenResponse = await tokenResponsePromise;
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error: any) {
    console.error('Token refresh failed:', error);
    
    // If the refresh token is invalid, we need to clear the session
    // and force the user to re-authenticate
    if (error?.cause?.error === 'invalid_grant' || error?.error === 'invalid_grant') {
      // Clear the session to force re-authentication
      req.logout((err) => {
        if (err) {
          console.error('Error logging out user during token refresh failure:', err);
        }
      });
      
      // Clear the refresh key from active refreshes to allow retry
      activeRefreshes.delete(refreshKey);
      
      res.status(401).json({ 
        message: "Session expired. Please log in again.",
        error: "session_expired",
        requiresReauth: true 
      });
      return;
    }
    
    // For other errors, just return unauthorized
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};
