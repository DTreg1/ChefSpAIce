import type { Request, Response, NextFunction } from "express";
import { doubleCsrf } from "csrf-csrf";
import crypto from "crypto";

if (process.env.NODE_ENV === "production" && !process.env.CSRF_SECRET) {
  throw new Error("CSRF_SECRET must be set in production");
}

const CSRF_SECRET = process.env.CSRF_SECRET || crypto.randomBytes(32).toString("hex");

const {
  generateCsrfToken,
  doubleCsrfProtection,
} = doubleCsrf({
  getSecret: () => CSRF_SECRET,
  getSessionIdentifier: (req) => {
    return req.cookies?.chefspaice_auth || "anonymous";
  },
  cookieName: "__csrf",
  cookieOptions: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" || process.env.REPL_ID !== undefined,
    path: "/",
  },
  getCsrfTokenFromRequest: (req) => {
    return req.headers["x-csrf-token"] as string;
  },
  errorConfig: {
    statusCode: 403,
    message: "Invalid or missing CSRF token",
    code: "CSRF_VALIDATION_FAILED",
  },
});

export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    return next();
  }

  if (process.env.NODE_ENV === "test") {
    return next();
  }

  doubleCsrfProtection(req, res, next);
}

export { generateCsrfToken };
