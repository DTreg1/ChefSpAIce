import { test, expect } from '@playwright/test';

test.describe('Cookbook Management', () => {
  test('cookbook page redirects unauthenticated users', async ({ page }) => {
    await page.goto('/cookbook');
    await page.waitForLoadState('networkidle');
    
    // Should see auth UI for unauthenticated users
    await expect(page.getByTestId('tab-signup')).toBeVisible({ timeout: 10000 });
  });

  test('recipes API requires authentication', async ({ request }) => {
    const response = await request.get('/api/v1/recipes');
    expect(response.status()).toBe(401);
  });

  test('recipe creation requires authentication', async ({ request }) => {
    const response = await request.post('/api/v1/recipes', {
      data: { title: 'Test Recipe', ingredients: ['test'], instructions: ['test'] }
    });
    expect(response.status()).toBe(401);
  });

  test('cookbook favorites API requires authentication', async ({ request }) => {
    const response = await request.get('/api/v1/recipes/favorites');
    expect(response.status()).toBe(401);
  });
});
