# ChefSpAIce iOS App - Complete Build Guide

This guide walks you through every step needed to build, test, and publish the ChefSpAIce iOS app to the App Store.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Initial Setup on Mac](#2-initial-setup-on-mac)
3. [Apple Developer Account Setup](#3-apple-developer-account-setup)
4. [Xcode Project Configuration](#4-xcode-project-configuration)
5. [Code Signing & Capabilities](#5-code-signing--capabilities)
6. [Push Notification Setup](#6-push-notification-setup)
7. [App Icons & Launch Screen](#7-app-icons--launch-screen)
8. [Building for Development](#8-building-for-development)
9. [Testing on Simulator](#9-testing-on-simulator)
10. [Testing on Physical Device](#10-testing-on-physical-device)
11. [Building for App Store](#11-building-for-app-store)
12. [App Store Connect Setup](#12-app-store-connect-setup)
13. [Submitting for Review](#13-submitting-for-review)
14. [Post-Submission](#14-post-submission)
15. [Troubleshooting](#15-troubleshooting)

---

## 1. Prerequisites

### Required Hardware
- Mac computer running macOS Ventura (13.0) or later
- At least 20GB free disk space
- Stable internet connection

### Required Software
- **Xcode 15.0 or later** - Download from Mac App Store
- **CocoaPods** - Ruby gem for dependency management
- **Node.js 18+** - For Capacitor CLI

### Required Accounts
- **Apple ID** - Free to create at appleid.apple.com
- **Apple Developer Program** - $99/year at developer.apple.com/programs

### Install CocoaPods (if not installed)
Open Terminal and run:
```bash
sudo gem install cocoapods
```

If you get permission errors, try:
```bash
brew install cocoapods
```

---

## 2. Initial Setup on Mac

### Step 2.1: Clone or Download the Project
If you haven't already, get the project on your Mac:
```bash
git clone <your-replit-git-url>
cd <project-folder>
```

Or download as ZIP from Replit and extract it.

### Step 2.2: Install Node Dependencies
```bash
npm install
```

### Step 2.3: Build the Web App
```bash
npm run build
```

This creates the `dist/public` folder that Capacitor bundles into the iOS app.

### Step 2.4: Sync Capacitor
```bash
npx cap sync ios
```

This copies web assets and updates native dependencies.

### Step 2.5: Install CocoaPods Dependencies
```bash
cd ios/App
pod install
cd ../..
```

**Important:** Always use `pod install`, not `pod update`, unless you specifically want to update dependencies.

### Step 2.6: Open in Xcode
```bash
npx cap open ios
```

Or manually open: `ios/App/App.xcworkspace`

**Critical:** Always open the `.xcworkspace` file, NOT the `.xcodeproj` file. The workspace includes CocoaPods dependencies.

---

## 3. Apple Developer Account Setup

### Step 3.1: Enroll in Apple Developer Program
1. Go to https://developer.apple.com/programs
2. Click "Enroll"
3. Sign in with your Apple ID
4. Follow enrollment steps (requires $99/year payment)
5. Wait for approval (usually 24-48 hours)

### Step 3.2: Accept Agreements
1. Go to https://developer.apple.com/account
2. Click "Agreements, Tax, and Banking"
3. Accept the latest Apple Developer Agreement
4. Complete tax forms if required

### Step 3.3: Create App ID
1. Go to https://developer.apple.com/account/resources/identifiers
2. Click the "+" button
3. Select "App IDs" → Continue
4. Select "App" → Continue
5. Fill in:
   - **Description:** ChefSpAIce
   - **Bundle ID:** Select "Explicit" and enter `com.chefspaice.app`
6. Under "Capabilities", enable:
   - [x] Push Notifications
   - [x] Associated Domains (if using universal links)
7. Click "Continue" → "Register"

---

## 4. Xcode Project Configuration

### Step 4.1: Select Your Team
1. In Xcode, click on "App" in the Project Navigator (left sidebar)
2. Select the "App" target
3. Go to "Signing & Capabilities" tab
4. Check "Automatically manage signing"
5. Select your Team from the dropdown
6. Xcode will automatically create provisioning profiles

### Step 4.2: Verify Bundle Identifier
1. In the same screen, verify Bundle Identifier is: `com.chefspaice.app`
2. This must match what you registered in the Developer Portal

### Step 4.3: Set Version and Build Numbers
1. Go to the "General" tab
2. Set **Version** (e.g., `1.0.0`) - This is what users see
3. Set **Build** (e.g., `1`) - Increment for each upload to App Store

### Step 4.4: Set Deployment Target
1. Still in "General" tab
2. Set **Minimum Deployments** → iOS 14.0 or your preferred minimum

### Step 4.5: Configure App Display Name
1. In "General" tab, find "Display Name"
2. Set to: `ChefSpAIce`

---

## 5. Code Signing & Capabilities

### Step 5.1: Add Push Notification Capability
1. Select the "App" target
2. Go to "Signing & Capabilities" tab
3. Click "+ Capability"
4. Search for and add "Push Notifications"
5. Xcode will update the entitlements file

### Step 5.2: Add Background Modes (for push)
1. Click "+ Capability"
2. Add "Background Modes"
3. Check:
   - [x] Remote notifications
   - [x] Background fetch

### Step 5.3: Add Associated Domains (Optional - for Universal Links)
If you want deep links from your website to open the app:
1. Click "+ Capability"
2. Add "Associated Domains"
3. Add domains:
   - `applinks:app.chefspaice.com`
   - `webcredentials:app.chefspaice.com`

**Note:** You'll also need to host an `apple-app-site-association` file on your web server.

### Step 5.4: Verify Entitlements
Check that `App/App.entitlements` contains:
```xml
<key>aps-environment</key>
<string>development</string>
```

**For App Store builds:** Change `development` to `production` before submitting.

---

## 6. Push Notification Setup

### Step 6.1: Create APNs Key
1. Go to https://developer.apple.com/account/resources/authkeys
2. Click "+" to create a new key
3. Name it: `ChefSpAIce Push Key`
4. Check: [x] Apple Push Notifications service (APNs)
5. Click "Continue" → "Register"
6. **Download the .p8 file** (you can only download once!)
7. Note down the **Key ID** (10-character string)

### Step 6.2: Get Your Team ID
1. Go to https://developer.apple.com/account
2. Look for "Membership Details"
3. Note your **Team ID** (10-character string)

### Step 6.3: Save Key Information
You'll need these for your server:
- **Key ID:** (from step 6.1)
- **Team ID:** (from step 6.2)
- **Bundle ID:** `com.chefspaice.app`
- **.p8 file:** Keep this secure!

### Step 6.4: Configure Your Server
Add these to your server's environment variables:
```
APNS_KEY_ID=<your-key-id>
APNS_TEAM_ID=<your-team-id>
APNS_BUNDLE_ID=com.chefspaice.app
APNS_KEY_PATH=/path/to/AuthKey_XXXXXX.p8
```

---

## 7. App Icons & Launch Screen

### Step 7.1: Prepare App Icons
You need a 1024x1024 PNG image (no transparency, no rounded corners).

#### Option A: Use Capacitor Assets (Recommended)
1. Place your 1024x1024 icon at: `resources/icon.png`
2. Run:
```bash
npm install @capacitor/assets
npx capacitor-assets generate --ios
```

#### Option B: Manual Setup
1. Open `App/Assets.xcassets/AppIcon.appiconset`
2. Replace `AppIcon-512@2x.png` with your 1024x1024 icon
3. Make sure `Contents.json` references it correctly

### Step 7.2: Prepare Launch Screen
1. Create a 2732x2732 PNG splash image
2. Place at: `resources/splash.png`
3. Run:
```bash
npx capacitor-assets generate --ios
```

Or manually update images in `App/Assets.xcassets/Splash.imageset/`

### Step 7.3: Customize Launch Screen (Optional)
Edit `App/Base.lproj/LaunchScreen.storyboard` in Xcode to:
- Change background color
- Add logo positioning
- Adjust layout

---

## 8. Building for Development

### Step 8.1: Select Build Scheme
1. In Xcode, click the scheme dropdown (next to the play button)
2. Select "App"
3. Select your target device/simulator

### Step 8.2: Build the App
1. Press `Cmd + B` or Product → Build
2. Wait for build to complete
3. Check for any errors in the Issue Navigator

### Step 8.3: Fix Common Build Errors

**"No signing certificate"**
- Go to Signing & Capabilities
- Check "Automatically manage signing"
- Select your Team

**"Pod not found"**
```bash
cd ios/App
pod install
```

**"Capacitor module not found"**
```bash
npx cap sync ios
cd ios/App
pod install
```

---

## 9. Testing on Simulator

### Step 9.1: Select Simulator
1. Click the device dropdown next to the scheme
2. Choose a simulator (e.g., "iPhone 15 Pro")

### Step 9.2: Run the App
1. Press `Cmd + R` or click the Play button
2. Wait for simulator to launch and app to install

### Step 9.3: Test Features
- [ ] App launches without crashing
- [ ] All screens load correctly
- [ ] Navigation works
- [ ] Forms submit properly
- [ ] Images load
- [ ] API calls succeed

### Step 9.4: Test in Safari Web Inspector
1. In Simulator, open the app
2. On Mac, open Safari
3. Safari → Develop → Simulator → App
4. Debug JavaScript, network requests, etc.

**Note:** Push notifications don't work in Simulator. Use a physical device.

---

## 10. Testing on Physical Device

### Step 10.1: Connect Your iPhone
1. Connect iPhone to Mac via USB cable
2. Trust the computer on your iPhone if prompted
3. Unlock your iPhone

### Step 10.2: Select Device in Xcode
1. Click the device dropdown
2. Select your iPhone (should appear under "Devices")

### Step 10.3: First-Time Device Setup
If you see "Device not registered":
1. Xcode will offer to register it
2. Click "Register Device"
3. Xcode updates your provisioning profile

### Step 10.4: Build and Run
1. Press `Cmd + R`
2. On iPhone, you may see "Untrusted Developer"
3. Go to Settings → General → VPN & Device Management
4. Trust your developer certificate
5. Run the app again

### Step 10.5: Test Push Notifications
1. Grant notification permission when prompted
2. Send a test push from your server
3. Verify notification appears
4. Tap notification and verify deep linking

### Step 10.6: Test All Features
- [ ] Camera/barcode scanning
- [ ] Photo library access
- [ ] Push notifications
- [ ] Deep links
- [ ] Share functionality
- [ ] Location services (if used)
- [ ] All app features work correctly

---

## 11. Building for App Store

### Step 11.1: Update for Production

#### Change APNs Environment
Edit `App/App.entitlements`:
```xml
<key>aps-environment</key>
<string>production</string>
```

#### Update Version Numbers
1. Go to General tab
2. Increment Version (e.g., 1.0.0 → 1.0.1)
3. Set Build number (must be unique per version)

### Step 11.2: Select Generic Device
1. Click device dropdown
2. Select "Any iOS Device (arm64)"

### Step 11.3: Create Archive
1. Product → Archive (or `Cmd + Shift + Archive`)
2. Wait for archive to complete (may take several minutes)
3. Organizer window opens automatically

### Step 11.4: Validate Archive
1. In Organizer, select your archive
2. Click "Validate App"
3. Follow prompts (usually accept defaults)
4. Fix any validation errors

### Step 11.5: Distribute to App Store
1. Click "Distribute App"
2. Select "App Store Connect"
3. Click "Upload"
4. Wait for upload to complete

---

## 12. App Store Connect Setup

### Step 12.1: Create App in App Store Connect
1. Go to https://appstoreconnect.apple.com
2. Click "My Apps"
3. Click "+" → "New App"
4. Fill in:
   - **Platform:** iOS
   - **Name:** ChefSpAIce
   - **Primary Language:** English (US)
   - **Bundle ID:** com.chefspaice.app
   - **SKU:** chefspaice-ios-001 (any unique string)
   - **User Access:** Full Access

### Step 12.2: Add App Information
Under "App Information":
- **Subtitle:** Smart Kitchen Assistant (30 chars max)
- **Category:** Food & Drink
- **Secondary Category:** Lifestyle (optional)
- **Content Rights:** Indicate if it contains third-party content
- **Age Rating:** Complete the questionnaire

### Step 12.3: Add Privacy Policy
1. Host your privacy policy at a public URL
2. Under "App Privacy" → "Privacy Policy"
3. Enter the URL

### Step 12.4: Complete App Privacy
1. Go to "App Privacy"
2. Click "Get Started"
3. Answer questions about data collection:
   - Do you collect data? (Yes - for account, usage, etc.)
   - What data types?
   - How is it used?
   - Is it linked to identity?

### Step 12.5: Prepare Screenshots
You need screenshots for each device size:

**iPhone 6.7" Display** (iPhone 15 Pro Max)
- 1290 x 2796 pixels
- Minimum 3, maximum 10 screenshots

**iPhone 6.5" Display** (iPhone 14 Plus)
- 1284 x 2778 pixels
- Minimum 3, maximum 10 screenshots

**iPhone 5.5" Display** (iPhone 8 Plus)
- 1242 x 2208 pixels
- Optional but recommended

**iPad Pro 12.9"** (if you support iPad)
- 2048 x 2732 pixels

#### Tips for Screenshots:
- Use Simulator to capture: `Cmd + S`
- Show key features of your app
- Add marketing text overlays using Figma, Canva, etc.
- Keep consistent visual style

### Step 12.6: Write App Description
**Description** (4000 chars max):
```
ChefSpAIce is your intelligent kitchen companion that helps you manage your food inventory, discover personalized recipes, and reduce food waste.

KEY FEATURES:

SMART INVENTORY MANAGEMENT
• Track all your food items with expiration dates
• Organize by storage location (fridge, freezer, pantry)
• Get alerts before food expires
• Scan barcodes for quick item entry

AI-POWERED RECIPES
• Get recipe suggestions based on what you have
• Personalized recommendations matching your preferences
• Step-by-step cooking instructions
• Nutrition information for every recipe

MEAL PLANNING
• Plan your meals for the week
• Automatic shopping list generation
• Track your nutrition goals
• Save favorite meals for quick access

REDUCE FOOD WASTE
• Know exactly what's in your kitchen
• Use ingredients before they expire
• Save money and help the environment

Download ChefSpAIce today and transform your kitchen experience!
```

**Keywords** (100 chars max):
```
recipes,cooking,meal planning,food inventory,kitchen,grocery,nutrition,meal prep,food waste,AI
```

**Promotional Text** (170 chars, can update without review):
```
New: AI-powered recipe suggestions! Discover delicious meals based on ingredients you already have. Reduce waste and eat better.
```

### Step 12.7: Add App Preview Video (Optional)
- 15-30 seconds
- Screen recording of app in use
- Can add voiceover or music
- Must be captured from actual device/simulator

---

## 13. Submitting for Review

### Step 13.1: Select Build
1. In App Store Connect, go to your app
2. Under "iOS App" → "Build"
3. Click "+" and select your uploaded build
4. Wait for build processing (can take 15-30 minutes)

### Step 13.2: Complete Version Information
**What's New in This Version:**
```
Initial release of ChefSpAIce!

• Smart food inventory tracking
• AI-powered recipe suggestions
• Meal planning and shopping lists
• Barcode scanning for quick entry
• Push notification reminders
```

### Step 13.3: App Review Information
**Contact Information:**
- First Name: [Your name]
- Last Name: [Your name]
- Phone: [Your phone]
- Email: [Your email]

**Demo Account** (if app requires login):
- Username: demo@chefspaice.com
- Password: DemoPassword123!

**Notes for Review:**
```
Thank you for reviewing ChefSpAIce!

To test all features:
1. Create an account or use the demo credentials above
2. Add items to your inventory using "Add Item" or scan a barcode
3. Ask the AI assistant for recipe suggestions
4. Create a meal plan for the week

Push notifications are used to:
- Alert users when food is about to expire
- Remind about meal plan items

Camera is used for:
- Scanning barcodes to add items

Please let us know if you have any questions.
```

### Step 13.4: Submit for Review
1. Click "Add for Review"
2. Review all information
3. Click "Submit to App Review"

### Step 13.5: Wait for Review
- **Typical review time:** 24-48 hours
- You'll receive email updates
- Check App Store Connect for status

---

## 14. Post-Submission

### Step 14.1: Handle Review Feedback
If your app is rejected:
1. Read the rejection reason carefully
2. Make required changes
3. Submit a new build
4. Reply in Resolution Center if needed

**Common rejection reasons:**
- Crashes or bugs
- Incomplete features
- Missing privacy information
- Guideline violations
- Placeholder content

### Step 14.2: Prepare for Launch
Once approved:
1. Choose release option:
   - **Manual:** You control when it goes live
   - **Automatic:** Goes live immediately after approval
   - **Scheduled:** Goes live at specific date/time

### Step 14.3: Monitor After Launch
- Check crash reports in Xcode Organizer
- Monitor App Store Connect analytics
- Respond to user reviews
- Track performance metrics

### Step 14.4: Plan Updates
- Fix bugs promptly
- Add new features
- Respond to user feedback
- Keep dependencies updated

---

## 15. Troubleshooting

### Build Errors

**"Module 'Capacitor' not found"**
```bash
cd ios/App
pod deintegrate
pod install
```

**"Code signing error"**
1. Xcode → Preferences → Accounts
2. Click "+" to add Apple ID
3. Download Manual Profiles if needed

**"Provisioning profile doesn't include capability"**
1. Go to developer.apple.com
2. Edit your App ID to include the capability
3. Regenerate provisioning profiles in Xcode

### Runtime Errors

**App crashes on launch**
1. Check Xcode console for error messages
2. Look for missing capabilities
3. Verify Info.plist keys

**Push notifications not working**
1. Verify APNs key is configured on server
2. Check device token is being sent to server
3. Ensure entitlements has correct environment
4. Test on physical device (not simulator)

**Web content not loading**
1. Check App Transport Security settings
2. Verify server is using HTTPS
3. Check network connectivity

### App Store Rejections

**Crashes**
- Test thoroughly on multiple devices
- Check crash logs in Organizer

**Incomplete information**
- Ensure all metadata is filled
- Provide demo account if needed

**Guideline 4.2 - Minimum functionality**
- App must provide significant value
- Not just a web wrapper

---

## Quick Reference Commands

```bash
# Install dependencies
npm install
cd ios/App && pod install && cd ../..

# Build web app and sync
npm run build
npx cap sync ios

# Open in Xcode
npx cap open ios

# Update after web changes
npm run build
npx cap copy ios

# Full resync (after adding plugins)
npx cap sync ios
cd ios/App && pod install

# Generate app icons and splash screens
npm install @capacitor/assets
npx capacitor-assets generate --ios

# Clean build (if having issues)
# In Xcode: Product → Clean Build Folder (Cmd + Shift + K)
```

---

## File Structure Reference

```
ios/
├── App/
│   ├── App/
│   │   ├── AppDelegate.swift      # App lifecycle + push notifications
│   │   ├── MyViewController.swift # Custom bridge controller
│   │   ├── Info.plist             # App configuration
│   │   ├── App.entitlements       # Capabilities (push, etc.)
│   │   ├── Assets.xcassets/       # Icons and images
│   │   │   ├── AppIcon.appiconset/
│   │   │   └── Splash.imageset/
│   │   ├── Base.lproj/
│   │   │   ├── LaunchScreen.storyboard
│   │   │   └── Main.storyboard
│   │   ├── public/                # Web assets (generated)
│   │   └── capacitor.config.json  # Capacitor config (generated)
│   ├── App.xcodeproj/             # Xcode project
│   ├── App.xcworkspace/           # Xcode workspace (open this!)
│   └── Podfile                    # CocoaPods dependencies
└── IOS_BUILD_GUIDE.md             # This file
```

---

## Support

If you encounter issues not covered here:

1. **Capacitor Docs:** https://capacitorjs.com/docs/ios
2. **Apple Developer Docs:** https://developer.apple.com/documentation
3. **Stack Overflow:** Search with `[capacitor] [ios]` tags
4. **Capacitor Discord:** https://ionic.link/discord

---

*Last Updated: December 2025*
*ChefSpAIce iOS App Version: 1.0.0*
