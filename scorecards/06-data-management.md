# Data Management — Grade: A

## 1. Database Schema Design — Grade: A

### Strengths
- **Fully normalized relational schema**: All 12 JSONB columns successfully migrated from `userSyncData` to dedicated normalized tables (`userInventoryItems`, `userSavedRecipes`, `userMealPlans`, `userShoppingItems`, `userCookwareItems`, `userWasteLogs`, `userConsumedLogs`, `userStorageLocations`, `userSyncKV`). The legacy table now only holds sync metadata.
- **Proper foreign key relationships**: Every user-facing table references `users.id` with `onDelete: "cascade"`, ensuring referential integrity and automatic cleanup.
- **Composite unique indexes**: Each sync table enforces `(userId, itemId)` uniqueness, preventing duplicate entries even under concurrent sync operations.
- **Purpose-specific indexes**: Category indexes (`userId, category`), expiration indexes (`userId, expirationDate`), date indexes (`userId, date`), and favorite indexes (`userId, isFavorite`) support the app's query patterns.
- **Cursor pagination indexes**: Composite indexes on `(userId, updatedAt, id)` on inventory, recipes, and shopping items directly support the cursor-based pagination queries.
- **Well-documented schema**: Every table and field has JSDoc comments explaining its purpose, valid values, and relationships.
- **Type safety pipeline**: Each table has `createInsertSchema` (via drizzle-zod), inferred insert types (`z.infer`), and select types (`$inferSelect`), creating a complete type chain from DB to API.
- **Extensible design**: `extraData` JSONB columns on recipes, meal plans, shopping items, and cookware allow forward-compatible schema evolution without migrations.
- **[REMEDIATED] CHECK constraints for enum-like fields**: Database-level CHECK constraints added via `migrations/0005_check_constraints.sql` for `subscription_status`, `cooking_skill_level`, `preferred_units`, and `subscription_tier`, providing a safety net against invalid data reaching the database even if application validation is bypassed.

### Remaining Considerations
- JSONB still used inside normalized tables (`nutrition`, `ingredients`, `instructions`, `meals`, `extraData`) — not queryable via indexes, but acceptable for flexibility.
- `users` table is wide (35+ columns); preference columns could be extracted to a `userPreferences` table.

---

## 2. Sync Engine Architecture — Grade: A-

### Strengths
- **Local-first with cloud sync**: The SyncManager in `client/lib/sync-manager.ts` queues all mutations locally (AsyncStorage) and syncs when connectivity is available. Users never lose work.
- **Queue coalescing**: Redundant operations on the same item are intelligently merged — a delete replaces any prior entry, an update on top of a create keeps the operation as create with updated data.
- **Conflict resolution with user choice**: When the server detects a stale update (client's `updatedAt` <= server's `updatedAt`), it returns the server version. The client presents "This Device" / "Other Device" choices.
- **Exponential backoff retry**: Failed sync items are retried with exponential backoff (1s, 2s, 4s, 8s, max 60s). After 5 retries or a 4xx error, items are marked fatal and surfaced to the user.
- **Queue capacity warning**: When the offline queue reaches 80% capacity, the user is warned to connect to the internet.
- **Network status monitoring**: Connectivity tracked via `useNetworkStatus` hook backed by `@react-native-community/netinfo`, enabling proactive connectivity detection and sync triggers on reconnection.
- **Health check polling**: A 60-second health check detects connectivity restoration and triggers automatic queue drain.
- **Cursor-based pagination**: GET endpoints use `(updatedAt, id)` composite cursors encoded as base64url JSON.
- **Upsert on create**: POST operations use `onConflictDoUpdate` to handle cases where a create arrives for an existing item.
- **Per-section timestamps**: `sectionUpdatedAt` tracks when each sync section was last modified, enabling incremental sync.

### Remaining Considerations
- Full sync overwrites local data. If the queue was not fully drained first, those local-only changes are lost.
- No transactional sync on import in replace mode — deletes and inserts are not wrapped in `db.transaction()`. If the server crashes mid-import, the user could end up with partial data.
- No timestamp comparison during merge-mode imports — older imported data can overwrite newer server data.
- No import size limits — no validation on how large the import payload can be.

---

## 3. Data Validation — Grade: A

### Strengths
- **Shared Zod schemas**: All sync data shapes are defined in `shared/schema.ts` with shared schemas (`syncInventoryItemSchema`, `syncRecipeSchema`, etc.) used by both client and server.
- **Request body validation**: Every sync endpoint validates incoming data with `safeParse()` before any database operation. Invalid requests receive detailed error messages.
- **Import pre-validation**: The `/api/sync/import` endpoint validates all arrays and JSONB sections against shared schemas before any writes. Up to 20 validation errors returned.
- **Schema composition**: Sync-helper schemas compose from insert schemas with `.omit()` and `.extend()`.
- **Passthrough for extensibility**: Recipe, mealPlan, shoppingList, and cookware schemas use `.passthrough()` so extra client fields are preserved.
- **Subscription limit enforcement**: Import respects pantry item and cookware limits, truncating imported data with warnings.
- **[REMEDIATED] Zod validation middleware**: Reusable `validateBody` middleware (`server/middleware/validateBody.ts`) applied across routes — voice, suggestions, donations, auth, push tokens — ensuring consistent 400 error responses.

### Remaining Considerations
- Loose JSONB section schemas (`syncPreferencesSchema`, `syncAnalyticsSchema`, etc.) are `z.record(z.unknown())` — any object passes validation.
- No max size validation on import arrays.

---

## 4. Data Portability & GDPR Compliance — Grade: A+

### Strengths
- **Comprehensive data export (GDPR Article 20)**: The `/api/user/data-export` endpoint exports all user data across 21 tables in a single JSON response. Explicitly tagged as "GDPR Article 20 - Right to Data Portability."
- **Sync-level export**: Separate `/api/sync/export` endpoint provides a downloadable backup file with versioned format (`version: 1`) and timestamped filename.
- **Full import with merge/replace modes**: Users can restore from backups with either "merge" or "replace" strategies.
- **Account deletion with complete cascade**: `AccountDeletionService.deleteAccount()` runs comprehensive cleanup in a single transaction — cancels Stripe subscription, deletes recipe images, clears cache, deletes from all 15+ tables.
- **IP address anonymization**: GDPR-compliant IP handling with configurable modes (truncate/hash/none). Session cleanup nullifies IPs after 30 days.
- **Token encryption at rest**: OAuth tokens encrypted with AES-256-GCM.
- **Privacy policy alignment**: Privacy policy promises 30-day deletion, code delivers immediate deletion.

### Remaining Considerations
- No export format versioning strategy beyond `version: 1`.

---

## 5. Database Operations & Connection Management — Grade: A-

### Strengths
- **Connection pool with health monitoring**: `server/db.ts` configures a pg Pool with `max: 20`, `idleTimeoutMillis: 30000`, `connectionTimeoutMillis: 5000`. Pool health checked every 30 seconds.
- **Pool capacity warnings**: Active connections exceeding 16 (of 20 max) triggers a warning with connection counts.
- **Pool stats API**: `getPoolStats()` exposes total, idle, waiting, max, and active connection counts.
- **Migration-based schema changes**: Uses `drizzle-kit generate` + `drizzle-kit migrate` with migration files in `./migrations/`, auto-applied on server startup. 5 migration files tracked.
- **Programmatic migration runner**: Migrations run before routes are registered using a separate `pg.Client` connection.
- **[REMEDIATED] Slow query logging**: Custom Drizzle ORM logger measures query execution time using `performance.now()`. Logs warnings for queries exceeding thresholds, including parameterized SQL and duration (`db.ts:18-35`).
- **[REMEDIATED] Statement timeout**: `statement_timeout: 30000` (30 seconds) configured on the connection pool, preventing runaway queries from holding connections indefinitely (`db.ts:53`).

### Remaining Considerations
- Pool health check doesn't expose metrics to an external monitoring system — only through server logs.
- No startup health check to fail fast if DATABASE_URL is unreachable (pg.Pool is lazy).

---

## 6. Background Jobs & Data Lifecycle — Grade: A-

### Strengths
- **PostgreSQL-backed job scheduler**: `server/jobs/jobScheduler.ts` uses a `cron_jobs` table with atomic claim-based execution (`UPDATE ... WHERE last_run_at < NOW() - interval ... RETURNING name`). Ensures exactly-once execution.
- **Job execution tracking**: Each job run records duration (`lastRunDurationMs`) and error details (`lastError`).
- **Instance-aware logging**: Each server instance generates a random ID for job execution tracing.
- **Session cleanup job**: Runs daily to clean expired sessions and nullify IPs older than 30 days.
- **Winback campaign system**: Weekly job finds canceled subscriptions 30+ days old, sends one-time winback offers with deduplication.
- **[REMEDIATED] Data retention job**: `server/jobs/dataRetentionJob.ts` runs periodically with configurable `RETENTION_MONTHS`. Archives and removes old waste/consumed log entries to prevent unbounded table growth while preserving historical trends (`dataRetentionJob.ts:153-169`).
- **[REMEDIATED] Soft-delete purge job**: `server/jobs/softDeleteCleanupJob.ts` permanently removes inventory items that have been soft-deleted beyond a retention period, preventing dead rows from accumulating indefinitely.
- **[REMEDIATED] Cache cleanup job**: `server/jobs/cacheCleanupJob.ts` uses `DatabaseCacheStore.deleteExpired()` to remove expired persistent cache entries daily.

### Remaining Considerations
- 30-second poll interval is coarse for time-sensitive jobs (acceptable for daily/weekly jobs).
- No job failure alerting — failures are logged but not escalated to external monitoring.

---

## 7. Disaster Recovery — Grade: A-

### Strengths
- **Comprehensive DR documentation**: `DISASTER_RECOVERY.md` covers automated backups, PITR, and multiple restore options.
- **Three restore paths documented**: Replit checkpoint rollback, Replit production database restore, and direct Neon Console access.
- **WAL-based continuous backup**: Neon's architecture provides continuous backup without configuration.
- **Backup branch safety net**: Before restore, Neon auto-creates a backup branch.
- **Plan-aware retention documentation**: Different retention windows by Neon plan tier.
- **`pg_dump` recommendation**: For retention beyond the Neon window.
- **Quarterly testing via branching**: Documents testing recovery using Neon's instant branching.

### Remaining Considerations
- No automated backup verification — quarterly testing is a manual process.
- No application-level backup for object storage (recipe images).

---

## 8. Data Integrity & Consistency — Grade: A-

### Strengths
- **Foreign key cascades throughout**: All user-owned tables use `onDelete: "cascade"`.
- **Unique constraints prevent duplicates**: Composite unique indexes on all sync tables.
- **Transactional account deletion**: All 15+ table deletions wrapped in `db.transaction()`.
- **Upsert semantics on sync**: `onConflictDoUpdate` handles duplicate creates.
- **Stale update detection**: Timestamp comparison detects and rejects stale updates.
- **Client-provided IDs preserved**: Item IDs maintained across sync with server-generated auto-incrementing `id` for internal use.
- **[REMEDIATED] CHECK constraints**: Database-level constraints on `subscription_status`, `cooking_skill_level`, `preferred_units`, and `subscription_tier` prevent invalid data at the DB layer.

### Remaining Considerations
- Import replace mode is not transactional (deletes and inserts in separate `Promise.all` batches).
- No optimistic locking for concurrent server-side mutations.

---

## Remediations Completed

| # | Remediation | Status |
|---|-------------|--------|
| 1 | Add CHECK constraints for enum-like fields | **Done** (migration 0005) |
| 2 | Add slow query logging | **Done** (performance.now timing) |
| 3 | Add statement timeout to connection pool | **Done** (30s) |
| 4 | Add data retention job for historical logs | **Done** (dataRetentionJob.ts) |
| 5 | Add soft-delete purge job for inventory | **Done** (softDeleteCleanupJob.ts) |
| 6 | Add cache cleanup job for persistent cache | **Done** (cacheCleanupJob.ts) |
| 7 | Add Zod validation middleware to remaining routes | **Done** (validateBody middleware) |

## Remaining Low-Priority Items

- ~~Wrap import replace mode in a transaction for atomicity.~~ **[REMEDIATED]** — Replace mode IS wrapped in `db.transaction(async (tx) => {...})` at `syncBackupService.ts:403`.
- Add timestamp comparison for merge-mode imports.
- Add import size limits to prevent memory exhaustion.
- Add object storage to disaster recovery plan.
- Stricter Zod schemas for KV sections (preferences, analytics, onboarding).
