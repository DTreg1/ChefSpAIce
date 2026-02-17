# Google Play Store Setup Guide

Complete guide to set up ChefSpAIce for Google Play Store submission.

---

## Part 1: Google Play Console Setup

### Step 1: Create Your App in Play Console

1. Go to [Google Play Console](https://play.google.com/console)
2. Click **Create app**
3. Fill in:
   - App name: `ChefSpAIce`
   - Default language: English
   - App or game: App
   - Free or paid: Free (or Paid if applicable)
4. Accept the declarations and click **Create app**

### Step 2: Complete Store Listing

Before you can upload your first build, complete these sections in Play Console:
- **Main store listing** (description, screenshots, graphics)
- **App content** (privacy policy, ads declaration, target audience)
- **Store settings** (app category, contact details)

---

## Part 2: Google Service Account (for Automated Submission)

This allows EAS to automatically submit builds to Play Store.

### Step 1: Create Service Account in Google Cloud

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select or create a project (use the same one linked to Play Console)
3. Go to **IAM & Admin > Service Accounts**
4. Click **Create Service Account**
5. Fill in:
   - Name: `EAS Submit`
   - Description: `Service account for Expo EAS automated submissions`
6. Click **Create and Continue**
7. Skip the role assignment (we'll do this in Play Console)
8. Click **Done**

### Step 2: Create and Download Key

1. Click on the service account you just created
2. Go to **Keys** tab
3. Click **Add Key > Create new key**
4. Select **JSON** and click **Create**
5. Save the downloaded JSON file securely

### Step 3: Link to Google Play Console

1. Go to [Google Play Console](https://play.google.com/console)
2. Go to **Setup > API access**
3. If prompted, link your Google Cloud project
4. Under **Service accounts**, find your new account
5. Click **Manage Play Console permissions**
6. Grant these permissions:
   - ✅ View app information and download bulk reports
   - ✅ Create, edit, and delete draft apps
   - ✅ Release apps to production, exclude devices, and use Play App Signing
   - ✅ Release to production, exclude devices, and use Play App Signing
   - ✅ Manage store presence
7. Click **Invite user** then **Send invite**

### Step 4: Upload to EAS

Run this command locally (not in Replit):

```bash
eas credentials --platform android
```

When prompted:
1. Select **production** build profile
2. Select **Google Service Account > Upload a Google Service Account Key**
3. Enter the path to your downloaded JSON key file

**OR** upload via web:
1. Go to [expo.dev](https://expo.dev)
2. Navigate to your project
3. Click **Credentials** in the sidebar
4. Under **Android**, click your app identifier
5. Under **Service Credentials**, click **Add a Google Service Account Key**
6. Upload your JSON file

---

## Part 3: First Manual Upload

**Important:** Google Play requires at least one manual upload before automated submissions work.

### Step 1: Build Production AAB

```bash
eas build --platform android --profile production
```

### Step 2: Download the AAB

1. Go to [expo.dev](https://expo.dev)
2. Navigate to your project's builds
3. Download the `.aab` file

### Step 3: Upload to Play Console

1. Go to [Google Play Console](https://play.google.com/console)
2. Select your app
3. Go to **Release > Production** (or Internal testing first)
4. Click **Create new release**
5. Upload your `.aab` file
6. Add release notes
7. Click **Review release** then **Start rollout**

---

## Part 4: Update eas.json for Android Submit

Your `eas.json` should include Android submit configuration:

```json
{
  "submit": {
    "production": {
      "ios": {
        "ascAppId": "6757112063",
        "appleTeamId": "25F734Y7T9"
      },
      "android": {
        "track": "internal",
        "releaseStatus": "draft"
      }
    }
  }
}
```

**Track options:**
- `internal` - Internal testing (up to 100 testers)
- `alpha` - Closed testing
- `beta` - Open testing
- `production` - Full release

**Release status options:**
- `draft` - Creates a draft release (recommended for review)
- `completed` - Immediately publishes

---

## Part 5: Automated Submission

Once everything is set up, submit with:

```bash
eas submit --platform android --profile production
```

Or build and submit together:

```bash
eas build --platform android --profile production --auto-submit
```

---

## Troubleshooting

### "No service account key" error
- Make sure you uploaded the JSON key to EAS via `eas credentials`
- Verify the service account has proper permissions in Play Console

### "Package name mismatch" error
- Verify `com.chefspaice.chefspaice.app` matches exactly in:
  - app.json
  - Play Console app
  - OAuth client configuration

---

## Checklist

- [ ] App created in Google Play Console
- [ ] Store listing completed (description, screenshots, graphics)
- [ ] App content declarations completed
- [ ] Google Service Account created
- [ ] Service account has Play Console permissions
- [ ] Service account JSON key uploaded to EAS
- [ ] First AAB manually uploaded to Play Console
- [ ] eas.json updated with Android submit configuration
