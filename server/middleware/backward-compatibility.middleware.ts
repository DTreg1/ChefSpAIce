/**
 * Backward Compatibility Middleware
 * Handles legacy API endpoints and redirects to new RESTful endpoints
 * with deprecation warnings
 */

import { Request, Response, NextFunction } from 'express';
import { API_CONFIG } from '../config/api.config';

// Track deprecated endpoint usage for monitoring
const deprecationUsage = new Map<string, number>();

/**
 * Middleware to handle backward compatibility for legacy endpoints
 * Redirects old paths to new RESTful endpoints and logs deprecation warnings
 */
export function backwardCompatibilityMiddleware(req: Request, res: Response, next: NextFunction) {
  const originalUrl = req.url;
  const originalPath = req.path;
  const method = req.method;
  const queryString = originalUrl.includes('?') ? originalUrl.substring(originalUrl.indexOf('?')) : '';
  
  // Check if this is a legacy path
  let isLegacyPath = false;
  let newPath = originalPath;
  let additionalQueryParams = '';
  
  // Check exact matches first (including query parameter transformations)
  if (API_CONFIG.LEGACY_PATHS[originalPath]) {
    isLegacyPath = true;
    const mappedValue = API_CONFIG.LEGACY_PATHS[originalPath];
    
    // Handle mappings that include query parameters
    if (mappedValue.includes('?')) {
      const [path, params] = mappedValue.split('?');
      newPath = path;
      additionalQueryParams = params;
    } else {
      newPath = mappedValue;
    }
  } else {
    // Check for parameterized route matches
    // Find the longest matching legacy path prefix
    const matchingLegacyPath = Object.keys(API_CONFIG.LEGACY_PATHS)
      .filter(oldPath => {
        // Check if the current path starts with this legacy path followed by a slash
        return originalPath.startsWith(oldPath + '/');
      })
      .sort((a, b) => b.length - a.length)[0]; // Get longest match
    
    if (matchingLegacyPath) {
      isLegacyPath = true;
      const mappedPath = API_CONFIG.LEGACY_PATHS[matchingLegacyPath as keyof typeof API_CONFIG.LEGACY_PATHS];
      const pathSuffix = originalPath.slice(matchingLegacyPath.length);
      
      // Handle mappings that include query parameters
      if (mappedPath.includes('?')) {
        const [path, params] = mappedPath.split('?');
        newPath = path + pathSuffix;
        additionalQueryParams = params;
      } else {
        newPath = mappedPath + pathSuffix;
      }
    }
  }
  
  // Handle special cases for paths with parameters that don't have exact legacy mappings
  if (!isLegacyPath) {
    // === New RESTful Transformations ===
    
    // Shopping list standardization (v1 paths)
    if (originalPath.match(/^\/api\/v1\/shopping-list\/items\/.+$/)) {
      isLegacyPath = true;
      const pathParts = originalPath.split('/');
      if (originalPath.includes('/toggle')) {
        // Extract item ID (comes before /toggle)
        const itemId = pathParts[pathParts.length - 2]; // Get the ID before 'toggle'
        newPath = `/api/v1/shopping-list/items/${itemId}`;
        // The PATCH method with toggle will be handled by requestTransformMiddleware
      } else {
        const itemId = pathParts[pathParts.length - 1];
        newPath = `/api/v1/shopping-list/items/${itemId}`;
      }
    }
    else if (originalPath.match(/^\/api\/v1\/shopping-list\/.+$/)) {
      isLegacyPath = true;
      const suffix = originalPath.replace('/api/v1/shopping-list', '');
      // Keep existing single-list semantics - don't transform to nested resources yet
      // The routers will need to be updated to support the new nested structure
      if (suffix === '/clear-checked') {
        newPath = '/api/v1/shopping-list/clear-checked';
      } else if (suffix === '/generate-from-meal-plans') {
        newPath = '/api/v1/shopping-list/generate-from-meal-plans';
      } else if (suffix === '/add-missing') {
        newPath = '/api/v1/shopping-list/add-missing';
      } else if (suffix === '/batch') {
        newPath = '/api/v1/shopping-list/batch';
      } else {
        const listId = suffix.substring(1); // Remove leading /
        newPath = `/api/v1/shopping-list/${listId}`;
      }
    }
    
    // AI text prefix removal for conversations
    else if (originalPath.match(/^\/api\/v1\/ai\/text\/conversations\/.+$/)) {
      isLegacyPath = true;
      newPath = originalPath.replace('/api/v1/ai/text/conversations', '/api/v1/ai/conversations');
      // Handle streaming endpoint
      if (newPath.includes('/messages/stream')) {
        newPath = newPath.replace('/messages/stream', '/messages');
        additionalQueryParams = 'stream=true';
      }
    }
    else if (originalPath === '/api/v1/ai/text/conversations') {
      isLegacyPath = true;
      newPath = '/api/v1/ai/conversations';
    }
    
    // Admin user management special endpoints
    else if (originalPath.match(/^\/api\/v1\/admin\/users\/[\w-]+\/admin$/)) {
      isLegacyPath = true;
      newPath = originalPath.replace('/admin', ''); // Remove trailing /admin
    }
    
    // === Legacy Path Transformations (non-v1) ===
    
    // Inventory-related parameterized routes (legacy uses singular "inventory")
    else if (originalPath.match(/^\/api\/inventory\/.+$/)) {
      isLegacyPath = true;
      newPath = originalPath.replace('/api/inventory', '/api/v1/inventories');
    }
    // Food items with IDs and nested paths
    else if (originalPath.match(/^\/api\/food-items\/.+$/)) {
      isLegacyPath = true;
      newPath = originalPath.replace('/api/food-items', '/api/v1/food-items');
    }
    // FDC food with nested paths
    else if (originalPath.match(/^\/api\/fdc\/food\/.+$/)) {
      isLegacyPath = true;
      newPath = originalPath.replace('/api/fdc/food', '/api/v1/fdc/food');
    }
    // Storage locations with IDs and nested paths
    else if (originalPath.match(/^\/api\/storage-locations\/.+$/)) {
      isLegacyPath = true;
      newPath = originalPath.replace('/api/storage-locations', '/api/v1/storage-locations');
    }
    // Recipes with IDs and nested paths
    else if (originalPath.match(/^\/api\/recipes\/.+$/)) {
      isLegacyPath = true;
      newPath = originalPath.replace('/api/recipes', '/api/v1/recipes');
    }
    // Meal plans with IDs and nested paths
    else if (originalPath.match(/^\/api\/meal-plans\/.+$/)) {
      isLegacyPath = true;
      newPath = originalPath.replace('/api/meal-plans', '/api/v1/meal-plans');
    }
    // Shopping list with nested paths (must check items path first)
    else if (originalPath.match(/^\/api\/shopping-list\/items\/.+$/)) {
      isLegacyPath = true;
      const pathParts = originalPath.split('/');
      const itemId = pathParts[pathParts.length - 1];
      newPath = `/api/v1/shopping-list/items/${itemId}`;
    }
    // Shopping list with other nested paths
    else if (originalPath.match(/^\/api\/shopping-list\/.+$/)) {
      isLegacyPath = true;
      const suffix = originalPath.replace('/api/shopping-list', '');
      // Keep existing single-list semantics
      if (suffix === '/clear-checked') {
        newPath = '/api/v1/shopping-list/clear-checked';
      } else if (suffix === '/generate-from-meal-plans') {
        newPath = '/api/v1/shopping-list/generate-from-meal-plans';
      } else if (suffix === '/add-missing') {
        newPath = '/api/v1/shopping-list/add-missing';
      } else {
        const listId = suffix.substring(1); // Remove leading /
        newPath = `/api/v1/shopping-list/${listId}`;
      }
    }
    // Admin routes with IDs
    else if (originalPath.match(/^\/api\/admin\/[\w-\/]+$/)) {
      isLegacyPath = true;
      newPath = originalPath.replace('/api/admin', '/api/v1/admin');
    }
    // AI conversation messages
    else if (originalPath.match(/^\/api\/ai\/conversations\/[\w-]+\/messages$/)) {
      isLegacyPath = true;
      newPath = originalPath.replace('/api/ai/conversations', '/api/v1/ai/conversations');
    }
  }
  
  if (isLegacyPath) {
    // Track usage for monitoring
    const key = `${method} ${originalPath}`;
    deprecationUsage.set(key, (deprecationUsage.get(key) || 0) + 1);
    
    // Log deprecation warning (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[DEPRECATION] ${method} ${originalPath} is deprecated. Use ${method} ${newPath} instead.`);
    }
    
    // Add deprecation headers
    res.setHeader('X-Deprecation-Warning', API_CONFIG.DEPRECATION_MESSAGE);
    res.setHeader('X-Deprecation-Date', API_CONFIG.DEPRECATION_DATE);
    res.setHeader('X-New-Endpoint', `${method} ${newPath}`);
    
    // Combine existing query string with additional parameters
    let finalQueryString = queryString;
    if (additionalQueryParams) {
      if (queryString) {
        finalQueryString = queryString + '&' + additionalQueryParams;
      } else {
        finalQueryString = '?' + additionalQueryParams;
      }
    }
    
    // Rewrite the request URL with combined query string
    req.url = newPath + finalQueryString;
  }
  
  next();
}

/**
 * Endpoint to get deprecation usage statistics
 */
export function getDeprecationStats(): { [key: string]: number } {
  const stats: { [key: string]: number } = {};
  deprecationUsage.forEach((count, endpoint) => {
    stats[endpoint] = count;
  });
  return stats;
}

/**
 * Clear deprecation statistics
 */
export function clearDeprecationStats(): void {
  deprecationUsage.clear();
}

/**
 * Middleware to automatically convert old request patterns to new ones
 */
export function requestTransformMiddleware(req: Request, res: Response, next: NextFunction) {
  // Transform query parameters for backward compatibility
  
  // === Query Parameter Standardization ===
  
  // Transform 'type' to resource-specific parameters
  if (req.query.type === 'items' && req.path.includes('/inventories')) {
    delete req.query.type; // Remove redundant type parameter
  }
  
  // Transform barcode parameter for barcode lookups
  if (req.query.barcode) {
    if (req.path.includes('/barcodes') || req.path.includes('/barcodelookup')) {
      req.query.code = req.query.barcode;
      delete req.query.barcode;
    }
  }
  
  // Transform USDA query parameter
  if (req.query.query && (req.path.includes('/food-data') || req.path.includes('/fdc'))) {
    req.query.q = req.query.query;
    delete req.query.query;
  }
  
  // Transform shopping list status for deletion
  if (req.method === 'DELETE' && req.path.includes('/shopping-lists')) {
    if (req.path.includes('/clear-checked') || req.query.clearChecked === 'true') {
      req.query.status = 'checked';
      delete req.query.clearChecked;
    }
  }
  
  // === Method Transformations ===
  
  // Transform non-RESTful action endpoints to proper HTTP methods
  if (req.path.includes('/toggle') && req.method === 'PATCH') {
    // Transform toggle to standard PATCH with body
    if (!req.body) req.body = {};
    req.body.checked = req.body.checked !== undefined ? req.body.checked : true;
  }
  
  // Transform POST to DELETE for clear/reset operations
  if (req.method === 'POST') {
    if (req.path.includes('/clear-checked') || req.path.includes('/reset')) {
      // These should be DELETE operations in RESTful API
      // The backward compatibility middleware will handle the path transformation
    }
  }
  
  // === Body Parameter Transformations ===
  
  // Transform AI request bodies for standardized endpoints
  if (req.path.includes('/ai/') && req.body) {
    // Add type field for consolidated AI endpoints
    if (req.path.includes('/writing/analyze')) {
      req.body.type = 'writing';
    } else if (req.path.includes('/writing/tone')) {
      req.body.type = 'tone';
    } else if (req.path.includes('/writing/expand')) {
      req.body.type = 'expand';
    } else if (req.path.includes('/sentiment')) {
      req.body.type = 'sentiment';
    } else if (req.path.includes('/trends')) {
      req.body.type = 'trends';
    } else if (req.path.includes('/predictions')) {
      req.body.type = 'predictions';
    }
  }
  
  // Transform admin user updates
  if (req.path.match(/\/admin\/users\/[\w-]+\/admin$/) && req.method === 'PATCH') {
    // Transform admin status update to standard user update
    if (!req.body) req.body = {};
    req.body.isAdmin = req.body.admin !== undefined ? req.body.admin : req.body.isAdmin;
    delete req.body.admin;
  }
  
  // === Pagination Parameter Standardization ===
  
  // Standardize pagination parameters
  if (req.query.offset !== undefined && req.query.limit !== undefined) {
    // Convert offset/limit to page/limit
    const offset = parseInt(req.query.offset as string);
    const limit = parseInt(req.query.limit as string);
    req.query.page = Math.floor(offset / limit) + 1;
    delete req.query.offset;
  }
  
  // Standardize sort parameters
  if (req.query.sortBy) {
    req.query.sort = req.query.sortBy;
    delete req.query.sortBy;
  }
  if (req.query.sortOrder) {
    req.query.order = req.query.sortOrder;
    delete req.query.sortOrder;
  }
  
  // Standardize search parameter
  if (req.query.search && !req.query.q) {
    req.query.q = req.query.search;
    delete req.query.search;
  }
  
  // Standardize date range parameters
  if (req.query.startDate && !req.query.start_date) {
    req.query.start_date = req.query.startDate;
    delete req.query.startDate;
  }
  if (req.query.endDate && !req.query.end_date) {
    req.query.end_date = req.query.endDate;
    delete req.query.endDate;
  }
  
  next();
}