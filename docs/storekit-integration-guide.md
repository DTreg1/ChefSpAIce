# ChefSpAIce StoreKit Integration Guide

A detailed step-by-step guide for implementing Apple StoreKit 2 in-app purchases for iOS. This replaces Stripe for iOS subscription handling while keeping Stripe for Android and web.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Prerequisites](#2-prerequisites)
3. [Library Choice](#3-library-choice)
4. [App Store Connect Setup](#4-app-store-connect-setup)
5. [Code Implementation](#5-code-implementation)
6. [Backend Receipt Validation](#6-backend-receipt-validation)
7. [Testing](#7-testing)
8. [Production Checklist](#8-production-checklist)

---

## 1. Overview

### Why StoreKit is Required

Apple requires all iOS in-app purchases to use their payment system (StoreKit). Using external payment systems like Stripe for iOS subscriptions violates App Store guidelines and will result in app rejection.

### Current Architecture

```
Current:
iOS App → Stripe API → Backend → Database

Target Architecture:
iOS App → StoreKit 2 → Apple Servers → Backend Webhook → Database
Android/Web → Stripe API → Backend → Database
```

### ChefSpAIce Subscription Tiers

| Tier | Monthly | Annual | Product ID (iOS) |
|------|---------|--------|------------------|
| Basic | $4.99 | $49.90 | `com.chefspaice.basic.monthly` / `com.chefspaice.basic.annual` |
| Pro | $9.99 | $99.90 | `com.chefspaice.pro.monthly` / `com.chefspaice.pro.annual` |

---

## 2. Prerequisites

### Required Before Starting

- [ ] Apple Developer Account ($99/year)
- [ ] App Store Connect access
- [ ] Paid Applications Agreement signed in App Store Connect
- [ ] Bundle ID registered: `com.chefspaice.chefspaice`
- [ ] APPLE_TEAM_ID environment variable set ✅

### System Requirements

- iOS 15+ (for StoreKit 2)
- React Native 0.73+
- Expo SDK 50+
- EAS Build configured

---

## 3. Library Choice

### Recommended: RevenueCat (react-native-purchases)

RevenueCat is recommended because it:
- Handles receipt validation automatically
- Provides webhooks for subscription events
- Works cross-platform (iOS + Android)
- Has a generous free tier
- Reduces backend complexity

### Alternative: expo-iap or react-native-iap

Use these if you want full control and don't want a third-party service.

---

## 4. App Store Connect Setup

### Step 4.1: Sign Paid Applications Agreement

```
COPYABLE PROMPT:
---
Go to App Store Connect → Agreements, Tax, and Banking
Sign the "Paid Applications" agreement
Complete banking and tax information
Wait for approval (usually 24-48 hours)
---
```

### Step 4.2: Create Subscription Group

```
COPYABLE PROMPT:
---
1. Go to App Store Connect → My Apps → ChefSpAIce
2. Navigate to Features → Subscriptions
3. Click the (+) button to create a new Subscription Group
4. Name it: "ChefSpAIce Premium"
5. Set Reference Name: "premium_subscriptions"
6. Click Create
---
```

### Step 4.3: Create Subscription Products

Create each of these 4 subscription products:

#### Basic Monthly

```
COPYABLE PROMPT:
---
In the "ChefSpAIce Premium" subscription group:

1. Click (+) to add a new subscription
2. Reference Name: "Basic Monthly"
3. Product ID: com.chefspaice.basic.monthly
4. Subscription Duration: 1 Month
5. Price: Tier 5 ($4.99 USD)
6. Click Create

Add Localization (English US):
- Subscription Display Name: "Basic Plan"
- Description: "Access to inventory tracking, barcode scanning, and basic AI recipe suggestions. Syncs across all your devices."

Review Information:
- Screenshot: Add a screenshot of subscription screen
- Review Notes: "This subscription provides access to basic inventory management features."
---
```

#### Basic Annual

```
COPYABLE PROMPT:
---
In the "ChefSpAIce Premium" subscription group:

1. Click (+) to add a new subscription
2. Reference Name: "Basic Annual"
3. Product ID: com.chefspaice.basic.annual
4. Subscription Duration: 1 Year
5. Price: Tier 50 ($49.99 USD)
6. Click Create

Add Localization (English US):
- Subscription Display Name: "Basic Plan (Annual)"
- Description: "Save 17%! Full year of inventory tracking, barcode scanning, and basic AI recipe suggestions."

Review Information:
- Screenshot: Add a screenshot of subscription screen
- Review Notes: "Annual version of basic subscription with discount."
---
```

#### Pro Monthly

```
COPYABLE PROMPT:
---
In the "ChefSpAIce Premium" subscription group:

1. Click (+) to add a new subscription
2. Reference Name: "Pro Monthly"
3. Product ID: com.chefspaice.pro.monthly
4. Subscription Duration: 1 Month
5. Price: Tier 10 ($9.99 USD)
6. Click Create

Add Localization (English US):
- Subscription Display Name: "Pro Plan"
- Description: "Everything in Basic plus unlimited AI recipes, advanced meal planning, nutrition tracking, and priority support."

Review Information:
- Screenshot: Add a screenshot of subscription screen
- Review Notes: "Premium subscription with all features unlocked."
---
```

#### Pro Annual

```
COPYABLE PROMPT:
---
In the "ChefSpAIce Premium" subscription group:

1. Click (+) to add a new subscription
2. Reference Name: "Pro Annual"
3. Product ID: com.chefspaice.pro.annual
4. Subscription Duration: 1 Year
5. Price: Tier 100 ($99.99 USD)
6. Click Create

Add Localization (English US):
- Subscription Display Name: "Pro Plan (Annual)"
- Description: "Save 17%! Full year of unlimited AI recipes, advanced meal planning, nutrition tracking, and priority support."

Review Information:
- Screenshot: Add a screenshot of subscription screen
- Review Notes: "Annual version of pro subscription with discount."
---
```

### Step 4.4: Add Free Trial (Optional)

```
COPYABLE PROMPT:
---
For each subscription product:

1. Open the subscription product
2. Scroll to "Subscription Prices" section
3. Click "Create Introductory Offer"
4. Type: Free Trial
5. Duration: 1 Week (7 days)
6. Start Date: Leave as default
7. End Date: No End Date
8. Eligible Users: New subscribers only
9. Save
---
```

### Step 4.5: Configure App Store Server Notifications

```
COPYABLE PROMPT:
---
1. Go to App Store Connect → My Apps → ChefSpAIce
2. Navigate to General → App Information
3. Scroll to "App Store Server Notifications"
4. Production URL: https://your-domain.repl.co/api/apple/webhook
5. Sandbox URL: https://your-domain.repl.co/api/apple/webhook-sandbox
6. Notification Version: Version 2
7. Save
---
```

---

## 5. Code Implementation

### Step 5.1: Install Dependencies

```
COPYABLE PROMPT:
---
Run this command in your terminal:

npx expo install react-native-purchases

Then update app.json to add the plugin:
---
```

Add to `app.json`:

```json
{
  "expo": {
    "plugins": [
      "react-native-purchases"
    ]
  }
}
```

### Step 5.2: Create RevenueCat Account

```
COPYABLE PROMPT:
---
1. Go to https://app.revenuecat.com/signup
2. Create a free account
3. Create a new project named "ChefSpAIce"
4. Add Apple App Store as a platform
5. Enter your Bundle ID: com.chefspaice.chefspaice
6. Copy the API key for iOS (starts with "appl_")
---
```

### Step 5.3: Create StoreKit Service

Create file: `client/lib/storekit-service.ts`

```typescript
/**
 * StoreKit Service for iOS In-App Purchases
 * Uses RevenueCat for subscription management
 */

import { Platform } from 'react-native';
import Purchases, {
  PurchasesOffering,
  PurchasesPackage,
  CustomerInfo,
  LOG_LEVEL,
} from 'react-native-purchases';

// RevenueCat API Keys (set these in your environment)
const REVENUECAT_IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || '';
const REVENUECAT_ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || '';

// Entitlement identifiers (configure in RevenueCat dashboard)
export const ENTITLEMENTS = {
  BASIC: 'basic',
  PRO: 'pro',
} as const;

// Product identifiers
export const PRODUCT_IDS = {
  BASIC_MONTHLY: 'com.chefspaice.basic.monthly',
  BASIC_ANNUAL: 'com.chefspaice.basic.annual',
  PRO_MONTHLY: 'com.chefspaice.pro.monthly',
  PRO_ANNUAL: 'com.chefspaice.pro.annual',
} as const;

class StoreKitService {
  private initialized = false;

  /**
   * Initialize RevenueCat SDK
   * Call this once at app startup
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    if (Platform.OS === 'web') return;

    try {
      Purchases.setLogLevel(LOG_LEVEL.DEBUG);

      const apiKey = Platform.select({
        ios: REVENUECAT_IOS_KEY,
        android: REVENUECAT_ANDROID_KEY,
        default: '',
      });

      if (!apiKey) {
        console.warn('StoreKit: No API key configured');
        return;
      }

      await Purchases.configure({ apiKey });
      this.initialized = true;
      console.log('StoreKit: Initialized successfully');
    } catch (error) {
      console.error('StoreKit: Failed to initialize', error);
    }
  }

  /**
   * Set the user ID for RevenueCat
   * Call this after user authentication
   */
  async setUserId(userId: string): Promise<void> {
    if (!this.initialized || Platform.OS === 'web') return;

    try {
      await Purchases.logIn(userId);
      console.log('StoreKit: User ID set', userId);
    } catch (error) {
      console.error('StoreKit: Failed to set user ID', error);
    }
  }

  /**
   * Clear user ID on logout
   */
  async logout(): Promise<void> {
    if (!this.initialized || Platform.OS === 'web') return;

    try {
      await Purchases.logOut();
      console.log('StoreKit: User logged out');
    } catch (error) {
      console.error('StoreKit: Failed to logout', error);
    }
  }

  /**
   * Get available subscription offerings
   */
  async getOfferings(): Promise<PurchasesOffering | null> {
    if (!this.initialized || Platform.OS === 'web') return null;

    try {
      const offerings = await Purchases.getOfferings();
      return offerings.current;
    } catch (error) {
      console.error('StoreKit: Failed to get offerings', error);
      return null;
    }
  }

  /**
   * Get current customer subscription info
   */
  async getCustomerInfo(): Promise<CustomerInfo | null> {
    if (!this.initialized || Platform.OS === 'web') return null;

    try {
      return await Purchases.getCustomerInfo();
    } catch (error) {
      console.error('StoreKit: Failed to get customer info', error);
      return null;
    }
  }

  /**
   * Check if user has active subscription
   */
  async hasActiveSubscription(): Promise<{ isActive: boolean; tier: 'basic' | 'pro' | null }> {
    if (!this.initialized || Platform.OS === 'web') {
      return { isActive: false, tier: null };
    }

    try {
      const customerInfo = await Purchases.getCustomerInfo();
      
      if (customerInfo.entitlements.active[ENTITLEMENTS.PRO]) {
        return { isActive: true, tier: 'pro' };
      }
      
      if (customerInfo.entitlements.active[ENTITLEMENTS.BASIC]) {
        return { isActive: true, tier: 'basic' };
      }

      return { isActive: false, tier: null };
    } catch (error) {
      console.error('StoreKit: Failed to check subscription', error);
      return { isActive: false, tier: null };
    }
  }

  /**
   * Purchase a subscription package
   */
  async purchasePackage(pkg: PurchasesPackage): Promise<{
    success: boolean;
    customerInfo?: CustomerInfo;
    error?: string;
  }> {
    if (!this.initialized || Platform.OS === 'web') {
      return { success: false, error: 'StoreKit not available' };
    }

    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      return { success: true, customerInfo };
    } catch (error: any) {
      if (error.userCancelled) {
        return { success: false, error: 'User cancelled' };
      }
      console.error('StoreKit: Purchase failed', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Restore previous purchases
   */
  async restorePurchases(): Promise<{
    success: boolean;
    customerInfo?: CustomerInfo;
    error?: string;
  }> {
    if (!this.initialized || Platform.OS === 'web') {
      return { success: false, error: 'StoreKit not available' };
    }

    try {
      const customerInfo = await Purchases.restorePurchases();
      return { success: true, customerInfo };
    } catch (error: any) {
      console.error('StoreKit: Restore failed', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if StoreKit should be used (iOS only)
   */
  shouldUseStoreKit(): boolean {
    return Platform.OS === 'ios' && this.initialized;
  }
}

export const storeKitService = new StoreKitService();
```

### Step 5.4: Create StoreKit Hook

Create file: `client/hooks/useStoreKit.ts`

```typescript
/**
 * React hook for StoreKit subscription management
 */

import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import { PurchasesOffering, PurchasesPackage, CustomerInfo } from 'react-native-purchases';
import { storeKitService, ENTITLEMENTS } from '@/lib/storekit-service';

interface UseStoreKitReturn {
  isLoading: boolean;
  offerings: PurchasesOffering | null;
  customerInfo: CustomerInfo | null;
  isSubscribed: boolean;
  currentTier: 'basic' | 'pro' | null;
  purchasePackage: (pkg: PurchasesPackage) => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  refreshCustomerInfo: () => Promise<void>;
}

export function useStoreKit(): UseStoreKitReturn {
  const [isLoading, setIsLoading] = useState(true);
  const [offerings, setOfferings] = useState<PurchasesOffering | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);

  // Determine subscription status
  const isSubscribed = customerInfo?.entitlements?.active
    ? Object.keys(customerInfo.entitlements.active).length > 0
    : false;

  const currentTier: 'basic' | 'pro' | null = customerInfo?.entitlements?.active
    ? customerInfo.entitlements.active[ENTITLEMENTS.PRO]
      ? 'pro'
      : customerInfo.entitlements.active[ENTITLEMENTS.BASIC]
        ? 'basic'
        : null
    : null;

  // Load initial data
  useEffect(() => {
    if (Platform.OS === 'web') {
      setIsLoading(false);
      return;
    }

    const loadData = async () => {
      setIsLoading(true);
      try {
        const [fetchedOfferings, fetchedCustomerInfo] = await Promise.all([
          storeKitService.getOfferings(),
          storeKitService.getCustomerInfo(),
        ]);
        setOfferings(fetchedOfferings);
        setCustomerInfo(fetchedCustomerInfo);
      } catch (error) {
        console.error('useStoreKit: Failed to load data', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Purchase a package
  const purchasePackage = useCallback(async (pkg: PurchasesPackage): Promise<boolean> => {
    setIsLoading(true);
    try {
      const result = await storeKitService.purchasePackage(pkg);
      if (result.success && result.customerInfo) {
        setCustomerInfo(result.customerInfo);
      }
      return result.success;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Restore purchases
  const restorePurchases = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    try {
      const result = await storeKitService.restorePurchases();
      if (result.success && result.customerInfo) {
        setCustomerInfo(result.customerInfo);
      }
      return result.success;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Refresh customer info
  const refreshCustomerInfo = useCallback(async (): Promise<void> => {
    const info = await storeKitService.getCustomerInfo();
    if (info) {
      setCustomerInfo(info);
    }
  }, []);

  return {
    isLoading,
    offerings,
    customerInfo,
    isSubscribed,
    currentTier,
    purchasePackage,
    restorePurchases,
    refreshCustomerInfo,
  };
}
```

### Step 5.5: Update Subscription Screen

Update `client/screens/SubscriptionScreen.tsx` to use StoreKit on iOS:

```typescript
// Add these imports at the top
import { Platform } from 'react-native';
import { useStoreKit } from '@/hooks/useStoreKit';
import { storeKitService } from '@/lib/storekit-service';

// Inside the component, add:
const {
  isLoading: storeKitLoading,
  offerings,
  purchasePackage,
  restorePurchases,
  isSubscribed,
  currentTier,
} = useStoreKit();

// Modify the purchase handler:
const handleSubscribe = async (tier: 'basic' | 'pro', period: 'monthly' | 'annual') => {
  // Use StoreKit for iOS
  if (Platform.OS === 'ios' && offerings) {
    const packageId = `${tier}_${period}`;
    const pkg = offerings.availablePackages.find(p => 
      p.identifier.toLowerCase().includes(packageId)
    );
    
    if (pkg) {
      const success = await purchasePackage(pkg);
      if (success) {
        // Navigate to success screen or refresh state
        Alert.alert('Success', 'Your subscription is now active!');
      }
      return;
    }
  }
  
  // Use existing Stripe flow for Android/Web
  // ... existing Stripe code
};

// Add restore purchases button for iOS
{Platform.OS === 'ios' && (
  <Pressable onPress={restorePurchases} style={styles.restoreButton}>
    <ThemedText type="caption">Restore Purchases</ThemedText>
  </Pressable>
)}
```

### Step 5.6: Initialize StoreKit at App Startup

Update `client/App.tsx` or your root component:

```typescript
import { useEffect } from 'react';
import { storeKitService } from '@/lib/storekit-service';
import { useAuth } from '@/contexts/AuthContext';

function AppContent() {
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    // Initialize StoreKit
    storeKitService.initialize();
  }, []);

  useEffect(() => {
    // Set user ID when authenticated
    if (isAuthenticated && user?.id) {
      storeKitService.setUserId(user.id);
    } else {
      storeKitService.logout();
    }
  }, [isAuthenticated, user?.id]);

  // ... rest of component
}
```

### Step 5.7: Add Environment Variables

```
COPYABLE PROMPT:
---
Add these environment variables to your Replit secrets:

EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_your_key_here
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_your_key_here (if using Android)

Get these from RevenueCat Dashboard → Project → API Keys
---
```

---

## 6. Backend Receipt Validation

RevenueCat handles receipt validation automatically. However, you need to sync subscription status with your backend.

### Step 6.1: Configure RevenueCat Webhooks

```
COPYABLE PROMPT:
---
1. Go to RevenueCat Dashboard → Project Settings → Integrations
2. Add "Webhooks" integration
3. Webhook URL: https://your-domain.repl.co/api/revenuecat/webhook
4. Authorization Header: Bearer YOUR_WEBHOOK_SECRET
5. Select events: 
   - INITIAL_PURCHASE
   - RENEWAL
   - CANCELLATION
   - EXPIRATION
   - BILLING_ISSUE
6. Save
---
```

### Step 6.2: Create Webhook Handler

Add to `server/routes.ts`:

```typescript
import express from 'express';

// RevenueCat webhook handler
app.post('/api/revenuecat/webhook', express.json(), async (req, res) => {
  const webhookSecret = process.env.REVENUECAT_WEBHOOK_SECRET;
  const authHeader = req.headers.authorization;

  // Verify webhook authenticity
  if (authHeader !== `Bearer ${webhookSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const event = req.body;
  console.log('RevenueCat webhook:', event.type);

  try {
    const userId = event.app_user_id;
    const productId = event.product_id;
    const eventType = event.type;

    switch (eventType) {
      case 'INITIAL_PURCHASE':
      case 'RENEWAL':
        // Update user subscription in database
        await storage.updateUserSubscription(userId, {
          isActive: true,
          tier: productId.includes('pro') ? 'pro' : 'basic',
          expiresAt: new Date(event.expiration_at_ms),
          provider: 'apple',
        });
        break;

      case 'CANCELLATION':
      case 'EXPIRATION':
        // Mark subscription as inactive
        await storage.updateUserSubscription(userId, {
          isActive: false,
        });
        break;

      case 'BILLING_ISSUE':
        // Handle billing issues (grace period)
        await storage.updateUserSubscription(userId, {
          hasBillingIssue: true,
        });
        break;
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Processing failed' });
  }
});
```

---

## 7. Testing

### Step 7.1: Create StoreKit Configuration File

```
COPYABLE PROMPT:
---
In Xcode:

1. Open your iOS project (ios/ChefSpAIce.xcworkspace)
2. File → New → File
3. Choose "StoreKit Configuration File"
4. Name it: StoreKitConfiguration.storekit
5. Click "+" to add subscription
6. Add all 4 products matching App Store Connect:
   - com.chefspaice.basic.monthly ($4.99)
   - com.chefspaice.basic.annual ($49.99)
   - com.chefspaice.pro.monthly ($9.99)
   - com.chefspaice.pro.annual ($99.99)
7. Edit scheme → Run → Options → StoreKit Configuration → Select your file
---
```

### Step 7.2: Create Sandbox Tester Account

```
COPYABLE PROMPT:
---
1. Go to App Store Connect → Users and Access → Sandbox → Testers
2. Click (+) to add a new tester
3. Fill in details (use a unique email not linked to Apple ID)
4. Save the tester account

On your test device:
1. Settings → App Store → Sign Out
2. DO NOT sign in yet
3. Make a purchase in your app
4. When prompted, sign in with sandbox tester credentials
---
```

### Step 7.3: Test Purchase Flow

```
COPYABLE PROMPT:
---
Testing checklist:

1. [ ] Fresh install - no previous subscription
2. [ ] Purchase Basic monthly
3. [ ] Verify subscription activates
4. [ ] Cancel subscription
5. [ ] Purchase Pro annual
6. [ ] Verify upgrade works
7. [ ] Force close and reopen - subscription persists
8. [ ] Sign out and sign in - subscription restored
9. [ ] Tap "Restore Purchases" - works correctly
10. [ ] Test on different iOS versions (15, 16, 17)
---
```

---

## 8. Production Checklist

### Before Submitting to App Store

```
COPYABLE PROMPT:
---
Pre-submission checklist:

1. [ ] All 4 subscription products created in App Store Connect
2. [ ] Subscription products status: "Ready to Submit"
3. [ ] App Store Server Notifications configured
4. [ ] RevenueCat webhooks configured
5. [ ] Environment variables set for production
6. [ ] Restore Purchases button visible and working
7. [ ] Subscription terms displayed before purchase
8. [ ] Price and renewal information clearly visible
9. [ ] Cancel subscription instructions available
10. [ ] Tested with sandbox accounts
11. [ ] No crashes during purchase flow
12. [ ] Backend webhook handler deployed
---
```

### Subscription Terms Text (Required by Apple)

Add this text visible before purchase:

```
Payment will be charged to your Apple ID account at confirmation of purchase. Subscription automatically renews unless canceled at least 24 hours before the end of the current period. Your account will be charged for renewal within 24 hours prior to the end of the current period. You can manage and cancel your subscriptions by going to your account settings in the App Store after purchase.
```

---

## Quick Reference

### RevenueCat Dashboard URLs

- Dashboard: https://app.revenuecat.com
- API Keys: Dashboard → Project → API Keys
- Webhooks: Dashboard → Project → Integrations → Webhooks
- Sandbox Testing: Dashboard → Project → Customers (filter by sandbox)

### App Store Connect URLs

- Subscriptions: https://appstoreconnect.apple.com → My Apps → Features → Subscriptions
- Sandbox Testers: https://appstoreconnect.apple.com → Users and Access → Sandbox

### Useful Commands

```bash
# Build for iOS development
npx expo run:ios

# Build production iOS app
eas build --platform ios --profile production

# Check RevenueCat debug logs
# In your app, set: Purchases.setLogLevel(LOG_LEVEL.DEBUG)
```

---

## Troubleshooting

### "Cannot connect to iTunes Store"

- Ensure device has internet connection
- Try signing out of App Store and back in
- Check if subscription products are "Ready to Submit" in ASC

### Purchases not reflecting

- Call `getCustomerInfo()` to refresh
- Check RevenueCat dashboard for the customer
- Verify webhook is receiving events

### "This In-App Purchase has already been bought"

- User already has active subscription
- Call `restorePurchases()` to sync state

---

*Last updated: January 2026*
