import express from "express";
import type { Request, Response, NextFunction } from "express";
import fileUpload from "express-fileupload";
import cookieParser from "cookie-parser";
import { createProxyMiddleware } from "http-proxy-middleware";
import { registerRoutes } from "./routes";
import * as fs from "fs";
import * as path from "path";
import { Client } from "pg";
import { Client as ObjectStorageClient } from "@replit/object-storage";
import { runMigrations } from "stripe-replit-sync";
import { getStripeSync } from "./stripe/stripeClient";
import { WebhookHandlers } from "./stripe/webhookHandlers";
import { startTrialExpirationJob } from "./jobs/trialExpirationJob";

const app = express();
const log = console.log;

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
  
  app.use(
    express.json({
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );

  app.use(express.urlencoded({ extended: false }));

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

      log(logLine);
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

  log(`baseUrl`, baseUrl);
  log(`expsUrl`, expsUrl);

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
    log(`[Expo] Found web build at ${expoWebBuildPath}`);
  }

  let metroProxy: ReturnType<typeof createProxyMiddleware> | null = null;
  
  if (isDevelopment) {
    metroProxy = createProxyMiddleware({
      target: "http://localhost:8081",
      changeOrigin: true,
      ws: true,
      on: {
        error: (err: Error, req: any, res: any) => {
          log(`[Expo] Metro proxy error: ${err.message}`);
          if (res && !res.headersSent && res.writeHead) {
            res.writeHead(502, { "Content-Type": "text/html" });
            res.end("<h1>Metro bundler not available</h1><p>Please wait for Metro to start or refresh the page.</p>");
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
      log(`[DEBUG] Test API route: ${req.method} ${req.path}`);
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

  log(`[Expo] Routing ready (${isDevelopment ? "dev: Metro proxy" : expoWebBuildExists ? "prod: Expo web build" : "prod: landing page fallback"})`);
}

function configureStaticFiles(app: express.Application) {
  app.use("/assets", express.static(path.resolve(process.cwd(), "assets")));
  app.use("/attached_assets", express.static(path.resolve(process.cwd(), "attached_assets")));
}

function setupErrorHandler(app: express.Application) {
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const error = err as {
      status?: number;
      statusCode?: number;
      message?: string;
    };

    const status = error.status || error.statusCode || 500;
    const message = error.message || "Internal Server Error";

    res.status(status).json({ message });

    throw err;
  });
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
      log(`[Database] Connected (attempt ${attempt}/${retries})`);
      return true;
    } catch (error) {
      try {
        await client.end();
      } catch {}
      
      if (attempt === retries) {
        console.error("Failed to connect to database after retries:", error);
        return false;
      }
      log(`[Database] Connection failed (attempt ${attempt}/${retries}), retrying...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  return false;
}

async function initStripe(retries = 3, delay = 2000) {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    log("[Stripe] DATABASE_URL not found, skipping Stripe initialization");
    return;
  }

  const dbReady = await warmupDatabase(databaseUrl);
  if (!dbReady) {
    log("[Stripe] Database not available, skipping Stripe initialization");
    return;
  }

  try {
    await runMigrations({
      databaseUrl,
    });
  } catch (migrationError) {
    console.error("Failed to initialize Stripe schema:", migrationError);
    return;
  }

  try {

    const stripeSync = await getStripeSync();

    const webhookBaseUrl = `https://${process.env.REPLIT_DOMAINS?.split(",")[0]}`;
    const { webhook, uuid } = await stripeSync.findOrCreateManagedWebhook(
      `${webhookBaseUrl}/api/stripe/webhook`,
      {
        enabled_events: ["*"],
        description: "Managed webhook for Stripe sync",
      },
    );
    log(`[Stripe] Ready (webhook: ${uuid.slice(0, 8)}...)`);

    // Skip full backfill sync for faster startup - webhook handles new events
    // Only sync checkout_sessions which we need for subscriptions
    stripeSync
      .syncBackfill({
        include: ["checkout_sessions"],
      })
      .then(() => {
        log("[Stripe] Sessions synced");
      })
      .catch((err: Error) => {
        console.error("Error syncing Stripe data:", err);
      });
  } catch (error) {
    console.error("Failed to initialize Stripe:", error);
  }
}

(async () => {
  // Health check endpoint - responds immediately, before any other middleware
  // This is critical for Replit Autoscale deployment health checks
  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok", timestamp: Date.now() });
  });


  setupCors(app);

  // Register webhook route before body parsing (needs raw body)
  app.post(
    "/api/stripe/webhook/:uuid",
    express.raw({ type: "application/json" }),
    async (req, res) => {
      const signature = req.headers["stripe-signature"];

      if (!signature) {
        return res.status(400).json({ error: "Missing stripe-signature" });
      }

      try {
        const sig = Array.isArray(signature) ? signature[0] : signature;

        if (!Buffer.isBuffer(req.body)) {
          console.error("STRIPE WEBHOOK ERROR: req.body is not a Buffer");
          return res.status(500).json({ error: "Webhook processing error" });
        }

        const { uuid } = req.params;
        await WebhookHandlers.processWebhook(req.body as Buffer, sig, uuid);

        res.status(200).json({ received: true });
      } catch (error: any) {
        console.error("Webhook error:", error.message);
        res.status(400).json({ error: "Webhook processing error" });
      }
    },
  );

  setupBodyParsing(app);
  setupRequestLogging(app);

  // Serve public files from object storage at /public/* path
  // PUBLIC_OBJECT_SEARCH_PATHS format: /{bucket-id}/public
  const publicPrefix = process.env.PUBLIC_OBJECT_SEARCH_PATHS?.split('/').slice(2).join('/') || 'public';
  const objectStorageClient = new ObjectStorageClient();
  app.get("/public/*", async (req, res) => {
    const filePath = req.path.replace(/^\/public\//, ''); // Everything after /public/
    const objectPath = `${publicPrefix}/${filePath}`;
    log(`[ObjectStorage] Serving public file: ${objectPath}`);
    
    try {
      const result = await objectStorageClient.downloadAsBytes(objectPath);
      
      if (!result.ok) {
        log(`[ObjectStorage] File not found: ${objectPath}`, result.error);
        return res.status(404).json({ error: "File not found" });
      }
      
      // result.value is [Buffer] array - access first element
      const buffer = result.value[0];
      
      // Determine content type from extension
      const ext = filePath.split('.').pop()?.toLowerCase();
      const contentTypes: Record<string, string> = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'svg': 'image/svg+xml',
        'pdf': 'application/pdf',
      };
      const contentType = contentTypes[ext || ''] || 'application/octet-stream';
      
      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Length", buffer.length);
      res.setHeader("Cache-Control", "public, max-age=31536000");
      res.end(buffer);
    } catch (err) {
      log(`[ObjectStorage] Error serving ${objectPath}:`, err);
      res.status(500).json({ error: "Failed to load file" });
    }
  });

  // Legacy showcase route (redirect to new path)
  app.get("/api/showcase/:category/:filename", async (req, res) => {
    const { category, filename } = req.params;
    const objectPath = `public/showcase/${category}/${filename}`;
    log(`[Showcase] Serving: ${objectPath}`);
    
    try {
      const result = await objectStorageClient.downloadAsBytes(objectPath);
      
      if (!result.ok) {
        log(`[Showcase] File not found: ${objectPath}`);
        return res.status(404).json({ error: "Image not found" });
      }
      
      const buffer = Buffer.from(result.value[0]);
      res.setHeader("Content-Type", "image/jpeg");
      res.setHeader("Content-Length", buffer.length);
      res.setHeader("Cache-Control", "public, max-age=31536000");
      res.end(buffer);
    } catch (err) {
      log(`[Showcase] Error serving ${objectPath}:`, err);
      res.status(500).json({ error: "Failed to load image" });
    }
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
      log(`[Server] Express server serving on port ${port}`);

      // Initialize Stripe in background after server starts
      initStripe().catch((err) => {
        console.error("Background Stripe init failed:", err);
      });

      // Start trial expiration background job (runs every hour)
      startTrialExpirationJob(60 * 60 * 1000);
    },
  );
})();
