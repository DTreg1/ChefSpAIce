# Core Features — Grade: B+

## Overall Assessment
The application delivers an impressive breadth of features for a kitchen management app — inventory, AI recipes, 5 scanner types, voice commands, meal planning, shopping with Instacart, and more. However, several features have incomplete implementations beneath the surface (most critically: expiration notifications are not scheduled, server notifications have no push delivery, analytics are client-only with no persistence, and in-memory caches are lost on restart). The single subscription tier also limits user acquisition strategy.

---

## Feature-by-Feature Breakdown

### 1. Inventory Management — A
**Status: Complete**

**Strengths:**
- Full CRUD via sync endpoints (POST create, PUT update, DELETE) with Zod validation
- Soft-delete with `deletedAt` timestamp; permanent purge after 30 days
- Batch add via `AddFoodBatchScreen` for scan results
- Upsert on create with `onConflictDoUpdate` prevents duplicates
- Custom storage location support with dynamic loading
- CSV export functionality
- Comprehensive nutrition data attached to items
- Skeleton loading states, pull-to-refresh, subscription limit enforcement (`checkPantryItemLimit`)

**Weaknesses:**
- `loadItems` fetches all items at once from local storage — no lazy loading for very large inventories
- `fullSync()` overwrites local storage wholesale — any local-only changes not yet queued are silently lost
- Stale update detection uses `<=` comparison — simultaneous edits default to "skip" with no user notification

---

### 2. AI Recipe Generation — A-
**Status: Complete**

**Strengths:**
- Excellent prompt engineering with structured sections (culinary identity, mission, smart substitutions, ingredient naming, response format, final checklist)
- 11 cuisine-specific chef personas with authentic techniques and signature elements
- JSON response format enforced via `response_format: { type: "json_object" }`
- Sophisticated fuzzy ingredient matching: normalizes plurals (including irregular forms like knives→knife), strips qualifiers (organic, boneless, fresh), substring matching
- Phantom ingredient detection scans recipe description and instructions for non-inventory food terms
- Expiring items prioritized with urgency labels
- Previous recipe titles tracked for variety
- Quick recipe mode enforces 20-minute cap
- Macro nutrition targets included in prompt
- Comprehensive OpenAI error handling (429, 503, 400, 401/403) with user-friendly messages

**Weaknesses:**
- No streaming support — recipe generation blocks until complete, causing noticeable wait
- `max_completion_tokens: 2048` hardcoded — complex recipes could be truncated silently
- `gpt-4o-mini` model hardcoded with no configuration option
- No retry logic on the OpenAI call itself; if generation fails, user must retry manually
- Double subscription limit check (before and after generation) creates an unnecessary extra DB call
- `_prioritizeExpiring` flag is received but not actually used differently in prompt construction

---

### 3. Scanning Features — A-
**Status: Complete**

**Strengths:**
- All 5 scan types implemented: Barcode, Receipt OCR, Food Camera, Nutrition Label, Recipe Scanner
- ScanHub provides unified entry point with clear descriptions per scan type
- Camera permission handling with fallback to settings link
- App state management: camera suspended on background, resumed on foreground
- Image picker fallback for gallery selection
- Receipt scanning extracts items, store name, purchase date, total, confidence scores
- Food camera returns category, quantity, unit, storage location suggestions
- Animated loading overlays provide good user feedback
- Subscription gating with `UpgradePrompt` for premium scan types

**Weaknesses:**
- Barcode scanner only extracts the barcode string and navigates to AddItem — no product database lookup in the scanner itself
- No image compression before upload — large images sent as full base64, slow on poor connections
- No confidence threshold filtering — all scan results shown regardless of confidence level
- Hardcoded color `"#9B59B6"` in ScanHub instead of using the app's theme system

---

### 4. Voice & Hands-Free Cooking — B+
**Status: Complete**

**Strengths:**
- Multi-platform: Web Speech API for web, expo-audio + server-side Whisper for native
- Comprehensive voice commands: next, back, repeat, go to step N, read recipe/ingredients, stop, pause, faster, slower, help
- TTS via expo-speech with queue management, pause/resume, rate control (0.5x–2.0x)
- Hands-free cooking mode auto-triggers voice listening after TTS completes each step
- Haptic feedback per command type
- Mounted ref pattern prevents state updates on unmounted components

**Weaknesses:**
- Web Speech API error handling only covers `"not-allowed"` and `"no-speech"` specifically; other errors get generic message
- Potential stale closure in `handleTranscript` — dependencies `[recipe, state.currentStep]` may not capture `executeCommand` correctly
- No timeout on voice listening (native) — user must manually stop if no speech detected
- Hardcoded 500ms delay before auto-listen in hands-free mode — not configurable

---

### 5. Meal Planning — B+
**Status: Complete**

**Strengths:**
- Drag-and-drop reordering via `react-native-draggable-flatlist` with `ScaleDecorator`
- Weekly navigation with `date-fns`
- Configurable meal slots via presets
- Action sheet for meal slot operations (add, remove, view recipe)
- Pull-to-refresh with sync integration
- Subscription gating: weekly navigation requires `canUseWeeklyMealPrepping`

**Weaknesses:**
- No drag between days — only reorder within a single day's slots
- No meal plan templates or auto-generation from inventory (missed AI opportunity)
- No direct "add all to shopping list" from a day's or week's meal plan
- All recipes loaded at once via `storage.getRecipes()` — expensive with large collections

---

### 6. Shopping List & Instacart — A-
**Status: Complete**

**Strengths:**
- Check/uncheck toggle, delete, and clear checked items
- Instacart integration: shopping link creation AND recipe link creation
- Server-side retry with exponential backoff (max 3 retries, respects `Retry-After` header)
- UPC handling: cleaning, deduplication, multi-UPC support
- Brand filters and health filters forwarded to Instacart API
- `parseInstacartError()` provides user-friendly error messages
- `validateProducts()` with index-specific error messages
- Separate base URLs for production vs dev Instacart environments
- Retailer search by postal code/country
- Client hook checks configuration status before attempting operations

**Weaknesses:**
- Shopping list stored as flat array — `handleToggleItem` does optimistic update but `storage.setShoppingList()` overwrites entire list (no partial update)
- `ITEM_HEIGHT = 80` hardcoded for `getItemLayout` optimization
- No duplicate detection when adding items to shopping list
- No sorting or grouping by category/aisle

---

### 7. Cookware & Cooking Terms — B
**Status: Complete**

**Strengths:**
- Cookware: Category-based browsing (Essential, Cooking, Bakeware, Small Appliances, Prep Tools, Specialty) with search
- Cooking Terms: Category filtering (Techniques, Cuts, Equipment, Temperature, Ingredients, Measurements), difficulty levels, modal detail view
- Related term navigation — tapping a related term opens its detail
- Difficulty color coding (beginner/intermediate/advanced)
- Video link support for cooking terms
- `getItemLayout` optimization for FlatList performance
- Subscription gating on cookware

**Weaknesses:**
- `ICON_MAP` uses many generic fallback icons (box, circle, square) — not descriptive
- No offline caching mechanism for cookware data
- Data quality depends entirely on API seed data — no user contribution or correction mechanism
- These features feel secondary — no deep integration with other features (e.g., no "you need this cookware for this recipe" prompts)

---

### 8. Nutrition Lookup & Shelf Life — B+
**Status: Complete**

**Strengths:**
- USDA FoodData Central API integration with two lookup paths (by name search, by FDC ID)
- Brand matching: when brand provided, prioritizes brand-matching results
- Comprehensive nutrient mapping (calories, protein, carbs, fat, fiber, sugar, sodium, vitamins D/calcium/iron/potassium)
- Shelf life: local data first with comprehensive category-keyword mapping, AI fallback
- AI shelf life responses bounded: `Math.max(1, Math.min(365, days))`
- 5-minute TTL cache for nutrition, 24-hour cache for shelf life

**Weaknesses:**
- **Both caches are in-memory (`Map`) — lost on every server restart** — this is a significant reliability issue for production
- No rate limiting on USDA API calls (relies on USDA's own limits)
- `lookupNutritionByFdcId` has no caching at all — repeated lookups for same FDC ID always hit the API
- Shelf life AI uses hardcoded `gpt-4o-mini` with no fallback; service throws if AI unavailable
- `max_completion_tokens: 256` for shelf life may truncate unusual food descriptions

---

### 9. Waste Reduction Analytics — C+
**Status: Partial**

**Strengths:**
- Analytics dashboard with time range filtering (week/month/all)
- Waste reduction score formula: `100 - (waste / (consumed + waste)) * 100`
- Inventory health breakdown: fresh/expiring/expired counts
- Waste categorization: expired, spoiled, not wanted, other
- Nutrition totals from consumed items with daily average calculation
- Score gauge with labeled thresholds (Excellent ≥80, Good ≥60, Fair ≥40, Needs Work <40)
- Category breakdown (top 5 categories by item count)
- Expiration timeline showing next 14 days

**Weaknesses:**
- **All analytics are client-side calculations from local storage — no server-side persistence or historical trends**
- If local storage is cleared, all waste/consumed history is permanently lost
- No actionable recommendations generated (e.g., "You waste the most dairy — try buying smaller quantities")
- `daysInRange` uses 365 for "all" regardless of actual data span
- No export or sharing of analytics data
- No gamification, streaks, or personal bests to drive engagement
- No weekly/monthly comparison trends

---

### 10. Sync Engine — A
**Status: Complete**

**Strengths:**
- Comprehensive offline-first architecture with AsyncStorage-persisted queue
- Queue coalescing: delete replaces any, update-after-create keeps create, newer replaces older
- Conflict resolution with user-facing "This Device" vs "Other Device" alert
- Exponential backoff: `Math.min(1000 * 2^retryCount, 60000)` with max 5 retries
- App state management: pause in background, resume on foreground
- Network detection heuristic (3+ consecutive failures = offline)
- Delta sync via `lastSyncedAt` parameter
- Extremely well-documented with comprehensive JSDoc
- Queue capacity management: 500 max, warning at 80%, oldest evicted when full
- Fatal item tracking: items with 5+ retries or 4xx errors marked fatal and surfaced to user
- Separate sync paths for preferences and user profile with debouncing
- Subscriber pattern for reactive UI updates

**Weaknesses:**
- `fullSync()` overwrites local storage wholesale — any local-only changes not queued are lost
- Network check interval (60s) could miss brief connectivity windows
- No field-level merge — conflict resolution is all-or-nothing per item
- `consecutiveItemFailures` Map grows indefinitely (no cleanup for resolved items)
- Queue eviction drops oldest update silently — user may not notice data loss
- Sequential queue processing (no batching) — slow for large queues

---

### 11. Subscription & Feature Gating — B-
**Status: Complete but Limited**

**Strengths:**
- Clean separation: `shared/subscription.ts` for config, `subscriptionService.ts` for logic
- Feature flags: `canCustomizeStorageAreas`, `canUseRecipeScanning`, `canUseBulkScanning`, `canUseAiKitchenAssistant`, `canUseWeeklyMealPrepping`
- AI recipe limit caching with 30-second TTL
- Monthly counter auto-reset via `resetMonthlyCountsIfNeeded`
- Bonus credits from referrals integrated into limit calculation
- Trial period support with `trialEndsAt` tracking
- `UserEntitlements` interface provides comprehensive user status

**Weaknesses:**
- **Only one tier (PRO) — no FREE tier defined in `TIER_CONFIG`** making the gating logic incomplete
- `getTierLimits()` has no fallback config for users without PRO, leading to potential errors
- All PRO limits set to -1 (unlimited) — no graduated access
- Pricing hardcoded: `MONTHLY_PRICE = 9.99`, `ANNUAL_PRICE = 99.90` — should be dynamic from Stripe
- No differentiated messaging about free vs paid features on the subscription screen

---

### 12. Onboarding & Referral — B+
**Status: Complete**

**Strengths:**
- Multi-step onboarding with 15 starter food items using real USDA FDC IDs and pre-populated nutrition
- Referral: 8-character codes excluding ambiguous characters (no O/0/1/I/L), collision retry (10 attempts)
- Self-referral prevention, duplicate prevention
- Transaction-based referral application (insert + update in transaction)
- Masked referrer name for privacy
- Dynamic share link generation based on environment
- Reward threshold: every 3 completed referrals triggers credit redemption

**Weaknesses:**
- Referral code collision detection relies on error message string matching (`includes("unique")`) — fragile across DB drivers
- No rate limiting on referral code validation endpoint (public, could be used for enumeration)
- Validation endpoint returns valid/invalid status + masked name — minor enumeration risk
- Starter food nutrition uses per-100g serving — may confuse users thinking of actual quantities
- No skip/back navigation visible in the onboarding flow

---

### 13. Notifications — D+
**Status: Partial — Critical Gaps**

**Strengths:**
- Server-side queue-and-read model: `queueNotification()`, `getUnreadNotifications()`, `markNotificationRead()`
- Payment notification scheduling is well-designed: immediate + 3-day reminder + 1-day final warning
- Grace period tracking (7 days) with proper date calculations
- Android channel configuration with HIGH importance
- Cancellation of existing notifications before rescheduling (prevents duplicates)
- Platform-aware: skips on web and Expo Go on Android

**Weaknesses:**
- **Server `notificationService.ts` only queues to database — no push notification delivery mechanism (no Expo Push Notification service, no FCM/APNs integration)**
- **`useExpirationNotifications` is effectively a stub — it initializes notification listeners but NEVER schedules any expiration alerts.** The entire expiration notification scheduling logic is missing.
- `getUnreadNotifications` orders by `createdAt` without DESC — returns oldest first
- No notification count badge management
- No notification preferences (mute, frequency, type filtering)
- No scheduled background check for expiring items

---

## Cross-Cutting Concerns

### Hardcoded Values (Risk: Configuration Drift)
| Value | Location | Risk |
|-------|----------|------|
| `gpt-4o-mini` | Recipe generation, shelf life, chat | Model changes require code deploy |
| `max_completion_tokens: 2048` | Recipe generation | Complex recipes silently truncated |
| `MAX_SYNC_QUEUE_SIZE = 500` | Sync manager | Power users may hit limits |
| `AI_LIMIT_CACHE_TTL_MS = 30000` | Subscription service | Not configurable |
| `NAME_CACHE_TTL = 300000` (5 min) | Nutrition service | In-memory, lost on restart |
| `SHELF_LIFE_CACHE_TTL = 86400000` (24h) | Shelf life service | In-memory, lost on restart |
| `GRACE_PERIOD_DAYS = 7` | Payment notifications | Not configurable |
| `MONTHLY_PRICE = 9.99` | Subscription config | Should come from Stripe |

### Architecture Strengths
1. Consistent error handling with `AppError` class hierarchy
2. Zod validation on all server endpoints
3. Comprehensive TypeScript typing throughout
4. Offline-first design is well-thought-out
5. Subscription enforcement on both client and server
6. Clean separation of concerns (services, routers, hooks)
7. Domain-driven design with entities, aggregates, and services

### Architecture Weaknesses
1. In-memory caches lost on server restart (nutrition, shelf life) — production reliability issue
2. Server notifications stored in DB but never delivered via push
3. Expiration notification scheduling is completely absent
4. Analytics data is client-only with no server persistence — data loss risk
5. No streaming for any AI responses (recipe, chat, shelf life)
6. Sequential sync queue processing — bottleneck for power users

---

## Remediation Steps (Priority Order)

**Step 1 — Implement expiration notification scheduling (Critical)**
```
In client/hooks/useExpirationNotifications.ts, add a useEffect that runs on app
foreground and daily via setInterval. Load inventory from storage, filter items
expiring within EXPIRING_THRESHOLD_DAYS (3), and schedule local notifications via
expo-notifications for each. Use Notifications.scheduleNotificationAsync with a
trigger date matching the expiration date minus the threshold. Cancel previously
scheduled expiration notifications before rescheduling to prevent duplicates.
Store scheduled notification IDs in AsyncStorage keyed by item ID.
```

**Step 2 — Add push notification delivery via Expo Push Notifications**
```
Install expo-notifications server SDK. In notificationService.ts, after inserting
to the notifications table, check if the user has a push token (add an
expoPushToken column to the users table). If token exists, call
Expo.sendPushNotificationsAsync with the token, title, body, and data payload.
On the client, register for push notifications during onboarding using
Notifications.getExpoPushTokenAsync() and POST the token to a new
/api/user/push-token endpoint. Handle token refresh on app startup.
```

**Step 3 — Add persistent caching for nutrition and shelf life**
```
Replace the in-memory Map caches in nutritionLookupService.ts and
shelf-life.router.ts with a new DB table: api_cache (key TEXT PRIMARY KEY,
value JSONB, expiresAt TIMESTAMP). Create a DatabaseCacheService that implements
the same get/set interface as CacheService but uses the DB table. Add a daily
cleanup job to delete expired cache rows. This survives server restarts and
scales across instances.
```

**Step 4 — Add a FREE tier to improve user acquisition**
```
In shared/subscription.ts, add a FREE tier to the SubscriptionTier enum and
TIER_CONFIG with limits: maxPantryItems: 25, maxAiRecipesPerMonth: 3,
maxCookwareItems: 10. Set feature booleans: canUseRecipeScanning: false,
canUseBulkScanning: false, canUseAiKitchenAssistant: false,
canUseWeeklyMealPrepping: false. Add a DEFAULT_TIER_LIMITS constant for
fallback when getTierLimits() receives an unknown tier. Update
SubscriptionScreen to show a feature comparison table.
```

**Step 5 — Persist waste/consumption analytics on the server**
```
Waste and consumed logs already sync to normalized tables (userWasteLogs,
userConsumedLogs), but analytics calculations are client-only. Add a
GET /api/analytics/waste-summary endpoint that queries userWasteLogs and
userConsumedLogs grouped by week/month, calculates server-side waste reduction
scores, and returns trend data. Add streak tracking: consecutive weeks with
waste score >= 80. Store streak count in userSyncKV (section: analytics).
Display trends and streaks in AnalyticsScreen.
```

**Step 6 — Add streaming for AI recipe generation**
```
In recipeGenerationService.ts, use openai.chat.completions.create with
stream: true. In the generate-recipe route, set response headers for
text/event-stream and pipe chunks. On the client in GenerateRecipeScreen,
use EventSource or fetch with ReadableStream to display recipe as it
generates. Parse the accumulated JSON when the stream completes. This
eliminates the 5-15 second blank wait during generation.
```
