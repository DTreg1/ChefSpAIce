# Schema Migration Guide

## Safe Migration from Monolithic schema.ts to Domain-Driven Architecture

This guide provides a systematic approach to migrating the original 11,000+ line schema.ts file to the new domain-driven modular structure with 18 specialized schema files.

---

## Migration Status

### ✅ Completed Domains (18 files, 97 tables total)
- **auth.ts** - Authentication & users (3 tables)
- **food.ts** - Food inventory & recipes (10 tables)
- **notifications.ts** - Push notifications (5 tables)
- **analytics.ts** - Analytics & insights (11 tables)
- **system.ts** - System monitoring (5 tables)
- **support.ts** - Support & ticketing (5 tables)
- **billing.ts** - Billing & donations (1 table)
- **ai-ml.ts** - AI/ML features (11 tables) *[3 legacy tables removed]*
- **images.ts** - Image processing & OCR (6 tables)
- **sentiment.ts** - Sentiment analysis (5 tables)
- **transcription.ts** - Transcription services (2 tables)
- **extraction.ts** - Data extraction (2 tables)
- **forms.ts** - Form handling (7 tables)
- **scheduling.ts** - Meeting scheduling (4 tables)
- **security.ts** - Moderation & fraud (8 tables)
- **pricing.ts** - Dynamic pricing (3 tables)
- **experiments.ts** - A/B testing (6 tables)
- **content.ts** - Content categorization (7 tables)

### ❌ Removed Legacy Tables (4 tables)
- `conversations` - Replaced by userChats in food.ts
- `messages` - Replaced by userChats in food.ts
- `conversationContext` - Replaced by userChats in food.ts
- `voiceCommands` - Kept (not legacy, useful for voice features)

---

## Migration Process for Each Domain

### Step 1: Identify Tables for Domain
```bash
# Find all tables in the backup that match a domain pattern
grep "export const .* = pgTable" shared/schema.ts.backup | grep -i "sentiment\|emotion\|mood"
```

### Step 2: Extract Table Definition
```bash
# Get complete table definition with indexes (usually 30-50 lines)
grep "export const sentimentMetrics = pgTable" shared/schema.ts.backup -A 40
```

### Step 3: Create Domain File Template
```typescript
/**
 * [Domain Name] Domain
 * 
 * [Brief description of what this domain handles]
 */

import { pgTable, text, varchar, integer, timestamp, boolean, index, jsonb, serial, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { users } from "./auth"; // If foreign keys to users table

// ==================== TypeScript Interfaces ====================
// Define interfaces for complex JSONB columns

// ==================== Table Definitions ====================
// Copy table definitions from backup

// ==================== Zod Schemas & Type Exports ====================
// Create validation schemas and type exports
```

### Step 4: Handle Dependencies
1. **Foreign Keys**: Import referenced tables from their domains
   ```typescript
   import { users } from "./auth";
   import { recipes } from "./food";
   ```

2. **Shared Types**: Create unique names to avoid conflicts
   ```typescript
   // Instead of generic "statusSchema"
   export const sentimentStatusSchema = z.enum([...]);
   export const securityStatusSchema = z.enum([...]);
   ```

3. **Circular Dependencies**: Use table references carefully
   ```typescript
   // Avoid self-referencing foreign keys in the same line
   parentId: integer("parent_id"), // Add reference later if needed
   ```

### Step 5: Add Validation Schemas
```typescript
// For each table, create:
// 1. Insert schema
export const insertTableNameSchema = createInsertSchema(tableName)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    // Add custom validation
    status: statusSchema.default('active'),
    score: z.number().min(0).max(100),
  });

// 2. Type exports
export type InsertTableName = z.infer<typeof insertTableNameSchema>;
export type TableName = typeof tableName.$inferSelect;
```

### Step 6: Update Index Exports
```typescript
// In shared/schema/index.ts
export * from './new-domain';
```

### Step 7: Test Migration
```bash
# Restart the application to test imports
npm run dev

# Check for TypeScript errors
npx tsc --noEmit
```

---

## Common Migration Patterns

### Pattern 1: Tables with User Foreign Keys
```typescript
export const tableName = pgTable("table_name", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  // ... other fields
}, (table) => [
  index("table_name_user_id_idx").on(table.userId),
]);
```

### Pattern 2: Tables with JSONB Metadata
```typescript
// Define interface first
export interface TableMetadata {
  field1?: string;
  field2?: number;
  nested?: {
    subfield: string;
  };
}

// Use in table definition
metadata: jsonb("metadata").$type<TableMetadata>().default({}),
```

### Pattern 3: Tables with Enums
```typescript
// Define enum schema
export const statusEnum = z.enum(['active', 'pending', 'completed', 'failed']);

// Use in insert schema
.extend({
  status: statusEnum.default('pending'),
})
```

### Pattern 4: Cross-Domain References
```typescript
// In domain-a.ts
import { tableFromDomainB } from "./domain-b";

// Reference in foreign key
relatedId: varchar("related_id").references(() => tableFromDomainB.id),
```

---

## Validation Checklist

### Before Migration
- [ ] Backup original schema.ts file
- [ ] Document all table relationships
- [ ] Identify circular dependencies
- [ ] Plan domain boundaries

### During Migration
- [ ] All tables from backup are accounted for
- [ ] No duplicate table names across domains
- [ ] All foreign key imports resolved
- [ ] Naming conflicts resolved (unique enum names)
- [ ] All indexes preserved
- [ ] JSONB type interfaces defined
- [ ] Zod schemas created for validation
- [ ] Type exports added

### After Migration
- [ ] Application starts without errors
- [ ] TypeScript compilation succeeds
- [ ] All imports resolve correctly
- [ ] Database operations work as expected
- [ ] No runtime errors in storage.ts
- [ ] Routes continue to function

---

## Troubleshooting

### Error: Module not found
**Solution**: Ensure domain file is exported in `schema/index.ts`

### Error: Duplicate export names
**Solution**: Rename schemas to be domain-specific (e.g., `sentimentStatusSchema` instead of `statusSchema`)

### Error: Circular dependency
**Solution**: Remove self-referencing foreign keys or use forward references

### Error: Missing type definitions
**Solution**: Import necessary types from other domains or create interfaces

### Error: Storage.ts import errors
**Solution**: Ensure all exported names match what storage.ts expects

---

## Benefits of Migration

1. **Better Organization**: Related tables grouped logically
2. **Improved Maintainability**: Smaller, focused files easier to edit
3. **Clearer Dependencies**: Explicit imports show relationships
4. **Type Safety**: Stricter validation with domain-specific schemas
5. **Performance**: Faster IDE operations on smaller files
6. **Team Collaboration**: Multiple developers can work on different domains
7. **Testing**: Easier to test individual domains
8. **Documentation**: Each domain self-documents its purpose

---

## Next Steps

1. **Review Legacy Tables**: Confirm removal of deprecated tables
2. **Optimize Indexes**: Review index usage and add/remove as needed
3. **Add Documentation**: Enhance JSDoc comments for complex tables
4. **Create Migrations**: Generate Drizzle migrations for schema changes
5. **Update Storage Layer**: Ensure storage.ts uses new domain structure
6. **Performance Testing**: Verify query performance with new structure

---

## Domain Ownership

Assign team members to own specific domains:

| Domain | Owner | Description |
|--------|-------|-------------|
| auth | Security Team | Authentication & user management |
| food | Product Team | Core food inventory features |
| notifications | Platform Team | Push notification system |
| analytics | Data Team | Analytics & insights |
| ai-ml | AI Team | Machine learning features |
| billing | Finance Team | Payments & donations |
| ... | ... | ... |

This ensures clear responsibility and expertise for each domain.