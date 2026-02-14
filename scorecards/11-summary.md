# Remaining Items Summary

**Total remaining:** 8 items across 10 categories
**Priority:** Ordered by impact — highest first

---

## 1. Image Accessibility (Accessibility)

**Source:** `07-accessibility.md` — Image Accessibility graded D+
**Impact:** ~20 images lack `accessibilityLabel` or `accessibilityElementsHidden`, making them invisible or confusing to screen readers.

<details>
<summary>Prompt</summary>

```
Audit all Image and expo-image components across the client/ directory (excluding web/ screens) for missing accessibility attributes. For each image:

1. If the image is decorative (logos, backgrounds, avatars without meaningful content), add `accessibilityElementsHidden={true}` and `importantForAccessibility="no-hide-descendants"`.
2. If the image conveys meaningful content (recipe photos, food scans, product images), add a descriptive `accessibilityLabel` that describes what the image shows. Use dynamic labels where the content varies (e.g., `accessibilityLabel={`Photo of ${recipe.title}`}`).

Key files to check:
- client/screens/SelectRecipeScreen.tsx
- client/screens/ReceiptScanScreen.tsx
- client/screens/CookwareScreen.tsx
- client/screens/FoodCameraScreen.tsx
- client/screens/RecipesScreen.tsx
- client/screens/ProfileScreen.tsx
- client/screens/GrocerySearchScreen.tsx
- client/components/onboarding/ (all files)

For expo-image components (`import { Image } from 'expo-image'`), the accessibility props work the same as React Native Image. Do not add alt text to web/ directory files — those use standard HTML img tags with alt attributes.

After making changes, grep for all Image components without accessibilityLabel or accessibilityElementsHidden to verify none were missed.
```

</details>

---

## 2. Import Transaction Safety (Data Management)

**Source:** `06-data-management.md` — Sync Engine Architecture
**Impact:** Replace-mode import (`/api/sync/import` with `mode: "replace"`) deletes existing data and inserts new data in separate `Promise.all` batches. A server crash mid-import could leave the user with partial data.

<details>
<summary>Prompt</summary>

```
In the sync import endpoint (server/routers/sync/ directory), find the replace-mode import logic where existing user data is deleted and new data is inserted. Wrap the entire replace-mode operation in a single `db.transaction()` call so that if any step fails, all changes are rolled back atomically.

Specifically:
1. Find the import handler that processes `mode: "replace"` requests.
2. Move all DELETE operations (clearing existing inventory, recipes, meal plans, shopping items, cookware, waste logs, consumed logs, custom locations) AND all INSERT operations into a single `db.transaction(async (tx) => { ... })` block.
3. Use `tx` (the transaction handle) instead of `db` for all queries inside the block.
4. Also add timestamp comparison for merge-mode imports: when `mode: "merge"`, compare each imported item's `updatedAt` against the existing server record's `updatedAt` and only overwrite if the imported version is newer.
5. Add import size validation: reject payloads where any single array exceeds 10,000 items to prevent memory exhaustion. Return a 413 error with a descriptive message.

Test by verifying:
- Replace-mode import with an intentionally failing item (e.g., violating a NOT NULL constraint) rolls back all changes.
- Merge-mode import preserves newer server records.
- Import with >10,000 items in any array is rejected.
```

</details>

---

## 3. Large File Extraction (Code Quality)

**Source:** `09-code-quality.md` — File Size & Complexity graded B-
**Impact:** 13 files exceed 1,000 lines. The largest, `OnboardingScreen.tsx` at 3,153 lines, is difficult to maintain, review, and test. Other oversized files include `chat-actions.ts` (1,720 lines), `AddItemScreen.tsx` (1,435 lines), `storage.ts` (1,433 lines), and `ChatModal.tsx` (1,415 lines).

<details>
<summary>Prompt</summary>

```
Split the following oversized files into smaller modules. Target: no non-data file should exceed 800 lines.

### OnboardingScreen.tsx (3,153 lines → target ~500 lines)
File: client/screens/OnboardingScreen.tsx

1. Extract each onboarding step into its own component in `client/components/onboarding/`:
   - WelcomeStep.tsx
   - DietaryPreferencesStep.tsx
   - CookingSkillStep.tsx
   - AllergiesStep.tsx
   - HouseholdSizeStep.tsx
   - GoalsStep.tsx
   - NotificationPermissionStep.tsx
   - CompletionStep.tsx
   (Check which steps actually exist — names above are examples)
2. Extract shared step logic (navigation, validation, progress tracking) into a `useOnboardingFlow` hook in `client/hooks/useOnboardingFlow.ts`.
3. Extract step animations into `client/components/onboarding/StepTransition.tsx`.
4. The main OnboardingScreen.tsx should only orchestrate steps and contain the step array/router logic.

### chat-actions.ts (1,720 lines → target ~400 lines per file)
File: server/services/chat-actions.ts (or wherever this file lives)

1. Group related AI chat actions by domain:
   - `chat-actions-inventory.ts` — inventory lookup, expiry check, add/remove items
   - `chat-actions-recipes.ts` — recipe generation, recipe search, cooking tips
   - `chat-actions-mealplan.ts` — meal plan suggestions, schedule management
   - `chat-actions-general.ts` — greetings, help, fallback responses
2. Create an `index.ts` that re-exports all action handlers as a unified registry.
3. Each domain file should export a map of `{ actionName: handlerFunction }`.

### AddItemScreen.tsx (1,435 lines → target ~500 lines)
File: client/screens/AddItemScreen.tsx

1. Extract the form sections into separate components:
   - `AddItemForm.tsx` — main form fields (name, quantity, unit, category)
   - `ExpirationDatePicker.tsx` — expiration date selection logic
   - `NutritionSection.tsx` — nutrition lookup and display
   - `LocationSelector.tsx` — storage location picker
   - `ShelfLifeSuggestion.tsx` — shelf life suggestion banner
2. Extract form validation and submission logic into `useAddItemForm` hook.

For all extractions:
- Preserve all existing props, types, and accessibility attributes.
- Keep all testID attributes intact.
- Use named exports, not default exports.
- Run TypeScript compilation after each file to verify no type errors.
- Verify the app still builds and the screens render correctly.
```

</details>

---

## 4. Focus Management in Modals (Accessibility)

**Source:** `07-accessibility.md` — Modal Accessibility graded B
**Impact:** No focus trapping, auto-focus on open, or focus restoration on dismiss. Screen reader users can interact with content behind the active modal.

<details>
<summary>Prompt</summary>

```
Implement focus management for modal components across the app. The three requirements are: (1) auto-focus the first interactive element when a modal opens, (2) trap focus within the modal while open, and (3) restore focus to the trigger element when the modal closes.

1. Create a reusable `useFocusManagement` hook in `client/hooks/useFocusManagement.ts`:
   - Accept a `ref` to the modal container and an `isVisible` boolean.
   - On open (`isVisible` becomes true): find the first focusable element inside the container and call `.focus()` on it.
   - On close (`isVisible` becomes false): restore focus to the element that was focused before the modal opened (store it in a ref on open).
   - For web: add a keydown listener that traps Tab/Shift+Tab within the modal's focusable elements.

2. Add `onAccessibilityEscape` handler to all modal components — this enables VoiceOver's two-finger scrub (Z gesture) to dismiss the modal:
   - Find all components that use `<Modal>` or have `accessibilityViewIsModal={true}`.
   - Add `onAccessibilityEscape={onClose}` (or the equivalent dismiss callback).

3. Apply the hook to these high-priority modals:
   - client/components/chat/ChatModal.tsx
   - client/components/subscription/CancellationFlowModal.tsx
   - client/components/recipes/RecipeSettingsModal.tsx
   - client/components/recipes/IngredientSwapModal.tsx
   - client/components/NutritionCorrectionModal.tsx
   - client/screens/SubscriptionScreen.tsx (if it renders as a modal)
   - Any other file with `accessibilityViewIsModal={true}`

4. Verify by checking:
   - Opening a modal auto-focuses its first button or input.
   - Pressing Tab cycles through only the modal's elements (web).
   - Closing the modal returns focus to the button that opened it.
   - VoiceOver Z-gesture dismisses the modal.
```

</details>

---

## 5. Tablet & Landscape Layouts (Mobile)

**Source:** `10-mobile.md` — Tablet & Large Screen graded C+
**Impact:** The `useDeviceType` hook exists but no screens implement master-detail patterns, iPad split-view, or landscape-specific layouts.

<details>
<summary>Prompt</summary>

```
Implement tablet-responsive layouts for the 4 most-used screens using the existing `useDeviceType` hook. The app already has `supportsTablet: true` in app.json and a `useDeviceType()` hook that returns device classification.

### InventoryScreen (master-detail)
File: client/screens/InventoryScreen.tsx

When `useDeviceType()` returns tablet:
1. Render a side-by-side master-detail layout:
   - Left panel (40% width, min 320px): The existing inventory list (FlashList).
   - Right panel (60% width): Item detail view showing nutrition, expiry, location, and actions.
2. Tapping an item in the left list shows its detail in the right panel (no navigation push).
3. Phone layout remains unchanged — tap navigates to detail screen as before.

### RecipesScreen (2-column grid)
File: client/screens/RecipesScreen.tsx

When tablet:
1. Render recipe cards in a 2-column grid layout using FlashList's `numColumns={2}`.
2. Add a side panel (40% width) that shows recipe preview on tap without navigating.
3. Phone layout stays as single-column list.

### MealPlanScreen (week view)
File: client/screens/MealPlanScreen.tsx

When tablet:
1. Show the full 7-day week view in a horizontal row instead of day-by-day navigation.
2. Each day column shows all meal slots vertically.
3. Phone layout stays as single-day view with swipe navigation.

### SettingsScreen (split pane)
File: client/screens/SettingsScreen.tsx (or ProfileScreen.tsx — whichever holds settings)

When tablet:
1. Left column (30% width): Settings category list (Account, Preferences, Notifications, About).
2. Right column (70% width): Selected category's content.
3. Phone layout stays as single scrollable list.

For all screens:
- Use `useDeviceType()` to detect tablet, not raw Dimensions.
- Use `Dimensions.addEventListener('change', ...)` to handle orientation changes dynamically.
- Maintain all existing accessibility attributes.
- Test both portrait and landscape on iPad simulator (if available) or with Dimensions override.
```

</details>

---

## 6. Winback Stripe Coupon Automation (Monetization)

**Source:** `04-monetization.md` — Revenue Recovery
**Impact:** The winback campaign system sends notifications to churned users but the Stripe discount coupon isn't fully automated — notification is sent but the actual coupon application requires manual steps.

<details>
<summary>Prompt</summary>

```
Complete the winback campaign Stripe coupon automation so the entire flow works end-to-end without manual intervention.

1. Find the winback campaign job in `server/jobs/` (likely `winbackCampaignJob.ts` or similar).

2. When the job identifies eligible churned users (canceled 30+ days ago, not already contacted):
   a. Create a Stripe Coupon via the Stripe API:
      - `stripe.coupons.create({ percent_off: 25, duration: 'repeating', duration_in_months: 3, name: 'Welcome Back - 25% Off', metadata: { type: 'winback', userId: user.id } })`
   b. Create a Stripe Promotion Code from the coupon:
      - `stripe.promotionCodes.create({ coupon: coupon.id, max_redemptions: 1, metadata: { userId: user.id } })`
   c. Include the promotion code in the notification sent to the user.
   d. Store the promotion code ID in the database (likely in a `winback_offers` or `retention_offers` table) for tracking.

3. Create or update the redemption endpoint (e.g., `POST /api/subscription/apply-winback`):
   - Accept the promotion code from the client.
   - Verify it matches the authenticated user's stored winback offer.
   - Apply it to the user's new subscription checkout via `stripe.checkout.sessions.create({ discounts: [{ promotion_code: promoCode.id }] })`.

4. Add deduplication: check the winback tracking table before creating a new offer. Skip users who already have an active/unused winback promotion code.

5. Add expiration: set `expires_at` on the promotion code (30 days from creation) so unclaimed offers don't linger.

Verify:
- The job creates a unique Stripe coupon per eligible user.
- The promotion code is single-use and user-specific.
- Applying the code at checkout gives the correct discount.
- Users who already received a winback offer are skipped.
```

</details>

---

## 7. Reduce Remaining `any` Types (Code Quality)

**Source:** `09-code-quality.md` — Type Safety
**Impact:** 97 `any` type usages remain in production code (down from 227). Many are `cursor: "pointer" as any` web workarounds and complex dynamic data flows.

<details>
<summary>Prompt</summary>

```
Reduce the remaining `any` type occurrences in the codebase from 97 toward zero. Focus on the highest-impact patterns first.

1. Find all remaining `any` usages:
   Run: `grep -rn ": any\|as any\|<any>" --include="*.ts" --include="*.tsx" client/ server/ shared/ | grep -v node_modules | grep -v __tests__ | grep -v test`

2. Fix by category:

   a. `cursor: "pointer" as any` (React Native web style workaround):
      - Create a typed utility in `client/lib/web-styles.ts`:
        `export const webCursor = Platform.OS === 'web' ? { cursor: 'pointer' } as const : {};`
      - Replace all `cursor: "pointer" as any` with spreading `...webCursor`.

   b. Navigation `as any` casts:
      - Ensure `RootStackParamList` in the navigation types file covers all screen names.
      - Replace `navigation.navigate("ScreenName" as any)` with properly typed navigation calls.
      - If screens are missing from the param list, add them.

   c. API response `as any`:
      - Define typed response interfaces for each API endpoint.
      - Replace `(response as any).data` with `(response as TypedResponse).data`.

   d. Event handler `any`:
      - Type event parameters with proper React Native event types (e.g., `GestureResponderEvent`, `NativeSyntheticEvent<TextInputChangeEventData>`).

   e. `Promise<any>` in asyncHandler:
      - Replace with `Promise<void>` or the actual return type.

   f. Dynamic data `any`:
      - For truly dynamic JSON data, use `unknown` instead of `any` and add type guards.

3. After fixing, run TypeScript compilation (`npx tsc --noEmit`) to verify no new errors were introduced.

4. Report the final count of remaining `any` usages and document any that are genuinely unavoidable (e.g., third-party library type gaps).
```

</details>

---

## 8. SwipeableItemCard Haptic Threshold (UI/UX)

**Source:** `08-ui-ux.md` — Micro-Interactions
**Impact:** The swipe gesture on inventory cards has no haptic signal when crossing the action threshold, so users don't get tactile confirmation that releasing will trigger the action.

<details>
<summary>Prompt</summary>

```
Add haptic feedback to the SwipeableItemCard component at the swipe threshold crossing point.

File: client/components/inventory/SwipeableItemCard.tsx

1. Find the gesture handler or pan responder that tracks horizontal swipe position.
2. Identify the threshold value where the swipe "commits" to an action (e.g., delete or consume). This is typically a pixel distance or percentage of card width.
3. Add a ref to track whether the threshold has been crossed: `const thresholdCrossedRef = useRef(false)`.
4. In the gesture update callback (onGestureEvent or equivalent):
   - When `translationX` crosses the threshold AND `thresholdCrossedRef.current` is false:
     - Call `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)`.
     - Set `thresholdCrossedRef.current = true`.
   - When `translationX` returns inside the threshold:
     - Set `thresholdCrossedRef.current = false` (so it fires again if they re-cross).
5. Reset `thresholdCrossedRef.current = false` when the gesture ends.
6. Import `* as Haptics from 'expo-haptics'` if not already imported.

This creates a satisfying "click" feel when the user swipes far enough to trigger an action, matching iOS system behavior (e.g., swipe-to-delete in Mail).

Verify:
- Swiping past the threshold gives one haptic tap.
- Swiping back and forth across the threshold gives one tap per crossing (not continuous).
- The haptic doesn't fire on small swipes that don't reach the threshold.
```

</details>

---

## Lower-Priority Items (Not Requiring Dedicated Prompts)

These are minor considerations documented in the scorecards but unlikely to impact users significantly:

| # | Category | Item |
|---|----------|------|
| 9 | Security | In-memory rate limiter state not shared across multiple server instances |
| 10 | Security | No key rotation mechanism for TOKEN_ENCRYPTION_KEY |
| 11 | Security | CSP `img-src` allows broad `https:` origins |
| 12 | Error Handling | Rate limit responses not using standardized `errorResponse()` format |
| 13 | Error Handling | Client-side error rate tracking to prevent Sentry flooding |
| 14 | Performance | No ETag/conditional responses for API endpoints |
| 15 | Performance | `sharp` triple instantiation (metadata + display + thumbnail) |
| 16 | Performance | Sync queue AsyncStorage serialization overhead |
| 17 | Data Management | Stricter Zod schemas for KV sections (preferences, analytics) |
| 18 | Data Management | Object storage not included in disaster recovery plan |
| 19 | Accessibility | No skip-navigation link on web pages |
| 20 | Accessibility | No `announceForAccessibility()` for transient confirmations |
| 21 | Accessibility | Color contrast not verified against WCAG AA/AAA |
| 22 | UI/UX | Hardcoded colors in CustomTabBar and FloatingChatButton |
| 23 | UI/UX | No visual preview of locked premium features |
| 24 | Code Quality | Unused dependency cleanup (run Knip) |
| 25 | Code Quality | Move remaining business logic from fat routers to services |
| 26 | Code Quality | Add Jest coverage thresholds |
| 27 | Mobile | No E2E mobile test suite (Detox/Maestro) |
| 28 | Mobile | No notification grouping or rich notifications |
| 29 | Mobile | No landscape orientation support |
| 30 | Core Features | No meal plan auto-generation from inventory |
| 31 | Core Features | No barcode product database lookup |
| 32 | Monetization | Annual discount below industry standard (17% vs 20-40%) |
| 33 | Monetization | No contextual upsell triggers at usage limits |
