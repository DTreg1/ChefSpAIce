# ChefSpAIce

## Overview
Kitchen inventory management app with AI-powered recipe generation, meal planning, and shopping lists. Freemium model (Free/Basic/Pro). iOS 26 Liquid Glass Design aesthetic.

## User Preferences
- Communication: Simple, everyday language

## Tech Stack
- **Frontend**: React Native + Expo (mobile), React web landing/admin. Wouter routing (web). TanStack React Query.
- **Backend**: Express.js, Drizzle ORM, PostgreSQL
- **AI**: OpenAI API (recipes, chat, vision scanning)
- **Payments**: Stripe (subscriptions, proration, retention)
- **Storage**: Replit Object Storage (cloud assets)
- **Auth**: Custom session tokens, social login (Google/Apple), multi-session, biometric

## Project Structure
```
client/
  App.tsx / App.web.tsx       # Mobile / web entry points
  screens/                    # All app screens (30+)
  components/                 # Reusable components
    landing/                  # Web landing page components
    inventory/                # Inventory-specific components
    recipe-detail/            # Recipe detail components
    meal-plan/                # Meal plan components
    settings/                 # Settings components
  contexts/                   # AuthContext, ThemeContext, etc.
  hooks/                      # Custom hooks (subscription, biometric, etc.)
  services/                   # API service layer
server/
  routes.ts                   # Main route registration
  storage.ts                  # DB storage interface
  routers/                    # Route modules
    auth.router.ts            # Auth (login, register, sessions)
    sync.router.ts            # Cloud sync with delta sync
    chat.router.ts            # AI chat
    feedback.router.ts        # User feedback/bug reports
    food.router.ts            # Food/nutrition lookup
    admin/                    # Admin analytics dashboard
    sync/                     # Per-section sync handlers
    user/                     # User data endpoints
    platform/                 # Food search, voice
  stripe/                     # Stripe subscription management
  services/                   # Notification, recipe gen, object storage
  seeds/                      # Seed data scripts
shared/
  schema.ts                   # Drizzle DB schema (all tables)
  subscription.ts             # Subscription tier definitions
migrations/                   # Drizzle Kit SQL migrations (3 files)
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
- **Auth**: `/api/auth/*` (register, login, logout, sessions, social)
- **Sync**: `/api/sync/*` (full sync, delta sync per section)
- **Subscriptions**: `/api/subscriptions/*` (checkout, upgrade, cancel, pause, proration, retention offers)
- **Admin**: `/api/admin/analytics/*` (metrics, churn, conversion funnel, MRR)
- **Notifications**: `/api/notifications/*` (fetch, mark read)
- **AI**: `/api/chat`, recipe generation, food/recipe/receipt scanning (OpenAI Vision)
- **Food**: `/api/food/*` (USDA, OpenFoodFacts lookup)
- **User Data**: `/api/user/*` (appliances, cookware, nutrition, recipes, ingredients)

## Subscription & Payments
- Tiers: FREE / BASIC ($4.99/mo, $39.99/yr) / PRO ($9.99/mo, $79.99/yr)
- Stripe proration on upgrades/downgrades
- Cancellation flow: reason selection, targeted retention offer (discount/pause/roadmap), confirmation
- RevenueCat webhook support for StoreKit purchases
- Payment failure notifications with deep links

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
