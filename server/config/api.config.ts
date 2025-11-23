/**
 * API Configuration
 * Centralized configuration for API versioning and routing
 */

export const API_CONFIG = {
  // API Version Configuration
  VERSION: 'v1',
  BASE_PATH: '/api',
  VERSIONED_BASE: '/api/v1',
  
  // Legacy paths for backward compatibility
  // Maps old paths to actual new v1 paths (not ideal RESTful, but what exists)
  LEGACY_PATHS: {
    // User & Inventory (actual paths after mounting at /api/v1)
    '/api/inventory': '/api/v1/inventory',
    '/api/storage-locations': '/api/v1/storage-locations',
    '/api/food-items': '/api/v1/food-items',
    '/api/food/enrich': '/api/v1/food/enrich',
    '/api/barcodelookup/search': '/api/v1/barcodelookup/search',
    '/api/fdc/search': '/api/v1/fdc/search',
    '/api/fdc/food': '/api/v1/fdc/food',
    
    // Recipes & Chat (actual paths after mounting at /api/v1)
    '/api/chat/messages': '/api/v1/chats/messages',
    '/api/chat': '/api/v1/chats',
    '/api/recipes': '/api/v1/recipes',
    '/api/recipe/generate': '/api/v1/recipes/generate',
    
    // Meal Planning (actual paths after mounting at /api/v1)
    '/api/meal-plans': '/api/v1/meal-plans',
    '/api/shopping-list/items': '/api/v1/shopping-list/items',
    '/api/shopping-list/add-missing': '/api/v1/shopping-list/add-missing',
    '/api/shopping-list/clear-checked': '/api/v1/shopping-list/clear-checked',
    '/api/shopping-list/generate-from-meal-plans': '/api/v1/shopping-list/generate-from-meal-plans',
    
    // AI Services
    '/api/ai/generation': '/api/v1/ai/text',
    '/api/ai/vision': '/api/v1/ai/vision',
    '/api/ai/voice': '/api/v1/ai/voice',
    '/api/ai/analysis': '/api/v1/ai/analysis',
    '/api/drafts': '/api/v1/ai/drafts',
    '/api/excerpts': '/api/v1/ai/excerpts',
    
    // Analytics & Platform
    '/api/analytics': '/api/v1/analytics/events',
    '/api/push-tokens': '/api/v1/notifications/tokens',
    '/api/notifications': '/api/v1/notifications',
    '/api/activity-logs': '/api/v1/activities',
    
    // Admin
    '/api/admin': '/api/v1/admin',
    '/api/ab': '/api/v1/admin/ab-tests',
    '/api/cohorts': '/api/v1/admin/cohorts',
    '/api/pricing': '/api/v1/admin/pricing',
    '/api/routing': '/api/v1/admin/tickets',
    '/api/moderate': '/api/v1/admin/moderation',
  },
  
  // Resource naming conventions
  RESOURCE_NAMES: {
    // Plural resource names
    USERS: 'users',
    INVENTORIES: 'inventories',
    RECIPES: 'recipes',
    MEAL_PLANS: 'meal-plans',
    SHOPPING_LISTS: 'shopping-lists',
    NOTIFICATIONS: 'notifications',
    ACTIVITIES: 'activities',
    ANALYTICS: 'analytics',
    
    // Nested resource patterns
    NESTED: {
      USER_RECIPES: '/users/:userId/recipes',
      RECIPE_REVIEWS: '/recipes/:recipeId/reviews',
      CHAT_MESSAGES: '/chats/:chatId/messages',
      SHOPPING_LIST_ITEMS: '/shopping-lists/:listId/items',
      MEAL_PLAN_RECIPES: '/meal-plans/:planId/recipes',
    }
  },
  
  // HTTP Methods mapping
  METHODS: {
    LIST: 'GET',     // GET /resources
    GET: 'GET',      // GET /resources/:id
    CREATE: 'POST',  // POST /resources
    UPDATE: 'PUT',   // PUT /resources/:id
    PATCH: 'PATCH',  // PATCH /resources/:id
    DELETE: 'DELETE' // DELETE /resources/:id
  },
  
  // Response format standards
  RESPONSE_FORMAT: {
    // Pagination format
    PAGINATION: {
      data: [],
      meta: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false
      }
    },
    // Error format
    ERROR: {
      error: {
        code: '',
        message: '',
        details: {}
      },
      timestamp: new Date().toISOString()
    },
    // Success format
    SUCCESS: {
      data: {},
      message: '',
      timestamp: new Date().toISOString()
    }
  },
  
  // Rate limiting configuration
  RATE_LIMITS: {
    DEFAULT: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100
    },
    STRICT: {
      windowMs: 15 * 60 * 1000,
      max: 20
    },
    AI: {
      windowMs: 60 * 1000, // 1 minute
      max: 10
    }
  },
  
  // Deprecation warnings
  DEPRECATION_DATE: '2024-06-01',
  DEPRECATION_MESSAGE: 'This endpoint is deprecated and will be removed after June 1, 2024. Please use the new RESTful API endpoints.'
};

// Type definitions for API responses
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ApiSuccessResponse<T = any> {
  data: T;
  message?: string;
  timestamp: string;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}

// Helper function to create standardized responses
export const createApiResponse = {
  success: <T>(data: T, message?: string): ApiSuccessResponse<T> => ({
    data,
    message,
    timestamp: new Date().toISOString()
  }),
  
  error: (code: string, message: string, details?: any): ApiErrorResponse => ({
    error: {
      code,
      message,
      details
    },
    timestamp: new Date().toISOString()
  }),
  
  paginated: <T>(
    data: T[], 
    page: number, 
    limit: number, 
    total: number
  ): PaginatedResponse<T> => ({
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1
    }
  })
};