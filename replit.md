# ChefSpAIce - Smart Kitchen Assistant

## Overview
ChefSpAIce is an AI-powered, chat-based kitchen assistant designed to manage home food inventory, reduce waste, and generate personalized recipes. It integrates with the USDA food database for accurate nutritional information and leverages OpenAI GPT-5 for conversational AI. The project aims to provide a comprehensive solution for efficient home food management, including expiration tracking, recipe saving, nutritional dashboards, and meal planning capabilities, thereby enhancing culinary experiences and promoting sustainable food practices.

## User Preferences
- Design follows ChatGPT-inspired conversational interface
- Olive green (#6b8e23) and dark navy (#0e1621) color scheme
- Clean, modern aesthetic with Ubuntu typography
- Focus on usability and visual excellence
- Prefer horizontal batching in development workflow
- Schema-first approach for type consistency

## System Architecture
The ChefSpAIce application features a React frontend with TypeScript, Tailwind CSS, and Shadcn UI for a modern, responsive user interface. The backend is built with Express.js and Node.js, interacting with a PostgreSQL database (Neon-backed) via Drizzle ORM for persistent storage and schema management. OpenAI GPT-5 is integrated for real-time, streaming conversational AI and ML-powered features, while the USDA FoodData Central API provides comprehensive nutritional data.

**Recent Optimizations (October 2025)**:
- **Reduced database schema from 24 to ~18 tables** through strategic consolidation
- **Eliminated unnecessary 1:1 relationships** by embedding data directly in parent tables
- **Leveraged PostgreSQL JSONB columns** for flexible, sparse data structures
- **Improved query performance** by reducing JOIN operations

Key architectural decisions include:
- **UI/UX**: ChatGPT-inspired conversational interface, collapsible sidebar navigation, dark/light mode, consistent spacing, and a border-radius of 1.3rem. Typography uses Ubuntu for UI text, Georgia for recipe headings, and Menlo for technical data.
- **Technical Implementations**:
    - **Frontend**: React, TypeScript, Tailwind CSS, Shadcn UI. React Query manages client-side data.
    - **Backend**: Express.js, Node.js, PostgreSQL (Neon-backed) with Drizzle ORM.
    - **AI Integration**: OpenAI GPT-5 for chat and AI-powered suggestions.
    - **Data Management**: Drizzle ORM for database interactions and migrations. Hybrid image system using Barcode Lookup API, Replit Object Storage, and placeholder icons for food items.
- **Feature Specifications**:
    - **Food Inventory**: CRUD operations for tracking items across storage locations (Fridge, Pantry, Freezer, Counter) with expiration dates, visual indicators, and images. Includes kitchen appliances registry and custom storage areas.
    - **Recipe Management**: AI-generated recipes, saving, favoriting, and rating.
    - **Nutritional Dashboard**: Aggregated calorie and macronutrient breakdowns using USDA data with dual-unit system (quantity × serving size = weightInGrams) for accurate calculations. Displays single horizontal stacked bar for overall macros and mini stacked bars per food item.
    - **Chat Interface**: Real-time streaming chat with ChefSpAIce. All messages persist to PostgreSQL database, including recipe notifications. Features "Start New Chat" button to manually clear conversation history. Automatic cleanup runs when users access chat (1-hour cooldown per user), deleting messages older than 24 hours to simulate the chef "sleeping" and cleaning up at night.
    - **Meal Planning**: Weekly calendar for scheduling recipes with serving customization.
    - **Shopping List**: Auto-generated from planned meals, comparing with inventory.
    - **Quick Actions**: Command palette (Cmd/Ctrl+K) with quick access to Add Food Item, Scan Barcode, and Generate Recipe.
    - **Enhanced Onboarding**: Guides users through initial setup, including storage areas, household size, cooking skill, unit preferences, and foods to avoid, using USDA-enriched data.
    - **Food Category Filtering**: Allows filtering inventory by USDA food categories and viewing items organized by groups.
    - **Barcode Integration**: Utilizes UPC/GTIN barcodes for product image search and leverages USDA data for enriched item details. Accessible via Quick Actions or FDC Search page.
    - **USDA Food Search**: Comprehensive search interface with always-visible filters (Brand Owners, UPC/GTIN Code, Sort By, Sort Order, Results Per Page) for easy access to nutritional data. Supports searching by UPC/GTIN barcodes to find specific branded products.
    - **Push Notifications**: Browser-based push notification system with Web Push API. Includes service worker registration, notification scheduler for expiring food items and meal reminders, user preference toggles in settings, and VAPID key configuration for secure delivery.
    - **Cooking Terms Integration**: Smart detection and display of culinary terminology in recipes. Features automatic term detection during recipe generation, interactive tooltips with definitions in recipe instructions, comprehensive glossary page at `/glossary` with search and filtering, and database with 23 pre-seeded cooking terms across categories (Technique, Ingredient, Tool).
    - **ML-Powered Smart Search & Discovery** (October 2025):
        - **Semantic Smart Search**: Uses OpenAI embeddings to find content by meaning, not just keywords. Available at `/smart-search` with support for natural language queries.
        - **Auto-Categorization**: Automatically categorizes recipes and inventory items using GPT analysis with confidence scoring.
        - **Auto-Tagging with NLP**: Generates relevant hashtags for content using OpenAI GPT-3.5-turbo combined with TensorFlow.js keyword extraction. Features include:
            - Multi-source tag generation (AI-generated, keyword extraction, entity recognition)
            - Hashtag formatting (#sustainability, #agriculture, #farming)  
            - Relevance scoring (0-1) for tag quality
            - Tag approval/rejection workflow
            - Trending tags analytics
            - Complete UI suite: TagInput with auto-complete, TagCloud visualization, TagSuggestions panel, TagEditor management
            - Demo page at `/tag-demo` showcasing sustainable farming article generating relevant hashtags
            - API endpoints: `/api/ml/tags/generate`, `/api/ml/tags/trending`, `/api/ml/tags/approve`
        - **Duplicate Detection**: Identifies similar recipes and ingredients using semantic similarity analysis. Features merge and ignore capabilities.
        - **Related Content Discovery**: Recommends related recipes and ingredients based on semantic relationships and user behavior patterns.
        - **Natural Language Query**: Converts natural language questions to structured database queries. Examples: "What can I make with chicken?" or "Show me healthy dinner recipes".

## External Dependencies
- **Database**: PostgreSQL (Neon-backed)
- **AI**: OpenAI GPT-5
- **Food Data**: USDA FoodData Central API
- **Product Information**: Barcode Lookup API
- **Object Storage**: Replit Object Storage (for user-uploaded photos)