# Step 4: Create Zod Validation Schemas

**Estimated Time:** 1-2 hours  
**Difficulty:** Medium  
**Prerequisites:** Completed Step 3 (Table definitions updated)

## Overview

This step creates Zod schemas that mirror the TypeScript interfaces you created. Zod provides runtime validation, ensuring that data actually matches the expected structure before it reaches your database.

## Why This Matters

TypeScript interfaces only exist at compile time—they disappear when your code runs. Zod schemas:
- Validate data at runtime (catching bad data before database errors)
- Parse and transform incoming data
- Generate TypeScript types from schemas (ensuring sync between runtime and compile-time types)
- Provide clear error messages when validation fails
- Integrate with form libraries and API validation

## Step-by-Step Instructions

### 1. Understand Zod Schema Pattern

Learn how to create Zod schemas that match TypeScript interfaces.

**Prompt to execute:**
```
Explain how to create Zod schemas that match TypeScript interfaces:

Given this interface:
interface UserProfile {
  name: string;
  age: number;
  email?: string;
  tags: string[];
  metadata: Record<string, any>;
}

Show the equivalent Zod schema:
const userProfileSchema = z.object({
  name: z.string(),
  age: z.number(),
  email: z.string().optional(),
  tags: z.array(z.string()),
  metadata: z.record(z.any()),
});

Explain:
1. How optional fields are handled (.optional() vs .nullable())
2. How to validate arrays
3. How to validate Record types
4. How to validate union types
5. How to validate nested objects
```

### 2. Create Schema Section in shared/schema.ts

Organize Zod schemas alongside interfaces.

**Prompt to execute:**
```
In `shared/schema.ts`, create a new section right after the "TypeScript Interfaces for JSON Columns" section:

// ==================== Zod Validation Schemas for JSON Columns ====================

Within this section, create subsections matching the interface organization:
- Sentiment Analysis Schemas
- Content Moderation Schemas
- Fraud Detection Schemas
- Chat & Communication Schemas
- Analytics & Insights Schemas
- A/B Testing Schemas
- Cohort Analysis Schemas
- Predictive Maintenance Schemas

Add clear comments for each subsection.
```

### 3. Create Zod Schemas for Sentiment Analysis

**Prompt to execute:**
```
Create Zod schemas for all sentiment analysis interfaces defined in Step 2:

1. sentimentDataSchema - matching SentimentData interface
2. emotionScoresSchema - matching EmotionScores interface
3. keyPhraseSchema - matching KeyPhrase interface
4. contextFactorSchema - matching ContextFactor interface

For each schema:
- Match the interface exactly (same required/optional fields)
- Use appropriate Zod validators (z.string(), z.number(), z.enum(), etc.)
- Use z.literal() for literal string unions
- Add .describe() for better error messages
- Export each schema

Example pattern:
export const sentimentDataSchema = z.object({
  overallScore: z.number().min(-1).max(1).describe("Overall sentiment score"),
  polarity: z.enum(['positive', 'negative', 'neutral']).describe("Sentiment classification"),
  subjectivity: z.number().min(0).max(1).describe("Subjectivity score"),
  // ... more fields
});

Place these in the "Sentiment Analysis Schemas" section.
```

### 4. Create Zod Schemas for Fraud Detection

**Prompt to execute:**
```
Create Zod schemas for all fraud detection interfaces:

1. fraudRiskFactorSchema - matching FraudRiskFactor interface
2. fraudEvidenceDetailSchema - matching FraudEvidenceDetail interface
3. fraudDeviceInfoSchema - matching FraudDeviceInfo interface
4. fraudBehaviorDataSchema - matching FraudBehaviorData interface

Pay attention to:
- Numeric score ranges (use .min() and .max() where appropriate)
- Array validations (z.array(schema))
- Optional fields (.optional())
- Record types (z.record(z.string(), z.any()))

Add descriptive error messages with .describe() for key fields.

Place these in the "Fraud Detection Schemas" section.
```

### 5. Create Zod Schemas for Cohort Analysis

**Prompt to execute:**
```
Create Zod schemas for all cohort analysis interfaces:

1. cohortDefinitionSchema - matching CohortDefinition interface
2. cohortMetadataSchema - matching CohortMetadata interface
3. cohortComparisonDataSchema - matching CohortComparisonData interface
4. cohortSegmentDataSchema - matching CohortSegmentData interface

Special attention needed for:

cohortDefinitionSchema should handle:
- signupDateRange with nested start/end dates
- userAttributes as a flexible Record
- behaviorCriteria with nested arrays and optional fields
- customQueries as string array

cohortSegmentDataSchema is a Record type:
z.record(z.string(), z.object({
  value: z.number(),
  userCount: z.number(),
  percentage: z.number(),
}))

Place these in the "Cohort Analysis Schemas" section.
```

### 6. Create Zod Schemas for A/B Testing

**Prompt to execute:**
```
Create Zod schemas for all A/B testing interfaces:

1. abTestConfigurationSchema - matching AbTestConfiguration interface
2. abTestMetricsSchema - matching AbTestMetrics interface
3. abTestInsightsSchema - matching AbTestInsights interface
4. abTestSegmentResultsSchema - matching AbTestSegmentResults interface

Important validations:
- Use z.enum() for string literal unions (e.g., recommendation: z.enum(['implement', 'continue', 'abandon']))
- Validate percentage fields with .min(0).max(100)
- Validate confidence scores with .min(0).max(1)
- Handle variant configurations which can be mixed types (use z.union() or z.any() appropriately)

Place these in the "A/B Testing Schemas" section.
```

### 7. Create Zod Schemas for Remaining Features

**Prompt to execute:**
```
Create Zod schemas for the remaining feature areas:

**Content Moderation:**
- moderationResultSchema
- moderationCategorySchema
- moderationMetadataSchema

**Chat & Communication:**
- chatMessageMetadataSchema
- draftContentSchema
- autoSaveDataSchema

**Analytics & Insights:**
- analyticsInsightDataSchema
- predictionDataSchema
- predictionFeaturesSchema
- trendDataSchema

**Predictive Maintenance:**
- maintenanceMetricsSchema
- maintenanceThresholdsSchema
- maintenanceAlertsSchema (array schema)

For each:
1. Match the corresponding interface
2. Use appropriate Zod validators
3. Add .describe() for clarity
4. Handle optional fields correctly
5. Export the schema

Place each in its appropriate section.
```

### 8. Create Schemas for Common/Shared Interfaces

**Prompt to execute:**
```
Create Zod schemas for any common/shared interfaces you defined in Step 2:

1. timeSeriesPointSchema
2. metadataBaseSchema
3. confidenceScoreSchema
4. segmentBreakdownSchema

These should be created in a "Common/Shared Schemas" section at the top of the Zod schemas area, so they can be imported and reused by other schemas.

Show how to compose these common schemas into larger schemas using z.object().merge() or z.object().extend().
```

### 9. Validate Schema-Interface Alignment

**Prompt to execute:**
```
For each Zod schema, verify it exactly matches its corresponding TypeScript interface:

1. Same field names
2. Same required vs optional properties
3. Same types (string → z.string(), number → z.number(), etc.)
4. Same nested structures
5. Same array types

Use TypeScript's type inference to verify:
type InferredType = z.infer<typeof mySchema>;
// Compare InferredType with MyInterface - they should be identical

Create a document `schema-interface-alignment.md` with a table showing:
- Interface name
- Schema name
- Fields match (yes/no)
- Types match (yes/no)
- Validated (yes/no)

Review and mark all as validated.
```

### 10. Test Schema Validation

**Prompt to execute:**
```
Create simple tests to verify the schemas work correctly:

For 2-3 key schemas (e.g., sentimentDataSchema, cohortDefinitionSchema, fraudRiskFactorSchema), write example validation tests:

// Valid data - should pass
const validData = {
  overallScore: 0.75,
  polarity: 'positive',
  subjectivity: 0.6,
};
const result = sentimentDataSchema.safeParse(validData);
console.log(result.success); // should be true

// Invalid data - should fail
const invalidData = {
  overallScore: 2.0, // out of range
  polarity: 'happy', // invalid enum value
};
const result2 = sentimentDataSchema.safeParse(invalidData);
console.log(result2.success); // should be false

Test at least:
- Valid data passes
- Invalid types are rejected
- Required fields are enforced
- Optional fields can be omitted
- Enum values are validated

Document any issues found and fix the schemas.
```

## Expected Output

By the end of this step, you should have:

1. ✅ 30+ Zod schemas created in `shared/schema.ts`
2. ✅ Schemas organized by feature area matching interface organization
3. ✅ All schemas exported for use in other files
4. ✅ Common/shared schemas available for reuse
5. ✅ Schema-interface alignment verified (`schema-interface-alignment.md`)
6. ✅ Basic validation tests passed
7. ✅ Descriptive error messages added with `.describe()`

## Common Issues

### Issue: Zod schema doesn't match interface exactly
**Solution:** Use `z.infer<typeof schema>` to see the inferred type and compare with the interface. Adjust the schema until they match perfectly.

### Issue: Optional vs nullable confusion
**Solution:** 
- Optional (may be undefined): `z.string().optional()`
- Nullable (may be null): `z.string().nullable()`
- Both: `z.string().optional().nullable()` or `z.string().nullish()`

### Issue: Record type not validating correctly
**Solution:** Use `z.record(z.string(), valueSchema)` for `Record<string, ValueType>`. The first arg is key type, second is value type.

### Issue: Union types are complex
**Solution:** Use `z.union([schema1, schema2])` or for discriminated unions use `z.discriminatedUnion('type', [schema1, schema2])`

### Issue: Circular references in schemas
**Solution:** Use `z.lazy()` for recursive schemas:
```typescript
const categorySchema: z.ZodType<Category> = z.lazy(() => z.object({
  name: z.string(),
  subcategories: z.array(categorySchema).optional(),
}));
```

## Verification Prompt

**Run this prompt to verify Step 4 is complete:**

```
Verify that all Zod validation schemas are properly created:

1. Open `shared/schema.ts` and confirm there's a "Zod Validation Schemas for JSON Columns" section
2. Verify schemas are organized by feature area matching the interface organization
3. Check that at least 25-30 schemas have been created covering all interfaces from Step 2
4. For each schema, verify:
   - Exported with `export const`
   - Matches corresponding interface (use z.infer<typeof schema> to check)
   - Uses appropriate Zod validators
   - Optional fields use .optional()
   - Key fields have .describe() for better errors
5. Verify common/shared schemas exist and are reused where applicable
6. Check `schema-interface-alignment.md` exists with validation completed
7. Run LSP diagnostics on `shared/schema.ts` - should show 0 errors

If all checks pass, respond with:
✅ "Step 4 Complete: [X] Zod schemas created matching all TypeScript interfaces. Schema-interface alignment verified. No errors."

If any checks fail, specify which schemas need attention and what needs to be fixed.
```

---

**Next Step:** Once verification passes, proceed to [Step 5: Fix Insert Schemas with .extend()](05-fix-insert-schemas.md)
