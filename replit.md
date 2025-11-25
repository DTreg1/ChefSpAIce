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
- Twitter/X OAuth 1.0a
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

**In ai-ml.storage.ts:**
- `createOcrResult` - OCR result persistence
- `getUserOcrResults` - OCR history retrieval
- `createFaceDetection` - Face detection result storage
- `getPrivacySettings` / `upsertPrivacySettings` - Privacy preference management
- `createImageMetadata` / `updateImageMetadata` - Image metadata tracking
- `upsertAltTextQuality` - Alt text quality metrics
- `getImageMetadataByUrl` - Image lookup by URL

All stub methods log warnings when called to help identify when they need implementation.