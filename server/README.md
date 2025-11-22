# Server Documentation

## Overview

This is the Express.js backend server for the application, providing RESTful APIs, authentication, database management, and various services for the frontend application.

## Architecture

The server follows a modular architecture with clear separation of concerns:

```
server/
├── auth/               # Authentication & OAuth configuration
├── config/             # Configuration files
├── data/               # Static data & configuration files
├── integrations/       # External service integrations (APIs)
├── middleware/         # Express middleware
├── migrations/         # Database migrations & schema updates
├── notifications/      # Push notification system
├── routers/            # API route handlers
├── seeds/              # Database seed scripts
├── services/           # Business logic services
├── storage/            # Database storage layer
├── types/              # TypeScript type definitions
├── utils/              # Utility functions & helpers
├── db.ts               # Database connection
├── index.ts            # Main server entry point
├── suppress-logs.ts    # TensorFlow log suppression
└── vite.ts             # Vite server configuration
```

## Directory Structure Details

### Core Files (Server Root)
- `index.ts` - Application entry point, middleware setup, route registration
- `db.ts` - Database connection using Neon's serverless PostgreSQL
- `vite.ts` - Vite server configuration for frontend asset serving
- `suppress-logs.ts` - TensorFlow log suppression (must load first)

### Data Directory (`data/`)
Static configuration and mapping data:
- `appliance-library-data.ts` - Comprehensive appliance data
- `category-mapping.ts` - Food category normalization mappings
- `foodCategoryDefaults.ts` - Default values for food categories
- `onboarding-items.ts` - Initial onboarding food items
- `onboarding-usda-mapping.ts` - USDA database mappings

### Integrations Directory (`integrations/`)
External API integrations:
- `openai.ts` - OpenAI API client configuration
- `usda.ts` - USDA FoodData Central API integration
- `openFoodFacts.ts` - OpenFoodFacts API fallback
- `objectStorage.ts` - Google Cloud Storage integration

### Seeds Directory (`seeds/`)
Database seeding scripts:
- `seed-db.ts` - Main database seeding script
- `seed-common-food-items.ts` - Common food items seeder
- `seed-ab-tests.ts` - A/B testing configuration
- `seed-cohorts.ts` - User cohort definitions
- `seed-templates.ts` - Template data seeding
- `seed-validation-rules.ts` - Validation rule definitions

### Migrations Directory (`migrations/`)
Database schema migrations and updates:
- `add-performance-indexes.ts` - Performance optimization indexes
- `migrate-categories.ts` - Category migration scripts
- `update-categories.ts` - Category update utilities
- `init-appliance-library.ts` - Appliance library initialization

## Key Technologies

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL (via Neon)
- **ORM**: Drizzle ORM
- **Authentication**: Passport.js with multiple OAuth providers
- **Session Management**: express-session with PostgreSQL store
- **Real-time**: WebSockets for chat functionality
- **AI Integration**: OpenAI API for various AI features
- **Object Storage**: Google Cloud Storage
- **Push Notifications**: Web Push & Apple Push Notifications

## Database

### Configuration

The database is configured in `db.ts` using Neon's serverless PostgreSQL:

```typescript
// Database connection is established via DATABASE_URL environment variable
import { db } from './db';
```

### Storage Layer

The storage layer follows a domain-driven design pattern:

- **Interfaces** (`storage/interfaces/`): Define contracts for storage operations
- **Implementations** (`storage/domains/`): Concrete implementations for each domain
- **Composition** (`storage/utils/compose-storage.ts`): Combines all storage domains

Key storage domains:
- `user-auth`: User authentication and profiles
- `recipes`: Recipe management
- `inventory`: Inventory tracking
- `chat`: Chat messages and conversations
- `analytics`: User analytics and metrics
- `billing`: Subscription and payment handling
- `ai-ml`: AI/ML model interactions
- `notifications`: Push notification management

## API Routes

The server uses a modular routing system (`routers/index.ts`) with domain-specific routers:

### Core Routes
- `/api/auth/*` - Authentication endpoints
- `/api/recipes/*` - Recipe management
- `/api/inventory/*` - Inventory operations
- `/api/chat/*` - Chat functionality
- `/api/notifications/*` - Push notifications
- `/api/analytics/*` - Analytics tracking

### AI/ML Routes
- `/api/ai-assistant/*` - AI assistant interactions
- `/api/predictions/*` - ML predictions
- `/api/extraction/*` - Text/data extraction
- `/api/summarization/*` - Content summarization
- `/api/sentiment/*` - Sentiment analysis
- `/api/ocr/*` - Optical character recognition
- `/api/face-detection/*` - Face detection in images

### Utility Routes
- `/api/autocomplete/*` - Search autocomplete
- `/api/nutrition/*` - Nutrition calculations
- `/api/pricing/*` - Price tracking
- `/api/scheduling/*` - Meal scheduling
- `/api/feedback/*` - User feedback

## Authentication

### Session Management

Sessions are configured in `auth/session-config.ts`:
- PostgreSQL session store via `connect-pg-simple`
- Secure cookie configuration
- CORS support for cross-origin requests

### OAuth Providers

The server supports multiple OAuth providers (`auth/oauth.ts`):
- Google OAuth 2.0
- GitHub
- Twitter
- Apple Sign In
- Replit Authentication

### Middleware

Authentication middleware (`middleware/auth.middleware.ts`) protects routes:
```typescript
// Routes are protected by requireAuth middleware
router.get('/protected', requireAuth, handler);
```

## Middleware Stack

Key middleware components (`middleware/`):

1. **Error Handling** (`error.middleware.ts`)
   - Global error handler
   - API error responses
   - Error logging

2. **Rate Limiting** (`rateLimit.ts`)
   - API rate limiting
   - DDoS protection

3. **Caching** (`cache.middleware.ts`)
   - Response caching
   - Cache invalidation

4. **Validation** (`validation.middleware.ts`)
   - Request validation
   - Schema validation with Zod

5. **Activity Logging** (`activity-logging.middleware.ts`)
   - User activity tracking
   - Audit logging

## Services

Business logic services (`services/`):

- **Activity Logger**: Tracks user activities
- **Push Status**: Manages push notification status
- **Notification Scheduler**: Schedules push notifications
- **Term Detector**: Detects cooking terms and entities
- **Log Retention**: Manages log file retention

## Utilities

Helper functions (`utils/`):

- **API Cache Service**: Caching for external API calls
- **Circuit Breaker**: Fault tolerance for external services
- **Retry Handler**: Automatic retry logic
- **Batch Queries**: Efficient batch database operations
- **Nutrition Calculator**: Calculate nutritional values
- **Unit Converter**: Convert between measurement units
- **USDA Cache**: Cache for USDA food database queries

## Environment Variables

Required environment variables:

```bash
# Database
DATABASE_URL=postgresql://...

# Authentication
SESSION_SECRET=your-session-secret

# OAuth Providers (optional)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
TWITTER_CLIENT_ID=...
TWITTER_CLIENT_SECRET=...
APPLE_CLIENT_ID=...
APPLE_SERVICE_ID=...
APPLE_TEAM_ID=...
APPLE_KEY_ID=...
APPLE_PRIVATE_KEY=...

# AI Services
OPENAI_API_KEY=...

# Object Storage
OBJECT_STORAGE_BUCKET=...

# Push Notifications
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
APPLE_PUSH_KEY_ID=...
APPLE_PUSH_TEAM_ID=...
```

## Development

### Starting the Server

```bash
# Development mode with hot-reload
npm run dev

# Production mode
npm run build
npm run start
```

### Database Operations

```bash
# Push schema changes to database
npm run db:push

# Generate migration files
npm run db:generate
```

### Code Quality

```bash
# Type checking
npm run check

# Linting
npm run lint
npm run lint:fix

# Backend-only linting
npm run lint:back
```

## Production Considerations

1. **Compression**: Gzip compression enabled for responses > 1KB
2. **Security**: Helmet.js for security headers (when configured)
3. **Logging**: Structured logging with sanitization of sensitive data
4. **Error Handling**: Global error handler with proper status codes
5. **Rate Limiting**: Configurable rate limits per endpoint
6. **Caching**: Response caching for improved performance
7. **Circuit Breaker**: Fault tolerance for external service dependencies

## API Response Format

Standard API response structure:

```typescript
// Success Response
{
  "success": true,
  "data": { /* response data */ }
}

// Error Response
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "statusCode": 400
  }
}
```

## Testing

The server includes comprehensive error handling and validation:
- Request validation with Zod schemas
- Type-safe storage operations
- Automated retry logic for transient failures
- Circuit breaker pattern for external services

## Monitoring

The server includes built-in monitoring:
- Request/response logging
- Performance metrics
- Error tracking
- Activity logging for audit trails

## Deployment

The server is configured for deployment with:
- Vite integration for serving frontend assets
- Production-ready build configuration
- Environment-based configuration
- Health check endpoints