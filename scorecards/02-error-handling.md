# Error Handling — Grade: B+

## Executive Summary

The project has a solid error handling foundation with a well-designed `AppError` class, centralized global error handler, and dual crash reporting (Sentry + custom error reports). However, a deeper audit reveals a pattern of silent error swallowing in both server and client code, inconsistent validation across routes, missing resilience patterns for external service calls, and gaps in observability that collectively warrant a downgrade from A- to B+.

---

## Category 1: Server-Side Error Architecture

### Grade: A

**What's Done Well:**

- **`AppError` class** (`server/middleware/errorHandler.ts`): Clean, typed error class with static factory methods (`badRequest`, `unauthorized`, `forbidden`, `notFound`, `conflict`, `internal`), an `isOperational` flag to distinguish programmer errors from expected errors, and a `withDetails()` method for attaching context. Follows the industry pattern of operational vs. programmer errors.
- **Global error handler** (`globalErrorHandler`): Catches all Express errors, returns consistent JSON `{ success, error, errorCode, requestId }` format, logs unhandled errors with stack traces, sends non-operational errors to Sentry with request context, and hides stack traces in production.
- **`asyncHandler` wrapper** (`server/lib/apiResponse.ts`): One-liner that wraps async route handlers in `Promise.resolve().catch(next)`, preventing unhandled promise rejections from crashing the process. Used consistently across routes.
- **Request ID tracing** (`requestIdMiddleware`): Every request gets a `crypto.randomUUID()` attached to `req.id`, included in all error responses for correlation.
- **Structured response helpers**: `successResponse()` and `errorResponse()` enforce consistent API response shapes across all routes.

**What's Missing:**

- `asyncHandler` is not used on every route — e.g., `chat.router.ts` uses a raw `async (req, res, next) => { try { ... } catch (e) { next(e) } }` pattern instead. While functionally equivalent, it's inconsistent and error-prone if a developer forgets the try/catch.
- No middleware-level validation for common request patterns (e.g., a generic Zod validation middleware). Only `feedback.router.ts` explicitly catches `z.ZodError`; other routes throw raw Zod errors which fall through to the global handler as 500s instead of 400s.
- The `AppError` class doesn't implement `toJSON()`, so if an `AppError` is accidentally serialized outside the global handler (e.g., logged), the `errorCode` and `statusCode` fields won't appear.

---

## Category 2: Silent Error Swallowing

### Grade: C+

This is the most significant weakness. Multiple locations silently discard errors, making failures invisible in logs, Sentry, and monitoring.

**Server-Side Silent Catches:**

| Location | Code | Risk |
|----------|------|------|
| `server/middleware/auth.ts:90` | `.catch(() => {})` on `queueNotification()` | Security notification delivery failures are invisible. If the notification service is down, user-agent mismatch alerts silently fail and users are never warned of potential session hijacking. |
| `server/routers/social-auth.router.ts:21-22` | `catch (error) {}` on `createSyncDataIfNeeded()` | Sync data creation failures during social auth are completely swallowed. A user could authenticate successfully but have no sync data row, causing downstream sync failures that are hard to diagnose. |
| `server/seeds/seed-appliances.ts:575` | `.catch(() => process.exit(1))` | Exits without logging the error — impossible to debug seed failures. |
| `server/routers/error-report.router.ts:34` | `catch {}` on session token lookup | While low-risk (best-effort user identification), it discards potential DB connection errors that could indicate broader issues. |
| `server/lib/cache.ts:90-119` | Four `catch {}` blocks in `RedisCacheStore` | All Redis operations (get, set, delete, clear) silently swallow errors. While cache failures are non-fatal, there's no visibility into Redis health, connection drops, or serialization errors. |
| `server/index.ts:359` | `catch {}` on `client.end()` during DB warmup | Acceptable — cleaning up a failed connection. |

**Client-Side Silent Catches:**

| Location | Code | Risk |
|----------|------|------|
| `client/lib/storage.ts:627` | `.catch(() => {})` on `uploadRecipeImageToCloud()` | Recipe image cloud uploads fail silently. Users see their recipe saved locally but the image never reaches the cloud, causing missing images on other devices with no indication of failure. |
| `client/lib/storage.ts:1065-1067` | `.catch(() => [])` / `.catch(() => null)` on `getRecipes`, `getInventory`, `getPreferences` | Onboarding check swallows storage errors. If storage is corrupted, users may be repeatedly shown onboarding instead of receiving an error message. |
| `client/lib/storage.ts:1077` | `.catch(() => {})` on `setOnboardingCompleted()` | Silent failure to persist onboarding state causes re-onboarding loops. |

**Total Count:** 11+ silent catch blocks across the codebase, 6 of which have meaningful operational risk.

---

## Category 3: External Service Resilience

### Grade: B-

The application depends on four external services (OpenAI, Stripe, Instacart, USDA) but has inconsistent resilience patterns.

**OpenAI (chat, recipes, suggestions, image analysis, receipt analysis, voice):**
- No retry logic on OpenAI calls. A single transient failure returns an error to the user.
- No circuit breaker. If OpenAI is down, every request still attempts the call and waits for a timeout.
- No request timeout configured on the OpenAI client — defaults to the SDK's internal timeout, which may be very long.
- Errors are caught and forwarded via `next(error)`, which is correct, but the raw OpenAI error message may leak API internals to the client in development mode.

**Stripe:**
- `webhookHandlers.ts` processes events correctly, with signature verification and structured logging.
- `initStripe()` has retry logic with 3 attempts and 2-second delays — good.
- `syncBackfill()` errors are caught and logged but the failure is not surfaced anywhere actionable.
- Webhook processing throws raw `Error` instead of `AppError` in some paths (e.g., line 20-26 of `webhookHandlers.ts`).

**Instacart:**
- Has `fetchWithRetry()` with exponential backoff and `Retry-After` header support — the best-implemented resilience pattern in the codebase.
- Rate limit handling (429) is explicitly handled with logged retries.
- However, no circuit breaker — if Instacart is fully down, retries still happen on every request.

**USDA:**
- Rate limit (429) is explicitly checked and logged.
- Errors return empty arrays or `null` gracefully — good degradation.
- However, errors are only logged, not tracked for frequency. No way to know if USDA has been failing for hours.
- No retry logic at all — a single transient network error means the lookup fails.

**Summary:** Only Instacart has retry logic. None of the four services have circuit breakers. OpenAI (the most critical service) has the least resilience.

---

## Category 4: Client-Side Error Handling

### Grade: B+

**What's Done Well:**

- **`ErrorBoundary` component**: Class-based boundary with configurable fallback component, `onError` callback, `screenName` tracking, and error reset capability. Calls `reportError()` which sends the full stack + component stack to `/api/error-report`.
- **`error-reporter.ts`**: Reports errors to both Sentry (via `captureError()`) and the server endpoint (`/api/error-report`) with platform, app version, and device info. Gracefully handles its own failure with `logger.warn`.
- **Sentry integration**: Native Sentry on mobile (`@sentry/react-native`), noop shim on web (`crash-reporter.web.ts`). The noop shim maintains the same API surface, so code doesn't need platform checks.
- **Sync manager**: Exponential backoff (1s, 2s, 4s, 8s… max 60s), fatal detection after 5 retries or 4xx status, offline detection after 3 consecutive failures, queue persistence in AsyncStorage.
- **`response.json().catch(() => ({}))` pattern** in `useVoiceChat.ts` and `useVoiceInput.ts`: Correctly handles non-JSON error responses from the server.

**What's Missing:**

- **No web Sentry**: `crash-reporter.web.ts` is a complete noop — all tracking functions just log to console. Web users have zero crash reporting or error visibility. The `Sentry.ErrorBoundary` on web wraps to a passthrough component that provides no error boundary.
- **ErrorBoundary doesn't reset on navigation**: If a screen crashes, the fallback persists even when navigating away. No integration with the navigation system to auto-reset.
- **No error rate tracking**: The client has no concept of "too many errors" — it reports each error individually but doesn't track frequency. A loop producing 1,000 errors/second would flood both Sentry and the error report endpoint.
- **Sync conflict resolution `.catch()` blocks** (`sync-manager.ts:886, 894`): These log the error but don't inform the user that the conflict resolution failed, leaving data in an ambiguous state.

---

## Category 5: Validation & Input Handling

### Grade: B+

**What's Done Well:**

- **Zod schemas**: Request bodies are validated with Zod in most routes (e.g., `generateRecipeSchema`, `errorReportBodySchema`). The `drizzle-zod` integration derives insert schemas from the DB schema.
- **Sync data validation**: Comprehensive shared Zod schemas in `shared/schema.ts` with `sync*` prefixes, validated on import with up to 20 detailed error messages.
- **Instacart product validation**: `validateProducts()` checks array presence, item structure, and provides clear error messages per item.

**What's Missing:**

- **Inconsistent ZodError handling**: Only `feedback.router.ts` catches `z.ZodError` and converts it to a 400 `AppError`. Other routes let Zod errors fall through to the global handler, which returns them as 500 `INTERNAL_ERROR` responses — misleading for clients.
- **Missing schema validation on some routes**: `chat.router.ts` only checks `if (!message)` manually instead of using a Zod schema. Several sync routes use `req.body` without schema validation.
- **No input sanitization layer**: While Zod handles type/shape validation, there's no explicit protection against extremely large strings, deeply nested objects, or other DoS-style payloads beyond Express's default body size limit.

---

## Category 6: Logging & Observability

### Grade: B+

**What's Done Well:**

- **Structured logger** (`server/lib/logger.ts`): JSON output in production, colorized in development. Four levels (debug, info, warn, error) with context objects. `createRequestLogger()` auto-injects `requestId`.
- **Error context in logs**: Most error logs include relevant context (user ID, endpoint, error message, attempt count).
- **Job scheduler error tracking**: `cronJobs` table stores `lastError` and `lastRunDurationMs` per job — good for monitoring.
- **Sentry integration**: Server-side Sentry strips sensitive headers (Authorization, Cookie) before sending events. 20% trace sample rate.

**What's Missing:**

- **No log levels in cache/Redis**: `RedisCacheStore` silently swallows all errors. Even a `logger.debug` would help diagnose connection issues.
- **No error aggregation/alerting**: No mechanism to detect "5 errors in the last minute" or similar patterns. Relies entirely on external Sentry alerting.
- **`createRequestLogger` is rarely used**: Despite being available, most routes use the global `logger` without request ID context, making it harder to trace errors to specific requests.
- **No health check endpoint**: No `/health` or `/ready` endpoint that reports the status of database, Redis, and external service connections.

---

## Category 7: Process-Level Error Handling

### Grade: A-

**What's Done Well:**

- **`unhandledRejection` handler**: Logs the error with stack trace and sends to Sentry. Does NOT crash the process (correct for Node.js — unhandled rejections are warnings, not fatal).
- **`uncaughtException` handler**: Logs the error, sends to Sentry, flushes Sentry with 2-second timeout, then exits with code 1. Correct behavior — uncaught exceptions leave the process in an unknown state.
- **Database warmup with retries**: 3 attempts with 2-second delays and 5-second connection timeout. Logs each attempt.
- **Graceful Stripe init failure**: If Stripe initialization fails, it logs the error and continues — the app runs without payment features rather than crashing.
- **Job scheduler error isolation**: Each cron job runs in its own try/catch. A failed job records the error in the DB but doesn't affect other jobs or the scheduler.

**What's Missing:**

- **No graceful shutdown handler**: No `SIGTERM`/`SIGINT` handler to drain in-flight requests, close DB connections, and flush Sentry before exit. In a container/deployment environment, this can cause dropped requests and lost error events.
- **`uncaughtException` handler doesn't drain HTTP connections**: The process exits immediately after flushing Sentry, potentially dropping in-flight responses.

---

## Category 8: Rate Limiting & Abuse Protection

### Grade: A-

**What's Done Well:**

- **Tiered rate limiters**: Separate limits for auth (10/15min), AI (30/min), password reset (3/hour by email), and general API (100/min).
- **Rate limit responses include `retryAfter`**: Clients can implement proper backoff.
- **Standard headers**: `standardHeaders: true` sends `RateLimit-*` headers per RFC draft.
- **Test bypass**: Rate limits are skipped in test environment.

**What's Missing:**

- **Rate limit responses don't use `AppError` format**: They return `{ error, retryAfter }` instead of the standard `{ success: false, error, errorCode }` format. Clients must handle two different error response shapes.
- **No per-user rate limiting**: All limits are IP-based. An authenticated user making requests from multiple IPs bypasses per-IP limits.

---

## Overall Weakness Summary (Ranked by Impact)

1. **Silent error swallowing** (11+ locations) — Failures in security notifications, sync data creation, image uploads, and cache operations are invisible.
2. **No circuit breaker for external services** — OpenAI/USDA outages cause cascading slow failures across the entire app.
3. **Inconsistent ZodError → 400 conversion** — Validation errors appear as 500s to clients in most routes.
4. **No web crash reporting** — Web platform has zero error visibility (Sentry is a noop).
5. **No graceful shutdown** — Risk of dropped requests and lost error events during deploys.
6. **Missing retry logic for OpenAI** — The most critical external dependency has the least resilience.

---

## Remediation Steps

**Step 1 — Replace all silent catch blocks with logged warnings (Priority: High)**
```
Search for .catch(() => {}), catch {}, and catch (error) {} across the codebase.
Replace each with logged warnings:

Server examples:
- auth.ts:90: .catch((err) => logger.warn("Failed to queue UA mismatch notification", { error: err.message }))
- social-auth.router.ts:21: catch (error) { logger.warn("Failed to create sync data row", { userId, error: error.message }) }
- cache.ts (all 4 blocks): Add logger.debug("Redis cache operation failed", { key, error: err.message })

Client examples:
- storage.ts:627: .catch((err) => logger.warn("Background image upload failed", { recipeId, error: err.message }))
- storage.ts:1065-1067: Keep .catch(() => []) but add logger.warn before returning default
- storage.ts:1077: .catch((err) => logger.warn("Failed to persist onboarding state", { error: err.message }))
```

**Step 2 — Add Zod validation middleware (Priority: High)**
```
Create server/middleware/validateBody.ts:
  export function validateBody(schema: z.ZodSchema) {
    return (req, res, next) => {
      const result = schema.safeParse(req.body);
      if (!result.success) {
        return next(AppError.badRequest("Validation failed", "VALIDATION_ERROR")
          .withDetails(result.error.errors));
      }
      req.body = result.data;
      next();
    };
  }

Apply to all routes that currently use manual req.body checks or raw schema.parse().
This converts all Zod errors to consistent 400 responses.
```

**Step 3 — Add circuit breaker for OpenAI (Priority: High)**
```
Create server/lib/circuit-breaker.ts with a per-service circuit breaker:
- Track consecutive failures per service key (e.g., "openai", "usda")
- After 5 failures within 60 seconds, open the circuit for 30 seconds
- During open state, immediately return a user-friendly error without calling the service
- After 30 seconds, allow one "probe" request through; if it succeeds, close the circuit
- Log all state transitions (closed→open, open→half-open, half-open→closed)

Apply to: chat.router.ts, recipes.router.ts, suggestions.router.ts, voice.router.ts,
image-analysis.router.ts, receipt-analysis.router.ts (OpenAI), and nutrition-lookup.router.ts (USDA).
```

**Step 4 — Add graceful shutdown handler (Priority: Medium)**
```
In server/index.ts, add:
  const shutdown = async (signal) => {
    logger.info("Shutdown signal received", { signal });
    server.close(() => {
      logger.info("HTTP server closed");
    });
    await flushSentry(5000);
    process.exit(0);
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
```

**Step 5 — Enable web Sentry (Priority: Medium)**
```
In crash-reporter.web.ts, replace the noop shim with actual @sentry/react initialization.
Import and configure Sentry with the same DSN (EXPO_PUBLIC_SENTRY_DSN), a lower trace sample
rate (0.1), and browser-appropriate integrations (BrowserTracing, Replay). This gives visibility
into web user errors that currently go completely untracked.
```

**Step 6 — Standardize rate limit error responses (Priority: Low)**
```
In server/middleware/rateLimiter.ts, update all handler functions to use the
errorResponse() format:
  handler: (_req, res) => {
    res.status(429).json({
      ...errorResponse("Too many requests. Please try again later.", "RATE_LIMITED"),
      retryAfter: 900,
    });
  }
This ensures clients only need to handle one error response shape.
```

**Step 7 — Add health check endpoint (Priority: Low)**
```
Add GET /api/health that checks:
  - Database: SELECT 1 with 3-second timeout
  - Redis: PING (if configured)
  - Returns { status: "healthy"|"degraded"|"unhealthy", checks: { db, redis, uptime } }
Useful for deployment health checks and external monitoring.
```
