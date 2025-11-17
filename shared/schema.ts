/**
 * Database Schema & TypeScript Types
 * 
 * This file now re-exports all schemas from domain-specific modules.
 * The original 11,000+ line schema has been split into 18 logical domains
 * for better maintainability and organization.
 * 
 * Domain Structure:
 * - auth.ts: Authentication & user management (3 tables)
 * - food.ts: Food inventory & recipes (10 tables)
 * - notifications.ts: Push notifications (5 tables)
 * - analytics.ts: Analytics & insights (11 tables)
 * - system.ts: System monitoring (5 tables)
 * - support.ts: Support & ticketing (5 tables)
 * - billing.ts: Billing & donations (1 table)
 * - ai-ml.ts: AI/ML features (14 tables)
 * - experiments.ts: A/B testing & cohorts (6 tables)
 * - content.ts: Content categorization (7 tables)
 * 
 * Additional domains are being migrated in phases.
 * See shared/schema/README.md for detailed documentation.
 * 
 * IMPORTANT: This maintains 100% backward compatibility.
 * All existing imports will continue to work unchanged.
 */

// Re-export everything from the schema index which aggregates all domains
export * from './schema/index';

// For backward compatibility, also export common JSON schemas
export * from './json-schemas';