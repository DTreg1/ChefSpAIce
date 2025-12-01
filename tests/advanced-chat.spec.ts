import { test, expect } from '@playwright/test';

test.describe('Advanced Chat Features', () => {
  test('chat page redirects unauthenticated users', async ({ page }) => {
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');
    
    // Should see auth UI for unauthenticated users
    await expect(page.getByTestId('tab-signup')).toBeVisible({ timeout: 10000 });
  });

  test('chat history API requires authentication', async ({ request }) => {
    const response = await request.get('/api/v1/chat/history');
    expect(response.status()).toBe(401);
  });

  test('chat messages API requires authentication', async ({ request }) => {
    const response = await request.get('/api/v1/chat/messages');
    expect(response.status()).toBe(401);
  });

  test('chat clear API requires authentication', async ({ request }) => {
    const response = await request.delete('/api/v1/chat/clear');
    expect(response.status()).toBe(401);
  });
});
