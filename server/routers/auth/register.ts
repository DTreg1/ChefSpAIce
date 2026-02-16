import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { setAuthCookie } from "../../lib/session-utils";
import { generateCsrfToken } from "../../middleware/csrf";
import { successResponse } from "../../lib/apiResponse";
import { registerWithEmail } from "../../domain/services";
import { getSubscriptionInfo } from "../auth/shared";
import { validateBody } from "../../middleware/validateBody";

const router = Router();

const registerSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
  displayName: z.string().optional(),
  selectedPlan: z.string().optional(),
  referralCode: z.string().optional(),
});

router.post("/register", validateBody(registerSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, displayName, selectedPlan, referralCode } = req.body;

    const result = await registerWithEmail(
      email,
      password,
      displayName,
      selectedPlan,
      referralCode,
      { userAgent: req.headers["user-agent"], ipAddress: req.ip }
    );

    const subscriptionInfo = await getSubscriptionInfo(result.user.id);

    setAuthCookie(res, result.rawToken, req);
    const csrfToken = generateCsrfToken(req, res);

    res.status(201).json(successResponse({
      user: {
        id: result.user.id,
        email: result.user.email,
        displayName: result.user.displayName,
        createdAt: result.user.createdAt?.toISOString() || new Date().toISOString(),
        hasCompletedOnboarding: result.user.hasCompletedOnboarding ?? false,
        ...subscriptionInfo,
      },
      token: result.rawToken,
      csrfToken,
    }));
  } catch (error) {
    next(error);
  }
});

export default router;
