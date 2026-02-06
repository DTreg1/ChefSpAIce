# ChefSpAIce Project Scorecard & Improvement Guide

**Date:** February 6, 2026
**Codebase Size:** ~102,500 lines across ~150+ source files
**Stack:** React Native (Expo) + Express.js + PostgreSQL + Drizzle ORM + OpenAI

---

## Overall Score: 7.6 / 10

| # | Category | Score | Status |
|---|----------|-------|--------|
| 1 | UI/UX Design | 8.0 / 10 | Strong |
| 2 | Core Features | 8.5 / 10 | Strong |
| 3 | Performance | 7.0 / 10 | Needs Work |
| 4 | Security | 7.5 / 10 | Good |
| 5 | Error Handling | 7.5 / 10 | Good |
| 6 | Accessibility | 7.0 / 10 | Needs Work |
| 7 | Code Quality | 7.0 / 10 | Needs Work |
| 8 | Mobile | 8.5 / 10 | Strong |
| 9 | Data Management | 7.5 / 10 | Good |
| 10 | Monetization | 8.0 / 10 | Strong |

---

## 1. UI/UX Design — 8.0 / 10

### What's Working Well
- iOS 26 Liquid Glass Design system provides a polished, modern look
- Centralized theme with light/dark mode support via `ThemeContext`
- Custom `GlassButton`, `GlassCard`, `GlassView` components for consistent styling
- Well-designed custom tab bar with animated add button
- Landing page with hero, features, pricing, and FAQ sections
- Phone frame mockups and screenshot showcases on the landing page

### Issues Found

**Issue 1.1: LandingScreen.tsx is 1,047 lines — too large for a single component**
- Severity: Medium
- Impact: Difficult to maintain, slows down code reviews, harder to test individual sections

**Issue 1.2: Inconsistent loading states**
- Severity: Medium
- Impact: Some screens show skeleton loaders, others show nothing or a simple spinner

**Issue 1.3: No empty state illustrations**
- Severity: Low
- Impact: When lists are empty (recipes, inventory), users see plain text instead of helpful visual guidance

### Step-by-Step Fixes

#### Fix 1.1 — Break up LandingScreen into smaller components
1. Create `client/components/landing/HeroSection.tsx` — Extract the hero banner (lines ~50-200)
2. Create `client/components/landing/FeatureGridSection.tsx` — Extract the feature cards grid
3. Create `client/components/landing/HowItWorksSection.tsx` — Extract step-by-step section
4. Create `client/components/landing/PricingSection.tsx` — Extract pricing comparison
5. Create `client/components/landing/FAQSection.tsx` — Extract FAQ accordion
6. Create `client/components/landing/FooterSection.tsx` — Extract footer
7. Update `client/screens/LandingScreen.tsx` to import and compose these sections
8. Each section should accept theme and navigation props, keeping `LandingScreen` under 200 lines

#### Fix 1.2 — Standardize loading states
1. Open `client/components/Skeleton.tsx` and verify it handles list, card, and detail layouts
2. Create a `client/components/LoadingState.tsx` wrapper component:
   - Accept a `variant` prop: `"list"`, `"detail"`, `"card-grid"`, `"full-page"`
   - Render the appropriate skeleton pattern for each variant
3. Audit every screen that uses `useQuery`:
   - `InventoryScreen.tsx` — Replace any raw `ActivityIndicator` with `<LoadingState variant="list" />`
   - `RecipesScreen.tsx` — Use `<LoadingState variant="card-grid" />`
   - `MealPlanScreen.tsx` — Use `<LoadingState variant="detail" />`
   - `ShoppingListScreen.tsx` — Use `<LoadingState variant="list" />`
4. Ensure every `isLoading` check in query hooks renders the new `LoadingState` component

#### Fix 1.3 — Add empty state designs
1. Create `client/components/EmptyState.tsx`:
   - Props: `icon` (Feather icon name), `title`, `description`, `actionLabel?`, `onAction?`
   - Render a centered layout with icon, text, and optional action button
2. Add empty states to:
   - `InventoryScreen.tsx` — "Your pantry is empty. Add your first item!" with an add button
   - `RecipesScreen.tsx` — "No recipes yet. Generate your first recipe!" with generate button
   - `ShoppingListScreen.tsx` — "Your list is clear. Add items or generate from a recipe!"
   - `MealPlanScreen.tsx` — "No meal plan yet. Create your first weekly plan!"

---

## 2. Core Features — 8.5 / 10

### What's Working Well
- Full inventory management with barcode scanning, AI food identification, and receipt scanning
- AI-powered recipe generation with dietary restrictions, cuisine preferences, and cooking time
- Meal planning with weekly presets and shopping list auto-generation
- Cookware tracking that influences recipe suggestions
- Voice commands for hands-free operation
- AI kitchen assistant chat with function calling
- Data sync between local storage and cloud
- Referral system with bonus credits

### Issues Found

**Issue 2.1: Chat router (`/api/chat`) is not protected by `requireAuth` or `requireSubscription`**
- Severity: High
- Impact: Any unauthenticated user could use the AI chat endpoint, consuming OpenAI API credits

**Issue 2.2: Food search route (`/api/food`) has no auth protection**
- Severity: Medium
- Impact: USDA food search endpoint is open to the public, could be abused

**Issue 2.3: Shelf-life route (`/api/suggestions/shelf-life`) has no auth protection**
- Severity: Medium
- Impact: AI shelf-life suggestions endpoint is open, consuming API resources

### Step-by-Step Fixes

#### Fix 2.1 — Protect the chat endpoint
1. Open `server/routes.ts`
2. Find line 219: `app.use("/api/chat", chatRouter);`
3. Change to: `app.use("/api/chat", requireAuth, requireSubscription, chatRouter);`
4. Test: Send a request to `/api/chat` without auth headers — should receive 401
5. Test: Send a request with valid auth — should work normally

#### Fix 2.2 — Protect food search endpoint
1. Open `server/routes.ts`
2. Find line 220: `app.use("/api/food", foodRouter);`
3. Change to: `app.use("/api/food", requireAuth, foodRouter);`
4. Note: This doesn't need `requireSubscription` since basic users should search food too
5. Test both authenticated and unauthenticated requests

#### Fix 2.3 — Protect shelf-life endpoint
1. Open `server/routes.ts`
2. Find line 222: `app.use("/api/suggestions/shelf-life", shelfLifeRouter);`
3. Change to: `app.use("/api/suggestions/shelf-life", requireAuth, requireSubscription, shelfLifeRouter);`
4. This uses AI, so it should require an active subscription
5. Test: Verify unauthenticated requests return 401

---

## 3. Performance — 7.0 / 10

### What's Working Well
- In-memory caching for USDA barcode lookups with TTL
- Debouncing on food search and shelf-life suggestion hooks
- `useMemo` and `useCallback` used in key components
- Body parsing limited to 1MB to prevent oversized payloads
- Static asset caching with `maxAge: "1y"` for immutable production assets

### Issues Found

**Issue 3.1: No database query optimization — Missing indexes on frequently queried columns**
- Severity: Medium
- Impact: Slow queries as data grows, especially for user lookups and subscription checks

**Issue 3.2: Excessive `console.log` usage in server (270+ instances across server files)**
- Severity: Medium
- Impact: I/O overhead in production, sensitive data potentially logged

**Issue 3.3: No response compression (gzip/brotli)**
- Severity: Medium
- Impact: Larger response payloads, slower API responses especially on mobile networks

**Issue 3.4: No connection pooling configuration visible for database**
- Severity: Low
- Impact: Potential connection exhaustion under high load

**Issue 3.5: Sync endpoint (`/api/sync`) sends full JSON blobs — no delta sync**
- Severity: Medium
- Impact: Large payloads on each sync, wasted bandwidth for small changes

### Step-by-Step Fixes

#### Fix 3.1 — Add missing database indexes
1. Create a new migration file (use Drizzle's migration tool)
2. Add indexes for:
   ```sql
   CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(token);
   CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
   CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
   CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
   CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
   ```
3. The `users.email` column already has a unique constraint which creates an index, but verify the others
4. Run the migration: `npx drizzle-kit push`
5. Test: Query plans should show index usage for session lookups

#### Fix 3.2 — Replace console.log with structured logger
1. Open `server/lib/logger.ts` — the structured logger already exists
2. For each server file that uses `console.log`, `console.error`, or `console.warn`:
   - Replace `console.log(...)` with `logger.info(...)`
   - Replace `console.error(...)` with `logger.error(...)`
   - Replace `console.warn(...)` with `logger.warn(...)`
3. Priority files to fix (highest console.log counts):
   - `server/routers/auth.router.ts` (48 instances)
   - `server/seeds/seed-demo-account.ts` (23 instances)
   - `server/routers/social-auth.router.ts` (21 instances)
   - `server/routers/user/recipes.router.ts` (16 instances)
   - `server/routers/platform/voice.router.ts` (14 instances)
   - `server/stripe/subscriptionRouter.ts` (14 instances)
4. Ensure sensitive data (tokens, passwords, emails) is NEVER logged — redact or omit

#### Fix 3.3 — Add response compression
1. Install `compression` package: Run `npm install compression` and `npm install -D @types/compression`
2. Open `server/index.ts`
3. Add `import compression from "compression";` at the top
4. Add `app.use(compression());` BEFORE body parsing setup, after CORS
5. This automatically compresses JSON responses with gzip, reducing payload sizes 60-80%

#### Fix 3.4 — Configure database connection pooling
1. Open `server/db.ts` (or wherever the database connection is established)
2. Ensure the PostgreSQL pool is configured with:
   ```typescript
   const pool = new Pool({
     connectionString: process.env.DATABASE_URL,
     max: 20,          // Maximum connections
     idleTimeoutMillis: 30000,
     connectionTimeoutMillis: 5000,
   });
   ```
3. The Replit PostgreSQL integration may already handle this, but verify the configuration

#### Fix 3.5 — Implement delta sync
1. Open `server/routers/sync.router.ts`
2. Add a `lastSyncedAt` parameter to the sync endpoint
3. On the server, compare the client's `lastSyncedAt` with the server's `updatedAt`
4. Only return data sections that have changed since `lastSyncedAt`
5. This reduces typical sync payload from potentially hundreds of KB to just a few KB
6. Update the client's `client/lib/sync-manager.ts` to send `lastSyncedAt` and handle partial responses

---

## 4. Security — 7.5 / 10

### What's Working Well
- Bearer token authentication via `requireAuth` middleware
- CSRF protection using double-submit cookie pattern (`csrf-csrf` library)
- Password hashing with bcrypt (12 rounds)
- Rate limiting on auth endpoints (10 req/15min), AI endpoints (30 req/min), general (100 req/min)
- Session expiration checking and cleanup
- Secure cookie configuration (httpOnly, secure in production, sameSite: lax)
- Input validation on pre-registration endpoint (email regex)
- Body size limits (1MB JSON, 10MB file upload)
- CORS whitelist with explicit origin checking

### Issues Found

**Issue 4.1: No `helmet` middleware for security headers**
- Severity: High
- Impact: Missing Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, and other security headers

**Issue 4.2: Unprotected endpoints (chat, food search, shelf-life) — see Core Features**
- Severity: High
- Impact: Resource exhaustion, unauthorized API credit consumption

**Issue 4.3: Session tokens stored as plain text in database**
- Severity: Medium
- Impact: If database is compromised, all session tokens are exposed — should be hashed

**Issue 4.4: No password complexity validation on registration**
- Severity: Medium
- Impact: Users can set weak passwords

**Issue 4.5: Admin middleware uses `(req as any).userId` type assertion**
- Severity: Low
- Impact: Type safety bypass, potential for bugs

### Step-by-Step Fixes

#### Fix 4.1 — Add helmet middleware
1. Install helmet: Run `npm install helmet`
2. Open `server/index.ts`
3. Add `import helmet from "helmet";` at the top
4. Add after CORS setup, before body parsing:
   ```typescript
   app.use(helmet({
     contentSecurityPolicy: {
       directives: {
         defaultSrc: ["'self'"],
         scriptSrc: ["'self'", "'unsafe-inline'", "https://js.stripe.com"],
         styleSrc: ["'self'", "'unsafe-inline'"],
         imgSrc: ["'self'", "data:", "https:", "blob:"],
         connectSrc: ["'self'", "https://api.stripe.com", "https://api.openai.com"],
         frameSrc: ["'self'", "https://js.stripe.com"],
       },
     },
     crossOriginEmbedderPolicy: false,
   }));
   ```
5. Test: Check response headers include X-Frame-Options, X-Content-Type-Options, etc.

#### Fix 4.2 — See Fix 2.1, 2.2, 2.3 above

#### Fix 4.3 — Hash session tokens before storage
1. Open `server/routers/auth.router.ts`
2. When creating sessions, hash the token before storing:
   ```typescript
   import crypto from "crypto";
   const rawToken = crypto.randomBytes(32).toString("hex");
   const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
   // Store hashedToken in the database
   // Return rawToken to the client
   ```
3. Open `server/middleware/auth.ts`
4. When looking up sessions, hash the incoming token first:
   ```typescript
   const rawToken = authHeader.substring(7);
   const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
   // Look up hashedToken in the database
   ```
5. Run a migration to update existing session tokens (or invalidate all sessions, forcing re-login)

#### Fix 4.4 — Add password validation
1. Open `server/routers/auth.router.ts`
2. Find the registration endpoint
3. Add a password validation function:
   ```typescript
   function validatePassword(password: string): string | null {
     if (password.length < 8) return "Password must be at least 8 characters";
     if (!/[A-Z]/.test(password)) return "Password must contain an uppercase letter";
     if (!/[a-z]/.test(password)) return "Password must contain a lowercase letter";
     if (!/[0-9]/.test(password)) return "Password must contain a number";
     return null;
   }
   ```
4. Call this function before hashing the password
5. Return 400 with the validation message if it fails
6. Update the client-side registration form to show these requirements

#### Fix 4.5 — Fix admin middleware types
1. Open `server/middleware/requireAdmin.ts`
2. Replace line 44: `(req as any).userId = user.id;` with `req.userId = user.id;`
3. Remove line 45: `(req as any).user = user;` — if needed, extend the Express Request type properly:
   ```typescript
   declare global {
     namespace Express {
       interface Request {
         user?: typeof users.$inferSelect;
       }
     }
   }
   ```

---

## 5. Error Handling — 7.5 / 10

### What's Working Well
- `AppError` class with factory methods (badRequest, unauthorized, forbidden, notFound, conflict, internal)
- Global error handler middleware with request ID tracing
- Stack traces only exposed in development, not production
- Client-side `ErrorBoundary` component with fallback UI
- Structured JSON error responses with `errorCode` field
- Request ID attached to every request via `requestIdMiddleware`
- Custom structured logger with log levels (debug, info, warn, error)
- Auth error callback mechanism in client query client

### Issues Found

**Issue 5.1: Many route handlers use ad-hoc try/catch instead of `AppError`**
- Severity: Medium
- Impact: Inconsistent error response formats, missing error codes in some responses

**Issue 5.2: Some catch blocks swallow errors or only log them**
- Severity: Medium
- Impact: Client gets generic 500 errors without actionable information

**Issue 5.3: No unhandled rejection handler for the Node.js process**
- Severity: Medium
- Impact: Unhandled promise rejections could silently crash the server

**Issue 5.4: Webhook handler silently catches and logs errors without rethrowing**
- Severity: Medium
- Impact: Failed webhook processing isn't communicated back to Stripe for retry

### Step-by-Step Fixes

#### Fix 5.1 — Standardize error handling with AppError
1. Open `server/middleware/errorHandler.ts` — the `AppError` class is already well-defined
2. For each router file, replace ad-hoc error patterns:

   **Before:**
   ```typescript
   catch (error) {
     console.error("Something failed:", error);
     return res.status(500).json({ error: "Something went wrong" });
   }
   ```

   **After:**
   ```typescript
   catch (error) {
     next(error); // Let the global error handler deal with it
   }
   ```

3. For expected errors, throw `AppError` instances:
   ```typescript
   if (!user) {
     throw AppError.notFound("User not found", "USER_NOT_FOUND");
   }
   ```
4. Priority routers to fix:
   - `server/routers/auth.router.ts`
   - `server/routers/food.router.ts`
   - `server/routers/shelf-life.router.ts`
   - `server/routers/feedback.router.ts`

#### Fix 5.2 — Ensure catch blocks propagate errors
1. Audit every `catch` block in the server directory
2. Any `catch` block that only does `console.error(...)` should also call `next(error)` or throw
3. If the error is expected and recoverable, use `AppError` with appropriate status code
4. If the error is unexpected, pass it to `next()` for the global handler

#### Fix 5.3 — Add process-level error handlers
1. Open `server/index.ts`
2. Add at the bottom of the file (after app setup):
   ```typescript
   process.on("unhandledRejection", (reason, promise) => {
     logger.error("Unhandled Rejection", {
       reason: reason instanceof Error ? reason.message : String(reason),
       stack: reason instanceof Error ? reason.stack : undefined,
     });
   });

   process.on("uncaughtException", (error) => {
     logger.error("Uncaught Exception", {
       error: error.message,
       stack: error.stack,
     });
     process.exit(1);
   });
   ```

#### Fix 5.4 — Fix webhook error handling
1. Open `server/stripe/webhookHandlers.ts`
2. Find the `processSubscriptionEvent` function (line 35)
3. In the catch block (line 61-63), rethrow the error so Stripe can retry:
   ```typescript
   catch (error) {
     logger.error("Error processing webhook event", {
       eventType: event.type,
       error: error instanceof Error ? error.message : String(error),
     });
     throw error; // Rethrow so Stripe retries the webhook
   }
   ```

---

## 6. Accessibility — 7.0 / 10

### What's Working Well
- `accessibilityRole`, `accessibilityLabel`, `accessibilityHint` used across many components (300+ instances)
- `accessibilityState` for disabled/selected states on buttons and tabs
- Custom tab bar uses `accessibilityRole="tab"` with proper state
- `GlassButton` has comprehensive accessibility props including disabled state
- Modal accessibility with `accessibilityViewIsModal`
- Voice input with friendly error messages for different failure modes

### Issues Found

**Issue 6.1: Many interactive elements missing accessibility labels**
- Severity: Medium
- Impact: Screen reader users can't understand what some buttons/controls do

**Issue 6.2: No `accessibilityLiveRegion` for dynamic content updates**
- Severity: Medium
- Impact: Screen readers don't announce when lists update, items are added, or errors appear

**Issue 6.3: Color contrast may be insufficient in some glass-effect components**
- Severity: Medium
- Impact: Users with low vision may struggle to read text over translucent backgrounds

**Issue 6.4: No keyboard navigation support for web version**
- Severity: Low
- Impact: Web users can't navigate with keyboard alone (tab, enter, escape)

**Issue 6.5: No `accessibilityRole` on list items in inventory/recipe lists**
- Severity: Low
- Impact: Screen readers can't communicate list structure to users

### Step-by-Step Fixes

#### Fix 6.1 — Add missing accessibility labels
1. Audit every `Pressable`, `TouchableOpacity`, and `Button` in the client directory
2. For each one missing `accessibilityLabel`, add a descriptive label:
   - Icon-only buttons need labels most urgently (e.g., "Delete item", "Edit recipe", "Close modal")
3. Priority files:
   - `client/screens/InventoryScreen.tsx` — item action buttons
   - `client/screens/RecipeDetailScreen.tsx` — step navigation buttons
   - `client/components/AddMenu.tsx` — quick action buttons
   - `client/components/HeaderMenu.tsx` — menu items

#### Fix 6.2 — Add live regions for dynamic updates
1. When inventory items are added/removed, wrap the list count with:
   ```tsx
   <View accessibilityLiveRegion="polite">
     <ThemedText>{itemCount} items in pantry</ThemedText>
   </View>
   ```
2. When recipe generation completes, announce it:
   ```tsx
   <View accessibilityLiveRegion="assertive">
     <ThemedText>Recipe generated successfully</ThemedText>
   </View>
   ```
3. When errors appear, wrap error messages with `accessibilityLiveRegion="assertive"`

#### Fix 6.3 — Verify color contrast ratios
1. For glass-effect components that overlay text on translucent backgrounds:
   - Ensure a minimum contrast ratio of 4.5:1 for body text
   - Ensure a minimum contrast ratio of 3:1 for large text
2. In `client/components/GlassButton.tsx` and `client/components/GlassCard.tsx`:
   - Add a semi-opaque background layer behind text to guarantee contrast
   - For dark mode: use `rgba(0, 0, 0, 0.6)` minimum behind light text
   - For light mode: use `rgba(255, 255, 255, 0.7)` minimum behind dark text
3. Test with a contrast checker tool

#### Fix 6.4 — Add keyboard navigation for web
1. Open `client/screens/LandingScreen.tsx`
2. Ensure all interactive elements have `tabIndex={0}` on web platform
3. Add `onKeyPress` handlers to critical interactive elements:
   ```tsx
   onKeyPress={(e) => {
     if (e.nativeEvent.key === "Enter" || e.nativeEvent.key === " ") {
       handlePress();
     }
   }}
   ```
4. Add focus styles visible to keyboard users

#### Fix 6.5 — Add list roles
1. In `client/screens/InventoryScreen.tsx`, wrap the FlatList items:
   ```tsx
   <View accessibilityRole="list">
     <FlatList ... renderItem={({ item }) => (
       <View accessibilityRole="listitem" accessibilityLabel={`${item.name}, expires ${item.expiryDate}`}>
         ...
       </View>
     )} />
   </View>
   ```
2. Apply the same pattern to recipe lists, shopping lists, and meal plan items

---

## 7. Code Quality — 7.0 / 10

### What's Working Well
- Clear project structure: `client/`, `server/`, `shared/`
- TypeScript used throughout with types from Drizzle ORM
- Schema defined in shared location (`shared/schema.ts`) for frontend/backend consistency
- Insert schemas generated from Drizzle tables using `drizzle-zod`
- No TODO/FIXME/HACK comments found — clean codebase
- Structured logger implementation with request ID tracing
- 10 server-side test files covering key routers and integrations
- Dedicated middleware files for auth, subscription, CSRF, rate limiting, admin, error handling

### Issues Found

**Issue 7.1: Mixed logging patterns — `console.log` (270+ instances) alongside structured `logger`**
- Severity: Medium
- Impact: Inconsistent log format, harder to parse logs in production, potential data leaks

**Issue 7.2: No client-side test files**
- Severity: Medium
- Impact: No automated testing for React components, hooks, or screens

**Issue 7.3: Large screen files (several screens > 500 lines)**
- Severity: Medium
- Impact: Hard to maintain, test, and review

**Issue 7.4: Type assertions `(req as any)` used in admin middleware**
- Severity: Low
- Impact: Type safety bypassed, potential runtime errors

**Issue 7.5: No consistent API response format**
- Severity: Low
- Impact: Some endpoints return `{ error: "..." }`, others `{ error: "code", message: "..." }`

### Step-by-Step Fixes

#### Fix 7.1 — Migrate all console.log to structured logger (see Fix 3.2)

#### Fix 7.2 — Add client-side tests
1. Create `client/__tests__/` directory
2. Start with hook tests (easiest to unit test):
   - `client/__tests__/useTrialStatus.test.ts` — already exists, ensure it passes
   - `client/__tests__/useSubscription.test.ts` — already exists, ensure it passes
3. Add component tests for critical UI:
   - `client/__tests__/EmptyState.test.tsx`
   - `client/__tests__/GlassButton.test.tsx`
   - `client/__tests__/ExpiryBadge.test.tsx`
4. Use React Native Testing Library (`@testing-library/react-native`)
5. Configure test runner in `vitest.config.ts` or add a separate Jest config for client

#### Fix 7.3 — Break up large screen files
1. Identify screens over 500 lines:
   - `client/screens/LandingScreen.tsx` (1,047 lines) — see Fix 1.1
   - Check: `InventoryScreen.tsx`, `RecipeDetailScreen.tsx`, `SettingsScreen.tsx`, `MealPlanScreen.tsx`
2. For each large screen, extract:
   - Section components (e.g., `InventoryHeader`, `InventoryFilters`, `InventoryList`)
   - Helper functions into utility files
   - Styles into separate files or shared style modules
3. Keep each screen file under 400 lines

#### Fix 7.4 — Fix type assertions (see Fix 4.5)

#### Fix 7.5 — Standardize API response format
1. Create `server/lib/apiResponse.ts`:
   ```typescript
   export function success(data: unknown, message?: string) {
     return { success: true, data, message };
   }

   export function error(message: string, errorCode: string, details?: unknown) {
     return { success: false, error: message, errorCode, details };
   }
   ```
2. Update route handlers to use these helpers instead of ad-hoc JSON responses
3. This ensures every response has `success`, `error`/`data`, and `errorCode` fields

---

## 8. Mobile — 8.5 / 10

### What's Working Well
- React Native with Expo for cross-platform iOS/Android support
- React Navigation with bottom tab navigator and stack navigators
- Safe area handling with `react-native-safe-area-context`
- Gesture handling with `react-native-gesture-handler`
- Keyboard-aware scroll views with `react-native-keyboard-controller`
- Expo Camera integration for barcode scanning
- AsyncStorage for offline-first data persistence
- Push notification support for expiring items
- Biometric authentication hook (`useBiometricAuth`)
- Deep linking support
- Siri Shortcuts integration
- StoreKit integration for iOS subscriptions
- Custom animated tab bar with haptic feedback

### Issues Found

**Issue 8.1: No explicit offline mode UI indicator beyond `OfflineIndicator` component**
- Severity: Low
- Impact: Users may not understand why actions fail when offline

**Issue 8.2: No app-level connectivity handler that queues failed mutations**
- Severity: Medium
- Impact: Mutations made offline may be lost if the sync manager doesn't catch them

**Issue 8.3: Metro proxy error page is raw HTML with no styling**
- Severity: Low
- Impact: Poor developer experience when Metro bundler isn't ready

### Step-by-Step Fixes

#### Fix 8.1 — Improve offline mode indication
1. Open `client/components/OfflineIndicator.tsx`
2. Ensure it's rendered at a consistent position (top of screen, below header)
3. Make it dismissible but re-appearing
4. Add animations for appearing/disappearing
5. Ensure it's included in all screen layouts, not just some

#### Fix 8.2 — Add offline mutation queue
1. Open `client/lib/sync-manager.ts`
2. Add a mutation queue system:
   - When a mutation fails due to network error, push it to an AsyncStorage queue
   - When connectivity is restored (detected by the existing `isOnline` check), replay queued mutations
   - Show a badge/count of pending mutations in the sync indicator
3. Update `client/lib/query-client.ts` to catch network errors in `apiRequest` and queue them

#### Fix 8.3 — Style Metro error page
1. Open `server/index.ts`, find line 211-212
2. Replace the raw HTML with a styled error page:
   ```html
   <html><body style="font-family: -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f5f5f5;">
   <div style="text-align: center; padding: 40px;"><h1>Starting up...</h1><p>The development server is loading. Please refresh in a moment.</p></div>
   </body></html>
   ```

---

## 9. Data Management — 7.5 / 10

### What's Working Well
- Local-first architecture with AsyncStorage
- Cloud sync via `user_sync_data` table with per-section JSONB columns
- Drizzle ORM with proper schema definitions and relationships
- Foreign key constraints with cascade deletes
- Database indexes on frequently queried columns (cooking_terms, feedback, appliances)
- Unique constraints preventing duplicate auth providers and user appliances
- Sync state tracking with `lastSyncedAt` timestamps
- Consumed/waste logging for analytics

### Issues Found

**Issue 9.1: `user_sync_data` uses JSONB blobs instead of normalized tables**
- Severity: Medium
- Impact: Can't query individual inventory items server-side, no referential integrity for synced data

**Issue 9.2: No database backup strategy documented**
- Severity: Medium
- Impact: Data loss risk if the database fails

**Issue 9.3: No data export feature for users (GDPR compliance)**
- Severity: High
- Impact: Users can't download their data, potential regulatory issues

**Issue 9.4: No soft delete — items are permanently deleted**
- Severity: Low
- Impact: No recovery for accidentally deleted items

**Issue 9.5: Sync conflict resolution strategy is not documented**
- Severity: Low
- Impact: Edge cases where local and cloud data diverge may cause data loss

### Step-by-Step Fixes

#### Fix 9.1 — Plan for normalized sync data (Long-term)
1. This is a significant architectural change — plan carefully
2. Create normalized tables: `user_inventory_items`, `user_recipes`, `user_meal_plans`
3. Add proper foreign keys and indexes
4. Migrate existing JSONB data to normalized tables with a migration script
5. Update sync endpoints to work with normalized data
6. This enables server-side querying, analytics, and better data integrity

#### Fix 9.2 — Document backup strategy
1. Replit's built-in PostgreSQL (Neon) handles automated backups
2. Document this in `replit.md` under a "Database" section
3. Add a manual data export endpoint for admin use:
   - `GET /api/admin/export-data` — returns all user data as JSON
4. Consider a scheduled job that creates periodic database dumps

#### Fix 9.3 — Add user data export endpoint (GDPR)
1. Create `server/routers/user/data-export.router.ts`
2. Add endpoint `GET /api/user/export-data` (requireAuth):
   ```typescript
   router.get("/", async (req, res) => {
     const userId = req.userId;
     const [user] = await db.select().from(users).where(eq(users.id, userId));
     const [syncData] = await db.select().from(userSyncData).where(eq(userSyncData.userId, userId));
     const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId));

     res.json({
       profile: { email: user.email, displayName: user.displayName, createdAt: user.createdAt },
       inventory: syncData?.inventory,
       recipes: syncData?.recipes,
       mealPlans: syncData?.mealPlans,
       shoppingList: syncData?.shoppingList,
       preferences: syncData?.preferences,
       subscription: sub ? { planType: sub.planType, status: sub.status } : null,
     });
   });
   ```
3. Register in `server/routes.ts` with `requireAuth`
4. Add a "Download My Data" button in the Settings screen

#### Fix 9.4 — Add soft delete for inventory items
1. Since inventory is stored in JSONB sync data, add a `deletedAt` field to items
2. In the client's local storage layer, mark items as deleted instead of removing them
3. Filter out deleted items in the UI
4. The sync manager will propagate the soft delete to the server
5. Add a "Recently Deleted" section in settings for recovery (30-day window)

#### Fix 9.5 — Document conflict resolution
1. Open `client/lib/sync-manager.ts`
2. Document the current conflict resolution strategy (last-write-wins, merge, etc.)
3. Add comments explaining the sync algorithm
4. Update `replit.md` with a "Data Sync" section describing:
   - When sync occurs (on app foreground, after mutations, periodic timer)
   - How conflicts are resolved
   - What happens when offline changes conflict with server changes

---

## 10. Monetization — 8.0 / 10

### What's Working Well
- Two-tier subscription model: Basic ($4.99/mo) and Pro ($9.99/mo)
- Annual pricing with discount: Basic ($49.90/yr) and Pro ($99.90/yr)
- 7-day free trial on Pro tier
- Stripe integration with webhook handlers for subscription lifecycle events
- RevenueCat webhook integration for iOS/Android in-app purchases
- Feature gating via `requireSubscription` middleware and `TIER_CONFIG`
- Clear tier limits: pantry items (25 vs unlimited), AI recipes (5/mo vs unlimited), cookware (5 vs unlimited)
- Pro-only features: recipe scanning, bulk scanning, AI assistant, weekly meal prepping
- Referral system: referrer gets +3 AI recipe credits, referred user gets 14-day trial
- Donation endpoint for additional support
- Customer portal access via Stripe for self-service subscription management
- Subscription status synced to user record

### Issues Found

**Issue 10.1: No grace period handling for failed payments**
- Severity: Medium
- Impact: Users with failed payments may lose access immediately without warning

**Issue 10.2: No upgrade prompt when hitting Basic tier limits**
- Severity: Medium
- Impact: Users hit a wall with no clear path to upgrade — frustrating experience

**Issue 10.3: Trial expiration notification only runs as a server job — no in-app countdown**
- Severity: Low
- Impact: Users may be surprised when their trial ends

**Issue 10.4: No free tier — requires subscription after trial**
- Severity: Low
- Impact: Users who can't pay lose all access, reducing potential user base and referral spread

### Step-by-Step Fixes

#### Fix 10.1 — Add payment failure grace period
1. Open `server/stripe/webhookHandlers.ts`
2. In `handleInvoicePaymentFailed`:
   - Instead of immediately marking subscription as inactive, set a `paymentFailedAt` field
   - Allow 7 days grace period before blocking access
3. Update `server/middleware/requireSubscription.ts`:
   - Check if subscription is in grace period (status = "past_due" AND within 7 days)
   - Allow access during grace period
4. Send a push notification to the user about the failed payment
5. Add an in-app banner: "Your payment failed. Please update your payment method within X days."

#### Fix 10.2 — Add contextual upgrade prompts
1. Open `client/components/UpgradePrompt.tsx` — this component already exists
2. Ensure it's triggered when:
   - User tries to add 26th pantry item (Basic limit is 25)
   - User tries to generate 6th AI recipe in a month
   - User tries to add 6th cookware item
   - User tries to access a Pro-only feature
3. Show: current usage, limit, and a clear CTA button to upgrade
4. Connect the upgrade button to the Stripe checkout or RevenueCat purchase flow

#### Fix 10.3 — Add trial countdown in the app
1. Open `client/components/TrialStatusBadge.tsx` — already exists
2. Ensure it shows: "Trial: X days remaining"
3. Add prominent notifications at:
   - 3 days remaining: Banner at top of main screen
   - 1 day remaining: Modal with "Upgrade now to keep your features"
   - 0 days: `TrialEndedModal` already exists — ensure it's triggered
4. Open `client/hooks/useTrialStatus.ts` and verify the countdown logic

#### Fix 10.4 — Consider a limited free tier (Business Decision)
1. This is a business decision, not a bug — but recommended for growth
2. If implemented, add to `shared/subscription.ts`:
   ```typescript
   [SubscriptionTier.FREE]: {
     maxPantryItems: 10,
     maxAiRecipesPerMonth: 2,
     maxCookwareItems: 3,
     canCustomizeStorageAreas: false,
     canUseRecipeScanning: false,
     canUseBulkScanning: false,
     canUseAiKitchenAssistant: false,
     canUseWeeklyMealPrepping: false,
   },
   ```
3. Update `requireSubscription` to allow free-tier users through
4. Update all feature-gating checks to account for the new tier

---

## Priority Action Items (Top 10)

| Priority | Issue | Category | Impact |
|----------|-------|----------|--------|
| 1 | Protect chat/food/shelf-life endpoints | Security + Core | High — API credit theft |
| 2 | Add helmet security headers | Security | High — Missing basic protections |
| 3 | Add response compression | Performance | Medium — Faster mobile experience |
| 4 | Replace console.log with logger | Code Quality + Performance | Medium — Production readiness |
| 5 | Add user data export (GDPR) | Data Management | High — Regulatory compliance |
| 6 | Standardize error handling with AppError | Error Handling | Medium — Better debugging |
| 7 | Add process-level error handlers | Error Handling | Medium — Prevent silent crashes |
| 8 | Hash session tokens | Security | Medium — Defense in depth |
| 9 | Add missing accessibility labels | Accessibility | Medium — Inclusive design |
| 10 | Break up large components | UI/UX + Code Quality | Medium — Maintainability |

---

## Quick Wins (Can be done in under 30 minutes each)

1. Add `helmet` middleware (Fix 4.1) — 10 minutes
2. Add `compression` middleware (Fix 3.3) — 10 minutes
3. Protect 3 unprotected endpoints (Fix 2.1, 2.2, 2.3) — 5 minutes
4. Add process error handlers (Fix 5.3) — 10 minutes
5. Fix admin middleware types (Fix 4.5) — 5 minutes
6. Add password validation (Fix 4.4) — 15 minutes
7. Standardize API response helpers (Fix 7.5) — 20 minutes
8. Create EmptyState component (Fix 1.3) — 20 minutes

---

## Long-term Improvements (1-2 weeks each)

1. Normalize `user_sync_data` JSONB into relational tables (Fix 9.1)
2. Implement delta sync to reduce bandwidth (Fix 3.5)
3. Add client-side test suite with React Native Testing Library (Fix 7.2)
4. Add offline mutation queue (Fix 8.2)
5. Consider free tier for user growth (Fix 10.4)
