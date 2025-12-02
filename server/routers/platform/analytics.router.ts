import { Router, Request, Response } from "express";
import { storage } from "../../storage/index";
import { analyticsRateLimit } from "../../middleware";
import { asyncHandler } from "../../middleware/error.middleware";
import { getAuthenticatedUserId } from "../../middleware/oauth.middleware";
import {
  insertWebVitalSchema,
  insertAnalyticsEventSchema,
} from "@shared/schema";
import { retryWithBackoff } from "../../utils/retry-handler";

const router = Router();

// Web Vitals Analytics endpoint
router.post(
  "/",
  analyticsRateLimit,
  asyncHandler(async (req: Request, res) => {
    // Get user ID if authenticated, otherwise null for anonymous tracking
    const userId = getAuthenticatedUserId(req);

    // Capture request metadata
    const userAgent = req.headers["user-agent"] || null;
    const url = req.headers["referer"] || req.headers["origin"] || null;

    // Log the incoming data for debugging in development
    if (process.env.NODE_ENV === "development") {
      console.log("Analytics POST received:", {
        body: req.body,
        userId,
        userAgent: userAgent?.substring(0, 50),
        url,
      });
    }

    try {
      // Validate using Zod schema
      const validated = insertWebVitalSchema.parse({
        ...req.body,
        userId: userId ?? undefined,
        metricId: req.body.id, // Map 'id' from web-vitals to 'metricId'
        navigationType: req.body.navigationType || null,
        userAgent,
        url,
      });

      // Record with consolidated retry logic
      try {
        await retryWithBackoff(
          async () => {
            await storage.platform.analytics.recordWebVital(validated);
          },
          {
            maxRetries: 3,
            initialDelay: 100, // Start with 100ms to match original logic
            onRetry: (attempt, error, delay) => {
              console.log(
                `[Analytics] Retrying web vital recording after ${delay}ms (attempt ${attempt + 1}/4)`,
              );
            },
          },
        );
      } catch (lastError) {
        // Log error but don't fail the request
        console.error("Failed to record web vital after retries:", lastError);
      }
    } catch (validationError) {
      // Log validation errors but don't fail the request
      console.warn("Analytics validation error:", validationError);
    }

    // Always return success to not break client analytics
    res.status(200).json({ success: true });
  }),
);

// Analytics Events endpoint - batch processing
router.post(
  "/events",
  analyticsRateLimit,
  asyncHandler(async (req: Request, res) => {
    const userId = getAuthenticatedUserId(req);
    const { events } = req.body || {};

    if (!events || !Array.isArray(events)) {
      return res.status(400).json({ error: "Invalid events format" });
    }

    try {
      // Validate and prepare each event with server-side data
      const validatedEvents = [];

      for (const event of events) {
        try {
          // Validate each event using the schema
          const validated = insertAnalyticsEventSchema.parse({
            ...event,
            userId: userId ?? undefined,
            // Server-side timestamp will be set by the database default
          });
          validatedEvents.push(validated);
        } catch (validationError) {
          // Log validation errors but continue processing valid events
          console.warn("Event validation error:", validationError);
        }
      }

      if (validatedEvents.length === 0) {
        return res.status(400).json({ error: "No valid events to process" });
      }

      // Batch insert validated events
      await storage.platform.analytics.recordAnalyticsEventsBatch(
        validatedEvents,
      );

      res.status(200).json({
        success: true,
        processed: validatedEvents.length,
        skipped: events.length - validatedEvents.length,
      });
    } catch (error) {
      console.error("Failed to record analytics events:", error);
      res.status(500).json({ error: "Failed to record events" });
    }
  }),
);

// Session start endpoint
router.post(
  "/sessions/start",
  asyncHandler(async (req: Request, res) => {
    const userId = getAuthenticatedUserId(req);
    const sessionData = {
      ...req.body,
      userId: userId ?? undefined,
    };

    try {
      const session =
        await storage.platform.analytics.createUserSession(sessionData);
      res.json({ success: true, sessionId: session.id });
    } catch (error) {
      console.error("Failed to create session:", error);
      res.status(500).json({ error: "Failed to create session" });
    }
  }),
);

// Session end endpoint
router.post(
  "/sessions/end",
  asyncHandler(async (req: Request, res) => {
    const userId = getAuthenticatedUserId(req);
    const { sessionId, exitPage } = req.body || {};

    if (!sessionId) {
      return res.status(400).json({ error: "Missing sessionId" });
    }

    try {
      const endTime = new Date();

      // Get session to calculate duration - scoped to current user for security
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      const sessions = await storage.platform.analytics.getUserSessions(
        userId,
        100,
      );
      const session = sessions.find((s) => s.id === sessionId);

      if (!session) {
        // Session not found or doesn't belong to this user
        return res
          .status(403)
          .json({ error: "Session not found or access denied" });
      }

      if (session.startedAt) {
        const duration = Math.floor(
          (endTime.getTime() - new Date(session.startedAt).getTime()) / 1000,
        );

        // Only update sessions that belong to the current user
        await storage.platform.analytics.updateUserSession(sessionId, {
          endedAt: endTime,
          exitPage,
          durationSeconds: duration,
        });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Failed to end session:", error);
      res.status(500).json({ error: "Failed to end session" });
    }
  }),
);

// Get Analytics Dashboard Stats
router.get(
  "/dashboard",
  asyncHandler(async (req: Request, res) => {
    const { type, period } = req.query;

    // Validate type parameter
    const statsType = (type as string) || "sessions";
    const validTypes = ["sessions", "events", "usage"];
    if (!validTypes.includes(statsType)) {
      return res
        .status(400)
        .json({
          error:
            "Invalid type parameter. Must be 'sessions', 'events', or 'usage'",
        });
    }

    // Validate period parameter
    const validPeriods = ["day", "week", "month"];
    const statsPeriod = period
      ? (period as "day" | "week" | "month")
      : undefined;
    if (statsPeriod && !validPeriods.includes(statsPeriod)) {
      return res
        .status(400)
        .json({
          error: "Invalid period parameter. Must be 'day', 'week', or 'month'",
        });
    }

    try {
      const stats = await storage.platform.analytics.getAnalyticsStats(
        statsType as "sessions" | "events" | "usage",
        undefined, // userId
        statsPeriod,
      );
      res.json(stats);
    } catch (error) {
      console.error("Failed to get analytics stats:", error);
      res.status(500).json({ error: "Failed to get analytics stats" });
    }
  }),
);

// Get Web Vitals statistics
router.get(
  "/stats",
  asyncHandler(async (req: Request, res) => {
    const { metric, days } = req.query;

    // Validate days parameter
    let daysNum = 7; // default
    if (days) {
      const parsed = parseInt(days as string);
      if (isNaN(parsed) || parsed < 1 || parsed > 365) {
        return res.status(400).json({
          error: "Invalid 'days' parameter. Must be a number between 1 and 365",
        });
      }
      daysNum = parsed;
    }

    // Map days to period
    const periodMap: { [key: number]: "day" | "week" | "month" } = {
      1: "day",
      7: "week",
      30: "month",
    };
    const period = periodMap[daysNum] || "week";
    const stats = await storage.platform.analytics.getWebVitalsStats(
      metric as string | undefined,
      period,
    );
    res.json(stats);
  }),
);

// Get API Health Metrics
router.get(
  "/api-health",
  asyncHandler(async (req: Request, res) => {
    const userId = getAuthenticatedUserId(req);
    const { days } = req.query;

    // Validate days parameter
    let daysNum = 7; // default
    if (days) {
      const parsed = parseInt(days as string);
      if (isNaN(parsed) || parsed < 1 || parsed > 365) {
        return res.status(400).json({
          error: "Invalid 'days' parameter. Must be a number between 1 and 365",
        });
      }
      daysNum = parsed;
    }

    // Map days to period
    const periodMapHealth: { [key: number]: "day" | "week" | "month" } = {
      1: "day",
      7: "week",
      30: "month",
    };
    const period = periodMapHealth[daysNum] || "week";

    // Get stats for all APIs if no userId, or user-specific stats
    const stats = userId
      ? await storage.platform.analytics.getApiUsageStats(userId, period)
      : await storage.platform.analytics.getApiUsageStats(undefined, period);

    // Calculate success rate using ApiUsageStats type fields
    const totalCalls = stats.totalRequests || 0;
    const failedCalls = Math.round((stats.errorRate || 0) * totalCalls);
    const successfulCalls = totalCalls - failedCalls;
    const successRate =
      totalCalls > 0 ? (successfulCalls / totalCalls) * 100 : 100;

    res.json({
      period: `${daysNum} days`,
      totalCalls,
      successfulCalls,
      failedCalls,
      successRate: successRate.toFixed(2),
      // Use correct property names from ApiUsageStats
      apiBreakdown: stats.requestsByEndpoint || {},
      errorTypes: {},
      averageResponseTime: stats.averageResponseTime || null,
    });
  }),
);

export default router;
