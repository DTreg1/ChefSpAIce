# Performance — Grade: B+

## 1. Client-Side Rendering & Lists

### Strengths
- **Memoization discipline**: 42+ `useMemo`/`useCallback` calls across the 6 main screens alone (InventoryScreen: 6, RecipesScreen: 7, CookwareScreen: 13, RecipeDetailScreen: 9, MealPlanScreen: 4, ShoppingListScreen: 3). Context providers also memoize heavily (AuthContext: 9, SearchContext: 9, FloatingChatContext: 6, OnboardingContext: 6).
- **FlatList tuning on every major list**: `initialNumToRender={10}`, `maxToRenderPerBatch={5}`, and `keyExtractor` are set on InventoryScreen, RecipesScreen, ShoppingListScreen, CookwareScreen, SelectRecipeScreen, and CookingTermsScreen.
- **`getItemLayout` on fixed-height lists**: ShoppingListScreen and CookingTermsScreen provide `getItemLayout` for O(1) scroll-to-index, bypassing layout measurement.
- **Reanimated over legacy Animated**: 15+ components use `react-native-reanimated` for native-thread animations (GlassCard, GlassButton, CustomTabBar, FloatingChatButton, SkeletonBox, OfflineIndicator, AddMenu, SyncStatusIndicator, etc.). Only 2 files use legacy `Animated` with `useNativeDriver: true` (RecipeVoiceControls, AddItemScreen).
- **Debounced inputs**: `useDebounce` hook is applied to shelf-life suggestion lookups (`useShelfLifeSuggestion`) to avoid rapid API calls on each keystroke. Sync queue uses a 2-second debounce before flushing.

### Weaknesses
- **FlatList everywhere — no FlashList**: All 8 list screens use React Native's `FlatList`. `@shopify/flash-list` typically provides 5-10x better scroll performance through cell recycling. The heaviest screens (RecipesScreen at 886 LOC, CookwareScreen at 985 LOC) would benefit most.
- **Missing `getItemLayout` on most lists**: Only 2 of 8 FlatLists provide `getItemLayout`. Without it, FlatList must measure every cell, which causes jank during rapid scrolling. InventoryScreen, RecipesScreen, CookwareScreen, and SelectRecipeScreen all lack it.
- **No `removeClippedSubviews`**: None of the FlatLists set `removeClippedSubviews={true}`, which would detach off-screen views from the native hierarchy and reduce memory pressure on long lists.
- **No `windowSize` tuning**: All FlatLists use the default `windowSize={21}` (10 screens above + 10 below + 1 visible). For lists with heavy item renderers (recipe cards with images), reducing this to 5-7 would lower memory usage.
- **No image prefetching or caching library**: The app uses standard React Native `Image` with `resizeMode` only (10 instances). No `expo-image`, `FastImage`, or `Image.prefetch()` for proactive cache warming of recipe/product images.

## 2. Code Splitting & Bundle Size

### Strengths
- **Comprehensive lazy loading**: 30+ screens are lazy-loaded via `React.lazy()` + `withSuspense()` wrapper in `client/lib/lazy-screen.tsx`. Every stack navigator (Root, Profile, Recipes, Inventory, MealPlan, Cookware) uses lazy imports. Web routes also lazy-load (Landing, About, Privacy, Terms, Support).
- **Suspense fallback**: A lightweight `ActivityIndicator` fallback avoids blank screens during chunk loads.

### Weaknesses
- **No bundle size analysis tooling**: No `react-native-bundle-visualizer`, `expo-bundle-analyzer`, or equivalent is configured. Without visibility, large dependencies (`sharp`, `openai`, `react-native-reanimated`, `date-fns`) may be pulling in more code than necessary.
- **No tree-shaking audit**: Heavy server-side libraries (`sharp`, `openai`) are imported at module scope. If any shared code accidentally leaks into the client bundle, the impact is unknown.

## 3. Server-Side Caching

### Strengths
- **Multi-layer cache architecture with Redis fallback**:
  - `CacheService` (`server/lib/cache.ts`) provides a unified interface that auto-selects `RedisCacheStore` when `REDIS_URL` is set, falling back to `MemoryCacheStore`. Redis configuration includes `maxRetriesPerRequest: 3`, `enableReadyCheck`, and silent fallthrough on errors.
  - **Session cache**: 60-second TTL (`server/lib/session-cache.ts`) — avoids DB lookups on every authenticated request.
  - **Subscription cache**: 5-minute TTL (`server/lib/subscription-cache.ts`) — reduces entitlement-check DB load. Properly invalidated on webhook events (6 invalidation points in `webhookHandlers.ts`), auth events, and subscription mutations.
  - **AI limit cache**: 30-second TTL (`server/services/subscriptionService.ts`) — prevents rapid-fire DB queries during recipe generation bursts. Invalidated after recording usage.
  - **Nutrition lookup cache**: 5-minute TTL, keyed by `foodName|brand` (`server/services/nutritionLookupService.ts`) — avoids redundant USDA API calls. Caches null results to prevent re-fetching known misses.
  - **Stripe prices cache**: Simple timestamp-based in-memory cache (`server/stripe/subscription/checkout.ts`) — prevents fetching Stripe prices on every checkout page load.
- **Static asset caching**: Three `express.static` mounts use `maxAge: "1y"` + `immutable: true` (`/_expo`, `/assets`, `/public/showcase`), allowing browsers to cache indefinitely until filenames change.

### Weaknesses
- **MemoryCacheStore has no eviction policy**: The in-memory Map grows unbounded — entries are only removed on explicit `delete()` or when a `get()` finds an expired entry. There is no max-size cap, LRU eviction, or periodic sweep. Under sustained load with many unique users, the session and subscription caches could consume significant memory.
- **Nutrition name cache (`Map`) has no eviction at all**: Unlike the CacheService caches, this raw `Map<string, {...}>` in `nutritionLookupService.ts` never evicts entries. Individual entries expire on read (TTL check), but the Map itself grows forever.
- **Two static paths lack cache headers**: `/assets` and `/attached_assets` are served via `express.static` with no `maxAge` or `immutable`, meaning browsers will revalidate on every request.
- **No ETag or conditional response support**: API endpoints return full payloads on every request. No `ETag`, `Last-Modified`, or `304 Not Modified` support for data endpoints (e.g., inventory lists, recipe details) that clients poll frequently.

## 4. Database Performance

### Strengths
- **Connection pooling**: `pg.Pool` with `max: 20`, `idleTimeoutMillis: 30000`, `connectionTimeoutMillis: 5000`. Warning logged when active connections exceed 16 (80% capacity). Pool health checks run every 30 seconds with `unref()` to avoid blocking process exit.
- **Comprehensive indexing**: 60+ indexes defined in `shared/schema.ts` covering all major query patterns:
  - Composite cursor-pagination indexes `(userId, updatedAt, id)` on inventory, recipes, shopping, and cookware tables.
  - Category/filter indexes: `(userId, category)`, `(userId, expirationDate)`, `(userId, deletedAt)`, `(userId, isFavorite)`, `(userId, isChecked)`, `(userId, date)`.
  - Unique constraints for deduplication: `(userId, itemId)` on all item tables, `(userId, entryId)` on logs.
  - Subscription indexes: `(status, planType)`, `canceledAt`, `stripeCustomerId`, `stripeSubscriptionId`.
- **Cursor-based pagination**: Sync GET endpoints use `?limit=50&cursor=...` with base64url-encoded `(updatedAt, id)` composite cursor, avoiding OFFSET-based pagination degradation on large tables.
- **Parallel query execution**: Analytics router fires 14 independent queries via `Promise.all()` instead of sequentially. Sync router also parallelizes multi-section reads.
- **Stripe pool isolation**: Stripe client uses a separate mini pool (`max: 2`) to prevent Stripe webhook bursts from starving the main application pool.

### Weaknesses
- **Analytics router issues**:
  - The main `/api/admin/analytics` endpoint executes **14 separate COUNT queries** plus a raw SQL aggregation in a single `Promise.all()`. While parallelized, this creates a burst of 15 connections (~75% of the pool) on every admin dashboard load.
  - The `/api/admin/analytics/advanced-metrics` endpoint runs **4 complex CTEs** (MRR history, churn, conversion, cohort retention) simultaneously — each involving `generate_series`, multiple JOINs, and window functions across 12 months of data. No caching on any analytics endpoint despite data changing infrequently.
  - Subqueries like `userId IN (SELECT id FROM users WHERE subscription_tier = 'PRO')` in `subscription-metrics` could be replaced with JOINs for better query plan optimization.
- **No query plan documentation**: None of the complex analytics queries have `EXPLAIN ANALYZE` results documented to verify index usage and avoid sequential scans.

## 5. Network & API Performance

### Strengths
- **Response compression**: `compression` middleware at level 6 with 1024-byte threshold. Smart filter: skips Stripe webhooks (which need raw bodies) and respects `x-no-compression` header.
- **Tiered rate limiting**: Four rate limiters protect different endpoint classes:
  - Auth: 10 requests / 15 minutes
  - AI: 30 requests / minute
  - Password reset: 3 / hour (keyed by email)
  - General: 100 / minute (skips AI/auth paths to avoid double-limiting)
- **Sync queue coalescing**: Duplicate mutations on the same item are merged (delete replaces anything; update-after-create stays as create; otherwise latest wins), reducing redundant API calls.
- **Background-aware sync**: `SyncManager` pauses all timers and sync processing when the app goes to background (`AppState` listener), saving battery and bandwidth. Resumes and immediately drains queue on foreground.
- **Exponential backoff**: Failed sync items retry with `min(1000 * 2^retryCount, 60000)` delay. Items marked fatal after 5 retries or 4xx responses.
- **Queue capacity monitoring**: `isQueueNearCapacity` flag triggers at 80% (400 items). Warning toast shown to user. Oldest update items are evicted when queue hits 500.

### Weaknesses
- **Sync queue serialization overhead**: Every `queueChange()` call reads the entire queue from AsyncStorage (`JSON.parse`), modifies it, and writes it back (`JSON.stringify`). With a 500-item queue, this is a full parse+serialize cycle on every user mutation. A more efficient approach would use append-only writes or SQLite.
- **Full sync pulls entire dataset**: `fullSync()` downloads all inventory, recipes, meal plans, and shopping list data in one request. For users with large datasets (hundreds of recipes), this could be a multi-megabyte payload. Delta sync is partially implemented (`lastSyncedAt` param) but the client overwrites local storage wholesale.

## 6. Image Processing

### Strengths
- **Server-side pipeline**: `sharp` processes all recipe images before storage — resizes to max 800px (display) and 200px (thumbnail), converts to WebP (80% and 70% quality respectively). `withoutEnlargement: true` prevents upscaling small images.
- **Parallel processing**: Display and thumbnail are generated simultaneously via `Promise.all()`.
- **Backward compatibility**: Delete and read operations handle both legacy `.jpg` and new `.webp` files transparently.
- **Performance logging**: Every image processing operation logs original size, processed sizes, savings percentage, and elapsed time.

### Weaknesses
- **Triple sharp instantiation**: `processImage()` creates 3 `sharp` instances from the same input buffer — one for metadata, one for display, one for thumbnail. A single pipeline with `.clone()` would be more memory-efficient.
- **No client-side image caching library**: Standard React Native `Image` component is used everywhere. No `expo-image` (which provides built-in disk/memory caching, blurhash placeholders, and progressive loading) or `react-native-fast-image`.

## 7. Background Jobs

### Strengths
- **PostgreSQL-backed scheduler**: Advisory locks (`pg_try_advisory_lock`) ensure exactly-once execution across multiple server instances. Jobs tracked in `cron_jobs` table with last run time, duration, and error logging.
- **30-second poll interval**: Low overhead — scheduler checks if jobs are due every 30 seconds, not every second.

## Summary Table

| Category | Grade | Key Metric |
|---|---|---|
| Client rendering & lists | B- | FlatList tuned but not FlashList; no image caching lib |
| Code splitting | A- | 30+ lazy screens; no bundle analysis |
| Server caching | B+ | 5 cache layers with Redis fallback; no eviction policy |
| Database performance | B+ | 60+ indexes, cursor pagination; analytics queries unoptimized |
| Network & API | A- | Compression, coalescing, background-aware sync; serialization overhead |
| Image processing | B+ | WebP pipeline with thumbnails; triple sharp instantiation |
| Background jobs | A | Advisory-lock scheduler, exactly-once semantics |

**Overall: B+**

## Remediation Steps (Priority Order)

**Step 1 — Replace FlatList with FlashList on main list screens** (High impact)
```
Install @shopify/flash-list. Replace FlatList with FlashList in InventoryScreen,
RecipesScreen, ShoppingListScreen, CookwareScreen, SelectRecipeScreen, and
CookingTermsScreen. Set estimatedItemSize to the approximate pixel height of each
item card (e.g., 120 for inventory cards, 200 for recipe cards). FlashList uses
cell recycling which typically yields 5-10x better scroll performance and lower
memory usage. Remove initialNumToRender and maxToRenderPerBatch as FlashList
manages these internally.
```

**Step 2 — Add MemoryCache eviction to prevent unbounded growth** (Medium impact)
```
In server/lib/cache.ts MemoryCacheStore, add a maxSize option (default 10000) and
periodic sweep. On set(), if map.size > maxSize, evict the oldest 20% of entries
by expiresAt. Add a sweep timer (every 5 minutes) that removes expired entries.
Also convert nutritionLookupService.ts nameCache from raw Map to CacheService to
get the same eviction behavior.
```

**Step 3 — Cache analytics endpoints** (Medium impact)
```
In server/routers/admin/analytics.router.ts, wrap each endpoint's response in a
CacheService with a 5-minute TTL keyed by endpoint name. Admin dashboard data
changes slowly — there is no need to run 15+ DB queries on every page load. Also
consolidate the 14 individual COUNT queries in the main endpoint into a single SQL
query using conditional aggregation:
  SELECT
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE created_at >= now() - interval '7 days') as new_7d,
    COUNT(*) FILTER (WHERE subscription_tier = 'PRO') as pro,
    ...
  FROM users;
This reduces the burst from 15 connections to 2-3.
```

**Step 4 — Add cache headers to remaining static paths** (Low effort)
```
In server/index.ts, add maxAge and immutable to the two uncached static routes:
  app.use("/assets", express.static(..., { maxAge: "1y", immutable: true }));
  app.use("/attached_assets", express.static(..., { maxAge: "1y", immutable: true }));
```

**Step 5 — Use sharp.clone() to avoid triple instantiation** (Low effort)
```
In server/services/imageProcessingService.ts, create one sharp instance and clone:
  const source = sharp(inputBuffer);
  const metadata = await source.metadata();
  const [display, thumbnail] = await Promise.all([
    source.clone().resize({...}).webp({...}).toBuffer(),
    source.clone().resize({...}).webp({...}).toBuffer(),
  ]);
This reuses decoded pixel data instead of decoding the input buffer 3 times.
```

**Step 6 — Adopt expo-image for client-side image caching** (Medium effort)
```
Replace react-native Image with expo-image in recipe cards, product images, and
profile avatars. expo-image provides disk+memory caching, blurhash/thumbhash
placeholders, progressive loading, and better cross-platform performance. It also
supports the WebP format natively which aligns with the server's WebP output.
```

**Step 7 — Add bundle analysis script** (Low effort)
```
Add a script to package.json: "analyze:bundle": "npx react-native-bundle-visualizer".
Run it and document the top 10 largest dependencies. Look for tree-shaking
opportunities on heavy imports (date-fns, openai, sharp) and verify no server-only
code leaks into the client bundle.
```
