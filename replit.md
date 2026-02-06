# ChefSpAIce

## Overview
ChefSpAIce is a mobile application designed to manage kitchen inventory, reduce food waste, and promote sustainable eating habits. It offers AI-powered recipe generation, meal planning, and shopping list management. The project aims to provide a comprehensive solution for efficient food management through intelligent features and a focus on sustainability.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
The application is built with React Native and Expo, utilizing React Navigation, React Native Reanimated, and TanStack React Query for the frontend. It features an iOS 26 Liquid Glass Design aesthetic with light/dark mode and a centralized design system, employing a local-first data approach with AsyncStorage for offline persistence.

The backend is powered by Express.js and Node.js, using Drizzle ORM with PostgreSQL. It includes a custom authentication system, a Real-Time Sync Manager with optimistic updates, and AI integration via OpenAI API for equipment-aware and inventory-specific recipe generation, fuzzy matching, and shelf-life suggestions.

Key features include a root stack navigator with five-tab bottom navigation, custom authentication with social login and session tokens, and a trial and subscription system with guest account functionality and data migration. An onboarding flow guides new users, and all authenticated user data syncs to PostgreSQL with retry logic and conflict resolution. AI integration extends to kitchen assistant chat, smart shelf-life suggestions, and push notifications for expiring items. The Scan Hub supports barcode, nutrition label, recipe, and grocery receipt scanning (using OpenAI Vision) with AI food identification. Other features include Instacart integration, Siri Shortcuts, biometric authentication, deep linking, and comprehensive accessibility.

## External Dependencies
- **OpenAI API**: AI-powered recipe generation and conversational assistance.
- **USDA FoodData Central API**: Comprehensive nutrition data lookup.
- **OpenFoodFacts API**: Open-source product information.
- **PostgreSQL**: Primary relational database.
- **Replit Object Storage**: Cloud file storage.
- **Instacart Connect API**: Grocery shopping integration.
- **expo-camera**: Barcode scanning.
- **@react-native-async-storage/async-storage**: Persistent local storage.

## Recent Changes

### Admin Analytics Dashboard (Feb 2026)
- Created `GET /api/admin/analytics` endpoint behind `requireAdmin` middleware
  - Returns: userMetrics (total, 7d/30d new, 7d active), subscriptionBreakdown (basic/pro/trialing/active/canceled/expired), revenueMetrics (MRR, ARR, subscriber counts), aiUsage (recipes this month), topFoodItems, userGrowth (12-month history)
- Created admin dashboard HTML page at `/admin` with login form, metrics cards, Chart.js bar/doughnut charts, and top food items list
- Router: `server/routers/admin/analytics.router.ts`
- Template: `server/templates/admin-dashboard.html`
- Admin page served from `server/index.ts`, analytics API registered in `server/routes.ts`

### Referral System (Feb 2026)
- Added `referral_code` (unique 8-char alphanumeric) and `referred_by` fields to users table
- Added `ai_recipe_bonus_credits` field to users table for referral rewards
- Created `referrals` tracking table with referrer/referred user linkage and stats
- New endpoints: `GET /api/referral/code` (auth required) and `POST /api/referral/apply` (auth required)
- Registration (`POST /api/auth/register`) accepts optional `referralCode` parameter
- Referral benefits: referrer gets +3 AI recipe bonus credits, referred user gets 14-day trial (vs 7-day default)
- AI recipe limit checking in `subscriptionService.ts` accounts for bonus credits
- "Refer a Friend" section added to SettingsScreen with code display, copy/share buttons, and referral stats
- Router: `server/routers/referral.router.ts`, registered in `server/routes.ts`

### Performance Optimization (Feb 2026)
- **Structured Logging**: Migrated 270+ console.log/error/warn calls to structured `logger` (server/lib/logger.ts) across ~40 server files. Uses JSON output in production with context objects.
- **Response Compression**: Added gzip/brotli compression middleware (compression package) in server/index.ts after CORS. Level 6, 1KB threshold, skippable via `x-no-compression` header.
- **Database Pool**: Increased PostgreSQL connection pool from 10 to 20 max connections in server/db.ts for better concurrency.
- **Delta Sync**: Added section-level delta sync to reduce API payload sizes:
  - Schema: Added `sectionUpdatedAt` jsonb column to `user_sync_data` table tracking per-section timestamps
  - Migration: `migrations/0002_delta_sync.sql`
  - Server (GET /api/auth/sync): Accepts optional `?lastSyncedAt=ISO` query param. Returns `unchanged: true` if nothing changed, or only changed sections with `delta: true`. Always includes `serverTimestamp`.
  - Server (sync write operations): All POST/PUT/DELETE handlers in sync.router.ts and auth.router.ts update `sectionUpdatedAt` for their respective sections.
  - Client (client/lib/sync-manager.ts): Stores `serverTimestamp` in AsyncStorage, sends it as `lastSyncedAt` on next fullSync(). Handles `unchanged` responses by skipping data writes.