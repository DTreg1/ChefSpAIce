# Migration Batch 5: Schemas 55-64

**Status:** 🔴 Not Started  
**Schemas:** 10  
**Progress:** 0/10 (0%)

---

## Schemas 55-64

### 55. insertExcerptPerformanceSchema
```typescript
export const insertExcerptPerformanceSchema = createInsertSchema(excerptPerformance)
  .omit({ id: true, recordedAt: true })
  .extend({
    metrics: z.object({
      views: z.number(),
      engagement: z.number(),
    }).optional(),
    metadata: z.record(z.any()).optional(),
  });
export type InsertExcerptPerformance = z.infer<typeof insertExcerptPerformanceSchema>;
```

### 56. insertTranslationSchema
```typescript
export const insertTranslationSchema = createInsertSchema(translations)
  .omit({ id: true, createdAt: true, translatedAt: true })
  .extend({
    sourceLanguage: z.string(),
    targetLanguage: z.string(),
    metadata: z.record(z.any()).optional(),
  });
export type InsertTranslation = z.infer<typeof insertTranslationSchema>;
```

### 57. insertLanguagePreferenceSchema
```typescript
export const insertLanguagePreferenceSchema = createInsertSchema(languagePreferences)
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({
    preferences: z.array(z.string()).optional(),
  });
export type InsertLanguagePreference = z.infer<typeof insertLanguagePreferenceSchema>;
```

### 58. insertImageMetadataSchema
```typescript
export const insertImageMetadataSchema = createInsertSchema(imageMetadata)
  .omit({ id: true, createdAt: true, analyzedAt: true })
  .extend({
    exifData: z.record(z.any()).optional(),
    dimensions: z.object({
      width: z.number(),
      height: z.number(),
    }).optional(),
    metadata: z.record(z.any()).optional(),
  });
export type InsertImageMetadata = z.infer<typeof insertImageMetadataSchema>;
```

### 59. insertAltTextQualitySchema
```typescript
export const insertAltTextQualitySchema = createInsertSchema(altTextQuality)
  .omit({ id: true, evaluatedAt: true })
  .extend({
    qualityMetrics: z.object({
      descriptiveness: z.number(),
      accuracy: z.number(),
      completeness: z.number(),
    }).optional(),
    suggestions: z.array(z.string()).optional(),
  });
export type InsertAltTextQuality = z.infer<typeof insertAltTextQualitySchema>;
```

### 60. insertBlockedContentSchema
```typescript
export const insertBlockedContentSchema = createInsertSchema(blockedContent)
  .omit({ id: true, blockedAt: true })
  .extend({
    reason: z.enum(["spam", "inappropriate", "copyright", "other"]),
    details: z.record(z.any()).optional(),
  });
export type InsertBlockedContent = z.infer<typeof insertBlockedContentSchema>;
```

### 61. insertModerationAppealSchema
```typescript
export const insertModerationAppealSchema = createInsertSchema(moderationAppeals)
  .omit({ id: true, createdAt: true, resolvedAt: true })
  .extend({
    appealData: z.record(z.any()).optional(),
    evidence: z.array(z.string()).optional(),
  });
export type InsertModerationAppeal = z.infer<typeof insertModerationAppealSchema>;
```

### 62. insertFraudReviewSchema
```typescript
export const insertFraudReviewSchema = createInsertSchema(fraudReviews)
  .omit({ id: true, reviewedAt: true })
  .extend({
    reviewData: z.object({
      decision: z.enum(["approved", "rejected", "flagged"]),
      notes: z.string().optional(),
    }).optional(),
    metadata: z.record(z.any()).optional(),
  });
export type InsertFraudReview = z.infer<typeof insertFraudReviewSchema>;
```

### 63. insertSentimentMetricsSchema
```typescript
export const insertSentimentMetricsSchema = createInsertSchema(sentimentMetrics)
  .omit({ id: true, calculatedAt: true })
  .extend({
    metrics: z.object({
      average: z.number(),
      distribution: z.record(z.number()),
    }).optional(),
    metadata: z.record(z.any()).optional(),
  });
export type InsertSentimentMetrics = z.infer<typeof insertSentimentMetricsSchema>;
```

### 64. insertSentimentAlertsSchema
```typescript
export const insertSentimentAlertsSchema = createInsertSchema(sentimentAlerts)
  .omit({ id: true, triggeredAt: true })
  .extend({
    alertType: z.enum(["negative_spike", "positive_trend", "anomaly"]),
    alertData: z.record(z.any()).optional(),
  });
export type InsertSentimentAlerts = z.infer<typeof insertSentimentAlertsSchema>;
```

