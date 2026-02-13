# Core Features — Grade: A-

## Strengths
- Full inventory management with CRUD, soft-delete, and batch add
- AI-powered recipe generation with OpenAI integration
- Receipt scanning, food camera, barcode scanner, ingredient scanner, and recipe scanner
- Voice commands and text-to-speech for hands-free cooking
- Meal planning with draggable reordering
- Shopping list with Instacart Connect integration
- Cookware management
- Cooking terms reference database
- Nutrition lookup via USDA FoodData Central
- Shelf life estimation system
- Waste reduction tracking and analytics
- Local-first sync engine with offline support and conflict resolution
- Referral system
- Comprehensive onboarding flow

## Weaknesses
- Single subscription tier (PRO only) — no free tier or graduated feature access for user acquisition
- Waste reduction analytics exist but no gamification or streak tracking to drive engagement
- No recipe sharing or social features
- No ingredient substitution suggestions during cooking (modal exists but trigger is manual)

## Remediation Steps

**Step 1 — Add a limited free tier to improve user acquisition**
```
In shared/subscription.ts, add a FREE tier to the SubscriptionTier enum and TIER_CONFIG with limits: maxPantryItems: 25, maxAiRecipesPerMonth: 5, maxCookwareItems: 10, and feature booleans canUseRecipeScanning: false, canUseBulkScanning: false, canUseAiKitchenAssistant: false, canUseWeeklyMealPrepping: false. Update requireSubscription middleware to allow FREE tier users through for basic CRUD routes while blocking premium features. Update the SubscriptionScreen to show an upgrade prompt with feature comparison.
```

**Step 2 — Add waste reduction streaks and gamification**
```
Add a "streak" counter to the user profile in userSyncKV (section: analytics). In the WasteReductionStats component, track consecutive weeks where wasted items decreased or stayed at zero. Show a streak badge, a personal best indicator, and encouraging messages. Add a weekly push notification summarizing waste reduction progress via the existing notification system.
```
