# Hooks Reference

This directory contains 21 custom React hooks for the ChefSpAIce application. Below is each hook's purpose, key exports, and dependencies.

---

## Utility Hooks

### useDebounce
**File:** `useDebounce.ts`
**Purpose:** Returns a debounced version of a value that only updates after a specified delay. Used to throttle rapid user input (e.g., search fields, suggestion lookups).
**Exports:** `useDebounce<T>(value, delay) → T`
**Dependencies:** React (`useState`, `useEffect`)
**Used by:** `useShelfLifeSuggestion`

---

### useDeviceType
**File:** `useDeviceType.ts`
**Purpose:** Provides responsive breakpoint flags based on screen width (`isPhone`, `isTablet`, `isLargeTablet`), raw `screenWidth`, and `isLandscape` orientation detection derived from `useWindowDimensions`.
**Exports:** `useDeviceType() → { isPhone, isTablet, isLargeTablet, screenWidth, isLandscape }`
**Dependencies:** `react-native` (`useWindowDimensions`)

---

### useTheme
**File:** `useTheme.ts`
**Purpose:** Stable wrapper around `ThemeContext`. Re-exports theme values (`theme`, `isDark`, `colorScheme`, `themePreference`) and setter (`setThemePreference` / `setTheme`) from the context. Provides a consistent import path used across 50+ components.
**Exports:** `useTheme()`
**Dependencies:** `@/contexts/ThemeContext`

---

## Sync & Connectivity Hooks

### useSyncStatus
**File:** `useSyncStatus.ts`
**Purpose:** Exposes full sync engine state — online/offline status, pending changes count, failed items, queue usage — and actions for manual sync, queue clearing, and retry. Also re-exports `useOnlineStatus` for lightweight online-only checks.
**Exports:**
- `useSyncStatus()` — full sync state + actions (`fullSync`, `clearQueue`, `clearFailedItems`, `retryFailedItems`, `getFailedItemDetails`)
- `useOnlineStatus()` — returns `boolean` (convenience wrapper)
**Dependencies:** `@/lib/sync-manager`, `@/lib/offline-queue`

### usePaginatedSync
**File:** `usePaginatedSync.ts`
**Purpose:** Provides cursor-based paginated data fetching for synced sections using TanStack Query's `useInfiniteQuery`.
**Exports:**
- `useInventorySync(limit?, enabled?)`
- `useRecipesSync(limit?, enabled?)`
- `useShoppingSync(limit?, enabled?)`
- Interfaces: `InventoryItem`, `RecipeItem`, `ShoppingItem`
**Dependencies:** `@tanstack/react-query`, `@react-native-async-storage/async-storage`, `@/lib/query-client`

---

## Subscription & Payment Hooks

### useSubscription
**File:** `useSubscription.tsx`
**Purpose:** Central subscription context provider and consumer hook. Manages tier, status, entitlements, usage limits, trial state, payment failure state, plan selection, StoreKit integration, and subscription management (portal/customer center). Renders `TrialEndedModal` when trial expires.
**Exports:**
- `useSubscription()` — context consumer returning `SubscriptionContextValue`
- `SubscriptionProvider` — context provider (wraps app)
- Types: `SubscriptionData`, `LimitCheckResult`, `SubscriptionContextValue`
**Key methods:** `checkLimit`, `checkFeature`, `refetch`, `handleManageSubscription`
**Dependencies:** `@/contexts/AuthContext`, `@/hooks/useStoreKit`, `@/lib/query-client`, `@/lib/crash-reporter`, `@shared/subscription`, `@/components/TrialEndedModal`

### useStoreKit
**File:** `useStoreKit.ts`
**Purpose:** Wraps RevenueCat/StoreKit for Apple/Google in-app purchases. Handles initialization, offerings, purchase flow, restore, paywall presentation, and customer center.
**Exports:** `useStoreKit() → UseStoreKitReturn`
**Dependencies:** `react-native-purchases`, `@/lib/storekit-service`, `@/contexts/AuthContext`

---

## Voice & Audio Hooks

### useTextToSpeech
**File:** `useTextToSpeech.ts`
**Purpose:** Text-to-speech engine using `expo-speech`. Supports immediate speak, queued speech, pause/resume (iOS only), rate/pitch control, and available voice listing.
**Exports:** `useTextToSpeech(options?) → { speak, speakNow, queueText, queueMultiple, stop, pause, resume, clearQueue, ... }`
**Dependencies:** `expo-speech`, `react-native` (`Platform`)

### useVoiceInput
**File:** `useVoiceInput.ts`
**Purpose:** Cross-platform voice-to-text. Uses Web Speech API on web browsers and native audio recording + server-side transcription (`/api/voice/transcribe`) on iOS/Android.
**Exports:** `useVoiceInput(options?) → { startListening, stopListening, cancelListening, transcript, isListening, isProcessing, ... }`
**Dependencies:** `expo-audio`, `react-native` (`Platform`), `@/lib/query-client`

### useAIVoice
**File:** `useAIVoice.ts`
**Purpose:** Plays AI-generated audio responses using `expo-audio`. Handles loading, playback state, pause/resume for streamed audio URLs.
**Exports:** `useAIVoice(options?) → { play, stop, pause, resume, isSpeaking, isLoading, error }`
**Dependencies:** `expo-audio`

### useVoiceChat
**File:** `useVoiceChat.ts`
**Purpose:** Full voice conversation loop — records user audio, sends to `/api/voice/chat`, plays back AI audio response. Maintains message history. Composes `useAIVoice` and `expo-audio`.
**Exports:** `useVoiceChat(options?) → { startConversation, endConversation, cancelConversation, messages, isListening, isSpeaking, ... }`
**Dependencies:** `useAIVoice`, `expo-audio`, `@/lib/query-client`

### useRecipeVoiceNavigation
**File:** `useRecipeVoiceNavigation.ts`
**Purpose:** Hands-free recipe step navigation via voice commands. Reads recipe instructions aloud, listens for commands ("next", "back", "repeat", "go to step N"), adjustable speech rate, hands-free mode. Composes `useTextToSpeech` and `useVoiceInput`.
**Exports:** `useRecipeVoiceNavigation(options) → { nextStep, previousStep, goToStep, readRecipe, readIngredients, toggleHandsFreeMode, ... }`
**Dependencies:** `useTextToSpeech`, `useVoiceInput`, `expo-haptics`, `@/lib/voice-commands`, `@/lib/storage`

---

## AI & Suggestion Hooks

### useShelfLifeSuggestion
**File:** `useShelfLifeSuggestion.ts`
**Purpose:** Suggests expiration dates for food items. First checks a local shelf-life database; falls back to AI-powered suggestions via `/api/suggestions/shelf-life` when local data has low confidence.
**Exports:** `useShelfLifeSuggestion({ category, storageLocation, foodName }) → { suggestion, isLoading, isFromAI }`
**Dependencies:** `useDebounce`, `@tanstack/react-query`, `date-fns`, `@/lib/shelf-life-data`, `@/lib/query-client`

### useStorageSuggestion
**File:** `useStorageSuggestion.ts`
**Purpose:** Suggests optimal storage locations (fridge, pantry, freezer, counter) for food items. Uses a local recommendation database, category aliases, partial matching, and user preference learning.
**Exports:**
- `useStorageSuggestion(category, itemName?) → StorageSuggestionResult | null`
- `useStorageRecorder() → { recordChoice }` — records user's actual storage choice to learn preferences
**Dependencies:** `@/lib/shelf-life-data`, `@/lib/user-storage-preferences`

### useQuickRecipeGeneration
**File:** `useQuickRecipeGeneration.ts`
**Purpose:** Generates a quick AI recipe from current inventory, prioritizing expiring items. Handles subscription limit checks, recipe generation API call, image generation, local storage save, and navigation to the result.
**Exports:** `useQuickRecipeGeneration() → { generateQuickRecipe, isGenerating, progressStage, showUpgradePrompt, dismissUpgradePrompt, ... }`
**Dependencies:** `useSubscription`, `@react-navigation/native`, `@/lib/storage`, `@/lib/query-client`, `@/lib/analytics`, `@/lib/recipe-image`

---

## Feature Hooks

### useBiometricAuth
**File:** `useBiometricAuth.ts`
**Purpose:** Manages biometric authentication (Face ID, Fingerprint, Iris). Checks hardware availability, handles enrollment, persists user preference in AsyncStorage, and provides authenticate/enable/disable actions.
**Exports:**
- `useBiometricAuth() → { isAvailable, isEnrolled, biometricType, isEnabled, authenticate, setEnabled, ... }`
- `isBiometricEnabled() → Promise<boolean>`
- `clearBiometricPreference() → Promise<void>`
- `authenticateBiometric(promptMessage?) → Promise<boolean>`
**Dependencies:** `expo-local-authentication`, `@react-native-async-storage/async-storage`

### useExpirationNotifications
**File:** `useExpirationNotifications.ts`
**Purpose:** Initializes the notification system at app startup and listens for tapped expiration-alert notifications.
**Exports:** `useExpirationNotifications()` (side-effect hook, no return value)
**Dependencies:** `@/lib/notifications`

### useInstacart
**File:** `useInstacart.ts`
**Purpose:** Integrates with Instacart for grocery ordering. Checks configuration status, creates shopping list and recipe links via API, and opens them in the browser/app.
**Exports:** `useInstacart() → { isConfigured, isLoading, createShoppingLink, createRecipeLink, openShoppingLink, openRecipeLink, ... }`
**Dependencies:** `react-native` (`Linking`, `Alert`), `@/lib/query-client`, `@/lib/storage`

### useInventoryExport
**File:** `useInventoryExport.ts`
**Purpose:** Loads inventory items and provides an export action that prompts the user to choose CSV or PDF format.
**Exports:** `useInventoryExport() → { handleExport, exporting, items }`
**Dependencies:** `@/lib/storage`, `@/lib/export`, `react-native` (`Alert`)

### useScreenOptions
**File:** `useScreenOptions.ts`
**Purpose:** Returns React Navigation `NativeStackNavigationOptions` configured for the app's visual style (transparent headers, blur effects, gesture navigation, Liquid Glass support).
**Exports:** `useScreenOptions({ transparent? }) → NativeStackNavigationOptions`
**Dependencies:** `useTheme`, `react-native` (`Platform`), `@react-navigation/native-stack`, `@/components/GlassViewWithContext`

---

## Hook Dependency Graph

```
useTheme ← ThemeContext
useScreenOptions ← useTheme

useDebounce
useShelfLifeSuggestion ← useDebounce

useSyncStatus ← sync-manager, offline-queue
  └── useOnlineStatus (re-export)

useStoreKit ← storekit-service, AuthContext
useSubscription ← useStoreKit, AuthContext
  ├── useQuickRecipeGeneration ← useSubscription
  └── (handleManageSubscription merged in)

useTextToSpeech ← expo-speech
useVoiceInput ← expo-audio
useAIVoice ← expo-audio

useVoiceChat ← useAIVoice + expo-audio
useRecipeVoiceNavigation ← useTextToSpeech + useVoiceInput
```

## Merge History

- **useOnlineStatus** merged into `useSyncStatus.ts` (re-exported). Both subscribed to `syncManager`; `useOnlineStatus` was a strict subset.
- **useManageSubscription** merged into `useSubscription.tsx`. Both depended on `useAuth`, `useStoreKit`, and subscription API calls. `handleManageSubscription` and `isManaging` are now part of the subscription context.
