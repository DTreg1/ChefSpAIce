# ChefSpAIce

## Overview
ChefSpAIce is a mobile application designed to help users manage their kitchen and reduce food waste. It enables tracking of food inventory across various storage locations, provides AI-powered recipe generation based on available ingredients, facilitates meal planning, and manages shopping lists. The application aims to provide a comprehensive solution for efficient food management, promoting sustainability and healthy eating habits.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
### Frontend
The application is built with React Native and Expo, utilizing React Navigation for navigation, React Native Reanimated for animations, and TanStack React Query for data fetching. The UI/UX follows an iOS 26 Liquid Glass Design aesthetic with light/dark mode support, defined by a centralized design system. Data is managed with a local-first approach using AsyncStorage for offline persistence and React Query for server state.

### Backend
The backend utilizes Express.js and Node.js. Data storage uses Drizzle ORM with PostgreSQL. A custom authentication system handles user registration, login, and session management, requiring users to authenticate and maintain an active subscription. A Real-Time Sync Manager ensures data consistency between local storage and the cloud with optimistic updates and conflict resolution. AI integration leverages OpenAI API (GPT-4o-mini) for equipment-aware and inventory-specific recipe generation, enhanced fuzzy matching, and shelf life suggestions.

### Key Features and Technical Implementations
- **Navigation:** Root stack navigator for modals, five-tab bottom navigation with individual stack navigators per tab (Inventory, Recipes, Meal Plan, Profile).
- **Design System:** iOS 26 Liquid Glass Design with blur effects, theme support, and reusable components.
- **ExpoGlassHeader:** Unified header component providing consistent glass morphism design across ALL screens (both tab and stack navigation). Features a hamburger menu (left) for drawer navigation, an expandable search icon (center-left) with Reanimated animations, and a three-dot options menu (right) containing screen-specific actions like export and filtering. Each screen renders its own header instance to access local state while maintaining visual consistency. Active menu states show checkmark indicators with primary color highlighting. Export operations include loading states and disabled guards to prevent double-triggering. Standard header padding is 56 + insets.top + Spacing.lg across all screens.
- **State Management:** AsyncStorage for local data, React Query for server state, and component-level React hooks.
- **Authentication:** Custom username/password with SHA-256 hashing, social login (Apple Sign-In, Google Sign-In), and 30-day session tokens. Two auth patterns are used:
  - **Bearer Tokens:** Used by protected API routes (`/api/user/*`, `/api/admin/*`, `/api/sync/*`) via `Authorization: Bearer <token>` header. The `requireAuth` and `requireAdmin` middleware validate tokens against the `userSessions` table.
  - **Cookies:** HTTP-only cookie (`chefspaice_auth`) for web session persistence. The `/api/auth/restore-session` endpoint checks this cookie to restore sessions after page reload.
  - **Platform Auth Support:**
    - iOS: Native Apple Sign-In via expo-apple-authentication
    - Android: Google Sign-In via expo-auth-session/providers/google with `useIdTokenAuthRequest`
    - Web: Google Sign-In (via useIdTokenAuthRequest) and Apple Sign-In (via expo-auth-session OAuth code flow)
  - **Web OAuth Requirements:**
    - Google: Requires `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` environment variable
    - Apple: Requires `EXPO_PUBLIC_APPLE_CLIENT_ID` (client-side), plus `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY` (server-side). The Apple Service ID redirect URL must match the AuthSession redirect URI.
- **Trial Subscription System:** New users receive a 7-day free trial. A background job runs hourly to check for expired trials and automatically downgrade users to Basic tier. When a trial expires, a modal displays the Basic plan limits and Pro features the user will lose, with options to upgrade or dismiss. Dismissed state is persisted in AsyncStorage.
- **Tiered Subscription Limits:** Basic tier ($4.99/month) includes 25 pantry items, 5 AI recipes/month, and 5 cookware items. Pro tier ($9.99/month) offers unlimited pantry/cookware/AI recipes, plus Recipe Scanning, Bulk Scanning, Live AI Kitchen Assistant, Custom Storage Areas, and Weekly Meal Prepping. Limits are enforced in both UI (disabled states, counters, UpgradePrompt modals) and during onboarding (cookware pre-selection respects tier limits).
- **Onboarding Flow:** A 6-step sequence for new users to set preferences, define storage areas, select starter foods, and input kitchen equipment. Returning users bypass this flow.
- **Cloud Sync:** All authenticated user data is synced to PostgreSQL as JSON, managed by a real-time sync manager with retry logic and conflict resolution. **Known Limitations:**
  - Conflict resolution uses timestamp-based "last write wins" strategy. Concurrent edits from multiple devices may result in data loss if changes happen within the same sync interval.
  - Subscription limit checks and sync operations are not transactional; rare race conditions in read-modify-write operations could theoretically occur under high concurrency.
  - Per-field merge logic is not implemented; entire objects are replaced during conflict resolution.
- **Recipe Image Cloud Sync:** Recipe images are automatically uploaded to cloud storage (Replit Object Storage/GCS) in the background when recipes are created or updated. Each Recipe has a `cloudImageUri` field that stores the public cloud URL. When loading recipes, the system first attempts to use local images (stored: references or file:// URIs), and falls back to `cloudImageUri` if local images are unavailable. This enables cross-device image syncing - recipes viewed on a new device will automatically display cloud-hosted images. Cloud upload is non-blocking and preserves offline-first behavior.
- **Storage Preferences:** The system learns user storage choices per item and category, providing smart suggestions based on history and predefined shelf-life data.
- **AI Integration:** OpenAI GPT-4o-mini for recipe generation, kitchen assistant chat, and shelf-life suggestions. The AI chat assistant uses function calling to perform actions like adding items, generating recipes, and creating shopping lists, with full visibility into user preferences and equipment.
- **Equipment-Aware Recipes:** Recipes consider the user's owned equipment, suggesting alternatives and filtering options.
- **Inventory-Only Recipes:** Generates recipes strictly from the user's current inventory, with advanced fuzzy matching and post-generation validation.
- **Smart Shelf Life:** Automatic expiration date suggestions based on food name, storage location, and an AI fallback for unknown items.
- **Push Notifications:** Local notifications for expiring food items, configurable by the user.
- **Scan Hub:** Centralized scanning interface for product barcodes, nutrition labels, recipes from paper, and AI food identification using GPT-4o vision.
- **Offline Mode Indicator:** Animated banner indicating network status and pending sync changes.
- **Stripe Donations:** Integration for secure user donations.
- **Instacart Integration:** Allows users to send shopping lists and recipe ingredients directly to Instacart.
- **Data Export:** Functionality to export inventory and recipes as CSV or PDF files.
- **Inventory Filtering:** Advanced filtering by food group, sort options, and search capabilities.
- **Feedback & Bug Reporting:** Users can submit feedback or bug reports via the AI chat modal.
- **AI-Powered Feedback Resolution Manager:** An admin-only feature that uses AI to group similar feedback items, generate implementation prompts, and manage resolution.
- **Unified Onboarding Architecture:** A single entry point (App.tsx) manages the user flow for web and mobile platforms, routing unauthenticated web users to a marketing LandingScreen and all users through a multi-step OnboardingScreen for signup/signin and initial setup.

## External Dependencies
- **OpenAI API**: For AI-powered recipe generation and conversational kitchen assistance (gpt-4o-mini).
- **USDA FoodData Central API**: For comprehensive nutrition data lookup.
- **OpenFoodFacts API**: For open-source product information.
- **PostgreSQL**: Primary relational database, managed with Drizzle ORM.
- **Replit Object Storage**: Cloud file storage for user uploads and assets.
- **expo-camera**: For barcode scanning.
- **date-fns**: For date manipulation.
- **@react-native-async-storage/async-storage**: Persistent local storage.