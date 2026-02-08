# ChefSpAIce Project Scorecard

> Full project audit performed on 2026-02-08. Items are listed in **executable priority order** — fix the highest-impact, lowest-effort items first. Each item includes a severity, what's wrong, and a copy-paste remediation prompt you can hand straight to the AI agent.

---

## Summary

| Category | Score | Notes |
|---|---|---|
| UI/UX Design | 8/10 | Polished Liquid Glass design, strong theming, minor gaps |
| Core Features | 9/10 | Comprehensive feature set, AI recipes, sync, meal planning |
| Performance | 7/10 | Good memoization, in-memory cache needs Redis for prod |
| Security | 8.5/10 | Strong auth, CSRF, rate limiting, minor LSP type errors |
| Error Handling | 8/10 | Solid AppError class, error boundary, global handler |
| Accessibility | 7.5/10 | 437 a11y props, web focus styles, gaps in ARIA live regions |
| Code Quality | 7/10 | Well-organized, 9 LSP errors, no TODO/FIXME debt |
| Mobile | 8.5/10 | React Native + Expo, offline-first sync, voice controls |
| Data Management | 8/10 | Local-first sync, conflict resolution, soft deletes |
| Monetization | 8/10 | Stripe integration, 3 tiers, webhooks, retention flow |

**Overall: 7.9/10**

---

## 1. Security (Priority: CRITICAL)

### 1.1 Fix TypeScript errors in Stripe subscription router (Severity: HIGH)

**What's wrong:** 3 LSP type errors in `server/stripe/subscriptionRouter.ts` — accessing non-existent properties on Stripe types (`current_period_start`, `current_period_end`) and an invalid `coupon` property on `SubscriptionUpdateParams`. This can cause runtime failures during subscription upgrades and retention offers.

```
Fix the 3 TypeScript errors in server/stripe/subscriptionRouter.ts:
1. Line 643: Property 'current_period_start' does not exist on type 'Response<Subscription>' — cast the Stripe response correctly or retrieve the subscription object before accessing period fields.
2. Line 644: Property 'current_period_end' does not exist on type 'Response<Subscription>' — same fix as above.
3. Line 998: 'coupon' does not exist in type 'SubscriptionUpdateParams' — use the correct Stripe API method for applying coupons (e.g., stripe.subscriptions.update with discount/promotion_code instead of coupon, or use stripe.customers.update to apply the coupon to the customer).
Do not change any business logic, only fix the types to match the current Stripe SDK version.
```

### 1.2 Fix TypeScript errors in shared schema (Severity: MEDIUM)

**What's wrong:** 6 LSP errors in `shared/schema.ts` — `Type 'any' is not assignable to type 'never'` on lines 318, 357, 386, 419, 448, 1083. These are in `createInsertSchema(...).omit()` calls where `true as any` is used to work around type inference.

```
Fix the 6 TypeScript errors in shared/schema.ts on lines 318, 357, 386, 419, 448, and 1083. Each error is in a createInsertSchema().omit() call using "true as any". Replace the omit pattern with a properly typed approach. For example, change:
  createInsertSchema(table).omit({ id: true as any, ... })
to:
  createInsertSchema(table).omit({ id: true, ... } as const)
or use the correct drizzle-zod typing so that the omit keys are recognized. Preserve all existing omit fields.
```

### 1.3 Add Helmet CSP headers for landing page (Severity: MEDIUM)

**What's wrong:** Helmet is imported and used in `server/index.ts`, but the Content-Security-Policy may not be configured specifically for the landing page HTML template, which uses inline scripts and styles.

```
Review the Helmet configuration in server/index.ts and ensure Content-Security-Policy headers are properly configured. The landing page template (server/templates/landing-page.html) may use inline scripts/styles. Configure Helmet's CSP to allow these while blocking external script injection. Add nonce-based CSP for inline scripts if any exist in the templates. Show me the final Helmet configuration.
```

### 1.4 Ensure test endpoints are fully gated from production (Severity: MEDIUM)

**What's wrong:** The test endpoints (`/api/test/create-test-user`, `/api/test/set-subscription-tier`, `/api/test/set-tier-by-email`) in `server/routes.ts` are gated by `NODE_ENV !== 'production'`, which is correct. However, there's no defense-in-depth — if NODE_ENV is misconfigured, these endpoints expose user creation and tier manipulation.

```
Add a secondary defense layer for the test endpoints in server/routes.ts (lines 224-392). In addition to the existing NODE_ENV check, add a check for a TEST_ENDPOINTS_SECRET environment variable that must be provided as a header (X-Test-Secret) for test endpoints to work. This ensures that even if NODE_ENV is accidentally not set to 'production', the test endpoints cannot be abused without the secret.
```

---

## 2. Error Handling (Priority: HIGH)

### 2.1 Add async error wrapper for route handlers (Severity: MEDIUM)

**What's wrong:** Many route handlers in routers use manual `try/catch` with `next(error)`. While this works, a missing `try/catch` in any handler will cause an unhandled promise rejection instead of hitting the global error handler.

```
Create a utility function asyncHandler in server/lib/apiResponse.ts (or a new file server/lib/asyncHandler.ts) that wraps async Express route handlers to automatically catch errors and pass them to next(). Example:
  export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
    (req: Request, res: Response, next: NextFunction) => Promise.resolve(fn(req, res, next)).catch(next);
Then refactor the standalone routes in server/routes.ts (pre-register endpoint, test endpoints, privacy-policy, support, marketing, feature-graphic) to use this wrapper. Do NOT modify the router files — only the inline handlers in routes.ts.
```

### 2.2 Add network error retry UI for sync failures (Severity: LOW)

**What's wrong:** The sync manager in `client/lib/sync-manager.ts` has retry logic with exponential backoff, but when items are marked `isFatal` after 5 retries, the user only sees a basic Alert. There's no persistent UI indicator for sync health.

```
In the mobile app, add a small sync status indicator component that shows when sync is failing or items are stuck in the queue. The sync manager already exposes sync state — create a small banner or badge in the inventory screen header that shows "X items pending sync" when the queue is non-empty, and shows a warning icon with "Sync error" when isFatal items exist. Use the existing ThemedText and themed colors. Place it in the InventoryScreen header area.
```

---

## 3. Performance (Priority: HIGH)

### 3.1 Replace in-memory cache with Redis for production (Severity: HIGH)

**What's wrong:** `server/lib/cache.ts` uses an in-memory Map. The code already has a `CacheStore` interface and Redis example in comments, but it's not wired up. In production with multiple instances, each server has its own isolated cache.

```
The cache system in server/lib/cache.ts already has a CacheStore interface and Redis example in comments. Wire up a Redis-backed CacheStore using Upstash Redis or the ioredis package. Check if a REDIS_URL environment variable exists; if so, use the Redis store, otherwise fall back to the in-memory store. Update all existing CacheService instantiations across the codebase to use the new auto-detecting constructor. Don't change the CacheService API — just swap the default store based on environment.
```

### 3.2 Add database query indexing review (Severity: MEDIUM)

**What's wrong:** The schema has good indexes on core tables (inventory, recipes, meal plans, shopping items), but the admin analytics queries may be doing full table scans for aggregate calculations.

```
Review the admin analytics router at server/routers/admin/analytics.router.ts and check if the queries there would benefit from additional indexes. Specifically check queries that aggregate over subscriptions, users by creation date, and conversion events. If any queries do full table scans on large columns, add appropriate indexes to shared/schema.ts. Use EXPLAIN ANALYZE on the development database to verify.
```

### 3.3 Add response compression tuning (Severity: LOW)

**What's wrong:** Compression middleware is imported in `server/index.ts` but may not be properly configured with a threshold to avoid compressing very small responses.

```
Review the compression middleware setup in server/index.ts. Ensure it's configured with a minimum threshold (e.g., 1KB) so tiny responses aren't compressed (the compression overhead isn't worth it for small payloads). Also ensure that the Stripe webhook route is excluded from compression since it needs the raw body. Show the final configuration.
```

---

## 4. Code Quality (Priority: MEDIUM)

### 4.1 Consolidate duplicate auth token hashing (Severity: MEDIUM)

**What's wrong:** The `hashToken` function that hashes Bearer tokens with SHA-256 is duplicated in three files: `server/middleware/auth.ts`, `server/middleware/requireAdmin.ts`, and `server/stripe/subscriptionRouter.ts` (as `getAuthenticatedUser`). Each independently implements the same token-to-session lookup.

```
Extract the duplicated hashToken function and token-to-session lookup logic from server/middleware/auth.ts, server/middleware/requireAdmin.ts, and server/stripe/subscriptionRouter.ts into a single shared utility at server/lib/auth-utils.ts. Export:
1. hashToken(token: string): string
2. getSessionByToken(rawToken: string): Promise<session | null>
3. getUserByToken(rawToken: string): Promise<user | null>
Then refactor the three files to import from this shared utility. Do not change any behavior.
```

### 4.2 Add request validation with Zod on sync endpoints (Severity: MEDIUM)

**What's wrong:** The sync router (`server/routers/sync.router.ts`, 2326 lines) is the largest file in the server and handles complex data sync operations. Request body validation should be using Zod schemas from the shared schema to prevent malformed sync data.

```
Review the sync router at server/routers/sync.router.ts and ensure that all POST/PUT endpoints validate incoming request bodies using the Zod insert schemas defined in shared/schema.ts (insertUserInventoryItemSchema, insertUserSavedRecipeSchema, insertUserMealPlanSchema, insertUserShoppingItemSchema). Add .parse() or .safeParse() validation at the top of each handler that accepts user data. Return a 400 error with details for validation failures. Do not change the existing business logic.
```

### 4.3 Break up oversized sync router file (Severity: LOW)

**What's wrong:** `server/routers/sync.router.ts` is 2,326 lines — by far the largest file. It handles all sync operations for inventory, recipes, meal plans, shopping lists, and cookware.

```
Refactor server/routers/sync.router.ts (2326 lines) by extracting the sync logic for each data type into separate handler files:
- server/routers/sync/inventory-sync.ts
- server/routers/sync/recipes-sync.ts
- server/routers/sync/meal-plans-sync.ts
- server/routers/sync/shopping-sync.ts
- server/routers/sync/cookware-sync.ts
Keep server/routers/sync.router.ts as the main router that imports and mounts these handlers. Preserve all existing route paths and behavior exactly.
```

---

## 5. UI/UX Design (Priority: MEDIUM)

### 5.1 Add loading skeleton states for all main screens (Severity: MEDIUM)

**What's wrong:** The InventoryScreen has a dedicated `InventorySkeleton` component, but other main screens (Recipes, MealPlan, ShoppingList) may not have equivalent skeleton loading states, leading to inconsistent loading experiences.

```
Check if the RecipesScreen, MealPlanScreen, and ShoppingListScreen have skeleton loading states like the InventoryScreen's InventorySkeleton component. For any screens that show a plain spinner or empty state while loading, create matching skeleton components that mirror the layout of the loaded content. Use the same approach as client/components/inventory/InventorySkeleton.tsx. Place new skeleton components in their respective component directories.
```

### 5.2 Add empty state illustrations for all lists (Severity: LOW)

**What's wrong:** The app has an `EmptyState` component, but it may not be used consistently across all list views (cookware, meal plans, shopping list) with helpful prompts to guide users.

```
Audit all list/grid views in the app (InventoryScreen, RecipesScreen, MealPlanScreen, ShoppingListScreen, CookwareScreen) and ensure each one uses the EmptyState component with:
1. A relevant icon from lucide-react or Feather
2. A descriptive title explaining what will appear here
3. A helpful subtitle suggesting how to add their first item
4. An action button that navigates to the add/create flow
Ensure the empty state is only shown when data has finished loading (not during initial load).
```

---

## 6. Accessibility (Priority: MEDIUM)

### 6.1 Add ARIA live regions for dynamic content updates (Severity: MEDIUM)

**What's wrong:** The app has 437 accessibility props across components (labels, roles, hints), which is solid. However, dynamic content updates (sync status changes, item additions/deletions, toast notifications) may not announce to screen readers via ARIA live regions.

```
Add accessibilityLiveRegion="polite" to key dynamic content areas in the React Native app:
1. Sync status indicators — when sync completes or fails
2. Toast/notification areas — when a new message appears
3. List count headers — when items are added or removed (e.g., "12 items in pantry")
4. Loading states — when content transitions from loading to loaded
Review InventoryScreen, RecipesScreen, and ChatModal for these dynamic areas. Use accessibilityLiveRegion="polite" for non-urgent updates and "assertive" for error states.
```

### 6.2 Ensure all images have alt text (Severity: LOW)

**What's wrong:** Recipe images and food item images may not consistently have `accessibilityLabel` props, especially for dynamically loaded content.

```
Audit all Image and ImageBackground components in the client codebase (screens and components). Ensure every image that conveys information has an accessibilityLabel prop. For decorative images, add accessibilityElementsHidden={true} or importantForAccessibility="no-hide-descendants". Focus on: recipe images in RecipeDetailScreen, food item images in InventoryScreen and ItemDetailScreen, and profile images.
```

---

## 7. Mobile (Priority: MEDIUM)

### 7.1 Add haptic feedback for key interactions (Severity: LOW)

**What's wrong:** The app uses animated press feedback (scale transforms) but may not include haptic/vibration feedback for key actions like completing a scan, adding an item, or deleting.

```
Add haptic feedback to key user interactions using expo-haptics. Add light haptic feedback (Haptics.impactAsync(ImpactFeedbackStyle.Light)) to:
1. Barcode scan success
2. Adding an item to inventory
3. Generating an AI recipe
4. Adding a recipe to meal plan
5. Checking off a shopping list item
Import from expo-haptics and wrap calls in try/catch to handle platforms that don't support it.
```

### 7.2 Add pull-to-refresh on all list screens (Severity: LOW)

**What's wrong:** InventoryScreen has RefreshControl for pull-to-refresh, but other list screens may not consistently implement this pattern.

```
Ensure all scrollable list screens (RecipesScreen, MealPlanScreen, ShoppingListScreen, CookwareScreen) implement pull-to-refresh using React Native's RefreshControl component. The refresh action should trigger a full sync via the SyncManager and refetch the local data. Use the same pattern as InventoryScreen's RefreshControl implementation.
```

---

## 8. Data Management (Priority: MEDIUM)

### 8.1 Add data export for user privacy compliance (Severity: MEDIUM)

**What's wrong:** There's a `dataExportRouter` at `server/routers/user/data-export.router.ts` (160 lines) and an admin export at `server/routers/admin/data-export.router.ts`. Verify the user export is complete and covers all user data for GDPR/privacy compliance.

```
Review server/routers/user/data-export.router.ts and ensure the user data export endpoint includes ALL user data stored across all tables: users (profile/preferences), userInventoryItems, userSavedRecipes, userMealPlans, userShoppingItems, userCookwareItems, chatMessages, cancellationReasons, subscriptions, conversionEvents, and referralCodes. The export should be in JSON format. Compare the exported fields against the tables defined in shared/schema.ts to identify any missing data. Add any missing tables to the export.
```

### 8.2 Add database migration safety checks (Severity: LOW)

**What's wrong:** The project uses Drizzle ORM with PostgreSQL. While Drizzle handles migrations, there's no documented migration strategy or rollback plan in the codebase.

```
Create a brief migration safety checklist in replit.md under a new "## Database Migrations" section. Document:
1. How to generate a migration: drizzle-kit generate
2. How to apply migrations: drizzle-kit migrate
3. Pre-migration checklist: backup database, test migration on dev first
4. Rollback strategy: keep the previous schema version, use drizzle-kit drop to remove the last migration if needed
Also verify that drizzle.config.ts is correctly configured and that the migrations directory exists.
```

---

## 9. Monetization (Priority: MEDIUM)

### 9.1 Add subscription analytics event tracking (Severity: MEDIUM)

**What's wrong:** The `conversionEvents` table exists in the schema and is populated during webhook events, but there may be gaps in tracking — specifically around trial-to-paid conversions and downgrade events.

```
Review the webhook handlers in server/stripe/webhookHandlers.ts and the subscription router in server/stripe/subscriptionRouter.ts. Ensure conversionEvents are recorded for ALL subscription lifecycle events:
1. Trial started (FREE → trialing)
2. Trial converted to paid (trialing → active)
3. Upgrade (BASIC → PRO)
4. Downgrade (PRO → BASIC)
5. Cancellation (active → canceled)
6. Reactivation (canceled → active)
7. Expiration (canceled → expired)
Check the existing conversionEvents inserts and add any missing event types. Each event should include userId, fromTier, toTier, and timestamp.
```

### 9.2 Add failed payment recovery emails (Severity: LOW)

**What's wrong:** The `invoice.payment_failed` webhook handler in `server/stripe/webhookHandlers.ts` logs the failure and updates the subscription status, but doesn't trigger a notification to the user to update their payment method.

```
In the invoice.payment_failed handler in server/stripe/webhookHandlers.ts, after updating the subscription status, add logic to send a push notification to the affected user alerting them that their payment failed and they should update their payment method. Use the existing notification infrastructure if available, or queue a notification record that the mobile app can display. Include a deep link to the subscription management screen.
```

---

## 10. Data Management (continued)

### 10.1 Add sync queue size monitoring (Severity: LOW)

**What's wrong:** The sync manager has a `MAX_SYNC_QUEUE_SIZE` of 500 items, but there's no monitoring or alerting when the queue approaches this limit. Users could silently lose changes if the queue fills up.

```
In client/lib/sync-manager.ts, add a warning mechanism when the sync queue exceeds 80% of MAX_SYNC_QUEUE_SIZE (400 items). When this threshold is hit, log a warning and show a subtle in-app notification suggesting the user connect to the internet to sync their changes. Also add a queue size metric to the sync status that components can read to display a "pending changes" indicator.
```

---

## Quick Reference: Fix Order

| # | File | Issue | Effort |
|---|---|---|---|
| 1 | `server/stripe/subscriptionRouter.ts` | 3 TypeScript errors (Stripe API types) | 15 min |
| 2 | `shared/schema.ts` | 6 TypeScript errors (drizzle-zod omit) | 10 min |
| 3 | `server/middleware/auth.ts` + 2 others | Deduplicate hashToken/session lookup | 30 min |
| 4 | `server/routes.ts` | Add asyncHandler wrapper | 20 min |
| 5 | `server/routes.ts` | Add test endpoint secret defense | 15 min |
| 6 | `server/lib/cache.ts` | Wire up Redis for production | 45 min |
| 7 | `server/stripe/webhookHandlers.ts` | Complete conversion event tracking | 30 min |
| 8 | `server/routers/sync.router.ts` | Add Zod validation on sync endpoints | 60 min |
| 9 | Client screens | Add skeleton loading states | 45 min |
| 10 | Client components | Add ARIA live regions | 30 min |
