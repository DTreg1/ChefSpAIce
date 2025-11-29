/**
 * OAuth Authentication Module
 * 
 * Handles authentication with multiple OAuth providers using Passport.js
 * Supports Google, GitHub, Twitter/X, Apple, and Email authentication
 */

import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GitHubStrategy } from "passport-github2";
import AppleStrategy from "@nicokaiser/passport-apple";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as OAuth2Strategy } from "passport-oauth2";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { oauthConfig, isOAuthConfigured, getCallbackURL } from "../config/oauth-config";
import { storage } from "../storage";
import { UpsertUser, InsertAuthProviderInfo } from "../../shared/schema";

// Valid OAuth provider types
export type OAuthProvider = 'google' | 'github' | 'twitter' | 'apple' | 'email' | 'replit';

// Track which strategies are actually registered successfully
export const registeredStrategies = new Set<OAuthProvider>();

/**
 * User type for Passport session
 */
interface SessionUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  provider: OAuthProvider;
  providerId: string;
}

/**
 * OAuth Profile type
 */
interface OAuthProfile {
  id: string;
  emails?: Array<{ value: string; verified?: boolean }>;
  displayName?: string;
  name?: {
    givenName?: string;
    familyName?: string;
  };
  photos?: Array<{ value: string }>;
  provider: string;
  _json?: any;
}

/**
 * Find or create user from OAuth profile
 */
async function findOrCreateUser(
  provider: OAuthProvider,
  profile: OAuthProfile,
  accessToken?: string,
  refreshToken?: string
): Promise<SessionUser> {
  const email = profile.emails?.[0]?.value || `${provider}_${profile.id}@oauth.local`;
  const firstName = profile.name?.givenName || profile.displayName?.split(" ")[0] || "";
  const lastName = profile.name?.familyName || profile.displayName?.split(" ").slice(1).join(" ") || "";
  const profileImageUrl = profile.photos?.[0]?.value || "";

  // Check if auth provider already exists
  const existingAuth = await storage.getAuthProviderByProviderAndId(provider, profile.id);
  
  if (existingAuth) {
    // User exists, update their information
    const user = await storage.getUserById(existingAuth.userId);
    if (!user) {
      throw new Error("User not found for existing auth provider");
    }
    
    // Update auth provider tokens
    await storage.updateAuthProvider(existingAuth.id, {
      accessToken,
      refreshToken,
    });
    
    return {
      id: user.id,
      email: user.email || email,
      firstName: user.firstName || firstName,
      lastName: user.lastName || lastName,
      profileImageUrl: user.profileImageUrl || profileImageUrl,
      provider,
      providerId: profile.id,
    };
  }
  
  // Check if user exists with this email
  let user = await storage.getUserByEmail(email);
  
  if (!user) {
    // Create new user
    const newUser: UpsertUser = {
      email,
      firstName,
      lastName,
      profileImageUrl,
      primaryProvider: provider,
      primaryProviderId: profile.id,
    };
    
    user = await storage.createUser(newUser);
  }
  
  // Create auth provider entry
  const authProvider: InsertAuthProviderInfo = {
    userId: user.id,
    provider: provider,
    providerId: profile.id,
    providerEmail: email,
    accessToken,
    refreshToken,
    isPrimary: !!(user.primaryProvider === provider && user.primaryProviderId === profile.id),
    metadata: profile._json,
  };
  
  await storage.createAuthProvider(authProvider);
  
  return {
    id: user.id,
    email: user.email || email,
    firstName: user.firstName || firstName,
    lastName: user.lastName || lastName,
    profileImageUrl: user.profileImageUrl || profileImageUrl,
    provider,
    providerId: profile.id,
  };
}

/**
 * Configure Passport serialization
 */
export function configurePassport() {
  passport.serializeUser((user: any, done) => {
    done(null, user);
  });

  passport.deserializeUser((user: any, done) => {
    done(null, user);
  });
}

// Extend Express user type
declare global {
  namespace Express {
    interface User extends SessionUser {}
  }
}

/**
 * Configure Google OAuth Strategy
 */
export function configureGoogleStrategy(hostname: string) {
  if (isOAuthConfigured("google")) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: oauthConfig.google.clientID,
          clientSecret: oauthConfig.google.clientSecret,
          callbackURL: getCallbackURL("google", hostname),
          scope: oauthConfig.google.scope,
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            const user = await findOrCreateUser("google", profile as OAuthProfile, accessToken, refreshToken);
            done(null, user);
          } catch (error) {
            done(error as Error);
          }
        }
      )
    );
    registeredStrategies.add("google");
  }
}

/**
 * Configure GitHub OAuth Strategy
 */
export function configureGitHubStrategy(hostname: string) {
  if (isOAuthConfigured("github")) {
    passport.use(
      new GitHubStrategy(
        {
          clientID: oauthConfig.github.clientID,
          clientSecret: oauthConfig.github.clientSecret,
          callbackURL: getCallbackURL("github", hostname),
          scope: oauthConfig.github.scope,
        },
        async (accessToken: string, refreshToken: string, profile: any, done: any) => {
          try {
            const user = await findOrCreateUser("github", profile as OAuthProfile, accessToken, refreshToken);
            done(null, user);
          } catch (error) {
            done(error);
          }
        }
      )
    );
    registeredStrategies.add("github");
  }
}

// Store PKCE code verifiers for Twitter OAuth 2.0
const twitterCodeVerifiers = new Map<string, string>();

/**
 * Generate PKCE code verifier and challenge for Twitter OAuth 2.0
 */
function generatePKCE(): { codeVerifier: string; codeChallenge: string } {
  // Generate a random code verifier (43-128 characters)
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  
  // Generate code challenge using S256 method
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');
  
  return { codeVerifier, codeChallenge };
}

/**
 * Store code verifier for a state
 */
export function storeTwitterCodeVerifier(state: string, codeVerifier: string) {
  twitterCodeVerifiers.set(state, codeVerifier);
  // Clean up after 10 minutes
  setTimeout(() => twitterCodeVerifiers.delete(state), 10 * 60 * 1000);
}

/**
 * Get and remove code verifier for a state
 */
export function getTwitterCodeVerifier(state: string): string | undefined {
  const verifier = twitterCodeVerifiers.get(state);
  twitterCodeVerifiers.delete(state);
  return verifier;
}

/**
 * Custom Twitter OAuth 2.0 Strategy with PKCE support
 * Extends passport-oauth2 to add proper PKCE challenge/verifier handling
 * 
 * Storage strategy:
 * - PKCE verifiers stored in server-side Map keyed by state (primary)
 * - Session stores mapping of state → verifier as backup (keyed by state)
 * - This handles concurrent logins properly by using unique state values
 */
class TwitterOAuth2Strategy extends OAuth2Strategy {
  // Temporary storage for current request's PKCE values (used within single auth call)
  private _currentPkce: { state: string; challenge: string } | null = null;
  private _currentReq: any = null;
  
  constructor(options: any, verify: any) {
    // Enable passReqToCallback so we can access request in the verify function
    super({ ...options, passReqToCallback: true }, verify);
    this.name = 'twitter';
  }
  
  // Override authenticate to set up PKCE
  authenticate(req: any, options?: any): void {
    this._currentReq = req;
    
    // On the initial login request (no code), generate and store PKCE values
    if (!req.query?.code) {
      const { codeVerifier, codeChallenge } = generatePKCE();
      const state = crypto.randomBytes(16).toString('hex');
      
      // Store PKCE for this request (used by authorizationParams synchronously)
      this._currentPkce = { state, challenge: codeChallenge };
      
      // Store verifier in server-side map (primary storage, keyed by state)
      storeTwitterCodeVerifier(state, codeVerifier);
      
      // Also store in session as backup, keyed by state for concurrent request safety
      if (req.session) {
        if (!req.session.twitterPkceVerifiers) {
          req.session.twitterPkceVerifiers = {};
        }
        req.session.twitterPkceVerifiers[state] = codeVerifier;
      }
    }
    
    super.authenticate(req, options);
    
    // Clear after auth call completes
    this._currentPkce = null;
  }
  
  // Override authorizationParams to add PKCE challenge
  authorizationParams(options: any): object {
    if (this._currentPkce) {
      return {
        state: this._currentPkce.state,
        code_challenge: this._currentPkce.challenge,
        code_challenge_method: 'S256'
      };
    }
    
    // Fallback: generate new PKCE values (shouldn't happen in normal flow)
    console.warn("Twitter OAuth: PKCE values not set, generating fallback");
    const { codeVerifier, codeChallenge } = generatePKCE();
    const state = crypto.randomBytes(16).toString('hex');
    storeTwitterCodeVerifier(state, codeVerifier);
    
    return {
      state: state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256'
    };
  }
  
  // Override tokenParams to add code_verifier
  tokenParams(options: any): object {
    const params: any = {};
    const req = this._currentReq;
    const state = req?.query?.state;
    
    if (!state) {
      console.warn("Twitter OAuth: No state in callback query");
      return params;
    }
    
    // Try server-side map first (primary storage)
    let verifier = getTwitterCodeVerifier(state);
    
    // Fallback to session storage if not found in map
    if (!verifier && req?.session?.twitterPkceVerifiers?.[state]) {
      verifier = req.session.twitterPkceVerifiers[state];
    }
    
    // Always clean up session entry for this state to prevent growth
    if (req?.session?.twitterPkceVerifiers?.[state]) {
      delete req.session.twitterPkceVerifiers[state];
    }
    
    if (verifier) {
      params.code_verifier = verifier;
    } else {
      console.warn("Twitter OAuth: PKCE verifier not found for state:", state);
    }
    
    return params;
  }
}

/**
 * Configure Twitter/X OAuth 2.0 Strategy
 * Uses Authorization Code Flow with PKCE for enhanced security
 */
export function configureTwitterStrategy(hostname: string) {
  if (isOAuthConfigured("twitter")) {
    const callbackURL = getCallbackURL("twitter", hostname);
    
    // Twitter OAuth 2.0 requires Basic Auth for token exchange
    const credentials = Buffer.from(
      `${oauthConfig.twitter.clientID}:${oauthConfig.twitter.clientSecret}`
    ).toString('base64');
    
    // Create custom OAuth 2.0 strategy for Twitter with PKCE
    // Note: state is managed manually in authorizationParams for PKCE correlation
    const strategy = new TwitterOAuth2Strategy(
      {
        authorizationURL: "https://twitter.com/i/oauth2/authorize",
        tokenURL: "https://api.twitter.com/2/oauth2/token",
        clientID: oauthConfig.twitter.clientID,
        clientSecret: oauthConfig.twitter.clientSecret,
        callbackURL: callbackURL,
        scope: oauthConfig.twitter.scope.join(" "),
        state: false, // We manage state ourselves for PKCE
        customHeaders: {
          Authorization: `Basic ${credentials}`,
        },
      },
      // Note: passReqToCallback is true, so first param is req
      async (req: any, accessToken: string, refreshToken: string, params: any, profile: any, done: any) => {
        try {
          // Fetch user profile from Twitter API v2
          const userResponse = await fetch("https://api.twitter.com/2/users/me?user.fields=id,name,username,profile_image_url", {
            headers: {
              "Authorization": `Bearer ${accessToken}`,
            },
          });
          
          if (!userResponse.ok) {
            const errorText = await userResponse.text();
            console.error("Twitter API error:", errorText);
            return done(new Error(`Failed to fetch Twitter profile: ${userResponse.status}`));
          }
          
          const userData = await userResponse.json();
          const twitterUser = userData.data;
          
          // Create OAuth profile from Twitter data
          const twitterProfile: OAuthProfile = {
            id: twitterUser.id,
            displayName: twitterUser.name,
            name: {
              givenName: twitterUser.name?.split(" ")[0] || twitterUser.username,
              familyName: twitterUser.name?.split(" ").slice(1).join(" ") || "",
            },
            photos: twitterUser.profile_image_url ? [{ value: twitterUser.profile_image_url.replace("_normal", "_400x400") }] : [],
            provider: "twitter",
            _json: twitterUser,
          };
          
          const user = await findOrCreateUser("twitter", twitterProfile, accessToken, refreshToken);
          done(null, user);
        } catch (error) {
          console.error("Twitter OAuth error:", error);
          done(error);
        }
      }
    );
    
    passport.use("twitter", strategy);
    registeredStrategies.add("twitter");
  }
}

/**
 * Configure Apple OAuth Strategy
 */
export function configureAppleStrategy(hostname: string) {
  if (isOAuthConfigured("apple")) {
    passport.use(
      new AppleStrategy(
        {
          clientID: oauthConfig.apple.clientID,
          teamID: oauthConfig.apple.teamID,
          keyID: oauthConfig.apple.keyID,
          key: oauthConfig.apple.privateKey,
          callbackURL: getCallbackURL("apple", hostname),
          scope: ["email", "name"],
        } as any,
        async (accessToken: string, refreshToken: string, idToken: any, profile: any, done: any) => {
          // Ensure done is a function (passport-apple may call with different args in error cases)
          const safeCallback = typeof done === 'function' ? done : (typeof profile === 'function' ? profile : null);
          
          if (!safeCallback) {
            console.error("[Apple OAuth] No valid callback function found");
            return;
          }
          
          try {
            // Debug: Log what we received from Apple
            console.log("[Apple OAuth] Received callback:", {
              hasAccessToken: !!accessToken,
              hasRefreshToken: !!refreshToken,
              idTokenType: typeof idToken,
              idTokenKeys: idToken ? Object.keys(idToken) : [],
              profileType: typeof profile,
              profileKeys: profile ? Object.keys(profile) : [],
            });
            
            // Apple user ID - passport-apple provides it in idToken.id (not sub!)
            const appleUserId = idToken?.id || idToken?.sub || profile?.id;
            
            if (!appleUserId) {
              console.error("[Apple OAuth] No user ID found. Full idToken:", JSON.stringify(idToken, null, 2));
              return safeCallback(new Error("No Apple user ID found in response"));
            }
            
            console.log("[Apple OAuth] Found user ID:", appleUserId);
            
            // Extract email - Apple provides it in the idToken
            const email = idToken?.email || profile?.email;
            const emailVerified = idToken?.emailVerified || idToken?.email_verified || false;
            const emails = email ? [{ value: email, verified: emailVerified }] : [];
            
            // Apple only provides name on first login, in the profile object
            const firstName = profile?.name?.firstName || '';
            const lastName = profile?.name?.lastName || '';
            
            const appleProfile: OAuthProfile = {
              id: appleUserId,
              emails,
              displayName: firstName || email?.split('@')[0] || 'Apple User',
              name: {
                givenName: firstName,
                familyName: lastName,
              },
              provider: "apple",
              _json: idToken,
            };
            
            console.log("[Apple OAuth] Created profile with ID:", appleUserId);
            
            const user = await findOrCreateUser("apple", appleProfile, accessToken, refreshToken);
            safeCallback(null, user);
          } catch (error) {
            console.error("[Apple OAuth] Error in verify callback:", error);
            safeCallback(error);
          }
        }
      )
    );
    registeredStrategies.add("apple");
  }
}

/**
 * Configure Replit OAuth Strategy
 * 
 * Provides OAuth authentication through Replit's OAuth2 endpoints
 * Available when running on Replit platform
 */
export async function configureReplitOIDCStrategy(hostname: string) {
  // Configure Replit OAuth as a provider alongside others
  // Always available when on Replit environment
  if (process.env.REPLIT_DOMAINS) {
    
    const strategy = new OAuth2Strategy(
      {
        authorizationURL: "https://replit.com/oauth/authorize",
        tokenURL: "https://replit.com/oauth/token", 
        clientID: process.env.REPLIT_CLIENT_ID || "replit_oauth_client",
        clientSecret: process.env.REPLIT_CLIENT_SECRET || "replit_oauth_secret",
        callbackURL: getCallbackURL("replit", hostname),
        scope: ["openid", "email", "profile"],
      },
      async (accessToken: string, refreshToken: string, params: any, profile: any, done: any) => {
        try {
          // Parse the ID token or user info from params
          const replitProfile: OAuthProfile = {
            id: params.sub || params.id || "replit_user",
            emails: params.email ? [{ value: params.email, verified: true }] : [],
            displayName: params.name || params.username || "Replit User",
            name: {
              givenName: params.given_name || params.name?.split(' ')[0] || "Replit",
              familyName: params.family_name || params.name?.split(' ')[1] || "User",
            },
            photos: params.picture || params.avatar_url ? [{ value: params.picture || params.avatar_url }] : [],
            provider: "replit",
            _json: params,
          };
          
          const user = await findOrCreateUser("replit", replitProfile, accessToken, refreshToken);
          done(null, user);
        } catch (error) {
          done(error);
        }
      }
    );
    
    // Set the strategy name
    strategy.name = "replit";
    
    passport.use("replit", strategy);
    registeredStrategies.add("replit");
  }
}

/**
 * Configure Email/Password Strategy
 */
export function configureEmailStrategy() {
  passport.use(
    "local",
    new LocalStrategy(
      {
        usernameField: "email",
        passwordField: "password",
      },
      async (email, password, done) => {
        try {
          const user = await storage.getUserByEmail(email);
          
          if (!user) {
            return done(null, false, { message: "Invalid email or password" });
          }
          
          // Check if user has a password (email auth provider)
          const authProvider = await storage.getAuthProviderByProviderAndUserId("email", user.id);
          
          const passwordMetadata = authProvider?.metadata as { password?: string } | null;
          if (!authProvider || !passwordMetadata?.password) {
            return done(null, false, { message: "Please sign in with your OAuth provider" });
          }
          
          const isValid = await bcrypt.compare(password, passwordMetadata.password);
          
          if (!isValid) {
            return done(null, false, { message: "Invalid email or password" });
          }
          
          const sessionUser: SessionUser = {
            id: user.id,
            email: user.email!,
            firstName: user.firstName || undefined,
            lastName: user.lastName || undefined,
            profileImageUrl: user.profileImageUrl || undefined,
            provider: "email",
            providerId: user.id,
          };
          
          done(null, sessionUser);
        } catch (error) {
          done(error);
        }
      }
    )
  );
  registeredStrategies.add("email");
}

/**
 * Register email/password user
 */
export async function registerEmailUser(
  email: string,
  password: string,
  firstName?: string,
  lastName?: string
): Promise<SessionUser> {
  // Check if user already exists
  const existingUser = await storage.getUserByEmail(email);
  
  if (existingUser) {
    throw new Error("User with this email already exists");
  }
  
  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);
  
  // Create user
  const newUser: UpsertUser = {
    email,
    firstName,
    lastName,
    primaryProvider: "email",
    primaryProviderId: email,
  };
  
  const user = await storage.createUser(newUser);
  
  // Create auth provider with hashed password
  const authProvider: InsertAuthProviderInfo = {
    userId: user.id,
    provider: "email",
    providerId: email,
    providerEmail: email,
    isPrimary: true,
    metadata: { password: hashedPassword },
  };
  
  await storage.createAuthProvider(authProvider);
  
  return {
    id: user.id,
    email: user.email!,
    firstName: user.firstName || undefined,
    lastName: user.lastName || undefined,
    profileImageUrl: user.profileImageUrl || undefined,
    provider: "email",
    providerId: email,
  };
}

/**
 * Initialize all OAuth strategies
 */
export async function initializeOAuthStrategies(hostname: string) {
  configurePassport();
  configureGoogleStrategy(hostname);
  configureGitHubStrategy(hostname);
  configureTwitterStrategy(hostname);
  configureAppleStrategy(hostname);
  await configureReplitOIDCStrategy(hostname);
  configureEmailStrategy();
}

