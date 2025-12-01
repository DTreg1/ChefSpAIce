/**
 * API Version Handler
 * 
 * Provides HTTP 301 redirects from legacy endpoints to new RESTful API v1 endpoints.
 * This is a cleaner approach than URL rewriting as it explicitly tells clients
 * about the new endpoint locations.
 */

import { Application, Request, Response, NextFunction } from 'express';

/**
 * Configure API version redirects
 * Uses HTTP 301 (Moved Permanently) to redirect legacy endpoints to new ones
 */
export function setupApiVersionRedirects(app: Application) {
  // === Core Resource Redirects ===
  
  // Inventory (singular to plural)
  app.use('/api/inventory', (req: Request, res: Response, next: NextFunction) => {
    // Check if it's an API request (not a frontend route)
    if (req.accepts(['json', 'html']) === 'json' || req.xhr) {
      const newUrl = `/api/v1/inventories${req.url}`;
      console.log(`[REDIRECT] ${req.method} /api/inventory${req.url} → ${newUrl}`);
      return res.redirect(301, newUrl);
    }
    next();
  });

  // Direct inventory access (shorthand)
  app.use('/inventory', (req: Request, res: Response, next: NextFunction) => {
    if (req.accepts(['json', 'html']) === 'json' || req.xhr) {
      const newUrl = `/api/v1/inventories${req.url}`;
      console.log(`[REDIRECT] ${req.method} /inventory${req.url} → ${newUrl}`);
      return res.redirect(301, newUrl);
    }
    next();
  });

  // Food items
  app.use('/api/food-items', (req: Request, res: Response, next: NextFunction) => {
    if (req.accepts(['json', 'html']) === 'json' || req.xhr) {
      const newUrl = `/api/v1/food-items${req.url}`;
      console.log(`[REDIRECT] ${req.method} /api/food-items${req.url} → ${newUrl}`);
      return res.redirect(301, newUrl);
    }
    next();
  });

  // Storage locations
  app.use('/api/storage-locations', (req: Request, res: Response, next: NextFunction) => {
    if (req.accepts(['json', 'html']) === 'json' || req.xhr) {
      const newUrl = `/api/v1/storage-locations${req.url}`;
      console.log(`[REDIRECT] ${req.method} /api/storage-locations${req.url} → ${newUrl}`);
      return res.redirect(301, newUrl);
    }
    next();
  });

  // === Recipe & Meal Planning Redirects ===
  
  // Recipes
  app.use('/api/recipes', (req: Request, res: Response, next: NextFunction) => {
    if (req.accepts(['json', 'html']) === 'json' || req.xhr) {
      const newUrl = `/api/v1/recipes${req.url}`;
      console.log(`[REDIRECT] ${req.method} /api/recipes${req.url} → ${newUrl}`);
      return res.redirect(301, newUrl);
    }
    next();
  });

  // Meal plans
  app.use('/api/meal-plans', (req: Request, res: Response, next: NextFunction) => {
    if (req.accepts(['json', 'html']) === 'json' || req.xhr) {
      const newUrl = `/api/v1/meal-plans${req.url}`;
      console.log(`[REDIRECT] ${req.method} /api/meal-plans${req.url} → ${newUrl}`);
      return res.redirect(301, newUrl);
    }
    next();
  });

  // Shopping list
  app.use('/api/shopping-list', (req: Request, res: Response, next: NextFunction) => {
    if (req.accepts(['json', 'html']) === 'json' || req.xhr) {
      const newUrl = `/api/v1/shopping-list${req.url}`;
      console.log(`[REDIRECT] ${req.method} /api/shopping-list${req.url} → ${newUrl}`);
      return res.redirect(301, newUrl);
    }
    next();
  });

  // === AI Service Redirects ===
  
  // Chat (legacy path)
  app.use('/api/chat', (req: Request, res: Response, next: NextFunction) => {
    if (req.accepts(['json', 'html']) === 'json' || req.xhr) {
      const newUrl = `/api/v1/chat${req.url}`;
      console.log(`[REDIRECT] ${req.method} /api/chat${req.url} → ${newUrl}`);
      return res.redirect(301, newUrl);
    }
    next();
  });

  // AI endpoints
  app.use('/api/ai', (req: Request, res: Response, next: NextFunction) => {
    if (req.accepts(['json', 'html']) === 'json' || req.xhr) {
      const newUrl = `/api/v1/ai${req.url}`;
      console.log(`[REDIRECT] ${req.method} /api/ai${req.url} → ${newUrl}`);
      return res.redirect(301, newUrl);
    }
    next();
  });

  // Writing services (now under AI generation)
  app.use('/api/writing', (req: Request, res: Response, next: NextFunction) => {
    if (req.accepts(['json', 'html']) === 'json' || req.xhr) {
      const newUrl = `/api/v1/ai/generation${req.url}`;
      console.log(`[REDIRECT] ${req.method} /api/writing${req.url} → ${newUrl}`);
      return res.redirect(301, newUrl);
    }
    next();
  });

  // Nutrition analysis
  app.use('/api/nutrition', (req: Request, res: Response, next: NextFunction) => {
    if (req.accepts(['json', 'html']) === 'json' || req.xhr) {
      const newUrl = `/api/v1/ai/analysis/nutrition${req.url}`;
      console.log(`[REDIRECT] ${req.method} /api/nutrition${req.url} → ${newUrl}`);
      return res.redirect(301, newUrl);
    }
    next();
  });

  // Image analysis
  app.use('/api/image-analysis', (req: Request, res: Response, next: NextFunction) => {
    if (req.accepts(['json', 'html']) === 'json' || req.xhr) {
      const newUrl = `/api/v1/ai/vision${req.url}`;
      console.log(`[REDIRECT] ${req.method} /api/image-analysis${req.url} → ${newUrl}`);
      return res.redirect(301, newUrl);
    }
    next();
  });

  // === Platform Service Redirects ===
  
  // Notifications
  app.use('/api/notifications', (req: Request, res: Response, next: NextFunction) => {
    if (req.accepts(['json', 'html']) === 'json' || req.xhr) {
      const newUrl = `/api/v1/notifications${req.url}`;
      console.log(`[REDIRECT] ${req.method} /api/notifications${req.url} → ${newUrl}`);
      return res.redirect(301, newUrl);
    }
    next();
  });

  // Activities
  app.use('/api/activities', (req: Request, res: Response, next: NextFunction) => {
    if (req.accepts(['json', 'html']) === 'json' || req.xhr) {
      const newUrl = `/api/v1/activities${req.url}`;
      console.log(`[REDIRECT] ${req.method} /api/activities${req.url} → ${newUrl}`);
      return res.redirect(301, newUrl);
    }
    next();
  });

  // Analytics
  app.use('/api/analytics', (req: Request, res: Response, next: NextFunction) => {
    if (req.accepts(['json', 'html']) === 'json' || req.xhr) {
      const newUrl = `/api/v1/analytics${req.url}`;
      console.log(`[REDIRECT] ${req.method} /api/analytics${req.url} → ${newUrl}`);
      return res.redirect(301, newUrl);
    }
    next();
  });

  // === Admin Redirects ===
  
  app.use('/api/admin', (req: Request, res: Response, next: NextFunction) => {
    if (req.accepts(['json', 'html']) === 'json' || req.xhr) {
      const newUrl = `/api/v1/admin${req.url}`;
      console.log(`[REDIRECT] ${req.method} /api/admin${req.url} → ${newUrl}`);
      return res.redirect(301, newUrl);
    }
    next();
  });

  // === External API Redirects ===
  
  // USDA/FDC API - redirects to inventory router which handles FDC endpoints
  app.use('/api/fdc', (req: Request, res: Response, next: NextFunction) => {
    if (req.accepts(['json', 'html']) === 'json' || req.xhr) {
      const newUrl = `/api/v1/inventory/fdc${req.url}`;
      console.log(`[REDIRECT] ${req.method} /api/fdc${req.url} → ${newUrl}`);
      return res.redirect(301, newUrl);
    }
    next();
  });

  // Legacy USDA endpoint - redirect to FDC endpoint
  app.use('/api/usda', (req: Request, res: Response, next: NextFunction) => {
    if (req.accepts(['json', 'html']) === 'json' || req.xhr) {
      const newUrl = `/api/v1/inventory/fdc${req.url}`;
      console.log(`[REDIRECT] ${req.method} /api/usda${req.url} → ${newUrl}`);
      return res.redirect(301, newUrl);
    }
    next();
  });

  // Barcode lookup
  app.use('/api/barcode', (req: Request, res: Response, next: NextFunction) => {
    if (req.accepts(['json', 'html']) === 'json' || req.xhr) {
      const newUrl = `/api/v1/barcodes${req.url}`;
      console.log(`[REDIRECT] ${req.method} /api/barcode${req.url} → ${newUrl}`);
      return res.redirect(301, newUrl);
    }
    next();
  });

  app.use('/api/barcodelookup', (req: Request, res: Response, next: NextFunction) => {
    if (req.accepts(['json', 'html']) === 'json' || req.xhr) {
      const newUrl = `/api/v1/barcodes/lookup${req.url}`;
      console.log(`[REDIRECT] ${req.method} /api/barcodelookup${req.url} → ${newUrl}`);
      return res.redirect(301, newUrl);
    }
    next();
  });

  // === Special Endpoints Redirects ===
  
  // Health check
  app.use('/api/health', (req: Request, res: Response, next: NextFunction) => {
    if (req.accepts(['json', 'html']) === 'json' || req.xhr) {
      const newUrl = `/api/v1/health`;
      console.log(`[REDIRECT] ${req.method} /api/health → ${newUrl}`);
      return res.redirect(301, newUrl);
    }
    next();
  });

  // OAuth endpoints (keep legacy paths for OAuth providers)
  // These don't redirect as they're configured in OAuth providers
  // app.use('/api/auth/*') - handled by OAuth middleware
}

/**
 * Middleware to add deprecation headers for v1 endpoints
 * (for future v2 migration)
 */
export function addDeprecationHeaders(req: Request, res: Response, next: NextFunction) {
  // Only add headers for API v1 endpoints when v2 is launched
  if (req.path.startsWith('/api/v1/') && process.env.API_V2_ENABLED === 'true') {
    const v2Path = req.path.replace('/api/v1/', '/api/v2/');
    res.setHeader('X-API-Version', 'v1');
    res.setHeader('X-API-Deprecation', 'true');
    res.setHeader('X-API-Deprecation-Date', '2025-06-01'); // Future date
    res.setHeader('X-API-New-Version', `v2`);
    res.setHeader('Link', `<${v2Path}>; rel="successor-version"`);
  }
  next();
}

/**
 * Error handler for redirect loops
 */
export function handleRedirectErrors(err: Error, req: Request, res: Response, next: NextFunction) {
  if (err.message && err.message.includes('redirect')) {
    console.error('Redirect error:', err);
    res.status(508).json({
      error: 'Loop Detected',
      message: 'The request resulted in a redirect loop',
      path: req.path
    });
  } else {
    next(err);
  }
}