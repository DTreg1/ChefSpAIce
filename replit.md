# ChefSpAIce

## Overview
Kitchen inventory management app with AI-powered recipe generation, meal planning, and shopping lists. Freemium model (Free/Basic/Pro). iOS 26 Liquid Glass Design aesthetic. React Native + Expo for mobile, React web for landing/admin pages.

## User Preferences
- Communication: Simple, everyday language

## Tech Stack
- **Frontend**: React Native + Expo (mobile), React web (landing/admin). Wouter routing (web). TanStack React Query.
- **Backend**: Express.js, Drizzle ORM, PostgreSQL (Neon-backed)
- **AI**: OpenAI API (recipes, chat, vision scanning via `openai` package)
- **Payments**: Stripe (subscriptions, proration, retention), RevenueCat webhooks (StoreKit)
- **Storage**: Replit Object Storage (cloud assets)
- **Auth**: Custom session tokens, social login (Google/Apple), multi-session, biometric

## Project Structure
```
client/
  App.tsx                         # Mobile entry (Expo Router/Drawer)
  App.web.tsx                     # Web entry (Wouter routing)
  screens/                        # 33 mobile screens + web/ subfolder
    web/                          # Web-only pages (About, Privacy, Terms, Support, Attributions)
  components/
    landing/                      # Web landing page (~20 components)
    inventory/                    # Inventory list, filters, swipeable cards
    recipe-detail/                # Recipe hero, ingredients, instructions, nutrition
    meal-plan/                    # Day selector, week nav, slot cards
    settings/                     # Settings sub-sections (~15 components)
    recipes/                      # Recipe skeleton loaders
  contexts/
    AuthContext.tsx                # Auth state, token management
    ThemeContext.tsx               # Light/dark mode
    SubscriptionContext.tsx        # Tier state, limits
    FloatingChatContext.tsx        # AI chat overlay
    GlassContext.tsx               # Glass UI effect context
    OnboardingContext.tsx          # Onboarding flow state
    SearchContext.tsx              # Global search
  hooks/
    useSubscription.tsx            # Subscription tier logic
    useBiometricAuth.ts            # Face ID / fingerprint
    useTrialStatus.ts              # Trial period tracking
    useInstacart.ts                # Instacart ordering
    useStoreKit.ts                 # Apple IAP
    useAIVoice.ts / useVoiceChat.ts / useVoiceInput.ts  # Voice features
    useRecipeVoiceNavigation.ts    # Hands-free recipe nav
    usePaymentNotifications.ts     # Payment failure alerts
    useSyncStatus.ts               # Cloud sync status
    useOnlineStatus.ts             # Network connectivity
    useExpirationNotifications.ts  # Expiry alerts
    useInventoryExport.ts          # Export inventory data
    useShelfLifeSuggestion.ts      # AI shelf life tips
    useQuickRecipeGeneration.ts    # Quick recipe from ingredients
server/
  routes.ts                       # Main route registration (441 lines)
  storage.ts                      # DB storage interface
  routers/
    auth.router.ts                # Auth (login, register, sessions, password)
    sync.router.ts                # Cloud sync orchestrator
    chat.router.ts                # AI chat
    feedback.router.ts            # User feedback/bug reports
    food.router.ts                # Food/nutrition lookup
    shelf-life.router.ts          # Shelf life data
    social-auth.router.ts         # Google/Apple OAuth
    referral.router.ts            # Referral system
    recipeImages.router.ts        # Recipe image generation
    revenuecat-webhook.router.ts  # RevenueCat webhook handler
    admin/                        # Admin analytics dashboard
    sync/                         # Per-section sync (inventory, recipes, cookware, shopping, meal-plans)
    user/                         # User data (appliances, cookware, nutrition, recipes, ingredients, cooking-terms, data-export, suggestions)
    platform/
      food-search.router.ts       # USDA + OpenFoodFacts search
      voice.router.ts             # Voice processing
      ai/
        image-analysis.router.ts  # Food/receipt/recipe image scanning
        recipe-scan.router.ts     # Recipe URL/photo scanning
        receipt-analysis.router.ts # Receipt scanning
  stripe/                         # Stripe subscription (client, config, router, service, webhooks)
  services/
    notificationService.ts        # Push/in-app notifications
    objectStorageService.ts       # Replit Object Storage wrapper
    recipeGenerationService.ts    # OpenAI recipe generation
    subscriptionService.ts        # Subscription business logic
  seeds/                          # Seed data (appliances, cooking-terms, demo-account, starter-foods)
  __tests__/                      # 10 test files (appliances, cooking-terms, food, nutrition, USDA, etc.)
shared/
  schema.ts                       # Drizzle DB schema (~1180 lines, all tables)
  subscription.ts                 # Tier definitions & limits
migrations/                       # 3 Drizzle Kit SQL migrations
```

## Database Tables (shared/schema.ts)
| Table | Purpose |
|-------|---------|
| users | Accounts, preferences, dietary info |
| auth_providers | Social login providers per user |
| user_sessions | Active session tokens |
| user_sync_data | Cloud sync blob (JSONB per section, delta sync) |
| user_inventory_items | Individual food inventory items |
| user_saved_recipes | Saved/generated recipes |
| user_meal_plans | Daily meal plans |
| user_shopping_items | Shopping list items |
| user_cookware_items | Owned cookware |
| cooking_terms | Educational cooking glossary (seeded) |
| appliances | Master appliance list (seeded) |
| user_appliances | User-owned appliances |
| nutrition_corrections | User-submitted nutrition fixes |
| feedback_buckets | Grouped feedback categories |
| feedback | Individual feedback/bug reports |
| subscriptions | Stripe subscription state |
| conversion_events | Tier change tracking |
| cancellation_reasons | Cancellation retention data |
| referrals | Referral tracking |
| notifications | In-app notification queue |

## Key API Routes
- **Auth**: `/api/auth/*` (register, login, logout, sessions, social, password)
- **Sync**: `/api/sync/*` (full sync, delta sync per section: inventory, recipes, cookware, shopping, meal-plans)
- **Subscriptions**: `/api/subscriptions/*` (checkout, upgrade, cancel, pause, proration, retention offers)
- **Admin**: `/api/admin/analytics/*` (metrics, churn, conversion funnel, MRR)
- **Notifications**: `/api/notifications/*` (fetch, mark read)
- **AI**: `/api/chat`, recipe generation, food/recipe/receipt scanning (OpenAI Vision)
- **Food**: `/api/food/*` (USDA, OpenFoodFacts lookup)
- **User Data**: `/api/user/*` (appliances, cookware, nutrition, recipes, ingredients, cooking-terms, data-export, suggestions)
- **Referrals**: `/api/referrals/*`
- **Shelf Life**: `/api/shelf-life/*`
- **RevenueCat**: `/api/revenuecat/webhook`

## Subscription & Payments
- Tiers: FREE / BASIC ($4.99/mo, $39.99/yr) / PRO ($9.99/mo, $79.99/yr)
- Tier limits defined in `shared/subscription.ts` (pantry items, AI recipes/month, cookware, scanning, meal prep, etc.)
- Stripe proration on upgrades/downgrades
- Cancellation flow: reason selection, targeted retention offer (discount/pause/roadmap), confirmation
- RevenueCat webhook support for StoreKit purchases
- Payment failure notifications with deep links
- Trial period tracking via `useTrialStatus` hook

## Migrations
- Config: `drizzle.config.ts` (schema: `./shared/schema.ts`, output: `./migrations/`)
- Generate: `npx drizzle-kit generate`
- Apply: `npx drizzle-kit migrate`
- Current: 3 migration files (initial, text-to-jsonb, delta sync)

## External APIs
- OpenAI (recipes, chat, vision scanning)
- USDA FoodData Central (nutrition)
- OpenFoodFacts (product info)
- Instacart Connect (grocery ordering)
- Replit Object Storage (file assets)

## Dev Workflow
- Run: `npm run dev` (starts Express backend + Vite frontend)
- Workflow name: "Start dev servers"
- Frontend binds to 0.0.0.0:5000
- HMR enabled for frontend changes

## Recent Changes
- Centralized color definitions across the app
- Added legal disclosures and restore purchases to subscription screens
- Improved subscription screen clarity and pricing display
- Added welcome step and account creation to onboarding flow
- In-app purchase flow improvements
- Guest vs logged-in drawer navigation adjustments
