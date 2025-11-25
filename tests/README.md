# ChefSpAIce Test Suite

## Running Tests

### Prerequisites
The tests use Playwright for end-to-end testing. Playwright is already installed.

### Running All Tests
```bash
npx playwright test
```

### Running Tests with UI Mode
```bash
npx playwright test --ui
```

### Running Tests in Headed Mode (See Browser)
```bash
npx playwright test --headed
```

### Running Specific Test Suites

#### Authentication & Onboarding Tests
```bash
npx playwright test tests/auth.spec.ts
```

#### Food Inventory Management Tests
```bash
npx playwright test tests/food-inventory.spec.ts
```

#### AI Chat & Recipe Generation Tests
```bash
npx playwright test tests/ai-chat.spec.ts
```

#### Meal Planning & Shopping List Tests
```bash
npx playwright test tests/meal-planning.spec.ts
```

#### Barcode Scanning Tests
```bash
npx playwright test tests/barcode-scanning.spec.ts
```

#### Donation & Stripe Integration Tests
```bash
npx playwright test tests/donations.spec.ts
```

#### Nutrition Features Tests
```bash
npx playwright test tests/nutrition.spec.ts
```

#### API Endpoint Tests (Comprehensive)
```bash
npx playwright test tests/api-endpoints.spec.ts
```

### Debugging Tests
```bash
npx playwright test --debug
```

### Generate Test Code (Codegen)
```bash
npx playwright codegen
```

### View Test Report
After running tests:
```bash
npx playwright show-report
```

## Test Coverage

The test suite covers:

1. **API Endpoint Testing** (Phase 4 Comprehensive - 60 tests)
   - Health & Status endpoints (/health, /api/v1/info)
   - User Domain endpoints (inventory, recipes, meal-plans, shopping-list, chat, appliances, nutrition)
   - Admin Domain endpoints (users, experiments, cohorts, maintenance, pricing, moderation, ai-metrics)
   - AI Domain endpoints (content, analysis, media)
   - Platform Domain endpoints (analytics, notifications, activities, batch, feedback)
   - Specialized Services (fraud-detection, scheduling)
   - Backward compatibility validation (legacy /api/* paths)
   - Error handling consistency (JSON responses, proper status codes)
   - Authentication flow testing
   - Response headers validation
   - Critical route verification
   
   **Security Enforcement:**
   - All admin endpoints require authentication + admin role at router level
   - Tests strictly verify 401 Unauthorized for:
     - All `/api/v1/admin/*` endpoints
     - `/api/v1/shopping-list` and `/api/v1/shopping-list/items`
     - `/api/v1/inventory` and `/api/v1/food-items`
   - Other endpoints verify existence (not 404) and stability (not 500)
   - Public endpoints may return 200 for read operations
   
   **Helper Functions:**
   - `expectProtectedEndpoint()` - Verifies 401 response with JSON error
   - `expectEndpointExists()` - Verifies endpoint exists (200 or 401, not 404/500)
   - `expectAdminEndpoint()` - Verifies admin endpoints require auth (401)
   - `expectLegacyEndpointWorks()` - Verifies legacy paths still work

2. **Authentication & User Management**
   - Landing page display
   - Login/logout flows
   - Onboarding process
   - User preferences

3. **Food Inventory Management**
   - Adding/editing/deleting food items
   - Storage location management
   - Expiration tracking
   - Food categorization
   - Search functionality
   - Bulk item addition

3. **AI-Powered Features**
   - Chat interface
   - Recipe generation
   - Recipe customization
   - Recipe saving to cookbook
   - Ingredient availability checking

4. **Meal Planning**
   - Calendar interface
   - Adding/moving meals
   - Shopping list generation
   - Shopping list management
   - Export functionality

5. **Barcode Scanning**
   - Product lookup
   - Adding scanned items
   - Appliance recognition
   - Error handling

6. **Donations & Payments**
   - Donation tiers
   - Custom amounts
   - Stripe integration
   - Payment processing
   - Success/failure handling

7. **Nutritional Analysis**
   - Nutrition dashboard
   - USDA FoodData search
   - Nutritional facts display
   - Goal tracking
   - Unit conversion
   - Trend analysis

## Test Configuration

Tests are configured in `playwright.config.ts` with:
- Base URL: http://localhost:5000
- Browser: Chromium
- Automatic screenshots on failure
- Video recording on failure
- Trace collection on retry
- Development server auto-start

## Writing New Tests

When adding new tests:
1. Use meaningful test IDs (data-testid) in your components
2. Follow the existing test structure
3. Use descriptive test names
4. Handle async operations properly
5. Clean up test data when needed

## Continuous Integration

To run tests in CI:
```bash
CI=true npx playwright test
```

This will:
- Run tests in headless mode
- Enable retries (2 attempts)
- Use a single worker
- Generate HTML report