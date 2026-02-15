# ChefSpAIce

## Overview
ChefSpAIce is an AI-powered kitchen inventory management application designed to simplify meal preparation and grocery shopping. It offers intelligent recipe generation, comprehensive meal planning, and automated shopping list creation. The project aims to deliver a seamless user experience with a single subscription model, leveraging its innovative AI features and intuitive design to capture market potential.

## User Preferences
- Communication: Simple, everyday language

## System Architecture
The application features a modern UI/UX with an iOS Liquid Glass Design aesthetic, built using React Native and Expo for mobile, and React for web-based landing and administration pages. Key functionalities include an inventory system with swipeable cards and nutrition summaries, detailed recipe views, and a flexible meal planner. The backend is powered by Express.js, utilizing Drizzle ORM and a PostgreSQL database. AI capabilities for recipe generation, chat, and vision scanning are integrated via the OpenAI API. User authentication uses custom session tokens, supporting social logins (Google/Apple) and biometrics. Shopping list integration is handled by Instacart Connect, with nutritional data sourced from USDA FoodData Central. The architecture follows a Domain-Driven Design (DDD) approach, organizing business logic into domain types, entities, aggregates, and services for clear separation of concerns. Screens are lazy-loaded for optimized performance. The application also includes an OTA update system via `expo-updates` and robust network status monitoring for offline functionality and data synchronization with exponential backoff. All subscription tiers have been consolidated into a single "STANDARD" tier, and a 7-day free trial system is implemented for new accounts. Business logic has been extracted into dedicated service modules for maintainability, and a typed API client wrapper replaces raw `fetch()` calls for improved consistency and error handling. Database-backed caching is used for frequently accessed data, ensuring persistence across server restarts. WCAG AA contrast ratio standards are met for accessibility.

## External Dependencies
- **OpenAI API**: For AI-powered recipe generation, chat, and vision-based analysis.
- **Stripe**: Manages all subscription payments.
- **RevenueCat**: Handles StoreKit/Apple In-App Purchases.
- **PostgreSQL (via Neon)**: The primary database.
- **Instacart Connect**: Integrates shopping list functionality and product matching.
- **USDA FoodData Central**: Provides on-demand nutritional data.
- **Replit Object Storage (`@replit/object-storage`)**: Stores application assets.
- **Sentry (`@sentry/react-native` + `@sentry/node`)**: For crash reporting and event tracking.
- **Expo (`expo-updates`, `@react-native-community/netinfo`, `expo-notifications`)**: For OTA updates, network status detection, and push notifications.