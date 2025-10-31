# OAuth Authentication Setup Guide

## Overview

ChefSpAIce has been migrated from Replit Auth to a custom OAuth authentication system that supports multiple providers. The application is currently configured with placeholder credentials for development. This guide explains how to set up real OAuth credentials for production use.

## Current Status

✅ **OAuth Infrastructure Complete**
- All authentication routes migrated to OAuth
- Database schema supports multiple OAuth providers
- Session-based authentication with PostgreSQL storage
- Placeholder credentials configured for development

## Supported OAuth Providers

1. **Google OAuth**
2. **GitHub OAuth**
3. **Twitter/X OAuth**
4. **Apple Sign In**
5. **Email/Password** (always available, no external credentials needed)

## Setting Up OAuth Credentials

### 1. Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth client ID"
5. Configure consent screen:
   - Add app name: "ChefSpAIce"
   - Add authorized domains
6. Create OAuth 2.0 Client ID:
   - Application type: Web application
   - Authorized redirect URIs: 
     - `https://your-domain.replit.app/api/auth/google/callback`
     - `http://localhost:5000/api/auth/google/callback` (for development)
7. Copy Client ID and Client Secret

**Environment Variables:**
```env
GOOGLE_CLIENT_ID=your_actual_google_client_id
GOOGLE_CLIENT_SECRET=your_actual_google_client_secret
```

### 2. GitHub OAuth

1. Go to GitHub Settings → Developer Settings → OAuth Apps
2. Click "New OAuth App"
3. Fill in:
   - Application name: ChefSpAIce
   - Homepage URL: `https://your-domain.replit.app`
   - Authorization callback URL: 
     - `https://your-domain.replit.app/api/auth/github/callback`
4. Register application
5. Copy Client ID and generate Client Secret

**Environment Variables:**
```env
GITHUB_CLIENT_ID=your_actual_github_client_id
GITHUB_CLIENT_SECRET=your_actual_github_client_secret
```

### 3. Twitter/X OAuth

1. Go to [Twitter Developer Portal](https://developer.twitter.com/)
2. Create a new App
3. Configure OAuth 1.0a settings:
   - Enable OAuth 1.0a
   - Callback URLs:
     - `https://your-domain.replit.app/api/auth/twitter/callback`
     - `http://localhost:5000/api/auth/twitter/callback`
4. Copy API Key (Consumer Key) and API Secret (Consumer Secret)

**Environment Variables:**
```env
TWITTER_CONSUMER_KEY=your_actual_twitter_consumer_key
TWITTER_CONSUMER_SECRET=your_actual_twitter_consumer_secret
```

### 4. Apple Sign In

1. Go to [Apple Developer Portal](https://developer.apple.com/)
2. Register App ID with Sign in with Apple capability
3. Create Service ID for web authentication
4. Configure domains and return URLs:
   - Domain: `your-domain.replit.app`
   - Return URL: `https://your-domain.replit.app/api/auth/apple/callback`
5. Create and download private key
6. Note your Team ID and Service ID

**Environment Variables:**
```env
APPLE_CLIENT_ID=your_service_id
APPLE_TEAM_ID=your_team_id
APPLE_KEY_ID=your_key_id
APPLE_PRIVATE_KEY=your_private_key_content
```

### 5. Session Secret

The session secret is used to sign session cookies. Generate a strong random string:

```bash
# Generate a secure session secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Environment Variable:**
```env
SESSION_SECRET=your_generated_session_secret
```

## Adding Credentials to Replit

1. Open your Replit project
2. Go to the Secrets tab (lock icon in the left sidebar)
3. Add each environment variable:
   - Click "New Secret"
   - Enter the key (e.g., `GOOGLE_CLIENT_ID`)
   - Enter the value (your actual credential)
   - Click "Add Secret"

## Testing OAuth Configuration

After adding credentials:

1. **Restart the application** to load new environment variables
2. **Check configuration status** by visiting:
   ```
   GET /api/auth/config-status
   ```
   This will show which providers are properly configured

3. **Test each provider**:
   - Try logging in with each configured provider
   - Verify redirect URLs work correctly
   - Check that user data is properly stored

## Security Considerations

⚠️ **Important Security Notes:**

1. **Never commit credentials to version control**
   - Always use environment variables
   - Keep `.env` files in `.gitignore`

2. **Use HTTPS in production**
   - OAuth requires secure connections
   - Replit provides automatic HTTPS for published apps

3. **Validate redirect URLs**
   - Only add trusted domains to OAuth app settings
   - Include both development and production URLs

4. **Session security**
   - Use a strong, unique SESSION_SECRET
   - Rotate session secret periodically
   - Sessions expire after 7 days by default

## Troubleshooting

### Provider shows "Needs configuration"
- Check that environment variables are set correctly
- Ensure variable names match exactly (case-sensitive)
- Restart the application after adding secrets

### OAuth callback fails
- Verify redirect URLs match exactly in provider settings
- Check that URLs include the correct protocol (http/https)
- Ensure domain is added to authorized domains in provider settings

### "Service Unavailable" error
- Provider is not configured (missing credentials)
- Check `/api/auth/config-status` to see which providers are active

### Session issues
- Ensure SESSION_SECRET is set
- Check PostgreSQL connection for session storage
- Verify cookies are enabled in browser

## Migration Notes

The migration from Replit Auth to OAuth included:

1. **Database changes**:
   - Added `auth_providers` table for multiple provider support
   - Updated `users` table with OAuth fields
   - All existing user data preserved

2. **Route changes**:
   - Old: `/api/login` (Replit Auth)
   - New: `/api/auth/[provider]/login` (OAuth)

3. **User structure changes**:
   - Old: `req.user.claims.sub` (Replit Auth)
   - New: `req.user.id` (OAuth)

4. **Authentication flow**:
   - Session-based authentication with PostgreSQL storage
   - Support for linking multiple OAuth providers to one account

## Support

For issues or questions about OAuth setup:

1. Check the configuration status endpoint
2. Review server logs for detailed error messages
3. Verify all environment variables are set correctly
4. Test with Email/Password authentication first (always available)

## Next Steps

1. ✅ Add real OAuth credentials for each provider you want to support
2. ✅ Test authentication flow for each provider
3. ✅ Configure authorized domains and redirect URLs
4. ✅ Publish your app with working authentication

---

*Last updated: October 31, 2025*