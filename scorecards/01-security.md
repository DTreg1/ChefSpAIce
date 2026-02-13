# Security — Grade: A-

## Category Breakdown

### 1. Authentication & Session Management — A

**Strengths:**
- Bearer token authentication with SHA-256 hashed session tokens stored in DB (`server/lib/auth-utils.ts:63`). Raw tokens never persisted.
- Session tokens generated with cryptographically secure `randomBytes(32)` — 256-bit entropy (`server/lib/session-utils.ts:4`).
- Password hashing with bcrypt at 12 rounds (`server/domain/services/AuthenticationService.ts:15`), industry-standard cost factor.
- Password complexity requirements enforced: minimum 8 characters, uppercase, lowercase, and digit required (`AuthenticationService.ts:29-34`).
- Session expiration set to 30 days with automated cleanup job that deletes expired sessions daily (`server/jobs/sessionCleanupJob.ts`).
- Session user-agent mismatch detection with throttled security notifications to the user (1 alert per session per 24 hours) (`server/middleware/auth.ts:70-91`).
- Session cache with 60-second TTL to reduce DB lookups, with proper invalidation on logout/revoke (`server/lib/session-cache.ts`).
- Auth cookie is httpOnly, secure, sameSite=lax, path-restricted (`server/lib/session-utils.ts:19-25`).
- Password reset tokens hashed with SHA-256 before storage, expire after 1 hour, and all existing sessions are revoked on password change (`server/routers/auth/password-reset.ts`).
- Password reset responses use constant messaging regardless of whether the email exists, preventing user enumeration (`password-reset.ts:23,42,60`).
- Account deletion requires email confirmation matching the account, with demo account protection (`account-settings.ts:488-522`).
- Session revocation: users can revoke individual sessions or all other sessions (`session-management.ts`). IP addresses are masked when displayed.

**Weaknesses:**
- No account lockout after repeated failed login attempts. Only IP-based rate limiting (10 attempts per 15 minutes) is in place, which a distributed attacker with multiple IPs could bypass. There is no per-account failed-attempt counter.
- Auth cookie stores the raw session token in the cookie value (`session-utils.ts:19`). If the cookie is compromised, the attacker has the same token used in Bearer auth. Consider using a separate, cookie-specific token that maps to the session.
- The `restore-session` endpoint (`login.ts:120-168`) returns the raw cookie token back to the client in the JSON response (`token: cookieToken`). This turns a httpOnly cookie value into a value available to JavaScript, partially undermining the httpOnly protection.

### 2. CSRF Protection — B+

**Strengths:**
- Double-submit CSRF pattern implemented via `csrf-csrf` library (`server/middleware/csrf.ts`).
- CSRF cookie is httpOnly, secure, sameSite=lax.
- Bearer token requests are correctly exempted from CSRF validation since they are inherently immune (tokens are not auto-sent by browsers).
- State-changing cookie-based endpoints (logout, delete-account) correctly apply `csrfProtection` middleware.
- Clear architectural documentation in auth middleware comments explaining the CSRF design rationale.

**Weaknesses:**
- `CSRF_SECRET` falls back to `crypto.randomBytes(32)` if the environment variable is not set (`csrf.ts:5`). In production, this means CSRF tokens will be invalidated on every server restart, causing form submission failures for active users. There is no startup guard to prevent this.
- `X-CSRF-Token` is **not** included in the CORS `Access-Control-Allow-Headers` list (`index.ts:70`). Web clients making cross-origin requests will have the `X-CSRF-Token` header stripped by the browser's preflight check, breaking CSRF validation for web-based cookie auth flows.
- CSRF is disabled entirely in test environments (`csrf.ts:38-40`), which is reasonable but means CSRF protection is never tested automatically.

### 3. Encryption & Secret Management — A

**Strengths:**
- OAuth tokens (Google/Apple access tokens) encrypted at rest with AES-256-GCM (`server/lib/token-encryption.ts`).
- Encryption uses proper 12-byte random IV per operation, 16-byte authentication tag, preventing ciphertext tampering.
- Encrypted format is structured (`base64(iv):base64(ciphertext):base64(authTag)`) making it parseable and debuggable.
- Key validation ensures exactly 32 bytes (64 hex characters) at decrypt/encrypt time (`token-encryption.ts:17-24`).
- `decryptTokenOrNull` gracefully handles legacy unencrypted tokens by falling back to raw value on decryption failure, enabling smooth migration (`token-encryption.ts:73-77`).
- Sentry configured to strip `Authorization` and `Cookie` headers from error events before transmission (`server/lib/sentry.ts:19-23`).
- Error handler hides internal error messages in production, only exposing them in development mode (`errorHandler.ts:78,91`).

**Weaknesses:**
- `TOKEN_ENCRYPTION_KEY` validation only occurs on first use at runtime, not at server startup. A misconfigured key won't be caught until the first OAuth login attempt, potentially hours after deployment.
- No key rotation mechanism exists. Changing `TOKEN_ENCRYPTION_KEY` would render all existing encrypted OAuth tokens undecryptable.

### 4. Input Validation & Injection Prevention — A-

**Strengths:**
- All database queries use Drizzle ORM's parameterized query builder, eliminating SQL injection risk. No raw SQL string interpolation found in user-facing routes.
- Sync data validated against shared Zod schemas (`syncInventoryItemSchema`, `syncRecipeSchema`, etc.) before database writes (`server/routers/sync.router.ts`).
- Preferences validated with `syncPreferencesSchema.safeParse()` with structured error reporting (`account-settings.ts:184-226`).
- Request body size limited to 1 MB for JSON, 1 MB for URL-encoded, and 10 MB for file uploads with `abortOnLimit: true` (`index.ts:88-105`).
- Email validation uses a domain value object (`createEmail`) that normalizes and validates format (`AuthenticationService.ts:77-81`).
- External API input validated with Zod schema (`actionSchema`) in `external-api.router.ts:43-49`.

**Weaknesses:**
- No Content-Type validation on JSON endpoints. The server will attempt to parse any request body as JSON regardless of the `Content-Type` header, which could allow unexpected payloads to be processed.
- The `POST /api/auth/sync` endpoint (`account-settings.ts:150-439`) performs only partial validation. While preferences are Zod-validated, the inventory, recipes, meal plans, shopping list, and other sections use manual type coercion (`typeof item.quantity === "number" ? item.quantity : 1`) without Zod schema validation. Malformed data could pass through as coerced defaults.
- The sync import endpoint validates against schemas, but the older `POST /api/auth/sync` uses a different, less rigorous validation path for the same data shapes.

### 5. HTTP Security Headers & Transport — A

**Strengths:**
- Helmet middleware with comprehensive Content Security Policy (`index.ts:433-447`):
  - `script-src` uses per-request nonce-based allowlisting (16-byte random nonce).
  - `connect-src` restricted to self, Stripe API, and OpenAI API.
  - `frame-src` restricted to self and Stripe.
  - `font-src` restricted to Google Fonts.
  - `style-src` allows inline (necessary for many frameworks) plus Google Fonts.
- `crossOriginEmbedderPolicy: false` — correctly disabled for compatibility with Stripe/OpenAI iframes.
- Referrer policy set to `strict-origin-when-cross-origin`, balancing privacy and functionality.
- Response compression enabled with smart filtering: disabled for Stripe webhooks (which need raw body) and when client requests no compression (`index.ts:449-461`).
- Static assets served with `maxAge: "1y"` and `immutable: true` for proper cache headers.
- Landing page HTML served with `no-cache, no-store, must-revalidate` to prevent stale content.

**Weaknesses:**
- CSP `img-src` allows `https:` broadly, meaning images can be loaded from any HTTPS origin. This is common for apps with user-generated content but is more permissive than necessary.
- No `Strict-Transport-Security` (HSTS) header configured explicitly. Helmet may set a default, but it's not explicitly configured in the codebase.

### 6. CORS — A-

**Strengths:**
- CORS origin allowlist is explicit and dynamic based on Replit environment variables (`index.ts:36-79`).
- Production domains (`chefspaice.com`, `www.chefspaice.com`) are hardcoded in the allowlist.
- Localhost origins are only added in non-production environments.
- Credentials are allowed only when the origin matches the allowlist.
- Non-matching origins receive no CORS headers at all (silent rejection).

**Weaknesses:**
- `X-CSRF-Token` missing from `Access-Control-Allow-Headers` (repeated from CSRF section — this is the same root issue affecting both CORS and CSRF).
- The `X-Requested-With` header is allowed but appears unused in the codebase. Minor attack surface reduction opportunity.

### 7. Rate Limiting — B+

**Strengths:**
- Tiered rate limiting strategy (`server/middleware/rateLimiter.ts`):
  - Auth endpoints: 10 requests per 15 minutes.
  - AI endpoints: 30 requests per minute.
  - Password reset: 3 attempts per hour, keyed by email OR IP.
  - General API: 100 requests per minute (excludes auth/AI paths to avoid double-limiting).
- Standard rate limit headers returned (`RateLimit-*`).
- Rate limiting disabled in test environment to prevent test flakiness.

**Weaknesses:**
- All rate limiters use the default in-memory store. In a multi-instance deployment, each instance maintains its own counter, effectively multiplying the allowed rate by the number of instances.
- Password reset rate limiter keys by email first, IP second (`rateLimiter.ts:47`). An attacker who knows a target email can exhaust the rate limit for that email from any IP, potentially locking out the legitimate user from resetting their password.
- No rate limiting on social auth endpoints (`/api/auth/apple`, `/api/auth/google`). An attacker could repeatedly attempt token verification without throttling.
- No rate limiting on the sync endpoints, which perform heavy DB operations (delete + re-insert transactions). A compromised token could be used to overwhelm the database.

### 8. Authorization & Access Control — A

**Strengths:**
- Admin routes protected by `requireAdmin` middleware that verifies `user.isAdmin` flag (`server/middleware/requireAdmin.ts`).
- Test endpoints double-gated: `NODE_ENV !== 'production'` check AND `X-Test-Secret` header validation (`routes.ts:239-250`).
- Test endpoints return 404 in production (not 403), avoiding information disclosure about endpoint existence.
- Subscription tier enforcement on feature-gated endpoints (cookware limits, custom storage areas, pantry item limits).
- Session revocation enforces ownership: users can only revoke their own sessions (`AuthenticationService.ts:213-214`).
- Demo account protected from deletion with specific error messaging.
- Data export restricted to own user data via `requireAuth` middleware with `req.userId` scoping.

**Weaknesses:**
- The `requireAdmin` middleware performs two separate DB lookups (`getSessionByToken` then `getUserByToken`) when one query with a join would suffice. Not a security vulnerability but increases latency and DB load.

### 9. OAuth & Social Authentication — A-

**Strengths:**
- Google ID tokens verified via Google's `OAuth2Client.verifyIdToken()` with audience validation against all configured client IDs (web, iOS, Android) (`social-auth.router.ts:234-239`).
- Apple identity tokens verified via Apple's JWKS with `ignoreExpiration: false` and audience validation against bundle ID, service ID, and Expo Go ID (`social-auth.router.ts:465-508`).
- Apple web OAuth flow exchanges authorization code server-side with a generated client secret, never exposing the secret to the client.
- OAuth access tokens encrypted before storage using AES-256-GCM.
- Account linking by email: if a user signs in with Google/Apple and an account with that email exists, the provider is linked to the existing account rather than creating a duplicate.

**Weaknesses:**
- The Apple web auth flow accepts a `redirectUri` from the client request body (`social-auth.router.ts:55,421`). If the Apple token exchange doesn't strictly validate this against a server-side allowlist, a malicious client could potentially redirect the auth code to a different endpoint. Apple's server validates the redirect URI against the registered service, but the client-supplied value is used without server-side verification.
- Fallback email for users without an email from Apple/Google uses a synthetic pattern (`appleUserId@apple.privaterelay`, `googleUserId@google.privaterelay`). These are not real email domains and could conflict if the user later tries to register with a real email.

### 10. GDPR & Privacy — A

**Strengths:**
- IP address anonymization with three configurable modes via `IP_ANONYMIZATION_MODE` environment variable (`server/lib/auth-utils.ts:30-61`):
  - `truncate` (default): Stores only /24 subnet for IPv4, first 4 groups for IPv6.
  - `hash`: SHA-256 with configurable `IP_HASH_SALT`, truncated to 16 hex characters. Falls back to truncation if no salt configured.
  - `none`: Full IP (documented as not recommended for EU users).
- IP anonymization applied consistently at all session creation points (registration, login, social auth).
- Log output uses `anonymizeIpAddress()` for consistency (`auth.ts:76`).
- Session cleanup job nullifies IP addresses on sessions older than 30 days (`sessionCleanupJob.ts:13-19`).
- Account deletion cascades through all normalized data tables in a transaction.
- Data export endpoint allows users to retrieve all their data.

**Weaknesses:**
- The hash mode uses a simple `ip + salt` concatenation rather than HMAC. While SHA-256 is collision-resistant, HMAC provides better protection against length-extension attacks and is the recommended pattern for keyed hashing.

### 11. Error Handling & Information Disclosure — A-

**Strengths:**
- Structured `AppError` class with typed error codes prevents accidental information leakage (`errorHandler.ts`).
- Global error handler sends generic "Internal server error" message in production; detailed messages only in development.
- Each error includes a `requestId` for correlation without exposing internals.
- Unhandled rejections and uncaught exceptions are captured by Sentry with a graceful flush before exit.

**Weaknesses:**
- In development mode, the full error message (which may contain SQL details, file paths, or stack traces) is returned to the client (`errorHandler.ts:91`). This is intentional for development but should be verified that `NODE_ENV` is always set to `production` in deployed environments.

---

## Overall Strengths Summary

1. **Defense in depth**: Multiple layers — Helmet/CSP, CORS allowlist, rate limiting, authentication, authorization, CSRF, input validation.
2. **Tokens done right**: Session tokens generated with high entropy, hashed before storage, expired and cleaned up automatically.
3. **Encryption at rest**: OAuth tokens encrypted with AES-256-GCM with proper IV/auth-tag handling.
4. **GDPR compliance**: IP anonymization, data export, account deletion, session IP expiration.
5. **Social auth security**: Server-side token verification with audience validation for both Google and Apple.
6. **Error isolation**: Structured error handling prevents information leakage in production.
7. **Webhook integrity**: Stripe webhooks verified with raw body signature before processing.
8. **Operational security**: Sentry strips sensitive headers; test endpoints double-gated.

## Overall Weaknesses Summary

1. **CSRF_SECRET** falls back to random bytes if env var not set — tokens won't survive server restarts in production.
2. **X-CSRF-Token header** not included in CORS `Access-Control-Allow-Headers`.
3. **No account lockout** after failed login attempts (only IP-based rate limiting).
4. **No Content-Type validation** on JSON endpoints.
5. **TOKEN_ENCRYPTION_KEY** validation only happens at runtime, not at startup.
6. **Rate limiter state** is in-memory only, not shared across instances.
7. **No rate limiting** on social auth or sync endpoints.
8. **Sync endpoint validation** inconsistency: `POST /api/auth/sync` uses manual coercion while newer sync endpoints use Zod schemas.
9. **restore-session** endpoint returns raw cookie token in JSON, partially undermining httpOnly protection.

## Remediation Steps (Priority Order)

**Step 1 (Critical) — Ensure CSRF_SECRET is set in production**
```
In server/middleware/csrf.ts, add a startup check:
  if (process.env.NODE_ENV === "production" && !process.env.CSRF_SECRET) {
    throw new Error("CSRF_SECRET must be set in production");
  }
This prevents the server from starting with a random secret that invalidates
all CSRF tokens on every restart.
```

**Step 2 (High) — Add X-CSRF-Token to CORS allowed headers**
```
In server/index.ts line 70, change:
  "Content-Type, Authorization, Accept, X-Requested-With"
To:
  "Content-Type, Authorization, Accept, X-Requested-With, X-CSRF-Token"
Without this, browsers block the CSRF token header on cross-origin requests.
```

**Step 3 (High) — Stop returning raw cookie token in restore-session**
```
In server/routers/auth/login.ts, the /restore-session endpoint currently
returns `token: cookieToken` in the JSON response (line 162). This exposes the
httpOnly cookie value to JavaScript. Instead, issue a new Bearer token
separate from the cookie token, or omit the token field and let the client
rely solely on the cookie for session restoration.
```

**Step 4 (Medium) — Validate TOKEN_ENCRYPTION_KEY at startup**
```
In server/index.ts, before the server starts listening, add:
  const encKey = process.env.TOKEN_ENCRYPTION_KEY;
  if (encKey) {
    if (!/^[0-9a-fA-F]{64}$/.test(encKey)) {
      throw new Error("TOKEN_ENCRYPTION_KEY must be exactly 64 hex characters");
    }
  } else {
    logger.warn("TOKEN_ENCRYPTION_KEY not set — OAuth token encryption disabled");
  }
```

**Step 5 (Medium) — Add rate limiting to social auth endpoints**
```
In server/routes.ts, apply the authLimiter to social auth routes:
  app.use("/api/auth/apple", authLimiter);
  app.use("/api/auth/google", authLimiter);
This prevents brute-force token verification attempts.
```

**Step 6 (Medium) — Add per-account failed login tracking**
```
Add a failedLoginAttempts counter and lastFailedLoginAt timestamp to the users
table. Increment on failed login, reset on success. Lock the account
(temporary 15-minute lockout) after 5 consecutive failures. Return the same
"Invalid email or password" message to avoid user enumeration.
```

**Step 7 (Low) — Validate Content-Type on JSON endpoints**
```
Add a middleware early in the chain that rejects POST/PUT/PATCH requests
that have a body but don't set Content-Type to application/json:
  if (['POST','PUT','PATCH'].includes(req.method) && req.body &&
      !req.is('application/json')) {
    return res.status(415).json({ error: "Content-Type must be application/json" });
  }
Exclude the Stripe webhook route and file upload routes from this check.
```

**Step 8 (Low) — Use Zod validation consistently on sync endpoints**
```
The POST /api/auth/sync endpoint in account-settings.ts uses manual type
coercion for inventory, recipes, mealPlans, shoppingList, and other data
sections. Refactor to use the shared Zod schemas (syncInventoryItemSchema,
syncRecipeSchema, etc.) that are already used by the newer
/api/sync/* endpoints. This eliminates the validation inconsistency and
ensures malformed data is rejected rather than silently coerced.
```
