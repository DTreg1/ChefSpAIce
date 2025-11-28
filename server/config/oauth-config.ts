/**
 * OAuth Configuration
 * 
 * Centralized configuration for all OAuth providers.
 * All sensitive credentials must be provided via environment variables.
 * 
 * Provider Setup Instructions:
 * 
 * Google:
 * 1. Go to https://console.cloud.google.com/
 * 2. Create a new project or select existing
 * 3. Enable Google+ API
 * 4. Create OAuth 2.0 credentials
 * 5. Add authorized redirect URI: https://[your-domain]/api/auth/google/callback
 * 
 * GitHub:
 * 1. Go to https://github.com/settings/developers
 * 2. Create a new OAuth App
 * 3. Set Authorization callback URL: https://[your-domain]/api/auth/github/callback
 * 
 * Twitter/X:
 * 1. Go to https://developer.twitter.com/
 * 2. Create a new App
 * 3. Enable OAuth 2.0
 * 4. Set Callback URL: https://[your-domain]/api/auth/twitter/callback
 * 
 * Apple:
 * 1. Enroll in Apple Developer Program
 * 2. Create an App ID with Sign in with Apple capability
 * 3. Create a Service ID for web authentication
 * 4. Configure return URL: https://[your-domain]/api/auth/apple/callback
 */

import { getSafeEnvVar } from '../config/env-validator';
import * as crypto from 'crypto';

// Generate session secret if not provided (development only)
function getSessionSecret(): string {
  const secret = getSafeEnvVar('SESSION_SECRET');
  
  if (secret) {
    return secret;
  }
  
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET environment variable is required in production');
  }
  
  // Generate a consistent secret for development based on a fixed seed
  // This ensures sessions persist across server restarts in development
  const devSecret = crypto.createHash('sha256')
    .update('dev-session-secret-seed')
    .digest('hex');
  
  console.warn('⚠️  Using development session secret. Set SESSION_SECRET for production.');
  return devSecret;
}

/**
 * Format Apple private key
 * Apple P8 keys have newlines that get escaped when stored as env vars.
 * This function converts escaped \n back to actual newlines and ensures proper PEM format.
 */
function formatApplePrivateKey(key: string | undefined): string {
  if (!key) return '';
  
  let formattedKey = key;
  
  // Replace literal \n with actual newlines
  formattedKey = formattedKey.replace(/\\n/g, '\n');
  
  // Also handle cases where newlines might be URL-encoded
  formattedKey = formattedKey.replace(/%0A/g, '\n');
  
  // Trim whitespace
  formattedKey = formattedKey.trim();
  
  // Extract just the base64 content (remove headers and all whitespace)
  let keyContent = formattedKey
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s/g, '');
  
  // If the key content is empty, return empty string
  if (!keyContent) {
    console.error('[Apple OAuth] ERROR: No key content found');
    return '';
  }
  
  // Rebuild the key with proper PEM format (64 chars per line)
  const lines: string[] = [];
  for (let i = 0; i < keyContent.length; i += 64) {
    lines.push(keyContent.substring(i, i + 64));
  }
  
  formattedKey = `-----BEGIN PRIVATE KEY-----\n${lines.join('\n')}\n-----END PRIVATE KEY-----`;
  
  const lineCount = formattedKey.split('\n').length;
  
  console.log(`[Apple OAuth] Key formatted: lines=${lineCount}, contentLength=${keyContent.length}`);
  
  // Valid ES256 P8 key content is typically 118-122 characters (base64)
  if (keyContent.length < 100 || keyContent.length > 200) {
    console.error(`[Apple OAuth] WARNING: Key content length unusual (${keyContent.length} chars). Expected ~118-122 chars for ES256 P8 key.`);
  }
  
  return formattedKey;
}

export const oauthConfig = {
  google: {
    clientID: getSafeEnvVar('GOOGLE_CLIENT_ID') || '',
    clientSecret: getSafeEnvVar('GOOGLE_CLIENT_SECRET') || '',
    scope: ["profile", "email"],
  },
  github: {
    clientID: getSafeEnvVar('GITHUB_CLIENT_ID') || '',
    clientSecret: getSafeEnvVar('GITHUB_CLIENT_SECRET') || '',
    scope: ["user:email"],
  },
  twitter: {
    clientID: getSafeEnvVar('TWITTER_CLIENT_ID') || '',
    clientSecret: getSafeEnvVar('TWITTER_CLIENT_SECRET') || '',
    scope: ["tweet.read", "users.read", "offline.access"],
  },
  apple: {
    clientID: getSafeEnvVar('APPLE_CLIENT_ID') || '',
    teamID: getSafeEnvVar('APPLE_TEAM_ID') || '',
    keyID: getSafeEnvVar('APPLE_KEY_ID') || '',
    privateKey: formatApplePrivateKey(getSafeEnvVar('APPLE_PRIVATE_KEY')),
  },
  replit: {
    clientID: getSafeEnvVar('REPLIT_CLIENT_ID') || '',
    clientSecret: getSafeEnvVar('REPLIT_CLIENT_SECRET') || '',
    scope: ["email", "profile", "openid"],
  },
  session: {
    secret: getSessionSecret(),
  },
};

import type { OAuthProvider } from "../auth/oauth";

/**
 * Check if OAuth is properly configured
 */
export function isOAuthConfigured(provider: OAuthProvider | string): boolean {
  switch (provider) {
    case "google":
      return !!oauthConfig.google.clientID && !!oauthConfig.google.clientSecret;
    case "github":
      return !!oauthConfig.github.clientID && !!oauthConfig.github.clientSecret;
    case "twitter":
      return !!oauthConfig.twitter.clientID && !!oauthConfig.twitter.clientSecret;
    case "apple":
      return !!oauthConfig.apple.clientID && !!oauthConfig.apple.teamID;
    case "replit":
      // Replit OAuth is configured when client ID and secret are provided
      // OR when running on Replit with REPLIT_DOMAINS available
      return (!!oauthConfig.replit.clientID && !!oauthConfig.replit.clientSecret) ||
             !!process.env.REPLIT_DOMAINS;
    default:
      return false;
  }
}

/**
 * Get callback URL for a provider
 */
export function getCallbackURL(provider: OAuthProvider | string, hostname: string): string {
  const protocol = hostname === "localhost" ? "http" : "https";
  const port = hostname === "localhost" ? ":5000" : "";
  return `${protocol}://${hostname}${port}/api/auth/${provider}/callback`;
}