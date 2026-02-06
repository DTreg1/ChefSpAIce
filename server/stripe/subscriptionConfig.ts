import { SubscriptionTier, MONTHLY_PRICES, ANNUAL_PRICES, TRIAL_CONFIG } from "@shared/subscription";
import { logger } from "../lib/logger";

export const SUBSCRIPTION_CONFIG = {
  TRIAL_DAYS: TRIAL_CONFIG.TRIAL_DAYS,
  BASIC_MONTHLY: {
    priceId: process.env.STRIPE_BASIC_MONTHLY_PRICE_ID || '',
    amount: MONTHLY_PRICES.BASIC * 100,
    interval: 'month',
    name: 'ChefSpAIce Basic Monthly',
    tier: SubscriptionTier.BASIC,
  },
  BASIC_ANNUAL: {
    priceId: process.env.STRIPE_BASIC_ANNUAL_PRICE_ID || '',
    amount: ANNUAL_PRICES.BASIC * 100,
    interval: 'year',
    name: 'ChefSpAIce Basic Annual',
    tier: SubscriptionTier.BASIC,
  },
  PRO_MONTHLY: {
    priceId: process.env.STRIPE_PRO_MONTHLY_PRICE_ID || '',
    amount: MONTHLY_PRICES.PRO * 100,
    interval: 'month',
    name: 'ChefSpAIce Pro Monthly',
    tier: SubscriptionTier.PRO,
  },
  PRO_ANNUAL: {
    priceId: process.env.STRIPE_PRO_ANNUAL_PRICE_ID || '',
    amount: ANNUAL_PRICES.PRO * 100,
    interval: 'year',
    name: 'ChefSpAIce Pro Annual',
    tier: SubscriptionTier.PRO,
  },
  MONTHLY: {
    priceId: process.env.STRIPE_MONTHLY_PRICE_ID || process.env.STRIPE_PRO_MONTHLY_PRICE_ID || '',
    amount: MONTHLY_PRICES.PRO * 100,
    interval: 'month',
    name: 'Monthly Subscription',
  },
  ANNUAL: {
    priceId: process.env.STRIPE_ANNUAL_PRICE_ID || process.env.STRIPE_PRO_ANNUAL_PRICE_ID || '',
    amount: ANNUAL_PRICES.PRO * 100,
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

export const PRODUCTS: Record<SubscriptionTier, ProductConfig> = {
  [SubscriptionTier.BASIC]: {
    name: "ChefSpAIce Basic",
    description: "Essential kitchen management with 25 pantry items, 5 AI recipes/month, and 5 cookware items",
    tier: SubscriptionTier.BASIC,
    monthlyPrice: MONTHLY_PRICES.BASIC * 100,
    annualPrice: ANNUAL_PRICES.BASIC * 100,
  },
  [SubscriptionTier.PRO]: {
    name: "ChefSpAIce Pro",
    description: "Unlimited pantry items, AI recipes, and cookware. Plus Recipe Scanning, Bulk Scanning, Live AI Kitchen Assistant, Custom Storage Areas, and Weekly Meal Prepping",
    tier: SubscriptionTier.PRO,
    monthlyPrice: MONTHLY_PRICES.PRO * 100,
    annualPrice: ANNUAL_PRICES.PRO * 100,
  },
};

export function getPlanTypeFromPriceId(
  priceId: string,
): "monthly" | "annual" | null {
  if (!priceId) return null;
  
  if (priceId === SUBSCRIPTION_CONFIG.BASIC_MONTHLY.priceId ||
      priceId === SUBSCRIPTION_CONFIG.PRO_MONTHLY.priceId ||
      priceId === SUBSCRIPTION_CONFIG.MONTHLY.priceId) {
    return "monthly";
  }
  
  if (priceId === SUBSCRIPTION_CONFIG.BASIC_ANNUAL.priceId ||
      priceId === SUBSCRIPTION_CONFIG.PRO_ANNUAL.priceId ||
      priceId === SUBSCRIPTION_CONFIG.ANNUAL.priceId) {
    return "annual";
  }
  
  return null;
}

export function getTierFromProductName(productName: string): SubscriptionTier {
  const normalizedName = productName.toLowerCase();
  
  if (normalizedName.includes("pro")) {
    return SubscriptionTier.PRO;
  }
  
  if (normalizedName.includes("basic")) {
    return SubscriptionTier.BASIC;
  }
  
  return SubscriptionTier.PRO;
}

export async function getTierFromPriceId(
  priceId: string,
  stripe: { prices: { retrieve: (id: string, opts?: any) => Promise<any> } }
): Promise<{ tier: SubscriptionTier; planType: "monthly" | "annual" } | null> {
  try {
    const price = await stripe.prices.retrieve(priceId, {
      expand: ["product"],
    });
    
    const product = price.product as { name?: string; metadata?: Record<string, string> } | null;
    const productName = typeof product === "object" && product?.name ? product.name : "";
    const productMetadata = typeof product === "object" && product?.metadata ? product.metadata : {};
    
    const tierFromMetadata = productMetadata.tier as SubscriptionTier | undefined;
    const tier = tierFromMetadata || getTierFromProductName(productName);
    
    const interval = price.recurring?.interval;
    const planType: "monthly" | "annual" = interval === "year" ? "annual" : "monthly";
    
    return { tier, planType };
  } catch (error) {
    logger.error("Error fetching price details", { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}
