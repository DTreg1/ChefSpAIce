export const SUBSCRIPTION_CONFIG = {
  TRIAL_DAYS: 7,
  MONTHLY: {
    priceId: process.env.STRIPE_MONTHLY_PRICE_ID || '',
    amount: 499,
    interval: 'month',
    name: 'Monthly Subscription',
  },
  ANNUAL: {
    priceId: process.env.STRIPE_ANNUAL_PRICE_ID || '',
    amount: 4990,
    interval: 'year',
    name: 'Annual Subscription',
  },
};

export function getPlanTypeFromPriceId(
  priceId: string,
): "monthly" | "annual" | null {
  if (priceId === SUBSCRIPTION_CONFIG.MONTHLY.priceId) return "monthly";
  if (priceId === SUBSCRIPTION_CONFIG.ANNUAL.priceId) return "annual";
  return null;
}
