/**
 * =============================================================================
 * STORAGE
 * =============================================================================
 *
 * All data access is handled directly via Drizzle ORM queries in route handlers
 * and service modules. See server/db.ts for the database connection and
 * shared/schema.ts for the data models.
 *
 * If a repository/storage abstraction is needed in the future (e.g. for unit
 * testing with mocks or swapping storage backends), add it here and update
 * route handlers to depend on the abstraction instead of importing db directly.
 *
 * @module server/storage
 */
