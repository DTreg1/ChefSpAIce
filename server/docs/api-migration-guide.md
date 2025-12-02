# API Migration Guide: v1 RESTful Endpoints

## Overview

The ChefSpAIce API has been migrated to follow RESTful conventions with a standardized `/api/v1` prefix. All legacy endpoints are automatically redirected using HTTP 301 permanent redirects, ensuring zero breaking changes for existing clients.

## Key Changes

### 1. API Version Prefix

All endpoints now use the `/api/v1` prefix for versioning:

- **Legacy:** `/api/recipes`
- **New:** `/api/v1/recipes`

### 2. Plural Resource Names

Resources now use plural names following REST conventions:

- `/api/inventory` → `/api/v1/inventories`
- `/api/food-item` → `/api/v1/food-items`
- `/api/recipe` → `/api/v1/recipes`

### 3. Backward Compatibility

- All legacy endpoints return HTTP 301 (Moved Permanently) with the new location
- Clients automatically follow redirects
- No changes required for existing integrations
- Gradual migration supported

## Migration Status

### Frontend Components Updated ✅

- **Hooks:** All React hooks updated to use v1 endpoints
- **Components:** Recipe cards, food cards, shopping lists migrated
- **Pages:** Storage, nutrition, meal planner updated
- **Utilities:** Analytics, logging, auto-save migrated

### Backend Services ✅

- **Routers:** All routers configured with proper prefixes
- **Middleware:** API version handler implements 301 redirects
- **Documentation:** API docs reflect new structure

## API Endpoint Mapping

### Core Resources

| Legacy Endpoint          | New v1 Endpoint             | Status        |
| ------------------------ | --------------------------- | ------------- |
| `/api/inventory`         | `/api/v1/inventories`       | ✅ Redirected |
| `/api/food-items`        | `/api/v1/food-items`        | ✅ Redirected |
| `/api/storage-locations` | `/api/v1/storage-locations` | ✅ Redirected |
| `/api/recipes`           | `/api/v1/recipes`           | ✅ Redirected |
| `/api/meal-plans`        | `/api/v1/meal-plans`        | ✅ Redirected |
| `/api/shopping-list`     | `/api/v1/shopping-list`     | ✅ Redirected |

### AI Services

| Legacy Endpoint  | New v1 Endpoint                 | Status        |
| ---------------- | ------------------------------- | ------------- |
| `/api/chat`      | `/api/v1/chat`                  | ✅ Redirected |
| `/api/writing`   | `/api/v1/ai/generation`         | ✅ Redirected |
| `/api/sentiment` | `/api/v1/ai/analysis/sentiment` | ✅ Redirected |
| `/api/ocr`       | `/api/v1/ai/vision/ocr`         | ✅ Redirected |
| `/api/voice`     | `/api/v1/ai/voice`              | ✅ Redirected |

### Platform Services

| Legacy Endpoint      | New v1 Endpoint         | Status        |
| -------------------- | ----------------------- | ------------- |
| `/api/analytics`     | `/api/v1/analytics`     | ✅ Redirected |
| `/api/notifications` | `/api/v1/notifications` | ✅ Redirected |
| `/api/feedback`      | `/api/v1/feedback`      | ✅ Redirected |
| `/api/logs`          | `/api/v1/logs`          | ✅ Redirected |
| `/api/autosave`      | `/api/v1/autosave`      | ✅ Redirected |

## Testing Results

### Redirect Verification ✅

```bash
# Legacy endpoint returns 301 redirect
$ curl -I http://localhost:5000/api/health
HTTP/1.1 301 Moved Permanently
Location: /api/v1/health

# New v1 endpoint works directly
$ curl -I http://localhost:5000/api/v1/health
HTTP/1.1 200 OK
```

### Frontend Testing ✅

- All API calls updated to use v1 endpoints
- No breaking changes in UI functionality
- Seamless user experience maintained

## Implementation Details

### API Version Handler

The middleware (`server/middleware/api-version-handler.ts`) handles:

1. **Pattern Detection:** Identifies legacy API patterns
2. **URL Transformation:** Maps to new v1 endpoints
3. **HTTP 301 Redirects:** Returns permanent redirect status
4. **Content-Type Awareness:** Only redirects API requests, not HTML

### Benefits

- **Standards Compliance:** Follows REST best practices
- **Cache Benefits:** 301 redirects are cached by browsers/CDNs
- **SEO Friendly:** Search engines update their indices
- **Monitoring:** Easy to track migration progress via redirect logs
- **Zero Downtime:** No service interruption during migration

## Next Steps

### For Developers

1. Update any hardcoded API URLs in external systems
2. Monitor redirect logs to track migration progress
3. Consider updating documentation and examples

### For DevOps

1. Monitor redirect traffic volume
2. Set up alerts for high redirect rates
3. Plan legacy endpoint deprecation timeline

### Deprecation Timeline

- **Phase 1 (Current):** 301 redirects active, both endpoints work
- **Phase 2 (Future):** Monitor and encourage migration
- **Phase 3 (TBD):** Deprecate legacy endpoints after full migration

## Conclusion

The API migration to v1 RESTful endpoints is complete with full backward compatibility through HTTP 301 redirects. The system maintains zero breaking changes while providing a clear path forward for standardized API conventions.
