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
- **Trial and Subscription System:** New users get a 7-day free trial, with hourly background jobs for trial expiration. Features tiered subscription limits (Basic, Pro) enforced in UI and during onboarding.
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