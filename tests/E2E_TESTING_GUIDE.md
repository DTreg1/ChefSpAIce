# E2E Testing Guide for ChefSpAIce

## Overview

This guide explains how to run end-to-end (e2e) tests for the complete user flow: registration, onboarding, logout, and login.

## Test File

**`e2e-user-flow.spec.ts`** - Comprehensive e2e tests covering:
- Landing page and authentication UI
- User registration flow
- Onboarding process
- Main application usage
- Logout functionality
- Login back in

## Prerequisites

### 1. Environment Setup

Create a `.env` file in the project root with the following variables:

```bash
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/myapp
SESSION_SECRET=your-test-secret-key
VITE_API_URL=http://localhost:5000
REPLIT_DOMAINS=localhost,127.0.0.1
CACHE_ENABLED=false
```

### 2. Database Setup

```bash
# Start PostgreSQL
sudo service postgresql start

# Create test database
sudo -u postgres psql -c "CREATE DATABASE myapp;"
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';"

# Push schema
npm run db:push
```

### 3. Install Dependencies

```bash
npm install
npx playwright install chromium
```

## Running the Tests

### Option 1: With Playwright's Built-in Server

This is the easiest option as Playwright automatically starts and stops the server:

```bash
npx playwright test tests/e2e-user-flow.spec.ts
```

**Note**: This requires that the authentication system can be initialized. If you encounter network errors related to Replit Auth, see "Authentication Challenges" below.

### Option 2: With a Running Dev Server

Start the dev server manually, then run tests against it:

```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Run tests
PLAYWRIGHT_TEST_BASE_URL=http://localhost:5000 npx playwright test tests/e2e-user-flow.spec.ts
```

### Option 3: Headed Mode (See Browser)

Watch the tests run in a real browser:

```bash
npx playwright test tests/e2e-user-flow.spec.ts --headed
```

### Option 4: Debug Mode

Step through tests interactively:

```bash
npx playwright test tests/e2e-user-flow.spec.ts --debug
```

### Option 5: UI Mode (Recommended for Development)

Use Playwright's UI mode for the best development experience:

```bash
npx playwright test tests/e2e-user-flow.spec.ts --ui
```

## Test Coverage

### 1. Landing Page Tests

- ✅ Sign-up and login tabs
- ✅ Authentication provider buttons (Google, GitHub, X, Apple, Email)
- ✅ Welcome messages and branding
- ✅ Tab switching between sign-up and login

### 2. Onboarding Tests

- ✅ Storage area selection (Refrigerator, Freezer, Pantry, Counter)
- ✅ Custom storage area creation
- ✅ Household size configuration
- ✅ Cooking skill level selection
- ✅ Unit preference (metric/imperial)
- ✅ Dietary restrictions selection
- ✅ Allergen selection
- ✅ Foods to avoid management
- ✅ Common items selection
- ✅ Kitchen equipment selection
- ✅ Form validation
- ✅ Submission and redirect to main app

### 3. Complete User Journey

- ✅ Landing page → Authentication UI
- ✅ Registration flow (UI validation)
- ✅ Onboarding completion
- ✅ Main app access
- ✅ Settings page navigation
- ✅ Logout functionality
- ✅ Return to landing page
- ✅ Login UI display

### 4. Edge Cases

- ✅ Unauthenticated access to protected routes
- ✅ Redirect behavior for authenticated users
- ✅ Protection of authenticated-only pages

## Authentication Challenges

### Problem

The application uses **Replit OAuth** for authentication, which requires:
- External network access to `replit.com`
- Valid OAuth client credentials (`REPL_ID`, client secret)
- Interactive user authentication flow

### Test Environment Limitations

In automated test environments, you may encounter:
- Network restrictions preventing access to `replit.com`
- No valid OAuth credentials for testing
- Cannot simulate interactive OAuth flow

### Solutions

#### Option A: Mock Authentication (Recommended for CI/CD)

Create a mock authentication middleware for testing:

1. Create `server/middleware/mockAuth.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';

// Extend Express Request type for authentication
interface AuthenticatedRequest extends Request {
  isAuthenticated?: () => boolean;
  user?: {
    claims: {
      sub: string;
      email: string;
      name: string;
    };
  };
}

export const mockAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV === 'test') {
    req.isAuthenticated = () => true;
    req.user = {
      claims: {
        sub: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User'
      }
    };
  }
  next();
};
```

2. Update authentication setup to use mock in test environment

#### Option B: Playwright Storage State

Save an authenticated session and reuse it:

```typescript
// setup.ts
import { test as setup } from '@playwright/test';

setup('authenticate', async ({ page }) => {
  // Perform authentication
  await page.goto('/');
  // ... complete auth flow ...
  
  // Save authenticated state
  await page.context().storageState({ 
    path: 'playwright/.auth/user.json' 
  });
});
```

Then use it in tests:

```typescript
import { test } from '@playwright/test';

test.use({ storageState: 'playwright/.auth/user.json' });
```

#### Option C: Test Without Backend

Run tests that only validate UI components:

```bash
# Tests will skip backend-dependent assertions
npx playwright test tests/e2e-user-flow.spec.ts
```

## Continuous Integration

For CI/CD pipelines (GitHub Actions, GitLab CI, etc.):

```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: myapp
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright
        run: npx playwright install chromium --with-deps
        # Note: Installing only Chromium to optimize CI performance and cost.
        # For full cross-browser testing, use: npx playwright install --with-deps
      
      - name: Setup database
        run: npm run db:push
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/myapp
      
      - name: Run E2E tests
        run: npx playwright test
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/myapp
          SESSION_SECRET: test-secret
          REPLIT_DOMAINS: localhost
          NODE_ENV: test
      
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

## Troubleshooting

### Issue: "Cannot find package '@playwright/test'"

```bash
npm install
npx playwright install
```

### Issue: "DATABASE_URL must be set"

Ensure `.env` file exists with proper `DATABASE_URL` configuration.

### Issue: "getaddrinfo ENOTFOUND replit.com"

The server cannot reach Replit's OAuth service. Options:
1. Mock authentication (see "Option A" above)
2. Skip backend-dependent tests
3. Configure network access to replit.com

### Issue: Tests timing out

Increase timeout in `playwright.config.ts`:

```typescript
use: {
  timeout: 60000, // 60 seconds
}
```

### Issue: "Session not found"

Clear test artifacts and restart:

```bash
rm -rf test-results
rm -rf playwright-report
npx playwright test tests/e2e-user-flow.spec.ts
```

## Test Data Cleanup

After running tests, you may want to clean up test data:

```bash
# Reset database
npm run db:push

# Or manually:
sudo -u postgres psql -d myapp -c "TRUNCATE users, food_items, storage_locations CASCADE;"
```

## Best Practices

1. **Isolate Tests**: Each test should be independent
2. **Use Test IDs**: Component test IDs make tests more resilient
3. **Proper Waits**: Use `waitFor` instead of arbitrary timeouts
4. **Visual Regression**: Consider adding screenshot comparisons
5. **Accessibility**: Test with accessibility tools
6. **Mobile**: Test responsive behavior

## Additional Resources

- [Playwright Documentation](https://playwright.dev)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [ChefSpAIce Test README](./README.md)

## Contributing

When adding new e2e tests:

1. Follow the existing test structure
2. Add appropriate test IDs to components
3. Update this guide with new test coverage
4. Ensure tests work in CI environment
