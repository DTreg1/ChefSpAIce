/**
 * Replit Authentication Setup
 * 
 * Configures OpenID Connect (OIDC) authentication with Replit integration.
 * Handles user authentication, session management, and token refresh.
 * 
 * Architecture:
 * - Protocol: OpenID Connect (OIDC) via Replit's identity provider
 * - Session Storage: PostgreSQL via connect-pg-simple
 * - Passport.js: Authentication middleware for Express
 * - Token Refresh: Automatic refresh using refresh tokens
 * 
 * Authentication Flow:
 * 1. User visits /api/login → redirects to Replit OAuth
 * 2. User authenticates with Replit
 * 3. Replit redirects to /api/callback with authorization code
 * 4. Exchange code for access token + refresh token
 * 5. Create session and upsert user in database
 * 6. Redirect user to original destination or home
 * 
 * Session Management:
 * - Storage: PostgreSQL 'sessions' table
 * - TTL: 7 days (604800 seconds)
 * - Cookies: HTTP-only, secure, same-site
 * - Serialization: Full user object stored in session
 * 
 * Multi-Domain Support:
 * - Strategies registered for each domain in REPLIT_DOMAINS
 * - Dynamic strategy registration for new domains
 * - Fallback to primary domain on authentication errors
 * - Security: Only allows Replit domains (.replit.dev, .replit.app)
 * 
 * Token Refresh:
 * - Automatic: isAuthenticated middleware checks token expiration
 * - Deduplication: Prevents multiple concurrent refresh requests per user
 * - Cleanup: Removes stale refresh promises after 30 seconds
 * - Error Handling: Forces re-authentication on invalid refresh tokens
 * 
 * Environment Variables:
 * - REPLIT_DOMAINS: Comma-separated list of allowed domains
 * - ISSUER_URL: OIDC issuer (default: https://replit.com/oidc)
 * - REPL_ID: Application identifier (client_id)
 * - SESSION_SECRET: Session encryption key
 * - DATABASE_URL: PostgreSQL connection string
 * 
 * Security Considerations:
 * - Sessions stored server-side (PostgreSQL), only session ID in cookie
 * - Tokens never exposed to client
 * - HTTPS required (secure cookies)
 * - Domain validation prevents unauthorized domains
 * - Token refresh deduplicated to prevent race conditions
 * 
 * @module server/replitAuth
 */

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

/**
 * Get OIDC configuration via discovery
 * 
 * Fetches OpenID Connect configuration from Replit's well-known endpoint.
 * Cached for 1 hour to reduce unnecessary network calls.
 * 
 * @returns OIDC configuration object with endpoints and supported features
 * @private
 */
const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

/**
 * Create Express session middleware
 * 
 * Configures session management using PostgreSQL for persistence.
 * Sessions survive server restarts and scale across multiple instances.
 * 
 * @returns Express session middleware configured for Replit auth
 * 
 * Session Configuration:
 * - Store: PostgreSQL via connect-pg-simple
 * - TTL: 7 days (1 week)
 * - Cookie: HTTP-only, secure, 1-week max age
 * - Table: 'sessions' in main database
 * 
 * Security:
 * - resave: false (only save modified sessions)
 * - saveUninitialized: false (don't store empty sessions)
 * - httpOnly: true (prevent XSS access to cookie)
 * - secure: true (HTTPS only)
 */
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

/**
 * Update user session with fresh tokens
 * 
 * Updates session object with new access/refresh tokens and claims.
 * Called after initial login and after token refresh.
 * 
 * @param user - Session user object to update
 * @param tokens - Fresh tokens from OIDC provider
 * @private
 */
function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

/**
 * Create or update user in database from OIDC claims
 * 
 * Ensures user record exists in database for authenticated user.
 * Called on every login to keep user data synchronized with OIDC provider.
 * 
 * @param claims - OIDC token claims (sub, email, first_name, last_name, profile_image_url)
 * @private
 */
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

/**
 * Setup authentication routes and middleware
 * 
 * Configures Passport.js with OIDC strategies for all domains.
 * Registers routes for login, callback, and logout.
 * 
 * @param app - Express application instance
 * 
 * Routes Created:
 * - GET /api/login - Initiates OAuth flow, accepts ?redirect_to query param
 * - GET /api/callback - Handles OAuth callback, creates session
 * - GET /api/logout - Destroys session, redirects to OIDC end_session_url
 * 
 * Strategies:
 * - One strategy per domain in REPLIT_DOMAINS
 * - Dynamic registration for new domains at runtime
 * - Fallback mechanism if domain-specific auth fails
 * 
 * Redirect Handling:
 * - ?redirect_to parameter validated for security (must be relative path)
 * - Allowed paths: /, /pantry, /recipes, /meal-plans, /shopping, /chat, /appliances, /settings
 * - Stored in session.returnTo, cleared after successful login
 * 
 * Security:
 * - Domain whitelist prevents unauthorized domains
 * - Relative path validation prevents open redirects
 * - Strategies only registered for trusted domains
 */
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

  // Register strategies for all known domains
  const registeredDomains = new Set<string>();
  for (const domain of process.env.REPLIT_DOMAINS!.split(",")) {
    const trimmedDomain = domain.trim();
    if (trimmedDomain) {
      const strategy = new Strategy(
        {
          name: `replitauth:${trimmedDomain}`,
          config,
          scope: "openid email profile offline_access",
          callbackURL: `https://${trimmedDomain}/api/callback`,
        },
        verify,
      );
      passport.use(strategy);
      registeredDomains.add(trimmedDomain);
      console.log(`[Auth] Registered strategy for domain: ${trimmedDomain}`);
    }
  }

  // Middleware to dynamically register strategy for unrecognized domains
  const ensureStrategyExists = (req: any, res: any, next: any) => {
    const hostname = req.hostname;
    
    // Check if strategy already exists for this hostname
    if (!registeredDomains.has(hostname)) {
      // Validate hostname against known domains from environment
      const allowedDomains = process.env.REPLIT_DOMAINS?.split(',').map(d => d.trim()).filter(d => d) || [];
      
      // Check if this hostname is in the allowed list or is localhost for dev
      const isAllowedDomain = hostname === 'localhost' || 
                             allowedDomains.includes(hostname) ||
                             hostname.endsWith('.replit.dev') || 
                             hostname.endsWith('.replit.app');
      
      if (!isAllowedDomain) {
        console.error(`[Auth] Rejected strategy registration for untrusted domain: ${hostname}`);
        return res.status(400).json({
          error: 'Invalid domain',
          message: 'Authentication is not available for this domain',
          domain: hostname
        });
      }
      
      console.log(`[Auth] Dynamically registering strategy for new domain: ${hostname}`);
      
      // Register a new strategy for this domain
      const strategy = new Strategy(
        {
          name: `replitauth:${hostname}`,
          config,
          scope: "openid email profile offline_access",
          callbackURL: `https://${hostname}/api/callback`,
        },
        verify,
      );
      
      try {
        passport.use(strategy);
        registeredDomains.add(hostname);
        console.log(`[Auth] Successfully registered strategy for: ${hostname}`);
      } catch (error) {
        console.error(`[Auth] Failed to register strategy for ${hostname}:`, error);
        return res.status(500).json({
          error: 'Strategy registration failed',
          message: 'Unable to configure authentication for this domain'
        });
      }
    }
    next();
  };

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", ensureStrategyExists, (req, res, next) => {
    const strategyName = `replitauth:${req.hostname}`;
    console.log(`[Auth] Login attempt using strategy: ${strategyName}`);
    
    // Store original URL for redirect after auth - validate it's a safe relative path
    if (req.query.redirect_to) {
      const redirectTo = req.query.redirect_to as string;
      // Only allow relative paths starting with / and not containing //
      if (redirectTo.startsWith('/') && !redirectTo.startsWith('//') && !redirectTo.includes('://')) {
        // Further validate it's a path within our app
        const safePaths = ['/pantry', '/recipes', '/meal-plans', '/shopping', '/chat', '/appliances', '/settings'];
        if (redirectTo === '/' || safePaths.some(path => redirectTo.startsWith(path))) {
          (req.session as any).returnTo = redirectTo;
        }
      }
    }
    
    passport.authenticate(strategyName, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    }, (err: any, user: any, info: any) => {
      if (err) {
        console.error(`[Auth] Authentication error for ${strategyName}:`, err);
        console.error(`[Auth] Error details:`, {
          message: err.message,
          stack: err.stack,
          info: info
        });
        
        // Fallback to first available strategy if current one fails
        const fallbackDomain = Array.from(registeredDomains)[0];
        if (fallbackDomain && fallbackDomain !== req.hostname) {
          console.log(`[Auth] Attempting fallback to ${fallbackDomain}`);
          return passport.authenticate(`replitauth:${fallbackDomain}`, {
            prompt: "login consent",
            scope: ["openid", "email", "profile", "offline_access"],
          })(req, res, next);
        }
        
        // If no fallback available, return error
        return res.status(500).json({
          error: "Authentication configuration error",
          message: "Unable to authenticate with current domain configuration",
          domain: req.hostname,
          availableDomains: Array.from(registeredDomains)
        });
      }
      return passport.authenticate(strategyName, {
        prompt: "login consent",
        scope: ["openid", "email", "profile", "offline_access"],
      })(req, res, next);
    })(req, res, next);
  });

  app.get("/api/callback", ensureStrategyExists, (req, res, next) => {
    const strategyName = `replitauth:${req.hostname}`;
    console.log(`[Auth] Callback attempt using strategy: ${strategyName}`);
    
    passport.authenticate(strategyName, {
      successReturnToOrRedirect: (req.session as any)?.returnTo || "/",
      failureRedirect: "/api/login",
      failureMessage: true
    }, (err: any, user: any, info: any) => {
      if (err) {
        console.error(`[Auth] Callback error for ${strategyName}:`, err);
        console.error(`[Auth] Callback error details:`, {
          message: err.message,
          stack: err.stack,
          info: info
        });
        return res.redirect('/api/login');
      }
      
      if (!user) {
        console.error(`[Auth] No user returned in callback for ${strategyName}`);
        return res.redirect('/api/login');
      }
      
      req.logIn(user, (loginErr) => {
        if (loginErr) {
          console.error(`[Auth] Login error after callback:`, loginErr);
          return res.redirect('/api/login');
        }
        
        // Clear the returnTo from session after successful login
        const returnTo = (req.session as any)?.returnTo || '/';
        delete (req.session as any).returnTo;
        
        console.log(`[Auth] Successful authentication for user ${user.claims?.sub}, redirecting to ${returnTo}`);
        return res.redirect(returnTo);
      });
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

/**
 * Active token refresh operations
 * 
 * Tracks in-progress token refresh requests to prevent duplicate refreshes.
 * Key: {userId}-{refreshTokenPrefix}, Value: { promise, timestamp }
 * @private
 */
const activeRefreshes = new Map<string, { promise: Promise<client.TokenEndpointResponse & client.TokenEndpointResponseHelpers>, timestamp: number }>();

/**
 * Clean up stale refresh promises
 * 
 * Removes refresh promises older than 30 seconds to prevent memory leaks.
 * Called before each new refresh operation.
 * 
 * @private
 */
const cleanupStaleRefreshes = () => {
  const now = Date.now();
  const staleTimeout = 30000; // 30 seconds
  
  Array.from(activeRefreshes.entries()).forEach(([key, value]) => {
    if (now - value.timestamp > staleTimeout) {
      activeRefreshes.delete(key);
    }
  });
};

/**
 * Authentication middleware with automatic token refresh
 * 
 * Verifies user is authenticated and refreshes expired tokens automatically.
 * Prevents multiple concurrent refresh requests for the same user.
 * 
 * @returns 401 if user not authenticated or token refresh fails
 * @returns calls next() if authenticated with valid token
 * 
 * Token Refresh Logic:
 * 1. Check if user is authenticated (req.isAuthenticated())
 * 2. Check if access token is expired (user.expires_at < now)
 * 3. If expired and refresh token available:
 *    a. Check for existing refresh operation (prevent duplicates)
 *    b. Refresh tokens via OIDC endpoint
 *    c. Update session with new tokens
 *    d. Continue request
 * 4. If refresh fails: Force re-authentication (401 with requiresReauth flag)
 * 
 * Error Responses:
 * - 401 Unauthorized: Not authenticated
 * - 401 with requiresReauth: Refresh token invalid, re-login required
 * 
 * Deduplication:
 * - Multiple concurrent requests from same user share one refresh promise
 * - Prevents token refresh race conditions
 * - Cleanup of stale promises (>30s) prevents memory leaks
 * 
 * @example
 * // Protect a route
 * app.get('/api/user/profile', isAuthenticated, async (req, res) => {
 *   const user = await storage.getUser(req.user.claims.sub);
 *   res.json(user);
 * });
 */
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
