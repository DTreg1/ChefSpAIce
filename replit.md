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
- **Data Flow**: React Query manages client-side data fetching, caching, and synchronization. Drizzle ORM handles database interactions, including migrations.
- **AI Integration**: OpenAI GPT-5 is used for chat interactions and AI-powered recipe generation and waste reduction suggestions.
- **Feature Specifications**:
    - **Food Inventory**: Complete CRUD for tracking items across storage locations (Fridge, Pantry, Freezer, Counter) with expiration dates and visual indicators.
    - **Recipe Management**: AI-generated recipes based on inventory, with saving, favoriting, and 5-star rating capabilities.
    - **Nutritional Dashboard**: Displays aggregated calorie and macronutrient breakdowns with visual charts, leveraging USDA data.
    - **Chat Interface**: Real-time streaming chat with the AI Chef assistant.
    - **Meal Planning**: Weekly calendar view for scheduling recipes across breakfast, lunch, and dinner with servings customization.
    - **Shopping List**: Auto-generated ingredient lists from planned meals with inventory comparison and purchase tracking.

## External Dependencies
- **Database**: PostgreSQL (Neon-backed)
- **AI**: OpenAI GPT-5 (via Replit AI Integrations)
- **Food Data**: USDA FoodData Central API (fully integrated with real-time nutritional data)

## Recent Updates (October 2025)

### USDA FDC API Integration
- **Real API Integration**: Replaced mock data with live USDA FoodData Central API
- **Nutrition Extraction**: Implemented comprehensive nutrient mapping from FDC API responses
  - Supports all food types: Branded, Foundation, SR Legacy, and Survey (FNDDS)
  - Extracts: calories, protein, carbs, fat, fiber, sugar, sodium
  - Nutrient number mapping: 208 (Energy), 203 (Protein), 205 (Carbs), 204 (Fat), 291 (Fiber), 269 (Sugar), 307 (Sodium)
- **Enhanced Search**: Added pagination, filtering by data type, and configurable page sizes
- **API Key Management**: Securely managed via USDA_FDC_API_KEY environment variable

### FDA Nutrition Facts Label
- **Visual Component**: Created FDA-compliant nutrition facts label (NutritionFactsLabel component)
- **Daily Value Calculations**: Automatically calculates % DV based on 2000 calorie diet
  - Total Fat: 78g DV, Sodium: 2300mg DV, Carbohydrates: 275g DV, Fiber: 28g DV, Protein: 50g DV
- **Integration**: Nutrition label accessible via info button on food cards with nutrition data
- **Dialog Display**: NutritionFactsDialog shows complete nutritional information per serving

### Kitchen Appliances Registry
- **Complete CRUD**: Add, view, and delete kitchen appliances
- **Data Model**: Appliances table with name and type fields
- **UI Components**: AppliantsPage with grid layout, dialogs for add/delete, empty states
- **Navigation**: Integrated into sidebar under INVENTORY section