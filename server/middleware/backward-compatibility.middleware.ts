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
  
  // Check exact matches first
  if (API_CONFIG.LEGACY_PATHS[originalPath]) {
    isLegacyPath = true;
    newPath = API_CONFIG.LEGACY_PATHS[originalPath];
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
      newPath = mappedPath + pathSuffix;
    }
  }
  
  // Handle special cases for paths with parameters that don't have exact legacy mappings
  if (!isLegacyPath) {
    // Inventory-related parameterized routes (legacy uses singular "inventory")
    if (originalPath.match(/^\/api\/inventory\/.+$/)) {
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
      newPath = originalPath.replace('/api/shopping-list/items', '/api/v1/shopping-list/items');
    }
    // Shopping list with other nested paths
    else if (originalPath.match(/^\/api\/shopping-list\/.+$/)) {
      isLegacyPath = true;
      newPath = originalPath.replace('/api/shopping-list', '/api/v1/shopping-list');
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
    
    // Rewrite the request URL with query string preserved
    req.url = newPath + queryString;
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
  
  // Transform 'type' to resource-specific parameters
  if (req.query.type === 'items' && req.path.includes('/inventories')) {
    delete req.query.type; // Remove redundant type parameter
  }
  
  // Transform barcode parameter
  if (req.query.barcode && req.path.includes('/barcodes')) {
    req.query.code = req.query.barcode;
    delete req.query.barcode;
  }
  
  // Transform USDA query parameter
  if (req.query.query && req.path.includes('/food-data')) {
    req.query.q = req.query.query;
    delete req.query.query;
  }
  
  // Transform shopping list status for deletion
  if (req.method === 'DELETE' && req.path.includes('/shopping-lists') && req.path.includes('/clear-checked')) {
    req.query.status = 'checked';
  }
  
  next();
}