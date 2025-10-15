# ChefSpAIce Logo Assets

This directory contains various sizes of the ChefSpAIce logo in both SVG and PNG formats.

## Design Specifications
- **Background**: Dark green gradient from #1a2e05 to #4d7c0f
- **Icon**: White chef's hat with light gray stroke (rgb(212,212,212))
- **Border Radius**: 6px rounded corners
- **Style**: Minimalist, flat design

## Available Formats

### SVG Files (Vector - Scalable)
Perfect for modern browsers, scalable without quality loss:
- `logo-16.svg` - 16×16px (favicon size) - 866 bytes
- `logo-32.svg` - 32×32px (favicon size) - 866 bytes
- `logo-48.svg` - 48×48px - 866 bytes
- `logo-64.svg` - 64×64px - 866 bytes
- `logo-128.svg` - 128×128px - 870 bytes
- `logo-192.svg` - 192×192px (PWA standard) - 870 bytes
- `logo-256.svg` - 256×256px - 870 bytes
- `logo-512.svg` - 512×512px (PWA standard) - 870 bytes

### PNG Files (Raster - Optimized)
Fallback for older browsers, optimized for small file size:
- `logo-16.png` - 16×16px - 569 bytes
- `logo-32.png` - 32×32px - 1.1KB
- `logo-48.png` - 48×48px - 1.5KB
- `logo-64.png` - 64×64px - 1.8KB
- `logo-128.png` - 128×128px - 2.8KB
- `logo-192.png` - 192×192px (PWA) - 3.7KB
- `logo-256.png` - 256×256px - 4.7KB
- `logo-512.png` - 512×512px (PWA) - 9.1KB

### Special Files
- `apple-touch-icon.png` - Apple device icon (192×192px) - 3.7KB

## Usage Guidelines

### For Favicons
Modern browsers support SVG favicons with PNG fallbacks:
```html
<link rel="icon" type="image/svg+xml" href="/logo-32.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/logo-32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/logo-16.png">
```

### For PWA/App Icons
Reference in `manifest.json`:
```json
{
  "icons": [
    { "src": "/logo-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any maskable" },
    { "src": "/logo-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ]
}
```

### For Social Media
- **Open Graph**: Use `logo-512.png` (9.1KB)
- **Twitter Card**: Use `logo-512.png` (9.1KB)

### In React Components
Use the Logo component for consistent branding:
```tsx
import { Logo } from '@/components/Logo';

// Icon only
<Logo size="md" />

// With text
<Logo size="lg" showText />
```

## File Locations
All logo assets are stored in the `/public` directory and are accessible at:
- `https://yourdomain.com/logo-{size}.{format}`
- Example: `https://yourdomain.com/logo-192.png`

## Regenerating PNG Files
If you need to regenerate PNG files from the source SVG:
```bash
node scripts/generate-logo-pngs.mjs
```

This script uses Sharp to convert `icons/chef-hat.svg` to all PNG sizes with optimal compression.
