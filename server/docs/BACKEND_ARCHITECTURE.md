# Backend Architecture

A comprehensive overview of the server-side architecture for the Recipe Platform.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                    │
│                     (React Frontend / Mobile Apps)                           │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │ HTTP/WebSocket
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           EXPRESS SERVER (index.ts)                          │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                         MIDDLEWARE PIPELINE                              ││
│  │  ┌──────────┐ ┌────────────┐ ┌─────────┐ ┌──────────┐ ┌───────────────┐ ││
│  │  │  Auth    │ │Rate Limit  │ │ RBAC    │ │ Logging  │ │Circuit Breaker│ ││
│  │  └──────────┘ └────────────┘ └─────────┘ └──────────┘ └───────────────┘ ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
                ┌────────────────────┼────────────────────┐
                ▼                    ▼                    ▼
┌───────────────────────┐ ┌───────────────────┐ ┌───────────────────────┐
│    ADMIN ROUTERS      │ │  PLATFORM ROUTERS │ │    USER ROUTERS       │
│   /api/admin/*        │ │   /api/platform/* │ │    /api/user/*        │
│                       │ │                   │ │                       │
│ • A/B Testing         │ │ • AI/ML Endpoints │ │ • Recipes             │
│ • Cohorts             │ │ • Analytics       │ │ • Inventory           │
│ • Moderation          │ │ • Notifications   │ │ • Meal Planning       │
│ • Pricing             │ │ • Scheduling      │ │ • Shopping Lists      │
│ • Ticket Routing      │ │ • Fraud Detection │ │ • Chat                │
│ • Maintenance         │ │ • Feedback        │ │ • Profile             │
└───────────┬───────────┘ └─────────┬─────────┘ └───────────┬───────────┘
            │                       │                       │
            └───────────────────────┼───────────────────────┘
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            SERVICE LAYER                                     │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                          BUSINESS LOGIC                                  ││
│  │                                                                          ││
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐  ││
│  │  │ AI/ML Services  │  │ Notification    │  │ Content Processing      │  ││
│  │  │                 │  │ Services        │  │ Services                │  ││
│  │  │ • ai-routing    │  │ • push-notif    │  │ • face-detection        │  ││
│  │  │ • embeddings    │  │ • ml-scheduler  │  │ • alt-text-generator    │  ││
│  │  │ • prediction    │  │ • apns/fcm      │  │ • duplicate-detection   │  ││
│  │  │ • sentiment     │  │                 │  │ • summarization         │  ││
│  │  │ • fraud         │  │                 │  │ • validation            │  ││
│  │  └─────────────────┘  └─────────────────┘  └─────────────────────────┘  ││
│  │                                                                          ││
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐  ││
│  │  │ Analytics       │  │ User Services   │  │ System Services         │  ││
│  │  │ Services        │  │                 │  │                         │  ││
│  │  │ • analytics     │  │ • activity-log  │  │ • log-retention         │  ││
│  │  │ • trend-analyzer│  │ • cooking-terms │  │ • predictive-maint      │  ││
│  │  │ • moderation    │  │ • barcode-lookup│  │ • openai-query          │  ││
│  │  └─────────────────┘  └─────────────────┘  └─────────────────────────┘  ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            STORAGE LAYER                                     │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                    STORAGE FACADES (Access Control)                      ││
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐  ││
│  │  │ AdminStorage    │  │ PlatformStorage │  │ UserStorage             │  ││
│  │  │ (Full Access)   │  │ (System Access) │  │ (Scoped Access)         │  ││
│  │  └────────┬────────┘  └────────┬────────┘  └────────────┬────────────┘  ││
│  └───────────┼────────────────────┼────────────────────────┼────────────────┘│
│              └────────────────────┼────────────────────────┘                 │
│                                   ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                    STORAGE ROOT (Unified Access Point)                   ││
│  │                           StorageRoot.ts                                 ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                   │                                          │
│  ┌────────────────────────────────┼────────────────────────────────────────┐│
│  │                         DOMAIN STORAGES                                  ││
│  │                                                                          ││
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐││
│  │  │ User        │ │ Recipes     │ │ Inventory   │ │ Notification        │││
│  │  │ Storage     │ │ Storage     │ │ Storage     │ │ Storage             │││
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────────────┘││
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐││
│  │  │ Analytics   │ │ AI/ML       │ │ Billing     │ │ Chat                │││
│  │  │ Storage     │ │ Storage     │ │ Storage     │ │ Storage             │││
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────────────┘││
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐││
│  │  │ Content     │ │ Experiments │ │ Feedback    │ │ Food                │││
│  │  │ Storage     │ │ Storage     │ │ Storage     │ │ Storage             │││
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────────────┘││
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐││
│  │  │ Pricing     │ │ Scheduling  │ │ Security    │ │ Support             │││
│  │  │ Storage     │ │ Storage     │ │ Storage     │ │ Storage             │││
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────────────┘││
│  │  ┌─────────────┐                                                         ││
│  │  │ System      │  Each domain storage implements a corresponding         ││
│  │  │ Storage     │  interface (e.g., IUserStorage, IRecipesStorage)        ││
│  │  └─────────────┘                                                         ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DATABASE LAYER                                     │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                        DRIZZLE ORM (db.ts)                               ││
│  │                    PostgreSQL (Neon Serverless)                          ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘

                              EXTERNAL SERVICES
                                     │
         ┌───────────────────────────┼───────────────────────────┐
         ▼                           ▼                           ▼
┌─────────────────┐       ┌─────────────────────┐      ┌─────────────────┐
│    OpenAI       │       │  Object Storage     │      │ Food APIs       │
│  (GPT/Embed)    │       │  (GCS)              │      │ • USDA          │
│                 │       │                     │      │ • OpenFoodFacts │
└─────────────────┘       └─────────────────────┘      └─────────────────┘
         │                           │                           │
         └───────────────────────────┴───────────────────────────┘
                                     │
                          ┌──────────┴──────────┐
                          ▼                     ▼
                ┌─────────────────┐   ┌─────────────────┐
                │  Push Services  │   │  Stripe         │
                │  • APNS (iOS)   │   │  (Payments)     │
                │  • FCM (Android)│   │                 │
                └─────────────────┘   └─────────────────┘
```

---

## Directory Structure

```
server/
├── index.ts                 # Express app entry point
├── db.ts                    # Drizzle ORM database connection
├── vite.ts                  # Vite development server integration
│
├── auth/                    # Authentication strategies
│   └── passport.ts          # Passport.js configuration
│
├── config/                  # Configuration files
│   ├── openai-config.ts     # OpenAI client setup
│   └── stripe-config.ts     # Stripe configuration
│
├── middleware/              # Express middleware
│   ├── auth.middleware.ts   # Authentication
│   ├── rbac.middleware.ts   # Role-based access control
│   ├── rate-limit.middleware.ts
│   ├── circuit-breaker.middleware.ts
│   ├── cache.middleware.ts
│   └── error.middleware.ts
│
├── routers/                 # API route handlers
│   ├── index.ts             # Router aggregation
│   ├── admin/               # Admin-only endpoints
│   ├── platform/            # Platform-wide features
│   │   └── ai/              # AI/ML specific endpoints
│   └── user/                # User-facing endpoints
│
├── services/                # Business logic services
│   ├── *-service.ts         # All service files
│   └── server-services-fix-guide.md
│
├── storage/                 # Data access layer
│   ├── index.ts             # Storage exports
│   ├── StorageRoot.ts       # Unified storage access
│   ├── domains/             # Domain-specific storage
│   ├── facades/             # Access-controlled wrappers
│   ├── interfaces/          # Storage contracts
│   └── errors/              # Custom error types
│
├── integrations/            # External API clients
│   ├── openai.ts
│   ├── objectStorage.ts
│   ├── usda.ts
│   └── openFoodFacts.ts
│
├── notifications/           # Push notification system
│   ├── intelligent-service.ts
│   └── channels/
│
└── utils/                   # Shared utilities
    ├── vectorMath.ts        # Vector operations (cosine similarity, etc.)
    ├── retry-handler.ts     # Generic retry with exponential backoff
    ├── ai-error-handler.ts  # AI-specific error handling
    ├── circuit-breaker.ts   # Circuit breaker pattern
    ├── cache.ts             # Caching utilities
    ├── pagination.ts        # Pagination helpers
    └── ...                  # Other utilities
```

---

## Request Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           REQUEST LIFECYCLE                               │
└──────────────────────────────────────────────────────────────────────────┘

  1. REQUEST ENTERS
         │
         ▼
  ┌──────────────┐
  │   Express    │
  │   Server     │
  └──────┬───────┘
         │
  2. MIDDLEWARE PIPELINE
         │
         ▼
  ┌──────────────────────────────────────────────────────────────────────┐
  │  Auth → Rate Limit → RBAC → Activity Log → Circuit Breaker → Cache  │
  └──────────────────────────────────────────────────────────────────────┘
         │
  3. ROUTE MATCHING
         │
         ├─────────────────────────┬─────────────────────────┐
         ▼                         ▼                         ▼
  ┌──────────────┐         ┌──────────────┐         ┌──────────────┐
  │ Admin Router │         │Platform Router│        │ User Router  │
  │ /api/admin/* │         │/api/platform/*│        │ /api/user/*  │
  └──────┬───────┘         └──────┬───────┘         └──────┬───────┘
         │                        │                        │
  4. SERVICE INVOCATION
         │                        │                        │
         └────────────────────────┼────────────────────────┘
                                  ▼
                     ┌──────────────────────┐
                     │   Service Layer      │
                     │   (Business Logic)   │
                     └──────────┬───────────┘
                                │
  5. STORAGE ACCESS
                                ▼
         ┌──────────────────────────────────────────────────┐
         │              Storage Facade                       │
         │  (AdminStorage / PlatformStorage / UserStorage)   │
         └──────────────────────────────────────────────────┘
                                │
                                ▼
         ┌──────────────────────────────────────────────────┐
         │                  StorageRoot                      │
         │          (Domain Storage Aggregation)             │
         └──────────────────────────────────────────────────┘
                                │
                                ▼
         ┌──────────────────────────────────────────────────┐
         │              Domain Storage                       │
         │     (RecipesStorage, UserStorage, etc.)           │
         └──────────────────────────────────────────────────┘
                                │
  6. DATABASE QUERY
                                ▼
         ┌──────────────────────────────────────────────────┐
         │           Drizzle ORM → PostgreSQL               │
         └──────────────────────────────────────────────────┘
                                │
  7. RESPONSE RETURNS (reverse path)
                                │
                                ▼
                        ┌──────────────┐
                        │   Response   │
                        │   to Client  │
                        └──────────────┘
```

---

## Storage Architecture Detail

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         STORAGE LAYER ARCHITECTURE                           │
└─────────────────────────────────────────────────────────────────────────────┘

                          FACADES (Access Control Layer)
     ┌──────────────────────────────────────────────────────────────────┐
     │                                                                  │
     │   AdminStorage         PlatformStorage         UserStorage       │
     │   ┌───────────┐        ┌───────────────┐      ┌─────────────┐   │
     │   │ Full DB   │        │ System-level  │      │ User-scoped │   │
     │   │ Access    │        │ Operations    │      │ Operations  │   │
     │   │           │        │               │      │ Only        │   │
     │   └─────┬─────┘        └───────┬───────┘      └──────┬──────┘   │
     │         │                      │                     │          │
     └─────────┼──────────────────────┼─────────────────────┼──────────┘
               │                      │                     │
               └──────────────────────┼─────────────────────┘
                                      ▼
                            ┌──────────────────┐
                            │   StorageRoot    │
                            │  (Aggregator)    │
                            └────────┬─────────┘
                                     │
       ┌──────────────┬──────────────┼──────────────┬──────────────┐
       ▼              ▼              ▼              ▼              ▼
┌─────────────┐┌─────────────┐┌─────────────┐┌─────────────┐┌─────────────┐
│   IUser     ││  IRecipes   ││ IInventory  ││INotification││ IAnalytics  │
│   Storage   ││  Storage    ││ Storage     ││ Storage     ││ Storage     │
├─────────────┤├─────────────┤├─────────────┤├─────────────┤├─────────────┤
│  Interface  ││  Interface  ││  Interface  ││  Interface  ││  Interface  │
└──────┬──────┘└──────┬──────┘└──────┬──────┘└──────┬──────┘└──────┬──────┘
       │              │              │              │              │
       ▼              ▼              ▼              ▼              ▼
┌─────────────┐┌─────────────┐┌─────────────┐┌─────────────┐┌─────────────┐
│   user.     ││  recipes.   ││ inventory.  ││notification.││ analytics.  │
│ storage.ts  ││ storage.ts  ││ storage.ts  ││ storage.ts  ││ storage.ts  │
├─────────────┤├─────────────┤├─────────────┤├─────────────┤├─────────────┤
│ Implementation                                                          │
└─────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
                            ┌──────────────────┐
                            │   Drizzle ORM    │
                            │   (db.ts)        │
                            └──────────────────┘


DOMAIN STORAGES (17 domains):
─────────────────────────────
• User           - User accounts, profiles, preferences
• Recipes        - Recipe CRUD, meal planning
• Inventory      - Pantry items, shopping lists
• Notification   - Push tokens, notification history
• Analytics      - Event tracking, metrics
• AI/ML          - Embeddings, predictions, ML data
• Billing        - Subscriptions, payment history
• Chat           - Conversation history
• Content        - User-generated content
• Experiments    - A/B testing, feature flags
• Feedback       - User feedback, ratings
• Food           - Nutrition data, ingredients
• Pricing        - Dynamic pricing, tiers
• Scheduling     - Scheduled tasks, jobs
• Security       - Sessions, audit logs
• Support        - Tickets, admin notes
• System         - App config, maintenance
```

---

## Service Categories

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            SERVICE LAYER BREAKDOWN                           │
└─────────────────────────────────────────────────────────────────────────────┘

AI/ML SERVICES                 NOTIFICATION SERVICES         CONTENT SERVICES
────────────────               ─────────────────────         ────────────────
ai-routing.service             push-notification.service     face-detection.service
embeddings.service             push-notification-base        alt-text-generator.service
prediction.service             ml-notification-scheduler     duplicate-detection.service
sentiment.service              push-notification-scheduler   summarization.service
fraud.service                  apns.service                  validation.service
lightweight-prediction         fcm.service                   excerpt.service
trend-analyzer.service         push-status.service           moderation.service


ANALYTICS SERVICES             USER SERVICES                 SYSTEM SERVICES
──────────────────             ─────────────                 ───────────────
analytics.service              activity-logger.service       log-retention.service
                               cooking-terms.service         predictive-maintenance
                               barcode-lookup.service        openai-query.service
                               term-detector.service         logger.service


NAMING CONVENTION: kebab-case.service.ts
─────────────────
All service files follow the pattern: {name}.service.ts
Example: ai-routing.service.ts, push-notification.service.ts
```

---

## External Integrations

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          EXTERNAL INTEGRATIONS                               │
└─────────────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────────────┐
│                              AI SERVICES                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                         OpenAI (openai.ts)                          │  │
│  │  • GPT-4o for text generation                                       │  │
│  │  • text-embedding-3-small for embeddings                            │  │
│  │  • Used by: embeddings, summarization, chat, content analysis       │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────────────┐
│                            STORAGE SERVICES                                │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                 Google Cloud Storage (objectStorage.ts)             │  │
│  │  • Recipe images                                                    │  │
│  │  • User uploads                                                     │  │
│  │  • Generated content                                                │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────────────┐
│                           NUTRITION DATA                                   │
│  ┌────────────────────────────┐  ┌────────────────────────────────────┐  │
│  │    USDA (usda.ts)         │  │  OpenFoodFacts                      │  │
│  │  • Nutrition data         │  │  (openFoodFacts.ts)                 │  │
│  │  • Ingredient lookup      │  │  • Barcode lookup                   │  │
│  │  • Primary source         │  │  • Product information              │  │
│  └────────────────────────────┘  └────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │              Fallback Nutrition (fallbackNutrition.ts)              │  │
│  │  • Backup estimates when API calls fail                             │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────────────┐
│                         PUSH NOTIFICATIONS                                 │
│  ┌────────────────────────────┐  ┌────────────────────────────────────┐  │
│  │  Apple Push Notification   │  │  Firebase Cloud Messaging         │  │
│  │  Service (apns.service.ts) │  │  (fcm.service.ts)                  │  │
│  │  • iOS devices             │  │  • Android devices                 │  │
│  └────────────────────────────┘  └────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────────────┐
│                              PAYMENTS                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                    Stripe (config/stripe-config.ts)                 │  │
│  │  • Subscription management                                          │  │
│  │  • Payment processing                                               │  │
│  │  • Webhook handling                                                 │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## Middleware Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          MIDDLEWARE PIPELINE                                 │
└─────────────────────────────────────────────────────────────────────────────┘

     REQUEST
        │
        ▼
┌───────────────────┐
│ auth.middleware   │  Session validation, JWT verification
│                   │  Attaches user to request
└─────────┬─────────┘
          ▼
┌───────────────────┐
│ rate-limit        │  API rate limiting per user/IP
│ middleware        │  Configurable limits per endpoint
└─────────┬─────────┘
          ▼
┌───────────────────┐
│ rbac.middleware   │  Role-based access control
│                   │  Checks user permissions
└─────────┬─────────┘
          ▼
┌───────────────────┐
│ activity-logging  │  Logs user activity
│ middleware        │  For analytics and audit
└─────────┬─────────┘
          ▼
┌───────────────────┐
│ circuit-breaker   │  Prevents cascade failures
│ middleware        │  For external service calls
└─────────┬─────────┘
          ▼
┌───────────────────┐
│ cache.middleware  │  Response caching
│                   │  ETag support
└─────────┬─────────┘
          ▼
┌───────────────────┐
│ validation        │  Request body validation
│ middleware        │  Using Zod schemas
└─────────┬─────────┘
          ▼
      ROUTER
```

---

## Shared Utilities

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            SHARED UTILITIES                                   │
│                              server/utils/                                    │
└─────────────────────────────────────────────────────────────────────────────┘

VECTOR MATH (vectorMath.ts)
───────────────────────────
Centralized vector operations for embedding-based features:
• cosineSimilarity()    - Similarity between vectors (-1 to 1)
• dotProduct()          - Dot product of two vectors
• euclideanNorm()       - Vector magnitude (L2 norm)
• normalizeVector()     - Normalize to unit length
• euclideanDistance()   - Distance between vectors
• addVectors()          - Element-wise addition
• subtractVectors()     - Element-wise subtraction
• scaleVector()         - Scalar multiplication
• meanVector()          - Average of multiple vectors

Used by: embeddings.service.ts, duplicate-detection.service.ts


RETRY HANDLING (retry-handler.ts)
─────────────────────────────────
Generic retry mechanism with exponential backoff:
• retryWithBackoff()    - Retry async operations with backoff
• calculateRetryDelay() - Compute delay with jitter
• isRetryableError()    - Check if error is retryable
• createRetryWrapper()  - Create preconfigured retry function
• RetryTracker class    - Track retry attempts/failures

Configuration: maxRetries, initialDelay, maxDelay, backoffMultiplier, jitter


AI ERROR HANDLING (ai-error-handler.ts)
───────────────────────────────────────
OpenAI-specific error handling layer (wraps retry-handler):
• AIError class         - Structured error with code/status/retry info
• handleOpenAIError()   - Convert errors to AIError
• retryWithBackoff()    - AI-aware retry with error conversion
• formatErrorForLogging() - Structured error logging
• createErrorResponse() - User-friendly error responses

Error Codes: RATE_LIMIT, AUTH_ERROR, SERVER_ERROR, CONTENT_POLICY,
             TIMEOUT, NETWORK_ERROR, CONTEXT_LENGTH_EXCEEDED


CIRCUIT BREAKER (circuit-breaker.ts)
────────────────────────────────────
Prevent cascade failures for external services:
• CircuitBreaker class  - State machine (CLOSED → OPEN → HALF_OPEN)
• Configurable thresholds and timeouts
• Auto-recovery with half-open testing


CACHING (cache.ts)
──────────────────
In-memory caching utilities:
• LRU cache implementation
• TTL-based expiration
• Cache key generators


OTHER UTILITIES
───────────────
• pagination.ts         - Pagination helpers (offset/limit, cursors)
• dateRangeFilter.ts    - Date range query helpers
• unitConverter.ts      - Unit conversion (cooking measurements)
• nutritionCalculator.ts - Nutrition calculations
• batchQueries.ts       - Batch database operations
• apiError.ts           - API error classes


UTILITY DESIGN PRINCIPLES
─────────────────────────
1. Single Responsibility: Each utility handles one concern
2. Zero Side Effects: Pure functions where possible
3. Type Safety: Full TypeScript types for all parameters
4. Layered Abstractions: ai-error-handler wraps retry-handler
5. Backward Compatibility: Re-exports for existing imports
```

---

## Data Model Summary

The schema is defined in `shared/schema.ts` and includes:

**Core Entities:**
- `users` - User accounts with OAuth support
- `userRecipes` - Recipe storage with AI-generated metadata
- `userInventory` - Pantry tracking
- `shoppingLists` / `shoppingListItems` - Shopping management
- `mealPlans` - Meal planning calendar

**AI/ML Entities:**
- `contentEmbeddings` - Vector embeddings for search
- `userChats` - AI conversation history
- `userChatSummaries` - Summarized chat context

**Platform Entities:**
- `pushTokens` - Device push notification tokens
- `notificationHistory` - Sent notification log
- `activityLogs` - User activity tracking
- `analyticsEvents` - Analytics data
- `abTests` / `abTestVariants` - A/B testing

**Billing Entities:**
- `subscriptions` - User subscriptions
- `paymentHistory` - Transaction records
- `pricingTiers` - Available plans

---

## Key Design Decisions

1. **Storage Facades**: Provide access control at the storage layer, preventing unauthorized data access.

2. **Domain Separation**: Each domain (recipes, inventory, etc.) has its own storage implementation with a matching interface.

3. **Service Layer**: Business logic is isolated in services, keeping routers thin.

4. **Kebab-case Naming**: All services follow `name.service.ts` convention for consistency.

5. **Drizzle ORM**: Type-safe database queries with PostgreSQL.

6. **Middleware Chain**: Security and cross-cutting concerns handled before route logic.

---

## Sprint Progress

### Sprint 1 (Conservative) - Complete
- Removed dead code and unused files
- Standardized service naming (kebab-case)
- Created initial architecture documentation

### Sprint 2 (Moderate) - Complete
- Wired `barcode-lookup.service.ts` into `inventory.router.ts` (removed ~50 lines inline code)
- Refactored `chat.service.ts` with proper storage integration:
  - `buildChatContext()` - Builds context with inventory and history
  - `createChatStream()` - Returns async iterable for SSE streaming
  - `saveUserMessage()` / `saveAssistantMessage()` - Persistence layer
  - `detectCookingTerms()` - Term detection integration
  - `sendMessage()` - High-level non-streaming chat exchange
- Updated `chat.router.ts` to use `chatService` for business logic (SSE presentation only in router)
- Fixed `getChatMessages` signature in `StorageRoot.ts` to accept optional limit parameter
- Marked `ml.service.ts` and `retention-campaigns.service.ts` as @experimental (require storage layer work)

### Sprint 3 (Aggressive) - In Progress
- Implement missing storage methods for ml.service.ts
- Activate retention-campaigns.service.ts with proper email provider
- Full router consolidation with service layer

### Sprint 4 (Utilities Consolidation) - Complete
- Created `server/utils/vectorMath.ts` with shared vector operations
- Consolidated `cosineSimilarity` function used by multiple services
- Updated `embeddings.service.ts` to use shared vectorMath utility
- Updated `duplicate-detection.service.ts` to use:
  - Centralized OpenAI client from `server/integrations/openai.ts`
  - Shared `cosineSimilarity` from `vectorMath.ts`
- Documented layered utility pattern (ai-error-handler → retry-handler)

### Service Layer Pattern
```
Routers (thin)          →  Services (business logic)  →  Storage (data)
- HTTP/SSE handling        - Context building             - CRUD operations
- Request validation       - OpenAI integration           - Query execution
- Response formatting      - Term detection               - Data persistence
                           - API orchestration
```

### Experimental Services (Deferred)
The following services are marked `@experimental` and NOT operational:
- `ml.service.ts` - Requires vector DB and embeddings storage
- `retention-campaigns.service.ts` - Requires analytics storage and email provider

---

*Last updated: November 2025*
*Sprint 4 (Utilities Consolidation) Complete*
