# Authentication Configuration Guide

## Overview
This application supports dual-mode authentication to work seamlessly with both development/testing and production environments.

## Authentication Modes

### 1. Replit Auth Mode
Used for:
- Development and testing environments
- Replit Agent automated testing
- Quick local development without OAuth setup

### 2. OAuth Mode
Used for:
- Production deployments
- Custom authentication providers (Google, GitHub, Twitter, Apple)
- Advanced authentication requirements

## Environment Variables

### Mode Selection
- `AUTH_MODE`: Explicitly set authentication mode (`replit` or `oauth`)
- `ISSUER_URL`: Automatically overridden by Replit Agent during testing (do not set manually)

### OAuth Configuration
Configure these for OAuth mode:
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`: Google OAuth credentials
- `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`: GitHub OAuth credentials
- `TWITTER_CONSUMER_KEY` and `TWITTER_CONSUMER_SECRET`: Twitter OAuth credentials
- `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY`: Apple OAuth credentials

### Session Configuration
- `SESSION_SECRET`: Required for session management (auto-generated in development if not set)

## Auto-Detection Logic

The system automatically detects the appropriate mode based on:
1. **Explicit `AUTH_MODE` setting**: If set, uses the specified mode
2. **Replit Agent testing**: Detects ISSUER_URL override and uses Replit Auth
3. **OAuth credentials present**: Uses OAuth if any provider is configured
4. **Replit environment**: Defaults to Replit Auth if running on Replit without OAuth
5. **Fallback**: Defaults to OAuth mode for non-Replit environments

## How It Works

1. **On startup**, the server detects the environment and chooses the appropriate auth mode
2. **Unified endpoints** work with both modes:
   - `/api/login`: Initiates login flow
   - `/api/logout`: Logs out the user
   - `/api/auth/user`: Gets current user information
3. **Mode-specific endpoints**:
   - OAuth: `/api/auth/[provider]/login` for provider-specific login
   - Replit: `/api/callback` for OIDC callback

## Testing with Replit Agent

The Replit Agent can automatically test your application when using Replit Auth mode:
- The Agent overrides `ISSUER_URL` to mock authentication
- No manual login is required during automated tests
- Test users are created automatically

## Troubleshooting

### Agent Testing Issues
If the Replit Agent cannot test your app:
1. Check if `AUTH_MODE` is forcing OAuth mode
2. Ensure no `ISSUER_URL` is manually set in your environment
3. The system should auto-detect Agent testing and switch to Replit Auth

### OAuth Not Working
1. Verify OAuth credentials are correctly set
2. Check callback URLs match your domain
3. Ensure providers are properly configured in their respective dashboards

### Session Issues
1. Ensure `SESSION_SECRET` is set in production
2. Check PostgreSQL database is accessible for session storage
3. Verify the `sessions` table exists in the database