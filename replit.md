# ChefSpAIce - Smart Kitchen Assistant

## Overview

ChefSpAIce is an AI-powered kitchen management application that helps users manage food inventory, reduce waste, and discover personalized recipes. The app combines real-time inventory tracking with AI-powered recipe generation, nutrition analysis, and meal planning capabilities.

**Core Features:**
- Food inventory management with expiration tracking
- AI-powered recipe generation using OpenAI GPT
- Barcode scanning for quick food item addition
- USDA FoodData Central integration for nutrition data
- Meal planning and shopping list generation
- Multi-platform support (web and mobile via Capacitor)

**Technology Stack:**
- Frontend: React + TypeScript + Vite + TailwindCSS
- Backend: Express.js + TypeScript
- Database: PostgreSQL with Drizzle ORM
- AI: OpenAI GPT for recipe generation and chat
- Mobile: Capacitor for iOS/Android deployment
- Authentication: OAuth (Google, GitHub, Twitter, Apple) + Email/Password

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Major Refactoring (November 17-18, 2025)

### Schema Refactoring - Phase 2: Database Schema Modularization

**Objective:** Split monolithic 11,006-line `shared/schema.ts` file containing 104 database tables into modular, domain-specific files.

#### Status: 95% Complete (Blocked by TypeScript Compilation Errors)

**What Was Accomplished:**
- ✅ Successfully split 104 tables into 19 domain-specific schema modules (~5,546 total lines)
- ✅ Resolved 495+ initial TypeScript compilation errors through systematic type exports
- ✅ Fixed critical database runtime errors in fdcCache, activity_logs, and cooking_terms tables
- ✅ Achieved zero runtime database errors before automated script issue
- ✅ Maintained backward compatibility using type aliases in compatibility layer files

**Current Blocker:**
- ⚠️ **39 Insert schemas broken** across 11 files due to automated sed script removing table parameters from `createInsertSchema()` calls
- ⚠️ **TypeScript compilation fails** - Cannot start application until schemas are fixed
- ⚠️ **Files affected:** content.ts (6), experiments.ts (5), extraction.ts (2), forms.ts (3), images.ts (7), pricing.ts (2), scheduling.ts (3), security.ts (3), sentiment.ts (4), support.ts (2), transcription.ts (2)

**Domain Module Organization:**

**Core Domains (Fully Working):**
1. **auth.ts** - Users, OAuth providers, sessions, authentication
2. **food.ts** - Food items, expiration tracking, shopping lists, USDA cache
3. **recipes.ts** - Recipes, meal plans, cooking instructions
4. **chat.ts** - AI conversation history, context management
5. **analytics.ts** - Activity logs, API usage, web vitals, predictions
6. **notifications.ts** - Push tokens, preferences, engagement tracking
7. **appliances.ts** - Equipment library, user appliances, capabilities
8. **billing.ts** - Donations, Stripe integration

**Extended Domains (TypeScript Errors - Need Schema Fixes):**
9. **content.ts** - Categories, tags, embeddings, semantic search
10. **experiments.ts** - A/B testing, variants, cohorts
11. **extraction.ts** - OCR, pattern extraction
12. **forms.ts** - Form builder, responses, analytics
13. **images.ts** - Image generation, face detection, collections
14. **pricing.ts** - Dynamic pricing rules
15. **scheduling.ts** - Scheduled actions, recurrence
16. **security.ts** - Security events, login attempts, account locks
17. **sentiment.ts** - Sentiment analysis, readability, keyword extraction
18. **support.ts** - Support tickets, messaging
19. **transcription.ts** - Voice transcriptions, segments

**System Files:**
- **index.ts** - Central export aggregator
- **MIGRATION_GUIDE.md** - Developer migration documentation
- **Compatibility layers:** schema.ts, json-schemas.ts, chat-compatibility.ts (cannot delete until 50+ dependent files are migrated)

**Database Schema Fixes Completed:**
1. **fdcCache table**: Restored 8 missing columns (fdcId, description, brandOwner, nutrients JSONB, etc.) - USDA nutrition lookups now functional
2. **activity_logs table**: Added missing activity_type and resource_type columns + indexes - Analytics tracking restored
3. **cooking_terms table**: Added definition column, migrated data from short_definition/long_definition - Glossary feature working

**Next Steps to Completion:**
- Restore table parameters to 39 broken `createInsertSchema()` calls (mechanical fix, 20-30 minutes manual work)
- See REFACTORING_SUMMARY.md and DETAILED_BROKEN_SCHEMAS.md for complete fix reference
- Once fixed, application will return to zero-error state

### Storage Architecture Overhaul - Phase 1 Complete (November 16, 2025)

Successfully refactored monolithic 16,826-line storage.ts file using domain-driven design:

#### Completed Domain Modules (7 domains, ~70% of functionality)
- **Inventory Domain**: Food items, expiration tracking, shopping lists
- **User/Auth Domain**: User management, OAuth, authentication, sessions
- **Recipes Domain**: Recipe CRUD, search, meal planning
- **Chat Domain**: AI conversation history and context management
- **Analytics Domain**: Activity logging, API usage tracking, web vitals, predictions, trends
- **Feedback Domain**: User feedback, community features, donations
- **Notification Domain**: Push notifications, preferences, engagement tracking

#### Architecture Improvements
- Implemented storage composition helper using `mergeStorageModules` for efficient domain aggregation
- Replaced manual method binding with dynamic composition pattern
- Domain modules take precedence over legacy storage (proper override chain)
- Maintained full backward compatibility during migration

#### Future Migration Phases (Remaining ~30% in Legacy Storage)
**Phase 2 Candidates (Grouped by Domain):**
- **Appliance Domain**: Equipment library, user appliances, appliance capabilities
- **Intelligence Domain**: AI features (voice commands, transcriptions, writing assistance), OCR, face detection, image processing
- **Content Domain**: Content moderation, tagging systems, embeddings, semantic search
- **Advanced Analytics**: A/B testing, cohort analysis, scheduling, advanced metrics
- **Nutrition/Barcode**: USDA cache management, barcode lookups, nutrition data

**Migration Strategy:**
1. Legacy functions remain operational via compatibility layer
2. New features should use domain modules directly
3. Migrate remaining functions as business needs arise
4. Each future domain can be migrated independently without breaking existing functionality

### Security Hardening
- Removed all hardcoded API keys and OAuth credentials
- Implemented comprehensive environment variable validation at startup
- Created secure configuration modules for OpenAI and OAuth providers
- SESSION_SECRET now required in production (secure auto-generation in dev)
- All sensitive credentials use getSafeEnvVar() with no insecure defaults

### Architecture Improvements
- SOLID principles enforced with clean separation of concerns
- Routes remain thin controllers, delegating to storage interfaces
- SQL-based queries replace in-memory filtering for performance
- ISO string date handling for API consistency
- Cross-domain coupling minimized for maintainability

## System Architecture

### Frontend Architecture

**Framework & Build System:**
- React 18 with TypeScript for type-safe UI development
- Vite as the build tool for fast development and optimized production builds
- TailwindCSS with shadcn/ui components for consistent, accessible UI
- React Router for client-side routing

**State Management:**
- TanStack Query (React Query) for server state management and caching
- Context API for auth state and global UI state
- Local component state for ephemeral UI state

**Key Design Patterns:**
- Component-based architecture with separation of concerns
- Custom hooks for reusable logic (useAuth, useVoiceConversation, useBarcodeScanner)
- Progressive disclosure for complex UIs
- Lazy loading for performance optimization

**Mobile Support:**
- Capacitor framework for cross-platform mobile deployment
- Native plugins: Camera (barcode scanning), Push Notifications, Share API
- PWA capabilities with service worker for offline support

### Backend Architecture

**API Design:**
- RESTful API with Express.js
- Router-based organization (appliances, feedback, inventory, nutrition, recipes, etc.)
- Middleware for authentication, rate limiting, and error handling
- Server-Sent Events (SSE) for streaming AI responses

**Authentication & Authorization:**
- Dual-mode auth system supporting both Replit Auth (dev) and OAuth (production)
- Session-based authentication with PostgreSQL session store
- Multiple OAuth providers: Google, GitHub, Twitter/X, Apple
- Email/password authentication as fallback
- User-scoped data isolation enforced at database layer

**Key Services:**
- **OpenAI Integration**: Recipe generation, chat responses, content moderation
- **USDA API Client**: Nutrition data lookup with caching
- **Barcode Lookup**: Product information retrieval with fallback to OpenFoodFacts
- **Push Notifications**: Web Push + native iOS/Android support (APNS/FCM)
- **Activity Logging**: Batched API usage logging for analytics and cost monitoring
- **Cache Service**: In-memory caching for API responses with TTL and LRU eviction

**Performance Optimizations:**
- Batched database operations for API logging (20 logs per batch, 3s flush interval)
- In-memory caching for external API responses (30-90 day TTL depending on data type)
- Database indexes on frequently queried columns (user_id, expiration_date, created_at)
- Query result caching with React Query on frontend

### Data Storage Architecture

**Database: PostgreSQL via Drizzle ORM**

**Schema Design:**
- Type-safe schema definitions in modular `shared/schema/*.ts` files (19 domain modules)
- Zod schemas for runtime validation
- Foreign key relationships for data integrity
- JSONB columns for flexible metadata storage

**Core Tables:**
- `users`: User accounts from OAuth providers
- `food_items` (userInventory): Food inventory with expiration tracking
- `recipes`: User-created and AI-generated recipes
- `meal_plans`: Scheduled meals by date
- `shopping_list_items`: Shopping list with categorization
- `chat_messages`: AI chat conversation history
- `push_tokens`: Device tokens for push notifications
- `appliance_library` & `user_appliances`: Equipment tracking
- `cooking_terms`: Glossary of cooking terminology
- `activity_logs`: User action tracking for analytics

**Data Isolation:**
- All user data scoped by `user_id` foreign key
- Storage abstraction layer (`server/storage.ts`) enforces access control
- Cascading deletes for data cleanup

**Database Operations:**
- Transactions not currently used (opportunity for future enhancement)
- Soft deletes not implemented (hard deletes used)
- Automatic timestamp tracking via `timestamp().defaultNow()`

### External Dependencies

**AI & Machine Learning:**
- **OpenAI API**: GPT-4/GPT-4o for recipe generation, chat, and content moderation
- Model selection: GPT-4o for production, configurable via environment
- Streaming responses via Server-Sent Events for real-time chat
- Content moderation for user-generated content

**Food & Nutrition Data:**
- **USDA FoodData Central API**: Authoritative nutrition database
  - Free tier with rate limiting
  - Cached responses (30-90 day TTL)
  - Fallback to manual entry if lookup fails
- **Barcode Lookup API**: Product information from UPC/EAN codes
  - Primary source for barcode scanning
  - 30-day cache for successful lookups
- **Open Food Facts**: Fallback barcode database (free, community-driven)

**Cloud Storage:**
- **Google Cloud Storage**: Image uploads (recipe photos, user avatars)
- Bucket configuration via `GOOGLE_CLOUD_STORAGE_BUCKET` environment variable
- Service account authentication

**Push Notifications:**
- **Web Push**: Browser-based notifications (VAPID keys)
- **Firebase Cloud Messaging**: Android push notifications
- **Apple Push Notification Service**: iOS push notifications
- Token storage in `push_tokens` table with platform detection

**Authentication Providers:**
- Google OAuth 2.0
- GitHub OAuth
- Twitter/X OAuth 1.0a
- Apple Sign In
- Replit Auth (development only)

**Development & Testing:**
- **Playwright**: E2E testing with Chromium
- **ESLint**: Code quality and TypeScript linting
- **Drizzle Kit**: Database migrations and schema management

**Mobile Platform:**
- **Capacitor**: Cross-platform mobile framework
  - iOS deployment target
  - Android deployment target
  - Native plugin bridge for camera, notifications, sharing

**Infrastructure:**
- **PostgreSQL Database**: Primary data store (Neon serverless recommended)
- **Environment Variables**: Configuration via `.env` file
  - `DATABASE_URL`: PostgreSQL connection string
  - `OPENAI_API_KEY`: OpenAI API authentication
  - `USDA_API_KEY`: USDA FoodData Central API key
  - OAuth provider credentials (CLIENT_ID, CLIENT_SECRET for each)
  - Push notification credentials (VAPID keys, FCM server key, APNS certificates)
