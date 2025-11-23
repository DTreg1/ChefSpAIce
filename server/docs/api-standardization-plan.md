# API Standardization Plan

## 1. Current API Endpoints Analysis

### User Routes

#### Inventory Router (`/api/v1/inventories`, `/api/v1/food-items`, etc.)
- `GET /api/v1/inventories` - List inventories
- `GET /api/v1/inventories/:id` - Get inventory by ID
- `GET /api/v1/storage-locations` - List storage locations
- `DELETE /api/v1/food-items/:id` - Delete food item
- `GET /api/v1/food-categories` - List food categories
- `GET /api/v1/fdc/search` - Search FDC database
- `GET /api/v1/fdc/food/:fdcId` - Get FDC food by ID
- `POST /api/v1/fdc/cache/clear` - Clear FDC cache ❌ Non-RESTful
- `GET /api/v1/barcodelookup/search` - Search by barcode
- `POST /api/v1/food/enrich` - Enrich food data ❌ Non-RESTful
- `GET /api/v1/onboarding/common-items` - Get common items
- `PUT /api/v1/food-images` - Update food images
- `GET /api/v1/shopping-list/items` - List shopping list items
- `POST /api/v1/shopping-list/items` - Add shopping list item
- `PUT /api/v1/shopping-list/items/:id` - Update shopping list item
- `DELETE /api/v1/shopping-list/items/:id` - Delete shopping list item
- `POST /api/v1/shopping-list/add-missing` - Add missing items ❌ Non-RESTful
- `DELETE /api/v1/shopping-list/clear-checked` - Clear checked items ❌ Non-RESTful
- `POST /api/v1/shopping-list/generate-from-meal-plans` - Generate from meal plans ❌ Non-RESTful
- `POST /api/v1/inventory/batch` - Batch update inventory

#### Recipes Router (`/api/v1/recipes`)
- `GET /api/v1/chat/messages` - Get chat messages ❌ Should be /api/v1/chats/:chatId/messages
- `DELETE /api/v1/chat/messages` - Delete chat messages ❌ Should be /api/v1/chats/:chatId/messages
- `POST /api/v1/recipes` - Create recipe
- `GET /api/v1/recipes` - List recipes
- `DELETE /api/v1/recipes/:id` - Delete recipe

#### Chat Router (`/api/v1/chats`)
- `POST /api/v1/chats/stream` - Stream chat ❌ Non-RESTful
- `GET /api/v1/chats/health` - Health check ❌ Non-RESTful
- `POST /api/v1/chats/reset` - Reset chat ❌ Non-RESTful

#### Meal Planning Router (`/api/v1/meal-plans`, `/api/v1/shopping-lists`)
- `GET /api/v1/meal-plans` - List meal plans
- `POST /api/v1/meal-plans` - Create meal plan
- `PUT /api/v1/meal-plans/:id` - Update meal plan
- `DELETE /api/v1/meal-plans/:id` - Delete meal plan
- `GET /api/v1/shopping-list` - Get shopping list ❌ Should be /api/v1/shopping-lists
- `POST /api/v1/shopping-list` - Create shopping list ❌ Should be /api/v1/shopping-lists
- `POST /api/v1/shopping-list/batch` - Batch update ❌ Should be /api/v1/shopping-lists/batch
- `PATCH /api/v1/shopping-list/:id/toggle` - Toggle item ❌ Non-RESTful
- `DELETE /api/v1/shopping-list/:id` - Delete item ❌ Should be /api/v1/shopping-lists/:id
- `DELETE /api/v1/shopping-list/clear-checked` - Clear checked ❌ Non-RESTful
- `POST /api/v1/shopping-list/generate-from-meal-plans` - Generate from meal plans ❌ Non-RESTful

### Admin Routes

#### Admin Router (`/api/v1/admin`)
- `GET /api/v1/admin/users` - List users
- `GET /api/v1/admin/users/:userId` - Get user
- `PATCH /api/v1/admin/users/:userId` - Update user
- `PATCH /api/v1/admin/users/:userId/admin` - Update admin status ❌ Non-RESTful
- `DELETE /api/v1/admin/users/:userId` - Delete user

### AI Routes

#### Generation Router (`/api/v1/ai/text`)
- `POST /api/v1/ai/text/writing/analyze` - Analyze writing ❌ Non-RESTful
- `POST /api/v1/ai/text/writing/tone` - Adjust tone ❌ Non-RESTful
- `POST /api/v1/ai/text/writing/expand` - Expand text ❌ Non-RESTful
- `POST /api/v1/ai/text/summarize` - Summarize ❌ Non-RESTful
- `POST /api/v1/ai/text/translate` - Translate ❌ Non-RESTful
- `POST /api/v1/ai/text/translate/detect` - Detect language ❌ Non-RESTful
- `POST /api/v1/ai/text/recipe` - Generate recipe ❌ Should be /api/v1/ai/recipes/generate
- `GET /api/v1/ai/text/conversations` - List conversations
- `POST /api/v1/ai/text/conversations` - Create conversation
- `GET /api/v1/ai/text/conversations/:id` - Get conversation
- `PATCH /api/v1/ai/text/conversations/:id` - Update conversation
- `DELETE /api/v1/ai/text/conversations/:id` - Delete conversation
- `GET /api/v1/ai/text/conversations/:id/messages` - Get messages
- `POST /api/v1/ai/text/conversations/:id/messages` - Add message
- `DELETE /api/v1/ai/text/conversations/:conversationId/messages/:messageId` - Delete message
- `GET /api/v1/ai/text/conversations/:id/messages/stream` - Stream messages ❌ Non-RESTful
- `GET /api/v1/ai/text/stats` - Get stats ❌ Should be /api/v1/ai/statistics

## 2. Identified Non-Standard Patterns

### Pattern Issues:
1. **Inconsistent resource naming**:
   - Singular vs plural (`/shopping-list` vs `/shopping-lists`)
   - Mixed conventions (`/food-items` vs `/fooditems`)

2. **Non-RESTful verb usage**:
   - `/clear-checked`, `/add-missing`, `/generate-from-meal-plans`
   - `/analyze`, `/expand`, `/detect`, `/toggle`
   - Action verbs in URLs instead of resource-based endpoints

3. **Inconsistent nesting**:
   - `/chat/messages` should be `/chats/:chatId/messages`
   - `/shopping-list/items` should be `/shopping-lists/:listId/items`

4. **Mixed parameter patterns**:
   - Query parameters for filtering not standardized
   - Some use `?type=`, others use path segments

5. **Health checks and utility endpoints**:
   - `/health`, `/stats`, `/reset` mixed with resource endpoints
   - Should be separated to utility endpoints

## 3. Proposed RESTful Standardization

### Core Principles:
- All endpoints start with `/api/v1`
- Use plural nouns for resources
- Actions are HTTP verbs, not URL segments
- Nested resources follow pattern: `/api/v1/parents/:parentId/children`
- Query parameters for filtering, pagination, and searches
- Utility endpoints under `/api/v1/system/` or `/api/v1/utils/`

### Standardized Endpoints Mapping:

#### Inventory & Food Management
```
OLD: GET /api/v1/inventories
NEW: GET /api/v1/inventories (No change ✓)

OLD: GET /api/v1/storage-locations
NEW: GET /api/v1/storage-locations (No change ✓)

OLD: GET /api/v1/food-categories
NEW: GET /api/v1/food-categories (No change ✓)

OLD: DELETE /api/v1/food-items/:id
NEW: DELETE /api/v1/food-items/:id (No change ✓)

OLD: POST /api/v1/food/enrich
NEW: PUT /api/v1/food-items/:id/enrichment

OLD: POST /api/v1/fdc/cache/clear
NEW: DELETE /api/v1/system/caches/fdc

OLD: GET /api/v1/barcodelookup/search
NEW: GET /api/v1/barcodes?code={barcode}

OLD: GET /api/v1/onboarding/common-items
NEW: GET /api/v1/food-items/common

OLD: PUT /api/v1/food-images
NEW: PUT /api/v1/food-items/:id/images
```

#### Shopping Lists
```
OLD: GET /api/v1/shopping-list
NEW: GET /api/v1/shopping-lists

OLD: POST /api/v1/shopping-list
NEW: POST /api/v1/shopping-lists

OLD: DELETE /api/v1/shopping-list/:id
NEW: DELETE /api/v1/shopping-lists/:id

OLD: GET /api/v1/shopping-list/items
NEW: GET /api/v1/shopping-lists/:listId/items

OLD: POST /api/v1/shopping-list/items
NEW: POST /api/v1/shopping-lists/:listId/items

OLD: PUT /api/v1/shopping-list/items/:id
NEW: PUT /api/v1/shopping-lists/:listId/items/:itemId

OLD: DELETE /api/v1/shopping-list/items/:id
NEW: DELETE /api/v1/shopping-lists/:listId/items/:itemId

OLD: PATCH /api/v1/shopping-list/:id/toggle
NEW: PATCH /api/v1/shopping-lists/:listId/items/:itemId (with {checked: boolean})

OLD: POST /api/v1/shopping-list/add-missing
NEW: POST /api/v1/shopping-lists/:listId/items/bulk

OLD: DELETE /api/v1/shopping-list/clear-checked
NEW: DELETE /api/v1/shopping-lists/:listId/items?status=checked

OLD: POST /api/v1/shopping-list/generate-from-meal-plans
NEW: POST /api/v1/shopping-lists/:listId/items/import?source=meal-plans
```

#### Chat & Messaging
```
OLD: GET /api/v1/chat/messages
NEW: GET /api/v1/chats/:chatId/messages

OLD: DELETE /api/v1/chat/messages
NEW: DELETE /api/v1/chats/:chatId/messages

OLD: POST /api/v1/chats/stream
NEW: GET /api/v1/chats/:chatId/messages?stream=true (SSE)

OLD: GET /api/v1/chats/health
NEW: GET /api/v1/system/health/chats

OLD: POST /api/v1/chats/reset
NEW: DELETE /api/v1/chats/:chatId/messages
```

#### Recipes
```
OLD: GET /api/v1/recipes
NEW: GET /api/v1/recipes (No change ✓)

OLD: POST /api/v1/recipes
NEW: POST /api/v1/recipes (No change ✓)

OLD: DELETE /api/v1/recipes/:id
NEW: DELETE /api/v1/recipes/:id (No change ✓)
```

#### Meal Plans
```
OLD: GET /api/v1/meal-plans
NEW: GET /api/v1/meal-plans (No change ✓)

OLD: POST /api/v1/meal-plans
NEW: POST /api/v1/meal-plans (No change ✓)

OLD: PUT /api/v1/meal-plans/:id
NEW: PUT /api/v1/meal-plans/:id (No change ✓)

OLD: DELETE /api/v1/meal-plans/:id
NEW: DELETE /api/v1/meal-plans/:id (No change ✓)
```

#### AI Services
```
OLD: POST /api/v1/ai/text/writing/analyze
NEW: POST /api/v1/ai/analyses (with {type: "writing"})

OLD: POST /api/v1/ai/text/writing/tone
NEW: POST /api/v1/ai/transformations (with {type: "tone"})

OLD: POST /api/v1/ai/text/writing/expand
NEW: POST /api/v1/ai/transformations (with {type: "expand"})

OLD: POST /api/v1/ai/text/summarize
NEW: POST /api/v1/ai/summaries

OLD: POST /api/v1/ai/text/translate
NEW: POST /api/v1/ai/translations

OLD: POST /api/v1/ai/text/translate/detect
NEW: POST /api/v1/ai/language-detections

OLD: POST /api/v1/ai/text/recipe
NEW: POST /api/v1/ai/recipes/generate

OLD: GET /api/v1/ai/text/conversations
NEW: GET /api/v1/ai/conversations (No change needed)

OLD: POST /api/v1/ai/text/conversations
NEW: POST /api/v1/ai/conversations (No change needed)

OLD: GET /api/v1/ai/text/conversations/:id
NEW: GET /api/v1/ai/conversations/:id (No change needed)

OLD: PATCH /api/v1/ai/text/conversations/:id
NEW: PATCH /api/v1/ai/conversations/:id (No change needed)

OLD: DELETE /api/v1/ai/text/conversations/:id
NEW: DELETE /api/v1/ai/conversations/:id (No change needed)

OLD: GET /api/v1/ai/text/conversations/:id/messages
NEW: GET /api/v1/ai/conversations/:conversationId/messages (No change needed)

OLD: POST /api/v1/ai/text/conversations/:id/messages
NEW: POST /api/v1/ai/conversations/:conversationId/messages (No change needed)

OLD: DELETE /api/v1/ai/text/conversations/:conversationId/messages/:messageId
NEW: DELETE /api/v1/ai/conversations/:conversationId/messages/:messageId (No change needed)

OLD: GET /api/v1/ai/text/conversations/:id/messages/stream
NEW: GET /api/v1/ai/conversations/:conversationId/messages?stream=true (SSE)

OLD: GET /api/v1/ai/text/stats
NEW: GET /api/v1/ai/statistics
```

#### Admin Routes
```
OLD: GET /api/v1/admin/users
NEW: GET /api/v1/admin/users (No change ✓)

OLD: GET /api/v1/admin/users/:userId
NEW: GET /api/v1/admin/users/:userId (No change ✓)

OLD: PATCH /api/v1/admin/users/:userId
NEW: PATCH /api/v1/admin/users/:userId (No change ✓)

OLD: PATCH /api/v1/admin/users/:userId/admin
NEW: PATCH /api/v1/admin/users/:userId (with {isAdmin: boolean})

OLD: DELETE /api/v1/admin/users/:userId
NEW: DELETE /api/v1/admin/users/:userId (No change ✓)
```

## 4. Migration Mapping Summary

### Priority 1: Critical Non-RESTful Endpoints (High Traffic)
These endpoints have verb-based URLs and should be migrated first:

1. **Shopping List Actions**:
   - `/shopping-list/add-missing` → `/shopping-lists/:listId/items/bulk`
   - `/shopping-list/clear-checked` → `/shopping-lists/:listId/items?status=checked`
   - `/shopping-list/generate-from-meal-plans` → `/shopping-lists/:listId/items/import?source=meal-plans`

2. **AI Text Processing**:
   - `/ai/text/writing/analyze` → `/ai/analyses`
   - `/ai/text/writing/tone` → `/ai/transformations`
   - `/ai/text/writing/expand` → `/ai/transformations`
   - `/ai/text/summarize` → `/ai/summaries`
   - `/ai/text/translate` → `/ai/translations`
   - `/ai/text/recipe` → `/ai/recipes/generate`

3. **Chat Operations**:
   - `/chats/stream` → `/chats/:chatId/messages?stream=true`
   - `/chats/reset` → `/chats/:chatId/messages` (DELETE)

### Priority 2: Resource Naming Consistency (Medium Traffic)
Fix singular/plural inconsistencies:

1. **Shopping List** → **Shopping Lists**:
   - `/shopping-list` → `/shopping-lists`
   - `/shopping-list/:id` → `/shopping-lists/:id`

2. **Nested Resources**:
   - `/chat/messages` → `/chats/:chatId/messages`
   - `/shopping-list/items` → `/shopping-lists/:listId/items`

### Priority 3: Utility Endpoints (Low Traffic)
Move system utilities to proper namespace:

1. **Health Checks**:
   - `/chats/health` → `/system/health/chats`
   - `/ai/text/stats` → `/ai/statistics`

2. **Cache Management**:
   - `/fdc/cache/clear` → `/system/caches/fdc` (DELETE)

## 5. Query Parameter Standardization

### Pagination Parameters:
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)
- `sort` - Sort field
- `order` - Sort order (asc/desc)

### Filter Parameters:
- `q` - Search query
- `status` - Filter by status
- `category` - Filter by category
- `start_date` - Date range start
- `end_date` - Date range end
- `stream` - Enable SSE streaming (boolean)

### Examples:
```
GET /api/v1/recipes?q=pasta&category=italian&page=2&limit=10&sort=createdAt&order=desc
GET /api/v1/shopping-lists/:listId/items?status=checked
GET /api/v1/ai/conversations/:id/messages?stream=true
```

## 6. Implementation Plan

### Phase 1: Update Backward Compatibility Middleware (Week 1) ✅ COMPLETED
- Add new legacy path mappings
- Implement request transformation for new patterns
- Add deprecation warnings for old endpoints
- **Note**: Currently maintaining existing single-resource semantics (e.g., single shopping list, single chat) to ensure backward compatibility without breaking changes

### Phase 2: Update Router Implementations (Week 2-3) 🚧 PENDING
- Refactor routers to support new RESTful patterns with proper resource nesting
- Add support for multiple shopping lists, chats, etc.
- Implement proper resource ID handling
- Maintain backward compatibility through middleware
- Update validation schemas

### Phase 3: Update Documentation (Week 4)
- Update API documentation
- Create migration guide for clients
- Update Postman/OpenAPI specs

### Phase 4: Client Migration (Week 5-6)
- Update frontend to use new endpoints
- Update mobile apps if applicable
- Monitor deprecation endpoint usage

### Phase 5: Deprecation (Month 3)
- Remove legacy endpoint support
- Clean up backward compatibility middleware
- Archive old documentation

## 7. Current Backward Compatibility Approach

### Phase 1 Implementation (Current)
To ensure zero breaking changes, the current implementation:

1. **Maintains Single-Resource Semantics**:
   - Shopping list endpoints continue to work with implicit single list
   - Chat endpoints continue to work with implicit single chat
   - No requirement for list/chat IDs in legacy endpoints

2. **Progressive Enhancement**:
   - Legacy endpoints redirect to existing v1 endpoints
   - Request transformations handle parameter normalization
   - Query parameter standardization for consistency

3. **Conservative Path Mappings**:
   - `/api/shopping-list/*` → `/api/v1/shopping-list/*` (not `/shopping-lists/:id/*`)
   - `/api/chat/*` → `/api/v1/chat/*` (not `/chats/:id/*`)
   - Preserves exact functionality of existing API

### Phase 2 (Future Router Updates)
Once routers are updated to support multiple resources:

1. **Shopping List Operations**:
   - Will support multiple lists with explicit IDs
   - Default list concept for backward compatibility
   - Nested resource patterns: `/shopping-lists/:listId/items`

2. **Chat Operations**:
   - Will support multiple chat sessions
   - Default chat for backward compatibility
   - Nested messages: `/chats/:chatId/messages`

3. **Migration Path**:
   - Middleware will map legacy single-resource to default resources
   - New clients can use full RESTful patterns
   - Old clients continue working unchanged

## 8. Breaking Changes Summary

### Current Implementation (Phase 1): NO Breaking Changes
All legacy endpoints are fully supported through backward compatibility middleware with no functional changes required from clients.

### Future Implementation (Phase 2): Minimal Breaking Changes
When routers are updated to support full RESTful patterns:
- New endpoints will be available for multi-resource support
- Legacy endpoints will map to default resources
- Gradual migration path for clients

## 9. Benefits of Standardization

1. **Consistency**: Predictable API patterns across all resources
2. **Scalability**: Easier to add new resources following same patterns
3. **Documentation**: Simpler to document and understand
4. **Caching**: Better HTTP cache support with proper verbs
5. **Tools**: Better support for API testing and generation tools
6. **RESTful**: Industry-standard patterns familiar to developers