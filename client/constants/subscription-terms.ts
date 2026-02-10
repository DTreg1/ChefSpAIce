export const APPLE_EULA_URL = "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/";
export const GOOGLE_PLAY_TERMS_URL = "https://play.google.com/intl/en_us/about/play-terms/";
export const APPLE_SUBSCRIPTIONS_URL = "https://apps.apple.com/account/subscriptions";
export const GOOGLE_SUBSCRIPTIONS_URL = "https://play.google.com/store/account/subscriptions";

export function getSubscriptionTermsText(platform: string): string {
  if (platform === "ios") {
    return "ChefSpAIce is available as a subscription at $9.99/month or $99.90/year, with a 7-day free trial. Payment will be charged to your Apple ID account at confirmation of purchase. Subscriptions automatically renew unless auto-renew is turned off at least 24 hours before the end of the current period. Your account will be charged for renewal within 24 hours prior to the end of the current period. You can manage and cancel your subscriptions by going to your Account Settings on the App Store after purchase. Any unused portion of the free trial period will be forfeited when you purchase a subscription.";
  }

  if (platform === "android") {
    return "ChefSpAIce is available as a subscription at $9.99/month or $99.90/year, with a 7-day free trial. Payment will be charged to your Google Play account at confirmation of purchase. Subscriptions automatically renew unless auto-renew is turned off at least 24 hours before the end of the current period. Your account will be charged for renewal within 24 hours prior to the end of the current period. You can manage and cancel your subscriptions by going to your Account Settings on the Google Play app after purchase. Any unused portion of the free trial period will be forfeited when you purchase a subscription.";
  }

  return "ChefSpAIce is available as a subscription at $9.99/month or $99.90/year, with a 7-day free trial. Subscriptions automatically renew unless canceled at least 24 hours before the end of the current period. You can manage and cancel your subscriptions from your account settings. Any unused portion of the free trial period will be forfeited when you purchase a subscription.";
}
