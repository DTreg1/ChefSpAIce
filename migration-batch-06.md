# Migration Batch 6: Schemas 65-74

**Status:** 🔴 Not Started  
**Schemas:** 10  
**Progress:** 0/10 (0%)

---

## Schemas 65-74

### 65. insertSentimentSegmentsSchema
```typescript
export const insertSentimentSegmentsSchema = createInsertSchema(sentimentSegments)
  .omit({ id: true, createdAt: true })
  .extend({
    segmentData: z.object({
      segment: z.string(),
      sentiment: z.number(),
    }).optional(),
    metadata: z.record(z.any()).optional(),
  });
export type InsertSentimentSegments = z.infer<typeof insertSentimentSegmentsSchema>;
```

### 66. insertSentimentTrendSchema
```typescript
export const insertSentimentTrendSchema = createInsertSchema(sentimentTrends)
  .omit({ id: true, analyzedAt: true })
  .extend({
    trendData: z.array(z.object({
      timestamp: z.string(),
      score: z.number(),
    })).optional(),
    metadata: z.record(z.any()).optional(),
  });
export type InsertSentimentTrend = z.infer<typeof insertSentimentTrendSchema>;
```

### 67. insertSavePatternSchema
```typescript
export const insertSavePatternSchema = createInsertSchema(savePatterns)
  .omit({ id: true, detectedAt: true })
  .extend({
    patternData: z.object({
      frequency: z.number(),
      locations: z.array(z.string()),
    }).optional(),
    metadata: z.record(z.any()).optional(),
  });
export type InsertSavePattern = z.infer<typeof insertSavePatternSchema>;
```

### 68. insertFormCompletionSchema
```typescript
export const insertFormCompletionSchema = createInsertSchema(formCompletions)
  .omit({ id: true, completedAt: true })
  .extend({
    formData: z.record(z.any()).optional(),
    completionMetrics: z.object({
      duration: z.number(),
      fieldCount: z.number(),
    }).optional(),
  });
export type InsertFormCompletion = z.infer<typeof insertFormCompletionSchema>;
```

### 69. insertUserFormHistorySchema
```typescript
export const insertUserFormHistorySchema = createInsertSchema(userFormHistory)
  .omit({ id: true, createdAt: true })
  .extend({
    historyData: z.array(z.record(z.any())).optional(),
    metadata: z.record(z.any()).optional(),
  });
export type InsertUserFormHistory = z.infer<typeof insertUserFormHistorySchema>;
```

### 70. insertCompletionFeedbackSchema
```typescript
export const insertCompletionFeedbackSchema = createInsertSchema(completionFeedback)
  .omit({ id: true, createdAt: true })
  .extend({
    feedbackType: z.enum(["helpful", "not_helpful", "inaccurate"]),
    details: z.string().optional(),
  });
export type InsertCompletionFeedback = z.infer<typeof insertCompletionFeedbackSchema>;
```

### 71. insertValidationRuleSchema
```typescript
export const insertValidationRuleSchema = createInsertSchema(validationRules)
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({
    ruleConfig: z.record(z.any()).optional(),
    conditions: z.array(z.record(z.any())).optional(),
  });
export type InsertValidationRule = z.infer<typeof insertValidationRuleSchema>;
```

### 72. insertValidationErrorSchema
```typescript
export const insertValidationErrorSchema = createInsertSchema(validationErrors)
  .omit({ id: true, occurredAt: true })
  .extend({
    errorDetails: z.object({
      field: z.string(),
      message: z.string(),
      code: z.string(),
    }).optional(),
    metadata: z.record(z.any()).optional(),
  });
export type InsertValidationError = z.infer<typeof insertValidationErrorSchema>;
```

### 73. insertInsightFeedbackSchema
```typescript
export const insertInsightFeedbackSchema = createInsertSchema(insightFeedback)
  .omit({ id: true, createdAt: true })
  .extend({
    rating: z.number().min(1).max(5).optional(),
    feedback: z.string().optional(),
  });
export type InsertInsightFeedback = z.infer<typeof insertInsightFeedbackSchema>;
```

### 74. insertPredictionAccuracySchema
```typescript
export const insertPredictionAccuracySchema = createInsertSchema(predictionAccuracy)
  .omit({ id: true, measuredAt: true })
  .extend({
    accuracyMetrics: z.object({
      accuracy: z.number(),
      precision: z.number(),
      recall: z.number(),
    }).optional(),
    metadata: z.record(z.any()).optional(),
  });
export type InsertPredictionAccuracy = z.infer<typeof insertPredictionAccuracySchema>;
```

