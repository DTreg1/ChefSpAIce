# ChefSpAIce - Smart Kitchen Assistant

## Overview

ChefSpAIce is an AI-powered kitchen management application designed to help users manage food inventory, reduce waste, and discover personalized recipes. It integrates real-time inventory tracking with AI-driven recipe generation, nutrition analysis, and meal planning. The project provides a comprehensive solution for modern kitchen management, offering a seamless experience across web and mobile platforms.

## User Preferences

- Preferred communication style: Simple, everyday language
- UI style: Utility-focused chat application following ChatGPT's conversational patterns
- Design approach: Clean, accessible interface with olive green primary color (#6b8e23)

## System Architecture

### Frontend

Built with React 18, TypeScript, Vite, and TailwindCSS with shadcn/ui components. Key technologies:
- **State Management**: TanStack Query for server state, React Context API for global UI state
- **Routing**: Wouter for client-side routing
- **Forms**: React Hook Form with Zod validation
- **Mobile**: Capacitor for cross-platform iOS/Android deployment with native camera, push notifications, and sharing
- **PWA**: Progressive Web App with offline support via Service Worker

### Backend

Express.js RESTful API with modular router architecture:

**Router Categories:**
- `user/` - User features (inventory, recipes, chat, profile, meal planning)
- `admin/` - Administrative functions (A/B testing, cohorts, moderation, maintenance)
- `platform/` - Platform-wide services (analytics, notifications, scheduling, fraud detection)
- `platform/ai/` - AI/ML endpoints (analysis, content generation, media processing)

**Key Features:**
- Server-Sent Events (SSE) for streaming AI responses and real-time chat
- Session-based authentication with PostgreSQL store
- Multi-provider OAuth (Google, GitHub, Twitter/X, Apple, Replit) + email/password

### Data Storage

PostgreSQL accessed via Drizzle ORM with a domain-driven architecture:

**Schema Organization:** 18 domain modules containing 104 tables total
- Core: auth (3), food (10), notifications (5), chat (4), billing (1)
- Analytics: analytics (11), system (5), experiments (6)
- AI/ML: ai-ml (14), images (7), sentiment (5), transcription (2), extraction (2)
- Content: content (7), forms (7), scheduling (4), pricing (3)
- Security: security (8), support (5)

**Storage Layer Architecture:**
- `storage/interfaces/` - TypeScript interface contracts (17 interfaces)
- `storage/domains/` - Domain implementations (17 storage modules)
- `storage/facades/` - Three-tier facade system:
  - `UserStorage` - User-specific data operations
  - `AdminStorage` - Administrative functions
  - `PlatformStorage` - Platform-wide operations

### Key Services (34 services)

Located in `server/services/`:
- **AI Services**: OpenAI query, embeddings, sentiment analysis, summarization, moderation
- **ML Services**: Prediction, trend analysis, duplicate detection, ML notification scheduler
- **Notification Services**: FCM, APNS, web push, push scheduling
- **Analytics Services**: Activity logging, fraud detection, retention campaigns
- **Content Services**: Alt-text generation, face detection, term detection, excerpt generation

## External Dependencies

### AI & Machine Learning
- **OpenAI API**: GPT-4/GPT-4o for recipe generation, chat, content moderation, vision analysis
- **Streaming**: Server-Sent Events for real-time AI responses
- **ML Features**: Semantic search (embeddings), auto-categorization, duplicate detection, NLP tagging

### Food & Nutrition Data
- **USDA FoodData Central API**: Authoritative nutrition data with local caching
- **Barcode Lookup API**: Product information from UPC/EAN codes
- **Open Food Facts**: Fallback for barcode data

### Cloud Storage
- **Google Cloud Storage**: Image uploads and asset storage

### Push Notifications
- **Web Push**: Browser-based notifications via VAPID (requires VAPID key configuration)
- **Firebase Cloud Messaging (FCM)**: Android push notifications (requires FCM credentials)
- **Apple Push Notification Service (APNS)**: iOS push notifications (requires APNs credentials)

### Authentication Providers
- Google OAuth 2.0
- GitHub OAuth
- Twitter/X OAuth 2.0 with PKCE
- Apple Sign In
- Replit Auth (OIDC)
- Email/Password (bcrypt hashing)

### Mobile Platform
- **Capacitor**: Cross-platform framework for iOS and Android
- Native plugins: Camera, Push Notifications, Share, Device

### Infrastructure
- **PostgreSQL Database**: Primary data store (Neon serverless)
- **Express Session**: PostgreSQL-backed session storage

## Project Structure

```
├── client/                 # Frontend React application
│   └── src/
│       ├── components/     # Reusable UI components
│       ├── contexts/       # React context providers
│       ├── hooks/          # Custom React hooks
│       ├── lib/            # Utility libraries
│       ├── pages/          # Route page components (60+ pages)
│       └── utils/          # Helper functions
├── server/                 # Backend Express server
│   ├── auth/               # Authentication & OAuth
│   ├── config/             # Server configuration
│   ├── data/               # Static data files
│   ├── integrations/       # External API clients
│   ├── middleware/         # Express middleware
│   ├── notifications/      # Push notification handlers
│   ├── routers/            # API route handlers
│   │   ├── user/           # User domain routes
│   │   ├── admin/          # Admin domain routes
│   │   └── platform/       # Platform domain routes
│   ├── services/           # Business logic (34 services)
│   ├── storage/            # Database access layer
│   │   ├── domains/        # Domain implementations (17)
│   │   ├── facades/        # Storage facades (3)
│   │   └── interfaces/     # TypeScript interfaces (17)
│   └── utils/              # Server utilities
├── shared/                 # Shared code
│   └── schema/             # Database schema (18 domains, 104 tables)
├── docs/                   # Documentation
├── ios/                    # iOS Capacitor project
└── migrations/             # Database migrations
```

## Key Features

### Inventory Management
- Food item tracking with expiration dates
- Storage location organization (fridge, freezer, pantry, counter)
- Barcode scanning for quick item addition
- USDA nutrition data integration

### Recipe System
- AI-powered recipe generation based on inventory
- Recipe saving and favoriting
- Ingredient matching with inventory
- Nutrition analysis per recipe

### Meal Planning
- Weekly meal plan generation
- Shopping list automation
- Nutrition goal tracking
- Calendar integration

### AI Chat Assistant
- Natural language food queries
- Recipe suggestions based on available ingredients
- Cooking technique explanations
- Real-time streaming responses

### Analytics & Insights
- Food waste tracking
- Nutrition trends
- Usage patterns
- Predictive expiration alerts

### Admin Features
- A/B testing framework
- User cohort management
- Content moderation
- System health monitoring
- Fraud detection

## Development

### Running the Project
```bash
npm run dev          # Start development server (port 5000)
npm run build        # Build for production
npm run db:push      # Push schema changes to database
npm run db:generate  # Generate migration files
```

### Code Quality
```bash
npm run check        # TypeScript type checking
npm run lint         # ESLint checking
npm run lint:fix     # Auto-fix linting issues
```

### Mobile Development
```bash
npx cap sync ios     # Sync iOS project
npx cap open ios     # Open in Xcode
```

## Documentation

- `docs/API.md` - Complete API endpoint documentation
- `docs/AUTH_CONFIG.md` - Authentication configuration guide
- `docs/SETUP_GUIDE.md` - Service setup instructions
- `docs/PUSH_NOTIFICATIONS_SETUP.md` - Push notification setup
- `docs/IOS_SETUP_GUIDE.md` - iOS app store preparation
- `docs/design_guidelines.md` - UI/UX design system
- `server/README.md` - Backend architecture details
- `shared/README.md` - Schema documentation

## Recent Updates

### User Identification System (December 2025)
- **Primary Key**: Users table uses UUID-based `id` column as the primary key
- **Foreign Keys**: All 16+ schema files reference `users.id` for foreign key relationships
- **Auth Flow**: SessionUser objects use `user.id` for user identification
- **Storage Layer**: All storage methods query by `users.id` instead of `users.email`
- **Note**: `users.email` is only used for email-based lookups (getUserByEmail)

### Current Sprint
- 17 storage domain modules (16 fully operational, 1 with stub methods)
- 33 backend services active
- 60+ frontend pages implemented
- Multi-provider OAuth authentication complete
- Real-time AI chat with SSE streaming
- Push notification system for web, iOS, and Android (requires credential configuration)
- Comprehensive analytics and insights system
- A/B testing and experimentation framework
- Role-based access control (RBAC) with admin-protected routes under `/api/v1/admin/*`

### Storage Layer Status
- **17/17 domains** fully aligned with interfaces
- **375 fully implemented methods**
- **0 critical alignment issues**
- All facades (UserStorage, AdminStorage, PlatformStorage) operational

### AI-ML Storage Features (Fully Implemented)
- OCR Results: Create and retrieve optical character recognition results
- Face Detection: Store face detection data from TensorFlow.js BlazeFace
- Privacy Settings: User privacy preferences for face recognition and data retention
- Image Metadata: Store and retrieve image metadata with analysis results
- Alt-Text Quality: Track and update accessibility quality scores for images

*Last Updated: December 2025*
