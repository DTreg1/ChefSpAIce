# Food Storage - USDA Cache Implementation

**Priority:** Low  
**File:** `server/storage/domains/food.storage.ts`  
**Stub Count:** 2 methods

## Current Status

Cache management methods are stubs. The cache table may or may not exist - need to verify.

## Methods to Implement

| Method | Description |
|--------|-------------|
| `getUSDACacheStats()` | Get cache statistics |
| `clearOldCache(olderThan)` | Remove old cache entries |

---

## Step 1: Verify/Create Cache Schema

Copy and paste this prompt:

```
Check if a USDA cache table exists in shared/schema/food.ts. Look for something like usdaCache or nutritionCache.

If it doesn't exist, create it:

usdaCache table:
- id: uuid primary key with defaultRandom()
- fdcId: text, not null, unique - USDA FoodData Central ID
- searchQuery: text, nullable - original search term that found this
- data: jsonb, not null - full nutrition data response
- nutrients: jsonb, nullable - extracted key nutrients for quick access
- createdAt: timestamp, default now()
- expiresAt: timestamp, not null - when this cache entry expires
- hitCount: integer, default 0 - how many times accessed

Create insert schema and select type. Run npm run db:push if table is new.
```

---

## Step 2: Implement Cache Methods

Copy and paste this prompt:

```
Implement the 2 USDA cache methods in server/storage/domains/food.storage.ts:

1. getUSDACacheStats(): Promise<{
   totalEntries: number;
   expiredEntries: number;
   validEntries: number;
   oldestEntry: Date | null;
   newestEntry: Date | null;
   avgHitCount: number;
}>
   - Use Drizzle's count() for totalEntries
   - Count where expiresAt < now() for expiredEntries
   - Count where expiresAt >= now() for validEntries
   - Use min(createdAt) for oldestEntry
   - Use max(createdAt) for newestEntry
   - Use avg(hitCount) for avgHitCount

2. clearOldCache(olderThan: Date): Promise<number>
   - Delete from usdaCache where createdAt < olderThan
   - Return the count of deleted entries (may need to select count first, then delete)

Import the usdaCache table from schema. Use sql template for aggregations if needed.
```

---

## Verification

After implementation, test with:

```
Verify the cache implementation:
1. Cache stats return correct counts
2. clearOldCache removes old entries
3. Cache still works for USDA lookups
4. No TypeScript errors

Run npm run check.
```
