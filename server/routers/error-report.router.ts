import { Router, Request, Response } from "express";
import { z } from "zod";
import { db } from "../db";
import { errorReports } from "@shared/schema";
import { successResponse } from "../lib/apiResponse";
import { asyncHandler } from "../lib/apiResponse";
import { logger } from "../lib/logger";
import { getSessionByToken } from "../lib/auth-utils";
import { validateBody } from "../middleware/validateBody";

const router = Router();

const errorReportBodySchema = z.object({
  errorMessage: z.string().min(1).max(10000),
  stackTrace: z.string().max(50000).optional(),
  componentStack: z.string().max(50000).optional(),
  screenName: z.string().max(255).optional(),
  platform: z.string().max(50).optional(),
  appVersion: z.string().max(50).optional(),
  deviceInfo: z.string().max(2000).optional(),
});

router.post("/", validateBody(errorReportBodySchema), asyncHandler(async (req: Request, res: Response) => {
  let userId: string | undefined;
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    try {
      const session = await getSessionByToken(token);
      if (session) {
        userId = session.userId;
      }
    } catch {
    }
  }

  const [report] = await db.insert(errorReports).values({
    userId: userId ?? null,
    errorMessage: req.body.errorMessage,
    stackTrace: req.body.stackTrace ?? null,
    componentStack: req.body.componentStack ?? null,
    screenName: req.body.screenName ?? null,
    platform: req.body.platform ?? null,
    appVersion: req.body.appVersion ?? null,
    deviceInfo: req.body.deviceInfo ?? null,
  }).returning({ id: errorReports.id });

  logger.error("Client error report", {
    reportId: report.id,
    userId: userId ?? "anonymous",
    errorMessage: req.body.errorMessage.slice(0, 200),
    screenName: req.body.screenName,
    platform: req.body.platform,
  });

  res.status(201).json(successResponse({ reportId: report.id }));
}));

export default router;
