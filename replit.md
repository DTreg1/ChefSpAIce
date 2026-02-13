# ChefSpAIce

## Overview
ChefSpAIce is a kitchen inventory management application designed to streamline meal preparation and grocery shopping. It offers AI-powered recipe generation, comprehensive meal planning, and automated shopping list creation. The project aims to provide a seamless user experience with a single subscription model, targeting market potential through its innovative AI features and intuitive design.

## Recent Changes
- **2026-02-13**: Consolidated all subscription tiers into a single STANDARD tier. Removed PRO naming, trial logic (trialing status, trialEndsAt, isTrialActive), and free-tier gating. Trial-related UI components (TrialEndedModal, UpgradePrompt, PaymentFailedBanner, etc.) converted to no-ops. Database migrated: all users updated from PRO→STANDARD tier and trialing→active status. The only subscription tier is now STANDARD with status values: active, canceled, expired.

## User Preferences
- Communication: Simple, everyday language

## System Architecture
The application features a modern UI/UX with an iOS Liquid Glass Design aesthetic. The mobile application is built using React Native and Expo, while the landing and administration pages are developed with React web. Core features include an inventory system with swipeable cards and nutrition summaries, detailed recipe views, and a flexible meal planner. The backend is powered by Express.js, utilizing Drizzle ORM and a PostgreSQL database hosted on Neon. AI functionalities, such as recipe generation, chat, and vision scanning, are integrated via the OpenAI API. User authentication is handled through custom session tokens, supporting social logins (Google/Apple) and biometric options. Shopping list integration is provided by Instacart Connect, allowing for precise product matching using UPCs and brand filters. Nutritional information is sourced on-demand from USDA FoodData Central for display purposes. The project adheres to a Domain-Driven Design (DDD) approach, organizing business logic into domain types, entities, aggregates, and services, ensuring a clean separation of concerns. Screens are lazy-loaded to optimize initial bundle size and startup time.

## External Dependencies
- **OpenAI API**: For AI-powered recipe generation, chat interactions, and vision-based scanning (e.g., receipt and food image analysis).
- **Stripe**: Handles all subscription payments, including checkout, upgrades, cancellations, and proration.
- **RevenueCat**: Manages StoreKit/Apple In-App Purchases and related webhooks.
- **PostgreSQL (via Neon)**: The primary database for storing all application data.
- **Instacart Connect**: Integrates shopping list functionality, product matching, and delivery services.
- **USDA FoodData Central**: Provides on-demand nutritional data for food items.
- **Replit Object Storage (`@replit/object-storage`)**: Used for storing various application assets.
- **Sentry (`@sentry/react-native` + `@sentry/node`)**: Crash reporting and event tracking. Configured via `EXPO_PUBLIC_SENTRY_DSN` env var (used by both client and server SDKs; server also checks `SENTRY_DSN`). Client: Tracks screen views, recipe generation, inventory actions, subscription changes, and errors. Initialization in `client/lib/crash-reporter.ts`, integrated into App.tsx with `Sentry.wrap()` and `Sentry.ErrorBoundary`. Server: Captures `unhandledRejection`, `uncaughtException`, and Express 500 errors via `server/lib/sentry.ts`. The `uncaughtException` handler flushes Sentry before exiting. Sensitive headers (Authorization, Cookie) are stripped from events before sending.

## Sync Architecture
- Sync endpoints at `/api/sync/{inventory,recipes,shoppingList,mealPlans,cookware}` handle POST/PUT/DELETE for mutations and GET for paginated reads.
- GET endpoints support cursor-based pagination using `?limit=50&cursor=...` query parameters. Cursor encodes `(updatedAt, id)` as base64url JSON.
- Client hooks in `client/hooks/usePaginatedSync.ts` provide `useInventorySync`, `useRecipesSync`, `useShoppingSync` using TanStack Query's `useInfiniteQuery`.
- Composite DB indexes on `(userId, updatedAt, id)` optimize cursor pagination queries.
- The sync-manager (`client/lib/sync-manager.ts`) handles local-first sync with conflict resolution, queue coalescing, and offline support.

## Data Storage Migration (Complete — Phase 3 Done)
All 12 JSONB columns have been dropped from `userSyncData`. The table now only holds sync metadata (`sectionUpdatedAt`, `lastSyncedAt`, `updatedAt`). All data lives in normalized relational tables.

### Normalized Tables
- **Phase 1** (5 sections): `userInventoryItems`, `userSavedRecipes`, `userMealPlans`, `userShoppingItems`, `userCookwareItems`
- **Phase 2** (7 sections):
  - `userWasteLogs`: waste log entries with `entryId`, `itemName`, `quantity`, `unit`, `reason`, `date`, `extraData`
  - `userConsumedLogs`: consumed food log entries with `entryId`, `itemName`, `quantity`, `unit`, `date`, `extraData`
  - `userCustomLocations`: user-defined storage locations with `locationId`, `name`, `type`, `extraData`
  - `userSyncKV`: key-value store for free-form data (section column: `preferences`, `analytics`, `onboarding`, `userProfile`), stores data as JSONB in `data` column

### Sync Patterns
- **POST /api/auth/sync**: Uses transactional delete-then-insert for each normalized section to ensure atomicity.
- **chat-actions.ts**: `executeWasteItem`/`executeConsumeItem` INSERT directly into normalized tables; `getUserSyncData()` reads preferences from `userSyncKV` and logs from normalized tables.
- **Entry IDs**: Client-provided IDs are preserved (`entry.id` → `entryId`/`locationId`); fallback to server-generated `randomBytes(12)`.
- **Data export**: Reads all sections from normalized tables; `userSyncData` only provides metadata.
- **Account deletion**: Deletes from all normalized tables in transaction.
- **Demo seed**: Seeds normalized tables directly.

## IP Address Anonymization (GDPR)
- All session creation paths anonymize IP addresses before storing them in the `userSessions` table via `anonymizeIpAddress()` in `server/lib/auth-utils.ts`.
- Controlled by the `IP_ANONYMIZATION_MODE` environment variable (default: `truncate`):
  - `truncate`: Stores only the /24 subnet (e.g., `192.168.1.0` for IPv4, first 4 groups for IPv6). Best for GDPR compliance while retaining subnet-level security monitoring.
  - `hash`: One-way SHA-256 hash (first 16 hex chars) using `IP_HASH_SALT` secret as salt. Falls back to truncation if no salt is configured.
  - `none`: Stores the full IP address (not recommended for EU users).
- The `sessionCleanupJob` additionally nullifies IP addresses on sessions older than 30 days.
- Log output in `auth.ts` middleware also uses `anonymizeIpAddress` for consistency.

## Token Encryption
- OAuth tokens (accessToken, refreshToken) in the `auth_providers` table are encrypted at rest using AES-256-GCM via `server/lib/token-encryption.ts`.
- Requires `TOKEN_ENCRYPTION_KEY` secret: exactly 64 hex characters (32 bytes). Generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
- `encryptToken` / `decryptToken` handle individual values; `encryptTokenOrNull` / `decryptTokenOrNull` are null-safe wrappers.
- `decryptTokenOrNull` gracefully handles legacy unencrypted tokens by returning the raw value on decryption failure.
- Encrypted format: `base64(iv):base64(ciphertext):base64(authTag)` with 12-byte IV and 16-byte auth tag.

## Disaster Recovery
- Full backup and restore procedures documented in `DISASTER_RECOVERY.md`.
- Neon handles automated backups natively via WAL-based continuous history (no cron jobs needed).
- Development DB: Restore via Replit checkpoint rollback.
- Production DB: Restore via Replit's point-in-time restore feature or Neon Console.
- For retention beyond the Neon plan window, use `pg_dump` to create manual backups.
- Test recovery quarterly using Neon's instant branching (zero-copy clone, restore on the clone, validate, delete).

## Database Migrations
- Uses `drizzle-kit generate` + `drizzle-kit migrate` instead of `drizzle-kit push` for safe, versioned schema changes.
- Migration files live in `./migrations/` with metadata in `./migrations/meta/`.
- **Workflow**: Edit `shared/schema.ts` → run `npm run db:generate` to create a new SQL migration file → migrations auto-apply on server startup via `server/migrate.ts`.
- `server/migrate.ts` runs programmatic migrations using `drizzle-orm/node-postgres/migrator` before routes are registered.
- The `drizzle.__drizzle_migrations` table tracks which migrations have been applied.
- `npm run db:push` is still available as a convenience for development but should not be used in production.

## Grocery Search Screen
- `client/screens/GrocerySearchScreen.tsx`: Native grocery search interface inspired by Instacart, accessible as a full-screen modal from ShoppingListScreen via the search icon in the header.
- Features: search bar, "Top Searches" 4-column grid (8 products), "Trending" horizontal scroll (6 products), search results with add-to-list functionality.
- Product images stored in `client/assets/food-images/`. Adding a product creates a ShoppingListItem via `storage.addShoppingListItem()`.
- Registered in RootStackNavigator as `GrocerySearch` route.

## Font Scaling & Accessibility
- `ThemedText` (the primary text component) defaults to `allowFontScaling={true}` and `maxFontSizeMultiplier={1.5}` to respect system font size while preventing extreme scaling from breaking layouts. Both can be overridden via props.
- All text-containing containers across the app use `minHeight` instead of fixed `height` so they expand gracefully when text scales up. This applies to buttons, badges, headers, tab bars, settings rows, auth screen elements, etc.
- The tab bar recipe count badge uses `allowFontScaling={false}` (justified: tiny counter in constrained space). Tab labels use `maxFontSizeMultiplier={1.2}`.
- Icon-only containers, decorative elements (progress bars, dividers), and image containers retain fixed dimensions since they contain no text.

## Background Jobs
- Background jobs use a PostgreSQL-backed scheduler (`server/jobs/jobScheduler.ts`) with advisory locks for exactly-once execution across multiple instances.
- The `cron_jobs` table tracks each job's schedule, last run time, duration, and errors. Jobs are registered at startup via `registerJob()` and the scheduler polls every 30 seconds, acquiring a `pg_try_advisory_lock` before checking if a job is due.
- Each job file exports a `register*Job()` function (instead of the old `start*Job()` pattern) which registers the job handler with the central scheduler.
- **sessionCleanupJob** (`server/jobs/sessionCleanupJob.ts`): Runs daily, cleans up expired user sessions.
- **winbackJob** (`server/jobs/winbackJob.ts`): Runs weekly, finds canceled subscriptions 30+ days old, sends one-time winback notification offering $4.99 first month. Deduplicates by checking for any existing campaign per user (regardless of status). Acceptance tracked in `webhookHandlers.ts` when canceled users reactivate.

## Winback Campaign System
- Table: `winback_campaigns` tracks campaigns with status (sent/accepted/expired), offerAmount (499 = $4.99), offerType, and Stripe coupon references.
- Job queries `subscriptions` where `status='canceled'` AND `canceledAt` <= 30 days ago.
- Each user gets at most one winback campaign ever (dedupe checks any existing campaign row).
- Webhook handler marks the most recent "sent" campaign as "accepted" (with `acceptedAt` timestamp) when a canceled/past_due subscription transitions to active.
- Notification sent via `queueNotification()` with deepLink `chefspaice://subscription?offer=winback`.

## Image Processing Pipeline
- Server-side image processing via `sharp` in `server/services/imageProcessingService.ts`.
- All recipe images are resized and converted to WebP before storage:
  - **Display**: Max 800px width, WebP quality 80
  - **Thumbnail**: Max 200px width, WebP quality 70
- Storage paths: `recipe-images/{recipeId}.webp` (display) and `recipe-images/{recipeId}-thumb.webp` (thumbnail).
- `objectStorageService.ts` returns `{ displayUrl, thumbnailUrl }` from upload functions.
- `recipeImages.router.ts` POST `/upload` returns `cloudImageUri` (display) and `thumbnailUri` (thumbnail).
- AI-generated images (`/api/recipes/generate-image`) are processed server-side before being sent to clients, returning `imageBase64` (display), `thumbnailBase64`, and `format: "webp"`.
- Backward compatible: `deleteRecipeImage` cleans up both `.webp` and legacy `.jpg` files; `getRecipeImageUrl` checks WebP first, falls back to JPG.

## Sync Data Validation
- Shared Zod schemas for all sync JSONB data shapes are defined in `shared/schema.ts` (prefixed with `sync*`): `syncNutritionSchema`, `syncIngredientSchema`, `syncMealSchema`, `syncInventoryItemSchema`, `syncRecipeSchema`, `syncMealPlanSchema`, `syncShoppingItemSchema`, `syncCookwareItemSchema`, `syncWasteLogEntrySchema`, `syncConsumedLogEntrySchema`, plus record schemas for preferences/analytics/onboarding/customLocations/userProfile.
- `server/routers/sync/sync-helpers.ts` composes its item-level schemas from these shared sub-schemas for consistency between client and server.
- The `/api/sync/import` endpoint validates all item arrays AND all JSONB sections (wasteLog, consumedLog, preferences, analytics, onboarding, customLocations, userProfile) against the shared schemas before any DB writes. Invalid data is rejected with `IMPORT_VALIDATION_FAILED` error code and up to 20 detailed validation errors.