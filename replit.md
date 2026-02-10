# ChefSpAIce

## Overview
Kitchen inventory management app with AI-powered recipe generation, meal planning, and shopping lists. Freemium model (Free/Basic/Pro). iOS Liquid Glass Design aesthetic. React Native + Expo for mobile, React web for landing/admin pages.

## User Preferences
- Communication: Simple, everyday language

## Tech Stack
- **Frontend**: React Native + Expo (mobile), React web (landing/admin). Wouter routing (web). TanStack React Query v5.
- **Backend**: Express.js, Drizzle ORM, PostgreSQL (Neon-backed)
- **AI**: OpenAI API via Replit AI Integrations (recipes, chat, vision scanning)
- **Payments**: Stripe (subscriptions, proration, retention), RevenueCat webhooks (StoreKit/Apple IAP)
- **Storage**: Replit Object Storage (`@replit/object-storage`)
- **Auth**: Custom session tokens, social login (Google/Apple), multi-session, biometric

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
  constants/                         # food-sources, meal-plan, theme
  data/                              # landing-data.ts
server/
  routes.ts                          # Main route registration (~441 lines)
  storage.ts                         # DB storage interface (IStorage, ~30 lines)
  routers/
    auth, sync, chat, feedback, food, shelf-life, social-auth, referral,
    recipeImages, revenuecat-webhook, donations, external-api, instacart,
    logo-export, notifications
    admin/                           # analytics, data-export, subscriptions
    sync/                            # inventory, recipes, cookware, shopping, meal-plans, helpers
    user/                            # appliances, cooking-terms, data-export, ingredients,
                                     #   nutrition, recipes, suggestions
    platform/
      food-search.router.ts          # USDA + OpenFoodFacts search
      voice.router.ts                # Voice processing
      ai/                            # image-analysis, receipt-analysis (OpenAI Vision)
  stripe/                            # stripeClient, subscriptionConfig/Router/Service, webhookHandlers
  services/                          # notification, objectStorage, recipeGeneration, subscription
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
- **Food**: `/api/food/*` — USDA, OpenFoodFacts lookup
- **User Data**: `/api/user/*` — appliances, cookware, nutrition, recipes, ingredients, cooking-terms, export, suggestions
- **Other**: notifications, referrals, shelf-life, instacart, donations, RevenueCat webhook

## Subscription Tiers
- TRIAL (7-day free trial, default for new users): 10 pantry items, 2 AI recipes/mo, 3 cookware
- BASIC ($4.99/mo, $49.90/yr): 25 pantry items, 5 AI recipes/mo, 5 cookware
- PRO ($9.99/mo, $99.90/yr): Unlimited everything, all features
- No separate "Free" tier — the 7-day trial is the free experience
- Stripe proration, cancellation retention flow, RevenueCat for StoreKit, payment failure notifications

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
- USDA FoodData Central, OpenFoodFacts
- Instacart Connect
- Replit Object Storage

## Recent Changes
- **Password reset tokens to DB (Feb 2026)**: Moved password reset tokens from in-memory `Map` to a `password_reset_tokens` database table. Tokens now survive server restarts and work across multiple instances. Old tokens for a user are deleted when a new reset is requested. Table uses `ON DELETE CASCADE` from users.
- **FREE→TRIAL rename (Feb 2026)**: Renamed `SubscriptionTier.FREE` to `SubscriptionTier.TRIAL` across entire codebase (enum, DB default, server, client, admin). `isFreeUser` → `isTrialUser`. Feature comparison column "Free" → "Trial". No separate free tier exists — 7-day trial is the free experience.
- **Apple compliance audit (Feb 2026)**: Created shared `useManageSubscription` hook (CustomerCenter-first on iOS), shared `subscription-terms.ts` constants, shared `SubscriptionLegalLinks` component, fixed hardcoded USD price fallbacks on iOS/Android (shows plan names instead), platform-aware Terms of Service pricing, removed Free tier from purchase flow (TierSelector only shows Basic/Pro), "Save 17%" → "Best Value" on native, verified donation gating is web-only
- Subscription/pricing: StoreKit data on mobile, annual discount, legal disclosures, restore purchases, trial info cleanup, duplicate plan fix
- UI: Centralized color definitions app-wide
- Platform: Aligned subscription management and donations with platform guidelines
