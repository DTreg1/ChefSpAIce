/**
 * RESTful Router Middleware
 * Maps RESTful API v1 paths to existing router handlers
 */

import { Request, Response, NextFunction, Router } from "express";
import { API_CONFIG } from "../config/api.config";

/**
 * Creates a RESTful route mapping layer
 * This allows us to expose RESTful paths while keeping existing router logic intact
 */
export function createRestfulRouter(existingRouter: Router): Router {
  const restfulRouter = Router();

  // Map RESTful paths to existing handlers
  const routeMappings: Array<{
    method: string;
    restfulPath: string;
    actualPath: string;
  }> = [
    // Inventory mappings
    { method: "GET", restfulPath: "/inventories", actualPath: "/inventory" },
    {
      method: "GET",
      restfulPath: "/inventories/:id",
      actualPath: "/food-items",
    },
    { method: "POST", restfulPath: "/inventories", actualPath: "/food-items" },
    {
      method: "PUT",
      restfulPath: "/inventories/:id",
      actualPath: "/food-items/:id",
    },
    {
      method: "DELETE",
      restfulPath: "/inventories/:id",
      actualPath: "/food-items/:id",
    },
    {
      method: "POST",
      restfulPath: "/inventories/batch",
      actualPath: "/inventory/batch",
    },
    {
      method: "POST",
      restfulPath: "/inventories/enrichment",
      actualPath: "/food/enrich",
    },

    // Storage locations
    {
      method: "GET",
      restfulPath: "/storage-locations",
      actualPath: "/storage-locations",
    },
    {
      method: "POST",
      restfulPath: "/storage-locations",
      actualPath: "/storage-locations",
    },
    {
      method: "PUT",
      restfulPath: "/storage-locations/:id",
      actualPath: "/storage-locations/:id",
    },
    {
      method: "DELETE",
      restfulPath: "/storage-locations/:id",
      actualPath: "/storage-locations/:id",
    },

    // Food data (USDA)
    {
      method: "GET",
      restfulPath: "/food-data/search",
      actualPath: "/fdc/search",
    },
    {
      method: "GET",
      restfulPath: "/food-data/:fdcId",
      actualPath: "/fdc/food/:fdcId",
    },
    {
      method: "POST",
      restfulPath: "/food-data/cache/clear",
      actualPath: "/fdc/cache/clear",
    },

    // Barcodes
    {
      method: "GET",
      restfulPath: "/barcodes/search",
      actualPath: "/barcodelookup/search",
    },

    // Recipes
    { method: "GET", restfulPath: "/recipes", actualPath: "/recipes" },
    { method: "GET", restfulPath: "/recipes/:id", actualPath: "/recipes/:id" },
    { method: "POST", restfulPath: "/recipes", actualPath: "/recipes" },
    { method: "PUT", restfulPath: "/recipes/:id", actualPath: "/recipes/:id" },
    {
      method: "DELETE",
      restfulPath: "/recipes/:id",
      actualPath: "/recipes/:id",
    },
    {
      method: "POST",
      restfulPath: "/ai/recipes/generate",
      actualPath: "/recipes/generate",
    },

    // Chat
    { method: "GET", restfulPath: "/chats", actualPath: "/chat/sessions" },
    { method: "POST", restfulPath: "/chats", actualPath: "/chat/sessions" },
    {
      method: "GET",
      restfulPath: "/chats/:chatId",
      actualPath: "/chat/sessions/:chatId",
    },
    {
      method: "DELETE",
      restfulPath: "/chats/:chatId",
      actualPath: "/chat/sessions/:chatId",
    },
    {
      method: "GET",
      restfulPath: "/chats/:chatId/messages",
      actualPath: "/chat/messages",
    },
    {
      method: "POST",
      restfulPath: "/chats/:chatId/messages",
      actualPath: "/chat/messages",
    },
    {
      method: "DELETE",
      restfulPath: "/chats/:chatId/messages",
      actualPath: "/chat/messages",
    },

    // Meal plans
    { method: "GET", restfulPath: "/meal-plans", actualPath: "/meal-plans" },
    {
      method: "GET",
      restfulPath: "/meal-plans/:id",
      actualPath: "/meal-plans/:id",
    },
    { method: "POST", restfulPath: "/meal-plans", actualPath: "/meal-plans" },
    {
      method: "PUT",
      restfulPath: "/meal-plans/:id",
      actualPath: "/meal-plans/:id",
    },
    {
      method: "DELETE",
      restfulPath: "/meal-plans/:id",
      actualPath: "/meal-plans/:id",
    },

    // Shopping lists
    {
      method: "GET",
      restfulPath: "/shopping-lists",
      actualPath: "/shopping-list",
    },
    {
      method: "GET",
      restfulPath: "/shopping-lists/:listId/items",
      actualPath: "/shopping-list/items",
    },
    {
      method: "POST",
      restfulPath: "/shopping-lists/:listId/items",
      actualPath: "/shopping-list/items",
    },
    {
      method: "PUT",
      restfulPath: "/shopping-lists/:listId/items/:id",
      actualPath: "/shopping-list/items/:id",
    },
    {
      method: "DELETE",
      restfulPath: "/shopping-lists/:listId/items/:id",
      actualPath: "/shopping-list/items/:id",
    },
    {
      method: "POST",
      restfulPath: "/shopping-lists/:listId/items/bulk",
      actualPath: "/shopping-list/add-missing",
    },
    {
      method: "DELETE",
      restfulPath: "/shopping-lists/:listId/items",
      actualPath: "/shopping-list/clear-checked",
    },
    {
      method: "POST",
      restfulPath: "/shopping-lists/generate",
      actualPath: "/shopping-list/generate-from-meal-plans",
    },
  ];

  // Apply mappings
  routeMappings.forEach(({ method, restfulPath, actualPath }) => {
    const httpMethod = method.toLowerCase() as
      | "get"
      | "post"
      | "put"
      | "delete"
      | "patch";

    // Create a middleware that rewrites the URL
    const rewriteMiddleware = (
      req: Request,
      res: Response,
      next: NextFunction,
    ) => {
      // Store original URL for logging
      const originalUrl = req.url;

      // Rewrite URL to actual path
      req.url = req.url.replace(restfulPath, actualPath);

      // Add header to indicate this was a rewritten request
      res.setHeader("X-Restful-Mapping", `${restfulPath} -> ${actualPath}`);

      // Log in development
      if (process.env.NODE_ENV === "development") {
        console.log(`[RESTful Mapping] ${method} ${originalUrl} -> ${req.url}`);
      }

      next();
    };

    // Register the route with the rewrite middleware
    (restfulRouter as any)[httpMethod](
      restfulPath,
      rewriteMiddleware,
      existingRouter,
    );
  });

  // Pass through any unmapped routes
  restfulRouter.use(existingRouter);

  return restfulRouter;
}

/**
 * Middleware to add RESTful response formatting
 */
export function restfulResponseMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  // Store original json method
  const originalJson = res.json.bind(res);

  // Override json method to format responses
  res.json = function (body: any) {
    // Check if this is a v1 API call
    if (req.path.startsWith(API_CONFIG.VERSIONED_BASE)) {
      // If body doesn't already have our format, wrap it
      if (!body.data && !body.error) {
        // Check if it's an error response
        if (res.statusCode >= 400) {
          body = {
            error: {
              code: body.code || "ERROR",
              message: body.message || body.error || "An error occurred",
              details: body.details || body,
            },
            timestamp: new Date().toISOString(),
          };
        } else {
          // Success response
          body = {
            data: body,
            timestamp: new Date().toISOString(),
          };
        }
      }
    }

    return originalJson(body);
  };

  next();
}
