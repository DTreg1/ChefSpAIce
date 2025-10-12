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

### Food Item Images (October 2025)
- **Hybrid Image System**: Three-source approach for food item photos
  - Open Food Facts API: Branded product images via barcode/text search
  - Replit Object Storage: User-uploaded photos with presigned URLs
  - Placeholder Icons: UtensilsCrossed icon fallback for items without images
- **Open Food Facts Integration**: 
  - API client at `server/openfoodfacts.ts` for branded product searches
  - GET `/api/openfoodfacts/search?query={query}&pageSize={n}` endpoint
  - Returns product name, image URL, and metadata
- **Object Storage Integration**:
  - POST `/api/objects/upload` generates presigned GCS upload URLs
  - PUT `/api/food-images` normalizes uploaded paths for database storage
  - Environment variables: `PUBLIC_OBJECT_SEARCH_PATHS`, `PRIVATE_OBJECT_DIR`
  - Uppy-based ObjectUploader component for file selection and progress
- **Add Food Dialog Enhancement**:
  - Three-tab interface for image source selection (None, Find Product, Upload Photo)
  - Real-time image preview when branded search succeeds
  - Toast notifications for all success/error states
  - Image URLs stored in `imageUrl` field of food items
- **FoodCard Display**:
  - Displays actual images (external URLs or storage paths) when available
  - Falls back to styled placeholder icon (UtensilsCrossed) when no image
  - 64x64px rounded image thumbnails with proper object-fit
- **Technical Implementation**:
  - All API calls properly parse JSON responses (fixed Response object issues)
  - Defensive error handling throughout image acquisition flow
  - Cache invalidation on add/delete for consistent UI state

### Enhanced Add Food Experience (October 2025)
- **Required Fields Update**: Unit and expiration date are now required (NOT NULL in database)
  - FcdId remains nullable (only set for USDA foods, null for custom items)
  - Frontend validation enforces all required fields before submission
  - Backend validation on both create and update endpoints
- **Improved USDA Search Results**:
  - Displays brand owner in highlighted badge for branded products
  - Shows food category to help distinguish similar items
  - Includes data type (Branded, Foundation, SR Legacy) and FDC ID
  - Makes it easy to differentiate between multiple "Apple" entries
- **Smart Auto-Fill**: When selecting a USDA food item:
  - Quantity auto-fills with serving size from USDA data
  - Unit auto-fills with serving size unit (e.g., "g", "ml", "oz")
  - Defaults to "1 piece" when serving size data unavailable
- **Storage Location Pills**: Replaced dropdown with accessible pill buttons
  - All storage options visible immediately (no clicks needed)
  - Uses ToggleGroup component with proper ARIA attributes
  - Selected pill has solid background, unselected have outline
  - Fully accessible with aria-labelledby and role attributes
- **Intelligent Expiration Suggestions**: Auto-suggests expiration dates based on food category
  - Fruits/Vegetables: 7 days
  - Dairy products: 10 days
  - Meat/Poultry/Seafood: 3 days
  - Bread/Bakery: 5 days
  - Eggs: 21 days
  - Frozen foods: 90 days (3 months)
  - Canned/Packaged goods: 180 days (6 months)
  - Condiments/Sauces: 60 days (2 months)
  - Helper text reminds users to verify with package label

### Enhanced Onboarding (October 2025)
- **Storage Areas Pre-Selection**: Four default storage areas (Fridge, Freezer, Pantry, Counter) are pre-selected
  - Users can deselect any areas they don't have
  - At least one storage area must remain selected
  - Icons displayed for each storage type for visual clarity
- **Household Size**: Asks "How many people do you typically cook for?"
  - Numeric input with default value of 2
  - Helps tailor recipe serving sizes and suggestions
- **Cooking Skills Assessment**: Users select their skill level
  - Options: Beginner, Intermediate, Advanced
  - AI tailors recipe complexity based on skill level
  - Default is set to "Beginner"
- **Unit Preferences**: Users choose measurement system
  - Options: Imperial (cups, oz, °F) or Metric (ml, g, °C)
  - Default is Imperial
  - Affects all recipe measurements and nutritional displays
- **Foods to Always Avoid**: Custom food avoidance list
  - Add specific foods or ingredients to avoid in recipes
  - Separate from allergens - for taste preferences or dietary choices
  - Examples: cilantro, mushrooms, anchovies
  - Displayed as removable badges
- **Database Schema**: New fields in user_preferences table
  - storage_areas_enabled: ARRAY of text
  - household_size: integer (default 2)
  - cooking_skill_level: text (default 'beginner')
  - preferred_units: text (default 'imperial')
  - foods_to_avoid: ARRAY of text