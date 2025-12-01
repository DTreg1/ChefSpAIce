import { test, expect } from '@playwright/test';

test.describe('Food Groups Page', () => {
  test('food groups page redirects unauthenticated users', async ({ page }) => {
    await page.goto('/food-groups');
    await page.waitForLoadState('networkidle');
    
    // Should redirect to landing page
    await expect(page.getByTestId('tab-signup').or(page.getByTestId('tab-login'))).toBeVisible({ timeout: 10000 });
  });

  test('food categories API endpoint exists', async ({ request }) => {
    const response = await request.get('/api/v1/food-categories');
    // Either returns data or requires auth
    expect([200, 401]).toContain(response.status());
  });

  test('USDA food data API exists', async ({ request }) => {
    const response = await request.get('/api/v1/inventory/usda/search?query=apple');
    // Should work for search queries
    expect([200, 401]).toContain(response.status());
  });
});
