# Server Services Fix Guide

> **Historical Reference Document**
> 
> This document was created as a reference guide for service improvements. Many of these issues have been addressed in subsequent sprints (particularly Sprint 3 and 4). 
> 
> **Status Summary:**
> - Phase 1 (Critical Fixes): Partially addressed - chatService.ts refactored, embeddings.ts fixed
> - Phase 2 (Error Handling): Outstanding - review individual items for current status
> - Phase 3 (Performance): Outstanding - batch optimization opportunities remain
> - Phase 4 (Architecture): Complete - OpenAI client consolidated, vectorMath utilities created
> - Phase 5-6 (Security/Quality): Outstanding - review for current applicability
> 
> Use as a reference for understanding past technical debt and improvement patterns.

A comprehensive, step-by-step guide to fix logical errors and improve the server/services directory.

---

## Table of Contents

1. [Phase 1: Critical Fixes](#phase-1-critical-fixes)
2. [Phase 2: Error Handling Fixes](#phase-2-error-handling-fixes)
3. [Phase 3: Performance Improvements](#phase-3-performance-improvements)
4. [Phase 4: Architectural Improvements](#phase-4-architectural-improvements)
5. [Phase 5: Security Fixes](#phase-5-security-fixes)
6. [Phase 6: Code Quality Cleanup](#phase-6-code-quality-cleanup)
7. [Execution Checklist](#execution-checklist)

---

## Phase 1: Critical Fixes

### 1.1 Fix predictionService.ts - Real Metrics Instead of Mock Data

**The Problem:** `getUserMetrics()` returns random mock data, making all predictions useless.

**File:** `server/services/predictionService.ts`

**Copy this prompt:**

```
Refactor server/services/predictionService.ts so getUserMetrics(userId) pulls real metrics via storage.platform.analytics rather than random mock data. The method should:

1. Query user activity logs to get lastActiveDate, sessionCount, and averageSessionDuration
2. Query feature usage from analytics events to populate featureUsageCount
3. Query content creation counts (recipes, etc.) for contentCreatedCount
4. Calculate activityTrend based on comparing recent 7-day activity to previous 7-day activity
5. Calculate daysSinceSignup from user.createdAt
6. Return an empty/default UserMetrics object if no analytics data exists (don't throw)
7. Keep the UserMetrics interface unchanged for backward compatibility
```

---

### 1.2 Fix chatService.ts - Migrate from Deprecated Tables

**The Problem:** Entire service is stubbed with deprecation warnings; chat functionality is broken.

**File:** `server/services/chatService.ts`

**Copy this prompt:**

```
Rewrite server/services/chatService.ts to use the userChats table instead of the deleted conversations/messages tables:

1. Remove all @deprecated annotations and console.warn statements
2. Implement getOrCreateConversation to query/create records in userChats table
3. Implement sendMessage to:
   - Store user message in userChats
   - Call OpenAI with message history from userChats
   - Store assistant response in userChats
   - Return proper conversation and message IDs
4. Implement getUserConversations to return distinct conversation sessions from userChats
5. Implement getConversationMessages to query userChats with proper userId/conversationId filtering
6. Keep MAX_CONTEXT_MESSAGES (15) and CONTEXT_SUMMARY_THRESHOLD (20) logic for context management
7. Remove all TODO comments once implemented
```

---

### 1.3 Fix duplicate-detection.service.ts - Resolve 22 LSP Errors

**The Problem:** Missing schema references, type mismatches, and nonexistent fields.

**File:** `server/services/duplicate-detection.service.ts`

**Copy this prompt:**

```
Fix all 22 LSP diagnostics in server/services/duplicate-detection.service.ts:

1. Review imports from @shared/schema and ../../shared/schema - consolidate to use only @shared/schema
2. Check if userRecipes.similarityHash field exists in schema - if not, remove line 397 that tries to update it
3. Check if userChats.similarityHash field exists in schema - if not, remove lines 400-404
4. Verify ChatMessage type has a 'content' property (line 86-87)
5. Ensure contentEmbeddings schema matches the InsertContentEmbedding type being used
6. Fix any type mismatches in the onConflictDoUpdate target arrays (lines 225, 383)
7. Run get_latest_lsp_diagnostics on this file after each fix to verify progress
8. All 22 diagnostics must be resolved before considering this complete
```

---

### 1.4 Fix embeddings.ts - Null Storage Reference

**The Problem:** Line 218 creates `EmbeddingsService(null)` which will crash on any storage operation.

**File:** `server/services/embeddings.ts`

**Copy this prompt:**

```
Fix the null storage issue in server/services/embeddings.ts:

1. Find line 218 where generateEmbedding creates EmbeddingsService with null: `new EmbeddingsService(null)`
2. Either:
   a) Import and use the actual storage.content implementation, OR
   b) Refactor generateEmbedding to not instantiate EmbeddingsService (just call OpenAI directly)
3. Add a runtime assertion in EmbeddingsService constructor that throws if storage is null/undefined
4. Search the codebase for other places that might instantiate EmbeddingsService incorrectly
5. Ensure the standalone generateEmbedding function works without needing storage (it only calls OpenAI)
```

---

## Phase 2: Error Handling Fixes

### 2.1 Fix fraud.service.ts - Fail-Safe on Errors

**The Problem:** Returns fraudScore: 0 on errors, allowing potentially fraudulent behavior through.

**File:** `server/services/fraud.service.ts`

**Copy this prompt:**

```
Update server/services/fraud.service.ts error handling to fail safe:

1. In analyzeUserBehavior catch block (lines 225-246), change the return to:
   - fraudScore: RISK_THRESHOLDS.high (0.75) instead of 0
   - riskLevel: 'high' instead of 'low'
   - shouldBlock: false (let manual review decide)
   - requiresManualReview: true (keep this)
   - recommendations: ['Fraud analysis failed - manual review required', 'System error during analysis']

2. Add structured error logging:
   console.error('Fraud analysis failed - defaulting to high risk', { userId: userBehavior.userId, error });

3. Consider adding a metrics counter for fraud analysis failures for monitoring
```

---

### 2.2 Fix moderation.service.ts - Safe Fallback on Errors

**The Problem:** Returns `approved: true` on errors, allowing toxic content through during outages.

**File:** `server/services/moderation.service.ts`

**Copy this prompt:**

```
Update server/services/moderation.service.ts checkContent error handling (lines 174-187):

1. Change the error fallback to be safe by default:
   - approved: false (not true)
   - action: 'flagged' (keep this)
   - message: 'Content held for review due to system error. Please try again.'

2. Add audit logging for failed moderation checks:
   - Log the error with userId, contentType, and content hash (not full content)
   - Include timestamp for tracking

3. Consider adding a retry mechanism for transient OpenAI API errors before falling back

4. For contentType === 'critical' or similar high-risk types, default to action: 'blocked' instead of 'flagged'
```

---

### 2.3 Fix sentimentService.ts - Surface OpenAI Errors

**The Problem:** Silently swallows OpenAI errors with no visibility for monitoring.

**File:** `server/services/sentimentService.ts`

**Copy this prompt:**

```
Improve error visibility in server/services/sentimentService.ts:

1. In getEmotionAnalysis catch block (lines 484-491):
   - Add structured logging: console.warn('OpenAI emotion analysis failed, using fallback', { error: error.message })
   - Consider tracking failure rate with a counter

2. In getAspectBasedSentiment catch block (lines 556-560):
   - Add similar structured logging

3. Add a new method getServiceHealth() that returns:
   - Whether the service is using AI or fallback mode
   - Recent error count
   - Last successful AI call timestamp

4. Consider adding retry logic with exponential backoff for rate limit errors (429)
```

---

## Phase 3: Performance Improvements

### 3.1 Fix trend-analyzer.service.ts - Batch Database Writes

**The Problem:** Lines 92-103 loop with individual database calls for each trend.

**File:** `server/services/trend-analyzer.service.ts`

**Copy this prompt:**

```
Optimize server/services/trend-analyzer.service.ts to batch database writes:

1. Collect all trends before writing to database (currently done)

2. Replace the loop at lines 92-103 that calls createTrend individually:
   - Check if storage.platform.analytics has a createTrendsBatch or createTrends method
   - If not, add one to the storage layer that accepts an array
   - Use a single batch insert instead of N individual inserts

3. Move the alert checking to after the batch insert:
   - Batch the alert checks as well if possible
   - Or use Promise.all to check alerts in parallel

4. Wrap the entire batch operation in a transaction for data consistency
```

---

### 3.2 Fix push-notification.service.ts - Parallel Sends

**The Problem:** Sequential notification sends with individual DB writes per token.

**File:** `server/services/push-notification.service.ts`

**Copy this prompt:**

```
Optimize server/services/push-notification.service.ts sendToUser method (lines 79-174):

1. Group tokens by platform (web, ios, android) for potential batching

2. Replace sequential for...of loop with Promise.allSettled:
   const results = await Promise.allSettled(
     tokens.map(token => this.sendToSingleToken(token, payload))
   );

3. Extract single token send logic to a private method sendToSingleToken

4. Batch notification history inserts:
   - Collect all history records
   - Use a single db.insert().values(historyRecords) at the end

5. Add rate limiting (e.g., 100 concurrent sends max) using p-limit or similar

6. Batch the token update timestamps as well
```

---

### 3.3 Fix duplicate-detection.service.ts - Eliminate N+1 Query

**The Problem:** getPendingDuplicates makes 2 DB queries per duplicate pair.

**File:** `server/services/duplicate-detection.service.ts`

**Copy this prompt:**

```
Optimize getPendingDuplicates in server/services/duplicate-detection.service.ts (lines 248-296):

1. After fetching pending pairs, collect all unique contentId1 and contentId2 values

2. Fetch all related recipes in a single query:
   const recipeIds = [...new Set(pending.flatMap(p => [p.contentId1, p.contentId2]))];
   const recipes = await db.select().from(userRecipes).where(inArray(userRecipes.id, recipeIds));
   const recipeMap = new Map(recipes.map(r => [r.id, r]));

3. Replace the Promise.all with map lookups:
   const enrichedPairs = pending.map(pair => ({
     ...pair,
     content1: recipeMap.get(pair.contentId1),
     content2: recipeMap.get(pair.contentId2)
   }));

4. This reduces N*2 queries to just 2 queries total
```

---

## Phase 4: Architectural Improvements

### 4.1 Create Shared OpenAI Client Factory

**The Problem:** Inconsistent OpenAI initialization across services (some use AI Integrations, some don't).

**New File:** `server/integrations/openaiClient.ts`

**Copy this prompt:**

```
Create a shared OpenAI client factory at server/integrations/openaiClient.ts:

1. Create the file with:
   - A getOpenAIClient() function that returns a configured OpenAI instance
   - Check for AI_INTEGRATIONS_OPENAI_BASE_URL and AI_INTEGRATIONS_OPENAI_API_KEY first
   - Fall back to OPENAI_API_KEY if integrations not configured
   - Throw descriptive error if neither is configured

2. Update these services to use the shared client:
   - sentimentService.ts
   - analytics.service.ts  
   - predictionService.ts
   - duplicate-detection.service.ts
   - chatService.ts
   - fraud.service.ts (already uses openai from integrations)
   - moderation.service.ts (already uses openai from integrations)

3. Remove duplicate OpenAI initialization code from each service
```

---

### 4.2 Create Model Version Registry

**The Problem:** Random model strings (gpt-5, gpt-4o-mini, gpt-3.5-turbo) scattered across services.

**New File:** `server/integrations/modelRegistry.ts`

**Copy this prompt:**

```
Create a model registry at server/integrations/modelRegistry.ts:

1. Define model constants:
   export const MODELS = {
     CHAT_DEFAULT: 'gpt-4o-mini',        // Cost-effective for most tasks
     CHAT_ADVANCED: 'gpt-5',             // Complex reasoning
     CHAT_FAST: 'gpt-3.5-turbo',         // Quick responses
     EMBEDDINGS: 'text-embedding-ada-002',
     MODERATION: 'omni-moderation-latest'
   };

2. Define use-case to model mapping:
   export function getModelForUseCase(useCase: 'sentiment' | 'fraud' | 'moderation' | 'chat' | 'summarization'): string

3. Update all services to import and use this registry instead of hardcoded strings

4. Add fallback logic if a model is unavailable
```

---

### 4.3 Extract Shared Vector Math Utilities

**The Problem:** Cosine similarity implemented twice (duplicate-detection.service.ts and embeddings.ts).

**New File:** `server/utils/vectorMath.ts`

**Copy this prompt:**

```
Create shared vector utilities at server/utils/vectorMath.ts:

1. Extract cosineSimilarity function:
   export function cosineSimilarity(vecA: number[], vecB: number[]): number

2. Add other useful vector operations:
   export function dotProduct(vecA: number[], vecB: number[]): number
   export function euclideanDistance(vecA: number[], vecB: number[]): number
   export function normalizeVector(vec: number[]): number[]

3. Update duplicate-detection.service.ts to import from vectorMath.ts (remove lines 45-65)

4. Update embeddings.ts to import from vectorMath.ts (remove lines 225-248)

5. Add unit tests for these utility functions
```

---

## Phase 5: Security Fixes

### 5.1 Fix push-notification.service.ts - Strict VAPID Validation

**The Problem:** Allows placeholder VAPID keys, causing silent failures.

**File:** `server/services/push-notification.service.ts`

**Copy this prompt:**

```
Strengthen VAPID key validation in server/services/push-notification.service.ts:

1. Replace the warning-only approach (lines 16-26) with:
   
   if (process.env.NODE_ENV === 'production') {
     if (!isVapidConfigured) {
       throw new Error('VAPID keys must be configured for production. Generate with: npx web-push generate-vapid-keys');
     }
   }

2. In development, keep the warning but also:
   - Set a flag like VAPID_CONFIGURED = false
   - In sendToUser, check this flag and skip web push sends with a clear log message

3. Add a health check method:
   static isWebPushConfigured(): boolean { return isVapidConfigured; }
```

---

### 5.2 Fix fraud.service.ts - Sanitize AI Prompts

**The Problem:** User behavior data goes directly into AI prompts without sanitization.

**File:** `server/services/fraud.service.ts`

**Copy this prompt:**

```
Add prompt sanitization in server/services/fraud.service.ts:

1. Create a sanitizeForPrompt helper function:
   private sanitizeForPrompt(data: any): string {
     // Remove or escape potential prompt injection patterns
     const str = JSON.stringify(data);
     return str
       .replace(/```/g, '')           // Remove code blocks
       .replace(/\bsystem\b/gi, '')   // Remove 'system' keyword
       .replace(/\brole\b/gi, '')     // Remove 'role' keyword
       .slice(0, 2000);               // Limit length
   }

2. Use this in analyzeBehaviorPatterns (line 266) before embedding in prompt:
   content: `Analyze this user behavior...:\n${this.sanitizeForPrompt(behaviorSummary)}`

3. Do the same in analyzeContentPatterns (line 346)

4. Consider using structured data format instead of free-form JSON in prompts
```

---

## Phase 6: Code Quality Cleanup

### 6.1 Fix lightweightPrediction.ts - Extract Magic Numbers

**File:** `server/services/lightweightPrediction.ts`

**Copy this prompt:**

```
Extract magic numbers from server/services/lightweightPrediction.ts to constants:

1. Create a configuration object at the top:
   const CHURN_CONFIG = {
     weights: {
       daysSinceActive: 0.35,
       sessionFrequency: 0.25,
       sessionDuration: 0.15,
       featureAdoption: 0.15,
       activityTrend: 0.10,
     },
     thresholds: {
       inactiveDays: { critical: 30, high: 14, medium: 7 },
       sessions: { low: 5, medium: 10, high: 20 },
       duration: { short: 60, medium: 180, long: 300 },
       features: { low: 2, medium: 4, high: 6 },
     }
   };

2. Replace all hardcoded numbers with references to this config

3. Export the config for testing and potential runtime adjustment
```

---

### 6.2 Remove Dead Code from apiCache.service.ts

**File:** `server/services/apiCache.service.ts`

**Copy this prompt:**

```
Clean up server/services/apiCache.service.ts:

1. The cleanupAllCaches function (lines 22-33) does nothing - either:
   a) Remove it entirely and update any imports, OR
   b) Implement real cleanup that calls ApiCacheService methods

2. The getCacheStats function (lines 35-61) returns hardcoded zeros - either:
   a) Remove it entirely, OR
   b) Implement real stats by calling ApiCacheService.getStatistics() if available

3. Search codebase for any uses of these functions and update/remove them

4. Add a comment explaining the current caching architecture if keeping the file
```

---

### 6.3 Re-enable Notification Queue Processing

**File:** `server/services/notification-scheduler.service.ts`

**Copy this prompt:**

```
Re-enable queue processing in server/services/notification-scheduler.service.ts:

1. Uncomment the queueProcessingTask (lines 29-36)

2. Add proper error handling with backoff:
   let consecutiveErrors = 0;
   this.queueProcessingTask = cron.schedule('* * * * *', async () => {
     try {
       await intelligentNotificationService.processNotificationQueue();
       consecutiveErrors = 0;
     } catch (error) {
       consecutiveErrors++;
       console.error('Queue processing error', { consecutiveErrors, error });
       if (consecutiveErrors > 5) {
         console.warn('Queue processing paused due to repeated errors');
       }
     }
   });

3. Add an environment variable toggle:
   if (process.env.DISABLE_NOTIFICATION_QUEUE !== 'true') { ... }

4. Document why it was disabled and what was fixed
```

---

## Execution Checklist

Use this checklist to track progress:

### Phase 1: Critical Fixes
- [ ] 1.1 predictionService.ts - Real metrics
- [ ] 1.2 chatService.ts - Migration
- [ ] 1.3 duplicate-detection.service.ts - LSP errors
- [ ] 1.4 embeddings.ts - Null storage

### Phase 2: Error Handling
- [ ] 2.1 fraud.service.ts - Fail-safe
- [ ] 2.2 moderation.service.ts - Safe fallback
- [ ] 2.3 sentimentService.ts - Error visibility

### Phase 3: Performance
- [ ] 3.1 trend-analyzer.service.ts - Batch writes
- [ ] 3.2 push-notification.service.ts - Parallel sends
- [ ] 3.3 duplicate-detection.service.ts - N+1 fix

### Phase 4: Architecture
- [ ] 4.1 Shared OpenAI client factory
- [ ] 4.2 Model version registry
- [ ] 4.3 Shared vector math utilities

### Phase 5: Security
- [ ] 5.1 VAPID validation
- [ ] 5.2 AI prompt sanitization

### Phase 6: Code Quality
- [ ] 6.1 Magic numbers extraction
- [ ] 6.2 Dead code removal
- [ ] 6.3 Queue processing re-enable

---

## Summary of Issues Found

| Category | File | Issue | Priority |
|----------|------|-------|----------|
| Critical | predictionService.ts | Mock data in production | P0 |
| Critical | chatService.ts | Broken/deprecated service | P0 |
| Critical | duplicate-detection.service.ts | 22 LSP errors | P0 |
| Critical | embeddings.ts | Null storage reference | P0 |
| Error Handling | fraud.service.ts | Zero fraud score on error | P1 |
| Error Handling | moderation.service.ts | Approves on error | P1 |
| Error Handling | sentimentService.ts | Silent error swallowing | P1 |
| Performance | trend-analyzer.service.ts | N+1 queries | P2 |
| Performance | push-notification.service.ts | Sequential sends | P2 |
| Performance | duplicate-detection.service.ts | N+1 in getPendingDuplicates | P2 |
| Architecture | Multiple files | Inconsistent OpenAI init | P2 |
| Architecture | Multiple files | Model version chaos | P2 |
| Architecture | 2 files | Duplicate cosine similarity | P3 |
| Security | push-notification.service.ts | Weak VAPID validation | P1 |
| Security | fraud.service.ts | Unsanitized prompts | P1 |
| Code Quality | lightweightPrediction.ts | Magic numbers | P3 |
| Code Quality | apiCache.service.ts | Dead code | P3 |
| Code Quality | notification-scheduler.service.ts | Disabled feature | P2 |

---

*Generated on: November 26, 2025*
*Status: Historical Reference - Many items addressed in Sprint 3 and 4*
