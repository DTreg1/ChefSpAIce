# Schema Organization

## Overview
The database schema has been reorganized from a single 11,000+ line file into 18 domain-specific modules for better maintainability and clarity.

## Domain Structure

### Core Domains
- **auth.ts** - Authentication & user management (3 tables)
- **food.ts** - Food inventory & recipes (10 tables) 
- **billing.ts** - Payments & donations (1 table)

### Communication & Engagement
- **notifications.ts** - Push notifications (5 tables)
- **support.ts** - User feedback & ticketing (5 tables)

### Analytics & Insights  
- **analytics.ts** - Events & metrics (11 tables)
- **experiments.ts** - A/B testing & cohorts (6 tables)

### AI/ML Features
- **ai-ml.ts** - Chat, voice, writing assistance (14 tables)
- **sentiment.ts** - Sentiment analysis (5 tables)
- **images.ts** - Image processing & OCR (7 tables)
- **transcription.ts** - Audio transcription (2 tables)
- **extraction.ts** - Data extraction (2 tables)

### Content & UX
- **content.ts** - Categories & tagging (7 tables)
- **forms.ts** - Form handling & validation (7 tables)
- **scheduling.ts** - Calendar & meetings (4 tables)

### Platform Features
- **security.ts** - Moderation & fraud detection (8 tables)
- **pricing.ts** - Dynamic pricing (3 tables)
- **system.ts** - Monitoring & maintenance (5 tables)

## Migration Notes

### Legacy Chat System
The `conversations`, `messages`, and `conversationContext` tables in `ai-ml.ts` appear to be from a legacy chat implementation. Consider:
1. **Remove if unused** - If replaced by a newer system
2. **Migrate if active** - Update to modern patterns
3. **Archive if historical** - Move to separate legacy schema

### Recommendations Implemented

#### 1. Domain-Specific Files ✅
- Split 104 tables into 18 logical domains
- Each file focuses on related functionality
- Clear separation of concerns

#### 2. Stricter Validation ✅
- Added enum schemas for all string literals
- Numeric ranges with min/max validation
- Email, URL, and regex pattern validation
- Required vs optional fields clearly defined

#### 3. TypeScript & Zod Synchronization ✅
- Consistent pattern: Table → InsertSchema → Type
- Type inference from schemas
- Shared interfaces in index.ts

#### 4. Scope Review Needed ⚠️
Review these potentially redundant tables:
- Multiple sentiment tables (5) - could be consolidated
- Separate excerpt tables (2) - might combine
- Many ML prediction tables - evaluate actual usage

#### 5. Code Generation Consideration
Future improvement: Use Drizzle Kit introspection to auto-generate TypeScript interfaces from database schema.

## Usage

### Import from Index
```typescript
// Import everything
import * as schema from '@shared/schema';

// Import specific domain
import { users, insertUserSchema } from '@shared/schema/auth';
```

### Import from Domain Files
```typescript
// Direct domain import
import { userRecipes, insertRecipeSchema } from '@shared/schema/food';
```

## Next Steps

1. **Review Table Usage** - Audit which tables are actively used
2. **Remove Unused Tables** - Clean up legacy/experimental features
3. **Consolidate Similar Tables** - Merge overlapping functionality
4. **Add Relationships** - Document foreign key relationships
5. **Performance Indexes** - Review and optimize indexes