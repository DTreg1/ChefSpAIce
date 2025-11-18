# Agent Prompts Guide - Schema Fixes

## Overview
Copy and paste these prompts to the AI agent one at a time. Each prompt is a complete instruction that the agent can execute independently.

---

## Prompt 1: Identify All Broken Schemas

```
Create a report showing all broken schemas. Run this command and show me the output:

cd /home/runner/workspace/shared/schema && for file in content.ts experiments.ts extraction.ts forms.ts images.ts pricing.ts scheduling.ts security.ts sentiment.ts support.ts transcription.ts; do count=$(grep -c "createInsertSchema()" "$file" 2>/dev/null || echo "0"); [ "$count" -gt "0" ] && echo "$file: $count broken schemas"; done
```

---

## Prompt 2: Fix forms.ts

```
Fix all 4 broken schemas in shared/schema/forms.ts:

1. Replace lines 478-481 (insertUserFormHistorySchema with orphaned fragments) with:
   export const insertUserFormHistorySchema = createInsertSchema(userFormHistory);

2. Change insertCompletionFeedbackSchema from createInsertSchema() to createInsertSchema(completionFeedback)

3. Change insertValidationRuleSchema from createInsertSchema() to createInsertSchema(validationRules)

4. Change insertValidationErrorSchema from createInsertSchema() to createInsertSchema(validationErrors)

Then verify no createInsertSchema() calls remain in the file.
```

---

## Prompt 3: Fix content.ts

```
Fix all 6 broken schemas in shared/schema/content.ts by adding the table parameter to each createInsertSchema() call:

- insertCategorySchema → createInsertSchema(categories)
- insertContentCategorySchema → createInsertSchema(contentCategories)
- insertTagSchema → createInsertSchema(tags)
- insertContentTagSchema → createInsertSchema(contentTags)
- insertContentEmbeddingSchema → createInsertSchema(contentEmbeddings)
- insertRelatedContentCacheSchema → createInsertSchema(relatedContentCache)

Verify no createInsertSchema() calls remain in the file.
```

---

## Prompt 4: Fix experiments.ts

```
Fix all 5 broken schemas in shared/schema/experiments.ts by adding the table parameter to each createInsertSchema() call:

- insertExperimentSchema → createInsertSchema(experiments)
- insertExperimentVariantSchema → createInsertSchema(experimentVariants)
- insertUserVariantSchema → createInsertSchema(userVariants)
- insertVariantMetricSchema → createInsertSchema(variantMetrics)
- insertCohortSchema → createInsertSchema(cohorts)

Verify no createInsertSchema() calls remain in the file.
```

---

## Prompt 5: Fix extraction.ts

```
Fix all 2 broken schemas in shared/schema/extraction.ts by adding the table parameter to each createInsertSchema() call:

- insertExtractionPatternSchema → createInsertSchema(extractionPatterns)
- insertExtractedContentSchema → createInsertSchema(extractedContents)

Verify no createInsertSchema() calls remain in the file.
```

---

## Prompt 6: Fix images.ts

```
Fix all 7 broken schemas in shared/schema/images.ts by adding the table parameter to each createInsertSchema() call:

- insertImagePresetSchema → createInsertSchema(imagePresets)
- insertUserImageSchema → createInsertSchema(userImages)
- insertImageGenerationSchema → createInsertSchema(imageGenerations)
- insertFaceDetectionSchema → createInsertSchema(faceDetections)
- insertImageAnalysisSchema → createInsertSchema(imageAnalyses)
- insertImageCollectionSchema → createInsertSchema(imageCollections)
- insertCollectionImageSchema → createInsertSchema(collectionImages)

Verify no createInsertSchema() calls remain in the file.
```

---

## Prompt 7: Fix pricing.ts

```
Fix all 2 broken schemas in shared/schema/pricing.ts by adding the table parameter to each createInsertSchema() call:

- insertPricingRuleSchema → createInsertSchema(pricingRules)
- insertUserPricingSchema → createInsertSchema(userPricing)

Verify no createInsertSchema() calls remain in the file.
```

---

## Prompt 8: Fix scheduling.ts

```
Fix all 3 broken schemas in shared/schema/scheduling.ts by adding the table parameter to each createInsertSchema() call:

- insertScheduledActionSchema → createInsertSchema(scheduledActions)
- insertRecurrenceRuleSchema → createInsertSchema(recurrenceRules)
- insertScheduleExecutionSchema → createInsertSchema(scheduleExecutions)

Verify no createInsertSchema() calls remain in the file.
```

---

## Prompt 9: Fix security.ts

```
Fix all 3 broken schemas in shared/schema/security.ts by adding the table parameter to each createInsertSchema() call:

- insertSecurityEventSchema → createInsertSchema(securityEvents)
- insertLoginAttemptSchema → createInsertSchema(loginAttempts)
- insertAccountLockSchema → createInsertSchema(accountLocks)

Verify no createInsertSchema() calls remain in the file.
```

---

## Prompt 10: Fix sentiment.ts

```
Fix all 4 broken schemas in shared/schema/sentiment.ts by adding the table parameter to each createInsertSchema() call:

- insertSentimentAnalysisSchema → createInsertSchema(sentimentAnalyses)
- insertReadabilityScoreSchema → createInsertSchema(readabilityScores)
- insertKeywordExtractionSchema → createInsertSchema(keywordExtractions)
- insertTextSummarySchema → createInsertSchema(textSummaries)

Verify no createInsertSchema() calls remain in the file.
```

---

## Prompt 11: Fix support.ts

```
Fix all 2 broken schemas in shared/schema/support.ts by adding the table parameter to each createInsertSchema() call:

- insertSupportTicketSchema → createInsertSchema(supportTickets)
- insertTicketMessageSchema → createInsertSchema(ticketMessages)

Verify no createInsertSchema() calls remain in the file.
```

---

## Prompt 12: Fix transcription.ts

```
Fix all 2 broken schemas in shared/schema/transcription.ts by adding the table parameter to each createInsertSchema() call:

- insertTranscriptionSchema → createInsertSchema(transcriptions)
- insertTranscriptionSegmentSchema → createInsertSchema(transcriptionSegments)

Verify no createInsertSchema() calls remain in the file.
```

---

## Prompt 13: Final Verification

```
Verify all schema files are fixed by checking each file for any remaining createInsertSchema() calls without table parameters. Show me a summary of the status of all 11 files (forms.ts, content.ts, experiments.ts, extraction.ts, images.ts, pricing.ts, scheduling.ts, security.ts, sentiment.ts, support.ts, transcription.ts).
```

---

## Prompt 14: Test Application

```
Restart the application workflow and check if TypeScript compilation succeeds. Show me any errors if they occur.
```

---

## Summary

- **Total prompts:** 14
- **Total schemas to fix:** 39 across 11 files
- **Estimated time:** 10-15 minutes (1 minute per prompt)

Send these prompts one at a time. Wait for confirmation that each step succeeded before moving to the next prompt.

---

## Quick Re-identification Prompt

If at any point you want to check which files still have broken schemas:

```
Check which schema files still have broken createInsertSchema() calls and show me the count for each file.
```
