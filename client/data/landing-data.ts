export const APP_STORE_URL =
  "https://apps.apple.com/app/chefspaice/id000000000";
export const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.chefspaice.app";

export const showcaseScreenshots = [
  {
    category: "inventory",
    filename: "338A0B62-F334-41D1-8AE9-F27252F582DC_1_105_c.jpeg",
    label: "Inventory",
    description: "Track your pantry",
  },
  {
    category: "cookware",
    filename: "cookware-showcase.png",
    label: "Cookware",
    description: "Manage your tools",
  },
  {
    category: "recipes",
    filename: "85633BFE-AEE0-4C16-85F3-EB3E54BDCF22_1_105_c.jpeg",
    label: "Recipes",
    description: "AI-generated recipes",
  },
  {
    category: "mealplan",
    filename: "9923E5F7-BDF1-4437-8DE5-2265D313F287_1_105_c.jpeg",
    label: "Meal Plan",
    description: "Plan your week",
  },
  {
    category: "scanning",
    filename: "B1DD5F3A-BCFE-4861-9097-6313C695FE20_1_105_c.jpeg",
    label: "Scanning",
    description: "Add items instantly",
  },
];

export const heroScreenshot = {
  category: "hero",
  filename: "EB0F64E2-5BB7-4CB9-9C62-3AABEAF61B38_1_105_c.jpeg",
};

export const faqs = [
  {
    question: "How does the AI recipe generation work?",
    answer:
      "Our AI analyzes the ingredients in your pantry and generates personalized recipes based on what you have. You can also specify dietary preferences, cooking time, and cuisine type for more tailored suggestions.",
  },
  {
    question: "Is there a free trial available?",
    answer:
      "Yes! We offer a 7-day free trial with full access to all Pro features. No credit card required to start.",
  },
  {
    question: "Can I use the app on multiple devices?",
    answer:
      "Absolutely! Your account syncs across all your devices. Whether you're on your phone at the grocery store or tablet in the kitchen, your inventory stays up to date.",
  },
  {
    question: "How accurate is the expiration tracking?",
    answer:
      "We use AI-powered shelf life estimation combined with product data to give you accurate expiration alerts. You'll receive notifications before items expire so you can plan meals accordingly.",
  },
  {
    question: "Can I cancel my subscription anytime?",
    answer:
      "Yes, you can cancel your subscription at any time from your account settings. There are no long-term contracts or cancellation fees.",
  },
];

export const trustLogos = [
  { name: "App Store", iconType: "material" as const, icon: "apple" },
  { name: "Google Play", iconType: "material" as const, icon: "google-play" },
  { name: "Replit", iconType: "custom" as const, icon: "replit" },
  { name: "GitHub", iconType: "feather" as const, icon: "github" },
];

export const donationAmounts = [
  { amount: 500, label: "$5" },
  { amount: 1000, label: "$10" },
  { amount: 2500, label: "$25" },
  { amount: 5000, label: "$50" },
];

export const BASIC_FEATURES = [
  "25 pantry items",
  "5 AI generated recipes per month",
  "Basic storage areas",
  "5 cookware items",
  "Item scanning",
  "Daily meal planning",
];

export const PRO_FEATURES = [
  "Unlimited pantry items",
  "Unlimited AI generated recipes",
  "Recipe & Bulk Scanning",
  "Customizable storage areas",
  "Live AI Kitchen Assistant",
  "Weekly meal prepping",
];

export function getShowcaseImageUrl(
  category: string,
  filename: string,
): string {
  if (typeof window !== "undefined") {
    const { protocol, hostname } = window.location;
    const expoDomain = process.env.EXPO_PUBLIC_DOMAIN;
    const cacheBust = "v=2";
    if (expoDomain) {
      return `${protocol}//${expoDomain}/public/showcase/${category}/${filename}?${cacheBust}`;
    }
    return `${protocol}//${hostname}/public/showcase/${category}/${filename}?${cacheBust}`;
  }
  return "";
}
