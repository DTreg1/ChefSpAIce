# ChefSpAIce Project Scorecard

> **Generated:** February 8, 2026
> **Project:** ChefSpAIce — Kitchen Inventory, AI Recipes & Meal Planning
> **Stack:** React Native (Expo) + Express.js + PostgreSQL + Stripe + OpenAI

---

## Scoring Summary

| Category | Score | Grade |
|---|---|---|
| UI/UX Design | 8.0 / 10 | B+ |
| Core Features | 8.5 / 10 | A- |
| Performance | 7.0 / 10 | B |
| Security | 8.5 / 10 | A- |
| Error Handling | 7.5 / 10 | B+ |
| Accessibility | 7.0 / 10 | B |
| Code Quality | 6.5 / 10 | C+ |
| Mobile | 8.0 / 10 | B+ |
| Data Management | 8.0 / 10 | B+ |
| Monetization | 8.5 / 10 | A- |
| **Overall** | **7.7 / 10** | **B+** |

---

## 1. UI/UX Design — 8.0 / 10

### What's Working
- iOS 26 Liquid Glass design aesthetic with consistent theme system
- Custom animated background, glass cards, and blur effects
- Dark/light mode support via `ThemeContext`
- Custom tab bar with haptic feedback and animations
- Skeleton loading states for most screens
- Empty states with actionable CTAs
- Guided onboarding flow for new users

### Issues Found

#### Issue 1.1 — Rate limiter startup warning pollutes logs
**Severity:** Low
**File:** `server/middleware/rateLimiter.ts`
**Problem:** The `passwordResetLimiter` uses `req.ip` in `keyGenerator` without the IPv6 helper, causing a `ValidationError` on every server start.

**Fix prompt:**
```
In server/middleware/rateLimiter.ts, update the passwordResetLimiter's keyGenerator to use the express-rate-limit ipKeyGenerator helper for IPv6 compatibility. Import { ipKeyGenerator } from "express-rate-limit" and change keyGenerator to: (req) => req.body?.email || ipKeyGenerator(req). This eliminates the ERR_ERL_KEY_GEN_IPV6 warning on startup.
```

#### Issue 1.2 — No pull-to-refresh on Recipes screen
**Severity:** Medium
**File:** `client/screens/RecipesScreen.tsx`
**Problem:** The Inventory and Meal Plan screens have `RefreshControl`, but the Recipes screen lacks it, creating inconsistent UX.

**Fix prompt:**
```
In client/screens/RecipesScreen.tsx, add a RefreshControl component to the FlatList. Import RefreshControl from react-native. Add a refreshing state (useState(false)), create a handleRefresh callback that re-fetches saved recipes from storage, and pass refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.primary} />} to the FlatList component.
```

#### Issue 1.3 — No confirmation feedback after successful actions
**Severity:** Low
**File:** Multiple screens
**Problem:** Some actions like saving a recipe, adding food items, or completing onboarding don't provide enough visual confirmation (e.g., a success toast or animation).

**Fix prompt:**
```
Add a lightweight success feedback pattern across the app. In key action handlers (e.g., after saving a recipe in RecipeDetailScreen.tsx, after adding an item in AddItemScreen.tsx), add a brief success Alert.alert or a custom toast notification confirming the action completed. Example: Alert.alert("Success", "Item added to your kitchen!") after successful item creation.
```

---

## 2. Core Features — 8.5 / 10

### What's Working
- Full inventory management with expiration tracking
- AI-powered recipe generation with OpenAI integration
- Barcode scanning, food camera, recipe scanning, receipt scanning
- Meal planning with weekly view and drag-and-drop
- Shopping list generation from meal plans
- AI chat assistant with function calling
- Voice commands for hands-free cooking
- Cookware management affecting recipe suggestions
- Nutrition data from USDA FoodData Central
- Waste reduction tracking and analytics
- Cooking terms glossary with in-recipe highlighting
- Data export (CSV/PDF) and import
- Instacart integration for grocery delivery

### Issues Found

#### Issue 2.1 — Chat modal lacks message persistence across app restarts
**Severity:** Medium
**File:** `client/components/ChatModal.tsx`
**Problem:** Chat messages are stored in component state. When the app is closed and reopened, previous conversations are lost.

**Fix prompt:**
```
In client/components/ChatModal.tsx, persist chat messages to AsyncStorage. After each new message is added to the messages state, save the updated array to AsyncStorage using storage.saveChatMessages(). On component mount, load previous messages with storage.getChatMessages(). Add a "Clear Chat" button in the chat header that clears both state and storage. The storage functions already exist in client/lib/storage.ts.
```

#### Issue 2.2 — Recipe generation doesn't validate ingredient availability before starting
**Severity:** Low
**File:** `client/screens/GenerateRecipeScreen.tsx`
**Problem:** Users can attempt to generate recipes without selecting any ingredients, leading to generic AI responses.

**Fix prompt:**
```
In client/screens/GenerateRecipeScreen.tsx, add validation before the recipe generation API call. Check that at least one ingredient is selected or that the user has typed a description. If neither condition is met, show an Alert.alert("No Ingredients", "Please select at least one ingredient or describe what you'd like to cook.") and return early from the generation handler.
```

#### Issue 2.3 — Shelf-life suggestions use hardcoded 7-day default without user notification
**Severity:** Low
**File:** `client/hooks/useShelfLifeSuggestion.ts`
**Problem:** When no shelf-life data is found, the hook silently defaults to 7 days with "low" confidence but doesn't clearly communicate this to the user.

**Fix prompt:**
```
In client/hooks/useShelfLifeSuggestion.ts, when the suggestion has confidence "low" and needsAI is true, return additional metadata like isDefault: true. Then in the AddItemScreen.tsx where the shelf life is displayed, show a subtle warning badge or caption text saying "Estimated — tap to adjust" next to dates that came from the default 7-day estimate. This helps users know the expiration date may need manual adjustment.
```

---

## 3. Performance — 7.0 / 10

### What's Working
- FlatList virtualization for inventory, recipes, and chat (20 instances found)
- `useMemo`/`useCallback` usage across screens (104 instances)
- `React.memo` on reusable components like `MenuItem`, `NutritionLabel`, `LocationChip`
- Image compression before storage (`recipe-image.ts`)
- React Query with `staleTime: Infinity` for intelligent caching
- Lazy loading of `expo-notifications` and `expo-apple-authentication`
- `initialNumToRender` and `maxToRenderPerBatch` tuning on key lists
- USDA API result caching on the server

### Issues Found

#### Issue 3.1 — storage.ts loads all data into memory on every operation
**Severity:** High
**File:** `client/lib/storage.ts`
**Problem:** At ~51KB, `storage.ts` handles all local data operations. Many functions call `getAllItems()` which loads the entire dataset from AsyncStorage, even for single-item lookups. This causes performance degradation as inventory grows.

**Fix prompt:**
```
In client/lib/storage.ts, optimize the data access pattern for single-item operations. For functions like getInventoryItem(id), instead of calling getAllInventoryItems() and filtering, maintain a lightweight index (Map<id, storageKey>) in memory. When looking up a single item, read only that item's key from AsyncStorage. For list operations that need filtering, add pagination support: getInventoryItems({ offset, limit, category }) that reads only the needed slice. This reduces memory pressure and speeds up lookups as inventory grows beyond 100+ items.
```

#### Issue 3.2 — Sync manager processes all entities serially
**Severity:** Medium
**File:** `client/lib/sync-manager.ts`
**Problem:** At ~34KB, the sync manager processes each entity type (inventory, recipes, meal plans, etc.) one at a time. Large sync operations can block the UI thread.

**Fix prompt:**
```
In client/lib/sync-manager.ts, batch the sync operations. Instead of processing one entity at a time in the processSyncQueue method, use Promise.allSettled to process independent entity types in parallel (e.g., inventory sync and recipe sync can happen simultaneously). Add a concurrency limit of 3 to prevent overwhelming the server. Also consider moving the sync processing to a web worker or using InteractionManager.runAfterInteractions() to avoid blocking user interactions during large syncs.
```

#### Issue 3.3 — No server-side pagination for API endpoints
**Severity:** Medium
**File:** `server/routers/sync.router.ts`
**Problem:** Sync endpoints return all items for a user without pagination. Users with large inventories will experience slow sync times and high memory usage.

**Fix prompt:**
```
In server/routers/sync.router.ts, add pagination parameters to the sync pull endpoint. Accept query parameters ?page=1&limit=50 and apply LIMIT/OFFSET to database queries. Return pagination metadata in the response: { data: [...], pagination: { page, limit, total, hasMore } }. Update the client sync-manager.ts to request pages sequentially, merging results locally until hasMore is false.
```

#### Issue 3.4 — FoodSearchAutocomplete uses ScrollView instead of FlatList
**Severity:** Low
**File:** `client/components/FoodSearchAutocomplete.tsx`
**Problem:** Search results are rendered inside a `ScrollView` which renders all items at once, instead of using `FlatList` for virtualized rendering.

**Fix prompt:**
```
In client/components/FoodSearchAutocomplete.tsx, replace the ScrollView rendering search results with a FlatList. Change the results container to use <FlatList data={results} renderItem={({ item }) => <ResultItem item={item} />} keyExtractor={(item) => item.fdcId?.toString() || item.description} initialNumToRender={10} maxToRenderPerBatch={5} />. This virtualizes the list and improves performance for searches returning many results.
```

---

## 4. Security — 8.5 / 10

### What's Working
- Bcrypt password hashing with configurable rounds
- Bearer token authentication with SHA-256 hashed session storage
- Session expiration with automatic cleanup job
- User-agent mismatch detection on sessions
- CSRF protection via double-submit pattern (`csrf-csrf`)
- Helmet.js for security headers
- Rate limiting on auth endpoints (10/15min), AI endpoints (30/min), general (100/min)
- Prompt injection sanitization for AI recipe generation
- Input validation with Zod schemas throughout
- Admin role verification for privileged endpoints
- Subscription tier enforcement middleware
- Grace period handling for payment failures
- Cookies set with `httpOnly`, `secure`, `sameSite: lax`

### Issues Found

#### Issue 4.1 — CSRF secret falls back to random generation without persistence
**Severity:** Medium
**File:** `server/middleware/csrf.ts`
**Problem:** `CSRF_SECRET` falls back to `crypto.randomBytes(32)` if the environment variable isn't set. This means every server restart generates a new secret, invalidating all existing CSRF tokens.

**Fix prompt:**
```
Set a persistent CSRF_SECRET environment variable. Use the environment variable management to set CSRF_SECRET to a stable random value in the shared environment. Generate a value with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))". Then in server/middleware/csrf.ts, add a startup check: if (!process.env.CSRF_SECRET) { logger.warn("CSRF_SECRET not set, using random value - tokens will not persist across restarts"); }
```

#### Issue 4.2 — Rate limiter on password reset allows email enumeration
**Severity:** Low
**File:** `server/middleware/rateLimiter.ts`
**Problem:** The `passwordResetLimiter` uses `req.body?.email` as the key, but falls back to `req.ip`. An attacker could enumerate emails by observing different rate limit behavior per email address.

**Fix prompt:**
```
In server/middleware/rateLimiter.ts, change the passwordResetLimiter to always return a consistent response regardless of whether the email exists. In the password reset endpoint handler (server/routers/auth.router.ts), ensure the response is always "If an account with that email exists, a reset link has been sent" — never revealing whether the email was found. This prevents email enumeration even if rate limits differ.
```

#### Issue 4.3 — Auth router has a demo login bypass in production
**Severity:** Medium
**File:** `server/routes.ts` (lines ~230+)
**Problem:** The test/demo endpoints at the bottom of routes.ts include a bcrypt import and demo login functionality that may be accessible in production.

**Fix prompt:**
```
In server/routes.ts, wrap ALL test/demo endpoints in a strict environment check. Find the section that registers test endpoints and ensure it is guarded by: if (process.env.NODE_ENV === "development") { ... }. Verify the guard exists and covers ALL demo endpoints including the demo login. Add a log message: logger.info("Test endpoints disabled in production mode") when not in development.
```

---

## 5. Error Handling — 7.5 / 10

### What's Working
- Centralized `AppError` class with typed error codes (400, 401, 403, 404, 409, 500)
- Global error handler middleware with request ID tracking
- `ErrorBoundary` component wrapping the entire app
- `ErrorFallback` component with retry capabilities
- 339 try/catch blocks across server routers
- Consistent error response format with `errorResponse` helper
- Offline mutation queueing with retry logic
- User-facing `Alert.alert` for critical errors

### Issues Found

#### Issue 5.1 — ErrorBoundary doesn't report errors to any monitoring service
**Severity:** Medium
**File:** `client/components/ErrorBoundary.tsx`
**Problem:** The `ErrorBoundary` catches rendering errors and shows a fallback UI, but doesn't report them to any error tracking service. Crashes in production will go unnoticed.

**Fix prompt:**
```
In client/components/ErrorBoundary.tsx, add error reporting to the componentDidCatch method. Send the error details to the backend: fetch(`${API_URL}/api/feedback`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'crash_report', error: error.message, stack: errorInfo.componentStack, timestamp: new Date().toISOString(), platform: Platform.OS }) }). This ensures production crashes are logged and can be investigated.
```

#### Issue 5.2 — Several async handlers missing try-catch in server routers
**Severity:** Medium
**File:** Various server routers
**Problem:** While most routers have try-catch blocks, some async route handlers rely solely on the global error handler. If a thrown error is not an `AppError`, users get a generic 500 response without helpful context.

**Fix prompt:**
```
Audit all server routers for async handlers that lack try-catch blocks. For each handler, wrap the body in try { ... } catch (error) { next(error); }. Focus on: server/routers/donations.router.ts, server/routers/external-api.router.ts, and server/routers/referral.router.ts. Each catch block should call next(error) to pass the error to the global error handler, which will properly format and log it with request IDs.
```

#### Issue 5.3 — Offline queue doesn't surface permanent failures to the user clearly
**Severity:** Medium
**File:** `client/lib/sync-manager.ts`
**Problem:** When a queued mutation fails permanently (marked as "fatal"), the user only sees a generic `Alert.alert`. The failed operation details (what was being saved) aren't shown.

**Fix prompt:**
```
In client/lib/sync-manager.ts, improve the fatal error notification in processSyncQueue. When a mutation is marked fatal, include specifics in the alert: Alert.alert("Sync Failed", `Could not save your ${entityType} "${entityName}". The change has been discarded. You may need to re-enter this data.`, [{ text: "OK" }, { text: "View Details", onPress: () => showErrorDetails(error) }]). Extract entityType and entityName from the mutation payload to provide context.
```

---

## 6. Accessibility — 7.0 / 10

### What's Working
- 111 `accessibilityRole`/`accessibilityLabel`/`accessibilityHint` annotations across screens
- Web accessibility utility (`web-accessibility.ts`) with keyboard navigation and focus styles
- Voice control integration for hands-free cooking
- Custom tab bar with full accessibility state management
- `accessibilityViewIsModal` on modal overlays
- Empty states with accessible action buttons

### Issues Found

#### Issue 6.1 — Many interactive elements lack accessibility labels
**Severity:** High
**File:** Multiple screens
**Problem:** While 111 accessibility annotations exist, many Pressable and button elements across the app lack `accessibilityRole` and `accessibilityLabel`. Screen readers will announce these as unlabeled elements.

**Fix prompt:**
```
Run a systematic audit of all Pressable, TouchableOpacity, and custom button components across client/screens/ and client/components/. For each interactive element, add at minimum: accessibilityRole="button" and accessibilityLabel="descriptive action name". Priority files to audit:
1. client/screens/ProfileScreen.tsx — settings toggle switches need labels
2. client/screens/MealPlanScreen.tsx — day selector and meal slot buttons
3. client/screens/CookwareScreen.tsx — cookware item actions
4. client/components/DrawerContent.tsx — drawer menu items
For each element, the label should describe the action ("Delete item", "Select Monday", "Toggle dark mode") not the visual appearance.
```

#### Issue 6.2 — Color contrast not validated for all theme combinations
**Severity:** Medium
**File:** `client/constants/theme.ts`
**Problem:** The glass effect styling with transparency and blur may produce insufficient color contrast ratios in some configurations, especially for `textSecondary` and `textTertiary` colors over glass backgrounds.

**Fix prompt:**
```
In client/constants/theme.ts, audit the text colors against their most common backgrounds. Ensure all text colors meet WCAG 2.1 AA minimum contrast ratios (4.5:1 for normal text, 3:1 for large text). Key areas to check:
1. textSecondary over backgroundDefault in both light and dark modes
2. textTertiary over glass card backgrounds (which have transparency)
3. Badge text over badge backgrounds (ExpiryBadge, NutritionScoreBadge)
If contrast is insufficient, increase the text color darkness (light mode) or lightness (dark mode) by adjusting the HSL lightness value. Use a contrast checker tool to verify ratios.
```

#### Issue 6.3 — FlatList items lack individual accessibility announcements
**Severity:** Medium
**File:** `client/screens/InventoryScreen.tsx`
**Problem:** While the FlatList has `accessibilityRole="list"`, individual inventory items don't announce their expiration status or category to screen readers.

**Fix prompt:**
```
In client/screens/InventoryScreen.tsx and the inventory item components, add descriptive accessibilityLabel to each list item. The label should include: item name, quantity, expiration status, and storage location. Example: accessibilityLabel={`${item.name}, ${item.quantity} ${item.unit}, expires ${formatRelativeDate(item.expirationDate)}, stored in ${item.storageArea}`}. Also add accessibilityHint="Double tap to view item details" to each Pressable item wrapper.
```

---

## 7. Code Quality — 6.5 / 10

### What's Working
- Comprehensive JSDoc comments on most files and functions
- Consistent file structure: screens, components, hooks, lib, contexts
- Shared schema with Drizzle ORM + Zod validation
- Clean separation of concerns: storage layer, API layer, UI layer
- TypeScript throughout with proper type inference from schema
- 317 `data-testid` attributes for testing

### Issues Found

#### Issue 7.1 — TypeScript errors in shared/schema.ts (6 LSP errors)
**Severity:** High
**File:** `shared/schema.ts`
**Problem:** 6 TypeScript errors of type `Type 'any' is not assignable to type 'never'` at lines 318, 357, 386, 419, 448, and 1083. These indicate type mismatches in the Drizzle schema definitions that could cause runtime issues.

**Fix prompt:**
```
In shared/schema.ts, fix the 6 TypeScript errors. At lines 318, 357, 386, 419, 448, and 1083, the issue is likely with jsonb() column defaults or insert schema transformations where 'any' is being assigned to a typed column. For each error:
1. Read the exact line and surrounding context
2. If it's a .default() on a jsonb column, type the default value explicitly: .default(sql`'[]'::jsonb`) or cast it: .default([] as string[])
3. If it's in a createInsertSchema transform, add explicit type annotations to the transform function parameters
4. Run TypeScript check after each fix to verify the error is resolved
Fix all 6 errors to achieve zero TypeScript diagnostics.
```

#### Issue 7.2 — Massive file sizes indicate need for decomposition
**Severity:** Medium
**Files:** `client/lib/storage.ts` (51KB), `client/screens/AddItemScreen.tsx` (55KB), `client/lib/sync-manager.ts` (34KB), `client/components/ChatModal.tsx` (40KB)
**Problem:** Several files exceed 30KB, making them difficult to maintain, test, and review. `AddItemScreen.tsx` at 55KB is particularly problematic.

**Fix prompt:**
```
Decompose the largest files into focused modules:

1. client/screens/AddItemScreen.tsx (55KB) — Extract into:
   - AddItemScreen.tsx (main container, navigation, state orchestration)
   - components/add-item/ItemBasicInfo.tsx (name, category, quantity fields)
   - components/add-item/ExpirationSection.tsx (date picker, shelf life)
   - components/add-item/NutritionSection.tsx (nutrition data display)
   - components/add-item/StorageSection.tsx (storage area selection)
   - hooks/useAddItemForm.ts (form state management)

2. client/lib/storage.ts (51KB) — Extract into:
   - storage/inventory-storage.ts
   - storage/recipe-storage.ts
   - storage/meal-plan-storage.ts
   - storage/preferences-storage.ts
   - storage/index.ts (re-exports all)

3. client/components/ChatModal.tsx (40KB) — Extract into:
   - ChatModal.tsx (modal container)
   - chat/MessageList.tsx (message rendering)
   - chat/ChatInput.tsx (input with voice)
   - chat/MessageBubble.tsx (individual message)
   - hooks/useChatMessages.ts (message state management)
```

#### Issue 7.3 — Inconsistent error logging patterns
**Severity:** Low
**File:** Multiple files
**Problem:** Some files use `console.log`/`console.error` while others use the custom `logger` utility. This makes it hard to control log levels and format in production.

**Fix prompt:**
```
Search for all console.log, console.error, and console.warn usage across client/ and server/ directories. Replace them with the appropriate logger calls:
- console.log → logger.log or logger.info
- console.error → logger.error
- console.warn → logger.warn
The logger is already available at client/lib/logger.ts and server/lib/logger.ts. Import it in each file that uses console directly. This ensures consistent log formatting and allows log level control in production.

Run: grep -rn "console\.\(log\|error\|warn\)" client/ server/ --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v ".test." to find all instances.
```

#### Issue 7.4 — Missing unit tests for critical business logic
**Severity:** Medium
**File:** Various
**Problem:** Only 2 test files exist (`nutrition-score.test.ts`, `shelf-life-data.test.ts`). Critical logic like sync conflict resolution, subscription tier enforcement, and auth token handling lack tests.

**Fix prompt:**
```
Add unit tests for the most critical business logic:

1. Create server/__tests__/auth.test.ts — Test token hashing, session expiration, user-agent mismatch detection
2. Create server/__tests__/requireSubscription.test.ts — Test tier enforcement, grace period calculation, past_due handling
3. Create server/__tests__/rateLimiter.test.ts — Test rate limit thresholds and skip conditions
4. Create client/lib/__tests__/sync-manager.test.ts — Test conflict resolution, retry logic, fatal error detection
5. Create server/__tests__/errorHandler.test.ts — Test AppError factory methods, global error handler formatting

Use the existing test setup (likely Jest) and mock database calls with jest.mock(). Each test file should cover happy path, edge cases, and error scenarios.
```

---

## 8. Mobile — 8.0 / 10

### What's Working
- Tablet-adaptive layouts for Inventory (2 columns), Recipes (3-4 columns), Meal Plan (side-by-side)
- `useDeviceType` hook for responsive breakpoints
- Platform-specific code paths (iOS/Android/Web) throughout
- Safe area handling with `useSafeAreaInsets`
- Bottom tab bar height awareness
- Haptic feedback integration
- Native camera and barcode scanning
- Keyboard-aware scroll views
- Expo Image for optimized image loading
- React Native Reanimated for smooth animations
- Gesture handling with `react-native-gesture-handler`

### Issues Found

#### Issue 8.1 — No landscape orientation support
**Severity:** Medium
**File:** App configuration
**Problem:** The app appears to be locked to portrait orientation. Users on tablets who rotate to landscape get a suboptimal experience.

**Fix prompt:**
```
In app.json (or app.config.ts), update the orientation setting to support both portrait and landscape on tablets while keeping portrait-only on phones. Set "orientation": "default" for iPad and "portrait" for iPhone. Then audit the key screens (InventoryScreen, RecipesScreen, MealPlanScreen) to ensure their layouts adapt gracefully to landscape. Use useWindowDimensions() to detect orientation and adjust column counts or layout direction accordingly.
```

#### Issue 8.2 — Android-specific styling issues not fully addressed
**Severity:** Low
**File:** Multiple screens
**Problem:** Several Platform.OS checks exist for iOS-specific features (BlurView, liquid glass) but the Android fallback styling is sometimes minimal or uses basic `View` without matching visual polish.

**Fix prompt:**
```
Audit all Platform.OS === "ios" conditional renders across the app and ensure Android alternatives provide visual parity. Key areas:
1. client/components/ExpoGlassHeader.tsx — Android should use a semi-transparent background with elevation shadow instead of BlurView
2. client/components/GlassCard.tsx — Android fallback should include a subtle border and background tint
3. client/components/CustomTabBar.tsx — Android tab bar should use elevation shadow instead of blur
For each case, replace simple View fallbacks with styled alternatives that match the iOS aesthetic using background colors with opacity and shadow properties.
```

#### Issue 8.3 — Deep linking configuration not fully tested
**Severity:** Low
**File:** `client/lib/deep-linking.ts`
**Problem:** Deep linking is configured but may not handle all edge cases (app not running, app in background, malformed URLs).

**Fix prompt:**
```
In client/lib/deep-linking.ts, add robust URL validation and error handling:
1. Validate incoming URLs match expected patterns before navigating
2. Add fallback handling for unrecognized deep link paths (navigate to home screen with a toast)
3. Handle the case where the target screen requires auth but the user isn't logged in (queue the navigation and redirect to auth first)
4. Add logging for all deep link attempts: logger.info("[DeepLink] Received:", url) for debugging
5. Test with malformed URLs to ensure the app doesn't crash
```

---

## 9. Data Management — 8.0 / 10

### What's Working
- 21 PostgreSQL tables with 47 indexes for query performance
- Drizzle ORM with type-safe queries throughout
- Local-first architecture with AsyncStorage
- Real-time sync manager with optimistic updates and conflict resolution
- Delta sync to minimize data transfer
- Offline mutation queue with retry logic
- Session token hashing before storage
- Data export (CSV/PDF) and import capabilities
- Recently deleted items with restore functionality
- Atomic database transactions for critical operations
- Automated session cleanup job (every 24 hours)
- Trial expiration job (every hour)

### Issues Found

#### Issue 9.1 — No database migration tracking or version management
**Severity:** High
**File:** Database configuration
**Problem:** While Drizzle ORM is used, there's no visible migration history or version tracking. Schema changes applied directly can cause data loss or inconsistencies in production.

**Fix prompt:**
```
Set up proper Drizzle migration management:
1. Run: npx drizzle-kit generate to create migration files from the current schema
2. Store migrations in a drizzle/ directory at the project root
3. Create a migration runner that applies pending migrations on server start:
   In server/db.ts, after connecting, call: await migrate(db, { migrationsFolder: './drizzle' })
4. Add to the README or replit.md: "Schema changes require running `npx drizzle-kit generate` to create migration files before deploying"
5. Never use `npx drizzle-kit push` in production — always use generated migrations
```

#### Issue 9.2 — Sync conflict resolution may silently drop user data
**Severity:** Medium
**File:** `client/lib/sync-manager.ts`
**Problem:** When sync conflicts occur (local and server both modified), the resolution strategy may favor server data without giving the user a chance to review what's being overwritten.

**Fix prompt:**
```
In client/lib/sync-manager.ts, improve conflict resolution transparency:
1. When a conflict is detected, log the conflicting fields: logger.warn("[Sync] Conflict detected", { entityType, entityId, localModified, serverModified, conflictingFields })
2. For critical data (inventory items, recipes), show the user a conflict resolution dialog: "This item was modified on another device. Keep your version or use the other device's version?"
3. Store conflict history so users can review past resolutions in Settings > Data Management
4. Add a "force upload" option for users who want their local version to always win
```

#### Issue 9.3 — No data backup/restore mechanism for AsyncStorage
**Severity:** Medium
**File:** `client/lib/storage.ts`
**Problem:** If AsyncStorage is cleared (app reinstall, cache clear), all local data is lost if it hasn't been synced. There's no local backup mechanism.

**Fix prompt:**
```
In client/lib/storage.ts, add a local backup mechanism:
1. Create a backupLocalData() function that exports all AsyncStorage keys to a single JSON file saved to the device's document directory using expo-file-system
2. Create a restoreFromBackup(filePath) function that reads the backup file and restores all keys
3. Schedule automatic backups daily (or after significant data changes) using a background task
4. Add "Backup Data" and "Restore Data" options in the Profile > Data Management section
5. Show the last backup date and size in the settings UI
```

---

## 10. Monetization — 8.5 / 10

### What's Working
- Three subscription tiers: Free, Basic ($4.99/mo, $39.99/yr), Pro ($9.99/mo, $79.99/yr)
- Stripe integration with checkout sessions, webhooks, and subscription management
- Apple StoreKit integration for iOS in-app purchases
- RevenueCat webhook integration for cross-platform purchase tracking
- 7-day free trial with automatic expiration handling
- Subscription proration for upgrades/downgrades
- Multi-step cancellation retention flow with targeted offers:
  - "Too expensive" → 50% off for 3 months
  - "Not using" → Pause subscription for 1-3 months
  - "Missing features" → Roadmap preview
- Payment failure grace period (7 days)
- Admin analytics dashboard with MRR, churn rate, conversion funnel
- Donation support via separate checkout
- AI recipe generation limits per tier (resets monthly)
- Landing page with pricing cards

### Issues Found

#### Issue 10.1 — No trial-to-paid conversion tracking analytics
**Severity:** Medium
**File:** `server/routers/admin/analytics.router.ts`
**Problem:** While trial conversion rate is tracked, there's no detailed funnel showing where users drop off during the trial-to-paid conversion (e.g., which feature usage correlates with conversion).

**Fix prompt:**
```
In server/routers/admin/analytics.router.ts, add a trial engagement endpoint: GET /api/admin/analytics/trial-engagement. Query the database for users currently in trial and calculate:
1. Feature usage during trial (recipes generated, items scanned, meal plans created)
2. Day-by-day engagement (which days of the trial show highest activity)
3. Correlation between feature usage and conversion (users who converted vs. churned)
Return: { trialUsers: number, avgFeaturesUsed: number, conversionByFeatureCount: { features: number, convertedPct: number }[], engagementByDay: { day: number, activeUsers: number }[] }
```

#### Issue 10.2 — Subscription status display doesn't show upcoming renewal date
**Severity:** Low
**File:** `client/screens/ProfileScreen.tsx`
**Problem:** Users can see their current tier but may not see when their next billing cycle is or how much they'll be charged.

**Fix prompt:**
```
In client/screens/ProfileScreen.tsx (subscription section), fetch and display:
1. Current period end date: "Renews on March 15, 2026"
2. Next billing amount: "$4.99/month"
3. If on annual plan, show savings: "You save $19.89/year compared to monthly"
This data should come from the Stripe subscription object. Add a GET /api/subscriptions/billing-details endpoint in server/stripe/subscriptionRouter.ts that returns { currentPeriodEnd, amount, interval, savings }.
```

#### Issue 10.3 — No referral program tracking in the admin dashboard
**Severity:** Low
**File:** `server/routers/referral.router.ts`
**Problem:** A referral router exists but there's no admin visibility into referral program performance (referrals sent, conversions, revenue attributed).

**Fix prompt:**
```
In server/routers/admin/analytics.router.ts, add a referral metrics endpoint: GET /api/admin/analytics/referral-metrics. Query the referral-related tables to calculate:
1. Total referral codes generated
2. Referral codes used (conversions)
3. Conversion rate (used / generated)
4. Revenue attributed to referrals
5. Top referrers by conversion count
Display these metrics in the admin dashboard alongside existing analytics.
```

---

## Execution Order

For maximum impact, fix issues in this priority order:

### Priority 1 — Critical (Fix Immediately)
1. **7.1** — Fix TypeScript errors in shared/schema.ts
2. **9.1** — Set up database migration tracking
3. **3.1** — Optimize storage.ts data access patterns

### Priority 2 — High (Fix This Week)
4. **6.1** — Add missing accessibility labels
5. **5.1** — Add error reporting to ErrorBoundary
6. **4.1** — Persist CSRF secret in environment
7. **4.3** — Guard demo endpoints from production access
8. **3.3** — Add server-side pagination

### Priority 3 — Medium (Fix This Sprint)
9. **7.2** — Decompose oversized files
10. **3.2** — Parallelize sync operations
11. **9.2** — Improve sync conflict resolution transparency
12. **5.2** — Add try-catch to remaining server handlers
13. **5.3** — Improve offline failure messaging
14. **6.2** — Validate color contrast ratios
15. **6.3** — Add item-level accessibility labels
16. **2.1** — Persist chat messages across restarts
17. **10.1** — Add trial engagement analytics
18. **9.3** — Add local data backup mechanism
19. **7.4** — Add unit tests for critical logic

### Priority 4 — Low (Backlog)
20. **1.1** — Fix rate limiter IPv6 warning
21. **1.2** — Add pull-to-refresh on Recipes screen
22. **1.3** — Add success feedback after actions
23. **2.2** — Validate ingredient selection before generation
24. **2.3** — Show confidence level for shelf-life estimates
25. **3.4** — Replace ScrollView with FlatList in search
26. **4.2** — Prevent email enumeration via rate limiting
27. **7.3** — Standardize logging patterns
28. **8.1** — Add landscape orientation support
29. **8.2** — Polish Android fallback styling
30. **8.3** — Harden deep linking error handling
31. **10.2** — Show renewal date in subscription UI
32. **10.3** — Add referral analytics to admin dashboard
