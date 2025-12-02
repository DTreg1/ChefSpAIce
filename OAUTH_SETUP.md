# OAuth Authentication Setup Guide

## Overview

ChefSpAIce uses OAuth-only authentication across all environments. The application supports six authentication providers:

- Google OAuth 2.0
- GitHub OAuth
- X (Twitter) OAuth 2.0 with PKCE
- Apple Sign In
- Replit OAuth 2.0
- Email/Password (local authentication)

## Environment Variables Required

Add the following environment variables to your `.env` file or Replit Secrets:

### Session Management (Required)

```bash
SESSION_SECRET=your-random-session-secret-at-least-32-chars
```

### Google OAuth 2.0

```bash
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

Setup:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `https://your-domain.replit.app/api/auth/google/callback`

### GitHub OAuth

```bash
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

Setup:

1. Go to GitHub Settings > Developer settings > OAuth Apps
2. Click "New OAuth App"
3. Set Authorization callback URL: `https://your-domain.replit.app/api/auth/github/callback`

### X (Twitter) OAuth 2.0 with PKCE

```bash
TWITTER_CLIENT_ID=your-twitter-client-id
TWITTER_CLIENT_SECRET=your-twitter-client-secret
```

Setup:

1. Go to [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Create a new project and app (or select existing)
3. Navigate to "User authentication settings"
4. Enable OAuth 2.0 with these settings:
   - Type of App: Web App
   - App permissions: Read (minimum)
   - Request email from users: Enable
5. Set Callback URL: `https://your-domain.replit.app/api/auth/twitter/callback`
6. Set Website URL: `https://your-domain.replit.app`
7. Copy the Client ID and Client Secret

Note: This implementation uses OAuth 2.0 with PKCE (Proof Key for Code Exchange) for enhanced security. The old OAuth 1.0a credentials (TWITTER_CONSUMER_KEY/SECRET) are no longer used.

### Apple Sign In

```bash
APPLE_CLIENT_ID=your-apple-client-id
APPLE_TEAM_ID=your-apple-team-id
APPLE_KEY_ID=your-apple-key-id
APPLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nYour-Apple-Private-Key\n-----END PRIVATE KEY-----
```

Setup:

1. Go to [Apple Developer](https://developer.apple.com/)
2. Create an App ID with Sign In with Apple capability
3. Create a Service ID (this is your CLIENT_ID)
4. Create a Sign In with Apple Private Key
5. Configure redirect URL: `https://your-domain.replit.app/api/auth/apple/callback`

### Replit OAuth 2.0

```bash
REPLIT_CLIENT_ID=your-replit-client-id
REPLIT_CLIENT_SECRET=your-replit-client-secret
```

Setup:

1. Go to your Replit profile settings
2. Navigate to "Connected apps" > "Create application"
3. Set Redirect URI: `https://your-domain.replit.app/api/auth/replit/callback`
4. Copy the Client ID and Client Secret

### Email/Password Authentication

No additional environment variables required. Uses local database for user storage.

## Architecture Details

### Authentication Flow

1. User selects a provider on the login page
2. User is redirected to the OAuth provider
3. Provider redirects back with authorization code
4. Server exchanges code for user profile
5. Server creates/updates user in database
6. Session is established with `express-session`
7. User is redirected to the authenticated app

### Session Storage

- Sessions are stored in PostgreSQL via `connect-pg-simple`
- Session cookies are httpOnly and secure in production
- Sessions expire after 24 hours by default

### User Management

- Users are stored in the `users` table
- Provider-specific IDs are stored in `provider_id` column
- Email addresses are normalized and used for account linking
- First login creates a new user record

### Key Files

- `server/auth/unified-auth.ts` - Main authentication setup
- `server/auth/oauth.ts` - OAuth strategies configuration
- `server/auth/oauth-routes.ts` - OAuth route handlers
- `server/auth/helpers.ts` - Authentication helper functions
- `client/src/components/AuthUI.tsx` - Frontend authentication UI

## Testing Authentication

### Check Configuration Status

```bash
curl https://your-domain.replit.app/api/auth/config-status
```

### Test Each Provider

1. Navigate to your app's homepage
2. Click on a provider button (Google, GitHub, X, Apple, Replit, or Email)
3. Complete the OAuth flow
4. Verify user is logged in by checking `/api/auth/user`

### Verify User Session

```bash
curl https://your-domain.replit.app/api/auth/user \
  -H "Cookie: your-session-cookie"
```

## Troubleshooting

### Provider Not Configured Error

If you see "X authentication is not configured yet", ensure:

1. Environment variables are set correctly
2. Provider credentials are valid
3. Redirect URIs match exactly

### Session Not Persisting

Check:

1. `SESSION_SECRET` is set and consistent
2. Database connection is working
3. `express_session` table exists in database

### OAuth Redirect Mismatch

Ensure redirect URIs in provider settings exactly match:

- Protocol (https:// not http://)
- Domain (including .replit.app suffix)
- Path (e.g., /api/auth/google/callback)

### User Not Created

Verify:

1. Database migrations have run
2. `users` table exists
3. Provider returns email in profile

## Security Considerations

1. **Never commit secrets** - Use environment variables
2. **Use HTTPS** - OAuth requires secure connections
3. **Validate domains** - Check redirect URIs carefully
4. **Rotate secrets** - Change credentials periodically
5. **Monitor sessions** - Clean up old sessions regularly

## Development vs Production

The application uses the same OAuth flow in both environments:

- Development: Use localhost redirect URIs with test credentials
- Production: Use production domain with real credentials

No code changes needed between environments, just different environment variables.
