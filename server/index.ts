// MUST be imported first to suppress TensorFlow logs before any TF imports
import "./suppress-logs";

import express, { type Request, Response, NextFunction } from "express";
import compression from "compression";
// Use modular routes instead of monolithic routes.ts
import { registerModularRoutes } from "./routers";
import { setupVite, serveStatic, log } from "./vite";
import { logRetentionService } from "./services/log-retention.service";
import PushStatusService from "./services/push-status.service";
import { preloadCommonSearches } from "./utils/usdaCache";
import { termDetector } from "./services/term-detector.service";
import { notificationScheduler } from "./services/notification-scheduler.service";
import { initializeEnvironment } from "./config/env-validator";

/**
 * Sanitizes response data for logging by removing sensitive information
 * @param data Response data to sanitize
 * @param depth Current recursion depth (to prevent infinite loops)
 * @returns Sanitized data safe for logging
 */
function sanitizeResponseForLogging(data: any, depth: number = 0): any {
  // Prevent infinite recursion
  if (depth > 10) {
    return '[DEPTH_LIMIT]';
  }
  
  if (!data || typeof data !== 'object') {
    return data;
  }
  
  // More specific sensitive patterns to avoid over-redaction
  const sensitivePatterns = [
    /^password$/i,
    /^(api[_\-]?)?key$/i,
    /^(auth|access|refresh)[_\-]?token$/i,
    /^secret$/i,
    /^authorization$/i,
    /^cookie$/i,
    /^session[_\-]?(id|token)?$/i,
    /^credit[_\-]?card/i,
    /^ssn$/i,
    /^stripe[_\-]?(token|key)/i,
    /^private[_\-]?key$/i,
    /^client[_\-]?secret$/i
  ];
  
  // Clone the object to avoid mutation
  const sanitized: any = Array.isArray(data) ? [] : {};
  
  for (const key in data) {
    if (!data.hasOwnProperty(key)) continue;
    
    // Check if key matches sensitive patterns
    const isSensitive = sensitivePatterns.some(pattern => pattern.test(key));
    
    if (isSensitive) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof data[key] === 'object' && data[key] !== null) {
      // Recursively sanitize nested objects and arrays
      sanitized[key] = sanitizeResponseForLogging(data[key], depth + 1);
    } else if (typeof data[key] === 'string' && data[key].length > 500) {
      // Truncate very long strings
      sanitized[key] = data[key].substring(0, 100) + '...[truncated]';
    } else {
      sanitized[key] = data[key];
    }
  }
  
  return sanitized;
}

const app = express();

// Enable gzip compression for better performance
app.use(compression({
  level: 6, // Balanced compression level
  threshold: 1024, // Only compress responses larger than 1KB
  filter: (req, res) => {
    // Don't compress SSE (Server-Sent Events) or streaming responses
    const contentType = res.getHeader('Content-Type') as string;
    if (contentType && (contentType.includes('text/event-stream') || contentType.includes('stream'))) {
      return false;
    }
    // Use default compression filter for other responses
    return compression.filter(req, res);
  }
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      
      // Only log response body in development mode and sanitize sensitive data
      if (app.get("env") === "development" && capturedJsonResponse) {
        // Create a sanitized copy of the response
        const sanitized = sanitizeResponseForLogging(capturedJsonResponse);
        if (sanitized) {
          logLine += ` :: ${JSON.stringify(sanitized)}`;
        }
      }

      if (logLine.length > 200) {
        logLine = logLine.slice(0, 199) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Initialize and validate environment variables
  initializeEnvironment();
  
  const server = await registerModularRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    
    // Log the error for debugging
    console.error(`Error [${status}]: ${message}`);
    if (err.stack && app.get("env") === "development") {
      console.error(err.stack);
    }

    // Send error response to client
    if (!res.headersSent) {
      res.status(status).json({ 
        message,
        // Include details in development mode for easier debugging
        ...(app.get("env") === "development" && err.details ? { details: err.details } : {})
      });
    }
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`🚀 Server running on port ${port}`);
    
    // Initialize background services silently
    PushStatusService.validateOnStartup();
    logRetentionService.start();
    
    // Warm up USDA cache with common searches (non-blocking)
    if (process.env.CACHE_ENABLED !== 'false') {
      preloadCommonSearches().catch(() => {
        // Silently handle preload failures
      });
    }
    
    // Initialize the cooking term detector
    termDetector.initialize().catch(error => {
      console.error("[Term Detector] Failed to initialize:", error);
    });
    
    // Start the intelligent notification scheduler
    notificationScheduler.start();
  });
})();
