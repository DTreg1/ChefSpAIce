# Accessibility — Grade: B

## Summary

The app demonstrates a solid foundation for accessibility with 741 combined accessibilityLabel/accessibilityRole attributes across native components, reduced motion support in 3 animated components, font scaling via ThemedText, and dedicated web keyboard navigation utilities. However, significant gaps remain: 42% of interactive elements lack accessibility labels, GenerateRecipeScreen (a core user flow) has zero accessibility attributes, most images lack alt text, no color contrast verification exists, and focus management in modals is minimal.

---

## Sub-Category Scores

### 1. Screen Reader Labels & Roles — B-

**What was measured:** Coverage of `accessibilityLabel`, `accessibilityRole`, `accessibilityHint`, and `accessibilityState` across all screens and components.

**Findings:**
- **385 accessibilityLabel** and **356 accessibilityRole** attributes across native screens/components (741 total label+role attributes)
- **38 accessibilityHint** instances providing context for complex interactions (e.g., swipe actions, drag-and-drop, voice input)
- **21 accessibilityState** usages on toggles, selectors, and expandable sections (e.g., `{selected}`, `{expanded}`, `{disabled}`)
- Only **1 custom accessibilityAction** (SwipeableItemCard "activate" action) — swipe gestures elsewhere are not accessible
- **665 total interactive elements** (Pressable/TouchableOpacity/TouchableHighlight) detected — only ~58% have accessibilityLabel

**Per-screen coverage (accessibilityLabel + accessibilityRole count):**

| Screen | Count | Assessment |
|--------|-------|------------|
| AddItemScreen | 27 | Good |
| ProfileScreen | 24 | Good |
| OnboardingScreen | 22 | Good |
| RecipesScreen | 22 | Good |
| ShoppingListScreen | 18 | Adequate |
| AuthScreen | 18 | Adequate |
| FoodCameraScreen | 16 | Adequate |
| ItemDetailScreen | 14 | Adequate |
| MealPlanScreen | 13 | Fair |
| ReceiptScanScreen | 11 | Fair |
| CookwareScreen | 9 | Fair |
| InventoryScreen | 8 | Low |
| SettingsScreen | 8 | Low |
| GrocerySearchScreen | 8 | Low |
| CookingTermsScreen | 7 | Low |
| StorageLocationsScreen | 6 | Low |
| SubscriptionScreen | 4 | Very Low |
| RecipeDetailScreen | 4 | Very Low |
| SelectRecipeScreen | 3 | Very Low |
| AnalyticsScreen | 2 | Critical |
| ScanHubScreen | 2 | Critical |
| BarcodeScannerScreen | 1 | Critical |
| **GenerateRecipeScreen** | **0** | **None** |

**Critical gap:** GenerateRecipeScreen is a core user flow (AI recipe generation) and has zero accessibility labels or roles. AnalyticsScreen, ScanHubScreen, and BarcodeScannerScreen are also severely under-labeled.

**Sub-component coverage:**
- inventory/ + recipe-detail/ + meal-plan/ + settings/ + subscription/ components: 136 attributes (good)
- Shared components (ChatModal, DrawerContent, AddMenu, etc.): 66 attributes (good)
- Landing components: 29 attributes (adequate)

---

### 2. Reduced Motion Support — A-

**What was measured:** Whether decorative animations respect the system `prefers-reduced-motion` / `isReduceMotionEnabled` setting.

**Findings:**
- **AnimatedBackground.tsx:** Uses `useReducedMotion()` from react-native-reanimated. When enabled, returns a static `LinearGradient` instead of animated bubbles/particles. Correctly implemented.
- **AccessibleSkeleton.tsx:** Uses `useReducedMotion()`. When enabled, renders a static `View` with appropriate opacity instead of animated shimmer. Correctly implemented.
- **SkeletonBox.tsx:** Uses `useReducedMotion()`. When enabled, skips `withRepeat/withTiming` animation and renders a static view. Correctly implemented.

**Gap:** Other animated elements (screen transitions, list item animations via FlatList, any Moti-based micro-animations in other components) were not audited. If other decorative animations exist outside these 3 components, they may not respect reduced motion.

---

### 3. Font Scaling — A

**What was measured:** Whether text supports dynamic type / font scaling and whether layouts handle enlarged text gracefully.

**Findings:**
- **ThemedText.tsx** sets `allowFontScaling={true}` and `maxFontSizeMultiplier={1.5}` on all Text elements by default
- Heading types (h1-h4) automatically get `accessibilityRole="header"` for proper semantic hierarchy
- 51 instances of `minHeight` (instead of fixed height) found across screens/components, supporting text expansion
- The 1.5x multiplier cap is a reasonable design choice to prevent layout breakage while still supporting users who need larger text

**No gaps found in this sub-category.**

---

### 4. Live Regions & Dynamic Content Announcements — A-

**What was measured:** Usage of `accessibilityLiveRegion` for status changes, loading states, errors, and dynamic content updates.

**Findings:**
- **20 accessibilityLiveRegion** instances across the app:
  - `"assertive"` used for: Auth errors, offline indicators, sync errors — correct priority
  - `"polite"` used for: Loading states, recipe generation progress, search results, nutrition summaries, chat messages, fun facts — correct priority
- Key coverage:
  - InventoryScreen: loading + empty state (polite)
  - RecipesScreen: loading + empty + filter results (polite)
  - AddItemScreen: form validation + barcode results (polite)
  - AuthScreen: error messages (assertive)
  - GenerateRecipeScreen: progress expiring note (polite) — only 1 attribute on this screen
  - SyncStatusIndicator: dynamic assertive/polite based on error state
  - OfflineIndicator: assertive (correct for connectivity loss)

**Minor gap:** No `announceForAccessibility()` calls found for imperative announcements (e.g., "Item added to cart", "Recipe saved"). Some transient user actions may go unannounced.

---

### 5. Modal Accessibility & Focus Management — B-

**What was measured:** Whether modals trap focus, are announced to screen readers, and return focus on dismiss.

**Findings:**
- **11 modals** with `accessibilityViewIsModal={true}`:
  - AddItemScreen (date picker), AddFoodBatchScreen, IngredientSwapModal, RecipeSettingsModal, TrialExpiringModal, CancellationFlowModal, NutritionCorrectionModal, TrialEndedModal, ChatModal, AddMenu, HeaderMenu
- **5 instances** of `accessibilityElementsHidden={true}` to hide decorative images from screen readers (ChatModal avatar, logo images)
- **4 instances** of `importantForAccessibility="no-hide-descendants"` to hide decorative subtrees

**Gaps:**
- **No focus trapping or focus management** in any modal — only 2 `.focus()` calls found in the entire codebase (both in ExpoGlassHeader search input, not in modals)
- **MealPlanActionSheet, SettingsImportDialog, SettingsAccountData, TermTooltip, NutritionSection, ErrorFallback** — these modal-like components do NOT have `accessibilityViewIsModal`
- No `onAccessibilityEscape` handler found on any modal for VoiceOver's "Z" gesture dismiss

---

### 6. Image Accessibility — D+

**What was measured:** Whether images have accessibilityLabel / alt text or are properly hidden from screen readers if decorative.

**Findings:**
- **25 total Image elements** found (excluding web/ directory)
- **5 images** have `accessibilityElementsHidden={true}` (correctly marked decorative: logos, avatars)
- **0 images** have `accessibilityLabel` outside of web screens
- **~20 images** lack any accessibility annotation — screen readers will either skip them silently or read the source URI

**Affected screens:** SelectRecipeScreen, ReceiptScanScreen, CookwareScreen, FoodCameraScreen, RecipesScreen, ProfileScreen, GrocerySearchScreen, OnboardingScreen, AuthScreen (Google logo), RecipeHero, SettingsInstacart, NutritionCorrectionModal, ChatModal, ImageAnalysisResult

---

### 7. Web Platform Accessibility — B+

**What was measured:** Keyboard navigation, focus indicators, ARIA attributes on web-rendered screens.

**Findings:**
- **web-accessibility.ts** utility provides:
  - `tabIndex: 0` for keyboard focusability
  - Enter/Space key handlers for interactive elements
  - `:focus-visible` outline styling (2px solid #4A90D9, 2px offset)
  - `:focus:not(:focus-visible)` suppression for mouse users
- Used in **16 locations** across: AuthScreen, SubscriptionScreen, HeroSection, FAQItem, DonationSection, FooterSection, DownloadBanner, PricingSection, PricingCard, SubscriptionLegalLinks, PlanToggle
- FAQItem includes `accessibilityState={{ expanded: isOpen }}` for accordion pattern

**Gaps:**
- Web screens (About, Privacy, Terms, Support, Attributions) have **0 ARIA role/aria-* attributes** despite being content-heavy pages
- No skip-navigation link on any web page
- Focus indicator color (#4A90D9) is hardcoded — doesn't adapt to theme/dark mode
- `webAccessibilityProps` not applied to all interactive web elements (e.g., web-rendered modals)

---

### 8. Custom Accessibility Actions — D

**What was measured:** Support for custom accessibility actions on complex gesture-based interactions.

**Findings:**
- **Only 1 component** (SwipeableItemCard) defines `accessibilityActions` with an "activate" action and `onAccessibilityAction` handler
- **No `onAccessibilityEscape`** handlers for modal dismissal via VoiceOver Z-gesture
- **No `onMagicTap`** handlers for primary actions (e.g., play/pause in voice controls)
- Swipe gestures on other components (shopping list items, meal plan cards) have **no accessible alternative actions**
- Drag-and-drop in MealPlanScreen has `accessibilityHint` text but no actual accessible action alternative

---

## Consolidated Strengths

1. **Strong reduced motion support** — 3 animated components properly check `useReducedMotion()` and provide static fallbacks
2. **Comprehensive font scaling** — ThemedText enforces `allowFontScaling=true` with a 1.5x cap globally; `minHeight` used in 51 places
3. **Semantic text hierarchy** — ThemedText auto-assigns `accessibilityRole="header"` to h1-h4 types
4. **Well-implemented live regions** — 20 instances with correct assertive/polite priority based on urgency
5. **Modal screen reader isolation** — 11 modals use `accessibilityViewIsModal`; decorative images properly hidden
6. **Web keyboard navigation** — Dedicated utility with Enter/Space handlers and visible focus indicators
7. **Accessibility state tracking** — 21 instances of `accessibilityState` on toggles, selectors, and expandable sections
8. **Contextual hints** — 38 `accessibilityHint` entries on complex interactions (swipe, drag, voice input)

## Consolidated Weaknesses

1. **42% of interactive elements lack accessibility labels** — 385 labels across 665 interactive elements
2. **GenerateRecipeScreen has zero accessibility attributes** — a core user flow is completely inaccessible to screen readers
3. **80% of images lack alt text** — 20 out of 25 images have no `accessibilityLabel` or decorative marker
4. **No focus management in modals** — zero focus trapping, no auto-focus on modal open, no focus restoration on dismiss
5. **No color contrast verification** — no WCAG AA/AAA contrast ratios documented or enforced
6. **Only 1 custom accessibility action** — swipe/drag gestures on other components have no accessible alternatives
7. **No skip-navigation links** on web platform
8. **No `announceForAccessibility()` calls** for transient action confirmations
9. **6 modal-like components missing `accessibilityViewIsModal`** — MealPlanActionSheet, SettingsImportDialog, SettingsAccountData, TermTooltip, NutritionSection, ErrorFallback

---

## Remediation Steps

**Step 1 — Add accessibility labels to GenerateRecipeScreen and under-labeled screens**
```
Priority screens with critical gaps: GenerateRecipeScreen (0 attributes), AnalyticsScreen (2), ScanHubScreen (2), BarcodeScannerScreen (1). Add accessibilityLabel and accessibilityRole to every Pressable/TouchableOpacity. For GenerateRecipeScreen, label all form inputs (cuisine selector, dietary preferences, ingredient list), the generate button, progress indicators, and result cards. Also improve InventoryScreen (8), SettingsScreen (8), and SubscriptionScreen (4).
```

**Step 2 — Add alt text to all meaningful images**
```
Audit all 25 Image elements. For content images (recipe photos, product images, scan results), add descriptive accessibilityLabel (e.g., "Recipe photo for Pasta Carbonara"). For decorative images not already hidden, add accessibilityElementsHidden={true} and importantForAccessibility="no-hide-descendants". Priority: RecipeHero, RecipesScreen recipe thumbnails, GrocerySearchScreen product images, OnboardingScreen illustrations.
```

**Step 3 — Implement focus management in modals**
```
For all 11 modals with accessibilityViewIsModal, add: (1) autoFocus on the first interactive element or modal title on open, (2) focus trap to prevent tabbing outside the modal, (3) focus restoration to the triggering element on dismiss, (4) onAccessibilityEscape handler for VoiceOver Z-gesture dismiss. Use a shared useFocusTrap hook. Also add accessibilityViewIsModal to the 6 missing modal components.
```

**Step 4 — Add custom accessibility actions for gesture-based interactions**
```
Extend the SwipeableItemCard pattern to other swipeable/draggable components. Add accessibilityActions for: ShoppingListScreen items (mark complete, delete), MealPlanSlotCard (remove meal, swap recipe), any other swipe-to-reveal action patterns. Add onMagicTap to RecipeVoiceControls for play/pause. Add onAccessibilityEscape to all modals.
```

**Step 5 — Verify and document color contrast ratios**
```
Audit all theme color pairs (text/background, icon/background, placeholder/background) against WCAG AA minimum ratios (4.5:1 for normal text, 3:1 for large text and UI components). Document results per theme (light and dark). Fix any failing pairs. Tools: use react-native-accessibility-engine or manual contrast checker against AppColors/theme constants.
```

**Step 6 — Add skip-navigation and improve web ARIA**
```
Add a skip-to-main-content link at the top of web pages. Add appropriate ARIA landmark roles (banner, navigation, main, contentinfo) to web screen layouts. Add aria-label to web navigation elements. Ensure focus indicator color adapts to dark mode.
```
