# Push Notifications Setup Guide

This guide will walk you through setting up push notifications for both Android (Firebase) and iOS (Apple) platforms.

## Prerequisites

- **For Android**: Google account for Firebase Console access
- **For iOS**: Apple Developer Program membership ($99/year)

## Part 1: Firebase Setup (Android)

### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Create a project"** (or use an existing one)
3. Enter project name: **ChefSpAIce** (or your app name)
4. Enable/disable Google Analytics as desired
5. Click **"Create Project"**

### Step 2: Add Android App to Firebase

1. In Firebase Console, click the **Android icon** to add an Android app
2. Register your app with these details:
   - **Android package name**: `com.chefspaice.app`
   - **App nickname**: ChefSpAIce (optional)
   - **Debug signing certificate**: Leave blank for now
3. Click **"Register app"**
4. Download `google-services.json` and save it for later
5. Skip the remaining SDK setup steps (already implemented)

### Step 3: Get Service Account Credentials

1. In Firebase Console, click the **gear icon** → **Project Settings**
2. Go to **Service accounts** tab
3. Click **"Generate new private key"**
4. Download the JSON file (keep this secure - it provides admin access)
5. You'll see a JSON file that looks like this:
   ```json
   {
     "type": "service_account",
     "project_id": "your-project-id",
     "private_key_id": "...",
     "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
     "client_email": "...",
     "client_id": "...",
     "auth_uri": "...",
     "token_uri": "...",
     "auth_provider_x509_cert_url": "...",
     "client_x509_cert_url": "..."
   }
   ```

### Step 4: Configure Firebase Environment Variables

Add one of these to your `.env` file:

**Option A: Direct JSON (Recommended for Replit)**

```bash
# Copy the entire JSON content as a single-line string
FCM_SERVICE_ACCOUNT='{"type":"service_account","project_id":"your-project",...}'
```

**Option B: File Path**

```bash
# Save the JSON file and reference its path
FCM_SERVICE_ACCOUNT_PATH=/path/to/firebase-serviceAccount.json
```

## Part 2: Apple Push Notifications Setup (iOS)

### Step 1: Apple Developer Account Setup

1. Sign up for [Apple Developer Program](https://developer.apple.com/programs/) ($99/year)
2. Wait for account activation (usually instant, can take up to 48 hours)
3. Sign in to [Apple Developer Portal](https://developer.apple.com/)

### Step 2: Create App ID with Push Capability

1. In Apple Developer Portal, go to **Certificates, Identifiers & Profiles**
2. Click **Identifiers** → **"+"** button
3. Select **App IDs** → **App** → **Continue**
4. Configure your App ID:
   - **Description**: ChefSpAIce
   - **Bundle ID**: Select "Explicit"
   - **Enter Bundle ID**: `com.chefspaice.app`
5. Scroll down to **Capabilities** and check:
   - ✅ **Push Notifications**
6. Click **Continue** → **Register**

### Step 3: Create APNs Authentication Key

⚠️ **Important**: You can only download the key file once!

1. In Developer Portal, go to **Keys** section
2. Click **"+"** button to create a new key
3. Enter key details:
   - **Key Name**: ChefSpAIce Push Key
   - Check ✅ **Apple Push Notifications service (APNs)**
4. Click **Continue** → **Register**
5. **Download the .p8 file immediately** (you cannot re-download it!)
6. Note down these values:
   - **Key ID**: Shown on download page (10 characters, e.g., ABC123DEFG)
   - **Team ID**: Found in Membership section (10 characters, e.g., 123ABC456D)

### Step 4: Configure Apple Environment Variables

**Option A: Base64 Encoded Key (Recommended for Replit)**

1. Convert your .p8 file to base64:

   ```bash
   # On Mac/Linux:
   base64 -i AuthKey_ABC123DEFG.p8 > key_base64.txt

   # On Windows (PowerShell):
   [Convert]::ToBase64String([System.IO.File]::ReadAllBytes("AuthKey_ABC123DEFG.p8")) | Out-File key_base64.txt
   ```

2. Add to `.env`:
   ```bash
   APNS_KEY_ID=ABC123DEFG           # Your 10-character Key ID
   APNS_TEAM_ID=123ABC456D          # Your 10-character Team ID
   APNS_KEY_CONTENT=LS0tLS1CRUdJTi... # Content from key_base64.txt
   APNS_BUNDLE_ID=com.chefspaice.app
   APNS_PRODUCTION=false            # Use 'true' for production
   ```

**Option B: File Path**

```bash
APNS_KEY_ID=ABC123DEFG
APNS_TEAM_ID=123ABC456D
APNS_KEY_FILE=/path/to/AuthKey_ABC123DEFG.p8
APNS_BUNDLE_ID=com.chefspaice.app
APNS_PRODUCTION=false
```

## Part 3: Adding Credentials to Replit

### Using Replit Secrets

1. In your Replit project, click the **🔒 Secrets** tab (padlock icon)
2. Add each environment variable:
   - Click **"New Secret"**
   - Enter the key name (e.g., `FCM_SERVICE_ACCOUNT`)
   - Paste the value
   - Click **"Add Secret"**

### Required Secrets

For Android:

- `FCM_SERVICE_ACCOUNT` - The entire JSON content as a string

For iOS:

- `APNS_KEY_ID` - Your 10-character Key ID
- `APNS_TEAM_ID` - Your 10-character Team ID
- `APNS_KEY_CONTENT` - Base64 encoded .p8 file content
- `APNS_BUNDLE_ID` - Your app bundle ID
- `APNS_PRODUCTION` - "true" or "false"

## Part 4: Verification

### Check Server Logs

After adding credentials, restart your application and check the server logs for:

✅ Success Messages:

- `✅ FCM initialized with service account from environment`
- `✅ APNs initialized successfully with P8 key`

⚠️ Warning Messages:

- `⚠️ FCM credentials not configured`
- `⚠️ APNs credentials not configured`

### Testing Push Notifications

#### Android Testing

1. Build for Android: `npm run build && npx cap sync android`
2. Open in Android Studio: `npx cap open android`
3. Run on real device (not emulator)
4. Grant notification permissions when prompted
5. Check server logs for successful token registration

#### iOS Testing

1. Build for iOS: `npm run build && npx cap sync ios`
2. Open in Xcode: `npx cap open ios`
3. Ensure Push Notifications capability is enabled in Xcode
4. Run on real device (not simulator)
5. Grant notification permissions when prompted
6. Check server logs for successful token registration

## Part 5: Troubleshooting

### Common Firebase Issues

**"Invalid service account"**

- Ensure you copied the entire JSON correctly
- Check for line breaks or formatting issues
- Verify it's from the correct Firebase project

**"Permission denied"**

- Ensure Firebase Cloud Messaging API is enabled in Google Cloud Console
- Check service account has necessary permissions

### Common Apple Issues

**"Invalid token"**

- Verify Key ID and Team ID are correct
- Ensure using correct environment (development vs production)
- Check .p8 file was properly encoded to base64

**"Missing authentication"**

- Verify all required environment variables are set
- Check for typos in variable names
- Ensure secrets are accessible to your application

### Debug Checklist

- [ ] Environment variables are set correctly
- [ ] Using real devices for testing (not simulators/emulators)
- [ ] App has requested and received notification permissions
- [ ] Push notification tokens are being sent to server
- [ ] Server logs show successful initialization
- [ ] No error messages in server logs
- [ ] Correct bundle ID matches between app and credentials

## Security Best Practices

1. **Never commit credentials to Git**

   - Use environment variables or secret management
   - Add credential files to `.gitignore`

2. **Rotate keys regularly**

   - Apple keys don't expire, but rotate for security
   - Firebase credentials should be rotated periodically

3. **Use different credentials for environments**

   - Separate development and production credentials
   - Use `APNS_PRODUCTION=false` for development

4. **Limit access**
   - Only share credentials with team members who need them
   - Use read-only credentials where possible

## Next Steps

Once credentials are configured:

1. Test sending a notification from your backend
2. Implement notification handlers for different types
3. Set up notification categories and actions
4. Configure notification scheduling
5. Add analytics tracking for notification engagement

## Resources

- [Firebase Cloud Messaging Documentation](https://firebase.google.com/docs/cloud-messaging)
- [Apple Push Notification Service Documentation](https://developer.apple.com/documentation/usernotifications)
- [Capacitor Push Notifications Plugin](https://capacitorjs.com/docs/apis/push-notifications)
- [Firebase Console](https://console.firebase.google.com/)
- [Apple Developer Portal](https://developer.apple.com/)

## Need Help?

If you encounter issues:

1. Check server logs for specific error messages
2. Verify all steps were followed correctly
3. Ensure you're testing on real devices
4. Check that all environment variables are set
5. Review the troubleshooting section above
