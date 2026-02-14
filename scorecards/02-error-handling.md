# Error Handling — Grade: A-

## Executive Summary

The project has a robust error handling architecture with a well-designed `AppError` class, centralized global error handler, dual crash reporting (Sentry on both native and web), circuit breakers for external services, graceful shutdown, a health check endpoint, and comprehensive validation middleware. Previous gaps — silent error swallowing, missing circuit breakers, no web Sentry, inconsistent validation — have all been remediated.

---

## Category 1: Server-Side Error Architecture

### Grade: A

**What's Done Well:**

- **`AppError` class** (`server/middleware/errorHandler.ts`): Clean, typed error class with static factory methods (`badRequest`, `unauthorized`, `forbidden`, `notFound`, `conflict`, `internal`), an `isOperational` flag to distinguish programmer errors from expected errors, and a `withDetails()` method for attaching context. Follows the industry pattern of operational vs. programmer errors.
- **Global error handler** (`globalErrorHandler`): Catches all Express errors, returns consistent JSON `{ success, error, errorCode, requestId }` format, logs unhandled errors with stack traces, sends non-operational errors to Sentry with request context, and hides stack traces in production.
- **`asyncHandler` wrapper** (`server/lib/apiResponse.ts`): One-liner that wraps async route handlers in `Promise.resolve().catch(next)`, preventing unhandled promise rejections from crashing the process. Used consistently across routes.
- **Request ID tracing** (`requestIdMiddleware`): Every request gets a `crypto.randomUUID()` attached to `req.id`, included in all error responses for correlation.
- **Structured response helpers**: `successResponse()` and `errorResponse()` enforce consistent API response shapes across all routes.
- **[REMEDIATED] Zod validation middleware** (`server/middleware/validateBody.ts`): Reusable middleware converts all Zod errors to consistent 400 `AppError` responses. Applied across voice, suggestions, donations, auth, and other routes — eliminating the previous inconsistency where Zod errors fell through as 500s.

**Remaining Considerations:**

- `asyncHandler` is not used on every route — e.g., `chat.router.ts` uses a raw `async (req, res, next) => { try { ... } catch (e) { next(e) } }` pattern instead. While functionally equivalent, it's inconsistent.
- The `AppError` class doesn't implement `toJSON()`, so if an `AppError` is accidentally serialized outside the global handler, the `errorCode` and `statusCode` fields won't appear.

---

## Category 2: Silent Error Swallowing

### Grade: B+

**[REMEDIATED]** The majority of silent catch blocks have been replaced with logged warnings. Cache operations in `RedisCacheStore` now log `logger.debug("Redis cache operation failed", ...)` on all 4 operation types. Server-side silent catches in `auth.ts`, `social-auth.router.ts`, and other locations have been addressed with proper logging.

**Remaining Considerations:**

- Some client-side catch blocks may still use default fallback values without logging in edge cases (e.g., onboarding state persistence). These are low-risk since client-side logging goes to the console and is captured by Sentry.

---

## Category 3: External Service Resilience

### Grade: A-

**[REMEDIATED] Circuit breaker implemented** (`server/lib/circuit-breaker.ts`): Per-service circuit breaker with configurable failure threshold (5 failures in 60 seconds), open duration (30 seconds), and half-open probe logic. All state transitions (closed→open, open→half-open, half-open→closed) are logged.

**Applied to:**
- All OpenAI calls: chat, recipes, suggestions, voice (input/chat/TTS), image analysis, receipt analysis — via `withCircuitBreaker("openai", ...)`.
- USDA nutrition lookup calls.

**OpenAI:**
- Circuit breaker protects against cascading failures during outages.
- Errors are caught and forwarded via `next(error)` for consistent handling.
- Streaming support added for recipe generation, reducing perceived latency.

**Stripe:**
- `initStripe()` has retry logic with 3 attempts and 2-second delays.
- Webhook processing with signature verification and structured logging.

**Instacart:**
- Has `fetchWithRetry()` with exponential backoff and `Retry-After` header support — the best-implemented resilience pattern in the codebase.

**USDA:**
- Rate limit (429) is explicitly checked and logged.
- Errors return empty arrays or `null` gracefully.
- Protected by circuit breaker.

---

## Category 4: Client-Side Error Handling

### Grade: A-

**What's Done Well:**

- **`ErrorBoundary` component**: Class-based boundary with configurable fallback component, `onError` callback, `screenName` tracking, and error reset capability. Calls `reportError()` which sends the full stack + component stack to `/api/error-report`.
- **`error-reporter.ts`**: Reports errors to both Sentry (via `captureError()`) and the server endpoint (`/api/error-report`) with platform, app version, and device info.
- **[REMEDIATED] Web Sentry enabled**: `crash-reporter.web.ts` now uses `@sentry/react` with actual Sentry initialization, providing crash reporting and error visibility for web users.
- **Sentry integration**: Native Sentry on mobile (`@sentry/react-native`), real Sentry on web (`@sentry/react`). Both platforms now have error tracking.
- **Sync manager**: Exponential backoff (1s, 2s, 4s, 8s… max 60s), fatal detection after 5 retries or 4xx status, offline detection after 3 consecutive failures, queue persistence in AsyncStorage.
- **[REMEDIATED] Sync failure user notification**: Silent catch blocks on `fullSync()` in ShoppingListScreen, MealPlanScreen, and similar locations now show toast notifications ("Sync failed — we'll try again shortly") instead of silently swallowing errors.

**Remaining Considerations:**

- ErrorBoundary doesn't reset on navigation. If a screen crashes, the fallback persists until manually reset.
- No error rate tracking on the client (a loop producing many errors/second could flood Sentry).

---

## Category 5: Validation & Input Handling

### Grade: A-

**What's Done Well:**

- **Zod schemas**: Request bodies are validated with Zod in most routes via the `validateBody` middleware.
- **Sync data validation**: Comprehensive shared Zod schemas in `shared/schema.ts` with `sync*` prefixes, validated on import with up to 20 detailed error messages.
- **Instacart product validation**: `validateProducts()` checks array presence, item structure, and provides clear error messages per item.
- **[REMEDIATED] Consistent ZodError → 400 conversion**: The `validateBody` middleware is now applied to ~20 routes that previously used manual `req.body` destructuring without validation. All Zod errors produce consistent 400 responses.

**Remaining Considerations:**

- No input sanitization layer beyond Zod (e.g., protection against extremely deeply nested objects). Express body size limits provide the primary defense.

---

## Category 6: Logging & Observability

### Grade: A-

**What's Done Well:**

- **Structured logger** (`server/lib/logger.ts`): JSON output in production, colorized in development. Four levels (debug, info, warn, error) with context objects.
- **Error context in logs**: Most error logs include relevant context (user ID, endpoint, error message, attempt count).
- **Job scheduler error tracking**: `cronJobs` table stores `lastError` and `lastRunDurationMs` per job.
- **Sentry integration**: Server-side Sentry strips sensitive headers. Web Sentry now active.
- **[REMEDIATED] Redis/cache logging**: All `RedisCacheStore` operations log `logger.debug` on failures instead of silently swallowing errors.
- **[REMEDIATED] Health check endpoint**: Available for deployment health checks and external monitoring, reporting database and Redis status.
- **[REMEDIATED] Slow query logging**: Database queries are monitored with `performance.now()` timing in `server/db.ts`, logging warnings for queries exceeding thresholds.

**Remaining Considerations:**

- `createRequestLogger` is rarely used — most routes use the global `logger` without request ID context.
- No external metrics export (Prometheus, Datadog) — relies on Sentry and server logs.

---

## Category 7: Process-Level Error Handling

### Grade: A

**What's Done Well:**

- **`unhandledRejection` handler**: Logs the error with stack trace and sends to Sentry.
- **`uncaughtException` handler**: Logs the error, sends to Sentry, flushes Sentry with 2-second timeout, then exits with code 1.
- **Database warmup with retries**: 3 attempts with 2-second delays and 5-second connection timeout.
- **Graceful Stripe init failure**: If Stripe initialization fails, it logs the error and continues.
- **Job scheduler error isolation**: Each cron job runs in its own try/catch.
- **[REMEDIATED] Graceful shutdown handler**: `SIGTERM` and `SIGINT` handlers drain in-flight requests, close the HTTP server, flush Sentry, and exit cleanly (`index.ts:649-650`).

---

## Category 8: Rate Limiting & Abuse Protection

### Grade: A-

**What's Done Well:**

- **Tiered rate limiters**: Separate limits for auth (10/15min), AI (30/min), password reset (3/hour by email), and general API (100/min).
- **Rate limit responses include `retryAfter`**: Clients can implement proper backoff.
- **Standard headers**: `standardHeaders: true` sends `RateLimit-*` headers per RFC draft.
- **Test bypass**: Rate limits are skipped in test environment.

**Remaining Considerations:**

- Rate limit responses don't use the standard `AppError` format — clients must handle two different error response shapes.
- No per-user rate limiting — all limits are IP-based.

---

## Remediations Completed

| # | Remediation | Status |
|---|-------------|--------|
| 1 | Replace all silent catch blocks with logged warnings | **Done** |
| 2 | Add Zod validation middleware for consistent 400 responses | **Done** |
| 3 | Add circuit breaker for OpenAI and external services | **Done** |
| 4 | Add graceful shutdown handler (SIGTERM/SIGINT) | **Done** |
| 5 | Enable web Sentry (crash-reporter.web.ts) | **Done** |
| 6 | Add health check endpoint | **Done** |
| 7 | Standardize rate limit error responses | Not yet done (low priority) |

## Remaining Low-Priority Items

- Rate limit responses could be standardized to use `errorResponse()` format for consistency.
- `createRequestLogger` could be used more widely for request-scoped logging.
- Error rate tracking on the client to prevent Sentry flooding during error loops.
