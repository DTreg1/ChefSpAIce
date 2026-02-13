# ChefSpAIce

## Overview
ChefSpAIce is an AI-powered kitchen inventory management application designed to simplify meal preparation and grocery shopping. It offers intelligent recipe generation, comprehensive meal planning, and automated shopping list creation. The project aims to deliver a seamless user experience with a single subscription model, leveraging its innovative AI features and intuitive design to capture market potential.

## Recent Changes
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