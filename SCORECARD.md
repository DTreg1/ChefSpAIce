# ChefSpAIce Project Scorecard

> Generated: February 10, 2026
> Codebase: ~82K lines client, ~11.6K lines server, 1.2K lines shared schema
> Stack: React Native + Expo (mobile), Express.js (backend), PostgreSQL, Stripe, OpenAI, Instacart

---

## Scoring Summary

| Category | Score | Grade |
|---|---|---|
| UI/UX Design | 8.0/10 | B+ |
| Core Features | 8.5/10 | A- |
| Performance | 6.5/10 | C+ |
| Security | 8.5/10 | A- |
| Error Handling | 8.0/10 | B+ |
| Accessibility | 5.5/10 | D+ |
| Code Quality | 7.5/10 | B |
| Mobile | 8.0/10 | B+ |
| Data Management | 7.5/10 | B |
| Monetization | 9.0/10 | A |
| **Overall** | **7.7/10** | **B+** |

---

## 1. UI/UX Design — 8.0/10 (B+)

### Strengths
- iOS Liquid Glass Design aesthetic applied consistently across 32+ screens
- GlassCard, GlassButton, and AnimatedBackground provide cohesive visual language
- Comprehensive onboarding flow with step tracking
- Landing page with HeroSection, PricingSection, FAQ, FeatureGrid, etc.
- Dark/light theme support via ThemeContext
- Custom tab bar and drawer navigation with glass styling

### Issues Found

| Priority | Issue | Impact |
|---|---|---|
| P1 | No lazy loading for screens — all 32+ screens loaded upfront | Slow initial load |
| P2 | Landing page uses custom router instead of proper routing library | No deep-linkable pages, poor SEO |
| P2 | Web pages rendered with `display: none` caching strategy may cause stale state | UX inconsistency |
| P3 | No skeleton states documented for all data-heavy screens | Perceived slowness |

### Remediation Steps

**Step 1 — Add lazy loading for mobile screens**
```
Add React.lazy() and Suspense boundaries around screen imports in the navigation files (client/navigation/). Wrap each screen import with lazy(() => import('../screens/ScreenName')) and add a CookPotLoader fallback. This will significantly reduce initial bundle size and startup time.
```

**Step 2 — Improve web landing page routing**
```
Replace the custom window.history.pushState navigation in client/App.web.tsx with a proper lightweight router (or Expo Router for web). The current implementation loses browser back/forward state and doesn't support SEO-friendly meta tags per page.
```

---

## 2. Core Features — 8.5/10 (A-)

### Strengths
- AI recipe generation with inventory awareness, expiring items priority, equipment matching
- Full inventory management with categories, expiry tracking, nutrition lookup
- Meal planning with day selectors, week navigation, slot management
- Shopping list with Instacart Connect integration (UPCs, brand filters, delivery)
- Cloud sync across devices (local-first with server sync)
- Receipt scanning, food camera, barcode scanner, ingredient scanner
- Voice commands for hands-free kitchen use
- Cooking terms educational reference
- Referral system with bonus credits
- Notification system (expiring food, recipe suggestions, meal reminders)
- Data export capabilities

### Issues Found

| Priority | Issue | Impact |
|---|---|---|
| P1 | No offline queue retry mechanism visible for failed syncs | Data loss risk |
| P2 | Chat router (282 lines) is relatively thin for an AI assistant — limited function-calling tools | Missed AI potential |
| P3 | No recipe sharing/social features (share to friends, public recipes) | Growth limitation |
| P3 | No recipe image generation (only text-based recipes from AI) | Visual appeal gap |

### Remediation Steps

**Step 3 — Add offline sync retry with exponential backoff**
```
Review client/lib/offline-queue.ts and client/lib/sync-manager.ts. Add a retry mechanism with exponential backoff (1s, 2s, 4s, 8s, max 60s) for failed sync operations. Display a persistent banner when items are pending sync so users know their data will be saved when connectivity returns.
```

**Step 4 — Expand AI chat function calling capabilities**
```
In server/routers/chat.router.ts, add function-calling tools for: checking inventory levels, adding items to shopping list, creating meal plans, and looking up nutrition data. This turns the chat from a simple Q&A into an actionable kitchen assistant that can modify app state.
```

---

## 3. Performance — 6.5/10 (C+)

### Strengths
- Database connection pooling configured (max: 20 connections)
- Rate limiting on AI and auth endpoints
- Price caching with TTL for Stripe queries
- AI limit caching with 30-second TTL
- Compression middleware enabled
- Request logging with duration tracking

### Issues Found

| Priority | Issue | Impact |
|---|---|---|
| P1 | No React.lazy/code splitting anywhere in the client (82K lines loaded upfront) | Slow startup |
| P1 | No database query result caching beyond AI limits | Redundant DB queries |
| P2 | Subscription check middleware queries DB on every protected request | Latency per request |
| P2 | Auth middleware does a full DB lookup on every request (no session caching) | ~50ms+ per request |
| P2 | Sync data stored as JSONB blobs alongside normalized tables — dual storage overhead | DB bloat |
| P3 | No image optimization pipeline for recipe/food images | Bandwidth waste |
| P3 | Background jobs (trial expiration, session cleanup) use setInterval instead of a job queue | Unreliable in multi-instance |

### Remediation Steps

**Step 5 — Add session caching to auth middleware**
```
In server/middleware/auth.ts, add an in-memory LRU cache (using the existing CacheService from server/lib/cache.ts) for validated sessions. Cache session lookups for 60 seconds keyed by token hash. This eliminates a DB query on every single authenticated request. Invalidate cache entries on logout.
```

**Step 6 — Add subscription check caching**
```
In server/middleware/requireSubscription.ts, cache the subscription status lookup per userId for 5 minutes using CacheService. Invalidate the cache when subscription status changes (in webhook handlers and subscription router). This removes the DB join query from every protected API call.
```

**Step 7 — Implement React.lazy code splitting for mobile screens**
```
In client/navigation/ files (DrawerNavigator, TabNavigator, StackNavigator), wrap all screen imports with React.lazy(). Create a shared SuspenseFallback component using CookPotLoader. This can reduce initial bundle by 50%+ since most screens are visited infrequently.
```

**Step 8 — Deprecate legacy JSONB sync in favor of normalized tables**
```
The userSyncData table stores data as JSONB blobs while normalized tables (userInventoryItems, userSavedRecipes, etc.) exist in parallel. Create a migration plan to fully transition to normalized tables and eventually drop the JSONB columns. Start by auditing which sync endpoints still write to both.
```

---

## 4. Security — 8.5/10 (A-)

### Strengths
- Helmet.js configured for secure HTTP headers
- CSRF protection with double-submit cookie pattern (csrf-csrf library)
- Bearer token auth immune to CSRF by design (documented in code)
- Password hashing with bcrypt (12 rounds)
- Session tokens hashed before DB storage
- Rate limiting on auth (10/15min), AI (30/min), general (100/min)
- Password reset tokens stored in DB with expiry and cascade delete
- User-agent mismatch detection with security notifications
- Platform guards blocking native iOS/Android from Stripe web endpoints
- Input validation with Zod schemas throughout
- 1MB request body limit protection
- File upload size limit (10MB)
- CORS whitelist with dynamic origin checking
- Admin middleware with separate auth flow
- Privacy consent tracking with timestamps
- Session cleanup and trial expiration background jobs

### Issues Found

| Priority | Issue | Impact |
|---|---|---|
| P1 | CSRF_SECRET falls back to random bytes if env var missing — changes on restart, invalidating all tokens | Token invalidation on redeploy |
| P2 | No Stripe webhook signature verification visible (relies on stripe-replit-sync) | Trust dependency |
| P2 | Test endpoints (/api/test/*) use a simple header secret — could be brute-forced | Dev security gap |
| P3 | OAuth access/refresh tokens stored in plain text in auth_providers table | Token exposure risk |
| P3 | IP address logging in sessions (GDPR consideration for EU users) | Compliance risk |

### Remediation Steps

**Step 9 — Set a persistent CSRF_SECRET environment variable**
```
The CSRF middleware in server/middleware/csrf.ts falls back to crypto.randomBytes(32) when CSRF_SECRET is not set. This means every server restart generates a new secret, invalidating all existing CSRF tokens and breaking any in-flight form submissions. Set a persistent CSRF_SECRET as a Replit secret so it survives restarts.
```

**Step 10 — Encrypt OAuth tokens at rest**
```
In the auth_providers table (shared/schema.ts), the accessToken and refreshToken fields store OAuth tokens in plain text. Add application-level encryption using AES-256-GCM before storing, and decrypt on read. Create a server/lib/token-encryption.ts utility with encrypt/decrypt functions using a TOKEN_ENCRYPTION_KEY secret.
```

**Step 11 — Add IP address anonymization option for GDPR**
```
In server/middleware/auth.ts where IP addresses are logged to sessions, add an option to hash or truncate IP addresses for EU users. Store only the /24 subnet (e.g., 192.168.1.x) or a one-way hash. This reduces GDPR exposure while maintaining security monitoring capability.
```

---

## 5. Error Handling — 8.0/10 (B+)

### Strengths
- Centralized AppError class with factory methods (badRequest, unauthorized, forbidden, notFound, conflict, internal)
- Error codes defined per domain (AUTH_REQUIRED, SUBSCRIPTION_REQUIRED, etc.)
- Global error handler with request ID tracing
- asyncHandler wrapper for async route errors
- Standardized error/success response formats (errorResponse, successResponse)
- Request ID middleware for correlating logs to requests
- Structured logging with levels (debug, info, warn, error)
- JSON logging in production, colored console in development
- ErrorBoundary component on the client
- No raw console.log in server routers (all using structured logger)

### Issues Found

| Priority | Issue | Impact |
|---|---|---|
| P2 | Some routers have excessive try-catch nesting (auth.router has 16 try blocks) | Code complexity |
| P2 | ErrorBoundary on client has no error reporting to server | Silent client crashes |
| P3 | No structured error codes for AI/OpenAI failures (model errors, rate limits) | Hard to diagnose AI issues |
| P3 | Unhandled rejection handler logs but doesn't alert | Silent failures in prod |

### Remediation Steps

**Step 12 — Add client error reporting endpoint**
```
Create a POST /api/error-report endpoint that the client ErrorBoundary and ErrorFallback components call when they catch unhandled errors. Send the error message, stack trace, screen name, and user ID. Store in a new error_reports table or log to a monitoring service. This ensures client-side crashes are visible to you.
```

**Step 13 — Add structured error handling for OpenAI API failures**
```
In server/services/recipeGenerationService.ts, wrap OpenAI calls with specific error handling that distinguishes between rate limits (429), model overloaded (503), invalid request (400), and auth errors (401). Map each to appropriate AppError codes like AI_RATE_LIMITED, AI_MODEL_UNAVAILABLE, AI_INVALID_REQUEST. Return user-friendly messages for each case.
```

---

## 6. Accessibility — 5.5/10 (D+)

### Strengths
- Web focus CSS injection for keyboard navigation (focus-visible outlines)
- webAccessibilityProps helper for keyboard interaction on web
- accessibilityLabel present on some screens (10 screens found)
- eslint-plugin-jsx-a11y installed as a dependency
- data-testid attributes on 15+ screen files

### Issues Found

| Priority | Issue | Impact |
|---|---|---|
| P1 | Only 10/32 screens have accessibilityLabel props | Screen reader unusable on 70% of app |
| P1 | No accessibilityRole props found on interactive elements | Buttons/links not announced correctly |
| P2 | No VoiceOver/TalkBack testing evidence | Blind users blocked |
| P2 | GlassCard, GlassButton custom components may lack accessibility tree | Custom controls invisible to AT |
| P2 | Color contrast not verified for glass/translucent UI elements | Low vision users impacted |
| P3 | No dynamic font size support (user's system font preferences) | Low vision accommodation missing |
| P3 | No reduced motion support for AnimatedBackground | Vestibular disorder impact |

### Remediation Steps

**Step 14 — Add accessibility props to all interactive components**
```
Audit all files in client/components/ and client/screens/. Every TouchableOpacity, Pressable, and Button must have accessibilityLabel and accessibilityRole props. GlassButton.tsx and GlassCard.tsx need accessibilityRole="button" and descriptive labels. Use a consistent pattern: accessibilityLabel={`${action} ${target}`} (e.g., "Add item to inventory").
```

**Step 15 — Add accessibilityRole to all custom interactive components**
```
In client/components/GlassButton.tsx, GlassCard.tsx, FloatingChatButton.tsx, CustomTabBar.tsx, and all SwipeableItemCard.tsx, add accessibilityRole="button" or appropriate role. Add accessibilityHint for actions that aren't obvious (e.g., "Double-tap to open recipe details"). Test with VoiceOver on iOS simulator.
```

**Step 16 — Add reduced motion support**
```
In client/components/AnimatedBackground.tsx, check for useReducedMotion() from react-native-reanimated. When reduced motion is preferred, disable bubble animations and use static gradients instead. Apply the same check to any Moti animations in the app.
```

**Step 17 — Add dynamic font scaling support**
```
Ensure all text components in the app respect the user's system font size preferences. In React Native, this means using the allowFontScaling prop (default true) and testing with large font settings. Audit fixed-height containers that might clip scaled text.
```

---

## 7. Code Quality — 7.5/10 (B)

### Strengths
- Well-documented schema with JSDoc comments explaining every table and field
- Domain-driven design layer (shared/domain/ with value objects, entities, aggregates, events)
- Consistent API response format (successResponse, errorResponse)
- Clean separation: routers, services, middleware, lib utilities
- TypeScript throughout with proper type inference from Drizzle
- Insert schemas with Zod validation auto-generated from DB schema
- No console.log pollution — structured logger used consistently
- 37+ unit tests covering auth, subscription, sync, voice, nutrition, etc.
- Centralized session utilities in server/lib/session-utils.ts
- Consistent async/await patterns throughout

### Issues Found

| Priority | Issue | Impact |
|---|---|---|
| P2 | auth.router.ts is 1,065 lines, subscriptionRouter.ts is 1,022 lines | Hard to maintain |
| P2 | IStorage interface in storage.ts only has 3 methods — not used by routes | Dead abstraction |
| P2 | No migration files visible (using `drizzle-kit push` only) | No migration history/rollback |
| P3 | server/routers/ mixes concerns (auth.router has 16 try-catch blocks — business logic in routes) | Coupling |
| P3 | Duplicate CacheService pattern could be centralized further | Consistency |
| P3 | No TypeScript strict mode indicators (--strict flag) | Type safety gaps possible |

### Remediation Steps

**Step 18 — Break down large routers into focused sub-modules**
```
Split server/routers/auth.router.ts (1,065 lines) into sub-modules: auth/login.ts, auth/register.ts, auth/password-reset.ts, auth/session-management.ts, and auth/account-settings.ts. Each sub-module exports a Router that the main auth.router.ts mounts. Same approach for server/stripe/subscriptionRouter.ts (1,022 lines) — split into subscription/checkout.ts, subscription/management.ts, subscription/entitlements.ts.
```

**Step 19 — Remove or implement the IStorage interface**
```
The IStorage interface in server/storage.ts has only 3 methods and is not used anywhere — routes query the DB directly via Drizzle. Either remove it entirely (since it's dead code) or implement it as a proper repository pattern that routes use, enabling easy testing with mocks.
```

**Step 20 — Add Drizzle migration files for production safety**
```
Currently using 'drizzle-kit push' which directly modifies the database schema. For production, switch to 'drizzle-kit generate' to create SQL migration files, then 'drizzle-kit migrate' to apply them. This gives you a migration history, rollback capability, and prevents accidental destructive schema changes.
```

---

## 8. Mobile — 8.0/10 (B+)

### Strengths
- React Native + Expo with 32 screens covering full feature set
- Drawer + Tab + Stack navigation architecture
- Platform-specific code splits (.web.tsx, .tsx)
- Biometric authentication support (Face ID, fingerprint)
- Apple Sign-In (native on iOS), Google Sign-In (OAuth)
- RevenueCat/StoreKit integration for iOS/Android IAP
- Offline-capable with local-first architecture
- Push notifications via expo-notifications
- Camera integration (food scanning, receipt scanning, barcode)
- Voice commands via expo-speech
- Haptic feedback via expo-haptics
- Siri Shortcuts guide screen
- Deep linking support
- Gesture-based interactions (swipeable cards, draggable list)

### Issues Found

| Priority | Issue | Impact |
|---|---|---|
| P2 | No app-level analytics/crash reporting integration visible | Blind to user behavior |
| P2 | 24 hooks in client/hooks/ — some may have overlapping responsibilities | Bundle bloat |
| P3 | No tablet-specific layouts detected | Poor iPad/tablet experience |
| P3 | expo-camera v17 may have breaking changes vs Expo SDK 54 | Build risk |

### Remediation Steps

**Step 21 — Add analytics and crash reporting**
```
Integrate a crash reporting service (e.g., Sentry or Expo's built-in error reporting). In client/lib/analytics.ts (which already exists), connect it to actually report events. Wrap the root App component with the crash reporter's error boundary. Track key events: screen views, recipe generation, inventory actions, subscription changes.
```

**Step 22 — Audit and consolidate hooks**
```
Review the 24 hooks in client/hooks/. Look for overlapping functionality between hooks like useDebounce, useDevice, useTheme (vs ThemeContext), and payment-related hooks. Merge hooks that share state or logic. Document each hook's purpose and dependencies in a hooks/README.md.
```

**Step 23 — Add tablet layout support**
```
In client/hooks/useDevice.ts (or create one), detect tablet screen sizes. For screens like InventoryScreen, RecipesScreen, and MealPlanScreen, add a two-column layout when the screen width exceeds 768px. Use Dimensions.get('window') or useWindowDimensions() to drive responsive layouts.
```

---

## 9. Data Management — 7.5/10 (B)

### Strengths
- PostgreSQL with Drizzle ORM — type-safe queries throughout
- Well-indexed tables (composite indexes, unique constraints, foreign keys with CASCADE)
- Normalized sync tables alongside JSONB for migration path
- Soft delete support on inventory items (deletedAt column)
- User data export endpoint (GDPR compliance)
- Account deletion with cascading data cleanup
- Structured nutrition data model with merge utility
- Referral tracking with bonus credit system
- Conversion events and cancellation reasons for analytics

### Issues Found

| Priority | Issue | Impact |
|---|---|---|
| P1 | Dual storage (JSONB blobs + normalized tables) creates consistency risk | Data mismatch possible |
| P2 | No database backup/restore strategy documented | Disaster recovery gap |
| P2 | No data validation on JSONB columns (inventory, recipes, etc.) | Corrupt data possible |
| P2 | No pagination visible on list endpoints (inventory, recipes, shopping) | Performance at scale |
| P3 | No database connection health monitoring | Silent DB failures |
| P3 | wasteLog and consumedLog stored as JSONB — no queryable analytics | Missed insights |

### Remediation Steps

**Step 24 — Add pagination to all list endpoints**
```
In server/routers/sync/inventory-sync.ts, recipes-sync.ts, and shopping-sync.ts, add cursor-based pagination (using updatedAt + id as cursor). Accept ?limit=50&cursor=... query parameters. Return a nextCursor in the response. Update client hooks to use useInfiniteQuery from TanStack Query for paginated fetching.
```

**Step 25 — Add JSONB schema validation**
```
Create Zod schemas for the JSONB columns in userSyncData (inventory items shape, recipe shape, meal plan shape). Validate data before writing to these columns in the sync endpoints. This prevents malformed data from entering the database and causing client-side crashes.
```

**Step 26 — Add database health monitoring**
```
In server/db.ts, add a health check function that periodically pings the database connection pool. Expose pool statistics (total, idle, waiting) on the /api/health endpoint response. Log warnings when the pool approaches capacity (>16 of 20 connections in use).
```

---

## 10. Monetization — 9.0/10 (A)

### Strengths
- Single subscription model ($9.99/mo, $99.90/yr) — clean and simple
- 7-day free trial with automatic expiration via background job
- Stripe integration for web payments (checkout, portal, webhooks)
- RevenueCat integration for iOS/Android IAP (StoreKit)
- Platform guards preventing native users from web Stripe endpoints
- Subscription entitlements system with usage tracking and limits
- Grace period (7 days) for failed payments before lockout
- Cancellation flow with reason collection and retention offers
- Conversion event tracking (tier changes)
- Proration support for plan changes
- Donation system (web-only, platform-compliant)
- Referral system with bonus AI recipe credits
- Price caching to reduce Stripe API calls
- Apple compliance: CustomerCenter-first subscription management, legal links, price display rules
- Pre-registration from landing page for early user capture

### Issues Found

| Priority | Issue | Impact |
|---|---|---|
| P2 | No revenue analytics dashboard beyond basic admin panel | Limited business insight |
| P3 | No winback campaign for churned subscribers | Lost revenue recovery |
| P3 | Donation amounts may need configurable options | Donation conversion |

### Remediation Steps

**Step 27 — Add revenue analytics to admin dashboard**
```
In server/routers/admin/analytics.router.ts, add endpoints for: MRR (monthly recurring revenue), churn rate, trial-to-paid conversion rate, average revenue per user (ARPU), and cohort retention. Query the subscriptions and conversionEvents tables grouped by month. Display these in the admin dashboard HTML template.
```

**Step 28 — Implement winback flow for churned subscribers**
```
Create a server/jobs/winbackJob.ts that runs weekly. Query users whose subscription status is 'canceled' and canceledAt is 30+ days ago. Queue a notification offering a discounted return (e.g., first month at $4.99). Track winback offers sent and accepted in a new winback_campaigns table.
```

---

## Priority Execution Order

| Step | Category | Priority | Issue Summary |
|---|---|---|---|
| 5 | Performance | P1 | Add session caching to auth middleware |
| 6 | Performance | P1 | Add subscription check caching |
| 9 | Security | P1 | Set persistent CSRF_SECRET |
| 14 | Accessibility | P1 | Add accessibility props to all interactive components |
| 7 | Performance | P1 | Implement React.lazy code splitting |
| 3 | Core Features | P1 | Add offline sync retry with backoff |
| 24 | Data Management | P1 | Add pagination to list endpoints |
| 1 | UI/UX | P1 | Add lazy loading for mobile screens |
| 15 | Accessibility | P2 | Add accessibilityRole to custom components |
| 12 | Error Handling | P2 | Add client error reporting endpoint |
| 10 | Security | P2 | Encrypt OAuth tokens at rest |
| 25 | Data Management | P2 | Add JSONB schema validation |
| 8 | Performance | P2 | Deprecate legacy JSONB sync |
| 18 | Code Quality | P2 | Break down large routers |
| 21 | Mobile | P2 | Add analytics and crash reporting |
| 13 | Error Handling | P2 | Structured error handling for OpenAI |
| 2 | UI/UX | P2 | Improve web landing page routing |
| 26 | Data Management | P2 | Add database health monitoring |
| 27 | Monetization | P2 | Add revenue analytics dashboard |
| 22 | Mobile | P2 | Audit and consolidate hooks |
| 20 | Code Quality | P2 | Add Drizzle migration files |
| 19 | Code Quality | P2 | Remove or implement IStorage interface |
| 11 | Security | P3 | IP address anonymization for GDPR |
| 16 | Accessibility | P3 | Add reduced motion support |
| 17 | Accessibility | P3 | Add dynamic font scaling support |
| 4 | Core Features | P3 | Expand AI chat function calling |
| 23 | Mobile | P3 | Add tablet layout support |
| 28 | Monetization | P3 | Implement winback flow |

---

## Quick Wins (< 30 minutes each)

1. **Set CSRF_SECRET env var** — One secret to add, prevents token invalidation on restart
2. **Remove unused IStorage interface** — Delete 30 lines of dead code
3. **Add DB pool stats to /api/health** — 10 lines in server/db.ts
4. **Add accessibilityRole to GlassButton** — One prop addition per component
5. **Cache subscription checks** — Wrap existing query with CacheService

---

## Architecture Strengths Worth Preserving

- **Local-first sync architecture** — Users can work offline, data syncs when connected
- **Domain-driven design layer** — Clean abstractions for business logic
- **Platform-aware monetization** — Correctly gates Stripe on native, supports StoreKit/RevenueCat
- **Comprehensive auth system** — Email + Apple + Google with multi-session support
- **Security-first middleware** — CSRF, rate limiting, helmet, session monitoring all in place
- **Structured logging** — Request ID correlation, JSON in production, colored in dev
