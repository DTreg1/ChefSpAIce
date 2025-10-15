# ChefSpAIce Marketing Assets

Complete marketing materials package for ChefSpAIce - Your Smart Kitchen Assistant

## Asset Structure

```
marketing_assets/
├── logos/                    # Brand identity files
│   ├── chefspice-icon.svg           # Square icon with background
│   ├── chefspice-icon-white.svg     # White icon for dark backgrounds
│   ├── chefspice-logo-horizontal.svg # Full logo with text (landscape)
│   └── chefspice-logo-stacked.svg   # Full logo with text (portrait)
│
├── social_media/            # Social platform graphics
│   ├── instagram-post.svg          # 1080x1080 Instagram template
│   ├── twitter-header.svg          # 1500x500 Twitter/X header
│   ├── facebook-cover.svg          # 820x312 Facebook cover
│   └── linkedin-banner.svg         # 1584x396 LinkedIn banner
│
├── app_store/               # App store materials
│   ├── app-store-listing.md        # Complete store descriptions
│   ├── promotional-text.md         # Marketing copy
│   └── press-kit.md                # Media press kit
│
├── screenshots/             # App screenshots (to be captured)
│   ├── raw/                        # Original captures
│   ├── edited/                     # Post-processed
│   └── annotated/                  # With marketing overlays
│
├── demo-data.md            # Sample data for screenshots
└── screenshot-guide.md     # Screenshot capture instructions
```

## Brand Guidelines

### Primary Colors
- **Olive Green:** #6b8e23 (HSL: 82 39% 30%)
- **Light Olive:** #7c8f4d
- **Dark Olive:** #556b2f
- **Accent Gold:** #ffd700 (for AI elements)

### Typography
- **Primary Font:** Ubuntu (weights: 300, 400, 500, 700)
- **Fallback:** System sans-serif

### Logo Usage
1. **Icon Only** (`chefspice-icon.svg`)
   - App icons, favicon, social media profile pictures
   - Minimum size: 32x32px
   - Clear space: 20% of icon size on all sides

2. **Horizontal Logo** (`chefspice-logo-horizontal.svg`)
   - Website headers, email signatures
   - Ideal for wide spaces
   - Aspect ratio: 4:1

3. **Stacked Logo** (`chefspice-logo-stacked.svg`)
   - Marketing materials, presentations
   - Square social media posts
   - Aspect ratio: 4:5

4. **White Version** (`chefspice-icon-white.svg`)
   - Dark backgrounds only
   - Maintain sufficient contrast

## Social Media Assets

### Instagram Post (1080x1080)
- Square format for feed posts
- Features centered logo with tagline
- Includes 4 key feature icons
- CTA button design included

### Twitter/X Header (1500x500)
- Optimized for new Twitter dimensions
- Gradient background with pattern overlay
- Left-aligned logo, centered text
- Right-aligned CTA button

### Facebook Cover (820x312)
- Desktop and mobile optimized
- Clean, professional design
- Feature highlights included
- Matches brand aesthetic

### LinkedIn Banner (1584x396)
- Professional B2B messaging
- Stats and metrics focused
- Enterprise-ready appearance
- Dark theme for contrast

## Screenshot Guidelines

### Required Screenshots
1. **Landing Page** - Hero section with value props
2. **Smart Inventory** - Fridge view with expiration indicators
3. **AI Chat** - Active conversation with recipe generation
4. **Recipe View** - Generated recipe with customization
5. **Nutrition Dashboard** - Charts and daily tracking
6. **Meal Planner** - Weekly calendar view
7. **Shopping List** - Categorized items (mobile)
8. **Barcode Scanner** - Active scanning interface (mobile)

### Capture Best Practices
- Use demo data for consistent, appealing content
- Ensure all expiration indicators are visible
- Show variety in food items and recipes
- Include both light and dark mode versions
- Capture at 2x resolution for retina displays

## Marketing Copy

### Taglines
- **Primary:** "Your Smart Kitchen Assistant"
- **Secondary:** "Your AI chef that knows what's in your fridge"
- **CTA:** "Reduce waste. Save money. Eat better."

### Value Propositions
1. **Save $100+ monthly** on groceries
2. **Reduce food waste by 70%**
3. **Personalized recipes** from your ingredients
4. **Complete nutrition tracking** with USDA data
5. **Automated meal planning** and shopping lists

### Target Audiences
- **Primary:** Busy professionals (25-45)
- **Secondary:** Health-conscious families
- **Tertiary:** Environmental advocates

## Usage Instructions

### For Web
1. Place logo in `/client` directory
2. Reference in HTML: `<link rel="icon" href="/logo.svg">`
3. Manifest already configured in `/client/manifest.json`

### For Marketing
1. Use SVG files for maximum quality at any size
2. Export to PNG at 2x for raster needs
3. Maintain brand colors in all materials
4. Follow clear space guidelines

### For Social Media
1. Use platform-specific templates provided
2. Update text/CTAs as needed
3. Export at platform-recommended resolutions
4. Test appearance on both mobile and desktop

### For App Stores
1. Use app-store-listing.md for descriptions
2. Follow promotional-text.md for featured content
3. Reference press-kit.md for media inquiries
4. Update version notes for each release

## Editing Assets

### SVG Files
- Edit with vector graphics software (Illustrator, Inkscape, Figma)
- Text is editable within the SVG files
- Colors defined in gradient definitions
- Scale without quality loss

### Updating Content
1. Open SVG in text editor for quick text changes
2. Find `<text>` elements to modify copy
3. Update `fill` attributes for color changes
4. Adjust `transform` for positioning

## Performance Metrics

Track marketing asset effectiveness:
- **Social Media:** Engagement rates, click-throughs
- **App Store:** Conversion from view to download
- **Screenshots:** A/B test different variations
- **Press Kit:** Media pickup and coverage

## Distribution Checklist

### Launch Preparation
- [ ] Logo files uploaded to all platforms
- [ ] Social media templates customized and scheduled
- [ ] App store listings submitted with assets
- [ ] Press kit sent to media contacts
- [ ] Screenshots captured with demo data
- [ ] Marketing copy proofread and approved

### Platform Requirements
- **App Store:** 6.5", 5.5" screenshots
- **Google Play:** Feature graphic 1024x500
- **Product Hunt:** Gallery images 1270x760
- **Website:** OG image 1200x630

## Support

For questions about marketing assets:
1. Check this README first
2. Review brand guidelines
3. Test in target environment
4. Request updates via GitHub issues

## License

All marketing assets are proprietary to ChefSpAIce.
Media use requires attribution.
Commercial use requires permission.

---

*Last Updated: October 2025*
*Version: 1.0.0*