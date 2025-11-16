/**
 * Authentication Mode Detection
 * 
 * Determines which authentication mode to use based on environment.
 * - Replit Auth: For development/testing (especially Replit Agent testing)
 * - Custom OAuth: For production with external providers
 */

export type AuthMode = 'replit' | 'oauth';

/**
 * Detects if we're in a Replit Agent testing environment
 * The Agent overrides ISSUER_URL during testing
 */
function isReplitTestEnvironment(): boolean {
  // Check if ISSUER_URL is overridden (Agent testing)
  const issuerUrl = process.env.ISSUER_URL;
  if (issuerUrl && issuerUrl !== 'https://replit.com/oidc') {
    console.log('🧪 Detected Replit Agent test environment (ISSUER_URL override)');
    return true;
  }
  
  return false;
}

/**
 * Determines the authentication mode to use
 * 
 * Always returns 'oauth' as we've consolidated to a single OAuth-based authentication system
 * with Replit available as one of the OAuth providers alongside Google, GitHub, Twitter/X, Apple, and email.
 */
export function getAuthMode(): AuthMode {
  console.log('🌐 Using OAuth mode (unified authentication system)');
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