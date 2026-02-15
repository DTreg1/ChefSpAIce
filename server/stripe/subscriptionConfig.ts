import { SubscriptionTier, MONTHLY_PRICE, ANNUAL_PRICE } from "@shared/subscription";
import { logger } from "../lib/logger";

export const SUBSCRIPTION_CONFIG = {
  STANDARD_MONTHLY: {
    priceId: process.env.STRIPE_STANDARD_MONTHLY_PRICE_ID || '',
    amount: MONTHLY_PRICE * 100,
    interval: 'month',
    name: 'ChefSpAIce Monthly',
    tier: SubscriptionTier.STANDARD,
  },
  STANDARD_ANNUAL: {
    priceId: process.env.STRIPE_STANDARD_ANNUAL_PRICE_ID || '',
    amount: ANNUAL_PRICE * 100,
    interval: 'year',
    name: 'ChefSpAIce Annual',
    tier: SubscriptionTier.STANDARD,
  },
  MONTHLY: {
    priceId: process.env.STRIPE_MONTHLY_PRICE_ID || process.env.STRIPE_STANDARD_MONTHLY_PRICE_ID || '',
    amount: MONTHLY_PRICE * 100,
    interval: 'month',
    name: 'Monthly Subscription',
  },
  ANNUAL: {
    priceId: process.env.STRIPE_ANNUAL_PRICE_ID || process.env.STRIPE_STANDARD_ANNUAL_PRICE_ID || '',
    amount: ANNUAL_PRICE * 100,
    interval: 'year',
    name: 'Annual Subscription',
  },
};

export interface ProductConfig {
  name: string;
  description: string;
  tier: SubscriptionTier;
  monthlyPrice: number;
  annualPrice: number;
}

export const PRODUCTS: Record<string, ProductConfig> = {
  [SubscriptionTier.STANDARD]: {
    name: "ChefSpAIce",
    description: "Unlimited pantry items, AI recipes, and cookware. Plus Recipe Scanning, Bulk Scanning, Live AI Kitchen Assistant, Custom Storage Areas, and Weekly Meal Prepping",
    tier: SubscriptionTier.STANDARD,
    monthlyPrice: MONTHLY_PRICE * 100,
    annualPrice: ANNUAL_PRICE * 100,
  },
};

export function getPlanTypeFromPriceId(
  priceId: string,
): "monthly" | "annual" | null {
  if (!priceId) return null;
  
  if (priceId === SUBSCRIPTION_CONFIG.STANDARD_MONTHLY.priceId ||
      priceId === SUBSCRIPTION_CONFIG.MONTHLY.priceId) {
    return "monthly";
  }
  
  if (priceId === SUBSCRIPTION_CONFIG.STANDARD_ANNUAL.priceId ||
      priceId === SUBSCRIPTION_CONFIG.ANNUAL.priceId) {
    return "annual";
  }
  
  return null;
}

export function getTierFromProductName(productName: string): SubscriptionTier {
  return SubscriptionTier.STANDARD;
}

export async function getTierFromPriceId(
  priceId: string,
  stripe: { prices: { retrieve: (id: string, opts?: any) => Promise<any> } }
): Promise<{ tier: SubscriptionTier; planType: "monthly" | "annual" } | null> {
  try {
    const price = await stripe.prices.retrieve(priceId, {
      expand: ["product"],
    });
    
    const interval = price.recurring?.interval;
    const planType: "monthly" | "annual" = interval === "year" ? "annual" : "monthly";
    
    return { tier: SubscriptionTier.STANDARD, planType };
  } catch (error) {
    logger.error("Error fetching price details", { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}
