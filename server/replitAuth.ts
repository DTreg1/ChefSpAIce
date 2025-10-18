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
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

// Map to track active token refreshes per user to prevent concurrent refreshes
const activeRefreshes = new Map<string, Promise<client.TokenEndpointResponse & client.TokenEndpointResponseHelpers>>();

// Clean up completed promises consistently with longer delay to prevent race conditions
const cleanupRefresh = (key: string, immediate: boolean = false) => {
  if (immediate) {
    activeRefreshes.delete(key);
  } else {
    // Longer delay (500ms) to ensure all concurrent requests can reuse the result
    // This prevents race conditions under high load
    setTimeout(() => {
      activeRefreshes.delete(key);
    }, 500);
  }
};

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
    let tokenResponsePromise = activeRefreshes.get(refreshKey);
    
    if (!tokenResponsePromise) {
      // Log the start of a new refresh operation
      console.log(`Starting token refresh for user: ${userId}`);
      
      // Start a new refresh operation
      const config = await getOidcConfig();
      tokenResponsePromise = client.refreshTokenGrant(config, refreshToken);
      
      // Store the promise for concurrent requests to reuse
      activeRefreshes.set(refreshKey, tokenResponsePromise);
      
      // Clean up after completion (success or failure)
      tokenResponsePromise
        .then(() => {
          console.log(`Token refresh successful for user: ${userId}`);
          cleanupRefresh(refreshKey, false); // Success: delay cleanup
        })
        .catch((err) => {
          console.error(`Token refresh failed for user: ${userId}`, err.message);
          cleanupRefresh(refreshKey, true); // Error: immediate cleanup
        });
    } else {
      console.log(`Reusing existing refresh promise for user: ${userId}`);
    }
    
    // Wait for the refresh to complete
    const tokenResponse = await tokenResponsePromise;
    updateUserSession(user, tokenResponse);
    
    // Save the session to persist the new tokens with error handling
    await new Promise<void>((resolve, reject) => {
      req.session.save((err) => {
        if (err) {
          console.error(`Failed to save session after token refresh for user ${userId}:`, err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
    
    return next();
  } catch (error: any) {
    console.error('Token refresh failed:', {
      userId,
      error: error.message
    });
    
    // Don't delete here since it's already handled in the promise chain
    
    res.status(401).json({ 
      message: "Unauthorized", 
      error: "Token refresh failed"
    });
    return;
  }
};
