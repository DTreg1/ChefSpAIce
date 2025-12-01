import { test, expect } from '@playwright/test';

test.describe('Nutrition Features', () => {
  test('nutrition page redirects unauthenticated users', async ({ page }) => {
    await page.goto('/nutrition');
    await page.waitForLoadState('networkidle');
    
    // Should see auth UI for unauthenticated users
    await expect(page.getByTestId('tab-signup').or(page.getByTestId('tab-login'))).toBeVisible({ timeout: 10000 });
  });

  test('nutrition API requires authentication', async ({ request }) => {
    const response = await request.get('/api/v1/nutrition');
    expect(response.status()).toBe(401);
  });

  test('USDA search API exists', async ({ request }) => {
    const response = await request.get('/api/v1/inventory/usda/search?query=apple');
    // Either returns data or requires auth
    expect([200, 401]).toContain(response.status());
  });

  test('nutrition goals API requires authentication', async ({ request }) => {
    const response = await request.get('/api/v1/nutrition/goals');
    expect(response.status()).toBe(401);
  });
});
