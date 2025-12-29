export const SUBSCRIPTION_CONFIG = {
  TRIAL_DAYS: 7,
  MONTHLY: {
    priceId: process.env.STRIPE_MONTHLY_PRICE_ID,
    amount: 499, // $4.99 in cents
    interval: "month",
    name: "Monthly Subscription",
  },
  ANNUAL: {
    priceId: process.env.STRIPE_ANNUAL_PRICE_ID,
    amount: 4990, // $49.90 in cents (2 months free)
    interval: "year",
    name: "Annual Subscription",
  },
};

export function getPlanTypeFromPriceId(
  priceId: string,
): "monthly" | "annual" | null {
  if (priceId === SUBSCRIPTION_CONFIG.MONTHLY.priceId) return "monthly";
  if (priceId === SUBSCRIPTION_CONFIG.ANNUAL.priceId) return "annual";
  return null;
}
