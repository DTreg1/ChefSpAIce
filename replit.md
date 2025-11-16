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

## Recent Major Refactoring (November 16, 2025)

### Storage Architecture Overhaul
Completed refactoring of monolithic 16,826-line storage.ts file using domain-driven design:
- Created four domain storage modules with explicit interfaces:
  - **Inventory Domain**: Food items, expiration tracking, shopping lists
  - **User/Auth Domain**: User management, OAuth, authentication
  - **Recipes Domain**: Recipe CRUD, search, meal planning
  - **Chat Domain**: AI conversation history and context management
- Implemented compatibility facade pattern for incremental migration
- ~65% of original storage.ts migrated to domain modules
- Remaining ~35% contains niche/legacy functions behind compatibility layer

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
- Type-safe schema definitions in `shared/schema.ts`
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