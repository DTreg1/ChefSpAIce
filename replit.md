# ChefSpAIce

## Overview
Kitchen inventory management app with AI-powered recipe generation, meal planning, and shopping lists. Single subscription model ($9.99/mo or $99.90/yr) with 7-day free trial. iOS Liquid Glass Design aesthetic. React Native + Expo for mobile, React web for landing/admin pages.

## User Preferences
- Communication: Simple, everyday language

## Tech Stack
- **Frontend**: React Native + Expo (mobile), React web (landing/admin). Wouter routing (web). TanStack React Query v5.
- **Backend**: Express.js, Drizzle ORM, PostgreSQL (Neon-backed)
- **AI**: OpenAI API via Replit AI Integrations (recipes, chat, vision scanning)
- **Payments**: Stripe (subscriptions, proration, retention), RevenueCat webhooks (StoreKit/Apple IAP)
- **Storage**: Replit Object Storage (`@replit/object-storage`)
- **Auth**: Custom session tokens, social login (Google/Apple), multi-session, biometric
- **Shopping**: Instacart Connect (product matching, shopping lists, delivery). UPCs and brand filters for precise matching.
- **Nutrition**: USDA FoodData Central (nutrition label display only, on-demand lookup)

## Installed Integrations
- `javascript_openai_ai_integrations` — OpenAI API key management
- `stripe` — Stripe API key management
- `javascript_database` — PostgreSQL database
- `javascript_object_storage` — Replit Object Storage

## Project Structure
```
client/                              # NOTE: No src/ subdirectory — files live directly under client/
  App.tsx                            # Mobile entry (Expo Router/Drawer)
  App.web.tsx                        # Web entry (Wouter routing)
  screens/                           # 33 mobile screens + web/ subdirectory
    web/                             # Web-only: About, Privacy, Terms, Support, Attributions
  components/
    landing/                         # Web landing page (~20 components)
    inventory/                       # Inventory list, filters, swipeable cards, nutrition summary
    recipe-detail/                   # Recipe hero, header, ingredients, instructions, nutrition, cookware
    meal-plan/                       # Day selector, week nav, slot cards, action sheet, skeleton
    settings/                        # ~15 settings sub-sections
    recipes/                         # Recipe skeleton loaders
    (root)                           # Shared: ChatModal, GlassCard, GlassButton, FloatingChatButton,
                                     #   ErrorBoundary, EmptyState, LoadingState, AddMenu, DrawerContent, etc.
  contexts/                          # Auth, Theme, Subscription, FloatingChat, Glass, Onboarding, Search
  hooks/                             # 24 hooks (subscription, biometric, trial, storeKit, instacart,
                                     #   voice, sync, expiration, export, debounce, device, theme,
                                     #   payment-notifications, quick-recipe, shelf-life, storage-suggestion, etc.)
  navigation/                        # Drawer, Tab, and Stack navigators (8 files)
  lib/                               # analytics, deep-linking, notifications, offline queue,
                                     #   sync-manager, query-client, storage, voice-commands, etc.
  constants/                         # meal-plan, theme
  data/                              # landing-data.ts
server/
  routes.ts                          # Main route registration (~441 lines)
  storage.ts                         # DB storage interface (IStorage, ~30 lines)
  lib/
    unit-conversion.ts               # Standalone weight/volume conversion + Instacart unit mapping
  routers/
    auth, sync, chat, feedback, shelf-life, social-auth, referral,
    recipeImages, revenuecat-webhook, donations, external-api, instacart,
    logo-export, notifications, nutrition-lookup
    admin/                           # analytics, data-export, subscriptions
    sync/                            # inventory, recipes, cookware, shopping, meal-plans, helpers
    user/                            # appliances, cooking-terms, data-export, ingredients,
                                     #   nutrition, recipes, suggestions
    platform/
      voice.router.ts                # Voice processing
      ai/                            # image-analysis, receipt-analysis (OpenAI Vision)
  stripe/                            # stripeClient, subscriptionConfig/Router/Service, webhookHandlers
  services/                          # notification, objectStorage, recipeGeneration, subscription,
                                     #   nutritionLookupService (USDA nutrition-only wrapper)
  seeds/                             # seed-appliances, seed-cooking-terms, seed-demo-account, seed-starter-foods
  __tests__/                         # 10 test files
shared/
  schema.ts                          # Drizzle DB schema (~1180 lines, all tables)
  subscription.ts                    # Tier definitions & limits
migrations/                          # 3 Drizzle Kit SQL migrations
```

## Database Tables (shared/schema.ts)
users, auth_providers, user_sessions, password_reset_tokens, user_sync_data, user_inventory_items, user_saved_recipes, user_meal_plans, user_shopping_items, user_cookware_items, cooking_terms, appliances, user_appliances, nutrition_corrections, feedback_buckets, feedback, subscriptions, conversion_events, cancellation_reasons, referrals, notifications

## Key API Routes
- **Auth**: `/api/auth/*` — register, login, logout, sessions, social, password
- **Sync**: `/api/sync/*` — full/delta sync per section
- **Subscriptions**: `/api/subscriptions/*` — checkout, upgrade, cancel, pause, proration, retention
- **Admin**: `/api/admin/analytics/*` — metrics, churn, conversion, MRR
- **AI**: `/api/chat`, recipe generation, food/receipt image scanning
- **Nutrition**: `/api/nutrition/lookup` — on-demand USDA nutrition label data (by name/brand or fdcId)
- **User Data**: `/api/user/*` — appliances, cookware, nutrition, recipes, ingredients, cooking-terms, export, suggestions
- **Instacart**: `/api/instacart/*` — status, retailers, products-link, recipe shopping links (UPCs, brand_filters, measurements)
- **Other**: notifications, referrals, shelf-life, donations, RevenueCat webhook

## Subscription Model
- Single plan: $9.99/mo or $99.90/yr — unlimited everything, all features
- 7-day free trial for new users with full access
- After trial expires without subscribing → access fully locked (must subscribe to continue)
- Internal tiers: TRIAL (expired/locked out, all limits = 0) and PRO (active subscriber or trialing, unlimited)
- Stripe payments, RevenueCat for StoreKit/Apple IAP, payment failure notifications
- No tier selection UI — one plan, monthly/annual billing toggle only

## Dev Workflow
- Run: `npm run dev` → Express backend + Vite frontend on port 5000
- Workflow name: **"Start dev servers"**
- HMR enabled for frontend; backend changes require workflow restart
- Build: `npm run build` → esbuild bundles server to `server_dist/`
- Tests: `npm test` (Jest)
- Migrations: `npx drizzle-kit generate` / `npx drizzle-kit migrate` / `npx drizzle-kit push`

## External APIs
- OpenAI (recipes, chat, vision) — Replit AI integration
- Stripe (payments) — Replit Stripe integration
- USDA FoodData Central (nutrition labels only — not for food search)
- Instacart Connect (shopping lists, product matching, delivery)
- Replit Object Storage

## Domain Architecture (shared/domain/ + server/domain/)
- **Domain types** (`shared/domain/`): Value objects (Email, Username, AuthToken), entities (User, AuthProvider, Session, Permission), aggregates (UserAccount, UserProfile), domain events (UserSignedUp, UserLoggedIn, PermissionGranted, AccountDeleted)
- **Domain services** (`server/domain/services/`):
  - `AuthenticationService` — register, login, session creation/revocation, password hashing/validation
  - `PermissionService` — wraps subscription entitlements into Permission entities
  - `AccountDeletionService` — extracted account deletion logic (Stripe cancellation, image cleanup, data purge)
- **Router pattern**: Routers handle HTTP concerns (request parsing, response formatting, middleware, cookies); services handle business logic and return domain events as values

## Food Entry & Shopping Architecture
- **Food entry**: Simple text inputs (name, brand, UPC) — no autocomplete or database search
- **Barcode scanning**: Captures UPC only (prefills UPC field on AddItemScreen) for Instacart product matching
- **Shopping**: Instacart handles the complete grocery cycle (shopping list → delivery). Line items support UPCs, brand_filters, health_filters, measurements, and enable_pantry_items.
- **Nutrition**: USDA FoodData Central for on-demand nutrition label display. Cached lookup service (5min TTL) accessed via `/api/nutrition/lookup`. Not used for food search.
- **Unit conversion**: Standalone library (`server/lib/unit-conversion.ts`) with `toInstacartUnit()` normalization, decoupled from USDA.
- **Removed**: OpenFoodFacts integration, FoodSearchAutocomplete, FoodSearchScreen, food.router.ts (search/barcode endpoints), food-sources.ts constants

## Recent Changes
- **Lazy loading screens (Feb 2026)**: Added `React.lazy()` and `Suspense` boundaries to all screen imports across navigation files (`RootStackNavigator`, `InventoryStackNavigator`, `RecipesStackNavigator`, `MealPlanStackNavigator`, `ProfileStackNavigator`, `CookwareStackNavigator`). Created reusable `withSuspense` HOC in `client/lib/lazy-screen.tsx` that wraps lazy components with `CookPotLoader` fallback. ~36 screens are now lazy-loaded, reducing initial bundle size and startup time.
- **Instacart-centric migration (Feb 2026)**: Migrated to Instacart-centric architecture. Created standalone unit conversion library. Enhanced Instacart router with full API support (UPCs, brand_filters, line_item_measurements, health_filters). Created nutrition-only USDA lookup service and endpoint. Replaced FoodSearchAutocomplete with simple text inputs (name, brand, UPC). Added on-demand nutrition label lookup to ItemDetailScreen. Removed OpenFoodFacts, food search router, barcode lookup endpoints, FoodSearchScreen, BarcodeTestScreen, and food-sources constants.
- **Single-plan subscription simplification (Feb 2026)**: Removed BASIC tier entirely. App now has one subscription plan ($9.99/mo, $99.90/yr) with 7-day free trial. After trial expires without subscribing, access is fully locked (all limits = 0). Removed TierSelector component, simplified FeatureComparisonTable to single features list, updated TrialEndedModal/UpgradePrompt messaging to "subscribe" instead of "upgrade to tier". Removed BASIC from Stripe config, webhook handlers, subscription router, StoreKit service. Updated landing page PricingSection to single plan card. Updated subscription-terms.ts with explicit single-plan pricing language. Internal enum: TRIAL (locked out) and PRO (active/trialing).
- **Domain-driven design refactor (Feb 2026)**: Extracted auth business logic into domain services layer. auth.router.ts reduced from 1312→1069 lines. social-auth.router.ts consolidated session creation via shared createSession service. Domain types in shared/domain/ provide clean abstractions for value objects, entities, aggregates, and events. Email validation wrapped in AppError.badRequest for consistent 400 responses.
- **Auth architecture cleanup (Feb 2026)**: Centralized shared session utilities (generateToken, getExpiryDate, setAuthCookie, clearAuthCookie) into `server/lib/session-utils.ts`, eliminating duplication between auth.router.ts and social-auth.router.ts. Refactored social-auth.router.ts from raw pg Pool queries to Drizzle ORM for consistency. Fixed logout data-clearing: added 4 missing AsyncStorage keys (onboarding_step, pending_purchase, register_prompt_dismissed_at, onboarding) to signOut(). Audited auth token storage — dual-key pattern (@chefspaice/auth + @chefspaice/auth_token) confirmed consistent across all auth flows.
- **Password reset tokens to DB (Feb 2026)**: Moved password reset tokens from in-memory `Map` to a `password_reset_tokens` database table. Tokens now survive server restarts and work across multiple instances. Old tokens for a user are deleted when a new reset is requested. Table uses `ON DELETE CASCADE` from users.
- **FREE→TRIAL rename (Feb 2026)**: Renamed `SubscriptionTier.FREE` to `SubscriptionTier.TRIAL` across entire codebase (enum, DB default, server, client, admin). `isFreeUser` → `isTrialUser`. Feature comparison column "Free" → "Trial". No separate free tier exists — 7-day trial is the free experience.
- **Apple compliance audit (Feb 2026)**: Created shared `useManageSubscription` hook (CustomerCenter-first on iOS), shared `subscription-terms.ts` constants, shared `SubscriptionLegalLinks` component, fixed hardcoded USD price fallbacks on iOS/Android (shows plan names instead), platform-aware Terms of Service pricing, removed Free tier from purchase flow (TierSelector only shows Basic/Pro), "Save 17%" → "Best Value" on native, verified donation gating is web-only. Server-side platform guards on Stripe endpoints (`create-checkout-session`, `upgrade`, `preview-proration`) to block native iOS/Android requests (guideline 3.1.1). Privacy policy updated with "Data Retention & Account Deletion" section (guideline 5.1.2) in both web and native screens.
- Subscription/pricing: StoreKit data on mobile, annual discount, legal disclosures, restore purchases, trial info cleanup, duplicate plan fix
- UI: Centralized color definitions app-wide
- Platform: Aligned subscription management and donations with platform guidelines
