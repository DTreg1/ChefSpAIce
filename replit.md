# ChefSpAIce

## Overview
ChefSpAIce is a mobile application designed to manage kitchen inventory, reduce food waste, and promote sustainable eating habits. It offers AI-powered recipe generation based on available ingredients, meal planning, and shopping list management. The project aims to provide a comprehensive solution for efficient food management, enhancing user experience through intelligent features and a focus on sustainability.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
### Frontend
The application is built with React Native and Expo, leveraging React Navigation, React Native Reanimated, and TanStack React Query. The UI/UX follows an iOS 26 Liquid Glass Design aesthetic with light/dark mode support and a centralized design system. It uses a local-first data approach with AsyncStorage for offline persistence.

### Backend
The backend is powered by Express.js and Node.js, utilizing Drizzle ORM with PostgreSQL for data storage. A custom authentication system handles user management. A Real-Time Sync Manager ensures data consistency with optimistic updates and conflict resolution. AI integration uses the OpenAI API (GPT-4o-mini) for equipment-aware and inventory-specific recipe generation, fuzzy matching, and shelf-life suggestions.

### Key Features
- **Navigation:** Root stack navigator with five-tab bottom navigation, each having individual stack navigators.
- **Design System:** iOS 26 Liquid Glass Design with blur effects, theme support, and reusable components including a unified `ExpoGlassHeader`.
- **State Management:** AsyncStorage for local data, React Query for server state.
- **Authentication:** Custom username/password authentication with SHA-256 hashing, social login (Apple, Google), and 30-day session tokens. Uses both bearer tokens for API routes and HTTP-only cookies for web session persistence.
- **Trial and Subscription System:** New users get a 7-day free trial, with hourly background jobs for trial expiration. Features tiered subscription limits (Basic, Pro) enforced in UI and during onboarding. Apple-compliant guest account system allows users to try the app without registration:
  - `useTrialStatus` hook: Calculates trial days remaining based on first app open (stored in TRIAL_START_DATE)
  - `TrialStatusBadge`: Color-coded badge showing trial status with days remaining
  - `RegisterPrompt`: Dismissible banner/card encouraging registration with clear "optional" messaging (24-hour dismissal tracking)
  - Guest user data persists via AsyncStorage with unique ID generation
  - **Guest Data Migration:** When a guest user registers or signs in, all local data is automatically migrated to their account via `POST /api/auth/migrate-guest-data`. Arrays (inventory, recipes, etc.) are merged by ID to avoid duplicates. Non-array data (preferences, onboarding) only migrates if the account doesn't have existing data. Respects subscription limits (cookware limits, Pro-only features).
  - **Trial Expiration Enforcement:** When the 7-day trial expires, guests are routed to `TrialExpiredScreen` which shows lost features and requires registration before subscribing. Authenticated users with expired subscriptions are routed to `SubscriptionScreen` to resubscribe. Hardware back button is blocked on both screens.
- **Onboarding Flow:** A 6-step sequence for new users to set preferences, define storage areas, and input kitchen equipment.
- **Cloud Sync:** All authenticated user data syncs to PostgreSQL with retry logic and conflict resolution using a "last write wins" strategy. Includes preference syncing with Zod schema validation and battery optimizations (AppState-aware sync, polling intervals, debounced writes, exponential backoff).
- **Recipe Image Cloud Sync:** Automatic background upload of recipe images to cloud storage (Replit Object Storage/GCS) with local fallback.
- **AI Integration:** OpenAI GPT-4o-mini for recipe generation, kitchen assistant chat, and shelf-life suggestions, with function calling for actions like adding items or creating lists.
- **Equipment-Aware Recipes:** Considers user-owned equipment for recipe suggestions and filtering.
- **Inventory-Only Recipes:** Generates recipes strictly from current inventory with fuzzy matching and post-generation validation.
- **Smart Shelf Life:** Automatic expiration date suggestions based on food name, storage location, and AI fallback.
- **Push Notifications:** Local notifications for expiring food items.
- **Scan Hub:** Centralized scanning interface for barcodes, nutrition labels, recipes from paper, AI food identification (GPT-4o vision), and grocery receipt scanning, with camera battery optimizations.
- **Receipt Scanning:** Universal grocery receipt scanning that works with any store. Uses OpenAI Vision (GPT-4o) to extract food items with quantities, prices, and UPC barcodes. Automatically enriches items with USDA nutrition data via UPC lookups. Feeds into the batch add flow for easy inventory import. Pro feature gated via `canUseBulkScanning`.
- **Offline Mode Indicator:** Animated banner for network status and pending sync changes.
- **Stripe Donations:** Integration for web donations.
- **Apple StoreKit Integration:** In-app purchases for iOS/Android via RevenueCat SDK, with server sync for subscription status and platform-specific payment handling.
- **Data Export:** Export inventory and recipes as CSV or PDF.
- **Inventory Filtering:** Advanced filtering, sorting, and search capabilities.
- **Feedback & Bug Reporting:** Users can submit feedback via the AI chat modal.
- **Unified Onboarding Architecture:** Single entry point (`App.tsx`) managing user flow across web and mobile, requiring authentication before app access. The web version serves as a marketing landing page.
- **Instacart Integration:** Users can order missing ingredients directly from Instacart. Available in ShoppingListScreen (order all unchecked items) and RecipeDetailScreen (order missing ingredients scaled to selected servings). Uses `useInstacart` hook for API calls and link handling.
- **Siri Shortcuts Integration:** External API for Siri Shortcuts with four actions: add_item, check_inventory, what_expires, quick_recipe. Users generate API keys from Settings > Integrations > Siri Shortcuts. API keys use "csa_" prefix with 64-character hex string, stored as SHA-256 hash in database. Pro subscription required. In-app guide (`SiriShortcutsGuideScreen`) provides step-by-step setup instructions.

- **Biometric Authentication:** Optional Face ID / fingerprint login for returning users via `expo-local-authentication`. The `useBiometricAuth` hook checks hardware availability, enrollment status, and manages preference storage. AuthContext prompts biometric verification when restoring a stored session (non-web only). A toggle in SettingsScreen (Security section) lets authenticated users enable/disable the feature. Preference is cleared on sign out.

## Recent Changes
- **Routes Refactoring (Feb 2026):** Extracted three large router modules from `server/routes.ts`: `server/routers/chat.router.ts` (AI chat endpoint), `server/routers/shelf-life.router.ts` (shelf life estimation with caching), and `server/routers/food.router.ts` (USDA food search, food details, barcode lookup, and raw barcode endpoints). Also added pull-to-refresh to ShoppingListScreen and MealPlanScreen, recipe sharing in RecipeDetailScreen, and headerRight prop support in ExpoGlassHeader. Reduced routes.ts from ~1,494 lines to ~438 lines.
- **Landing Page Refactor (Feb 2026):** Refactored `client/screens/LandingScreen.tsx` from ~2,490 lines to ~1,048 lines (58% reduction). Extracted 11 components into `client/components/landing/` (GlassCard, FeatureCard, StepCard, BenefitCard, PricingCard, PhoneFrame, HeroDeviceMockup, DeviceMockup, ScreenshotShowcase, FAQItem, ReplitLogo). Moved static data to `client/data/landing-data.ts`. Created shared PhoneFrame component to deduplicate device mockup rendering. Removed ~173 lines of dead code. Fixed dynamic copyright year.
- **Improvement Guide Created (Feb 2026):** Created `IMPROVEMENT_GUIDE.md` with 26 copyable prompts organized by priority across 10 categories (UI/UX, Core Features, Performance, Security, Error Handling, Accessibility, Code Quality, Mobile, Data Management, Monetization). Overall score: 8.7/10.
- **Security Hardening (Feb 2026):** Added CacheService abstraction (`server/lib/cache.ts`), rate limiting (`server/middleware/rateLimiter.ts`: auth 10/15min, AI 30/min, general 100/min), and CSRF protection (`server/middleware/csrf.ts`) for cookie-based auth routes. Bearer token requests bypass CSRF. CSRF tokens returned on login/register/restore-session. Converted userSyncData columns from text to native jsonb.
- **Centralized Error Handling (Feb 2026):** Added `server/middleware/errorHandler.ts` with `AppError` class (statusCode, errorCode, isOperational, details), `requestIdMiddleware` (UUID per request via `req.id`), and `globalErrorHandler`. AppError provides static factories (`badRequest`, `unauthorized`, `forbidden`, `notFound`, `conflict`, `internal`) and `.withDetails()` for extra metadata. All error responses include `{ error, errorCode, requestId }` plus optional `details`. Unknown errors log full stack traces and return generic 500 in production. Converted food.router, feedback.router, shelf-life.router, and ingredients.router as examples of the pattern.
- **Structured Logger (Feb 2026):** Added `server/lib/logger.ts` with structured JSON logging. Provides `logger.debug/info/warn/error(message, context?)` methods with consistent output format `{ timestamp, level, message, requestId?, context? }`. Development mode: pretty-printed with ANSI colors. Production mode: single-line JSON for log aggregation. Includes `createRequestLogger(req)` helper for request-scoped logging with auto-attached requestId. Replaced all ad-hoc console.log/error calls in auth middleware, subscription middleware, Stripe webhook handlers, and global error handler.
- **Sync Error Visibility (Feb 2026):** Enhanced sync failure diagnostics. Server: replaced all 15 console.error calls in `sync.router.ts` with structured logger (dataType, operation, userId, error). Added in-memory `syncFailures` tracker and `GET /api/sync/status` endpoint returning lastSyncedAt, failedOperations24h, recentFailures, isConsistent, and dataType item counts. Client: added consecutive failure tracking per item in `sync-manager.ts` with React Native Alert after 3 failures offering "Dismiss" or "Retry Now". Replaced all remaining console.error/warn calls with structured logger.
- **Comprehensive Accessibility (Feb 2026):** Added accessibility attributes across navigation components, 5 core screens, shared components, and 6 modal/overlay components. Navigation: ExpoGlassHeader (header role, search labels), CustomTabBar (tabbar/tab roles with selection states), DrawerContent (menu/menuitem roles), HamburgerButton (button role). Screens: InventoryScreen (food group filter chips with selected state, swipeable item cards with consumed/wasted labels, section headers with expanded state, list role), RecipesScreen (recipe cards with match percentage labels, favorite toggle with state, generate button, cookware warnings), ShoppingListScreen (checkbox role with checked state, delete labels, clear checked, completed banner as alert, Instacart button), MealPlanScreen (week navigation with Pro status, day cards with selected/today/meals state, meal slots, action sheet buttons, stat items), RecipeDetailScreen (share button, servings stepper with live region, ingredient rows with availability status, swap buttons, instruction steps with current/past state, voice controls hints). Shared components: HeaderMenu (accessibilityViewIsModal, menu/menuitem roles, dynamic labels), RecipeVoiceControls (button roles, disabled/selected states, live region on speed). Modals/Overlays: ChatModal (accessibilityViewIsModal, header button labels, input labels, message list role, send button state, voice mic hint, voice status live region, error alerts, transcript preview), RecipeSettingsModal (accessibilityViewIsModal, OptionChip button role with selected state, toggle switch role with checked state, generate button), IngredientSwapModal (accessibilityViewIsModal, filter chip selected states, swap card labels with ratio/stock info, substitute hint), NutritionCorrectionModal (accessibilityViewIsModal, error/success alerts, input labels with hints, remove image button), AddMenu (backdrop dismiss label, menu role, item hints from sublabels, upgrade modal), TrialEndedModal (accessibilityViewIsModal, billing toggle selected states, tier card radio roles with dynamic price labels, subscribe button, legal links with link role).

## External Dependencies
- **OpenAI API**: AI-powered recipe generation and conversational assistance (gpt-4o-mini).
- **USDA FoodData Central API**: Comprehensive nutrition data lookup.
- **OpenFoodFacts API**: Open-source product information.
- **PostgreSQL**: Primary relational database.
- **Replit Object Storage**: Cloud file storage.
- **Instacart Connect API**: Grocery shopping integration for ordering ingredients.
- **expo-camera**: Barcode scanning.
- **date-fns**: Date manipulation.
- **@react-native-async-storage/async-storage**: Persistent local storage.