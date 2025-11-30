# Server Documentation

## Overview

Express.js backend server for ChefSpAIce, providing RESTful APIs, authentication, database management, and AI/ML services for the frontend application.

## Architecture

The server follows a modular, domain-driven architecture with clear separation of concerns:

```
server/
├── auth/               # Authentication & OAuth configuration
├── config/             # Configuration files
├── data/               # Static data & configuration files
├── integrations/       # External service integrations (APIs)
├── middleware/         # Express middleware
├── migrations/         # Database migrations & schema updates
├── notifications/      # Push notification system
├── routers/            # API route handlers (3 domains)
│   ├── user/           # User-facing features (13 routers)
│   ├── admin/          # Administrative functions (8 routers)
│   └── platform/       # Platform services (12 routers)
├── seeds/              # Database seed scripts
├── services/           # Business logic services (34 services)
├── storage/            # Database storage layer
│   ├── domains/        # Domain implementations (17 modules)
│   ├── facades/        # Storage facades (3 facades)
│   ├── interfaces/     # TypeScript interfaces (17 interfaces)
│   └── errors/         # Custom error classes
├── types/              # TypeScript type definitions
├── utils/              # Utility functions & helpers
├── db.ts               # Database connection
├── index.ts            # Main server entry point
├── suppress-logs.ts    # TensorFlow log suppression
└── vite.ts             # Vite server configuration
```

## Router Structure

### User Domain (`routers/user/`) - 13 Routers
User-facing features and personal data management:
- `appliances.router.ts` - Kitchen appliance management
- `autocomplete.router.ts` - Search autocomplete suggestions
- `autosave.router.ts` - Draft content auto-saving
- `chat.router.ts` - AI chat conversations
- `cooking-terms.router.ts` - Cooking terminology glossary
- `inventory.router.ts` - Food inventory management
- `meal-planning.router.ts` - Meal plan creation and management
- `nutrition.router.ts` - Nutrition tracking and goals
- `oauth.router.ts` - OAuth authentication flows
- `profile.router.ts` - User profile management
- `recipes.router.ts` - Recipe CRUD and generation
- `shopping-list.router.ts` - Shopping list management
- `validation.router.ts` - Data validation endpoints

### Admin Domain (`routers/admin/`) - 8 Routers
Administrative and management functions:
- `ab-testing.router.ts` - A/B test management
- `admin.router.ts` - General admin operations
- `ai-metrics.router.ts` - AI usage analytics
- `cohorts.router.ts` - User cohort management
- `maintenance.router.ts` - System maintenance
- `moderation.router.ts` - Content moderation
- `pricing.router.ts` - Price management
- `ticket-routing.router.ts` - Support ticket routing

### Platform Domain (`routers/platform/`) - 12 Routers
Platform-wide services and integrations:
- `activity-logs.router.ts` - Activity logging
- `analytics.router.ts` - Analytics tracking
- `batch.router.ts` - Batch operations
- `feedback.router.ts` - User feedback
- `fraud.router.ts` - Fraud detection
- `intelligent-notifications.router.ts` - Smart notifications
- `notifications.router.ts` - Push notifications
- `push-tokens.router.ts` - Device token management
- `scheduling.router.ts` - Meeting scheduling

**AI Sub-domain (`routers/platform/ai/`):**
- `analysis.router.ts` - Content analysis
- `content.router.ts` - Content generation
- `media.router.ts` - Media processing

## Storage Layer

### Domain-Driven Design

The storage layer is organized into 17 domain modules with corresponding interfaces:

| Domain | Interface | Methods | Description |
|--------|-----------|---------|-------------|
| User | IUserStorage | 22 | User accounts, sessions, preferences |
| Inventory | IInventoryStorage | 16 | Food items, storage locations |
| Recipes | IRecipesStorage | 22 | Recipes, meal plans, favorites |
| Chat | IChatStorage | 4 | Chat messages and history |
| Notification | INotificationStorage | 19 | Push tokens, notification history |
| Analytics | IAnalyticsStorage | 24 | Events, sessions, predictions |
| Feedback | IFeedbackStorage | 18 | User feedback, donations |
| Billing | IBillingStorage | 20 | Payments, subscriptions |
| Security | ISecurityStorage | 26 | Moderation, fraud detection |
| Support | ISupportStorage | 23 | Tickets, knowledge base |
| Experiments | IExperimentsStorage | 20 | A/B tests, cohorts |
| Pricing | IPricingStorage | 18 | Price tracking, alerts |
| Content | IContentStorage | 31 | Categorization, recommendations |
| Scheduling | ISchedulingStorage | 21 | Calendar, meetings |
| System | ISystemStorage | 28 | Health, maintenance |
| Food | IFoodStorage | 18 | USDA cache, cooking terms |
| AI-ML | IAiMlStorage | 45 | AI features, voice commands |

**Total: 375 methods across 17 domains**

### Storage Facades

Three-tier facade system for organized data access:

1. **UserStorage** (`facades/UserStorage.ts`)
   - User-specific data operations
   - Inventory, recipes, preferences
   - Personal settings and history

2. **AdminStorage** (`facades/AdminStorage.ts`)
   - Administrative functions
   - User management
   - System configuration

3. **PlatformStorage** (`facades/PlatformStorage.ts`)
   - Platform-wide operations
   - Analytics, notifications
   - Cross-user features

### Error Handling

Custom storage errors (`storage/errors/`):
- `StorageError` - Base storage error class
- Consistent error propagation across domains
- Type-safe error handling

## Services (34 Services)

### AI/ML Services
- `openai-query.service.ts` - OpenAI API interactions
- `embeddings.service.ts` - Vector embeddings
- `sentiment.service.ts` - Sentiment analysis
- `summarization.service.ts` - Content summarization
- `moderation.service.ts` - Content moderation
- `excerpt.service.ts` - Excerpt generation
- `duplicate-detection.service.ts` - Duplicate content detection
- `ai-routing.service.ts` - AI request routing

### Prediction Services
- `prediction.service.ts` - ML predictions
- `lightweight-prediction.service.ts` - Fast predictions
- `trend-analyzer.service.ts` - Trend analysis
- `predictive-maintenance.service.ts` - System health prediction

### Notification Services
- `push-notification.service.ts` - Push notification delivery
- `push-notification-base.service.ts` - Base notification logic
- `push-notification-scheduler.service.ts` - Scheduled notifications
- `ml-notification-scheduler.service.ts` - ML-powered scheduling
- `fcm.service.ts` - Firebase Cloud Messaging
- `apns.service.ts` - Apple Push Notifications
- `push-status.service.ts` - Notification status tracking

### Analytics Services
- `analytics.service.ts` - Analytics processing
- `activity-logger.service.ts` - Activity logging
- `fraud.service.ts` - Fraud detection
- `retention-campaigns.service.ts` - User retention

### Content Services
- `alt-text-generator.service.ts` - Alt text generation
- `face-detection.service.ts` - Face detection
- `term-detector.service.ts` - Cooking term detection
- `cooking-terms.service.ts` - Cooking terms management

### Utility Services
- `chat.service.ts` - Chat management
- `validation.service.ts` - Data validation
- `barcode-lookup.service.ts` - Barcode scanning
- `logger.service.ts` - Application logging
- `log-retention.service.ts` - Log management

## Middleware

### Core Middleware (`middleware/`)
1. **Authentication** (`auth.middleware.ts`)
   - Route protection
   - Session validation
   - OAuth verification

2. **Error Handling** (`error.middleware.ts`)
   - Global error handler
   - Consistent error responses
   - Error logging

3. **Rate Limiting** (`rateLimit.ts`)
   - API rate limiting
   - DDoS protection
   - Per-route limits

4. **Caching** (`cache.middleware.ts`)
   - Response caching
   - Cache invalidation
   - Performance optimization

5. **Validation** (`validation.middleware.ts`)
   - Request validation
   - Zod schema validation
   - Input sanitization

6. **Activity Logging** (`activity-logging.middleware.ts`)
   - User activity tracking
   - Audit logging
   - Analytics events

## External Integrations

### API Clients (`integrations/`)
- `openai.ts` - OpenAI API client (GPT-4, embeddings)
- `usda.ts` - USDA FoodData Central API
- `openFoodFacts.ts` - Open Food Facts fallback
- `objectStorage.ts` - Google Cloud Storage

### Data Files (`data/`)
- `appliance-library-data.ts` - Kitchen appliances
- `category-mapping.ts` - Food category mappings
- `foodCategoryDefaults.ts` - Default categories
- `onboarding-items.ts` - Onboarding food items
- `onboarding-usda-mapping.ts` - USDA mappings

## Authentication

### Supported Providers
- Google OAuth 2.0
- GitHub OAuth
- Twitter/X OAuth 2.0 (PKCE)
- Apple Sign In
- Replit Auth (OIDC)
- Email/Password (bcrypt)

### Session Management
- PostgreSQL session store (`connect-pg-simple`)
- Secure cookie configuration
- 24-hour session expiry
- CORS support for cross-origin requests

### Key Files
- `auth/session-config.ts` - Session configuration
- `auth/oauth.ts` - OAuth strategy setup
- `auth/unified-auth.ts` - Authentication orchestration
- `auth/helpers.ts` - Auth utility functions

## Database

### Connection
Database configured in `db.ts` using Neon's serverless PostgreSQL:
```typescript
import { db } from './db';
```

### Migrations (`migrations/`)
- `add-performance-indexes.ts` - Performance indexes
- `migrate-categories.ts` - Category migrations
- `init-appliance-library.ts` - Appliance data

### Seeds (`seeds/`)
- `seed-db.ts` - Main seeding script
- `seed-common-food-items.ts` - Food items
- `seed-ab-tests.ts` - A/B test configuration
- `seed-cohorts.ts` - User cohorts
- `seed-templates.ts` - Templates
- `seed-validation-rules.ts` - Validation rules

## Environment Variables

### Required
```bash
DATABASE_URL=postgresql://...          # Database connection
SESSION_SECRET=your-session-secret     # Session encryption
```

### Authentication (Optional)
```bash
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
TWITTER_CLIENT_ID=...
TWITTER_CLIENT_SECRET=...
APPLE_CLIENT_ID=...
APPLE_TEAM_ID=...
APPLE_KEY_ID=...
APPLE_PRIVATE_KEY=...
```

### AI Services
```bash
OPENAI_API_KEY=...
```

### Object Storage
```bash
OBJECT_STORAGE_BUCKET=...
```

### Push Notifications
```bash
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
FCM_SERVICE_ACCOUNT=...
APNS_KEY_ID=...
APNS_TEAM_ID=...
APNS_KEY_CONTENT=...
```

## API Response Format

### Success Response
```json
{
  "success": true,
  "data": { /* response data */ }
}
```

### Paginated Response
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 100,
    "totalPages": 2
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "statusCode": 400
  }
}
```

## Development

### Commands
```bash
npm run dev          # Development with hot-reload
npm run build        # Production build
npm run start        # Start production server
npm run db:push      # Push schema changes
npm run db:generate  # Generate migrations
npm run check        # TypeScript checking
npm run lint         # ESLint
npm run lint:fix     # Auto-fix issues
npm run lint:back    # Backend-only linting
```

## Production Considerations

1. **Compression**: Gzip enabled for responses > 1KB
2. **Security**: Helmet.js for security headers
3. **Logging**: Structured logging with sensitive data sanitization
4. **Error Handling**: Global handler with proper status codes
5. **Rate Limiting**: Configurable per-endpoint limits
6. **Caching**: Response caching for performance
7. **Circuit Breaker**: Fault tolerance for external services
8. **Health Checks**: `/health` endpoint for monitoring

## Related Documentation

- `/docs/API.md` - Complete API documentation
- `/docs/AUTH_CONFIG.md` - Authentication setup
- `/docs/SETUP_GUIDE.md` - Configuration guide
- `/shared/README.md` - Schema documentation
