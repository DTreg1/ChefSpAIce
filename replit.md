# ChefSpAIce

## Overview
ChefSpAIce is an AI-powered kitchen inventory management application designed to simplify meal preparation and grocery shopping. It offers intelligent recipe generation, comprehensive meal planning, and automated shopping list creation. The project aims to deliver a seamless user experience with a single subscription model, leveraging its innovative AI features and intuitive design to capture market potential.

## Bundle Analysis
See `docs/bundle-analysis.md` for full report. Key findings:
- **Total minified JS:** 2.12 MB across 8 code-split chunks
- **Largest dependency:** Sentry SDK at ~2,439 KB source (~67% of main bundle)
- **Server leak check:** CLEAN — no server-only code/packages in client bundles
- **Top optimization:** Disable Sentry session replay to save ~400 KB source

## Recent Changes
- **2026-02-14**: Created `client/lib/api-client.ts` — a typed API client wrapper replacing 69 raw `fetch()` calls across 38 files. Provides `apiClient.get/post/put/patch/delete<T>()`, `postFormData<T>()`, and `raw()` methods with automatic auth headers, base URL resolution, `{success, data, error}` envelope unwrapping, `ApiClientError` typed errors, 401 auto-logout, `skipAuth`/`signal`/`timeout` options. Also migrated remaining `apiRequestJson` consumers. Only `query-client.ts` base implementation and local blob `fetch(imageUri)` calls remain as raw fetch.
- **2026-02-14**: Split 4 large files for maintainability (target: no non-data file >800 lines). OnboardingScreen.tsx (3,157→505 lines) split into 8 files in `client/components/onboarding/`. ChatModal.tsx (1,426→547 lines) split into 5 files in `client/components/chat/` + `client/hooks/useChatMessages.ts`. AuthContext.tsx (972→538 lines) with `client/lib/auth-api.ts` and `client/lib/auth-storage.ts` extracted. sync-manager.ts (1,073→786 lines) with `client/lib/sync-types.ts` and `client/lib/sync-conflicts.ts` extracted.
- **2026-02-13**: WCAG AA contrast ratio audit and remediation. Darkened AppColors (primary, secondary, accent, warning, success, error, confidence*, offline) for 4.5:1 contrast with white button text. Added brighter Colors.dark overrides for text on dark backgrounds. Switched light glass text to dark (#1a3a1a). Removed alpha transparency from GlassButton/VoiceQuickAction backgrounds. Added theme-level confidence/offline colors and migrated 7 consumer files from static AppColors to theme-based colors.
- **2026-02-13**: Added object storage recovery procedure documentation at `docs/object-storage-recovery.md`. Covers storage layout, three recovery options (AI re-generation, manifest export, secondary backup), and recommendation.
- **2026-02-13**: Added weekly `soft-delete-cleanup` background job that permanently deletes inventory items where `deletedAt` is older than 30 days. Aligns with UI's "recently deleted" feature and prevents soft-deleted rows from accumulating. Job file: `server/jobs/softDeleteCleanupJob.ts`.
- **2026-02-13**: Added retention offer duplicate prevention in `/apply-retention-offer` endpoint. Before creating a Stripe coupon, checks Stripe subscription discounts for active "Retention Offer" coupons and queries new `retention_offers` DB table for any offer applied in the last 6 months. Rejects with `RETENTION_OFFER_ALREADY_APPLIED` (409). New `retentionOffers` table tracks all retention offers for analytics.
- **2026-02-13**: Added server-side waste analytics endpoint (`GET /api/analytics/waste-summary`) that aggregates `userWasteLogs` and `userConsumedLogs` by week/month, calculates waste reduction scores, and tracks streaks (consecutive weeks with score >= 80). AnalyticsScreen fetches server data and displays weekly trend bar charts and streak badges with client-side fallback.
- **2026-02-13**: Replaced in-memory Map caches with database-backed `api_cache` table (key TEXT PK, value JSONB, expiresAt TIMESTAMP). New `DatabaseCacheStore` in `server/lib/cache.ts` implements `CacheStore` interface using DB upserts. `nutritionLookupService.ts` migrated from raw Map to `CacheService`. Daily `cache-cleanup` cron job deletes expired rows. Cache now survives server restarts.
- **2026-02-13**: Added Expo push notifications. Server uses `expo-server-sdk` to send push notifications after inserting into the notifications table. New `/api/user/push-token` endpoint for clients to register tokens. Token refresh runs automatically on app startup.
- **2026-02-13**: Consolidated all subscription tiers into a single STANDARD tier.

## User Preferences
- Communication: Simple, everyday language

## System Architecture
The application features a modern UI/UX with an iOS Liquid Glass Design aesthetic, built using React Native and Expo for mobile, and React for web-based landing and administration pages. Key functionalities include an inventory system with swipeable cards and nutrition summaries, detailed recipe views, and a flexible meal planner. The backend is powered by Express.js, utilizing Drizzle ORM and a PostgreSQL database. AI capabilities for recipe generation, chat, and vision scanning are integrated via the OpenAI API. User authentication uses custom session tokens, supporting social logins (Google/Apple) and biometrics. Shopping list integration is handled by Instacart Connect, with nutritional data sourced from USDA FoodData Central. The architecture follows a Domain-Driven Design (DDD) approach, organizing business logic into domain types, entities, aggregates, and services for clear separation of concerns. Screens are lazy-loaded for optimized performance.

## External Dependencies
- **OpenAI API**: For AI-powered recipe generation, chat, and vision-based analysis.
- **Stripe**: Manages all subscription payments.
- **RevenueCat**: Handles StoreKit/Apple In-App Purchases.
- **PostgreSQL (via Neon)**: The primary database.
- **Instacart Connect**: Integrates shopping list functionality and product matching.
- **USDA FoodData Central**: Provides on-demand nutritional data.
- **Replit Object Storage (`@replit/object-storage`)**: Stores application assets.
- **Sentry (`@sentry/react-native` + `@sentry/node`)**: For crash reporting and event tracking.