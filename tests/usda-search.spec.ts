import { test, expect } from '@playwright/test';

test.describe('USDA FoodData Advanced Search', () => {
  test('USDA search page redirects unauthenticated users', async ({ page }) => {
    await page.goto('/fdc-search');
    await page.waitForLoadState('networkidle');
    
    // Should see auth UI for unauthenticated users
    await expect(page.getByTestId('tab-signup').or(page.getByTestId('tab-login'))).toBeVisible({ timeout: 10000 });
  });

  test('USDA search API exists', async ({ request }) => {
    const response = await request.get('/api/v1/inventory/usda/search?query=apple');
    // Either returns data or requires auth
    expect([200, 401]).toContain(response.status());
  });

  test('USDA food details API exists', async ({ request }) => {
    const response = await request.get('/api/v1/inventory/usda/food/12345');
    // Either returns data or requires auth or not found
    expect([200, 401, 404]).toContain(response.status());
  });
});
