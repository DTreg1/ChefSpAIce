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
 */
export function getAuthMode(): AuthMode {
  // Allow explicit mode override
  const explicitMode = process.env.AUTH_MODE?.toLowerCase();
  if (explicitMode === 'replit' || explicitMode === 'oauth') {
    console.log(`📋 Using explicit auth mode: ${explicitMode} (AUTH_MODE env var)`);
    return explicitMode as AuthMode;
  }
  
  // Auto-detect based on environment
  if (isReplitTestEnvironment()) {
    return 'replit';
  }
  
  // Check if OAuth credentials are FULLY configured (both ID and secret)
  const hasCompleteOAuthConfig = !!(
    (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) || 
    (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) || 
    (process.env.TWITTER_CONSUMER_KEY && process.env.TWITTER_CONSUMER_SECRET) ||
    (process.env.APPLE_CLIENT_ID && process.env.APPLE_TEAM_ID && process.env.APPLE_KEY_ID)
  );
  
  if (hasCompleteOAuthConfig) {
    console.log('🌐 Using OAuth mode (complete OAuth credentials detected)');
    return 'oauth';
  }
  
  // Default to Replit Auth for Replit environments without OAuth config
  if (process.env.REPL_ID || process.env.REPLIT_DOMAINS) {
    console.log('🏠 Using Replit Auth mode (Replit environment, no OAuth config)');
    return 'replit';
  }
  
  // Fallback to OAuth for non-Replit environments
  console.log('📦 Defaulting to OAuth mode');
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
      REPL_ID: !!process.env.REPL_ID,
      REPLIT_DOMAINS: !!process.env.REPLIT_DOMAINS,
      ISSUER_URL: process.env.ISSUER_URL || 'not set',
      AUTH_MODE: process.env.AUTH_MODE || 'not set',
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