import express from "express";
import type { Request, Response, NextFunction } from "express";
import helmet from "helmet";
import compression from "compression";
import fileUpload from "express-fileupload";
import cookieParser from "cookie-parser";
import { createProxyMiddleware } from "http-proxy-middleware";
import { registerRoutes } from "./routes";
import * as fs from "fs";
import * as path from "path";
import { Client } from "pg";
import { runMigrations } from "stripe-replit-sync";
import { getStripeSync } from "./stripe/stripeClient";
import { WebhookHandlers } from "./stripe/webhookHandlers";
import { startTrialExpirationJob } from "./jobs/trialExpirationJob";
import { logger } from "./lib/logger";
import { AppError, globalErrorHandler } from "./middleware/errorHandler";

const app = express();

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

function setupCors(app: express.Application) {
  app.use((req, res, next) => {
    const origins = new Set<string>();

    if (process.env.REPLIT_DEV_DOMAIN) {
      origins.add(`https://${process.env.REPLIT_DEV_DOMAIN}`);
    }

    if (process.env.REPLIT_DOMAINS) {
      process.env.REPLIT_DOMAINS.split(",").forEach((d: string) => {
        origins.add(`https://${d.trim()}`);
      });
    }

    // Allow localhost origins for development
    origins.add("http://localhost:8081");
    origins.add("http://127.0.0.1:8081");
    origins.add("http://localhost:5000");
    origins.add("http://127.0.0.1:5000");

    const origin = req.header("origin");

    // Add production domain
    origins.add("https://chefspaice.com");
    origins.add("https://www.chefspaice.com");

    if (origin && origins.has(origin)) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS",
      );
      res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept, X-Requested-With");
      res.header("Access-Control-Allow-Credentials", "true");
    }

    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }

    next();
  });
}

function setupBodyParsing(app: express.Application) {
  app.use(cookieParser());
  
  // 1 MB default limit protects against oversized payloads while covering
  // typical API requests (JSON data, form submissions, sync payloads).
  // The recipe-image upload route overrides this with a higher limit below.
  app.use(
    express.json({
      limit: "1mb",
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );

  // 1 MB limit for URL-encoded form data, consistent with the JSON limit.
  app.use(express.urlencoded({ extended: false, limit: "1mb" }));

  app.use(
    fileUpload({
      limits: { fileSize: 10 * 1024 * 1024 },
      abortOnLimit: true,
    }),
  );
}

function setupRequestLogging(app: express.Application) {
  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse: Record<string, unknown> | undefined = undefined;

    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };

    res.on("finish", () => {
      if (!path.startsWith("/api")) return;

      const duration = Date.now() - start;

      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      logger.info(logLine);
    });

    next();
  });
}

function getAppName(): string {
  try {
    const appJsonPath = path.resolve(process.cwd(), "app.json");
    const appJsonContent = fs.readFileSync(appJsonPath, "utf-8");
    const appJson = JSON.parse(appJsonContent);
    return appJson.expo?.name || "App Landing Page";
  } catch {
    return "App Landing Page";
  }
}


function serveLandingPage({
  req,
  res,
  landingPageTemplate,
  appName,
}: {
  req: Request;
  res: Response;
  landingPageTemplate: string;
  appName: string;
}) {
  const forwardedProto = req.header("x-forwarded-proto");
  const protocol = forwardedProto || req.protocol || "https";
  const forwardedHost = req.header("x-forwarded-host");
  const host = forwardedHost || req.get("host");
  const baseUrl = `${protocol}://${host}`;
  const expsUrl = `${host}`;

  logger.debug("Landing page URL resolution", { baseUrl, expsUrl });

  const html = landingPageTemplate
    .replace(/BASE_URL_PLACEHOLDER/g, baseUrl)
    .replace(/EXPS_URL_PLACEHOLDER/g, expsUrl)
    .replace(/APP_NAME_PLACEHOLDER/g, appName);

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
}

function isMobileUserAgent(userAgent: string | undefined): boolean {
  if (!userAgent) return false;
  const mobilePatterns = /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i;
  return mobilePatterns.test(userAgent);
}

function isWebRoute(pathname: string): boolean {
  const cleanPath = pathname.toLowerCase().split("?")[0];
  const webRoutes = ["/", "/about", "/privacy", "/terms", "/attributions", "/subscription-success", "/subscription-canceled", "/onboarding", "/logo-preview", "/support"];
  return webRoutes.includes(cleanPath);
}

function configureExpoRouting(app: express.Application) {
  const templatePath = path.resolve(
    process.cwd(),
    "server",
    "templates",
    "landing-page.html",
  );
  const landingPageTemplate = fs.readFileSync(templatePath, "utf-8");
  const appName = getAppName();
  const isDevelopment = process.env.NODE_ENV !== "production";

  // Check if Expo web build exists for production
  const expoWebBuildPath = path.resolve(process.cwd(), "dist", "web");
  const expoWebBuildExists = fs.existsSync(path.join(expoWebBuildPath, "index.html"));
  
  if (!isDevelopment && expoWebBuildExists) {
    logger.info("Found Expo web build", { path: expoWebBuildPath });
  }

  let metroProxy: ReturnType<typeof createProxyMiddleware> | null = null;
  
  if (isDevelopment) {
    metroProxy = createProxyMiddleware({
      target: "http://localhost:8081",
      changeOrigin: true,
      ws: true,
      on: {
        error: (err: Error, req: any, res: any) => {
          logger.error("Metro proxy error", { error: err.message });
          if (res && !res.headersSent && res.writeHead) {
            res.writeHead(502, { "Content-Type": "text/html" });
            res.end(`
    <html>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                  display: flex; align-items: center; justify-content: center;
                  height: 100vh; margin: 0; background: #f8f9fa; color: #333;">
      <div style="text-align: center; padding: 40px; max-width: 400px;">
        <div style="font-size: 48px; margin-bottom: 16px;">⏳</div>
        <h1 style="font-size: 24px; margin-bottom: 8px;">Starting up...</h1>
        <p style="font-size: 16px; color: #666; line-height: 1.5;">
          The development server is loading. Please refresh in a moment.
        </p>
        <button onclick="location.reload()"
                style="margin-top: 20px; padding: 10px 24px; font-size: 14px;
                       border: 1px solid #ddd; border-radius: 6px; background: white;
                       cursor: pointer;">
          Refresh
        </button>
      </div>
    </body>
    </html>
  `);
          }
        },
      },
    });
  }

  // In production with Expo web build, serve static files from dist/web
  if (!isDevelopment && expoWebBuildExists) {
    // Serve static assets from the Expo web build
    app.use("/_expo", express.static(path.join(expoWebBuildPath, "_expo"), {
      maxAge: "1y",
      immutable: true,
    }));
    app.use("/assets", express.static(path.join(expoWebBuildPath, "assets"), {
      maxAge: "1y",
    }));
  }

  app.use((req: Request, res: Response, next: NextFunction) => {
    // Debug logging for API routes
    if (req.path.startsWith("/api/test")) {
      logger.debug("Test API route", { method: req.method, path: req.path });
    }
    
    if (req.path.startsWith("/api")) {
      return next();
    }

    const userAgent = req.header("user-agent");
    const isMobile = isMobileUserAgent(userAgent);
    
    // Mobile browsers get QR code page for Expo Go installation
    if (req.path === "/" && isMobile) {
      return serveLandingPage({
        req,
        res,
        landingPageTemplate,
        appName,
      });
    }

    const isMetroAsset = req.path.startsWith("/_expo") || 
                          req.path.startsWith("/node_modules") || 
                          req.path.endsWith(".bundle") || 
                          req.path.endsWith(".map") ||
                          req.path.endsWith(".js") ||
                          req.path.endsWith(".css") ||
                          req.path.endsWith(".json");

    // Check if this is a static asset we serve directly (not Metro)
    const isStaticAsset = req.path.startsWith("/assets/showcase/");

    // Desktop browsers get the React Native web app via Metro (development only)
    if (isDevelopment && metroProxy && !isStaticAsset) {
      // Proxy web routes and all potential Metro assets to Metro bundler
      if (isWebRoute(req.path) || isMetroAsset || req.path.startsWith("/assets/")) {
        return metroProxy(req, res, next);
      }
    } else if (isWebRoute(req.path)) {
      // In production with Expo web build, serve the built index.html
      if (expoWebBuildExists) {
        // Prevent caching of index.html so users always get the latest version
        res.set({
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        });
        return res.sendFile(path.join(expoWebBuildPath, "index.html"));
      }
      // Fallback to static landing page template if no web build
      return serveLandingPage({
        req,
        res,
        landingPageTemplate,
        appName,
      });
    }

    next();
  });

  logger.info("Expo routing ready", { mode: isDevelopment ? "dev: Metro proxy" : expoWebBuildExists ? "prod: Expo web build" : "prod: landing page fallback" });
}

function configureStaticFiles(app: express.Application) {
  app.use("/assets", express.static(path.resolve(process.cwd(), "assets")));
  app.use("/attached_assets", express.static(path.resolve(process.cwd(), "attached_assets")));
}

function setupErrorHandler(app: express.Application) {
  app.use(globalErrorHandler);
}

async function warmupDatabase(databaseUrl: string, retries = 3, delay = 2000): Promise<boolean> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const client = new Client({
      connectionString: databaseUrl,
      connectionTimeoutMillis: 5000,
    });
    
    try {
      await client.connect();
      await client.query('SELECT 1');
      await client.end();
      logger.info("Database connected", { attempt, retries });
      return true;
    } catch (error) {
      try {
        await client.end();
      } catch {}
      
      if (attempt === retries) {
        logger.error("Failed to connect to database after retries", { error: error instanceof Error ? error.message : String(error) });
        return false;
      }
      logger.info("Database connection failed, retrying", { attempt, retries });
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  return false;
}

async function initStripe(retries = 3, delay = 2000) {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    logger.info("DATABASE_URL not found, skipping Stripe initialization");
    return;
  }

  const dbReady = await warmupDatabase(databaseUrl);
  if (!dbReady) {
    logger.info("Database not available, skipping Stripe initialization");
    return;
  }

  try {
    await runMigrations({
      databaseUrl,
    });
  } catch (migrationError) {
    logger.error("Failed to initialize Stripe schema", { error: migrationError instanceof Error ? migrationError.message : String(migrationError) });
    return;
  }

  try {

    const stripeSync = await getStripeSync();

    const webhookBaseUrl = `https://${process.env.REPLIT_DOMAINS?.split(",")[0]}`;
    const { uuid } = await stripeSync.findOrCreateManagedWebhook(
      `${webhookBaseUrl}/api/stripe/webhook`,
      {
        enabled_events: ["*"],
        description: "Managed webhook for Stripe sync",
      },
    );
    logger.info("Stripe ready", { webhookId: uuid.slice(0, 8) });

    stripeSync
      .syncBackfill({
        include: ["checkout_sessions"],
      })
      .then(() => {
        logger.info("Stripe sessions synced");
      })
      .catch((err: Error) => {
        logger.error("Error syncing Stripe data", { error: err.message });
      });
  } catch (error) {
    logger.error("Failed to initialize Stripe", { error: error instanceof Error ? error.message : String(error) });
  }
}

(async () => {
  // Health check endpoint - responds immediately, before any other middleware
  // This is critical for Replit Autoscale deployment health checks
  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok", timestamp: Date.now() });
  });


  setupCors(app);

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://js.stripe.com"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        connectSrc: ["'self'", "https://api.stripe.com", "https://api.openai.com"],
        frameSrc: ["'self'", "https://js.stripe.com"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }));

  app.use(compression({
    level: 6,
    threshold: 1024,
    filter: (req, res) => {
      if (req.headers["x-no-compression"]) {
        return false;
      }
      return compression.filter(req, res);
    },
  }));

  // Register webhook route before body parsing so Stripe receives the raw,
  // unmodified body for signature verification. 5 MB limit accommodates large
  // event payloads (e.g. invoices with many line items) while still capping input.
  app.post(
    "/api/stripe/webhook/:uuid",
    express.raw({ type: "application/json", limit: "5mb" }),
    async (req: Request, res: Response, next: NextFunction) => {
      const signature = req.headers["stripe-signature"];

      if (!signature) {
        return next(AppError.badRequest("Missing stripe-signature", "MISSING_STRIPE_SIGNATURE"));
      }

      try {
        const sig = Array.isArray(signature) ? signature[0] : signature;

        if (!Buffer.isBuffer(req.body)) {
          throw AppError.internal("Webhook processing error", "WEBHOOK_BODY_NOT_BUFFER");
        }

        const { uuid } = req.params;
        await WebhookHandlers.processWebhook(req.body as Buffer, sig, uuid);

        res.status(200).json({ received: true });
      } catch (error) {
        next(error);
      }
    },
  );

  setupBodyParsing(app);
  setupRequestLogging(app);

  // Serve showcase images from local assets directory
  app.use("/public/showcase", express.static(path.join(process.cwd(), "assets/showcase"), {
    maxAge: "1y",
    immutable: true,
  }));

  // Legacy showcase route (redirect to new static path)
  app.get("/api/showcase/:category/:filename", (req, res) => {
    const { category, filename } = req.params;
    res.redirect(301, `/public/showcase/${category}/${filename}`);
  });

  app.get("/admin", (_req: Request, res: Response) => {
    const adminPath = path.resolve(process.cwd(), "server", "templates", "admin-dashboard.html");
    res.sendFile(adminPath);
  });

  configureExpoRouting(app);

  const server = await registerRoutes(app);

  configureStaticFiles(app);

  setupErrorHandler(app);

  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      logger.info("Express server serving", { port });

      initStripe().catch((err) => {
        logger.error("Background Stripe init failed", { error: err instanceof Error ? err.message : String(err) });
      });

      // Start trial expiration background job (runs every hour)
      startTrialExpirationJob(60 * 60 * 1000);
    },
  );
})();

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection", {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
  });
});

process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception", {
    error: error.message,
    stack: error.stack,
  });
  process.exit(1);
});
