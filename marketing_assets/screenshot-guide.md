# Screenshot Capture Guide for ChefSpAIce Marketing

## Recommended Screenshot Tools
- **Chrome DevTools**: Built-in screenshot feature (Ctrl+Shift+I → Device Mode)
- **Firefox Screenshots**: Built-in full-page capture
- **Awesome Screenshot**: Browser extension for annotations
- **CleanShot X** (Mac) or **ShareX** (Windows): Professional screenshot tools

## Key Screenshots to Capture

### 1. Hero Landing Page (1920x1080)
- Navigate to your app's home page when logged out
- Capture the full landing page with all feature cards visible
- Ensure the ChefHat logo and gradient backgrounds are prominent

### 2. Smart Inventory View (1440x900)
- Log in and navigate to Storage → Fridge
- Add the demo items from demo-data.md
- Show items with different expiration statuses (red, yellow, green indicators)
- Include the search bar and category filters

### 3. AI Chat Interface (1440x900)
- Navigate to Chat
- Have a conversation about "What can I make with chicken?"
- Show both user and AI messages
- Include the recipe card generated in the response

### 4. Recipe Generation (1440x900)
- Show the Recipe Customization Dialog
- Display sliders for serving size, cooking time, difficulty
- Show generated recipe with ingredients and instructions
- Include the "Save to Cookbook" button

### 5. Nutritional Dashboard (1440x900)
- Navigate to Nutrition page
- Show the donut charts for macronutrients
- Display the calorie breakdown
- Include the food groups section

### 6. Meal Planner Calendar (1440x900)
- Navigate to Meal Planner
- Show a week with recipes scheduled
- Display both calendar and list views
- Include the "Generate Shopping List" button

### 7. Shopping List (Mobile - 375x812)
- Use Chrome DevTools mobile view (iPhone 12 Pro)
- Navigate to Shopping List
- Show categorized items
- Include check-off functionality

### 8. Barcode Scanner (Mobile - 375x812)
- Show the scanner interface
- Include the camera view mockup
- Display a scanned product result

## Screenshot Best Practices

### Preparation
1. Clear browser cache and cookies for fresh UI
2. Use incognito/private mode to avoid extensions
3. Set zoom to 100% for consistency
4. Add demo data before capturing

### Capture Settings
- **Format**: PNG for transparency, JPG for photos
- **Resolution**: Minimum 2x for retina displays
- **Color Profile**: sRGB for web compatibility

### Post-Processing
1. Crop to remove browser UI unless showing responsive design
2. Add subtle shadows for depth (optional)
3. Ensure text is readable at smaller sizes
4. Save originals before editing

## Mobile Screenshots
Use Chrome DevTools Device Mode:
1. Press F12 or Ctrl+Shift+I
2. Click device toggle (Ctrl+Shift+M)
3. Select device preset (iPhone, iPad, Pixel)
4. Capture using DevTools screenshot button

## Responsive Breakpoints to Capture
- Mobile: 375px (iPhone)
- Tablet: 768px (iPad)
- Desktop: 1440px (Laptop)
- Wide: 1920px (Desktop)

## File Naming Convention
```
chefspice-[feature]-[device]-[variant].png
```
Examples:
- chefspice-landing-desktop-hero.png
- chefspice-chat-mobile-conversation.png
- chefspice-inventory-tablet-grid.png

## Marketing Screenshot Annotations
Consider adding:
- Feature callout bubbles
- Arrow pointers to key UI elements
- Text overlays explaining benefits
- Device frames for mobile screenshots

## Storage Organization
```
marketing_assets/
  screenshots/
    raw/           # Original captures
    edited/        # Post-processed versions
    annotated/     # Marketing versions with text
    devices/       # With device frames
```