# ChefSpAIce - Apple App Store Submission Checklist

This document outlines everything needed for Apple App Store submission readiness. Items marked with ✅ are complete, items marked with ⬜ require attention.

---

## 1. App Store Connect Setup

| Status | Item | Notes |
|--------|------|-------|
| ✅ | App Store Connect account | ASC App ID: 6757112063 configured in eas.json |
| ✅ | Bundle Identifier | com.chefspaice.chefspaice |
| ✅ | Apple Developer Team ID | APPLE_TEAM_ID configured as environment secret |
| ⬜ | App Store Connect listing created | Create app listing in App Store Connect |
| ⬜ | App category selected | Primary: Food & Drink, Secondary: Lifestyle |

---

## 2. App Metadata & Descriptions

| Status | Item | Notes |
|--------|------|-------|
| ✅ | App Name | ChefSpAIce |
| ✅ | Subtitle (30 chars) | "Smart Kitchen & Recipe Manager" |
| ✅ | Full Description | Complete in docs/app-store-listing.md |
| ✅ | Keywords | 100 chars defined in docs/app-store-listing.md |
| ✅ | What's New text | Version 1.0.0 release notes prepared |
| ✅ | Age Rating | 4+ (No objectionable content) |
| ✅ | Promotional Text | Added to docs/app-store-listing.md |
| ⬜ | Support URL | Set up support page (support@chefspaice.com configured) |
| ⬜ | Marketing URL | Create marketing website/landing page URL |

---

## 3. Screenshots & Media

| Status | Item | Notes |
|--------|------|-------|
| ⬜ | iPhone 6.7" screenshots (3-10) | 1290 x 2796 pixels required |
| ⬜ | iPhone 6.5" screenshots (3-10) | 1242 x 2688 pixels required |
| ⬜ | iPhone 5.5" screenshots (3-10) | 1242 x 2208 pixels required |
| ⬜ | iPad 12.9" screenshots | 2048 x 2732 pixels (if supporting iPad) |
| ⬜ | App Preview video (optional) | Up to 30 seconds |
| ✅ | Screenshot guide | docs/screenshot-guide.md with recommended sequence |

---

## 4. App Icons & Assets

| Status | Item | Notes |
|--------|------|-------|
| ✅ | App icon (1024x1024) | assets/images/icon.png |
| ✅ | Splash screen | Configured in app.json with dark mode variant |
| ✅ | Favicon | assets/images/favicon.png |
| ⬜ | Verify icon meets Apple guidelines | No transparency, no alpha channel for App Store icon |

---

## 5. Legal & Privacy

| Status | Item | Notes |
|--------|------|-------|
| ✅ | Privacy Policy | PrivacyScreen.tsx with comprehensive policy |
| ✅ | Terms of Service | TermsScreen.tsx with full terms |
| ⬜ | Privacy Policy hosted URL | Host privacy policy at public URL for App Store |
| ⬜ | Terms hosted URL | Host terms at public URL for App Store |
| ✅ | Data collection disclosure | Privacy policy covers all data collected |
| ⬜ | App Privacy "nutrition labels" | Complete Apple privacy questionnaire in ASC |
| ⬜ | Data use purposes documented | Document all third-party data sharing |

---

## 6. In-App Purchases & Subscriptions

| Status | Item | Notes |
|--------|------|-------|
| ✅ | Subscription tiers defined | Basic ($4.99/mo), Pro ($9.99/mo) |
| ✅ | Annual pricing | Basic $49.90/yr, Pro $99.90/yr |
| ✅ | Stripe integration | Backend subscription handling complete |
| ⬜ | Apple StoreKit integration | REQUIRED: Replace Stripe with StoreKit for iOS |
| ⬜ | Create IAP products in ASC | Set up subscription products in App Store Connect |
| ⬜ | Restore purchases functionality | Implement restore purchases button |
| ⬜ | Subscription terms visible | Auto-renewal terms must be displayed before purchase |
| ⬜ | EULA / Subscription terms | Add Apple-compliant subscription disclosure |
| ✅ | 7-day free trial | Trial system implemented |
| ✅ | Trial expiration handling | Background job + modal for expired trials |

### Critical: StoreKit Migration Required
The app currently uses Stripe for subscription payments. **Apple requires all iOS in-app purchases to use StoreKit/Apple's payment system.** This is a blocking requirement.

Tasks:
- [ ] Install `expo-in-app-purchases` or `react-native-iap`
- [ ] Create subscription products in App Store Connect
- [ ] Implement StoreKit purchase flow for iOS
- [ ] Implement receipt validation on backend
- [ ] Add "Restore Purchases" button
- [ ] Keep Stripe for Android/web, use StoreKit for iOS

---

## 7. Authentication

| Status | Item | Notes |
|--------|------|-------|
| ✅ | Apple Sign-In | expo-apple-authentication integrated |
| ✅ | Google Sign-In | Google OAuth implemented |
| ✅ | Email/Password auth | Custom authentication system |
| ⬜ | Apple Sign-In required | If offering social login, Apple Sign-In MUST be offered |
| ✅ | Account deletion | Delete account flow in SettingsScreen.tsx |

---

## 8. Required iOS Configurations

| Status | Item | Notes |
|--------|------|-------|
| ✅ | Camera permission | NSCameraUsageDescription configured |
| ✅ | Photo Library permission | NSPhotoLibraryUsageDescription configured |
| ✅ | Encryption declaration | ITSAppUsesNonExemptEncryption: false |
| ✅ | Privacy manifests | NSPrivacyAccessedAPITypes configured for UserDefaults |
| ✅ | iPad support | supportsTablet: true |
| ⬜ | Microphone permission | Add if voice features are used (NSMicrophoneUsageDescription) |
| ⬜ | Push notification entitlement | Required for expiration notifications |

---

## 9. App Functionality Testing

| Status | Item | Notes |
|--------|------|-------|
| ⬜ | Complete user flow testing | Test all features end-to-end on physical device |
| ⬜ | Offline mode testing | Verify app works without internet |
| ⬜ | Authentication flow | Test sign up, sign in, social auth, sign out |
| ⬜ | Subscription purchase flow | Test with sandbox accounts |
| ⬜ | Barcode scanning | Test on physical device |
| ⬜ | Camera functionality | Test food photo capture |
| ⬜ | Push notifications | Test expiration alerts |
| ⬜ | Dark mode | Verify all screens support dark mode |
| ⬜ | Account deletion | Verify data is properly removed |
| ⬜ | Crash testing | No crashes during normal usage |

---

## 10. Build & Submission

| Status | Item | Notes |
|--------|------|-------|
| ✅ | EAS configuration | eas.json configured for production builds |
| ✅ | Build number | Set to 1, auto-increment enabled |
| ✅ | Version number | 1.0.0 |
| ⬜ | Production build | Run `eas build --platform ios --profile production` |
| ⬜ | TestFlight internal testing | Test with internal team |
| ⬜ | TestFlight external testing | Beta test with external users |
| ⬜ | Submit for review | Submit via EAS or manually through ASC |

---

## 11. App Review Preparation

| Status | Item | Notes |
|--------|------|-------|
| ⬜ | Demo account credentials | Provide test account for Apple reviewers |
| ⬜ | Review notes | Explain subscription, AI features, special testing needs |
| ⬜ | Contact information | Provide contact for reviewer questions |
| ⬜ | Content rights documentation | If using third-party content |

---

## 12. Content & Features

| Status | Item | Notes |
|--------|------|-------|
| ✅ | Core inventory management | Complete |
| ✅ | AI recipe generation | Complete with OpenAI |
| ✅ | Barcode scanning | Complete |
| ✅ | Meal planning | Complete |
| ✅ | Shopping lists | Complete |
| ✅ | Kitchen equipment | Complete |
| ✅ | Expiration tracking | Complete |
| ✅ | Nutrition information | USDA integration complete |
| ✅ | User onboarding | 6-step onboarding flow |
| ✅ | Support screen | FAQ and troubleshooting |
| ✅ | About screen | App information and attributions |

---

## 13. Documentation

| Status | Item | Notes |
|--------|------|-------|
| ✅ | App Store listing copy | docs/app-store-listing.md |
| ✅ | Screenshot guide | docs/screenshot-guide.md |
| ✅ | Subscription implementation | docs/subscription-tier-implementation.md |
| ✅ | Test guide | docs/COMPREHENSIVE_TEST_GUIDE.md |
| ⬜ | Export compliance docs | If required for your app |

---

## Priority Action Items (Blocking)

These items MUST be completed before App Store submission:

### High Priority (Blockers)
1. **StoreKit Integration** - Apple requires in-app purchases use their payment system
2. **Restore Purchases** - Required for all apps with subscriptions
3. **Screenshots** - Required for App Store listing
4. **Privacy Policy URL** - Must be publicly accessible
5. **Push Notification Entitlement** - Configure in Apple Developer portal
6. **TestFlight Testing** - Required before public release
7. **Demo Account** - For Apple review team

### Medium Priority
1. Verify Apple Sign-In works on device
2. Test subscription flow with sandbox
3. Complete App Privacy questionnaire
4. Create promotional text
5. Add microphone permission if needed

### Low Priority (Can be done post-launch)
1. App Preview video
2. iPad-optimized screenshots
3. Marketing URL

---

## Estimated Time to Completion

| Task Category | Estimated Time |
|---------------|----------------|
| StoreKit Integration | 2-3 days |
| Screenshots creation | 1 day |
| Privacy/Terms URLs | 1 hour |
| App Store Connect setup | 2-3 hours |
| TestFlight testing | 1-2 weeks |
| Apple review process | 1-7 days |

**Total estimated time to submission-ready: 1-2 weeks**
**Total time including review: 2-4 weeks**

---

## Quick Reference Links

- [Apple App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [StoreKit Integration Guide](https://docs.expo.dev/versions/latest/sdk/in-app-purchases/)
- [App Store Connect Help](https://help.apple.com/app-store-connect/)

---

*Last updated: January 2026*
