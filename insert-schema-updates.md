# Insert Schema Updates - Verification Document

## Summary

**Total Insert Schemas:** 102  
**Pattern:** All schemas should use `.omit().extend()` to properly type JSON columns  
**Verification Date:** 2025-01-13

---

## Updated Schemas (Using .omit().extend() Pattern)

| # | Table Name | Insert Schema | JSON Fields Extended | Type Exported | Verified |
|---|------------|---------------|---------------------|---------------|----------|
| 1 | `fraudDetectionResults` | `insertFraudDetectionResultSchema` | `analysisType`, `riskLevel`, `riskFactors`, `evidenceDetails`, `deviceInfo`, `behaviorData`, `metadata` | ✅ `InsertFraudDetectionResult` | ✅ Yes |
| 2 | `sentimentResults` | `insertSentimentResultSchema` | `sentiment`, `sentimentData`, `emotionScores`, `keyPhrases`, `contextFactors`, `aspectSentiments`, `metadata` | ✅ `InsertSentimentResult` | ✅ Yes |
| 3 | `abTests` | `insertAbTestSchema` | `metadata` (AbTestConfiguration) | ✅ `InsertAbTest` | ✅ Yes |
| 4 | `abTestResults` | `insertAbTestResultSchema` | `variant`, `metadata` (AbTestMetrics) | ✅ `InsertAbTestResult` | ✅ Yes |
| 5 | `abTestInsights` | `insertAbTestInsightSchema` | `winner`, `recommendation`, `insights`, `statisticalAnalysis` | ✅ `InsertAbTestInsight` | ✅ Yes |
| 6 | `moderationLogs` | `insertModerationLogSchema` | `toxicityScores`, `actionTaken`, `severity` | ✅ `InsertModerationLog` | ✅ Yes |
| 7 | `messages` | `insertMessageSchema` | `metadata` (ChatMessageMetadata) | ✅ `InsertMessage` | ✅ Yes |
| 8 | `generatedDrafts` | `insertGeneratedDraftSchema` | `metadata` (flexible) | ✅ `InsertGeneratedDraft` | ✅ Yes |
| 9 | `autoSaveDrafts` | `insertAutoSaveDraftSchema` | `documentType`, `version`, `metadata` (AutoSaveData) | ✅ `InsertAutoSaveDraft` | ✅ Yes |
| 10 | `analyticsInsights` | `insertAnalyticsInsightSchema` | `metricData`, `aiContext` | ✅ `InsertAnalyticsInsight` | ✅ Yes |
| 11 | `userPredictions` | `insertUserPredictionSchema` | `factors` (PredictionData) | ✅ `InsertUserPrediction` | ✅ Yes |
| 12 | `trends` | `insertTrendSchema` | `dataPoints`, `recommendations`, `metadata` | ✅ `InsertTrend` | ✅ Yes |
| 13 | `maintenancePredictions` | `insertMaintenancePredictionSchema` | `urgencyLevel`, `status`, `preventiveActions`, `features` | ✅ `InsertMaintenancePrediction` | ✅ Yes |
| 14 | `maintenanceHistory` | `insertMaintenanceHistorySchema` | `outcome`, `performedActions`, `performanceMetrics`, `cost` | ✅ `InsertMaintenanceHistory` | ✅ Yes |

---

## Schemas Using OLD Pattern (Need Review/Update)

These schemas use the old `createInsertSchema(table, { overrides }).omit()` pattern and may need updates:

| # | Table Name | Insert Schema | Status | Notes |
|---|------------|---------------|--------|-------|
| 15 | `authProviders` | `insertAuthProviderSchema` | ⚠️ Old Pattern | Uses column overrides |
| 16 | `userStorage` | `insertUserStorageSchema` | ⚠️ Old Pattern | Simple `.omit()` only |
| 17 | `pushTokens` | `insertPushTokenSchema` | ⚠️ Old Pattern | Uses column overrides |
| 18 | `notificationPreferences` | `insertNotificationPreferencesSchema` | ⚠️ Old Pattern | Uses column overrides |
| 19 | `notificationScores` | `insertNotificationScoresSchema` | ⚠️ Old Pattern | Uses column overrides |
| 20 | `notificationFeedback` | `insertNotificationFeedbackSchema` | ⚠️ Old Pattern | Uses column overrides |
| 21 | `notificationHistory` | `insertNotificationHistorySchema` | ⚠️ Old Pattern | Uses column overrides |
| 22 | `userAppliances` | `insertUserApplianceSchema` | ⚠️ Old Pattern | Simple `.omit()` only |
| 23 | `userInventory` | `insertUserInventorySchema` | ⚠️ Old Pattern | Uses column overrides |
| 24 | `userRecipes` | `insertRecipeSchema` | ⚠️ Old Pattern | Uses column overrides |
| 25 | `mealPlans` | `insertMealPlanSchema` | ⚠️ Old Pattern | Simple `.omit()` only |
| 26 | `apiUsageLogs` | `insertApiUsageLogSchema` | ⚠️ Old Pattern | Simple `.omit()` only |
| 27 | `fdcCache` | `insertFdcCacheSchema` | ⚠️ Old Pattern | Uses column overrides |
| 28 | `userShopping` | `insertShoppingListItemSchema` | ⚠️ Old Pattern | Simple `.omit()` only |
| 29 | `userFeedback` | `insertFeedbackSchema` | ⚠️ Old Pattern | Uses column overrides |
| 30 | `donations` | `insertDonationSchema` | ⚠️ Old Pattern | Simple `.omit()` only |
| 31 | `webVitals` | `insertWebVitalSchema` | ⚠️ Old Pattern | Uses column overrides |
| 32 | `contentEmbeddings` | `insertContentEmbeddingSchema` | ⚠️ Old Pattern | Uses column overrides |
| 33 | `searchLogs` | `insertSearchLogSchema` | ⚠️ Old Pattern | Simple `.omit()` only |
| 34 | `categories` | `insertCategorySchema` | ⚠️ Old Pattern | Simple `.omit()` only |
| 35 | `contentCategories` | `insertContentCategorySchema` | ⚠️ Old Pattern | Simple `.omit()` only |
| 36 | `tags` | `insertTagSchema` | ⚠️ Old Pattern | Simple `.omit()` only |
| 37 | `contentTags` | `insertContentTagSchema` | ⚠️ Old Pattern | Simple `.omit()` only |
| 38 | `duplicatePairs` | `insertDuplicatePairSchema` | ⚠️ Old Pattern | Simple `.omit()` only |
| 39 | `relatedContentCache` | `insertRelatedContentCacheSchema` | ⚠️ Old Pattern | Uses column overrides |
| 40 | `queryLogs` | `insertQueryLogSchema` | ⚠️ Old Pattern | Uses column overrides |
| 41 | `analyticsEvents` | `insertAnalyticsEventSchema` | ⚠️ Old Pattern | Uses column overrides |
| 42 | `userSessions` | `insertUserSessionSchema` | ⚠️ Old Pattern | Uses column overrides |
| 43 | `onboardingInventory` | `insertOnboardingInventorySchema` | ⚠️ Old Pattern | Uses column overrides |
| 44 | `cookingTerms` | `insertCookingTermSchema` | ⚠️ Old Pattern | Simple `.omit()` only |
| 45 | `applianceLibrary` | `insertApplianceLibrarySchema` | ⚠️ Old Pattern | Simple `.omit()` only |
| 46 | `conversations` | `insertConversationSchema` | ⚠️ Old Pattern | Simple `.omit()` only |
| 47 | `conversationContext` | `insertConversationContextSchema` | ⚠️ Old Pattern | Uses column overrides |
| 48 | `voiceCommands` | `insertVoiceCommandSchema` | ⚠️ Old Pattern | Simple `.omit()` only |
| 49 | `draftTemplates` | `insertDraftTemplateSchema` | ⚠️ Old Pattern | Simple `.omit()` only |
| 50 | `writingSessions` | `insertWritingSessionSchema` | ⚠️ Old Pattern | Uses column overrides |
| 51 | `writingSuggestions` | `insertWritingSuggestionSchema` | ⚠️ Old Pattern | Simple `.omit()` only |
| 52 | `activityLogs` | `insertActivityLogSchema` | ⚠️ Old Pattern | Uses column overrides |
| 53 | `summaries` | `insertSummarySchema` | ⚠️ Old Pattern | Uses column overrides |
| 54 | `excerpts` | `insertExcerptSchema` | ⚠️ Old Pattern | Uses column overrides |
| 55 | `excerptPerformance` | `insertExcerptPerformanceSchema` | ⚠️ Old Pattern | Uses column overrides |
| 56 | `translations` | `insertTranslationSchema` | ⚠️ Old Pattern | Uses column overrides |
| 57 | `languagePreferences` | `insertLanguagePreferenceSchema` | ⚠️ Old Pattern | Simple `.omit()` only |
| 58 | `imageMetadata` | `insertImageMetadataSchema` | ⚠️ Old Pattern | Uses column overrides |
| 59 | `altTextQuality` | `insertAltTextQualitySchema` | ⚠️ Old Pattern | Uses column overrides |
| 60 | `blockedContent` | `insertBlockedContentSchema` | ⚠️ Old Pattern | Uses column overrides |
| 61 | `moderationAppeals` | `insertModerationAppealSchema` | ⚠️ Old Pattern | Simple `.omit()` only |
| 62 | `fraudReviews` | `insertFraudReviewSchema` | ⚠️ Old Pattern | Uses column overrides |
| 63 | `sentimentMetrics` | `insertSentimentMetricsSchema` | ⚠️ Old Pattern | Uses column overrides |
| 64 | `sentimentAlerts` | `insertSentimentAlertsSchema` | ⚠️ Old Pattern | Uses column overrides |
| 65 | `sentimentSegments` | `insertSentimentSegmentsSchema` | ⚠️ Old Pattern | Uses column overrides |
| 66 | `sentimentTrends` | `insertSentimentTrendSchema` | ⚠️ Old Pattern | Uses column overrides |
| 67 | `savePatterns` | `insertSavePatternSchema` | ⚠️ Old Pattern | Uses column overrides |
| 68 | `formCompletions` | `insertFormCompletionSchema` | ⚠️ Old Pattern | Uses column overrides |
| 69 | `userFormHistory` | `insertUserFormHistorySchema` | ⚠️ Old Pattern | Uses column overrides |
| 70 | `completionFeedback` | `insertCompletionFeedbackSchema` | ⚠️ Old Pattern | Uses column overrides |
| 71 | `validationRules` | `insertValidationRuleSchema` | ⚠️ Old Pattern | Uses column overrides |
| 72 | `validationErrors` | `insertValidationErrorSchema` | ⚠️ Old Pattern | Uses column overrides |
| 73 | `insightFeedback` | `insertInsightFeedbackSchema` | ⚠️ Old Pattern | Simple `.omit()` only |
| 74 | `predictionAccuracy` | `insertPredictionAccuracySchema` | ⚠️ Old Pattern | Uses column overrides |
| 75 | `trendAlerts` | `insertTrendAlertSchema` | ⚠️ Old Pattern | Uses column overrides |
| 76 | `cohorts` | `insertCohortSchema` | ⚠️ Old Pattern | Uses column overrides |
| 77 | `cohortMetrics` | `insertCohortMetricSchema` | ⚠️ Old Pattern | Uses column overrides |
| 78 | `cohortInsights` | `insertCohortInsightSchema` | ⚠️ Old Pattern | Uses column overrides |
| 79 | `systemMetrics` | `insertSystemMetricSchema` | ⚠️ Old Pattern | Uses column overrides |
| 80 | `schedulingPreferences` | `insertSchedulingPreferencesSchema` | ⚠️ Old Pattern | Uses column overrides |
| 81 | `meetingSuggestions` | `insertMeetingSuggestionsSchema` | ⚠️ Old Pattern | Uses column overrides |
| 82 | `schedulingPatterns` | `insertSchedulingPatternsSchema` | ⚠️ Old Pattern | Uses column overrides |
| 83 | `meetingEvents` | `insertMeetingEventsSchema` | ⚠️ Old Pattern | Uses column overrides |
| 84 | `tickets` | `insertTicketSchema` | ⚠️ Old Pattern | Simple `.omit()` only |
| 85 | `routingRules` | `insertRoutingRuleSchema` | ⚠️ Old Pattern | Simple `.omit()` only |
| 86 | `ticketRouting` | `insertTicketRoutingSchema` | ⚠️ Old Pattern | Simple `.omit()` only |
| 87 | `agentExpertise` | `insertAgentExpertiseSchema` | ⚠️ Old Pattern | Uses column overrides |
| 88 | `extractionTemplates` | `insertExtractionTemplateSchema` | ⚠️ Old Pattern | Uses column overrides |
| 89 | `extractedData` | `insertExtractedDataSchema` | ⚠️ Old Pattern | Uses column overrides |
| 90 | `pricingRules` | `insertPricingRulesSchema` | ⚠️ Old Pattern | Uses column overrides |
| 91 | `priceHistory` | `insertPriceHistorySchema` | ⚠️ Old Pattern | Uses column overrides |
| 92 | `pricingPerformance` | `insertPricingPerformanceSchema` | ⚠️ Old Pattern | Simple `.omit()` only |
| 93 | `imageProcessing` | `insertImageProcessingSchema` | ⚠️ Old Pattern | Simple `.omit()` only |
| 94 | `imagePresets` | `insertImagePresetsSchema` | ⚠️ Old Pattern | Simple `.omit()` only |
| 95 | `faceDetections` | `insertFaceDetectionSchema` | ⚠️ Old Pattern | Simple `.omit()` only |
| 96 | `privacySettings` | `insertPrivacySettingsSchema` | ⚠️ Old Pattern | Simple `.omit()` only |
| 97 | `ocrResults` | `insertOcrResultSchema` | ⚠️ Old Pattern | Simple `.omit()` only |
| 98 | `ocrCorrections` | `insertOcrCorrectionSchema` | ⚠️ Old Pattern | Simple `.omit()` only |
| 99 | `transcriptions` | `insertTranscriptionSchema` | ⚠️ Old Pattern | Simple `.omit()` only |
| 100 | `transcriptEdits` | `insertTranscriptEditSchema` | ⚠️ Old Pattern | Simple `.omit()` only |

**Note:** Schemas 15-100 need further investigation to determine if they have JSON columns that require the `.omit().extend()` pattern.

---

## Verification Checklist

For each schema, verify:

- [x] 1. Uses `.omit().extend()` pattern (not old column override pattern)
- [x] 2. Auto-generated fields (id, createdAt, updatedAt, defaults) are in `.omit()`
- [x] 3. All JSON columns from table are in `.extend()`
- [x] 4. Optional JSON fields use `.optional()`
- [x] 5. Required JSON fields don't use `.optional()`
- [x] 6. Exports TypeScript type using `z.infer<typeof schema>`
- [x] 7. No LSP errors

---

## Pattern Comparison

### ✅ NEW PATTERN (Correct)
```typescript
export const insertExampleSchema = createInsertSchema(exampleTable)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    jsonField: jsonFieldSchema,
    optionalJson: optionalJsonSchema.optional(),
  });

export type InsertExample = z.infer<typeof insertExampleSchema>;
```

### ❌ OLD PATTERN (Deprecated)
```typescript
export const insertExampleSchema = createInsertSchema(exampleTable, {
  jsonField: jsonFieldSchema,
  optionalJson: optionalJsonSchema.optional(),
}).omit({
  id: true,
  createdAt: true,
});
```

---

## Progress Summary

- **Updated:** 14 schemas ✅
- **Remaining:** 88 schemas ⚠️
- **Total:** 102 schemas
- **Completion:** 13.7%

---

## Next Steps

1. Continue systematic review of remaining schemas
2. Update schemas with JSON columns to use `.omit().extend()` pattern
3. Verify each updated schema has no LSP errors
4. Ensure backward compatibility is maintained
5. Update storage.ts implementations if needed

