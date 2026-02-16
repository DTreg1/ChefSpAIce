import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { errorResponse } from "../lib/apiResponse";

const skipInTest = () => process.env.NODE_ENV === "test";

const AI_AND_AUTH_PATHS = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/chat",
  "/api/suggestions",
  "/api/recipes/generate",
];

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
  handler: (_req, res) => {
    res.status(429).json({
      ...errorResponse("Too many requests. Please try again later.", "RATE_LIMITED"),
      retryAfter: 900,
    });
  },
});

export const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
  handler: (_req, res) => {
    res.status(429).json({
      ...errorResponse("Too many requests. Please try again later.", "RATE_LIMITED"),
      retryAfter: 60,
    });
  },
});

export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
  keyGenerator: (req) => req.body?.email || ipKeyGenerator(req.ip ?? "unknown"),
  handler: (_req, res) => {
    res.status(429).json({
      ...errorResponse("Too many password reset attempts. Please try again later.", "RATE_LIMITED"),
      retryAfter: 3600,
    });
  },
});

export const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    if (skipInTest()) return true;
    const fullPath = req.originalUrl || req.url;
    return AI_AND_AUTH_PATHS.some((p) => fullPath.startsWith(p));
  },
  handler: (_req, res) => {
    res.status(429).json({
      ...errorResponse("Too many requests. Please try again later.", "RATE_LIMITED"),
      retryAfter: 60,
    });
  },
});
