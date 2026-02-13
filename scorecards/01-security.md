# Security — Grade: A-

## Strengths
- Helmet middleware with comprehensive CSP (nonce-based script-src)
- CSRF double-submit protection via csrf-csrf library
- Bearer token authentication with hashed session tokens (SHA-256)
- AES-256-GCM token encryption for OAuth tokens at rest
- GDPR-compliant IP anonymization (truncate/hash/none modes)
- IP anonymization in logs for consistency
- Session user-agent mismatch detection with security notifications
- Rate limiting: auth (10/15min), AI (30/min), general (100/min), password reset (3/hr)
- Stripe webhook signature verification with raw body
- Sentry strips Authorization and Cookie headers before sending
- Admin routes behind requireAdmin middleware
- Test endpoints gated by NODE_ENV and X-Test-Secret header
- Password hashing with bcrypt (12 rounds)
- Session expiration and cleanup job
- File upload size limits (10MB), JSON body limit (1MB)
- CORS with explicit origin allowlist

## Weaknesses
- CSRF_SECRET falls back to random bytes if env var not set — tokens won't survive server restarts in production
- X-CSRF-Token header not included in CORS `Access-Control-Allow-Headers`
- No Content-Type validation on JSON endpoints
- No account lockout after failed login attempts (only rate limiting)
- Token encryption key validation only happens at runtime, not at startup

## Remediation Steps

**Step 1 — Ensure CSRF_SECRET is set in production**
```
In server/middleware/csrf.ts, add a startup check: if NODE_ENV is "production" and CSRF_SECRET is not set, log a critical error and throw an Error("CSRF_SECRET must be set in production"). This prevents the server from starting with a random secret that would invalidate all CSRF tokens on restart.
```

**Step 2 — Add X-CSRF-Token to CORS allowed headers**
```
In server/index.ts in the setupCors function, add "X-CSRF-Token" to the Access-Control-Allow-Headers line so the browser allows the client to send CSRF tokens in cross-origin requests: res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept, X-Requested-With, X-CSRF-Token");
```

**Step 3 — Validate TOKEN_ENCRYPTION_KEY at startup**
```
In server/index.ts, before the server starts listening, add a check: if TOKEN_ENCRYPTION_KEY is set, validate it is exactly 64 hex characters. If it's set but invalid, throw an error. If it's not set, log a warning that OAuth token encryption is disabled. This catches configuration errors before they cause runtime failures.
```
