import { test, expect } from '@playwright/test';

test.describe('AI Chat and Recipe Generation', () => {
  test('chat page redirects unauthenticated users', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Should see auth UI for unauthenticated users
    await expect(page.getByTestId('tab-signup').or(page.getByTestId('tab-login'))).toBeVisible({ timeout: 10000 });
  });

  test('chat API endpoint requires authentication', async ({ request }) => {
    const response = await request.post('/api/v1/chat/messages', {
      data: { message: 'Hello' }
    });
    expect(response.status()).toBe(401);
  });

  test('recipes API endpoint requires authentication', async ({ request }) => {
    const response = await request.get('/api/v1/recipes');
    expect(response.status()).toBe(401);
  });

  test('chat conversations API requires authentication', async ({ request }) => {
    const response = await request.get('/api/v1/chat/conversations');
    expect(response.status()).toBe(401);
  });

  test('recipe generation API requires authentication', async ({ request }) => {
    const response = await request.post('/api/v1/recipes/generate', {
      data: { ingredients: ['chicken', 'rice'] }
    });
    expect(response.status()).toBe(401);
  });
});
