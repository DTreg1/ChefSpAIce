# API Version Handler Implementation

## Overview

Implemented a clean HTTP 301 redirect-based API version handler that provides backward compatibility by redirecting legacy endpoints to new RESTful API v1 endpoints.

## Implementation Details

### Key Features

- **HTTP 301 Redirects**: Uses permanent redirects instead of URL rewriting
- **Clean Migration Path**: Explicitly tells clients about new endpoint locations
- **Future-Proof**: Includes deprecation headers for eventual v2 migration
- **Content-Type Aware**: Only redirects API requests (JSON/XHR), not HTML routes

### How It Works

```javascript
// Example: Redirect old endpoints to new ones
app.use("/inventory", (req, res) => {
  res.redirect(301, `/api/v1/inventories${req.url}`);
});

app.use("/api/inventory", (req, res) => {
  res.redirect(301, `/api/v1/inventories${req.url}`);
});
```

## Redirect Mappings

### Core Resources

- `/inventory/*` → `/api/v1/inventories/*`
- `/api/inventory/*` → `/api/v1/inventories/*`
- `/api/food-items/*` → `/api/v1/food-items/*`
- `/api/storage-locations/*` → `/api/v1/storage-locations/*`

### Recipe & Meal Planning

- `/api/recipes/*` → `/api/v1/recipes/*`
- `/api/meal-plans/*` → `/api/v1/meal-plans/*`
- `/api/shopping-list/*` → `/api/v1/shopping-list/*`

### AI Services

- `/api/chat/*` → `/api/v1/chat/*`
- `/api/ai/*` → `/api/v1/ai/*`
- `/api/writing/*` → `/api/v1/ai/generation/*`
- `/api/nutrition/*` → `/api/v1/ai/analysis/nutrition/*`
- `/api/image-analysis/*` → `/api/v1/ai/vision/*`

### Platform Services

- `/api/notifications/*` → `/api/v1/notifications/*`
- `/api/activities/*` → `/api/v1/activities/*`
- `/api/analytics/*` → `/api/v1/analytics/*`

### Admin Routes

- `/api/admin/*` → `/api/v1/admin/*`

### External APIs

- `/api/fdc/*` → `/api/v1/fdc/*`
- `/api/barcode/*` → `/api/v1/barcodes/*`
- `/api/barcodelookup/*` → `/api/v1/barcodes/lookup/*`

## Testing Results

All redirects return HTTP 301 status with proper Location headers:

```bash
# Example test
curl -I http://localhost:5000/api/inventory
# Returns:
# HTTP/1.1 301 Moved Permanently
# Location: /api/v1/inventories/

curl -I http://localhost:5000/api/writing/analyze -X POST
# Returns:
# HTTP/1.1 301 Moved Permanently
# Location: /api/v1/ai/generation/analyze
```

## Benefits Over URL Rewriting

1. **Transparency**: Clients explicitly know about new endpoints
2. **SEO Friendly**: Search engines understand permanent moves
3. **Cache Friendly**: Browsers/CDNs can cache redirect information
4. **Debugging**: Easier to trace in network logs
5. **Standards Compliant**: Follows HTTP specification for resource moves

## Future Migration Support

The handler includes deprecation headers for future v2 migration:

```javascript
// When API v2 is launched, headers will include:
X-API-Version: v1
X-API-Deprecation: true
X-API-Deprecation-Date: 2025-06-01
X-API-New-Version: v2
Link: </api/v2/resource>; rel="successor-version"
```

## Integration

The API version handler is integrated in `server/routers/index.ts`:

```javascript
export async function registerModularRoutes(app) {
  // Setup API version redirects for clean backward compatibility
  setupApiVersionRedirects(app);

  // Add deprecation headers for future v2 migration
  app.use(addDeprecationHeaders);

  // Handle redirect errors
  app.use(handleRedirectErrors);

  // ... register v1 routes
}
```

## Files Created/Modified

- **Created**: `server/middleware/api-version-handler.ts` - Main redirect handler
- **Modified**: `server/routers/index.ts` - Integrated version handler
- **Documentation**: `server/docs/api-version-handler-implementation.md` (this file)

## Migration Guide for Clients

Clients should update their API endpoints gradually:

1. **Immediate**: Continue using legacy endpoints (they redirect automatically)
2. **Short-term**: Update to v1 endpoints to avoid redirect overhead
3. **Long-term**: Monitor deprecation headers for v2 migration

## Conclusion

The API version handler provides a clean, standards-compliant approach to API versioning with zero breaking changes. All legacy endpoints continue to work seamlessly through HTTP 301 redirects while guiding clients toward the new RESTful API structure.
