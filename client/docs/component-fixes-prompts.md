# Component Fixes - Detailed Prompts

This document contains prompts you can copy and paste into the chat to fix the issues identified in the component review.

---

## 1. Critical: apiRequest Parameter Order Bug

### Prompt 1.1: Fix All apiRequest Calls

```
Fix the apiRequest parameter order bug across all components. The apiRequest helper expects arguments in the order (path, method, body) but multiple components are calling it as (method, path, body).

Search the entire codebase for incorrect apiRequest calls and fix them. Affected components include:
- client/src/components/recipe-generator.tsx
- client/src/components/star-rating.tsx
- client/src/components/feedback-buttons.tsx
- client/src/components/NaturalQueryInput.tsx
- client/src/components/QueryResults.tsx
- client/src/components/SavedQueries.tsx
- client/src/components/TagEditor.tsx

Also search for any other files that may have this issue using grep for patterns like apiRequest('POST' or apiRequest('GET' or apiRequest('DELETE' or apiRequest('PATCH' or apiRequest('PUT'.
```

---

## 2. Critical: RetentionTable Data Mapping Bug

### Prompt 2.1: Fix RetentionTable Query Mapper

```
Fix the RetentionTable component in client/src/components/cohorts/RetentionTable.tsx.

The current query incorrectly flattens data.retention with spread syntax like { ...data.retention, cohortName, cohortDate } which strips the retention array entirely (arrays spread into numeric keys).

Change it to properly preserve the retention array: { retention: data.retention, cohortName, cohortDate }

This will fix the table rendering as empty and tooltips/charts breaking.
```

---

## 3. Critical: State Synchronization Issues

### Prompt 3.1: Fix DraftEditor State Sync

```
Fix DraftEditor in client/src/components/DraftEditor.tsx to resynchronize with new draft props.

Currently the component initializes content and tone from the incoming draft once and never updates them. When the parent swaps in another draft, the editor still shows and saves the stale content.

Add a useEffect keyed on draft.id (and tone metadata) to reset the local state when the draft prop changes.
```

### Prompt 3.2: Fix SummaryCard State Sync

```
Fix both SummaryCard components:
- client/src/components/summaries/SummaryCard.tsx
- client/src/components/summary-card.tsx

These components cache editable text in local state without resyncing when new summaries arrive. Switching records shows stale or incorrect content.

Add useEffect hooks to keep editedText in sync with incoming props, depending on summary.id and summary text.
```

### Prompt 3.3: Fix SignificanceCalculator State

```
Fix SignificanceCalculator in client/src/components/ab-testing/SignificanceCalculator.tsx.

The component keeps the previous test's analysis in local state. When switching tests, it shows stale statistics until the user re-runs the calculation.

Add a useEffect to reset the analysis state when test.id changes.
```

---

## 4. Performance: Batch Processing and Query Keys

### Prompt 4.1: Fix BatchProcessor Performance

```
Fix BatchProcessor in client/src/components/extraction/BatchProcessor.tsx for performance.

The component processes batches strictly serially and calls setBatchItems with full-array copies inside the loop, causing quadratic state churn and very slow runs on moderate batches.

Refactor the processing loop to:
1. Use a single functional updater or batched state updates
2. Consider adding limited concurrency (e.g., processing 3-5 items at once)
3. Keep the UI responsive during processing
```

### Prompt 4.2: Fix ConflictResolver Query Keys

```
Fix ConflictResolver in client/src/components/scheduling/ConflictResolver.tsx.

The component injects fresh new Date() objects into the React Query key every render, forcing perpetual refetches and making the conflicts list unstable.

Persist the date range in state or serialize the dates once so the query key remains stable between renders.
```

### Prompt 4.3: Fix AvailabilityGrid Query Updates

```
Fix AvailabilityGrid in client/src/components/scheduling/AvailabilityGrid.tsx.

The component only queries the initial (startDate, endDate) window. Navigating weeks or switching to month view never updates the query, so availability calculations are always out of sync with the UI state.

Wire the scheduling fetches to the actual navigation state so the query updates when the user navigates.
```

---

## 5. Logic/State Management Issues

### Prompt 5.1: Fix MeetingInsights Filters

```
Fix MeetingInsights in client/src/components/scheduling/MeetingInsights.tsx.

The component ignores the chosen timeRange and userId when calling /api/schedule/analytics, so the analytics tab cannot filter correctly.

Update the API call to include these parameters so filtering works properly.
```

### Prompt 5.2: Fix RevenueImpact Number Parsing

```
Fix RevenueImpact in client/src/components/pricing/RevenueImpact.tsx.

The component parses formatted strings (e.g., "+$12.3K") with parseFloat, producing NaN and breaking the projected charts.

Either:
1. Ensure the server returns numeric values instead of formatted strings, OR
2. Parse the values robustly by stripping currency symbols and handling K/M suffixes before plotting
```

### Prompt 5.3: Fix ActivityPrivacyControls Hydration

```
Fix ActivityPrivacyControls in client/src/components/ActivityPrivacyControls.tsx.

The component never hydrates the saved privacy policy - it only initializes local defaults. Every toggle exposes incorrect state and subsequent mutations push fabricated settings.

The component must fetch the persisted policy on mount using useQuery and merge updates against the real record using optimistic mutations.
```

### Prompt 5.4: Fix AIErrorMonitor Timestamps

```
Fix AIErrorMonitor in client/src/components/ai-error-monitor.tsx.

The component trusts the API to return Date objects, but the query result surfaces ISO strings. Passing those straight into formatDistanceToNow and graphing utilities throws at runtime.

Ensure the query's select phase parses timestamps (convert ISO strings to Date objects) before rendering.
```

### Prompt 5.5: Fix OfflineIndicator Initialization

```
Fix OfflineIndicator in client/src/components/offline-indicator.tsx.

The component suppresses the banner until an online/offline transition occurs because showToast defaults to false. Users who launch the app while offline receive no warning.

Initialize the toast state based on navigator.onLine, or trigger the visibility effect on mount, so the indicator renders immediately for users who are already offline.
```

### Prompt 5.6: Fix ContentCard Date Formatting

```
Fix ContentCard in client/src/components/ContentCard.tsx.

The formatDate helper treats missing dates as "Today," which misleads moderation/content reviewers and corrupts timeline logic.

Update formatDate to guard against undefined/invalid timestamps by returning "Unknown" or hiding the badge entirely when the date is missing.
```

---

## 6. API Response Validation

### Prompt 6.1: Add Response Validation to Analytics Components

```
Add proper API response validation to these analytics and cohort components:
- client/src/components/cohorts/CohortTimeline.tsx
- client/src/components/cohorts/InsightCards.tsx
- client/src/components/predictions/PredictedActions.tsx

These components parse response.json() without verifying response.ok. When the backend returns an error payload, the components treat the error object as valid data and crash on undefined fields.

Add explicit status checks (if (!response.ok) throw new Error(...)) and surface errors via toast or error UI so the pages fail safely.
```

---

## 7. Resource Cleanup Issues

### Prompt 7.1: Fix SuccessAnimation Timer Leak

```
Fix SuccessAnimation in client/src/components/success-animation.tsx.

The component never clears the confetti interval when showConfetti is true, so unmounting the component leaks timers.

Add a ref to store the interval handle and clear it in the useEffect cleanup function. Also guard against double-triggering.
```

### Prompt 7.2: Fix ThemeToggle Cleanup

```
Fix ThemeToggle in client/src/components/theme-toggle.tsx.

The component reads localStorage and matchMedia in the initial render effect but never removes the media listener. This causes stale toggles when the OS theme changes.

Add an event listener with proper cleanup in the useEffect return function, and fall back to CSS prefers-color-scheme to keep the toggle in sync with OS theme changes.
```

---

## 8. Compliance Issues

### Prompt 8.1: Remove Emojis from EmotionTags

```
Fix EmotionTags in client/src/components/sentiment/EmotionTags.tsx.

The component hard-codes emoji strings for icons, which violates the project's no-emoji constraint.

Replace all emoji literals with Lucide/react icon equivalents that respect theming. For example:
- Happy face emoji → use Smile icon from lucide-react
- Sad face emoji → use Frown icon from lucide-react
- Angry face emoji → use Angry icon from lucide-react
- etc.
```

### Prompt 8.2: Remove Emojis from TranslatedContent

```
Fix TranslatedContent in client/src/components/TranslatedContent.tsx.

The component ships with emoji language flags in the languageFlags object, violating the project's no-emoji constraint.

Replace them with semantic badges or Lucide icons so the UI complies with shared guidelines. Consider using text abbreviations (EN, ES, FR) styled as badges instead.
```

### Prompt 8.3: Refactor LiquidGlassButton

```
Refactor LiquidGlassButton in client/src/components/liquid-glass.tsx.

The component bypasses the mandatory Shadcn Button primitives and reimplements button sizing/variants, breaking design-system behavior (hover elevation, consistent sizing, ARIA states).

Refactor to wrap the existing <Button> component from @/components/ui/button and layer Framer Motion on top while respecting the project's button API. Reuse shared variants to maintain consistency and accessibility.
```

---

## 9. Clipboard Error Handling

### Prompt 9.1: Improve Clipboard Error Handling

```
Improve clipboard error handling in these components:
- client/src/components/DraftSuggestions.tsx
- client/src/components/DraftEditor.tsx

The clipboard copy handlers currently swallow errors by only logging to console. When browser permissions block the copy action, users have no idea what happened.

Surface copy failures via the existing toast system (use useToast hook) so users are informed when copy operations are blocked.
```

---

## 10. Complete All Fixes (Batch)

### Prompt 10.1: Fix All Critical Issues

```
Fix all critical issues identified in the component review:

1. Fix apiRequest parameter order in all affected components (search for apiRequest calls with method as first argument)
2. Fix RetentionTable data mapping to preserve the retention array
3. Fix state synchronization in DraftEditor, SummaryCard components, and SignificanceCalculator

Ensure all fixes are tested and working.
```

### Prompt 10.2: Fix All Performance Issues

```
Fix all performance issues identified in the component review:

1. BatchProcessor - refactor to batch state updates and add limited concurrency
2. ConflictResolver - stabilize React Query keys by persisting date range in state
3. AvailabilityGrid - wire queries to actual navigation state

Ensure all fixes maintain existing functionality while improving performance.
```

### Prompt 10.3: Fix All Logic Issues

```
Fix all logic/state management issues:

1. MeetingInsights - include timeRange and userId in API calls
2. RevenueImpact - parse formatted currency strings properly
3. ActivityPrivacyControls - hydrate saved privacy policy on mount
4. AIErrorMonitor - parse ISO string timestamps to Date objects
5. OfflineIndicator - initialize based on current connectivity state
6. ContentCard - handle missing dates properly

Test each fix to ensure proper functionality.
```

### Prompt 10.4: Fix All Cleanup and Compliance Issues

```
Fix all resource cleanup and compliance issues:

1. SuccessAnimation - clear confetti interval on unmount
2. ThemeToggle - add cleanup for matchMedia listener
3. EmotionTags - replace emojis with Lucide icons
4. TranslatedContent - replace emoji flags with semantic badges
5. LiquidGlassButton - refactor to use Shadcn Button
6. Add proper API response validation to analytics components
7. Improve clipboard error handling with toast notifications

Ensure all fixes comply with project guidelines.
```
