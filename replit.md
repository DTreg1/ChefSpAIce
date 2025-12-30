# ChefSpAIce

## Overview
ChefSpAIce is a mobile application designed to help users manage their kitchen and reduce food waste. It enables tracking of food inventory across various storage locations, provides AI-powered recipe generation based on available ingredients, facilitates meal planning, and manages shopping lists. Key features include barcode scanning for item entry, nutrition tracking, waste reduction analytics, and an AI kitchen assistant. The application aims to provide a comprehensive solution for efficient food management, promoting sustainability and healthy eating habits.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
### Frontend
The application is built with **React Native (0.81.5) and Expo (54.0.23)** for cross-platform compatibility. It uses **React Navigation 7** for navigation, **React Native Reanimated 4** for animations, and **TanStack React Query** for data fetching. The UI/UX features an **iOS 26 Liquid Glass Design** aesthetic with light/dark mode support, defined by a centralized design system using custom hooks and reusable components. Data is managed with a local-first approach using **AsyncStorage** for offline persistence and React Query for server state.

### Backend
The backend utilizes **Express.js** and **Node.js**. Data storage uses **Drizzle ORM (0.39.3)** with **PostgreSQL** for all users. A custom authentication system handles user registration, login, and session management. All users must authenticate and maintain an active subscription to access the application. A robust **Real-Time Sync Manager** ensures data consistency between local storage and the cloud with optimistic updates, background syncing, and conflict resolution. AI integration leverages **OpenAI API (GPT-4o-mini)** for recipe generation, which is equipment-aware and can strictly generate recipes using only available inventory ingredients, with enhanced fuzzy matching for ingredients. Shelf life suggestions are provided based on food name and storage location, with an AI fallback.

### Key Features and Technical Implementations
- **Navigation:** Root stack navigator for modals, five-tab bottom navigation with individual stack navigators per tab (Inventory, Recipes, Meal Plan, Profile).
- **Design System:** iOS 26 Liquid Glass Design with blur effects, theme support, and reusable components like GlassCard. See `DESIGN_GUIDELINES.md` for comprehensive UI documentation.
- **State Management:** AsyncStorage for local data, React Query for server state, component-level React hooks.
- **Authentication:** Custom username/password with SHA-256 hashing, social login (Apple Sign-In for iOS, Google Sign-In for Android), 30-day session tokens. All users must authenticate to access the app. Social auth uses `expo-apple-authentication` for native iOS Apple Sign-In and `expo-auth-session` with Google OAuth for cross-platform Google Sign-In. Backend routes at `/api/auth/social/apple` and `/api/auth/social/google` verify tokens and create/link accounts with `auth_providers` table. Apple token verification uses `apple-signin-auth` package with strict JWKS-based cryptographic signature validation (requires `APPLE_CLIENT_ID` environment variable).
- **Trial Subscription System:** All new users automatically receive a 7-day free trial subscription upon account creation (no payment required). Trial subscriptions are created in the `subscriptions` table with `status='trialing'` and `planType='trial'`. After the trial expires (trial_end date passes), the status is automatically updated to `'expired'` on login/auth check. Expired users are redirected to the Pricing screen and cannot access other app features until they subscribe to a paid plan. Implementation in `server/routers/auth.router.ts` with `createTrialSubscription()` helper called during registration and `evaluateAndUpdateSubscriptionStatus()` for auto-expiry logic.
- **Onboarding Flow:** New users complete a 6-step onboarding sequence: (1) Welcome/Auth - email/password sign-up or social login, (2) Preferences - household serving size (1-8), daily meals (1-6), cuisine preferences, dietary restrictions, (3) Storage Areas - select fridge/freezer/pantry/counter locations (at least one required), (4) Foods - select starter food items to add to inventory, (5) Cookware - select kitchen equipment by category, (6) Complete - review summary and start using app. Preferences are persisted to UserPreferences including servingSize, dailyMeals, cuisinePreferences, dietaryRestrictions, and storageAreas. Returning users who completed onboarding go directly to the main app; users who signed out go to a dedicated SignInScreen.
- **Cloud Sync:** Authenticated users sync all data to PostgreSQL as JSON, managed by a real-time sync manager with retry logic and conflict resolution.
- **Storage Preferences:** Learns user storage choices per item and category, providing smart suggestions based on user history and predefined shelf-life data, with a confidence-based suggestion system.
- **AI Integration:** OpenAI GPT-4o-mini for recipe generation, kitchen assistant chat, and shelf-life suggestions, integrated via Replit AI. The chat assistant uses OpenAI function calling to perform account actions on behalf of authenticated users.
- **AI Chat Actions:** The ChefSpAIce chat assistant (ChatModal) can perform actions for authenticated users including: adding items to inventory, marking items as consumed/wasted, generating recipes, creating meal plans, adding items to shopping lists, and providing inventory summaries. The AI has full visibility into user preferences (dietary restrictions, cuisine preferences, macro targets) and kitchen equipment to provide personalized suggestions. Implementation in `server/lib/chat-actions.ts` with function definitions for OpenAI tool calling.
- **Equipment-Aware Recipes:** Recipes consider user's owned equipment, suggesting alternatives and filtering options.
- **Inventory-Only Recipes:** Generates recipes strictly from user's inventory, with advanced fuzzy matching and post-generation validation to remove phantom ingredients.
- **Smart Shelf Life:** Automatic expiration date suggestions based on food name, storage location, and an AI fallback for unknown items.
- **Equipment Library:** Manages user's kitchen equipment locally, with common items pre-selected for first-time setup.
- **Push Notifications:** Local notifications for expiring food items via expo-notifications. Sends alerts X days before expiration (configurable 1-7 days, default 3). Notifications scheduled at 9 AM. Toggle and configure in Settings screen.
- **Scan Hub:** Centralized scanning interface with 4 distinct options: Product Barcode (for packaged foods), Nutrition Label (for ingredient extraction), Recipe from Paper (for cookbook/printed recipes), and Food & Leftovers (AI food identification). Each option has dedicated UI and backend API integration using GPT-4o vision.
- **Offline Mode Indicator:** Animated banner at the top of the screen that appears when offline or when changes are pending sync. Shows network status and pending change count. Uses react-native-reanimated for smooth slide animations.
- **Stripe Donations:** Support donations feature accessible from Profile > Support Us. Uses Stripe Checkout for secure payments with preset amounts ($5-$100) or custom amounts. Tracks donation stats and recent supporters.
- **Instacart Integration:** Send shopping lists and recipe ingredients directly to Instacart using the Developer Platform API. Users can tap "Send to Instacart" on the Shopping List screen or "Shop on Instacart" on Recipe Detail screen to open Instacart with all items pre-populated. Uses the Public API endpoints `/idp/v1/products/products_link` for shopping lists and `/idp/v1/products/recipe` for recipes. Requires `INSTACART_API_KEY` environment variable. Settings accessible from Profile > Settings > Grocery Shopping.
- **Data Export:** Export inventory and recipes as CSV or PDF files. Uses expo-print for PDF generation with styled layouts and expo-sharing for cross-platform file sharing. Export button in header for InventoryScreen, filter row for RecipesScreen, and header for RecipeDetailScreen. Web platform uses download links and print dialogs. Export utility library at `client/lib/export.ts`. Hook `useInventoryExport` for header button.
- **Inventory Filtering:** Food group filter (grains/vegetables/fruits/protein/dairy) with sort options (expiration date, name A-Z, quantity, recently added). Filter summary shows matching item count with one-tap "Clear" to reset. Search matches item names, categories, and storage locations.
- **Feedback & Bug Reporting:** Users can submit feedback or bug reports through the chat modal using conversational AI. The chat assistant guides users through providing structured feedback (type, category, details) and saves it to the database. Suggestion chips ("Send Feedback" and "Report Bug") are available in the chat empty state. Both authenticated and anonymous submissions are supported. Database table `feedback` stores submissions with status tracking for admin triage. API endpoint at `POST /api/feedback` for direct submissions.
- **AI-Powered Feedback Resolution Manager:** Admin-only feature at `/admin/feedback` for managing user feedback. Uses AI (GPT-4o-mini) to automatically group similar feedback items into "buckets" based on topic/issue. Features include: stats overview, filter by bucket status (open/in_progress/completed), expandable bucket cards showing all related feedback items, AI-powered prompt generation (GPT-4o) that creates comprehensive implementation prompts covering all feedback in a bucket, copy-to-clipboard for prompts, and bulk completion to resolve entire buckets at once. Database tables: `feedback_buckets` for grouping, `feedback.bucketId` for relationships. API endpoints: `GET /api/feedback/buckets`, `POST /api/feedback/buckets/:id/generate-prompt`, `POST /api/feedback/buckets/:id/complete`, `POST /api/feedback/categorize-uncategorized`.

### Web Landing Page
The project uses **platform-specific entry points** for optimized builds:
- **App.web.tsx**: Web-only entry point for the landing page (used automatically for web builds)
- **App.tsx**: Mobile-only entry point for the full app (used for iOS/Android)

This separation reduces the web bundle from 4.26 MB to ~919 KB (78% smaller).

**Web Routes:**
- `/` - Landing page with hero, features, how-it-works, support/donate, and CTA sections
- `/about` - About page
- `/privacy` - Privacy Policy
- `/terms` - Terms of Service
- `/attributions` - Attributions and credits
- `/support` - Donation/support page
- `/pricing` - Subscription pricing page with Monthly ($4.99/mo) and Annual ($49.90/yr) plans, 7-day free trial, and Stripe integration

**Server Routing:**
The Express server (server/index.ts) intelligently routes requests based on user-agent and environment:
- Desktop browsers: Proxied to Metro bundler in development; served from static-build in production
- Mobile browsers: Shown QR code page for Expo Go app installation
- API routes (/api/*): Handled by Express
- Expo client requests: Served appropriate manifest for iOS/Android

**Web Donation Section:** The landing page includes a donate section with preset amounts ($5, $10, $25, $50, $100) that redirects to Stripe Checkout. Uses the same `/api/donations/create-checkout-session` endpoint as the mobile app.

## External Dependencies
- **OpenAI API**: For AI-powered recipe generation and conversational kitchen assistance, accessed via Replit AI Integrations (gpt-4o-mini model).
- **USDA FoodData Central API**: Provides comprehensive nutrition data lookup for food items, requiring an API key.
- **OpenFoodFacts API**: A free, open-source database for product information including nutrition, brand, and categories, accessed without an API key.
- **PostgreSQL**: The primary relational database for authenticated user data, connected via `DATABASE_URL` and managed with Drizzle ORM.
- **Replit Object Storage**: Cloud file storage for user uploads and assets. Uses presigned URL upload flow with `@google-cloud/storage`. Server routes at `/api/uploads/request-url` for presigned URLs and `/objects/*` for serving files. Client components: `ObjectUploader.tsx` (Uppy-based modal) and `use-upload.ts` hook.
- **expo-camera**: Used for barcode scanning functionality.
- **date-fns**: For date manipulation in expiration tracking and meal planning.
- **@react-native-async-storage/async-storage**: Persistent local storage solution.