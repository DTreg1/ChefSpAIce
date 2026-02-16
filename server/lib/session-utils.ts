import { Request, Response } from "express";
import { randomBytes } from "crypto";

export function generateToken(): string {
  return randomBytes(32).toString("hex");
}

export function getExpiryDate(): Date {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date;
}

export const AUTH_COOKIE_NAME = "chefspaice_auth";
export const COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000;

export function setAuthCookie(res: Response, token: string, req?: Request): void {
  const isSecure = req ? req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' : true;
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(AUTH_COOKIE_NAME, { path: "/" });
}
