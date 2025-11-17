# Database Migration Required

## Background
The schema refactoring from a monolithic 11k-line file to 18 domain modules is complete. However, the physical database tables need to be synchronized with the new schema structure.

## Required Database Changes

### 1. Missing Columns
The following columns are missing from the database and causing runtime errors:

#### fdc_cache table
- `search_query` column is missing
- `activity_type` column may be missing

### 2. Removed Tables
The following legacy tables should be dropped from the database as they've been replaced:
- `conversations` - Replaced by userChats system
- `messages` - Replaced by userChats system  
- `conversation_context` - Replaced by userChats system

### 3. Migration Steps

To sync the database with the new schema:

```bash
# Generate migration files based on schema changes
npx drizzle-kit generate:pg

# Review the generated SQL migrations
# Located in drizzle/ folder

# Apply migrations to development database
npx drizzle-kit push:pg

# Or manually run the migration SQL
```

### 4. Manual SQL Fixes (if needed)

If automatic migration fails, these manual fixes may help:

```sql
-- Add missing search_query column to fdc_cache
ALTER TABLE fdc_cache 
ADD COLUMN IF NOT EXISTS search_query VARCHAR(255);

-- Add missing activity_type column if needed
ALTER TABLE activity_logs 
ADD COLUMN IF NOT EXISTS activity_type VARCHAR(50);

-- Drop legacy tables (after backing up any needed data)
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversation_context CASCADE;
```

### 5. Verification

After migration:
1. Restart the application
2. Check that USDA cache operations work
3. Verify chat functionality uses userChats table
4. Confirm no more SQL column errors in logs

## Notes

- The code refactoring is complete and the app runs
- These database sync issues don't affect the schema refactoring completion
- This is a separate task from the code migration
- Always backup the database before running migrations