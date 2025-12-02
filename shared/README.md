# Shared Schema Documentation

## Overview

The shared schema directory contains the complete database schema and TypeScript type definitions for ChefSpAIce. It uses **Drizzle ORM** with PostgreSQL to provide type-safe database operations and automatic validation with Zod schemas.

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

#### Authentication & Users (`auth.ts`) - 3 tables

- `users` - User accounts and profiles
- `sessions` - Session management
- `oauthProviders` - OAuth provider links
- Includes: user preferences, dietary restrictions, notification settings

#### Food Management (`food.ts`) - 10 tables

- `userInventory` - Food inventory items with expiration tracking
- `userStorage` - Storage location definitions
- `userRecipes` - User recipes and AI-generated recipes
- `mealPlans` - Meal planning entries
- `shoppingLists` - Shopping list items
- `applianceLibrary` - Kitchen appliance catalog
- `userAppliances` - User's kitchen equipment
- `fdcCache` - USDA FoodData Central cache
- `onboardingInventory` - Default onboarding items
- `cookingTerms` - Cooking terminology glossary

#### Notifications (`notifications.ts`) - 5 tables

- `pushTokens` - Device push notification tokens
- `notificationHistory` - Sent notification log
- `scheduledNotifications` - Future notification queue
- `notificationPreferences` - User notification settings
- `notificationScores` - Engagement scoring

#### Chat System (`chat.ts`) - 4 tables

- `userChats` - Chat conversations
- `chatMessages` - Individual messages
- `messageContext` - Conversation context
- `conversationMetadata` - Conversation summaries

#### Billing (`billing.ts`) - 1 table

- `donations` - User donations and payments

### Analytics Domains

#### Analytics (`analytics.ts`) - 11 tables

- `analyticsEvents` - User activity events
- `analyticsSessions` - Session tracking
- `userAnalytics` - Aggregated user metrics
- `activityLogs` - Detailed activity logging
- `trends` - Trend data
- `analyticsInsights` - AI-generated insights
- `userPredictions` - Predictive analytics
- `predictedChurn` - Churn prediction
- `webVitals` - Performance metrics
- `apiUsage` - API usage tracking
- `featureAdoption` - Feature usage tracking

#### System Monitoring (`system.ts`) - 5 tables

- `systemHealth` - System health metrics
- `performanceMetrics` - Performance data
- `errorLogs` - Error tracking
- `maintenanceSchedule` - Maintenance windows
- `resourceUsage` - Resource consumption

#### Experiments (`experiments.ts`) - 6 tables

- `abTests` - A/B test definitions
- `abTestVariants` - Test variants
- `abTestAssignments` - User assignments
- `cohorts` - User cohort definitions
- `cohortMembers` - Cohort membership
- `experimentResults` - Test results

### AI/ML Domains

#### AI/ML Features (`ai-ml.ts`) - 14 tables

- `voiceCommands` - Voice command history
- `writingSessions` - Writing assistance sessions
- `summarizations` - Content summaries
- `translations` - Translation history
- `sentimentHistory` - Sentiment tracking
- `aiResponses` - AI response cache
- `nlpProcessing` - NLP results
- `contentGeneration` - Generated content log
- `modelUsage` - AI model usage tracking
- `promptTemplates` - Prompt templates
- `contextMemory` - Conversation memory
- `feedbackLoop` - AI feedback data
- `rewardModeling` - RLHF data
- `modelVersions` - Model version tracking

#### Image Processing (`images.ts`) - 7 tables

- `userImages` - Uploaded images
- `imageAnalysis` - Image analysis results
- `altTextGenerations` - Alt text for accessibility
- `altTextQuality` - Alt text quality metrics
- `faceDetection` - Face detection results
- `ocrResults` - OCR text extraction
- `imageMetadata` - Image EXIF and metadata

#### Sentiment Analysis (`sentiment.ts`) - 5 tables

- `sentimentAnalysis` - Sentiment scores
- `sentimentTimeline` - Sentiment over time
- `emotionDetection` - Emotion classifications
- `opinionMining` - Opinion extraction
- `sentimentAlerts` - Sentiment-based alerts

#### Transcription (`transcription.ts`) - 2 tables

- `transcriptions` - Audio transcriptions
- `transcriptionSegments` - Transcription segments

#### Extraction (`extraction.ts`) - 2 tables

- `dataExtractions` - Extracted data
- `extractionTemplates` - Extraction patterns

### Content Domains

#### Content Management (`content.ts`) - 7 tables

- `contentCategories` - Content categorization
- `contentTags` - Tag assignments
- `recommendations` - Content recommendations
- `duplicateDetection` - Duplicate content tracking
- `naturalLanguageQueries` - NL query history
- `semanticSearch` - Semantic search index
- `contentEmbeddings` - Vector embeddings

#### Forms (`forms.ts`) - 7 tables

- `formDefinitions` - Form schemas
- `formSubmissions` - Form responses
- `formFields` - Field definitions
- `formValidation` - Validation rules
- `formAnalytics` - Form completion analytics
- `autoSaveDrafts` - Draft auto-saves
- `formTemplates` - Reusable form templates

#### Scheduling (`scheduling.ts`) - 4 tables

- `schedulingPreferences` - User availability
- `meetingSuggestions` - AI meeting suggestions
- `calendarSync` - Calendar integrations
- `scheduledEvents` - Scheduled events

#### Pricing (`pricing.ts`) - 3 tables

- `pricingHistory` - Price tracking
- `priceAlerts` - Price alerts
- `pricePredictions` - Price predictions

### Security Domains

#### Security (`security.ts`) - 8 tables

- `moderationResults` - Content moderation
- `moderationQueue` - Moderation queue
- `fraudDetection` - Fraud alerts
- `fraudPatterns` - Fraud patterns
- `validationRules` - Validation rule definitions
- `accessControl` - Permission management
- `securityAudits` - Security audit log
- `blockedContent` - Blocked content list

#### Support (`support.ts`) - 5 tables

- `supportTickets` - Support tickets
- `ticketMessages` - Ticket communications
- `knowledgeBase` - Help articles
- `ticketCategories` - Ticket categorization
- `agentAssignments` - Support agent assignments

## Key Technologies

### Drizzle ORM

- Type-safe SQL query builder
- Schema-first approach
- PostgreSQL dialect with Neon serverless
- Automatic migrations

### Zod Validation

- Runtime type validation
- Automatic schema generation from Drizzle tables
- Insert/update schemas for each table
- Type inference for TypeScript

### PostgreSQL Features

- JSONB columns for flexible data
- Full-text search indexes
- Foreign key constraints with cascade deletes
- Unique constraints
- Performance indexes

## Usage Patterns

### Importing Schemas

```typescript
// Import everything (maintains backward compatibility)
import * from "@shared/schema";

// Import specific tables
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
import { createInsertSchema } from "drizzle-zod";
const insertUserSchema = createInsertSchema(users);
type InsertUserZod = z.infer<typeof insertUserSchema>;
```

### Table Definition Pattern

```typescript
export const tableName = pgTable(
  "table_name",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    name: text("name").notNull(),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("table_name_user_id_idx").on(table.userId),
    uniqueIndex("table_name_unique_idx").on(table.userId, table.name),
  ],
);
```

### Schema Export Pattern

```typescript
// Create insert schema with Zod
export const insertTableNameSchema = createInsertSchema(tableName);

// Generate TypeScript type
export type InsertTableName = z.infer<typeof insertTableNameSchema>;

// Select type
export type TableName = typeof tableName.$inferSelect;
```

## Shared Interfaces

The schema exports common utility interfaces:

```typescript
// Pagination
interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Time series data
interface TimeSeriesPoint {
  date: string;
  value: number;
  label?: string;
}

// Confidence scoring
interface ConfidenceScore {
  score: number;
  level?: "low" | "medium" | "high" | "very_high";
  threshold?: number;
}

// Chat messages
interface Message {
  id: string;
  userId: string;
  role: string;
  content: string;
  createdAt: Date;
}
```

## Domain Dependencies

Table references across domains:

- Most tables reference `users` from `auth.ts`
- Recipe tables reference `userRecipes` from `food.ts`
- Analytics tables may reference entities from multiple domains
- Notification tables reference `pushTokens` for device targeting
- All AI-related tables can reference `analyticsInsights` for tracking

## JSONB Columns

Common JSONB column patterns:

| Column        | Usage                            |
| ------------- | -------------------------------- |
| `metadata`    | General-purpose metadata storage |
| `preferences` | User or feature preferences      |
| `settings`    | Configuration settings           |
| `context`     | Contextual information for AI    |
| `result`      | API response storage             |
| `nutrients`   | Nutrition data                   |
| `ingredients` | Recipe ingredients               |

## Indexes and Performance

Each table includes appropriate indexes for:

- **Foreign keys**: User ID lookups (most queries)
- **Timestamps**: Date range queries, recent items
- **Status fields**: Filtering by state
- **Search fields**: Text search optimization
- **Unique constraints**: Data integrity

## Best Practices

1. **Use Domain Imports**: Import from specific domain modules for clarity
2. **Type Safety**: Always use generated TypeScript types
3. **Validation**: Use Zod schemas for runtime validation
4. **Indexes**: Add indexes for frequently queried columns
5. **Soft Deletes**: Use `deletedAt` timestamps instead of hard deletes
6. **Audit Fields**: Include `createdAt` and `updatedAt` on all tables
7. **UUIDs**: Use UUIDs for primary keys for better distribution
8. **Cascade Deletes**: Use `onDelete: "cascade"` for child records

## Common Conventions

### User Context

Most tables include a `userId` field:

```typescript
userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" });
```

### Timestamps

Standard timestamp fields:

```typescript
createdAt: timestamp("created_at").defaultNow(),
updatedAt: timestamp("updated_at").defaultNow(),
deletedAt: timestamp("deleted_at"), // For soft deletes
```

### Status Enums

Common status patterns:

```typescript
status: text("status", {
  enum: ["pending", "processing", "completed", "failed"],
});
```

## Security Considerations

1. **Foreign Key Constraints**: Cascade deletes maintain referential integrity
2. **User Isolation**: Queries filtered by userId for multi-tenancy
3. **Sensitive Data**: Separate tables for PII with restricted access
4. **Audit Trails**: Activity logs track all data modifications
5. **Validation Rules**: Business rules enforced at database level

## Related Documentation

- `/server/storage/` - Storage layer implementations
- `/server/README.md` - Server architecture
- `/docs/STORAGE_AUDIT_REPORT.md` - Interface alignment report
- `/docs/food-domain-migration.md` - Domain migration details
