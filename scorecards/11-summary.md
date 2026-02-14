# Remaining Items Summary

**Last verified:** February 14, 2026 (fresh codebase review)
**Truly remaining:** 3 actionable items + 25 low-priority considerations
**Previously listed but already done:** 5 items (moved to "Already Remediated" section below)

---

## Remaining Items with Prompts

### 1. Large File Extraction (Code Quality)

**Source:** `09-code-quality.md` — File Size & Complexity graded B
**Impact:** 10 non-data files still exceed 1,000 lines. Four large files were already successfully split (OnboardingScreen 3,153→499, ChatModal 1,426→~550, AuthContext 972→538, sync-manager 1,073→774). The remaining oversized files are: `chat-actions.ts` (1,720), `SettingsScreen.tsx` (1,537), `AddItemScreen.tsx` (1,449), `storage.ts` (1,385), `recipeGenerationService.ts` (1,359), `ProfileScreen.tsx` (1,150), `AddFoodBatchScreen.tsx` (1,120), `RecipesScreen.tsx` (1,103), `ReceiptScanScreen.tsx` (1,080), `SubscriptionScreen.tsx` (1,037).

<details>
<summary>Prompt</summary>

```
Split the following oversized files into smaller modules. Target: no non-data file should exceed 800 lines. Four large files were already split in a prior session (OnboardingScreen, ChatModal, AuthContext, sync-manager) — do NOT touch those.

### chat-actions.ts (1,720 lines → target ~400 lines per file)
File: server/lib/chat-actions.ts

1. Group related AI chat actions by domain:
   - `chat-actions-inventory.ts` — inventory lookup, expiry check, add/remove items
   - `chat-actions-recipes.ts` — recipe generation, recipe search, cooking tips
   - `chat-actions-mealplan.ts` — meal plan suggestions, schedule management
   - `chat-actions-general.ts` — greetings, help, fallback responses
2. Create an `index.ts` that re-exports all action handlers as a unified registry.
3. Each domain file should export a map of `{ actionName: handlerFunction }`.

### SettingsScreen.tsx (1,537 lines → target ~500 lines)
File: client/screens/SettingsScreen.tsx

1. Extract each settings section into its own component in `client/components/settings/`:
   - AccountSettings.tsx — profile, email, password
   - PreferenceSettings.tsx — dietary, units, cooking skill
   - NotificationSettings.tsx — push notification toggles
   - AppSettings.tsx — theme, data export, cache
   - AboutSection.tsx — version, licenses, support
2. The main SettingsScreen.tsx should only render the section list and route to detail views.

### AddItemScreen.tsx (1,449 lines → target ~500 lines)
File: client/screens/AddItemScreen.tsx

1. Extract the form sections into separate components:
   - `AddItemForm.tsx` — main form fields (name, quantity, unit, category)
   - `ExpirationDatePicker.tsx` — expiration date selection logic
   - `NutritionSection.tsx` — nutrition lookup and display
   - `LocationSelector.tsx` — storage location picker
   - `ShelfLifeSuggestion.tsx` — shelf life suggestion banner
2. Extract form validation and submission logic into `useAddItemForm` hook.

### storage.ts (1,385 lines → target ~500 lines)
File: client/lib/storage.ts

1. Split by data domain:
   - `storage-inventory.ts` — inventory CRUD operations
   - `storage-recipes.ts` — recipe CRUD operations
   - `storage-mealplan.ts` — meal plan CRUD operations
   - `storage-shopping.ts` — shopping list CRUD operations
   - `storage-core.ts` — base storage class, initialization, migration
2. Re-export everything from a new `storage/index.ts`.

### ProfileScreen.tsx (1,150 lines → target ~500 lines)
File: client/screens/ProfileScreen.tsx

1. Extract profile sections into components:
   - `ProfileHeader.tsx` — avatar, name, email display
   - `SubscriptionCard.tsx` — subscription status, plan info, upgrade CTA
   - `StatsSection.tsx` — usage statistics, streaks
   - `AccountActions.tsx` — logout, delete account, export data

For all extractions:
- Preserve all existing props, types, and accessibility attributes.
- Keep all testID attributes intact.
- Use named exports, not default exports.
- Run TypeScript compilation after each file to verify no type errors.
- Verify the app still builds and the screens render correctly.
```

</details>

---

### 2. Reduce Remaining `any` Types (Code Quality)

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

### 3. No E2E Mobile Test Suite (Mobile / Code Quality)

**Source:** `10-mobile.md` — Testing Infrastructure graded B+
**Impact:** 354 `testID` props exist across the app but no Detox, Maestro, or Appium test suite exercises them. Integration tests exist for server flows, but the mobile UI has no automated end-to-end test coverage.

<details>
<summary>Prompt</summary>

```
Set up a Maestro end-to-end test suite for the React Native app. Maestro is the simplest option for Expo apps and doesn't require native build tooling.

1. Install Maestro CLI (follow https://maestro.mobile.dev/getting-started/installing-maestro).

2. Create a `e2e/` directory at the project root with the following test flows:

### e2e/auth-flow.yaml
- Launch app
- Tap "Sign Up" button (testID: "button-signup")
- Fill email field (testID: "input-email") with a unique test email
- Fill password field (testID: "input-password")
- Tap submit
- Assert onboarding screen is visible
- Complete onboarding steps
- Assert main tab bar is visible

### e2e/inventory-flow.yaml
- (Assume logged in — use Maestro's `runFlow` to run auth first)
- Tap inventory tab (testID: "tab-inventory")
- Tap add button (testID: "button-add")
- Fill item name (testID: "input-item-name") with "Test Apple"
- Set quantity to 3
- Set category to "Fruits"
- Tap save
- Assert "Test Apple" appears in inventory list
- Swipe left on the item
- Tap delete
- Assert "Test Apple" is removed

### e2e/recipe-flow.yaml
- Tap recipes tab (testID: "tab-recipes")
- Tap generate recipe button
- Assert recipe generation screen loads
- (If subscription is required, assert upgrade prompt appears)

### e2e/settings-flow.yaml
- Navigate to settings/profile
- Assert profile information is displayed
- Toggle theme (dark/light)
- Assert theme change is reflected

3. Add `"test:e2e": "maestro test e2e/"` script to package.json.

4. Create `e2e/README.md` documenting:
   - Prerequisites (Maestro CLI, running emulator/simulator)
   - How to run: `npm run test:e2e`
   - How to add new flows
   - Known limitations

Note: Maestro flows use YAML, not JavaScript. Reference testID attributes with `id:` selector in Maestro.
```

</details>

---

## Already Remediated (Verified in This Review)

The following items were previously listed as remaining but are confirmed done in the codebase:

| # | Item | Evidence |
|---|------|----------|
| 1 | **Import transaction safety** | Replace-mode import IS wrapped in `db.transaction(async (tx) => {...})` at `syncBackupService.ts:403`. All deletes and inserts use the `tx` handle inside the transaction block. |
| 2 | **Focus management in modals** | `useFocusTrap` hook exists at `client/hooks/useFocusTrap.ts` and is used in 8+ screens (GenerateRecipeScreen, SettingsScreen, AddFoodBatchScreen, AddItemScreen, CookingTermsScreen, ItemDetailScreen, RecipesScreen, MealPlanActionSheet, SettingsAccountData). All include `onAccessibilityEscape` handlers for VoiceOver Z-gesture dismissal. |
| 3 | **Tablet layouts** | All 4 key screens have tablet-responsive layouts via `useDeviceType()`: InventoryScreen (3-column grid + side panel), RecipesScreen (2-column grid + preview panel), MealPlanScreen (7-day week view), SettingsScreen (split-pane with category list). Documented in replit.md under 2026-02-14 changes. |
| 4 | **Winback Stripe coupon automation** | Fully automated end-to-end: `winbackJob.ts` creates Stripe coupons (`stripe.coupons.create`), promotion codes (`stripe.promotionCodes.create`), stores them in `winbackCampaigns` table, and sends push notifications. Checkout flow (`checkout.ts`) reads `stripePromotionCodeId` from the campaign and applies it as a discount. |
| 5 | **SwipeableItemCard haptic at threshold** | `SwipeableItemCard.tsx` fires `Haptics.impactAsync(Medium)` in the `onEnd` handler when `translationX` exceeds `SWIPE_THRESHOLD` (line 143-146). Haptic fires on commit for both left and right swipe directions. |
| 6 | **Image accessibility** | All files containing Image components now also have accessibility attributes. Key coverage: ProfileScreen (accessibilityLabel="Profile photo"), GrocerySearchScreen (accessibilityLabel per product), RecipeHero (accessibilityLabel per recipe title), FloatingChatButton (accessibilityElementsHidden), ImageAnalysisResult (accessibilityLabel="Analyzed food image"), CookwareScreen, FoodCameraScreen, ReceiptScanScreen, SelectRecipeScreen, RecipesScreen — all verified with labels or hidden markers. |

---

## Lower-Priority Items (Not Requiring Dedicated Prompts)

These are minor considerations documented in the scorecards but unlikely to impact users significantly:

| # | Category | Item |
|---|----------|------|
| 1 | Security | In-memory rate limiter state not shared across multiple server instances |
| 2 | Security | No key rotation mechanism for TOKEN_ENCRYPTION_KEY |
| 3 | Security | CSP `img-src` allows broad `https:` origins |
| 4 | Error Handling | Rate limit responses not using standardized `errorResponse()` format |
| 5 | Error Handling | Client-side error rate tracking to prevent Sentry flooding |
| 6 | Performance | No ETag/conditional responses for API endpoints |
| 7 | Performance | `sharp` triple instantiation (metadata + display + thumbnail) |
| 8 | Performance | Sync queue AsyncStorage serialization overhead |
| 9 | Data Management | Stricter Zod schemas for KV sections (preferences, analytics) |
| 10 | Data Management | Object storage not included in disaster recovery plan |
| 11 | Data Management | Add timestamp comparison for merge-mode imports |
| 12 | Data Management | Add import size limits to prevent memory exhaustion |
| 13 | Accessibility | No skip-navigation link on web pages |
| 14 | Accessibility | No `announceForAccessibility()` for transient confirmations |
| 15 | Accessibility | Color contrast not verified against WCAG AA/AAA |
| 16 | UI/UX | Hardcoded colors in CustomTabBar and FloatingChatButton |
| 17 | UI/UX | No visual preview of locked premium features |
| 18 | Code Quality | Unused dependency cleanup (run Knip) |
| 19 | Code Quality | Move remaining business logic from fat routers to services |
| 20 | Code Quality | Add Jest coverage thresholds |
| 21 | Mobile | No notification grouping or rich notifications |
| 22 | Mobile | No landscape orientation support |
| 23 | Core Features | No meal plan auto-generation from inventory |
| 24 | Core Features | No barcode product database lookup |
| 25 | Monetization | Annual discount below industry standard (17% vs 20-40%) |
