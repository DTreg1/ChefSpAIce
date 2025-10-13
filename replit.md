# AI Chef - Smart Kitchen Assistant

## Overview
AI Chef is an AI-powered, chat-based kitchen assistant designed to manage home food inventory, reduce waste, and generate personalized recipes. It integrates with the USDA food database for accurate nutritional information and leverages OpenAI GPT-5 for conversational AI. The project aims to provide a comprehensive solution for efficient home food management, including expiration tracking, recipe saving, nutritional dashboards, and meal planning capabilities, thereby enhancing culinary experiences and promoting sustainable food practices.

## User Preferences
- Design follows ChatGPT-inspired conversational interface
- Olive green (#6b8e23) and dark navy (#0e1621) color scheme
- Clean, modern aesthetic with Ubuntu typography
- Focus on usability and visual excellence
- Prefer horizontal batching in development workflow
- Schema-first approach for type consistency

## System Architecture
The AI Chef application features a React frontend with TypeScript, Tailwind CSS, and Shadcn UI for a modern, responsive user interface. The backend is built with Express.js and Node.js, interacting with a PostgreSQL database (Neon-backed) via Drizzle ORM for persistent storage and schema management. OpenAI GPT-5 is integrated for real-time, streaming conversational AI, while the USDA FoodData Central API provides comprehensive nutritional data.

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
    - **Nutritional Dashboard**: Aggregated calorie and macronutrient breakdowns using USDA data, including FDA-compliant nutrition labels.
    - **Chat Interface**: Real-time streaming chat with AI Chef.
    - **Meal Planning**: Weekly calendar for scheduling recipes with serving customization.
    - **Shopping List**: Auto-generated from planned meals, comparing with inventory.
    - **Enhanced Onboarding**: Guides users through initial setup, including storage areas, household size, cooking skill, unit preferences, and foods to avoid, using USDA-enriched data.
    - **Food Category Filtering**: Allows filtering inventory by USDA food categories and viewing items organized by groups.
    - **Barcode Integration**: Utilizes UPC/GTIN barcodes for product image search and leverages USDA data for enriched item details.
    - **USDA Food Search**: Comprehensive search interface with always-visible filters (Brand Owners, UPC/GTIN Code, Sort By, Sort Order, Results Per Page) for easy access to nutritional data. Supports searching by UPC/GTIN barcodes to find specific branded products.

## External Dependencies
- **Database**: PostgreSQL (Neon-backed)
- **AI**: OpenAI GPT-5
- **Food Data**: USDA FoodData Central API
- **Product Information**: Barcode Lookup API
- **Object Storage**: Replit Object Storage (for user-uploaded photos)