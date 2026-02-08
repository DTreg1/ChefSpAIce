# ChefSpAIce

## Overview
ChefSpAIce is a mobile application designed to manage kitchen inventory, reduce food waste, and promote sustainable eating habits. It offers AI-powered recipe generation, meal planning, and shopping list management. The project aims to provide a comprehensive solution for efficient food management through intelligent features and a focus on sustainability, with a business vision to offer a freemium model (Free, Basic, Pro tiers) to maximize user acquisition and retention.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
The application features an iOS 26 Liquid Glass Design aesthetic with light/dark mode, a centralized design system, and responsive layouts for phones and tablets. The frontend is built with React Native and Expo, utilizing React Navigation, React Native Reanimated, and TanStack React Query. It adopts a local-first data approach with AsyncStorage for offline persistence.

The backend uses Express.js and Node.js, with Drizzle ORM and PostgreSQL. Key features include a custom authentication system with social login, session tokens, and multi-session management. A Real-Time Sync Manager handles data synchronization with optimistic updates, delta sync, and interactive conflict resolution. AI integration via OpenAI API provides equipment-aware and inventory-specific recipe generation, fuzzy matching, smart shelf-life suggestions, and AI food identification through barcode, nutrition label, recipe, and grocery receipt scanning (using OpenAI Vision).

The system supports a root stack navigator with five-tab bottom navigation, trial and subscription management with guest accounts and data migration, and a guided onboarding flow. All authenticated user data syncs to PostgreSQL with retry logic and conflict resolution. Additional features include Instacart integration, Siri Shortcuts, biometric authentication, deep linking, and comprehensive accessibility. Atomic database transactions ensure data integrity.

## Admin Analytics Dashboard
The admin dashboard is served at `/admin` (requires auth + admin role). It includes:
- **Base analytics** (`GET /api/admin/analytics`): User metrics, subscription breakdown, revenue overview, AI usage, user growth, top food items
- **Subscription metrics** (`GET /api/admin/analytics/subscription-metrics`): Per-tier counts (FREE/BASIC/PRO), active counts, MRR breakdown by tier and plan type
- **Trial conversion** (`GET /api/admin/analytics/trial-conversion`): Trials started/converted, conversion rate, average trial duration
- **Churn rate** (`GET /api/admin/analytics/churn-rate`): Monthly cancellation history (12 months), per-month churn rates, current month churn
- **Conversion funnel** (`GET /api/admin/analytics/conversion-funnel`): FREE→Trial→Basic→Pro conversion rates, plus `conversionEvents` table data (all-time and 30-day breakdowns by tier path, total conversions)
- Pricing used in MRR calculations: BASIC $4.99/mo, $39.99/yr; PRO $9.99/mo, $79.99/yr

## Subscription Proration
Stripe proration is enabled for subscription upgrades/downgrades:
- `POST /api/subscriptions/preview-proration`: Preview prorated amount before confirming plan change (requires `newPriceId`)
- `POST /api/subscriptions/upgrade`: For existing active/trialing subscribers, uses `stripe.subscriptions.update()` with `proration_behavior: "create_prorations"` for in-place upgrades; for new subscribers, falls back to checkout session
- `POST /api/subscriptions/create-checkout-session`: Also includes `proration_behavior: "create_prorations"` in subscription_data
- Server validates price IDs against active Stripe prices before applying
- Client shows confirmation dialog with prorated amount before confirming upgrade

## Cancellation Flow
Multi-step cancellation retention flow with targeted offers:
- **Database**: `cancellation_reasons` table stores userId, reason, details, offerShown, offerAccepted, createdAt
- `POST /api/subscriptions/cancel`: Cancel subscription at period end with reason tracking (allowed reasons: too_expensive, not_using, missing_features, other)
- `POST /api/subscriptions/pause`: Pause subscription for 1-3 months via Stripe `pause_collection` (behavior: void, resumes_at timestamp)
- `POST /api/subscriptions/apply-retention-offer`: Create and apply 50% off coupon for 3 months via Stripe
- **CancellationFlowModal**: 3-step UI (reason selection → targeted retention offer → confirm cancellation)
  - Step 1: Select reason with optional details
  - Step 2: Targeted offer based on reason (discount for "too_expensive"/"other", pause for "not_using", roadmap for "missing_features")
  - Step 3: Final confirmation showing what they'll lose
- Cancel button shows for both BASIC and PRO active subscribers (non-StoreKit only)

## Database Migrations

### Configuration
- **Config file**: `drizzle.config.ts` — schema source: `./shared/schema.ts`, output: `./migrations/`, dialect: `postgresql`
- **Migrations directory**: `./migrations/` — contains SQL migration files and a `meta/` folder used by Drizzle Kit

### How to Generate a Migration
After making changes to `shared/schema.ts`, run:
```
npx drizzle-kit generate
```
This compares your current schema against the last migration snapshot and produces a new `.sql` file in `./migrations/`.

### How to Apply Migrations
```
npx drizzle-kit migrate
```
This runs any pending migration files against the database specified by `DATABASE_URL`.

### Pre-Migration Checklist
1. Back up the database before applying migrations to production
2. Test the migration on the dev database first — verify it applies cleanly and the app works afterward
3. Review the generated `.sql` file to confirm the changes match your intent (watch for destructive operations like column drops)
4. Ensure no other processes are writing to the database during migration

### Rollback Strategy
- Keep the previous schema version in source control so you can revert if needed
- If a migration has not yet been applied, use `npx drizzle-kit drop` to remove the last generated migration file
- If a migration has already been applied and needs reversal, write a corrective migration that undoes the changes (Drizzle Kit does not auto-generate rollback scripts)

## External Dependencies
- **OpenAI API**: AI-powered recipe generation, conversational assistance, and vision-based scanning.
- **USDA FoodData Central API**: Comprehensive nutrition data lookup.
- **OpenFoodFacts API**: Open-source product information.
- **PostgreSQL**: Primary relational database.
- **Replit Object Storage**: Cloud file storage for assets.
- **Instacart Connect API**: Grocery shopping integration.
- **expo-camera**: Barcode scanning functionality.
- **@react-native-async-storage/async-storage**: Persistent local storage for offline data.