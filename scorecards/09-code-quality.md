# Code Quality — Grade: B+

## Category Breakdown

### 1. Type Safety (B+)

**Strengths:**
- TypeScript strict mode enabled with `noUnusedLocals: true` in `tsconfig.json`
- Drizzle ORM with co-located Zod validation schemas in `shared/schema.ts` (1,494 lines, well-documented)
- Shared domain types in `shared/domain/` (aggregates, entities, value-objects, events) imported across 5 server files
- Standardized API response envelope via `server/lib/apiResponse.ts` with typed `successResponse` / `errorResponse`
- Insert schemas generated via `createInsertSchema` from `drizzle-zod` for type-safe mutations

**Weaknesses:**
- 227 occurrences of `: any`, `as any`, or `<any>` across non-test production code
  - `AuthContext.tsx` alone has 7 `as any` casts for API response data
  - Navigation calls use `as any` for route names (e.g., `navigation.navigate("SelectRecipe" as any)`) — 10+ occurrences across screens
  - Web screens use `cursor: "pointer" as any` — React Native style type workaround repeated in 5 files
  - `RecipeDetailScreen`, `GenerateRecipeScreen` use `.filter((a: any) => ...)` instead of typed callbacks
- `apiResponse.ts` `asyncHandler` uses `Promise<any>` return type

**Score Justification:** Strict mode is excellent, but 227 `any` usages erode type safety significantly, especially in critical paths like auth and navigation.

---

### 2. Code Organization & Architecture (B+)

**Strengths:**
- Domain-Driven Design structure: `shared/domain/` (130 lines), `server/domain/services/` (476 lines) with `AccountDeletionService`, `AuthenticationService`, `PermissionService`
- Clear layered architecture: routers (41 files) → services (6 files) → domain (4 files) → schema
- Server routers well-organized into subdirectories: `auth/`, `admin/`, `platform/`, `user/`, `sync/`
- Client structure: screens (35), components (110), hooks (22), lib (26), contexts (7)
- Shared subscription types ensure client-server consistency

**Weaknesses:**
- `server/storage.ts` is a 15-line placeholder comment — no storage abstraction exists. All DB access (`db.select()`, `db.insert()`, etc.) is scattered directly in 41 router files, making unit testing and backend swaps impractical
- Inconsistent schema import paths in server: 35 use `@shared/schema`, 10 use `../../../shared/schema`, 5 use `../../shared/schema`, 1 uses `../shared/schema` — should be unified to the alias
- Fat routers: `recipes.router.ts` (1,275 lines), `appliances.router.ts` (866 lines), `sync.router.ts` (858 lines) contain business logic that belongs in service modules. Only 6 service files exist for 41 routers
- Services layer is thin (6 files totaling ~2,000 lines) relative to routers (41 files totaling ~12,100 lines) — logic bleeds into route handlers

**Score Justification:** Good structural skeleton with DDD aspirations, but the storage abstraction gap and fat routers undermine the clean architecture intent.

---

### 3. File Size & Complexity (B-)

**Strengths:**
- Schema file is large (1,494 lines) but justified — single source of truth for all data models with thorough JSDoc
- `shelf-life-data.ts` (1,108 lines) is a data file, not logic — acceptable

**Weaknesses:**
- **13 files exceed 1,000 lines** (excluding tests and data files):
  - `OnboardingScreen.tsx` — **3,153 lines** (should be split into step components)
  - `chat-actions.ts` — **1,720 lines** (server-side AI actions monolith)
  - `AddItemScreen.tsx` — **1,435 lines**
  - `storage.ts` (client) — **1,433 lines**
  - `ChatModal.tsx` — **1,415 lines**
  - `recipes.router.ts` — **1,275 lines**
  - `SettingsScreen.tsx` — **1,207 lines**
  - `ProfileScreen.tsx` — **1,160 lines**
  - `ReceiptScanScreen.tsx` — **1,092 lines**
  - `AddFoodBatchScreen.tsx` — **1,089 lines**
  - `sync-manager.ts` — **1,072 lines**
  - `SubscriptionScreen.tsx` — **1,068 lines**
  - `AuthContext.tsx` — **972 lines**
- An additional **7 files are 800–999 lines**, approaching the danger zone
- `OnboardingScreen.tsx` at 3,153 lines is a major maintainability concern — likely contains multiple step/stage sub-components that should be extracted

**Score Justification:** Too many oversized files. The codebase has 20+ files over 800 lines, creating cognitive load and merge conflict risks.

---

### 4. Testing (B)

**Strengths:**
- 45 test files total: 37 client-side + 8 server-side
- Comprehensive client test coverage: auth, subscription, sync, storage, notifications, voice, nutrition, shelf life, recipes, cookware, cooking terms, waste reduction, onboarding, image analysis, offline mutations
- Individual test scripts per domain (e.g., `npm run test:auth`, `npm run test:sync`)
- Jest configured with proper module aliases (`@/`, `@shared/`), `jest-expo` preset
- `supertest` available for HTTP-level testing
- Coverage collection configured for `client/**/*.{ts,tsx}`

**Weaknesses:**
- **No integration tests** — all tests are unit tests with mocked dependencies. Zero tests that exercise real HTTP requests → DB → response chains
- **Server test coverage is sparse** — only 8 test files for 41 routers and 6 services. Missing tests for: auth flows, sync endpoints, subscription lifecycle, webhook handlers, background jobs, social auth
- **No test for `chat-actions.ts`** (1,720 lines of AI action logic) — high-risk untested code
- Test match pattern (`**/__tests__/**`) excludes `client/hooks/useSubscription.test.ts` and `client/lib/*.test.ts` which are outside `__tests__/` directories — these may not run in CI
- **No coverage thresholds** configured in Jest — coverage can silently degrade

**Score Justification:** Good breadth of client-side unit tests, but the absence of integration tests and low server-side coverage leave critical paths untested.

---

### 5. Code Hygiene & Consistency (A-)

**Strengths:**
- **Zero TODO/FIXME/HACK/XXX comments** in the entire codebase — clean and intentional
- Structured logger used consistently: ~300+ `logger.*` calls across server and client vs only 5 files with `console.*` (mostly in logger implementations and scripts, not app code)
- ESLint + Prettier configured with `eslint-config-expo`, `eslint-plugin-prettier`, and `eslint-plugin-jsx-a11y`
- Consistent API response format: all endpoints use `successResponse()` / `errorResponse()` wrappers
- Custom `AppError` class with `statusCode`, `errorCode`, `isOperational` for structured error handling
- `asyncHandler` wrapper prevents unhandled promise rejections in Express routes
- Migrations managed through `drizzle-kit generate` (versioned SQL files) not `push`

**Weaknesses:**
- Knip analysis reveals **5 unused dependencies** (`@google-cloud/storage`, `@mdi/js`, `@react-navigation/elements`, `react-dom`, `yaml`) and **7 unused devDependencies** — adding bundle weight and confusion
- **2 duplicate exports** found: `useTheme|useAppTheme` in `client/hooks/useTheme.ts` and `logger|default` in `client/lib/logger.ts`
- Knip not integrated into CI — dead code can accumulate undetected
- **71 raw `await fetch()` calls** in client code outside `AuthContext` — no centralized HTTP client. Screens like `SettingsScreen`, `SubscriptionScreen`, `RecipeDetailScreen` each build their own fetch logic with manual headers, error handling, and base URL construction
- Duplicated platform-aware patterns: `crash-reporter.ts` and `crash-reporter.web.ts`, `logger.ts` (client) and `logger.ts` (server) have 2 exported symbols each with the same name

**Score Justification:** Excellent discipline on TODOs and logging, but unused dependencies and the missing HTTP client abstraction on the client side hurt consistency.

---

### 6. Input Validation (B+)

**Strengths:**
- Sync data uses shared Zod schemas (`syncInventoryItemSchema`, `syncRecipeSchema`, etc.) validated before DB writes
- Import endpoint validates all arrays AND JSONB sections with up to 20 detailed error messages
- Auth registration/login routes validate input
- Drizzle insert schemas provide column-level type validation

**Weaknesses:**
- **~20 route handlers destructure `req.body` directly** without Zod/schema validation: `voice.router.ts`, `suggestions.router.ts`, `nutrition.router.ts`, `appliances.router.ts`, `donations.router.ts`, `auth/login.ts`, `auth/register.ts`, `auth/password-reset.ts`, `auth/account-settings.ts`
- No middleware-level validation pattern — each router manually validates (or doesn't). A `zod-express` middleware would enforce consistency

**Score Justification:** Strong validation on the sync/import path, but many CRUD routes skip formal validation.

---

### 7. Documentation (A)

**Strengths:**
- `replit.md` is comprehensive (120 lines): covers architecture, sync patterns, migration workflow, GDPR, token encryption, disaster recovery, background jobs, image pipeline
- `shared/schema.ts` has thorough JSDoc on all 1,494 lines
- `server/lib/unit-conversion.ts` has 23 JSDoc blocks — highest density of any lib file
- Error middleware has clear JSDoc explaining `AppError` usage
- `server/storage.ts` placeholder explicitly documents the design decision and future path

**Weaknesses:**
- Most service files (5 of 6) have **zero JSDoc** — `imageProcessingService.ts`, `notificationService.ts`, `nutritionLookupService.ts`, `objectStorageService.ts`, `recipeGenerationService.ts` all lack function-level documentation
- Domain layer files (`shared/domain/*.ts`) lack usage examples
- No ADR (Architecture Decision Record) format for key decisions

**Score Justification:** Excellent project-level documentation; function-level docs are inconsistent.

---

## Overall Grade: B+

| Sub-category | Grade | Weight | Notes |
|---|---|---|---|
| Type Safety | B+ | 15% | Strict TS, but 227 `any` usages |
| Code Organization | B+ | 20% | Good DDD skeleton, fat routers, no storage layer |
| File Size & Complexity | B- | 15% | 13 files >1,000 lines, OnboardingScreen at 3,153 |
| Testing | B | 20% | 45 tests but no integration tests, sparse server coverage |
| Code Hygiene | A- | 15% | Zero TODOs, structured logging, but 5+ unused deps |
| Input Validation | B+ | 10% | Strong on sync, weak on CRUD routes |
| Documentation | A | 5% | Excellent project docs, inconsistent function docs |

**Previous grade: A-** → **Revised grade: B+** (deeper analysis revealed more weaknesses than surface-level review caught)

---

## Remediation Steps (Priority Order)

**Step 1 — Eliminate `any` types in critical paths (High Impact)**
```
Audit all 227 `any` usages. Priority targets:
(1) AuthContext.tsx: Replace 7 `as any` casts with typed API response interfaces (e.g., `interface AuthResponse { data: { token: string; user: User } }`)
(2) Navigation: Define a proper RootStackParamList type and use typed useNavigation<NativeStackNavigationProp<RootStackParamList>>() — eliminates 10+ `as any` casts on navigate()
(3) RecipeDetailScreen/GenerateRecipeScreen: Type the `.filter((a: any) => ...)` callbacks with the actual appliance type from schema
(4) Web screens: Create a `webStyles` utility that returns typed `ViewStyle` objects instead of using `cursor: "pointer" as any`
Goal: Reduce `any` count from 227 to under 30.
```

**Step 2 — Extract OnboardingScreen.tsx and other oversized files**
```
Split the 13 files exceeding 1,000 lines:
(1) OnboardingScreen.tsx (3,153 lines): Extract each onboarding step into its own component in client/components/onboarding/ (e.g., WelcomeStep, DietaryStep, InventoryStep). The parent screen becomes a step controller.
(2) chat-actions.ts (1,720 lines): Split into action-specific modules: chat-inventory-actions.ts, chat-recipe-actions.ts, chat-waste-actions.ts
(3) AuthContext.tsx (972 lines): Extract auth API calls → client/lib/auth-api.ts, token storage → client/lib/auth-storage.ts, biometric flow → client/hooks/useBiometricLogin.ts
(4) sync-manager.ts (1,072 lines): Extract conflict resolution, queue coalescing, and offline support into focused modules
Target: No non-data file exceeds 800 lines.
```

**Step 3 — Centralize client HTTP calls**
```
Create client/lib/api-client.ts with a typed fetch wrapper that:
(1) Reads base URL from environment/config
(2) Attaches auth headers automatically from AuthContext
(3) Handles standard error responses with typed error codes
(4) Returns typed responses via generics: `apiClient.get<RecipeResponse>("/api/recipes")`
Replace the 71 raw `await fetch()` calls across screens to use this wrapper.
This eliminates duplicated header construction, base URL logic, and error handling.
```

**Step 4 — Add integration tests for critical server flows**
```
Create server/__tests__/integration/ directory with supertest-based tests:
(1) auth-flow.test.ts: Register → Login → Token validation → Protected route → Logout
(2) sync-flow.test.ts: POST inventory → GET paginated → Conflict resolution
(3) subscription-flow.test.ts: Create checkout → Webhook delivery → Feature gating
(4) recipe-flow.test.ts: Generate recipe → Save → Retrieve → Delete
Use a test database (DATABASE_URL_TEST) with setup/teardown scripts.
Add coverage thresholds to Jest config: statements 60%, branches 50%, functions 60%, lines 60%.
```

**Step 5 — Clean up dead code and unify imports**
```
(1) Remove 5 unused dependencies: @google-cloud/storage, @mdi/js, @react-navigation/elements, react-dom, yaml
(2) Remove 7 unused devDependencies or confirm they're used by the ESLint flat config
(3) Fix 2 duplicate exports: choose one name for useTheme/useAppTheme and logger/default
(4) Unify schema imports: replace all 16 relative imports (../../shared/schema, ../../../shared/schema) with @shared/schema alias
(5) Add "ci:knip": "npx knip --no-exit-code" to package.json scripts and run in CI
```

**Step 6 — Add Zod validation to remaining route handlers**
```
Create a reusable Express middleware:
  export const validate = (schema: ZodSchema) => (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) return res.status(400).json(errorResponse("Validation failed", "VALIDATION_ERROR", result.error.flatten()));
    req.body = result.data;
    next();
  };
Apply to the ~20 routes that currently destructure req.body without validation: voice.router, suggestions.router, donations.router, auth/login, auth/register, auth/password-reset, etc.
```

**Step 7 — Move business logic from routers to services**
```
Create service modules for the 3 fattest routers:
(1) server/services/recipeService.ts: Extract recipe CRUD, generation orchestration, and image handling from recipes.router.ts (1,275 lines)
(2) server/services/applianceService.ts: Extract appliance management logic from appliances.router.ts (866 lines)
(3) server/services/syncService.ts: Extract sync orchestration from sync.router.ts (858 lines)
Each router file should shrink to <200 lines of pure HTTP plumbing (parse request, call service, send response).
```
