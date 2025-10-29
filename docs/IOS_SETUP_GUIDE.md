# ChefSpAIce iOS Setup Guide

This guide walks you through the final steps to prepare your ChefSpAIce app for the Apple App Store.

## Prerequisites

- Apple Developer Account ($99/year) - [Sign up here](https://developer.apple.com/programs/)
- Xcode installed on a Mac
- Valid signing certificates and provisioning profiles

## Project Status

### ✅ Completed Setup

1. **Capacitor Configuration**
   - Capacitor installed and configured
   - iOS platform added to project
   - App ID: `com.chefspaice.app`
   - App Name: `ChefSpAIce`

2. **Offline Functionality**
   - Service Worker implemented for caching
   - Offline indicator component added
   - Caches recipes and inventory data
   - Network-first strategy for API calls

3. **Push Notifications**
   - Push Notifications plugin installed
   - Backend API routes for token storage
   - Database table for push tokens
   - Notification handlers implemented

4. **Native Sharing**
   - Share API integrated
   - Recipe sharing functionality
   - Shopping list sharing
   - Fallback to clipboard for unsupported devices

## Next Steps

### 1. App Icons and Splash Screens

#### Create App Store Icon (1024x1024)
You'll need to create a 1024x1024px PNG icon for the App Store:

1. Use your existing logo at `public/logo-512.svg` or `public/logo-512.png`
2. Scale it up to 1024x1024px using a tool like:
   - Figma
   - Sketch
   - Adobe Illustrator
   - [Online icon generator](https://appicon.co/)

3. Requirements:
   - Format: PNG
   - Size: 1024 x 1024 pixels
   - No alpha channel (transparency)
   - No rounded corners (iOS adds them automatically)
   - RGB color space

#### Generate iOS Icon Set
Once you have the 1024x1024 icon:

1. Use [appicon.co](https://appicon.co/) or similar tool to generate all required sizes
2. Download the iOS icon set
3. In Xcode, open `ios/App/App.xcodeproj`
4. Navigate to `Assets.xcassets` > `AppIcon`
5. Drag and drop all icon sizes into the appropriate slots

#### Create Splash Screens
1. Design a splash screen that matches your app theme
2. Use your logo with the olive green background (#6b8e23)
3. Required sizes:
   - iPhone 13 Pro Max: 1284 x 2778 px
   - iPhone 13: 1170 x 2532 px
   - iPad Pro 12.9": 2048 x 2732 px

### 2. Configure iOS Project in Xcode

#### Open the Project
```bash
cd ios/App
open App.xcodeproj
```

#### Update App Settings
1. **General Tab**
   - Display Name: `ChefSpAIce`
   - Bundle Identifier: `com.chefspaice.app`
   - Version: `1.0.0`
   - Build: `1`

2. **Signing & Capabilities**
   - Team: Select your Apple Developer team
   - Signing Certificate: Select your distribution certificate
   - Add Capabilities:
     - ✓ Push Notifications
     - ✓ Background Modes (Remote notifications)

3. **Info.plist Permissions**
   Add permission descriptions:
   - `NSCameraUsageDescription`: "We need camera access for barcode scanning"
   - `NSPhotoLibraryUsageDescription`: "We need photo access to save recipe images"
   - `NSUserNotificationsUsageDescription`: "We'll notify you when food is about to expire"

### 3. Build and Test

#### Build the Web App
```bash
npm run build
npx cap sync ios
```

#### Open in Xcode and Run
```bash
npx cap open ios
```

1. Select a real iOS device or simulator
2. Click the Play button (⌘R)
3. Test all features:
   - ✓ Offline mode works
   - ✓ Push notification permissions requested
   - ✓ Share functionality works
   - ✓ All pages load correctly

### 4. Prepare for App Store Submission

#### Screenshots
Use the screenshot guide in `marketing_assets/screenshot-guide.md`:

Required sizes:
- iPhone 6.7" (1290 x 2796) - iPhone 14 Pro Max
- iPhone 6.5" (1284 x 2778) - iPhone 11 Pro Max
- iPad Pro 12.9" (2048 x 2732)

Capture these screens:
1. Home/Chat interface
2. Inventory management
3. Recipe generation
4. Nutrition tracking
5. Meal planner
6. Shopping list

#### App Store Connect Setup
1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Click "My Apps" > "+" > "New App"
3. Fill in app information:
   - Platform: iOS
   - Name: ChefSpAIce - Smart Kitchen AI
   - Primary Language: English (U.S.)
   - Bundle ID: com.chefspaice.app
   - SKU: CHEFSPAICE001

4. App Information:
   - Category: Food & Drink (Primary), Health & Fitness (Secondary)
   - Content Rights: You own all rights
   - Age Rating: 4+

5. Pricing:
   - Price: Free (with in-app purchases if applicable)
   - Availability: All countries

6. App Privacy:
   - Privacy Policy URL: https://chefspaice.app/privacy
   - Collect data: Yes (user account, food preferences, usage data)

#### Version Information
Use content from `marketing_assets/app_store/app-store-listing.md`:

- **App Name**: ChefSpAIce - Smart Kitchen AI
- **Subtitle**: Your AI-Powered Kitchen Helper
- **Description**: (Use full description from marketing assets)
- **Keywords**: AI cooking, recipe generator, food inventory, meal planner, nutrition tracker, barcode scanner, smart kitchen, food waste, recipe app, cooking assistant, pantry manager
- **Support URL**: https://chefspaice.app/support
- **Marketing URL**: https://chefspaice.app

### 5. Archive and Upload

#### Create Archive
1. In Xcode, select "Any iOS Device (arm64)" as the destination
2. Product > Archive
3. Wait for archive to complete
4. Organizer window will open automatically

#### Upload to App Store Connect
1. Click "Distribute App"
2. Select "App Store Connect"
3. Click "Upload"
4. Select your signing options
5. Click "Upload"
6. Wait for processing (10-30 minutes)

#### Submit for Review
1. In App Store Connect, select your app
2. Click "Prepare for Submission"
3. Select the uploaded build
4. Fill in:
   - What's New in This Version (from marketing assets)
   - Screenshots (upload all required sizes)
   - App Icon (1024x1024)
5. Add Review Information:
   - Contact Information
   - Demo Account (if login required)
6. Click "Submit for Review"

### 6. Review Process

- **Review Time**: Typically 24-48 hours
- **Common Reasons for Rejection**:
  - Missing functionality during review
  - Crashes or bugs
  - Incomplete app information
  - Privacy policy missing or incorrect

## Testing Checklist

Before submitting, ensure:

### Functionality
- [ ] App launches successfully
- [ ] User can login/signup
- [ ] Offline mode works (turn off Wi-Fi and test)
- [ ] Push notifications permission is requested
- [ ] Share functionality works
- [ ] Barcode scanner works (requires real device)
- [ ] All navigation works
- [ ] Data persists correctly

### UI/UX
- [ ] No visual glitches
- [ ] Loading states show properly
- [ ] Error messages are user-friendly
- [ ] App works in portrait and landscape (if supported)
- [ ] Safe areas respected on notched devices

### Performance
- [ ] App loads in <3 seconds
- [ ] Smooth scrolling and animations
- [ ] No memory leaks
- [ ] Battery usage is reasonable

## Helpful Resources

- [Apple App Store Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [App Store Connect Help](https://help.apple.com/app-store-connect/)
- [Capacitor iOS Documentation](https://capacitorjs.com/docs/ios)
- [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/ios)

## Support

For technical questions about the Capacitor setup:
- [Capacitor Community](https://ionic.link/discord)
- [Stack Overflow - Capacitor tag](https://stackoverflow.com/questions/tagged/capacitor)

For App Store submission help:
- [Apple Developer Forums](https://developer.apple.com/forums/)
- [App Store Connect Support](https://developer.apple.com/contact/app-store/)

## Notes

- The iOS project is located in `ios/App/`
- Capacitor config is in `capacitor.config.ts`
- Service Worker is at `client/public/sw.js`
- Push notification service is in `client/src/utils/pushNotifications.ts`
- Share service is in `client/src/utils/shareApi.ts`

Good luck with your App Store submission! 🚀
