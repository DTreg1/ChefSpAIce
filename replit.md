# ChefSpAIce - Smart Kitchen Assistant

## Overview

ChefSpAIce is an AI-powered kitchen management application designed to help users manage food inventory, reduce waste, and discover personalized recipes. It integrates real-time inventory tracking with AI-driven recipe generation, nutrition analysis, and meal planning. The project aims to provide a comprehensive solution for modern kitchen management, offering a seamless experience across web and mobile platforms.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

The frontend is built with React 18, TypeScript, Vite, and TailwindCSS with shadcn/ui components for a consistent and accessible user interface. State management utilizes TanStack Query for server state and React Context API for global UI state. The application employs a component-based architecture, custom hooks for reusable logic, progressive disclosure, and lazy loading for performance. Capacitor is used for cross-platform mobile deployment, integrating native plugins for camera, push notifications, and sharing. PWA capabilities ensure offline support.

### Backend Architecture

The backend is an Express.js RESTful API, organized into domain-specific routers with middleware for authentication, rate limiting, and error handling. Server-Sent Events (SSE) facilitate streaming AI responses. Authentication supports Replit Auth (development), OAuth (Google, GitHub, Twitter/X, Apple), and email/password, with session-based management and user-scoped data isolation. Key services include OpenAI integration for AI features, USDA API client for nutrition data, Barcode Lookup, Push Notifications, Activity Logging, and an in-memory Cache Service. Performance is optimized through batched database operations, in-memory caching, and database indexing.

### Data Storage Architecture

PostgreSQL, accessed via Drizzle ORM, serves as the primary data store. The schema is type-safe, defined in modular `shared/schema/*.ts` files, using Zod for runtime validation, foreign key relationships, and JSONB columns for flexible data. Core tables include `users`, `food_items`, `recipes`, `meal_plans`, `shopping_list_items`, `chat_messages`, `push_tokens`, `appliance_library`, `user_appliances`, `cooking_terms`, and `activity_logs`. Data is isolated by `user_id`, and a storage abstraction layer enforces access control.

## External Dependencies

### AI & Machine Learning
- **OpenAI API**: GPT-4/GPT-4o for recipe generation, chat, and content moderation, with streaming via SSE.

### Food & Nutrition Data
- **USDA FoodData Central API**: Authoritative nutrition data with caching.
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
- **PostgreSQL Database**: Primary data store (e.g., Neon serverless).

## Recent Updates

### Storage Architecture Overhaul - Phase 1 Complete (November 16, 2025)

Successfully refactored monolithic 16,826-line storage.ts file using domain-driven design:

#### Completed Domain Modules (15 domains, ~100% of functionality)
- **Inventory Domain**: Food items, expiration tracking, shopping lists
- **User/Auth Domain**: User management, OAuth, authentication, sessions
- **Recipes Domain**: Recipe CRUD, search, meal planning
- **Chat Domain**: AI conversation history and context management
- **Analytics Domain**: Activity logging, API usage tracking, web vitals, predictions, trends
- **Feedback Domain**: User feedback, community features, donations
- **Notification Domain**: Push notifications, preferences, engagement tracking
- **AI/ML Domain** ✨ **(November 20, 2025)**: Voice commands, draft generation, writing assistance, summarization, translations, data extraction, transcriptions, query logs (1,322 lines, 0 LSP errors)
- **System Domain** ✨ **(November 20, 2025)**: API usage logging, activity logs, system metrics, maintenance predictions, log retention (982 lines, 0 LSP errors)
- **Support Domain** ✨ **(November 20, 2025)**: Ticket management, routing rules, agent expertise, help desk analytics (578 lines, 0 LSP errors)
- **Billing Domain** ✨ **(November 20, 2025)**: Donations, Stripe payments, donor analytics, recurring billing (486 lines, 0 LSP errors)
- **Experiments Domain** ✨ **(November 20, 2025)**: A/B testing, cohort analysis, statistical significance, experimentation insights (728 lines, 0 LSP errors)
- **Security Domain** ✨ **(November 20, 2025)**: Content moderation, fraud detection, suspicious activity tracking, privacy settings (704 lines, 0 LSP errors)
- **Scheduling Domain** ✨ **(November 20, 2025)**: Meeting preferences, AI time suggestions, pattern learning, calendar conflict detection (550 lines, 0 LSP errors)
- **Pricing Domain** ✨ **(November 20, 2025)**: Dynamic pricing rules, price history tracking, performance metrics, market intelligence, AI optimization (689 lines, 0 LSP errors)

#### Architecture Improvements
- Implemented storage composition helper using `mergeStorageModules` for efficient domain aggregation
- Replaced manual method binding with dynamic composition pattern
- Each domain is fully type-safe with comprehensive error handling
- Zero LSP errors across all domain implementations