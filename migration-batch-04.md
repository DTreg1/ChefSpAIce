# Migration Batch 4: Schemas 45-54

**Status:** 🔴 Not Started  
**Schemas:** 10  
**Progress:** 0/10 (0%)

---

## Schemas 45-54

### 45. insertApplianceLibrarySchema
```typescript
export const insertApplianceLibrarySchema = createInsertSchema(applianceLibrary)
  .omit({ id: true, createdAt: true })
  .extend({
    capabilities: z.array(z.string()).optional(),
    specifications: z.record(z.any()).optional(),
  });
export type InsertApplianceLibrary = z.infer<typeof insertApplianceLibrarySchema>;
```

### 46. insertConversationSchema
```typescript
export const insertConversationSchema = createInsertSchema(conversations)
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({
    metadata: z.record(z.any()).optional(),
  });
export type InsertConversation = z.infer<typeof insertConversationSchema>;
```

### 47. insertConversationContextSchema
```typescript
export const insertConversationContextSchema = createInsertSchema(conversationContext)
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({
    contextData: z.record(z.any()).optional(),
    entities: z.array(z.string()).optional(),
  });
export type InsertConversationContext = z.infer<typeof insertConversationContextSchema>;
```

### 48. insertVoiceCommandSchema
```typescript
export const insertVoiceCommandSchema = createInsertSchema(voiceCommands)
  .omit({ id: true, recordedAt: true })
  .extend({
    transcription: z.string().optional(),
    confidence: z.number().optional(),
    metadata: z.record(z.any()).optional(),
  });
export type InsertVoiceCommand = z.infer<typeof insertVoiceCommandSchema>;
```

### 49. insertDraftTemplateSchema
```typescript
export const insertDraftTemplateSchema = createInsertSchema(draftTemplates)
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({
    templateData: z.record(z.any()).optional(),
    variables: z.array(z.string()).optional(),
  });
export type InsertDraftTemplate = z.infer<typeof insertDraftTemplateSchema>;
```

### 50. insertWritingSessionSchema
```typescript
export const insertWritingSessionSchema = createInsertSchema(writingSessions)
  .omit({ id: true, startedAt: true, endedAt: true })
  .extend({
    sessionMetrics: z.object({
      wordCount: z.number(),
      duration: z.number(),
    }).optional(),
    metadata: z.record(z.any()).optional(),
  });
export type InsertWritingSession = z.infer<typeof insertWritingSessionSchema>;
```

### 51. insertWritingSuggestionSchema
```typescript
export const insertWritingSuggestionSchema = createInsertSchema(writingSuggestions)
  .omit({ id: true, createdAt: true })
  .extend({
    suggestionType: z.enum(["grammar", "style", "clarity", "tone"]),
    metadata: z.record(z.any()).optional(),
  });
export type InsertWritingSuggestion = z.infer<typeof insertWritingSuggestionSchema>;
```

### 52. insertActivityLogSchema
```typescript
export const insertActivityLogSchema = createInsertSchema(activityLogs)
  .omit({ id: true, timestamp: true })
  .extend({
    activityType: z.string(),
    details: z.record(z.any()).optional(),
    metadata: z.record(z.any()).optional(),
  });
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
```

### 53. insertSummarySchema
```typescript
export const insertSummarySchema = createInsertSchema(summaries)
  .omit({ id: true, createdAt: true, generatedAt: true })
  .extend({
    summaryData: z.object({
      keyPoints: z.array(z.string()),
      length: z.number(),
    }).optional(),
    metadata: z.record(z.any()).optional(),
  });
export type InsertSummary = z.infer<typeof insertSummarySchema>;
```

### 54. insertExcerptSchema
```typescript
export const insertExcerptSchema = createInsertSchema(excerpts)
  .omit({ id: true, createdAt: true, extractedAt: true })
  .extend({
    excerptData: z.record(z.any()).optional(),
    highlights: z.array(z.string()).optional(),
  });
export type InsertExcerpt = z.infer<typeof insertExcerptSchema>;
```

