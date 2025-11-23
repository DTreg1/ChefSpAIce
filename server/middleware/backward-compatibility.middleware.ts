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
  const originalPath = req.path;
  const method = req.method;
  
  // Check if this is a legacy path
  let isLegacyPath = false;
  let newPath = originalPath;
  
  // Check exact matches first
  for (const [legacy, modern] of Object.entries(API_CONFIG.LEGACY_PATHS)) {
    if (originalPath === legacy || originalPath.startsWith(legacy + '/') || originalPath.startsWith(legacy + '?')) {
      isLegacyPath = true;
      newPath = originalPath.replace(legacy, modern);
      break;
    }
  }
  
  // Handle special cases for paths with parameters
  if (!isLegacyPath) {
    // Check patterns for inventory
    if (originalPath.match(/^\/api\/food-items\/\d+$/)) {
      isLegacyPath = true;
      newPath = originalPath.replace('/api/food-items', '/api/v1/food-items');
    }
    // Check patterns for FDC
    else if (originalPath.match(/^\/api\/fdc\/food\/[\w-]+$/)) {
      isLegacyPath = true;
      newPath = originalPath.replace('/api/fdc/food', '/api/v1/food-data');
    }
    // Check patterns for recipes
    else if (originalPath.match(/^\/api\/recipes\/[\w-]+$/)) {
      isLegacyPath = true;
      newPath = originalPath.replace('/api/recipes', '/api/v1/recipes');
    }
    // Check patterns for meal plans
    else if (originalPath.match(/^\/api\/meal-plans\/[\w-]+$/)) {
      isLegacyPath = true;
      newPath = originalPath.replace('/api/meal-plans', '/api/v1/meal-plans');
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
    
    // Rewrite the request path
    req.url = newPath;
    req.path = newPath.split('?')[0];
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