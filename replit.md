# ChefSpAIce - Smart Kitchen Assistant

## Overview
ChefSpAIce is an AI-powered kitchen management application designed to help users manage food inventory, reduce waste, and discover personalized recipes. It integrates real-time inventory tracking with AI-driven recipe generation, nutrition analysis, and meal planning. The project aims to provide a comprehensive solution for modern kitchen management, offering a seamless experience across web and mobile platforms.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
Built with React 18, TypeScript, Vite, and TailwindCSS with shadcn/ui. It uses TanStack Query for server state and React Context API for global UI state, employing a component-based architecture, custom hooks, progressive disclosure, and lazy loading. Capacitor is used for cross-platform mobile deployment (native camera, push notifications, sharing) and PWA capabilities.

### Backend
An Express.js RESTful API, organized into domain-specific routers with middleware for authentication, rate limiting, and error handling. Server-Sent Events (SSE) are used for streaming AI responses. Authentication supports Replit Auth, OAuth (Google, GitHub, Twitter/X, Apple), and email/password, with session-based management and user-scoped data isolation. Key router categories include `user/` (user features), `admin/` (administrative functions), `platform/` (platform-wide services), and `ai/` (AI/ML endpoints).

### Data Storage
PostgreSQL, accessed via Drizzle ORM, is the primary data store. The schema is type-safe, defined in `shared/schema/*.ts` files, using Zod for runtime validation, foreign key relationships, and JSONB columns. Data is isolated by `user_id`. The architecture employs a three-tier facade system: `UserStorage` for user-specific data, `AdminStorage` for administrative functions, and `PlatformStorage` for platform-wide operations.

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
- **Google Cloud Storage**: For image uploads.

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