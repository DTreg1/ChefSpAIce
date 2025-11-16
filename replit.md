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

## Database Schema Patterns

### Insert Schema Pattern (Updated November 2025)
All insert schemas use the modern `.omit().extend()` pattern for maximum type safety and autocomplete:

```typescript
export const insertExampleSchema = createInsertSchema(exampleTable)
  .omit({
    id: true,              // Auto-generated UUID
    createdAt: true,       // Auto-generated timestamp
    updatedAt: true,       // Auto-generated timestamp
  })
  .extend({
    // JSON column overrides for type safety
    jsonField: z.object({
      property: z.string(),
      nested: z.number().optional(),
    }).optional(),
  });

export type InsertExample = z.infer<typeof insertExampleSchema>;
export type Example = typeof exampleTable.$inferSelect;
```

### Column Type Patterns (Critical for TypeScript Compilation)

**JSON Columns:**
Always define JSON columns with proper type annotations using Zod schemas:
```typescript
// CORRECT - Type-safe JSON column
jsonb("metadata").$type<z.infer<typeof metadataSchema>>()

// WRONG - Will cause TypeScript errors
jsonb("metadata").$type<any>()
```

**Array Columns:**
Use the `.array()` method for native PostgreSQL arrays:
```typescript
// CORRECT - Native array column
text("tags").array()

// WRONG - Don't use array wrapper
array(text("tags"))  // This syntax is incorrect
```

**Key Benefits:**
- Full TypeScript autocomplete for all fields
- Runtime validation with Zod for JSON columns
- Proper type inference (no `unknown` types)
- Clear separation of omitted vs. extended fields

**Shared JSON Schemas:**
Reusable Zod schemas for common JSON structures are defined in `shared/json-schemas.ts`:
- `notificationTypesSchema` - Notification preferences
- `quietHoursSchema` - Quiet hours configuration
- `nutritionInfoSchema` - Nutrition data structure
- `genericMetadataSchema` - Generic metadata structure
- `barcodeDataSchema` - Barcode product data
- `usdaFoodDataSchema` - USDA food database structure
- And more...

**Migration History:**
- November 2025: Migrated all 102 insert schemas from deprecated `createInsertSchema(table, { overrides })` to `.omit().extend()` pattern
- Created `shared/json-schemas.ts` for reusable JSON validators
- Fixed all JSON column type definitions to use proper Zod schema inference
- Corrected array column syntax to use `.array()` method
- Resolved all TypeScript compilation errors (0 LSP diagnostics)

## System Architecture
The ChefSpAIce application features a React frontend with TypeScript, Tailwind CSS, and Shadcn UI for a modern, responsive user interface. The backend is built with Express.js and Node.js, interacting with a PostgreSQL database (Neon-backed) via Drizzle ORM. OpenAI GPT-5 is integrated for real-time, streaming conversational AI and ML-powered features, while the USDA FoodData Central API provides comprehensive nutritional data.

**Key Architectural Decisions:**
- **UI/UX**: ChatGPT-inspired conversational interface, collapsible sidebar navigation, dark/light mode, consistent spacing, and a border-radius of 1.3rem. Typography uses Ubuntu for UI text, Georgia for recipe headings, and Menlo for technical data.
- **Technical Implementations**:
    - **Frontend**: React, TypeScript, Tailwind CSS, Shadcn UI, React Query.
    - **Backend**: Express.js, Node.js, PostgreSQL (Neon-backed) with Drizzle ORM.
    - **AI Integration**: OpenAI GPT-5 for chat and AI-powered suggestions.
    - **Data Management**: Drizzle ORM for database interactions and migrations with modern `.omit().extend()` schema pattern. Hybrid image system using Barcode Lookup API, Replit Object Storage, and placeholder icons.
- **Feature Specifications**:
    - **Food Inventory**: CRUD for tracking items across storage locations with expiration dates and visual indicators.
    - **Recipe Management**: AI-generated recipes, saving, favoriting, and rating.
    - **Nutritional Dashboard**: Aggregated calorie and macronutrient breakdowns using USDA data with dual-unit system.
    - **Chat Interface**: Real-time streaming chat with ChefSpAIce; messages persist to PostgreSQL.
    - **Meal Planning**: Weekly calendar for scheduling recipes.
    - **Shopping List**: Auto-generated from planned meals, compared with inventory.
    - **Quick Actions**: Command palette (Cmd/Ctrl+K) for Add Food Item, Scan Barcode, Generate Recipe.
    - **Enhanced Onboarding**: Guides users through initial setup.
    - **Food Category Filtering**: Filters inventory by USDA food categories.
    - **Barcode Integration**: Utilizes UPC/GTIN barcodes for product image search and USDA data.
    - **USDA Food Search**: Comprehensive search interface with filters.
    - **Push Notifications**: Browser-based push notification system for expiring food items and meal reminders.
    - **Cooking Terms Integration**: Smart detection and display of culinary terminology in recipes via tooltips and a glossary.
    - **ML-Powered Smart Search & Discovery**:
        - **Semantic Smart Search**: Uses OpenAI embeddings for content search by meaning.
        - **Auto-Categorization**: Automatically categorizes recipes and inventory items using GPT analysis.
        - **Auto-Tagging with NLP**: Generates relevant hashtags using OpenAI GPT-3.5-turbo and TensorFlow.js keyword extraction.
        - **Duplicate Detection**: Identifies similar recipes and ingredients.
        - **Related Content Discovery**: Recommends related recipes and ingredients.
        - **Natural Language Query**: Converts natural language questions to structured database queries.
        - **Smart Form Auto-Completion**: ML-powered predictive text for form inputs using TensorFlow.js and OpenAI.
    - **AI-Powered Data Extraction System**: Extracts structured order details from unstructured text using OpenAI GPT-5.
    - **AI-Driven Dynamic Pricing System**: Optimizes prices based on demand, competition, inventory, and user behavior using TensorFlow.js and OpenAI.
    - **Face Detection System with Privacy Controls**: AI-powered face detection using TensorFlow.js BlazeFace for user avatar management with privacy blur and avatar extraction.
    - **OCR Text Extraction System**: Extracts text from images, PDFs, and scanned documents using Tesseract.js, with user correction capabilities.
    - **Speech-to-Text Transcription System**: Comprehensive transcription system for voice notes and meetings using OpenAI Whisper API.
- **Authentication System**: Dual-mode authentication system adapting between **Replit Auth Mode** (for development/testing) and **OAuth Mode** (for production with Google, GitHub, Twitter, Apple, and email/password).
- **Admin Access Control**: Centralized `adminOnly` middleware (November 2025) provides consistent admin authorization across all protected routes. Supports both authentication patterns (`req.user.id` and `req.user.claims.sub`) for maximum compatibility. All admin-protected routes use the pattern: `isAuthenticated, adminOnly` middleware chain.

## External Dependencies
- **Database**: PostgreSQL (Neon-backed)
- **AI**: OpenAI GPT-5, OpenAI Whisper API
- **Food Data**: USDA FoodData Central API
- **Product Information**: Barcode Lookup API
- **Object Storage**: Replit Object Storage
- **OCR**: Tesseract.js
- **Machine Learning**: TensorFlow.js