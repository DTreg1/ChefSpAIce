# Step 3: Update Table Definitions with `.$type<>()`

**Estimated Time:** 1 hour  
**Difficulty:** Easy-Medium  
**Prerequisites:** Completed Step 2 (TypeScript interfaces defined)

## Overview

This step applies the TypeScript interfaces you created in Step 2 to the actual table definitions in `shared/schema.ts`. By using Drizzle's `.$type<Interface>()` method, you tell the ORM exactly what structure your JSON columns should have.

## Why This Matters

Without `.$type<Interface>()`, Drizzle treats JSON columns as `unknown`, which forces you to use type assertions throughout your code. Applying these type annotations:
- Provides type hints to Drizzle's query builder
- Improves IDE autocomplete when working with table definitions
- Creates a stronger connection between your interfaces and database schema
- Prepares the foundation for properly typed insert/select operations

## Step-by-Step Instructions

### 1. Understand the Pattern

Before making changes, understand how `.$type<>()` works.

**Prompt to execute:**
```
Explain the Drizzle ORM `.$type<Interface>()` pattern with an example:

BEFORE:
const myTable = pgTable("my_table", {
  jsonData: json("json_data"),
});

AFTER:
interface MyJsonData {
  field1: string;
  field2: number;
}

const myTable = pgTable("my_table", {
  jsonData: json("json_data").$type<MyJsonData>(),
});

Show how this affects:
1. Type inference when querying
2. Insert operations
3. Select operations
```

### 2. Update Sentiment Analysis Tables

Start with the sentiment analysis tables.

**Prompt to execute:**
```
In `shared/schema.ts`, locate the `sentimentResults` table definition. Update all JSON columns to use the interfaces defined in Step 2:

1. sentimentData -> .$type<SentimentData>()
2. emotionScores -> .$type<EmotionScores>()
3. keyPhrases -> .$type<KeyPhrase[]>() (note: array type)
4. contextFactors -> .$type<ContextFactor[]>() (note: array type)

For each column, ensure:
- The interface import/reference is correct
- Nullable columns still use .nullable() or allow null: .$type<Type | null>()
- Required columns use .notNull() if appropriate
- Array types use the array syntax: .$type<Interface[]>()

Show the before and after code for the sentimentResults table.
```

### 3. Update Fraud Detection Tables

**Prompt to execute:**
```
Update the `fraudDetectionResults` table definition with the fraud detection interfaces:

1. riskFactors -> .$type<FraudRiskFactor[]>()
2. evidenceDetails -> .$type<FraudEvidenceDetail[]>()
3. deviceInfo -> .$type<FraudDeviceInfo>()
4. behaviorData -> .$type<FraudBehaviorData>()

Verify that:
- All JSON columns in the table are updated
- Array types are correctly annotated
- Nullable columns preserve their nullability
- Required fields maintain .notNull()

Show the updated table definition.
```

### 4. Update Cohort Analysis Tables

**Prompt to execute:**
```
Update both `cohorts` and `cohortMetrics` tables with cohort analysis interfaces:

For `cohorts` table:
1. definition -> .$type<CohortDefinition>()
2. metadata -> .$type<CohortMetadata>()

For `cohortMetrics` table:
1. comparisonData -> .$type<CohortComparisonData>()
2. segmentData -> .$type<CohortSegmentData>()

Double-check:
- Optional vs required fields match your interface definitions
- Nullable annotations are preserved
- No type conflicts with existing constraints

Show the updated definitions for both tables.
```

### 5. Update A/B Testing Tables

**Prompt to execute:**
```
Update all three A/B testing tables with their respective interfaces:

For `abTests` table:
1. configuration -> .$type<AbTestConfiguration>()
2. metadata -> .$type<Record<string, any>>() (if it's a flexible metadata field)

For `abTestResults` table:
1. metrics -> .$type<AbTestMetrics>()
2. segmentResults -> .$type<AbTestSegmentResults>()

For `abTestInsights` table:
1. insights -> .$type<AbTestInsights>()

Ensure all columns maintain their original constraints (nullable, notNull, etc.).

Show the updated definitions for all three tables.
```

### 6. Update Content Moderation Tables

**Prompt to execute:**
```
Update the `moderationLogs` table with moderation interfaces:

1. moderationResult -> .$type<ModerationResult>()
2. metadata -> .$type<ModerationMetadata>()

Verify the table definition maintains all other column properties.

Show the updated table definition.
```

### 7. Update Chat and Communication Tables

**Prompt to execute:**
```
Update all chat-related tables with their interfaces:

For `chatMessages` table:
1. metadata -> .$type<ChatMessageMetadata>()

For `draftGenerationLogs` table:
1. draftContent -> .$type<DraftContent>()
2. metadata -> .$type<Record<string, any>>()

For `autoSaveSnapshots` table:
1. savedData -> .$type<AutoSaveData>()
2. metadata -> .$type<Record<string, any>>()

Show the updated definitions.
```

### 8. Update Analytics Tables

**Prompt to execute:**
```
Update all analytics and insights tables:

For `analyticsInsights` table:
1. insights -> .$type<AnalyticsInsightData>()
2. metadata -> .$type<Record<string, any>>()

For `userPredictions` table:
1. predictionData -> .$type<PredictionData>()
2. features -> .$type<PredictionFeatures>()

For `trends` table:
1. trendData -> .$type<TrendData>()
2. metadata -> .$type<Record<string, any>>()

Show the updated definitions for all three tables.
```

### 9. Update Predictive Maintenance Tables

**Prompt to execute:**
```
Update the `predictiveMaintenance` and `maintenanceMetrics` tables:

For `predictiveMaintenance` table:
1. metrics -> .$type<MaintenanceMetrics>()
2. thresholds -> .$type<MaintenanceThresholds>()
3. alerts -> .$type<MaintenanceAlerts[]>() (array type)

For `maintenanceMetrics` table (if it has JSON columns):
Update any JSON columns with appropriate interfaces.

Show the updated definitions.
```

### 10. Verify All Updates

**Prompt to execute:**
```
Review all table definitions in `shared/schema.ts` and verify:

1. Every JSON column now has a `.$type<Interface>()` annotation
2. No JSON columns are left untyped
3. Array types use the correct syntax: .$type<Interface[]>()
4. Nullable columns preserve their .nullable() or allow null in the type
5. Required columns still have .notNull() where appropriate
6. All interface references are valid (no typos in interface names)

Create a checklist document `table-updates-verification.md` listing:
- Table name
- Column name
- Applied interface
- Verified (yes/no)

Mark all as verified after review.
```

### 11. Check for TypeScript Errors

**Prompt to execute:**
```
Run TypeScript checking to ensure the table definition updates don't introduce errors:

1. Check LSP diagnostics for `shared/schema.ts`
2. Run `npm run check` if available
3. Look for any type errors related to the table definitions

If errors appear:
- Fix interface/type mismatches
- Ensure all referenced interfaces are exported
- Verify no circular dependencies exist

Report any errors found and their resolutions.
```

## Expected Output

By the end of this step, you should have:

1. ✅ All JSON columns in all tables updated with `.$type<Interface>()`
2. ✅ Array types correctly annotated
3. ✅ Nullable/required constraints preserved
4. ✅ No TypeScript errors in table definitions
5. ✅ Verification checklist completed (`table-updates-verification.md`)
6. ✅ All interface references valid

## Common Issues

### Issue: TypeScript error: "Type 'Interface' is not assignable to type 'unknown'"
**Solution:** Make sure the interface is exported: `export interface MyInterface { ... }`

### Issue: Nullable column giving type errors
**Solution:** Use union type with null: `.$type<MyInterface | null>()` instead of separate `.nullable()`

### Issue: Array type not working correctly
**Solution:** Ensure you're using `.$type<Interface[]>()` not `.$type<Array<Interface>>()`—both work but the bracket syntax is preferred.

### Issue: "Cannot find name 'InterfaceName'"
**Solution:** Check that the interface is defined earlier in the file (in the interfaces section) and is spelled correctly.

### Issue: Circular dependency between table and interface
**Solution:** Move the interface definition above all table definitions in the file. Interfaces should be defined before they're used.

## Verification Prompt

**Run this prompt to verify Step 3 is complete:**

```
Verify that all table definitions are properly updated:

1. Open `shared/schema.ts` and locate all table definitions (pgTable calls)
2. For each table with JSON columns, confirm:
   - Every JSON column has `.$type<SomeInterface>()`
   - No plain `.json()` or `.jsonb()` calls without type annotations
   - Array types use the `.$type<Interface[]>()` syntax
   - Nullable columns properly handle null types
3. Check `table-updates-verification.md` exists with a complete checklist
4. Run LSP diagnostics on `shared/schema.ts` - should show 0 errors related to table definitions
5. Verify all interface names referenced in `.$type<>()` are spelled correctly and exist

If all checks pass, respond with:
✅ "Step 3 Complete: [X] tables updated with type annotations across [Y] JSON columns. No TypeScript errors in table definitions."

If any checks fail, specify which tables or columns need attention and what needs to be fixed.
```

---

**Next Step:** Once verification passes, proceed to [Step 4: Create Zod Validation Schemas](04-create-zod-schemas.md)
