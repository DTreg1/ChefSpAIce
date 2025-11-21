/**
 * Activity Logging Middleware
 * 
 * Express middleware to automatically log API requests as activities.
 * Captures request details and maps them to appropriate activity types.
 */

import { Request, Response, NextFunction } from "express";
import { activityLogger, ActivityActions } from "../services/activity-logger.service";

// Route pattern matching interface
interface RoutePattern {
  method: string;
  pattern: RegExp;
  action: string;
  entity: string;
}

// Define route patterns with regex to handle parameters
const routePatterns: RoutePattern[] = [
  // Authentication
  { method: 'POST', pattern: /^\/api\/auth\/login$/, action: ActivityActions.LOGIN, entity: 'user' },
  { method: 'POST', pattern: /^\/api\/auth\/logout$/, action: ActivityActions.LOGOUT, entity: 'user' },
  { method: 'POST', pattern: /^\/api\/auth\/signup$/, action: ActivityActions.SIGNUP, entity: 'user' },
  
  // Food items - Handle parameterized routes
  { method: 'POST', pattern: /^\/api\/food-items$/, action: ActivityActions.FOOD_ADDED, entity: 'food_item' },
  { method: 'PUT', pattern: /^\/api\/food-items\/[\w-]+$/, action: ActivityActions.FOOD_UPDATED, entity: 'food_item' },
  { method: 'PATCH', pattern: /^\/api\/food-items\/[\w-]+$/, action: ActivityActions.FOOD_UPDATED, entity: 'food_item' },
  { method: 'DELETE', pattern: /^\/api\/food-items\/[\w-]+$/, action: ActivityActions.FOOD_DELETED, entity: 'food_item' },
  { method: 'POST', pattern: /^\/api\/food-items\/[\w-]+\/consume$/, action: ActivityActions.FOOD_CONSUMED, entity: 'food_item' },
  
  // Recipes - Handle parameterized routes
  { method: 'POST', pattern: /^\/api\/recipes\/generate$/, action: ActivityActions.RECIPE_GENERATED, entity: 'recipe' },
  { method: 'POST', pattern: /^\/api\/recipes$/, action: ActivityActions.RECIPE_SAVED, entity: 'recipe' },
  { method: 'PUT', pattern: /^\/api\/recipes\/[\w-]+$/, action: ActivityActions.RECIPE_UPDATED, entity: 'recipe' },
  { method: 'PATCH', pattern: /^\/api\/recipes\/[\w-]+$/, action: ActivityActions.RECIPE_UPDATED, entity: 'recipe' },
  { method: 'DELETE', pattern: /^\/api\/recipes\/[\w-]+$/, action: ActivityActions.RECIPE_DELETED, entity: 'recipe' },
  { method: 'POST', pattern: /^\/api\/recipes\/[\w-]+\/rate$/, action: ActivityActions.RECIPE_RATED, entity: 'recipe' },
  { method: 'POST', pattern: /^\/api\/recipes\/[\w-]+\/favorite$/, action: ActivityActions.RECIPE_FAVORITED, entity: 'recipe' },
  
  // Chat
  { method: 'POST', pattern: /^\/api\/chat$/, action: ActivityActions.MESSAGE_SENT, entity: 'chat' },
  { method: 'DELETE', pattern: /^\/api\/chat$/, action: ActivityActions.CHAT_CLEARED, entity: 'chat' },
  
  // Shopping list - Handle parameterized routes
  { method: 'POST', pattern: /^\/api\/shopping-list$/, action: ActivityActions.SHOPPING_ITEM_ADDED, entity: 'shopping_list' },
  { method: 'PUT', pattern: /^\/api\/shopping-list\/[\w-]+\/check$/, action: ActivityActions.SHOPPING_ITEM_CHECKED, entity: 'shopping_list' },
  { method: 'PUT', pattern: /^\/api\/shopping-list\/[\w-]+$/, action: 'shopping_item_updated', entity: 'shopping_list' },
  { method: 'DELETE', pattern: /^\/api\/shopping-list\/[\w-]+$/, action: 'shopping_item_deleted', entity: 'shopping_list' },
  { method: 'DELETE', pattern: /^\/api\/shopping-list$/, action: ActivityActions.SHOPPING_LIST_CLEARED, entity: 'shopping_list' },
  
  // Meal planning - Handle parameterized routes
  { method: 'POST', pattern: /^\/api\/meal-plans$/, action: ActivityActions.MEAL_PLANNED, entity: 'meal_plan' },
  { method: 'PUT', pattern: /^\/api\/meal-plans\/[\w-]+\/complete$/, action: ActivityActions.MEAL_COMPLETED, entity: 'meal_plan' },
  { method: 'PUT', pattern: /^\/api\/meal-plans\/[\w-]+\/skip$/, action: ActivityActions.MEAL_SKIPPED, entity: 'meal_plan' },
  { method: 'PUT', pattern: /^\/api\/meal-plans\/[\w-]+$/, action: ActivityActions.MEAL_UPDATED, entity: 'meal_plan' },
  { method: 'DELETE', pattern: /^\/api\/meal-plans\/[\w-]+$/, action: 'meal_deleted', entity: 'meal_plan' },
  
  // Storage locations
  { method: 'POST', pattern: /^\/api\/storage-locations$/, action: 'storage_created', entity: 'storage_location' },
  { method: 'PUT', pattern: /^\/api\/storage-locations\/[\w-]+$/, action: 'storage_updated', entity: 'storage_location' },
  { method: 'DELETE', pattern: /^\/api\/storage-locations\/[\w-]+$/, action: 'storage_deleted', entity: 'storage_location' },
  
  // Appliances
  { method: 'POST', pattern: /^\/api\/appliances$/, action: 'appliance_added', entity: 'appliance' },
  { method: 'PUT', pattern: /^\/api\/appliances\/[\w-]+$/, action: 'appliance_updated', entity: 'appliance' },
  { method: 'DELETE', pattern: /^\/api\/appliances\/[\w-]+$/, action: 'appliance_deleted', entity: 'appliance' },
  
  // Feedback
  { method: 'POST', pattern: /^\/api\/feedback$/, action: ActivityActions.FEEDBACK_SUBMITTED, entity: 'feedback' },
  
  // Settings/Profile
  { method: 'PUT', pattern: /^\/api\/auth\/user$/, action: ActivityActions.SETTINGS_CHANGED, entity: 'user' },
  { method: 'PUT', pattern: /^\/api\/users\/preferences$/, action: ActivityActions.SETTINGS_CHANGED, entity: 'user' },
  { method: 'PATCH', pattern: /^\/api\/users\/preferences$/, action: ActivityActions.SETTINGS_CHANGED, entity: 'user' },
  
  // Notifications
  { method: 'POST', pattern: /^\/api\/notifications$/, action: ActivityActions.NOTIFICATION_SENT, entity: 'notification' },
  { method: 'PUT', pattern: /^\/api\/notifications\/[\w-]+\/delivered$/, action: ActivityActions.NOTIFICATION_DELIVERED, entity: 'notification' },
  { method: 'DELETE', pattern: /^\/api\/notifications\/[\w-]+$/, action: ActivityActions.NOTIFICATION_DISMISSED, entity: 'notification' },
  
  // Admin operations
  { method: 'PATCH', pattern: /^\/api\/admin\/users\/[\w-]+\/admin$/, action: 'admin_permission_changed', entity: 'admin' },
  { method: 'DELETE', pattern: /^\/api\/admin\/users\/[\w-]+$/, action: 'admin_user_deleted', entity: 'admin' },
];

// Match a request to a route pattern
function matchRoutePattern(method: string, path: string): { action: string; entity: string } | null {
  for (const pattern of routePatterns) {
    if (pattern.method === method && pattern.pattern.test(path)) {
      return {
        action: pattern.action,
        entity: pattern.entity,
      };
    }
  }
  return null;
}

// Routes to exclude from activity logging
const excludedRoutes = [
  '/api/health',
  '/api/status',
  '/api/metrics',
  '/api/activity-logs', // Don't log activity log queries
];

// Extract entity ID from request path
function extractEntityId(path: string, _method: string): string | null {
  // Match patterns like /api/food-items/:id
  const patterns = [
    /\/api\/food-items\/([a-zA-Z0-9-]+)/,
    /\/api\/recipes\/([a-zA-Z0-9-]+)/,
    /\/api\/meal-plans\/([a-zA-Z0-9-]+)/,
    /\/api\/shopping-list\/([a-zA-Z0-9-]+)/,
    /\/api\/feedback\/([a-zA-Z0-9-]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = path.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  // For some routes, the ID might be in the body or query
  return null;
}

// Get client IP address (handles proxies)
function getClientIp(req: Request): string | null {
  // Handle various proxy headers
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = typeof forwarded === 'string' ? forwarded.split(',') : forwarded;
    return ips[0]?.trim() || null;
  }
  
  const realIp = req.headers['x-real-ip'];
  if (realIp) {
    return typeof realIp === 'string' ? realIp : realIp[0];
  }
  
  return req.ip || req.socket?.remoteAddress || null;
}

// Extract session ID from request
function getSessionId(req: any): string | null {
  return req.session?.id || req.sessionID || null;
}

// Determine if this is a successful response
function isSuccessResponse(statusCode: number): boolean {
  return statusCode >= 200 && statusCode < 300;
}

// Build metadata object from request and response
function buildMetadata(req: Request, res: Response, responseBody?: any): Record<string, any> {
  const metadata: Record<string, any> = {
    method: req.method,
    path: req.path,
    statusCode: res.statusCode,
    success: isSuccessResponse(res.statusCode),
  };
  
  // Add query parameters if present
  if (Object.keys(req.query).length > 0) {
    metadata.query = req.query;
  }
  
  // Add relevant body fields (excluding sensitive data)
  if (req.body && Object.keys(req.body).length > 0) {
    const sanitizedBody = { ...req.body };
    // Remove sensitive fields
    delete sanitizedBody.password;
    delete sanitizedBody.token;
    delete sanitizedBody.secret;
    delete sanitizedBody.apiKey;
    delete sanitizedBody.creditCard;
    
    // Only include specific fields for certain actions
    if (req.path.includes('food-items')) {
      metadata.foodName = sanitizedBody.name;
      metadata.location = sanitizedBody.storageLocationId;
      metadata.expirationDate = sanitizedBody.expirationDate;
    } else if (req.path.includes('recipes')) {
      metadata.recipeTitle = sanitizedBody.title;
      metadata.source = sanitizedBody.source;
    } else if (req.path.includes('meal-plans')) {
      metadata.mealType = sanitizedBody.mealType;
      metadata.date = sanitizedBody.date;
    }
  }
  
  // Add response data if available
  if (responseBody) {
    if (responseBody.id) {
      metadata.createdId = responseBody.id;
    }
    if (responseBody.error) {
      metadata.error = responseBody.error;
    }
    if (responseBody.message) {
      metadata.message = responseBody.message;
    }
  }
  
  return metadata;
}

/**
 * Activity logging middleware
 * 
 * Automatically logs API requests as activities.
 * Must be added after authentication middleware to have user context.
 */
export function activityLoggingMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Skip excluded routes
  if (excludedRoutes.some(route => req.path.startsWith(route))) {
    return next();
  }
  
  // Skip OPTIONS requests
  if (req.method === 'OPTIONS') {
    return next();
  }
  
  // Skip non-API routes
  if (!req.path.startsWith('/api/')) {
    return next();
  }
  
  // Capture response data
  let responseBody: any = undefined;
  const originalJson = res.json;
  res.json = function(body: any) {
    responseBody = body;
    return originalJson.call(this, body);
  };
  
  // Log when response finishes
  res.on('finish', () => {
    try {
      // Use pattern matching to determine action and entity
      const routeConfig = matchRoutePattern(req.method, req.path);
      
      if (!routeConfig) {
        // If no specific mapping, log as generic API call
        if (req.method !== 'GET') {  // Don't log GET requests by default
          activityLogger.logActivity({
            userId: req.user?.id || null,
            action: ActivityActions.API_CALL,
            entity: 'api',
            entityId: extractEntityId(req.path, req.method),
            metadata: buildMetadata(req, res, responseBody),
            ipAddress: getClientIp(req),
            userAgent: req.headers['user-agent'] as string || null,
            sessionId: getSessionId(req),
          }).catch(error => {
            console.error('[ActivityLoggingMiddleware] Error logging activity:', error);
          });
        }
        return;
      }
      
      // Log specific action
      const entityId = extractEntityId(req.path, req.method) || 
                      responseBody?.id || 
                      req.params?.id || 
                      null;
      
      activityLogger.logActivity({
        userId: req.user?.id || null,
        action: routeConfig.action,
        entity: routeConfig.entity,
        entityId,
        metadata: buildMetadata(req, res, responseBody),
        ipAddress: getClientIp(req),
        userAgent: req.headers['user-agent'] as string || null,
        sessionId: getSessionId(req),
      }).catch(error => {
        console.error('[ActivityLoggingMiddleware] Error logging activity:', error);
      });
      
      // Log AI response for chat messages
      if (req.path === '/api/chat' && req.method === 'POST' && responseBody?.response) {
        activityLogger.logActivity({
          userId: req.user?.id || null,
          action: ActivityActions.AI_RESPONSE_RECEIVED,
          entity: 'chat',
          metadata: {
            responseLength: responseBody.response.length,
            hasRecipes: !!responseBody.recipes,
            recipeCount: responseBody.recipes?.length || 0,
          },
          ipAddress: getClientIp(req),
          userAgent: req.headers['user-agent'] as string || null,
          sessionId: getSessionId(req),
        }).catch(error => {
          console.error('[ActivityLoggingMiddleware] Error logging AI response:', error);
        });
      }
    } catch (error) {
      console.error('[ActivityLoggingMiddleware] Unexpected error:', error);
    }
  });
  
  next();
}

/**
 * Manual activity logging helper
 * 
 * Use this in route handlers for more specific logging
 */
export function logRouteActivity(
  req: Request,
  action: string,
  entity: string,
  entityId?: string,
  additionalMetadata?: Record<string, any>
): void {
  const metadata = {
    ...buildMetadata(req, {} as Response),
    ...additionalMetadata,
  };
  
  activityLogger.logActivity({
    userId: req.user?.id || null,
    action,
    entity,
    entityId,
    metadata,
    ipAddress: getClientIp(req),
    userAgent: req.headers['user-agent'] as string || null,
    sessionId: getSessionId(req),
  }).catch(error => {
    console.error('[logRouteActivity] Error logging activity:', error);
  });
}

// Cleanup on shutdown
process.on('SIGINT', () => {
  activityLogger.flush().then(() => {
    activityLogger.destroy();
  });
});

process.on('SIGTERM', () => {
  activityLogger.flush().then(() => {
    activityLogger.destroy();
  });
});