# AI Chef Helper - Comprehensive Design Guidelines

## Design Approach
**Utility-Focused Chat Application** - Following ChatGPT's conversational patterns combined with food management capabilities from Yuka and MyFitnessPal. The design prioritizes clarity, readability, and efficient information access while maintaining a warm, approachable aesthetic suitable for a kitchen companion.

## Color System

### Light Mode (Primary)
- **Primary**: 85 50% 40% (Olive Green) - CTAs, active states, success indicators
- **Secondary**: 210 25% 7.8% (Dark Navy) - Primary text, headers
- **Background**: 0 0% 100% (White) - Main canvas
- **Surface**: 0 0% 98% (Off-white) - Chat bubbles, cards
- **Border**: 210 20% 90% (Light grey) - Dividers, card outlines
- **Accent**: 212 51% 93% (Light Blue) - Info indicators, AI message backgrounds
- **Text Primary**: 210 25% 7.8% (Dark Navy)
- **Text Secondary**: 210 15% 45% (Medium grey)
- **Error**: 0 70% 50% (Red) - Expired items
- **Warning**: 40 90% 55% (Amber) - Expiring soon

### Dark Mode
- **Background**: 210 25% 7.8% (Dark Navy)
- **Surface**: 210 20% 12% (Slightly lighter navy)
- **Text Primary**: 0 0% 95% (Off-white)
- **Primary**: 85 45% 50% (Lighter olive for contrast)
- **Accent**: 212 40% 25% (Darker blue for backgrounds)

## Typography

### Font Families
- **Primary**: Ubuntu, -apple-system, BlinkMacSystemFont, sans-serif
- **Serif**: Ubuntu, sans-serif (Recipe titles and headings)
- **Monospace**: Ubuntu Mono, Monaco, 'Courier New', monospace (USDA FCD IDs, quantities)

### Type Scale
- **Display**: 2.5rem/3rem, Ubuntu, weight 600 (Recipe headings in chat)
- **H1**: 2rem/2.5rem, Ubuntu, weight 600 (Page titles)
- **H2**: 1.5rem/2rem, Ubuntu, weight 600 (Section headers)
- **H3**: 1.25rem/1.75rem, Ubuntu, weight 500 (Card titles)
- **Body**: 1rem/1.5rem, Ubuntu, weight 400 (Chat messages)
- **Small**: 0.875rem/1.25rem, Ubuntu, weight 400 (Metadata, timestamps)
- **Caption**: 0.75rem/1rem, Ubuntu Mono, weight 500 (Labels, FCD IDs)

## Layout System

### Spacing Primitives (Tailwind Units)
Core spacing: **2, 4, 6, 8, 12, 16** (0.5rem, 1rem, 1.5rem, 2rem, 3rem, 4rem)
- Component padding: p-4, p-6
- Section spacing: py-8, py-12
- Element gaps: gap-2, gap-4
- Card spacing: p-6
- Chat message spacing: mb-4

### Grid Structure
- **Desktop**: Sidebar (280px fixed) + Main chat (flex-1, max-w-4xl centered)
- **Tablet**: Collapsible sidebar (overlay) + Main chat (full width)
- **Mobile**: Bottom navigation + Main chat (full width)

### Container Widths
- Chat container: max-w-4xl (768px)
- Food cards: max-w-sm (384px) within chat
- Sidebar: w-70 (280px)

## Component Library

### Chat Interface
**Message Bubbles**
- User messages: Right-aligned, primary olive green background, white text, rounded-2xl (1.3rem), max-w-lg
- AI messages: Left-aligned, accent light blue background, dark text, rounded-2xl, max-w-2xl
- System messages: Centered, border-2 border-gray-200, rounded-xl, text-sm
- Timestamp: text-xs text-gray-500, mt-1

**Input Area**
- Fixed bottom bar with subtle shadow
- Multiline textarea with rounded-xl borders
- Send button: Primary olive green, rounded-full, icon-only
- Attachment button for photos (food recognition feature)

### Food Inventory Cards (Within Chat)
**Card Structure** (embedded in AI messages)
- Container: bg-white dark:bg-surface, rounded-xl, border border-gray-200, p-4, shadow-sm
- Header: Food name (font-medium, text-lg) + Storage badge (pill-shaped, text-xs)
- Meta row: FCD ID (Menlo, text-xs, text-gray-500) + Quantity (text-sm, font-medium)
- Expiry indicator: Color-coded bar (green: fresh, amber: expiring, red: expired)
- Thumbnail: 64px square, rounded-lg, object-cover (if image available)
- Actions: Edit, Delete, Move (icon buttons, text-gray-400 hover:text-primary)

**Storage Location Badges**
- Fridge: bg-blue-100 text-blue-700
- Freezer: bg-cyan-100 text-cyan-700  
- Pantry: bg-amber-100 text-amber-700
- Counter: bg-green-100 text-green-700

### Sidebar Navigation
**Structure**
- Header: App logo + name (Ubuntu, font-semibold, text-xl)
- Storage sections: Collapsible groups with item counts
- Quick filters: All items, Expiring soon, Shopping list
- Add item button: Primary olive green, w-full, rounded-xl

**Storage Items**
- List item: Flex row, justify-between, px-4 py-3, hover:bg-gray-50
- Icon + Name + Count badge (text-xs, rounded-full, bg-gray-200)

### Recipe Display (In Chat)
**Recipe Card**
- Container: bg-white, rounded-2xl, border-2 border-primary/20, p-6
- Title: Georgia serif, text-2xl, font-semibold, mb-4
- Meta: Prep time, Cook time, Servings (icon + text pairs, gap-4)
- Ingredients: Checkboxes, text-base, with inventory indicators (✓ in stock, ✗ missing)
- Instructions: Numbered steps, text-base, leading-relaxed
- Generated badge: "AI Generated" pill in top-right

### Buttons & Controls
**Primary**: bg-primary text-white rounded-xl px-6 py-3 font-medium hover:bg-primary/90
**Secondary**: bg-gray-100 text-gray-700 rounded-xl px-6 py-3 font-medium hover:bg-gray-200
**Outline**: border-2 border-primary text-primary rounded-xl px-6 py-3 hover:bg-primary/5
**Icon Button**: p-2 rounded-lg hover:bg-gray-100 transition-colors

### Form Elements
- Input fields: border border-gray-300 rounded-xl px-4 py-3 focus:border-primary focus:ring-2 focus:ring-primary/20
- Select dropdowns: Same as inputs with chevron icon
- Checkboxes: rounded border-2 checked:bg-primary
- Labels: text-sm font-medium text-gray-700 mb-2

## Images

**Hero Section**: NOT APPLICABLE - This is a chat-based utility application without a traditional landing page.

**Food Item Thumbnails**
- Size: 64px × 64px squares within inventory cards
- Style: rounded-lg, object-cover
- Placeholder: Utensil icon on light gray background when no image available
- Source: USDA database images or user-uploaded photos

**Empty States**
- Illustration: Simple line art of empty fridge/pantry (max 200px height)
- Placement: Centered in chat when no items in selected storage location

## Interactions & Animations

**Micro-interactions** (Use sparingly)
- Message send: Subtle fade-in from bottom (150ms)
- Card actions: Scale to 0.95 on click
- Hover states: Smooth color transitions (200ms ease)
- Loading: Pulsing dots for AI typing indicator

**Transitions**
- Sidebar toggle: Slide in/out 300ms ease-in-out
- Card expand/collapse: Height transition 250ms
- Page navigation: Fade 200ms

## Accessibility
- WCAG AA contrast ratios maintained (4.5:1 for text)
- Focus visible indicators: 2px primary ring
- Keyboard navigation: Tab order follows visual flow
- Screen reader labels for all interactive elements
- Dark mode with proper contrast adjustments

## Responsive Behavior
- **Desktop (1024px+)**: Persistent sidebar + centered chat
- **Tablet (768px-1023px)**: Overlay sidebar + full-width chat
- **Mobile (<768px)**: Hidden sidebar, bottom tab bar, full-width chat, stacked cards

## Special Considerations
- Chat scrolls to bottom on new messages
- Infinite scroll pagination for chat history  
- Sticky input bar always accessible
- Optimistic UI updates for instant feedback
- Real-time inventory count updates in sidebar