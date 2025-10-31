/**
 * OAuth Configuration
 * 
 * Centralized configuration for all OAuth providers.
 * Replace placeholder values with real credentials from each provider.
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

export const oauthConfig = {
  google: {
    clientID: process.env.GOOGLE_CLIENT_ID || "placeholder_google_client_id",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "placeholder_google_client_secret",
    scope: ["profile", "email"],
  },
  github: {
    clientID: process.env.GITHUB_CLIENT_ID || "placeholder_github_client_id",
    clientSecret: process.env.GITHUB_CLIENT_SECRET || "placeholder_github_client_secret",
    scope: ["user:email"],
  },
  twitter: {
    consumerKey: process.env.TWITTER_CONSUMER_KEY || "placeholder_twitter_consumer_key",
    consumerSecret: process.env.TWITTER_CONSUMER_SECRET || "placeholder_twitter_consumer_secret",
  },
  apple: {
    clientID: process.env.APPLE_CLIENT_ID || "placeholder_apple_client_id",
    teamID: process.env.APPLE_TEAM_ID || "placeholder_apple_team_id",
    keyID: process.env.APPLE_KEY_ID || "placeholder_apple_key_id",
    privateKey: process.env.APPLE_PRIVATE_KEY || "placeholder_apple_private_key",
  },
  session: {
    secret: process.env.SESSION_SECRET || process.env.SESSION_SECRET || "placeholder_session_secret_please_change_in_production",
  },
};

/**
 * Check if OAuth is properly configured
 */
export function isOAuthConfigured(provider: string): boolean {
  switch (provider) {
    case "google":
      return !oauthConfig.google.clientID.includes("placeholder") && 
             !oauthConfig.google.clientSecret.includes("placeholder");
    case "github":
      return !oauthConfig.github.clientID.includes("placeholder") && 
             !oauthConfig.github.clientSecret.includes("placeholder");
    case "twitter":
      return !oauthConfig.twitter.consumerKey.includes("placeholder") && 
             !oauthConfig.twitter.consumerSecret.includes("placeholder");
    case "apple":
      return !oauthConfig.apple.clientID.includes("placeholder") && 
             !oauthConfig.apple.teamID.includes("placeholder");
    default:
      return false;
  }
}

/**
 * Get callback URL for a provider
 */
export function getCallbackURL(provider: string, hostname: string): string {
  const protocol = hostname === "localhost" ? "http" : "https";
  const port = hostname === "localhost" ? ":5000" : "";
  return `${protocol}://${hostname}${port}/api/auth/${provider}/callback`;
}