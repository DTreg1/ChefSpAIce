# Server Utils Fixes - Step by Step Prompts

## Issue 1: BatchQueryBuilder Transaction Handling (Critical)

**File:** `server/utils/batchQueries.ts`

**Problem:** The transaction wrapper never passes the transaction handle (`tx`) to queued operations, causing batched database work to either be skipped or run outside the intended transaction.

### Prompt to Fix:

```
Fix the BatchQueryBuilder in server/utils/batchQueries.ts:

1. In the execute() method, update the db.transaction() call to properly receive and use the transaction handle:
   - Change `db.transaction(async () => { … })` to `db.transaction(async (tx) => { … })`

2. Inside the transaction callback, when executing queued operations:
   - For function-type queries, call them with the transaction: `await query(tx, ...params)`
   - For promise-type queries, ensure they are properly awaited

3. Add proper type checking before execution:
   - Verify each queued item is either a callable function or a Promise
   - Throw descriptive errors for invalid entries

4. Example structure for the fixed execute method:
   ```typescript
   async execute() {
     return db.transaction(async (tx) => {
       const results = [];
       for (const { query, params } of this.queries) {
         if (typeof query === 'function') {
           results.push(await query(tx, ...params));
         } else if (query instanceof Promise) {
           results.push(await query);
         } else {
           throw new Error('Invalid query type: expected function or Promise');
         }
       }
       return results;
     });
   }
   ```
```

---

## Issue 2: USDA Cache Array Mutation (Medium)

**File:** `server/utils/usdaCache.ts`

**Problem:** The `generateCacheKey` function mutates caller-provided arrays when sorting them, which can cause unexpected side effects in code that reuses those options.

### Prompt to Fix:

```
Fix the array mutation issue in server/utils/usdaCache.ts:

1. In the generateCacheKey function (or wherever cache keys are generated from search options):

2. Before sorting any arrays from searchOptions, create a copy first:
   - Instead of: `dataType?.sort()`
   - Use: `[...(searchOptions.dataType ?? [])].sort()`

3. Apply the same pattern to brandOwner and any other array properties:
   - Instead of: `brandOwner?.sort()`
   - Use: `[...(searchOptions.brandOwner ?? [])].sort()`

4. Example fix:
   ```typescript
   // Before (mutates original):
   const sortedDataType = searchOptions.dataType?.sort();
   const sortedBrandOwner = searchOptions.brandOwner?.sort();

   // After (creates copies):
   const sortedDataType = searchOptions.dataType 
     ? [...searchOptions.dataType].sort() 
     : [];
   const sortedBrandOwner = searchOptions.brandOwner 
     ? [...searchOptions.brandOwner].sort() 
     : [];
   ```

5. Ensure all array properties used in cache key generation are cloned before any mutation operations.
```

---

## Issue 3: BatchQueryBuilder Type Safety (Medium)

**File:** `server/utils/batchQueries.ts`

**Problem:** The BatchQueryBuilder lacks validation when adding items to the queue, allowing incorrect inputs (like raw query builder objects) to be silently accepted and fail later.

### Prompt to Fix:

```
Add type safety and runtime validation to BatchQueryBuilder in server/utils/batchQueries.ts:

1. Update the add() method to validate inputs at enqueue time:
   ```typescript
   add<T>(query: ((tx: Transaction) => Promise<T>) | Promise<T>, ...params: unknown[]) {
     // Validate that query is either a function or a Promise
     if (typeof query !== 'function' && !(query instanceof Promise)) {
       throw new Error(
         `BatchQueryBuilder.add() expects a function or Promise, received ${typeof query}. ` +
         `If passing a Drizzle query builder, wrap it in an async function: (tx) => tx.select()...`
       );
     }
     
     this.queries.push({ query, params });
     return this;
   }
   ```

2. Add TypeScript generics to improve compile-time type checking:
   ```typescript
   interface QueuedQuery<T = unknown> {
     query: ((tx: Transaction) => Promise<T>) | Promise<T>;
     params: unknown[];
   }
   
   class BatchQueryBuilder {
     private queries: QueuedQuery[] = [];
     // ...
   }
   ```

3. Consider adding a helper method for common use cases:
   ```typescript
   addQuery<T>(queryFn: (tx: Transaction) => Promise<T>): this {
     if (typeof queryFn !== 'function') {
       throw new Error('addQuery expects a function that receives a transaction');
     }
     this.queries.push({ query: queryFn, params: [] });
     return this;
   }
   ```

4. Add JSDoc comments explaining the expected input types and common pitfalls.
```

---

## Verification Steps

After applying each fix, verify with:

```
1. Run the application and check for TypeScript compilation errors
2. Test any endpoints that use BatchQueryBuilder to ensure transactions work correctly
3. Test USDA search functionality to verify cache key generation works without side effects
4. Check that invalid inputs to BatchQueryBuilder now throw helpful error messages
```
