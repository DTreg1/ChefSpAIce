# Subscription Pricing Implementation Guide

## Overview
This guide transitions the app from a free/donation model to a paid subscription model:
- **Monthly:** $4.99/month with 7-day free trial
- **Annual:** $49.90/year (12 months for price of 10) with 7-day free trial
- **No free tier** - subscription required after trial
- **No guest accounts** - removed entirely

---

## Phase 1: Database Schema Updates

### Prompt 1.1: Add Subscription Schema
```
Add subscription tracking to the database schema. In shared/schema.ts, add a new `subscriptions` table with the following fields:

- id (varchar, primary key, auto-generated UUID)
- userId (varchar, foreign key to users.id, unique - one subscription per user)
- stripeCustomerId (varchar, nullable - Stripe customer ID)
- stripeSubscriptionId (varchar, nullable - Stripe subscription ID)
- stripePriceId (varchar, nullable - which price they subscribed to)
- status (varchar - 'trialing', 'active', 'past_due', 'canceled', 'expired', 'incomplete')
- planType (varchar - 'monthly' or 'annual')
- currentPeriodStart (timestamp)
- currentPeriodEnd (timestamp)
- trialStart (timestamp, nullable)
- trialEnd (timestamp, nullable)
- cancelAtPeriodEnd (boolean, default false)
- canceledAt (timestamp, nullable)
- createdAt (timestamp, default now)
- updatedAt (timestamp, default now)

Also add:
- An index on stripeCustomerId
- An index on stripeSubscriptionId
- An index on status
- The insert schema using createInsertSchema
- Export types for InsertSubscription and Subscription

Run the database migration after schema changes.
```

### Prompt 1.2: Add Subscription Status to User Response
```
Update the /api/auth/me endpoint and login/register responses to include subscription status. The user object returned should include:

- subscriptionStatus: 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired' | 'none'
- subscriptionPlanType: 'monthly' | 'annual' | null
- trialEndsAt: ISO date string | null
- subscriptionEndsAt: ISO date string | null

Query the subscriptions table when returning user data. If no subscription exists, return status 'none'.
```

---

## Phase 2: Stripe Products Setup

### Prompt 2.1: Create Subscription Products Endpoint
```
Create a new file server/stripe/subscriptionRouter.ts with the following endpoints:

1. GET /api/subscriptions/prices
   - Returns available subscription prices (monthly and annual)
   - Include price IDs, amounts, intervals, and trial days
   - Cache this data since prices rarely change

2. POST /api/subscriptions/create-checkout-session
   - Requires authenticated user
   - Request body: { priceId: string, successUrl?: string, cancelUrl?: string }
   - Creates or retrieves Stripe customer using user's email
   - Creates Stripe Checkout Session with:
     - mode: 'subscription'
     - subscription_data.trial_period_days: 7
     - customer: stripeCustomerId
     - Allow promotion codes
   - Returns { sessionId, url }

3. POST /api/subscriptions/create-portal-session
   - Requires authenticated user
   - Creates Stripe Billing Portal session for self-service management
   - Returns { url }

4. GET /api/subscriptions/status
   - Requires authenticated user
   - Returns current subscription status from database

Register this router in server/routes.ts under /api/subscriptions
```

### Prompt 2.2: Stripe Price Configuration Constants
```
Create server/stripe/subscriptionConfig.ts with subscription configuration:

export const SUBSCRIPTION_CONFIG = {
  TRIAL_DAYS: 7,
  MONTHLY: {
    priceId: process.env.STRIPE_MONTHLY_PRICE_ID || '',
    amount: 499, // $4.99 in cents
    interval: 'month',
    name: 'Monthly Subscription',
  },
  ANNUAL: {
    priceId: process.env.STRIPE_ANNUAL_PRICE_ID || '',
    amount: 4990, // $49.90 in cents (2 months free)
    interval: 'year', 
    name: 'Annual Subscription',
  },
};

export function getPlanTypeFromPriceId(priceId: string): 'monthly' | 'annual' | null {
  if (priceId === SUBSCRIPTION_CONFIG.MONTHLY.priceId) return 'monthly';
  if (priceId === SUBSCRIPTION_CONFIG.ANNUAL.priceId) return 'annual';
  return null;
}

Note: You'll need to create the actual Stripe Price objects in the Stripe Dashboard and add STRIPE_MONTHLY_PRICE_ID and STRIPE_ANNUAL_PRICE_ID to your environment variables.
```

---

## Phase 3: Webhook Handlers for Subscriptions

### Prompt 3.1: Add Subscription Webhook Handlers
```
Update server/stripe/webhookHandlers.ts to handle subscription lifecycle events. Add handlers for:

1. checkout.session.completed (when subscription is created)
   - Extract customer ID, subscription ID from session
   - Create/update subscription record in database
   - Link stripeCustomerId to user if not already linked

2. customer.subscription.created
   - Create subscription record with status, trial dates, period dates

3. customer.subscription.updated
   - Update subscription status, dates, cancelAtPeriodEnd
   - Handle trial ending, payment method updates

4. customer.subscription.deleted
   - Mark subscription as 'canceled' or 'expired'
   - Set canceledAt timestamp

5. invoice.paid
   - Confirm subscription is active
   - Update currentPeriodEnd

6. invoice.payment_failed
   - Update status to 'past_due'
   - Could trigger notification to user

For each webhook:
- Look up user by stripeCustomerId
- Update the subscriptions table appropriately
- Use upsert logic to handle race conditions
- Log all webhook events for debugging
```

### Prompt 3.2: Create Subscription Database Functions
```
Create server/stripe/subscriptionService.ts with helper functions:

1. getSubscriptionByUserId(userId: string): Promise<Subscription | null>
   - Query subscriptions table by userId

2. getSubscriptionByStripeId(stripeSubscriptionId: string): Promise<Subscription | null>
   - Query subscriptions table by stripeSubscriptionId

3. createOrUpdateSubscription(data: Partial<InsertSubscription>): Promise<Subscription>
   - Upsert subscription record

4. getUserByStripeCustomerId(customerId: string): Promise<User | null>
   - Find user linked to Stripe customer

5. linkStripeCustomerToUser(userId: string, customerId: string): Promise<void>
   - Update user's subscription record with Stripe customer ID

6. isSubscriptionActive(subscription: Subscription | null): boolean
   - Returns true if status is 'trialing' or 'active'

7. getTrialDaysRemaining(subscription: Subscription | null): number
   - Calculate days remaining in trial
```

---

## Phase 4: Frontend Subscription Flow

### Prompt 4.1: Create Pricing Page Component
```
Create a new page client/src/pages/pricing.tsx with:

1. Pricing cards for Monthly ($4.99/mo) and Annual ($49.90/yr with "Save $10" badge)
2. Highlight the 7-day free trial prominently
3. "Start Free Trial" buttons that:
   - If not logged in, redirect to signup first
   - If logged in, call POST /api/subscriptions/create-checkout-session
   - Redirect to Stripe Checkout URL

4. Show current subscription status if user is subscribed
5. "Manage Subscription" button that opens Stripe Billing Portal

Use the existing Card, Button components from shadcn.
Add data-testid attributes for all interactive elements.
Style with feature comparison list showing what's included.
```

### Prompt 4.2: Create Subscription Context/Hook
```
Create client/src/hooks/useSubscription.ts:

1. useSubscription() hook that:
   - Queries /api/subscriptions/status
   - Returns { subscription, isLoading, isActive, isTrialing, trialDaysRemaining }
   - isActive = status is 'active' or 'trialing'

2. useRequireSubscription() hook that:
   - Uses useSubscription()
   - Redirects to /pricing if not active
   - Shows loading state while checking

3. SubscriptionGate component:
   - Wraps children that require active subscription
   - Shows upgrade prompt if not subscribed
   - Shows trial countdown if in trial
```

### Prompt 4.3: Create Subscription Success/Cancel Pages
```
Create client/src/pages/subscription-success.tsx:
- Thank you message
- Trial information if applicable
- Link to start using the app
- Fetch session details from URL param to confirm

Create client/src/pages/subscription-canceled.tsx:
- Message that they can try again anytime
- Link back to pricing page
- No pressure messaging

Register both routes in App.tsx
```

---

## Phase 5: Protect Routes & Gate Features

### Prompt 5.1: Add Subscription Middleware
```
Create server/middleware/requireSubscription.ts:

Middleware that:
1. Extracts user from request (assumes auth middleware ran first)
2. Queries user's subscription status
3. Returns 403 with { error: 'subscription_required', message: 'Active subscription required' } if:
   - No subscription exists
   - Subscription status is 'canceled', 'expired', or 'past_due'
4. Allows request to continue if status is 'active' or 'trialing'

Apply this middleware to all protected API routes (sync, recipes, meal plans, etc.)
```

### Prompt 5.2: Frontend Route Protection
```
Update client/src/App.tsx to:

1. Wrap protected routes with subscription check
2. Redirect to /pricing if user is authenticated but has no active subscription
3. Allow access to: /pricing, /login, /register, /subscription-success, /subscription-canceled

Update the main app layout to show:
- Trial countdown banner when status is 'trialing'
- "Subscription expiring" warning when past_due
- Quick link to manage subscription in user menu
```

---

## Phase 6: Remove Guest/Free Features

### Prompt 6.1: Remove Guest Account Logic
```
Search the codebase for any guest account or anonymous user logic and remove it:

1. Remove guest login options from login/register screens
2. Remove any "Continue as Guest" buttons
3. Remove any localStorage-only data sync for non-authenticated users
4. Update any conditional logic that checked for guest status

All users must now authenticate and subscribe.
```

### Prompt 6.2: Remove Donation Flow
```
The donation system can be kept as an optional "tip" for grateful users, OR removed entirely. 

If keeping donations:
- Move donate button to settings/about page
- Keep existing donation router

If removing donations:
- Remove server/stripe/donationsRouter.ts
- Remove donation UI components
- Remove donation routes from server/routes.ts
```

---

## Phase 7: Admin & Monitoring

### Prompt 7.1: Add Subscription Admin View
```
If you have an admin panel, add a subscription management section:

1. List all subscriptions with user info
2. Filter by status (trialing, active, past_due, canceled)
3. View subscription details (dates, plan type, Stripe links)
4. Quick stats: total active, trial conversion rate, MRR

This can query the subscriptions table and join with users.
```

---

## Environment Variables Needed

Add these to your Replit Secrets:
```
STRIPE_MONTHLY_PRICE_ID=price_xxxxxxxxxxxx
STRIPE_ANNUAL_PRICE_ID=price_xxxxxxxxxxxx
```

You'll create these Price IDs in the Stripe Dashboard:
1. Go to Stripe Dashboard > Products
2. Create a new Product (e.g., "App Subscription")
3. Add two Prices:
   - Monthly: $4.99/month, recurring
   - Annual: $49.90/year, recurring
4. Copy the Price IDs to your environment variables

---

## Testing Checklist

After implementation, test these flows:
- [ ] New user signup → redirected to pricing
- [ ] Start monthly trial → Stripe Checkout → success page → app access
- [ ] Start annual trial → Stripe Checkout → success page → app access
- [ ] Trial user can access all features
- [ ] Trial countdown displays correctly
- [ ] Manage subscription opens Billing Portal
- [ ] Cancel subscription → can still use until period end
- [ ] Expired subscription → blocked from app, redirected to pricing
- [ ] Webhook handles subscription.updated correctly
- [ ] Webhook handles subscription.deleted correctly
- [ ] Past due subscription shows warning

Use Stripe test cards:
- Success: 4242 4242 4242 4242
- Decline: 4000 0000 0000 0002
- Requires auth: 4000 0025 0000 3155

---

## Rollout Strategy

1. **Development Testing:** Complete all prompts, test thoroughly
2. **Soft Launch:** Enable for new signups only
3. **Existing User Migration:** 
   - Send email announcement with timeline
   - Offer grace period or discount code
   - Grandfather early supporters if desired
4. **Full Launch:** Remove all free access

---

## Quick Reference: Prompt Order

Execute these prompts in order:
1. Schema Updates (1.1, 1.2)
2. Stripe Config (2.1, 2.2)
3. Webhook Handlers (3.1, 3.2)
4. Frontend Flow (4.1, 4.2, 4.3)
5. Route Protection (5.1, 5.2)
6. Cleanup (6.1, 6.2)
7. Admin (7.1 - optional)

Total estimated effort: 8-12 implementation sessions
