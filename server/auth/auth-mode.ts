/**
 * Authentication Mode Configuration
 * 
 * This application uses a unified OAuth authentication system supporting multiple providers:
 * - Google OAuth
 * - GitHub OAuth
 * - Twitter/X OAuth
 * - Apple Sign In
 * - Replit OAuth (when running on Replit)
 * - Email/Password authentication
 */

export type AuthMode = 'oauth';

/**
 * Returns the authentication mode
 * 
 * The application uses a unified OAuth-based authentication system
 * with multiple providers available based on environment configuration.
 */
export function getAuthMode(): AuthMode {
  return 'oauth';
}

/**
 * Log the current auth configuration
 */
export function logAuthConfiguration() {
  const mode = getAuthMode();
  const config = {
    mode,
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      REPL_ID: process.env.REPL_ID,
      REPLIT_DOMAINS: process.env.REPLIT_DOMAINS,
      ISSUER_URL: process.env.ISSUER_URL || 'not set',
    },
    oauthProviders: {
      google: !!process.env.GOOGLE_CLIENT_ID,
      github: !!process.env.GITHUB_CLIENT_ID,
      twitter: !!process.env.TWITTER_CONSUMER_KEY,
      apple: !!process.env.APPLE_CLIENT_ID,
    }
  };
  
  console.log('🔐 Authentication Configuration:', JSON.stringify(config, null, 2));
  return config;
}