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

// Map to track active token refreshes per user session with thread-safe operations
const activeRefreshes = new Map<string, { 
  promise: Promise<client.TokenEndpointResponse & client.TokenEndpointResponseHelpers>, 
  timestamp: number,
  refCount: number  // Track number of waiting requests
}>();

// Mutex-like lock for concurrent map operations
const refreshLock = new Map<string, Promise<void>>();

// Clean up stale refresh promises (older than 30 seconds)
const cleanupStaleRefreshes = () => {
  const now = Date.now();
  const staleTimeout = 30000; // 30 seconds
  
  // Use a separate array to avoid mutation during iteration
  const keysToDelete: string[] = [];
  
  activeRefreshes.forEach((value, key) => {
    // Only clean up if no requests are waiting and it's stale
    if (value.refCount === 0 && now - value.timestamp > staleTimeout) {
      keysToDelete.push(key);
    }
  });
  
  keysToDelete.forEach(key => {
    activeRefreshes.delete(key);
    refreshLock.delete(key);
  });
};

// Periodic cleanup task
const cleanupInterval = setInterval(cleanupStaleRefreshes, 10000); // Run every 10 seconds

// Clean up on process exit
process.on('SIGTERM', () => {
  clearInterval(cleanupInterval);
});

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user?.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  // Add a 30-second buffer before expiry to refresh proactively
  if (now <= user.expires_at - 30) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Create a unique key for this user's refresh operation
  const userId = user.claims?.sub || 'unknown';
  const sessionId = req.sessionID || 'no-session';
  const refreshKey = `${userId}-${sessionId}`;
  
  try {
    // Wait for any existing lock operation to complete
    const existingLock = refreshLock.get(refreshKey);
    if (existingLock) {
      await existingLock;
    }
    
    // Create a new lock for this operation
    let releaseLock: () => void;
    const lockPromise = new Promise<void>(resolve => {
      releaseLock = resolve;
    });
    refreshLock.set(refreshKey, lockPromise);
    
    try {
      // Check if a refresh is already in progress for this user
      const existingRefresh = activeRefreshes.get(refreshKey);
      let tokenResponsePromise: Promise<client.TokenEndpointResponse & client.TokenEndpointResponseHelpers>;
      
      if (!existingRefresh || existingRefresh.timestamp < Date.now() - 30000) {
        // No active refresh or it's stale, start a new one
        const config = await getOidcConfig();
        tokenResponsePromise = client.refreshTokenGrant(config, refreshToken);
        
        // Store the promise with timestamp and initial refCount
        activeRefreshes.set(refreshKey, { 
          promise: tokenResponsePromise, 
          timestamp: Date.now(),
          refCount: 1
        });
        
        // Clean up after completion
        tokenResponsePromise
          .finally(() => {
            // Decrement refCount after a delay
            setTimeout(() => {
              const current = activeRefreshes.get(refreshKey);
              if (current) {
                current.refCount = Math.max(0, current.refCount - 1);
                if (current.refCount === 0) {
                  // Remove after 5 seconds if no one is using it
                  setTimeout(() => {
                    const check = activeRefreshes.get(refreshKey);
                    if (check && check.refCount === 0) {
                      activeRefreshes.delete(refreshKey);
                    }
                  }, 5000);
                }
              }
            }, 100);
          });
      } else {
        // Use the existing refresh promise and increment refCount
        existingRefresh.refCount++;
        tokenResponsePromise = existingRefresh.promise;
        
        // Decrement refCount when done
        tokenResponsePromise.finally(() => {
          setTimeout(() => {
            const current = activeRefreshes.get(refreshKey);
            if (current) {
              current.refCount = Math.max(0, current.refCount - 1);
            }
          }, 100);
        });
      }
      
      // Release the lock before waiting
      releaseLock!();
      refreshLock.delete(refreshKey);
      
      // Wait for the refresh to complete
      const tokenResponse = await tokenResponsePromise;
      updateUserSession(user, tokenResponse);
      
      // Save the session to persist the new tokens
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      
      return next();
    } finally {
      // Ensure lock is released even on error
      if (releaseLock!) {
        releaseLock!();
        refreshLock.delete(refreshKey);
      }
    }
  } catch (error: any) {
    console.error('Token refresh failed:', {
      userId,
      error: error.message,
      stack: error.stack
    });
    
    // Clear the failed refresh to allow retry
    activeRefreshes.delete(refreshKey);
    
    res.status(401).json({ 
      message: "Unauthorized", 
      error: "Token refresh failed"
    });
    return;
  }
};
