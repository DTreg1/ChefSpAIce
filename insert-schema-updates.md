# Insert Schema Verification Document

## Overview
This document verifies that all insert schemas with JSONB columns use the `.extend()` pattern to preserve type information.

## Verification Criteria
1. ✅ Every insert schema uses `.extend()` to override JSON fields
2. ✅ Auto-generated fields (id, createdAt, updatedAt) are omitted
3. ✅ Optional JSON fields use `.optional()`
4. ✅ Required JSON fields don't use `.optional()`
5. ✅ All JSON columns from the table are included
6. ✅ Each schema exports a corresponding TypeScript type using `z.infer`

---

## Verified Tables with JSONB Columns

| Table Name | Insert Schema | JSON Fields Extended | Type Exported | Verified |
|-----------|---------------|---------------------|---------------|----------|
| **Sentiment Analysis** |
| `sentimentResults` | `insertSentimentResultsSchema` | `sentimentData`, `emotionScores`, `keyPhrases`, `contextFactors`, `aspectSentiments`, `metadata` | `InsertSentimentResults` | ✅ Yes |
| `sentimentMetrics` | `insertSentimentMetricsSchema` | `categories`, `painPoints`, `metadata` | `InsertSentimentMetrics` | ❌ No - Needs update |
| `sentimentAlerts` | `insertSentimentAlertsSchema` | `metadata` | `InsertSentimentAlerts` | ❌ No - Needs update |
| `sentimentTrends` | `insertSentimentTrendSchema` | `sentimentCounts`, `dominantEmotions`, `contentTypes`, `metadata` | `InsertSentimentTrend` | ❌ No - Needs update |
| **Fraud Detection** |
| `fraudScores` | `insertFraudScoreSchema` | `factors` | `InsertFraudScore` | ✅ Yes |
| `suspiciousActivities` | `insertSuspiciousActivitySchema` | `details` | `InsertSuspiciousActivity` | ✅ Yes |
| `fraudReviews` | `insertFraudReviewSchema` | `restrictions` | `InsertFraudReview` | ✅ Yes |
| `fraudDetectionResults` | `insertFraudDetectionResultsSchema` | `riskFactors`, `evidenceDetails`, `deviceInfo`, `behaviorData`, `metadata` | `InsertFraudDetectionResults` | ✅ Yes |
| **Cohort Analysis** |
| `cohorts` | `insertCohortSchema` | `definition`, `metadata` | `InsertCohort` | ✅ Yes |
| `cohortMetrics` | `insertCohortMetricSchema` | `segmentData`, `comparisonData` | `InsertCohortMetric` | ✅ Yes |
| `cohortInsights` | `insertCohortInsightSchema` | `supportingData` | `InsertCohortInsight` | ✅ Yes |
| **A/B Testing** |
| `abTests` | `insertAbTestSchema` | `metadata` (AbTestConfiguration) | `InsertAbTest` | ✅ Yes |
| `abTestResults` | `insertAbTestResultSchema` | `metadata` (AbTestMetrics) | `InsertAbTestResult` | ✅ Yes |
| `abTestInsights` | `insertAbTestInsightSchema` | `insights`, `statisticalAnalysis` | `InsertAbTestInsight` | ✅ Yes |
| **Moderation** |
| `moderationLogs` | `insertModerationLogSchema` | `toxicityScores` | `InsertModerationLog` | ✅ Yes |
| `blockedContent` | `insertBlockedContentSchema` | `metadata` | `InsertBlockedContent` | ❌ No - Needs update |
| **Chat & Messaging** |
| `messages` | `insertMessageSchema` | `metadata` | `InsertMessage` | ✅ Yes |
| `conversationContext` | `insertConversationContextSchema` | `keyFacts` | `InsertConversationContext` | ❌ No - Needs update |
| **Auto-Save** |
| `autoSaveDrafts` | `insertAutoSaveDraftSchema` | `metadata` | `InsertAutoSaveDraft` | ✅ Yes |
| `savePatterns` | `insertSavePatternSchema` | `patternData`, `modelWeights` | `InsertSavePattern` | ❌ No - Needs update |
| **Analytics** |
| `analyticsInsights` | `insertAnalyticsInsightSchema` | `metricData`, `aiContext` | `InsertAnalyticsInsight` | ✅ Yes |
| `analyticsEvents` | `insertAnalyticsEventSchema` | `properties` | `InsertAnalyticsEvent` | ❌ No - Needs update |
| `userPredictions` | `insertUserPredictionSchema` | `factors` | `InsertUserPrediction` | ✅ Yes |
| `predictionAccuracy` | `insertPredictionAccuracySchema` | `modelFeedback` | `InsertPredictionAccuracy` | ❌ No - Needs update |
| `trends` | `insertTrendSchema` | `dataPoints`, `recommendations`, `metadata` | `InsertTrend` | ✅ Yes |
| `trendAlerts` | `insertTrendAlertSchema` | `conditions`, `metadata` | `InsertTrendAlert` | ❌ No - Needs update |
| **Predictive Maintenance** |
| `systemMetrics` | `insertSystemMetricSchema` | `metadata` | `InsertSystemMetric` | ✅ Yes |
| `maintenancePredictions` | `insertMaintenancePredictionSchema` | `preventiveActions`, `features` | `InsertMaintenancePrediction` | ✅ Yes |
| `maintenanceHistory` | `insertMaintenanceHistorySchema` | `performedActions`, `performanceMetrics`, `cost` | `InsertMaintenanceHistory` | ✅ Yes |
| **Content & Search** |
| `contentEmbeddings` | `insertContentEmbeddingSchema` | `embedding`, `metadata` | `InsertContentEmbedding` | ❌ No - Needs update |
| `relatedContentCache` | `insertRelatedContentCacheSchema` | `relatedItems` | `InsertRelatedContentCache` | ❌ No - Needs update |
| `queryLogs` | `insertQueryLogSchema` | `metadata` | `InsertQueryLog` | ❌ No - Needs update |
| **User Feedback** |
| `userFeedback` | `insertFeedbackSchema` | `upvotes`, `responses`, `attachments`, `tags` | `InsertFeedback` | ❌ No - Needs update |
| **Recipes & Nutrition** |
| `userInventory` | `insertUserInventorySchema` | `usdaData`, `barcodeData` | `InsertUserInventory` | ❌ No - Needs update |
| `userRecipes` | `insertRecipeSchema` | `dietaryInfo`, `nutrition`, `tags`, `neededEquipment` | `InsertRecipe` | ❌ No - Needs update |
| `fdcCache` | `insertFdcCacheSchema` | `nutrients`, `fullData` | `InsertFdcCache` | ❌ No - Needs update |
| `onboardingInventory` | `insertOnboardingInventorySchema` | `nutrition`, `usdaData`, `barcodeLookupData` | `InsertOnboardingInventory` | ❌ No - Needs update |
| **Notifications** |
| `notificationPreferences` | `insertNotificationPreferencesSchema` | `notificationTypes`, `quietHours` | `InsertNotificationPreferences` | ❌ No - Needs update |
| `notificationScores` | `insertNotificationScoresSchema` | `features` | `InsertNotificationScores` | ❌ No - Needs update |
| `notificationHistory` | `insertNotificationHistorySchema` | `data`, `deviceInfo` | `InsertNotificationHistory` | ❌ No - Needs update |
| **Push Tokens** |
| `pushTokens` | `insertPushTokenSchema` | `deviceInfo` | `InsertPushToken` | ❌ No - Needs update |
| **Auth & Storage** |
| `authProviders` | `insertAuthProviderSchema` | `metadata` | `InsertAuthProvider` | ❌ No - Needs update |
| **User Sessions** |
| `userSessions` | `insertUserSessionSchema` | `goalCompletions` | `InsertUserSession` | ❌ No - Needs update |
| **Writing & Drafts** |
| `draftTemplates` | `insertDraftTemplateSchema` | `metadata` | `InsertDraftTemplate` | ❌ No - Needs update |
| `writingSessions` | `insertWritingSessionSchema` | `improvementsApplied` | `InsertWritingSession` | ❌ No - Needs update |
| **Activity & Summaries** |
| `activityLogs` | `insertActivityLogSchema` | `metadata` | `InsertActivityLog` | ❌ No - Needs update |
| `summaries` | `insertSummarySchema` | `metadata` | `InsertSummary` | ❌ No - Needs update |
| `excerpts` | `insertExcerptSchema` | `generationParams`, `socialMetadata` | `InsertExcerpt` | ❌ No - Needs update |
| `excerptPerformance` | `insertExcerptPerformanceSchema` | `platformMetrics` | `InsertExcerptPerformance` | ❌ No - Needs update |
| **Translations** |
| `translations` | `insertTranslationSchema` | `translationMetadata` | `InsertTranslation` | ❌ No - Needs update |
| **Images** |
| `imageMetadata` | `insertImageMetadataSchema` | `dimensions`, `metadata` | `InsertImageMetadata` | ❌ No - Needs update |
| **Forms & Validation** |
| `formCompletions` | `insertFormCompletionSchema` | `commonValues`, `patterns`, `contextRules` | `InsertFormCompletion` | ❌ No - Needs update |
| `userFormHistory` | `insertUserFormHistorySchema` | `valuesUsed`, `frequencyMap`, `lastSequence`, `preferences` | `InsertUserFormHistory` | ❌ No - Needs update |
| `completionFeedback` | `insertCompletionFeedbackSchema` | `context` | `InsertCompletionFeedback` | ❌ No - Needs update |
| `validationRules` | `insertValidationRuleSchema` | `rules`, `errorMessages`, `suggestions`, `aiConfig` | `InsertValidationRule` | ❌ No - Needs update |
| `validationErrors` | `insertValidationErrorSchema` | `context`, `aiSuggestions` | `InsertValidationError` | ❌ No - Needs update |

---

## Summary Statistics

- **Total Tables with JSONB columns**: ~64
- **Verified with `.extend()`**: 20 (31%)
- **Needs Update**: 44 (69%)

---

## Tables Verified (20/64)

### ✅ Sentiment Analysis (1/4)
- sentimentResults

### ✅ Fraud Detection (4/4)
- fraudScores
- suspiciousActivities
- fraudReviews
- fraudDetectionResults

### ✅ Cohort Analysis (3/3)
- cohorts
- cohortMetrics
- cohortInsights

### ✅ A/B Testing (3/3)
- abTests
- abTestResults
- abTestInsights

### ✅ Moderation (1/2)
- moderationLogs

### ✅ Chat & Messaging (1/2)
- messages

### ✅ Auto-Save (1/2)
- autoSaveDrafts

### ✅ Analytics (3/6)
- analyticsInsights
- userPredictions
- trends

### ✅ Predictive Maintenance (3/3)
- systemMetrics
- maintenancePredictions
- maintenanceHistory

---

## Common Patterns Verified

### ✅ Correct Pattern
```typescript
/**
 * Insert schema for [tableName] table
 * Uses .extend() to preserve JSON type information for JSONB columns
 */
export const insert[TableName]Schema = createInsertSchema([tableName])
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    // ... other auto-generated fields with defaults
  })
  .extend({
    jsonField: jsonFieldSchema.optional(), // For nullable JSONB
    requiredField: requiredFieldSchema,     // For .notNull() JSONB
  });

export type Insert[TableName] = z.infer<typeof insert[TableName]Schema>;
```

### ❌ Incorrect Pattern (Needs Fix)
```typescript
// Missing .extend() - loses type information
export const insertTableSchema = createInsertSchema(table).omit({
  id: true,
  createdAt: true,
});

export type InsertTable = z.infer<typeof insertTableSchema>;
```

---

## Next Steps

The following tables still need to be updated with the `.extend()` pattern:

1. **High Priority** (Frequently used):
   - userFeedback (upvotes, responses, attachments, tags)
   - userRecipes (dietaryInfo, nutrition, tags, neededEquipment)
   - notificationPreferences (notificationTypes, quietHours)
   - contentEmbeddings (embedding, metadata)

2. **Medium Priority** (Analytics/Insights):
   - sentimentMetrics, sentimentAlerts, sentimentTrends
   - analyticsEvents, predictionAccuracy, trendAlerts
   - savePatterns (patternData, modelWeights)

3. **Lower Priority** (Less frequently modified):
   - Forms & validation tables
   - Translation & image metadata
   - Writing & draft tables

---

## Verification Checklist

For each table update, verify:
- [ ] `.extend()` called after `.omit()`
- [ ] All JSONB columns included in `.extend()`
- [ ] Correct `.optional()` usage based on table nullability
- [ ] Type exported with `z.infer<typeof schema>`
- [ ] No LSP errors in shared/schema.ts
- [ ] Auto-generated fields properly omitted

---

**Last Updated**: 2025-11-13  
**Status**: 20/64 tables verified (31% complete)
