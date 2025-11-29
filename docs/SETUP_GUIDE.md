# ChefSpAIce Setup Guide

This document provides step-by-step instructions with copyable prompts to configure all services in the ChefSpAIce application.

## Current Status Summary

| Feature | Status | Notes |
|---------|--------|-------|
| Database | ✅ Working | PostgreSQL via Drizzle ORM |
| Health Check API | ✅ Working | - |
| Storage Tests (310) | ✅ Passing | - |
| Google OAuth | ✅ Working | Requires credentials |
| GitHub OAuth | ✅ Working | Requires credentials |
| Twitter/X OAuth | ✅ Working | OAuth 2.0 with PKCE, requires credentials |
| Apple OAuth | ✅ Working | Requires credentials |
| Replit OAuth | ✅ Working | Uses OIDC integration |
| Email/Password Auth | ✅ Working | Full registration/login flow |
| Onboarding Flow | ✅ Working | Auto-redirects new users |
| Push Notifications (FCM) | ⚠️ Needs Credentials | Dummy credentials in place |
| Push Notifications (APNs) | ⚠️ Needs Credentials | Dummy credentials in place |
| Stripe Webhooks | ⚠️ Missing Secret | Stripe API keys configured |
| Twilio SMS | ❌ Not Configured | Optional feature |

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

## Section 1: Authentication Setup

### 1.1 Google OAuth Setup

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
```
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
```

---

### 1.2 GitHub OAuth Setup

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
```
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
```

---

### 1.3 Apple Sign In Setup

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
```
APPLE_CLIENT_ID=com.yourcompany.chefpsaice
APPLE_TEAM_ID=your_10_char_team_id
APPLE_KEY_ID=your_key_id
APPLE_CLIENT_SECRET=contents_of_p8_file
```

---

### 1.4 Replit OAuth Setup

**Status:** ✅ Working with OIDC integration

Replit Auth uses OpenID Connect and is integrated via the Replit platform. The application uses:

- `ISSUER_URL` - Set to `https://replit.com/oidc`
- `REPL_ID` - Automatically available in Replit environment

**For Custom Replit OAuth App (Optional):**

1. Go to Replit → Your Profile → Developer Tools
2. Create an OAuth application
3. Set callback URL: `https://YOUR_REPLIT_DOMAIN/api/auth/replit/callback`

**Optional Secrets (for custom app):**
```
REPLIT_CLIENT_ID=your_client_id
REPLIT_CLIENT_SECRET=your_client_secret
```

---

### 1.5 Email/Password Authentication

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

### 1.6 Twitter/X OAuth 2.0

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
```
TWITTER_CLIENT_ID=your_client_id
TWITTER_CLIENT_SECRET=your_client_secret
```

**Note:** This implementation uses OAuth 2.0 with PKCE (Proof Key for Code Exchange) for enhanced security.

---

## Section 2: Push Notifications

### 2.1 Firebase Cloud Messaging (FCM) Setup

**Status:** ⚠️ Code implemented with dummy credentials

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
```
FCM_SERVICE_ACCOUNT=entire_json_content
FCM_SERVER_KEY=your_fcm_server_key
FCM_PRIVATE_KEY=private_key_from_json
```

---

### 2.2 Apple Push Notification Service (APNs) Setup

**Status:** ⚠️ Code implemented with dummy credentials

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
```
APNS_KEY_ID=your_10_char_key_id
APNS_TEAM_ID=your_10_char_team_id
APNS_BUNDLE_ID=com.yourcompany.chefpsaice
APNS_KEY_CONTENT=contents_of_p8_file
```

---

## Section 3: Payment & Webhooks

### 3.1 Stripe Webhooks Setup

**Status:** ⚠️ Stripe API keys configured, webhook secret missing

**What you need:**
- Stripe account with webhook endpoint configured

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
```
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

---

## Section 4: SMS Notifications (Optional)

### 4.1 Twilio Setup

**Status:** ❌ Not configured

**What you need:**
- Twilio account
- Phone number for sending SMS

**Steps:**

1. Go to [Twilio Console](https://www.twilio.com/console)
2. Get your Account SID and Auth Token from the dashboard
3. Purchase a phone number for sending SMS

**Required Secrets:**
```
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+15551234567
```

---

## Quick Reference: All Secrets

### Authentication (High Priority)
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
APPLE_CLIENT_SECRET=

# Replit OAuth (optional - uses OIDC by default)
REPLIT_CLIENT_ID=
REPLIT_CLIENT_SECRET=
```

### Push Notifications (Medium Priority)
```bash
# Firebase Cloud Messaging
FCM_SERVICE_ACCOUNT=
FCM_SERVER_KEY=
FCM_PRIVATE_KEY=

# Apple Push Notifications
APNS_KEY_ID=
APNS_TEAM_ID=
APNS_BUNDLE_ID=
APNS_KEY_CONTENT=
```

### Payments & SMS (Low Priority)
```bash
# Stripe
STRIPE_WEBHOOK_SECRET=

# Twilio
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
```

---

## Testing Authentication

### Test OAuth Providers
```bash
# Google OAuth - opens login flow
https://YOUR_REPLIT_DOMAIN/api/auth/google/login

# GitHub OAuth - opens login flow
https://YOUR_REPLIT_DOMAIN/api/auth/github/login

# Twitter/X OAuth 2.0 - opens login flow
https://YOUR_REPLIT_DOMAIN/api/auth/twitter/login

# Apple Sign In - opens login flow
https://YOUR_REPLIT_DOMAIN/api/auth/apple/login

# Replit OAuth - opens login flow
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

### "Unknown authentication strategy" Error
This means the passport strategy wasn't initialized. Check:
1. Server startup logs for strategy initialization
2. Ensure OAuth is properly configured in server/index.ts

### Post-Login Issues
If users can't access the app after login:
1. Check browser console for JavaScript errors
2. Verify the API response format matches frontend expectations
3. Clear browser cache and cookies

### Push Notifications Not Working
Check:
1. FCM/APNs credentials are real (not dummy)
2. Device tokens are valid and registered
3. Proper certificates are uploaded

---

## Architecture Notes

### Auth Routes
Auth routes are mounted at two paths for compatibility:
- `/api/auth/*` - Primary path for OAuth callbacks
- `/api/v1/auth/*` - API versioned path

### API Response Format
The `/api/food-items` endpoint returns paginated data:
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 100
  }
}
```

Frontend components extract the `data` array from this response.

---

## Recommended Setup Order

1. **Email/Password** - Already working, no setup needed
2. **Replit Auth** - Easiest OAuth option, uses built-in OIDC
3. **Google OAuth** - Most users have Google accounts
4. **GitHub OAuth** - Great for developer users
5. **Apple Sign In** - Required for iOS App Store
6. **Push Notifications** - After core auth is tested
7. **Stripe Webhooks** - When payment features are ready

---

*Last Updated: November 2025*
