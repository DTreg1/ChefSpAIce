# Shared Schema Documentation

## Overview

The shared schema directory contains the complete database schema and TypeScript type definitions for the application. It uses **Drizzle ORM** with PostgreSQL to provide type-safe database operations and automatic validation with Zod schemas.

## Architecture

```
shared/
├── schema.ts          # Main export file (backward compatibility)
└── schema/            # Domain-specific schema modules
    ├── index.ts       # Central aggregation of all domains
    ├── auth.ts        # Authentication & user management
    ├── food.ts        # Food inventory & recipes
    ├── ai-ml.ts       # AI/ML features
    ├── analytics.ts   # Analytics & insights
    └── ... (18 total domain modules)
```

## Domain Structure

The schema is organized into **18 logical domains** containing **104 tables** total:

### Core Domains

#### 🔐 **Authentication & Users** (`auth.ts`)
- **3 tables**: users, sessions, oauthProviders
- User profiles, preferences, dietary restrictions
- Session management for authentication
- OAuth provider linking

#### 🍳 **Food Management** (`food.ts`)
- **10 tables**: userInventory, userRecipes, mealPlans, shoppingLists, etc.
- Food inventory tracking with expiration dates
- Recipe management and sharing
- Meal planning and shopping lists
- Kitchen appliance library
- USDA nutrition data integration

#### 📱 **Notifications** (`notifications.ts`)
- **5 tables**: pushTokens, notificationHistory, scheduledNotifications, etc.
- Push notification management
- Notification scheduling and history
- Device token management
- Engagement tracking

### AI/ML Domains

#### 🤖 **AI/ML Features** (`ai-ml.ts`)
- **14 tables**: voiceCommands, writingSessions, summarizations, etc.
- Voice command processing
- Content generation and summarization
- Writing assistance
- Translation services
- Natural language processing

#### 🖼️ **Image Processing** (`images.ts`)
- **7 tables**: userImages, imageAnalysis, altTextGenerations, etc.
- Image storage and analysis
- Alt text generation
- Face detection results
- OCR text extraction

#### 💭 **Sentiment Analysis** (`sentiment.ts`)
- **5 tables**: sentimentAnalysis, sentimentTimeline, etc.
- Sentiment tracking over time
- Emotion detection
- Text analysis results

### Analytics & Monitoring

#### 📊 **Analytics** (`analytics.ts`)
- **11 tables**: userAnalytics, activityLogs, trends, insights, etc.
- User activity tracking
- Performance metrics
- Trend analysis
- Predictive insights

#### 🛠️ **System Monitoring** (`system.ts`)
- **5 tables**: systemHealth, performanceMetrics, errorLogs, etc.
- System health monitoring
- Performance tracking
- Error logging
- Resource usage

### Content & Collaboration

#### 💬 **Chat System** (`chat.ts`)
- **4 tables**: userChats, chatMessages, messageHistory, etc.
- Real-time chat functionality
- Message history and context
- AI-powered chat responses

#### 📝 **Content Management** (`content.ts`)
- **7 tables**: contentCategories, recommendations, duplicates, etc.
- Content categorization
- Recommendation engine
- Duplicate detection
- Natural language queries

#### 📅 **Scheduling** (`scheduling.ts`)
- **4 tables**: schedulingPreferences, meetingSuggestions, etc.
- Meeting scheduling
- Calendar integration
- Availability management

### Advanced Features

#### 🧪 **Experiments** (`experiments.ts`)
- **6 tables**: abTests, cohorts, experimentResults, etc.
- A/B testing framework
- User cohort management
- Experiment analytics

#### 🔒 **Security** (`security.ts`)
- **8 tables**: moderationResults, fraudDetection, validationRules, etc.
- Content moderation
- Fraud detection
- Security validation rules
- Access control

#### 💰 **Pricing & Billing** (`pricing.ts`, `billing.ts`)
- **4 tables**: pricingHistory, priceAlerts, donations, etc.
- Price tracking and alerts
- Billing management
- Donation handling

## Key Technologies

### Drizzle ORM
- Type-safe SQL query builder
- Schema-first approach
- PostgreSQL dialect
- Automatic migrations

### Zod Validation
- Runtime type validation
- Automatic schema generation from Drizzle tables
- Insert/update schemas for each table
- Type inference for TypeScript

### PostgreSQL Features
- JSONB columns for flexible data
- Full-text search indexes
- Foreign key constraints
- Unique constraints
- Performance indexes

## Usage Patterns

### Importing Schemas

```typescript
// Import everything (maintains backward compatibility)
import * from "@shared/schema";

// Import specific domains
import { users, userInventory, userRecipes } from "@shared/schema";

// Import domain-specific modules directly
import { users } from "@shared/schema/auth";
import { userInventory } from "@shared/schema/food";
```

### TypeScript Types

Each table automatically generates TypeScript types:

```typescript
// Select type (for queries)
type User = typeof users.$inferSelect;

// Insert type (for creating records)
type InsertUser = typeof users.$inferInsert;

// Using Zod schemas
const insertUserSchema = createInsertSchema(users);
type InsertUserZod = z.infer<typeof insertUserSchema>;
```

### Common Patterns

#### Table Definition
```typescript
export const tableName = pgTable(
  "table_name",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
    // ... other columns
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    // Indexes for performance
    index("table_name_user_id_idx").on(table.userId),
    // Unique constraints
    uniqueIndex("table_name_unique_idx").on(table.userId, table.name),
  ]
);
```

#### Schema Export Pattern
```typescript
// Create insert schema with Zod
export const insertTableNameSchema = createInsertSchema(tableName);

// Generate TypeScript type
export type InsertTableName = z.infer<typeof insertTableNameSchema>;

// Select type
export type TableName = typeof tableName.$inferSelect;
```

## Domain Dependencies

Some domains reference tables from other domains:

- Most tables reference `users` from `auth.ts`
- Recipe-related tables reference `userRecipes` from `food.ts`
- Analytics tables may reference entities from multiple domains
- Chat messages reference user profiles

## JSONB Columns

Many tables use JSONB columns for flexible data storage:

- **metadata**: General-purpose metadata storage
- **preferences**: User or feature preferences
- **settings**: Configuration settings
- **context**: Contextual information for AI features
- **result**: API response storage

## Indexes and Performance

Each table includes appropriate indexes for:

- **Foreign keys**: User ID lookups
- **Timestamps**: Date range queries
- **Status fields**: Filtering by state
- **Search fields**: Text search optimization
- **Unique constraints**: Data integrity

## Migration Strategy

The schema has been refactored from a monolithic 11,000+ line file into domain modules:

1. **Phase 1**: Split into logical domains (completed)
2. **Phase 2**: Maintain backward compatibility (current)
3. **Phase 3**: Optimize cross-domain references (planned)

### Backward Compatibility

- All exports from the original `schema.ts` are maintained
- Existing imports continue to work unchanged
- New code should import from domain modules for clarity

## Best Practices

1. **Use Domain Imports**: Import from specific domain modules when possible
2. **Type Safety**: Always use generated TypeScript types
3. **Validation**: Use Zod schemas for runtime validation
4. **Indexes**: Add indexes for frequently queried columns
5. **Soft Deletes**: Consider using `deletedAt` timestamps instead of hard deletes
6. **Audit Fields**: Include `createdAt` and `updatedAt` on all tables
7. **UUIDs**: Use UUIDs for primary keys for better distribution

## Common Interfaces

### User Context
Most tables include a `userId` field referencing the authenticated user:
```typescript
userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" })
```

### Timestamps
Standard timestamp fields across all tables:
```typescript
createdAt: timestamp("created_at").defaultNow(),
updatedAt: timestamp("updated_at").defaultNow(),
deletedAt: timestamp("deleted_at"), // For soft deletes
```

### Status Enums
Common status patterns:
```typescript
status: text("status", { 
  enum: ["pending", "processing", "completed", "failed"] 
})
```

## Security Considerations

1. **Foreign Key Constraints**: Cascade deletes to maintain referential integrity
2. **User Isolation**: Most queries filtered by userId for multi-tenancy
3. **Sensitive Data**: Use separate tables for PII with restricted access
4. **Audit Trails**: Activity logs track all data modifications
5. **Validation Rules**: Enforce business rules at the database level

## Development Workflow

1. **Define Schema**: Create or modify table definitions in appropriate domain
2. **Generate Types**: TypeScript types are automatically inferred
3. **Create Validation**: Add Zod schemas for insert/update operations
4. **Add Indexes**: Include appropriate indexes for query performance
5. **Test Migrations**: Ensure schema changes migrate cleanly

## Future Enhancements

- [ ] Add database views for complex queries
- [ ] Implement stored procedures for complex operations
- [ ] Add more comprehensive audit logging
- [ ] Optimize indexes based on query patterns
- [ ] Add database-level encryption for sensitive fields