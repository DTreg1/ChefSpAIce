import { test, expect } from '@playwright/test';

test.describe('Advanced Chat Features', () => {
  test('chat page redirects unauthenticated users', async ({ page }) => {
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');
    
    // Should see auth UI for unauthenticated users
    await expect(page.getByTestId('tab-signup')).toBeVisible({ timeout: 10000 });
  });

  test('chat history API endpoint exists', async ({ request }) => {
    const response = await request.get('/api/v1/chat/history');
    // Either requires auth (401) or returns data (200)
    expect([200, 401]).toContain(response.status());
  });

  test('chat messages API endpoint exists', async ({ request }) => {
    const response = await request.get('/api/v1/chat/messages');
    // Either requires auth (401) or returns data (200)
    expect([200, 401]).toContain(response.status());
  });

  test('chat clear API endpoint exists', async ({ request }) => {
    const response = await request.delete('/api/v1/chat/clear');
    // Either requires auth (401) or succeeds (200/204)
    expect([200, 204, 401]).toContain(response.status());
  });
});
