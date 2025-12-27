# ChefSpAIce Design Guidelines

## Architecture Decisions

### Authentication
**No authentication required.** The app focuses on personal kitchen management with local data storage.

**Profile/Settings Screen Required:**
- User-customizable avatar (2 preset avatars: chef's hat icon, leaf icon - both in green accent)
- Display name field
- Preferences: dark mode toggle, waste goal settings, notification preferences

### Navigation Architecture
**Tab Navigation (4 tabs + FAB):**
1. **Pantry** (home icon) - Main inventory view
2. **Recipes** (book icon) - Meal ideas using available ingredients
3. **Stats** (trending-up icon) - Waste tracking and insights
4. **Profile** (user icon) - Settings and preferences

**Floating Action Button:** Centered above tab bar for "Add Item" (plus icon) - primary action to add food items to pantry

**Stack Screens (accessed via navigation):**
- Item Detail (from Pantry)
- Recipe Detail (from Recipes)
- Shopping List (button in Pantry header)
- Waste Log (button in Stats header)

---

## Screen Specifications

### 1. Pantry Screen (Default Tab)
**Purpose:** View and manage food inventory by category

**Layout:**
- **Header:** Transparent, custom
  - Left: App wordmark "ChefSpAIce" in subtle green
  - Right: Shopping bag icon (navigates to Shopping List)
  - Search bar below header (frosted glass background)
- **Content:** Scrollable
  - Category sections (Produce, Dairy, Grains, etc.) with frosted glass section headers
  - Food item cards in grid layout (2 columns)
  - Each card shows: item image/icon, name, quantity, expiration indicator (color-coded: green = fresh, amber = expiring soon, red = expired)
- **Safe Area Insets:**
  - Top: `headerHeight + Spacing.xl`
  - Bottom: `tabBarHeight + Spacing.xl + FAB offset`

**Components:** Search bar, section headers, grid cards, expiration badges

### 2. Recipes Screen
**Purpose:** Discover recipes based on available pantry items

**Layout:**
- **Header:** Transparent, custom
  - Title: "Recipes"
  - Right: Filter icon (dietary preferences, difficulty)
- **Content:** Scrollable list
  - "Use What You Have" section at top (frosted glass banner)
  - Recipe cards: hero image with frosted glass overlay containing recipe name, cook time, ingredient match percentage
- **Safe Area Insets:**
  - Top: `headerHeight + Spacing.xl`
  - Bottom: `tabBarHeight + Spacing.xl`

**Components:** Filter modal, scrollable recipe cards with image overlays

### 3. Stats Screen
**Purpose:** Visualize food waste reduction progress

**Layout:**
- **Header:** Transparent, custom
  - Title: "Impact"
  - Right: Calendar icon (view historical data)
- **Content:** Scrollable
  - Frosted glass stat cards (weekly waste saved, money saved, carbon footprint)
  - Line chart showing waste trend (7/30/90 days toggle)
  - "Recent Waste Log" section with list items
- **Safe Area Insets:**
  - Top: `headerHeight + Spacing.xl`
  - Bottom: `tabBarHeight + Spacing.xl`

**Components:** Stat cards, line chart with frosted glass container, list items

### 4. Profile Screen
**Purpose:** User customization and app settings

**Layout:**
- **Header:** Default navigation header (non-transparent)
  - Title: "Profile"
- **Content:** Scrollable form
  - Avatar selection (circular, frosted glass border)
  - Display name input (frosted glass text field)
  - Settings sections: Preferences, Notifications, Goals, About
- **Safe Area Insets:**
  - Top: `Spacing.xl`
  - Bottom: `tabBarHeight + Spacing.xl`

**Components:** Avatar picker, text inputs, toggle switches, section lists

### 5. Add Item Screen (Modal via FAB)
**Purpose:** Quick entry of pantry items

**Layout:**
- **Header:** Custom modal header
  - Left: "Cancel" button
  - Title: "Add Item"
  - Right: "Save" button (green accent)
- **Content:** Scrollable form
  - Item name input
  - Category picker
  - Quantity stepper
  - Expiration date picker
  - Photo capture/upload option
- **Safe Area Insets:**
  - Top: `insets.top + Spacing.xl`
  - Bottom: `insets.bottom + Spacing.xl`

**Components:** Text inputs, pickers, date selector, image picker, buttons

---

## Design System

### Color Palette
**Primary Accent:** Fresh Green
- Green 500 (primary): `#10B981` (emerald)
- Green 400 (light): `#34D399`
- Green 600 (dark): `#059669`

**Status Colors:**
- Fresh: Green 500
- Expiring Soon: `#F59E0B` (amber)
- Expired: `#EF4444` (red)

**Neutrals (Glass Tint Base):**
- Background: `#FAFAFA` (light mode), `#121212` (dark mode)
- Glass Tint: White with 10-20% opacity (light mode), Black with 15-25% opacity (dark mode)
- Text Primary: `#1F2937` (light), `#F9FAFB` (dark)
- Text Secondary: `#6B7280` (light), `#9CA3AF` (dark)

### Typography
- **Heading 1:** 28pt, Bold
- **Heading 2:** 22pt, Semibold
- **Body:** 16pt, Regular
- **Caption:** 13pt, Regular
- **Button:** 16pt, Semibold

### Frosted Glass Specifications
**Standard Glass Card:**
- Background: White/Black with 12% opacity + blur(20)
- Border: 1px, White/Black with 15% opacity
- Corner radius: 16pt
- Inner shadow: Subtle top light reflection

**Floating Elements (Tab Bar, FAB, Search Bar):**
- Background: White/Black with 15% opacity + blur(30)
- Shadow: width: 0, height: 2, opacity: 0.10, radius: 2
- Corner radius: Tab bar 24pt (top only), FAB 28pt (circle), Search bar 12pt

**Translucent Panels (Stats cards, Section headers):**
- Background: Green tint with 8% opacity + blur(15)
- Adaptive to content behind (content should be subtly visible)

### Interaction Design
**Press States (All touchables):**
- Scale down to 0.97
- Opacity: 0.8
- Duration: 100ms

**FAB Behavior:**
- Floats 16pt above tab bar center
- Expands on press with haptic feedback
- Opens modal with slide-up animation

**Card Interactions:**
- Tap: Navigate to detail
- Long press: Quick actions menu (edit, delete, mark as used)

### Accessibility
- Minimum touch target: 44x44pt
- Color contrast ratio: 4.5:1 minimum for text on glass backgrounds
- Expiration indicators: Include text labels ("Fresh," "Expires Soon," "Expired") alongside color
- VoiceOver labels for all interactive elements
- Dynamic Type support for all text

---

## Critical Assets

**Generate 2 Assets:**
1. **Avatar Option 1:** Minimalist chef's hat icon (green line art on white circle)
2. **Avatar Option 2:** Simple leaf icon (green fill, circular background)

**System Icons:** Use Feather icons from @expo/vector-icons for all navigation and actions (home, book-open, trending-up, user, plus, shopping-bag, calendar, filter, camera, x)