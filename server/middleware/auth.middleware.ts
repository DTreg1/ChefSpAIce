import type { Request, Response, NextFunction } from "express";

export function isAuthenticated(req: any, res: Response, next: NextFunction) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Authentication required" });
}

export function optionalAuth(req: any, res: Response, next: NextFunction) {
  // Middleware for routes that work with or without authentication
  // but may provide additional features when authenticated
  next();
}

export function adminOnly(req: any, res: Response, next: NextFunction) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    const userEmail = req.user?.claims?.email;
    // Add your admin email check here
    if (userEmail && process.env.ADMIN_EMAILS?.includes(userEmail)) {
      return next();
    }
  }
  res.status(403).json({ error: "Admin access required" });
}