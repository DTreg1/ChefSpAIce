# Data Management — Detailed Scorecard

## Overall Grade: A-

---

## 1. Database Schema Design — Grade: A

### Strengths
- **Fully normalized relational schema**: All 12 JSONB columns successfully migrated from `userSyncData` to dedicated normalized tables (`userInventoryItems`, `userSavedRecipes`, `userMealPlans`, `userShoppingItems`, `userCookwareItems`, `userWasteLogs`, `userConsumedLogs`, `userCustomLocations`, `userSyncKV`). The legacy table now only holds sync metadata.
- **Proper foreign key relationships**: Every user-facing table references `users.id` with `onDelete: "cascade"`, ensuring referential integrity and automatic cleanup.
- **Composite unique indexes**: Each sync table enforces `(userId, itemId)` uniqueness, preventing duplicate entries even under concurrent sync operations.
- **Purpose-specific indexes**: Category indexes (`userId, category`), expiration indexes (`userId, expirationDate`), date indexes (`userId, date`), and favorite indexes (`userId, isFavorite`) support the app's query patterns.
- **Cursor pagination indexes**: Composite indexes on `(userId, updatedAt, id)` on inventory, recipes, and shopping items directly support the cursor-based pagination queries.
- **Well-documented schema**: Every table and field has JSDoc comments explaining its purpose, valid values, and relationships.
- **Type safety pipeline**: Each table has `createInsertSchema` (via drizzle-zod), inferred insert types (`z.infer`), and select types (`$inferSelect`), creating a complete type chain from DB to API.
- **Extensible design**: `extraData` JSONB columns on recipes, meal plans, shopping items, and cookware allow forward-compatible schema evolution without migrations. `userSyncKV` provides flexible key-value storage for preferences, analytics, onboarding, and profile data.

### Weaknesses
- **JSONB still used inside normalized tables**: `nutrition`, `ingredients`, `instructions`, `meals`, and `extraData` columns are JSONB. While acceptable for flexibility, these are not queryable via indexes and could become a bottleneck if the app ever needs to search/filter by ingredient or instruction content.
- **No CHECK constraints**: Fields like `subscriptionStatus`, `cookingSkillLevel`, `preferredUnits` rely on application-level validation only. Database-level CHECK constraints would provide a safety net against invalid data.
- **`users` table is wide**: 35+ columns on the users table. Preference columns (`dietaryRestrictions`, `allergens`, `favoriteCategories`, etc.) could be extracted to a `userPreferences` table to keep the core user record lean.

### Remediation
**Step 1 — Add CHECK constraints for enum-like fields**
```
Add database-level CHECK constraints for fields that have a fixed set of valid values.
For example, on users.subscriptionStatus add CHECK (subscription_status IN ('trialing', 'active', 'canceled', 'expired')).
Similarly for cooking_skill_level, preferred_units, and subscription_tier.
This can be done in a new migration file. These constraints serve as a last line of defense
against invalid data reaching the database, even if application validation is bypassed.
```

---

## 2. Sync Engine Architecture — Grade: A-

### Strengths
- **Local-first with cloud sync**: The SyncManager in `client/lib/sync-manager.ts` queues all mutations locally (AsyncStorage) and syncs when connectivity is available. Users never lose work.
- **Queue coalescing**: Redundant operations on the same item are intelligently merged — a delete replaces any prior entry, an update on top of a create keeps the operation as create with updated data. This reduces network requests significantly.
- **Conflict resolution with user choice**: When the server detects a stale update (client's `updatedAt` <= server's `updatedAt`), it returns the server version. The client presents "This Device" / "Other Device" choices, giving users control over conflict resolution.
- **Exponential backoff retry**: Failed sync items are retried with exponential backoff (1s, 2s, 4s, 8s, max 60s). After 5 retries or a 4xx error, items are marked fatal and surfaced to the user.
- **Queue capacity warning**: When the offline queue reaches 80% capacity, the user is warned to connect to the internet, preventing silent data loss from queue overflow.
- **Network status heuristic**: Connectivity is inferred from request success/failure patterns (3+ consecutive failures = offline, 1 success = online), avoiding unreliable `navigator.onLine` checks.
- **Health check polling**: A 60-second health check detects connectivity restoration and triggers automatic queue drain.
- **Cursor-based pagination**: GET endpoints use `(updatedAt, id)` composite cursors encoded as base64url JSON, with `limit + 1` fetch pattern for efficient `hasMore` detection.
- **Upsert on create**: POST operations use `onConflictDoUpdate` to handle cases where a create arrives for an existing item (e.g., retry after network timeout), preventing duplicate key errors.
- **Per-section timestamps**: `sectionUpdatedAt` tracks when each sync section was last modified, enabling incremental sync without full data comparison.

### Weaknesses
- **Full sync overwrites local data**: `fullSync()` replaces all local data with the server state. If the queue was not fully drained first (e.g., fatal items exist), those local-only changes are lost. The code documents this risk but doesn't protect against it.
- **No transactional sync on import in replace mode**: The import endpoint's replace mode deletes all existing data and then inserts new data using `Promise.all` on separate insert calls — these are not wrapped in a `db.transaction()`. If the server crashes mid-import, the user could end up with partial data.
- **No server-side merge conflict on import**: The merge-mode import uses `onConflictDoUpdate` which always overwrites existing data with the imported version. There's no timestamp comparison during merge imports, so older imported data can overwrite newer server data.
- **Sync failure tracking is in-memory**: `syncFailures` is a `Map` in `sync-helpers.ts` that stores failure records in server memory. These are lost on server restart, making the sync status endpoint's `failedOperations24h` unreliable across deployments.

### Remediation
**Step 1 — Wrap import replace mode in a transaction**
```
In server/routers/sync.router.ts, the replace-mode import at line ~390 should wrap
the delete-all + insert-all operations in a db.transaction(). Currently, the deletes
happen via Promise.all followed by inserts via Promise.all. If the process crashes
between the two phases, user data is gone. Wrapping in a transaction ensures atomicity:
either all data is replaced or none of it is.
```

**Step 2 — Add timestamp comparison for merge-mode imports**
```
In the merge-mode import path (line ~512 onwards), the upsert operations should
compare the imported item's updatedAt against the existing row's updatedAt. Only
overwrite if the imported data is newer. This prevents accidentally downgrading
data when importing an older backup file.
```

---

## 3. Data Validation — Grade: A

### Strengths
- **Shared Zod schemas**: All sync data shapes are defined in `shared/schema.ts` with shared schemas (`syncInventoryItemSchema`, `syncRecipeSchema`, etc.) used by both client and server, ensuring consistent validation.
- **Request body validation**: Every sync endpoint validates incoming data with `safeParse()` before any database operation. Invalid requests receive detailed error messages with field paths.
- **Import pre-validation**: The `/api/sync/import` endpoint validates all arrays (inventory, recipes, mealPlans, shoppingList, cookware) and all JSONB sections (wasteLog, consumedLog, preferences, analytics, onboarding, customLocations, userProfile) against shared schemas before any writes. Up to 20 validation errors are returned to help users identify issues.
- **Schema composition**: Sync-helper schemas compose from insert schemas with `.omit()` and `.extend()`, ensuring the API validation stays in sync with the database schema definition.
- **Passthrough for extensibility**: Recipe, mealPlan, shoppingList, and cookware schemas use `.passthrough()` so extra client fields are preserved (stored in `extraData`) rather than stripped, supporting forward compatibility.
- **Subscription limit enforcement**: Import respects pantry item and cookware limits, truncating imported data with warnings rather than silently dropping items or failing the entire import.

### Weaknesses
- **Loose JSONB section schemas**: `syncPreferencesSchema`, `syncAnalyticsSchema`, `syncOnboardingSchema`, `syncCustomLocationsSchema`, and `syncUserProfileSchema` are all defined as `z.record(z.unknown())` — essentially any object passes validation. These provide no structural guarantees.
- **No max size validation on import**: There's no limit on how large the import payload can be. A user could theoretically submit an import with millions of items, causing memory and CPU issues.

### Remediation
**Step 1 — Add stricter schemas for KV sections**
```
Define proper Zod schemas for preferences, analytics, onboarding, customLocations,
and userProfile sections in shared/schema.ts. Even if the schemas are partial (using
.passthrough()), they should validate known required fields. For example,
syncPreferencesSchema should validate that if a 'dietaryRestrictions' key exists,
its value is an array of strings. This prevents garbage data from accumulating
in the KV store over time.
```

**Step 2 — Add import size limits**
```
Add validation in the /api/sync/import endpoint to reject payloads where any
single array exceeds a reasonable maximum (e.g., 10,000 items). This prevents
memory exhaustion from oversized imports, whether malicious or accidental.
Also consider adding Express body-parser size limits specifically for the
import endpoint.
```

---

## 4. Data Portability & GDPR Compliance — Grade: A+

### Strengths
- **Comprehensive data export (GDPR Article 20)**: The `/api/user/data-export` endpoint exports all user data across 21 tables in a single JSON response, including profile, sync data, subscriptions, inventory, recipes, meal plans, shopping lists, cookware, waste logs, consumed logs, custom locations, KV data, referrals, cancellations, conversion events, feedback, nutrition corrections, appliances, auth providers, sessions, and notifications. Explicitly tagged as "GDPR Article 20 - Right to Data Portability."
- **Sync-level export**: Separate `/api/sync/export` endpoint provides a downloadable backup file with versioned format (`version: 1`) and timestamped filename (`chefspaice-backup-YYYY-MM-DD.json`), suitable for re-import.
- **Full import with merge/replace modes**: Users can restore from backups with either "merge" (upsert existing data) or "replace" (wipe and reload) strategies.
- **Account deletion with complete cascade**: `AccountDeletionService.deleteAccount()` runs a comprehensive cleanup in a single transaction:
  - Cancels Stripe subscription
  - Deletes recipe images from object storage
  - Clears session cache entries
  - Deletes from all 15+ tables within a transaction (notifications, conversion events, cancellation reasons, referrals, nutrition corrections, feedback, all sync tables, auth providers, appliances, subscriptions, sync data, sessions, users)
- **IP address anonymization**: GDPR-compliant IP handling with configurable modes (truncate/hash/none). Session cleanup nullifies IPs after 30 days.
- **Token encryption at rest**: OAuth tokens encrypted with AES-256-GCM.
- **Privacy policy alignment**: The privacy policy template promises 30-day deletion, and the code delivers immediate deletion.

### Weaknesses
- **No export format versioning strategy**: The export uses `version: 1` but there's no documented plan for how version 2 would handle backward compatibility during import.
- **No export rate limiting**: The data export endpoint is not rate-limited. A malicious user could repeatedly hit it to generate server load.

---

## 5. Database Operations & Connection Management — Grade: B+

### Strengths
- **Connection pool with health monitoring**: `server/db.ts` configures a pg Pool with `max: 20`, `idleTimeoutMillis: 30000`, `connectionTimeoutMillis: 5000`. Pool health is checked every 30 seconds with a `SELECT 1` query.
- **Pool capacity warnings**: When active connections exceed 16 (of 20 max), a warning is logged with connection counts and waiting request numbers.
- **Pool stats API**: `getPoolStats()` exposes total, idle, waiting, max, and active connection counts for monitoring.
- **Migration-based schema changes**: Uses `drizzle-kit generate` + `drizzle-kit migrate` with migration files in `./migrations/`, auto-applied on server startup via `server/migrate.ts`. 5 migration files tracked properly.
- **Programmatic migration runner**: Migrations run before routes are registered using a separate `pg.Client` connection (not the pool), ensuring the schema is ready before any request is handled.

### Weaknesses
- **No slow query logging**: There is zero query performance monitoring. The Drizzle ORM instance is created without a logger. Queries that take 5+ seconds would go completely unnoticed until users report slowness.
- **No query timeout**: Individual queries have no statement-level timeout configured. A complex query or a database lock could hold a connection indefinitely, eventually exhausting the pool.
- **Pool health check doesn't report metrics**: The health check logs warnings about approaching capacity but doesn't expose metrics to an external monitoring system (e.g., Prometheus, Datadog). The only visibility is through server logs.
- **No connection retry on pool initialization**: If `DATABASE_URL` is unreachable at startup, the pool creation succeeds (pg.Pool is lazy), but the first query will fail. There's no startup health check to fail fast.

### Remediation
**Step 1 — Add slow query logging**
```
In server/db.ts, create a custom Drizzle ORM logger that wraps the default logger.
Measure query execution time using performance.now() or Date.now(). Log a warning
for queries exceeding 500ms and an error for queries exceeding 2000ms. Include the
parameterized SQL (not the parameter values, to avoid logging PII) and the execution
duration. Example:

  const db = drizzle(pool, {
    schema,
    logger: {
      logQuery(query, params) {
        // track start time per query
      }
    }
  });

This is the single most impactful improvement for database operations visibility.
```

**Step 2 — Add statement timeout**
```
Add a statement_timeout to the pool configuration to prevent runaway queries:

  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: POOL_MAX,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    statement_timeout: 30000, // 30 seconds
  });

This ensures no single query can monopolize a connection for more than 30 seconds,
protecting the pool from exhaustion due to slow or hung queries.
```

---

## 6. Background Jobs & Data Lifecycle — Grade: B+

### Strengths
- **PostgreSQL-backed job scheduler**: `server/jobs/jobScheduler.ts` uses a `cron_jobs` table with atomic claim-based execution (UPDATE ... WHERE last_run_at < NOW() - interval ... RETURNING name). This ensures exactly-once execution even with multiple server instances.
- **Job execution tracking**: Each job run records duration (`lastRunDurationMs`) and error details (`lastError`), providing visibility into job health.
- **Instance-aware logging**: Each server instance generates a random ID and logs it with job execution, making it easy to trace which instance ran a job.
- **Session cleanup job**: Runs daily to clean expired sessions and nullify IPs older than 30 days.
- **Winback campaign system**: Weekly job finds canceled subscriptions 30+ days old, sends one-time winback offers with deduplication.

### Weaknesses
- **No data retention policy for waste/consumed logs**: `userWasteLogs` and `userConsumedLogs` grow unbounded. For active users logging food waste and consumption daily, these tables could accumulate thousands of rows per user per year with no archival or cleanup.
- **No purge job for soft-deleted inventory**: Inventory items support soft delete via `deletedAt` column, but there is no background job to permanently remove items that have been soft-deleted for a prolonged period. Soft-deleted rows accumulate indefinitely.
- **No job for cleaning stale sync metadata**: The `userSyncData` table accumulates metadata for all users, including deleted accounts (though cascade should handle this). There's no job to detect and clean orphaned sync records.
- **30-second poll interval is coarse**: The scheduler polls every 30 seconds. For time-sensitive jobs, this could add up to 30 seconds of delay. This is acceptable for daily/weekly jobs but would be problematic if shorter-interval jobs are added.
- **No job failure alerting**: Job failures are logged but not escalated. A repeatedly failing job would only be noticed if someone checks the logs or the `cron_jobs` table.

### Remediation
**Step 1 — Add data retention job for historical logs**
```
Create server/jobs/dataRetentionJob.ts. Register it in the job scheduler to run monthly.
For waste logs and consumed logs older than 12 months:
  1. Aggregate them into a monthly summary table (totals by category per month)
  2. Delete the individual rows after successful aggregation
  3. Log the number of rows archived and deleted

This prevents unbounded table growth while preserving historical trends.
Document the retention policy in the privacy policy and settings screen.
```

**Step 2 — Add soft-delete purge job for inventory**
```
Create a background job that permanently deletes inventory items where
deletedAt is older than 30 days. This aligns with the "30-day recently deleted"
feature in the UI and prevents soft-deleted rows from accumulating indefinitely.
Run weekly.
```

---

## 7. Disaster Recovery — Grade: A-

### Strengths
- **Comprehensive DR documentation**: `DISASTER_RECOVERY.md` covers automated backups, PITR (point-in-time recovery), and multiple restore options.
- **Three restore paths documented**: Replit checkpoint rollback (development), Replit production database restore, and direct Neon Console access.
- **WAL-based continuous backup**: Neon's architecture provides continuous backup without any configuration needed.
- **Backup branch safety net**: Before a restore, Neon auto-creates a backup branch, allowing the restore itself to be reverted.
- **Plan-aware retention documentation**: Clearly documents different retention windows by Neon plan tier (Free: 6 hours, Launch: 0-7 days, Scale/Enterprise: up to 30 days).
- **`pg_dump` recommendation**: For retention beyond the Neon window, manual `pg_dump` backups are recommended.
- **Quarterly testing via branching**: Documents testing recovery quarterly using Neon's instant branching (zero-copy clone, restore, validate, delete).

### Weaknesses
- **No automated backup verification**: The quarterly testing is documented as a manual process with no enforcement mechanism. There's no scheduled job or reminder to verify backups work.
- **No application-level backup**: Only database-level backup is covered. Object storage (recipe images) is not included in the DR plan. If object storage is lost, recipe images cannot be recovered from database backups alone.
- **No runbook for partial failures**: The DR plan covers full database restore but doesn't address scenarios like a single table corruption or a bad migration that only affects one table.

### Remediation
**Step 1 — Add object storage to DR plan**
```
Document a recovery procedure for Replit Object Storage (recipe images).
Options: periodic pg_dump that also exports a manifest of object storage keys,
or a separate backup job that copies recipe images to a secondary storage location.
At minimum, document that recipe images would need to be re-generated via AI
if object storage is lost.
```

---

## 8. Data Integrity & Consistency — Grade: A-

### Strengths
- **Foreign key cascades throughout**: All user-owned tables use `onDelete: "cascade"` on the `userId` foreign key, ensuring no orphaned records after user deletion.
- **Unique constraints prevent duplicates**: Composite unique indexes on `(userId, itemId)`, `(userId, entryId)`, `(userId, locationId)`, and `(userId, section)` prevent data duplication at the database level.
- **Transactional account deletion**: `AccountDeletionService.deleteAccount()` wraps all 15+ table deletions in a single `db.transaction()`, ensuring complete atomicity.
- **Upsert semantics on sync**: Create operations use `onConflictDoUpdate` to safely handle duplicate creates (retry scenarios), preventing unique constraint violations.
- **Stale update detection**: Update operations compare `updatedAt` timestamps to detect and reject stale updates, returning the server version for conflict resolution.
- **Client-provided IDs preserved**: Item IDs provided by the client are stored as `itemId`/`entryId`/`locationId`, maintaining identity across sync while keeping server-generated auto-incrementing `id` for internal use.

### Weaknesses
- **No optimistic locking for concurrent server-side mutations**: While client sync uses timestamp comparison, server-side operations (like chat-actions.ts INSERT operations for waste/consumed logs) don't use any concurrency control. Two concurrent requests could create duplicate entries if the unique constraint check is the only protection.
- **Import replace mode is not transactional**: As noted in Section 2, the replace-mode import runs deletes and inserts as separate `Promise.all` batches without a wrapping transaction.

---

## Summary of Top Priority Remediations

| Priority | Issue | Impact | Effort |
|----------|-------|--------|--------|
| 1 | Add slow query logging in `server/db.ts` | High — no visibility into query performance | Low |
| 2 | Wrap import replace mode in a transaction | High — risk of partial data loss | Low |
| 3 | Add data retention job for waste/consumed logs | Medium — unbounded table growth | Medium |
| 4 | Add soft-delete purge job for inventory | Medium — accumulating dead rows | Low |
| 5 | Add statement timeout to connection pool | Medium — protection from runaway queries | Low |
| 6 | Add stricter Zod schemas for KV sections | Low — garbage data risk | Medium |
| 7 | Add object storage to disaster recovery plan | Low — documentation gap | Low |
| 8 | Add import size limits | Low — DoS risk on import endpoint | Low |
