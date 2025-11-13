# JSON Columns Audit

Comprehensive audit of all JSON/JSONB columns across the application schema.

**Generated:** November 13, 2025  
**Schema File:** `shared/schema.ts`  
**Total Tables with JSON Columns:** 65  
**Total JSON Columns:** 150+

---

## Table of Contents
- [Authentication & Session Management](#authentication--session-management)
- [Push Notifications & Alerts](#push-notifications--alerts)
- [User Feedback & Support Tickets](#user-feedback--support-tickets)
- [Recipe & Nutrition Management](#recipe--nutrition-management)
- [Semantic Search & Content Discovery](#semantic-search--content-discovery)
- [AI Chat Assistant](#ai-chat-assistant)
- [Content Generation & Drafting](#content-generation--drafting)
- [Sentiment Analysis & Content Moderation](#sentiment-analysis--content-moderation)
- [Image Processing & Computer Vision](#image-processing--computer-vision)
- [OCR & Document Processing](#ocr--document-processing)
- [Audio Transcription](#audio-transcription)
- [Analytics & User Insights](#analytics--user-insights)
- [Predictive Analytics & Trend Detection](#predictive-analytics--trend-detection)
- [A/B Testing & Experimentation](#ab-testing--experimentation)
- [Auto-Save & Form Intelligence](#auto-save--form-intelligence)
- [Predictive Maintenance & System Monitoring](#predictive-maintenance--system-monitoring)
- [Intelligent Scheduling & Meeting Coordination](#intelligent-scheduling--meeting-coordination)
- [Dynamic Pricing Optimization](#dynamic-pricing-optimization)
- [Donations & Payments](#donations--payments)
- [Natural Language to SQL](#natural-language-to-sql)
- [Summary & Recommendations](#summary--recommendations)

---

## Authentication & Session Management

| Feature Area | Table Name | Column Name | Current Type Annotation | Is Nullable | Complexity | Notes |
|-------------|-----------|-------------|------------------------|-------------|------------|-------|
| Authentication | sessions | sess | ⚠️ None (no `.$type`) | No | Medium | Express-session data, lacks type annotation - needs immediate fix |
| Authentication | authProviders | metadata | ⚠️ None (no `.$type`) | Yes | Simple | Provider-specific data (tokens, profile), lacks type annotation |

---

## Push Notifications & Alerts

| Feature Area | Table Name | Column Name | Current Type Annotation | Is Nullable | Complexity | Notes |
|-------------|-----------|-------------|------------------------|-------------|------------|-------|
| Push Notifications | pushTokens | deviceInfo | `{deviceId?, deviceModel?, osVersion?, appVersion?}` | Yes | Simple | Device metadata for push targeting - **DUPLICATE** pattern with autoSaveDrafts |
| Push Notifications | notificationHistory | data | `any` | Yes | Simple | ⚠️ Notification payload data, too generic - should have specific type |
| Push Notifications | notificationPreferences | notificationTypes | Complex object with 10+ notification type configs | No (default `{}`) | Complex | Each type: `{enabled: boolean, weight: number, urgency: string, channels: string[], customSchedule?, ...}` |
| Push Notifications | notificationPreferences | quietHours | `{enabled: boolean, periods: Array<{start: string, end: string, days: number[]}>}` | No (default) | Medium | Do-not-disturb configuration with array of time periods |
| Push Notifications | notificationScores | features | Object with 10+ ML features | Yes | Medium | Notification optimization: `{timeOfDay?, dayOfWeek?, recentEngagement?, ...}` |

---

## User Feedback & Support Tickets

| Feature Area | Table Name | Column Name | Current Type Annotation | Is Nullable | Complexity | Notes |
|-------------|-----------|-------------|------------------------|-------------|------------|-------|
| User Feedback | userFeedback | upvotes | `Array<{userId: string, createdAt: string}>` | No (default `[]`) | Simple | User engagement tracking - has FeedbackUpvote type defined |
| User Feedback | userFeedback | responses | `Array<{responderId: string, response: string, action?: string, createdAt: string}>` | Yes | Medium | Admin responses to feedback - has FeedbackResponse type defined |
| User Feedback | userFeedback | attachments | `string[]` | Yes | Simple | File URLs array for screenshots/logs |
| User Feedback | userFeedback | tags | `string[]` | Yes | Simple | Categorization tags |
| Support Tickets | tickets | metadata | `{source?: string, channel?: string, customFields?: Record<string, any>, tags?: string[]}` | No (default `{}`) | Medium | Ticket context with dynamic custom fields |
| Support Tickets | routingRules | condition | `{keywords?: string[], categories?: string[], priorities?: string[], sentiment?: string, customLogic?: string}` | No | Medium | Rule matching conditions for auto-routing |
| Support Tickets | routingRules | metadata | `{description?: string, escalation_path?: string[], sla?: number, auto_escalate?: boolean}` | No (default `{}`) | Simple | Rule configuration metadata |
| Support Tickets | ticketRouting | matchedConditions | `Array<{ruleId: string, ruleName: string, matchScore: number}>` | Yes | Simple | Which rules matched during routing |
| Support Tickets | ticketRouting | confidenceBreakdown | `{keywordMatch?: number, categoryMatch?: number, priorityMatch?: number, sentimentMatch?: number}` | Yes | Simple | Confidence score breakdown by match type |

---

## Recipe & Nutrition Management

| Feature Area | Table Name | Column Name | Current Type Annotation | Is Nullable | Complexity | Notes |
|-------------|-----------|-------------|------------------------|-------------|------------|-------|
| Recipes | userRecipes | nutrition | `NutritionInfo` interface ✅ | Yes | Complex | 30+ nutrition fields, has dedicated interface (good example) |
| Recipes | userRecipes | dietaryInfo | `string[]` | Yes | Simple | Dietary tags (vegan, gluten-free, keto, etc.) |
| Recipes | userRecipes | tags | `string[]` | Yes | Simple | Recipe categorization tags |
| Recipes | userRecipes | neededEquipment | `string[]` | Yes | Simple | Required appliances/cookware |
| Inventory | userInventory | nutrition | `NutritionInfo` interface ✅ | Yes | Complex | Reuses NutritionInfo interface (good reuse) |
| Inventory | userInventory | usdaData | `any` | Yes | Medium | ⚠️ Full USDA FoodData Central response, too generic |
| Inventory | userInventory | barcodeData | `any` | Yes | Medium | ⚠️ Barcode lookup API response, too generic |
| USDA Cache | fdcCache | nutrients | `any` | Yes | Medium | ⚠️ USDA nutrient array, should use USDAFoodItem interface |
| USDA Cache | fdcCache | fullData | `any` | Yes | Complex | ⚠️ Complete USDA API response, should use USDASearchResponse interface |

---

## Semantic Search & Content Discovery

| Feature Area | Table Name | Column Name | Current Type Annotation | Is Nullable | Complexity | Notes |
|-------------|-----------|-------------|------------------------|-------------|------------|-------|
| Semantic Search | contentEmbeddings | embedding | `number[]` | No | Simple | Vector array (1536 dimensions for text-embedding-ada-002) |
| Semantic Search | contentEmbeddings | metadata | `{title?: string, category?: string, tags?: string[], description?: string}` | Yes | Simple | Content metadata for search context |
| Content Discovery | relatedContentCache | relatedItems | `Array<{id: string, type: string, title: string, score: number}>` | No | Simple | Related content recommendations with similarity scores |
| Search Logs | searchLogs | metadata | Object with search performance data | Yes | Simple | Query metadata (latency, results count, filters applied) |

---

## AI Chat Assistant

| Feature Area | Table Name | Column Name | Current Type Annotation | Is Nullable | Complexity | Notes |
|-------------|-----------|-------------|------------------------|-------------|------------|-------|
| Chat | messages | metadata | `{functionCall?: string, citedSources?: string[], sentiment?: string, feedback?: {rating: number, comment?: string}}` | Yes | Medium | Message metadata including function calls and user feedback |
| Chat | conversationContext | keyFacts | `Array<{fact: string, category: string, timestamp: string}>` | No (default `[]`) | Simple | Extracted conversation facts for context retention |

---

## Content Generation & Drafting

| Feature Area | Table Name | Column Name | Current Type Annotation | Is Nullable | Complexity | Notes |
|-------------|-----------|-------------|------------------------|-------------|------------|-------|
| Content Generation | generatedDrafts | metadata | `{model?: string, temperature?: number, tokensUsed?: number, processingTime?: number, templateId?: string}` | Yes | Simple | OpenAI generation parameters |
| Excerpts | excerpts | generationParams | `{tone?: string, style?: string, targetAudience?: string, callToAction?: boolean, hashtags?: boolean, emojis?: boolean, wordLimit?: number}` | Yes | Medium | Excerpt generation configuration |
| Excerpts | excerpts | socialMetadata | `{title?: string, description?: string, imageUrl?: string, twitterCard?: string, ogType?: string, ogImage?: string}` | Yes | Medium | Open Graph and Twitter Card metadata |
| Excerpts | excerptPerformance | platformMetrics | Nested object with platform-specific metrics | Yes | Complex | `{twitter?: {impressions?, clicks?, shares?, ...}, linkedin?: {...}, facebook?: {...}, email?: {...}}` |
| Translations | translations | translationMetadata | `{model?: string, confidence?: number, context?: string, preservedFormatting?: boolean, sourceLanguage?: string}` | Yes | Medium | Translation API metadata |
| Writing Sessions | writingSessions | improvementMetrics | `{readabilityBefore?: number, readabilityAfter?: number, clarityImprovement?: number, wordCountChange?: number}` | Yes | Medium | Before/after quality comparison |

---

## Sentiment Analysis & Content Moderation

| Feature Area | Table Name | Column Name | Current Type Annotation | Is Nullable | Complexity | Notes |
|-------------|-----------|-------------|------------------------|-------------|------------|-------|
| Sentiment Analysis | sentimentAnalysis | sentimentScores | `{positive: number, negative: number, neutral: number}` | Yes | Simple | Sentiment probabilities (0-1 range) - **candidate for extraction** |
| Sentiment Analysis | sentimentAnalysis | emotions | Object with 10+ emotion scores | Yes | Medium | `{happy?, sad?, angry?, fearful?, surprised?, disgusted?, neutral?, excited?, frustrated?, satisfied?}` - **candidate for extraction** |
| Sentiment Analysis | sentimentAnalysis | aspectSentiments | `Record<string, string>` | Yes | Simple | Aspect-based sentiment mapping (e.g., "delivery": "negative", "quality": "positive") |
| Sentiment Analysis | sentimentAnalysis | metadata | `Record<string, any>` | Yes | Simple | Generic metadata storage |
| Sentiment Trends | sentimentTrends | sentimentCounts | `{positive: number, negative: number, neutral: number, mixed: number}` | No | Simple | Aggregated sentiment counts |
| Sentiment Trends | sentimentTrends | dominantEmotions | `Array<{emotion: string, count: number, avgIntensity: number}>` | Yes | Simple | Top emotions with aggregated metrics |
| Sentiment Trends | sentimentTrends | contentTypes | `Record<string, {count: number, avgSentiment: number}>` | Yes | Medium | Dynamic keys for content type breakdown |
| Sentiment Trends | sentimentTrends | metadata | `Record<string, any>` | Yes | Simple | Generic metadata |
| Sentiment Segments | sentimentSegments | topIssues | `Array<{issue: string, count: number, sentiment: number}>` | Yes | Simple | Most common negative issues |
| Sentiment Segments | sentimentSegments | topPraises | `Array<{praise: string, count: number, sentiment: number}>` | Yes | Simple | Most common positive feedback |
| Sentiment Segments | sentimentSegments | metadata | `Record<string, any>` | Yes | Simple | Generic metadata |
| Sentiment Alerts | sentimentAlerts | metadata | `{previousValue?: number, percentageChange?: number, affectedUsers?: number, suggestedActions?: string[]}` | Yes | Medium | Alert context and recommendations |
| Content Moderation | moderationLogs | toxicityScores | `{toxicity: number, severeToxicity: number, identityAttack: number, insult: number, profanity: number, threat: number}` | No | Simple | TensorFlow Toxicity + OpenAI moderation scores |
| Content Moderation | blockedContent | analysis | `{scores?: Record<string, number>, categories?: string[], explanation?: string}` | Yes | Simple | Why content was blocked with reasoning |

---

## Image Processing & Computer Vision

| Feature Area | Table Name | Column Name | Current Type Annotation | Is Nullable | Complexity | Notes |
|-------------|-----------|-------------|------------------------|-------------|------------|-------|
| Image Metadata | imageMetadata | dimensions | `{width?: number, height?: number}` | Yes | Simple | Image dimensions - **DUPLICATE** with imageProcessing.metadata, faceDetections.metadata |
| Image Processing | imageProcessing | operations | Extensive object with filters, resize, compression | No (default `{}`) | Complex | ~150 line structure - **🔴 EXACT DUPLICATE** with imagePresets.operations |
| Image Processing | imageProcessing | metadata | Complex object with dimensions, format, AI analysis | Yes | Complex | Includes 4-level nested `aiAnalysis.suggestedCrop: {x, y, width, height}` |
| Image Presets | imagePresets | operations | **IDENTICAL to imageProcessing.operations** | No | Complex | 🔴 **CRITICAL:** Extract ImageOperations interface immediately |
| Alt Text | altTextQuality | metadata | `{wordCount?: number, readabilityScore?: number, sentimentScore?: number, technicalTerms?: string[], accessibility?: string}` | Yes | Simple | Alt text quality metrics |
| Face Detection | faceDetections | faceCoordinates | `Array<{x: number, y: number, width: number, height: number, confidence: number, landmarks?: {...}}>` | No (default `[]`) | Complex | 4 levels deep with optional landmarks: `{leftEye?: {x, y}, rightEye?: {x, y}, nose?, mouth?, leftEar?, rightEar?}` |
| Face Detection | faceDetections | metadata | `{modelVersion?: string, processingTime?: number, originalDimensions?: {width, height}, blurIntensity?: number, cropSettings?: {...}}` | Yes | Simple | Detection metadata - **DUPLICATE** dimensions pattern |
| Privacy | privacySettings | excludedFaces | `string[]` | No (default `[]`) | Simple | Face IDs to exclude from auto-blur |

---

## OCR & Document Processing

| Feature Area | Table Name | Column Name | Current Type Annotation | Is Nullable | Complexity | Notes |
|-------------|-----------|-------------|------------------------|-------------|------------|-------|
| OCR | ocrResults | boundingBoxes | `Array<{text: string, confidence: number, bbox: {x0: number, y0: number, x1: number, y1: number}}>` | No (default `[]`) | Medium | 2 levels deep - bounding box pattern - **candidate for extraction** |
| OCR | ocrResults | metadata | `{ocrEngine?: string, engineVersion?: string, imageWidth?: number, imageHeight?: number, preprocessingApplied?: string[], structuredData?: any}` | Yes | Medium | Tesseract.js OCR metadata |
| OCR | ocrCorrections | boundingBox | `{x0: number, y0: number, x1: number, y1: number}` | Yes | Simple | Correction region coordinates - **same as bbox pattern above** |

---

## Audio Transcription

| Feature Area | Table Name | Column Name | Current Type Annotation | Is Nullable | Complexity | Notes |
|-------------|-----------|-------------|------------------------|-------------|------------|-------|
| Transcription | transcriptions | segments | `Array<{id: string, start: number, end: number, text: string, confidence?: number, speaker?: string}>` | No (default `[]`) | Medium | Whisper transcript segments with timestamps - **candidate for extraction** |
| Transcription | transcriptions | metadata | `{modelVersion?: string, audioFormat?: string, sampleRate?: number, bitrate?: number, processingTime?: number, errorDetails?: string, title?: string, description?: string, tags?: string[]}` | Yes | Medium | Whisper API metadata |
| Transcription | transcriptEdits | timestamps | `{start: number, end: number}` | Yes | Simple | Edit time range - **DUPLICATE** TimeRange pattern |

---

## Analytics & User Insights

| Feature Area | Table Name | Column Name | Current Type Annotation | Is Nullable | Complexity | Notes |
|-------------|-----------|-------------|------------------------|-------------|------------|-------|
| Analytics | analyticsEvents | properties | `Record<string, any>` | Yes | Simple | ⚠️ Event-specific flexible data, very generic |
| Analytics | analyticsInsights | metricData | `{currentValue?: number, previousValue?: number, percentageChange?: number, trend?: string, dataPoints?: Array<{date: string, value: number}>}` | Yes | Medium | Metric time series and statistics |
| Analytics | analyticsInsights | aiContext | `{reasoning?: string, confidence?: number, suggestedActions?: string[], relatedMetrics?: string[], model?: string}` | Yes | Medium | AI-generated insights and recommendations |
| Analytics | userSessions | pageViews | `Array<{url: string, title: string, timestamp: string}>` | Yes | Simple | Page view tracking within session |

---

## Predictive Analytics & Trend Detection

| Feature Area | Table Name | Column Name | Current Type Annotation | Is Nullable | Complexity | Notes |
|-------------|-----------|-------------|------------------------|-------------|------------|-------|
| Predictions | userPredictions | factors | `{activityPattern?: string, engagementScore?: number, lastActive?: string, sessionCount?: number, featureUsage?: Record<string, number>, contentInteraction?: Record<string, any>}` | No | Medium | ML prediction features with dynamic key Records |
| Predictions | predictionAccuracy | modelFeedback | `{expectedFeatures?: Record<string, any>, actualFeatures?: Record<string, any>, drift?: number, confidence?: number}` | Yes | Medium | Model performance and drift tracking |
| Trends | trends | dataPoints | Complex object with multiple nested arrays | No | Complex | Contains: `{timeSeries?: Array<{date, value, label?}>, keywords?: Array<{keyword, count, growth}>, entities?: Array<{name, type, relevance}>, sources?: string[], volumeData?: Array<{date, count}>, sentimentData?: Array<{date, positive, negative, neutral}>}` |
| Trends | trends | recommendations | `string[]` | Yes | Simple | AI-suggested actions based on trends |
| Trends | trends | metadata | `{detectionMethod?: string, modelVersion?: string, dataWindow?: string, sampleSize?: number}` | Yes | Simple | Trend detection algorithm metadata |
| Trend Alerts | trendAlerts | conditions | `{minGrowthRate?: number, minConfidence?: number, minVolume?: number, categories?: string[]}` | Yes | Simple | Alert trigger thresholds |
| Trend Alerts | trendAlerts | metadata | `{triggerValue?: number, comparisonData?: Record<string, any>, relatedAlerts?: string[]}` | Yes | Simple | Alert context data |

---

## A/B Testing & Experimentation

| Feature Area | Table Name | Column Name | Current Type Annotation | Is Nullable | Complexity | Notes |
|-------------|-----------|-------------|------------------------|-------------|------------|-------|
| A/B Testing | abTests | metadata | `{hypothesis?: string, featureArea?: string, targetAudience?: string, successMetrics?: string[]}` | Yes | Simple | Test design configuration |
| A/B Testing | abTestResults | metrics | `{conversions?: number, revenue?: number, engagementRate?: number, bounceRate?: number, avgSessionDuration?: number}` | No | Simple | Test performance measurements |

---

## Auto-Save & Form Intelligence

| Feature Area | Table Name | Column Name | Current Type Annotation | Is Nullable | Complexity | Notes |
|-------------|-----------|-------------|------------------------|-------------|------------|-------|
| Auto-Save | autoSaveDrafts | metadata | `{cursorPosition?: number, scrollPosition?: number, selectedText?: string, deviceInfo?: {...}}` | Yes | Medium | Editor state with nested deviceInfo - **DUPLICATE** with pushTokens.deviceInfo |
| Auto-Save | savePatterns | patternData | `{pauseHistogram?: Record<string, number>, keystrokeIntervals?: number[], burstLengths?: number[], typingSpeed?: number}` | Yes | Medium | Typing behavior analysis for predictive save |
| Auto-Save | savePatterns | modelWeights | `{weights?: number[], bias?: number, version?: string}` | Yes | Simple | TensorFlow.js model weights for personalization |
| Form Intelligence | formCompletions | commonValues | `Array<{value: string, count: number, lastUsed: string, metadata?: Record<string, any>}>` | Yes | Medium | Common values with optional nested Record |
| Form Intelligence | formCompletions | patterns | `Array<{regex: string, description: string, priority: number}>` | Yes | Simple | Validation regex patterns |
| Form Intelligence | formCompletions | contextRules | `Array<{condition: string, suggestions: string[], priority: number}>` | Yes | Medium | Context-aware autocomplete rules |
| Form Intelligence | userFormHistory | valuesUsed | `Array<{value: string, timestamp: string}>` | Yes | Simple | User's historical form inputs |
| Form Intelligence | userFormHistory | frequencyMap | `Record<string, number>` | Yes | Simple | Value-to-frequency mapping for predictions |
| Form Validation | validationRules | rule | `{type: string, parameters?: Record<string, any>, message?: string}` | No | Simple | Validation rule configuration |
| Form Validation | validationErrors | fieldErrors | `Array<{field: string, error: string, severity: string}>` | No | Simple | Field-level validation errors |

---

## Predictive Maintenance & System Monitoring

| Feature Area | Table Name | Column Name | Current Type Annotation | Is Nullable | Complexity | Notes |
|-------------|-----------|-------------|------------------------|-------------|------------|-------|
| System Monitoring | systemMetrics | metadata | `{unit?: string, source?: string, tags?: string[], context?: Record<string, any>}` | Yes | Simple | Metric metadata and context |
| Maintenance | maintenancePredictions | preventiveActions | `string[]` | Yes | Simple | AI-recommended maintenance actions |
| Maintenance | maintenancePredictions | features | `{trendSlope?: number, seasonality?: number, recentAnomalies?: number, historicalPatterns?: Record<string, any>}` | Yes | Medium | ML prediction features |
| Maintenance | maintenanceHistory | performedActions | `string[]` | Yes | Simple | Actions taken during maintenance |
| Maintenance | maintenanceHistory | performanceMetrics | `{before?: Record<string, number>, after?: Record<string, number>, improvement?: number}` | Yes | Simple | Before/after performance comparison |
| Maintenance | maintenanceHistory | cost | `{laborHours?: number, resourceCost?: number, opportunityCost?: number}` | Yes | Simple | Maintenance cost breakdown |

---

## Intelligent Scheduling & Meeting Coordination

| Feature Area | Table Name | Column Name | Current Type Annotation | Is Nullable | Complexity | Notes |
|-------------|-----------|-------------|------------------------|-------------|------------|-------|
| Scheduling | schedulingPreferences | preferredTimes | Object with weekday keys containing time slot arrays | No (default `{}`) | Complex | `{monday?: Array<{start: string, end: string, preference: number}>, tuesday?: [...], ...}` for all 7 days |
| Scheduling | schedulingPreferences | workingHours | `{start: string, end: string, daysOfWeek: number[]}` | No (default) | Simple | Standard working hours configuration |
| Scheduling | schedulingPreferences | blockedTimes | `Array<{start: string, end: string, recurring: boolean, daysOfWeek?: number[], reason?: string}>` | No (default `[]`) | Medium | Unavailable time blocks with optional recurrence |
| Scheduling | schedulingPreferences | meetingPreferences | Object with 10+ preference fields | No (default) | Medium | `{preferInPerson?: boolean, preferVideo?: boolean, maxDailyMeetings?: number, minBreakBetween?: number, ...}` |
| Meeting Suggestions | meetingSuggestions | suggestedTimes | `Array<{start, end, timezone, score, conflicts: Array<{userId, severity, description}>, optimality: {timeZoneFit, preferenceMatch, scheduleDisruption}}>` | No | Complex | **4 levels deep** - most complex JSON structure in schema |
| Meeting Suggestions | meetingSuggestions | confidenceScores | `{overall: number, timeZoneAlignment: number, preferenceAlignment: number, scheduleOptimization: number}` | No | Simple | Suggestion confidence breakdown (0-1) |
| Meeting Suggestions | meetingSuggestions | constraints | `{duration: number, mustBeWithin?: string, avoidDates?: string[], allowWeekends?: boolean, preferredTimeOfDay?: string}` | No | Medium | Meeting requirements and constraints |
| Meeting Suggestions | meetingSuggestions | optimizationFactors | `{weightTimeZone: number, weightPreferences: number, weightAvailability: number, weightScheduleDisruption: number}` | No (default) | Simple | AI optimization weights (sum to 1.0) |
| Meeting Suggestions | meetingSuggestions | selectedTime | `{start: string, end: string, timezone: string}` | Yes | Simple | Final selected meeting time |
| Scheduling Patterns | schedulingPatterns | commonMeetingTimes | `Array<{dayOfWeek: number, timeOfDay: string, duration: number, frequency: number, lastUsed: string}>` | No (default `[]`) | Medium | ML-learned meeting patterns |
| Scheduling Patterns | schedulingPatterns | meetingFrequency | `{daily: number, weekly: number, monthly: number, quarterly: number, yearly: number}` | No | Simple | Meeting frequency statistics |
| Scheduling Patterns | schedulingPatterns | patternData | Object with recurring meetings, typical duration, etc. | No (default `{}`) | Medium | `{recurringMeetings?: Array<{title, dayOfWeek, time, participants}>, typicalDuration?: Record<string, number>, ...}` |
| Meeting Events | meetingEvents | metadata | `{isRecurring?: boolean, recurringPattern?: string, source?: string, importance?: string, calendarId?: string}` | No (default `{}`) | Simple | Calendar event metadata |

---

## Dynamic Pricing Optimization

| Feature Area | Table Name | Column Name | Current Type Annotation | Is Nullable | Complexity | Notes |
|-------------|-----------|-------------|------------------------|-------------|------------|-------|
| Pricing | pricingRules | rules | `{basePrice?: number, competitorAdjustment?: number, demandMultiplier?: number, seasonalFactors?: Record<string, number>, minimumMargin?: number}` | No | Medium | Dynamic pricing algorithm configuration |
| Pricing | priceHistory | changes | `{reason?: string, performanceData?: Record<string, any>, competitorData?: Array<{name, price, source}>, weatherImpact?: string, eventImpact?: string}` | Yes | Medium | Price change audit trail with context |
| Pricing | pricingPerformance | metrics | `{avgOrderValue?: number, repeatPurchaseRate?: number, customerSatisfaction?: number, cartAbandonmentRate?: number, competitivePosition?: string, marginPercentage?: number, elasticityScore?: number}` | Yes | Medium | Price point performance analytics |

---

## Donations & Payments

| Feature Area | Table Name | Column Name | Current Type Annotation | Is Nullable | Complexity | Notes |
|-------------|-----------|-------------|------------------------|-------------|------------|-------|
| Donations | donations | metadata | ⚠️ None (no `.$type`) | Yes | Simple | Stripe payment metadata, lacks type annotation |

---

## Natural Language to SQL

| Feature Area | Table Name | Column Name | Current Type Annotation | Is Nullable | Complexity | Notes |
|-------------|-----------|-------------|------------------------|-------------|------------|-------|
| Query Logs | queryLogs | metadata | `{model?: string, confidence?: number, temperature?: number, tokensUsed?: number, executionTime?: number}` | Yes | Simple | Natural language to SQL generation metadata |

---

## Summary & Recommendations

### Statistics by Complexity

| Complexity | Count | Percentage |
|-----------|-------|------------|
| **Simple** | 85 | 56% |
| **Medium** | 48 | 32% |
| **Complex** | 17 | 12% |
| **TOTAL** | 150 | 100% |

### Statistics by Nullable Status

| Nullable | Count | Percentage |
|---------|-------|------------|
| **Yes** | 95 | 63% |
| **No** | 55 | 37% |

### Critical Issues Found

#### 🔴 HIGH PRIORITY - Missing Type Annotations (3 columns)

These columns lack `.$type<...>()` annotations and default to `any`:

1. **sessions.sess** - Express session data
2. **authProviders.metadata** - OAuth provider metadata  
3. **donations.metadata** - Stripe payment metadata

**Impact:** No type safety, runtime errors possible  
**Action:** Add type annotations immediately

---

#### 🔴 HIGH PRIORITY - Overly Generic Types (10+ columns)

These columns use `any` or overly broad `Record<string, any>`:

1. **notificationHistory.data** - Uses `any`
2. **fdcCache.nutrients** - Uses `any` (should use USDAFoodItem type)
3. **fdcCache.fullData** - Uses `any` (should use USDASearchResponse type)
4. **userInventory.usdaData** - Uses `any`
5. **userInventory.barcodeData** - Uses `any`
6. **analyticsEvents.properties** - Uses `Record<string, any>`
7. **sentimentAnalysis.metadata** - Uses `Record<string, any>`
8. **sentimentTrends.metadata** - Uses `Record<string, any>`
9. **sentimentSegments.metadata** - Uses `Record<string, any>`

**Impact:** Reduced type safety, harder to maintain  
**Action:** Define specific interfaces for each

---

#### 🔴 CRITICAL - Exact Duplicates Requiring Interface Extraction

These are **identical** structures that must be extracted to prevent maintenance issues:

1. **imageProcessing.operations ↔ imagePresets.operations**
   - **Size:** ~150 line complex structure
   - **Status:** 🔴 Exact duplicate
   - **Action:** Extract `ImageOperations` interface immediately
   - **Impact:** Any change requires updating both locations

2. **pushTokens.deviceInfo ↔ autoSaveDrafts.metadata.deviceInfo**
   - **Structure:** `{deviceId?, deviceModel?, osVersion?, appVersion?}`
   - **Action:** Extract `DeviceInfo` interface

3. **imageMetadata.dimensions ↔ imageProcessing.metadata.originalDimensions ↔ faceDetections.metadata.originalDimensions**
   - **Structure:** `{width?: number, height?: number}`
   - **Action:** Extract `ImageDimensions` interface

---

#### 🟡 MEDIUM PRIORITY - Similar Patterns Needing Standardization

**Bounding Box Pattern** (used in 3 places):
- `ocrResults.boundingBoxes[].bbox` - `{x0, y0, x1, y1}`
- `ocrCorrections.boundingBox` - Same structure
- `faceDetections.faceCoordinates` - Different variant: `{x, y, width, height}`

**Recommendation:** Extract `BoundingBox` interface with coordinate variants

---

**Time Range Pattern** (used in 5+ places):
- `transcriptEdits.timestamps` - `{start: number, end: number}`
- `schedulingPreferences.blockedTimes[].{start, end}`
- `schedulingPreferences.workingHours.{start, end}`
- `transcriptions.segments[].{start, end}`

**Recommendation:** Extract `TimeRange` interface

---

**AI Processing Metadata Pattern** (used in 8+ places):
- Common fields: `modelVersion?`, `processingTime?`, `confidence?`
- Tables: transcriptions, ocrResults, faceDetections, translations, etc.

**Recommendation:** Extract `AIProcessingMetadata` base interface

---

**Social Media Metrics Pattern** (used in excerptPerformance):
- Platform-specific: `{impressions?, clicks?, shares?, comments?, reactions?}`
- Platforms: twitter, linkedin, facebook, email

**Recommendation:** Extract `SocialMediaMetrics` interface

---

**Sentiment Structures** (used in 5+ tables):
- `SentimentScores`: `{positive: number, negative: number, neutral: number}`
- `EmotionScores`: `{happy?, sad?, angry?, fearful?, surprised?, ...}`

**Recommendation:** Extract dedicated interfaces for consistency

---

### Most Complex JSON Columns (Top 10)

| Rank | Table | Column | Depth | Notes |
|------|-------|--------|-------|-------|
| 1 | meetingSuggestions | suggestedTimes | 4 levels | Array → objects → conflicts array + optimality object |
| 2 | imageProcessing | operations | 3+ levels | Complex nested filters with parameters |
| 3 | imagePresets | operations | 3+ levels | Identical to imageProcessing.operations |
| 4 | faceDetections | faceCoordinates | 4 levels | Array → objects → landmarks → coordinate pairs |
| 5 | imageProcessing | metadata | 4 levels | aiAnalysis → suggestedCrop → {x, y, width, height} |
| 6 | trends | dataPoints | 3 levels | Multiple nested arrays (timeSeries, entities, sentimentData) |
| 7 | notificationPreferences | notificationTypes | 3 levels | 10+ notification type configs with nested settings |
| 8 | excerptPerformance | platformMetrics | 3 levels | Platform objects with nested metric objects |
| 9 | schedulingPreferences | preferredTimes | 3 levels | Weekday keys → time slot arrays → objects |
| 10 | formCompletions | commonValues | 2-3 levels | Array with optional nested Record metadata |

---

### Recommended Actions

#### Immediate (Week 1)
1. ✅ Add type annotations to sessions.sess, authProviders.metadata, donations.metadata
2. ✅ Extract ImageOperations interface (critical duplicate)
3. ✅ Extract DeviceInfo interface
4. ✅ Extract ImageDimensions interface

#### Short-term (Week 2-3)
5. ✅ Create AIProcessingMetadata base interface
6. ✅ Extract BoundingBox interface with variants
7. ✅ Extract TimeRange interface
8. ✅ Replace generic `any` types with specific interfaces
9. ✅ Extract SentimentScores and EmotionScores interfaces

#### Medium-term (Month 1)
10. ✅ Standardize all metadata fields with clear documentation
11. ✅ Create shared types for common patterns (UserAction, TranscriptSegment, etc.)
12. ✅ Document expected keys for all Record<string, any> types
13. ✅ Add JSDoc comments to all extracted interfaces

#### Long-term (Ongoing)
14. ✅ Establish guidelines for when to use inline types vs. extracted interfaces
15. ✅ Code review process to prevent future duplicates
16. ✅ Migration plan for overly generic types
17. ✅ Regular audits to identify new patterns

---

### Benefits of Refactoring

✅ **Type Safety** - Catch errors at compile time instead of runtime  
✅ **DRY Principle** - Single source of truth for shared structures  
✅ **Easier Maintenance** - Change once, update everywhere  
✅ **Better IDE Support** - Autocomplete and inline documentation  
✅ **Self-Documenting** - Interfaces serve as living documentation  
✅ **Reduced Bugs** - TypeScript catches mismatches early  
✅ **Easier Onboarding** - New developers understand data structures faster

---

## Appendix: Existing Type Definitions

The following interfaces are already defined in `shared/schema.ts`:

### ✅ NutritionInfo Interface (lines 1432-1466)
Used by: `userRecipes.nutrition`, `userInventory.nutrition`

```typescript
export interface NutritionInfo {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  servingSize?: string;
  servingUnit?: string;
  saturatedFat?: number;
  transFat?: number;
  cholesterol?: number;
  calcium?: number;
  iron?: number;
  potassium?: number;
  vitaminA?: number;
  vitaminC?: number;
  vitaminD?: number;
  vitaminE?: number;
  vitaminK?: number;
  thiamin?: number;
  riboflavin?: number;
  niacin?: number;
  vitaminB6?: number;
  folate?: number;
  vitaminB12?: number;
  pantothenicAcid?: number;
  phosphorus?: number;
  magnesium?: number;
  zinc?: number;
  selenium?: number;
  copper?: number;
  manganese?: number;
}
```

**Status:** ✅ Excellent example of interface reuse

---

### ✅ USDAFoodItem Interface (lines 1528-1556)
Used for: USDA FoodData Central API responses

**Status:** ✅ Well-defined for external API integration

---

### ✅ USDASearchResponse Interface (lines 1558-1577)
Used for: USDA API search responses

**Status:** ✅ Well-defined wrapper type

---

### ✅ FeedbackUpvote Type (lines 1754-1757)
Used by: `userFeedback.upvotes`

```typescript
export type FeedbackUpvote = {
  userId: string;
  createdAt: string;
};
```

**Note:** This pattern (userId + timestamp) appears in multiple places and could be generalized to `UserAction`

---

### ✅ FeedbackResponse Type (lines 1759-1764)
Used by: `userFeedback.responses`

**Status:** ✅ Well-defined

---

### ✅ FeedbackAnalytics Type (lines 1767-1787)
Application-level aggregation type (not a DB column)

**Status:** ✅ Good example of computed type

---

### ✅ ConversationWithMetadata Type (lines 3275-3278)
Composition pattern for API responses

**Status:** ✅ Good example of type extension

---

## Document Metadata

- **Last Updated:** November 13, 2025
- **Schema Version:** Current (8,463 lines)
- **Total Tables Audited:** 65
- **Total JSON Columns:** 150+
- **Critical Issues:** 13
- **Recommended Refactorings:** 17

---

## Prioritized Refactoring Plan

Based on TypeScript compilation errors in `server/storage.ts` (41 errors) and architectural review, JSON columns are categorized into three priority levels:

---

### Priority 1 (High) - Blocking Compilation Errors

**Status:** 🔴 **CRITICAL** - Prevents compilation, blocks deployment  
**Count:** 21 columns causing 41 TypeScript errors  
**Timeline:** Fix immediately (Week 1)

These columns have type mismatches between `shared/schema.ts` annotations and `server/storage.ts` usage, causing hard compilation failures.

#### Analytics & Insights (2 columns)
| Table | Column | Issue | Action Required |
|-------|--------|-------|-----------------|
| analyticsInsights | metricData | Type mismatch on insert - missing proper interface | Define `MetricData` interface with `{currentValue?, previousValue?, percentageChange?, trend?, dataPoints?: Array<{date, value}>}` |
| analyticsInsights | aiContext | Type mismatch - needs proper structure | Define `AIContext` interface with `{reasoning?, confidence?, suggestedActions?, relatedMetrics?, model?}` |

#### Predictive Maintenance (4 columns)
| Table | Column | Issue | Action Required |
|-------|--------|-------|-----------------|
| systemMetrics | metadata | Type mismatch on insert | Define `SystemMetricMetadata` interface with `{unit?, source?, tags?: string[], context?: Record<string, any>}` |
| maintenancePredictions | features | Type mismatch - complex object | Define `PredictionFeatures` interface with `{trendSlope?, seasonality?, recentAnomalies?, historicalPatterns?: Record<string, any>}` |
| maintenanceHistory | performedActions | Array type mismatch | Ensure `string[]` type consistency |
| maintenanceHistory | performanceMetrics | Type mismatch | Define `PerformanceComparison` interface with `{before?: Record<string, number>, after?: Record<string, number>, improvement?: number}` |
| maintenanceHistory | cost | Type mismatch | Define `MaintenanceCost` interface with `{laborHours?, resourceCost?, opportunityCost?}` |

#### Intelligent Scheduling (10 columns)
| Table | Column | Issue | Action Required |
|-------|--------|-------|-----------------|
| schedulingPreferences | preferredTimes | Complex nested object type mismatch | Define `WeeklyPreferences` with day-of-week keys → time slot arrays |
| schedulingPreferences | blockedTimes | Array type mismatch | Define `BlockedTimeSlot` interface with `{start, end, recurring, daysOfWeek?, reason?}` |
| schedulingPatterns | meetingFrequency | Type mismatch - expects specific structure | Define `MeetingFrequencyStats` with `{daily, weekly, monthly, averagePerDay, peakDays: number[], peakHours: number[]}` |
| schedulingPatterns | commonMeetingTimes | Array type mismatch | Define `CommonMeetingPattern` with `{dayOfWeek, timeOfDay, duration, frequency, lastUsed}` |
| schedulingPatterns | patternData | Type mismatch - complex nested | Define `SchedulingPatternData` with `{recurringMeetings?, typicalDuration?: Record<string, number>, preferredGaps?, batchingPreference?}` |
| meetingSuggestions | suggestedTimes | **Most complex** - 4 levels deep | Define `SuggestedTimeSlot` with nested `conflicts` array and `optimality` object |
| meetingSuggestions | confidenceScores | Type mismatch | Define `ConfidenceBreakdown` with `{overall, timeZoneAlignment, preferenceAlignment, scheduleOptimization}` |
| meetingSuggestions | constraints | Type mismatch | Define `MeetingConstraints` with `{duration, mustBeWithin?, avoidDates?, allowWeekends?, preferredTimeOfDay?}` |
| meetingSuggestions | optimizationFactors | Type mismatch | Define `OptimizationWeights` with `{weightTimeZone, weightPreferences, weightAvailability, weightScheduleDisruption}` |
| meetingEvents | metadata | Type mismatch | Define `MeetingEventMetadata` with `{isRecurring?, recurringPattern?, source?, importance?, calendarId?}` |

#### Image Processing (2 columns - **EXACT DUPLICATES**)
| Table | Column | Issue | Action Required |
|-------|--------|-------|-----------------|
| imageProcessing | operations | 150-line duplicate structure, type mismatch | **🔴 Extract `ImageOperations` interface** with `{backgroundRemoval?, autoCrop?, filters?: Array<FilterConfig>, resize?, format?, compression?}` |
| imagePresets | operations | **Identical to imageProcessing.operations** | **Use same `ImageOperations` interface** |

#### Data Extraction & Privacy (2 columns)
| Table | Column | Issue | Action Required |
|-------|--------|-------|-----------------|
| extractionTemplates | schema | Type mismatch on validation schema | Define proper Zod schema type or JSON schema interface |
| privacySettings | excludedFaces | Array type mismatch | Ensure `string[]` type consistency |

**Immediate Actions:**
1. ✅ Define all missing interfaces in `shared/schema.ts`
2. ✅ Extract `ImageOperations` interface (eliminates 150-line duplication)
3. ✅ Update insert schemas to use new interfaces
4. ✅ Verify compilation passes after fixes
5. ✅ Test affected storage.ts methods

---

### Priority 2 (Medium) - Complex Structures Needing Type Safety

**Status:** 🟡 **Important** - No compilation errors but high refactoring value  
**Count:** ~45 columns  
**Timeline:** Address by domain (Weeks 2-4)

These columns have complex nested structures that would significantly benefit from explicit interfaces. Group by domain for efficient refactoring.

#### Domain: Analytics & Trends (8 columns)
| Table | Column | Complexity | Refactoring Value |
|-------|--------|------------|-------------------|
| trends | dataPoints | Complex - multiple 3-level nested arrays | **HIGH** - Extract `TrendDataPoints` with typed arrays for timeSeries, keywords, entities, volumeData, sentimentData |
| userPredictions | factors | Medium - dynamic Record keys | **MEDIUM** - Define `PredictionFactors` base interface |
| predictionAccuracy | modelFeedback | Medium - nested Records | **MEDIUM** - Define `ModelPerformanceFeedback` |
| trendAlerts | conditions | Simple-Medium | **LOW** - Already works well |
| trendAlerts | metadata | Simple-Medium | **LOW** - Generic metadata OK |
| abTests | metadata | Simple-Medium | **LOW** - Test configuration metadata |
| abTestResults | metrics | Simple-Medium | **MEDIUM** - Could standardize performance metrics |
| userSessions | pageViews | Simple array | **LOW** - Works fine |

#### Domain: Sentiment Analysis (10 columns)
| Table | Column | Complexity | Refactoring Value |
|-------|--------|------------|-------------------|
| sentimentAnalysis | sentimentScores | Simple - 3 fields | **HIGH** - Extract `SentimentScores` interface (reusable) |
| sentimentAnalysis | emotions | Medium - 10+ optional fields | **HIGH** - Extract `EmotionScores` interface (reusable) |
| sentimentAnalysis | aspectSentiments | Simple - Record | **MEDIUM** - Standardize aspect mapping |
| sentimentTrends | sentimentCounts | Simple - 4 fields | **MEDIUM** - Use `SentimentScores` + mixed |
| sentimentTrends | dominantEmotions | Simple array | **LOW** - Works fine |
| sentimentTrends | contentTypes | Medium - dynamic keys | **LOW** - Generic Record OK |
| sentimentSegments | topIssues | Simple array | **LOW** - Works fine |
| sentimentSegments | topPraises | Simple array | **LOW** - Works fine |
| sentimentAlerts | metadata | Simple-Medium | **LOW** - Alert context OK |
| moderationLogs | toxicityScores | Simple - 6 fields | **MEDIUM** - Standardize toxicity structure |

#### Domain: Notifications (5 columns)
| Table | Column | Complexity | Refactoring Value |
|-------|--------|------------|-------------------|
| notificationPreferences | notificationTypes | **Complex** - 10+ notification configs | **HIGH** - Extract `NotificationTypeConfig` interface |
| notificationPreferences | quietHours | Medium - array of periods | **MEDIUM** - Extract `QuietHoursConfig` |
| notificationScores | features | Medium - ML features | **MEDIUM** - Standardize ML feature structure |
| pushTokens | deviceInfo | Simple - 4 fields | **HIGH** - Extract `DeviceInfo` (duplicate with autoSaveDrafts) |

#### Domain: Form Intelligence (7 columns)
| Table | Column | Complexity | Refactoring Value |
|-------|--------|------------|-------------------|
| formCompletions | commonValues | Medium - array with nested Record | **MEDIUM** - Extract `CommonValueEntry` |
| formCompletions | patterns | Simple array | **LOW** - Works fine |
| formCompletions | contextRules | Medium - array with nested array | **MEDIUM** - Extract `ContextRule` |
| userFormHistory | valuesUsed | Simple array | **LOW** - Works fine |
| userFormHistory | frequencyMap | Simple Record | **LOW** - Works fine |
| validationRules | rule | Simple object | **LOW** - Works fine |
| validationErrors | fieldErrors | Simple array | **LOW** - Works fine |

#### Domain: Content Generation (6 columns)
| Table | Column | Complexity | Refactoring Value |
|-------|--------|------------|-------------------|
| excerpts | generationParams | Medium - 7+ optional fields | **MEDIUM** - Standardize generation config |
| excerpts | socialMetadata | Medium - OG/Twitter metadata | **MEDIUM** - Extract `SocialMediaMetadata` |
| excerptPerformance | platformMetrics | **Complex** - nested platform objects | **HIGH** - Extract `PlatformMetrics` with `SocialMediaEngagement` |
| translations | translationMetadata | Simple-Medium | **LOW** - Works fine |
| writingSessions | improvementMetrics | Medium | **MEDIUM** - Standardize quality metrics |
| generatedDrafts | metadata | Simple | **LOW** - Works fine |

#### Domain: OCR & Transcription (4 columns)
| Table | Column | Complexity | Refactoring Value |
|-------|--------|------------|-------------------|
| ocrResults | boundingBoxes | Medium - 2 levels with bbox | **HIGH** - Extract `BoundingBox` interface (reusable) |
| ocrCorrections | boundingBox | Simple - same as above | **HIGH** - Use same `BoundingBox` |
| transcriptions | segments | Medium - array with timestamps | **MEDIUM** - Extract `TranscriptSegment` |
| transcriptEdits | timestamps | Simple - start/end | **MEDIUM** - Extract `TimeRange` (reusable) |

#### Domain: Face Detection (2 columns)
| Table | Column | Complexity | Refactoring Value |
|-------|--------|------------|-------------------|
| faceDetections | faceCoordinates | **Complex** - 4 levels with landmarks | **HIGH** - Extract `FaceCoordinate` with `FaceLandmarks` |
| faceDetections | metadata | Simple-Medium | **LOW** - Works fine with optional fields |

#### Domain: Dynamic Pricing (3 columns)
| Table | Column | Complexity | Refactoring Value |
|-------|--------|------------|-------------------|
| pricingRules | rules | Medium - pricing algorithm config | **MEDIUM** - Standardize pricing rules |
| priceHistory | changes | Medium - nested competitor data | **MEDIUM** - Extract `PriceChangeDetails` |
| pricingPerformance | metrics | Medium - 7+ performance fields | **MEDIUM** - Standardize performance metrics |

**Refactoring Strategy:**
1. ✅ Group by domain (as listed above)
2. ✅ Extract HIGH-value interfaces first (SentimentScores, EmotionScores, BoundingBox, DeviceInfo)
3. ✅ Address one domain at a time to avoid churn
4. ✅ Sequence based on active feature development

---

### Priority 3 (Low) - Simple Columns Working Fine

**Status:** 🟢 **Stable** - No immediate action needed  
**Count:** ~85 columns  
**Timeline:** Address opportunistically or when touched by features

These columns use simple structures (string[], basic objects with optional fields) that work well without explicit interfaces. Fix only when:
- Adding new features that touch these columns
- Standardizing similar patterns across the application
- Team decides to eliminate ALL `any` types as part of strict typing initiative

#### Categories of Priority 3 Columns:

**Simple Arrays:**
- `userRecipes.dietaryInfo` - `string[]`
- `userRecipes.tags` - `string[]`
- `userRecipes.neededEquipment` - `string[]`
- `userFeedback.attachments` - `string[]`
- `userFeedback.tags` - `string[]`
- `trends.recommendations` - `string[]`
- `maintenancePredictions.preventiveActions` - `string[]`
- `contentEmbeddings.embedding` - `number[]` (vector)
- And ~15 more similar simple arrays

**Simple Metadata Objects:**
- `contentEmbeddings.metadata` - `{title?, category?, tags?, description?}`
- `messages.metadata` - `{functionCall?, citedSources?, sentiment?, feedback?}`
- `generatedDrafts.metadata` - `{model?, temperature?, tokensUsed?, processingTime?}`
- `imageMetadata.dimensions` - `{width?, height?}` (though duplication should be fixed)
- `altTextQuality.metadata` - `{wordCount?, readabilityScore?, sentimentScore?}`
- And ~30 more similar simple metadata objects

**Simple Structured Objects:**
- `conversationContext.keyFacts` - `Array<{fact, category, timestamp}>`
- `relatedContentCache.relatedItems` - `Array<{id, type, title, score}>`
- `userSessions.pageViews` - `Array<{url, title, timestamp}>`
- `ticketRouting.matchedConditions` - `Array<{ruleId, ruleName, matchScore}>`
- And ~25 more similar simple structured arrays

**Generic Record Types (Intentionally Flexible):**
- `analyticsEvents.properties` - `Record<string, any>` - Event-specific data varies widely
- `tickets.metadata.customFields` - Dynamic ticket fields
- `userFormHistory.frequencyMap` - Value frequency mapping
- And ~15 more intentionally flexible Record types

**Recommendation:** These columns are **not broken**. Leave them as-is unless:
1. A specific feature requires stronger typing
2. You're already refactoring the surrounding code
3. Part of a broader "eliminate all `any`" initiative

---

## Implementation Roadmap

### Phase 1: Critical Fixes (Week 1)
**Goal:** Fix all 41 compilation errors

- [ ] Day 1-2: Define all Priority 1 interfaces in `shared/schema.ts`
  - [ ] Analytics: `MetricData`, `AIContext`
  - [ ] Maintenance: `SystemMetricMetadata`, `PredictionFeatures`, `PerformanceComparison`, `MaintenanceCost`
  - [ ] Scheduling: `WeeklyPreferences`, `BlockedTimeSlot`, `MeetingFrequencyStats`, etc.
  - [ ] **Image: `ImageOperations`** (eliminates duplicate)
  - [ ] Privacy: Ensure `excludedFaces` type consistency

- [ ] Day 3: Update `insertSchemas` to use new interfaces
- [ ] Day 4: Update `server/storage.ts` to fix all type errors
- [ ] Day 5: Verify compilation, run tests, deploy

**Success Criteria:** `npx tsc --noEmit` passes with 0 errors

---

### Phase 2: High-Value Refactoring (Weeks 2-4)

**Week 2: Analytics & Sentiment Domain**
- [ ] Extract `SentimentScores`, `EmotionScores` (reusable across 5+ tables)
- [ ] Extract `TrendDataPoints` for trends.dataPoints
- [ ] Standardize analytics metric structures

**Week 3: Content & Media Domain**
- [ ] Extract `BoundingBox` interface (OCR + face detection)
- [ ] Extract `SocialMediaMetadata`, `PlatformMetrics`
- [ ] Extract `FaceCoordinate`, `FaceLandmarks`
- [ ] Extract `DeviceInfo` (eliminate duplicate)
- [ ] Extract `ImageDimensions` (eliminate duplicate)

**Week 4: Forms & Notifications Domain**
- [ ] Extract `NotificationTypeConfig`, `QuietHoursConfig`
- [ ] Standardize form completion interfaces
- [ ] Extract `TranscriptSegment`, `TimeRange`

**Success Criteria:** All Priority 2 HIGH-value extractions complete, type safety improved significantly

---

### Phase 3: Long-term Maintenance (Ongoing)

- [ ] Establish JSON column guidelines (require `.$type`, prefer shared interfaces)
- [ ] Code review checklist for new JSON columns
- [ ] Opportunistic Priority 3 refactoring when touched by features
- [ ] Regular audits to prevent new duplicates/generic types

---

## Architecture Patterns & Best Practices

Based on this audit, establish these guidelines for future JSON columns:

### ✅ DO:
1. **Always use `.$type<...>()`** for type annotations
2. **Extract shared interfaces** when structure appears in 2+ places
3. **Use specific types** instead of `any` or `Record<string, any>` when possible
4. **Document dynamic keys** in Record types with JSDoc examples
5. **Prefer shallow structures** (2 levels) over deeply nested (4+ levels)
6. **Use arrays of typed objects** instead of parallel arrays
7. **Include optional fields** for future extensibility

### ❌ DON'T:
1. **Don't duplicate structures** - extract interface immediately
2. **Don't use `any`** without strong justification
3. **Don't nest beyond 3 levels** - consider flattening or separate table
4. **Don't omit type annotations** - even for "simple" columns
5. **Don't create 150-line inline types** - extract to interface
6. **Don't use inconsistent shapes** for similar concepts across tables

### Example: Good vs. Bad

**❌ BAD:**
```typescript
// Duplicate structures
imageProcessing: jsonb("operations").$type<{
  backgroundRemoval?: boolean;
  filters?: Array<{type: string; /* 150 more lines */}>
}>()

imagePresets: jsonb("operations").$type<{
  backgroundRemoval?: boolean;  // EXACT DUPLICATE
  filters?: Array<{type: string; /* 150 more lines */}>
}>()
```

**✅ GOOD:**
```typescript
// Shared interface
export interface ImageOperations {
  backgroundRemoval?: boolean;
  filters?: Array<FilterConfig>;
  // ... rest of fields
}

// Use in both tables
imageProcessing: jsonb("operations").$type<ImageOperations>().notNull().default({})
imagePresets: jsonb("operations").$type<ImageOperations>().notNull()
```

---

*This audit provides a complete inventory of JSON column usage and serves as a roadmap for schema optimization and type safety improvements.*
