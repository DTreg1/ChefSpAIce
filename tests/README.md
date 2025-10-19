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

1. **Authentication & User Management**
   - Landing page display
   - Login/logout flows
   - Onboarding process
   - User preferences

2. **Food Inventory Management**
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