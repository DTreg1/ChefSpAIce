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

## External Dependencies
- **Database**: PostgreSQL (Neon-backed)
- **AI**: OpenAI GPT-5 (via Replit AI Integrations)
- **Food Data**: USDA FoodData Central API (currently uses mock data for nutrition, requiring an API key for production)