# Fix 4: Implement Server-Side Account Deletion

## Problem
Apple requires that apps with account creation also provide account deletion functionality (Guideline 5.1.1(v) and 5.1.1(vi)). The current implementation only clears local storage but doesn't delete user data from the server database.

## Current Behavior
- Client calls `storage.deleteAccount()` which only clears AsyncStorage
- User data remains in PostgreSQL database
- Subscriptions remain active with payment providers
- User can't truly delete their account and data

## Goal
Implement a complete server-side account deletion that:
1. Deletes all user data from the database
2. Cancels active subscriptions
3. Revokes all sessions
4. Confirms deletion to the client

---

## Step-by-Step Instructions

### Step 1: Create the Delete Account Endpoint

```
In server/routers/auth.router.ts, create a new DELETE endpoint:

DELETE /api/auth/delete-account

Requirements:
- Requires authentication (bearer token)
- Validates the user exists
- Deletes all associated data
- Returns confirmation
```

### Step 2: Identify All User Data Tables

```
Review shared/schema.ts to identify all tables with user data:

1. users - The main user record
2. userSessions - Active login sessions
3. userSyncData - Synced inventory, recipes, meal plans
4. subscriptions - Subscription records
5. userAppliances - Kitchen equipment preferences

All these must be deleted when account is deleted.
```

### Step 3: Cancel External Subscriptions

```
Before deleting database records, cancel subscriptions with:

1. RevenueCat - Call their API to delete subscriber
2. Stripe - Cancel any active Stripe subscriptions

This prevents users from being charged after deletion.
```

### Step 4: Implement the Deletion Logic

```
In server/routers/auth.router.ts, add the delete endpoint with this logic:

1. Extract user ID from authenticated request
2. Cancel RevenueCat subscription (if exists)
3. Cancel Stripe subscription (if exists)
4. Delete from userAppliances where userId = id
5. Delete from subscriptions where userId = id
6. Delete from userSyncData where id = id
7. Delete from userSessions where userId = id
8. Delete from users where id = id
9. Return success response
```

### Step 5: Update Client to Call Server Deletion

```
In client/screens/SettingsScreen.tsx, update the delete account flow:

1. Show confirmation dialog (already exists)
2. Call DELETE /api/auth/delete-account
3. Wait for server confirmation
4. Clear local storage
5. Sign out user
6. Navigate to auth screen
```

### Step 6: Add RevenueCat Subscriber Deletion

```
In server/lib/revenueCat.ts (or create if not exists):

1. Use RevenueCat REST API to delete subscriber
2. Endpoint: DELETE https://api.revenuecat.com/v1/subscribers/{app_user_id}
3. Requires RevenueCat API key
4. Handle errors gracefully (don't block deletion if RC fails)
```

### Step 7: Add Stripe Subscription Cancellation

```
In server/lib/stripe.ts:

1. Find active subscriptions for user email
2. Cancel all subscriptions immediately
3. Confirm cancellation
4. Handle errors gracefully
```

### Step 8: Add Deletion Confirmation Email (Optional)

```
Send a confirmation email to the user after deletion:
- Confirm account was deleted
- Provide support contact if they have questions
- Required by GDPR for EU users
```

---

## Code Snippets

### Delete Account Endpoint (auth.router.ts)

```typescript
import { eq } from "drizzle-orm";
import { db } from "../db";
import { users, userSessions, userSyncData, subscriptions, userAppliances } from "@shared/schema";

router.delete("/delete-account", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const userEmail = req.user.email;
    
    console.log(`[DeleteAccount] Starting deletion for user: ${userId}`);
    
    // Step 1: Cancel RevenueCat subscription
    try {
      await cancelRevenueCatSubscription(userId);
      console.log(`[DeleteAccount] RevenueCat subscription cancelled`);
    } catch (error) {
      console.warn(`[DeleteAccount] RevenueCat cancellation failed:`, error);
      // Continue with deletion even if RC fails
    }
    
    // Step 2: Cancel Stripe subscriptions
    try {
      await cancelStripeSubscriptions(userEmail);
      console.log(`[DeleteAccount] Stripe subscriptions cancelled`);
    } catch (error) {
      console.warn(`[DeleteAccount] Stripe cancellation failed:`, error);
      // Continue with deletion even if Stripe fails
    }
    
    // Step 3: Delete all user data from database
    await db.transaction(async (tx) => {
      // Delete appliances
      await tx.delete(userAppliances).where(eq(userAppliances.userId, userId));
      
      // Delete subscriptions
      await tx.delete(subscriptions).where(eq(subscriptions.userId, userId));
      
      // Delete sync data
      await tx.delete(userSyncData).where(eq(userSyncData.id, userId));
      
      // Delete sessions
      await tx.delete(userSessions).where(eq(userSessions.userId, userId));
      
      // Delete user
      await tx.delete(users).where(eq(users.id, userId));
    });
    
    console.log(`[DeleteAccount] User ${userId} deleted successfully`);
    
    res.json({ 
      success: true, 
      message: "Account and all associated data have been permanently deleted" 
    });
    
  } catch (error) {
    console.error(`[DeleteAccount] Error:`, error);
    res.status(500).json({ 
      error: "Failed to delete account. Please try again or contact support." 
    });
  }
});
```

### RevenueCat Deletion (revenueCat.ts)

```typescript
const REVENUECAT_API_KEY = process.env.REVENUECAT_API_KEY;
const REVENUECAT_API_URL = "https://api.revenuecat.com/v1";

export async function cancelRevenueCatSubscription(appUserId: string): Promise<void> {
  if (!REVENUECAT_API_KEY) {
    console.warn("RevenueCat API key not configured");
    return;
  }
  
  const response = await fetch(
    `${REVENUECAT_API_URL}/subscribers/${appUserId}`,
    {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${REVENUECAT_API_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );
  
  if (!response.ok && response.status !== 404) {
    throw new Error(`RevenueCat deletion failed: ${response.status}`);
  }
}
```

### Client Update (SettingsScreen.tsx)

```typescript
const handleDeleteAccountConfirmed = async () => {
  try {
    setIsDeleting(true);
    
    // Call server to delete account
    const response = await fetch('/api/auth/delete-account', {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete account');
    }
    
    // Clear local storage
    await storage.deleteAccount();
    
    // Sign out
    await signOut();
    
    // Show success message
    Alert.alert(
      'Account Deleted',
      'Your account and all data have been permanently deleted.',
      [{ text: 'OK' }]
    );
    
  } catch (error) {
    Alert.alert(
      'Deletion Failed',
      'Unable to delete your account. Please try again or contact support.',
      [{ text: 'OK' }]
    );
  } finally {
    setIsDeleting(false);
  }
};
```

---

## Database Tables to Delete

| Table | Column to Match | Notes |
|-------|-----------------|-------|
| userAppliances | userId | Kitchen equipment |
| subscriptions | userId | Subscription records |
| userSyncData | id | Inventory, recipes, meal plans |
| userSessions | userId | Login sessions |
| users | id | Main user record (delete last) |

---

## Verification Checklist

- [ ] DELETE /api/auth/delete-account endpoint created
- [ ] Endpoint requires authentication
- [ ] RevenueCat subscription cancellation implemented
- [ ] Stripe subscription cancellation implemented
- [ ] All user data deleted from database
- [ ] Deletion wrapped in transaction (atomic)
- [ ] Client calls server before clearing local storage
- [ ] User is signed out after deletion
- [ ] Error handling for partial failures
- [ ] Tested: Create account -> Add data -> Delete -> Verify data gone
- [ ] Tested: Delete with active subscription -> Verify cancelled
