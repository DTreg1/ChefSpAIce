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
    // === EXISTING LEGACY PATHS ===
    // Inventory routes (from inventory.router.ts)
    '/api/inventory': '/api/v1/inventory',
    '/api/storage-locations': '/api/v1/storage-locations',
    '/api/food-items': '/api/v1/food-items',
    '/api/food-categories': '/api/v1/food-categories',
    '/api/fdc/search': '/api/v1/fdc/search',
    '/api/fdc/food': '/api/v1/fdc/food',
    
    // Recipe & Chat routes (from recipes.router.ts)
    '/api/chat': '/api/v1/chat',
    '/api/recipes': '/api/v1/recipes',
    
    // Meal Planning routes (from meal-planning.router.ts)
    '/api/meal-plans': '/api/v1/meal-plans',
    
    // Analytics & Platform routes
    '/api/analytics': '/api/v1/analytics',
    '/api/push-tokens': '/api/v1/notifications/tokens',
    '/api/notifications': '/api/v1/notifications',
    '/api/activity-logs': '/api/v1/activities',
    
    // Admin routes
    '/api/admin': '/api/v1/admin',
    '/api/ab': '/api/v1/admin/experiments',
    '/api/cohorts': '/api/v1/admin/cohorts',
    '/api/pricing': '/api/v1/admin/pricing',
    '/api/routing': '/api/v1/admin/tickets',
    '/api/moderate': '/api/v1/admin/moderation',
    
    // User routes
    '/api/users/profile': '/api/v1/users/profile',
    '/api/users/preferences': '/api/v1/users/preferences',
    
    // Forms & Platform features
    '/api/autocomplete': '/api/v1/autocomplete',
    '/api/validation': '/api/v1/validation',
    '/api/autosave': '/api/v1/autosave',
    '/api/scheduling': '/api/v1/scheduling',
    '/api/batch': '/api/v1/batch',
    
    // === NEW STANDARDIZED MAPPINGS ===
    // Non-RESTful to RESTful transformations
    
    // Shopping List Legacy Mappings (maintain single-list semantics)
    '/api/shopping-list': '/api/v1/shopping-list',
    '/api/shopping-list/items': '/api/v1/shopping-list/items',
    '/api/shopping-list/add-missing': '/api/v1/shopping-list/add-missing',
    '/api/shopping-list/clear-checked': '/api/v1/shopping-list/clear-checked',
    '/api/shopping-list/generate-from-meal-plans': '/api/v1/shopping-list/generate-from-meal-plans',
    
    // Food & Inventory Action Endpoints
    '/api/v1/food/enrich': '/api/v1/food-items/enrichment',
    '/api/food/enrich': '/api/v1/food-items/enrichment',
    '/api/v1/fdc/cache/clear': '/api/v1/system/caches/fdc',
    '/api/fdc/cache/clear': '/api/v1/system/caches/fdc',
    '/api/v1/barcodelookup/search': '/api/v1/barcodes',
    '/api/barcodelookup/search': '/api/v1/barcodes',
    '/api/v1/onboarding/common-items': '/api/v1/food-items/common',
    '/api/onboarding/common-items': '/api/v1/food-items/common',
    '/api/v1/food-images': '/api/v1/food-items/images',
    '/api/food-images': '/api/v1/food-items/images',
    
    // Chat Legacy Mappings (maintain existing structure)
    '/api/chat/messages': '/api/v1/chat/messages',
    '/api/chats/stream': '/api/v1/chats/stream',
    '/api/chats/health': '/api/v1/chats/health',
    '/api/chats/reset': '/api/v1/chats/reset',
    
    // Recipe Generation
    '/api/v1/recipe/generate': '/api/v1/recipes/generate',
    '/api/recipe/generate': '/api/v1/recipes/generate',
    
    // AI Services Standardization
    '/api/v1/ai/text/writing/analyze': '/api/v1/ai/analyses',
    '/api/ai/writing/analyze': '/api/v1/ai/analyses',
    '/api/v1/ai/text/writing/tone': '/api/v1/ai/transformations',
    '/api/ai/writing/tone': '/api/v1/ai/transformations',
    '/api/v1/ai/text/writing/expand': '/api/v1/ai/transformations',
    '/api/ai/writing/expand': '/api/v1/ai/transformations',
    '/api/v1/ai/text/summarize': '/api/v1/ai/summaries',
    '/api/ai/summarize': '/api/v1/ai/summaries',
    '/api/v1/ai/text/translate': '/api/v1/ai/translations',
    '/api/ai/translate': '/api/v1/ai/translations',
    '/api/v1/ai/text/translate/detect': '/api/v1/ai/language-detections',
    '/api/ai/translate/detect': '/api/v1/ai/language-detections',
    '/api/v1/ai/text/recipe': '/api/v1/ai/recipes/generate',
    '/api/ai/recipe': '/api/v1/ai/recipes/generate',
    '/api/v1/ai/text/stats': '/api/v1/ai/statistics',
    '/api/ai/stats': '/api/v1/ai/statistics',
    
    // AI Conversations (remove /text prefix)
    '/api/v1/ai/text/conversations': '/api/v1/ai/conversations',
    '/api/ai/conversations': '/api/v1/ai/conversations',
    
    // AI Analysis routes
    '/api/v1/ai/sentiment': '/api/v1/ai/analyses',
    '/api/ai/sentiment': '/api/v1/ai/analyses',
    '/api/v1/ai/trends': '/api/v1/ai/analyses',
    '/api/ai/trends': '/api/v1/ai/analyses',
    '/api/v1/ai/predictions': '/api/v1/ai/analyses',
    '/api/ai/predictions': '/api/v1/ai/analyses',
    '/api/v1/ai/extraction': '/api/v1/ai/extractions',
    '/api/ai/extraction': '/api/v1/ai/extractions',
    '/api/v1/ai/insights': '/api/v1/ai/insights',
    '/api/ai/insights': '/api/v1/ai/insights',
    
    // AI Vision routes standardization
    '/api/v1/ai/vision/ocr': '/api/v1/ai/ocr',
    '/api/ai/vision/ocr': '/api/v1/ai/ocr',
    '/api/v1/ai/vision/faces': '/api/v1/ai/face-detections',
    '/api/ai/vision/faces': '/api/v1/ai/face-detections',
    '/api/v1/ai/vision/alt-text': '/api/v1/ai/alt-texts',
    '/api/ai/vision/alt-text': '/api/v1/ai/alt-texts',
    '/api/v1/ai/vision/analyze': '/api/v1/ai/image-analyses',
    '/api/ai/vision/analyze': '/api/v1/ai/image-analyses',
    
    // AI Voice routes standardization
    '/api/v1/ai/voice/transcribe': '/api/v1/ai/transcriptions',
    '/api/ai/voice/transcribe': '/api/v1/ai/transcriptions',
    '/api/v1/ai/voice/command': '/api/v1/ai/voice-commands',
    '/api/ai/voice/command': '/api/v1/ai/voice-commands',
    
    // Admin User Management
    '/api/v1/admin/users/:userId/admin': '/api/v1/admin/users/:userId',
    '/api/admin/users/:userId/admin': '/api/v1/admin/users/:userId',
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