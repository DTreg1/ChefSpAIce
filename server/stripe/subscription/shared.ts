import { Request } from "express";
import { getUserByToken } from "../../lib/auth-utils";

export function isNativeMobileApp(req: Request): boolean {
  const clientPlatform = (req.headers["x-platform"] as string || "").toLowerCase();
  if (clientPlatform === "ios" || clientPlatform === "android") {
    return true;
  }
  if (/chefsp[a]ice\/(ios|android)/i.test(req.headers["user-agent"] || "")) {
    return true;
  }
  return false;
}

export interface PriceInfo {
  id: string;
  amount: number;
  currency: string;
  interval: string;
  intervalCount: number;
  trialDays: number;
  productName: string;
}

export interface TieredPrices {
  proMonthly: PriceInfo | null;
  proAnnual: PriceInfo | null;
  monthly: PriceInfo | null;
  annual: PriceInfo | null;
}

export interface PricesCache {
  data: TieredPrices | null;
  timestamp: number;
}

export const pricesCache: PricesCache = {
  data: null,
  timestamp: 0,
};

export const PRICES_CACHE_TTL_MS = 60 * 60 * 1000;

export async function getAuthenticatedUser(req: Request): Promise<{ id: string; email: string } | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const rawToken = authHeader.substring(7);
  const user = await getUserByToken(rawToken);
  return user ? { id: user.id, email: user.email } : null;
}
