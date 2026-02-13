# Performance — Grade: B+

## Strengths
- 343 useMemo/useCallback/React.memo/lazy instances showing performance awareness
- Lazy-loaded screens via `lazy-screen.tsx`
- Database connection pooling (max 20, with warning threshold at 16)
- Periodic pool health checks every 30 seconds
- Response compression enabled (level 6, threshold 1024 bytes)
- Static asset caching with `maxAge: "1y"` and `immutable: true`
- AI limit caching (30s TTL) to reduce DB hits
- Session caching to avoid repeated DB lookups
- Subscription cache for entitlement checks
- Cursor-based pagination for sync endpoints with composite DB indexes
- Image processing pipeline: resize + WebP conversion (80% quality display, 70% thumbnail)
- Sync queue coalescing to reduce redundant API calls

## Weaknesses
- FlatList used everywhere instead of FlashList (Shopify's faster alternative)
- No query result deduplication or stale-while-revalidate patterns documented
- Sync queue has 500-item hard limit — no warning when approaching
- No bundle size analysis or tree-shaking audit documented
- Database queries in analytics router use raw SQL aggregations without query plan optimization

## Remediation Steps

**Step 1 — Replace FlatList with FlashList for main list screens**
```
Install @shopify/flash-list. Replace FlatList with FlashList in InventoryScreen, RecipesScreen, ShoppingListScreen, CookwareScreen, and MealPlanScreen. FlashList requires an estimatedItemSize prop — set it to the approximate pixel height of each item card. This typically yields 5-10x better scroll performance on large lists.
```

**Step 2 — Add sync queue capacity warning**
```
In client/lib/sync-manager.ts, add a warning when the queue reaches 80% capacity (400 items). Show a non-blocking toast via useToast: "You have many pending changes. Connect to sync them." Also add a count indicator to the PendingSyncBanner showing "X changes pending".
```

**Step 3 — Add bundle analysis script**
```
Add a bundle analysis step: install expo-dev-client's bundle visualizer or use react-native-bundle-visualizer. Add a script to package.json: "analyze:bundle": "npx react-native-bundle-visualizer". Run it and document the top 10 largest dependencies. Look for opportunities to lazy-load heavy modules like sharp, openai, or date-fns.
```
