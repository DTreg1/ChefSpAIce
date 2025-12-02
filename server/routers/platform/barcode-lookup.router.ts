import { Router, Request, Response } from "express";
import {
  isAuthenticated,
  getAuthenticatedUserId,
} from "../../middleware/oauth.middleware";
import { barcodeLookupService } from "../../services/barcode-lookup.service";
import { batchedApiLogger } from "../../utils/batchedApiLogger";
import { barcodeRateLimiter } from "../../middleware/rate-limit.middleware";
import { asyncHandler } from "../../middleware/error.middleware";
import { ApiError } from "../../utils/apiError";

const router = Router();

router.get(
  "/",
  isAuthenticated,
  barcodeRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const query = req.query.query as string;

    if (!query) {
      return res.status(400).json({ error: "Query parameter is required" });
    }

    await batchedApiLogger.logApiUsage(userId, {
      apiName: "barcode",
      endpoint: "search",
      method: "GET",
      statusCode: 200,
    });

    const products = await barcodeLookupService.searchProducts(query);

    res.json({ products });
  }),
);

router.get(
  "/product/:code",
  isAuthenticated,
  barcodeRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const barcode = req.params.code;

    if (!barcode) {
      return res.status(400).json({ error: "Barcode code is required" });
    }

    await batchedApiLogger.logApiUsage(userId, {
      apiName: "barcode",
      endpoint: "lookup",
      method: "GET",
      statusCode: 200,
    });

    const product = await barcodeLookupService.lookupByBarcode(barcode);

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json(product);
  }),
);

router.post(
  "/batch",
  isAuthenticated,
  barcodeRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { barcodes } = req.body || {};

    if (!barcodes || !Array.isArray(barcodes)) {
      return res.status(400).json({ error: "Barcodes array is required" });
    }

    if (barcodes.length > 20) {
      return res
        .status(400)
        .json({ error: "Maximum 20 barcodes per batch request" });
    }

    await batchedApiLogger.logApiUsage(userId, {
      apiName: "barcode",
      endpoint: "batch",
      method: "POST",
      statusCode: 200,
    });

    const results = await barcodeLookupService.lookupBatch(barcodes);

    const products: Record<string, any> = {};
    results.forEach((value, key) => {
      products[key] = value;
    });

    res.json({ products });
  }),
);

router.get(
  "/rate-limits",
  isAuthenticated,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const rateLimitInfo = {
      limit: 100,
      remaining: 100,
      reset: Date.now() + 3600000,
      windowMs: 3600000,
    };

    res.json(rateLimitInfo);
  }),
);

router.get(
  "/usage/stats",
  isAuthenticated,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const stats = {
      totalLookups: 0,
      successfulLookups: 0,
      failedLookups: 0,
      cacheHits: 0,
      cacheMisses: 0,
      lastLookup: null,
      periodStart: new Date(
        Date.now() - 30 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      periodEnd: new Date().toISOString(),
    };

    res.json(stats);
  }),
);

router.get(
  "/usage/logs",
  isAuthenticated,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

    const logs: any[] = [];

    res.json({
      data: logs,
      pagination: {
        page,
        limit,
        total: 0,
        totalPages: 0,
      },
    });
  }),
);

export default router;
