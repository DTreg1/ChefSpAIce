# Migration Batch 2: Schemas 25-34

**Status:** 🔴 Not Started  
**Schemas:** 10  
**Progress:** 0/10 (0%)

---

## Schema List

| # | Table | Insert Schema | Pattern Type | Priority |
|---|-------|---------------|--------------|----------|
| 25 | `mealPlans` | `insertMealPlanSchema` | Simple .omit() | Medium |
| 26 | `apiUsageLogs` | `insertApiUsageLogSchema` | Simple .omit() | Medium |
| 27 | `fdcCache` | `insertFdcCacheSchema` | Column Overrides | High |
| 28 | `userShopping` | `insertShoppingListItemSchema` | Simple .omit() | Medium |
| 29 | `userFeedback` | `insertFeedbackSchema` | Column Overrides | High |
| 30 | `donations` | `insertDonationSchema` | Simple .omit() | Medium |
| 31 | `webVitals` | `insertWebVitalSchema` | Column Overrides | High |
| 32 | `contentEmbeddings` | `insertContentEmbeddingSchema` | Column Overrides | High |
| 33 | `searchLogs` | `insertSearchLogSchema` | Simple .omit() | Medium |
| 34 | `categories` | `insertCategorySchema` | Simple .omit() | Medium |

---

## Schema 25: insertMealPlanSchema

### Current Location
Line ~2683 in `shared/schema.ts`

### BEFORE
```typescript
export const insertMealPlanSchema = createInsertSchema(mealPlans).omit({
  id: true,
  createdAt: true,
});
```

### AFTER
```typescript
export const insertMealPlanSchema = createInsertSchema(mealPlans)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    meals: z.array(z.object({
      day: z.string(),
      recipeId: z.string(),
      mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]),
    })).optional(),
    metadata: z.record(z.any()).optional(),
  });

export type InsertMealPlan = z.infer<typeof insertMealPlanSchema>;
```

---

## Schema 26: insertApiUsageLogSchema

### Current Location
Line ~2774 in `shared/schema.ts`

### BEFORE
```typescript
export const insertApiUsageLogSchema = createInsertSchema(apiUsageLogs).omit({
  id: true,
  timestamp: true,
});
```

### AFTER
```typescript
export const insertApiUsageLogSchema = createInsertSchema(apiUsageLogs)
  .omit({
    id: true,
    timestamp: true,
  })
  .extend({
    requestData: z.record(z.any()).optional(),
    responseData: z.record(z.any()).optional(),
    metadata: z.record(z.any()).optional(),
  });

export type InsertApiUsageLog = z.infer<typeof insertApiUsageLogSchema>;
```

---

## Schema 27: insertFdcCacheSchema

### Current Location
Line ~2880 in `shared/schema.ts`

### BEFORE
```typescript
export const insertFdcCacheSchema = createInsertSchema(fdcCache, {
  // Column overrides
}).omit({ id: true });
```

### AFTER
```typescript
export const insertFdcCacheSchema = createInsertSchema(fdcCache)
  .omit({
    id: true,
    cachedAt: true,
    expiresAt: true,
  })
  .extend({
    foodData: z.object({
      description: z.string(),
      nutrients: z.array(z.object({
        name: z.string(),
        value: z.number(),
        unit: z.string(),
      })),
    }).optional(),
    metadata: z.record(z.any()).optional(),
  });

export type InsertFdcCache = z.infer<typeof insertFdcCacheSchema>;
```

---

## Schema 28: insertShoppingListItemSchema

### Current Location
Line ~2982 in `shared/schema.ts`

### BEFORE
```typescript
export const insertShoppingListItemSchema = createInsertSchema(userShopping).omit({
  id: true,
  addedAt: true,
});
```

### AFTER
```typescript
export const insertShoppingListItemSchema = createInsertSchema(userShopping)
  .omit({
    id: true,
    addedAt: true,
    completedAt: true,
  })
  .extend({
    metadata: z.record(z.any()).optional(),
  });

export type InsertShoppingListItem = z.infer<typeof insertShoppingListItemSchema>;
```

---

## Schema 29: insertFeedbackSchema

### Current Location
Line ~3350 in `shared/schema.ts`

### BEFORE
```typescript
export const insertFeedbackSchema = createInsertSchema(userFeedback, {
  // Column overrides
}).omit({ id: true });
```

### AFTER
```typescript
export const insertFeedbackSchema = createInsertSchema(userFeedback)
  .omit({
    id: true,
    createdAt: true,
  })
  .extend({
    feedbackType: z.enum(["bug", "feature", "improvement", "other"]),
    metadata: z.record(z.any()).optional(),
    context: z.record(z.any()).optional(),
  });

export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;
```

---

## Schema 30: insertDonationSchema

### Current Location
Line ~3498 in `shared/schema.ts`

### BEFORE
```typescript
export const insertDonationSchema = createInsertSchema(donations).omit({
  id: true,
  createdAt: true,
});
```

### AFTER
```typescript
export const insertDonationSchema = createInsertSchema(donations)
  .omit({
    id: true,
    createdAt: true,
    processedAt: true,
  })
  .extend({
    paymentDetails: z.record(z.any()).optional(),
    metadata: z.record(z.any()).optional(),
  });

export type InsertDonation = z.infer<typeof insertDonationSchema>;
```

---

## Schema 31: insertWebVitalSchema

### Current Location
Line ~3624 in `shared/schema.ts`

### BEFORE
```typescript
export const insertWebVitalSchema = createInsertSchema(webVitals, {
  // Column overrides
}).omit({ id: true });
```

### AFTER
```typescript
export const insertWebVitalSchema = createInsertSchema(webVitals)
  .omit({
    id: true,
    recordedAt: true,
  })
  .extend({
    metric: z.enum(["LCP", "FID", "CLS", "FCP", "TTFB"]),
    metadata: z.object({
      userAgent: z.string(),
      connection: z.string(),
      deviceMemory: z.number().optional(),
    }).optional(),
  });

export type InsertWebVital = z.infer<typeof insertWebVitalSchema>;
```

---

## Schema 32: insertContentEmbeddingSchema

### Current Location
Line ~3690 in `shared/schema.ts`

### BEFORE
```typescript
export const insertContentEmbeddingSchema = createInsertSchema(contentEmbeddings, {
  // Column overrides
}).omit({ id: true });
```

### AFTER
```typescript
export const insertContentEmbeddingSchema = createInsertSchema(contentEmbeddings)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    embedding: z.array(z.number()),
    metadata: z.record(z.any()).optional(),
  });

export type InsertContentEmbedding = z.infer<typeof insertContentEmbeddingSchema>;
```

---

## Schema 33: insertSearchLogSchema

### Current Location
Line ~3740 in `shared/schema.ts`

### BEFORE
```typescript
export const insertSearchLogSchema = createInsertSchema(searchLogs).omit({
  id: true,
  searchedAt: true,
});
```

### AFTER
```typescript
export const insertSearchLogSchema = createInsertSchema(searchLogs)
  .omit({
    id: true,
    searchedAt: true,
  })
  .extend({
    filters: z.record(z.any()).optional(),
    results: z.array(z.string()).optional(),
    metadata: z.record(z.any()).optional(),
  });

export type InsertSearchLog = z.infer<typeof insertSearchLogSchema>;
```

---

## Schema 34: insertCategorySchema

### Current Location
Line ~3787 in `shared/schema.ts`

### BEFORE
```typescript
export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
  createdAt: true,
});
```

### AFTER
```typescript
export const insertCategorySchema = createInsertSchema(categories)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    metadata: z.record(z.any()).optional(),
  });

export type InsertCategory = z.infer<typeof insertCategorySchema>;
```

---

## Progress Tracking

| Schema | Migrated | Type Exported | LSP Clean | Verified |
|--------|----------|---------------|-----------|----------|
| 25. insertMealPlanSchema | ⬜ | ⬜ | ⬜ | ⬜ |
| 26. insertApiUsageLogSchema | ⬜ | ⬜ | ⬜ | ⬜ |
| 27. insertFdcCacheSchema | ⬜ | ⬜ | ⬜ | ⬜ |
| 28. insertShoppingListItemSchema | ⬜ | ⬜ | ⬜ | ⬜ |
| 29. insertFeedbackSchema | ⬜ | ⬜ | ⬜ | ⬜ |
| 30. insertDonationSchema | ⬜ | ⬜ | ⬜ | ⬜ |
| 31. insertWebVitalSchema | ⬜ | ⬜ | ⬜ | ⬜ |
| 32. insertContentEmbeddingSchema | ⬜ | ⬜ | ⬜ | ⬜ |
| 33. insertSearchLogSchema | ⬜ | ⬜ | ⬜ | ⬜ |
| 34. insertCategorySchema | ⬜ | ⬜ | ⬜ | ⬜ |

