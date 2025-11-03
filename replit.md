# ChefSpAIce - Smart Kitchen Assistant

## Overview
ChefSpAIce is an AI-powered, chat-based kitchen assistant designed to manage home food inventory, reduce waste, and generate personalized recipes. It integrates with the USDA food database for accurate nutritional information and leverages OpenAI GPT-5 for conversational AI. The project aims to provide a comprehensive solution for efficient home food management, including expiration tracking, recipe saving, nutritional dashboards, and meal planning capabilities, thereby enhancing culinary experiences and promoting sustainable food practices.

## Recent Updates (November 2025)

### AI-Powered Data Extraction System
- **Purpose**: Extracts structured order details from unstructured text with 95% accuracy
- **Technology**: OpenAI GPT-5 with structured output via Replit AI Integrations
- **Components**: Database schema (extracted_orders table), storage interface, API endpoint (/api/extraction/orders), and full extraction UI at /extraction
- **Location**: Available under "Data Extraction" in the sidebar

### AI-Driven Dynamic Pricing System  
- **Purpose**: Optimizes prices based on demand, competition, inventory, and user behavior
- **Technology**: TensorFlow.js for demand prediction + OpenAI for market analysis
- **Achievement Goals**: 10% price increases during high demand, 15% discounts for high inventory, targeting 20% revenue increase
- **Database**: pricing_rules, price_history, and pricing_performance tables
- **API Endpoints**: Complete suite including optimize, simulate, competition, rules, report, apply, and history
- **UI Components**: PricingDashboard, DemandCurve, PriceSimulator, CompetitorPricing, and RevenueImpact
- **Location**: Available at /pricing with "Dynamic Pricing" in the sidebar

### Face Detection System with Privacy Controls
- **Purpose**: AI-powered face detection for user avatar management with comprehensive privacy features
- **Technology**: TensorFlow.js BlazeFace model for real-time browser-based face detection
- **Core Features**:
  - **Face Detection**: Real-time detection with bounding boxes and confidence scores (0-1 normalized coordinates)
  - **Privacy Blur**: Apply adjustable blur intensity (1-30) to detected faces for anonymization
  - **Avatar Extraction**: Crop individual faces from group photos with customizable padding
  - **Face Counting**: Count and display statistics for group photo management
  - **Detection History**: Track all face detection operations with metadata
- **Privacy Controls**:
  - **Privacy Modes**: strict (auto-anonymize), balanced (selective blur), minimal (detect only)
  - **Settings**: autoBlurFaces, blurIntensity, dataRetentionDays, faceRecognitionEnabled
  - **Data Retention**: Automatic cleanup of old detections based on user-defined retention period
  - **Processing Types**: detect_only, blur, crop, anonymize
- **Database Tables**: face_detections (detection records), privacy_settings (user preferences)
- **API Endpoints**: /api/face-detection/detect, /blur, /crop, /count, /history, /privacy, /cleanup
- **UI Components**: FaceDetector (main UI), PrivacyBlur, FaceCropper, FaceCounter, FaceDetectionDemo
- **Location**: Available at /face-detection with "Face Detection" in the sidebar

### OCR Text Extraction System (November 2025)
- **Purpose**: Extract text from images, PDFs, and scanned documents with user correction capabilities
- **Technology**: Tesseract.js for optical character recognition (currently using mock implementation for stability)
- **Core Features**:
  - **Multi-format Support**: Extract text from images (PNG, JPG, WebP) and PDF documents
  - **Multi-language OCR**: Support for 20+ languages including English, Spanish, Chinese, Arabic
  - **User Corrections**: Edit extracted text with confidence tracking for accuracy improvements
  - **Structured Data Parsing**: Automatic receipt parsing to extract items, prices, and totals
  - **Export Options**: Download or copy extracted text as plain text, JSON, or CSV formats
- **Key Capabilities**:
  - **Receipt Processing**: Automatically identifies and structures receipt data (items, prices, tax, total)
  - **Confidence Scoring**: Displays extraction confidence percentage for quality assessment
  - **Bounding Boxes**: Preserves text location data for spatial analysis
  - **Edit History**: Tracks user corrections with original vs corrected text comparison
- **Database Tables**: 
  - **ocr_results**: Stores extraction results with confidence scores and metadata
  - **ocr_corrections**: Tracks user edits and improvements to extracted text
- **API Endpoints**: 
  - **/api/ocr/extract**: Process images/PDFs and extract text
  - **/api/ocr/document/:id**: Retrieve specific OCR results
  - **/api/ocr/correct**: Save user corrections to extracted text
  - **/api/ocr/languages**: Get list of supported OCR languages
- **UI Components**: 
  - **OCRUploader**: Drag-and-drop file upload interface
  - **ExtractedText**: Display and edit extracted text with confidence indicators
  - **HighlightedRegions**: Visual bounding box overlay (for future implementation)
  - **LanguageSelector**: Choose OCR language for processing
  - **CopyButton**: Export text in multiple formats
- **Location**: Available at /ocr (currently public for testing)

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
        - **Smart Form Auto-Completion** (November 2025):
            - ML-powered predictive text for form inputs using TensorFlow.js and OpenAI
            - Context-aware suggestions based on field type and surrounding data
            - User-specific learning that adapts to individual patterns
            - Privacy controls to enable/disable learning per form
            - Features email completion, address prediction, and contextual suggestions
            - Demo available at `/form-completion-demo`
            - Database tracks form_completions, user_form_history, and completion_feedback

## Authentication System (Updated November 2025)
The application features a **dual-mode authentication system** that automatically adapts to the environment:

### Authentication Modes
1. **Replit Auth Mode**: Used for development/testing, especially for Replit Agent automated testing. Provides simplified OIDC-based authentication without external provider dependencies.
2. **OAuth Mode**: Used for production with support for Google, GitHub, Twitter, Apple, and email/password authentication.

### Mode Detection
The system automatically detects the appropriate mode based on:
- ISSUER_URL override (Agent testing) → Replit Auth
- OAuth credentials configured → OAuth mode
- Explicit AUTH_MODE environment variable
- See AUTH_CONFIG.md for detailed configuration

This dual-mode approach ensures:
- ✅ Replit Agent can test the application without OAuth setup
- ✅ Production deployments use full OAuth providers
- ✅ Seamless switching between modes based on environment

## External Dependencies
- **Database**: PostgreSQL (Neon-backed)
- **AI**: OpenAI GPT-5
- **Food Data**: USDA FoodData Central API
- **Product Information**: Barcode Lookup API
- **Object Storage**: Replit Object Storage (for user-uploaded photos)