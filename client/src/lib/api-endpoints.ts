/**
 * API Endpoints Configuration
 * Centralized API endpoint definitions for the frontend
 * All endpoints use the new v1 API versioning
 */

export const API_BASE = '/api/v1';

export const API_ENDPOINTS = {
  // User & Inventory endpoints
  inventory: {
    list: `${API_BASE}/inventories`,
    item: (id: string) => `${API_BASE}/inventories/${id}`,
    storageLocations: `${API_BASE}/storage-locations`,
    foodItems: `${API_BASE}/food-items`,
    foodItem: (id: string) => `${API_BASE}/food-items/${id}`,
    foodCategories: `${API_BASE}/food-categories`,
    enrichFood: `${API_BASE}/food/enrich`,
    foodImages: `${API_BASE}/food-images`,
    onboardingItems: `${API_BASE}/onboarding/common-items`,
  },
  
  // Shopping List endpoints
  shoppingList: {
    list: `${API_BASE}/shopping-list`,
    items: `${API_BASE}/shopping-list/items`,
    item: (id: string) => `${API_BASE}/shopping-list/items/${id}`,
    addMissing: `${API_BASE}/shopping-list/add-missing`,
    clearChecked: `${API_BASE}/shopping-list/clear-checked`,
    generateFromMealPlans: `${API_BASE}/shopping-list/generate-from-meal-plans`,
  },
  
  // Barcode & Food Data endpoints
  barcode: {
    search: `${API_BASE}/barcodelookup/search`,
  },
  
  fdc: {
    search: `${API_BASE}/fdc/search`,
    food: (fdcId: string) => `${API_BASE}/fdc/food/${fdcId}`,
    clearCache: `${API_BASE}/fdc/cache/clear`,
  },
  
  // Recipe & Chat endpoints
  recipes: {
    list: `${API_BASE}/recipes`,
    item: (id: string) => `${API_BASE}/recipes/${id}`,
    generate: `${API_BASE}/recipes/generate`,
    analyze: `${API_BASE}/recipes/analyze`,
    similar: `${API_BASE}/recipes/similar`,
  },
  
  chat: {
    messages: `${API_BASE}/chat/messages`,
    clear: `${API_BASE}/chat/messages`,
    send: `${API_BASE}/chat`,
    stream: `${API_BASE}/chat/stream`,
  },
  
  // Meal Planning endpoints
  mealPlans: {
    list: `${API_BASE}/meal-plans`,
    item: (id: string) => `${API_BASE}/meal-plans/${id}`,
    create: `${API_BASE}/meal-plans`,
    update: (id: string) => `${API_BASE}/meal-plans/${id}`,
    delete: (id: string) => `${API_BASE}/meal-plans/${id}`,
  },
  
  // AI Generation endpoints
  ai: {
    // Text generation
    writing: {
      analyze: `${API_BASE}/ai/writing/analyze`,
      tone: `${API_BASE}/ai/writing/tone`,
      expand: `${API_BASE}/ai/writing/expand`,
    },
    summarize: `${API_BASE}/ai/summarize`,
    translate: `${API_BASE}/ai/translate`,
    detectLanguage: `${API_BASE}/ai/translate/detect`,
    recipe: `${API_BASE}/ai/recipe`,
    
    // Conversations
    conversations: {
      list: `${API_BASE}/ai/conversations`,
      create: `${API_BASE}/ai/conversations`,
      messages: (id: string) => `${API_BASE}/ai/conversations/${id}/messages`,
    },
    
    // Analysis
    sentiment: `${API_BASE}/ai/sentiment`,
    trends: `${API_BASE}/ai/trends`,
    predictions: `${API_BASE}/ai/predictions`,
    extraction: `${API_BASE}/ai/extraction`,
    insights: `${API_BASE}/ai/insights`,
    
    // Vision
    ocr: `${API_BASE}/ai/ocr`,
    faces: `${API_BASE}/ai/faces`,
    altText: `${API_BASE}/ai/alt-text`,
    analyzeImage: `${API_BASE}/ai/images/analyze`,
    
    // Voice
    transcribe: `${API_BASE}/ai/transcribe`,
    voiceCommands: `${API_BASE}/ai/voice/commands`,
  },
  
  // Nutrition endpoints
  nutrition: {
    data: `${API_BASE}/nutrition-data`,
    calculate: `${API_BASE}/nutrition/calculate`,
    goals: `${API_BASE}/nutrition/goals`,
    tracking: `${API_BASE}/nutrition/tracking`,
  },
  
  // User & Auth endpoints
  auth: {
    login: '/auth/login', // OAuth handled separately, not versioned
    logout: '/auth/logout',
    callback: '/auth/callback',
    session: '/auth/session',
  },
  
  users: {
    profile: `${API_BASE}/users/profile`,
    preferences: `${API_BASE}/users/preferences`,
    updateProfile: `${API_BASE}/users/profile`,
    updatePreferences: `${API_BASE}/users/preferences`,
  },
  
  // Admin endpoints
  admin: {
    users: `${API_BASE}/admin/users`,
    user: (id: string) => `${API_BASE}/admin/users/${id}`,
    analytics: `${API_BASE}/admin/analytics`,
    experiments: `${API_BASE}/admin/ab-tests`,
    cohorts: `${API_BASE}/admin/cohorts`,
    maintenance: `${API_BASE}/admin/maintenance`,
    pricing: `${API_BASE}/admin/pricing`,
    moderation: `${API_BASE}/admin/moderation`,
    tickets: `${API_BASE}/admin/tickets`,
    seed: `${API_BASE}/admin/seed`,
  },
  
  // Platform & Analytics endpoints
  analytics: {
    events: `${API_BASE}/analytics`,
    trackEvent: `${API_BASE}/analytics/events`,
    metrics: `${API_BASE}/analytics/metrics`,
    reports: `${API_BASE}/analytics/reports`,
  },
  
  activityLogs: {
    list: `${API_BASE}/activity-logs`,
    search: `${API_BASE}/activity-logs/search`,
  },
  
  notifications: {
    list: `${API_BASE}/notifications`,
    markRead: (id: string) => `${API_BASE}/notifications/${id}/read`,
    preferences: `${API_BASE}/notifications/preferences`,
    tokens: `${API_BASE}/push-tokens`,
    registerToken: `${API_BASE}/push-tokens`,
    intelligent: `${API_BASE}/notifications/intelligent`,
  },
  
  // Feedback endpoints
  feedback: {
    submit: `${API_BASE}/feedback`,
    list: `${API_BASE}/feedback`,
    item: (id: string) => `${API_BASE}/feedback/${id}`,
  },
  
  // Appliances & Kitchen endpoints
  appliances: {
    list: `${API_BASE}/appliances`,
    item: (id: string) => `${API_BASE}/appliances/${id}`,
    userAppliances: `${API_BASE}/user-appliances`,
  },
  
  cookingTerms: {
    search: `${API_BASE}/cooking-terms`,
    term: (id: string) => `${API_BASE}/cooking-terms/${id}`,
  },
  
  // Forms & Utilities endpoints
  autocomplete: {
    suggestions: `${API_BASE}/autocomplete`,
    ingredients: `${API_BASE}/autocomplete/ingredients`,
    recipes: `${API_BASE}/autocomplete/recipes`,
  },
  
  validation: {
    validate: `${API_BASE}/validation`,
    rules: `${API_BASE}/validation/rules`,
  },
  
  autosave: {
    save: `${API_BASE}/autosave`,
    recover: `${API_BASE}/autosave/recover`,
  },
  
  // Batch processing endpoints
  batch: {
    process: `${API_BASE}/batch`,
    status: (id: string) => `${API_BASE}/batch/${id}/status`,
    result: (id: string) => `${API_BASE}/batch/${id}/result`,
  },
  
  // Scheduling endpoints
  scheduling: {
    schedules: `${API_BASE}/scheduling`,
    schedule: (id: string) => `${API_BASE}/scheduling/${id}`,
    create: `${API_BASE}/scheduling`,
  },
  
  // Recommendations
  recommendations: {
    recipes: `${API_BASE}/recommendations/recipes`,
    ingredients: `${API_BASE}/recommendations/ingredients`,
    mealPlans: `${API_BASE}/recommendations/meal-plans`,
  },
  
  // Natural Query
  naturalQuery: {
    search: `${API_BASE}/natural-query`,
  },
  
  // Health & System endpoints
  health: `${API_BASE}/health`,
  info: `${API_BASE}/info`,
};

/**
 * Helper function to build query strings
 */
export function buildQueryString(params: Record<string, any>): string {
  const filtered = Object.entries(params)
    .filter(([_, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
  
  return filtered.length > 0 ? `?${filtered.join('&')}` : '';
}

/**
 * Helper function to get full URL with query parameters
 */
export function getApiUrl(endpoint: string, params?: Record<string, any>): string {
  return params ? `${endpoint}${buildQueryString(params)}` : endpoint;
}