# ChefSpAIce

## Overview
ChefSpAIce is a kitchen inventory management application designed to streamline meal preparation and grocery shopping. It offers AI-powered recipe generation, comprehensive meal planning, and automated shopping list creation. The project aims to provide a seamless user experience with a single subscription model, targeting market potential through its innovative AI features and intuitive design.

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
- **Sentry (`@sentry/react-native`)**: Crash reporting and event tracking. Configured via `EXPO_PUBLIC_SENTRY_DSN` env var. Tracks screen views, recipe generation, inventory actions, subscription changes, and errors. Initialization in `client/lib/crash-reporter.ts`, integrated into App.tsx with `Sentry.wrap()` and `Sentry.ErrorBoundary`.

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
- **POST /api/auth/migrate-guest-data**: Uses upsert (ON CONFLICT DO UPDATE) for each normalized section.
- **chat-actions.ts**: `executeWasteItem`/`executeConsumeItem` INSERT directly into normalized tables; `getUserSyncData()` reads preferences from `userSyncKV` and logs from normalized tables.
- **Entry IDs**: Client-provided IDs are preserved (`entry.id` → `entryId`/`locationId`); fallback to server-generated `randomBytes(12)`.
- **Data export**: Reads all sections from normalized tables; `userSyncData` only provides metadata.
- **Account deletion**: Deletes from all normalized tables in transaction.
- **Demo seed**: Seeds normalized tables directly.

## Token Encryption
- OAuth tokens (accessToken, refreshToken) in the `auth_providers` table are encrypted at rest using AES-256-GCM via `server/lib/token-encryption.ts`.
- Requires `TOKEN_ENCRYPTION_KEY` secret: exactly 64 hex characters (32 bytes). Generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
- `encryptToken` / `decryptToken` handle individual values; `encryptTokenOrNull` / `decryptTokenOrNull` are null-safe wrappers.
- `decryptTokenOrNull` gracefully handles legacy unencrypted tokens by returning the raw value on decryption failure.
- Encrypted format: `base64(iv):base64(ciphertext):base64(authTag)` with 12-byte IV and 16-byte auth tag.

## Database Migrations
- Uses `drizzle-kit generate` + `drizzle-kit migrate` instead of `drizzle-kit push` for safe, versioned schema changes.
- Migration files live in `./migrations/` with metadata in `./migrations/meta/`.
- **Workflow**: Edit `shared/schema.ts` → run `npm run db:generate` to create a new SQL migration file → migrations auto-apply on server startup via `server/migrate.ts`.
- `server/migrate.ts` runs programmatic migrations using `drizzle-orm/node-postgres/migrator` before routes are registered.
- The `drizzle.__drizzle_migrations` table tracks which migrations have been applied.
- `npm run db:push` is still available as a convenience for development but should not be used in production.

## Font Scaling & Accessibility
- `ThemedText` (the primary text component) defaults to `allowFontScaling={true}` and `maxFontSizeMultiplier={1.5}` to respect system font size while preventing extreme scaling from breaking layouts. Both can be overridden via props.
- All text-containing containers across the app use `minHeight` instead of fixed `height` so they expand gracefully when text scales up. This applies to buttons, badges, headers, tab bars, settings rows, auth screen elements, etc.
- The tab bar recipe count badge uses `allowFontScaling={false}` (justified: tiny counter in constrained space). Tab labels use `maxFontSizeMultiplier={1.2}`.
- Icon-only containers, decorative elements (progress bars, dividers), and image containers retain fixed dimensions since they contain no text.

## Sync Data Validation
- Shared Zod schemas for all sync JSONB data shapes are defined in `shared/schema.ts` (prefixed with `sync*`): `syncNutritionSchema`, `syncIngredientSchema`, `syncMealSchema`, `syncInventoryItemSchema`, `syncRecipeSchema`, `syncMealPlanSchema`, `syncShoppingItemSchema`, `syncCookwareItemSchema`, `syncWasteLogEntrySchema`, `syncConsumedLogEntrySchema`, plus record schemas for preferences/analytics/onboarding/customLocations/userProfile.
- `server/routers/sync/sync-helpers.ts` composes its item-level schemas from these shared sub-schemas for consistency between client and server.
- The `/api/sync/import` endpoint validates all item arrays AND all JSONB sections (wasteLog, consumedLog, preferences, analytics, onboarding, customLocations, userProfile) against the shared schemas before any DB writes. Invalid data is rejected with `IMPORT_VALIDATION_FAILED` error code and up to 20 detailed validation errors.