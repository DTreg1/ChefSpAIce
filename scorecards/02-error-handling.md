# Error Handling — Grade: A-

## Strengths
- Centralized `AppError` class with typed error codes and HTTP status helpers
- Global error handler catches all unhandled errors with request ID tracing
- `asyncHandler` wrapper prevents unhandled promise rejections in Express routes
- Client-side `ErrorBoundary` component with customizable fallback and error reporting
- Sentry integration on both client and server for crash reporting
- `unhandledRejection` and `uncaughtException` handlers with Sentry flush
- Error reporter sends client crashes to `/api/error-report` endpoint
- Sync manager has exponential backoff with fatal error detection after 5 retries
- Structured error responses with consistent `{ success, error, errorCode, requestId }` format

## Weaknesses
- Some `.catch(() => {})` silent swallows (e.g., notification queueing in auth middleware)
- No circuit breaker pattern for external service calls (OpenAI, Stripe, Instacart, USDA)
- Error boundary doesn't capture navigation errors
- No client-side error rate tracking or alerting threshold

## Remediation Steps

**Step 1 — Replace silent catch blocks with logged warnings**
```
Search for all instances of .catch(() => {}) across the codebase. Replace each with .catch((err) => logger.warn("Non-critical error", { context: "description", error: err.message })) so failures are observable in logs and Sentry without crashing the app.
```

**Step 2 — Add circuit breaker for OpenAI calls**
```
Create server/lib/circuit-breaker.ts with a simple circuit breaker: track consecutive failures per service. After 5 failures in 60 seconds, open the circuit and return a cached response or a user-friendly error ("AI features are temporarily unavailable, please try again in a moment") for 30 seconds before allowing a retry. Apply to chat.router.ts, suggestions.router.ts, and recipes.router.ts OpenAI calls.
```
