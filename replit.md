# AI Chef - Smart Kitchen Assistant

## Overview
An AI-powered chat-based Chef helper application that manages home food inventory across different storage areas and generates personalized recipes. The system integrates with the USDA food database for accurate food tracking and uses OpenAI GPT-5 for conversational AI assistance.

## Tech Stack
- **Frontend**: React, TypeScript, Tailwind CSS, Shadcn UI
- **Backend**: Express.js, Node.js
- **AI**: OpenAI GPT-5 (via Replit AI Integrations)
- **Storage**: In-memory storage (MemStorage)
- **State Management**: React Query (TanStack Query)

## Core Features
1. **Chat Interface**: Real-time streaming chat with AI Chef assistant
2. **Food Inventory Management**: Track items across multiple storage locations (fridge, freezer, pantry, counter)
3. **USDA Integration**: Search and add food items using FoodData Central IDs
4. **Recipe Generation**: AI-generated recipes based on available ingredients and appliances
5. **Storage Locations**: Visual organization of food items by location
6. **Kitchen Appliances**: Registry of available cooking equipment

## Project Structure
```
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/              # Shadcn UI components
│   │   │   ├── app-sidebar.tsx  # Sidebar navigation
│   │   │   ├── chat-message.tsx # Chat message bubbles
│   │   │   ├── chat-input.tsx   # Chat input area
│   │   │   ├── food-card.tsx    # Food inventory cards
│   │   │   ├── recipe-card.tsx  # Recipe display
│   │   │   ├── empty-state.tsx  # Empty state UI
│   │   │   └── theme-toggle.tsx # Dark/light mode toggle
│   │   ├── pages/
│   │   │   ├── chat.tsx         # Main chat interface
│   │   │   └── storage.tsx      # Storage location view
│   │   └── App.tsx              # App entry with layout
│   └── index.html
├── server/
│   ├── routes.ts                # API endpoints
│   ├── storage.ts               # In-memory storage
│   ├── openai.ts                # OpenAI integration
│   └── usda.ts                  # USDA API integration
└── shared/
    └── schema.ts                # Shared TypeScript types
```

## API Endpoints

### Storage Locations
- `GET /api/storage-locations` - Get all storage locations

### Food Items
- `GET /api/food-items` - Get all food items (optional: ?storageLocationId=id)
- `POST /api/food-items` - Create new food item
- `PUT /api/food-items/:id` - Update food item
- `DELETE /api/food-items/:id` - Delete food item

### Appliances
- `GET /api/appliances` - Get all appliances
- `POST /api/appliances` - Create new appliance

### USDA Food Database
- `GET /api/usda/search?query=chicken` - Search USDA foods
- `GET /api/usda/food/:fdcId` - Get food by FDC ID

### Chat
- `GET /api/chat/messages` - Get chat history
- `POST /api/chat` - Send message (streaming response)

### Recipes
- `GET /api/recipes` - Get all recipes
- `POST /api/recipes/generate` - Generate recipe from inventory

## Design System

### Colors
- **Primary**: Olive Green (HSL 85 50% 40%)
- **Secondary**: Dark Navy (HSL 210 25% 7.8%)
- **Background**: White (HSL 0 0% 100%)
- **Accent**: Light Blue (HSL 212 51% 93%)

### Typography
- **Primary**: Ubuntu (sans-serif)
- **Recipe Headings**: Georgia (serif)
- **Data/FCD IDs**: Menlo (monospace)

### Layout
- Chat-based interface with sidebar navigation
- Border radius: 1.3rem (var(--radius))
- Spacing: 0.25rem intervals
- Responsive design with collapsible sidebar

## Current State
- ✅ Complete schema and data models
- ✅ Full frontend UI with all components
- ✅ Backend API with all endpoints
- ✅ OpenAI integration for chat streaming
- ✅ USDA food database integration (mock for MVP)
- ✅ In-memory storage with full CRUD operations
- ✅ Dark mode support
- ✅ Responsive design

## User Preferences
- Design follows ChatGPT-inspired interface
- Olive green and dark navy color scheme
- Clean, modern design with Ubuntu typography
- Focus on usability and visual excellence

## Recent Changes (2025-10-11)
- Initial project setup
- Implemented complete schema for all data models
- Built all React components with exceptional visual quality
- Created backend API with OpenAI GPT-5 integration
- Integrated USDA food database (mock for MVP)
- Connected frontend to backend with React Query
- Implemented real-time chat streaming
- Added dark mode support

## Development Notes
- OpenAI integration uses Replit AI Integrations (no API key required)
- USDA API uses mock data for MVP (real API key needed for production)
- In-memory storage - data resets on server restart
- All components follow Shadcn UI patterns
- Design guidelines strictly followed per design_guidelines.md
