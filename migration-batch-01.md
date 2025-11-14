# Migration Batch 1: Schemas 15-24

**Status:** 🔴 Not Started  
**Schemas:** 10  
**Progress:** 0/10 (0%)

---

## Schema List

| # | Table | Insert Schema | Pattern Type | Priority |
|---|-------|---------------|--------------|----------|
| 15 | `authProviders` | `insertAuthProviderSchema` | Column Overrides | High |
| 16 | `userStorage` | `insertUserStorageSchema` | Simple .omit() | Medium |
| 17 | `pushTokens` | `insertPushTokenSchema` | Column Overrides | High |
| 18 | `notificationPreferences` | `insertNotificationPreferencesSchema` | Column Overrides | High |
| 19 | `notificationScores` | `insertNotificationScoresSchema` | Column Overrides | High |
| 20 | `notificationFeedback` | `insertNotificationFeedbackSchema` | Column Overrides | High |
| 21 | `notificationHistory` | `insertNotificationHistorySchema` | Column Overrides | High |
| 22 | `userAppliances` | `insertUserApplianceSchema` | Simple .omit() | Medium |
| 23 | `userInventory` | `insertUserInventorySchema` | Column Overrides | High |
| 24 | `userRecipes` | `insertRecipeSchema` | Column Overrides | High |

---

## Migration Instructions

For each schema below:
1. ✅ Locate the schema in `shared/schema.ts`
2. ✅ Replace with the new pattern
3. ✅ Add type export
4. ✅ Run LSP check
5. ✅ Verify type inference

---

## Schema 15: insertAuthProviderSchema

### Current Location
Line ~1822 in `shared/schema.ts`

### BEFORE (Old Pattern)
```typescript
export const insertAuthProviderSchema = createInsertSchema(authProviders, {
  // Column overrides here
}).omit({ id: true, userId: true });
```

### AFTER (New Pattern)
```typescript
export const insertAuthProviderSchema = createInsertSchema(authProviders)
  .omit({
    id: true,
    userId: true,
    createdAt: true,
    lastLoginAt: true,
  })
  .extend({
    // Move any column overrides from old pattern here
    // Add explicit Zod schemas for JSON columns if any
  });

export type InsertAuthProvider = z.infer<typeof insertAuthProviderSchema>;
```

### Migration Notes
- Check table definition for JSON columns
- Preserve any existing validation rules
- Auto-generated fields: id, userId, createdAt, lastLoginAt

---

## Schema 16: insertUserStorageSchema

### Current Location
Line ~1889 in `shared/schema.ts`

### BEFORE (Old Pattern)
```typescript
export const insertUserStorageSchema = createInsertSchema(userStorage).omit({
  id: true,
  createdAt: true,
});
```

### AFTER (New Pattern)
```typescript
export const insertUserStorageSchema = createInsertSchema(userStorage)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    // Add explicit Zod schemas for JSON columns
    // metadata: z.record(z.any()).optional(), // if table has metadata
  });

export type InsertUserStorage = z.infer<typeof insertUserStorageSchema>;
```

### Migration Notes
- Check table definition for JSON columns (likely has metadata)
- Simple pattern - mainly adding .extend() for JSON typing
- Auto-generated fields: id, createdAt, updatedAt

---

## Schema 17: insertPushTokenSchema

### Current Location
Line ~1964 in `shared/schema.ts`

### BEFORE (Old Pattern)
```typescript
export const insertPushTokenSchema = createInsertSchema(pushTokens, {
  // Column overrides here
}).omit({ id: true });
```

### AFTER (New Pattern)
```typescript
export const insertPushTokenSchema = createInsertSchema(pushTokens)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    lastUsedAt: true,
  })
  .extend({
    // Move column overrides here
    // Add explicit Zod schemas for JSON columns if any
    platform: z.enum(["ios", "android", "web"]).optional(),
  });

export type InsertPushToken = z.infer<typeof insertPushTokenSchema>;
```

### Migration Notes
- Likely has platform enum validation
- Check for JSON columns (device info, capabilities, etc.)
- Auto-generated fields: id, createdAt, updatedAt, lastUsedAt

---

## Schema 18: insertNotificationPreferencesSchema

### Current Location
Line ~2198 in `shared/schema.ts`

### BEFORE (Old Pattern)
```typescript
export const insertNotificationPreferencesSchema = createInsertSchema(
  notificationPreferences, 
  {
    // Column overrides for preferences JSON
  }
).omit({ id: true });
```

### AFTER (New Pattern)
```typescript
export const insertNotificationPreferencesSchema = createInsertSchema(
  notificationPreferences
)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    preferences: z.object({
      email: z.boolean(),
      push: z.boolean(),
      sms: z.boolean(),
      inApp: z.boolean(),
    }).optional(),
    channels: z.array(z.enum(["email", "push", "sms", "inApp"])).optional(),
  });

export type InsertNotificationPreferences = z.infer<typeof insertNotificationPreferencesSchema>;
```

### Migration Notes
- Likely has preferences JSON object
- May have channels array
- Check existing overrides for validation rules
- Auto-generated fields: id, createdAt, updatedAt

---

## Schema 19: insertNotificationScoresSchema

### Current Location
Line ~2214 in `shared/schema.ts`

### BEFORE (Old Pattern)
```typescript
export const insertNotificationScoresSchema = createInsertSchema(
  notificationScores, 
  {
    // Column overrides
  }
).omit({ id: true });
```

### AFTER (New Pattern)
```typescript
export const insertNotificationScoresSchema = createInsertSchema(
  notificationScores
)
  .omit({
    id: true,
    calculatedAt: true,
    updatedAt: true,
  })
  .extend({
    scores: z.object({
      engagement: z.number(),
      relevance: z.number(),
      timing: z.number(),
    }).optional(),
    factors: z.record(z.number()).optional(),
  });

export type InsertNotificationScores = z.infer<typeof insertNotificationScoresSchema>;
```

### Migration Notes
- Likely has scores/metrics JSON object
- Check for factors or breakdown data
- Auto-generated fields: id, calculatedAt, updatedAt

---

## Schema 20: insertNotificationFeedbackSchema

### Current Location
Line ~2228 in `shared/schema.ts`

### BEFORE (Old Pattern)
```typescript
export const insertNotificationFeedbackSchema = createInsertSchema(
  notificationFeedback, 
  {
    // Column overrides
  }
).omit({ id: true });
```

### AFTER (New Pattern)
```typescript
export const insertNotificationFeedbackSchema = createInsertSchema(
  notificationFeedback
)
  .omit({
    id: true,
    createdAt: true,
  })
  .extend({
    feedback: z.enum(["helpful", "not_helpful", "spam", "irrelevant"]),
    reason: z.string().optional(),
    metadata: z.record(z.any()).optional(),
  });

export type InsertNotificationFeedback = z.infer<typeof insertNotificationFeedbackSchema>;
```

### Migration Notes
- Likely has feedback enum
- May have reason/metadata JSON
- Auto-generated fields: id, createdAt

---

## Schema 21: insertNotificationHistorySchema

### Current Location
Line ~2243 in `shared/schema.ts`

### BEFORE (Old Pattern)
```typescript
export const insertNotificationHistorySchema = createInsertSchema(
  notificationHistory, 
  {
    // Column overrides
  }
).omit({ id: true });
```

### AFTER (New Pattern)
```typescript
export const insertNotificationHistorySchema = createInsertSchema(
  notificationHistory
)
  .omit({
    id: true,
    sentAt: true,
    deliveredAt: true,
    readAt: true,
  })
  .extend({
    status: z.enum(["pending", "sent", "delivered", "read", "failed"]),
    deliveryDetails: z.record(z.any()).optional(),
    errorInfo: z.object({
      code: z.string(),
      message: z.string(),
    }).optional(),
  });

export type InsertNotificationHistory = z.infer<typeof insertNotificationHistorySchema>;
```

### Migration Notes
- Likely has status enum
- May have delivery details JSON
- May have error info for failed notifications
- Auto-generated fields: id, sentAt, deliveredAt, readAt

---

## Schema 22: insertUserApplianceSchema

### Current Location
Line ~2332 in `shared/schema.ts`

### BEFORE (Old Pattern)
```typescript
export const insertUserApplianceSchema = createInsertSchema(userAppliances).omit({
  id: true,
  addedAt: true,
});
```

### AFTER (New Pattern)
```typescript
export const insertUserApplianceSchema = createInsertSchema(userAppliances)
  .omit({
    id: true,
    addedAt: true,
    updatedAt: true,
  })
  .extend({
    // Add explicit Zod schemas for JSON columns
    capabilities: z.array(z.string()).optional(),
    settings: z.record(z.any()).optional(),
    metadata: z.record(z.any()).optional(),
  });

export type InsertUserAppliance = z.infer<typeof insertUserApplianceSchema>;
```

### Migration Notes
- Likely has capabilities array
- May have settings/metadata JSON
- Simple pattern - adding .extend() for JSON typing
- Auto-generated fields: id, addedAt, updatedAt

---

## Schema 23: insertUserInventorySchema

### Current Location
Line ~2439 in `shared/schema.ts`

### BEFORE (Old Pattern)
```typescript
export const insertUserInventorySchema = createInsertSchema(userInventory, {
  // Column overrides
}).omit({ id: true });
```

### AFTER (New Pattern)
```typescript
export const insertUserInventorySchema = createInsertSchema(userInventory)
  .omit({
    id: true,
    addedAt: true,
    updatedAt: true,
    expiresAt: true,
  })
  .extend({
    // Move column overrides here
    nutritionData: z.record(z.any()).optional(),
    storageInfo: z.object({
      location: z.string(),
      container: z.string(),
    }).optional(),
  });

export type InsertUserInventory = z.infer<typeof insertUserInventorySchema>;
```

### Migration Notes
- Likely has nutrition data JSON
- May have storage info JSON
- Check existing overrides for validation
- Auto-generated fields: id, addedAt, updatedAt, expiresAt

---

## Schema 24: insertRecipeSchema

### Current Location
Line ~2574 in `shared/schema.ts`

### BEFORE (Old Pattern)
```typescript
export const insertRecipeSchema = createInsertSchema(userRecipes, {
  // Column overrides
}).omit({ id: true });
```

### AFTER (New Pattern)
```typescript
export const insertRecipeSchema = createInsertSchema(userRecipes)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    // Move column overrides here
    ingredients: z.array(z.object({
      name: z.string(),
      amount: z.string(),
      unit: z.string(),
    })).optional(),
    instructions: z.array(z.string()).optional(),
    nutritionInfo: z.record(z.any()).optional(),
    tags: z.array(z.string()).optional(),
    metadata: z.record(z.any()).optional(),
  });

export type InsertRecipe = z.infer<typeof insertRecipeSchema>;
```

### Migration Notes
- Complex schema with multiple JSON columns
- Likely has ingredients array
- May have instructions array
- May have nutrition info, tags, metadata
- Auto-generated fields: id, createdAt, updatedAt

---

## Verification Checklist

After migrating all 10 schemas:

- [ ] All schemas use `.omit().extend()` pattern
- [ ] All auto-generated fields are in `.omit()`
- [ ] All JSON columns have explicit Zod schemas in `.extend()`
- [ ] All schemas export TypeScript types
- [ ] Run `get_latest_lsp_diagnostics` on shared/schema.ts - should show 0 errors
- [ ] Test type inference on 2-3 schemas to verify no `unknown` types

---

## Progress Tracking

| Schema | Migrated | Type Exported | LSP Clean | Verified |
|--------|----------|---------------|-----------|----------|
| 15. insertAuthProviderSchema | ⬜ | ⬜ | ⬜ | ⬜ |
| 16. insertUserStorageSchema | ⬜ | ⬜ | ⬜ | ⬜ |
| 17. insertPushTokenSchema | ⬜ | ⬜ | ⬜ | ⬜ |
| 18. insertNotificationPreferencesSchema | ⬜ | ⬜ | ⬜ | ⬜ |
| 19. insertNotificationScoresSchema | ⬜ | ⬜ | ⬜ | ⬜ |
| 20. insertNotificationFeedbackSchema | ⬜ | ⬜ | ⬜ | ⬜ |
| 21. insertNotificationHistorySchema | ⬜ | ⬜ | ⬜ | ⬜ |
| 22. insertUserApplianceSchema | ⬜ | ⬜ | ⬜ | ⬜ |
| 23. insertUserInventorySchema | ⬜ | ⬜ | ⬜ | ⬜ |
| 24. insertRecipeSchema | ⬜ | ⬜ | ⬜ | ⬜ |

---

## Next Steps

1. Review each schema's table definition in `shared/schema.ts`
2. Identify all JSON columns that need explicit Zod schemas
3. Migrate each schema following the pattern above
4. Add type exports for all schemas
5. Run LSP diagnostics to verify no errors
6. Move to Batch 2

