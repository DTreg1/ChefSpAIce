# Bundle Analysis Report

**Date:** 2026-02-13
**Tool:** source-map-explorer via Expo web export with source maps
**Total minified JS:** 2.12 MB (2,172 KB across 8 chunks)

## Bundle Composition

| Chunk | Minified Size | Description |
|-------|---------------|-------------|
| index.js | 1,500 KB | Main app bundle (screens, navigation, logic) |
| \_\_common.js | 491 KB | Shared across all routes (icons, fonts) |
| LandingScreen.js | 186 KB | Landing page (QR code, SVG, gradients) |
| PrivacyScreen.js | 14 KB | Privacy policy |
| TermsScreen.js | 12 KB | Terms of service |
| AboutScreen.js | 8.5 KB | About page |
| SupportScreen.js | 6.4 KB | Support page |
| \_\_expo-metro-runtime.js | 3.9 KB | Metro runtime bootstrap |

## Top 10 Largest Dependencies (all chunks combined)

| # | Package | Source Size | Notes |
|---|---------|-------------|-------|
| 1 | @sentry/core | 1,579 KB | Largest single dependency |
| 2 | @expo/vector-icons | 561 KB | Icon font metadata/glyphs |
| 3 | react-dom | 512 KB | React web renderer (required) |
| 4 | react-native-web | 343 KB | RN web compatibility layer (required) |
| 5 | @sentry-internal/replay | 299 KB | Session replay recording |
| 6 | @sentry/browser | 214 KB | Browser-specific Sentry SDK |
| 7 | @sentry-internal/browser-utils | 135 KB | Sentry browser utilities |
| 8 | react-native-svg | 113 KB | SVG support (used by QR codes) |
| 9 | @sentry/react | 104 KB | React integration for Sentry |
| 10 | @tanstack/query-core | 95 KB | TanStack Query core |

**Total Sentry footprint: 2,439 KB (source) — ~67% of the main bundle's source size**

## Server-Only Code Leak Check

**Result: CLEAN** — No server-only code or packages found in client bundles.

Verified absence of: sharp, drizzle-orm, pg, express, expo-server-sdk, stripe, openai, ioredis, @neondatabase/serverless, bcrypt, jsonwebtoken.

## Tree-Shaking Opportunities

### 1. Sentry (~2,439 KB source → estimated ~800 KB minified)
The Sentry SDK is by far the largest dependency. Key sub-packages:
- `@sentry-internal/replay` (299 KB) — Session replay. If session replay is not needed, disable it via Sentry config to drop this entirely.
- `@sentry-internal/feedback` (76 KB) — User feedback widget. Can be removed if not used.
- `@sentry-internal/replay-canvas` (32 KB) — Canvas replay. Can be removed if not needed.

**Recommendation:** In `Sentry.init()`, set `replaysSessionSampleRate: 0` and `replaysOnErrorSampleRate: 0` if session replay is not critical. This should allow the bundler to drop `@sentry-internal/replay`, `@sentry-internal/replay-canvas`, and `@sentry-internal/feedback` (~407 KB source savings).

### 2. @expo/vector-icons (561 KB)
This package includes metadata for all icon families (MaterialIcons, FontAwesome, Ionicons, etc.) even though the app only uses a subset. The app primarily uses `Feather` and `@mdi/js`.

**Recommendation:** Consider importing only the specific icon sets used (e.g., `@expo/vector-icons/Feather`) rather than the entire package. However, Metro's tree-shaking for this package is limited — this is a known Expo issue.

### 3. react-native-svg (113 KB) — in LandingScreen only
Only loaded in the LandingScreen chunk (for QR code rendering). Already properly code-split, so no action needed.

### 4. date-fns — NOT in bundle
date-fns was not found in any client bundle. No tree-shaking action needed.

### 5. openai — NOT in bundle
The OpenAI SDK is correctly isolated to the server. No client-side leak.

### 6. sharp — NOT in bundle
sharp is a native Node.js module used only on the server. No client-side leak.

## Summary

The bundle is well-structured with proper code-splitting (lazy-loaded screens). No server-only code leaks were found. The primary optimization opportunity is **Sentry** — it accounts for ~67% of main bundle source size. Disabling unused Sentry features (session replay, feedback, canvas replay) could reduce the main bundle by an estimated 15-20%.
