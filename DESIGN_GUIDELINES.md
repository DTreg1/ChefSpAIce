# ChefSpAIce Design Guidelines

This document provides comprehensive UI/UX guidelines for maintaining visual consistency across the ChefSpAIce application.

## Design Philosophy

ChefSpAIce follows the **iOS 26 Liquid Glass Design** aesthetic, emphasizing:
- Translucent, frosted glass surfaces
- Subtle blur effects and overlays
- Smooth, spring-based animations
- Fresh green accent color representing freshness and sustainability
- Light/dark mode support with seamless transitions

---

## Color System

### Brand Colors

| Name | Hex | Usage |
|------|-----|-------|
| Primary (Green) | `#27AE60` | Primary actions, success states, brand identity |
| Secondary (Orange) | `#E67E22` | Secondary actions, warnings |
| Accent (Blue) | `#3498DB` | Links, informational elements |
| Warning | `#F39C12` | Warning states, caution indicators |
| Success | `#2ECC71` | Success feedback |
| Error | `#E74C3C` | Error states, destructive actions |

### Semantic Colors

```typescript
// Light Theme
text: "#2C3E50"           // Primary text
textSecondary: "#495057"  // Secondary/caption text
background: "#F8F9FA"     // Page background
surface: "#FFFFFF"        // Card/component surfaces
border: "#E9ECEF"         // Dividers and borders

// Dark Theme
text: "#ECEDEE"           // Primary text
textSecondary: "#B0B8C0"  // Secondary/caption text
background: "rgba(26, 26, 26, 0.85)"
surface: "rgba(26, 26, 26, 0.9)"
```

### Glass Effect Colors

Glass components use semi-transparent overlays:

```typescript
// Light Mode Glass
background: "rgba(255, 255, 255, 0.15)"
backgroundStrong: "rgba(255, 255, 255, 0.25)"
border: "rgba(255, 255, 255, 0.3)"

// Dark Mode Glass
background: "rgba(0, 0, 0, 0.2)"
backgroundStrong: "rgba(0, 0, 0, 0.35)"
border: "rgba(255, 255, 255, 0.15)"
```

### Expiry Status Colors

| Status | Background | Text Color | Days Until Expiry |
|--------|------------|------------|-------------------|
| Expired/Urgent | `#ef4444` | White | ≤ 1 day |
| Warning | `#f97316` | White | 2-3 days |
| Caution | `#eab308` | White | 4-5 days |
| Soon | `#fef3c7` | `#92400e` | 6-7 days |
| Neutral | `#9ca3af` | `#374151` | > 7 days |

### Confidence Indicator Colors

Used for storage suggestion confidence levels:

| Level | Color | Usage |
|-------|-------|-------|
| High | `#22c55e` | Strong recommendation |
| Medium | `#eab308` | Moderate confidence |
| Low | `#f97316` | Low confidence suggestion |

---

## Typography

### Type Scale

| Type | Size | Weight | Usage |
|------|------|--------|-------|
| h1 | 28px | Bold (700) | Page titles, hero text |
| h2 | 24px | Bold (700) | Section headers |
| h3 | 20px | Semi-bold (600) | Card titles |
| h4 | 18px | Semi-bold (600) | Subsection headers |
| body | 16px | Regular (400) | Main content text |
| small | 14px | Regular (400) | Supporting text |
| caption | 13px | Medium (500) | Labels, metadata |
| button | 16px | Semi-bold (600) | Button labels |

### Font Families

```typescript
// iOS
sans: "system-ui"
rounded: "ui-rounded"

// Android
sans: "normal"

// Web
sans: "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
```

### Usage with ThemedText

```tsx
<ThemedText type="h1">Page Title</ThemedText>
<ThemedText type="body">Main content</ThemedText>
<ThemedText type="caption">Secondary info</ThemedText>
<ThemedText type="link">Clickable link</ThemedText>
```

---

## Spacing System

Consistent spacing ensures visual harmony:

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Tight spacing, inline elements |
| sm | 8px | Small gaps, icon margins |
| md | 12px | Default padding |
| lg | 16px | Card padding, section gaps |
| xl | 24px | Large sections |
| 2xl | 32px | Major section dividers |
| 3xl | 40px | Page-level spacing |
| 4xl | 48px | Hero sections |
| 5xl | 56px | Maximum spacing |

### Component-Specific Spacing

| Component | Value |
|-----------|-------|
| Input Height | 48px |
| Button Height | 52px |

---

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Small badges, chips |
| sm | 8px | Inputs, small buttons |
| md | 12px | Cards, modals |
| lg | 16px | Primary components |
| xl | 20px | Large cards |
| 2xl | 24px | Feature cards |
| 3xl | 32px | Hero elements |
| pill | 9999px | Pills, fully rounded |

---

## Shadows

### Standard Shadows

```typescript
// Small - Subtle elevation
shadowOffset: { width: 0, height: 1 }
shadowOpacity: 0.05
shadowRadius: 2
elevation: 1

// Medium - Cards, buttons
shadowOffset: { width: 0, height: 2 }
shadowOpacity: 0.1
shadowRadius: 4
elevation: 2

// Large - Modals, floating elements
shadowOffset: { width: 0, height: 4 }
shadowOpacity: 0.15
shadowRadius: 8
elevation: 4
```

### Glass Shadows

```typescript
// Glass effect shadow
shadowColor: "rgba(31, 38, 135, 0.37)"
shadowOffset: { width: 0, height: 8 }
shadowRadius: 32
elevation: 8

// Subtle glass shadow
shadowColor: "rgba(31, 38, 135, 0.2)"
shadowOffset: { width: 0, height: 4 }
shadowRadius: 16
elevation: 4
```

---

## Component Library

### GlassCard

The primary container component with frosted glass effect.

**Props:**
- `intensity`: `"subtle"` | `"regular"` | `"strong"` - Blur intensity
- `tint`: `"light"` | `"dark"` | `"default"` - Glass tint color
- `onPress`: Optional press handler (adds tap animation)
- `title`: Optional card title
- `description`: Optional description text

**Usage:**
```tsx
<GlassCard intensity="regular" title="Inventory">
  <Text>Card content</Text>
</GlassCard>

<GlassCard onPress={handlePress}>
  <Text>Pressable card</Text>
</GlassCard>
```

**Platform Behavior:**
- **iOS 26+**: Uses native Liquid Glass effect via `expo-glass-effect`
- **iOS < 26**: Falls back to BlurView
- **Android**: Uses BlurView with appropriate intensity
- **Web**: CSS backdrop-filter blur

---

### GlassButton

Glass-styled button with blur effect and press animations.

**Variants:**
| Variant | Background | Text Color | Border |
|---------|------------|------------|--------|
| primary | Green (50% opacity) | White | Glass border |
| secondary | Orange (50% opacity) | White | Glass border |
| outline | Glass background | Primary green | 2px green border |
| ghost | Glass background | Theme text | Glass border |

**Usage:**
```tsx
<GlassButton variant="primary" onPress={handleSubmit}>
  Save Item
</GlassButton>

<GlassButton 
  variant="outline" 
  icon={<Feather name="plus" />}
  loading={isLoading}
>
  Add New
</GlassButton>
```

---

### Button

Standard button without glass effect (for non-glass contexts).

**Same variants as GlassButton but with solid backgrounds.**

---

### ThemedText

Typography component with automatic theme support.

**Types:** `h1`, `h2`, `h3`, `h4`, `body`, `small`, `caption`, `link`, `button`

**Features:**
- Automatic color based on theme
- Caption type uses secondary text color
- Link type uses accent color

---

### ThemedView

Container with automatic background theming.

```tsx
<ThemedView>
  {/* Content with themed background */}
</ThemedView>

<ThemedView 
  lightColor="#custom-light" 
  darkColor="#custom-dark"
>
  {/* Custom themed background */}
</ThemedView>
```

---

### ExpiryBadge

Status badge for expiration dates with color-coded urgency.

**Sizes:** `small`, `medium`, `large`

**Features:**
- Automatic color based on days until expiry
- Pulsing animation for urgent items (≤ 1 day)
- Icon display for items expiring within 3 days

```tsx
<ExpiryBadge daysUntilExpiry={2} size="medium" />
```

---

### AnimatedBackground

Full-screen animated gradient with floating bubbles.

**Features:**
- Lime green gradient (top-left to transparent)
- Floating translucent bubbles with wobble animation
- Adapts to light/dark mode
- Non-interactive (pointer-events: none)

```tsx
<AnimatedBackground bubbleCount={15} />
```

---

### OfflineIndicator

Status banner for network connectivity.

**States:**
- Offline: Yellow warning color, wifi-off icon
- Syncing: Secondary color, refresh icon
- Offline with pending: Combined message

**Features:**
- Spring animation for show/hide
- iOS blur effect, Android solid background
- Positioned at top with safe area insets

---

## Animation Guidelines

### Spring Configuration

Standard spring config for press/tap animations:

```typescript
const springConfig: WithSpringConfig = {
  damping: 15,
  mass: 0.3,
  stiffness: 150,
  overshootClamping: true,
  energyThreshold: 0.001,
};
```

### Press Scale Animation

Interactive elements should scale slightly on press:

```typescript
// Press in
scale.value = withSpring(0.97, springConfig);

// Press out
scale.value = withSpring(1, springConfig);
```

### Slide Animation

For showing/hiding elements:

```typescript
translateY.value = withSpring(shouldShow ? 0 : -100, {
  damping: 20,
  stiffness: 300,
});
```

### Pulse Animation

For urgent states (like expiring items):

```typescript
pulseScale.value = withRepeat(
  withSequence(
    withTiming(1.05, { duration: 600 }),
    withTiming(1, { duration: 600 }),
  ),
  -1, // infinite
  true // reverse
);
```

---

## Accessibility

### Minimum Touch Targets

- Buttons: 52px height minimum
- Interactive cards: Include pressable wrapper
- Icons: Wrap in Pressable with 44x44px minimum touch area

### Accessibility Labels

Always provide meaningful labels:

```tsx
<ExpiryBadge 
  accessibilityLabel={`Expires ${displayText.toLowerCase()}`}
/>
```

### Color Contrast

- Text on colored backgrounds must meet WCAG AA contrast ratios
- Expiry badge text colors are specifically chosen for contrast
- Avoid using color alone to convey meaning

---

## Theming

### Using the Theme Hook

```tsx
import { useTheme } from "@/hooks/useTheme";

function MyComponent() {
  const { theme, isDark } = useTheme();
  
  return (
    <View style={{ backgroundColor: theme.backgroundDefault }}>
      <Text style={{ color: theme.text }}>Themed text</Text>
    </View>
  );
}
```

### Theme Properties

Available on `theme` object:
- `text`, `textSecondary`, `textOnGlass`
- `backgroundRoot`, `backgroundDefault`, `backgroundSecondary`, `backgroundTertiary`
- `primary`, `secondary`, `accent`, `warning`, `success`, `error`
- `border`, `surface`
- `glass` (nested object with glass colors)

---

## Platform Considerations

### iOS

- Use native Liquid Glass when available (iOS 26+)
- Use system fonts for optimal rendering
- Respect safe area insets

### Android

- BlurView as fallback for glass effects
- Solid backgrounds for offline indicator
- Material-style elevation values

### Web

- CSS backdrop-filter for glass effects
- Web-specific font stack
- Box-shadow for elevation

---

## Best Practices

1. **Always use themed components** - Never hardcode colors
2. **Use spacing tokens** - Maintain consistent rhythm
3. **Animate with springs** - Prefer spring animations over linear
4. **Test both themes** - Verify in light and dark mode
5. **Check all platforms** - Test iOS, Android, and web
6. **Use semantic colors** - primary for actions, error for destructive
7. **Provide loading states** - Use button loading prop
8. **Add test IDs** - Include `testID` for automated testing
