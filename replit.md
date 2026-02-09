# ChefSpAIce

## Overview
Kitchen inventory management app with AI-powered recipe generation, meal planning, and shopping lists. Freemium model (Free/Basic/Pro). iOS 26 Liquid Glass Design aesthetic. React Native + Expo for mobile, React web for landing/admin pages.

## User Preferences
- Communication: Simple, everyday language

## Tech Stack
- **Frontend**: React Native + Expo (mobile), React web (landing/admin). Wouter routing (web). TanStack React Query v5.
- **Backend**: Express.js, Drizzle ORM, PostgreSQL (Neon-backed)
- **AI**: OpenAI API via Replit AI Integrations (recipes, chat, vision scanning)
- **Payments**: Stripe via Replit integration (subscriptions, proration, retention), RevenueCat webhooks (StoreKit/Apple IAP)
- **Storage**: Replit Object Storage (cloud assets via `@replit/object-storage`)
- **Auth**: Custom session tokens, social login (Google/Apple), multi-session, biometric

## Installed Integrations
- `javascript_openai_ai_integrations` — OpenAI API key management
- `stripe` — Stripe API key management
- `javascript_database` — PostgreSQL database
- `javascript_object_storage` — Replit Object Storage

## Project Structure
```
client/
  App.tsx                         # Mobile entry (Expo Router/Drawer)
  App.web.tsx                     # Web entry (Wouter routing)
  screens/                        # 33 mobile screens
    web/                          # Web-only: About, Privacy, Terms, Support, Attributions
  components/
    landing/                      # Web landing page (~20 components: Hero, Pricing, FAQ, Features, etc.)
    inventory/                    # Inventory list, filters, swipeable cards, nutrition summary
    recipe-detail/                # Recipe hero, header, ingredients, instructions, nutrition, cookware
    meal-plan/                    # Day selector, week nav, slot cards, action sheet, skeleton
    settings/                     # ~15 settings sub-sections (account, biometric, cloud sync, etc.)
    recipes/                      # Recipe skeleton loaders
    (root)                        # Shared: ChatModal, GlassCard, GlassButton, FloatingChatButton,
                                  #   ErrorBoundary, EmptyState, LoadingState, AddMenu, DrawerContent,
                                  #   CustomTabBar, FoodSearchAutocomplete, NutritionLabel, etc.
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
    useAIVoice.ts                  # AI voice features
    useVoiceChat.ts                # Voice chat
    useVoiceInput.ts               # Voice input
    useTextToSpeech.ts             # Text-to-speech
    useRecipeVoiceNavigation.ts    # Hands-free recipe nav
    usePaymentNotifications.ts     # Payment failure alerts
    useSyncStatus.ts               # Cloud sync status
    useOnlineStatus.ts             # Network connectivity
    useExpirationNotifications.ts  # Expiry alerts
    useInventoryExport.ts          # Export inventory data
    useShelfLifeSuggestion.ts      # AI shelf life tips
    useQuickRecipeGeneration.ts    # Quick recipe from ingredients
    useStorageSuggestion.ts        # Storage location suggestions
    useDebounce.ts                 # Input debouncing
    useDeviceType.ts               # Device detection
    useScreenOptions.ts            # Screen configuration
    useTheme.ts                    # Theme hook
server/
  routes.ts                       # Main route registration (~441 lines)
  storage.ts                      # DB storage interface (IStorage)
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
    donations.router.ts           # Donation handling
    external-api.router.ts        # External API proxy
    instacart.router.ts           # Instacart integration
    logo-export.router.ts         # Logo export utility
    notifications.router.ts       # Notification endpoints
    admin/
      analytics.router.ts         # Admin analytics dashboard
      data-export.router.ts       # Admin data export
      subscriptions.router.ts     # Admin subscription management
    sync/                         # Per-section sync routers
      inventory-sync.ts, recipes-sync.ts, cookware-sync.ts,
      shopping-sync.ts, meal-plans-sync.ts, sync-helpers.ts
    user/                         # User data routers
      appliances.router.ts, cooking-terms.router.ts, data-export.router.ts,
      ingredients.router.ts, nutrition.router.ts, recipes.router.ts,
      suggestions.router.ts
    platform/
      food-search.router.ts       # USDA + OpenFoodFacts search
      voice.router.ts             # Voice processing
      ai/
        image-analysis.router.ts  # Food/receipt/recipe image scanning
        recipe-scan.router.ts     # Recipe URL/photo scanning
        receipt-analysis.router.ts # Receipt scanning
  stripe/                         # Stripe subscription system
    stripeClient.ts               # Stripe SDK client
    subscriptionConfig.ts         # Plan/price config
    subscriptionRouter.ts         # Stripe API routes
    subscriptionService.ts        # Subscription business logic
    webhookHandlers.ts            # Stripe webhook processing
  services/
    notificationService.ts        # Push/in-app notifications
    objectStorageService.ts       # Replit Object Storage wrapper
    recipeGenerationService.ts    # OpenAI recipe generation
    subscriptionService.ts        # Subscription business logic
  seeds/                          # Seed data scripts
    seed-appliances.ts, seed-cooking-terms.ts,
    seed-demo-account.ts, seed-starter-foods.ts
  __tests__/                      # 10 test files
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
- **Instacart**: `/api/instacart/*`
- **Donations**: `/api/donations/*`
- **RevenueCat**: `/api/revenuecat/webhook`

## Subscription & Payments
- Tiers: FREE / BASIC ($4.99/mo, $39.99/yr) / PRO ($9.99/mo, $79.99/yr)
- FREE limits: 10 pantry items, 2 AI recipes/mo, 3 cookware
- BASIC limits: 25 pantry items, 5 AI recipes/mo, 5 cookware
- PRO: Unlimited pantry/recipes, all features (scanning, AI assistant, meal prep)
- Tier limits defined in `shared/subscription.ts`
- Stripe proration on upgrades/downgrades
- Cancellation flow: reason selection, targeted retention offer (discount/pause/roadmap), confirmation
- RevenueCat webhook support for StoreKit purchases
- Payment failure notifications with deep links
- Trial period tracking via `useTrialStatus` hook

## Migrations
- Config: `drizzle.config.ts` (schema: `./shared/schema.ts`, output: `./migrations/`)
- Generate: `npx drizzle-kit generate`
- Apply: `npx drizzle-kit migrate`
- Push (dev): `npx drizzle-kit push`
- Current: 3 migration files (initial, text-to-jsonb, delta sync)

## External APIs
- OpenAI (recipes, chat, vision scanning) — managed via Replit AI integration
- Stripe (payments) — managed via Replit Stripe integration
- USDA FoodData Central (nutrition)
- OpenFoodFacts (product info)
- Instacart Connect (grocery ordering)
- Replit Object Storage (file assets) — managed via Replit integration

## Dev Workflow
- Run: `npm run dev` → starts Express backend + Vite frontend
- Workflow name: "Start dev servers"
- Frontend binds to 0.0.0.0:5000
- HMR enabled for frontend changes
- Build: `npm run build` → `esbuild` bundles server to `server_dist/`
- Tests: `npm test` (Jest), plus individual test commands (`test:auth`, `test:subscription`, etc.)

## Recent Changes
- Centralized color definitions across the app
- Added legal disclosures and restore purchases to subscription screens
- Improved subscription screen clarity and pricing display
- Added welcome step and account creation to onboarding flow
- In-app purchase flow improvements
- Guest vs logged-in drawer navigation adjustments
