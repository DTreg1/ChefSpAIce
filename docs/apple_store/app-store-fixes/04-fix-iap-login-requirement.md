# Fix 4: IAP Login Requirement

**STATUS: COMPLETE**

## Problem
Apple rejected the app under Guideline 5.1.1 because the app requires users to log in before they can make an in-app purchase. RevenueCat allows anonymous purchases, but the server sync fails without authentication.

## Current Behavior (FIXED)
- ~~User must log in before purchasing a subscription~~ **Users can now purchase without logging in**
- ~~Purchase sync to server fails if `authToken` is not set~~ **Purchases are stored locally and synced after login**
- ~~This violates Apple's requirement to allow purchases before account creation~~ **Now compliant**

## Goal
Allow users to purchase subscriptions anonymously, then associate the purchase with their account when they create one.

## Implementation Summary

The following changes were made:

### 1. Storage (`client/lib/storage.ts`)
- Added `PENDING_PURCHASE` storage key
- Added `savePendingPurchase()`, `getPendingPurchase()`, `clearPendingPurchase()` methods

### 2. StoreKit Service (`client/lib/storekit-service.ts`)
- Modified `syncPurchaseWithServer()` to save pending purchases when not authenticated
- Added `syncPendingPurchases()` method to sync after authentication
- Added `hasPendingPurchase()` method to check for pending purchases

### 3. AuthContext (`client/contexts/AuthContext.tsx`)
- All auth paths now sync pending purchases:
  - Auth restore from AsyncStorage
  - Auth restore from cookie (web)
  - signIn (email/password)
  - signUp (new registration)
  - signInWithApple
  - signInWithGoogle
- Each path calls `storeKitService.setAuthToken()`, `storeKitService.setUserId()`, and `storeKitService.syncPendingPurchases()`

---

## Step-by-Step Instructions

### Step 1: Analyze Current StoreKit Implementation

```
Read the file client/lib/storekit-service.ts and identify all places where authentication is required for purchases. Look for authToken checks and syncPurchaseWithServer calls.
```

### Step 2: Modify StoreKit Service to Allow Anonymous Purchases

```
In client/lib/storekit-service.ts, modify the purchase flow to:
1. Allow purchases without authToken
2. Store purchase receipts locally when user is not authenticated
3. Queue pending purchases for sync when user logs in
4. Add a method to sync pending purchases after authentication

Create a pendingPurchaseSync mechanism that:
- Saves CustomerInfo to AsyncStorage when no authToken
- Provides a method syncPendingPurchases() to be called after login
- Updates the purchaseSubscription method to not require auth
```

### Step 3: Update AuthContext to Sync Pending Purchases After Login

```
In client/contexts/AuthContext.tsx, after successful login or registration:
1. Import the StoreKit service
2. Call syncPendingPurchases() after setting the auth token
3. Handle any errors gracefully
```

### Step 4: Update SubscriptionScreen to Allow Unauthenticated Access

```
In client/screens/SubscriptionScreen.tsx:
1. Remove any guards that prevent unauthenticated users from viewing/purchasing
2. Show subscription options to all users
3. After purchase, prompt user to create account to save their subscription
4. If user already has account, sync automatically
```

### Step 5: Create Pending Purchase Storage Helper

```
In client/lib/storage.ts, add methods:
1. savePendingPurchase(customerInfo: CustomerInfo): Promise<void>
2. getPendingPurchase(): Promise<CustomerInfo | null>
3. clearPendingPurchase(): Promise<void>

Use the key "@chefspaice/pending_purchase" for AsyncStorage.
```

### Step 6: Update Server to Handle Delayed Purchase Sync

```
In server/routers/subscription.router.ts, ensure the sync-purchase endpoint can handle:
1. Purchases that occurred before account creation
2. RevenueCat anonymous user ID association
3. Transfer of subscription from anonymous to authenticated user
```

### Step 7: Test the Flow

```
Test the following user journey:
1. Fresh app install (no account)
2. Navigate to subscription screen
3. Purchase a subscription (should work without login)
4. Create an account
5. Verify subscription is synced to the account
6. Sign out and sign back in
7. Verify subscription is still associated with account
```

---

## Code Snippets

### Pending Purchase Storage (storage.ts)

```typescript
const PENDING_PURCHASE_KEY = "@chefspaice/pending_purchase";

async savePendingPurchase(customerInfo: any): Promise<void> {
  await AsyncStorage.setItem(PENDING_PURCHASE_KEY, JSON.stringify({
    customerInfo,
    timestamp: Date.now(),
  }));
}

async getPendingPurchase(): Promise<any | null> {
  const data = await AsyncStorage.getItem(PENDING_PURCHASE_KEY);
  return data ? JSON.parse(data) : null;
}

async clearPendingPurchase(): Promise<void> {
  await AsyncStorage.removeItem(PENDING_PURCHASE_KEY);
}
```

### Modified Purchase Flow (storekit-service.ts)

```typescript
async purchaseSubscription(productId: string): Promise<PurchaseResult> {
  try {
    const { customerInfo } = await Purchases.purchaseProduct(productId);
    
    if (this.authToken) {
      // User is logged in, sync immediately
      await this.syncPurchaseWithServer(customerInfo);
    } else {
      // User is anonymous, save for later sync
      await storage.savePendingPurchase(customerInfo);
    }
    
    return { success: true, customerInfo };
  } catch (error) {
    // Handle error
  }
}

async syncPendingPurchases(): Promise<boolean> {
  if (!this.authToken) return false;
  
  const pending = await storage.getPendingPurchase();
  if (!pending) return true;
  
  const success = await this.syncPurchaseWithServer(pending.customerInfo);
  if (success) {
    await storage.clearPendingPurchase();
  }
  return success;
}
```

---

## Verification Checklist

- [ ] Unauthenticated users can view subscription options
- [ ] Unauthenticated users can complete purchase via Apple Pay
- [ ] Purchase receipt is stored locally when not logged in
- [ ] After account creation, subscription syncs to server
- [ ] Subscription status persists across sign-out/sign-in
- [ ] RevenueCat dashboard shows proper user association
