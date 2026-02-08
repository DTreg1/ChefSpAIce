# ChefSpAIce

## Overview
ChefSpAIce is a mobile application designed to manage kitchen inventory, reduce food waste, and promote sustainable eating habits. It offers AI-powered recipe generation, meal planning, and shopping list management. The project aims to provide a comprehensive solution for efficient food management through intelligent features and a focus on sustainability, with a business vision to offer a freemium model (Free, Basic, Pro tiers) to maximize user acquisition and retention.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
The application features an iOS 26 Liquid Glass Design aesthetic with light/dark mode, a centralized design system, and responsive layouts for phones and tablets. The frontend is built with React Native and Expo, utilizing React Navigation, React Native Reanimated, and TanStack React Query. It adopts a local-first data approach with AsyncStorage for offline persistence.

The backend uses Express.js and Node.js, with Drizzle ORM and PostgreSQL. Key features include a custom authentication system with social login, session tokens, and multi-session management. A Real-Time Sync Manager handles data synchronization with optimistic updates, delta sync, and interactive conflict resolution. AI integration via OpenAI API provides equipment-aware and inventory-specific recipe generation, fuzzy matching, smart shelf-life suggestions, and AI food identification through barcode, nutrition label, recipe, and grocery receipt scanning (using OpenAI Vision).

The system supports a root stack navigator with five-tab bottom navigation, trial and subscription management with guest accounts and data migration, and a guided onboarding flow. All authenticated user data syncs to PostgreSQL with retry logic and conflict resolution. Additional features include Instacart integration, Siri Shortcuts, biometric authentication, deep linking, and comprehensive accessibility. Atomic database transactions ensure data integrity.

## External Dependencies
- **OpenAI API**: AI-powered recipe generation, conversational assistance, and vision-based scanning.
- **USDA FoodData Central API**: Comprehensive nutrition data lookup.
- **OpenFoodFacts API**: Open-source product information.
- **PostgreSQL**: Primary relational database.
- **Replit Object Storage**: Cloud file storage for assets.
- **Instacart Connect API**: Grocery shopping integration.
- **expo-camera**: Barcode scanning functionality.
- **@react-native-async-storage/async-storage**: Persistent local storage for offline data.