# ChefSpAIce

## Overview
ChefSpAIce is a mobile application designed to manage kitchen inventory, reduce food waste, and promote sustainable eating habits. It offers AI-powered recipe generation, meal planning, and shopping list management. The project aims to provide a comprehensive solution for efficient food management through intelligent features and a focus on sustainability.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
The application is built with React Native and Expo, utilizing React Navigation, React Native Reanimated, and TanStack React Query for the frontend. It features an iOS 26 Liquid Glass Design aesthetic with light/dark mode and a centralized design system, employing a local-first data approach with AsyncStorage for offline persistence.

The backend is powered by Express.js and Node.js, using Drizzle ORM with PostgreSQL. It includes a custom authentication system, a Real-Time Sync Manager with optimistic updates, and AI integration via OpenAI API for equipment-aware and inventory-specific recipe generation, fuzzy matching, and shelf-life suggestions.

Key features include a root stack navigator with five-tab bottom navigation, custom authentication with social login and session tokens, and a trial and subscription system with guest account functionality and data migration. An onboarding flow guides new users, and all authenticated user data syncs to PostgreSQL with retry logic and conflict resolution. AI integration extends to kitchen assistant chat, smart shelf-life suggestions, and push notifications for expiring items. The Scan Hub supports barcode, nutrition label, recipe, and grocery receipt scanning (using OpenAI Vision) with AI food identification. Other features include Instacart integration, Siri Shortcuts, biometric authentication, deep linking, and comprehensive accessibility. The system also implements structured logging, response compression, and a delta sync mechanism to optimize performance and reduce API payload sizes. All API responses follow a consistent envelope for better error handling and data consumption.

## External Dependencies
- **OpenAI API**: AI-powered recipe generation and conversational assistance.
- **USDA FoodData Central API**: Comprehensive nutrition data lookup.
- **OpenFoodFacts API**: Open-source product information.
- **PostgreSQL**: Primary relational database.
- **Replit Object Storage**: Cloud file storage.
- **Instacart Connect API**: Grocery shopping integration.
- **expo-camera**: Barcode scanning.
- **@react-native-async-storage/async-storage**: Persistent local storage.

## Data Sync Architecture
- **Strategy**: Local-first with cloud backup. Data is written to AsyncStorage immediately for instant UI response, then synced to PostgreSQL asynchronously.
- **Sync triggers**: (1) On app foreground — `resumeSync()` drains the queue and flushes pending preferences/profile. (2) After local mutations — `queueChange()` debounces for 2 seconds, then calls `processSyncQueue()`. (3) Periodic — a 60-second network health check detects connectivity restoration and auto-drains the queue. (4) Manual — `fullSync()` can be called explicitly (pull-to-refresh, after chat actions).
- **Conflict resolution**: Last-write-wins based on `updatedAt` timestamps. On PUT, the server compares the client's `updatedAt` against the existing row. If the client timestamp is older or equal, the server responds `{ operation: "skipped", reason: "stale_update" }`. The client treats this as a 409 conflict and marks the queue item as fatal. On POST (create), the server upserts without timestamp comparison — client data always wins for new items.
- **Offline behavior**: Changes are persisted in the sync queue (AsyncStorage) and survive app restarts. Network status is inferred heuristically (3+ consecutive fetch failures = offline; one success = online). While offline, `processSyncQueue()` is a no-op. Failed items retry with exponential back-off (2^n seconds, max 30 s). After 5 retries or a 4xx status, items are marked fatal and the user is alerted.
- **Queue coalescing**: When a new change targets an item already in the queue (matched by `dataType` + `data.id`): delete always replaces; update-after-create keeps "create" with latest data; otherwise the newer entry replaces the older.
- **Full sync flow**: Push-then-pull. (1) Drain outbound queue (local→server). (2) GET /api/auth/sync with `lastSyncedAt` for delta sync. Server returns only sections updated since that timestamp. Each returned section overwrites local storage entirely — server is source of truth after pull.
- **Data sections**: inventory, recipes, mealPlans, shoppingList (per-item sync via individual POST/PUT/DELETE endpoints), plus preferences and userProfile (batch sync via POST /api/auth/sync).
- **Deletion handling**: Inventory uses soft delete (sets `deletedAt`, syncs as "update"); after 30 days, a permanent purge sends "delete". All other data types use immediate hard delete.
- **Known edge case**: If a user edits the same item on two devices while both are offline, the device that syncs last wins. The earlier device's changes are silently overwritten. The losing device sees a conflict alert but the server version is not rolled back.

## Recent Changes
- **Soft Delete for Inventory (2026-02-07)**: Inventory items now use soft delete instead of permanent deletion. When a user deletes an item, `deletedAt` is set to the current timestamp. Items remain recoverable for 30 days via the "Recently Deleted" section in Settings. The `getInventory()` method filters out soft-deleted items automatically. A cleanup function runs on app startup to permanently purge items older than 30 days. Soft deletes sync to the server as "update" operations (setting `deleted_at` column on `user_inventory_items` table). The server GET sync endpoint filters out soft-deleted items with `isNull(deletedAt)`.
- **Database Normalization (2026-02-07)**: Migrated inventory, recipes, meal plans, shopping lists, and cookware from JSONB blobs in `user_sync_data` to separate relational tables (`user_inventory_items`, `user_saved_recipes`, `user_meal_plans`, `user_shopping_items`, `user_cookware_items`) with proper foreign keys and indexes. Timestamp-based conflict resolution on all sync operations.
- **GDPR Data Export (2026-02-07)**: Added `GET /api/user/export-data` endpoint and "Download My Data" button in Settings for GDPR-compliant personal data export.