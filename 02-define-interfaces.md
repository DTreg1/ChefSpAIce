# Step 2: Define TypeScript Interfaces

**Estimated Time:** 2-3 hours  
**Difficulty:** Medium  
**Prerequisites:** Completed Step 1 (JSON columns audit)

## Overview

This step creates explicit TypeScript interfaces for each JSON column identified in Step 1. These interfaces will provide the foundation for type safety throughout your application.

## Why This Matters

Interfaces serve as the single source of truth for JSON data structures. They:
- Document expected data shapes
- Enable IDE autocomplete
- Catch type errors at compile time
- Make refactoring safe and easy
- Serve as living documentation

## Step-by-Step Instructions

### 1. Review Priority 1 Columns

Start with the highest-priority columns from your audit.

**Prompt to execute:**
```
Read `json-columns-audit.md` and list all Priority 1 (High) JSON columns. For each column, note:
1. The feature area it belongs to
2. The expected data structure (based on how it's used in storage.ts)
3. Whether it contains optional or required fields
4. Whether it's an object, array, or record type
```

### 2. Create Interface Structure Template

Establish naming conventions and organizational structure.

**Prompt to execute:**
```
In `shared/schema.ts`, create a new section at the top of the file (before table definitions) with this header:

// ==================== TypeScript Interfaces for JSON Columns ====================

Within this section, create subsections for each feature area:
- Sentiment Analysis Interfaces
- Content Moderation Interfaces
- Fraud Detection Interfaces
- Chat & Communication Interfaces
- Analytics & Insights Interfaces
- A/B Testing Interfaces
- Cohort Analysis Interfaces
- Predictive Maintenance Interfaces

Add comments for each subsection to organize the interfaces clearly.
```

### 3. Define Interfaces for Sentiment Analysis

Start with sentiment analysis as an example.

**Prompt to execute:**
```
Based on the sentimentResults table in shared/schema.ts and how it's used in server/storage.ts, create TypeScript interfaces for:

1. SentimentData - The main sentiment analysis result
2. EmotionScores - Emotion detection scores  
3. KeyPhrase - Individual key phrases extracted
4. ContextFactor - Context information

Follow this pattern:
- Use clear, descriptive property names
- Mark optional properties with `?`
- Use specific types (not `any` or `unknown`)
- Use string literal unions for enums (e.g., 'positive' | 'negative' | 'neutral')
- Add JSDoc comments explaining each interface

Place these interfaces in the "Sentiment Analysis Interfaces" section of shared/schema.ts.
```

**Example output:**
```typescript
// ==================== Sentiment Analysis Interfaces ====================

/**
 * Main sentiment analysis data structure
 */
export interface SentimentData {
  /** Overall sentiment score from -1 (very negative) to 1 (very positive) */
  overallScore: number;
  /** Sentiment polarity classification */
  polarity: 'positive' | 'negative' | 'neutral';
  /** Subjectivity score from 0 (objective) to 1 (subjective) */
  subjectivity: number;
  /** Document-level sentiment metrics */
  documentScore?: number;
  /** Aspect-based sentiment scores */
  aspectScores?: Record<string, number>;
}

/**
 * Emotion detection scores
 */
export interface EmotionScores {
  joy?: number;
  sadness?: number;
  anger?: number;
  fear?: number;
  surprise?: number;
  disgust?: number;
  [emotion: string]: number | undefined;
}
```

### 4. Define Interfaces for Fraud Detection

**Prompt to execute:**
```
Based on the fraudDetectionResults table and its usage in server/storage.ts, create TypeScript interfaces for:

1. FraudRiskFactor - Individual risk factor with score and weight
2. FraudEvidenceDetail - Evidence supporting fraud detection
3. FraudDeviceInfo - Device information for fingerprinting
4. FraudBehaviorData - Behavioral patterns

Each interface should:
- Include all required fields based on actual usage
- Use appropriate types (numbers for scores, strings for IDs, etc.)
- Include optional fields where applicable
- Have JSDoc comments

Place these in the "Fraud Detection Interfaces" section.
```

### 5. Define Interfaces for Cohort Analysis

**Prompt to execute:**
```
Based on the cohorts and cohortMetrics tables, create TypeScript interfaces for:

1. CohortDefinition - How a cohort is defined (signup dates, attributes, behavior criteria)
2. CohortMetadata - Descriptive metadata about the cohort
3. CohortComparisonData - Period-over-period comparison metrics
4. CohortSegmentData - Segment breakdown with user counts and percentages

Pay special attention to:
- CohortDefinition.behaviorCriteria which contains nested event arrays and metrics
- CohortComparisonData.trend which should be a string literal union
- CohortSegmentData which is a Record type with dynamic keys

Place these in the "Cohort Analysis Interfaces" section.
```

### 6. Define Interfaces for A/B Testing

**Prompt to execute:**
```
Based on the abTests, abTestResults, and abTestInsights tables, create TypeScript interfaces for:

1. AbTestConfiguration - Test configuration with control/treatment variants
2. AbTestMetrics - Performance metrics for each variant
3. AbTestInsights - Analysis insights with recommendations
4. AbTestSegmentResults - Segment-level test results

These interfaces support complex A/B testing workflows, so ensure:
- Statistical significance fields are properly typed
- Variant configurations can handle multiple types (string, number, boolean, object)
- Recommendation fields use string literal unions ('implement' | 'continue' | 'abandon')

Place these in the "A/B Testing Interfaces" section.
```

### 7. Define Interfaces for Remaining Features

**Prompt to execute:**
```
Create TypeScript interfaces for the remaining feature areas:

**Content Moderation:**
- ModerationResult
- ModerationCategory
- ModerationMetadata

**Chat & Communication:**
- ChatMessageMetadata
- DraftContent
- AutoSaveData

**Analytics & Insights:**
- AnalyticsInsightData
- PredictionData
- PredictionFeatures
- TrendData

**Predictive Maintenance:**
- MaintenanceMetrics
- MaintenanceThresholds
- MaintenanceAlerts

For each interface:
1. Examine the corresponding table definition
2. Check how it's used in server/storage.ts
3. Define all properties with correct types
4. Mark optional vs required fields appropriately
5. Add JSDoc comments

Place each in its appropriate section.
```

### 8. Create Reusable Common Interfaces

Some structures appear across multiple features.

**Prompt to execute:**
```
Identify common patterns across the interfaces you've created and extract them into reusable interfaces:

1. TimeSeriesPoint - For time-series data points
2. MetadataBase - Common metadata fields (tags, description, custom fields)
3. ConfidenceScore - Confidence/probability scores with levels
4. SegmentBreakdown - Generic segment analysis structure

Create a "Common/Shared Interfaces" section at the top of the interfaces area and place these there. Then refactor other interfaces to use these common types where applicable.
```

### 9. Validate Interface Completeness

**Prompt to execute:**
```
For each interface created, verify:

1. All required fields from the database are included
2. Optional fields are marked with `?`
3. Types are specific (avoid `any`, `unknown`, `object`)
4. String enums use literal unions
5. Nested structures have their own interfaces
6. Arrays are properly typed as Array<T> or T[]
7. Record types use proper key/value types
8. JSDoc comments are present and helpful

Create a checklist in `interface-validation.md` documenting which interfaces have been reviewed and validated.
```

## Expected Output

By the end of this step, you should have:

1. ✅ 30+ TypeScript interfaces defined in `shared/schema.ts`
2. ✅ Interfaces organized by feature area with clear section headers
3. ✅ All Priority 1 columns have corresponding interfaces
4. ✅ Common/reusable interfaces extracted
5. ✅ JSDoc comments on all interfaces
6. ✅ Validation checklist completed

## Common Issues

### Issue: Uncertain about whether a field should be optional
**Solution:** Check server/storage.ts to see if the field is always provided in insert operations. If it's only sometimes included, mark it optional.

### Issue: Don't know the exact type for a field
**Solution:** Trace the field's usage in storage.ts and any frontend code that uses it. Look at actual data being inserted/updated.

### Issue: Circular dependencies between interfaces
**Solution:** Extract the shared parts into a separate interface and reference it from both. Use type composition over inheritance.

### Issue: Complex union types are hard to model
**Solution:** Consider using discriminated unions with a `type` or `kind` field. Example:
```typescript
type Notification = 
  | { type: 'email'; emailAddress: string; subject: string }
  | { type: 'sms'; phoneNumber: string; message: string }
  | { type: 'push'; deviceId: string; payload: object };
```

## Verification Prompt

**Run this prompt to verify Step 2 is complete:**

```
Verify that all TypeScript interfaces are properly defined:

1. Open `shared/schema.ts` and confirm there's a "TypeScript Interfaces for JSON Columns" section at the top
2. Verify that interfaces are organized by feature area with clear section headers
3. Check that at least 25-30 interfaces have been created covering all Priority 1 columns
4. Confirm each interface has:
   - Proper TypeScript syntax (no syntax errors)
   - Clear property names with appropriate types
   - Optional fields marked with `?`
   - JSDoc comments
5. Verify common/reusable interfaces exist and are used across multiple features
6. Check that `interface-validation.md` exists with a completed checklist

Run `npm run check` or check LSP diagnostics to ensure no syntax errors in the new interfaces.

If all checks pass, respond with:
✅ "Step 2 Complete: [X] TypeScript interfaces defined across [Y] feature areas. All Priority 1 columns covered. No syntax errors."

If any checks fail, specify what needs to be fixed or added.
```

---

**Next Step:** Once verification passes, proceed to [Step 3: Update Table Definitions](03-update-tables.md)
