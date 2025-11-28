# ChefSpAIce - Smart Kitchen Assistant

## Overview
ChefSpAIce is an AI-powered kitchen management application that helps users manage food inventory, reduce waste, and discover personalized recipes. It integrates real-time inventory tracking with AI-driven recipe generation, nutrition analysis, and meal planning. The project aims to provide a comprehensive solution for modern kitchen management, offering a seamless experience across web and mobile platforms.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The frontend is built with React 18, TypeScript, Vite, and TailwindCSS with shadcn/ui components. It uses TanStack Query for server state and React Context API for global UI state. The application employs a component-based architecture, custom hooks, progressive disclosure, and lazy loading. Capacitor is used for cross-platform mobile deployment, supporting native camera, push notifications, and sharing, with PWA capabilities for offline support.

### Backend Architecture
The backend is an Express.js RESTful API, organized into domain-specific routers with middleware for authentication, rate limiting, and error handling. Server-Sent Events (SSE) are used for streaming AI responses. Authentication supports Replit Auth (development), OAuth (Google, GitHub, Twitter/X, Apple), and email/password, with session-based management and user-scoped data isolation.

#### Router Organization (November 2024)
The router architecture has been refactored into a hierarchical structure:
- **user/** - User-facing features (inventory, recipes, meal planning, shopping lists, chat, appliances, nutrition)
- **admin/** - Administrative functions (users, experiments, cohorts, maintenance, moderation, ai-metrics, pricing, tickets)
- **platform/** - Platform-wide services (analytics, notifications, batch operations, feedback, activity logs)
- **ai/** - AI/ML endpoints consolidated into specialized routers:
  - generation.router.ts - Recipe and content generation
  - analysis.router.ts - Nutrition and image analysis
  - vision.router.ts - OCR and receipt processing
  - voice.router.ts - Voice commands and TTS
- **Standalone AI services:**
  - email-drafting.router.ts - Smart email/message drafting with GPT-4o-mini
  - writing-assistant.router.ts - Grammar, style, and tone analysis
  - excerpt.router.ts - Content excerpt generation
  - recommendations.router.ts - AI-powered recommendations
  - insights.router.ts - Analytics insights generation
- **Specialized services:**
  - natural-query.router.ts - Natural language to SQL conversion
  - fraud.router.ts - Fraud detection and monitoring
  - scheduling.router.ts - Scheduling and calendar services
  - images.router.ts - Image processing and manipulation

Inventory management uses inventory.router.ts for food items, storage locations, USDA lookup, barcode scanning, and AI enrichment functionality. Shopping list operations have been separated into a dedicated shopping-list.router.ts mounted at both `/api/v1/shopping-list` (legacy) and `/api/v1/inventory/shopping-list` (primary) for backward compatibility.

#### API Documentation (November 2024)
Comprehensive API documentation is available at `docs/API.md` covering all endpoints with request/response formats, authentication requirements, and error handling.

### Data Storage Architecture
PostgreSQL, accessed via Drizzle ORM, is the primary data store. The schema is type-safe, defined in `shared/schema/*.ts` files, using Zod for runtime validation, foreign key relationships, and JSONB columns. Core tables include `users`, `food_items`, `recipes`, `meal_plans`, `shopping_list_items`, `chat_messages`, `push_tokens`, `appliance_library`, `user_appliances`, `cooking_terms`, and `activity_logs`. Data is isolated by `user_id`.

#### Three-Tier Storage Architecture (Completed November 2024)
The storage architecture has been successfully refactored into a three-tier facade system:

1. **UserStorage**: Handles user-specific data (food items, recipes, inventory, meal plans, chat, subscriptions)
2. **AdminStorage**: Manages administrative functions (billing, notifications, security, experiments, support)
3. **PlatformStorage**: Controls platform-wide operations (analytics, AI/ML, system, integrations, content)

All tiers are composed through a central StorageRoot class accessible via `storage.user.*`, `storage.admin.*`, and `storage.platform.*`. Backward compatibility is maintained through root-level method proxies for seamless migration.

### System Design Choices
- **UI/UX**: Component-based architecture with TailwindCSS and shadcn/ui for consistency and accessibility.
- **AI Integration**: Deep integration with OpenAI for various kitchen-related AI features.
- **Cross-Platform**: Capacitor enables a unified codebase for web and mobile (iOS, Android).
- **Scalability**: Batched database operations, in-memory caching, and database indexing.
- **Maintainability**: Domain-driven design for storage, modular backend, and type-safe schema with Zod.

## External Dependencies

### AI & Machine Learning
- **OpenAI API**: GPT-4/GPT-4o for recipe generation, chat, and content moderation, with streaming via SSE.

### Food & Nutrition Data
- **USDA FoodData Central API**: Authoritative nutrition data.
- **Barcode Lookup API**: Product information from UPC/EAN codes.
- **Open Food Facts**: Fallback for barcode data.

### Cloud Storage
- **Google Cloud Storage**: For image uploads (recipe photos, user avatars).

### Push Notifications
- **Web Push**: Browser-based notifications.
- **Firebase Cloud Messaging (FCM)**: Android push notifications.
- **Apple Push Notification Service (APNS)**: iOS push notifications.

### Authentication Providers
- Google OAuth 2.0
- GitHub OAuth
- Twitter/X OAuth 2.0 with PKCE
- Apple Sign In
- Replit Auth (development only)

### Mobile Platform
- **Capacitor**: Cross-platform framework for iOS and Android deployment.

### Infrastructure
- **PostgreSQL Database**: Primary data store.

## Technical Notes

### AI Router Storage Stubs (November 2024)
The following storage methods are stub implementations that return placeholder data. They allow the application to compile but should be fully implemented when the corresponding features are built out:

**In StorageRoot.ts:**
- `createImageProcessingJob` - Image processing job tracking
- `updateImageProcessingJob` - Update job status/results
- `getImageProcessingJob` - Retrieve single job
- `getImageProcessingJobs` - List jobs by user/status
- `getImagePresets` - Enhancement preset retrieval
- `createImagePreset` - Custom preset creation

**In ai-ml.storage.ts (now properly typed):**
- `createOcrResult` - Returns `OcrResult` with proper `InsertOcrResult` input
- `getUserOcrResults` - Returns `OcrResult[]` 
- `createFaceDetection` - Returns `FaceDetection` with proper `InsertFaceDetection` input
- `getPrivacySettings` / `upsertPrivacySettings` - Returns `PrivacySettings` with proper field types
- `createImageMetadata` / `updateImageMetadata` - Returns `ImageMetadata` with proper input types
- `upsertAltTextQuality` - Returns `AltTextQuality` with proper input types
- `getImageMetadataByUrl` - Returns `ImageMetadata | null`
- `getTranscriptionsPaginated` - Returns `{ data: Transcription[]; total: number; page: number; limit: number }`

All stub methods log warnings when called and return properly typed placeholder data.

### Storage Layer Type Safety Improvements (November 2024)
Type safety improvements have been completed for high-priority storage domains across multiple phases:

**Shared Type Definitions (shared/schema/):**
- `auth.ts`: SessionData, SessionUser, AuthProviderInfo, InsertAuthProviderInfo, UpdateAuthProviderInfo
- `analytics.ts`: ApiUsageMetadata, ApiUsageStats, WebVitalsStats, WebVitalsMetricStats, SessionStats, EventStats, AnalyticsStatsResult, PredictionValue
- `security.ts`: FraudReviewRestrictions (restrictions for blocked users), InsertModerationLog, ModerationLog, InsertFraudScore, InsertSuspiciousActivity, PrivacySetting
- `scheduling.ts`: SelectedTimeSlot, InsertSchedulingPreferences, MeetingEvents
- `pricing.ts`: InsertPricingRule, PricingRule, InsertPriceHistory, InsertPricingPerformance
- `experiments.ts`: InsertAbTest, AbTest, InsertAbTestResult, InsertCohort, Cohort
- `billing.ts`: InsertDonation, Donation
- `support.ts`: InsertTicket, Ticket, InsertUserFeedback
- `food.ts`: InsertUserInventory, UserInventory, InsertStorageLocation, InsertShoppingItem, InsertRecipe, Recipe, InsertCookingTerm, CookingTerm
- `ai-ml.ts`: InsertVoiceCommand, InsertDraftTemplate, InsertGeneratedDraft, InsertSummary, InsertTranscription
- `system.ts`: InsertActivityLog, InsertSystemMetric, InsertMaintenancePrediction, InsertMaintenanceHistory
- `content.ts`: InsertContentCategory, ContentCategory
- `analytics.ts`: InsertAnalyticsEvent, InsertUserSession, InsertWebVital
- `notifications.ts`: InsertNotificationHistory

**Updated Interfaces and Implementations:**
- IUserStorage / user.storage.ts: 8 'any' usages eliminated (session data, auth providers, user preferences)
- IAnalyticsStorage / analytics.storage.ts: 5 'any' usages eliminated (API stats, web vitals, analytics stats, prediction values)
- ISecurityStorage / security.storage.ts: 2 interface 'any' usages eliminated (fraud review restrictions)
- ISchedulingStorage / scheduling.storage.ts: 2 interface 'any' usages eliminated (selected time slots)

**StorageRoot.ts Complete Type Safety (November 2024):**
- Replaced 100+ 'any' types with proper schema types across all method signatures
- Added comprehensive type imports from 20+ schema modules
- All user management methods use InsertUser, User, SessionData, AuthProviderInfo types
- All food/inventory methods use InsertUserInventory, UserInventory, InsertUserStorage, UserStorage, InsertShoppingItem, ShoppingItem, InsertRecipe, Recipe types
- All billing methods use InsertDonation, Donation types
- All support methods use InsertTicket, Ticket, InsertUserFeedback types
- All security methods use InsertModerationLog, ModerationLog, InsertFraudScore, InsertSuspiciousActivity types
- All pricing methods use InsertPricingRule, PricingRule, InsertPriceHistory, InsertPricingPerformance types
- All experiments methods use InsertAbTest, AbTest, InsertAbTestResult, InsertCohort, Cohort types
- All analytics methods use ApiUsageMetadata, InsertWebVital, InsertUserSession, UserSession, InsertAnalyticsEvent types
- All AI/ML methods use InsertVoiceCommand, InsertDraftTemplate, InsertGeneratedDraft, InsertSummary, InsertTranscription types
- All system methods use InsertActivityLog, InsertSystemMetric, InsertMaintenancePrediction, InsertMaintenanceHistory types
- All content methods use InsertContentCategory, ContentCategory types
- All scheduling methods use MeetingEvents, InsertSchedulingPreferences types
- Image processing stubs use inline object types with proper structure definitions
- Update methods use `Partial<Pick<T, ...mutable_fields...>>` for precise field restrictions, excluding immutable fields (id, userId, createdAt, updatedAt)
- Create methods use `Omit<InsertT, 'id' | 'createdAt' | 'updatedAt'>` with explicit required fields

**Total Eliminated: 100+ 'any' types across StorageRoot.ts + 17 high-priority types across domain interfaces**

**Remaining Low-Priority 'any' Usages:**
- AI-ML domain storage: Drizzle ORM `as any` casts for insert/update operations with JSONB fields - required due to Drizzle type constraints
- System domain storage: Internal Drizzle query condition arrays - acceptable pattern for dynamic query building
- Security storage cache: Uses `unknown` type with generic getters for type-safe retrieval
- Content/billing/analytics storage: Drizzle ORM type casts for complex insert operations

**Note:** The `as any` casts in Drizzle ORM operations are intentional workarounds for type mismatches between the schema definition and runtime types, particularly for JSONB columns. These do not affect runtime safety.

### Storage Layer Test Suite (November 2024)
Comprehensive test coverage for the three-tier storage architecture with 310 passing tests:

**Unit Tests (239 tests) - `server/storage/__tests__/*.test.ts`:**
- `mockDb.ts` - Mock database infrastructure with in-memory tables and query simulation
- `storageErrors.test.ts` - Error boundary and error handling verification
- `userStorage.test.ts` - User domain storage methods (user CRUD, sessions, preferences)
- `recipesStorage.test.ts` - Recipe domain storage methods (recipes, cooking terms, favorites)
- Additional domain tests for inventory, admin, and platform storage

**Integration Tests (71 tests) - `server/storage/__tests__/integration/*.test.ts`:**
- `testUtils.ts` - Test utilities with actual Neon PostgreSQL connection and cleanup helpers
- `storageFlow.integration.test.ts` - End-to-end storage flows with real database
- `dataPersistence.integration.test.ts` - Data persistence and retrieval verification
- `errorPropagation.integration.test.ts` - Error propagation through storage layers

**Test Infrastructure:**
- Uses Node.js built-in test module (`node:test` and `node:assert`)
- Mock database for unit tests (isolated, fast execution)
- Actual Neon PostgreSQL for integration tests (real database operations)
- Drizzle ORM for type-safe database interactions
- Test data isolation with unique user IDs and cleanup utilities

**Running Tests:**
```bash
# All storage tests
npx tsx --test server/storage/__tests__/*.test.ts server/storage/__tests__/integration/*.test.ts

# Unit tests only
npx tsx --test server/storage/__tests__/*.test.ts

# Integration tests only
npx tsx --test server/storage/__tests__/integration/*.test.ts
```