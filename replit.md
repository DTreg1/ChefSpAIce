# AI Chef - Smart Kitchen Assistant

## Overview
An AI-powered chat-based Chef helper application that manages home food inventory across different storage areas and generates personalized recipes. The system integrates with the USDA food database for accurate food tracking and uses OpenAI GPT-5 for conversational AI assistance.

## Tech Stack
- **Frontend**: React, TypeScript, Tailwind CSS, Shadcn UI, Wouter (routing)
- **Backend**: Express.js, Node.js
- **AI**: OpenAI GPT-5 (via Replit AI Integrations)
- **Storage**: In-memory storage (MemStorage)
- **State Management**: React Query (TanStack Query v5)
- **Forms**: React Hook Form with Zod validation

## Core Features (MVP Complete ✅)
1. **Chat Interface**: Real-time streaming chat with AI Chef assistant using GPT-5
2. **Food Inventory Management**: Complete CRUD operations for tracking items across multiple storage locations
3. **USDA Integration**: Search and add food items using FoodData Central database with FCD IDs
4. **Recipe Generation**: AI-generated recipes based on available ingredients and kitchen appliances
5. **Storage Locations**: Visual organization with pre-seeded locations (Fridge, Pantry, Freezer, Counter)
6. **Responsive Design**: Collapsible sidebar navigation with dark/light mode support

## Project Structure
```
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/                    # Shadcn UI primitives
│   │   │   ├── app-sidebar.tsx        # Navigation sidebar with chat + inventory sections
│   │   │   ├── chat-message.tsx       # Chat bubble with streaming support
│   │   │   ├── chat-input.tsx         # Message input with send button
│   │   │   ├── food-card.tsx          # Food item card with edit/delete
│   │   │   ├── add-food-dialog.tsx    # Add food with USDA search
│   │   │   ├── edit-food-dialog.tsx   # Edit food item dialog
│   │   │   ├── recipe-card.tsx        # Recipe display with ingredients
│   │   │   ├── recipe-generator.tsx   # Recipe generation button
│   │   │   ├── empty-state.tsx        # Empty state variations
│   │   │   ├── loading-dots.tsx       # Loading animation
│   │   │   └── theme-toggle.tsx       # Dark/light mode toggle
│   │   ├── pages/
│   │   │   ├── chat.tsx               # Main chat interface (/)
│   │   │   ├── storage.tsx            # Storage location view (/storage/:location)
│   │   │   └── not-found.tsx          # 404 page
│   │   └── App.tsx                    # App entry with Sidebar layout
│   └── index.html                     # Ubuntu/Georgia/Menlo fonts
├── server/
│   ├── routes.ts                      # All API endpoints
│   ├── storage.ts                     # In-memory storage with IStorage interface
│   ├── openai.ts                      # OpenAI GPT-5 streaming integration
│   └── usda.ts                        # USDA FoodData Central API
└── shared/
    └── schema.ts                      # Shared types with Drizzle-Zod schemas
```

## Routing
- `/` - Chat page with AI Chef assistant
- `/storage/all` - All inventory items view
- `/storage/:location` - Specific storage location (fridge, pantry, freezer, counter)

## API Endpoints

### Storage Locations
- `GET /api/storage-locations` - Get all storage locations with item counts

### Food Items (Complete CRUD)
- `GET /api/food-items` - Get all food items (optional: ?storageLocationId=id)
- `POST /api/food-items` - Create new food item
- `PATCH /api/food-items/:id` - Update food item
- `DELETE /api/food-items/:id` - Delete food item

### Appliances
- `GET /api/appliances` - Get all appliances
- `POST /api/appliances` - Create new appliance

### USDA Food Database
- `GET /api/usda/search?query=chicken` - Search USDA foods (returns name, fdcId, dataType)
- `GET /api/usda/food/:fdcId` - Get detailed food data by FDC ID

### Chat (Streaming SSE)
- `GET /api/chat/messages` - Get chat history
- `POST /api/chat` - Send message (Server-Sent Events streaming response)

### Recipes
- `GET /api/recipes` - Get all generated recipes
- `POST /api/recipes/generate` - Generate recipe from current inventory and appliances

## Design System

### Colors
- **Primary**: Olive Green (HSL 84.71 50% 40%) - main brand color
- **Secondary**: Dark Navy (HSL 210 25% 7.8431%) - accents
- **Background**: Adaptive white/dark based on theme
- **Accent**: Complementary blues for cards and highlights

### Typography
- **Primary**: Ubuntu (sans-serif) - UI text
- **Recipe Headings**: Georgia (serif) - recipe titles and descriptions
- **Data/FCD IDs**: Menlo (monospace) - technical data display

### Layout
- ChatGPT-inspired conversational interface
- Sidebar navigation with collapsible functionality
- Border radius: 1.3rem (var(--radius))
- Consistent spacing: 0.25rem intervals
- Fully responsive with mobile support

## Implementation Status

### ✅ Completed Features
- Complete data schema with TypeScript + Drizzle-Zod validation
- Full React frontend with exceptional visual quality
- Backend API with all endpoints functional
- OpenAI GPT-5 integration with streaming chat responses
- USDA food database search and lookup
- Complete CRUD for food inventory:
  - Add food with USDA search or manual entry
  - Edit existing food items
  - Delete food items with confirmation
  - View by storage location or all items
- Recipe generation from available ingredients
- Storage location management with item counts
- Kitchen appliances registry
- Dark/light mode support
- Responsive sidebar navigation
- Empty states and loading animations
- Error handling with toast notifications

### 🧪 Testing Status
- ✅ E2E tests passed for full CRUD flow
- ✅ Navigation between pages verified
- ✅ Add/Edit/Delete operations confirmed working
- ✅ UI updates and cache invalidation validated
- ✅ Sidebar navigation and item counts accurate

### 🔄 Known Limitations (MVP Scope)
- USDA API may have rate limits or require authentication in production
- In-memory storage - data resets on server restart (DB upgrade path available)
- Chat streaming works but external OpenAI responses not validated in tests
- Shopping cart/list integration mentioned in original scope (future feature)

## User Preferences
- Design follows ChatGPT-inspired conversational interface
- Olive green (#6b8e23) and dark navy (#0e1621) color scheme
- Clean, modern aesthetic with Ubuntu typography
- Focus on usability and visual excellence
- Prefer horizontal batching in development workflow
- Schema-first approach for type consistency

## Recent Changes (2025-10-11)

### Initial MVP Development
1. **Schema & Types**: Defined complete data models for food items, storage locations, appliances, chat messages, and recipes with TypeScript + Drizzle-Zod
2. **Design System**: Configured colors, fonts, and tokens in index.html, index.css, and tailwind.config.ts per design_guidelines.md
3. **Frontend Components**: Built all UI components with exceptional visual quality:
   - Chat interface with streaming message bubbles
   - Food inventory cards with expiration indicators
   - Add/Edit dialogs with USDA search integration
   - Recipe cards with ingredients and instructions
   - Sidebar navigation with storage sections
4. **Backend API**: Implemented all endpoints:
   - OpenAI GPT-5 streaming chat
   - USDA food search and lookup
   - Complete food item CRUD
   - Recipe generation from inventory
5. **Integration**: Connected frontend to backend with React Query, proper cache invalidation, and error handling
6. **Testing**: Comprehensive e2e tests confirming all user flows functional

### Bug Fixes & Improvements
- Fixed routing: Chat at "/", All Items at "/storage/all", specific locations at "/storage/:location"
- Updated sidebar with proper navigation structure (Chat + Inventory sections)
- Implemented AddFoodDialog with USDA search and manual entry fallback
- Added EditFoodDialog for updating food items
- Connected all CRUD buttons and handlers in FoodCard
- Integrated RecipeGenerator in both Chat and Storage pages
- Replaced hard navigation with proper router navigation (wouter)

## Development Notes
- **OpenAI**: Uses Replit AI Integrations (no API key required, billed to credits)
- **USDA API**: Configured in server/usda.ts, may need API key for production use
- **Storage**: In-memory MemStorage - consider PostgreSQL upgrade for persistence
- **Components**: All follow Shadcn UI patterns and design_guidelines.md strictly
- **Forms**: React Hook Form + Zod resolvers for validation
- **Query Keys**: Hierarchical arrays for proper cache invalidation (e.g., ['/api/food-items', id])
- **Test IDs**: All interactive elements have data-testid attributes for testing

## Next Steps (Future Enhancements)
1. **Database Migration**: Upgrade from in-memory to PostgreSQL for data persistence
2. **USDA Production**: Configure API key and handle rate limiting
3. **Shopping Integration**: Implement shopping cart/list sync (mentioned in original scope)
4. **Recipe Favorites**: Save and organize favorite recipes
5. **Expiration Alerts**: Push notifications for expiring food items
6. **Meal Planning**: Weekly meal planner using generated recipes
7. **Nutrition Tracking**: Leverage USDA nutritional data for meal tracking
