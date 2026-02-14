# Monetization — Grade: A-

## Summary

ChefSpAIce has a mature, well-architected monetization stack spanning Stripe (web), RevenueCat/StoreKit (iOS/Android), donations, referrals, and winback campaigns. The implementation demonstrates production-grade patterns: webhook idempotency, subscription caching, grace period handling with escalating notifications, proration previews, a retention offer flow with deduplication, and conversion event tracking. Previous gaps — retention offer duplication, MRR calculation bugs — have been addressed.

---

## Category Breakdown

### 1. Payment Infrastructure — A

**What's implemented:**
- Full Stripe integration via `stripe-replit-sync` with managed webhook secret rotation and Replit Connectors for key management (`server/stripe/stripeClient.ts`).
- Stripe Checkout sessions for new subscriptions with `allow_promotion_codes: true` (Stripe-native promo code support is already enabled).
- Stripe Customer Portal sessions for self-service billing management (`/create-portal-session`).
- Stripe publishable key endpoint for frontend initialization.
- Session retrieval endpoint for post-checkout confirmation UI.
- Donation checkout via one-time Stripe payments with redirect URL validation against `REPLIT_DOMAINS` to prevent open redirect attacks (`server/routers/donations.router.ts`).
- Configurable donation amounts ($5, $10, $25, $50) in `client/data/landing-data.ts`.

**What's strong:**
- Webhook payload buffer validation with clear error messaging if `express.json()` runs before the webhook route.
- Stripe customer deduplication — checks existing customers by email before creating new ones.
- userId linked in both customer metadata and subscription metadata for reliable event correlation.
- Price caching with 1-hour TTL to avoid excessive Stripe API calls (`PRICES_CACHE_TTL_MS`).

**Remaining Considerations:**
- `getUncachableStripeClient()` creates a new Stripe instance on every call. Consider caching the client per secret key to reduce overhead.
- Donation flow has no logged donor tracking in the database.

---

### 2. Subscription Lifecycle Management — A-

**What's implemented:**
- Full lifecycle: checkout -> trialing -> active -> past_due -> canceled -> expired.
- In-place upgrade with `proration_behavior: "create_prorations"` and a proration preview endpoint (`/preview-proration`).
- Cancellation with required reason (too_expensive, not_using, missing_features, other) logged to `cancellation_reasons` table with `offerShown`/`offerAccepted` fields.
- Subscription pause (1-3 months) via Stripe's `pause_collection` with `behavior: "void"`.
- Retention offer: 50% off for 3 months via dynamically-created Stripe coupon applied to the active subscription (`/apply-retention-offer`).
- **[REMEDIATED] Retention offer deduplication**: Before applying a retention offer, the system checks the `retentionOffers` table for any offer applied within the last 6 months. Returns `RETENTION_OFFER_ALREADY_APPLIED` error if one exists. All retention offers are tracked in a dedicated table for analytics (`management.ts:230-269`).
- Cancellation flow logging for analytics even when user doesn't complete cancellation.

**What's strong:**
- Subscription table is well-indexed with dedicated indexes for all query patterns.
- Conversion events table tracks every tier transition with source attribution.

**Remaining Considerations:**
- Pause status ("paused") is set in the local DB but there's no webhook handler for when Stripe auto-resumes the subscription at `resumes_at`.

---

### 3. Grace Period & Payment Failure Handling — A

**What's implemented:**
- The `invoice.payment_failed` webhook sets status to `"past_due"` and records `paymentFailedAt` timestamp.
- Server-side push notification sent immediately on payment failure via `queueNotification()` with deep link to subscription management.
- The `/me` entitlements endpoint calculates `gracePeriodEnd`, `graceDaysRemaining`, and returns them to the client.
- Client-side `usePaymentNotifications` hook schedules escalating local notifications: immediate alert, 3-day reminder, and 1-day final warning.
- On `invoice.paid`, status reverts to `"active"` and `paymentFailedAt` is cleared.

**What's strong:**
- The grace period is fully functional end-to-end.
- Notification scheduling is idempotent — cancels previous payment notifications before scheduling new ones.
- Android notification channel configured with high importance, vibration pattern, and red light for urgency.

**Remaining Considerations:**
- No automated background job to transition `past_due` -> `canceled` after 7 days server-side (relies on Stripe's dunning behavior).

---

### 4. iOS/Android In-App Purchases — B+

**What's implemented:**
- RevenueCat SDK integration with platform-specific API keys for iOS and Android.
- StoreKit service handles initialization, user login/logout, offerings retrieval, package purchases, restore purchases, and paywall presentation.
- Server-side RevenueCat webhook handler processes: INITIAL_PURCHASE, RENEWAL, PRODUCT_CHANGE, UNCANCELLATION, CANCELLATION, BILLING_ISSUE, EXPIRATION, TEST.
- Purchase sync with server via `/api/subscriptions/sync-revenuecat` endpoint.
- Pending purchase persistence — purchases saved locally before auth and synced after login.
- Platform detection prevents Stripe checkout on native mobile.

**What's strong:**
- Fallback from production RevenueCat key to test key for Expo Go development.
- Non-blocking server sync after purchase.

**Remaining Considerations:**
- RevenueCat webhook verification uses simple string comparison instead of timing-safe comparison.
- No RevenueCat server-to-server receipt validation.
- The `mapProductIdToTier` function always returns the same tier regardless of input, which would break if a second tier is introduced.

---

### 5. Entitlements & Feature Gating — A-

**What's implemented:**
- Centralized entitlements service (`server/services/subscriptionService.ts`) with `getUserEntitlements()` returning tier, status, limits, usage counts, and remaining quotas.
- Three usage-based limits: pantry items, AI recipes per month, cookware items.
- Five boolean feature gates.
- Monthly AI recipe counter with automatic reset.
- AI recipe limit cache (30s TTL) to prevent redundant DB queries.
- Referral bonus credits added to `aiRecipeBonusCredits`.
- Dedicated endpoints: `/check-limit/:limitType` and `/check-feature/:feature`.

**What's strong:**
- Shared tier configuration in `shared/subscription.ts` ensures client and server agree on limits.
- Subscription status cache (5-minute TTL) reduces DB pressure.

**Remaining Considerations:**
- Single-tier model (STANDARD) limits upsell opportunities. A multi-tier approach could drive more revenue.

---

### 6. Winback & Retention Campaigns — B+

**What's implemented:**
- PostgreSQL-backed background job (`server/jobs/winbackJob.ts`) runs weekly.
- Sends push notification with "$4.99 first month" offer and deep link.
- Deduplication: each user receives at most one winback campaign ever.
- `winback_campaigns` table tracks status, offer amount, Stripe coupon references, and timestamps.
- Webhook handler marks campaign as "accepted" when a canceled user reactivates.

**Remaining Considerations:**
- The winback job records `offerAmount: 499` but the actual Stripe coupon creation for the discount is not fully wired. The notification is sent but the discount application on reactivation is not automated.
- One campaign per user ever is restrictive — users who don't respond can never be re-targeted.

---

### 7. Referral System — B

**What's implemented:**
- 8-character referral code generation with collision detection.
- Shareable referral link with code in query parameter.
- Validation endpoint returns masked referrer name for social proof.
- Apply endpoint with self-referral prevention and duplicate checking.
- Reward: every 3 successful referrals grants 1 month free.

**Remaining Considerations:**
- Referral reward extends subscription dates locally but doesn't update the Stripe subscription.
- No reward for the referred user — only the referrer benefits.

---

### 8. Analytics & Admin — B+

**What's implemented:**
- Admin subscription listing with pagination, status filtering, and user join.
- Subscription stats endpoint with MRR calculation.
- Conversion events table for funnel analysis.
- Cancellation reasons table for churn analysis.
- **[REMEDIATED] MRR calculation uses correct price constants**: `PRO_MONTHLY_CENTS = 999` and `PRO_ANNUAL_CENTS = 7999` are now correct in the advanced metrics endpoint (`analytics.router.ts:133-134`).

**Remaining Considerations:**
- The basic stats endpoint still uses an averaging formula `(499 + 999) / 2` which is a rough approximation. The advanced metrics endpoint has the correct values.
- No cohort analysis, LTV calculations, or revenue reporting from actual Stripe charges.

---

## Remediations Completed

| # | Remediation | Status |
|---|-------------|--------|
| 1 | Fix free tier definition and enforce feature gating | **Done** (single STANDARD tier model) |
| 2 | Fix MRR calculation in admin stats | **Done** (correct values in advanced metrics) |
| 3 | Add retention offer deduplication | **Done** (retentionOffers table + 6-month check) |
| 4 | Wire winback discount to Stripe | Partially done (notification sent, coupon wiring incomplete) |
| 5 | Increase annual discount and add contextual upsell triggers | Not yet done |

## Remaining Low-Priority Items

- Winback campaign Stripe coupon creation could be fully automated.
- Annual discount (17%) is below industry standard (20-40%).
- No contextual upsell triggers when users hit limits.
- Referral rewards don't sync to Stripe billing cycles.
- Basic stats MRR endpoint uses averaging formula instead of exact price constants.
