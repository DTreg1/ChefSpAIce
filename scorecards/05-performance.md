# Performance — Grade: A-

## 1. Client-Side Rendering & Lists

### Strengths
- **Memoization discipline**: 42+ `useMemo`/`useCallback` calls across the 6 main screens alone (InventoryScreen: 6, RecipesScreen: 7, CookwareScreen: 13, RecipeDetailScreen: 9, MealPlanScreen: 4, ShoppingListScreen: 3). Context providers also memoize heavily (AuthContext: 9, SearchContext: 9, FloatingChatContext: 6, OnboardingContext: 6).
- **[REMEDIATED] FlashList on major list screens**: `@shopify/flash-list` adopted for the 5 heaviest list screens — InventoryScreen, RecipesScreen (previously 886 LOC with FlatList), ShoppingListScreen, CookwareScreen (previously 985 LOC), SelectRecipeScreen, and CookingTermsScreen. FlashList provides 5-10x better scroll performance through cell recycling with `estimatedItemSize` configured per screen.
- **`getItemLayout` on fixed-height lists**: ShoppingListScreen and CookingTermsScreen provide `getItemLayout` for O(1) scroll-to-index, bypassing layout measurement.
- **Reanimated over legacy Animated**: 15+ components use `react-native-reanimated` for native-thread animations (GlassCard, GlassButton, CustomTabBar, FloatingChatButton, SkeletonBox, OfflineIndicator, AddMenu, SyncStatusIndicator, etc.). Only 2 files use legacy `Animated` with `useNativeDriver: true` (RecipeVoiceControls, AddItemScreen).
- **Debounced inputs**: `useDebounce` hook is applied to shelf-life suggestion lookups (`useShelfLifeSuggestion`) to avoid rapid API calls on each keystroke. Sync queue uses a 2-second debounce before flushing.
- **[REMEDIATED] expo-image for client-side image caching**: `expo-image` adopted across 10+ screens (SelectRecipeScreen, CookwareScreen, ProfileScreen, GrocerySearchScreen, AuthScreen, FoodCameraScreen, ReceiptScanScreen, etc.). Provides built-in disk+memory caching, progressive loading, and native WebP support aligned with the server's WebP output pipeline.

### Remaining Considerations
- `removeClippedSubviews` not set on FlashList instances — FlashList manages this internally in most cases, but explicit configuration could help on very long lists.
- No `windowSize` tuning on remaining FlatList instances.

## 2. Code Splitting & Bundle Size

### Strengths
- **Comprehensive lazy loading**: 30+ screens are lazy-loaded via `React.lazy()` + `withSuspense()` wrapper in `client/lib/lazy-screen.tsx`. Every stack navigator (Root, Profile, Recipes, Inventory, MealPlan, Cookware) uses lazy imports. Web routes also lazy-load (Landing, About, Privacy, Terms, Support).
- **Suspense fallback**: A lightweight `ActivityIndicator` fallback avoids blank screens during chunk loads.
- **[REMEDIATED] Bundle analysis script**: `"analyze:bundle": "npx react-native-bundle-visualizer"` added to `package.json` scripts, providing visibility into dependency size and tree-shaking opportunities.

### Remaining Considerations
- No tree-shaking audit documented — heavy server-side libraries (`sharp`, `openai`) are imported at module scope and could leak into client bundle.

## 3. Server-Side Caching

### Strengths
- **Multi-layer cache architecture with Redis fallback**:
  - `CacheService` (`server/lib/cache.ts`) provides a unified interface that auto-selects `RedisCacheStore` when `REDIS_URL` is set, falling back to `MemoryCacheStore`. Redis configuration includes `maxRetriesPerRequest: 3`, `enableReadyCheck`, and silent fallthrough on errors.
  - **Session cache**: 60-second TTL (`server/lib/session-cache.ts`) — avoids DB lookups on every authenticated request.
  - **Subscription cache**: 5-minute TTL (`server/lib/subscription-cache.ts`) — reduces entitlement-check DB load. Properly invalidated on webhook events (6 invalidation points in `webhookHandlers.ts`), auth events, and subscription mutations.
  - **AI limit cache**: 30-second TTL (`server/services/subscriptionService.ts`) — prevents rapid-fire DB queries during recipe generation bursts. Invalidated after recording usage.
  - **Nutrition lookup cache**: 5-minute TTL, keyed by `foodName|brand` (`server/services/nutritionLookupService.ts`) — avoids redundant USDA API calls. Caches null results to prevent re-fetching known misses.
  - **Stripe prices cache**: Simple timestamp-based in-memory cache (`server/stripe/subscription/checkout.ts`) — prevents fetching Stripe prices on every checkout page load.
- **[REMEDIATED] MemoryCacheStore eviction policy**: `maxSize` option (default 10,000) with periodic `sweep()` timer (every 5 minutes) that removes expired entries. When map exceeds `maxSize`, oldest entries are evicted on `set()` (`cache.ts:19-52`).
- **[REMEDIATED] DatabaseCacheStore for persistent caching**: `DatabaseCacheStore<T>` backed by the `api_cache` table provides persistent caching that survives server restarts. Used for nutrition and shelf life lookups. Daily `cacheCleanupJob` removes expired entries (`jobs/cacheCleanupJob.ts`).
- **Static asset caching**: Three `express.static` mounts use `maxAge: "1y"` + `immutable: true` (`/_expo`, `/assets`, `/public/showcase`), allowing browsers to cache indefinitely until filenames change.

### Remaining Considerations
- No ETag or conditional response support for API endpoints — clients receive full payloads on every request.

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
- **[REMEDIATED] Statement timeout**: `statement_timeout: 30000` (30 seconds) configured on the connection pool, preventing runaway queries from monopolizing connections indefinitely (`db.ts:53`).
- **[REMEDIATED] Slow query logging**: Custom Drizzle ORM logger measures query execution time via `performance.now()`. Queries exceeding thresholds are logged with parameterized SQL and duration (`db.ts:18-35`).

### Remaining Considerations
- Analytics router issues remain:
  - The main `/api/admin/analytics` endpoint executes 14 separate COUNT queries in `Promise.all()`, creating a burst of ~15 connections.
  - The advanced metrics endpoint runs 4 complex CTEs simultaneously. No caching on any analytics endpoint.
  - These are admin-only endpoints and low-traffic, so the practical impact is limited.

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
- **[REMEDIATED] Streaming recipe generation**: `/generate-stream` endpoint uses Server-Sent Events (`text/event-stream`) to stream recipe content from OpenAI as it generates, eliminating the previous 5-15 second blank wait (`recipes.router.ts:158-289`).

### Remaining Considerations
- Sync queue serialization overhead: every `queueChange()` call reads the entire queue from AsyncStorage (`JSON.parse`), modifies it, and writes it back. A more efficient approach would use append-only writes or SQLite.
- Full sync pulls entire dataset: `fullSync()` downloads all data in one request. Delta sync via `lastSyncedAt` is partially implemented.

## 6. Image Processing

### Strengths
- **Server-side pipeline**: `sharp` processes all recipe images before storage — resizes to max 800px (display) and 200px (thumbnail), converts to WebP (80% and 70% quality respectively). `withoutEnlargement: true` prevents upscaling small images.
- **Parallel processing**: Display and thumbnail are generated simultaneously via `Promise.all()`.
- **Backward compatibility**: Delete and read operations handle both legacy `.jpg` and new `.webp` files transparently.
- **Performance logging**: Every image processing operation logs original size, processed sizes, savings percentage, and elapsed time.

### Remaining Considerations
- Triple `sharp` instantiation: `processImage()` creates 3 instances from the same buffer — one for metadata, one for display, one for thumbnail. A single pipeline with `.clone()` would be more memory-efficient.

## 7. Background Jobs

### Strengths
- **PostgreSQL-backed scheduler**: Advisory locks (`pg_try_advisory_lock`) ensure exactly-once execution across multiple server instances. Jobs tracked in `cron_jobs` table with last run time, duration, and error logging.
- **30-second poll interval**: Low overhead — scheduler checks if jobs are due every 30 seconds, not every second.
- **Comprehensive job suite**: 6 background jobs — session cleanup, cache cleanup, data retention, soft-delete cleanup, winback campaigns, and job scheduling.

## Summary Table

| Category | Grade | Key Metric |
|---|---|---|
| Client rendering & lists | A | FlashList on 5+ screens; expo-image for caching |
| Code splitting | A- | 30+ lazy screens; bundle analysis available |
| Server caching | A | Multi-layer with eviction, persistent DB cache, Redis fallback |
| Database performance | A | 60+ indexes, cursor pagination, statement timeout, slow query logging |
| Network & API | A- | Compression, coalescing, streaming, background-aware sync |
| Image processing | B+ | WebP pipeline with thumbnails; triple sharp instantiation |
| Background jobs | A | Advisory-lock scheduler, 6 jobs, exactly-once semantics |

**Overall: A-**

## Remediations Completed

| # | Remediation | Status |
|---|-------------|--------|
| 1 | Replace FlatList with FlashList on main list screens | **Done** (5+ screens) |
| 2 | Add MemoryCache eviction to prevent unbounded growth | **Done** (maxSize + sweep) |
| 3 | Adopt expo-image for client-side image caching | **Done** (10+ screens) |
| 4 | Add statement timeout to connection pool | **Done** (30s) |
| 5 | Add slow query logging | **Done** (performance.now timing) |
| 6 | Add persistent caching (DatabaseCacheStore) | **Done** (api_cache table) |
| 7 | Add bundle analysis script | **Done** (react-native-bundle-visualizer) |
| 8 | Add streaming for recipe generation | **Done** (SSE endpoint) |

## Remaining Low-Priority Items

- Cache analytics endpoints (admin-only, low traffic).
- Use `sharp.clone()` to avoid triple instantiation.
- Add ETag/conditional responses for frequently-polled API endpoints.
- Optimize sync queue AsyncStorage serialization.
