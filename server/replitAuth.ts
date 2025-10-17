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

// Clean up expired refresh promises (older than 2 seconds)
const cleanupExpiredRefreshes = () => {
  const now = Date.now();
  const expiredKeys: string[] = [];
  
  activeRefreshes.forEach((value, key) => {
    // Keep the promise for at least 2 seconds to handle burst requests
    if (now - value.timestamp > 2000) {
      expiredKeys.push(key);
    }
  });
  
  expiredKeys.forEach(key => activeRefreshes.delete(key));
};

// Run cleanup every 5 seconds
setInterval(cleanupExpiredRefreshes, 5000);

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
    
    // Save the session to persist the new tokens with better error handling
    let saveAttempts = 0;
    const maxSaveAttempts = 3;
    let saveSuccessful = false;
    
    while (saveAttempts < maxSaveAttempts && !saveSuccessful) {
      try {
        await new Promise<void>((resolve, reject) => {
          // Add a timeout for session save operation
          const saveTimeout = setTimeout(() => {
            reject(new Error('Session save timeout'));
          }, 5000); // 5 second timeout
          
          req.session.save((err) => {
            clearTimeout(saveTimeout);
            if (err) {
              console.error(`Failed to save session after token refresh for user ${userId} (attempt ${saveAttempts + 1}/${maxSaveAttempts}):`, err);
              reject(err);
            } else {
              console.log(`Session saved successfully for user: ${userId}`);
              saveSuccessful = true;
              resolve();
            }
          });
        });
      } catch (sessionError: any) {
        saveAttempts++;
        if (saveAttempts < maxSaveAttempts) {
          // Wait briefly before retry
          await new Promise(resolve => setTimeout(resolve, 100 * saveAttempts));
          console.log(`Retrying session save for user ${userId} (attempt ${saveAttempts + 1}/${maxSaveAttempts})`);
        } else {
          // Final attempt failed
          console.error('Critical: Session save failed after all retries:', {
            userId,
            error: sessionError.message,
            attempts: saveAttempts
          });
          
          // Remove the refresh entry to allow retry on next request
          activeRefreshes.delete(refreshKey);
          
          // Determine if we should fail or continue based on the error type
          const isRecoverableError = sessionError.message?.includes('timeout') || 
                                     sessionError.message?.includes('ECONNREFUSED') ||
                                     sessionError.code === 'ETIMEDOUT';
          
          if (isRecoverableError) {
            // For recoverable errors, allow the request to continue
            // but inform the client about the issue
            console.warn(`Allowing request to continue despite recoverable session save failure for user ${userId}`);
            
            // Set tokens in response headers as fallback
            res.setHeader('X-Token-Refresh-Warning', 'Session persistence failed, tokens may not be saved');
            res.setHeader('X-Token-Refresh-Status', 'temporary-failure');
          } else {
            // For non-recoverable errors, fail the request to maintain consistency
            console.error(`Blocking request due to non-recoverable session save failure for user ${userId}`);
            return res.status(503).json({
              message: "Service temporarily unavailable",
              error: "Session persistence failed. Please try again later.",
              retryable: true
            });
          }
        }
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
