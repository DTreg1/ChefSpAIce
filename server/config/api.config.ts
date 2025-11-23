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
  // These map old API paths to new v1 paths based on actual router definitions
  LEGACY_PATHS: {
    // Inventory routes (from inventory.router.ts)
    '/api/inventory': '/api/v1/inventories',
    '/api/storage-locations': '/api/v1/storage-locations',
    '/api/food-items': '/api/v1/food-items',
    '/api/food/enrich': '/api/v1/food/enrich',
    '/api/barcodelookup/search': '/api/v1/barcodelookup/search',
    '/api/fdc/search': '/api/v1/fdc/search',
    '/api/fdc/food': '/api/v1/fdc/food',
    '/api/food-categories': '/api/v1/food-categories',
    '/api/shopping-list/items': '/api/v1/shopping-list/items',
    '/api/shopping-list/add-missing': '/api/v1/shopping-list/add-missing',
    
    // Recipe & Chat routes (from recipes.router.ts)
    '/api/chat/messages': '/api/v1/chat/messages',
    '/api/chat': '/api/v1/chat',
    '/api/recipes': '/api/v1/recipes',
    '/api/recipe/generate': '/api/v1/recipes/generate',
    
    // Meal Planning routes (from meal-planning.router.ts)
    '/api/meal-plans': '/api/v1/meal-plans',
    '/api/shopping-list': '/api/v1/shopping-list',
    '/api/shopping-list/clear-checked': '/api/v1/shopping-list/clear-checked',
    '/api/shopping-list/generate-from-meal-plans': '/api/v1/shopping-list/generate-from-meal-plans',
    
    // AI Generation routes (from generation.router.ts mounted at /api/v1/ai)
    '/api/ai/writing/analyze': '/api/v1/ai/writing/analyze',
    '/api/ai/writing/tone': '/api/v1/ai/writing/tone',
    '/api/ai/writing/expand': '/api/v1/ai/writing/expand',
    '/api/ai/summarize': '/api/v1/ai/summarize',
    '/api/ai/translate': '/api/v1/ai/translate',
    '/api/ai/translate/detect': '/api/v1/ai/translate/detect',
    '/api/ai/recipe': '/api/v1/ai/recipe',
    '/api/ai/conversations': '/api/v1/ai/conversations',
    
    // AI Analysis routes (from analysis.router.ts mounted at /api/v1/ai)
    '/api/ai/sentiment': '/api/v1/ai/sentiment',
    '/api/ai/trends': '/api/v1/ai/trends',
    '/api/ai/predictions': '/api/v1/ai/predictions',
    '/api/ai/extraction': '/api/v1/ai/extraction',
    '/api/ai/insights': '/api/v1/ai/insights',
    
    // AI Vision routes (from vision.router.ts mounted at /api/v1/ai)
    '/api/ai/vision/ocr': '/api/v1/ai/ocr',
    '/api/ai/vision/faces': '/api/v1/ai/faces',
    '/api/ai/vision/alt-text': '/api/v1/ai/alt-text',
    '/api/ai/vision/analyze': '/api/v1/ai/images/analyze',
    
    // AI Voice routes (from voice.router.ts mounted at /api/v1/ai)
    '/api/ai/voice/transcribe': '/api/v1/ai/transcribe',
    '/api/ai/voice/command': '/api/v1/ai/voice/commands',
    
    // Analytics & Platform routes
    '/api/analytics': '/api/v1/analytics',
    '/api/push-tokens': '/api/v1/push-tokens',
    '/api/notifications': '/api/v1/notifications',
    '/api/activity-logs': '/api/v1/activity-logs',
    
    // Admin routes
    '/api/admin': '/api/v1/admin',
    '/api/ab': '/api/v1/ab',
    '/api/cohorts': '/api/v1/cohorts',
    '/api/pricing': '/api/v1/pricing',
    '/api/routing': '/api/v1/routing',
    '/api/moderate': '/api/v1/moderate',
    
    // User routes
    '/api/users/profile': '/api/v1/users/profile',
    '/api/users/preferences': '/api/v1/users/preferences',
    
    // Forms & Platform features
    '/api/autocomplete': '/api/v1/autocomplete',
    '/api/validation': '/api/v1/validation',
    '/api/autosave': '/api/v1/autosave',
    '/api/scheduling': '/api/v1/scheduling',
    '/api/batch': '/api/v1/batch',
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
    AI: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 20
    },
    AUTH: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5
    }
  },
  
  // Query parameter standards
  QUERY_PARAMS: {
    PAGINATION: {
      page: 'page',
      limit: 'limit',
      sort: 'sort',
      order: 'order'
    },
    FILTER: {
      search: 'q',
      category: 'category',
      status: 'status',
      startDate: 'start_date',
      endDate: 'end_date'
    }
  },
  
  // Status codes
  STATUS_CODES: {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    MOVED_PERMANENTLY: 301,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_ERROR: 500
  },
  
  // Deprecation settings
  DEPRECATION_MESSAGE: 'This endpoint is deprecated and will be removed after June 1, 2024. Please use the new RESTful API endpoints.',
  DEPRECATION_DATE: '2024-06-01'
};

// Export type definitions
export type ApiConfig = typeof API_CONFIG;
export type LegacyPath = keyof typeof API_CONFIG.LEGACY_PATHS;
export type ResourceName = keyof typeof API_CONFIG.RESOURCE_NAMES;