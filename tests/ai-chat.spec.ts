import { test, expect } from '@playwright/test';

test.describe('AI Chat and Recipe Generation', () => {
  test('chat page redirects unauthenticated users', async ({ page }) => {
    // Navigate to the protected chat page
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');
    
    // Should redirect to auth UI with signup/login tabs
    await expect(page.getByTestId('tab-signup')).toBeVisible({ timeout: 10000 });
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

  test('chat conversations API exists', async ({ request }) => {
    const response = await request.get('/api/v1/chat/conversations');
    // Either returns data for public access or requires auth
    expect([200, 401]).toContain(response.status());
  });

  test('recipe generation API requires authentication', async ({ request }) => {
    const response = await request.post('/api/v1/recipes/generate', {
      data: { ingredients: ['chicken', 'rice'] }
    });
    expect(response.status()).toBe(401);
  });
});
