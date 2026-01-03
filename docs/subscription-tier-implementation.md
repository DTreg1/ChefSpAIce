# Subscription Tier Implementation Guide

This guide provides step-by-step instructions for implementing the subscription tier system in ChefSpAIce. Each step includes a copyable prompt you can use with an AI assistant.

---

## Overview

### Tier Structure

| Feature | Basic ($4.99/mo) | Pro ($9.99/mo) |
|---------|------------------|----------------|
| Pantry Items | 25 | Unlimited |
| AI Generated Recipes | 5/month | Unlimited |
| Storage Areas | Basic (preset) | Customizable |
| Cookware Items | 5 | Unlimited |
| Item Scanning | ✓ | ✓ |
| Recipe Scanning | ✗ | ✓ |
| Bulk Scanning | ✗ | ✓ |
| Live AI Kitchen Assistant | ✗ | ✓ |
| Daily Meal Planning | ✓ | ✓ |
| Weekly Meal Prepping | ✗ | ✓ |

### Annual Pricing (2 months free)
- Basic: $49.90/year
- Pro: $99.90/year

---

## Step 1: Create Centralized Subscription Configuration

Create a shared configuration file that defines all tier limits and features in one place.

### Prompt:

```
Create a new file `shared/subscription.ts` that defines the subscription tier system for ChefSpAIce.

Include:

1. A TypeScript enum for subscription tiers: BASIC and PRO

2. An interface for tier limits with these properties:
   - maxPantryItems: number (25 for Basic, -1 for unlimited)
   - maxAiRecipesPerMonth: number (5 for Basic, -1 for unlimited)
   - maxCookwareItems: number (5 for Basic, -1 for unlimited)
   - canCustomizeStorageAreas: boolean
   - canUseRecipeScanning: boolean
   - canUseBulkScanning: boolean
   - canUseAiKitchenAssistant: boolean
   - canUseWeeklyMealPrepping: boolean

3. A TIER_CONFIG object mapping each tier to its limits

4. Helper functions:
   - getTierLimits(tier: SubscriptionTier): TierLimits
   - isFeatureEnabled(tier: SubscriptionTier, feature: string): boolean
   - isWithinLimit(tier: SubscriptionTier, limitKey: string, currentCount: number): boolean
   - getRemainingQuota(tier: SubscriptionTier, limitKey: string, currentCount: number): number | 'unlimited'

5. Pricing constants:
   - MONTHLY_PRICES: { BASIC: 4.99, PRO: 9.99 }
   - ANNUAL_PRICES: { BASIC: 49.90, PRO: 99.90 }

6. Stripe price IDs placeholders that can be filled in later

Make this file importable from both client and server code.
```

---

## Step 2: Add Subscription Tier to User Schema

Update the database schema to track each user's subscription tier.

### Prompt:

```
Update `shared/schema.ts` to add subscription tracking to the users table.

Add these fields to the users table:
- subscriptionTier: text (default 'BASIC')
- subscriptionStatus: text (default 'trialing' - options: trialing, active, canceled, expired)
- stripeCustomerId: text (nullable)
- stripeSubscriptionId: text (nullable)
- aiRecipesGeneratedThisMonth: integer (default 0)
- aiRecipesResetDate: timestamp (nullable - when the monthly count resets)

Also create the insert schema and types for these new fields.
```

---

## Step 3: Create Subscription Entitlements Service

Create a server-side service that checks user entitlements and enforces limits.

### Prompt:

```
Create a new file `server/services/subscriptionService.ts` that handles subscription entitlement checks.

Include these functions:

1. getUserEntitlements(userId: number): Promise<UserEntitlements>
   - Fetches user's tier and current usage counts
   - Returns their tier limits and remaining quotas

2. checkPantryItemLimit(userId: number): Promise<{allowed: boolean, remaining: number | 'unlimited', limit: number | 'unlimited'}>
   - Checks if user can add another pantry item
   - Returns whether allowed and remaining count

3. checkAiRecipeLimit(userId: number): Promise<{allowed: boolean, remaining: number | 'unlimited', limit: number | 'unlimited'}>
   - Checks if user can generate another AI recipe this month
   - Auto-resets count if past reset date

4. checkCookwareLimit(userId: number): Promise<{allowed: boolean, remaining: number | 'unlimited', limit: number | 'unlimited'}>
   - Checks if user can add another cookware item

5. checkFeatureAccess(userId: number, feature: string): Promise<boolean>
   - Checks if user's tier has access to a specific feature
   - Features: 'recipeScanning', 'bulkScanning', 'aiKitchenAssistant', 'weeklyMealPrepping', 'customStorageAreas'

6. incrementAiRecipeCount(userId: number): Promise<void>
   - Increments the monthly AI recipe counter after generation

7. resetMonthlyCountsIfNeeded(userId: number): Promise<void>
   - Resets AI recipe count if current date is past reset date
   - Sets new reset date to 1 month from now

Import and use the TIER_CONFIG from shared/subscription.ts.
```

---

## Step 4: Create Subscription API Endpoints

Add API endpoints for subscription management and entitlement checks.

### Prompt:

```
Add subscription-related endpoints to `server/routes.ts`:

1. GET /api/subscription/me
   - Returns current user's subscription info:
     - tier (BASIC or PRO)
     - status (trialing, active, canceled, expired)
     - entitlements (all limits and feature flags)
     - usage (current pantry count, AI recipes used this month, cookware count)
     - trialEndsAt (if trialing)

2. GET /api/subscription/check-limit/:limitType
   - limitType can be: 'pantryItems', 'aiRecipes', 'cookware'
   - Returns: { allowed: boolean, remaining: number | 'unlimited', limit: number | 'unlimited' }

3. GET /api/subscription/check-feature/:feature
   - feature can be: 'recipeScanning', 'bulkScanning', 'aiKitchenAssistant', 'weeklyMealPrepping', 'customStorageAreas'
   - Returns: { allowed: boolean, upgradeRequired: boolean }

4. POST /api/subscription/upgrade
   - Creates Stripe checkout session for upgrade to Pro
   - Redirects user to Stripe payment page

5. POST /api/webhooks/stripe
   - Handles Stripe webhook events:
     - checkout.session.completed: Update user tier to PRO
     - customer.subscription.updated: Update subscription status
     - customer.subscription.deleted: Downgrade to BASIC

All endpoints except webhooks require authentication.
```

---

## Step 5: Add Limit Enforcement to Existing Endpoints

Update existing API endpoints to enforce subscription limits.

### Prompt:

```
Update the following endpoints in `server/routes.ts` to enforce subscription limits:

1. POST /api/inventory (add pantry item)
   - Before adding, call checkPantryItemLimit()
   - If not allowed, return 403 with message: "Pantry item limit reached. Upgrade to Pro for unlimited items."
   - Include remaining count in response

2. POST /api/recipes/generate (AI recipe generation)
   - Before generating, call checkAiRecipeLimit()
   - If not allowed, return 403 with message: "Monthly AI recipe limit reached. Upgrade to Pro for unlimited recipes."
   - After successful generation, call incrementAiRecipeCount()
   - Include remaining count in response

3. POST /api/cookware (add cookware)
   - Before adding, call checkCookwareLimit()
   - If not allowed, return 403 with message: "Cookware limit reached. Upgrade to Pro for unlimited cookware."

4. POST /api/storage-areas (create custom storage area)
   - Check if user has 'customStorageAreas' feature access
   - If not, return 403 with message: "Custom storage areas are a Pro feature."

5. Any scanning endpoints for recipe/bulk scanning
   - Check feature access before processing
   - Return 403 if not allowed

6. AI Kitchen Assistant chat endpoint
   - Check 'aiKitchenAssistant' feature access
   - If not allowed, return 403 with upgrade prompt
```

---

## Step 6: Create Frontend Subscription Hook

Create a React hook for accessing subscription state throughout the app.

### Prompt:

```
Create a new file `client/hooks/useSubscription.ts` that provides subscription state to the app.

Include:

1. SubscriptionContext and SubscriptionProvider component
   - Fetches user's subscription info on mount
   - Refreshes after successful upgrade
   - Provides loading state

2. useSubscription() hook that returns:
   - tier: 'BASIC' | 'PRO'
   - status: 'trialing' | 'active' | 'canceled' | 'expired'
   - isProUser: boolean
   - isTrialing: boolean
   - trialDaysRemaining: number | null
   - entitlements: {
       maxPantryItems: number | 'unlimited'
       maxAiRecipes: number | 'unlimited'
       maxCookware: number | 'unlimited'
       canCustomizeStorageAreas: boolean
       canUseRecipeScanning: boolean
       canUseBulkScanning: boolean
       canUseAiKitchenAssistant: boolean
       canUseWeeklyMealPrepping: boolean
     }
   - usage: {
       pantryItemCount: number
       aiRecipesUsedThisMonth: number
       cookwareCount: number
     }
   - checkLimit: (type: 'pantryItems' | 'aiRecipes' | 'cookware') => { allowed: boolean, remaining: number | 'unlimited' }
   - checkFeature: (feature: string) => boolean
   - refetch: () => void

3. Add the SubscriptionProvider to the app's provider hierarchy in App.tsx
```

---

## Step 7: Create Upgrade Prompt Component

Create a reusable component for showing upgrade prompts.

### Prompt:

```
Create a new file `client/components/UpgradePrompt.tsx` that shows when users hit limits.

Include:

1. UpgradePrompt component with props:
   - type: 'limit' | 'feature'
   - limitName?: string (e.g., "pantry items", "AI recipes")
   - featureName?: string (e.g., "Live AI Kitchen Assistant")
   - remaining?: number
   - onUpgrade: () => void
   - onDismiss: () => void

2. Different messaging based on type:
   - Limit: "You've used X of Y [limitName]. Upgrade to Pro for unlimited access."
   - Feature: "[featureName] is a Pro feature. Upgrade to unlock it."

3. Show Pro benefits relevant to the limit/feature being hit

4. Two buttons: "Upgrade to Pro" and "Maybe Later"

5. Use the app's glass card styling for consistency

6. Also create a smaller inline version (UpgradeBadge) for showing in headers/lists
```

---

## Step 8: Add Limit Checks to Inventory Screen

Update the inventory screen to respect pantry item limits.

### Prompt:

```
Update the inventory screen to enforce the 25 pantry item limit for Basic users.

1. Import and use the useSubscription hook

2. Before the "Add Item" button:
   - Check remaining pantry item quota
   - If at limit, disable the button and show remaining count
   - Show UpgradePrompt modal when limit is reached

3. Display usage indicator:
   - For Basic users: Show "X/25 items" near the top
   - For Pro users: Show "X items" (no limit shown)

4. When user tries to add item at limit:
   - Show UpgradePrompt explaining the limit
   - Offer upgrade to Pro

5. After successful item addition:
   - Refetch subscription to update counts
```

---

## Step 9: Add Limit Checks to Recipe Generation

Update the recipe generation to respect the 5/month limit for Basic users.

### Prompt:

```
Update the recipe generation flow to enforce the 5 AI recipes per month limit for Basic users.

1. On the recipe generation screen:
   - Show remaining recipe count: "X/5 AI recipes remaining this month" for Basic
   - Show "Unlimited AI recipes" badge for Pro users

2. Before generating a recipe:
   - Check AI recipe limit via useSubscription
   - If at limit, show UpgradePrompt instead of generating
   - Explain that limit resets monthly

3. After successful generation:
   - Decrement the displayed remaining count
   - Show celebratory message for Pro users or remaining count for Basic

4. Add a small indicator on the Recipes tab showing remaining generations for Basic users
```

---

## Step 10: Gate Pro-Only Features

Add feature gating for Pro-exclusive features.

### Prompt:

```
Update these screens/features to check for Pro access:

1. Recipe Scanning (Pro only):
   - In the Scan Hub, check canUseRecipeScanning
   - If Basic user, show lock icon and "Pro" badge on the button
   - Tapping shows UpgradePrompt explaining the feature

2. Bulk Scanning (Pro only):
   - Same approach as Recipe Scanning
   - Show what bulk scanning does in the upgrade prompt

3. AI Kitchen Assistant / Floating Chat (Pro only):
   - Check canUseAiKitchenAssistant before showing the chat
   - For Basic users, show a teaser: "Upgrade to Pro to chat with your AI Kitchen Assistant"
   - Maybe show 1 free message as a teaser?

4. Custom Storage Areas (Pro only):
   - On storage area management screen, show "Add Custom Area" only for Pro
   - Basic users see preset areas only with upgrade prompt to add custom ones

5. Weekly Meal Prepping (Pro only):
   - In meal planning, show daily view for all
   - Weekly view/meal prep features show upgrade prompt for Basic users
```

---

## Step 11: Add Cookware Limit Enforcement

Update cookware/equipment selection to respect the 5 item limit.

### Prompt:

```
Update the cookware/equipment selection screen to enforce the 5 item limit for Basic users.

1. Show current count: "X/5 cookware items selected" for Basic users

2. When 5 items are selected:
   - Disable additional selections
   - Show message: "Remove an item to select a different one, or upgrade to Pro for unlimited cookware"

3. Allow deselecting items to make room for different selections

4. Pro users see no limit - can select all available cookware

5. On the onboarding equipment step:
   - Enforce the same 5-item limit
   - Show upgrade option if user wants more

6. In recipe generation:
   - Only use the user's selected cookware (max 5 for Basic)
   - Pro users get recipes using any of their unlimited cookware
```

---

## Step 12: Add Subscription Management Screen

Create a screen where users can view and manage their subscription.

### Prompt:

```
Create a new screen `client/screens/SubscriptionScreen.tsx` for subscription management.

Include:

1. Current plan display:
   - Plan name (Basic or Pro)
   - Price (monthly/annual)
   - Status (Active, Trialing with days remaining, Canceled)

2. Usage summary:
   - Pantry items: X/25 or X (unlimited)
   - AI recipes this month: X/5 or X (unlimited)
   - Cookware: X/5 or X (unlimited)

3. Feature comparison table:
   - Show all features with checkmarks/X for each tier
   - Highlight what user would gain by upgrading

4. For Basic users:
   - "Upgrade to Pro" button
   - Show savings for annual plan

5. For Pro users:
   - "Manage Subscription" button (opens Stripe portal)
   - Option to switch between monthly/annual

6. For trialing users:
   - Show trial end date
   - Explain what happens when trial ends

7. Link to this screen from Profile tab
```

---

## Step 13: Update Stripe Integration

Connect the tier system to Stripe for payment processing.

### Prompt:

```
Update the Stripe integration to handle subscription tier changes.

1. Create Stripe products and prices:
   - Product: "ChefSpAIce Basic"
     - Monthly price: $4.99
     - Annual price: $49.90
   - Product: "ChefSpAIce Pro"
     - Monthly price: $9.99
     - Annual price: $99.90

2. Update the upgrade endpoint to:
   - Create Stripe checkout session with correct price ID
   - Include user ID in metadata
   - Set success/cancel URLs

3. Update webhook handler for:
   - checkout.session.completed:
     - Extract user ID from metadata
     - Update user's subscriptionTier to match purchased plan
     - Set subscriptionStatus to 'active'
     - Store stripeCustomerId and stripeSubscriptionId

   - customer.subscription.updated:
     - Handle plan changes (upgrade/downgrade)
     - Update tier accordingly

   - customer.subscription.deleted:
     - Set subscriptionTier back to 'BASIC'
     - Set subscriptionStatus to 'canceled'

   - invoice.payment_failed:
     - Set subscriptionStatus to 'past_due'
     - Send notification to user

4. Add Stripe customer portal for subscription management
```

---

## Step 14: Handle Trial Expiration

Implement trial period logic and expiration handling.

### Prompt:

```
Implement 7-day trial period logic:

1. On new user registration:
   - Set subscriptionStatus to 'trialing'
   - Set trialEndsAt to 7 days from now
   - Grant Pro-level access during trial

2. Create a background job or check:
   - Run daily to check for expired trials
   - When trial expires:
     - Set subscriptionStatus to 'expired'
     - Downgrade access to Basic limits
     - Don't delete data, just enforce limits going forward

3. On app load for trialing users:
   - Check if trial has expired
   - If expired, show "Trial Ended" modal with upgrade options
   - Explain they still have Basic access

4. Show trial status:
   - "X days left in trial" badge
   - Reminder at 3 days, 1 day remaining
   - Push notification option for trial ending

5. During trial:
   - Users get full Pro access
   - Show what features they'll lose if they don't upgrade
```

---

## Step 15: Testing the Implementation

Create tests to verify the subscription system works correctly.

### Prompt:

```
Create tests for the subscription tier system:

1. Unit tests for shared/subscription.ts:
   - Test getTierLimits returns correct limits for each tier
   - Test isFeatureEnabled for all features
   - Test isWithinLimit boundary conditions
   - Test getRemainingQuota calculations

2. API tests for subscription endpoints:
   - Test /api/subscription/me returns correct entitlements
   - Test limit check endpoints
   - Test feature check endpoints

3. Integration tests for limit enforcement:
   - Test adding 26th pantry item as Basic user fails
   - Test adding 26th item as Pro user succeeds
   - Test generating 6th AI recipe as Basic user fails
   - Test Pro features return 403 for Basic users

4. Frontend tests:
   - Test UpgradePrompt displays correctly
   - Test limit indicators show correct counts
   - Test Pro badges appear on gated features

5. Stripe webhook tests:
   - Test successful checkout updates tier
   - Test subscription cancellation downgrades tier
```

---

## Summary Checklist

- [ ] Step 1: Create `shared/subscription.ts` with tier configuration
- [ ] Step 2: Add subscription fields to user schema
- [ ] Step 3: Create subscription entitlements service
- [ ] Step 4: Add subscription API endpoints
- [ ] Step 5: Add limit enforcement to existing endpoints
- [ ] Step 6: Create useSubscription hook
- [ ] Step 7: Create UpgradePrompt component
- [ ] Step 8: Update inventory screen with limits
- [ ] Step 9: Update recipe generation with limits
- [ ] Step 10: Gate Pro-only features
- [ ] Step 11: Add cookware limit enforcement
- [ ] Step 12: Create subscription management screen
- [ ] Step 13: Connect Stripe for payments
- [ ] Step 14: Implement trial expiration
- [ ] Step 15: Add tests

---

## Maintenance Notes

### To Change Limits
Edit `shared/subscription.ts` - all limits are defined in the `TIER_CONFIG` object.

### To Add New Features
1. Add feature flag to `TierLimits` interface
2. Add to `TIER_CONFIG` for each tier
3. Add check in relevant endpoint/screen

### To Add New Tier
1. Add to `SubscriptionTier` enum
2. Add configuration to `TIER_CONFIG`
3. Create Stripe product/prices
4. Update UI to show new tier option

### To Change Pricing
1. Update `MONTHLY_PRICES` and `ANNUAL_PRICES` in subscription.ts
2. Create new Stripe prices (don't modify existing)
3. Update landing page pricing display
