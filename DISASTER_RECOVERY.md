# ChefSpAIce - Disaster Recovery Plan

## Database: Neon PostgreSQL

This document covers backup, restore, and disaster recovery procedures for the ChefSpAIce PostgreSQL database hosted on Neon via Replit.

---

## 1. Automated Backup Schedule

Neon handles backups natively through its Write-Ahead Log (WAL) architecture. No manual backup configuration is required.

### How It Works

- Neon's storage engine continuously ingests PostgreSQL WAL records and maintains a complete, append-only history of all changes (data and schema).
- This happens automatically for every write operation, there is nothing to enable or configure.
- The retention window (how far back you can restore) depends on the Neon plan:
  - **Free plan**: Up to 6 hours of restore history or 1 GB of changed data (whichever limit is reached first).
  - **Launch plan**: 0-7 days (configurable, storage cost of ~$0.20/GB-month for retained changes).
  - **Scale/Enterprise plan**: Up to 30 days.
- Backups cover all databases on a branch, including all tables, indexes, schema definitions, and data.

### What Is Covered

- All normalized tables: `userInventoryItems`, `userSavedRecipes`, `userMealPlans`, `userShoppingItems`, `userCookwareItems`, `userWasteLogs`, `userConsumedLogs`, `userStorageLocations`, `userSyncKV`
- Auth tables: `users`, `userSessions`, `auth_providers`
- Subscription tables: `subscriptions`, `winback_campaigns`
- Sync metadata: `userSyncData`
- Migration tracking: `drizzle.__drizzle_migrations`

---

## 2. Point-in-Time Recovery (PITR)

Neon supports restoring a database branch to any point within the retention window, down to the millisecond.

### When to Use PITR

- Accidental data deletion (e.g., a bad DELETE or TRUNCATE statement)
- Corrupt data from a bug in application code
- Schema migration gone wrong
- Any situation where you need the database as it was at a specific moment

### Key Concepts

- **Branch**: Neon databases live on branches. The default branch is your primary database.
- **Restore is a full overwrite**: Restoring replaces the entire branch state (all tables, all data, all schema) with the state at the target timestamp. It does not merge.
- **All databases on the branch are affected**: You cannot restore a single table; the entire branch is restored.
- **Backup branch is created automatically**: Before a restore, Neon creates a backup branch (named `branch_name_old_<timestamp>`) so you can revert the restore if needed.

---

## 3. How to Restore from a Specific Timestamp

### Option A: Replit Checkpoint Rollback (Development Database)

Replit creates automatic checkpoints as you work. To restore the development database:

1. Open the Replit workspace for ChefSpAIce.
2. Open the **Version History** or **Checkpoints** panel.
3. Browse the list of checkpoints and select the one closest to your desired restore point.
4. Click **Restore** to roll back both code and the development database to that checkpoint.
5. Restart the application workflow after the rollback completes.

**Note**: This restores code AND the development database together. It does not affect the production database.

### Option B: Replit Production Database Restore

For the production database:

1. Go to the **Deployments** section of your Replit project.
2. Navigate to the **Production Database** settings.
3. Use the **Point-in-Time Restore** feature to select a specific timestamp.
4. Confirm the restore. The production database will be reverted to its state at that timestamp.
5. **Important**: This only restores the database, not the application code. If the code also needs to be reverted, use the checkpoint rollback feature and then republish the app.

### Option C: Neon Console (Direct Access)

If you have direct access to the Neon console:

1. Log in to the Neon Console at [console.neon.tech](https://console.neon.tech).
2. Navigate to **Backup & Restore** for your project.
3. Select the target branch (usually `main`).
4. Choose a restore method:
   - **Timestamp**: Enter a specific date and time (UTC).
   - **LSN (Log Sequence Number)**: Enter a specific WAL position if you know it.
5. (Optional) Use **Time Travel Assist** to connect to a read-only view of the database at your chosen point. Run SELECT queries to verify this is the right moment before committing to the restore.
6. Click **Restore**. This typically completes in seconds.
7. The application will experience a brief connectivity loss as the compute restarts.

### Option D: Manual pg_dump Backups (For Long-Term Retention)

For backups beyond the Neon retention window, or for compliance purposes:

```bash
# Create a full backup
pg_dump "$DATABASE_URL" --format=custom --file=backup_$(date +%Y%m%d_%H%M%S).dump

# Restore from a pg_dump backup
pg_restore --dbname="$DATABASE_URL" --clean --if-exists backup_20260211_143000.dump
```

**Recommended schedule for manual backups**:
- Before any schema migration (`npm run db:generate` / `npm run db:push`)
- Before bulk data operations
- Weekly, if data retention requirements exceed the Neon plan's PITR window

---

## 4. Testing the Recovery Process

Regular testing ensures the recovery process works when it matters. Follow this procedure quarterly or before major releases.

### Step 1: Create a Test Branch

Use Neon's instant branching to test recovery without affecting production:

1. In the Neon Console, create a new branch from the current production branch.
2. This branch is a zero-copy logical clone; it does not duplicate data.
3. Note the connection string for the test branch.

### Step 2: Simulate a Disaster

On the test branch only:

```sql
-- Record the current time before making destructive changes
SELECT NOW();
-- Example: 2026-02-11 14:30:00+00

-- Simulate accidental data loss
DELETE FROM user_inventory_items WHERE user_id = 'test-user-id';
-- Or: DROP TABLE user_inventory_items;
```

### Step 3: Perform PITR on the Test Branch

1. In the Neon Console, go to **Backup & Restore**.
2. Select the test branch.
3. Restore to the timestamp you recorded before the destructive operation.
4. Verify the restore completed successfully.

### Step 4: Validate Data Integrity

Connect to the restored test branch and verify:

```sql
-- Check that deleted data is restored
SELECT COUNT(*) FROM user_inventory_items WHERE user_id = 'test-user-id';

-- Verify schema is intact
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Verify migration state
SELECT * FROM drizzle.__drizzle_migrations ORDER BY created_at DESC LIMIT 5;

-- Spot-check critical tables
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM subscriptions WHERE status = 'active';
SELECT COUNT(*) FROM user_saved_recipes;
```

### Step 5: Test Application Connectivity

1. Set the `DATABASE_URL` environment variable to the test branch connection string.
2. Start the application and verify:
   - The server starts without migration errors.
   - API endpoints return expected data.
   - Authentication works (sessions may be invalidated, which is expected).
3. Revert `DATABASE_URL` back to the production connection string when done.

### Step 6: Clean Up

Delete the test branch from the Neon Console to avoid unnecessary storage costs.

### Step 7: Document Results

Record the test results with:
- Date of test
- Restore target timestamp
- Time to complete restore
- Any issues encountered
- Whether data integrity checks passed

---

## 5. Recovery Playbook: Quick Reference

| Scenario | Action | Estimated Recovery Time |
|---|---|---|
| Bad data in development DB | Replit checkpoint rollback | < 1 minute |
| Bad data in production DB | Replit production PITR or Neon Console restore | Seconds to minutes |
| Schema migration failure | Restore to pre-migration timestamp, fix migration, re-apply | Minutes |
| Full database corruption | Neon PITR to last known good timestamp | Seconds |
| Need data from > retention window | Restore from pg_dump backup | Minutes to hours (depends on size) |
| Verify data at a specific time | Neon Time Travel Assist (read-only) | Instant |

---

## 6. Important Considerations

- **Drizzle migrations after restore**: If you restore to a point before a migration was applied, the migration tracking table (`drizzle.__drizzle_migrations`) will also be restored. On the next server start, `server/migrate.ts` will automatically re-apply any missing migrations. Ensure the migration SQL files in `./migrations/` are still present in your codebase.
- **Encrypted tokens**: OAuth tokens in `auth_providers` are encrypted with AES-256-GCM. The `TOKEN_ENCRYPTION_KEY` secret must remain the same after restore, or previously encrypted tokens will be unreadable.
- **Active sessions**: Restoring to an earlier point may invalidate sessions created after the restore target. Users may need to log in again.
- **Stripe webhook idempotency**: If restoring to before certain Stripe webhook events were processed, ensure webhook handlers are idempotent (they already are via upsert patterns) to prevent duplicate processing.
- **Object Storage is separate**: Replit Object Storage is not affected by database restores. Files stored there remain intact regardless of database state.

---

## 7. Contacts and Escalation

- **Replit Support**: For issues with the Replit-managed database infrastructure or checkpoint rollbacks.
- **Neon Documentation**: [neon.com/docs/manage/backups](https://neon.com/docs/manage/backups)
- **Neon Instant Restore Guide**: [neon.com/docs/introduction/branch-restore](https://neon.com/docs/introduction/branch-restore)
