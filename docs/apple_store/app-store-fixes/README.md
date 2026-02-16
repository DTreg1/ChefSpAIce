# Apple App Store Fixes

This folder contains detailed step-by-step instructions for addressing the Apple App Store Review rejections and compliance issues for ChefSpAIce.

## Overview

The app received 3 rejections from Apple App Review, plus 1 additional compliance gap was identified during audit. Files are ordered by recommended execution priority.

| # | Issue | Priority | Type | Status |
|---|-------|----------|------|--------|
| 1 | [Create IAP Products](./01-create-iap-products.md) | Critical | App Store Connect | **MANUAL REQUIRED** |
| 2 | [Create Demo Account](./02-create-demo-account.md) | Important | Configuration | **COMPLETE** |
| 3 | [Server Account Deletion](./03-implement-server-account-deletion.md) | Important | Code Change | **COMPLETE** |
| 4 | [Fix IAP Login Requirement](./04-fix-iap-login-requirement.md) | Critical | Code Change | **COMPLETE** |
| 5 | [Fix iPad Auth Errors](./05-fix-ipad-auth-errors.md) | Critical | Debugging | Pending - Device Testing |

## Quick Reference

### Fix 1: Create IAP Products in App Store Connect
**Apple Guideline:** 2.1 (IAP)  
**Problem:** In-app purchase products not submitted in App Store Connect  
**Fix:** Create all 4 subscription products in App Store Connect  
**Type:** No code changes - manual setup in Apple Developer portal

### Fix 2: Create Demo Account for Review
**Apple Requirement:** App Review Information  
**Problem:** Reviewers need credentials to test the app  
**Fix:** Create demo account with sample data and Pro subscription  
**Type:** Database seed script + App Store Connect notes

### Fix 3: Implement Server Account Deletion
**Apple Guideline:** 5.1.1(v) and 5.1.1(vi)  
**Problem:** Account deletion only clears local storage, not server data  
**Fix:** Create DELETE /api/auth/delete-account endpoint  
**Type:** Backend code change

### Fix 4: Fix IAP Login Requirement
**Apple Guideline:** 5.1.1  
**Problem:** Users must log in before purchasing subscriptions  
**Fix:** Allow anonymous purchases via RevenueCat, sync to account later  
**Type:** Frontend + backend code changes

### Fix 5: Fix iPad Auth Errors
**Apple Guideline:** 2.1 (Performance/Bugs)  
**Problem:** Apple Sign-In fails on iPad Air 11-inch (M3) with iPadOS 26.1  
**Fix:** Add detailed logging, investigate device-specific issues  
**Type:** Debugging and code fixes

---

## Execution Summary

| Phase | Fixes | Effort | Can Parallelize |
|-------|-------|--------|-----------------|
| Phase 1 | Fix 1 + Fix 2 | Low | Yes - different systems |
| Phase 2 | Fix 3 | Medium | Standalone |
| Phase 3 | Fix 4 | High | Depends on Fix 3 |
| Phase 4 | Fix 5 | Variable | Requires device testing |

---

## How to Use These Guides

Each guide contains:

1. **Problem Description** - What the issue is and why it matters
2. **Current Behavior** - What the app does now
3. **Goal** - What we need to achieve
4. **Step-by-Step Instructions** - Copyable prompts for each step
5. **Code Snippets** - Example implementations
6. **Verification Checklist** - How to confirm the fix works

### Using the Prompts

Each step has a copyable prompt that you can give to an AI assistant or use as a task description. Example:

```
In client/lib/storekit-service.ts, modify the purchase flow to:
1. Allow purchases without authToken
2. Store purchase receipts locally when user is not authenticated
3. Queue pending purchases for sync when user logs in
```

---

## Related Files

### Configuration
- `docs/apple-app-store-guidelines.md` - Full Apple guidelines reference
- `replit.md` - Project architecture and preferences

### Key Code Files
- `client/lib/storekit-service.ts` - StoreKit/RevenueCat integration
- `client/contexts/AuthContext.tsx` - Authentication context
- `client/screens/SubscriptionScreen.tsx` - Subscription UI
- `client/screens/SettingsScreen.tsx` - Settings with account deletion
- `server/routers/auth.router.ts` - Auth API endpoints
- `server/routers/social-auth.router.ts` - Apple/Google Sign-In
- `shared/schema.ts` - Database schema

---

## After Fixing All Issues

Before resubmitting to App Store:

1. [ ] All 5 fixes implemented and tested
2. [ ] Build new app version with Xcode
3. [ ] Test on physical iPad Air M3 (if possible)
4. [ ] Run demo account seed script
5. [ ] Update App Review Notes with demo credentials
6. [ ] Submit to TestFlight for final testing
7. [ ] Submit to App Store Review
