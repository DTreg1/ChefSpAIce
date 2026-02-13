# Accessibility — Grade: B

## Strengths
- 701 accessibilityLabel/accessibilityRole attributes across native screens
- Font scaling support with `maxFontSizeMultiplier={1.5}` on ThemedText
- All text containers use minHeight instead of fixed height for font scaling
- Web screens (About, Privacy, Terms, Support, Attributions) have full accessibility roles and labels
- Tab bar uses appropriate font scaling limits
- `AccessibleSkeleton.tsx` component for screen reader-friendly loading states
- `web-accessibility.ts` utility for web-specific ARIA attributes

## Weaknesses
- Native screens (non-web) have significantly fewer accessibility labels than web screens
- No accessibilityHint usage found for complex interactive elements
- Color contrast ratios not verified against WCAG AA standards
- No screen reader testing documentation
- No reduced motion support (animated backgrounds play regardless of system preference)
- No focus management documented for modal screens (ChatModal, IngredientSwapModal, etc.)

## Remediation Steps

**Step 1 — Add accessibility labels to all interactive native elements**
```
Audit all Pressable, TouchableOpacity, and Button components in client/screens/ and client/components/ (excluding web/ directory). Ensure every interactive element has an accessibilityLabel and accessibilityRole. Prioritize: InventoryScreen (add/edit/delete items), RecipesScreen (generate/view/save), ShoppingListScreen (add/check/remove), and AuthScreen (login/register forms). Target matching the 701 existing labels with at least 200 more on native-only components.
```

**Step 2 — Respect reduced motion system preference**
```
In client/components/AnimatedBackground.tsx, check AccessibilityInfo.isReduceMotionEnabled (or use the useReduceMotion hook from react-native-reanimated). When reduce motion is enabled, disable animated gradients and particle effects, showing a static gradient background instead. Apply the same check to any Moti or Reanimated animations that are purely decorative.
```
