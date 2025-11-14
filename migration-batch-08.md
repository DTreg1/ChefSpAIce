# Migration Batch 8: Schemas 85-94

**Status:** 🔴 Not Started  
**Schemas:** 10  
**Progress:** 0/10 (0%)

---

## Schemas 85-94

### 85. insertRoutingRuleSchema
```typescript
export const insertRoutingRuleSchema = createInsertSchema(routingRules)
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({
    ruleConfig: z.object({
      conditions: z.array(z.record(z.any())),
      actions: z.array(z.string()),
    }).optional(),
  });
export type InsertRoutingRule = z.infer<typeof insertRoutingRuleSchema>;
```

### 86. insertTicketRoutingSchema
```typescript
export const insertTicketRoutingSchema = createInsertSchema(ticketRouting)
  .omit({ id: true, routedAt: true })
  .extend({
    routingData: z.record(z.any()).optional(),
  });
export type InsertTicketRouting = z.infer<typeof insertTicketRoutingSchema>;
```

### 87. insertAgentExpertiseSchema
```typescript
export const insertAgentExpertiseSchema = createInsertSchema(agentExpertise)
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({
    expertiseAreas: z.array(z.string()).optional(),
    proficiencyLevels: z.record(z.number()).optional(),
  });
export type InsertAgentExpertise = z.infer<typeof insertAgentExpertiseSchema>;
```

### 88. insertExtractionTemplateSchema
```typescript
export const insertExtractionTemplateSchema = createInsertSchema(extractionTemplates)
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({
    templateConfig: z.object({
      fields: z.array(z.string()),
      rules: z.array(z.record(z.any())),
    }).optional(),
  });
export type InsertExtractionTemplate = z.infer<typeof insertExtractionTemplateSchema>;
```

### 89. insertExtractedDataSchema
```typescript
export const insertExtractedDataSchema = createInsertSchema(extractedData)
  .omit({ id: true, extractedAt: true })
  .extend({
    extractedFields: z.record(z.any()).optional(),
    confidence: z.number().optional(),
  });
export type InsertExtractedData = z.infer<typeof insertExtractedDataSchema>;
```

### 90. insertPricingRulesSchema
```typescript
export const insertPricingRulesSchema = createInsertSchema(pricingRules)
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({
    ruleConfig: z.object({
      conditions: z.array(z.record(z.any())),
      pricing: z.record(z.number()),
    }).optional(),
  });
export type InsertPricingRules = z.infer<typeof insertPricingRulesSchema>;
```

### 91. insertPriceHistorySchema
```typescript
export const insertPriceHistorySchema = createInsertSchema(priceHistory)
  .omit({ id: true, recordedAt: true })
  .extend({
    priceData: z.object({
      amount: z.number(),
      currency: z.string(),
    }).optional(),
    metadata: z.record(z.any()).optional(),
  });
export type InsertPriceHistory = z.infer<typeof insertPriceHistorySchema>;
```

### 92. insertPricingPerformanceSchema
```typescript
export const insertPricingPerformanceSchema = createInsertSchema(pricingPerformance)
  .omit({ id: true, analyzedAt: true })
  .extend({
    performanceMetrics: z.record(z.number()).optional(),
    metadata: z.record(z.any()).optional(),
  });
export type InsertPricingPerformance = z.infer<typeof insertPricingPerformanceSchema>;
```

### 93. insertImageProcessingSchema
```typescript
export const insertImageProcessingSchema = createInsertSchema(imageProcessing)
  .omit({ id: true, processedAt: true })
  .extend({
    processingData: z.record(z.any()).optional(),
    results: z.record(z.any()).optional(),
  });
export type InsertImageProcessing = z.infer<typeof insertImageProcessingSchema>;
```

### 94. insertImagePresetsSchema
```typescript
export const insertImagePresetsSchema = createInsertSchema(imagePresets)
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({
    presetConfig: z.object({
      width: z.number(),
      height: z.number(),
      quality: z.number(),
    }).optional(),
  });
export type InsertImagePresets = z.infer<typeof insertImagePresetsSchema>;
```

