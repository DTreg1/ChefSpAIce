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

Maestro needs your app's bundle identifier. Set the `APP_ID` environment variable before running:

```bash
# iOS
APP_ID=com.chefspaice.app maestro test e2e/

# Android
APP_ID=com.chefspaice.app maestro test e2e/
```

Or set it in a `.env.maestro` file at the project root:

```
APP_ID=com.chefspaice.app
```

## Test Flows

| Flow | File | Description |
|------|------|-------------|
| Authentication | `auth-flow.yaml` | Sign up with unique email, complete onboarding, verify main tabs |
| Inventory | `inventory-flow.yaml` | Add item, verify it appears, swipe to delete, verify removal |
| Recipes | `recipe-flow.yaml` | Navigate to recipes tab, attempt recipe generation, handle subscription prompt |
| Settings | `settings-flow.yaml` | Navigate to profile/settings, verify profile info, toggle theme |

### Flow Dependencies

- `inventory-flow.yaml`, `recipe-flow.yaml`, and `settings-flow.yaml` all depend on `auth-flow.yaml` (run via `runFlow`).
- Each flow creates a fresh authenticated session before testing its feature.

## How to Add New Flows

1. Create a new `.yaml` file in `e2e/`:

   ```yaml
   appId: ${APP_ID}
   name: My New Flow
   ---

   # If authentication is needed:
   - runFlow: auth-flow.yaml

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

5. See the [Maestro docs](https://maestro.mobile.dev/) for the full command reference.

## Known Limitations

- **Maestro runs on local machine only** — It requires a connected emulator/simulator or physical device. It cannot run in cloud CI without a Maestro Cloud account or self-hosted device farm.
- **No Expo Go support** — Maestro requires a development build (`expo run:ios` / `expo run:android`), not Expo Go.
- **Platform differences** — Some interactions (e.g., swipe gestures, system dialogs) may behave differently between iOS and Android. Test on both platforms when possible.
- **OAuth / third-party auth** — Apple Sign-In and Google Sign-In cannot be tested via Maestro as they launch system-level auth flows. The email/password auth path is tested instead.
- **Subscription flows** — In-app purchases (RevenueCat / StoreKit) require sandbox accounts and real devices. The recipe flow checks for the upgrade prompt but cannot complete a purchase.
- **Timing sensitivity** — Network-dependent operations (recipe generation, syncing) use generous timeouts but may still fail on very slow connections. Adjust `timeout` values as needed.
- **Unique test data** — The auth flow generates unique emails using timestamps. Old test accounts are not cleaned up automatically. Implement server-side cleanup if test data accumulates.
