# ChefSpAIce - App Store Submission Checklist

Complete this checklist before submitting your app to the Apple App Store.

## Pre-Submission Requirements

### Apple Developer Account
- [ ] Active Apple Developer Program membership ($99/year)
- [ ] Two-factor authentication enabled
- [ ] Payment information added (for paid apps)

### Legal & Business
- [ ] Privacy Policy published at https://chefspaice.app/privacy
- [ ] Terms of Service published at https://chefspaice.app/terms
- [ ] Support page available at https://chefspaice.app/support
- [ ] Contact email set up (support@chefspaice.app)

## Technical Requirements

### App Configuration
- [ ] Bundle ID configured: `com.chefspaice.app`
- [ ] App version set to `1.0.0`
- [ ] Build number set to `1`
- [ ] Deployment target set (iOS 13.0 or later recommended)

### Signing & Certificates
- [ ] iOS Distribution Certificate created
- [ ] App ID registered with Push Notifications capability
- [ ] Production Provisioning Profile created
- [ ] Signing configured in Xcode (Automatic or Manual)

### Capabilities & Permissions
- [ ] Push Notifications enabled
- [ ] Background Modes configured (Remote notifications)
- [ ] Permission descriptions added to Info.plist:
  - [ ] Camera Usage: "We need camera access for barcode scanning"
  - [ ] Photo Library: "We need photo access to save recipe images"  
  - [ ] Notifications: "We'll notify you when food is about to expire"

### Build & Testing
- [ ] App builds successfully in Xcode
- [ ] Tested on real iOS device (iPhone)
- [ ] Tested on real iOS device (iPad) - if iPad supported
- [ ] All features work in production mode
- [ ] No crashes or major bugs
- [ ] Performance is acceptable (loads <3 seconds)
- [ ] Memory usage is reasonable

## Visual Assets

### App Icon
- [ ] 1024x1024px PNG icon created
- [ ] No alpha channel (transparency)
- [ ] No rounded corners
- [ ] RGB color space
- [ ] Icon uploaded to Assets.xcassets in Xcode

### Screenshots
Required for each device size:

#### iPhone 6.7" Display (1290 x 2796 px)
- [ ] 1. Home/Chat screen
- [ ] 2. Inventory management
- [ ] 3. Recipe generation
- [ ] 4. Nutrition tracking
- [ ] 5. Meal planner (optional)
- [ ] 6. Shopping list (optional)

#### iPhone 6.5" Display (1284 x 2778 px)
- [ ] Same screenshots as above, resized

#### iPad Pro 12.9" (2048 x 2732 px) - if iPad supported
- [ ] Same screenshots as above, iPad layout

### App Preview Video (Optional but Recommended)
- [ ] 30-second preview video created
- [ ] Showcases key features
- [ ] Resolution: 1080p or 4K
- [ ] No audio or approved audio only

## App Store Connect

### App Information
- [ ] App created in App Store Connect
- [ ] Name: ChefSpAIce - Smart Kitchen AI
- [ ] Subtitle: Your AI-Powered Kitchen Helper (max 30 chars)
- [ ] Primary Category: Food & Drink
- [ ] Secondary Category: Health & Fitness
- [ ] Content Rights: I own all rights to this app

### Version Information
- [ ] Version number: 1.0.0
- [ ] Copyright: 2025 ChefSpAIce
- [ ] Build number selected
- [ ] Screenshots uploaded for all required sizes
- [ ] App icon (1024x1024) uploaded

### Description & Metadata
Copy from `marketing_assets/app_store/app-store-listing.md`:

- [ ] Short description added (80 chars max)
- [ ] Full description added
- [ ] Keywords added (max 100 chars):
  ```
  AI cooking,recipe generator,food inventory,meal planner,nutrition,barcode scanner,smart kitchen
  ```
- [ ] Support URL: https://chefspaice.app/support
- [ ] Marketing URL: https://chefspaice.app
- [ ] Privacy Policy URL: https://chefspaice.app/privacy

### App Review Information
- [ ] Contact Information added (name, phone, email)
- [ ] Demo Account credentials provided (if login required):
  - [ ] Username: demo@chefspaice.app
  - [ ] Password: [secure demo password]
- [ ] Review notes added (explain any special features)

### Pricing & Availability
- [ ] Price tier selected (Free or paid)
- [ ] Countries/regions selected (worldwide or specific)
- [ ] Availability date set

### Age Rating
Complete the age rating questionnaire:
- [ ] Unrestricted Web Access: No
- [ ] Gambling: No
- [ ] Contests: No
- [ ] Mature/Suggestive Themes: No
- [ ] Violence: No
- [ ] Medical/Treatment Information: No (food/nutrition info only)
- [ ] Result: **4+** (all ages)

### App Privacy
Answer privacy questions:
- [ ] Do you collect data? **Yes**
- [ ] Data types collected:
  - [ ] Contact Info (email for account)
  - [ ] User Content (food inventory, preferences)
  - [ ] Usage Data (analytics)
  - [ ] Identifiers (device ID for push notifications)
- [ ] Data linked to user: **Yes**
- [ ] Data used for tracking: **No**
- [ ] Privacy Policy URL confirmed

## Native Features Checklist

### Offline Functionality
- [ ] Service Worker registered and working
- [ ] Recipes cached for offline access
- [ ] Inventory data available offline
- [ ] Offline indicator shows when disconnected
- [ ] Data syncs when back online

### Push Notifications
- [ ] Push permission requested on first launch
- [ ] Token successfully saved to backend
- [ ] Test notification sent and received
- [ ] Notification opens correct screen when tapped
- [ ] Badge count updates correctly

### Native Sharing
- [ ] Recipe sharing works
- [ ] Shopping list sharing works
- [ ] Share dialog appears correctly
- [ ] Fallback to clipboard works on web

### Other Native Features
- [ ] Barcode scanner works (requires real device)
- [ ] Deep links work (if implemented)
- [ ] Camera access works properly

## Final Checks

### Before Archive
- [ ] All TODO comments removed or addressed
- [ ] Console.log statements removed or minimal
- [ ] Debug code removed
- [ ] API keys secured in environment variables
- [ ] Backend APIs deployed and accessible
- [ ] Database migrations applied

### Archive Process
- [ ] Clean build folder (Product > Clean Build Folder)
- [ ] Archive created successfully
- [ ] Archive uploaded to App Store Connect
- [ ] Build shows "Processing" then "Ready for Submission"
- [ ] Build selected in version page

### Pre-Submission Final Test
- [ ] Download TestFlight build (if available)
- [ ] Test all critical user flows:
  - [ ] Sign up / Login
  - [ ] Add food item
  - [ ] Generate recipe
  - [ ] Create meal plan
  - [ ] Generate shopping list
  - [ ] Share recipe
  - [ ] Receive push notification (expiration alert)
- [ ] Test offline mode
- [ ] Test on fresh install (delete and reinstall)

## Submission

### Submit for Review
- [ ] All items above completed
- [ ] "Submit for Review" button clicked
- [ ] Release option selected:
  - [ ] Manual release (you control when it goes live)
  - [ ] Automatic release (goes live immediately after approval)
- [ ] Confirmation email received

### Post-Submission
- [ ] Monitor review status in App Store Connect
- [ ] Respond promptly to any reviewer questions
- [ ] Prepare for potential rejection (have fixes ready)

## Common Rejection Reasons & Solutions

### Functionality Issues
- **Problem**: App crashes during review
- **Solution**: Test thoroughly on real devices, check logs

- **Problem**: Features don't work as described
- **Solution**: Ensure description matches actual functionality

### Metadata Issues
- **Problem**: Screenshots don't match app
- **Solution**: Update screenshots to show current UI

- **Problem**: Privacy policy missing or incorrect
- **Solution**: Add comprehensive privacy policy with data collection details

### Performance Issues
- **Problem**: App is too slow
- **Solution**: Optimize load times, use caching, minimize API calls

- **Problem**: App uses too much battery
- **Solution**: Reduce background activity, optimize push notifications

### Guideline Violations
- **Problem**: App is just a website wrapper
- **Solution**: Emphasize native features (offline, push, share, barcode scanner)

- **Problem**: Missing user value
- **Solution**: Highlight AI features, food waste reduction, cost savings

## Expected Timeline

- **Upload to App Store Connect**: Immediate
- **Build Processing**: 10-30 minutes
- **Review Queue**: 0-2 days
- **In Review**: 24-48 hours
- **Total Time**: 1-4 days typically

## After Approval

- [ ] App appears in App Store
- [ ] Test download from App Store
- [ ] Monitor crash reports and reviews
- [ ] Respond to user feedback
- [ ] Plan for version 1.1 updates

## Resources

- App Store Connect: https://appstoreconnect.apple.com
- Developer Portal: https://developer.apple.com
- Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
- Human Interface Guidelines: https://developer.apple.com/design/human-interface-guidelines/

---

**Remember**: The App Store review is looking for:
1. ✅ App works as advertised
2. ✅ Provides real value to users
3. ✅ Follows Apple's design guidelines
4. ✅ Respects user privacy
5. ✅ Is more than just a website

ChefSpAIce has all of these! ✨

Good luck with your submission! 🚀
