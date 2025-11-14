# Migration Batch 9: Schemas 95-102

**Status:** 🔴 Not Started  
**Schemas:** 8 (Final Batch)  
**Progress:** 0/8 (0%)

---

## Schemas 95-102 (Final Batch)

### 95. insertFaceDetectionSchema
```typescript
export const insertFaceDetectionSchema = createInsertSchema(faceDetections)
  .omit({ id: true, detectedAt: true })
  .extend({
    detectionData: z.object({
      faces: z.array(z.object({
        boundingBox: z.record(z.number()),
        confidence: z.number(),
      })),
    }).optional(),
    metadata: z.record(z.any()).optional(),
  });
export type InsertFaceDetection = z.infer<typeof insertFaceDetectionSchema>;
```

### 96. insertPrivacySettingsSchema
```typescript
export const insertPrivacySettingsSchema = createInsertSchema(privacySettings)
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({
    settings: z.object({
      blurFaces: z.boolean(),
      removeMetadata: z.boolean(),
    }).optional(),
  });
export type InsertPrivacySettings = z.infer<typeof insertPrivacySettingsSchema>;
```

### 97. insertOcrResultSchema
```typescript
export const insertOcrResultSchema = createInsertSchema(ocrResults)
  .omit({ id: true, processedAt: true })
  .extend({
    ocrData: z.object({
      text: z.string(),
      confidence: z.number(),
      blocks: z.array(z.record(z.any())),
    }).optional(),
    metadata: z.record(z.any()).optional(),
  });
export type InsertOcrResult = z.infer<typeof insertOcrResultSchema>;
```

### 98. insertOcrCorrectionSchema
```typescript
export const insertOcrCorrectionSchema = createInsertSchema(ocrCorrections)
  .omit({ id: true, correctedAt: true })
  .extend({
    correctionData: z.object({
      original: z.string(),
      corrected: z.string(),
    }).optional(),
  });
export type InsertOcrCorrection = z.infer<typeof insertOcrCorrectionSchema>;
```

### 99. insertTranscriptionSchema
```typescript
export const insertTranscriptionSchema = createInsertSchema(transcriptions)
  .omit({ id: true, transcribedAt: true })
  .extend({
    transcriptionData: z.object({
      text: z.string(),
      confidence: z.number(),
      segments: z.array(z.record(z.any())),
    }).optional(),
    metadata: z.record(z.any()).optional(),
  });
export type InsertTranscription = z.infer<typeof insertTranscriptionSchema>;
```

### 100. insertTranscriptEditSchema
```typescript
export const insertTranscriptEditSchema = createInsertSchema(transcriptEdits)
  .omit({ id: true, editedAt: true })
  .extend({
    editData: z.object({
      original: z.string(),
      edited: z.string(),
      timestamp: z.string(),
    }).optional(),
  });
export type InsertTranscriptEdit = z.infer<typeof insertTranscriptEditSchema>;
```

### 101. insertModerationAppealSchema (if not already in batch 5)
```typescript
export const insertModerationAppealSchema = createInsertSchema(moderationAppeals)
  .omit({ id: true, createdAt: true, resolvedAt: true })
  .extend({
    appealData: z.record(z.any()).optional(),
    evidence: z.array(z.string()).optional(),
  });
export type InsertModerationAppeal = z.infer<typeof insertModerationAppealSchema>;
```

### 102. insertSuspiciousActivitySchema (if exists)
```typescript
export const insertSuspiciousActivitySchema = createInsertSchema(suspiciousActivities)
  .omit({ id: true, detectedAt: true })
  .extend({
    activityData: z.record(z.any()).optional(),
    riskScore: z.number().optional(),
  });
export type InsertSuspiciousActivity = z.infer<typeof insertSuspiciousActivitySchema>;
```

---

## 🎉 Final Batch Complete!

After completing this batch, all 102 insert schemas will be migrated to the new `.omit().extend()` pattern.

### Overall Progress Summary

- ✅ Batch 1: Schemas 1-14 (Already Complete)
- 🔴 Batch 2: Schemas 15-24 (10 schemas)
- 🔴 Batch 3: Schemas 25-34 (10 schemas)
- 🔴 Batch 4: Schemas 35-44 (10 schemas)
- 🔴 Batch 5: Schemas 45-54 (10 schemas)
- 🔴 Batch 6: Schemas 55-64 (10 schemas)
- 🔴 Batch 7: Schemas 65-74 (10 schemas)
- 🔴 Batch 8: Schemas 75-84 (10 schemas)
- 🔴 Batch 9: Schemas 85-94 (10 schemas)
- 🔴 Batch 10: Schemas 95-102 (8 schemas)

**Total:** 102 schemas across 10 batches

