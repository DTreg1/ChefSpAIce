# ChefSpAIce Setup Guide

This document provides step-by-step instructions with copyable prompts to configure all services in the ChefSpAIce application.

## Current Status Summary

| Feature                     | Status               | Notes                                       |
| --------------------------- | -------------------- | ------------------------------------------- |
| Database (PostgreSQL)       | ✅ Working           | Neon serverless via Drizzle ORM             |
| Health Check API            | ✅ Working           | `/health` endpoint                          |
| Storage Layer (375 methods) | ✅ Working           | 16 domains fully aligned, 1 partial (AI-ML) |
| Google OAuth                | ✅ Working           | Requires credentials                        |
| GitHub OAuth                | ✅ Working           | Requires credentials                        |
| Twitter/X OAuth             | ✅ Working           | OAuth 2.0 with PKCE, requires credentials   |
| Apple OAuth                 | ✅ Working           | Requires credentials                        |
| Replit OAuth                | ✅ Working           | Uses OIDC integration                       |
| Email/Password Auth         | ✅ Working           | Full registration/login flow                |
| Onboarding Flow             | ✅ Working           | Auto-redirects new users                    |
| AI Chat (OpenAI)            | ✅ Working           | Requires OPENAI_API_KEY                     |
| Push Notifications (Web)    | ⚠️ Needs VAPID Keys  | Code implemented, needs key configuration   |
| Push Notifications (FCM)    | ⚠️ Needs Credentials | Android notifications                       |
| Push Notifications (APNs)   | ⚠️ Needs Credentials | iOS notifications                           |
| Stripe Integration          | ⚠️ Needs Setup       | Webhook secret required                     |
| Object Storage (GCS)        | ⚠️ Needs Setup       | Image uploads                               |
| Twilio SMS                  | ❌ Not Configured    | Optional feature                            |

---

## Authentication Flow Overview

After successful authentication (via any method), users experience:

1. **New Users** → Redirected to onboarding page with:

   - "Welcome to ChefSpAIce!" greeting
   - Storage areas setup (Refrigerator, Freezer, Pantry, Counter)
   - Kitchen Equipment selection
   - Cooking preferences (household size, skill level, units)
   - Dietary Preferences and Allergens
   - "Skip Setup" or "Complete Setup" options

2. **Returning Users** → Redirected to main dashboard

---

## Section 1: Core Configuration

### 1.1 Database (Required)

**Status:** ✅ Working

The application uses PostgreSQL via Neon serverless. Database URL is automatically provided by Replit.

**Environment Variable:**

```bash
DATABASE_URL=postgresql://...  # Automatically set by Replit
```

**Testing:**

```bash
curl https://YOUR_DOMAIN/health
```

---

### 1.2 Session Secret (Required)

**Status:** ✅ Auto-generated if not set

**Environment Variable:**

```bash
SESSION_SECRET=your-random-session-secret-at-least-32-chars
```

---

### 1.3 OpenAI API Key (Required for AI Features)

**Status:** Requires API key for AI chat, recipe generation, and analysis features

**Steps:**

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Navigate to API Keys
3. Create a new secret key
4. Copy the key

**Environment Variable:**

```bash
OPENAI_API_KEY=sk-...
```

---

## Section 2: Authentication Setup

### 2.1 Google OAuth Setup

**Status:** ✅ Code implemented, requires credentials

**What you need:**

- Google Cloud Console account
- OAuth 2.0 Client ID and Secret

**Steps:**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Navigate to "APIs & Services" → "Credentials"
4. Click "Create Credentials" → "OAuth client ID"
5. Select "Web application"
6. Add authorized redirect URI: `https://YOUR_REPLIT_DOMAIN/api/auth/google/callback`
7. Copy the Client ID and Client Secret

**Required Secrets:**

```bash
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
```

---

### 2.2 GitHub OAuth Setup

**Status:** ✅ Code implemented, requires credentials

**What you need:**

- GitHub account
- OAuth App credentials

**Steps:**

1. Go to GitHub → Settings → Developer settings → OAuth Apps
2. Click "New OAuth App"
3. Fill in:
   - Application name: `ChefSpAIce`
   - Homepage URL: `https://YOUR_REPLIT_DOMAIN`
   - Authorization callback URL: `https://YOUR_REPLIT_DOMAIN/api/auth/github/callback`
4. Click "Register application"
5. Copy Client ID and generate a new Client Secret

**Required Secrets:**

```bash
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
```

---

### 2.3 Twitter/X OAuth 2.0

**Status:** ✅ Code implemented, requires credentials

**What you need:**

- Twitter Developer account
- OAuth 2.0 Client ID and Client Secret

**Steps:**

1. Go to [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Create a new project and app (or select existing)
3. Navigate to "User authentication settings"
4. Enable OAuth 2.0 with these settings:
   - Type of App: Web App
   - App permissions: Read (minimum)
   - Request email from users: Enable
5. Add Callback URL: `https://YOUR_REPLIT_DOMAIN/api/auth/twitter/callback`
6. Add Website URL: `https://YOUR_REPLIT_DOMAIN`
7. Copy the Client ID and Client Secret

**Required Secrets:**

```bash
TWITTER_CLIENT_ID=your_client_id
TWITTER_CLIENT_SECRET=your_client_secret
```

**Note:** This implementation uses OAuth 2.0 with PKCE (Proof Key for Code Exchange) for enhanced security.

---

### 2.4 Apple Sign In Setup

**Status:** ✅ Code implemented, requires credentials

**What you need:**

- Apple Developer account ($99/year)
- Services ID and Private Key

**Steps:**

1. Go to [Apple Developer](https://developer.apple.com/)
2. Navigate to Certificates, Identifiers & Profiles
3. Create a Services ID:
   - Register a new identifier → Services IDs
   - Enable "Sign In with Apple"
   - Configure domains and return URLs: `https://YOUR_REPLIT_DOMAIN/api/auth/apple/callback`
4. Create a Key:
   - Keys → Create a new key
   - Enable "Sign In with Apple"
   - Download the .p8 key file

**Required Secrets:**

```bash
APPLE_CLIENT_ID=com.yourcompany.chefspaice
APPLE_TEAM_ID=your_10_char_team_id
APPLE_KEY_ID=your_key_id
APPLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----
```

---

### 2.5 Replit OAuth Setup

**Status:** ✅ Working with OIDC integration

Replit Auth uses OpenID Connect and is integrated via the Replit platform. The application uses:

- `ISSUER_URL` - Set to `https://replit.com/oidc`
- `REPL_ID` - Automatically available in Replit environment

**For Custom Replit OAuth App (Optional):**

1. Go to Replit → Your Profile → Developer Tools
2. Create an OAuth application
3. Set callback URL: `https://YOUR_REPLIT_DOMAIN/api/auth/replit/callback`

**Optional Secrets (for custom app):**

```bash
REPLIT_CLIENT_ID=your_client_id
REPLIT_CLIENT_SECRET=your_client_secret
```

---

### 2.6 Email/Password Authentication

**Status:** ✅ Fully working

Email/password authentication is fully configured and includes:

- User registration with email, password, first name, last name
- Secure password hashing with bcrypt
- Automatic login after registration
- Session-based authentication

**Testing:**

```bash
# Register a new user
curl -X POST https://YOUR_REPLIT_DOMAIN/api/auth/email/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePassword123!",
    "firstName": "Test",
    "lastName": "User"
  }'

# Login existing user
curl -X POST https://YOUR_REPLIT_DOMAIN/api/auth/email/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePassword123!"
  }'
```

---

## Section 3: Push Notifications

### 3.1 Web Push (VAPID) Setup

**Status:** ⚠️ Requires VAPID keys

**Generate VAPID Keys:**

```bash
npx web-push generate-vapid-keys
```

**Required Secrets:**

```bash
VAPID_PUBLIC_KEY=BN...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:support@chefspaice.app
```

---

### 3.2 Firebase Cloud Messaging (FCM) Setup

**Status:** ⚠️ Code implemented, needs credentials

**What you need:**

- Firebase project with Cloud Messaging enabled
- Service account JSON file

**Steps:**

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing
3. Navigate to Project Settings → Service Accounts
4. Click "Generate new private key"
5. Download the JSON file

**Required Secrets:**

```bash
FCM_SERVICE_ACCOUNT={"type":"service_account","project_id":"..."}
```

---

### 3.3 Apple Push Notification Service (APNs) Setup

**Status:** ⚠️ Code implemented, needs credentials

**What you need:**

- Apple Developer account
- APNs Key (.p8 file)
- Bundle ID

**Steps:**

1. Go to Apple Developer → Certificates, Identifiers & Profiles
2. Create a new Key with "Apple Push Notifications service (APNs)" enabled
3. Download the .p8 key file
4. Note your Key ID and Team ID

**Required Secrets:**

```bash
APNS_KEY_ID=your_10_char_key_id
APNS_TEAM_ID=your_10_char_team_id
APNS_BUNDLE_ID=com.chefspaice.app
APNS_KEY_CONTENT=base64_encoded_p8_file
APNS_PRODUCTION=false
```

---

## Section 4: External Services

### 4.1 Stripe Integration

**Status:** ⚠️ Needs webhook secret

**Steps:**

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/) → Developers → Webhooks
2. Click "Add endpoint"
3. Set endpoint URL: `https://YOUR_REPLIT_DOMAIN/api/v1/webhooks/stripe`
4. Select events to listen to:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Copy the Signing Secret

**Required Secrets:**

```bash
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
VITE_STRIPE_PUBLIC_KEY=pk_...
```

---

### 4.2 Object Storage (Google Cloud Storage)

**Status:** ⚠️ Needs configuration

For image uploads and asset storage.

**Required Secrets:**

```bash
OBJECT_STORAGE_BUCKET=your-bucket-name
GCS_SERVICE_ACCOUNT={"type":"service_account",...}
```

---

### 4.3 USDA API (Optional)

**Status:** ✅ Works with local caching

The USDA FoodData Central API provides nutrition data. Results are cached locally.

**Optional Secret:**

```bash
USDA_API_KEY=your_api_key
```

---

## Quick Reference: All Secrets

### High Priority (Core Features)

```bash
# Database
DATABASE_URL=                      # Auto-provided by Replit

# Session
SESSION_SECRET=                    # Required for auth

# AI Features
OPENAI_API_KEY=                    # Required for AI chat
```

### Medium Priority (Authentication)

```bash
# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# GitHub OAuth
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Twitter/X OAuth 2.0
TWITTER_CLIENT_ID=
TWITTER_CLIENT_SECRET=

# Apple Sign In
APPLE_CLIENT_ID=
APPLE_TEAM_ID=
APPLE_KEY_ID=
APPLE_PRIVATE_KEY=
```

### Push Notifications

```bash
# Web Push
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=

# Firebase Cloud Messaging
FCM_SERVICE_ACCOUNT=

# Apple Push Notifications
APNS_KEY_ID=
APNS_TEAM_ID=
APNS_BUNDLE_ID=
APNS_KEY_CONTENT=
```

### Low Priority (Optional Features)

```bash
# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
VITE_STRIPE_PUBLIC_KEY=

# Object Storage
OBJECT_STORAGE_BUCKET=
```

---

## Testing Authentication

### Test OAuth Providers

```bash
# Open these URLs in browser to test OAuth flows
https://YOUR_REPLIT_DOMAIN/api/auth/google/login
https://YOUR_REPLIT_DOMAIN/api/auth/github/login
https://YOUR_REPLIT_DOMAIN/api/auth/twitter/login
https://YOUR_REPLIT_DOMAIN/api/auth/apple/login
https://YOUR_REPLIT_DOMAIN/api/auth/replit/login
```

### Verify Auth Status

```bash
# Check current user session
curl https://YOUR_REPLIT_DOMAIN/api/user

# Check OAuth configuration status
curl https://YOUR_REPLIT_DOMAIN/api/v1/auth/config-status
```

---

## Troubleshooting

### OAuth Callback Errors

Common causes:

1. **Callback URL mismatch** - Must exactly match what's registered with the provider
2. **Missing or invalid secrets** - Double-check all credentials
3. **HTTPS required** - OAuth providers require HTTPS for production

### Session Not Persisting

Check:

1. `SESSION_SECRET` is set and consistent
2. Database connection is working
3. The `sessions` table exists in database

### AI Features Not Working

Check:

1. `OPENAI_API_KEY` is set correctly
2. Key has sufficient credits/quota
3. Check server logs for API errors

### Push Notifications Not Sending

Check:

1. VAPID/FCM/APNs credentials are real (not placeholder)
2. Device tokens are valid and registered
3. Proper certificates are uploaded

---

## Architecture Notes

### Auth Routes

Auth routes are mounted at two paths for compatibility:

- `/api/auth/*` - Primary path for OAuth callbacks
- `/api/v1/auth/*` - API versioned path

### API Response Format

Paginated endpoints return:

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 100,
    "totalPages": 2
  }
}
```

---

## Recommended Setup Order

1. **Session Secret** - Required for all auth
2. **OpenAI API Key** - Required for AI features
3. **Email/Password** - Already working, no setup needed
4. **Replit Auth** - Easiest OAuth option, uses built-in OIDC
5. **Google OAuth** - Most users have Google accounts
6. **GitHub OAuth** - Great for developer users
7. **Web Push** - VAPID keys for browser notifications
8. **Apple Sign In** - Required for iOS App Store
9. **FCM/APNs** - When mobile notifications needed
10. **Stripe** - When payment features are ready

---

_Last Updated: November 2025_
