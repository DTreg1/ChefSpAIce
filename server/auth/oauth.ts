/**
 * OAuth Authentication Module
 * 
 * Handles authentication with multiple OAuth providers using Passport.js
 * Supports Google, GitHub, Twitter/X, Apple, and Email authentication
 */

import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GitHubStrategy } from "passport-github2";
import { Strategy as TwitterStrategy } from "passport-twitter";
import AppleStrategy from "@nicokaiser/passport-apple";
import { Strategy as LocalStrategy } from "passport-local";
import { Issuer, Strategy as OIDCStrategy } from "openid-client";
import bcrypt from "bcryptjs";
import { oauthConfig, isOAuthConfigured, getCallbackURL } from "./oauth-config";
import { storage } from "../storage";
import { UpsertUser, InsertAuthProvider } from "../../shared/schema";
import { Request, Response, NextFunction } from "express";

/**
 * User type for Passport session
 */
interface SessionUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  provider: string;
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
  provider: string,
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
    const user = await storage.getUser(existingAuth.userId);
    if (!user) {
      throw new Error("User not found for existing auth provider");
    }
    
    // Update auth provider tokens
    await storage.updateAuthProvider(existingAuth.id, {
      accessToken,
      refreshToken,
      updatedAt: new Date(),
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
  const authProvider: InsertAuthProvider = {
    userId: user.id,
    provider,
    providerId: profile.id,
    providerEmail: email,
    accessToken,
    refreshToken,
    isPrimary: user.primaryProvider === provider && user.primaryProviderId === profile.id,
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
            done(null, user as any);
          } catch (error) {
            done(error as Error);
          }
        }
      )
    );
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
  }
}

/**
 * Configure Twitter OAuth Strategy
 */
export function configureTwitterStrategy(hostname: string) {
  if (isOAuthConfigured("twitter")) {
    passport.use(
      new TwitterStrategy(
        {
          consumerKey: oauthConfig.twitter.consumerKey,
          consumerSecret: oauthConfig.twitter.consumerSecret,
          callbackURL: getCallbackURL("twitter", hostname),
        },
        async (token: string, tokenSecret: string, profile: any, done: any) => {
          try {
            const user = await findOrCreateUser("twitter", profile as OAuthProfile, token, tokenSecret);
            done(null, user);
          } catch (error) {
            done(error);
          }
        }
      )
    );
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
        },
        async (accessToken: string, refreshToken: string, idToken: any, profile: any, done: any) => {
          try {
            // Apple provides limited profile info
            const appleProfile: OAuthProfile = {
              id: profile.id,
              emails: profile.emails,
              displayName: profile.displayName,
              provider: "apple",
              _json: idToken,
            };
            const user = await findOrCreateUser("apple", appleProfile, accessToken, refreshToken);
            done(null, user);
          } catch (error) {
            done(error);
          }
        }
      )
    );
  }
}

/**
 * Configure Replit OIDC Strategy
 */
export async function configureReplitOIDCStrategy(hostname: string) {
  // Only configure if running on Replit
  if (process.env.REPLIT_DOMAINS) {
    try {
      // Discover OIDC configuration
      const issuerUrl = process.env.ISSUER_URL || "https://replit.com/oidc";
      const issuer = await Issuer.discover(issuerUrl);
      
      const client = new issuer.Client({
        client_id: "replit",
        redirect_uris: [getCallbackURL("replit", hostname)],
        response_types: ["code"],
      });
      
      passport.use(
        "replit",
        new OIDCStrategy(
          {
            client,
            params: {
              scope: "openid email profile",
            },
          },
          async (tokenSet: any, userinfo: any, done: any) => {
            try {
              const replitProfile: OAuthProfile = {
                id: userinfo.sub,
                emails: userinfo.email ? [{ value: userinfo.email, verified: true }] : [],
                displayName: userinfo.name || userinfo.first_name || "",
                name: {
                  givenName: userinfo.first_name || userinfo.name?.split(" ")[0] || "",
                  familyName: userinfo.last_name || userinfo.name?.split(" ").slice(1).join(" ") || "",
                },
                photos: userinfo.picture ? [{ value: userinfo.picture }] : [],
                provider: "replit",
                _json: userinfo,
              };
              
              const user = await findOrCreateUser("replit", replitProfile, tokenSet.access_token, tokenSet.refresh_token);
              done(null, user);
            } catch (error) {
              done(error);
            }
          }
        )
      );
      
      console.log("Replit OIDC strategy configured");
    } catch (error) {
      console.error("Failed to configure Replit OIDC strategy:", error);
    }
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
          
          done(null, sessionUser as any);
        } catch (error) {
          done(error);
        }
      }
    )
  );
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
  const authProvider: InsertAuthProvider = {
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

/**
 * Authentication middleware
 */
export const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Unauthorized" });
};

/**
 * Admin-only middleware
 */
export const adminOnly = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  
  const user = req.user as SessionUser;
  const dbUser = await storage.getUser(user.id);
  
  if (!dbUser?.isAdmin) {
    return res.status(403).json({ error: "Forbidden: Admin access required" });
  }
  
  next();
};