# iOS In-App Purchase Testing Guide

## Prerequisites
- Xcode installed on your Mac
- Apple Developer account
- App Store Connect access

---

## Part 1: Set Up Sandbox Tester Account

### Step 1: Create Sandbox Tester in App Store Connect
1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Click **Users and Access** in the top menu
3. Click **Sandbox** tab on the left sidebar
4. Click the **+** button to add a new tester
5. Fill in the form:
   - First Name: `Test`
   - Last Name: `User`
   - Email: Use a unique email (can be fake, e.g., `testuser+sandbox@yourdomain.com`)
   - Password: Create a strong password
   - Country: United States (or your app's primary market)
6. Click **Invite**

> **Important:** Save these credentials - you'll need them for testing!

---

## Part 2: Configure Your iPhone/iPad for Sandbox Testing

### Step 2: Sign Out of Production App Store
1. Open **Settings** on your iOS device
2. Tap your **Apple ID** at the top
3. Scroll down and tap **Sign Out**
4. Or go to **Settings → App Store** and sign out there

### Step 3: Add Sandbox Account
1. Go to **Settings → App Store**
2. Scroll to **Sandbox Account** section
3. Tap **Add Sandbox Account**
4. Enter the sandbox tester email and password you created

---

## Part 3: Build and Run App from Xcode

### Step 4: Open Project in Xcode
```bash
# In your project directory, run:
cd ios
open ChefSpAIce.xcworkspace
```

If you don't have the iOS folder built yet:
```bash
# Generate iOS build
npx expo prebuild --platform ios
cd ios
open ChefSpAIce.xcworkspace
```

### Step 5: Select Your Device
1. In Xcode, click the device dropdown (next to the Play button)
2. Select your connected iPhone/iPad
3. If using simulator, select an iOS Simulator

### Step 6: Configure Signing
1. Click on your project name in the left sidebar
2. Select your app target
3. Go to **Signing & Capabilities** tab
4. Check **Automatically manage signing**
5. Select your **Team** (your Apple Developer account)

### Step 7: Build and Run
1. Click the **Play** button (▶) or press `Cmd + R`
2. Wait for the build to complete
3. App will launch on your device

---

## Part 4: Test the Purchase Flow

### Test 1: Fresh Install - Purchase Without Account
1. Delete the app from your device first
2. Build and run from Xcode
3. **Expected:** App opens to Subscription screen (NOT login)
4. **Verify:** You see "No account required!" text
5. Select **Pro** tier and **Annual** billing
6. Tap **Subscribe**
7. Complete purchase with sandbox credentials
8. **Expected:** Success alert with "Start Using App" option
9. Tap "Start Using App"
10. **Expected:** You're in the main app without creating an account

### Test 2: Sign In Option
1. On Subscription screen, scroll down
2. Find "Already have an account?" section
3. Tap **Sign In**
4. **Expected:** Navigates to Auth screen

### Test 3: Restore Purchases
1. Delete and reinstall the app
2. On Subscription screen, tap **Restore Purchases**
3. **Expected:** Your sandbox purchase is restored

---

## Part 5: Simulator Testing with StoreKit Configuration (Optional)

If you want to test purchases in the Simulator without a real device:

### Step 8: Create StoreKit Configuration File
1. In Xcode, go to **File → New → File**
2. Search for "StoreKit Configuration File"
3. Name it `Products.storekit`
4. Click **Create**

### Step 9: Add Products
1. Open `Products.storekit`
2. Click **+** at bottom left
3. Select **Add Auto-Renewable Subscription**
4. Configure:
   - Reference Name: `Pro Monthly`
   - Product ID: `pro_monthly` (must match RevenueCat)
   - Price: $9.99
5. Repeat for other products:
   - `pro_annual` - $99.90
   - `basic_monthly` - $4.99
   - `basic_annual` - $49.90

### Step 10: Enable StoreKit Testing
1. In Xcode, go to **Product → Scheme → Edit Scheme**
2. Select **Run** in left sidebar
3. Go to **Options** tab
4. Set **StoreKit Configuration** to your `Products.storekit` file
5. Click **Close**

### Step 11: Run in Simulator
1. Select an iOS Simulator
2. Build and run (`Cmd + R`)
3. Test purchases - they'll use your local configuration

---

## Troubleshooting

### "Cannot connect to App Store"
- Ensure sandbox account is properly added in Settings
- Check your internet connection
- Try signing out and back into sandbox account

### "Purchase failed"
- Verify product IDs match what's in App Store Connect
- Check RevenueCat dashboard for errors
- Ensure products are "Ready to Submit" in App Store Connect

### Build fails in Xcode
```bash
# Clean build folder
cd ios
rm -rf build
pod install
```

Then rebuild in Xcode.

---

## Quick Reference: Sandbox Test Credentials

Save your sandbox tester credentials here:

- **Email:** `_____________________`
- **Password:** `_____________________`

---

## Checklist Before Resubmitting to Apple

- [ ] Fresh install shows Subscription screen (not Auth)
- [ ] Can complete purchase without creating account
- [ ] "Start Using App" works after purchase
- [ ] "Create Account" option is available but optional
- [ ] Restore Purchases works
- [ ] Sign Out redirects to Subscription (not Auth)
- [ ] All subscription products appear correctly
