# Detailed Breakdown of Broken Insert Schemas

## Quick Fix Reference

For each broken schema below, the fix is to restore the table parameter to `createInsertSchema()`.

---

## content.ts (6 broken schemas)

### Line numbers and fixes needed:

```typescript
// BROKEN → FIXED

export const insertCategorySchema = createInsertSchema()
→ export const insertCategorySchema = createInsertSchema(categories)

export const insertContentCategorySchema = createInsertSchema()
→ export const insertContentCategorySchema = createInsertSchema(contentCategories)

export const insertTagSchema = createInsertSchema()
→ export const insertTagSchema = createInsertSchema(tags)

export const insertContentTagSchema = createInsertSchema()
→ export const insertContentTagSchema = createInsertSchema(contentTags)

export const insertContentEmbeddingSchema = createInsertSchema()
→ export const insertContentEmbeddingSchema = createInsertSchema(contentEmbeddings)

export const insertRelatedContentCacheSchema = createInsertSchema()
→ export const insertRelatedContentCacheSchema = createInsertSchema(relatedContentCache)
```

---

## experiments.ts (5 broken schemas)

```typescript
export const insertExperimentSchema = createInsertSchema()
→ export const insertExperimentSchema = createInsertSchema(experiments)

export const insertExperimentVariantSchema = createInsertSchema()
→ export const insertExperimentVariantSchema = createInsertSchema(experimentVariants)

export const insertUserVariantSchema = createInsertSchema()
→ export const insertUserVariantSchema = createInsertSchema(userVariants)

export const insertVariantMetricSchema = createInsertSchema()
→ export const insertVariantMetricSchema = createInsertSchema(variantMetrics)

export const insertCohortSchema = createInsertSchema()
→ export const insertCohortSchema = createInsertSchema(cohorts)
```

---

## extraction.ts (2 broken schemas)

```typescript
export const insertExtractionPatternSchema = createInsertSchema()
→ export const insertExtractionPatternSchema = createInsertSchema(extractionPatterns)

export const insertExtractedContentSchema = createInsertSchema()
→ export const insertExtractedContentSchema = createInsertSchema(extractedContents)
```

---

## forms.ts (3 broken schemas)

**⚠️ CRITICAL: Line 481 has syntax error - orphaned closing brace**

```typescript
// Line 478-481 - BROKEN with orphaned fragment
export const insertUserFormHistorySchema = createInsertSchema()
  
    lastUpdated: true,
  });

// SHOULD BE:
export const insertUserFormHistorySchema = createInsertSchema(userFormHistory);


// Line 487 - Missing table parameter
export const insertCompletionFeedbackSchema = createInsertSchema()
→ export const insertCompletionFeedbackSchema = createInsertSchema(completionFeedback)

// Line 497 - Missing table parameter
export const insertValidationRuleSchema = createInsertSchema()
→ export const insertValidationRuleSchema = createInsertSchema(validationRules)

// Additional broken schema (line 507)
export const insertValidationErrorSchema = createInsertSchema()
→ export const insertValidationErrorSchema = createInsertSchema(validationErrors)
```

---

## images.ts (7 broken schemas)

```typescript
export const insertImagePresetSchema = createInsertSchema()
→ export const insertImagePresetSchema = createInsertSchema(imagePresets)

export const insertUserImageSchema = createInsertSchema()
→ export const insertUserImageSchema = createInsertSchema(userImages)

export const insertImageGenerationSchema = createInsertSchema()
→ export const insertImageGenerationSchema = createInsertSchema(imageGenerations)

export const insertFaceDetectionSchema = createInsertSchema()
→ export const insertFaceDetectionSchema = createInsertSchema(faceDetections)

export const insertImageAnalysisSchema = createInsertSchema()
→ export const insertImageAnalysisSchema = createInsertSchema(imageAnalyses)

export const insertImageCollectionSchema = createInsertSchema()
→ export const insertImageCollectionSchema = createInsertSchema(imageCollections)

export const insertCollectionImageSchema = createInsertSchema()
→ export const insertCollectionImageSchema = createInsertSchema(collectionImages)
```

---

## pricing.ts (2 broken schemas)

```typescript
export const insertPricingRuleSchema = createInsertSchema()
→ export const insertPricingRuleSchema = createInsertSchema(pricingRules)

export const insertUserPricingSchema = createInsertSchema()
→ export const insertUserPricingSchema = createInsertSchema(userPricing)
```

---

## scheduling.ts (3 broken schemas)

```typescript
export const insertScheduledActionSchema = createInsertSchema()
→ export const insertScheduledActionSchema = createInsertSchema(scheduledActions)

export const insertRecurrenceRuleSchema = createInsertSchema()
→ export const insertRecurrenceRuleSchema = createInsertSchema(recurrenceRules)

export const insertScheduleExecutionSchema = createInsertSchema()
→ export const insertScheduleExecutionSchema = createInsertSchema(scheduleExecutions)
```

---

## security.ts (3 broken schemas)

```typescript
export const insertSecurityEventSchema = createInsertSchema()
→ export const insertSecurityEventSchema = createInsertSchema(securityEvents)

export const insertLoginAttemptSchema = createInsertSchema()
→ export const insertLoginAttemptSchema = createInsertSchema(loginAttempts)

export const insertAccountLockSchema = createInsertSchema()
→ export const insertAccountLockSchema = createInsertSchema(accountLocks)
```

---

## sentiment.ts (4 broken schemas)

```typescript
export const insertSentimentAnalysisSchema = createInsertSchema()
→ export const insertSentimentAnalysisSchema = createInsertSchema(sentimentAnalyses)

export const insertReadabilityScoreSchema = createInsertSchema()
→ export const insertReadabilityScoreSchema = createInsertSchema(readabilityScores)

export const insertKeywordExtractionSchema = createInsertSchema()
→ export const insertKeywordExtractionSchema = createInsertSchema(keywordExtractions)

export const insertTextSummarySchema = createInsertSchema()
→ export const insertTextSummarySchema = createInsertSchema(textSummaries)
```

---

## support.ts (2 broken schemas)

```typescript
export const insertSupportTicketSchema = createInsertSchema()
→ export const insertSupportTicketSchema = createInsertSchema(supportTickets)

export const insertTicketMessageSchema = createInsertSchema()
→ export const insertTicketMessageSchema = createInsertSchema(ticketMessages)
```

---

## transcription.ts (2 broken schemas)

```typescript
export const insertTranscriptionSchema = createInsertSchema()
→ export const insertTranscriptionSchema = createInsertSchema(transcriptions)

export const insertTranscriptionSegmentSchema = createInsertSchema()
→ export const insertTranscriptionSegmentSchema = createInsertSchema(transcriptionSegments)
```

---

## Summary Stats

- **Total broken schemas:** 39
- **Files affected:** 11
- **Syntax errors requiring extra cleanup:** 1 (forms.ts line 481)
- **Pattern:** All are simple parameter restorations except forms.ts which has orphaned fragments

---

## Automated Fix Script Template

```bash
# Fix forms.ts first (has syntax error)
sed -i '478,481s/.*/export const insertUserFormHistorySchema = createInsertSchema(userFormHistory);/' shared/schema/forms.ts

# Then fix all createInsertSchema() → createInsertSchema(tableName)
# (Would need proper table name mapping for each file)
```

**Recommendation:** Manual fixes safer given previous script failures. Estimated time: 20-30 minutes.
