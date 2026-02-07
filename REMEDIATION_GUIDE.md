# ChefSpAIce Remediation Guide

> Step-by-step instructions for fixing each issue identified in the Scorecard.
> Organized by category, priority, and estimated effort.
> Each fix is inside a single copyable code block so you can paste it as a prompt.

---

## Priority Legend

| Level | Meaning |
|-------|---------|
| P0 | Fix immediately - security risk or data loss |
| P1 | Fix soon - significantly impacts user experience |
| P2 | Fix next sprint - improves quality |
| P3 | Backlog - nice to have |

---

## 1. UI/UX Design

### [UX-1] Add Loading Skeleton Screens (P2)

**Problem**: Screens show a generic spinner while data loads, causing layout shift.

```
Create a reusable SkeletonBox component in client/components/SkeletonBox.tsx:

import { View } from "react-native";
import Animated, { useAnimatedStyle, withRepeat, withTiming, useSharedValue } from "react-native-reanimated";
import { useEffect } from "react";
import { useAppTheme } from "@/hooks/useTheme";

interface SkeletonBoxProps {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: any;
}

export function SkeletonBox({ width, height, borderRadius = 8, style }: SkeletonBoxProps) {
  const { theme } = useAppTheme();
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.7, { duration: 800 }), -1, true);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        { width, height, borderRadius, backgroundColor: theme.glass.border },
        animatedStyle,
        style,
      ]}
    />
  );
}

Then create screen-specific skeleton layouts for the three most-visited screens:
- client/components/inventory/InventorySkeleton.tsx - Mimics the layout of inventory item cards
- client/components/recipes/RecipesSkeleton.tsx - Mimics the recipe card grid
- client/components/shopping/ShoppingListSkeleton.tsx - Mimics shopping list items

In each screen, replace the generic <ActivityIndicator> or <CookPotLoader> with the skeleton component when isLoading is true:

if (isLoading) return <InventorySkeleton />;
```

---

### [UX-2] Add Swipe Hint to Item Cards (P3)

**Problem**: Swipeable actions are not discoverable.

```
In client/lib/storage.ts, add a flag to track whether the user has seen the swipe hint:

const SWIPE_HINT_KEY = "@chefspaice_swipe_hint_shown";

export async function hasSeenSwipeHint(): Promise<boolean> {
  const val = await AsyncStorage.getItem(SWIPE_HINT_KEY);
  return val === "true";
}

export async function markSwipeHintSeen(): Promise<void> {
  await AsyncStorage.setItem(SWIPE_HINT_KEY, "true");
}

In client/screens/InventoryScreen.tsx, check the flag on mount. If the user has not seen
the hint, briefly animate the first item card to show the swipe gesture, then mark it as seen.

The hint animation: translate the first SwipeableItemCard 60px to the left over 500ms,
hold for 700ms, then translate back. This visually reveals the swipe actions behind the card.
```

---

### [UX-3] Conditionally Render AnimatedBackground (P2)

**Problem**: Background animation runs on every screen, potentially distracting and consuming GPU.

```
In client/components/AnimatedBackground.tsx, add a prop "enabled" defaulting to true:

interface AnimatedBackgroundProps {
  enabled?: boolean;
}

When enabled is false, return a plain View with the gradient background color but no animated bubbles.

In client/App.tsx, pass enabled={false} on content-heavy screens (inventory detail, recipe detail,
chat). Keep it enabled on landing, auth, onboarding, and settings.

Alternative approach: Use React Navigation's screen focus state to pause animations when the
screen is not focused:

const isFocused = useIsFocused();
// Only run animation loops when focused
```

---

### [UX-4] Standardize Empty States (P3)

**Problem**: Some screens use raw text instead of the `EmptyState` component.

```
Search for screens that render plain text when data is empty:

grep -rn "No .* found\|No .* yet\|empty" client/screens/ --include="*.tsx"

Replace each instance with the existing EmptyState component from
client/components/EmptyState.tsx, providing an appropriate icon, title, and description.

Ensure each EmptyState includes a call-to-action button where applicable
(e.g., "Add your first item" on the inventory empty state).
```

---

## 2. Core Features

### [CF-1] Add "Recently Deleted" Access from Inventory Screen (P2)

**Problem**: Recovery for deleted items is buried in Settings.

```
In client/screens/InventoryScreen.tsx, add a small banner or link below the inventory list
when there are recently deleted items:

{recentlyDeletedCount > 0 && (
  <Pressable onPress={() => navigation.navigate("Settings", { scrollTo: "recentlyDeleted" })}>
    <ThemedText type="caption" style={{ color: AppColors.primary }}>
      {recentlyDeletedCount} recently deleted items - Tap to recover
    </ThemedText>
  </Pressable>
)}

To get the count, read soft-deleted items from AsyncStorage in the inventory screen's data
fetch or create a dedicated hook useRecentlyDeletedCount.

In SettingsScreen.tsx, accept a scrollTo route param and auto-scroll to the "Recently Deleted"
section when provided.
```

---

### [CF-2] Add Recipe Search and Filtering (P2)

**Problem**: No way to search through saved recipes.

```
In client/screens/RecipesScreen.tsx, add a search bar at the top of the screen (similar to
how InventoryScreen has search/filter):

const [searchQuery, setSearchQuery] = useState("");
const filteredRecipes = useMemo(() => {
  if (!searchQuery.trim()) return recipes;
  const q = searchQuery.toLowerCase();
  return recipes.filter(r =>
    r.name.toLowerCase().includes(q) ||
    r.ingredients?.some(i => i.toLowerCase().includes(q)) ||
    r.cuisineType?.toLowerCase().includes(q)
  );
}, [recipes, searchQuery]);

Add filter chips below the search bar for cuisine type and dietary restrictions.

Use filteredRecipes as the data source for the FlatList.
```

---

### [CF-3] Add Drag-and-Drop to Meal Plan (P3)

**Problem**: Meal plan slot assignment uses action sheets only.

```
Install react-native-draggable-flatlist (or use the existing gesture handler):

npx expo install react-native-draggable-flatlist

In client/screens/MealPlanScreen.tsx, wrap each recipe card in a draggable container.

Define drop zones for each meal slot (breakfast, lunch, dinner, snack).

On drop, call the existing assignRecipeToSlot function with the target slot.

Keep the existing action sheet as a fallback for accessibility.
```

---

## 3. Performance

### [PF-1] Optimize requireSubscription Middleware (P1)

**Problem**: Two database queries per protected request.

```
Open server/middleware/requireSubscription.ts.

Combine the two queries into a single join query:

const result = await db
  .select({
    subscriptionStatus: subscriptions.status,
    subscriptionPaymentFailedAt: subscriptions.paymentFailedAt,
    subscriptionUpdatedAt: subscriptions.updatedAt,
    userTier: users.subscriptionTier,
  })
  .from(users)
  .leftJoin(subscriptions, eq(subscriptions.userId, users.id))
  .where(eq(users.id, userId))
  .limit(1);

Use the single result to determine both subscription status and user tier in one roundtrip.

This cuts the database load in half for every protected API request.
```

---

### [PF-2] Verify Database Connection Pooling (P2)

**Problem**: Connection pooling configuration not explicit.

```
Open server/db.ts (or wherever Drizzle is initialized).

Verify that the PostgreSQL client is using a pool (e.g., Pool from pg or
@neondatabase/serverless), not a single Client:

import { Pool } from "pg";
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

If using @neondatabase/serverless, pooling is handled automatically, but verify the
max connections setting.
```

---

### [PF-3] Optimize AnimatedBackground Bubble Count (P2)

**Problem**: Too many animated nodes on low-end devices.

```
In client/components/AnimatedBackground.tsx, reduce the default bubbleCount on lower-end devices:

import { PixelRatio } from "react-native";

const isLowEnd = PixelRatio.get() < 2;
const defaultBubbleCount = isLowEnd ? 4 : 8;

Add a reduceMotion check using useReducedMotion() from Reanimated. If the user has reduced
motion enabled, skip all bubble animations entirely.

Cap the maximum number of simultaneous animated shared values.
```

---

### [PF-4] Add getItemLayout to FlatLists (P2)

**Problem**: FlatLists lack `getItemLayout`, preventing scroll optimizations.

```
For lists with fixed-height items (inventory cards, shopping items, cooking terms), calculate
the item height and provide getItemLayout:

const ITEM_HEIGHT = 80;
const SEPARATOR_HEIGHT = 8;

getItemLayout={(data, index) => ({
  length: ITEM_HEIGHT,
  offset: (ITEM_HEIGHT + SEPARATOR_HEIGHT) * index,
  index,
})}

Apply to InventoryScreen.tsx, ShoppingListScreen.tsx, and CookingTermsScreen.tsx FlatLists.

For variable-height lists (recipes, chat), skip getItemLayout but ensure initialNumToRender
and maxToRenderPerBatch are set to reasonable values (10 and 5 respectively).
```

---

### [PF-5] Cache Subscription Data (P2)

**Problem**: Subscription data fetched too frequently.

```
In client/hooks/useSubscription.tsx, add a staleTime concept: cache the subscription
response and only refetch if more than 5 minutes have passed:

const STALE_TIME_MS = 5 * 60 * 1000;
const lastFetchRef = useRef<number>(0);

const fetchSubscription = useCallback(async () => {
  if (Date.now() - lastFetchRef.current < STALE_TIME_MS) return;
  lastFetchRef.current = Date.now();
  // ... existing fetch logic
}, [...]);

Force-refetch on specific events: after checkout, after app returns from background with
>5 minutes elapsed, or on manual pull-to-refresh.
```

---

## 4. Security

### [SC-1] Add Rate Limiting to Password Reset (P0)

**Problem**: Password reset endpoint lacks rate limiting, enabling email enumeration.

```
Open server/middleware/rateLimiter.ts.

Add a dedicated limiter for password reset:

export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
  keyGenerator: (req) => req.body?.email || req.ip,
  handler: (_req, res) => {
    res.status(429).json({
      error: "Too many password reset attempts. Please try again later.",
      retryAfter: 3600,
    });
  },
});

In server/routers/auth.router.ts, apply the limiter to the password reset routes:

router.post("/forgot-password", passwordResetLimiter, async (req, res, next) => { ... });
router.post("/reset-password", passwordResetLimiter, async (req, res, next) => { ... });

Additionally, always return the same success message regardless of whether the email exists,
to prevent email enumeration.
```

---

### [SC-2] Add Device Fingerprinting to Sessions (P2)

**Problem**: Stolen session tokens work from any device.

```
When creating a session in auth.router.ts, store additional metadata:

const sessionData = {
  token: hashedToken,
  userId,
  userAgent: req.headers["user-agent"] || "unknown",
  ipAddress: req.ip,
  createdAt: new Date(),
  expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
};

Add userAgent and ipAddress columns to the userSessions table in shared/schema.ts.

In server/middleware/auth.ts, optionally log a warning if the current request's user agent
doesn't match the session's stored user agent. This is a soft check (don't block immediately)
but enables detection.

Provide an "Active Sessions" view in Settings where users can see and revoke sessions.
```

---

### [SC-3] Guard Admin Dashboard with Authentication (P0)

**Problem**: `/admin` route may be accessible without authentication.

```
In server/index.ts, wrap the admin route with requireAuth and requireAdmin middleware:

import { requireAuth } from "./middleware/auth";
import { requireAdmin } from "./middleware/requireAdmin";

app.get("/admin", requireAuth, requireAdmin, (_req: Request, res: Response) => {
  const adminPath = path.resolve(process.cwd(), "server", "templates", "admin-dashboard.html");
  res.sendFile(adminPath);
});

If the admin dashboard loads data via API calls, ensure those API routes also use
requireAdmin middleware.
```

---

### [SC-4] Restrict Localhost CORS to Development (P1)

**Problem**: Localhost origins allowed in all environments.

```
In server/index.ts, wrap the localhost origins in a development check:

function setupCors(app: express.Application) {
  app.use((req, res, next) => {
    const origins = new Set<string>();

    if (process.env.REPLIT_DEV_DOMAIN) {
      origins.add(`https://${process.env.REPLIT_DEV_DOMAIN}`);
    }
    if (process.env.REPLIT_DOMAINS) {
      process.env.REPLIT_DOMAINS.split(",").forEach((d) =>
        origins.add(`https://${d.trim()}`)
      );
    }

    // Only allow localhost in development
    if (process.env.NODE_ENV !== "production") {
      origins.add("http://localhost:8081");
      origins.add("http://127.0.0.1:8081");
      origins.add("http://localhost:5000");
      origins.add("http://127.0.0.1:5000");
    }

    origins.add("https://chefspaice.com");
    origins.add("https://www.chefspaice.com");

    // ... rest of CORS logic
  });
}
```

---

### [SC-5] Add Referrer-Policy Header (P3)

**Problem**: Missing explicit `Referrer-Policy` header.

```
In the helmet() configuration in server/index.ts, add:

app.use(helmet({
  contentSecurityPolicy: { /* existing config */ },
  crossOriginEmbedderPolicy: false,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
}));
```

---

## 5. Error Handling

### [EH-1] Mount requestIdMiddleware (P1)

**Problem**: `req.id` is always undefined because the middleware is never mounted.

```
In server/index.ts, import and mount requestIdMiddleware early in the middleware chain:

import { requestIdMiddleware } from "./middleware/errorHandler";

// Inside the async IIFE, before setupCors:
app.use(requestIdMiddleware);
setupCors(app);

This ensures every request gets a unique ID that appears in error responses and logs.
```

---

### [EH-2] Use AppError in requireSubscription Grace Period Check (P1)

**Problem**: Grace period expiry returns a raw JSON response instead of using `AppError`.

```
In server/middleware/requireSubscription.ts, replace this:

if (new Date() > gracePeriodEnd) {
  return res.status(403).json({
    error: "payment_required",
    message: "Your payment failed. Please update your payment method.",
  });
}

With this:

if (new Date() > gracePeriodEnd) {
  return next(AppError.forbidden(
    "Your payment failed. Please update your payment method.",
    "PAYMENT_REQUIRED"
  ));
}
```

---

### [EH-3] Add Recovery Steps to Fatal Sync Errors (P2)

**Problem**: Fatal sync items show an alert but don't guide users on what to do.

```
In the sync manager's fatal error handler (likely in client/lib/sync-manager.ts or similar),
update the alert to include actionable steps:

Alert.alert(
  "Sync Issue",
  "Some changes couldn't be saved to the cloud. Your data is safe on this device. "
  + "Try these steps:\n\n"
  + "1. Check your internet connection\n"
  + "2. Go to Settings > Account > Sync Now\n"
  + "3. If the problem persists, contact support",
  [
    { text: "Go to Settings", onPress: () => navigation.navigate("Settings") },
    { text: "Dismiss", style: "cancel" },
  ]
);
```

---

### [EH-4] Replace console.error with Structured Logging (P3)

**Problem**: Client hooks use `console.error` instead of a structured logger.

```
Create a lightweight client logger in client/lib/logger.ts:

const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };

export const clientLogger = {
  error: (message: string, context?: Record<string, unknown>) => {
    if (__DEV__) {
      console.error(`[ERROR] ${message}`, context);
    }
    // In production, send to crash reporting service (e.g., Sentry)
  },
  warn: (message: string, context?: Record<string, unknown>) => {
    if (__DEV__) console.warn(`[WARN] ${message}`, context);
  },
  info: (message: string, context?: Record<string, unknown>) => {
    if (__DEV__) console.log(`[INFO] ${message}`, context);
  },
};

Replace all console.error calls in hooks and components with clientLogger.error.
```

---

## 6. Accessibility

### [A11Y-1] Add Labels to Icon-Only Buttons (P1)

**Problem**: Icon buttons lack screen reader labels.

```
Search for all icon-only Pressable and TouchableOpacity elements that are missing
accessibilityLabel:

grep -rn 'size="icon"\|<Pressable.*<Feather' client/ --include="*.tsx" | grep -v accessibilityLabel

For each match, add an appropriate accessibilityLabel. Examples:

<Pressable
  onPress={goBack}
  accessibilityRole="button"
  accessibilityLabel="Go back"
>
  <Feather name="arrow-left" size={24} />
</Pressable>

Common buttons to label: back navigation, filter toggle, sort toggle, more options,
close modal, add item.
```

---

### [A11Y-2] Add Text Alternatives to Color-Only Indicators (P1)

**Problem**: Expiry and trial badges rely on color alone.

```
In client/components/ExpiryBadge.tsx, add a text prefix or icon alongside the color:

// Before: Just a colored circle
// After: Color + text label
<View style={styles.badge}>
  <Feather
    name={daysLeft <= 1 ? "alert-triangle" : daysLeft <= 3 ? "alert-circle" : "clock"}
    size={12}
    color={badgeColor}
  />
  <ThemedText style={[styles.badgeText, { color: badgeColor }]}>
    {daysLeft <= 0 ? "Expired" : `${daysLeft}d left`}
  </ThemedText>
</View>

In client/components/TrialStatusBadge.tsx, add an accessibilityLabel that includes the status:

accessibilityLabel={`Trial: ${daysRemaining} days remaining. ${urgency} priority.`}
```

---

### [A11Y-3] Add accessibilityLiveRegion to Dynamic Content (P1)

**Problem**: Screen readers don't announce toast notifications and sync status changes.

```
In client/components/OfflineIndicator.tsx, add:

<View accessibilityLiveRegion="polite" accessibilityRole="alert">
  <ThemedText>You are offline</ThemedText>
</View>

In client/components/SyncStatusIndicator.tsx, add:

<View accessibilityLiveRegion="polite">
  <ThemedText accessibilityLabel={`Sync status: ${statusText}`}>{statusText}</ThemedText>
</View>

For toast notifications, ensure the toast container has accessibilityLiveRegion="assertive".
```

---

### [A11Y-4] Add Accessible Alternatives to Swipe Actions (P1)

**Problem**: Swipeable item card actions only accessible via swipe.

```
In client/components/inventory/SwipeableItemCard.tsx, add a long-press handler that opens
a context menu:

<Pressable
  onLongPress={() => {
    // Show action sheet with same options as swipe
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: ["Mark Consumed", "Delete", "Cancel"],
        destructiveButtonIndex: 1,
        cancelButtonIndex: 2,
      },
      (buttonIndex) => {
        if (buttonIndex === 0) handleConsumed();
        if (buttonIndex === 1) handleDelete();
      }
    );
  }}
  accessibilityActions={[
    { name: "consumed", label: "Mark as consumed" },
    { name: "delete", label: "Delete item" },
  ]}
  onAccessibilityAction={(event) => {
    switch (event.nativeEvent.actionName) {
      case "consumed": handleConsumed(); break;
      case "delete": handleDelete(); break;
    }
  }}
>

The accessibilityActions and onAccessibilityAction props enable VoiceOver/TalkBack users
to trigger these actions through the accessibility menu.
```

---

### [A11Y-5] Enforce Minimum Touch Targets (P2)

**Problem**: Some interactive elements may be below 44x44pt.

```
Audit small interactive elements by searching for elements with explicit small sizes:

grep -rn 'height: [12][0-9]\b\|h-[5-8]\b' client/ --include="*.tsx"

For any interactive element below 44pt, add minHeight: 44, minWidth: 44 to its style,
using padding to expand the touch target without changing the visual size:

<Pressable
  style={{ minHeight: 44, minWidth: 44, alignItems: "center", justifyContent: "center" }}
  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
>
  <Feather name="filter" size={18} />
</Pressable>
```

---

### [A11Y-6] Add Header Roles to Section Headings (P2)

**Problem**: Section headers lack heading roles for screen reader navigation.

```
In client/components/ThemedText.tsx, when type is h1, h2, h3, or h4, automatically set:

const getAccessibilityProps = () => {
  if (["h1", "h2", "h3", "h4"].includes(type)) {
    return {
      accessibilityRole: "header" as const,
    };
  }
  return {};
};

return (
  <Text
    style={[...]}
    {...getAccessibilityProps()}
    {...rest}
  />
);

This automatically makes all headings navigable by screen readers without changing any
screen code.
```

---

## 7. Code Quality

### [CQ-1] Fix TypeScript `any` Casts in Middleware (P1)

**Problem**: `(req as any).subscriptionTier` bypasses type safety.

```
In server/middleware/auth.ts (or a shared types file), extend the Express Request interface:

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      user?: typeof users.$inferSelect;
      subscriptionTier?: string;
    }
  }
}

Then in requireSubscription.ts, replace (req as any).subscriptionTier = ...
with req.subscriptionTier = ...

Update all downstream route handlers that read (req as any).subscriptionTier
to use req.subscriptionTier.
```

---

### [CQ-2] Extract Shared useDebounce Hook (P3)

**Problem**: Debounce logic is duplicated inline.

```
Create client/hooks/useDebounce.ts:

import { useState, useEffect } from "react";

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

In client/components/FoodSearchAutocomplete.tsx, replace the inline implementation with:

import { useDebounce } from "@/hooks/useDebounce";

Search for other inline debounce implementations and replace them.
```

---

### [CQ-3] Split Large Screen Files (P3)

**Problem**: `SubscriptionScreen.tsx` is ~1900 lines.

```
Extract these sub-components from SubscriptionScreen.tsx:
- client/components/subscription/CurrentPlanCard.tsx - The "Current Plan" section
- client/components/subscription/FeatureComparisonTable.tsx - The feature comparison grid
- client/components/subscription/TierSelector.tsx - The "Choose Your Plan" cards
- client/components/subscription/PlanToggle.tsx - Monthly/Annual toggle (when added)

Each component should receive its data via props from the parent screen.

Keep the main screen file focused on data fetching, state management, and layout composition.
```

---

### [CQ-4] Standardize Import Paths (P3)

**Problem**: Mix of `@/` aliases and relative paths.

```
Establish a rule: always use @/ for imports from client/, @shared/ for imports from shared/.

Run a search for relative imports that cross directory boundaries:

grep -rn '"\.\./\.\.' client/ --include="*.tsx" --include="*.ts"

Replace each with the appropriate alias. Example:

// Before
import { storage } from "../../lib/storage";
// After
import { storage } from "@/lib/storage";
```

---

### [CQ-5] Add Database Transactions to Multi-Step Operations (P1)

**Problem**: Only 2 transaction usages across the server; multi-step operations risk partial failures.

```
Identify multi-step database operations that should be atomic:
- Referral credit redemption (updating credits + extending subscription)
- User registration (creating user + creating session + setting trial)
- Account deletion (removing user + sessions + data)
- Subscription tier change (updating users table + subscriptions table)

Wrap each in a Drizzle transaction:

await db.transaction(async (tx) => {
  await tx.update(users).set({ ... }).where(eq(users.id, userId));
  await tx.insert(subscriptions).values({ ... });
});

Ensure error handling rolls back the transaction on failure (Drizzle does this automatically
if an exception is thrown inside the callback).
```

---

## 8. Mobile

### [MB-1] Document Web Platform Limitations (P3)

**Problem**: Web users see only a landing page, not the full app.

```
This is by design (mobile-first app), but should be clearly communicated:
- Add a "Download the App" banner at the top of the web landing page
- Include App Store and Play Store badges
- Add "Web app coming soon" messaging if full web support is planned
```

---

### [MB-2] Add Tablet Layout Support (P2)

**Problem**: No responsive layouts for larger screens.

```
Create a useDeviceType hook in client/hooks/useDeviceType.ts:

import { useWindowDimensions } from "react-native";

export function useDeviceType() {
  const { width } = useWindowDimensions();
  return {
    isPhone: width < 768,
    isTablet: width >= 768,
    isLargeTablet: width >= 1024,
  };
}

In key screens (Inventory, Recipes, Meal Plan), use the hook to switch between
single-column (phone) and multi-column (tablet) layouts:

const { isTablet } = useDeviceType();

<FlatList
  numColumns={isTablet ? 2 : 1}
  key={isTablet ? "tablet" : "phone"}
  ...
/>

For the meal plan screen, show multiple days side-by-side on tablets instead of
the day selector.
```

---

### [MB-3] Handle Camera Permission Denied (P1)

**Problem**: Camera screens may crash or show blank when permission is denied.

```
In each camera-dependent screen (FoodCameraScreen.tsx, BarcodeScannerScreen.tsx,
IngredientScannerScreen.tsx, RecipeScannerScreen.tsx), ensure the permission check
includes a denied state handler:

const [permission, requestPermission] = useCameraPermissions();

if (!permission) return <CookPotLoader />;

if (!permission.granted) {
  return (
    <EmptyState
      icon="camera-off"
      title="Camera Access Needed"
      description="ChefSpAIce needs camera access to scan items. You can enable this in your device settings."
      action={{
        label: "Open Settings",
        onPress: () => Linking.openSettings(),
      }}
    />
  );
}

Test on both iOS and Android to ensure the settings link works correctly.
```

---

## 9. Data Management

### [DM-1] Document Backup Strategy (P2)

**Problem**: No documented backup approach.

```
Since the app uses Replit's built-in PostgreSQL (Neon-backed), document that Neon provides
automatic daily backups with point-in-time recovery.

Add to replit.md:

## Backup Strategy
- Database: Neon PostgreSQL with automatic daily backups and point-in-time recovery
- User data: AsyncStorage on-device serves as a local backup
- Exported data: GDPR export endpoint allows users to download their data

For additional safety, consider adding a weekly database dump job or using Neon's branching
feature for pre-migration snapshots.
```

---

### [DM-2] Improve Conflict Resolution (P3)

**Problem**: Last-write-wins silently loses data.

```
For a future improvement, implement field-level merging instead of document-level replacement:
- Store per-field timestamps
- On conflict, merge by taking the newest value for each field independently

As a near-term improvement, when a conflict is detected (client receives a 409), show the
user both versions and let them choose:

Alert.alert(
  "Sync Conflict",
  "This item was modified on another device. Which version would you like to keep?",
  [
    { text: "This Device", onPress: () => forceSync("local") },
    { text: "Other Device", onPress: () => forceSync("remote") },
  ]
);
```

---

### [DM-3] Cap Sync Queue Size (P1)

**Problem**: Unbounded sync queue growth during offline periods.

```
In the sync manager, add a maximum queue size constant:

const MAX_SYNC_QUEUE_SIZE = 500;

When adding to the queue, check the size:

if (queue.length >= MAX_SYNC_QUEUE_SIZE) {
  // Remove oldest non-critical items (updates) to make room
  const oldestUpdateIndex = queue.findIndex(item => item.operation === "update");
  if (oldestUpdateIndex !== -1) {
    queue.splice(oldestUpdateIndex, 1);
  }
}

Show a warning to the user if the queue is nearing capacity:

if (queue.length > MAX_SYNC_QUEUE_SIZE * 0.8) {
  showNotification("You have many unsynced changes. Connect to the internet to sync your data.");
}
```

---

### [DM-4] Add Cascade Deletes for User Deletion (P1)

**Problem**: Orphaned data when users are deleted.

```
In shared/schema.ts, verify that all user-referencing foreign keys have onDelete: "cascade":

userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),

Check these tables specifically:
- userInventoryItems
- userSavedRecipes
- userMealPlans
- userShoppingItems
- userCookwareItems
- userSessions
- subscriptions
- referrals

After updating the schema, run npm run db:push to apply the changes.

Test by creating a test user, adding data, then deleting the user and verifying all related
data is removed.
```

---

### [DM-5] Add Expired Session Cleanup Job (P2)

**Problem**: Expired sessions accumulate in the database.

```
Create server/jobs/sessionCleanupJob.ts:

import { db } from "../db";
import { userSessions } from "@shared/schema";
import { lt } from "drizzle-orm";
import { logger } from "../lib/logger";

export function startSessionCleanupJob(intervalMs: number) {
  setInterval(async () => {
    try {
      const result = await db
        .delete(userSessions)
        .where(lt(userSessions.expiresAt, new Date()));
      logger.info("Cleaned up expired sessions", { count: result.rowCount });
    } catch (error) {
      logger.error("Session cleanup failed", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }, intervalMs);

  logger.info("Session cleanup job started", { intervalHours: intervalMs / 3600000 });
}

In server/index.ts, start the job alongside the trial expiration job:

import { startSessionCleanupJob } from "./jobs/sessionCleanupJob";

// Inside server.listen callback:
startSessionCleanupJob(24 * 60 * 60 * 1000); // Run daily
```

---

## 10. Monetization

### [MT-1] Add Annual Pricing Option (P2)

**Problem**: Only monthly pricing available.

```
In shared/subscription.ts, add annual prices:

export const ANNUAL_PRICES = {
  BASIC: 39.99,  // ~$3.33/mo, 33% savings
  PRO: 79.99,    // ~$6.67/mo, 33% savings
};

Create annual Stripe Price objects for each tier (one-time setup via Stripe dashboard or API).

In client/screens/SubscriptionScreen.tsx, add a Monthly/Annual toggle above the tier cards:

const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("monthly");

Update the price display and checkout flow to use the correct Stripe Price ID based on the
selected billing period.

Show the savings percentage on the annual option: "Save 33%".
```

---

### [MT-2] Build Subscription Analytics Dashboard (P3)

**Problem**: No visibility into revenue metrics.

```
In server/routers/admin/analytics.router.ts, add endpoints for:
- Active subscriptions by tier (count and MRR)
- Trial conversion rate (trials started vs. converted to paid)
- Churn rate (cancellations per month)
- FREE to paid conversion funnel

Query the subscriptions and users tables:

router.get("/subscription-metrics", requireAdmin, async (req, res) => {
  const [metrics] = await db.execute(sql`
    SELECT
      subscription_tier,
      COUNT(*) as count,
      COUNT(CASE WHEN subscription_status = 'active' THEN 1 END) as active_count
    FROM users
    GROUP BY subscription_tier
  `);
  res.json(successResponse(metrics));
});

Display these metrics in the admin dashboard HTML template or build a dedicated admin
React page.
```

---

### [MT-3] Handle Proration on Tier Upgrades (P2)

**Problem**: Mid-cycle upgrade proration behavior not explicitly managed.

```
In the checkout session creation (likely in server/stripe/subscriptionRouter.ts), enable
Stripe's proration:

const session = await stripe.checkout.sessions.create({
  // ... existing config
  subscription_data: {
    proration_behavior: "create_prorations",
  },
});

For existing subscribers upgrading, use stripe.subscriptions.update() instead of creating
a new checkout session:

await stripe.subscriptions.update(subscriptionId, {
  items: [{ id: existingItemId, price: newPriceId }],
  proration_behavior: "create_prorations",
});

Show the prorated amount to the user before confirming the upgrade.
```

---

### [MT-4] Add Conversion Event Tracking (P2)

**Problem**: No tracking of FREE to paid conversion events.

```
In server/stripe/webhookHandlers.ts, when a checkout.session.completed event is processed,
log the conversion:

const previousTier = user.subscriptionTier;
logger.info("Subscription conversion", {
  userId,
  previousTier,
  newTier: selectedTier,
  source: session.metadata?.source || "unknown",
});

Store conversion events in a dedicated conversionEvents table for analysis:

export const conversionEvents = pgTable("conversion_events", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  fromTier: varchar("from_tier").notNull(),
  toTier: varchar("to_tier").notNull(),
  source: varchar("source"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

Query this table in the admin analytics dashboard to visualize the conversion funnel.
```

---

### [MT-5] Add Cancellation Retention Flow (P3)

**Problem**: No retention attempt when users cancel.

```
Before processing cancellation, show a multi-step flow:
- Step 1: "We're sorry to see you go" + reason selection (too expensive, not using it,
  missing features, other)
- Step 2: Based on reason, offer a targeted incentive:
  - "Too expensive" -> Offer 50% off for 3 months
  - "Not using it" -> Offer a pause for 1-3 months
  - "Missing features" -> Show upcoming roadmap + feedback form
- Step 3: Confirm cancellation if they decline the offer

Store the cancellation reason in the database for product analytics.

Create a pause subscription option using Stripe's subscription.pause_collection:

await stripe.subscriptions.update(subscriptionId, {
  pause_collection: {
    behavior: "void",
    resumes_at: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // Resume in 30 days
  },
});
```

---

## Implementation Priority Summary

### P0 - Fix Immediately
1. [SC-1] Rate limit password reset endpoint
2. [SC-3] Guard admin dashboard with authentication

### P1 - Fix Soon
3. [PF-1] Optimize requireSubscription to single DB query
4. [EH-1] Mount requestIdMiddleware
5. [EH-2] Use AppError in grace period check
6. [SC-4] Restrict localhost CORS to development
7. [A11Y-1] Add labels to icon-only buttons
8. [A11Y-2] Add text alternatives to color indicators
9. [A11Y-3] Add accessibilityLiveRegion to dynamic content
10. [A11Y-4] Add accessible alternatives to swipe actions
11. [CQ-1] Fix TypeScript `any` casts
12. [CQ-5] Add database transactions to multi-step operations
13. [DM-3] Cap sync queue size
14. [DM-4] Add cascade deletes
15. [MB-3] Handle camera permission denied

### P2 - Fix Next Sprint
16. [UX-1] Add loading skeleton screens
17. [UX-3] Conditionally render AnimatedBackground
18. [CF-1] Surface recently deleted items from inventory
19. [CF-2] Add recipe search
20. [PF-2] Verify database connection pooling
21. [PF-3] Optimize AnimatedBackground bubbles
22. [PF-4] Add getItemLayout to FlatLists
23. [PF-5] Cache subscription data
24. [SC-2] Add device fingerprinting to sessions
25. [EH-3] Add recovery steps to fatal sync errors
26. [A11Y-5] Enforce minimum touch targets
27. [A11Y-6] Add header roles to section headings
28. [DM-1] Document backup strategy
29. [DM-5] Add session cleanup job
30. [MT-1] Add annual pricing
31. [MT-2] Build analytics dashboard
32. [MT-3] Handle proration
33. [MT-4] Add conversion tracking
34. [MB-2] Add tablet layout support

### P3 - Backlog
35. [UX-2] Add swipe hint
36. [UX-4] Standardize empty states
37. [CF-3] Drag-and-drop meal plan
38. [SC-5] Add Referrer-Policy header
39. [EH-4] Replace console.error with structured logging
40. [CQ-2] Extract shared useDebounce hook
41. [CQ-3] Split large screen files
42. [CQ-4] Standardize import paths
43. [DM-2] Improve conflict resolution
44. [MT-5] Add cancellation retention flow
45. [MB-1] Document web platform limitations
