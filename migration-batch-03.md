# Migration Batch 3: Schemas 35-44

**Status:** 🔴 Not Started  
**Schemas:** 10  
**Progress:** 0/10 (0%)

---

## Schema List

| # | Table | Insert Schema | Pattern Type | Priority |
|---|-------|---------------|--------------|----------|
| 35 | `contentCategories` | `insertContentCategorySchema` | Simple .omit() | Medium |
| 36 | `tags` | `insertTagSchema` | Simple .omit() | Medium |
| 37 | `contentTags` | `insertContentTagSchema` | Simple .omit() | Medium |
| 38 | `duplicatePairs` | `insertDuplicatePairSchema` | Simple .omit() | Medium |
| 39 | `relatedContentCache` | `insertRelatedContentCacheSchema` | Column Overrides | High |
| 40 | `queryLogs` | `insertQueryLogSchema` | Column Overrides | High |
| 41 | `analyticsEvents` | `insertAnalyticsEventSchema` | Column Overrides | High |
| 42 | `userSessions` | `insertUserSessionSchema` | Column Overrides | High |
| 43 | `onboardingInventory` | `insertOnboardingInventorySchema` | Column Overrides | High |
| 44 | `cookingTerms` | `insertCookingTermSchema` | Simple .omit() | Medium |

---

## Quick Reference

Each schema follows this pattern:
1. Move from old `createInsertSchema(table, { overrides })` to `.omit().extend()`
2. Add explicit Zod schemas for all JSON columns
3. Export TypeScript type using `z.infer`

---

## Schemas 35-44

### 35. insertContentCategorySchema
```typescript
export const insertContentCategorySchema = createInsertSchema(contentCategories)
  .omit({ id: true, createdAt: true })
  .extend({ metadata: z.record(z.any()).optional() });
export type InsertContentCategory = z.infer<typeof insertContentCategorySchema>;
```

### 36. insertTagSchema
```typescript
export const insertTagSchema = createInsertSchema(tags)
  .omit({ id: true, createdAt: true, usageCount: true })
  .extend({ metadata: z.record(z.any()).optional() });
export type InsertTag = z.infer<typeof insertTagSchema>;
```

### 37. insertContentTagSchema
```typescript
export const insertContentTagSchema = createInsertSchema(contentTags)
  .omit({ id: true, createdAt: true })
  .extend({});
export type InsertContentTag = z.infer<typeof insertContentTagSchema>;
```

### 38. insertDuplicatePairSchema
```typescript
export const insertDuplicatePairSchema = createInsertSchema(duplicatePairs)
  .omit({ id: true, detectedAt: true })
  .extend({
    similarityMetrics: z.record(z.number()).optional(),
    metadata: z.record(z.any()).optional(),
  });
export type InsertDuplicatePair = z.infer<typeof insertDuplicatePairSchema>;
```

### 39. insertRelatedContentCacheSchema
```typescript
export const insertRelatedContentCacheSchema = createInsertSchema(relatedContentCache)
  .omit({ id: true, cachedAt: true, expiresAt: true })
  .extend({
    relatedItems: z.array(z.object({
      id: z.string(),
      score: z.number(),
    })).optional(),
    metadata: z.record(z.any()).optional(),
  });
export type InsertRelatedContentCache = z.infer<typeof insertRelatedContentCacheSchema>;
```

### 40. insertQueryLogSchema
```typescript
export const insertQueryLogSchema = createInsertSchema(queryLogs)
  .omit({ id: true, executedAt: true })
  .extend({
    queryParams: z.record(z.any()).optional(),
    resultMetrics: z.record(z.any()).optional(),
    metadata: z.record(z.any()).optional(),
  });
export type InsertQueryLog = z.infer<typeof insertQueryLogSchema>;
```

### 41. insertAnalyticsEventSchema
```typescript
export const insertAnalyticsEventSchema = createInsertSchema(analyticsEvents)
  .omit({ id: true, timestamp: true })
  .extend({
    eventType: z.string(),
    properties: z.record(z.any()).optional(),
    metadata: z.record(z.any()).optional(),
  });
export type InsertAnalyticsEvent = z.infer<typeof insertAnalyticsEventSchema>;
```

### 42. insertUserSessionSchema
```typescript
export const insertUserSessionSchema = createInsertSchema(userSessions)
  .omit({ id: true, startedAt: true, endedAt: true, lastActivityAt: true })
  .extend({
    deviceInfo: z.record(z.any()).optional(),
    sessionData: z.record(z.any()).optional(),
    metadata: z.record(z.any()).optional(),
  });
export type InsertUserSession = z.infer<typeof insertUserSessionSchema>;
```

### 43. insertOnboardingInventorySchema
```typescript
export const insertOnboardingInventorySchema = createInsertSchema(onboardingInventory)
  .omit({ id: true, createdAt: true })
  .extend({
    inventoryData: z.array(z.object({
      name: z.string(),
      quantity: z.number(),
    })).optional(),
    metadata: z.record(z.any()).optional(),
  });
export type InsertOnboardingInventory = z.infer<typeof insertOnboardingInventorySchema>;
```

### 44. insertCookingTermSchema
```typescript
export const insertCookingTermSchema = createInsertSchema(cookingTerms)
  .omit({ id: true, createdAt: true })
  .extend({
    translations: z.record(z.string()).optional(),
    metadata: z.record(z.any()).optional(),
  });
export type InsertCookingTerm = z.infer<typeof insertCookingTermSchema>;
```

