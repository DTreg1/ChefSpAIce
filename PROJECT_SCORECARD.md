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

### Copyable Fix Prompts

#### Fix 1.1 — Break up LandingScreen into smaller components

```
Refactor `client/screens/LandingScreen.tsx` (currently 1,047 lines) by extracting
each major section into its own component under `client/components/landing/`:

1. Create `HeroSection.tsx` — Extract the hero banner, background image,
   headline, subheading, and CTA buttons.
2. Create `FeatureGridSection.tsx` — Extract the feature cards grid.
3. Create `HowItWorksSection.tsx` — Extract the step-by-step walkthrough section.
4. Create `PricingSection.tsx` — Extract the pricing comparison cards.
5. Create `FAQSection.tsx` — Extract the FAQ accordion.
6. Create `FooterSection.tsx` — Extract the footer with links and copyright.

Each section component should accept `theme` and any necessary callbacks as props.
The refactored `LandingScreen.tsx` should import and compose these sections,
staying under 200 lines total. Preserve all existing functionality, animations,
and styling exactly as they are today.
```

#### Fix 1.2 — Standardize loading states

```
Create a reusable `client/components/LoadingState.tsx` component that provides
consistent skeleton/loading UI across all screens.

Requirements:
- Accept a `variant` prop with values: "list", "detail", "card-grid", "full-page"
- Each variant renders an appropriate skeleton pattern (shimmer rectangles)
- Use the existing theme colors for skeleton backgrounds

Then update every screen that uses `useQuery` to use this component:
- `InventoryScreen.tsx` — Use `<LoadingState variant="list" />`
- `RecipesScreen.tsx` — Use `<LoadingState variant="card-grid" />`
- `MealPlanScreen.tsx` — Use `<LoadingState variant="detail" />`
- `ShoppingListScreen.tsx` — Use `<LoadingState variant="list" />`

Replace any raw `ActivityIndicator` or empty renders during `isLoading` states
with the appropriate `<LoadingState>` variant.
```

#### Fix 1.3 — Add empty state designs

```
Create a reusable `client/components/EmptyState.tsx` component for when lists
have no items.

Props:
- `icon`: A Feather icon name (string)
- `title`: Heading text (string)
- `description`: Subtext explaining what to do (string)
- `actionLabel?`: Optional button label (string)
- `onAction?`: Optional button callback (function)

Render: Centered layout with the icon (48px, muted color), title (18px, bold),
description (14px, secondary text color), and optional themed action button.

Then add empty states to these screens:
- `InventoryScreen.tsx` — icon="package", title="Your pantry is empty",
  description="Add your first item to start tracking!", actionLabel="Add Item"
- `RecipesScreen.tsx` — icon="book-open", title="No recipes yet",
  description="Generate your first AI recipe!", actionLabel="Generate Recipe"
- `ShoppingListScreen.tsx` — icon="shopping-cart", title="Your list is clear",
  description="Add items or generate a list from a recipe!"
- `MealPlanScreen.tsx` — icon="calendar", title="No meal plan yet",
  description="Create your first weekly plan!", actionLabel="Create Plan"
```

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

### Copyable Fix Prompts

#### Fix 2.1 — Protect the chat endpoint

```
In `server/routes.ts`, the chat router is mounted WITHOUT auth middleware.

Find this line (around line 219):
  app.use("/api/chat", chatRouter);

Change it to:
  app.use("/api/chat", requireAuth, requireSubscription, chatRouter);

This ensures only authenticated users with active subscriptions can use the
AI chat feature, preventing unauthorized OpenAI API credit consumption.

Verify: Send a request to POST /api/chat without an Authorization header —
it should return 401. Send one with a valid Bearer token and active
subscription — it should work normally.
```

#### Fix 2.2 — Protect food search endpoint

```
In `server/routes.ts`, the food search router is mounted WITHOUT auth middleware.

Find this line (around line 220):
  app.use("/api/food", foodRouter);

Change it to:
  app.use("/api/food", requireAuth, foodRouter);

Note: Only `requireAuth` is needed (not `requireSubscription`) because Basic
tier users should still be able to search for food items.

Verify: Send a GET request to /api/food/search without auth — should return
401. With a valid Bearer token — should work normally.
```

#### Fix 2.3 — Protect shelf-life endpoint

```
In `server/routes.ts`, the shelf-life router is mounted WITHOUT auth middleware.

Find this line (around line 222):
  app.use("/api/suggestions/shelf-life", shelfLifeRouter);

Change it to:
  app.use("/api/suggestions/shelf-life", requireAuth, requireSubscription, shelfLifeRouter);

This endpoint uses AI and should require both authentication and an active
subscription.

Verify: Send a request to /api/suggestions/shelf-life without auth — should
return 401. With auth but no subscription — should return 403.
```

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

### Copyable Fix Prompts

#### Fix 3.1 — Add missing database indexes

```
Add database indexes to improve query performance on frequently accessed columns.

Create a new Drizzle migration or add indexes to the schema definitions in
`shared/schema.ts`:

1. `user_sessions.token` — Queried on every authenticated request by
   `server/middleware/auth.ts`
2. `user_sessions.user_id` — Used for session cleanup and user lookups
3. `subscriptions.user_id` — Queried on every protected request by
   `server/middleware/requireSubscription.ts`
4. `subscriptions.status` — Filtered by ACTIVE_STATUSES in subscription middleware

In Drizzle, add indexes like this to the table definitions:
  import { index } from "drizzle-orm/pg-core";

  // Inside the table definition or as separate index declarations:
  export const userSessionsTokenIdx = index("idx_user_sessions_token")
    .on(userSessions.token);
  export const subscriptionsUserIdIdx = index("idx_subscriptions_user_id")
    .on(subscriptions.userId);

Then run `npx drizzle-kit push` to apply the changes.
Note: `users.email` likely already has an index from its unique constraint.
```

#### Fix 3.2 — Replace console.log with structured logger

```
The project has a structured logger at `server/lib/logger.ts` that supports
levels (debug, info, warn, error) and outputs structured JSON in production.
However, 270+ console.log/error/warn calls bypass it.

For every `.ts` file in the `server/` directory:
1. Add `import { logger } from "../lib/logger";` (adjust relative path as needed)
2. Replace all `console.log(...)` with `logger.info(...)`
3. Replace all `console.error(...)` with `logger.error(...)`
4. Replace all `console.warn(...)` with `logger.warn(...)`

Convert string interpolation to structured context objects:
  BEFORE: console.log(`User ${userId} logged in from ${ip}`);
  AFTER:  logger.info("User logged in", { userId, ip });

Priority files (highest console.log counts):
- server/routers/auth.router.ts (48 instances)
- server/seeds/seed-demo-account.ts (23 instances)
- server/routers/social-auth.router.ts (21 instances)
- server/routers/user/recipes.router.ts (16 instances)
- server/routers/platform/voice.router.ts (14 instances)
- server/stripe/subscriptionRouter.ts (14 instances)
- server/routers/feedback.router.ts (13 instances)

IMPORTANT: Ensure no sensitive data (tokens, passwords, full emails) is passed
into logger context. Redact or omit sensitive fields.
```

#### Fix 3.3 — Add response compression

```
Add gzip/brotli response compression to reduce API response payload sizes.

1. Install the compression package:
   npm install compression
   npm install -D @types/compression

2. In `server/index.ts`, add this import at the top:
   import compression from "compression";

3. Add the middleware BEFORE body parsing and route setup, after CORS:
   app.use(compression());

This automatically compresses all JSON responses, typically reducing payload
sizes by 60-80%. It's especially impactful for mobile users on slower networks.

Verify: After adding, check response headers for `Content-Encoding: gzip`
on API responses.
```

#### Fix 3.4 — Configure database connection pooling

```
Review and configure the PostgreSQL connection pool in `server/db.ts`.

Check if the pool configuration includes these settings:
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,                    // Maximum number of connections
    idleTimeoutMillis: 30000,   // Close idle connections after 30s
    connectionTimeoutMillis: 5000, // Fail if can't connect in 5s
  });

If using Drizzle with `drizzle-orm/neon-http`, the connection pooling is
handled by Neon's serverless driver. In that case, document this in
`replit.md` so the team knows pooling is managed externally.

If using `drizzle-orm/node-postgres`, ensure the Pool options above are set.
```

#### Fix 3.5 — Implement delta sync

```
Reduce sync payload sizes by implementing delta sync in the sync endpoint.

In `server/routers/sync.router.ts`:
1. Accept an optional `lastSyncedAt` timestamp from the client in the request
   body or query params.
2. When `lastSyncedAt` is provided, only return data sections whose
   `updatedAt` timestamp is newer than `lastSyncedAt`.
3. Return a `serverTimestamp` in the response for the client to use as the
   next `lastSyncedAt`.

In `client/lib/sync-manager.ts`:
1. Store the last successful sync timestamp in AsyncStorage.
2. Include it in sync requests as `lastSyncedAt`.
3. Handle partial responses — merge returned sections into local state
   without overwriting sections that weren't included in the response.
4. On first sync (no stored timestamp), perform a full sync as today.

This reduces typical sync payloads from hundreds of KB to just the changed
data, which may be only a few KB.
```

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

### Copyable Fix Prompts

#### Fix 4.1 — Add helmet middleware

```
Add the `helmet` middleware to set security-related HTTP response headers.

1. Install helmet:
   npm install helmet

2. In `server/index.ts`, add this import:
   import helmet from "helmet";

3. Add the middleware AFTER CORS setup but BEFORE body parsing and route setup:
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

This adds X-Frame-Options, X-Content-Type-Options, Strict-Transport-Security,
X-XSS-Protection, and Content-Security-Policy headers to all responses.

Verify: After adding, inspect response headers on any API response — you
should see these security headers present.
```

#### Fix 4.2 — Protect unprotected endpoints
See Fix 2.1, Fix 2.2, and Fix 2.3 above.

#### Fix 4.3 — Hash session tokens before storage

```
Session tokens are stored as plain text in the `user_sessions` table. If the
database is ever compromised, attackers could use these tokens directly.

Fix by hashing tokens with SHA-256 before storing:

1. In `server/routers/auth.router.ts`, wherever a session token is created:
   import crypto from "crypto";

   const rawToken = crypto.randomBytes(32).toString("hex");
   const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

   // Store `hashedToken` in the database:
   await db.insert(userSessions).values({
     userId: user.id,
     token: hashedToken,  // Store the HASH, not the raw token
     expiresAt,
     createdAt: new Date(),
   });

   // Return `rawToken` to the client (they never see the hash)

2. In `server/middleware/auth.ts`, hash the incoming token before lookup:
   import crypto from "crypto";

   const rawToken = authHeader.substring(7);
   const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

   const [session] = await db
     .select()
     .from(userSessions)
     .where(eq(userSessions.token, hashedToken))
     .limit(1);

3. Apply the same pattern in `server/middleware/requireAdmin.ts` (line 18).

4. After deploying, all existing sessions will be invalidated (users must
   re-login) because the stored plain tokens won't match the new hashed
   lookups. This is acceptable for a security improvement.
```

#### Fix 4.4 — Add password validation

```
Add server-side password complexity validation to the registration endpoint
in `server/routers/auth.router.ts`.

Find the registration handler and add this validation function:

function validatePassword(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters";
  if (!/[A-Z]/.test(password)) return "Password must contain an uppercase letter";
  if (!/[a-z]/.test(password)) return "Password must contain a lowercase letter";
  if (!/[0-9]/.test(password)) return "Password must contain a number";
  return null;
}

Call it before hashing:
  const passwordError = validatePassword(password);
  if (passwordError) {
    return res.status(400).json({ error: passwordError });
  }

Also update the client-side registration form (`client/screens/AuthScreen.tsx`)
to show these requirements as helper text below the password field, and
validate locally before submitting.
```

#### Fix 4.5 — Fix admin middleware types

```
In `server/middleware/requireAdmin.ts`, fix the type-unsafe assertions on
lines 44-45.

Replace:
  (req as any).userId = user.id;
  (req as any).user = user;

With:
  req.userId = user.id;

The `req.userId` property is already declared globally in
`server/middleware/auth.ts` via the Express namespace extension.

If you also need `req.user`, add it to the global declaration in
`server/middleware/auth.ts`:

  declare global {
    namespace Express {
      interface Request {
        userId?: string;
        user?: typeof users.$inferSelect;
      }
    }
  }

Then use `req.user = user;` without the `as any` cast.
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

### Copyable Fix Prompts

#### Fix 5.1 — Standardize error handling with AppError

```
Many route handlers in the `server/routers/` directory use ad-hoc try/catch
with custom error responses instead of the project's `AppError` class from
`server/middleware/errorHandler.ts`.

For every router file in `server/routers/`:
1. Import AppError: `import { AppError } from "../middleware/errorHandler";`
2. Replace ad-hoc error responses with AppError factory methods:

   BEFORE:
   if (!user) {
     return res.status(404).json({ error: "User not found" });
   }
   AFTER:
   if (!user) {
     throw AppError.notFound("User not found", "USER_NOT_FOUND");
   }

   BEFORE:
   catch (error) {
     console.error("Something failed:", error);
     return res.status(500).json({ error: "Something went wrong" });
   }
   AFTER:
   catch (error) {
     next(error);
   }

3. Ensure every Express route handler has `next` as the third parameter so
   errors can be forwarded to the global error handler.

Priority files to update:
- server/routers/auth.router.ts
- server/routers/food.router.ts
- server/routers/shelf-life.router.ts
- server/routers/feedback.router.ts
- server/routers/chat.router.ts
```

#### Fix 5.2 — Ensure catch blocks propagate errors

```
Audit every `catch` block in the `server/` directory. Some catch blocks only
log the error and return a generic 500, swallowing the error details.

For each catch block:
- If the error is expected/recoverable, throw an `AppError` with the
  appropriate status code and error code.
- If the error is unexpected, call `next(error)` to let the global error
  handler process it (it will log the error, attach the request ID, and
  return a structured response).

NEVER do this:
  catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Something went wrong" });
  }

ALWAYS do this:
  catch (error) {
    next(error);
  }

The global error handler in `server/middleware/errorHandler.ts` already
handles logging, request ID attachment, stack trace suppression in
production, and structured JSON responses.
```

#### Fix 5.3 — Add process-level error handlers

```
Add unhandled rejection and uncaught exception handlers to prevent the
Node.js process from silently crashing.

In `server/index.ts`, add these handlers at the bottom of the file (after
all app setup and the server listen call):

import { logger } from "./lib/logger";

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

The unhandled rejection handler logs but keeps running (these are usually
recoverable). The uncaught exception handler logs and exits (these are
usually not recoverable — the process manager will restart the server).
```

#### Fix 5.4 — Fix webhook error handling

```
In `server/stripe/webhookHandlers.ts`, the `processSubscriptionEvent`
function (line 35) catches errors and logs them but does NOT rethrow.
This means Stripe thinks the webhook succeeded and won't retry.

Find the catch block in `processSubscriptionEvent` (around line 61-63):

  BEFORE:
  catch (error) {
    logger.error("Error processing webhook event", {
      eventType: event.type,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  AFTER:
  catch (error) {
    logger.error("Error processing webhook event", {
      eventType: event.type,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }

By rethrowing, the error bubbles up to the webhook route handler, which
returns a 500 to Stripe. Stripe then retries the webhook (up to 3 times
over 72 hours), giving the system another chance to process the event.
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

### Copyable Fix Prompts

#### Fix 6.1 — Add missing accessibility labels

```
Audit every `Pressable`, `TouchableOpacity`, and icon-only `Button` in the
`client/` directory. Any interactive element without an `accessibilityLabel`
needs one.

Icon-only buttons are the highest priority since they have no visible text
for screen readers to read.

For each one, add a descriptive `accessibilityLabel`:
  <Pressable
    accessibilityLabel="Delete item"
    accessibilityRole="button"
    onPress={handleDelete}
  >
    <Feather name="trash-2" size={20} />
  </Pressable>

Priority files to audit:
- client/screens/InventoryScreen.tsx — item action buttons (edit, delete, info)
- client/screens/RecipeDetailScreen.tsx — step navigation, favorite, share
- client/components/AddMenu.tsx — quick action buttons (scan, manual add, voice)
- client/components/HeaderMenu.tsx — menu items (settings, profile, notifications)
- client/components/ChatModal.tsx — send, close, microphone buttons
- client/components/RecipeVoiceControls.tsx — voice control buttons

Every interactive element should have:
  accessibilityRole="button" (or appropriate role)
  accessibilityLabel="descriptive action text"
  accessibilityHint="what happens when activated" (optional but helpful)
```

#### Fix 6.2 — Add live regions for dynamic updates

```
Add `accessibilityLiveRegion` to elements that display dynamic content so
screen readers announce changes to users.

1. In inventory/recipe screens, wrap the item count display:
   <View accessibilityLiveRegion="polite">
     <ThemedText>{itemCount} items in pantry</ThemedText>
   </View>

2. When an item is added/removed successfully, wrap the success message:
   <View accessibilityLiveRegion="polite">
     <ThemedText>Item added to pantry</ThemedText>
   </View>

3. When recipe generation completes, announce it:
   <View accessibilityLiveRegion="assertive">
     <ThemedText>Recipe generated successfully</ThemedText>
   </View>

4. Wrap all error messages with assertive live region:
   <View accessibilityLiveRegion="assertive">
     <ThemedText>{errorMessage}</ThemedText>
   </View>

Use "polite" for non-urgent updates (counts, success messages).
Use "assertive" for urgent updates (errors, completed generation).
```

#### Fix 6.3 — Verify color contrast ratios

```
The glass-effect components (`GlassButton`, `GlassCard`, `GlassView`) use
translucent backgrounds which may not provide sufficient contrast with text.

In `client/components/GlassCard.tsx` and `client/components/GlassButton.tsx`:

1. Ensure text has a semi-opaque backing layer that guarantees 4.5:1 contrast
   ratio for body text and 3:1 for large text (WCAG AA).

2. For dark mode glass components, add a dark overlay behind text:
   backgroundColor: "rgba(0, 0, 0, 0.6)"

3. For light mode glass components, add a light overlay behind text:
   backgroundColor: "rgba(255, 255, 255, 0.7)"

4. Review all places where text is rendered over images or gradients and
   ensure the text remains readable.

Test by taking screenshots and running them through a contrast checker tool
(e.g., WebAIM Contrast Checker or the Accessibility Inspector in Xcode).
```

#### Fix 6.4 — Add keyboard navigation for web

```
For the web version of the app, ensure all interactive elements are keyboard
accessible.

In screens that render on web (especially `LandingScreen.tsx` and any web
routes):

1. Ensure all interactive elements have `tabIndex={0}` when rendered on web:
   import { Platform } from "react-native";

   <Pressable
     {...(Platform.OS === "web" ? { tabIndex: 0 } : {})}
     accessibilityRole="button"
     onPress={handlePress}
   >

2. Add `onKeyPress` handlers for keyboard activation:
   onKeyPress={(e) => {
     if (e.nativeEvent.key === "Enter" || e.nativeEvent.key === " ") {
       handlePress();
     }
   }}

3. Add visible focus styles for keyboard users:
   Use a focus ring style (e.g., outline: "2px solid #4A90D9") that only
   appears on keyboard focus, not mouse click.

Priority screens: LandingScreen.tsx, AuthScreen.tsx, SubscriptionScreen.tsx
```

#### Fix 6.5 — Add list roles

```
Add proper list semantics to FlatList and ScrollView-based lists so screen
readers can communicate list structure.

In screens that display lists of items:

1. Wrap the FlatList in a View with the list role:
   <View accessibilityRole="list">
     <FlatList
       data={items}
       renderItem={({ item }) => (
         <View
           accessibilityRole="listitem"
           accessibilityLabel={`${item.name}, expires ${item.expiryDate}`}
         >
           {/* existing item content */}
         </View>
       )}
     />
   </View>

Apply this pattern to:
- client/screens/InventoryScreen.tsx — pantry items list
- client/screens/RecipesScreen.tsx — recipe cards list
- client/screens/ShoppingListScreen.tsx — shopping items list
- client/screens/MealPlanScreen.tsx — meal plan entries

This tells screen readers "this is a list with N items" and allows users
to navigate between items using list navigation shortcuts.
```

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

### Copyable Fix Prompts

#### Fix 7.1 — Migrate all console.log to structured logger
See Fix 3.2 above.

#### Fix 7.2 — Add client-side tests

```
The project has 10 server-side test files but zero client-side tests.
Add React Native Testing Library tests for critical client components and hooks.

1. Install testing dependencies:
   npm install -D @testing-library/react-native @testing-library/jest-native

2. Create `client/__tests__/` directory if it doesn't exist.

3. Add tests for key hooks:
   - `client/__tests__/useTrialStatus.test.ts` — Test trial countdown logic,
     expired state, active state
   - `client/__tests__/useSubscription.test.ts` — Test tier detection,
     feature gating, limit checking

4. Add tests for shared utility components:
   - `client/__tests__/EmptyState.test.tsx` — Renders icon, title, description,
     optional action button
   - `client/__tests__/GlassButton.test.tsx` — Renders label, handles press,
     respects disabled state
   - `client/__tests__/ExpiryBadge.test.tsx` — Shows correct color/text for
     expired, expiring soon, and fresh items

5. Configure the test runner in `vitest.config.ts` or add a separate
   `jest.config.js` for the client directory with react-native preset.

Start with hooks and utility components — they're easiest to unit test and
provide the most value for the effort.
```

#### Fix 7.3 — Break up large screen files
See Fix 1.1 above for LandingScreen. Apply the same pattern to other large screens:

```
Identify all screen files over 500 lines in `client/screens/` and refactor
each one by extracting sections into smaller components.

For each large screen:
1. Identify distinct visual sections (header, filters, list, detail panel, etc.)
2. Extract each section into its own component file under `client/components/`
3. Pass required data and callbacks as props
4. Keep the screen file as a thin composition layer, under 400 lines

Common extraction patterns:
- Header/toolbar sections → `<ScreenNameHeader />`
- Filter/search bars → `<ScreenNameFilters />`
- List/grid content → `<ScreenNameList />`
- Detail/modal panels → `<ScreenNameDetail />`
- Action bar/bottom sections → `<ScreenNameActions />`

Files to check:
- client/screens/LandingScreen.tsx (1,047 lines) — see Fix 1.1
- client/screens/InventoryScreen.tsx
- client/screens/RecipeDetailScreen.tsx
- client/screens/SettingsScreen.tsx
- client/screens/MealPlanScreen.tsx
```

#### Fix 7.4 — Fix admin middleware types
See Fix 4.5 above.

#### Fix 7.5 — Standardize API response format

```
Create a consistent API response helper module and use it across all routes.

1. Create `server/lib/apiResponse.ts`:

   export function successResponse(data: unknown, message?: string) {
     return { success: true as const, data, ...(message ? { message } : {}) };
   }

   export function errorResponse(message: string, errorCode: string, details?: unknown) {
     return { success: false as const, error: message, errorCode, ...(details ? { details } : {}) };
   }

2. In route handlers, use these helpers instead of ad-hoc JSON:

   BEFORE:
   res.json({ items: results });
   AFTER:
   res.json(successResponse(results));

   BEFORE:
   res.status(400).json({ error: "Invalid input" });
   AFTER:
   res.status(400).json(errorResponse("Invalid input", "INVALID_INPUT"));

3. Update the client's `apiRequest` function in `client/lib/query-client.ts`
   to expect this consistent format and handle the `success` boolean.

This ensures every API response has a `success` field, making it trivial for
the client to check if a request succeeded or failed.
```

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

### Copyable Fix Prompts

#### Fix 8.1 — Improve offline mode indication

```
Improve the offline mode user experience by ensuring the `OfflineIndicator`
component is visible and helpful across all screens.

1. Open `client/components/OfflineIndicator.tsx`.
2. Ensure it renders as a fixed banner at the top of the screen (below the
   safe area inset), with:
   - A warning icon and "You're offline" text
   - A subtle animation for appearing/disappearing (use LayoutAnimation or
     Animated API)
   - A "Dismiss" button that hides it temporarily (re-appears if still offline
     after 60 seconds)

3. Include the OfflineIndicator in the app's root layout so it appears on
   ALL screens, not just some. Add it to the main layout wrapper in
   `client/App.tsx` or the navigation container.

4. When offline, disable or visually mute action buttons that require network
   (e.g., "Generate Recipe", "Sync Now") and show a tooltip: "Available when
   online".
```

#### Fix 8.2 — Add offline mutation queue

```
Implement an offline mutation queue so actions taken while offline are
automatically retried when connectivity is restored.

1. Create `client/lib/offline-queue.ts`:
   - Define a MutationQueueItem type: { id, endpoint, method, body, createdAt }
   - Implement `enqueue(item)` — saves to AsyncStorage under "mutation_queue"
   - Implement `dequeue()` — removes and returns the oldest item
   - Implement `getAll()` — returns all queued items
   - Implement `clear()` — removes all items

2. In `client/lib/query-client.ts`, update `apiRequest`:
   - When a fetch fails due to network error (TypeError: Network request failed),
     instead of throwing, call `enqueue()` with the request details
   - Show a toast: "Saved offline. Will sync when connected."

3. In `client/lib/sync-manager.ts` or a new `client/lib/offline-processor.ts`:
   - When the app detects connectivity restored (NetInfo event), process
     the queue by replaying each mutation in order
   - Remove successfully processed items from the queue
   - Retry failed items up to 3 times, then notify the user

4. Show a badge in the sync indicator showing the count of pending mutations:
   "3 changes pending sync"
```

#### Fix 8.3 — Style Metro error page

```
In `server/index.ts`, the Metro proxy error handler (around line 211-212)
serves raw HTML when Metro bundler isn't available.

Find:
  res.writeHead(502, { "Content-Type": "text/html" });
  res.end("<h1>Metro bundler not available</h1><p>Please wait for Metro to start or refresh the page.</p>");

Replace with a styled page:
  res.writeHead(502, { "Content-Type": "text/html" });
  res.end(`
    <html>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                  display: flex; align-items: center; justify-content: center;
                  height: 100vh; margin: 0; background: #f8f9fa; color: #333;">
      <div style="text-align: center; padding: 40px; max-width: 400px;">
        <div style="font-size: 48px; margin-bottom: 16px;">⏳</div>
        <h1 style="font-size: 24px; margin-bottom: 8px;">Starting up...</h1>
        <p style="font-size: 16px; color: #666; line-height: 1.5;">
          The development server is loading. Please refresh in a moment.
        </p>
        <button onclick="location.reload()"
                style="margin-top: 20px; padding: 10px 24px; font-size: 14px;
                       border: 1px solid #ddd; border-radius: 6px; background: white;
                       cursor: pointer;">
          Refresh
        </button>
      </div>
    </body>
    </html>
  `);
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

### Copyable Fix Prompts

#### Fix 9.1 — Plan for normalized sync data (Long-term)

```
This is a significant architectural change. The current `user_sync_data` table
stores inventory, recipes, meal plans, and shopping lists as JSONB blobs.
This prevents server-side querying and referential integrity.

Plan (implement over 1-2 weeks):

1. Create normalized tables in `shared/schema.ts`:
   - `user_inventory_items`: id, userId, name, quantity, unit, category,
     expiryDate, storageArea, addedAt, updatedAt
   - `user_saved_recipes`: id, userId, title, ingredients (jsonb), steps (jsonb),
     cuisine, servings, savedAt
   - `user_meal_plans`: id, userId, weekStartDate, meals (jsonb), createdAt
   - `user_shopping_items`: id, userId, name, quantity, checked, recipeId?, addedAt

2. Add proper foreign keys: all reference `users.id` with cascade delete.

3. Create a data migration script that reads existing JSONB data from
   `user_sync_data` and inserts into the normalized tables.

4. Update sync endpoints (`server/routers/sync.router.ts`) to read/write
   from normalized tables instead of JSONB.

5. Keep the JSONB table temporarily as a backup during migration, then
   remove it after verifying all data migrated correctly.

6. Update indexes for common query patterns (e.g., items by userId + category).
```

#### Fix 9.2 — Document backup strategy

```
Document the database backup strategy and add an admin export endpoint.

1. In `replit.md`, add a "Database & Backups" section:
   - Note that Replit's built-in PostgreSQL (Neon-backed) handles automated
     point-in-time recovery
   - Document the rollback/checkpoint system available in Replit
   - Note that the database can be rolled back alongside code checkpoints

2. Create `server/routers/admin/data-export.router.ts`:
   - Add endpoint `GET /api/admin/export-all-data` (protected by requireAdmin)
   - Export all tables as a JSON object: users (redacted passwords), subscriptions,
     sync data, feedback, referrals
   - Stream large datasets to avoid memory issues:
     res.setHeader("Content-Type", "application/json");
     res.setHeader("Content-Disposition", "attachment; filename=export.json");

3. Register the router in `server/routes.ts` under admin routes with
   `requireAdmin` middleware.
```

#### Fix 9.3 — Add user data export endpoint (GDPR)

```
Add a GDPR-compliant data export endpoint so users can download all their data.

1. Create `server/routers/user/data-export.router.ts`:

   import { Router } from "express";
   import { db } from "../../db";
   import { users, userSyncData, subscriptions } from "@shared/schema";
   import { eq } from "drizzle-orm";

   const router = Router();

   router.get("/", async (req, res) => {
     const userId = req.userId!;

     const [user] = await db.select().from(users).where(eq(users.id, userId));
     const [syncData] = await db.select().from(userSyncData).where(eq(userSyncData.userId, userId));
     const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId));

     const exportData = {
       exportDate: new Date().toISOString(),
       profile: {
         email: user.email,
         displayName: user.displayName,
         createdAt: user.createdAt,
       },
       inventory: syncData?.inventory || [],
       recipes: syncData?.recipes || [],
       mealPlans: syncData?.mealPlans || [],
       shoppingList: syncData?.shoppingList || [],
       preferences: syncData?.preferences || {},
       subscription: sub ? { planType: sub.planType, status: sub.status, currentPeriodEnd: sub.currentPeriodEnd } : null,
     };

     res.setHeader("Content-Disposition", `attachment; filename="chefspaice-data-${userId}.json"`);
     res.json(exportData);
   });

   export default router;

2. Register in `server/routes.ts`:
   import dataExportRouter from "./routers/user/data-export.router";
   app.use("/api/user/export-data", requireAuth, dataExportRouter);

3. Add a "Download My Data" button in `client/screens/SettingsScreen.tsx`
   or `client/screens/ProfileScreen.tsx` that calls GET /api/user/export-data
   and saves/shares the resulting JSON file.
```

#### Fix 9.4 — Add soft delete for inventory items

```
Add soft delete support so users can recover accidentally deleted items.

Since inventory is stored in the client's AsyncStorage (local-first), implement
soft delete at the data model level:

1. In the client's inventory item type, add an optional `deletedAt` field:
   deletedAt?: string | null;  // ISO timestamp when soft-deleted

2. When deleting an item, set `deletedAt = new Date().toISOString()` instead
   of removing it from the array.

3. Update all list renders to filter out items with `deletedAt`:
   const visibleItems = items.filter(item => !item.deletedAt);

4. Add a "Recently Deleted" section in Settings or Profile screen:
   - Show items deleted in the last 30 days
   - "Restore" button sets `deletedAt = null`
   - Items older than 30 days are permanently purged by a cleanup function

5. The sync manager will propagate soft deletes to the server.

6. Add a periodic cleanup in the sync manager or app startup:
   const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
   items = items.filter(item =>
     !item.deletedAt || new Date(item.deletedAt).getTime() > thirtyDaysAgo
   );
```

#### Fix 9.5 — Document conflict resolution

```
Document the sync conflict resolution strategy so the team understands
edge cases and can maintain the sync system.

1. Open `client/lib/sync-manager.ts` and add a JSDoc comment at the top
   explaining:
   - When sync occurs (on app foreground, after mutations, periodic timer)
   - The conflict resolution strategy (last-write-wins based on updatedAt,
     or merge strategy if applicable)
   - What happens when offline changes conflict with server changes
   - How deletions are handled during sync

2. In `replit.md`, add a "Data Sync Architecture" section:

   ## Data Sync Architecture
   - **Strategy**: Local-first with cloud backup
   - **Sync trigger**: On app foreground, after local mutations, every N minutes
   - **Conflict resolution**: Last-write-wins based on `updatedAt` timestamps
   - **Offline behavior**: Changes stored locally, synced on reconnect
   - **Data format**: Per-section JSONB (inventory, recipes, mealPlans,
     shoppingList, preferences, cookware)
   - **Known edge case**: If user edits the same item on two devices offline,
     the device that syncs last wins

3. Add inline comments in the sync router and sync manager explaining
   the merge/overwrite logic at each decision point.
```

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

### Copyable Fix Prompts

#### Fix 10.1 — Add payment failure grace period

```
Add a 7-day grace period for failed payments so users don't lose access
immediately.

1. In `server/stripe/webhookHandlers.ts`, find `handleInvoicePaymentFailed`.
   Instead of immediately marking the subscription as inactive, set the
   subscription status to "past_due" (Stripe already sends this status).

2. In `server/middleware/requireSubscription.ts`, update ACTIVE_STATUSES:
   const ACTIVE_STATUSES = ["active", "trialing", "past_due"];

   Then add a grace period check:
   if (subscription.status === "past_due") {
     const paymentFailedAt = subscription.updatedAt || new Date();
     const gracePeriodEnd = new Date(paymentFailedAt);
     gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 7);

     if (new Date() > gracePeriodEnd) {
       return res.status(403).json({
         error: "payment_required",
         message: "Your payment failed. Please update your payment method.",
       });
     }
   }

3. On the client side, detect "past_due" status and show a banner:
   "Your payment failed. Please update your payment method within X days
   to keep your subscription active." with a link to the Stripe customer
   portal.

4. Send a push notification when payment first fails, and again at 3 days
   and 1 day before grace period ends.
```

#### Fix 10.2 — Add contextual upgrade prompts

```
Show upgrade prompts when Basic tier users hit their limits, using the
existing `client/components/UpgradePrompt.tsx` component.

1. Open `client/components/UpgradePrompt.tsx` and ensure it accepts these props:
   - currentUsage: number
   - limit: number
   - featureName: string
   - onUpgrade: () => void

2. In inventory management (client/screens/InventoryScreen.tsx or the
   add item flow):
   - Before adding an item, check: if items.length >= 25 (BASIC limit)
   - Show: "You've reached your 25-item pantry limit. Upgrade to Pro for
     unlimited items." with an "Upgrade" button.

3. In recipe generation:
   - Track monthly AI recipe count
   - Before generating, check: if monthlyCount >= 5 (BASIC limit)
   - Show: "You've used all 5 AI recipes this month. Upgrade to Pro for
     unlimited recipes."

4. In cookware management:
   - Before adding, check: if cookwareCount >= 5 (BASIC limit)
   - Show: "You've reached your 5-cookware limit. Upgrade to Pro for
     unlimited cookware."

5. For Pro-only features (recipe scanning, bulk scanning, AI assistant,
   meal prepping):
   - When a Basic user taps a Pro feature, show: "This feature is available
     on Pro. Upgrade to unlock [feature name]."

6. Connect the "Upgrade" button to the subscription screen or Stripe
   checkout flow.
```

#### Fix 10.3 — Add trial countdown in the app

```
Add a visible trial countdown so users know exactly when their trial ends.

1. Open `client/components/TrialStatusBadge.tsx` — verify it shows the
   remaining days. If not, update it:
   - Calculate: daysLeft = Math.ceil((trialEndDate - now) / (1000 * 60 * 60 * 24))
   - Display: "Trial: {daysLeft} days left"
   - Color: green (7-4 days), yellow (3-2 days), red (1-0 days)

2. Ensure the badge is visible on the main screen's header or navigation.

3. Add milestone notifications at key points:
   - At 3 days remaining: Show a non-dismissible banner at the top of the
     main screen: "Your Pro trial ends in 3 days. Subscribe now to keep
     your features."
   - At 1 day remaining: Show a modal (use the existing TrialEndedModal
     pattern): "Your trial ends tomorrow! Don't lose access to [list Pro
     features]." with "Subscribe Now" and "Maybe Later" buttons.
   - At 0 days (expired): The existing TrialEndedModal should trigger —
     verify it's connected to the trial status hook.

4. In `client/hooks/useTrialStatus.ts`, ensure the countdown recalculates
   on app foreground (not just on mount) by listening to AppState changes.
```

#### Fix 10.4 — Consider a limited free tier (Business Decision)

```
NOTE: This is a business decision, not a bug. Implementing a free tier can
increase user acquisition and referral spread.

If approved, here's how to implement:

1. In `shared/subscription.ts`, add a FREE tier:
   export enum SubscriptionTier {
     FREE = "FREE",
     BASIC = "BASIC",
     PRO = "PRO",
   }

   Add to TIER_CONFIG:
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

2. In `server/middleware/requireSubscription.ts`, allow FREE tier users
   through (they don't need a Stripe subscription record):
   - If no subscription record exists, treat user as FREE tier
   - Attach the tier to the request so routes can check limits

3. Update `shared/schema.ts` to add "FREE" as a valid subscriptionTier value.

4. Update the pricing page and subscription screen to show 3 tiers:
   Free ($0), Basic ($4.99/mo), Pro ($9.99/mo).

5. Update all feature-gating checks to account for the new tier's limits.
```

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
