# Accessibility — Grade: B+

## Summary

The app demonstrates a solid accessibility foundation with 741+ combined accessibilityLabel/accessibilityRole attributes, reduced motion support, font scaling via ThemedText, dedicated web keyboard navigation utilities, and proper modal isolation. Since the last review, significant improvements have been made: previously critical screens (GenerateRecipeScreen, AnalyticsScreen, ScanHubScreen, BarcodeScannerScreen) now have substantially more accessibility attributes, custom accessibility actions have been added to 4 components (SwipeableItemCard, ShoppingListScreen, AddFoodBatchScreen, MealPlanSlotCard), the ExpiryBadge now respects reduced motion, web screens now use ARIA landmark roles, and modal accessibility coverage has improved to 89 instances. Remaining gaps include image alt text coverage and some interactive elements still lacking labels.

---

## Sub-Category Scores

### 1. Screen Reader Labels & Roles — B

**What was measured:** Coverage of `accessibilityLabel`, `accessibilityRole`, `accessibilityHint`, and `accessibilityState` across all screens and components.

**Findings:**
- **385+ accessibilityLabel** and **356+ accessibilityRole** attributes across native screens/components
- **38+ accessibilityHint** instances providing context for complex interactions
- **21+ accessibilityState** usages on toggles, selectors, and expandable sections
- **[REMEDIATED] GenerateRecipeScreen**: Previously had 0 accessibility attributes; now has 16 accessibilityLabel/accessibilityRole attributes covering form inputs, cuisine selector, dietary preferences, generate button, and result cards.
- **[REMEDIATED] AnalyticsScreen, ScanHubScreen, BarcodeScannerScreen**: Previously had 2, 2, and 1 attribute respectively; now have 28 combined across these screens.

**Per-screen coverage improvements:**

| Screen | Previous | Current | Status |
|--------|----------|---------|--------|
| GenerateRecipeScreen | 0 | 16 | **[REMEDIATED]** |
| AnalyticsScreen | 2 | ~10 | **[REMEDIATED]** |
| ScanHubScreen | 2 | ~9 | **[REMEDIATED]** |
| BarcodeScannerScreen | 1 | ~9 | **[REMEDIATED]** |

**Remaining gap:** Some interactive elements across screens still lack labels. Coverage is improving but not yet at 100%.

---

### 2. Reduced Motion Support — A

**What was measured:** Whether decorative animations respect the system `prefers-reduced-motion` / `isReduceMotionEnabled` setting.

**Findings:**
- **AnimatedBackground.tsx:** Uses `useReducedMotion()`. When enabled, returns a static `LinearGradient`. Correctly implemented.
- **AccessibleSkeleton.tsx:** Uses `useReducedMotion()`. When enabled, renders static view. Correctly implemented.
- **SkeletonBox.tsx:** Uses `useReducedMotion()`. When enabled, skips animation. Correctly implemented.
- **[REMEDIATED] ExpiryBadge.tsx:** Now uses `useReducedMotion()` from `react-native-reanimated`. When reduced motion is enabled, the pulse animation is suppressed (`ExpiryBadge.tsx:10,103`). Previously ran indefinitely regardless of user preference.

---

### 3. Font Scaling — A

**What was measured:** Whether text supports dynamic type / font scaling.

**Findings:**
- **ThemedText.tsx** sets `allowFontScaling={true}` and `maxFontSizeMultiplier={1.5}` on all Text elements by default.
- Heading types (h1-h4) automatically get `accessibilityRole="header"` for proper semantic hierarchy.
- 51 instances of `minHeight` (instead of fixed height) found across screens/components, supporting text expansion.
- The 1.5x multiplier cap prevents layout breakage while supporting larger text needs.

**No gaps found in this sub-category.**

---

### 4. Live Regions & Dynamic Content Announcements — A-

**What was measured:** Usage of `accessibilityLiveRegion` for status changes, loading states, errors, and dynamic content.

**Findings:**
- **20+ accessibilityLiveRegion** instances across the app:
  - `"assertive"` used for: Auth errors, offline indicators, sync errors — correct priority
  - `"polite"` used for: Loading states, recipe generation progress, search results, nutrition summaries, chat messages, fun facts — correct priority
- Key coverage includes InventoryScreen, RecipesScreen, AddItemScreen, AuthScreen, GenerateRecipeScreen, SyncStatusIndicator, OfflineIndicator.

**Minor gap:** No `announceForAccessibility()` calls found for imperative announcements of transient actions (e.g., "Item added to cart").

---

### 5. Modal Accessibility & Focus Management — B

**What was measured:** Whether modals trap focus, are announced to screen readers, and return focus on dismiss.

**Findings:**
- **89 instances** of `accessibilityViewIsModal` and related modal accessibility attributes across the codebase — a significant improvement from the previous 11.
- **5 instances** of `accessibilityElementsHidden={true}` to hide decorative images from screen readers.
- **4 instances** of `importantForAccessibility="no-hide-descendants"` to hide decorative subtrees.

**Remaining Gaps:**
- No focus trapping or focus management in modals — only 2 `.focus()` calls found in the entire codebase (in search inputs, not in modals).
- No `onAccessibilityEscape` handler for VoiceOver's "Z" gesture dismiss.
- Some modal-like components may still lack `accessibilityViewIsModal`.

---

### 6. Image Accessibility — D+

**What was measured:** Whether images have accessibilityLabel / alt text or are properly hidden.

**Findings:**
- **25+ Image elements** found (excluding web/ directory).
- **5 images** have `accessibilityElementsHidden={true}` (correctly marked decorative: logos, avatars).
- **~20 images** lack any accessibility annotation — screen readers will either skip them or read the source URI.

**This remains the weakest accessibility sub-category.** Affected screens: SelectRecipeScreen, ReceiptScanScreen, CookwareScreen, FoodCameraScreen, RecipesScreen, ProfileScreen, GrocerySearchScreen, OnboardingScreen.

---

### 7. Web Platform Accessibility — A-

**What was measured:** Keyboard navigation, focus indicators, ARIA attributes on web-rendered screens.

**Findings:**
- **web-accessibility.ts** utility provides `tabIndex: 0`, Enter/Space key handlers, focus-visible styling.
- Used in **16 locations** across auth, subscription, landing page components.
- FAQItem includes `accessibilityState={{ expanded: isOpen }}` for accordion pattern.
- **[REMEDIATED] ARIA landmark roles**: Web screens (AboutScreen, PrivacyScreen, TermsScreen, SupportScreen) now use `role="banner"`, `role="navigation"`, `role="contentinfo"` with appropriate `accessibilityLabel` attributes, providing proper semantic structure for screen readers.

**Remaining Gaps:**
- No skip-navigation link on web pages.
- Focus indicator color (#4A90D9) is hardcoded — doesn't adapt to theme/dark mode.

---

### 8. Custom Accessibility Actions — B

**[REMEDIATED]** Previously graded D with only 1 component defining custom actions.

**What was measured:** Support for custom accessibility actions on complex gesture-based interactions.

**Findings:**
- **[REMEDIATED] 4 components** now define `accessibilityActions` with `onAccessibilityAction` handlers:
  1. **SwipeableItemCard** (`client/components/inventory/SwipeableItemCard.tsx:262-266`): "activate" action for swipe reveal.
  2. **ShoppingListScreen** (`client/screens/ShoppingListScreen.tsx:149-153`): Actions for item interaction.
  3. **AddFoodBatchScreen** (`client/screens/AddFoodBatchScreen.tsx:145-149`): Actions for batch item management.
  4. **MealPlanSlotCard** (`client/components/meal-plan/MealPlanSlotCard.tsx:69-74`): Actions for meal slot operations.

**Remaining Gaps:**
- No `onAccessibilityEscape` handlers for modal dismissal via VoiceOver Z-gesture.
- No `onMagicTap` handlers for primary actions (e.g., play/pause in voice controls).

---

## Consolidated Strengths

1. **Strong reduced motion support** — 4 animated components properly check `useReducedMotion()` and provide static fallbacks (up from 3).
2. **Comprehensive font scaling** — ThemedText enforces `allowFontScaling=true` with a 1.5x cap globally.
3. **Semantic text hierarchy** — ThemedText auto-assigns `accessibilityRole="header"` to h1-h4 types.
4. **Well-implemented live regions** — 20+ instances with correct assertive/polite priority.
5. **Expanded modal accessibility** — 89 instances of modal-related accessibility attributes.
6. **Web keyboard navigation** — Dedicated utility with Enter/Space handlers and visible focus indicators.
7. **ARIA landmarks on web** — Web screens use proper semantic roles (banner, navigation, contentinfo).
8. **Custom accessibility actions** — 4 components now provide VoiceOver/TalkBack alternatives to gesture interactions.

## Remediations Completed

| # | Remediation | Status |
|---|-------------|--------|
| 1 | Add accessibility labels to GenerateRecipeScreen | **Done** (16 attributes) |
| 2 | Improve labels on AnalyticsScreen, ScanHubScreen, BarcodeScannerScreen | **Done** (28 combined) |
| 3 | Respect useReducedMotion in ExpiryBadge | **Done** |
| 4 | Add custom accessibility actions for gesture interactions | **Done** (4 components) |
| 5 | Add ARIA landmark roles to web screens | **Done** (4 web screens) |
| 6 | Expand modal accessibility coverage | **Done** (89 instances) |

## Remaining Items

- **Image alt text** remains the weakest area — ~20 images lack accessibility annotation.
- **Focus management in modals** — no focus trapping, auto-focus on open, or focus restoration on dismiss.
- **No skip-navigation links** on web platform.
- **No `announceForAccessibility()`** calls for transient action confirmations.
- **Color contrast ratios** not verified against WCAG AA/AAA standards.
