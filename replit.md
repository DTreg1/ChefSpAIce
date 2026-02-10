# ChefSpAIce

## Overview
ChefSpAIce is a kitchen inventory management application designed to streamline meal preparation and grocery shopping. It offers AI-powered recipe generation, comprehensive meal planning, and automated shopping list creation. The project aims to provide a seamless user experience with a single subscription model, targeting market potential through its innovative AI features and intuitive design.

## User Preferences
- Communication: Simple, everyday language

## System Architecture
The application features a modern UI/UX with an iOS Liquid Glass Design aesthetic. The mobile application is built using React Native and Expo, while the landing and administration pages are developed with React web. Core features include an inventory system with swipeable cards and nutrition summaries, detailed recipe views, and a flexible meal planner. The backend is powered by Express.js, utilizing Drizzle ORM and a PostgreSQL database hosted on Neon. AI functionalities, such as recipe generation, chat, and vision scanning, are integrated via the OpenAI API. User authentication is handled through custom session tokens, supporting social logins (Google/Apple) and biometric options. Shopping list integration is provided by Instacart Connect, allowing for precise product matching using UPCs and brand filters. Nutritional information is sourced on-demand from USDA FoodData Central for display purposes. The project adheres to a Domain-Driven Design (DDD) approach, organizing business logic into domain types, entities, aggregates, and services, ensuring a clean separation of concerns. Screens are lazy-loaded to optimize initial bundle size and startup time.

## External Dependencies
- **OpenAI API**: For AI-powered recipe generation, chat interactions, and vision-based scanning (e.g., receipt and food image analysis).
- **Stripe**: Handles all subscription payments, including checkout, upgrades, cancellations, and proration.
- **RevenueCat**: Manages StoreKit/Apple In-App Purchases and related webhooks.
- **PostgreSQL (via Neon)**: The primary database for storing all application data.
- **Instacart Connect**: Integrates shopping list functionality, product matching, and delivery services.
- **USDA FoodData Central**: Provides on-demand nutritional data for food items.
- **Replit Object Storage (`@replit/object-storage`)**: Used for storing various application assets.