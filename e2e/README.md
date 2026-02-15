# Maestro E2E Test Suite

End-to-end test flows for ChefSpAIce using [Maestro](https://maestro.mobile.dev/).

## Prerequisites

1. **Maestro CLI** — Install following the [official guide](https://maestro.mobile.dev/getting-started/installing-maestro):

   ```bash
   # macOS / Linux
   curl -Ls "https://get.maestro.mobile.dev" | bash

   # Windows (via WSL)
   curl -Ls "https://get.maestro.mobile.dev" | bash
   ```

2. **Running emulator or simulator**
   - **iOS**: Xcode Simulator (macOS only)
   - **Android**: Android emulator via Android Studio, or a physical device with USB debugging

3. **App installed on the device/emulator** — Build and install a development build:
   ```bash
   npx expo run:ios    # iOS simulator
   npx expo run:android # Android emulator
   ```

## Running Tests

Run all test flows:

```bash
maestro test e2e/
```

Run a single flow:

```bash
maestro test e2e/auth-flow.yaml
```

### Adding the npm script

Add the following to `package.json` under `"scripts"`:

```json
"test:e2e": "maestro test e2e/"
```

Then run with:

```bash
npm run test:e2e
```

### Setting the App ID

The app bundle identifier is hardcoded in each flow as `com.chefspaice.chefspaice`. If your bundle ID differs, update the `appId` field at the top of each `.yaml` file.

## Shared Test Account

All test flows (except `onboarding-flow.yaml`) use a **single shared test account** defined in `helpers/test-account.js`:

- **Email**: `maestro-e2e@chefspaice.test`
- **Password**: `MaestroTest@2026!`

This ensures consistent, reproducible test runs. The `auth-flow.yaml` handles both first-run sign-up and subsequent sign-in automatically.

The `onboarding-flow.yaml` is the exception — it creates a fresh unique account each run to test the new-user onboarding experience.

## Logging

Every test flow includes `evalScript` logging at key steps, prefixed with `LOG:`. These logs appear in Maestro's console output and help trace test execution:

```
LOG: Starting auth flow
LOG: App launched, waiting for auth screen
LOG: Sign in succeeded, main tabs visible
LOG: Starting inventory flow
LOG: Inventory item added successfully
```

## Test Flows

| Flow | File | Description |
|------|------|-------------|
| Authentication | `auth-flow.yaml` | Sign in (or sign up on first run), handle onboarding, verify main tabs |
| Inventory | `inventory-flow.yaml` | Add item manually, verify it appears, swipe to delete, verify removal |
| Recipes | `recipe-flow.yaml` | Navigate to recipes tab, attempt generation, handle subscription/upgrade prompt |
| Settings | `settings-flow.yaml` | Navigate to profile/settings, toggle theme, verify settings persist |
| Onboarding | `onboarding-flow.yaml` | Create fresh account, step through full onboarding flow, reach main tabs |
| Subscription | `subscription-flow.yaml` | Navigate to subscription settings, verify status and subscription UI elements |
| Meal Plan | `mealplan-flow.yaml` | Navigate to meal plan tab, verify week view and meal slot elements |
| Cookware | `cookware-flow.yaml` | Navigate to cookware tab, verify cookware screen elements |
| Profile | `profile-flow.yaml` | Navigate to profile tab, verify profile elements and sign-out button presence |

### Flow Dependencies

- All flows except `onboarding-flow.yaml` depend on `auth-flow.yaml` (run via `runFlow`) using the shared test account.
- `onboarding-flow.yaml` is standalone and uses a unique email each run.
- Each flow launches the app and authenticates before testing its feature.

## How to Add New Flows

1. Create a new `.yaml` file in `e2e/`:

   ```yaml
   appId: com.chefspaice.chefspaice
   name: My New Flow
   ---

   # Log test start
   - evalScript: "console.log('LOG: Starting my new flow')"

   # If authentication is needed:
   - runFlow: auth-flow.yaml

   # Log a checkpoint
   - evalScript: "console.log('LOG: Auth complete, beginning test')"

   # Interact with elements using testID:
   - tapOn:
       id: "my-test-id"

   # Assert visibility:
   - assertVisible:
       text: "Expected Text"

   # Input text:
   - tapOn:
       id: "input-field"
   - inputText: "Hello World"
   ```

2. Reference elements using `id:` for React Native `testID` attributes, or `text:` for visible text/placeholder content. All native screens and components use `testID` (web-only files under `components/landing/` and `screens/web/` use `data-testid` instead, but those are not targeted by Maestro).

3. Use `extendedWaitUntil` for elements that load asynchronously:

   ```yaml
   - extendedWaitUntil:
       visible:
         id: "my-element"
       timeout: 10000
   ```

4. Use `optional: true` on steps that may not always be present (e.g., conditional UI).

5. Add `evalScript` logging at key checkpoints for traceability:

   ```yaml
   - evalScript: "console.log('LOG: Completed step X')"
   ```

6. See the [Maestro docs](https://maestro.mobile.dev/) for the full command reference.

## Known Limitations

- **Maestro runs on local machine only** — It requires a connected emulator/simulator or physical device. It cannot run in cloud CI without a Maestro Cloud account or self-hosted device farm.
- **No Expo Go support** — Maestro requires a development build (`expo run:ios` / `expo run:android`), not Expo Go.
- **Platform differences** — Some interactions (e.g., swipe gestures, system dialogs) may behave differently between iOS and Android. Test on both platforms when possible.
- **OAuth / third-party auth** — Apple Sign-In and Google Sign-In cannot be tested via Maestro as they launch system-level auth flows. The email/password auth path is tested instead.
- **Subscription flows** — In-app purchases (RevenueCat / StoreKit) require sandbox accounts and real devices. The subscription flow verifies UI elements but cannot complete a purchase.
- **Timing sensitivity** — Network-dependent operations (recipe generation, syncing) use generous timeouts but may still fail on very slow connections. Adjust `timeout` values as needed.
- **Shared account** — The shared test account accumulates data across runs. If test isolation is needed, consider adding cleanup steps or server-side test data reset.
