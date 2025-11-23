# Router Architecture Refactoring Guide

## Current State Overview

ChefSpAIce currently has **49 router files** in a flat directory structure with several organizational issues:
- All routers in a single `server/routers/` directory
- 12+ separate AI/ML router files with overlapping concerns
- Duplicate functionality (e.g., `inventory.router.ts` vs `unified-inventory.router.ts`)
- Inconsistent API endpoint patterns
- Middleware defined inside router files

## Target Architecture

```
server/routers/
├── user/                 # User-facing features
│   ├── inventory.router.ts
│   ├── recipes.router.ts  
│   ├── meal-planning.router.ts
│   ├── chat.router.ts
│   ├── profile.router.ts
│   └── shopping.router.ts
├── admin/                # Administrative endpoints
│   ├── dashboard.router.ts
│   ├── users.router.ts
│   ├── moderation.router.ts
│   ├── experiments.router.ts
│   └── billing.router.ts
├── ai/                   # Consolidated AI/ML services
│   ├── generation.router.ts
│   ├── analysis.router.ts
│   ├── vision.router.ts
│   └── voice.router.ts
├── platform/             # System-wide features
│   ├── analytics.router.ts
│   ├── notifications.router.ts
│   ├── health.router.ts
│   └── batch.router.ts
└── index.ts             # Main router composition
```

## Refactoring Tasks

### Task 1: Reorganize Routers into Domain-Based Structure
### Task 2: Consolidate AI/ML Routers
### Task 3: Standardize API Endpoints

---

## Implementation Prompts

Copy these prompts into a new chat session to perform the refactoring:

---

### Prompt 1: Analyze Current Router Structure

```markdown
I need to refactor the ChefSpAIce router architecture. The application currently has 49 router files in a flat directory structure.

Please:
1. List all router files in server/routers/
2. Categorize them into logical groups (user, admin, ai, platform)
3. Identify duplicate or overlapping functionality
4. Find all AI/ML related routers that could be consolidated
5. Check for inconsistent API endpoint patterns

Current issues:
- All routers in one flat directory
- 12+ separate AI router files
- Duplicate inventory routers
- Inconsistent endpoint naming

Create a migration plan to reorganize into:
- user/ (user-facing features)
- admin/ (administrative endpoints)
- ai/ (consolidated AI/ML services)
- platform/ (system-wide features)
```

---

### Prompt 2: Create Directory Structure and Move Routers

```markdown
Create the new router directory structure and reorganize existing routers:

1. **Create new directories**:
   - server/routers/user/
   - server/routers/admin/
   - server/routers/ai/
   - server/routers/platform/

2. **Move routers to appropriate directories**:

**User routers** → server/routers/user/:
- inventory.router.ts
- recipes.router.ts
- meal-planning.router.ts
- shopping-list.router.ts
- chat.router.ts
- profile.router.ts
- preferences.router.ts
- autosave.router.ts

**Admin routers** → server/routers/admin/:
- admin.router.ts
- ab-testing.router.ts
- moderation.router.ts
- ticket.router.ts
- pricing.router.ts
- billing.router.ts

**Platform routers** → server/routers/platform/:
- analytics.router.ts
- activity-logs.router.ts
- notifications.router.ts
- health.router.ts
- batch.router.ts
- feedback.router.ts

**AI routers** (keep in main directory for now, will consolidate next):
- All AI/ML related routers

3. **Update imports in server/index.ts** to reflect new paths
4. **Verify application still runs** after moving files
```

---

### Prompt 3: Consolidate AI/ML Routers

```markdown
Consolidate the 12+ AI/ML router files into 4 organized routers:

**Current AI/ML routers to consolidate**:
- mlRouter.ts
- ai-assistant.router.ts
- writing.router.ts
- sentiment.router.ts
- trends.router.ts
- predictions.router.ts
- extraction.router.ts
- alt-text.router.ts
- translation.router.ts
- face-detection.router.ts
- ocr.router.ts
- transcriptions.router.ts
- summarization.router.ts
- voice.router.ts

**Create 4 new consolidated routers**:

1. **server/routers/ai/generation.router.ts**:
   - Recipe generation (from ai-assistant.router.ts)
   - Writing assistance (from writing.router.ts)
   - Translation (from translation.router.ts)
   - Summarization (from summarization.router.ts)
   - Base path: `/api/ai/generation`

2. **server/routers/ai/analysis.router.ts**:
   - Sentiment analysis (from sentiment.router.ts)
   - Trend detection (from trends.router.ts)
   - Predictions (from predictions.router.ts)
   - Data extraction (from extraction.router.ts)
   - Base path: `/api/ai/analysis`

3. **server/routers/ai/vision.router.ts**:
   - OCR (from ocr.router.ts)
   - Face detection (from face-detection.router.ts)
   - Alt text generation (from alt-text.router.ts)
   - Image analysis (from mlRouter.ts)
   - Base path: `/api/ai/vision`

4. **server/routers/ai/voice.router.ts**:
   - Transcription (from transcriptions.router.ts)
   - Voice commands (from voice.router.ts)
   - Base path: `/api/ai/voice`

Requirements:
- Preserve all existing functionality
- Use consistent error handling
- Share OpenAI client instance
- Maintain rate limiting
- Update all frontend API calls
```

---

### Prompt 4: Remove Duplicate Routers

```markdown
Handle duplicate router functionality:

1. **Analyze duplicate routers**:
   - Compare inventory.router.ts vs unified-inventory.router.ts
   - Identify which one has more complete functionality
   - Check which endpoints are actually being used by the frontend

2. **Merge into single router**:
   - Keep the better implementation (likely unified-inventory.router.ts)
   - Migrate any unique endpoints from the other
   - Rename to inventory.router.ts for clarity
   - Place in server/routers/user/

3. **Update all references**:
   - Update imports in server/index.ts
   - Search for all API calls to old endpoints
   - Update frontend to use consolidated endpoints

4. **Remove deprecated router**:
   - Delete the old duplicate router file
   - Verify no broken imports remain
```

---

### Prompt 5: Standardize API Endpoints (Part 1 - Planning)

```markdown
Standardize all API endpoints to follow RESTful conventions:

**Current Issues**:
- Some endpoints use /api prefix, others don't
- Inconsistent resource naming (singular vs plural)
- Mixed query parameters and path parameters
- Non-RESTful verb usage in URLs

**Create standardization plan**:

1. List all current endpoints grouped by router
2. Identify non-standard patterns
3. Propose RESTful replacements following these rules:
   - All endpoints start with /api/v1
   - Use plural nouns for resources
   - Follow REST conventions:
     * GET /api/v1/resources - List all
     * GET /api/v1/resources/:id - Get one
     * POST /api/v1/resources - Create
     * PUT /api/v1/resources/:id - Update
     * DELETE /api/v1/resources/:id - Delete
   - Use query params for filtering/pagination
   - Nested resources: /api/v1/users/:userId/recipes

4. Create migration mapping:
   OLD: /inventory?type=items
   NEW: /api/v1/inventory/items

   OLD: /recipe/generate
   NEW: /api/v1/ai/recipes/generate
```

---

### Prompt 6: Standardize API Endpoints (Part 2 - Implementation)

```markdown
Implement the API standardization plan:

1. **Update router base paths**:
   ```typescript
   // User routers
   app.use('/api/v1/inventory', inventoryRouter);
   app.use('/api/v1/recipes', recipesRouter);
   app.use('/api/v1/meal-plans', mealPlanningRouter);
   app.use('/api/v1/shopping', shoppingRouter);
   
   // Admin routers
   app.use('/api/v1/admin/users', adminUsersRouter);
   app.use('/api/v1/admin/experiments', experimentsRouter);
   
   // AI routers
   app.use('/api/v1/ai/generation', aiGenerationRouter);
   app.use('/api/v1/ai/analysis', aiAnalysisRouter);
   
   // Platform routers
   app.use('/api/v1/analytics', analyticsRouter);
   app.use('/api/v1/notifications', notificationsRouter);
   ```

2. **Update individual route paths** within each router to remove redundant prefixes

3. **Create API version handler** for backward compatibility:
   ```typescript
   // Redirect old endpoints to new ones
   app.use('/inventory', (req, res) => {
     res.redirect(301, `/api/v1/inventory${req.url}`);
   });
   ```

4. **Update all frontend API calls** to use new endpoints
```

---

### Prompt 7: Create Centralized Router Index

```markdown
Create a centralized router index file for better organization:

1. **Create server/routers/index.ts**:
   ```typescript
   import { Application } from 'express';
   
   // User routers
   import inventoryRouter from './user/inventory.router';
   import recipesRouter from './user/recipes.router';
   // ... import all routers
   
   export function setupRouters(app: Application) {
     // API versioning
     const API_PREFIX = '/api/v1';
     
     // User endpoints
     app.use(`${API_PREFIX}/inventory`, inventoryRouter);
     app.use(`${API_PREFIX}/recipes`, recipesRouter);
     
     // Admin endpoints
     app.use(`${API_PREFIX}/admin`, adminRouter);
     
     // AI endpoints
     app.use(`${API_PREFIX}/ai`, aiRouter);
     
     // Platform endpoints
     app.use(`${API_PREFIX}/platform`, platformRouter);
     
     // Health check (no auth required)
     app.use('/health', healthRouter);
   }
   ```

2. **Update server/index.ts** to use the centralized setup:
   ```typescript
   import { setupRouters } from './routers';
   
   // Replace individual router imports with:
   setupRouters(app);
   ```

3. **Add route documentation** at the top of index.ts listing all available endpoints
```

---

### Prompt 8: Extract and Centralize Middleware

```markdown
Extract custom middleware from router files and centralize them:

1. **Identify custom middleware** defined inside routers:
   - isAdmin (in admin.router.ts)
   - isModerator (in moderation.router.ts)
   - validateApiKey (in various routers)
   - rateLimiters (scattered across AI routers)
   - Circuit breakers (in multiple files)

2. **Create middleware files**:
   - server/middleware/auth.middleware.ts (already exists, extend it)
   - server/middleware/rbac.middleware.ts (role-based access control)
   - server/middleware/rate-limit.middleware.ts
   - server/middleware/circuit-breaker.middleware.ts

3. **Move middleware definitions**:
   ```typescript
   // server/middleware/rbac.middleware.ts
   export const isAdmin = async (req, res, next) => { ... };
   export const isModerator = async (req, res, next) => { ... };
   export const hasRole = (role: string) => async (req, res, next) => { ... };
   ```

4. **Update router imports**:
   ```typescript
   import { isAdmin, isModerator } from '../middleware/rbac.middleware';
   import { aiRateLimiter } from '../middleware/rate-limit.middleware';
   ```

5. **Standardize error responses** across all middleware
```

---

### Prompt 9: Update Frontend API Client

```markdown
Update the frontend to use the new standardized API endpoints:

1. **Find all API calls** in the frontend:
   - Search for fetch() calls
   - Search for apiRequest() calls
   - Search for queryKey definitions in React Query

2. **Create API constants file** (client/src/lib/api-endpoints.ts):
   ```typescript
   export const API_BASE = '/api/v1';
   
   export const API_ENDPOINTS = {
     // User endpoints
     inventory: {
       list: `${API_BASE}/inventory`,
       item: (id: string) => `${API_BASE}/inventory/${id}`,
     },
     recipes: {
       list: `${API_BASE}/recipes`,
       item: (id: string) => `${API_BASE}/recipes/${id}`,
       generate: `${API_BASE}/ai/generation/recipe`,
     },
     // ... etc
   };
   ```

3. **Update all API calls** to use the constants:
   ```typescript
   // Before:
   queryKey: ['/inventory']
   
   // After:
   queryKey: [API_ENDPOINTS.inventory.list]
   ```

4. **Test all frontend features** to ensure they still work with new endpoints
```

---

### Prompt 10: Final Testing and Cleanup

```markdown
Complete the router refactoring with thorough testing:

1. **Test all endpoints**:
   - Create a test script that hits every endpoint
   - Verify authentication still works
   - Check that all AI features function
   - Test admin endpoints with admin user

2. **Remove old files**:
   - Delete all old individual AI router files after consolidation
   - Remove duplicate routers
   - Clean up any unused imports

3. **Update documentation**:
   - Create API.md documenting all endpoints
   - Update README with new router structure
   - Add JSDoc comments to consolidated routers

4. **Performance check**:
   - Verify no performance degradation
   - Check that rate limiting still works
   - Ensure circuit breakers are functioning

5. **Final verification**:
   - Run TypeScript compilation: npx tsc --noEmit
   - Start the application
   - Test critical user flows
   - Check error handling

Fix any issues found and ensure the application is fully functional.
```

---

## Implementation Checklist

Track your progress with this checklist:

### Phase 1: Organization
- [ ] Analyze current router structure
- [ ] Create new directory structure (user/, admin/, ai/, platform/)
- [ ] Move existing routers to appropriate directories
- [ ] Update imports in server/index.ts
- [ ] Verify application still runs

### Phase 2: Consolidation
- [ ] Identify all AI/ML routers to consolidate
- [ ] Create 4 new consolidated AI routers
- [ ] Migrate endpoints from old AI routers
- [ ] Update frontend API calls for AI endpoints
- [ ] Remove old AI router files
- [ ] Merge duplicate inventory routers
- [ ] Remove deprecated router files

### Phase 3: Standardization
- [ ] Create API standardization plan
- [ ] Implement /api/v1 prefix for all endpoints
- [ ] Update router mount paths in server
- [ ] Standardize RESTful endpoints
- [ ] Add backward compatibility redirects
- [ ] Update all frontend API calls
- [ ] Create API constants file in frontend

### Phase 4: Cleanup
- [ ] Extract custom middleware to central location
- [ ] Create centralized router index
- [ ] Standardize error responses
- [ ] Add comprehensive API documentation
- [ ] Test all endpoints thoroughly
- [ ] Remove old/unused code
- [ ] Fix TypeScript errors
- [ ] Performance testing

## Benefits of Router Refactoring

1. **Better Organization**: Clear separation of concerns with domain-based structure
2. **Reduced Complexity**: 12+ AI routers → 4 consolidated routers
3. **Consistent API**: Standardized RESTful endpoints with versioning
4. **Maintainability**: Easier to find and modify related endpoints
5. **Scalability**: Clean structure for adding new features
6. **Developer Experience**: Better IntelliSense and code navigation
7. **API Versioning**: Built-in support for API evolution
8. **Centralized Middleware**: Reusable auth, rate limiting, and error handling

## Migration Strategy

1. **Phase 1**: Reorganize without changing functionality (low risk)
2. **Phase 2**: Consolidate related routers (medium risk)
3. **Phase 3**: Standardize endpoints with backward compatibility (medium risk)
4. **Phase 4**: Cleanup and optimization (low risk)

Each phase can be completed independently and tested before moving to the next.

## Router Mapping Reference

### AI Router Consolidation Map

| Old Router | New Router | New Path |
|------------|------------|----------|
| ai-assistant.router.ts | generation.router.ts | /api/v1/ai/generation/recipe |
| writing.router.ts | generation.router.ts | /api/v1/ai/generation/writing |
| translation.router.ts | generation.router.ts | /api/v1/ai/generation/translate |
| summarization.router.ts | generation.router.ts | /api/v1/ai/generation/summarize |
| sentiment.router.ts | analysis.router.ts | /api/v1/ai/analysis/sentiment |
| trends.router.ts | analysis.router.ts | /api/v1/ai/analysis/trends |
| predictions.router.ts | analysis.router.ts | /api/v1/ai/analysis/predictions |
| extraction.router.ts | analysis.router.ts | /api/v1/ai/analysis/extract |
| ocr.router.ts | vision.router.ts | /api/v1/ai/vision/ocr |
| face-detection.router.ts | vision.router.ts | /api/v1/ai/vision/faces |
| alt-text.router.ts | vision.router.ts | /api/v1/ai/vision/alt-text |
| transcriptions.router.ts | voice.router.ts | /api/v1/ai/voice/transcribe |
| voice.router.ts | voice.router.ts | /api/v1/ai/voice/command |

### Endpoint Standardization Examples

| Old Endpoint | New Endpoint |
|--------------|--------------|
| GET /inventory | GET /api/v1/inventory |
| GET /inventory?type=shopping-list | GET /api/v1/shopping/items |
| POST /recipe/generate | POST /api/v1/ai/generation/recipe |
| GET /user/profile | GET /api/v1/users/profile |
| POST /admin/users/ban | PUT /api/v1/admin/users/:id/ban |
| GET /analytics/events | GET /api/v1/analytics/events |

## Notes

- Start with Phase 1 (reorganization) as it's lowest risk
- Test thoroughly after each phase
- Keep backward compatibility during migration
- Use git commits after each successful phase
- Consider feature flags for gradual rollout
- Monitor error rates during migration