# Experiments Storage - A/B Test Insights Implementation

**Priority:** Low  
**File:** `server/storage/domains/experiments.storage.ts`  
**Stub Count:** 1 method

## Current Status

The `createAbTestInsight` method is a stub. The table likely exists but needs verification.

## Methods to Implement

| Method                         | Description                          |
| ------------------------------ | ------------------------------------ |
| `createAbTestInsight(insight)` | Create analysis insight for A/B test |

---

## Step 1: Verify Schema

Copy and paste this prompt:

```
Check shared/schema/experiments.ts for the abTestInsights table. Verify it has these fields:
- id: uuid primary key
- testId: text, references ab_tests
- insightType: text - 'statistical_significance', 'winner_detected', 'anomaly', 'recommendation', 'trend'
- title: text
- description: text
- data: jsonb - insight-specific data
- significance: real, nullable - statistical significance level
- confidence: real, nullable - confidence percentage
- createdAt: timestamp

If the table exists, note the exact field names. If it doesn't exist, create it and run npm run db:push.
```

---

## Step 2: Implement createAbTestInsight

Copy and paste this prompt:

```
Implement createAbTestInsight in server/storage/domains/experiments.storage.ts:

createAbTestInsight(insight: InsertAbTestInsight): Promise<AbTestInsight>
- Insert the insight record into abTestInsights table
- Use .returning() to get the created record
- Return the created insight

The insight data structure should support storing:
- Statistical analysis results (p-value, confidence intervals)
- Winner determination (which variant won and by how much)
- Anomaly detection (unusual patterns in the data)
- Recommendations (suggested actions based on results)

Import abTestInsights and types from @shared/schema/experiments.
```

---

## Verification

After implementation, test with:

```
Verify A/B test insights:
1. Insights can be created
2. Insights link to correct test
3. Various insight types work
4. No TypeScript errors

Run npm run check.
```
