import { test, expect } from '@playwright/test';

test.describe('Meal Planning and Shopping List', () => {
  test('meal planner page redirects unauthenticated users', async ({ page }) => {
    await page.goto('/meal-planner');
    await page.waitForLoadState('networkidle');
    
    // Should see auth UI for unauthenticated users
    await expect(page.getByTestId('tab-signup')).toBeVisible({ timeout: 10000 });
  });

  test('shopping list page redirects unauthenticated users', async ({ page }) => {
    await page.goto('/shopping-list');
    await page.waitForLoadState('networkidle');
    
    // Should see auth UI for unauthenticated users  
    await expect(page.getByTestId('tab-signup')).toBeVisible({ timeout: 10000 });
  });

  test('meal plans API requires authentication', async ({ request }) => {
    const response = await request.get('/api/v1/meal-plans');
    expect(response.status()).toBe(401);
  });

  test('shopping list API requires authentication', async ({ request }) => {
    const response = await request.get('/api/v1/shopping-list');
    expect(response.status()).toBe(401);
  });

  test('meal plan creation requires authentication', async ({ request }) => {
    const response = await request.post('/api/v1/meal-plans', {
      data: { date: '2024-01-01', meals: [] }
    });
    expect(response.status()).toBe(401);
  });
});
