# ChefSpAIce Setup Guide - Fixing What's Not Working

This document provides step-by-step instructions with copyable prompts to fix all missing configurations in the ChefSpAIce application.

## Current Status Summary

| Feature | Status | Priority |
|---------|--------|----------|
| Database | ✅ Working | - |
| Health Check API | ✅ Working | - |
| Storage Tests (310) | ✅ Passing | - |
| Google OAuth | ❌ Not Configured | High |
| GitHub OAuth | ❌ Not Configured | High |
| Twitter/X OAuth | ❌ Not Configured | Medium |
| Apple OAuth | ❌ Not Configured | Medium |
| Replit OAuth | ❌ Not Configured | High |
| Email/Password Auth | ❌ Not Working | High |
| Push Notifications (FCM) | ⚠️ Dummy Credentials | Medium |
| Push Notifications (APNs) | ⚠️ Dummy Credentials | Medium |
| Stripe Webhooks | ⚠️ Missing Secret | Low |
| Twilio SMS | ❌ Not Configured | Low |

---

## Section 1: Authentication Setup (Priority: HIGH)

### 1.1 Google OAuth Setup

**What you need:**
- Google Cloud Console account
- OAuth 2.0 Client ID and Secret

**Steps:**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Navigate to "APIs & Services" → "Credentials"
4. Click "Create Credentials" → "OAuth client ID"
5. Select "Web application"
6. Add authorized redirect URI: `https://YOUR_REPLIT_DOMAIN/api/v1/auth/google/callback`
7. Copy the Client ID and Client Secret

**Prompt to add secrets:**
```
Add the following secrets to enable Google OAuth:
- GOOGLE_CLIENT_ID: [paste your client ID]
- GOOGLE_CLIENT_SECRET: [paste your client secret]
```

---

### 1.2 GitHub OAuth Setup

**What you need:**
- GitHub account
- OAuth App credentials

**Steps:**

1. Go to GitHub → Settings → Developer settings → OAuth Apps
2. Click "New OAuth App"
3. Fill in:
   - Application name: `ChefSpAIce`
   - Homepage URL: `https://YOUR_REPLIT_DOMAIN`
   - Authorization callback URL: `https://YOUR_REPLIT_DOMAIN/api/v1/auth/github/callback`
4. Click "Register application"
5. Copy Client ID and generate a new Client Secret

**Prompt to add secrets:**
```
Add the following secrets to enable GitHub OAuth:
- GITHUB_CLIENT_ID: [paste your client ID]
- GITHUB_CLIENT_SECRET: [paste your client secret]
```

---

### 1.3 Twitter/X OAuth Setup

**What you need:**
- Twitter Developer account (Elevated access recommended)
- OAuth 1.0a credentials

**Steps:**

1. Go to [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Create a new project/app or use existing
3. Navigate to "Keys and tokens"
4. Under "Consumer Keys", regenerate if needed
5. Set callback URL: `https://YOUR_REPLIT_DOMAIN/api/v1/auth/twitter/callback`

**Prompt to add secrets:**
```
Add the following secrets to enable Twitter/X OAuth:
- TWITTER_CONSUMER_KEY: [paste your API key]
- TWITTER_CONSUMER_SECRET: [paste your API secret]
```

---

### 1.4 Apple Sign In Setup

**What you need:**
- Apple Developer account ($99/year)
- Services ID and Private Key

**Steps:**

1. Go to [Apple Developer](https://developer.apple.com/)
2. Navigate to Certificates, Identifiers & Profiles
3. Create a Services ID:
   - Register a new identifier → Services IDs
   - Enable "Sign In with Apple"
   - Configure domains and return URLs: `https://YOUR_REPLIT_DOMAIN/api/v1/auth/apple/callback`
4. Create a Key:
   - Keys → Create a new key
   - Enable "Sign In with Apple"
   - Download the .p8 key file

**Prompt to add secrets:**
```
Add the following secrets to enable Apple Sign In:
- APPLE_CLIENT_ID: [your Services ID, e.g., com.yourcompany.chefpsaice]
- APPLE_TEAM_ID: [your 10-character Team ID]
- APPLE_KEY_ID: [your Key ID from the .p8 key]
- APPLE_CLIENT_SECRET: [contents of your .p8 private key file]
```

---

### 1.5 Replit OAuth Setup (Easiest Option!)

**What you need:**
- This is the simplest authentication option as Replit provides built-in OIDC support

**Steps:**

Replit Auth uses OpenID Connect and is already partially integrated. The application needs:

1. The `ISSUER_URL` (already set to `https://replit.com/oidc`)
2. The `REPL_ID` (automatically available in Replit environment)

**For Custom Replit OAuth App (Optional):**

1. Go to Replit → Your Profile → Developer Tools
2. Create an OAuth application
3. Set callback URL: `https://YOUR_REPLIT_DOMAIN/api/v1/auth/replit/callback`

**Prompt to add secrets:**
```
Add the following secrets to enable Replit OAuth:
- REPLIT_CLIENT_ID: [your Replit OAuth client ID]
- REPLIT_CLIENT_SECRET: [your Replit OAuth client secret]
```

**Alternative - Use Built-in Replit Auth:**
```
The application already has Replit Auth integration code. To enable it:
1. Make sure ISSUER_URL is set (default: https://replit.com/oidc)
2. Make sure REPL_ID is available (automatic in Replit)
3. The /api/login and /api/callback routes will handle authentication
```

---

### 1.6 Email/Password Authentication

**Current Issue:** The "local" passport strategy returns "Unknown authentication strategy"

**This requires:**
- Database connection (✅ Already configured)
- Email strategy initialization during server startup

**Prompt to fix:**
```
The email/password authentication is failing with "Unknown authentication strategy 'local'". 
Please check that:
1. configureEmailStrategy() is being called during server initialization
2. The passport "local" strategy is registered before the login route is hit
3. The initializeOAuthStrategies() function is called in the server startup sequence
```

---

## Section 2: Push Notifications (Priority: MEDIUM)

### 2.1 Firebase Cloud Messaging (FCM) Setup

**Current Status:** Using dummy credentials - push notifications will NOT work

**What you need:**
- Firebase project with Cloud Messaging enabled
- Service account JSON file

**Steps:**

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing
3. Navigate to Project Settings → Service Accounts
4. Click "Generate new private key"
5. Download the JSON file

**Prompt to add secrets:**
```
Add the following secrets to enable Firebase push notifications:
- FCM_SERVICE_ACCOUNT: [paste the entire JSON content of your service account file]
- FCM_SERVER_KEY: [your FCM server key from Cloud Messaging settings]
- FCM_PRIVATE_KEY: [the private_key field from your service account JSON]
```

---

### 2.2 Apple Push Notification Service (APNs) Setup

**Current Status:** Using dummy credentials - iOS push notifications will NOT work

**What you need:**
- Apple Developer account
- APNs Key (.p8 file)
- Bundle ID

**Steps:**

1. Go to Apple Developer → Certificates, Identifiers & Profiles
2. Create a new Key with "Apple Push Notifications service (APNs)" enabled
3. Download the .p8 key file
4. Note your Key ID and Team ID

**Prompt to add secrets:**
```
Add the following secrets to enable Apple push notifications:
- APNS_KEY_ID: [your 10-character Key ID]
- APNS_TEAM_ID: [your 10-character Team ID]
- APNS_BUNDLE_ID: [your app's Bundle ID, e.g., com.yourcompany.chefpsaice]
- APNS_KEY_CONTENT: [contents of your .p8 private key file]
```

---

## Section 3: Payment & Webhooks (Priority: LOW)

### 3.1 Stripe Webhooks Setup

**Current Status:** Stripe API keys are configured, but webhook secret is missing

**What you need:**
- Stripe account with webhook endpoint configured

**Steps:**

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/) → Developers → Webhooks
2. Click "Add endpoint"
3. Set endpoint URL: `https://YOUR_REPLIT_DOMAIN/api/v1/webhooks/stripe`
4. Select events to listen to (at minimum: `checkout.session.completed`, `payment_intent.succeeded`)
5. Copy the Signing Secret

**Prompt to add secrets:**
```
Add the following secret to enable Stripe webhooks:
- STRIPE_WEBHOOK_SECRET: [your webhook signing secret starting with whsec_]
```

---

## Section 4: SMS Notifications (Priority: LOW)

### 4.1 Twilio Setup

**Current Status:** Not configured

**What you need:**
- Twilio account
- Phone number for sending SMS

**Steps:**

1. Go to [Twilio Console](https://www.twilio.com/console)
2. Get your Account SID and Auth Token from the dashboard
3. Purchase a phone number for sending SMS

**Prompt to add secrets:**
```
Add the following secrets to enable Twilio SMS:
- TWILIO_ACCOUNT_SID: [your Account SID]
- TWILIO_AUTH_TOKEN: [your Auth Token]
- TWILIO_PHONE_NUMBER: [your Twilio phone number, e.g., +15551234567]
```

---

## Quick Reference: All Required Secrets

### High Priority (Authentication)
```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
REPLIT_CLIENT_ID=
REPLIT_CLIENT_SECRET=
```

### Medium Priority (Push Notifications)
```
TWITTER_CONSUMER_KEY=
TWITTER_CONSUMER_SECRET=
APPLE_CLIENT_ID=
APPLE_TEAM_ID=
APPLE_KEY_ID=
APPLE_CLIENT_SECRET=
FCM_SERVICE_ACCOUNT=
FCM_SERVER_KEY=
FCM_PRIVATE_KEY=
APNS_KEY_ID=
APNS_TEAM_ID=
APNS_BUNDLE_ID=
APNS_KEY_CONTENT=
```

### Low Priority (Payments & SMS)
```
STRIPE_WEBHOOK_SECRET=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
```

---

## Testing After Configuration

After adding secrets, use these prompts to verify each service:

### Test Google OAuth
```
Test the Google OAuth login flow by navigating to /api/v1/auth/google/login
```

### Test GitHub OAuth
```
Test the GitHub OAuth login flow by navigating to /api/v1/auth/github/login
```

### Test Email Authentication
```
Test email registration by POSTing to /api/v1/auth/email/register with:
{
  "email": "test@example.com",
  "password": "securepassword123",
  "firstName": "Test",
  "lastName": "User"
}
```

### Verify Configuration Status
```
Check the OAuth configuration status by calling:
curl https://YOUR_REPLIT_DOMAIN/api/v1/auth/config-status
```

---

## Troubleshooting

### "Unknown authentication strategy" Error
This means the passport strategy wasn't initialized. Check:
1. Server startup logs for strategy initialization
2. Ensure `initializeOAuthStrategies()` is called before routes are registered

### OAuth Callback Errors
Common causes:
1. Callback URL mismatch - must exactly match what's registered with the provider
2. Missing or invalid secrets
3. HTTPS required for production OAuth

### Push Notifications Not Working
Check:
1. FCM/APNs credentials are real (not dummy)
2. Device tokens are valid
3. Proper certificates are uploaded

---

## Next Steps

1. **Start with Replit Auth** - It's the easiest to configure
2. **Add Google OAuth** - Most users have Google accounts
3. **Add Email/Password** - For users without social accounts
4. **Configure push notifications** - After authentication is working
5. **Add Stripe webhooks** - When payment features are tested

---

*Last Updated: November 2024*
