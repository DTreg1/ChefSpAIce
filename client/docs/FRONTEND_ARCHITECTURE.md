# Frontend Architecture

A comprehensive overview of the client-side architecture for the Recipe Platform.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND LAYER                                  │
│                         (React + TypeScript + Vite)                          │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
         ┌───────────────────────────┼───────────────────────────┐
         ▼                           ▼                           ▼
┌─────────────────────┐   ┌─────────────────────┐   ┌─────────────────────┐
│      PAGES          │   │    COMPONENTS       │   │      HOOKS          │
│   (client/src/      │   │   (client/src/      │   │   (client/src/      │
│     pages/)         │   │    components/)     │   │     hooks/)         │
│                     │   │                     │   │                     │
│ • 60+ page views    │   │ • 150+ components   │   │ • 18 custom hooks   │
│ • Route handlers    │   │ • Reusable UI       │   │ • State management  │
│ • Page layouts      │   │ • Feature modules   │   │ • Side effects      │
└─────────┬───────────┘   └─────────┬───────────┘   └─────────┬───────────┘
          │                         │                         │
          └─────────────────────────┼─────────────────────────┘
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              LIBRARY LAYER                                   │
│                         (client/src/lib/)                                    │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐  │
│  │ api-endpoints   │  │  queryClient    │  │    Utilities                │  │
│  │ (Endpoint defs) │  │  (React Query)  │  │  • cacheStorage             │  │
│  │                 │  │                 │  │  • analytics                │  │
│  │ API_ENDPOINTS   │  │ • apiRequest    │  │  • authUtils                │  │
│  │ API_BASE        │  │ • queryClient   │  │  • logger                   │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────────┘  │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │ HTTP Requests
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              API LAYER                                       │
│                        All requests use /api/v1/*                            │
│                                                                              │
│   ┌───────────────────┐  ┌───────────────────┐  ┌───────────────────────┐   │
│   │   USER DOMAIN     │  │  PLATFORM DOMAIN  │  │    ADMIN DOMAIN       │   │
│   │   /api/v1/...     │  │   /api/v1/...     │  │  /api/v1/admin/...    │   │
│   │                   │  │                   │  │                       │   │
│   │ • /inventory      │  │ • /ai/content     │  │ • /admin/users        │   │
│   │ • /recipes        │  │ • /ai/analysis    │  │ • /admin/experiments  │   │
│   │ • /meal-plans     │  │ • /ai/media       │  │ • /admin/cohorts      │   │
│   │ • /chat           │  │ • /analytics      │  │ • /admin/moderation   │   │
│   │ • /shopping-list  │  │ • /notifications  │  │ • /admin/pricing      │   │
│   │ • /appliances     │  │ • /feedback       │  │ • /admin/maintenance  │   │
│   │ • /nutrition      │  │ • /scheduling     │  │                       │   │
│   └───────────────────┘  └───────────────────┘  └───────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
                         ┌───────────────────────┐
                         │    EXPRESS SERVER     │
                         │  (Backend /api/v1/*)  │
                         └───────────────────────┘
```

---

## Directory Structure

```
client/src/
├── App.tsx                    # Main application component & routing
├── main.tsx                   # Application entry point
├── index.css                  # Global styles & Tailwind config
│
├── pages/                     # Route page components (60+ pages)
│   ├── chat.tsx               # Main chat interface
│   ├── cookbook.tsx           # Recipe collection
│   ├── meal-planner.tsx       # Meal planning
│   ├── shopping-list.tsx      # Shopping list
│   ├── settings.tsx           # User settings
│   ├── donate.tsx             # Donation page
│   └── ...                    # Additional pages
│
├── components/                # Reusable components (150+)
│   ├── ui/                    # shadcn/ui base components
│   ├── ab-testing/            # A/B testing components
│   ├── analytics/             # Analytics visualizations
│   ├── cohorts/               # Cohort management
│   ├── extraction/            # Data extraction UI
│   ├── face-detection/        # Face detection features
│   ├── images/                # Image handling
│   ├── moderation/            # Content moderation
│   ├── ocr/                   # OCR components
│   ├── predictions/           # ML prediction displays
│   ├── pricing/               # Pricing features
│   ├── scheduling/            # Scheduling UI
│   ├── sentiment/             # Sentiment analysis
│   ├── summaries/             # Content summaries
│   ├── trends/                # Trend displays
│   ├── voice/                 # Voice features
│   └── ...                    # Feature-specific components
│
├── hooks/                     # Custom React hooks (18 hooks)
│   ├── useAuth.ts             # Authentication state
│   ├── use-toast.ts           # Toast notifications
│   ├── useStorageLocations.ts # Storage location data
│   ├── use-streaming-chat.ts  # SSE chat streaming
│   ├── useNotifications.ts    # Push notifications
│   └── ...                    # Additional hooks
│
├── lib/                       # Shared utilities
│   ├── api-endpoints.ts       # ⭐ CANONICAL API ENDPOINT DEFINITIONS
│   ├── queryClient.ts         # React Query configuration
│   ├── cacheStorage.ts        # Local storage caching
│   ├── analytics.ts           # Analytics tracking
│   ├── authUtils.ts           # Auth helpers
│   └── utils.ts               # General utilities
│
├── contexts/                  # React contexts
│   └── ...                    # Context providers
│
└── utils/                     # Additional utilities
    └── ...
```

---

## API Endpoint Configuration

### The Single Source of Truth

**ALWAYS use `API_ENDPOINTS` from `@/lib/api-endpoints.ts`** for all API calls.

```typescript
import { API_ENDPOINTS, API_BASE } from "@/lib/api-endpoints";

// API_BASE = '/api/v1'
```

### Endpoint Categories

| Domain | Base Path | Description |
|--------|-----------|-------------|
| User | `/api/v1/...` | User-facing features |
| AI Content | `/api/v1/ai/content/...` | Text generation, writing, drafts |
| AI Analysis | `/api/v1/ai/analysis/...` | Sentiment, trends, predictions |
| AI Media | `/api/v1/ai/media/...` | Images, OCR, voice, faces |
| Platform | `/api/v1/...` | Analytics, notifications, feedback |
| Admin | `/api/v1/admin/...` | Administrative functions |

### Correct Usage Examples

```typescript
// ✅ CORRECT: Using API_ENDPOINTS
import { API_ENDPOINTS } from "@/lib/api-endpoints";

// Inventory
const { data } = useQuery({ queryKey: [API_ENDPOINTS.inventory.list] });

// Recipes
await apiRequest("POST", API_ENDPOINTS.recipes.generate, { ... });

// AI Content generation
await apiRequest("POST", API_ENDPOINTS.ai.content.generate, { ... });

// AI Sentiment analysis
await apiRequest("POST", API_ENDPOINTS.ai.analysis.sentiment, { ... });

// Admin users
const { data } = useQuery({ queryKey: [API_ENDPOINTS.admin.users] });

// Donations
await apiRequest("POST", `${API_BASE}/donations/create-payment-intent`, { ... });
```

```typescript
// ❌ WRONG: Hardcoded paths without versioning
queryKey: ['/api/donations/stats']     // Missing /v1/
queryKey: ['/api/sentiment/dashboard'] // Wrong path structure
queryKey: ['/api/ml/duplicates']       // Non-existent route
```

---

## Complete API Endpoint Reference

### User Domain Endpoints

| Feature | Endpoint | Method | Description |
|---------|----------|--------|-------------|
| **Inventory** | | | |
| List items | `/api/v1/inventory` | GET | Get all food items |
| Get item | `/api/v1/inventory/:id` | GET | Get single item |
| Create item | `/api/v1/inventory` | POST | Add food item |
| Update item | `/api/v1/inventory/:id` | PUT | Update item |
| Delete item | `/api/v1/inventory/:id` | DELETE | Remove item |
| Storage locations | `/api/v1/inventory/storage-locations` | GET | List storage locations |
| **Recipes** | | | |
| List recipes | `/api/v1/recipes` | GET | Get all recipes |
| Get recipe | `/api/v1/recipes/:id` | GET | Get single recipe |
| Generate recipe | `/api/v1/recipes/generate` | POST | AI recipe generation |
| **Meal Plans** | | | |
| List plans | `/api/v1/meal-plans` | GET | Get meal plans |
| Create plan | `/api/v1/meal-plans` | POST | Create meal plan |
| **Shopping List** | | | |
| Get list | `/api/v1/shopping-list` | GET | Get shopping list |
| Add item | `/api/v1/shopping-list/items` | POST | Add to list |
| **Chat** | | | |
| Send message | `/api/v1/chat` | POST | Send chat message |
| Stream | `/api/v1/chat/stream` | GET (SSE) | Streaming responses |
| History | `/api/v1/chat/messages` | GET | Get chat history |
| **Profile** | | | |
| Get profile | `/api/v1/profile` | GET | User profile |
| Update | `/api/v1/profile` | PUT | Update profile |
| Preferences | `/api/v1/profile/preferences` | GET/PUT | User preferences |

### AI Domain Endpoints

| Feature | Endpoint | Method | Description |
|---------|----------|--------|-------------|
| **Content** (`/api/v1/ai/content/`) | | | |
| Generate | `/ai/content/generate` | POST | Text generation |
| Summarize | `/ai/content/summarize` | POST | Content summarization |
| Translate | `/ai/content/translate` | POST | Translation |
| Drafts | `/ai/content/drafts/email` | POST | Email drafting |
| Writing analyze | `/ai/content/writing/analyze` | POST | Writing analysis |
| **Analysis** (`/api/v1/ai/analysis/`) | | | |
| Sentiment | `/ai/analysis/sentiment` | POST | Sentiment analysis |
| Trends | `/ai/analysis/trends/current` | GET | Current trends |
| Predictions | `/ai/analysis/predict/user/:id` | GET | User predictions |
| Insights | `/ai/analysis/insights/generate` | POST | Generate insights |
| Natural query | `/ai/analysis/query/natural` | POST | Natural language query |
| **Media** (`/api/v1/ai/media/`) | | | |
| Image enhance | `/ai/media/images/enhance` | POST | Image enhancement |
| OCR extract | `/ai/media/vision/ocr/extract` | POST | Text extraction |
| Face detect | `/ai/media/vision/faces/detect` | POST | Face detection |
| Alt text | `/ai/media/vision/alt-text` | POST | Generate alt text |
| Voice transcribe | `/ai/media/voice/transcribe` | POST | Voice transcription |

### Platform Domain Endpoints

| Feature | Endpoint | Method | Description |
|---------|----------|--------|-------------|
| **Analytics** | | | |
| Events | `/api/v1/analytics` | GET | Analytics data |
| Track | `/api/v1/analytics/events` | POST | Track event |
| **Notifications** | | | |
| List | `/api/v1/notifications` | GET | Get notifications |
| Mark read | `/api/v1/notifications/:id/read` | POST | Mark as read |
| Push tokens | `/api/v1/push-tokens` | POST | Register token |
| **Feedback** | | | |
| Submit | `/api/v1/feedback` | POST | Submit feedback |
| List | `/api/v1/feedback` | GET | Get feedback |
| **Scheduling** | | | |
| Schedules | `/api/v1/scheduling` | GET | List schedules |
| Create | `/api/v1/scheduling` | POST | Create schedule |
| **Donations** | | | |
| Create intent | `/api/v1/donations/create-payment-intent` | POST | Start donation |
| Stats | `/api/v1/donations/stats` | GET | Donation statistics |
| Recent | `/api/v1/donations/recent` | GET | Recent donations |

### Admin Domain Endpoints

| Feature | Endpoint | Method | Description |
|---------|----------|--------|-------------|
| Users | `/api/v1/admin/users` | GET | List users |
| User | `/api/v1/admin/users/:id` | GET/PUT/DELETE | Manage user |
| Experiments | `/api/v1/admin/experiments` | GET/POST | A/B tests |
| Cohorts | `/api/v1/admin/cohorts` | GET/POST | User cohorts |
| Maintenance | `/api/v1/admin/maintenance` | GET/POST | System maintenance |
| Moderation | `/api/v1/admin/moderation` | GET/POST | Content moderation |
| Pricing | `/api/v1/admin/pricing` | GET/POST | Pricing management |
| Tickets | `/api/v1/admin/tickets` | GET/POST | Support tickets |

---

## Making API Requests

### Using React Query

```typescript
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { API_ENDPOINTS } from "@/lib/api-endpoints";

// GET request with useQuery
const { data, isLoading } = useQuery({
  queryKey: [API_ENDPOINTS.inventory.list],
  // queryFn is handled by the default fetcher
});

// POST/PUT/DELETE with useMutation
const mutation = useMutation({
  mutationFn: (data) => apiRequest("POST", API_ENDPOINTS.recipes.generate, data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.recipes.list] });
  },
});
```

### Direct API Calls

```typescript
import { apiRequest } from "@/lib/queryClient";
import { API_ENDPOINTS } from "@/lib/api-endpoints";

// Simple request
const response = await apiRequest("POST", API_ENDPOINTS.ai.content.generate, {
  prompt: "Generate a recipe",
});
const data = await response.json();
```

---

## Common Anti-Patterns to Avoid

### 1. Hardcoded Unversioned Paths

```typescript
// ❌ WRONG - Missing /v1/ prefix
queryKey: ['/api/donations/stats']
await apiRequest("GET", "/api/sentiment/dashboard")

// ✅ CORRECT - Use API_ENDPOINTS or full versioned path
queryKey: [`${API_BASE}/donations/stats`]
await apiRequest("GET", API_ENDPOINTS.ai.analysis.sentiment)
```

### 2. Inconsistent Path Structures

```typescript
// ❌ WRONG - Made-up paths that don't exist
'/api/ml/categorize'           // No ML router
'/api/faces/detect'            // Should be /ai/media/vision/faces/detect
'/api/ocr/extract'             // Should be /ai/media/vision/ocr/extract

// ✅ CORRECT - Use documented paths
API_ENDPOINTS.ai.media.vision.faces.detect
API_ENDPOINTS.ai.media.vision.ocr.extract
```

### 3. Duplicate Query Keys

```typescript
// ❌ WRONG - String interpolation breaks cache invalidation
queryKey: [`/api/recipes/${id}`]

// ✅ CORRECT - Array-based keys for proper invalidation
queryKey: [API_ENDPOINTS.recipes.list, id]
queryKey: ['/api/v1/recipes', id]
```

---

## State Management

### React Query for Server State

All server data fetching uses React Query with the configured client:

```typescript
// client/src/lib/queryClient.ts
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown
): Promise<Response> {
  // Centralized request handling with auth headers
}
```

### Local State

- **Component State**: `useState` for UI state
- **Form State**: `react-hook-form` with `zod` validation
- **Global UI State**: Context providers in `contexts/`

---

## Routing

Using `wouter` for client-side routing:

```typescript
// App.tsx
import { Switch, Route } from "wouter";

<Switch>
  <Route path="/" component={Chat} />
  <Route path="/cookbook" component={Cookbook} />
  <Route path="/meal-planner" component={MealPlanner} />
  <Route path="/shopping-list" component={ShoppingList} />
  <Route path="/settings" component={Settings} />
  <Route path="/donate" component={Donate} />
  {/* ... more routes */}
  <Route component={NotFound} />
</Switch>
```

---

## Styling

### Tailwind CSS + shadcn/ui

- **Base Components**: `client/src/components/ui/`
- **Theme**: CSS variables in `index.css`
- **Dark Mode**: Class-based with ThemeProvider

```typescript
// Using shadcn components
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
```

---

## Testing

### Data Test IDs

All interactive elements include `data-testid` attributes:

```typescript
// Pattern: {action}-{target} or {type}-{content}-{id}
<Button data-testid="button-submit">Submit</Button>
<Input data-testid="input-email" />
<span data-testid={`text-price-${item.id}`}>{price}</span>
```

---

## Environment Variables

Frontend environment variables must be prefixed with `VITE_`:

```bash
VITE_STRIPE_PUBLIC_KEY=pk_test_...
VITE_APP_URL=https://...
```

Access in code:
```typescript
const stripeKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
```

---

## Related Documentation

- `/server/README.md` - Backend overview
- `/server/docs/BACKEND_ARCHITECTURE.md` - Backend architecture
- `/shared/README.md` - Shared schema documentation
- `/client/src/lib/api-endpoints.ts` - Complete API endpoint definitions
