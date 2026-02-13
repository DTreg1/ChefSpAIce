# Monetization — Grade: B

## Strengths
- Stripe integration with checkout, upgrades, cancellations, and proration
- RevenueCat for iOS StoreKit/In-App Purchases with webhook handling
- 7-day free trial with configurable trial-end modals and milestone banners
- Winback campaign system for canceled users (30+ days, $4.99 first month offer)
- Referral system for organic growth
- Donation support via Stripe for community goodwill
- Monthly ($9.99) and annual ($99.90/yr) pricing configured
- Subscription cache for fast entitlement checks
- Admin dashboard for subscription management and analytics

## Weaknesses
- Single PRO tier only — no tier differentiation for price anchoring
- No usage-based billing option (e.g., pay-per-AI-generation for casual users)
- No promotional coupon system beyond winback campaigns
- No in-app upsell triggers based on feature usage patterns
- Annual plan discount is minimal (17%) — industry standard is 20-40%
- No lifetime deal option for early adopters
- No grace period handling documented for payment failures

## Remediation Steps

**Step 1 — Add payment failure grace period**
```
In the Stripe webhook handler, when an invoice.payment_failed event is received, don't immediately set the subscription to "canceled". Instead, set status to "past_due" and grant a 7-day grace period. Send a push notification: "Your payment didn't go through. Update your payment method to keep your subscription." After 7 days of past_due, then set to "canceled". Track this in the subscriptions table with a gracePeriodEndsAt column.
```

**Step 2 — Add contextual upsell triggers**
```
Create a client/hooks/useUpsellTrigger.ts hook. Track when free-tier users hit limits (pantry items, AI recipes). When a limit is reached, show the UpgradePrompt component with context: "You've used all 5 AI recipes this month. Upgrade to PRO for unlimited recipes." Also trigger when users try premium features (recipe scanning, bulk scanning) showing what they're missing.
```

**Step 3 — Increase annual discount to 30%+ and add a lifetime option**
```
In shared/subscription.ts, update ANNUAL_PRICE from 99.90 to 83.88 ($6.99/month billed annually — 30% off monthly). Create a corresponding Stripe price in the Stripe dashboard. Consider adding a LIFETIME tier at $149.99 as a one-time purchase for early adopters, implemented as a Stripe one-time payment that sets subscriptionStatus to "lifetime" (no expiration).
```
