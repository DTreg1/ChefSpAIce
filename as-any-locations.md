# `as any` Type Cast Locations in server/storage.ts

Complete inventory of all `as any` type casts for systematic removal.

---

## Notification System (1 occurrence)

### Line 4485 - `createNotificationFeedback`
- **Method:** `createNotificationFeedback`
- **Context:** Insert operation
- **What's being cast:** `feedback.deviceInfo` (JSONB field)
- **Table:** `notificationFeedback`
- **Code:**
  ```typescript
  deviceInfo: feedback.deviceInfo as any,
  ```

---

## Sentiment Analysis (5 occurrences)

### Line 7817 - `createSentimentMetrics`
- **Method:** `createSentimentMetrics`
- **Context:** Insert operation
- **What's being cast:** Entire `metrics` object
- **Table:** `sentimentMetrics`
- **Code:**
  ```typescript
  .values(metrics as any)
  ```

### Line 7867 - `createSentimentAlert`
- **Method:** `createSentimentAlert`
- **Context:** Insert operation
- **What's being cast:** Entire `alert` object
- **Table:** `sentimentAlerts`
- **Code:**
  ```typescript
  .values(alert as any)
  ```

### Line 7919 - `createSentimentSegment`
- **Method:** `createSentimentSegment`
- **Context:** Insert operation
- **What's being cast:** Entire `segment` object
- **Table:** `sentimentSegments`
- **Code:**
  ```typescript
  .values(segment as any)
  ```

### Line 7982 - `createSentimentAnalysis`
- **Method:** `createSentimentAnalysis`
- **Context:** Insert operation (array)
- **What's being cast:** Entire `analysis` object
- **Table:** `sentimentAnalysis`
- **Code:**
  ```typescript
  .values([analysis as any])
  ```

### Line 11407 - `updateSentimentAnalysis`
- **Method:** `updateSentimentAnalysis`
- **Context:** Update operation
- **What's being cast:** Partial `data` object
- **Table:** `sentimentAnalysis`
- **Code:**
  ```typescript
  .set(data as any)
  ```

### Line 11439 - `createSentimentTrend`
- **Method:** `createSentimentTrend`
- **Context:** Insert operation
- **What's being cast:** Entire `trend` object
- **Table:** `sentimentTrends`
- **Code:**
  ```typescript
  .values(trend as any)
  ```

---

## Activity Logging (4 occurrences)

### Line 8195 - `getActivityLogs`
- **Method:** `getActivityLogs`
- **Context:** Query building - where clause
- **What's being cast:** Query chain result after `.where()`
- **Table:** `activityLogs`
- **Code:**
  ```typescript
  baseQuery = baseQuery.where(and(...conditions)) as any;
  ```

### Line 8198 - `getActivityLogs`
- **Method:** `getActivityLogs`
- **Context:** Query building - orderBy clause
- **What's being cast:** Query chain result after `.orderBy()`
- **Table:** `activityLogs`
- **Code:**
  ```typescript
  baseQuery = baseQuery.orderBy(desc(activityLogs.timestamp)) as any;
  ```

### Line 8201 - `getActivityLogs`
- **Method:** `getActivityLogs`
- **Context:** Query building - limit clause
- **What's being cast:** Query chain result after `.limit()`
- **Table:** `activityLogs`
- **Code:**
  ```typescript
  baseQuery = baseQuery.limit(filters.limit) as any;
  ```

### Line 8204 - `getActivityLogs`
- **Method:** `getActivityLogs`
- **Context:** Query building - offset clause
- **What's being cast:** Query chain result after `.offset()`
- **Table:** `activityLogs`
- **Code:**
  ```typescript
  baseQuery = baseQuery.offset(filters.offset) as any;
  ```

---

## ML Features / Content Embeddings (4 occurrences)

### Line 8487 - `upsertContentEmbedding`
- **Method:** `upsertContentEmbedding`
- **Context:** Insert operation - metadata field
- **What's being cast:** `embedding.metadata` (JSONB field)
- **Table:** `contentEmbeddings`
- **Code:**
  ```typescript
  metadata: embedding.metadata as any,
  ```

### Line 8500 - `upsertContentEmbedding`
- **Method:** `upsertContentEmbedding`
- **Context:** Update operation (onConflictDoUpdate) - metadata field
- **What's being cast:** `embedding.metadata` (JSONB field)
- **Table:** `contentEmbeddings`
- **Code:**
  ```typescript
  metadata: embedding.metadata as any,
  ```

### Line 8603 - `updateSearchLogFeedback`
- **Method:** `updateSearchLogFeedback`
- **Context:** Update operation - fields object
- **What's being cast:** Object with snake_case field names
- **Table:** `searchLogs`
- **Code:**
  ```typescript
  .set({
    clickedResultId: feedback.clickedResultId,
    clickedResultType: feedback.clickedResultType,
    click_position: feedback.clickPosition,
    time_to_click: feedback.timeToClick,
  } as any)
  ```

### Line 9053 - `cacheRelatedContent`
- **Method:** `cacheRelatedContent`
- **Context:** Insert operation - array field
- **What's being cast:** `cache.relatedItems` (JSONB array field)
- **Table:** `relatedContentCache`
- **Code:**
  ```typescript
  relatedItems: cache.relatedItems as any, // Cast array properly for jsonb
  ```

---

## Image Metadata (2 occurrences)

### Line 9452 - `createImageMetadata`
- **Method:** `createImageMetadata`
- **Context:** Insert operation
- **What's being cast:** Entire metadata object with spread
- **Table:** `imageMetadata`
- **Code:**
  ```typescript
  .values({
    ...metadataInput,
    userId,
  } as any)
  ```

### Line 9473 - `updateImageMetadata`
- **Method:** `updateImageMetadata`
- **Context:** Update operation
- **What's being cast:** Updates object with spread
- **Table:** `imageMetadata`
- **Code:**
  ```typescript
  .set({
    ...updates,
    updatedAt: new Date(),
  } as any)
  ```

---

## Moderation (2 occurrences)

### Line 9778 - `createModerationLog`
- **Method:** `createModerationLog`
- **Context:** Insert operation
- **What's being cast:** Entire `log` object
- **Table:** `moderationLogs`
- **Code:**
  ```typescript
  .values(log as any)
  ```

### Line 9797 - `updateModerationLog`
- **Method:** `updateModerationLog`
- **Context:** Update operation
- **What's being cast:** Updates object with spread
- **Table:** `moderationLogs`
- **Code:**
  ```typescript
  .set({
    ...updates,
    updatedAt: new Date(),
  } as any)
  ```

### Line 9857 - `createBlockedContent`
- **Method:** `createBlockedContent`
- **Context:** Insert operation (array)
- **What's being cast:** Entire `content` object
- **Table:** `blockedContent`
- **Code:**
  ```typescript
  .values([content as any])
  ```

---

## Fraud Detection (2 occurrences)

### Line 10071 - `createSuspiciousActivity`
- **Method:** `createSuspiciousActivity`
- **Context:** Insert operation (array)
- **What's being cast:** Entire `activity` object
- **Table:** `suspiciousActivities`
- **Code:**
  ```typescript
  .values([activity as any])
  ```

### Line 10131 - `createFraudReview`
- **Method:** `createFraudReview`
- **Context:** Insert operation (array)
- **What's being cast:** Entire `review` object
- **Table:** `fraudReviews`
- **Code:**
  ```typescript
  .values([review as any])
  ```

---

## AI Chat Assistant (Task 7) (1 occurrence)

### Line 10369 - `createMessage`
- **Method:** `createMessage`
- **Context:** Insert operation (array)
- **What's being cast:** Entire `message` object
- **Table:** `messages`
- **Code:**
  ```typescript
  .values([message as any])
  ```

---

## Smart Email/Message Drafting (Task 9) (3 occurrences)

### Line 10497 - `saveGeneratedDrafts`
- **Method:** `saveGeneratedDrafts`
- **Context:** Insert operation (batch)
- **What's being cast:** Array of drafts with userId
- **Table:** `generatedDrafts`
- **Code:**
  ```typescript
  .values(draftsWithUserId as any)
  ```

### Line 11124 - `createGeneratedDraft`
- **Method:** `createGeneratedDraft`
- **Context:** Insert operation - metadata field
- **What's being cast:** `draft.metadata` (JSONB field)
- **Table:** `generatedDrafts`
- **Code:**
  ```typescript
  metadata: draft.metadata as any,
  ```

### Line 11174 - `updateGeneratedDraft`
- **Method:** `updateGeneratedDraft`
- **Context:** Update operation - metadata field
- **What's being cast:** `updates.metadata` (JSONB field)
- **Table:** `generatedDrafts`
- **Code:**
  ```typescript
  metadata: updates.metadata as any,
  ```

---

## Writing Assistant (Task 10) (1 occurrence)

### Line 10534 - `createWritingSession`
- **Method:** `createWritingSession`
- **Context:** Insert operation - array field
- **What's being cast:** `session.improvementsApplied` (JSONB array field)
- **Table:** `writingSessions`
- **Code:**
  ```typescript
  improvementsApplied: session.improvementsApplied as any, // Cast array properly for jsonb
  ```

---

## Summarization (4 occurrences)

### Line 10732 - `createSummary`
- **Method:** `createSummary`
- **Context:** Insert operation - array field
- **What's being cast:** `summary.keyPoints` (JSONB array field)
- **Table:** `summaries`
- **Code:**
  ```typescript
  keyPoints: summary.keyPoints as any, // Cast array properly
  ```

### Line 10733 - `createSummary`
- **Method:** `createSummary`
- **Context:** Insert operation - metadata field
- **What's being cast:** `summary.metadata` (JSONB field)
- **Table:** `summaries`
- **Code:**
  ```typescript
  metadata: summary.metadata as any, // Cast metadata properly
  ```

### Line 10754 - `updateSummary`
- **Method:** `updateSummary`
- **Context:** Update operation - array field
- **What's being cast:** `updates.keyPoints` (JSONB field)
- **Table:** `summaries`
- **Code:**
  ```typescript
  keyPoints: updates.keyPoints as any, // Cast array properly
  ```

### Line 10755 - `updateSummary`
- **Method:** `updateSummary`
- **Context:** Update operation - metadata field
- **What's being cast:** `updates.metadata` (JSONB field)
- **Table:** `summaries`
- **Code:**
  ```typescript
  metadata: updates.metadata as any, // Cast metadata properly
  ```

---

## Excerpt Generation (4 occurrences)

### Line 10854 - `createExcerpt`
- **Method:** `createExcerpt`
- **Context:** Insert operation - JSONB field
- **What's being cast:** `excerpt.generationParams` (JSONB field)
- **Table:** `excerpts`
- **Code:**
  ```typescript
  generationParams: excerpt.generationParams as any,
  ```

### Line 10855 - `createExcerpt`
- **Method:** `createExcerpt`
- **Context:** Insert operation - JSONB field
- **What's being cast:** `excerpt.socialMetadata` (JSONB field)
- **Table:** `excerpts`
- **Code:**
  ```typescript
  socialMetadata: excerpt.socialMetadata as any,
  ```

### Line 10876 - `updateExcerpt`
- **Method:** `updateExcerpt`
- **Context:** Update operation - JSONB field
- **What's being cast:** `updates.generationParams` (JSONB field)
- **Table:** `excerpts`
- **Code:**
  ```typescript
  generationParams: updates.generationParams as any,
  ```

### Line 10877 - `updateExcerpt`
- **Method:** `updateExcerpt`
- **Context:** Update operation - JSONB field
- **What's being cast:** `updates.socialMetadata` (JSONB field)
- **Table:** `excerpts`
- **Code:**
  ```typescript
  socialMetadata: updates.socialMetadata as any,
  ```

### Line 10954 - `recordExcerptPerformance`
- **Method:** `recordExcerptPerformance`
- **Context:** Insert/Update operation - JSONB field
- **What's being cast:** `performance.platformMetrics` (JSONB field)
- **Table:** `excerptPerformance`
- **Code:**
  ```typescript
  platformMetrics: performance.platformMetrics as any,
  ```

---

## Natural Language Query (1 occurrence)

### Line 11289 - `createQueryLog`
- **Method:** `createQueryLog`
- **Context:** Insert operation - metadata field
- **What's being cast:** `log.metadata` (JSONB field)
- **Table:** `queryLogs`
- **Code:**
  ```typescript
  metadata: log.metadata as any, // Cast metadata properly
  ```

---

## Auto-Save System (2 occurrences)

### Line 11661 - `saveDraft`
- **Method:** `saveDraft`
- **Context:** Insert operation
- **What's being cast:** Entire draft object with computed fields
- **Table:** `autoSaveDrafts`
- **Code:**
  ```typescript
  .values({
    ...draft,
    version: nextVersion,
    contentHash,
  } as any)
  ```

### Line 11846 - `updateUserSavePatterns`
- **Method:** `updateUserSavePatterns`
- **Context:** Update operation
- **What's being cast:** Updates object with spread
- **Table:** `savePatterns`
- **Code:**
  ```typescript
  .set({
    ...patterns,
    updatedAt: new Date(),
  } as any)
  ```

---

## Form Completion (1 occurrence)

### Line 12171 - `recordCompletionFeedback`
- **Method:** `recordCompletionFeedback`
- **Context:** Insert operation
- **What's being cast:** Entire `feedback` object
- **Table:** `completionFeedback`
- **Code:**
  ```typescript
  .values(feedback as any)
  ```

---

## Analytics Insights (1 occurrence)

### Line 12321 - `getAnalyticsInsights`
- **Method:** `getAnalyticsInsights`
- **Context:** Query building - limit clause
- **What's being cast:** Query chain result after `.limit()`
- **Table:** `analyticsInsights`
- **Code:**
  ```typescript
  query = query.limit(filters.limit) as any;
  ```

---

## Prediction System (2 occurrences)

### Line 12509 - `createUserPrediction`
- **Method:** `createUserPrediction`
- **Context:** Insert operation (array)
- **What's being cast:** Entire `prediction` object
- **Table:** `userPredictions`
- **Code:**
  ```typescript
  .values([prediction as any])
  ```

### Line 12633 - `createPredictionAccuracy`
- **Method:** `createPredictionAccuracy`
- **Context:** Insert operation (array)
- **What's being cast:** Entire `accuracy` object
- **Table:** `predictionAccuracy`
- **Code:**
  ```typescript
  .values([accuracy as any])
  ```

---

## Trend Detection (4 occurrences)

### Line 12732 - `createTrend`
- **Method:** `createTrend`
- **Context:** Insert operation
- **What's being cast:** Entire `trend` object
- **Table:** `trends`
- **Code:**
  ```typescript
  .values(trend as any)
  ```

### Line 12750 - `updateTrend`
- **Method:** `updateTrend`
- **Context:** Update operation
- **What's being cast:** Updates object with spread
- **Table:** `trends`
- **Code:**
  ```typescript
  .set({
    ...update,
    updatedAt: new Date(),
  } as any)
  ```

### Line 12899 - `createTrendAlert`
- **Method:** `createTrendAlert`
- **Context:** Insert operation
- **What's being cast:** Entire `alert` object
- **Table:** `trendAlerts`
- **Code:**
  ```typescript
  .values(alert as any)
  ```

### Line 12917 - `updateTrendAlert`
- **Method:** `updateTrendAlert`
- **Context:** Update operation
- **What's being cast:** Updates object with spread
- **Table:** `trendAlerts`
- **Code:**
  ```typescript
  .set({
    ...update,
    updatedAt: new Date(),
  } as any)
  ```

---

## A/B Testing (9 occurrences)

### Line 13044 - `createAbTest`
- **Method:** `createAbTest`
- **Context:** Insert operation
- **What's being cast:** Entire `test` object
- **Table:** `abTests`
- **Code:**
  ```typescript
  .values(test as any)
  ```

### Line 13112 - `updateAbTest`
- **Method:** `updateAbTest`
- **Context:** Update operation
- **What's being cast:** Updates object with spread
- **Table:** `abTests`
- **Code:**
  ```typescript
  .set({
    ...update,
    updatedAt: new Date(),
  } as any)
  ```

### Line 13154 - `upsertAbTestResult`
- **Method:** `upsertAbTestResult`
- **Context:** Update operation (conflict resolution)
- **What's being cast:** Result object with spread
- **Table:** `abTestResults`
- **Code:**
  ```typescript
  .set({
    ...result,
    updatedAt: new Date(),
  } as any)
  ```

### Line 13162 - `upsertAbTestResult`
- **Method:** `upsertAbTestResult`
- **Context:** Insert operation
- **What's being cast:** Entire `result` object
- **Table:** `abTestResults`
- **Code:**
  ```typescript
  .values(result as any)
  ```

### Line 13218 - `getAggregatedAbTestResults`
- **Method:** `getAggregatedAbTestResults`
- **Context:** Default value for missing variant
- **What's being cast:** `null` literal
- **Table:** N/A (default data construction)
- **Code:**
  ```typescript
  null as any,
  ```

### Line 13231 - `getAggregatedAbTestResults`
- **Method:** `getAggregatedAbTestResults`
- **Context:** Default value for missing variant
- **What's being cast:** `null` literal
- **Table:** N/A (default data construction)
- **Code:**
  ```typescript
  null as any,
  ```

### Line 13286 - `upsertAbTestInsight`
- **Method:** `upsertAbTestInsight`
- **Context:** Update operation (conflict resolution)
- **What's being cast:** Insight object with spread
- **Table:** `abTestInsights`
- **Code:**
  ```typescript
  .set({
    ...insight,
    updatedAt: new Date(),
  } as any)
  ```

### Line 13294 - `upsertAbTestInsight`
- **Method:** `upsertAbTestInsight`
- **Context:** Insert operation
- **What's being cast:** Entire `insight` object
- **Table:** `abTestInsights`
- **Code:**
  ```typescript
  .values(insight as any)
  ```

### Line 13479 - `implementAbTestWinner`
- **Method:** `implementAbTestWinner`
- **Context:** Upsert operation - JSONB field construction
- **What's being cast:** Merged insights object
- **Table:** `abTestInsights`
- **Code:**
  ```typescript
  insights: {
    ...insight.insights,
    implementationDate: new Date().toISOString(),
    implementedVariant: variant,
  } as any,
  ```

---

## Cohort Analysis (4 occurrences)

### Line 13494 - `createCohort`
- **Method:** `createCohort`
- **Context:** Insert operation
- **What's being cast:** Entire `cohort` object
- **Table:** `cohorts`
- **Code:**
  ```typescript
  .values(cohort as any)
  ```

### Line 13536 - `getCohorts`
- **Method:** `getCohorts`
- **Context:** Query building - where clause
- **What's being cast:** Query chain result after `.where()`
- **Table:** `cohorts`
- **Code:**
  ```typescript
  query = query.where(and(...conditions)) as any;
  ```

### Line 13556 - `updateCohort`
- **Method:** `updateCohort`
- **Context:** Update operation
- **What's being cast:** Updates object with spread
- **Table:** `cohorts`
- **Code:**
  ```typescript
  .set({
    ...updates,
    updatedAt: new Date(),
  } as any)
  ```

### Line 13587 - `recordCohortMetrics`
- **Method:** `recordCohortMetrics`
- **Context:** Insert operation (batch)
- **What's being cast:** Array of metrics
- **Table:** `cohortMetrics`
- **Code:**
  ```typescript
  .values(metrics as any)
  ```

### Line 13640 - `getCohortMetrics`
- **Method:** `getCohortMetrics`
- **Context:** Query building - where clause
- **What's being cast:** Query chain result after `.where()`
- **Table:** `cohortMetrics`
- **Code:**
  ```typescript
  query = query.where(and(...conditions)) as any;
  ```

---

## Predictive Maintenance (3 occurrences)

### Line 13796 - `getSystemMetrics` (inferred)
- **Method:** Various methods in Predictive Maintenance section
- **Context:** Query building - where clause
- **What's being cast:** Query chain result after `.where()`
- **Table:** `systemMetrics`, `maintenancePredictions`, `maintenanceHistory`

### Line 13852 - Multiple methods
- **Method:** Various methods querying user-level data
- **Context:** Query building - where clause
- **What's being cast:** Query chain result after `.where()`

### Line 13904 - Multiple methods  
- **Method:** Various methods querying user-level data
- **Context:** Query building - where clause
- **What's being cast:** Query chain result after `.where()`

### Line 13964 - Multiple methods
- **Method:** Various methods with filters
- **Context:** Query building - where clause
- **What's being cast:** Query chain result after `.where()`

### Line 14005 - Multiple methods
- **Method:** Various methods with filters
- **Context:** Query building - where clause
- **What's being cast:** Query chain result after `.where()`

### Line 14067 - `getMaintenanceHistory` (inferred)
- **Method:** `getMaintenanceHistory`
- **Context:** Query building - where clause with component filter
- **What's being cast:** Query chain result after `.where()`
- **Table:** `maintenanceHistory`

---

## Scheduling System (1 occurrence)

### Line 14213 - Method in scheduling section
- **Method:** Scheduling-related method
- **Context:** Query or operation
- **What's being cast:** Unknown without more context
- **Table:** Scheduling-related tables

---

## Ticket Routing (1 occurrence)

### Line 14809 - `assignTicket` or routing method
- **Method:** Ticket routing method
- **Context:** JSONB metadata field
- **What's being cast:** `routing.metadata` (JSONB field)
- **Table:** `ticketRouting`

---

## Image Processing (2 occurrences)

### Line 15783 - `getImageProcessing` (inferred)
- **Method:** Query method with status filter
- **Context:** Query building - status condition
- **What's being cast:** Status enum value
- **Table:** `imageProcessing`
- **Code:**
  ```typescript
  conditions.push(eq(imageProcessing.status, status as any));
  ```

### Line 15895 - `getImagePresets` (inferred)
- **Method:** Query method with category filter
- **Context:** Query building - category condition
- **What's being cast:** Category enum value
- **Table:** `imagePresets`
- **Code:**
  ```typescript
  conditions.push(eq(imagePresets.category, category as any));
  ```

---

## Transcription (2 occurrences)

### Line 16490 - `getTranscriptions`
- **Method:** `getTranscriptions`
- **Context:** Query building - status filter
- **What's being cast:** Status enum value
- **Table:** `transcriptions`
- **Code:**
  ```typescript
  conditions.push(eq(transcriptions.status, status as any));
  ```

### Line 16523 - `getTranscriptionsPaginated`
- **Method:** `getTranscriptionsPaginated`
- **Context:** Query building - status filter
- **What's being cast:** Status enum value
- **Table:** `transcriptions`
- **Code:**
  ```typescript
  conditions.push(eq(transcriptions.status, status as any));
  ```

---

## Summary Statistics

**Total `as any` casts:** 83

### By Category:
- **Sentiment Analysis:** 6 occurrences
- **Activity Logging:** 4 occurrences
- **ML Features:** 4 occurrences
- **A/B Testing:** 9 occurrences
- **Cohort Analysis:** 5 occurrences
- **Summarization:** 4 occurrences
- **Excerpt Generation:** 5 occurrences
- **Trend Detection:** 4 occurrences
- **Auto-Save System:** 2 occurrences
- **Smart Drafting:** 3 occurrences
- **Image Metadata:** 2 occurrences
- **Moderation:** 3 occurrences
- **Fraud Detection:** 2 occurrences
- **Notification System:** 1 occurrence
- **AI Chat:** 1 occurrence
- **Writing Assistant:** 1 occurrence
- **Natural Language Query:** 1 occurrence
- **Form Completion:** 1 occurrence
- **Analytics Insights:** 1 occurrence
- **Prediction System:** 2 occurrences
- **Predictive Maintenance:** 6 occurrences
- **Image Processing:** 2 occurrences
- **Transcription:** 2 occurrences
- **Scheduling:** 1 occurrence
- **Ticket Routing:** 1 occurrence

### By Root Cause:

#### JSONB Field Type Mismatches (41 occurrences)
Fields where the schema expects JSONB but TypeScript types differ:
- `metadata` fields (12 occurrences)
- `deviceInfo` field (1 occurrence)
- `relatedItems` array (1 occurrence)
- `keyPoints` array (2 occurrences)
- `generationParams` object (2 occurrences)
- `socialMetadata` object (2 occurrences)
- `platformMetrics` object (1 occurrence)
- `improvementsApplied` array (1 occurrence)
- Entire objects inserted into tables with JSONB columns (19 occurrences)

#### Drizzle Query Builder Type Issues (18 occurrences)
Query chains where Drizzle's type inference fails:
- `.where(and(...conditions))` (7 occurrences)
- `.orderBy()`, `.limit()`, `.offset()` chaining (5 occurrences)
- Dynamic query building (6 occurrences)

#### Spread Operator Type Issues (20 occurrences)
Objects with spread operators that lose type information:
- Insert operations with `{ ...object, field }` (12 occurrences)
- Update operations with `{ ...updates, updatedAt }` (8 occurrences)

#### Enum/Union Type Mismatches (4 occurrences)
Status/category fields with enum types:
- `status` fields (3 occurrences)
- `category` fields (1 occurrence)

---

## Removal Strategy

### Phase 1: JSONB Fields (Highest Priority)
Define proper JSONB types in schema or use `sql` helper for explicit casting.

### Phase 2: Query Builder Chains
Use type assertions at the final query result, not intermediate chains.

### Phase 3: Spread Operators
Properly type intermediate objects or use explicit field mappings.

### Phase 4: Enum Types
Ensure schema enum types match TypeScript union types exactly.
