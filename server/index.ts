import express, { type Request, Response, NextFunction } from "express";
import compression from "compression";
// Use modular routes instead of monolithic routes.ts
import { registerModularRoutes } from "./routers";
import { setupVite, serveStatic, log } from "./vite";
import { logRetentionService } from "./services/log-retention.service";
import PushStatusService from "./services/push-status.service";
import { preloadCommonSearches } from "./utils/usdaCache";
import { termDetector } from "./services/term-detector.service";

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
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
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
    log(`serving on port ${port}`);
    
    // Validate push notification services on startup
    PushStatusService.validateOnStartup();
    
    // Start the log retention service
    logRetentionService.start();
    log("Log retention service started");
    
    // Warm up USDA cache with common searches (non-blocking)
    if (process.env.CACHE_ENABLED !== 'false') {
      preloadCommonSearches().catch(error => {
        console.error("[Cache Warming] Failed to preload common searches:", error);
      });
      log("Cache warming initiated for USDA common searches");
    }
    
    // Initialize the cooking term detector
    termDetector.initialize().then(() => {
      log("✓ Cooking term detector initialized");
    }).catch(error => {
      console.error("[Term Detector] Failed to initialize:", error);
    });
  });
})();
