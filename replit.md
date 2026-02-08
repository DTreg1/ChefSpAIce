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
- **Conversion funnel** (`GET /api/admin/analytics/conversion-funnel`): FREE→Trial→Basic→Pro conversion rates
- Pricing used in MRR calculations: BASIC $4.99/mo, $39.99/yr; PRO $9.99/mo, $79.99/yr

## Subscription Proration
Stripe proration is enabled for subscription upgrades/downgrades:
- `POST /api/subscriptions/preview-proration`: Preview prorated amount before confirming plan change (requires `newPriceId`)
- `POST /api/subscriptions/upgrade`: For existing active/trialing subscribers, uses `stripe.subscriptions.update()` with `proration_behavior: "create_prorations"` for in-place upgrades; for new subscribers, falls back to checkout session
- `POST /api/subscriptions/create-checkout-session`: Also includes `proration_behavior: "create_prorations"` in subscription_data
- Server validates price IDs against active Stripe prices before applying
- Client shows confirmation dialog with prorated amount before confirming upgrade

## External Dependencies
- **OpenAI API**: AI-powered recipe generation, conversational assistance, and vision-based scanning.
- **USDA FoodData Central API**: Comprehensive nutrition data lookup.
- **OpenFoodFacts API**: Open-source product information.
- **PostgreSQL**: Primary relational database.
- **Replit Object Storage**: Cloud file storage for assets.
- **Instacart Connect API**: Grocery shopping integration.
- **expo-camera**: Barcode scanning functionality.
- **@react-native-async-storage/async-storage**: Persistent local storage for offline data.