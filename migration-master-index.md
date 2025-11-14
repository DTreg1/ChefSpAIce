# Insert Schema Migration - Master Index

**Project:** Migrate 102 insert schemas to `.omit().extend()` pattern  
**Status:** Planning Phase Complete, Ready for Execution  
**Overall Progress:** 14/102 (13.7%) Complete

---

## Executive Summary

This document serves as the master navigation index for migrating all 102 insert schemas from the deprecated `createInsertSchema(table, { overrides })` pattern to the modern `.omit().extend()` pattern.

### Current Status

✅ **Phase 1 Complete:** 14 schemas migrated and verified (Schemas 1-14)  
📋 **Phase 2 Planned:** 88 schemas organized into 9 batches (Schemas 15-102)  
🔴 **Phase 2 Status:** Awaiting approval to begin execution

---

## Why This Migration Matters

**Without .extend() on JSON columns:**
- ❌ TypeScript shows `unknown` type for JSON fields
- ❌ No autocomplete for nested properties
- ❌ No runtime validation of JSON structure
- ❌ Easy to introduce bugs

**With proper .extend():**
- ✅ Full TypeScript autocomplete for JSON fields
- ✅ Compile-time type checking
- ✅ Runtime validation with Zod
- ✅ Self-documenting schemas
- ✅ Refactoring safety

---

## Migration Batches

All 88 remaining schemas are organized into 9 manageable batches:

### Batch 1: Auth & Notifications (Schemas 15-24)
**File:** `migration-batch-01.md`  
**Schemas:** 10  
**Focus:** Authentication providers, push tokens, notification preferences  
**Priority:** High (user-facing features)

**Includes:**
- insertAuthProviderSchema
- insertUserStorageSchema
- insertPushTokenSchema
- insertNotificationPreferencesSchema
- insertNotificationScoresSchema
- insertNotificationFeedbackSchema
- insertNotificationHistorySchema
- insertUserApplianceSchema
- insertUserInventorySchema
- insertRecipeSchema

---

### Batch 2: Content & Search (Schemas 25-34)
**File:** `migration-batch-02.md`  
**Schemas:** 10  
**Focus:** Meal plans, API logs, search, categories  
**Priority:** Medium

**Includes:**
- insertMealPlanSchema
- insertApiUsageLogSchema
- insertFdcCacheSchema
- insertShoppingListItemSchema
- insertFeedbackSchema
- insertDonationSchema
- insertWebVitalSchema
- insertContentEmbeddingSchema
- insertSearchLogSchema
- insertCategorySchema

---

### Batch 3: Tagging & Analytics (Schemas 35-44)
**File:** `migration-batch-03.md`  
**Schemas:** 10  
**Focus:** Tags, duplicates, analytics events  
**Priority:** Medium-High

**Includes:**
- insertContentCategorySchema
- insertTagSchema
- insertContentTagSchema
- insertDuplicatePairSchema
- insertRelatedContentCacheSchema
- insertQueryLogSchema
- insertAnalyticsEventSchema
- insertUserSessionSchema
- insertOnboardingInventorySchema
- insertCookingTermSchema

---

### Batch 4: Conversations & Writing (Schemas 45-54)
**File:** `migration-batch-04.md`  
**Schemas:** 10  
**Focus:** Chat, voice commands, writing sessions  
**Priority:** Medium

**Includes:**
- insertApplianceLibrarySchema
- insertConversationSchema
- insertConversationContextSchema
- insertVoiceCommandSchema
- insertDraftTemplateSchema
- insertWritingSessionSchema
- insertWritingSuggestionSchema
- insertActivityLogSchema
- insertSummarySchema
- insertExcerptSchema

---

### Batch 5: Content Processing (Schemas 55-64)
**File:** `migration-batch-05.md`  
**Schemas:** 10  
**Focus:** Translation, images, moderation  
**Priority:** Medium

**Includes:**
- insertExcerptPerformanceSchema
- insertTranslationSchema
- insertLanguagePreferenceSchema
- insertImageMetadataSchema
- insertAltTextQualitySchema
- insertBlockedContentSchema
- insertModerationAppealSchema
- insertFraudReviewSchema
- insertSentimentMetricsSchema
- insertSentimentAlertsSchema

---

### Batch 6: Sentiment & Forms (Schemas 65-74)
**File:** `migration-batch-06.md`  
**Schemas:** 10  
**Focus:** Sentiment analysis, form completion  
**Priority:** Medium

**Includes:**
- insertSentimentSegmentsSchema
- insertSentimentTrendSchema
- insertSavePatternSchema
- insertFormCompletionSchema
- insertUserFormHistorySchema
- insertCompletionFeedbackSchema
- insertValidationRuleSchema
- insertValidationErrorSchema
- insertInsightFeedbackSchema
- insertPredictionAccuracySchema

---

### Batch 7: Analytics & Scheduling (Schemas 75-84)
**File:** `migration-batch-07.md`  
**Schemas:** 10  
**Focus:** Cohorts, system metrics, meetings  
**Priority:** Medium

**Includes:**
- insertTrendAlertSchema
- insertCohortSchema
- insertCohortMetricSchema
- insertCohortInsightSchema
- insertSystemMetricSchema
- insertSchedulingPreferencesSchema
- insertMeetingSuggestionsSchema
- insertSchedulingPatternsSchema
- insertMeetingEventsSchema
- insertTicketSchema

---

### Batch 8: Tickets & Pricing (Schemas 85-94)
**File:** `migration-batch-08.md`  
**Schemas:** 10  
**Focus:** Support tickets, pricing, image processing  
**Priority:** Medium

**Includes:**
- insertRoutingRuleSchema
- insertTicketRoutingSchema
- insertAgentExpertiseSchema
- insertExtractionTemplateSchema
- insertExtractedDataSchema
- insertPricingRulesSchema
- insertPriceHistorySchema
- insertPricingPerformanceSchema
- insertImageProcessingSchema
- insertImagePresetsSchema

---

### Batch 9: Media Processing (Schemas 95-102) - Final Batch
**File:** `migration-batch-09.md`  
**Schemas:** 8  
**Focus:** Face detection, OCR, transcription  
**Priority:** Medium

**Includes:**
- insertFaceDetectionSchema
- insertPrivacySettingsSchema
- insertOcrResultSchema
- insertOcrCorrectionSchema
- insertTranscriptionSchema
- insertTranscriptEditSchema
- insertModerationAppealSchema (if exists)
- insertSuspiciousActivitySchema (if exists)

---

## Migration Workflow

For each batch:

### 1. Preparation
- [ ] Open the batch migration document
- [ ] Review all 10 schemas in the batch
- [ ] Identify JSON columns in table definitions

### 2. Migration
- [ ] Update each schema to use `.omit().extend()` pattern
- [ ] Add explicit Zod schemas for all JSON columns
- [ ] Export TypeScript type using `z.infer`
- [ ] Preserve all existing validation rules

### 3. Verification
- [ ] Run LSP diagnostics on `shared/schema.ts` - verify 0 errors
- [ ] Test type inference on 2-3 schemas - verify no `unknown` types
- [ ] Update batch document progress tracking
- [ ] Update master progress counter

### 4. Documentation
- [ ] Mark batch as complete in master index
- [ ] Update `insert-schema-updates.md` with results
- [ ] Create type inference verification if needed

---

## Progress Tracking

### Overall Status
```
Progress: ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 13.7%

✅ Phase 1:      14 schemas (Complete)
📋 Batch 1:      10 schemas (Not Started)
📋 Batch 2:      10 schemas (Not Started)
📋 Batch 3:      10 schemas (Not Started)
📋 Batch 4:      10 schemas (Not Started)
📋 Batch 5:      10 schemas (Not Started)
📋 Batch 6:      10 schemas (Not Started)
📋 Batch 7:      10 schemas (Not Started)
📋 Batch 8:      10 schemas (Not Started)
📋 Batch 9:       8 schemas (Not Started)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Total:       102 schemas
```

### Batch Completion Status

| Batch | Status | Schemas | Progress | Document |
|-------|--------|---------|----------|----------|
| Phase 1 | ✅ Complete | 1-14 (14) | 14/14 (100%) | See `insert-schema-updates.md` |
| Batch 1 | 🔴 Not Started | 15-24 (10) | 0/10 (0%) | `migration-batch-01.md` |
| Batch 2 | 🔴 Not Started | 25-34 (10) | 0/10 (0%) | `migration-batch-02.md` |
| Batch 3 | 🔴 Not Started | 35-44 (10) | 0/10 (0%) | `migration-batch-03.md` |
| Batch 4 | 🔴 Not Started | 45-54 (10) | 0/10 (0%) | `migration-batch-04.md` |
| Batch 5 | 🔴 Not Started | 55-64 (10) | 0/10 (0%) | `migration-batch-05.md` |
| Batch 6 | 🔴 Not Started | 65-74 (10) | 0/10 (0%) | `migration-batch-06.md` |
| Batch 7 | 🔴 Not Started | 75-84 (10) | 0/10 (0%) | `migration-batch-07.md` |
| Batch 8 | 🔴 Not Started | 85-94 (10) | 0/10 (0%) | `migration-batch-08.md` |
| Batch 9 | 🔴 Not Started | 95-102 (8) | 0/8 (0%) | `migration-batch-09.md` |

---

## Quick Start Guide

### To Begin Migration

1. **Start with Batch 1** (Highest priority)
   ```bash
   cat migration-batch-01.md
   ```

2. **Review the BEFORE/AFTER examples** for each schema

3. **Locate each schema** in `shared/schema.ts` using the provided line numbers

4. **Apply the migration pattern** exactly as shown

5. **Verify with LSP** to ensure 0 errors

6. **Move to next batch** after verification

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `shared/schema.ts` | Main schema file to be updated |
| `insert-schema-updates.md` | Comprehensive verification document |
| `type-inference-verification.md` | Type inference test results |
| `migration-batch-01.md` | Batch 1 migration guide (schemas 15-24) |
| `migration-batch-02.md` | Batch 2 migration guide (schemas 25-34) |
| `migration-batch-03.md` | Batch 3 migration guide (schemas 35-44) |
| `migration-batch-04.md` | Batch 4 migration guide (schemas 45-54) |
| `migration-batch-05.md` | Batch 5 migration guide (schemas 55-64) |
| `migration-batch-06.md` | Batch 6 migration guide (schemas 65-74) |
| `migration-batch-07.md` | Batch 7 migration guide (schemas 75-84) |
| `migration-batch-08.md` | Batch 8 migration guide (schemas 85-94) |
| `migration-batch-09.md` | Batch 9 migration guide (schemas 95-102) |
| `migration-master-index.md` | This file - master navigation |

---

## Benefits Achieved

Once all migrations are complete, the entire codebase will have:

✅ **Type Safety:** No `unknown` types in JSON fields  
✅ **Autocomplete:** Full IDE support for nested properties  
✅ **Runtime Validation:** Zod validates all JSON structures  
✅ **Documentation:** Self-documenting schema definitions  
✅ **Maintainability:** Easier refactoring with type inference  
✅ **Error Prevention:** Compile-time catches vs runtime bugs

---

## Ready to Begin?

✅ All 9 batch documents created  
✅ All 88 schemas organized and documented  
✅ Migration pattern established and verified  
✅ First 14 schemas already complete and tested  

**Next Step:** Review `migration-batch-01.md` and begin migrating schemas 15-24.

